import { useEffect, useState } from "react";
import type {
  BatchImageUserMetadataPatch,
  BatchTermPatch,
  ColorMode,
  TermKind,
  WorkflowColor
} from "../types";

type BatchMetadataModalProps = {
  isOpen: boolean;
  imageCount: number;
  isSaving: boolean;
  error: string | null;
  onSave: (patch: BatchImageUserMetadataPatch) => void;
  onClose: () => void;
};

type SetClearAction = "keep" | "set" | "clear";
type SetOnlyAction = "keep" | "set";

type TermBatchInputProps = {
  kind: TermKind;
  label: string;
  value: BatchTermPatch;
  onChange: (value: BatchTermPatch) => void;
};

const STATUS_OPTIONS = ["A trier", "En cours", "Classee", "A revoir", "A publier", "Archivee"];
const WORKFLOW_COLOR_OPTIONS: Array<{ value: WorkflowColor; label: string }> = [
  { value: "red", label: "Rouge" },
  { value: "orange", label: "Orange" },
  { value: "yellow", label: "Jaune" },
  { value: "green", label: "Vert" },
  { value: "blue", label: "Bleu" },
  { value: "purple", label: "Violet" },
  { value: "gray", label: "Gris" }
];
const COLOR_MODE_OPTIONS: Array<{ value: ColorMode; label: string }> = [
  { value: "color", label: "Couleur" },
  { value: "bw", label: "N&B" },
  { value: "mixed", label: "Mixte" },
  { value: "unknown", label: "Inconnu" }
];
const TERM_FIELDS: Array<{ kind: TermKind; label: string }> = [
  { kind: "tag", label: "Tags" },
  { kind: "person", label: "Personnes" },
  { kind: "place", label: "Lieux" },
  { kind: "collection", label: "Collections" },
  { kind: "project", label: "Projets" }
];

function createEmptyTermPatch(): BatchTermPatch {
  return {
    add: [],
    remove: []
  };
}

function createEmptyPatch(): BatchImageUserMetadataPatch {
  return {
    isFavorite: { action: "keep" },
    rating: { action: "keep" },
    status: { action: "keep" },
    workflowColor: { action: "keep" },
    colorMode: { action: "keep" },
    source: { action: "keep" },
    generationTool: { action: "keep" },
    referenceDate: { action: "keep" },
    terms: {
      tag: createEmptyTermPatch(),
      person: createEmptyTermPatch(),
      place: createEmptyTermPatch(),
      collection: createEmptyTermPatch(),
      project: createEmptyTermPatch()
    }
  };
}

function normalizeLabel(label: string): string {
  return label.trim().replace(/\s+/g, " ");
}

function addUniqueLabel(values: string[], label: string): string[] {
  const normalizedLabel = normalizeLabel(label);

  if (!normalizedLabel) {
    return values;
  }

  return values.some(
    (value) => value.toLocaleLowerCase("fr-FR") === normalizedLabel.toLocaleLowerCase("fr-FR")
  )
    ? values
    : [...values, normalizedLabel];
}

function hasPatchChanges(patch: BatchImageUserMetadataPatch): boolean {
  const hasFieldChanges = [
    patch.isFavorite,
    patch.rating,
    patch.status,
    patch.workflowColor,
    patch.colorMode,
    patch.source,
    patch.generationTool,
    patch.referenceDate
  ].some((action) => action.action !== "keep");
  const hasTermChanges = TERM_FIELDS.some(
    ({ kind }) => patch.terms[kind].add.length > 0 || patch.terms[kind].remove.length > 0
  );

  return hasFieldChanges || hasTermChanges;
}

function TermBatchInput({ kind, label, value, onChange }: TermBatchInputProps) {
  const [addInput, setAddInput] = useState("");
  const [removeInput, setRemoveInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    let isActive = true;
    const query = removeInput.trim() || addInput.trim();

    if (!query) {
      setSuggestions([]);
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      void window.iconotheque.suggestTerms(kind, query).then((result) => {
        if (!isActive) {
          return;
        }

        setSuggestions(result.ok ? result.labels : []);
      });
    }, 120);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [addInput, kind, removeInput]);

  function addTerm(mode: "add" | "remove", labelToAdd: string): void {
    const normalizedLabel = normalizeLabel(labelToAdd);

    if (!normalizedLabel) {
      return;
    }

    onChange({
      ...value,
      [mode]: addUniqueLabel(value[mode], normalizedLabel)
    });

    if (mode === "add") {
      setAddInput("");
    } else {
      setRemoveInput("");
    }
  }

  function removeTerm(mode: "add" | "remove", labelToRemove: string): void {
    onChange({
      ...value,
      [mode]: value[mode].filter((item) => item !== labelToRemove)
    });
  }

  return (
    <div className="batch-term-field">
      <span className="metadata-label">{label}</span>
      <div className="batch-term-columns">
        <div className="chips-input">
          <span className="batch-term-mode-label">Ajouter</span>
          <div className="chips-list">
            {value.add.map((term) => (
              <button className="chip" type="button" key={term} onClick={() => removeTerm("add", term)}>
                {term}
                <span aria-hidden="true">x</span>
              </button>
            ))}
          </div>
          <input
            type="text"
            value={addInput}
            placeholder="Terme a ajouter..."
            onChange={(event) => setAddInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addTerm("add", addInput);
              }
            }}
          />
        </div>
        <div className="chips-input">
          <span className="batch-term-mode-label">Retirer</span>
          <div className="chips-list">
            {value.remove.map((term) => (
              <button className="chip" type="button" key={term} onClick={() => removeTerm("remove", term)}>
                {term}
                <span aria-hidden="true">x</span>
              </button>
            ))}
          </div>
          <input
            type="text"
            value={removeInput}
            placeholder="Terme a retirer..."
            onChange={(event) => setRemoveInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addTerm("remove", removeInput);
              }
            }}
          />
        </div>
      </div>
      {suggestions.length > 0 ? (
        <div className="term-suggestions">
          {suggestions.map((suggestion) => (
            <button type="button" key={suggestion} onClick={() => addTerm("add", suggestion)}>
              Ajouter {suggestion}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function BatchMetadataModal({
  isOpen,
  imageCount,
  isSaving,
  error,
  onSave,
  onClose
}: BatchMetadataModalProps) {
  const [patch, setPatch] = useState<BatchImageUserMetadataPatch>(createEmptyPatch);
  const [favoriteAction, setFavoriteAction] = useState<SetClearAction>("keep");
  const [ratingAction, setRatingAction] = useState<SetClearAction>("keep");
  const [ratingValue, setRatingValue] = useState(0);
  const [statusAction, setStatusAction] = useState<SetOnlyAction>("keep");
  const [statusValue, setStatusValue] = useState(STATUS_OPTIONS[0]);
  const [workflowAction, setWorkflowAction] = useState<SetClearAction>("keep");
  const [workflowValue, setWorkflowValue] = useState<WorkflowColor>("red");
  const [colorModeAction, setColorModeAction] = useState<SetOnlyAction>("keep");
  const [colorModeValue, setColorModeValue] = useState<ColorMode>("unknown");
  const [sourceAction, setSourceAction] = useState<SetOnlyAction>("keep");
  const [sourceValue, setSourceValue] = useState("");
  const [generationToolAction, setGenerationToolAction] = useState<SetOnlyAction>("keep");
  const [generationToolValue, setGenerationToolValue] = useState("");
  const [referenceDateAction, setReferenceDateAction] = useState<SetClearAction>("keep");
  const [referenceDateValue, setReferenceDateValue] = useState("");

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

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setPatch(createEmptyPatch());
    setFavoriteAction("keep");
    setRatingAction("keep");
    setRatingValue(0);
    setStatusAction("keep");
    setStatusValue(STATUS_OPTIONS[0]);
    setWorkflowAction("keep");
    setWorkflowValue("red");
    setColorModeAction("keep");
    setColorModeValue("unknown");
    setSourceAction("keep");
    setSourceValue("");
    setGenerationToolAction("keep");
    setGenerationToolValue("");
    setReferenceDateAction("keep");
    setReferenceDateValue("");
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const preparedPatch: BatchImageUserMetadataPatch = {
    ...patch,
    isFavorite:
      favoriteAction === "keep"
        ? { action: "keep" }
        : favoriteAction === "set"
          ? { action: "set", value: true }
          : { action: "clear" },
    rating:
      ratingAction === "keep"
        ? { action: "keep" }
        : ratingAction === "set"
          ? { action: "set", value: ratingValue }
          : { action: "clear" },
    status:
      statusAction === "set" ? { action: "set", value: statusValue } : { action: "keep" },
    workflowColor:
      workflowAction === "keep"
        ? { action: "keep" }
        : workflowAction === "set"
          ? { action: "set", value: workflowValue }
          : { action: "clear" },
    colorMode:
      colorModeAction === "set"
        ? { action: "set", value: colorModeValue }
        : { action: "keep" },
    source:
      sourceAction === "set" ? { action: "set", value: sourceValue } : { action: "keep" },
    generationTool:
      generationToolAction === "set"
        ? { action: "set", value: generationToolValue }
        : { action: "keep" },
    referenceDate:
      referenceDateAction === "keep"
        ? { action: "keep" }
        : referenceDateAction === "set"
          ? { action: "set", value: referenceDateValue }
          : { action: "clear" }
  };
  const canSave = imageCount >= 2 && hasPatchChanges(preparedPatch) && !isSaving;

  function updateTermPatch(kind: TermKind, termPatch: BatchTermPatch): void {
    setPatch((currentPatch) => ({
      ...currentPatch,
      terms: {
        ...currentPatch.terms,
        [kind]: termPatch
      }
    }));
  }

  return (
    <div className="batch-modal-overlay" role="dialog" aria-modal="true">
      <section className="batch-modal" aria-label="Modifier par lot">
        <div className="batch-modal-heading">
          <div>
            <h2>Modifier par lot</h2>
            <p>{imageCount} image(s) selectionnee(s). Fichiers originaux intacts.</p>
          </div>
          <button type="button" onClick={onClose}>
            Fermer
          </button>
        </div>
        <div className="batch-modal-body">
          <fieldset className="metadata-group">
            <legend>Classement</legend>
            <div className="metadata-field">
              <label htmlFor="batch-favorite-action">Favori</label>
              <select
                id="batch-favorite-action"
                value={favoriteAction}
                onChange={(event) => setFavoriteAction(event.target.value as SetClearAction)}
              >
                <option value="keep">Ne pas modifier</option>
                <option value="set">Definir favori</option>
                <option value="clear">Retirer favori</option>
              </select>
            </div>
            <div className="metadata-field">
              <label htmlFor="batch-rating-action">Note</label>
              <select
                id="batch-rating-action"
                value={ratingAction}
                onChange={(event) => setRatingAction(event.target.value as SetClearAction)}
              >
                <option value="keep">Ne pas modifier</option>
                <option value="set">Definir une note</option>
                <option value="clear">Effacer la note</option>
              </select>
              {ratingAction === "set" ? (
                <input
                  type="number"
                  min="0"
                  max="5"
                  value={ratingValue}
                  onChange={(event) => setRatingValue(Number(event.target.value))}
                />
              ) : null}
            </div>
            <div className="metadata-field">
              <label htmlFor="batch-status-action">Statut</label>
              <select
                id="batch-status-action"
                value={statusAction}
                onChange={(event) => setStatusAction(event.target.value as SetOnlyAction)}
              >
                <option value="keep">Ne pas modifier</option>
                <option value="set">Definir un statut</option>
              </select>
              {statusAction === "set" ? (
                <select value={statusValue} onChange={(event) => setStatusValue(event.target.value)}>
                  {STATUS_OPTIONS.map((status) => (
                    <option value={status} key={status}>
                      {status}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
            <div className="metadata-field">
              <label htmlFor="batch-workflow-action">Couleur de workflow</label>
              <select
                id="batch-workflow-action"
                value={workflowAction}
                onChange={(event) => setWorkflowAction(event.target.value as SetClearAction)}
              >
                <option value="keep">Ne pas modifier</option>
                <option value="set">Definir une couleur</option>
                <option value="clear">Effacer la couleur</option>
              </select>
              {workflowAction === "set" ? (
                <select
                  value={workflowValue}
                  onChange={(event) => setWorkflowValue(event.target.value as WorkflowColor)}
                >
                  {WORKFLOW_COLOR_OPTIONS.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
            <div className="metadata-field">
              <label htmlFor="batch-color-mode-action">Mode couleur</label>
              <select
                id="batch-color-mode-action"
                value={colorModeAction}
                onChange={(event) => setColorModeAction(event.target.value as SetOnlyAction)}
              >
                <option value="keep">Ne pas modifier</option>
                <option value="set">Definir un mode</option>
              </select>
              {colorModeAction === "set" ? (
                <select
                  value={colorModeValue}
                  onChange={(event) => setColorModeValue(event.target.value as ColorMode)}
                >
                  {COLOR_MODE_OPTIONS.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
          </fieldset>
          <fieldset className="metadata-group">
            <legend>Origine</legend>
            <div className="metadata-field">
              <label htmlFor="batch-source-action">Source</label>
              <select
                id="batch-source-action"
                value={sourceAction}
                onChange={(event) => setSourceAction(event.target.value as SetOnlyAction)}
              >
                <option value="keep">Ne pas modifier</option>
                <option value="set">Definir une source</option>
              </select>
              {sourceAction === "set" ? (
                <input value={sourceValue} onChange={(event) => setSourceValue(event.target.value)} />
              ) : null}
            </div>
            <div className="metadata-field">
              <label htmlFor="batch-generation-tool-action">Outil / modele</label>
              <select
                id="batch-generation-tool-action"
                value={generationToolAction}
                onChange={(event) => setGenerationToolAction(event.target.value as SetOnlyAction)}
              >
                <option value="keep">Ne pas modifier</option>
                <option value="set">Definir un outil / modele</option>
              </select>
              {generationToolAction === "set" ? (
                <input
                  value={generationToolValue}
                  onChange={(event) => setGenerationToolValue(event.target.value)}
                />
              ) : null}
            </div>
            <div className="metadata-field">
              <label htmlFor="batch-reference-date-action">Date de reference</label>
              <select
                id="batch-reference-date-action"
                value={referenceDateAction}
                onChange={(event) => setReferenceDateAction(event.target.value as SetClearAction)}
              >
                <option value="keep">Ne pas modifier</option>
                <option value="set">Definir une date</option>
                <option value="clear">Effacer la date</option>
              </select>
              {referenceDateAction === "set" ? (
                <input
                  type="date"
                  value={referenceDateValue}
                  onChange={(event) => setReferenceDateValue(event.target.value)}
                />
              ) : null}
            </div>
          </fieldset>
          <fieldset className="metadata-group batch-terms-group">
            <legend>Termes</legend>
            {TERM_FIELDS.map((field) => (
              <TermBatchInput
                kind={field.kind}
                label={field.label}
                value={patch.terms[field.kind]}
                onChange={(termPatch) => updateTermPatch(field.kind, termPatch)}
                key={field.kind}
              />
            ))}
          </fieldset>
        </div>
        <div className="batch-modal-actions">
          {error ? <span className="batch-modal-error">{error}</span> : null}
          <button type="button" onClick={onClose}>
            Annuler
          </button>
          <button type="button" disabled={!canSave} onClick={() => onSave(preparedPatch)}>
            {isSaving ? "Enregistrement..." : "Enregistrer le lot"}
          </button>
        </div>
      </section>
    </div>
  );
}
