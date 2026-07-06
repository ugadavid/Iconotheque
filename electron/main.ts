import { app, BrowserWindow, dialog, ipcMain, Menu, protocol } from "electron";
import type { MenuItemConstructorOptions, OpenDialogOptions } from "electron";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
const HELP_REQUEST_CHANNEL = "help:requested";
const ROOT_FOLDER_SELECTED_FROM_MENU_CHANNEL = "root-folder:selected-from-menu";
const RESCAN_ROOT_FOLDER_REQUEST_CHANNEL = "root-folder:rescan-requested";
const THUMBNAIL_SIZE_REQUEST_CHANNEL = "thumbnail-size:requested";
const IMAGE_PROTOCOL_SCHEME = "iconotheque-image";
const SUPPORTED_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const IGNORED_FOLDER_NAMES = new Set(["node_modules", ".git", "dist", "dist-electron", ".iconotheque-cache"]);
const MAX_FOLDER_TREE_DEPTH = 8;
const MAX_FOLDER_TREE_NODES = 2000;
const SCHEMA_VERSION = "3";
const TERM_KINDS = ["tag", "person", "place", "collection", "project"] as const;
const COLOR_MODES = ["color", "bw", "mixed", "unknown"] as const;
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
  name: string;
  path: string;
  extension: string;
  sizeBytes: number | null;
  modifiedAt: string | null;
  previewUrl: string;
  workflowColor: WorkflowColor;
};

type ImageScanResult =
  | {
      ok: true;
      images: ImageFile[];
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

function migrateDatabaseSchema(): void {
  const database = getSqliteDatabase();

  if (!database) {
    return;
  }

  if (!tableHasColumn("image_user_meta", "workflow_color")) {
    database.run("ALTER TABLE image_user_meta ADD COLUMN workflow_color TEXT DEFAULT 'none'");
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
    "SELECT id FROM images WHERE path = ?",
    [normalizeFolderPath(imagePath)],
    "id"
  );
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

function getWorkflowColorByImagePath(imagePath: string): WorkflowColor {
  const database = getSqliteDatabase();

  if (!database || !tableHasColumn("image_user_meta", "workflow_color")) {
    return "none";
  }

  try {
    const result = database.exec(
      `SELECT image_user_meta.workflow_color
       FROM images
       LEFT JOIN image_user_meta ON image_user_meta.image_id = images.id
       WHERE images.path = ?`,
      [normalizeFolderPath(imagePath)]
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

function attachWorkflowColors(images: ImageFile[]): ImageFile[] {
  return images.map((image) => ({
    ...image,
    workflowColor: getWorkflowColorByImagePath(image.path)
  }));
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
      runSql(
        `INSERT INTO images (
           root_id, folder_id, path, file_name, folder_path,
           extension, size_bytes, modified_at, preview_id, indexed_at
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(path) DO UPDATE SET
           root_id = excluded.root_id,
           folder_id = excluded.folder_id,
           file_name = excluded.file_name,
           folder_path = excluded.folder_path,
           extension = excluded.extension,
           size_bytes = excluded.size_bytes,
           modified_at = excluded.modified_at,
           preview_id = excluded.preview_id,
           indexed_at = excluded.indexed_at`,
        [
          rootId,
          folderId,
          normalizeFolderPath(image.path),
          image.name,
          normalizedFolderPath,
          image.extension,
          image.sizeBytes,
          image.modifiedAt,
          getPreviewId(image.previewUrl),
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

function readImageUserMetadata(imagePath: unknown): ImageUserMetadataResult {
  if (typeof imagePath !== "string" || !getAuthorizedRootForPath(imagePath)) {
    return {
      ok: false,
      error: "Image non autorisee pour cette session."
    };
  }

  const imageId = getImageIdByPath(imagePath);

  if (imageId === null) {
    return {
      ok: false,
      error: "Image non indexee dans la base locale."
    };
  }

  const metadata = {
    ...createEmptyImageUserMetadata(),
    ...getImageUserMetadataRows(imageId),
    terms: getImageTerms(imageId)
  };

  return {
    ok: true,
    metadata
  };
}

function saveImageUserMetadata(
  imagePath: unknown,
  metadataPayload: unknown
): SaveImageUserMetadataResult {
  const database = getSqliteDatabase();

  if (!database) {
    return {
      ok: false,
      error: "Base SQLite non disponible."
    };
  }

  if (typeof imagePath !== "string" || !getAuthorizedRootForPath(imagePath)) {
    return {
      ok: false,
      error: "Image non autorisee pour cette session."
    };
  }

  const imageId = getImageIdByPath(imagePath);

  if (imageId === null) {
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
        imageId,
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
        [imageId, kind]
      );

      metadata.terms[kind].forEach((label) => {
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
  imagePathsPayload: unknown,
  patchPayload: unknown
): BatchUpdateImageUserMetadataResult {
  const database = getSqliteDatabase();

  if (!database) {
    return {
      ok: false,
      error: "Base SQLite non disponible."
    };
  }

  if (!Array.isArray(imagePathsPayload)) {
    return {
      ok: false,
      error: "Lot d'images invalide."
    };
  }

  const imagePaths = [...new Set(imagePathsPayload)]
    .filter((imagePath): imagePath is string => typeof imagePath === "string")
    .map(normalizeFolderPath)
    .filter((imagePath) => getAuthorizedRootForPath(imagePath));

  if (imagePaths.length < 2) {
    return {
      ok: false,
      error: "Selectionnez au moins deux images pour modifier par lot."
    };
  }

  const imageIds = imagePaths
    .map((imagePath) => getImageIdByPath(imagePath))
    .filter((imageId): imageId is number => imageId !== null);

  if (imageIds.length === 0) {
    return {
      ok: false,
      error: "Aucune image du lot n'est indexee dans la base locale."
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
    images.file_name LIKE ?
    OR images.path LIKE ?
    OR images.extension LIKE ?
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

  conditions.push(`images.root_id IN (SELECT id FROM roots WHERE path IN (${rootPlaceholders}))`);
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
         images.file_name,
         images.path,
         images.extension,
         images.size_bytes,
         images.modified_at,
         COALESCE(image_user_meta.workflow_color, 'none') AS workflow_color
       FROM images
       LEFT JOIN image_user_meta ON image_user_meta.image_id = images.id
       WHERE ${conditions.join(" AND ")}
       ORDER BY images.file_name COLLATE NOCASE
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

        return {
          name: String(row[columnIndex("file_name")] ?? path.basename(filePath)),
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
          previewUrl: createPreviewUrl(filePath, extension) ?? "",
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

function registerImageProtocol(): void {
  protocol.handle(IMAGE_PROTOCOL_SCHEME, async (request) => {
    const url = new URL(request.url);
    const imageId = url.pathname.replace(/^\/+/, "");
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
        label: "Modifier la selection par lot...",
        click: requestBatchEdit
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
  async (_event, imagePath: unknown): Promise<ImageUserMetadataResult> =>
    readImageUserMetadata(imagePath)
);

ipcMain.handle(
  SAVE_IMAGE_USER_METADATA_CHANNEL,
  async (_event, imagePath: unknown, metadata: unknown): Promise<SaveImageUserMetadataResult> =>
    saveImageUserMetadata(imagePath, metadata)
);

ipcMain.handle(
  BATCH_UPDATE_IMAGE_USER_METADATA_CHANNEL,
  async (
    _event,
    imagePaths: unknown,
    patch: unknown
  ): Promise<BatchUpdateImageUserMetadataResult> =>
    batchUpdateImageUserMetadata(imagePaths, patch)
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
            name: entry.name,
            path: filePath,
            extension,
            sizeBytes: fileStats.size,
            modifiedAt: fileStats.mtime.toISOString(),
            previewUrl,
            workflowColor: "none"
          };
        } catch {
          return {
            name: entry.name,
            path: filePath,
            extension,
            sizeBytes: null,
            modifiedAt: null,
            previewUrl,
            workflowColor: "none"
          };
        }
      })
    );
    persistImagesForFolder(normalizedFolderPath, images);

    return {
      ok: true,
      images: attachWorkflowColors(images)
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
