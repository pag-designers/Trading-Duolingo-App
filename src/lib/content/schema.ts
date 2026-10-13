import { z } from "zod";

export const NODE_TYPES = ["lesson", "practice", "chart", "trade", "boss", "chest"] as const;
export type NodeType = (typeof NODE_TYPES)[number];

const id = z.string().regex(/^u\d-[a-z0-9-]+$/, "ids look like u1-what-is-money");

export const outlineNodeSchema = z.object({
  id,
  type: z.enum(NODE_TYPES),
  title: z.string().min(2).max(40),
  /** One sentence, first-grade reading level. */
  goal: z.string().min(10).max(140),
  /** Present when the full lesson file exists in /content/lessons. */
  ready: z.boolean().default(false),
});

export const outlineUnitSchema = z.object({
  id: z.string().regex(/^u\d$/),
  number: z.number().int().min(1).max(8),
  title: z.string().min(3).max(40),
  tagline: z.string().min(10).max(120),
  nodes: z.array(outlineNodeSchema).min(3),
});

export const outlineSchema = z.object({
  version: z.literal(1),
  units: z.array(outlineUnitSchema).length(8),
});

export type OutlineNode = z.infer<typeof outlineNodeSchema>;
export type OutlineUnit = z.infer<typeof outlineUnitSchema>;
export type Outline = z.infer<typeof outlineSchema>;

/** Structural rules beyond shape: unique ids, every unit ends with a boss, ids match their unit. */
export function validateOutline(outline: Outline): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  outline.units.forEach((unit, i) => {
    if (unit.number !== i + 1) problems.push(`${unit.id}: unit number should be ${i + 1}`);
    if (unit.id !== `u${unit.number}`) problems.push(`${unit.id}: id does not match number`);
    const last = unit.nodes.at(-1);
    if (last?.type !== "boss") problems.push(`${unit.id}: unit must end with a boss`);
    if (unit.nodes.filter((n) => n.type === "boss").length !== 1) {
      problems.push(`${unit.id}: unit must have exactly one boss`);
    }
    for (const node of unit.nodes) {
      if (!node.id.startsWith(`${unit.id}-`))
        problems.push(`${node.id}: id must start with ${unit.id}-`);
      if (seen.has(node.id)) problems.push(`${node.id}: duplicate node id`);
      seen.add(node.id);
    }
  });
  return problems;
}
