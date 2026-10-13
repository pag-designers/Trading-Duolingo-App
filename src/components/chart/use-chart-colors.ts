"use client";

import { useEffect, useState } from "react";

/** The design tokens the chart needs, read from CSS (the canvas can't use `var()`). */
export interface ChartColors {
  background: string;
  text: string;
  muted: string;
  grid: string;
  border: string;
  gain: string;
  loss: string;
  brand: string;
  flame: string;
  info: string;
  reward: string;
}

const TOKENS: Record<keyof ChartColors, string> = {
  background: "--surface",
  text: "--foreground",
  muted: "--muted",
  grid: "--border",
  border: "--border-strong",
  gain: "--gain",
  loss: "--loss",
  brand: "--brand",
  flame: "--flame",
  info: "--info",
  reward: "--reward",
};

function read(): ChartColors {
  const css = getComputedStyle(document.documentElement);
  const out = {} as ChartColors;
  for (const k of Object.keys(TOKENS) as (keyof ChartColors)[])
    out[k] = css.getPropertyValue(TOKENS[k]).trim() || "#888";
  return out;
}

/** Chart colors that follow light/dark mode. `null` until the first client render. */
export function useChartColors(): ChartColors | null {
  const [colors, setColors] = useState<ChartColors | null>(null);
  useEffect(() => {
    setColors(read());
    const obs = new MutationObserver(() => setColors(read()));
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "style"],
    });
    return () => obs.disconnect();
  }, []);
  return colors;
}
