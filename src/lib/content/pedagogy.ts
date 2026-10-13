import type { Lesson } from "./lesson-schema";
import { sentenceCount } from "./audit";
import type { Outline } from "./schema";

export type PedagogyCheck =
  "one-idea-per-slide" | "objective-mapping" | "enough-practice" | "pool-size";

export interface PedagogyFinding {
  check: PedagogyCheck;
  where: string;
  message: string;
}

/** A slide teaches one idea: at most 3 sentences and a handful of terms. */
export const MAX_SLIDE_SENTENCES = 3;
export const MAX_SLIDE_TERMS = 4;
/** A lesson that teaches (has slides) needs enough questions to practice what it taught. */
export const MIN_QUESTIONS_PER_LESSON = 5;
/** A practice or boss step should end up with at least this many questions. */
export const MIN_POOL_QUESTIONS = 6;

/** Teaching-quality rules that need no judgement call: the Pedagogy agent runs these on every lesson. */
export function checkPedagogy(lessons: Lesson[], outline: Outline): PedagogyFinding[] {
  const out: PedagogyFinding[] = [];
  const byId = new Map(lessons.map((l) => [l.id, l]));
  const nodeType = new Map(
    outline.units.flatMap((u) => u.nodes.map((n) => [n.id, n.type] as const)),
  );

  for (const l of lessons) {
    for (const s of l.slides) {
      const n = sentenceCount(s.text);
      if (n > MAX_SLIDE_SENTENCES)
        out.push({
          check: "one-idea-per-slide",
          where: `${l.id} › slide ${s.id}`,
          message: `${n} sentences (max ${MAX_SLIDE_SENTENCES})`,
        });
      if (s.defines.length > MAX_SLIDE_TERMS)
        out.push({
          check: "one-idea-per-slide",
          where: `${l.id} › slide ${s.id}`,
          message: `defines ${s.defines.length} terms (max ${MAX_SLIDE_TERMS})`,
        });
    }

    // Every objective is practiced by at least one question.
    const practiced = new Set(l.questions.map((q) => q.objective).filter(Boolean));
    for (const o of l.objectives) {
      if (!practiced.has(o.id))
        out.push({
          check: "objective-mapping",
          where: `${l.id} › objective ${o.id}`,
          message: "no question practices this objective",
        });
    }

    // A lesson that teaches needs practice.
    if (l.slides.length > 0 && l.questions.length < MIN_QUESTIONS_PER_LESSON) {
      out.push({
        check: "enough-practice",
        where: l.id,
        message: `${l.questions.length} questions (min ${MIN_QUESTIONS_PER_LESSON})`,
      });
    }

    // Practice and boss steps: pool plus own questions must be enough to be worth playing.
    const type = nodeType.get(l.id);
    if ((type === "practice" || type === "boss") && l.pool) {
      const pooled = l.pool.from.reduce(
        (n, src) => n + Math.min(l.pool!.perLesson, byId.get(src)?.questions.length ?? 0),
        0,
      );
      const total = pooled + l.questions.length;
      if (total < MIN_POOL_QUESTIONS)
        out.push({
          check: "pool-size",
          where: l.id,
          message: `only ${total} questions (min ${MIN_POOL_QUESTIONS})`,
        });
    }
  }
  return out;
}
