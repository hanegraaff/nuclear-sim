# UI

React mounts the full-viewport map and displays loading or imagery-failure feedback. The upper-left `DevicePanel` has keyboard-accessible Scenario and Device tabs, native grouped selectors, and custom input that dispatch semantic actions to the pure application reducer. It uses packaged Geist fonts, the prototype's compact dark shape, and a concise live selection status. Launch, Reset, multi-launch, night, and hide controls arrive in later plans.

An invalid custom-yield draft is preserved across tabs, but its error appears only alongside the editable Device input. The Scenario tab remains usable and explains that a scenario can prepare a device.

`MapViewport` creates a rendering-owned controller on mount and disposes it on unmount. This cleanup also supports React Strict Mode's development remount. It forwards the application's camera request to the controller and receives readiness and camera snapshots through callbacks, without holding a MapLibre map. The map remains interactive when imagery fails, and the retry button refreshes satellite tiles while preserving the map style and any future effect layers.
