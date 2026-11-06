/** Implemented effect views and semantic selection action. */
export interface EffectViewSelectorProps {
  readonly view: "blast" | "fallout" | "audible" | "visible";
  readonly falloutAvailable: boolean;
  readonly onSelect: (view: "blast" | "fallout" | "audible" | "visible") => void;
}

/** Prototype's upper-right effect tabs, shown only after the launch settles. */
export function EffectViewSelector({ view, falloutAvailable, onSelect }: EffectViewSelectorProps) {
  return (
    <div className="effect-view-selector" role="tablist" aria-label="Effect view">
      <button
        type="button" role="tab" aria-selected={view === "blast"}
        className={`effect-view blast-view ${view === "blast" ? "selected" : ""}`}
        onClick={() => onSelect("blast")}
      >BLAST</button>
      {falloutAvailable && (
        <button
          type="button" role="tab" aria-selected={view === "fallout"}
          className={`effect-view fallout-view ${view === "fallout" ? "selected" : ""}`}
          onClick={() => onSelect("fallout")}
        >FALLOUT</button>
      )}
      <button
        type="button" role="tab" aria-selected={view === "audible"}
        className={`effect-view audible-view ${view === "audible" ? "selected" : ""}`}
        onClick={() => onSelect("audible")}
      >AUDIBLE</button>
      <button
        type="button" role="tab" aria-selected={view === "visible"}
        className={`effect-view visible-view ${view === "visible" ? "selected" : ""}`}
        onClick={() => onSelect("visible")}
      >VISIBLE</button>
    </div>
  );
}
