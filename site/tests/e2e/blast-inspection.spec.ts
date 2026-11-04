/** Fixed-tile browser paths exercise settled marker placement, keyboard inspection, and tooltip bounds. */
import { expect, test } from "@playwright/test";
import path from "node:path";

const TILE_PATTERN = "**/ArcGIS/rest/services/World_Imagery/MapServer/tile/**";
const TILE_PATH = path.resolve("tests/fixtures/satellite-tile.png");

test.use({ viewport: { width: 1508, height: 1080 }, deviceScaleFactor: 1 });

test.beforeEach(async ({ page }) => {
  await page.route(TILE_PATTERN, (route) => route.fulfill({ path: TILE_PATH, contentType: "image/png" }));
  await page.goto("/");
  await expect(page.locator("main.simulator")).toHaveAttribute("data-map-state", "ready");
  await page.clock.install();
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.clock.runFor(500);
  await expect(page.locator("main.simulator")).toHaveAttribute("data-zoom", "11.600");
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10_000);
  await page.mouse.click(1000, 580);
  await page.clock.runFor(11200);
  await expect(page.locator("main.simulator")).toHaveAttribute("data-launch-phase", "complete");
});

test("settled blast shows four geographic inspection markers and a bounded tooltip", async ({ page }, testInfo) => {
  const markers = page.locator(".blast-zone-marker");
  await expect(markers).toHaveCount(4);
  const light = page.getByRole("button", { name: /^LIGHT destruction/ });
  await light.hover();
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toContainText("LIGHT DESTRUCTION");
  await expect(tooltip).toContainText("ZONE SPAN");
  await expect(tooltip).toContainText("DAMAGE AREA");
  const bounds = await tooltip.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(1508);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(1080);
  await page.screenshot({ path: testInfo.outputPath("plan-06-light-tooltip.png") });
  await expect(page).toHaveScreenshot("plan-06-light-tooltip.png", { maxDiffPixelRatio: 0.01 });
  await page.mouse.move(1450, 900);
  await expect(tooltip).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("plan-06-settled.png") });
  await expect(page).toHaveScreenshot("plan-06-settled.png", { maxDiffPixelRatio: 0.01 });
});

test("keyboard focus and pinning inspect a zone without launching another strike", async ({ page }) => {
  const simulator = page.locator("main.simulator");
  const target = await simulator.getAttribute("data-target-longitude");
  const moderate = page.getByRole("button", { name: /^MODERATE destruction/ });
  await page.mouse.move(1450, 900);
  await moderate.focus();
  await expect(page.getByRole("tooltip")).toContainText("MODERATE DESTRUCTION");
  await expect(moderate).toHaveAttribute("aria-expanded", "true");
  const light = page.getByRole("button", { name: /^LIGHT destruction/ });
  await light.hover();
  await expect(moderate).toBeFocused();
  await expect(page.getByRole("tooltip")).toContainText("LIGHT DESTRUCTION");
  await page.mouse.move(1450, 900);
  await expect(page.getByRole("tooltip")).toContainText("MODERATE DESTRUCTION");
  await moderate.click();
  await page.mouse.move(1450, 900);
  await expect(page.getByRole("tooltip")).toContainText("MODERATE DESTRUCTION");
  await moderate.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await expect(simulator).toHaveAttribute("data-target-longitude", target!);
  await expect(simulator).toHaveAttribute("data-launch-phase", "complete");
  await page.getByRole("button", { name: "Reset map" }).click();
  await expect(page.locator(".blast-zone-marker")).toHaveCount(0);
});

test("measure keeps its bearing and visible markers use the same canvas as the ruler through zoom", async ({ page }) => {
  const fireball = page.getByRole("button", { name: /^FIREBALL destruction/ });
  const moderate = page.getByRole("button", { name: /^MODERATE destruction/ });
  const direction = async () => {
    const center = await fireball.boundingBox();
    const marker = await moderate.boundingBox();
    expect(center).not.toBeNull();
    expect(marker).not.toBeNull();
    return Math.sign(marker!.x - center!.x);
  };
  const originalDirection = await direction();
  expect(originalDirection).not.toBe(0);
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.clock.runFor(250);
  expect(await direction()).toBe(originalDirection);
  await page.clock.runFor(300);
  expect(await direction()).toBe(originalDirection);
  await page.getByRole("button", { name: "Zoom out" }).click();
  await page.clock.runFor(500);
  expect(await direction()).toBe(originalDirection);
  await expect(moderate.locator("*" )).toHaveCount(0);
  await expect(moderate).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
});

test("panning moves a marker with the map and keeps the strike target", async ({ page }) => {
  const simulator = page.locator("main.simulator");
  const target = await simulator.getAttribute("data-target-longitude");
  const light = page.getByRole("button", { name: /^LIGHT destruction/ });
  const before = await light.boundingBox();
  await page.mouse.move(800, 850);
  await page.mouse.down();
  await page.mouse.move(900, 850, { steps: 8 });
  await page.mouse.up();
  await page.clock.runFor(50);
  const after = await light.boundingBox();
  expect(before).not.toBeNull();
  expect(after).not.toBeNull();
  expect(after!.x - before!.x).toBeGreaterThan(75);
  expect(after!.x - before!.x).toBeLessThan(125);
  await expect(simulator).toHaveAttribute("data-target-longitude", target!);
});

test("tooltip flips above a marker near the bottom edge", async ({ page }) => {
  await page.mouse.move(550, 500);
  await page.mouse.down();
  await page.mouse.move(550, 1030, { steps: 8 });
  await page.mouse.up();
  await page.clock.runFor(50);
  const light = page.getByRole("button", { name: /^LIGHT destruction/ });
  await light.hover();
  const markerBounds = await light.boundingBox();
  const tooltipBounds = await page.getByRole("tooltip").boundingBox();
  expect(markerBounds).not.toBeNull();
  expect(tooltipBounds).not.toBeNull();
  expect(tooltipBounds!.y + tooltipBounds!.height).toBeLessThan(markerBounds!.y);
  expect(tooltipBounds!.y).toBeGreaterThanOrEqual(0);
  expect(tooltipBounds!.x + tooltipBounds!.width).toBeLessThanOrEqual(1508);
});

test("each pitched marker can be hovered at its visible center when projected marks converge", async ({ page }) => {
  await page.getByRole("button", { name: "Zoom out" }).click();
  await page.clock.runFor(500);
  await page.mouse.move(1400, 780);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(1400, 350, { steps: 10 });
  await page.mouse.up({ button: "right" });
  await page.clock.runFor(500);
  await expect.poll(async () => Number(await page.locator("main.simulator").getAttribute("data-pitch"))).toBeGreaterThan(50);
  for (const zone of ["FIREBALL", "SEVERE", "MODERATE", "LIGHT"]) {
    await page.getByRole("button", { name: new RegExp(`^${zone} destruction`) }).hover({ timeout: 3000 });
    await expect(page.getByRole("tooltip")).toContainText(`${zone} DESTRUCTION`);
  }
});
