import { Router } from "express";
import { getUserReviews, getUserReputation, getUserWorkHistory } from "../controllers/user.controller";
import { requireAuth } from "../middleware/auth.middleware";

export const userRoutes = Router();

userRoutes.get("/:userId/reviews", requireAuth, getUserReviews);
userRoutes.get("/:userId/reputation", requireAuth, getUserReputation);
userRoutes.get("/:userId/work-history", requireAuth, getUserWorkHistory);
