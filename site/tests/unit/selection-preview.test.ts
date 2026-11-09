/** R-03/R-15: dropdown candidates never mutate committed selection and conventional ordering stays numeric. */
import { describe, expect, it } from "vitest";
import { DEVICE_GROUPS } from "../../src/catalog/devices";
import { CLOSED_SELECTION_PREVIEW, findPreviewOption, movePreviewOption, reduceSelectionPreview } from "../../src/application/selectionPreview";
import { INITIAL_SIMULATOR_STATE } from "../../src/application/launch";

const options = [{ id: "mk-82", label: "Mk 82", group: "Conventional" }, { id: "moab", label: "MOAB", group: "Conventional" }, { id: "little-boy", label: "Little Boy", group: "Nuclear" }];

describe("focused dropdown preview lifetime", () => {
  it("opens without a preview, reveals a browsed candidate, and clears it immediately on dismissal", () => {
    const opened = reduceSelectionPreview(CLOSED_SELECTION_PREVIEW, { type: "open", id: "moab" });
    expect(opened).toEqual({ open: true, activeId: "moab", browsed: false, navigation: null });
    const browsed = reduceSelectionPreview(opened, { type: "browse", id: "little-boy" });
    expect(browsed).toEqual({ open: true, activeId: "little-boy", browsed: true, navigation: "keyboard" });
    expect(INITIAL_SIMULATOR_STATE.selectedId).toBe("fat-man");
    expect(INITIAL_SIMULATOR_STATE.cameraRequest).toBeNull();
    expect(INITIAL_SIMULATOR_STATE.launchGroups).toHaveLength(0);
    expect(reduceSelectionPreview(browsed, { type: "dismiss" })).toBe(CLOSED_SELECTION_PREVIEW);
  });

  it("ignores late candidate activity after focus loss and does not restore it on reopen", () => {
    const dismissed = reduceSelectionPreview({ open: true, activeId: "moab", browsed: true, navigation: "keyboard" }, { type: "dismiss" });
    expect(reduceSelectionPreview(dismissed, { type: "browse", id: "little-boy" })).toBe(dismissed);
    expect(reduceSelectionPreview(dismissed, { type: "open", id: "moab" }).browsed).toBe(false);
  });

  it("distinguishes natural wheel/pointer browsing from keyboard list alignment", () => {
    const opened = reduceSelectionPreview(CLOSED_SELECTION_PREVIEW, { type: "open", id: "moab" });
    const wheeled = reduceSelectionPreview(opened, { type: "browse", id: "little-boy", navigation: "scroll" });
    expect(wheeled.navigation).toBe("scroll");
    expect(reduceSelectionPreview(wheeled, { type: "browse", id: "little-boy" }).navigation).toBe("keyboard");
  });

  it("bounds arrow/page navigation and wraps typeahead through labels", () => {
    expect(movePreviewOption(options, "mk-82", -1)).toBe("mk-82");
    expect(movePreviewOption(options, "moab", 20)).toBe("little-boy");
    expect(movePreviewOption(options, "missing", 1)).toBe("moab");
    expect(findPreviewOption(options, "moab", "mk")).toBe("mk-82");
    expect(findPreviewOption(options, "moab", "LITTLE")).toBe("little-boy");
    expect(findPreviewOption(options, "moab", "unknown")).toBe("moab");
  });
});

describe("conventional strength ordering", () => {
  it("orders conventional choices by numeric energy from weakest to strongest", () => {
    const conventional = DEVICE_GROUPS[0]!.devices;
    expect(conventional.map((device) => device.id)).toEqual(["mk-82", "agm-158-jassm", "gbu-49", "mk-83", "mk-84", "moab", "foab"]);
    expect(conventional.every((device, index) => index === 0 || device.yieldMt > conventional[index - 1]!.yieldMt)).toBe(true);
  });

});
