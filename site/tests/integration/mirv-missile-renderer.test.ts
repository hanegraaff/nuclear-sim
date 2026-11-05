/** Canvas contract tests check that the pre-split carrier and separated vehicles use different visual scales. */
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Launch } from "../../src/application/launch";
import { blastRadiiForYield } from "../../src/domain/blast";
import { MissileCanvasRenderer } from "../../src/rendering/animation/MissileCanvasRenderer";

const carrierRoute = {
  start: { longitude: 30, latitude: 30 },
  control: { longitude: 100, latitude: 100 },
  target: { longitude: 200, latitude: 200 },
};
const lead: Launch = {
  id: 1, deviceId: "rs-24-yars", yieldMt: 0.175, launchedAtMs: 0, flightMs: 6500, blastMs: 4600,
  route: { ...carrierRoute, target: { longitude: 250, latitude: 230 } },
  radii: blastRadiiForYield(0.175),
  mirv: { route: carrierRoute, splitMs: 3900, carrierFlightMs: 6500, lead: true },
};
const follower: Launch = {
  ...lead, id: 2, flightMs: 6545, route: { ...carrierRoute, target: { longitude: 300, latitude: 280 } },
  mirv: { ...lead.mirv!, lead: false },
};

afterEach(() => vi.restoreAllMocks());

describe("MIRV missile canvas", () => {
  it("draws one 12 px carrier before split and 8 px, 1 px-core vehicles afterwards", () => {
    const arc = vi.fn();
    const context = {
      setTransform: vi.fn(), clearRect: vi.fn(), save: vi.fn(), restore: vi.fn(), translate: vi.fn(),
      beginPath: vi.fn(), arc, fill: vi.fn(), stroke: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
      drawImage: vi.fn(), fillRect: vi.fn(),
      createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    } as unknown as CanvasRenderingContext2D;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context);
    const canvas = document.createElement("canvas");
    const renderer = new MissileCanvasRenderer(canvas, { toScreen: (point) => ({ x: point.longitude, y: point.latitude }) });
    renderer.renderMany([{ launch: lead, elapsedMs: 3500 }, { launch: follower, elapsedMs: 3500 }], 500, 500);
    const carrierRadii = arc.mock.calls.map((call) => call[2] as number);
    expect(carrierRadii.filter((radius) => radius === 12)).toHaveLength(1);
    expect(carrierRadii.filter((radius) => radius === 1.45)).toHaveLength(1);
    arc.mockClear();

    renderer.renderMany([{ launch: lead, elapsedMs: 4500 }, { launch: follower, elapsedMs: 4500 }], 500, 500);
    const branchRadii = arc.mock.calls.map((call) => call[2] as number);
    expect(branchRadii.filter((radius) => radius === 8)).toHaveLength(2);
    expect(branchRadii.filter((radius) => radius === 1)).toHaveLength(2);
    expect(branchRadii).not.toContain(12);
  });
});
