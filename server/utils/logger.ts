import { randomUUID } from "crypto";
import type { Request, Response, NextFunction } from "express";

export type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  source: string;
  msg: string;
  [key: string]: unknown;
}

function formatEntry(entry: LogEntry): string {
  const ts = new Date().toISOString();
  const { level, source, msg, ...ctx } = entry;
  const ctxStr = Object.keys(ctx).length > 0
    ? " " + JSON.stringify(ctx)
    : "";
  return `${ts} [${level.toUpperCase()}] [${source}] ${msg}${ctxStr}`;
}

function createLogger(source: string) {
  return {
    info(msg: string, ctx?: Record<string, unknown>) {
      console.log(formatEntry({ level: "info", source, msg, ...ctx }));
    },
    warn(msg: string, ctx?: Record<string, unknown>) {
      console.warn(formatEntry({ level: "warn", source, msg, ...ctx }));
    },
    error(msg: string, err?: unknown, ctx?: Record<string, unknown>) {
      const errorInfo: Record<string, unknown> = { ...ctx };
      if (err instanceof Error) {
        errorInfo.error = err.message;
        if (err.stack) errorInfo.stack = err.stack.split("\n").slice(0, 3).join(" | ");
      } else if (err) {
        errorInfo.error = String(err);
      }
      console.error(formatEntry({ level: "error", source, msg, ...errorInfo }));
    },
  };
}

export const logger = {
  http: createLogger("http"),
  email: createLogger("email"),
  r2: createLogger("r2"),

  auth: createLogger("auth"),
  app: createLogger("app"),
  db: createLogger("db"),
};

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction) {
  req.requestId = randomUUID().slice(0, 8);
  next();
}
