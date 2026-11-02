/** @typedef {"blast" | "fallout" | "audible" | "visible"} EffectView */
/** @typedef {{ x: number, y: number }} Pixel */
/** @typedef {import("maplibre-gl").Map} EffectMap */

/** Shared presentation rules. An explicit mode switches immediately, even
 * before the next impact. @param {number} impactCount @param {boolean} [multiLaunch] */
export function explosionPresentation(impactCount, multiLaunch = impactCount > 1) {
  const single = impactCount === 1 && !multiLaunch;
  return { markers: single, ruler: single, divisions: single, legends: multiLaunch };
}

/** Mercator camera reprojection, in CSS pixels. @param {Pixel} anchor @param {number} zoomDelta @param {number} padding */
export function fieldCameraTransform(anchor, zoomDelta, padding) {
  const scale = 2 ** zoomDelta;
  return { scale, x: anchor.x - padding * scale, y: anchor.y - padding * scale };
}

/** @param {{x:number,y:number,scale:number}} transform @param {number} cachedWidth @param {number} cachedHeight @param {number} width @param {number} height */
export function fieldCoversViewport(transform, cachedWidth, cachedHeight, width, height) {
  return transform.x <= 0 && transform.y <= 0
    && transform.x + cachedWidth * transform.scale >= width
    && transform.y + cachedHeight * transform.scale >= height;
}

/**
 * One owner for field canvases, camera alignment, single/multiple presentation,
 * markers and zone outlines. Effect adapters retain their existing sampling,
 * palettes, glow and animation envelopes.
 */
export class ExplosionRenderer {
  constructor() {
    /** @type {{ key:string, canvas:HTMLCanvasElement, width:number, height:number, viewportWidth:number, viewportHeight:number, padding:number, zoom:number, bearing:number, pitch:number, anchor:{lng:number,lat:number} } | null} */
    this.cache = null;
  }

  invalidate() { this.cache = null; }

  /** @param {EffectMap} map @param {HTMLCanvasElement} canvas @param {number} [qualityCap] @param {boolean} [clear] */
  beginFrame(map, canvas, qualityCap = 2, clear = true) {
    const width = map.getContainer().clientWidth;
    const height = map.getContainer().clientHeight;
    const pixelRatio = Math.min(qualityCap, window.devicePixelRatio || 1);
    const targetWidth = Math.round(width * pixelRatio);
    const targetHeight = Math.round(height * pixelRatio);
    const resized = canvas.width !== targetWidth || canvas.height !== targetHeight;
    if (resized) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
    if (clear) context.clearRect(0, 0, width, height);
    return { width, height, pixelRatio, context, resized };
  }

  /** @param {Array<Partial<Record<string, HTMLButtonElement | null>>>} groups */
  hideMarkers(groups) {
    for (const group of groups) for (const marker of Object.values(group)) {
      if (!marker) continue;
      marker.style.opacity = "0";
      marker.style.visibility = "hidden";
      marker.style.pointerEvents = "none";
      marker.tabIndex = -1;
    }
  }

  /** @param {HTMLButtonElement | null | undefined} marker @param {Pixel} point @param {number} width @param {number} height */
  placeMarker(marker, point, width, height) {
    if (!marker || point.x <= 8 || point.x >= width - 8 || point.y <= 8 || point.y >= height - 8) return;
    marker.style.left = `${point.x}px`;
    marker.style.top = `${point.y}px`;
    marker.dataset.tooltipSide = point.x < width * 0.5 ? "right" : "left";
    marker.style.opacity = "1";
    marker.style.visibility = "visible";
    marker.style.pointerEvents = "none";
    marker.tabIndex = 0;
  }

  /**
   * Cached fields include an offscreen margin. Panning/zooming reprojects the
   * same image on every MapLibre render; expensive field sampling is needed
   * only when the margin is exhausted or the scene/camera geometry changes.
   * @param {EffectMap} map
   * @param {CanvasRenderingContext2D} output
   * @param {string} key
   * @param {(frame:{context:CanvasRenderingContext2D,width:number,height:number,padding:number,map:{project:(point:[number,number])=>Pixel,unproject:(point:[number,number])=>{lng:number,lat:number},getZoom:()=>number}})=>void} paint
   */
  paintField(map, output, key, paint) {
    const width = map.getContainer().clientWidth;
    const height = map.getContainer().clientHeight;
    let cache = this.cache;
    let transform = cache ? fieldCameraTransform(map.project([cache.anchor.lng, cache.anchor.lat]), map.getZoom() - cache.zoom, cache.padding) : null;
    const canReuse = cache && transform && cache.key === key
      && cache.viewportWidth === width && cache.viewportHeight === height
      && cache.bearing === map.getBearing() && cache.pitch === map.getPitch() && map.getPitch() === 0
      && Math.abs(map.getZoom() - cache.zoom) < 0.75
      && fieldCoversViewport(transform, cache.width, cache.height, width, height);

    if (!canReuse) {
      const padding = Math.ceil(Math.min(280, Math.max(width, height) * 0.24));
      const fieldWidth = width + padding * 2;
      const fieldHeight = height + padding * 2;
      const canvas = cache?.canvas ?? document.createElement("canvas");
      const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(fieldWidth * pixelRatio);
      canvas.height = Math.round(fieldHeight * pixelRatio);
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      const anchor = map.unproject([0, 0]);
      paint({
        context, width: fieldWidth, height: fieldHeight, padding,
        map: {
          project: (point) => { const projected = map.project(point); return { x: projected.x + padding, y: projected.y + padding }; },
          unproject: (point) => map.unproject([point[0] - padding, point[1] - padding]),
          getZoom: () => map.getZoom(),
        },
      });
      cache = { key, canvas, width: fieldWidth, height: fieldHeight, viewportWidth: width, viewportHeight: height, padding, zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch(), anchor };
      this.cache = cache;
      transform = { x: -padding, y: -padding, scale: 1 };
    }
    if (!cache || !transform) return;
    output.save();
    output.globalCompositeOperation = "source-over";
    output.imageSmoothingEnabled = true;
    output.imageSmoothingQuality = "high";
    output.drawImage(cache.canvas, transform.x, transform.y, cache.width * transform.scale, cache.height * transform.scale);
    output.restore();
  }

  /** @param {CanvasRenderingContext2D} context @param {Pixel[]} points @param {{color:string,alpha?:number,width?:number,glow?:number}} style */
  drawDivision(context, points, style) {
    if (points.length < 2) return;
    context.save();
    context.globalCompositeOperation = "source-over";
    context.globalAlpha = style.alpha ?? 0.7;
    context.strokeStyle = style.color;
    context.lineWidth = style.width ?? 1.2;
    context.shadowColor = style.color;
    context.shadowBlur = style.glow ?? 3;
    context.beginPath();
    points.forEach((point, index) => index === 0 ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y));
    context.closePath();
    context.stroke();
    context.restore();
  }

  /** Trace the existing field's actual dose thresholds without changing its fill.
   * @param {CanvasRenderingContext2D} context @param {Float32Array} samples
   * @param {number} width @param {number} height @param {number} renderScale
   * @param {ReadonlyArray<{threshold:number,color:string}>} zones
   */
  drawScalarDivisions(context, samples, width, height, renderScale, zones) {
    const step = 2;
    for (const zone of zones) {
      context.save();
      context.strokeStyle = zone.color;
      context.globalAlpha = 0.55;
      context.lineWidth = 0.95;
      context.shadowColor = zone.color;
      context.shadowBlur = 3;
      context.beginPath();
      for (let y = 0; y < height - step; y += step) for (let x = 0; x < width - step; x += step) {
        const values = [samples[y * width + x], samples[y * width + x + step], samples[(y + step) * width + x + step], samples[(y + step) * width + x]];
        const corners = [[x + 0.5, y + 0.5], [x + step + 0.5, y + 0.5], [x + step + 0.5, y + step + 0.5], [x + 0.5, y + step + 0.5]];
        const crossings = [];
        for (let edge = 0; edge < 4; edge++) {
          const next = (edge + 1) % 4;
          if ((values[edge] >= zone.threshold) === (values[next] >= zone.threshold)) continue;
          const fraction = (zone.threshold - values[edge]) / (values[next] - values[edge]);
          crossings.push({ x: (corners[edge][0] + (corners[next][0] - corners[edge][0]) * fraction) / renderScale, y: (corners[edge][1] + (corners[next][1] - corners[edge][1]) * fraction) / renderScale });
        }
        for (let pair = 0; pair + 1 < crossings.length; pair += 2) {
          context.moveTo(crossings[pair].x, crossings[pair].y);
          context.lineTo(crossings[pair + 1].x, crossings[pair + 1].y);
        }
      }
      context.stroke();
      context.restore();
    }
  }

  /** @param {CanvasRenderingContext2D} context @param {Pixel[]} points @param {{color:string,alpha?:number,width?:number,dashes?:number[]}} style */
  drawRuler(context, points, style) {
    context.save();
    context.globalCompositeOperation = "source-over";
    context.globalAlpha = style.alpha ?? 0.92;
    context.strokeStyle = style.color;
    context.lineWidth = style.width ?? 1.2;
    context.setLineDash(style.dashes ?? [4, 4]);
    context.beginPath();
    points.forEach((point, index) => index === 0 ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y));
    context.stroke();
    context.restore();
  }
}
