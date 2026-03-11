import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Image, Search, CheckCircle2 } from "lucide-react";
import type { CmsMediaAsset } from "@shared/schema";
import { format } from "date-fns";

interface MediaPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string, asset: CmsMediaAsset) => void;
}

export function MediaPickerDialog({ open, onOpenChange, onSelect }: MediaPickerDialogProps) {
  const [search, setSearch] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const { data: assets = [], isLoading } = useQuery<CmsMediaAsset[]>({
    queryKey: ["/api/admin/cms/media"],
    enabled: open,
  });

  const filtered = assets.filter((a) =>
    !search || a.originalName.toLowerCase().includes(search.toLowerCase()) || (a.alt ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Image className="h-5 w-5 text-violet-500" />
            Media Library
          </DialogTitle>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search images…"
              className="pl-9"
              data-testid="input-media-search"
            />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="grid grid-cols-3 gap-3">
              {[...Array(9)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
              <Image className="h-10 w-10 opacity-30" />
              <p className="text-sm font-medium">{search ? "No images match your search" : "No media uploaded yet"}</p>
              <p className="text-xs">Upload images through the CMS builder or Media page</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {filtered.map((asset) => (
                <button
                  key={asset.id}
                  className="relative group rounded-lg border-2 overflow-hidden aspect-square transition-all hover:border-violet-400 focus:outline-none focus:border-violet-500 border-transparent bg-muted/30"
                  onClick={() => {
                    onSelect(asset.url, asset);
                    onOpenChange(false);
                  }}
                  onMouseEnter={() => setHoveredId(asset.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  data-testid={`media-asset-${asset.id}`}
                  title={asset.originalName}
                >
                  <img
                    src={asset.url}
                    alt={asset.alt ?? asset.originalName}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {hoveredId === asset.id && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1 p-2">
                      <CheckCircle2 className="h-6 w-6 text-white" />
                      <span className="text-white text-xs font-medium text-center line-clamp-2 leading-tight">
                        {asset.originalName}
                      </span>
                      <span className="text-white/70 text-[10px]">{formatBytes(asset.fileSize)}</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
          {filtered.length} image{filtered.length !== 1 ? "s" : ""}
          {search ? " matching search" : " in library"}
        </div>
      </DialogContent>
    </Dialog>
  );
}
