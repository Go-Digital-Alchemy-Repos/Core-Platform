import type { Request, Response, NextFunction, RequestHandler } from "express";

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

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const status = err.statusCode || err.status || 500;
  const message = err.message || "Internal Server Error";
  console.error("Error:", err);
  if (!res.headersSent) {
    res.status(status).json({ message });
  }
}
