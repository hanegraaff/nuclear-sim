/** A selectable device's yield in megatons; labels preserve prototype wording. */
export interface SingleDeviceDefinition {
  readonly id: string;
  readonly name: string;
  readonly yieldMt: number;
  readonly displayYield: string;
  readonly warheadCount?: never;
  readonly warheadYieldMt?: never;
}

/** A modeled delivery system with an explicit yield for each reentry vehicle. */
export interface MirvDeviceDefinition {
  readonly id: string;
  readonly name: string;
  readonly yieldMt: number;
  readonly displayYield: string;
  readonly warheadCount: number;
  readonly warheadYieldMt: number;
}

/** One prototype catalog choice, with internal yield measured in megatons. */
export type DeviceDefinition = SingleDeviceDefinition | MirvDeviceDefinition;

/** The four visual groups and their exact select labels, in prototype order. */
export type DeviceGroupId = "conventional" | "nuclear" | "mirv" | "hypothetical";

/** Grouped device choices for the selector and future catalog lookups. */
export interface DeviceGroup {
  readonly id: DeviceGroupId;
  readonly label: string;
  readonly devices: readonly DeviceDefinition[];
}

const CONVENTIONAL_DEVICES = [
  // Ascending TNT-equivalent yield; sourced estimates are documented in docs/model.md.
  { id: "mk-82", name: "Mk 82 (Tritonal)", yieldMt: 0.000000093, displayYield: "93 kg TNT · estimated" },
  { id: "agm-158-jassm", name: "AGM-158 JASSM", yieldMt: 0.000000116, displayYield: "116 kg TNT · estimated" },
  { id: "gbu-49", name: "GBU-49", yieldMt: 0.000000146, displayYield: "146 kg TNT · estimated" },
  { id: "mk-83", name: "Mk 83 (Tritonal)", yieldMt: 0.000000216, displayYield: "216 kg TNT · estimated" },
  { id: "mk-84", name: "Mk 84 (Tritonal)", yieldMt: 0.000000459, displayYield: "459 kg TNT · estimated" },
  { id: "moab", name: "GBU-43/B MOAB", yieldMt: 0.000011, displayYield: "11 t TNT" },
  { id: "foab", name: "FOAB (reported)", yieldMt: 0.000044, displayYield: "44 t TNT · reported" },
] as const satisfies readonly SingleDeviceDefinition[];

const NUCLEAR_DEVICES = [
  { id: "w54", name: "W54 / Davy Crockett", yieldMt: 0.00002, displayYield: "0.02 kt" },
  { id: "w48", name: "W48 artillery shell", yieldMt: 0.000072, displayYield: "0.072 kt" },
  { id: "sadm", name: "W54 SADM", yieldMt: 0.001, displayYield: "1 kt" },
  { id: "little-boy", name: "Little Boy", yieldMt: 0.015, displayYield: "15 kt" },
  { id: "trinity-gadget", name: "Trinity Gadget", yieldMt: 0.0186, displayYield: "18.6 kt" },
  { id: "fat-man", name: "Fat Man", yieldMt: 0.021, displayYield: "21 kt" },
  { id: "rds-1", name: "RDS-1 / First Lightning", yieldMt: 0.022, displayYield: "22 kt" },
  { id: "b61", name: "B61-12 (max)", yieldMt: 0.05, displayYield: "50 kt" },
  { id: "gerboise-bleue", name: "Gerboise Bleue", yieldMt: 0.07, displayYield: "70 kt" },
  { id: "w76", name: "W76-1", yieldMt: 0.09, displayYield: "90 kt" },
  { id: "sedan", name: "Sedan Test Device", yieldMt: 0.104, displayYield: "104 kt" },
  { id: "w80", name: "W80", yieldMt: 0.15, displayYield: "150 kt" },
  { id: "greenhouse-george", name: "Greenhouse George", yieldMt: 0.225, displayYield: "225 kt" },
  { id: "w87", name: "W87", yieldMt: 0.3, displayYield: "300 kt" },
  { id: "b61-7", name: "B61-7 (max)", yieldMt: 0.34, displayYield: "340 kt" },
  { id: "rds-6s", name: "RDS-6s / Joe-4", yieldMt: 0.4, displayYield: "400 kt" },
  { id: "w88", name: "W88", yieldMt: 0.475, displayYield: "475 kt" },
  { id: "ivy-king", name: "Ivy King", yieldMt: 0.5, displayYield: "500 kt" },
  { id: "orange-herald", name: "Orange Herald", yieldMt: 0.72, displayYield: "720 kt" },
  { id: "w59", name: "W59", yieldMt: 1, displayYield: "1 Mt" },
  { id: "b83", name: "B83", yieldMt: 1.2, displayYield: "1.2 Mt" },
  { id: "starfish-prime", name: "Starfish Prime / W49", yieldMt: 1.4, displayYield: "1.4 Mt" },
  { id: "rds-37", name: "RDS-37 test yield", yieldMt: 1.6, displayYield: "1.6 Mt" },
  { id: "grapple-x", name: "Grapple X / Round C", yieldMt: 1.8, displayYield: "1.8 Mt" },
  { id: "canopus", name: "Canopus", yieldMt: 2.6, displayYield: "2.6 Mt" },
  { id: "grapple-y", name: "Grapple Y", yieldMt: 3, displayYield: "3 Mt" },
  { id: "w39", name: "W39", yieldMt: 3.8, displayYield: "3.8 Mt" },
  { id: "b53", name: "B53", yieldMt: 9, displayYield: "9 Mt" },
  { id: "hard-tack-poplar", name: "Hardtack Poplar", yieldMt: 9.3, displayYield: "9.3 Mt" },
  { id: "ivy-mike", name: "Ivy Mike", yieldMt: 10.4, displayYield: "10.4 Mt" },
  { id: "castle-yankee", name: "Castle Yankee", yieldMt: 13.5, displayYield: "13.5 Mt" },
  { id: "castle-bravo", name: "Castle Bravo", yieldMt: 15, displayYield: "15 Mt" },
  { id: "mk41", name: "Mark 41", yieldMt: 25, displayYield: "25 Mt" },
  { id: "tsar-bomba", name: "Tsar Bomba", yieldMt: 50, displayYield: "50 Mt" },
] as const satisfies readonly SingleDeviceDefinition[];

const MIRV_DEVICES = [
  { id: "rs-24-yars", name: "RS-24 Yars / SS-29", yieldMt: 0.525, displayYield: "3 × 175 kt · modeled", warheadCount: 3, warheadYieldMt: 0.175 },
  { id: "rsm-56-bulava", name: "RSM-56 Bulava / SS-NX-30", yieldMt: 1.2, displayYield: "10 × 120 kt · modeled", warheadCount: 10, warheadYieldMt: 0.12 },
  { id: "rs-28-sarmat", name: "RS-28 Sarmat / Satan II", yieldMt: 5, displayYield: "10 × 500 kt · modeled", warheadCount: 10, warheadYieldMt: 0.5 },
] as const satisfies readonly MirvDeviceDefinition[];

const HYPOTHETICAL_DEVICES = [
  { id: "city-breaker", name: "100 Mt scale study", yieldMt: 100, displayYield: "100 Mt" },
  { id: "gigaton-study", name: "1 Gt scale study", yieldMt: 1_000, displayYield: "1 Gt" },
  { id: "regional-event", name: "10 Gt regional extreme", yieldMt: 10_000, displayYield: "10 Gt" },
  { id: "hundred-gigaton", name: "100 Gt regional extreme", yieldMt: 100_000, displayYield: "100 Gt" },
  { id: "continent-scale", name: "1.5 Tt small-continent study", yieldMt: 1_500_000, displayYield: "1.5 Tt" },
  { id: "large-continent", name: "20 Tt large-continent study", yieldMt: 20_000_000, displayYield: "20 Tt" },
  { id: "hemisphere-scale", name: "100 Tt hemisphere study", yieldMt: 100_000_000, displayYield: "100 Tt" },
  { id: "earth-spanning", name: "1 Pt Earth-span stress test", yieldMt: 1_000_000_000, displayYield: "1 Pt" },
] as const satisfies readonly SingleDeviceDefinition[];

/** Stable catalog ordering for the native grouped selector. */
export const DEVICE_GROUPS: readonly DeviceGroup[] = [
  { id: "conventional", label: "Conventional weapons", devices: CONVENTIONAL_DEVICES },
  { id: "nuclear", label: "Nuclear devices", devices: NUCLEAR_DEVICES },
  { id: "mirv", label: "MIRV delivery systems", devices: MIRV_DEVICES },
  { id: "hypothetical", label: "Hypothetical scale studies", devices: HYPOTHETICAL_DEVICES },
];

/** The 47 prototype devices plus five conventional estimates, excluding custom yield. */
export const DEVICES: readonly DeviceDefinition[] = DEVICE_GROUPS.flatMap((group) => group.devices);

const deviceById = new Map(DEVICES.map((device) => [device.id, device]));

/** Look up a catalog device by its stable ID; unknown IDs return undefined. */
export function getDeviceById(id: string): DeviceDefinition | undefined {
  return deviceById.get(id);
}

/** Per-impact yield in megatons; MIRV aggregate yield is never used for one blast. */
export function perWarheadYieldMt(device: DeviceDefinition): number {
  return device.warheadYieldMt ?? device.yieldMt;
}

/** Whether a catalog ID describes a conventional delivery; custom yields remain nuclear. */
export function isConventionalDevice(id: string): boolean {
  return CONVENTIONAL_DEVICES.some((device) => device.id === id);
}
