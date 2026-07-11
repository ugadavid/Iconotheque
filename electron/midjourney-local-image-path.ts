import path from "node:path";

const MIDJOURNEY_JOB_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getMidjourneyLocalImageKey(jobId: string, slot: string): string | null {
  const normalizedJobId = jobId.trim().toLowerCase();

  if (!MIDJOURNEY_JOB_ID_PATTERN.test(normalizedJobId) || !/^[0-3]$/.test(slot)) {
    return null;
  }

  return `${normalizedJobId}/${normalizedJobId}_${slot}.png`;
}

export function resolveMidjourneyLocalImagePath(rootDirectory: string, localCopyKey: string): string | null {
  const normalizedKey = localCopyKey.replace(/\\/g, "/");
  const match = /^([0-9a-f-]{36})\/\1_([0-3])\.png$/i.exec(normalizedKey);

  if (!match) {
    return null;
  }

  const expectedKey = getMidjourneyLocalImageKey(match[1], match[2]);
  return expectedKey === normalizedKey.toLowerCase()
    ? path.join(rootDirectory, ...expectedKey.split("/"))
    : null;
}
