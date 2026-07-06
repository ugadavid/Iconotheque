import type { RootFolder } from "../types";

type TopBarProps = {
  rootFolder: RootFolder | null;
  isSelectingFolder: boolean;
};

export function TopBar({ rootFolder, isSelectingFolder }: TopBarProps) {
  return (
    <header className="top-bar">
      <div>
        <p className="app-kicker">Application locale</p>
        <h1>Iconothèque</h1>
        <p className="current-root">
          {rootFolder ? rootFolder.path : "Aucun dossier racine selectionne"}
        </p>
      </div>
      <p className="menu-open-hint">
        {isSelectingFolder
          ? "Selection du dossier en cours..."
          : "Fichier > Ouvrir un dossier... ou Ctrl+O"}
      </p>
    </header>
  );
}
