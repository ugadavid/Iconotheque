import type { FolderTreeNode, FolderTreeScanState, RootFolder } from "../types";
import type { CSSProperties } from "react";

type FolderTreeProps = {
  rootFolder: RootFolder | null;
  folderTreeScan: FolderTreeScanState;
  selectedFolderPath: string | null;
  onSelectFolder: (folder: RootFolder) => void;
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
  onSelectFolder
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
