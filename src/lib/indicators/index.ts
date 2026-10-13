import type { Bar } from "@/lib/market/types";

/**
 * Indicators. Pure functions. Every result lines up with the input (same length);
 * the warm-up part, where there is not enough history yet, is `null`. We never invent a number.
 */
export type Series = (number | null)[];

/** Simple moving average: the plain average of the last `n` values. */
export function sma(values: readonly number[], n: number): Series {
  assertPeriod(n);
  const out: Series = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i]!;
    if (i >= n) sum -= values[i - n]!;
    if (i >= n - 1) out[i] = sum / n;
  }
  return out;
}

/**
 * Exponential moving average. Starts at the SMA of the first `n` values (the usual way),
 * then each step moves `2 / (n + 1)` of the way toward the new value.
 */
export function ema(values: readonly number[], n: number): Series {
  assertPeriod(n);
  const out: Series = new Array(values.length).fill(null);
  if (values.length < n) return out;
  const k = 2 / (n + 1);
  let prev = 0;
  for (let i = 0; i < n; i++) prev += values[i]!;
  prev /= n;
  out[n - 1] = prev;
  for (let i = n; i < values.length; i++) {
    prev = values[i]! * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

/**
 * Relative Strength Index with Wilder's smoothing. 0–100. The first value needs `n` price changes.
 * If the price never fell, RSI is 100; if it never moved at all, 50.
 */
export function rsi(closes: readonly number[], n = 14): Series {
  assertPeriod(n);
  const out: Series = new Array(closes.length).fill(null);
  if (closes.length <= n) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= n; i++) {
    const d = closes[i]! - closes[i - 1]!;
    if (d >= 0) gain += d;
    else loss -= d;
  }
  gain /= n;
  loss /= n;
  out[n] = rsiFrom(gain, loss);
  for (let i = n + 1; i < closes.length; i++) {
    const d = closes[i]! - closes[i - 1]!;
    gain = (gain * (n - 1) + Math.max(d, 0)) / n;
    loss = (loss * (n - 1) + Math.max(-d, 0)) / n;
    out[i] = rsiFrom(gain, loss);
  }
  return out;
}

function rsiFrom(avgGain: number, avgLoss: number): number {
  if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

export interface Macd {
  /** Fast EMA minus slow EMA. */
  line: Series;
  /** EMA of the MACD line. */
  signal: Series;
  /** Line minus signal (the bars). */
  histogram: Series;
}

/** MACD (default 12, 26, 9). */
export function macd(closes: readonly number[], fast = 12, slow = 26, signalN = 9): Macd {
  if (fast >= slow) throw new Error("fast period must be shorter than slow period");
  const f = ema(closes, fast);
  const s = ema(closes, slow);
  const line: Series = closes.map((_, i) => (f[i] != null && s[i] != null ? f[i]! - s[i]! : null));
  const first = line.findIndex((v) => v != null);
  const signal: Series = new Array(closes.length).fill(null);
  if (first >= 0) {
    const tail = ema(line.slice(first) as number[], signalN);
    tail.forEach((v, i) => (signal[first + i] = v));
  }
  const histogram: Series = line.map((v, i) =>
    v != null && signal[i] != null ? v - signal[i]! : null,
  );
  return { line, signal, histogram };
}

/**
 * Volume-weighted average price. Typical price = (high + low + close) / 3, weighted by volume,
 * added up from the first bar of each day. It starts over every day, which is why it only makes sense on intraday charts.
 */
export function vwap(bars: readonly Bar[]): Series {
  const out: Series = [];
  let day = -1;
  let pv = 0;
  let vol = 0;
  for (const b of bars) {
    const d = Math.floor(b.time / 86_400);
    if (d !== day) {
      day = d;
      pv = 0;
      vol = 0;
    }
    const typical = (b.high + b.low + b.close) / 3;
    pv += typical * b.volume;
    vol += b.volume;
    out.push(vol > 0 ? pv / vol : typical);
  }
  return out;
}

export interface Bands {
  middle: Series;
  upper: Series;
  lower: Series;
}

/** Bollinger Bands: an n-bar SMA, with lines `k` standard deviations above and below (population deviation). */
export function bollinger(closes: readonly number[], n = 20, k = 2): Bands {
  const middle = sma(closes, n);
  const upper: Series = new Array(closes.length).fill(null);
  const lower: Series = new Array(closes.length).fill(null);
  for (let i = n - 1; i < closes.length; i++) {
    const m = middle[i]!;
    let sq = 0;
    for (let j = i - n + 1; j <= i; j++) sq += (closes[j]! - m) ** 2;
    const sd = Math.sqrt(sq / n);
    upper[i] = m + k * sd;
    lower[i] = m - k * sd;
  }
  return { middle, upper, lower };
}

function assertPeriod(n: number): void {
  if (!Number.isInteger(n) || n < 1) throw new Error("period must be a whole number of 1 or more");
}

/** The set of formulas the Financial Accuracy Checker audits (so a canary can swap in a broken one). */
export interface IndicatorSet {
  sma: typeof sma;
  ema: typeof ema;
  rsi: typeof rsi;
  macd: typeof macd;
  vwap: typeof vwap;
  bollinger: typeof bollinger;
}
export const indicators: IndicatorSet = { sma, ema, rsi, macd, vwap, bollinger };
