import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { nav, signIn, signOut } from "./helpers";

/**
 * Automated WCAG 2.1 A/AA checks (axe-core) on every page of the core workflow, using the demo build so no API is
 * needed. Automated checks catch roughly a third of real issues; keyboard and screen-reader passes are still manual.
 */
async function expectNoViolations(page: Page, label: string) {
  await page.waitForLoadState("networkidle");
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const summary = violations.map((v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(", ")}`);
  expect(summary, `${label} accessibility violations`).toEqual([]);
}

test("auth pages have no automated WCAG violations", async ({ page }) => {
  await page.goto("/login");
  await expectNoViolations(page, "login");
  await page.goto("/register");
  await expectNoViolations(page, "register");
});

test("student pages have no automated WCAG violations", async ({ page }) => {
  await signIn(page, "student", "Student123!");
  await expectNoViolations(page, "student dashboard");
  await nav(page, "Order QC").click();
  await expect(page.getByRole("heading", { name: "Order QC" })).toBeVisible();
  await expectNoViolations(page, "order QC");
  await nav(page, "My QC runs").click();
  await expect(page.getByRole("table")).toBeVisible();
  await expectNoViolations(page, "my runs");
  await page.getByRole("link", { name: /Open BMP Level I run/ }).first().click();
  await expect(page.getByRole("heading", { name: "Levey-Jennings charts" })).toBeVisible();
  await expectNoViolations(page, "run detail");
  await nav(page, "Gradebook").click();
  await expect(page.getByRole("table", { name: "Graded runs" })).toBeVisible();
  await expectNoViolations(page, "student gradebook");
  await signOut(page);
});

test("faculty pages have no automated WCAG violations", async ({ page }) => {
  await signIn(page, "faculty", "Faculty123!");
  await expectNoViolations(page, "faculty dashboard");
  await nav(page, "QC lots").click();
  await expect(page.getByRole("table", { name: "QC lots" })).toBeVisible();
  await expectNoViolations(page, "lots");
  await page.getByRole("link", { name: "New QC lot" }).first().click();
  await expect(page.getByRole("heading", { name: /New QC lot/ })).toBeVisible();
  await expectNoViolations(page, "lot editor");
  await nav(page, "Review queue").click();
  await expect(page.getByRole("table")).toBeVisible();
  await expectNoViolations(page, "review queue");
  await page.getByRole("table").getByRole("link").first().click();
  await expect(page.getByRole("heading", { name: "Faculty review" })).toBeVisible();
  await expectNoViolations(page, "review");
  await nav(page, "Gradebook").click();
  await expect(page.getByRole("table", { name: "Student averages" })).toBeVisible();
  await expectNoViolations(page, "faculty gradebook");
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "Add a faculty member" })).toBeVisible();
  await expectNoViolations(page, "account");
});

test("keyboard only: sign in, skip to content, and reach the main navigation", async ({ page }) => {
  await page.goto("/login");
  // The username field is focused on load; fill both fields and submit with Enter, no mouse.
  await expect(page.getByLabel("Username or email")).toBeFocused();
  await page.keyboard.type("student");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Password")).toBeFocused();
  await page.keyboard.type("Student123!");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: /Welcome/ })).toBeVisible();

  // First Tab lands on the skip link, which becomes visible and moves focus to <main>.
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page.locator("main#main")).toBeFocused();

  // Tabbing from the top reaches the sidebar links in order.
  await page.goto("/");
  const labels: string[] = [];
  for (let i = 0; i < 8 && labels.length < 4; i++) {
    await page.keyboard.press("Tab");
    const name = await page.evaluate(() => (document.activeElement?.closest("nav[aria-label=Main]") ? document.activeElement.textContent?.trim() : null));
    if (name) labels.push(name);
  }
  expect(labels).toEqual(["Dashboard", "Order QC", "My QC runs", "Gradebook"]);
});
