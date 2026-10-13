import { stub } from "../lib";
import type { Agent } from "../types";

/** CP0: nothing financial exists yet, so every check is an honest stub (amber). */
export const financialAccuracy: Agent = {
  id: "financial-accuracy",
  name: "Financial Accuracy Checker",
  job: "Unit-tests simulator math, indicator formulas and candlestick detectors against references.",
  async run() {
    return [
      stub(
        "indicators",
        "SMA, EMA, RSI, MACD, VWAP, Bollinger match reference implementations",
        "CP2",
      ),
      stub("detectors", "Candlestick and chart-pattern detectors pass golden fixtures", "CP3"),
      stub("sim-math", "Position sizing, P&L, fees, slippage, stop gap fills", "CP4"),
      stub("pdt", "Pattern day trader rule counting", "CP4"),
      stub(
        "summary-metrics",
        "Win rate, expectancy and drawdown match hand-calculated fixtures",
        "CP5",
      ),
    ];
  },
};
