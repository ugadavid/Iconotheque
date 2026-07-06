import { contextBridge, ipcRenderer } from "electron";
import type { IpcRendererEvent } from "electron";

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

type RootFolder = {
  path: string;
  name: string;
};

type ThumbnailSize = "small" | "medium" | "large";

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

type DatabaseStatus =
  | {
      status: "created";
      error: null;
    }
  | {
      status: "error";
      error: string;
    };

type TermKind = "tag" | "person" | "place" | "collection" | "project";

type ColorMode = "color" | "bw" | "mixed" | "unknown";
type WorkflowColor = "none" | "red" | "orange" | "yellow" | "green" | "blue" | "purple" | "gray";

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

contextBridge.exposeInMainWorld("iconotheque", {
  appName: "Iconotheque",
  selectRootFolder: async (): Promise<RootFolderSelection> =>
    ipcRenderer.invoke(SELECT_ROOT_FOLDER_CHANNEL),
  listImagesInRootFolder: async (folderPath: string): Promise<ImageScanResult> =>
    ipcRenderer.invoke(LIST_IMAGES_CHANNEL, folderPath),
  buildFolderTree: async (rootFolderPath: string): Promise<FolderTreeResult> =>
    ipcRenderer.invoke(BUILD_FOLDER_TREE_CHANNEL, rootFolderPath),
  getDatabaseStatus: async (): Promise<DatabaseStatus> =>
    ipcRenderer.invoke(GET_DATABASE_STATUS_CHANNEL),
  getImageUserMetadata: async (imagePath: string): Promise<ImageUserMetadataResult> =>
    ipcRenderer.invoke(GET_IMAGE_USER_METADATA_CHANNEL, imagePath),
  saveImageUserMetadata: async (
    imagePath: string,
    metadata: ImageUserMetadata
  ): Promise<SaveImageUserMetadataResult> =>
    ipcRenderer.invoke(SAVE_IMAGE_USER_METADATA_CHANNEL, imagePath, metadata),
  batchUpdateImageUserMetadata: async (
    imagePaths: string[],
    patch: BatchImageUserMetadataPatch
  ): Promise<BatchUpdateImageUserMetadataResult> =>
    ipcRenderer.invoke(BATCH_UPDATE_IMAGE_USER_METADATA_CHANNEL, imagePaths, patch),
  suggestTerms: async (kind: TermKind, query: string): Promise<TermSuggestionResult> =>
    ipcRenderer.invoke(SUGGEST_TERMS_CHANNEL, kind, query),
  searchAdvanced: async (criteria: AdvancedSearchCriteria): Promise<AdvancedSearchResult> =>
    ipcRenderer.invoke(ADVANCED_SEARCH_CHANNEL, criteria),
  onAdvancedSearchRequest: (callback: () => void): (() => void) => {
    const listener = (): void => {
      callback();
    };

    ipcRenderer.on(ADVANCED_SEARCH_REQUEST_CHANNEL, listener);

    return () => {
      ipcRenderer.removeListener(ADVANCED_SEARCH_REQUEST_CHANNEL, listener);
    };
  },
  onBatchEditRequest: (callback: () => void): (() => void) => {
    const listener = (): void => {
      callback();
    };

    ipcRenderer.on(BATCH_EDIT_REQUEST_CHANNEL, listener);

    return () => {
      ipcRenderer.removeListener(BATCH_EDIT_REQUEST_CHANNEL, listener);
    };
  },
  onHelpRequest: (callback: () => void): (() => void) => {
    const listener = (): void => {
      callback();
    };

    ipcRenderer.on(HELP_REQUEST_CHANNEL, listener);

    return () => {
      ipcRenderer.removeListener(HELP_REQUEST_CHANNEL, listener);
    };
  },
  onRootFolderSelectedFromMenu: (callback: (folder: RootFolder) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, folder: RootFolder): void => {
      callback(folder);
    };

    ipcRenderer.on(ROOT_FOLDER_SELECTED_FROM_MENU_CHANNEL, listener);

    return () => {
      ipcRenderer.removeListener(ROOT_FOLDER_SELECTED_FROM_MENU_CHANNEL, listener);
    };
  },
  onRescanRootFolderRequest: (callback: () => void): (() => void) => {
    const listener = (): void => {
      callback();
    };

    ipcRenderer.on(RESCAN_ROOT_FOLDER_REQUEST_CHANNEL, listener);

    return () => {
      ipcRenderer.removeListener(RESCAN_ROOT_FOLDER_REQUEST_CHANNEL, listener);
    };
  },
  onThumbnailSizeRequest: (callback: (thumbnailSize: ThumbnailSize) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, thumbnailSize: ThumbnailSize): void => {
      callback(thumbnailSize);
    };

    ipcRenderer.on(THUMBNAIL_SIZE_REQUEST_CHANNEL, listener);

    return () => {
      ipcRenderer.removeListener(THUMBNAIL_SIZE_REQUEST_CHANNEL, listener);
    };
  }
});
