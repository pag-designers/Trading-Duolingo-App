import outlineJson from "@content/outline.json";
import { outlineSchema, validateOutline, type Outline, type OutlineNode } from "./schema";

let cached: Outline | null = null;

/** Load and validate the curriculum outline. Throws with a readable message if content is broken. */
export function getOutline(): Outline {
  if (cached) return cached;
  const parsed = outlineSchema.safeParse(outlineJson);
  if (!parsed.success) {
    throw new Error(`content/outline.json is invalid:\n${parsed.error.message}`);
  }
  const problems = validateOutline(parsed.data);
  if (problems.length > 0) {
    throw new Error(`content/outline.json has problems:\n- ${problems.join("\n- ")}`);
  }
  cached = parsed.data;
  return cached;
}

/** The first node that is not done, in course order (or null when the course is finished). */
export function findCurrentNode(
  outline: Outline,
  isDone: (nodeId: string) => boolean,
): { unitId: string; node: OutlineNode } | null {
  for (const unit of outline.units) {
    for (const node of unit.nodes) {
      if (!isDone(node.id)) return { unitId: unit.id, node };
    }
  }
  return null;
}

/**
 * Mark which steps can be opened. A step is ready when its lesson file exists; chests need no lesson
 * and are always ready. (Readiness comes from the files, so it can never drift from the content.)
 */
export function withReadiness(outline: Outline, lessonIds: ReadonlySet<string>): Outline {
  return {
    ...outline,
    units: outline.units.map((u) => ({
      ...u,
      nodes: u.nodes.map((n) => ({ ...n, ready: n.type === "chest" || lessonIds.has(n.id) })),
    })),
  };
}

/** The step after `nodeId` in course order, or null at the end. */
export function nextNode(outline: Outline, nodeId: string): OutlineNode | null {
  const all = outline.units.flatMap((u) => u.nodes);
  const i = all.findIndex((n) => n.id === nodeId);
  return i >= 0 ? (all[i + 1] ?? null) : null;
}
