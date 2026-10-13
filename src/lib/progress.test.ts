import { describe, expect, it } from "vitest";
import { computeStreak, dailyGoalFraction, dateKey, levelFromXp, longestStreak } from "./progress";

const day = (xp: number) => ({ xp, lessonsDone: xp > 0 ? 1 : 0 });

describe("levelFromXp", () => {
  it("starts at level 1 with 0 XP", () => {
    expect(levelFromXp(0)).toMatchObject({ level: 1, xpIntoLevel: 0, xpForNext: 50 });
  });
  it("levels up exactly at 50, 200, 450 XP", () => {
    expect(levelFromXp(49).level).toBe(1);
    expect(levelFromXp(50).level).toBe(2);
    expect(levelFromXp(199).level).toBe(2);
    expect(levelFromXp(200).level).toBe(3);
    expect(levelFromXp(450).level).toBe(4);
  });
  it("reports the fraction through the level", () => {
    expect(levelFromXp(125).fraction).toBeCloseTo(0.5); // level 2 spans 50..200
  });
  it("ignores negatives", () => {
    expect(levelFromXp(-20).level).toBe(1);
  });
});

describe("computeStreak", () => {
  it("is 0 with no activity", () => {
    expect(computeStreak({}, "2026-03-10")).toEqual({ current: 0, todayDone: false });
  });
  it("counts consecutive days including today", () => {
    const days = { "2026-03-08": day(10), "2026-03-09": day(5), "2026-03-10": day(20) };
    expect(computeStreak(days, "2026-03-10")).toEqual({ current: 3, todayDone: true });
  });
  it("keeps the streak alive until midnight when today is empty", () => {
    const days = { "2026-03-08": day(10), "2026-03-09": day(5) };
    expect(computeStreak(days, "2026-03-10")).toEqual({ current: 2, todayDone: false });
  });
  it("breaks after a missed day", () => {
    const days = { "2026-03-07": day(10), "2026-03-09": day(5) };
    expect(computeStreak(days, "2026-03-09").current).toBe(1);
  });
  it("lets a streak freeze bridge one missed day without counting it", () => {
    const days = { "2026-03-07": day(10), "2026-03-09": day(5) };
    expect(computeStreak(days, "2026-03-09", new Set(["2026-03-08"])).current).toBe(2);
  });
  it("works across month and year boundaries", () => {
    const days = { "2025-12-31": day(5), "2026-01-01": day(5) };
    expect(computeStreak(days, "2026-01-01").current).toBe(2);
  });
});

describe("longestStreak", () => {
  it("finds the best run", () => {
    const days = {
      "2026-03-01": day(1),
      "2026-03-02": day(1),
      "2026-03-03": day(1),
      "2026-03-06": day(1),
    };
    expect(longestStreak(days)).toBe(3);
  });
  it("bridges frozen days", () => {
    const days = { "2026-03-01": day(1), "2026-03-03": day(1) };
    expect(longestStreak(days, new Set(["2026-03-02"]))).toBe(2);
  });
});

describe("dailyGoalFraction / dateKey", () => {
  it("clamps between 0 and 1", () => {
    expect(dailyGoalFraction(15, 30)).toBe(0.5);
    expect(dailyGoalFraction(99, 30)).toBe(1);
    expect(dailyGoalFraction(5, 0)).toBe(1);
  });
  it("formats local dates", () => {
    expect(dateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
