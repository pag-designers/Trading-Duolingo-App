import {
  clampScore,
  NODE_STATUSES,
  type DayMap,
  type NodeRecord,
  type ProgressState,
} from "./progress";

/** Untrusted input (a backup file): same shape as the store, but `status` may be any string. */
export type ProgressSnapshot = Omit<ProgressState, "nodes"> & {
  nodes: Record<string, Omit<NodeRecord, "status"> & { status: string }>;
};

export interface IntegrityProblem {
  code:
    | "xp_mismatch"
    | "not_a_number"
    | "negative"
    | "frozen_with_xp"
    | "freeze_overspent"
    | "done_without_date"
    | "bad_score"
    | "bad_status"
    | "bad_attempts";
  message: string;
}

const STATUSES: ReadonlySet<string> = new Set(NODE_STATUSES);

/** Cross-check progress numbers against each other. Pure, so the agent and the app can share it. */
export function checkProgress(p: ProgressSnapshot): IntegrityProblem[] {
  const problems: IntegrityProblem[] = [];
  const numbers = [
    p.totalXp,
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
  if (p.totalXp < 0) {
    problems.push({ code: "negative", message: "totalXp is negative" });
  }
  const earned = Object.values(p.days).filter((d) => d.freezeEarned).length;
  const used = Object.values(p.days).filter((d) => d.frozen).length;
  if (used > earned) {
    problems.push({
      code: "freeze_overspent",
      message: `${used} frozen days but only ${earned} freezes earned`,
    });
  }
  for (const [date, d] of Object.entries(p.days)) {
    if (d.frozen && d.xp > 0) {
      problems.push({
        code: "frozen_with_xp",
        message: `day ${date} is marked frozen but has ${d.xp} XP`,
      });
    }
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
      bestScore: clampScore(n.bestScore),
      attempts: Math.max(status === "done" ? 1 : 0, n.attempts),
      completedAt: status === "done" ? (n.completedAt ?? new Date(0).toISOString()) : n.completedAt,
    };
  }
  const totalXp = Object.values(days).reduce((sum, d) => sum + d.xp, 0);
  return { totalXp, days, nodes };
}
