/** `pnpm content:check` — run the content audit and print what to fix. Exits 1 if anything is found. */
import { auditContent } from "../src/lib/content/audit";
import { loadContent } from "../src/lib/content/load";

const c = loadContent(process.cwd());
if (c.loadProblems.length > 0 || !c.outline || !c.glossary || !c.abbreviations) {
  for (const p of c.loadProblems) console.log(`✗ ${p.file}: ${p.message}`);
  process.exit(1);
}
const { findings } = auditContent({
  outline: c.outline,
  glossary: c.glossary,
  abbreviations: c.abbreviations,
  lessons: c.lessons,
});
const byCheck = new Map<string, typeof findings>();
for (const f of findings) byCheck.set(f.check, [...(byCheck.get(f.check) ?? []), f]);
for (const [check, list] of byCheck) {
  console.log(`\n== ${check} (${list.length})`);
  for (const f of list) console.log(`  ${f.where}\n      ${f.message}`);
}
console.log(
  `\n${c.lessons.length} lessons, ${c.glossary.terms.length} glossary terms, ${c.abbreviations.items.length} abbreviations. ${findings.length} finding(s).`,
);
process.exit(findings.length > 0 ? 1 : 0);
