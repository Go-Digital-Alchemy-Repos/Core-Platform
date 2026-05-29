import type { Request, Response, NextFunction, RequestHandler } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { logger } from "../utils/logger";

const isDev = process.env.NODE_ENV !== "production";

export function enforceRequiredSecrets() {
  if (isDev) return;

  const required: Record<string, string | undefined> = {
    SESSION_SECRET: process.env.SESSION_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
  };

  const missing = Object.entries(required)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length > 0) {
    logger.app.error(`FATAL: Missing required secrets in production: ${missing.join(", ")}`);
    process.exit(1);
  }

  if (process.env.SESSION_SECRET === "dev-secret-change-me") {
    logger.app.error("FATAL: SESSION_SECRET must not use the dev default in production");
    process.exit(1);
  }
}

export function securityHeaders(): RequestHandler {
  return helmet({
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "https://js.stripe.com",
          "https://www.googletagmanager.com",
          "https://static.cloudflareinsights.com",
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://unpkg.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://*.r2.cloudflarestorage.com",
          "https://*.r2.dev",
          "https://*.tile.openstreetmap.org",
          "https://unpkg.com",
          "https://*.basemaps.cartocdn.com",
        ],
        connectSrc: [
          "'self'",
          "https://api.stripe.com",
          "https://www.google-analytics.com",
          "https://region1.google-analytics.com",
          "https://www.googletagmanager.com",
          "https://cloudflareinsights.com",
          "https://*.r2.cloudflarestorage.com",
          "https://*.r2.dev",
          "https://*.tile.openstreetmap.org",
          "https://*.basemaps.cartocdn.com",
        ],
        frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        mediaSrc: [
          "'self'",
          "blob:",
          "https://*.r2.cloudflarestorage.com",
          "https://*.r2.dev",
        ],
        workerSrc: ["'self'", "blob:"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }) as unknown as RequestHandler;
}

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again in 15 minutes." },
  skip: () => isDev,
});

export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many password reset requests. Please try again later." },
  skip: () => isDev,
});

export const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many password reset attempts. Please try again later." },
  skip: () => isDev,
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many registration attempts. Please try again later." },
  skip: () => isDev,
});

export const guestMessageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many messages. Please try again later." },
  skip: () => isDev,
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please slow down." },
  skip: () => isDev,
});

function normalizeOrigin(raw: string): string | null {
  try {
    return new URL(raw).origin;
  } catch {
    // Intentionally silent: malformed origin strings are expected from some clients and should be treated as null
    return null;
  }
}

function getRequestOrigin(req: Request): string | null {
  const origin = req.headers["origin"] as string | undefined;
  if (origin) return normalizeOrigin(origin);

  const referer = req.headers["referer"] as string | undefined;
  if (referer) return normalizeOrigin(referer);

  return null;
}

function getTrustedOrigins(): Set<string> {
  const origins = new Set<string>();

  if (process.env.APP_URL) {
    const normalized = normalizeOrigin(process.env.APP_URL);
    if (normalized) origins.add(normalized);
  }

  if (process.env.TRUSTED_ORIGINS) {
    for (const raw of process.env.TRUSTED_ORIGINS.split(",")) {
      const normalized = normalizeOrigin(raw.trim());
      if (normalized) origins.add(normalized);
    }
  }

  return origins;
}

export const originCheck: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return next();
  }

  if (req.path === "/api/stripe/webhook") {
    return next();
  }

  if (req.path === "/api/crm/leads") {
    return next();
  }

  if (isDev) {
    return next();
  }

  const source = getRequestOrigin(req);

  if (!source) {
    res.status(403).json({ message: "Forbidden: missing origin" });
    return;
  }

  const trusted = getTrustedOrigins();
  const host = req.get("host");
  if (host) {
    trusted.add(`https://${host}`);
  }

  if (trusted.has(source)) {
    return next();
  }

  res.status(403).json({ message: "Forbidden: untrusted origin" });
};
