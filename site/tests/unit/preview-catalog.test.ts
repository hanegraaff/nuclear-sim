/** R-16/R-17: every selectable fixed ID has research metadata and every scenario pairs distinct prose with local artwork. */
import { existsSync, statSync, readdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DEVICES, DEVICE_GROUPS } from "../../src/catalog/devices";
import { DEVICE_DOSSIERS } from "../../src/catalog/deviceDossiers";
import { SCENARIOS } from "../../src/catalog/scenarios";
import { SCENARIO_PREVIEWS } from "../../src/catalog/scenarioPreviews";

// npm scripts run in the Site root. Native fs paths avoid Vite rewriting dynamic new URL templates as client assets.
const asset = (src: string) => resolve(process.cwd(), "public", src.slice(1));
const confidences = ["sourced", "reported", "estimated", "unknown", "inapplicable"];

describe("complete public device dossiers", () => {
  it("ships exactly the active device and scenario media, without retired orphan files", () => {
    expect(readdirSync(asset("/media/devices")).sort()).toEqual(DEVICES.map((d) => `${d.id}.svg`).sort());
    expect(readdirSync(asset("/media/scenarios")).sort()).toEqual(SCENARIOS.map((s) => `${s.id}.webp`).sort());
  });
  it("covers all 49 fixed IDs without substituting unmodeled weapons", () => {
    expect(Object.keys(DEVICE_DOSSIERS).sort()).toEqual(DEVICES.map((device) => device.id).sort());
  });

  it("distinguishes the complete Davy Crockett projectile from its smaller warhead and omits nuclear fill", () => {
    const projectile = DEVICE_DOSSIERS.w54!;
    expect(projectile.entityLabel).toContain("M388");
    expect(projectile.length).toMatchObject({ value: "0.787 m", label: "PROJECTILE LENGTH" });
    expect(projectile.totalMass).toMatchObject({ value: "34.5 kg", label: "PROJECTILE MASS" });
    expect(projectile.payloadMass).toMatchObject({ value: "23.1 kg W54 warhead", label: "WARHEAD MASS" });
    for (const device of DEVICE_GROUPS.find((group) => group.id === "nuclear")!.devices) {
      const payload = DEVICE_DOSSIERS[device.id]!.payloadMass;
      if (payload.confidence !== "inapplicable") expect(payload.label).toBe("WARHEAD MASS");
      expect(payload.value).not.toMatch(/fissile|plutonium|uranium/i);
    }
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
    expect(readFileSync(asset(dossier.silhouette.src), "utf8")).not.toMatch(/<text|reference length|scale unavailable/i);
    expect(dossier.silhouette.width).toBe(960);
    expect(dossier.silhouette.height).toBe(320);
  });
});

describe("scenario event previews", () => {
  it("preserves every surviving hypothetical artwork byte for byte from the pre-Plan-19 hash ledger", () => {
    const hashes = JSON.parse(readFileSync(resolve(process.cwd(), "tests/fixtures/plan-19-preserved-artwork.json"), "utf8")) as Record<string, string>;
    expect(Object.keys(hashes).sort()).toEqual(SCENARIOS.filter((s) => s.kind === "hypothetical").map((s) => s.id).sort());
    for (const [id, expected] of Object.entries(hashes)) expect(createHash("sha256").update(readFileSync(asset(`/media/scenarios/${id}.webp`))).digest("hex")).toBe(expected);
  });
  it("pairs all 16 scenarios with distinct event descriptions and no orphan preview IDs", () => {
    expect(Object.keys(SCENARIO_PREVIEWS).sort()).toEqual(SCENARIOS.map((scenario) => scenario.id).sort());
    expect(new Set(Object.values(SCENARIO_PREVIEWS).map((preview) => preview.description)).size).toBe(16);
  });

  for (const scenario of SCENARIOS) it(`${scenario.id} supplies readable event text and a compressed local image`, () => {
    const preview = SCENARIO_PREVIEWS[scenario.id]!;
    expect(preview?.id).toBe(scenario.id);
    const words = preview.description.trim().split(/\s+/).length;
    // The review revision targets 30–45 words so the dark description remains compact beside the full image.
    expect(words).toBeGreaterThanOrEqual(30); expect(words).toBeLessThanOrEqual(45);
    if (scenario.kind === "historical") expect(preview.sources.length).toBeGreaterThan(0);
    expect(preview.imageWidth).toBe(1200); expect(preview.imageHeight).toBe(800);
    expect(preview.imageSrc).toBe(`/media/scenarios/${scenario.id}.webp`);
    expect(existsSync(asset(preview.imageSrc))).toBe(true);
    expect(statSync(asset(preview.imageSrc)).size).toBeLessThanOrEqual(300 * 1024);
  });
});
