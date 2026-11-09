/** R-15–R-18: fixed local tiles exercise actual focus-bound browsing, stale loads, mobile exclusion, and preview budgets. */
import { expect, test, type Page } from "@playwright/test";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import path from "node:path";

const TILE = path.resolve("tests/fixtures/satellite-tile.png");
const preview = (page: Page) => page.locator(".selection-preview");
const weapon = (page: Page) => page.getByRole("combobox", { name: "Weapon or delivery system" });

async function start(page: Page) {
  await page.route("**/MapServer/tile/**", (route) => route.fulfill({ path: TILE, contentType: "image/png" }));
  await page.goto("/");
  await expect(page.locator("main.simulator")).toHaveAttribute("data-map-state", "ready");
}

test.beforeEach(async ({ page }) => { await start(page); });

test("keyboard browsing previews independently, selection closes, and every focus loss dismisses", async ({ page }) => {
  const select = weapon(page);
  await select.focus(); await expect(preview(page)).toHaveCount(0);
  await select.press("Enter"); await expect(page.getByRole("listbox")).toBeVisible(); await expect(preview(page)).toHaveCount(0);
  await select.press("ArrowDown");
  await expect(preview(page)).toHaveAttribute("data-candidate-id", "rds-1");
  await expect(select).toHaveValue("fat-man"); await expect(select).toBeFocused();
  await select.press("Tab"); await expect(preview(page)).toHaveCount(0);
  await select.focus(); await expect(preview(page)).toHaveCount(0);
  await select.press("ArrowDown"); await expect(preview(page)).toBeVisible();
  await select.press("Shift+Tab"); await expect(preview(page)).toHaveCount(0);
  await select.focus(); await select.press("End");
  await expect(preview(page)).toHaveAttribute("data-candidate-id", "earth-spanning");
  await select.press("Enter"); await expect(select).toHaveValue("earth-spanning"); await expect(preview(page)).toHaveCount(0);
  await select.press("ArrowUp"); await expect(preview(page)).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(preview(page)).toHaveCount(0);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(preview(page)).toHaveCount(0);
});

test("pointer and wheel browsing follow highlighted options and outside dismissal never launches", async ({ page }) => {
  const select = weapon(page); await select.click();
  const list = page.getByRole("listbox", { name: "Weapon options" }); await expect(list).toBeVisible();
  const littleBoy = list.getByRole("option", { name: "Little Boy · 15 kt", exact: true });
  await littleBoy.hover(); await expect(preview(page)).toHaveAttribute("data-candidate-id", "little-boy");
  await expect(preview(page).locator(".preview-facts")).toContainText("COUNTRY OF ORIGIN"); await expect(select).toHaveValue("fat-man");
  await page.mouse.wheel(0, 180);
  await expect(preview(page)).toBeVisible();
  await expect(select).toBeFocused();
  await page.mouse.click(1500, 800);
  await expect(preview(page)).toHaveCount(0);
  await expect(page.locator("main.simulator")).toHaveAttribute("data-launch-count", "0");
  await select.click(); await littleBoy.hover(); await littleBoy.click();
  await expect(select).toHaveValue("little-boy"); await expect(preview(page)).toHaveCount(0);
  await select.click(); await littleBoy.hover();
  await page.mouse.move(1500, 800); await page.mouse.down(); await page.mouse.move(1570, 800); await page.mouse.up();
  await page.getByRole("button", { name: "Night mode" }).click();
  await expect(page.getByRole("button", { name: "Night mode" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("main.simulator")).toHaveAttribute("data-launch-count", "0");
});

test("stationary repeated wheel scrolling keeps its active candidate on a visible row without snapping", async ({ page }) => {
  const select = weapon(page); await select.click();
  const list = page.getByRole("listbox", { name: "Weapon options" });
  const bounds = await list.boundingBox();
  await page.mouse.move(bounds!.x + 120, bounds!.y + Math.min(180, bounds!.height / 2));
  let previousTop = await list.evaluate((element) => element.scrollTop);
  for (let index = 0; index < 10; index += 1) {
    const maximum = await list.evaluate((element) => element.scrollHeight - element.clientHeight);
    await page.mouse.wheel(0, 160);
    if (previousTop < maximum) await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBeGreaterThan(previousTop);
    const top = await list.evaluate((element) => element.scrollTop);
    expect(top).toBeGreaterThanOrEqual(previousTop);
    await expect.poll(() => list.locator('[role="option"][aria-selected="true"]').evaluate((element) => {
      const row = element.getBoundingClientRect(); const viewport = element.closest('[role="listbox"]')!.getBoundingClientRect();
      return row.bottom > viewport.top && row.top < viewport.bottom;
    })).toBe(true);
    const active = await list.locator('[role="option"][aria-selected="true"]').getAttribute("data-option-id");
    await expect(preview(page)).toHaveAttribute("data-candidate-id", active!);
    previousTop = top;
  }
  await expect(select).toBeFocused();
  await select.press("Home"); await expect(list.getByRole("option", { name: "Custom yield…", exact: true })).toBeInViewport();
  await select.press("End"); await expect(list.getByRole("option", { name: "1 Pt Earth-span stress test · 1 Pt", exact: true })).toBeInViewport();
});

test("weapon dossier ends after its researched exterior facts", async ({ page }) => {
  const select = weapon(page); await select.click();
  await page.getByRole("listbox").getByRole("option", { name: "Fat Man · 21 kt", exact: true }).hover();
  await expect(preview(page)).toHaveAttribute("data-candidate-id", "fat-man");
  await expect(preview(page).locator(".preview-outline")).toHaveAttribute("data-image-state", "loaded");
  await expect(preview(page)).toContainText("TOTAL MASS"); await expect(preview(page)).toContainText("COUNTRY OF ORIGIN");
  await expect(preview(page).locator(".preview-power, .preview-note, .preview-sources, footer, sup")).toHaveCount(0);
  await expect(preview(page).getByRole("meter")).toHaveCount(0);
  expect(await preview(page).locator("#selection-preview-description").evaluate((element) => element.lastElementChild?.className)).toBe("preview-facts");
  await expect(page).toHaveScreenshot("plan-18-weapon-preview.png", { maxDiffPixelRatio: 0.01 });
  await expect(preview(page)).toHaveScreenshot("plan-18-weapon-dossier.png", { maxDiffPixelRatio: 0.01 });
  await select.press("Escape"); await expect(preview(page)).toHaveCount(0);
});

test("scenario image and dark event text follow the candidate without moving camera", async ({ page }) => {
  const map = page.locator("main.simulator"); const before = await map.getAttribute("data-center-longitude");
  await page.getByRole("tab", { name: "SCENARIO", exact: true }).click();
  const select = page.getByRole("combobox", { name: "Scenario", exact: true });
  await select.focus(); await select.press("ArrowDown");
  await expect(preview(page)).toHaveAttribute("data-candidate-id", "hiroshima");
  await expect(preview(page).locator(".preview-event-copy")).not.toBeEmpty();
  await expect(preview(page)).toContainText("AI-GENERATED ILLUSTRATION");
  await expect(map).toHaveAttribute("data-center-longitude", before!);
  await expect(select).toHaveValue("");
  await expect(preview(page).locator(".preview-scenario-image")).toHaveAttribute("data-image-state", "loaded");
  await expect(page).toHaveScreenshot("plan-18-scenario-preview.png", { maxDiffPixelRatio: 0.01 });
  await expect(preview(page)).toHaveScreenshot("plan-18-scenario-card.png", { maxDiffPixelRatio: 0.01 });
  await select.press("Tab"); await expect(preview(page)).toHaveCount(0);
  await expect(map).toHaveAttribute("data-launch-count", "0");
});

test("all payload categories and custom input end with facts without comparison or under-sections", async ({ page }) => {
  const select = weapon(page);
  for (const id of ["mk-82", "rs-24-yars", "city-breaker"]) {
    await select.selectOption(id); await select.focus(); await select.press("Enter");
    await page.getByRole("listbox").getByRole("option").filter({ hasText: id === "mk-82" ? "Mk 82 (Tritonal)" : id === "rs-24-yars" ? "RS-24 Yars" : "100 Mt scale study" }).hover();
    await expect(preview(page)).toHaveAttribute("data-candidate-id", id);
    await expect(preview(page).locator(".preview-facts")).toContainText("COUNTRY OF ORIGIN");
    await expect(preview(page).locator(".preview-power, .preview-note, .preview-sources, footer, sup")).toHaveCount(0);
    expect(await preview(page).locator("#selection-preview-description").evaluate((element) => element.lastElementChild?.className)).toBe("preview-facts");
    await select.press("Escape");
  }
  await select.selectOption("custom"); const custom = page.getByRole("textbox", { name: "Custom yield in megatons" }); await custom.fill("invalid");
  await expect(custom).toHaveAttribute("aria-invalid", "true");
  await select.focus(); await select.press("Home");
  await expect(preview(page)).toHaveAttribute("data-candidate-id", "custom");
  await expect(preview(page)).toContainText("Not applicable — simulation input");
  await expect(preview(page).locator(".preview-power, .preview-note, .preview-sources, footer, sup")).toHaveCount(0);
});

test("all 52 silhouettes paint through the real image cache and remain available after eviction", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const select = weapon(page);
  const ids = await select.locator("option").evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value).filter((id) => id !== "custom"));
  expect(ids).toHaveLength(52);
  await select.focus(); await select.press("Home");
  const rendered: Array<{ id: string; width: number; height: number; ink: number }> = [];
  for (const id of ids) {
    await select.press("ArrowDown"); await expect(preview(page)).toHaveAttribute("data-candidate-id", id);
    await expect(preview(page).locator(".preview-outline")).toHaveAttribute("data-image-state", "loaded");
    const pixels = await preview(page).locator(".preview-outline img").evaluate((image) => {
      const element = image as HTMLImageElement; const canvas = document.createElement("canvas");
      canvas.width = element.naturalWidth; canvas.height = element.naturalHeight;
      const context = canvas.getContext("2d")!; context.drawImage(element, 0, 0);
      const data = context.getImageData(0, 0, canvas.width, canvas.height).data; let ink = 0;
      for (let offset = 3; offset < data.length; offset += 4) if (data[offset]! > 0) ink += 1;
      return { width: element.naturalWidth, height: element.naturalHeight, ink };
    });
    expect(pixels.width).toBe(960); expect(pixels.height).toBe(320);
    // More than 100 painted pixels rules out a decoded but blank/clipped SVG, independently of outline styling.
    expect(pixels.ink).toBeGreaterThan(100); rendered.push({ id, ...pixels });
  }
  await select.press("Home"); for (let index = 0; index <= ids.indexOf("w54"); index += 1) await select.press("ArrowDown");
  await expect(preview(page)).toHaveAttribute("data-candidate-id", "w54");
  await expect(preview(page).locator(".preview-outline")).toHaveAttribute("data-image-state", "loaded");
  await expect(preview(page)).toContainText("M388"); await expect(preview(page)).toContainText("34.5 kg"); await expect(preview(page)).toContainText("23.1 kg W54 warhead");
  await expect(preview(page)).toHaveScreenshot("plan-18-davy-crockett-dossier.png", { maxDiffPixelRatio: .01 });
  await testInfo.attach("all-silhouettes-rendered", { body: JSON.stringify(rendered, null, 2), contentType: "application/json" });
  await select.press("Tab"); await expect(page.locator(".selection-preview-viewport")).toHaveCount(0);
});

test("fast browsing, delayed decodes, and reopening cannot strand Davy Crockett on an old image URL", async ({ page }) => {
  let release!: () => void; const held = new Promise<void>((resolve) => { release = resolve; }); let first = true;
  await page.route("**/media/devices/w54.svg", async (route) => {
    if (first) { first = false; await held; }
    await route.fulfill({ path: path.resolve("public/media/devices/w54.svg"), contentType: "image/svg+xml" }).catch(() => {});
  });
  const select = weapon(page); await select.selectOption("w54"); await select.focus(); await select.press("Enter");
  await select.press("ArrowUp"); await select.press("ArrowDown");
  await expect(preview(page)).toHaveAttribute("data-candidate-id", "w54");
  await expect(preview(page).locator(".preview-outline")).toHaveAttribute("data-image-state", "loading");
  for (let index = 0; index < 8; index += 1) await select.press("ArrowDown");
  for (let index = 0; index < 8; index += 1) await select.press("ArrowUp");
  await expect(preview(page)).toHaveAttribute("data-candidate-id", "w54");
  await expect(preview(page).locator(".preview-outline")).toHaveAttribute("data-image-state", "loaded");
  release(); await select.press("Escape");
  await select.focus(); await select.press("Enter"); await select.press("ArrowUp"); await select.press("ArrowDown");
  await expect(preview(page)).toHaveAttribute("data-candidate-id", "w54");
  await expect(preview(page).locator(".preview-outline")).toHaveAttribute("data-image-state", "loaded");
  expect(await preview(page).locator(".preview-outline img").evaluate((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0)).toBe(true);
});

test("late or failed artwork never restores a blurred panel and text remains readable", async ({ page }) => {
  let release!: () => void; const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/media/scenarios/hiroshima.webp", async (route) => { await held; await route.fulfill({ path: TILE, contentType: "image/png" }).catch(() => {}); });
  await page.getByRole("tab", { name: "SCENARIO", exact: true }).click();
  const select = page.getByRole("combobox", { name: "Scenario", exact: true });
  await select.focus(); await select.press("ArrowDown"); await expect(preview(page).locator(".preview-event-copy")).not.toBeEmpty();
  await expect(preview(page).locator(".preview-scenario-image")).toHaveAttribute("data-image-state", "loading");
  await select.press("Tab"); release(); await expect(preview(page)).toHaveCount(0);
  await page.unroute("**/media/scenarios/hiroshima.webp");
  await page.route("**/media/scenarios/hiroshima.webp", (route) => route.fulfill({ status: 404, body: "fixture missing image" }));
  await select.focus(); await select.press("ArrowDown");
  await expect(preview(page).locator(".preview-scenario-image")).toHaveAttribute("data-image-state", "error");
  await expect(preview(page).locator(".preview-event-copy")).not.toBeEmpty();
  await select.press("Enter"); await expect(select).toHaveValue("hiroshima"); await expect(preview(page)).toHaveCount(0);
});

test("closed initial load and mobile selectors request no preview code, data, or artwork", async ({ page, browser }) => {
  const requests: string[] = []; page.on("request", (request) => requests.push(request.url()));
  await page.reload(); await weapon(page).focus();
  expect(requests.filter((url) => /SelectionPreviewOverlay|\/media\//.test(url))).toEqual([]);
  for (const viewport of [{ width: 390, height: 844 }, { width: 600, height: 800 }, { width: 844, height: 390 }]) {
    const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true }); const phone = await context.newPage(); const mobileRequests: string[] = [];
    phone.on("request", (request) => mobileRequests.push(request.url())); await start(phone);
    await weapon(phone).selectOption("moab"); await expect(weapon(phone)).toHaveValue("moab");
    await expect(phone.getByRole("listbox")).toHaveCount(0); await expect(preview(phone)).toHaveCount(0);
    expect(mobileRequests.filter((url) => /SelectionPreviewOverlay|\/media\//.test(url))).toEqual([]); await context.close();
  }
});

test("resize cancels a desktop preview and 601px fine-pointer layout keeps chooser unobstructed", async ({ page }) => {
  const select = weapon(page); await select.focus(); await select.press("ArrowDown"); await expect(preview(page)).toBeVisible();
  await page.setViewportSize({ width: 600, height: 900 }); await expect(preview(page)).toHaveCount(0);
  await expect(select).not.toHaveAttribute("aria-expanded");
  await page.setViewportSize({ width: 601, height: 1100 }); await expect(select).toHaveAttribute("aria-expanded", "false"); await select.focus(); await select.press("ArrowDown");
  await expect(preview(page)).toBeVisible();
  const panelBounds = await preview(page).boundingBox(); const listBounds = await page.getByRole("listbox").boundingBox();
  expect(panelBounds!.y).toBeGreaterThan(listBounds!.y + listBounds!.height);
  expect(panelBounds!.x).toBeGreaterThanOrEqual(0);
  expect(panelBounds!.x + panelBounds!.width).toBeLessThanOrEqual(601);
});

test("a preview owns its scrolling viewport only during focused browsing", async ({ page }) => {
  const select = weapon(page); const viewport = page.locator(".selection-preview-viewport");
  const bodyStyle = await page.locator("body").getAttribute("style");
  await select.focus(); await expect(viewport).toHaveCount(0);
  await select.press("Enter"); await expect(viewport).toHaveCount(0);
  await select.press("ArrowDown"); await expect(viewport).toHaveCount(1);
  expect(await viewport.evaluate((element) => getComputedStyle(element).overflowY)).toBe("auto");
  expect(await preview(page).locator("#selection-preview-description").evaluate((element) => getComputedStyle(element).overflowY)).toBe("visible");
  await select.press("Tab"); await expect(viewport).toHaveCount(0);
  expect(await page.locator("body").getAttribute("style")).toBe(bodyStyle);
  await select.focus(); await select.press("ArrowDown"); await expect(viewport).toHaveCount(1);
  await select.press("Escape"); await expect(viewport).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
});

test("warm candidate response and production transfer sizes respect preview budgets", async ({ page }, testInfo) => {
  const baseline = JSON.parse(readFileSync("tests/fixtures/preview-performance-baseline.json", "utf8"));
  const index = readdirSync("dist/assets").find((file) => /^index-.*\.js$/.test(file))!;
  const initialBytes = gzipSync(readFileSync(`dist/assets/${index}`)).length;
  expect(initialBytes - baseline.initialJavaScriptGzipBytes).toBeLessThanOrEqual(baseline.maximumIncreaseBytes);
  const allAssets = ["devices", "scenarios"].flatMap((folder) => readdirSync(`public/media/${folder}`).map((file) => ({ folder, bytes: statSync(`public/media/${folder}/${file}`).size })));
  expect(allAssets.reduce((sum, asset) => sum + asset.bytes, 0)).toBeLessThanOrEqual(baseline.maximumArtworkBytes);
  for (const asset of allAssets) expect(asset.bytes).toBeLessThanOrEqual(asset.folder === "devices" ? baseline.maximumOutlineBytes : baseline.maximumScenarioImageBytes);
  const select = weapon(page); await select.focus(); await select.press("ArrowDown"); await expect(preview(page)).toBeVisible();
  await page.evaluate(() => {
    const state = window as unknown as { previewLongTasks: number[]; previewTaskObserver: PerformanceObserver };
    state.previewLongTasks = [];
    state.previewTaskObserver = new PerformanceObserver((list) => state.previewLongTasks.push(...list.getEntries().map((entry) => entry.duration)));
    state.previewTaskObserver.observe({ type: "longtask", buffered: false });
  });
  const samples: number[] = [];
  for (let index = 0; index < 20; index += 1) {
    const elapsed = await page.evaluate(async () => {
      const control = document.querySelector<HTMLSelectElement>('select[aria-label="Weapon or delivery system"]')!;
      const start = performance.now(); const old = document.querySelector(".selection-preview")?.getAttribute("data-candidate-id");
      control.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
      await new Promise<void>((resolve) => { const check = () => document.querySelector(".selection-preview")?.getAttribute("data-candidate-id") !== old ? resolve() : requestAnimationFrame(check); requestAnimationFrame(check); });
      return performance.now() - start;
    });
    samples.push(elapsed);
  }
  samples.sort((a, b) => a - b); const p95 = samples[Math.ceil(samples.length * .95) - 1]!;
  // 100ms is the plan's warm candidate-to-panel p95 budget, sampled over 20 genuine DOM key events.
  expect(p95).toBeLessThanOrEqual(100);
  const longTasks = await page.evaluate(() => {
    const state = window as unknown as { previewLongTasks: number[]; previewTaskObserver: PerformanceObserver };
    state.previewTaskObserver.disconnect(); return state.previewLongTasks;
  });
  expect(longTasks.filter((duration) => duration > 50)).toEqual([]);
  await select.press("Escape");
  const launch = page.getByRole("button", { name: "Launch at map center" });
  await launch.focus(); await launch.press("Enter");
  const closedPickerFrameDurations = await page.evaluate(async () => {
    const intervals: number[] = [];
    // Both endpoints use the rAF timeline; performance.now() can be later than a queued frame timestamp.
    let previous = await new Promise<number>((resolve) => requestAnimationFrame(resolve));
    for (let index = 0; index < 60; index += 1) await new Promise<void>((resolve) => requestAnimationFrame((now) => { intervals.push(now - previous); previous = now; resolve(); }));
    return intervals;
  });
  expect(closedPickerFrameDurations).toHaveLength(60);
  expect(closedPickerFrameDurations.every((duration) => Number.isFinite(duration) && duration >= 0)).toBe(true);
  const evidence = { browser: testInfo.project.name || "pinned Playwright Chromium", viewport: testInfo.project.use.viewport, baselineInitialGzipBytes: baseline.initialJavaScriptGzipBytes, initialGzipBytes: initialBytes, initialGzipDeltaBytes: initialBytes - baseline.initialJavaScriptGzipBytes, artworkTotalBytes: allAssets.reduce((sum, asset) => sum + asset.bytes, 0), artwork: allAssets, candidateSamplesMs: samples, candidateP95Ms: p95, previewLongTasksMs: longTasks, launchWithPickerClosedFrameIntervalsMs: closedPickerFrameDurations, cacheBounds: { images: 2, decodedBytes: 16 * 1024 * 1024, verification: "tests/integration/preview-image-cache.test.ts" } };
  const evidencePath = testInfo.outputPath("plan-18-performance.json");
  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
  await testInfo.attach("plan-18-performance", { path: evidencePath, contentType: "application/json" });
  console.log(`Plan 18 warm candidate p95: ${p95.toFixed(1)}ms; initial gzip delta ${initialBytes - baseline.initialJavaScriptGzipBytes}B`);
});
