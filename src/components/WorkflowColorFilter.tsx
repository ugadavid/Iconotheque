import type { WorkflowColor } from "../types";

type WorkflowColorFilterProps = {
  selectedColors: WorkflowColor[];
  resultCount: number;
  totalCount: number;
  disabled?: boolean;
  onToggleColor: (workflowColor: WorkflowColor) => void;
  onClear: () => void;
};

const WORKFLOW_COLOR_OPTIONS: Array<{ value: WorkflowColor; label: string }> = [
  { value: "red", label: "Rouge" },
  { value: "orange", label: "Orange" },
  { value: "yellow", label: "Jaune" },
  { value: "green", label: "Vert" },
  { value: "blue", label: "Bleu" },
  { value: "purple", label: "Violet" },
  { value: "gray", label: "Gris" },
  { value: "none", label: "Aucune" }
];

export function WorkflowColorFilter({
  selectedColors,
  resultCount,
  totalCount,
  disabled = false,
  onToggleColor,
  onClear
}: WorkflowColorFilterProps) {
  const hasActiveFilter = selectedColors.length > 0;

  return (
    <div className="quick-workflow-filter" aria-label="Filtres rapides de workflow">
      <span className="quick-workflow-filter-label">Workflow</span>
      <div className="quick-workflow-filter-options">
        {WORKFLOW_COLOR_OPTIONS.map((option) => {
          const isSelected = selectedColors.includes(option.value);

          return (
            <button
              className={
                isSelected
                  ? "quick-workflow-filter-button quick-workflow-filter-button-active"
                  : "quick-workflow-filter-button"
              }
              type="button"
              key={option.value}
              data-workflow-color={option.value}
              disabled={disabled}
              aria-label={`Filtrer les images workflow ${option.label}`}
              aria-pressed={isSelected}
              title={`Filtrer workflow ${option.label}`}
              onClick={() => onToggleColor(option.value)}
            >
              <span aria-hidden="true" />
            </button>
          );
        })}
      </div>
      <span className="quick-workflow-filter-count">
        {resultCount} / {totalCount}
      </span>
      {hasActiveFilter ? (
        <button
          className="quick-workflow-filter-clear"
          type="button"
          disabled={disabled}
          onClick={onClear}
        >
          Effacer
        </button>
      ) : null}
    </div>
  );
}
