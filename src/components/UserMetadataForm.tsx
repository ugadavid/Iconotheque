import { useEffect, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import type { ImageFile, ImageIdentity, ImageUserMetadata, TermKind, WorkflowColor } from "../types";

type UserMetadataFormProps = {
  image: ImageFile;
  refreshToken: number;
  onWorkflowColorSaved: (imageId: number, workflowColor: WorkflowColor) => void;
};

type SaveState = "loading" | "ready" | "dirty" | "saving" | "saved" | "error";

type TermInputProps = {
  kind: TermKind;
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
};

const SOURCE_OPTIONS = [
  "Photo personnelle",
  "MidJourney",
  "DALL-E",
  "Stable Diffusion",
  "ChatGPT",
  "Nano Banana",
  "Internet",
  "Scan",
  "Capture ecran",
  "Autre"
];

const GENERATION_TOOL_OPTIONS = [
  "MidJourney",
  "DALL-E",
  "ChatGPT",
  "Nano Banana",
  "Stable Diffusion"
];

function getImageIdentity(image: ImageFile): ImageIdentity {
  return {
    imageId: image.imageId,
    imagePath: image.path ?? null
  };
}

const STATUS_OPTIONS = ["", "A trier", "En cours", "Classee", "A revoir", "A publier", "Archivee"];

const WORKFLOW_COLOR_OPTIONS: Array<{ value: WorkflowColor; label: string }> = [
  { value: "none", label: "Aucune" },
  { value: "red", label: "Rouge" },
  { value: "orange", label: "Orange" },
  { value: "yellow", label: "Jaune" },
  { value: "green", label: "Vert" },
  { value: "blue", label: "Bleu" },
  { value: "purple", label: "Violet" },
  { value: "gray", label: "Gris" }
];

const TERM_FIELDS: Array<{ kind: TermKind; label: string }> = [
  { kind: "tag", label: "Tags" },
  { kind: "person", label: "Personnes" },
  { kind: "place", label: "Lieux" },
  { kind: "collection", label: "Collections" },
  { kind: "project", label: "Projets" }
];

function createEmptyMetadata(): ImageUserMetadata {
  return {
    description: "",
    isFavorite: false,
    rating: null,
    referenceDate: "",
    source: "",
    generationTool: "",
    promptText: "",
    colorMode: "unknown",
    workflowColor: "none",
    status: "",
    terms: {
      tag: [],
      person: [],
      place: [],
      collection: [],
      project: []
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

  const hasLabel = values.some(
    (value) => value.toLocaleLowerCase("fr-FR") === normalizedLabel.toLocaleLowerCase("fr-FR")
  );

  return hasLabel ? values : [...values, normalizedLabel];
}

function getSaveLabel(saveState: SaveState, error: string | null): string {
  if (saveState === "loading") {
    return "Chargement...";
  }

  if (saveState === "saving") {
    return "Enregistrement...";
  }

  if (saveState === "saved") {
    return "Enregistre";
  }

  if (saveState === "dirty") {
    return "Modifie";
  }

  if (saveState === "error") {
    return error ?? "Erreur";
  }

  return "Pret";
}

function getWorkflowColorLabel(workflowColor: WorkflowColor): string {
  return WORKFLOW_COLOR_OPTIONS.find((option) => option.value === workflowColor)?.label ?? "Aucune";
}

function getMetadataSummary(metadata: ImageUserMetadata): string {
  const summaryItems = [
    metadata.isFavorite ? "Favori" : null,
    metadata.rating === null ? null : `Note ${metadata.rating}/5`,
    metadata.workflowColor === "none"
      ? null
      : `Workflow ${getWorkflowColorLabel(metadata.workflowColor)}`,
    metadata.status || null,
    metadata.referenceDate || null,
    metadata.terms.tag.length > 0 ? `${metadata.terms.tag.length} tag(s)` : null,
    metadata.terms.person.length > 0 ? `${metadata.terms.person.length} personne(s)` : null,
    metadata.terms.place.length > 0 ? `${metadata.terms.place.length} lieu(x)` : null
  ].filter(Boolean);

  return summaryItems.length > 0 ? summaryItems.join(" - ") : "Aucune metadonnee documentee";
}

function TermInput({ kind, label, values, onChange }: TermInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    let isActive = true;
    const query = inputValue.trim();

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
  }, [inputValue, kind]);

  function addLabel(labelToAdd: string): void {
    onChange(addUniqueLabel(values, labelToAdd));
    setInputValue("");
    setSuggestions([]);
  }

  function removeLabel(labelToRemove: string): void {
    onChange(values.filter((value) => value !== labelToRemove));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    addLabel(inputValue);
  }

  const visibleSuggestions = suggestions.filter(
    (suggestion) =>
      !values.some(
        (value) => value.toLocaleLowerCase("fr-FR") === suggestion.toLocaleLowerCase("fr-FR")
      )
  );

  return (
    <div className="metadata-field metadata-field-wide">
      <label htmlFor={`metadata-${kind}`}>{label}</label>
      <div className="chips-input">
        <div className="chips-list">
          {values.map((value) => (
            <button
              className="chip"
              type="button"
              key={value}
              title={`Retirer ${value}`}
              onClick={() => removeLabel(value)}
            >
              {value}
              <span aria-hidden="true">x</span>
            </button>
          ))}
        </div>
        <input
          id={`metadata-${kind}`}
          type="text"
          value={inputValue}
          placeholder="Ajouter..."
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        {visibleSuggestions.length > 0 ? (
          <div className="term-suggestions">
            {visibleSuggestions.map((suggestion) => (
              <button type="button" key={suggestion} onClick={() => addLabel(suggestion)}>
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function UserMetadataForm({ image, refreshToken, onWorkflowColorSaved }: UserMetadataFormProps) {
  const [metadata, setMetadata] = useState<ImageUserMetadata>(createEmptyMetadata);
  const [saveState, setSaveState] = useState<SaveState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const sourceListId = "metadata-source-options";
  const generationToolListId = "metadata-generation-tool-options";

  useEffect(() => {
    let isActive = true;

    setMetadata(createEmptyMetadata());
    setSaveState("loading");
    setError(null);

    void window.iconotheque.getImageUserMetadata(getImageIdentity(image)).then((result) => {
      if (!isActive) {
        return;
      }

      if (!result.ok) {
        setSaveState("error");
        setError(result.error);
        return;
      }

      setMetadata(result.metadata);
      setSaveState("ready");
    });

    return () => {
      isActive = false;
    };
  }, [image.imageId, image.path, refreshToken]);

  function updateMetadata(update: Partial<ImageUserMetadata>): void {
    setMetadata((currentMetadata) => ({
      ...currentMetadata,
      ...update
    }));
    setSaveState("dirty");
    setError(null);
  }

  function setRating(rating: number | null): void {
    updateMetadata({ rating });
  }

  function updateTermValues(kind: TermKind, values: string[]): void {
    setMetadata((currentMetadata) => ({
      ...currentMetadata,
      terms: {
        ...currentMetadata.terms,
        [kind]: values
      }
    }));
    setSaveState("dirty");
    setError(null);
  }

  function handleTextChange(
    field: keyof Pick<
      ImageUserMetadata,
      "description" | "referenceDate" | "source" | "generationTool" | "promptText" | "status"
    >
  ) {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      updateMetadata({ [field]: event.target.value });
    };
  }

  async function handleSave(): Promise<void> {
    if (
      saveState === "saving" ||
      saveState === "loading" ||
      saveState === "ready" ||
      saveState === "saved"
    ) {
      return;
    }

    setSaveState("saving");
    setError(null);

    const result = await window.iconotheque.saveImageUserMetadata(getImageIdentity(image), metadata);

    if (!result.ok) {
      setSaveState("error");
      setError(result.error);
      return;
    }

    const reloadedMetadata = await window.iconotheque.getImageUserMetadata(getImageIdentity(image));

    if (reloadedMetadata.ok) {
      setMetadata(reloadedMetadata.metadata);
      onWorkflowColorSaved(image.imageId, reloadedMetadata.metadata.workflowColor);
    } else {
      onWorkflowColorSaved(image.imageId, metadata.workflowColor);
    }

    setSaveState("saved");
  }

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent): void {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "s") {
        return;
      }

      event.preventDefault();
      void handleSave();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  });

  return (
    <section className="metadata-section" aria-label="Metadonnees Iconotheque">
      <div className="metadata-section-heading">
        <button
          className="metadata-collapse-button"
          type="button"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((currentValue) => !currentValue)}
        >
          <span aria-hidden="true">{isExpanded ? "v" : ">"}</span>
          Metadonnees Iconotheque
        </button>
        <span className={`metadata-save-state metadata-save-state-${saveState}`}>
          {getSaveLabel(saveState, error)}
        </span>
      </div>
      <p className="metadata-summary">{getMetadataSummary(metadata)}</p>
      {isExpanded ? (
        <>
          <div className="metadata-form">
            <fieldset className="metadata-group">
              <legend>Classement</legend>
              <button
                className={metadata.isFavorite ? "favorite-button favorite-button-active" : "favorite-button"}
                type="button"
                aria-pressed={metadata.isFavorite}
                onClick={() => updateMetadata({ isFavorite: !metadata.isFavorite })}
              >
                <span aria-hidden="true">*</span>
                {metadata.isFavorite ? "Favori" : "Non favori"}
              </button>
              <div className="metadata-field">
                <label htmlFor="metadata-rating">Note : {metadata.rating ?? "sans note"}</label>
                <div className="rating-control">
                  <input
                    id="metadata-rating"
                    type="range"
                    min="0"
                    max="5"
                    step="1"
                    value={metadata.rating ?? 0}
                    onChange={(event) => setRating(Number(event.target.value))}
                  />
                  <button type="button" onClick={() => setRating(null)}>
                    Effacer
                  </button>
                </div>
              </div>
              <div className="metadata-field metadata-field-wide">
                <span className="metadata-label">Couleur de workflow</span>
                <div className="workflow-color-options" aria-label="Couleur de workflow">
                  {WORKFLOW_COLOR_OPTIONS.map((option) => (
                    <button
                      className={
                        option.value === metadata.workflowColor
                          ? "workflow-color-button workflow-color-button-active"
                          : "workflow-color-button"
                      }
                      type="button"
                      key={option.value}
                      title={option.label}
                      aria-pressed={option.value === metadata.workflowColor}
                      data-workflow-color={option.value}
                      onClick={() => updateMetadata({ workflowColor: option.value })}
                    >
                      <span aria-hidden="true" />
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="metadata-field">
                <label htmlFor="metadata-status">Statut</label>
                <select
                  id="metadata-status"
                  value={metadata.status}
                  onChange={handleTextChange("status")}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option value={status} key={status || "empty"}>
                      {status || "Sans statut"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="metadata-field">
                <label htmlFor="metadata-color-mode">Mode couleur</label>
                <select
                  id="metadata-color-mode"
                  value={metadata.colorMode}
                  onChange={(event) =>
                    updateMetadata({
                      colorMode: event.target.value as ImageUserMetadata["colorMode"]
                    })
                  }
                >
                  <option value="color">Couleur</option>
                  <option value="bw">N&amp;B</option>
                  <option value="mixed">Mixte</option>
                  <option value="unknown">Inconnu</option>
                </select>
              </div>
              <div className="metadata-field">
                <label htmlFor="metadata-reference-date">Date de reference</label>
                <input
                  id="metadata-reference-date"
                  type="date"
                  value={metadata.referenceDate}
                  onChange={handleTextChange("referenceDate")}
                />
              </div>
            </fieldset>
            <fieldset className="metadata-group">
              <legend>Origine</legend>
              <div className="metadata-field">
                <label htmlFor="metadata-source">Source</label>
                <input
                  id="metadata-source"
                  type="text"
                  list={sourceListId}
                  value={metadata.source}
                  onChange={handleTextChange("source")}
                />
                <datalist id={sourceListId}>
                  {SOURCE_OPTIONS.map((source) => (
                    <option value={source} key={source} />
                  ))}
                </datalist>
              </div>
              <div className="metadata-field">
                <label htmlFor="metadata-generation-tool">Outil / modele</label>
                <input
                  id="metadata-generation-tool"
                  type="text"
                  list={generationToolListId}
                  value={metadata.generationTool}
                  onChange={handleTextChange("generationTool")}
                />
                <datalist id={generationToolListId}>
                  {GENERATION_TOOL_OPTIONS.map((tool) => (
                    <option value={tool} key={tool} />
                  ))}
                </datalist>
              </div>
              <div className="metadata-field metadata-field-wide">
                <label htmlFor="metadata-prompt">Prompt</label>
                <textarea
                  id="metadata-prompt"
                  rows={4}
                  value={metadata.promptText}
                  onChange={handleTextChange("promptText")}
                />
              </div>
            </fieldset>
            <fieldset className="metadata-group">
              <legend>Description</legend>
              <div className="metadata-field metadata-field-wide">
                <label htmlFor="metadata-description">Description</label>
                <textarea
                  id="metadata-description"
                  rows={5}
                  value={metadata.description}
                  onChange={handleTextChange("description")}
                />
              </div>
            </fieldset>
            <fieldset className="metadata-group">
              <legend>Indexation</legend>
              {TERM_FIELDS.map((field) => (
                <TermInput
                  kind={field.kind}
                  label={field.label}
                  values={metadata.terms[field.kind]}
                  onChange={(values) => updateTermValues(field.kind, values)}
                  key={field.kind}
                />
              ))}
            </fieldset>
          </div>
          <button
            className="metadata-save-button"
            type="button"
            disabled={
              saveState === "loading" ||
              saveState === "saving" ||
              saveState === "ready" ||
              saveState === "saved"
            }
            onClick={handleSave}
          >
            {saveState === "saving" ? "Enregistrement..." : "Enregistrer"}
          </button>
        </>
      ) : null}
    </section>
  );
}
