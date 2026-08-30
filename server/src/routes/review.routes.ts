import { Router } from "express";
import { reportReview } from "../controllers/review.controller";
import { validateBody } from "../middleware/validate.middleware";
import { requireAuth } from "../middleware/auth.middleware";
import { reportReviewSchema } from "../validators/review.validator";

export const reviewRoutes = Router();

reviewRoutes.post("/reviews/:reviewId/report", requireAuth, validateBody(reportReviewSchema), reportReview);
