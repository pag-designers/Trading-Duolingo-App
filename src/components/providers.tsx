"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { ThemeProvider, useTheme } from "next-themes";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { reconcile, fetchMe, putMe } from "@/lib/sync";
import type { Me } from "@/lib/me-schema";
import { hydrateStores, useHydrated } from "@/store/hydration";
import { useProfile } from "@/store/profile";
import { useSettings } from "@/store/settings";
import { useSyncStatus } from "@/store/sync-status";

/** Keeps <html> attributes and next-themes in step with the settings store. */
function SettingsEffects() {
  const hydrated = useHydrated();
  const { setTheme } = useTheme();
  const theme = useSettings((s) => s.theme);
  const readingMode = useSettings((s) => s.readingMode);
  const reducedMotion = useSettings((s) => s.reducedMotion);

  useEffect(() => {
    if (hydrated) setTheme(theme);
  }, [hydrated, theme, setTheme]);

  useEffect(() => {
    const root = document.documentElement;
    if (readingMode) root.dataset.reading = "large";
    else delete root.dataset.reading;
    if (reducedMotion) root.dataset.motion = "reduced";
    else delete root.dataset.motion;
  }, [readingMode, reducedMotion]);

  return null;
}

function snapshot(): Me {
  const p = useProfile.getState();
  const s = useSettings.getState();
  return {
    profile: {
      displayName: p.displayName,
      mascotName: p.mascotName,
      accessory: p.accessory,
      onboardedAt: p.onboardedAt,
      updatedAt: p.updatedAt,
    },
    settings: {
      theme: s.theme,
      soundOn: s.soundOn,
      volume: s.volume,
      reducedMotion: s.reducedMotion,
      readingMode: s.readingMode,
      dailyXpGoal: s.dailyXpGoal,
      startingBalanceCents: s.startingBalanceCents,
      pdtEnabled: s.pdtEnabled,
      slippageBps: s.slippageBps,
      commissionCents: s.commissionCents,
      coachModel: s.coachModel,
      updatedAt: s.updatedAt,
    },
  };
}

/** Replace each local section whose server copy is newer. */
function applyServer(server: Me, local: Me): void {
  if (reconcile(local.profile.updatedAt, server.profile.updatedAt) === "pull") {
    useProfile.getState().replaceFromServer(server.profile);
  }
  if (reconcile(local.settings.updatedAt, server.settings.updatedAt) === "pull") {
    useSettings.getState().replaceFromServer(server.settings);
  }
}

/**
 * Syncs profile + settings between the browser stores and SQLite (via /api/me).
 * The app works fully offline: if the server is unreachable we just keep the local copy and retry
 * on the next change. See DECISIONS D-005.
 */
function SyncBridge() {
  const synced = useRef({ profile: "", settings: "" });
  const ready = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const push = async () => {
      const local = snapshot();
      if (
        local.profile.updatedAt === synced.current.profile &&
        local.settings.updatedAt === synced.current.settings
      ) {
        return;
      }
      try {
        const stored = await putMe(local);
        // The server keeps whichever copy is newer, so pull back anything it kept.
        applyServer(stored, snapshot());
        synced.current = { profile: stored.profile.updatedAt, settings: stored.settings.updatedAt };
      } catch {
        /* offline or server down — retry on the next change */
      }
    };

    const schedulePush = () => {
      if (!ready.current) return;
      clearTimeout(timer);
      timer = setTimeout(push, 400);
    };

    const unsubProfile = useProfile.subscribe(schedulePush);
    const unsubSettings = useSettings.subscribe(schedulePush);

    (async () => {
      await hydrateStores();
      try {
        const server = await fetchMe();
        if (cancelled) return;
        applyServer(server, snapshot());
        synced.current = { profile: server.profile.updatedAt, settings: server.settings.updatedAt };
      } catch {
        /* offline — carry on with local state */
      }
      ready.current = true;
      useSyncStatus.getState().markReady();
      void push();
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      unsubProfile();
      unsubSettings();
    };
  }, []);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: 1 } } }),
  );
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="candlo-theme"
      disableTransitionOnChange
    >
      <QueryClientProvider client={client}>
        <MotionConfig reducedMotion="user">
          <SettingsEffects />
          <SyncBridge />
          {children}
        </MotionConfig>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
