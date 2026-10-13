import { z } from "zod";

/** The shape of progress on the wire (browser ⇄ /api/progress). Strict limits: this is untrusted input. */
const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const nodeId = z
  .string()
  .regex(/^u\d-[a-z0-9-]+$/)
  .max(60);

export const dayActivitySchema = z.object({
  xp: z.number().int().min(0).max(1_000_000),
  lessonsDone: z.number().int().min(0).max(10_000),
  freezeEarned: z.boolean().optional(),
  frozen: z.boolean().optional(),
});

export const nodeRecordSchema = z.object({
  status: z.enum(["not_started", "in_progress", "done"]),
  bestScore: z.number().int().min(0).max(100),
  attempts: z.number().int().min(0).max(100_000),
  completedAt: z.string().datetime().nullable(),
});

export const progressSchema = z.object({
  totalXp: z.number().int().min(0).max(100_000_000),
  days: z
    .record(dateKey, dayActivitySchema)
    .refine((d) => Object.keys(d).length <= 5000, "too many days"),
  nodes: z
    .record(nodeId, nodeRecordSchema)
    .refine((n) => Object.keys(n).length <= 1000, "too many steps"),
});
