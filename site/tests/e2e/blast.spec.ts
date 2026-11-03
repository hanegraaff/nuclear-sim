/** Fixed-tile and fake-clock browser paths verify the single blast, replacement, Reset, and camera anchoring. */
import { expect, test } from "@playwright/test";
import path from "node:path";

const TILE_PATTERN = "**/ArcGIS/rest/services/World_Imagery/MapServer/tile/**";
const TILE_PATH = path.resolve("tests/fixtures/satellite-tile.png");

test.use({ viewport: { width: 1508, height: 1080 }, deviceScaleFactor: 1 });

test.beforeEach(async ({ page }) => {
  await page.route(TILE_PATTERN, (route) => route.fulfill({ path: TILE_PATH, contentType: "image/png" }));
  await page.goto("/");
  await expect(page.locator("main.simulator")).toHaveAttribute("data-map-state", "ready");
});

test("impact blooms, field expands, and one settled blast remains", async ({ page }, testInfo) => {
  const simulator = page.locator("main.simulator");
  const canvas = page.locator(".blast-canvas");
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.clock.install();
  await page.mouse.click(1000, 580);
  await page.clock.runFor(6550);
  await expect(simulator).toHaveAttribute("data-launch-phase", "detonating");
  await expect.poll(() => canvas.evaluate((element) => (element as HTMLCanvasElement).getContext("2d")!.getImageData(1000, 580, 1, 1).data[3])).toBeGreaterThan(150);
  await page.screenshot({ path: testInfo.outputPath("plan-05-impact-50ms.png") });
  await expect(page).toHaveScreenshot("plan-05-impact-50ms.png", { maxDiffPixelRatio: 0.01 });
  await page.clock.runFor(2250);
  await expect(simulator).toHaveAttribute("data-launch-phase", "detonating");
  await page.screenshot({ path: testInfo.outputPath("plan-05-expansion-2300ms.png") });
  await expect(page).toHaveScreenshot("plan-05-expansion-2300ms.png", { maxDiffPixelRatio: 0.01 });
  await page.clock.runFor(2350);
  await expect(simulator).toHaveAttribute("data-launch-phase", "complete");
  await expect(page.locator(".launch-status")).toHaveText("BLAST COMPLETE");
  await page.screenshot({ path: testInfo.outputPath("plan-05-settled.png") });
  await expect(page).toHaveScreenshot("plan-05-settled.png", { maxDiffPixelRatio: 0.01 });
});

test("a new click replaces an expanding blast and Reset clears it without changing camera or device", async ({ page }) => {
  const simulator = page.locator("main.simulator");
  const canvas = page.locator(".blast-canvas");
  await page.getByRole("combobox", { name: "Weapon or delivery system" }).selectOption("little-boy");
  await page.clock.install();
  await page.mouse.click(1000, 580);
  await page.clock.runFor(7200);
  await expect(simulator).toHaveAttribute("data-launch-phase", "detonating");
  const oldLongitude = await simulator.getAttribute("data-target-longitude");
  await page.mouse.click(1200, 650);
  await expect(simulator).toHaveAttribute("data-launch-phase", "inbound");
  await expect.poll(() => simulator.getAttribute("data-target-longitude")).not.toBe(oldLongitude);
  await expect.poll(() => canvas.evaluate((element) => (element as HTMLCanvasElement).getContext("2d")!.getImageData(1000, 580, 1, 1).data[3])).toBe(0);
  const zoom = await simulator.getAttribute("data-zoom");
  const center = await simulator.getAttribute("data-center-longitude");
  await page.getByRole("button", { name: "Reset map" }).click();
  await expect(simulator).toHaveAttribute("data-launch-phase", "armed");
  await expect(simulator).toHaveAttribute("data-target-longitude", "");
  await expect(simulator).toHaveAttribute("data-zoom", zoom!);
  await expect(simulator).toHaveAttribute("data-center-longitude", center!);
  expect(await canvas.evaluate((element) => (element as HTMLCanvasElement).getContext("2d")!.getImageData(1200, 650, 1, 1).data[3])).toBe(0);
  await expect(page.getByRole("combobox", { name: "Weapon or delivery system" })).toHaveValue("little-boy");
  await expect(page.getByRole("button", { name: "Reset map" })).toBeDisabled();
});

test("panning reprojects the settled field while retaining its geographic target", async ({ page }) => {
  const simulator = page.locator("main.simulator");
  const canvas = page.locator(".blast-canvas");
  await page.clock.install();
  await page.mouse.click(1000, 580);
  await page.clock.runFor(11200);
  await expect(simulator).toHaveAttribute("data-launch-phase", "complete");
  const target = await simulator.getAttribute("data-target-longitude");
  const alphaAt = (x: number, y: number) => canvas.evaluate((element, point) => (element as HTMLCanvasElement).getContext("2d")!.getImageData(point.x, point.y, 1, 1).data[3], { x, y });
  expect(await alphaAt(1000, 580)).toBeGreaterThan(150);
  await page.mouse.move(800, 850);
  await page.mouse.down();
  await page.mouse.move(970, 850, { steps: 8 });
  await page.mouse.up();
  await page.clock.runFor(50);
  await expect(simulator).toHaveAttribute("data-target-longitude", target!);
  expect(await alphaAt(1170, 580)).toBeGreaterThan(100);
});
