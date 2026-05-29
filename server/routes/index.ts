import type { Express, Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
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
import guestRegistrationRoutes from "./guest-registration.routes";
import cmsPublicRoutes from "./cms-public.routes";
import r2PublicRoutes from "./r2-public.routes";
import contactProfessionalRoutes from "./contact-professional.routes";
import setupRoutes from "./setup.routes";
import applicationRoutes from "./application.routes";
import referenceRoutes from "./reference.routes";
import formsRoutes from "./forms.routes";
import crmRoutes from "./crm.routes";
import { searchPublicSite } from "../services/public-search.service";
import { buildRobotsTxtPayload } from "../services/robots-txt.service";
import { storage } from "../storage/index";
import { DEFAULT_SITE_FEATURES, normalizeBooleanSetting } from "@shared/site-features";
import { getEventPath } from "@shared/event-url";
import {
  DEFAULT_DIRECTORY_SETTINGS,
  getDirectorySettings,
} from "../services/directory-settings.service";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function registerApiRoutes(app: Express) {
  app.use("/r2", r2PublicRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/therapists", directoryRoutes);
  app.use("/api/therapist", therapistRoutes);
  app.use("/api/stripe", stripeRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/admin", settingsRoutes);
  app.use("/api/events", eventsRoutes);
  app.use("/api/contact", contactRoutes);
  app.use("/api/forms", formsRoutes);
  app.use("/api/crm", crmRoutes);
  app.use("/api/admin/docs", docsRoutes);
  app.use("/api/uploads", uploadRoutes);
  app.use("/api/notifications", notificationsRoutes);
  app.use("/api/specializations", specializationsRoutes);
  app.use("/api/blog", blogRoutes);
  app.use("/api/events", guestRegistrationRoutes);
  app.use("/api/events", registrationRoutes);
  app.use("/api/cms", cmsPublicRoutes);
  app.use("/api/contact-professional", contactProfessionalRoutes);
  app.use("/api/setup", setupRoutes);
  app.use("/api/therapist/application", applicationRoutes);
  app.use("/api/reference", referenceRoutes);

  app.get("/api/search", async (req, res) => {
    try {
      const query = typeof req.query.q === "string" ? req.query.q : "";
      res.json(await searchPublicSite(query));
    } catch (err) {
      logger.app.error("Failed to execute public site search", err);
      res.status(500).json({ message: "Search failed" });
    }
  });

  app.get("/api/branding", async (_req, res) => {
    try {
      const branding = await storage.settings.getDecryptedCategory("branding");
      res.json({
        frontendLogoUrl: branding.frontend_logo_url || null,
        faviconUrl: branding.favicon_url || null,
        companyName: branding.company_name || null,
        companyAddress: branding.company_address || null,
        companyPhoneNumbers: branding.company_phone_numbers || null,
        companyGoogleBusinessUrl: branding.company_google_business_url || null,
        bodyFont: branding.frontend_body_font || null,
        headingFont: branding.frontend_heading_font || null,
        primaryColor: branding.brand_primary_color || null,
        secondaryColor: branding.brand_secondary_color || null,
        tertiaryColor: branding.brand_tertiary_color || null,
        quaternaryColor: branding.brand_quaternary_color || "#A8623A",
        h1Color: branding.text_h1_color || null,
        h2Color: branding.text_h2_color || null,
        h3ToH6Color: branding.text_h3_h6_color || null,
        bodyTextColor: branding.text_body_color || null,
        headingSubtextColor:
          branding.text_heading_subtext_color || branding.text_muted_color || null,
        supportingCopyColor:
          branding.text_supporting_copy_color || branding.text_muted_color || null,
        helperTextColor: branding.text_helper_text_color || branding.text_muted_color || null,
        metaTextColor: branding.text_meta_color || null,
        linkColor: branding.text_link_color || null,
        linkHoverColor: branding.text_link_hover_color || null,
        inverseTextColor: branding.text_inverse_color || null,
        primaryTextColor: branding.text_primary_foreground_color || null,
        secondaryTextColor: branding.text_secondary_foreground_color || null,
        tertiaryTextColor: branding.text_tertiary_foreground_color || null,
      });
    } catch (err) {
      logger.app.warn("Failed to retrieve branding settings, returning defaults", {
        error: err instanceof Error ? err.message : String(err),
      });
      res.json({
        frontendLogoUrl: null,
        faviconUrl: null,
        companyName: null,
        companyAddress: null,
        companyPhoneNumbers: null,
        companyGoogleBusinessUrl: null,
        bodyFont: null,
        headingFont: null,
        primaryColor: null,
        secondaryColor: null,
        tertiaryColor: null,
        quaternaryColor: "#A8623A",
        h1Color: null,
        h2Color: null,
        h3ToH6Color: null,
        bodyTextColor: null,
        headingSubtextColor: null,
        supportingCopyColor: null,
        helperTextColor: null,
        metaTextColor: null,
        linkColor: null,
        linkHoverColor: null,
        inverseTextColor: null,
        primaryTextColor: null,
        secondaryTextColor: null,
        tertiaryTextColor: null,
      });
    }
  });

  app.get("/api/site-config", async (_req, res) => {
    try {
      const settings = await storage.settings.getDecryptedCategory("system_configuration");
      res.json({
        directoryEnabled: normalizeBooleanSetting(
          settings.enable_directory,
          DEFAULT_SITE_FEATURES.directoryEnabled,
        ),
        blogEnabled: normalizeBooleanSetting(
          settings.enable_blog,
          DEFAULT_SITE_FEATURES.blogEnabled,
        ),
        eventsEnabled: normalizeBooleanSetting(
          settings.enable_events,
          DEFAULT_SITE_FEATURES.eventsEnabled,
        ),
        crmEnabled: normalizeBooleanSetting(
          settings.enable_crm,
          DEFAULT_SITE_FEATURES.crmEnabled,
        ),
      });
    } catch (err) {
      logger.app.warn("Failed to retrieve system configuration, returning defaults", {
        error: err instanceof Error ? err.message : String(err),
      });
      res.json(DEFAULT_SITE_FEATURES);
    }
  });

  app.get("/api/runtime-integrations", async (_req, res) => {
    try {
      const analytics = await storage.settings.getDecryptedCategory("google_analytics");
      res.json({
        ga4MeasurementId: analytics.ga4_measurement_id || null,
      });
    } catch (err) {
      logger.app.warn("Failed to retrieve runtime integrations, returning defaults", {
        error: err instanceof Error ? err.message : String(err),
      });
      res.json({
        ga4MeasurementId: null,
      });
    }
  });

  app.get("/api/membership-tiers", async (_req, res) => {
    const tiers = await storage.tiers.getActiveTiers();
    res.json(tiers);
  });

  app.get("/api/directory-settings", async (_req, res) => {
    try {
      res.json(await getDirectorySettings());
    } catch (err) {
      logger.app.warn("Failed to retrieve directory settings, returning defaults", {
        error: err instanceof Error ? err.message : String(err),
      });
      res.json(DEFAULT_DIRECTORY_SETTINGS);
    }
  });

  app.get("/api/seo/global", async (_req, res) => {
    const settings = await storage.seoSettings.get();
    res.json(settings ?? {});
  });

  app.get("/robots.txt", async (_req, res) => {
    try {
      const seoSettings = await storage.seoSettings.get();
      const { effectiveContent } = buildRobotsTxtPayload(seoSettings);

      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.send(effectiveContent);
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

      const urls: Array<{ loc: string; lastmod?: string; changefreq?: string; priority?: string }> =
        [];

      urls.push({ loc: base || "/", changefreq: "weekly", priority: "1.0" });

      const staticRoutes = [
        { path: "/about", changefreq: "monthly", priority: "0.7" },
        { path: "/insights", changefreq: "weekly", priority: "0.8" },
        { path: "/events", changefreq: "daily", priority: "0.8" },
        { path: "/recordings", changefreq: "weekly", priority: "0.7" },
        { path: "/directory", changefreq: "daily", priority: "0.9" },
        { path: "/join", changefreq: "monthly", priority: "0.6" },
        { path: "/contact", changefreq: "monthly", priority: "0.5" },
      ];
      for (const r of staticRoutes) {
        urls.push({ loc: `${base}${r.path}`, changefreq: r.changefreq, priority: r.priority });
      }

      for (const page of pages) {
        if (page.status !== "published" || page.noindex) continue;
        if (
          [
            "home",
            "about",
            "contact",
            "join",
            "insights",
            "events",
            "recordings",
            "directory",
          ].includes(page.slug)
        )
          continue;
        urls.push({
          loc: `${base}/${page.slug}`,
          lastmod: page.updatedAt
            ? new Date(page.updatedAt).toISOString().split("T")[0]
            : undefined,
          changefreq: "monthly",
          priority: "0.6",
        });
      }

      for (const post of posts) {
        if (!post.isPublished || post.noindex) continue;
        urls.push({
          loc: `${base}/insights/${post.slug}`,
          lastmod: post.updatedAt
            ? new Date(post.updatedAt).toISOString().split("T")[0]
            : undefined,
          changefreq: "monthly",
          priority: "0.7",
        });
      }

      for (const event of events) {
        if (event.status === "draft" || event.visibility !== "public") continue;
        urls.push({
          loc: `${base}${getEventPath(event)}`,
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
    } catch (err) {
      logger.app.warn("Failed to look up redirect", {
        path: req.path,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    next();
  });
}
