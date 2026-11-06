/** Fixed-tile, fake-time Visible journeys cover the sightline field, inspection, moving camera, and view restoration. */
import { expect, test } from "@playwright/test";
import path from "node:path";

test.use({ viewport: { width: 2208, height: 1276 }, deviceScaleFactor: 1 });
test.setTimeout(90_000);
test.beforeEach(async ({ page }) => {
  await page.route("**/ArcGIS/rest/services/World_Imagery/MapServer/tile/**", (route) => route.fulfill({ path: path.resolve("tests/fixtures/satellite-tile.png"), contentType: "image/png" }));
  await page.goto("/");
  await expect(page.locator("main.simulator")).toHaveAttribute("data-map-state", "ready");
  await page.clock.install();
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10_000);
});

/** Count field pixels from the effect canvas, independent of tile and marker animation timing. */
async function fieldCoverage(page: import("@playwright/test").Page): Promise<{ count: number; centerAlpha: number }> {
  return page.locator(".blast-canvas").evaluate((canvas) => {
    const element = canvas as HTMLCanvasElement;
    const { width, height } = element;
    const data = element.getContext("2d")!.getImageData(0, 0, width, height).data;
    let count = 0;
    for (let offset = 0; offset < data.length; offset += 4) if (data[offset + 3]! > 20) count++;
    return { count, centerAlpha: data[((Math.floor(height / 2) * width + Math.floor(width / 2)) * 4) + 3]! };
  });
}

test("Fat Man Visible shows a 98.5 km field, four inspection bands and restores Blast", async ({ page }, testInfo) => {
  await page.mouse.click(1050, 700);
  await page.clock.runFor(11_300);
  const simulator = page.locator("main.simulator");
  await expect(simulator).toHaveAttribute("data-launch-phase", "complete");
  const blastZoom = await simulator.getAttribute("data-zoom");
  await page.getByRole("tab", { name: "VISIBLE", exact: true }).click();
  expect((await fieldCoverage(page)).count, "first frame before camera ease").toBeGreaterThan(1_000);
  await page.clock.runFor(350);
  expect((await fieldCoverage(page)).count, "moving camera before the full raster completes").toBeGreaterThan(1_000);
  await page.clock.runFor(650);
  await expect(page.locator(".visible-marker")).toHaveCount(4);
  await expect(page.getByText(/CLEAR AIR/)).toBeVisible();
  expect((await fieldCoverage(page)).count).toBeGreaterThan(1_000);
  await page.screenshot({ path: testInfo.outputPath("plan-14-visible-single.png") });
  await expect(page).toHaveScreenshot("plan-14-visible-single.png", { threshold: 0.05, maxDiffPixelRatio: 0.008 });
  await page.getByRole("button", { name: /^BRILLIANT\./ }).focus();
  await expect(page.getByRole("tooltip")).toContainText("The fireball burns blue-white above the horizon");
  await page.getByRole("tab", { name: "BLAST", exact: true }).click();
  await page.clock.runFor(900);
  await expect(simulator).toHaveAttribute("data-zoom", blastZoom!);
});

test("1 Pt Visible field remains present through a large first-entry camera ease", async ({ page }, testInfo) => {
  await page.getByRole("combobox", { name: "Weapon or delivery system" }).selectOption("earth-spanning");
  await page.mouse.click(1050, 700);
  await page.clock.runFor(11_300);
  await page.getByRole("tab", { name: "VISIBLE", exact: true }).click();
  for (const elapsed of [0, 120, 350, 550]) {
    if (elapsed) await page.clock.runFor(elapsed === 120 ? 120 : elapsed === 350 ? 230 : 200);
    const coverage = await fieldCoverage(page);
    expect(coverage.count, `${elapsed} ms into the large sightline ease`).toBeGreaterThan(1_000);
    expect(coverage.centerAlpha, `${elapsed} ms: the geographic center remains painted`).toBeGreaterThan(20);
    if (elapsed === 550) {
      await page.screenshot({ path: testInfo.outputPath("plan-14-visible-extreme-moving.png") });
      expect(coverage.count).toBeGreaterThan(100_000);
      const abruptSteps = await page.locator(".blast-canvas").evaluate((canvas) => {
        const image = (canvas as HTMLCanvasElement).getContext("2d")!.getImageData(0, 0, 2208, 1276).data;
        let count = 0;
        for (const y of [340, 640, 900]) for (let x = 300; x < 1900; x += 4) {
          const first = image[(y * 2208 + x) * 4 + 3]!;
          const second = image[(y * 2208 + x + 4) * 4 + 3]!;
          if (first > 40 && second > 40 && Math.abs(first - second) > 35) count++;
        }
        return count;
      });
      // A clipped or partly filled source mask forms a large alpha step,
      // whereas the sampled physical falloff changes smoothly over 4 px.
      expect(abruptSteps).toBe(0);
    }
  }
});

test("pitched Visible rim remains softly feathered during a held pan", async ({ page }, testInfo) => {
  await page.mouse.click(1050, 700);
  await page.clock.runFor(11_300);
  await page.getByRole("tab", { name: "VISIBLE", exact: true }).click();
  await page.clock.runFor(1_000);
  await page.mouse.move(1900, 850); await page.mouse.down({ button: "right" });
  await page.mouse.move(1900, 500, { steps: 10 }); await page.mouse.up({ button: "right" });
  await page.clock.runFor(1_000);
  await expect.poll(async () => Number(await page.locator("main.simulator").getAttribute("data-pitch"))).toBeGreaterThan(20);
  await page.screenshot({ path: testInfo.outputPath("plan-14-visible-pitched-settled.png") });
  await expect(page).toHaveScreenshot("plan-14-visible-pitched-settled.png", { threshold: 0.05, maxDiffPixelRatio: 0.008 });
  await page.mouse.move(1800, 900); await page.mouse.down();
  await page.mouse.move(1870, 900, { steps: 5 });
  await page.clock.runFor(32);
  const coverage = await fieldCoverage(page);
  expect(coverage.count).toBeGreaterThan(1_000);
  const isolatedRimPixels = await page.locator(".blast-canvas").evaluate((canvas) => {
    const element = canvas as HTMLCanvasElement;
    const { width, height } = element;
    const data = element.getContext("2d")!.getImageData(0, 0, width, height).data;
    const alpha = (x: number, y: number) => data[(y * width + x) * 4 + 3]!;
    let isolated = 0;
    for (let y = 160; y < height - 160; y += 2) for (let x = 200; x < width - 200; x += 2) {
      const center = alpha(x, y);
      if (center < 24 || center > 100) continue;
      const neighbors = [alpha(x - 4, y), alpha(x + 4, y), alpha(x, y - 4), alpha(x, y + 4)];
      if (neighbors.every((value) => value < center * 0.45)) isolated++;
    }
    return isolated;
  });
  expect(isolatedRimPixels, "pitched motion must not promote isolated outer-fringe texels").toBeLessThan(12);
  await page.screenshot({ path: testInfo.outputPath("plan-14-visible-pitched-moving.png") });
  await page.mouse.up();
});

test("two retained Visible fields use one blue legend and preserve pan framing", async ({ page }, testInfo) => {
  await page.getByRole("button", { name: "Multi-Launch Mode OFF" }).click();
  await page.mouse.click(1100, 650); await page.clock.runFor(11_300);
  await page.mouse.click(1150, 680); await page.clock.runFor(11_300);
  const simulator = page.locator("main.simulator");
  await expect(simulator).toHaveAttribute("data-launch-count", "2");
  const zoom = await simulator.getAttribute("data-zoom");
  await page.getByRole("tab", { name: "VISIBLE", exact: true }).click();
  await page.clock.runFor(1_000);
  await expect(simulator).toHaveAttribute("data-zoom", zoom!);
  await expect(page.getByRole("complementary", { name: "Visible map and effect scales" })).toBeVisible();
  await expect(page.locator(".visible-marker")).toHaveCount(0);
  expect((await fieldCoverage(page)).count).toBeGreaterThan(1_000);
  await page.screenshot({ path: testInfo.outputPath("plan-14-visible-multi.png") });
  await expect(page).toHaveScreenshot("plan-14-visible-multi.png", { threshold: 0.05, maxDiffPixelRatio: 0.008 });
  const faint = page.getByRole("button", { name: /^FAINT\./ });
  await faint.focus();
  await expect(page.getByRole("tooltip")).toContainText("FAINT");
  await page.getByRole("button", { name: "Reset map" }).click();
  await expect(page.getByRole("complementary", { name: "Visible map and effect scales" })).toHaveCount(0);
});

test("narrow Visible popup and range label fit below fixed controls after resize", async ({ page }) => {
  await page.mouse.click(1050, 700);
  await page.clock.runFor(11_300);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("tab", { name: "VISIBLE", exact: true }).click();
  await page.clock.runFor(1_000);
  await page.getByRole("button", { name: /^FAINT\./ }).focus();
  const popup = page.getByRole("tooltip");
  await expect(popup).toBeVisible();
  const rect = await popup.boundingBox();
  const panel = await page.locator(".left-instrument-stack").boundingBox();
  expect(rect).not.toBeNull(); expect(panel).not.toBeNull();
  expect(rect!.x).toBeGreaterThanOrEqual(0);
  expect(rect!.y).toBeGreaterThanOrEqual(panel!.y + panel!.height);
  expect(rect!.x + rect!.width).toBeLessThanOrEqual(390);
  expect(rect!.y + rect!.height).toBeLessThanOrEqual(844);
  const label = await page.locator(".visible-range-label").boundingBox();
  expect(label).not.toBeNull();
  expect(label!.x + label!.width).toBeLessThanOrEqual(390);
  expect(label!.y + label!.height).toBeLessThanOrEqual(844);
});
