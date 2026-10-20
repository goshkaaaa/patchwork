import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("sample compares in the worker and filters field changes", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".change-count")).toHaveText("6 changes");
  await page.getByRole("button", { name: "Added", exact: false }).click();
  await expect(page.locator(".change-row")).toHaveCount(2);
  await page.getByRole("button", { name: "All changes" }).click();
  await page
    .getByRole("textbox", { name: "Search JSON paths" })
    .fill("retries");
  await expect(page.locator(".change-row")).toHaveCount(1);
  await expect(page.locator(".old-value code")).toHaveText("3");
  await expect(page.locator(".new-value code")).toHaveText("5");
});

test("invalid input blocks patch export and corrected input compares", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Before JSON", exact: true })
    .fill("{broken");
  await expect(
    page.getByRole("button", { name: "Export .json" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Compare JSON" }).click();
  await expect(
    page.getByRole("alert", { name: "Comparison error" }),
  ).toContainText("Before:");
  await page
    .getByRole("textbox", { name: "Before JSON", exact: true })
    .fill('{"x":1}');
  await page
    .getByRole("textbox", { name: "After JSON", exact: true })
    .fill('{"x":2}');
  await page.getByRole("button", { name: "Compare JSON" }).click();
  await expect(page.locator(".change-count")).toHaveText("1 change");
  await page.getByRole("button", { name: "Patch", exact: true }).click();
  await expect(page.getByLabel("JSON Patch output")).toContainText(
    '"path": "/x"',
  );
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export .json" }).click();
  expect((await download).suggestedFilename()).toBe("patchwork.patch.json");
});

test("import, swap, and semantic equality work", async ({ page }) => {
  await page.goto("/");
  await page
    .getByLabel("Before JSON file")
    .setInputFiles({
      name: "a.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"a":1,"b":2}'),
    });
  await page
    .getByRole("textbox", { name: "After JSON", exact: true })
    .fill('{"b":2,"a":1}');
  await page.getByRole("button", { name: "Compare JSON" }).click();
  await expect(page.getByRole("heading", { name: /Same data/ })).toBeVisible();
  await page.getByRole("button", { name: "Swap sides" }).click();
  await expect(
    page.getByRole("textbox", { name: "Before JSON", exact: true }),
  ).toHaveValue('{"b":2,"a":1}');
});

test("mobile layout fits and initial controls pass accessibility checks", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".change-count")).toHaveText("6 changes");
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      document.getAnimations().map((animation) => animation.finished),
    );
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    result.violations.map((item) => ({
      id: item.id,
      targets: item.nodes.map((node) => node.target),
    })),
  ).toEqual([]);
});
