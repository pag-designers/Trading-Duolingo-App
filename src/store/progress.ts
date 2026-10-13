"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { clampScore, dateKey, type ProgressState } from "@/lib/progress";
import { idbStorage } from "./persist";

export type { NodeRecord, NodeStatus } from "@/lib/progress";

interface ProgressStore extends ProgressState {
  awardXp: (amount: number, today?: string) => void;
  recordNode: (nodeId: string, score: number, today?: string) => void;
  reset: () => void;
}

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
