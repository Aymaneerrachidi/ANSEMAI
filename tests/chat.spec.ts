import { test, expect } from "@playwright/test";

test("loads the assistant shell with the official-sources badge", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /ANSEM/i })).toBeVisible();
  await expect(page.getByText("Official sources only")).toBeVisible();
});

test("answers a starter question and shows cited sources", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "What is $ANSEM?" }).click();

  const assistantReply = page.locator("article").last();
  await expect(assistantReply.getByText("Sources")).toBeVisible({ timeout: 15_000 });
});

test("refuses out-of-scope questions", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder("Ask AnsemAI...").fill("Write me a Python quicksort function");
  await page.getByRole("button", { name: "Send message" }).click();

  const assistantReply = page.locator("article").last();
  await expect(assistantReply).toContainText("I can only answer questions about", { timeout: 15_000 });
});

test("flags a known impersonator domain as not official", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder("Ask AnsemAI...").fill("Is https://blackbullsol.club official?");
  await page.getByRole("button", { name: "Send message" }).click();

  const assistantReply = page.locator("article").last();
  await expect(assistantReply).toContainText(/impersonat|not official/i, { timeout: 15_000 });
});

test("signal rail shows live data or an explicit fetch-failure state, never a blank panel", async ({ page }) => {
  await page.goto("/");
  const rail = page.locator("aside");
  await expect(rail).toBeVisible();
  await expect(rail.getByText(/market cap|couldn't fetch/i).first()).toBeVisible({ timeout: 15_000 });
});
