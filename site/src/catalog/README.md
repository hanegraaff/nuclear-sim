# Device and scenario catalog

`devices.ts` is the typed source of truth for 52 fixed device choices in four selector groups: the 47 prototype choices and five additional conventional weapons. It preserves the prototype IDs, order, names, display yields, and internal yields in megatons. The added weapons use rounded, source-based peak-pressure TNT-equivalent estimates for specified explosive fills; actual configurations and effects vary. [Model notes](../../docs/model.md) explain the conversion and its limits. The three MIRV entries store explicit reentry-vehicle counts and per-warhead yields; `perWarheadYieldMt` returns the yield to use for one modeled impact. `getDeviceById` returns `undefined` for unknown IDs, which the application reducer rejects. `isConventionalDevice` classifies catalog deliveries so they receive a conventional plume and no nuclear Fallout footprint.

The custom-yield choice is handled by the application layer and is not counted among the 52 fixed devices. Catalog tests independently check the prototype entries and added conventional estimates.

`scenarios.ts` contains the 20 prototype locations, labels, categories, device IDs, and geographic coordinates in degrees. `getScenarioById` returns an entry or `undefined`; scenario parity and device mappings are checked in `tests/unit/scenarios.test.ts`.
