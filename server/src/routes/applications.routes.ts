import { Router } from "express";
import { submitApplication, checkApplication, getGigForApplicant } from "../controllers/applications.controller";
import { validateBody } from "../middleware/validate.middleware";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { submitApplicationSchema } from "../validators/application.validator";

export const applicationRoutes = Router();

applicationRoutes.get("/gigs/:gigId", requireAuth, getGigForApplicant);
applicationRoutes.get("/check/:gigId", requireAuth, requireRole("jobseeker"), checkApplication);
applicationRoutes.post(
  "/",
  requireAuth,
  requireRole("jobseeker"),
  validateBody(submitApplicationSchema),
  submitApplication
);
