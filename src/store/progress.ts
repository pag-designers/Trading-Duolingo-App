"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { dateKey, type DayMap } from "@/lib/progress";
import { idbStorage } from "./persist";

export type NodeStatus = "not_started" | "in_progress" | "done";

export interface NodeRecord {
  status: NodeStatus;
  bestScore: number; // 0..100 — informational only, never blocks progress
  attempts: number;
  completedAt: string | null;
}

interface ProgressState {
  totalXp: number;
  days: DayMap;
  nodes: Record<string, NodeRecord>;
  /** Streak freezes the learner owns (earned from streaks, wired up in CP1). */
  freezes: number;
}

interface ProgressStore extends ProgressState {
  awardXp: (amount: number, today?: string) => void;
  recordNode: (nodeId: string, score: number, today?: string) => void;
  reset: () => void;
}

/** A score is a whole number from 0 to 100; anything else (NaN, huge, negative) is clamped. */
const clampScore = (score: number): number =>
  Number.isFinite(score) ? Math.min(100, Math.max(0, Math.round(score))) : 0;

const EMPTY: ProgressState = { totalXp: 0, days: {}, nodes: {}, freezes: 0 };

export const useProgress = create<ProgressStore>()(
  persist(
    (set) => ({
      ...EMPTY,
      awardXp: (amount, today = dateKey(new Date())) =>
        set((s) => {
          const xp = Math.floor(amount);
          if (!Number.isFinite(xp) || xp <= 0) return s; // ignore NaN, fractions below 1, negatives
          const prev = s.days[today] ?? { xp: 0, lessonsDone: 0 };
          return {
            totalXp: s.totalXp + xp,
            days: { ...s.days, [today]: { ...prev, xp: prev.xp + xp } },
          };
        }),
      recordNode: (nodeId, score, today = dateKey(new Date())) =>
        set((s) => {
          const prev = s.nodes[nodeId];
          const firstCompletion = prev?.status !== "done";
          const prevDay = s.days[today] ?? { xp: 0, lessonsDone: 0 };
          return {
            nodes: {
              ...s.nodes,
              [nodeId]: {
                status: "done",
                bestScore: Math.max(prev?.bestScore ?? 0, clampScore(score)),
                attempts: (prev?.attempts ?? 0) + 1,
                completedAt: prev?.completedAt ?? new Date().toISOString(),
              },
            },
            days: firstCompletion
              ? { ...s.days, [today]: { ...prevDay, lessonsDone: prevDay.lessonsDone + 1 } }
              : s.days,
          };
        }),
      reset: () => set({ ...EMPTY }),
    }),
    {
      name: "candlo-progress",
      version: 1,
      storage: createJSONStorage(() => idbStorage),
      skipHydration: true,
      partialize: (s): ProgressState => ({
        totalXp: s.totalXp,
        days: s.days,
        nodes: s.nodes,
        freezes: s.freezes,
      }),
    },
  ),
);
