import { DEVICE_GROUPS } from "../catalog/devices";
import { SCENARIOS } from "../catalog/scenarios";
import { CUSTOM_DEVICE_ID, type ResolvedDeviceSelection } from "../application/deviceSelection";
import type { ScenarioSelectionState } from "../application/scenarioSelection";
import { memo, type KeyboardEvent } from "react";
import type { CloudPresentation } from "../application/cloudPresentation";
import { CloudProfileMonitor } from "./CloudProfileMonitor";
import { EyeOffIcon, MoonIcon } from "./ControlIcons";
import { PreviewSelect } from "./PreviewSelect";
import type { PreviewOption } from "../application/selectionPreview";

const DEVICE_OPTIONS: readonly PreviewOption[] = [{ id: CUSTOM_DEVICE_ID, label: "Custom yield…", group: "" }, ...DEVICE_GROUPS.flatMap((group) => group.devices.map((device) => ({ id: device.id, label: `${device.name} · ${device.displayYield}`, group: group.label })))];
const SCENARIO_OPTIONS: readonly PreviewOption[] = [{ id: "", label: "Choose a location + device", group: "" }, ...SCENARIOS.map((scenario) => ({ id: scenario.id, label: scenario.name, group: scenario.kind === "historical" ? "Historical locations + real devices" : "Hypothetical scale studies" }))];

interface DevicePanelProps {
  readonly state: Pick<ScenarioSelectionState, "tab" | "scenarioId" | "selectedId" | "customYieldInput">;
  readonly selection: ResolvedDeviceSelection;
  readonly statusText: string;
  readonly mapTone: "day" | "night";
  readonly panelsVisible: boolean;
  readonly cloud: CloudPresentation;
  readonly multiLaunch: boolean;
  readonly totalCount: number;
  readonly pendingLaunch?: boolean;
  readonly resetVersion?: number;
  readonly onReset: () => void;
  readonly onSetMapTone: (tone: "day" | "night") => void;
  readonly onSetPanelsVisible: (visible: boolean) => void;
  readonly onSetMultiLaunch: (enabled: boolean) => void;
  readonly onSelectTab: (tab: "scenario" | "device") => void;
  readonly onSelectScenario: (id: string) => void;
  readonly onSelectDevice: (id: string) => void;
  readonly onCustomYieldChange: (value: string) => void;
}

/** Prototype-style selector; tab and input actions update application state. */
export const DevicePanel = memo(function DevicePanel({ state, selection, statusText, mapTone, panelsVisible, cloud, multiLaunch, totalCount, pendingLaunch = false, resetVersion = 0, onReset, onSetMapTone, onSetPanelsVisible, onSetMultiLaunch, onSelectTab, onSelectScenario, onSelectDevice, onCustomYieldChange }: DevicePanelProps) {
  const handleTabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? "scenario" : event.key === "End" ? "device" : state.tab === "device" ? "scenario" : "device";
    onSelectTab(next);
    document.getElementById(`${next}-tab`)?.focus();
  };
  return (
    <aside className="left-instrument-stack" aria-label="Device controls" aria-hidden={!panelsVisible} inert={!panelsVisible}>
      <section className="minimal-header">
        <div className="brand-row">
          <div className="minimal-brand">
            <h1>Nuke Simulator</h1>
            <p>Click Map to Launch</p>
          </div>
          <div className="header-actions">
            <div className="map-mode" role="group" aria-label="Map lighting">
              <button className={`night-toggle${mapTone === "night" ? " active" : ""}`} type="button" onClick={() => onSetMapTone(mapTone === "night" ? "day" : "night")} aria-label="Night mode" aria-pressed={mapTone === "night"}><MoonIcon /> NIGHT</button>
            </div>
            <button className="panel-visibility" type="button" onClick={() => onSetPanelsVisible(false)} aria-label="Hide control and cloud panels"><EyeOffIcon /> HIDE</button>
          </div>
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
                <PreviewSelect key="scenario" kind="scenario" label="Scenario" value={state.scenarioId} options={SCENARIO_OPTIONS} resetVersion={resetVersion + (panelsVisible ? 0 : 1)} onChange={onSelectScenario}>
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
                </PreviewSelect>
              ) : (
              <PreviewSelect key="device" kind="device" label="Weapon or delivery system" value={state.selectedId} options={DEVICE_OPTIONS} resetVersion={resetVersion + (panelsVisible ? 0 : 1)} onChange={onSelectDevice}>
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
              </PreviewSelect>
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
          <div className="launch-actions">
            <button className="reset-map" type="button" onClick={onReset} disabled={totalCount === 0 && !pendingLaunch} aria-label="Reset map">
              <span aria-hidden="true">↶</span> RESET
            </button>
            <button className={`multi-launch-toggle${multiLaunch ? " active" : ""}`} type="button" onClick={() => onSetMultiLaunch(!multiLaunch)} aria-pressed={multiLaunch} aria-label={`Multi-Launch Mode ${multiLaunch ? "ON" : "OFF"}`}>
              <span aria-hidden="true">☢</span> Multi-Launch Mode {multiLaunch ? "ON" : "OFF"} <span aria-hidden="true">☢</span>
            </button>
          </div>
          <p className="launch-status" aria-hidden="true">{statusText}</p>
        </div>
      </section>
      <CloudProfileMonitor state={cloud} />
    </aside>
  );
});
