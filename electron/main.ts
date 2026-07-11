import { app, BrowserWindow, clipboard, dialog, ipcMain, Menu, net, protocol } from "electron";
import type { MenuItemConstructorOptions, OpenDialogOptions } from "electron";
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  removeRemoteImagesFromCatalog,
  type RemoveRemoteImagesFromCatalogResult
} from "./remote-reference-removal.js";
import { getMidjourneyLocalImageKey, resolveMidjourneyLocalImagePath } from "./midjourney-local-image-path.js";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rendererDevUrl = process.env.ELECTRON_RENDERER_URL;
const defaultDevServerUrl = "http://127.0.0.1:5173";
const shouldUseDevServer = process.argv.includes("--dev");
const SELECT_ROOT_FOLDER_CHANNEL = "root-folder:select";
const LIST_IMAGES_CHANNEL = "root-folder:list-images";
const BUILD_FOLDER_TREE_CHANNEL = "root-folder:build-tree";
const GET_DATABASE_STATUS_CHANNEL = "database:status";
const GET_IMAGE_USER_METADATA_CHANNEL = "image-metadata:get";
const SAVE_IMAGE_USER_METADATA_CHANNEL = "image-metadata:save";
const BATCH_UPDATE_IMAGE_USER_METADATA_CHANNEL = "image-metadata:batch-update";
const SUGGEST_TERMS_CHANNEL = "terms:suggest";
const ADVANCED_SEARCH_CHANNEL = "search:advanced";
const ADVANCED_SEARCH_REQUEST_CHANNEL = "search:advanced-requested";
const BATCH_EDIT_REQUEST_CHANNEL = "image-metadata:batch-edit-requested";
const BATCH_EDIT_AVAILABILITY_CHANNEL = "image-metadata:batch-edit-availability";
const ADD_TO_COLLECTION_REQUEST_CHANNEL = "collections:add-selection-requested";
const REMOVE_FROM_COLLECTION_REQUEST_CHANNEL = "collections:remove-selection-requested";
const COLLECTION_MENU_AVAILABILITY_CHANNEL = "collections:menu-availability";
const CREATE_COLLECTION_REQUEST_CHANNEL = "collections:create-requested";
const HELP_REQUEST_CHANNEL = "help:requested";
const ROOT_FOLDER_SELECTED_FROM_MENU_CHANNEL = "root-folder:selected-from-menu";
const RESCAN_ROOT_FOLDER_REQUEST_CHANNEL = "root-folder:rescan-requested";
const THUMBNAIL_SIZE_REQUEST_CHANNEL = "thumbnail-size:requested";
const ADD_REMOTE_IMAGE_CHANNEL = "remote-image:add-from-url";
const LIST_REMOTE_IMAGES_CHANNEL = "remote-image:list";
const REMOVE_REMOTE_IMAGES_FROM_CATALOG_CHANNEL = "remote-image:remove-from-catalog";
const COPY_MIDJOURNEY_JOB_ID_CHANNEL = "midjourney:copy-job-id";
const DOWNLOAD_MIDJOURNEY_IMAGE_CHANNEL = "midjourney:download-image";
const ADD_REMOTE_IMAGE_REQUEST_CHANNEL = "remote-image:add-requested";
const ADD_MIDJOURNEY_JOB_CHANNEL = "midjourney:add-job";
const ADD_MIDJOURNEY_VIDEO_JOB_CHANNEL = "midjourney:add-video-job";
const ADD_MIDJOURNEY_VIDEO_JOBS_BATCH_CHANNEL = "midjourney:add-video-jobs-batch";
const SAVE_MIDJOURNEY_VIDEO_THUMBNAIL_CHANNEL = "midjourney:save-video-thumbnail";
const ADD_MIDJOURNEY_JOB_REQUEST_CHANNEL = "midjourney:add-job-requested";
const ADD_MIDJOURNEY_VIDEO_JOB_REQUEST_CHANNEL = "midjourney:add-video-job-requested";
const ADD_MIDJOURNEY_VIDEO_JOBS_BATCH_REQUEST_CHANNEL = "midjourney:add-video-jobs-batch-requested";
const ADD_MIDJOURNEY_JOBS_BATCH_CHANNEL = "midjourney:add-jobs-batch";
const ADD_MIDJOURNEY_JOBS_BATCH_REQUEST_CHANNEL = "midjourney:add-jobs-batch-requested";
const MIDJOURNEY_OBSERVATIONS_IMPORTED_CHANNEL = "midjourney:observations-imported";
const LIST_COLLECTIONS_CHANNEL = "collections:list";
const CREATE_COLLECTION_CHANNEL = "collections:create";
const RENAME_COLLECTION_CHANNEL = "collections:rename";
const DELETE_COLLECTION_CHANNEL = "collections:delete";
const ADD_IMAGES_TO_COLLECTION_CHANNEL = "collections:add-images";
const LIST_COLLECTION_IMAGES_CHANNEL = "collections:list-images";
const REMOVE_IMAGES_FROM_COLLECTION_CHANNEL = "collections:remove-images";
const IMAGE_PROTOCOL_SCHEME = "iconotheque-image";
const SUPPORTED_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const MIDJOURNEY_CDN_HOSTNAME = "cdn.midjourney.com";
const MIDJOURNEY_PROVIDER = "midjourney";
const GENERIC_REMOTE_PROVIDER = "generic_url";
const MIDJOURNEY_SLOTS = ["0_0", "0_1", "0_2", "0_3"] as const;
const MIDJOURNEY_VIDEO_SLOTS = ["0", "1", "2", "3"] as const;
const MIDJOURNEY_UNMARKED_VIDEO_JOB_IDS = new Set([
  "df8275e1-0bd6-4453-8fbe-957f9bdac58b",
  "5fdd4b78-5313-4fd4-9cfb-075a4d28e7ba",
  "68c08ca1-4c37-4ff0-a75f-5b15f154c946",
  "211acffc-f737-43d2-b6d4-1a10fa36e5f5",
  "ecfeb317-afaf-43ae-80ee-0c089c0c82a8",
  "863ddcf5-2245-484f-8eb2-fad3f1c00f07"
]);
const MIDJOURNEY_JOB_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IGNORED_FOLDER_NAMES = new Set(["node_modules", ".git", "dist", "dist-electron", ".iconotheque-cache"]);
const MAX_FOLDER_TREE_DEPTH = 8;
const MAX_FOLDER_TREE_NODES = 2000;
const BATCH_EDIT_MENU_ITEM_ID = "batch-edit-selection";
const ADD_TO_COLLECTION_MENU_ITEM_ID = "add-selection-to-collection";
const REMOVE_FROM_COLLECTION_MENU_ITEM_ID = "remove-selection-from-collection";
const SCHEMA_VERSION = "10";
const TERM_KINDS = ["tag", "person", "place", "collection", "project"] as const;
const COLOR_MODES = ["color", "bw", "mixed", "unknown"] as const;
const IMAGE_SOURCE_KINDS = ["local", "remote"] as const;
const WORKFLOW_COLORS = [
  "none",
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "gray"
] as const;
const selectedRootFolders = new Set<string>();
const imagePreviewRegistry = new Map<string, { filePath: string; mimeType: string }>();
const initSqlJs = require("sql.js") as (config: {
  locateFile: (fileName: string) => string;
}) => Promise<SqlJsStatic>;

type ThumbnailSize = "small" | "medium" | "large";
type TermKind = (typeof TERM_KINDS)[number];
type ColorMode = (typeof COLOR_MODES)[number];
type ImageSourceKind = (typeof IMAGE_SOURCE_KINDS)[number];
type MediaKind = "image" | "video";
type WorkflowColor = (typeof WORKFLOW_COLORS)[number];

type SqlValue = string | number | null | Uint8Array;

type SqlJsQueryResult = {
  columns: string[];
  values: SqlValue[][];
};

type SqlJsStatic = {
  Database: new (data?: Uint8Array) => SqliteDatabase;
};

type SqliteDatabase = {
  run: (sql: string, params?: SqlValue[]) => void;
  exec: (sql: string, params?: SqlValue[]) => SqlJsQueryResult[];
  export: () => Uint8Array;
};

protocol.registerSchemesAsPrivileged([
  {
    scheme: IMAGE_PROTOCOL_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true
    }
  }
]);

type RootFolderSelection =
  | {
      canceled: true;
    }
  | {
      canceled: false;
      folder: {
        path: string;
        name: string;
      };
    };

type ImageFile = {
  imageId: number;
  sourceKind: ImageSourceKind;
  name: string;
  displayName: string;
  fileName?: string;
  path: string | null;
  extension: string;
  sizeBytes: number | null;
  modifiedAt: string | null;
  imageSrc: string;
  previewUrl: string;
  workflowColor: WorkflowColor;
  remoteProvider?: string | null;
  remoteProviderGroupId?: string | null;
  remoteSlot?: string | null;
  mediaKind?: MediaKind;
  videoThumbnailUrl?: string | null;
};

type ImageIdentity = {
  imageId?: number;
  imagePath?: string | null;
};

type RemoteSourceStatus = "remote" | "cached" | "archived";

type RemoteUrlValidationResult =
  | {
      ok: true;
      normalizedUrl: string;
    }
  | {
      ok: false;
      error: string;
    };

type CreateRemoteImageInput = {
  remoteUrl: string;
  provider?: string;
  providerId?: string | null;
  providerGroupId?: string | null;
  remoteSlot?: string | null;
  mediaKind?: MediaKind;
};

type MidjourneySlot = (typeof MIDJOURNEY_SLOTS)[number];

type MidjourneyInputValidationResult =
  | {
      ok: true;
      jobId: string;
      detectedSlot: MidjourneySlot | null;
    }
  | {
      ok: false;
      error: string;
    };

type RemoteImageRecord = {
  imageId: number;
  remoteUrl: string;
  provider: string;
  providerId: string | null;
  providerGroupId: string | null;
  remoteSlot: string | null;
  mediaKind: MediaKind;
  videoThumbnailStatus: "missing" | "generated" | "failed";
  videoThumbnailKey: string | null;
  localCopyStatus: "missing" | "downloaded" | "failed";
  localCopyKey: string | null;
  sourceStatus: RemoteSourceStatus;
  lastCheckedAt: string | null;
  lastKnownStatus: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type SaveMidjourneyVideoThumbnailResult =
  | { ok: true; thumbnailUrl: string }
  | { ok: false; error: string };

type MidjourneyObservationsImportResult = {
  jobsRead: number;
  imageJobCount: number;
  videoJobCount: number;
  createdImageCount: number;
  existingImageCount: number;
  ignoredCount: number;
  repairedImageCount: number;
  skippedRepairCount: number;
};

type CopyMidjourneyJobIdResult = { ok: true } | { ok: false; error: string };
type DownloadMidjourneyImageResult = { ok: true } | { ok: false; error: string };

type ImageScanResult =
  | {
      ok: true;
      images: ImageFile[];
    }
  | {
      ok: false;
      error: string;
    };

type CollectionSummary = {
  id: number;
  name: string;
  description: string | null;
  imageCount: number;
};

type CollectionListResult =
  | {
      ok: true;
      collections: CollectionSummary[];
    }
  | {
      ok: false;
      error: string;
    };

type CreateCollectionResult =
  | {
      ok: true;
      collection: CollectionSummary;
    }
  | {
      ok: false;
      error: string;
    };

type CollectionMutationResult =
  | {
      ok: true;
      collection?: CollectionSummary;
      deletedCollectionId?: number;
      addedCount?: number;
      alreadyPresentCount?: number;
      removedCount?: number;
    }
  | {
      ok: false;
      error: string;
    };

type FolderTreeNode = {
  name: string;
  path: string;
  relativePath: string;
  directImageCount: number;
  subfolderCount: number;
  children: FolderTreeNode[];
  error: string | null;
};

type FolderTreeResult =
  | {
      ok: true;
      tree: FolderTreeNode;
      limitReached: boolean;
    }
  | {
      ok: false;
      error: string;
    };

type FolderTreeBuildContext = {
  rootPath: string;
  visitedFolderCount: number;
  limitReached: boolean;
};

type DatabaseStatus =
  | {
      status: "created";
      error: null;
    }
  | {
      status: "error";
      error: string;
    };

type ImageUserMetadata = {
  description: string;
  isFavorite: boolean;
  rating: number | null;
  referenceDate: string;
  source: string;
  generationTool: string;
  promptText: string;
  colorMode: ColorMode;
  workflowColor: WorkflowColor;
  status: string;
  terms: Record<TermKind, string[]>;
};

type BatchFieldAction<T> =
  | {
      action: "keep";
    }
  | {
      action: "set";
      value: T;
    }
  | {
      action: "clear";
    };

type BatchTermPatch = {
  add: string[];
  remove: string[];
};

type BatchImageUserMetadataPatch = {
  isFavorite: BatchFieldAction<boolean>;
  rating: BatchFieldAction<number>;
  status: BatchFieldAction<string>;
  workflowColor: BatchFieldAction<WorkflowColor>;
  colorMode: BatchFieldAction<ColorMode>;
  source: BatchFieldAction<string>;
  generationTool: BatchFieldAction<string>;
  referenceDate: BatchFieldAction<string>;
  terms: Record<TermKind, BatchTermPatch>;
};

type AdvancedSearchCriteria = {
  text: string;
  favoriteOnly: boolean;
  minRating: number | null;
  status: string;
  source: string;
  colorMode: ColorMode | "";
  workflowColor: WorkflowColor | "";
  referenceDateFrom: string;
  referenceDateTo: string;
  tags: string;
  people: string;
  places: string;
  collections: string;
  projects: string;
};

type ImageUserMetadataResult =
  | {
      ok: true;
      metadata: ImageUserMetadata;
    }
  | {
      ok: false;
      error: string;
    };

type SaveImageUserMetadataResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      error: string;
    };

type BatchUpdateImageUserMetadataResult =
  | {
      ok: true;
      updatedCount: number;
      workflowColor: WorkflowColor | null;
    }
  | {
      ok: false;
      error: string;
    };

type TermSuggestionResult =
  | {
      ok: true;
      labels: string[];
    }
  | {
      ok: false;
      error: string;
    };

type AdvancedSearchResult =
  | {
      ok: true;
      images: ImageFile[];
    }
  | {
      ok: false;
      error: string;
    };

type AddRemoteImageResult =
  | {
      ok: true;
      route: "generic";
      image: ImageFile;
      alreadyExists: boolean;
    }
  | {
      ok: true;
      route: "midjourney";
      jobId: string;
      createdCount: number;
      existingCount: number;
      imageIds: number[];
      images: ImageFile[];
    }
  | {
      ok: false;
      error: string;
    };

type AddMidjourneyJobResult =
  | {
      ok: true;
      jobId: string;
      createdCount: number;
      existingCount: number;
      imageIds: number[];
      images: ImageFile[];
    }
  | {
      ok: false;
      error: string;
    };

type MidjourneyBatchJobResult = {
  jobId: string;
  createdCount: number;
  existingCount: number;
  imageIds: number[];
};

type MidjourneyInvalidLine = {
  line: string;
  reason: string;
};

type AddMidjourneyJobsBatchResult =
  | {
      ok: true;
      detectedJobCount: number;
      createdImageCount: number;
      existingImageCount: number;
      invalidLineCount: number;
      jobs: MidjourneyBatchJobResult[];
      invalidLines: MidjourneyInvalidLine[];
      images: ImageFile[];
    }
  | {
      ok: false;
      error: string;
    };

let sqliteDatabase: SqliteDatabase | null = null;
let databaseStatus: DatabaseStatus = {
  status: "error",
  error: "Base SQLite non initialisee."
};
let databasePathForReport = "";

function normalizeFolderPath(folderPath: string): string {
  return path.resolve(folderPath);
}

function isPathInsideRoot(candidatePath: string, rootPath: string): boolean {
  const normalizedCandidatePath = normalizeFolderPath(candidatePath);
  const normalizedRootPath = normalizeFolderPath(rootPath);
  const relativePath = path.relative(normalizedRootPath, normalizedCandidatePath);

  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}

function getAuthorizedRootForPath(candidatePath: string): string | null {
  for (const selectedRootFolder of selectedRootFolders) {
    if (isPathInsideRoot(candidatePath, selectedRootFolder)) {
      return selectedRootFolder;
    }
  }

  return null;
}

function getFolderRelativePath(rootPath: string, folderPath: string): string {
  const relativePath = path.relative(rootPath, folderPath);

  return relativePath === "" ? "." : relativePath;
}

function getNowIsoString(): string {
  return new Date().toISOString();
}

function createEmptyImageUserMetadata(): ImageUserMetadata {
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

function isTermKind(value: unknown): value is TermKind {
  return typeof value === "string" && TERM_KINDS.includes(value as TermKind);
}

function isColorMode(value: unknown): value is ColorMode {
  return typeof value === "string" && COLOR_MODES.includes(value as ColorMode);
}

function isWorkflowColor(value: unknown): value is WorkflowColor {
  return typeof value === "string" && WORKFLOW_COLORS.includes(value as WorkflowColor);
}

function isImageSourceKind(value: unknown): value is ImageSourceKind {
  return typeof value === "string" && IMAGE_SOURCE_KINDS.includes(value as ImageSourceKind);
}

function normalizeTermLabel(label: string): string {
  return label.trim().replace(/\s+/g, " ").toLocaleLowerCase("fr-FR");
}

function normalizeDisplayLabel(label: string): string {
  return label.trim().replace(/\s+/g, " ");
}

function getStringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getNullableRating(value: unknown): number | null {
  if (typeof value !== "number") {
    return null;
  }

  return Math.min(Math.max(Math.trunc(value), 0), 5);
}

function sanitizeAdvancedSearchCriteria(value: unknown): AdvancedSearchCriteria {
  const emptyCriteria: AdvancedSearchCriteria = {
    text: "",
    favoriteOnly: false,
    minRating: null,
    status: "",
    source: "",
    colorMode: "",
    workflowColor: "",
    referenceDateFrom: "",
    referenceDateTo: "",
    tags: "",
    people: "",
    places: "",
    collections: "",
    projects: ""
  };

  if (!value || typeof value !== "object") {
    return emptyCriteria;
  }

  const candidate = value as Partial<AdvancedSearchCriteria>;
  const colorMode = candidate.colorMode;
  const workflowColor = candidate.workflowColor;

  return {
    text: getStringValue(candidate.text),
    favoriteOnly: candidate.favoriteOnly === true,
    minRating: getNullableRating(candidate.minRating),
    status: getStringValue(candidate.status),
    source: getStringValue(candidate.source),
    colorMode: isColorMode(colorMode) ? colorMode : "",
    workflowColor: isWorkflowColor(workflowColor) ? workflowColor : "",
    referenceDateFrom: getStringValue(candidate.referenceDateFrom),
    referenceDateTo: getStringValue(candidate.referenceDateTo),
    tags: getStringValue(candidate.tags),
    people: getStringValue(candidate.people),
    places: getStringValue(candidate.places),
    collections: getStringValue(candidate.collections),
    projects: getStringValue(candidate.projects)
  };
}

function splitCommaSeparatedValues(value: string): string[] {
  return value
    .split(",")
    .map((item) => normalizeDisplayLabel(item))
    .filter(Boolean);
}

function sanitizeTermLabels(labels: unknown): string[] {
  if (!Array.isArray(labels)) {
    return [];
  }

  const uniqueLabels = new Map<string, string>();

  labels.forEach((label) => {
    if (typeof label !== "string") {
      return;
    }

    const displayLabel = normalizeDisplayLabel(label);
    const normalizedLabel = normalizeTermLabel(displayLabel);

    if (displayLabel && !uniqueLabels.has(normalizedLabel)) {
      uniqueLabels.set(normalizedLabel, displayLabel);
    }
  });

  return [...uniqueLabels.values()];
}

function sanitizeImageUserMetadata(value: unknown): ImageUserMetadata {
  const metadata = createEmptyImageUserMetadata();

  if (!value || typeof value !== "object") {
    return metadata;
  }

  const candidate = value as Partial<ImageUserMetadata>;
  const rating = typeof candidate.rating === "number" ? Math.trunc(candidate.rating) : null;

  metadata.description = getStringValue(candidate.description);
  metadata.isFavorite = candidate.isFavorite === true;
  metadata.rating = rating === null ? null : Math.min(Math.max(rating, 0), 5);
  metadata.referenceDate = getStringValue(candidate.referenceDate);
  metadata.source = getStringValue(candidate.source);
  metadata.generationTool = getStringValue(candidate.generationTool);
  metadata.promptText = getStringValue(candidate.promptText);
  metadata.colorMode = isColorMode(candidate.colorMode) ? candidate.colorMode : "unknown";
  metadata.workflowColor = isWorkflowColor(candidate.workflowColor) ? candidate.workflowColor : "none";
  metadata.status = getStringValue(candidate.status);

  TERM_KINDS.forEach((kind) => {
    metadata.terms[kind] = sanitizeTermLabels(candidate.terms?.[kind]);
  });

  return metadata;
}

function createEmptyBatchTermPatch(): BatchTermPatch {
  return {
    add: [],
    remove: []
  };
}

function createEmptyBatchPatch(): BatchImageUserMetadataPatch {
  return {
    isFavorite: { action: "keep" },
    rating: { action: "keep" },
    status: { action: "keep" },
    workflowColor: { action: "keep" },
    colorMode: { action: "keep" },
    source: { action: "keep" },
    generationTool: { action: "keep" },
    referenceDate: { action: "keep" },
    terms: {
      tag: createEmptyBatchTermPatch(),
      person: createEmptyBatchTermPatch(),
      place: createEmptyBatchTermPatch(),
      collection: createEmptyBatchTermPatch(),
      project: createEmptyBatchTermPatch()
    }
  };
}

function sanitizeBooleanBatchAction(value: unknown): BatchFieldAction<boolean> {
  if (!value || typeof value !== "object") {
    return { action: "keep" };
  }

  const candidate = value as Partial<BatchFieldAction<boolean>>;

  if (candidate.action === "set") {
    return { action: "set", value: candidate.value === true };
  }

  if (candidate.action === "clear") {
    return { action: "clear" };
  }

  return { action: "keep" };
}

function sanitizeRatingBatchAction(value: unknown): BatchFieldAction<number> {
  if (!value || typeof value !== "object") {
    return { action: "keep" };
  }

  const candidate = value as Partial<BatchFieldAction<number>>;

  if (candidate.action === "set" && typeof candidate.value === "number") {
    return { action: "set", value: Math.min(Math.max(Math.trunc(candidate.value), 0), 5) };
  }

  if (candidate.action === "clear") {
    return { action: "clear" };
  }

  return { action: "keep" };
}

function sanitizeStringBatchAction(value: unknown, allowClear: boolean): BatchFieldAction<string> {
  if (!value || typeof value !== "object") {
    return { action: "keep" };
  }

  const candidate = value as Partial<BatchFieldAction<string>>;

  if (candidate.action === "set") {
    return { action: "set", value: getStringValue(candidate.value) };
  }

  if (allowClear && candidate.action === "clear") {
    return { action: "clear" };
  }

  return { action: "keep" };
}

function sanitizeColorModeBatchAction(value: unknown): BatchFieldAction<ColorMode> {
  if (!value || typeof value !== "object") {
    return { action: "keep" };
  }

  const candidate = value as Partial<BatchFieldAction<ColorMode>>;

  if (candidate.action === "set" && isColorMode(candidate.value)) {
    return { action: "set", value: candidate.value };
  }

  return { action: "keep" };
}

function sanitizeWorkflowColorBatchAction(value: unknown): BatchFieldAction<WorkflowColor> {
  if (!value || typeof value !== "object") {
    return { action: "keep" };
  }

  const candidate = value as Partial<BatchFieldAction<WorkflowColor>>;

  if (candidate.action === "set" && isWorkflowColor(candidate.value)) {
    return { action: "set", value: candidate.value };
  }

  if (candidate.action === "clear") {
    return { action: "clear" };
  }

  return { action: "keep" };
}

function sanitizeBatchTerms(value: unknown): Record<TermKind, BatchTermPatch> {
  const terms = createEmptyBatchPatch().terms;

  if (!value || typeof value !== "object") {
    return terms;
  }

  const candidate = value as Partial<Record<TermKind, Partial<BatchTermPatch>>>;

  TERM_KINDS.forEach((kind) => {
    terms[kind] = {
      add: sanitizeTermLabels(candidate[kind]?.add),
      remove: sanitizeTermLabels(candidate[kind]?.remove)
    };
  });

  return terms;
}

function sanitizeBatchImageUserMetadataPatch(value: unknown): BatchImageUserMetadataPatch {
  const emptyPatch = createEmptyBatchPatch();

  if (!value || typeof value !== "object") {
    return emptyPatch;
  }

  const candidate = value as Partial<BatchImageUserMetadataPatch>;

  return {
    isFavorite: sanitizeBooleanBatchAction(candidate.isFavorite),
    rating: sanitizeRatingBatchAction(candidate.rating),
    status: sanitizeStringBatchAction(candidate.status, false),
    workflowColor: sanitizeWorkflowColorBatchAction(candidate.workflowColor),
    colorMode: sanitizeColorModeBatchAction(candidate.colorMode),
    source: sanitizeStringBatchAction(candidate.source, false),
    generationTool: sanitizeStringBatchAction(candidate.generationTool, false),
    referenceDate: sanitizeStringBatchAction(candidate.referenceDate, true),
    terms: sanitizeBatchTerms(candidate.terms)
  };
}

function getSqliteDatabase(): SqliteDatabase | null {
  return sqliteDatabase;
}

function setDatabaseError(error: unknown): void {
  databaseStatus = {
    status: "error",
    error: error instanceof Error ? error.message : "Erreur SQLite inconnue."
  };
}

function persistDatabaseFile(): void {
  const database = getSqliteDatabase();

  if (!database || !databasePathForReport) {
    return;
  }

  try {
    writeFileSync(databasePathForReport, Buffer.from(database.export()));
  } catch (error) {
    setDatabaseError(error);
  }
}

function runSql(sql: string, params: SqlValue[] = [], shouldPersist = true): void {
  const database = getSqliteDatabase();

  if (!database) {
    return;
  }

  try {
    database.run(sql, params);

    if (shouldPersist) {
      persistDatabaseFile();
    }
  } catch (error) {
    setDatabaseError(error);
  }
}

function tableHasColumn(tableName: string, columnName: string): boolean {
  const database = getSqliteDatabase();

  if (!database) {
    return false;
  }

  try {
    const result = database.exec(`PRAGMA table_info(${tableName})`)[0];

    if (!result) {
      return false;
    }

    const nameColumnIndex = result.columns.indexOf("name");

    return result.values.some((row) => row[nameColumnIndex] === columnName);
  } catch (error) {
    setDatabaseError(error);
    return false;
  }
}

function createLocalImagesTableIfNeeded(database: SqliteDatabase): void {
  database.run(
    `CREATE TABLE IF NOT EXISTS local_images (
       image_id INTEGER PRIMARY KEY,
       root_id INTEGER NOT NULL,
       folder_id INTEGER,
       path TEXT NOT NULL UNIQUE,
       folder_path TEXT NOT NULL,
       file_name TEXT NOT NULL,
       extension TEXT,
       size_bytes INTEGER,
       modified_at TEXT,
       preview_id TEXT,
       created_at TEXT,
       updated_at TEXT,
       FOREIGN KEY(image_id) REFERENCES images(id),
       FOREIGN KEY(root_id) REFERENCES roots(id),
       FOREIGN KEY(folder_id) REFERENCES folders(id)
     )`
  );
}

function backfillLocalImages(database: SqliteDatabase): void {
  if (!tableHasColumn("images", "path")) {
    return;
  }

  const now = getNowIsoString();

  database.run(
    `INSERT INTO local_images (
       image_id, root_id, folder_id, path, folder_path, file_name,
       extension, size_bytes, modified_at, preview_id, created_at, updated_at
     )
     SELECT
       id,
       root_id,
       folder_id,
       path,
       folder_path,
       file_name,
       extension,
       size_bytes,
       modified_at,
       preview_id,
       ?,
       COALESCE(indexed_at, ?)
     FROM images
     WHERE source_kind = 'local'
       AND path IS NOT NULL
       AND folder_path IS NOT NULL
       AND file_name IS NOT NULL
     ON CONFLICT(image_id) DO UPDATE SET
       root_id = excluded.root_id,
       folder_id = excluded.folder_id,
       path = excluded.path,
       folder_path = excluded.folder_path,
       file_name = excluded.file_name,
       extension = excluded.extension,
       size_bytes = excluded.size_bytes,
       modified_at = excluded.modified_at,
       preview_id = excluded.preview_id,
       updated_at = excluded.updated_at`,
    [now, now]
  );
}

function rebuildImagesAsNeutralCatalog(database: SqliteDatabase): void {
  if (!tableHasColumn("images", "path")) {
    return;
  }

  const now = getNowIsoString();

  database.run("PRAGMA foreign_keys = OFF");
  database.run(
    `CREATE TABLE images_new (
       id INTEGER PRIMARY KEY,
       source_kind TEXT NOT NULL DEFAULT 'local' CHECK(source_kind IN ('local', 'remote')),
       created_at TEXT,
       updated_at TEXT
     )`
  );
  database.run(
    `INSERT INTO images_new (id, source_kind, created_at, updated_at)
     SELECT
       images.id,
       CASE
         WHEN images.source_kind IN ('local', 'remote') THEN images.source_kind
         ELSE 'local'
       END,
       COALESCE(local_images.created_at, images.indexed_at, ?),
       COALESCE(local_images.updated_at, images.indexed_at, ?)
     FROM images
     LEFT JOIN local_images ON local_images.image_id = images.id`,
    [now, now]
  );
  database.run("DROP TABLE images");
  database.run("ALTER TABLE images_new RENAME TO images");
  database.run("PRAGMA foreign_keys = ON");
}

function createCollectionsTablesIfNeeded(database: SqliteDatabase): void {
  database.run(
    `CREATE TABLE IF NOT EXISTS collections (
       id INTEGER PRIMARY KEY,
       name TEXT NOT NULL UNIQUE,
       description TEXT,
       created_at TEXT,
       updated_at TEXT
     )`
  );
  database.run(
    `CREATE TABLE IF NOT EXISTS collection_images (
       collection_id INTEGER NOT NULL,
       image_id INTEGER NOT NULL,
       added_at TEXT,
       sort_order INTEGER,
       PRIMARY KEY(collection_id, image_id),
       FOREIGN KEY(collection_id) REFERENCES collections(id) ON DELETE CASCADE,
       FOREIGN KEY(image_id) REFERENCES images(id) ON DELETE CASCADE
     )`
  );
}

function migrateDatabaseSchema(): void {
  const database = getSqliteDatabase();

  if (!database) {
    return;
  }

  if (!tableHasColumn("image_user_meta", "workflow_color")) {
    database.run("ALTER TABLE image_user_meta ADD COLUMN workflow_color TEXT DEFAULT 'none'");
  }

  if (!tableHasColumn("images", "source_kind")) {
    database.run(
      "ALTER TABLE images ADD COLUMN source_kind TEXT NOT NULL DEFAULT 'local' CHECK(source_kind IN ('local', 'remote'))"
    );
  }
  if (!tableHasColumn("remote_images", "media_kind")) {
    database.run("ALTER TABLE remote_images ADD COLUMN media_kind TEXT NOT NULL DEFAULT 'image' CHECK(media_kind IN ('image', 'video'))");
  }
  if (!tableHasColumn("remote_images", "video_thumbnail_status")) {
    database.run("ALTER TABLE remote_images ADD COLUMN video_thumbnail_status TEXT NOT NULL DEFAULT 'missing' CHECK(video_thumbnail_status IN ('missing', 'generated', 'failed'))");
  }
  if (!tableHasColumn("remote_images", "video_thumbnail_key")) {
    database.run("ALTER TABLE remote_images ADD COLUMN video_thumbnail_key TEXT");
  }
  if (!tableHasColumn("remote_images", "local_copy_status")) {
    database.run("ALTER TABLE remote_images ADD COLUMN local_copy_status TEXT NOT NULL DEFAULT 'missing' CHECK(local_copy_status IN ('missing', 'downloaded', 'failed'))");
  }
  if (!tableHasColumn("remote_images", "local_copy_key")) {
    database.run("ALTER TABLE remote_images ADD COLUMN local_copy_key TEXT");
  }

  database.run("UPDATE images SET source_kind = 'local' WHERE source_kind IS NULL OR source_kind = ''");
  database.run("UPDATE remote_images SET media_kind = 'image' WHERE media_kind IS NULL OR media_kind = ''");
  database.run("UPDATE remote_images SET video_thumbnail_status = 'missing' WHERE video_thumbnail_status IS NULL OR video_thumbnail_status = ''");
  database.run("UPDATE remote_images SET local_copy_status = 'missing' WHERE local_copy_status IS NULL OR local_copy_status = ''");
  createLocalImagesTableIfNeeded(database);
  backfillLocalImages(database);
  rebuildImagesAsNeutralCatalog(database);
  createCollectionsTablesIfNeeded(database);
}

function migrateMidjourneyVideoThumbnailKeys(): void {
  const database = getSqliteDatabase();

  if (!database) {
    return;
  }

  const result = database.exec(
    `SELECT image_id, provider_group_id, video_thumbnail_key
     FROM remote_images
     WHERE provider = ?
       AND media_kind = 'video'
       AND video_thumbnail_status = 'generated'
       AND video_thumbnail_key LIKE 'mj-video-%'
       AND video_thumbnail_key NOT LIKE 'mj-video-job-%'`,
    [MIDJOURNEY_PROVIDER]
  )[0];

  if (!result) {
    return;
  }

  const imageIdIndex = result.columns.indexOf("image_id");
  const groupIdIndex = result.columns.indexOf("provider_group_id");
  const keyIndex = result.columns.indexOf("video_thumbnail_key");
  const migratedJobIds = new Set<string>();

  for (const row of result.values) {
    const imageId = row[imageIdIndex];
    const jobId = row[groupIdIndex];
    const oldKey = row[keyIndex];
    if (
      !isPositiveInteger(imageId) ||
      typeof jobId !== "string" ||
      !MIDJOURNEY_JOB_ID_PATTERN.test(jobId) ||
      typeof oldKey !== "string" ||
      migratedJobIds.has(jobId)
    ) {
      continue;
    }

    const newKey = getVideoThumbnailKey(jobId);
    const oldPath = path.join(getVideoThumbnailCacheDirectory(), oldKey);
    const newPath = getVideoThumbnailCachePath(newKey);
    if (!existsSync(oldPath) && !existsSync(newPath)) {
      continue;
    }

    try {
      mkdirSync(getVideoThumbnailCacheDirectory(), { recursive: true });
      if (!existsSync(newPath) && existsSync(oldPath)) {
        renameSync(oldPath, newPath);
      }
      database.run(
        `UPDATE remote_images
         SET video_thumbnail_status = 'generated', video_thumbnail_key = ?, updated_at = ?
         WHERE provider = ?
           AND media_kind = 'video'
           AND provider_group_id = ?`,
        [newKey, getNowIsoString(), MIDJOURNEY_PROVIDER, jobId]
      );
      migratedJobIds.add(jobId);
    } catch {
      // Leave the old per-slot reference intact; the existing placeholder fallback remains safe.
    }
  }

  if (migratedJobIds.size > 0) {
    persistDatabaseFile();
  }
}

async function initializeDatabase(): Promise<void> {
  try {
    const databaseDirectory = path.join(app.getPath("userData"), "Iconotheque");
    databasePathForReport = path.join(databaseDirectory, "iconotheque.sqlite");
    const schemaPath = path.join(__dirname, "../db/schema.sql");
    const sqlJsDirectory = path.dirname(require.resolve("sql.js/dist/sql-wasm.js"));
    const SQL = await initSqlJs({
      locateFile: (fileName) => path.join(sqlJsDirectory, fileName)
    });

    mkdirSync(databaseDirectory, { recursive: true });

    const existingDatabase = existsSync(databasePathForReport)
      ? readFileSync(databasePathForReport)
      : undefined;
    const database = new SQL.Database(existingDatabase);
    const schemaSql = readFileSync(schemaPath, "utf-8");

    sqliteDatabase = database;
    database.exec("PRAGMA foreign_keys = ON");
    database.exec(schemaSql);
    migrateDatabaseSchema();
    migrateMidjourneyVideoThumbnailKeys();
    runSql(
      `INSERT INTO app_meta (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at`,
      ["schema_version", SCHEMA_VERSION, getNowIsoString()],
      false
    );
    persistDatabaseFile();
    databaseStatus = {
      status: "created",
      error: null
    };
  } catch (error) {
    sqliteDatabase = null;
    setDatabaseError(error);
  }
}

function getDatabaseStatus(): DatabaseStatus {
  return databaseStatus;
}

function getNumberFromQuery(sql: string, params: SqlValue[], columnName: string): number | null {
  const database = getSqliteDatabase();

  if (!database) {
    return null;
  }

  try {
    const result = database.exec(sql, params)[0];

    if (!result || result.values.length === 0) {
      return null;
    }

    const columnIndex = result.columns.indexOf(columnName);

    if (columnIndex < 0) {
      return null;
    }

    const value = result.values[0][columnIndex];

    return typeof value === "number" ? value : null;
  } catch (error) {
    setDatabaseError(error);
    return null;
  }
}

function getImageIdByPath(imagePath: string): number | null {
  return getNumberFromQuery(
    "SELECT image_id AS id FROM local_images WHERE path = ?",
    [normalizeFolderPath(imagePath)],
    "id"
  );
}

function getImagePathById(imageId: number): string | null {
  const database = getSqliteDatabase();

  if (!database) {
    return null;
  }

  try {
    const result = database.exec("SELECT path FROM local_images WHERE image_id = ?", [imageId])[0];

    if (!result || result.values.length === 0) {
      return null;
    }

    const columnIndex = result.columns.indexOf("path");
    const value = result.values[0][columnIndex];

    return typeof value === "string" ? value : null;
  } catch (error) {
    setDatabaseError(error);
    return null;
  }
}

function getImageSourceKindById(imageId: number): ImageSourceKind | null {
  const database = getSqliteDatabase();

  if (!database || !isPositiveInteger(imageId)) {
    return null;
  }

  try {
    const result = database.exec("SELECT source_kind FROM images WHERE id = ?", [imageId])[0];

    if (!result || result.values.length === 0) {
      return null;
    }

    const columnIndex = result.columns.indexOf("source_kind");
    const value = result.values[0][columnIndex];

    return isImageSourceKind(value) ? value : null;
  } catch (error) {
    setDatabaseError(error);
    return null;
  }
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function getAuthorizedImageIdById(imageId: number): number | null {
  const sourceKind = getImageSourceKindById(imageId);

  if (sourceKind === "remote" && getRemoteImageRecordById(imageId)) {
    return imageId;
  }

  const imagePath = sourceKind === "local" ? getImagePathById(imageId) : null;

  if (!imagePath || !getAuthorizedRootForPath(imagePath)) {
    return null;
  }

  return imageId;
}

function resolveImageIdentity(imagePayload: unknown): { imageId: number | null; error: string | null } {
  if (isPositiveInteger(imagePayload)) {
    const authorizedImageId = getAuthorizedImageIdById(imagePayload);

    return {
      imageId: authorizedImageId,
      error: authorizedImageId === null ? "Image non autorisee pour cette session." : null
    };
  }

  const imageIdentity = imagePayload as ImageIdentity | null;

  if (imageIdentity && typeof imageIdentity === "object") {
    if (isPositiveInteger(imageIdentity.imageId)) {
      const authorizedImageId = getAuthorizedImageIdById(imageIdentity.imageId);

      if (authorizedImageId !== null) {
        return {
          imageId: authorizedImageId,
          error: null
        };
      }
    }

    if (typeof imageIdentity.imagePath === "string" && getAuthorizedRootForPath(imageIdentity.imagePath)) {
      return {
        imageId: getImageIdByPath(imageIdentity.imagePath),
        error: null
      };
    }
  }

  if (typeof imagePayload === "string" && getAuthorizedRootForPath(imagePayload)) {
    return {
      imageId: getImageIdByPath(imagePayload),
      error: null
    };
  }

  return {
    imageId: null,
    error: "Image non autorisee pour cette session."
  };
}

function getImageUserMetadataRows(imageId: number): Partial<ImageUserMetadata> {
  const database = getSqliteDatabase();

  if (!database) {
    return {};
  }

  try {
    const result = database.exec(
      `SELECT
         description,
         is_favorite,
         rating,
         reference_date,
         source,
         generation_tool,
         prompt_text,
         color_mode,
         workflow_color,
         status
       FROM image_user_meta
       WHERE image_id = ?`,
      [imageId]
    )[0];

    if (!result || result.values.length === 0) {
      return {};
    }

    const row = result.values[0];
    const valueAt = (columnName: string): SqlValue | null => {
      const columnIndex = result.columns.indexOf(columnName);

      return columnIndex >= 0 ? row[columnIndex] : null;
    };
    const colorMode = valueAt("color_mode");
    const workflowColor = valueAt("workflow_color");

    return {
      description: String(valueAt("description") ?? ""),
      isFavorite: valueAt("is_favorite") === 1,
      rating: typeof valueAt("rating") === "number" ? Number(valueAt("rating")) : null,
      referenceDate: String(valueAt("reference_date") ?? ""),
      source: String(valueAt("source") ?? ""),
      generationTool: String(valueAt("generation_tool") ?? ""),
      promptText: String(valueAt("prompt_text") ?? ""),
      colorMode: isColorMode(colorMode) ? colorMode : "unknown",
      workflowColor: isWorkflowColor(workflowColor) ? workflowColor : "none",
      status: String(valueAt("status") ?? "")
    };
  } catch (error) {
    setDatabaseError(error);
    return {};
  }
}

function getImageTerms(imageId: number): Record<TermKind, string[]> {
  const database = getSqliteDatabase();
  const terms = createEmptyImageUserMetadata().terms;

  if (!database) {
    return terms;
  }

  try {
    const result = database.exec(
      `SELECT terms.kind, terms.label
       FROM image_terms
       INNER JOIN terms ON terms.id = image_terms.term_id
       WHERE image_terms.image_id = ?
       ORDER BY terms.kind, terms.label`,
      [imageId]
    )[0];

    if (!result) {
      return terms;
    }

    const kindIndex = result.columns.indexOf("kind");
    const labelIndex = result.columns.indexOf("label");

    result.values.forEach((row) => {
      const kind = row[kindIndex];
      const label = row[labelIndex];

      if (isTermKind(kind) && typeof label === "string") {
        terms[kind].push(label);
      }
    });
  } catch (error) {
    setDatabaseError(error);
  }

  return terms;
}

function getWorkflowColorByImageId(imageId: number): WorkflowColor {
  const database = getSqliteDatabase();

  if (!database || !tableHasColumn("image_user_meta", "workflow_color")) {
    return "none";
  }

  try {
    const result = database.exec(
      `SELECT image_user_meta.workflow_color
       FROM images
       LEFT JOIN image_user_meta ON image_user_meta.image_id = images.id
       WHERE images.id = ?`,
      [imageId]
    )[0];

    if (!result || result.values.length === 0) {
      return "none";
    }

    const columnIndex = result.columns.indexOf("workflow_color");
    const value = result.values[0][columnIndex];

    return isWorkflowColor(value) ? value : "none";
  } catch (error) {
    setDatabaseError(error);
    return "none";
  }
}

function attachDatabaseIdentityAndWorkflowColors(images: ImageFile[]): ImageFile[] {
  return images.map((image) => {
    const imageId = image.path ? getImageIdByPath(image.path) ?? image.imageId : image.imageId;

    return {
      ...image,
      imageId,
      workflowColor: imageId > 0 ? getWorkflowColorByImageId(imageId) : "none"
    };
  });
}

function addOrGetTerm(kind: TermKind, label: string, createdAt: string): number | null {
  const database = getSqliteDatabase();
  const displayLabel = normalizeDisplayLabel(label);
  const normalizedLabel = normalizeTermLabel(displayLabel);

  if (!database || !displayLabel) {
    return null;
  }

  database.run(
    `INSERT INTO terms (kind, label, normalized_label, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(kind, normalized_label) DO UPDATE SET
       label = terms.label`,
    [kind, displayLabel, normalizedLabel, createdAt]
  );

  return getNumberFromQuery(
    "SELECT id FROM terms WHERE kind = ? AND normalized_label = ?",
    [kind, normalizedLabel],
    "id"
  );
}

function upsertRoot(folder: { path: string; name: string }, openedAt: string): number | null {
  const database = getSqliteDatabase();

  if (!database) {
    return null;
  }

  try {
    const normalizedPath = normalizeFolderPath(folder.path);

    runSql(
      `INSERT INTO roots (path, name, opened_at, last_scanned_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(path) DO UPDATE SET
         name = excluded.name,
         opened_at = excluded.opened_at`,
      [normalizedPath, folder.name, openedAt, openedAt]
    );

    return getNumberFromQuery(
      "SELECT id FROM roots WHERE path = ?",
      [normalizedPath],
      "id"
    );
  } catch (error) {
    setDatabaseError(error);
    return null;
  }
}

function getRootId(rootPath: string): number | null {
  const database = getSqliteDatabase();

  if (!database) {
    return null;
  }

  try {
    return getNumberFromQuery(
      "SELECT id FROM roots WHERE path = ?",
      [normalizeFolderPath(rootPath)],
      "id"
    );
  } catch (error) {
    setDatabaseError(error);
    return null;
  }
}

function updateRootScannedAt(rootId: number, scannedAt: string): void {
  const database = getSqliteDatabase();

  if (!database) {
    return;
  }

  try {
    runSql("UPDATE roots SET last_scanned_at = ? WHERE id = ?", [scannedAt, rootId]);
  } catch (error) {
    setDatabaseError(error);
  }
}

function upsertFolder(
  rootId: number,
  rootPath: string,
  folderPath: string,
  directImageCount: number,
  subfolderCount: number,
  scanError: string | null,
  scannedAt: string
): number | null {
  const database = getSqliteDatabase();

  if (!database) {
    return null;
  }

  try {
    const normalizedFolderPath = normalizeFolderPath(folderPath);
    const relativePath = getFolderRelativePath(rootPath, normalizedFolderPath);
    const parentPath = relativePath === "." ? null : path.dirname(normalizedFolderPath);

    runSql(
      `INSERT INTO folders (
         root_id, path, relative_path, name, parent_path,
         direct_image_count, subfolder_count, scan_error, last_scanned_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(root_id, path) DO UPDATE SET
         relative_path = excluded.relative_path,
         name = excluded.name,
         parent_path = excluded.parent_path,
         direct_image_count = excluded.direct_image_count,
         subfolder_count = excluded.subfolder_count,
         scan_error = excluded.scan_error,
         last_scanned_at = excluded.last_scanned_at`,
      [
        rootId,
        normalizedFolderPath,
        relativePath,
        path.basename(normalizedFolderPath) || normalizedFolderPath,
        parentPath,
        directImageCount,
        subfolderCount,
        scanError,
        scannedAt
      ]
    );

    return getNumberFromQuery(
      "SELECT id FROM folders WHERE root_id = ? AND path = ?",
      [rootId, normalizedFolderPath],
      "id"
    );
  } catch (error) {
    setDatabaseError(error);
    return null;
  }
}

function persistFolderTree(rootFolderPath: string, tree: FolderTreeNode): void {
  const normalizedRootPath = normalizeFolderPath(rootFolderPath);
  const rootId = getRootId(normalizedRootPath);

  if (rootId === null) {
    return;
  }

  const scannedAt = getNowIsoString();
  updateRootScannedAt(rootId, scannedAt);
  const persistNode = (node: FolderTreeNode): void => {
    upsertFolder(
      rootId,
      normalizedRootPath,
      node.path,
      node.directImageCount,
      node.subfolderCount,
      node.error,
      scannedAt
    );

    node.children.forEach(persistNode);
  };

  persistNode(tree);
}

function getPreviewId(previewUrl: string): string | null {
  if (!previewUrl.startsWith(`${IMAGE_PROTOCOL_SCHEME}://image/`)) {
    return null;
  }

  return previewUrl.replace(`${IMAGE_PROTOCOL_SCHEME}://image/`, "");
}

function getRemotePreviewUrl(imageId: number): string {
  return `${IMAGE_PROTOCOL_SCHEME}://remote/${imageId}`;
}

function getVideoThumbnailCacheDirectory(): string {
  return path.join(app.getPath("userData"), "Iconotheque", "video-thumbnails");
}

function getMidjourneyLocalImagesDirectory(): string {
  return path.join(app.getPath("userData"), "Iconotheque", "midjourney-images");
}

function getMidjourneyLocalCopyPath(remoteRecord: RemoteImageRecord): string | null {
  if (
    remoteRecord.provider !== MIDJOURNEY_PROVIDER ||
    remoteRecord.mediaKind !== "image" ||
    remoteRecord.localCopyStatus !== "downloaded" ||
    !remoteRecord.localCopyKey
  ) {
    return null;
  }

  const localPath = resolveMidjourneyLocalImagePath(
    getMidjourneyLocalImagesDirectory(),
    remoteRecord.localCopyKey
  );
  return localPath && existsSync(localPath) ? localPath : null;
}

function getVideoThumbnailKey(jobId: string): string {
  return `mj-video-job-${jobId.toLowerCase()}.png`;
}

function getVideoThumbnailCachePath(thumbnailKey: string): string {
  return path.join(getVideoThumbnailCacheDirectory(), thumbnailKey);
}

function getVideoThumbnailPreviewUrl(imageId: number): string {
  return `${IMAGE_PROTOCOL_SCHEME}://thumbnail/${imageId}`;
}

function getVideoThumbnailKeyForRemoteRecord(remoteRecord: RemoteImageRecord): string | null {
  if (
    remoteRecord.provider !== MIDJOURNEY_PROVIDER ||
    remoteRecord.mediaKind !== "video" ||
    !remoteRecord.providerGroupId ||
    !MIDJOURNEY_JOB_ID_PATTERN.test(remoteRecord.providerGroupId)
  ) {
    return null;
  }

  return getVideoThumbnailKey(remoteRecord.providerGroupId);
}

function getDisplayNameFromRemoteUrl(remoteUrl: string): string {
  try {
    const parsedUrl = new URL(remoteUrl);
    const basename = path.basename(parsedUrl.pathname);

    return basename || parsedUrl.hostname;
  } catch {
    return "Image web";
  }
}

function getRemoteExtension(remoteUrl: string): string {
  try {
    return path.extname(new URL(remoteUrl).pathname).toLowerCase();
  } catch {
    return "";
  }
}

function persistImagesForFolder(folderPath: string, images: ImageFile[]): void {
  const database = getSqliteDatabase();
  const rootPath = getAuthorizedRootForPath(folderPath);

  if (!database || !rootPath) {
    return;
  }

  const normalizedRootPath = normalizeFolderPath(rootPath);
  const normalizedFolderPath = normalizeFolderPath(folderPath);
  const rootId = getRootId(normalizedRootPath);

  if (rootId === null) {
    return;
  }

  const indexedAt = getNowIsoString();
  updateRootScannedAt(rootId, indexedAt);
  const folderId = upsertFolder(
    rootId,
    normalizedRootPath,
    normalizedFolderPath,
    images.length,
    0,
    null,
    indexedAt
  );

  try {
    images.forEach((image) => {
      if (!image.path) {
        return;
      }

      const normalizedImagePath = normalizeFolderPath(image.path);
      let imageId = getImageIdByPath(normalizedImagePath);

      if (imageId === null) {
        runSql(
          "INSERT INTO images (source_kind, created_at, updated_at) VALUES ('local', ?, ?)",
          [indexedAt, indexedAt],
          false
        );
        imageId = getNumberFromQuery("SELECT last_insert_rowid() AS id", [], "id");
      } else {
        runSql(
          "UPDATE images SET source_kind = 'local', updated_at = ? WHERE id = ?",
          [indexedAt, imageId],
          false
        );
      }

      if (imageId === null) {
        return;
      }

      runSql(
        `INSERT INTO local_images (
           image_id, root_id, folder_id, path, folder_path, file_name,
           extension, size_bytes, modified_at, preview_id, created_at, updated_at
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(image_id) DO UPDATE SET
           root_id = excluded.root_id,
           folder_id = excluded.folder_id,
           path = excluded.path,
           folder_path = excluded.folder_path,
           file_name = excluded.file_name,
           extension = excluded.extension,
           size_bytes = excluded.size_bytes,
           modified_at = excluded.modified_at,
           preview_id = excluded.preview_id,
           updated_at = excluded.updated_at`,
        [
          imageId,
          rootId,
          folderId,
          normalizedImagePath,
          normalizedFolderPath,
          image.name,
          image.extension,
          image.sizeBytes,
          image.modifiedAt,
          getPreviewId(image.previewUrl),
          indexedAt,
          indexedAt
        ],
        false
      );
    });
    persistDatabaseFile();
  } catch (error) {
    setDatabaseError(error);
  }
}

function validateRemoteImageUrl(input: string): RemoteUrlValidationResult {
  const trimmedInput = input.trim();

  if (!trimmedInput) {
    return {
      ok: false,
      error: "URL distante vide."
    };
  }

  try {
    const parsedUrl = new URL(trimmedInput);

    if (parsedUrl.protocol !== "https:") {
      return {
        ok: false,
        error: "Seules les URL https:// sont acceptees pour les images distantes."
      };
    }

    const extension = path.extname(parsedUrl.pathname).toLowerCase();

    if (extension && !SUPPORTED_IMAGE_EXTENSIONS.has(extension)) {
      return {
        ok: false,
        error: "Extension d'image distante non prise en charge."
      };
    }

    return {
      ok: true,
      normalizedUrl: parsedUrl.toString()
    };
  } catch {
    return {
      ok: false,
      error: "URL distante invalide."
    };
  }
}

function validateMidjourneyVideoUrl(input: string): RemoteUrlValidationResult {
  try {
    const url = new URL(input);
    if (url.protocol !== "https:" || url.hostname !== MIDJOURNEY_CDN_HOSTNAME || !/^\/video\/[0-9a-f-]{36}\/[0-3]\.mp4$/i.test(url.pathname)) {
      return { ok: false, error: "URL video Midjourney invalide." };
    }
    return { ok: true, normalizedUrl: url.toString() };
  } catch {
    return { ok: false, error: "URL video Midjourney invalide." };
  }
}

function createRemoteImageRecord(input: CreateRemoteImageInput): number {
  const database = getSqliteDatabase();
  const validation = input.mediaKind === "video" ? validateMidjourneyVideoUrl(input.remoteUrl) : validateRemoteImageUrl(input.remoteUrl);

  if (!database) {
    throw new Error("Base SQLite non disponible.");
  }

  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const existingImageId = getRemoteImageIdByUrl(validation.normalizedUrl);

  if (existingImageId !== null) {
    return existingImageId;
  }

  const now = getNowIsoString();
  const provider = input.provider?.trim() || "generic_url";
  const mediaKind = input.mediaKind ?? "image";
  let imageId: number | null = null;

  try {
    database.run("BEGIN TRANSACTION");
    database.run(
      "INSERT INTO images (source_kind, created_at, updated_at) VALUES ('remote', ?, ?)",
      [now, now]
    );
    imageId = getNumberFromQuery("SELECT last_insert_rowid() AS id", [], "id");

    if (imageId === null) {
      throw new Error("Impossible de creer l'identite catalogue distante.");
    }

    database.run(
      `INSERT INTO remote_images (
         image_id,
         remote_url,
         provider,
         provider_id,
         provider_group_id,
         remote_slot,
         media_kind,
         source_status,
         last_checked_at,
         last_known_status,
         created_at,
         updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, 'remote', NULL, NULL, ?, ?)`,
      [
        imageId,
        validation.normalizedUrl,
        provider,
        input.providerId ?? null,
        input.providerGroupId ?? null,
        input.remoteSlot ?? null,
        mediaKind,
        now,
        now
      ]
    );
    database.run("COMMIT");
    persistDatabaseFile();

    return imageId;
  } catch (error) {
    try {
      database.run("ROLLBACK");
    } catch {
      // Ignore rollback errors; the original error is more useful.
    }

    throw error;
  }
}

function getRemoteImageIdByUrl(remoteUrl: string): number | null {
  return getNumberFromQuery(
    "SELECT image_id AS id FROM remote_images WHERE remote_url = ?",
    [remoteUrl],
    "id"
  );
}

function updateRemoteImageProviderDetails(
  imageId: number,
  provider: string,
  providerId: string | null,
  providerGroupId: string | null,
  remoteSlot: string | null
): void {
  const database = getSqliteDatabase();

  if (!database || !isPositiveInteger(imageId)) {
    return;
  }

  runSql(
    `UPDATE remote_images
     SET provider = ?,
         provider_id = ?,
         provider_group_id = ?,
         remote_slot = ?,
         updated_at = ?
     WHERE image_id = ?`,
    [provider, providerId, providerGroupId, remoteSlot, getNowIsoString(), imageId]
  );
}

function getRemoteImageRecordById(imageId: number): RemoteImageRecord | null {
  const database = getSqliteDatabase();

  if (!database || !isPositiveInteger(imageId)) {
    return null;
  }

  const result = database.exec(
    `SELECT
       images.id,
       remote_images.remote_url,
       remote_images.provider,
       remote_images.provider_id,
       remote_images.provider_group_id,
       remote_images.remote_slot,
       remote_images.media_kind,
       remote_images.video_thumbnail_status,
       remote_images.video_thumbnail_key,
       remote_images.local_copy_status,
       remote_images.local_copy_key,
       remote_images.source_status,
       remote_images.last_checked_at,
       remote_images.last_known_status,
       remote_images.created_at,
       remote_images.updated_at
     FROM images
     INNER JOIN remote_images ON remote_images.image_id = images.id
     WHERE images.id = ?
       AND images.source_kind = 'remote'`,
    [imageId]
  )[0];

  if (!result || result.values.length === 0) {
    return null;
  }

  const row = result.values[0];
  const valueAt = (columnName: string): SqlValue | null => {
    const columnIndex = result.columns.indexOf(columnName);

    return columnIndex >= 0 ? row[columnIndex] : null;
  };
  const sourceStatus = valueAt("source_status");

  if (sourceStatus !== "remote" && sourceStatus !== "cached" && sourceStatus !== "archived") {
    return null;
  }

  return {
    imageId,
    remoteUrl: String(valueAt("remote_url") ?? ""),
    provider: String(valueAt("provider") ?? "generic_url"),
    providerId: typeof valueAt("provider_id") === "string" ? String(valueAt("provider_id")) : null,
    providerGroupId:
      typeof valueAt("provider_group_id") === "string" ? String(valueAt("provider_group_id")) : null,
    remoteSlot: typeof valueAt("remote_slot") === "string" ? String(valueAt("remote_slot")) : null,
    mediaKind: valueAt("media_kind") === "video" ? "video" : "image",
    videoThumbnailStatus: valueAt("video_thumbnail_status") === "generated" ? "generated" : valueAt("video_thumbnail_status") === "failed" ? "failed" : "missing",
    videoThumbnailKey: typeof valueAt("video_thumbnail_key") === "string" ? String(valueAt("video_thumbnail_key")) : null,
    localCopyStatus: valueAt("local_copy_status") === "downloaded" ? "downloaded" : valueAt("local_copy_status") === "failed" ? "failed" : "missing",
    localCopyKey: typeof valueAt("local_copy_key") === "string" ? String(valueAt("local_copy_key")) : null,
    sourceStatus,
    lastCheckedAt:
      typeof valueAt("last_checked_at") === "string" ? String(valueAt("last_checked_at")) : null,
    lastKnownStatus:
      typeof valueAt("last_known_status") === "string" ? String(valueAt("last_known_status")) : null,
    createdAt: typeof valueAt("created_at") === "string" ? String(valueAt("created_at")) : null,
    updatedAt: typeof valueAt("updated_at") === "string" ? String(valueAt("updated_at")) : null
  };
}

function toRemoteImageFile(remoteRecord: RemoteImageRecord, workflowColor?: WorkflowColor): ImageFile {
  const displayName = getDisplayNameFromRemoteUrl(remoteRecord.remoteUrl);
  const extension = getRemoteExtension(remoteRecord.remoteUrl);
  const localCopyPath = getMidjourneyLocalCopyPath(remoteRecord);
  const imageSrc = localCopyPath ? createPreviewUrl(localCopyPath, ".png") ?? getRemotePreviewUrl(remoteRecord.imageId) : getRemotePreviewUrl(remoteRecord.imageId);
  const providerLabel = remoteRecord.provider === MIDJOURNEY_PROVIDER ? "Midjourney" : null;
  const slotLabel = remoteRecord.remoteSlot ? ` ${remoteRecord.remoteSlot}` : "";
  const videoThumbnailKey = getVideoThumbnailKeyForRemoteRecord(remoteRecord);

  return {
    imageId: remoteRecord.imageId,
    sourceKind: "remote",
    name: displayName,
    displayName: providerLabel ? `${providerLabel}${slotLabel}` : displayName,
    fileName: displayName,
    path: null,
    extension,
    sizeBytes: null,
    modifiedAt: remoteRecord.updatedAt,
    imageSrc,
    previewUrl: imageSrc,
    workflowColor: workflowColor ?? getWorkflowColorByImageId(remoteRecord.imageId),
    remoteProvider: remoteRecord.provider,
    remoteProviderGroupId: remoteRecord.providerGroupId,
    remoteSlot: remoteRecord.remoteSlot,
    mediaKind: remoteRecord.mediaKind,
    videoThumbnailUrl:
      remoteRecord.mediaKind === "video" &&
      remoteRecord.videoThumbnailStatus === "generated" &&
      videoThumbnailKey !== null &&
      remoteRecord.videoThumbnailKey === videoThumbnailKey &&
      existsSync(getVideoThumbnailCachePath(videoThumbnailKey))
        ? getVideoThumbnailPreviewUrl(remoteRecord.imageId)
        : null
  };
}

function saveMidjourneyVideoThumbnail(inputPayload: unknown): SaveMidjourneyVideoThumbnailResult {
  const imageId = (inputPayload as { imageId?: unknown } | null)?.imageId;
  const dataUrl = (inputPayload as { dataUrl?: unknown } | null)?.dataUrl;

  if (!isPositiveInteger(imageId) || typeof dataUrl !== "string") {
    return { ok: false, error: "Vignette vidéo invalide." };
  }

  const remoteRecord = getRemoteImageRecordById(imageId);
  if (
    !remoteRecord ||
    remoteRecord.provider !== MIDJOURNEY_PROVIDER ||
    remoteRecord.mediaKind !== "video"
  ) {
    return { ok: false, error: "Cette entrée n'est pas une vidéo Midjourney cataloguée." };
  }

  const database = getSqliteDatabase();
  if (!database) {
    return { ok: false, error: "Base SQLite non disponible." };
  }

  const thumbnailKey = getVideoThumbnailKeyForRemoteRecord(remoteRecord);
  if (!thumbnailKey || !remoteRecord.providerGroupId) {
    return { ok: false, error: "Le job Midjourney de cette vidéo est invalide." };
  }

  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) {
    return { ok: false, error: "La vignette doit être un PNG encodé." };
  }

  const pngData = Buffer.from(match[1], "base64");
  if (
    pngData.length === 0 ||
    pngData.length > 10 * 1024 * 1024 ||
    !pngData.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { ok: false, error: "Le PNG de vignette est invalide ou trop volumineux." };
  }

  try {
    mkdirSync(getVideoThumbnailCacheDirectory(), { recursive: true });
    writeFileSync(getVideoThumbnailCachePath(thumbnailKey), pngData);
    database.run(
      `UPDATE remote_images
       SET video_thumbnail_status = 'generated', video_thumbnail_key = ?, updated_at = ?
       WHERE provider = ?
         AND media_kind = 'video'
         AND provider_group_id = ?`,
      [thumbnailKey, getNowIsoString(), MIDJOURNEY_PROVIDER, remoteRecord.providerGroupId]
    );
    persistDatabaseFile();
    return { ok: true, thumbnailUrl: getVideoThumbnailPreviewUrl(imageId) };
  } catch (error) {
    runSql(
      `UPDATE remote_images
       SET video_thumbnail_status = 'failed', updated_at = ?
       WHERE provider = ?
         AND media_kind = 'video'
         AND provider_group_id = ?`,
      [getNowIsoString(), MIDJOURNEY_PROVIDER, remoteRecord.providerGroupId]
    );
    return { ok: false, error: error instanceof Error ? error.message : "Impossible d'enregistrer la vignette vidéo." };
  }
}

function getLocalImageFileById(imageId: number): ImageFile | null {
  const database = getSqliteDatabase();

  if (!database || !isPositiveInteger(imageId)) {
    return null;
  }

  const result = database.exec(
    `SELECT
       images.id,
       li.file_name,
       li.path,
       li.extension,
       li.size_bytes,
       li.modified_at,
       COALESCE(image_user_meta.workflow_color, 'none') AS workflow_color
     FROM images
     INNER JOIN local_images AS li ON li.image_id = images.id
     LEFT JOIN image_user_meta ON image_user_meta.image_id = images.id
     WHERE images.id = ?
       AND images.source_kind = 'local'`,
    [imageId]
  )[0];

  if (!result || result.values.length === 0) {
    return null;
  }

  const row = result.values[0];
  const columnIndex = (columnName: string): number => result.columns.indexOf(columnName);
  const filePath = typeof row[columnIndex("path")] === "string" ? String(row[columnIndex("path")]) : "";
  const extension = typeof row[columnIndex("extension")] === "string" ? String(row[columnIndex("extension")]) : "";
  const name = String(row[columnIndex("file_name")] ?? path.basename(filePath));
  const previewUrl = createPreviewUrl(filePath, extension) ?? "";
  const workflowColor = row[columnIndex("workflow_color")];

  if (!filePath || !previewUrl) {
    return null;
  }

  return {
    imageId,
    sourceKind: "local",
    name,
    displayName: name,
    fileName: name,
    path: filePath,
    extension,
    sizeBytes:
      typeof row[columnIndex("size_bytes")] === "number"
        ? Number(row[columnIndex("size_bytes")])
        : null,
    modifiedAt:
      typeof row[columnIndex("modified_at")] === "string"
        ? String(row[columnIndex("modified_at")])
        : null,
    imageSrc: previewUrl,
    previewUrl,
    workflowColor: isWorkflowColor(workflowColor) ? workflowColor : "none"
  };
}

function getImageFileById(imageId: number): ImageFile | null {
  const sourceKind = getImageSourceKindById(imageId);

  if (sourceKind === "remote") {
    const remoteRecord = getRemoteImageRecordById(imageId);

    return remoteRecord ? toRemoteImageFile(remoteRecord) : null;
  }

  if (sourceKind === "local") {
    return getLocalImageFileById(imageId);
  }

  return null;
}

function listRemoteImages(providerFilter?: string): ImageScanResult {
  const database = getSqliteDatabase();

  if (!database) {
    return {
      ok: false,
      error: "Base SQLite non disponible."
    };
  }

  try {
    const conditions = ["images.source_kind = 'remote'"];
    const params: SqlValue[] = [];

    if (providerFilter === MIDJOURNEY_PROVIDER || providerFilter === GENERIC_REMOTE_PROVIDER) {
      conditions.push("remote_images.provider = ?");
      params.push(providerFilter);
    }

    const result = database.exec(
      `SELECT
         images.id,
         remote_images.remote_url,
         remote_images.provider,
         remote_images.provider_id,
         remote_images.provider_group_id,
         remote_images.remote_slot,
         remote_images.media_kind,
         remote_images.video_thumbnail_status,
         remote_images.video_thumbnail_key,
         remote_images.local_copy_status,
         remote_images.local_copy_key,
         remote_images.source_status,
         remote_images.last_checked_at,
         remote_images.last_known_status,
         remote_images.created_at,
         remote_images.updated_at,
         COALESCE(image_user_meta.workflow_color, 'none') AS workflow_color
       FROM images
       INNER JOIN remote_images ON remote_images.image_id = images.id
       LEFT JOIN image_user_meta ON image_user_meta.image_id = images.id
       WHERE ${conditions.join(" AND ")}
       ORDER BY remote_images.created_at DESC, images.id DESC`,
      params
    )[0];

    if (!result) {
      return {
        ok: true,
        images: []
      };
    }

    const columnIndex = (columnName: string): number => result.columns.indexOf(columnName);
    const images = result.values
      .map((row): ImageFile | null => {
        const sourceStatus = row[columnIndex("source_status")];
        const imageId = row[columnIndex("id")];
        const workflowColor = row[columnIndex("workflow_color")];

        if (!isPositiveInteger(imageId)) {
          return null;
        }

        if (sourceStatus !== "remote" && sourceStatus !== "cached" && sourceStatus !== "archived") {
          return null;
        }

        return toRemoteImageFile(
          {
            imageId,
            remoteUrl: String(row[columnIndex("remote_url")] ?? ""),
            provider: String(row[columnIndex("provider")] ?? "generic_url"),
            providerId:
              typeof row[columnIndex("provider_id")] === "string"
                ? String(row[columnIndex("provider_id")])
                : null,
            providerGroupId:
              typeof row[columnIndex("provider_group_id")] === "string"
                ? String(row[columnIndex("provider_group_id")])
                : null,
            remoteSlot:
              typeof row[columnIndex("remote_slot")] === "string"
                ? String(row[columnIndex("remote_slot")])
                : null,
            mediaKind: row[columnIndex("media_kind")] === "video" ? "video" : "image",
            videoThumbnailStatus: row[columnIndex("video_thumbnail_status")] === "generated" ? "generated" : row[columnIndex("video_thumbnail_status")] === "failed" ? "failed" : "missing",
            videoThumbnailKey:
              typeof row[columnIndex("video_thumbnail_key")] === "string"
                ? String(row[columnIndex("video_thumbnail_key")])
                : null,
            localCopyStatus: row[columnIndex("local_copy_status")] === "downloaded" ? "downloaded" : row[columnIndex("local_copy_status")] === "failed" ? "failed" : "missing",
            localCopyKey:
              typeof row[columnIndex("local_copy_key")] === "string"
                ? String(row[columnIndex("local_copy_key")])
                : null,
            sourceStatus,
            lastCheckedAt:
              typeof row[columnIndex("last_checked_at")] === "string"
                ? String(row[columnIndex("last_checked_at")])
                : null,
            lastKnownStatus:
              typeof row[columnIndex("last_known_status")] === "string"
                ? String(row[columnIndex("last_known_status")])
                : null,
            createdAt:
              typeof row[columnIndex("created_at")] === "string"
                ? String(row[columnIndex("created_at")])
                : null,
            updatedAt:
              typeof row[columnIndex("updated_at")] === "string"
                ? String(row[columnIndex("updated_at")])
                : null
          },
          isWorkflowColor(workflowColor) ? workflowColor : "none"
        );
      })
      .filter((image): image is ImageFile => image !== null);

    return {
      ok: true,
      images
    };
  } catch (error) {
    setDatabaseError(error);

    return {
      ok: false,
      error: "Impossible de lister les images web."
    };
  }
}

function addRemoteImageFromUrl(remoteUrlPayload: unknown): AddRemoteImageResult {
  if (typeof remoteUrlPayload !== "string") {
    return {
      ok: false,
      error: "URL distante invalide."
    };
  }

  try {
    const validation = validateRemoteImageUrl(remoteUrlPayload);

    if (!validation.ok) {
      return {
        ok: false,
        error: validation.error
      };
    }

    const parsedRemoteUrl = new URL(validation.normalizedUrl);
    const midjourneyValidation =
      parsedRemoteUrl.hostname === MIDJOURNEY_CDN_HOSTNAME
        ? validateMidjourneyInput(validation.normalizedUrl)
        : null;

    if (midjourneyValidation && !midjourneyValidation.ok) {
      return {
        ok: false,
        error: midjourneyValidation.error
      };
    }

    if (midjourneyValidation?.ok && midjourneyValidation.detectedSlot !== null) {
      const midjourneyResult = createOrReuseMidjourneyJob(midjourneyValidation.jobId);

      return {
        ok: true,
        route: "midjourney",
        jobId: midjourneyResult.jobId,
        createdCount: midjourneyResult.createdCount,
        existingCount: midjourneyResult.existingCount,
        imageIds: midjourneyResult.imageIds,
        images: midjourneyResult.images
      };
    }

    const existingImageId = getRemoteImageIdByUrl(validation.normalizedUrl);
    const imageId = createRemoteImageRecord({ remoteUrl: validation.normalizedUrl });
    const remoteRecord = getRemoteImageRecordById(imageId);

    if (!remoteRecord) {
      return {
        ok: false,
        error: "Image web creee mais impossible a relire."
      };
    }

    return {
      ok: true,
      route: "generic",
      image: toRemoteImageFile(remoteRecord),
      alreadyExists: existingImageId !== null
    };
  } catch (error) {
    setDatabaseError(error);

    return {
      ok: false,
      error: error instanceof Error ? error.message : "Impossible d'ajouter l'image web."
    };
  }
}

function validateMidjourneyInput(input: string): MidjourneyInputValidationResult {
  const trimmedInput = input.trim();

  if (!trimmedInput) {
    return {
      ok: false,
      error: "Job ID Midjourney invalide."
    };
  }

  if (MIDJOURNEY_JOB_ID_PATTERN.test(trimmedInput)) {
    return {
      ok: true,
      jobId: trimmedInput.toLowerCase(),
      detectedSlot: null
    };
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(trimmedInput);
  } catch {
    return {
      ok: false,
      error: "URL Midjourney invalide."
    };
  }

  if (parsedUrl.protocol !== "https:") {
    return {
      ok: false,
      error: "URL Midjourney invalide."
    };
  }

  if (parsedUrl.hostname !== MIDJOURNEY_CDN_HOSTNAME) {
    return {
      ok: false,
      error: "Seules les URLs cdn.midjourney.com sont acceptees ici."
    };
  }

  const pathParts = parsedUrl.pathname.split("/").filter(Boolean);

  if (pathParts.length !== 2 || !MIDJOURNEY_JOB_ID_PATTERN.test(pathParts[0])) {
    return {
      ok: false,
      error: "Job ID Midjourney invalide."
    };
  }

  const slot = path.basename(pathParts[1], ".png");

  if (!MIDJOURNEY_SLOTS.includes(slot as MidjourneySlot) || path.extname(pathParts[1]).toLowerCase() !== ".png") {
    return {
      ok: false,
      error: "URL Midjourney invalide."
    };
  }

  return {
    ok: true,
    jobId: pathParts[0].toLowerCase(),
    detectedSlot: slot as MidjourneySlot
  };
}

function getMidjourneySlotUrl(jobId: string, slot: MidjourneySlot): string {
  return `https://${MIDJOURNEY_CDN_HOSTNAME}/${jobId}/${slot}.png`;
}

function getMidjourneyVideoSlotUrl(jobId: string, slot: string): string {
  return `https://${MIDJOURNEY_CDN_HOSTNAME}/video/${jobId}/${slot}.mp4`;
}

function createOrReuseMidjourneyVideoJob(jobId: string): MidjourneyBatchJobResult & { images: ImageFile[] } {
  let createdCount = 0; let existingCount = 0; const imageIds: number[] = []; const images: ImageFile[] = [];
  MIDJOURNEY_VIDEO_SLOTS.forEach((slot) => {
    const remoteUrl = getMidjourneyVideoSlotUrl(jobId, slot);
    const existingImageId = getRemoteImageIdByUrl(remoteUrl);
    const imageId = createRemoteImageRecord({ remoteUrl, provider: MIDJOURNEY_PROVIDER, providerId: jobId, providerGroupId: jobId, remoteSlot: slot, mediaKind: "video" });
    if (existingImageId === null) createdCount += 1; else existingCount += 1;
    imageIds.push(imageId); const record = getRemoteImageRecordById(imageId); if (record) images.push(toRemoteImageFile(record));
  });
  return { jobId, createdCount, existingCount, imageIds, images };
}

function addMidjourneyVideoJob(inputPayload: unknown): AddMidjourneyJobResult {
  if (typeof inputPayload !== "string" || !MIDJOURNEY_JOB_ID_PATTERN.test(inputPayload.trim())) return { ok: false, error: "Job ID Midjourney invalide." };
  const jobId = inputPayload.trim().toLowerCase();
  try { const result = createOrReuseMidjourneyVideoJob(jobId); return { ok: true, ...result }; }
  catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Impossible d'ajouter le job video Midjourney." }; }
}

function addMidjourneyVideoJobsBatch(inputPayload: unknown): AddMidjourneyJobsBatchResult {
  if (typeof inputPayload !== "string") return { ok: false, error: "Liste de jobs vidéo Midjourney invalide." };
  const jobIds = new Set<string>();
  const invalidLines: MidjourneyInvalidLine[] = [];
  inputPayload.split(/\r?\n/).forEach((line) => {
    const jobId = line.trim().toLowerCase();
    if (!jobId) return;
    if (MIDJOURNEY_JOB_ID_PATTERN.test(jobId)) jobIds.add(jobId);
    else invalidLines.push({ line: line.trim(), reason: "Job ID Midjourney invalide." });
  });
  if (jobIds.size === 0 && invalidLines.length === 0) return { ok: false, error: "Aucun job vidéo Midjourney à importer." };
  const jobs: MidjourneyBatchJobResult[] = []; const images: ImageFile[] = [];
  let createdImageCount = 0; let existingImageCount = 0;
  try {
    jobIds.forEach((jobId) => { const result = createOrReuseMidjourneyVideoJob(jobId); jobs.push({ jobId, createdCount: result.createdCount, existingCount: result.existingCount, imageIds: result.imageIds }); images.push(...result.images); createdImageCount += result.createdCount; existingImageCount += result.existingCount; });
    return { ok: true, detectedJobCount: jobs.length, createdImageCount, existingImageCount, invalidLineCount: invalidLines.length, jobs, invalidLines, images };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Impossible d'importer les jobs vidéo Midjourney." }; }
}

function createOrReuseMidjourneyJob(jobId: string): MidjourneyBatchJobResult & { images: ImageFile[] } {
  let createdCount = 0;
  let existingCount = 0;
  const imageIds: number[] = [];
  const images: ImageFile[] = [];

  MIDJOURNEY_SLOTS.forEach((slot) => {
    const remoteUrl = getMidjourneySlotUrl(jobId, slot);
    const existingImageId = getRemoteImageIdByUrl(remoteUrl);
    const imageId = createRemoteImageRecord({
      remoteUrl,
      provider: MIDJOURNEY_PROVIDER,
      providerId: jobId,
      providerGroupId: jobId,
      remoteSlot: slot
    });

    if (existingImageId !== null) {
      updateRemoteImageProviderDetails(imageId, MIDJOURNEY_PROVIDER, jobId, jobId, slot);
    }

    const remoteRecord = getRemoteImageRecordById(imageId);

    if (existingImageId === null) {
      createdCount += 1;
    } else {
      existingCount += 1;
    }

    imageIds.push(imageId);

    if (remoteRecord) {
      images.push(toRemoteImageFile(remoteRecord));
    }
  });

  return {
    jobId,
    createdCount,
    existingCount,
    imageIds,
    images
  };
}

function repairIncorrectImageSlotsForMidjourneyVideoJob(jobId: string): number {
  const database = getSqliteDatabase();
  if (!database) return 0;
  const result = database.exec(
    "SELECT image_id FROM remote_images WHERE provider = ? AND provider_group_id = ? AND media_kind = 'image'",
    [MIDJOURNEY_PROVIDER, jobId]
  )[0];
  const imageIds = result?.values.map((row) => row[0]).filter(isPositiveInteger) ?? [];
  if (imageIds.length === 0) return 0;
  const removal = removeRemoteImagesFromCatalog(database, imageIds);
  if (!removal.ok) return 0;
  persistDatabaseFile();
  return removal.removedCount;
}

function addMidjourneyJob(inputPayload: unknown): AddMidjourneyJobResult {
  if (typeof inputPayload !== "string") {
    return {
      ok: false,
      error: "Job ID Midjourney invalide."
    };
  }

  const validation = validateMidjourneyInput(inputPayload);

  if (!validation.ok) {
    return {
      ok: false,
      error: validation.error
    };
  }

  try {
    const result = createOrReuseMidjourneyJob(validation.jobId);

    return {
      ok: true,
      jobId: validation.jobId,
      createdCount: result.createdCount,
      existingCount: result.existingCount,
      imageIds: result.imageIds,
      images: result.images
    };
  } catch (error) {
    setDatabaseError(error);

    return {
      ok: false,
      error: error instanceof Error ? error.message : "Impossible d'ajouter le job Midjourney."
    };
  }
}

function addMidjourneyJobsBatch(inputPayload: unknown): AddMidjourneyJobsBatchResult {
  if (typeof inputPayload !== "string") {
    return {
      ok: false,
      error: "Liste Midjourney invalide."
    };
  }

  const jobsById = new Map<string, string>();
  const invalidLines: MidjourneyInvalidLine[] = [];

  inputPayload.split(/\r?\n/).forEach((line) => {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      return;
    }

    const validation = validateMidjourneyInput(trimmedLine);

    if (!validation.ok) {
      invalidLines.push({
        line: trimmedLine,
        reason: validation.error
      });
      return;
    }

    if (!jobsById.has(validation.jobId)) {
      jobsById.set(validation.jobId, trimmedLine);
    }
  });

  if (jobsById.size === 0 && invalidLines.length === 0) {
    return {
      ok: false,
      error: "Aucun job Midjourney a importer."
    };
  }

  const jobs: MidjourneyBatchJobResult[] = [];
  const images: ImageFile[] = [];
  let createdImageCount = 0;
  let existingImageCount = 0;

  try {
    jobsById.forEach((_sourceLine, jobId) => {
      const result = createOrReuseMidjourneyJob(jobId);

      jobs.push({
        jobId: result.jobId,
        createdCount: result.createdCount,
        existingCount: result.existingCount,
        imageIds: result.imageIds
      });
      images.push(...result.images);
      createdImageCount += result.createdCount;
      existingImageCount += result.existingCount;
    });

    return {
      ok: true,
      detectedJobCount: jobs.length,
      createdImageCount,
      existingImageCount,
      invalidLineCount: invalidLines.length,
      jobs,
      invalidLines,
      images
    };
  } catch (error) {
    setDatabaseError(error);

    return {
      ok: false,
      error: error instanceof Error ? error.message : "Impossible d'importer les jobs Midjourney."
    };
  }
}

function importMidjourneyObservationsJson(contents: string): MidjourneyObservationsImportResult {
  const parsed = JSON.parse(contents) as { jobs?: unknown };
  if (!parsed || !Array.isArray(parsed.jobs)) {
    throw new Error("Structure JSON Midjourney invalide : tableau jobs absent.");
  }

  const imageJobIds = new Set<string>();
  const videoJobIds = new Set<string>();
  let ignoredCount = 0;

  parsed.jobs.forEach((candidate) => {
    if (!candidate || typeof candidate !== "object") {
      ignoredCount += 1;
      return;
    }
    const job = candidate as { jobId?: unknown; cdnUrls?: unknown; observedKinds?: unknown };
    const jobId = typeof job.jobId === "string" ? job.jobId.trim().toLowerCase() : "";
    if (!MIDJOURNEY_JOB_ID_PATTERN.test(jobId)) {
      ignoredCount += 1;
      return;
    }

    const cdnUrls = Array.isArray(job.cdnUrls) ? job.cdnUrls : [];
    const observedKinds = Array.isArray(job.observedKinds) ? job.observedKinds : [];
    const videoSlots = new Set<string>();
    const hasVideoObservation = MIDJOURNEY_UNMARKED_VIDEO_JOB_IDS.has(jobId) || observedKinds.includes("video") || cdnUrls.some((entry) => (entry as { kind?: unknown } | null)?.kind === "video");
    let hasUnexpectedCdnEntry = false;

    cdnUrls.forEach((entry) => {
      const cdn = entry as { url?: unknown; kind?: unknown; extension?: unknown } | null;
      if (cdn?.kind !== "video" || cdn.extension !== "mp4" || typeof cdn.url !== "string") {
        hasUnexpectedCdnEntry = true;
        return;
      }
      const validation = validateMidjourneyVideoUrl(cdn.url);
      if (!validation.ok) {
        hasUnexpectedCdnEntry = true;
        return;
      }
      const match = /^https:\/\/cdn\.midjourney\.com\/video\/([0-9a-f-]{36})\/([0-3])\.mp4$/i.exec(validation.normalizedUrl);
      if (!match || match[1].toLowerCase() !== jobId) {
        hasUnexpectedCdnEntry = true;
        return;
      }
      videoSlots.add(match[2]);
    });

    if (hasVideoObservation) {
      if (!MIDJOURNEY_UNMARKED_VIDEO_JOB_IDS.has(jobId) && (hasUnexpectedCdnEntry || videoSlots.size !== MIDJOURNEY_VIDEO_SLOTS.length)) {
        ignoredCount += 1;
        return;
      }
      imageJobIds.delete(jobId);
      videoJobIds.add(jobId);
      return;
    }

    if (cdnUrls.length > 0 || hasUnexpectedCdnEntry) {
      ignoredCount += 1;
      return;
    }
    if (!videoJobIds.has(jobId)) imageJobIds.add(jobId);
  });

  let createdImageCount = 0;
  let existingImageCount = 0;
  let repairedImageCount = 0;
  imageJobIds.forEach((jobId) => {
    const result = createOrReuseMidjourneyJob(jobId);
    createdImageCount += result.createdCount;
    existingImageCount += result.existingCount;
  });
  videoJobIds.forEach((jobId) => {
    repairedImageCount += repairIncorrectImageSlotsForMidjourneyVideoJob(jobId);
    const result = createOrReuseMidjourneyVideoJob(jobId);
    createdImageCount += result.createdCount;
    existingImageCount += result.existingCount;
  });

  return {
    jobsRead: parsed.jobs.length,
    imageJobCount: imageJobIds.size,
    videoJobCount: videoJobIds.size,
    createdImageCount,
    existingImageCount,
    ignoredCount,
    repairedImageCount,
    skippedRepairCount: 0
  };
}

function toCollectionSummaryFromRow(columns: string[], row: SqlValue[]): CollectionSummary | null {
  const columnIndex = (columnName: string): number => columns.indexOf(columnName);
  const id = row[columnIndex("id")];

  if (!isPositiveInteger(id)) {
    return null;
  }

  return {
    id,
    name: String(row[columnIndex("name")] ?? ""),
    description:
      typeof row[columnIndex("description")] === "string"
        ? String(row[columnIndex("description")])
        : null,
    imageCount:
      typeof row[columnIndex("image_count")] === "number"
        ? Number(row[columnIndex("image_count")])
        : 0
  };
}

function listCollections(): CollectionListResult {
  const database = getSqliteDatabase();

  if (!database) {
    return {
      ok: false,
      error: "Base SQLite non disponible."
    };
  }

  try {
    const result = database.exec(
      `SELECT
         collections.id,
         collections.name,
         collections.description,
         COUNT(collection_images.image_id) AS image_count
       FROM collections
       LEFT JOIN collection_images ON collection_images.collection_id = collections.id
       GROUP BY collections.id
       ORDER BY collections.name COLLATE NOCASE`
    )[0];

    return {
      ok: true,
      collections: result
        ? result.values
            .map((row) => toCollectionSummaryFromRow(result.columns, row))
            .filter((collection): collection is CollectionSummary => collection !== null)
        : []
    };
  } catch (error) {
    setDatabaseError(error);

    return {
      ok: false,
      error: "Impossible de lister les collections."
    };
  }
}

function getCollectionSummaryById(collectionId: number): CollectionSummary | null {
  const database = getSqliteDatabase();

  if (!database || !isPositiveInteger(collectionId)) {
    return null;
  }

  const result = database.exec(
    `SELECT
       collections.id,
       collections.name,
       collections.description,
       COUNT(collection_images.image_id) AS image_count
     FROM collections
     LEFT JOIN collection_images ON collection_images.collection_id = collections.id
     WHERE collections.id = ?
     GROUP BY collections.id`,
    [collectionId]
  )[0];

  if (!result || result.values.length === 0) {
    return null;
  }

  return toCollectionSummaryFromRow(result.columns, result.values[0]);
}

function createCollection(inputPayload: unknown): CreateCollectionResult {
  const database = getSqliteDatabase();
  const input = inputPayload as { name?: unknown; description?: unknown } | null;
  const name = typeof input?.name === "string" ? input.name.trim().replace(/\s+/g, " ") : "";
  const description =
    typeof input?.description === "string" && input.description.trim()
      ? input.description.trim()
      : null;

  if (!database) {
    return {
      ok: false,
      error: "Base SQLite non disponible."
    };
  }

  if (!name) {
    return {
      ok: false,
      error: "Le nom de collection est obligatoire."
    };
  }

  try {
    const now = getNowIsoString();

    database.run(
      "INSERT INTO collections (name, description, created_at, updated_at) VALUES (?, ?, ?, ?)",
      [name, description, now, now]
    );
    const collectionId = getNumberFromQuery("SELECT last_insert_rowid() AS id", [], "id");
    const collection = collectionId ? getCollectionSummaryById(collectionId) : null;

    persistDatabaseFile();

    if (!collection) {
      return {
        ok: false,
        error: "Collection creee mais impossible a relire."
      };
    }

    return {
      ok: true,
      collection
    };
  } catch (error) {
    setDatabaseError(error);

    return {
      ok: false,
      error: error instanceof Error && error.message.includes("UNIQUE")
        ? "Une collection avec ce nom existe deja."
        : "Impossible de creer la collection."
    };
  }
}

function normalizeCollectionName(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function collectionNameExistsForAnotherId(name: string, collectionId: number): boolean {
  const existingCollectionId = getNumberFromQuery(
    "SELECT id FROM collections WHERE lower(name) = lower(?) AND id != ? LIMIT 1",
    [name, collectionId],
    "id"
  );

  return existingCollectionId !== null;
}

function renameCollection(inputPayload: unknown): CollectionMutationResult {
  const database = getSqliteDatabase();
  const input = inputPayload as { collectionId?: unknown; name?: unknown } | null;
  const collectionId = input?.collectionId;
  const name = normalizeCollectionName(input?.name);

  if (!database || !isPositiveInteger(collectionId) || !getCollectionSummaryById(collectionId)) {
    return {
      ok: false,
      error: "Collection introuvable."
    };
  }

  if (!name) {
    return {
      ok: false,
      error: "Le nom de collection ne peut pas etre vide."
    };
  }

  if (collectionNameExistsForAnotherId(name, collectionId)) {
    return {
      ok: false,
      error: "Une collection porte deja ce nom."
    };
  }

  try {
    database.run(
      "UPDATE collections SET name = ?, updated_at = ? WHERE id = ?",
      [name, getNowIsoString(), collectionId]
    );
    const collection = getCollectionSummaryById(collectionId);

    persistDatabaseFile();

    if (!collection) {
      return {
        ok: false,
        error: "Collection renommee mais impossible a relire."
      };
    }

    return {
      ok: true,
      collection
    };
  } catch (error) {
    setDatabaseError(error);

    return {
      ok: false,
      error: error instanceof Error && error.message.includes("UNIQUE")
        ? "Une collection porte deja ce nom."
        : "Impossible de renommer la collection."
    };
  }
}

function deleteCollection(inputPayload: unknown): CollectionMutationResult {
  const database = getSqliteDatabase();
  const input = inputPayload as { collectionId?: unknown } | null;
  const collectionId = input?.collectionId;

  if (!database || !isPositiveInteger(collectionId) || !getCollectionSummaryById(collectionId)) {
    return {
      ok: false,
      error: "Collection introuvable."
    };
  }

  try {
    database.run("BEGIN TRANSACTION");
    database.run("DELETE FROM collection_images WHERE collection_id = ?", [collectionId]);
    database.run("DELETE FROM collections WHERE id = ?", [collectionId]);
    database.run("COMMIT");
    persistDatabaseFile();

    return {
      ok: true,
      deletedCollectionId: collectionId
    };
  } catch (error) {
    try {
      database.run("ROLLBACK");
    } catch {
      // Ignore rollback errors; the original error is more useful.
    }

    setDatabaseError(error);

    return {
      ok: false,
      error: "Impossible de supprimer la collection."
    };
  }
}

function normalizeImageIdsPayload(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(value.filter(isPositiveInteger)));
}

function addImagesToCollection(inputPayload: unknown): CollectionMutationResult {
  const database = getSqliteDatabase();
  const input = inputPayload as { collectionId?: unknown; imageIds?: unknown } | null;
  const collectionId = input?.collectionId;
  const imageIds = normalizeImageIdsPayload(input?.imageIds);

  if (!database) {
    return {
      ok: false,
      error: "Base SQLite non disponible."
    };
  }

  if (!isPositiveInteger(collectionId) || !getCollectionSummaryById(collectionId)) {
    return {
      ok: false,
      error: "Collection introuvable."
    };
  }

  if (imageIds.length === 0) {
    return {
      ok: false,
      error: "Aucune image selectionnee."
    };
  }

  try {
    const now = getNowIsoString();
    let addedCount = 0;
    let alreadyPresentCount = 0;

    imageIds.forEach((imageId) => {
      if (!getImageSourceKindById(imageId)) {
        return;
      }

      const alreadyPresent = getNumberFromQuery(
        "SELECT 1 AS present FROM collection_images WHERE collection_id = ? AND image_id = ?",
        [collectionId, imageId],
        "present"
      ) !== null;

      if (alreadyPresent) {
        alreadyPresentCount += 1;
        return;
      }

      database.run(
        "INSERT INTO collection_images (collection_id, image_id, added_at, sort_order) VALUES (?, ?, ?, NULL)",
        [collectionId, imageId, now]
      );
      addedCount += 1;
    });
    persistDatabaseFile();

    return {
      ok: true,
      addedCount,
      alreadyPresentCount
    };
  } catch (error) {
    setDatabaseError(error);

    return {
      ok: false,
      error: "Impossible d'ajouter la selection a la collection."
    };
  }
}

function listCollectionImages(collectionIdPayload: unknown): ImageScanResult {
  const database = getSqliteDatabase();

  if (!database || !isPositiveInteger(collectionIdPayload)) {
    return {
      ok: false,
      error: "Collection introuvable."
    };
  }

  if (!getCollectionSummaryById(collectionIdPayload)) {
    return {
      ok: false,
      error: "Collection introuvable."
    };
  }

  try {
    const result = database.exec(
      `SELECT image_id
       FROM collection_images
       WHERE collection_id = ?
       ORDER BY COALESCE(sort_order, 999999999), added_at DESC, image_id DESC`,
      [collectionIdPayload]
    )[0];

    return {
      ok: true,
      images: result
        ? result.values
            .map((row) => (isPositiveInteger(row[0]) ? getImageFileById(row[0]) : null))
            .filter((image): image is ImageFile => image !== null)
        : []
    };
  } catch (error) {
    setDatabaseError(error);

    return {
      ok: false,
      error: "Impossible de lire la collection."
    };
  }
}

function removeImagesFromCollection(inputPayload: unknown): CollectionMutationResult {
  const database = getSqliteDatabase();
  const input = inputPayload as { collectionId?: unknown; imageIds?: unknown } | null;
  const collectionId = input?.collectionId;
  const imageIds = normalizeImageIdsPayload(input?.imageIds);

  if (!database || !isPositiveInteger(collectionId) || !getCollectionSummaryById(collectionId)) {
    return {
      ok: false,
      error: "Collection introuvable."
    };
  }

  if (imageIds.length === 0) {
    return {
      ok: false,
      error: "Aucune image selectionnee."
    };
  }

  try {
    let removedCount = 0;

    imageIds.forEach((imageId) => {
      const wasPresent = getNumberFromQuery(
        "SELECT 1 AS present FROM collection_images WHERE collection_id = ? AND image_id = ?",
        [collectionId, imageId],
        "present"
      ) !== null;

      if (!wasPresent) {
        return;
      }

      database.run(
        "DELETE FROM collection_images WHERE collection_id = ? AND image_id = ?",
        [collectionId, imageId]
      );
      removedCount += 1;
    });
    persistDatabaseFile();

    return {
      ok: true,
      removedCount
    };
  } catch (error) {
    setDatabaseError(error);

    return {
      ok: false,
      error: "Impossible de retirer la selection de la collection."
    };
  }
}

function deleteRemoteImageRecordForDev(imageId: number): void {
  const database = getSqliteDatabase();

  if (!database || !isPositiveInteger(imageId)) {
    return;
  }

  const result = removeRemoteImagesFromCatalog(database, [imageId]);

  if (!result.ok) {
    throw new Error(result.error);
  }

  persistDatabaseFile();
}

function removeRemoteImageReferences(inputPayload: unknown): RemoveRemoteImagesFromCatalogResult {
  const database = getSqliteDatabase();

  if (!database) {
    return { ok: false, error: "Base SQLite non disponible." };
  }

  const imageIds = (inputPayload as { imageIds?: unknown } | null)?.imageIds;
  const thumbnailKeys = new Set(
    normalizeImageIdsPayload(imageIds)
      .map((imageId) => getRemoteImageRecordById(imageId))
      .map((remoteRecord) => (remoteRecord ? getVideoThumbnailKeyForRemoteRecord(remoteRecord) : null))
      .filter((thumbnailKey): thumbnailKey is string => thumbnailKey !== null)
  );
  const result = removeRemoteImagesFromCatalog(database, imageIds);

  if (result.ok) {
    persistDatabaseFile();
    thumbnailKeys.forEach((thumbnailKey) => {
      const remainingThumbnailReferences = getNumberFromQuery(
        "SELECT COUNT(*) AS count FROM remote_images WHERE video_thumbnail_key = ?",
        [thumbnailKey],
        "count"
      );
      if (remainingThumbnailReferences === 0) {
        try {
          unlinkSync(getVideoThumbnailCachePath(thumbnailKey));
        } catch {
          // The catalog removal remains successful; an orphaned cache file is harmless.
        }
      }
    });
  }

  return result;
}

function copyMidjourneyJobId(inputPayload: unknown): CopyMidjourneyJobIdResult {
  const imageId = (inputPayload as { imageId?: unknown } | null)?.imageId;
  if (!isPositiveInteger(imageId)) return { ok: false, error: "Référence Midjourney invalide." };
  const remoteRecord = getRemoteImageRecordById(imageId);
  if (!remoteRecord || remoteRecord.provider !== MIDJOURNEY_PROVIDER || !remoteRecord.providerGroupId || !MIDJOURNEY_JOB_ID_PATTERN.test(remoteRecord.providerGroupId)) {
    return { ok: false, error: "Job ID Midjourney indisponible." };
  }
  clipboard.writeText(remoteRecord.providerGroupId.toLowerCase());
  return { ok: true };
}

async function downloadMidjourneyImage(inputPayload: unknown): Promise<DownloadMidjourneyImageResult> {
  const imageId = (inputPayload as { imageId?: unknown } | null)?.imageId;
  const remoteImageId = isPositiveInteger(imageId) ? imageId : null;
  const remoteRecord = remoteImageId !== null ? getRemoteImageRecordById(remoteImageId) : null;
  if (!remoteRecord || remoteRecord.provider !== MIDJOURNEY_PROVIDER || remoteRecord.mediaKind !== "image" || !remoteRecord.providerGroupId || !remoteRecord.remoteSlot) {
    return { ok: false, error: "Cette entrée n'est pas une image Midjourney téléchargeable." };
  }
  const key = getMidjourneyLocalImageKey(remoteRecord.providerGroupId, remoteRecord.remoteSlot);
  const validation = validateMidjourneyInput(remoteRecord.remoteUrl);
  if (
    !key ||
    !validation.ok ||
    validation.jobId !== remoteRecord.providerGroupId.toLowerCase() ||
    validation.detectedSlot !== remoteRecord.remoteSlot
  ) {
    return { ok: false, error: "Référence Midjourney invalide." };
  }
  const targetPath = resolveMidjourneyLocalImagePath(getMidjourneyLocalImagesDirectory(), key);
  if (!targetPath) return { ok: false, error: "Chemin local Midjourney invalide." };
  let temporaryPath: string | null = null;
  try {
    const response = await net.fetch(remoteRecord.remoteUrl, { cache: "no-store", headers: { Accept: "image/png,image/*;q=0.8" } });
    const contentType = response.headers.get("content-type")?.split(";")[0]?.toLowerCase() ?? "";
    if (!response.ok || contentType !== "image/png") throw new Error("Image PNG Midjourney indisponible.");
    mkdirSync(path.dirname(targetPath), { recursive: true });
    temporaryPath = `${targetPath}.${randomUUID()}.tmp`;
    writeFileSync(temporaryPath, Buffer.from(await response.arrayBuffer()));
    renameSync(temporaryPath, targetPath);
    temporaryPath = null;
    runSql("UPDATE remote_images SET local_copy_status = 'downloaded', local_copy_key = ?, updated_at = ? WHERE image_id = ?", [key, getNowIsoString(), remoteImageId]);
    return { ok: true };
  } catch (error) {
    if (temporaryPath && existsSync(temporaryPath)) {
      try {
        unlinkSync(temporaryPath);
      } catch {
        // A leftover temporary file does not alter the catalog or the target PNG.
      }
    }
    if (remoteImageId !== null) runSql("UPDATE remote_images SET local_copy_status = 'failed', updated_at = ? WHERE image_id = ?", [getNowIsoString(), remoteImageId]);
    return { ok: false, error: error instanceof Error ? error.message : "Téléchargement Midjourney impossible." };
  }
}

function getImageTableCounts(imageId: number): { images: number; remoteImages: number; localImages: number } {
  const database = getSqliteDatabase();

  if (!database) {
    return {
      images: 0,
      remoteImages: 0,
      localImages: 0
    };
  }

  const result = database.exec(
    `SELECT
       (SELECT COUNT(*) FROM images WHERE id = ?) AS images_count,
       (SELECT COUNT(*) FROM remote_images WHERE image_id = ?) AS remote_images_count,
       (SELECT COUNT(*) FROM local_images WHERE image_id = ?) AS local_images_count`,
    [imageId, imageId, imageId]
  )[0];

  if (!result || result.values.length === 0) {
    return {
      images: 0,
      remoteImages: 0,
      localImages: 0
    };
  }

  const row = result.values[0];
  const valueAt = (columnName: string): number => {
    const columnIndex = result.columns.indexOf(columnName);
    const value = columnIndex >= 0 ? row[columnIndex] : 0;

    return typeof value === "number" ? value : 0;
  };

  return {
    images: valueAt("images_count"),
    remoteImages: valueAt("remote_images_count"),
    localImages: valueAt("local_images_count")
  };
}

function runRemoteImageSelfTest(): boolean {
  if (process.env.ICONOTHEQUE_REMOTE_SELFTEST !== "1") {
    return false;
  }

  const testUrl = "https://example.com/iconotheque-remote-test.png";
  let imageId: number | null = null;

  try {
    imageId = createRemoteImageRecord({
      remoteUrl: testUrl
    });

    const createdRecord = getRemoteImageRecordById(imageId);
    const createdCounts = getImageTableCounts(imageId);

    if (!createdRecord || createdRecord.remoteUrl !== testUrl) {
      throw new Error("Relecture de l'image distante de test impossible.");
    }

    if (createdCounts.images !== 1 || createdCounts.remoteImages !== 1 || createdCounts.localImages !== 0) {
      throw new Error("Etat SQL inattendu apres creation distante de test.");
    }

    deleteRemoteImageRecordForDev(imageId);
    const deletedCounts = getImageTableCounts(imageId);

    if (deletedCounts.images !== 0 || deletedCounts.remoteImages !== 0 || deletedCounts.localImages !== 0) {
      throw new Error("Nettoyage SQL distant incomplet apres auto-test.");
    }

    console.log(
      `[Iconotheque] Remote self-test OK: imageId=${imageId}, created=${JSON.stringify(
        createdCounts
      )}, deleted=${JSON.stringify(deletedCounts)}`
    );
    return true;
  } catch (error) {
    if (imageId !== null) {
      try {
        deleteRemoteImageRecordForDev(imageId);
      } catch {
        // Ignore cleanup errors here; the self-test error below is more useful.
      }
    }

    console.error(
      `[Iconotheque] Remote self-test failed: ${
        error instanceof Error ? error.message : "erreur inconnue"
      }`
    );
    return true;
  }
}

function readImageUserMetadata(imagePayload: unknown): ImageUserMetadataResult {
  const resolvedImage = resolveImageIdentity(imagePayload);

  if (resolvedImage.error) {
    return {
      ok: false,
      error: resolvedImage.error
    };
  }

  if (resolvedImage.imageId === null) {
    return {
      ok: false,
      error: "Image non indexee dans la base locale."
    };
  }

  const metadata = {
    ...createEmptyImageUserMetadata(),
    ...getImageUserMetadataRows(resolvedImage.imageId),
    terms: getImageTerms(resolvedImage.imageId)
  };

  return {
    ok: true,
    metadata
  };
}

function saveImageUserMetadata(
  imagePayload: unknown,
  metadataPayload: unknown
): SaveImageUserMetadataResult {
  const database = getSqliteDatabase();

  if (!database) {
    return {
      ok: false,
      error: "Base SQLite non disponible."
    };
  }

  const resolvedImage = resolveImageIdentity(imagePayload);

  if (resolvedImage.error) {
    return {
      ok: false,
      error: resolvedImage.error
    };
  }

  if (resolvedImage.imageId === null) {
    return {
      ok: false,
      error: "Image non indexee dans la base locale."
    };
  }

  const metadata = sanitizeImageUserMetadata(metadataPayload);
  const now = getNowIsoString();

  try {
    database.run("BEGIN TRANSACTION");
    database.run(
      `INSERT INTO image_user_meta (
         image_id,
         description,
         is_favorite,
         rating,
         reference_date,
         source,
         generation_tool,
         prompt_text,
         color_mode,
         workflow_color,
         status,
         created_at,
         updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(image_id) DO UPDATE SET
         description = excluded.description,
         is_favorite = excluded.is_favorite,
         rating = excluded.rating,
         reference_date = excluded.reference_date,
         source = excluded.source,
         generation_tool = excluded.generation_tool,
         prompt_text = excluded.prompt_text,
         color_mode = excluded.color_mode,
         workflow_color = excluded.workflow_color,
         status = excluded.status,
        updated_at = excluded.updated_at`,
      [
        resolvedImage.imageId,
        metadata.description,
        metadata.isFavorite ? 1 : 0,
        metadata.rating,
        metadata.referenceDate || null,
        metadata.source,
        metadata.generationTool,
        metadata.promptText,
        metadata.colorMode,
        metadata.workflowColor,
        metadata.status,
        now,
        now
      ]
    );

    TERM_KINDS.forEach((kind) => {
      database.run(
        `DELETE FROM image_terms
         WHERE image_id = ?
           AND term_id IN (SELECT id FROM terms WHERE kind = ?)`,
        [resolvedImage.imageId, kind]
      );

      metadata.terms[kind].forEach((label) => {
        const termId = addOrGetTerm(kind, label, now);

        if (termId === null) {
          return;
        }

        database.run(
          `INSERT OR IGNORE INTO image_terms (image_id, term_id, created_at)
           VALUES (?, ?, ?)`,
          [resolvedImage.imageId, termId, now]
        );
      });
    });

    database.run("COMMIT");
    persistDatabaseFile();

    return {
      ok: true
    };
  } catch (error) {
    try {
      database.run("ROLLBACK");
    } catch {
      // Ignore rollback errors; the original SQLite error is more useful.
    }

    setDatabaseError(error);

    return {
      ok: false,
      error: error instanceof Error ? error.message : "Impossible d'enregistrer les metadonnees."
    };
  }
}

function ensureImageUserMetadataRow(imageId: number, now: string): void {
  const database = getSqliteDatabase();

  if (!database) {
    return;
  }

  database.run(
    `INSERT OR IGNORE INTO image_user_meta (
       image_id,
       description,
       is_favorite,
       rating,
       reference_date,
       source,
       generation_tool,
       prompt_text,
       color_mode,
       workflow_color,
       status,
       created_at,
       updated_at
     )
     VALUES (?, '', 0, NULL, NULL, '', '', '', 'unknown', 'none', '', ?, ?)`,
    [imageId, now, now]
  );
}

function applyBatchFieldUpdates(
  imageId: number,
  patch: BatchImageUserMetadataPatch,
  now: string
): void {
  const database = getSqliteDatabase();

  if (!database) {
    return;
  }

  const assignments: string[] = [];
  const params: SqlValue[] = [];

  if (patch.isFavorite.action === "set") {
    assignments.push("is_favorite = ?");
    params.push(patch.isFavorite.value ? 1 : 0);
  } else if (patch.isFavorite.action === "clear") {
    assignments.push("is_favorite = ?");
    params.push(0);
  }

  if (patch.rating.action === "set") {
    assignments.push("rating = ?");
    params.push(patch.rating.value);
  } else if (patch.rating.action === "clear") {
    assignments.push("rating = NULL");
  }

  if (patch.status.action === "set") {
    assignments.push("status = ?");
    params.push(patch.status.value);
  }

  if (patch.workflowColor.action === "set") {
    assignments.push("workflow_color = ?");
    params.push(patch.workflowColor.value);
  } else if (patch.workflowColor.action === "clear") {
    assignments.push("workflow_color = ?");
    params.push("none");
  }

  if (patch.colorMode.action === "set") {
    assignments.push("color_mode = ?");
    params.push(patch.colorMode.value);
  }

  if (patch.source.action === "set") {
    assignments.push("source = ?");
    params.push(patch.source.value);
  }

  if (patch.generationTool.action === "set") {
    assignments.push("generation_tool = ?");
    params.push(patch.generationTool.value);
  }

  if (patch.referenceDate.action === "set") {
    assignments.push("reference_date = ?");
    params.push(patch.referenceDate.value || null);
  } else if (patch.referenceDate.action === "clear") {
    assignments.push("reference_date = NULL");
  }

  if (assignments.length === 0) {
    return;
  }

  assignments.push("updated_at = ?");
  params.push(now, imageId);
  database.run(
    `UPDATE image_user_meta
     SET ${assignments.join(", ")}
     WHERE image_id = ?`,
    params
  );
}

function applyBatchTermUpdates(
  imageId: number,
  patch: BatchImageUserMetadataPatch,
  now: string
): void {
  const database = getSqliteDatabase();

  if (!database) {
    return;
  }

  TERM_KINDS.forEach((kind) => {
    patch.terms[kind].add.forEach((label) => {
      const termId = addOrGetTerm(kind, label, now);

      if (termId === null) {
        return;
      }

      database.run(
        `INSERT OR IGNORE INTO image_terms (image_id, term_id, created_at)
         VALUES (?, ?, ?)`,
        [imageId, termId, now]
      );
    });

    patch.terms[kind].remove.forEach((label) => {
      const normalizedLabel = normalizeTermLabel(label);

      if (!normalizedLabel) {
        return;
      }

      database.run(
        `DELETE FROM image_terms
         WHERE image_id = ?
           AND term_id IN (
             SELECT id
             FROM terms
             WHERE kind = ?
               AND normalized_label = ?
           )`,
        [imageId, kind, normalizedLabel]
      );
    });
  });
}

function getBatchWorkflowColor(patch: BatchImageUserMetadataPatch): WorkflowColor | null {
  if (patch.workflowColor.action === "set") {
    return patch.workflowColor.value;
  }

  if (patch.workflowColor.action === "clear") {
    return "none";
  }

  return null;
}

function batchUpdateImageUserMetadata(
  imageReferencesPayload: unknown,
  patchPayload: unknown
): BatchUpdateImageUserMetadataResult {
  const database = getSqliteDatabase();

  if (!database) {
    return {
      ok: false,
      error: "Base SQLite non disponible."
    };
  }

  if (!Array.isArray(imageReferencesPayload)) {
    return {
      ok: false,
      error: "Lot d'images invalide."
    };
  }

  const imageIds = [
    ...new Set(
      imageReferencesPayload
        .map((imageReference) => resolveImageIdentity(imageReference).imageId)
        .filter((imageId): imageId is number => imageId !== null)
    )
  ];

  if (imageIds.length < 2) {
    return {
      ok: false,
      error: "Selectionnez au moins deux images pour modifier par lot."
    };
  }

  const patch = sanitizeBatchImageUserMetadataPatch(patchPayload);
  const now = getNowIsoString();

  try {
    database.run("BEGIN TRANSACTION");

    imageIds.forEach((imageId) => {
      ensureImageUserMetadataRow(imageId, now);
      applyBatchFieldUpdates(imageId, patch, now);
      applyBatchTermUpdates(imageId, patch, now);
    });

    database.run("COMMIT");
    persistDatabaseFile();

    return {
      ok: true,
      updatedCount: imageIds.length,
      workflowColor: getBatchWorkflowColor(patch)
    };
  } catch (error) {
    try {
      database.run("ROLLBACK");
    } catch {
      // Ignore rollback errors; the original SQLite error is more useful.
    }

    setDatabaseError(error);

    return {
      ok: false,
      error: error instanceof Error ? error.message : "Impossible d'enregistrer le lot."
    };
  }
}

function suggestTerms(kind: unknown, query: unknown): TermSuggestionResult {
  const database = getSqliteDatabase();

  if (!database) {
    return {
      ok: false,
      error: "Base SQLite non disponible."
    };
  }

  if (!isTermKind(kind)) {
    return {
      ok: false,
      error: "Type de terme non pris en charge."
    };
  }

  const normalizedQuery = normalizeTermLabel(typeof query === "string" ? query : "");

  try {
    const result = database.exec(
      `SELECT label
       FROM terms
       WHERE kind = ?
         AND normalized_label LIKE ?
       ORDER BY label
       LIMIT 8`,
      [kind, `%${normalizedQuery}%`]
    )[0];

    if (!result) {
      return {
        ok: true,
        labels: []
      };
    }

    const labelIndex = result.columns.indexOf("label");

    return {
      ok: true,
      labels: result.values
        .map((row) => row[labelIndex])
        .filter((label): label is string => typeof label === "string")
    };
  } catch (error) {
    setDatabaseError(error);

    return {
      ok: false,
      error: "Impossible de recuperer les suggestions."
    };
  }
}

function addTermFilters(
  conditions: string[],
  params: SqlValue[],
  kind: TermKind,
  labelsText: string
): void {
  splitCommaSeparatedValues(labelsText).forEach((label) => {
    conditions.push(
      `EXISTS (
         SELECT 1
         FROM image_terms
         INNER JOIN terms ON terms.id = image_terms.term_id
         WHERE image_terms.image_id = images.id
           AND terms.kind = ?
           AND terms.normalized_label LIKE ?
       )`
    );
    params.push(kind, `%${normalizeTermLabel(label)}%`);
  });
}

function getTextSearchCondition(): string {
  return `(
    li.file_name LIKE ?
    OR li.path LIKE ?
    OR li.extension LIKE ?
    OR COALESCE(image_user_meta.description, '') LIKE ?
    OR COALESCE(image_user_meta.prompt_text, '') LIKE ?
    OR COALESCE(image_user_meta.source, '') LIKE ?
    OR COALESCE(image_user_meta.generation_tool, '') LIKE ?
    OR COALESCE(image_user_meta.status, '') LIKE ?
    OR EXISTS (
      SELECT 1
      FROM image_terms
      INNER JOIN terms ON terms.id = image_terms.term_id
      WHERE image_terms.image_id = images.id
        AND terms.label LIKE ?
    )
  )`;
}

function searchAdvancedImages(criteriaPayload: unknown): AdvancedSearchResult {
  const database = getSqliteDatabase();

  if (!database) {
    return {
      ok: false,
      error: "Base SQLite non disponible."
    };
  }

  const authorizedRoots = [...selectedRootFolders].map(normalizeFolderPath);

  if (authorizedRoots.length === 0) {
    return {
      ok: true,
      images: []
    };
  }

  const criteria = sanitizeAdvancedSearchCriteria(criteriaPayload);
  const conditions: string[] = [];
  const params: SqlValue[] = [];
  const rootPlaceholders = authorizedRoots.map(() => "?").join(", ");

  conditions.push(`li.root_id IN (SELECT id FROM roots WHERE path IN (${rootPlaceholders}))`);
  conditions.push("images.source_kind = 'local'");
  params.push(...authorizedRoots);

  if (criteria.text) {
    const textValue = `%${criteria.text}%`;
    conditions.push(getTextSearchCondition());
    params.push(
      textValue,
      textValue,
      textValue,
      textValue,
      textValue,
      textValue,
      textValue,
      textValue,
      textValue
    );
  }

  if (criteria.favoriteOnly) {
    conditions.push("COALESCE(image_user_meta.is_favorite, 0) = 1");
  }

  if (criteria.minRating !== null) {
    conditions.push("image_user_meta.rating >= ?");
    params.push(criteria.minRating);
  }

  if (criteria.status) {
    conditions.push("image_user_meta.status = ?");
    params.push(criteria.status);
  }

  if (criteria.source) {
    conditions.push("image_user_meta.source LIKE ?");
    params.push(`%${criteria.source}%`);
  }

  if (criteria.colorMode) {
    conditions.push("image_user_meta.color_mode = ?");
    params.push(criteria.colorMode);
  }

  if (criteria.workflowColor) {
    conditions.push("COALESCE(image_user_meta.workflow_color, 'none') = ?");
    params.push(criteria.workflowColor);
  }

  if (criteria.referenceDateFrom) {
    conditions.push("image_user_meta.reference_date >= ?");
    params.push(criteria.referenceDateFrom);
  }

  if (criteria.referenceDateTo) {
    conditions.push("image_user_meta.reference_date <= ?");
    params.push(criteria.referenceDateTo);
  }

  addTermFilters(conditions, params, "tag", criteria.tags);
  addTermFilters(conditions, params, "person", criteria.people);
  addTermFilters(conditions, params, "place", criteria.places);
  addTermFilters(conditions, params, "collection", criteria.collections);
  addTermFilters(conditions, params, "project", criteria.projects);

  try {
    const result = database.exec(
      `SELECT
         images.id,
         li.file_name,
         li.path,
         li.extension,
         li.size_bytes,
         li.modified_at,
         images.source_kind,
         COALESCE(image_user_meta.workflow_color, 'none') AS workflow_color
       FROM images
       INNER JOIN local_images AS li ON li.image_id = images.id
       LEFT JOIN image_user_meta ON image_user_meta.image_id = images.id
       WHERE ${conditions.join(" AND ")}
       ORDER BY li.file_name COLLATE NOCASE
       LIMIT 500`,
      params
    )[0];

    if (!result) {
      return {
        ok: true,
        images: []
      };
    }

    const columnIndex = (columnName: string): number => result.columns.indexOf(columnName);
    const images = result.values
      .map((row): ImageFile | null => {
        const filePath = typeof row[columnIndex("path")] === "string"
          ? String(row[columnIndex("path")])
          : "";
        const extension = typeof row[columnIndex("extension")] === "string"
          ? String(row[columnIndex("extension")])
          : "";

        if (!filePath || !getAuthorizedRootForPath(filePath)) {
          return null;
        }

        const workflowColor = row[columnIndex("workflow_color")];
        const sourceKind = row[columnIndex("source_kind")];
        const name = String(row[columnIndex("file_name")] ?? path.basename(filePath));
        const previewUrl = createPreviewUrl(filePath, extension) ?? "";

        return {
          imageId:
            typeof row[columnIndex("id")] === "number"
              ? Number(row[columnIndex("id")])
              : getImageIdByPath(filePath) ?? 0,
          sourceKind: isImageSourceKind(sourceKind) ? sourceKind : "local",
          name,
          displayName: name,
          fileName: name,
          path: filePath,
          extension,
          sizeBytes:
            typeof row[columnIndex("size_bytes")] === "number"
              ? Number(row[columnIndex("size_bytes")])
              : null,
          modifiedAt:
            typeof row[columnIndex("modified_at")] === "string"
              ? String(row[columnIndex("modified_at")])
              : null,
          imageSrc: previewUrl,
          previewUrl,
          workflowColor: isWorkflowColor(workflowColor) ? workflowColor : "none"
        };
      })
      .filter((image): image is ImageFile => image !== null);

    return {
      ok: true,
      images
    };
  } catch (error) {
    setDatabaseError(error);

    return {
      ok: false,
      error: error instanceof Error ? error.message : "Recherche avancee impossible."
    };
  }
}

function getImageMimeType(extension: string): string | null {
  switch (extension) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    default:
      return null;
  }
}

function createPreviewUrl(filePath: string, extension: string): string | null {
  const mimeType = getImageMimeType(extension);

  if (!mimeType) {
    return null;
  }

  const imageId = randomUUID();
  imagePreviewRegistry.set(imageId, { filePath, mimeType });

  return `${IMAGE_PROTOCOL_SCHEME}://image/${imageId}`;
}

function logRemoteImageDebug(message: string): void {
  console.info(`[Iconotheque] remote image ${message}`);
}

function logRemoteImageWarning(message: string): void {
  console.warn(`[Iconotheque] remote image ${message}`);
}

async function fetchRemoteImageForProtocol(imageId: number, request?: Request): Promise<Response> {
  logRemoteImageDebug(`request imageId=${imageId}`);
  const remoteRecord = getRemoteImageRecordById(imageId);

  if (!remoteRecord || remoteRecord.sourceStatus !== "remote") {
    logRemoteImageWarning(`failed imageId=${imageId} reason=record-not-found`);
    return new Response("Remote image not found", { status: 404 });
  }

  logRemoteImageDebug(`url=${remoteRecord.remoteUrl}`);
  const validation = remoteRecord.mediaKind === "video"
    ? validateMidjourneyVideoUrl(remoteRecord.remoteUrl)
    : validateRemoteImageUrl(remoteRecord.remoteUrl);

  if (!validation.ok) {
    logRemoteImageWarning(`failed imageId=${imageId} reason=url-refused detail=${validation.error}`);
    return new Response("Remote image URL refused", { status: 400 });
  }

  const expectedMimeType = remoteRecord.mediaKind === "video" ? "video/mp4" : getImageMimeType(getRemoteExtension(validation.normalizedUrl));
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 10000);

  try {
    const range = request?.headers.get("range");
    const response = await net.fetch(validation.normalizedUrl, {
      signal: abortController.signal,
      cache: "no-store",
      redirect: "follow",
      headers: {
        "Accept": remoteRecord.mediaKind === "video" ? "video/mp4,video/*;q=0.8" : "image/avif,image/webp,image/png,image/jpeg,image/gif,image/*,*/*;q=0.8",
        ...(range ? { Range: range } : {}),
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Iconotheque/0.1.3 Safari/537.36"
      }
    });
    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";

    logRemoteImageDebug(
      `response imageId=${imageId} status=${response.status} content-type=${contentType || "unknown"}`
    );

    if (!response.ok) {
      logRemoteImageWarning(`failed imageId=${imageId} reason=http-status-${response.status}`);
      return new Response("Remote image unavailable", { status: 502 });
    }

    if (remoteRecord.mediaKind === "video" ? !contentType.startsWith("video/") : !contentType.startsWith("image/")) {
      logRemoteImageWarning(`failed imageId=${imageId} reason=invalid-content-type`);
      return new Response("Remote resource has an invalid media type", { status: 415 });
    }

    const data = Buffer.from(await response.arrayBuffer());

    return new Response(data, {
      status: response.status,
      headers: {
        "Content-Type": expectedMimeType ?? contentType,
        "Cache-Control": "no-store",
        "Accept-Ranges": response.headers.get("accept-ranges") ?? "bytes",
        ...(response.headers.get("content-range") ? { "Content-Range": response.headers.get("content-range")! } : {}),
        ...(response.headers.get("content-length") ? { "Content-Length": response.headers.get("content-length")! } : {}),
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (error) {
    logRemoteImageWarning(
      `failed imageId=${imageId} reason=${error instanceof Error ? error.message : "fetch-error"}`
    );
    return new Response("Remote image unavailable", { status: 502 });
  } finally {
    clearTimeout(timeoutId);
  }
}

function registerImageProtocol(): void {
  protocol.handle(IMAGE_PROTOCOL_SCHEME, async (request) => {
    const url = new URL(request.url);
    const imageId = url.pathname.replace(/^\/+/, "");

    if (url.hostname === "remote") {
      const remoteImageId = Number(imageId);

      if (!isPositiveInteger(remoteImageId)) {
        return new Response("Remote image id invalid", { status: 400 });
      }

      return fetchRemoteImageForProtocol(remoteImageId, request);
    }

    if (url.hostname === "thumbnail") {
      const remoteImageId = Number(imageId);
      const remoteRecord = isPositiveInteger(remoteImageId) ? getRemoteImageRecordById(remoteImageId) : null;
      const thumbnailKey = remoteRecord ? getVideoThumbnailKeyForRemoteRecord(remoteRecord) : null;
      if (
        !remoteRecord ||
        remoteRecord.provider !== MIDJOURNEY_PROVIDER ||
        remoteRecord.mediaKind !== "video" ||
        remoteRecord.videoThumbnailStatus !== "generated" ||
        thumbnailKey === null ||
        remoteRecord.videoThumbnailKey !== thumbnailKey
      ) {
        return new Response("Video thumbnail not found", { status: 404 });
      }

      try {
        const data = await readFile(getVideoThumbnailCachePath(thumbnailKey));
        return new Response(data, { headers: { "Content-Type": "image/png", "Cache-Control": "no-store" } });
      } catch {
        return new Response("Video thumbnail unavailable", { status: 404 });
      }
    }

    const imageRecord = imagePreviewRegistry.get(imageId);

    if (!imageRecord) {
      return new Response("Image not found", { status: 404 });
    }

    try {
      const data = await readFile(imageRecord.filePath);

      return new Response(data, {
        headers: {
          "Content-Type": imageRecord.mimeType,
          "Cache-Control": "no-store"
        }
      });
    } catch {
      return new Response("Image unavailable", { status: 404 });
    }
  });
}

function createMainWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 860,
    minHeight: 640,
    title: "Iconothèque",
    backgroundColor: "#f7f5ef",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (rendererDevUrl || shouldUseDevServer) {
    void mainWindow.loadURL(rendererDevUrl ?? defaultDevServerUrl);
  } else {
    void mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

async function selectRootFolder(parentWindow?: BrowserWindow): Promise<RootFolderSelection> {
  const options: OpenDialogOptions = {
    title: "Choisir un dossier racine",
    properties: ["openDirectory", "dontAddToRecent"]
  };
  const result = parentWindow
    ? await dialog.showOpenDialog(parentWindow, options)
    : await dialog.showOpenDialog(options);

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  const selectedPath = normalizeFolderPath(result.filePaths[0]);
  selectedRootFolders.add(selectedPath);
  upsertRoot(
    {
      path: selectedPath,
      name: path.basename(selectedPath) || selectedPath
    },
    getNowIsoString()
  );

  return {
    canceled: false,
    folder: {
      path: selectedPath,
      name: path.basename(selectedPath) || selectedPath
    }
  };
}

async function openRootFolderFromMenu(): Promise<void> {
  const targetWindow = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];

  if (!targetWindow || targetWindow.isDestroyed()) {
    return;
  }

  const selection = await selectRootFolder(targetWindow);

  if (!selection.canceled) {
    targetWindow.webContents.send(ROOT_FOLDER_SELECTED_FROM_MENU_CHANNEL, selection.folder);
  }
}

function requestRescanRootFolder(): void {
  const targetWindow = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];

  if (!targetWindow || targetWindow.isDestroyed()) {
    return;
  }

  targetWindow.webContents.send(RESCAN_ROOT_FOLDER_REQUEST_CHANNEL);
}

function requestThumbnailSize(thumbnailSize: ThumbnailSize): void {
  const targetWindow = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];

  if (!targetWindow || targetWindow.isDestroyed()) {
    return;
  }

  targetWindow.webContents.send(THUMBNAIL_SIZE_REQUEST_CHANNEL, thumbnailSize);
}

function requestAddRemoteImage(): void {
  const targetWindow = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];

  if (!targetWindow || targetWindow.isDestroyed()) {
    return;
  }

  targetWindow.webContents.send(ADD_REMOTE_IMAGE_REQUEST_CHANNEL);
}

function requestAddMidjourneyJob(): void {
  const targetWindow = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];

  if (!targetWindow || targetWindow.isDestroyed()) {
    return;
  }

  targetWindow.webContents.send(ADD_MIDJOURNEY_JOB_REQUEST_CHANNEL);
}

function requestAddMidjourneyVideoJob(): void {
  const targetWindow = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
  if (targetWindow && !targetWindow.isDestroyed()) targetWindow.webContents.send(ADD_MIDJOURNEY_VIDEO_JOB_REQUEST_CHANNEL);
}

function requestAddMidjourneyVideoJobsBatch(): void {
  const targetWindow = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
  if (targetWindow && !targetWindow.isDestroyed()) targetWindow.webContents.send(ADD_MIDJOURNEY_VIDEO_JOBS_BATCH_REQUEST_CHANNEL);
}

function requestAddMidjourneyJobsBatch(): void {
  const targetWindow = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];

  if (!targetWindow || targetWindow.isDestroyed()) {
    return;
  }

  targetWindow.webContents.send(ADD_MIDJOURNEY_JOBS_BATCH_REQUEST_CHANNEL);
}

async function importMidjourneyObservationsFromFile(): Promise<void> {
  const targetWindow = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
  const selection = await dialog.showOpenDialog(targetWindow, {
    title: "Importer observations Midjourney JSON",
    filters: [{ name: "JSON", extensions: ["json"] }],
    properties: ["openFile"]
  });
  if (selection.canceled || selection.filePaths.length === 0) return;

  try {
    const result = importMidjourneyObservationsJson(await readFile(selection.filePaths[0], "utf-8"));
    await dialog.showMessageBox(targetWindow, {
      type: "info",
      title: "Observations Midjourney importées",
      message: `${result.jobsRead} jobs lus : ${result.imageJobCount} image(s), ${result.videoJobCount} vidéo(s).`,
      detail: `${result.createdImageCount} référence(s) créée(s), ${result.existingImageCount} déjà présente(s), ${result.ignoredCount} entrée(s) ignorée(s), ${result.repairedImageCount} image(s) mal classée(s) retirée(s).`
    });
    if (targetWindow && !targetWindow.isDestroyed()) targetWindow.webContents.send(MIDJOURNEY_OBSERVATIONS_IMPORTED_CHANNEL);
  } catch (error) {
    await dialog.showMessageBox(targetWindow, {
      type: "error",
      title: "Import observations Midjourney impossible",
      message: error instanceof Error ? error.message : "Le fichier JSON n'a pas pu être importé."
    });
  }
}

function requestCreateCollection(): void {
  const targetWindow = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];

  if (!targetWindow || targetWindow.isDestroyed()) {
    return;
  }

  targetWindow.webContents.send(CREATE_COLLECTION_REQUEST_CHANNEL);
}

function requestAdvancedSearch(): void {
  const targetWindow = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];

  if (!targetWindow || targetWindow.isDestroyed()) {
    return;
  }

  targetWindow.webContents.send(ADVANCED_SEARCH_REQUEST_CHANNEL);
}

function requestBatchEdit(): void {
  const targetWindow = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];

  if (!targetWindow || targetWindow.isDestroyed()) {
    return;
  }

  targetWindow.webContents.send(BATCH_EDIT_REQUEST_CHANNEL);
}

function requestAddSelectionToCollection(): void {
  const targetWindow = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];

  if (!targetWindow || targetWindow.isDestroyed()) {
    return;
  }

  targetWindow.webContents.send(ADD_TO_COLLECTION_REQUEST_CHANNEL);
}

function requestRemoveSelectionFromCollection(): void {
  const targetWindow = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];

  if (!targetWindow || targetWindow.isDestroyed()) {
    return;
  }

  targetWindow.webContents.send(REMOVE_FROM_COLLECTION_REQUEST_CHANNEL);
}

function setBatchEditMenuAvailability(isAvailable: boolean): void {
  const applicationMenu = Menu.getApplicationMenu();
  const batchEditMenuItem = applicationMenu?.getMenuItemById(BATCH_EDIT_MENU_ITEM_ID);

  if (batchEditMenuItem) {
    batchEditMenuItem.enabled = isAvailable;
  }
}

function setCollectionMenuAvailability(canAddToCollection: boolean, canRemoveFromCollection: boolean): void {
  const applicationMenu = Menu.getApplicationMenu();
  const addMenuItem = applicationMenu?.getMenuItemById(ADD_TO_COLLECTION_MENU_ITEM_ID);
  const removeMenuItem = applicationMenu?.getMenuItemById(REMOVE_FROM_COLLECTION_MENU_ITEM_ID);

  if (addMenuItem) {
    addMenuItem.enabled = canAddToCollection;
  }

  if (removeMenuItem) {
    removeMenuItem.enabled = canRemoveFromCollection;
  }
}

function requestHelp(): void {
  const targetWindow = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];

  if (!targetWindow || targetWindow.isDestroyed()) {
    return;
  }

  targetWindow.webContents.send(HELP_REQUEST_CHANNEL);
}

function createApplicationMenu(): void {
  const editMenu: MenuItemConstructorOptions = {
    label: "Edition",
    submenu: [
      {
        id: BATCH_EDIT_MENU_ITEM_ID,
        label: "Modifier la selection par lot...",
        enabled: false,
        click: requestBatchEdit
      },
      {
        id: ADD_TO_COLLECTION_MENU_ITEM_ID,
        label: "Ajouter la selection a une collection...",
        accelerator: "CommandOrControl+Shift+C",
        enabled: false,
        click: requestAddSelectionToCollection
      },
      {
        id: REMOVE_FROM_COLLECTION_MENU_ITEM_ID,
        label: "Retirer la selection de la collection",
        enabled: false,
        click: requestRemoveSelectionFromCollection
      }
    ]
  };
  const fileMenu: MenuItemConstructorOptions = {
    label: "Fichier",
    submenu: [
      {
        label: "Ouvrir un dossier...",
        accelerator: "CommandOrControl+O",
        click: () => {
          void openRootFolderFromMenu();
        }
      },
      {
        label: "Rescanner le dossier",
        accelerator: "F5",
        click: requestRescanRootFolder
      },
      {
        label: "Nouvelle collection...",
        click: requestCreateCollection
      },
      {
        label: "Ajouter une image web...",
        click: requestAddRemoteImage
      },
      {
        label: "Ajouter un job Midjourney...",
        click: requestAddMidjourneyJob
      },
      {
        label: "Ajouter un job MJ video...",
        click: requestAddMidjourneyVideoJob
      },
      {
        label: "Ajouter plusieurs jobs MJ video...",
        click: requestAddMidjourneyVideoJobsBatch
      },
      {
        label: "Ajouter plusieurs jobs Midjourney...",
        click: requestAddMidjourneyJobsBatch
      },
      {
        label: "Importer observations Midjourney JSON...",
        click: () => { void importMidjourneyObservationsFromFile(); }
      },
      { type: "separator" },
      {
        label: "Quitter",
        role: "quit"
      }
    ]
  };
  const viewMenu: MenuItemConstructorOptions = {
    label: "Affichage",
    submenu: [
      {
        label: "Vignettes petites",
        accelerator: "CommandOrControl+1",
        click: () => requestThumbnailSize("small")
      },
      {
        label: "Vignettes moyennes",
        accelerator: "CommandOrControl+2",
        click: () => requestThumbnailSize("medium")
      },
      {
        label: "Vignettes grandes",
        accelerator: "CommandOrControl+3",
        click: () => requestThumbnailSize("large")
      }
    ]
  };
  const searchMenu: MenuItemConstructorOptions = {
    label: "Recherche",
    submenu: [
      {
        label: "Recherche avancee...",
        accelerator: "CommandOrControl+F",
        click: requestAdvancedSearch
      }
    ]
  };
  const helpMenu: MenuItemConstructorOptions = {
    label: "Aide",
    submenu: [
      {
        label: "Aide Iconotheque",
        accelerator: "F1",
        click: requestHelp
      }
    ]
  };
  const template: MenuItemConstructorOptions[] =
    process.platform === "darwin"
      ? [
          {
            label: app.name,
            submenu: [{ role: "about" }, { type: "separator" }, { role: "quit" }]
          },
          fileMenu,
          editMenu,
          viewMenu,
          searchMenu,
          helpMenu
        ]
      : [fileMenu, editMenu, viewMenu, searchMenu, helpMenu];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function buildFolderTreeNode(
  folderPath: string,
  depth: number,
  context: FolderTreeBuildContext
): Promise<FolderTreeNode> {
  const normalizedFolderPath = normalizeFolderPath(folderPath);
  const node: FolderTreeNode = {
    name: path.basename(normalizedFolderPath) || normalizedFolderPath,
    path: normalizedFolderPath,
    relativePath: getFolderRelativePath(context.rootPath, normalizedFolderPath),
    directImageCount: 0,
    subfolderCount: 0,
    children: [],
    error: null
  };

  if (context.visitedFolderCount >= MAX_FOLDER_TREE_NODES) {
    context.limitReached = true;
    node.error = "Limite de dossiers atteinte.";
    return node;
  }

  context.visitedFolderCount += 1;

  if (depth > MAX_FOLDER_TREE_DEPTH) {
    context.limitReached = true;
    node.error = "Limite de profondeur atteinte.";
    return node;
  }

  try {
    const entries = await readdir(normalizedFolderPath, { withFileTypes: true });
    const childDirectoryEntries = entries
      .filter(
        (entry) =>
          entry.isDirectory() &&
          !entry.isSymbolicLink() &&
          !IGNORED_FOLDER_NAMES.has(entry.name)
      )
      .sort((firstEntry, secondEntry) => firstEntry.name.localeCompare(secondEntry.name));

    node.directImageCount = entries.filter(
      (entry) =>
        entry.isFile() && SUPPORTED_IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
    ).length;
    node.subfolderCount = childDirectoryEntries.length;

    for (const entry of childDirectoryEntries) {
      if (context.visitedFolderCount >= MAX_FOLDER_TREE_NODES) {
        context.limitReached = true;
        break;
      }

      const childPath = path.join(normalizedFolderPath, entry.name);

      if (!isPathInsideRoot(childPath, context.rootPath)) {
        continue;
      }

      node.children.push(await buildFolderTreeNode(childPath, depth + 1, context));
    }
  } catch {
    node.error = "Dossier inaccessible.";
  }

  return node;
}

ipcMain.handle(SELECT_ROOT_FOLDER_CHANNEL, async (): Promise<RootFolderSelection> =>
  selectRootFolder()
);

ipcMain.handle(GET_DATABASE_STATUS_CHANNEL, async (): Promise<DatabaseStatus> => getDatabaseStatus());

ipcMain.handle(
  GET_IMAGE_USER_METADATA_CHANNEL,
  async (_event, image: unknown): Promise<ImageUserMetadataResult> =>
    readImageUserMetadata(image)
);

ipcMain.handle(
  SAVE_IMAGE_USER_METADATA_CHANNEL,
  async (_event, image: unknown, metadata: unknown): Promise<SaveImageUserMetadataResult> =>
    saveImageUserMetadata(image, metadata)
);

ipcMain.handle(
  BATCH_UPDATE_IMAGE_USER_METADATA_CHANNEL,
  async (
    _event,
    images: unknown,
    patch: unknown
  ): Promise<BatchUpdateImageUserMetadataResult> =>
    batchUpdateImageUserMetadata(images, patch)
);

ipcMain.handle(
  SUGGEST_TERMS_CHANNEL,
  async (_event, kind: unknown, query: unknown): Promise<TermSuggestionResult> =>
    suggestTerms(kind, query)
);

ipcMain.handle(
  ADVANCED_SEARCH_CHANNEL,
  async (_event, criteria: unknown): Promise<AdvancedSearchResult> =>
    searchAdvancedImages(criteria)
);

ipcMain.handle(
  ADD_REMOTE_IMAGE_CHANNEL,
  async (_event, remoteUrl: unknown): Promise<AddRemoteImageResult> =>
    addRemoteImageFromUrl(remoteUrl)
);

ipcMain.handle(
  ADD_MIDJOURNEY_JOB_CHANNEL,
  async (_event, input: unknown): Promise<AddMidjourneyJobResult> =>
    addMidjourneyJob(input)
);

ipcMain.handle(
  ADD_MIDJOURNEY_VIDEO_JOB_CHANNEL,
  async (_event, input: unknown): Promise<AddMidjourneyJobResult> => addMidjourneyVideoJob(input)
);

ipcMain.handle(
  ADD_MIDJOURNEY_VIDEO_JOBS_BATCH_CHANNEL,
  async (_event, input: unknown): Promise<AddMidjourneyJobsBatchResult> => addMidjourneyVideoJobsBatch(input)
);

ipcMain.handle(
  SAVE_MIDJOURNEY_VIDEO_THUMBNAIL_CHANNEL,
  async (_event, input: unknown): Promise<SaveMidjourneyVideoThumbnailResult> =>
    saveMidjourneyVideoThumbnail(input)
);

ipcMain.handle(
  ADD_MIDJOURNEY_JOBS_BATCH_CHANNEL,
  async (_event, input: unknown): Promise<AddMidjourneyJobsBatchResult> =>
    addMidjourneyJobsBatch(input)
);

ipcMain.handle(
  LIST_REMOTE_IMAGES_CHANNEL,
  async (_event, provider: unknown): Promise<ImageScanResult> =>
    listRemoteImages(typeof provider === "string" ? provider : undefined)
);

ipcMain.handle(
  REMOVE_REMOTE_IMAGES_FROM_CATALOG_CHANNEL,
  async (_event, input: unknown): Promise<RemoveRemoteImagesFromCatalogResult> =>
    removeRemoteImageReferences(input)
);

ipcMain.handle(COPY_MIDJOURNEY_JOB_ID_CHANNEL, async (_event, input: unknown): Promise<CopyMidjourneyJobIdResult> =>
  copyMidjourneyJobId(input)
);
ipcMain.handle(DOWNLOAD_MIDJOURNEY_IMAGE_CHANNEL, async (_event, input: unknown): Promise<DownloadMidjourneyImageResult> =>
  downloadMidjourneyImage(input)
);

ipcMain.handle(LIST_COLLECTIONS_CHANNEL, async (): Promise<CollectionListResult> =>
  listCollections()
);

ipcMain.handle(
  CREATE_COLLECTION_CHANNEL,
  async (_event, input: unknown): Promise<CreateCollectionResult> =>
    createCollection(input)
);

ipcMain.handle(
  RENAME_COLLECTION_CHANNEL,
  async (_event, input: unknown): Promise<CollectionMutationResult> =>
    renameCollection(input)
);

ipcMain.handle(
  DELETE_COLLECTION_CHANNEL,
  async (_event, input: unknown): Promise<CollectionMutationResult> =>
    deleteCollection(input)
);

ipcMain.handle(
  ADD_IMAGES_TO_COLLECTION_CHANNEL,
  async (_event, input: unknown): Promise<CollectionMutationResult> =>
    addImagesToCollection(input)
);

ipcMain.handle(
  LIST_COLLECTION_IMAGES_CHANNEL,
  async (_event, collectionId: unknown): Promise<ImageScanResult> =>
    listCollectionImages(collectionId)
);

ipcMain.handle(
  REMOVE_IMAGES_FROM_COLLECTION_CHANNEL,
  async (_event, input: unknown): Promise<CollectionMutationResult> =>
    removeImagesFromCollection(input)
);

ipcMain.on(BATCH_EDIT_AVAILABILITY_CHANNEL, (_event, isAvailable: unknown): void => {
  setBatchEditMenuAvailability(isAvailable === true);
});

ipcMain.on(
  COLLECTION_MENU_AVAILABILITY_CHANNEL,
  (_event, canAddToCollection: unknown, canRemoveFromCollection: unknown): void => {
    setCollectionMenuAvailability(canAddToCollection === true, canRemoveFromCollection === true);
  }
);

ipcMain.handle(LIST_IMAGES_CHANNEL, async (_event, folderPath: unknown): Promise<ImageScanResult> => {
  if (typeof folderPath !== "string" || !getAuthorizedRootForPath(folderPath)) {
    return {
      ok: false,
      error: "Dossier non autorise pour cette session."
    };
  }

  try {
    imagePreviewRegistry.clear();
    const normalizedFolderPath = normalizeFolderPath(folderPath);
    const entries = await readdir(normalizedFolderPath, { withFileTypes: true });
    const imageEntries = entries.filter((entry) => {
      if (!entry.isFile()) {
        return false;
      }

      return SUPPORTED_IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase());
    });

    const images = await Promise.all(
      imageEntries.map(async (entry): Promise<ImageFile> => {
        const filePath = path.join(normalizedFolderPath, entry.name);
        const extension = path.extname(entry.name).toLowerCase();
        const previewUrl = createPreviewUrl(filePath, extension) ?? "";

        try {
          const fileStats = await stat(filePath);

          return {
            imageId: 0,
            sourceKind: "local",
            name: entry.name,
            displayName: entry.name,
            fileName: entry.name,
            path: filePath,
            extension,
            sizeBytes: fileStats.size,
            modifiedAt: fileStats.mtime.toISOString(),
            imageSrc: previewUrl,
            previewUrl,
            workflowColor: "none"
          };
        } catch {
          return {
            imageId: 0,
            sourceKind: "local",
            name: entry.name,
            displayName: entry.name,
            fileName: entry.name,
            path: filePath,
            extension,
            sizeBytes: null,
            modifiedAt: null,
            imageSrc: previewUrl,
            previewUrl,
            workflowColor: "none"
          };
        }
      })
    );
    persistImagesForFolder(normalizedFolderPath, images);

    return {
      ok: true,
      images: attachDatabaseIdentityAndWorkflowColors(images)
    };
  } catch {
    return {
      ok: false,
      error: "Impossible de lire le contenu immediat du dossier."
    };
  }
});

ipcMain.handle(
  BUILD_FOLDER_TREE_CHANNEL,
  async (_event, rootFolderPath: unknown): Promise<FolderTreeResult> => {
    if (typeof rootFolderPath !== "string" || !selectedRootFolders.has(rootFolderPath)) {
      return {
        ok: false,
        error: "Dossier racine non autorise pour cette session."
      };
    }

    try {
      const normalizedRootPath = normalizeFolderPath(rootFolderPath);
      const context: FolderTreeBuildContext = {
        rootPath: normalizedRootPath,
        visitedFolderCount: 0,
        limitReached: false
      };
      const tree = await buildFolderTreeNode(normalizedRootPath, 0, context);
      persistFolderTree(normalizedRootPath, tree);

      return {
        ok: true,
        tree,
        limitReached: context.limitReached
      };
    } catch {
      return {
        ok: false,
        error: "Impossible de construire l'arborescence."
      };
    }
  }
);

app.whenReady().then(async () => {
  await initializeDatabase();
  if (runRemoteImageSelfTest()) {
    app.quit();
    return;
  }

  registerImageProtocol();
  createApplicationMenu();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
