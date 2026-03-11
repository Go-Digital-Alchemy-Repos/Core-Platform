import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminSidebar } from "@/features/admin/admin-sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Image, Search, Trash2, Copy, Upload } from "lucide-react";
import { CmsImageUpload } from "./components/cms-image-upload";
import type { CmsMediaAsset } from "@shared/schema";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";

export default function CmsMediaPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pendingUploadUrl, setPendingUploadUrl] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<CmsMediaAsset | null>(null);

  const { data: assets = [], isLoading } = useQuery<CmsMediaAsset[]>({
    queryKey: ["/api/admin/cms/media"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/cms/media/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/media"] });
      toast({ title: "Image deleted" });
      setDeletingId(null);
      if (selectedAsset?.id === deletingId) setSelectedAsset(null);
    },
    onError: () => toast({ title: "Failed to delete image", variant: "destructive" }),
  });

  const filteredAssets = assets.filter((a) =>
    !search ||
    a.originalName.toLowerCase().includes(search.toLowerCase()) ||
    (a.alt ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: "URL copied to clipboard" });
    });
  };

  return (
    <AdminSidebar>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-heading font-semibold" data-testid="text-media-title">
              Media Library
            </h1>
            <p className="text-muted-foreground mt-1">
              {assets.length} image{assets.length !== 1 ? "s" : ""} uploaded · stored in Cloudflare R2
            </p>
          </div>
          <Button
            onClick={() => setUploadOpen(true)}
            className="gap-2"
            data-testid="button-upload-media"
          >
            <Upload className="h-4 w-4" />
            Upload Image
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search images by name or alt text…"
            className="pl-9"
            data-testid="input-media-search"
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
          </div>
        ) : filteredAssets.length === 0 ? (
          <Card>
            <CardContent className="pt-14 pb-14 text-center">
              <div className="h-16 w-16 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mx-auto mb-4">
                <Image className="h-8 w-8 text-violet-400" />
              </div>
              <h2 className="text-lg font-semibold mb-2">
                {search ? "No images match your search" : "No images yet"}
              </h2>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-5">
                {search
                  ? "Try a different search term."
                  : "Upload your first image to get started. All uploads are stored in Cloudflare R2."}
              </p>
              {!search && (
                <Button
                  variant="outline"
                  onClick={() => setUploadOpen(true)}
                  className="gap-2"
                  data-testid="button-upload-first"
                >
                  <Upload className="h-4 w-4" />
                  Upload Image
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredAssets.map((asset) => (
              <button
                key={asset.id}
                className="group relative aspect-square rounded-xl border bg-muted/20 overflow-hidden transition-all hover:border-violet-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-violet-400"
                onClick={() => setSelectedAsset(asset)}
                data-testid={`media-asset-${asset.id}`}
              >
                <img
                  src={asset.url}
                  alt={asset.alt ?? asset.originalName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors rounded-xl" />
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-[10px] font-medium truncate leading-tight">
                    {asset.originalName}
                  </p>
                  <p className="text-white/70 text-[9px]">{formatBytes(asset.fileSize)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Image</DialogTitle>
            <DialogDescription>
              Upload an image to your media library. Supports PNG, JPG, WebP, GIF · Max 10 MB.
            </DialogDescription>
          </DialogHeader>
          <CmsImageUpload
            value={pendingUploadUrl}
            onChange={(url) => {
              setPendingUploadUrl(url);
              if (url) {
                queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/media"] });
                setTimeout(() => {
                  setUploadOpen(false);
                  setPendingUploadUrl("");
                }, 600);
              }
            }}
            data-testid="media-upload-dropzone"
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedAsset} onOpenChange={(open) => !open && setSelectedAsset(null)}>
        {selectedAsset && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="truncate">{selectedAsset.originalName}</DialogTitle>
              <DialogDescription>
                {formatBytes(selectedAsset.fileSize)} · {selectedAsset.mimeType}
                {selectedAsset.createdAt && (
                  <> · Uploaded {format(new Date(selectedAsset.createdAt), "MMM d, yyyy")}</>
                )}
              </DialogDescription>
            </DialogHeader>
            <img
              src={selectedAsset.url}
              alt={selectedAsset.alt ?? selectedAsset.originalName}
              className="w-full rounded-lg border object-cover max-h-72"
              data-testid="img-asset-preview"
            />
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 text-xs font-mono break-all">
                <span className="flex-1 text-muted-foreground line-clamp-2">{selectedAsset.url}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0"
                  onClick={() => copyUrl(selectedAsset.url)}
                  data-testid="button-copy-url"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex justify-between items-center pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => copyUrl(selectedAsset.url)}
                  data-testid="button-copy-url-main"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy URL
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setDeletingId(selectedAsset.id)}
                  data-testid="button-delete-asset"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this image?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the image from your media library and from Cloudflare R2.
              Any pages or blocks that reference this URL will show a broken image.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete Image
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminSidebar>
  );
}
