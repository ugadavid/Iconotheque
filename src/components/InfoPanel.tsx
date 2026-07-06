import { formatBytes, formatModifiedAt } from "../formatters";
import type { DatabaseStatus, ImageFile, ImageScanState, RootFolder, WorkflowColor } from "../types";
import { UserMetadataForm } from "./UserMetadataForm";

type InfoPanelProps = {
  rootFolder: RootFolder | null;
  imageScan: ImageScanState;
  selectedImage: ImageFile | null;
  selectedImageCount: number;
  databaseStatus: DatabaseStatus;
  metadataRefreshToken: number;
  onOpenBatchMetadataEditor: () => void;
  onClearMultiSelection: () => void;
  onImageWorkflowColorChange: (imagePath: string, workflowColor: WorkflowColor) => void;
};

function getDatabaseLabel(databaseStatus: DatabaseStatus): string {
  if (databaseStatus.status === "created") {
    return "Creee";
  }

  if (databaseStatus.status === "error") {
    return "Erreur";
  }

  return "Initialisation";
}

export function InfoPanel({
  rootFolder,
  imageScan,
  selectedImage,
  selectedImageCount,
  databaseStatus,
  metadataRefreshToken,
  onOpenBatchMetadataEditor,
  onClearMultiSelection,
  onImageWorkflowColorChange
}: InfoPanelProps) {
  const isMultiSelection = selectedImageCount > 1;
  const folderRows = [
    ["Dossier selectionne", rootFolder ? rootFolder.name : "Aucune selection"],
    ["Chemin", rootFolder ? rootFolder.path : "-"],
    ["Images trouvees", rootFolder ? String(imageScan.images.length) : "-"],
    ["Etat", imageScan.error ?? (rootFolder ? "Pret pour future indexation" : "En attente")],
    ["Scan", rootFolder ? "Non recursif" : "Non lance"],
    ["Base SQLite", getDatabaseLabel(databaseStatus)],
    ["DB locale", databaseStatus.status === "created" ? "Active" : (databaseStatus.error ?? "-")],
    ["Mode fichiers", "Lecture seule"]
  ];
  const imageRows = selectedImage
    ? [
        ["Nom du fichier", selectedImage.name],
        ["Chemin complet", selectedImage.path],
        ["Extension", selectedImage.extension],
        ["Taille", formatBytes(selectedImage.sizeBytes)],
        ["Date de modification", formatModifiedAt(selectedImage.modifiedAt)],
        ["URL d'aperçu", selectedImage.previewUrl],
        ["Mode fichiers", "Lecture seule"]
      ]
    : null;

  return (
    <aside className="panel panel-right" aria-label="Informations image">
      <div className="panel-heading">
        <h2>
          {isMultiSelection ? "Selection multiple" : selectedImage ? "Image selectionnee" : "Informations"}
        </h2>
        <span>
          {isMultiSelection
            ? `${selectedImageCount} images`
            : selectedImage
              ? selectedImage.extension
              : "Lecture seule"}
        </span>
      </div>
      {isMultiSelection ? (
        <section className="multi-selection-panel" aria-label="Selection multiple">
          <div className="multi-selection-summary">
            <strong>{selectedImageCount} images selectionnees</strong>
            <span>
              Les modifications par lot s'appliqueront uniquement aux images selectionnees.
            </span>
          </div>
          <dl className="info-list">
            <div className="info-row">
              <dt>Image active</dt>
              <dd>{selectedImage ? selectedImage.name : "-"}</dd>
            </div>
            <div className="info-row">
              <dt>Dossier actif</dt>
              <dd>{rootFolder ? rootFolder.name : "-"}</dd>
            </div>
            <div className="info-row">
              <dt>Mode fichiers</dt>
              <dd>Lecture seule</dd>
            </div>
          </dl>
          <div className="multi-selection-actions">
            <button type="button" onClick={onOpenBatchMetadataEditor}>
              Modifier par lot
            </button>
            <button type="button" onClick={onClearMultiSelection}>
              Vider la selection
            </button>
          </div>
          <p className="multi-selection-note">
            Pour modifier une seule image, videz la selection multiple ou cliquez sur une image sans
            touche modificatrice.
          </p>
        </section>
      ) : selectedImage && (
        <div className="selected-preview">
          <img src={selectedImage.previewUrl} alt="" />
        </div>
      )}
      {!isMultiSelection && selectedImage && imageRows ? (
        <>
          <section className="info-section" aria-label="Informations fichier">
            <h3>Informations fichier</h3>
            <dl className="info-list">
              {imageRows.map(([label, value]) => (
                <div className="info-row" key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
          <UserMetadataForm
            image={selectedImage}
            refreshToken={metadataRefreshToken}
            onWorkflowColorSaved={onImageWorkflowColorChange}
          />
        </>
      ) : (
        <dl className="info-list">
          {folderRows.map(([label, value]) => (
            <div className="info-row" key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </aside>
  );
}
