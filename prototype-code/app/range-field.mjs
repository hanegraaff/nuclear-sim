// Both the map and legend sample these same palettes, from faint to intense.
const PALETTES = {
  audible: [[0, 18, 61, 42], [0.4, 33, 166, 94], [0.72, 114, 255, 154], [1, 225, 255, 233]],
  visible: [[0, 16, 45, 102], [0.4, 23, 111, 211], [0.72, 105, 189, 255], [1, 226, 244, 255]],
};

/** @param {number} peak @param {number} sum */
export function combineFieldIntensity(peak, sum) {
  const overlap = Math.max(0, sum - peak);
  return Math.max(0, Math.min(1, peak + (1 - peak) * (1 - Math.exp(-overlap * 0.5))));
}

// Band midpoints correspond to the four legend markers. A soft tail extends
// beyond the nominal range, with no outline or extra brightness at the edge.
const DISTANCE_STOPS = [[0, 1], [0.11, 0.875], [0.335, 0.625], [0.585, 0.375], [0.86, 0.125], [1, 0.04], [1.12, 0]];

/** @param {number} normalizedDistance */
export function rangeFieldIntensity(normalizedDistance) {
  const distance = Math.max(0, normalizedDistance);
  for (let index = 1; index < DISTANCE_STOPS.length; index += 1) {
    const [start, startValue] = DISTANCE_STOPS[index - 1];
    const [end, endValue] = DISTANCE_STOPS[index];
    if (distance > end) continue;
    const fraction = (distance - start) / (end - start);
    const eased = fraction * fraction * (3 - 2 * fraction);
    return startValue + (endValue - startValue) * eased;
  }
  return 0;
}

/** @param {"audible" | "visible"} mode @param {number} intensity */
export function rangeFieldColor(mode, intensity) {
  const value = Math.max(0, Math.min(1, intensity));
  const stops = PALETTES[mode];
  for (let index = 1; index < stops.length; index += 1) {
    const previous = stops[index - 1];
    const next = stops[index];
    if (value > next[0]) continue;
    const fraction = (value - previous[0]) / (next[0] - previous[0]);
    const rgb = [1, 2, 3].map((channel) => Math.round(previous[channel] + (next[channel] - previous[channel]) * fraction));
    const feather = Math.min(1, value / 0.04);
    const alpha = Math.round((70 + 177 * Math.pow(value, 0.8)) * feather * feather * (3 - 2 * feather));
    return [...rgb, alpha];
  }
  return [0, 0, 0, 0];
}

/** @param {"audible" | "visible"} mode */
export function rangePaletteGradient(mode) {
  return `linear-gradient(90deg,${PALETTES[mode].map(([position, red, green, blue]) => `rgb(${red},${green},${blue}) ${position * 100}%`).join(",")})`;
}

/** @param {"audible" | "visible"} mode @param {number} intensity */
export function rangeMarkerColor(mode, intensity) {
  const [red, green, blue] = rangeFieldColor(mode, intensity);
  return `rgb(${red},${green},${blue})`;
}

export const RANGE_FIELD_LUTS = Object.fromEntries(
  ["audible", "visible"].map((mode) => {
    const lookup = new Uint8ClampedArray(1024 * 4);
    for (let index = 0; index < 1024; index += 1) {
      lookup.set(rangeFieldColor(/** @type {"audible" | "visible"} */ (mode), index / 1023), index * 4);
    }
    return [mode, lookup];
  }),
);
