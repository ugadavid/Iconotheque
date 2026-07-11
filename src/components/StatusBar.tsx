import type { DatabaseStatus, ImageFile, ImageScanState, RootFolder, ThumbnailSize } from "../types";

type StatusBarProps = {
  rootFolder: RootFolder | null;
  imageScan: ImageScanState;
  selectedImage: ImageFile | null;
  selectedImageCount: number;
  isSelectingFolder: boolean;
  isScanning: boolean;
  thumbnailSize: ThumbnailSize;
  databaseStatus: DatabaseStatus;
  searchModeLabel: string | null;
  workflowFilterLabel: string | null;
  collectionDropFeedback: string | null;
  sourceLabel?: string;
  sourceTitle?: string;
  onOpenRootFolder: () => void;
  onRescanRootFolder: () => void;
  onThumbnailSizeChange: (thumbnailSize: ThumbnailSize) => void;
  onOpenBatchMetadataEditor: () => void;
};

const THUMBNAIL_SIZE_OPTIONS: Array<{ value: ThumbnailSize; label: string }> = [
  { value: "small", label: "Petites" },
  { value: "medium", label: "Moyennes" },
  { value: "large", label: "Grandes" }
];

function getScanLabel(rootFolder: RootFolder | null, imageScan: ImageScanState): string {
  if (!rootFolder) {
    return "Scan non lance";
  }

  if (imageScan.status === "loading") {
    return "Scan en cours";
  }

  if (imageScan.status === "error") {
    return "Scan en erreur";
  }

  return "Scan non recursif";
}

export function StatusBar({
  rootFolder,
  imageScan,
  selectedImage,
  selectedImageCount,
  isSelectingFolder,
  isScanning,
  thumbnailSize,
  databaseStatus,
  searchModeLabel,
  workflowFilterLabel,
  collectionDropFeedback,
  sourceLabel,
  sourceTitle,
  onOpenRootFolder,
  onRescanRootFolder,
  onThumbnailSizeChange,
  onOpenBatchMetadataEditor
}: StatusBarProps) {
  const folderLabel = sourceLabel ?? (rootFolder ? rootFolder.name : "Aucun dossier ouvert");
  const imageCountLabel = `${imageScan.images.length} image${
    imageScan.images.length > 1 ? "s" : ""
  }`;
  const selectedImageLabel =
    selectedImageCount > 1
      ? `${selectedImageCount} images selectionnees`
      : selectedImage
        ? selectedImage.name
        : "Aucune image selectionnee";
  const databaseLabel =
    databaseStatus.status === "created"
      ? "SQLite creee"
      : databaseStatus.status === "error"
        ? "SQLite erreur"
        : "SQLite initialisation";

  return (
    <footer className="status-bar" aria-label="Barre de statut">
      <div className="status-bar-section status-bar-left">
        <span className="status-item status-item-strong" title={sourceTitle ?? rootFolder?.path}>
          {folderLabel}
        </span>
        <span className="status-item">{imageCountLabel}</span>
        <span className="status-item">{getScanLabel(rootFolder, imageScan)}</span>
        {collectionDropFeedback ? (
          <span className="status-item status-item-feedback">{collectionDropFeedback}</span>
        ) : null}
        {searchModeLabel ? <span className="status-item">{searchModeLabel}</span> : null}
        {workflowFilterLabel ? <span className="status-item">{workflowFilterLabel}</span> : null}
        <span className="status-item status-item-selected" title={selectedImage?.path ?? selectedImage?.displayName}>
          {selectedImageLabel}
        </span>
      </div>
      <div className="status-bar-section status-bar-right">
        <span className="status-item">Lecture seule</span>
        <span className="status-item" title={databaseStatus.error ?? "DB locale active"}>
          {databaseLabel}
        </span>
        <div className="thumbnail-size-control" aria-label="Taille des vignettes">
          <span className="status-item thumbnail-size-label">Vignettes</span>
          <div className="thumbnail-size-buttons">
            {THUMBNAIL_SIZE_OPTIONS.map((option) => (
              <button
                className={
                  option.value === thumbnailSize
                    ? "status-action thumbnail-size-button thumbnail-size-button-active"
                    : "status-action thumbnail-size-button"
                }
                type="button"
                key={option.value}
                aria-pressed={option.value === thumbnailSize}
                onClick={() => onThumbnailSizeChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <button
          className="status-action"
          type="button"
          disabled={!rootFolder || isScanning}
          onClick={onRescanRootFolder}
        >
          {isScanning ? "Scan..." : "Rescanner"}
        </button>
        <button
          className="status-action"
          type="button"
          disabled={selectedImageCount < 2}
          onClick={onOpenBatchMetadataEditor}
        >
          Modifier par lot
        </button>
        <button
          className="status-action"
          type="button"
          disabled={isSelectingFolder}
          onClick={onOpenRootFolder}
        >
          {isSelectingFolder ? "Ouverture..." : "Ouvrir un dossier..."}
        </button>
      </div>
    </footer>
  );
}
