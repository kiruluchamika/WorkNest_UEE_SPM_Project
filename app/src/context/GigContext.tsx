import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as gigApi from "../api/gigApi";
import type { Gig } from "../types";

interface GigContextValue {
  gigs: Gig[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  addGig: (gig: Omit<Gig, "id" | "createdAt" | "applicantsCount">) => Promise<Gig>;
  updateGig: (id: string, updates: Partial<Gig>) => Promise<Gig>;
}

const GigContext = createContext<GigContextValue | undefined>(undefined);

export const GigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await gigApi.listGigs();
      setGigs(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addGig = useCallback(async (payload: Omit<Gig, "id" | "createdAt" | "applicantsCount">) => {
    const gig = await gigApi.createGig(payload);
    setGigs((prev) => [gig, ...prev]);
    return gig;
  }, []);

  const updateGig = useCallback(async (id: string, updates: Partial<Gig>) => {
    const gig = await gigApi.updateGig(id, updates);
    setGigs((prev) => prev.map((g) => (g.id === id ? gig : g)));
    return gig;
  }, []);

  return (
    <GigContext.Provider value={{ gigs, isLoading, refresh, addGig, updateGig }}>
      {children}
    </GigContext.Provider>
  );
};

export function useGigs(): GigContextValue {
  const ctx = useContext(GigContext);
  if (!ctx) throw new Error("useGigs must be used within GigProvider");
  return ctx;
}
