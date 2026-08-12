import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { HttpError } from "./error.middleware";

export interface AuthedRequest extends Request {
  userId: string;
  userRole: string;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    return next(new HttpError(401, "Not authenticated"));
  }

  try {
    const payload = verifyToken(token);
    (req as AuthedRequest).userId = payload.userId;
    (req as AuthedRequest).userRole = payload.role;
    next();
  } catch {
    next(new HttpError(401, "Invalid or expired session"));
  }
}
