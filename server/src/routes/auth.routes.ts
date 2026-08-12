import { Router } from "express";
import { register, login, me } from "../controllers/auth.controller";
import { validateBody } from "../middleware/validate.middleware";
import { requireAuth } from "../middleware/auth.middleware";
import { registerSchema, loginSchema } from "../validators/auth.validator";

export const authRoutes = Router();

authRoutes.post("/register", validateBody(registerSchema), register);
authRoutes.post("/login", validateBody(loginSchema), login);
authRoutes.get("/me", requireAuth, me);
