"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useState } from "react";
import { Wick } from "@/components/mascot/wick";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { findCurrentNode } from "@/lib/content/outline";
import type { Outline, OutlineNode, OutlineUnit } from "@/lib/content/schema";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useProgress } from "@/store/progress";
import { NODE_META, WIGGLE } from "./node-meta";

type NodeState = "done" | "current" | "upcoming";

function unitVars(n: number): React.CSSProperties {
  return {
    ["--unit" as string]: `var(--unit-${n})`,
    ["--unit-press" as string]: `var(--unit-${n}-press)`,
  };
}

function PathNode({
  node,
  index,
  state,
  onOpen,
}: {
  node: OutlineNode;
  index: number;
  state: NodeState;
  onOpen: () => void;
}) {
  const { icon: Icon, label } = NODE_META[node.type];
  const big = node.type === "boss" || node.type === "chest";
  const size = big ? "size-24" : "size-[4.5rem]";
  return (
    <div
      className="relative flex flex-col items-center py-2.5"
      style={{ transform: `translateX(${WIGGLE[index % WIGGLE.length]}rem)` }}
    >
      {state === "current" && (
        <>
          <span
            className="absolute -top-5 z-10 rounded-xl border-2 border-border bg-surface px-3 py-1 text-sm font-black tracking-wide text-brand uppercase shadow-[0_3px_0_0_var(--border)]"
            aria-hidden
          >
            Start
          </span>
          <span
            className={cn("node-pulse absolute rounded-full bg-[var(--unit)]", size)}
            style={{ top: "0.625rem" }}
            aria-hidden
          />
        </>
      )}
      <motion.button
        type="button"
        onClick={onOpen}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ ...spring.pop, delay: Math.min(index, 8) * 0.04 }}
        whileTap={{ y: 5 }}
        aria-label={`${node.title}. ${label}. ${state === "done" ? "Finished." : state === "current" ? "Up next." : ""}`}
        data-testid={`node-${node.id}`}
        data-state={state}
        className={cn(
          "relative z-[1] grid place-items-center rounded-full border-0 text-white",
          size,
          state === "done"
            ? "bg-reward text-reward-fg shadow-[0_6px_0_0_var(--reward-press)]"
            : state === "current"
              ? "bg-[var(--unit)] shadow-[0_6px_0_0_var(--unit-press)]"
              : "bg-[var(--unit)] opacity-60 shadow-[0_6px_0_0_var(--unit-press)]",
        )}
      >
        {state === "done" ? (
          <Check className="size-9 stroke-[4]" aria-hidden />
        ) : (
          <Icon className={cn(big ? "size-11" : "size-8", "fill-white/25")} aria-hidden />
        )}
      </motion.button>
      <span className="mt-2 max-w-40 text-center text-sm leading-tight font-bold text-muted">
        {node.title}
      </span>
    </div>
  );
}

function UnitSection({
  unit,
  states,
  onOpen,
}: {
  unit: OutlineUnit;
  states: Record<string, NodeState>;
  onOpen: (node: OutlineNode, unit: OutlineUnit) => void;
}) {
  const done = unit.nodes.filter((n) => states[n.id] === "done").length;
  return (
    <section aria-labelledby={`${unit.id}-title`} style={unitVars(unit.number)} className="mb-10">
      <div className="mx-auto max-w-md rounded-3xl bg-[var(--unit)] p-5 text-[var(--unit-fg)] shadow-[0_5px_0_0_var(--unit-press)]">
        <p className="text-sm font-black tracking-widest uppercase">Unit {unit.number}</p>
        <h2 id={`${unit.id}-title`} className="text-2xl">
          {unit.title}
        </h2>
        <p className="mt-1 text-base">{unit.tagline}</p>
        <p
          className="mt-2 text-sm font-bold"
          aria-label={`${done} of ${unit.nodes.length} steps finished`}
        >
          {done} / {unit.nodes.length} steps
        </p>
      </div>
      <div className="mt-10 flex flex-col items-center">
        {unit.nodes.map((node, i) => (
          <PathNode
            key={node.id}
            node={node}
            index={i}
            state={states[node.id] ?? "upcoming"}
            onOpen={() => onOpen(node, unit)}
          />
        ))}
      </div>
    </section>
  );
}

export function NodeSheet({
  target,
  state,
  onClose,
}: {
  target: { node: OutlineNode; unit: OutlineUnit } | null;
  state: NodeState;
  onClose: () => void;
}) {
  const node = target?.node;
  const meta = node ? NODE_META[node.type] : null;
  return (
    <Sheet
      open={!!target}
      onOpenChange={(o) => !o && onClose()}
      title={node?.title ?? ""}
      description={target && meta ? `Unit ${target.unit.number} · ${meta.label}` : undefined}
    >
      {node && meta && (
        <div className="space-y-5">
          <p className="text-lg">{node.goal}</p>
          {node.ready ? (
            <Button size="lg" block>
              {state === "done" ? "Practice again" : "Start"}
            </Button>
          ) : (
            <div
              className="flex items-center gap-4 rounded-2xl bg-surface-2 p-4"
              data-testid="coming-soon"
            >
              <Wick mood="sleepy" size={72} decorative />
              <p className="text-base">
                <strong>Wick is still drawing this one.</strong> It will open in an upcoming update.
              </p>
            </div>
          )}
          {["trade", "boss", "chart"].includes(node.type) && (
            <p className="text-sm text-muted">
              Pretend money only. Most day traders lose money in real life.
            </p>
          )}
        </div>
      )}
    </Sheet>
  );
}

export function SkillMap({ outline }: { outline: Outline }) {
  const nodes = useProgress((s) => s.nodes);
  const isDone = (id: string) => nodes[id]?.status === "done";
  const current = findCurrentNode(outline, isDone);
  const states: Record<string, NodeState> = {};
  for (const unit of outline.units) {
    for (const n of unit.nodes) {
      states[n.id] = isDone(n.id) ? "done" : current?.node.id === n.id ? "current" : "upcoming";
    }
  }
  const [target, setTarget] = useState<{ node: OutlineNode; unit: OutlineUnit } | null>(null);

  return (
    <>
      {outline.units.map((unit) => (
        <UnitSection
          key={unit.id}
          unit={unit}
          states={states}
          onOpen={(node, u) => setTarget({ node, unit: u })}
        />
      ))}
      <NodeSheet
        target={target}
        state={target ? (states[target.node.id] ?? "upcoming") : "upcoming"}
        onClose={() => setTarget(null)}
      />
    </>
  );
}
