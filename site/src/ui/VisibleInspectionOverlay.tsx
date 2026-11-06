import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { VISIBLE_BANDS, type VisibleBand, type VisibleBandId } from "../domain/visible";
import { formatDistance } from "../rendering/overlays/blastInspection";
import { visibleMarkerColor } from "../rendering/overlays/visibleInspection";
import type { VisibleInspectionGeometry } from "../rendering/overlays/visibleInspection";
import type { MapDistanceScale } from "../rendering/overlays/mapDistanceScale";
import { VISIBLE_GRADIENT } from "../rendering/effects/visiblePalette";
import { placeAudibleOverlay, type OverlayPlacement, type PlacementRect } from "./audiblePlacement";

/** Viewing marker, legend, and semantic inspection actions. */
export interface VisibleInspectionOverlayProps {
  readonly geometry: VisibleInspectionGeometry | null;
  readonly legendBands: readonly VisibleBand[];
  readonly multi: boolean;
  readonly scale: MapDistanceScale;
  readonly active: VisibleBandId | null;
  readonly pinned: VisibleBandId | null;
  readonly onHover: (id: VisibleBandId | null) => void;
  readonly onFocus: (id: VisibleBandId | null) => void;
  readonly onPin: (id: VisibleBandId) => void;
  readonly onClear: () => void;
}

/** Accessible visible field markers and four-band gradient using shared model/palette data. */
export function VisibleInspectionOverlay({ geometry, legendBands, multi, scale, active, pinned, onHover, onFocus, onPin, onClear }: VisibleInspectionOverlayProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const [tooltipPlacement, setTooltipPlacement] = useState<OverlayPlacement | null>(null);
  const [labelPlacement, setLabelPlacement] = useState<OverlayPlacement | null>(null);
  const [layoutRevision, setLayoutRevision] = useState(0);
  const bands = multi ? legendBands : geometry?.bands.map((entry) => entry.band) ?? [];
  const selected = bands.find((band) => band.id === active);
  const marker = geometry?.bands.find((entry) => entry.band.id === active && entry.visible)?.marker;
  const tooltipWidth = Math.min(280, (geometry?.width ?? window.innerWidth) - 24);

  /** Reposition an open annotation when panels or the viewport change size. */
  useEffect(() => {
    const main = (tooltipRef.current ?? labelRef.current)?.closest<HTMLElement>(".simulator");
    if (!main) return;
    const changed = () => setLayoutRevision((revision) => revision + 1);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(changed);
    for (const selector of [".left-instrument-stack", ".effect-view-selector", ".distance-scale-legend", ".effect-gradient-legend", ".maplibregl-ctrl-attrib"]) {
      const element = main.querySelector(selector);
      if (element) observer?.observe(element);
    }
    observer?.observe(main);
    window.addEventListener("resize", changed);
    return () => { observer?.disconnect(); window.removeEventListener("resize", changed); };
  }, [multi, active, geometry]);

  /** Measure fixed UI in one coordinate system before placing either floating item. */
  useLayoutEffect(() => {
    const main = (tooltipRef.current ?? labelRef.current)?.closest<HTMLElement>(".simulator");
    if (!main) return;
    const frame = main.getBoundingClientRect();
    const relative = (element: Element | null): PlacementRect => {
      const rect = element?.getBoundingClientRect();
      return rect ? { x: rect.left - frame.left, y: rect.top - frame.top, width: rect.width, height: rect.height }
        : { x: -1000, y: -1000, width: 0, height: 0 };
    };
    const viewport = { x: 0, y: 0, width: frame.width, height: frame.height };
    const blockers = [relative(main.querySelector(".left-instrument-stack")), relative(main.querySelector(".effect-view-selector"))];
    if (multi) blockers.push(relative(main.querySelector(".distance-scale-legend")), relative(main.querySelector(".effect-gradient-legend")));
    blockers.push(relative(main.querySelector(".maplibregl-ctrl-attrib")), relative(main.querySelector(".model-qualification")));
    const tooltip = tooltipRef.current;
    if (tooltip && selected) {
      const anchor = marker ?? { x: 12, y: frame.height - 100 };
      const position = placeAudibleOverlay(viewport, { width: tooltip.offsetWidth, height: tooltip.offsetHeight }, { left: anchor.x, top: anchor.y }, blockers, multi ? "multi-popup" : "single-popup");
      setTooltipPlacement(position);
      blockers.push({ x: position.left, y: position.top, width: tooltip.offsetWidth, height: tooltip.offsetHeight });
    } else setTooltipPlacement(null);
    const label = labelRef.current;
    let labelPosition: OverlayPlacement | null = null;
    if (label && geometry) {
      const endpoint = geometry.ruler.at(-1)!;
      labelPosition = placeAudibleOverlay(viewport, { width: label.offsetWidth, height: label.offsetHeight }, { left: endpoint.x, top: endpoint.y }, blockers, "label");
    }
    setLabelPlacement(labelPosition);
  }, [active, geometry, multi, selected, layoutRevision]);
  const buttonProps = (id: VisibleBandId) => ({
    "aria-expanded": active === id,
    "aria-pressed": pinned === id,
    "aria-describedby": active === id ? `visible-tooltip-${id}` : undefined,
    onPointerEnter: () => onHover(id), onPointerLeave: () => onHover(null),
    onFocus: () => onFocus(id), onBlur: () => onFocus(null), onClick: () => onPin(id),
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "Escape") { event.preventDefault(); onClear(); event.currentTarget.blur(); }
    },
  });
  const tooltip = selected && (multi || marker) ? (
    <div ref={tooltipRef} id={`visible-tooltip-${selected.id}`} role="tooltip"
      className={`${multi ? "multi-legend-tooltip" : "blast-zone-tooltip"} visible-tooltip visible-floating-tooltip`}
      style={{ "--zone-color": visibleMarkerColor(selected.id), "--legend-color": visibleMarkerColor(selected.id), left: tooltipPlacement?.left ?? 0, top: tooltipPlacement?.top ?? 0, width: tooltipWidth, visibility: tooltipPlacement ? "visible" : "hidden" } as CSSProperties & { "--zone-color": string; "--legend-color": string }}>
      <span className="blast-zone-tooltip-title">{selected.title}</span>
      <span className="blast-zone-tooltip-copy">{selected.description}</span>
      <span className="fallout-dose">WHAT YOU SEE · {selected.visualLevel}</span>
      <span className="blast-zone-tooltip-stats"><span><small>RANGE SPAN</small><b>{formatDistance(selected.innerKm)} – {formatDistance(selected.outerKm)}</b></span></span>
    </div>
  ) : null;

  if (multi) return (<>
    <aside className="multi-scale-legends" aria-label="Visible map and effect scales">
      <div className="distance-scale-legend"><span>MAP DISTANCE</span><b>{formatDistance(scale.distanceKm)}</b><div className="distance-scale-bar" style={{ width: scale.widthPx }} aria-hidden="true"><i /><i /></div></div>
      <div className="effect-gradient-legend"><span>VISIBLE</span>
        <div className="effect-gradient-scale">
          <div className="effect-gradient-track" style={{ background: VISIBLE_GRADIENT }} aria-hidden="true"><i /><i /><i /><i /></div>
          {VISIBLE_BANDS.map((band, index) => <button key={band.id} type="button" className="multi-legend-marker" style={{ left: `${(index + 0.5) * 25}%`, "--legend-color": visibleMarkerColor(band.id) } as CSSProperties}
            aria-label={`${band.label}. ${band.description} ${band.visualLevel}.`} {...buttonProps(band.id)}><span aria-hidden="true" /></button>)}
        </div>
        <div className="effect-gradient-labels">{VISIBLE_BANDS.map((band) => <small key={band.id}>{band.label}</small>)}</div>
      </div>
    </aside>
    {tooltip}
  </>);
  return <>
  <div className="blast-inspection-layer" aria-label="Visible-range inspection markers">
    {geometry?.bands.filter((entry) => entry.visible).map(({ band, marker }, index) => <button key={band.id} type="button" className="blast-zone-marker visible-marker"
      style={{ left: marker.x, top: marker.y, zIndex: 4 - index }} aria-label={`${band.label}. ${band.description} ${band.visualLevel}. Range span ${formatDistance(band.innerKm)} to ${formatDistance(band.outerKm)}.`} {...buttonProps(band.id)} />)}
  </div>
  {geometry && <div ref={labelRef} className="visible-range-label" style={{ left: labelPlacement?.left ?? 0, top: labelPlacement?.top ?? 0, visibility: labelPlacement ? "visible" : "hidden" }}>VISIBLE&nbsp; {formatDistance(geometry.radiusKm)}</div>}
  {tooltip}
  </>;
}
