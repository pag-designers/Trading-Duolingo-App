import aapl from "@/data/market/aapl-daily.json" with { type: "json" };
import { aggregateTo } from "./aggregate";
import { practiceMinuteBars } from "./practice";
import { DATASET_TIMEFRAMES, type Bar, type DatasetId, type Timeframe, type Window } from "./types";

let aaplBars: Bar[] | null = null;
const memo = new Map<string, Bar[]>();

/** Real Apple daily bars (2015–2017). Rows are [time, open, high, low, close, volume]. */
export function aaplDaily(): Bar[] {
  aaplBars ??= (aapl.bars as number[][]).map(([time, open, high, low, close, volume]) => ({
    time: time!,
    open: open!,
    high: high!,
    low: low!,
    close: close!,
    volume: volume!,
  }));
  return aaplBars;
}

export function canShow(dataset: DatasetId, tf: Timeframe): boolean {
  return DATASET_TIMEFRAMES[dataset].includes(tf);
}

/** Every bar of a dataset at one timeframe. */
export function seriesFor(dataset: DatasetId, tf: Timeframe): Bar[] {
  if (!canShow(dataset, tf)) throw new Error(`${dataset} has no ${tf} bars`);
  const key = `${dataset}:${tf}`;
  const hit = memo.get(key);
  if (hit) return hit;
  const bars =
    dataset === "aapl-daily"
      ? aggregateTo(aaplDaily(), "D", tf)
      : aggregateTo(practiceMinuteBars(), "1m", tf);
  memo.set(key, bars);
  return bars;
}

/** The bars a lesson window names, at its own timeframe. */
export function windowBars(w: Window): Bar[] {
  return seriesFor(w.dataset, w.tf).slice(w.start, w.start + w.count);
}

/**
 * The same stretch of time at another timeframe (for the "switch timeframe" exercise).
 * The span runs from the window's first bar to the end of its last bar.
 */
export function windowBarsAt(w: Window, tf: Timeframe): Bar[] {
  if (tf === w.tf) return windowBars(w);
  const base = windowBars(w);
  if (base.length === 0 || !canShow(w.dataset, tf)) return base;
  const from = base[0]!.time;
  const last = seriesFor(w.dataset, w.tf);
  const nextIdx = w.start + w.count;
  const to = last[nextIdx]?.time ?? Number.POSITIVE_INFINITY;
  return seriesFor(w.dataset, tf).filter((b) => b.time >= from && b.time < to);
}

/** How much earlier history indicators may look at to warm up. Charts draw indicators from before the window, like TradingView does. */
export const LEAD_BARS = 200;

/** Bars just before a window (at timeframe `tf`), used only to warm up indicators; they are not drawn. */
export function windowLead(w: Window, tf: Timeframe = w.tf): Bar[] {
  if (!canShow(w.dataset, tf)) return [];
  if (tf === w.tf) return seriesFor(w.dataset, tf).slice(Math.max(0, w.start - LEAD_BARS), w.start);
  const first = windowBars(w)[0];
  if (!first) return [];
  return seriesFor(w.dataset, tf)
    .filter((b) => b.time < first.time)
    .slice(-LEAD_BARS);
}
