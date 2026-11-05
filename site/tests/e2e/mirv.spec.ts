/** Fixed-tile, fake-time MIRV paths inspect one carrier, separation, staggered impacts, and group retention. */
import { expect, test } from "@playwright/test";
import path from "node:path";

const TILE_PATH = path.resolve("tests/fixtures/satellite-tile.png");

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
  await expect(simulator).toHaveAttribute("data-launch-count", "3");
  await page.clock.fastForward(11_800);
  await page.clock.runFor(750);
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
  await expect(page).toHaveScreenshot("plan-11-narrow-impacts.png", { threshold: 0.05, maxDiffPixelRatio: 0.005 });
});
