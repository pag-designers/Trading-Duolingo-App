import type { NodeType } from "@/lib/content/schema";

export const FOCUS_MAX = 5;
export const FOCUS_BONUS_XP = 3;
export const REPEAT_XP = 5;
export const CHEST_XP = 15;

const RULES: Record<NodeType, { base: number; perFirstTry: number; perfect: number }> = {
  lesson: { base: 10, perFirstTry: 2, perfect: 5 },
  practice: { base: 8, perFirstTry: 1, perfect: 3 },
  chart: { base: 10, perFirstTry: 2, perfect: 5 },
  trade: { base: 12, perFirstTry: 2, perfect: 5 },
  boss: { base: 20, perFirstTry: 3, perfect: 10 },
  chest: { base: CHEST_XP, perFirstTry: 0, perfect: 0 },
};

export interface XpInput {
  nodeType: NodeType;
  questionCount: number;
  firstTryCorrect: number;
  /** Times the Focus meter filled during the session. */
  focusFills: number;
  /** The learner finished this step before. */
  repeat: boolean;
}

export interface XpBreakdown {
  base: number;
  accuracy: number;
  perfect: number;
  focus: number;
  total: number;
}

/** Score 0–100: share of questions answered right on the first try. Informational only. */
export function scoreOf(questionCount: number, firstTryCorrect: number): number {
  return questionCount === 0 ? 100 : Math.round((100 * firstTryCorrect) / questionCount);
}

/** XP for finishing a step. Repeats are a flat small amount, so reviewing is worth doing (and keeps a streak alive). There is no daily cap yet: XP is the learner's own motivation, not a score (see DECISIONS D-017). */
export function calcXp(i: XpInput): XpBreakdown {
  if (i.repeat) return { base: REPEAT_XP, accuracy: 0, perfect: 0, focus: 0, total: REPEAT_XP };
  const r = RULES[i.nodeType];
  const accuracy = r.perFirstTry * i.firstTryCorrect;
  const perfect = i.questionCount > 0 && i.firstTryCorrect === i.questionCount ? r.perfect : 0;
  const focus = FOCUS_BONUS_XP * i.focusFills;
  return { base: r.base, accuracy, perfect, focus, total: r.base + accuracy + perfect + focus };
}
