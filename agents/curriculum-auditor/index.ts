import { auditContent, type AuditCheck, type Finding } from "../../src/lib/content/audit";
import { loadContent } from "../../src/lib/content/load";
import { validateOutline } from "../../src/lib/content/schema";
import { fail, pass, warn } from "../lib";
import type { Agent, Check } from "../types";

const TITLES: Record<AuditCheck, string> = {
  "reading-level": "Reading level is grade 2 or below (defined terms exempt)",
  "glossary-defined-first": "Every term is defined before its first use",
  "question-ids-answers": "No duplicate ids; every answer key is valid",
  "risk-disclaimer": "Trading lessons carry the risk reminder",
  links: "Glossary, lesson and pool links all resolve",
};

const summarize = (findings: Finding[]): string =>
  `${findings.length} problem${findings.length === 1 ? "" : "s"}. ` +
  findings
    .slice(0, 3)
    .map((f) => `${f.where}: ${f.message}`)
    .join(" | ");

export const curriculumAuditor: Agent = {
  id: "curriculum-auditor",
  name: "Curriculum Auditor",
  job: "Checks lesson content: structure, reading level, glossary, answer keys, disclaimers, links.",
  async run({ root }) {
    const c = loadContent(root);

    // Files that are missing, unreadable or do not match their schema stop the audit: nothing else can be trusted.
    if (c.loadProblems.length > 0 || !c.outline || !c.glossary || !c.abbreviations) {
      const shape = c.loadProblems.map((p) => `${p.file}: ${p.message}`).join(" | ");
      return [
        fail("content-files", "Content files are valid", shape || "content could not be loaded"),
      ];
    }
    const checks: Check[] = [
      pass(
        "content-files",
        "Content files are valid",
        `${c.lessons.length} lessons, ${c.glossary.terms.length} glossary terms, ${c.abbreviations.items.length} abbreviations.`,
      ),
    ];

    const structure = validateOutline(c.outline);
    checks.push(
      structure.length === 0
        ? pass(
            "outline-structure",
            "Unique ids, each unit ends with one boss",
            "All structural rules hold.",
          )
        : fail(
            "outline-structure",
            "Unique ids, each unit ends with one boss",
            structure.slice(0, 4).join("; "),
          ),
    );

    const nodes = c.outline.units.flatMap((u) => u.nodes);
    const written = nodes.filter(
      (n) => n.type === "chest" || c.lessons.some((l) => l.id === n.id),
    ).length;
    checks.push(
      written === nodes.length
        ? pass(
            "lessons-written",
            "Every step has its content",
            `All ${nodes.length} steps are written.`,
          )
        : warn(
            "lessons-written",
            "Every step has its content",
            `${written} of ${nodes.length} steps are written. The rest arrive in later checkpoints.`,
          ),
    );

    const { findings } = auditContent({
      outline: c.outline,
      glossary: c.glossary,
      abbreviations: c.abbreviations,
      lessons: c.lessons,
    });
    for (const id of Object.keys(TITLES) as AuditCheck[]) {
      const mine = findings.filter((f) => f.check === id);
      checks.push(
        mine.length === 0
          ? pass(id, TITLES[id], `Checked ${c.lessons.length} lessons.`)
          : fail(id, TITLES[id], summarize(mine)),
      );
    }
    return checks;
  },
};
