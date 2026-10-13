import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { calcXp } from "../src/lib/lesson/xp";
import { onboard, resetServer } from "./helpers";
import {
  allQuestions,
  answer,
  cont,
  content,
  dragWithMouse,
  finishCurrentStep,
  nextSlide,
  playToEnd,
  playUntilQuestion,
  settle,
} from "./lesson-helpers";

// Many tests here play whole lessons, so they get a realistic budget.
test.setTimeout(90_000);

test.beforeEach(async () => {
  await resetServer();
});

const PERFECT_LESSON_XP = calcXp({
  nodeType: "lesson",
  questionCount: 5,
  firstTryCorrect: 5,
  focusFills: 1,
  repeat: false,
}).total;

const xpChip = (page: Page, xp: number) =>
  page.getByLabel(`${xp} experience points`).filter({ visible: true });

async function axeClean(page: Page, where: string) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(
    bad.map((v) => `${where}: ${v.id} (${v.nodes.length}) ${v.nodes[0]?.target}`),
    where,
  ).toEqual([]);
}

test("@cp1-finish-unit1 a learner can finish all of Unit 1, start to finish", async ({ page }) => {
  test.setTimeout(240_000);
  await onboard(page);
  const unit1 = content.outline!.units[0]!.nodes;
  expect(unit1).toHaveLength(12);

  const finished: string[] = [];
  for (let i = 0; i < unit1.length; i++) finished.push(await finishCurrentStep(page));
  expect(finished).toEqual(unit1.map((n) => n.id)); // in course order

  for (const n of unit1)
    await expect(page.getByTestId(`node-${n.id}`)).toHaveAttribute("data-state", "done");
  // The course moves on: the current step is now the first step of Unit 2, which is honest about not being written yet.
  await expect(page.getByTestId(`node-u2-account`)).toHaveAttribute("data-state", "current");
  await expect(page.getByTestId("continue-card")).toContainText("Meet TradingView");
  await page.getByTestId("continue").click();
  await expect(page.getByTestId("coming-soon")).toBeVisible();

  // XP, level and steps all moved.
  await page.goto("/profile");
  await expect(page.getByText("Steps done")).toBeVisible();
  await expect(page.locator("main").getByText("12", { exact: true }).first()).toBeVisible();
});

test("@cp1-xp-streak XP and streak update after a lesson, and match the rules", async ({
  page,
}) => {
  await onboard(page);
  await page.goto("/lesson/u1-money");
  await playToEnd(page);

  const done = page.getByTestId("complete");
  expect(Number(await done.getAttribute("data-xp"))).toBe(PERFECT_LESSON_XP);
  await expect(page.getByTestId("complete-sub")).toHaveText(
    "You got 5 of 5 right on the first try.",
  );
  await expect(page.getByTestId("streak-card")).toHaveAttribute("data-streak", "1");
  await expect(page.getByTestId("streak-card")).toHaveAttribute("data-streak-up", "true");
  await expect(page.getByTestId("confetti")).toBeVisible(); // celebrate (motion is not reduced)
  await expect(page.getByTestId("xp-total")).toContainText(String(PERFECT_LESSON_XP));

  await page.getByTestId("finish-btn").click();
  await expect(page.getByTestId("continue-card")).toBeVisible();
  await expect(xpChip(page, PERFECT_LESSON_XP)).toHaveCount(1);
  await expect(page.getByLabel("Streak: 1 day").filter({ visible: true })).toHaveCount(1);
  await expect(page.getByTestId("node-u1-money")).toHaveAttribute("data-state", "done");
  await expect(page.getByTestId("node-u1-company")).toHaveAttribute("data-state", "current");
});

test("@cp1-no-lockout mistakes never block: right answer shown, one retry, Focus never drops, lesson still finishes", async ({
  page,
}) => {
  await onboard(page);
  await page.goto("/lesson/u1-money");
  await playUntilQuestion(page, "q-money-1");

  // One mistake: gentle feedback, the right answer, the reason, and a second try promised.
  await answer(page, allQuestions.get("q-money-1")!, false);
  await page.getByTestId("check-btn").click();
  await expect(page.getByTestId("feedback")).toHaveAttribute("data-correct", "false");
  await expect(page.getByTestId("correct-answer")).toContainText("A tool we use to buy things");
  await expect(page.getByTestId("explanation")).toContainText("Money is what we use to buy things");
  await expect(page.getByTestId("feedback")).toContainText("again at the end");
  await expect(page.getByTestId("focus-meter")).toHaveAttribute("aria-valuenow", "0");
  await cont(page);

  // Get the next one right: the Focus meter fills and a wrong answer after it does not drain it.
  await answer(page, allQuestions.get("q-money-2")!, true);
  await page.getByTestId("check-btn").click();
  await cont(page);
  await expect(page.getByTestId("focus-meter")).toHaveAttribute("aria-valuenow", "1");
  await answer(page, allQuestions.get("q-money-3")!, false);
  await page.getByTestId("check-btn").click();
  await expect(page.getByTestId("focus-meter")).toHaveAttribute("aria-valuenow", "1");
  await cont(page);

  // The missed question comes back as a second try, at the end; finishing is still possible.
  await playToEnd(page, { miss: ["q-money-4", "q-money-5"] });
  // q-money-2 was the only one right on the first try.
  await expect(page.getByTestId("complete-sub")).toContainText("1 of 5");
  await expect(page.locator("body")).not.toContainText(/out of hearts|no hearts|hearts left/i);
  await page.getByTestId("finish-btn").click();
  await expect(page.getByTestId("node-u1-money")).toHaveAttribute("data-state", "done"); // a bad score still counts
});

test("@cp1-no-lockout missing every question in a lesson still lets the learner finish and move on", async ({
  page,
}) => {
  await onboard(page);
  await page.goto("/lesson/u1-money");
  const ids = content.lessons.find((l) => l.id === "u1-money")!.questions.map((q) => q.id);
  await playToEnd(page, { miss: ids });
  await expect(page.getByTestId("complete-sub")).toContainText("0 of 5");
  const xp = Number(await page.getByTestId("complete").getAttribute("data-xp"));
  expect(xp).toBeGreaterThan(0); // finishing always earns something
  await page.getByTestId("finish-btn").click();
  await expect(page.getByTestId("node-u1-company")).toHaveAttribute("data-state", "current");
});

test("@cp1-reopen any lesson can be reopened; replays give the small review bonus once per play", async ({
  page,
}) => {
  await onboard(page);
  await page.goto("/lesson/u1-money");
  await playToEnd(page);
  await page.getByTestId("finish-btn").click();

  await page.getByTestId("node-u1-money").click();
  await expect(page.getByTestId("start-lesson")).toContainText("Practice again");
  await page.getByTestId("start-lesson").click();
  await playToEnd(page);
  expect(Number(await page.getByTestId("complete").getAttribute("data-xp"))).toBe(5);

  // "Practice again" from the finish screen replays with a fresh session.
  await page.getByTestId("again-btn").click();
  await expect(page.getByTestId("lesson-player")).toBeVisible();
  await expect(page.getByTestId("slide")).toBeVisible();
  await playToEnd(page);
  await page.getByTestId("finish-btn").click();

  // Total = first run + two reviews; the step still counts once.
  await expect(xpChip(page, PERFECT_LESSON_XP + 10)).toHaveCount(1);
  await page.goto("/profile");
  await expect(
    page.getByText("Steps done").locator("..").getByText("1", { exact: true }),
  ).toBeVisible();
});

test("@cp1-glossary tapping a highlighted word opens its card; the Glossary page searches and filters", async ({
  page,
}) => {
  await onboard(page);
  await page.goto("/lesson/u1-stock");
  await nextSlide(page); // slide 2 defines "stock"
  await page.getByTestId("term-stock").first().click();
  const card = page.getByTestId("term-card");
  await expect(card).toContainText("A stock is a small piece of a company that you can own.");
  await expect(card).toContainText("Think of it like this");
  await expect(card).toContainText("Example");
  await expect(card.getByRole("link", { name: "What is a stock?" })).toHaveAttribute(
    "href",
    "/lesson/u1-stock",
  );
  await page.keyboard.press("Escape");

  // Glossary page
  await page.goto("/glossary");
  await expect(page.getByTestId("glossary-count")).toContainText(
    `${content.glossary!.terms.length} words`,
  );
  await page.getByTestId("glossary-search").fill("profit");
  await expect(page.locator("[data-term='profit']")).toBeVisible();
  await expect(page.locator("[data-term='eps']")).toBeVisible(); // EPS: "the profit a company made for each share"
  await expect(page.locator("[data-term='ticker']")).toHaveCount(0); // unrelated words are filtered out
  await page.getByTestId("glossary-search").fill("zzzz");
  await expect(page.getByTestId("glossary-empty")).toBeVisible();
  await page.getByTestId("glossary-search").fill("");

  // Short words (abbreviations): search and filter
  await page.getByRole("radio", { name: /Short words/ }).click();
  await expect(page.getByTestId("glossary-count")).toContainText(
    `${content.abbreviations!.items.length} short words`,
  );
  await page.getByTestId("glossary-search").fill("EPS");
  await expect(page.getByTestId("glossary-count")).toContainText("short word");
  await page.getByTestId("glossary-search").fill("");
  await page.getByRole("radio", { name: "Slang" }).click();
  const slang = content
    .abbreviations!.items.filter((a) => a.category === "slang")
    .map((a) => a.abbr);
  await expect(page.getByTestId("glossary-count")).toContainText(`${slang.length} short words`);
  for (const abbr of ["DD", "HODL", "FOMO", "YOLO"]) expect(slang).toContain(abbr);
});

test("@cp1-sync progress reaches the database, comes back on a fresh browser, and merges both ways", async ({
  page,
  request,
  browser,
}) => {
  await onboard(page);
  await page.goto("/lesson/u1-money");
  await playToEnd(page);
  await page.getByTestId("finish-btn").click();

  await expect
    .poll(async () => (await (await request.get("/api/progress")).json()).nodes["u1-money"]?.status)
    .toBe("done");
  const server = await (await request.get("/api/progress")).json();
  expect(server.totalXp).toBe(PERFECT_LESSON_XP);
  expect(
    Object.values(server.days as Record<string, { lessonsDone: number }>)[0]?.lessonsDone,
  ).toBe(1);

  // A different browser knows the learner: progress is restored from SQLite.
  const fresh = await browser.newContext({
    baseURL: `http://localhost:${process.env.PORT ?? 3100}`,
  });
  const page2 = await fresh.newPage();
  await page2.goto("/");
  await expect(page2.getByTestId("continue-card")).toBeVisible();
  await expect(page2.getByTestId("node-u1-money")).toHaveAttribute("data-state", "done");
  await expect(xpChip(page2, PERFECT_LESSON_XP)).toHaveCount(1);

  // Another device finishes a different step: the merge keeps both (nothing lost either way).
  const put = await request.put("/api/progress", {
    headers: { "content-type": "application/json" },
    data: {
      totalXp: 0,
      days: {},
      nodes: {
        "u1-company": {
          status: "done",
          bestScore: 80,
          attempts: 1,
          completedAt: "2026-03-10T10:00:00.000Z",
        },
      },
    },
  });
  expect(put.ok()).toBe(true);
  const merged = await put.json();
  expect(merged.nodes["u1-money"].status).toBe("done");
  expect(merged.nodes["u1-company"].status).toBe("done");
  await page.reload();
  await expect(page.getByTestId("node-u1-company")).toHaveAttribute("data-state", "done");
  await fresh.close();

  // Garbage is refused, not stored.
  const bad = await request.put("/api/progress", {
    headers: { "content-type": "application/json" },
    data: { totalXp: -5, days: {}, nodes: { "../../etc": {} } },
  });
  expect(bad.status()).toBe(400);
});

test("@cp1-types tap a candle (chart) with the keyboard, build a sentence", async ({ page }) => {
  await onboard(page);

  // Chart: tap the highest candle using the keyboard
  await page.goto("/lesson/u1-bullbear");
  await playUntilQuestion(page, "q-bb-5");
  const tap = allQuestions.get("q-bb-5");
  if (tap?.type !== "chart") throw new Error("expected a chart question");
  await page.getByTestId(`candle-${tap.answerIndex}`).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId(`candle-${tap.answerIndex}`)).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByTestId("check-btn").click();
  await expect(page.getByTestId("feedback")).toHaveAttribute("data-correct", "true");

  // Build: wrong order shows partial credit and the right answer; blocks can be taken back
  await page.goto("/lesson/u1-profit");
  await playUntilQuestion(page, "q-profit-4");
  await page.getByTestId("block-buy").click();
  await expect(page.getByTestId("slot-s1")).toContainText("buy price");
  await page.getByTestId("slot-s1").click(); // take it back
  await expect(page.getByTestId("slot-s1")).toContainText("…");
  await answer(page, allQuestions.get("q-profit-4")!, false);
  await page.getByTestId("check-btn").click();
  await expect(page.getByTestId("feedback")).toHaveAttribute("data-correct", "false");
  await expect(page.getByTestId("correct-answer")).toContainText(
    "Profit = sell price minus buy price",
  );
});

test("@cp1-drag drag a word onto its meaning (match) with a mouse", async ({ page, isMobile }) => {
  test.skip(isMobile, "dragging is for mouse and big screens; tapping is tested everywhere");
  await onboard(page);
  await page.goto("/lesson/u1-company");
  await playUntilQuestion(page, "q-company-2");
  const match = allQuestions.get("q-company-2");
  if (match?.type !== "match") throw new Error("expected a match question");
  for (const p of match.pairs) await dragWithMouse(page, `term-${p.id}`, `def-${p.id}`);
  for (const p of match.pairs)
    await expect(page.getByTestId(`term-${p.id}`)).toHaveAttribute("data-state", "selected");
  await page.getByTestId("check-btn").click();
  await expect(page.getByTestId("feedback")).toHaveAttribute("data-correct", "true");
});

test("@cp1-keyboard Enter moves on, number keys pick answers", async ({ page }) => {
  await onboard(page);
  await page.goto("/lesson/u1-money");
  await expect(page.getByTestId("slide")).toBeVisible(); // wait for the lesson to load before typing
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press("Enter"); // four slides
    await settle(page);
  }
  await expect(page.getByTestId("question")).toBeVisible();
  await page.keyboard.press("1");
  await expect(page.getByTestId("option-a")).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("Enter"); // check
  await expect(page.getByTestId("feedback")).toHaveAttribute("data-correct", "true");
  await page.keyboard.press("Enter"); // continue
  await expect(page.getByTestId("question")).toHaveAttribute("data-qid", "q-money-2");
});

test("@cp1-risk the risk reminder shows on trading lessons, not on money or company", async ({
  page,
}) => {
  await onboard(page);
  await page.goto("/lesson/u1-money");
  await expect(page.getByTestId("slide")).toBeVisible();
  await expect(page.getByTestId("risk-reminder")).toHaveCount(0);
  await page.goto("/lesson/u1-stock");
  await expect(page.getByTestId("risk-reminder")).toBeVisible();
  await expect(page.getByTestId("risk-reminder")).toContainText("Most day traders lose money");
  await playToEnd(page);
  await expect(page.getByTestId("risk-reminder")).toBeVisible(); // and on the results screen
});

test("@cp1-motion the in-app Reduce motion setting turns confetti off; sounds off still works", async ({
  page,
}) => {
  await onboard(page);
  await page.goto("/settings");
  await page.getByRole("switch", { name: "Reduce motion" }).click();
  await page.getByRole("switch", { name: "Sound effects" }).click();
  await page.goto("/lesson/u1-money");
  await playToEnd(page);
  await expect(page.getByTestId("complete")).toBeVisible();
  await expect(page.getByTestId("confetti")).toHaveCount(0);
  await expect(page.getByTestId("xp-total")).toContainText(String(PERFECT_LESSON_XP)); // numbers show at once
});

test("@cp1-chest a treasure chest gives XP once, then the small review bonus", async ({ page }) => {
  await onboard(page);
  await page.goto("/lesson/u1-chest-1");
  await page.getByTestId("open-chest").click();
  await expect(page.getByTestId("chest-xp")).toContainText("15");
  await page.getByTestId("finish-btn").click();
  await page.goto("/lesson/u1-chest-1");
  await page.getByTestId("open-chest").click();
  await expect(page.getByTestId("chest-xp")).toContainText("5");
  await page.getByTestId("finish-btn").click();
  await expect(xpChip(page, 20)).toHaveCount(1);
});

test("a practice step mixes questions from earlier lessons and finishes", async ({ page }) => {
  await onboard(page);
  await page.goto("/lesson/u1-practice-1");
  const { asked } = await playToEnd(page);
  expect(asked.length).toBeGreaterThanOrEqual(6);
  const fromEarlier = new Set(
    content.lessons
      .filter((l) => ["u1-money", "u1-company", "u1-stock"].includes(l.id))
      .flatMap((l) => l.questions.map((q) => q.id)),
  );
  expect(asked.filter((id) => fromEarlier.has(id)).length).toBeGreaterThanOrEqual(5);
});

test("unknown steps are a 404, not a crash; leaving a lesson is gentle", async ({ page }) => {
  await onboard(page);
  const res = await page.goto("/lesson/u9-nothing");
  expect(res?.status()).toBe(404);
  await page.goto("/lesson/u2-account"); // exists in the outline but is not written yet
  await expect(page.getByText(/404|could not be found/i).first()).toBeVisible();
  await page.goto("/lesson/u1-money");
  await page.getByTestId("leave").click();
  await expect(page.getByText("No worries. You can come back any time.")).toBeVisible();
  await page.getByTestId("confirm-leave").click();
  await expect(page.getByTestId("continue-card")).toBeVisible();
  await expect(page.getByTestId("node-u1-money")).toHaveAttribute("data-state", "current"); // nothing lost, nothing counted
});

test("@cp1-a11y no serious axe violations on lesson screens, light and dark", async ({ page }) => {
  test.setTimeout(240_000);
  await onboard(page);
  for (const theme of ["Light", "Dark"]) {
    await page.goto("/settings");
    await page.getByRole("radio", { name: new RegExp(theme) }).click();

    // teach slide, question, wrong + right feedback
    await page.goto("/lesson/u1-stock");
    await expect(page.getByTestId("slide")).toBeVisible();
    await axeClean(page, `${theme} slide`);
    await playUntilQuestion(page, "q-stock-1");
    await axeClean(page, `${theme} mc`);
    await answer(page, allQuestions.get("q-stock-1")!, false);
    await page.getByTestId("check-btn").click();
    await expect(page.getByTestId("feedback")).toBeVisible();
    await axeClean(page, `${theme} wrong feedback`);
    await cont(page);
    await answer(page, allQuestions.get("q-stock-2")!, true);
    await page.getByTestId("check-btn").click();
    await axeClean(page, `${theme} right feedback`);

    // match, chart, build
    for (const [lesson, qid] of [
      ["u1-company", "q-company-2"],
      ["u1-bullbear", "q-bb-3"],
      ["u1-bullbear", "q-bb-5"],
      ["u1-profit", "q-profit-4"],
    ] as const) {
      await page.goto(`/lesson/${lesson}`);
      await playUntilQuestion(page, qid);
      await axeClean(page, `${theme} ${qid}`);
    }

    // glossary sheet, results, chest, glossary pages
    await page.goto("/lesson/u1-money");
    await page.getByTestId("term-money").first().click();
    await expect(page.getByTestId("term-card")).toBeVisible();
    await axeClean(page, `${theme} term card`);
    await page.keyboard.press("Escape");
    await playToEnd(page);
    await page.waitForTimeout(1200); // let the numbers finish rolling
    await axeClean(page, `${theme} results`);
    await page.goto("/lesson/u1-chest-1");
    await axeClean(page, `${theme} chest closed`);
    await page.goto("/glossary");
    await axeClean(page, `${theme} glossary words`);
    await page.getByRole("radio", { name: /Short words/ }).click();
    await axeClean(page, `${theme} glossary short words`);
    await page.goto("/");
    await axeClean(page, `${theme} learn with progress`);
  }
});

test("phone: lesson screens fit, no sideways scroll, big tap targets", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "phone project only");
  await onboard(page);
  const checkFit = async (label: string) => {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${label}: horizontal overflow`).toBeLessThanOrEqual(0);
    const small = await page.evaluate(() =>
      [...document.querySelectorAll("button, a[href], [role=radio], [role=button]")]
        .filter((el) => (el as HTMLElement).offsetParent !== null || el.closest("svg"))
        .filter(
          (el) => !el.classList.contains("sr-only") && !el.classList.contains("glossary-term"),
        ) // inline words are exempt
        .map((el) => ({
          el: (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 28),
          r: el.getBoundingClientRect(),
        }))
        .filter(({ r }) => r.width > 0 && (r.height < 47.5 || r.width < 47.5)),
    );
    expect(small, `${label}: small tap targets`).toEqual([]);
  };
  await page.goto("/lesson/u1-stock");
  await expect(page.getByTestId("slide")).toBeVisible();
  await checkFit("slide");
  await playUntilQuestion(page, "q-stock-1");
  await checkFit("mc");
  await page.goto("/lesson/u1-company");
  await playUntilQuestion(page, "q-company-2");
  await checkFit("match");
  await page.goto("/lesson/u1-bullbear");
  await playUntilQuestion(page, "q-bb-3");
  await checkFit("chart");
  await page.goto("/glossary");
  await checkFit("glossary");
});
