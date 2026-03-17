"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";

interface HomeInfo {
  id: string;
  name: string;
  type: string;
  memberRole: string;
}

interface ActiveHomeContext {
  homes: HomeInfo[];
  activeHome: HomeInfo | null;
  setActiveHomeId: (id: string) => void;
  loading: boolean;
  refresh: () => Promise<void>;
}

const ActiveHomeCtx = createContext<ActiveHomeContext>({
  homes: [],
  activeHome: null,
  setActiveHomeId: () => {},
  loading: true,
  refresh: async () => {},
});

export function useActiveHome() {
  return useContext(ActiveHomeCtx);
}

export { ActiveHomeCtx };

export function useActiveHomeProvider() {
  const [homes, setHomes] = useState<HomeInfo[]>([]);
  const [activeHomeId, setActiveHomeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHomes = useCallback(async () => {
    try {
      const res = await fetch("/api/homes");
      if (!res.ok) return;
      const data = await res.json();
      setHomes(data.homes || []);

      // Set active home from localStorage or first home
      const stored = typeof window !== "undefined"
        ? localStorage.getItem("honeydo-active-home")
        : null;

      if (stored && data.homes.some((h: HomeInfo) => h.id === stored)) {
        setActiveHomeId(stored);
      } else if (data.homes.length > 0) {
        setActiveHomeId(data.homes[0].id);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHomes();
  }, [fetchHomes]);

  const handleSetActiveHomeId = useCallback((id: string) => {
    setActiveHomeId(id);
    if (typeof window !== "undefined") {
      localStorage.setItem("honeydo-active-home", id);
    }
  }, []);

  const activeHome = homes.find((h) => h.id === activeHomeId) ?? null;

  return {
    homes,
    activeHome,
    setActiveHomeId: handleSetActiveHomeId,
    loading,
    refresh: fetchHomes,
  };
}
