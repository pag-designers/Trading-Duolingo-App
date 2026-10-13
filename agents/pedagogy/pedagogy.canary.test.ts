import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pedagogy } from ".";
import { fixture, run } from "../testing";

const read = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const lessonPath = (id: string) => `content/lessons/${id}.json`;
const withFiles = (o: Record<string, unknown>) =>
  fixture(
    ["content"],
    Object.fromEntries(Object.entries(o).map(([k, v]) => [k, JSON.stringify(v)])),
  );
const checkOf = (r: Awaited<ReturnType<typeof run>>, id: string) =>
  r.checks.find((c) => c.id === id);

describe("Pedagogy canary (outline rules)", () => {
  const outline = read("content/outline.json");

  it("control: the real content is not red", async () => {
    const r = await run(pedagogy, fixture(["content"]));
    expect(r.checks.filter((c) => c.status === "red")).toEqual([]);
  });

  it("catches a unit with no practice at all", async () => {
    const broken = structuredClone(outline);
    broken.units[0].nodes = broken.units[0].nodes.filter(
      (n: { type: string }) => n.type === "lesson" || n.type === "boss",
    );
    expect(
      checkOf(
        await run(pedagogy, withFiles({ "content/outline.json": broken })),
        "unit-has-practice",
      )?.status,
    ).toBe("red");
  });

  it("catches practice that only comes after the boss", async () => {
    const broken = structuredClone(outline);
    const u = broken.units[2];
    u.nodes = [
      ...u.nodes.filter((n: { type: string }) => n.type === "lesson" || n.type === "boss"),
      { id: "u3-late", type: "practice", title: "Late", goal: "A practice that comes too late." },
    ];
    expect(
      checkOf(
        await run(pedagogy, withFiles({ "content/outline.json": broken })),
        "practice-before-boss",
      )?.status,
    ).toBe("red");
  });

  it("catches a unit that opens with a test instead of teaching", async () => {
    const broken = structuredClone(outline);
    const u = broken.units[3];
    [u.nodes[0], u.nodes[1]] = [{ ...u.nodes[1], type: "practice" }, u.nodes[0]];
    expect(
      checkOf(
        await run(pedagogy, withFiles({ "content/outline.json": broken })),
        "starts-with-lesson",
      )?.status,
    ).toBe("red");
  });
});

describe("Pedagogy canary (lesson rules)", () => {
  it("catches a slide with more than 3 sentences", async () => {
    const l = read(lessonPath("u1-money"));
    l.slides[0].text = "One thing. Two things. Three things. Four things.";
    expect(
      checkOf(await run(pedagogy, withFiles({ [lessonPath("u1-money")]: l })), "one-idea-per-slide")
        ?.status,
    ).toBe("red");
  });

  it("catches a slide that defines too many terms at once", async () => {
    const l = read(lessonPath("u1-shorttalk"));
    l.slides[1].defines = ["ipo", "ceo", "eps", "pe", "gdp"];
    expect(
      checkOf(
        await run(pedagogy, withFiles({ [lessonPath("u1-shorttalk")]: l })),
        "one-idea-per-slide",
      )?.status,
    ).toBe("red");
  });

  it("catches an objective with no question that practices it", async () => {
    const l = read(lessonPath("u1-money"));
    l.objectives.push({ id: "o-orphan", text: "Say a thing nobody asks." });
    const r = await run(pedagogy, withFiles({ [lessonPath("u1-money")]: l }));
    expect(checkOf(r, "objective-mapping")?.status).toBe("red");
    expect(checkOf(r, "objective-mapping")?.detail).toMatch(/o-orphan/);
  });

  it("catches a teaching lesson with too few questions", async () => {
    const l = read(lessonPath("u1-money"));
    l.questions = l.questions.slice(0, 2);
    expect(
      checkOf(await run(pedagogy, withFiles({ [lessonPath("u1-money")]: l })), "enough-practice")
        ?.status,
    ).toBe("red");
  });

  it("catches a practice step that ends up with too few questions", async () => {
    const l = read(lessonPath("u1-practice-1"));
    l.pool.perLesson = 1;
    l.pool.from = ["u1-money"];
    l.questions = [];
    expect(
      checkOf(await run(pedagogy, withFiles({ [lessonPath("u1-practice-1")]: l })), "pool-size")
        ?.status,
    ).toBe("red");
  });
});
