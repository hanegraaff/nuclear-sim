import { DEVICE_GROUPS } from "../catalog/devices";
import { SCENARIOS } from "../catalog/scenarios";
import { CUSTOM_DEVICE_ID, type ResolvedDeviceSelection } from "../application/deviceSelection";
import type { ScenarioSelectionState } from "../application/scenarioSelection";
import { memo, type KeyboardEvent } from "react";

interface DevicePanelProps {
  readonly state: Pick<ScenarioSelectionState, "tab" | "scenarioId" | "selectedId" | "customYieldInput">;
  readonly selection: ResolvedDeviceSelection;
  readonly launchPhase: "armed" | "inbound" | "complete";
  readonly onSelectTab: (tab: "scenario" | "device") => void;
  readonly onSelectScenario: (id: string) => void;
  readonly onSelectDevice: (id: string) => void;
  readonly onCustomYieldChange: (value: string) => void;
}

/** Prototype-style selector; tab and input actions update application state. */
export const DevicePanel = memo(function DevicePanel({ state, selection, launchPhase, onSelectTab, onSelectScenario, onSelectDevice, onCustomYieldChange }: DevicePanelProps) {
  const handleTabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? "scenario" : event.key === "End" ? "device" : state.tab === "device" ? "scenario" : "device";
    onSelectTab(next);
    document.getElementById(`${next}-tab`)?.focus();
  };
  return (
    <aside className="left-instrument-stack" aria-label="Device controls">
      <section className="minimal-header">
        <div className="minimal-brand">
          <h1>Nuke Simulator</h1>
          <p>Click Map to Launch</p>
        </div>

        <div className="panel-controls">
          <div className="selection-tabs" role="tablist" aria-label="Choose by scenario or device">
            {(["scenario", "device"] as const).map((tab) => (
              <button key={tab} type="button" role="tab" id={`${tab}-tab`} aria-controls="payload-selection-panel"
                aria-selected={state.tab === tab} tabIndex={state.tab === tab ? 0 : -1}
                onClick={() => onSelectTab(tab)} onKeyDown={handleTabKey}>{tab.toUpperCase()}</button>
            ))}
          </div>
          <div className="payload-input" id="payload-selection-panel" role="tabpanel" aria-labelledby={`${state.tab}-tab`}>
            <div className="select-wrap">
              {state.tab === "scenario" ? (
                <select aria-label="Scenario" value={state.scenarioId} onChange={(event) => onSelectScenario(event.target.value)}>
                  <option value="">Choose a location + device</option>
                  <optgroup label="Historical locations + real devices">
                    {SCENARIOS.filter((scenario) => scenario.kind === "historical").map((scenario) => (
                      <option key={scenario.id} value={scenario.id}>{scenario.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Hypothetical scale studies">
                    {SCENARIOS.filter((scenario) => scenario.kind === "hypothetical").map((scenario) => (
                      <option key={scenario.id} value={scenario.id}>{scenario.name}</option>
                    ))}
                  </optgroup>
                </select>
              ) : (
              <select
                aria-label="Weapon or delivery system"
                value={state.selectedId}
                onChange={(event) => onSelectDevice(event.target.value)}
              >
                <option value={CUSTOM_DEVICE_ID}>Custom yield…</option>
                {DEVICE_GROUPS.map((group) => (
                  <optgroup key={group.id} label={group.label}>
                    {group.devices.map((device) => (
                      <option key={device.id} value={device.id}>
                        {device.name} · {device.displayYield}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              )}
              <span className="select-chevron" aria-hidden="true" />
            </div>

            {state.tab === "device" && selection.custom && (
              <div className="custom-input">
                <input
                  type="text"
                  inputMode="decimal"
                  aria-label="Custom yield in megatons"
                  aria-invalid={!selection.valid}
                  aria-describedby={!selection.valid ? "custom-yield-error" : undefined}
                  value={state.customYieldInput}
                  onChange={(event) => onCustomYieldChange(event.target.value)}
                />
                <span>MT</span>
              </div>
            )}
          </div>

          {selection.valid ? (
            <p className="selection-status" role="status" aria-live="polite">
              Selected device · {selection.label}
            </p>
          ) : state.tab === "device" ? (
            <p className="selection-status selection-error" id="custom-yield-error" role="alert">
              {selection.error}
            </p>
          ) : (
            <p className="selection-status" role="status" aria-live="polite">Choose a scenario to prepare a device.</p>
          )}
          <p className="launch-status" aria-live="polite">
            {launchPhase === "inbound" ? "MISSILE INBOUND" : launchPhase === "complete" ? "TARGET REACHED" : "READY TO LAUNCH"}
          </p>
        </div>
      </section>
    </aside>
  );
});
