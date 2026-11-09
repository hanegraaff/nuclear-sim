/** R-16/R-17: every selectable fixed ID has research metadata and every scenario pairs distinct prose with local artwork. */
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DEVICES } from "../../src/catalog/devices";
import { DEVICE_DOSSIERS } from "../../src/catalog/deviceDossiers";
import { SCENARIOS } from "../../src/catalog/scenarios";
import { SCENARIO_PREVIEWS } from "../../src/catalog/scenarioPreviews";

// npm scripts run in the Site root. Native fs paths avoid Vite rewriting dynamic new URL templates as client assets.
const asset = (src: string) => resolve(process.cwd(), "public", src.slice(1));
const confidences = ["sourced", "reported", "estimated", "unknown", "inapplicable"];

describe("complete public device dossiers", () => {
  it("covers all 52 fixed IDs without substituting unmodeled weapons", () => {
    expect(Object.keys(DEVICE_DOSSIERS).sort()).toEqual(DEVICES.map((device) => device.id).sort());
  });

  for (const device of DEVICES) it(`${device.id} identifies all required facts, confidence, sources, and bounded exterior artwork`, () => {
    const dossier = DEVICE_DOSSIERS[device.id]!;
    expect(dossier?.id).toBe(device.id);
    expect(dossier.entityLabel).not.toBe("");
    for (const fact of [dossier.length, dossier.totalMass, dossier.payloadMass, dossier.created, dossier.retired, dossier.country]) {
      expect(fact.value.trim().length).toBeGreaterThan(0);
      expect(confidences).toContain(fact.confidence);
      if (["sourced", "reported", "estimated"].includes(fact.confidence)) expect(fact.sources.length).toBeGreaterThan(0);
      for (const source of fact.sources) expect(new URL(source).protocol).toBe("https:");
    }
    expect(dossier.silhouette.src).toMatch(/^\/media\/devices\/[a-z0-9-]+\.svg$/);
    expect(existsSync(asset(dossier.silhouette.src))).toBe(true);
    // 20 KiB is the explicit Plan 18 transfer budget for one optimized exterior outline.
    expect(statSync(asset(dossier.silhouette.src)).size).toBeLessThanOrEqual(20 * 1024);
    expect(dossier.silhouette.width).toBeGreaterThan(0);
    expect(dossier.silhouette.height).toBeGreaterThan(0);
  });
});

describe("scenario event previews", () => {
  it("pairs all 20 scenarios with distinct event descriptions and no orphan preview IDs", () => {
    expect(Object.keys(SCENARIO_PREVIEWS).sort()).toEqual(SCENARIOS.map((scenario) => scenario.id).sort());
    expect(new Set(Object.values(SCENARIO_PREVIEWS).map((preview) => preview.description)).size).toBe(20);
  });

  for (const scenario of SCENARIOS) it(`${scenario.id} supplies readable event text and a compressed local image`, () => {
    const preview = SCENARIO_PREVIEWS[scenario.id]!;
    expect(preview?.id).toBe(scenario.id);
    const words = preview.description.trim().split(/\s+/).length;
    // Plan 18 targets approximately 60–100 words; 50–130 permits editorial variation without unreadable density.
    expect(words).toBeGreaterThanOrEqual(50); expect(words).toBeLessThanOrEqual(130);
    if (scenario.kind === "historical") expect(preview.sources.length).toBeGreaterThan(0);
    expect(preview.imageWidth).toBe(1200); expect(preview.imageHeight).toBe(800);
    expect(preview.imageSrc).toBe(`/media/scenarios/${scenario.id}.webp`);
    expect(existsSync(asset(preview.imageSrc))).toBe(true);
    expect(statSync(asset(preview.imageSrc)).size).toBeLessThanOrEqual(300 * 1024);
  });
});
