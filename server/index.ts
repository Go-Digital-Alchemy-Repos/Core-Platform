import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import path from "path";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { WebhookHandlers } from "./webhooks/stripe.handler";
import {
  enforceRequiredSecrets,
  securityHeaders,
  apiLimiter,
  originCheck,
} from "./middleware/security";

enforceRequiredSecrets();

const app = express();
const httpServer = createServer(app);

app.use(securityHeaders());

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const signature = req.headers["stripe-signature"] as string;
    await WebhookHandlers.processWebhook(req.body, signature);
    res.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(400).json({ error: "Webhook processing failed" });
  }
});

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

app.use("/api", apiLimiter);
app.use(originCheck);

app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

const SENSITIVE_PATHS = ["/api/auth/login", "/api/auth/register", "/api/auth/forgot-password", "/api/auth/reset-password", "/api/auth/change-password"];
const REDACTED_KEYS = ["password", "currentPassword", "newPassword", "token", "resetToken", "secret", "authorization"];

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

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
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
      let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;

      if (capturedJsonResponse) {
        if (SENSITIVE_PATHS.some((sp) => reqPath.startsWith(sp))) {
          logLine += ` :: ${JSON.stringify(redactSensitive(capturedJsonResponse))}`;
        } else if (reqPath.startsWith("/api/messages")) {
          logLine += ` :: [message content redacted]`;
        } else {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
