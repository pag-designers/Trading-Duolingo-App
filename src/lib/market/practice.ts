import { SESSION_MINUTES, SESSION_OPEN } from "./aggregate";
import { gaussian, mulberry32 } from "./rng";
import type { Bar } from "./types";

/** Ten made-up sessions starting on a Monday in 2030, so nobody mistakes them for real history. */
export const PRACTICE_START = Date.UTC(2030, 0, 7) / 1000;
export const PRACTICE_SESSIONS = 10;

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * One made-up trading session of 1-minute bars. A seeded random walk with slow "moods"
 * (drift up, drift down, sideways), a lunchtime lull, and a busy open and close.
 * It is deterministic: the same seed always draws the same day.
 */
export function practiceSession(dayStart: number, seed: number, openPrice: number): Bar[] {
  const rand = mulberry32(seed);
  const bars: Bar[] = [];
  let price = openPrice;
  let drift = 0;
  for (let i = 0; i < SESSION_MINUTES; i++) {
    if (i % 65 === 0) drift = (rand() - 0.5) * 0.0016; // a new mood every ~hour
    const u = i / (SESSION_MINUTES - 1);
    const busy = 1 + 1.6 * Math.exp(-u * 12) + 1.2 * Math.exp(-(1 - u) * 14); // busy open and close
    const lull = 1 - 0.45 * Math.exp(-(((u - 0.5) / 0.12) ** 2)); // quiet lunchtime
    const vol = 0.0011 * lull * Math.sqrt(busy);
    const open = price;
    const close = Math.max(1, open * (1 + drift + vol * gaussian(rand)));
    const wick = Math.abs(vol * open) * (0.3 + rand());
    const high = Math.max(open, close) + wick * rand();
    const low = Math.max(0.5, Math.min(open, close) - wick * rand());
    const volume = Math.round(9000 * lull * busy * (0.6 + rand() * 0.9));
    bars.push({
      time: dayStart + SESSION_OPEN + i * 60,
      open: round2(open),
      high: round2(Math.max(high, round2(open), round2(close))),
      low: round2(Math.min(low, round2(open), round2(close))),
      close: round2(close),
      volume,
    });
    price = close;
  }
  return bars;
}

let cache: Bar[] | null = null;

/** All ten practice sessions as 1-minute bars (weekends skipped). Cached after the first call. */
export function practiceMinuteBars(): Bar[] {
  if (cache) return cache;
  const all: Bar[] = [];
  let price = 50;
  for (let n = 0, day = 0; n < PRACTICE_SESSIONS; day++) {
    const start = PRACTICE_START + day * 86_400;
    const dow = new Date(start * 1000).getUTCDay();
    if (dow === 0 || dow === 6) continue;
    const session = practiceSession(start, 1000 + n * 7919, price);
    all.push(...session);
    price = session[session.length - 1]!.close * (1 + (n % 2 ? -0.004 : 0.006)); // small overnight gap
    n++;
  }
  cache = all;
  return all;
}
