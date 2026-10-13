"use client";

import { useEffect, useRef } from "react";
import { PROFILE_KEYS, SETTINGS_KEYS, type Me } from "@/lib/me-schema";
import { sameProgress, type ProgressState } from "@/lib/progress";
import { fetchMe, fetchProgress, putMe, putProgress, reconcile } from "@/lib/sync";
import { pickKeys } from "@/lib/utils";
import { hydrateStores } from "@/store/hydration";
import { useProfile } from "@/store/profile";
import { useProgress } from "@/store/progress";
import { useSettings } from "@/store/settings";
import { useSyncStatus } from "@/store/sync-status";

function snapshot(): Me {
  return {
    profile: pickKeys(useProfile.getState(), PROFILE_KEYS),
    settings: pickKeys(useSettings.getState(), SETTINGS_KEYS),
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

const progressSnapshot = (): ProgressState =>
  pickKeys(useProgress.getState(), ["totalXp", "days", "nodes"]);

/**
 * Keeps the browser stores and SQLite in step (BRIEF §0: SQLite is the source of truth, the stores are the
 * instant, offline-capable cache; see DECISIONS D-005, D-013, D-018).
 * - Profile and settings: last write wins per section (by `updatedAt`).
 * - Progress only ever grows, so it is merged, not overwritten: nothing is ever lost, in either direction.
 * The app works fully offline: if the server is unreachable we keep the local copy and retry on the next change.
 */
export function SyncBridge() {
  const synced = useRef({ profile: "", settings: "" });
  const lastProgress = useRef<ProgressState | null>(null);
  const ready = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let progressTimer: ReturnType<typeof setTimeout> | undefined;

    const pushMe = async () => {
      const local = snapshot();
      if (
        local.profile.updatedAt === synced.current.profile &&
        local.settings.updatedAt === synced.current.settings
      )
        return;
      try {
        const stored = await putMe(local);
        // The server keeps whichever copy is newer, so pull back anything it kept.
        applyServer(stored, snapshot());
        synced.current = { profile: stored.profile.updatedAt, settings: stored.settings.updatedAt };
      } catch {
        /* offline or server down — retry on the next change */
      }
    };

    const pushProgress = async () => {
      const local = progressSnapshot();
      if (lastProgress.current && sameProgress(local, lastProgress.current)) return;
      try {
        const merged = await putProgress(local);
        useProgress.getState().mergeFrom(merged); // idempotent; picks up anything another tab added
        lastProgress.current = merged;
      } catch {
        /* offline — retry on the next change */
      }
    };

    const schedule = () => {
      if (!ready.current) return;
      clearTimeout(timer);
      timer = setTimeout(pushMe, 400);
    };
    const scheduleProgress = () => {
      if (!ready.current) return;
      clearTimeout(progressTimer);
      progressTimer = setTimeout(pushProgress, 400);
    };

    const unsubProfile = useProfile.subscribe(schedule);
    const unsubSettings = useSettings.subscribe(schedule);
    const unsubProgress = useProgress.subscribe(scheduleProgress);

    const initialMe = async () => {
      try {
        const server = await fetchMe();
        if (cancelled) return;
        applyServer(server, snapshot());
        synced.current = { profile: server.profile.updatedAt, settings: server.settings.updatedAt };
      } catch {
        /* offline — carry on with local state */
      }
    };
    const initialProgress = async () => {
      try {
        const server = await fetchProgress();
        if (cancelled) return;
        useProgress.getState().mergeFrom(server);
        lastProgress.current = server;
      } catch {
        /* offline — carry on with local state */
      }
    };

    (async () => {
      await hydrateStores();
      await Promise.allSettled([initialMe(), initialProgress()]);
      if (cancelled) return;
      useProgress.getState().settle(); // spend a streak freeze on a missed day, if one is held
      ready.current = true;
      useSyncStatus.getState().markReady();
      void pushMe();
      void pushProgress();
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearTimeout(progressTimer);
      unsubProfile();
      unsubSettings();
      unsubProgress();
    };
  }, []);

  return null;
}
