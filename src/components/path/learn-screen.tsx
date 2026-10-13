"use client";

import { Flame, Zap } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Wick } from "@/components/mascot/wick";
import { NodeSheet, SkillMap } from "@/components/path/skill-map";
import { useStats } from "@/components/shell/stats";
import { RiskReminder } from "@/components/risk-reminder";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { FreezeNote, LeagueCard, WeekCard } from "@/components/progress/week-and-league";
import { Ring } from "@/components/ui/ring";
import { findCurrentNode } from "@/lib/content/outline";
import type { Outline, OutlineNode, OutlineUnit } from "@/lib/content/schema";
import { dailyGoalFraction } from "@/lib/progress";
import { useProfile } from "@/store/profile";
import { useProgress } from "@/store/progress";
import { useSettings } from "@/store/settings";

function GoalCard() {
  const { xpToday, streak, level, fraction, xpIntoLevel, xpForNext } = useStats();
  const goal = useSettings((s) => s.dailyXpGoal);
  const f = dailyGoalFraction(xpToday, goal);
  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-4">
        <Ring fraction={f} size={84} label={`Daily goal: ${xpToday} of ${goal} XP`}>
          <Zap className="size-8 fill-reward text-reward" aria-hidden />
        </Ring>
        <div>
          <CardTitle>Daily goal</CardTitle>
          <p className="tabular text-lg text-muted">
            {xpToday} / {goal} XP
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
        <Flame className="size-8 fill-flame text-flame" aria-hidden />
        <p className="font-bold">
          {streak === 0 ? "Start a streak today!" : `${streak}-day streak`}
        </p>
      </div>
      <FreezeNote />
      <div>
        <div className="mb-1 flex justify-between text-sm font-bold text-muted">
          <span>Level {level}</span>
          <span className="tabular">
            {xpIntoLevel} / {xpForNext}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label={`Level ${level} progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(fraction * 100)}
          className="h-3 overflow-hidden rounded-full bg-surface-2"
        >
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-500"
            style={{ width: `${fraction * 100}%` }}
          />
        </div>
      </div>
    </Card>
  );
}

/** Small daily-goal ring shown in the Continue card on phones (the full card is desktop-only). */
function GoalRing() {
  const { xpToday } = useStats();
  const goal = useSettings((s) => s.dailyXpGoal);
  return (
    <Ring
      fraction={dailyGoalFraction(xpToday, goal)}
      size={64}
      stroke={8}
      label={`Daily goal: ${xpToday} of ${goal} XP`}
      className="shrink-0 lg:hidden"
    >
      <Zap className="size-6 fill-reward text-reward" aria-hidden />
    </Ring>
  );
}

export function LearnScreen({ outline }: { outline: Outline }) {
  const name = useProfile((s) => s.displayName);
  const mascot = useProfile((s) => s.mascotName);
  const accessory = useProfile((s) => s.accessory);
  const nodes = useProgress((s) => s.nodes);
  const current = findCurrentNode(outline, (id) => nodes[id]?.status === "done");
  const [target, setTarget] = useState<{ node: OutlineNode; unit: OutlineUnit } | null>(null);
  const currentUnit = current ? outline.units.find((u) => u.id === current.unitId) : undefined;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Card className="mb-8 flex items-center gap-4" data-testid="continue-card">
        <Wick mood="wave" accessory={accessory} size={88} name={mascot} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black tracking-wide text-muted uppercase">
            {currentUnit ? `Unit ${currentUnit.number} · ${currentUnit.title}` : "All done!"}
          </p>
          <h1 className="text-2xl">{name ? `Hi ${name}!` : "Hi there!"}</h1>
          {current ? (
            <>
              <p className="text-lg text-muted">Next: {current.node.title}</p>
              {current.node.ready ? (
                <Button size="lg" className="mt-3" asChild>
                  <Link href={`/lesson/${current.node.id}`} data-testid="continue">
                    Continue
                  </Link>
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="mt-3"
                  data-testid="continue"
                  onClick={() =>
                    currentUnit && setTarget({ node: current.node, unit: currentUnit })
                  }
                >
                  Continue
                </Button>
              )}
            </>
          ) : (
            <p className="text-lg text-muted">You finished every step. Amazing!</p>
          )}
        </div>
        <GoalRing />
      </Card>

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="order-2 lg:order-1">
          <SkillMap outline={outline} />
          <RiskReminder className="mx-auto mb-6 max-w-md" />
        </div>
        <aside className="hidden lg:sticky lg:top-6 lg:order-2 lg:block lg:self-start">
          <div className="space-y-4">
            <GoalCard />
            <WeekCard />
            <LeagueCard />
          </div>
        </aside>
      </div>

      <NodeSheet target={target} state="current" onClose={() => setTarget(null)} />
    </div>
  );
}
