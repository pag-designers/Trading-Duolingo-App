import "server-only";
import type { LessonRefs } from "@/components/lesson/glossary-context";
import type { LessonRouteProps } from "@/components/lesson/lesson-route";
import type { Abbreviation, GlossaryTerm } from "@/lib/content/lesson-schema";
import { loadContent, type LoadedContent } from "@/lib/content/load";
import { nextNode, withReadiness } from "@/lib/content/outline";
import type { Outline } from "@/lib/content/schema";

let cached: LoadedContent | null = null;

/** Read /content. Cached in production; re-read on every request in development so edits show up. */
export function getContent(): LoadedContent {
  if (cached && process.env.NODE_ENV === "production") return cached;
  const content = loadContent(process.cwd());
  if (
    content.loadProblems.length > 0 ||
    !content.outline ||
    !content.glossary ||
    !content.abbreviations
  ) {
    const detail = content.loadProblems.map((p) => `${p.file}: ${p.message}`).join("\n");
    throw new Error(
      `Content could not be loaded:\n${detail}\nRun pnpm content:check to see what to fix.`,
    );
  }
  cached = content;
  return content;
}

/** The outline with each step's `ready` flag set from the lesson files that exist. */
export function getOutlineWithReadiness(): Outline {
  const c = getContent();
  return withReadiness(c.outline!, new Set(c.lessons.map((l) => l.id)));
}

/** Where each term is taught: lesson title and whether it can be opened. */
export function getLessonRefs(): LessonRefs {
  const outline = getOutlineWithReadiness();
  const refs: LessonRefs = {};
  for (const n of outline.units.flatMap((u) => u.nodes))
    refs[n.id] = { title: n.title, ready: n.ready };
  return refs;
}

export function getGlossaryData(): {
  terms: GlossaryTerm[];
  abbreviations: Abbreviation[];
  lessonRefs: LessonRefs;
} {
  const c = getContent();
  return {
    terms: c.glossary!.terms,
    abbreviations: c.abbreviations!.items,
    lessonRefs: getLessonRefs(),
  };
}

/** Everything the lesson route needs, or null if there is no such step. */
export function getLessonBundle(nodeId: string): LessonRouteProps | null {
  const c = getContent();
  const outline = getOutlineWithReadiness();
  const unit = outline.units.find((u) => u.nodes.some((n) => n.id === nodeId));
  const node = unit?.nodes.find((n) => n.id === nodeId);
  if (!unit || !node || !node.ready) return null;

  const lesson = c.lessons.find((l) => l.id === nodeId) ?? null;
  if (!lesson && node.type !== "chest") return null;
  const poolSources = (lesson?.pool?.from ?? []).map(
    (id) => c.lessons.find((l) => l.id === id)?.questions ?? [],
  );
  const after = nextNode(outline, nodeId);

  return {
    node,
    unit,
    lesson,
    poolSources,
    terms: c.glossary!.terms,
    lessonRefs: getLessonRefs(),
    next: after ? { id: after.id, title: after.title, ready: after.ready } : null,
  };
}

/** Ids of every step that can be opened (for static generation). */
export function getOpenableNodeIds(): string[] {
  return getOutlineWithReadiness()
    .units.flatMap((u) => u.nodes)
    .filter((n) => n.ready)
    .map((n) => n.id);
}
