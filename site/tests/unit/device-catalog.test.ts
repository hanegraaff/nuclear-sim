/** Exact Plan 02 catalog parity with the read-only prototype's 47 device rows. */
import { describe, expect, it } from "vitest";
import { DEVICE_GROUPS, DEVICES, getDeviceById, perWarheadYieldMt } from "../../src/catalog/devices";

const expectedGroups = [
  ["conventional", "Conventional weapons", 2],
  ["nuclear", "Nuclear devices", 34],
  ["mirv", "MIRV delivery systems", 3],
  ["hypothetical", "Hypothetical scale studies", 8],
] as const;

// Group, ID, exact name, aggregate Mt, exact displayed yield, and MIRV loadout.
const expectedDevices: ReadonlyArray<readonly [string, string, string, number, string, number?, number?]> = [
  ["conventional", "moab", "GBU-43/B MOAB", 0.000011, "11 t TNT"],
  ["conventional", "foab", "FOAB (reported)", 0.000044, "44 t TNT · reported"],
  ["nuclear", "w54", "W54 / Davy Crockett", 0.00002, "0.02 kt"],
  ["nuclear", "w48", "W48 artillery shell", 0.000072, "0.072 kt"],
  ["nuclear", "sadm", "W54 SADM", 0.001, "1 kt"],
  ["nuclear", "little-boy", "Little Boy", 0.015, "15 kt"],
  ["nuclear", "trinity-gadget", "Trinity Gadget", 0.0186, "18.6 kt"],
  ["nuclear", "fat-man", "Fat Man", 0.021, "21 kt"],
  ["nuclear", "rds-1", "RDS-1 / First Lightning", 0.022, "22 kt"],
  ["nuclear", "b61", "B61-12 (max)", 0.05, "50 kt"],
  ["nuclear", "gerboise-bleue", "Gerboise Bleue", 0.07, "70 kt"],
  ["nuclear", "w76", "W76-1", 0.09, "90 kt"],
  ["nuclear", "sedan", "Sedan Test Device", 0.104, "104 kt"],
  ["nuclear", "w80", "W80", 0.15, "150 kt"],
  ["nuclear", "greenhouse-george", "Greenhouse George", 0.225, "225 kt"],
  ["nuclear", "w87", "W87", 0.3, "300 kt"],
  ["nuclear", "b61-7", "B61-7 (max)", 0.34, "340 kt"],
  ["nuclear", "rds-6s", "RDS-6s / Joe-4", 0.4, "400 kt"],
  ["nuclear", "w88", "W88", 0.475, "475 kt"],
  ["nuclear", "ivy-king", "Ivy King", 0.5, "500 kt"],
  ["nuclear", "orange-herald", "Orange Herald", 0.72, "720 kt"],
  ["nuclear", "w59", "W59", 1, "1 Mt"],
  ["nuclear", "b83", "B83", 1.2, "1.2 Mt"],
  ["nuclear", "starfish-prime", "Starfish Prime / W49", 1.4, "1.4 Mt"],
  ["nuclear", "rds-37", "RDS-37 test yield", 1.6, "1.6 Mt"],
  ["nuclear", "grapple-x", "Grapple X / Round C", 1.8, "1.8 Mt"],
  ["nuclear", "canopus", "Canopus", 2.6, "2.6 Mt"],
  ["nuclear", "grapple-y", "Grapple Y", 3, "3 Mt"],
  ["nuclear", "w39", "W39", 3.8, "3.8 Mt"],
  ["nuclear", "b53", "B53", 9, "9 Mt"],
  ["nuclear", "hard-tack-poplar", "Hardtack Poplar", 9.3, "9.3 Mt"],
  ["nuclear", "ivy-mike", "Ivy Mike", 10.4, "10.4 Mt"],
  ["nuclear", "castle-yankee", "Castle Yankee", 13.5, "13.5 Mt"],
  ["nuclear", "castle-bravo", "Castle Bravo", 15, "15 Mt"],
  ["nuclear", "mk41", "Mark 41", 25, "25 Mt"],
  ["nuclear", "tsar-bomba", "Tsar Bomba", 50, "50 Mt"],
  ["mirv", "rs-24-yars", "RS-24 Yars / SS-29", 0.525, "3 × 175 kt · modeled", 3, 0.175],
  ["mirv", "rsm-56-bulava", "RSM-56 Bulava / SS-NX-30", 1.2, "10 × 120 kt · modeled", 10, 0.12],
  ["mirv", "rs-28-sarmat", "RS-28 Sarmat / Satan II", 5, "10 × 500 kt · modeled", 10, 0.5],
  ["hypothetical", "city-breaker", "100 Mt scale study", 100, "100 Mt"],
  ["hypothetical", "gigaton-study", "1 Gt scale study", 1_000, "1 Gt"],
  ["hypothetical", "regional-event", "10 Gt regional extreme", 10_000, "10 Gt"],
  ["hypothetical", "hundred-gigaton", "100 Gt regional extreme", 100_000, "100 Gt"],
  ["hypothetical", "continent-scale", "1.5 Tt small-continent study", 1_500_000, "1.5 Tt"],
  ["hypothetical", "large-continent", "20 Tt large-continent study", 20_000_000, "20 Tt"],
  ["hypothetical", "hemisphere-scale", "100 Tt hemisphere study", 100_000_000, "100 Tt"],
  ["hypothetical", "earth-spanning", "1 Pt Earth-span stress test", 1_000_000_000, "1 Pt"],
];

describe("device catalog parity", () => {
  it("keeps four prototype groups and 47 unique devices in selector order", () => {
    expect(DEVICE_GROUPS.map((group) => [group.id, group.label, group.devices.length])).toEqual(expectedGroups);
    expect(DEVICES.map((device) => device.id)).toEqual(expectedDevices.map(([, id]) => id));
    expect(new Set(DEVICES.map((device) => device.id)).size).toBe(47);
  });

  for (const [groupId, id, name, yieldMt, displayYield, warheadCount, warheadYieldMt] of expectedDevices) {
    it(`preserves ${groupId} / ${id} values and per-impact scale`, () => {
      const group = DEVICE_GROUPS.find((entry) => entry.id === groupId);
      const device = getDeviceById(id);
      expect(group?.devices).toContain(device);
      expect(device).toMatchObject({ id, name, yieldMt, displayYield });
      expect(device?.warheadCount).toBe(warheadCount);
      expect(perWarheadYieldMt(device!)).toBe(warheadYieldMt ?? yieldMt);
      if (warheadCount) expect(warheadCount * perWarheadYieldMt(device!)).toBeCloseTo(yieldMt, 10);
    });
  }

  it("returns no device for an unknown ID", () => {
    expect(getDeviceById("unknown-device")).toBeUndefined();
  });
});
