import type { ElementType } from "react";
import { cn } from "@/lib/utils";

type HeadingLevel = "h1" | "h2";
type HeadingAlignment = "left" | "center" | "right";

interface SectionHeadingProps {
  props: Record<string, unknown>;
  defaultAlignment?: HeadingAlignment;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  fallbackTitle?: string;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function headingLevel(v: unknown): HeadingLevel {
  return str(v) === "h1" ? "h1" : "h2";
}

function headingAlignment(v: unknown, fallback: HeadingAlignment): HeadingAlignment {
  const value = str(v);
  return value === "left" || value === "right" || value === "center" ? value : fallback;
}

export function SectionHeading({
  props,
  defaultAlignment = "center",
  className,
  titleClassName,
  subtitleClassName,
  fallbackTitle,
}: SectionHeadingProps) {
  const eyebrow = str(props.sectionEyebrow) || str(props.eyebrow);
  const title = str(props.title) || fallbackTitle || "";
  const subtitle = str(props.subtitle);
  const level = headingLevel(props.sectionHeadingLevel ?? props.headingLevel);
  const alignment = headingAlignment(props.sectionHeadingAlignment ?? props.alignment, defaultAlignment);

  if (!eyebrow && !title && !subtitle) return null;

  const HeadingTag = level as ElementType;
  const textAlign = alignment === "left" ? "text-left" : alignment === "right" ? "text-right" : "text-center";
  const itemsAlign = alignment === "left" ? "items-start" : alignment === "right" ? "items-end" : "items-center";
  const defaultTitleClass =
    level === "h1"
      ? "text-3xl md:text-4xl font-heading font-bold public-heading-1"
      : "text-2xl font-heading font-bold public-heading-2";

  return (
    <div className={cn("flex flex-col gap-2", itemsAlign, textAlign, className)}>
      {eyebrow && (
        <span className="text-xs font-semibold uppercase tracking-widest text-accent">
          {eyebrow}
        </span>
      )}
      {title && (
        <HeadingTag className={cn(defaultTitleClass, titleClassName)}>
          {title}
        </HeadingTag>
      )}
      {subtitle && (
        <p className={cn("public-supporting-text max-w-2xl", subtitleClassName)}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
