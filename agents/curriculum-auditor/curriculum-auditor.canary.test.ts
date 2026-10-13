import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { curriculumAuditor } from ".";
import { fixture, run } from "../testing";

const read = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const CONTENT = ["content"];
const lessonPath = (id: string) => `content/lessons/${id}.json`;

/** Copy all real content, then apply one deliberate break. */
const broken = (overrides: Record<string, unknown>) =>
  fixture(
    CONTENT,
    Object.fromEntries(Object.entries(overrides).map(([k, v]) => [k, JSON.stringify(v)])),
  );
const checkOf = (r: Awaited<ReturnType<typeof run>>, id: string) =>
  r.checks.find((c) => c.id === id);

describe("Curriculum Auditor canary", () => {
  it("control: the real content is not red (and the reading-level check is green)", async () => {
    const r = await run(curriculumAuditor, fixture(CONTENT));
    expect(r.checks.filter((c) => c.status === "red")).toEqual([]);
    expect(checkOf(r, "reading-level")?.status).toBe("green");
    expect(checkOf(r, "glossary-defined-first")?.status).toBe("green");
  });

  it("catches a unit that does not end with a boss", async () => {
    const outline = read("content/outline.json");
    outline.units[0].nodes.pop();
    expect(
      checkOf(
        await run(curriculumAuditor, broken({ "content/outline.json": outline })),
        "outline-structure",
      )?.status,
    ).toBe("red");
  });

  it("catches a sentence above the reading level", async () => {
    const l = read(lessonPath("u1-money"));
    l.slides[0].text =
      "Corporations distribute certificates representing proportional ownership interests.";
    const r = await run(curriculumAuditor, broken({ [lessonPath("u1-money")]: l }));
    expect(checkOf(r, "reading-level")?.status).toBe("red");
    expect(checkOf(r, "reading-level")?.detail).toMatch(/u1-money/);
  });

  it("catches a term used before it is defined", async () => {
    const l = read(lessonPath("u1-money"));
    l.slides[1].text = "People earn money. A stock is a piece of a company.";
    const r = await run(curriculumAuditor, broken({ [lessonPath("u1-money")]: l }));
    expect(checkOf(r, "glossary-defined-first")?.status).toBe("red");
  });

  it("catches a slide that claims to define a term it never uses", async () => {
    const l = read(lessonPath("u1-money"));
    l.slides[3].defines = ["price"];
    const r = await run(curriculumAuditor, broken({ [lessonPath("u1-money")]: l }));
    expect(checkOf(r, "glossary-defined-first")?.status).toBe("red");
  });

  it("catches a duplicate question id", async () => {
    const l = read(lessonPath("u1-money"));
    l.questions[1].id = l.questions[0].id;
    expect(
      checkOf(
        await run(curriculumAuditor, broken({ [lessonPath("u1-money")]: l })),
        "question-ids-answers",
      )?.status,
    ).toBe("red");
  });

  it("catches an answer key that is not one of the options", async () => {
    const l = read(lessonPath("u1-money"));
    l.questions[0].answer = "zzz";
    expect(
      checkOf(
        await run(curriculumAuditor, broken({ [lessonPath("u1-money")]: l })),
        "question-ids-answers",
      )?.status,
    ).toBe("red");
  });

  it("catches a build answer that uses one block twice", async () => {
    const l = read(lessonPath("u1-stock"));
    const build = l.questions.find((q: { type: string }) => q.type === "build");
    build.answer = { s1: "piece", s2: "piece" };
    expect(
      checkOf(
        await run(curriculumAuditor, broken({ [lessonPath("u1-stock")]: l })),
        "question-ids-answers",
      )?.status,
    ).toBe("red");
  });

  it("catches a tap chart question with too many candles to tap on a phone", async () => {
    const l = read(lessonPath("u1-bullbear"));
    const tap = l.questions.find(
      (q: { type: string; ask?: string }) => q.type === "chart" && q.ask === "tap",
    );
    tap.candles = [...tap.candles, ...tap.candles];
    expect(
      checkOf(
        await run(curriculumAuditor, broken({ [lessonPath("u1-bullbear")]: l })),
        "question-ids-answers",
      )?.status,
    ).toBe("red");
  });

  it("catches a trading lesson that forgot the risk reminder flag", async () => {
    const l = read(lessonPath("u1-profit"));
    l.touchesTrading = false;
    expect(
      checkOf(
        await run(curriculumAuditor, broken({ [lessonPath("u1-profit")]: l })),
        "risk-disclaimer",
      )?.status,
    ).toBe("red");
  });

  it("catches broken links (glossary points at a missing lesson; pool points at a missing lesson)", async () => {
    const g = read("content/glossary.json");
    g.terms[0].taughtIn = "u1-nope";
    expect(
      checkOf(await run(curriculumAuditor, broken({ "content/glossary.json": g })), "links")
        ?.status,
    ).toBe("red");
    const p = read(lessonPath("u1-practice-1"));
    p.pool.from.push("u1-ghost");
    expect(
      checkOf(await run(curriculumAuditor, broken({ [lessonPath("u1-practice-1")]: p })), "links")
        ?.status,
    ).toBe("red");
  });

  it("catches a lesson file that does not match its schema, and invalid JSON", async () => {
    const l = read(lessonPath("u1-money"));
    delete l.goal;
    expect((await run(curriculumAuditor, broken({ [lessonPath("u1-money")]: l }))).status).toBe(
      "red",
    );
    const r = await run(
      curriculumAuditor,
      fixture(CONTENT, { [lessonPath("u1-money")]: "{ nope" }),
    );
    expect(checkOf(r, "content-files")?.status).toBe("red");
  });

  it("catches missing content", async () => {
    expect((await run(curriculumAuditor, fixture([]))).status).toBe("red");
  });
});
