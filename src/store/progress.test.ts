// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { checkProgress } from "@/lib/integrity";
import { EMPTY_PROGRESS } from "@/lib/progress";
import { useProgress } from "./progress";

beforeEach(() => useProgress.setState({ ...EMPTY_PROGRESS }));

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
    const { totalXp, days, nodes } = useProgress.getState();
    expect(checkProgress({ totalXp, days, nodes })).toEqual([]);
  });
});

describe("progress store: finishing steps", () => {
  it("finishNode records the step, adds XP and counts the lesson once", () => {
    const { finishNode } = useProgress.getState();
    finishNode({
      nodeId: "u1-money",
      score: 80,
      xp: 20,
      today: "2026-03-10",
      now: "2026-03-10T10:00:00.000Z",
    });
    finishNode({
      nodeId: "u1-money",
      score: 100,
      xp: 5,
      today: "2026-03-10",
      now: "2026-03-10T11:00:00.000Z",
    });
    const s = useProgress.getState();
    expect(s.totalXp).toBe(25);
    expect(s.nodes["u1-money"]).toMatchObject({
      status: "done",
      bestScore: 100,
      attempts: 2,
      completedAt: "2026-03-10T10:00:00.000Z",
    });
    expect(s.days["2026-03-10"]).toMatchObject({ xp: 25, lessonsDone: 1 });
  });

  it("mergeFrom is lossless in both directions", () => {
    useProgress.getState().finishNode({ nodeId: "a", score: 90, xp: 10, today: "2026-03-09" });
    const server = {
      totalXp: 7,
      days: { "2026-03-08": { xp: 7, lessonsDone: 1 } },
      nodes: {
        b: {
          status: "done" as const,
          bestScore: 50,
          attempts: 1,
          completedAt: "2026-03-08T00:00:00.000Z",
        },
      },
    };
    useProgress.getState().mergeFrom(server);
    const s = useProgress.getState();
    expect(Object.keys(s.nodes).sort()).toEqual(["a", "b"]);
    expect(s.totalXp).toBe(17);
  });

  it("settle spends a freeze to bridge one missed day", () => {
    useProgress.setState({
      totalXp: 10,
      days: { "2026-03-08": { xp: 10, lessonsDone: 1, freezeEarned: true } },
      nodes: {},
    });
    useProgress.getState().settle("2026-03-10");
    expect(useProgress.getState().days["2026-03-09"]).toMatchObject({ frozen: true, xp: 0 });
  });
});
