import type { Bar } from "@/lib/market/types";
import type { Bands, Macd, Series } from ".";

/**
 * Deliberately naive, independent versions of every indicator. They share no code with `index.ts`:
 * no running sums, no recursion tricks; each value is recomputed straight from its definition.
 * The Financial Accuracy Checker compares the real indicators with these.
 */
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export function refSma(values: readonly number[], n: number): Series {
  return values.map((_, i) => (i < n - 1 ? null : mean(values.slice(i - n + 1, i + 1))));
}

/** EMA from its textbook weights: EMA_t = Σ α(1−α)^j · x_{t−j}, applied to the part after the SMA seed. */
export function refEma(values: readonly number[], n: number): Series {
  const a = 2 / (n + 1);
  return values.map((_, t) => {
    if (t < n - 1) return null;
    const seed = mean(values.slice(0, n));
    let total = seed * (1 - a) ** (t - (n - 1));
    for (let j = 0; j < t - (n - 1); j++) total += a * (1 - a) ** j * values[t - j]!;
    return total;
  });
}

/** Wilder RSI by averaging all earlier changes with weights ((n-1)/n)^k, written out in full. */
export function refRsi(closes: readonly number[], n: number): Series {
  const change = closes.map((c, i) => (i === 0 ? 0 : c - closes[i - 1]!));
  return closes.map((_, t) => {
    if (t < n) return null;
    const avg = (pick: (d: number) => number) => {
      let v = mean(change.slice(1, n + 1).map(pick));
      for (let i = n + 1; i <= t; i++) v = (v * (n - 1) + pick(change[i]!)) / n;
      return v;
    };
    const g = avg((d) => (d > 0 ? d : 0));
    const l = avg((d) => (d < 0 ? -d : 0));
    if (l === 0) return g === 0 ? 50 : 100;
    return 100 - 100 / (1 + g / l);
  });
}

export function refMacd(closes: readonly number[], fast: number, slow: number, sig: number): Macd {
  const f = refEma(closes, fast);
  const s = refEma(closes, slow);
  const line = closes.map((_, i) => (f[i] != null && s[i] != null ? f[i]! - s[i]! : null));
  const start = line.findIndex((v) => v != null);
  const signal: Series = closes.map(() => null);
  const tail = refEma(line.slice(start) as number[], sig);
  tail.forEach((v, i) => (signal[start + i] = v));
  return {
    line,
    signal,
    histogram: line.map((v, i) => (v != null && signal[i] != null ? v - signal[i]! : null)),
  };
}

export function refVwap(bars: readonly Bar[]): Series {
  return bars.map((b, i) => {
    const same = bars
      .slice(0, i + 1)
      .filter((x) => Math.floor(x.time / 86_400) === Math.floor(b.time / 86_400));
    const vol = same.reduce((a, x) => a + x.volume, 0);
    const pv = same.reduce((a, x) => a + ((x.high + x.low + x.close) / 3) * x.volume, 0);
    return vol > 0 ? pv / vol : (b.high + b.low + b.close) / 3;
  });
}

export function refBollinger(closes: readonly number[], n: number, k: number): Bands {
  const middle = refSma(closes, n);
  const sd = (i: number) => {
    const w = closes.slice(i - n + 1, i + 1);
    const m = mean(w);
    return Math.sqrt(mean(w.map((x) => (x - m) ** 2)));
  };
  return {
    middle,
    upper: closes.map((_, i) => (i < n - 1 ? null : middle[i]! + k * sd(i))),
    lower: closes.map((_, i) => (i < n - 1 ? null : middle[i]! - k * sd(i))),
  };
}
