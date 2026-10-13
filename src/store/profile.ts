"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { safeLocalStorage } from "./persist";

export const ACCESSORIES = ["none", "beanie", "glasses", "headband"] as const;
export type Accessory = (typeof ACCESSORIES)[number];

export interface ProfileData {
  displayName: string;
  /** What the learner calls the mascot (default "Wick"). */
  mascotName: string;
  accessory: Accessory;
  onboardedAt: string | null;
  updatedAt: string;
}

export const DEFAULT_PROFILE: ProfileData = {
  displayName: "",
  mascotName: "Wick",
  accessory: "none",
  onboardedAt: null,
  updatedAt: new Date(0).toISOString(),
};

interface ProfileStore extends ProfileData {
  update: (patch: Partial<Omit<ProfileData, "updatedAt">>) => void;
  completeOnboarding: () => void;
  replaceFromServer: (data: ProfileData) => void;
}

export const useProfile = create<ProfileStore>()(
  persist(
    (set) => ({
      ...DEFAULT_PROFILE,
      update: (patch) => set({ ...patch, updatedAt: new Date().toISOString() }),
      completeOnboarding: () => {
        const now = new Date().toISOString();
        set({ onboardedAt: now, updatedAt: now });
      },
      replaceFromServer: (data) => set({ ...data }),
    }),
    {
      name: "candlo-profile",
      version: 1,
      storage: createJSONStorage(() => safeLocalStorage),
      skipHydration: true,
      partialize: (s): ProfileData => ({
        displayName: s.displayName,
        mascotName: s.mascotName,
        accessory: s.accessory,
        onboardedAt: s.onboardedAt,
        updatedAt: s.updatedAt,
      }),
    },
  ),
);
