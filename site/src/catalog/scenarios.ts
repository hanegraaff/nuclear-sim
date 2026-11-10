import type { GeoPoint } from "../domain/geodesy";

/** A prototype scenario, its device ID, and target location in geographic degrees. */
export interface ScenarioDefinition {
  readonly id: string;
  readonly kind: "historical" | "hypothetical";
  readonly name: string;
  readonly deviceId: string;
  readonly point: GeoPoint;
  readonly locationName: string;
}

/** Prototype scenarios in selector order; locations are illustrative target coordinates. */
export const SCENARIOS: readonly ScenarioDefinition[] = [
  { id: "hiroshima", kind: "historical", name: "Hiroshima · 1945", deviceId: "little-boy", point: { longitude: 132.4547, latitude: 34.3947 }, locationName: "Hiroshima hypocenter" },
  { id: "nagasaki", kind: "historical", name: "Nagasaki · 1945", deviceId: "fat-man", point: { longitude: 129.8633, latitude: 32.7737 }, locationName: "Nagasaki hypocenter" },
  { id: "trinity", kind: "historical", name: "Trinity · New Mexico, 1945", deviceId: "trinity-gadget", point: { longitude: -106.4754, latitude: 33.6773 }, locationName: "Trinity Site" },
  { id: "sedan", kind: "historical", name: "Sedan · Nevada, 1962", deviceId: "sedan", point: { longitude: -116.0467, latitude: 37.1767 }, locationName: "Sedan Crater, Nevada" },
  { id: "castle-bravo", kind: "historical", name: "Castle Bravo · Bikini Atoll, 1954", deviceId: "castle-bravo", point: { longitude: 165.27194, latitude: 11.69722 }, locationName: "Castle Bravo ground zero" },
  { id: "tsar-bomba", kind: "historical", name: "Tsar Bomba · Novaya Zemlya, 1961", deviceId: "tsar-bomba", point: { longitude: 54.5, latitude: 73.85 }, locationName: "Tsar Bomba test area" },
  { id: "rds-1-semipalatinsk", kind: "historical", name: "RDS-1 · Semipalatinsk, 1949", deviceId: "rds-1", point: { longitude: 77.814, latitude: 50.437 }, locationName: "Semipalatinsk Ground Zero" },
  { id: "gerboise-reggane", kind: "historical", name: "Gerboise Bleue · Reggane, 1960", deviceId: "gerboise-bleue", point: { longitude: -0.05722, latitude: 26.31167 }, locationName: "Gerboise Bleue test area" },
  { id: "ivy-mike-elugelab", kind: "historical", name: "Ivy Mike · Elugelab, 1952", deviceId: "ivy-mike", point: { longitude: 162.19477, latitude: 11.67023 }, locationName: "Ivy Mike crater" },
  { id: "orange-herald-malden", kind: "historical", name: "Orange Herald · Malden Island, 1957", deviceId: "orange-herald", point: { longitude: -154.9, latitude: -4.05 }, locationName: "Malden Island test area" },
  { id: "canopus-fangataufa", kind: "historical", name: "Canopus · Fangataufa, 1968", deviceId: "canopus", point: { longitude: -138.725009, latitude: -22.243336 }, locationName: "Canopus detonation point" },
  { id: "tsar-manhattan", kind: "hypothetical", name: "What if: Tsar Bomba over Manhattan?", deviceId: "tsar-bomba", point: { longitude: -73.9857, latitude: 40.7484 }, locationName: "Midtown Manhattan" },
  { id: "tokyo-100", kind: "hypothetical", name: "What if: 100 Mt over Tokyo?", deviceId: "city-breaker", point: { longitude: 139.6917, latitude: 35.6895 }, locationName: "Central Tokyo" },
  { id: "europe-continent", kind: "hypothetical", name: "Continent scale · Central Europe", deviceId: "continent-scale", point: { longitude: 8.6821, latitude: 50.1109 }, locationName: "Central Europe" },
  { id: "north-america-continent", kind: "hypothetical", name: "Continent scale · North America", deviceId: "continent-scale", point: { longitude: -98.4842, latitude: 39.0119 }, locationName: "Geographic center of the contiguous US" },
  { id: "australia-continent", kind: "hypothetical", name: "Continent scale · Australia", deviceId: "continent-scale", point: { longitude: 134, latitude: -25 }, locationName: "Central Australia · illustrative" },
];

/** Find a scenario by its stable ID, returning undefined for an unknown ID. */
export function getScenarioById(id: string): ScenarioDefinition | undefined {
  return SCENARIOS.find((scenario) => scenario.id === id);
}
