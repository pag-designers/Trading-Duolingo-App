"use client";

import { useEffect, useState } from "react";
import { useProfile } from "./profile";
import { useProgress } from "./progress";
import { useSettings } from "./settings";

/** Give up waiting on a slow or blocked IndexedDB after this long; the app starts with what it has. */
export const HYDRATION_TIMEOUT_MS = 3000;

let hydrationPromise: Promise<void> | null = null;

/** Resolve when `p` settles or after `ms`, whichever is first, and never leave the timer running. */
function withTimeout(p: Promise<unknown>, ms: number): Promise<unknown> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Rehydrate every persisted store once (stores use skipHydration to avoid SSR mismatches).
 * Never rejects: a failing or hanging store must not leave the app stuck on the splash screen.
 */
export function hydrateStores(): Promise<void> {
  hydrationPromise ??= Promise.allSettled([
    // Profile and settings live in localStorage (fast); progress is in IndexedDB (can hang).
    useProfile.persist.rehydrate(),
    useSettings.persist.rehydrate(),
    withTimeout(Promise.resolve(useProgress.persist.rehydrate()), HYDRATION_TIMEOUT_MS),
  ]).then(() => undefined);
  return hydrationPromise;
}

/** True once persisted state has been loaded in the browser (or loading gave up). */
export function useHydrated(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void hydrateStores().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return ready;
}
