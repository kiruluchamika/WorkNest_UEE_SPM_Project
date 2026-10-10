import { Router } from "express";
import { getReportSummary } from "../controllers/admin-report.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";

export const adminReportRoutes = Router();

adminReportRoutes.get("/summary", requireAuth, requireRole("admin"), getReportSummary);
