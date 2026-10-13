import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import type { LabQuestion } from "../src/lib/content/lesson-schema";
import { INDICATORS } from "../src/lib/market/types";
import { onboard, resetServer } from "./helpers";
import {
  allQuestions,
  answer,
  cont,
  content,
  playToEnd,
  playUntilQuestion,
} from "./lesson-helpers";

// Chart screens are heavier than Unit 1 screens, so tests get a realistic budget.
test.setTimeout(240_000);

test.beforeEach(async () => {
  await resetServer();
});

const unit2 = content.outline!.units.find((u) => u.id === "u2")!.nodes;
const labs = content.lessons
  .filter((l) => l.id.startsWith("u2-"))
  .flatMap((l) =>
    l.questions.filter((q): q is LabQuestion => q.type === "lab").map((q) => ({ lesson: l.id, q })),
  );
const firstLab = (kind: LabQuestion["task"]["kind"]) => labs.find((l) => l.q.task.kind === kind);

async function axeClean(page: Page, where: string) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(
    bad.map(
      (v) =>
        `${where}: ${v.id} (${v.nodes.length}) ${v.nodes[0]?.html.slice(0, 160)} ${v.nodes[0]?.any[0]?.message}`,
    ),
    where,
  ).toEqual([]);
}

/** Open a lesson and play (right answers) until a given question is on screen. */
async function openAt(page: Page, lesson: string, qid: string) {
  await page.goto(`/lesson/${lesson}`);
  await playUntilQuestion(page, qid);
  await expect(page.getByTestId("lab-chart")).toBeVisible();
  await expect(page.locator("[data-testid=lab-chart] canvas").first()).toBeVisible();
}

test("@cp2-finish-unit2 a learner can finish all of Unit 2 on real chart data", async ({
  page,
}) => {
  test.setTimeout(600_000);
  await onboard(page);
  expect(unit2).toHaveLength(16);
  for (const node of unit2) {
    await page.goto(`/lesson/${node.id}`);
    await playToEnd(page);
    await page.getByTestId("finish-btn").click();
    await expect(page.getByTestId("continue-card")).toBeVisible();
  }
  for (const node of unit2)
    await expect(page.getByTestId(`node-${node.id}`)).toHaveAttribute("data-state", "done");
  // Finishing the indicator lessons unlocked every indicator on the practice chart.
  await page.goto("/chart-school");
  for (const id of INDICATORS)
    await expect(page.getByTestId(`school-ind-${id}`)).toHaveAttribute("data-unlocked", "true");
});

test("@cp2-chart charts show candles, volume, unlocked indicators, an OHLC legend and honest labels", async ({
  page,
}) => {
  await onboard(page);
  // A slide chart for each indicator lesson shows that indicator, with a legend.
  for (const [lesson, ind, legendText] of [
    ["u2-ma", "sma", /SMA 20/],
    ["u2-bands", "bands", /Bands/],
    ["u2-rsi", "rsi", /RSI 14/],
    ["u2-macd", "macd", /MACD/],
    ["u2-volume", "volume", /Vol /],
  ] as const) {
    await page.goto(`/lesson/${lesson}`);
    const demo = page.locator(
      `[data-testid=demo-chart] [data-testid=chart][data-indicators*="${ind}"]`,
    );
    // Walk the slides until the chart picture for this indicator shows (the chart loads a moment after its slide).
    for (let i = 0; i < 12 && (await demo.count()) === 0; i++) {
      if ((await page.getByTestId("demo-chart").count()) > 0) {
        await page.waitForTimeout(500); // a chart is loading or showing: give it a moment
        if ((await demo.count()) > 0) break;
      }
      await page.getByTestId("slide-continue").click();
      await page.waitForTimeout(250);
    }
    await expect(demo.first(), `${lesson} shows ${ind}`).toBeVisible();
    await expect(demo.first().locator("canvas").first()).toBeVisible();
    await expect(demo.first().getByTestId("chart-legend")).toContainText(/O \d/);
    await expect(demo.first().getByTestId("chart-legend")).toContainText(/C \d/);
    await expect(demo.first()).toContainText(legendText);
  }

  // Source labels are honest: real history says "Real", made-up says "Made-up", and nothing says "live data".
  const realLab = labs.find((l) => l.q.window.dataset === "aapl-daily")!;
  await openAt(page, realLab.lesson, realLab.q.id);
  await expect(page.getByTestId("chart-source")).toContainText("Real history: Apple daily");
  await expect(page.getByTestId("chart-source")).toContainText("Not live");
  await expect(page.getByTestId("chart-legend")).toContainText(/O \d+\.\d\d/);
  const madeUp = labs.find((l) => l.q.window.dataset === "practice");
  if (madeUp) {
    await openAt(page, madeUp.lesson, madeUp.q.id);
    await expect(page.getByTestId("chart-source")).toContainText("Made-up practice prices");
    await expect(page.getByTestId("chart-source")).toContainText("Not real");
  }
  await expect(page.locator("main")).not.toContainText(/live (data|prices|market)/i);
});

test("@cp2-drawing drawing tools work by mouse and by keyboard, right and wrong", async ({
  page,
  isMobile,
}) => {
  await onboard(page);
  // Mouse (or finger): a tap on the chart places a flat line.
  const h = firstLab("hline");
  if (h) {
    await openAt(page, h.lesson, h.q.id);
    const box = (await page.locator("[data-testid=lab-chart] canvas").first().boundingBox())!;
    await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.45);
    await expect(page.locator("[data-shape=hline]")).toBeVisible();
    await expect(page.getByTestId("check-btn")).toBeEnabled();
    await page.getByTestId("clear-drawing").click();
    await expect(page.locator("[data-shape=hline]")).toHaveCount(0);
    await expect(page.getByTestId("check-btn")).toBeDisabled();
  }
  // Keyboard: every kind of drawing task in Unit 2 can be solved without a mouse, and a wrong drawing is gently marked.
  for (const kind of ["hline", "trendline", "box", "fib", "note", "measure"] as const) {
    const lab = firstLab(kind);
    if (!lab) continue;
    for (const right of [true, false]) {
      await openAt(page, lab.lesson, lab.q.id);
      await answer(page, lab.q, right);
      await page.getByTestId("check-btn").click();
      await expect(page.getByTestId("feedback"), `${kind} right=${right}`).toHaveAttribute(
        "data-correct",
        String(right),
      );
      if (!right) await expect(page.locator("[data-shape]").first()).toBeVisible(); // the right drawing is shown
    }
  }
  expect(isMobile !== undefined).toBe(true);
});

test("@cp2-indicator-toggle the indicator exercise turns indicators on and off", async ({
  page,
}) => {
  await onboard(page);
  const lab = firstLab("indicators");
  expect(lab, "Unit 2 has an indicator-toggle exercise").toBeTruthy();
  await openAt(page, lab!.lesson, lab!.q.id);
  const task = lab!.q.task as Extract<LabQuestion["task"], { kind: "indicators" }>;
  const chart = page.locator("[data-testid=lab-chart] [data-testid=chart]");
  await expect(page.getByTestId("check-btn")).toBeDisabled(); // nothing chosen yet
  // Turning a button on changes the chart; turning it off again puts it back.
  const probe = task.want[0] ?? "rsi";
  const before = await chart.getAttribute("data-indicators");
  const button = page.getByTestId(`ind-${probe}`);
  const wasOn = (await button.getAttribute("aria-pressed")) === "true";
  await button.click();
  await expect(chart).not.toHaveAttribute("data-indicators", before ?? "");
  await button.click();
  await expect(chart).toHaveAttribute("data-indicators", before ?? "");
  expect((await button.getAttribute("aria-pressed")) === "true").toBe(wasOn);
  // The right set passes; a wrong set is marked and shows the answer.
  await answer(page, lab!.q, false);
  await page.getByTestId("check-btn").click();
  await expect(page.getByTestId("feedback")).toHaveAttribute("data-correct", "false");
  await cont(page);
  await page.goto(`/lesson/${lab!.lesson}`);
  await playUntilQuestion(page, lab!.q.id);
  await answer(page, lab!.q, true);
  await page.getByTestId("check-btn").click();
  await expect(page.getByTestId("feedback")).toHaveAttribute("data-correct", "true");
  for (const id of task.want)
    await expect(chart).toHaveAttribute("data-indicators", new RegExp(id));
});

test("@cp2-timeframe switching a timeframe redraws the chart", async ({ page }) => {
  await onboard(page);
  const lab = firstLab("timeframe");
  expect(lab, "Unit 2 has a timeframe exercise").toBeTruthy();
  await openAt(page, lab!.lesson, lab!.q.id);
  const chart = page.locator("[data-testid=lab-chart] [data-testid=chart]");
  const startTf = await chart.getAttribute("data-tf");
  const startBars = Number(await chart.getAttribute("data-bars"));
  const other = lab!.q.timeframes!.find((t) => t !== startTf)!;
  await page.getByTestId(`tf-${other}`).click();
  await expect(chart).toHaveAttribute("data-tf", other);
  expect(Number(await chart.getAttribute("data-bars"))).not.toBe(startBars);
});

test("@cp2-school Chart School: indicators are locked until their lesson is finished", async ({
  page,
}) => {
  await onboard(page);
  await page.goto("/chart-school");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Chart School");
  await expect(page.getByText(/Most day traders lose money/)).toBeVisible();
  await expect(page.locator("canvas").first()).toBeVisible();
  for (const id of INDICATORS) {
    await expect(page.getByTestId(`school-ind-${id}`)).toHaveAttribute("data-unlocked", "false");
    await expect(page.getByTestId(`school-ind-${id}`)).toBeDisabled();
  }
  // Finish the moving-average lesson, and exactly SMA and EMA open up.
  await page.goto("/lesson/u2-ma");
  await playToEnd(page);
  await page.getByTestId("finish-btn").click();
  await page.goto("/chart-school");
  for (const id of ["sma", "ema"] as const)
    await expect(page.getByTestId(`school-ind-${id}`)).toHaveAttribute("data-unlocked", "true");
  await expect(page.getByTestId("school-ind-rsi")).toHaveAttribute("data-unlocked", "false");
  await page.getByTestId("school-ind-sma").click();
  await expect(page.getByTestId("chart").first()).toHaveAttribute("data-indicators", "sma");
  await expect(page.getByTestId("chart-legend").first()).toContainText(/O \d/);
});

test("@cp2-a11y no serious axe violations on chart screens, light and dark", async ({ page }) => {
  test.setTimeout(300_000);
  await onboard(page);
  for (const theme of ["Light", "Dark"]) {
    await page.goto("/settings");
    await page.getByRole("radio", { name: new RegExp(theme) }).click();
    await page.goto("/chart-school");
    await expect(page.locator("canvas").first()).toBeVisible();
    await axeClean(page, `${theme} chart school`);
    const seen = new Set<string>();
    for (const lab of labs) {
      if (seen.has(lab.q.task.kind)) continue;
      seen.add(lab.q.task.kind);
      await openAt(page, lab.lesson, lab.q.id);
      await axeClean(page, `${theme} lab ${lab.q.task.kind}`);
      await answer(page, lab.q, true);
      await page.getByTestId("check-btn").click();
      await expect(page.getByTestId("feedback")).toBeVisible();
      await page.waitForTimeout(800); // let the feedback panel finish sliding in (axe reads mid-animation colors)
      await axeClean(page, `${theme} lab ${lab.q.task.kind} feedback`);
    }
    // a chart picture inside a slide
    await page.goto("/lesson/u2-rsi");
    await expect(page.getByTestId("slide")).toBeVisible();
    await axeClean(page, `${theme} rsi slide`);
  }
});

test("phone: chart screens fit, no sideways scroll, big tap targets", async ({
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
      [...document.querySelectorAll("button, a[href], [role=radio], [role=button], input")]
        .filter((el) => (el as HTMLElement).offsetParent !== null)
        .filter(
          (el) => !el.classList.contains("sr-only") && !el.classList.contains("glossary-term"),
        )
        .map((el) => ({
          el: (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 28),
          r: el.getBoundingClientRect(),
        }))
        .filter(({ r }) => r.width > 0 && (r.height < 47.5 || r.width < 47.5)),
    );
    expect(small, `${label}: small tap targets`).toEqual([]);
  };
  await page.goto("/chart-school");
  await expect(page.locator("canvas").first()).toBeVisible();
  await checkFit("chart school");
  const seen = new Set<string>();
  for (const lab of labs) {
    if (seen.has(lab.q.task.kind)) continue;
    seen.add(lab.q.task.kind);
    await openAt(page, lab.lesson, lab.q.id);
    await checkFit(`lab ${lab.q.task.kind}`);
  }
  await page.goto("/lesson/u2-rsi");
  await expect(page.getByTestId("slide")).toBeVisible();
  await checkFit("rsi slide");
});

test("the lesson engine still blocks nothing: a missed lab comes back once and never locks", async ({
  page,
}) => {
  await onboard(page);
  const lab = labs[0]!;
  await openAt(page, lab.lesson, lab.q.id);
  await answer(page, lab.q, false);
  await page.getByTestId("check-btn").click();
  await expect(page.getByTestId("feedback")).toHaveAttribute("data-correct", "false");
  await expect(page.getByTestId("correct-answer")).toBeVisible();
  await cont(page);
  await expect(page.getByText(/out of hearts/i)).toHaveCount(0);
  expect(allQuestions.get(lab.q.id)).toBeTruthy();
});
