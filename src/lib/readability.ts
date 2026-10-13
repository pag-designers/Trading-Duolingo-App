import type { TermMatcher } from "./glossary";

/** Flesch-Kincaid grade limit per sentence. Brief: first-grade reading level, flag anything above grade 2. */
export const READING_LIMIT = 2.0;

/** Split text into sentences at . ! ? followed by a space. */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Words as a reader sees them. Numbers and money amounts count as one short word each. */
export function wordsOf(sentence: string): string[] {
  return sentence.match(/[A-Za-z]+(?:['’][A-Za-z]+)?|\$?\d[\d,.]*%?/g) ?? [];
}

/** Words the vowel-group rule gets wrong. Kept small and boring on purpose. */
const SYLLABLE_EXCEPTIONS: Record<string, number> = {
  every: 2,
  business: 2,
  something: 2,
  everything: 3,
  different: 2,
  evening: 2,
  several: 3,
  general: 3,
  camera: 3,
  chocolate: 2,
  fire: 1,
  hour: 1,
  our: 1,
  people: 2,
  idea: 3,
  real: 1,
  really: 2,
  being: 2,
  seeing: 2,
  going: 2,
};

/** Rough English syllable counter (good enough for grading short, simple sentences). */
export function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 1; // numbers, symbols
  const known = SYLLABLE_EXCEPTIONS[w];
  if (known) return known;
  if (w.length <= 3) return 1;
  // Silent endings: -es / -e after a consonant, -e after a vowel+l (whole, rule, mile), and -ed unless it
  // follows t or d (wanted, needed). A consonant+le ending stays a syllable (table, people).
  let s = w
    .replace(/(?:[^laeiouy]es|(?<![td])ed|[^laeiouy]e|(?<=[aeiouy]l)e)$/, "")
    .replace(/^y/, "");
  s = s.replace(/[aeiouy]{1,3}/g, "A");
  return Math.max(1, (s.match(/A/g) ?? []).length);
}

/** Below this many words a piece of text is a label (title, answer option), not a sentence. */
export const FRAGMENT_WORDS = 5;
/** In a label, every word must be at most this many syllables. */
export const FRAGMENT_MAX_SYLLABLES = 3;

export interface SentenceScore {
  sentence: string;
  words: number;
  syllables: number;
  grade: number;
}

/**
 * Score one sentence. Glossary terms are "defined terms", so each counts as one short word:
 * the lesson teaches them, they are not a reading hurdle.
 */
export function scoreSentence(sentence: string, matcher?: TermMatcher): SentenceScore {
  const parts = matcher ? matcher.tokenize(sentence) : [{ text: sentence }];
  let words = 0;
  let syllables = 0;
  for (const p of parts) {
    if (p.termId) {
      words += 1;
      syllables += 1;
    } else {
      for (const w of wordsOf(p.text)) {
        words += 1;
        syllables += countSyllables(w);
      }
    }
  }
  if (words === 0) return { sentence, words: 0, syllables: 0, grade: -Infinity };
  if (words < FRAGMENT_WORDS) {
    // The grade formula is unstable on 1–4 words ("Apple" would score grade 8), so a label passes
    // when it has no long word. Defined terms are still exempt (they count as one syllable).
    let longest = 0;
    for (const p of parts) {
      if (p.termId) continue;
      for (const w of wordsOf(p.text)) longest = Math.max(longest, countSyllables(w));
    }
    return { sentence, words, syllables, grade: longest > FRAGMENT_MAX_SYLLABLES ? 99 : 0 };
  }
  const grade = 0.39 * words + 11.8 * (syllables / words) - 15.59;
  return { sentence, words, syllables, grade };
}

/** Every sentence of a text, scored. */
export function scoreText(text: string, matcher?: TermMatcher): SentenceScore[] {
  return splitSentences(text).map((s) => scoreSentence(s, matcher));
}

/** Sentences above the limit. */
export function tooHard(
  text: string,
  matcher?: TermMatcher,
  limit = READING_LIMIT,
): SentenceScore[] {
  return scoreText(text, matcher).filter((s) => s.grade > limit);
}
