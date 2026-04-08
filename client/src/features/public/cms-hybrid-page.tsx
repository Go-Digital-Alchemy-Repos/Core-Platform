import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { PublicPageRenderer } from "@/features/public/public-block-renderer";
import type { BlockInstance, BuilderContent } from "@/features/admin/cms/builder/block-registry";
import type { CmsPage, SeoSettings } from "@shared/schema";
import { JsonLd } from "@/components/shared/json-ld";
import {
  buildOrganizationLd,
  buildBreadcrumbLd,
  buildFaqPageLd,
  extractFaqItems,
} from "@/lib/structured-data";

interface CmsHybridPageProps {
  slug: string;
  fallback: React.ReactNode;
}

class CmsNotFoundError extends Error {
  constructor(slug: string) {
    super(`CMS page not found: ${slug}`);
    this.name = "CmsNotFoundError";
  }
}

function isValidCmsPage(data: unknown): data is CmsPage {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  return (
    (typeof obj.id === "string" || typeof obj.id === "number") &&
    typeof obj.slug === "string" &&
    typeof obj.title === "string" &&
    typeof obj.status === "string"
  );
}

function parseCmsContent(content: unknown): BlockInstance[] {
  if (!content || typeof content !== "object") return [];
  const c = content as BuilderContent;
  return Array.isArray(c.blocks) ? c.blocks : [];
}

function setMeta(name: string, content: string, property = false) {
  const attr = property ? "property" : "name";
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function removeMeta(name: string, property = false) {
  const attr = property ? "property" : "name";
  const el = document.head.querySelector(`meta[${attr}="${name}"]`);
  if (el) el.remove();
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function removeLink(rel: string) {
  const el = document.head.querySelector(`link[rel="${rel}"]`);
  if (el) el.remove();
}

function CmsPageSeo({ page, globalSeo }: { page: CmsPage; globalSeo?: SeoSettings }) {
  useEffect(() => {
    const prevTitle = document.title;
    const effectiveTitle = page.seoTitle || page.title;
    const titleSuffix = globalSeo?.titleSuffix ?? " | TCK Wellness";
    const effectiveDescription =
      page.seoDescription || globalSeo?.defaultMetaDescription || "";
    const effectiveOgImage = page.ogImageUrl || globalSeo?.defaultOgImageUrl || "";
    const origin =
      globalSeo?.siteUrl || (typeof window !== "undefined" ? window.location.origin : "");

    if (effectiveTitle) document.title = `${effectiveTitle}${titleSuffix}`;

    if (effectiveDescription) {
      setMeta("description", effectiveDescription);
      setMeta("og:description", effectiveDescription, true);
    }

    if (effectiveTitle) setMeta("og:title", effectiveTitle, true);

    if (effectiveOgImage) {
      setMeta("og:image", effectiveOgImage, true);
    } else {
      removeMeta("og:image", true);
    }

    const canonical = page.canonicalUrl || `${origin}/${page.slug}`;
    setLink("canonical", canonical);

    if (page.noindex) {
      setMeta("robots", "noindex,nofollow");
    } else {
      removeMeta("robots");
    }

    return () => {
      document.title = prevTitle;
      removeLink("canonical");
      removeMeta("robots");
    };
  }, [page, globalSeo]);

  const origin =
    globalSeo?.siteUrl || (typeof window !== "undefined" ? window.location.origin : "");

  const isHome = page.slug === "home" || page.slug === "";
  const pageUrl = page.canonicalUrl || (isHome ? origin : `${origin}/${page.slug}`);
  const pageLabel = page.seoTitle || page.title;

  const breadcrumbs = isHome
    ? null
    : buildBreadcrumbLd([
        { name: "Home", url: origin || "/" },
        { name: pageLabel, url: pageUrl },
      ]);

  const faqItems = extractFaqItems(page.content);

  return (
    <JsonLd
      schemas={[
        globalSeo ? buildOrganizationLd(globalSeo) : null,
        breadcrumbs,
        buildFaqPageLd(faqItems),
      ]}
    />
  );
}

export function CmsHybridPage({ slug, fallback }: CmsHybridPageProps) {
  const { data: page, isLoading, error } = useQuery<CmsPage>({
    queryKey: ["/api/cms/pages/by-slug", slug],
    queryFn: async () => {
      const res = await fetch(`/api/cms/pages/by-slug/${slug}`, { credentials: "include" });
      if (res.status === 404) {
        throw new CmsNotFoundError(slug);
      }
      if (!res.ok) {
        throw new Error(`CMS fetch failed: ${res.status} ${res.statusText}`);
      }
      const data: unknown = await res.json();
      if (!isValidCmsPage(data)) {
        if (import.meta.env.DEV) {
          console.error(`[CmsHybridPage] Invalid response shape for slug "${slug}"`, data);
        }
        throw new Error("Invalid CMS page response shape");
      }
      return data;
    },
    retry: (failureCount, err) => {
      if (err instanceof CmsNotFoundError) return false;
      return failureCount < 2;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: globalSeo } = useQuery<SeoSettings>({
    queryKey: ["/api/seo/global"],
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return <>{fallback}</>;
  }

  if (error) {
    if (import.meta.env.DEV && !(error instanceof CmsNotFoundError)) {
      console.warn(`[CmsHybridPage] Transient error for slug "${slug}", showing fallback:`, error.message);
    }
    return <>{fallback}</>;
  }

  if (!page || page.status !== "published") {
    return <>{fallback}</>;
  }

  const blocks = parseCmsContent(page.content);

  return (
    <div className="min-h-screen flex flex-col" data-testid="cms-public-page">
      <CmsPageSeo page={page} globalSeo={globalSeo} />
      <Navbar />
      <main className="flex-1">
        {blocks.length > 0 ? (
          <PublicPageRenderer blocks={blocks} />
        ) : (
          <div className="max-w-4xl mx-auto px-4 py-16">
            <h1 className="text-3xl font-heading font-semibold">{page.title}</h1>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
