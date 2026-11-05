import type { CSSProperties } from "react";
import type { BlastRadii } from "../domain/blast";
import { blastZones, type BlastZoneId } from "../domain/blastZones";
import { formatDistance } from "../rendering/overlays/blastInspection";
import type { MapDistanceScale } from "../rendering/overlays/mapDistanceScale";
import { BLAST_ZONE_COPY } from "./blastZoneCopy";

/** Four prototype damage bands, ordered from faint edge to white-hot center. */
const BANDS: readonly { readonly id: BlastZoneId; readonly color: string }[] = [
  { id: "light", color: "#7049c9" },
  { id: "moderate", color: "#c82b78" },
  { id: "severe", color: "#f34a34" },
  { id: "fireball", color: "#fff0a6" },
];

/** Scale and band-inspection actions supplied by the application store. */
export interface MultiLaunchLegendProps {
  readonly scale: MapDistanceScale;
  readonly latestRadii: BlastRadii | null;
  readonly activeZoneId: BlastZoneId | null;
  readonly pinnedZoneId: BlastZoneId | null;
  readonly onHoverZone: (id: BlastZoneId | null) => void;
  readonly onFocusZone: (id: BlastZoneId | null) => void;
  readonly onPinZone: (id: BlastZoneId) => void;
  readonly onClearZoneInspection: () => void;
}

/** Lower-left distance bar and accessible combined-damage legend. */
export function MultiLaunchLegend({ scale, latestRadii, activeZoneId, pinnedZoneId, onHoverZone, onFocusZone, onPinZone, onClearZoneInspection }: MultiLaunchLegendProps) {
  const zones = latestRadii ? blastZones(latestRadii) : [];
  const active = BANDS.find((band) => band.id === activeZoneId);
  const activeIndex = active ? BANDS.indexOf(active) : -1;
  const zoneSpan = (id: BlastZoneId): string => {
    const zone = zones.find((entry) => entry.id === id);
    return zone ? `${formatDistance(zone.innerKm)} – ${formatDistance(zone.outerKm)}` : "Launch to inspect";
  };
  return (
    <aside className="multi-scale-legends" aria-label="Combined strike map and effect scales">
      <div className="distance-scale-legend">
        <span>MAP DISTANCE</span>
        <b>{formatDistance(scale.distanceKm)}</b>
        <div className="distance-scale-bar" style={{ width: scale.widthPx }} aria-hidden="true"><i /><i /></div>
      </div>
      <div className="effect-gradient-legend">
        <span>COMBINED DAMAGE</span>
        <div className="effect-gradient-scale">
          <div className="effect-gradient-track" aria-hidden="true"><i /><i /><i /><i /></div>
          {BANDS.map((band, index) => (
            <button
              key={band.id}
              type="button"
              className="multi-legend-marker"
              style={{ left: `${(index + 0.5) * 25}%`, "--legend-color": band.color } as CSSProperties}
              aria-label={`${BLAST_ZONE_COPY[band.id].label} destruction. ${BLAST_ZONE_COPY[band.id].description} Latest strike zone span ${zoneSpan(band.id)}. Brighter color means overlapping damage.`}
              aria-expanded={activeZoneId === band.id}
              aria-pressed={pinnedZoneId === band.id}
              aria-describedby={activeZoneId === band.id ? `multi-legend-tooltip-${band.id}` : undefined}
              onPointerEnter={() => onHoverZone(band.id)}
              onPointerLeave={() => onHoverZone(null)}
              onFocus={() => onFocusZone(band.id)}
              onBlur={() => onFocusZone(null)}
              onClick={() => onPinZone(band.id)}
              onKeyDown={(event) => {
                if (event.key === "Escape") { event.preventDefault(); onClearZoneInspection(); event.currentTarget.blur(); }
              }}
            ><span aria-hidden="true" /></button>
          ))}
        </div>
        <div className="effect-gradient-labels">{BANDS.map((band) => <small key={band.id}>{BLAST_ZONE_COPY[band.id].label}</small>)}</div>
        {active && (
          <div
            className="multi-legend-tooltip"
            id={`multi-legend-tooltip-${active.id}`}
            role="tooltip"
            style={{ "--legend-color": active.color, left: activeIndex < 2 ? 0 : undefined, right: activeIndex >= 2 ? 0 : undefined } as CSSProperties}
          >
            <b>{BLAST_ZONE_COPY[active.id].label} DESTRUCTION</b>
            <span>{BLAST_ZONE_COPY[active.id].description}</span>
            <small>MAP READING · BRIGHTER COLOR MEANS OVERLAPPING DAMAGE</small>
            <strong>LATEST STRIKE ZONE · {zoneSpan(active.id)}</strong>
          </div>
        )}
      </div>
    </aside>
  );
}
