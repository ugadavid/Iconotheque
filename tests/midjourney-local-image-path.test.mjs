import assert from "node:assert/strict";
import test from "node:test";
import {
  getMidjourneyLocalImageJobDirectoryKey,
  getMidjourneyLocalImageKey,
  resolveMidjourneyLocalImageJobDirectory,
  resolveMidjourneyLocalImagePath
} from "../dist-electron/midjourney-local-image-path.js";

const jobId = "df8275e1-0bd6-4453-8fbe-957f9bdac58b";

test("construit la clé locale Midjourney attendue", () => {
  ["0_0", "0_1", "0_2", "0_3"].forEach((slot) => {
    assert.equal(getMidjourneyLocalImageKey(jobId, slot), `${jobId}/${jobId}_${slot}.png`);
  });
  assert.equal(getMidjourneyLocalImageKey("invalide", "0_2"), null);
  assert.equal(getMidjourneyLocalImageKey(jobId, "0"), null);
  assert.equal(getMidjourneyLocalImageKey(jobId, "0_4"), null);
});

test("résout uniquement une clé locale Midjourney sûre", () => {
  const key = `${jobId}/${jobId}_0_3.png`;
  assert.match(resolveMidjourneyLocalImagePath("C:\\cache", key), /df8275e1-0bd6-4453-8fbe-957f9bdac58b_0_3\.png$/);
  assert.equal(resolveMidjourneyLocalImagePath("C:\\cache", "../outside.png"), null);
});

test("résout uniquement le dossier de job Midjourney sûr", () => {
  assert.equal(getMidjourneyLocalImageJobDirectoryKey(jobId), jobId);
  assert.equal(getMidjourneyLocalImageJobDirectoryKey("invalide"), null);
  assert.match(resolveMidjourneyLocalImageJobDirectory("C:\\cache", jobId), /df8275e1-0bd6-4453-8fbe-957f9bdac58b$/);
  assert.equal(resolveMidjourneyLocalImageJobDirectory("C:\\cache", "../outside"), null);
});
