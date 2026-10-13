import { describe, expect, it } from "vitest";
import { aggregateDays, aggregateMinutes, aggregateWeeks } from "./aggregate";
import { aaplDaily, canShow, seriesFor, windowBars, windowBarsAt } from "./data";
import { practiceMinuteBars } from "./practice";

describe("market data", () => {
  it("Apple daily is 506 real, valid bars in order", () => {
    const bars = aaplDaily();
    expect(bars).toHaveLength(506);
    expect(bars[0]!.close).toBe(127.83);
    for (const b of bars) {
      expect(b.low).toBeLessThanOrEqual(Math.min(b.open, b.close));
      expect(b.high).toBeGreaterThanOrEqual(Math.max(b.open, b.close));
    }
  });

  it("practice days are deterministic and valid", () => {
    const a = practiceMinuteBars();
    expect(a).toHaveLength(3900);
    expect(a[10]).toEqual(practiceMinuteBars()[10]);
    for (const b of a) {
      expect(b.low).toBeLessThanOrEqual(Math.min(b.open, b.close));
      expect(b.high).toBeGreaterThanOrEqual(Math.max(b.open, b.close));
      expect(b.low).toBeGreaterThan(0);
      expect(b.volume).toBeGreaterThan(0);
    }
    // 2030 on purpose: obviously not real history.
    expect(new Date(a[0]!.time * 1000).getUTCFullYear()).toBe(2030);
    // Sessions are Monday to Friday only.
    expect(new Set(a.map((b) => new Date(b.time * 1000).getUTCDay()))).not.toContain(0);
  });

  it("aggregation keeps open, high, low, close and volume honest", () => {
    const m = practiceMinuteBars();
    const h = aggregateMinutes(m, 60);
    expect(h).toHaveLength(10 * 7); // 390 minutes = 6 full hours + a 30-minute last bar → 7 per day
    const first = m.slice(0, 60);
    expect(h[0]!.open).toBe(first[0]!.open);
    expect(h[0]!.close).toBe(first[59]!.close);
    expect(h[0]!.high).toBe(Math.max(...first.map((b) => b.high)));
    expect(h[0]!.low).toBe(Math.min(...first.map((b) => b.low)));
    expect(h[0]!.volume).toBe(first.reduce((a, b) => a + b.volume, 0));
    const days = aggregateDays(m);
    expect(days).toHaveLength(10);
    expect(days.reduce((a, b) => a + b.volume, 0)).toBe(m.reduce((a, b) => a + b.volume, 0));
  });

  it("weekly bars start on Monday and cover every day", () => {
    const w = aggregateWeeks(aaplDaily());
    expect(new Date(w[0]!.time * 1000).getUTCDay()).toBe(1);
    expect(w.every((b) => new Date(b.time * 1000).getUTCDay() === 1)).toBe(true);
    expect(w.reduce((a, b) => a + b.volume, 0)).toBe(aaplDaily().reduce((a, b) => a + b.volume, 0));
  });

  it("each dataset only offers timeframes it can build", () => {
    expect(canShow("aapl-daily", "1m")).toBe(false);
    expect(() => seriesFor("aapl-daily", "1m")).toThrow();
    expect(seriesFor("practice", "5m")).toHaveLength(780);
  });

  it("a window shows the same stretch of time at another timeframe", () => {
    const w = { dataset: "practice", tf: "15m", start: 26, count: 26 } as const; // day 2
    const base = windowBars(w);
    expect(base).toHaveLength(26);
    const hourly = windowBarsAt(w, "1h");
    expect(hourly[0]!.time).toBe(base[0]!.time);
    expect(hourly.length).toBeGreaterThan(5);
    expect(hourly.length).toBeLessThan(8);
    expect(windowBarsAt(w, "15m")).toEqual(base);
  });
});
