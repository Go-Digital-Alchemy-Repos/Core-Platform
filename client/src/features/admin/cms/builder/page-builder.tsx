import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { BLOCK_REGISTRY, getBlockDef, createBlock, type BlockInstance, type BuilderContent } from "./block-registry";
import { BlockEditor } from "./block-editor";
import { PageRenderer, BlockRenderer } from "./block-renderer";

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
};

function BlockIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] ?? Layers;
  return <Icon className={className} />;
}

interface PageBuilderProps {
  content: BuilderContent;
  onChange: (content: BuilderContent) => void;
}

export function PageBuilder({ content, onChange }: PageBuilderProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

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
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Choose a Block Type</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {BLOCK_REGISTRY.map((def) => (
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
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {blocks.length === 0 ? (
        <div className="border-2 border-dashed border-muted rounded-xl p-12 text-center">
          <Layers className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="font-medium text-muted-foreground">No blocks yet</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Add content blocks to build this page
          </p>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-add-first-block">
                <Plus className="h-4 w-4 mr-2" />
                Add First Block
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Choose a Block Type</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {BLOCK_REGISTRY.map((def) => (
                  <button
                    key={def.type}
                    onClick={() => addBlock(def.type)}
                    className="flex items-start gap-3 p-3 rounded-lg border hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 text-left transition-colors group"
                    data-testid={`block-type-empty-${def.type}`}
                  >
                    <div className="h-8 w-8 rounded-md bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
                      <BlockIcon name={def.iconName} className="h-4 w-4 text-violet-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{def.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{def.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <div className={`grid gap-4 ${selectedBlock ? "lg:grid-cols-[1fr_340px]" : "grid-cols-1"}`}>
          <div className="space-y-2" data-testid="builder-block-list">
            {blocks.map((block, idx) => {
              const def = getBlockDef(block.type);
              const isSelected = block.id === selectedId;
              return (
                <div
                  key={block.id}
                  className={`border rounded-lg overflow-hidden transition-all ${
                    isSelected ? "border-violet-400 shadow-sm" : "border-border hover:border-muted-foreground/30"
                  }`}
                  data-testid={`block-item-${block.id}`}
                >
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/20">
                    <GripVertical className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                    <div className="h-6 w-6 rounded flex items-center justify-center bg-violet-100 dark:bg-violet-900/30 flex-shrink-0">
                      {def && <BlockIcon name={def.iconName} className="h-3.5 w-3.5 text-violet-600" />}
                    </div>
                    <span className="text-xs font-medium flex-1 truncate">
                      {def?.label ?? block.type}
                      {(() => {
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
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => removeBlock(block.id)}
                        data-testid={`button-delete-block-${block.id}`}
                        title="Remove block"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-3 pointer-events-none select-none opacity-80 max-h-48 overflow-hidden">
                    <BlockRenderer block={block} />
                  </div>
                </div>
              );
            })}
          </div>

          {selectedBlock && selectedDef && (
            <div
              className="border rounded-xl bg-background"
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
              <ScrollArea className="h-[calc(100vh-300px)] max-h-[600px]">
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
    </div>
  );
}
