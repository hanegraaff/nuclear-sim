import { DEVICE_GROUPS } from "../catalog/devices";
import { CUSTOM_DEVICE_ID, type DeviceSelectionState, type ResolvedDeviceSelection } from "../application/deviceSelection";

interface DevicePanelProps {
  readonly state: DeviceSelectionState;
  readonly selection: ResolvedDeviceSelection;
  readonly onSelectDevice: (id: string) => void;
  readonly onCustomYieldChange: (value: string) => void;
}

/** Prototype-style device panel; every visible input updates application state. */
export function DevicePanel({ state, selection, onSelectDevice, onCustomYieldChange }: DevicePanelProps) {
  return (
    <aside className="left-instrument-stack" aria-label="Device controls">
      <section className="minimal-header">
        <div className="minimal-brand">
          <h1>Nuke Simulator</h1>
          <p>Choose a device</p>
        </div>

        <div className="panel-controls">
          <h2 className="selection-tab">DEVICE</h2>
          <div className="payload-input">
            <div className="select-wrap">
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
              <span className="select-chevron" aria-hidden="true" />
            </div>

            {selection.custom && (
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
          ) : (
            <p className="selection-status selection-error" id="custom-yield-error" role="alert">
              {selection.error}
            </p>
          )}
        </div>
      </section>
    </aside>
  );
}
