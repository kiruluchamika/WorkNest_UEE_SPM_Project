import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { HttpError } from "../middleware/error.middleware";
import {
  CreateCategoryInput,
  UpdateCategoryInput,
  UpdateCategoryStatusInput,
} from "../validators/category.validator";

export async function listActiveCategories(_req: Request, res: Response, next: NextFunction) {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
    res.json({ categories });
  } catch (err) {
    next(err);
  }
}

export async function listAllCategories(_req: Request, res: Response, next: NextFunction) {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });
    res.json({ categories });
  } catch (err) {
    next(err);
  }
}

export async function createCategory(
  req: Request<unknown, unknown, CreateCategoryInput>,
  res: Response,
  next: NextFunction
) {
  try {
    const { name, description } = req.body;

    const category = await prisma.category.create({
      data: { name, description },
    });

    res.status(201).json({ category });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return next(new HttpError(409, "Category name already exists"));
    }
    next(err);
  }
}

export async function updateCategory(
  req: Request<{ id: string }, unknown, UpdateCategoryInput>,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const category = await prisma.category.update({
      where: { id },
      data: { name, description },
    });

    res.json({ category });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        return next(new HttpError(409, "Category name already exists"));
      }
      if (err.code === "P2025") {
        return next(new HttpError(404, "Category not found"));
      }
    }
    next(err);
  }
}

export async function updateCategoryStatus(
  req: Request<{ id: string }, unknown, UpdateCategoryStatusInput>,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const category = await prisma.category.update({
      where: { id },
      data: { isActive },
    });

    res.json({ category });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return next(new HttpError(404, "Category not found"));
    }
    next(err);
  }
}

export async function deleteCategory(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const linkedGigPosts = await prisma.gigPost.count({ where: { categoryId: id } });
    if (linkedGigPosts > 0) {
      return next(
        new HttpError(409, "Category has gig posts and cannot be deleted; deactivate it instead")
      );
    }

    await prisma.category.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return next(new HttpError(404, "Category not found"));
    }
    next(err);
  }
}
