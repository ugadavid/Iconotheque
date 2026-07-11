import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import { formatBytes } from "../formatters";
import type { ImageFile } from "../types";

type ImageViewerProps = {
  images: ImageFile[];
  selectedImage: ImageFile;
  onSelectImage: (image: ImageFile) => void;
  onClose: () => void;
};

export function ImageViewer({
  images,
  selectedImage,
  onSelectImage,
  onClose
}: ImageViewerProps) {
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const [hasImageLoadError, setHasImageLoadError] = useState(false);
  const selectedImageIndex = useMemo(
    () => images.findIndex((image) => image.imageId === selectedImage.imageId),
    [images, selectedImage.imageId]
  );
  const canSelectPreviousImage = selectedImageIndex > 0;
  const canSelectNextImage = selectedImageIndex >= 0 && selectedImageIndex < images.length - 1;
  const imagePosition =
    selectedImageIndex >= 0 ? `${selectedImageIndex + 1} / ${images.length}` : `- / ${images.length}`;

  useEffect(() => {
    viewerRef.current?.focus();
    setHasImageLoadError(false);
  }, [selectedImage.imageId]);

  function selectRelativeImage(delta: number): void {
    if (selectedImageIndex < 0) {
      return;
    }

    const nextIndex = Math.min(Math.max(selectedImageIndex + delta, 0), images.length - 1);
    const nextImage = images[nextIndex];

    if (nextImage) {
      onSelectImage(nextImage);
    }
  }

  function stopViewerClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  function handleViewerKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    switch (event.key) {
      case "Escape":
        event.preventDefault();
        onClose();
        break;
      case "ArrowRight":
        event.preventDefault();
        selectRelativeImage(1);
        break;
      case "ArrowLeft":
        event.preventDefault();
        selectRelativeImage(-1);
        break;
      default:
        break;
    }
  }

  return (
    <div
      className="image-viewer-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-viewer-title"
      tabIndex={-1}
      ref={viewerRef}
      onKeyDown={handleViewerKeyDown}
    >
      <div className="image-viewer-topbar">
        <div className="image-viewer-title-group">
          <h2 id="image-viewer-title">{selectedImage.name}</h2>
          <div className="image-viewer-meta">
            <span className="image-viewer-position">{imagePosition}</span>
            <span>{selectedImage.extension}</span>
            <span>{formatBytes(selectedImage.sizeBytes)}</span>
          </div>
        </div>
        <p className="image-viewer-help">Echap fermer - Gauche/Droite naviguer</p>
        <button className="image-viewer-close" type="button" onClick={onClose} aria-label="Fermer">
          x
        </button>
      </div>
      <div className="image-viewer-stage" onClick={onClose}>
        <button
          className="image-viewer-nav image-viewer-nav-previous"
          type="button"
          disabled={!canSelectPreviousImage}
          onClick={(event) => {
            stopViewerClick(event);
            selectRelativeImage(-1);
          }}
          aria-label="Image precedente"
        >
          &lt;
        </button>
        {selectedImage.mediaKind === "video" ? (
          <video controls preload="metadata" playsInline src={selectedImage.imageSrc} onClick={stopViewerClick} />
        ) : <img
          src={selectedImage.imageSrc}
          alt={selectedImage.name}
          onClick={stopViewerClick}
          onError={(event) => {
            event.currentTarget.style.display = "none";
            setHasImageLoadError(true);
          }}
          onLoad={(event) => {
            event.currentTarget.style.display = "";
            setHasImageLoadError(false);
          }}
        />}
        {hasImageLoadError ? (
          <div className="image-viewer-error" role="status" onClick={stopViewerClick}>
            {selectedImage.sourceKind === "remote"
              ? selectedImage.mediaKind === "video" ? "Video distante indisponible" : "Image distante indisponible"
              : "Image indisponible"}
          </div>
        ) : null}
        <button
          className="image-viewer-nav image-viewer-nav-next"
          type="button"
          disabled={!canSelectNextImage}
          onClick={(event) => {
            stopViewerClick(event);
            selectRelativeImage(1);
          }}
          aria-label="Image suivante"
        >
          &gt;
        </button>
      </div>
    </div>
  );
}
