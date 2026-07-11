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
type ImageSourceKind = "local" | "remote";

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
  mediaKind?: "image" | "video";
  videoThumbnailUrl?: string | null;
};

type SaveMidjourneyVideoThumbnailResult =
  | { ok: true; thumbnailUrl: string }
  | { ok: false; error: string };

type CopyMidjourneyJobIdResult = { ok: true } | { ok: false; error: string };
type DownloadMidjourneyImageResult = { ok: true } | { ok: false; error: string };

type ImageIdentity = {
  imageId: number;
  imagePath?: string | null;
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

type RemoveRemoteImagesFromCatalogResult =
  | {
      ok: true;
      removedImageIds: number[];
      removedCount: number;
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

type AddMidjourneyJobsBatchResult =
  | {
      ok: true;
      detectedJobCount: number;
      createdImageCount: number;
      existingImageCount: number;
      invalidLineCount: number;
      jobs: Array<{
        jobId: string;
        createdCount: number;
        existingCount: number;
        imageIds: number[];
      }>;
      invalidLines: Array<{
        line: string;
        reason: string;
      }>;
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
  getImageUserMetadata: async (image: ImageIdentity | string): Promise<ImageUserMetadataResult> =>
    ipcRenderer.invoke(GET_IMAGE_USER_METADATA_CHANNEL, image),
  saveImageUserMetadata: async (
    image: ImageIdentity | string,
    metadata: ImageUserMetadata
  ): Promise<SaveImageUserMetadataResult> =>
    ipcRenderer.invoke(SAVE_IMAGE_USER_METADATA_CHANNEL, image, metadata),
  batchUpdateImageUserMetadata: async (
    images: Array<ImageIdentity | string>,
    patch: BatchImageUserMetadataPatch
  ): Promise<BatchUpdateImageUserMetadataResult> =>
    ipcRenderer.invoke(BATCH_UPDATE_IMAGE_USER_METADATA_CHANNEL, images, patch),
  suggestTerms: async (kind: TermKind, query: string): Promise<TermSuggestionResult> =>
    ipcRenderer.invoke(SUGGEST_TERMS_CHANNEL, kind, query),
  searchAdvanced: async (criteria: AdvancedSearchCriteria): Promise<AdvancedSearchResult> =>
    ipcRenderer.invoke(ADVANCED_SEARCH_CHANNEL, criteria),
  addRemoteImageFromUrl: async (remoteUrl: string): Promise<AddRemoteImageResult> =>
    ipcRenderer.invoke(ADD_REMOTE_IMAGE_CHANNEL, remoteUrl),
  addMidjourneyJob: async (input: string): Promise<AddMidjourneyJobResult> =>
    ipcRenderer.invoke(ADD_MIDJOURNEY_JOB_CHANNEL, input),
  addMidjourneyVideoJob: async (input: string): Promise<AddMidjourneyJobResult> =>
    ipcRenderer.invoke(ADD_MIDJOURNEY_VIDEO_JOB_CHANNEL, input),
  addMidjourneyVideoJobsBatch: async (input: string): Promise<AddMidjourneyJobsBatchResult> =>
    ipcRenderer.invoke(ADD_MIDJOURNEY_VIDEO_JOBS_BATCH_CHANNEL, input),
  saveMidjourneyVideoThumbnail: async (input: {
    imageId: number;
    dataUrl: string;
  }): Promise<SaveMidjourneyVideoThumbnailResult> =>
    ipcRenderer.invoke(SAVE_MIDJOURNEY_VIDEO_THUMBNAIL_CHANNEL, input),
  addMidjourneyJobsBatch: async (input: string): Promise<AddMidjourneyJobsBatchResult> =>
    ipcRenderer.invoke(ADD_MIDJOURNEY_JOBS_BATCH_CHANNEL, input),
  listRemoteImages: async (provider?: string): Promise<ImageScanResult> =>
    ipcRenderer.invoke(LIST_REMOTE_IMAGES_CHANNEL, provider),
  removeRemoteImagesFromCatalog: async (input: {
    imageIds: number[];
  }): Promise<RemoveRemoteImagesFromCatalogResult> =>
    ipcRenderer.invoke(REMOVE_REMOTE_IMAGES_FROM_CATALOG_CHANNEL, input),
  copyMidjourneyJobId: async (input: { imageId: number }): Promise<CopyMidjourneyJobIdResult> =>
    ipcRenderer.invoke(COPY_MIDJOURNEY_JOB_ID_CHANNEL, input),
  downloadMidjourneyImage: async (input: { imageId: number }): Promise<DownloadMidjourneyImageResult> =>
    ipcRenderer.invoke(DOWNLOAD_MIDJOURNEY_IMAGE_CHANNEL, input),
  listCollections: async (): Promise<CollectionListResult> =>
    ipcRenderer.invoke(LIST_COLLECTIONS_CHANNEL),
  createCollection: async (input: { name: string; description?: string }): Promise<CreateCollectionResult> =>
    ipcRenderer.invoke(CREATE_COLLECTION_CHANNEL, input),
  renameCollection: async (input: {
    collectionId: number;
    name: string;
  }): Promise<CollectionMutationResult> =>
    ipcRenderer.invoke(RENAME_COLLECTION_CHANNEL, input),
  deleteCollection: async (input: {
    collectionId: number;
  }): Promise<CollectionMutationResult> =>
    ipcRenderer.invoke(DELETE_COLLECTION_CHANNEL, input),
  addImagesToCollection: async (input: {
    collectionId: number;
    imageIds: number[];
  }): Promise<CollectionMutationResult> =>
    ipcRenderer.invoke(ADD_IMAGES_TO_COLLECTION_CHANNEL, input),
  listCollectionImages: async (collectionId: number): Promise<ImageScanResult> =>
    ipcRenderer.invoke(LIST_COLLECTION_IMAGES_CHANNEL, collectionId),
  removeImagesFromCollection: async (input: {
    collectionId: number;
    imageIds: number[];
  }): Promise<CollectionMutationResult> =>
    ipcRenderer.invoke(REMOVE_IMAGES_FROM_COLLECTION_CHANNEL, input),
  onAddRemoteImageRequest: (callback: () => void): (() => void) => {
    const listener = (): void => {
      callback();
    };

    ipcRenderer.on(ADD_REMOTE_IMAGE_REQUEST_CHANNEL, listener);

    return () => {
      ipcRenderer.removeListener(ADD_REMOTE_IMAGE_REQUEST_CHANNEL, listener);
    };
  },
  onAddMidjourneyJobRequest: (callback: () => void): (() => void) => {
    const listener = (): void => {
      callback();
    };

    ipcRenderer.on(ADD_MIDJOURNEY_JOB_REQUEST_CHANNEL, listener);

    return () => {
      ipcRenderer.removeListener(ADD_MIDJOURNEY_JOB_REQUEST_CHANNEL, listener);
    };
  },
  onAddMidjourneyVideoJobRequest: (callback: () => void): (() => void) => {
    const listener = (): void => callback();
    ipcRenderer.on(ADD_MIDJOURNEY_VIDEO_JOB_REQUEST_CHANNEL, listener);
    return () => ipcRenderer.removeListener(ADD_MIDJOURNEY_VIDEO_JOB_REQUEST_CHANNEL, listener);
  },
  onAddMidjourneyVideoJobsBatchRequest: (callback: () => void): (() => void) => {
    const listener = (): void => callback();
    ipcRenderer.on(ADD_MIDJOURNEY_VIDEO_JOBS_BATCH_REQUEST_CHANNEL, listener);
    return () => ipcRenderer.removeListener(ADD_MIDJOURNEY_VIDEO_JOBS_BATCH_REQUEST_CHANNEL, listener);
  },
  onAddMidjourneyJobsBatchRequest: (callback: () => void): (() => void) => {
    const listener = (): void => {
      callback();
    };

    ipcRenderer.on(ADD_MIDJOURNEY_JOBS_BATCH_REQUEST_CHANNEL, listener);

    return () => {
      ipcRenderer.removeListener(ADD_MIDJOURNEY_JOBS_BATCH_REQUEST_CHANNEL, listener);
    };
  },
  onMidjourneyObservationsImported: (callback: () => void): (() => void) => {
    const listener = (): void => callback();
    ipcRenderer.on(MIDJOURNEY_OBSERVATIONS_IMPORTED_CHANNEL, listener);
    return () => ipcRenderer.removeListener(MIDJOURNEY_OBSERVATIONS_IMPORTED_CHANNEL, listener);
  },
  onCreateCollectionRequest: (callback: () => void): (() => void) => {
    const listener = (): void => {
      callback();
    };

    ipcRenderer.on(CREATE_COLLECTION_REQUEST_CHANNEL, listener);

    return () => {
      ipcRenderer.removeListener(CREATE_COLLECTION_REQUEST_CHANNEL, listener);
    };
  },
  onAddSelectionToCollectionRequest: (callback: () => void): (() => void) => {
    const listener = (): void => {
      callback();
    };

    ipcRenderer.on(ADD_TO_COLLECTION_REQUEST_CHANNEL, listener);

    return () => {
      ipcRenderer.removeListener(ADD_TO_COLLECTION_REQUEST_CHANNEL, listener);
    };
  },
  onRemoveSelectionFromCollectionRequest: (callback: () => void): (() => void) => {
    const listener = (): void => {
      callback();
    };

    ipcRenderer.on(REMOVE_FROM_COLLECTION_REQUEST_CHANNEL, listener);

    return () => {
      ipcRenderer.removeListener(REMOVE_FROM_COLLECTION_REQUEST_CHANNEL, listener);
    };
  },
  setCollectionMenuAvailability: (
    canAddToCollection: boolean,
    canRemoveFromCollection: boolean
  ): void => {
    ipcRenderer.send(
      COLLECTION_MENU_AVAILABILITY_CHANNEL,
      canAddToCollection === true,
      canRemoveFromCollection === true
    );
  },
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
  setBatchEditAvailable: (isAvailable: boolean): void => {
    ipcRenderer.send(BATCH_EDIT_AVAILABILITY_CHANNEL, isAvailable === true);
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
