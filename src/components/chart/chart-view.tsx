"use client";

import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  LineStyle,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { INDICATOR_LABEL, DATASET_LABEL } from "@/lib/market/types";
import type { Bar, DatasetId, IndicatorId, Timeframe } from "@/lib/market/types";
import { cn } from "@/lib/utils";
import { barTime, compact, price } from "./format";
import { PERIODS, computeIndicators } from "./indicator-data";
import { useChartColors, type ChartColors } from "./use-chart-colors";

/** Pixel helpers for things drawn on top of the chart (drawing tools, the cursor). */
export interface ChartApi {
  xOf(index: number): number | null;
  yOf(price: number): number | null;
  /** Fractional bar index under an x pixel. */
  indexAt(x: number): number | null;
  priceAt(y: number): number | null;
  width: number;
  /** Height of the main (candle) pane. */
  height: number;
}

export interface ChartViewProps {
  bars: Bar[];
  /** Earlier bars that only warm up the indicators (not drawn). */
  lead?: Bar[];
  tf: Timeframe;
  dataset: DatasetId;
  indicators: IndicatorId[];
  /** Height of the candle pane in px. Indicator panes add to it. */
  height?: number;
  /** No panning or zooming (for pictures inside slides). */
  readOnly?: boolean;
  /** A bar the legend and highlight should show (keyboard cursor). */
  cursor?: number | null;
  overlay?: (api: ChartApi) => ReactNode;
  /** A click or tap on the candle pane (not a drag). With `magnet`, snaps to the nearest candle's open, high, low or close. */
  onPick?: (p: ChartPoint) => void;
  /** The pointer moved over the candle pane (null when it left). */
  onMove?: (p: ChartPoint | null) => void;
  magnet?: boolean;
  className?: string;
}

/** A spot on the candle pane: fractional bar index and price. */
export interface ChartPoint {
  i: number;
  price: number;
}

const PANE_H = 110;
const EMPTY: Bar[] = [];

const rgba = (hex: string, a: number) => {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1]!, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

const T = (b: { time: number }) => b.time as UTCTimestamp;

function lineData(bars: readonly Bar[], values: readonly (number | null)[]) {
  return bars.map((b, i) =>
    values[i] == null ? { time: T(b) } : { time: T(b), value: values[i]! },
  );
}

interface Handles {
  chart: IChartApi;
  candles: ISeriesApi<"Candlestick">;
}

/**
 * A Lightweight Charts candlestick chart with volume, overlays (SMA, EMA, VWAP, Bollinger) and panes
 * (RSI, MACD). Prices are drawn exactly as given. The canvas is hidden from screen readers; a text
 * summary and the OHLC legend carry the same information.
 */
export function ChartView(props: ChartViewProps) {
  const {
    bars,
    tf,
    dataset,
    indicators,
    height = 280,
    readOnly,
    cursor,
    overlay,
    className,
  } = props;
  const lead = props.lead ?? EMPTY;
  // Newest handlers, read inside chart callbacks so the chart is not rebuilt when they change.
  const handlers = useRef({ onPick: props.onPick, onMove: props.onMove, magnet: props.magnet });
  handlers.current = { onPick: props.onPick, onMove: props.onMove, magnet: props.magnet };
  const colors = useChartColors();
  const hostRef = useRef<HTMLDivElement>(null);
  const [handles, setHandles] = useState<Handles | null>(null);
  const [tick, setTick] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  const key = indicators.slice().sort().join(",");
  const panes = (indicators.includes("rsi") ? 1 : 0) + (indicators.includes("macd") ? 1 : 0);
  const total = height + panes * PANE_H;
  // Indicators are computed over lead + window, then cut back to the window.
  const data = useMemo(() => computeIndicators(lead, bars, indicators), [lead, bars, indicators]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !colors || bars.length === 0) return;
    const intraday = tf !== "D" && tf !== "W";
    const chart = createChart(host, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: colors.background },
        textColor: colors.muted,
        fontFamily: "Nunito, system-ui, sans-serif",
        fontSize: 13,
        attributionLogo: false, // we credit TradingView in the text under the chart instead
        panes: { separatorColor: colors.border, separatorHoverColor: colors.border },
      },
      grid: { vertLines: { color: colors.grid }, horzLines: { color: colors.grid } },
      rightPriceScale: { borderColor: colors.border },
      timeScale: {
        borderColor: colors.border,
        timeVisible: intraday,
        secondsVisible: false,
        rightOffset: 2,
        fixLeftEdge: readOnly,
        fixRightEdge: readOnly,
      },
      crosshair: { mode: CrosshairMode.Normal },
      handleScroll: !readOnly,
      handleScale: !readOnly,
      localization: { priceFormatter: (p: number) => price(p) },
    });

    const candles = chart.addSeries(CandlestickSeries, {
      upColor: colors.gain,
      downColor: colors.loss,
      wickUpColor: colors.gain,
      wickDownColor: colors.loss,
      borderVisible: false,
      priceLineVisible: false,
    });
    candles.setData(
      bars.map((b) => ({ time: T(b), open: b.open, high: b.high, low: b.low, close: b.close })),
    );

    if (indicators.includes("volume")) {
      const vol = chart.addSeries(HistogramSeries, {
        priceScaleId: "volume",
        priceFormat: { type: "volume" },
        priceLineVisible: false,
        lastValueVisible: false,
      });
      chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
      vol.setData(
        bars.map((b) => ({
          time: T(b),
          value: b.volume,
          color: rgba(b.close >= b.open ? colors.gain : colors.loss, 0.55),
        })),
      );
    }

    const line = (
      values: readonly (number | null)[],
      color: string,
      style = LineStyle.Solid,
      width: 1 | 2 = 2,
      pane = 0,
    ) => {
      const s = chart.addSeries(
        LineSeries,
        {
          color,
          lineWidth: width,
          lineStyle: style,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        },
        pane,
      );
      s.setData(lineData(bars, values));
      return s;
    };
    if (indicators.includes("sma")) line(data.sma, colors.brand);
    if (indicators.includes("ema")) line(data.ema, colors.flame, LineStyle.Dashed);
    if (indicators.includes("vwap")) line(data.vwap, colors.info);
    if (indicators.includes("bands")) {
      line(data.bands.upper, colors.reward, LineStyle.Solid, 1);
      line(data.bands.middle, colors.reward, LineStyle.Dotted, 1);
      line(data.bands.lower, colors.reward, LineStyle.Solid, 1);
    }

    let pane = 1;
    if (indicators.includes("rsi")) {
      const s = line(data.rsi, colors.info, LineStyle.Solid, 2, pane);
      s.applyOptions({
        autoscaleInfoProvider: () => ({ priceRange: { minValue: 0, maxValue: 100 } }),
      });
      for (const level of [70, 30])
        s.createPriceLine({
          price: level,
          color: colors.muted,
          lineStyle: LineStyle.Dotted,
          lineWidth: 1,
          axisLabelVisible: true,
          title: "",
        });
      chart.panes()[pane]?.setHeight(PANE_H);
      pane++;
    }
    if (indicators.includes("macd")) {
      const hist = chart.addSeries(
        HistogramSeries,
        { priceLineVisible: false, lastValueVisible: false },
        pane,
      );
      hist.setData(
        bars.map((b, i) => {
          const v = data.macd.histogram[i];
          return v == null
            ? { time: T(b) }
            : { time: T(b), value: v, color: rgba(v >= 0 ? colors.gain : colors.loss, 0.6) };
        }),
      );
      line(data.macd.line, colors.brand, LineStyle.Solid, 2, pane);
      line(data.macd.signal, colors.flame, LineStyle.Dashed, 2, pane);
      chart.panes()[pane]?.setHeight(PANE_H);
    }

    chart.timeScale().fitContent();

    const redraw = () => setTick((n) => n + 1);
    chart.timeScale().subscribeVisibleLogicalRangeChange(redraw);
    chart.timeScale().subscribeSizeChange(redraw);
    /** Turn a pixel position into a (bar, price) point, snapping to the nearest candle value when the magnet is on. */
    const toPoint = (point: { x: number; y: number }, logical: number): ChartPoint | null => {
      const raw = candles.coordinateToPrice(point.y);
      if (raw == null) return null;
      let i = Math.max(0, Math.min(bars.length - 1, logical));
      let value: number = raw;
      if (handlers.current.magnet) {
        i = Math.round(i);
        const b = bars[i]!;
        let best = 28; // snap only when within 28 px
        for (const v of [b.open, b.high, b.low, b.close]) {
          const y = candles.priceToCoordinate(v);
          if (y != null && Math.abs(y - point.y) < best) {
            best = Math.abs(y - point.y);
            value = v;
          }
        }
      }
      return { i, price: value };
    };
    chart.subscribeCrosshairMove((p) => {
      setHover(
        p.point && p.logical != null
          ? Math.max(0, Math.min(bars.length - 1, Math.round(p.logical)))
          : null,
      );
      const main = (p.paneIndex ?? 0) === 0;
      handlers.current.onMove?.(
        p.point && p.logical != null && main ? toPoint(p.point, p.logical) : null,
      );
      redraw();
    });
    chart.subscribeClick((p) => {
      if (!p.point || p.logical == null || (p.paneIndex ?? 0) !== 0) return;
      const pt = toPoint(p.point, p.logical);
      if (pt) handlers.current.onPick?.(pt);
    });
    setHandles({ chart, candles });
    redraw();
    return () => {
      setHandles(null);
      chart.remove();
    };
    // `data` is derived from bars + indicators, so it is covered by them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bars, lead, tf, key, colors, readOnly, height]);

  const api: ChartApi | null = useMemo(() => {
    if (!handles) return null;
    const { chart, candles } = handles;
    const main = chart.panes()[0];
    return {
      xOf: (i) => chart.timeScale().logicalToCoordinate(i as never),
      yOf: (p) => candles.priceToCoordinate(p),
      indexAt: (x) => chart.timeScale().coordinateToLogical(x),
      priceAt: (y) => candles.coordinateToPrice(y),
      width: Math.max(0, (hostRef.current?.clientWidth ?? 0) - chart.priceScale("right").width()),
      height: main?.getHeight() ?? height,
    };
    // `tick` forces a fresh api (and a redraw of the overlay) whenever the chart moves or resizes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handles, tick, height]);

  const active = cursor ?? hover ?? bars.length - 1;
  const bar = bars[active];
  const up = bar ? bar.close >= bar.open : true;
  const first = bars[0];
  const last = bars[bars.length - 1];
  const hi = bars.length ? Math.max(...bars.map((b) => b.high)) : 0;
  const lo = bars.length ? Math.min(...bars.map((b) => b.low)) : 0;
  const label = DATASET_LABEL[dataset];
  const values = (id: IndicatorId): string | null => {
    const v = (arr: readonly (number | null)[]) =>
      arr[active] == null ? "—" : price(arr[active]!);
    switch (id) {
      case "sma":
        return `SMA ${PERIODS.sma} ${v(data.sma)}`;
      case "ema":
        return `EMA ${PERIODS.ema} ${v(data.ema)}`;
      case "vwap":
        return `VWAP ${v(data.vwap)}`;
      case "rsi":
        return `RSI ${PERIODS.rsi} ${data.rsi[active] == null ? "—" : data.rsi[active]!.toFixed(1)}`;
      case "macd":
        return `MACD ${v(data.macd.line)} · signal ${v(data.macd.signal)}`;
      case "bands":
        return `Bands ${v(data.bands.lower)} to ${v(data.bands.upper)}`;
      case "volume":
        return null; // shown in the legend row
    }
  };

  return (
    <figure
      className={cn("w-full", className)}
      data-testid="chart"
      data-tf={tf}
      data-bars={bars.length}
      data-indicators={key}
      data-dataset={dataset}
    >
      {/* Legend: the same numbers a screen reader needs, in text. */}
      <div
        className="mb-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-base"
        data-testid="chart-legend"
        aria-live={cursor != null ? "polite" : "off"}
      >
        {bar ? (
          <>
            <span className="font-black">{barTime(bar.time, tf)}</span>
            <span className={cn("font-black", up ? "text-gain-text" : "text-loss-text")}>
              {up ? "▲ up" : "▼ down"}
            </span>
            <span className="font-mono">O {price(bar.open)}</span>
            <span className="font-mono">H {price(bar.high)}</span>
            <span className="font-mono">L {price(bar.low)}</span>
            <span className="font-mono">C {price(bar.close)}</span>
            {indicators.includes("volume") && (
              <span className="font-mono">Vol {compact(bar.volume)}</span>
            )}
          </>
        ) : null}
      </div>
      {indicators.some((i) => i !== "volume") && (
        <ul
          className="mb-1 flex flex-wrap gap-x-4 gap-y-0.5 text-base text-muted"
          aria-label="Indicator values"
        >
          {indicators.map((id) =>
            values(id) ? (
              <li key={id} className="font-mono">
                {values(id)}
              </li>
            ) : null,
          )}
        </ul>
      )}
      <div
        className="relative overflow-hidden rounded-2xl border-2 border-border bg-surface"
        style={{ height: total }}
      >
        <div ref={hostRef} className="absolute inset-0" aria-hidden="true" />
        {api && overlay && (
          <div
            className="pointer-events-none absolute top-0 left-0"
            style={{ width: api.width, height: api.height }}
          >
            {overlay(api)}
          </div>
        )}
      </div>
      <p className="sr-only">
        {`Chart with ${bars.length} candles. ${first && last ? `It starts at ${price(first.open)} on ${barTime(first.time, tf)} and ends at ${price(last.close)} on ${barTime(last.time, tf)}. The highest price is ${price(hi)} and the lowest is ${price(lo)}.` : ""} ${indicators.length ? `Showing: ${indicators.map((i) => INDICATOR_LABEL[i]).join(", ")}.` : ""}`}
      </p>
      <figcaption className="mt-1 text-center text-base text-muted" data-testid="chart-source">
        {label.short}. {label.real ? "Not live." : "Not real."} Chart by{" "}
        <a
          href="https://www.tradingview.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 items-center font-bold text-brand underline"
        >
          TradingView
        </a>
        .
      </figcaption>
    </figure>
  );
}

export type { ChartColors };
