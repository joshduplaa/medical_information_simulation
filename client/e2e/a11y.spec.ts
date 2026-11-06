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
