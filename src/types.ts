export type RootFolder = {
  path: string;
  name: string;
};

export type ThumbnailSize = "small" | "medium" | "large";

export type ImageSourceKind = "local" | "remote";
export type MediaKind = "image" | "video";

export type FolderTreeNode = {
  name: string;
  path: string;
  relativePath: string;
  directImageCount: number;
  subfolderCount: number;
  children: FolderTreeNode[];
  error: string | null;
};

export type ImageFile = {
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

export type ImageIdentity = {
  imageId: number;
  imagePath?: string | null;
};

export type ImageScanState = {
  status: "idle" | "loading" | "ready" | "empty" | "error";
  images: ImageFile[];
  error: string | null;
};

export type CollectionSummary = {
  id: number;
  name: string;
  description: string | null;
  imageCount: number;
};

export type FolderTreeScanState = {
  status: "idle" | "loading" | "ready" | "error";
  tree: FolderTreeNode | null;
  error: string | null;
  limitReached: boolean;
};

export type DatabaseStatus = {
  status: "unknown" | "created" | "error";
  error: string | null;
};

export type TermKind = "tag" | "person" | "place" | "collection" | "project";

export type ColorMode = "color" | "bw" | "mixed" | "unknown";

export type WorkflowColor =
  | "none"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "gray";

export type AdvancedSearchCriteria = {
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

export type ImageUserMetadata = {
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

export type BatchFieldAction<T> =
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

export type BatchTermPatch = {
  add: string[];
  remove: string[];
};

export type BatchImageUserMetadataPatch = {
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

export type ImageUserMetadataResult =
  | {
      ok: true;
      metadata: ImageUserMetadata;
    }
  | {
      ok: false;
      error: string;
    };

export type SaveImageUserMetadataResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      error: string;
    };

export type SaveMidjourneyVideoThumbnailResult =
  | { ok: true; thumbnailUrl: string }
  | { ok: false; error: string };

export type CopyMidjourneyJobIdResult = { ok: true } | { ok: false; error: string };
export type DownloadMidjourneyImageResult = { ok: true } | { ok: false; error: string };

export type BatchUpdateImageUserMetadataResult =
  | {
      ok: true;
      updatedCount: number;
      workflowColor: WorkflowColor | null;
    }
  | {
      ok: false;
      error: string;
    };

export type TermSuggestionResult =
  | {
      ok: true;
      labels: string[];
    }
  | {
      ok: false;
      error: string;
    };

export type AdvancedSearchResult =
  | {
      ok: true;
      images: ImageFile[];
    }
  | {
      ok: false;
      error: string;
    };

export type AddRemoteImageResult =
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

export type AddMidjourneyJobResult =
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

export type AddMidjourneyJobsBatchResult =
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

export type CollectionListResult =
  | {
      ok: true;
      collections: CollectionSummary[];
    }
  | {
      ok: false;
      error: string;
    };

export type CreateCollectionResult =
  | {
      ok: true;
      collection: CollectionSummary;
    }
  | {
      ok: false;
      error: string;
    };

export type CollectionMutationResult =
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

export type RemoveRemoteImagesFromCatalogResult =
  | {
      ok: true;
      removedImageIds: number[];
      removedCount: number;
    }
  | {
      ok: false;
      error: string;
    };
