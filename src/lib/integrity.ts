import type { DayMap } from "./progress";

export interface ProgressSnapshot {
  totalXp: number;
  days: DayMap;
  nodes: Record<
    string,
    { status: string; bestScore: number; attempts: number; completedAt: string | null }
  >;
  freezes: number;
}

export interface IntegrityProblem {
  code:
    | "xp_mismatch"
    | "not_a_number"
    | "negative"
    | "done_without_date"
    | "bad_score"
    | "bad_status"
    | "bad_attempts";
  message: string;
}

const STATUSES = new Set(["not_started", "in_progress", "done"]);

/** Cross-check progress numbers against each other. Pure, so the agent and the app can share it. */
export function checkProgress(p: ProgressSnapshot): IntegrityProblem[] {
  const problems: IntegrityProblem[] = [];
  const numbers = [
    p.totalXp,
    p.freezes,
    ...Object.values(p.days).flatMap((d) => [d.xp, d.lessonsDone]),
    ...Object.values(p.nodes).flatMap((n) => [n.bestScore, n.attempts]),
  ];
  if (numbers.some((n) => !Number.isFinite(n))) {
    // Comparisons with NaN are always false, so catch it explicitly before the other rules.
    problems.push({
      code: "not_a_number",
      message: "A number in the progress data is NaN or infinite",
    });
  }
  const daySum = Object.values(p.days).reduce((sum, d) => sum + d.xp, 0);
  if (p.totalXp !== daySum) {
    problems.push({
      code: "xp_mismatch",
      message: `totalXp is ${p.totalXp} but daily XP adds up to ${daySum}`,
    });
  }
  if (p.totalXp < 0 || p.freezes < 0) {
    problems.push({ code: "negative", message: "totalXp or freezes is negative" });
  }
  for (const [date, d] of Object.entries(p.days)) {
    if (d.xp < 0 || d.lessonsDone < 0)
      problems.push({ code: "negative", message: `day ${date} has negative values` });
  }
  for (const [id, n] of Object.entries(p.nodes)) {
    if (!STATUSES.has(n.status))
      problems.push({ code: "bad_status", message: `${id}: unknown status "${n.status}"` });
    if (n.status === "done" && !n.completedAt) {
      problems.push({
        code: "done_without_date",
        message: `${id} is done but has no completion date`,
      });
    }
    if (n.bestScore < 0 || n.bestScore > 100)
      problems.push({
        code: "bad_score",
        message: `${id}: score ${n.bestScore} is outside 0..100`,
      });
    if (n.attempts < 0 || (n.status === "done" && n.attempts < 1)) {
      problems.push({
        code: "bad_attempts",
        message: `${id}: attempts ${n.attempts} does not match status`,
      });
    }
  }
  return problems;
}

/** Repair what can be repaired safely. XP is recomputed from the daily record, which is the source. */
export function repairProgress(p: ProgressSnapshot): ProgressSnapshot {
  const days: DayMap = {};
  for (const [k, d] of Object.entries(p.days))
    days[k] = { xp: Math.max(0, d.xp), lessonsDone: Math.max(0, d.lessonsDone) };
  const nodes: ProgressSnapshot["nodes"] = {};
  for (const [id, n] of Object.entries(p.nodes)) {
    const status = STATUSES.has(n.status) ? n.status : "not_started";
    nodes[id] = {
      status,
      bestScore: Math.min(100, Math.max(0, Math.round(n.bestScore))),
      attempts: Math.max(status === "done" ? 1 : 0, n.attempts),
      completedAt: status === "done" ? (n.completedAt ?? new Date(0).toISOString()) : n.completedAt,
    };
  }
  const totalXp = Object.values(days).reduce((sum, d) => sum + d.xp, 0);
  return { totalXp, days, nodes, freezes: Math.max(0, p.freezes) };
}
