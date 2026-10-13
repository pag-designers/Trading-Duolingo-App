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

describe("checkProgress: streak freezes", () => {
  const withDays = (days: ProgressSnapshot["days"]): ProgressSnapshot => ({
    totalXp: Object.values(days).reduce((n, d) => n + d.xp, 0),
    days,
    nodes: {},
  });
  it("accepts an earned freeze that was used on a missed day", () => {
    const p = withDays({
      "2026-03-07": { xp: 10, lessonsDone: 1, freezeEarned: true },
      "2026-03-08": { xp: 0, lessonsDone: 0, frozen: true },
    });
    expect(checkProgress(p)).toEqual([]);
  });
  it("catches a freeze that was used but never earned", () => {
    const p = withDays({ "2026-03-08": { xp: 0, lessonsDone: 0, frozen: true } });
    expect(checkProgress(p).map((x) => x.code)).toContain("freeze_overspent");
  });
  it("catches a frozen day that has XP", () => {
    const p = withDays({
      "2026-03-07": { xp: 10, lessonsDone: 1, freezeEarned: true },
      "2026-03-08": { xp: 5, lessonsDone: 1, frozen: true },
    });
    expect(checkProgress(p).map((x) => x.code)).toContain("frozen_with_xp");
  });
});

describe("repairProgress: freezes", () => {
  it("repairs a frozen day that has XP and a freeze that was never earned", () => {
    const broken: ProgressSnapshot = {
      totalXp: 35,
      days: {
        "2026-03-07": { xp: 5, lessonsDone: 1, freezeEarned: true },
        "2026-03-08": { xp: 30, lessonsDone: 2, frozen: true },
        "2026-03-09": { xp: 0, lessonsDone: 0, frozen: true },
        "2026-03-10": { xp: 0, lessonsDone: 0, frozen: true },
      },
      nodes: {},
    };
    expect(checkProgress(broken).length).toBeGreaterThan(0);
    expect(checkProgress(repairProgress(broken))).toEqual([]);
  });
});
