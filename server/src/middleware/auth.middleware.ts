import { Request, Response, NextFunction } from "express";
import { TokenPayload, verifyToken } from "../utils/jwt";
import { HttpError } from "./error.middleware";
import { accountDisabledError, getAccountStatus } from "../services/accountStatus.service";

export interface AuthedRequest extends Request {
  userId: string;
  userRole: string;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    return next(new HttpError(401, "Not authenticated"));
  }

  let payload: TokenPayload;
  try {
    payload = verifyToken(token);
  } catch {
    return next(new HttpError(401, "Invalid or expired session"));
  }

  try {
    const status = await getAccountStatus(payload.userId);
    if (!status) {
      return next(new HttpError(401, "Invalid or expired session"));
    }
    if (status.isDisabled) {
      return next(accountDisabledError(status.disabledReason));
    }
  } catch (err) {
    return next(err);
  }

  (req as AuthedRequest).userId = payload.userId;
  (req as AuthedRequest).userRole = payload.role;
  next();
}
