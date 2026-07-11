import path from "node:path";

const MIDJOURNEY_JOB_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getMidjourneyLocalImageJobDirectoryKey(jobId: string): string | null {
  const normalizedJobId = jobId.trim().toLowerCase();
  return MIDJOURNEY_JOB_ID_PATTERN.test(normalizedJobId) ? normalizedJobId : null;
}

export function getMidjourneyLocalImageKey(jobId: string, slot: string): string | null {
  const normalizedJobId = getMidjourneyLocalImageJobDirectoryKey(jobId);

  if (!normalizedJobId || !/^0_[0-3]$/.test(slot)) {
    return null;
  }

  return `${normalizedJobId}/${normalizedJobId}_${slot}.png`;
}

export function resolveMidjourneyLocalImagePath(rootDirectory: string, localCopyKey: string): string | null {
  const normalizedKey = localCopyKey.replace(/\\/g, "/");
  const match = /^([0-9a-f-]{36})\/\1_(0_[0-3])\.png$/i.exec(normalizedKey);

  if (!match) {
    return null;
  }

  const expectedKey = getMidjourneyLocalImageKey(match[1], match[2]);
  return expectedKey === normalizedKey.toLowerCase()
    ? path.join(rootDirectory, ...expectedKey.split("/"))
    : null;
}

export function resolveMidjourneyLocalImageJobDirectory(rootDirectory: string, jobId: string): string | null {
  const localCopyKey = getMidjourneyLocalImageKey(jobId, "0_0");
  const imagePath = localCopyKey
    ? resolveMidjourneyLocalImagePath(rootDirectory, localCopyKey)
    : null;
  return imagePath ? path.dirname(imagePath) : null;
}
