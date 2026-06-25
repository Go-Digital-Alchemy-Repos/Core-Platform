import { type CSSProperties, useEffect, useMemo, useState } from "react";
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
  transitionEffect: "none",
  arrowIconColor: "#ffffff",
  arrowBackgroundColor: "#6b7280",
  showTitle: true,
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

const GRID_COLUMN_CLASS: {
  mobile: Record<number, string>;
  tablet: Record<number, string>;
  desktop: Record<number, string>;
} = {
  mobile: {
    1: "grid-cols-1",
    2: "grid-cols-2",
  },
  tablet: {
    1: "sm:grid-cols-1",
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-3",
    4: "sm:grid-cols-4",
  },
  desktop: {
    1: "lg:grid-cols-1",
    2: "lg:grid-cols-2",
    3: "lg:grid-cols-3",
    4: "lg:grid-cols-4",
    5: "lg:grid-cols-5",
    6: "lg:grid-cols-6",
  },
};

function getCarouselItemVisibilityClass(
  offset: number,
  settings: CmsGallerySettings,
) {
  return cn(
    offset >= settings.columnsMobile && "hidden",
    offset < settings.columnsTablet ? "sm:block" : "sm:hidden",
    offset < settings.columnsDesktop ? "lg:block" : "lg:hidden",
  );
}

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
  const [slideDirection, setSlideDirection] = useState<"next" | "previous">("next");

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
  const showInlineMeta =
    settings.captionPosition === "below" && (settings.showTitle || settings.showCaptions);

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
        {settings.captionPosition === "overlay" &&
        ((settings.showTitle && item.title) || (settings.showCaptions && item.caption)) ? (
          <figcaption className="absolute inset-x-0 bottom-0 bg-black/60 px-3 py-2 text-sm text-white">
            {settings.showTitle && item.title ? (
              <span className="font-medium">{item.title}</span>
            ) : null}
            {settings.showTitle && item.title && settings.showCaptions && item.caption ? (
              <span> — </span>
            ) : null}
            {settings.showCaptions ? item.caption : null}
          </figcaption>
        ) : null}
      </button>
      {showInlineMeta &&
      ((settings.showTitle && item.title) || (settings.showCaptions && item.caption)) ? (
        <figcaption className="mt-2 text-sm text-muted-foreground">
          {settings.showTitle && item.title ? (
            <span className="font-medium text-foreground">{item.title}</span>
          ) : null}
          {settings.showTitle && item.title && settings.showCaptions && item.caption ? (
            <span> — </span>
          ) : null}
          {settings.showCaptions ? item.caption : null}
        </figcaption>
      ) : null}
    </figure>
  );

  const setGallerySlide = (nextIndex: number, direction: "next" | "previous") => {
    setSlideDirection(direction);
    setSlideIndex(nextIndex);
  };
  const nextSlide = () => setGallerySlide((slideIndex + 1) % items.length, "next");
  const previousSlide = () =>
    setGallerySlide((slideIndex - 1 + items.length) % items.length, "previous");
  const selectSlide = (nextIndex: number) => {
    if (nextIndex === slideIndex) return;
    setGallerySlide(nextIndex, nextIndex > slideIndex ? "next" : "previous");
  };
  const carouselVisibleCount = Math.min(Math.max(settings.columnsDesktop, 1), items.length);
  const carouselItems = Array.from({ length: carouselVisibleCount }, (_, offset) => {
    const itemIndex = (slideIndex + offset) % items.length;
    return { item: items[itemIndex], itemIndex, offset };
  });
  const carouselSmallestVisibleCount = Math.min(
    settings.columnsMobile,
    settings.columnsTablet,
    settings.columnsDesktop,
  );
  const transitionClass =
    settings.transitionEffect === "fade"
      ? "cms-gallery-transition-fade"
      : settings.transitionEffect === "slide"
        ? slideDirection === "previous"
          ? "cms-gallery-transition-slide-right"
          : "cms-gallery-transition-slide-left"
        : settings.transitionEffect === "zoom"
          ? "cms-gallery-transition-zoom"
          : "";
  const controlStyle: CSSProperties = {
    backgroundColor: settings.arrowBackgroundColor,
    color: settings.arrowIconColor,
  };
  const slideImageRatioClass =
    RATIO_CLASS[settings.imageRatio] || (layout === "featured" ? "aspect-[16/9]" : "aspect-[4/3]");

  return (
    <section
      className={cn("cms-gallery", settings.customClassName, className)}
      data-testid="cms-gallery-renderer"
      data-gallery-id={gallery.id}
    >
      {layout === "carousel" ? (
        <div className="space-y-4">
          <div className="relative">
            <div
              key={`${slideIndex}-${settings.transitionEffect}-${slideDirection}`}
              className={cn(
                "grid",
                GAP_CLASS[settings.spacing],
                GRID_COLUMN_CLASS.mobile[settings.columnsMobile],
                GRID_COLUMN_CLASS.tablet[settings.columnsTablet],
                GRID_COLUMN_CLASS.desktop[settings.columnsDesktop],
                transitionClass,
              )}
            >
              {carouselItems.map(({ item, itemIndex, offset }) => (
                <figure
                  key={`${item.id ?? item.imageUrl}-${itemIndex}`}
                  className={cn("group min-w-0", getCarouselItemVisibilityClass(offset, settings))}
                >
                  <button
                    type="button"
                    className={cn(
                      "relative block w-full overflow-hidden bg-muted text-left",
                      slideImageRatioClass,
                      RADIUS_CLASS[settings.borderRadius],
                      settings.lightbox && "cursor-zoom-in",
                    )}
                    onClick={() => openLightbox(itemIndex)}
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
                  </button>
                  {showInlineMeta &&
                  ((settings.showTitle && item.title) || (settings.showCaptions && item.caption)) ? (
                    <figcaption className="mt-2 text-sm text-muted-foreground">
                      {settings.showTitle && item.title ? (
                        <span className="font-medium text-foreground">{item.title}</span>
                      ) : null}
                      {settings.showTitle && item.title && settings.showCaptions && item.caption ? (
                        <span> — </span>
                      ) : null}
                      {settings.showCaptions ? item.caption : null}
                    </figcaption>
                  ) : null}
                </figure>
              ))}
            </div>
            {items.length > carouselSmallestVisibleCount ? (
              <>
                <button
                  type="button"
                  className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full shadow-lg transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring md:-left-5"
                  style={controlStyle}
                  onClick={previousSlide}
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full shadow-lg transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring md:-right-5"
                  style={controlStyle}
                  onClick={nextSlide}
                  aria-label="Next image"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : layout === "slider" || layout === "featured" ? (
        <div className="space-y-4">
          <div className="relative">
            <img
              key={`${items[slideIndex]?.id ?? slideIndex}-${settings.transitionEffect}-${slideDirection}`}
              src={items[slideIndex]?.imageUrl}
              alt={items[slideIndex]?.alt || items[slideIndex]?.title || gallery.title}
              className={cn(
                "w-full bg-muted",
                slideImageRatioClass,
                settings.cropMode === "contain" ? "object-contain" : "object-cover",
                RADIUS_CLASS[settings.borderRadius],
                transitionClass,
              )}
              onClick={() => openLightbox(slideIndex)}
            />
            {items.length > 1 ? (
              <>
                <button
                  type="button"
                  className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full shadow-lg transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring md:-left-5"
                  style={controlStyle}
                  onClick={previousSlide}
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full shadow-lg transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring md:-right-5"
                  style={controlStyle}
                  onClick={nextSlide}
                  aria-label="Next image"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            ) : null}
          </div>
          {showInlineMeta &&
          ((settings.showTitle && items[slideIndex]?.title) ||
            (settings.showCaptions && items[slideIndex]?.caption)) ? (
            <p className="text-sm text-muted-foreground">
              {settings.showTitle && items[slideIndex]?.title ? (
                <span className="font-medium text-foreground">{items[slideIndex]?.title}</span>
              ) : null}
              {settings.showTitle &&
              items[slideIndex]?.title &&
              settings.showCaptions &&
              items[slideIndex]?.caption ? (
                <span> — </span>
              ) : null}
              {settings.showCaptions ? items[slideIndex]?.caption : null}
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
                  onClick={() => selectSlide(index)}
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
            GRID_COLUMN_CLASS.mobile[settings.columnsMobile],
            GRID_COLUMN_CLASS.tablet[settings.columnsTablet],
            GRID_COLUMN_CLASS.desktop[settings.columnsDesktop],
            layout === "masonry" && "items-start",
          )}
        >
          {items.map(renderImage)}
        </div>
      )}

      {activeLightboxItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="relative inline-flex max-h-[90vh] max-w-[94vw] items-center justify-center">
            <img
              src={activeLightboxItem.imageUrl}
              alt={activeLightboxItem.alt || activeLightboxItem.title || gallery.title}
              className="block max-h-[85vh] max-w-[92vw] object-contain"
            />
            <button
              type="button"
              className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring"
              style={controlStyle}
              onClick={() => setActiveIndex(null)}
              aria-label="Close gallery lightbox"
            >
              <X className="h-5 w-5" />
            </button>
            {items.length > 1 ? (
              <>
                <button
                  type="button"
                  className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full shadow-lg transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring"
                  style={controlStyle}
                  onClick={previousLightboxImage}
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full shadow-lg transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring"
                  style={controlStyle}
                  onClick={nextLightboxImage}
                  aria-label="Next image"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
