import { describe, expect, it } from "vitest";
import { getOutline, nextNode, withReadiness } from "./outline";

describe("withReadiness", () => {
  const outline = getOutline();
  it("marks lessons with files as ready, chests always, everything else not", () => {
    const o = withReadiness(outline, new Set(["u1-money"]));
    const byId = new Map(o.units.flatMap((u) => u.nodes).map((n) => [n.id, n.ready]));
    expect(byId.get("u1-money")).toBe(true);
    expect(byId.get("u1-company")).toBe(false);
    expect(byId.get("u1-chest-1")).toBe(true);
    expect(byId.get("u2-account")).toBe(false);
  });
  it("does not change the input", () => {
    withReadiness(outline, new Set(["u1-money"]));
    expect(outline.units[0]!.nodes[0]!.ready).toBe(false);
  });
});

describe("nextNode", () => {
  const outline = getOutline();
  it("follows course order, across units", () => {
    expect(nextNode(outline, "u1-money")?.id).toBe("u1-company");
    expect(nextNode(outline, "u1-boss")?.id).toBe("u2-account");
  });
  it("is null at the end and for unknown ids", () => {
    expect(nextNode(outline, "u8-boss")).toBeNull();
    expect(nextNode(outline, "nope")).toBeNull();
  });
});
