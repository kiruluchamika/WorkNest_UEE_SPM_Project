import { Router } from "express";
import {
  listActiveCategories,
  listAllCategories,
  createCategory,
  updateCategory,
  updateCategoryStatus,
  deleteCategory,
} from "../controllers/category.controller";
import { validateBody } from "../middleware/validate.middleware";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import {
  createCategorySchema,
  updateCategorySchema,
  updateCategoryStatusSchema,
} from "../validators/category.validator";

export const categoryRoutes = Router();

categoryRoutes.get("/categories", listActiveCategories);

categoryRoutes.get("/admin/categories", requireAuth, requireRole("admin"), listAllCategories);

categoryRoutes.post(
  "/admin/categories",
  requireAuth,
  requireRole("admin"),
  validateBody(createCategorySchema),
  createCategory
);

categoryRoutes.put(
  "/admin/categories/:id",
  requireAuth,
  requireRole("admin"),
  validateBody(updateCategorySchema),
  updateCategory
);

categoryRoutes.patch(
  "/admin/categories/:id/status",
  requireAuth,
  requireRole("admin"),
  validateBody(updateCategoryStatusSchema),
  updateCategoryStatus
);

categoryRoutes.delete("/admin/categories/:id", requireAuth, requireRole("admin"), deleteCategory);
