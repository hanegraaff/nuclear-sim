/** Optional Plan 19 CPU comparison, independent of the correctness gate.
 * Run from site/: node scripts/measure-blast-performance.mjs BEFORE_URL AFTER_URL OUTPUT_JSON [fixture...]
 * Serve the prechange source (46a9ab1) and candidate built with the same Node/dependencies.
 * CDP reports process CPU during fake-clock animation, not real-time input latency.
 */
import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const [beforeUrl = "http://127.0.0.1:4175", afterUrl = "http://127.0.0.1:4174", output = "tests/e2e/evidence/plan-19-render-performance.json", ...requestedFixtures] = process.argv.slice(2);
const fixtures = requestedFixtures.length ? requestedFixtures : ["single", "multi-one", "multi-two", "multi-five", "mirv-ten"];
const viewport = { width: 1508, height: 1080 };
const browser = await chromium.launch({ channel: "chrome", headless: true });
const samples = [];
try {
  // Interleaved versions reduce the effect of host load and thermal drift.
  for (const repeat of [1, 2, 3]) for (const fixture of fixtures) for (const [version, url] of [["before", beforeUrl], ["after", afterUrl]]) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
    await page.route("**/MapServer/tile/**", (route) => route.fulfill({ path: resolve("tests/fixtures/satellite-tile.png"), contentType: "image/png" }));
    await page.goto(url);
    await page.locator("main.simulator[data-map-state=ready]").waitFor();
    await page.clock.install(); await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10_000);
    if (fixture.startsWith("multi")) await page.getByRole("button", { name: "Multi-Launch Mode OFF" }).click();
    if (fixture.startsWith("mirv")) await page.getByRole("combobox", { name: "Weapon or delivery system" }).selectOption("rsm-56-bulava");
    if (fixture === "mirv-ten-pitched") {
      // Reveal the ten geographic impact targets, then pitch before launch.
      for (let index = 0; index < 3; index++) await page.getByRole("button", { name: "Zoom out" }).click();
      await page.clock.runFor(600);
      await page.mouse.move(1400, 780); await page.mouse.down({ button: "right" });
      await page.mouse.move(1400, 350, { steps: 10 }); await page.mouse.up({ button: "right" });
      await page.clock.runFor(100);
    }
    const targets = fixture === "multi-two" ? [[700, 700], [1250, 700]]
      : fixture === "multi-five" ? [[930, 600], [1005, 555], [1080, 600], [985, 650], [1070, 665]] : [[1050, 700]];
    for (const [x, y] of targets) await page.mouse.click(x, y);
    await page.clock.fastForward(6500);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Performance.enable");
    const metrics = async () => Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map(({ name, value }) => [name, value]));
    const before = await metrics(); await page.clock.runFor(4700); const after = await metrics();
    const sample = {
      repeat, fixture, version, animationMs: 4700,
      taskCpuMs: (after.TaskDuration - before.TaskDuration) * 1000,
      scriptCpuMs: (after.ScriptDuration - before.ScriptDuration) * 1000,
      jsHeapUsedBytes: after.JSHeapUsedSize,
      impacts: Number(await page.locator("main.simulator").getAttribute("data-impact-count")),
      pitch: Number(await page.locator("main.simulator").getAttribute("data-pitch")),
    };
    samples.push(sample); console.log(JSON.stringify(sample));
    await page.close();
  }
  const summary = Object.fromEntries(fixtures.map((fixture) => [fixture, Object.fromEntries(["before", "after"].map((version) => {
    const rows = samples.filter((row) => row.fixture === fixture && row.version === version);
    return [version, { meanTaskCpuMs: rows.reduce((sum, row) => sum + row.taskCpuMs, 0) / rows.length, meanScriptCpuMs: rows.reduce((sum, row) => sum + row.scriptCpuMs, 0) / rows.length }];
  }))]));
  await writeFile(output, `${JSON.stringify({
    browser: await browser.version(), node: process.version, baselineSource: "Pre-Plan-19 source46a9ab1, built with same Node26/dependencies", viewport,
    method: "Chrome CDP TaskDuration/ScriptDuration deltas during4700 fake-clock ms after impact;3 interleaved samples per fixture/version; fixed local tiles; CPU time, not real-time latency",
    samples, summary, cache: { accumulatorBytesPerCell: 12, maximumCells: 560 * 380, retainedGeographicGrids: 1, maximumOpticalRasters: 8 },
    perRepaintBounds: { geodesicEvaluations: 600000, launchCandidates: 1024 },
  }, null, 2)}\n`);
} finally { await browser.close(); }
