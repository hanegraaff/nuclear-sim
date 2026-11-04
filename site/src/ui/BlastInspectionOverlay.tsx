import type { CSSProperties } from "react";
import type { BlastZoneId } from "../domain/blastZones";
import { formatArea, formatDistance, type BlastInspectionGeometry } from "../rendering/overlays/blastInspection";

/** Prototype wording for the four blast effects; physical spans come from the model. */
const ZONE_COPY: Record<BlastZoneId, { readonly label: string; readonly description: string }> = {
  light: { label: "LIGHT", description: "Windows burst. Roofs fail. Flying glass turns streets into a hazard." },
  moderate: { label: "MODERATE", description: "Homes collapse, fires spread and trapped survivors face severe burns." },
  severe: { label: "SEVERE", description: "Most buildings are crushed. Survival above ground is unlikely." },
  fireball: { label: "FIREBALL", description: "People and structures are consumed in incandescent heat." },
};

/** Inner projected marks take pointer priority where pitch brings their targets close. */
const MARKER_STACK: Record<BlastZoneId, number> = { fireball: 4, severe: 3, moderate: 2, light: 1 };

/** View data and semantic actions for the keyboard-accessible marker layer. */
export interface BlastInspectionOverlayProps {
  readonly geometry: BlastInspectionGeometry | null;
  readonly activeZoneId: BlastZoneId | null;
  readonly pinnedZoneId: BlastZoneId | null;
  readonly onHover: (zoneId: BlastZoneId | null) => void;
  readonly onFocusZone: (zoneId: BlastZoneId | null) => void;
  readonly onPin: (zoneId: BlastZoneId) => void;
  readonly onClear: () => void;
}

/** Clamp a tooltip to the current viewport, including the smallest supported width. */
function tooltipPosition(x: number, y: number, width: number, height: number): CSSProperties {
  const tooltipWidth = Math.min(270, width - 24);
  const left = Math.min(width - tooltipWidth - 12, Math.max(12, x - tooltipWidth + 20));
  const top = y + 24 + 135 <= height ? y + 24 : Math.max(12, y - 150);
  return { left, top, width: tooltipWidth };
}

/** Show projected zone markers and one hover, focus, or pinned inspection tooltip. */
export function BlastInspectionOverlay({ geometry, activeZoneId, pinnedZoneId, onHover, onFocusZone, onPin, onClear }: BlastInspectionOverlayProps) {
  if (!geometry) return null;
  const visible = geometry.zones.filter((projected) => projected.visible);
  const active = visible.find((projected) => projected.zone.id === activeZoneId);
  return (
    <div className="blast-inspection-layer" aria-label="Blast-zone inspection markers">
      {visible.map(({ zone, marker }) => {
        const copy = ZONE_COPY[zone.id];
        return (
          <button
            type="button"
            key={zone.id}
            className="blast-zone-marker"
            style={{ left: marker.x, top: marker.y, zIndex: MARKER_STACK[zone.id] }}
            aria-label={`${copy.label} destruction. ${copy.description} Zone span ${formatDistance(zone.innerKm)} to ${formatDistance(zone.outerKm)}. Damage area ${formatArea(zone.areaKm2)}.`}
            aria-expanded={activeZoneId === zone.id}
            aria-pressed={pinnedZoneId === zone.id}
            aria-describedby={activeZoneId === zone.id ? `blast-tooltip-${zone.id}` : undefined}
            onPointerEnter={() => onHover(zone.id)}
            onPointerLeave={() => onHover(null)}
            onFocus={() => onFocusZone(zone.id)}
            onBlur={() => onFocusZone(null)}
            onClick={() => onPin(zone.id)}
            onKeyDown={(event) => {
              if (event.key === "Escape") { event.preventDefault(); onClear(); event.currentTarget.blur(); }
            }}
          >
          </button>
        );
      })}
      {active && (
        <div
          className="blast-zone-tooltip"
          id={`blast-tooltip-${active.zone.id}`}
          role="tooltip"
          style={{ ...tooltipPosition(active.marker.x, active.marker.y, geometry.width, geometry.height), "--zone-color": active.color } as CSSProperties}
        >
          <span className="blast-zone-tooltip-title"><i aria-hidden="true" />{ZONE_COPY[active.zone.id].label} DESTRUCTION</span>
          <span className="blast-zone-tooltip-copy">{ZONE_COPY[active.zone.id].description}</span>
          <span className="blast-zone-tooltip-stats">
            <span><small>ZONE SPAN</small><b>{formatDistance(active.zone.innerKm)} – {formatDistance(active.zone.outerKm)}</b></span>
            <span><small>DAMAGE AREA</small><b>{formatArea(active.zone.areaKm2)}</b></span>
          </span>
        </div>
      )}
    </div>
  );
}
