/** Panel browser paths cover device/scenario selection, custom validation, and the current compact controls. */
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
  await expect(panel.getByRole("tab", { name: "DEVICE" })).toHaveAttribute("aria-selected", "true");
  await expect(selector).toHaveValue("fat-man");
  await expect(panel.getByRole("status")).toContainText("Fat Man · 21 kt");
  await expect(selector.locator("optgroup")).toHaveCount(4);
  await expect(selector.locator("option")).toHaveCount(48);
  expect(await selector.locator("optgroup").evaluateAll((groups) => groups.map((group) => (group as HTMLOptGroupElement).label))).toEqual([
    "Conventional weapons", "Nuclear devices", "MIRV delivery systems", "Hypothetical scale studies",
  ]);
  await expect(page).toHaveScreenshot("plan-05-device-panel.png", { maxDiffPixelRatio: 0.01 });

  await selector.selectOption("rs-24-yars");
  await expect(panel.getByRole("status")).toContainText("RS-24 Yars / SS-29 · 3 × 175 kt · modeled");
  await page.mouse.move(900, 450);
  await page.mouse.down();
  await page.mouse.move(1050, 450, { steps: 8 });
  await page.mouse.up();
  await expect(selector).toHaveValue("rs-24-yars");
});

test("scenario selection moves the map, prepares its device, and supports keyboard tabs", async ({ page }, testInfo) => {
  const panel = page.getByRole("complementary", { name: "Device controls" });
  const map = page.getByRole("main", { name: "Satellite map for Nuke Simulator" });
  const deviceTab = panel.getByRole("tab", { name: "DEVICE" });
  const scenarioTab = panel.getByRole("tab", { name: "SCENARIO" });
  await deviceTab.focus();
  await deviceTab.press("ArrowLeft");
  await expect(scenarioTab).toBeFocused();
  await expect(scenarioTab).toHaveAttribute("aria-selected", "true");
  const selector = panel.getByRole("combobox", { name: "Scenario" });
  await expect(selector.locator("option")).toHaveCount(21);
  await expect(selector.locator("optgroup")).toHaveCount(2);
  expect(await selector.locator("optgroup").evaluateAll((groups) => groups.map((group) => (group as HTMLOptGroupElement).label))).toEqual([
    "Historical locations + real devices", "Hypothetical scale studies",
  ]);
  await page.screenshot({ path: testInfo.outputPath("scenario-panel-review.png") });
  await expect(page).toHaveScreenshot("plan-05-scenario-panel.png", { maxDiffPixelRatio: 0.01 });
  await selector.selectOption("hiroshima");
  await expect.poll(async () => Number(await map.getAttribute("data-center-longitude"))).toBeCloseTo(132.4547, 3);
  await expect.poll(async () => Number(await map.getAttribute("data-center-latitude"))).toBeCloseTo(34.3947, 3);
  await expect.poll(async () => Number(await map.getAttribute("data-zoom"))).toBeGreaterThan(11);
  await expect(panel.getByRole("status")).toContainText("Little Boy · 15 kt");
  await expect(page.locator(".maplibregl-canvas")).toHaveCount(1);
  await expect(page.locator(".blast-canvas, .fireball-canvas, .missile-canvas, .inspection-canvas")).toHaveCount(4);
  await expect(map).toHaveAttribute("data-launch-phase", "armed");
  await deviceTab.click();
  await expect(panel.getByRole("combobox", { name: "Weapon or delivery system" })).toHaveValue("little-boy");
  await scenarioTab.click();
  await expect(selector).toHaveValue("hiroshima");
  await deviceTab.click();
  await panel.getByRole("combobox", { name: "Weapon or delivery system" }).selectOption("moab");
  await scenarioTab.click();
  await expect(selector).toHaveValue("");
  await selector.selectOption("trinity");
  await expect.poll(async () => Number(await map.getAttribute("data-center-longitude"))).toBeCloseTo(-106.4754, 3);
  await expect.poll(async () => Number(await map.getAttribute("data-center-latitude"))).toBeCloseTo(33.6773, 3);
  await expect(panel.getByRole("status")).toContainText("Trinity Gadget · 18.6 kt");
  await expect(page.locator(".maplibregl-canvas")).toHaveCount(1);
  await expect(page.locator(".blast-canvas, .fireball-canvas, .missile-canvas, .inspection-canvas")).toHaveCount(4);
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

test("an invalid custom draft is shown only on the Device tab and remains editable", async ({ page }) => {
  const panel = page.getByRole("complementary", { name: "Device controls" });
  await panel.getByRole("combobox", { name: "Weapon or delivery system" }).selectOption("custom");
  const input = panel.getByRole("textbox", { name: "Custom yield in megatons" });
  await input.fill("0");
  await expect(panel.getByRole("alert")).toContainText("Enter a positive yield");
  await panel.getByRole("tab", { name: "SCENARIO" }).click();
  await expect(panel.getByRole("alert")).toHaveCount(0);
  await expect(panel.getByRole("status")).toContainText("Choose a scenario");
  await expect(panel.getByRole("combobox", { name: "Scenario" })).toBeVisible();
  await panel.getByRole("tab", { name: "DEVICE" }).click();
  await expect(input).toHaveValue("0");
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(panel.getByRole("alert")).toContainText("Enter a positive yield");
  await input.fill("2");
  await expect(panel.getByRole("status")).toContainText("Custom yield · 2 Mt");
});

test("scenario navigation reports loading while destination tiles are delayed", async ({ page }) => {
  const map = page.getByRole("main", { name: "Satellite map for Nuke Simulator" });
  await page.unroute(TILE_PATTERN);
  let releaseTiles!: () => void;
  const tileGate = new Promise<void>((resolve) => { releaseTiles = resolve; });
  let requests = 0;
  await page.route(TILE_PATTERN, async (route) => {
    requests += 1;
    await tileGate;
    // Rapid camera movement may cancel intermediate tile requests.
    await route.fulfill({ path: TILE_PATH, contentType: "image/png" }).catch(() => {});
  });
  try {
    await page.getByRole("tab", { name: "SCENARIO" }).click();
    await page.getByRole("combobox", { name: "Scenario" }).selectOption("hiroshima");
    await expect(map).toHaveAttribute("data-map-state", "loading");
    await expect(page.getByRole("status").filter({ hasText: "Loading satellite map" })).toBeVisible();
    await expect.poll(() => requests).toBeGreaterThan(0);
    await expect.poll(async () => Number(await map.getAttribute("data-center-longitude"))).toBeCloseTo(132.4547, 3);
    await expect(map).toHaveAttribute("data-map-state", "loading");
  } finally {
    releaseTiles();
  }
  await expect(map).toHaveAttribute("data-map-state", "ready");
  await expect(page.getByRole("status").filter({ hasText: "Loading satellite map" })).toHaveCount(0);
});
