"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { safeLocalStorage } from "./persist";

export type ThemeChoice = "light" | "dark" | "system";
export type CoachModelChoice = "auto" | "sonnet" | "haiku";

export interface SettingsData {
  theme: ThemeChoice;
  soundOn: boolean;
  volume: number; // 0..100
  reducedMotion: boolean;
  readingMode: boolean;
  dailyXpGoal: number;
  startingBalanceCents: number;
  pdtEnabled: boolean;
  slippageBps: number;
  commissionCents: number;
  coachModel: CoachModelChoice;
  updatedAt: string;
}

export const DEFAULT_SETTINGS: SettingsData = {
  theme: "system",
  soundOn: true,
  volume: 70,
  reducedMotion: false,
  readingMode: false,
  dailyXpGoal: 30,
  startingBalanceCents: 1_000_000,
  pdtEnabled: true,
  slippageBps: 5,
  commissionCents: 0,
  coachModel: "auto",
  updatedAt: new Date(0).toISOString(),
};

interface SettingsStore extends SettingsData {
  update: (patch: Partial<Omit<SettingsData, "updatedAt">>) => void;
  /** Replace local state with a newer copy from the server (does not bump updatedAt). */
  replaceFromServer: (data: SettingsData) => void;
}

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      update: (patch) => set({ ...patch, updatedAt: new Date().toISOString() }),
      replaceFromServer: (data) => set({ ...data }),
    }),
    {
      name: "candlo-settings",
      version: 1,
      storage: createJSONStorage(() => safeLocalStorage),
      skipHydration: true,
      partialize: (s): SettingsData => ({
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
      }),
    },
  ),
);
