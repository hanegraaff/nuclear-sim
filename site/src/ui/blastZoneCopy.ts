import type { BlastZoneId } from "../domain/blastZones";

/** Prototype descriptions shared by single-strike markers and multi legend. */
export const BLAST_ZONE_COPY: Record<BlastZoneId, { readonly label: string; readonly description: string }> = {
  light: { label: "LIGHT", description: "Windows burst. Roofs fail. Flying glass turns streets into a hazard." },
  moderate: { label: "MODERATE", description: "Homes collapse, fires spread and trapped survivors face severe burns." },
  severe: { label: "SEVERE", description: "Most buildings are crushed. Survival above ground is unlikely." },
  fireball: { label: "FIREBALL", description: "People and structures are consumed in incandescent heat." },
};
