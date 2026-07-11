import { useEffect, useRef } from "react";
import packageJson from "../../package.json";

type HelpPanelProps = {
  isOpen: boolean;
  onClose: () => void;
};

const SHORTCUTS = [
  ["Ctrl/Cmd+O", "Ouvrir un dossier racine"],
  ["F5", "Rescanner le dossier courant"],
  ["Ctrl/Cmd+F", "Ouvrir la recherche avancee"],
  ["Ctrl/Cmd+1/2/3", "Changer la taille des vignettes"],
  ["Ctrl/Cmd+S", "Enregistrer les metadonnees"],
  ["Fleches", "Naviguer dans la grille"],
  ["Home / End", "Aller au debut ou a la fin de la grille"],
  ["Entree", "Ouvrir la visionneuse"],
  ["Echap", "Fermer l'aide, la visionneuse ou une modale"],
  ["Gauche / Droite", "Naviguer dans la visionneuse"]
];

export function HelpPanel({ isOpen, onClose }: HelpPanelProps) {
  const panelRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    panelRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="help-overlay" role="dialog" aria-modal="true" aria-labelledby="help-title">
      <section className="help-panel" ref={panelRef} tabIndex={-1}>
        <div className="help-heading">
          <div>
            <p className="help-kicker">Aide locale</p>
            <h2 id="help-title">Iconotheque {packageJson.version}</h2>
            <p>Application locale pour explorer, documenter et retrouver des images.</p>
          </div>
          <button type="button" onClick={onClose}>
            Fermer
          </button>
        </div>

        <div className="help-body">
          <section className="help-section">
            <h3>Actions principales</h3>
            <ul>
              <li>Ouvrir un dossier racine depuis le menu Fichier ou la barre de statut.</li>
              <li>Naviguer dans l'arborescence des dossiers a gauche.</li>
              <li>Afficher les images du dossier actif dans la grille centrale.</li>
              <li>Selectionner une ou plusieurs images, puis renseigner les metadonnees.</li>
              <li>Ouvrir la visionneuse avec Entree ou un double-clic.</li>
              <li>Utiliser la recherche simple, la recherche avancee et les filtres workflow.</li>
              <li>Ajouter une image web ou un ou plusieurs jobs Midjourney depuis le menu Fichier.</li>
              <li>Organiser les images locales et distantes dans des collections virtuelles.</li>
              <li>Retirer une reference Web ou Midjourney du catalogue depuis son menu contextuel, sans agir sur sa source distante.</li>
            </ul>
          </section>

          <section className="help-section">
            <h3>Raccourcis clavier</h3>
            <dl className="help-shortcuts">
              {SHORTCUTS.map(([shortcut, description]) => (
                <div key={shortcut}>
                  <dt>{shortcut}</dt>
                  <dd>{description}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="help-section">
            <h3>Securite et donnees</h3>
            <ul>
              <li>Iconotheque ne modifie, ne renomme, ne deplace et ne supprime aucun fichier original.</li>
              <li>Aucune ecriture n'est faite dans les dossiers photo selectionnes.</li>
              <li>Les apercus passent par le protocole local controle iconotheque-image://.</li>
              <li>Les metadonnees utilisateur sont stockees localement dans SQLite.</li>
              <li>L'identite de catalogue est fondee sur <code>images.id</code>, pour les images locales comme distantes.</li>
            </ul>
          </section>

          <section className="help-section">
            <h3>Limites connues</h3>
            <ul>
              <li>Pas d'EXIF, pas d'IA et pas de miniatures physiques pour le moment.</li>
              <li>Une image locale peut devenir indisponible si son fichier source est deplace, renomme ou supprime hors d'Iconotheque.</li>
              <li>Les sources web et Midjourney dependent de leur disponibilite distante ; il n'y a ni cache ni archivage local.</li>
              <li>La recherche avancee V1 ne repose pas encore sur FTS.</li>
              <li>Certaines validations restent manuelles en environnement Electron.</li>
            </ul>
          </section>
        </div>
      </section>
    </div>
  );
}
