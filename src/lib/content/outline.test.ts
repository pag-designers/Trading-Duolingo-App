import { describe, expect, it } from "vitest";
import { findCurrentNode, flatNodes, getOutline } from "./outline";
import { outlineSchema, validateOutline, type Outline } from "./schema";

describe("content/outline.json", () => {
  const outline = getOutline();

  it("has all 8 units in order", () => {
    expect(outline.units.map((u) => u.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("passes the structural rules (unique ids, each unit ends with one boss)", () => {
    expect(validateOutline(outline)).toEqual([]);
  });

  it("keeps goals short enough for a first-grade reader", () => {
    for (const n of flatNodes(outline))
      expect(n.goal.split(/\s+/).length, n.id).toBeLessThanOrEqual(22);
  });

  it("finds the current node in course order", () => {
    const first = findCurrentNode(outline, () => false);
    expect(first?.node.id).toBe("u1-money");
    const second = findCurrentNode(outline, (id) => id === "u1-money");
    expect(second?.node.id).toBe("u1-company");
    expect(findCurrentNode(outline, () => true)).toBeNull();
  });
});

describe("outline validation (canary: broken content is caught)", () => {
  const good = getOutline();
  const clone = (): Outline => structuredClone(good);

  it("rejects a unit that does not end with a boss", () => {
    const bad = clone();
    bad.units[0]!.nodes.pop();
    expect(validateOutline(bad).join()).toMatch(/must end with a boss/);
  });

  it("rejects duplicate node ids", () => {
    const bad = clone();
    bad.units[0]!.nodes[1]!.id = bad.units[0]!.nodes[0]!.id;
    expect(validateOutline(bad).join()).toMatch(/duplicate node id/);
  });

  it("rejects malformed shapes", () => {
    expect(outlineSchema.safeParse({ version: 1, units: [] }).success).toBe(false);
  });
});
