"use client";

import { create } from "zustand";

/** Becomes true once the first server sync has finished (success, failure or timeout). */
export const useSyncStatus = create<{ ready: boolean; markReady: () => void }>((set) => ({
  ready: false,
  markReady: () => set({ ready: true }),
}));
