/** Fixed-tile, fake-time journeys compare day/night imagery and shown/hidden controls at one unchanged strike and camera. */
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

/** Preserve the camera and strike fields that tone/panel changes must not edit. */
async function simulationIdentity(page: import("@playwright/test").Page) {
  const simulator = page.locator("main.simulator");
  return Promise.all(["data-center-longitude", "data-center-latitude", "data-zoom", "data-pitch", "data-bearing", "data-target-longitude", "data-target-latitude", "data-launch-count", "data-effect-view"].map((name) => simulator.getAttribute(name)));
}

/** Alpha-weighted field center in CSS pixels; compare its camera shift with a geographic marker. */
async function blastFieldCenter(page: import("@playwright/test").Page): Promise<{ x: number; y: number }> {
  return page.locator(".blast-canvas").evaluate((canvas) => {
    const element = canvas as HTMLCanvasElement;
    const { width, height } = element;
    const bytes = element.getContext("2d")!.getImageData(0, 0, width, height).data;
    let weight = 0, xSum = 0, ySum = 0;
    for (let y = 0; y < height; y += 4) for (let x = 0; x < width; x += 4) {
      const alpha = bytes[(y * width + x) * 4 + 3]!;
      if (alpha < 25) continue;
      weight += alpha; xSum += x * alpha; ySum += y * alpha;
    }
    return { x: xSum / weight, y: ySum / weight };
  });
}

test("Night darkens satellite imagery while a settled Visible field, markers and attribution stay fixed", async ({ page }, testInfo) => {
  await page.mouse.click(1050, 700);
  await page.clock.runFor(11_300);
  await page.getByRole("tab", { name: "VISIBLE", exact: true }).click();
  await page.clock.runFor(1_000);
  const simulator = page.locator("main.simulator");
  const identity = await simulationIdentity(page);
  const markers = await page.locator(".visible-marker").evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect(); return [rect.x, rect.y];
  }));
  const effectPixels = await page.locator(".blast-canvas").evaluate((canvas) => (canvas as HTMLCanvasElement).toDataURL());
  const rulerPixels = await page.locator(".inspection-canvas").evaluate((canvas) => (canvas as HTMLCanvasElement).toDataURL());
  await page.screenshot({ path: testInfo.outputPath("plan-15-day-visible.png") });
  await expect(page).toHaveScreenshot("plan-15-day-visible.png", { threshold: 0.05, maxDiffPixelRatio: 0.008 });
  const dayImagery = await page.screenshot({ clip: { x: 1900, y: 850, width: 100, height: 100 } });
  const night = page.getByRole("button", { name: "Night mode" });
  await expect(night).toHaveAttribute("aria-pressed", "false");
  await night.click();
  await page.clock.runFor(400); // Prototype map-tone transition is 350 ms.
  await expect(night).toHaveAttribute("aria-pressed", "true");
  await expect(simulator).toHaveAttribute("data-map-tone", "night");
  expect(await simulationIdentity(page)).toEqual(identity);
  expect(await page.locator(".blast-canvas").evaluate((canvas) => (canvas as HTMLCanvasElement).toDataURL())).toBe(effectPixels);
  expect(await page.locator(".inspection-canvas").evaluate((canvas) => (canvas as HTMLCanvasElement).toDataURL())).toBe(rulerPixels);
  expect(await page.locator(".visible-marker").evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect(); return [rect.x, rect.y];
  }))).toEqual(markers);
  await expect(page.getByText("Tiles © Esri", { exact: false })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("plan-15-night-visible.png") });
  await expect(page).toHaveScreenshot("plan-15-night-visible.png", { threshold: 0.05, maxDiffPixelRatio: 0.008 });
  const nightImagery = await page.screenshot({ clip: { x: 1900, y: 850, width: 100, height: 100 } });
  expect(nightImagery.equals(dayImagery), "the same fixture tile should visibly darken").toBe(false);
  await night.click();
  await expect(night).toHaveAttribute("aria-pressed", "false");
  await expect(simulator).toHaveAttribute("data-map-tone", "day");
  expect(await simulationIdentity(page)).toEqual(identity);
});

test("Hide and Show restore panels by keyboard without losing strike, effect selection or map input", async ({ page }, testInfo) => {
  await page.mouse.click(1050, 700);
  await page.clock.runFor(11_300);
  const simulator = page.locator("main.simulator");
  const identity = await simulationIdentity(page);
  const light = page.getByRole("button", { name: /^LIGHT destruction/ });
  await light.click();
  await expect(light).toHaveAttribute("aria-pressed", "true");
  const shownField = await blastFieldCenter(page);
  const shownMarker = await light.boundingBox();
  await page.screenshot({ path: testInfo.outputPath("plan-15-controls-shown.png") });
  await expect(page).toHaveScreenshot("plan-15-controls-shown.png", { threshold: 0.05, maxDiffPixelRatio: 0.008 });
  const hide = page.getByRole("button", { name: "Hide control and cloud panels" });
  await hide.focus(); await hide.press("Enter");
  await page.clock.runFor(300); // The panel's 260 ms slide must finish before its bounds are checked.
  await expect(simulator).toHaveAttribute("data-panels-visible", "false");
  await expect(page.locator(".left-instrument-stack")).toHaveAttribute("inert", "");
  await expect(page.getByRole("button", { name: "Show control and cloud panels" })).toBeFocused();
  expect(await simulationIdentity(page)).toEqual(identity);
  await expect(page.getByRole("tab", { name: "BLAST", exact: true })).toBeVisible();
  await expect(page.getByText("Tiles © Esri", { exact: false })).toBeVisible();
  await expect(light).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("tooltip")).toContainText("LIGHT DESTRUCTION");
  const hiddenField = await blastFieldCenter(page);
  const hiddenMarker = await light.boundingBox();
  // The source field is sampled on a four-pixel grid; 12 CSS pixels allow
  // for its antialiased tail while detecting a field detached from its marker.
  expect(Math.abs((hiddenField.x - shownField.x) - (hiddenMarker!.x - shownMarker!.x))).toBeLessThan(12);
  expect(Math.abs((hiddenField.y - shownField.y) - (hiddenMarker!.y - shownMarker!.y))).toBeLessThan(12);
  await page.screenshot({ path: testInfo.outputPath("plan-15-controls-hidden.png") });
  await expect(page).toHaveScreenshot("plan-15-controls-hidden.png", { threshold: 0.05, maxDiffPixelRatio: 0.008 });
  const show = page.getByRole("button", { name: "Show control and cloud panels" });
  await show.press("Space");
  await page.clock.runFor(300);
  await expect(simulator).toHaveAttribute("data-panels-visible", "true");
  await expect(hide).toBeFocused();
  await expect(light).toHaveAttribute("aria-pressed", "true");
  expect(await simulationIdentity(page)).toEqual(identity);
  await page.getByRole("tab", { name: "AUDIBLE", exact: true }).click();
  await page.clock.runFor(900);
  await hide.click();
  await page.clock.runFor(300);
  await expect(simulator).toHaveAttribute("data-effect-view", "audible");
  await page.mouse.click(1700, 800);
  await expect(simulator).toHaveAttribute("data-launch-count", "1");
  await expect(simulator).toHaveAttribute("data-effect-view", "blast");
  await expect(simulator).toHaveAttribute("data-panels-visible", "false");
});

test.describe("narrow control visibility", () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });

  test("keeps Night, mode, selection and launch animation usable while panels are hidden", async ({ page }, testInfo) => {
    const simulator = page.locator("main.simulator");
    await page.getByRole("combobox", { name: "Weapon or delivery system" }).selectOption("b61");
    await page.getByRole("button", { name: "Multi-Launch Mode OFF" }).click();
    await page.getByRole("button", { name: "Night mode" }).click();
    await expect(simulator).toHaveAttribute("data-launch-count", "0"); // None of these control clicks targets the map.
    await page.getByRole("button", { name: "Hide control and cloud panels" }).click();
    await page.clock.runFor(300);
    const show = page.getByRole("button", { name: "Show control and cloud panels" });
    await expect(show).toBeVisible();
    const bounds = await show.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
    await page.mouse.click(320, 600);
    await expect(simulator).toHaveAttribute("data-launch-count", "1");
    await expect(simulator).toHaveAttribute("data-launch-phase", "inbound");
    await page.screenshot({ path: testInfo.outputPath("plan-15-hidden-night-launch.png") });
    await page.clock.runFor(6_550);
    await expect(simulator).toHaveAttribute("data-launch-phase", "detonating");
    await page.screenshot({ path: testInfo.outputPath("plan-15-hidden-night-impact.png") });
    await page.clock.runFor(850);
    await page.screenshot({ path: testInfo.outputPath("plan-15-hidden-night-expansion.png") });
    await page.clock.runFor(4_000);
    await expect(simulator).toHaveAttribute("data-launch-phase", "complete");
    await page.screenshot({ path: testInfo.outputPath("plan-15-hidden-night-settled.png") });
    await expect(simulator).toHaveAttribute("data-multi-launch", "true");
    await expect(simulator).toHaveAttribute("data-map-tone", "night");
    await show.click();
    await expect(simulator).toHaveAttribute("data-panels-visible", "true");
    await expect(page.getByRole("button", { name: "Night mode" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Multi-Launch Mode ON" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("combobox", { name: "Weapon or delivery system" })).toHaveValue("b61");
  });
});
