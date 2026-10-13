"use client";

import { Flame, Zap } from "lucide-react";
import { useMemo } from "react";
import { computeStreak, dateKey, levelFromXp } from "@/lib/progress";
import { useProgress } from "@/store/progress";
import { cn } from "@/lib/utils";

export function useStats() {
  const totalXp = useProgress((s) => s.totalXp);
  const days = useProgress((s) => s.days);
  return useMemo(() => {
    const today = dateKey(new Date());
    const streak = computeStreak(days, today);
    return {
      totalXp,
      xpToday: days[today]?.xp ?? 0,
      streak: streak.current,
      streakTodayDone: streak.todayDone,
      ...levelFromXp(totalXp),
    };
  }, [days, totalXp]);
}

export function StreakChip({ className }: { className?: string }) {
  const { streak, streakTodayDone } = useStats();
  return (
    <div
      className={cn(
        "inline-flex min-h-12 items-center gap-1.5 rounded-2xl px-3 font-extrabold",
        className,
      )}
      aria-label={`Streak: ${streak} ${streak === 1 ? "day" : "days"}`}
    >
      <Flame
        className={cn("size-6", streakTodayDone ? "fill-flame text-flame" : "text-muted")}
        aria-hidden
      />
      <span className={cn("tabular", streakTodayDone ? "text-flame-text" : "text-muted")}>
        {streak}
      </span>
    </div>
  );
}

export function XpChip({ className }: { className?: string }) {
  const totalXp = useProgress((s) => s.totalXp); // only needs the total, not the streak math
  return (
    <div
      className={cn(
        "inline-flex min-h-12 items-center gap-1.5 rounded-2xl px-3 font-extrabold",
        className,
      )}
      aria-label={`${totalXp} experience points`}
    >
      <Zap className="size-6 fill-reward text-reward" aria-hidden />
      <span className="tabular">{totalXp}</span>
    </div>
  );
}
