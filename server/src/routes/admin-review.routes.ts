import { Router } from "express";
import { listFlaggedReviews, moderateReview } from "../controllers/admin-review.controller";
import { validateBody } from "../middleware/validate.middleware";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { moderateReviewSchema } from "../validators/review.validator";

export const adminReviewRoutes = Router();

adminReviewRoutes.get("/flagged", requireAuth, requireRole("admin"), listFlaggedReviews);
adminReviewRoutes.patch(
  "/:reviewId/moderate",
  requireAuth,
  requireRole("admin"),
  validateBody(moderateReviewSchema),
  moderateReview
);
