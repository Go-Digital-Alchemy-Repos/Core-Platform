import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { PageRenderer } from "@/features/admin/cms/builder/block-renderer";
import type { BlockInstance, BuilderContent } from "@/features/admin/cms/builder/block-registry";
import type { CmsPage, SeoSettings } from "@shared/schema";

interface CmsHybridPageProps {
  slug: string;
  fallback: React.ReactNode;
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

  return null;
}

export function CmsHybridPage({ slug, fallback }: CmsHybridPageProps) {
  const { data: page, isLoading } = useQuery<CmsPage>({
    queryKey: ["/api/cms/pages/by-slug", slug],
    queryFn: async () => {
      const res = await fetch(`/api/cms/pages/by-slug/${slug}`, { credentials: "include" });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const { data: globalSeo } = useQuery<SeoSettings>({
    queryKey: ["/api/seo/global"],
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) {
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
          <PageRenderer blocks={blocks} />
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
