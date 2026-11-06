import { expect, test } from "@playwright/test";
import { nav, signIn, signOut } from "./helpers";

/**
 * The core loop against the real API and database:
 * faculty create a lot → student orders QC and enters results → student submits →
 * faculty review and grade → the grade appears in the student's gradebook.
 */
test("core QC workflow end to end", async ({ page }) => {
  const lotNumber = `E2E-${Date.now()}`;

  // 1. Faculty create a QC lot with two analytes.
  await signIn(page, "faculty", "Faculty123!");
  await nav(page, "QC lots").click();
  await page.getByRole("link", { name: "New QC lot" }).first().click();
  await page.getByLabel("QC material name").fill("E2E Lipid Control");
  await page.getByLabel("Lot number").fill(lotNumber);
  await page.getByRole("textbox", { name: "Name for analyte 1" }).fill("Cholesterol");
  await page.getByRole("textbox", { name: "Acronym for Cholesterol" }).fill("CHOL");
  await page.getByRole("textbox", { name: "Unit for Cholesterol" }).fill("mg/dL");
  await page.getByRole("spinbutton", { name: "Mean for Cholesterol" }).fill("200");
  await page.getByRole("spinbutton", { name: "SD for Cholesterol" }).fill("10");
  await page.getByRole("button", { name: "Set min and max for Cholesterol to mean ± 2 SD" }).click();
  await expect(page.getByRole("spinbutton", { name: "Max for Cholesterol" })).toHaveValue("220");

  await page.getByRole("button", { name: "Add analyte" }).click();
  await page.getByRole("textbox", { name: "Name for analyte 2" }).fill("Triglycerides");
  await page.getByRole("textbox", { name: "Acronym for Triglycerides" }).fill("TRIG");
  await page.getByRole("textbox", { name: "Unit for Triglycerides" }).fill("mg/dL");
  await page.getByRole("spinbutton", { name: "Mean for Triglycerides" }).fill("150");
  await page.getByRole("spinbutton", { name: "SD for Triglycerides" }).fill("8");
  await page.getByRole("button", { name: "Set min and max for Triglycerides to mean ± 2 SD" }).click();
  await page.getByRole("button", { name: "Save lot" }).click();

  const lotRow = page.getByRole("row", { name: new RegExp(lotNumber) });
  await expect(lotRow).toBeVisible();
  await expect(lotRow).toContainText("Active");
  await signOut(page);

  // 2. Student orders the new lot and enters results.
  await signIn(page, "student", "Student123!");
  await nav(page, "Order QC").click();
  await page.getByRole("button", { name: `Order E2E Lipid Control lot ${lotNumber}` }).click();
  await expect(page.getByRole("heading", { name: "Enter results" })).toBeVisible();

  const submit = page.getByRole("button", { name: "Submit for review" });
  await expect(submit).toBeDisabled(); // nothing entered yet

  await page.getByRole("textbox", { name: "Cholesterol result (mg/dL)" }).fill("226");
  // Live z-score check: (226 − 200) / 10 = +2.6 SD → 1-2s warning
  await expect(page.getByRole("row", { name: /CHOL/ })).toContainText("+2.60 SD");
  await expect(page.getByRole("row", { name: /CHOL/ })).toContainText("Warning: 1-2s");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Draft saved.")).toBeVisible();

  await page.getByRole("textbox", { name: "Triglycerides result (mg/dL)" }).fill("149");
  await page.getByLabel("Comments for your instructor (optional)").fill("Cholesterol above 2 SD; reran after recalibration.");
  await submit.click();
  await expect(page.getByText(/Your instructor has not reviewed it yet/)).toBeVisible();
  await expect(page.getByRole("region", { name: "Cholesterol (CHOL)" })).toBeVisible();
  await signOut(page);

  // 3. Faculty review and grade it.
  await signIn(page, "faculty", "Faculty123!");
  await nav(page, "Review queue").click();
  await page.getByRole("row", { name: /E2E Lipid Control/ }).getByRole("link").click();
  await expect(page.getByRole("heading", { name: "Faculty review" })).toBeVisible();
  await expect(page.getByText("Cholesterol above 2 SD; reran after recalibration.")).toBeVisible();
  await page.getByLabel("Grade (0–100)").fill("94");
  await page.getByLabel("Feedback to the student").fill("Good documentation of the 1-2s warning.");
  await page.getByRole("button", { name: "Save grade" }).click();
  await expect(page.getByText("Grade: 94/100")).toBeVisible();
  await signOut(page);

  // 4. The student sees the grade in the gradebook.
  await signIn(page, "student", "Student123!");
  await nav(page, "Gradebook").click();
  const gradedRow = page.getByRole("table", { name: "Graded runs" }).getByRole("row", { name: /E2E Lipid Control/ });
  await expect(gradedRow).toContainText("94");
  await expect(gradedRow).toContainText("Good documentation of the 1-2s warning.");
});

test("wrong password shows an error and students cannot open faculty pages", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Username or email").fill("student");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toHaveText("Invalid username or password.");

  await signIn(page, "student", "Student123!");
  await expect(nav(page, "QC lots")).toHaveCount(0);
  await page.goto("/lots");
  await expect(page.getByText("Not available for your role")).toBeVisible();
});

test("faculty can create another faculty account, which can then manage lots", async ({ page }) => {
  const username = `fac${Date.now()}`;
  await signIn(page, "faculty", "Faculty123!");
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Account" }).click();

  const panel = page.getByRole("region", { name: "Add a faculty member" });
  await panel.getByLabel("First name").fill("Casey");
  await panel.getByLabel("Last name").fill("Nguyen");
  await panel.getByLabel("Username").fill(username);
  await panel.getByLabel("Email").fill(`${username}@mis.example.edu`);
  await panel.getByLabel(/^Password/).fill("Faculty456!");
  await panel.getByLabel("Confirm password").fill("Faculty456!");
  await panel.getByRole("button", { name: "Create faculty account" }).click();
  await expect(panel.getByText(`Faculty account “${username}” created`)).toBeVisible();
  await expect(panel.getByLabel("Username")).toHaveValue("");

  await signOut(page);
  await signIn(page, username, "Faculty456!");
  await expect(nav(page, "QC lots")).toBeVisible();
  await expect(nav(page, "Review queue")).toBeVisible();
});
