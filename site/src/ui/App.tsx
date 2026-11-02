import { useReducer } from "react";
import { resolveDeviceSelection } from "../application/deviceSelection";
import { INITIAL_SCENARIO_SELECTION, reduceScenarioSelection } from "../application/scenarioSelection";
import { DevicePanel } from "./DevicePanel";
import { MapViewport } from "./MapViewport";

/** Root application view: a map and device controls driven by a pure reducer. */
export function App() {
  const [state, dispatch] = useReducer(reduceScenarioSelection, INITIAL_SCENARIO_SELECTION);
  const selection = resolveDeviceSelection(state);

  return (
    <MapViewport cameraRequest={state.cameraRequest}>
      <DevicePanel
        state={state}
        selection={selection}
        onSelectTab={(tab) => dispatch({ type: "selectTab", tab })}
        onSelectScenario={(id) => dispatch({ type: "selectScenario", id })}
        onSelectDevice={(id) => dispatch({ type: "selectDevice", id })}
        onCustomYieldChange={(value) => dispatch({ type: "setCustomYieldInput", value })}
      />
    </MapViewport>
  );
}
