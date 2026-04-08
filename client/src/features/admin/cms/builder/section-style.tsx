import type { CSSProperties, ReactNode } from "react";

export const DEFAULT_SECTION_LINEAR_GRADIENT = "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)";

interface SectionStyleConfig {
  backgroundColor: string;
  backgroundImageUrl: string;
  backgroundPositionX: number;
  backgroundPositionY: number;
  showRadialGradient: boolean;
  radialGradientColor: string;
}

interface SectionStyleWrapperProps {
  props: Record<string, unknown>;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  resolveAssetUrl?: (url: string) => string;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function num(v: unknown, fallback = 50): number {
  return typeof v === "number" ? v : fallback;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function normalizeHexColor(value: string): string {
  const trimmed = value.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed)) {
    return trimmed.length === 4
      ? `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`
      : trimmed;
  }
  return "";
}

export function hexToRgba(hex: string, alpha: number): string {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return `rgba(124, 58, 237, ${alpha})`;
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getSectionStyleConfig(
  props: Record<string, unknown>,
  options?: { resolveAssetUrl?: (url: string) => string }
): SectionStyleConfig {
  const resolveAssetUrl = options?.resolveAssetUrl ?? ((url: string) => url);
  const backgroundImageUrl = resolveAssetUrl(str(props.sectionBackgroundImageUrl));

  return {
    backgroundColor: normalizeHexColor(str(props.sectionBackgroundColor)),
    backgroundImageUrl,
    backgroundPositionX: clampPercent(num(props.sectionBackgroundPositionX, 50)),
    backgroundPositionY: clampPercent(num(props.sectionBackgroundPositionY, 50)),
    showRadialGradient: Boolean(props.sectionShowRadialGradient),
    radialGradientColor: normalizeHexColor(str(props.sectionRadialGradientColor)) || "#7c3aed",
  };
}

export function hasSectionStyleConfig(config: SectionStyleConfig) {
  return Boolean(config.backgroundColor || config.backgroundImageUrl || config.showRadialGradient);
}

export function getRadialGradientStyle(color: string): CSSProperties {
  return {
    background: `radial-gradient(ellipse at 50% 0%, ${hexToRgba(color, 0.28)} 0%, ${hexToRgba(color, 0.16)} 36%, transparent 72%)`,
  };
}

export function SectionStyleWrapper({
  props,
  children,
  className,
  contentClassName,
  resolveAssetUrl,
}: SectionStyleWrapperProps) {
  const config = getSectionStyleConfig(props, { resolveAssetUrl });

  if (!hasSectionStyleConfig(config)) {
    return <>{children}</>;
  }

  const wrapperStyle: CSSProperties = {
    ...(config.backgroundColor ? { backgroundColor: config.backgroundColor } : {}),
    ...(config.backgroundImageUrl
      ? {
          backgroundImage: `url(${config.backgroundImageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: `${config.backgroundPositionX}% ${config.backgroundPositionY}%`,
          backgroundRepeat: "no-repeat",
        }
      : !config.backgroundColor
      ? { background: DEFAULT_SECTION_LINEAR_GRADIENT }
      : {}),
  };

  return (
    <section className={`relative overflow-hidden rounded-2xl ${className ?? ""}`.trim()} style={wrapperStyle}>
      {config.showRadialGradient && (
        <div className="pointer-events-none absolute inset-0" style={getRadialGradientStyle(config.radialGradientColor)} />
      )}
      <div className={`relative z-10 ${contentClassName ?? ""}`.trim()}>
        {children}
      </div>
    </section>
  );
}
