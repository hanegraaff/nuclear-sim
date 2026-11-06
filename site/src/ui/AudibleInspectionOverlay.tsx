import type { CSSProperties, KeyboardEvent } from "react";
import { AUDIBLE_BANDS, type AudibleBand, type AudibleBandId } from "../domain/audible";
import { formatDistance } from "../rendering/overlays/blastInspection";
import { audibleMarkerColor } from "../rendering/overlays/audibleInspection";
import type { AudibleInspectionGeometry } from "../rendering/overlays/audibleInspection";
import type { MapDistanceScale } from "../rendering/overlays/mapDistanceScale";
import { AUDIBLE_GRADIENT } from "../rendering/effects/audiblePalette";

/** Hearing marker, legend, and semantic inspection actions. */
export interface AudibleInspectionOverlayProps {
  readonly geometry: AudibleInspectionGeometry | null;
  readonly legendBands: readonly AudibleBand[];
  readonly multi: boolean;
  readonly scale: MapDistanceScale;
  readonly active: AudibleBandId | null;
  readonly pinned: AudibleBandId | null;
  readonly onHover: (id: AudibleBandId | null) => void;
  readonly onFocus: (id: AudibleBandId | null) => void;
  readonly onPin: (id: AudibleBandId) => void;
  readonly onClear: () => void;
}

/** Accessible hearing field markers and four-band gradient using shared model/palette data. */
export function AudibleInspectionOverlay({ geometry, legendBands, multi, scale, active, pinned, onHover, onFocus, onPin, onClear }: AudibleInspectionOverlayProps) {
  const bands = multi ? legendBands : geometry?.bands.map((entry) => entry.band) ?? [];
  const selected = bands.find((band) => band.id === active);
  const marker = geometry?.bands.find((entry) => entry.band.id === active && entry.visible)?.marker;
  const tooltipWidth = Math.min(280, (geometry?.width ?? 320) - 24);
  const left = marker && geometry ? Math.max(12, Math.min(geometry.width - tooltipWidth - 12, marker.x - tooltipWidth + 20)) : 0;
  const top = marker && geometry ? marker.y + 175 < geometry.height ? marker.y + 24 : Math.max(12, marker.y - 175) : undefined;
  const buttonProps = (id: AudibleBandId) => ({
    "aria-expanded": active === id,
    "aria-pressed": pinned === id,
    "aria-describedby": active === id ? `audible-tooltip-${id}` : undefined,
    onPointerEnter: () => onHover(id), onPointerLeave: () => onHover(null),
    onFocus: () => onFocus(id), onBlur: () => onFocus(null), onClick: () => onPin(id),
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "Escape") { event.preventDefault(); onClear(); event.currentTarget.blur(); }
    },
  });
  const tooltip = selected && (multi || marker) ? (
    <div id={`audible-tooltip-${selected.id}`} role="tooltip"
      className={multi ? "multi-legend-tooltip audible-tooltip" : "blast-zone-tooltip audible-tooltip"}
      style={{ "--zone-color": audibleMarkerColor(selected.id), "--legend-color": audibleMarkerColor(selected.id), ...(multi ? { left: 0 } : { left, top, width: tooltipWidth }) } as CSSProperties & { "--zone-color": string; "--legend-color": string }}>
      <span className="blast-zone-tooltip-title">{selected.title}</span>
      <span className="blast-zone-tooltip-copy">{selected.description}</span>
      <span className="fallout-dose">PEAK SOUND · {selected.peakSound}</span>
      <span className="blast-zone-tooltip-stats"><span><small>RANGE SPAN</small><b>{formatDistance(selected.innerKm)} – {formatDistance(selected.outerKm)}</b></span></span>
    </div>
  ) : null;

  if (multi) return (
    <aside className="multi-scale-legends" aria-label="Audible map and effect scales">
      <div className="distance-scale-legend"><span>MAP DISTANCE</span><b>{formatDistance(scale.distanceKm)}</b><div className="distance-scale-bar" style={{ width: scale.widthPx }} aria-hidden="true"><i /><i /></div></div>
      <div className="effect-gradient-legend"><span>AUDIBLE</span>
        <div className="effect-gradient-scale">
          <div className="effect-gradient-track" style={{ background: AUDIBLE_GRADIENT }} aria-hidden="true"><i /><i /><i /><i /></div>
          {AUDIBLE_BANDS.map((band, index) => <button key={band.id} type="button" className="multi-legend-marker" style={{ left: `${(index + 0.5) * 25}%`, "--legend-color": audibleMarkerColor(band.id) } as CSSProperties}
            aria-label={`${band.label}. ${band.description} ${band.peakSound}.`} {...buttonProps(band.id)}><span aria-hidden="true" /></button>)}
        </div>
        <div className="effect-gradient-labels">{AUDIBLE_BANDS.map((band) => <small key={band.id}>{band.label}</small>)}</div>
        {tooltip}
      </div>
    </aside>
  );
  return <div className="blast-inspection-layer" aria-label="Audible-range inspection markers">
    {geometry?.bands.filter((entry) => entry.visible).map(({ band, marker }, index) => <button key={band.id} type="button" className="blast-zone-marker audible-marker"
      style={{ left: marker.x, top: marker.y, zIndex: 4 - index }} aria-label={`${band.label}. ${band.description} ${band.peakSound}. Range span ${formatDistance(band.innerKm)} to ${formatDistance(band.outerKm)}.`} {...buttonProps(band.id)} />)}
    {tooltip}
  </div>;
}
