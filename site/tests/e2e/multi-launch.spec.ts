/** Fixed-tile, fake-time paths cover additive groups, legend interaction, scale, mode switch, and Reset. */
import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

const TILE_PATTERN = "**/ArcGIS/rest/services/World_Imagery/MapServer/tile/**";
const TILE_PATH = path.resolve("tests/fixtures/satellite-tile.png");

test.use({ viewport: { width: 1508, height: 1080 }, deviceScaleFactor: 1 });

test.beforeEach(async ({ page }) => {
  await page.route(TILE_PATTERN, (route) => route.fulfill({ path: TILE_PATH, contentType: "image/png" }));
  await page.goto("/");
  await expect(page.locator("main.simulator")).toHaveAttribute("data-map-state", "ready");
  await page.clock.install();
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10_000);
});

/** Click the map and advance its injected launch clock past flight and expansion. */
async function settledClick(page: Page, x: number, y: number): Promise<void> {
  await page.mouse.click(x, y);
  await page.clock.fastForward(11_200);
  await page.clock.runFor(50);
}

test("multi mode keeps earlier blasts while a new missile arrives, then restores newest single group", async ({ page }, testInfo) => {
  const simulator = page.locator("main.simulator");
  const toggle = page.locator(".multi-launch-toggle");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  const legend = page.getByRole("complementary", { name: "Combined strike map and effect scales" });
  await expect(legend).toBeVisible();
  await settledClick(page, 950, 580);
  await expect(simulator).toHaveAttribute("data-impact-count", "1");
  await page.mouse.click(1050, 620);
  await expect(simulator).toHaveAttribute("data-launch-count", "2");
  await expect(simulator).toHaveAttribute("data-impact-count", "1");
  await expect(page.locator(".blast-zone-marker")).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("plan-10-second-inbound.png") });
  // The fixed tile and fake clock make a 5% channel and 0.5% pixel tolerance
  // sufficient for slight WebGL variation without hiding a changed field.
  await expect(page).toHaveScreenshot("plan-10-second-inbound.png", { threshold: 0.05, maxDiffPixelRatio: 0.005 });
  await page.clock.fastForward(11_200);
  await page.clock.runFor(50);
  await expect(simulator).toHaveAttribute("data-launch-phase", "complete");
  await expect(simulator).toHaveAttribute("data-impact-count", "2");
  await expect(page.locator(".multi-legend-marker")).toHaveCount(4);
  const fireball = page.getByRole("button", { name: /^FIREBALL destruction/ });
  await fireball.hover();
  await expect(page.getByRole("tooltip")).toContainText("FIREBALL DESTRUCTION");
  await expect(page.getByRole("tooltip")).toContainText("LATEST STRIKE ZONE");
  await fireball.focus();
  await expect(page.getByRole("tooltip")).toContainText("FIREBALL DESTRUCTION");
  await page.mouse.move(1400, 900);
  await page.getByRole("button", { name: "Multi-Launch Mode ON" }).click();
  await expect(simulator).toHaveAttribute("data-multi-launch", "false");
  await expect(simulator).toHaveAttribute("data-launch-count", "1");
  await expect(legend).toHaveCount(0);
  await expect(page.locator(".blast-zone-marker")).toHaveCount(4);
  await page.getByRole("button", { name: "Reset map" }).click();
  await expect(simulator).toHaveAttribute("data-launch-count", "0");
  await expect(simulator).toHaveAttribute("data-launch-phase", "armed");
});

test("five settled fields keep individual fireballs and the map-derived legend scale stays fixed to its track", async ({ page }, testInfo) => {
  await page.getByRole("button", { name: "Multi-Launch Mode OFF" }).click();
  for (const [x, y] of [[930, 600], [1005, 555], [1080, 600], [985, 650], [1070, 665]]) await settledClick(page, x!, y!);
  const simulator = page.locator("main.simulator");
  await expect(simulator).toHaveAttribute("data-launch-count", "5");
  await expect(simulator).toHaveAttribute("data-impact-count", "5");
  await expect(page.locator(".launch-status")).toContainText("5/5 impacts");
  await expect(page.locator(".blast-zone-marker")).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("plan-10-five-strikes.png") });
  await expect(page).toHaveScreenshot("plan-10-five-strikes.png", { threshold: 0.05, maxDiffPixelRatio: 0.005 });
  const bar = page.locator(".distance-scale-bar");
  const beforeLabel = await page.locator(".distance-scale-legend b").textContent();
  const markers = page.locator(".multi-legend-marker");
  const before = await markers.evaluateAll((elements) => elements.map((element) => (element as HTMLElement).style.left));
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.clock.runFor(500);
  const after = await markers.evaluateAll((elements) => elements.map((element) => (element as HTMLElement).style.left));
  expect(after).toEqual(before);
  expect(await page.locator(".distance-scale-legend b").textContent()).not.toBe(beforeLabel);
  const barWidth = await bar.evaluate((element) => (element as HTMLElement).getBoundingClientRect().width);
  expect(barWidth).toBeGreaterThanOrEqual(54);
  expect(barWidth).toBeLessThanOrEqual(158);
  const cameraBeforeReset = await simulator.getAttribute("data-center-longitude");
  const deviceBeforeReset = await page.getByRole("combobox", { name: "Weapon or delivery system" }).inputValue();
  await page.getByRole("button", { name: "Reset map" }).click();
  await expect(simulator).toHaveAttribute("data-multi-launch", "true");
  await expect(simulator).toHaveAttribute("data-launch-count", "0");
  await expect(simulator).toHaveAttribute("data-center-longitude", cameraBeforeReset!);
  await expect(page.getByRole("combobox", { name: "Weapon or delivery system" })).toHaveValue(deviceBeforeReset);
  await expect(page.locator(".multi-legend-marker")).toHaveCount(4);
});
