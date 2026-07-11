(function () {
  "use strict";

  const UUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
  const MIDJOURNEY_HOST_PATTERN = /(^|\.)midjourney\.com$/i;
  const JOB_PAGE_PATTERN = /^https:\/\/www\.midjourney\.com\/jobs\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:[/?#]|$)/i;
  const CDN_IMAGE_PATTERN = /^https:\/\/cdn\.midjourney\.com\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/0_[0-3]\.(png)(?:[?#]|$)/i;
  const CDN_VIDEO_PATTERN = /^https:\/\/cdn\.midjourney\.com\/video\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/\d+\.(mp4)(?:[?#]|$)/i;
  const MAX_JOB_PAGE_URLS = 10;
  const MAX_CDN_URLS = 20;
  const MAX_LEGACY_SOURCE_URLS = 5;
  const SAVE_DEBOUNCE_MS = 300;
  const DEFAULT_COLLECTION_MODE = "targeted";
  const COLLECTION_MODES = new Set(["manual", "targeted", "broad"]);

  let pendingJobs = new Map();
  let saveTimer = null;
  let lastLocationHref = window.location.href;
  let activeScanIds = null;
  let currentCollectionMode = DEFAULT_COLLECTION_MODE;
  let domObserver = null;

  function isMidjourneyUrl(value) {
    if (!value || typeof value !== "string") {
      return false;
    }

    try {
      const url = new URL(value, window.location.href);
      return MIDJOURNEY_HOST_PATTERN.test(url.hostname);
    } catch (_error) {
      return /(?:https?:)?\/\/(?:www|cdn)\.midjourney\.com\//i.test(value);
    }
  }

  function normalizeUrl(value) {
    try {
      return new URL(value, window.location.href).href;
    } catch (_error) {
      return value;
    }
  }

  function extractJobIds(value) {
    if (!value || typeof value !== "string") {
      return [];
    }

    const matches = value.match(UUID_PATTERN);
    if (!matches) {
      return [];
    }

    return [...new Set(matches.map((match) => match.toLowerCase()))];
  }

  function extractMidjourneyUrlCandidates(value) {
    if (!value || typeof value !== "string") {
      return [];
    }

    const candidates = [];
    const urlMatches = value.match(/https?:\/\/(?:www|cdn)\.midjourney\.com\/[^\s"',)<>]+/gi) || [];
    for (const match of urlMatches) {
      candidates.push(normalizeUrl(match));
    }

    if (candidates.length === 0 && isMidjourneyUrl(value)) {
      candidates.push(normalizeUrl(value));
    }

    return [...new Set(candidates)];
  }

  function classifyObservedUrl(value) {
    if (!value || typeof value !== "string") {
      return null;
    }

    const url = normalizeUrl(value);
    const imageMatch = url.match(CDN_IMAGE_PATTERN);
    if (imageMatch) {
      return {
        jobId: imageMatch[1].toLowerCase(),
        kind: "image",
        extension: imageMatch[2].toLowerCase(),
        url,
        bucket: "cdnUrls"
      };
    }

    const videoMatch = url.match(CDN_VIDEO_PATTERN);
    if (videoMatch) {
      return {
        jobId: videoMatch[1].toLowerCase(),
        kind: "video",
        extension: videoMatch[2].toLowerCase(),
        url,
        bucket: "cdnUrls"
      };
    }

    const jobPageMatch = url.match(JOB_PAGE_PATTERN);
    if (jobPageMatch) {
      return {
        jobId: jobPageMatch[1].toLowerCase(),
        kind: "unknown",
        extension: null,
        url,
        bucket: "jobPageUrls"
      };
    }

    return null;
  }

  function createPendingJob(jobId, now) {
    return {
      jobId,
      firstSeenAt: now,
      lastSeenAt: now,
      seenCount: 0,
      jobPageUrls: [],
      cdnUrls: [],
      observedKinds: []
    };
  }

  function addUniqueString(list, value, maxItems) {
    if (!value || list.includes(value) || list.length >= maxItems) {
      return;
    }

    list.push(value);
  }

  function upsertCdnUrl(list, observation, now) {
    const existing = list.find((item) => item.url === observation.url);
    if (existing) {
      existing.lastSeenAt = now;
      return;
    }

    if (list.length >= MAX_CDN_URLS) {
      return;
    }

    list.push({
      url: observation.url,
      kind: observation.kind,
      extension: observation.extension,
      firstSeenAt: now,
      lastSeenAt: now
    });
  }

  function queueObservation(observation) {
    if (!observation || !observation.jobId) {
      return;
    }

    if (activeScanIds) {
      activeScanIds.add(observation.jobId);
    }

    const now = new Date().toISOString();
    const job = pendingJobs.get(observation.jobId) || createPendingJob(observation.jobId, now);
    job.seenCount += 1;
    job.lastSeenAt = now;

    if (observation.bucket === "jobPageUrls") {
      addUniqueString(job.jobPageUrls, observation.url, MAX_JOB_PAGE_URLS);
    }

    if (observation.bucket === "cdnUrls") {
      upsertCdnUrl(job.cdnUrls, observation, now);
      if (!job.observedKinds.includes(observation.kind)) {
        job.observedKinds.push(observation.kind);
      }
    }

    pendingJobs.set(observation.jobId, job);
    scheduleSave();
  }

  function queueJobIdsFromText(value) {
    for (const jobId of extractJobIds(value)) {
      queueObservation({
        jobId,
        kind: "unknown",
        extension: null,
        url: null,
        bucket: "text"
      });
    }
  }

  function queueObservedValue(value) {
    const candidates = extractMidjourneyUrlCandidates(value);
    if (candidates.length > 0) {
      for (const candidate of candidates) {
        const observation = classifyObservedUrl(candidate);
        if (observation) {
          queueObservation(observation);
        } else {
          queueJobIdsFromText(candidate);
        }
      }
      return;
    }

    if (isMidjourneyUrl(value)) {
      const observation = classifyObservedUrl(normalizeUrl(value));
      if (observation) {
        queueObservation(observation);
      } else {
        queueJobIdsFromText(value);
      }
    }
  }

  function scanElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const observedValues = new Set();

    for (const attributeName of ["href", "src", "poster"]) {
      const value = element.getAttribute(attributeName);
      if (value) {
        observedValues.add(value);
        queueObservedValue(value);
      }
    }

    if (element.attributes) {
      for (const attribute of element.attributes) {
        if (attribute.value && /midjourney\.com/i.test(attribute.value) && !observedValues.has(attribute.value)) {
          observedValues.add(attribute.value);
          queueObservedValue(attribute.value);
        }
      }
    }
  }

  function scanVisibleText(root) {
    const textRoot = root && root.nodeType === Node.ELEMENT_NODE ? root : document.body;
    if (!textRoot) {
      return;
    }

    const walker = document.createTreeWalker(textRoot, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !UUID_PATTERN.test(node.nodeValue)) {
          UUID_PATTERN.lastIndex = 0;
          return NodeFilter.FILTER_REJECT;
        }

        UUID_PATTERN.lastIndex = 0;
        const parent = node.parentElement;
        if (!parent) {
          return NodeFilter.FILTER_REJECT;
        }

        const style = window.getComputedStyle(parent);
        if (style.display === "none" || style.visibility === "hidden") {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      }
    });

    let node = walker.nextNode();
    while (node) {
      queueJobIdsFromText(node.nodeValue);
      node = walker.nextNode();
    }
  }

  function scanRoot(root) {
    queueObservedValue(window.location.href);

    if (!root) {
      return;
    }

    if (root.nodeType === Node.ELEMENT_NODE) {
      scanElement(root);
      root.querySelectorAll("a[href], img[src], video[src], source[src], [poster], [href], [src], [srcset], [data-src], [data-url]").forEach(scanElement);
      scanVisibleText(root);
    } else if (root.nodeType === Node.DOCUMENT_NODE) {
      scanRoot(document.documentElement);
    }
  }

  function scheduleSave() {
    if (saveTimer) {
      window.clearTimeout(saveTimer);
    }

    saveTimer = window.setTimeout(flushPendingJobs, SAVE_DEBOUNCE_MS);
  }

  async function flushPendingJobs() {
    saveTimer = null;

    if (pendingJobs.size === 0) {
      return;
    }

    const jobsToSave = new Map(pendingJobs);
    pendingJobs.clear();

    try {
      const { jobs = {} } = await chrome.storage.local.get({ jobs: {} });
      for (const [jobId, pendingJob] of jobsToSave) {
        const existing = migrateStoredJob(jobs[jobId], jobId);
        jobs[jobId] = mergeJobs(existing, pendingJob);
      }

      await chrome.storage.local.set({ jobs });
    } catch (error) {
      console.warn("Iconotheque MJ Collector: impossible d'enregistrer les jobs detectes.", error);
      for (const [jobId, job] of jobsToSave) {
        pendingJobs.set(jobId, job);
      }
    }
  }

  async function getStoredJobIds() {
    const { jobs = {} } = await chrome.storage.local.get({ jobs: {} });
    return new Set(Object.keys(jobs));
  }

  function migrateStoredJob(existing, jobId) {
    const now = new Date().toISOString();
    const migrated = {
      jobId,
      firstSeenAt: existing?.firstSeenAt || now,
      lastSeenAt: existing?.lastSeenAt || existing?.firstSeenAt || now,
      seenCount: Number(existing?.seenCount) || 0,
      jobPageUrls: Array.isArray(existing?.jobPageUrls) ? existing.jobPageUrls.slice(0, MAX_JOB_PAGE_URLS) : [],
      cdnUrls: Array.isArray(existing?.cdnUrls) ? existing.cdnUrls.slice(0, MAX_CDN_URLS) : [],
      observedKinds: Array.isArray(existing?.observedKinds) ? [...new Set(existing.observedKinds)] : [],
      sourceUrlsLegacy: Array.isArray(existing?.sourceUrlsLegacy) ? existing.sourceUrlsLegacy.slice(0, MAX_LEGACY_SOURCE_URLS) : []
    };

    if (Array.isArray(existing?.sourceUrls)) {
      for (const sourceUrl of existing.sourceUrls) {
        const observation = classifyObservedUrl(sourceUrl);
        if (observation?.bucket === "jobPageUrls") {
          addUniqueString(migrated.jobPageUrls, observation.url, MAX_JOB_PAGE_URLS);
        } else if (observation?.bucket === "cdnUrls") {
          upsertCdnUrl(migrated.cdnUrls, observation, migrated.firstSeenAt);
          if (!migrated.observedKinds.includes(observation.kind)) {
            migrated.observedKinds.push(observation.kind);
          }
        } else {
          addUniqueString(migrated.sourceUrlsLegacy, sourceUrl, MAX_LEGACY_SOURCE_URLS);
        }
      }
    }

    return migrated;
  }

  function mergeJobs(existing, pendingJob) {
    const merged = existing || createPendingJob(pendingJob.jobId, pendingJob.firstSeenAt);
    merged.firstSeenAt = merged.firstSeenAt || pendingJob.firstSeenAt;
    merged.lastSeenAt = pendingJob.lastSeenAt || merged.lastSeenAt;
    merged.seenCount = (Number(merged.seenCount) || 0) + (Number(pendingJob.seenCount) || 0);

    for (const url of pendingJob.jobPageUrls || []) {
      addUniqueString(merged.jobPageUrls, url, MAX_JOB_PAGE_URLS);
    }

    for (const cdnUrl of pendingJob.cdnUrls || []) {
      upsertCdnUrl(merged.cdnUrls, cdnUrl, cdnUrl.lastSeenAt || pendingJob.lastSeenAt);
      if (!merged.observedKinds.includes(cdnUrl.kind)) {
        merged.observedKinds.push(cdnUrl.kind);
      }
    }

    return merged;
  }

  function isTargetedPage() {
    const href = normalizeUrl(window.location.href);
    try {
      const url = new URL(href);
      return url.hostname === "cdn.midjourney.com" || JOB_PAGE_PATTERN.test(href);
    } catch (_error) {
      return JOB_PAGE_PATTERN.test(href) || /^https:\/\/cdn\.midjourney\.com\//i.test(href);
    }
  }

  function shouldAutoCollect(mode) {
    if (mode === "broad") {
      return true;
    }

    if (mode === "targeted") {
      return isTargetedPage();
    }

    return false;
  }

  function observeDom() {
    if (domObserver) {
      return;
    }

    domObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes") {
          scanElement(mutation.target);
        }

        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            scanRoot(node);
          } else if (node.nodeType === Node.TEXT_NODE) {
            queueJobIdsFromText(node.nodeValue);
          }
        }
      }
    });

    domObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["href", "src", "srcset", "poster", "data-src", "data-url"]
    });
  }

  function stopObservingDom() {
    if (!domObserver) {
      return;
    }

    domObserver.disconnect();
    domObserver = null;
  }

  async function runManualScan() {
    const knownBefore = await getStoredJobIds();
    activeScanIds = new Set();
    scanRoot(document);
    await flushPendingJobs();

    const detectedIds = activeScanIds;
    activeScanIds = null;

    let newCount = 0;
    let existingCount = 0;
    for (const jobId of detectedIds) {
      if (knownBefore.has(jobId)) {
        existingCount += 1;
      } else {
        newCount += 1;
      }
    }

    return {
      detectedCount: detectedIds.size,
      newCount,
      existingCount
    };
  }

  function applyCollectionMode(mode, options = {}) {
    const normalizedMode = COLLECTION_MODES.has(mode) ? mode : DEFAULT_COLLECTION_MODE;
    currentCollectionMode = normalizedMode;

    if (shouldAutoCollect(normalizedMode)) {
      if (options.scan !== false) {
        scanRoot(document);
      }
      observeDom();
    } else {
      stopObservingDom();
    }
  }

  async function loadCollectionMode() {
    const { collectionMode = DEFAULT_COLLECTION_MODE } = await chrome.storage.local.get({
      collectionMode: DEFAULT_COLLECTION_MODE
    });

    applyCollectionMode(collectionMode);
  }

  function observeLocationChanges() {
    const notifyLocationChange = () => {
      if (window.location.href !== lastLocationHref) {
        lastLocationHref = window.location.href;
        applyCollectionMode(currentCollectionMode);
      }
    };

    for (const methodName of ["pushState", "replaceState"]) {
      const original = history[methodName];
      history[methodName] = function (...args) {
        const result = original.apply(this, args);
        window.setTimeout(notifyLocationChange, 0);
        return result;
      };
    }

    window.addEventListener("popstate", notifyLocationChange);
    window.addEventListener("hashchange", notifyLocationChange);
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "scanCurrentPage") {
      return false;
    }

    runManualScan()
      .then((summary) => sendResponse({ ok: true, ...summary }))
      .catch((error) => {
        console.warn("Iconotheque MJ Collector: scan manuel impossible.", error);
        sendResponse({ ok: false, error: error.message || String(error) });
      });

    return true;
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.collectionMode) {
      applyCollectionMode(changes.collectionMode.newValue, { scan: true });
    }
  });

  observeLocationChanges();
  loadCollectionMode().catch((error) => {
    console.warn("Iconotheque MJ Collector: mode de collecte indisponible, mode cible utilise.", error);
    applyCollectionMode(DEFAULT_COLLECTION_MODE);
  });
})();
