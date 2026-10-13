import { describe, expect, it } from "vitest";
import { progressSchema } from "./progress-schema";

const good = {
  totalXp: 30,
  days: { "2026-03-10": { xp: 30, lessonsDone: 2, freezeEarned: true } },
  nodes: {
    "u1-money": {
      status: "done",
      bestScore: 90,
      attempts: 1,
      completedAt: "2026-03-10T10:00:00.000Z",
    },
  },
};

describe("progressSchema (untrusted input)", () => {
  it("accepts real progress", () => expect(progressSchema.safeParse(good).success).toBe(true));
  it.each([
    ["a bad date key", { ...good, days: { "March 10": good.days["2026-03-10"] } }],
    ["a bad node id", { ...good, nodes: { "../etc/passwd": good.nodes["u1-money"] } }],
    ["negative XP", { ...good, days: { "2026-03-10": { xp: -5, lessonsDone: 0 } } }],
    [
      "a fractional score",
      { ...good, nodes: { "u1-money": { ...good.nodes["u1-money"], bestScore: 90.5 } } },
    ],
    [
      "a score over 100",
      { ...good, nodes: { "u1-money": { ...good.nodes["u1-money"], bestScore: 101 } } },
    ],
    [
      "an unknown status",
      { ...good, nodes: { "u1-money": { ...good.nodes["u1-money"], status: "winning" } } },
    ],
    ["a huge XP number", { ...good, totalXp: 1e12 }],
    ["NaN", { ...good, totalXp: Number.NaN }],
  ])("rejects %s", (_, bad) => expect(progressSchema.safeParse(bad).success).toBe(false));
});
