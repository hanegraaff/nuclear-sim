/** Pure geometry tests compare the prototype's boundary timing and Mercator dimensions without a GPU. */
import { describe, expect, it } from "vitest";
import { geoPoint } from "../../src/domain/geodesy";
import { blastExpansion } from "../../src/rendering/animation/blastTiming";
import { fireballEnvelope, fireballMeshDetail, groundMetersPerPixel, hemisphereVertices, localMercatorMatrix } from "../../src/rendering/animation/fireballGeometry";

const IDENTITY = new Float64Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

describe("3D fireball growth and geographic mesh", () => {
  it("reaches the modeled fireball radius when the advancing blast front reaches that boundary", () => {
    const fireballKm = 0.88;
    const lightKm = 22.3;
    const boundary = 1 - (1 - fireballKm / lightKm) ** (1 / 2.15);
    expect(blastExpansion(boundary) * lightKm).toBeCloseTo(fireballKm, 10);
    expect(fireballEnvelope(0, fireballKm, lightKm).opacity).toBe(0);
    expect(fireballEnvelope(boundary / 2, fireballKm, lightKm).radius).toBeLessThan(1);
    expect(fireballEnvelope(boundary, fireballKm, lightKm).radius).toBeCloseTo(1, 10);
    expect(fireballEnvelope(1, fireballKm, lightKm).radius).toBe(1);
    expect(fireballEnvelope(10, fireballKm, lightKm).opacity).toBe(1);
    let prior = 0;
    for (let step = 0; step <= 100; step++) {
      const envelope = fireballEnvelope(step / 100, fireballKm, lightKm);
      expect(envelope.radius).toBeGreaterThanOrEqual(prior);
      expect(envelope.radius).toBeLessThanOrEqual(1);
      expect(envelope.opacity).toBeGreaterThanOrEqual(0);
      expect(envelope.opacity).toBeLessThanOrEqual(1);
      prior = envelope.radius;
    }
  });

  it("keeps invalid optical input invisible and bounds GPU mesh detail", () => {
    expect(fireballEnvelope(Number.NaN, 1, 10).opacity).toBe(0);
    expect(fireballEnvelope(0.5, 0, 10).radius).toBe(0);
    expect(fireballMeshDetail(31.9)).toBe("compact");
    expect(fireballMeshDetail(32)).toBe("full");
    const mesh = hemisphereVertices(10, 20);
    expect(mesh.length).toBe(10 * 20 * 6 * 3);
    for (let index = 0; index < mesh.length; index += 3) {
      const radius = Math.hypot(mesh[index]!, mesh[index + 1]!, mesh[index + 2]!);
      // Float32 quantization of unit-sphere coordinates stays within 1e-6.
      expect(Math.abs(radius - 1)).toBeLessThan(1e-6);
      expect(mesh[index + 2]).toBeGreaterThanOrEqual(0);
    }
    expect(() => hemisphereVertices(1, 20)).toThrow(RangeError);
  });

  it("uses equal surface radius and vertical height while wrapping to the nearest world copy", () => {
    for (const latitude of [0, 40, -60]) {
      const matrix = localMercatorMatrix(IDENTITY, geoPoint(-74, latitude), 0.87, -74);
      expect(matrix[0]).toBe(matrix[5]);
      expect(matrix[5]).toBe(matrix[10]);
      expect(matrix[0]).toBeGreaterThan(0);
      // Float32 world-coordinate conversion limits a longitude comparison to 1e-7.
      expect(Math.abs(matrix[12]! - 106 / 360)).toBeLessThan(1e-7);
    }
    const east = localMercatorMatrix(IDENTITY, geoPoint(-179.8, 10), 0.87, 179.8);
    expect(east[12]).toBeGreaterThan(1);
    expect(groundMetersPerPixel(40, 12)).toBeLessThan(groundMetersPerPixel(40, 11));
    expect(() => localMercatorMatrix(IDENTITY, geoPoint(0, 0), -1, 0)).toThrow(RangeError);
  });
});
