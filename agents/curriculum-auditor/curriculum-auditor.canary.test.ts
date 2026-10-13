import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fixture, run } from "../testing";
import { curriculumAuditor } from ".";

const outline = JSON.parse(readFileSync("content/outline.json", "utf8"));

describe("Curriculum Auditor canary", () => {
  it("control: the real outline is not red", async () => {
    const r = await run(curriculumAuditor, fixture(["content/outline.json"]));
    expect(r.status).not.toBe("red");
  });

  it("catches a unit that does not end with a boss", async () => {
    const broken = structuredClone(outline);
    broken.units[0].nodes.pop();
    const r = await run(
      curriculumAuditor,
      fixture([], { "content/outline.json": JSON.stringify(broken) }),
    );
    expect(r.status).toBe("red");
    expect(r.checks.find((c) => c.id === "outline-structure")?.status).toBe("red");
  });

  it("catches a duplicate node id", async () => {
    const broken = structuredClone(outline);
    broken.units[1].nodes[1].id = broken.units[1].nodes[0].id;
    const r = await run(
      curriculumAuditor,
      fixture([], { "content/outline.json": JSON.stringify(broken) }),
    );
    expect(r.status).toBe("red");
  });

  it("catches a missing required field", async () => {
    const broken = structuredClone(outline);
    delete broken.units[0].nodes[0].goal;
    const r = await run(
      curriculumAuditor,
      fixture([], { "content/outline.json": JSON.stringify(broken) }),
    );
    expect(r.checks.find((c) => c.id === "outline-shape")?.status).toBe("red");
  });

  it("catches a missing or unparseable file", async () => {
    expect((await run(curriculumAuditor, fixture([]))).status).toBe("red");
    const r = await run(curriculumAuditor, fixture([], { "content/outline.json": "{ not json" }));
    expect(r.status).toBe("red");
  });
});
