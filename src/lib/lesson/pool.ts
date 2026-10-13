import type { Question } from "@/lib/content/lesson-schema";

/** A seeded random number generator (mulberry32) so tests and "same lesson, same questions" are deterministic. */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates shuffle (returns a new array). */
export function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * Pick `perLesson` questions from each source lesson (so every earlier lesson is revisited),
 * then mix them with the step's own questions. Question objects are never copied or changed.
 */
export function pickPoolQuestions(
  sources: Question[][],
  perLesson: number,
  own: Question[],
  rng: () => number,
): Question[] {
  const picked = sources.flatMap((qs) => shuffle(qs, rng).slice(0, perLesson));
  return shuffle([...own, ...picked], rng);
}
