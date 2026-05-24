import { test, expect } from "@playwright/test";

test("first series creation flow", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Create your first series" }).click();
  await expect(page.getByText("Timepoint Editor")).toBeVisible();
});
