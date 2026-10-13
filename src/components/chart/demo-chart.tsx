"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { RichText } from "@/components/lesson/glossary-context";
import type { Slide } from "@/lib/content/lesson-schema";
import { windowBars, windowLead } from "@/lib/market/data";

const ChartView = dynamic(() => import("./chart-view").then((m) => m.ChartView), {
  ssr: false,
  loading: () => (
    <div
      className="h-56 animate-pulse rounded-2xl bg-surface-2"
      role="img"
      aria-label="Loading chart"
    />
  ),
});

/** A read-only chart picture that goes with a teach slide: real Apple history or made-up practice prices, labelled. */
export function DemoChart({ demo }: { demo: NonNullable<Slide["demo"]> }) {
  const bars = useMemo(() => windowBars(demo.window), [demo.window]);
  const lead = useMemo(() => windowLead(demo.window), [demo.window]);
  return (
    <div className="w-full text-left" data-testid="demo-chart">
      <ChartView
        bars={bars}
        lead={lead}
        tf={demo.window.tf}
        dataset={demo.window.dataset}
        indicators={demo.indicators}
        height={220}
        readOnly
      />
      <p className="mt-2 text-center text-lg font-bold">
        <RichText text={demo.caption} />
      </p>
    </div>
  );
}
