import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, DragEvent, KeyboardEvent, MouseEvent } from "react";
import { formatBytes, formatModifiedAt } from "../formatters";
import type { ImageFile, ImageScanState, RootFolder, ThumbnailSize, WorkflowColor } from "../types";
import { SearchBox } from "./SearchBox";
import { WorkflowColorFilter } from "./WorkflowColorFilter";

type ImageGridProps = {
  rootFolder: RootFolder | null;
  viewKind: "local" | "web-generic" | "web-midjourney" | "web-midjourney-video" | "collection";
  collectionName: string | null;
  imageScan: ImageScanState;
  selectedImage: ImageFile | null;
  selectedImageIds: number[];
  thumbnailSize: ThumbnailSize;
  simpleSearchQuery: string;
  totalImageCount: number;
  workflowFilterBaseCount: number;
  quickWorkflowColors: WorkflowColor[];
  isAdvancedSearchActive: boolean;
  advancedSearchStatus: "idle" | "loading" | "ready" | "error";
  midjourneyViewMode: "images" | "jobs";
  onMidjourneyViewModeChange: (viewMode: "images" | "jobs") => void;
  onSelectImage: (image: ImageFile) => void;
  onSelectImageGroup: (images: ImageFile[]) => void;
  onToggleImageSelection: (image: ImageFile) => void;
  onSelectImageRange: (image: ImageFile) => void;
  onSelectAllImages: () => void;
  onClearMultiSelection: () => void;
  onOpenImage: (image: ImageFile) => void;
  onImageContextMenu: (image: ImageFile, position: { x: number; y: number }) => void;
  onMidjourneyJobContextMenu: (image: ImageFile, jobId: string, position: { x: number; y: number }) => void;
  onImageDragStart: (image: ImageFile) => number[];
  onImageGroupDragStart: (images: ImageFile[]) => number[];
  onImageDragEnd: () => void;
  onOpenRootFolder: () => void;
  onSimpleSearchChange: (value: string) => void;
  onClearSimpleSearch: () => void;
  onOpenAdvancedSearch: () => void;
  onClearAdvancedSearch: () => void;
  onToggleWorkflowColor: (workflowColor: WorkflowColor) => void;
  onClearWorkflowColors: () => void;
};

const THUMBNAIL_MIN_SIZE: Record<ThumbnailSize, number> = {
  small: 92,
  medium: 132,
  large: 196
};

const MIDJOURNEY_SLOTS = ["0_0", "0_1", "0_2", "0_3"] as const;
const MIDJOURNEY_VIDEO_SLOTS = ["0", "1", "2", "3"] as const;

type MidjourneySlot = string;

type MidjourneyJobGroup = {
  jobId: string;
  images: ImageFile[];
  slots: Partial<Record<string, ImageFile>>;
};

function isMidjourneySlot(value: string | null | undefined): value is MidjourneySlot {
  return MIDJOURNEY_SLOTS.includes(value as never) || MIDJOURNEY_VIDEO_SLOTS.includes(value as never);
}

function getMidjourneyJobGroups(images: ImageFile[]): MidjourneyJobGroup[] {
  const groupMap = new Map<string, MidjourneyJobGroup>();

  images.forEach((image) => {
    if (image.remoteProvider !== "midjourney") {
      return;
    }

    const jobId = image.remoteProviderGroupId ?? image.displayName;
    const existingGroup = groupMap.get(jobId) ?? {
      jobId,
      images: [],
      slots: {}
    };

    existingGroup.images.push(image);

    if (isMidjourneySlot(image.remoteSlot)) {
      existingGroup.slots[image.remoteSlot] = image;
    }

    groupMap.set(jobId, existingGroup);
  });

  return Array.from(groupMap.values())
    .map((group) => ({
      ...group,
      images: group.images.sort((firstImage, secondImage) =>
        (firstImage.remoteSlot ?? "").localeCompare(secondImage.remoteSlot ?? "")
      )
    }))
    .sort((firstGroup, secondGroup) => {
      const firstMaxImageId = Math.max(...firstGroup.images.map((image) => image.imageId));
      const secondMaxImageId = Math.max(...secondGroup.images.map((image) => image.imageId));

      return secondMaxImageId - firstMaxImageId;
    });
}

function formatJobId(jobId: string): string {
  return jobId.length > 14 ? `${jobId.slice(0, 8)}...${jobId.slice(-4)}` : jobId;
}

function getGridMessage(
  rootFolder: RootFolder | null,
  viewKind: "local" | "web-generic" | "web-midjourney" | "web-midjourney-video" | "collection",
  collectionName: string | null,
  imageScan: ImageScanState,
  isAdvancedSearchActive: boolean,
  simpleSearchQuery: string,
  totalImageCount: number,
  hasWorkflowFilter: boolean
): string {
  if (isAdvancedSearchActive) {
    if (imageScan.status === "error") {
      return imageScan.error ?? "Recherche avancee en erreur.";
    }

    if (imageScan.status === "empty" && hasWorkflowFilter && totalImageCount > 0) {
      return "Aucun resultat de recherche avancee ne correspond aux filtres rapides.";
    }

    return `Recherche avancee : ${imageScan.images.length} resultat(s) affiche(s).`;
  }

  if (viewKind === "web-generic" || viewKind === "web-midjourney" || viewKind === "web-midjourney-video") {
    const isVideoView = viewKind === "web-midjourney-video";
    const sourceLabel = viewKind === "web-midjourney-video" ? "video(s) Midjourney" : viewKind === "web-midjourney" ? "Midjourney" : "web";

    if (imageScan.status === "loading") {
      return `Lecture des ${isVideoView ? "vidéos" : "images"} ${sourceLabel} enregistrées.`;
    }

    if (imageScan.status === "error") {
      return imageScan.error ?? `Impossible de lire les ${isVideoView ? "vidéos" : "images"} ${sourceLabel}.`;
    }

    if (imageScan.status === "empty") {
      if ((simpleSearchQuery || hasWorkflowFilter) && totalImageCount > 0) {
        return `Aucune ${isVideoView ? "vidéo" : "image"} ${sourceLabel} ne correspond a la recherche ou aux filtres.`;
      }

      return viewKind === "web-midjourney-video"
        ? "Aucune vidéo Midjourney ajoutée pour le moment."
        : viewKind === "web-midjourney"
        ? "Aucun job Midjourney ajoute pour le moment."
        : "Aucune image web ajoutee pour le moment.";
    }

    return `${imageScan.images.length} ${isVideoView ? "vidéo(s)" : "image(s)"} ${sourceLabel} affichée(s).`;
  }

  if (viewKind === "collection") {
    const label = collectionName ? `Collection : ${collectionName}` : "Collection";

    if (imageScan.status === "loading") {
      return `Lecture de la ${label}.`;
    }

    if (imageScan.status === "error") {
      return imageScan.error ?? "Impossible de lire la collection.";
    }

    if (imageScan.status === "empty") {
      if ((simpleSearchQuery || hasWorkflowFilter) && totalImageCount > 0) {
        return "Aucune image de cette collection ne correspond a la recherche ou aux filtres.";
      }

      return `${label} vide.`;
    }

    return `${label} - ${imageScan.images.length} image(s) affichee(s).`;
  }

  if (!rootFolder) {
    return "Selectionnez un dossier racine pour lister ses images directes.";
  }

  if (imageScan.status === "loading") {
    return "Lecture non recursive du dossier en cours.";
  }

  if (imageScan.status === "error") {
    return imageScan.error ?? "Impossible de lire le dossier selectionne.";
  }

  if (imageScan.status === "empty") {
    if ((simpleSearchQuery || hasWorkflowFilter) && totalImageCount > 0) {
      return "Aucune image ne correspond a la recherche ou aux filtres.";
    }

    return "Aucune image trouvee directement dans ce dossier.";
  }

  return `${imageScan.images.length} image(s) trouvee(s) dans le dossier selectionne.`;
}

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  return ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName);
}

export function ImageGrid({
  rootFolder,
  viewKind,
  collectionName,
  imageScan,
  selectedImage,
  selectedImageIds,
  thumbnailSize,
  simpleSearchQuery,
  totalImageCount,
  workflowFilterBaseCount,
  quickWorkflowColors,
  isAdvancedSearchActive,
  advancedSearchStatus,
  midjourneyViewMode,
  onMidjourneyViewModeChange,
  onSelectImage,
  onSelectImageGroup,
  onToggleImageSelection,
  onSelectImageRange,
  onSelectAllImages,
  onClearMultiSelection,
  onOpenImage,
  onImageContextMenu,
  onMidjourneyJobContextMenu,
  onImageDragStart,
  onImageGroupDragStart,
  onImageDragEnd,
  onOpenRootFolder,
  onSimpleSearchChange,
  onClearSimpleSearch,
  onOpenAdvancedSearch,
  onClearAdvancedSearch,
  onToggleWorkflowColor,
  onClearWorkflowColors
}: ImageGridProps) {
  const tileRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [failedImageIds, setFailedImageIds] = useState<Set<number>>(() => new Set());
  const selectedImageIndex = useMemo(
    () => imageScan.images.findIndex((image) => image.imageId === selectedImage?.imageId),
    [imageScan.images, selectedImage?.imageId]
  );
  const hasWorkflowFilter = quickWorkflowColors.length > 0;
  const isWorkflowFilterDisabled =
    imageScan.status === "loading" || (!rootFolder && viewKind === "local" && !isAdvancedSearchActive);
  const selectedPathSet = useMemo(
    () => new Set(selectedImageIds),
    [selectedImageIds]
  );
  const midjourneyJobGroups = useMemo(
    () => getMidjourneyJobGroups(imageScan.images),
    [imageScan.images]
  );
  const shouldShowMidjourneyJobs =
    (viewKind === "web-midjourney" || viewKind === "web-midjourney-video") && midjourneyViewMode === "jobs" && !isAdvancedSearchActive;
  const isMidjourneyVideoView = viewKind === "web-midjourney-video";
  const jobSlots = isMidjourneyVideoView ? MIDJOURNEY_VIDEO_SLOTS : MIDJOURNEY_SLOTS;
  const mediaLabel = isMidjourneyVideoView ? "vidéos" : "images";

  useEffect(() => {
    tileRefs.current.length = imageScan.images.length;
  }, [imageScan.images.length]);

  useEffect(() => {
    const visibleImageIds = new Set(imageScan.images.map((image) => image.imageId));

    setFailedImageIds((currentFailedIds) => {
      const nextFailedIds = new Set<number>();

      currentFailedIds.forEach((imageId) => {
        if (visibleImageIds.has(imageId)) {
          nextFailedIds.add(imageId);
        }
      });

      return nextFailedIds;
    });
  }, [imageScan.images]);

  useEffect(() => {
    if (selectedImageIndex < 0) {
      return;
    }

    window.requestAnimationFrame(() => {
      tileRefs.current[selectedImageIndex]?.scrollIntoView({
        block: "nearest",
        inline: "nearest"
      });
    });
  }, [selectedImageIndex, thumbnailSize]);

  const getVisibleColumnCount = () => {
    const firstTile = tileRefs.current.find(Boolean);

    if (!firstTile) {
      return 1;
    }

    const firstRowTop = firstTile.offsetTop;
    const firstRowTileCount = tileRefs.current.filter(
      (tile) => tile && Math.abs(tile.offsetTop - firstRowTop) < 2
    ).length;

    return Math.max(1, firstRowTileCount);
  };

  const selectImageAtIndex = (index: number) => {
    const nextImage = imageScan.images[index];

    if (!nextImage) {
      return;
    }

    onSelectImage(nextImage);

    window.requestAnimationFrame(() => {
      const nextTile = tileRefs.current[index];
      nextTile?.focus();
      nextTile?.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
  };

  const handleGridKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
      event.preventDefault();
      onSelectAllImages();
      return;
    }

    if (event.key === "Escape" && selectedImageIds.length > 0) {
      event.preventDefault();
      onClearMultiSelection();
      return;
    }

    if (event.ctrlKey || event.metaKey || event.altKey || isEditableKeyboardTarget(event.target)) {
      return;
    }

    const isImageTileButton =
      event.target === event.currentTarget ||
      (event.target instanceof HTMLElement && Boolean(event.target.closest(".image-tile")));

    if (!isImageTileButton || imageScan.images.length === 0) {
      return;
    }

    const lastIndex = imageScan.images.length - 1;
    const selectedIndex = selectedImageIndex;
    let nextIndex: number | null = null;

    switch (event.key) {
      case "Enter":
        if (selectedIndex >= 0) {
          nextIndex = selectedIndex;
        }
        break;
      case "ArrowRight":
        nextIndex = selectedIndex < 0 ? 0 : Math.min(selectedIndex + 1, lastIndex);
        break;
      case "ArrowLeft":
        nextIndex = selectedIndex < 0 ? lastIndex : Math.max(selectedIndex - 1, 0);
        break;
      case "ArrowDown":
        nextIndex =
          selectedIndex < 0 ? 0 : Math.min(selectedIndex + getVisibleColumnCount(), lastIndex);
        break;
      case "ArrowUp":
        nextIndex =
          selectedIndex < 0 ? lastIndex : Math.max(selectedIndex - getVisibleColumnCount(), 0);
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = lastIndex;
        break;
      default:
        return;
    }

    if (nextIndex === null) {
      return;
    }

    event.preventDefault();

    if (event.key === "Enter") {
      onOpenImage(imageScan.images[nextIndex]);
      return;
    }

    selectImageAtIndex(nextIndex);
  };

  const handleTileClick = (image: ImageFile, event: MouseEvent<HTMLButtonElement>) => {
    if (event.shiftKey) {
      onSelectImageRange(image);
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      onToggleImageSelection(image);
      return;
    }

    onSelectImage(image);
  };

  const handleTileContextMenu = (image: ImageFile, event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onImageContextMenu(image, { x: event.clientX, y: event.clientY });
  };

  const handleTileDragStart = (image: ImageFile, event: DragEvent<HTMLButtonElement>) => {
    const draggedImageIds = onImageDragStart(image);

    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/x-iconotheque-images", String(draggedImageIds.length));
    event.dataTransfer.setData("text/plain", `${draggedImageIds.length} image(s) Iconotheque`);
  };

  const handleJobDragStart = (images: ImageFile[], event: DragEvent<HTMLElement>) => {
    const draggedImageIds = onImageGroupDragStart(images);

    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/x-iconotheque-images", String(draggedImageIds.length));
    event.dataTransfer.setData("text/plain", `${draggedImageIds.length} image(s) Midjourney`);
  };

  return (
    <section className="image-grid-panel" aria-label="Grille d'images">
      <div className="content-heading">
        <div>
          <h2>
            {isAdvancedSearchActive
              ? "Resultats de recherche"
              : viewKind === "collection"
                ? "Collection"
              : viewKind === "web-midjourney-video"
                ? "Videos Midjourney"
                : viewKind === "web-midjourney"
                ? "Images Midjourney"
                : viewKind === "web-generic"
                  ? "Images web"
                  : "Grille d'images"}
          </h2>
          <p>
            {getGridMessage(
              rootFolder,
              viewKind,
              collectionName,
              imageScan,
              isAdvancedSearchActive,
              simpleSearchQuery,
              totalImageCount,
              hasWorkflowFilter
            )}
          </p>
        </div>
        <div className="content-heading-actions">
          {(viewKind === "web-midjourney" || viewKind === "web-midjourney-video") && !isAdvancedSearchActive ? (
            <div className="midjourney-view-toggle" aria-label="Vue Midjourney">
              <span>Vue</span>
              <button
                type="button"
                className={midjourneyViewMode === "images" ? "midjourney-view-toggle-active" : ""}
                aria-pressed={midjourneyViewMode === "images"}
                onClick={() => onMidjourneyViewModeChange("images")}
              >
                {isMidjourneyVideoView ? "Vidéos" : "Images"}
              </button>
              <button
                type="button"
                className={midjourneyViewMode === "jobs" ? "midjourney-view-toggle-active" : ""}
                aria-pressed={midjourneyViewMode === "jobs"}
                onClick={() => onMidjourneyViewModeChange("jobs")}
              >
                Jobs
              </button>
            </div>
          ) : null}
          {isAdvancedSearchActive ? (
            <button className="grid-secondary-action" type="button" onClick={onClearAdvancedSearch}>
              Quitter la recherche
            </button>
          ) : (
            <SearchBox
              value={simpleSearchQuery}
              resultCount={imageScan.images.length}
              totalCount={totalImageCount}
              disabled={(viewKind === "local" && !rootFolder) || imageScan.status === "loading"}
              onChange={onSimpleSearchChange}
              onClear={onClearSimpleSearch}
            />
          )}
          <WorkflowColorFilter
            selectedColors={quickWorkflowColors}
            resultCount={imageScan.images.length}
            totalCount={workflowFilterBaseCount}
            disabled={isWorkflowFilterDisabled}
            onToggleColor={onToggleWorkflowColor}
            onClear={onClearWorkflowColors}
          />
          <button
            className="grid-secondary-action"
            type="button"
            disabled={advancedSearchStatus === "loading"}
            onClick={onOpenAdvancedSearch}
          >
            Recherche avancee
          </button>
        </div>
      </div>
      {shouldShowMidjourneyJobs && midjourneyJobGroups.length > 0 ? (
        <div className="midjourney-job-grid" aria-label="Jobs Midjourney">
          {midjourneyJobGroups.map((jobGroup) => (
            <article
              className="midjourney-job-card"
              key={jobGroup.jobId}
              draggable={jobGroup.images.length > 0}
              onDragStart={(event) => handleJobDragStart(jobGroup.images, event)}
              onDragEnd={onImageDragEnd}
              onContextMenu={(event) => {
                if (!isMidjourneyVideoView && jobGroup.images[0]) {
                  event.preventDefault();
                  onMidjourneyJobContextMenu(jobGroup.images[0], jobGroup.jobId, {
                    x: event.clientX,
                    y: event.clientY
                  });
                }
              }}
            >
              <header className="midjourney-job-heading">
                <div>
                  <strong title={jobGroup.jobId}>Job {formatJobId(jobGroup.jobId)}</strong>
                  <span>{jobGroup.images.length}/4 {mediaLabel}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectImageGroup(jobGroup.images)}
                  disabled={jobGroup.images.length === 0}
                >
                  Selectionner les {mediaLabel} du job
                </button>
              </header>
              <div className="midjourney-slot-grid">
                {jobSlots.map((slot) => {
                  const image = jobGroup.slots[slot];
                  const isSelected = image ? selectedImage?.imageId === image.imageId : false;
                  const isBatchSelected = image ? selectedPathSet.has(image.imageId) : false;
                  const hasImageLoadError = image ? failedImageIds.has(image.imageId) : false;

                  if (!image) {
                    return (
                      <div className="midjourney-slot midjourney-slot-empty" key={slot}>
                        <span>{slot}</span>
                        <small>Slot manquant</small>
                      </div>
                    );
                  }

                  return (
                    <button
                      className={[
                        "midjourney-slot",
                        isSelected ? "midjourney-slot-selected" : "",
                        isBatchSelected ? "midjourney-slot-batch-selected" : ""
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      type="button"
                      key={slot}
                      title={image.displayName}
                      aria-pressed={isSelected}
                      onClick={() => onSelectImage(image)}
                      onDoubleClick={() => onOpenImage(image)}
                      onContextMenu={(event) => handleTileContextMenu(image, event)}
                    >
                      {image.mediaKind === "video" && image.videoThumbnailUrl && !hasImageLoadError ? <img
                        src={image.videoThumbnailUrl}
                        alt=""
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                          setFailedImageIds((currentFailedIds) => new Set(currentFailedIds).add(image.imageId));
                        }}
                      /> : image.mediaKind === "video" ? (
                        <div className="video-preview-placeholder" aria-hidden="true"><span>▶</span><small>Vidéo</small></div>
                      ) : <img
                        src={image.imageSrc}
                        alt=""
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                          setFailedImageIds((currentFailedIds) => new Set(currentFailedIds).add(image.imageId));
                        }}
                        onLoad={(event) => {
                          event.currentTarget.style.display = "";
                          setFailedImageIds((currentFailedIds) => {
                            const nextFailedIds = new Set(currentFailedIds);
                            nextFailedIds.delete(image.imageId);
                            return nextFailedIds;
                          });
                        }}
                      />}
                      {hasImageLoadError && image.mediaKind !== "video" ? <small>Image distante indisponible</small> : null}
                      {image.usesLocalCopy && image.mediaKind !== "video" ? <span className="midjourney-local-copy-badge">Local</span> : null}
                      <span>{slot}</span>
                    </button>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      ) : imageScan.images.length > 0 ? (
        <div
          className="image-grid"
          tabIndex={0}
          aria-label={viewKind === "local" ? "Images trouvees dans le dossier" : "Images web ajoutees"}
          style={
            {
              "--thumbnail-min-size": `${THUMBNAIL_MIN_SIZE[thumbnailSize]}px`
            } as CSSProperties
          }
          onKeyDown={handleGridKeyDown}
        >
          {imageScan.images.map((image, index) => {
            const isSelected = selectedImage ? selectedImage.imageId === image.imageId : false;
            const isBatchSelected = selectedPathSet.has(image.imageId);
            const hasWorkflowColor = image.workflowColor !== "none";
            const hasImageLoadError = failedImageIds.has(image.imageId);
            const tileLabel = isBatchSelected
              ? `${image.name}, selectionnee dans le lot`
              : image.name;
            const title = image.path ?? image.displayName;

            return (
              <button
                className={[
                  "image-tile",
                  isBatchSelected ? "image-tile-batch-selected" : "",
                  isSelected ? "image-tile-selected" : "",
                  hasWorkflowColor ? "image-tile-workflow" : ""
                ]
                  .filter(Boolean)
                  .join(" ")}
                type="button"
                key={image.imageId}
                data-workflow-color={image.workflowColor}
                ref={(element) => {
                  tileRefs.current[index] = element;
                }}
                aria-pressed={isSelected}
                aria-selected={isBatchSelected}
                aria-current={isSelected ? "true" : undefined}
                aria-label={tileLabel}
                title={isBatchSelected ? `${title} - selectionnee dans le lot` : title}
                draggable
                onClick={(event) => handleTileClick(image, event)}
                onContextMenu={(event) => handleTileContextMenu(image, event)}
                onDragStart={(event) => handleTileDragStart(image, event)}
                onDragEnd={onImageDragEnd}
                onDoubleClick={() => onOpenImage(image)}
              >
                <div className="image-preview">
                  {image.mediaKind === "video" && image.videoThumbnailUrl && !hasImageLoadError ? <img
                    src={image.videoThumbnailUrl}
                    alt=""
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                      setFailedImageIds((currentFailedIds) => new Set(currentFailedIds).add(image.imageId));
                    }}
                  /> : image.mediaKind === "video" ? (
                    <div className="video-preview-placeholder" aria-hidden="true"><span>▶</span><small>Vidéo</small></div>
                  ) : <img
                    src={image.imageSrc}
                    alt=""
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                      setFailedImageIds((currentFailedIds) => new Set(currentFailedIds).add(image.imageId));
                    }}
                    onLoad={(event) => {
                      event.currentTarget.style.display = "";
                      setFailedImageIds((currentFailedIds) => {
                        const nextFailedIds = new Set(currentFailedIds);
                        nextFailedIds.delete(image.imageId);
                        return nextFailedIds;
                      });
                    }}
                  />}
                  {hasImageLoadError && image.mediaKind !== "video" ? (
                    <div className="image-load-error" role="status">
                      {image.sourceKind === "remote" ? "Image distante indisponible" : "Image indisponible"}
                    </div>
                  ) : null}
                  {isBatchSelected ? (
                    <span className="image-selection-badge" aria-hidden="true">
                      ✓
                    </span>
                  ) : null}
                  {image.sourceKind === "remote" ? (
                    <span className="image-source-badge" aria-hidden="true">
                      {image.remoteProvider === "midjourney"
                        ? image.remoteSlot
                          ? `MJ ${image.remoteSlot}`
                          : "MJ"
                        : "Web"}
                    </span>
                  ) : null}
                  {image.usesLocalCopy && image.mediaKind !== "video" ? (
                    <span className="image-local-copy-badge">Local</span>
                  ) : null}
                </div>
                <span title={title}>{image.displayName}</span>
                <small>
                  {image.remoteProvider === "midjourney"
                    ? `Midjourney ${image.remoteSlot ?? ""}`
                    : image.sourceKind === "remote"
                      ? "Web"
                      : image.extension} - {formatBytes(image.sizeBytes)} -{" "}
                  {formatModifiedAt(image.modifiedAt)}
                </small>
              </button>
            );
          })}
        </div>
      ) : (
        rootFolder || viewKind !== "local" ? (
          <div className="empty-grid-state" role="status">
            <p>
              {getGridMessage(
                rootFolder,
                viewKind,
                collectionName,
                imageScan,
                isAdvancedSearchActive,
                simpleSearchQuery,
                totalImageCount,
                hasWorkflowFilter
              )}
            </p>
            <span>Scan non recursif, lecture seule.</span>
          </div>
        ) : (
          <button
            className="empty-grid-state empty-grid-state-clickable"
            type="button"
            onClick={onOpenRootFolder}
          >
            <p>
              {getGridMessage(
                rootFolder,
                viewKind,
                collectionName,
                imageScan,
                isAdvancedSearchActive,
                simpleSearchQuery,
                totalImageCount,
                hasWorkflowFilter
              )}
            </p>
            <span>Cliquez ici pour ouvrir un dossier.</span>
          </button>
        )
      )}
    </section>
  );
}
