# Visual reference — Plan 01

The read-only prototype screenshots show Esri satellite imagery filling the viewport. `Missile.jpeg` has the left control stack hidden, making the imagery and bottom-right navigation controls useful references for this first map-only increment. Plan 01 intentionally does not include the missile, crosshair, effect fields, cloud profile, or controls; those are assigned to later roadmap plans.

The browser smoke test compares an initial **2208 × 1276** screenshot with a reviewed baseline using a synthetic tile fixture. That fixture proves map layout, viewport coverage, controls, and attribution without depending on live Esri tiles; it is not a visual target for the real satellite imagery. The deployed Site uses the live configured imagery source. Most full-page prototype references have the same viewport, so later visual comparisons can use this size with matching camera state.

No approved visual deviation from the Plan 01 map behavior is recorded.

## Plan 02 device panel

`Nuke Blast Top.png` is the panel reference. At roughly **1280 × 740 CSS pixels**, the implementation panel has the prototype's 356 px width, 16 px upper-left offset, clipped charcoal shape, coral title, dense mono label, dark selector, and red selected-device text. The 47 fixed options and four native optgroup labels preserve the prototype order and wording. Packaged Geist Sans and Geist Mono avoid a runtime font request.

The Plan 02 panel intentionally shows only the working Device selector and custom-yield input. The screenshot's Scenario, Reset, Multi-Launch Mode, Night, Hide, and cloud-monitor elements are scheduled for later plans. Until clicking the map launches in Plan 04, the subtitle reads “Choose a device” in place of “Click Map to Launch.” These are staged differences for R-02/R-03, not final visual changes.

## Plan 03 scenario controls

The Scenario and Device tabs and grouped dropdown follow `Nuke Blast Top.png` and the prototype's selector styling. Fixed-tile captures at 1280 × 740 CSS pixels cover both tabs; a keyboard-focused tab has an additional visible focus outline. For R-02/R-04, the subtitle says “Choose a scenario” or “Choose a device” until launch exists. Reset, Multi-Launch, Night, Hide, and the cloud panel remain scheduled for later plans.

## Plan 04 target and missile

`Missile.jpeg` is the visual reference for R-05/V-01. The reviewed [fixed-time capture](../tests/e2e/missile.spec.ts-snapshots/plan-04-missile-3200ms-darwin.png) uses a 1508 × 1080 CSS-pixel viewport, synthetic tiles, a fixed upper-right entry angle, and 3200 ms of browser clock time. The red reticle, compact amber-white missile, and thin pale trail match the reference's shapes, approximate scale, and layer order. The source screenshot has its left controls hidden and real Esri imagery; this staged Plan 04 capture shows the panel and fixed tile fixture. Hide/Show is assigned to Plan 15. The smoke is a deterministic approximation of the prototype's small drifting puffs. At arrival, this plan keeps the reticle and reports target reached; the flash and blast begin in Plan 05.
