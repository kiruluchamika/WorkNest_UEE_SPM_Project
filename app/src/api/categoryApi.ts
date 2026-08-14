import { http, extractErrorMessage } from "./http";
import type { Category } from "../types";

export async function listActiveCategories(): Promise<Category[]> {
  try {
    const { data } = await http.get("/categories");
    return data.categories;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not load categories."));
  }
}

export async function listAllCategories(): Promise<Category[]> {
  try {
    const { data } = await http.get("/admin/categories");
    return data.categories;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not load categories."));
  }
}

export async function createCategory(payload: {
  name: string;
  description?: string;
}): Promise<Category> {
  try {
    const { data } = await http.post("/admin/categories", payload);
    return data.category;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not create category."));
  }
}

export async function updateCategory(
  id: string,
  payload: { name?: string; description?: string }
): Promise<Category> {
  try {
    const { data } = await http.put(`/admin/categories/${id}`, payload);
    return data.category;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not update category."));
  }
}

export async function updateCategoryStatus(id: string, isActive: boolean): Promise<Category> {
  try {
    const { data } = await http.patch(`/admin/categories/${id}/status`, { isActive });
    return data.category;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not update category status."));
  }
}

export async function deleteCategory(id: string): Promise<void> {
  try {
    await http.delete(`/admin/categories/${id}`);
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not delete category."));
  }
}
