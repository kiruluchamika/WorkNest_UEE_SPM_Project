import { Router } from "express";
import { register } from "../controllers/auth.controller";
import { validateBody } from "../middleware/validate.middleware";
import { registerSchema } from "../validators/auth.validator";

export const authRoutes = Router();

authRoutes.post("/register", validateBody(registerSchema), register);
