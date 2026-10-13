"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  addXp,
  applyCompletion,
  dateKey,
  EMPTY_PROGRESS,
  markNodeDone,
  mergeProgress,
  settleFreezes,
  type Completion,
  type ProgressState,
} from "@/lib/progress";
import { idbStorage } from "./persist";

export type { NodeRecord, NodeStatus } from "@/lib/progress";

interface ProgressStore extends ProgressState {
  awardXp: (amount: number, today?: string) => void;
  recordNode: (nodeId: string, score: number, today?: string) => void;
  /** Finish a step: records it, adds XP and maybe earns a streak freeze, all in one update. */
  finishNode: (c: Omit<Completion, "today" | "now"> & { today?: string; now?: string }) => void;
  /** Spend streak freezes on missed days (call when the app opens). */
  settle: (today?: string) => void;
  /** Merge a copy from the database into this one (progress only grows, so this is lossless). */
  mergeFrom: (other: ProgressState) => void;
}

const pick = (s: ProgressState): ProgressState => ({
  totalXp: s.totalXp,
  days: s.days,
  nodes: s.nodes,
});

export const useProgress = create<ProgressStore>()(
  persist(
    (set) => ({
      ...EMPTY_PROGRESS,
      awardXp: (amount, today = dateKey(new Date())) => set((s) => addXp(pick(s), amount, today)),
      recordNode: (nodeId, score, today = dateKey(new Date())) =>
        set((s) => markNodeDone(pick(s), nodeId, score, today, new Date().toISOString())),
      finishNode: (c) =>
        set((s) =>
          applyCompletion(pick(s), {
            ...c,
            today: c.today ?? dateKey(new Date()),
            now: c.now ?? new Date().toISOString(),
          }),
        ),
      settle: (today = dateKey(new Date())) =>
        set((s) => {
          const days = settleFreezes(s.days, today);
          return days === s.days ? s : { days };
        }),
      mergeFrom: (other) => set((s) => mergeProgress(pick(s), other)),
    }),
    {
      name: "candlo-progress",
      version: 2,
      storage: createJSONStorage(() => idbStorage),
      skipHydration: true,
      partialize: (s): ProgressState => pick(s),
      // v1 stored a `freezes` counter; freezes are now derived from days, so just drop it.
      migrate: (persisted) => {
        const p = persisted as Partial<ProgressState> | undefined;
        return { totalXp: p?.totalXp ?? 0, days: p?.days ?? {}, nodes: p?.nodes ?? {} };
      },
    },
  ),
);
