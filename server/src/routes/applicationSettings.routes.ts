import { Router } from "express";
import {
  getApplicationSettings,
  getPublicApplicationSettings,
  createApplicationSettings,
  updateApplicationSettings,
} from "../controllers/applicationSettings.controller";
import { validateBody } from "../middleware/validate.middleware";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { applicationSettingsSchema } from "../validators/applicationSettings.validator";

export const applicationSettingsRoutes = Router();

applicationSettingsRoutes.get("/:gigId", requireAuth, requireRole("shopowner"), getApplicationSettings);
applicationSettingsRoutes.get("/:gigId/public", requireAuth, getPublicApplicationSettings);
applicationSettingsRoutes.post(
  "/:gigId",
  requireAuth,
  requireRole("shopowner"),
  validateBody(applicationSettingsSchema),
  createApplicationSettings
);
applicationSettingsRoutes.put(
  "/:gigId",
  requireAuth,
  requireRole("shopowner"),
  validateBody(applicationSettingsSchema),
  updateApplicationSettings
);
