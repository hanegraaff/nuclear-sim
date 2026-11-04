import type { CloudPresentation } from "../../application/cloudPresentation";
import { formatCloudHeight } from "../../application/cloudPresentation";

/** Pixel geometry of the independent cloud instrument's plotting area. */
export interface CloudPlotGeometry {
  readonly centerX: number;
  readonly scaleX: number;
  readonly topY: number;
  readonly baseY: number;
  readonly cloudTopY: number;
}

/** Locate the silhouette and vertical height scale in CSS pixels. */
export function cloudPlotGeometry(width: number, height: number, growth: number): CloudPlotGeometry {
  const scaleX = width - 42;
  const topY = 13;
  const baseY = height - 17;
  return {
    centerX: Math.max(58, Math.min(scaleX - 45, width * 0.47)),
    scaleX,
    topY,
    baseY,
    cloudTopY: baseY - (baseY - topY) * growth,
  };
}

/** Format a vertical scale tick from kilometers, retaining meters below 1 km. */
export function formatCloudScaleTick(heightKm: number): string {
  return formatCloudHeight(heightKm).replace(" km", "");
}

/** Stable texture sample so a paused frame has no random visual drift. */
function noise(seed: number): number {
  const value = Math.sin(seed * 127.1 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

/** Paint one soft smoke puff with an optional amber heat tint. */
function paintPuff(context: CanvasRenderingContext2D, x: number, y: number, radius: number, shade: number, opacity: number, heat: number): void {
  const red = Math.round(72 + shade * 95 + 122 * heat);
  const green = Math.round(69 + shade * 82 + 77 * heat);
  const blue = Math.round(66 + shade * 70 + 29 * heat);
  const gradient = context.createRadialGradient(x - radius * 0.28, y - radius * 0.34, radius * 0.04, x, y, radius);
  gradient.addColorStop(0, `rgba(${red},${green},${blue},${opacity})`);
  gradient.addColorStop(0.43, `rgba(${red - 31},${green - 28},${blue - 26},${opacity * 0.82})`);
  gradient.addColorStop(0.8, `rgba(39,38,35,${opacity * 0.33})`);
  gradient.addColorStop(1, "rgba(25,25,24,0)");
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
}

/** Paint the fixed scale, dashed grid, and current-height reference line. */
function paintScale(context: CanvasRenderingContext2D, state: CloudPresentation, geometry: CloudPlotGeometry): void {
  const { scaleX, topY, baseY, cloudTopY, centerX } = geometry;
  context.save();
  context.strokeStyle = "rgba(166,190,182,.1)";
  context.setLineDash([2, 5]);
  for (let tick = 0; tick <= 4; tick += 1) {
    const y = baseY - (baseY - topY) * tick / 4;
    context.beginPath(); context.moveTo(12, y); context.lineTo(scaleX, y); context.stroke();
  }
  context.setLineDash([]);
  context.strokeStyle = "rgba(224,232,226,.52)";
  context.beginPath(); context.moveTo(scaleX, topY); context.lineTo(scaleX, baseY); context.stroke();
  context.font = "650 7px ui-monospace, SFMono-Regular, Menlo, monospace";
  for (let tick = 0; tick <= 4; tick += 1) {
    const y = baseY - (baseY - topY) * tick / 4;
    context.beginPath(); context.moveTo(scaleX - 4, y); context.lineTo(scaleX + 3, y); context.stroke();
    if (tick === 0 || state.progress > 0) {
      context.fillStyle = tick === 4 ? "rgba(245,248,241,.86)" : "rgba(151,164,156,.68)";
      context.fillText(tick === 0 ? "0" : formatCloudScaleTick(state.peakHeightKm * tick / 4), scaleX + 6, y + 2.5);
    }
  }
  if (state.orbitalScale && state.progress > 0) {
    const y = baseY - (baseY - topY) * Math.min(1, 100 / state.peakHeightKm);
    context.strokeStyle = "rgba(91,197,255,.62)";
    context.setLineDash([4, 4]);
    context.beginPath(); context.moveTo(12, y); context.lineTo(scaleX, y); context.stroke();
    context.setLineDash([]);
    context.fillStyle = "rgba(125,214,255,.82)";
    context.fillText("100 KM · SPACE", 15, Math.max(9, y - 3));
  }
  if (state.progress > 0) {
    context.strokeStyle = state.nuclear ? "rgba(255,173,82,.82)" : "rgba(220,208,180,.72)";
    context.setLineDash([3, 3]);
    context.beginPath(); context.moveTo(centerX + 38, cloudTopY); context.lineTo(scaleX - 1, cloudTopY); context.stroke();
    context.setLineDash([]);
    context.font = "750 8px ui-monospace, SFMono-Regular, Menlo, monospace";
    const labelWidth = context.measureText(state.heightLabel).width + 9;
    context.fillStyle = "rgba(8,10,10,.9)";
    context.fillRect(scaleX - labelWidth - 3, Math.max(2, cloudTopY - 11), labelWidth, 11);
    context.fillStyle = "#ffd69c";
    context.fillText(state.heightLabel, scaleX - labelWidth + 1, Math.max(10, cloudTopY - 3));
  }
  context.restore();
}

/** Conventional detonations show a broad, low dust column without a mushroom cap. */
function paintConventionalPlume(context: CanvasRenderingContext2D, state: CloudPresentation, geometry: CloudPlotGeometry): void {
  const { centerX, baseY, cloudTopY } = geometry;
  const riseHeight = Math.max(5, baseY - cloudTopY);
  for (let index = 0; index < 55; index += 1) {
    const fraction = noise(index * 13.7 + 2.1);
    const y = baseY - fraction * riseHeight;
    const spread = 8 + (1 - fraction) * 27 + state.progress * 12;
    const x = centerX + (noise(index * 17.2 + 8.3) - 0.5) * spread * 2;
    const radius = 3.5 + noise(index * 9.4 + 4.1) * 7.5;
    paintPuff(context, x, y, radius, 0.18 + noise(index * 5.7) * 0.38, 0.3 + state.progress * 0.22, 0);
  }
}

/** Paint the rising stem, soft cap, ground glow, and brief ignition flash. */
function paintSilhouette(context: CanvasRenderingContext2D, state: CloudPresentation, geometry: CloudPlotGeometry): void {
  if (state.progress <= 0) return;
  const { centerX, baseY, cloudTopY } = geometry;
  const progress = state.progress;
  const stem = Math.min(1, Math.max(0, (progress - 0.055) / 0.66));
  const cap = Math.min(1, Math.max(0, (progress - 0.18) / 0.68));
  const heat = Math.max(0, 1 - progress * 1.14);
  const ground = context.createRadialGradient(centerX, baseY - 2, 0, centerX, baseY - 2, 54);
  ground.addColorStop(0, `rgba(255,249,210,${0.72 * Math.min(1, progress * 8)})`);
  ground.addColorStop(0.22, `rgba(255,122,30,${0.5 * (0.45 + heat)})`);
  ground.addColorStop(0.62, `rgba(185,35,9,${0.16 * (0.3 + heat)})`);
  ground.addColorStop(1, "rgba(92,16,4,0)");
  context.fillStyle = ground;
  context.fillRect(centerX - 58, baseY - 58, 116, 64);
  if (!state.nuclear) {
    paintConventionalPlume(context, state, geometry);
    return;
  }
  if (stem > 0) {
    const stemTop = Math.min(baseY - 9, cloudTopY + 20);
    const half = 4.5 + 5.2 * stem;
    const topHalf = half * (1.05 + 1.45 * cap);
    const gradient = context.createLinearGradient(centerX - half * 2, 0, centerX + half * 2, 0);
    gradient.addColorStop(0, "rgba(37,38,36,.14)");
    gradient.addColorStop(0.25, "rgba(78,72,65,.62)");
    gradient.addColorStop(0.48, `rgba(241,187,105,${0.24 + 0.5 * heat})`);
    gradient.addColorStop(0.78, "rgba(80,73,67,.62)");
    gradient.addColorStop(1, "rgba(31,32,31,.12)");
    context.fillStyle = gradient;
    context.beginPath();
    context.moveTo(centerX - half * 1.75, baseY);
    context.bezierCurveTo(centerX - half * 0.5, baseY - 20, centerX - half * 1.4, stemTop + 25, centerX - topHalf, stemTop);
    context.quadraticCurveTo(centerX, stemTop - 4 * cap, centerX + topHalf, stemTop);
    context.bezierCurveTo(centerX + half * 1.4, stemTop + 25, centerX + half * 0.5, baseY - 20, centerX + half * 1.75, baseY);
    context.closePath(); context.fill();
    for (let index = 0; index < 15; index += 1) {
      const fraction = (index + 0.5) / 15;
      const y = baseY - (baseY - stemTop) * fraction;
      const x = centerX + (noise(index * 9.31) - 0.5) * half * 1.4;
      paintPuff(context, x, y, 3 + noise(index * 7.13) * 5, 0.25, 0.28 + 0.17 * stem, fraction < 0.58 ? heat : 0);
    }
  }
  if (cap > 0) {
    const capWidth = 18 + cap * 70;
    const capHeight = 8 + cap * 23;
    const capY = cloudTopY + capHeight * 0.68;
    const underside = context.createRadialGradient(centerX, capY + capHeight * 0.36, 2, centerX, capY + capHeight * 0.28, capWidth);
    underside.addColorStop(0, `rgba(35,31,29,${0.7 * cap})`);
    underside.addColorStop(0.48, `rgba(54,49,44,${0.56 * cap})`);
    underside.addColorStop(0.8, `rgba(83,73,64,${0.22 * cap})`);
    underside.addColorStop(1, "rgba(35,31,29,0)");
    context.fillStyle = underside;
    context.beginPath(); context.ellipse(centerX, capY + capHeight * 0.28, capWidth, capHeight * 0.8, 0, 0, Math.PI * 2); context.fill();
    for (let index = 0; index < 94; index += 1) {
      const horizontal = noise(index * 17.31 + 1.2) * 2 - 1;
      const dome = Math.sqrt(Math.max(0, 1 - horizontal * horizontal));
      const layer = noise(index * 17.31 + 4.7);
      const x = centerX + horizontal * capWidth * (0.82 + layer * 0.16);
      const y = capY - dome * capHeight * (0.52 + layer * 0.48) + (noise(index * 17.31 + 8.1) - 0.5) * capHeight * 0.6;
      const radius = 5 + noise(index * 17.31 + 11.8) * 7 + cap * 3;
      paintPuff(context, x, y, radius, 0.34 + noise(index * 17.31 + 5.3) * 0.46, 0.4 + cap * 0.28, heat > 0.18 && layer < 0.55 ? heat : 0);
    }
    for (let index = 0; index < 18; index += 1) {
      const horizontal = noise(900 + index * 13.7) * 1.34 - 0.67;
      const crown = 1 - Math.abs(horizontal);
      const x = centerX + horizontal * capWidth * 0.72;
      const y = capY - capHeight * (0.6 + crown * 0.48) + (noise(904 + index * 13.7) - 0.5) * capHeight * 0.24;
      paintPuff(context, x, y, 4.4 + noise(908 + index * 13.7) * 7.4, 0.48, 0.34 + cap * 0.3, heat > 0.16 ? heat : 0);
    }
    const torus = Math.min(1, Math.max(0, (progress - 0.28) / 0.55));
    for (let index = 0; index < 24; index += 1) {
      const angle = index / 24 * Math.PI * 2 + 0.11;
      const front = Math.sin(angle) > 0;
      const x = centerX + Math.cos(angle) * capWidth * (0.68 + torus * 0.14);
      const y = capY + Math.sin(angle) * capHeight * (0.2 + torus * 0.1);
      paintPuff(context, x, y, 3.4 + noise(index * 5.4) * 5.4, front ? 0.23 : 0.42, (front ? 0.24 : 0.14) + torus * 0.22, 0);
    }
    const shear = Math.min(1, Math.max(0, (cap - 0.5) / 0.5));
    if (shear > 0) {
      context.save();
      context.lineCap = "round";
      for (const side of [-1, 1]) {
        for (let layer = 0; layer < 3; layer += 1) {
          const originX = centerX + side * capWidth * (0.54 + layer * 0.1);
          const originY = capY - capHeight * (0.2 - layer * 0.14);
          const reach = capWidth * (0.26 + shear * (0.24 + layer * 0.08));
          context.strokeStyle = `rgba(152,147,137,${(0.11 + layer * 0.035) * shear})`;
          context.lineWidth = 2.8 - layer * 0.55;
          context.beginPath();
          context.moveTo(originX, originY);
          context.bezierCurveTo(originX + side * reach * 0.35, originY - 4 - layer * 2, originX + side * reach * 0.72, originY + 2 + layer * 2, originX + side * reach, originY - 1 + layer * 3);
          context.stroke();
        }
      }
      context.restore();
    }
  }
  if (progress < 0.32 && state.nuclear) {
    const life = progress / 0.32;
    const radius = 5 + Math.sin(life * Math.PI * 0.72) * 20;
    const y = baseY - 9 - stem * 17;
    const flash = context.createRadialGradient(centerX, y, 0, centerX, y, radius);
    flash.addColorStop(0, "rgba(255,255,255,1)");
    flash.addColorStop(0.18, "rgba(255,251,206,.98)");
    flash.addColorStop(0.48, "rgba(255,153,45,.82)");
    flash.addColorStop(1, "rgba(229,43,8,0)");
    context.save(); context.globalCompositeOperation = "screen";
    context.fillStyle = flash; context.beginPath(); context.arc(centerX, y, radius, 0, Math.PI * 2); context.fill();
    context.restore();
  }
}

/** Render one deterministic cloud frame in CSS-pixel coordinates. */
export function paintCloudProfile(context: CanvasRenderingContext2D, width: number, height: number, state: CloudPresentation): void {
  context.clearRect(0, 0, width, height);
  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, "rgba(11,15,15,.86)");
  background.addColorStop(0.62, "rgba(6,9,10,.94)");
  background.addColorStop(1, "rgba(3,5,6,.98)");
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);
  const geometry = cloudPlotGeometry(width, height, state.growth);
  paintSilhouette(context, state, geometry);
  paintScale(context, state, geometry);
}
