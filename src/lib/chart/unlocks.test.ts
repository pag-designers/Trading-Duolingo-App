import { describe, expect, it } from "vitest";
import { INDICATOR_UNLOCK, unlockedIndicators } from "./unlocks";

describe("indicator unlocks", () => {
  it("nothing is unlocked at the start", () => {
    expect(unlockedIndicators({})).toEqual([]);
  });
  it("finishing a lesson unlocks exactly the indicators it teaches", () => {
    expect(unlockedIndicators({ "u2-ma": { status: "done" } }).sort()).toEqual(["ema", "sma"]);
    expect(unlockedIndicators({ "u2-rsi": { status: "in_progress" } })).toEqual([]);
  });
  it("every indicator is taught by a lesson in the outline", async () => {
    const { loadContent } = await import("@/lib/content/load");
    const ids = new Set(
      loadContent(process.cwd()).outline!.units.flatMap((u) => u.nodes.map((n) => n.id)),
    );
    for (const node of Object.values(INDICATOR_UNLOCK)) expect(ids.has(node)).toBe(true);
  });
});
