import type { Bar, Timeframe } from "./types";

const DAY = 86_400;
/** The made-up session opens at 9:30 (chart clock time) and has 390 one-minute bars. */
export const SESSION_OPEN = 9 * 3600 + 30 * 60;
export const SESSION_MINUTES = 390;

const MINUTES: Partial<Record<Timeframe, number>> = { "1m": 1, "5m": 5, "15m": 15, "1h": 60 };

/** Combine consecutive bars that share a bucket key into one bar (open of the first, close of the last). */
function collapse(bars: Bar[], key: (b: Bar) => number, time: (b: Bar) => number): Bar[] {
  const out: Bar[] = [];
  let k: number | null = null;
  for (const b of bars) {
    const bk = key(b);
    const last = out[out.length - 1];
    if (last && k === bk) {
      last.high = Math.max(last.high, b.high);
      last.low = Math.min(last.low, b.low);
      last.close = b.close;
      last.volume += b.volume;
    } else {
      out.push({ ...b, time: time(b) });
      k = bk;
    }
  }
  return out;
}

/** 1-minute session bars → 5m / 15m / 1h bars, counted from the session open (so 1h = 9:30, 10:30 …). */
export function aggregateMinutes(bars: Bar[], minutes: number): Bar[] {
  const size = minutes * 60;
  const slot = (b: Bar) => {
    const day = Math.floor(b.time / DAY) * DAY;
    return day + SESSION_OPEN + Math.floor((b.time - day - SESSION_OPEN) / size) * size;
  };
  return collapse(bars, slot, slot);
}

/** Intraday bars → one bar per day. */
export function aggregateDays(bars: Bar[]): Bar[] {
  const day = (b: Bar) => Math.floor(b.time / DAY) * DAY;
  return collapse(bars, day, day);
}

/** Daily bars → one bar per week (weeks start on Monday). 1970-01-01 was a Thursday. */
export function aggregateWeeks(bars: Bar[]): Bar[] {
  const monday = (b: Bar) => {
    const days = Math.floor(b.time / DAY);
    return (days - ((days + 3) % 7)) * DAY;
  };
  return collapse(bars, monday, monday);
}

export function aggregateTo(bars: Bar[], from: Timeframe, to: Timeframe): Bar[] {
  if (from === to) return bars;
  const m = MINUTES[to];
  if (m && from === "1m") return aggregateMinutes(bars, m);
  if (to === "D") return aggregateDays(bars);
  if (to === "W" && from === "D") return aggregateWeeks(bars);
  throw new Error(`cannot build ${to} bars from ${from} bars`);
}
