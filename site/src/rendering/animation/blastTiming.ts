/** Prototype's fast-first expansion fraction for a normalized blast age. */
export function blastExpansion(progress: number): number {
  const bounded = Math.max(0, Math.min(1, progress));
  return 1 - (1 - bounded) ** 2.15;
}
