import { receiveDocuments } from "../services/privateDocuments";
import { Router } from "express";
import { register, login, me, updateProfile } from "../controllers/auth.controller";
import { validateBody } from "../middleware/validate.middleware";
import { requireAuth } from "../middleware/auth.middleware";
import { registerSchema, loginSchema, updateProfileSchema } from "../validators/auth.validator";

export const authRoutes = Router();

authRoutes.post("/register", validateBody(registerSchema), receiveDocuments(["identityDocumentReference"], true), register);
authRoutes.post("/login", validateBody(loginSchema), login);
authRoutes.get("/me", requireAuth, me);
authRoutes.put("/me", requireAuth, validateBody(updateProfileSchema), updateProfile);
