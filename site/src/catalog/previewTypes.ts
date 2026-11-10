/** Research status for a public exterior fact; estimates are visibly marked (est). */
export type FactConfidence = "sourced" | "reported" | "estimated" | "unknown" | "inapplicable";

/** Display-ready researched value, with explicit units in value and source URLs. */
export interface DossierFact {
  /** Optional fact-specific label distinguishing complete devices, warheads, and carrier loads. */
  readonly label?: string;
  readonly value: string;
  readonly confidence: FactConfidence;
  readonly sources: readonly string[];
}

/** Exterior silhouette asset in pixels; it is illustrative and has no drawn scale reference. */
export interface DossierSilhouette {
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly confidence: FactConfidence;
  readonly sources: readonly string[];
}

/** Public, nontechnical device history and exterior dimensions; never model inputs. */
export interface DeviceDossier {
  readonly id: string;
  readonly entityLabel: string;
  readonly length: DossierFact;
  readonly totalMass: DossierFact;
  readonly payloadMass: DossierFact;
  readonly created: DossierFact;
  readonly retired: DossierFact;
  readonly country: DossierFact;
  readonly silhouette: DossierSilhouette;
  readonly notes: string;
}

/** Static artistic scenario preview with sourced event prose; image dimensions are pixels. */
export interface ScenarioPreview {
  readonly id: string;
  readonly imageSrc: string;
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly description: string;
  readonly sources: readonly string[];
}
