"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";

// The auth store persists to localStorage, which doesn't exist during SSR
// (skipHydration: true on the store). Call this in any component that reads
// auth state to know when it's actually safe to trust that state.
export function useAuthHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    useAuthStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  return hydrated;
}
