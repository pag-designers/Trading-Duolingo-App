import { createClient } from "@libsql/client";
import { expect, type Page } from "@playwright/test";

/** Wipe the learner's server-side rows so each test starts as a true first run. */
export async function resetServer(): Promise<void> {
  const client = createClient({ url: "file:./prisma/e2e.db" });
  for (const table of ["Settings", "Profile", "User"])
    await client.execute(`DELETE FROM "${table}"`);
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
