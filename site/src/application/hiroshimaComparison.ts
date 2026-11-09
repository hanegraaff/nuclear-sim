/** Conventional Hiroshima reference in megatons (15 kilotons), not a damage-equivalence claim. */
export const HIROSHIMA_YIELD_MT = 0.015;

/** Ratio and static logarithmic position within the supported custom-yield range. */
export interface HiroshimaComparison {
  readonly ratio: number;
  readonly label: string;
  readonly positionPercent: number;
}

/** Compare a finite positive TNT-equivalent yield in Mt to 15 kt; tiny values remain nonzero. */
export function compareWithHiroshima(yieldMt: number): HiroshimaComparison {
  if (!Number.isFinite(yieldMt) || yieldMt <= 0) throw new RangeError("Comparison requires a finite positive yield in Mt.");
  const ratio = yieldMt / HIROSHIMA_YIELD_MT;
  const label = ratio < 0.0001 || ratio >= 1e9
    ? ratio.toExponential(2).replace(/e\+?/, "e")
    : new Intl.NumberFormat("en-US", { maximumSignificantDigits: 4 }).format(ratio);
  const positionPercent = Math.max(0, Math.min(100, (Math.log10(yieldMt) + 9) / 18 * 100));
  return { ratio, label, positionPercent };
}
