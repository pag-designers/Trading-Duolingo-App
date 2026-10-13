import { describe, expect, it } from "vitest";
import {
  addDays,
  applyCompletion,
  computeStreak,
  dailyGoalFraction,
  dateKey,
  freezesHeld,
  levelFromXp,
  longestStreak,
  maybeEarnFreeze,
  mergeProgress,
  normalizeFreezes,
  sameProgress,
  settleFreezes,
  weekStart,
  weekTotals,
  type DayMap,
  type ProgressState,
} from "./progress";

const day = (xp: number, extra: object = {}) => ({ xp, lessonsDone: xp > 0 ? 1 : 0, ...extra });
const run = (start: string, n: number): DayMap =>
  Object.fromEntries(Array.from({ length: n }, (_, i) => [addDays(start, i), day(10)]));

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
    expect(levelFromXp(125).fraction).toBeCloseTo(0.5);
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
  it("a frozen day bridges the gap without counting", () => {
    const days = {
      "2026-03-07": day(10),
      "2026-03-08": day(0, { frozen: true }),
      "2026-03-09": day(5),
    };
    expect(computeStreak(days, "2026-03-09").current).toBe(2);
  });
  it("works across month and year boundaries", () => {
    expect(
      computeStreak({ "2025-12-31": day(5), "2026-01-01": day(5) }, "2026-01-01").current,
    ).toBe(2);
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
    const days = {
      "2026-03-01": day(1),
      "2026-03-02": day(0, { frozen: true }),
      "2026-03-03": day(1),
    };
    expect(longestStreak(days)).toBe(2);
  });
});

describe("streak freezes", () => {
  it("earns one on the 7th streak day, once, and holds at most 2", () => {
    let days = run("2026-03-01", 7); // Mar 1..7
    days = maybeEarnFreeze(days, "2026-03-07");
    expect(days["2026-03-07"]?.freezeEarned).toBe(true);
    expect(freezesHeld(days)).toBe(1);
    expect(maybeEarnFreeze(days, "2026-03-07")).toBe(days); // not twice on the same day

    let more = run("2026-03-01", 14);
    more = maybeEarnFreeze(more, "2026-03-07");
    more = maybeEarnFreeze(more, "2026-03-14");
    expect(freezesHeld(more)).toBe(2);
    const capped = maybeEarnFreeze(
      {
        ...run("2026-03-01", 21),
        "2026-03-07": day(10, { freezeEarned: true }),
        "2026-03-14": day(10, { freezeEarned: true }),
      },
      "2026-03-21",
    );
    expect(freezesHeld(capped)).toBe(2); // no third
  });
  it("does not earn on other days", () => {
    expect(maybeEarnFreeze(run("2026-03-01", 6), "2026-03-06")).toEqual(run("2026-03-01", 6));
  });
  it("spends a freeze to cover a missed day and keeps the streak", () => {
    const days: DayMap = { ...run("2026-03-01", 7), "2026-03-07": day(10, { freezeEarned: true }) };
    const settled = settleFreezes(days, "2026-03-09"); // missed Mar 8
    expect(settled["2026-03-08"]).toMatchObject({ frozen: true, xp: 0 });
    expect(freezesHeld(settled)).toBe(0);
    expect(computeStreak({ ...settled, "2026-03-09": day(10) }, "2026-03-09").current).toBe(8);
  });
  it("does not waste a freeze when the gap is too long to save the streak", () => {
    const days: DayMap = { ...run("2026-03-01", 7), "2026-03-07": day(10, { freezeEarned: true }) };
    expect(settleFreezes(days, "2026-03-10")).toBe(days); // missed Mar 8 and 9, only one freeze
  });
  it("does nothing when no day was missed or no freeze is held", () => {
    const days = run("2026-03-01", 3);
    expect(settleFreezes(days, "2026-03-04")).toBe(days);
    expect(settleFreezes(days, "2026-03-06")).toBe(days);
    expect(settleFreezes({}, "2026-03-06")).toEqual({});
  });
});

describe("weeks (against yourself)", () => {
  it("weeks start on Monday", () => {
    expect(weekStart("2026-03-09")).toBe("2026-03-09"); // a Monday
    expect(weekStart("2026-03-15")).toBe("2026-03-09"); // Sunday
    expect(weekStart("2026-03-16")).toBe("2026-03-16");
  });
  it("splits XP into this week and last week", () => {
    const days = {
      "2026-03-02": day(10), // last week Mon
      "2026-03-08": day(20), // last week Sun
      "2026-03-09": day(5), // this week Mon
      "2026-03-11": day(7), // this week Wed (today)
      "2026-03-01": day(99), // two weeks ago: ignored
    };
    expect(weekTotals(days, "2026-03-11")).toEqual({ thisWeek: 12, lastWeek: 30 });
  });
});

describe("applyCompletion", () => {
  const empty: ProgressState = { totalXp: 0, days: {}, nodes: {} };
  it("records the step, the XP and the lesson count together", () => {
    const p = applyCompletion(empty, {
      nodeId: "u1-money",
      score: 90,
      xp: 25,
      today: "2026-03-10",
      now: "2026-03-10T10:00:00.000Z",
    });
    expect(p.totalXp).toBe(25);
    expect(p.days["2026-03-10"]).toMatchObject({ xp: 25, lessonsDone: 1 });
    expect(p.nodes["u1-money"]).toMatchObject({ status: "done", bestScore: 90, attempts: 1 });
  });
  it("earns a freeze when the 7th day completes", () => {
    const six: ProgressState = { totalXp: 60, days: run("2026-03-01", 6), nodes: {} };
    const p = applyCompletion(six, {
      nodeId: "x",
      score: 100,
      xp: 10,
      today: "2026-03-07",
      now: "2026-03-07T00:00:00.000Z",
    });
    expect(freezesHeld(p.days)).toBe(1);
  });
});

describe("mergeProgress (monotonic: both sides converge)", () => {
  const a: ProgressState = {
    totalXp: 30,
    days: { "2026-03-09": day(10), "2026-03-10": day(20, { freezeEarned: true }) },
    nodes: {
      one: { status: "done", bestScore: 80, attempts: 2, completedAt: "2026-03-10T12:00:00.000Z" },
      two: { status: "in_progress", bestScore: 0, attempts: 0, completedAt: null },
    },
  };
  const b: ProgressState = {
    totalXp: 40,
    days: { "2026-03-10": day(25), "2026-03-11": day(15) },
    nodes: {
      one: { status: "done", bestScore: 95, attempts: 1, completedAt: "2026-03-10T09:00:00.000Z" },
      two: { status: "done", bestScore: 70, attempts: 1, completedAt: "2026-03-11T08:00:00.000Z" },
      three: {
        status: "done",
        bestScore: 60,
        attempts: 1,
        completedAt: "2026-03-11T09:00:00.000Z",
      },
    },
  };
  const m = mergeProgress(a, b);

  it("takes the larger value of everything and recomputes total XP from the days", () => {
    expect(m.days["2026-03-10"]).toEqual({ xp: 25, lessonsDone: 1, freezeEarned: true });
    expect(m.totalXp).toBe(10 + 25 + 15);
    expect(m.nodes["one"]).toEqual({
      status: "done",
      bestScore: 95,
      attempts: 2,
      completedAt: "2026-03-10T09:00:00.000Z",
    });
    expect(m.nodes["two"]?.status).toBe("done"); // done beats in_progress
    expect(Object.keys(m.nodes).sort()).toEqual(["one", "three", "two"]);
  });
  it("is commutative, idempotent and associative enough to converge", () => {
    expect(sameProgress(mergeProgress(a, b), mergeProgress(b, a))).toBe(true);
    expect(sameProgress(mergeProgress(m, a), m)).toBe(true);
    expect(sameProgress(mergeProgress(m, m), m)).toBe(true);
  });
  it("never loses anything either side had", () => {
    for (const side of [a, b]) {
      for (const [k, d] of Object.entries(side.days))
        expect(m.days[k]!.xp).toBeGreaterThanOrEqual(d.xp);
      for (const [k, n] of Object.entries(side.nodes)) {
        expect(m.nodes[k]!.attempts).toBeGreaterThanOrEqual(n.attempts);
        expect(m.nodes[k]!.bestScore).toBeGreaterThanOrEqual(n.bestScore);
      }
    }
  });
  it("merging with empty returns equal progress", () => {
    expect(
      sameProgress(mergeProgress(a, { totalXp: 0, days: {}, nodes: {} }), { ...a, totalXp: 30 }),
    ).toBe(true);
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

describe("normalizeFreezes (after merging copies from two devices)", () => {
  it("a day with XP is never frozen: XP wins", () => {
    const merged = mergeProgress(
      {
        totalXp: 0,
        days: {
          "2026-03-10": { xp: 0, lessonsDone: 0, frozen: true },
          "2026-03-07": { xp: 5, lessonsDone: 1, freezeEarned: true },
        },
        nodes: {},
      },
      { totalXp: 30, days: { "2026-03-10": { xp: 30, lessonsDone: 2 } }, nodes: {} },
    );
    expect(merged.days["2026-03-10"]).toEqual({ xp: 30, lessonsDone: 2 });
    expect(merged.totalXp).toBe(35);
  });
  it("never leaves more frozen days than freezes earned (the latest are released first)", () => {
    const merged = mergeProgress(
      {
        totalXp: 5,
        days: {
          "2026-03-07": { xp: 5, lessonsDone: 1, freezeEarned: true },
          "2026-03-08": { xp: 0, lessonsDone: 0, frozen: true },
        },
        nodes: {},
      },
      { totalXp: 0, days: { "2026-03-09": { xp: 0, lessonsDone: 0, frozen: true } }, nodes: {} },
    );
    expect(freezesHeld(merged.days)).toBe(0);
    expect(Object.values(merged.days).filter((d) => d.frozen)).toHaveLength(1);
    expect(merged.days["2026-03-08"]?.frozen).toBe(true);
    expect(merged.days["2026-03-09"]).toBeUndefined(); // released, and empty, so not recorded
  });
  it("leaves consistent data untouched", () => {
    const days = {
      "2026-03-07": day(5, { freezeEarned: true }),
      "2026-03-08": day(0, { frozen: true }),
    };
    expect(normalizeFreezes(days)).toEqual(days);
  });
});
