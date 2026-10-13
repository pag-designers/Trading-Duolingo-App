import { fail, pass, stub } from "../lib";
import type { Agent, Check } from "../types";
import type { IndicatorSet } from "../../src/lib/indicators";
import {
  checkAgainstGolden,
  checkAgainstReference,
  checkMarketData,
  loadGolden,
  real,
} from "./indicators";

const summarize = (problems: string[]) =>
  problems.slice(0, 3).join(" · ") +
  (problems.length > 3 ? ` · and ${problems.length - 3} more` : "");

/** Build the agent around a set of indicator formulas (the real ones, or a broken one in the canary). */
export function makeFinancialAccuracy(impl: IndicatorSet = real): Agent {
  return {
    id: "financial-accuracy",
    name: "Financial Accuracy Checker",
    job: "Unit-tests simulator math, indicator formulas and candlestick detectors against references.",
    async run(ctx) {
      const checks: Check[] = [];

      const golden = loadGolden(ctx.root);
      if (!golden) {
        checks.push(
          fail(
            "indicators",
            "SMA, EMA, RSI, MACD, VWAP, Bollinger match reference values",
            "agents/fixtures/indicators-golden.json is missing",
          ),
        );
      } else {
        const problems = [...checkAgainstGolden(impl, golden), ...checkAgainstReference(impl)];
        checks.push(
          problems.length === 0
            ? pass(
                "indicators",
                "SMA, EMA, RSI, MACD, VWAP, Bollinger match reference values",
                "Match pandas golden values (1e-8) and independent naive versions on 300 real Apple bars and 500 practice bars; RSI stays in 0–100, bands stay in order, VWAP stays inside the day's range.",
              )
            : fail(
                "indicators",
                "SMA, EMA, RSI, MACD, VWAP, Bollinger match reference values",
                summarize(problems),
              ),
        );
      }

      const data = checkMarketData();
      checks.push(
        data.length === 0
          ? pass(
              "market-data",
              "Chart data is valid and in time order",
              "Every Apple daily bar and every practice bar has low ≤ open/close ≤ high.",
            )
          : fail("market-data", "Chart data is valid and in time order", summarize(data)),
      );

      checks.push(
        stub("detectors", "Candlestick and chart-pattern detectors pass golden fixtures", "CP3"),
        stub("sim-math", "Position sizing, P&L, fees, slippage, stop gap fills", "CP4"),
        stub("pdt", "Pattern day trader rule counting", "CP4"),
        stub(
          "summary-metrics",
          "Win rate, expectancy and drawdown match hand-calculated fixtures",
          "CP5",
        ),
      );
      return checks;
    },
  };
}

export const financialAccuracy: Agent = makeFinancialAccuracy();
