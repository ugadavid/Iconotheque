export function formatBytes(sizeBytes: number | null): string {
  if (sizeBytes === null) {
    return "taille inconnue";
  }

  if (sizeBytes < 1024) {
    return `${sizeBytes} o`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} Ko`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function formatModifiedAt(modifiedAt: string | null): string {
  if (!modifiedAt) {
    return "date inconnue";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(modifiedAt));
}
