import { lazy, Suspense, useEffect, useReducer, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { CLOSED_SELECTION_PREVIEW, findPreviewOption, movePreviewOption, reduceSelectionPreview, type PreviewNavigation, type PreviewOption } from "../application/selectionPreview";

const PickerOverlay = lazy(() => import("./SelectionPreviewOverlay"));
const DESKTOP_QUERY = "(min-width: 601px) and (hover: hover) and (pointer: fine)";

interface PreviewSelectProps {
  readonly kind: "device" | "scenario";
  readonly label: string;
  readonly value: string;
  readonly options: readonly PreviewOption[];
  readonly children: ReactNode;
  readonly resetVersion: number;
  readonly onChange: (id: string) => void;
}

/** Progressive desktop chooser; native select semantics and mobile interaction remain available. */
export function PreviewSelect({ kind, label, value, options, children, resetVersion, onChange }: PreviewSelectProps) {
  const [eligible, setEligible] = useState(() => typeof window.matchMedia === "function" && window.matchMedia(DESKTOP_QUERY).matches);
  const [state, dispatch] = useReducer(reduceSelectionPreview, CLOSED_SELECTION_PREVIEW);
  const control = useRef<HTMLSelectElement>(null);
  const listId = `${kind}-preview-options`;
  const prefix = useRef({ text: "", at: 0 });
  const previousResetVersion = useRef(resetVersion);
  const dismiss = () => dispatch({ type: "dismiss" });
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia(DESKTOP_QUERY);
    const update = () => { setEligible(media.matches); dispatch({ type: "dismiss" }); };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (previousResetVersion.current !== resetVersion) dispatch({ type: "dismiss" });
    previousResetVersion.current = resetVersion;
  }, [resetVersion]);
  useEffect(() => {
    if (!state.open) return;
    const blur = () => dispatch({ type: "dismiss" });
    const outside = (event: PointerEvent) => {
      const target = event.target as Element;
      if (target === control.current || target.closest(`#${listId}`)) return;
      const viewport = target.closest<HTMLElement>(".selection-preview-viewport");
      if (viewport) {
        const bounds = viewport.getBoundingClientRect();
        const verticalBar = viewport.offsetWidth - viewport.clientWidth;
        const horizontalBar = viewport.offsetHeight - viewport.clientHeight;
        if ((verticalBar > 0 && viewport.scrollHeight > viewport.clientHeight && event.clientX >= bounds.right - verticalBar) || (horizontalBar > 0 && viewport.scrollWidth > viewport.clientWidth && event.clientY >= bounds.bottom - horizontalBar)) return;
      }
      dispatch({ type: "dismiss" });
      if (!target.closest("button, input, select, [role=tab], a, .maplibregl-ctrl-attrib")) {
        event.preventDefault(); event.stopPropagation();
        const gesture = new AbortController();
        const consumeClick = (click: MouseEvent) => { click.preventDefault(); click.stopPropagation(); gesture.abort(); };
        document.addEventListener("click", consumeClick, { capture: true, once: true, signal: gesture.signal });
        window.addEventListener("pointerup", () => setTimeout(() => gesture.abort(), 0), { once: true, signal: gesture.signal });
        window.addEventListener("pointercancel", () => gesture.abort(), { once: true, signal: gesture.signal });
        window.addEventListener("blur", () => gesture.abort(), { once: true, signal: gesture.signal });
      }
      control.current?.blur();
    };
    window.addEventListener("blur", blur);
    window.addEventListener("resize", blur);
    document.addEventListener("pointerdown", outside, true);
    return () => { window.removeEventListener("blur", blur); window.removeEventListener("resize", blur); document.removeEventListener("pointerdown", outside, true); };
  }, [state.open, listId]);
  const browse = (id: string, navigation: PreviewNavigation = "keyboard") => dispatch({ type: "browse", id, navigation });
  const commit = (id: string) => { onChange(id); dismiss(); };
  const handleKey = (event: KeyboardEvent<HTMLSelectElement>) => {
    if (!eligible) return;
    if (state.open && state.browsed && event.shiftKey && ["PageUp", "PageDown"].includes(event.key)) {
      event.preventDefault();
      const details = document.querySelector<HTMLElement>(".selection-preview-viewport");
      details?.scrollBy({ top: details.clientHeight * .8 * (event.key === "PageUp" ? -1 : 1) });
      return;
    }
    if (["Tab", "Escape"].includes(event.key)) { dismiss(); if (event.key === "Escape") event.preventDefault(); return; }
    if (["Enter", " "].includes(event.key)) {
      event.preventDefault();
      if (state.open) commit(state.activeId); else dispatch({ type: "open", id: value });
      return;
    }
    if (["ArrowDown", "ArrowUp", "Home", "End", "PageDown", "PageUp"].includes(event.key)) {
      event.preventDefault();
      if (!state.open) dispatch({ type: "open", id: value });
      const id = event.key === "Home" ? options[0]?.id ?? "" : event.key === "End" ? options.at(-1)?.id ?? "" : movePreviewOption(options, state.open ? state.activeId : value, event.key === "ArrowUp" ? -1 : event.key === "PageUp" ? -5 : event.key === "PageDown" ? 5 : 1);
      browse(id); return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const now = performance.now();
      prefix.current = { text: now - prefix.current.at < 700 ? prefix.current.text + event.key : event.key, at: now };
      if (!state.open) dispatch({ type: "open", id: value });
      browse(findPreviewOption(options, state.open ? state.activeId : value, prefix.current.text));
    }
  };
  return <>
    <select ref={control} aria-label={label} value={value} onChange={(event) => commit(event.target.value)}
      aria-expanded={eligible ? state.open : undefined} aria-controls={eligible && state.open ? listId : undefined}
      aria-activedescendant={eligible && state.open ? `${listId}-${state.activeId || "empty"}` : undefined}
      aria-describedby={eligible && state.open && state.browsed && state.activeId !== "" ? "selection-preview-description" : undefined}
      onBlur={dismiss} onKeyDown={handleKey}
      onMouseDown={(event) => {
        if (!eligible || event.button !== 0) return;
        event.preventDefault(); control.current?.focus();
        if (state.open) dismiss(); else dispatch({ type: "open", id: value });
      }}>
      {children}
    </select>
    {eligible && state.open && <Suspense fallback={<div className="preview-picker-loading">Loading catalog…</div>}>
      <PickerOverlay kind={kind} options={options} state={state} listId={listId}
        anchor={control.current?.getBoundingClientRect()} onBrowse={browse} onCommit={commit} />
    </Suspense>}
  </>;
}
