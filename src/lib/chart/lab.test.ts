import { describe, expect, it } from "vitest";
import type { LabQuestion } from "@/lib/content/lesson-schema";
import { windowBars } from "@/lib/market/data";
import { barForRule, gradeLab, isLabComplete, labProblems, lineAt, solutionFor } from "./lab";

const window = { dataset: "aapl-daily", tf: "D", start: 100, count: 30 } as const;
const base = {
  id: "q",
  prompt: "Do it.",
  explanation: "Because.",
  type: "lab",
  window,
  start: [],
} as const;
const q = (task: LabQuestion["task"], extra: Partial<LabQuestion> = {}) =>
  ({ ...base, task, ...extra }) as LabQuestion;
const bars = windowBars(window);

describe("Chart Lab grading", () => {
  it("find-bar: the highest high is found from the data", () => {
    const i = barForRule(bars, "highest-high");
    const task = q({ kind: "find-bar", rule: "highest-high" });
    expect(gradeLab(task, { kind: "find-bar", bar: i })).toBe(true);
    expect(gradeLab(task, { kind: "find-bar", bar: i === 0 ? 1 : 0 })).toBe(false);
    expect(bars[i]!.high).toBe(Math.max(...bars.map((b) => b.high)));
  });

  it("hline: close enough passes, far away fails", () => {
    const task = q({ kind: "hline", level: "lowest-low", tol: 0.05, tolBars: 1 });
    const low = Math.min(...bars.map((b) => b.low));
    const range = Math.max(...bars.map((b) => b.high)) - low;
    expect(gradeLab(task, { kind: "hline", price: low + range * 0.04 })).toBe(true);
    expect(gradeLab(task, { kind: "hline", price: low + range * 0.2 })).toBe(false);
  });

  it("trendline: must touch both candles' lows, wherever the two points sit on the line", () => {
    const task = q({ kind: "trendline", touch: "lows", bars: [3, 20], tol: 0.04, tolBars: 1 });
    const sol = solutionFor(task);
    expect(gradeLab(task, sol)).toBe(true);
    // Same line, but drawn from two other points further along it.
    if (sol.kind !== "trendline") throw new Error("kind");
    const p = (i: number) => ({ i, price: lineAt(sol.a, sol.b, i) });
    expect(gradeLab(task, { kind: "trendline", a: p(0), b: p(29) })).toBe(true);
    // Two points on the same candle make no line.
    expect(gradeLab(task, { kind: "trendline", a: sol.a, b: sol.a })).toBe(false);
  });

  it("box: must cover the run and not be wildly bigger", () => {
    const task = q({ kind: "box", bars: [5, 12], tol: 0.05, tolBars: 1 });
    const sol = solutionFor(task);
    expect(gradeLab(task, sol)).toBe(true);
    if (sol.kind !== "box") throw new Error("kind");
    expect(
      gradeLab(task, {
        kind: "box",
        a: { i: 5, price: sol.a.price },
        b: { i: 8, price: sol.b.price },
      }),
    ).toBe(false);
    expect(gradeLab(task, { kind: "box", a: { i: 0, price: 0 }, b: { i: 29, price: 1000 } })).toBe(
      false,
    );
  });

  it("fib: low then high", () => {
    const hi = barForRule(bars, "highest-high");
    const lo = barForRule(bars.slice(0, hi), "lowest-low");
    const task = q({ kind: "fib", low: lo, high: hi, tol: 0.05, tolBars: 1 });
    expect(labProblems(task)).toEqual([]);
    const sol = solutionFor(task);
    expect(gradeLab(task, sol)).toBe(true);
    if (sol.kind !== "fib") throw new Error("kind");
    expect(gradeLab(task, { kind: "fib", a: sol.b, b: sol.a })).toBe(false); // drawn backwards
  });

  it("note needs text and the right candle", () => {
    const task = q({ kind: "note", bar: 10, tol: 0.05, tolBars: 1 });
    expect(gradeLab(task, { kind: "note", at: { i: 10.2, price: 1 }, text: "high" })).toBe(true);
    expect(gradeLab(task, { kind: "note", at: { i: 10, price: 1 }, text: "  " })).toBe(false);
    expect(gradeLab(task, { kind: "note", at: { i: 15, price: 1 }, text: "x" })).toBe(false);
    expect(isLabComplete(task.task, { kind: "note", at: { i: 1, price: 1 }, text: "" })).toBe(
      false,
    );
  });

  it("measure: from one close to another", () => {
    const task = q({ kind: "measure", from: 2, to: 9, tol: 0.05, tolBars: 1 });
    expect(gradeLab(task, solutionFor(task))).toBe(true);
    expect(
      gradeLab(task, {
        kind: "measure",
        a: { i: 9, price: bars[9]!.close },
        b: { i: 2, price: bars[2]!.close },
      }),
    ).toBe(false);
  });

  it("timeframe and indicators compare exact choices (order does not matter)", () => {
    const tf = q({ kind: "timeframe", tf: "W" }, { timeframes: ["D", "W"] });
    expect(gradeLab(tf, { kind: "timeframe", tf: "W" })).toBe(true);
    expect(gradeLab(tf, { kind: "timeframe", tf: "D" })).toBe(false);
    const ind = q({ kind: "indicators", want: ["rsi", "volume"] });
    expect(gradeLab(ind, { kind: "indicators", on: ["volume", "rsi"] })).toBe(true);
    expect(gradeLab(ind, { kind: "indicators", on: ["volume"] })).toBe(false);
    expect(gradeLab(ind, { kind: "indicators", on: ["volume", "rsi", "sma"] })).toBe(false);
  });

  it("an answer of the wrong kind is simply wrong", () => {
    expect(
      gradeLab(q({ kind: "hline", level: "last-close", tol: 0.05, tolBars: 1 }), {
        kind: "find-bar",
        bar: 0,
      }),
    ).toBe(false);
  });

  it("labProblems catches questions that cannot be solved or are already solved", () => {
    expect(labProblems(q({ kind: "box", bars: [5, 40], tol: 0.05, tolBars: 1 })).join()).toMatch(
      /outside/,
    );
    expect(labProblems(q({ kind: "box", bars: [12, 5], tol: 0.05, tolBars: 1 })).join()).toMatch(
      /order/,
    );
    expect(labProblems(q({ kind: "indicators", want: [] }, { start: [] })).join()).toMatch(
      /already/,
    );
    expect(labProblems(q({ kind: "timeframe", tf: "W" }, { timeframes: ["D"] })).join()).toMatch(
      /not offered/,
    );
    expect(labProblems(q({ kind: "find-bar", rule: "widest-range" }))).toEqual([]);
  });
});
