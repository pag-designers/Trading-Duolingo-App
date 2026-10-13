import type { Bar, Timeframe } from "@/lib/market/types";

export const price = (n: number): string => n.toFixed(2);

export function compact(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(Math.round(n));
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Jan 5, 2016" for daily bars, "Jan 7 · 10:42" for intraday (chart clock time, UTC fields). */
export function barTime(time: number, tf: Timeframe): string {
  const d = new Date(time * 1000);
  const date = `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
  if (tf === "D" || tf === "W") return `${date}, ${d.getUTCFullYear()}`;
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${date} · ${hh}:${mm}`;
}

/** One sentence for screen readers describing a bar. */
export function barSentence(b: Bar, tf: Timeframe, n: number): string {
  const dir = b.close >= b.open ? "up" : "down";
  return `Candle ${n}, ${barTime(b.time, tf)}. ${dir} candle. Open ${price(b.open)}, high ${price(b.high)}, low ${price(b.low)}, close ${price(b.close)}. Volume ${compact(b.volume)}.`;
}
