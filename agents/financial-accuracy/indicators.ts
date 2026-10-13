import { readJson } from "../lib";
import { indicators as real, type IndicatorSet, type Series } from "../../src/lib/indicators";
import {
  refBollinger,
  refEma,
  refMacd,
  refRsi,
  refSma,
  refVwap,
} from "../../src/lib/indicators/reference";
import { aaplDaily } from "../../src/lib/market/data";
import { practiceMinuteBars } from "../../src/lib/market/practice";
import type { Bar } from "../../src/lib/market/types";

const TOL = 1e-8;

interface Golden {
  closes: number[];
  sma: Record<string, Series>;
  ema: Record<string, Series>;
  rsi: Record<string, Series>;
  macd: { line: Series; signal: Series; histogram: Series };
  bollinger: { middle: Series; upper: Series; lower: Series };
  intraday: Bar[];
  vwap: Series;
}

/** Where two series differ (a null where a number is expected, or a gap above the tolerance). Empty string = they agree. */
export function diff(name: string, got: Series, want: Series, tol = TOL): string {
  if (got.length !== want.length) return `${name}: length ${got.length}, expected ${want.length}`;
  for (let i = 0; i < want.length; i++) {
    const g = got[i];
    const w = want[i];
    if ((g == null) !== (w == null)) return `${name}[${i}]: got ${g}, expected ${w}`;
    if (g != null && w != null && !(Math.abs(g - w) <= tol * Math.max(1, Math.abs(w))))
      return `${name}[${i}]: got ${g}, expected ${w}`;
  }
  return "";
}

/** Compare `impl` with the pandas golden values. Returns the problems found. */
export function checkAgainstGolden(impl: IndicatorSet, g: Golden): string[] {
  const c = g.closes;
  const m = impl.macd(c, 12, 26, 9);
  const b = impl.bollinger(c, 20, 2);
  const problems = [
    diff("sma5", impl.sma(c, 5), g.sma["5"]!),
    diff("sma20", impl.sma(c, 20), g.sma["20"]!),
    diff("ema12", impl.ema(c, 12), g.ema["12"]!),
    diff("ema26", impl.ema(c, 26), g.ema["26"]!),
    diff("rsi14", impl.rsi(c, 14), g.rsi["14"]!),
    diff("rsi5", impl.rsi(c, 5), g.rsi["5"]!),
    diff("macd.line", m.line, g.macd.line),
    diff("macd.signal", m.signal, g.macd.signal),
    diff("macd.histogram", m.histogram, g.macd.histogram),
    diff("bands.middle", b.middle, g.bollinger.middle),
    diff("bands.upper", b.upper, g.bollinger.upper),
    diff("bands.lower", b.lower, g.bollinger.lower),
    diff("vwap", impl.vwap(g.intraday), g.vwap),
  ];
  return problems.filter(Boolean);
}

/** Compare `impl` with the naive reference versions on real and made-up bars, and check facts that must always hold. */
export function checkAgainstReference(impl: IndicatorSet): string[] {
  const sets: [string, Bar[]][] = [
    ["Apple daily", aaplDaily().slice(0, 300)],
    ["practice minutes", practiceMinuteBars().slice(0, 500)],
  ];
  const problems: string[] = [];
  for (const [label, bars] of sets) {
    const c = bars.map((x) => x.close);
    for (const n of [2, 5, 14, 20, 50]) {
      problems.push(diff(`${label} sma${n}`, impl.sma(c, n), refSma(c, n)));
      problems.push(diff(`${label} ema${n}`, impl.ema(c, n), refEma(c, n), 1e-7));
    }
    for (const n of [5, 14])
      problems.push(diff(`${label} rsi${n}`, impl.rsi(c, n), refRsi(c, n), 1e-7));
    const m = impl.macd(c, 12, 26, 9);
    const rm = refMacd(c, 12, 26, 9);
    problems.push(diff(`${label} macd.line`, m.line, rm.line, 1e-7));
    problems.push(diff(`${label} macd.signal`, m.signal, rm.signal, 1e-7));
    problems.push(diff(`${label} macd.histogram`, m.histogram, rm.histogram, 1e-7));
    const bb = impl.bollinger(c, 20, 2);
    const rb = refBollinger(c, 20, 2);
    problems.push(diff(`${label} bands.upper`, bb.upper, rb.upper, 1e-7));
    problems.push(diff(`${label} bands.lower`, bb.lower, rb.lower, 1e-7));
    problems.push(diff(`${label} vwap`, impl.vwap(bars), refVwap(bars), 1e-7));

    // Facts that must always be true.
    impl.rsi(c, 14).forEach((v, i) => {
      if (v != null && (v < 0 || v > 100))
        problems.push(`${label} rsi14[${i}] = ${v} is outside 0–100`);
    });
    bb.upper.forEach((u, i) => {
      if (u != null && !(u >= bb.middle[i]! && bb.middle[i]! >= bb.lower[i]!))
        problems.push(`${label} bands[${i}] are not in order`);
    });
    impl.vwap(bars).forEach((v, i) => {
      const day = Math.floor(bars[i]!.time / 86_400);
      const same = bars.filter((x, j) => j <= i && Math.floor(x.time / 86_400) === day);
      const lo = Math.min(...same.map((x) => x.low));
      const hi = Math.max(...same.map((x) => x.high));
      if (v != null && (v < lo - 1e-9 || v > hi + 1e-9))
        problems.push(`${label} vwap[${i}] left the day's range`);
    });
  }
  // Hand-worked examples anyone can check on paper.
  const hand = [
    diff("hand sma", impl.sma([1, 2, 3, 4, 5], 3), [null, null, 2, 3, 4]),
    diff("hand ema", impl.ema([2, 4, 6, 8], 2), [null, 3, 5, 7]),
    diff("hand rsi up", impl.rsi([1, 2, 3, 4, 5, 6], 3), [null, null, null, 100, 100, 100]),
    diff("hand rsi flat", impl.rsi([5, 5, 5, 5, 5], 3), [null, null, null, 50, 50]),
  ];
  return [...problems, ...hand].filter(Boolean);
}

/** The data the charts draw must be honest too: valid bars, in order. */
export function checkMarketData(): string[] {
  const problems: string[] = [];
  const sets: [string, Bar[]][] = [
    ["Apple daily", aaplDaily()],
    ["practice", practiceMinuteBars()],
  ];
  for (const [label, bars] of sets) {
    bars.forEach((b, i) => {
      if (!(b.low <= Math.min(b.open, b.close) && b.high >= Math.max(b.open, b.close) && b.low > 0))
        problems.push(`${label}[${i}] is not a valid candle`);
      if (i > 0 && b.time <= bars[i - 1]!.time)
        problems.push(`${label}[${i}] is out of time order`);
    });
  }
  return problems.slice(0, 5);
}

export function loadGolden(root: string): Golden | undefined {
  return readJson(root, "agents/fixtures/indicators-golden.json") as Golden | undefined;
}
export { real };
