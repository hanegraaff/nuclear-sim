/** Inclusive product ceiling for each selectable weapon or custom yield, in megatons.
 * Aggregate multi-launch intensity and pure-model stress limits are independent. */
export const MAX_SELECTABLE_YIELD_MT = 1_500_000;

/** Whether a yield in megatons is finite, positive, and within the product ceiling. */
export function isSelectableYieldMt(yieldMt: number): boolean {
  return Number.isFinite(yieldMt) && yieldMt > 0 && yieldMt <= MAX_SELECTABLE_YIELD_MT;
}
