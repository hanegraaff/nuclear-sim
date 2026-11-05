import type { Launch, LaunchFrame } from "../../application/launch";
import { fireballEnvelope, fireballMeshDetail, groundMetersPerPixel, hemisphereVertices, localMercatorMatrix } from "./fireballGeometry";

/** Camera values needed by the standalone WebGL canvas, in degrees and map zoom. */
export interface FireballCamera {
  readonly longitude: number;
  readonly zoom: number;
}

interface Mesh {
  readonly buffer: WebGLBuffer;
  readonly vertexCount: number;
}

interface Resources {
  readonly program: WebGLProgram;
  readonly meshes: { readonly compact: Mesh; readonly full: Mesh };
  readonly position: number;
  readonly matrix: WebGLUniformLocation;
  readonly time: WebGLUniformLocation;
  readonly cooling: WebGLUniformLocation;
  readonly opacity: WebGLUniformLocation;
}

/**
 * Reject a transformed dome only when its full unit-hemisphere bounding box
 * lies outside a horizontal or vertical clip plane. The bound deliberately
 * includes empty corners so pitched and edge-crossing domes stay visible.
 */
export function fireballIntersectsClipViewport(transform: ArrayLike<number>): boolean {
  if (transform.length !== 16) return true;
  for (const [axis, sign] of [[0, 1], [0, -1], [1, 1], [1, -1]] as const) {
    const base = transform[15]! + sign * transform[12 + axis]!;
    const x = transform[3]! + sign * transform[axis]!;
    const y = transform[7]! + sign * transform[4 + axis]!;
    const z = transform[11]! + sign * transform[8 + axis]!;
    if (base + Math.abs(x) + Math.abs(y) + Math.max(0, z) < 0) return false;
  }
  return true;
}

const VERTEX_SOURCE = `#version 300 es
in vec3 a_position;
uniform mat4 u_matrix;
out vec3 v_surface;
void main() {
  v_surface = a_position;
  gl_Position = u_matrix * vec4(a_position, 1.0);
}`;

const FRAGMENT_SOURCE = `#version 300 es
precision highp float;
in vec3 v_surface;
uniform float u_time;
uniform float u_cooling;
uniform float u_opacity;
out vec4 outColor;

float hash(vec3 p) {
  p = fract(p * .1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
    f.z
  );
}

void main() {
  vec3 normal = normalize(v_surface);
  vec3 flow = normal * 5.0 + vec3(u_time * .075, -u_time * .045, u_time * .085);
  float turbulence = noise(flow) * .57 + noise(flow * 2.06 + 7.1) * .28 + noise(flow * 4.12 - 3.7) * .15;
  float folds = smoothstep(.29, .73, turbulence);
  vec3 shadow = vec3(.76, .22, .045);
  vec3 hot = vec3(1.0, .58, .13);
  vec3 bright = vec3(1.0, .96, .62);
  vec3 surface = mix(shadow, hot, smoothstep(.22, .57, turbulence));
  surface = mix(surface, bright, smoothstep(.48, .77, turbulence) * .82);
  surface *= .9 + .1 * max(normal.z, 0.0);
  surface = mix(vec3(1.0, .99, .90), surface, u_cooling * .65);
  surface = mix(surface, vec3(1.0, .98, .80), pow(max(normal.z, 0.0), 2.5) * .22);
  outColor = vec4(surface, u_opacity * (.9 + .1 * folds));
}`;

/** Compile a shader and report its driver diagnostic if unsupported. */
function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to allocate a fireball shader.");
  try {
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const reason = gl.getShaderInfoLog(shader) ?? "unknown shader error";
      throw new Error(`Fireball shader failed: ${reason}`);
    }
    return shader;
  } catch (error) {
    gl.deleteShader(shader);
    throw error;
  }
}

/** Create the shared program and bounded buffers, releasing partial allocations on failure. */
function createResources(gl: WebGL2RenderingContext): Resources {
  const shaders: WebGLShader[] = [];
  const buffers: WebGLBuffer[] = [];
  let program: WebGLProgram | null = null;
  try {
    const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SOURCE);
    shaders.push(vertex);
    const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SOURCE);
    shaders.push(fragment);
    const linkedProgram = gl.createProgram();
    if (!linkedProgram) throw new Error("Unable to allocate the fireball program.");
    program = linkedProgram;
    gl.attachShader(linkedProgram, vertex);
    gl.attachShader(linkedProgram, fragment);
    gl.linkProgram(linkedProgram);
    if (!gl.getProgramParameter(linkedProgram, gl.LINK_STATUS)) {
      const reason = gl.getProgramInfoLog(linkedProgram) ?? "unknown program error";
      throw new Error(`Fireball program failed: ${reason}`);
    }
    const mesh = (rings: number, slices: number): Mesh => {
      const vertices = hemisphereVertices(rings, slices);
      const buffer = gl.createBuffer();
      if (!buffer) throw new Error("Unable to allocate fireball geometry.");
      buffers.push(buffer);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
      return { buffer, vertexCount: vertices.length / 3 };
    };
    const uniform = (name: string): WebGLUniformLocation => {
      const location = gl.getUniformLocation(linkedProgram, name);
      if (!location) throw new Error(`Missing fireball uniform ${name}.`);
      return location;
    };
    return {
      program: linkedProgram,
      meshes: { compact: mesh(10, 20), full: mesh(22, 44) },
      position: gl.getAttribLocation(linkedProgram, "a_position"),
      matrix: uniform("u_matrix"),
      time: uniform("u_time"),
      cooling: uniform("u_cooling"),
      opacity: uniform("u_opacity"),
    };
  } catch (error) {
    for (const buffer of buffers) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    throw error;
  } finally {
    for (const shader of shaders) gl.deleteShader(shader);
  }
}

/** Render one map-aligned hemisphere without owning launch state or a clock. */
export class FireballRenderer {
  private readonly gl: WebGL2RenderingContext;
  private resources: Resources | null;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly onContextRestored: () => void = () => {}) {
    const gl = canvas.getContext("webgl2", { alpha: true, antialias: true, premultipliedAlpha: true, preserveDrawingBuffer: true });
    if (!gl) throw new Error("WebGL2 is unavailable for the fireball overlay.");
    this.gl = gl;
    this.resources = createResources(gl);
    canvas.addEventListener("webglcontextlost", this.handleContextLost);
    canvas.addEventListener("webglcontextrestored", this.handleContextRestored);
  }

  /** Clear immediately on Reset or replacement; the 2D field remains independent. */
  clear(): void {
    const gl = this.gl;
    if (gl.isContextLost()) return;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  /** Paint the launch at elapsed ms through MapLibre's current world matrix. */
  render(matrix: ArrayLike<number>, camera: FireballCamera, launch: Launch | null, elapsedMs: number, width: number, height: number): void {
    this.renderMany(matrix, camera, launch ? [{ launch, elapsedMs }] : [], width, height);
  }

  /** Draw every visible impact dome with one clear and a bounded shared mesh. */
  renderMany(matrix: ArrayLike<number>, camera: FireballCamera, frames: readonly LaunchFrame[], width: number, height: number): void {
    const gl = this.gl;
    if (!this.resources || gl.isContextLost()) return;
    const ratio = Math.min(1.5, window.devicePixelRatio || 1);
    const pixelWidth = Math.max(1, Math.round(width * ratio));
    const pixelHeight = Math.max(1, Math.round(height * ratio));
    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
    }
    this.clear();
    if (width <= 0 || height <= 0 || frames.length === 0) return;
    const resources = this.resources;
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(resources.program);
    gl.enableVertexAttribArray(resources.position);
    for (const { launch, elapsedMs } of frames) {
      if (elapsedMs <= launch.flightMs) continue;
      const progress = Math.min(1, (elapsedMs - launch.flightMs) / launch.blastMs);
      const envelope = fireballEnvelope(progress, launch.radii.fireball, launch.radii.light);
      if (envelope.radius <= 0 || envelope.opacity <= 0) continue;
      const radiusKm = launch.radii.fireball * envelope.radius;
      const groundPoint = launch.route.target;
      const transform = localMercatorMatrix(matrix, groundPoint, radiusKm, camera.longitude);
      if (!fireballIntersectsClipViewport(transform)) continue;
      const pixelsPerMeter = 1 / groundMetersPerPixel(groundPoint.latitude, camera.zoom);
      const detail = frames.length >= 10 ? "compact" : fireballMeshDetail(radiusKm * 1000 * pixelsPerMeter);
      const mesh = resources.meshes[detail];
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffer);
      gl.vertexAttribPointer(resources.position, 3, gl.FLOAT, false, 0, 0);
      gl.uniformMatrix4fv(resources.matrix, false, transform);
      gl.uniform1f(resources.time, elapsedMs / 1000);
      gl.uniform1f(resources.cooling, envelope.cooling);
      gl.uniform1f(resources.opacity, envelope.opacity);
      gl.drawArrays(gl.TRIANGLES, 0, mesh.vertexCount);
    }
  }

  /** Release GPU buffers and context listeners when the map is disposed. */
  dispose(): void {
    this.canvas.removeEventListener("webglcontextlost", this.handleContextLost);
    this.canvas.removeEventListener("webglcontextrestored", this.handleContextRestored);
    if (this.resources && !this.gl.isContextLost()) {
      this.gl.deleteBuffer(this.resources.meshes.compact.buffer);
      this.gl.deleteBuffer(this.resources.meshes.full.buffer);
      this.gl.deleteProgram(this.resources.program);
    }
    this.resources = null;
    this.clear();
  }

  private readonly handleContextLost = (event: Event): void => {
    event.preventDefault();
    this.resources = null;
  };

  private readonly handleContextRestored = (): void => {
    try {
      this.resources = createResources(this.gl);
      this.onContextRestored();
    } catch (error) {
      console.warn("Unable to restore the 3D fireball; 2D blast remains available.", error);
      this.resources = null;
    }
  };
}

/** Attempt optional WebGL setup; a failure leaves the 2D blast usable. */
export function createFireballRenderer(canvas: HTMLCanvasElement, onContextRestored?: () => void): FireballRenderer | null {
  try {
    return new FireballRenderer(canvas, onContextRestored);
  } catch (error) {
    console.warn("Unable to initialize the 3D fireball; 2D blast remains available.", error);
    return null;
  }
}
