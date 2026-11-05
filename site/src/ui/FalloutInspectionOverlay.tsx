import type { CSSProperties, KeyboardEvent } from "react";
import { FALLOUT_BANDS, type FalloutBandId, type FalloutZone } from "../domain/fallout";
import { FALLOUT_COLORS, type FalloutInspectionGeometry } from "../rendering/overlays/falloutInspection";
import { formatArea, formatDistance } from "../rendering/overlays/blastInspection";
import type { MapDistanceScale } from "../rendering/overlays/mapDistanceScale";

/** Geographic inspection results and semantic fallout actions. */
export interface FalloutInspectionOverlayProps {
  readonly geometry: FalloutInspectionGeometry | null;
  readonly legendZones: readonly FalloutZone[];
  readonly multi: boolean;
  readonly scale: MapDistanceScale;
  readonly active: FalloutBandId | null;
  readonly pinned: FalloutBandId | null;
  readonly onHover: (id: FalloutBandId | null) => void;
  readonly onFocus: (id: FalloutBandId | null) => void;
  readonly onPin: (id: FalloutBandId) => void;
  readonly onClear: () => void;
}

/** Accessible hit targets and screening popups; canvas owns the synchronized map artwork. */
export function FalloutInspectionOverlay({
  geometry, legendZones, multi, scale, active, pinned, onHover, onFocus, onPin, onClear,
}: FalloutInspectionOverlayProps) {
  const zones = multi ? legendZones : geometry?.zones.map((entry) => entry.zone) ?? [];
  const selected = zones.find((zone) => zone.band.id === active);
  const marker = geometry?.zones.find((entry) => entry.zone.band.id === active && entry.visible)?.marker;
  const tooltipWidth = Math.min(290, (geometry?.width ?? 320) - 24);
  const left = marker && geometry
    ? Math.max(12, Math.min(geometry.width - tooltipWidth - 12, marker.x - tooltipWidth + 20))
    : 0;
  const top = marker && geometry
    ? marker.y + 244 < geometry.height ? marker.y + 24 : Math.max(12, marker.y - 225)
    : undefined;
  const buttonProps = (id: FalloutBandId) => ({
    "aria-expanded": active === id,
    "aria-pressed": pinned === id,
    "aria-describedby": active === id ? `fallout-tooltip-${id}` : undefined,
    onPointerEnter: () => onHover(id),
    onPointerLeave: () => onHover(null),
    onFocus: () => onFocus(id),
    onBlur: () => onFocus(null),
    onClick: () => onPin(id),
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClear();
        event.currentTarget.blur();
      }
    },
  });
  const tooltip = selected && (multi || marker) ? (
    <div
      id={`fallout-tooltip-${selected.band.id}`}
      className={multi ? "multi-legend-tooltip fallout-tooltip" : "blast-zone-tooltip fallout-tooltip"}
      role="tooltip"
      style={{
        "--zone-color": FALLOUT_COLORS[selected.band.id],
        "--legend-color": FALLOUT_COLORS[selected.band.id],
        ...(multi ? { left: 0 } : { left, top, width: tooltipWidth }),
      } as CSSProperties & { "--zone-color": string; "--legend-color": string }}
    >
      <span className="blast-zone-tooltip-title">{selected.band.label}</span>
      <span className="blast-zone-tooltip-copy">{selected.band.description}</span>
      <span className="fallout-dose">H+24 SCREENING BAND · {selected.band.dose}</span>
      <span className="fallout-consequence">{selected.band.consequence}</span>
      <span className="blast-zone-tooltip-stats">
        <span><small>DOWNWIND SPAN</small><b>{formatDistance(selected.innerKm)} – {formatDistance(selected.outerKm)}</b></span>
        <span><small>MODEL AREA</small><b>{formatArea(selected.areaKm2)}</b></span>
      </span>
    </div>
  ) : null;

  if (multi) {
    return (
      <aside className="multi-scale-legends" aria-label="Fallout map and effect scales">
        <div className="distance-scale-legend">
          <span>MAP DISTANCE</span><b>{formatDistance(scale.distanceKm)}</b>
          <div className="distance-scale-bar" style={{ width: scale.widthPx }} aria-hidden="true"><i /><i /></div>
        </div>
        <div className="effect-gradient-legend">
          <span>H+24 FALLOUT</span>
          <div className="effect-gradient-scale">
            <div className="effect-gradient-track" aria-hidden="true"><i /><i /><i /><i /></div>
            {FALLOUT_BANDS.map((band, index) => (
              <button
                key={band.id} type="button" className="multi-legend-marker"
                style={{ left: `${(index + 0.5) * 25}%`, "--legend-color": FALLOUT_COLORS[band.id] } as CSSProperties}
                aria-label={`${band.label}. ${band.description} ${band.dose}.`}
                {...buttonProps(band.id)}
              ><span aria-hidden="true" /></button>
            ))}
          </div>
          <div className="effect-gradient-labels">{FALLOUT_BANDS.map((band) => <small key={band.id}>{band.label}</small>)}</div>
          {tooltip}
        </div>
      </aside>
    );
  }

  return (
    <div className="blast-inspection-layer" aria-label="Fallout-field inspection markers">
      {geometry?.zones.filter((zone) => zone.visible).map(({ zone, marker }, index) => (
        <button
          key={zone.band.id} type="button" className="blast-zone-marker fallout-marker"
          style={{ left: marker.x, top: marker.y, zIndex: 4 - index }}
          aria-label={`${zone.band.label}. ${zone.band.description} H+24 ${zone.band.dose}. Downwind span ${formatDistance(zone.innerKm)} to ${formatDistance(zone.outerKm)}.`}
          {...buttonProps(zone.band.id)}
        />
      ))}
      {tooltip}
    </div>
  );
}
