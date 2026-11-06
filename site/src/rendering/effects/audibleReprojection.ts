import type { MapCameraAdapter, ScreenPoint, UnwrappedGeoPoint } from "../map/MapCameraAdapter";
import { audibleColor } from "./audiblePalette";

const MESH_COLUMNS = 12;
const MESH_ROWS = 8;
const MAX_WARP_COLUMNS = 512;
const MAX_WARP_ROWS = 384;

interface WarpScratch {
  readonly canvas: HTMLCanvasElement;
  readonly context: CanvasRenderingContext2D;
}

const warpScratch = new WeakMap<HTMLCanvasElement, WarpScratch>();

const alphaByGreen = Uint8Array.from({ length: 256 }, (_, green) => {
  const intensity = green <= 166 ? Math.max(0, (green - 61) * 0.4 / 105)
    : 0.4 + Math.min(1, (green - 166) / 89) * 0.32;
  return audibleColor(intensity)[3];
});
const alphaByRedAtMint = Uint8Array.from({ length: 256 }, (_, red) =>
  audibleColor(0.72 + Math.max(0, Math.min(1, (red - 114) / 111)) * 0.28)[3]);

/** Restore palette opacity after triangle clipping; unpremultiplied RGB retains intensity even where coverage is partial. */
export function restoreAudibleMeshAlpha(image: ImageData): void {
  const bytes = image.data;
  for (let offset = 0; offset < bytes.length; offset += 4) {
    if (bytes[offset + 3] === 0) continue;
    bytes[offset + 3] = bytes[offset + 1]! < 255
      ? alphaByGreen[bytes[offset + 1]!]!
      : alphaByRedAtMint[bytes[offset]!]!;
  }
}

/** Reuse a small CPU-readable canvas so pitched reprojection never scans the full viewport. */
function pitchedScratch(output: CanvasRenderingContext2D, source: HTMLCanvasElement, mesh: AudibleReprojectionMesh): { scratch: WarpScratch; width: number; height: number } | null {
  if (!output.canvas || typeof output.getTransform !== "function") return null;
  const transform = output.getTransform();
  const targetWidth = output.canvas.width / Math.max(0.001, Math.hypot(transform.a, transform.b));
  const targetHeight = output.canvas.height / Math.max(0.001, Math.hypot(transform.c, transform.d));
  if (!Number.isFinite(targetWidth) || !Number.isFinite(targetHeight)) return null;
  const columns = Math.max(1, Math.min(MAX_WARP_COLUMNS, Math.ceil(targetWidth * source.width / mesh.width)));
  const rows = Math.max(1, Math.min(MAX_WARP_ROWS, Math.ceil(targetHeight * source.height / mesh.height)));
  let scratch = warpScratch.get(source);
  if (!scratch) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    scratch = { canvas, context };
    warpScratch.set(source, scratch);
  }
  if (scratch.canvas.width !== columns) scratch.canvas.width = columns;
  if (scratch.canvas.height !== rows) scratch.canvas.height = rows;
  return { scratch, width: targetWidth, height: targetHeight };
}

interface MeshVertex {
  readonly source: ScreenPoint;
  readonly geographic: UnwrappedGeoPoint | null;
}

/** Geographic anchors of a completed CSS-pixel mask, including world copies. */
export interface AudibleReprojectionMesh {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  readonly pitch: number;
  readonly sourceCenterLongitude: number;
  readonly vertices: readonly MeshVertex[];
}

/** Capture a bounded geographic mesh once, before the camera can move. */
export function captureAudibleReprojection(camera: MapCameraAdapter, width: number, height: number, left = 0, top = 0): AudibleReprojectionMesh {
  const vertices: MeshVertex[] = [];
  for (let row = 0; row <= MESH_ROWS; row++) for (let column = 0; column <= MESH_COLUMNS; column++) {
    const source = { x: left + column * width / MESH_COLUMNS, y: top + row * height / MESH_ROWS };
    let geographic: UnwrappedGeoPoint | null = null;
    try { geographic = camera.toGeoUnwrapped(source); } catch { /* Sky pixels do not anchor a ground triangle. */ }
    vertices.push({ source, geographic });
  }
  return {
    left, top, width, height, pitch: camera.snapshot().pitch,
    sourceCenterLongitude: camera.unwrappedCenterLongitude(), vertices,
  };
}

interface AffineTransform {
  readonly a: number; readonly b: number; readonly c: number;
  readonly d: number; readonly e: number; readonly f: number;
}

/** Expand a projected triangle by one CSS pixel so antialiased clips overlap instead of leaving a half-alpha seam. */
function expandedTriangle(points: readonly [ScreenPoint, ScreenPoint, ScreenPoint], guardPx: number): [ScreenPoint, ScreenPoint, ScreenPoint] {
  const twiceArea = (points[1].x - points[0].x) * (points[2].y - points[0].y)
    - (points[1].y - points[0].y) * (points[2].x - points[0].x);
  const winding = twiceArea >= 0 ? 1 : -1;
  const normals = points.map((point, index) => {
    const next = points[(index + 1) % 3]!;
    const dx = next.x - point.x;
    const dy = next.y - point.y;
    const length = Math.hypot(dx, dy) || 1;
    return { x: winding * dy / length, y: -winding * dx / length };
  });
  return points.map((point, index) => {
    const previous = normals[(index + 2) % 3]!;
    const current = normals[index]!;
    const denominator = Math.max(0.25, 1 + previous.x * current.x + previous.y * current.y);
    const dx = guardPx * (previous.x + current.x) / denominator;
    const dy = guardPx * (previous.y + current.y) / denominator;
    const length = Math.hypot(dx, dy);
    const limit = guardPx * 4;
    const fraction = length > limit ? limit / length : 1;
    return { x: point.x + dx * fraction, y: point.y + dy * fraction };
  }) as [ScreenPoint, ScreenPoint, ScreenPoint];
}

/** Solve a source-to-destination triangle transform in CSS pixels. */
function triangleTransform(source: readonly [ScreenPoint, ScreenPoint, ScreenPoint], destination: readonly [ScreenPoint, ScreenPoint, ScreenPoint]): AffineTransform | null {
  const [a, b, c] = source;
  const [p, q, r] = destination;
  const determinant = (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);
  if (!Number.isFinite(determinant) || Math.abs(determinant) < 1e-6) return null;
  const scaleX = ((q.x - p.x) * (c.y - a.y) - (r.x - p.x) * (b.y - a.y)) / determinant;
  const shearX = ((r.x - p.x) * (b.x - a.x) - (q.x - p.x) * (c.x - a.x)) / determinant;
  const shearY = ((q.y - p.y) * (c.y - a.y) - (r.y - p.y) * (b.y - a.y)) / determinant;
  const scaleY = ((r.y - p.y) * (b.x - a.x) - (q.y - p.y) * (c.x - a.x)) / determinant;
  const translateX = p.x - scaleX * a.x - shearX * a.y;
  const translateY = p.y - shearY * a.x - scaleY * a.y;
  if (![scaleX, shearY, shearX, scaleY, translateX, translateY].every(Number.isFinite)) return null;
  return { a: scaleX, b: shearY, c: shearX, d: scaleY, e: translateX, f: translateY };
}

/** Project one stored world copy without independently wrapping mesh vertices. */
function projectedVertex(mesh: AudibleReprojectionMesh, camera: MapCameraAdapter, shift: number, index: number): ScreenPoint | null {
  const geographic = mesh.vertices[index]?.geographic;
  if (!geographic) return null;
  try {
    const point = camera.toScreenUnwrapped({ longitude: geographic.longitude + shift, latitude: geographic.latitude });
    return Number.isFinite(point.x) && Number.isFinite(point.y) ? point : null;
  } catch { return null; }
}

/**
 * Reproject a completed mask from stored geographic anchors into the moving
 * camera. Flat Mercator uses one exact affine transform; pitch uses bounded
 * ground triangles. Returns false when no safe ground projection is available.
 */
export function drawAudibleReprojection(context: CanvasRenderingContext2D, source: HTMLCanvasElement, mesh: AudibleReprojectionMesh, camera: MapCameraAdapter): boolean {
  const stride = MESH_COLUMNS + 1;
  const shift = Math.round((camera.unwrappedCenterLongitude() - mesh.sourceCenterLongitude) / 360) * 360;
  if (Math.abs(mesh.pitch) < 0.01 && Math.abs(camera.snapshot().pitch) < 0.01) {
    const indices = [0, MESH_COLUMNS, MESH_ROWS * stride] as const;
    const points = indices.map((index) => projectedVertex(mesh, camera, shift, index));
    if (points.every((point) => point !== null)) {
      const transform = triangleTransform(indices.map((index) => mesh.vertices[index]!.source) as [ScreenPoint, ScreenPoint, ScreenPoint], points as [ScreenPoint, ScreenPoint, ScreenPoint]);
      if (transform) {
        context.save();
        context.transform(transform.a, transform.b, transform.c, transform.d, transform.e, transform.f);
        context.drawImage(source, mesh.left, mesh.top, mesh.width, mesh.height);
        context.restore();
        return true;
      }
    }
  }
  const projected = mesh.vertices.map((_, index) => projectedVertex(mesh, camera, shift, index));
  const target = pitchedScratch(context, source, mesh);
  const paint = target?.scratch.context ?? context;
  if (target) {
    paint.setTransform(1, 0, 0, 1, 0, 0);
    paint.clearRect(0, 0, target.scratch.canvas.width, target.scratch.canvas.height);
    paint.setTransform(target.scratch.canvas.width / target.width, 0, 0,
      target.scratch.canvas.height / target.height, 0, 0);
  }
  let drawn = false;
  for (let row = 0; row < MESH_ROWS; row++) for (let column = 0; column < MESH_COLUMNS; column++) {
    const upperLeft = row * stride + column;
    const sourceX = mesh.left + column * mesh.width / MESH_COLUMNS;
    const sourceY = mesh.top + row * mesh.height / MESH_ROWS;
    const maskX = column * source.width / MESH_COLUMNS;
    const maskY = row * source.height / MESH_ROWS;
    const maskWidth = source.width / MESH_COLUMNS;
    const maskHeight = source.height / MESH_ROWS;
    // Canvas interpolation at a subrect edge can blend against transparency.
    // Include neighboring source texels while the destination clip determines
    // which triangle contributes to this cell.
    const guardX = Math.max(0, maskX - 1);
    const guardY = Math.max(0, maskY - 1);
    const guardRight = Math.min(source.width, maskX + maskWidth + 1);
    const guardBottom = Math.min(source.height, maskY + maskHeight + 1);
    const guardSourceX = sourceX - (maskX - guardX) * mesh.width / source.width;
    const guardSourceY = sourceY - (maskY - guardY) * mesh.height / source.height;
    const guardSourceWidth = (guardRight - guardX) * mesh.width / source.width;
    const guardSourceHeight = (guardBottom - guardY) * mesh.height / source.height;
    const triangles = [
      [upperLeft, upperLeft + 1, upperLeft + stride],
      [upperLeft + 1, upperLeft + stride + 1, upperLeft + stride],
    ] as const;
    for (const indices of triangles) {
      const points = indices.map((index) => projected[index]);
      if (points.some((point) => point === null)) continue;
      const destination = points as [ScreenPoint, ScreenPoint, ScreenPoint];
      // A horizon-crossing or wrapped triangle can project across the entire
      // world; omit it until the new camera mask is ready.
      if (destination.some((point) => Math.abs(point.x) > mesh.width * 8 || Math.abs(point.y) > mesh.height * 8)) continue;
      const sourceTriangle = indices.map((index) => mesh.vertices[index]!.source) as [ScreenPoint, ScreenPoint, ScreenPoint];
      const transform = triangleTransform(sourceTriangle, destination);
      if (!transform) continue;
      const clipTriangle = expandedTriangle(destination, 0.5);
      paint.save();
      paint.beginPath();
      paint.moveTo(clipTriangle[0].x, clipTriangle[0].y);
      paint.lineTo(clipTriangle[1].x, clipTriangle[1].y);
      paint.lineTo(clipTriangle[2].x, clipTriangle[2].y);
      paint.closePath();
      paint.clip();
      paint.transform(transform.a, transform.b, transform.c, transform.d, transform.e, transform.f);
      paint.drawImage(source, guardX, guardY, guardRight - guardX, guardBottom - guardY,
        guardSourceX, guardSourceY, guardSourceWidth, guardSourceHeight);
      paint.restore();
      drawn = true;
    }
  }
  if (drawn && target) {
    const image = paint.getImageData(0, 0, target.scratch.canvas.width, target.scratch.canvas.height);
    restoreAudibleMeshAlpha(image);
    paint.putImageData(image, 0, 0);
    context.drawImage(target.scratch.canvas, 0, 0, target.width, target.height);
  }
  return drawn;
}
