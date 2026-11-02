import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the nuclear-effects simulator controls", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Nuke Simulator<\/title>/i);
  assert.match(html, /Nuke Simulator/);
  assert.match(html, /Choose by scenario or device/);
  assert.match(html, /Hypothetical scale studies/);
  assert.match(html, /Earth-span stress test/);
  assert.match(html, /Blast-zone inspection markers/);
  assert.match(html, /CLOUD PROFILE/);
  assert.match(html, /HEIGHT REVEALS AT IGNITION/);
  assert.match(html, /Fallout-field inspection markers/);
  assert.match(html, /Damage area/);
  assert.match(html, /missile-canvas/);
  assert.match(html, /Click Map to Launch/);
  assert.match(html, /Single launch · replaces previous strike/);
  assert.match(html, /Reset map/);
  assert.match(html, /> RESET</);
  assert.match(html, /Hide control and cloud panels/);
  assert.doesNotMatch(html, />LAUNCH</);
  assert.doesNotMatch(html, /MASS STRIKE|TOTAL DESTRUCTION/);
  assert.match(html, /Conventional weapons/);
  assert.match(html, /GBU-43\/B MOAB/);
  assert.match(html, /MIRV delivery systems/);
  assert.match(html, /SS-29/);
  assert.match(html, /SS-NX-30/);
  assert.match(html, /Satan II/);
  assert.doesNotMatch(html, /AUDIBLE · 100 dB/);
  assert.doesNotMatch(html, /PRESS THAT BUTTON/i);
  assert.doesNotMatch(html, /Target location|location-search/i);
  assert.doesNotMatch(html, /codex-preview|Building your site|damage-legend/i);
});

test("keeps zone statistics and extreme-yield handling in the shipped source", async () => {
  const [page, css, layout] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(page, /function sphericalCapArea/);
  assert.match(page, /function zoneBands/);
  assert.match(page, /Number\.MAX_VALUE/);
  assert.match(page, /1 Pt Earth-span stress test/);
  assert.match(page, /zone-marker-layer/);
  assert.match(page, /type Phase = "armed" \| "inbound" \| "detonating" \| "complete"/);
  assert.match(page, /const drawMissile = useCallback/);
  assert.match(page, /const drawFallout = useCallback/);
  assert.match(page, /const drawRangeView = useCallback/);
  assert.match(page, /const drawCloudProfile = useCallback/);
  assert.match(page, /function drawZoneBands/);
  assert.match(page, /function drawDestructionField/);
  assert.match(page, /function sampleBlastGradient/);
  assert.match(page, /BLAST_FALLOFF_FACTOR = 1\.24/);
  assert.match(page, /MERCATOR_METERS_PER_PIXEL_AT_ZOOM_0 = 78271\.516964/);
  assert.match(page, /createRadialGradient/);
  assert.doesNotMatch(page, /particleBudget|deterministic particles|magnetographic iso-damage field/);
  assert.doesNotMatch(page, /createDevastationTexture|drawDevastationSurface|devastationTextureCache/);
  assert.match(page, /RANGE_EXPERIENCE_BANDS/);
  assert.match(page, /FAINT HORIZON GLOW/);
  assert.match(page, /HEIGHT REVEALS AT IGNITION/);
  assert.match(page, /function cloudModel/);
  assert.match(page, /fireballTopKm/);
  assert.match(page, /projectContinuous/);
  assert.match(page, /function curvatureHorizonKm/);
  assert.match(page, /OBSERVER_EYE_HEIGHT_KM = 0\.0017/);
  assert.match(page, /id === "w54"[\s\S]*?0\.012192/);
  assert.match(page, /Direct-fireball horizon/);
  assert.match(page, /Surface-burst H\+24 screening envelope/);
  assert.doesNotMatch(page, /cloud top controls visibility/i);
  assert.match(page, /function mirvTargets/);
  assert.match(page, /mirvTargetsRef/);
  assert.match(page, />AUDIBLE<\/button>/);
  assert.match(page, />VISIBLE<\/button>/);
  assert.match(page, /FALLOUT_BANDS/);
  assert.match(page, /function prevailingWind/);
  assert.match(page, /function falloutZones/);
  assert.match(page, /function thermalColor/);
  assert.match(page, /fallout-marker-layer/);
  assert.match(page, /H\+24/);
  assert.match(page, /terrain-visible thermal gradient/);
  assert.match(page, /function sphericalMeanPoint/);
  assert.match(page, /COMBINED /);
  assert.match(page, /useStableRasterContours/);
  assert.match(page, /drawStableZoneBands/);
  assert.match(page, /drawGlobalBlastBands/);
  assert.match(page, /const launchAt = useCallback/);
  assert.match(page, /launchAtRef\.current\(next\)/);
  assert.match(page, /function drawLaunchTarget/);
  assert.match(page, /drawLaunchTarget\(missile, target\.x, target\.y, targetPulse\)/);
  assert.doesNotMatch(page, /function drawStrikeTarget/);
  assert.match(page, /massStrikesRef\.current\.length \+ additions\.length > 1/);
  assert.match(page, /multi-scale-legends/);
  assert.match(page, /multi-legend-marker/);
  assert.doesNotMatch(page, /outerEdgeStrength/);
  assert.match(page, /rangeQualityCap/);
  assert.match(page, /fieldFrameInterval/);
  assert.match(page, /paintBlastFrame/);
  assert.match(page, /effectViewRef\.current = nextView;[\s\S]*?massFieldCameraRef\.current = "";[\s\S]*?setEffectView\(nextView\)/);
  assert.match(page, /qualityCap = strikes\.length/);
  assert.match(page, /function prepareDistanceGrid/);
  assert.match(page, /function distanceFromGridTerms/);
  assert.match(page, /blastMaskImageRef/);
  assert.match(page, /rangeMaskImageRef/);
  assert.match(page, /lastCloudPaintProgressRef/);
  assert.match(page, /STACKED_BLAST_COLOR_LUT/);
  assert.match(page, /function renderStackedBlastFields/);
  assert.match(page, /function blastDamageIntensity/);
  assert.match(page, /multiBlastMaskCanvasRef/);
  assert.match(page, /multiBlastPeakCanvasRef/);
  assert.match(page, /overlapDamage/);
  assert.match(page, /combinedDamage/);
  assert.match(page, /map\.on\("moveend", positionOverlays\)/);
  assert.doesNotMatch(page, /context\.filter\s*=/);
  assert.doesNotMatch(page, /ground-zero/);
  assert.match(page, /drawZoneBands\(blast, target\.x, target\.y, travelledPixels, pixelRadii, true\)/);
  assert.match(page, /launchAngleRef\.current/);
  assert.match(page, /24-HOUR DOSE BAND/);
  assert.match(page, /UNTREATED OUTLOOK/);
  assert.doesNotMatch(page, /estimateZoneCasualties|estimateMassCasualties|DIRECT CASUALTIES|population-density/i);
  assert.doesNotMatch(page, /generalLaunchAngle|OVERALL DAMAGE|SINGLE STRIKE|MASS STRIKE/);
  assert.match(page, /detonation-flash/);
  assert.match(css, /\.zone-tooltip/);
  assert.match(css, /\.zone-marker-core/);
  assert.match(css, /\.missile-canvas/);
  assert.match(css, /\.detonation-flash/);
  assert.match(css, /\.launch-actions/);
  assert.match(css, /\.panels-hidden \.left-instrument-stack/);
  assert.match(css, /\.panel-restore/);
  assert.match(css, /color-scheme: dark/);
  assert.match(css, /\.select-wrap select option/);
  assert.match(css, /background-color: #161918/);
  assert.match(css, /\.fallout-risk-stats/);
  assert.match(css, /\.effect-view-control/);
  assert.match(css, /\.multi-scale-legends/);
  assert.match(css, /\.view-audible \.effect-gradient-track/);
  assert.match(css, /\.view-visible \.effect-gradient-track/);
  assert.match(css, /\.cloud-monitor/);
  assert.match(css, /\.cloud-profile-canvas/);
  assert.match(css, /\.fallout-marker-layer/);
  assert.doesNotMatch(css, /\.fallout-marker-layer, \.range-marker-layer \{ z-index: 9; \}/);
  assert.doesNotMatch(css, /\.fallout-readout/);
  assert.doesNotMatch(css, /\.zone-casualty-stat/);
  assert.match(css, /@keyframes sun-core/);
  assert.doesNotMatch(css, /\.damage-legend/);
  assert.match(layout, /const title = "Nuke Simulator"/);
});
