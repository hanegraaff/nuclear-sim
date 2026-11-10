import { isSelectableYieldMt } from "../catalog/selectableYield";
import { getDeviceById, type DeviceDefinition } from "../catalog/devices";
import { blastRadiiForYield } from "../domain/blast";
import type { GeoPoint } from "../domain/geodesy";
import { mirvImpactTargets } from "../domain/mirv";
import type { LaunchIntent } from "./launch";

/** Immutable device and geographic target snapshot made at one map click. */
export interface PreparedLaunch {
  readonly intent: LaunchIntent;
  readonly mirvTargets: readonly GeoPoint[] | null;
}

/** Derive a click's physical target pattern from the selected catalog device. */
export function prepareLaunch(device: DeviceDefinition, aim: GeoPoint): PreparedLaunch {
  if ((device.id !== "custom" && !getDeviceById(device.id)) || !isSelectableYieldMt(device.yieldMt)) {
    throw new RangeError("Launch requires a retained device and a yield at or below 1.5 Tt.");
  }
  const mirvTargets = device.warheadCount
    ? mirvImpactTargets(aim, device.warheadCount, blastRadiiForYield(device.warheadYieldMt).light)
    : null;
  return { intent: { deviceId: device.id, yieldMt: device.yieldMt }, mirvTargets };
}
