// A ground-anchored, illustrative hemispherical fireball. Dimensions are in
// Mercator meters, so the map camera—not a screen-size guess—sets its size.
const EARTH_CIRCUMFERENCE_M = 40075016.68557849;
const clamp = (x) => Math.max(0, Math.min(1, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// The severe-destruction zone begins at the fireball's outer edge. Complete
// the dome as the animated blast front reaches that edge, not at an arbitrary
// percentage of the total blast animation.
export function fireballEnvelope(progress, fireballKm = 1, lightKm = 1) {
  const p = clamp(progress);
  const travelled = (1 - Math.pow(1 - p, 2.15)) * Math.max(0, lightKm);
  const growth = clamp(travelled / Math.max(0.000001, fireballKm));
  return {
    radius: smooth(0, 1, growth),
    opacity: smooth(0, 0.14, growth),
    cooling: smooth(0.02, 0.42, p),
  };
}

// Translate in double precision before uploading to the GPU. This avoids
// catastrophic loss of position precision at the highest map zoom levels.
export function localMercatorMatrix(matrix, lng, lat, radiusKm) {
  const latitude = Math.max(-85, Math.min(85, lat)) * Math.PI / 180;
  const x = (lng + 180) / 360;
  const y = (1 - Math.log(Math.tan(Math.PI / 4 + latitude / 2)) / Math.PI) / 2;
  const s = radiusKm * 1000 / (EARTH_CIRCUMFERENCE_M * Math.cos(latitude));
  const result = new Float32Array(16);
  for (let row = 0; row < 4; row++) {
    result[row] = matrix[row] * s;
    result[4 + row] = matrix[4 + row] * s;
    result[8 + row] = matrix[8 + row] * s;
    result[12 + row] = matrix[row] * x + matrix[4 + row] * y + matrix[12 + row];
  }
  return result;
}

export function fireballMeshDetail(pixelRadius) {
  return pixelRadius < 32 ? 'compact' : 'full';
}

function hemisphere(rings = 22, slices = 44) {
  const vertices = [];
  const point = (r, s) => {
    const polar = r / rings * Math.PI / 2, azimuth = s / slices * Math.PI * 2;
    return [Math.sin(polar) * Math.cos(azimuth), Math.sin(polar) * Math.sin(azimuth), Math.cos(polar)];
  };
  for (let r = 0; r < rings; r++) for (let s = 0; s < slices; s++) {
    vertices.push(...point(r, s), ...point(r + 1, s), ...point(r + 1, s + 1));
    vertices.push(...point(r, s), ...point(r + 1, s + 1), ...point(r, s + 1));
  }
  return new Float32Array(vertices);
}

const vertexSource = `#version 300 es
in vec3 a_position;
uniform mat4 u_matrix;
out vec3 v_surface;
void main() {
  v_surface = a_position;
  gl_Position = u_matrix * vec4(a_position, 1.0);
}`;

const fragmentSource = `#version 300 es
precision highp float;
in vec3 v_surface;
uniform float u_time;
uniform float u_cooling;
uniform float u_opacity;
out vec4 outColor;
float hash(vec3 p) { p = fract(p * .1031); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }
float noise(vec3 p) {
  vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
void main() {
  vec3 n = normalize(v_surface);
  vec3 p = n * 5.0 + vec3(u_time * .075, -u_time * .045, u_time * .085);
  float turbulence = noise(p) * .57 + noise(p*2.06 + 7.1) * .28 + noise(p*4.12 - 3.7) * .15;
  float folds = smoothstep(.29, .73, turbulence);
  vec3 shadow = vec3(.76, .22, .045);
  vec3 hot = vec3(1.0, .58, .13);
  vec3 bright = vec3(1.0, .96, .62);
  vec3 surface = mix(shadow, hot, smoothstep(.22, .57, turbulence));
  surface = mix(surface, bright, smoothstep(.48, .77, turbulence) * .82);
  surface *= .9 + .1 * max(n.z, 0.0);
  surface = mix(vec3(1.0, .99, .90), surface, u_cooling * .80);
  outColor = vec4(surface, u_opacity * (.9 + .1 * folds));
}`;

export class FireballRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: true });
    const gl = this.gl;
    if (!gl) return;
    const shader = (type, source) => {
      const item = gl.createShader(type);
      if (!item) throw new Error('Unable to create fireball shader');
      gl.shaderSource(item, source); gl.compileShader(item);
      if (!gl.getShaderParameter(item, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(item) || 'Fireball shader failed');
      return item;
    };
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, shader(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'Fireball program failed');
    this.program = program;
    this.meshes = {};
    for (const [name, vertices] of [['full', hemisphere()], ['compact', hemisphere(10, 20)]]) {
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
      this.meshes[name] = { buffer, vertexCount: vertices.length / 3 };
    }
    this.position = gl.getAttribLocation(program, 'a_position');
    this.matrix = gl.getUniformLocation(program, 'u_matrix');
    this.time = gl.getUniformLocation(program, 'u_time');
    this.cooling = gl.getUniformLocation(program, 'u_cooling');
    this.opacity = gl.getUniformLocation(program, 'u_opacity');
  }

  clear() {
    if (!this.gl) return;
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  }

  render(matrix, map, balls, now) {
    const gl = this.gl;
    if (!gl || !this.program) return;
    const container = map.getContainer();
    const ratio = Math.min(1.5, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(container.clientWidth * ratio));
    const h = Math.max(1, Math.round(container.clientHeight * ratio));
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    gl.viewport(0, 0, w, h);
    this.clear();
    if (!balls.length) return;
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(this.program);
    gl.enableVertexAttribArray(this.position);
    let activeMesh = '';
    for (const ball of balls) {
      const envelope = fireballEnvelope(ball.progress, ball.radiusKm, ball.lightKm);
      if (envelope.opacity <= 0 || envelope.radius <= 0) continue;
      const metersPerPixel = 78271.516964 * Math.max(0.04, Math.cos(ball.lat * Math.PI / 180)) / 2 ** map.getZoom();
      const detail = fireballMeshDetail(ball.radiusKm * envelope.radius * 1000 / metersPerPixel);
      if (detail !== activeMesh) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.meshes[detail].buffer);
        gl.vertexAttribPointer(this.position, 3, gl.FLOAT, false, 0, 0);
        activeMesh = detail;
      }
      const longitude = ball.lng + Math.round((map.getCenter().lng - ball.lng) / 360) * 360;
      gl.uniformMatrix4fv(this.matrix, false, localMercatorMatrix(matrix, longitude, ball.lat, ball.radiusKm * envelope.radius));
      gl.uniform1f(this.time, now / 1000);
      gl.uniform1f(this.cooling, envelope.cooling);
      gl.uniform1f(this.opacity, envelope.opacity);
      gl.drawArrays(gl.TRIANGLES, 0, this.meshes[detail].vertexCount);
    }
  }
}
