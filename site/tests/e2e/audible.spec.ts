/** Fixed-tile, fake-time Audible journeys cover field color, keyboard inspection, camera alignment, multi overlap and Reset. */
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
