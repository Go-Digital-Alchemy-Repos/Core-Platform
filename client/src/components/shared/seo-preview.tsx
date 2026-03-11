import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface SeoPreviewProps {
  title: string;
  description: string;
  url: string;
  ogImage?: string;
  siteName?: string;
  className?: string;
  source?: "page" | "post" | "global";
}

export function SeoPreview({
  title,
  description,
  url,
  ogImage,
  siteName = "TCK Wellness",
  className,
  source,
}: SeoPreviewProps) {
  const displayTitle = title || "(No title set)";
  const displayDesc = description || "(No description set)";
  const truncatedDesc = displayDesc.length > 160 ? displayDesc.slice(0, 157) + "…" : displayDesc;
  const truncatedTitle = displayTitle.length > 60 ? displayTitle.slice(0, 57) + "…" : displayTitle;

  return (
    <div className={cn("space-y-3", className)}>
      {source && (
        <p className="text-[11px] text-muted-foreground">
          {source === "global"
            ? "Using global SEO defaults — add page-specific values above to override"
            : source === "page"
            ? "Preview based on page SEO fields"
            : "Preview based on post SEO fields"}
        </p>
      )}

      <div className="rounded-lg border bg-white dark:bg-zinc-900 p-4 space-y-3 text-sm shadow-sm">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Google Search Preview
        </p>
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground truncate">{url}</span>
          </div>
          <p className="text-[15px] font-medium text-blue-600 dark:text-blue-400 leading-snug">
            {truncatedTitle}
          </p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
            {truncatedDesc}
          </p>
        </div>
      </div>

      <div className="rounded-lg border overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 pt-3 pb-2">
          Social / OG Preview
        </p>
        {ogImage ? (
          <div className="aspect-[1200/630] bg-muted overflow-hidden">
            <img
              src={ogImage}
              alt="OG preview"
              className="w-full h-full object-cover"
              data-testid="img-seo-og-preview"
            />
          </div>
        ) : (
          <div className="aspect-[1200/630] bg-muted flex items-center justify-center text-xs text-muted-foreground">
            No OG image set
          </div>
        )}
        <div className="px-4 py-3 border-t">
          <p className="text-[11px] uppercase text-muted-foreground mb-0.5">{siteName}</p>
          <p className="text-sm font-medium leading-snug line-clamp-1">{truncatedTitle}</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{truncatedDesc}</p>
        </div>
      </div>
    </div>
  );
}
