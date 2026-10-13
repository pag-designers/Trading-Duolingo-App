import { loadContent } from "../../src/lib/content/load";
import { checkPedagogy, type PedagogyCheck } from "../../src/lib/content/pedagogy";
import { outlineSchema } from "../../src/lib/content/schema";
import { fail, pass, readJson, stub } from "../lib";
import type { Agent, Check } from "../types";

const PRACTICE_TYPES = new Set(["practice", "chart", "trade"]);

export const pedagogy: Agent = {
  id: "pedagogy",
  name: "Pedagogy",
  job: "Every skill has practice, difficulty ramps gently, one idea per slide.",
  async run({ root }) {
    const checks: Check[] = [];
    let raw: unknown;
    try {
      raw = readJson(root, "content/outline.json");
    } catch {
      raw = undefined;
    }
    const parsed = outlineSchema.safeParse(raw);
    if (!parsed.success) {
      return [
        fail(
          "outline",
          "Outline can be read",
          "content/outline.json is missing or invalid (see the Curriculum Auditor).",
        ),
      ];
    }

    const noPractice = parsed.data.units.filter(
      (u) => !u.nodes.some((n) => PRACTICE_TYPES.has(n.type)),
    );
    checks.push(
      noPractice.length === 0
        ? pass(
            "unit-has-practice",
            "Every unit has hands-on practice",
            "Each unit has a practice, chart or trade step.",
          )
        : fail(
            "unit-has-practice",
            "Every unit has hands-on practice",
            `No practice in: ${noPractice.map((u) => u.id).join(", ")}`,
          ),
    );

    // Practice must come before the boss, so the boss never tests something that was not practiced.
    const lateOnly = parsed.data.units.filter((u) => {
      const bossAt = u.nodes.findIndex((n) => n.type === "boss");
      const firstPractice = u.nodes.findIndex((n) => PRACTICE_TYPES.has(n.type));
      return firstPractice === -1 || (bossAt !== -1 && firstPractice > bossAt);
    });
    checks.push(
      lateOnly.length === 0
        ? pass("practice-before-boss", "Practice comes before each boss", "Order is sound.")
        : fail(
            "practice-before-boss",
            "Practice comes before each boss",
            `Check: ${lateOnly.map((u) => u.id).join(", ")}`,
          ),
    );

    // Gentle ramp: a unit should not start with a trade/boss before any lesson.
    const coldStart = parsed.data.units.filter((u) => u.nodes[0]?.type !== "lesson");
    checks.push(
      coldStart.length === 0
        ? pass("starts-with-lesson", "Every unit starts by teaching", "No unit opens with a test.")
        : fail(
            "starts-with-lesson",
            "Every unit starts by teaching",
            `Opens with a non-lesson: ${coldStart.map((u) => u.id).join(", ")}`,
          ),
    );

    // Real lesson-quality rules, run on every lesson that exists.
    const content = loadContent(root);
    const findings = checkPedagogy(content.lessons, parsed.data);
    const TITLES: Record<PedagogyCheck, string> = {
      "one-idea-per-slide": "Teach slides: one idea, at most 3 sentences",
      "objective-mapping": "Every learning objective has a question that practices it",
      "enough-practice": "Every teaching lesson has enough questions",
      "pool-size": "Practice and boss steps have enough questions",
    };
    for (const id of Object.keys(TITLES) as PedagogyCheck[]) {
      const mine = findings.filter((f) => f.check === id);
      checks.push(
        mine.length === 0
          ? pass(id, TITLES[id], `Checked ${content.lessons.length} lessons.`)
          : fail(
              id,
              TITLES[id],
              `${mine.length} problem(s). ` +
                mine
                  .slice(0, 3)
                  .map((f) => `${f.where}: ${f.message}`)
                  .join(" | "),
            ),
      );
    }
    checks.push(
      stub(
        "trade-exercise-mapping",
        "Each objective also has a trade exercise (where it applies)",
        "CP4",
      ),
    );
    checks.push(stub("difficulty-ramp", "Difficulty does not jump between units", "CP3"));
    return checks;
  },
};
