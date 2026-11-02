const EARTH_RADIUS_KM = 6371;
const RAD = Math.PI / 180;

export function shouldPaintBlastField({ resized, cameraChanged, settledChanged, expanding, sinceLastPaint, interval }) {
  return resized || cameraChanged || settledChanged || (expanding && sinceLastPaint >= interval);
}

export class CameraGeometryCache {
  constructor(maxEntries = 128) {
    this.maxEntries = maxEntries;
    this.cameraKey = '';
    this.entries = new Map();
  }

  get(map, geometryKey, build) {
    const center = map.getCenter(), container = map.getContainer();
    const key = JSON.stringify([center.lng, center.lat, map.getZoom(), map.getBearing(), map.getPitch(), map.getPadding(), container.clientWidth, container.clientHeight]);
    if (key !== this.cameraKey) { this.entries.clear(); this.cameraKey = key; }
    if (this.entries.has(geometryKey)) {
      const value = this.entries.get(geometryKey);
      this.entries.delete(geometryKey); this.entries.set(geometryKey, value);
      return value;
    }
    const value = build();
    if (value !== null) {
      if (this.entries.size >= this.maxEntries) this.entries.delete(this.entries.keys().next().value);
      this.entries.set(geometryKey, value);
    }
    return value;
  }
}

// The camera's ground coordinates are shared by all blast fields. Distances
// for each ground zero remain valid until the camera or viewport changes.
export class GroundDistanceCache {
  constructor(maxDistanceBytes = 32 * 1024 * 1024) {
    this.maxDistanceBytes = maxDistanceBytes;
    this.key = '';
    this.ground = null;
    this.distances = new Map();
    this.distanceBytes = 0;
  }

  clear() {
    this.key = '';
    this.ground = null;
    this.distances.clear();
    this.distanceBytes = 0;
  }

  get(map, origin, width, height, renderScale) {
    const center = map.getCenter();
    const key = JSON.stringify([width, height, renderScale, center.lng, center.lat, map.getZoom(), map.getBearing(), map.getPitch(), map.getPadding()]);
    if (key !== this.key) {
      this.clear();
      this.key = key;
    }
    const originKey = `${origin.lng},${origin.lat}`;
    const cached = this.distances.get(originKey);
    if (cached) {
      this.distances.delete(originKey);
      this.distances.set(originKey, cached);
      return cached;
    }
    const count = width * height;
    if (!this.ground) {
      const sinLat = new Float64Array(count), cosLat = new Float64Array(count);
      const sinLng = new Float64Array(count), cosLng = new Float64Array(count);
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const point = map.unproject([(x + 0.5) / renderScale, (y + 0.5) / renderScale]);
        const latitude = point.lat * RAD, longitude = point.lng * RAD, index = y * width + x;
        sinLat[index] = Math.sin(latitude); cosLat[index] = Math.cos(latitude);
        sinLng[index] = Math.sin(longitude); cosLng[index] = Math.cos(longitude);
      }
      this.ground = { sinLat, cosLat, sinLng, cosLng };
    }
    const { sinLat, cosLat, sinLng, cosLng } = this.ground;
    const latitude = origin.lat * RAD, longitude = origin.lng * RAD;
    const originSinLat = Math.sin(latitude), originCosLat = Math.cos(latitude);
    const originSinLng = Math.sin(longitude), originCosLng = Math.cos(longitude);
    const result = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const cosine = originSinLat * sinLat[i] + originCosLat * cosLat[i] * (originCosLng * cosLng[i] + originSinLng * sinLng[i]);
      result[i] = EARTH_RADIUS_KM * Math.acos(Math.max(-1, Math.min(1, cosine)));
    }
    // Keep the working set stable when the number of strikes exceeds the
    // memory budget. Evicting on every miss would make a 100-strike scene
    // repeatedly discard all its entries in the same render order.
    if (this.distanceBytes + result.byteLength <= this.maxDistanceBytes) {
      this.distances.set(originKey, result);
      this.distanceBytes += result.byteLength;
    }
    return result;
  }
}
