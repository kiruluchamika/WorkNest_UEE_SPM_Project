import { Request, Response, NextFunction } from "express";
import { HttpError } from "../middleware/error.middleware";
import {
  CUSTOMER_ROLES,
  CustomerRole,
  REPORT_RANGES,
  ReportRange,
  getAdminReportSummary,
} from "../services/adminReport.service";

export async function getReportSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const range = req.query.range ?? "30d";
    if (!REPORT_RANGES.includes(range as ReportRange)) {
      return next(new HttpError(400, `range must be one of: ${REPORT_RANGES.join(", ")}`));
    }

    const role = req.query.role || undefined;
    if (role !== undefined && !CUSTOMER_ROLES.includes(role as CustomerRole)) {
      return next(new HttpError(400, `role must be one of: ${CUSTOMER_ROLES.join(", ")}`));
    }

    const categoryId = typeof req.query.categoryId === "string" && req.query.categoryId ? req.query.categoryId : undefined;

    const report = await getAdminReportSummary({
      range: range as ReportRange,
      role: role as CustomerRole | undefined,
      categoryId,
    });

    res.json({ report });
  } catch (err) {
    next(err);
  }
}
