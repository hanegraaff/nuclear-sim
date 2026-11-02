import { getDeviceById, type DeviceDefinition, type SingleDeviceDefinition } from "../catalog/devices";

/** The prototype's minimum custom yield, in megatons. */
export const MIN_CUSTOM_YIELD_MT = 1e-9;

/** The largest supported custom yield, matching the catalog's 1 Pt study, in Mt. */
export const MAX_CUSTOM_YIELD_MT = 1_000_000_000;

/** Stable ID for the custom choice; it is not one of the 47 catalog devices. */
export const CUSTOM_DEVICE_ID = "custom";

/** UI-independent selection state; custom input survives switching devices. */
export interface DeviceSelectionState {
  readonly selectedId: string;
  readonly customYieldInput: string;
}

/** Semantic actions that change the selected device or its custom yield text. */
export type DeviceSelectionAction =
  | { readonly type: "selectDevice"; readonly id: string }
  | { readonly type: "setCustomYieldInput"; readonly value: string };

/** Initial selection from the prototype: Fat Man, with a 1 Mt custom draft. */
export const INITIAL_DEVICE_SELECTION: DeviceSelectionState = {
  selectedId: "fat-man",
  customYieldInput: "1",
};

/** A parsed megaton yield or a user-facing validation message. */
export type CustomYieldResult =
  | { readonly valid: true; readonly yieldMt: number }
  | { readonly valid: false; readonly error: string };

const CUSTOM_YIELD_ERROR = "Enter a positive yield (0.000000001–1,000,000,000 Mt).";
const CUSTOM_YIELD_FORMAT_ERROR = "Enter a number; use a decimal point and group three digits.";
const PLAIN_YIELD_PATTERN = /^\+?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
const GROUPED_YIELD_PATTERN = /^\+?\d{1,3}([,_ ])\d{3}(?:\1\d{3})*(?:\.\d*)?(?:e[+-]?\d+)?$/i;

/**
 * Parse a finite custom yield in megatons within the prototype's supported
 * range. Optional grouping separators must consistently divide three digits.
 */
export function parseCustomYieldMt(input: string): CustomYieldResult {
  const trimmed = input.trim();
  if (!PLAIN_YIELD_PATTERN.test(trimmed) && !GROUPED_YIELD_PATTERN.test(trimmed)) {
    return { valid: false, error: CUSTOM_YIELD_FORMAT_ERROR };
  }
  const normalized = trimmed.replace(/[,_ ]/g, "");
  const yieldMt = Number(normalized);
  if (!Number.isFinite(yieldMt) || yieldMt < MIN_CUSTOM_YIELD_MT || yieldMt > MAX_CUSTOM_YIELD_MT) {
    return { valid: false, error: CUSTOM_YIELD_ERROR };
  }
  return { valid: true, yieldMt };
}

/** Pure selection transition; unknown IDs are rejected at the input boundary. */
export function reduceDeviceSelection(
  state: DeviceSelectionState,
  action: DeviceSelectionAction,
): DeviceSelectionState {
  if (action.type === "setCustomYieldInput") {
    if (state.customYieldInput === action.value) return state;
    return { ...state, customYieldInput: action.value };
  }
  if (action.id !== CUSTOM_DEVICE_ID && !getDeviceById(action.id)) {
    throw new RangeError(`Unknown device ID: ${action.id}`);
  }
  if (state.selectedId === action.id) return state;
  return { ...state, selectedId: action.id };
}

/** Resolved catalog or custom device for later model calculations and display. */
export type ResolvedDeviceSelection =
  | { readonly valid: true; readonly device: DeviceDefinition; readonly label: string; readonly custom: boolean }
  | { readonly valid: false; readonly device: null; readonly error: string; readonly custom: true };

/** Resolve the state without mutating it; invalid custom values cannot be launched. */
export function resolveDeviceSelection(state: DeviceSelectionState): ResolvedDeviceSelection {
  if (state.selectedId !== CUSTOM_DEVICE_ID) {
    const device = getDeviceById(state.selectedId);
    if (!device) throw new RangeError(`Unknown selected device ID: ${state.selectedId}`);
    return { valid: true, device, label: `${device.name} · ${device.displayYield}`, custom: false };
  }

  const parsed = parseCustomYieldMt(state.customYieldInput);
  if (!parsed.valid) return { valid: false, device: null, error: parsed.error, custom: true };
  const formattedYield = new Intl.NumberFormat("en-US", { maximumSignificantDigits: 9 }).format(parsed.yieldMt);
  const device: SingleDeviceDefinition = {
    id: CUSTOM_DEVICE_ID,
    name: "Custom yield",
    yieldMt: parsed.yieldMt,
    displayYield: `${formattedYield} Mt`,
  };
  return { valid: true, device, label: `${device.name} · ${device.displayYield}`, custom: true };
}
