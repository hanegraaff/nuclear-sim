/** Optical ground-light tests distinguish geographic falloff from the screen-space top-down decoration. */
import { describe, expect, it } from "vitest";
import { groundGlowColor } from "../../src/rendering/effects/groundGlow";

describe("pitched ground glow", () => {
  it("keeps the impact core white and fades to transparent outside its geographic halo", () => {
    expect(groundGlowColor(0, 0.2, 1)).toEqual({ red: 255, green: 255, blue: 255, alpha: 1 });
    const warmGround = groundGlowColor(0.5, 0.2, 1);
    expect(warmGround.red).toBeGreaterThan(warmGround.green);
    expect(warmGround.green).toBeGreaterThan(warmGround.blue);
    expect(warmGround.alpha).toBeGreaterThan(0);
    expect(warmGround.alpha).toBeLessThan(1);
    expect(groundGlowColor(1, 0.2, 1).alpha).toBe(0);
    expect(groundGlowColor(2, 0.2, 1).alpha).toBe(0);
  });

  it("leaves unprojectable ground and invalid optical scales transparent", () => {
    expect(groundGlowColor(Number.POSITIVE_INFINITY, 0.2, 1).alpha).toBe(0);
    expect(groundGlowColor(Number.NaN, 0.2, 1).alpha).toBe(0);
    expect(groundGlowColor(0.1, 0, 1).alpha).toBe(0);
    expect(groundGlowColor(0.1, 1, 0.2).alpha).toBe(0);
  });
});
