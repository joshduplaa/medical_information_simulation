import { expect, test } from "@playwright/test";
import { nav, signIn, signOut } from "./helpers";

/** The public demo build: no API, synthetic data in localStorage. */
test("demo mode runs the review loop in the browser", async ({ page }) => {
  await signIn(page, "faculty", "Faculty123!");
  await expect(page.getByText(/Demo mode — runs entirely in your browser/)).toBeVisible();
  await nav(page, "Review queue").click();
  await page.getByRole("row", { name: /Jordan Lee/ }).getByRole("link").click();
  await expect(page.getByRole("heading", { name: "Levey-Jennings charts" })).toBeVisible();
  await page.getByLabel("Grade (0–100)").fill("90");
  await page.getByRole("button", { name: "Save grade" }).click();
  await expect(page.getByText("Grade: 90/100")).toBeVisible();
  await signOut(page);

  // Changes persist across reloads (localStorage) and are visible to the student.
  await page.reload();
  await signIn(page, "jlee", "Student123!");
  await nav(page, "Gradebook").click();
  await expect(page.getByRole("table", { name: "Graded runs" })).toBeVisible();
});
