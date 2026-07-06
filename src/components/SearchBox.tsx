type SearchBoxProps = {
  value: string;
  resultCount: number;
  totalCount: number;
  disabled: boolean;
  onChange: (value: string) => void;
  onClear: () => void;
};

export function SearchBox({
  value,
  resultCount,
  totalCount,
  disabled,
  onChange,
  onClear
}: SearchBoxProps) {
  return (
    <div className="search-box" role="search">
      <input
        type="search"
        value={value}
        placeholder="Rechercher dans le dossier..."
        disabled={disabled}
        aria-label="Rechercher dans le dossier"
        onChange={(event) => onChange(event.target.value)}
      />
      {value ? (
        <button type="button" onClick={onClear}>
          Effacer
        </button>
      ) : null}
      <span>
        {resultCount} / {totalCount} image{totalCount > 1 ? "s" : ""}
      </span>
    </div>
  );
}
