import assert from "node:assert/strict";
import test from "node:test";
import { getMidjourneyLocalImageKey, resolveMidjourneyLocalImagePath } from "../dist-electron/midjourney-local-image-path.js";

const jobId = "df8275e1-0bd6-4453-8fbe-957f9bdac58b";

test("construit la clé locale Midjourney attendue", () => {
  assert.equal(getMidjourneyLocalImageKey(jobId, "0"), `${jobId}/${jobId}_0.png`);
  assert.equal(getMidjourneyLocalImageKey("invalide", "0"), null);
  assert.equal(getMidjourneyLocalImageKey(jobId, "4"), null);
});

test("résout uniquement une clé locale Midjourney sûre", () => {
  const key = `${jobId}/${jobId}_3.png`;
  assert.match(resolveMidjourneyLocalImagePath("C:\\cache", key), /df8275e1-0bd6-4453-8fbe-957f9bdac58b_3\.png$/);
  assert.equal(resolveMidjourneyLocalImagePath("C:\\cache", "../outside.png"), null);
});
