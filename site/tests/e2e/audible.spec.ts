/** Fixed-tile, fake-time Audible journeys cover field color, keyboard inspection, camera alignment, multi overlap and Reset. */
import { expect, test } from "@playwright/test";
import path from "node:path";

/** Exact CSS-pixel box overlap detects annotations hidden by opaque fixed instruments. */
function overlapArea(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): number {
  return Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
    * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
}

test.use({ viewport: { width: 2208, height: 1276 }, deviceScaleFactor: 1 });
test.setTimeout(90_000);
test.beforeEach(async ({ page }) => {
  await page.route("**/ArcGIS/rest/services/World_Imagery/MapServer/tile/**", (route) => route.fulfill({ path: path.resolve("tests/fixtures/satellite-tile.png"), contentType: "image/png" }));
  await page.goto("/");
  await expect(page.locator("main.simulator")).toHaveAttribute("data-map-state", "ready");
  await page.clock.install();
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10_000);
});

test("settled Audible view shows a continuous green field, focusable range markers and restores Blast framing", async ({ page }, testInfo) => {
  const simulator = page.locator("main.simulator");
  await page.mouse.click(1050, 700);
  await page.clock.runFor(11_300);
  await expect(simulator).toHaveAttribute("data-launch-phase", "complete");
  const blastZoom = await simulator.getAttribute("data-zoom");
  await page.getByRole("tab", { name: "AUDIBLE", exact: true }).click();
  await page.clock.runFor(1_000);
  await expect(simulator).toHaveAttribute("data-effect-view", "audible");
  await expect(page.locator(".audible-marker")).toHaveCount(4);
  await expect(page.getByText(/WEATHER AND TERRAIN CAN DOMINATE/)).toBeVisible();
  const fieldPixels = await page.locator(".blast-canvas").evaluate((canvas) => {
    const element = canvas as HTMLCanvasElement;
    const data = element.getContext("2d")!.getImageData(0, 0, element.width, element.height).data;
    let green = 0;
    for (let offset = 0; offset < data.length; offset += 4) if (data[offset + 1]! > data[offset]! * 1.25 && data[offset + 3]! > 30) green++;
    return green;
  });
  expect(fieldPixels).toBeGreaterThan(1_000);
  await page.screenshot({ path: testInfo.outputPath("plan-13-audible-single.png") });
  await expect(page).toHaveScreenshot("plan-13-audible-single.png", { threshold: 0.05, maxDiffPixelRatio: 0.008 });
  const marker = page.getByRole("button", { name: /^PAINFUL\./ });
  await marker.focus();
  await expect(page.getByRole("tooltip")).toContainText("~100–120 dB peak");
  await marker.click(); await page.mouse.move(1900, 1000);
  await expect(marker).toHaveAttribute("aria-pressed", "true");
  await marker.press("Escape"); await expect(page.getByRole("tooltip")).toHaveCount(0);
  await page.getByRole("tab", { name: "BLAST", exact: true }).click();
  await page.clock.runFor(900);
  await expect(simulator).toHaveAttribute("data-zoom", blastZoom!);
  await page.getByRole("tab", { name: "AUDIBLE", exact: true }).click(); await page.clock.runFor(900);
  await page.mouse.click(1600, 800);
  await expect(simulator).toHaveAttribute("data-effect-view", "blast");
  await page.getByRole("button", { name: "Reset map" }).click();
  await expect(simulator).toHaveAttribute("data-launch-count", "0");
});

test("first Audible entry keeps a round green field throughout its camera ease", async ({ page }, testInfo) => {
  await page.mouse.click(1050, 700);
  await page.clock.runFor(11_300);
  await page.getByRole("tab", { name: "AUDIBLE", exact: true }).click();
  const firstPaintAlpha = () => page.locator(".blast-canvas").evaluate((canvas) => {
    const context = (canvas as HTMLCanvasElement).getContext("2d")!;
    return [450, 1050, 1650].map((x) => context.getImageData(x, 700, 1, 1).data[3]!);
  });
  for (const elapsed of [0, 32]) {
    if (elapsed) await page.clock.runFor(32);
    expect(Math.min(...await firstPaintAlpha()), `${elapsed} ms: complete field across the impact, never a partial raster`).toBeGreaterThan(10);
  }
  /** A viewport-clipped source mask forms an internal straight edge for hundreds of pixels during the 650 ms ease. */
  const fieldShape = () => page.locator(".blast-canvas").evaluate((canvas) => {
    const element = canvas as HTMLCanvasElement;
    const { width, height } = element;
    const data = element.getContext("2d")!.getImageData(0, 0, width, height).data;
    let count = 0;
    for (let offset = 0; offset < data.length; offset += 4) {
      if (data[offset + 1]! > data[offset]! * 1.25 && data[offset + 3]! > 30) count++;
    }
    let longestStraightEdge = 0;
    for (const side of ["left", "right"] as const) {
      let previous = -1;
      let run = 0;
      for (let y = 40; y < height - 40; y += 4) {
        let edge = -1;
        for (let x = side === "left" ? 16 : width - 17; side === "left" ? x < width - 16 : x >= 16; x += side === "left" ? 1 : -1) {
          const offset = (y * width + x) * 4;
          if (data[offset + 1]! > data[offset]! * 1.25 && data[offset + 3]! > 30) { edge = x; break; }
        }
        if (edge >= 16 && edge < width - 16 && previous >= 0 && Math.abs(edge - previous) <= 1) run += 4;
        else run = 0;
        previous = edge;
        longestStraightEdge = Math.max(longestStraightEdge, run);
      }
    }
    return { count, longestStraightEdge };
  });
  for (const elapsed of [120, 350, 550]) {
    await page.clock.runFor(elapsed === 120 ? 88 : elapsed === 350 ? 230 : 200);
    const shape = await fieldShape();
    if (elapsed === 350) {
      await page.screenshot({ path: testInfo.outputPath("plan-13-audible-first-entry-moving.png") });
    }
    expect(shape.count, `${elapsed} ms into the Audible camera ease`).toBeGreaterThan(100);
    if (elapsed >= 350) expect(shape.longestStraightEdge, `${elapsed} ms: a mask edge must not cut across the field`).toBeLessThan(180);
  }
  await page.clock.runFor(400);
  await expect(page.locator(".audible-marker")).toHaveCount(4);
});

test("1.5 Tt Audible entry keeps its large field visible during camera motion", async ({ page }) => {
  await page.getByRole("combobox", { name: "Weapon or delivery system" }).selectOption("continent-scale");
  await page.mouse.click(1050, 700);
  await page.clock.fastForward(11_300);
  await expect(page.locator("main.simulator")).toHaveAttribute("data-launch-phase", "complete");
  await page.getByRole("tab", { name: "AUDIBLE", exact: true }).click();
  for (const elapsed of [120, 350, 550]) {
    await page.clock.runFor(elapsed === 120 ? 120 : elapsed === 350 ? 230 : 200);
    const minimumAlpha = await page.locator(".blast-canvas").evaluate((canvas) => {
      const element = canvas as HTMLCanvasElement;
      const context = element.getContext("2d")!;
      // The capped radius is half the Earth's circumference, so every valid
      // ground point is inside the field. Sample across repeated world copies.
      return Math.min(...[200, 800, 1400, 2000].flatMap((x) => [150, 600, 1050]
        .map((y) => context.getImageData(x, y, 1, 1).data[3]!)));
    });
    expect(minimumAlpha, `${elapsed} ms into the capped-radius transition`).toBeGreaterThan(10);
  }
});

test("multiple Audible fields retain a green gradient and inspectable legend while camera moves", async ({ page }, testInfo) => {
  await page.getByRole("button", { name: "Multi-Launch Mode OFF" }).click();
  await page.mouse.click(1100, 650); await page.clock.runFor(11_300);
  await page.mouse.click(1150, 680); await page.clock.runFor(11_300);
  const simulator = page.locator("main.simulator");
  await expect(simulator).toHaveAttribute("data-launch-count", "2");
  await page.getByRole("tab", { name: "AUDIBLE", exact: true }).click();
  await page.clock.runFor(700);
  await expect(page.getByRole("complementary", { name: "Audible map and effect scales" })).toBeVisible();
  await expect(page.locator(".audible-marker")).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("plan-13-audible-multi.png") });
  await expect(page).toHaveScreenshot("plan-13-audible-multi.png", { threshold: 0.05, maxDiffPixelRatio: 0.008 });
  const legend = page.getByRole("button", { name: /^DEAFENING\./ });
  await legend.focus(); await expect(page.getByRole("tooltip")).toContainText("~120–140+ dB peak");
  const target = await simulator.getAttribute("data-target-longitude");
  await page.mouse.move(1700, 800); await page.mouse.down(); await page.mouse.move(1770, 800, { steps: 5 }); await page.mouse.up();
  await page.clock.runFor(300);
  await expect(simulator).toHaveAttribute("data-target-longitude", target!);
  await page.getByRole("button", { name: "Reset map" }).click();
  await expect(page.getByRole("complementary", { name: "Audible map and effect scales" })).toHaveCount(0);
});

test("dense Audible strikes remain responsive to pan and restore earlier visible fields", async ({ page }) => {
  await page.getByRole("button", { name: "Multi-Launch Mode OFF" }).click();
  const targets = [430, 520, 620, 730].flatMap((y) => [580, 800, 1050, 1250].map((x) => ({ x, y })));
  for (const { x, y } of targets) await page.mouse.click(x, y);
  await page.clock.fastForward(11_300);
  const simulator = page.locator("main.simulator");
  await expect(simulator).toHaveAttribute("data-impact-count", "16");
  await page.getByRole("tab", { name: "AUDIBLE", exact: true }).click();
  await page.clock.runFor(5_000); // 16 retained fields require several bounded animation frames.
  const alphaAt = (x: number, y: number) => page.locator(".blast-canvas").evaluate((canvas, point) =>
    (canvas as HTMLCanvasElement).getContext("2d")!.getImageData(point.x, point.y, 1, 1).data[3]!, { x, y });
  await expect.poll(() => alphaAt(580, 430)).toBeGreaterThan(20);
  const olderFieldAlpha = await alphaAt(1250, 730);
  expect(olderFieldAlpha).toBeGreaterThan(20);
  const before = await simulator.getAttribute("data-center-longitude");
  await page.mouse.move(1700, 900);
  await page.mouse.down();
  await page.mouse.move(1780, 900, { steps: 5 });
  await page.clock.runFor(32); // Inspect while the pointer is down, before moveend rebuilds the mask.
  const movingAlpha = await alphaAt(1330, 730);
  expect(movingAlpha).toBeGreaterThan(20);
  expect(Math.abs(movingAlpha - olderFieldAlpha)).toBeLessThan(35);
  await page.mouse.up();
  await page.clock.runFor(1_800);
  expect(await simulator.getAttribute("data-center-longitude")).not.toBe(before);
  await expect.poll(() => alphaAt(660, 430)).toBeGreaterThan(20);
});

test("pitched Audible pan keeps interior alpha continuous across reprojection mesh rows", async ({ page }, testInfo) => {
  await page.mouse.click(1050, 700);
  await page.clock.fastForward(11_300);
  await page.getByRole("tab", { name: "AUDIBLE", exact: true }).click();
  await page.clock.runFor(1_000);
  await page.mouse.move(1900, 850); await page.mouse.down({ button: "right" });
  await page.mouse.move(1900, 500, { steps: 10 }); await page.mouse.up({ button: "right" });
  await page.clock.runFor(100);
  await expect.poll(async () => Number(await page.locator("main.simulator").getAttribute("data-pitch"))).toBeGreaterThan(20);
  await page.clock.runFor(1_000);
  await page.mouse.move(1800, 900); await page.mouse.down();
  await page.mouse.move(1870, 900, { steps: 5 });
  await page.clock.runFor(32); // Moving projection, before the moveend raster rebuild.
  const seamRatios = await page.locator(".blast-canvas").evaluate((canvas) => {
    const element = canvas as HTMLCanvasElement;
    const { width, height } = element;
    const bytes = element.getContext("2d")!.getImageData(0, 0, width, height).data;
    let worst = 1;
    let brightest = 1;
    for (const x of [1000, 1300, 1600]) for (let y = 420; y < 900; y++) {
      const above = bytes[((y - 2) * width + x) * 4 + 3]!;
      const center = bytes[(y * width + x) * 4 + 3]!;
      const below = bytes[((y + 2) * width + x) * 4 + 3]!;
      if (above < 80 || below < 80) continue; // Inspect interior field, not its natural outer fade.
      const ratio = center / ((above + below) / 2);
      worst = Math.min(worst, ratio);
      brightest = Math.max(brightest, ratio);
    }
    return { minimum: worst, maximum: brightest };
  });
  const isolatedRimPixels = await page.locator(".blast-canvas").evaluate((canvas) => {
    const element = canvas as HTMLCanvasElement;
    const { width, height } = element;
    const bytes = element.getContext("2d")!.getImageData(0, 0, width, height).data;
    const alpha = (x: number, y: number) => bytes[(y * width + x) * 4 + 3]!;
    let isolated = 0;
    for (let y = 160; y < height - 160; y += 2) for (let x = 200; x < width - 200; x += 2) {
      const center = alpha(x, y);
      if (center < 24 || center > 100) continue;
      if ([alpha(x - 4, y), alpha(x + 4, y), alpha(x, y - 4), alpha(x, y + 4)]
        .every((neighbor) => neighbor < center * 0.45)) isolated++;
    }
    return isolated;
  });
  await page.screenshot({ path: testInfo.outputPath("plan-13-pitched-pan-moving.png") });
  expect(seamRatios.minimum, "mesh boundaries preserve the interior field opacity while panning").toBeGreaterThan(0.8);
  expect(seamRatios.maximum, "mesh overlap must not brighten interior grid lines").toBeLessThan(1.2);
  expect(isolatedRimPixels, "moving hearing tail must remain free of isolated mint dots").toBeLessThan(12);
  await page.mouse.up();
});

test.describe("narrow hearing controls", () => {
  test.use({ viewport: { width: 430, height: 844 }, deviceScaleFactor: 1 });

  test("keeps Audible tab and focusable markers reachable without blocking the launch area", async ({ page }) => {
    await page.mouse.click(380, 630); await page.clock.runFor(11_300);
    const simulator = page.locator("main.simulator");
    await expect(simulator).toHaveAttribute("data-launch-phase", "complete");
    await page.getByRole("tab", { name: "AUDIBLE", exact: true }).click();
    await page.clock.runFor(1_000);
    await expect(simulator).toHaveAttribute("data-effect-view", "audible");
    const tabBounds = await page.getByRole("tab", { name: "AUDIBLE", exact: true }).boundingBox();
    expect(tabBounds).not.toBeNull();
    expect(tabBounds!.x + tabBounds!.width).toBeLessThanOrEqual(430);
    await page.getByRole("tab", { name: "BLAST", exact: true }).click();
    await expect(simulator).toHaveAttribute("data-effect-view", "blast");
  });
});

test.describe("Audible annotation clearance", () => {
  // Safari feedback used an approximately 1104 CSS-pixel desktop and a 390px phone;
  // fixed tiles and fake time keep the measured panel geometry reproducible.
  test.use({ viewport: { width: 1104, height: 728 }, deviceScaleFactor: 1 });

  test("keeps the single radius label outside the tab selector and left instrument stack", async ({ page }, testInfo) => {
    await page.mouse.click(550, 420); await page.clock.runFor(11_300);
    await page.getByRole("tab", { name: "AUDIBLE", exact: true }).click(); await page.clock.runFor(900);
    const label = await page.locator(".audible-range-label").boundingBox();
    const selector = await page.locator(".effect-view-selector").boundingBox();
    const controls = await page.locator(".left-instrument-stack").boundingBox();
    expect(label).not.toBeNull();
    expect(overlapArea(label!, selector!)).toBe(0);
    expect(overlapArea(label!, controls!)).toBe(0);
    expect(label!.x).toBeGreaterThanOrEqual(0);
    expect(label!.x + label!.width).toBeLessThanOrEqual(1104);
    await page.screenshot({ path: testInfo.outputPath("plan-13-label-clear-desktop.png") });
  });

  test("places a multi FAINT popup clear of cloud, map-distance box and legend", async ({ page }, testInfo) => {
    await page.getByRole("button", { name: "Multi-Launch Mode OFF" }).click();
    await page.mouse.click(550, 420); await page.clock.runFor(11_300);
    await page.mouse.click(600, 435); await page.clock.runFor(11_300);
    await page.getByRole("tab", { name: "AUDIBLE", exact: true }).click();
    await page.getByRole("button", { name: /^FAINT\./ }).focus();
    const tooltip = page.getByRole("tooltip");
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText("FAINT RUMBLE");
    const box = await tooltip.boundingBox();
    for (const selector of [".left-instrument-stack", ".distance-scale-legend", ".effect-gradient-legend", ".maplibregl-ctrl-attrib", ".model-qualification"]) {
      const blocker = await page.locator(selector).boundingBox();
      expect(overlapArea(box!, blocker!)).toBe(0);
    }
    await page.screenshot({ path: testInfo.outputPath("plan-13-multi-popup-clear-desktop.png") });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.runFor(300);
    await expect(tooltip).toBeVisible();
    const resized = await tooltip.boundingBox();
    for (const selector of [".left-instrument-stack", ".distance-scale-legend", ".effect-gradient-legend", ".effect-view-selector", ".maplibregl-ctrl-attrib"]) {
      expect(overlapArea(resized!, (await page.locator(selector).boundingBox())!)).toBe(0);
    }
    expect(resized!.x + resized!.width).toBeLessThanOrEqual(390);
    await page.screenshot({ path: testInfo.outputPath("plan-13-multi-popup-clear-after-resize.png") });
  });
});

test.describe("narrow Audible popup clearance", () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });

  test("shows the whole FAINT popup and radius label below the instrument stack", async ({ page }, testInfo) => {
    await page.mouse.click(380, 630); await page.clock.runFor(11_300);
    await page.getByRole("tab", { name: "AUDIBLE", exact: true }).click(); await page.clock.runFor(900);
    const controls = await page.locator(".left-instrument-stack").boundingBox();
    const label = await page.locator(".audible-range-label").boundingBox();
    expect(label).not.toBeNull();
    expect(overlapArea(label!, controls!)).toBe(0);
    expect(overlapArea(label!, (await page.locator(".maplibregl-ctrl-attrib").boundingBox())!)).toBe(0);
    const faint = page.getByRole("button", { name: /^FAINT\./ });
    await faint.focus();
    const tooltip = page.getByRole("tooltip");
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText("FAINT RUMBLE");
    const box = await tooltip.boundingBox();
    const activeLabel = await page.locator(".audible-range-label").boundingBox();
    expect(overlapArea(box!, controls!)).toBe(0);
    expect(overlapArea(box!, activeLabel!)).toBe(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(844);
    await page.screenshot({ path: testInfo.outputPath("plan-13-single-popup-clear-narrow.png") });
  });
});
