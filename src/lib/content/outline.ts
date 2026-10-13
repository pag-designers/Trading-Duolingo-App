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
