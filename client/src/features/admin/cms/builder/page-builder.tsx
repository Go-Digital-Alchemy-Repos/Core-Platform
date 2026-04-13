import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  ArrowDown,
  ArrowUp,
  Bookmark,
  BookOpen,
  Blocks,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  Copy,
  FileText,
  FlaskConical,
  GalleryHorizontal,
  Globe,
  Grid2X2,
  Grid3X3,
  GripVertical,
  Heading,
  HelpCircle,
  Image,
  Layers,
  LayoutGrid,
  LayoutTemplate,
  List,
  ListChecks,
  ListOrdered,
  Lock,
  Map as MapIcon,
  Megaphone,
  Minus,
  Monitor,
  MousePointerClick,
  Newspaper,
  Pencil,
  Phone,
  Play,
  Plus,
  Quote,
  Rss,
  Search,
  Settings2,
  Shield,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Trash2,
  UserCheck,
  Users,
  Workflow,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  UserPlus2,
} from "lucide-react";
import {
  ALL_BLOCKS,
  createBlock,
  getBlockDef,
  isDynamicBlock,
  type BlockCategory,
  type BlockDef,
  type BlockInstance,
  type BuilderContent,
} from "./block-registry";
import { BlockEditor } from "./block-editor";
import {
  getSectionPaddingClasses,
  getSectionStyleConfig,
  hasSectionStyleConfig,
  SectionStyleWrapper,
} from "./section-style";
import { PublicBlockRenderer, FULL_WIDTH_BLOCK_TYPES } from "@/features/public/public-block-renderer";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { CmsSection } from "@shared/schema";

const ICON_MAP: Record<string, React.ElementType> = {
  Sparkles,
  FileText,
  LayoutTemplate,
  Megaphone,
  LayoutGrid,
  HelpCircle,
  Quote,
  UserCheck,
  CalendarDays,
  BookOpen,
  MousePointerClick,
  Image,
  Play,
  Minus,
  Heading,
  Globe,
  Phone,
  Map: MapIcon,
  Mail: Globe,
  UserPlus: UserPlus2,
  Lock,
  List,
  ShieldCheck,
  ArrowRight,
  Shield,
  Newspaper,
  TrendingUp,
  Grid3X3,
  GalleryHorizontal,
  BarChart3,
  Grid2X2,
  ListChecks,
  FlaskConical,
  ClipboardCheck,
  BadgeCheck,
  Workflow,
  ListOrdered,
  Rss,
  Users,
};

const SECTION_CATEGORIES = ["general", "hero", "cta", "testimonials", "faq", "features", "content", "team"];

const BLOCK_CATEGORY_LABELS: Record<BlockCategory, string> = {
  hero: "Hero",
  layout: "Layout",
  content: "Content",
  media: "Media",
  "social-proof": "Social Proof",
  conversion: "Conversion",
  data: "Data / Live",
  dynamic: "Dynamic / Interactive",
};

const BLOCK_CATEGORY_ORDER: BlockCategory[] = ["hero", "layout", "content", "media", "social-proof", "conversion", "data", "dynamic"];

interface PageBuilderProps {
  content: BuilderContent;
  onChange: (content: BuilderContent) => void;
}

interface SaveSectionDialogProps {
  block: BlockInstance;
  onClose: () => void;
}

interface VisualCanvasProps {
  blocks: BlockInstance[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onAddBelow: (id: string) => void;
  contextualEditor: ReactNode;
  registerBlockRef: (id: string, node: HTMLDivElement | null) => void;
}

function groupBlocksByCategory(blocks: BlockDef[]): { category: BlockCategory; label: string; items: BlockDef[] }[] {
  const grouped = new Map<BlockCategory, BlockDef[]>();
  for (const block of blocks) {
    const category = block.category;
    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category)!.push(block);
  }

  return BLOCK_CATEGORY_ORDER
    .filter((category) => grouped.has(category))
    .map((category) => ({
      category,
      label: BLOCK_CATEGORY_LABELS[category],
      items: grouped.get(category)!,
    }));
}

function BlockIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] ?? Layers;
  return <Icon className={className} />;
}

function cloneProps<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function duplicateBlockInstance(block: BlockInstance): BlockInstance {
  return {
    id: crypto.randomUUID(),
    type: block.type,
    props: cloneProps(block.props),
  };
}

function getBlockSummary(block: BlockInstance) {
  const candidates = [
    block.props.title,
    block.props.heading,
    block.props.sectionEyebrow,
    block.props.badge,
    block.props.ctaText,
  ];
  const summary = candidates.find((candidate) => typeof candidate === "string" && candidate.trim().length > 0);
  return typeof summary === "string" ? summary : "";
}

function SaveSectionDialog({ block, onClose }: SaveSectionDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/cms/sections", {
        name,
        description,
        category,
        blocks: [block],
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/sections"] });
      toast({ title: "Saved as reusable section" });
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to save section", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-1.5">
        <Label>Section Name</Label>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Homepage Hero"
          data-testid="input-save-section-name"
          autoFocus
        />
      </div>
      <div className="space-y-1.5">
        <Label>Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger data-testid="select-save-section-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SECTION_CATEGORIES.map((value) => (
              <SelectItem key={value} value={value} className="capitalize">
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>
          Description <span className="text-xs font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="When to use this section..."
          rows={2}
          data-testid="input-save-section-description"
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!name.trim() || saveMutation.isPending}
          data-testid="button-confirm-save-section"
        >
          {saveMutation.isPending ? "Saving..." : "Save Section"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function SectionsLibrary({ onInsert }: { onInsert: (blocks: BlockInstance[]) => void }) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: sections = [], isLoading } = useQuery<CmsSection[]>({
    queryKey: ["/api/admin/cms/sections"],
  });

  const filteredSections = sections.filter((section) => {
    const matchesSearch = !search || section.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || section.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const insertSection = (section: CmsSection) => {
    const blocks = Array.isArray(section.blocks) ? (section.blocks as BlockInstance[]) : [];
    const remappedBlocks = blocks.map((block) => ({ ...block, id: crypto.randomUUID() }));
    onInsert(remappedBlocks);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search saved sections..."
            className="h-8 pl-8 text-sm"
            data-testid="input-library-search"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-8 w-32 text-xs" data-testid="select-library-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All</SelectItem>
            {SECTION_CATEGORIES.map((value) => (
              <SelectItem key={value} value={value} className="text-xs capitalize">
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">Loading...</div>
      ) : filteredSections.length === 0 ? (
        <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
          <Blocks className="h-8 w-8 opacity-30" />
          <p className="text-sm font-medium">{search ? "No sections match" : "No saved sections yet"}</p>
          <p className="text-xs">
            {search ? "Try a different search" : "Save a block as a reusable section from the visual builder"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {filteredSections.map((section) => {
            const blockCount = Array.isArray(section.blocks) ? section.blocks.length : 0;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => insertSection(section)}
                className="group flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30"
                data-testid={`insert-section-${section.id}`}
              >
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-violet-100 dark:bg-violet-900/30">
                  <Layers className="h-3.5 w-3.5 text-violet-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium leading-tight">{section.name}</p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <Badge variant="secondary" className="px-1 py-0 text-[9px] capitalize">
                      {section.category ?? "general"}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {blockCount} block{blockCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CanvasBlockFrame({
  block,
  index,
  isSelected,
  onSelect,
  onDuplicate,
  onDelete,
  onMove,
  onAddBelow,
  contextualEditor,
  registerBlockRef,
}: {
  block: BlockInstance;
  index: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onAddBelow: (id: string) => void;
  contextualEditor: ReactNode;
  registerBlockRef: (id: string, node: HTMLDivElement | null) => void;
}) {
  const blockDef = getBlockDef(block.type);
  const summary = getBlockSummary(block);
  const isDynamic = isDynamicBlock(block.type);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [editorPlacement, setEditorPlacement] = useState<"inline" | "overlay">("overlay");

  useEffect(() => {
    if (!isSelected) return;

    const updatePlacement = () => {
      const width = frameRef.current?.getBoundingClientRect().width ?? 0;
      setEditorPlacement(width < 900 ? "inline" : "overlay");
    };

    updatePlacement();
    window.addEventListener("resize", updatePlacement);
    return () => window.removeEventListener("resize", updatePlacement);
  }, [isSelected]);

  return (
    <div
      ref={(node) => {
        frameRef.current = node;
        registerBlockRef(block.id, node);
      }}
      className="group relative scroll-mt-24"
      data-testid={`canvas-block-${block.id}`}
    >
      <div
        className={cn(
          "relative transition-all",
          isSelected
            ? "ring-2 ring-violet-500 ring-offset-4 ring-offset-background"
            : "hover:ring-2 hover:ring-violet-300/70 hover:ring-offset-2 hover:ring-offset-background"
        )}
      >
        <div className="pointer-events-none select-none">
          <PublicBlockRenderer block={block} disableSectionStyleWrap />
        </div>
      </div>

      <button
        type="button"
        onClick={() => onSelect(block.id)}
        className="absolute inset-0 z-10"
        aria-label={`Select ${blockDef?.label ?? block.type} block`}
        data-testid={`select-canvas-block-${block.id}`}
      />

      <div className="pointer-events-none absolute left-3 top-3 z-20 flex max-w-[70%] flex-wrap items-center gap-2">
        <Badge className="bg-slate-900/80 text-white hover:bg-slate-900/80">{index + 1}</Badge>
        <Badge variant="secondary" className="bg-background/90 backdrop-blur">
          {blockDef?.label ?? block.type}
        </Badge>
        {isDynamic && (
          <Badge variant="outline" className="border-amber-300 bg-amber-50/90 text-amber-800 backdrop-blur dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
            <Lock className="mr-1 h-2.5 w-2.5" />
            Dynamic
          </Badge>
        )}
        {summary && (
          <span className="truncate rounded-full bg-background/90 px-2 py-1 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
            {summary}
          </span>
        )}
      </div>

      <div
        className={cn(
          "absolute right-3 top-3 z-20 flex items-center gap-1 transition-opacity",
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
      >
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-8 w-8 shadow-sm"
          onClick={(event) => {
            event.stopPropagation();
            onSelect(block.id);
          }}
          data-testid={`canvas-edit-${block.id}`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-8 w-8 shadow-sm"
          onClick={(event) => {
            event.stopPropagation();
            onMove(block.id, "up");
          }}
          data-testid={`canvas-move-up-${block.id}`}
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-8 w-8 shadow-sm"
          onClick={(event) => {
            event.stopPropagation();
            onMove(block.id, "down");
          }}
          data-testid={`canvas-move-down-${block.id}`}
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-8 w-8 shadow-sm"
          onClick={(event) => {
            event.stopPropagation();
            onAddBelow(block.id);
          }}
          data-testid={`canvas-add-below-${block.id}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-8 w-8 shadow-sm"
          onClick={(event) => {
            event.stopPropagation();
            onDuplicate(block.id);
          }}
          data-testid={`canvas-duplicate-${block.id}`}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="h-8 w-8 shadow-sm"
          onClick={(event) => {
            event.stopPropagation();
            onDelete(block.id);
          }}
          data-testid={`canvas-delete-${block.id}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {isSelected && (
        <div
          className={cn(
            "pointer-events-auto z-30",
            editorPlacement === "overlay"
              ? "relative mt-4 px-2 sm:px-0 lg:absolute lg:right-4 lg:top-16 lg:mt-0 lg:w-[360px] lg:max-w-[calc(100%-2rem)]"
              : "relative mt-4"
          )}
        >
          {contextualEditor}
        </div>
      )}
    </div>
  );
}

function VisualCanvas({
  blocks,
  selectedId,
  onSelect,
  onDuplicate,
  onDelete,
  onMove,
  onAddBelow,
  contextualEditor,
  registerBlockRef,
}: VisualCanvasProps) {
  let nonFullWidthIndex = 0;

  return (
    <div className="h-full bg-[radial-gradient(circle_at_top,_rgba(137,205,161,0.12),_transparent_45%),linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(248,250,252,0.98))] p-5">
      <div className="mx-auto flex min-h-full max-w-[1280px] flex-col overflow-hidden rounded-[28px] border border-border/60 bg-background shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Visual Canvas</p>
            <p className="text-xs text-muted-foreground">
              This editing surface uses the published page renderer, then layers selection and editing tools on top.
            </p>
          </div>
          <Badge variant="outline" className="gap-1">
            <Monitor className="h-3 w-3" />
            Live layout preview
          </Badge>
        </div>

        <ScrollArea className="flex-1">
          {blocks.length === 0 ? (
            <div className="flex min-h-[640px] items-center justify-center p-10">
              <div className="max-w-md rounded-2xl border border-dashed border-border/80 bg-background/90 p-8 text-center shadow-sm">
                <Layers className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-base font-semibold">Your page canvas is empty</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add a block or insert a saved section from the left panel to begin building visually.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-0">
              {blocks.map((block, index) => {
                const isFullWidth = FULL_WIDTH_BLOCK_TYPES.has(block.type);
                const sectionStyleConfig = getSectionStyleConfig(block.props);
                const hasCustomSectionStyle = block.type !== "hero" && hasSectionStyleConfig(sectionStyleConfig);
                const visualIndex = isFullWidth ? nonFullWidthIndex : nonFullWidthIndex++;
                const isAlternate = visualIndex % 2 === 1 && !hasCustomSectionStyle;

                const framedBlock = (
                  <CanvasBlockFrame
                    block={block}
                    index={index}
                    isSelected={selectedId === block.id}
                    onSelect={onSelect}
                    onDuplicate={onDuplicate}
                    onDelete={onDelete}
                    onMove={onMove}
                    onAddBelow={onAddBelow}
                    contextualEditor={selectedId === block.id ? contextualEditor : null}
                    registerBlockRef={registerBlockRef}
                  />
                );

                if (hasCustomSectionStyle) {
                  return (
                    <SectionStyleWrapper
                      key={block.id}
                      props={block.props}
                      className="rounded-none"
                      contentClassName={isFullWidth ? undefined : getSectionPaddingClasses(block.props)}
                    >
                      {isFullWidth ? (
                        framedBlock
                      ) : (
                        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
                          {framedBlock}
                        </div>
                      )}
                    </SectionStyleWrapper>
                  );
                }

                if (isFullWidth) {
                  return <div key={block.id}>{framedBlock}</div>;
                }

                return (
                  <section
                    key={block.id}
                    className={cn("relative", isAlternate && "bg-muted/30")}
                  >
                    <div className={cn("relative mx-auto max-w-7xl px-4 sm:px-6", getSectionPaddingClasses(block.props))}>
                      {framedBlock}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

export function PageBuilder({ content, onChange }: PageBuilderProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [savingSectionBlockId, setSavingSectionBlockId] = useState<string | null>(null);
  const [navigatorSearch, setNavigatorSearch] = useState("");
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: "before" | "after" } | null>(null);
  const [advancedInspectorOpen, setAdvancedInspectorOpen] = useState(false);
  const [insertAtIndex, setInsertAtIndex] = useState<number | null>(null);
  const blockRefs = useRef(new Map<string, HTMLDivElement | null>());

  const blocks = content.blocks ?? [];
  const selectedBlock = blocks.find((block) => block.id === selectedId) ?? null;
  const selectedDef = selectedBlock ? getBlockDef(selectedBlock.type) : null;

  const registerBlockRef = useCallback((id: string, node: HTMLDivElement | null) => {
    if (node) {
      blockRefs.current.set(id, node);
    } else {
      blockRefs.current.delete(id);
    }
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

  useEffect(() => {
    if (!selectedId) return;
    const node = blockRefs.current.get(selectedId);
    if (!node) return;

    node.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  }, [selectedId]);

  const addBlock = useCallback((type: string) => {
    const block = createBlock(type);
    const nextBlocks = [...blocks];
    if (insertAtIndex === null) {
      nextBlocks.push(block);
    } else {
      nextBlocks.splice(insertAtIndex, 0, block);
    }
    setBlocks(nextBlocks);
    setSelectedId(block.id);
    setAddDialogOpen(false);
    setInsertAtIndex(null);
  }, [blocks, insertAtIndex, setBlocks]);

  const insertBlocks = useCallback((insertedBlocks: BlockInstance[]) => {
    const nextBlocks = [...blocks];
    if (insertAtIndex === null) {
      nextBlocks.push(...insertedBlocks);
    } else {
      nextBlocks.splice(insertAtIndex, 0, ...insertedBlocks);
    }
    setBlocks(nextBlocks);
    setSelectedId(insertedBlocks[0]?.id ?? null);
    setAddDialogOpen(false);
    setInsertAtIndex(null);
  }, [blocks, insertAtIndex, setBlocks]);

  const openAddBelow = useCallback((id: string) => {
    const sourceIndex = blocks.findIndex((block) => block.id === id);
    const nextIndex = sourceIndex < 0 ? blocks.length : sourceIndex + 1;
    setInsertAtIndex(nextIndex);
    setAddDialogOpen(true);
  }, [blocks]);

  const updateBlockProps = useCallback((id: string, props: Record<string, unknown>) => {
    setBlocks(blocks.map((block) => (block.id === id ? { ...block, props } : block)));
  }, [blocks, setBlocks]);

  const removeBlock = useCallback((id: string) => {
    if (selectedId === id) {
      const currentIndex = blocks.findIndex((block) => block.id === id);
      const fallbackSelection = blocks[currentIndex + 1]?.id ?? blocks[currentIndex - 1]?.id ?? null;
      setSelectedId(fallbackSelection);
    }
    setBlocks(blocks.filter((block) => block.id !== id));
  }, [blocks, selectedId, setBlocks]);

  const duplicateBlock = useCallback((id: string) => {
    const sourceIndex = blocks.findIndex((block) => block.id === id);
    if (sourceIndex < 0) return;
    const copy = duplicateBlockInstance(blocks[sourceIndex]);
    const nextBlocks = [...blocks];
    nextBlocks.splice(sourceIndex + 1, 0, copy);
    setBlocks(nextBlocks);
    setSelectedId(copy.id);
  }, [blocks, setBlocks]);

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
    setDropTarget(null);
  }, []);

  const handleDragStart = useCallback((event: DragEvent, blockId: string) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", blockId);
    setDraggedBlockId(blockId);
    setDropTarget(null);
  }, []);

  const handleDragOver = useCallback((event: DragEvent, targetId: string) => {
    if (!draggedBlockId || draggedBlockId === targetId) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    const bounds = event.currentTarget.getBoundingClientRect();
    const offsetY = event.clientY - bounds.top;
    const position = offsetY < bounds.height / 2 ? "before" : "after";

    setDropTarget((current) => (
      current?.id === targetId && current.position === position
        ? current
        : { id: targetId, position }
    ));
  }, [draggedBlockId]);

  const handleDrop = useCallback((event: DragEvent, targetId: string) => {
    event.preventDefault();

    const sourceId = draggedBlockId ?? event.dataTransfer.getData("text/plain");
    const position = dropTarget?.id === targetId ? dropTarget.position : "after";

    if (sourceId && sourceId !== targetId) {
      reorderBlocks(sourceId, targetId, position);
    }

    clearDragState();
  }, [clearDragState, draggedBlockId, dropTarget, reorderBlocks]);

  const savingBlock = savingSectionBlockId
    ? blocks.find((block) => block.id === savingSectionBlockId) ?? null
    : null;

  const addBlockDialogContent = (
    <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col p-0">
      <DialogHeader className="px-6 pb-0 pt-6">
        <DialogTitle>Add Content</DialogTitle>
      </DialogHeader>
      <Tabs defaultValue="blocks" className="flex flex-1 flex-col overflow-hidden">
        <div className="px-6 pt-3">
          <TabsList className="w-full">
            <TabsTrigger value="blocks" className="flex-1 gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              Block Types
            </TabsTrigger>
            <TabsTrigger value="sections" className="flex-1 gap-1.5" data-testid="tab-saved-sections">
              <Bookmark className="h-3.5 w-3.5" />
              Saved Sections
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="blocks" className="mt-0 flex-1 overflow-y-auto px-6 pb-6 pt-3">
          <div className="space-y-5">
            {groupBlocksByCategory(ALL_BLOCKS).map(({ category, label, items }) => (
              <div key={category}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {label}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {items.map((definition) => (
                    <button
                      key={definition.type}
                      type="button"
                      onClick={() => addBlock(definition.type)}
                      className="group flex items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30"
                      data-testid={`block-type-${definition.type}`}
                    >
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-violet-100 transition-colors group-hover:bg-violet-200 dark:bg-violet-900/30 dark:group-hover:bg-violet-900/50">
                        <BlockIcon name={definition.iconName} className="h-4 w-4 text-violet-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-tight">{definition.label}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{definition.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="sections" className="mt-0 flex-1 overflow-y-auto px-6 pb-6 pt-3">
          <SectionsLibrary onInsert={insertBlocks} />
        </TabsContent>
      </Tabs>
    </DialogContent>
  );

  const navigatorPanel = (
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

        <div className="flex gap-2">
          <Dialog
            open={addDialogOpen}
            onOpenChange={(open) => {
              setAddDialogOpen(open);
              if (!open) setInsertAtIndex(null);
            }}
          >
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="flex-1"
                data-testid="button-add-block"
                onClick={() => setInsertAtIndex(null)}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add Content
              </Button>
            </DialogTrigger>
            {addBlockDialogContent}
          </Dialog>
        </div>

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

      <ScrollArea className="flex-1">
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
                  <div className="flex items-start gap-2 px-3 py-3">
                    <button
                      type="button"
                      draggable
                      onDragStart={(event) => handleDragStart(event, block.id)}
                      onDragEnd={clearDragState}
                      className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground/60 hover:text-foreground"
                      title="Drag to reorder"
                      data-testid={`drag-handle-${block.id}`}
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedId(block.id)}
                      className="min-w-0 flex-1 text-left"
                      data-testid={`select-structure-block-${block.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-violet-100 dark:bg-violet-900/30">
                          {definition && <BlockIcon name={definition.iconName} className="h-3.5 w-3.5 text-violet-600" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {definition?.label ?? block.type}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            Block {blockIndex + 1}
                            {summary ? ` • ${summary}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className="px-1 py-0 text-[10px] capitalize">
                          {definition?.category ?? "content"}
                        </Badge>
                        {isDynamic && (
                          <Badge variant="outline" className="px-1 py-0 text-[10px]">
                            Dynamic
                          </Badge>
                        )}
                        {FULL_WIDTH_BLOCK_TYPES.has(block.type) && (
                          <Badge variant="outline" className="px-1 py-0 text-[10px]">
                            Full Width
                          </Badge>
                        )}
                        {visibleIndex > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            {visibleIndex + 1} in filtered view
                          </span>
                        )}
                      </div>
                    </button>

                    <div className="flex flex-col gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={blockIndex === 0}
                        onClick={() => moveBlock(block.id, "up")}
                        data-testid={`button-move-up-${block.id}`}
                      >
                        <ChevronDown className="h-3.5 w-3.5 rotate-180" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={blockIndex === blocks.length - 1}
                        onClick={() => moveBlock(block.id, "down")}
                        data-testid={`button-move-down-${block.id}`}
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => duplicateBlock(block.id)}
                        data-testid={`button-duplicate-block-${block.id}`}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeBlock(block.id)}
                        data-testid={`button-delete-block-${block.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
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

  const contextualEditor = selectedBlock && selectedDef ? (
    <div className="rounded-2xl border border-violet-200/80 bg-background/95 shadow-[0_16px_40px_rgba(15,23,42,0.14)] backdrop-blur">
      <div className="space-y-2 border-b border-border/70 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-500" />
            <p className="text-sm font-semibold">Quick Edit</p>
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            Common edits for {selectedDef.label.toLowerCase()} stay next to the section you selected.
          </p>
        </div>
      </div>
      <ScrollArea className="max-h-[70vh]">
        <div className="p-4">
          <BlockEditor
            blockDef={selectedDef}
            props={selectedBlock.props}
            onChange={(props) => updateBlockProps(selectedBlock.id, props)}
            mode="contextual"
            onOpenAdvanced={() => setAdvancedInspectorOpen(true)}
          />
        </div>
      </ScrollArea>
    </div>
  ) : null;

  const inspectorPanel = selectedBlock && selectedDef ? (
    <div className="flex h-full flex-col rounded-2xl border border-border/70 bg-background shadow-sm" data-testid="block-editor-panel">
      <div className="space-y-3 border-b border-border/70 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-violet-500" />
              <p className="text-sm font-semibold">Inspector</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Advanced settings for the selected section. Use Quick Edit on the canvas for the most common changes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSavingSectionBlockId(selectedBlock.id)}
            >
              <Bookmark className="mr-1.5 h-4 w-4" />
              Save Section
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setAdvancedInspectorOpen(false)}
              data-testid="button-close-editor-panel"
            >
              <ChevronDown className="h-4 w-4 -rotate-90" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-violet-100 dark:bg-violet-900/30">
            <BlockIcon name={selectedDef.iconName} className="h-4 w-4 text-violet-600" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{selectedDef.label}</p>
            <p className="truncate text-xs text-muted-foreground">{selectedDef.description}</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          <BlockEditor
            blockDef={selectedDef}
            props={selectedBlock.props}
            onChange={(props) => updateBlockProps(selectedBlock.id, props)}
          />
        </div>
      </ScrollArea>
    </div>
  ) : (
    <div className="flex h-full flex-col rounded-2xl border border-dashed border-border/70 bg-background/70 p-6 text-center shadow-sm">
      <div className="m-auto max-w-sm">
        <Settings2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/35" />
        <p className="text-base font-semibold">Select a block to inspect</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Click any section directly on the canvas or from the structure panel to edit its content, media, layout, and settings.
        </p>
      </div>
    </div>
  );

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
            Structure on the left, real page canvas in the center, and a nearby quick editor on the canvas itself.
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
            onClick={() => setAdvancedInspectorOpen((current) => !current)}
            disabled={!selectedBlock}
          >
            <Settings2 className="mr-1.5 h-4 w-4" />
            {advancedInspectorOpen ? "Hide Advanced" : "Show Advanced"}
          </Button>
          <Dialog
            open={addDialogOpen}
            onOpenChange={(open) => {
              setAddDialogOpen(open);
              if (!open) setInsertAtIndex(null);
            }}
          >
            <DialogTrigger asChild>
              <Button data-testid="button-add-block-toolbar" onClick={() => setInsertAtIndex(null)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add Content
              </Button>
            </DialogTrigger>
            {addBlockDialogContent}
          </Dialog>
        </div>
      </div>

      <div className="space-y-4 lg:hidden">
        {navigatorPanel}
        <div className="rounded-2xl border border-border/70 bg-background shadow-sm">
          <VisualCanvas
            blocks={blocks}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onDuplicate={duplicateBlock}
            onDelete={removeBlock}
            onMove={moveBlock}
            onAddBelow={openAddBelow}
            contextualEditor={contextualEditor}
            registerBlockRef={registerBlockRef}
          />
        </div>
        {advancedInspectorOpen ? inspectorPanel : (
          <div className="rounded-2xl border border-dashed border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
            Advanced inspector is hidden. Use Quick Edit on the selected section, or tap "Show Advanced" for full controls.
          </div>
        )}
      </div>

      <div className="hidden lg:block">
        {advancedInspectorOpen ? (
          <ResizablePanelGroup
            direction="horizontal"
            className="min-h-[calc(100vh-270px)] rounded-2xl border border-border/60 bg-muted/10"
          >
            <ResizablePanel defaultSize={20} minSize={16}>
              <div className="h-full p-3">{navigatorPanel}</div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={55} minSize={35}>
              <div className="h-full p-3">
                <div className="h-full overflow-hidden rounded-2xl border border-border/70 bg-background shadow-sm">
                  <VisualCanvas
                    blocks={blocks}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    onDuplicate={duplicateBlock}
                    onDelete={removeBlock}
                    onMove={moveBlock}
                    onAddBelow={openAddBelow}
                    contextualEditor={contextualEditor}
                    registerBlockRef={registerBlockRef}
                  />
                </div>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={25} minSize={20}>
              <div className="h-full p-3">{inspectorPanel}</div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <ResizablePanelGroup
            direction="horizontal"
            className="min-h-[calc(100vh-270px)] rounded-2xl border border-border/60 bg-muted/10"
          >
            <ResizablePanel defaultSize={22} minSize={18}>
              <div className="h-full p-3">{navigatorPanel}</div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={78} minSize={50}>
              <div className="h-full p-3">
                <div className="relative h-full overflow-hidden rounded-2xl border border-border/70 bg-background shadow-sm">
                  <div className="absolute right-4 top-4 z-20 rounded-full border border-border/70 bg-background/95 px-3 py-1 text-xs text-muted-foreground shadow-sm">
                    Advanced inspector hidden
                  </div>
                  <VisualCanvas
                    blocks={blocks}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    onDuplicate={duplicateBlock}
                    onDelete={removeBlock}
                    onMove={moveBlock}
                    onAddBelow={openAddBelow}
                    contextualEditor={contextualEditor}
                    registerBlockRef={registerBlockRef}
                  />
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>

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
    </div>
  );
}
