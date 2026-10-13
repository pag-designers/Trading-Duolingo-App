"use client";

import { motion } from "framer-motion";
import { Flame, Snowflake, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Wick } from "@/components/mascot/wick";
import { RiskReminder } from "@/components/risk-reminder";
import { Button } from "@/components/ui/button";
import { Ring } from "@/components/ui/ring";
import type { Lesson } from "@/lib/content/lesson-schema";
import type { OutlineNode, OutlineUnit } from "@/lib/content/schema";
import { calcXp, CHEST_XP } from "@/lib/lesson/xp";
import { summarize, type SessionState } from "@/lib/lesson/session";
import {
  computeStreak,
  dailyGoalFraction,
  dateKey,
  freezesHeld,
  levelFromXp,
} from "@/lib/progress";
import { playSound } from "@/lib/sound";
import { useProfile } from "@/store/profile";
import { useProgress } from "@/store/progress";
import { useSettings } from "@/store/settings";
import { Confetti } from "./confetti";
import { CountUp } from "./count-up";
import type { NextStep } from "./lesson-player";

const TITLE: Record<string, string> = {
  lesson: "Lesson complete!",
  practice: "Practice complete!",
  boss: "Boss round complete!",
  chart: "Chart challenge complete!",
  trade: "Trade challenge complete!",
  chest: "Chest opened!",
};

interface Props {
  node: OutlineNode;
  unit: OutlineUnit;
  lesson: Lesson;
  state: SessionState;
  next: NextStep | null;
  onRestart: () => void;
}

/**
 * The finish line. It records the step once (progress, XP, streak), then celebrates with rolling numbers,
 * a flame, the daily goal ring and confetti. Reviewing an old lesson gives a small flat bonus.
 */
export function CompleteScreen({ node, lesson, state, next, onRestart }: Props) {
  const router = useRouter();
  const mascotName = useProfile((s) => s.mascotName);
  const accessory = useProfile((s) => s.accessory);
  const goal = useSettings((s) => s.dailyXpGoal);
  const finishNode = useProgress((s) => s.finishNode);

  const today = dateKey(new Date());
  // Captured before we record anything, so "before" really is before.
  const [before] = useState(() => {
    const p = useProgress.getState();
    return {
      repeat: p.nodes[node.id]?.status === "done",
      streak: computeStreak(p.days, today).current,
      level: levelFromXp(p.totalXp).level,
      freezeEarnedToday: !!p.days[today]?.freezeEarned,
    };
  });

  const summary = summarize(state);
  const xp = calcXp({
    nodeType: node.type,
    questionCount: summary.questionCount,
    firstTryCorrect: summary.firstTryCorrect,
    focusFills: summary.focusFills,
    repeat: before.repeat,
  });

  const recorded = useRef(false);
  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;
    finishNode({ nodeId: node.id, score: summary.score, xp: xp.total });
    playSound("levelup");
  }, [finishNode, node.id, summary.score, xp.total]);

  const days = useProgress((s) => s.days);
  const totalXp = useProgress((s) => s.totalXp);
  const streak = computeStreak(days, today).current;
  const level = levelFromXp(totalXp);
  const streakUp = streak > before.streak;
  const leveledUp = level.level > before.level;
  const earnedFreeze = !!days[today]?.freezeEarned && !before.freezeEarnedToday;

  useEffect(() => {
    if (!streakUp) return;
    const t = setTimeout(() => playSound("streak"), 700);
    return () => clearTimeout(t);
  }, [streakUp]);

  const rows: { label: string; value: number; show: boolean }[] = before.repeat
    ? [{ label: "Review bonus", value: xp.base, show: true }]
    : [
        { label: node.type === "chest" ? "Chest bonus" : "Finishing", value: xp.base, show: true },
        { label: "Right on the first try", value: xp.accuracy, show: xp.accuracy > 0 },
        { label: "Perfect round", value: xp.perfect, show: xp.perfect > 0 },
        { label: "Focus bonus", value: xp.focus, show: xp.focus > 0 },
      ];

  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh max-w-xl flex-col items-center gap-5 overflow-x-clip px-4 py-8 text-center"
      data-testid="complete"
      data-xp={xp.total}
    >
      <Confetti count={40} seed={7} />
      <Wick mood="cheer" accessory={accessory} size={150} name={mascotName} />
      <h1 className="text-3xl">{TITLE[node.type] ?? "Done!"}</h1>
      <p className="text-xl text-muted" data-testid="complete-sub">
        {summary.questionCount === 0
          ? "You read the whole lesson."
          : `You got ${summary.firstTryCorrect} of ${summary.questionCount} right on the first try.`}
      </p>

      <section
        aria-label="XP earned"
        className="w-full rounded-3xl border-2 border-border bg-surface p-5 text-left shadow-[0_3px_0_0_var(--border)]"
      >
        <ul className="space-y-2 text-lg">
          {rows
            .filter((r) => r.show)
            .map((r) => (
              <li key={r.label} className="flex justify-between">
                <span>{r.label}</span>
                <span className="tabular font-bold">+{r.value}</span>
              </li>
            ))}
        </ul>
        <div className="mt-3 flex items-center justify-between border-t-2 border-border pt-3 text-2xl font-black">
          <span className="flex items-center gap-2">
            <Zap className="size-7 fill-reward text-reward" aria-hidden /> XP
          </span>
          <span data-testid="xp-total">
            +<CountUp to={xp.total} />
          </span>
        </div>
      </section>

      <div className="grid w-full grid-cols-2 gap-3">
        <div
          className="rounded-3xl border-2 border-border bg-surface p-4"
          data-testid="streak-card"
          data-streak={streak}
          data-streak-up={streakUp}
        >
          <motion.div
            animate={streakUp ? { scale: [1, 1.3, 1], rotate: [0, -8, 8, 0] } : undefined}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mx-auto w-fit"
          >
            <Flame className="size-12 fill-flame text-flame" aria-hidden />
          </motion.div>
          <p className="text-3xl font-black">
            <span className="tabular">{streak}</span>
          </p>
          <p className="text-base text-muted">{streak === 1 ? "day streak" : "day streak"}</p>
          {streakUp && <p className="mt-1 font-bold text-flame-text">Streak grew!</p>}
        </div>
        <div className="rounded-3xl border-2 border-border bg-surface p-4">
          <Ring
            fraction={dailyGoalFraction(days[today]?.xp ?? 0, goal)}
            size={64}
            stroke={8}
            label={`Daily goal: ${days[today]?.xp ?? 0} of ${goal} XP`}
            className="mx-auto"
          >
            <Zap className="size-6 fill-reward text-reward" aria-hidden />
          </Ring>
          <p className="mt-1 text-3xl font-black">
            <span className="tabular">{days[today]?.xp ?? 0}</span>
            <span className="text-lg text-muted"> / {goal}</span>
          </p>
          <p className="text-base text-muted">daily goal</p>
        </div>
      </div>

      {(leveledUp || earnedFreeze) && (
        <div className="w-full space-y-2" role="status">
          {leveledUp && (
            <p className="rounded-2xl bg-brand-soft p-3 text-lg font-bold">
              Level up! You are now level {level.level}.
            </p>
          )}
          {earnedFreeze && (
            <p className="flex items-center justify-center gap-2 rounded-2xl bg-brand-soft p-3 text-lg font-bold">
              <Snowflake className="size-6 text-info-text" aria-hidden /> You earned a streak
              freeze! ({freezesHeld(days)} ready)
            </p>
          )}
        </div>
      )}

      {lesson.touchesTrading && <RiskReminder className="w-full text-left" />}

      <div className="mt-auto grid w-full gap-3">
        <Button size="lg" block onClick={() => router.push("/")} data-testid="finish-btn">
          Continue
        </Button>
        {next?.ready && (
          <Button
            size="lg"
            block
            variant="secondary"
            onClick={() => router.push(`/lesson/${next.id}`)}
            data-testid="next-lesson-btn"
          >
            Next: {next.title}
          </Button>
        )}
        {node.type !== "chest" && (
          <Button size="lg" block variant="ghost" onClick={onRestart} data-testid="again-btn">
            Practice again (+5 XP)
          </Button>
        )}
      </div>
    </main>
  );
}

export { CHEST_XP };
