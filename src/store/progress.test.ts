// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { checkProgress } from "@/lib/integrity";
import { useProgress } from "./progress";

beforeEach(() => useProgress.getState().reset());

describe("progress store guards", () => {
  it("awards whole XP and records it on the day", () => {
    useProgress.getState().awardXp(10, "2026-03-10");
    useProgress.getState().awardXp(5.9, "2026-03-10");
    const s = useProgress.getState();
    expect(s.totalXp).toBe(15);
    expect(s.days["2026-03-10"]?.xp).toBe(15);
  });

  it("ignores NaN, infinite, zero, negative and sub-1 amounts", () => {
    for (const bad of [Number.NaN, Infinity, -Infinity, 0, -5, 0.4])
      useProgress.getState().awardXp(bad, "2026-03-10");
    expect(useProgress.getState().totalXp).toBe(0);
  });

  it("records a finished step once per day-count and clamps the score", () => {
    useProgress.getState().recordNode("u1-money", 140, "2026-03-10");
    useProgress.getState().recordNode("u1-money", Number.NaN, "2026-03-10");
    const s = useProgress.getState();
    expect(s.nodes["u1-money"]).toMatchObject({ status: "done", bestScore: 100, attempts: 2 });
    expect(s.days["2026-03-10"]?.lessonsDone).toBe(1); // replaying does not double count
  });

  it("always produces state that passes the integrity check", () => {
    useProgress.getState().awardXp(20, "2026-03-09");
    useProgress.getState().awardXp(10, "2026-03-10");
    useProgress.getState().recordNode("u1-money", 80, "2026-03-10");
    const { totalXp, days, nodes, freezes } = useProgress.getState();
    expect(checkProgress({ totalXp, days, nodes, freezes })).toEqual([]);
  });
});
