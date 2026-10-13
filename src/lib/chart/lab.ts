import type { BarRule, LabQuestion, LabTask, LevelRule } from "@/lib/content/lesson-schema";
import { windowBars } from "@/lib/market/data";
import type { Bar, IndicatorId, Timeframe } from "@/lib/market/types";

/** A spot on the chart: a (possibly between-candles) bar index and a price. */
export interface Pt {
  i: number;
  price: number;
}

/** What the learner did in a Chart Lab question (one shape per task kind). */
export type LabAnswer =
  | { kind: "find-bar"; bar: number }
  | { kind: "hline"; price: number }
  | { kind: "trendline" | "box" | "fib" | "measure"; a: Pt; b: Pt }
  | { kind: "note"; at: Pt; text: string }
  | { kind: "timeframe"; tf: Timeframe }
  | { kind: "indicators"; on: IndicatorId[] };

export function barForRule(bars: readonly Bar[], rule: BarRule): number {
  const score = (b: Bar): number => {
    switch (rule) {
      case "highest-high":
        return b.high;
      case "lowest-low":
        return -b.low;
      case "highest-close":
        return b.close;
      case "lowest-close":
        return -b.close;
      case "highest-volume":
        return b.volume;
      case "widest-range":
        return b.high - b.low;
    }
  };
  let best = 0;
  bars.forEach((b, i) => {
    if (score(b) > score(bars[best]!)) best = i;
  });
  return best;
}

export function levelForRule(bars: readonly Bar[], rule: LevelRule): number {
  switch (rule) {
    case "lowest-low":
      return Math.min(...bars.map((b) => b.low));
    case "highest-high":
      return Math.max(...bars.map((b) => b.high));
    case "last-close":
      return bars[bars.length - 1]!.close;
    case "first-open":
      return bars[0]!.open;
  }
}

/** Price span of the bars on screen: the unit that "close enough" is measured in. */
export function priceRange(bars: readonly Bar[]): number {
  return Math.max(...bars.map((b) => b.high)) - Math.min(...bars.map((b) => b.low));
}

const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;
const sameSet = <T>(a: readonly T[], b: readonly T[]) =>
  a.length === b.length && a.every((x) => b.includes(x));

/** Where a line through two points sits at bar `i`. */
export function lineAt(a: Pt, b: Pt, i: number): number {
  if (a.i === b.i) return a.price;
  return a.price + ((b.price - a.price) * (i - a.i)) / (b.i - a.i);
}

/** Has the learner given enough to press Check? (Never blocks anything else.) */
export function isLabComplete(task: LabTask, a: LabAnswer | null): boolean {
  if (!a || a.kind !== task.kind) return false;
  if (a.kind === "note") return a.text.trim().length > 0;
  return true;
}

/** Grade a lab answer against the data. Pure. */
export function gradeLab(
  q: LabQuestion,
  a: LabAnswer,
  bars: readonly Bar[] = windowBars(q.window),
): boolean {
  const t = q.task;
  if (a.kind !== t.kind) return false;
  const range = priceRange(bars);
  switch (t.kind) {
    case "find-bar":
      return a.kind === "find-bar" && a.bar === barForRule(bars, t.rule);
    case "hline":
      return a.kind === "hline" && near(a.price, levelForRule(bars, t.level), t.tol * range);
    case "trendline": {
      if (a.kind !== "trendline") return false;
      const value = (i: number) => (t.touch === "lows" ? bars[i]!.low : bars[i]!.high);
      return (
        t.bars.every((i) => near(lineAt(a.a, a.b, i), value(i), t.tol * range)) && a.a.i !== a.b.i
      );
    }
    case "box": {
      if (a.kind !== "box") return false;
      const [i0, i1] = t.bars;
      const run = bars.slice(i0, i1 + 1);
      const lo = Math.min(...run.map((b) => b.low));
      const hi = Math.max(...run.map((b) => b.high));
      const left = Math.min(a.a.i, a.b.i);
      const right = Math.max(a.a.i, a.b.i);
      const bottom = Math.min(a.a.price, a.b.price);
      const top = Math.max(a.a.price, a.b.price);
      const slack = t.tol * range;
      return (
        left <= i0 + t.tolBars &&
        right >= i1 - t.tolBars &&
        left >= i0 - t.tolBars - 2 &&
        right <= i1 + t.tolBars + 2 &&
        bottom <= lo + slack &&
        top >= hi - slack &&
        bottom >= lo - 3 * slack &&
        top <= hi + 3 * slack
      );
    }
    case "fib": {
      if (a.kind !== "fib") return false;
      const lo = bars[t.low]!.low;
      const hi = bars[t.high]!.high;
      const ok = (p: Pt, i: number, price: number) =>
        near(p.i, i, t.tolBars + 0.5) && near(p.price, price, t.tol * range);
      return ok(a.a, t.low, lo) && ok(a.b, t.high, hi);
    }
    case "note":
      return a.kind === "note" && a.text.trim().length > 0 && near(a.at.i, t.bar, t.tolBars + 0.5);
    case "measure": {
      if (a.kind !== "measure") return false;
      const ok = (p: Pt, i: number) =>
        near(p.i, i, t.tolBars + 0.5) && near(p.price, bars[i]!.close, t.tol * range);
      return ok(a.a, t.from) && ok(a.b, t.to);
    }
    case "timeframe":
      return a.kind === "timeframe" && a.tf === t.tf;
    case "indicators":
      return a.kind === "indicators" && sameSet(a.on, t.want);
  }
}

/** The answer that is exactly right, built from the data. Used to show the solution and by tests. */
export function solutionFor(
  q: LabQuestion,
  bars: readonly Bar[] = windowBars(q.window),
): LabAnswer {
  const t = q.task;
  switch (t.kind) {
    case "find-bar":
      return { kind: "find-bar", bar: barForRule(bars, t.rule) };
    case "hline":
      return { kind: "hline", price: levelForRule(bars, t.level) };
    case "trendline": {
      const [i0, i1] = t.bars;
      const v = (i: number) => (t.touch === "lows" ? bars[i]!.low : bars[i]!.high);
      return { kind: "trendline", a: { i: i0, price: v(i0) }, b: { i: i1, price: v(i1) } };
    }
    case "box": {
      const [i0, i1] = t.bars;
      const run = bars.slice(i0, i1 + 1);
      return {
        kind: "box",
        a: { i: i0, price: Math.min(...run.map((b) => b.low)) },
        b: { i: i1, price: Math.max(...run.map((b) => b.high)) },
      };
    }
    case "fib":
      return {
        kind: "fib",
        a: { i: t.low, price: bars[t.low]!.low },
        b: { i: t.high, price: bars[t.high]!.high },
      };
    case "note":
      return { kind: "note", at: { i: t.bar, price: bars[t.bar]!.high }, text: "here" };
    case "measure":
      return {
        kind: "measure",
        a: { i: t.from, price: bars[t.from]!.close },
        b: { i: t.to, price: bars[t.to]!.close },
      };
    case "timeframe":
      return { kind: "timeframe", tf: t.tf };
    case "indicators":
      return { kind: "indicators", on: [...t.want] };
  }
}

/** Check a lab question's numbers make sense for its data. Returns problems (empty = fine). */
export function labProblems(q: LabQuestion): string[] {
  const problems: string[] = [];
  let bars: Bar[];
  try {
    bars = windowBars(q.window);
  } catch (e) {
    return [(e as Error).message];
  }
  if (bars.length < q.window.count)
    problems.push(`window asks for ${q.window.count} bars but only ${bars.length} exist`);
  const t = q.task;
  const idx: number[] =
    t.kind === "trendline" || t.kind === "box"
      ? [...t.bars]
      : t.kind === "fib"
        ? [t.low, t.high]
        : t.kind === "note"
          ? [t.bar]
          : t.kind === "measure"
            ? [t.from, t.to]
            : [];
  for (const i of idx)
    if (i >= bars.length) problems.push(`bar ${i} is outside the ${bars.length}-bar window`);
  if ((t.kind === "trendline" || t.kind === "box") && t.bars[0] >= t.bars[1])
    problems.push("bars must be in order");
  if (
    t.kind === "fib" &&
    !(t.low < t.high && bars[t.low] && bars[t.high] && bars[t.low]!.low < bars[t.high]!.high)
  )
    problems.push("a Fibonacci task needs the low before the high");
  if (t.kind === "timeframe" && !(q.timeframes ?? []).includes(t.tf))
    problems.push("the target timeframe is not offered");
  if (t.kind === "timeframe" && q.timeframes && q.timeframes.includes(q.window.tf) === false)
    problems.push("the starting timeframe must be one of the offered timeframes");
  const needsIntraday = (ids: readonly string[]) => ids.includes("vwap");
  const days = new Set(bars.map((b) => Math.floor(b.time / 86_400)));
  if (days.size === bars.length && bars.length > 1) {
    if (t.kind === "indicators" && needsIntraday(t.want))
      problems.push("VWAP is only for charts with several candles each day");
    if (needsIntraday(q.start) || needsIntraday(q.offer ?? []))
      problems.push("VWAP is only for charts with several candles each day");
  }
  if (problems.length === 0) {
    const sol = solutionFor(q, bars);
    if (!gradeLab(q, sol, bars)) problems.push("the exact solution does not grade as correct");
    // The starting state must not already be the answer.
    if (t.kind === "indicators" && sameSet(q.start, t.want))
      problems.push("the chart already shows the answer");
    if (t.kind === "timeframe" && q.window.tf === t.tf)
      problems.push("the chart already shows the answer");
  }
  return problems;
}

/** One plain line that says what the right answer was (shown after a miss). */
export function labAnswerText(q: LabQuestion): string {
  const t = q.task;
  const bars = windowBars(q.window);
  const money = (n: number) => `$${n.toFixed(2)}`;
  switch (t.kind) {
    case "find-bar":
      return `Candle ${barForRule(bars, t.rule) + 1}`;
    case "hline":
      return `A flat line at about ${money(levelForRule(bars, t.level))}`;
    case "trendline":
      return `A line through the ${t.touch === "lows" ? "lows" : "highs"} of candles ${t.bars[0] + 1} and ${t.bars[1] + 1}`;
    case "box":
      return `A box around candles ${t.bars[0] + 1} to ${t.bars[1] + 1}`;
    case "fib":
      return `From the low of candle ${t.low + 1} to the high of candle ${t.high + 1}`;
    case "note":
      return `A note on candle ${t.bar + 1}`;
    case "measure":
      return `From the close of candle ${t.from + 1} to the close of candle ${t.to + 1}`;
    case "timeframe":
      return `The ${t.tf} chart`;
    case "indicators":
      return t.want.length ? t.want.join(", ") : "Everything off";
  }
}
