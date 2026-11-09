/** A flat chooser option; group labels are presentation only and order is stable. */
export interface PreviewOption {
  readonly id: string;
  readonly label: string;
  readonly group: string;
}

/** Input origin controls whether the list follows keyboard focus or keeps its natural scroll position. */
export type PreviewNavigation = "keyboard" | "pointer" | "scroll";

/** Open/focus lifetime and independent candidate; opening alone does not reveal a preview. */
export interface SelectionPreviewState {
  readonly open: boolean;
  readonly activeId: string;
  readonly browsed: boolean;
  readonly navigation: PreviewNavigation | null;
}

/** Semantic dropdown events, independent of committed simulator selection and camera state. */
export type SelectionPreviewAction =
  | { readonly type: "open"; readonly id: string }
  | { readonly type: "browse"; readonly id: string; readonly navigation?: PreviewNavigation }
  | { readonly type: "dismiss" };

/** Empty dropdown state shared safely because transitions always return immutable values. */
export const CLOSED_SELECTION_PREVIEW: SelectionPreviewState = { open: false, activeId: "", browsed: false, navigation: null };

/** Reduce dropdown intent; dismissal invalidates candidate state so late assets cannot reopen it. */
export function reduceSelectionPreview(state: SelectionPreviewState, action: SelectionPreviewAction): SelectionPreviewState {
  if (action.type === "dismiss") return CLOSED_SELECTION_PREVIEW;
  if (action.type === "open") return { open: true, activeId: action.id, browsed: false, navigation: null };
  if (!state.open) return state;
  const navigation = action.navigation ?? "keyboard";
  if (state.activeId === action.id && state.browsed && state.navigation === navigation) return state;
  return { ...state, activeId: action.id, browsed: true, navigation };
}

/** Move through a bounded option list by an integer offset; unknown IDs begin at its first item. */
export function movePreviewOption(options: readonly PreviewOption[], activeId: string, offset: number): string {
  const index = Math.max(0, options.findIndex((option) => option.id === activeId));
  return options[Math.max(0, Math.min(options.length - 1, index + offset))]?.id ?? "";
}

/** Find an option by its case-insensitive label prefix, wrapping after the active option. */
export function findPreviewOption(options: readonly PreviewOption[], activeId: string, prefix: string): string {
  const start = options.findIndex((option) => option.id === activeId) + 1;
  for (let offset = 0; offset < options.length; offset += 1) {
    const option = options[(start + offset) % options.length]!;
    if (option.label.toLocaleLowerCase("en-US").startsWith(prefix.toLocaleLowerCase("en-US"))) return option.id;
  }
  return activeId;
}
