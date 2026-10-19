import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import * as gigPostApi from "../api/gigPostApi";
import type { GigPost } from "../types";
import type { GigPostFormPayload, GigPostUpdatePayload } from "../api/gigPostApi";

interface GigPostStats {
  total: number;
  active: number;
  pending: number;
  rejected: number;
  closed: number;
}

interface GigPostContextValue {
  gigPosts: GigPost[];
  isLoading: boolean;
  stats: GigPostStats;
  refresh: () => Promise<void>;
  addGig: (payload: GigPostFormPayload) => Promise<GigPost>;
  editGig: (id: string, updates: GigPostUpdatePayload) => Promise<GigPost>;
  removeGig: (id: string) => Promise<void>;
  closeGig: (id: string) => Promise<GigPost>;
  resubmitGig: (id: string) => Promise<GigPost>;
  completeGig: (id: string) => Promise<GigPost>;
}

const GigPostContext = createContext<GigPostContextValue | undefined>(undefined);

export const GigPostProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [gigPosts, setGigPosts] = useState<GigPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await gigPostApi.listMyGigPosts();
      setGigPosts(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addGig = useCallback(async (payload: GigPostFormPayload) => {
    const gig = await gigPostApi.createGigPost(payload);
    setGigPosts((prev) => [gig, ...prev]);
    return gig;
  }, []);

  const editGig = useCallback(async (id: string, updates: GigPostUpdatePayload) => {
    const gig = await gigPostApi.updateGigPost(id, updates);
    setGigPosts((prev) => prev.map((g) => (g.id === id ? gig : g)));
    return gig;
  }, []);

  const removeGig = useCallback(async (id: string) => {
    await gigPostApi.deleteGigPost(id);
    setGigPosts((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const closeGig = useCallback(async (id: string) => {
    const gig = await gigPostApi.closeGigPost(id);
    setGigPosts((prev) => prev.map((g) => (g.id === id ? gig : g)));
    return gig;
  }, []);

  const resubmitGig = useCallback(async (id: string) => {
    const gig = await gigPostApi.resubmitGigPost(id);
    setGigPosts((prev) => prev.map((g) => (g.id === id ? gig : g)));
    return gig;
  }, []);

  const completeGig = useCallback(async (id: string) => {
    const gig = await gigPostApi.completeGigPost(id);
    setGigPosts((prev) => prev.map((g) => (g.id === id ? gig : g)));
    return gig;
  }, []);

  const stats = useMemo<GigPostStats>(
    () => ({
      total: gigPosts.length,
      active: gigPosts.filter((g) => g.status === "ACTIVE").length,
      pending: gigPosts.filter((g) => g.status === "PENDING").length,
      rejected: gigPosts.filter((g) => g.status === "REJECTED").length,
      closed: gigPosts.filter((g) => g.status === "CLOSED").length,
    }),
    [gigPosts]
  );

  const value = useMemo(
    () => ({
      gigPosts,
      isLoading,
      stats,
      refresh,
      addGig,
      editGig,
      removeGig,
      closeGig,
      resubmitGig,
      completeGig,
    }),
    [gigPosts, isLoading, stats, refresh, addGig, editGig, removeGig, closeGig, resubmitGig, completeGig]
  );

  return <GigPostContext.Provider value={value}>{children}</GigPostContext.Provider>;
};

export function useGigPosts(): GigPostContextValue {
  const ctx = useContext(GigPostContext);
  if (!ctx) throw new Error("useGigPosts must be used within GigPostProvider");
  return ctx;
}
