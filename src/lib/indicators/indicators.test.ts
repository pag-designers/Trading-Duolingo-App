import { describe, expect, it } from "vitest";
import { aaplDaily } from "@/lib/market/data";
import { bollinger, ema, macd, rsi, sma, vwap } from ".";

describe("indicators (hand-worked)", () => {
  it("SMA averages the last n values and is null before there are n", () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
    expect(sma([10], 1)).toEqual([10]);
    expect(sma([1, 2], 5)).toEqual([null, null]);
  });

  it("EMA starts at the SMA of the first n, then moves 2/(n+1) toward each new value", () => {
    // n=3 → k=0.5. Seed = (1+2+3)/3 = 2. Next: 4*.5 + 2*.5 = 3. Next: 5*.5 + 3*.5 = 4.
    expect(ema([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
  });

  it("RSI is 100 when price only rises, 50 when it never moves, and low after falls", () => {
    expect(rsi([1, 2, 3, 4, 5], 3)).toEqual([null, null, null, 100, 100]);
    expect(rsi([5, 5, 5, 5], 3)).toEqual([null, null, null, 50]);
    // changes +1, -1, +1 → gain 2/3, loss 1/3 → RS 2 → RSI 66.67
    expect(rsi([10, 11, 10, 11], 3)[3]).toBeCloseTo(66.6667, 3);
    // then price falls by 3: gain = (2/3*2)/3 = 4/9, loss = (1/3*2+3)/3 = 11/9 → RSI = 100 - 100/(1+4/11)
    expect(rsi([10, 11, 10, 11, 8], 3)[4]).toBeCloseTo(100 - 100 / (1 + 4 / 11), 6);
  });

  it("Bollinger bands are the SMA plus and minus 2 population standard deviations", () => {
    // [2,4,4,4,5,5,7,9] has mean 5 and population standard deviation 2 (a classic example).
    const b = bollinger([2, 4, 4, 4, 5, 5, 7, 9], 8, 2);
    expect(b.middle[7]).toBe(5);
    expect(b.upper[7]).toBe(9);
    expect(b.lower[7]).toBe(1);
    expect(b.upper[6]).toBeNull();
  });

  it("MACD is fast EMA minus slow EMA, its signal is an EMA of that, and the histogram is their gap", () => {
    const closes = aaplDaily()
      .slice(0, 80)
      .map((b) => b.close);
    const m = macd(closes);
    const f = ema(closes, 12);
    const s = ema(closes, 26);
    expect(m.line.slice(0, 25).every((v) => v === null)).toBe(true);
    expect(m.line[25]).toBeCloseTo(f[25]! - s[25]!, 12);
    expect(m.signal.slice(0, 33).every((v) => v === null)).toBe(true);
    expect(m.signal[33]).not.toBeNull(); // 26 - 1 + 9 - 1 = index 33
    expect(m.histogram[40]).toBeCloseTo(m.line[40]! - m.signal[40]!, 12);
  });

  it("VWAP weights price by volume and starts over each day", () => {
    const day = 86_400;
    const bar = (time: number, close: number, volume: number) => ({
      time,
      open: close,
      high: close,
      low: close,
      close,
      volume,
    });
    const v = vwap([bar(0, 10, 100), bar(60, 20, 300), bar(day, 50, 10)]);
    expect(v[0]).toBe(10);
    expect(v[1]).toBe((10 * 100 + 20 * 300) / 400); // 17.5
    expect(v[2]).toBe(50); // a new day starts over
  });

  it("rejects a period that is not a whole number", () => {
    expect(() => sma([1, 2, 3], 0)).toThrow();
    expect(() => ema([1, 2, 3], 1.5)).toThrow();
  });
});
