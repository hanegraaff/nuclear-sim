import assert from 'node:assert/strict';
import test from 'node:test';
import { ExplosionRenderer, explosionPresentation } from '../app/explosion-renderer.mjs';

function fixture() {
  const draws = [];
  const context = { setTransform() {}, clearRect() {}, save() {}, restore() {}, drawImage(...args) { draws.push(args); } };
  globalThis.window = { devicePixelRatio: 1 };
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => context }) };
  const camera = { x: 0, y: 0, zoom: 4, bearing: 0, pitch: 0, width: 1000, height: 600 };
  const map = {
    getContainer: () => ({ clientWidth: camera.width, clientHeight: camera.height }),
    getZoom: () => camera.zoom,
    getBearing: () => camera.bearing,
    getPitch: () => camera.pitch,
    project: ([lng, lat]) => ({ x: lng * 2 ** camera.zoom - camera.x, y: lat * 2 ** camera.zoom - camera.y }),
    unproject: ([x, y]) => ({ lng: (x + camera.x) / 2 ** camera.zoom, lat: (y + camera.y) / 2 ** camera.zoom }),
  };
  return { camera, map, context, draws, renderer: new ExplosionRenderer() };
}

test('all effects share single-strike annotations and multiple-strike legends', () => {
  assert.deepEqual(explosionPresentation(1), { markers: true, ruler: true, divisions: true, legends: false });
  for (const count of [2, 10, 100]) assert.deepEqual(explosionPresentation(count), { markers: false, ruler: false, divisions: false, legends: true });
  assert.deepEqual(explosionPresentation(0), { markers: false, ruler: false, divisions: false, legends: false });
});

test('the explicit launch mode switches legends and annotations without waiting for another impact', () => {
  for (const impacts of [0, 1, 10]) {
    assert.equal(explosionPresentation(impacts, true).legends, true);
    assert.equal(explosionPresentation(impacts, true).ruler, false);
    assert.equal(explosionPresentation(impacts, true).markers, false);
    assert.equal(explosionPresentation(impacts, false).legends, false);
  }
  assert.equal(explosionPresentation(1, false).ruler, true);
  assert.equal(explosionPresentation(1, false).markers, true);
});

test('every camera frame follows a pan exactly without rebuilding the effect', () => {
  for (const view of ['blast', 'fallout', 'audible', 'visible']) {
    const { renderer, camera, map, context, draws } = fixture();
    let paints = 0, sampledPoint;
    const paint = ({ map }) => { paints++; sampledPoint = map.project([25, 18]); };
    renderer.paintField(map, context, view, paint);
    for (let frame = 1; frame <= 60; frame++) {
      camera.x = frame * 2;
      camera.y = frame;
      renderer.paintField(map, context, view, paint);
      const [, x, y, width] = draws.at(-1);
      const scale = width / renderer.cache.width;
      const expected = map.project([25, 18]);
      assert.ok(Math.abs(x + sampledPoint.x * scale - expected.x) < 1e-9);
      assert.ok(Math.abs(y + sampledPoint.y * scale - expected.y) < 1e-9);
    }
    assert.equal(paints, 1, `${view} should reuse its field for all 60 pan frames`);
  }
});

test('zooming reprojects the same geographic point and rebuilds when coverage runs out', () => {
  const { renderer, camera, map, context, draws } = fixture();
  let paints = 0, sampledPoint;
  const paint = ({ map }) => { paints++; sampledPoint = map.project([25, 18]); };
  renderer.paintField(map, context, 'visible', paint);
  camera.zoom += 0.3;
  renderer.paintField(map, context, 'visible', paint);
  assert.equal(paints, 1);
  let [, x, y, width] = draws.at(-1);
  const scale = width / renderer.cache.width;
  let expected = map.project([25, 18]);
  assert.ok(Math.abs(x + sampledPoint.x * scale - expected.x) < 1e-9);
  assert.ok(Math.abs(y + sampledPoint.y * scale - expected.y) < 1e-9);
  camera.x += 900;
  renderer.paintField(map, context, 'visible', paint);
  assert.equal(paints, 2);
  [, x, y] = draws.at(-1);
  expected = map.project([25, 18]);
  assert.ok(Math.abs(x + sampledPoint.x - expected.x) < 1e-9);
  assert.ok(Math.abs(y + sampledPoint.y - expected.y) < 1e-9);
});

test('new impacts, view changes, resizing and erase cannot reuse a stale field', () => {
  const { renderer, camera, map, context } = fixture();
  let paints = 0;
  const paint = () => { paints++; };
  renderer.paintField(map, context, 'blast:1', paint);
  renderer.paintField(map, context, 'blast:2', paint);
  renderer.paintField(map, context, 'fallout:2', paint);
  camera.width += 10;
  renderer.paintField(map, context, 'fallout:2', paint);
  renderer.invalidate();
  renderer.paintField(map, context, 'fallout:2', paint);
  assert.equal(paints, 5);
});
