/** R-13: fixed-tile, fake-time phone journeys keep controls and map usable together. */
import { expect, test, type Locator, type Page } from "@playwright/test";
import path from "node:path";

test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
test.setTimeout(90_000);
test.beforeEach(async ({ page }) => {
  // A local tile and frozen clock make imagery and animation independent of the network and wall clock.
  await page.route("**/ArcGIS/rest/services/World_Imagery/MapServer/tile/**", (route) => route.fulfill({ path: path.resolve("tests/fixtures/satellite-tile.png"), contentType: "image/png" }));
  await page.goto("/");
  await expect(page.locator("main.simulator")).toHaveAttribute("data-map-state", "ready");
  await page.clock.install();
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10_000);
});

/** Assert an interactive element fits inside the phone viewport. */
async function fits(page: Page, locator: Locator) {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
}

test("selects, launches, inspects each effect and retains multi strikes with panels shown", async ({ page }, info) => {
  const sim = page.locator("main.simulator");
  const panel = page.locator(".left-instrument-stack");
  await expect(page.locator(".cloud-monitor")).toBeHidden();
  const select = page.getByRole("combobox", { name: "Weapon or delivery system" });
  await select.selectOption("b61");
  await page.screenshot({ path: info.outputPath("phone-controls.png") });
  const panelBox = (await panel.boundingBox())!;
  expect(panelBox.y + panelBox.height).toBeLessThan(600);
  await page.mouse.click(340, 600);
  await expect(sim).toHaveAttribute("data-launch-phase", "inbound");
  await page.screenshot({ path: info.outputPath("phone-launch.png") });
  await page.clock.runFor(6_550);
  await page.screenshot({ path: info.outputPath("phone-impact.png") });
  await page.clock.runFor(850);
  await page.screenshot({ path: info.outputPath("phone-expansion.png") });
  await page.clock.runFor(4_000);
  await expect(sim).toHaveAttribute("data-launch-phase", "complete");
  await page.screenshot({ path: info.outputPath("phone-blast.png") });
  const selector = page.getByRole("tablist", { name: "Effect view" });
  await fits(page, selector);
  const zoom = (await page.getByRole("button", { name: "Zoom in", exact: true }).boundingBox())!;
  const tabs = (await selector.boundingBox())!;
  expect(tabs.x + tabs.width).toBeLessThanOrEqual(zoom.x);
  for (const view of ["FALLOUT", "AUDIBLE", "VISIBLE", "BLAST"]) {
    await page.getByRole("tab", { name: view, exact: true }).click();
    await page.clock.runFor(1_800);
    await expect(sim).toHaveAttribute("data-effect-view", view.toLowerCase());
    await page.screenshot({ path: info.outputPath(`phone-${view.toLowerCase()}.png`) });
  }
  const marker = page.getByRole("button", { name: /^LIGHT destruction/ });
  await marker.focus();
  await expect(page.getByRole("tooltip")).toContainText("LIGHT DESTRUCTION");
  await fits(page, page.getByRole("tooltip"));
  const tooltip = (await page.getByRole("tooltip").boundingBox())!;
  expect(tooltip.y + tooltip.height).toBeLessThanOrEqual(tabs.y);
  await page.screenshot({ path: info.outputPath("phone-tooltip.png") });
  await marker.press("Escape");
  await page.getByRole("button", { name: "Multi-Launch Mode OFF" }).click();
  await page.mouse.click(340, 560); await page.clock.runFor(11_300);
  await expect(sim).toHaveAttribute("data-launch-count", "2");
  await fits(page, page.getByRole("complementary", { name: "Combined strike map and effect scales" }));
  await page.getByRole("button", { name: "Hide control and cloud panels" }).click();
  await page.getByRole("button", { name: "Show control and cloud panels" }).click();
  await expect(sim).toHaveAttribute("data-launch-count", "2");
  await page.getByRole("button", { name: "Reset map" }).click();
  await expect(sim).toHaveAttribute("data-launch-count", "0");
});

test("keeps the smallest phone controls and launchable map in view", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.clock.runFor(300); // Let MapLibre process the viewport resize before its next click.
  const panel = page.locator(".left-instrument-stack");
  await expect(page.locator(".cloud-monitor")).toBeHidden();
  await fits(page, panel);
  for (const name of ["Night mode", "Hide control and cloud panels", "Multi-Launch Mode OFF"]) await fits(page, page.getByRole("button", { name }));
  await fits(page, page.getByRole("combobox", { name: "Weapon or delivery system" }));
  const bottom = (await panel.boundingBox())!.y + (await panel.boundingBox())!.height;
  expect(bottom).toBeLessThan(450);
  await page.mouse.click(280, 300);
  await expect(page.locator("main.simulator")).toHaveAttribute("data-launch-count", "1");
  await page.clock.runFor(11_300);
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toContainText("FIREBALL DESTRUCTION");
  const popup = (await tooltip.boundingBox())!;
  const controls = (await panel.boundingBox())!;
  expect(popup.y).toBeGreaterThanOrEqual(controls.y + controls.height);
  const selector = page.getByRole("tablist", { name: "Effect view" });
  await fits(page, selector);
  expect(popup.y + popup.height).toBeLessThanOrEqual((await selector.boundingBox())!.y);
  await page.getByRole("tab", { name: "VISIBLE", exact: true }).click();
  await page.clock.runFor(1_800);
  const attribution = page.locator(".maplibregl-ctrl-attrib");
  if (!(await attribution.evaluate((element) => element.classList.contains("maplibregl-compact-show")))) await attribution.locator("summary").click();
  const attributionBox = (await attribution.boundingBox())!;
  const selectorBox = (await selector.boundingBox())!;
  const qualification = (await page.locator(".model-qualification").boundingBox())!;
  const navigation = (await page.getByRole("button", { name: "Zoom out", exact: true }).boundingBox())!;
  expect(selectorBox.y + selectorBox.height).toBeLessThanOrEqual(attributionBox.y);
  expect(qualification.y + qualification.height).toBeLessThanOrEqual(attributionBox.y);
  expect(selectorBox.y + selectorBox.height).toBeLessThanOrEqual(qualification.y);
  expect(qualification.x + qualification.width).toBeLessThanOrEqual(navigation.x);
  await page.getByRole("button", { name: "Multi-Launch Mode OFF" }).click();
  const distance = (await page.locator(".distance-scale-legend").boundingBox())!;
  const panelBottom = (await panel.boundingBox())!;
  expect(distance.y).toBeGreaterThanOrEqual(panelBottom.y + panelBottom.height);
  await page.setViewportSize({ width: 1104, height: 728 });
  await expect(page.locator(".cloud-monitor")).toBeVisible();
});
