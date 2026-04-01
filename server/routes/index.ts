import type { Express, Request, Response, NextFunction } from "express";
import authRoutes from "./auth.routes";
import directoryRoutes from "./directory.routes";
import therapistRoutes from "./therapist.routes";
import stripeRoutes from "./stripe.routes";
import adminRoutes from "./admin/index";
import settingsRoutes from "./settings.routes";
import eventsRoutes from "./events.routes";
import contactRoutes from "./contact.routes";
import docsRoutes from "./docs.routes";
import uploadRoutes from "./upload.routes";
import notificationsRoutes from "./notifications.routes";
import specializationsRoutes from "./specializations.routes";
import blogRoutes from "./blog.routes";
import registrationRoutes from "./registration.routes";
import cmsPublicRoutes from "./cms-public.routes";
import contactProfessionalRoutes from "./contact-professional.routes";
import setupRoutes from "./setup.routes";
import applicationRoutes from "./application.routes";
import referenceRoutes from "./reference.routes";
import { storage } from "../storage/index";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function registerApiRoutes(app: Express) {
  app.use("/api/auth", authRoutes);
  app.use("/api/therapists", directoryRoutes);
  app.use("/api/therapist", therapistRoutes);
  app.use("/api/stripe", stripeRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/admin", settingsRoutes);
  app.use("/api/events", eventsRoutes);
  app.use("/api/contact", contactRoutes);
  app.use("/api/admin/docs", docsRoutes);
  app.use("/api/uploads", uploadRoutes);
  app.use("/api/notifications", notificationsRoutes);
  app.use("/api/specializations", specializationsRoutes);
  app.use("/api/blog", blogRoutes);
  app.use("/api/events", registrationRoutes);
  app.use("/api/cms", cmsPublicRoutes);
  app.use("/api/contact-professional", contactProfessionalRoutes);
  app.use("/api/setup", setupRoutes);
  app.use("/api/therapist/application", applicationRoutes);
  app.use("/api/reference", referenceRoutes);

  app.get("/api/theme/presets", async (_req, res) => {
    const presets = [
      { id: "tck-default", name: "TCK Default", description: "The original TCK Wellness brand palette with Navy, Sage, Copper, and Teal", preview: { bg: "#FAF8F5", primary: "#1F2A44", accent: "#3B8A80" } },
      { id: "ocean-blue", name: "Ocean Blue", description: "Deep sea blues with fresh aqua accents — calming and professional", preview: { bg: "#F0F5FA", primary: "#1B3A5C", accent: "#2196A6" } },
      { id: "midnight", name: "Midnight", description: "Dark-first design with purple highlights — elegant and modern", preview: { bg: "#0F0F1A", primary: "#7C3AED", accent: "#A78BFA" } },
      { id: "minimal-light", name: "Minimal Light", description: "Ultra-clean whites and grays with black text — swiss design inspired", preview: { bg: "#FFFFFF", primary: "#111111", accent: "#666666" } },
      { id: "contrast-pro", name: "Contrast Pro", description: "High contrast black and white with bright blue accents — accessible and bold", preview: { bg: "#FAFAFA", primary: "#000000", accent: "#2563EB" } },
      { id: "warm-neutral", name: "Warm Neutral", description: "Earthy warm tones with terracotta accents — inviting and grounded", preview: { bg: "#FAF7F2", primary: "#3D2E1F", accent: "#C06535" } },
      { id: "slate-blue", name: "Slate & Blue", description: "Cool slate grays with steel blue highlights — corporate and trustworthy", preview: { bg: "#F4F6F8", primary: "#334155", accent: "#3B82F6" } },
      { id: "frost", name: "Frost", description: "Icy blues and soft silvers — light, airy, and refreshing", preview: { bg: "#F0F8FF", primary: "#1E40AF", accent: "#60A5FA" } },
      { id: "charcoal-gold", name: "Charcoal Gold", description: "Deep charcoal base with gold and amber accents — luxury and premium feel", preview: { bg: "#F5F3EF", primary: "#292524", accent: "#D97706" } },
      { id: "clean-clinical", name: "Clean Clinical", description: "Professional healthcare whites with soft teal — clinical and trustworthy", preview: { bg: "#FAFCFD", primary: "#0F766E", accent: "#14B8A6" } },
      { id: "energetic-blue-pop", name: "Energetic Blue Pop", description: "Vibrant electric blue with energetic accents — youthful and dynamic", preview: { bg: "#F5F7FF", primary: "#4F46E5", accent: "#F59E0B" } },
    ];
    res.json(presets);
  });

  app.get("/api/theme/active", async (_req, res) => {
    try {
      const presetId = await storage.settings.getSetting("theme_preset_id");
      let customOverrides: Record<string, string> | null = null;
      try {
        const raw = await storage.settings.getSetting("theme_custom_overrides");
        if (raw) customOverrides = JSON.parse(raw);
      } catch {}
      res.json({
        presetId: presetId || "tck-default",
        customOverrides,
      });
    } catch {
      res.json({ presetId: "tck-default", customOverrides: null });
    }
  });

  app.get("/api/membership-tiers", async (_req, res) => {
    const tiers = await storage.tiers.getActiveTiers();
    res.json(tiers);
  });

  app.get("/api/seo/global", async (_req, res) => {
    const settings = await storage.seoSettings.get();
    res.json(settings ?? {});
  });

  app.get("/robots.txt", async (_req, res) => {
    try {
      const seoSettings = await storage.seoSettings.get();
      const siteUrl = seoSettings?.siteUrl?.replace(/\/$/, "") || "";
      const noindexAll = seoSettings?.defaultRobotsNoindex ?? false;

      const lines: string[] = [];
      lines.push("User-agent: *");
      if (noindexAll) {
        lines.push("Disallow: /");
      } else {
        lines.push("Disallow: /admin");
        lines.push("Disallow: /api");
        if (siteUrl) {
          lines.push("");
          lines.push(`Sitemap: ${siteUrl}/sitemap.xml`);
        }
      }

      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.send(lines.join("\n") + "\n");
    } catch {
      res.status(500).send("Error generating robots.txt");
    }
  });

  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const [seoSettings, pages, posts, events] = await Promise.all([
        storage.seoSettings.get(),
        storage.cmsPages.getAllPages(),
        storage.blog.getAllPosts(),
        storage.events.getAllEvents(),
      ]);

      const base = seoSettings?.siteUrl?.replace(/\/$/, "") || "";

      const urls: Array<{ loc: string; lastmod?: string; changefreq?: string; priority?: string }> = [];

      urls.push({ loc: base || "/", changefreq: "weekly", priority: "1.0" });

      const staticRoutes = [
        { path: "/about", changefreq: "monthly", priority: "0.7" },
        { path: "/insights", changefreq: "weekly", priority: "0.8" },
        { path: "/events", changefreq: "daily", priority: "0.8" },
        { path: "/directory", changefreq: "daily", priority: "0.9" },
        { path: "/join", changefreq: "monthly", priority: "0.6" },
        { path: "/contact", changefreq: "monthly", priority: "0.5" },
      ];
      for (const r of staticRoutes) {
        urls.push({ loc: `${base}${r.path}`, changefreq: r.changefreq, priority: r.priority });
      }

      for (const page of pages) {
        if (page.status !== "published" || page.noindex) continue;
        if (["home", "about", "contact", "join"].includes(page.slug)) continue;
        urls.push({
          loc: `${base}/${page.slug}`,
          lastmod: page.updatedAt ? new Date(page.updatedAt).toISOString().split("T")[0] : undefined,
          changefreq: "monthly",
          priority: "0.6",
        });
      }

      for (const post of posts) {
        if (!post.isPublished || post.noindex) continue;
        urls.push({
          loc: `${base}/insights/${post.slug}`,
          lastmod: post.updatedAt ? new Date(post.updatedAt).toISOString().split("T")[0] : undefined,
          changefreq: "monthly",
          priority: "0.7",
        });
      }

      for (const event of events) {
        if (event.status === "draft" || event.visibility !== "public") continue;
        urls.push({
          loc: `${base}/events/${event.id}`,
          changefreq: "weekly",
          priority: "0.7",
        });
      }

      const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...urls.map((u) => {
          const parts = [`  <url>`, `    <loc>${escapeXml(u.loc)}</loc>`];
          if (u.lastmod) parts.push(`    <lastmod>${u.lastmod}</lastmod>`);
          if (u.changefreq) parts.push(`    <changefreq>${u.changefreq}</changefreq>`);
          if (u.priority) parts.push(`    <priority>${u.priority}</priority>`);
          parts.push(`  </url>`);
          return parts.join("\n");
        }),
        "</urlset>",
      ].join("\n");

      res.set("Content-Type", "application/xml; charset=utf-8");
      res.set("Cache-Control", "public, max-age=3600");
      res.send(xml);
    } catch (err) {
      res.status(500).send("Error generating sitemap");
    }
  });

  app.use(async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET" || req.path.startsWith("/api") || req.path.startsWith("/uploads")) {
      return next();
    }
    try {
      const redirect = await storage.redirects.getActiveForPath(req.path);
      if (redirect) {
        return res.redirect(redirect.statusCode, redirect.toPath);
      }
    } catch {
    }
    next();
  });
}
