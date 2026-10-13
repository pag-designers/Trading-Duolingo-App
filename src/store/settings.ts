"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { SETTINGS_KEYS, type SettingsData } from "@/lib/me-schema";
import { pickKeys } from "@/lib/utils";
import { safeLocalStorage } from "./persist";

export type { CoachModelChoice, SettingsData, ThemeChoice } from "@/lib/me-schema";

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
      partialize: (s): SettingsData => pickKeys(s, SETTINGS_KEYS),
    },
  ),
);
