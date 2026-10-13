import { clamp } from "./utils";

/** Pure progress math: levels, daily goal, streaks, freezes, weeks, merging. Streaks are DERIVED from daily activity. */

export const NODE_STATUSES = ["not_started", "in_progress", "done"] as const;
export type NodeStatus = (typeof NODE_STATUSES)[number];

export interface NodeRecord {
  status: NodeStatus;
  bestScore: number; // 0..100 — informational only, never blocks progress
  attempts: number;
  completedAt: string | null;
}

export interface DayActivity {
  xp: number;
  lessonsDone: number;
  /** A streak freeze was earned on this day (every 7th streak day). */
  freezeEarned?: boolean;
  /** This day was missed but a streak freeze covered it. */
  frozen?: boolean;
}

export type DayMap = Record<string, DayActivity>;

/** What the progress store persists (and what backups, sync and the integrity checks read). */
export interface ProgressState {
  totalXp: number;
  days: DayMap;
  nodes: Record<string, NodeRecord>;
}

/** A score is a whole number from 0 to 100; anything else (NaN, huge, negative) is clamped. */
export const clampScore = (score: number): number =>
  Number.isFinite(score) ? clamp(Math.round(score), 0, 100) : 0;

export const EMPTY_PROGRESS: ProgressState = { totalXp: 0, days: {}, nodes: {} };

// ── Levels ──────────────────────────────────────────────────────────────────

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

// ── Dates ───────────────────────────────────────────────────────────────────

/** YYYY-MM-DD in the learner's local time. */
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(key: string, delta: number): string {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return dateKey(new Date(y, m - 1, d + delta));
}

/** The Monday of the week containing `key` (weeks run Monday to Sunday). */
export function weekStart(key: string): string {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  const dow = new Date(y, m - 1, d).getDay(); // 0 = Sunday
  return addDays(key, -((dow + 6) % 7));
}

// ── Streaks and freezes ─────────────────────────────────────────────────────

export const FREEZE_EVERY = 7;
export const MAX_FREEZES = 2;

const hasXp = (days: DayMap, k: string) => (days[k]?.xp ?? 0) > 0;

export function frozenDays(days: DayMap): Set<string> {
  return new Set(Object.keys(days).filter((k) => days[k]?.frozen));
}

/** Freezes the learner holds right now: earned minus used. Derived, so it can never drift. */
export function freezesHeld(days: DayMap): number {
  const all = Object.values(days);
  const earned = all.filter((d) => d.freezeEarned).length;
  const used = all.filter((d) => d.frozen).length;
  return Math.max(0, earned - used);
}

/**
 * Current streak = consecutive days with XP > 0 ending today. If today has no XP yet the streak
 * is still alive (it ends yesterday): the learner has until midnight. Frozen days bridge a gap
 * but do not add to the count.
 */
export function computeStreak(
  days: DayMap,
  today: string,
): { current: number; todayDone: boolean } {
  const frozen = frozenDays(days);
  const todayDone = hasXp(days, today);
  let cursor = todayDone ? today : addDays(today, -1);
  let count = 0;
  for (;;) {
    if (hasXp(days, cursor)) count += 1;
    else if (!frozen.has(cursor)) break;
    cursor = addDays(cursor, -1);
  }
  return { current: count, todayDone };
}

/** Best streak ever across all recorded days (frozen days bridge gaps). */
export function longestStreak(days: DayMap): number {
  const frozen = frozenDays(days);
  const keys = Object.keys(days)
    .filter((k) => hasXp(days, k))
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
        if (!frozen.has(gap)) {
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

/**
 * Spend streak freezes on a gap of missed days, but only if they cover the WHOLE gap
 * (a freeze that can't save the streak is not wasted). Call when the app opens.
 */
export function settleFreezes(days: DayMap, today: string): DayMap {
  const frozen = frozenDays(days);
  const counted = Object.keys(days)
    .filter((k) => k < today && (hasXp(days, k) || frozen.has(k)))
    .sort();
  const last = counted.at(-1);
  if (!last) return days;
  const missed: string[] = [];
  for (let d = addDays(last, 1); d < today; d = addDays(d, 1)) missed.push(d);
  if (missed.length === 0 || missed.length > freezesHeld(days)) return days;
  const out = { ...days };
  for (const d of missed) out[d] = { xp: 0, lessonsDone: 0, frozen: true };
  return out;
}

/** Earn a freeze on every 7th streak day (hold at most MAX_FREEZES). */
export function maybeEarnFreeze(days: DayMap, today: string): DayMap {
  const { current, todayDone } = computeStreak(days, today);
  const day = days[today];
  if (!todayDone || !day || day.freezeEarned) return days;
  if (current === 0 || current % FREEZE_EVERY !== 0 || freezesHeld(days) >= MAX_FREEZES)
    return days;
  return { ...days, [today]: { ...day, freezeEarned: true } };
}

// ── Daily goal and weeks ────────────────────────────────────────────────────

export function dailyGoalFraction(xpToday: number, goal: number): number {
  if (goal <= 0) return 1;
  return clamp(xpToday / goal, 0, 1);
}

/** XP this calendar week (Mon–Sun, up to today) and the whole previous week: "against yourself". */
export function weekTotals(days: DayMap, today: string): { thisWeek: number; lastWeek: number } {
  const start = weekStart(today);
  const prevStart = addDays(start, -7);
  let thisWeek = 0;
  let lastWeek = 0;
  for (const [k, d] of Object.entries(days)) {
    if (k >= start && k <= today) thisWeek += d.xp;
    else if (k >= prevStart && k < start) lastWeek += d.xp;
  }
  return { thisWeek, lastWeek };
}

// ── Completing a step ───────────────────────────────────────────────────────

/** Add XP to a day. Ignores NaN, fractions below 1 and negatives. */
export function addXp(p: ProgressState, amount: number, today: string): ProgressState {
  const xp = Math.floor(amount);
  if (!Number.isFinite(xp) || xp <= 0) return p;
  const prev = p.days[today] ?? { xp: 0, lessonsDone: 0 };
  return {
    ...p,
    totalXp: p.totalXp + xp,
    days: { ...p.days, [today]: { ...prev, xp: prev.xp + xp } },
  };
}

/** Mark a step done (or done again). The day's lesson count only goes up on the first completion. */
export function markNodeDone(
  p: ProgressState,
  nodeId: string,
  score: number,
  today: string,
  now: string,
): ProgressState {
  const prev = p.nodes[nodeId];
  const first = prev?.status !== "done";
  const day = p.days[today] ?? { xp: 0, lessonsDone: 0 };
  return {
    ...p,
    nodes: {
      ...p.nodes,
      [nodeId]: {
        status: "done",
        bestScore: Math.max(prev?.bestScore ?? 0, clampScore(score)),
        attempts: (prev?.attempts ?? 0) + 1,
        completedAt: prev?.completedAt ?? now,
      },
    },
    days: first ? { ...p.days, [today]: { ...day, lessonsDone: day.lessonsDone + 1 } } : p.days,
  };
}

export interface Completion {
  nodeId: string;
  score: number;
  xp: number;
  today: string;
  now: string;
}

/** Everything that happens when a step is finished: record it, add XP, maybe earn a freeze. */
export function applyCompletion(p: ProgressState, c: Completion): ProgressState {
  let next = markNodeDone(p, c.nodeId, c.score, c.today, c.now);
  next = addXp(next, c.xp, c.today);
  return { ...next, days: maybeEarnFreeze(next.days, c.today) };
}

// ── Merging two copies (browser and database) ───────────────────────────────

const STATUS_RANK: Record<string, number> = { not_started: 0, in_progress: 1, done: 2 };

/**
 * Merge two copies of the same learner's progress. Progress only ever grows, so taking the larger
 * value of everything converges both sides without clocks. Total XP is recomputed from the days.
 */
export function mergeProgress(a: ProgressState, b: ProgressState): ProgressState {
  const days: DayMap = {};
  for (const k of new Set([...Object.keys(a.days), ...Object.keys(b.days)])) {
    const x = a.days[k];
    const y = b.days[k];
    const day: DayActivity = {
      xp: Math.max(x?.xp ?? 0, y?.xp ?? 0),
      lessonsDone: Math.max(x?.lessonsDone ?? 0, y?.lessonsDone ?? 0),
    };
    if (x?.freezeEarned || y?.freezeEarned) day.freezeEarned = true;
    if (x?.frozen || y?.frozen) day.frozen = true;
    days[k] = day;
  }

  const nodes: Record<string, NodeRecord> = {};
  for (const id of new Set([...Object.keys(a.nodes), ...Object.keys(b.nodes)])) {
    const x = a.nodes[id];
    const y = b.nodes[id];
    if (!x || !y) {
      nodes[id] = { ...(x ?? y)! };
      continue;
    }
    const status =
      (STATUS_RANK[x.status] ?? 0) >= (STATUS_RANK[y.status] ?? 0) ? x.status : y.status;
    const dates = [x.completedAt, y.completedAt].filter((d): d is string => !!d).sort();
    nodes[id] = {
      status,
      bestScore: Math.max(x.bestScore, y.bestScore),
      attempts: Math.max(x.attempts, y.attempts),
      completedAt: dates[0] ?? null,
    };
  }

  const totalXp = Object.values(days).reduce((sum, d) => sum + d.xp, 0);
  return { totalXp, days, nodes };
}

/** Do two copies hold the same progress? (Used to skip pointless sync writes.) */
export function sameProgress(a: ProgressState, b: ProgressState): boolean {
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}

function canonical(p: ProgressState) {
  const sortObj = <T>(o: Record<string, T>) =>
    Object.fromEntries(Object.entries(o).sort(([x], [y]) => x.localeCompare(y)));
  return { totalXp: p.totalXp, days: sortObj(p.days), nodes: sortObj(p.nodes) };
}
