import { describe, expect, it } from "vitest";
import { indicators, type IndicatorSet } from "../../src/lib/indicators";
import { fixture, run } from "../testing";
import { financialAccuracy, makeFinancialAccuracy } from ".";

const GOLDEN = "agents/fixtures/indicators-golden.json";
const status = (r: Awaited<ReturnType<typeof run>>, id: string) =>
  r.checks.find((c) => c.id === id)?.status;

describe("Financial Accuracy Checker", () => {
  it("control: the real indicators and chart data pass", async () => {
    const r = await run(financialAccuracy, fixture([GOLDEN]));
    expect(status(r, "indicators")).toBe("green");
    expect(status(r, "market-data")).toBe("green");
    // Detectors, simulator math and metrics are still honest stubs, so the agent stays amber.
    expect(r.status).toBe("amber");
    expect(r.checks.filter((c) => c.stub).map((c) => c.id)).toEqual([
      "detectors",
      "sim-math",
      "pdt",
      "summary-metrics",
    ]);
  });

  // Canary: deliberately wrong formulas must turn the check red.
  const broken: [string, Partial<IndicatorSet>][] = [
    [
      "an SMA that averages one bar too few",
      {
        sma: (v, n) => indicators.sma(v, Math.max(1, n - 1)).map((x, i) => (i >= n - 1 ? x : null)),
      },
    ],
    [
      "an EMA seeded with the first price instead of the SMA",
      {
        ema: (v, n) => {
          const k = 2 / (n + 1);
          let prev = v[0]!;
          return v.map((x, i) =>
            i < n - 1 ? null : (prev = i === 0 ? x : x * k + prev * (1 - k)),
          );
        },
      },
    ],
    [
      "an RSI that uses a plain average instead of Wilder smoothing",
      {
        rsi: (c, n = 14) =>
          c.map((_, i) => {
            if (i < n) return null;
            let g = 0,
              l = 0;
            for (let j = i - n + 1; j <= i; j++) {
              const d = c[j]! - c[j - 1]!;
              if (d > 0) g += d;
              else l -= d;
            }
            return l === 0 ? 100 : 100 - 100 / (1 + g / l);
          }),
      },
    ],
    [
      "a VWAP that never resets each day",
      {
        vwap: (bars) => {
          let pv = 0,
            vol = 0;
          return bars.map((b) => {
            pv += ((b.high + b.low + b.close) / 3) * b.volume;
            vol += b.volume;
            return pv / vol;
          });
        },
      },
    ],
    [
      "Bollinger bands that use 1 standard deviation",
      { bollinger: (c, n) => indicators.bollinger(c, n, 1) },
    ],
    [
      "a MACD with the slow and fast periods swapped in the signal",
      { macd: (c, f, s) => indicators.macd(c, f, s, 5) },
    ],
  ];
  for (const [name, patch] of broken) {
    it(`catches ${name}`, async () => {
      const agent = makeFinancialAccuracy({ ...indicators, ...patch });
      const r = await run(agent, fixture([GOLDEN]));
      expect(status(r, "indicators")).toBe("red");
      expect(r.status).toBe("red");
    });
  }

  it("catches a missing golden file", async () => {
    const r = await run(financialAccuracy, fixture([]));
    expect(status(r, "indicators")).toBe("red");
  });

  it("catches a tampered golden file", async () => {
    const real = JSON.parse((await import("node:fs")).readFileSync(GOLDEN, "utf8"));
    real.rsi["14"][40] += 1;
    const r = await run(financialAccuracy, fixture([], { [GOLDEN]: JSON.stringify(real) }));
    expect(status(r, "indicators")).toBe("red");
  });
});
