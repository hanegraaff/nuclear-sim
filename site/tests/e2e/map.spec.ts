/** Plan 01 hosted-path smoke checks use a synthetic tile so network imagery cannot cause flakes. */
import { expect, test } from "@playwright/test";
import path from "node:path";

const TILE_PATTERN = "**/ArcGIS/rest/services/World_Imagery/MapServer/tile/**";
const TILE_PATH = path.resolve("tests/fixtures/satellite-tile.png");

test("the map fills the viewport and supports pan and zoom", async ({ page }, testInfo) => {
  let tileRequests = 0;
  await page.route(TILE_PATTERN, (route) => {
    tileRequests += 1;
    return route.fulfill({ path: TILE_PATH, contentType: "image/png" });
  });
  await page.goto("/");
  const simulator = page.getByRole("main", { name: "Satellite map for Nuke Simulator" });
  await expect(simulator).toHaveAttribute("data-map-state", "ready");
  await expect(simulator).toHaveAttribute("data-center-longitude", "-73.985700");
  await expect(simulator).toHaveAttribute("data-center-latitude", "40.748400");
  await expect(simulator).toHaveAttribute("data-zoom", "10.600");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  expect(await simulator.boundingBox()).toMatchObject({ x: 0, y: 0, width: 2208, height: 1276 });
  await expect(page.getByText("Esri", { exact: false })).toBeVisible();
  expect(tileRequests).toBeGreaterThan(0);
  await expect(page).toHaveScreenshot("plan-02-map-and-device-panel.png", { maxDiffPixelRatio: 0.01 });
  await page.screenshot({ path: testInfo.outputPath("plan-02-map-and-device-panel.png"), fullPage: true });

  const initialZoom = Number(await simulator.getAttribute("data-zoom"));
  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect.poll(async () => Number(await simulator.getAttribute("data-zoom"))).toBeGreaterThan(initialZoom);

  const initialLongitude = await simulator.getAttribute("data-center-longitude");
  await page.mouse.move(900, 450);
  await page.mouse.down();
  await page.mouse.move(1050, 450, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => simulator.getAttribute("data-center-longitude")).not.toBe(initialLongitude);
  await page.screenshot({ path: testInfo.outputPath("plan-01-map-interaction.png"), fullPage: true });
});

test("failed satellite tiles show an imagery-specific retry control", async ({ page }) => {
  await page.route(TILE_PATTERN, (route) => route.abort());
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("Satellite imagery is unavailable.");
  await expect(page.getByRole("button", { name: "Retry map" })).toBeVisible();
});

test("a later successful tile clears a transient imagery failure", async ({ page }) => {
  let failTiles = true;
  await page.route(TILE_PATTERN, (route) => failTiles
    ? route.abort()
    : route.fulfill({ path: TILE_PATH, contentType: "image/png" }));
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("Satellite imagery is unavailable.");

  failTiles = false;
  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("main", { name: "Satellite map for Nuke Simulator" }))
    .toHaveAttribute("data-map-state", "ready");
});
