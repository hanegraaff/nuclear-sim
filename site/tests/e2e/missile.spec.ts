/** Plan 04 browser paths use fixed tiles and a fake browser clock for an inspectable missile frame. */
import { expect, test } from "@playwright/test";
import path from "node:path";

const TILE_PATTERN = "**/ArcGIS/rest/services/World_Imagery/MapServer/tile/**";
const TILE_PATH = path.resolve("tests/fixtures/satellite-tile.png");

test.use({ viewport: { width: 1508, height: 1080 }, deviceScaleFactor: 1 });

test.beforeEach(async ({ page }) => {
  await page.route(TILE_PATTERN, (route) => route.fulfill({ path: TILE_PATH, contentType: "image/png" }));
  await page.goto("/");
  await expect(page.getByRole("main", { name: "Satellite map for Nuke Simulator" }))
    .toHaveAttribute("data-map-state", "ready");
});

test("a map click displays a geographic red target and an incoming missile at fixed time", async ({ page }, testInfo) => {
  const simulator = page.getByRole("main", { name: "Satellite map for Nuke Simulator" });
  await page.clock.install();
  await page.mouse.click(900, 650);
  await expect(simulator).toHaveAttribute("data-launch-phase", "inbound");
  await expect(simulator).toHaveAttribute("data-target-longitude", /-?[0-9]+\.[0-9]{6}/);
  await expect(page.locator(".missile-canvas")).toBeVisible();
  await expect(page.locator(".launch-status")).toHaveText("MISSILE INBOUND");
  await page.clock.runFor(3200);
  await expect.poll(async () => Number(await simulator.getAttribute("data-launch-elapsed"))).toBeGreaterThanOrEqual(3200);
  await page.screenshot({ path: testInfo.outputPath("plan-04-missile-3200ms.png") });
  await expect(page).toHaveScreenshot("plan-04-missile-3200ms.png", { maxDiffPixelRatio: 0.01 });
  await page.clock.runFor(3300);
  await expect(simulator).toHaveAttribute("data-launch-phase", "complete");
  await expect(page.locator(".launch-status")).toHaveText("TARGET REACHED");
});

test("controls do not launch, and a second click cancels the first inbound flight", async ({ page }) => {
  const simulator = page.getByRole("main", { name: "Satellite map for Nuke Simulator" });
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.getByRole("tab", { name: "SCENARIO" }).click();
  await page.getByRole("tab", { name: "DEVICE" }).click();
  await expect(simulator).toHaveAttribute("data-launch-phase", "armed");
  await page.clock.install();
  await page.mouse.click(900, 650);
  await expect(simulator).toHaveAttribute("data-launch-phase", "inbound");
  const firstTarget = await simulator.getAttribute("data-target-longitude");
  await page.clock.runFor(2000);
  await page.mouse.click(1050, 650);
  await expect(simulator).toHaveAttribute("data-launch-elapsed", "0");
  await expect.poll(() => simulator.getAttribute("data-target-longitude")).not.toBe(firstTarget);
  await page.clock.runFor(1000);
  await expect.poll(async () => Number(await simulator.getAttribute("data-launch-elapsed"))).toBeLessThan(1500);
});

test("panning moves both the target and the missile with the geographic map", async ({ page }) => {
  const canvas = page.locator(".missile-canvas");
  const simulator = page.getByRole("main", { name: "Satellite map for Nuke Simulator" });
  await page.clock.install();
  await page.mouse.click(900, 650);
  await page.clock.runFor(2500);
  const coloredCenters = async () => canvas.evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const pixels = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
    const totals = { redX: 0, redCount: 0, amberX: 0, amberCount: 0 };
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const index = (y * canvas.width + x) * 4;
        const [red, green, blue, alpha] = [pixels[index], pixels[index + 1], pixels[index + 2], pixels[index + 3]];
        if (alpha! < 120) continue;
        if (red! > 210 && green! < 145 && blue! < 150) { totals.redX += x; totals.redCount++; }
        if (red! > 210 && green! > 140 && green! < 235 && blue! < 130) { totals.amberX += x; totals.amberCount++; }
      }
    }
    return { targetX: totals.redX / totals.redCount, missileX: totals.amberX / totals.amberCount };
  });
  const before = await coloredCenters();
  const geographicTarget = await simulator.getAttribute("data-target-longitude");
  expect(Number.isFinite(before.targetX)).toBe(true);
  expect(Number.isFinite(before.missileX)).toBe(true);
  await page.mouse.move(760, 840);
  await page.mouse.down();
  await page.mouse.move(860, 840, { steps: 5 });
  await page.mouse.up();
  await page.clock.runFor(50);
  const after = await coloredCenters();
  expect(after.targetX - before.targetX).toBeGreaterThan(50);
  expect(after.missileX - before.missileX).toBeGreaterThan(30);
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.clock.runFor(400);
  expect(Number.isFinite((await coloredCenters()).targetX)).toBe(true);
  await expect(simulator).toHaveAttribute("data-target-longitude", geographicTarget!);
});

test("invalid custom yield cannot launch from a map click", async ({ page }) => {
  const simulator = page.getByRole("main", { name: "Satellite map for Nuke Simulator" });
  await page.getByRole("combobox", { name: "Weapon or delivery system" }).selectOption("custom");
  await page.getByRole("textbox", { name: "Custom yield in megatons" }).fill("0");
  await page.mouse.click(900, 650);
  await expect(simulator).toHaveAttribute("data-launch-phase", "armed");
  await expect(page.getByRole("alert")).toContainText("Enter a positive yield");
});
