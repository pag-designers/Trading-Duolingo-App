"use client";

import { Crown, Snowflake, TrendingUp } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { buildLeague, tierForLevel } from "@/lib/league";
import { dateKey, freezesHeld, levelFromXp, weekStart, weekTotals } from "@/lib/progress";
import { cn } from "@/lib/utils";
import { useProfile } from "@/store/profile";
import { useProgress } from "@/store/progress";

/** This week against last week: you only ever race yourself here (BRIEF §3). */
export function WeekCard() {
  const days = useProgress((s) => s.days);
  const today = dateKey(new Date());
  const { thisWeek, lastWeek } = weekTotals(days, today);
  const top = Math.max(thisWeek, lastWeek, 1);
  const ahead = thisWeek > lastWeek;

  return (
    <Card className="space-y-3" data-testid="week-card" data-this={thisWeek} data-last={lastWeek}>
      <CardTitle className="flex items-center gap-2">
        <TrendingUp className="size-6 text-brand" aria-hidden /> You vs you
      </CardTitle>
      {[
        { label: "This week", value: thisWeek, color: "bg-brand" },
        { label: "Last week", value: lastWeek, color: "bg-border-strong" },
      ].map((r) => (
        <div key={r.label}>
          <div className="flex justify-between text-base font-bold">
            <span>{r.label}</span>
            <span className="tabular">{r.value} XP</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-surface-2" aria-hidden>
            <div
              className={cn("h-full rounded-full transition-[width] duration-500", r.color)}
              style={{ width: `${(r.value / top) * 100}%` }}
            />
          </div>
        </div>
      ))}
      <p className="text-base text-muted">
        {ahead
          ? "You are ahead of last week. Keep going!"
          : lastWeek === 0
            ? "Every XP you earn this week sets your first mark."
            : `Last week you earned ${lastWeek} XP. You can beat it!`}
      </p>
    </Card>
  );
}

/** Trader Ranks: Bronze to Diamond by level, with a board of made-up practice rivals. */
export function LeagueCard() {
  const days = useProgress((s) => s.days);
  const totalXp = useProgress((s) => s.totalXp);
  const name = useProfile((s) => s.displayName);
  const today = dateKey(new Date());
  const { thisWeek } = weekTotals(days, today);
  const { level } = levelFromXp(totalXp);
  const tier = tierForLevel(level);
  const rows = buildLeague(weekStart(today), { name, xp: thisWeek });
  const you = rows.find((r) => r.isYou);

  return (
    <Card className="space-y-3" data-testid="league-card" data-tier={tier}>
      <CardTitle className="flex items-center gap-2">
        <Crown className="size-6 text-reward-press" aria-hidden /> Trader Ranks: {tier}
      </CardTitle>
      <p className="text-base text-muted">
        Your rank grows with your level. You are number {you?.rank} this week. The other names are
        practice rivals. They are made up, not real people.
      </p>
      <ol className="space-y-1">
        {rows.map((r) => (
          <li
            key={r.name}
            data-you={r.isYou}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-base",
              r.isYou ? "bg-brand-soft font-extrabold" : "",
            )}
          >
            <span className="tabular w-6 text-right text-muted">{r.rank}</span>
            <span className="flex-1 truncate">{r.isYou ? `${r.name} (you)` : r.name}</span>
            <span className="tabular font-bold">{r.xp} XP</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

/** Streak and freezes in one line. */
export function FreezeNote() {
  const days = useProgress((s) => s.days);
  const held = freezesHeld(days);
  return (
    <p
      className="flex items-center gap-2 text-base text-muted"
      data-testid="freeze-note"
      data-freezes={held}
    >
      <Snowflake className="size-5 text-info-text" aria-hidden />
      {held === 0
        ? "Earn a streak freeze on every 7th day of your streak."
        : `${held} streak ${held === 1 ? "freeze" : "freezes"} ready. A freeze saves one missed day.`}
    </p>
  );
}
