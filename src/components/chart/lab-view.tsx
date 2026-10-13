"use client";

import dynamic from "next/dynamic";
import { useCallback, useId, useMemo, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { solutionFor, type LabAnswer, type Pt } from "@/lib/chart/lab";
import type { LabQuestion } from "@/lib/content/lesson-schema";
import type { Answer } from "@/lib/lesson/grade";
import { windowBarsAt, windowLead } from "@/lib/market/data";
import {
  INDICATORS,
  INDICATOR_LABEL,
  TIMEFRAME_LABEL,
  type IndicatorId,
  type Timeframe,
} from "@/lib/market/types";
import { cn } from "@/lib/utils";
import { vwapAllowed } from "./indicator-data";
import { barSentence, price } from "./format";
import { CursorMark, Shape, measureText } from "./shapes";

const ChartView = dynamic(() => import("./chart-view").then((m) => m.ChartView), {
  ssr: false,
  loading: () => (
    <div
      className="h-72 animate-pulse rounded-2xl bg-surface-2"
      aria-label="Loading chart"
      role="img"
    />
  ),
});

const toggleClass = (on: boolean) =>
  cn(
    "inline-flex min-h-12 items-center justify-center rounded-2xl border-2 px-4 text-base font-black normal-case",
    on
      ? "border-brand bg-brand-soft text-foreground"
      : "border-border bg-surface text-foreground hover:bg-surface-2",
    "disabled:opacity-50",
  );

interface LabViewProps {
  q: LabQuestion;
  answer: Extract<Answer, { type: "lab" }> | null;
  onChange: (a: Answer | null) => void;
  checked: boolean;
}

/**
 * The Chart Lab: a real Lightweight Charts chart with one task. Everything can be done by tapping,
 * by mouse, or with the keyboard (arrow keys move a cursor, Enter places a point).
 */
export function LabView({ q, answer, onChange, checked }: LabViewProps) {
  const task = q.task;
  const [tf, setTf] = useState<Timeframe>(q.window.tf);
  const [on, setOn] = useState<IndicatorId[]>(q.start);
  const [cur, setCur] = useState<Pt | null>(null);
  const [pending, setPending] = useState<Pt | null>(null);
  const [hoverPt, setHoverPt] = useState<Pt | null>(null);
  const [noteAt, setNoteAt] = useState<Pt | null>(null);
  const [noteText, setNoteText] = useState("");
  const [magnet, setMagnet] = useState(true);
  const helpId = useId();

  const bars = useMemo(() => windowBarsAt(q.window, tf), [q.window, tf]);
  const lead = useMemo(() => windowLead(q.window, tf), [q.window, tf]);
  const range = useMemo(
    () => Math.max(...bars.map((b) => b.high)) - Math.min(...bars.map((b) => b.low)),
    [bars],
  );
  const drawn: LabAnswer | null = answer?.lab ?? null;
  const drawing =
    task.kind !== "find-bar" && task.kind !== "timeframe" && task.kind !== "indicators";
  const locked = checked;
  const emit = useCallback(
    (lab: LabAnswer | null) => onChange(lab ? { type: "lab", lab } : null),
    [onChange],
  );

  const offer: IndicatorId[] = q.offer ?? (task.kind === "indicators" ? [...INDICATORS] : []);

  // ── placing things ─────────────────────────────────────────────────────────
  const place = (p: Pt) => {
    if (locked) return;
    setCur(p);
    switch (task.kind) {
      case "find-bar":
        emit({ kind: "find-bar", bar: Math.max(0, Math.min(bars.length - 1, Math.round(p.i))) });
        break;
      case "hline":
        emit({ kind: "hline", price: p.price });
        break;
      case "note":
        setNoteAt(p);
        emit(noteText.trim() ? { kind: "note", at: p, text: noteText.trim() } : null);
        break;
      case "trendline":
      case "box":
      case "fib":
      case "measure":
        if (!pending) {
          setPending(p);
          emit(null);
        } else {
          emit({ kind: task.kind, a: pending, b: p });
          setPending(null);
        }
        break;
      default:
        break;
    }
  };

  const clear = () => {
    setPending(null);
    setNoteAt(null);
    setNoteText("");
    emit(null);
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (locked || e.target !== e.currentTarget) return;
    const mid = Math.floor((bars.length - 1) / 2);
    const base: Pt = cur ?? { i: mid, price: bars[mid]!.close };
    const step = (range / 60) * (e.shiftKey ? 5 : 1);
    let next: Pt | null = null;
    if (!cur && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key))
      next = base;
    else if (e.key === "ArrowLeft")
      next = { ...base, i: Math.max(0, Math.round(base.i) - (e.shiftKey ? 5 : 1)) };
    else if (e.key === "ArrowRight")
      next = { ...base, i: Math.min(bars.length - 1, Math.round(base.i) + (e.shiftKey ? 5 : 1)) };
    else if (e.key === "ArrowUp") next = { ...base, price: base.price + step };
    else if (e.key === "ArrowDown") next = { ...base, price: base.price - step };
    else if (e.key === "Home") next = { ...base, i: 0 };
    else if (e.key === "End") next = { ...base, i: bars.length - 1 };
    if (next) {
      e.preventDefault();
      setCur(next);
      if (task.kind === "find-bar") emit({ kind: "find-bar", bar: Math.round(next.i) });
      return;
    }
    if (e.key === "Escape" && drawing) {
      e.preventDefault();
      clear();
      return;
    }
    // Enter / Space place a point. Once a drawing is finished, Enter is left alone so it checks the answer.
    if ((e.key === "Enter" || e.key === " ") && drawing && cur && !(drawn && !pending)) {
      e.preventDefault();
      place(cur);
    }
  };

  const snapTo = (field: "high" | "low" | "open" | "close") => {
    if (!cur) return;
    const b = bars[Math.max(0, Math.min(bars.length - 1, Math.round(cur.i)))]!;
    setCur({ i: Math.round(cur.i), price: b[field] });
  };

  const toggleIndicator = (id: IndicatorId) => {
    if (locked) return;
    const next = on.includes(id) ? on.filter((x) => x !== id) : [...on, id];
    setOn(next);
    if (task.kind === "indicators") emit({ kind: "indicators", on: next });
  };
  const switchTf = (next: Timeframe) => {
    if (locked) return;
    setTf(next);
    setCur(null);
    setPending(null);
    if (task.kind === "timeframe") emit({ kind: "timeframe", tf: next });
  };

  // ── words under the chart ──────────────────────────────────────────────────
  const curBar = cur ? bars[Math.max(0, Math.min(bars.length - 1, Math.round(cur.i)))] : undefined;
  const hint = (() => {
    if (checked) return "";
    switch (task.kind) {
      case "find-bar":
        return curBar
          ? `Candle ${Math.round(cur!.i) + 1} is picked.`
          : "Tap a candle, or use the arrow keys.";
      case "hline":
        return drawn ? "Nice. Now press Check." : "Tap the chart where the line should go.";
      case "note":
        return noteAt
          ? "Type your note, then press Check."
          : "Tap the candle you want to write on.";
      case "timeframe":
        return "Pick a timeframe below.";
      case "indicators":
        return "Tap the buttons to turn indicators on or off.";
      default:
        return pending ? "Now tap point 2." : drawn ? "Nice. Now press Check." : "Tap point 1.";
    }
  })();
  const placeLabel =
    task.kind === "hline"
      ? "Place line"
      : task.kind === "note"
        ? "Add note here"
        : pending
          ? "Place point 2"
          : "Place point 1";
  const measured = drawn && drawn.kind === "measure" ? measureText(drawn.a, drawn.b) : null;

  const solution = checked ? solutionFor(q, bars) : null;

  return (
    <div className="flex flex-col gap-3" data-testid="lab" data-task={task.kind}>
      {q.timeframes && (
        <div
          role="radiogroup"
          aria-label="Timeframe"
          className="flex flex-wrap gap-2"
          data-testid="lab-timeframes"
        >
          {q.timeframes.map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={tf === t}
              disabled={locked}
              onClick={() => switchTf(t)}
              className={toggleClass(tf === t)}
              data-testid={`tf-${t}`}
            >
              {TIMEFRAME_LABEL[t]}
            </button>
          ))}
        </div>
      )}
      {offer.length > 0 && (
        <div
          role="group"
          aria-label="Indicators"
          className="flex flex-wrap gap-2"
          data-testid="lab-indicators"
        >
          {offer.map((id) => {
            const blocked = id === "vwap" && !vwapAllowed(bars);
            return (
              <button
                key={id}
                type="button"
                aria-pressed={on.includes(id)}
                disabled={locked || blocked}
                title={blocked ? "VWAP needs a chart with several candles each day." : undefined}
                onClick={() => toggleIndicator(id)}
                className={toggleClass(on.includes(id))}
                data-testid={`ind-${id}`}
              >
                {INDICATOR_LABEL[id]}
              </button>
            );
          })}
        </div>
      )}

      <div
        tabIndex={locked ? -1 : 0}
        role="group"
        aria-label="Chart. Click or tap to place things. Arrow keys move a cursor. Enter places a point."
        aria-describedby={helpId}
        onKeyDown={onKey}
        className="rounded-2xl outline-offset-4 focus-visible:outline-4 focus-visible:outline-[var(--focus-ring)]"
        data-testid="lab-chart"
      >
        <ChartView
          bars={bars}
          lead={lead}
          tf={tf}
          dataset={q.window.dataset}
          indicators={on}
          height={drawing || task.kind === "find-bar" ? 300 : 260}
          cursor={task.kind === "find-bar" && cur ? Math.round(cur.i) : null}
          magnet={drawing && magnet}
          onPick={task.kind === "timeframe" || task.kind === "indicators" ? undefined : place}
          onMove={setHoverPt}
          overlay={(api) => (
            <svg
              width={api.width}
              height={api.height}
              className="absolute inset-0 overflow-hidden"
              aria-hidden="true"
            >
              {cur && !locked && (
                <CursorMark
                  api={api}
                  bars={bars}
                  index={Math.round(cur.i)}
                  price={cur.price}
                  showPrice={drawing}
                />
              )}
              {pending && hoverPt && !locked && (
                <Shape api={api} tone="mine" answer={{ kind: "measure", a: pending, b: hoverPt }} />
              )}
              {pending && !locked && (
                <circle
                  cx={api.xOf(pending.i) ?? -20}
                  cy={api.yOf(pending.price) ?? -20}
                  r="6"
                  fill="var(--brand)"
                  stroke="var(--surface)"
                  strokeWidth="2"
                />
              )}
              {noteAt && !drawn && noteText && !locked && (
                <Shape
                  api={api}
                  tone="mine"
                  answer={{ kind: "note", at: noteAt, text: noteText }}
                />
              )}
              {drawn && <Shape api={api} tone="mine" answer={drawn} />}
              {solution &&
                solution.kind === "find-bar" &&
                (() => {
                  const x = api.xOf(solution.bar);
                  return x == null ? null : (
                    <rect
                      x={x - 8}
                      y="0"
                      width="16"
                      height={api.height}
                      fill="none"
                      stroke="var(--flame-text)"
                      strokeWidth="3"
                      strokeDasharray="7 5"
                      rx="4"
                    />
                  );
                })()}
              {solution && <Shape api={api} tone="solution" answer={solution} />}
            </svg>
          )}
        />
      </div>

      <p id={helpId} className="sr-only">
        Use the left and right arrow keys to move to another candle and the up and down arrow keys
        to move the price. Hold Shift to move faster. Press Enter to place a point. Press Escape to
        clear.
      </p>

      <p
        className="min-h-7 text-lg font-bold"
        role="status"
        aria-live="polite"
        data-testid="lab-hint"
      >
        {hint}
        {measured && !checked && <span className="ml-2 font-mono text-brand">{measured}</span>}
      </p>
      {curBar && cur && (
        <p className="sr-only" role="status" aria-live="polite">
          {barSentence(curBar, tf, Math.round(cur.i) + 1)}{" "}
          {drawing ? `Cursor price ${price(cur.price)}.` : ""}
        </p>
      )}

      {task.kind === "note" && noteAt && (
        <label className="flex flex-col gap-1 text-lg font-bold">
          Your note
          <input
            value={noteText}
            maxLength={40}
            disabled={locked}
            onChange={(e) => {
              setNoteText(e.target.value);
              emit(
                e.target.value.trim()
                  ? { kind: "note", at: noteAt, text: e.target.value.trim() }
                  : null,
              );
            }}
            className="min-h-12 rounded-2xl border-2 border-border bg-surface px-4 text-lg font-bold"
            data-testid="note-text"
          />
        </label>
      )}

      {drawing && !locked && (
        <div className="flex flex-wrap items-center gap-2" data-testid="lab-tools">
          <Button
            variant="primary"
            onClick={() => cur && place(cur)}
            disabled={!cur}
            data-testid="place-point"
            className="normal-case"
          >
            {placeLabel}
          </Button>
          <span className="sr-only" id={`${helpId}-snap`}>
            Snap the cursor price to this candle:
          </span>
          {(["high", "low", "open", "close"] as const).map((f) => (
            <Button
              key={f}
              variant="secondary"
              disabled={!cur}
              onClick={() => snapTo(f)}
              data-testid={`snap-${f}`}
              className="normal-case"
              aria-label={`Snap price to the ${f}`}
            >
              {f[0]!.toUpperCase() + f.slice(1)}
            </Button>
          ))}
          <button
            type="button"
            aria-pressed={magnet}
            onClick={() => setMagnet((m) => !m)}
            className={toggleClass(magnet)}
            data-testid="magnet"
          >
            Magnet {magnet ? "on" : "off"}
          </button>
          {(drawn || pending || noteAt) && (
            <Button
              variant="ghost"
              onClick={clear}
              data-testid="clear-drawing"
              className="normal-case"
            >
              Clear
            </Button>
          )}
        </div>
      )}
      {task.kind === "find-bar" && !locked && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            aria-label="Previous candle"
            onClick={() =>
              place({ i: Math.max(0, Math.round(cur?.i ?? bars.length / 2) - 1), price: 0 })
            }
            data-testid="bar-prev"
          >
            ←
          </Button>
          <Button
            variant="secondary"
            aria-label="Next candle"
            onClick={() =>
              place({
                i: Math.min(bars.length - 1, Math.round(cur?.i ?? bars.length / 2) + 1),
                price: 0,
              })
            }
            data-testid="bar-next"
          >
            →
          </Button>
        </div>
      )}
    </div>
  );
}
