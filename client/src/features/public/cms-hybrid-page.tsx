import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { PageRenderer } from "@/features/admin/cms/builder/block-renderer";
import type { BlockInstance, BuilderContent } from "@/features/admin/cms/builder/block-registry";
import type { CmsPage } from "@shared/schema";

interface CmsHybridPageProps {
  slug: string;
  fallback: React.ReactNode;
}

function parseCmsContent(content: unknown): BlockInstance[] {
  if (!content || typeof content !== "object") return [];
  const c = content as BuilderContent;
  return Array.isArray(c.blocks) ? c.blocks : [];
}

function CmsPageSeo({ page }: { page: CmsPage }) {
  useEffect(() => {
    const prevTitle = document.title;
    const effectiveTitle = page.seoTitle || page.title;

    if (effectiveTitle) document.title = `${effectiveTitle} | TCK Wellness`;

    const setMeta = (name: string, content: string, property = false) => {
      const attr = property ? "property" : "name";
      let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    if (page.seoDescription) {
      setMeta("description", page.seoDescription);
      setMeta("og:description", page.seoDescription, true);
    }
    if (effectiveTitle) setMeta("og:title", effectiveTitle, true);
    if (page.ogImageUrl) setMeta("og:image", page.ogImageUrl, true);

    return () => {
      document.title = prevTitle;
    };
  }, [page]);

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

  if (isLoading) {
    return <>{fallback}</>;
  }

  if (!page || page.status !== "published") {
    return <>{fallback}</>;
  }

  const blocks = parseCmsContent(page.content);

  return (
    <div className="min-h-screen flex flex-col" data-testid="cms-public-page">
      <CmsPageSeo page={page} />
      <Navbar />
      <main className="flex-1">
        {blocks.length > 0 ? (
          <PageRenderer blocks={blocks} />
        ) : (
          <div className="max-w-4xl mx-auto px-4 py-16 text-center text-muted-foreground">
            <p>This page has no content yet.</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
