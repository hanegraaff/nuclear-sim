/** Selection reducer and custom-yield validation remain independent of React. */
import { describe, expect, it } from "vitest";
import {
  CUSTOM_DEVICE_ID,
  INITIAL_DEVICE_SELECTION,
  MAX_CUSTOM_YIELD_MT,
  MIN_CUSTOM_YIELD_MT,
  parseCustomYieldMt,
  reduceDeviceSelection,
  resolveDeviceSelection,
} from "../../src/application/deviceSelection";

describe("device selection", () => {
  it("starts on Fat Man and changes catalog devices without losing the custom draft", () => {
    expect(resolveDeviceSelection(INITIAL_DEVICE_SELECTION)).toMatchObject({
      valid: true,
      device: { id: "fat-man", yieldMt: 0.021 },
      label: "Fat Man · 21 kt",
    });
    const custom = reduceDeviceSelection(INITIAL_DEVICE_SELECTION, { type: "selectDevice", id: CUSTOM_DEVICE_ID });
    const edited = reduceDeviceSelection(custom, { type: "setCustomYieldInput", value: "2.5" });
    const catalog = reduceDeviceSelection(edited, { type: "selectDevice", id: "tsar-bomba" });
    expect(resolveDeviceSelection(catalog)).toMatchObject({ valid: true, label: "Tsar Bomba · 50 Mt" });
    expect(reduceDeviceSelection(catalog, { type: "selectDevice", id: CUSTOM_DEVICE_ID }).customYieldInput).toBe("2.5");
    expect(() => reduceDeviceSelection(catalog, { type: "selectDevice", id: "missing" })).toThrow(RangeError);
  });

  it.each(["", " ", "0", "-1", "Infinity", "NaN", "0x10", "1e999", "1e10", "1e-10", "1e-300", "1e-323"])(
    "rejects invalid custom input %j",
    (input) => expect(parseCustomYieldMt(input)).toMatchObject({ valid: false }),
  );

  it.each(["1,5", "1 2", "1_00", "1,000_000", "1e 3", "1,000,00", "12,34.5"])(
    "rejects ambiguous or malformed grouping %j instead of changing its magnitude",
    (input) => expect(parseCustomYieldMt(input)).toMatchObject({ valid: false, error: expect.stringContaining("group three digits") }),
  );

  it.each([
    ["0.000000001", MIN_CUSTOM_YIELD_MT],
    ["1e-9", MIN_CUSTOM_YIELD_MT],
    ["2.5", 2.5],
    ["1,000", 1000],
    ["1_000", 1000],
    ["1 000", 1000],
    ["1,000,000.5", 1_000_000.5],
    ["1e3", 1000],
    [String(MAX_CUSTOM_YIELD_MT), MAX_CUSTOM_YIELD_MT],
  ])("accepts positive custom input %s as %s Mt", (input, expected) => {
    expect(parseCustomYieldMt(input)).toEqual({ valid: true, yieldMt: expected });
  });

  it("resolves a valid custom yield and blocks an invalid one", () => {
    const selected = reduceDeviceSelection(INITIAL_DEVICE_SELECTION, { type: "selectDevice", id: CUSTOM_DEVICE_ID });
    const valid = reduceDeviceSelection(selected, { type: "setCustomYieldInput", value: "3.25" });
    expect(resolveDeviceSelection(valid)).toMatchObject({
      valid: true,
      custom: true,
      device: { id: "custom", yieldMt: 3.25 },
      label: "Custom yield · 3.25 Mt",
    });
    const invalid = reduceDeviceSelection(valid, { type: "setCustomYieldInput", value: "-3.25" });
    expect(resolveDeviceSelection(invalid)).toMatchObject({ valid: false, custom: true, device: null });
  });
});
