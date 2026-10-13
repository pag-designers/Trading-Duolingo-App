"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Lock } from "lucide-react";
import { useMemo, useState } from "react";
import { RiskReminder } from "@/components/risk-reminder";
import { Segmented } from "@/components/ui/segmented";
import { unlockedIndicators } from "@/lib/chart/unlocks";
import { seriesFor, windowLead } from "@/lib/market/data";
import {
  DATASET_LABEL,
  DATASET_TIMEFRAMES,
  INDICATORS,
  INDICATOR_LABEL,
  TIMEFRAME_LABEL,
  type DatasetId,
  type IndicatorId,
  type Timeframe,
} from "@/lib/market/types";
import { cn } from "@/lib/utils";
import { useProgress } from "@/store/progress";
import { vwapAllowed } from "./indicator-data";

const ChartView = dynamic(() => import("./chart-view").then((m) => m.ChartView), {
  ssr: false,
  loading: () => (
    <div
      className="h-72 animate-pulse rounded-2xl bg-surface-2"
      role="img"
      aria-label="Loading chart"
    />
  ),
});

/** How much of each series the free-play chart shows. */
function visible(dataset: DatasetId, tf: Timeframe) {
  const all = seriesFor(dataset, tf);
  const count =
    dataset === "aapl-daily"
      ? tf === "D"
        ? 150
        : 100
      : Math.min(
          all.length,
          { "1m": 780, "5m": 156, "15m": 52, "1h": 14, D: 10 }[tf as "1m"] ?? 100,
        );
  const start = Math.max(0, all.length - count);
  return {
    bars: all.slice(start),
    lead: windowLead({ dataset, tf, start, count: Math.max(5, count) }, tf),
  };
}

/** Chart School: a free-play chart. Indicators unlock as the learner finishes their Unit 2 lessons. */
export function ChartSchoolScreen() {
  const nodes = useProgress((s) => s.nodes);
  const unlocked = unlockedIndicators(nodes);
  const [dataset, setDataset] = useState<DatasetId>("aapl-daily");
  const [tf, setTf] = useState<Timeframe>("D");
  const [on, setOn] = useState<IndicatorId[]>([]);
  const { bars, lead } = useMemo(() => visible(dataset, tf), [dataset, tf]);
  const shown = on.filter((id) => unlocked.includes(id) && (id !== "vwap" || vwapAllowed(bars)));

  const chooseDataset = (d: DatasetId) => {
    setDataset(d);
    setTf(DATASET_TIMEFRAMES[d][d === "practice" ? 2 : 0]!);
  };

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-4xl">Chart School</h1>
        <p className="mt-2 text-xl text-muted">
          Play with a chart. Scroll it, zoom it, and turn tools on.
        </p>
      </header>
      <RiskReminder />

      <Segmented
        label="Prices to look at"
        value={dataset}
        onValueChange={chooseDataset}
        options={[
          { value: "aapl-daily", label: "Apple, real history" },
          { value: "practice", label: "Practice day, made up" },
        ]}
      />
      <Segmented
        label="Timeframe"
        value={tf}
        onValueChange={(v) => setTf(v)}
        options={DATASET_TIMEFRAMES[dataset].map((t) => ({ value: t, label: TIMEFRAME_LABEL[t] }))}
      />

      <div
        role="group"
        aria-label="Indicators"
        className="flex flex-wrap gap-2"
        data-testid="school-indicators"
      >
        {INDICATORS.map((id) => {
          const isUnlocked = unlocked.includes(id);
          const blocked = id === "vwap" && !vwapAllowed(bars);
          const pressed = shown.includes(id);
          return (
            <button
              key={id}
              type="button"
              aria-pressed={pressed}
              disabled={!isUnlocked || blocked}
              data-testid={`school-ind-${id}`}
              data-unlocked={isUnlocked}
              onClick={() => setOn(on.includes(id) ? on.filter((x) => x !== id) : [...on, id])}
              className={cn(
                "inline-flex min-h-12 items-center gap-2 rounded-2xl border-2 px-4 text-base font-black",
                pressed ? "border-brand bg-brand-soft" : "border-border bg-surface",
                (!isUnlocked || blocked) && "text-muted",
              )}
            >
              {!isUnlocked && <Lock className="size-4" aria-hidden />}
              {INDICATOR_LABEL[id]}
              {!isUnlocked && <span className="sr-only"> (locked)</span>}
            </button>
          );
        })}
      </div>
      {unlocked.length < INDICATORS.length && (
        <p className="text-lg text-muted" data-testid="school-lock-note">
          Locked tools open when you finish their lesson in{" "}
          <Link href="/" className="font-black text-brand underline">
            Unit 2
          </Link>
          .
        </p>
      )}
      {on.includes("vwap") && !vwapAllowed(bars) && (
        <p className="text-lg text-muted">
          VWAP needs a chart with many candles each day. Try a practice day.
        </p>
      )}

      <ChartView
        bars={bars}
        lead={lead}
        tf={tf}
        dataset={dataset}
        indicators={shown}
        height={340}
      />
      <p className="text-base text-muted">
        {DATASET_LABEL[dataset].long} Drag to scroll. Pinch or use the mouse wheel to zoom.
      </p>
    </div>
  );
}
