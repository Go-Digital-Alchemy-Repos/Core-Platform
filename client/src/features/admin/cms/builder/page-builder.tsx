import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Pencil,
  Layers,
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
  GripVertical,
  Bookmark,
  Search,
  Blocks,
  Lock,
  Map as MapIcon,
  UserPlus,
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
} from "lucide-react";
import { BLOCK_REGISTRY, ALL_BLOCKS, getBlockDef, createBlock, isDynamicBlock, type BlockInstance, type BuilderContent, type BlockCategory, type BlockDef } from "./block-registry";
import { BlockEditor } from "./block-editor";
import { PageRenderer, BlockRenderer } from "./block-renderer";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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
  UserPlus,
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

function groupBlocksByCategory(blocks: BlockDef[]): { category: BlockCategory; label: string; items: BlockDef[] }[] {
  const grouped = new Map<BlockCategory, BlockDef[]>();
  for (const block of blocks) {
    const cat = block.category;
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(block);
  }
  return BLOCK_CATEGORY_ORDER
    .filter((cat) => grouped.has(cat))
    .map((cat) => ({ category: cat, label: BLOCK_CATEGORY_LABELS[cat], items: grouped.get(cat)! }));
}

function BlockIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] ?? Layers;
  return <Icon className={className} />;
}

interface PageBuilderProps {
  content: BuilderContent;
  onChange: (content: BuilderContent) => void;
}

interface SaveSectionDialogProps {
  block: BlockInstance;
  onClose: () => void;
}

function SaveSectionDialog({ block, onClose }: SaveSectionDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/cms/sections", {
        name,
        description,
        category,
        blocks: [block],
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/sections"] });
      toast({ title: "Saved as reusable section" });
      onClose();
    },
    onError: () => toast({ title: "Failed to save section", variant: "destructive" }),
  });

  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-1.5">
        <Label>Section Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
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
            {SECTION_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Description <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="When to use this section…"
          rows={2}
          data-testid="input-save-section-description"
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!name.trim() || saveMutation.isPending}
          data-testid="button-confirm-save-section"
        >
          {saveMutation.isPending ? "Saving…" : "Save Section"}
        </Button>
      </DialogFooter>
    </div>
  );
}

interface SectionsLibraryProps {
  onInsert: (blocks: BlockInstance[]) => void;
}

function SectionsLibrary({ onInsert }: SectionsLibraryProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: sections = [], isLoading } = useQuery<CmsSection[]>({
    queryKey: ["/api/admin/cms/sections"],
  });

  const filtered = sections.filter((s) => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || s.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const insertSection = (section: CmsSection) => {
    const blocks = Array.isArray(section.blocks) ? (section.blocks as BlockInstance[]) : [];
    const remapped = blocks.map((b) => ({
      ...b,
      id: crypto.randomUUID(),
    }));
    onInsert(remapped);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search saved sections…"
            className="pl-8 h-8 text-sm"
            data-testid="input-library-search"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-32 h-8 text-xs" data-testid="select-library-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All</SelectItem>
            {SECTION_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c} className="text-xs capitalize">{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
          <Blocks className="h-8 w-8 opacity-30" />
          <p className="text-sm font-medium">{search ? "No sections match" : "No saved sections yet"}</p>
          <p className="text-xs">
            {search ? "Try a different search" : "Save a block as a reusable section using the bookmark icon on any block"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {filtered.map((section) => {
            const blockCount = Array.isArray(section.blocks) ? section.blocks.length : 0;
            return (
              <button
                key={section.id}
                onClick={() => insertSection(section)}
                className="flex items-start gap-2.5 p-3 rounded-lg border hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 text-left transition-colors group"
                data-testid={`insert-section-${section.id}`}
              >
                <div className="h-7 w-7 rounded-md bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
                  <Layers className="h-3.5 w-3.5 text-violet-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-tight truncate">{section.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="secondary" className="text-[9px] capitalize px-1 py-0">{section.category ?? "general"}</Badge>
                    <span className="text-[10px] text-muted-foreground">{blockCount} block{blockCount !== 1 ? "s" : ""}</span>
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

export function PageBuilder({ content, onChange }: PageBuilderProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [savingSectionBlockId, setSavingSectionBlockId] = useState<string | null>(null);

  const blocks = content.blocks ?? [];

  const selectedBlock = blocks.find((b) => b.id === selectedId) ?? null;
  const selectedDef = selectedBlock ? getBlockDef(selectedBlock.type) : null;

  const setBlocks = useCallback(
    (next: BlockInstance[]) => onChange({ ...content, blocks: next }),
    [content, onChange]
  );

  const addBlock = (type: string) => {
    const block = createBlock(type);
    setBlocks([...blocks, block]);
    setSelectedId(block.id);
    setAddDialogOpen(false);
  };

  const insertBlocks = (newBlocks: BlockInstance[]) => {
    setBlocks([...blocks, ...newBlocks]);
    setAddDialogOpen(false);
  };

  const removeBlock = (id: string) => {
    if (selectedId === id) setSelectedId(null);
    setBlocks(blocks.filter((b) => b.id !== id));
  };

  const moveBlock = (id: string, dir: "up" | "down") => {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx < 0) return;
    const next = [...blocks];
    if (dir === "up" && idx > 0) {
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    } else if (dir === "down" && idx < next.length - 1) {
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    }
    setBlocks(next);
  };

  const updateBlockProps = (id: string, props: Record<string, unknown>) => {
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, props } : b)));
  };

  const savingBlock = savingSectionBlockId ? blocks.find((b) => b.id === savingSectionBlockId) ?? null : null;

  if (previewMode) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">Page Preview</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewMode(false)}
            data-testid="button-exit-preview"
          >
            <EyeOff className="h-4 w-4 mr-1.5" />
            Exit Preview
          </Button>
        </div>
        <div className="border rounded-xl bg-background p-6 min-h-[400px]">
          {blocks.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              No blocks yet — exit preview and add blocks.
            </div>
          ) : (
            <PageRenderer blocks={blocks} />
          )}
        </div>
      </div>
    );
  }

  const AddBlockDialogContent = () => (
    <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
      <DialogHeader className="px-6 pt-6 pb-0">
        <DialogTitle>Add Content</DialogTitle>
      </DialogHeader>
      <Tabs defaultValue="blocks" className="flex-1 flex flex-col overflow-hidden">
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
        <TabsContent value="blocks" className="flex-1 overflow-y-auto px-6 pb-6 pt-3 mt-0">
          <div className="space-y-5">
            {groupBlocksByCategory(ALL_BLOCKS).map(({ category, label, items }) => (
              <div key={category}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{label}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {items.map((def) => (
                    <button
                      key={def.type}
                      onClick={() => addBlock(def.type)}
                      className="flex items-start gap-3 p-3 rounded-lg border hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 text-left transition-colors group"
                      data-testid={`block-type-${def.type}`}
                    >
                      <div className="h-8 w-8 rounded-md bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-200 dark:group-hover:bg-violet-900/50 transition-colors">
                        <BlockIcon name={def.iconName} className="h-4 w-4 text-violet-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-tight">{def.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{def.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="sections" className="flex-1 overflow-y-auto px-6 pb-6 pt-3 mt-0">
          <SectionsLibrary onInsert={(newBlocks) => insertBlocks(newBlocks)} />
        </TabsContent>
      </Tabs>
    </DialogContent>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-violet-500" />
          <span className="text-sm font-medium">Page Builder</span>
          <Badge variant="outline" className="text-xs">{blocks.length} block{blocks.length !== 1 ? "s" : ""}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {blocks.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewMode(true)}
              data-testid="button-preview"
            >
              <Eye className="h-4 w-4 mr-1.5" />
              Preview
            </Button>
          )}
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-block">
                <Plus className="h-4 w-4 mr-1.5" />
                Add Block
              </Button>
            </DialogTrigger>
            <AddBlockDialogContent />
          </Dialog>
        </div>
      </div>

      {blocks.length === 0 ? (
        <div className="border-2 border-dashed border-muted rounded-xl p-12 text-center">
          <Layers className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="font-medium text-muted-foreground">No blocks yet</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Add content blocks or insert from your saved sections library
          </p>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-add-first-block">
                <Plus className="h-4 w-4 mr-2" />
                Add First Block
              </Button>
            </DialogTrigger>
            <AddBlockDialogContent />
          </Dialog>
        </div>
      ) : (
        <div className={`grid gap-4 ${selectedBlock ? "lg:grid-cols-[1fr_340px]" : "grid-cols-1"} ${selectedBlock ? "lg:h-[calc(100vh-220px)]" : ""}`}>
          <div className={`space-y-2 ${selectedBlock ? "lg:overflow-y-auto lg:pr-1" : ""}`} data-testid="builder-block-list">
            {blocks.map((block, idx) => {
              const def = getBlockDef(block.type);
              const isSelected = block.id === selectedId;
              const dynamic = isDynamicBlock(block.type);
              const dynamicEditable = dynamic && def && def.propDefs.length > 0;
              return (
                <div
                  key={block.id}
                  className={`border rounded-lg overflow-hidden transition-all ${
                    dynamic
                      ? "border-amber-300 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-950/10"
                      : isSelected
                      ? "border-violet-400 shadow-sm"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                  data-testid={`block-item-${block.id}`}
                >
                  <div className={`flex items-center gap-2 px-3 py-2 ${dynamic ? "bg-amber-50/50 dark:bg-amber-950/20" : "bg-muted/20"}`}>
                    <GripVertical className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                    <div className={`h-6 w-6 rounded flex items-center justify-center flex-shrink-0 ${dynamic ? "bg-amber-100 dark:bg-amber-900/30" : "bg-violet-100 dark:bg-violet-900/30"}`}>
                      {def && <BlockIcon name={def.iconName} className={`h-3.5 w-3.5 ${dynamic ? "text-amber-600" : "text-violet-600"}`} />}
                    </div>
                    <span className="text-xs font-medium flex-1 truncate">
                      {def?.label ?? block.type}
                      {dynamic && (
                        <Badge variant="outline" className="ml-1.5 text-[9px] px-1 py-0 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400">
                          <Lock className="h-2.5 w-2.5 mr-0.5" />
                          Dynamic
                        </Badge>
                      )}
                      {(!dynamic || dynamicEditable) && (() => {
                        const subtitle = typeof block.props.title === "string" && block.props.title
                          ? block.props.title
                          : typeof block.props.heading === "string" && block.props.heading
                          ? block.props.heading
                          : null;
                        return subtitle ? (
                          <span className="text-muted-foreground font-normal ml-1.5">— {subtitle}</span>
                        ) : null;
                      })()}
                    </span>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {(!dynamic || dynamicEditable) && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            disabled={idx === 0}
                            onClick={() => moveBlock(block.id, "up")}
                            data-testid={`button-move-up-${block.id}`}
                            title="Move up"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            disabled={idx === blocks.length - 1}
                            onClick={() => moveBlock(block.id, "down")}
                            data-testid={`button-move-down-${block.id}`}
                            title="Move down"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {(!dynamic || dynamicEditable) && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-6 w-6 ${isSelected ? "text-violet-600" : ""}`}
                            onClick={() => setSelectedId(isSelected ? null : block.id)}
                            data-testid={`button-edit-block-${block.id}`}
                            title={isSelected ? "Close editor" : "Edit block"}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-amber-600"
                            onClick={() => setSavingSectionBlockId(block.id)}
                            data-testid={`button-save-section-${block.id}`}
                            title="Save as reusable section"
                          >
                            <Bookmark className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => removeBlock(block.id)}
                            data-testid={`button-delete-block-${block.id}`}
                            title="Remove block"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="p-3 pointer-events-none select-none opacity-80 max-h-48 overflow-hidden">
                    <BlockRenderer block={block} isAdminPreview={dynamic} />
                  </div>
                </div>
              );
            })}
          </div>

          {selectedBlock && selectedDef && (
            <div
              className="border rounded-xl bg-background lg:overflow-y-auto"
              data-testid="block-editor-panel"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
                <div className="flex items-center gap-2">
                  <BlockIcon name={selectedDef.iconName} className="h-4 w-4 text-violet-500" />
                  <span className="text-sm font-semibold">{selectedDef.label}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setSelectedId(null)}
                  data-testid="button-close-editor-panel"
                >
                  <EyeOff className="h-3.5 w-3.5" />
                </Button>
              </div>
              <ScrollArea className="lg:h-auto h-[calc(100vh-300px)] max-h-[600px] lg:max-h-none">
                <div className="p-4">
                  <BlockEditor
                    blockDef={selectedDef}
                    props={selectedBlock.props}
                    onChange={(props) => updateBlockProps(selectedBlock.id, props)}
                  />
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      )}

      <Dialog
        open={!!savingSectionBlockId}
        onOpenChange={(open) => { if (!open) setSavingSectionBlockId(null); }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bookmark className="h-4 w-4 text-amber-500" />
              Save as Reusable Section
            </DialogTitle>
          </DialogHeader>
          {savingBlock && (
            <SaveSectionDialog
              block={savingBlock}
              onClose={() => setSavingSectionBlockId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
