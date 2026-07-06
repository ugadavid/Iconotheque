export type RootFolder = {
  path: string;
  name: string;
};

export type ThumbnailSize = "small" | "medium" | "large";

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
  name: string;
  path: string;
  extension: string;
  sizeBytes: number | null;
  modifiedAt: string | null;
  previewUrl: string;
  workflowColor: WorkflowColor;
};

export type ImageScanState = {
  status: "idle" | "loading" | "ready" | "empty" | "error";
  images: ImageFile[];
  error: string | null;
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
