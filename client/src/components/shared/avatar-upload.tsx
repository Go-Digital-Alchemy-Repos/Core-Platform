import { useState, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, Camera } from "lucide-react";

interface AvatarUploadProps {
  currentImageUrl?: string | null;
  fallbackInitials: string;
  onUploadComplete?: (url: string) => void;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-16 w-16",
  md: "h-24 w-24",
  lg: "h-32 w-32",
};

export function AvatarUpload({
  currentImageUrl,
  fallbackInitials,
  onUploadComplete,
  size = "md",
}: AvatarUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await fetch("/api/upload/avatar", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Upload failed");
      }

      return res.json();
    },
    onSuccess: (data: { url: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/therapist/profile"] });
      toast({ title: "Photo updated" });
      onUploadComplete?.(data.url);
      setPreview(null);
    },
    onError: (err: Error) => {
      toast({
        title: "Upload failed",
        description: err.message,
        variant: "destructive",
      });
      setPreview(null);
    },
  });

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a PNG, JPEG, or WebP image.",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Maximum file size is 5MB.",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);

      uploadMutation.mutate(file);
    },
    [uploadMutation, toast],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [handleFile],
  );

  const displayUrl = preview || currentImageUrl;

  return (
    <div className="flex flex-col items-center gap-3" data-testid="avatar-upload">
      <div
        className={`relative cursor-pointer rounded-full transition-all ${
          isDragging
            ? "ring-2 ring-primary ring-offset-2"
            : "hover:ring-2 hover:ring-muted-foreground/30 hover:ring-offset-2"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        data-testid="dropzone-avatar"
      >
        <Avatar className={sizeClasses[size]}>
          {displayUrl ? (
            <AvatarImage src={displayUrl} alt="Profile photo" />
          ) : null}
          <AvatarFallback className="text-lg font-semibold">
            {fallbackInitials}
          </AvatarFallback>
        </Avatar>

        <div
          className={`absolute inset-0 flex items-center justify-center rounded-full bg-black/40 transition-opacity ${
            uploadMutation.isPending
              ? "opacity-100"
              : "opacity-0 hover:opacity-100"
          }`}
        >
          {uploadMutation.isPending ? (
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          ) : (
            <Camera className="h-6 w-6 text-white" />
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleInputChange}
        data-testid="input-avatar-file"
      />

      <div className="text-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
          data-testid="button-upload-avatar"
        >
          {uploadMutation.isPending ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="mr-1.5 h-3.5 w-3.5" />
          )}
          Upload Photo
        </Button>
        <p className="mt-1 text-xs text-muted-foreground">
          PNG, JPEG, or WebP. Max 5MB.
        </p>
      </div>
    </div>
  );
}
