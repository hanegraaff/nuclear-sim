import assert from 'node:assert/strict';
import test from 'node:test';
import { useScreenGroundSampling, sampleRadialRow } from '../app/ground-sampling.mjs';

test('large and zoomed-in fields use viewport sampling on desktop and mobile', () => {
  assert.equal(useScreenGroundSampling(5, 40, 2, 1280, 720), false);
  assert.equal(useScreenGroundSampling(18, 40, 2, 1280, 720), true);
  assert.equal(useScreenGroundSampling(13, 40, 2, 390, 844), true);
});

test('radial sampling preserves the center and interpolates toward the edge', () => {
  const row = new Uint8ClampedArray(192 * 4);
  for (let i = 0; i < 192; i++) { row[i * 4] = 255 - i; row[i * 4 + 1] = i; row[i * 4 + 3] = 255; }
  const output = new Uint8ClampedArray(8);
  sampleRadialRow(row, 0, output, 0);
  sampleRadialRow(row, 0.5, output, 4);
  assert.deepEqual([...output.slice(0, 4)], [255, 0, 0, 255]);
  assert.ok(output[4] < output[0] && output[5] > output[1]);
  assert.equal(output[7], 255);
});
