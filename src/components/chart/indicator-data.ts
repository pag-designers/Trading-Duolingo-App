import { bollinger, ema, macd, rsi, sma, vwap, type Series } from "@/lib/indicators";
import type { Bar, IndicatorId } from "@/lib/market/types";

export const PERIODS = { sma: 20, ema: 20, rsi: 14, bands: 20 } as const;

/** Everything the chart draws for a set of bars, computed once per set of bars. */
export interface IndicatorData {
  sma: Series;
  ema: Series;
  vwap: Series;
  rsi: Series;
  macd: ReturnType<typeof macd>;
  bands: ReturnType<typeof bollinger>;
}

/**
 * Compute the indicators over `lead` + `window` (so they are warmed up when the window starts),
 * then return only the part that lines up with `window`.
 */
export function computeIndicators(
  lead: readonly Bar[],
  window: readonly Bar[],
  want: readonly IndicatorId[],
): IndicatorData {
  const all = computeAll([...lead, ...window], want);
  const cut = (s: Series): Series => s.slice(lead.length);
  return {
    sma: cut(all.sma),
    ema: cut(all.ema),
    vwap: cut(all.vwap),
    rsi: cut(all.rsi),
    macd: {
      line: cut(all.macd.line),
      signal: cut(all.macd.signal),
      histogram: cut(all.macd.histogram),
    },
    bands: {
      middle: cut(all.bands.middle),
      upper: cut(all.bands.upper),
      lower: cut(all.bands.lower),
    },
  };
}

function computeAll(bars: readonly Bar[], want: readonly IndicatorId[]): IndicatorData {
  const closes = bars.map((b) => b.close);
  const none: Series = bars.map(() => null);
  const nobands = { middle: none, upper: none, lower: none };
  return {
    sma: want.includes("sma") ? sma(closes, PERIODS.sma) : none,
    ema: want.includes("ema") ? ema(closes, PERIODS.ema) : none,
    vwap: want.includes("vwap") ? vwap(bars) : none,
    rsi: want.includes("rsi") ? rsi(closes, PERIODS.rsi) : none,
    macd: want.includes("macd") ? macd(closes) : { line: none, signal: none, histogram: none },
    bands: want.includes("bands") ? bollinger(closes, PERIODS.bands, 2) : nobands,
  };
}

/** VWAP restarts every day, so it only makes sense when a chart has several bars per day. */
export function vwapAllowed(bars: readonly Bar[]): boolean {
  const days = new Set(bars.map((b) => Math.floor(b.time / 86_400)));
  return bars.length > days.size;
}
