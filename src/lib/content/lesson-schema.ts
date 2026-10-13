import { z } from "zod";
import { INDICATORS, TIMEFRAMES, windowSchema } from "@/lib/market/types";

/** Illustrations a teach slide can show (drawn in src/components/lesson/art.tsx). */
export const ART_KEYS = [
  "coins",
  "shop",
  "building",
  "pie",
  "market",
  "tag",
  "profit",
  "loss",
  "ticker",
  "bull",
  "bear",
  "candles",
  "index",
  "speech",
  "chest",
] as const;
export type ArtKey = (typeof ART_KEYS)[number];

const slug = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "use lowercase letters, numbers and dashes");
const text = (max: number) => z.string().trim().min(2).max(max);

// ── Teach slides ────────────────────────────────────────────────────────────
export const slideSchema = z.object({
  id: slug,
  title: text(40).optional(),
  /** Plain text, at most 3 sentences (checked by the Pedagogy agent). Glossary terms are highlighted automatically. */
  text: text(360),
  art: z.enum(ART_KEYS).optional(),
  /** Glossary term ids this slide introduces. A term must be defined here before any earlier slide or question uses it. */
  defines: z.array(slug).default([]),
  /** A read-only Lightweight Charts picture shown with the slide (real Apple history or made-up practice prices). */
  demo: z
    .object({
      window: windowSchema,
      indicators: z.array(z.enum(INDICATORS)).default([]),
      /** One line under the chart saying what to look at. Same reading-level rules as slide text. */
      caption: text(120),
    })
    .optional(),
});

// ── Questions ───────────────────────────────────────────────────────────────
const questionBase = {
  id: slug,
  prompt: text(220),
  /** Shown after every answer, right or wrong. */
  explanation: text(360),
  /** Which lesson objective (by id) this question practices. */
  objective: slug.optional(),
};

const optionSchema = z.object({ id: slug, text: text(80) });

export const mcSchema = z.object({
  ...questionBase,
  type: z.literal("mc"),
  options: z.array(optionSchema).min(2).max(4),
  answer: slug,
});

export const tfSchema = z.object({
  ...questionBase,
  type: z.literal("tf"),
  answer: z.boolean(),
});

export const matchSchema = z.object({
  ...questionBase,
  type: z.literal("match"),
  pairs: z
    .array(z.object({ id: slug, term: text(40), definition: text(90) }))
    .min(3)
    .max(5),
});

export const candleSchema = z.object({
  o: z.number(),
  h: z.number(),
  l: z.number(),
  c: z.number(),
});
export type Candle = z.infer<typeof candleSchema>;

/** A tap question needs every candle to be a comfortable tap target (52px) on a phone, so at most 6 fit. */
export const MAX_TAP_CANDLES = 6;

export const chartSchema = z.object({
  ...questionBase,
  type: z.literal("chart"),
  candles: z.array(candleSchema).min(4).max(40),
  /** "choice": pick an option about the chart. "tap": tap the candle that matches the prompt. */
  ask: z.enum(["choice", "tap"]),
  options: z.array(optionSchema).min(2).max(4).optional(),
  answer: slug.optional(),
  answerIndex: z.number().int().min(0).optional(),
});

export const buildSchema = z.object({
  ...questionBase,
  type: z.literal("build"),
  /** Slots are filled in order, e.g. "Profit =", "−". */
  slots: z
    .array(z.object({ id: slug, label: text(30) }))
    .min(1)
    .max(4),
  blocks: z
    .array(z.object({ id: slug, text: text(40) }))
    .min(2)
    .max(6),
  /** slotId → blockId */
  answer: z.record(slug, slug),
});

// ── Chart Lab ───────────────────────────────────────────────────────────────
/** Which candle a rule points at, found from the data itself (nothing is hand-numbered). */
export const BAR_RULES = [
  "highest-high",
  "lowest-low",
  "highest-close",
  "lowest-close",
  "highest-volume",
  "widest-range",
] as const;
export type BarRule = (typeof BAR_RULES)[number];

/** A price level found from the data. */
export const LEVEL_RULES = ["lowest-low", "highest-high", "last-close", "first-open"] as const;
export type LevelRule = (typeof LEVEL_RULES)[number];

const barIdx = z.number().int().min(0).max(299);
/** How close counts as close: a share of the visible price range, and a number of candles. */
const tolerance = {
  tol: z.number().min(0.01).max(0.15).default(0.05),
  tolBars: z.number().int().min(0).max(5).default(1),
};

export const labTaskSchema = z.discriminatedUnion("kind", [
  /** Put the crosshair on a candle. */
  z.object({ kind: z.literal("find-bar"), rule: z.enum(BAR_RULES) }),
  /** Draw a flat price line. */
  z.object({ kind: z.literal("hline"), level: z.enum(LEVEL_RULES), ...tolerance }),
  /** Draw a line that touches the lows (or highs) of two candles. */
  z.object({
    kind: z.literal("trendline"),
    touch: z.enum(["lows", "highs"]),
    bars: z.tuple([barIdx, barIdx]),
    ...tolerance,
  }),
  /** Draw a box around a run of candles. */
  z.object({ kind: z.literal("box"), bars: z.tuple([barIdx, barIdx]), ...tolerance }),
  /** Stretch Fibonacci levels from a swing low to a swing high. */
  z.object({ kind: z.literal("fib"), low: barIdx, high: barIdx, ...tolerance }),
  /** Leave a note on a candle. */
  z.object({ kind: z.literal("note"), bar: barIdx, ...tolerance }),
  /** Measure the move from one candle's close to another's. */
  z.object({ kind: z.literal("measure"), from: barIdx, to: barIdx, ...tolerance }),
  /** Switch the chart to another timeframe. */
  z.object({ kind: z.literal("timeframe"), tf: z.enum(TIMEFRAMES) }),
  /** Turn indicators on until exactly this set shows. */
  z.object({ kind: z.literal("indicators"), want: z.array(z.enum(INDICATORS)).max(7) }),
]);
export type LabTask = z.infer<typeof labTaskSchema>;
export type LabTaskKind = LabTask["kind"];

export const labSchema = z.object({
  ...questionBase,
  type: z.literal("lab"),
  window: windowSchema,
  /** Indicators already on when the chart opens. */
  start: z.array(z.enum(INDICATORS)).default([]),
  /** Which indicators the toolbar offers (default: all that make sense for the timeframe). */
  offer: z.array(z.enum(INDICATORS)).optional(),
  /** Which timeframes the switcher offers. Leave out for a fixed timeframe. */
  timeframes: z.array(z.enum(TIMEFRAMES)).optional(),
  task: labTaskSchema,
});

export const questionSchema = z.discriminatedUnion("type", [
  mcSchema,
  tfSchema,
  matchSchema,
  chartSchema,
  buildSchema,
  labSchema,
]);

export type Slide = z.infer<typeof slideSchema>;
export type McQuestion = z.infer<typeof mcSchema>;
export type TfQuestion = z.infer<typeof tfSchema>;
export type MatchQuestion = z.infer<typeof matchSchema>;
export type ChartQuestion = z.infer<typeof chartSchema>;
export type BuildQuestion = z.infer<typeof buildSchema>;
export type LabQuestion = z.infer<typeof labSchema>;
export type Question = z.infer<typeof questionSchema>;
export type QuestionType = Question["type"];

// ── Lessons ─────────────────────────────────────────────────────────────────
export const lessonSchema = z
  .object({
    /** Same id as the node in content/outline.json. */
    id: z.string().regex(/^u\d-[a-z0-9-]+$/),
    title: text(40),
    /** One sentence. */
    goal: text(140),
    /** True when the lesson talks about stocks, markets or trading. These show the risk reminder. */
    touchesTrading: z.boolean(),
    objectives: z.array(z.object({ id: slug, text: text(120) })).default([]),
    slides: z.array(slideSchema).default([]),
    questions: z.array(questionSchema).default([]),
    /** Practice and boss steps can also draw questions from earlier lessons. */
    pool: z
      .object({
        from: z.array(z.string().regex(/^u\d-[a-z0-9-]+$/)).min(1),
        /** How many questions to take from each source lesson. */
        perLesson: z.number().int().min(1).max(6),
      })
      .optional(),
  })
  .superRefine((l, ctx) => {
    if (l.slides.length === 0 && l.questions.length === 0 && !l.pool) {
      ctx.addIssue({ code: "custom", message: "a lesson needs slides, questions or a pool" });
    }
  });

export type Lesson = z.infer<typeof lessonSchema>;

// ── Glossary & abbreviations ────────────────────────────────────────────────
export const glossaryTermSchema = z.object({
  id: slug,
  term: text(40),
  /** Other ways the term appears in text (plurals of -s/-es are matched automatically). */
  aliases: z.array(text(40)).default([]),
  definition: text(220),
  analogy: text(200),
  example: text(200),
  /** Node id of the lesson that teaches it (the link target). */
  taughtIn: z.string().regex(/^u\d-[a-z0-9-]+$/),
});
export const glossarySchema = z.object({
  version: z.literal(1),
  terms: z.array(glossaryTermSchema).min(1),
});
export type GlossaryTerm = z.infer<typeof glossaryTermSchema>;
export type Glossary = z.infer<typeof glossarySchema>;

export const ABBREVIATION_CATEGORIES = ["company", "market", "chart", "news", "slang"] as const;
export const abbreviationSchema = z.object({
  abbr: text(12),
  full: text(60),
  meaning: text(160),
  example: text(160),
  category: z.enum(ABBREVIATION_CATEGORIES),
  /** Node id where it is taught (later units are allowed: it links to that unit on the Learn page). */
  taughtIn: z.string().regex(/^u\d-[a-z0-9-]+$/),
});
export const abbreviationsSchema = z.object({
  version: z.literal(1),
  items: z.array(abbreviationSchema).min(1),
});
export type Abbreviation = z.infer<typeof abbreviationSchema>;
export type Abbreviations = z.infer<typeof abbreviationsSchema>;
