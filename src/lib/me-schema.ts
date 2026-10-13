import { z } from "zod";

/** The single definition of profile and settings: stores, snapshots and the API all derive from it. */
export const profileSchema = z.object({
  displayName: z.string().trim().max(30),
  mascotName: z.string().trim().min(1).max(20),
  accessory: z.enum(["none", "beanie", "glasses", "headband"]),
  onboardedAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime(),
});

export const settingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  soundOn: z.boolean(),
  volume: z.number().int().min(0).max(100),
  reducedMotion: z.boolean(),
  readingMode: z.boolean(),
  dailyXpGoal: z.number().int().min(5).max(500),
  startingBalanceCents: z.number().int().min(100_00).max(10_000_000_00),
  pdtEnabled: z.boolean(),
  slippageBps: z.number().int().min(0).max(500),
  commissionCents: z.number().int().min(0).max(10_000),
  coachModel: z.enum(["auto", "sonnet", "haiku"]),
  updatedAt: z.string().datetime(),
});

export const meSchema = z.object({ profile: profileSchema, settings: settingsSchema });

export type ProfileData = z.infer<typeof profileSchema>;
export type SettingsData = z.infer<typeof settingsSchema>;
export type Me = z.infer<typeof meSchema>;

export const ACCESSORIES = profileSchema.shape.accessory.options;
export type Accessory = ProfileData["accessory"];
export type ThemeChoice = SettingsData["theme"];
export type CoachModelChoice = SettingsData["coachModel"];

/** The persisted/synced field names of each section, derived from the schemas (never hand-listed). */
export const PROFILE_KEYS = Object.keys(profileSchema.shape) as (keyof ProfileData)[];
export const SETTINGS_KEYS = Object.keys(settingsSchema.shape) as (keyof SettingsData)[];
