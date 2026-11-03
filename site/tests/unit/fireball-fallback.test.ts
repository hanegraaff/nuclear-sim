/** Optional WebGL failures leave Canvas 2D available and release partial GPU allocations. */
import { describe, expect, it, vi } from "vitest";
import { createFireballRenderer } from "../../src/rendering/animation/FireballRenderer";

type SetupFailure = "fragment" | "second-buffer" | "uniform";

/** Fake only WebGL resource setup; opaque handles make deletion observable without a browser. */
function fakeWebGL(failure: SetupFailure) {
  const vertex = {} as WebGLShader;
  const fragment = {} as WebGLShader;
  const program = {} as WebGLProgram;
  const compactBuffer = {} as WebGLBuffer;
  const fullBuffer = {} as WebGLBuffer;
  let shaderCount = 0;
  let bufferCount = 0;
  const gl = {
    VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, COMPILE_STATUS: 3, LINK_STATUS: 4,
    ARRAY_BUFFER: 5, STATIC_DRAW: 6,
    createShader: vi.fn(() => ++shaderCount === 1 ? vertex : fragment),
    shaderSource: vi.fn(), compileShader: vi.fn(),
    getShaderParameter: vi.fn((shader: WebGLShader) => failure !== "fragment" || shader !== fragment),
    getShaderInfoLog: vi.fn(() => "injected compilation failure"),
    deleteShader: vi.fn(),
    createProgram: vi.fn(() => program),
    attachShader: vi.fn(), linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    deleteProgram: vi.fn(),
    createBuffer: vi.fn(() => {
      bufferCount++;
      return failure === "second-buffer" && bufferCount === 2 ? null : bufferCount === 1 ? compactBuffer : fullBuffer;
    }),
    bindBuffer: vi.fn(), bufferData: vi.fn(), deleteBuffer: vi.fn(),
    getAttribLocation: vi.fn(() => 0),
    getUniformLocation: vi.fn(() => failure === "uniform" ? null : {} as WebGLUniformLocation),
  };
  const canvas = {
    getContext: () => gl as unknown as WebGL2RenderingContext,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
  } as unknown as HTMLCanvasElement;
  return { canvas, gl, vertex, fragment, program, compactBuffer, fullBuffer };
}

describe("optional fireball renderer", () => {
  it("returns no renderer and reports a developer warning when WebGL2 is unavailable", () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const canvas = { getContext: () => null } as unknown as HTMLCanvasElement;
      expect(createFireballRenderer(canvas)).toBeNull();
      expect(warning).toHaveBeenCalledWith(expect.stringContaining("2D blast remains available."), expect.any(Error));
    } finally {
      warning.mockRestore();
    }
  });

  it("deletes both shaders when fragment compilation fails after vertex allocation", () => {
    const { canvas, gl, vertex, fragment } = fakeWebGL("fragment");
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(createFireballRenderer(canvas)).toBeNull();
      expect(gl.deleteShader).toHaveBeenCalledTimes(2);
      expect(gl.deleteShader).toHaveBeenCalledWith(vertex);
      expect(gl.deleteShader).toHaveBeenCalledWith(fragment);
      expect(gl.createProgram).not.toHaveBeenCalled();
    } finally {
      warning.mockRestore();
    }
  });

  it("deletes the first buffer and program if the second mesh cannot allocate", () => {
    const { canvas, gl, vertex, fragment, program, compactBuffer } = fakeWebGL("second-buffer");
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(createFireballRenderer(canvas)).toBeNull();
      expect(gl.deleteBuffer).toHaveBeenCalledExactlyOnceWith(compactBuffer);
      expect(gl.deleteProgram).toHaveBeenCalledExactlyOnceWith(program);
      expect(gl.deleteShader).toHaveBeenCalledTimes(2);
      expect(gl.deleteShader).toHaveBeenCalledWith(vertex);
      expect(gl.deleteShader).toHaveBeenCalledWith(fragment);
    } finally {
      warning.mockRestore();
    }
  });

  it("deletes both buffers and the program if linked uniforms are unavailable", () => {
    const { canvas, gl, program, compactBuffer, fullBuffer } = fakeWebGL("uniform");
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(createFireballRenderer(canvas)).toBeNull();
      expect(gl.deleteBuffer).toHaveBeenCalledTimes(2);
      expect(gl.deleteBuffer).toHaveBeenCalledWith(compactBuffer);
      expect(gl.deleteBuffer).toHaveBeenCalledWith(fullBuffer);
      expect(gl.deleteProgram).toHaveBeenCalledExactlyOnceWith(program);
    } finally {
      warning.mockRestore();
    }
  });
});
