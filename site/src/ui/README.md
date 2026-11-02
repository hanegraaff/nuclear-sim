# UI

React mounts the full-viewport map and displays loading or imagery-failure feedback. The upper-left `DevicePanel` has keyboard-accessible Scenario and Device tabs, native grouped selectors, and custom input that dispatch semantic actions to the pure application reducer. It uses packaged Geist fonts, the prototype's compact dark shape, and live selection and launch status. Reset, multi-launch, night, and hide controls arrive in later plans.

An invalid custom-yield draft is preserved across tabs, but its error appears only alongside the editable Device input. The Scenario tab remains usable and explains that a scenario can prepare a device.

`MapViewport` creates a rendering-owned controller on mount and disposes it on unmount. This cleanup also supports React Strict Mode's development remount. It forwards the application's camera request to the controller and receives readiness and camera snapshots through callbacks, without holding a MapLibre map. The map remains interactive when imagery fails, and the retry button refreshes satellite tiles while preserving the map style and any future effect layers.

For Plan 04, `App` injects the browser's monotonic clock and frame scheduler into reducer actions. `MapViewport` forwards only geographic launch routes and immutable flight frames across the rendering boundary. The status announces inbound and arrival; an invalid custom yield prevents launch. The current launch remains visible at its target after arrival until another click. Blast effects and Reset are scheduled for Plan 05.
