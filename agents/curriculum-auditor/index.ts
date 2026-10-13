import { outlineSchema, validateOutline } from "../../src/lib/content/schema";
import { fail, pass, readJson, stub, warn } from "../lib";
import type { Agent, Check } from "../types";

export const curriculumAuditor: Agent = {
  id: "curriculum-auditor",
  name: "Curriculum Auditor",
  job: "Checks lesson content: required fields, structure, glossary, reading level, disclaimers.",
  async run({ root }) {
    const checks: Check[] = [];

    let raw: unknown;
    try {
      raw = readJson(root, "content/outline.json");
    } catch (e) {
      return [
        fail(
          "outline-parse",
          "Outline is valid JSON",
          `content/outline.json could not be parsed: ${(e as Error).message}`,
        ),
      ];
    }
    if (raw === undefined)
      return [fail("outline-exists", "Outline exists", "content/outline.json is missing.")];

    const parsed = outlineSchema.safeParse(raw);
    if (!parsed.success) {
      checks.push(
        fail(
          "outline-shape",
          "Outline has all required fields",
          parsed.error.issues
            .slice(0, 3)
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; "),
        ),
      );
      return checks;
    }
    checks.push(
      pass(
        "outline-shape",
        "Outline has all required fields",
        `${parsed.data.units.length} units, ${parsed.data.units.reduce((n, u) => n + u.nodes.length, 0)} nodes.`,
      ),
    );

    const problems = validateOutline(parsed.data);
    checks.push(
      problems.length === 0
        ? pass(
            "outline-structure",
            "Unique ids, each unit ends with one boss",
            "All structural rules hold.",
          )
        : fail(
            "outline-structure",
            "Unique ids, each unit ends with one boss",
            problems.slice(0, 4).join("; "),
          ),
    );

    const nodes = parsed.data.units.flatMap((u) => u.nodes);
    const ready = nodes.filter((n) => n.ready).length;
    checks.push(
      ready === 0
        ? warn(
            "lessons-written",
            "Lesson bodies written",
            `0 of ${nodes.length} steps have full content yet (Unit 1 arrives in CP1).`,
          )
        : pass(
            "lessons-written",
            "Lesson bodies written",
            `${ready} of ${nodes.length} steps have content.`,
          ),
    );

    checks.push(
      stub(
        "reading-level",
        "Reading level ≤ grade 2 (defined terms exempt)",
        "CP1, with the first lesson text",
      ),
    );
    checks.push(stub("glossary-defined-first", "Every term defined before first use", "CP1"));
    checks.push(
      stub("question-ids-answers", "No duplicate question ids; answer keys correct", "CP1"),
    );
    checks.push(
      stub(
        "risk-disclaimer",
        "Risk reminder on every trading lesson",
        "CP1 (lesson text) and CP4 (Trade Lab)",
      ),
    );
    checks.push(stub("links", "No broken glossary or lesson links", "CP1"));
    return checks;
  },
};
