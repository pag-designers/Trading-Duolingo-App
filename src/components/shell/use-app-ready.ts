"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useHydrated } from "@/store/hydration";
import { useProfile } from "@/store/profile";
import { useSyncStatus } from "@/store/sync-status";

/**
 * True when stored state is loaded, the first server sync has finished, and the learner is onboarded.
 * A learner who is not onboarded is sent to /onboarding. (We wait for the first sync first: someone who
 * cleared their browser may already be known to the database.)
 */
export function useAppReady(): boolean {
  const hydrated = useHydrated();
  const syncReady = useSyncStatus((s) => s.ready);
  const onboardedAt = useProfile((s) => s.onboardedAt);
  const router = useRouter();

  useEffect(() => {
    if (hydrated && syncReady && !onboardedAt) router.replace("/onboarding");
  }, [hydrated, syncReady, onboardedAt, router]);

  return hydrated && syncReady && !!onboardedAt;
}
