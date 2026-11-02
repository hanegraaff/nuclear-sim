import assert from 'node:assert/strict';
import test from 'node:test';
import { fireballEnvelope, localMercatorMatrix, fireballMeshDetail } from '../app/fireball-renderer.mjs';

test('small fireballs use a lightweight mesh and close views retain full detail', () => {
  assert.equal(fireballMeshDetail(12), 'compact');
  assert.equal(fireballMeshDetail(31.9), 'compact');
  assert.equal(fireballMeshDetail(32), 'full');
});

test('the fireball reaches its modeled radius at the severe-zone boundary and persists', () => {
  const fireball = 0.88, light = 22.3;
  const boundary = 1 - (1 - fireball / light) ** (1 / 2.15);
  assert.equal(fireballEnvelope(0, fireball, light).opacity, 0);
  assert.equal(fireballEnvelope(1, fireball, light).opacity, 1);
  assert.equal(fireballEnvelope(10, fireball, light).opacity, 1);
  assert.ok(fireballEnvelope(boundary * 0.5, fireball, light).radius < 1);
  assert.ok(Math.abs(fireballEnvelope(boundary, fireball, light).radius - 1) < 1e-12);
  let previous = 0;
  for (let i = 0; i <= 100; i++) {
    const state = fireballEnvelope(i / 100, fireball, light);
    assert.ok(state.radius >= previous && state.radius <= 1);
    assert.ok(state.opacity >= 0 && state.opacity <= 1);
    previous = state.radius;
  }
  assert.equal(fireballEnvelope(0.8, fireball, light).radius, 1);
});

test('the geometry uses equal ground radius and vertical height in mercator units', () => {
  const identity = new Float64Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
  for (const latitude of [0, 40, -60]) {
    const m = localMercatorMatrix(identity, -74, latitude, 0.87);
    assert.equal(m[0], m[5]);
    assert.equal(m[5], m[10]);
    assert.ok(Math.abs(m[12] - 106 / 360) < 1e-7);
    assert.ok(m[0] > 0);
  }
});
