import { Router } from "express";
import { disableUser, enableUser, getUserDetail, listUsers } from "../controllers/adminUser.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { disableUserSchema, enableUserSchema } from "../validators/adminUser.validator";

export const adminUserRoutes = Router();

adminUserRoutes.use(requireAuth, requireRole("admin"));
adminUserRoutes.get("/", listUsers);
adminUserRoutes.get("/:id", getUserDetail);
adminUserRoutes.patch("/:id/disable", validateBody(disableUserSchema), disableUser);
adminUserRoutes.patch("/:id/enable", validateBody(enableUserSchema), enableUser);
