import { expect, type Page } from "@playwright/test";
import { loadContent } from "../src/lib/content/load";
import { priceRange, solutionFor, type LabAnswer, type Pt } from "../src/lib/chart/lab";
import type { LabQuestion, Question } from "../src/lib/content/lesson-schema";
import { windowBars } from "../src/lib/market/data";
import { INDICATORS } from "../src/lib/market/types";

/** Everything the app teaches, read from the same files the app uses (so tests never drift from content). */
export const content = loadContent(process.cwd());
export const allQuestions = new Map<string, Question>(
  content.lessons.flatMap((l) => l.questions.map((q) => [q.id, q] as const)),
);
export const lessonIds = content.lessons.map((l) => l.id);

/**
 * Wait until the card for the CURRENT step is on screen. The previous card fades out for a moment (and keeps
 * its old, locked look), so acting before this can hit the wrong card. Cards carry `data-step` for this.
 */
export async function settle(page: Page): Promise<void> {
  await expect
    .poll(async () => {
      if (
        (await page.getByTestId("complete").count()) + (await page.getByTestId("chest").count()) >
        0
      )
        return true;
      const step = await page.getByTestId("lesson-player").getAttribute("data-step");
      return (
        step !== null &&
        (await page
          .locator(
            `[data-testid][data-step="${step}"]:is([data-testid=slide],[data-testid=question])`,
          )
          .count()) > 0
      );
    })
    .toBe(true);
}

/** Press Continue (after feedback) and wait for the next card. */
export async function cont(page: Page): Promise<void> {
  await page.getByTestId("continue-btn").click();
  await settle(page);
}

/** Press Continue on a teach slide and wait for the next card. */
export async function nextSlide(page: Page): Promise<void> {
  await page.getByTestId("slide-continue").click();
  await settle(page);
}

/**
 * Solve (or deliberately fail) a Chart Lab question with the KEYBOARD, the same way a learner without a mouse would:
 * arrow keys move a cursor to a candle, a snap button sets the price to its high/low/open/close, arrow keys fine-tune the
 * price, and "Place" drops the point.
 */
export async function solveLab(page: Page, q: LabQuestion, right = true): Promise<void> {
  const bars = windowBars(q.window);
  const chart = page.getByTestId("lab-chart");
  const mid = Math.floor((bars.length - 1) / 2);
  const step = priceRange(bars) / 60;
  let idx: number | null = null;

  const goto = async (i: number) => {
    await chart.focus();
    if (idx === null) {
      await page.keyboard.press("ArrowRight"); // the first arrow press puts the cursor on the middle candle
      idx = mid;
    }
    while (idx !== i) {
      const d = i - idx;
      const big = Math.abs(d) >= 5;
      await page.keyboard.press(`${big ? "Shift+" : ""}Arrow${d > 0 ? "Right" : "Left"}`);
      idx += Math.sign(d) * (big ? 5 : 1);
    }
  };
  const point = async (p: Pt) => {
    const i = Math.max(0, Math.min(bars.length - 1, Math.round(p.i)));
    await goto(i);
    const b = bars[i]!;
    const fields = ["open", "high", "low", "close"] as const;
    const field = fields.reduce((best, f) =>
      Math.abs(b[f] - p.price) < Math.abs(b[best] - p.price) ? f : best,
    );
    await page.getByTestId(`snap-${field}`).click();
    let n = Math.round((p.price - b[field]) / step);
    await chart.focus();
    while (n !== 0) {
      const big = Math.abs(n) >= 5;
      await page.keyboard.press(`${big ? "Shift+" : ""}Arrow${n > 0 ? "Up" : "Down"}`);
      n -= Math.sign(n) * (big ? 5 : 1);
    }
    await page.getByTestId("place-point").click();
  };
  /** A point that is surely wrong: half the chart's price range higher. */
  const off = (p: Pt): Pt => ({ i: p.i, price: p.price + priceRange(bars) * 0.5 });

  const sol: LabAnswer = solutionFor(q, bars);
  switch (sol.kind) {
    case "find-bar": {
      const target = right ? sol.bar : sol.bar === 0 ? 1 : 0;
      await goto(target);
      return;
    }
    case "hline":
      await point({ i: 0, price: right ? sol.price : sol.price + priceRange(bars) * 0.5 });
      return;
    case "trendline":
    case "box":
    case "fib":
    case "measure":
      await point(right ? sol.a : off(sol.a));
      await point(right ? sol.b : off(sol.b));
      return;
    case "note": {
      await point(right ? sol.at : { i: (sol.at.i + 10) % bars.length, price: sol.at.price });
      await page.getByTestId("note-text").fill(sol.text);
      return;
    }
    case "timeframe": {
      const other = (q.timeframes ?? []).find((t) => t !== sol.tf)!;
      await page.getByTestId(`tf-${right ? sol.tf : other}`).click();
      return;
    }
    case "indicators": {
      const want = right ? sol.on : sol.on.length ? [] : ["rsi" as const];
      for (const id of INDICATORS) {
        const button = page.getByTestId(`ind-${id}`);
        if (!(await button.count())) continue;
        const isOn = (await button.getAttribute("aria-pressed")) === "true";
        if (isOn !== want.includes(id)) await button.click();
      }
      return;
    }
  }
}

/** Answer the question on screen correctly (or deliberately wrongly). Does not press Check. */
export async function answer(page: Page, q: Question, right = true): Promise<void> {
  switch (q.type) {
    case "mc": {
      const wrong = q.options.find((o) => o.id !== q.answer)!.id;
      await page.getByTestId(`option-${right ? q.answer : wrong}`).click();
      return;
    }
    case "tf":
      await page.getByTestId(`option-${String(right ? q.answer : !q.answer)}`).click();
      return;
    case "match": {
      const ids = q.pairs.map((p) => p.id);
      for (const [i, id] of ids.entries()) {
        const def = right ? id : ids[(i + 1) % ids.length]!; // wrong: shift every link by one
        await page.getByTestId(`term-${id}`).click();
        await page.getByTestId(`def-${def}`).click();
      }
      return;
    }
    case "chart":
      if (q.ask === "tap") {
        const wrongIndex = q.answerIndex === 0 ? 1 : 0;
        await page.getByTestId(`candle-${right ? q.answerIndex : wrongIndex}`).click();
      } else {
        const wrong = q.options!.find((o) => o.id !== q.answer)!.id;
        await page.getByTestId(`option-${right ? q.answer : wrong}`).click();
      }
      return;
    case "build": {
      const slotIds = q.slots.map((s) => s.id);
      const blocks = right
        ? slotIds.map((s) => q.answer[s]!)
        : [...slotIds.map((s) => q.answer[s]!)].reverse(); // wrong: fill the slots in reverse
      for (const b of blocks) await page.getByTestId(`block-${b}`).click();
      return;
    }
    case "lab":
      return solveLab(page, q, right);
  }
}

/**
 * Play the current lesson from wherever it is to the finish screen.
 * `miss` lists question ids to answer wrongly the first time (they come back once, and are then answered right).
 */
export async function playToEnd(
  page: Page,
  opts: { miss?: string[] } = {},
): Promise<{ asked: string[] }> {
  const asked: string[] = [];
  const missed = new Set<string>();
  for (let guard = 0; guard < 80; guard++) {
    if (await page.getByTestId("complete").isVisible()) break;
    if (await page.getByTestId("chest").isVisible()) break;
    if (await page.getByTestId("slide-continue").isVisible()) {
      await nextSlide(page);
      continue;
    }
    const qEl = page.getByTestId("question");
    if (await qEl.isVisible()) {
      const qid = (await qEl.getAttribute("data-qid"))!;
      const q = allQuestions.get(qid);
      if (!q) throw new Error(`Question ${qid} is on screen but not in the content files`);
      asked.push(qid);
      const wrongNow = (opts.miss ?? []).includes(qid) && !missed.has(qid);
      if (wrongNow) missed.add(qid);
      await answer(page, q, !wrongNow);
      await page.getByTestId("check-btn").click();
      await expect(page.getByTestId("feedback")).toBeVisible();
      await cont(page);
      continue;
    }
    await page.waitForTimeout(60);
  }
  await expect(page.getByTestId("complete")).toBeVisible();
  return { asked };
}

/** Answer every question correctly until the question with this id is on screen (it is left unanswered). */
export async function playUntilQuestion(page: Page, qid: string): Promise<void> {
  for (let guard = 0; guard < 80; guard++) {
    const qEl = page.getByTestId("question");
    if (await qEl.isVisible()) {
      const id = (await qEl.getAttribute("data-qid"))!;
      if (id === qid) return;
      await answer(page, allQuestions.get(id)!, true);
      await page.getByTestId("check-btn").click();
      await expect(page.getByTestId("feedback")).toBeVisible();
      await cont(page);
      continue;
    }
    if (await page.getByTestId("slide-continue").isVisible()) {
      await nextSlide(page);
      continue;
    }
    await page.waitForTimeout(60);
  }
  throw new Error(`Never reached question ${qid}`);
}

/** Press, move and release the mouse (a real drag, with steps so the drag threshold is crossed). */
export async function dragWithMouse(
  page: Page,
  fromTestId: string,
  toTestId: string,
): Promise<void> {
  const a = (await page.getByTestId(fromTestId).boundingBox())!;
  const b = (await page.getByTestId(toTestId).boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 12, a.y + a.height / 2 + 12, { steps: 4 });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
  await page.mouse.up();
}

/** Finish one step from the Learn page: Continue → play (or open the chest) → back to Learn. */
export async function finishCurrentStep(page: Page): Promise<string> {
  const href = (await page.getByTestId("continue").getAttribute("href"))!;
  await page.getByTestId("continue").click();
  if (href.endsWith("chest-1")) {
    await page.getByTestId("open-chest").click();
    await expect(page.getByTestId("chest-xp")).toBeVisible();
  } else {
    await playToEnd(page);
  }
  await page.getByTestId("finish-btn").click();
  await expect(page.getByTestId("continue-card")).toBeVisible();
  return href.replace("/lesson/", "");
}
