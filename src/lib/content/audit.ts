import { buildMatcher, type TermMatcher } from "../glossary";
import { READING_LIMIT, scoreText, splitSentences } from "../readability";
import {
  MAX_TAP_CANDLES,
  type Abbreviations,
  type Glossary,
  type Lesson,
  type Question,
} from "./lesson-schema";
import type { Outline, OutlineNode } from "./schema";

export type AuditCheck =
  "reading-level" | "glossary-defined-first" | "question-ids-answers" | "risk-disclaimer" | "links";

export interface Finding {
  check: AuditCheck;
  /** e.g. "u1-stock › slide what-is-a-stock" — where to look. */
  where: string;
  message: string;
}

export interface AuditInput {
  outline: Outline;
  glossary: Glossary;
  abbreviations: Abbreviations;
  lessons: Lesson[];
}

/** Words that mean a lesson is about stocks or trading, so it must carry the risk reminder. */
export const TRADING_WORDS =
  /\b(stocks?|shares?|traders?|trading|trade[sd]?|profit|loss|market|markets|etfs?|ipo)\b/i;

/** Every piece of learner-facing text in a question, with a label for where it came from. */
export function questionTexts(q: Question): { label: string; text: string }[] {
  const out = [
    { label: "prompt", text: q.prompt },
    { label: "explanation", text: q.explanation },
  ];
  if (q.type === "mc")
    q.options.forEach((o) => out.push({ label: `option ${o.id}`, text: o.text }));
  if (q.type === "chart")
    q.options?.forEach((o) => out.push({ label: `option ${o.id}`, text: o.text }));
  if (q.type === "match") {
    q.pairs.forEach((p) => {
      out.push({ label: `pair ${p.id} term`, text: p.term });
      out.push({ label: `pair ${p.id} definition`, text: p.definition });
    });
  }
  if (q.type === "build") {
    q.slots.forEach((s) => out.push({ label: `slot ${s.id}`, text: s.label }));
    q.blocks.forEach((b) => out.push({ label: `block ${b.id}`, text: b.text }));
  }
  return out;
}

/** All learner-facing text of a lesson. */
export function lessonTexts(l: Lesson): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = [
    { where: `${l.id} › title`, text: l.title },
    { where: `${l.id} › goal`, text: l.goal },
  ];
  l.objectives.forEach((o) => out.push({ where: `${l.id} › objective ${o.id}`, text: o.text }));
  l.slides.forEach((s) => {
    if (s.title) out.push({ where: `${l.id} › slide ${s.id} title`, text: s.title });
    out.push({ where: `${l.id} › slide ${s.id}`, text: s.text });
  });
  l.questions.forEach((q) =>
    questionTexts(q).forEach((t) =>
      out.push({ where: `${l.id} › ${q.id} ${t.label}`, text: t.text }),
    ),
  );
  return out;
}

const nodeOrder = (outline: Outline): OutlineNode[] => outline.units.flatMap((u) => u.nodes);

/** Run every content check. Pure: give it content, get findings. */
export function auditContent(input: AuditInput): { findings: Finding[]; matcher: TermMatcher } {
  const { outline, glossary, abbreviations, lessons } = input;
  const findings: Finding[] = [];
  const add = (check: AuditCheck, where: string, message: string) =>
    findings.push({ check, where, message });
  const matcher = buildMatcher(glossary.terms);
  const nodes = nodeOrder(outline);
  const nodeIds = new Set(nodes.map((n) => n.id));
  const termIds = new Set(glossary.terms.map((t) => t.id));
  const lessonById = new Map(lessons.map((l) => [l.id, l]));
  const written = nodes.filter((n) => lessonById.has(n.id) || n.type === "chest");

  // ── reading level ─────────────────────────────────────────────────────────
  const readCheck = (where: string, text: string) => {
    for (const s of scoreText(text, matcher)) {
      if (s.grade > READING_LIMIT) {
        add(
          "reading-level",
          where,
          `grade ${s.grade.toFixed(1)} (limit ${READING_LIMIT}): “${s.sentence}”`,
        );
      }
    }
  };
  for (const l of lessons) for (const t of lessonTexts(l)) readCheck(t.where, t.text);
  for (const g of glossary.terms) {
    readCheck(`glossary › ${g.id} definition`, g.definition);
    readCheck(`glossary › ${g.id} analogy`, g.analogy);
    readCheck(`glossary › ${g.id} example`, g.example);
  }
  for (const a of abbreviations.items) {
    readCheck(`abbreviations › ${a.abbr} meaning`, a.meaning);
    readCheck(`abbreviations › ${a.abbr} example`, a.example);
  }
  // Unit and step titles/goals the learner sees for steps that exist.
  for (const unit of outline.units) {
    if (!unit.nodes.some((n) => lessonById.has(n.id))) continue;
    readCheck(`outline › ${unit.id} title`, unit.title);
    readCheck(`outline › ${unit.id} tagline`, unit.tagline);
  }
  for (const n of written) {
    readCheck(`outline › ${n.id} title`, n.title);
    readCheck(`outline › ${n.id} goal`, n.goal);
  }

  // ── every term defined before first use, in course order ─────────────────
  const introduced = new Set<string>();
  const termTaughtIn = new Map(glossary.terms.map((t) => [t.id, t.taughtIn]));
  const checkTerms = (where: string, text: string, extraKnown: ReadonlySet<string> = new Set()) => {
    for (const id of matcher.termsIn(text)) {
      if (!introduced.has(id) && !extraKnown.has(id)) {
        add(
          "glossary-defined-first",
          where,
          `uses “${glossary.terms.find((t) => t.id === id)?.term}” before any slide defines it`,
        );
      }
    }
  };
  for (const n of nodes) {
    const l = lessonById.get(n.id);
    if (!l) continue;
    for (const s of l.slides) {
      const defines = new Set(s.defines);
      checkTerms(`${l.id} › slide ${s.id}`, `${s.title ?? ""}. ${s.text}`, defines);
      for (const id of s.defines) {
        if (!termIds.has(id)) {
          add("links", `${l.id} › slide ${s.id}`, `defines “${id}”, which is not in the glossary`);
          continue;
        }
        if (termTaughtIn.get(id) !== l.id)
          add(
            "links",
            `${l.id} › slide ${s.id}`,
            `defines “${id}” but the glossary says it is taught in ${termTaughtIn.get(id)}`,
          );
        const mentioned = matcher.termsIn(`${s.title ?? ""}. ${s.text}`);
        if (!mentioned.includes(id))
          add(
            "glossary-defined-first",
            `${l.id} › slide ${s.id}`,
            `defines “${id}” but the slide text never uses the term`,
          );
        introduced.add(id);
      }
    }
    for (const q of l.questions)
      for (const t of questionTexts(q)) checkTerms(`${l.id} › ${q.id} ${t.label}`, t.text);
    l.objectives.forEach((o) => checkTerms(`${l.id} › objective ${o.id}`, o.text));
    // Glossary entries taught here may be used in their own definitions.
    for (const g of glossary.terms.filter((g) => g.taughtIn === l.id)) {
      for (const [label, text] of [
        ["definition", g.definition],
        ["analogy", g.analogy],
        ["example", g.example],
      ] as const) {
        checkTerms(`glossary › ${g.id} ${label}`, text, new Set([g.id]));
      }
    }
  }
  // Glossary and abbreviations whose lesson is not written yet may only use terms defined so far.
  for (const g of glossary.terms) {
    if (lessonById.has(g.taughtIn)) continue;
    for (const [label, text] of [
      ["definition", g.definition],
      ["analogy", g.analogy],
      ["example", g.example],
    ] as const) {
      checkTerms(`glossary › ${g.id} ${label}`, text, new Set([g.id]));
    }
  }
  for (const a of abbreviations.items) {
    checkTerms(`abbreviations › ${a.abbr} meaning`, a.meaning);
    checkTerms(`abbreviations › ${a.abbr} example`, a.example);
  }
  // A glossary term whose lesson exists must actually be defined by a slide there.
  for (const g of glossary.terms) {
    const l = lessonById.get(g.taughtIn);
    if (l && !l.slides.some((s) => s.defines.includes(g.id)))
      add(
        "glossary-defined-first",
        `glossary › ${g.id}`,
        `taught in ${g.taughtIn}, but no slide there defines it`,
      );
  }

  // ── question ids and answer keys ──────────────────────────────────────────
  const seen = new Map<string, string>();
  for (const l of lessons) {
    const objectiveIds = new Set(l.objectives.map((o) => o.id));
    const slideIds = new Set<string>();
    for (const s of l.slides) {
      if (slideIds.has(s.id))
        add("question-ids-answers", `${l.id} › slide ${s.id}`, "duplicate slide id");
      slideIds.add(s.id);
    }
    for (const q of l.questions) {
      const where = `${l.id} › ${q.id}`;
      if (seen.has(q.id))
        add("question-ids-answers", where, `duplicate question id (also in ${seen.get(q.id)})`);
      seen.set(q.id, l.id);
      if (q.objective && !objectiveIds.has(q.objective))
        add(
          "question-ids-answers",
          where,
          `objective “${q.objective}” does not exist in this lesson`,
        );
      checkAnswerKey(q, (m) => add("question-ids-answers", where, m));
    }
    for (const src of l.pool?.from ?? []) {
      if (!lessonById.has(src))
        add("links", `${l.id} › pool`, `pool source ${src} has no lesson file`);
      else if (src === l.id) add("links", `${l.id} › pool`, "pool cannot draw from itself");
    }
  }

  // ── risk reminder on trading lessons ──────────────────────────────────────
  for (const l of lessons) {
    const text = lessonTexts(l)
      .map((t) => t.text)
      .join(" ");
    if (!l.touchesTrading && TRADING_WORDS.test(text)) {
      add(
        "risk-disclaimer",
        l.id,
        `talks about stocks or trading (“${TRADING_WORDS.exec(text)?.[0]}”) but touchesTrading is false, so the risk reminder would be missing`,
      );
    }
  }

  // ── links ─────────────────────────────────────────────────────────────────
  for (const l of lessons) {
    const n = nodes.find((x) => x.id === l.id);
    if (!n) add("links", l.id, "lesson file has no matching node in content/outline.json");
  }
  for (const g of glossary.terms) {
    if (!nodeIds.has(g.taughtIn))
      add("links", `glossary › ${g.id}`, `taughtIn ${g.taughtIn} is not a node in the outline`);
  }
  const dupTerm = new Set<string>();
  for (const g of glossary.terms) {
    if (dupTerm.has(g.id)) add("links", `glossary › ${g.id}`, "duplicate glossary id");
    dupTerm.add(g.id);
  }
  for (const a of abbreviations.items) {
    if (!nodeIds.has(a.taughtIn))
      add(
        "links",
        `abbreviations › ${a.abbr}`,
        `taughtIn ${a.taughtIn} is not a node in the outline`,
      );
  }
  const abbrSeen = new Set<string>();
  for (const a of abbreviations.items) {
    if (abbrSeen.has(a.abbr)) add("links", `abbreviations › ${a.abbr}`, "duplicate abbreviation");
    abbrSeen.add(a.abbr);
  }

  return { findings, matcher };
}

function checkAnswerKey(q: Question, fail: (message: string) => void): void {
  const ids = (xs: { id: string }[]) => xs.map((x) => x.id);
  const unique = (xs: string[]) => new Set(xs).size === xs.length;
  switch (q.type) {
    case "mc":
      if (!unique(ids(q.options))) fail("option ids are not unique");
      if (!ids(q.options).includes(q.answer))
        fail(`answer “${q.answer}” is not one of the options`);
      break;
    case "match":
      if (!unique(ids(q.pairs))) fail("pair ids are not unique");
      if (!unique(q.pairs.map((p) => p.definition))) fail("two pairs have the same definition");
      break;
    case "chart":
      if (q.ask === "choice") {
        if (!q.options || !q.answer) fail("a choice chart question needs options and an answer");
        else if (!ids(q.options).includes(q.answer))
          fail(`answer “${q.answer}” is not one of the options`);
      } else if (q.candles.length > MAX_TAP_CANDLES) {
        fail(
          `a tap chart question has ${q.candles.length} candles (max ${MAX_TAP_CANDLES}, or the candles are too small to tap on a phone)`,
        );
      } else if (q.answerIndex === undefined) fail("a tap chart question needs answerIndex");
      else if (q.answerIndex >= q.candles.length)
        fail(`answerIndex ${q.answerIndex} is outside the ${q.candles.length} candles`);
      break;
    case "build": {
      const slotIds = ids(q.slots);
      const blockIds = ids(q.blocks);
      if (!unique(slotIds) || !unique(blockIds)) fail("slot or block ids are not unique");
      for (const s of slotIds) if (!(s in q.answer)) fail(`slot “${s}” has no answer`);
      for (const [s, b] of Object.entries(q.answer)) {
        if (!slotIds.includes(s)) fail(`answer names unknown slot “${s}”`);
        if (!blockIds.includes(b)) fail(`answer names unknown block “${b}”`);
      }
      if (!unique(Object.values(q.answer))) fail("one block is used in two slots");
      break;
    }
    case "tf":
      break;
  }
}

/** Sentence count of a slide (the Pedagogy agent limits it to 3). */
export const sentenceCount = (text: string): number => splitSentences(text).length;
