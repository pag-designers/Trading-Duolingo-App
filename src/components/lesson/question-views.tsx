"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { useMemo, useRef, useState, type ReactNode } from "react";
import type {
  BuildQuestion,
  ChartQuestion,
  MatchQuestion,
  McQuestion,
  Question,
  TfQuestion,
} from "@/lib/content/lesson-schema";
import type { Answer } from "@/lib/lesson/grade";
import { seededRng, shuffle } from "@/lib/lesson/pool";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { LabView } from "@/components/chart/lab-view";
import { CandleChart } from "./candle-chart";

/** Shared props. `checked` is true once the answer was graded; then `grade` tells which parts were right. */
export interface ViewProps<Q extends Question, A extends Answer> {
  q: Q;
  answer: A | null;
  onChange: (answer: A) => void;
  checked: boolean;
}

const optionClass = (state: "idle" | "selected" | "right" | "wrong" | "dim") =>
  cn(
    "flex min-h-14 w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-lg font-bold transition-colors",
    state === "idle" &&
      "border-border bg-surface text-foreground shadow-[0_3px_0_0_var(--border)] hover:bg-surface-2",
    state === "selected" &&
      "border-brand bg-brand-soft text-foreground shadow-[0_3px_0_0_var(--brand)]",
    state === "right" &&
      "border-gain-press bg-gain-soft text-gain-text shadow-[0_3px_0_0_var(--gain-press)]",
    state === "wrong" &&
      "border-loss-press bg-loss-soft text-loss-text shadow-[0_3px_0_0_var(--loss-press)]",
    state === "dim" && "border-border bg-surface text-muted opacity-70",
  );

function Mark({ state }: { state: "right" | "wrong" | null }) {
  if (state === "right")
    return <Check className="ml-auto size-6 shrink-0" aria-label="Correct" role="img" />;
  if (state === "wrong")
    return <X className="ml-auto size-6 shrink-0" aria-label="Not this one" role="img" />;
  return null;
}

const Key = ({ n }: { n: number }) => (
  <span
    aria-hidden
    className="grid size-8 shrink-0 place-items-center rounded-lg border-2 border-current/30 text-sm font-black"
  >
    {n}
  </span>
);

// ── multiple choice (also used by chart "choice") ────────────────────────────

function Choices({
  options,
  correctId,
  selected,
  checked,
  onPick,
  label,
}: {
  options: { id: string; text: string }[];
  correctId: string;
  selected: string | null;
  checked: boolean;
  onPick: (id: string) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-3">
      {options.map((o, i) => {
        const isSel = selected === o.id;
        const state = checked
          ? o.id === correctId
            ? "right"
            : isSel
              ? "wrong"
              : "dim"
          : isSel
            ? "selected"
            : "idle";
        return (
          <motion.button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={isSel}
            disabled={checked}
            data-testid={`option-${o.id}`}
            data-state={state}
            whileTap={checked ? undefined : { y: 3 }}
            onClick={() => onPick(o.id)}
            className={optionClass(state)}
          >
            <Key n={i + 1} />
            <span>{o.text}</span>
            <Mark state={state === "right" ? "right" : state === "wrong" ? "wrong" : null} />
          </motion.button>
        );
      })}
    </div>
  );
}

export function McView({
  q,
  answer,
  onChange,
  checked,
}: ViewProps<McQuestion, Extract<Answer, { type: "mc" }>>) {
  return (
    <Choices
      options={q.options}
      correctId={q.answer}
      selected={answer?.optionId ?? null}
      checked={checked}
      onPick={(optionId) => onChange({ type: "mc", optionId })}
      label="Choose one answer"
    />
  );
}

export function TfView({
  q,
  answer,
  onChange,
  checked,
}: ViewProps<TfQuestion, Extract<Answer, { type: "tf" }>>) {
  return (
    <Choices
      options={[
        { id: "true", text: "True" },
        { id: "false", text: "False" },
      ]}
      correctId={q.answer ? "true" : "false"}
      selected={answer ? String(answer.value) : null}
      checked={checked}
      onPick={(id) => onChange({ type: "tf", value: id === "true" })}
      label="True or false"
    />
  );
}

// ── chart spot ───────────────────────────────────────────────────────────────

export function ChartView({
  q,
  answer,
  onChange,
  checked,
}: ViewProps<ChartQuestion, Extract<Answer, { type: "chart" }>>) {
  const tap = q.ask === "tap";
  return (
    <div className="space-y-4">
      <CandleChart
        candles={q.candles}
        label={tap ? "Practice chart. Tap a candle." : "Practice chart."}
        onSelect={tap ? (index) => onChange({ type: "chart", index }) : undefined}
        selected={tap ? (answer?.index ?? null) : null}
        correctIndex={tap && checked ? (q.answerIndex ?? null) : null}
        disabled={checked}
      />
      {!tap && q.options && q.answer && (
        <Choices
          options={q.options}
          correctId={q.answer}
          selected={answer?.optionId ?? null}
          checked={checked}
          onPick={(optionId) => onChange({ type: "chart", optionId })}
          label="Choose one answer"
        />
      )}
      {tap && <p className="text-center text-base text-muted">Tap the candle you want to pick.</p>}
    </div>
  );
}

// ── match: tap a word, then tap its meaning (or drag the word onto it) ───────

const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);

export function MatchView({
  q,
  answer,
  onChange,
  checked,
}: ViewProps<MatchQuestion, Extract<Answer, { type: "match" }>>) {
  const links = answer?.links ?? {};
  const [active, setActive] = useState<string | null>(null);
  // Definitions are shuffled once per question (stable between renders).
  const defs = useMemo(() => shuffle(q.pairs, seededRng(hash(q.id))), [q.id, q.pairs]);
  const refs = useRef<Record<string, HTMLElement | null>>({});
  // Number badges: the first linked term is 1, and so on. Numbers, not just colors, show who is linked.
  const numberOf = (termId: string) => Object.keys(links).indexOf(termId) + 1;
  const termOfDef = (defId: string) =>
    Object.entries(links).find(([, d]) => d === defId)?.[0] ?? null;

  const link = (termId: string, defId: string) => {
    const next: Record<string, string> = {};
    for (const [t, d] of Object.entries(links)) if (t !== termId && d !== defId) next[t] = d;
    next[termId] = defId;
    onChange({ type: "match", links: next });
    setActive(null);
    playSound("tap");
  };
  const unlink = (termId: string) => {
    const next = { ...links };
    delete next[termId];
    onChange({ type: "match", links: next });
  };

  const stateOf = (termId: string): "idle" | "selected" | "right" | "wrong" =>
    checked
      ? links[termId] === termId
        ? "right"
        : "wrong"
      : active === termId
        ? "selected"
        : links[termId]
          ? "selected"
          : "idle";

  return (
    <div className="grid gap-4 sm:grid-cols-2" data-testid="match">
      <ul className="grid content-start gap-3" aria-label="Words">
        {q.pairs.map((p) => {
          const n = numberOf(p.id);
          const state = stateOf(p.id);
          return (
            <li key={p.id}>
              <motion.button
                type="button"
                drag={!checked}
                dragSnapToOrigin
                dragElastic={0.2}
                whileDrag={{ scale: 1.04, zIndex: 20 }}
                onDragEnd={(_, info) => {
                  const hit = document
                    .elementsFromPoint(info.point.x - window.scrollX, info.point.y - window.scrollY)
                    .find((el) => (el as HTMLElement).dataset?.defId) as HTMLElement | undefined;
                  if (hit?.dataset.defId) link(p.id, hit.dataset.defId);
                }}
                disabled={checked}
                aria-pressed={active === p.id}
                data-testid={`term-${p.id}`}
                data-state={state}
                onClick={() =>
                  links[p.id] ? unlink(p.id) : setActive(active === p.id ? null : p.id)
                }
                className={optionClass(state)}
                aria-label={`${p.term}${n ? `, linked as number ${n}` : ""}${checked ? (links[p.id] === p.id ? ", correct" : ", not matched") : ""}`}
              >
                {n > 0 && <Key n={n} />}
                <span>{p.term}</span>
                <Mark state={checked ? (links[p.id] === p.id ? "right" : "wrong") : null} />
              </motion.button>
            </li>
          );
        })}
      </ul>
      <ul className="grid content-start gap-3" aria-label="Meanings">
        {defs.map((d) => {
          const owner = termOfDef(d.id);
          const n = owner ? numberOf(owner) : 0;
          const state = checked
            ? owner === d.id
              ? "right"
              : "dim"
            : owner
              ? "selected"
              : active
                ? "idle"
                : "idle";
          return (
            <li key={d.id}>
              <button
                ref={(el) => {
                  refs.current[d.id] = el;
                }}
                type="button"
                data-def-id={d.id}
                data-testid={`def-${d.id}`}
                data-state={state}
                disabled={checked || (!active && !owner)}
                onClick={() => (active ? link(active, d.id) : owner && unlink(owner))}
                className={cn(
                  optionClass(state),
                  !checked && !active && !owner && "cursor-default",
                )}
              >
                {n > 0 && <Key n={n} />}
                <span>{d.definition}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-base text-muted sm:col-span-2">
        {active ? (
          "Now tap its meaning."
        ) : (
          <>
            Tap a word, then tap its meaning.
            {/* Dragging only makes sense with a mouse or a big screen; tapping always works. */}
            <span className="hidden [@media(pointer:fine)]:inline"> You can also drag a word.</span>
          </>
        )}
      </p>
    </div>
  );
}

// ── build: fill the blanks with blocks ───────────────────────────────────────

export function BuildView({
  q,
  answer,
  onChange,
  checked,
}: ViewProps<BuildQuestion, Extract<Answer, { type: "build" }>>) {
  const placed = answer?.placed ?? {};
  const used = new Set(Object.values(placed));
  const nextEmpty = q.slots.find((s) => !placed[s.id]);

  const put = (blockId: string) => {
    if (!nextEmpty) return;
    onChange({ type: "build", placed: { ...placed, [nextEmpty.id]: blockId } });
    playSound("tap");
  };
  const take = (slotId: string) => {
    const next = { ...placed };
    delete next[slotId];
    onChange({ type: "build", placed: next });
  };

  return (
    <div className="space-y-6" data-testid="build">
      <div
        className="flex flex-wrap items-center gap-x-2 gap-y-3 text-xl font-bold"
        aria-label="Your sentence"
      >
        {q.slots.map((s) => {
          const blockId = placed[s.id];
          const block = q.blocks.find((b) => b.id === blockId);
          const right = checked ? blockId === q.answer[s.id] : null;
          return (
            <span key={s.id} className="inline-flex items-center gap-2">
              <span>{s.label}</span>
              <button
                type="button"
                disabled={checked || !block}
                data-testid={`slot-${s.id}`}
                data-state={
                  right === null ? (block ? "selected" : "idle") : right ? "right" : "wrong"
                }
                onClick={() => take(s.id)}
                aria-label={`${s.label}: ${block ? `${block.text}. Tap to remove.` : "empty"}`}
                className={cn(
                  "inline-flex min-h-12 min-w-28 items-center justify-center rounded-xl border-2 border-dashed px-3 text-lg",
                  right === null && !block && "border-border-strong bg-surface-2 text-muted",
                  right === null &&
                    block &&
                    "border-solid border-brand bg-brand-soft text-foreground",
                  right === true && "border-solid border-gain-press bg-gain-soft text-gain-text",
                  right === false && "border-solid border-loss-press bg-loss-soft text-loss-text",
                )}
              >
                {block?.text ?? "…"}
              </button>
            </span>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3" role="group" aria-label="Blocks to use">
        {q.blocks.map((b) => (
          <motion.button
            key={b.id}
            type="button"
            disabled={checked || used.has(b.id)}
            whileTap={{ y: 3 }}
            data-testid={`block-${b.id}`}
            onClick={() => put(b.id)}
            className={cn(
              optionClass(used.has(b.id) ? "dim" : "idle"),
              "w-auto min-w-24 justify-center",
            )}
          >
            {b.text}
          </motion.button>
        ))}
      </div>
      <p className="text-base text-muted">
        Tap a block to fill the next blank. Tap a filled blank to take it back.
      </p>
    </div>
  );
}

// ── pick the right view for a question ───────────────────────────────────────

export function QuestionView({
  q,
  answer,
  onChange,
  checked,
}: {
  q: Question;
  answer: Answer | null;
  onChange: (a: Answer | null) => void;
  checked: boolean;
}): ReactNode {
  const as = <A extends Answer["type"]>(type: A) =>
    answer?.type === type ? (answer as Extract<Answer, { type: A }>) : null;
  switch (q.type) {
    case "mc":
      return <McView q={q} answer={as("mc")} onChange={onChange} checked={checked} />;
    case "tf":
      return <TfView q={q} answer={as("tf")} onChange={onChange} checked={checked} />;
    case "match":
      return <MatchView q={q} answer={as("match")} onChange={onChange} checked={checked} />;
    case "chart":
      return <ChartView q={q} answer={as("chart")} onChange={onChange} checked={checked} />;
    case "build":
      return <BuildView q={q} answer={as("build")} onChange={onChange} checked={checked} />;
    case "lab":
      return <LabView q={q} answer={as("lab")} onChange={onChange} checked={checked} />;
  }
}
