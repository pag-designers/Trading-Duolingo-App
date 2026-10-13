import { z } from "zod";

/** One price bar. `time` is Unix seconds (UTC). Prices are plain dollars; volume is shares. */
export interface Bar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export const TIMEFRAMES = ["1m", "5m", "15m", "1h", "D", "W"] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];

export const TIMEFRAME_LABEL: Record<Timeframe, string> = {
  "1m": "1 minute",
  "5m": "5 minutes",
  "15m": "15 minutes",
  "1h": "1 hour",
  D: "1 day",
  W: "1 week",
};

export const DATASETS = ["aapl-daily", "practice"] as const;
export type DatasetId = (typeof DATASETS)[number];

/** Which timeframes each dataset can show. */
export const DATASET_TIMEFRAMES: Record<DatasetId, readonly Timeframe[]> = {
  "aapl-daily": ["D", "W"],
  practice: ["1m", "5m", "15m", "1h", "D"],
};

/** What the learner is told about where the prices come from. Never "live". */
export const DATASET_LABEL: Record<DatasetId, { short: string; long: string; real: boolean }> = {
  "aapl-daily": {
    short: "Real history: Apple daily",
    long: "Real Apple prices from 2015 to 2017. Not live.",
    real: true,
  },
  practice: {
    short: "Made-up practice prices",
    long: "These prices are made up for practice. They are not real and not live.",
    real: false,
  },
};

/** A slice of a dataset, written in lesson content: start and count are in bars of `tf`. */
export const windowSchema = z.object({
  dataset: z.enum(DATASETS),
  tf: z.enum(TIMEFRAMES),
  start: z.number().int().min(0),
  count: z.number().int().min(5).max(300),
});
export type Window = z.infer<typeof windowSchema>;

export const INDICATORS = ["sma", "ema", "vwap", "rsi", "macd", "bands", "volume"] as const;
export type IndicatorId = (typeof INDICATORS)[number];

export const INDICATOR_LABEL: Record<IndicatorId, string> = {
  sma: "SMA (simple average)",
  ema: "EMA (fast average)",
  vwap: "VWAP",
  rsi: "RSI",
  macd: "MACD",
  bands: "Bollinger Bands",
  volume: "Volume",
};
