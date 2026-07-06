/// <reference types="vite/client" />

import type {
  AdvancedSearchCriteria,
  AdvancedSearchResult,
  BatchImageUserMetadataPatch,
  BatchUpdateImageUserMetadataResult,
  DatabaseStatus,
  FolderTreeNode,
  ImageFile,
  ImageUserMetadata,
  ImageUserMetadataResult,
  RootFolder,
  SaveImageUserMetadataResult,
  TermKind,
  TermSuggestionResult,
  ThumbnailSize
} from "./types";

type RootFolderSelection =
  | {
      canceled: true;
    }
  | {
      canceled: false;
      folder: RootFolder;
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

declare global {
  interface Window {
    iconotheque: {
      appName: string;
      selectRootFolder: () => Promise<RootFolderSelection>;
      listImagesInRootFolder: (folderPath: string) => Promise<ImageScanResult>;
      buildFolderTree: (rootFolderPath: string) => Promise<FolderTreeResult>;
      getDatabaseStatus: () => Promise<DatabaseStatus>;
      getImageUserMetadata: (imagePath: string) => Promise<ImageUserMetadataResult>;
      saveImageUserMetadata: (
        imagePath: string,
        metadata: ImageUserMetadata
      ) => Promise<SaveImageUserMetadataResult>;
      batchUpdateImageUserMetadata: (
        imagePaths: string[],
        patch: BatchImageUserMetadataPatch
      ) => Promise<BatchUpdateImageUserMetadataResult>;
      suggestTerms: (kind: TermKind, query: string) => Promise<TermSuggestionResult>;
      searchAdvanced: (criteria: AdvancedSearchCriteria) => Promise<AdvancedSearchResult>;
      onAdvancedSearchRequest: (callback: () => void) => () => void;
      onBatchEditRequest: (callback: () => void) => () => void;
      onHelpRequest: (callback: () => void) => () => void;
      onRootFolderSelectedFromMenu: (callback: (folder: RootFolder) => void) => () => void;
      onRescanRootFolderRequest: (callback: () => void) => () => void;
      onThumbnailSizeRequest: (callback: (thumbnailSize: ThumbnailSize) => void) => () => void;
    };
  }
}
