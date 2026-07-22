"use client";

import { createContext, useContext, useState, useMemo, type ReactNode } from "react";

interface StoreContextValue {
  user: Record<string, unknown> | null;
  setUser: (user: Record<string, unknown> | null) => void;
  currentSession: Record<string, unknown> | null;
  setCurrentSession: (session: Record<string, unknown> | null) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [currentSession, setCurrentSession] = useState<Record<string, unknown> | null>(null);

  const value = useMemo(
    () => ({ user, setUser, currentSession, setCurrentSession }),
    [user, currentSession],
  );

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
