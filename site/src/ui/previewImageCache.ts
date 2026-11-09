/** Loaded static preview image and its decoded pixel memory estimate in bytes. */
export interface CachedPreviewImage {
  readonly src: string;
  readonly bytes: number;
}

/** A bounded cache of object URLs and decoded images, scoped to the open desktop picker. */
export class PreviewImageCache {
  private readonly entries = new Map<string, CachedPreviewImage>();
  private readonly decoded = new Map<string, HTMLImageElement>();
  private readonly failed = new Set<string>();

  /** Load one same-origin asset; aborted candidate work never populates or reopens the preview. */
  async load(url: string, signal: AbortSignal): Promise<CachedPreviewImage> {
    if (this.failed.has(url)) throw new Error("Preview image unavailable");
    try { return await this.loadAsset(url, signal); }
    catch (error) { if (!signal.aborted) this.failed.add(url); throw error; }
  }

  private async loadAsset(url: string, signal: AbortSignal): Promise<CachedPreviewImage> {
    const cached = this.entries.get(url);
    if (cached) { this.entries.delete(url); this.entries.set(url, cached); return cached; }
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error("Preview image unavailable");
    const blob = await response.blob();
    if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
    const src = URL.createObjectURL(blob);
    const image = new Image(); image.decoding = "async"; image.src = src;
    try {
      await image.decode();
      if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
      const bytes = image.naturalWidth * image.naturalHeight * 4;
      if (bytes > 16 * 1024 * 1024) throw new Error("Preview image exceeds memory budget");
      while (this.entries.size >= 2 || this.totalBytes + bytes > 16 * 1024 * 1024) this.evict();
      const result = { src, bytes }; this.entries.set(url, result); this.decoded.set(url, image); return result;
    } catch (error) { image.src = ""; URL.revokeObjectURL(src); throw error; }
  }

  /** Current application-owned decoded memory estimate in bytes, excluding browser HTTP cache. */
  get totalBytes(): number { return [...this.entries.values()].reduce((sum, value) => sum + value.bytes, 0); }

  /** Number of retained images; never more than two regardless of catalog size. */
  get size(): number { return this.entries.size; }

  /** Release every object URL and decoded image when dropdown focus or open lifetime ends. */
  clear(): void { while (this.entries.size) this.evict(); this.failed.clear(); }

  private evict(): void {
    const key = this.entries.keys().next().value;
    if (key === undefined) return;
    const entry = this.entries.get(key)!;
    const image = this.decoded.get(key); if (image) image.src = "";
    URL.revokeObjectURL(entry.src); this.entries.delete(key); this.decoded.delete(key);
  }
}
