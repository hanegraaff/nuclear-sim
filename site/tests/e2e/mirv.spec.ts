/** Fixed-tile, fake-time MIRV paths inspect one carrier, separation, staggered impacts, and group retention. */
import { expect, test } from "@playwright/test";
import path from "node:path";

const TILE_PATH = path.resolve("tests/fixtures/satellite-tile.png");

// The repeating fixture tile can land at two phases after narrow camera easing.
// Hide only MapLibre's imagery pixels during this visual gate; controls, 2D
// zones, WebGL fireballs, markers, ruler, and attribution remain composited.
const STABLE_NARROW_VISUAL_STYLE = ".map-surface .maplibregl-canvas { opacity: 0 !important; }";

/** Locate white vehicle cores on the otherwise transparent missile canvas. */
async function vehicleCores(page: import("@playwright/test").Page): Promise<{ x: number; y: number }[]> {
  return page.locator(".missile-canvas").evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const pixels = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
    const points: { x: number; y: number }[] = [];
    for (let y = 0; y < canvas.height; y += 1) for (let x = 0; x < canvas.width; x += 1) {
      const offset = (y * canvas.width + x) * 4;
      if (pixels[offset]! < 245 || pixels[offset + 1]! < 245 || pixels[offset + 2]! < 235 || pixels[offset + 3]! < 200) continue;
      if (points.every((point) => Math.hypot(point.x - x, point.y - y) > 8)) points.push({ x, y });
    }
    return points;
  });
}

test.use({ viewport: { width: 1508, height: 1080 }, deviceScaleFactor: 1 });

test.beforeEach(async ({ page }) => {
  await page.route("**/ArcGIS/rest/services/World_Imagery/MapServer/tile/**", (route) => route.fulfill({ path: TILE_PATH, contentType: "image/png" }));
  await page.goto("/");
  await expect(page.locator("main.simulator")).toHaveAttribute("data-map-state", "ready");
  await page.clock.install();
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10_000);
  await page.getByRole("tab", { name: "DEVICE" }).click();
});

test("one Yars carrier separates into three staggered per-warhead impacts", async ({ page }, testInfo) => {
  const simulator = page.locator("main.simulator");
  await page.getByRole("combobox", { name: "Weapon or delivery system" }).selectOption("rs-24-yars");
  await expect(page.getByText("PER WARHEAD · 3 RVs")).toHaveCount(0);
  await page.mouse.click(930, 580);
  await expect(simulator).toHaveAttribute("data-launch-count", "3");
  await page.clock.fastForward(3_500);
  await page.clock.runFor(50);
  await expect(simulator).toHaveAttribute("data-impact-count", "0");
  await expect(page.locator(".launch-status")).toContainText("MIRV INBOUND · 0/3 impacts");
  await page.screenshot({ path: testInfo.outputPath("plan-11-shared-carrier.png") });
  await expect(page).toHaveScreenshot("plan-11-shared-carrier.png", { threshold: 0.05, maxDiffPixelRatio: 0.005 });
  await page.clock.fastForward(950);
  await page.clock.runFor(50);
  await expect(simulator).toHaveAttribute("data-impact-count", "0");
  await page.screenshot({ path: testInfo.outputPath("plan-11-separation.png") });
  await expect(page).toHaveScreenshot("plan-11-separation.png", { threshold: 0.05, maxDiffPixelRatio: 0.005 });
  await page.clock.fastForward(1_975);
  await page.clock.runFor(10);
  await expect(simulator).toHaveAttribute("data-impact-count", "1");
  await expect(page.locator(".launch-status")).toContainText("1/3 impacts");
  await expect(page.locator(".cloud-monitor-footer small")).toContainText("PER WARHEAD");
  await page.clock.fastForward(4_700);
  await page.clock.runFor(100);
  await expect(simulator).toHaveAttribute("data-impact-count", "3");
  await expect(simulator).toHaveAttribute("data-launch-phase", "complete");
  await page.screenshot({ path: testInfo.outputPath("plan-11-three-impacts.png") });
  await expect(page).toHaveScreenshot("plan-11-three-impacts.png", { threshold: 0.05, maxDiffPixelRatio: 0.005 });
});

test("a ten-warhead click remains one group when multi mode is disabled and Reset cancels it", async ({ page }) => {
  const simulator = page.locator("main.simulator");
  await page.getByRole("combobox", { name: "Weapon or delivery system" }).selectOption("rsm-56-bulava");
  await page.getByRole("button", { name: "Multi-Launch Mode OFF" }).click();
  await page.mouse.click(920, 570);
  await page.clock.runFor(600);
  await expect(simulator).toHaveAttribute("data-launch-count", "10");
  await page.clock.fastForward(11_700);
  await page.clock.runFor(100);
  await expect(simulator).toHaveAttribute("data-impact-count", "10");
  await page.getByRole("button", { name: "Multi-Launch Mode ON" }).click();
  await expect(simulator).toHaveAttribute("data-multi-launch", "false");
  await expect(simulator).toHaveAttribute("data-launch-count", "10");
  await page.getByRole("button", { name: "Reset map" }).click();
  await expect(simulator).toHaveAttribute("data-launch-count", "0");
  await expect(simulator).toHaveAttribute("data-launch-phase", "armed");
});

test("a narrow MIRV launch frames visible impact fireballs below the controls", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 430, height: 844 });
  await page.clock.runFor(100);
  await page.getByRole("combobox", { name: "Weapon or delivery system" }).selectOption("rs-24-yars");
  await page.mouse.click(380, 630);
  const simulator = page.locator("main.simulator");
  await page.clock.runFor(600);
  await expect(simulator).toHaveAttribute("data-launch-count", "3");
  await page.clock.fastForward(11_800);
  // Complete both launch time and any narrow map ease before the visual frame.
  await page.clock.runFor(1_500);
  await expect(simulator).toHaveAttribute("data-impact-count", "3");
  await expect(page.locator(".launch-status")).toContainText("MIRV COMPLETE · 3/3 impacts");
  const visibleFireballs = await page.locator(".fireball-canvas").evaluate((canvas) => {
    const surface = canvas as HTMLCanvasElement;
    const gl = surface.getContext("webgl2", { preserveDrawingBuffer: true });
    if (!gl) return 0;
    const { width, height } = surface;
    const rgba = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
    const visited = new Uint8Array(width * height);
    let count = 0;
    for (let index = 0; index < width * height; index += 1) {
      if (visited[index] || rgba[index * 4 + 3]! <= 70) continue;
      const stack = [index];
      visited[index] = 1;
      let area = 0;
      while (stack.length > 0) {
        const current = stack.pop()!;
        area += 1;
        const x = current % width;
        const y = Math.floor(current / width);
        const neighbors = [x > 0 ? current - 1 : -1, x < width - 1 ? current + 1 : -1,
          y > 0 ? current - width : -1, y < height - 1 ? current + width : -1];
        for (const neighbor of neighbors) {
          if (neighbor < 0 || visited[neighbor] || rgba[neighbor * 4 + 3]! <= 70) continue;
          visited[neighbor] = 1;
          stack.push(neighbor);
        }
      }
      // 20 pixels rejects isolated texture specks but includes the smallest
      // settled dome at this mobile camera scale.
      if (area > 20) count += 1;
    }
    return count;
  });
  expect(visibleFireballs).toBeGreaterThanOrEqual(3);
  await page.screenshot({ path: testInfo.outputPath("plan-11-narrow-impacts.png") });
  await page.addStyleTag({ content: STABLE_NARROW_VISUAL_STYLE });
  await expect(page.locator(".map-surface .maplibregl-canvas")).toHaveCSS("opacity", "0");
  await page.screenshot({ path: testInfo.outputPath("plan-11-narrow-overlay-gate.png") });
  await expect(page).toHaveScreenshot("plan-11-narrow-overlay.png", {
    threshold: 0.05, maxDiffPixelRatio: 0.005,
  });
});

test("edge-entry MIRV carrier stays visible through pitched separation", async ({ page }, testInfo) => {
  await page.getByRole("combobox", { name: "Weapon or delivery system" }).selectOption("rs-24-yars");
  await page.mouse.move(1380, 760);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(1380, 380, { steps: 8 });
  await page.mouse.up({ button: "right" });
  await page.clock.runFor(100);
  await expect.poll(async () => Number(await page.locator("main.simulator").getAttribute("data-pitch"))).toBeGreaterThan(20);
  await page.mouse.click(1430, 100);
  await page.clock.runFor(200);
  expect((await vehicleCores(page)).length).toBeGreaterThan(0);
  await page.clock.runFor(1_300);
  const early = await vehicleCores(page);
  expect(early.length).toBeGreaterThan(0);
  await page.screenshot({ path: testInfo.outputPath("plan-11-forward-edge-early.png") });
  await page.clock.runFor(3_000);
  const middle = await vehicleCores(page);
  expect(middle.length).toBeGreaterThanOrEqual(2);
  await page.screenshot({ path: testInfo.outputPath("plan-11-forward-edge-middle.png") });
  await page.clock.runFor(1_000);
  const late = await vehicleCores(page);
  expect(late.length).toBeGreaterThanOrEqual(2);
  await page.screenshot({ path: testInfo.outputPath("plan-11-forward-edge-late.png") });
  await page.clock.runFor(6_800);
  await expect(page.locator("main.simulator")).toHaveAttribute("data-impact-count", "3");
});

test("a pitched and rotated map renders separated vehicles and their impacts", async ({ page }, testInfo) => {
  await page.getByRole("combobox", { name: "Weapon or delivery system" }).selectOption("rs-24-yars");
  await page.mouse.move(1380, 760);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(1250, 380, { steps: 8 });
  await page.mouse.up({ button: "right" });
  await page.clock.runFor(100);
  const simulator = page.locator("main.simulator");
  await expect.poll(async () => Number(await simulator.getAttribute("data-pitch"))).toBeGreaterThan(20);
  await expect.poll(async () => Math.abs(Number(await simulator.getAttribute("data-bearing")))).toBeGreaterThan(10);
  await page.mouse.click(930, 580);
  await page.clock.runFor(4_700);
  expect((await vehicleCores(page)).length).toBeGreaterThanOrEqual(2);
  await page.screenshot({ path: testInfo.outputPath("plan-11-pitched-rotated-separation.png") });
  await page.clock.runFor(7_300);
  await expect(simulator).toHaveAttribute("data-impact-count", "3");
});

test("a carrier remains continuous when the camera pitches before MIRV separation", async ({ page }, testInfo) => {
  await page.mouse.click(930, 580);
  await page.getByRole("combobox", { name: "Weapon or delivery system" }).selectOption("rs-24-yars");
  await page.mouse.click(660, 660);
  const simulator = page.locator("main.simulator");
  await page.clock.runFor(1_500);
  await expect(simulator).toHaveAttribute("data-launch-count", "3");
  expect(await vehicleCores(page)).toHaveLength(1);
  await page.mouse.move(1380, 760);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(1380, 380, { steps: 8 });
  await page.mouse.up({ button: "right" });
  await page.clock.runFor(100);
  await expect.poll(async () => Number(await simulator.getAttribute("data-pitch"))).toBeGreaterThan(20);
  await page.clock.runFor(4_300);
  expect((await vehicleCores(page)).length).toBeGreaterThanOrEqual(2);
  await page.screenshot({ path: testInfo.outputPath("plan-11-pitch-after-launch-separation.png") });
  await page.clock.runFor(7_300);
  await expect(simulator).toHaveAttribute("data-impact-count", "3");
});

test("high-zoom MIRV framing keeps a visible carrier and all geographic impacts", async ({ page }, testInfo) => {
  await page.getByRole("combobox", { name: "Weapon or delivery system" }).selectOption("rs-24-yars");
  for (let step = 0; step < 4; step += 1) {
    await page.getByRole("button", { name: "Zoom in" }).click();
    await page.clock.runFor(500);
  }
  const simulator = page.locator("main.simulator");
  await expect.poll(async () => Number(await simulator.getAttribute("data-zoom"))).toBeGreaterThan(14);
  await page.mouse.click(1000, 580);
  await expect(page.getByRole("button", { name: "Reset map" })).toBeEnabled();
  await page.clock.runFor(600);
  await expect(simulator).toHaveAttribute("data-launch-count", "3");
  expect(await vehicleCores(page)).toHaveLength(1);
  await page.screenshot({ path: testInfo.outputPath("plan-11-high-zoom-carrier.png") });
  await page.clock.runFor(11_800);
  await expect(simulator).toHaveAttribute("data-impact-count", "3");
  await page.screenshot({ path: testInfo.outputPath("plan-11-high-zoom-impacts.png") });
});

test("pending high-zoom framing can be reset or replaced while device selection is frozen", async ({ page }) => {
  await page.getByRole("combobox", { name: "Weapon or delivery system" }).selectOption("rs-24-yars");
  for (let step = 0; step < 4; step += 1) {
    await page.getByRole("button", { name: "Zoom in" }).click();
    await page.clock.runFor(500);
  }
  const simulator = page.locator("main.simulator");
  await page.mouse.click(1000, 580);
  await expect(simulator).toHaveAttribute("data-launch-count", "0");
  const reticle = await page.locator(".missile-canvas").evaluate((element) => {
    const pixels = (element as HTMLCanvasElement).getContext("2d")!.getImageData(985, 565, 30, 30).data;
    let red = 0;
    for (let index = 0; index < pixels.length; index += 4) if (pixels[index]! > 170 && pixels[index + 1]! < 120 && pixels[index + 3]! > 100) red++;
    return red;
  });
  expect(reticle).toBeGreaterThan(10);
  await page.getByRole("button", { name: "Reset map" }).click();
  await page.clock.runFor(700);
  await expect(simulator).toHaveAttribute("data-launch-count", "0");

  await page.mouse.click(800, 500);
  await page.mouse.click(1100, 600);
  await page.clock.runFor(700);
  await expect(simulator).toHaveAttribute("data-launch-count", "3");
  await page.getByRole("button", { name: "Reset map" }).click();

  for (let step = 0; step < 4; step += 1) {
    await page.getByRole("button", { name: "Zoom in" }).click();
    await page.clock.runFor(500);
  }
  await page.mouse.click(1000, 580);
  await expect(simulator).toHaveAttribute("data-launch-count", "0");
  await page.getByRole("combobox", { name: "Weapon or delivery system" }).selectOption("fat-man");
  await page.clock.runFor(700);
  await expect(simulator).toHaveAttribute("data-launch-count", "3");
  await expect(page.locator(".launch-status")).toContainText("MIRV INBOUND");

  await page.getByRole("button", { name: "Reset map" }).click();
  await page.getByRole("combobox", { name: "Weapon or delivery system" }).selectOption("rs-24-yars");
  for (let step = 0; step < 4; step += 1) {
    await page.getByRole("button", { name: "Zoom in" }).click();
    await page.clock.runFor(500);
  }
  await page.mouse.click(1000, 580);
  await expect(simulator).toHaveAttribute("data-launch-count", "0");
  await page.getByRole("combobox", { name: "Weapon or delivery system" }).selectOption("fat-man");
  await page.mouse.click(1100, 600);
  await expect(simulator).toHaveAttribute("data-launch-count", "1");
  await page.clock.runFor(700);
  await expect(simulator).toHaveAttribute("data-launch-count", "1");
});

test("multi-mode framing preserves queued click order and later mode changes keep the newest group", async ({ page }) => {
  await page.getByRole("combobox", { name: "Weapon or delivery system" }).selectOption("rs-24-yars");
  await page.getByRole("button", { name: "Multi-Launch Mode OFF" }).click();
  for (let step = 0; step < 4; step += 1) {
    await page.getByRole("button", { name: "Zoom in" }).click();
    await page.clock.runFor(500);
  }
  const simulator = page.locator("main.simulator");
  await page.mouse.click(820, 500);
  await page.mouse.click(1100, 620);
  await page.clock.runFor(1_300);
  await expect(simulator).toHaveAttribute("data-launch-count", "6");
  await page.getByRole("button", { name: "Reset map" }).click();
  for (let step = 0; step < 4; step += 1) {
    await page.getByRole("button", { name: "Zoom in" }).click();
    await page.clock.runFor(500);
  }
  await page.mouse.click(1000, 580);
  await expect(simulator).toHaveAttribute("data-launch-count", "0");
  await page.getByRole("button", { name: "Multi-Launch Mode ON" }).click();
  await page.clock.runFor(1_200);
  await expect(simulator).toHaveAttribute("data-launch-count", "3");
  await expect(simulator).toHaveAttribute("data-multi-launch", "false");
});
