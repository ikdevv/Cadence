"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";

// The auth store persists to localStorage, which doesn't exist during SSR
// (skipHydration: true on the store). Call this in any component that reads
// auth state to know when it's actually safe to trust that state.
export function useAuthHydrated() {
  useEffect(() => {
    if (!useAuthStore.persist.hasHydrated()) {
      void useAuthStore.persist.rehydrate();
    }
  }, []);

  // Subscribing to the store's own hydration flag keeps this a read rather than
  // a setState inside an effect, so it can't trigger a cascading render.
  return useSyncExternalStore(
    (onChange) => useAuthStore.persist.onFinishHydration(onChange),
    () => useAuthStore.persist.hasHydrated(),
    () => false,
  );
}
