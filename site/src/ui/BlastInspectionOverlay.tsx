import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { BlastZoneId } from "../domain/blastZones";
import { formatArea, formatDistance, type BlastInspectionGeometry } from "../rendering/overlays/blastInspection";
import { BLAST_ZONE_COPY } from "./blastZoneCopy";
import { placeAudibleOverlay, type OverlayPlacement, type PlacementRect } from "./audiblePlacement";

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
  // Phone effect tabs occupy the lower edge; flip before the popup obscures them.
  const bottomLimit = height - (width <= 600 ? 150 : 0);
  const top = y + 24 + 135 <= bottomLimit ? y + 24 : Math.max(12, y - 150);
  return { left, top, width: tooltipWidth };
}

/** Show projected zone markers and one hover, focus, or pinned inspection tooltip. */
export function BlastInspectionOverlay({ geometry, activeZoneId, pinnedZoneId, onHover, onFocusZone, onPin, onClear }: BlastInspectionOverlayProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<OverlayPlacement | null>(null);
  const [layoutRevision, setLayoutRevision] = useState(0);
  const visible = geometry?.zones.filter((projected) => projected.visible) ?? [];
  const active = visible.find((projected) => projected.zone.id === activeZoneId);

  /** Recheck fixed controls after a resize or a change in their measured size. */
  useEffect(() => {
    const main = tooltipRef.current?.closest<HTMLElement>(".simulator");
    if (!main || !geometry || geometry.width > 600) return;
    const changed = () => setLayoutRevision((revision) => revision + 1);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(changed);
    for (const selector of [".left-instrument-stack", ".effect-view-selector", ".maplibregl-ctrl-attrib"]) {
      const element = main.querySelector(selector);
      if (element) observer?.observe(element);
    }
    window.addEventListener("resize", changed);
    return () => { observer?.disconnect(); window.removeEventListener("resize", changed); };
  }, [activeZoneId, geometry]);

  /** Keep the measured phone tooltip clear of fixed panels and map controls. */
  useLayoutEffect(() => {
    const tooltip = tooltipRef.current;
    const main = tooltip?.closest<HTMLElement>(".simulator");
    if (!tooltip || !main || !active || !geometry || geometry.width > 600) return;
    const frame = main.getBoundingClientRect();
    const relative = (element: Element | null): PlacementRect => {
      const rect = element?.getBoundingClientRect();
      return rect ? { x: rect.left - frame.left, y: rect.top - frame.top, width: rect.width, height: rect.height }
        : { x: -1000, y: -1000, width: 0, height: 0 };
    };
    const blockers = [".left-instrument-stack", ".effect-view-selector", ".maplibregl-ctrl-attrib", ".model-qualification"]
      .map((selector) => relative(main.querySelector(selector)));
    setPlacement(placeAudibleOverlay({ x: 0, y: 0, width: frame.width, height: frame.height },
      { width: tooltip.offsetWidth, height: tooltip.offsetHeight },
      { left: active.marker.x, top: active.marker.y }, blockers, "single-popup"));
  }, [active, geometry, layoutRevision]);

  if (!geometry) return null;
  return (
    <div className="blast-inspection-layer" aria-label="Blast-zone inspection markers">
      {visible.map(({ zone, marker }) => {
        const copy = BLAST_ZONE_COPY[zone.id];
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
          ref={tooltipRef}
          className="blast-zone-tooltip"
          id={`blast-tooltip-${active.zone.id}`}
          role="tooltip"
          style={{ ...tooltipPosition(active.marker.x, active.marker.y, geometry.width, geometry.height),
            ...(geometry.width <= 600 ? { left: placement?.left ?? 0, top: placement?.top ?? 0, visibility: placement ? "visible" : "hidden" } : {}),
            "--zone-color": active.color } as CSSProperties}
        >
          <span className="blast-zone-tooltip-title"><i aria-hidden="true" />{BLAST_ZONE_COPY[active.zone.id].label} DESTRUCTION</span>
          <span className="blast-zone-tooltip-copy">{BLAST_ZONE_COPY[active.zone.id].description}</span>
          <span className="blast-zone-tooltip-stats">
            <span><small>ZONE SPAN</small><b>{formatDistance(active.zone.innerKm)} – {formatDistance(active.zone.outerKm)}</b></span>
            <span><small>DAMAGE AREA</small><b>{formatArea(active.zone.areaKm2)}</b></span>
          </span>
        </div>
      )}
    </div>
  );
}
