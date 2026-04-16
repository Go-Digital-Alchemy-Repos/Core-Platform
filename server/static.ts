import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import {
  getPublicHeadAdditions,
  getPublicHtmlSnapshot,
  injectPublicHtmlSnapshot,
} from "./services/public-prerender.service";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  const indexPath = path.resolve(distPath, "index.html");
  let cachedIndexTemplate: string | null = null;

  async function getIndexTemplate() {
    if (cachedIndexTemplate) return cachedIndexTemplate;
    cachedIndexTemplate = await fs.promises.readFile(indexPath, "utf-8");
    return cachedIndexTemplate;
  }

  app.use(express.static(distPath, {
    index: false,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-cache");
        return;
      }

      if (/\.(js|css|woff2?|ttf|eot|svg|png|jpe?g|gif|webp|avif|ico)$/i.test(filePath)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
    },
  }));

  // fall through to index.html if the file doesn't exist
  app.use("/{*path}", async (req, res) => {
    const template = await getIndexTemplate();
    const snapshot = await getPublicHtmlSnapshot(req.path, req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "");
    const shouldInjectPublicHead =
      !req.path.startsWith("/admin") &&
      !req.path.startsWith("/auth") &&
      !req.path.startsWith("/therapist") &&
      !req.path.startsWith("/setup") &&
      !req.path.startsWith("/preview") &&
      !req.path.startsWith("/uploads") &&
      !req.path.startsWith("/api");
    const customHeadHtml = shouldInjectPublicHead ? await getPublicHeadAdditions() : null;

    res.setHeader(
      "Cache-Control",
      req.path.startsWith("/admin") || req.path.startsWith("/auth") || req.path.startsWith("/therapist")
        ? "private, no-store, max-age=0"
        : "no-cache",
    );
    res.type("html").send(injectPublicHtmlSnapshot(template, snapshot, customHeadHtml));
  });
}
