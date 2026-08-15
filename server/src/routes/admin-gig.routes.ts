import { Router } from "express";
import { listAdminGigs, getAdminGig, approveGig, rejectGig } from "../controllers/gig.controller";
import { validateBody } from "../middleware/validate.middleware";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { rejectGigSchema } from "../validators/gig.validator";

export const adminGigRoutes = Router();

adminGigRoutes.get("/", requireAuth, requireRole("admin"), listAdminGigs);
adminGigRoutes.get("/:id", requireAuth, requireRole("admin"), getAdminGig);
adminGigRoutes.patch("/:id/approve", requireAuth, requireRole("admin"), approveGig);
adminGigRoutes.patch(
  "/:id/reject",
  requireAuth,
  requireRole("admin"),
  validateBody(rejectGigSchema),
  rejectGig
);
