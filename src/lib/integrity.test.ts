import { describe, expect, it } from "vitest";
import { checkProgress, repairProgress, type ProgressSnapshot } from "./integrity";

const good = (): ProgressSnapshot => ({
  totalXp: 30,
  days: { "2026-03-09": { xp: 10, lessonsDone: 1 }, "2026-03-10": { xp: 20, lessonsDone: 2 } },
  nodes: {
    "u1-money": {
      status: "done",
      bestScore: 90,
      attempts: 1,
      completedAt: "2026-03-09T10:00:00.000Z",
    },
  },
  freezes: 0,
});

describe("checkProgress", () => {
  it("accepts consistent progress", () => {
    expect(checkProgress(good())).toEqual([]);
  });
  it("catches XP that does not match the daily record", () => {
    const p = { ...good(), totalXp: 99 };
    expect(checkProgress(p).map((x) => x.code)).toContain("xp_mismatch");
  });
  it("catches a done node with no completion date", () => {
    const p = good();
    p.nodes["u1-money"]!.completedAt = null;
    expect(checkProgress(p).map((x) => x.code)).toContain("done_without_date");
  });
  it("catches out-of-range scores and unknown statuses", () => {
    const p = good();
    p.nodes["x"] = { status: "weird", bestScore: 140, attempts: 0, completedAt: null };
    const codes = checkProgress(p).map((x) => x.code);
    expect(codes).toContain("bad_score");
    expect(codes).toContain("bad_status");
  });
});

describe("repairProgress", () => {
  it("fixes what it can and the result passes the check", () => {
    const broken: ProgressSnapshot = {
      totalXp: 999,
      days: { "2026-03-09": { xp: 10, lessonsDone: 1 } },
      nodes: { a: { status: "done", bestScore: 150, attempts: 0, completedAt: null } },
      freezes: -2,
    };
    expect(checkProgress(broken).length).toBeGreaterThan(0);
    const fixed = repairProgress(broken);
    expect(checkProgress(fixed)).toEqual([]);
    expect(fixed.totalXp).toBe(10);
  });
});

describe("checkProgress with non-finite numbers", () => {
  it("flags NaN, which every comparison would otherwise silently accept", () => {
    const p = { ...good(), totalXp: Number.NaN };
    expect(checkProgress(p).map((x) => x.code)).toContain("not_a_number");
    const q = good();
    q.nodes["u1-money"]!.bestScore = Number.NaN;
    expect(checkProgress(q).map((x) => x.code)).toContain("not_a_number");
  });
});
