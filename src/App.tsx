import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
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
import type {
  AdvancedSearchCriteria,
  BatchImageUserMetadataPatch,
  DatabaseStatus,
  FolderTreeScanState,
  ImageFile,
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
const DEFAULT_RATIO_REFERENCE_WIDTH = 1280;
const RESIZE_HANDLE_TOTAL_WIDTH = 16;
const LEFT_COLUMN_MAX_RATIO = 0.42;
const RIGHT_COLUMN_MAX_RATIO = 0.55;
const DEFAULT_LEFT_RATIO = DEFAULT_LEFT_WIDTH / DEFAULT_RATIO_REFERENCE_WIDTH;
const DEFAULT_RIGHT_RATIO = DEFAULT_RIGHT_WIDTH / DEFAULT_RATIO_REFERENCE_WIDTH;

type ResizeSide = "left" | "right";

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

  return [image.name, image.extension, image.path]
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
  const [databaseStatus, setDatabaseStatus] = useState<DatabaseStatus>({
    status: "unknown",
    error: null
  });
  const [selectedImage, setSelectedImage] = useState<ImageFile | null>(null);
  const [selectedImagePaths, setSelectedImagePaths] = useState<string[]>([]);
  const [selectionAnchorPath, setSelectionAnchorPath] = useState<string | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isBatchSaving, setIsBatchSaving] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [metadataRefreshToken, setMetadataRefreshToken] = useState(0);
  const [thumbnailSize, setThumbnailSize] = useState<ThumbnailSize>("medium");
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
  const contextImages = isAdvancedSearchActive ? advancedSearch.images : imageScan.images;
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
        ...imageScan,
        status:
          imageScan.status === "ready" && displayedImages.length === 0
            ? "empty"
            : imageScan.status,
        images: displayedImages,
        error: imageScan.error
      };
  const selectedBatchImages = displayedImages.filter((image) =>
    selectedImagePaths.includes(image.path)
  );

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
    setActiveFolder(folder);
    setSelectedImage(null);
    setSelectedImagePaths([]);
    setSelectionAnchorPath(null);
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
    setSelectedImagePaths([image.path]);
    setSelectionAnchorPath(image.path);
  }, []);

  const handleToggleImageInSelection = useCallback((image: ImageFile): void => {
    setSelectedImage(image);
    setSelectionAnchorPath(image.path);
    setSelectedImagePaths((currentPaths) =>
      currentPaths.includes(image.path)
        ? currentPaths.filter((imagePath) => imagePath !== image.path)
        : [...currentPaths, image.path]
    );
  }, []);

  const handleSelectImageRange = useCallback(
    (image: ImageFile): void => {
      const anchorPath = selectionAnchorPath ?? selectedImage?.path ?? image.path;
      const anchorIndex = displayedImages.findIndex((displayedImage) => displayedImage.path === anchorPath);
      const targetIndex = displayedImages.findIndex((displayedImage) => displayedImage.path === image.path);

      setSelectedImage(image);

      if (anchorIndex < 0 || targetIndex < 0) {
        setSelectedImagePaths([image.path]);
        setSelectionAnchorPath(image.path);
        return;
      }

      const [startIndex, endIndex] =
        anchorIndex <= targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
      setSelectedImagePaths(
        displayedImages.slice(startIndex, endIndex + 1).map((displayedImage) => displayedImage.path)
      );
    },
    [displayedImages, selectedImage?.path, selectionAnchorPath]
  );

  const handleSelectAllDisplayedImages = useCallback((): void => {
    setSelectedImagePaths(displayedImages.map((image) => image.path));

    if (displayedImages.length > 0) {
      setSelectedImage((currentImage) => currentImage ?? displayedImages[0]);
      setSelectionAnchorPath(displayedImages[0].path);
    }
  }, [displayedImages]);

  const handleClearMultiSelection = useCallback((): void => {
    setSelectedImagePaths([]);
    setSelectionAnchorPath(null);
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
    setSelectedImagePaths([]);
    setSelectionAnchorPath(null);
    setIsViewerOpen(false);
  }, []);

  const handleToggleQuickWorkflowColor = useCallback((workflowColor: WorkflowColor): void => {
    setQuickWorkflowColors((currentColors) =>
      currentColors.includes(workflowColor)
        ? currentColors.filter((currentColor) => currentColor !== workflowColor)
        : [...currentColors, workflowColor]
    );
  }, []);

  const handleImageWorkflowColorChange = useCallback(
    (imagePath: string, workflowColor: WorkflowColor): void => {
      setImageScan((currentScan) => ({
        ...currentScan,
        images: currentScan.images.map((image) =>
          image.path === imagePath ? { ...image, workflowColor } : image
        )
      }));
      setAdvancedSearch((currentSearch) => ({
        ...currentSearch,
        images: currentSearch.images.map((image) =>
          image.path === imagePath ? { ...image, workflowColor } : image
        )
      }));
      setSelectedImage((currentImage) =>
        currentImage?.path === imagePath ? { ...currentImage, workflowColor } : currentImage
      );
    },
    []
  );

  const handleBatchWorkflowColorChange = useCallback(
    (imagePaths: string[], workflowColor: WorkflowColor): void => {
      const imagePathSet = new Set(imagePaths);

      setImageScan((currentScan) => ({
        ...currentScan,
        images: currentScan.images.map((image) =>
          imagePathSet.has(image.path) ? { ...image, workflowColor } : image
        )
      }));
      setAdvancedSearch((currentSearch) => ({
        ...currentSearch,
        images: currentSearch.images.map((image) =>
          imagePathSet.has(image.path) ? { ...image, workflowColor } : image
        )
      }));
      setSelectedImage((currentImage) =>
        currentImage && imagePathSet.has(currentImage.path)
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

      const imagePaths = selectedBatchImages.map((image) => image.path);
      const result = await window.iconotheque.batchUpdateImageUserMetadata(imagePaths, patch);

      setIsBatchSaving(false);

      if (!result.ok) {
        setBatchError(result.error);
        return;
      }

      if (result.workflowColor !== null) {
        handleBatchWorkflowColorChange(imagePaths, result.workflowColor);
      }

      if (selectedImage && imagePaths.includes(selectedImage.path)) {
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

    if (!displayedImages.some((image) => image.path === selectedImage.path)) {
      setSelectedImage(null);
      setIsViewerOpen(false);
    }
  }, [displayedImages, selectedImage]);

  useEffect(() => {
    const visiblePathSet = new Set(displayedImages.map((image) => image.path));

    setSelectedImagePaths((currentPaths) =>
      currentPaths.filter((imagePath) => visiblePathSet.has(imagePath))
    );

    if (selectionAnchorPath && !visiblePathSet.has(selectionAnchorPath)) {
      setSelectionAnchorPath(null);
    }
  }, [displayedImages, selectionAnchorPath]);

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
          selectedFolderPath={activeFolder?.path ?? null}
          onSelectFolder={scanFolder}
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
          imageScan={displayedImageScan}
          selectedImage={selectedImage}
          selectedImagePaths={selectedImagePaths}
          thumbnailSize={thumbnailSize}
          simpleSearchQuery={simpleSearchQuery}
          totalImageCount={isAdvancedSearchActive ? advancedSearch.images.length : imageScan.images.length}
          workflowFilterBaseCount={displayBaseImageCount}
          quickWorkflowColors={quickWorkflowColors}
          isAdvancedSearchActive={isAdvancedSearchActive}
          advancedSearchStatus={advancedSearch.status}
          onSelectImage={handleSelectImage}
          onToggleImageSelection={handleToggleImageInSelection}
          onSelectImageRange={handleSelectImageRange}
          onSelectAllImages={handleSelectAllDisplayedImages}
          onClearMultiSelection={handleClearMultiSelection}
          onOpenImage={handleOpenImageViewer}
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
          rootFolder={activeFolder}
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
      <StatusBar
        rootFolder={activeFolder}
        imageScan={imageScan}
        selectedImage={selectedImage}
        selectedImageCount={selectedBatchImages.length}
        isSelectingFolder={isSelectingFolder}
        isScanning={imageScan.status === "loading"}
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
      <HelpPanel isOpen={isHelpPanelOpen} onClose={() => setIsHelpPanelOpen(false)} />
    </main>
  );
}
