import { gradeLab, labAnswerText, isLabComplete, type LabAnswer } from "@/lib/chart/lab";
import type { Question } from "@/lib/content/lesson-schema";

/** What the learner gave as an answer, one shape per question type. */
export type Answer =
  | { type: "mc"; optionId: string }
  | { type: "tf"; value: boolean }
  /** pairId of the term → pairId of the definition the learner linked to it. */
  | { type: "match"; links: Record<string, string> }
  | { type: "chart"; optionId?: string; index?: number }
  /** slotId → blockId */
  | { type: "build"; placed: Record<string, string> }
  /** An interactive chart question (draw a line, switch a timeframe, pick indicators…). */
  | { type: "lab"; lab: LabAnswer };

export interface Grade {
  correct: boolean;
  /** Match and build: how many parts were right (for gentle partial feedback). */
  partsRight?: number;
  partsTotal?: number;
}

/** Grade an answer. Pure: no state, no randomness. A wrong type of answer is simply wrong. */
export function gradeAnswer(q: Question, a: Answer): Grade {
  if (q.type !== a.type) return { correct: false };
  switch (q.type) {
    case "mc":
      return { correct: a.type === "mc" && a.optionId === q.answer };
    case "tf":
      return { correct: a.type === "tf" && a.value === q.answer };
    case "match": {
      if (a.type !== "match") return { correct: false };
      const right = q.pairs.filter((p) => a.links[p.id] === p.id).length;
      return { correct: right === q.pairs.length, partsRight: right, partsTotal: q.pairs.length };
    }
    case "chart": {
      if (a.type !== "chart") return { correct: false };
      if (q.ask === "tap") return { correct: a.index !== undefined && a.index === q.answerIndex };
      return { correct: a.optionId !== undefined && a.optionId === q.answer };
    }
    case "build": {
      if (a.type !== "build") return { correct: false };
      const slots = Object.keys(q.answer);
      const right = slots.filter((s) => a.placed[s] === q.answer[s]).length;
      return { correct: right === slots.length, partsRight: right, partsTotal: slots.length };
    }
    case "lab":
      return { correct: a.type === "lab" && gradeLab(q, a.lab) };
  }
}

/** Has the learner given enough to press "Check"? (Never blocks anything: just enables the button.) */
export function isAnswerComplete(q: Question, a: Answer | null): boolean {
  if (!a || a.type !== q.type) return false;
  switch (q.type) {
    case "mc":
      return a.type === "mc" && a.optionId !== "";
    case "tf":
      return a.type === "tf";
    case "match":
      return a.type === "match" && Object.keys(a.links).length === q.pairs.length;
    case "chart":
      return a.type === "chart" && (q.ask === "tap" ? a.index !== undefined : !!a.optionId);
    case "build":
      return a.type === "build" && Object.keys(a.placed).length === q.slots.length;
    case "lab":
      return a.type === "lab" && isLabComplete(q.task, a.lab);
  }
}

/** A short, human line that says what the right answer was (shown after a miss). */
export function correctAnswerText(q: Question): string {
  switch (q.type) {
    case "mc":
      return q.options.find((o) => o.id === q.answer)?.text ?? "";
    case "tf":
      return q.answer ? "True" : "False";
    case "match":
      return q.pairs.map((p) => `${p.term} = ${p.definition}`).join(" · ");
    case "chart":
      if (q.ask === "tap") return `Candle number ${(q.answerIndex ?? 0) + 1}`;
      return q.options?.find((o) => o.id === q.answer)?.text ?? "";
    case "build":
      return q.slots
        .map((s) => `${s.label} ${q.blocks.find((b) => b.id === q.answer[s.id])?.text ?? ""}`)
        .join(" ");
    case "lab":
      return labAnswerText(q);
  }
}
