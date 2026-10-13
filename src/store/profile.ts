"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { PROFILE_KEYS, type ProfileData } from "@/lib/me-schema";
import { pickKeys } from "@/lib/utils";
import { safeLocalStorage } from "./persist";

export { ACCESSORIES, type Accessory, type ProfileData } from "@/lib/me-schema";

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
      partialize: (s): ProfileData => pickKeys(s, PROFILE_KEYS),
    },
  ),
);
