/// <reference types="vite/client" />

import type {
  AdvancedSearchCriteria,
  AdvancedSearchResult,
  AddMidjourneyJobsBatchResult,
  AddMidjourneyJobResult,
  AddRemoteImageResult,
  BatchImageUserMetadataPatch,
  BatchUpdateImageUserMetadataResult,
  CollectionListResult,
  CollectionMutationResult,
  CopyMidjourneyJobIdResult,
  DownloadMidjourneyImageResult,
  DownloadMidjourneyJobImagesResult,
  OpenMidjourneyJobFolderResult,
  CreateCollectionResult,
  DatabaseStatus,
  FolderTreeNode,
  ImageFile,
  ImageIdentity,
  ImageUserMetadata,
  ImageUserMetadataResult,
  RootFolder,
  RemoveRemoteImagesFromCatalogResult,
  SaveImageUserMetadataResult,
  SaveMidjourneyVideoThumbnailResult,
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
      getImageUserMetadata: (image: ImageIdentity | string) => Promise<ImageUserMetadataResult>;
      saveImageUserMetadata: (
        image: ImageIdentity | string,
        metadata: ImageUserMetadata
      ) => Promise<SaveImageUserMetadataResult>;
      batchUpdateImageUserMetadata: (
        images: Array<ImageIdentity | string>,
        patch: BatchImageUserMetadataPatch
      ) => Promise<BatchUpdateImageUserMetadataResult>;
      suggestTerms: (kind: TermKind, query: string) => Promise<TermSuggestionResult>;
      searchAdvanced: (criteria: AdvancedSearchCriteria) => Promise<AdvancedSearchResult>;
      addRemoteImageFromUrl: (remoteUrl: string) => Promise<AddRemoteImageResult>;
      addMidjourneyJob: (input: string) => Promise<AddMidjourneyJobResult>;
      addMidjourneyVideoJob: (input: string) => Promise<AddMidjourneyJobResult>;
      addMidjourneyVideoJobsBatch: (input: string) => Promise<AddMidjourneyJobsBatchResult>;
      saveMidjourneyVideoThumbnail: (input: {
        imageId: number;
        dataUrl: string;
      }) => Promise<SaveMidjourneyVideoThumbnailResult>;
      addMidjourneyJobsBatch: (input: string) => Promise<AddMidjourneyJobsBatchResult>;
      listRemoteImages: (provider?: string) => Promise<ImageScanResult>;
      removeRemoteImagesFromCatalog: (input: {
        imageIds: number[];
      }) => Promise<RemoveRemoteImagesFromCatalogResult>;
      copyMidjourneyJobId: (input: { imageId: number }) => Promise<CopyMidjourneyJobIdResult>;
      downloadMidjourneyImage: (input: { imageId: number }) => Promise<DownloadMidjourneyImageResult>;
      downloadMidjourneyJobImages: (input: { jobId: string }) => Promise<DownloadMidjourneyJobImagesResult>;
      openMidjourneyJobFolder: (input: { jobId: string }) => Promise<OpenMidjourneyJobFolderResult>;
      listCollections: () => Promise<CollectionListResult>;
      createCollection: (input: { name: string; description?: string }) => Promise<CreateCollectionResult>;
      renameCollection: (input: {
        collectionId: number;
        name: string;
      }) => Promise<CollectionMutationResult>;
      deleteCollection: (input: {
        collectionId: number;
      }) => Promise<CollectionMutationResult>;
      addImagesToCollection: (input: {
        collectionId: number;
        imageIds: number[];
      }) => Promise<CollectionMutationResult>;
      listCollectionImages: (collectionId: number) => Promise<ImageScanResult>;
      removeImagesFromCollection: (input: {
        collectionId: number;
        imageIds: number[];
      }) => Promise<CollectionMutationResult>;
      onAddRemoteImageRequest: (callback: () => void) => () => void;
      onAddMidjourneyJobRequest: (callback: () => void) => () => void;
      onAddMidjourneyVideoJobRequest: (callback: () => void) => () => void;
      onAddMidjourneyVideoJobsBatchRequest: (callback: () => void) => () => void;
      onAddMidjourneyJobsBatchRequest: (callback: () => void) => () => void;
      onMidjourneyObservationsImported: (callback: () => void) => () => void;
      onCreateCollectionRequest: (callback: () => void) => () => void;
      onAddSelectionToCollectionRequest: (callback: () => void) => () => void;
      onRemoveSelectionFromCollectionRequest: (callback: () => void) => () => void;
      setCollectionMenuAvailability: (
        canAddToCollection: boolean,
        canRemoveFromCollection: boolean
      ) => void;
      onAdvancedSearchRequest: (callback: () => void) => () => void;
      onBatchEditRequest: (callback: () => void) => () => void;
      setBatchEditAvailable: (isAvailable: boolean) => void;
      onHelpRequest: (callback: () => void) => () => void;
      onRootFolderSelectedFromMenu: (callback: (folder: RootFolder) => void) => () => void;
      onRescanRootFolderRequest: (callback: () => void) => () => void;
      onThumbnailSizeRequest: (callback: (thumbnailSize: ThumbnailSize) => void) => () => void;
    };
  }
}
