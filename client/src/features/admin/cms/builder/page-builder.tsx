import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Copy,
  FileText,
  Eye,
  EyeOff,
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
  LocateFixed,
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
  Tablet,
  UserCheck,
  Users,
  Workflow,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Smartphone,
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
import { BlockRenderer as AdminBlockRenderer } from "./block-renderer";
import {
  getSectionPaddingClasses,
  getSectionStyleConfig,
  hasSectionStyleConfig,
  SectionStyleWrapper,
} from "./section-style";
import { PublicBlockRenderer, PublicPageRenderer, FULL_WIDTH_BLOCK_TYPES } from "@/features/public/public-block-renderer";
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
const SYSTEM_SECTION_NAME_PREFIX = "Starter - ";

interface PageBuilderProps {
  content: BuilderContent;
  onChange: (content: BuilderContent) => void;
}

type LeftRailMode = "structure" | "inserter";
type InsertPayload =
  | { kind: "block"; type: string }
  | { kind: "section"; sectionId: string; blocks: BlockInstance[] };

interface SaveSectionDialogProps {
  block: BlockInstance;
  onClose: () => void;
}

interface VisualCanvasProps {
  blocks: BlockInstance[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleActive: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onAddBelow: (id: string) => void;
  registerBlockRef: (id: string, node: HTMLDivElement | null) => void;
  onCanvasDragStart: (event: DragEvent, blockId: string) => void;
  onCanvasDragEnd: () => void;
  draggedBlockId: string | null;
  hasActiveDragPayload: boolean;
  dropTarget: { id: string; position: "before" | "after" } | null;
  onBlockDragOver: (event: DragEvent, targetId: string) => void;
  onBlockDrop: (event: DragEvent, targetId: string) => void;
  onBlockDragEnd: () => void;
  desktopFrameClassName?: string;
}

interface FrontendPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blocks: BlockInstance[];
  previewDevice: "desktop" | "tablet" | "mobile";
  onPreviewDeviceChange: (device: "desktop" | "tablet" | "mobile") => void;
}

const PREVIEW_DEVICE_LABELS = {
  desktop: "Desktop",
  tablet: "Tablet",
  mobile: "Mobile",
} as const;

const PREVIEW_DEVICE_FRAME_CLASSES = {
  desktop: "w-full max-w-[1280px]",
  tablet: "w-full max-w-[834px]",
  mobile: "w-full max-w-[430px]",
} as const;

function FrontendPreviewFrame({
  previewDevice,
  blocks,
}: {
  previewDevice: "desktop" | "tablet" | "mobile";
  blocks: BlockInstance[];
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [mountNode, setMountNode] = useState<HTMLDivElement | null>(null);
  const [frameHeight, setFrameHeight] = useState(900);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write("<!doctype html><html><head></head><body></body></html>");
    doc.close();

    doc.documentElement.lang = document.documentElement.lang || "en";
    doc.body.style.margin = "0";
    doc.body.style.background = "transparent";
    doc.body.style.minHeight = "100vh";

    Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]')).forEach((node) => {
      doc.head.appendChild(node.cloneNode(true));
    });

    const root = doc.createElement("div");
    root.setAttribute("data-frontend-preview-root", "true");
    root.style.minHeight = "100vh";
    doc.body.appendChild(root);
    setMountNode(root);

    return () => {
      setMountNode(null);
    };
  }, [previewDevice]);

  useEffect(() => {
    if (!mountNode) return;
    const doc = mountNode.ownerDocument;
    const view = doc.defaultView;
    if (!view) return;

    const updateHeight = () => {
      const nextHeight = Math.max(
        mountNode.scrollHeight,
        doc.body.scrollHeight,
        doc.documentElement.scrollHeight,
        900
      );
      setFrameHeight(nextHeight);
    };

    updateHeight();

    const ResizeObserverCtor = view.ResizeObserver;
    if (!ResizeObserverCtor) {
      const frame = view.requestAnimationFrame(updateHeight);
      return () => view.cancelAnimationFrame(frame);
    }

    const observer = new ResizeObserverCtor(() => updateHeight());
    observer.observe(mountNode);
    observer.observe(doc.body);
    observer.observe(doc.documentElement);
    const frame = view.requestAnimationFrame(updateHeight);

    return () => {
      view.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [mountNode, blocks]);

  return (
    <>
      <iframe
        ref={iframeRef}
        title={`${PREVIEW_DEVICE_LABELS[previewDevice]} frontend preview`}
        className={cn(
          "block overflow-hidden rounded-[28px] border border-border/60 bg-background shadow-[0_20px_70px_rgba(15,23,42,0.08)] transition-[max-width] duration-200",
          PREVIEW_DEVICE_FRAME_CLASSES[previewDevice],
        )}
        style={{ height: `${frameHeight}px` }}
      />
      {mountNode
        ? createPortal(
            <div className="min-h-screen bg-background">
              <PublicPageRenderer blocks={blocks} />
            </div>,
            mountNode
          )
        : null}
    </>
  );
}

function FrontendPreviewDialog({
  open,
  onOpenChange,
  blocks,
  previewDevice,
  onPreviewDeviceChange,
}: FrontendPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[calc(100vh-2rem)] w-[min(1440px,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border/60 px-6 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <DialogTitle className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-primary" />
                Frontend Preview
              </DialogTitle>
              <DialogDescription>
                Review the current page content with the published renderer only, without builder chrome, before you publish.
              </DialogDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Monitor className="h-3 w-3" />
                {PREVIEW_DEVICE_LABELS[previewDevice]}
              </Badge>
              <div className="flex items-center rounded-lg border border-border/70 bg-background p-1">
                <Button
                  type="button"
                  variant={previewDevice === "desktop" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onPreviewDeviceChange("desktop")}
                  data-testid="button-frontend-preview-desktop"
                  title="Desktop preview"
                >
                  <Monitor className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant={previewDevice === "tablet" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onPreviewDeviceChange("tablet")}
                  data-testid="button-frontend-preview-tablet"
                  title="Tablet preview"
                >
                  <Tablet className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant={previewDevice === "mobile" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onPreviewDeviceChange("mobile")}
                  data-testid="button-frontend-preview-mobile"
                  title="Mobile preview"
                >
                  <Smartphone className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </DialogHeader>
        <div className="min-h-0 flex-1 bg-[radial-gradient(circle_at_top,_rgba(137,205,161,0.10),_transparent_45%),linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(248,250,252,0.98))] p-4 sm:p-6">
          <ScrollArea className="h-full">
            <div className="mx-auto w-full">
              <FrontendPreviewFrame previewDevice={previewDevice} blocks={blocks} />
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
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
    onError: (error: Error) => {
      toast({
        title: "Failed to save section",
        description: error.message,
        variant: "destructive",
      });
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

function SectionsLibrary({
  onInsert,
  onDragStart,
  onDragEnd,
}: {
  onInsert: (blocks: BlockInstance[]) => void;
  onDragStart: (event: DragEvent, payload: InsertPayload) => void;
  onDragEnd: () => void;
}) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: sections = [], isLoading } = useQuery<CmsSection[]>({
    queryKey: ["/api/admin/cms/sections"],
  });

  const filteredSections = sections.filter((section) => {
    const sectionBlocks = Array.isArray(section.blocks) ? (section.blocks as BlockInstance[]) : [];
    const containsDynamicStarterBlock =
      section.name.startsWith(SYSTEM_SECTION_NAME_PREFIX) &&
      sectionBlocks.some((block) => getBlockDef(block.type)?.isDynamic);

    if (containsDynamicStarterBlock) return false;

    const matchesSearch = !search || section.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || section.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const remapSectionBlocks = (section: CmsSection) => {
    const blocks = Array.isArray(section.blocks) ? (section.blocks as BlockInstance[]) : [];
    return blocks.map((block) => ({ ...block, id: crypto.randomUUID() }));
  };

  const insertSection = (section: CmsSection) => {
    onInsert(remapSectionBlocks(section));
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
                draggable
                onDragStart={(event) =>
                  onDragStart(event, {
                    kind: "section",
                    sectionId: section.id,
                    blocks: remapSectionBlocks(section),
                  })
                }
                onDragEnd={onDragEnd}
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
  onToggleActive,
  onDuplicate,
  onDelete,
  onMove,
  onAddBelow,
  registerBlockRef,
  onCanvasDragStart,
  onCanvasDragEnd,
  draggedBlockId,
  hasActiveDragPayload,
  dropTarget,
  onBlockDragOver,
  onBlockDrop,
  onBlockDragEnd,
}: {
  block: BlockInstance;
  index: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onToggleActive: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onAddBelow: (id: string) => void;
  registerBlockRef: (id: string, node: HTMLDivElement | null) => void;
  onCanvasDragStart: (event: DragEvent, blockId: string) => void;
  onCanvasDragEnd: () => void;
  draggedBlockId: string | null;
  hasActiveDragPayload: boolean;
  dropTarget: { id: string; position: "before" | "after" } | null;
  onBlockDragOver: (event: DragEvent, targetId: string) => void;
  onBlockDrop: (event: DragEvent, targetId: string) => void;
  onBlockDragEnd: () => void;
}) {
  const blockDef = getBlockDef(block.type);
  const summary = getBlockSummary(block);
  const isDynamic = isDynamicBlock(block.type);
  const showDropBefore = dropTarget?.id === block.id && dropTarget.position === "before";
  const showDropAfter = dropTarget?.id === block.id && dropTarget.position === "after";

  return (
    <div
      ref={(node) => {
        registerBlockRef(block.id, node);
      }}
      className={cn(
        "group relative scroll-mt-24 transition-all",
        draggedBlockId === block.id && "opacity-60",
        showDropBefore && "pt-4 before:absolute before:left-6 before:right-6 before:top-1 before:z-30 before:h-1 before:rounded-full before:bg-violet-500",
        showDropAfter && "pb-4 after:absolute after:left-6 after:right-6 after:bottom-1 after:z-30 after:h-1 after:rounded-full after:bg-violet-500"
      )}
      onDragOver={(event) => onBlockDragOver(event, block.id)}
      onDrop={(event) => onBlockDrop(event, block.id)}
      onDragEnd={onBlockDragEnd}
      data-testid={`canvas-block-${block.id}`}
    >
      <div
        className={cn(
          "relative transition-all",
          isSelected
            ? "ring-2 ring-violet-500 ring-offset-4 ring-offset-background"
            : "hover:ring-2 hover:ring-violet-300/70 hover:ring-offset-2 hover:ring-offset-background",
          hasActiveDragPayload && !isSelected && "ring-offset-background"
        )}
      >
        <div className="pointer-events-none select-none">
          <AdminBlockRenderer block={block} isAdminPreview disableSectionStyleWrap />
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
        {block.props.isActive === false && (
          <Badge variant="outline" className="border-slate-300 bg-slate-50/90 text-slate-700 backdrop-blur dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300">
            Inactive
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
          className="h-8 w-8 cursor-grab shadow-sm active:cursor-grabbing"
          draggable
          onDragStart={(event) => {
            event.stopPropagation();
            onCanvasDragStart(event, block.id);
          }}
          onDragEnd={(event) => {
            event.stopPropagation();
            onCanvasDragEnd();
          }}
          data-testid={`canvas-drag-${block.id}`}
          title="Drag to move"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-8 w-8 shadow-sm"
          onClick={(event) => {
            event.stopPropagation();
            onToggleActive(block.id);
          }}
          data-testid={`canvas-toggle-active-${block.id}`}
          title={block.props.isActive === false ? "Show on public site" : "Hide from public site"}
        >
          {block.props.isActive === false ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </Button>
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
    </div>
  );
}

function VisualCanvas({
  blocks,
  selectedId,
  onSelect,
  onToggleActive,
  onDuplicate,
  onDelete,
  onMove,
  onAddBelow,
  registerBlockRef,
  onCanvasDragStart,
  onCanvasDragEnd,
  draggedBlockId,
  hasActiveDragPayload,
  dropTarget,
  onBlockDragOver,
  onBlockDrop,
  onBlockDragEnd,
  desktopFrameClassName,
}: VisualCanvasProps) {
  let nonFullWidthIndex = 0;

  return (
    <div className="h-full bg-[radial-gradient(circle_at_top,_rgba(137,205,161,0.12),_transparent_45%),linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(248,250,252,0.98))] p-5">
      <div className={cn("mx-auto flex min-h-full max-w-full flex-col overflow-hidden rounded-[28px] border border-border/60 bg-background shadow-[0_20px_70px_rgba(15,23,42,0.08)] transition-[max-width] duration-200", desktopFrameClassName)}>
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Visual Canvas</p>
            <p className="text-xs text-muted-foreground">
              This editing surface uses the published page renderer, then layers selection and editing tools on top.
            </p>
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1">
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
                    onToggleActive={onToggleActive}
                    onDuplicate={onDuplicate}
                    onDelete={onDelete}
                    onMove={onMove}
                    onAddBelow={onAddBelow}
                    registerBlockRef={registerBlockRef}
                    onCanvasDragStart={onCanvasDragStart}
                    onCanvasDragEnd={onCanvasDragEnd}
                    draggedBlockId={draggedBlockId}
                    hasActiveDragPayload={hasActiveDragPayload}
                    dropTarget={dropTarget}
                    onBlockDragOver={onBlockDragOver}
                    onBlockDrop={onBlockDrop}
                    onBlockDragEnd={onBlockDragEnd}
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
              <div aria-hidden className="h-28 sm:h-40 xl:h-56 2xl:h-72" />
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

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
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [frontendPreviewOpen, setFrontendPreviewOpen] = useState(false);
  const [insertAtIndex, setInsertAtIndex] = useState<number | null>(null);
  const blockRefs = useRef(new Map<string, HTMLDivElement | null>());
  const desktopCanvasPanelRef = useRef<HTMLDivElement | null>(null);
  const desktopInspectorShellRef = useRef<HTMLDivElement | null>(null);
  const [desktopInspectorOffset, setDesktopInspectorOffset] = useState(0);

  const blocks = content.blocks ?? [];
  const selectedBlock = blocks.find((block) => block.id === selectedId) ?? null;
  const selectedDef = selectedBlock ? getBlockDef(selectedBlock.type) : null;

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

    const blockAnchorRelative = blockRect.top - viewportRect.top + blockRect.height * 0.24;
    const desiredTopAnchor = Math.max(120, Math.min(210, shellHeight * 0.24));
    const minInspectorHeight = Math.min(460, Math.max(300, shellHeight * 0.44));
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
    <div className="flex h-full flex-col gap-3">
      <div className="rounded-2xl border border-border/70 bg-background p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={leftRailMode === "structure" ? "secondary" : "ghost"}
            size="sm"
            className="min-w-0 px-2 text-xs sm:text-sm"
            onClick={() => setLeftRailMode("structure")}
            data-testid="button-left-rail-structure"
          >
            <ListOrdered className="mr-1.5 h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Structure</span>
          </Button>
          <Button
            type="button"
            variant={leftRailMode === "inserter" ? "secondary" : "ghost"}
            size="sm"
            className="min-w-0 px-2 text-xs sm:text-sm"
            onClick={() => setLeftRailMode("inserter")}
            data-testid="button-left-rail-inserter"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Add Content</span>
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        {leftRailMode === "structure" ? structurePanel : inserterPanel}
      </div>
    </div>
  );

  const inspectorPanel = selectedBlock && selectedDef ? (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-background shadow-sm"
      data-testid="block-editor-panel"
    >
      <div className="space-y-3 border-b border-border/70 px-4 py-4">
        <div className="space-y-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-violet-500" />
              <p className="text-sm font-semibold">Contextual Inspector</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Full editing for the selected section lives here, with grouped controls for content, media, layout, and section settings.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => scrollBlockIntoView(selectedBlock.id)}
              data-testid="button-locate-block-on-canvas"
            >
              <LocateFixed className="mr-1.5 h-4 w-4" />
              Locate
            </Button>
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
          <Badge variant="outline" className="ml-auto shrink-0">
            Block {blocks.findIndex((block) => block.id === selectedBlock.id) + 1}
          </Badge>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-4 pb-12">
          <BlockEditor
            blockDef={selectedDef}
            props={selectedBlock.props}
            onChange={(props) => updateBlockProps(selectedBlock.id, props)}
          />
        </div>
      </ScrollArea>
    </div>
  ) : (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-dashed border-border/70 bg-background/70 p-6 text-center shadow-sm">
      <div className="m-auto max-w-sm">
        <Settings2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/35" />
        <p className="text-base font-semibold">Select a block to inspect</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Click any section directly on the canvas or from the structure panel. The docked inspector will open with the full editing form for that block.
        </p>
      </div>
    </div>
  );

  const renderDesktopInspectorPanel = () => (
    <div ref={desktopInspectorShellRef} className="h-full min-h-0 overflow-hidden p-3">
      <div
        className="h-full min-h-0 transition-[padding-top] duration-200 ease-out"
        style={{ paddingTop: `${desktopInspectorOffset}px` }}
      >
        <div
          className="min-h-0"
          style={{ height: `calc(100% - ${desktopInspectorOffset}px)` }}
        >
          {inspectorPanel}
        </div>
      </div>
    </div>
  );

  const renderRailToggle = ({
    side,
    collapsed,
    onClick,
    label,
  }: {
    side: "left" | "right";
    collapsed: boolean;
    onClick: () => void;
    label: string;
  }) => (
    <button
      type="button"
      className="absolute top-6 z-20 flex h-7 w-7 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm transition-all hover:text-foreground hover:shadow-md"
      style={side === "left" ? { left: -14 } : { right: -14 }}
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      aria-label={label}
      title={label}
      data-testid={side === "left" ? "button-toggle-structure-panel" : "button-toggle-inspector-panel"}
    >
      {side === "left" ? (
        collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />
      ) : (
        collapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
      )}
    </button>
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

      <div className="hidden xl:sticky xl:top-6 xl:block">
        {structurePanelOpen && advancedInspectorOpen ? (
          <ResizablePanelGroup
            key="desktop-layout-both-open"
            direction="horizontal"
            className="h-[calc(100vh-170px)] min-h-[700px] overflow-hidden rounded-2xl border border-border/60 bg-muted/10"
          >
            <ResizablePanel defaultSize={18} minSize={14}>
              <div className="h-full min-h-0 p-3">{leftRailPanel}</div>
            </ResizablePanel>
            <ResizableHandle>
              {renderRailToggle({
                side: "left",
                collapsed: false,
                onClick: () => setStructurePanelOpen(false),
                label: "Collapse structure panel",
              })}
            </ResizableHandle>
            <ResizablePanel defaultSize={60} minSize={32}>
              <div className="h-full min-h-0 p-3">
                <div ref={desktopCanvasPanelRef} className="h-full overflow-hidden rounded-2xl border border-border/70 bg-background shadow-sm">
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
              </div>
            </ResizablePanel>
            <ResizableHandle>
              {renderRailToggle({
                side: "right",
                collapsed: false,
                onClick: () => setAdvancedInspectorOpen(false),
                label: "Collapse inspector panel",
              })}
            </ResizableHandle>
            <ResizablePanel defaultSize={22} minSize={18}>
              {renderDesktopInspectorPanel()}
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : structurePanelOpen ? (
          <ResizablePanelGroup
            key="desktop-layout-structure-open"
            direction="horizontal"
            className="h-[calc(100vh-170px)] min-h-[700px] overflow-hidden rounded-2xl border border-border/60 bg-muted/10"
          >
            <ResizablePanel defaultSize={18} minSize={14}>
              <div className="h-full min-h-0 p-3">{leftRailPanel}</div>
            </ResizablePanel>
            <ResizableHandle>
              {renderRailToggle({
                side: "left",
                collapsed: false,
                onClick: () => setStructurePanelOpen(false),
                label: "Collapse structure panel",
              })}
            </ResizableHandle>
            <ResizablePanel defaultSize={82} minSize={48}>
              <div className="h-full min-h-0 p-3">
                <div ref={desktopCanvasPanelRef} className="relative h-full overflow-hidden rounded-2xl border border-border/70 bg-background shadow-sm">
                  {renderRailToggle({
                    side: "right",
                    collapsed: true,
                    onClick: () => setAdvancedInspectorOpen(true),
                    label: "Show inspector panel",
                  })}
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
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : advancedInspectorOpen ? (
          <ResizablePanelGroup
            key="desktop-layout-inspector-open"
            direction="horizontal"
            className="h-[calc(100vh-170px)] min-h-[700px] overflow-hidden rounded-2xl border border-border/60 bg-muted/10"
          >
            <ResizablePanel defaultSize={78} minSize={45}>
              <div className="h-full min-h-0 p-3">
                <div ref={desktopCanvasPanelRef} className="relative h-full overflow-hidden rounded-2xl border border-border/70 bg-background shadow-sm">
                  {renderRailToggle({
                    side: "left",
                    collapsed: true,
                    onClick: () => setStructurePanelOpen(true),
                    label: "Show structure panel",
                  })}
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
              </div>
            </ResizablePanel>
            <ResizableHandle>
              {renderRailToggle({
                side: "right",
                collapsed: false,
                onClick: () => setAdvancedInspectorOpen(false),
                label: "Collapse inspector panel",
              })}
            </ResizableHandle>
            <ResizablePanel defaultSize={22} minSize={18}>
              {renderDesktopInspectorPanel()}
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div key="desktop-layout-canvas-only" className="h-[calc(100vh-170px)] min-h-[700px] overflow-hidden rounded-2xl border border-border/60 bg-muted/10 p-3">
            <div ref={desktopCanvasPanelRef} className="relative h-full overflow-hidden rounded-2xl border border-border/70 bg-background shadow-sm">
              {renderRailToggle({
                side: "left",
                collapsed: true,
                onClick: () => setStructurePanelOpen(true),
                label: "Show structure panel",
              })}
              {renderRailToggle({
                side: "right",
                collapsed: true,
                onClick: () => setAdvancedInspectorOpen(true),
                label: "Show inspector panel",
              })}
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
          </div>
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
