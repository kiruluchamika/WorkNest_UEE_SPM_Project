import { Request, Response, NextFunction } from "express";
import { HttpError } from "./error.middleware";
import { AuthedRequest } from "./auth.middleware";

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const { userRole } = req as AuthedRequest;

    if (!roles.includes(userRole)) {
      return next(new HttpError(403, "Forbidden"));
    }

    next();
  };
}
