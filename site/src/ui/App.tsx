import { useReducer } from "react";
import {
  INITIAL_DEVICE_SELECTION,
  reduceDeviceSelection,
  resolveDeviceSelection,
} from "../application/deviceSelection";
import { DevicePanel } from "./DevicePanel";
import { MapViewport } from "./MapViewport";

/** Root application view: a map and device controls driven by a pure reducer. */
export function App() {
  const [state, dispatch] = useReducer(reduceDeviceSelection, INITIAL_DEVICE_SELECTION);
  const selection = resolveDeviceSelection(state);

  return (
    <MapViewport>
      <DevicePanel
        state={state}
        selection={selection}
        onSelectDevice={(id) => dispatch({ type: "selectDevice", id })}
        onCustomYieldChange={(value) => dispatch({ type: "setCustomYieldInput", value })}
      />
    </MapViewport>
  );
}
