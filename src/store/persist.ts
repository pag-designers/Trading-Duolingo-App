import { del, get, set } from "idb-keyval";
import type { StateStorage } from "zustand/middleware";

/** localStorage that never throws (private windows, blocked storage, SSR). */
export const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return typeof window === "undefined" ? null : window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      if (typeof window !== "undefined") window.localStorage.setItem(name, value);
    } catch {
      /* storage unavailable — the app still works for this session */
    }
  },
  removeItem: (name) => {
    try {
      if (typeof window !== "undefined") window.localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};

/**
 * Zustand storage backed by IndexedDB (async), used for progress and trade data.
 * If IndexedDB is unavailable (private window, blocked storage, SSR) it falls back to localStorage
 * so progress is still saved instead of throwing.
 */
export const idbStorage: StateStorage = {
  getItem: async (name) => {
    try {
      const fromIdb = await get<string>(name);
      if (fromIdb !== undefined) return fromIdb;
    } catch {
      /* fall through to localStorage */
    }
    return safeLocalStorage.getItem(name) as string | null;
  },
  setItem: async (name, value) => {
    try {
      await set(name, value);
      safeLocalStorage.removeItem(name); // IndexedDB worked: drop any stale fallback copy
    } catch {
      safeLocalStorage.setItem(name, value);
    }
  },
  removeItem: async (name) => {
    try {
      await del(name);
    } catch {
      /* ignore */
    }
    safeLocalStorage.removeItem(name);
  },
};
