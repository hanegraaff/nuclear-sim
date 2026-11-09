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
  await expect(preview(page)).toContainText("1 × Hiroshima"); await expect(select).toHaveValue("fat-man");
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

test("weapon dossier shows annotated exterior facts and a Hiroshima comparison", async ({ page }) => {
  const select = weapon(page); await select.click();
  await page.getByRole("listbox").getByRole("option", { name: "Fat Man · 21 kt", exact: true }).hover();
  await expect(preview(page)).toHaveAttribute("data-candidate-id", "fat-man");
  await expect(preview(page).locator(".preview-outline")).toHaveAttribute("data-image-state", "loaded");
  await expect(preview(page)).toContainText("TOTAL MASS"); await expect(preview(page)).toContainText("COUNTRY OF ORIGIN");
  await expect(preview(page)).toContainText("1.4 × Hiroshima");
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

test("all weapon categories and custom validation have informative previews", async ({ page }) => {
  const select = weapon(page);
  for (const [id, text] of [["mk-82", "(est)"], ["rs-24-yars", "per warhead"], ["city-breaker", "Hiroshima"]]) {
    await select.selectOption(id!); await select.focus(); await select.press("Enter");
    await page.getByRole("listbox").getByRole("option").filter({ hasText: id === "mk-82" ? "Mk 82 (Tritonal)" : id === "rs-24-yars" ? "RS-24 Yars" : "100 Mt scale study" }).hover();
    await expect(preview(page)).toHaveAttribute("data-candidate-id", id!); await expect(preview(page)).toContainText(text!);
    await select.press("Escape");
  }
  await select.selectOption("custom"); await page.getByRole("textbox", { name: "Custom yield in megatons" }).fill("invalid");
  await select.focus(); await select.press("Home");
  await expect(preview(page)).toHaveAttribute("data-candidate-id", "custom");
  await expect(preview(page)).toContainText("use a decimal point"); await expect(preview(page).getByRole("meter")).toHaveCount(0);
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

test("constrained panels expose their gauge and event ending through wheel and keyboard without losing dropdown focus", async ({ page }) => {
  for (const viewport of [{ width: 601, height: 768 }, { width: 1024, height: 600 }]) {
    await page.setViewportSize(viewport);
    await page.getByRole("tab", { name: "DEVICE", exact: true }).click();
    const select = weapon(page); await expect(select).toHaveAttribute("aria-expanded", "false");
    await select.selectOption("rsm-56-bulava"); await select.click();
    await page.getByRole("listbox").getByRole("option", { name: /RSM-56 Bulava/ }).hover();
    const details = preview(page).locator("#selection-preview-description");
    await expect(preview(page)).toHaveAttribute("data-candidate-id", "rsm-56-bulava");
    await expect(preview(page).locator("footer")).toContainText("SHIFT + PAGE");
    const candidate = await preview(page).getAttribute("data-candidate-id");
    for (let index = 0; index < 5; index += 1) await select.press("Shift+PageDown");
    await expect(select).toBeFocused(); await expect(preview(page)).toHaveAttribute("data-candidate-id", candidate!);
    expect(await details.evaluate((element) => Math.abs(element.scrollHeight - element.clientHeight - element.scrollTop))).toBeLessThanOrEqual(1);
    // At the bottom, all mandatory energy text and the end of supporting facts are reachable by keyboard.
    const gauge = await preview(page).locator(".preview-power").boundingBox(); const clip = await details.boundingBox();
    expect(gauge!.y).toBeGreaterThanOrEqual(clip!.y);
    expect(gauge!.y + gauge!.height).toBeLessThanOrEqual(clip!.y + clip!.height);
    expect(await details.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    await select.press("Shift+PageUp");
    const beforeWheel = await details.evaluate((element) => element.scrollTop);
    const detailsBounds = await details.boundingBox(); await page.mouse.move(detailsBounds!.x + 30, detailsBounds!.y + 30); await page.mouse.wheel(0, 200);
    const overflow = await details.evaluate((element) => element.scrollHeight > element.clientHeight);
    if (overflow) await expect.poll(() => details.evaluate((element) => element.scrollTop)).toBeGreaterThan(beforeWheel);
    await expect(select).toBeFocused();
    await select.press("Escape");
    await page.getByRole("tab", { name: "SCENARIO", exact: true }).click();
    const scenario = page.getByRole("combobox", { name: "Scenario", exact: true });
    await scenario.focus(); await scenario.press("Home"); await scenario.press("ArrowDown");
    await expect(preview(page)).toHaveAttribute("data-candidate-id", "hiroshima");
    for (let index = 0; index < 5; index += 1) await scenario.press("Shift+PageDown");
    await expect(scenario).toBeFocused();
    const lastLine = await preview(page).locator(".preview-event-copy").evaluate((element) => {
      const text = element.firstChild!; const length = text.textContent!.length; const range = document.createRange();
      range.setStart(text, Math.max(0, length - 20)); range.setEnd(text, length);
      const end = range.getBoundingClientRect(); const clip = element.closest("#selection-preview-description")!.getBoundingClientRect();
      return { top: end.top, bottom: end.bottom, clipTop: clip.top, clipBottom: clip.bottom };
    });
    expect(lastLine.top).toBeGreaterThanOrEqual(lastLine.clipTop); expect(lastLine.bottom).toBeLessThanOrEqual(lastLine.clipBottom);
    await scenario.press("Escape");
  }
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
