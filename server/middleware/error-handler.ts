import type { Request, Response, NextFunction, RequestHandler } from "express";
import { logger } from "../utils/logger";

export class AppError extends Error {
  public statusCode: number;
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = "AppError";
  }
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const status = err.statusCode || err.status || 500;

  logger.app.error(`${req.method} ${req.path} ${status}`, err, {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    statusCode: status,
  });

  if (!res.headersSent) {
    const isProduction = process.env.NODE_ENV === "production";
    const message =
      status >= 500 && isProduction
        ? "Internal Server Error"
        : err.message || "Internal Server Error";

    res.status(status).json({ message });
  }
}
