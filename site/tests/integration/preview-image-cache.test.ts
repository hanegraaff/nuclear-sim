/** R-18: delayed image work is cancellable and decoded preview memory has explicit bounds. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PreviewImageCache } from "../../src/ui/previewImageCache";

// A 1200×800 decoded image costs 3,840,000 bytes; browser HTTP caching is outside this owned cache.
let width = 1200;
let height = 800;
let created = 0;
let revoked: string[] = [];
beforeEach(() => {
  width = 1200; height = 800; created = 0; revoked = [];
  vi.stubGlobal("Image", class { naturalWidth = width; naturalHeight = height; src = ""; decoding = ""; decode = () => Promise.resolve(); });
  vi.stubGlobal("URL", { createObjectURL: () => `blob:fixture-${++created}`, revokeObjectURL: (url: string) => revoked.push(url) });
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, blob: async () => new Blob(["deterministic image fixture"]) })));
});
afterEach(() => vi.unstubAllGlobals());

describe("preview artwork cache", () => {
  it("retains only two decoded images and releases every retained URL on dismissal", async () => {
    const cache = new PreviewImageCache(); const signal = new AbortController().signal;
    await cache.load("/one.webp", signal); await cache.load("/two.webp", signal);
    expect(cache.size).toBe(2); expect(cache.totalBytes).toBe(7_680_000);
    await cache.load("/three.webp", signal);
    expect(cache.size).toBe(2); expect(revoked).toContain("blob:fixture-1");
    cache.clear(); expect(cache.size).toBe(0); expect(cache.totalBytes).toBe(0); expect(revoked).toHaveLength(3);
  });

  it("reuses a warm image without a network request and evicts least recently used data", async () => {
    const cache = new PreviewImageCache(); const signal = new AbortController().signal;
    const one = await cache.load("/one.webp", signal); await cache.load("/two.webp", signal);
    expect(await cache.load("/one.webp", signal)).toBe(one);
    expect(fetch).toHaveBeenCalledTimes(2);
    await cache.load("/three.webp", signal);
    expect(revoked).toEqual(["blob:fixture-2"]); cache.clear();
  });

  it("does not populate the cache when a delayed response arrives after dropdown blur", async () => {
    let release!: (value: unknown) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise((resolve) => { release = resolve; })));
    const cache = new PreviewImageCache(); const controller = new AbortController();
    const loading = cache.load("/late.webp", controller.signal);
    controller.abort(); release({ ok: true, blob: async () => new Blob(["late image"]) });
    await expect(loading).rejects.toHaveProperty("name", "AbortError");
    expect(cache.size).toBe(0); expect(created).toBe(0);
  });

  it("rejects oversized decoded images and failed downloads without retaining resources", async () => {
    width = 3000; height = 2000;
    const cache = new PreviewImageCache(); const signal = new AbortController().signal;
    await expect(cache.load("/large.webp", signal)).rejects.toThrow("memory budget");
    expect(cache.size).toBe(0); expect(revoked).toHaveLength(1);
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false })));
    await expect(cache.load("/missing.webp", signal)).rejects.toThrow("unavailable");
    await expect(cache.load("/missing.webp", signal)).rejects.toThrow("unavailable");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(cache.size).toBe(0);
  });
});
