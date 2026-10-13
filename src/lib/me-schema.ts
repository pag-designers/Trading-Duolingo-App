import { z } from "zod";

/** Shapes shared by the client store and the /api/me route. */
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
export type Me = z.infer<typeof meSchema>;
