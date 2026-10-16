import { Request, Response, NextFunction } from "express";

export class HttpError extends Error {
  status: number;
  /** Machine-readable reason the app can branch on, e.g. "ACCOUNT_DISABLED". */
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) {
  if (err instanceof HttpError) {
    return res.status(err.status).json(err.code ? { error: err.message, code: err.code } : { error: err.message });
  }

  if ((err as { type?: string })?.type === "entity.too.large") return res.status(413).json({ error: "Request is too large. Documents must be 2 MB or smaller." });
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}
