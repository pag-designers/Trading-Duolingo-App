import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fixture, run } from "../testing";
import { pedagogy } from ".";

const outline = JSON.parse(readFileSync("content/outline.json", "utf8"));
const withOutline = (o: unknown) => fixture([], { "content/outline.json": JSON.stringify(o) });

describe("Pedagogy canary", () => {
  it("control: the real outline is not red", async () => {
    expect((await run(pedagogy, fixture(["content/outline.json"]))).status).not.toBe("red");
  });

  it("catches a unit with no practice at all", async () => {
    const broken = structuredClone(outline);
    broken.units[0].nodes = broken.units[0].nodes.filter(
      (n: { type: string }) => n.type === "lesson" || n.type === "boss",
    );
    const r = await run(pedagogy, withOutline(broken));
    expect(r.checks.find((c) => c.id === "unit-has-practice")?.status).toBe("red");
  });

  it("catches practice that only comes after the boss", async () => {
    const broken = structuredClone(outline);
    const u = broken.units[2];
    u.nodes = [
      ...u.nodes.filter((n: { type: string }) => n.type === "lesson" || n.type === "boss"),
      { id: "u3-late", type: "practice", title: "Late", goal: "A practice that comes too late." },
    ];
    const r = await run(pedagogy, withOutline(broken));
    expect(r.checks.find((c) => c.id === "practice-before-boss")?.status).toBe("red");
  });

  it("catches a unit that opens with a test instead of teaching", async () => {
    const broken = structuredClone(outline);
    const u = broken.units[3];
    [u.nodes[0], u.nodes[1]] = [{ ...u.nodes[1], type: "practice" }, u.nodes[0]];
    const r = await run(pedagogy, withOutline(broken));
    expect(r.checks.find((c) => c.id === "starts-with-lesson")?.status).toBe("red");
  });
});
