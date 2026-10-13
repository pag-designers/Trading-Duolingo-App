import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { onboard, resetServer } from "./helpers";

test.beforeEach(async () => {
  await resetServer();
});

test("@cp0-app-runs the server answers and a first visit lands on onboarding", async ({
  page,
  request,
}) => {
  const me = await request.get("/api/me");
  expect(me.ok()).toBe(true);
  expect((await me.json()).profile.onboardedAt).toBeNull();
  await page.goto("/");
  await page.waitForURL("**/onboarding");
  await expect(page.getByText("I'm Wick")).toBeVisible();
});

test("@cp0-onboarding walks all four steps, saves, and survives a reload", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await page.waitForURL("**/onboarding");

  // 1 name
  await page.getByPlaceholder("Type your name").fill("Ada");
  await page.getByTestId("onboarding-next").click();
  // 2 look
  await page.getByRole("radio", { name: "Beanie" }).click();
  await expect(page.getByRole("img", { name: /Wick, the Candlo mascot/ })).toBeVisible();
  await page.getByTestId("onboarding-next").click();
  // 3 sound
  await page.getByRole("button", { name: "Sounds off" }).click();
  await expect(page.getByRole("button", { name: "Sounds off" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByTestId("onboarding-next").click();
  // 4 honest talk
  await expect(page.getByText("pretend money")).toBeVisible();
  await expect(page.getByText(/most day traders lose money/i)).toBeVisible();
  await expect(page.getByText(/No hearts to lose/)).toBeVisible();
  await page.getByTestId("onboarding-finish").click();

  await expect(page.getByRole("heading", { name: "Hi Ada!" })).toBeVisible();

  // Saved on the server (SQLite) too.
  await expect
    .poll(async () => (await (await request.get("/api/me")).json()).profile.displayName)
    .toBe("Ada");
  const me = await (await request.get("/api/me")).json();
  expect(me.profile.accessory).toBe("beanie");
  expect(me.settings.soundOn).toBe(false);

  // Reload: no onboarding again.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Hi Ada!" })).toBeVisible();
});

test("@cp0-onboarding a returning learner on a fresh browser skips onboarding (server remembers)", async ({
  page,
  browser,
}) => {
  await onboard(page, "Grace");
  await expect
    .poll(async () => (await (await page.request.get("/api/me")).json()).profile.displayName)
    .toBe("Grace");
  const fresh = await browser.newContext();
  const page2 = await fresh.newPage();
  await page2.goto("http://localhost:" + (process.env.PORT ?? 3100) + "/");
  await expect(page2.getByRole("heading", { name: "Hi Grace!" })).toBeVisible();
  await fresh.close();
});

test("@cp0-path-map renders all 8 units with a current step and honest not-ready sheets", async ({
  page,
}) => {
  await onboard(page);
  await expect(page.locator("section[aria-labelledby$='-title']")).toHaveCount(8);
  await expect(page.getByTestId("node-u1-money")).toHaveAttribute("data-state", "current");
  await expect(page.getByTestId("node-u1-company")).toHaveAttribute("data-state", "upcoming");

  // Tapping a step opens a sheet with its real goal and an honest "not ready" message.
  await page.getByTestId("node-u1-stock").click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByText("A stock is a tiny piece of a company that you can own."),
  ).toBeVisible();
  await expect(dialog.getByTestId("coming-soon")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  // Continue opens the current step.
  await page.getByTestId("continue").click();
  await expect(
    page.getByRole("dialog").getByRole("heading", { name: "What is money?" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");

  // A boss step carries the risk reminder.
  await page.getByTestId("node-u1-boss").scrollIntoViewIfNeeded();
  await page.getByTestId("node-u1-boss").click();
  await expect(page.getByRole("dialog").getByText(/Most day traders lose money/)).toBeVisible();
});

test("@cp0-dark-mode switching to dark changes the look, persists, and stays readable", async ({
  page,
}) => {
  await onboard(page);
  await page.goto("/settings");
  const lightBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.getByRole("radio", { name: /Dark/ }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  const darkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(darkBg).not.toBe(lightBg);

  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.getByTestId("continue-card")).toBeVisible();

  await page.goto("/settings");
  await page.getByRole("radio", { name: /Light/ }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});

test("settings: reading mode enlarges text; reduce motion sets the flag; volume slider works", async ({
  page,
}) => {
  await onboard(page);
  await page.goto("/settings");
  const size = () =>
    page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
  expect(await size()).toBe(18);
  await page.getByRole("switch", { name: "Reading mode" }).click();
  expect(await size()).toBeGreaterThan(18);
  await page.getByRole("switch", { name: "Reduce motion" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
  await page.getByRole("switch", { name: "Sound effects" }).click();
  await expect(page.getByRole("switch", { name: "Sound effects" })).toHaveAttribute(
    "data-state",
    "unchecked",
  );
});

test("@cp0-agents the Health page runs every agent and shows the release gate", async ({
  page,
}) => {
  await onboard(page);
  await page.goto("/admin/health");
  await page.getByTestId("run-agents").click();
  await expect(page.getByTestId("overall")).toBeVisible({ timeout: 30_000 });
  for (const id of [
    "curriculum-auditor",
    "financial-accuracy",
    "safety-guardrails",
    "pedagogy",
    "accessibility-ux",
    "performance",
    "data-integrity",
  ]) {
    await expect(page.getByTestId(`agent-${id}`)).toBeVisible();
  }
  // No agent may be red in a healthy build.
  await expect(page.locator("[data-testid^='agent-'][data-status='red']")).toHaveCount(0);
  await expect(page.getByTestId("overall")).not.toHaveAttribute("data-status", "red");
});

test("every in-app route renders (no placeholders, no crashes)", async ({ page }) => {
  await onboard(page);
  for (const [path, heading] of [
    ["/trade-lab", /Trade Lab is warming up/],
    ["/chart-school", /Chart School opens with Unit 2/],
    ["/glossary", /Your glossary starts empty/],
    ["/journal", /No trades yet/],
    ["/profile", /Ada/],
    ["/settings", /Settings/],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(heading);
  }
  await page.goto("/trade-lab");
  await expect(page.getByText(/Most real day traders lose money/)).toBeVisible();
});

test("a11y smoke: no serious axe violations on key screens in light and dark", async ({ page }) => {
  await onboard(page);
  for (const theme of ["Light", "Dark"]) {
    await page.goto("/settings");
    await page.getByRole("radio", { name: new RegExp(theme) }).click();
    for (const path of ["/", "/settings", "/profile", "/admin/health", "/trade-lab"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      const bad = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );
      expect(
        bad.map((v) => `${theme} ${path}: ${v.id} (${v.nodes.length}) ${v.nodes[0]?.target}`),
        `${theme} ${path}`,
      ).toEqual([]);
    }
  }
});

test("phone layout: bottom tabs, no horizontal scroll, tap targets >= 48px", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "phone project only");
  await onboard(page);
  await expect(page.getByRole("navigation", { name: "Main" }).last()).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  const tooSmall = await page.evaluate(() =>
    [...document.querySelectorAll("button, a[href]")]
      .filter(
        (el) =>
          (el as HTMLElement).offsetParent !== null &&
          // the skip link is visually hidden until focused, on purpose
          !el.classList.contains("sr-only"),
      )
      .map((el) => ({
        el: (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 30),
        r: el.getBoundingClientRect(),
      }))
      .filter(({ r }) => r.height < 47.5 || r.width < 47.5),
  );
  expect(tooSmall).toEqual([]);
});

test("security: /api/me rejects cross-site and non-JSON writes; admin run rejects other hosts", async ({
  request,
}) => {
  const body = JSON.stringify(await (await request.get("/api/me")).json());
  // A cross-site page can send text/plain without a preflight — must be refused.
  const plain = await request.put("/api/me", {
    headers: { "content-type": "text/plain" },
    data: body,
  });
  expect(plain.status()).toBe(415);
  // A request claiming to come from another site — must be refused.
  const cross = await request.put("/api/me", {
    headers: { "content-type": "application/json", origin: "https://evil.example" },
    data: body,
  });
  expect(cross.status()).toBe(403);
  // Same-origin JSON still works.
  const ok = await request.put("/api/me", {
    headers: { "content-type": "application/json" },
    data: body,
  });
  expect(ok.status()).toBe(200);
  // The agent runner only answers on loopback hosts and the same origin.
  const rebind = await request.post("/api/admin/health", { headers: { host: "evil.example" } });
  expect(rebind.status()).toBe(403);
  const crossAdmin = await request.post("/api/admin/health", {
    headers: { origin: "https://evil.example" },
  });
  expect(crossAdmin.status()).toBe(403);
});
