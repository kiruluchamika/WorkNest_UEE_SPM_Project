import { Router } from "express";
import {
  createGig,
  listActiveGigs,
  listMyGigs,
  getPublicGig,
  getMyGig,
  updateGig,
  deleteGig,
  closeGig,
  resubmitGig,
} from "../controllers/gig.controller";
import { validateBody } from "../middleware/validate.middleware";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { createGigPostSchema, updateGigPostSchema } from "../validators/gig.validator";

export const gigRoutes = Router();

gigRoutes.post("/", requireAuth, requireRole("shopowner"), validateBody(createGigPostSchema), createGig);
gigRoutes.get("/", requireAuth, listActiveGigs);
gigRoutes.get("/my", requireAuth, requireRole("shopowner"), listMyGigs);
gigRoutes.get("/public/:id", requireAuth, getPublicGig);
gigRoutes.get("/:id", requireAuth, requireRole("shopowner"), getMyGig);
gigRoutes.put(
  "/:id",
  requireAuth,
  requireRole("shopowner"),
  validateBody(updateGigPostSchema),
  updateGig
);
gigRoutes.delete("/:id", requireAuth, requireRole("shopowner"), deleteGig);
gigRoutes.patch("/:id/close", requireAuth, requireRole("shopowner"), closeGig);
gigRoutes.patch("/:id/resubmit", requireAuth, requireRole("shopowner"), resubmitGig);
