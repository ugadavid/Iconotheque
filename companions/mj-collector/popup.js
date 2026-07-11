(function () {
  "use strict";

  const counter = document.getElementById("counter");
  const modeInputs = [...document.querySelectorAll("input[name='collectionMode']")];
  const scanButton = document.getElementById("scanButton");
  const copyButton = document.getElementById("copyButton");
  const exportButton = document.getElementById("exportButton");
  const exportJsonButton = document.getElementById("exportJsonButton");
  const clearButton = document.getElementById("clearButton");
  const status = document.getElementById("status");
  const jobList = document.getElementById("jobList");

  let currentJobs = [];
  const DEFAULT_COLLECTION_MODE = "targeted";
  const COLLECTION_MODES = new Set(["manual", "targeted", "broad"]);

  function setStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle("error", isError);
  }

  function jobsToText() {
    return currentJobs.map((job) => job.jobId).join("\n");
  }

  function normalizeJob(job) {
    return {
      jobId: job.jobId,
      firstSeenAt: job.firstSeenAt || null,
      lastSeenAt: job.lastSeenAt || null,
      seenCount: Number(job.seenCount) || 0,
      jobPageUrls: Array.isArray(job.jobPageUrls) ? job.jobPageUrls : [],
      cdnUrls: Array.isArray(job.cdnUrls) ? job.cdnUrls : [],
      observedKinds: Array.isArray(job.observedKinds) ? job.observedKinds : [],
      ...(Array.isArray(job.sourceUrlsLegacy) && job.sourceUrlsLegacy.length > 0
        ? { sourceUrlsLegacy: job.sourceUrlsLegacy }
        : {})
    };
  }

  function downloadTextFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function sortJobs(jobs) {
    return Object.values(jobs || {}).sort((a, b) => {
      const aDate = Date.parse(a.lastSeenAt || a.firstSeenAt || "") || 0;
      const bDate = Date.parse(b.lastSeenAt || b.firstSeenAt || "") || 0;
      return bDate - aDate;
    });
  }

  function setModeControl(mode) {
    const normalizedMode = COLLECTION_MODES.has(mode) ? mode : DEFAULT_COLLECTION_MODE;
    for (const input of modeInputs) {
      input.checked = input.value === normalizedMode;
    }
  }

  function render() {
    const count = currentJobs.length;
    counter.textContent = `${count} job${count > 1 ? "s" : ""} detecte${count > 1 ? "s" : ""}`;

    copyButton.disabled = count === 0;
    exportButton.disabled = count === 0;
    exportJsonButton.disabled = count === 0;
    clearButton.disabled = count === 0;

    jobList.textContent = "";

    if (count === 0) {
      const emptyItem = document.createElement("li");
      emptyItem.className = "empty";
      emptyItem.textContent = "Aucun job detecte pour le moment.";
      jobList.appendChild(emptyItem);
      return;
    }

    for (const job of currentJobs.slice(0, 10)) {
      const item = document.createElement("li");
      item.textContent = job.jobId;
      jobList.appendChild(item);
    }
  }

  async function loadJobs() {
    const { jobs = {} } = await chrome.storage.local.get({ jobs: {} });
    currentJobs = sortJobs(jobs);
    render();
  }

  async function loadCollectionMode() {
    const { collectionMode = DEFAULT_COLLECTION_MODE } = await chrome.storage.local.get({
      collectionMode: DEFAULT_COLLECTION_MODE
    });
    setModeControl(collectionMode);
  }

  async function saveCollectionMode(mode) {
    const normalizedMode = COLLECTION_MODES.has(mode) ? mode : DEFAULT_COLLECTION_MODE;
    await chrome.storage.local.set({ collectionMode: normalizedMode });
    setModeControl(normalizedMode);
    setStatus("Mode de collecte enregistre.");
  }

  async function scanCurrentPage() {
    scanButton.disabled = true;
    setStatus("Scan de la page en cours...");

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        throw new Error("Aucun onglet actif.");
      }

      const response = await chrome.tabs.sendMessage(tab.id, { type: "scanCurrentPage" });
      if (!response?.ok) {
        throw new Error(response?.error || "Scan indisponible sur cette page.");
      }

      await loadJobs();
      setStatus(`Scan termine : ${response.newCount} nouveau(x), ${response.existingCount} deja connu(s).`);
    } catch (error) {
      setStatus("Scan impossible sur cette page Midjourney.", true);
      console.error(error);
    } finally {
      scanButton.disabled = false;
    }
  }

  async function copyIds() {
    try {
      await navigator.clipboard.writeText(jobsToText());
      setStatus("IDs copies dans le presse-papiers.");
    } catch (error) {
      setStatus("Impossible de copier les IDs.", true);
      console.error(error);
    }
  }

  function exportTxt() {
    downloadTextFile("iconotheque-midjourney-job-ids.txt", jobsToText() + "\n", "text/plain;charset=utf-8");
    setStatus("Export TXT lance.");
  }

  function exportJson() {
    const payload = {
      exportedAt: new Date().toISOString(),
      source: "iconotheque-mj-collector",
      version: "0.2.0",
      jobs: currentJobs.map(normalizeJob)
    };

    downloadTextFile(
      "iconotheque-midjourney-observations.json",
      JSON.stringify(payload, null, 2) + "\n",
      "application/json;charset=utf-8"
    );
    setStatus("Export JSON lance.");
  }

  async function clearJobs() {
    const confirmed = window.confirm("Vider la liste des job IDs detectes ?");
    if (!confirmed) {
      return;
    }

    await chrome.storage.local.set({ jobs: {} });
    currentJobs = [];
    render();
    setStatus("Liste videe.");
  }

  copyButton.addEventListener("click", copyIds);
  scanButton.addEventListener("click", scanCurrentPage);
  exportButton.addEventListener("click", exportTxt);
  exportJsonButton.addEventListener("click", exportJson);
  clearButton.addEventListener("click", clearJobs);
  modeInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) {
        saveCollectionMode(input.value).catch((error) => {
          setStatus("Impossible d'enregistrer le mode.", true);
          console.error(error);
        });
      }
    });
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.jobs) {
      currentJobs = sortJobs(changes.jobs.newValue || {});
      render();
    }

    if (areaName === "local" && changes.collectionMode) {
      setModeControl(changes.collectionMode.newValue || DEFAULT_COLLECTION_MODE);
    }
  });

  Promise.all([loadJobs(), loadCollectionMode()]).catch((error) => {
    setStatus("Impossible de charger la popup.", true);
    console.error(error);
  });
})();
