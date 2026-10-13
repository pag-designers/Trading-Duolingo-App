import { fail, listFiles, pass, readText, stub } from "../lib";
import type { Agent, Check } from "../types";

/** Screens that must carry the "most day traders lose money" reminder (BRIEF §0 rule 1). */
export const REQUIRED_DISCLAIMERS: { file: string; why: string }[] = [
  { file: "src/app/(app)/trade-lab/page.tsx", why: "Trade Lab" },
  { file: "src/components/path/skill-map.tsx", why: "chart, trade and boss steps" },
  { file: "src/components/path/learn-screen.tsx", why: "Learn page" },
  { file: "src/components/onboarding/onboarding-flow.tsx", why: "onboarding" },
  { file: "src/components/lesson/lesson-player.tsx", why: "lessons" },
  { file: "src/components/lesson/complete-screen.tsx", why: "lesson results" },
];
const DISCLAIMER = /most\s+(real\s+)?day\s+traders\s+lose\s+money/i;
/** A screen satisfies the rule by showing the shared component (which reads src/lib/copy.ts) or the sentence itself. */
const hasReminder = (source: string) => DISCLAIMER.test(source) || /<RiskReminder\b/.test(source);

/** Wording that would break the "unlimited hearts" rule (BRIEF §3). */
const HEARTS_LOCKOUT = /out of hearts|no hearts left|lose a heart|hearts? remaining|0 hearts/i;
/** Claims that practice data is live (BRIEF §0 rule 5). A line saying "not live" is fine. */
const LIVE_CLAIM = /\blive (market )?(data|prices?|quotes?|feed)\b/i;

export const safetyGuardrails: Agent = {
  id: "safety-guardrails",
  name: "Safety & Guardrails",
  job: "Honesty disclaimers on trade screens, no hearts lockout, no live-data claims, Coach red-team.",
  async run({ root }) {
    const checks: Check[] = [];

    const missing = REQUIRED_DISCLAIMERS.filter(
      ({ file }) => !hasReminder(readText(root, file) ?? ""),
    );
    // The shared component only helps if the sentence it shows is the real one.
    if (!DISCLAIMER.test(readText(root, "src/lib/copy.ts") ?? "")) {
      missing.push({ file: "src/lib/copy.ts", why: "the shared risk reminder text" });
    }
    checks.push(
      missing.length === 0
        ? pass(
            "disclaimers",
            "Risk reminder on trade-related screens",
            `Found on ${REQUIRED_DISCLAIMERS.length} screens.`,
          )
        : fail(
            "disclaimers",
            "Risk reminder on trade-related screens",
            `Missing on: ${missing.map((m) => `${m.file} (${m.why})`).join(", ")}`,
          ),
    );

    const sources = [
      ...listFiles(root, "src", [".ts", ".tsx"]),
      ...listFiles(root, "content", [".json"]),
    ];
    const hits = (re: RegExp, allowLine?: RegExp) =>
      sources.flatMap((file) =>
        (readText(root, file) ?? "")
          .split("\n")
          .map((line, i) => ({ file, line: i + 1, text: line }))
          .filter((l) => re.test(l.text) && !(allowLine && allowLine.test(l.text))),
      );

    const hearts = hits(HEARTS_LOCKOUT);
    checks.push(
      hearts.length === 0
        ? pass("no-hearts-lockout", "No “out of hearts” screens or copy", "Unlimited hearts holds.")
        : fail(
            "no-hearts-lockout",
            "No “out of hearts” screens or copy",
            hearts
              .slice(0, 3)
              .map((h) => `${h.file}:${h.line}`)
              .join(", "),
          ),
    );

    const live = hits(LIVE_CLAIM, /\b(not|never|isn't|no)\b/i);
    checks.push(
      live.length === 0
        ? pass("no-live-claims", "Nothing claims the data is live", "No live-data wording found.")
        : fail(
            "no-live-claims",
            "Nothing claims the data is live",
            live
              .slice(0, 3)
              .map((h) => `${h.file}:${h.line}`)
              .join(", "),
          ),
    );

    checks.push(
      stub(
        "coach-red-team",
        "Coach refuses advice, price targets, PDT evasion, manipulation",
        "CP6",
      ),
    );
    checks.push(stub("coach-citations", "Coach cites the lesson or glossary entry it used", "CP6"));
    return checks;
  },
};
