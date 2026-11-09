import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DEVICE_DOSSIERS } from "../catalog/deviceDossiers";
import { SCENARIO_PREVIEWS } from "../catalog/scenarioPreviews";
import { getDeviceById, perWarheadYieldMt } from "../catalog/devices";
import { getScenarioById } from "../catalog/scenarios";
import type { DeviceDossier, DossierFact } from "../catalog/previewTypes";
import { parseCustomYieldMt } from "../application/deviceSelection";
import { compareWithHiroshima } from "../application/hiroshimaComparison";
import type { PreviewNavigation, PreviewOption, SelectionPreviewState } from "../application/selectionPreview";
import { PreviewImageCache } from "./previewImageCache";
import "./selectionPreview.css";

interface OverlayProps {
  readonly kind: "device" | "scenario";
  readonly anchor?: DOMRect;
  readonly options: readonly PreviewOption[];
  readonly state: SelectionPreviewState;
  readonly listId: string;
  readonly customYieldInput: string;
  readonly onBrowse: (id: string, navigation?: PreviewNavigation) => void;
  readonly onCommit: (id: string) => void;
}

function sourceLabel(source: string): string {
  try { return new URL(source, window.location.href).hostname.replace(/^www\./, ""); }
  catch { return source; }
}

function qualified(fact: DossierFact): string {
  return `${fact.value}${fact.confidence === "estimated" && !fact.value.includes("(est)") ? " (est)" : fact.confidence === "reported" && !fact.value.toLowerCase().includes("reported") ? " · reported" : ""}`;
}

function PreviewImage({ url, alt, cache, className }: { readonly url: string; readonly alt: string; readonly cache: PreviewImageCache; readonly className: string }) {
  const [result, setResult] = useState<{ url: string; src: string | null; failed: boolean }>({ url, src: null, failed: false });
  useEffect(() => {
    const controller = new AbortController();
    cache.load(url, controller.signal).then((image) => {
      if (!controller.signal.aborted) setResult({ url, src: image.src, failed: false });
    }).catch(() => { if (!controller.signal.aborted) setResult({ url, src: null, failed: true }); });
    return () => controller.abort();
  }, [url, cache]);
  const current = result.url === url ? result : null;
  return <div className={className} data-image-state={current?.failed ? "error" : current?.src ? "loaded" : "loading"}>
    {current?.src ? <img src={current.src} alt={alt} decoding="async" /> : <span>{current?.failed ? "Image unavailable · details remain available" : "Loading image…"}</span>}
  </div>;
}

function PowerGauge({ yieldMt, qualification = "", perWarheadMt }: { readonly yieldMt: number; readonly qualification?: string; readonly perWarheadMt?: number }) {
  const comparison = compareWithHiroshima(yieldMt);
  const reference = compareWithHiroshima(0.015).positionPercent;
  return <section className="preview-power" aria-label="TNT-equivalent energy comparison">
    <div className="preview-power-label"><span>ENERGY COMPARISON</span><strong>{comparison.label} × Hiroshima{qualification}</strong></div>
    <div className="preview-gauge" role="meter" aria-label="Logarithmic TNT-equivalent yield" aria-valuemin={0} aria-valuemax={100} aria-valuenow={comparison.positionPercent} aria-valuetext={`${comparison.label} times Hiroshima${qualification}`}>
      <i style={{ width: `${comparison.positionPercent}%` }} /><b style={{ left: `${reference}%` }} />
    </div>
    <div className="preview-gauge-scale"><span>LOG SCALE</span><span>1× = 15 kt TNT</span><span>ENERGY, NOT DAMAGE</span></div>
    {perWarheadMt !== undefined && <p>Total modeled loadout above · {compareWithHiroshima(perWarheadMt).label} × Hiroshima per warhead</p>}
  </section>;
}

function DeviceFacts({ dossier, cache }: { readonly dossier: DeviceDossier; readonly cache: PreviewImageCache }) {
  const facts: readonly [string, DossierFact][] = [["LENGTH", dossier.length], ["TOTAL MASS", dossier.totalMass], ["PAYLOAD / FILL", dossier.payloadMass], ["CREATED / INTRODUCED", dossier.created], ["RETIRED / STATUS", dossier.retired], ["COUNTRY OF ORIGIN", dossier.country]];
  const sources = [...new Set(facts.flatMap(([, fact]) => fact.sources).concat(dossier.silhouette.sources))];
  return <>
    <div className="preview-outline-wrap">
      <PreviewImage url={dossier.silhouette.src} alt={`${dossier.entityLabel} exterior outline${dossier.silhouette.confidence === "estimated" ? " (est)" : ""}`} cache={cache} className="preview-outline" />
      <div className="preview-size-annotation"><span>↔ {qualified(dossier.length)}</span><span>EXTERIOR PROFILE{dossier.silhouette.confidence === "estimated" ? " (est)" : ""}</span></div>
    </div>
    <dl className="preview-facts">{facts.map(([label, fact]) => <div key={label}><dt>{label}</dt><dd>{qualified(fact)}{fact.sources.length > 0 && <sup title={fact.sources.join("\n")}> [{fact.sources.map((source) => sources.indexOf(source) + 1).join(", ")}]</sup>}</dd></div>)}</dl>
  </>;
}

function DeviceNotes({ dossier }: { readonly dossier: DeviceDossier }) {
  const sources = [...new Set([dossier.length, dossier.totalMass, dossier.payloadMass, dossier.created, dossier.retired, dossier.country].flatMap((fact) => fact.sources).concat(dossier.silhouette.sources))];
  return <>{dossier.notes && <p className="preview-note">{dossier.notes}</p>}<p className="preview-sources">{sources.map((source, index) => <span key={source} title={source}>[{index + 1}] {sourceLabel(source)} </span>)}</p></>;
}

/** On-demand desktop list and informational preview; the native combobox remains the focus owner. */
export default function SelectionPreviewOverlay({ kind, options, state, listId, customYieldInput, anchor, onBrowse, onCommit }: OverlayProps) {
  const active = useRef<HTMLDivElement>(null);
  const wheelPoint = useRef<{ x: number; y: number } | null>(null);
  const pointerPoint = useRef<{ x: number; y: number } | null>(null);
  const [cache] = useState(() => new PreviewImageCache());
  useEffect(() => () => cache.clear(), [cache]);
  useEffect(() => {
    if (state.navigation === "scroll" || state.navigation === "pointer") return;
    wheelPoint.current = null;
    active.current?.scrollIntoView({ block: "nearest" });
  }, [state.activeId, state.navigation]);
  useEffect(() => { document.getElementById("selection-preview-description")?.scrollTo({ top: 0 }); }, [state.activeId]);
  const groups = [...new Set(options.map((option) => option.group))];
  const device = kind === "device" ? getDeviceById(state.activeId) : undefined;
  const dossier = kind === "device" ? DEVICE_DOSSIERS[state.activeId] : undefined;
  const scenario = kind === "scenario" ? getScenarioById(state.activeId) : undefined;
  const scene = kind === "scenario" ? SCENARIO_PREVIEWS[state.activeId] : undefined;
  const custom = kind === "device" && state.activeId === "custom";
  const customYield = custom ? parseCustomYieldMt(customYieldInput) : null;
  const hasPreview = state.browsed && (device || dossier || custom || scene);
  const qualification = device?.displayYield.includes("estimated") ? " (est)" : device?.displayYield.includes("reported") ? " · reported" : "";
  return createPortal(<>
    <div style={{ left: anchor?.left, top: anchor?.bottom === undefined ? undefined : anchor.bottom + 4, width: anchor?.width }} className="preview-option-list" id={listId} role="listbox" aria-label={kind === "device" ? "Weapon options" : "Scenario options"}
      onMouseDown={(event) => event.preventDefault()}
      onWheel={(event) => {
        event.stopPropagation();
        wheelPoint.current = { x: event.clientX, y: event.clientY };
        pointerPoint.current = wheelPoint.current;
        onBrowse(state.activeId, "scroll");
      }}
      onScroll={(event) => {
        const point = wheelPoint.current;
        if (!point) return;
        const list = event.currentTarget;
        const bounds = list.getBoundingClientRect();
        const underPointer = document.elementFromPoint(point.x, point.y)?.closest<HTMLElement>("[role=option]");
        if (underPointer && list.contains(underPointer)) { onBrowse(underPointer.dataset.optionId ?? "", "scroll"); return; }
        const visibleRows = [...list.querySelectorAll<HTMLElement>("[role=option]")].filter((row) => {
          const box = row.getBoundingClientRect(); return box.bottom > bounds.top && box.top < bounds.bottom;
        });
        const closest = visibleRows.sort((a, b) => Math.abs((a.getBoundingClientRect().top + a.getBoundingClientRect().bottom) / 2 - point.y) - Math.abs((b.getBoundingClientRect().top + b.getBoundingClientRect().bottom) / 2 - point.y))[0];
        if (closest) onBrowse(closest.dataset.optionId ?? "", "scroll");
      }}>
      {groups.map((group) => <div role="group" aria-label={group || "Custom / choose"} key={group}>
        {group && <div className="preview-option-group">{group}</div>}
        {options.filter((option) => option.group === group).map((option) => <div
          key={option.id} id={`${listId}-${option.id || "empty"}`} role="option" aria-selected={state.activeId === option.id}
          data-option-id={option.id} ref={state.activeId === option.id ? active : undefined}
          onPointerMove={(event) => {
            const previous = pointerPoint.current;
            if (previous && previous.x === event.clientX && previous.y === event.clientY) return;
            pointerPoint.current = { x: event.clientX, y: event.clientY };
            wheelPoint.current = null; onBrowse(option.id, "pointer");
          }} onClick={() => onCommit(option.id)}
          className={state.activeId === option.id ? "active" : ""}>{option.label}</div>)}
      </div>)}
    </div>
    {hasPreview && <aside style={{ "--preview-anchor-bottom": `${anchor?.bottom ?? 156}px` } as React.CSSProperties} className={`selection-preview selection-preview-${kind}`} aria-label={kind === "device" ? "Weapon preview" : "Scenario preview"} data-candidate-id={state.activeId}>
      <div className="preview-heading"><span>{kind === "device" ? "DEVICE DOSSIER" : scenario?.kind === "historical" ? "HISTORICAL EVENT" : "HYPOTHETICAL EVENT"}</span><span>ILLUSTRATIVE</span></div>
      <div id="selection-preview-description">
        <h2>{device?.name ?? scenario?.name ?? "Custom yield"}</h2>
        {dossier && <DeviceFacts dossier={dossier} cache={cache} />}
        {device && <PowerGauge yieldMt={device.yieldMt} qualification={qualification} perWarheadMt={device.warheadCount ? perWarheadYieldMt(device) : undefined} />}
        {dossier && <DeviceNotes dossier={dossier} />}
        {custom && <><div className="preview-concept">CUSTOM YIELD<br /><small>No physical weapon specified</small></div><p className="preview-note">Length, mass, creation, retirement, and country: Not applicable — simulation input.</p>{customYield?.valid ? <PowerGauge yieldMt={customYield.yieldMt} /> : <p className="preview-note">{customYield && !customYield.valid ? customYield.error : ""}</p>}</>}
        {scene && scenario && <><PreviewImage url={scene.imageSrc} alt={`Red monochrome illustration of a huge blast at ${scenario.locationName}`} cache={cache} className="preview-scenario-image" /><p className="preview-image-caption">AI-GENERATED ILLUSTRATION · {scenario.locationName}</p><p className="preview-event-copy">{scene.description}</p><p className="preview-sources">{scene.sources.map((source) => <span key={source} title={source}>{sourceLabel(source)} </span>)}</p></>}
      </div>
      <footer>SHIFT + PAGE UP/DOWN: SCROLL DETAILS · LEAVE DROPDOWN TO DISMISS</footer>
    </aside>}
  </>, document.body);
}
