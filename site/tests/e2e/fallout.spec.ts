/** Fixed-tile, fake-time Fallout journeys cover eligibility, view switching, inspection and geographic camera alignment. */
import { expect, test } from "@playwright/test";
import path from "node:path";

test.use({ viewport: { width: 2208, height: 1276 }, deviceScaleFactor: 1 });
// The full-size geographic mask is rebuilt through the eased camera's fake-time
// frames. Allow CPU headroom without weakening any visual/state assertion.
test.setTimeout(90_000);
test.beforeEach(async ({ page }) => {
  await page.route("**/ArcGIS/rest/services/World_Imagery/MapServer/tile/**", (route) => route.fulfill({ path: path.resolve("tests/fixtures/satellite-tile.png"), contentType: "image/png" }));
  await page.goto("/");
  await expect(page.locator("main.simulator")).toHaveAttribute("data-map-state", "ready");
  await page.clock.install();
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10_000);
});

test("settled nuclear Fallout has a curved H+24 field, focusable dose markers and a reversible camera frame", async ({ page }, testInfo) => {
  await page.mouse.move(1900, 850); await page.mouse.down({ button: "right" });
  await page.mouse.move(1900, 430, { steps: 10 }); await page.mouse.up({ button: "right" });
  await page.clock.runFor(100);
  await expect.poll(async () => Number(await page.locator("main.simulator").getAttribute("data-pitch"))).toBeGreaterThan(20);
  await page.mouse.click(1050, 700);
  await page.clock.runFor(11_300);
  const simulator = page.locator("main.simulator");
  await expect(simulator).toHaveAttribute("data-launch-phase", "complete");
  const blastZoom = await simulator.getAttribute("data-zoom");
  await page.getByRole("tab", { name: "FALLOUT", exact: true }).click();
  await page.clock.runFor(1_800);
  await expect(simulator).toHaveAttribute("data-effect-view", "fallout");
  await expect(page.getByText(/CLIMATOLOGICAL WIND PROXY, NOT LIVE METEOROLOGY/)).toBeVisible();
  await expect(page.locator(".fallout-marker")).toHaveCount(4);
  await page.screenshot({ path: testInfo.outputPath("plan-12-fallout-pitched.png") });
  await expect(page).toHaveScreenshot("plan-12-fallout-pitched.png", { threshold: 0.05, maxDiffPixelRatio: 0.008 });
  const marker = page.getByRole("button", { name: /^CRITICAL DOSE\./ });
  await marker.focus();
  await expect(page.getByRole("tooltip")).toContainText("~2–6 Gy");
  await marker.click(); await page.mouse.move(1800, 1000);
  await expect(marker).toHaveAttribute("aria-pressed", "true");
  await marker.press("Escape"); await expect(page.getByRole("tooltip")).toHaveCount(0);
  const target = await simulator.getAttribute("data-target-longitude");
  await page.mouse.move(1700, 850); await page.mouse.down(); await page.mouse.move(1790, 850, { steps: 8 }); await page.mouse.up();
  await page.clock.runFor(800);
  await expect(simulator).toHaveAttribute("data-target-longitude", target!);
  await page.getByRole("tab", { name: "BLAST", exact: true }).click(); await page.clock.runFor(900);
  await expect(simulator).toHaveAttribute("data-effect-view", "blast");
  await expect(simulator).toHaveAttribute("data-zoom", blastZoom!);
  await page.getByRole("tab", { name: "FALLOUT", exact: true }).click(); await page.clock.runFor(900);
  await page.mouse.click(1600, 800);
  await expect(simulator).toHaveAttribute("data-effect-view", "blast");
  await page.getByRole("button", { name: "Reset map" }).click();
  await expect(simulator).toHaveAttribute("data-launch-count", "0");
  await expect(page.getByRole("tab", { name: "FALLOUT", exact: true })).toHaveCount(0);
});

test("conventional-only deliveries omit Fallout while a mixed multi scene includes only nuclear fields", async ({ page }) => {
  await page.getByRole("tab", { name: "DEVICE", exact: true }).click();
  const select = page.getByRole("combobox", { name: "Weapon or delivery system" });
  await select.selectOption("moab"); await page.mouse.click(1100, 650); await page.clock.runFor(11_300);
  await expect(page.getByRole("tab", { name: "FALLOUT", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Multi-Launch Mode OFF" }).click();
  await select.selectOption("fat-man"); await page.mouse.click(1250, 650); await page.clock.runFor(11_300);
  const camera = await page.locator("main.simulator").evaluate((element) => ({
    longitude: element.getAttribute("data-center-longitude"), latitude: element.getAttribute("data-center-latitude"), zoom: element.getAttribute("data-zoom"),
  }));
  await page.getByRole("tab", { name: "FALLOUT", exact: true }).click(); await page.clock.runFor(2_000);
  await expect(page.locator("main.simulator")).toHaveAttribute("data-center-longitude", camera.longitude!);
  await expect(page.locator("main.simulator")).toHaveAttribute("data-center-latitude", camera.latitude!);
  await expect(page.locator("main.simulator")).toHaveAttribute("data-zoom", camera.zoom!);
  await expect(page.getByRole("complementary", { name: "Fallout map and effect scales" })).toBeVisible();
  await expect(page.locator(".fallout-marker")).toHaveCount(0);
  const band = page.getByRole("button", { name: /^CONTAMINATED\./ }); await band.focus();
  await expect(page.getByRole("tooltip")).toContainText("Below ~0.5 Gy");
  await page.getByRole("button", { name: "Reset map" }).click();
  await expect(page.getByRole("complementary", { name: "Fallout map and effect scales" })).toHaveCount(0);
});

test.describe("narrow pointer controls", () => {
  test.use({ viewport: { width: 430, height: 844 }, deviceScaleFactor: 1 });

  test("switches Fallout and Blast by pointer outside the instrument stack", async ({ page }) => {
    await page.mouse.click(380, 630); await page.clock.runFor(11_300);
    const selector = page.getByRole("tablist", { name: "Effect view" });
    const panelBounds = await page.locator(".left-instrument-stack").boundingBox();
    const selectorBounds = await selector.boundingBox();
    expect(selectorBounds!.y).toBeGreaterThan(panelBounds!.y + panelBounds!.height);
    await page.getByRole("tab", { name: "FALLOUT", exact: true }).click();
    await page.clock.runFor(1_800);
    await expect(page.locator("main.simulator")).toHaveAttribute("data-effect-view", "fallout");
    await page.getByRole("tab", { name: "BLAST", exact: true }).click();
    await expect(page.locator("main.simulator")).toHaveAttribute("data-effect-view", "blast");
  });
});

test.describe("prototype capture composition", () => {
  // The reference's 2208×1276 output includes about 1.7 physical pixels per CSS
  // pixel. This separate fixture compares composition without resizing the UI.
  test.use({ viewport: { width: 1299, height: 751 }, deviceScaleFactor: 1.7 });

  test("shows the pitched Fat Man plume at the prototype's approximate CSS viewport and DPR", async ({ page }, testInfo) => {
    await page.mouse.move(1100, 560); await page.mouse.down({ button: "right" });
    await page.mouse.move(1100, 470, { steps: 10 }); await page.mouse.up({ button: "right" });
    await page.clock.runFor(100);
    await testInfo.attach("fallout-reference-camera.json", {
      body: JSON.stringify({ viewport: { width: 1299, height: 751 }, deviceScaleFactor: 1.7,
        pitchDegrees: await page.locator("main.simulator").getAttribute("data-pitch") }), contentType: "application/json",
    });
    await page.mouse.click(650, 420); await page.clock.runFor(11_300);
    await page.getByRole("tab", { name: "FALLOUT", exact: true }).click();
    await page.clock.runFor(1_800);
    await expect(page.locator(".fallout-marker")).toHaveCount(4);
    await page.screenshot({ path: testInfo.outputPath("plan-12-fallout-prototype-composition.png") });
    await expect(page).toHaveScreenshot("plan-12-fallout-prototype-composition.png", { threshold: 0.05, maxDiffPixelRatio: 0.008 });
  });
});
