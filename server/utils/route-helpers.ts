import type { Request, Response } from "express";

export function getBaseUrl(req: Request): string {
  return `${req.protocol}://${req.get("host")}`;
}

export function notFound(res: Response, entity: string): void {
  res.status(404).json({ message: `${entity} not found` });
}

export function conflict(res: Response, message: string): void {
  res.status(409).json({ message });
}
