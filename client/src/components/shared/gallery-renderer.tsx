import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CmsGallerySettings, CmsGalleryWithItems } from "@shared/schema";

const DEFAULT_SETTINGS: CmsGallerySettings = {
  columnsDesktop: 3,
  columnsTablet: 2,
  columnsMobile: 1,
  spacing: "md",
  imageRatio: "4/3",
  cropMode: "cover",
  borderRadius: "md",
  showCaptions: true,
  captionPosition: "below",
  lightbox: true,
  hoverEffect: "zoom",
  maxImages: 0,
  customClassName: "",
};

const GAP_CLASS = {
  none: "gap-0",
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
};

const RADIUS_CLASS = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
};

const RATIO_CLASS = {
  auto: "",
  "1/1": "aspect-square",
  "4/3": "aspect-[4/3]",
  "3/2": "aspect-[3/2]",
  "16/9": "aspect-video",
};

interface GalleryRendererProps {
  gallery?: CmsGalleryWithItems | null;
  galleryId?: string | null;
  overrides?: Partial<CmsGallerySettings> & { layout?: string };
  preview?: boolean;
  className?: string;
}

export function GalleryRenderer({
  gallery: providedGallery,
  galleryId,
  overrides,
  preview = false,
  className,
}: GalleryRendererProps) {
  const { data: fetchedGallery, isLoading } = useQuery<CmsGalleryWithItems>({
    queryKey: ["/api/cms/galleries", galleryId],
    enabled: !providedGallery && Boolean(galleryId),
  });
  const gallery = providedGallery ?? fetchedGallery;
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);

  const settings = { ...DEFAULT_SETTINGS, ...(gallery?.settings ?? {}), ...(overrides ?? {}) };
  const layout = String(overrides?.layout || gallery?.layout || "grid");
  const items = useMemo(() => {
    const source = gallery?.items ?? [];
    return settings.maxImages > 0 ? source.slice(0, settings.maxImages) : source;
  }, [gallery?.items, settings.maxImages]);
  const nextLightboxImage = () =>
    setActiveIndex((current) => (current === null ? current : (current + 1) % items.length));
  const previousLightboxImage = () =>
    setActiveIndex((current) =>
      current === null ? current : (current - 1 + items.length) % items.length,
    );
  const activeLightboxItem = activeIndex !== null ? items[activeIndex] : null;

  useEffect(() => {
    if (!activeLightboxItem) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveIndex(null);
      if (items.length > 1 && event.key === "ArrowRight") nextLightboxImage();
      if (items.length > 1 && event.key === "ArrowLeft") previousLightboxImage();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeLightboxItem, items.length]);

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-md bg-muted" data-testid="gallery-loading" />;
  }

  if (!gallery || items.length === 0) {
    return preview ? (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        Select a published gallery to render images here.
      </div>
    ) : null;
  }

  const openLightbox = (index: number) => {
    if (settings.lightbox) setActiveIndex(index);
  };
  const showInlineCaptions = settings.showCaptions && settings.captionPosition === "below";

  const renderImage = (item: (typeof items)[number], index: number) => (
    <figure key={item.id ?? `${item.imageUrl}-${index}`} className="group min-w-0">
      <button
        type="button"
        className={cn(
          "relative block w-full overflow-hidden bg-muted text-left",
          RATIO_CLASS[settings.imageRatio],
          RADIUS_CLASS[settings.borderRadius],
          settings.lightbox && "cursor-zoom-in",
        )}
        onClick={() => openLightbox(index)}
      >
        <img
          src={item.imageUrl}
          alt={item.alt || item.title || gallery.title}
          loading="lazy"
          className={cn(
            "h-full w-full transition duration-300",
            settings.cropMode === "contain" ? "object-contain" : "object-cover",
            settings.hoverEffect === "zoom" && "group-hover:scale-105",
            settings.hoverEffect === "fade" && "group-hover:opacity-80",
            settings.imageRatio === "auto" && "h-auto",
          )}
        />
        {settings.showCaptions && settings.captionPosition === "overlay" && item.caption ? (
          <figcaption className="absolute inset-x-0 bottom-0 bg-black/60 px-3 py-2 text-sm text-white">
            {item.caption}
          </figcaption>
        ) : null}
      </button>
      {showInlineCaptions && (item.title || item.caption) ? (
        <figcaption className="mt-2 text-sm text-muted-foreground">
          {item.title ? <span className="font-medium text-foreground">{item.title}</span> : null}
          {item.title && item.caption ? <span> — </span> : null}
          {item.caption}
        </figcaption>
      ) : null}
    </figure>
  );

  const nextSlide = () => setSlideIndex((current) => (current + 1) % items.length);
  const previousSlide = () => setSlideIndex((current) => (current - 1 + items.length) % items.length);

  return (
    <section
      className={cn("cms-gallery", settings.customClassName, className)}
      data-testid="cms-gallery-renderer"
      data-gallery-id={gallery.id}
    >
      {layout === "carousel" || layout === "slider" || layout === "featured" ? (
        <div className="space-y-4">
          <div className={cn("relative overflow-hidden bg-muted", RADIUS_CLASS[settings.borderRadius])}>
            <img
              src={items[slideIndex]?.imageUrl}
              alt={items[slideIndex]?.alt || items[slideIndex]?.title || gallery.title}
              className={cn(
                "w-full",
                layout === "featured" ? "aspect-[16/9]" : "aspect-[4/3]",
                settings.cropMode === "contain" ? "object-contain" : "object-cover",
              )}
              onClick={() => openLightbox(slideIndex)}
            />
            {items.length > 1 ? (
              <>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute left-3 top-1/2 h-9 w-9 -translate-y-1/2"
                  onClick={previousSlide}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute right-3 top-1/2 h-9 w-9 -translate-y-1/2"
                  onClick={nextSlide}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            ) : null}
          </div>
          {showInlineCaptions && (items[slideIndex]?.title || items[slideIndex]?.caption) ? (
            <p className="text-sm text-muted-foreground">
              {items[slideIndex]?.title ? (
                <span className="font-medium text-foreground">{items[slideIndex]?.title}</span>
              ) : null}
              {items[slideIndex]?.title && items[slideIndex]?.caption ? <span> — </span> : null}
              {items[slideIndex]?.caption}
            </p>
          ) : null}
          {layout === "featured" && items.length > 1 ? (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {items.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    "aspect-square overflow-hidden rounded border",
                    index === slideIndex && "ring-2 ring-primary",
                  )}
                  onClick={() => setSlideIndex(index)}
                >
                  <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div
          className={cn(
            "grid",
            GAP_CLASS[settings.spacing],
            settings.columnsMobile === 2 ? "grid-cols-2" : "grid-cols-1",
            settings.columnsTablet === 3
              ? "sm:grid-cols-3"
              : settings.columnsTablet === 4
                ? "sm:grid-cols-4"
                : "sm:grid-cols-2",
            settings.columnsDesktop === 2
              ? "lg:grid-cols-2"
              : settings.columnsDesktop === 4
                ? "lg:grid-cols-4"
                : settings.columnsDesktop === 5
                  ? "lg:grid-cols-5"
                  : settings.columnsDesktop === 6
                    ? "lg:grid-cols-6"
                    : "lg:grid-cols-3",
            layout === "masonry" && "items-start",
          )}
        >
          {items.map(renderImage)}
        </div>
      )}

      {activeLightboxItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="absolute right-4 top-4"
            onClick={() => setActiveIndex(null)}
          >
            <X className="h-4 w-4" />
          </Button>
          {items.length > 1 ? (
            <>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="absolute left-4 top-1/2 h-11 w-11 -translate-y-1/2"
                onClick={previousLightboxImage}
                aria-label="Previous image"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="absolute right-4 top-1/2 h-11 w-11 -translate-y-1/2"
                onClick={nextLightboxImage}
                aria-label="Next image"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </>
          ) : null}
          <img
            src={activeLightboxItem.imageUrl}
            alt={activeLightboxItem.alt || activeLightboxItem.title || gallery.title}
            className="max-h-[85vh] max-w-[92vw] object-contain"
          />
        </div>
      ) : null}
    </section>
  );
}
