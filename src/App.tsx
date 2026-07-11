import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, DragEvent as ReactDragEvent, PointerEvent as ReactPointerEvent } from "react";
import {
  AdvancedSearchPanel,
  createEmptyAdvancedSearchCriteria
} from "./components/AdvancedSearchPanel";
import { BatchMetadataModal } from "./components/BatchMetadataModal";
import { FolderTree } from "./components/FolderTree";
import { HelpPanel } from "./components/HelpPanel";
import { ImageGrid } from "./components/ImageGrid";
import { ImageViewer } from "./components/ImageViewer";
import { InfoPanel } from "./components/InfoPanel";
import { StatusBar } from "./components/StatusBar";
import { TopBar } from "./components/TopBar";
import { probeMidjourneyVideoFrame } from "./videoThumbnailProbe";
import type {
  AdvancedSearchCriteria,
  BatchImageUserMetadataPatch,
  CollectionSummary,
  DatabaseStatus,
  FolderTreeScanState,
  ImageFile,
  ImageIdentity,
  ImageScanState,
  RootFolder,
  ThumbnailSize,
  WorkflowColor
} from "./types";

const MIN_LEFT_WIDTH = 220;
const DEFAULT_LEFT_WIDTH = 260;
const MIN_CENTER_WIDTH = 360;
const MIN_RIGHT_WIDTH = 260;
const DEFAULT_RIGHT_WIDTH = 300;

function getImageIdentity(image: ImageFile): ImageIdentity {
  return {
    imageId: image.imageId,
    imagePath: image.path ?? null
  };
}

function getImageKey(image: ImageFile): number {
  return image.imageId;
}

function formatMidjourneyJobSummary(createdCount: number, existingCount: number): string {
  if (createdCount === 4 && existingCount === 0) {
    return "Job Midjourney ajoute : 4 images creees.";
  }

  if (createdCount === 0 && existingCount === 4) {
    return "Job Midjourney deja present : aucune image creee, 4 images deja presentes.";
  }

  return `Job Midjourney complete : ${createdCount} image(s) creee(s), ${existingCount} deja presente(s).`;
}

function formatMidjourneyBatchSummary(
  detectedJobCount: number,
  createdImageCount: number,
  existingImageCount: number,
  invalidLineCount: number
): string {
  return `Import termine : ${detectedJobCount} job(s) detecte(s), ${createdImageCount} image(s) creee(s), ${existingImageCount} deja presente(s), ${invalidLineCount} ligne(s) ignoree(s).`;
}

function formatMidjourneyRoutedSummary(createdCount: number, existingCount: number): string {
  if (createdCount === 0 && existingCount === 4) {
    return "URL Midjourney detectee : ce job est deja present.";
  }

  if (createdCount === 4 && existingCount === 0) {
    return "URL Midjourney detectee : le job complet a ete ajoute.";
  }

  return `URL Midjourney detectee : le job a ete complete avec ${createdCount} image(s) creee(s), ${existingCount} deja presente(s).`;
}

function formatAddToCollectionSummary(addedCount: number, alreadyPresentCount: number): string {
  if (addedCount === 1 && alreadyPresentCount === 0) {
    return "Image ajoutee a la collection.";
  }

  if (addedCount > 1 && alreadyPresentCount === 0) {
    return `${addedCount} images ajoutees a la collection.`;
  }

  if (addedCount === 0 && alreadyPresentCount === 1) {
    return "Cette image est deja dans la collection.";
  }

  if (addedCount === 0 && alreadyPresentCount > 1) {
    return "Les images selectionnees sont deja dans la collection.";
  }

  return `Ajout termine : ${addedCount} image(s) ajoutee(s), ${alreadyPresentCount} deja presente(s).`;
}

function getImportFeedbackClassName(tone: ImportFeedbackTone): string {
  return `remote-image-feedback remote-image-feedback-${tone}`;
}

function getUnknownImportErrorMessage(error: unknown, fallbackMessage: string): string {
  return error instanceof Error ? error.message : fallbackMessage;
}

const DEFAULT_RATIO_REFERENCE_WIDTH = 1280;
const RESIZE_HANDLE_TOTAL_WIDTH = 16;
const LEFT_COLUMN_MAX_RATIO = 0.42;
const RIGHT_COLUMN_MAX_RATIO = 0.55;
const DEFAULT_LEFT_RATIO = DEFAULT_LEFT_WIDTH / DEFAULT_RATIO_REFERENCE_WIDTH;
const DEFAULT_RIGHT_RATIO = DEFAULT_RIGHT_WIDTH / DEFAULT_RATIO_REFERENCE_WIDTH;
const IMAGE_CONTEXT_MENU_WIDTH = 230;
const IMAGE_CONTEXT_MENU_HEIGHT = 196;
const IMAGE_CONTEXT_MENU_MARGIN = 8;
const COLLECTION_CONTEXT_MENU_WIDTH = 230;
const COLLECTION_CONTEXT_MENU_HEIGHT = 96;

type ResizeSide = "left" | "right";
type ImageLibraryView = "local" | "web-generic" | "web-midjourney" | "web-midjourney-video" | "collection";
type ImportFeedbackTone = "success" | "warning" | "error";

type ImageContextMenuState = {
  imageId: number;
  x: number;
  y: number;
  midjourneyJobId?: string;
};

type CollectionContextMenuState = {
  collection: CollectionSummary;
  x: number;
  y: number;
};

type ResizeSession = {
  side: ResizeSide;
  startX: number;
  startLeftWidth: number;
  startRightWidth: number;
};

type ColumnWidths = {
  left: number;
  right: number;
};

type AdvancedSearchState = {
  status: "idle" | "loading" | "ready" | "error";
  images: ImageFile[];
  criteria: AdvancedSearchCriteria;
  error: string | null;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function getAvailableWidth(workspaceWidth: number, otherSideWidth: number): number {
  return workspaceWidth - otherSideWidth - MIN_CENTER_WIDTH - RESIZE_HANDLE_TOTAL_WIDTH;
}

function getMaxLeftWidth(workspaceWidth: number, rightWidth: number): number {
  if (workspaceWidth <= 0) {
    return DEFAULT_LEFT_WIDTH;
  }

  return Math.max(
    MIN_LEFT_WIDTH,
    Math.min(workspaceWidth * LEFT_COLUMN_MAX_RATIO, getAvailableWidth(workspaceWidth, rightWidth))
  );
}

function getMaxRightWidth(workspaceWidth: number, leftWidth: number): number {
  if (workspaceWidth <= 0) {
    return DEFAULT_RIGHT_WIDTH;
  }

  return Math.max(
    MIN_RIGHT_WIDTH,
    Math.min(workspaceWidth * RIGHT_COLUMN_MAX_RATIO, getAvailableWidth(workspaceWidth, leftWidth))
  );
}

function fitWidthsToBudget(leftWidth: number, rightWidth: number, sideBudget: number): ColumnWidths {
  let fittedLeftWidth = leftWidth;
  let fittedRightWidth = rightWidth;
  let overflow = fittedLeftWidth + fittedRightWidth - sideBudget;

  if (overflow <= 0) {
    return {
      left: fittedLeftWidth,
      right: fittedRightWidth
    };
  }

  const leftShrinkable = Math.max(0, fittedLeftWidth - MIN_LEFT_WIDTH);
  const rightShrinkable = Math.max(0, fittedRightWidth - MIN_RIGHT_WIDTH);
  const totalShrinkable = leftShrinkable + rightShrinkable;

  if (totalShrinkable > 0) {
    const leftShrink = Math.min(leftShrinkable, overflow * (leftShrinkable / totalShrinkable));
    const rightShrink = Math.min(rightShrinkable, overflow * (rightShrinkable / totalShrinkable));

    fittedLeftWidth -= leftShrink;
    fittedRightWidth -= rightShrink;
    overflow = fittedLeftWidth + fittedRightWidth - sideBudget;
  }

  if (overflow > 0) {
    const extraLeftShrink = Math.min(Math.max(0, fittedLeftWidth - MIN_LEFT_WIDTH), overflow);
    fittedLeftWidth -= extraLeftShrink;
    overflow -= extraLeftShrink;
  }

  if (overflow > 0) {
    const extraRightShrink = Math.min(Math.max(0, fittedRightWidth - MIN_RIGHT_WIDTH), overflow);
    fittedRightWidth -= extraRightShrink;
  }

  return {
    left: fittedLeftWidth,
    right: fittedRightWidth
  };
}

function calculateColumnWidths(
  workspaceWidth: number,
  desiredLeftRatio: number,
  desiredRightRatio: number
): ColumnWidths {
  if (workspaceWidth <= 0) {
    return {
      left: DEFAULT_LEFT_WIDTH,
      right: DEFAULT_RIGHT_WIDTH
    };
  }

  const maxLeftWidth = Math.max(MIN_LEFT_WIDTH, workspaceWidth * LEFT_COLUMN_MAX_RATIO);
  const maxRightWidth = Math.max(MIN_RIGHT_WIDTH, workspaceWidth * RIGHT_COLUMN_MAX_RATIO);
  const desiredLeftWidth = clamp(workspaceWidth * desiredLeftRatio, MIN_LEFT_WIDTH, maxLeftWidth);
  const desiredRightWidth = clamp(workspaceWidth * desiredRightRatio, MIN_RIGHT_WIDTH, maxRightWidth);
  const sideBudget = Math.max(
    MIN_LEFT_WIDTH + MIN_RIGHT_WIDTH,
    workspaceWidth - MIN_CENTER_WIDTH - RESIZE_HANDLE_TOTAL_WIDTH
  );
  const fittedWidths = fitWidthsToBudget(desiredLeftWidth, desiredRightWidth, sideBudget);

  return {
    left: Math.round(fittedWidths.left),
    right: Math.round(fittedWidths.right)
  };
}

function imageMatchesSimpleSearch(image: ImageFile, query: string): boolean {
  const normalizedQuery = query.trim().toLocaleLowerCase("fr-FR");

  if (!normalizedQuery) {
    return true;
  }

  return [image.name, image.displayName, image.extension, image.path ?? ""]
    .filter(Boolean)
    .some((value) => value.toLocaleLowerCase("fr-FR").includes(normalizedQuery));
}

function imageMatchesWorkflowFilters(image: ImageFile, workflowColors: WorkflowColor[]): boolean {
  if (workflowColors.length === 0) {
    return true;
  }

  return workflowColors.includes(image.workflowColor ?? "none");
}

export default function App() {
  const workspaceRef = useRef<HTMLElement | null>(null);
  const resizeSessionRef = useRef<ResizeSession | null>(null);
  const [rootFolder, setRootFolder] = useState<RootFolder | null>(null);
  const [activeFolder, setActiveFolder] = useState<RootFolder | null>(null);
  const [folderTreeScan, setFolderTreeScan] = useState<FolderTreeScanState>({
    status: "idle",
    tree: null,
    error: null,
    limitReached: false
  });
  const [imageScan, setImageScan] = useState<ImageScanState>({
    status: "idle",
    images: [],
    error: null
  });
  const [genericRemoteImageScan, setGenericRemoteImageScan] = useState<ImageScanState>({
    status: "idle",
    images: [],
    error: null
  });
  const [midjourneyImageScan, setMidjourneyImageScan] = useState<ImageScanState>({
    status: "idle",
    images: [],
    error: null
  });
  const [midjourneyVideoScan, setMidjourneyVideoScan] = useState<ImageScanState>({ status: "idle", images: [], error: null });
  const [collectionImageScan, setCollectionImageScan] = useState<ImageScanState>({
    status: "idle",
    images: [],
    error: null
  });
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [activeCollection, setActiveCollection] = useState<CollectionSummary | null>(null);
  const [libraryView, setLibraryView] = useState<ImageLibraryView>("local");
  const [databaseStatus, setDatabaseStatus] = useState<DatabaseStatus>({
    status: "unknown",
    error: null
  });
  const [selectedImage, setSelectedImage] = useState<ImageFile | null>(null);
  const [selectedImageIds, setSelectedImageIds] = useState<number[]>([]);
  const [selectionAnchorImageId, setSelectionAnchorImageId] = useState<number | null>(null);
  const [draggedImageIds, setDraggedImageIds] = useState<number[]>([]);
  const [dropTargetCollectionId, setDropTargetCollectionId] = useState<number | null>(null);
  const [collectionDropFeedback, setCollectionDropFeedback] = useState<string | null>(null);
  const [imageContextMenu, setImageContextMenu] = useState<ImageContextMenuState | null>(null);
  const [collectionContextMenu, setCollectionContextMenu] = useState<CollectionContextMenuState | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isAddRemoteModalOpen, setIsAddRemoteModalOpen] = useState(false);
  const [remoteUrlDraft, setRemoteUrlDraft] = useState("");
  const [remoteAddError, setRemoteAddError] = useState<string | null>(null);
  const [remoteAddSummary, setRemoteAddSummary] = useState<string | null>(null);
  const [remoteAddTone, setRemoteAddTone] = useState<ImportFeedbackTone>("success");
  const [isAddingRemoteImage, setIsAddingRemoteImage] = useState(false);
  const [isAddMidjourneyModalOpen, setIsAddMidjourneyModalOpen] = useState(false);
  const [isAddMidjourneyVideoModalOpen, setIsAddMidjourneyVideoModalOpen] = useState(false);
  const [isAddMidjourneyVideoBatchModalOpen, setIsAddMidjourneyVideoBatchModalOpen] = useState(false);
  const [midjourneyVideoBatchDraft, setMidjourneyVideoBatchDraft] = useState("");
  const [midjourneyVideoBatchError, setMidjourneyVideoBatchError] = useState<string | null>(null);
  const [midjourneyVideoJobDraft, setMidjourneyVideoJobDraft] = useState("");
  const [midjourneyVideoError, setMidjourneyVideoError] = useState<string | null>(null);
  const [midjourneyInputDraft, setMidjourneyInputDraft] = useState("");
  const [midjourneyAddError, setMidjourneyAddError] = useState<string | null>(null);
  const [midjourneyAddSummary, setMidjourneyAddSummary] = useState<string | null>(null);
  const [midjourneyAddTone, setMidjourneyAddTone] = useState<ImportFeedbackTone>("success");
  const [isAddingMidjourneyJob, setIsAddingMidjourneyJob] = useState(false);
  const [isAddMidjourneyBatchModalOpen, setIsAddMidjourneyBatchModalOpen] = useState(false);
  const [midjourneyBatchDraft, setMidjourneyBatchDraft] = useState("");
  const [midjourneyBatchError, setMidjourneyBatchError] = useState<string | null>(null);
  const [midjourneyBatchSummary, setMidjourneyBatchSummary] = useState<string | null>(null);
  const [midjourneyBatchTone, setMidjourneyBatchTone] = useState<ImportFeedbackTone>("success");
  const [midjourneyBatchInvalidLines, setMidjourneyBatchInvalidLines] = useState<
    Array<{ line: string; reason: string }>
  >([]);
  const [isImportingMidjourneyBatch, setIsImportingMidjourneyBatch] = useState(false);
  const [isCreateCollectionModalOpen, setIsCreateCollectionModalOpen] = useState(false);
  const [collectionNameDraft, setCollectionNameDraft] = useState("");
  const [collectionCreateError, setCollectionCreateError] = useState<string | null>(null);
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [collectionToRename, setCollectionToRename] = useState<CollectionSummary | null>(null);
  const [collectionRenameDraft, setCollectionRenameDraft] = useState("");
  const [collectionRenameError, setCollectionRenameError] = useState<string | null>(null);
  const [isRenamingCollection, setIsRenamingCollection] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<CollectionSummary | null>(null);
  const [collectionDeleteError, setCollectionDeleteError] = useState<string | null>(null);
  const [isDeletingCollection, setIsDeletingCollection] = useState(false);
  const [remoteImageIdsToRemove, setRemoteImageIdsToRemove] = useState<number[] | null>(null);
  const [remoteReferenceRemovalError, setRemoteReferenceRemovalError] = useState<string | null>(null);
  const [isRemovingRemoteReferences, setIsRemovingRemoteReferences] = useState(false);
  const [videoThumbnailGenerationResult, setVideoThumbnailGenerationResult] = useState<{
    ok: boolean; message: string; dataUrl?: string; title?: string;
  } | null>(null);
  const [isAddToCollectionModalOpen, setIsAddToCollectionModalOpen] = useState(false);
  const [targetCollectionId, setTargetCollectionId] = useState<number | null>(null);
  const [addToCollectionSummary, setAddToCollectionSummary] = useState<string | null>(null);
  const [addToCollectionTone, setAddToCollectionTone] = useState<ImportFeedbackTone>("success");
  const [addToCollectionError, setAddToCollectionError] = useState<string | null>(null);
  const [isAddingToCollection, setIsAddingToCollection] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isBatchSaving, setIsBatchSaving] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [metadataRefreshToken, setMetadataRefreshToken] = useState(0);
  const [thumbnailSize, setThumbnailSize] = useState<ThumbnailSize>("medium");
  const [midjourneyViewMode, setMidjourneyViewMode] = useState<"images" | "jobs">("images");
  const [simpleSearchQuery, setSimpleSearchQuery] = useState("");
  const [quickWorkflowColors, setQuickWorkflowColors] = useState<WorkflowColor[]>([]);
  const [isAdvancedSearchPanelOpen, setIsAdvancedSearchPanelOpen] = useState(false);
  const [isHelpPanelOpen, setIsHelpPanelOpen] = useState(false);
  const [advancedSearch, setAdvancedSearch] = useState<AdvancedSearchState>({
    status: "idle",
    images: [],
    criteria: createEmptyAdvancedSearchCriteria(),
    error: null
  });
  const [isSelectingFolder, setIsSelectingFolder] = useState(false);
  const [desiredLeftRatio, setDesiredLeftRatio] = useState(DEFAULT_LEFT_RATIO);
  const [desiredRightRatio, setDesiredRightRatio] = useState(DEFAULT_RIGHT_RATIO);
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>({
    left: DEFAULT_LEFT_WIDTH,
    right: DEFAULT_RIGHT_WIDTH
  });
  const [activeResizeSide, setActiveResizeSide] = useState<ResizeSide | null>(null);
  const isAdvancedSearchActive =
    advancedSearch.status === "ready" || advancedSearch.status === "error";
  const activeImageScan =
    libraryView === "web-generic"
      ? genericRemoteImageScan
      : libraryView === "web-midjourney"
        ? midjourneyImageScan
        : libraryView === "web-midjourney-video"
          ? midjourneyVideoScan
        : libraryView === "collection"
          ? collectionImageScan
          : imageScan;
  const contextImages = isAdvancedSearchActive ? advancedSearch.images : activeImageScan.images;
  const searchFilteredImages = isAdvancedSearchActive
    ? contextImages
    : contextImages.filter((image) => imageMatchesSimpleSearch(image, simpleSearchQuery));
  const displayedImages = searchFilteredImages.filter((image) =>
    imageMatchesWorkflowFilters(image, quickWorkflowColors)
  );
  const displayBaseImageCount = searchFilteredImages.length;
  const displayedImageScan: ImageScanState = isAdvancedSearchActive
    ? {
        status:
          advancedSearch.status === "error"
            ? "error"
            : displayedImages.length > 0
              ? "ready"
              : "empty",
        images: displayedImages,
        error: advancedSearch.error
      }
    : {
        ...activeImageScan,
        status:
          activeImageScan.status === "ready" && displayedImages.length === 0
            ? "empty"
            : activeImageScan.status,
        images: displayedImages,
        error: activeImageScan.error
      };
  const selectedBatchImages = displayedImages.filter((image) =>
    selectedImageIds.includes(getImageKey(image))
  );
  const selectedRemoteImages = selectedBatchImages.filter((image) => image.sourceKind === "remote");
  const selectedLocalImageCount = selectedBatchImages.length - selectedRemoteImages.length;
  const contextMenuImage = imageContextMenu
    ? displayedImages.find((image) => getImageKey(image) === imageContextMenu.imageId) ?? null
    : null;
  const canDropImagesOnCollection = draggedImageIds.length > 0;

  useEffect(() => {
    function applyColumnsToWorkspace(): void {
      const workspaceWidth = workspaceRef.current?.getBoundingClientRect().width ?? 0;

      if (workspaceWidth <= 0) {
        return;
      }

      setColumnWidths(calculateColumnWidths(workspaceWidth, desiredLeftRatio, desiredRightRatio));
    }

    applyColumnsToWorkspace();
    window.addEventListener("resize", applyColumnsToWorkspace);

    return () => {
      window.removeEventListener("resize", applyColumnsToWorkspace);
    };
  }, [desiredLeftRatio, desiredRightRatio]);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent): void {
      const session = resizeSessionRef.current;

      if (!session) {
        return;
      }

      const deltaX = event.clientX - session.startX;
      const workspaceWidth = workspaceRef.current?.getBoundingClientRect().width ?? 0;

      if (workspaceWidth <= 0) {
        return;
      }

      if (session.side === "left") {
        const maxLeftWidth = getMaxLeftWidth(workspaceWidth, session.startRightWidth);
        const nextLeftWidth = clamp(session.startLeftWidth + deltaX, MIN_LEFT_WIDTH, maxLeftWidth);

        setDesiredLeftRatio(nextLeftWidth / workspaceWidth);
        setColumnWidths({
          left: Math.round(nextLeftWidth),
          right: session.startRightWidth
        });
        return;
      }

      const maxRightWidth = getMaxRightWidth(workspaceWidth, session.startLeftWidth);
      const nextRightWidth = clamp(session.startRightWidth - deltaX, MIN_RIGHT_WIDTH, maxRightWidth);

      setDesiredRightRatio(nextRightWidth / workspaceWidth);
      setColumnWidths({
        left: session.startLeftWidth,
        right: Math.round(nextRightWidth)
      });
    }

    function handlePointerUp(): void {
      resizeSessionRef.current = null;
      setActiveResizeSide(null);
    }

    if (!activeResizeSide) {
      return undefined;
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [activeResizeSide]);

  function handleResizeStart(side: ResizeSide, event: ReactPointerEvent<HTMLButtonElement>): void {
    event.preventDefault();

    resizeSessionRef.current = {
      side,
      startX: event.clientX,
      startLeftWidth: columnWidths.left,
      startRightWidth: columnWidths.right
    };
    setActiveResizeSide(side);
  }

  const refreshDatabaseStatus = useCallback(async (): Promise<void> => {
    if (!window.iconotheque) {
      return;
    }

    setDatabaseStatus(await window.iconotheque.getDatabaseStatus());
  }, []);

  const scanFolder = useCallback(async (folder: RootFolder): Promise<void> => {
    setLibraryView("local");
    setActiveCollection(null);
    setActiveFolder(folder);
    setSelectedImage(null);
    setSelectedImageIds([]);
    setSelectionAnchorImageId(null);
    setIsViewerOpen(false);
    setIsBatchModalOpen(false);
    setSimpleSearchQuery("");
    setQuickWorkflowColors([]);
    setAdvancedSearch((currentSearch) => ({
      ...currentSearch,
      status: "idle",
      images: [],
      error: null
    }));
    setImageScan({
      status: "loading",
      images: [],
      error: null
    });

    const scanResult = await window.iconotheque.listImagesInRootFolder(folder.path);

    if (!scanResult.ok) {
      setImageScan({
        status: "error",
        images: [],
        error: scanResult.error
      });
      return;
    }

    setImageScan({
      status: scanResult.images.length > 0 ? "ready" : "empty",
      images: scanResult.images,
      error: null
    });
    await refreshDatabaseStatus();
  }, [refreshDatabaseStatus]);

  const loadGenericRemoteImages = useCallback(async (): Promise<void> => {
    if (!window.iconotheque) {
      return;
    }

    setGenericRemoteImageScan((currentScan) => ({
      ...currentScan,
      status: "loading",
      error: null
    }));

    const result = await window.iconotheque.listRemoteImages("generic_url");

    if (!result.ok) {
      setGenericRemoteImageScan({
        status: "error",
        images: [],
        error: result.error
      });
      return;
    }

    setGenericRemoteImageScan({
      status: result.images.length > 0 ? "ready" : "empty",
      images: result.images,
      error: null
    });
  }, []);

  const loadMidjourneyImages = useCallback(async (): Promise<void> => {
    if (!window.iconotheque) {
      return;
    }

    setMidjourneyImageScan((currentScan) => ({
      ...currentScan,
      status: "loading",
      error: null
    }));

    const result = await window.iconotheque.listRemoteImages("midjourney");

    if (!result.ok) {
      setMidjourneyImageScan({
        status: "error",
        images: [],
        error: result.error
      });
      return;
    }

    setMidjourneyImageScan({
      status: result.images.length > 0 ? "ready" : "empty",
      images: result.images.filter((image) => image.mediaKind !== "video"),
      error: null
    });
  }, []);

  const loadMidjourneyVideos = useCallback(async (): Promise<void> => {
    if (!window.iconotheque) return;
    const result = await window.iconotheque.listRemoteImages("midjourney");
    setMidjourneyVideoScan(result.ok ? { status: result.images.filter((image) => image.mediaKind === "video").length ? "ready" : "empty", images: result.images.filter((image) => image.mediaKind === "video"), error: null } : { status: "error", images: [], error: result.error });
  }, []);

  const loadCollections = useCallback(async (): Promise<CollectionSummary[]> => {
    if (!window.iconotheque) {
      return [];
    }

    const result = await window.iconotheque.listCollections();

    if (!result.ok) {
      return [];
    }

    setCollections(result.collections);
    setActiveCollection((currentCollection) => {
      if (!currentCollection) {
        return null;
      }

      return result.collections.find((collection) => collection.id === currentCollection.id) ?? currentCollection;
    });

    return result.collections;
  }, []);

  const loadCollectionImages = useCallback(async (collection: CollectionSummary): Promise<void> => {
    if (!window.iconotheque) {
      return;
    }

    setCollectionImageScan((currentScan) => ({
      ...currentScan,
      status: "loading",
      error: null
    }));

    const result = await window.iconotheque.listCollectionImages(collection.id);

    if (!result.ok) {
      setCollectionImageScan({
        status: "error",
        images: [],
        error: result.error
      });
      return;
    }

    setCollectionImageScan({
      status: result.images.length > 0 ? "ready" : "empty",
      images: result.images,
      error: null
    });
  }, []);

  const buildFolderTree = useCallback(async (folder: RootFolder): Promise<void> => {
    setFolderTreeScan({
      status: "loading",
      tree: null,
      error: null,
      limitReached: false
    });

    const treeResult = await window.iconotheque.buildFolderTree(folder.path);

    if (!treeResult.ok) {
      setFolderTreeScan({
        status: "error",
        tree: null,
        error: treeResult.error,
        limitReached: false
      });
      return;
    }

    setFolderTreeScan({
      status: "ready",
      tree: treeResult.tree,
      error: null,
      limitReached: treeResult.limitReached
    });
    await refreshDatabaseStatus();
  }, [refreshDatabaseStatus]);

  const openRootFolder = useCallback(
    async (folder: RootFolder): Promise<void> => {
      setRootFolder(folder);
      await Promise.all([scanFolder(folder), buildFolderTree(folder)]);
    },
    [buildFolderTree, scanFolder]
  );

  const handleChooseRootFolder = useCallback(async (): Promise<void> => {
    if (isSelectingFolder || !window.iconotheque) {
      return;
    }

    setIsSelectingFolder(true);

    try {
      const selection = await window.iconotheque.selectRootFolder();

      if (!selection.canceled) {
        await openRootFolder(selection.folder);
      }
    } finally {
      setIsSelectingFolder(false);
    }
  }, [isSelectingFolder, openRootFolder]);

  const handleRescanRootFolder = useCallback((): void => {
    if (!activeFolder || imageScan.status === "loading" || !window.iconotheque) {
      return;
    }

    void scanFolder(activeFolder);

    if (rootFolder) {
      void buildFolderTree(rootFolder);
    }
  }, [activeFolder, buildFolderTree, imageScan.status, rootFolder, scanFolder]);

  const handleOpenImageViewer = useCallback((image: ImageFile): void => {
    setSelectedImage(image);
    setIsViewerOpen(true);
  }, []);

  const handleSelectImage = useCallback((image: ImageFile): void => {
    setSelectedImage(image);
    setSelectedImageIds([getImageKey(image)]);
    setSelectionAnchorImageId(getImageKey(image));
  }, []);

  const handleImageContextMenu = useCallback(
    (image: ImageFile, position: { x: number; y: number }): void => {
      const imageId = getImageKey(image);

      if (!selectedImageIds.includes(imageId)) {
        setSelectedImage(image);
        setSelectedImageIds([imageId]);
        setSelectionAnchorImageId(imageId);
      } else {
        setSelectedImage(image);
        setSelectionAnchorImageId(imageId);
      }

      setImageContextMenu({
        imageId,
        x: clamp(
          position.x,
          IMAGE_CONTEXT_MENU_MARGIN,
          window.innerWidth - IMAGE_CONTEXT_MENU_WIDTH - IMAGE_CONTEXT_MENU_MARGIN
        ),
        y: clamp(
          position.y,
          IMAGE_CONTEXT_MENU_MARGIN,
          window.innerHeight - IMAGE_CONTEXT_MENU_HEIGHT - IMAGE_CONTEXT_MENU_MARGIN
        )
      });
      setCollectionContextMenu(null);
    },
    [selectedImageIds]
  );

  const handleMidjourneyJobContextMenu = useCallback(
    (image: ImageFile, jobId: string, position: { x: number; y: number }): void => {
      const imageId = getImageKey(image);
      setSelectedImage(image);
      if (!selectedImageIds.includes(imageId)) {
        setSelectedImageIds([imageId]);
      }
      setSelectionAnchorImageId(imageId);
      setImageContextMenu({
        imageId,
        midjourneyJobId: jobId,
        x: clamp(
          position.x,
          IMAGE_CONTEXT_MENU_MARGIN,
          window.innerWidth - IMAGE_CONTEXT_MENU_WIDTH - IMAGE_CONTEXT_MENU_MARGIN
        ),
        y: clamp(
          position.y,
          IMAGE_CONTEXT_MENU_MARGIN,
          window.innerHeight - IMAGE_CONTEXT_MENU_HEIGHT - IMAGE_CONTEXT_MENU_MARGIN
        )
      });
      setCollectionContextMenu(null);
    },
    [selectedImageIds]
  );

  const handleImageDragStart = useCallback(
    (image: ImageFile): number[] => {
      const imageId = getImageKey(image);
      const nextDraggedImageIds = selectedImageIds.includes(imageId) ? selectedImageIds : [imageId];

      if (!selectedImageIds.includes(imageId)) {
        setSelectedImage(image);
        setSelectedImageIds([imageId]);
        setSelectionAnchorImageId(imageId);
      } else {
        setSelectedImage(image);
        setSelectionAnchorImageId(imageId);
      }

      setDraggedImageIds(nextDraggedImageIds);
      setDropTargetCollectionId(null);
      setCollectionDropFeedback(null);
      setImageContextMenu(null);
      setCollectionContextMenu(null);

      return nextDraggedImageIds;
    },
    [selectedImageIds]
  );

  const handleImageDragEnd = useCallback((): void => {
    setDraggedImageIds([]);
    setDropTargetCollectionId(null);
  }, []);

  const handleSelectImageGroup = useCallback((images: ImageFile[]): void => {
    if (images.length === 0) {
      return;
    }

    setSelectedImage(images[0]);
    setSelectedImageIds(images.map((image) => getImageKey(image)));
    setSelectionAnchorImageId(getImageKey(images[0]));
  }, []);

  const handleImageGroupDragStart = useCallback((images: ImageFile[]): number[] => {
    const imageIds = images.map((image) => getImageKey(image));

    if (images.length > 0) {
      setSelectedImage(images[0]);
      setSelectedImageIds(imageIds);
      setSelectionAnchorImageId(getImageKey(images[0]));
    }

    setDraggedImageIds(imageIds);
    setDropTargetCollectionId(null);
    setCollectionDropFeedback(null);
    setImageContextMenu(null);
    setCollectionContextMenu(null);

    return imageIds;
  }, []);

  const handleCollectionContextMenu = useCallback(
    (collection: CollectionSummary, position: { x: number; y: number }): void => {
      setCollectionContextMenu({
        collection,
        x: clamp(
          position.x,
          IMAGE_CONTEXT_MENU_MARGIN,
          window.innerWidth - COLLECTION_CONTEXT_MENU_WIDTH - IMAGE_CONTEXT_MENU_MARGIN
        ),
        y: clamp(
          position.y,
          IMAGE_CONTEXT_MENU_MARGIN,
          window.innerHeight - COLLECTION_CONTEXT_MENU_HEIGHT - IMAGE_CONTEXT_MENU_MARGIN
        )
      });
      setImageContextMenu(null);
    },
    []
  );

  const handleCollectionDragEnter = useCallback(
    (collection: CollectionSummary): void => {
      if (draggedImageIds.length === 0) {
        return;
      }

      setDropTargetCollectionId(collection.id);
    },
    [draggedImageIds.length]
  );

  const handleCollectionDragLeave = useCallback((collection: CollectionSummary): void => {
    setDropTargetCollectionId((currentTargetId) => (
      currentTargetId === collection.id ? null : currentTargetId
    ));
  }, []);

  const handleCollectionDragOver = useCallback(
    (event: ReactDragEvent<HTMLButtonElement>): void => {
      if (draggedImageIds.length === 0) {
        return;
      }

      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    },
    [draggedImageIds.length]
  );

  const handleToggleImageInSelection = useCallback((image: ImageFile): void => {
    setSelectedImage(image);
    setSelectionAnchorImageId(getImageKey(image));
    setSelectedImageIds((currentImageIds) =>
      currentImageIds.includes(getImageKey(image))
        ? currentImageIds.filter((imageId) => imageId !== getImageKey(image))
        : [...currentImageIds, getImageKey(image)]
    );
  }, []);

  const handleSelectImageRange = useCallback(
    (image: ImageFile): void => {
      const targetImageId = getImageKey(image);
      const anchorImageId = selectionAnchorImageId ?? (selectedImage ? getImageKey(selectedImage) : targetImageId);
      const anchorIndex = displayedImages.findIndex((displayedImage) => getImageKey(displayedImage) === anchorImageId);
      const targetIndex = displayedImages.findIndex((displayedImage) => getImageKey(displayedImage) === targetImageId);

      setSelectedImage(image);

      if (anchorIndex < 0 || targetIndex < 0) {
        setSelectedImageIds([targetImageId]);
        setSelectionAnchorImageId(targetImageId);
        return;
      }

      const [startIndex, endIndex] =
        anchorIndex <= targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
      setSelectedImageIds(
        displayedImages.slice(startIndex, endIndex + 1).map((displayedImage) => getImageKey(displayedImage))
      );
    },
    [displayedImages, selectedImage, selectionAnchorImageId]
  );

  const handleSelectAllDisplayedImages = useCallback((): void => {
    setSelectedImageIds(displayedImages.map((image) => getImageKey(image)));

    if (displayedImages.length > 0) {
      setSelectedImage((currentImage) => currentImage ?? displayedImages[0]);
      setSelectionAnchorImageId(getImageKey(displayedImages[0]));
    }
  }, [displayedImages]);

  const handleClearMultiSelection = useCallback((): void => {
    setSelectedImageIds([]);
    setSelectionAnchorImageId(null);
  }, []);

  const handleAdvancedSearch = useCallback(async (criteria: AdvancedSearchCriteria): Promise<void> => {
    setIsViewerOpen(false);
    setSelectedImage(null);
    setAdvancedSearch({
      status: "loading",
      images: [],
      criteria,
      error: null
    });

    const result = await window.iconotheque.searchAdvanced(criteria);

    if (!result.ok) {
      setAdvancedSearch({
        status: "error",
        images: [],
        criteria,
        error: result.error
      });
      return;
    }

    setAdvancedSearch({
      status: "ready",
      images: result.images,
      criteria,
      error: null
    });
    setSimpleSearchQuery("");
    setIsAdvancedSearchPanelOpen(false);
  }, []);

  const handleResetAdvancedSearch = useCallback((): void => {
    setAdvancedSearch({
      status: "idle",
      images: [],
      criteria: createEmptyAdvancedSearchCriteria(),
      error: null
    });
    setSelectedImage(null);
    setSelectedImageIds([]);
    setSelectionAnchorImageId(null);
    setIsViewerOpen(false);
  }, []);

  const handleSelectWebImages = useCallback((): void => {
    setLibraryView("web-generic");
    setActiveCollection(null);
    setActiveFolder(null);
    setSelectedImage(null);
    setSelectedImageIds([]);
    setSelectionAnchorImageId(null);
    setIsViewerOpen(false);
    setSimpleSearchQuery("");
    setAdvancedSearch((currentSearch) => ({
      ...currentSearch,
      status: "idle",
      images: [],
      error: null
    }));
    void loadGenericRemoteImages();
  }, [loadGenericRemoteImages]);

  const handleSelectMidjourneyImages = useCallback((): void => {
    setLibraryView("web-midjourney");
    setActiveCollection(null);
    setActiveFolder(null);
    setSelectedImage(null);
    setSelectedImageIds([]);
    setSelectionAnchorImageId(null);
    setIsViewerOpen(false);
    setSimpleSearchQuery("");
    setAdvancedSearch((currentSearch) => ({
      ...currentSearch,
      status: "idle",
      images: [],
      error: null
    }));
    void loadMidjourneyImages();
  }, [loadMidjourneyImages]);

  const handleSelectMidjourneyVideos = useCallback((): void => {
    setLibraryView("web-midjourney-video"); setActiveCollection(null); setActiveFolder(null); setSelectedImage(null); setSelectedImageIds([]); setSelectionAnchorImageId(null); setIsViewerOpen(false); setSimpleSearchQuery(""); void loadMidjourneyVideos();
  }, [loadMidjourneyVideos]);

  const handleSelectCollection = useCallback(
    (collection: CollectionSummary): void => {
      setLibraryView("collection");
      setActiveCollection(collection);
      setActiveFolder(null);
      setSelectedImage(null);
      setSelectedImageIds([]);
      setSelectionAnchorImageId(null);
      setIsViewerOpen(false);
      setSimpleSearchQuery("");
      setAdvancedSearch((currentSearch) => ({
        ...currentSearch,
        status: "idle",
        images: [],
        error: null
      }));
      void loadCollectionImages(collection);
    },
    [loadCollectionImages]
  );

  const handleOpenCreateCollectionModal = useCallback((): void => {
    setCollectionNameDraft("");
    setCollectionCreateError(null);
    setIsCreateCollectionModalOpen(true);
  }, []);

  const handleOpenRenameCollectionModal = useCallback((collection: CollectionSummary): void => {
    setCollectionContextMenu(null);
    setCollectionToRename(collection);
    setCollectionRenameDraft(collection.name);
    setCollectionRenameError(null);
  }, []);

  const handleCloseRenameCollectionModal = useCallback((): void => {
    if (isRenamingCollection) {
      return;
    }

    setCollectionToRename(null);
    setCollectionRenameDraft("");
    setCollectionRenameError(null);
  }, [isRenamingCollection]);

  const handleOpenDeleteCollectionModal = useCallback((collection: CollectionSummary): void => {
    setCollectionContextMenu(null);
    setCollectionToDelete(collection);
    setCollectionDeleteError(null);
  }, []);

  const handleCloseDeleteCollectionModal = useCallback((): void => {
    if (isDeletingCollection) {
      return;
    }

    setCollectionToDelete(null);
    setCollectionDeleteError(null);
  }, [isDeletingCollection]);

  const handleOpenAddToCollectionModal = useCallback((): void => {
    if (selectedImageIds.length === 0) {
      return;
    }

    setTargetCollectionId(collections[0]?.id ?? null);
    setAddToCollectionSummary(null);
    setAddToCollectionTone("success");
    setAddToCollectionError(null);
    setIsAddToCollectionModalOpen(true);
  }, [collections, selectedImageIds.length]);

  const handleOpenAddToCollectionFromContextMenu = useCallback((): void => {
    setImageContextMenu(null);
    handleOpenAddToCollectionModal();
  }, [handleOpenAddToCollectionModal]);

  const handleCreateCollection = useCallback(async (): Promise<void> => {
    if (!window.iconotheque || isCreatingCollection) {
      return;
    }

    setIsCreatingCollection(true);
    setCollectionCreateError(null);

    try {
      const result = await window.iconotheque.createCollection({ name: collectionNameDraft });

      if (!result.ok) {
        setCollectionCreateError(result.error);
        return;
      }

      const refreshedCollections = await loadCollections();
      const createdCollection =
        refreshedCollections.find((collection) => collection.id === result.collection.id)
        ?? refreshedCollections.find((collection) => collection.name === result.collection.name)
        ?? result.collection;

      setIsCreateCollectionModalOpen(false);
      handleSelectCollection(createdCollection);
    } catch (error) {
      setCollectionCreateError(getUnknownImportErrorMessage(error, "Impossible de creer la collection."));
    } finally {
      setIsCreatingCollection(false);
    }
  }, [
    collectionNameDraft,
    handleSelectCollection,
    isCreatingCollection,
    loadCollections
  ]);

  const handleRenameCollection = useCallback(async (): Promise<void> => {
    if (!window.iconotheque || !collectionToRename || isRenamingCollection) {
      return;
    }

    const name = collectionRenameDraft.trim().replace(/\s+/g, " ");

    if (!name) {
      setCollectionRenameError("Le nom de collection ne peut pas etre vide.");
      return;
    }

    setIsRenamingCollection(true);
    setCollectionRenameError(null);

    try {
      const result = await window.iconotheque.renameCollection({
        collectionId: collectionToRename.id,
        name
      });

      if (!result.ok) {
        setCollectionRenameError(result.error);
        return;
      }

      const refreshedCollections = await loadCollections();
      const renamedCollection =
        refreshedCollections.find((collection) => collection.id === collectionToRename.id)
        ?? result.collection
        ?? collectionToRename;

      if (activeCollection?.id === collectionToRename.id) {
        setActiveCollection(renamedCollection);
      }

      setCollectionToRename(null);
      setCollectionRenameDraft("");
    } catch (error) {
      setCollectionRenameError(getUnknownImportErrorMessage(error, "Impossible de renommer la collection."));
    } finally {
      setIsRenamingCollection(false);
    }
  }, [
    activeCollection?.id,
    collectionRenameDraft,
    collectionToRename,
    isRenamingCollection,
    loadCollections
  ]);

  const handleDeleteCollection = useCallback(async (): Promise<void> => {
    if (!window.iconotheque || !collectionToDelete || isDeletingCollection) {
      return;
    }

    setIsDeletingCollection(true);
    setCollectionDeleteError(null);

    try {
      const result = await window.iconotheque.deleteCollection({
        collectionId: collectionToDelete.id
      });

      if (!result.ok) {
        setCollectionDeleteError(result.error);
        return;
      }

      const refreshedCollections = await loadCollections();
      setCollectionToDelete(null);

      if (activeCollection?.id === collectionToDelete.id) {
        const nextCollection = refreshedCollections.find((collection) => collection.id !== collectionToDelete.id) ?? null;

        setSelectedImage(null);
        setSelectedImageIds([]);
        setSelectionAnchorImageId(null);
        setIsViewerOpen(false);
        setSimpleSearchQuery("");
        setAdvancedSearch((currentSearch) => ({
          ...currentSearch,
          status: "idle",
          images: [],
          error: null
        }));

        if (nextCollection) {
          handleSelectCollection(nextCollection);
        } else {
          setLibraryView("local");
          setActiveCollection(null);
          setCollectionImageScan({
            status: "idle",
            images: [],
            error: null
          });
        }
      }
    } catch (error) {
      setCollectionDeleteError(getUnknownImportErrorMessage(error, "Impossible de supprimer la collection."));
    } finally {
      setIsDeletingCollection(false);
    }
  }, [
    activeCollection?.id,
    collectionToDelete,
    handleSelectCollection,
    isDeletingCollection,
    loadCollections
  ]);

  const handleAddSelectionToCollection = useCallback(async (): Promise<void> => {
    if (!window.iconotheque || isAddingToCollection || !targetCollectionId) {
      return;
    }

    setIsAddingToCollection(true);
    setAddToCollectionError(null);
    setAddToCollectionSummary(null);

    try {
      const result = await window.iconotheque.addImagesToCollection({
        collectionId: targetCollectionId,
        imageIds: selectedImageIds
      });

      if (!result.ok) {
        setAddToCollectionError(result.error);
        return;
      }

      const addedCount = result.addedCount ?? 0;
      const alreadyPresentCount = result.alreadyPresentCount ?? 0;

      setAddToCollectionSummary(formatAddToCollectionSummary(addedCount, alreadyPresentCount));
      setAddToCollectionTone(addedCount > 0 && alreadyPresentCount === 0 ? "success" : "warning");
      await loadCollections();

      if (activeCollection?.id === targetCollectionId) {
        await loadCollectionImages(activeCollection);
      }
    } catch (error) {
      setAddToCollectionError(getUnknownImportErrorMessage(error, "Impossible d'ajouter a la collection."));
    } finally {
      setIsAddingToCollection(false);
    }
  }, [
    activeCollection,
    isAddingToCollection,
    loadCollectionImages,
    loadCollections,
    selectedImageIds,
    targetCollectionId
  ]);

  const handleDropImagesOnCollection = useCallback(
    async (collection: CollectionSummary): Promise<void> => {
      if (!window.iconotheque || draggedImageIds.length === 0) {
        setDraggedImageIds([]);
        setDropTargetCollectionId(null);
        return;
      }

      const imageIdsToAdd = Array.from(new Set(draggedImageIds));

      setDropTargetCollectionId(null);

      try {
        const result = await window.iconotheque.addImagesToCollection({
          collectionId: collection.id,
          imageIds: imageIdsToAdd
        });

        if (!result.ok) {
          setCollectionDropFeedback(result.error);
          return;
        }

        const addedCount = result.addedCount ?? 0;
        const alreadyPresentCount = result.alreadyPresentCount ?? 0;

        setCollectionDropFeedback(formatAddToCollectionSummary(addedCount, alreadyPresentCount));
        await loadCollections();

        if (activeCollection?.id === collection.id) {
          await loadCollectionImages(collection);
        }
      } catch (error) {
        setCollectionDropFeedback(getUnknownImportErrorMessage(error, "Impossible d'ajouter a la collection."));
      } finally {
        setDraggedImageIds([]);
      }
    },
    [
      activeCollection?.id,
      draggedImageIds,
      loadCollectionImages,
      loadCollections
    ]
  );

  const handleRemoveSelectionFromCollection = useCallback(async (): Promise<void> => {
    if (!window.iconotheque || libraryView !== "collection" || !activeCollection || selectedImageIds.length === 0) {
      return;
    }

    const result = await window.iconotheque.removeImagesFromCollection({
      collectionId: activeCollection.id,
      imageIds: selectedImageIds
    });

    if (!result.ok) {
      return;
    }

    await loadCollections();
    await loadCollectionImages(activeCollection);
    setSelectedImage(null);
    setSelectedImageIds([]);
    setSelectionAnchorImageId(null);
  }, [activeCollection, libraryView, loadCollectionImages, loadCollections, selectedImageIds]);

  const handleRemoveSelectionFromCollectionContextMenu = useCallback((): void => {
    setImageContextMenu(null);
    void handleRemoveSelectionFromCollection();
  }, [handleRemoveSelectionFromCollection]);

  const handleOpenImageViewerFromContextMenu = useCallback((): void => {
    if (!imageContextMenu) {
      return;
    }

    const image = displayedImages.find((displayedImage) => getImageKey(displayedImage) === imageContextMenu.imageId);

    setImageContextMenu(null);

    if (image) {
      handleOpenImageViewer(image);
    }
  }, [displayedImages, handleOpenImageViewer, imageContextMenu]);

  const handleOpenRemoveRemoteReferencesModal = useCallback((): void => {
    if (contextMenuImage?.sourceKind !== "remote" || selectedRemoteImages.length === 0) {
      return;
    }

    setImageContextMenu(null);
    setRemoteImageIdsToRemove(selectedRemoteImages.map((image) => image.imageId));
    setRemoteReferenceRemovalError(null);
  }, [contextMenuImage?.sourceKind, selectedRemoteImages]);

  const handleGenerateVideoThumbnail = useCallback(async (): Promise<void> => {
    if (contextMenuImage?.mediaKind !== "video" || contextMenuImage.remoteProvider !== "midjourney") return;
    setImageContextMenu(null);
    setVideoThumbnailGenerationResult({ ok: true, message: "Génération de la vignette en cours..." });
    const result = await probeMidjourneyVideoFrame(contextMenuImage.imageSrc);
    if (!result.ok) {
      setVideoThumbnailGenerationResult({ ok: false, message: `Échec : ${result.error}` });
      return;
    }

    const saveResult = await window.iconotheque.saveMidjourneyVideoThumbnail({
      imageId: contextMenuImage.imageId,
      dataUrl: result.dataUrl
    });
    if (!saveResult.ok) {
      setVideoThumbnailGenerationResult({ ok: false, message: `Échec : ${saveResult.error}` });
      return;
    }

    setVideoThumbnailGenerationResult({
      ok: true,
      message: `Vignette enregistrée (${result.width}×${result.height}).`,
      dataUrl: result.dataUrl
    });
    void loadMidjourneyVideos();
  }, [contextMenuImage, loadMidjourneyVideos]);

  const handleCloseRemoveRemoteReferencesModal = useCallback((): void => {
    if (isRemovingRemoteReferences) {
      return;
    }

    setRemoteImageIdsToRemove(null);
    setRemoteReferenceRemovalError(null);
  }, [isRemovingRemoteReferences]);

  const handleRemoveRemoteReferences = useCallback(async (): Promise<void> => {
    if (!window.iconotheque || !remoteImageIdsToRemove || isRemovingRemoteReferences) {
      return;
    }

    setIsRemovingRemoteReferences(true);
    setRemoteReferenceRemovalError(null);

    try {
      const result = await window.iconotheque.removeRemoteImagesFromCatalog({
        imageIds: remoteImageIdsToRemove
      });

      if (!result.ok) {
        setRemoteReferenceRemovalError(result.error);
        return;
      }

      const removedImageIdSet = new Set(result.removedImageIds);
      await Promise.all([loadGenericRemoteImages(), loadMidjourneyImages(), loadMidjourneyVideos()]);
      await loadCollections();

      if (activeCollection) {
        await loadCollectionImages(activeCollection);
      }

      if (selectedImage && removedImageIdSet.has(selectedImage.imageId)) {
        setSelectedImage(null);
        setIsViewerOpen(false);
      }

      setSelectedImageIds([]);
      setSelectionAnchorImageId(null);
      setImageContextMenu(null);
      setRemoteImageIdsToRemove(null);
      setAdvancedSearch((currentSearch) => ({
        ...currentSearch,
        status: "idle",
        images: [],
        error: null
      }));
    } catch (error) {
      setRemoteReferenceRemovalError(
        getUnknownImportErrorMessage(error, "Impossible de retirer les references distantes.")
      );
    } finally {
      setIsRemovingRemoteReferences(false);
    }
  }, [
    activeCollection,
    isRemovingRemoteReferences,
    loadCollectionImages,
    loadCollections,
    loadGenericRemoteImages,
    loadMidjourneyImages,
    loadMidjourneyVideos,
    remoteImageIdsToRemove,
    selectedImage
  ]);

  const handleCopyMidjourneyJobId = useCallback(async (): Promise<void> => {
    if (!contextMenuImage || contextMenuImage.remoteProvider !== "midjourney" || !contextMenuImage.remoteProviderGroupId) {
      return;
    }
    setImageContextMenu(null);
    await window.iconotheque.copyMidjourneyJobId({ imageId: contextMenuImage.imageId });
  }, [contextMenuImage]);

  const handleDownloadMidjourneyImage = useCallback(async (): Promise<void> => {
    if (!contextMenuImage || contextMenuImage.remoteProvider !== "midjourney" || contextMenuImage.mediaKind === "video") return;
    setImageContextMenu(null);
    const result = await window.iconotheque.downloadMidjourneyImage({ imageId: contextMenuImage.imageId });
    if (!result.ok) {
      setVideoThumbnailGenerationResult({
        ok: false,
        title: "Téléchargement Midjourney",
        message: `Téléchargement impossible : ${result.error}`
      });
      return;
    }
    setVideoThumbnailGenerationResult({
      ok: true,
      title: "Téléchargement Midjourney",
      message: "Image Midjourney téléchargée localement."
    });
    await loadMidjourneyImages();
  }, [contextMenuImage, loadMidjourneyImages]);

  const handleDownloadMidjourneyJobImages = useCallback(async (): Promise<void> => {
    const jobId = imageContextMenu?.midjourneyJobId;
    if (!jobId || contextMenuImage?.remoteProvider !== "midjourney" || contextMenuImage.mediaKind === "video") return;
    setImageContextMenu(null);
    const result = await window.iconotheque.downloadMidjourneyJobImages({ jobId });
    if (!result.ok) {
      setVideoThumbnailGenerationResult({
        ok: false,
        title: "Téléchargement Midjourney",
        message: `Téléchargement impossible : ${result.error}`
      });
      return;
    }
    setVideoThumbnailGenerationResult({
      ok: result.failedCount === 0,
      title: "Téléchargement Midjourney",
      message: `Job Midjourney : ${result.downloadedCount} téléchargée(s), ${result.reusedCount} déjà présente(s), ${result.failedCount} échec(s).`
    });
    await loadMidjourneyImages();
  }, [contextMenuImage, imageContextMenu?.midjourneyJobId, loadMidjourneyImages]);

  const handleOpenMidjourneyJobFolder = useCallback(async (): Promise<void> => {
    if (!contextMenuImage || contextMenuImage.remoteProvider !== "midjourney" || contextMenuImage.mediaKind === "video" || !contextMenuImage.remoteProviderGroupId) {
      return;
    }
    setImageContextMenu(null);
    const result = await window.iconotheque.openMidjourneyJobFolder({
      jobId: contextMenuImage.remoteProviderGroupId
    });
    setVideoThumbnailGenerationResult(
      result.ok
        ? { ok: true, title: "Dossier Midjourney", message: "Dossier local du job ouvert." }
        : { ok: false, title: "Dossier Midjourney", message: `Ouverture impossible : ${result.error}` }
    );
  }, [contextMenuImage]);

  const handleOpenAddRemoteModal = useCallback((): void => {
    setRemoteUrlDraft("");
    setRemoteAddError(null);
    setRemoteAddSummary(null);
    setRemoteAddTone("success");
    setIsAddRemoteModalOpen(true);
  }, []);

  const handleOpenAddMidjourneyModal = useCallback((): void => {
    setMidjourneyInputDraft("");
    setMidjourneyAddError(null);
    setMidjourneyAddSummary(null);
    setMidjourneyAddTone("success");
    setIsAddMidjourneyModalOpen(true);
  }, []);
  const handleOpenAddMidjourneyVideoModal = useCallback((): void => { setMidjourneyVideoJobDraft(""); setMidjourneyVideoError(null); setIsAddMidjourneyVideoModalOpen(true); }, []);
  const handleAddMidjourneyVideoJob = useCallback(async (): Promise<void> => {
    if (!window.iconotheque) return;
    const result = await window.iconotheque.addMidjourneyVideoJob(midjourneyVideoJobDraft);
    if (!result.ok) { setMidjourneyVideoError(result.error); return; }
    setIsAddMidjourneyVideoModalOpen(false); await loadMidjourneyVideos();
  }, [loadMidjourneyVideos, midjourneyVideoJobDraft]);
  const handleOpenAddMidjourneyVideoBatchModal = useCallback((): void => { setMidjourneyVideoBatchDraft(""); setMidjourneyVideoBatchError(null); setIsAddMidjourneyVideoBatchModalOpen(true); }, []);
  const handleAddMidjourneyVideoJobsBatch = useCallback(async (): Promise<void> => {
    if (!window.iconotheque) return;
    const result = await window.iconotheque.addMidjourneyVideoJobsBatch(midjourneyVideoBatchDraft);
    if (!result.ok) { setMidjourneyVideoBatchError(result.error); return; }
    setIsAddMidjourneyVideoBatchModalOpen(false); await loadMidjourneyVideos();
  }, [loadMidjourneyVideos, midjourneyVideoBatchDraft]);

  const handleOpenAddMidjourneyBatchModal = useCallback((): void => {
    setMidjourneyBatchDraft("");
    setMidjourneyBatchError(null);
    setMidjourneyBatchSummary(null);
    setMidjourneyBatchTone("success");
    setMidjourneyBatchInvalidLines([]);
    setIsAddMidjourneyBatchModalOpen(true);
  }, []);

  const handleAddRemoteImage = useCallback(async (): Promise<void> => {
    if (!window.iconotheque || isAddingRemoteImage) {
      return;
    }

    setIsAddingRemoteImage(true);
    setRemoteAddError(null);
    setRemoteAddSummary(null);
    setRemoteAddTone("success");

    try {
      const result = await window.iconotheque.addRemoteImageFromUrl(remoteUrlDraft);

      if (!result.ok) {
        setRemoteAddError(result.error);
        return;
      }

      if (result.route === "midjourney") {
        const isCleanMidjourneySuccess = result.createdCount === 4 && result.existingCount === 0;

        setRemoteAddSummary(formatMidjourneyRoutedSummary(result.createdCount, result.existingCount));
        setRemoteAddTone(isCleanMidjourneySuccess ? "success" : "warning");
        setLibraryView("web-midjourney");
        setActiveCollection(null);
        setActiveFolder(null);
        await loadMidjourneyImages();

        const firstImage = result.images[0];

        if (firstImage) {
          setSelectedImage(firstImage);
          setSelectedImageIds([getImageKey(firstImage)]);
          setSelectionAnchorImageId(getImageKey(firstImage));
        }

        await refreshDatabaseStatus();

        if (isCleanMidjourneySuccess) {
          setIsAddRemoteModalOpen(false);
        }

        return;
      }

      setIsAddRemoteModalOpen(false);
      setLibraryView("web-generic");
      setActiveCollection(null);
      setActiveFolder(null);
      await loadGenericRemoteImages();
      setSelectedImage(result.image);
      setSelectedImageIds([getImageKey(result.image)]);
      setSelectionAnchorImageId(getImageKey(result.image));
      await refreshDatabaseStatus();
    } catch (error) {
      setRemoteAddError(getUnknownImportErrorMessage(error, "Impossible d'ajouter l'image web."));
    } finally {
      setIsAddingRemoteImage(false);
    }
  }, [
    isAddingRemoteImage,
    loadGenericRemoteImages,
    loadMidjourneyImages,
    refreshDatabaseStatus,
    remoteUrlDraft
  ]);

  const handleAddMidjourneyJob = useCallback(async (): Promise<void> => {
    if (!window.iconotheque || isAddingMidjourneyJob) {
      return;
    }

    setIsAddingMidjourneyJob(true);
    setMidjourneyAddError(null);
    setMidjourneyAddSummary(null);
    setMidjourneyAddTone("success");

    try {
      const result = await window.iconotheque.addMidjourneyJob(midjourneyInputDraft);

      if (!result.ok) {
        setMidjourneyAddError(result.error);
        return;
      }

      const isCleanMidjourneySuccess = result.createdCount === 4 && result.existingCount === 0;

      setMidjourneyAddSummary(formatMidjourneyJobSummary(result.createdCount, result.existingCount));
      setMidjourneyAddTone(isCleanMidjourneySuccess ? "success" : "warning");
      setLibraryView("web-midjourney");
      setActiveCollection(null);
      setActiveFolder(null);
      await loadMidjourneyImages();

      const firstImage = result.images[0];

      if (firstImage) {
        setSelectedImage(firstImage);
        setSelectedImageIds([getImageKey(firstImage)]);
        setSelectionAnchorImageId(getImageKey(firstImage));
      }

      await refreshDatabaseStatus();

      if (isCleanMidjourneySuccess) {
        setIsAddMidjourneyModalOpen(false);
      }
    } catch (error) {
      setMidjourneyAddError(getUnknownImportErrorMessage(error, "Impossible d'ajouter le job Midjourney."));
    } finally {
      setIsAddingMidjourneyJob(false);
    }
  }, [isAddingMidjourneyJob, loadMidjourneyImages, midjourneyInputDraft, refreshDatabaseStatus]);

  const handleAddMidjourneyJobsBatch = useCallback(async (): Promise<void> => {
    if (!window.iconotheque || isImportingMidjourneyBatch) {
      return;
    }

    setIsImportingMidjourneyBatch(true);
    setMidjourneyBatchError(null);
    setMidjourneyBatchSummary(null);
    setMidjourneyBatchTone("success");
    setMidjourneyBatchInvalidLines([]);

    try {
      const result = await window.iconotheque.addMidjourneyJobsBatch(midjourneyBatchDraft);

      if (!result.ok) {
        setMidjourneyBatchError(result.error);
        return;
      }

      const isCleanBatchSuccess = result.invalidLineCount === 0 && result.createdImageCount > 0;
      const isDuplicateOnlyBatch = result.createdImageCount === 0 && result.existingImageCount > 0;

      setMidjourneyBatchSummary(
        formatMidjourneyBatchSummary(
          result.detectedJobCount,
          result.createdImageCount,
          result.existingImageCount,
          result.invalidLineCount
        )
      );
      setMidjourneyBatchTone(isDuplicateOnlyBatch || result.invalidLineCount > 0 ? "warning" : "success");
      setMidjourneyBatchInvalidLines(result.invalidLines);
      setLibraryView("web-midjourney");
      setActiveCollection(null);
      setActiveFolder(null);
      setSelectedImage(null);
      setSelectedImageIds([]);
      setSelectionAnchorImageId(null);
      await loadMidjourneyImages();

      const firstImage = result.images[0];

      if (firstImage) {
        setSelectedImage(firstImage);
        setSelectedImageIds([getImageKey(firstImage)]);
        setSelectionAnchorImageId(getImageKey(firstImage));
      }

      await refreshDatabaseStatus();

      if (isCleanBatchSuccess) {
        setIsAddMidjourneyBatchModalOpen(false);
      }
    } catch (error) {
      setMidjourneyBatchError(getUnknownImportErrorMessage(error, "Impossible d'importer les jobs Midjourney."));
    } finally {
      setIsImportingMidjourneyBatch(false);
    }
  }, [isImportingMidjourneyBatch, loadMidjourneyImages, midjourneyBatchDraft, refreshDatabaseStatus]);

  const handleToggleQuickWorkflowColor = useCallback((workflowColor: WorkflowColor): void => {
    setQuickWorkflowColors((currentColors) =>
      currentColors.includes(workflowColor)
        ? currentColors.filter((currentColor) => currentColor !== workflowColor)
        : [...currentColors, workflowColor]
    );
  }, []);

  const handleImageWorkflowColorChange = useCallback(
    (imageId: number, workflowColor: WorkflowColor): void => {
      setImageScan((currentScan) => ({
        ...currentScan,
        images: currentScan.images.map((image) =>
          getImageKey(image) === imageId ? { ...image, workflowColor } : image
        )
      }));
      setGenericRemoteImageScan((currentScan) => ({
        ...currentScan,
        images: currentScan.images.map((image) =>
          getImageKey(image) === imageId ? { ...image, workflowColor } : image
        )
      }));
      setMidjourneyImageScan((currentScan) => ({
        ...currentScan,
        images: currentScan.images.map((image) =>
          getImageKey(image) === imageId ? { ...image, workflowColor } : image
        )
      }));
      setCollectionImageScan((currentScan) => ({
        ...currentScan,
        images: currentScan.images.map((image) =>
          getImageKey(image) === imageId ? { ...image, workflowColor } : image
        )
      }));
      setAdvancedSearch((currentSearch) => ({
        ...currentSearch,
        images: currentSearch.images.map((image) =>
          getImageKey(image) === imageId ? { ...image, workflowColor } : image
        )
      }));
      setSelectedImage((currentImage) =>
        currentImage && getImageKey(currentImage) === imageId
          ? { ...currentImage, workflowColor }
          : currentImage
      );
    },
    []
  );

  const handleBatchWorkflowColorChange = useCallback(
    (imageIds: number[], workflowColor: WorkflowColor): void => {
      const imageIdSet = new Set(imageIds);

      setImageScan((currentScan) => ({
        ...currentScan,
        images: currentScan.images.map((image) =>
          imageIdSet.has(getImageKey(image)) ? { ...image, workflowColor } : image
        )
      }));
      setGenericRemoteImageScan((currentScan) => ({
        ...currentScan,
        images: currentScan.images.map((image) =>
          imageIdSet.has(getImageKey(image)) ? { ...image, workflowColor } : image
        )
      }));
      setMidjourneyImageScan((currentScan) => ({
        ...currentScan,
        images: currentScan.images.map((image) =>
          imageIdSet.has(getImageKey(image)) ? { ...image, workflowColor } : image
        )
      }));
      setCollectionImageScan((currentScan) => ({
        ...currentScan,
        images: currentScan.images.map((image) =>
          imageIdSet.has(getImageKey(image)) ? { ...image, workflowColor } : image
        )
      }));
      setAdvancedSearch((currentSearch) => ({
        ...currentSearch,
        images: currentSearch.images.map((image) =>
          imageIdSet.has(getImageKey(image)) ? { ...image, workflowColor } : image
        )
      }));
      setSelectedImage((currentImage) =>
        currentImage && imageIdSet.has(getImageKey(currentImage))
          ? { ...currentImage, workflowColor }
          : currentImage
      );
    },
    []
  );

  const handleOpenBatchModal = useCallback((): void => {
    if (selectedBatchImages.length < 2) {
      setBatchError("Selectionnez au moins deux images pour modifier par lot.");
      return;
    }

    setBatchError(null);
    setIsBatchModalOpen(true);
  }, [selectedBatchImages.length]);

  const handleSaveBatchMetadata = useCallback(
    async (patch: BatchImageUserMetadataPatch): Promise<void> => {
      if (selectedBatchImages.length < 2 || isBatchSaving) {
        return;
      }

      setIsBatchSaving(true);
      setBatchError(null);

      const imageIdentities = selectedBatchImages.map(getImageIdentity);
      const imageIds = selectedBatchImages.map((image) => getImageKey(image));
      const result = await window.iconotheque.batchUpdateImageUserMetadata(imageIdentities, patch);

      setIsBatchSaving(false);

      if (!result.ok) {
        setBatchError(result.error);
        return;
      }

      if (result.workflowColor !== null) {
        handleBatchWorkflowColorChange(imageIds, result.workflowColor);
      }

      if (selectedImage && imageIds.includes(getImageKey(selectedImage))) {
        setMetadataRefreshToken((currentToken) => currentToken + 1);
      }

      setBatchError(`Lot enregistre : ${result.updatedCount} image(s).`);
      setIsBatchModalOpen(false);
    },
    [handleBatchWorkflowColorChange, isBatchSaving, selectedBatchImages, selectedImage]
  );

  useEffect(() => {
    if (!window.iconotheque) {
      return undefined;
    }

    return window.iconotheque.onAddRemoteImageRequest(handleOpenAddRemoteModal);
  }, [handleOpenAddRemoteModal]);

  useEffect(() => {
    if (!window.iconotheque) {
      return undefined;
    }

    return window.iconotheque.onAddMidjourneyJobRequest(handleOpenAddMidjourneyModal);
  }, [handleOpenAddMidjourneyModal]);
  useEffect(() => {
    if (!window.iconotheque) return undefined;
    return window.iconotheque.onAddMidjourneyVideoJobRequest(handleOpenAddMidjourneyVideoModal);
  }, [handleOpenAddMidjourneyVideoModal]);
  useEffect(() => {
    if (!window.iconotheque) return undefined;
    return window.iconotheque.onAddMidjourneyVideoJobsBatchRequest(handleOpenAddMidjourneyVideoBatchModal);
  }, [handleOpenAddMidjourneyVideoBatchModal]);

  useEffect(() => {
    if (!window.iconotheque) {
      return undefined;
    }

    return window.iconotheque.onAddMidjourneyJobsBatchRequest(handleOpenAddMidjourneyBatchModal);
  }, [handleOpenAddMidjourneyBatchModal]);

  useEffect(() => {
    if (!window.iconotheque) return undefined;
    return window.iconotheque.onMidjourneyObservationsImported(() => {
      void loadMidjourneyImages();
      void loadMidjourneyVideos();
    });
  }, [loadMidjourneyImages, loadMidjourneyVideos]);

  useEffect(() => {
    if (!window.iconotheque) {
      return undefined;
    }

    return window.iconotheque.onCreateCollectionRequest(handleOpenCreateCollectionModal);
  }, [handleOpenCreateCollectionModal]);

  useEffect(() => {
    if (!window.iconotheque) {
      return undefined;
    }

    return window.iconotheque.onAddSelectionToCollectionRequest(handleOpenAddToCollectionModal);
  }, [handleOpenAddToCollectionModal]);

  useEffect(() => {
    if (!window.iconotheque) {
      return undefined;
    }

    return window.iconotheque.onRemoveSelectionFromCollectionRequest(() => {
      void handleRemoveSelectionFromCollection();
    });
  }, [handleRemoveSelectionFromCollection]);

  useEffect(() => {
    if (!imageContextMenu) {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setImageContextMenu(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [imageContextMenu]);

  useEffect(() => {
    if (!collectionContextMenu) {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setCollectionContextMenu(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [collectionContextMenu]);

  useEffect(() => {
    if (!window.iconotheque) {
      return;
    }

    void loadGenericRemoteImages();
    void loadMidjourneyImages();
    void loadMidjourneyVideos();
    void loadCollections();
  }, [loadCollections, loadGenericRemoteImages, loadMidjourneyImages, loadMidjourneyVideos]);

  useEffect(() => {
    if (!window.iconotheque) {
      return undefined;
    }

    return window.iconotheque.onRootFolderSelectedFromMenu((folder) => {
      void openRootFolder(folder);
    });
  }, [openRootFolder]);

  useEffect(() => {
    if (!window.iconotheque) {
      return undefined;
    }

    return window.iconotheque.onRescanRootFolderRequest(handleRescanRootFolder);
  }, [handleRescanRootFolder]);

  useEffect(() => {
    if (!window.iconotheque) {
      return undefined;
    }

    return window.iconotheque.onThumbnailSizeRequest(setThumbnailSize);
  }, []);

  useEffect(() => {
    if (!window.iconotheque) {
      return undefined;
    }

    return window.iconotheque.onAdvancedSearchRequest(() => {
      setIsAdvancedSearchPanelOpen(true);
    });
  }, []);

  useEffect(() => {
    if (!window.iconotheque) {
      return undefined;
    }

    return window.iconotheque.onBatchEditRequest(handleOpenBatchModal);
  }, [handleOpenBatchModal]);

  useEffect(() => {
    if (!window.iconotheque) {
      return;
    }

    window.iconotheque.setBatchEditAvailable(selectedBatchImages.length >= 2);
  }, [selectedBatchImages.length]);

  useEffect(() => {
    if (!window.iconotheque) {
      return;
    }

    window.iconotheque.setCollectionMenuAvailability(
      selectedImageIds.length > 0 && collections.length > 0,
      libraryView === "collection" && !isAdvancedSearchActive && selectedImageIds.length > 0
    );
  }, [collections.length, isAdvancedSearchActive, libraryView, selectedImageIds.length]);

  useEffect(() => {
    if (!window.iconotheque) {
      return undefined;
    }

    return window.iconotheque.onHelpRequest(() => {
      setIsHelpPanelOpen(true);
    });
  }, []);

  useEffect(() => {
    void refreshDatabaseStatus();
  }, [refreshDatabaseStatus]);

  useEffect(() => {
    if (!selectedImage) {
      setIsViewerOpen(false);
    }
  }, [selectedImage]);

  useEffect(() => {
    if (!selectedImage) {
      return;
    }

    if (!displayedImages.some((image) => getImageKey(image) === getImageKey(selectedImage))) {
      setSelectedImage(null);
      setIsViewerOpen(false);
    }
  }, [displayedImages, selectedImage]);

  useEffect(() => {
    if (!imageContextMenu) {
      return;
    }

    if (!displayedImages.some((image) => getImageKey(image) === imageContextMenu.imageId)) {
      setImageContextMenu(null);
    }
  }, [displayedImages, imageContextMenu]);

  useEffect(() => {
    if (!collectionDropFeedback) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setCollectionDropFeedback(null);
    }, 5000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [collectionDropFeedback]);

  useEffect(() => {
    setImageContextMenu(null);
    setCollectionContextMenu(null);
    setDropTargetCollectionId(null);
  }, [activeCollection?.id, activeFolder?.path, isAdvancedSearchActive, libraryView]);

  useEffect(() => {
    const visibleImageIdSet = new Set(displayedImages.map((image) => getImageKey(image)));

    setSelectedImageIds((currentImageIds) =>
      currentImageIds.filter((imageId) => visibleImageIdSet.has(imageId))
    );

    if (selectionAnchorImageId && !visibleImageIdSet.has(selectionAnchorImageId)) {
      setSelectionAnchorImageId(null);
    }
  }, [displayedImages, selectionAnchorImageId]);

  return (
    <main className={activeResizeSide ? "app-shell app-shell-resizing" : "app-shell"}>
      <TopBar
        rootFolder={rootFolder}
        isSelectingFolder={isSelectingFolder}
      />
      <section
        className="workspace"
        ref={workspaceRef}
        aria-label="Espace principal Iconotheque"
        style={{
          "--left-column-width": `${columnWidths.left}px`,
          "--right-column-width": `${columnWidths.right}px`
        } as CSSProperties}
      >
        <FolderTree
          rootFolder={rootFolder}
          folderTreeScan={folderTreeScan}
          selectedFolderPath={libraryView === "local" ? activeFolder?.path ?? null : null}
          activeSource={libraryView}
          collections={collections}
          selectedCollectionId={activeCollection?.id ?? null}
          dropTargetCollectionId={dropTargetCollectionId}
          canDropImagesOnCollection={canDropImagesOnCollection}
          genericRemoteImageCount={genericRemoteImageScan.images.length}
          midjourneyImageCount={midjourneyImageScan.images.length}
          midjourneyVideoCount={midjourneyVideoScan.images.length}
          onSelectFolder={scanFolder}
          onSelectWebImages={handleSelectWebImages}
          onSelectMidjourneyImages={handleSelectMidjourneyImages}
          onSelectMidjourneyVideos={handleSelectMidjourneyVideos}
          onSelectCollection={handleSelectCollection}
          onCollectionContextMenu={handleCollectionContextMenu}
          onCollectionDragEnter={handleCollectionDragEnter}
          onCollectionDragLeave={handleCollectionDragLeave}
          onCollectionDragOver={handleCollectionDragOver}
          onCollectionDrop={(collection) => {
            void handleDropImagesOnCollection(collection);
          }}
          onCreateCollection={handleOpenCreateCollectionModal}
        />
        <button
          className="resize-handle resize-handle-left"
          type="button"
          aria-label="Redimensionner la colonne dossiers"
          aria-orientation="vertical"
          onPointerDown={(event) => handleResizeStart("left", event)}
        />
        <ImageGrid
          rootFolder={activeFolder}
          viewKind={libraryView}
          collectionName={activeCollection?.name ?? null}
          imageScan={displayedImageScan}
          selectedImage={selectedImage}
          selectedImageIds={selectedImageIds}
          thumbnailSize={thumbnailSize}
          simpleSearchQuery={simpleSearchQuery}
          totalImageCount={isAdvancedSearchActive ? advancedSearch.images.length : activeImageScan.images.length}
          workflowFilterBaseCount={displayBaseImageCount}
          quickWorkflowColors={quickWorkflowColors}
          isAdvancedSearchActive={isAdvancedSearchActive}
          advancedSearchStatus={advancedSearch.status}
          midjourneyViewMode={midjourneyViewMode}
          onMidjourneyViewModeChange={setMidjourneyViewMode}
          onSelectImage={handleSelectImage}
          onSelectImageGroup={handleSelectImageGroup}
          onToggleImageSelection={handleToggleImageInSelection}
          onSelectImageRange={handleSelectImageRange}
          onSelectAllImages={handleSelectAllDisplayedImages}
          onClearMultiSelection={handleClearMultiSelection}
          onOpenImage={handleOpenImageViewer}
          onImageContextMenu={handleImageContextMenu}
          onMidjourneyJobContextMenu={handleMidjourneyJobContextMenu}
          onImageDragStart={handleImageDragStart}
          onImageGroupDragStart={handleImageGroupDragStart}
          onImageDragEnd={handleImageDragEnd}
          onOpenRootFolder={handleChooseRootFolder}
          onSimpleSearchChange={setSimpleSearchQuery}
          onClearSimpleSearch={() => setSimpleSearchQuery("")}
          onOpenAdvancedSearch={() => setIsAdvancedSearchPanelOpen(true)}
          onClearAdvancedSearch={handleResetAdvancedSearch}
          onToggleWorkflowColor={handleToggleQuickWorkflowColor}
          onClearWorkflowColors={() => setQuickWorkflowColors([])}
        />
        <button
          className="resize-handle resize-handle-right"
          type="button"
          aria-label="Redimensionner la colonne informations"
          aria-orientation="vertical"
          onPointerDown={(event) => handleResizeStart("right", event)}
        />
        <InfoPanel
          rootFolder={libraryView === "local" ? activeFolder : null}
          imageScan={displayedImageScan}
          selectedImage={selectedImage}
          selectedImageCount={selectedBatchImages.length}
          databaseStatus={databaseStatus}
          metadataRefreshToken={metadataRefreshToken}
          onOpenBatchMetadataEditor={handleOpenBatchModal}
          onClearMultiSelection={handleClearMultiSelection}
          onImageWorkflowColorChange={handleImageWorkflowColorChange}
        />
      </section>
      {imageContextMenu ? (
        <div
          className="image-context-menu-layer"
          role="presentation"
          onClick={() => setImageContextMenu(null)}
          onContextMenu={(event) => {
            event.preventDefault();
            setImageContextMenu(null);
          }}
        >
          <div
            className="image-context-menu"
            role="menu"
            aria-label="Actions image"
            style={{
              left: imageContextMenu.x,
              top: imageContextMenu.y
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" role="menuitem" onClick={handleOpenImageViewerFromContextMenu}>
              Ouvrir dans la visionneuse
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={selectedImageIds.length === 0 || collections.length === 0}
              onClick={handleOpenAddToCollectionFromContextMenu}
            >
              Ajouter a une collection...
            </button>
            {libraryView === "collection" && !isAdvancedSearchActive ? (
              <button
                type="button"
                role="menuitem"
                disabled={selectedImageIds.length === 0}
                onClick={handleRemoveSelectionFromCollectionContextMenu}
              >
                Retirer de cette collection
              </button>
            ) : null}
            {contextMenuImage?.sourceKind === "remote" && selectedRemoteImages.length > 0 ? (
              <button type="button" role="menuitem" onClick={handleOpenRemoveRemoteReferencesModal}>
                Retirer d'Iconotheque...
              </button>
            ) : null}
            {contextMenuImage?.remoteProvider === "midjourney" && contextMenuImage.remoteProviderGroupId ? (
              <button type="button" role="menuitem" onClick={() => { void handleCopyMidjourneyJobId(); }}>
                Copier le job ID
              </button>
            ) : null}
            {contextMenuImage?.remoteProvider === "midjourney" && contextMenuImage.remoteProviderGroupId && contextMenuImage.mediaKind !== "video" ? (
              <button type="button" role="menuitem" onClick={() => { void handleOpenMidjourneyJobFolder(); }}>
                Ouvrir le dossier du job MJ...
              </button>
            ) : null}
            {imageContextMenu.midjourneyJobId && contextMenuImage?.remoteProvider === "midjourney" && contextMenuImage.mediaKind !== "video" ? (
              <button type="button" role="menuitem" onClick={() => { void handleDownloadMidjourneyJobImages(); }}>
                Télécharger les 4 images du job MJ
              </button>
            ) : null}
            {!imageContextMenu.midjourneyJobId && contextMenuImage?.remoteProvider === "midjourney" && contextMenuImage.mediaKind !== "video" ? (
              <button type="button" role="menuitem" onClick={() => { void handleDownloadMidjourneyImage(); }}>
                Télécharger cette image MJ
              </button>
            ) : null}
            {contextMenuImage?.mediaKind === "video" && contextMenuImage.remoteProvider === "midjourney" ? (
              <button type="button" role="menuitem" onClick={() => { void handleGenerateVideoThumbnail(); }}>
                Générer la vignette vidéo
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {collectionContextMenu ? (
        <div
          className="image-context-menu-layer"
          role="presentation"
          onClick={() => setCollectionContextMenu(null)}
          onContextMenu={(event) => {
            event.preventDefault();
            setCollectionContextMenu(null);
          }}
        >
          <div
            className="image-context-menu"
            role="menu"
            aria-label="Actions collection"
            style={{
              left: collectionContextMenu.x,
              top: collectionContextMenu.y
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => handleOpenRenameCollectionModal(collectionContextMenu.collection)}
            >
              Renommer la collection...
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => handleOpenDeleteCollectionModal(collectionContextMenu.collection)}
            >
              Supprimer la collection...
            </button>
          </div>
        </div>
      ) : null}
      <StatusBar
        rootFolder={libraryView === "local" ? activeFolder : null}
        imageScan={activeImageScan}
        selectedImage={selectedImage}
        selectedImageCount={selectedBatchImages.length}
        isSelectingFolder={isSelectingFolder}
        isScanning={activeImageScan.status === "loading"}
        thumbnailSize={thumbnailSize}
        databaseStatus={databaseStatus}
        searchModeLabel={
          isAdvancedSearchActive ? `Recherche : ${advancedSearch.images.length} resultat(s)` : null
        }
        workflowFilterLabel={
          quickWorkflowColors.length > 0
            ? `Workflow : ${displayedImages.length} / ${displayBaseImageCount}`
            : null
        }
        collectionDropFeedback={collectionDropFeedback}
        sourceLabel={
          libraryView === "web-generic"
            ? "Web / Images par URL"
            : libraryView === "web-midjourney"
              ? "Web / Midjourney"
              : libraryView === "collection"
                ? `Collection : ${activeCollection?.name ?? ""}`
                : undefined
        }
        sourceTitle={
          libraryView === "collection"
            ? "Collection virtuelle"
            : libraryView === "local"
              ? undefined
              : "Source virtuelle Web"
        }
        onOpenRootFolder={handleChooseRootFolder}
        onRescanRootFolder={handleRescanRootFolder}
        onThumbnailSizeChange={setThumbnailSize}
        onOpenBatchMetadataEditor={handleOpenBatchModal}
      />
      {isViewerOpen && selectedImage ? (
        <ImageViewer
          images={displayedImages}
          selectedImage={selectedImage}
          onSelectImage={setSelectedImage}
          onClose={() => setIsViewerOpen(false)}
        />
      ) : null}
      <AdvancedSearchPanel
        isOpen={isAdvancedSearchPanelOpen}
        isSearching={advancedSearch.status === "loading"}
        initialCriteria={advancedSearch.criteria}
        onSearch={(criteria) => {
          void handleAdvancedSearch(criteria);
        }}
        onReset={handleResetAdvancedSearch}
        onClose={() => setIsAdvancedSearchPanelOpen(false)}
      />
      <BatchMetadataModal
        isOpen={isBatchModalOpen}
        imageCount={selectedBatchImages.length}
        isSaving={isBatchSaving}
        error={batchError}
        onSave={(patch) => {
          void handleSaveBatchMetadata(patch);
        }}
        onClose={() => setIsBatchModalOpen(false)}
      />
      {isCreateCollectionModalOpen ? (
        <div className="batch-modal-overlay" role="presentation">
          <section className="remote-image-modal" role="dialog" aria-modal="true" aria-labelledby="create-collection-title">
            <div className="batch-modal-heading">
              <div>
                <h2 id="create-collection-title">Nouvelle collection</h2>
                <p>Les collections sont virtuelles et ne modifient aucun fichier.</p>
              </div>
              <button type="button" onClick={() => setIsCreateCollectionModalOpen(false)}>
                Fermer
              </button>
            </div>
            <div className="remote-image-form">
              <label htmlFor="collection-name">Nom</label>
              <input
                id="collection-name"
                type="text"
                value={collectionNameDraft}
                autoFocus
                onChange={(event) => {
                  setCollectionNameDraft(event.target.value);
                  setCollectionCreateError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setIsCreateCollectionModalOpen(false);
                  }

                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleCreateCollection();
                  }
                }}
              />
              {collectionCreateError ? (
                <p className={getImportFeedbackClassName("error")}>{collectionCreateError}</p>
              ) : null}
            </div>
            <div className="batch-modal-actions">
              <button type="button" onClick={() => setIsCreateCollectionModalOpen(false)}>
                Annuler
              </button>
              <button
                type="button"
                disabled={isCreatingCollection || !collectionNameDraft.trim()}
                onClick={() => {
                  void handleCreateCollection();
                }}
              >
                {isCreatingCollection ? "Creation..." : "Creer"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {collectionToRename ? (
        <div className="batch-modal-overlay" role="presentation">
          <section className="remote-image-modal" role="dialog" aria-modal="true" aria-labelledby="rename-collection-title">
            <div className="batch-modal-heading">
              <div>
                <h2 id="rename-collection-title">Renommer la collection</h2>
                <p>Les images et metadonnees ne sont pas modifiees.</p>
              </div>
              <button type="button" onClick={handleCloseRenameCollectionModal}>
                Fermer
              </button>
            </div>
            <div className="remote-image-form">
              <label htmlFor="collection-rename-name">Nom</label>
              <input
                id="collection-rename-name"
                type="text"
                value={collectionRenameDraft}
                autoFocus
                onChange={(event) => {
                  setCollectionRenameDraft(event.target.value);
                  setCollectionRenameError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    handleCloseRenameCollectionModal();
                  }

                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleRenameCollection();
                  }
                }}
              />
              {collectionRenameError ? (
                <p className={getImportFeedbackClassName("error")}>{collectionRenameError}</p>
              ) : null}
            </div>
            <div className="batch-modal-actions">
              <button type="button" onClick={handleCloseRenameCollectionModal}>
                Annuler
              </button>
              <button
                type="button"
                disabled={isRenamingCollection || !collectionRenameDraft.trim()}
                onClick={() => {
                  void handleRenameCollection();
                }}
              >
                {isRenamingCollection ? "Renommage..." : "Renommer"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {collectionToDelete ? (
        <div className="batch-modal-overlay" role="presentation">
          <section className="remote-image-modal" role="dialog" aria-modal="true" aria-labelledby="delete-collection-title">
            <div className="batch-modal-heading">
              <div>
                <h2 id="delete-collection-title">Supprimer la collection "{collectionToDelete.name}" ?</h2>
                <p>Cette action supprimera uniquement la collection virtuelle et ses associations.</p>
              </div>
              <button type="button" onClick={handleCloseDeleteCollectionModal}>
                Fermer
              </button>
            </div>
            <div className="remote-image-form">
              <p className="remote-image-note">
                Les images, fichiers originaux et metadonnees ne seront pas supprimes.
              </p>
              {collectionDeleteError ? (
                <p className={getImportFeedbackClassName("error")}>{collectionDeleteError}</p>
              ) : null}
            </div>
            <div className="batch-modal-actions">
              <button type="button" onClick={handleCloseDeleteCollectionModal}>
                Annuler
              </button>
              <button
                type="button"
                className="danger-action"
                disabled={isDeletingCollection}
                onClick={() => {
                  void handleDeleteCollection();
                }}
              >
                {isDeletingCollection ? "Suppression..." : "Supprimer la collection"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {remoteImageIdsToRemove ? (
        <div className="batch-modal-overlay" role="presentation">
          <section
            className="remote-image-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-remote-references-title"
          >
            <div className="batch-modal-heading">
              <div>
                <h2 id="remove-remote-references-title">
                  Retirer {remoteImageIdsToRemove.length} {remoteImageIdsToRemove.length === 1 ? "reference" : "references"} d'Iconotheque ?
                </h2>
                <p>
                  {remoteImageIdsToRemove.length === 1
                    ? "Cette reference sera retiree du catalogue et de toutes ses collections."
                    : "Ces references seront retirees du catalogue et de toutes leurs collections."}
                </p>
              </div>
              <button type="button" onClick={handleCloseRemoveRemoteReferencesModal}>
                Fermer
              </button>
            </div>
            <div className="remote-image-form">
              {selectedLocalImageCount > 0 ? (
                <p className="remote-image-note">
                  {selectedLocalImageCount} {selectedLocalImageCount === 1 ? "image locale restera" : "images locales resteront"} intacte{selectedLocalImageCount === 1 ? "" : "s"}.
                </p>
              ) : null}
              <p className="remote-image-note">
                Leurs metadonnees applicatives seront supprimees. Aucun fichier ni contenu Web ou Midjourney ne sera supprime ou modifie.
              </p>
              {remoteReferenceRemovalError ? (
                <p className={getImportFeedbackClassName("error")}>{remoteReferenceRemovalError}</p>
              ) : null}
            </div>
            <div className="batch-modal-actions">
              <button type="button" onClick={handleCloseRemoveRemoteReferencesModal}>
                Annuler
              </button>
              <button
                type="button"
                className="danger-action"
                disabled={isRemovingRemoteReferences}
                onClick={() => {
                  void handleRemoveRemoteReferences();
                }}
              >
                {isRemovingRemoteReferences ? "Retrait..." : "Retirer d'Iconotheque"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {videoThumbnailGenerationResult ? (
        <div className="batch-modal-overlay" role="presentation"><section className="remote-image-modal" role="dialog" aria-modal="true"><div className="batch-modal-heading"><div><h2>{videoThumbnailGenerationResult.title ?? "Vignette vidéo Midjourney"}</h2><p>{videoThumbnailGenerationResult.message}</p></div><button type="button" onClick={() => setVideoThumbnailGenerationResult(null)}>Fermer</button></div><div className="remote-image-form">{videoThumbnailGenerationResult.dataUrl ? <img className="video-thumbnail-preview" src={videoThumbnailGenerationResult.dataUrl} alt="Aperçu de la vignette vidéo enregistrée" /> : null}</div></section></div>
      ) : null}
      {isAddToCollectionModalOpen ? (
        <div className="batch-modal-overlay" role="presentation">
          <section className="remote-image-modal" role="dialog" aria-modal="true" aria-labelledby="add-to-collection-title">
            <div className="batch-modal-heading">
              <div>
                <h2 id="add-to-collection-title">Ajouter a une collection</h2>
                <p>{selectedImageIds.length} image(s) selectionnee(s)</p>
              </div>
              <button type="button" onClick={() => setIsAddToCollectionModalOpen(false)}>
                Fermer
              </button>
            </div>
            <div className="remote-image-form">
              <label htmlFor="target-collection">Collection</label>
              <select
                id="target-collection"
                value={targetCollectionId ?? ""}
                onChange={(event) => {
                  setTargetCollectionId(Number(event.target.value));
                  setAddToCollectionSummary(null);
                  setAddToCollectionTone("success");
                  setAddToCollectionError(null);
                }}
              >
                {collections.map((collection) => (
                  <option value={collection.id} key={collection.id}>
                    {collection.name}
                  </option>
                ))}
              </select>
              {addToCollectionError ? (
                <p className={getImportFeedbackClassName("error")}>{addToCollectionError}</p>
              ) : null}
              {addToCollectionSummary ? (
                <p className={getImportFeedbackClassName(addToCollectionTone)}>{addToCollectionSummary}</p>
              ) : null}
            </div>
            <div className="batch-modal-actions">
              <button type="button" onClick={() => setIsAddToCollectionModalOpen(false)}>
                Annuler
              </button>
              <button
                type="button"
                disabled={isAddingToCollection || !targetCollectionId}
                onClick={() => {
                  void handleAddSelectionToCollection();
                }}
              >
                {isAddingToCollection ? "Ajout..." : "Ajouter"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {isAddRemoteModalOpen ? (
        <div className="batch-modal-overlay" role="presentation">
          <section className="remote-image-modal" role="dialog" aria-modal="true" aria-labelledby="remote-image-title">
            <div className="batch-modal-heading">
              <div>
                <h2 id="remote-image-title">Ajouter une image web</h2>
                <p>URL HTTPS directe vers une image prise en charge.</p>
              </div>
              <button type="button" onClick={() => setIsAddRemoteModalOpen(false)}>
                Fermer
              </button>
            </div>
            <div className="remote-image-form">
              <label htmlFor="remote-image-url">URL de l'image</label>
              <input
                id="remote-image-url"
                type="url"
                value={remoteUrlDraft}
                placeholder="https://exemple.com/image.jpg"
                autoFocus
                onChange={(event) => {
                  setRemoteUrlDraft(event.target.value);
                  setRemoteAddError(null);
                  setRemoteAddSummary(null);
                  setRemoteAddTone("success");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setIsAddRemoteModalOpen(false);
                  }

                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleAddRemoteImage();
                  }
                }}
              />
              {remoteAddError ? (
                <p className={getImportFeedbackClassName("error")}>{remoteAddError}</p>
              ) : null}
              {remoteAddSummary ? (
                <p className={getImportFeedbackClassName(remoteAddTone)}>{remoteAddSummary}</p>
              ) : null}
              <p className="remote-image-note">
                Aucun fichier n'est telecharge ni archive dans cette mission.
              </p>
            </div>
            <div className="batch-modal-actions">
              <button type="button" onClick={() => setIsAddRemoteModalOpen(false)}>
                Annuler
              </button>
              <button
                type="button"
                disabled={isAddingRemoteImage || !remoteUrlDraft.trim()}
                onClick={() => {
                  void handleAddRemoteImage();
                }}
              >
                {isAddingRemoteImage ? "Ajout..." : "Ajouter"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {isAddMidjourneyModalOpen ? (
        <div className="batch-modal-overlay" role="presentation">
          <section
            className="remote-image-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="midjourney-job-title"
          >
            <div className="batch-modal-heading">
              <div>
                <h2 id="midjourney-job-title">Ajouter un job Midjourney</h2>
                <p>Collez une URL CDN Midjourney ou un job ID UUID.</p>
              </div>
              <button type="button" onClick={() => setIsAddMidjourneyModalOpen(false)}>
                Fermer
              </button>
            </div>
            <div className="remote-image-form">
              <label htmlFor="midjourney-job-input">URL Midjourney ou job ID</label>
              <input
                id="midjourney-job-input"
                type="text"
                value={midjourneyInputDraft}
                placeholder="32f08e2c-8188-4a08-bd93-89d22369d3ad"
                autoFocus
                onChange={(event) => {
                  setMidjourneyInputDraft(event.target.value);
                  setMidjourneyAddError(null);
                  setMidjourneyAddSummary(null);
                  setMidjourneyAddTone("success");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setIsAddMidjourneyModalOpen(false);
                  }

                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleAddMidjourneyJob();
                  }
                }}
              />
              {midjourneyAddError ? (
                <p className={getImportFeedbackClassName("error")}>{midjourneyAddError}</p>
              ) : null}
              {midjourneyAddSummary ? (
                <p className={getImportFeedbackClassName(midjourneyAddTone)}>{midjourneyAddSummary}</p>
              ) : null}
              <p className="remote-image-note">
                Les 4 slots 0_0 a 0_3 seront crees comme images distantes.
              </p>
            </div>
            <div className="batch-modal-actions">
              <button type="button" onClick={() => setIsAddMidjourneyModalOpen(false)}>
                Annuler
              </button>
              <button
                type="button"
                disabled={isAddingMidjourneyJob || !midjourneyInputDraft.trim()}
                onClick={() => {
                  void handleAddMidjourneyJob();
                }}
              >
                {isAddingMidjourneyJob ? "Ajout..." : "Ajouter"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {isAddMidjourneyVideoModalOpen ? (
        <div className="batch-modal-overlay" role="presentation"><section className="remote-image-modal" role="dialog" aria-modal="true"><div className="batch-modal-heading"><div><h2>Ajouter un job MJ video</h2><p>Saisissez un job ID Midjourney.</p></div><button type="button" onClick={() => setIsAddMidjourneyVideoModalOpen(false)}>Fermer</button></div><div className="remote-image-form"><input value={midjourneyVideoJobDraft} autoFocus onChange={(event) => { setMidjourneyVideoJobDraft(event.target.value); setMidjourneyVideoError(null); }} />{midjourneyVideoError ? <p className={getImportFeedbackClassName("error")}>{midjourneyVideoError}</p> : null}</div><div className="batch-modal-actions"><button type="button" onClick={() => setIsAddMidjourneyVideoModalOpen(false)}>Annuler</button><button type="button" disabled={!midjourneyVideoJobDraft.trim()} onClick={() => { void handleAddMidjourneyVideoJob(); }}>Ajouter</button></div></section></div>
      ) : null}
      {isAddMidjourneyVideoBatchModalOpen ? (
        <div className="batch-modal-overlay" role="presentation"><section className="remote-image-modal remote-image-modal-wide" role="dialog" aria-modal="true"><div className="batch-modal-heading"><div><h2>Ajouter plusieurs jobs MJ video</h2><p>Un job ID Midjourney par ligne.</p></div><button type="button" onClick={() => setIsAddMidjourneyVideoBatchModalOpen(false)}>Fermer</button></div><div className="remote-image-form"><textarea value={midjourneyVideoBatchDraft} onChange={(event) => { setMidjourneyVideoBatchDraft(event.target.value); setMidjourneyVideoBatchError(null); }} />{midjourneyVideoBatchError ? <p className={getImportFeedbackClassName("error")}>{midjourneyVideoBatchError}</p> : null}</div><div className="batch-modal-actions"><button type="button" onClick={() => setIsAddMidjourneyVideoBatchModalOpen(false)}>Annuler</button><button type="button" disabled={!midjourneyVideoBatchDraft.trim()} onClick={() => { void handleAddMidjourneyVideoJobsBatch(); }}>Importer</button></div></section></div>
      ) : null}
      {isAddMidjourneyBatchModalOpen ? (
        <div className="batch-modal-overlay" role="presentation">
          <section
            className="remote-image-modal remote-image-modal-wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="midjourney-batch-title"
          >
            <div className="batch-modal-heading">
              <div>
                <h2 id="midjourney-batch-title">Ajouter plusieurs jobs Midjourney</h2>
                <p>Collez une URL Midjourney ou un job ID par ligne.</p>
              </div>
              <button type="button" onClick={() => setIsAddMidjourneyBatchModalOpen(false)}>
                Fermer
              </button>
            </div>
            <div className="remote-image-form">
              <label htmlFor="midjourney-batch-input">URLs Midjourney ou job IDs</label>
              <textarea
                id="midjourney-batch-input"
                value={midjourneyBatchDraft}
                placeholder={
                  "32f08e2c-8188-4a08-bd93-89d22369d3ad\nhttps://cdn.midjourney.com/32f08e2c-8188-4a08-bd93-89d22369d3ad/0_1.png"
                }
                autoFocus
                rows={8}
                onChange={(event) => {
                  setMidjourneyBatchDraft(event.target.value);
                  setMidjourneyBatchError(null);
                  setMidjourneyBatchSummary(null);
                  setMidjourneyBatchTone("success");
                  setMidjourneyBatchInvalidLines([]);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setIsAddMidjourneyBatchModalOpen(false);
                  }

                  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                    event.preventDefault();
                    void handleAddMidjourneyJobsBatch();
                  }
                }}
              />
              {midjourneyBatchError ? (
                <p className={getImportFeedbackClassName("error")}>{midjourneyBatchError}</p>
              ) : null}
              {midjourneyBatchSummary ? (
                <p className={getImportFeedbackClassName(midjourneyBatchTone)}>{midjourneyBatchSummary}</p>
              ) : null}
              {midjourneyBatchInvalidLines.length > 0 ? (
                <div className="midjourney-invalid-lines">
                  <p>Lignes ignorees :</p>
                  <ul>
                    {midjourneyBatchInvalidLines.map((invalidLine, index) => (
                      <li key={`${invalidLine.line}-${index}`}>
                        <span>{invalidLine.line}</span>
                        <small>{invalidLine.reason}</small>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <p className="remote-image-note">
                Les jobs valides creent ou reutilisent les slots 0_0 a 0_3 comme images distantes.
              </p>
            </div>
            <div className="batch-modal-actions">
              <button type="button" onClick={() => setIsAddMidjourneyBatchModalOpen(false)}>
                Annuler
              </button>
              <button
                type="button"
                disabled={isImportingMidjourneyBatch || !midjourneyBatchDraft.trim()}
                onClick={() => {
                  void handleAddMidjourneyJobsBatch();
                }}
              >
                {isImportingMidjourneyBatch ? "Import..." : "Importer"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
      <HelpPanel isOpen={isHelpPanelOpen} onClose={() => setIsHelpPanelOpen(false)} />
    </main>
  );
}
