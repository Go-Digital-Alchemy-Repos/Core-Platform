import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  ArrowDown,
  ArrowUp,
  Bookmark,
  Blocks,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Layers,
  ListOrdered,
  Lock,
  Monitor,
  Pencil,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import {
  ALL_BLOCKS,
  createBlock,
  getBlockDef,
  isDynamicBlock,
  type BlockInstance,
  type BuilderContent,
} from "./block-registry";
import { createFallbackBlockDef } from "./block-editor";
import { cn } from "@/lib/utils";
import { FULL_WIDTH_BLOCK_TYPES } from "@/features/public/public-block-renderer";
import { FrontendPreviewDialog, type PreviewDevice } from "./page-builder-preview";
import { VisualCanvas, type VisualCanvasProps } from "./page-builder-canvas";
import { BlockInspectorPanel } from "./page-builder-inspector";
import { BuilderLeftRail, DesktopBuilderLayout } from "./page-builder-layout";
import {
  BLOCK_CATEGORY_LABELS,
  BlockIcon,
  duplicateBlockInstance,
  getBlockSummary,
  groupBlocksByCategory,
  SaveSectionDialog,
  SectionsLibrary,
} from "./page-builder-support";

interface PageBuilderProps {
  content: BuilderContent;
  onChange: (content: BuilderContent) => void;
}

type LeftRailMode = "structure" | "inserter";
type InsertPayload =
  | { kind: "block"; type: string }
  | { kind: "section"; sectionId: string; blocks: BlockInstance[] };
export function PageBuilder({ content, onChange }: PageBuilderProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savingSectionBlockId, setSavingSectionBlockId] = useState<string | null>(null);
  const [navigatorSearch, setNavigatorSearch] = useState("");
  const [addContentSearch, setAddContentSearch] = useState("");
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [draggedInsertPayload, setDraggedInsertPayload] = useState<InsertPayload | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: "before" | "after" } | null>(null);
  const [leftRailMode, setLeftRailMode] = useState<LeftRailMode>("structure");
  const [structurePanelOpen, setStructurePanelOpen] = useState(true);
  const [advancedInspectorOpen, setAdvancedInspectorOpen] = useState(true);
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("desktop");
  const [frontendPreviewOpen, setFrontendPreviewOpen] = useState(false);
  const [insertAtIndex, setInsertAtIndex] = useState<number | null>(null);
  const blockRefs = useRef(new Map<string, HTMLDivElement | null>());
  const desktopCanvasPanelRef = useRef<HTMLDivElement | null>(null);
  const desktopInspectorShellRef = useRef<HTMLDivElement | null>(null);
  const [desktopInspectorOffset, setDesktopInspectorOffset] = useState(0);

  const blocks = content.blocks ?? [];
  const selectedBlock = blocks.find((block) => block.id === selectedId) ?? null;
  const selectedDef = selectedBlock ? getBlockDef(selectedBlock.type) : null;
  const selectedEditorDef = selectedBlock
    ? (selectedDef ?? createFallbackBlockDef(selectedBlock.type, selectedBlock.props))
    : null;
  const selectedBlockIndex = selectedBlock
    ? blocks.findIndex((block) => block.id === selectedBlock.id)
    : -1;

  const selectBlock = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id) {
      setAdvancedInspectorOpen(true);
    }
  }, []);

  const registerBlockRef = useCallback((id: string, node: HTMLDivElement | null) => {
    if (node) {
      blockRefs.current.set(id, node);
    } else {
      blockRefs.current.delete(id);
    }
  }, []);

  const scrollBlockIntoView = useCallback((id: string) => {
    const node = blockRefs.current.get(id);
    if (!node) return;

    const viewport = node.closest("[data-radix-scroll-area-viewport]") as HTMLElement | null;
    if (viewport) {
      const viewportRect = viewport.getBoundingClientRect();
      const nodeRect = node.getBoundingClientRect();
      const highZoneThreshold = viewportRect.top + viewport.clientHeight * 0.14;
      const lowZoneThreshold = viewportRect.top + viewport.clientHeight * 0.68;
      const bottomSafetyThreshold = viewportRect.bottom - Math.min(180, viewport.clientHeight * 0.18);
      const desiredTop = viewportRect.top + Math.min(240, viewport.clientHeight * 0.34);

      if (nodeRect.top < highZoneThreshold || nodeRect.top > lowZoneThreshold || nodeRect.bottom > bottomSafetyThreshold) {
        const nextScrollTop = viewport.scrollTop + (nodeRect.top - desiredTop);
        viewport.scrollTo({
          top: Math.max(0, nextScrollTop),
          behavior: "smooth",
        });
        return;
      }
    }

    node.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  }, []);

  const setBlocks = useCallback(
    (nextBlocks: BlockInstance[]) => {
      onChange({ ...content, blocks: nextBlocks });
    },
    [content, onChange]
  );

  const visibleBlocks = useMemo(() => {
    const term = navigatorSearch.trim().toLowerCase();
    if (!term) return blocks;
    return blocks.filter((block) => {
      const def = getBlockDef(block.type);
      const summary = getBlockSummary(block).toLowerCase();
      return (
        block.type.toLowerCase().includes(term) ||
        def?.label.toLowerCase().includes(term) ||
        summary.includes(term)
      );
    });
  }, [blocks, navigatorSearch]);

  const filteredAddContentGroups = useMemo(() => {
    const term = addContentSearch.trim().toLowerCase();
    const grouped = groupBlocksByCategory(ALL_BLOCKS);
    if (!term) return grouped;

    return grouped
      .map(({ category, label, items }) => ({
        category,
        label,
        items: items.filter((definition) => {
          const haystack = [
            definition.label,
            definition.description,
            definition.type,
            BLOCK_CATEGORY_LABELS[definition.category],
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(term);
        }),
      }))
      .filter(({ items }) => items.length > 0);
  }, [addContentSearch]);

  const desktopCanvasFrameClassName = useMemo(() => {
    if (!structurePanelOpen && !advancedInspectorOpen) return "max-w-[1280px]";
    if (structurePanelOpen && advancedInspectorOpen) return "max-w-[980px] 2xl:max-w-[1080px]";
    return "max-w-[1120px] 2xl:max-w-[1200px]";
  }, [advancedInspectorOpen, structurePanelOpen]);

  useEffect(() => {
    if (!selectedId) return;
    scrollBlockIntoView(selectedId);
  }, [scrollBlockIntoView, selectedId]);

  const updateDesktopInspectorAlignment = useCallback(() => {
    if (!advancedInspectorOpen || !selectedId) {
      setDesktopInspectorOffset(0);
      return;
    }

    const selectedNode = blockRefs.current.get(selectedId);
    const canvasViewport = desktopCanvasPanelRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement | null;
    const inspectorShell = desktopInspectorShellRef.current;

    if (!selectedNode || !canvasViewport || !inspectorShell) {
      setDesktopInspectorOffset(0);
      return;
    }

    const viewportRect = canvasViewport.getBoundingClientRect();
    const blockRect = selectedNode.getBoundingClientRect();
    const shellHeight = inspectorShell.clientHeight;

    if (shellHeight <= 0) {
      setDesktopInspectorOffset(0);
      return;
    }

    const blockAnchorRelative = blockRect.top - viewportRect.top + blockRect.height * 0.42;
    const desiredTopAnchor = Math.max(150, Math.min(250, shellHeight * 0.3));
    const minInspectorHeight = Math.min(560, Math.max(440, shellHeight * 0.62));
    const maxOffset = Math.max(0, shellHeight - minInspectorHeight);
    const nextOffset = Math.max(0, Math.min(maxOffset, blockAnchorRelative - desiredTopAnchor));

    setDesktopInspectorOffset((current) =>
      Math.abs(current - nextOffset) > 2 ? nextOffset : current
    );
  }, [advancedInspectorOpen, selectedId]);

  useEffect(() => {
    updateDesktopInspectorAlignment();
  }, [updateDesktopInspectorAlignment, selectedId, blocks]);

  useEffect(() => {
    if (!advancedInspectorOpen || !selectedId) return;

    const canvasViewport = desktopCanvasPanelRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement | null;

    if (!canvasViewport) return;

    let frame = 0;
    const queueAlignment = () => {
      cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updateDesktopInspectorAlignment);
    };

    canvasViewport.addEventListener("scroll", queueAlignment, { passive: true });
    window.addEventListener("resize", queueAlignment);

    queueAlignment();

    return () => {
      cancelAnimationFrame(frame);
      canvasViewport.removeEventListener("scroll", queueAlignment);
      window.removeEventListener("resize", queueAlignment);
    };
  }, [advancedInspectorOpen, selectedId, updateDesktopInspectorAlignment]);

  const resolveInsertIndex = useCallback(() => {
    if (insertAtIndex !== null) return insertAtIndex;
    if (selectedId) {
      const selectedIndex = blocks.findIndex((block) => block.id === selectedId);
      if (selectedIndex >= 0) return selectedIndex + 1;
    }
    return blocks.length;
  }, [blocks, insertAtIndex, selectedId]);

  const addBlockAtIndex = useCallback((type: string, index: number) => {
    const block = createBlock(type);
    const nextBlocks = [...blocks];
    nextBlocks.splice(index, 0, block);
    setBlocks(nextBlocks);
    selectBlock(block.id);
    setInsertAtIndex(null);
    setLeftRailMode("structure");
    setStructurePanelOpen(true);
  }, [blocks, selectBlock, setBlocks]);

  const addBlock = useCallback((type: string) => {
    addBlockAtIndex(type, resolveInsertIndex());
  }, [addBlockAtIndex, resolveInsertIndex]);

  const insertBlocksAtIndex = useCallback((insertedBlocks: BlockInstance[], index: number) => {
    const nextBlocks = [...blocks];
    nextBlocks.splice(index, 0, ...insertedBlocks);
    setBlocks(nextBlocks);
    selectBlock(insertedBlocks[0]?.id ?? null);
    setInsertAtIndex(null);
    setLeftRailMode("structure");
    setStructurePanelOpen(true);
  }, [blocks, selectBlock, setBlocks]);

  const insertBlocks = useCallback((insertedBlocks: BlockInstance[]) => {
    insertBlocksAtIndex(insertedBlocks, resolveInsertIndex());
  }, [insertBlocksAtIndex, resolveInsertIndex]);

  const openAddBelow = useCallback((id: string) => {
    const sourceIndex = blocks.findIndex((block) => block.id === id);
    const nextIndex = sourceIndex < 0 ? blocks.length : sourceIndex + 1;
    setInsertAtIndex(nextIndex);
    setLeftRailMode("inserter");
    setStructurePanelOpen(true);
  }, [blocks]);

  const updateBlockProps = useCallback((id: string, props: Record<string, unknown>) => {
    setBlocks(blocks.map((block) => (block.id === id ? { ...block, props } : block)));
  }, [blocks, setBlocks]);

  const toggleBlockActive = useCallback((id: string) => {
    setBlocks(
      blocks.map((block) =>
        block.id === id
          ? {
              ...block,
              props: {
                ...block.props,
                isActive: block.props.isActive === false,
              },
            }
          : block
      )
    );
  }, [blocks, setBlocks]);

  const removeBlock = useCallback((id: string) => {
    if (selectedId === id) {
      const currentIndex = blocks.findIndex((block) => block.id === id);
      const fallbackSelection = blocks[currentIndex + 1]?.id ?? blocks[currentIndex - 1]?.id ?? null;
      selectBlock(fallbackSelection);
    }
    setBlocks(blocks.filter((block) => block.id !== id));
  }, [blocks, selectBlock, selectedId, setBlocks]);

  const duplicateBlock = useCallback((id: string) => {
    const sourceIndex = blocks.findIndex((block) => block.id === id);
    if (sourceIndex < 0) return;
    const copy = duplicateBlockInstance(blocks[sourceIndex]);
    const nextBlocks = [...blocks];
    nextBlocks.splice(sourceIndex + 1, 0, copy);
    setBlocks(nextBlocks);
    selectBlock(copy.id);
  }, [blocks, selectBlock, setBlocks]);

  const moveBlock = useCallback((id: string, direction: "up" | "down") => {
    const currentIndex = blocks.findIndex((block) => block.id === id);
    if (currentIndex < 0) return;

    const nextBlocks = [...blocks];
    if (direction === "up" && currentIndex > 0) {
      [nextBlocks[currentIndex - 1], nextBlocks[currentIndex]] = [nextBlocks[currentIndex], nextBlocks[currentIndex - 1]];
    } else if (direction === "down" && currentIndex < nextBlocks.length - 1) {
      [nextBlocks[currentIndex], nextBlocks[currentIndex + 1]] = [nextBlocks[currentIndex + 1], nextBlocks[currentIndex]];
    } else {
      return;
    }

    setBlocks(nextBlocks);
  }, [blocks, setBlocks]);

  const reorderBlocks = useCallback((sourceId: string, targetId: string, position: "before" | "after") => {
    if (sourceId === targetId) return;

    const sourceIndex = blocks.findIndex((block) => block.id === sourceId);
    const targetIndex = blocks.findIndex((block) => block.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const nextBlocks = [...blocks];
    const [movedBlock] = nextBlocks.splice(sourceIndex, 1);
    const adjustedTargetIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
    const insertIndex = position === "before" ? adjustedTargetIndex : adjustedTargetIndex + 1;

    nextBlocks.splice(insertIndex, 0, movedBlock);
    setBlocks(nextBlocks);
  }, [blocks, setBlocks]);

  const clearDragState = useCallback(() => {
    setDraggedBlockId(null);
    setDraggedInsertPayload(null);
    setDropTarget(null);
  }, []);

  const handleDragStart = useCallback((event: DragEvent, blockId: string) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", blockId);
    setDraggedBlockId(blockId);
    setDraggedInsertPayload(null);
    setDropTarget(null);
  }, []);

  const handleInserterDragStart = useCallback((event: DragEvent, payload: InsertPayload) => {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/x-page-builder-insert", JSON.stringify(payload));
    setDraggedBlockId(null);
    setDraggedInsertPayload(payload);
    setDropTarget(null);
  }, []);

  const handleDragOver = useCallback((event: DragEvent, targetId: string) => {
    if (!draggedBlockId && !draggedInsertPayload) return;
    if (draggedBlockId && draggedBlockId === targetId) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = draggedInsertPayload ? "copy" : "move";

    const bounds = event.currentTarget.getBoundingClientRect();
    const offsetY = event.clientY - bounds.top;
    const position = offsetY < bounds.height / 2 ? "before" : "after";

    setDropTarget((current) => (
      current?.id === targetId && current.position === position
        ? current
        : { id: targetId, position }
    ));
  }, [draggedBlockId, draggedInsertPayload]);

  const handleDrop = useCallback((event: DragEvent, targetId: string) => {
    event.preventDefault();

    const sourceId = draggedBlockId ?? event.dataTransfer.getData("text/plain");
    const rawInsertPayload = event.dataTransfer.getData("application/x-page-builder-insert");
    let fallbackInsertPayload: InsertPayload | null = null;
    if (rawInsertPayload) {
      try {
        fallbackInsertPayload = JSON.parse(rawInsertPayload) as InsertPayload;
      } catch {
        fallbackInsertPayload = null;
      }
    }
    const insertPayload = draggedInsertPayload ?? fallbackInsertPayload;
    const position = dropTarget?.id === targetId ? dropTarget.position : "after";
    const targetIndex = blocks.findIndex((block) => block.id === targetId);
    const insertIndex = position === "before" ? targetIndex : targetIndex + 1;

    if (insertPayload && targetIndex >= 0) {
      if (insertPayload.kind === "block") {
        addBlockAtIndex(insertPayload.type, insertIndex);
      } else {
        insertBlocksAtIndex(insertPayload.blocks, insertIndex);
      }
    } else if (sourceId && sourceId !== targetId) {
      reorderBlocks(sourceId, targetId, position);
    }

    clearDragState();
  }, [addBlockAtIndex, blocks, clearDragState, draggedBlockId, draggedInsertPayload, dropTarget, insertBlocksAtIndex, reorderBlocks]);

  const savingBlock = savingSectionBlockId
    ? blocks.find((block) => block.id === savingSectionBlockId) ?? null
    : null;

  const structurePanel = (
    <div className="flex h-full flex-col rounded-2xl border border-border/70 bg-background shadow-sm">
      <div className="space-y-3 border-b border-border/70 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ListOrdered className="h-4 w-4 text-violet-500" />
              <p className="text-sm font-semibold">Structure</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Reorder, duplicate, and select blocks. The canvas stays in sync.
            </p>
          </div>
          <Badge variant="outline">{blocks.length}</Badge>
        </div>

        <Button
          size="sm"
          className="w-full"
          data-testid="button-add-block"
          onClick={() => {
            setInsertAtIndex(selectedId ? resolveInsertIndex() : null);
            setLeftRailMode("inserter");
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add Content
        </Button>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={navigatorSearch}
            onChange={(event) => setNavigatorSearch(event.target.value)}
            placeholder="Filter blocks..."
            className="h-9 pl-8 text-sm"
            data-testid="input-builder-filter"
          />
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 p-3">
          {visibleBlocks.length === 0 ? (
            <div className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
              {blocks.length === 0 ? "No blocks yet. Add content to start building." : "No blocks match that filter."}
            </div>
          ) : (
            visibleBlocks.map((block, visibleIndex) => {
              const definition = getBlockDef(block.type);
              const blockIndex = blocks.findIndex((candidate) => candidate.id === block.id);
              const isSelected = block.id === selectedId;
              const isDynamic = isDynamicBlock(block.type);
              const summary = getBlockSummary(block);
              const showDropBefore = dropTarget?.id === block.id && dropTarget.position === "before";
              const showDropAfter = dropTarget?.id === block.id && dropTarget.position === "after";

              return (
                <div
                  key={block.id}
                  className={cn(
                    "rounded-xl border transition-all",
                    isSelected ? "border-violet-400 bg-violet-50/80 shadow-sm dark:bg-violet-950/20" : "border-border/70 bg-background",
                    draggedBlockId === block.id && "opacity-60",
                    showDropBefore && "ring-2 ring-inset ring-violet-400 ring-offset-1",
                    showDropAfter && "shadow-[inset_0_-2px_0_0_rgb(167_139_250)]"
                  )}
                  onDragOver={(event) => handleDragOver(event, block.id)}
                  onDrop={(event) => handleDrop(event, block.id)}
                  data-testid={`builder-structure-item-${block.id}`}
                >
                  <div className="flex items-start gap-2 px-3 py-2.5">
                    <button
                      type="button"
                      draggable
                      onDragStart={(event) => handleDragStart(event, block.id)}
                      onDragEnd={clearDragState}
                      className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground/60 hover:text-foreground"
                      title="Drag to reorder"
                      data-testid={`drag-handle-${block.id}`}
                    >
                      <GripVertical className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => selectBlock(block.id)}
                      className="min-w-0 flex-1 text-left"
                      data-testid={`select-structure-block-${block.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-violet-100 dark:bg-violet-900/30">
                          {definition && <BlockIcon name={definition.iconName} className="h-3 w-3 text-violet-600" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium leading-tight">
                            {definition?.label ?? block.type}
                          </p>
                          <p className="truncate text-[11px] leading-tight text-muted-foreground">
                            Block {blockIndex + 1}
                            {summary ? ` • ${summary}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        <Badge variant="secondary" className="px-1 py-0 text-[9px] capitalize">
                          {definition?.category ?? "content"}
                        </Badge>
                        {isDynamic && (
                          <Badge variant="outline" className="px-1 py-0 text-[9px]">
                            Dynamic
                          </Badge>
                        )}
                        {block.props.isActive === false && (
                          <Badge variant="outline" className="px-1 py-0 text-[9px]">
                            Inactive
                          </Badge>
                        )}
                        {FULL_WIDTH_BLOCK_TYPES.has(block.type) && (
                          <Badge variant="outline" className="px-1 py-0 text-[9px]">
                            Full Width
                          </Badge>
                        )}
                        {visibleIndex > 0 && (
                          <span className="text-[9px] text-muted-foreground">
                            {visibleIndex + 1} in filtered view
                          </span>
                        )}
                      </div>
                    </button>

                    <div className="flex items-center gap-0.5 self-start">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={blockIndex === 0}
                        onClick={() => moveBlock(block.id, "up")}
                        data-testid={`button-move-up-${block.id}`}
                      >
                        <ChevronDown className="h-3 w-3 rotate-180" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={blockIndex === blocks.length - 1}
                        onClick={() => moveBlock(block.id, "down")}
                        data-testid={`button-move-down-${block.id}`}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => duplicateBlock(block.id)}
                        data-testid={`button-duplicate-block-${block.id}`}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => removeBlock(block.id)}
                        data-testid={`button-delete-block-${block.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );

  const inserterPanel = (
    <div className="flex h-full flex-col rounded-2xl border border-border/70 bg-background shadow-sm">
      <div className="space-y-3 border-b border-border/70 px-4 py-4">
        <div className="space-y-2">
          <div>
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-violet-500" />
              <p className="text-sm font-semibold">Add Content</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Browse blocks and saved sections here, then click to insert quickly or drag into the exact position you want.
            </p>
          </div>
          {insertAtIndex !== null ? (
            <Badge variant="secondary" className="w-fit">
              Insert at {insertAtIndex + 1}
            </Badge>
          ) : selectedId ? (
            <Badge variant="outline" className="w-fit">
              After selected block
            </Badge>
          ) : (
            <Badge variant="outline" className="w-fit">
              Add to end
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Drag blocks or saved sections onto the canvas to place them precisely, or click once to insert at the current target.
        </p>
      </div>

      <Tabs defaultValue="blocks" className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="border-b border-border/70 px-4 py-3">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1">
            <TabsTrigger value="blocks" className="h-auto px-2 py-2 text-xs leading-tight">
              Block Types
            </TabsTrigger>
            <TabsTrigger value="sections" className="h-auto px-2 py-2 text-xs leading-tight" data-testid="tab-saved-sections">
              Saved Sections
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="blocks" className="mt-0 min-h-0 flex-1 overflow-hidden">
          <div className="flex h-full min-h-0 flex-col px-4 pb-4 pt-3">
            <div className="relative pb-3">
              <Search className="absolute left-2.5 top-[calc(50%-6px)] h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={addContentSearch}
                onChange={(event) => setAddContentSearch(event.target.value)}
                placeholder="Search block types..."
                className="h-9 pl-8 text-sm"
                data-testid="input-add-content-search"
              />
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-5 pr-1">
                {filteredAddContentGroups.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
                    No block types match that search.
                  </div>
                ) : filteredAddContentGroups.map(({ category, label, items }) => (
                  <div key={category}>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {label}
                    </h3>
                    <div className="space-y-2">
                      {items.map((definition) => (
                        <button
                          key={definition.type}
                          type="button"
                          draggable
                          onDragStart={(event) =>
                            handleInserterDragStart(event, {
                              kind: "block",
                              type: definition.type,
                            })
                          }
                          onDragEnd={clearDragState}
                          onClick={() => addBlock(definition.type)}
                          className="group flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30"
                          data-testid={`block-type-${definition.type}`}
                        >
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-violet-100 transition-colors group-hover:bg-violet-200 dark:bg-violet-900/30 dark:group-hover:bg-violet-900/50">
                            <BlockIcon name={definition.iconName} className="h-4 w-4 text-violet-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-tight">{definition.label}</p>
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{definition.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        <TabsContent value="sections" className="mt-0 min-h-0 flex-1 overflow-hidden px-4 pb-4 pt-3">
          <ScrollArea className="h-full">
            <SectionsLibrary
              onInsert={insertBlocks}
              onDragStart={handleInserterDragStart}
              onDragEnd={clearDragState}
            />
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );

  const leftRailPanel = (
    <BuilderLeftRail
      leftRailMode={leftRailMode}
      onLeftRailModeChange={setLeftRailMode}
      structurePanel={structurePanel}
      inserterPanel={inserterPanel}
    />
  );

  const inspectorPanel = (
    <BlockInspectorPanel
      selectedBlock={selectedBlock}
      selectedEditorDef={selectedEditorDef}
      selectedBlockIndex={selectedBlockIndex}
      onLocateBlock={() => selectedBlock && scrollBlockIntoView(selectedBlock.id)}
      onSaveSection={() => selectedBlock && setSavingSectionBlockId(selectedBlock.id)}
      onClose={() => setAdvancedInspectorOpen(false)}
      onUpdateBlockProps={(props) => selectedBlock && updateBlockProps(selectedBlock.id, props)}
    />
  );

  const canvasProps: VisualCanvasProps = {
    blocks,
    selectedId,
    onSelect: selectBlock,
    onToggleActive: toggleBlockActive,
    onDuplicate: duplicateBlock,
    onDelete: removeBlock,
    onMove: moveBlock,
    onAddBelow: openAddBelow,
    registerBlockRef,
    onCanvasDragStart: handleDragStart,
    onCanvasDragEnd: clearDragState,
    draggedBlockId,
    hasActiveDragPayload: !!draggedBlockId || !!draggedInsertPayload,
    dropTarget,
    onBlockDragOver: handleDragOver,
    onBlockDrop: handleDrop,
    onBlockDragEnd: clearDragState,
    desktopFrameClassName: desktopCanvasFrameClassName,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-500" />
            <p className="text-sm font-semibold">Visual Builder</p>
            <Badge variant="outline">{blocks.length} block{blocks.length !== 1 ? "s" : ""}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Structure on the left, real page canvas in the center, a compact section toolbar on-canvas, and a docked inspector for full editing.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Monitor className="h-3 w-3" />
            Canvas-first editing
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="xl:hidden"
            onClick={() => setStructurePanelOpen((current) => !current)}
          >
            <ListOrdered className="mr-1.5 h-4 w-4" />
            {structurePanelOpen ? "Hide Structure" : "Show Structure"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="xl:hidden"
            onClick={() => setAdvancedInspectorOpen((current) => !current)}
            disabled={!selectedBlock}
          >
            <Settings2 className="mr-1.5 h-4 w-4" />
            {advancedInspectorOpen ? "Hide Inspector" : "Show Inspector"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFrontendPreviewOpen(true)}
            data-testid="button-open-frontend-preview"
          >
            <Monitor className="mr-1.5 h-4 w-4" />
            Frontend Preview
          </Button>
          <Button
            data-testid="button-add-block-toolbar"
            onClick={() => {
              setInsertAtIndex(selectedId ? resolveInsertIndex() : null);
              setLeftRailMode("inserter");
              setStructurePanelOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add Content
          </Button>
        </div>
      </div>

      <div className="space-y-4 xl:hidden">
        {structurePanelOpen ? leftRailPanel : (
          <div className="rounded-2xl border border-dashed border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
            The left sidebar is hidden. Tap "Show Structure" to bring back the builder rail.
          </div>
        )}
        <div className="rounded-2xl border border-border/70 bg-background shadow-sm">
          <VisualCanvas
            blocks={blocks}
            selectedId={selectedId}
            onSelect={selectBlock}
            onToggleActive={toggleBlockActive}
            onDuplicate={duplicateBlock}
            onDelete={removeBlock}
            onMove={moveBlock}
            onAddBelow={openAddBelow}
            registerBlockRef={registerBlockRef}
            onCanvasDragStart={handleDragStart}
            onCanvasDragEnd={clearDragState}
            draggedBlockId={draggedBlockId}
            hasActiveDragPayload={!!draggedBlockId || !!draggedInsertPayload}
            dropTarget={dropTarget}
            onBlockDragOver={handleDragOver}
            onBlockDrop={handleDrop}
            onBlockDragEnd={clearDragState}
            desktopFrameClassName={desktopCanvasFrameClassName}
          />
        </div>
        {advancedInspectorOpen ? inspectorPanel : (
          <div className="rounded-2xl border border-dashed border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
            The docked inspector is hidden. Use the section toolbar to select content, then tap "Show Inspector" for the full editing form.
          </div>
        )}
      </div>

      <DesktopBuilderLayout
        structurePanelOpen={structurePanelOpen}
        advancedInspectorOpen={advancedInspectorOpen}
        leftRailPanel={leftRailPanel}
        inspectorPanel={inspectorPanel}
        canvasPanelRef={desktopCanvasPanelRef}
        inspectorShellRef={desktopInspectorShellRef}
        desktopInspectorOffset={desktopInspectorOffset}
        onSetStructurePanelOpen={setStructurePanelOpen}
        onSetAdvancedInspectorOpen={setAdvancedInspectorOpen}
        canvasProps={canvasProps}
      />

      <Dialog
        open={!!savingSectionBlockId}
        onOpenChange={(open) => {
          if (!open) setSavingSectionBlockId(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bookmark className="h-4 w-4 text-amber-500" />
              Save as Reusable Section
            </DialogTitle>
          </DialogHeader>
          {savingBlock && (
            <SaveSectionDialog block={savingBlock} onClose={() => setSavingSectionBlockId(null)} />
          )}
        </DialogContent>
      </Dialog>

      <FrontendPreviewDialog
        open={frontendPreviewOpen}
        onOpenChange={setFrontendPreviewOpen}
        blocks={blocks}
        previewDevice={previewDevice}
        onPreviewDeviceChange={setPreviewDevice}
      />
    </div>
  );
}
