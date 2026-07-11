import type { CollectionSummary, FolderTreeNode, FolderTreeScanState, RootFolder } from "../types";
import type { CSSProperties, DragEvent, MouseEvent } from "react";

type FolderTreeProps = {
  rootFolder: RootFolder | null;
  folderTreeScan: FolderTreeScanState;
  selectedFolderPath: string | null;
  activeSource: "local" | "web-generic" | "web-midjourney" | "web-midjourney-video" | "collection";
  collections: CollectionSummary[];
  selectedCollectionId: number | null;
  dropTargetCollectionId: number | null;
  canDropImagesOnCollection: boolean;
  genericRemoteImageCount: number;
  midjourneyImageCount: number;
  midjourneyVideoCount: number;
  onSelectFolder: (folder: RootFolder) => void;
  onSelectWebImages: () => void;
  onSelectMidjourneyImages: () => void;
  onSelectMidjourneyVideos: () => void;
  onSelectCollection: (collection: CollectionSummary) => void;
  onCollectionContextMenu: (collection: CollectionSummary, position: { x: number; y: number }) => void;
  onCollectionDragEnter: (collection: CollectionSummary) => void;
  onCollectionDragLeave: (collection: CollectionSummary) => void;
  onCollectionDragOver: (event: DragEvent<HTMLButtonElement>) => void;
  onCollectionDrop: (collection: CollectionSummary) => void;
  onCreateCollection: () => void;
};

type FolderNodeProps = {
  node: FolderTreeNode;
  depth: number;
  selectedFolderPath: string | null;
  onSelectFolder: (folder: RootFolder) => void;
};

function getTreeStatus(rootFolder: RootFolder | null, folderTreeScan: FolderTreeScanState): string {
  if (!rootFolder) {
    return "En attente";
  }

  if (folderTreeScan.status === "loading") {
    return "Lecture";
  }

  if (folderTreeScan.status === "error") {
    return "Erreur";
  }

  if (folderTreeScan.limitReached) {
    return "Limite";
  }

  return "Pret";
}

function FolderNode({ node, depth, selectedFolderPath, onSelectFolder }: FolderNodeProps) {
  const isSelected = selectedFolderPath === node.path;
  const folderLabel = node.relativePath === "." ? node.name : node.name;

  return (
    <div className="folder-node">
      <button
        className={isSelected ? "folder-row folder-row-active" : "folder-row"}
        type="button"
        style={{ "--folder-depth": depth } as CSSProperties}
        title={node.path}
        aria-current={isSelected ? "true" : undefined}
        onClick={() => onSelectFolder({ name: node.name, path: node.path })}
      >
        <span className="folder-icon" aria-hidden="true" />
        <span className="folder-name">{folderLabel}</span>
        <span className="folder-count" title="Images directes">
          {node.directImageCount}
        </span>
      </button>
      {node.error ? <p className="folder-node-error">{node.error}</p> : null}
      {node.children.length > 0 ? (
        <div className="folder-children">
          {node.children.map((childNode) => (
            <FolderNode
              node={childNode}
              depth={depth + 1}
              selectedFolderPath={selectedFolderPath}
              onSelectFolder={onSelectFolder}
              key={childNode.path}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function FolderTree({
  rootFolder,
  folderTreeScan,
  selectedFolderPath,
  activeSource,
  collections,
  selectedCollectionId,
  dropTargetCollectionId,
  canDropImagesOnCollection,
  genericRemoteImageCount,
  midjourneyImageCount,
  midjourneyVideoCount,
  onSelectFolder,
  onSelectWebImages,
  onSelectMidjourneyImages,
  onSelectMidjourneyVideos,
  onSelectCollection,
  onCollectionContextMenu,
  onCollectionDragEnter,
  onCollectionDragLeave,
  onCollectionDragOver,
  onCollectionDrop,
  onCreateCollection
}: FolderTreeProps) {
  const hasNoSubfolders =
    folderTreeScan.status === "ready" &&
    folderTreeScan.tree !== null &&
    folderTreeScan.tree.children.length === 0;

  return (
    <aside className="panel panel-left" aria-label="Arborescence des dossiers">
      <div className="panel-heading">
        <h2>Dossiers</h2>
        <span>{getTreeStatus(rootFolder, folderTreeScan)}</span>
      </div>
      <nav className="folder-list" aria-label="Dossiers de la phototheque">
        <div className="folder-source-group" aria-label="Sources">
          <button
            className={activeSource === "web-generic" ? "folder-row folder-row-active" : "folder-row"}
            type="button"
            aria-current={activeSource === "web-generic" ? "true" : undefined}
            onClick={onSelectWebImages}
          >
            <span className="web-source-icon" aria-hidden="true" />
            <span className="folder-name">Web / Images par URL</span>
            <span className="folder-count" title="Images web">
              {genericRemoteImageCount}
            </span>
          </button>
          <button
            className={activeSource === "web-midjourney-video" ? "folder-row folder-row-active" : "folder-row"}
            type="button"
            aria-current={activeSource === "web-midjourney-video" ? "true" : undefined}
            onClick={onSelectMidjourneyVideos}
          >
            <span className="web-source-icon web-source-icon-midjourney" aria-hidden="true" />
            <span className="folder-name">Web / Midjourney / Videos</span>
            <span className="folder-count" title="Videos Midjourney">{midjourneyVideoCount}</span>
          </button>
          <button
            className={activeSource === "web-midjourney" ? "folder-row folder-row-active" : "folder-row"}
            type="button"
            aria-current={activeSource === "web-midjourney" ? "true" : undefined}
            onClick={onSelectMidjourneyImages}
          >
            <span className="web-source-icon web-source-icon-midjourney" aria-hidden="true" />
            <span className="folder-name">Web / Midjourney</span>
            <span className="folder-count" title="Images Midjourney">
              {midjourneyImageCount}
            </span>
          </button>
        </div>
        <div className="folder-source-group folder-collections-group" aria-label="Collections virtuelles">
          <div className="folder-section-heading">
            <span>Collections</span>
            <button type="button" onClick={onCreateCollection} title="Nouvelle collection">
              +
            </button>
          </div>
          {collections.length > 0 ? (
            collections.map((collection) => (
              <button
                className={
                  [
                    "folder-row",
                    activeSource === "collection" && selectedCollectionId === collection.id
                      ? "folder-row-active"
                      : "",
                    canDropImagesOnCollection && dropTargetCollectionId === collection.id
                      ? "folder-row-drop-target"
                      : ""
                  ]
                    .filter(Boolean)
                    .join(" ")
                }
                type="button"
                key={collection.id}
                aria-current={
                  activeSource === "collection" && selectedCollectionId === collection.id
                    ? "true"
                    : undefined
                }
                title={collection.description ?? "Collection virtuelle"}
                onClick={() => onSelectCollection(collection)}
                onContextMenu={(event: MouseEvent<HTMLButtonElement>) => {
                  event.preventDefault();
                  onCollectionContextMenu(collection, { x: event.clientX, y: event.clientY });
                }}
                onDragEnter={() => onCollectionDragEnter(collection)}
                onDragLeave={() => onCollectionDragLeave(collection)}
                onDragOver={onCollectionDragOver}
                onDrop={(event: DragEvent<HTMLButtonElement>) => {
                  event.preventDefault();
                  onCollectionDrop(collection);
                }}
              >
                <span className="collection-source-icon" aria-hidden="true" />
                <span className="folder-name">{collection.name}</span>
                <span className="folder-count" title="Images dans la collection">
                  {collection.imageCount}
                </span>
              </button>
            ))
          ) : (
            <div className="folder-ready-note" role="status">
              <span className="collection-source-icon" aria-hidden="true" />
              <span>Aucune collection.</span>
            </div>
          )}
        </div>
        {!rootFolder ? (
          <div className="folder-ready-note" role="status">
            <span className="folder-icon" aria-hidden="true" />
            <span>Ouvrez un dossier racine pour afficher son arborescence.</span>
          </div>
        ) : null}
        {folderTreeScan.status === "loading" ? (
          <div className="folder-ready-note" role="status">
            <span className="folder-icon" aria-hidden="true" />
            <span>Lecture de l'arborescence en cours.</span>
          </div>
        ) : null}
        {folderTreeScan.status === "error" ? (
          <div className="folder-ready-note folder-tree-error" role="status">
            <span className="folder-icon" aria-hidden="true" />
            <span>{folderTreeScan.error ?? "Impossible de lire l'arborescence."}</span>
          </div>
        ) : null}
        {folderTreeScan.tree ? (
          <FolderNode
            node={folderTreeScan.tree}
            depth={0}
            selectedFolderPath={selectedFolderPath}
            onSelectFolder={onSelectFolder}
          />
        ) : null}
        {hasNoSubfolders ? (
          <div className="folder-ready-note" role="status">
            <span className="folder-icon" aria-hidden="true" />
            <span>Aucun sous-dossier detecte.</span>
          </div>
        ) : null}
        {folderTreeScan.limitReached ? (
          <div className="folder-ready-note folder-tree-warning" role="status">
            <span className="folder-icon" aria-hidden="true" />
            <span>Arborescence tronquee par limite de securite.</span>
          </div>
        ) : null}
      </nav>
    </aside>
  );
}
