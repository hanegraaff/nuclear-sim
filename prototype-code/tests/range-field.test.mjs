import assert from "node:assert/strict";
import test from "node:test";
import { combineFieldIntensity, rangeFieldIntensity, rangeFieldColor, rangePaletteGradient, RANGE_FIELD_LUTS } from "../app/range-field.mjs";

test("single ranges fade continuously without bright borders or band jumps", () => {
  let previous = 1;
  for (let sample = 0; sample <= 1120; sample += 1) {
    const intensity = rangeFieldIntensity(sample / 1000);
    assert.ok(intensity <= previous);
    assert.ok(previous - intensity < 0.005);
    assert.equal(combineFieldIntensity(intensity, intensity), intensity);
    previous = intensity;
  }
  assert.equal(previous, 0);
  assert.ok(rangeFieldIntensity(1) > 0);
  assert.equal(rangeFieldIntensity(2), 0);
});

test("overlapping faint fields advance through the legend palette in both modes", () => {
  const faint = rangeFieldIntensity(0.86);
  for (const mode of ["audible", "visible"]) {
    let previous = faint;
    for (const count of [2, 4, 8, 16, 32]) {
      const intensity = combineFieldIntensity(faint, faint * count);
      assert.ok(intensity > previous);
      const color = rangeFieldColor(mode, intensity);
      const offset = Math.round(intensity * 1023) * 4;
      const rendered = [...RANGE_FIELD_LUTS[mode].slice(offset, offset + 4)];
      color.forEach((channel, index) => assert.ok(Math.abs(channel - rendered[index]) <= 1));
      assert.ok(color[0] > rangeFieldColor(mode, faint)[0]);
      previous = intensity;
    }
    assert.ok(previous > 0.85);
  }
});

test("fields are order independent, bounded, and sample the same colors as their legend", () => {
  const samples = [0.08, 0.23, 0.4, 0.1];
  const combine = (fields) => combineFieldIntensity(Math.max(...fields), fields.reduce((sum, value) => sum + value, 0));
  assert.ok(Math.abs(combine(samples) - combine([...samples].reverse())) < 1e-12);
  assert.equal(combineFieldIntensity(1, 100), 1);
  assert.equal(combineFieldIntensity(0, 0), 0);
  for (const mode of ["audible", "visible"]) {
    for (const value of [0, 0.4, 0.72, 1]) {
      const [red, green, blue] = rangeFieldColor(mode, value);
      assert.ok(rangePaletteGradient(mode).includes(`rgb(${red},${green},${blue}) ${value * 100}%`));
    }
    assert.equal(rangeFieldColor(mode, 0)[3], 0);
  }
});
