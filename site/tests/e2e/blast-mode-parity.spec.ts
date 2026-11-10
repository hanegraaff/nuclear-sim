/** V-03/V-04/M-06: fixed tiles and paused time compare the actual field canvas, excluding separate inspection/legend art. */
import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { writeFileSync } from "node:fs";

test.use({ viewport: { width: 1508, height: 1080 }, deviceScaleFactor: 1 });
const evidence: Record<string, unknown> = {};
test.beforeEach(async ({ page }) => {
  await page.route("**/MapServer/tile/**", (route) => route.fulfill({ path: path.resolve("tests/fixtures/satellite-tile.png"), contentType: "image/png" }));
  await page.goto("/"); await expect(page.locator("main.simulator")).toHaveAttribute("data-map-state", "ready");
  await page.clock.install(); await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10_000);
});

/** Hash the entire transparent Canvas, plus representative eastward radial band samples, at one paused age. */
async function field(page: Page, x = 1050, y = 700) {
  return page.locator(".blast-canvas").evaluate((element, center) => {
    const canvas = element as HTMLCanvasElement, context = canvas.getContext("2d")!;
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let hash = 2166136261;
    for (const byte of data) hash = Math.imul(hash ^ byte, 16777619) >>> 0;
    return { hash, bands: [0, 10, 20, 30, 40, 50, 65, 80, 100, 120].map((dx) => ({ dx, rgba: [...context.getImageData(center.x + dx, center.y, 1, 1).data] })) };
  }, { x, y });
}

/** Toggle without advancing the fake clock; age and geographic camera are identical in both renders. */
async function toggle(page: Page, enabled: boolean) {
  await page.getByRole("button", { name: `Multi-Launch Mode ${enabled ? "OFF" : "ON"}` }).click();
  await expect(page.locator("main.simulator")).toHaveAttribute("data-multi-launch", String(enabled));
}

test("a frozen strike retains identical canvas RGBA through launch, impact, expansion, settled, and repeated mode switches", async ({ page }, testInfo) => {
  await page.mouse.click(1050, 700);
  let age = 0;
  for (const [name, targetAge] of [["launch", 3000], ["impact", 6620], ["expansion", 8200], ["settled", 11300]] as const) {
    await page.clock.runFor(targetAge - age); age = targetAge;
    const single = await field(page);
    await page.screenshot({ path: testInfo.outputPath(`plan-19-${name}-single.png`) });
    await toggle(page, true); const multi = await field(page);
    expect(multi).toEqual(single);
    await page.screenshot({ path: testInfo.outputPath(`plan-19-${name}-multi.png`) });
    await toggle(page, false); expect(await field(page)).toEqual(single);
    evidence[name] = { ageMs: targetAge, single, multi };
  }
  for (let count = 0; count < 5; count++) { const before = await field(page); await toggle(page, true); expect(await field(page)).toEqual(before); await toggle(page, false); expect(await field(page)).toEqual(before); }
  // Camera changes invalidate both caches, while both modes still share exactly the same one-field path.
  await page.getByRole("button", { name: "Zoom in" }).click(); await page.clock.runFor(500);
  const zoomed = await field(page); await toggle(page, true); expect(await field(page)).toEqual(zoomed); await toggle(page, false);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.clock.runFor(100);
  await expect(page.locator(".blast-canvas")).toHaveAttribute("width", "1280");
  const resized = await field(page, 1000, 650); await toggle(page, true); expect(await field(page, 1000, 650)).toEqual(resized);
  await page.getByRole("button", { name: "Reset map" }).click();
  expect((await field(page, 1000, 650)).bands.every((band) => band.rgba[3] === 0)).toBe(true);
  writeFileSync(testInfo.outputPath("plan-19-mode-rgba.json"), `${JSON.stringify(evidence, null, 2)}\n`);
});

test("isolated parts of two separated fields retain the single colors while their shared edge warms", async ({ page }, testInfo) => {
  await page.mouse.click(950, 700); await page.clock.fastForward(11200); await page.clock.runFor(100);
  const single = await field(page, 950, 700);
  await toggle(page, true);
  await page.mouse.click(1350, 700); await page.clock.fastForward(11200); await page.clock.runFor(100);
  const separated = await field(page, 950, 700);
  // The multi raster has a different bounded sampling cap. At smooth band samples,
  // 4 byte values allow subpixel interpolation, without permitting systematic dimming.
  for (const index of [4, 5, 6, 7, 8, 9]) {
    single.bands[index]!.rgba.forEach((value, channel) => expect(Math.abs(value - separated.bands[index]!.rgba[channel]!)).toBeLessThanOrEqual(4));
  }
  await page.screenshot({ path: testInfo.outputPath("plan-19-separated.png") });
  await page.getByRole("button", { name: "Reset map" }).click();
  await page.mouse.click(950, 700); await page.clock.fastForward(11200); await page.clock.runFor(100);
  const alone = await field(page, 950, 700);
  await page.mouse.click(1050, 700); await page.clock.fastForward(11200); await page.clock.runFor(100);
  const overlap = await field(page, 950, 700);
  const isolated = alone.bands[7]!.rgba, warmer = overlap.bands[7]!.rgba;
  expect(warmer[0]! - warmer[2]!).toBeGreaterThan(isolated[0]! - isolated[2]!);
  expect(warmer[3]).toBeGreaterThanOrEqual(isolated[3]!);
  await page.screenshot({ path: testInfo.outputPath("plan-19-overlap.png") });
});
