import { clamp } from "./utils";

/** Pure progress math: levels, daily goal, streaks. Streaks are DERIVED from daily activity. */

export const NODE_STATUSES = ["not_started", "in_progress", "done"] as const;
export type NodeStatus = (typeof NODE_STATUSES)[number];

export interface NodeRecord {
  status: NodeStatus;
  bestScore: number; // 0..100 — informational only, never blocks progress
  attempts: number;
  completedAt: string | null;
}

/** What the progress store persists (and what backups and the integrity checks read). */
export interface ProgressState {
  totalXp: number;
  days: DayMap;
  nodes: Record<string, NodeRecord>;
  /** Streak freezes the learner owns (earned from streaks, wired up in CP1). */
  freezes: number;
}

/** A score is a whole number from 0 to 100; anything else (NaN, huge, negative) is clamped. */
export const clampScore = (score: number): number =>
  Number.isFinite(score) ? clamp(Math.round(score), 0, 100) : 0;

export interface DayActivity {
  xp: number;
  lessonsDone: number;
}

export type DayMap = Record<string, DayActivity>;

/** Level n starts at 50 * (n-1)^2 XP: L1 0, L2 50, L3 200, L4 450 … */
export function levelFromXp(totalXp: number): {
  level: number;
  xpIntoLevel: number;
  xpForNext: number;
  fraction: number;
} {
  const xp = Math.max(0, Math.floor(totalXp));
  const level = Math.floor(Math.sqrt(xp / 50)) + 1;
  const start = 50 * (level - 1) ** 2;
  const next = 50 * level ** 2;
  return {
    level,
    xpIntoLevel: xp - start,
    xpForNext: next - start,
    fraction: (xp - start) / (next - start),
  };
}

/** YYYY-MM-DD in the learner's local time. */
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(key: string, delta: number): string {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return dateKey(new Date(y, m - 1, d + delta));
}

/**
 * Current streak = consecutive days with XP > 0 ending today. If today has no XP yet the streak
 * is still alive (it ends yesterday) — the learner has until midnight to keep it.
 * `frozenDays` are days a streak freeze covers: they bridge a gap but do not add to the count.
 */
export function computeStreak(
  days: DayMap,
  today: string,
  frozenDays: ReadonlySet<string> = new Set(),
): { current: number; todayDone: boolean } {
  const active = (k: string) => (days[k]?.xp ?? 0) > 0;
  const todayDone = active(today);
  let cursor = todayDone ? today : addDays(today, -1);
  let count = 0;
  for (;;) {
    if (active(cursor)) count += 1;
    else if (!frozenDays.has(cursor)) break;
    cursor = addDays(cursor, -1);
  }
  return { current: count, todayDone };
}

/** Best streak ever across all recorded days (frozen days bridge gaps). */
export function longestStreak(days: DayMap, frozenDays: ReadonlySet<string> = new Set()): number {
  const keys = Object.keys(days)
    .filter((k) => (days[k]?.xp ?? 0) > 0)
    .sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const k of keys) {
    if (prev === null) run = 1;
    else {
      let gap = addDays(prev, 1);
      let bridged = true;
      while (gap < k) {
        if (!frozenDays.has(gap)) {
          bridged = false;
          break;
        }
        gap = addDays(gap, 1);
      }
      run = bridged ? run + 1 : 1;
    }
    best = Math.max(best, run);
    prev = k;
  }
  return best;
}

export function dailyGoalFraction(xpToday: number, goal: number): number {
  if (goal <= 0) return 1;
  return clamp(xpToday / goal, 0, 1);
}
