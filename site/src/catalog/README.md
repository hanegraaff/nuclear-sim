# Device and scenario catalog

`devices.ts` is the typed source of truth for the 47 prototype device choices and their four selector groups. It preserves IDs, order, names, display yields, and internal yields in megatons. The three MIRV entries store explicit reentry-vehicle counts and per-warhead yields; `perWarheadYieldMt` returns the yield to use for one modeled impact. `getDeviceById` returns `undefined` for unknown IDs, which the application reducer rejects.

The custom-yield choice is handled by the application layer and is not counted among the 47 fixed devices. `tests/unit/device-catalog.test.ts` independently checks every catalog entry against the read-only prototype.

`scenarios.ts` contains the 20 prototype locations, labels, categories, device IDs, and geographic coordinates in degrees. `getScenarioById` returns an entry or `undefined`; scenario parity and device mappings are checked in `tests/unit/scenarios.test.ts`.
