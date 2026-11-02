# UI

React mounts the full-viewport map and displays loading or imagery-failure feedback. Plan 02 adds the upper-left `DevicePanel`, whose native grouped selector and custom input dispatch semantic actions to the pure application reducer. The panel uses packaged Geist fonts, the prototype's compact dark shape, and a concise live selection status. It renders no physical calculations or map commands. Scenario, launch, Reset, multi-launch, night, and hide controls appear only when their behavior is implemented in later plans.

`MapViewport` creates a rendering-owned controller on mount and disposes it on unmount. This cleanup also supports React Strict Mode's development remount. The UI receives readiness and camera snapshots through callbacks, without holding a MapLibre map. The map remains interactive when imagery fails, and the retry button refreshes satellite tiles while preserving the map style and any future effect layers.
