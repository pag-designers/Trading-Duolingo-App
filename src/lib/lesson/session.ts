import type { Question, Slide } from "@/lib/content/lesson-schema";
import { gradeAnswer, type Answer, type Grade } from "./grade";
import { FOCUS_MAX, scoreOf } from "./xp";

export type Step =
  { kind: "slide"; slide: Slide } | { kind: "question"; question: Question; retry: boolean };

export type Phase = "step" | "feedback" | "done";

export interface QuestionResult {
  questionId: string;
  firstTry: boolean;
  /** Eventually answered right (on the retry). */
  gotIt: boolean;
}

export interface SessionState {
  steps: Step[];
  index: number;
  phase: Phase;
  /** The last graded answer, shown in the feedback panel. */
  last: { questionId: string; grade: Grade; answer: Answer; retryQueued: boolean } | null;
  results: Record<string, QuestionResult>;
  /** Focus meter 0..FOCUS_MAX: fills on right answers, never drops. */
  focus: number;
  focusFills: number;
  /** True for one step after the meter filled (drives the confetti). */
  justFilled: boolean;
  /** Furthest the progress bar has been. A retry makes the lesson longer, but the bar never goes backwards. */
  progressMax: number;
}

export type SessionAction =
  | { type: "next" } // slide → next step
  | { type: "submit"; answer: Answer } // question → feedback
  | { type: "continue" }; // feedback → next step

/** Build the step list: teach slides first, then the questions. */
export function buildSteps(slides: Slide[], questions: Question[]): Step[] {
  return [
    ...slides.map((slide): Step => ({ kind: "slide", slide })),
    ...questions.map((question): Step => ({ kind: "question", question, retry: false })),
  ];
}

export function startSession(steps: Step[]): SessionState {
  return {
    steps,
    index: 0,
    phase: steps.length === 0 ? "done" : "step",
    last: null,
    results: {},
    focus: 0,
    focusFills: 0,
    justFilled: false,
    progressMax: 0,
  };
}

function advance(s: SessionState): SessionState {
  const index = s.index + 1;
  const progressMax = Math.max(s.progressMax, s.steps.length === 0 ? 1 : index / s.steps.length);
  return {
    ...s,
    index,
    progressMax,
    phase: index >= s.steps.length ? "done" : "step",
    last: null,
    justFilled: false,
  };
}

/**
 * The lesson state machine. Nothing here can lock the learner out:
 * - a wrong answer shows the right answer, then the question comes back ONCE at the end;
 * - the Focus meter only goes up.
 */
export function sessionReducer(s: SessionState, action: SessionAction): SessionState {
  const current = s.steps[s.index];
  switch (action.type) {
    case "next":
      return s.phase === "step" && current?.kind === "slide" ? advance(s) : s;

    case "submit": {
      if (s.phase !== "step" || current?.kind !== "question") return s;
      const q = current.question;
      const grade = gradeAnswer(q, action.answer);
      const prev = s.results[q.id];
      const firstTry = prev ? prev.firstTry : grade.correct;
      const results = {
        ...s.results,
        [q.id]: { questionId: q.id, firstTry, gotIt: grade.correct || !!prev?.gotIt },
      };

      let steps = s.steps;
      let retryQueued = false;
      if (!grade.correct && !current.retry) {
        steps = [...s.steps, { kind: "question", question: q, retry: true }];
        retryQueued = true;
      }

      let focus = s.focus;
      let focusFills = s.focusFills;
      let justFilled = false;
      if (grade.correct) {
        focus += 1;
        if (focus >= FOCUS_MAX) {
          focus = 0;
          focusFills += 1;
          justFilled = true;
        }
      }
      return {
        ...s,
        steps,
        phase: "feedback",
        last: { questionId: q.id, grade, answer: action.answer, retryQueued },
        results,
        focus,
        focusFills,
        justFilled,
      };
    }

    case "continue":
      return s.phase === "feedback" ? advance(s) : s;
  }
}

/** Numbers for the completion screen. */
export function summarize(s: SessionState): {
  questionCount: number;
  firstTryCorrect: number;
  score: number;
  focusFills: number;
} {
  const all = Object.values(s.results);
  const firstTryCorrect = all.filter((r) => r.firstTry).length;
  return {
    questionCount: all.length,
    firstTryCorrect,
    score: scoreOf(all.length, firstTryCorrect),
    focusFills: s.focusFills,
  };
}

/** Progress bar fraction: how far through the steps. It only ever moves forward, even when a retry is added. */
export function progressFraction(s: SessionState): number {
  return s.phase === "done" ? 1 : Math.min(1, s.progressMax);
}
