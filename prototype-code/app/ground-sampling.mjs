// Switch before the ground mesh crosses the camera horizon. The decision is
// made in viewport pixels so it works at every zoom and on small screens.
export function useScreenGroundSampling(zoom, latitude, radiusKm, width, height) {
  const metersPerPixel = 78271.516964 * Math.max(0.04, Math.cos(latitude * Math.PI / 180)) / 2 ** zoom;
  return radiusKm * 1000 / metersPerPixel > Math.min(width, height) * 0.5;
}

export function sampleRadialRow(samples, normalizedDistance, output, offset) {
  const sample = Math.max(0, Math.min(190.999, normalizedDistance * 191));
  const index = Math.floor(sample), fraction = sample - index;
  for (let channel = 0; channel < 4; channel++) {
    output[offset + channel] = samples[index * 4 + channel] * (1 - fraction) + samples[(index + 1) * 4 + channel] * fraction;
  }
}
