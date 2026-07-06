import { useEffect, useState } from "react";
import type { AdvancedSearchCriteria, ColorMode, WorkflowColor } from "../types";

type AdvancedSearchPanelProps = {
  isOpen: boolean;
  isSearching: boolean;
  initialCriteria: AdvancedSearchCriteria;
  onSearch: (criteria: AdvancedSearchCriteria) => void;
  onReset: () => void;
  onClose: () => void;
};

const STATUS_OPTIONS = ["", "A trier", "En cours", "Classee", "A revoir", "A publier", "Archivee"];
const COLOR_MODE_OPTIONS: Array<{ value: ColorMode | ""; label: string }> = [
  { value: "", label: "Tous" },
  { value: "color", label: "Couleur" },
  { value: "bw", label: "N&B" },
  { value: "mixed", label: "Mixte" },
  { value: "unknown", label: "Inconnu" }
];
const WORKFLOW_COLOR_OPTIONS: Array<{ value: WorkflowColor | ""; label: string }> = [
  { value: "", label: "Toutes" },
  { value: "none", label: "Aucune" },
  { value: "red", label: "Rouge" },
  { value: "orange", label: "Orange" },
  { value: "yellow", label: "Jaune" },
  { value: "green", label: "Vert" },
  { value: "blue", label: "Bleu" },
  { value: "purple", label: "Violet" },
  { value: "gray", label: "Gris" }
];

export function createEmptyAdvancedSearchCriteria(): AdvancedSearchCriteria {
  return {
    text: "",
    favoriteOnly: false,
    minRating: null,
    status: "",
    source: "",
    colorMode: "",
    workflowColor: "",
    referenceDateFrom: "",
    referenceDateTo: "",
    tags: "",
    people: "",
    places: "",
    collections: "",
    projects: ""
  };
}

export function AdvancedSearchPanel({
  isOpen,
  isSearching,
  initialCriteria,
  onSearch,
  onReset,
  onClose
}: AdvancedSearchPanelProps) {
  const [criteria, setCriteria] = useState<AdvancedSearchCriteria>(initialCriteria);

  useEffect(() => {
    if (isOpen) {
      setCriteria(initialCriteria);
    }
  }, [initialCriteria, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
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

  function updateCriteria(update: Partial<AdvancedSearchCriteria>): void {
    setCriteria((currentCriteria) => ({
      ...currentCriteria,
      ...update
    }));
  }

  function resetCriteria(): void {
    const emptyCriteria = createEmptyAdvancedSearchCriteria();
    setCriteria(emptyCriteria);
    onReset();
  }

  return (
    <div className="advanced-search-overlay" role="dialog" aria-modal="true">
      <section className="advanced-search-panel" aria-label="Recherche avancee">
        <div className="advanced-search-heading">
          <div>
            <h2>Recherche avancee</h2>
            <p>Recherche locale dans les racines ouvertes cette session.</p>
          </div>
          <button type="button" onClick={onClose}>
            Fermer
          </button>
        </div>
        <div className="advanced-search-form">
          <fieldset className="metadata-group">
            <legend>Texte</legend>
            <div className="metadata-field metadata-field-wide">
              <label htmlFor="advanced-search-text">Texte libre</label>
              <input
                id="advanced-search-text"
                type="text"
                value={criteria.text}
                onChange={(event) => updateCriteria({ text: event.target.value })}
              />
            </div>
          </fieldset>
          <fieldset className="metadata-group">
            <legend>Classement</legend>
            <label className="metadata-toggle">
              <input
                type="checkbox"
                checked={criteria.favoriteOnly}
                onChange={(event) => updateCriteria({ favoriteOnly: event.target.checked })}
              />
              Favoris uniquement
            </label>
            <div className="metadata-field">
              <label htmlFor="advanced-search-rating">Note minimale</label>
              <select
                id="advanced-search-rating"
                value={criteria.minRating ?? ""}
                onChange={(event) =>
                  updateCriteria({
                    minRating: event.target.value === "" ? null : Number(event.target.value)
                  })
                }
              >
                <option value="">Toutes</option>
                {[0, 1, 2, 3, 4, 5].map((rating) => (
                  <option value={rating} key={rating}>
                    {rating}
                  </option>
                ))}
              </select>
            </div>
            <div className="metadata-field">
              <label htmlFor="advanced-search-status">Statut</label>
              <select
                id="advanced-search-status"
                value={criteria.status}
                onChange={(event) => updateCriteria({ status: event.target.value })}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option value={status} key={status || "all"}>
                    {status || "Tous"}
                  </option>
                ))}
              </select>
            </div>
            <div className="metadata-field">
              <label htmlFor="advanced-search-color-mode">Mode couleur</label>
              <select
                id="advanced-search-color-mode"
                value={criteria.colorMode}
                onChange={(event) =>
                  updateCriteria({ colorMode: event.target.value as ColorMode | "" })
                }
              >
                {COLOR_MODE_OPTIONS.map((option) => (
                  <option value={option.value} key={option.value || "all"}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="metadata-field">
              <label htmlFor="advanced-search-workflow-color">Couleur de workflow</label>
              <select
                id="advanced-search-workflow-color"
                value={criteria.workflowColor}
                onChange={(event) =>
                  updateCriteria({ workflowColor: event.target.value as WorkflowColor | "" })
                }
              >
                {WORKFLOW_COLOR_OPTIONS.map((option) => (
                  <option value={option.value} key={option.value || "all"}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>
          <fieldset className="metadata-group">
            <legend>Dates et origine</legend>
            <div className="metadata-field">
              <label htmlFor="advanced-search-date-from">Date debut</label>
              <input
                id="advanced-search-date-from"
                type="date"
                value={criteria.referenceDateFrom}
                onChange={(event) => updateCriteria({ referenceDateFrom: event.target.value })}
              />
            </div>
            <div className="metadata-field">
              <label htmlFor="advanced-search-date-to">Date fin</label>
              <input
                id="advanced-search-date-to"
                type="date"
                value={criteria.referenceDateTo}
                onChange={(event) => updateCriteria({ referenceDateTo: event.target.value })}
              />
            </div>
            <div className="metadata-field">
              <label htmlFor="advanced-search-source">Source</label>
              <input
                id="advanced-search-source"
                type="text"
                value={criteria.source}
                onChange={(event) => updateCriteria({ source: event.target.value })}
              />
            </div>
          </fieldset>
          <fieldset className="metadata-group">
            <legend>Termes</legend>
            <div className="advanced-search-terms-note">
              Valeurs separees par des virgules.
            </div>
            {[
              ["tags", "Tags"],
              ["people", "Personnes"],
              ["places", "Lieux"],
              ["collections", "Collections"],
              ["projects", "Projets"]
            ].map(([field, label]) => (
              <div className="metadata-field" key={field}>
                <label htmlFor={`advanced-search-${field}`}>{label}</label>
                <input
                  id={`advanced-search-${field}`}
                  type="text"
                  value={String(criteria[field as keyof AdvancedSearchCriteria] ?? "")}
                  onChange={(event) =>
                    updateCriteria({
                      [field]: event.target.value
                    } as Partial<AdvancedSearchCriteria>)
                  }
                />
              </div>
            ))}
          </fieldset>
        </div>
        <div className="advanced-search-actions">
          <button type="button" onClick={() => onSearch(criteria)} disabled={isSearching}>
            {isSearching ? "Recherche..." : "Rechercher"}
          </button>
          <button type="button" onClick={resetCriteria}>
            Reinitialiser
          </button>
        </div>
      </section>
    </div>
  );
}
