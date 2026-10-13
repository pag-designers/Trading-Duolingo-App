import type { NodeRecord } from "@/lib/progress";
import type { IndicatorId } from "@/lib/market/types";

/** The Unit 2 lesson that teaches each indicator. Finishing it unlocks the indicator on the practice chart (and later in Trade Lab). */
export const INDICATOR_UNLOCK: Record<IndicatorId, string> = {
  sma: "u2-ma",
  ema: "u2-ma",
  vwap: "u2-vwap",
  rsi: "u2-rsi",
  macd: "u2-macd",
  bands: "u2-bands",
  volume: "u2-volume",
};

export function unlockedIndicators(
  nodes: Record<string, Pick<NodeRecord, "status">>,
): IndicatorId[] {
  return (Object.keys(INDICATOR_UNLOCK) as IndicatorId[]).filter(
    (id) => nodes[INDICATOR_UNLOCK[id]]?.status === "done",
  );
}
