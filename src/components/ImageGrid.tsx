import { useEffect, useMemo, useRef } from "react";
import type { CSSProperties, KeyboardEvent, MouseEvent } from "react";
import { formatBytes, formatModifiedAt } from "../formatters";
import type { ImageFile, ImageScanState, RootFolder, ThumbnailSize, WorkflowColor } from "../types";
import { SearchBox } from "./SearchBox";
import { WorkflowColorFilter } from "./WorkflowColorFilter";

type ImageGridProps = {
  rootFolder: RootFolder | null;
  imageScan: ImageScanState;
  selectedImage: ImageFile | null;
  selectedImagePaths: string[];
  thumbnailSize: ThumbnailSize;
  simpleSearchQuery: string;
  totalImageCount: number;
  workflowFilterBaseCount: number;
  quickWorkflowColors: WorkflowColor[];
  isAdvancedSearchActive: boolean;
  advancedSearchStatus: "idle" | "loading" | "ready" | "error";
  onSelectImage: (image: ImageFile) => void;
  onToggleImageSelection: (image: ImageFile) => void;
  onSelectImageRange: (image: ImageFile) => void;
  onSelectAllImages: () => void;
  onClearMultiSelection: () => void;
  onOpenImage: (image: ImageFile) => void;
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

function getGridMessage(
  rootFolder: RootFolder | null,
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

function getImagePathKey(imagePath: string): string {
  return imagePath.replace(/\\/g, "/").toLocaleLowerCase("fr-FR");
}

export function ImageGrid({
  rootFolder,
  imageScan,
  selectedImage,
  selectedImagePaths,
  thumbnailSize,
  simpleSearchQuery,
  totalImageCount,
  workflowFilterBaseCount,
  quickWorkflowColors,
  isAdvancedSearchActive,
  advancedSearchStatus,
  onSelectImage,
  onToggleImageSelection,
  onSelectImageRange,
  onSelectAllImages,
  onClearMultiSelection,
  onOpenImage,
  onOpenRootFolder,
  onSimpleSearchChange,
  onClearSimpleSearch,
  onOpenAdvancedSearch,
  onClearAdvancedSearch,
  onToggleWorkflowColor,
  onClearWorkflowColors
}: ImageGridProps) {
  const tileRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedImageIndex = useMemo(
    () => imageScan.images.findIndex((image) => image.path === selectedImage?.path),
    [imageScan.images, selectedImage?.path]
  );
  const hasWorkflowFilter = quickWorkflowColors.length > 0;
  const isWorkflowFilterDisabled =
    imageScan.status === "loading" || (!rootFolder && !isAdvancedSearchActive);
  const selectedPathSet = useMemo(
    () => new Set(selectedImagePaths.map(getImagePathKey)),
    [selectedImagePaths]
  );

  useEffect(() => {
    tileRefs.current.length = imageScan.images.length;
  }, [imageScan.images.length]);

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

    if (event.key === "Escape" && selectedImagePaths.length > 0) {
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

  return (
    <section className="image-grid-panel" aria-label="Grille d'images">
      <div className="content-heading">
        <div>
          <h2>{isAdvancedSearchActive ? "Resultats de recherche" : "Grille d'images"}</h2>
          <p>
            {getGridMessage(
              rootFolder,
              imageScan,
              isAdvancedSearchActive,
              simpleSearchQuery,
              totalImageCount,
              hasWorkflowFilter
            )}
          </p>
        </div>
        <div className="content-heading-actions">
          {isAdvancedSearchActive ? (
            <button className="grid-secondary-action" type="button" onClick={onClearAdvancedSearch}>
              Quitter la recherche
            </button>
          ) : (
            <SearchBox
              value={simpleSearchQuery}
              resultCount={imageScan.images.length}
              totalCount={totalImageCount}
              disabled={!rootFolder || imageScan.status === "loading"}
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
      {imageScan.images.length > 0 ? (
        <div
          className="image-grid"
          tabIndex={0}
          aria-label="Images trouvees dans le dossier"
          style={
            {
              "--thumbnail-min-size": `${THUMBNAIL_MIN_SIZE[thumbnailSize]}px`
            } as CSSProperties
          }
          onKeyDown={handleGridKeyDown}
        >
          {imageScan.images.map((image, index) => {
            const imagePathKey = getImagePathKey(image.path);
            const isSelected = selectedImage
              ? getImagePathKey(selectedImage.path) === imagePathKey
              : false;
            const isBatchSelected = selectedPathSet.has(imagePathKey);
            const hasWorkflowColor = image.workflowColor !== "none";
            const tileLabel = isBatchSelected
              ? `${image.name}, selectionnee dans le lot`
              : image.name;

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
                key={image.path}
                data-workflow-color={image.workflowColor}
                ref={(element) => {
                  tileRefs.current[index] = element;
                }}
                aria-pressed={isSelected}
                aria-selected={isBatchSelected}
                aria-current={isSelected ? "true" : undefined}
                aria-label={tileLabel}
                title={isBatchSelected ? `${image.path} - selectionnee dans le lot` : image.path}
                onClick={(event) => handleTileClick(image, event)}
                onDoubleClick={() => onOpenImage(image)}
              >
                <div className="image-preview">
                  <img
                    src={image.previewUrl}
                    alt=""
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                  {isBatchSelected ? (
                    <span className="image-selection-badge" aria-hidden="true">
                      ✓
                    </span>
                  ) : null}
                </div>
                <span title={image.path}>{image.name}</span>
                <small>
                  {image.extension} - {formatBytes(image.sizeBytes)} -{" "}
                  {formatModifiedAt(image.modifiedAt)}
                </small>
              </button>
            );
          })}
        </div>
      ) : (
        rootFolder ? (
          <div className="empty-grid-state" role="status">
            <p>
              {getGridMessage(
                rootFolder,
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
