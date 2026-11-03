/** Fixed-tile, fake-clock browser paths inspect the same settled strike from overhead and pitched cameras. */
import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

const TILE_PATTERN = "**/ArcGIS/rest/services/World_Imagery/MapServer/tile/**";
const TILE_PATH = path.resolve("tests/fixtures/satellite-tile.png");

test.use({ viewport: { width: 1508, height: 1080 }, deviceScaleFactor: 1 });

/** Measure the white-gold ground-light footprint near ground zero in Canvas pixels. */
async function brightFootprint(page: Page): Promise<{ width: number; height: number }> {
  const marker = await page.getByRole("button", { name: /^FIREBALL destruction/ }).boundingBox();
  if (!marker) throw new Error("Fireball marker is not visible.");
  return page.locator(".blast-canvas").evaluate((element, center) => {
    const context = (element as HTMLCanvasElement).getContext("2d")!;
    const left = Math.round(center.x - 100);
    const top = Math.round(center.y - 100);
    const pixels = context.getImageData(left, top, 200, 200).data;
    let minX = 200; let minY = 200; let maxX = -1; let maxY = -1;
    for (let y = 0; y < 200; y++) for (let x = 0; x < 200; x++) {
      const offset = (y * 200 + x) * 4;
      if (pixels[offset]! < 245 || pixels[offset + 1]! < 225 || pixels[offset + 2]! < 165 || pixels[offset + 3]! < 220) continue;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    return { width: maxX - minX + 1, height: maxY - minY + 1 };
  }, { x: marker.x + marker.width / 2, y: marker.y + marker.height / 2 });
}

test.beforeEach(async ({ page }) => {
  await page.route(TILE_PATTERN, (route) => route.fulfill({ path: TILE_PATH, contentType: "image/png" }));
  await page.goto("/");
  const simulator = page.locator("main.simulator");
  await expect(simulator).toHaveAttribute("data-map-state", "ready");
  await page.clock.install();
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.clock.runFor(500);
  await expect(simulator).toHaveAttribute("data-zoom", "11.600");
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10_000);
  await page.mouse.click(1000, 580);
  await page.clock.runFor(11200);
  await expect(simulator).toHaveAttribute("data-launch-phase", "complete");
});

test("settled overhead field retains the Plan 06 geographic circles", async ({ page }, testInfo) => {
  await expect(page.locator("main.simulator")).toHaveAttribute("data-pitch", "0.000");
  const footprint = await brightFootprint(page);
  expect(footprint.width).toBeGreaterThan(20);
  expect(footprint.width / footprint.height).toBeLessThan(1.3);
  await page.mouse.move(1450, 900);
  await page.screenshot({ path: testInfo.outputPath("plan-07-top-down.png") });
  await expect(page).toHaveScreenshot("plan-07-top-down.png", { maxDiffPixelRatio: 0.01 });
});

test("tilting the map projects the field, ruler, and markers onto the same ground", async ({ page }, testInfo) => {
  const simulator = page.locator("main.simulator");
  const target = await simulator.getAttribute("data-target-longitude");
  const light = page.getByRole("button", { name: /^LIGHT destruction/ });
  const before = await light.boundingBox();
  await page.mouse.move(1400, 780);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(1400, 350, { steps: 10 });
  await page.mouse.up({ button: "right" });
  await page.clock.runFor(100);
  await expect.poll(async () => Number(await simulator.getAttribute("data-pitch"))).toBeGreaterThan(20);
  await expect(simulator).toHaveAttribute("data-target-longitude", target!);
  await expect(light).toBeVisible();
  const after = await light.boundingBox();
  expect(before).not.toBeNull();
  expect(after).not.toBeNull();
  expect(Math.abs(after!.y - before!.y)).toBeGreaterThan(20);
  const footprint = await brightFootprint(page);
  expect(footprint.width).toBeGreaterThan(20);
  expect(footprint.width / footprint.height).toBeGreaterThan(1.3);
  await page.mouse.move(1450, 900);
  await page.screenshot({ path: testInfo.outputPath("plan-07-pitched.png") });
  await expect(page).toHaveScreenshot("plan-07-pitched.png", { maxDiffPixelRatio: 0.01 });

  await page.mouse.move(1380, 780);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(1160, 780, { steps: 8 });
  await page.mouse.up({ button: "right" });
  await page.clock.runFor(50);
  await expect.poll(async () => Math.abs(Number(await simulator.getAttribute("data-bearing")))).toBeGreaterThan(5);

  const markerBeforePan = await light.boundingBox();
  await page.mouse.move(580, 850);
  await page.mouse.down();
  await page.mouse.move(660, 850, { steps: 8 });
  await page.mouse.up();
  await page.clock.runFor(50);
  const markerAfterPan = await light.boundingBox();
  expect(markerBeforePan).not.toBeNull();
  expect(markerAfterPan).not.toBeNull();
  expect(markerAfterPan!.x - markerBeforePan!.x).toBeGreaterThan(50);
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.clock.runFor(500);
  await page.setViewportSize({ width: 1700, height: 950 });
  await page.clock.runFor(50);
  await expect(simulator).toHaveAttribute("data-target-longitude", target!);
  await expect(light).toBeVisible();
  await light.hover();
  await expect(page.getByRole("tooltip")).toContainText("LIGHT DESTRUCTION");
});

test("a pitched launch keeps its carrier, flash, growing field, and settled measure on the ground", async ({ page }, testInfo) => {
  const simulator = page.locator("main.simulator");
  await page.mouse.move(1400, 780);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(1400, 350, { steps: 10 });
  await page.mouse.up({ button: "right" });
  await page.clock.runFor(100);
  await expect.poll(async () => Number(await simulator.getAttribute("data-pitch"))).toBeGreaterThan(20);

  await page.mouse.click(1000, 580);
  await page.clock.runFor(3200);
  await expect(simulator).toHaveAttribute("data-launch-phase", "inbound");
  await page.screenshot({ path: testInfo.outputPath("plan-07-pitched-launch.png") });
  await page.clock.runFor(3350);
  await expect(simulator).toHaveAttribute("data-launch-phase", "detonating");
  await page.screenshot({ path: testInfo.outputPath("plan-07-pitched-impact.png") });
  await page.clock.runFor(2250);
  await page.screenshot({ path: testInfo.outputPath("plan-07-pitched-expansion.png") });
  await expect(page).toHaveScreenshot("plan-07-pitched-expansion.png", { maxDiffPixelRatio: 0.01 });
  await page.clock.runFor(2350);
  await expect(simulator).toHaveAttribute("data-launch-phase", "complete");
  await expect(page.locator(".blast-zone-marker")).toHaveCount(4);
  await page.mouse.move(1450, 900);
  await page.screenshot({ path: testInfo.outputPath("plan-07-pitched-settled.png") });
});
