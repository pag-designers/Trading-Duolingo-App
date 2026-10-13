import { describe, expect, it } from "vitest";
import type { Question, Slide } from "@/lib/content/lesson-schema";
import { correctAnswerText, gradeAnswer, isAnswerComplete } from "./grade";
import { pickPoolQuestions, seededRng, shuffle } from "./pool";
import { buildSteps, progressFraction, sessionReducer, startSession, summarize } from "./session";
import { calcXp, FOCUS_BONUS_XP, FOCUS_MAX, REPEAT_XP, scoreOf } from "./xp";

const mc: Question = {
  id: "q-mc",
  type: "mc",
  prompt: "Pick one.",
  explanation: "Because.",
  options: [
    { id: "a", text: "A" },
    { id: "b", text: "B" },
  ],
  answer: "b",
};
const tf: Question = { id: "q-tf", type: "tf", prompt: "True?", explanation: "Yes.", answer: true };
const match: Question = {
  id: "q-match",
  type: "match",
  prompt: "Match.",
  explanation: "Ok.",
  pairs: [
    { id: "p1", term: "One", definition: "1" },
    { id: "p2", term: "Two", definition: "2" },
    { id: "p3", term: "Three", definition: "3" },
  ],
};
const chartTap: Question = {
  id: "q-tap",
  type: "chart",
  prompt: "Tap it.",
  explanation: "Ok.",
  ask: "tap",
  answerIndex: 2,
  candles: [1, 2, 3, 4].map((n) => ({ o: n, h: n + 1, l: n - 1, c: n + 0.5 })),
};
const chartChoice: Question = {
  id: "q-chart",
  type: "chart",
  prompt: "Up or down?",
  explanation: "Ok.",
  ask: "choice",
  options: [
    { id: "up", text: "Up" },
    { id: "down", text: "Down" },
  ],
  answer: "up",
  candles: [1, 2, 3, 4].map((n) => ({ o: n, h: n + 1, l: n - 1, c: n + 0.5 })),
};
const build: Question = {
  id: "q-build",
  type: "build",
  prompt: "Build.",
  explanation: "Ok.",
  slots: [
    { id: "s1", label: "Profit =" },
    { id: "s2", label: "minus" },
  ],
  blocks: [
    { id: "sell", text: "sell price" },
    { id: "buy", text: "buy price" },
  ],
  answer: { s1: "sell", s2: "buy" },
};
const slide = (id: string): Slide => ({ id, text: "Hello there.", defines: [] });

describe("gradeAnswer", () => {
  it("grades multiple choice and true/false", () => {
    expect(gradeAnswer(mc, { type: "mc", optionId: "b" }).correct).toBe(true);
    expect(gradeAnswer(mc, { type: "mc", optionId: "a" }).correct).toBe(false);
    expect(gradeAnswer(tf, { type: "tf", value: true }).correct).toBe(true);
    expect(gradeAnswer(tf, { type: "tf", value: false }).correct).toBe(false);
  });
  it("grades match with partial counts", () => {
    const all = gradeAnswer(match, { type: "match", links: { p1: "p1", p2: "p2", p3: "p3" } });
    expect(all).toMatchObject({ correct: true, partsRight: 3, partsTotal: 3 });
    const some = gradeAnswer(match, { type: "match", links: { p1: "p1", p2: "p3", p3: "p2" } });
    expect(some).toMatchObject({ correct: false, partsRight: 1 });
  });
  it("grades chart tap and choice", () => {
    expect(gradeAnswer(chartTap, { type: "chart", index: 2 }).correct).toBe(true);
    expect(gradeAnswer(chartTap, { type: "chart", index: 1 }).correct).toBe(false);
    expect(gradeAnswer(chartChoice, { type: "chart", optionId: "up" }).correct).toBe(true);
    expect(gradeAnswer(chartChoice, { type: "chart", optionId: "down" }).correct).toBe(false);
  });
  it("grades build slot by slot", () => {
    expect(gradeAnswer(build, { type: "build", placed: { s1: "sell", s2: "buy" } }).correct).toBe(
      true,
    );
    const swapped = gradeAnswer(build, { type: "build", placed: { s1: "buy", s2: "sell" } });
    expect(swapped).toMatchObject({ correct: false, partsRight: 0, partsTotal: 2 });
  });
  it("treats an answer of the wrong type as wrong", () => {
    expect(gradeAnswer(mc, { type: "tf", value: true }).correct).toBe(false);
  });
});

describe("isAnswerComplete / correctAnswerText", () => {
  it("knows when Check can be pressed", () => {
    expect(isAnswerComplete(mc, null)).toBe(false);
    expect(isAnswerComplete(mc, { type: "mc", optionId: "a" })).toBe(true);
    expect(isAnswerComplete(match, { type: "match", links: { p1: "p1" } })).toBe(false);
    expect(isAnswerComplete(build, { type: "build", placed: { s1: "sell" } })).toBe(false);
    expect(isAnswerComplete(build, { type: "build", placed: { s1: "sell", s2: "buy" } })).toBe(
      true,
    );
    expect(isAnswerComplete(chartTap, { type: "chart" })).toBe(false);
  });
  it("describes the right answer", () => {
    expect(correctAnswerText(mc)).toBe("B");
    expect(correctAnswerText(tf)).toBe("True");
    expect(correctAnswerText(build)).toBe("Profit = sell price minus buy price");
    expect(correctAnswerText(chartTap)).toBe("Candle number 3");
  });
});

describe("session reducer — unlimited hearts, one retry, Focus meter", () => {
  const run = () => startSession(buildSteps([slide("s1")], [mc, tf]));

  it("walks slide → question → feedback → next", () => {
    let s = run();
    expect(s.phase).toBe("step");
    s = sessionReducer(s, { type: "next" });
    s = sessionReducer(s, { type: "submit", answer: { type: "mc", optionId: "b" } });
    expect(s.phase).toBe("feedback");
    expect(s.last?.grade.correct).toBe(true);
    s = sessionReducer(s, { type: "continue" });
    s = sessionReducer(s, { type: "submit", answer: { type: "tf", value: true } });
    s = sessionReducer(s, { type: "continue" });
    expect(s.phase).toBe("done");
    expect(summarize(s)).toMatchObject({ questionCount: 2, firstTryCorrect: 2, score: 100 });
  });

  it("a wrong answer never blocks: it queues exactly one retry", () => {
    let s = startSession(buildSteps([], [mc]));
    s = sessionReducer(s, { type: "submit", answer: { type: "mc", optionId: "a" } });
    expect(s.last?.retryQueued).toBe(true);
    expect(s.steps).toHaveLength(2);
    s = sessionReducer(s, { type: "continue" });
    // second try, wrong again: no further retry, we move on
    s = sessionReducer(s, { type: "submit", answer: { type: "mc", optionId: "a" } });
    expect(s.last?.retryQueued).toBe(false);
    s = sessionReducer(s, { type: "continue" });
    expect(s.phase).toBe("done");
    expect(summarize(s)).toMatchObject({ questionCount: 1, firstTryCorrect: 0, score: 0 });
  });

  it("a retry answered right still counts as not first-try", () => {
    let s = startSession(buildSteps([], [mc]));
    s = sessionReducer(s, { type: "submit", answer: { type: "mc", optionId: "a" } });
    s = sessionReducer(s, { type: "continue" });
    s = sessionReducer(s, { type: "submit", answer: { type: "mc", optionId: "b" } });
    expect(s.results["q-mc"]).toMatchObject({ firstTry: false, gotIt: true });
  });

  it("the Focus meter fills on right answers, never drops, and reports a fill once", () => {
    const qs: Question[] = Array.from({ length: FOCUS_MAX + 1 }, (_, i) => ({
      ...tf,
      id: `q${i}`,
    }));
    let s = startSession(buildSteps([], qs));
    // one wrong answer first: the meter must not go below zero or lose progress later
    s = sessionReducer(s, { type: "submit", answer: { type: "tf", value: false } });
    expect(s.focus).toBe(0);
    s = sessionReducer(s, { type: "continue" });
    let fills = 0;
    for (let i = 1; i <= FOCUS_MAX; i++) {
      s = sessionReducer(s, { type: "submit", answer: { type: "tf", value: true } });
      if (s.justFilled) fills += 1;
      s = sessionReducer(s, { type: "continue" });
      expect(s.justFilled).toBe(false);
    }
    expect(fills).toBe(1);
    expect(s.focusFills).toBe(1);
    expect(s.focus).toBe(0);
  });

  it("ignores actions in the wrong phase", () => {
    const s = run();
    expect(sessionReducer(s, { type: "continue" })).toBe(s);
    expect(sessionReducer(s, { type: "submit", answer: { type: "tf", value: true } })).toBe(s); // on a slide
  });

  it("an empty lesson is immediately done; progress runs 0 → 1", () => {
    expect(startSession([]).phase).toBe("done");
    let s = run();
    expect(progressFraction(s)).toBe(0);
    s = sessionReducer(s, { type: "next" });
    expect(progressFraction(s)).toBeCloseTo(1 / 3);
  });
});

describe("xp", () => {
  it("pays base + accuracy + perfect + focus for a first run", () => {
    const x = calcXp({
      nodeType: "lesson",
      questionCount: 5,
      firstTryCorrect: 5,
      focusFills: 1,
      repeat: false,
    });
    expect(x).toEqual({ base: 10, accuracy: 10, perfect: 5, focus: FOCUS_BONUS_XP, total: 28 });
  });
  it("pays no perfect bonus when something was missed", () => {
    expect(
      calcXp({
        nodeType: "lesson",
        questionCount: 5,
        firstTryCorrect: 4,
        focusFills: 0,
        repeat: false,
      }).perfect,
    ).toBe(0);
  });
  it("repeats are a flat 5", () => {
    expect(
      calcXp({
        nodeType: "boss",
        questionCount: 10,
        firstTryCorrect: 10,
        focusFills: 2,
        repeat: true,
      }).total,
    ).toBe(REPEAT_XP);
  });
  it("a lesson with no questions is not 'perfect'", () => {
    expect(
      calcXp({
        nodeType: "lesson",
        questionCount: 0,
        firstTryCorrect: 0,
        focusFills: 0,
        repeat: false,
      }).perfect,
    ).toBe(0);
  });
  it("scores whole numbers", () => {
    expect(scoreOf(3, 2)).toBe(67);
    expect(scoreOf(0, 0)).toBe(100);
  });
});

describe("pool", () => {
  it("is deterministic for a seed and never changes the questions", () => {
    const a = pickPoolQuestions(
      [
        [mc, tf],
        [match, build],
      ],
      1,
      [chartTap],
      seededRng(7),
    );
    const b = pickPoolQuestions(
      [
        [mc, tf],
        [match, build],
      ],
      1,
      [chartTap],
      seededRng(7),
    );
    expect(a.map((q) => q.id)).toEqual(b.map((q) => q.id));
    expect(a).toHaveLength(3);
    for (const q of a) expect([mc, tf, match, build, chartTap]).toContain(q);
  });
  it("takes at most perLesson from each source and keeps all own questions", () => {
    const out = pickPoolQuestions([[mc, tf, match]], 2, [build], seededRng(1));
    expect(out).toHaveLength(3);
    expect(out.map((q) => q.id)).toContain("q-build");
  });
  it("shuffle returns a permutation", () => {
    const out = shuffle([1, 2, 3, 4, 5], seededRng(3));
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
