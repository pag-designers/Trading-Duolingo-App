"use client";

import type { LabAnswer, Pt } from "@/lib/chart/lab";
import type { Bar } from "@/lib/market/types";
import { price } from "./format";
import type { ChartApi } from "./chart-view";

export const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1] as const;

/** Fibonacci level `l` (0 at the end point, 1 at the start) as a price. */
export const fibPrice = (a: Pt, b: Pt, l: number) => b.price + (a.price - b.price) * l;

/** "+3.52 (+2.9%) · 7 candles" for the measure tool. */
export function measureText(a: Pt, b: Pt): string {
  const diff = b.price - a.price;
  const pct = a.price === 0 ? 0 : (diff / a.price) * 100;
  const sign = diff >= 0 ? "+" : "−";
  const bars = Math.round(Math.abs(b.i - a.i));
  return `${sign}${price(Math.abs(diff))} (${sign}${Math.abs(pct).toFixed(1)}%) · ${bars} candle${bars === 1 ? "" : "s"}`;
}

interface ShapeProps {
  answer: LabAnswer;
  api: ChartApi;
  /** "mine" is the learner's drawing; "solution" is the right answer, shown after checking. */
  tone: "mine" | "solution";
}

/** One drawing, as SVG on top of the chart. Decorative: the same facts are in text under the chart. */
export function Shape({ answer, api, tone }: ShapeProps) {
  const color = tone === "mine" ? "var(--brand)" : "var(--flame-text)";
  const dash = tone === "solution" ? "7 5" : undefined;
  const pt = (p: Pt) => ({ x: api.xOf(p.i), y: api.yOf(p.price) });
  const label = (x: number, y: number, text: string, anchor: "start" | "end" = "start") => (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontSize="13"
      fontWeight="800"
      fill={color}
      stroke="var(--surface)"
      strokeWidth="3"
      paintOrder="stroke"
      fontFamily="var(--font-mono)"
    >
      {text}
    </text>
  );
  const dot = (p: { x: number | null; y: number | null }) =>
    p.x != null && p.y != null ? (
      <circle cx={p.x} cy={p.y} r="6" fill={color} stroke="var(--surface)" strokeWidth="2" />
    ) : null;

  switch (answer.kind) {
    case "hline": {
      const y = api.yOf(answer.price);
      if (y == null) return null;
      return (
        <g data-shape="hline">
          <line
            x1="0"
            x2={api.width}
            y1={y}
            y2={y}
            stroke={color}
            strokeWidth="3"
            strokeDasharray={dash}
          />
          {label(api.width - 6, y - 6, price(answer.price), "end")}
        </g>
      );
    }
    case "trendline": {
      const a = pt(answer.a);
      const b = pt(answer.b);
      if (a.x == null || a.y == null || b.x == null || b.y == null || a.x === b.x) return dot(a);
      const slope = (b.y - a.y) / (b.x - a.x);
      const y0 = a.y + slope * (0 - a.x);
      const y1 = a.y + slope * (api.width - a.x);
      return (
        <g data-shape="trendline">
          <line
            x1="0"
            y1={y0}
            x2={api.width}
            y2={y1}
            stroke={color}
            strokeWidth="3"
            strokeDasharray={dash}
          />
          {dot(a)}
          {dot(b)}
        </g>
      );
    }
    case "box": {
      const a = pt(answer.a);
      const b = pt(answer.b);
      if (a.x == null || a.y == null || b.x == null || b.y == null) return null;
      return (
        <g data-shape="box">
          <rect
            x={Math.min(a.x, b.x)}
            y={Math.min(a.y, b.y)}
            width={Math.abs(b.x - a.x)}
            height={Math.abs(b.y - a.y)}
            fill={color}
            fillOpacity="0.14"
            stroke={color}
            strokeWidth="3"
            strokeDasharray={dash}
            rx="4"
          />
        </g>
      );
    }
    case "fib": {
      const a = pt(answer.a);
      const b = pt(answer.b);
      if (a.x == null || b.x == null) return null;
      const left = Math.min(a.x, b.x);
      return (
        <g data-shape="fib">
          {FIB_LEVELS.map((l) => {
            const p = fibPrice(answer.a, answer.b, l);
            const y = api.yOf(p);
            if (y == null) return null;
            return (
              <g key={l}>
                <line
                  x1={left}
                  x2={api.width}
                  y1={y}
                  y2={y}
                  stroke={color}
                  strokeWidth={l === 0 || l === 1 ? 3 : 1.5}
                  strokeDasharray={dash ?? (l === 0 || l === 1 ? undefined : "4 4")}
                />
                {label(
                  api.width - 6,
                  y - 4,
                  `${(l * 100).toFixed(1).replace(".0", "")}% · ${price(p)}`,
                  "end",
                )}
              </g>
            );
          })}
          {dot(a)}
          {dot(b)}
        </g>
      );
    }
    case "measure": {
      const a = pt(answer.a);
      const b = pt(answer.b);
      if (a.x == null || a.y == null || b.x == null || b.y == null) return null;
      const text = measureText(answer.a, answer.b);
      const midX = Math.max(8, Math.min(api.width - 8, (a.x + b.x) / 2));
      return (
        <g data-shape="measure">
          <line
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={color}
            strokeWidth="3"
            strokeDasharray={dash ?? "2 5"}
            strokeLinecap="round"
          />
          {dot(a)}
          {dot(b)}
          {label(midX, Math.min(a.y, b.y) - 10, text, midX > api.width / 2 ? "end" : "start")}
        </g>
      );
    }
    case "note": {
      const p = pt(answer.at);
      if (p.x == null || p.y == null) return null;
      return (
        <g data-shape="note">
          <line x1={p.x} y1={p.y} x2={p.x} y2={p.y - 22} stroke={color} strokeWidth="2" />
          {dot(p)}
          {label(
            Math.min(api.width - 8, Math.max(8, p.x)),
            p.y - 28,
            answer.text,
            p.x > api.width * 0.7 ? "end" : "start",
          )}
        </g>
      );
    }
    default:
      return null;
  }
}

interface CursorProps {
  api: ChartApi;
  bars: readonly Bar[];
  index: number;
  price: number | null;
  /** Show the price tick too (drawing tasks). */
  showPrice: boolean;
}

/** The keyboard/pick cursor: a band on one candle and, for drawing tasks, a price tick. */
export function CursorMark({ api, bars, index, price: p, showPrice }: CursorProps) {
  const x = api.xOf(index);
  const next = api.xOf(Math.min(bars.length - 1, index + 1)) ?? api.xOf(Math.max(0, index - 1));
  if (x == null) return null;
  const half = Math.max(6, Math.abs((next ?? x + 12) - x) / 2 || 6);
  const y = showPrice && p != null ? api.yOf(p) : null;
  return (
    <g data-testid="chart-cursor" data-index={index}>
      <rect
        x={x - half}
        y="0"
        width={half * 2}
        height={api.height}
        fill="var(--brand)"
        fillOpacity="0.14"
        stroke="var(--brand)"
        strokeWidth="2"
        rx="4"
      />
      {y != null && (
        <>
          <line
            x1="0"
            x2={api.width}
            y1={y}
            y2={y}
            stroke="var(--brand)"
            strokeWidth="1.5"
            strokeDasharray="3 4"
          />
          <circle cx={x} cy={y} r="6" fill="var(--surface)" stroke="var(--brand)" strokeWidth="3" />
        </>
      )}
    </g>
  );
}
