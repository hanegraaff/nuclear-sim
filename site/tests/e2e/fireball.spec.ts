/** Fixed-tile, fake-time browser paths inspect the WebGL dome at impact, expansion, and settlement. */
import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

const TILE_PATTERN = "**/ArcGIS/rest/services/World_Imagery/MapServer/tile/**";
const TILE_PATH = path.resolve("tests/fixtures/satellite-tile.png");

test.use({ viewport: { width: 1508, height: 1080 }, deviceScaleFactor: 1 });

/** Count painted WebGL pixels and locate their viewport bounding box in CSS pixels. */
async function fireballFootprint(page: Page): Promise<{ count: number; centerX: number; centerY: number; width: number }> {
  return page.locator(".fireball-canvas").evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const gl = canvas.getContext("webgl2")!;
    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let count = 0; let minX = canvas.width; let maxX = -1; let minY = canvas.height; let maxY = -1;
    for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
      if (pixels[(y * canvas.width + x) * 4 + 3]! < 100) continue;
      count++;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    return { count, centerX: (minX + maxX) / 2, centerY: canvas.height - (minY + maxY) / 2, width: maxX - minX + 1 };
  });
}

/** Tilt with MapLibre's real interaction so the camera matrix includes perspective. */
async function pitchMap(page: Page): Promise<void> {
  await page.mouse.move(1400, 780);
  await page.mouse.down({ button: "right" });
  // MapLibre consumes drag deltas in animation frames. Advance the fake clock
  // while the button is held so a loaded worker cannot coalesce every move
  // with mouseup before the camera receives the gesture.
  for (let step = 1; step <= 10; step += 1) {
    await page.mouse.move(1400, 780 - 43 * step);
    await page.clock.runFor(20);
  }
  await page.mouse.up({ button: "right" });
  await page.clock.runFor(100);
  await expect.poll(async () => Number(await page.locator("main.simulator").getAttribute("data-pitch"))).toBeGreaterThan(20);
}

test.beforeEach(async ({ page }) => {
  await page.route(TILE_PATTERN, (route) => route.fulfill({ path: TILE_PATH, contentType: "image/png" }));
  await page.goto("/");
  await expect(page.locator("main.simulator")).toHaveAttribute("data-map-state", "ready");
});

test("pitched fireball rises, stays anchored through camera changes, and clears on Reset", async ({ page }, testInfo) => {
  const simulator = page.locator("main.simulator");
  await page.clock.install();
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.clock.runFor(500);
  await expect(simulator).toHaveAttribute("data-zoom", "11.600");
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.clock.runFor(500);
  await expect(simulator).toHaveAttribute("data-zoom", "12.600");
  await pitchMap(page);
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10_000);
  await page.mouse.click(1000, 580);
  await page.clock.runFor(3200);
  await expect(simulator).toHaveAttribute("data-launch-phase", "inbound");
  expect((await fireballFootprint(page)).count).toBe(0);
  await page.screenshot({ path: testInfo.outputPath("plan-08-launch.png") });

  await page.clock.runFor(3350);
  await expect(simulator).toHaveAttribute("data-launch-phase", "detonating");
  await page.screenshot({ path: testInfo.outputPath("plan-08-impact.png") });
  await page.clock.runFor(300);
  const growing = await fireballFootprint(page);
  expect(growing.count).toBeGreaterThan(20);
  await page.screenshot({ path: testInfo.outputPath("plan-08-early-dome.png") });
  await page.clock.runFor(1950);
  await page.screenshot({ path: testInfo.outputPath("plan-08-expansion.png") });
  await expect(page).toHaveScreenshot("plan-08-expansion.png", { maxDiffPixelRatio: 0.01 });
  await page.clock.runFor(2350);
  await expect(simulator).toHaveAttribute("data-launch-phase", "complete");
  const settled = await fireballFootprint(page);
  expect(settled.count).toBeGreaterThan(20);
  const marker = await page.getByRole("button", { name: /^FIREBALL destruction/ }).boundingBox();
  expect(marker).not.toBeNull();
  const paintedMarkerPixels = await page.locator(".inspection-canvas").evaluate((element, box) => {
    const context = (element as HTMLCanvasElement).getContext("2d")!;
    const pixels = context.getImageData(Math.round(box.x), Math.round(box.y), Math.round(box.width), Math.round(box.height)).data;
    let count = 0;
    for (let index = 3; index < pixels.length; index += 4) if (pixels[index]! > 100) count++;
    return count;
  }, marker!);
  expect(paintedMarkerPixels).toBeGreaterThan(20);
  await page.mouse.move(1450, 900);
  await page.screenshot({ path: testInfo.outputPath("plan-08-settled.png") });
  await expect(page).toHaveScreenshot("plan-08-settled.png", { maxDiffPixelRatio: 0.01 });

  const target = await simulator.getAttribute("data-target-longitude");
  await page.mouse.move(580, 850);
  await page.mouse.down();
  await page.mouse.move(660, 850, { steps: 8 });
  await page.mouse.up();
  await page.clock.runFor(50);
  const panned = await fireballFootprint(page);
  expect(Math.abs(panned.centerX - settled.centerX)).toBeGreaterThan(40);
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.clock.runFor(500);
  const zoomed = await fireballFootprint(page);
  expect(zoomed.width).toBeGreaterThan(panned.width);
  await page.setViewportSize({ width: 1700, height: 950 });
  await page.clock.runFor(50);
  expect((await fireballFootprint(page)).count).toBeGreaterThan(20);
  await expect(simulator).toHaveAttribute("data-target-longitude", target!);
  await page.getByRole("button", { name: "Reset map" }).click();
  await expect(simulator).toHaveAttribute("data-launch-phase", "armed");
  expect((await fireballFootprint(page)).count).toBe(0);
});

test("WebGL failure preserves the 2D impact and settled field", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, options?: unknown) {
      if (this.classList.contains("fireball-canvas") && kind === "webgl2") return null;
      return Reflect.apply(original, this, [kind, options]);
    } as typeof original;
  });
  await page.reload();
  await expect(page.locator("main.simulator")).toHaveAttribute("data-map-state", "ready");
  await page.clock.install();
  await page.mouse.click(1000, 580);
  await page.clock.runFor(11200);
  await expect(page.locator("main.simulator")).toHaveAttribute("data-launch-phase", "complete");
  await expect(page.locator(".blast-zone-marker")).toHaveCount(4);
  const alpha = await page.locator(".blast-canvas").evaluate((element) =>
    (element as HTMLCanvasElement).getContext("2d")!.getImageData(1000, 580, 1, 1).data[3]);
  expect(alpha).toBeGreaterThan(100);
});

test("a settled fireball refreshes its map matrix after tab visibility and window focus return", async ({ page }, testInfo) => {
  await page.clock.install();
  await page.mouse.click(1000, 580);
  await page.clock.runFor(11_200);
  await expect(page.locator("main.simulator")).toHaveAttribute("data-launch-phase", "complete");
  const original = await fireballFootprint(page);
  expect(original.count).toBeGreaterThan(20);

  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  // Chromium may paint a queued map frame despite this synthetic hidden flag.
  // The restored frame after the viewport change is the alignment contract.
  await page.setViewportSize({ width: 1700, height: 950 });
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(100);
  const restored = await fireballFootprint(page);
  expect(restored.count).toBeGreaterThan(20);
  await page.screenshot({ path: testInfo.outputPath("plan-11-fireball-resumed.png") });

  await page.mouse.move(1000, 700);
  await page.mouse.down();
  await page.mouse.move(1090, 700, { steps: 8 });
  await page.mouse.up();
  await page.clock.runFor(100);
  const moved = await fireballFootprint(page);
  expect(Math.abs(moved.centerX - restored.centerX)).toBeGreaterThan(40);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page.clock.runFor(100);
  const focused = await fireballFootprint(page);
  expect(focused.count).toBeGreaterThan(20);
  // Focus restoration must keep the settled dome on the already moved ground.
  expect(Math.abs(focused.centerX - moved.centerX)).toBeLessThan(3);
  expect(Math.abs(focused.centerY - moved.centerY)).toBeLessThan(3);
});
