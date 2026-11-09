/** R-15/R-17/R-18: real viewport scrollbars keep full scenario images reachable without moving dropdown focus. */
import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

// Headless Chromium normally suppresses native scrollbar painting/hit-testing. This interaction-only file enables it.
test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });
const preview = (page: Page) => page.locator(".selection-preview");
test.beforeEach(async ({ page }) => {
  await page.route("**/MapServer/tile/**", (route) => route.fulfill({ path: path.resolve("tests/fixtures/satellite-tile.png"), contentType: "image/png" }));
  await page.goto("/");
  await expect(page.locator("main.simulator")).toHaveAttribute("data-map-state", "ready");
});

test("small and short desktop viewports retain the complete scenario image with preview-owned scrolling", async ({ page }) => {
  for (const size of [{ width: 601, height: 768 }, { width: 1024, height: 600 }, { width: 1280, height: 600 }, { width: 1920, height: 500 }]) {
    await page.setViewportSize(size);
    await page.getByRole("tab", { name: "SCENARIO", exact: true }).click();
    const select = page.getByRole("combobox", { name: "Scenario", exact: true });
    await expect(select).toHaveAttribute("aria-expanded", "false");
    await select.focus(); await select.press("Home"); await select.press("ArrowDown");
    const viewport = page.locator(".selection-preview-viewport");
    await expect(preview(page)).toHaveAttribute("data-candidate-id", "hiroshima");
    await expect(preview(page).locator(".preview-scenario-image")).toHaveAttribute("data-image-state", "loaded");
    const geometry = await preview(page).locator(".preview-scenario-image img").evaluate((image) => {
      const element = image as HTMLImageElement; const box = element.getBoundingClientRect(); const holder = element.parentElement!.getBoundingClientRect();
      const clippingAncestors: string[] = []; let ancestor: HTMLElement | null = element.parentElement;
      while (ancestor && !ancestor.classList.contains("selection-preview-viewport")) { const css = getComputedStyle(ancestor); if ([css.overflowX, css.overflowY].some((overflow) => overflow === "hidden" || overflow === "clip")) clippingAncestors.push(ancestor.className); ancestor = ancestor.parentElement; }
      return { naturalWidth: element.naturalWidth, naturalHeight: element.naturalHeight, width: box.width, height: box.height, holderWidth: holder.width, holderHeight: holder.height, fit: getComputedStyle(element).objectFit, clippingAncestors };
    });
    expect(geometry.naturalWidth).toBe(1200); expect(geometry.naturalHeight).toBe(800);
    // One CSS pixel accommodates subpixel raster rounding, not a crop or altered 3:2 ratio.
    expect(Math.abs(geometry.height - geometry.width * 2 / 3)).toBeLessThan(1);
    expect(Math.abs(geometry.holderHeight - geometry.height)).toBeLessThan(1);
    expect(geometry.fit).toBe("contain"); expect(geometry.clippingAncestors).toEqual([]);
    const before = await viewport.evaluate((element) => element.scrollTop);
    const bounds = await viewport.boundingBox();
    await page.mouse.move(bounds!.x + 40, bounds!.y + 40); await page.mouse.wheel(0, 220);
    await expect.poll(() => viewport.evaluate((element) => element.scrollTop)).toBeGreaterThan(before);
    await expect(select).toBeFocused();
    for (let index = 0; index < 5; index += 1) await select.press("Shift+PageDown");
    expect(await viewport.evaluate((element) => Math.abs(element.scrollHeight - element.clientHeight - element.scrollTop))).toBeLessThanOrEqual(1);
    const end = await preview(page).locator(".preview-event-copy").evaluate((element) => {
      const range = document.createRange(); const text = element.firstChild!; const length = text.textContent!.length;
      range.setStart(text, Math.max(0, length - 20)); range.setEnd(text, length);
      const line = range.getBoundingClientRect(); const clip = element.closest(".selection-preview-viewport")!.getBoundingClientRect();
      return { top: line.top, bottom: line.bottom, clipTop: clip.top, clipBottom: clip.bottom };
    });
    expect(end.top).toBeGreaterThanOrEqual(end.clipTop); expect(end.bottom).toBeLessThanOrEqual(end.clipBottom);
    const imageBottom = await preview(page).locator(".preview-scenario-image img").boundingBox(); const clip = await viewport.boundingBox();
    expect(imageBottom!.y + imageBottom!.height).toBeLessThanOrEqual(clip!.y + clip!.height);
    for (let index = 0; index < 5; index += 1) await select.press("Shift+PageUp");
    const imageTop = await preview(page).locator(".preview-scenario-image img").boundingBox(); expect(imageTop!.y).toBeGreaterThanOrEqual(clip!.y);
    // Native scrollbar track and drag gestures must not trigger the outside-click dismissal.
    const gutter = await viewport.evaluate((element) => (element as HTMLElement).offsetWidth - element.clientWidth);
    expect(gutter).toBeGreaterThan(0);
    await page.mouse.move(bounds!.x + bounds!.width - gutter / 2, bounds!.y + bounds!.height - 5); await page.mouse.down(); await page.mouse.up();
    await expect(viewport).toHaveCount(1); await expect(select).toBeFocused();
    await expect.poll(() => viewport.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    for (let index = 0; index < 5; index += 1) await select.press("Shift+PageUp");
    await page.mouse.move(bounds!.x + bounds!.width - gutter / 2, bounds!.y + 8); await page.mouse.down();
    await page.mouse.move(bounds!.x + bounds!.width - gutter / 2, bounds!.y + Math.min(100, bounds!.height / 4), { steps: 6 }); await page.mouse.up();
    await expect(viewport).toHaveCount(1); await expect(select).toBeFocused();
    await expect.poll(() => viewport.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    const list = await page.getByRole("listbox").boundingBox();
    if (size.width <= 820) expect(bounds!.y).toBeGreaterThan(list!.y + list!.height); else expect(bounds!.x).toBeGreaterThan(list!.x + list!.width);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(size.height - 50);
    await select.press("Tab"); await expect(viewport).toHaveCount(0);
  }
});
