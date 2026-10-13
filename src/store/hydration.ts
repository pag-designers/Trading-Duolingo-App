"use client";

import { useEffect, useState } from "react";
import { useProfile } from "./profile";
import { useProgress } from "./progress";
import { useSettings } from "./settings";

let hydrationPromise: Promise<void> | null = null;

/** Rehydrate every persisted store once (stores use skipHydration to avoid SSR mismatches). */
export function hydrateStores(): Promise<void> {
  hydrationPromise ??= Promise.all([
    useProfile.persist.rehydrate(),
    useSettings.persist.rehydrate(),
    useProgress.persist.rehydrate(),
  ]).then(() => undefined);
  return hydrationPromise;
}

/** True once persisted state has been loaded in the browser. */
export function useHydrated(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    hydrateStores().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return ready;
}
