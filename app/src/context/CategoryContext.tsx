import React, { createContext, useContext, useState, useCallback } from "react";
import * as categoryApi from "../api/categoryApi";
import type { Category } from "../types";

interface CategoryContextValue {
  categories: Category[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  addCategory: (payload: { name: string; description?: string }) => Promise<Category>;
  editCategory: (
    id: string,
    updates: { name?: string; description?: string }
  ) => Promise<Category>;
  setStatus: (id: string, isActive: boolean) => Promise<Category>;
  removeCategory: (id: string) => Promise<void>;
}

const CategoryContext = createContext<CategoryContextValue | undefined>(undefined);

export const CategoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await categoryApi.listAllCategories();
      setCategories(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addCategory = useCallback(async (payload: { name: string; description?: string }) => {
    const category = await categoryApi.createCategory(payload);
    setCategories((prev) => [category, ...prev]);
    return category;
  }, []);

  const editCategory = useCallback(
    async (id: string, updates: { name?: string; description?: string }) => {
      const category = await categoryApi.updateCategory(id, updates);
      setCategories((prev) => prev.map((c) => (c.id === id ? category : c)));
      return category;
    },
    []
  );

  const setStatus = useCallback(async (id: string, isActive: boolean) => {
    const category = await categoryApi.updateCategoryStatus(id, isActive);
    setCategories((prev) => prev.map((c) => (c.id === id ? category : c)));
    return category;
  }, []);

  const removeCategory = useCallback(async (id: string) => {
    await categoryApi.deleteCategory(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return (
    <CategoryContext.Provider
      value={{ categories, isLoading, refresh, addCategory, editCategory, setStatus, removeCategory }}
    >
      {children}
    </CategoryContext.Provider>
  );
};

export function useCategories(): CategoryContextValue {
  const ctx = useContext(CategoryContext);
  if (!ctx) throw new Error("useCategories must be used within CategoryProvider");
  return ctx;
}
