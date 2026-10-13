import { createClient } from "@libsql/client";
import { expect, type Page } from "@playwright/test";
import { E2E_DB } from "../playwright.config";

/** Wipe every table so each test starts as a true first run (survives new tables in later checkpoints). */
export async function resetServer(): Promise<void> {
  const client = createClient({ url: E2E_DB });
  const tables = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%'",
  );
  await client.execute("PRAGMA foreign_keys = OFF");
  for (const row of tables.rows) await client.execute(`DELETE FROM "${String(row[0])}"`);
  client.close();
}

/** Click through onboarding quickly; lands on the Learn page. */
export async function onboard(page: Page, name = "Ada"): Promise<void> {
  await page.goto("/");
  await page.waitForURL("**/onboarding");
  await page.getByPlaceholder("Type your name").fill(name);
  await page.getByTestId("onboarding-next").click(); // name → look
  await page.getByTestId("onboarding-next").click(); // look → sound
  await page.getByTestId("onboarding-next").click(); // sound → honest
  await page.getByTestId("onboarding-finish").click();
  await expect(page.getByRole("heading", { name: `Hi ${name}!` })).toBeVisible();
}
