import express from "express";

/** Deliberately limited recovery surface: no business routes, auth sessions or workers. */
export function createRollbackMaintenanceApp(dependencies: {
  ready: () => Promise<void>;
  download: (key: string) => Promise<{ buffer: Buffer; contentType?: string | null } | null>;
}) {
  const app = express();
  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    next();
  });
  app.get("/health", (_req, res) => res.json({ status: "ok", mode: "rollback-maintenance" }));
  app.get("/ready", async (_req, res) => {
    try {
      await dependencies.ready();
      res.json({ status: "ready", mode: "rollback-maintenance" });
    } catch {
      res.status(503).json({ message: "Recovery database unavailable" });
    }
  });
  app.get("/r2/{*key}", async (req, res) => {
    const parameter = req.params.key;
    const key = Array.isArray(parameter) ? parameter.join("/") : String(parameter ?? "");
    if (
      !key ||
      key.includes("..") ||
      key.includes("\\") ||
      [...key].some((character) => character.charCodeAt(0) < 32)
    ) {
      res.status(404).end();
      return;
    }
    try {
      const result = await dependencies.download(key);
      if (!result) {
        res.status(404).end();
        return;
      }
      res.setHeader("Content-Type", result.contentType || "application/octet-stream");
      res.send(result.buffer);
    } catch {
      res.status(503).json({ message: "Recovery media unavailable" });
    }
  });
  app.use((_req, res) => {
    res.setHeader("Retry-After", "60");
    res.status(503).json({ message: "Service is temporarily in recovery maintenance" });
  });
  return app;
}
