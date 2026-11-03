/** A missing WebGL2 context must leave the independent Canvas 2D blast path available. */
import { describe, expect, it, vi } from "vitest";
import { createFireballRenderer } from "../../src/rendering/animation/FireballRenderer";

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
});
