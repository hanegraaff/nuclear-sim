/** Fixed-tile, fake-time browser paths inspect cloud standby, growth, peak, and device distinctions. */
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

test("cloud monitor stays at standby through flight, grows at fixed blast time, peaks, and resets", async ({ page }, testInfo) => {
  const monitor = page.getByRole("region", { name: "Animated modeled cloud height" });
  await expect(monitor).toBeVisible();
  await expect(monitor).toContainText("MUSHROOM CLOUD · STANDBY");
  await expect(monitor.locator(".cloud-height-readout")).toHaveText("—");
  await monitor.screenshot({ path: testInfo.outputPath("plan-09-standby.png") });
  await expect(monitor).toHaveScreenshot("plan-09-standby.png");

  await page.clock.install();
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10_000);
  await page.mouse.click(1000, 580);
  await page.clock.runFor(3200);
  await expect(page.locator("main.simulator")).toHaveAttribute("data-launch-phase", "inbound");
  await expect(monitor).toHaveAttribute("data-cloud-progress", "0.000");
  await page.clock.runFor(5600); // 2,300 ms into the 4,600 ms blast.
  await expect(page.locator("main.simulator")).toHaveAttribute("data-launch-phase", "detonating");
  expect(Number(await monitor.getAttribute("data-cloud-progress"))).toBeCloseTo(0.5, 1);
  await expect(monitor).toContainText("CAP FORMATION");
  await monitor.screenshot({ path: testInfo.outputPath("plan-09-growing.png") });
  // One injected animation frame can shift a few edge pixels; 1% is smaller
  // than a cap, stem, or label change in this 356 × 172 px instrument.
  await expect(monitor).toHaveScreenshot("plan-09-growing.png", { maxDiffPixelRatio: 0.01 });
  await page.clock.runFor(2400); // one extra frame lets the store publish the terminal tick.
  await expect(page.locator("main.simulator")).toHaveAttribute("data-launch-phase", "complete");
  await expect(monitor.locator(".cloud-height-readout")).toHaveText("12.1 km");
  await expect(monitor).toContainText("MUSHROOM CLOUD · MODELED PEAK");
  await monitor.screenshot({ path: testInfo.outputPath("plan-09-settled.png") });
  await expect(monitor).toHaveScreenshot("plan-09-settled.png");
  const painted = await monitor.locator("canvas").evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const pixels = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
    let smokePixels = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index]! > 80 && pixels[index]! < 230 && pixels[index + 3]! > 200) smokePixels++;
    }
    return smokePixels;
  });
  expect(painted).toBeGreaterThan(100);
  await page.getByRole("button", { name: "Reset map" }).click();
  await expect(monitor).toHaveAttribute("data-cloud-progress", "0.000");
  await expect(monitor.locator(".cloud-height-readout")).toHaveText("—");
  await expect(monitor).toContainText("STANDBY");
});

test("conventional dust and MIRV mushroom profiles render with their own labels and per-warhead scale", async ({ page }, testInfo) => {
  const monitor = page.getByRole("region", { name: "Animated modeled cloud height" });
  await page.getByRole("tab", { name: "DEVICE" }).click();
  await page.getByRole("combobox", { name: "Weapon or delivery system" }).selectOption("moab");
  await page.clock.install();
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10_000);
  await page.mouse.click(1000, 580);
  await page.clock.runFor(11_200);
  await expect(monitor).toContainText("DETONATION PLUME · MODELED PEAK");
  await expect(monitor.locator(".cloud-height-readout")).toHaveText("123 m");
  const conventionalImage = await monitor.locator("canvas").evaluate((element) => (element as HTMLCanvasElement).toDataURL());
  await monitor.screenshot({ path: testInfo.outputPath("plan-09-conventional.png") });
  await expect(monitor).toHaveScreenshot("plan-09-conventional.png");
  await page.getByRole("combobox", { name: "Weapon or delivery system" }).selectOption("rs-24-yars");
  await page.mouse.click(1100, 660);
  // This second-angle MIRV may ease the camera to fit its geographic spread.
  // Start the 11.2 s flight-and-blast interval only after the frozen click
  // becomes a launch, so the cloud's peak assertion uses launch age.
  const simulator = page.locator("main.simulator");
  for (let attempt = 0; attempt < 6 && await simulator.getAttribute("data-launch-count") !== "3"; attempt += 1) {
    await page.clock.runFor(500);
  }
  await expect(simulator).toHaveAttribute("data-launch-count", "3");
  await expect(simulator).toHaveAttribute("data-launch-phase", "inbound");
  await expect(monitor).toHaveAttribute("data-cloud-progress", "0.000");
  await page.clock.runFor(11_200);
  await expect(monitor).toContainText("PER WARHEAD · 3 RVs");
  await expect(monitor).toContainText("MUSHROOM CLOUD · MODELED PEAK");
  const nuclearImage = await monitor.locator("canvas").evaluate((element) => (element as HTMLCanvasElement).toDataURL());
  expect(nuclearImage).not.toBe(conventionalImage);
});
