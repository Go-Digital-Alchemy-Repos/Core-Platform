import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import path from "path";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import {
  enforceRequiredSecrets,
  securityHeaders,
  apiLimiter,
  originCheck,
} from "./middleware/security";
import { logger, requestIdMiddleware } from "./utils/logger";

enforceRequiredSecrets();

const app = express();
const httpServer = createServer(app);

app.use(securityHeaders());
app.use(requestIdMiddleware);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: "1mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health/ready", async (_req, res) => {
  try {
    const { db } = await import("./db");
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`SELECT 1`);
    res.json({
      status: "ready",
      database: "connected",
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.db.error("Readiness check failed", err);
    res.status(503).json({
      status: "not_ready",
      database: "disconnected",
      timestamp: new Date().toISOString(),
    });
  }
});

app.use("/api", apiLimiter);
app.use(originCheck);

app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

const SENSITIVE_PATHS = ["/api/auth/login", "/api/auth/register", "/api/auth/forgot-password", "/api/auth/reset-password", "/api/auth/change-password"];
const REDACTED_KEYS = ["password", "currentPassword", "newPassword", "token", "resetToken", "secret", "authorization"];
const MAX_LOG_BODY_LENGTH = 500;

function redactSensitive(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return "[Array]";
  const redacted: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    if (REDACTED_KEYS.some((rk) => key.toLowerCase().includes(rk.toLowerCase()))) {
      redacted[key] = "[REDACTED]";
    } else if (key === "bio" || key === "content" || key === "body" || key === "description") {
      const val = obj[key];
      redacted[key] = typeof val === "string" && val.length > 100 ? val.substring(0, 100) + "..." : val;
    } else {
      redacted[key] = obj[key];
    }
  }
  return redacted;
}

function truncateBody(body: string): string {
  if (body.length > MAX_LOG_BODY_LENGTH) {
    return body.substring(0, MAX_LOG_BODY_LENGTH) + `...[truncated ${body.length} chars]`;
  }
  return body;
}

app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      let bodyStr = "";

      if (capturedJsonResponse) {
        if (SENSITIVE_PATHS.some((sp) => reqPath.startsWith(sp))) {
          bodyStr = truncateBody(JSON.stringify(redactSensitive(capturedJsonResponse)));
        } else if (reqPath.startsWith("/api/messages")) {
          bodyStr = "[message content redacted]";
        } else {
          bodyStr = truncateBody(JSON.stringify(capturedJsonResponse));
        }
      }

      logger.http.info(`${req.method} ${reqPath} ${res.statusCode} ${duration}ms`, {
        reqId: req.requestId,
        ...(bodyStr ? { body: bodyStr } : {}),
      });
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    logger.app.error(`${req.method} ${req.path} ${status}`, err, { reqId: req.requestId });

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      logger.app.info(`Serving on port ${port}`);
    },
  );
})();
