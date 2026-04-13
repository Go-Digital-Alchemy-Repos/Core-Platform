import { createContext, useContext, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  DEFAULT_BRANDING_SETTINGS,
  fontFamilyForBrandingOption,
  hexToHslToken,
  type BrandingSettings,
} from "@/lib/branding";

const BrandingContext = createContext<BrandingSettings>(DEFAULT_BRANDING_SETTINGS);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data } = useQuery<BrandingSettings>({
    queryKey: ["/api/branding"],
    queryFn: async () => {
      const response = await fetch("/api/branding");
      if (!response.ok) {
        return DEFAULT_BRANDING_SETTINGS;
      }
      const payload = await response.json();
      return {
        frontendLogoUrl: payload?.frontendLogoUrl ?? null,
        faviconUrl: payload?.faviconUrl ?? null,
        bodyFont: payload?.bodyFont ?? null,
        headingFont: payload?.headingFont ?? null,
        primaryColor: payload?.primaryColor ?? null,
        secondaryColor: payload?.secondaryColor ?? null,
        tertiaryColor: payload?.tertiaryColor ?? null,
        bodyTextColor: payload?.bodyTextColor ?? null,
        mutedTextColor: payload?.mutedTextColor ?? null,
        primaryTextColor: payload?.primaryTextColor ?? null,
        secondaryTextColor: payload?.secondaryTextColor ?? null,
        tertiaryTextColor: payload?.tertiaryTextColor ?? null,
      } satisfies BrandingSettings;
    },
    staleTime: 60_000,
  });

  const branding = useMemo(
    () => data ?? DEFAULT_BRANDING_SETTINGS,
    [data]
  );
  const pathname = location.split(/[?#]/)[0] || "/";
  const isAdminRoute = pathname.startsWith("/admin");

  useEffect(() => {
    const root = document.documentElement;
    const bodyFontFamily = fontFamilyForBrandingOption(branding.bodyFont);
    const headingFontFamily = fontFamilyForBrandingOption(branding.headingFont);
    const primaryColor = hexToHslToken(branding.primaryColor);
    const secondaryColor = hexToHslToken(branding.secondaryColor);
    const tertiaryColor = hexToHslToken(branding.tertiaryColor);
    const bodyTextColor = hexToHslToken(branding.bodyTextColor);
    const mutedTextColor = hexToHslToken(branding.mutedTextColor);
    const primaryTextColor = hexToHslToken(branding.primaryTextColor);
    const secondaryTextColor = hexToHslToken(branding.secondaryTextColor);
    const tertiaryTextColor = hexToHslToken(branding.tertiaryTextColor);
    const frame = window.requestAnimationFrame(() => {
      if (isAdminRoute) {
        root.style.removeProperty("--font-sans");
        root.style.removeProperty("--font-serif");
        root.style.removeProperty("--primary");
        root.style.removeProperty("--secondary");
        root.style.removeProperty("--accent");
        root.style.removeProperty("--ring");
        root.style.removeProperty("--foreground");
        root.style.removeProperty("--card-foreground");
        root.style.removeProperty("--popover-foreground");
        root.style.removeProperty("--muted-foreground");
        root.style.removeProperty("--primary-foreground");
        root.style.removeProperty("--secondary-foreground");
        root.style.removeProperty("--accent-foreground");
        return;
      }

      if (bodyFontFamily) {
        root.style.setProperty("--font-sans", bodyFontFamily);
      } else {
        root.style.removeProperty("--font-sans");
      }

      if (headingFontFamily) {
        root.style.setProperty("--font-serif", headingFontFamily);
      } else {
        root.style.removeProperty("--font-serif");
      }

      if (primaryColor) {
        root.style.setProperty("--primary", primaryColor);
      } else {
        root.style.removeProperty("--primary");
      }

      if (secondaryColor) {
        root.style.setProperty("--secondary", secondaryColor);
      } else {
        root.style.removeProperty("--secondary");
      }

      if (tertiaryColor) {
        root.style.setProperty("--accent", tertiaryColor);
        root.style.setProperty("--ring", tertiaryColor);
      } else {
        root.style.removeProperty("--accent");
        root.style.removeProperty("--ring");
      }

      if (bodyTextColor) {
        root.style.setProperty("--foreground", bodyTextColor);
        root.style.setProperty("--card-foreground", bodyTextColor);
        root.style.setProperty("--popover-foreground", bodyTextColor);
      } else {
        root.style.removeProperty("--foreground");
        root.style.removeProperty("--card-foreground");
        root.style.removeProperty("--popover-foreground");
      }

      if (mutedTextColor) {
        root.style.setProperty("--muted-foreground", mutedTextColor);
      } else {
        root.style.removeProperty("--muted-foreground");
      }

      if (primaryTextColor) {
        root.style.setProperty("--primary-foreground", primaryTextColor);
      } else {
        root.style.removeProperty("--primary-foreground");
      }

      if (secondaryTextColor) {
        root.style.setProperty("--secondary-foreground", secondaryTextColor);
      } else {
        root.style.removeProperty("--secondary-foreground");
      }

      if (tertiaryTextColor) {
        root.style.setProperty("--accent-foreground", tertiaryTextColor);
      } else {
        root.style.removeProperty("--accent-foreground");
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    branding.bodyFont,
    branding.headingFont,
    branding.primaryColor,
    branding.secondaryColor,
    branding.tertiaryColor,
    branding.bodyTextColor,
    branding.mutedTextColor,
    branding.primaryTextColor,
    branding.secondaryTextColor,
    branding.tertiaryTextColor,
    isAdminRoute,
  ]);

  useEffect(() => {
    const faviconHref = isAdminRoute ? "/favicon.png" : branding.faviconUrl || "/favicon.png";
    let faviconEl = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]');

    if (!faviconEl) {
      faviconEl = document.createElement("link");
      faviconEl.setAttribute("rel", "icon");
      document.head.appendChild(faviconEl);
    }

    faviconEl.setAttribute("href", faviconHref);
    if (faviconHref.endsWith(".svg")) {
      faviconEl.setAttribute("type", "image/svg+xml");
    } else if (faviconHref.endsWith(".ico")) {
      faviconEl.setAttribute("type", "image/x-icon");
    } else {
      faviconEl.setAttribute("type", "image/png");
    }
  }, [branding.faviconUrl, isAdminRoute]);

  return <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  return useContext(BrandingContext);
}
