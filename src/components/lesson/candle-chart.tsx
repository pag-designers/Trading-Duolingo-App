"use client";

import { cn } from "@/lib/utils";
import type { Candle } from "@/lib/content/lesson-schema";

interface CandleChartProps {
  candles: Candle[];
  /** Tap mode: candles are buttons. */
  onSelect?: (index: number) => void;
  selected?: number | null;
  /** After checking: the candle that was the right answer. */
  correctIndex?: number | null;
  disabled?: boolean;
  label: string;
  className?: string;
}

const W = 320;
const H = 180;
const PAD = 14;

const up = (c: Candle) => c.c >= c.o;

/**
 * A small, honest candle chart for lessons: it draws exactly the numbers it is given (synthetic
 * practice data). Green = closed higher than it opened, coral = closed lower. Colors are never the
 * only clue: every candle has a text label for screen readers and a fill style (solid up, outlined down).
 */
export function CandleChart({
  candles,
  onSelect,
  selected = null,
  correctIndex = null,
  disabled,
  label,
  className,
}: CandleChartProps) {
  const highs = Math.max(...candles.map((c) => c.h));
  const lows = Math.min(...candles.map((c) => c.l));
  const span = highs - lows || 1;
  const y = (v: number) => PAD + ((highs - v) / span) * (H - PAD * 2);
  const slot = (W - PAD * 2) / candles.length;
  const body = Math.min(26, slot * 0.6);
  const first = candles[0]!;
  const last = candles[candles.length - 1]!;
  const ups = candles.filter(up).length;
  // One summary for screen readers when the chart is a picture; in tap mode each candle is its own labelled button.
  const summary = `${label} ${candles.length} candles: ${ups} up and ${candles.length - ups} down. The first opened at ${first.o}. The last closed at ${last.c}.`;

  return (
    <figure className={cn("w-full", className)}>
      {/* In tap mode every candle is at least 52px wide (a comfortable tap); a long chart scrolls sideways. */}
      <div className={cn(onSelect && "overflow-x-auto rounded-2xl")}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={onSelect ? { minWidth: candles.length * 52 } : undefined}
          className="w-full rounded-2xl border-2 border-border bg-surface-2"
          role={onSelect ? "group" : "img"}
          aria-label={onSelect ? label : summary}
        >
          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={f}
              x1={PAD}
              x2={W - PAD}
              y1={PAD + f * (H - PAD * 2)}
              y2={PAD + f * (H - PAD * 2)}
              stroke="var(--border)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          ))}
          {candles.map((c, i) => {
            const cx = PAD + slot * i + slot / 2;
            const color = up(c) ? "var(--gain)" : "var(--loss)";
            const top = y(Math.max(c.o, c.c));
            const bottom = y(Math.min(c.o, c.c));
            const isSel = selected === i;
            const isRight = correctIndex === i;
            const text = `Candle ${i + 1}: ${up(c) ? "up" : "down"} candle. Open ${c.o}, high ${c.h}, low ${c.l}, close ${c.c}.`;
            const common = (
              <>
                {(isSel || isRight) && (
                  <rect
                    x={cx - slot / 2 + 1}
                    y={PAD / 2}
                    width={slot - 2}
                    height={H - PAD}
                    rx="6"
                    fill="none"
                    stroke={isRight ? "var(--gain-press)" : "var(--brand)"}
                    strokeWidth="3"
                  />
                )}
                <line
                  x1={cx}
                  x2={cx}
                  y1={y(c.h)}
                  y2={y(c.l)}
                  stroke={color}
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <rect
                  x={cx - body / 2}
                  y={top}
                  width={body}
                  height={Math.max(3, bottom - top)}
                  rx="3"
                  fill={up(c) ? color : "var(--surface-2)"}
                  stroke={color}
                  strokeWidth="3"
                />
              </>
            );
            return onSelect ? (
              <g
                key={i}
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-label={text}
                aria-pressed={isSel}
                data-testid={`candle-${i}`}
                className={disabled ? "" : "cursor-pointer outline-offset-2"}
                onClick={() => !disabled && onSelect(i)}
                onKeyDown={(e) => {
                  if (!disabled && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onSelect(i);
                  }
                }}
              >
                <rect x={cx - slot / 2} y="0" width={slot} height={H} fill="transparent" />
                {common}
              </g>
            ) : (
              <g key={i}>{common}</g>
            );
          })}
        </svg>
      </div>
      <figcaption className="mt-1 text-center text-sm text-muted">
        Practice chart. Pretend prices.
      </figcaption>
    </figure>
  );
}
