import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import * as adminGigApi from "../api/adminGigApi";
import type { GigPost } from "../types";

interface AdminGigStats {
  total: number;
  pending: number;
  active: number;
  rejected: number;
}

interface AdminGigContextValue {
  gigs: GigPost[];
  isLoading: boolean;
  stats: AdminGigStats;
  refresh: () => Promise<void>;
  approveGig: (id: string) => Promise<GigPost>;
  rejectGig: (id: string, reason: string) => Promise<GigPost>;
}

const AdminGigContext = createContext<AdminGigContextValue | undefined>(undefined);

export const AdminGigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [gigs, setGigs] = useState<GigPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminGigApi.listAdminGigs("ALL");
      setGigs(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const approveGig = useCallback(async (id: string) => {
    const gig = await adminGigApi.approveGig(id);
    setGigs((prev) => prev.map((g) => (g.id === id ? gig : g)));
    return gig;
  }, []);

  const rejectGig = useCallback(async (id: string, reason: string) => {
    const gig = await adminGigApi.rejectGig(id, reason);
    setGigs((prev) => prev.map((g) => (g.id === id ? gig : g)));
    return gig;
  }, []);

  const stats = useMemo<AdminGigStats>(
    () => ({
      total: gigs.length,
      pending: gigs.filter((g) => g.status === "PENDING").length,
      active: gigs.filter((g) => g.status === "ACTIVE").length,
      rejected: gigs.filter((g) => g.status === "REJECTED").length,
    }),
    [gigs]
  );

  return (
    <AdminGigContext.Provider value={{ gigs, isLoading, stats, refresh, approveGig, rejectGig }}>
      {children}
    </AdminGigContext.Provider>
  );
};

export function useAdminGigs(): AdminGigContextValue {
  const ctx = useContext(AdminGigContext);
  if (!ctx) throw new Error("useAdminGigs must be used within AdminGigProvider");
  return ctx;
}
