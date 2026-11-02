/** Plan 02 browser paths cover the prototype device list and custom validation. */
import { expect, test } from "@playwright/test";
import path from "node:path";

const TILE_PATTERN = "**/ArcGIS/rest/services/World_Imagery/MapServer/tile/**";
const TILE_PATH = path.resolve("tests/fixtures/satellite-tile.png");

// The prototype's 2208 px capture corresponds to a roughly 1280 CSS-pixel browser.
test.use({ viewport: { width: 1280, height: 740 }, deviceScaleFactor: 1 });

test.beforeEach(async ({ page }) => {
  await page.route(TILE_PATTERN, (route) => route.fulfill({ path: TILE_PATH, contentType: "image/png" }));
  await page.goto("/");
  await expect(page.getByRole("main", { name: "Satellite map for Nuke Simulator" }))
    .toHaveAttribute("data-map-state", "ready");
});

test("the complete grouped catalog selects a device and survives map interaction", async ({ page }) => {
  const panel = page.getByRole("complementary", { name: "Device controls" });
  const selector = page.getByRole("combobox", { name: "Weapon or delivery system" });
  await expect(panel.getByRole("heading", { name: "Nuke Simulator" })).toBeVisible();
  await expect(panel.getByRole("heading", { name: "DEVICE" })).toBeVisible();
  await expect(selector).toHaveValue("fat-man");
  await expect(panel.getByRole("status")).toContainText("Fat Man · 21 kt");
  await expect(selector.locator("optgroup")).toHaveCount(4);
  await expect(selector.locator("option")).toHaveCount(48);
  expect(await selector.locator("optgroup").evaluateAll((groups) => groups.map((group) => (group as HTMLOptGroupElement).label))).toEqual([
    "Conventional weapons", "Nuclear devices", "MIRV delivery systems", "Hypothetical scale studies",
  ]);
  await expect(page).toHaveScreenshot("plan-02-device-panel-reference.png", { maxDiffPixelRatio: 0.01 });

  await selector.selectOption("rs-24-yars");
  await expect(panel.getByRole("status")).toContainText("RS-24 Yars / SS-29 · 3 × 175 kt · modeled");
  await page.mouse.move(900, 450);
  await page.mouse.down();
  await page.mouse.move(1050, 450, { steps: 8 });
  await page.mouse.up();
  await expect(selector).toHaveValue("rs-24-yars");
});

test("custom megaton input reports invalid values and resolves a valid selection", async ({ page }) => {
  const panel = page.getByRole("complementary", { name: "Device controls" });
  const selector = page.getByRole("combobox", { name: "Weapon or delivery system" });
  await selector.selectOption("custom");
  const input = panel.getByRole("textbox", { name: "Custom yield in megatons" });
  await expect(input).toHaveValue("1");
  await input.fill("0");
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(panel.getByRole("alert")).toContainText("Enter a positive yield");
  await input.fill("1e-323");
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await input.fill("1,5");
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(panel.getByRole("alert")).toContainText("use a decimal point");
  await input.fill("1,000");
  await expect(panel.getByRole("status")).toContainText("Custom yield · 1,000 Mt");
  await input.fill("2.5");
  await expect(input).toHaveAttribute("aria-invalid", "false");
  await expect(panel.getByRole("status")).toContainText("Custom yield · 2.5 Mt");
  await selector.selectOption("moab");
  await expect(panel.getByRole("status")).toContainText("GBU-43/B MOAB · 11 t TNT");
  await selector.selectOption("custom");
  await expect(input).toHaveValue("2.5");
});
