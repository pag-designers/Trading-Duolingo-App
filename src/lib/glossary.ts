import type { GlossaryTerm } from "./content/lesson-schema";

/** A piece of text: plain, or a glossary term the learner can tap. */
export interface TextPart {
  text: string;
  termId?: string;
}

export interface TermMatcher {
  /** Split text into plain and term parts. */
  tokenize: (text: string) => TextPart[];
  /** Term ids mentioned in the text, in order of appearance (duplicates removed). */
  termsIn: (text: string) => string[];
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

/** ALL-CAPS short names (EPS, ATH, DD, CEO) must match exactly, so they never fire inside normal words. */
const isShout = (s: string) => /^[A-Z0-9&/. ]+$/.test(s) && /[A-Z]/.test(s) && s.length <= 6;

interface Entry {
  surface: string;
  termId: string;
  re: RegExp;
}

/**
 * Build a matcher from the glossary. Longest names win ("stock market" before "stock"), plurals
 * ("stocks", "shares", "bulls") match automatically, and matches never start or end inside a word.
 */
export function buildMatcher(terms: GlossaryTerm[]): TermMatcher {
  const entries: Entry[] = [];
  for (const t of terms) {
    for (const surface of [t.term, ...t.aliases]) {
      // Plural suffix only for words that end in a letter.
      const plural = /[A-Za-z]$/.test(surface) && !isShout(surface) ? "(?:e?s)?" : "";
      entries.push({
        surface,
        termId: t.id,
        re: new RegExp(
          `(?<![A-Za-z0-9])${escape(surface)}${plural}(?![A-Za-z0-9])`,
          isShout(surface) ? "g" : "gi",
        ),
      });
    }
  }
  entries.sort((a, b) => b.surface.length - a.surface.length);

  const tokenize = (text: string): TextPart[] => {
    // Claim character ranges longest-first so shorter names can't match inside longer ones.
    const claimed: { start: number; end: number; termId: string }[] = [];
    const free = (s: number, e: number) => claimed.every((c) => e <= c.start || s >= c.end);
    for (const entry of entries) {
      entry.re.lastIndex = 0;
      for (let m = entry.re.exec(text); m; m = entry.re.exec(text)) {
        const start = m.index;
        const end = start + m[0].length;
        if (free(start, end)) claimed.push({ start, end, termId: entry.termId });
        if (m[0].length === 0) entry.re.lastIndex += 1;
      }
    }
    claimed.sort((a, b) => a.start - b.start);
    const parts: TextPart[] = [];
    let at = 0;
    for (const c of claimed) {
      if (c.start > at) parts.push({ text: text.slice(at, c.start) });
      parts.push({ text: text.slice(c.start, c.end), termId: c.termId });
      at = c.end;
    }
    if (at < text.length) parts.push({ text: text.slice(at) });
    return parts;
  };

  const termsIn = (text: string): string[] => {
    const seen: string[] = [];
    for (const p of tokenize(text)) if (p.termId && !seen.includes(p.termId)) seen.push(p.termId);
    return seen;
  };

  return { tokenize, termsIn };
}
