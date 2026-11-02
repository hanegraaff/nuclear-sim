import assert from 'node:assert/strict';
import test from 'node:test';
import { GroundDistanceCache, CameraGeometryCache, shouldPaintBlastField } from '../app/multi-blast-cache.mjs';

function mockMap() {
  let calls = 0, zoom = 10, bearing = 0, pitch = 45, padding = 0;
  return {
    get calls() { return calls; },
    getCenter: () => ({ lng: -74, lat: 40 }),
    getZoom: () => zoom,
    getBearing: () => bearing,
    getPitch: () => pitch,
    getPadding: () => ({ left: padding, right: 0, top: 0, bottom: 0 }),
    getContainer: () => ({ clientWidth: 1000, clientHeight: 700 }),
    setZoom(value) { zoom = value; },
    setBearing(value) { bearing = value; },
    setPitch(value) { pitch = value; },
    setPadding(value) { padding = value; },
    unproject([x, y]) { calls++; return { lng: -74 + x * .001, lat: 40 + y * .001 }; },
  };
}

test('multiple blasts share one geographic grid and reuse their distances', () => {
  const map = mockMap(), cache = new GroundDistanceCache();
  const first = cache.get(map, { lng: -74, lat: 40 }, 20, 10, 0.5);
  assert.equal(map.calls, 200);
  const second = cache.get(map, { lng: -73.9, lat: 40 }, 20, 10, 0.5);
  assert.equal(map.calls, 200, 'additional impacts must not re-project the viewport');
  assert.notDeepEqual(first, second);
  assert.strictEqual(cache.get(map, { lng: -74, lat: 40 }, 20, 10, 0.5), first);
  assert.equal(map.calls, 200);
  map.setZoom(11);
  assert.notStrictEqual(cache.get(map, { lng: -74, lat: 40 }, 20, 10, 0.5), first);
  assert.equal(map.calls, 400, 'camera changes must invalidate geographic data');
  map.setPitch(55);
  cache.get(map, { lng: -74, lat: 40 }, 20, 10, 0.5);
  assert.equal(map.calls, 600);
  map.setPadding(200);
  cache.get(map, { lng: -74, lat: 40 }, 20, 10, 0.5);
  assert.equal(map.calls, 800, 'camera padding changes must invalidate geographic data');
});

test('settled fields stay intact while new missiles are inbound', () => {
  const state = { resized: false, cameraChanged: false, settledChanged: false, expanding: false, sinceLastPaint: 1000, interval: 33 };
  assert.equal(shouldPaintBlastField(state), false);
  assert.equal(shouldPaintBlastField({ ...state, cameraChanged: true }), true);
  assert.equal(shouldPaintBlastField({ ...state, settledChanged: true }), true);
  assert.equal(shouldPaintBlastField({ ...state, resized: true }), true);
  assert.equal(shouldPaintBlastField({ ...state, expanding: true }), true);
  assert.equal(shouldPaintBlastField({ ...state, expanding: true, sinceLastPaint: 10 }), false);
});

test('projected meshes are reused for both masks and frames, but not after a camera change', () => {
  const map = mockMap(), cache = new CameraGeometryCache(2);
  let builds = 0;
  const build = () => { builds++; return [{ x: 12, y: 24 }]; };
  const first = cache.get(map, 'blast-a', build);
  assert.strictEqual(cache.get(map, 'blast-a', build), first);
  assert.equal(builds, 1);
  map.setBearing(30);
  assert.notStrictEqual(cache.get(map, 'blast-a', build), first);
  assert.equal(builds, 2);
  cache.get(map, 'blast-b', build);
  cache.get(map, 'blast-c', build);
  assert.equal(cache.entries.size, 2);
});

test('cached distances agree with spherical surface distances', () => {
  const map = mockMap(), cache = new GroundDistanceCache();
  const origin = { lng: -74, lat: 40 };
  const values = cache.get(map, origin, 20, 10, 1);
  const index = 9 * 20 + 19, point = { lng: -74 + .0195, lat: 40 + .0095 };
  const rad = Math.PI / 180;
  const dlat = (point.lat - origin.lat) * rad, dlng = (point.lng - origin.lng) * rad;
  const a = Math.sin(dlat / 2) ** 2 + Math.cos(origin.lat * rad) * Math.cos(point.lat * rad) * Math.sin(dlng / 2) ** 2;
  const expected = 2 * 6371 * Math.asin(Math.sqrt(a));
  assert.ok(Math.abs(values[index] - expected) < .00001);
});

test('distance cache is bounded and does not thrash when scenes exceed its budget', () => {
  const map = mockMap(), cache = new GroundDistanceCache(200 * 4 * 2);
  const first = cache.get(map, { lng: -74, lat: 40 }, 20, 10, .5);
  cache.get(map, { lng: -73, lat: 40 }, 20, 10, .5);
  cache.get(map, { lng: -72, lat: 40 }, 20, 10, .5);
  assert.equal(cache.distances.size, 2);
  assert.ok(cache.distanceBytes <= cache.maxDistanceBytes);
  assert.strictEqual(cache.get(map, { lng: -74, lat: 40 }, 20, 10, .5), first);
  assert.equal(map.calls, 200);
});
