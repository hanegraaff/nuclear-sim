"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { ChevronDown, Eye, EyeOff, Moon, Radiation, RotateCcw } from "lucide-react";
import { ExplosionRenderer, explosionPresentation } from "./explosion-renderer.mjs";
import { combineFieldIntensity, rangeFieldIntensity, rangeMarkerColor, rangePaletteGradient, RANGE_FIELD_LUTS } from "./range-field.mjs";
import { drawMissileFlight, latestLaunchGroup, viewportFlightRoute } from "./missile-flight.mjs";
import { FireballRenderer } from "./fireball-renderer.mjs";
import { useScreenGroundSampling, sampleRadialRow } from "./ground-sampling.mjs";
import { GroundDistanceCache, CameraGeometryCache, shouldPaintBlastField } from "./multi-blast-cache.mjs";

type ExplosionFieldFrame = Parameters<Parameters<ExplosionRenderer["paintField"]>[3]>[0];

type Point = { lng: number; lat: number; name: string };
type Phase = "armed" | "inbound" | "detonating" | "complete";
type MapMode = "day" | "night";
type EffectView = "blast" | "fallout" | "audible" | "visible";

const EARTH_RADIUS_KM = 6371;
const MAX_SURFACE_DISTANCE_KM = Math.PI * EARTH_RADIUS_KM - 1;
const OBSERVER_EYE_HEIGHT_KM = 0.0017;
const MISSILE_FLIGHT_MS = 6500;
const ANIMATION_MS = 4600;
const BLAST_FALLOFF_FACTOR = 1.24;
const MERCATOR_METERS_PER_PIXEL_AT_ZOOM_0 = 78271.516964;

const REAL_WEAPONS = [
  { id: "w54", name: "W54 / Davy Crockett", yieldMt: 0.00002, display: "0.02 kt" },
  { id: "w48", name: "W48 artillery shell", yieldMt: 0.000072, display: "0.072 kt" },
  { id: "sadm", name: "W54 SADM", yieldMt: 0.001, display: "1 kt" },
  { id: "little-boy", name: "Little Boy", yieldMt: 0.015, display: "15 kt" },
  { id: "trinity-gadget", name: "Trinity Gadget", yieldMt: 0.0186, display: "18.6 kt" },
  { id: "fat-man", name: "Fat Man", yieldMt: 0.021, display: "21 kt" },
  { id: "rds-1", name: "RDS-1 / First Lightning", yieldMt: 0.022, display: "22 kt" },
  { id: "b61", name: "B61-12 (max)", yieldMt: 0.05, display: "50 kt" },
  { id: "gerboise-bleue", name: "Gerboise Bleue", yieldMt: 0.07, display: "70 kt" },
  { id: "w76", name: "W76-1", yieldMt: 0.09, display: "90 kt" },
  { id: "sedan", name: "Sedan Test Device", yieldMt: 0.104, display: "104 kt" },
  { id: "w80", name: "W80", yieldMt: 0.15, display: "150 kt" },
  { id: "greenhouse-george", name: "Greenhouse George", yieldMt: 0.225, display: "225 kt" },
  { id: "w87", name: "W87", yieldMt: 0.3, display: "300 kt" },
  { id: "b61-7", name: "B61-7 (max)", yieldMt: 0.34, display: "340 kt" },
  { id: "rds-6s", name: "RDS-6s / Joe-4", yieldMt: 0.4, display: "400 kt" },
  { id: "w88", name: "W88", yieldMt: 0.475, display: "475 kt" },
  { id: "ivy-king", name: "Ivy King", yieldMt: 0.5, display: "500 kt" },
  { id: "orange-herald", name: "Orange Herald", yieldMt: 0.72, display: "720 kt" },
  { id: "w59", name: "W59", yieldMt: 1, display: "1 Mt" },
  { id: "b83", name: "B83", yieldMt: 1.2, display: "1.2 Mt" },
  { id: "starfish-prime", name: "Starfish Prime / W49", yieldMt: 1.4, display: "1.4 Mt" },
  { id: "rds-37", name: "RDS-37 test yield", yieldMt: 1.6, display: "1.6 Mt" },
  { id: "grapple-x", name: "Grapple X / Round C", yieldMt: 1.8, display: "1.8 Mt" },
  { id: "canopus", name: "Canopus", yieldMt: 2.6, display: "2.6 Mt" },
  { id: "grapple-y", name: "Grapple Y", yieldMt: 3, display: "3 Mt" },
  { id: "w39", name: "W39", yieldMt: 3.8, display: "3.8 Mt" },
  { id: "b53", name: "B53", yieldMt: 9, display: "9 Mt" },
  { id: "hard-tack-poplar", name: "Hardtack Poplar", yieldMt: 9.3, display: "9.3 Mt" },
  { id: "ivy-mike", name: "Ivy Mike", yieldMt: 10.4, display: "10.4 Mt" },
  { id: "castle-yankee", name: "Castle Yankee", yieldMt: 13.5, display: "13.5 Mt" },
  { id: "castle-bravo", name: "Castle Bravo", yieldMt: 15, display: "15 Mt" },
  { id: "mk41", name: "Mark 41", yieldMt: 25, display: "25 Mt" },
  { id: "tsar-bomba", name: "Tsar Bomba", yieldMt: 50, display: "50 Mt" },
] as const;

const CONVENTIONAL_WEAPONS = [
  { id: "moab", name: "GBU-43/B MOAB", yieldMt: 0.000011, display: "11 t TNT" },
  { id: "foab", name: "FOAB (reported)", yieldMt: 0.000044, display: "44 t TNT · reported" },
] as const;

// Missile systems are represented by a documented/representative MIRV loadout.
// Their blast radii are computed per reentry vehicle, never from aggregate yield.
const MIRV_WEAPONS = [
  { id: "rs-24-yars", name: "RS-24 Yars / SS-29", yieldMt: 0.525, display: "3 × 175 kt · modeled" },
  { id: "rsm-56-bulava", name: "RSM-56 Bulava / SS-NX-30", yieldMt: 1.2, display: "10 × 120 kt · modeled" },
  { id: "rs-28-sarmat", name: "RS-28 Sarmat / Satan II", yieldMt: 5, display: "10 × 500 kt · modeled" },
] as const;

const HYPOTHETICAL_WEAPONS = [
  { id: "city-breaker", name: "100 Mt scale study", yieldMt: 100, display: "100 Mt" },
  { id: "gigaton-study", name: "1 Gt scale study", yieldMt: 1_000, display: "1 Gt" },
  { id: "regional-event", name: "10 Gt regional extreme", yieldMt: 10_000, display: "10 Gt" },
  { id: "hundred-gigaton", name: "100 Gt regional extreme", yieldMt: 100_000, display: "100 Gt" },
  { id: "continent-scale", name: "1.5 Tt small-continent study", yieldMt: 1_500_000, display: "1.5 Tt" },
  { id: "large-continent", name: "20 Tt large-continent study", yieldMt: 20_000_000, display: "20 Tt" },
  { id: "hemisphere-scale", name: "100 Tt hemisphere study", yieldMt: 100_000_000, display: "100 Tt" },
  { id: "earth-spanning", name: "1 Pt Earth-span stress test", yieldMt: 1_000_000_000, display: "1 Pt" },
] as const;

const WEAPONS = [...CONVENTIONAL_WEAPONS, ...REAL_WEAPONS, ...MIRV_WEAPONS, ...HYPOTHETICAL_WEAPONS] as const;

const LOCATIONS: Record<string, Point> = {
  "New York, NY": { lng: -73.9857, lat: 40.7484, name: "Midtown Manhattan" },
  "Los Angeles, CA": { lng: -118.2437, lat: 34.0522, name: "Los Angeles" },
  "London, UK": { lng: -0.1276, lat: 51.5072, name: "Central London" },
  "Paris, France": { lng: 2.3522, lat: 48.8566, name: "Central Paris" },
  "Tokyo, Japan": { lng: 139.6917, lat: 35.6895, name: "Central Tokyo" },
  "Moscow, Russia": { lng: 37.6173, lat: 55.7558, name: "Central Moscow" },
};

const SCENARIOS = [
  { id: "hiroshima", kind: "historical", name: "Hiroshima · 1945", weaponId: "little-boy", point: { lng: 132.4547, lat: 34.3947, name: "Hiroshima hypocenter" } },
  { id: "nagasaki", kind: "historical", name: "Nagasaki · 1945", weaponId: "fat-man", point: { lng: 129.8633, lat: 32.7737, name: "Nagasaki hypocenter" } },
  { id: "trinity", kind: "historical", name: "Trinity · New Mexico, 1945", weaponId: "trinity-gadget", point: { lng: -106.4754, lat: 33.6773, name: "Trinity Site" } },
  { id: "sedan", kind: "historical", name: "Sedan · Nevada, 1962", weaponId: "sedan", point: { lng: -116.0467, lat: 37.1767, name: "Sedan Crater, Nevada" } },
  { id: "castle-bravo", kind: "historical", name: "Castle Bravo · Bikini Atoll, 1954", weaponId: "castle-bravo", point: { lng: 165.27194, lat: 11.69722, name: "Castle Bravo ground zero" } },
  { id: "tsar-bomba", kind: "historical", name: "Tsar Bomba · Novaya Zemlya, 1961", weaponId: "tsar-bomba", point: { lng: 54.5, lat: 73.85, name: "Tsar Bomba test area" } },
  { id: "rds-1-semipalatinsk", kind: "historical", name: "RDS-1 · Semipalatinsk, 1949", weaponId: "rds-1", point: { lng: 77.814, lat: 50.437, name: "Semipalatinsk Ground Zero" } },
  { id: "gerboise-reggane", kind: "historical", name: "Gerboise Bleue · Reggane, 1960", weaponId: "gerboise-bleue", point: { lng: -0.05722, lat: 26.31167, name: "Gerboise Bleue test area" } },
  { id: "ivy-mike-elugelab", kind: "historical", name: "Ivy Mike · Elugelab, 1952", weaponId: "ivy-mike", point: { lng: 162.19477, lat: 11.67023, name: "Ivy Mike crater" } },
  { id: "orange-herald-malden", kind: "historical", name: "Orange Herald · Malden Island, 1957", weaponId: "orange-herald", point: { lng: -154.9, lat: -4.05, name: "Malden Island test area" } },
  { id: "canopus-fangataufa", kind: "historical", name: "Canopus · Fangataufa, 1968", weaponId: "canopus", point: { lng: -138.725009, lat: -22.243336, name: "Canopus detonation point" } },
  { id: "tsar-manhattan", kind: "hypothetical", name: "What if: Tsar Bomba over Manhattan?", weaponId: "tsar-bomba", point: { lng: -73.9857, lat: 40.7484, name: "Midtown Manhattan" } },
  { id: "tokyo-100", kind: "hypothetical", name: "What if: 100 Mt over Tokyo?", weaponId: "city-breaker", point: { lng: 139.6917, lat: 35.6895, name: "Central Tokyo" } },
  { id: "europe-continent", kind: "hypothetical", name: "Continent scale · Central Europe", weaponId: "continent-scale", point: { lng: 8.6821, lat: 50.1109, name: "Central Europe" } },
  { id: "north-america-continent", kind: "hypothetical", name: "Continent scale · North America", weaponId: "continent-scale", point: { lng: -98.4842, lat: 39.0119, name: "Geographic center of the contiguous US" } },
  { id: "africa-continent", kind: "hypothetical", name: "Large-continent scale · Africa", weaponId: "large-continent", point: { lng: 21, lat: 8, name: "Central Africa · illustrative" } },
  { id: "asia-continent", kind: "hypothetical", name: "Large-continent scale · Asia", weaponId: "large-continent", point: { lng: 90, lat: 45, name: "Central Asia · illustrative" } },
  { id: "australia-continent", kind: "hypothetical", name: "Continent scale · Australia", weaponId: "continent-scale", point: { lng: 134, lat: -25, name: "Central Australia · illustrative" } },
  { id: "point-nemo-hemisphere", kind: "hypothetical", name: "Hemisphere scale · Point Nemo", weaponId: "hemisphere-scale", point: { lng: -123.3933, lat: -48.8763, name: "Point Nemo, South Pacific" } },
  { id: "earth-thought-experiment", kind: "hypothetical", name: "Earth-span stress test · 1 Pt", weaponId: "earth-spanning", point: { lng: 0, lat: 0, name: "Global overlay origin" } },
] as const;

// Blast zones use a terrain-visible thermal gradient: fallout's visual language
// with enough translucency beyond the white-hot fireball to read the map.
const EFFECTS = [
  { id: "light", label: "LIGHT", description: "Windows burst. Roofs fail. Flying glass turns streets into a hazard.", color: "#7049c9", activeOpacity: 0.36 },
  { id: "moderate", label: "MODERATE", description: "Homes collapse, fires spread and trapped survivors face severe burns.", color: "#c82b78", activeOpacity: 0.5 },
  { id: "severe", label: "SEVERE", description: "Most buildings are crushed. Survival above ground is unlikely.", color: "#f34a34", activeOpacity: 0.66 },
  { id: "fireball", label: "FIREBALL", description: "People and structures are consumed in incandescent heat.", color: "#fff0a6", activeOpacity: 0.98 },
] as const;

// Nested deposition thresholds used by the H+24 thermal field and its ruler.
// Percentages are normalized model intensity, not an instrument dose reading.
const FALLOUT_BANDS = [
  { id: "trace", label: "CONTAMINATED", range: "Outer deposition", dose: "Below ~0.5 Gy", mortality: "No immediate sickness; cancer risk rises", color: "#6946c7", lengthFactor: 1, widthFactor: 1, threshold: 0.04, description: "You feel nothing. Radioactive dust still enters lungs, food and water." },
  { id: "elevated", label: "ACUTE SICKNESS", range: "Dilute plume", dose: "~0.5–2 Gy", mortality: "Nausea, exhaustion and falling blood counts", color: "#d92f92", lengthFactor: 0.74, widthFactor: 0.72, threshold: 0.16, description: "Nausea may begin within hours. Shelter now; contaminated dust keeps dosing you." },
  { id: "high", label: "CRITICAL DOSE", range: "Dense plume", dose: "~2–6 Gy", mortality: "Vomiting, bleeding and infection; deaths climb fast", color: "#ff5b27", lengthFactor: 0.48, widthFactor: 0.48, threshold: 0.38, description: "Radiation sickness becomes severe. Without hospital care, survival falls sharply." },
  { id: "extreme", label: "LETHAL DOSE", range: "Core plume", dose: "Above ~6 Gy", mortality: "Rapid collapse; death likely without specialist care", color: "#fff0a6", lengthFactor: 0.24, widthFactor: 0.27, threshold: 0.72, description: "Violent sickness can begin within hours. Deep shelter and immediate treatment are the only chance." },
] as const;

const RANGE_EXPERIENCE_BANDS = [
  {
    id: "near",
    innerFactor: 0,
    outerFactor: 0.22,
    audibleTitle: "DEAFENING",
    audibleCopy: "Pain, disorientation and permanent hearing damage are possible.",
    audibleLevel: "~120–140+ dB peak",
    visibleTitle: "BLINDING FLASH",
    visibleCopy: "The sky turns white. Looking toward it can burn the retina.",
    visibleLevel: "Sky-filling glare",
  },
  {
    id: "inner",
    innerFactor: 0.22,
    outerFactor: 0.45,
    audibleTitle: "THUNDEROUS",
    audibleCopy: "A cannon-like boom arrives late, then rolls across the horizon.",
    audibleLevel: "~100–120 dB peak",
    visibleTitle: "BRILLIANT HORIZON",
    visibleCopy: "Clouds and buildings flash blue-white; the rising column is unmistakable.",
    visibleLevel: "Brilliant direct glow",
  },
  {
    id: "middle",
    innerFactor: 0.45,
    outerFactor: 0.72,
    audibleTitle: "DISTANT THUNDER",
    audibleCopy: "A delayed low boom arrives like unnatural, sustained thunder.",
    audibleLevel: "~75–100 dB peak",
    visibleTitle: "DISTANT FIRELIGHT",
    visibleCopy: "A hard blue-white pulse blooms low on the horizon.",
    visibleLevel: "Clear distant glow",
  },
  {
    id: "edge",
    innerFactor: 0.72,
    outerFactor: 1,
    audibleTitle: "FAINT RUMBLE",
    audibleCopy: "Minutes later, a faint low rumble may be all that reaches you.",
    audibleLevel: "~45–75 dB peak",
    visibleTitle: "FAINT HORIZON GLOW",
    visibleCopy: "Only a faint cold glow touches the horizon before vanishing.",
    visibleLevel: "Faint horizon glow",
  },
] as const;

type WindModel = {
  bearing: number;
  surfaceBearing: number;
  speedKph: number;
  band: string;
  direction: string;
  curve: number;
};

type FalloutDimensions = {
  lengthKm: number;
  widthKm: number;
  localRadiusKm: number;
};

type WeaponProfile = {
  nuclear: boolean;
  fallout: boolean;
  warheads: number;
  warheadYieldMt: number;
  burstHeightKm: number;
};

type EffectId = (typeof EFFECTS)[number]["id"];
type BlastRadii = Record<EffectId, number>;
type ZoneBand = {
  id: EffectId;
  label: string;
  description: string;
  color: string;
  innerKm: number;
  outerKm: number;
  areaKm2: number;
};

type FalloutId = (typeof FALLOUT_BANDS)[number]["id"];
type RangeBandId = (typeof RANGE_EXPERIENCE_BANDS)[number]["id"];
type FalloutZone = {
  id: FalloutId;
  label: string;
  description: string;
  color: string;
  range: string;
  dose: string;
  mortality: string;
  innerKm: number;
  outerKm: number;
  widthKm: number;
  areaKm2: number;
};

type MassStrike = {
  id: number;
  target: Point;
  delayMs: number;
  flightMs: number;
  blastMs: number;
  yieldMt: number;
  radii: BlastRadii;
  nuclear: boolean;
  profile: WeaponProfile;
  carrierLead: boolean;
  flightGroup: { id: number; start: Point; control: Point; aim: Point; carrierMs: number; splitMs: number; angle: number; routeReady: boolean };
};

function sphericalCapArea(radiusKm: number) {
  const radius = Math.min(MAX_SURFACE_DISTANCE_KM, Math.max(0, radiusKm));
  return 2 * Math.PI * EARTH_RADIUS_KM ** 2 * (1 - Math.cos(radius / EARTH_RADIUS_KM));
}

function zoneBands(radii: BlastRadii): ZoneBand[] {
  const boundaries: Array<[EffectId, number, number]> = [
    ["fireball", 0, radii.fireball],
    ["severe", radii.fireball, radii.severe],
    ["moderate", radii.severe, radii.moderate],
    ["light", radii.moderate, radii.light],
  ];
  return boundaries.map(([id, innerKm, outerKm]) => {
    const effect = EFFECTS.find((entry) => entry.id === id)!;
    return {
      id,
      label: effect.label,
      description: effect.description,
      color: effect.color,
      innerKm,
      outerKm,
      areaKm2: Math.max(0, sphericalCapArea(outerKm) - sphericalCapArea(innerKm)),
    };
  });
}

function formatYield(mt: number) {
  const scaled = (value: number, unit: string) => `${value >= 1_000_000 ? value.toExponential(2) : value.toLocaleString(undefined, { maximumFractionDigits: value < 10 ? 2 : 0 })} ${unit}`;
  if (mt >= 1_000_000_000) return scaled(mt / 1_000_000_000, "Pt");
  if (mt >= 1_000_000) return scaled(mt / 1_000_000, "Tt");
  if (mt >= 1_000) return scaled(mt / 1_000, "Gt");
  if (mt < 0.001) return `${(mt * 1000).toFixed(3)} kt`;
  if (mt < 1) return `${Math.round(mt * 1000)} kt`;
  return `${mt.toFixed(mt < 10 ? 1 : 0)} Mt`;
}

function formatDistance(km: number) {
  if (!Number.isFinite(km) || km >= MAX_SURFACE_DISTANCE_KM) return "20,000 km+";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 100) return `${km.toFixed(km < 10 ? 2 : 1)} km`;
  return `${Math.round(km).toLocaleString()} km`;
}

function niceScaleDistance(targetKm: number) {
  const safeTarget = Math.max(0.0001, targetKm);
  const magnitude = Math.pow(10, Math.floor(Math.log10(safeTarget)));
  const normalized = safeTarget / magnitude;
  const step = normalized >= 5 ? 5 : normalized >= 2 ? 2 : 1;
  return step * magnitude;
}

function formatArea(areaKm2: number) {
  if (areaKm2 < 0.01) return `${Math.round(areaKm2 * 1_000_000).toLocaleString()} m²`;
  if (areaKm2 < 1_000) return `${areaKm2.toFixed(areaKm2 < 10 ? 2 : 1)} km²`;
  if (areaKm2 < 1_000_000) return `${Math.round(areaKm2).toLocaleString()} km²`;
  return `${(areaKm2 / 1_000_000).toFixed(1)}M km²`;
}

function destinationPoint(origin: Point, distanceKm: number, bearingDegrees: number): Point {
  const angularDistance = Math.min(MAX_SURFACE_DISTANCE_KM, Math.max(0, distanceKm)) / EARTH_RADIUS_KM;
  const bearing = (bearingDegrees * Math.PI) / 180;
  const latitude = (origin.lat * Math.PI) / 180;
  const longitude = (origin.lng * Math.PI) / 180;
  const targetLatitude = Math.asin(
    Math.sin(latitude) * Math.cos(angularDistance)
    + Math.cos(latitude) * Math.sin(angularDistance) * Math.cos(bearing),
  );
  const targetLongitude = longitude + Math.atan2(
    Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latitude),
    Math.cos(angularDistance) - Math.sin(latitude) * Math.sin(targetLatitude),
  );
  return {
    lng: ((targetLongitude * 180 / Math.PI + 540) % 360) - 180,
    lat: targetLatitude * 180 / Math.PI,
    name: origin.name,
  };
}

function surfaceDistanceKm(a: Pick<Point, "lng" | "lat">, b: Pick<Point, "lng" | "lat">) {
  const latitudeA = (a.lat * Math.PI) / 180;
  const latitudeB = (b.lat * Math.PI) / 180;
  const latitudeDelta = latitudeB - latitudeA;
  const longitudeDelta = ((b.lng - a.lng + 540) % 360 - 180) * Math.PI / 180;
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(Math.max(0, haversine))));
}

type DistanceGridTerms = {
  latitudeHaversines: Float64Array;
  latitudeCosines: Float64Array;
  longitudeHaversines: Float64Array;
};

function prepareDistanceGrid(origin: Pick<Point, "lng" | "lat">, longitudes: number[], latitudes: number[]): DistanceGridTerms {
  const originLatitude = origin.lat * Math.PI / 180;
  const originCosine = Math.cos(originLatitude);
  const latitudeHaversines = new Float64Array(latitudes.length);
  const latitudeCosines = new Float64Array(latitudes.length);
  const longitudeHaversines = new Float64Array(longitudes.length);

  latitudes.forEach((latitude, index) => {
    const latitudeRadians = latitude * Math.PI / 180;
    latitudeHaversines[index] = Math.sin((latitudeRadians - originLatitude) / 2) ** 2;
    latitudeCosines[index] = originCosine * Math.cos(latitudeRadians);
  });
  longitudes.forEach((longitude, index) => {
    const longitudeDelta = ((longitude - origin.lng + 540) % 360 - 180) * Math.PI / 180;
    longitudeHaversines[index] = Math.sin(longitudeDelta / 2) ** 2;
  });
  return { latitudeHaversines, latitudeCosines, longitudeHaversines };
}

function distanceFromGridTerms(terms: DistanceGridTerms, x: number, y: number) {
  const haversine = terms.latitudeHaversines[y]
    + terms.latitudeCosines[y] * terms.longitudeHaversines[x];
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(Math.max(0, haversine))));
}

function sphericalMeanPoint(points: Point[]): Point {
  if (points.length === 1) return points[0];
  const vector = points.reduce((sum, point) => {
    const latitude = point.lat * Math.PI / 180;
    const longitude = point.lng * Math.PI / 180;
    return {
      x: sum.x + Math.cos(latitude) * Math.cos(longitude),
      y: sum.y + Math.cos(latitude) * Math.sin(longitude),
      z: sum.z + Math.sin(latitude),
    };
  }, { x: 0, y: 0, z: 0 });
  const horizontal = Math.hypot(vector.x, vector.y);
  if (horizontal < 0.000001 && Math.abs(vector.z) < 0.000001) return points[0];
  return {
    lng: Math.atan2(vector.y, vector.x) * 180 / Math.PI,
    lat: Math.atan2(vector.z, horizontal) * 180 / Math.PI,
    name: "Combined strike center",
  };
}

function compassDirection(bearing: number) {
  const points = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return points[Math.round((((bearing % 360) + 360) % 360) / 45) % points.length];
}

function prevailingWind(point: Point): WindModel {
  const absLatitude = Math.abs(point.lat);
  const variation = Math.sin(((point.lng * 0.73 + point.lat * 1.17) * Math.PI) / 180) * 7;
  let bearing: number;
  let speedKph: number;
  let band: string;
  let curve: number;

  if (absLatitude < 7) {
    bearing = 270 + variation;
    speedKph = 12;
    band = "EQUATORIAL FLOW";
    curve = point.lat >= 0 ? -7 : 7;
  } else if (absLatitude < 30) {
    bearing = (point.lat >= 0 ? 228 : 312) + variation;
    speedKph = 26;
    band = "TRADE WIND";
    curve = point.lat >= 0 ? -10 : 10;
  } else if (absLatitude < 60) {
    bearing = (point.lat >= 0 ? 76 : 104) + variation;
    speedKph = 38;
    band = "PREVAILING WESTERLY";
    curve = point.lat >= 0 ? 9 : -9;
  } else {
    bearing = (point.lat >= 0 ? 252 : 288) + variation;
    speedKph = 31;
    band = "POLAR EASTERLY";
    curve = point.lat >= 0 ? -8 : 8;
  }

  const normalizedBearing = ((bearing % 360) + 360) % 360;
  const surfaceBearing = ((normalizedBearing + curve * 1.9 + 360) % 360);
  return { bearing: normalizedBearing, surfaceBearing, speedKph, band, direction: compassDirection(normalizedBearing), curve };
}

function falloutDimensions(yieldMt: number, wind: WindModel): FalloutDimensions {
  // Surface-burst planning envelope, normalized to the federal 10 kt reference
  // case (dangerous fallout can extend roughly 16–32 km downwind). This is a
  // dose-screening footprint, not a weather forecast; real deposition requires
  // winds aloft, precipitation, fission fraction and terrain.
  const tenKtScale = Math.cbrt(Math.max(1e-12, Math.min(Number.MAX_VALUE, yieldMt / 0.01)));
  const windScale = 0.82 + Math.min(1.45, wind.speedKph / 38) * 0.24;
  const widthKm = Math.min(MAX_SURFACE_DISTANCE_KM * 0.34, Math.max(0.35, 4.5 * tenKtScale));
  return {
    lengthKm: Math.min(MAX_SURFACE_DISTANCE_KM, Math.max(0.75, 31 * tenKtScale * windScale)),
    widthKm,
    localRadiusKm: Math.min(MAX_SURFACE_DISTANCE_KM * 0.2, Math.max(0.2, widthKm * 0.78)),
  };
}

function falloutZones(dimensions: FalloutDimensions): FalloutZone[] {
  let innerLengthFactor = 0;
  let innerArea = 0;
  return [...FALLOUT_BANDS].reverse().map((band) => {
    const outerKm = dimensions.lengthKm * band.lengthFactor;
    const innerKm = dimensions.lengthKm * innerLengthFactor;
    const widthKm = dimensions.widthKm * band.widthFactor * 2;
    // A curved Gaussian footprint occupies less area than its bounding ellipse.
    const outerArea = Math.PI * (outerKm * 0.5) * (widthKm * 0.5) * 0.72
      + Math.PI * (dimensions.localRadiusKm * band.widthFactor) ** 2;
    const zone = {
      id: band.id,
      label: band.label,
      description: band.description,
      color: band.color,
      range: band.range,
      dose: band.dose,
      mortality: band.mortality,
      innerKm,
      outerKm,
      widthKm,
      areaKm2: Math.max(0, outerArea - innerArea),
    };
    innerLengthFactor = band.lengthFactor;
    innerArea = outerArea;
    return zone;
  });
}

const THERMAL_COLOR_STOPS: ReadonlyArray<readonly [number, number, number, number, number]> = [
  [0, 25, 5, 48, 0],
  [0.05, 48, 14, 92, 70],
  [0.16, 101, 24, 126, 112],
  [0.34, 191, 34, 107, 154],
  [0.54, 241, 54, 48, 190],
  [0.73, 255, 134, 38, 220],
  [0.88, 255, 222, 92, 236],
  [1, 255, 252, 224, 249],
];

function thermalColor(intensity: number): [number, number, number, number] {
  const value = Math.max(0, Math.min(1, intensity));
  for (let index = 1; index < THERMAL_COLOR_STOPS.length; index += 1) {
    const previous = THERMAL_COLOR_STOPS[index - 1];
    const next = THERMAL_COLOR_STOPS[index];
    if (value > next[0]) continue;
    const mix = (value - previous[0]) / Math.max(0.0001, next[0] - previous[0]);
    return [
      Math.round(previous[1] + (next[1] - previous[1]) * mix),
      Math.round(previous[2] + (next[2] - previous[2]) * mix),
      Math.round(previous[3] + (next[3] - previous[3]) * mix),
      Math.round(previous[4] + (next[4] - previous[4]) * mix),
    ];
  }
  return [255, 252, 224, 249];
}

const STACKED_BLAST_COLOR_LUT = (() => {
  const lookup = new Uint8ClampedArray(256 * 4);
  for (let index = 0; index < 256; index += 1) {
    const intensity = index / 255;
    const [red, green, blue, alpha] = thermalColor(intensity);
    const offset = index * 4;
    lookup[offset] = red;
    lookup[offset + 1] = green;
    lookup[offset + 2] = blue;
    lookup[offset + 3] = index === 0 ? 0 : Math.max(20, Math.round(alpha * 0.96));
  }
  return lookup;
})();

type StackedBlastField = {
  x: number;
  y: number;
  travelledRadius: number;
  finalRadii: BlastRadii;
  origin?: Point;
  radiiKm?: BlastRadii;
  travelledKm?: number;
};

// A projected mesh can fold across the camera horizon when most of a field is
// far outside the viewport. Sample the visible ground directly in that case.
function needsGroundSampling(map: MapLibreMap, origin: Point, radiusKm: number) {
  const viewport = map.getContainer();
  return useScreenGroundSampling(map.getZoom(), origin.lat, radiusKm, viewport.clientWidth, viewport.clientHeight);
}

let projectedMaskTexture: HTMLCanvasElement | undefined;
let globalProjectedMaskTexture: HTMLCanvasElement | undefined;
const multiGroundDistanceCache = new GroundDistanceCache();

function blastDamageIntensity(distance: number, radii: BlastRadii) {
  const interpolate = (inner: number, outer: number, innerValue: number, outerValue: number) => {
    const amount = Math.max(0, Math.min(1, (distance - inner) / Math.max(0.0001, outer - inner)));
    return innerValue + (outerValue - innerValue) * amount;
  };
  if (distance <= radii.fireball) return interpolate(0, radii.fireball, 1, 0.88);
  if (distance <= radii.severe) return interpolate(radii.fireball, radii.severe, 0.88, 0.58);
  if (distance <= radii.moderate) return interpolate(radii.severe, radii.moderate, 0.58, 0.34);
  if (distance <= radii.light) return interpolate(radii.moderate, radii.light, 0.34, 0.14);
  return 0;
}

function renderStackedBlastFields(
  context: CanvasRenderingContext2D,
  mask: HTMLCanvasElement,
  peakMask: HTMLCanvasElement,
  width: number,
  height: number,
  fields: StackedBlastField[],
  map?: MapLibreMap,
) {
  if (!fields.length) return;
  const qualityCap = fields.length >= 16 ? 0.34 : fields.length >= 6 ? 0.44 : 0.58;
  const renderScale = Math.min(qualityCap, 640 / Math.max(1, width), 420 / Math.max(1, height));
  const maskWidth = Math.max(1, Math.ceil(width * renderScale));
  const maskHeight = Math.max(1, Math.ceil(height * renderScale));
  if (mask.width !== maskWidth || mask.height !== maskHeight) {
    mask.width = maskWidth;
    mask.height = maskHeight;
  }
  if (peakMask.width !== maskWidth || peakMask.height !== maskHeight) {
    peakMask.width = maskWidth;
    peakMask.height = maskHeight;
  }
  const maskContext = mask.getContext("2d", { willReadFrequently: true });
  const peakContext = peakMask.getContext("2d", { willReadFrequently: true });
  if (!maskContext || !peakContext) return;
  maskContext.setTransform(1, 0, 0, 1, 0, 0);
  maskContext.clearRect(0, 0, maskWidth, maskHeight);
  maskContext.globalCompositeOperation = "lighter";
  peakContext.setTransform(1, 0, 0, 1, 0, 0);
  peakContext.clearRect(0, 0, maskWidth, maskHeight);
  peakContext.globalCompositeOperation = "lighten";
  const contributionScale = 0.18;

  fields.forEach((field) => {
    if (map && field.origin && field.radiiKm && field.travelledKm !== undefined && (field.radiiKm.light > 2500 || needsGroundSampling(map, field.origin, field.radiiKm.light))) {
      const origin = field.origin, radii = field.radiiKm;
      const radius = Math.min(field.travelledKm, radii.light, MAX_SURFACE_DISTANCE_KM);
      if (radius <= 0) return;
      const falloff = Math.min(MAX_SURFACE_DISTANCE_KM, radius * BLAST_FALLOFF_FACTOR);
      const texture = globalProjectedMaskTexture ?? (globalProjectedMaskTexture = document.createElement("canvas"));
      if (texture.width !== maskWidth || texture.height !== maskHeight) { texture.width = maskWidth; texture.height = maskHeight; }
      const textureContext = texture.getContext("2d");
      if (!textureContext) return;
      const sumImage = textureContext.createImageData(maskWidth, maskHeight);
      const peakImage = textureContext.createImageData(maskWidth, maskHeight);
      const distances = multiGroundDistanceCache.get(map, origin, maskWidth, maskHeight, renderScale);
      for (let y = 0; y < maskHeight; y += 1) for (let x = 0; x < maskWidth; x += 1) {
        const distance = distances[y * maskWidth + x];
        if (distance > falloff) continue;
        const fade = distance <= radius ? 1 : 1 - smoothStep(radius, falloff, distance);
        const intensity = blastDamageIntensity(Math.min(distance, radius), radii) * fade;
        const offset = (y * maskWidth + x) * 4;
        sumImage.data[offset] = sumImage.data[offset + 1] = sumImage.data[offset + 2] = 255;
        sumImage.data[offset + 3] = Math.round(intensity * contributionScale * 255);
        peakImage.data[offset] = Math.round(intensity * 255);
        peakImage.data[offset + 3] = 255;
      }
      textureContext.putImageData(sumImage, 0, 0); maskContext.drawImage(texture, 0, 0);
      textureContext.putImageData(peakImage, 0, 0); peakContext.drawImage(texture, 0, 0);
      return;
    }
    if (map && field.origin && field.radiiKm && field.travelledKm !== undefined && field.radiiKm.light <= 2500) {
      const radii = field.radiiKm;
      const fieldRadius = Math.min(field.travelledKm, radii.light);
      if (fieldRadius <= 0) return;
      const extent = radii.light * BLAST_FALLOFF_FACTOR;
      const texture = projectedMaskTexture ?? (projectedMaskTexture = document.createElement("canvas"));
      if (texture.width !== 256) texture.width = texture.height = 256;
      const textureContext = texture.getContext("2d");
      if (!textureContext) return;
      const scale = texture.width / (2 * extent);
      for (const [destination, peak] of [[maskContext, false], [peakContext, true]] as const) {
        textureContext.clearRect(0, 0, texture.width, texture.height);
        const radius = fieldRadius * BLAST_FALLOFF_FACTOR;
        const gradient = textureContext.createRadialGradient(128, 128, 0, 128, 128, radius * scale);
        for (let stop = 0; stop <= 12; stop += 1) {
          const offset = stop / 12;
          const distance = radius * offset;
          const damage = blastDamageIntensity(Math.min(distance, fieldRadius), radii);
          const falloff = distance <= fieldRadius ? 1 : 1 - smoothStep(fieldRadius, radius, distance);
          const local = Math.min(1, damage * falloff);
          gradient.addColorStop(offset, peak ? `rgb(${Math.round(local * 255)},0,0)` : `rgba(255,255,255,${local * contributionScale})`);
        }
        textureContext.fillStyle = gradient;
        textureContext.beginPath(); textureContext.arc(128, 128, radius * scale, 0, Math.PI * 2); textureContext.fill();
        destination.save();
        destination.scale(renderScale, renderScale);
        warpGroundImage(destination, map, texture, field.origin, extent, fields.length >= 6 ? 6 : 8);
        destination.restore();
      }
      return;
    }
    const fieldRadius = Math.min(field.travelledRadius, field.finalRadii.light);
    if (fieldRadius < 2) return;
    const falloffRadius = fieldRadius * BLAST_FALLOFF_FACTOR;
    const scaledX = field.x * renderScale;
    const scaledY = field.y * renderScale;
    const scaledRadius = falloffRadius * renderScale;
    const sumGradient = maskContext.createRadialGradient(scaledX, scaledY, 0, scaledX, scaledY, scaledRadius);
    const peakGradient = peakContext.createRadialGradient(scaledX, scaledY, 0, scaledX, scaledY, scaledRadius);
    const stopCount = 12;
    for (let stop = 0; stop <= stopCount; stop += 1) {
      const offset = stop / stopCount;
      const distance = falloffRadius * offset;
      const damage = blastDamageIntensity(Math.min(distance, fieldRadius), field.finalRadii);
      const falloff = distance <= fieldRadius ? 1 : 1 - smoothStep(fieldRadius, falloffRadius, distance);
      const localDamage = Math.min(1, damage * falloff);
      sumGradient.addColorStop(offset, `rgba(255,255,255,${localDamage * contributionScale})`);
      peakGradient.addColorStop(offset, `rgb(${Math.round(localDamage * 255)},0,0)`);
    }
    maskContext.fillStyle = sumGradient;
    maskContext.beginPath();
    maskContext.arc(scaledX, scaledY, scaledRadius, 0, Math.PI * 2);
    maskContext.fill();
    peakContext.fillStyle = peakGradient;
    peakContext.beginPath();
    peakContext.arc(scaledX, scaledY, scaledRadius, 0, Math.PI * 2);
    peakContext.fill();
  });

  const pixels = maskContext.getImageData(0, 0, maskWidth, maskHeight);
  const peakPixels = peakContext.getImageData(0, 0, maskWidth, maskHeight);
  const data = pixels.data;
  for (let offset = 0; offset < data.length; offset += 4) {
    const peakDamage = peakPixels.data[offset] / 255;
    if (peakDamage <= 0.001) {
      data[offset + 3] = 0;
      continue;
    }
    const summedDamage = data[offset + 3] / (255 * contributionScale);
    const overlapDamage = Math.max(0, summedDamage - peakDamage);
    const combinedDamage = combineFieldIntensity(peakDamage, peakDamage + overlapDamage);
    const lookupOffset = Math.min(255, Math.round(combinedDamage * 255)) * 4;
    data[offset] = STACKED_BLAST_COLOR_LUT[lookupOffset];
    data[offset + 1] = STACKED_BLAST_COLOR_LUT[lookupOffset + 1];
    data[offset + 2] = STACKED_BLAST_COLOR_LUT[lookupOffset + 2];
    data[offset + 3] = STACKED_BLAST_COLOR_LUT[lookupOffset + 3];
  }
  maskContext.globalCompositeOperation = "source-over";
  maskContext.putImageData(pixels, 0, 0);
  context.save();
  context.globalCompositeOperation = "source-over";
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(mask, 0, 0, maskWidth, maskHeight, 0, 0, width, height);
  context.restore();
}

function drawBlastShockwave(context: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  context.save();
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.globalAlpha = 0.96;
  context.strokeStyle = "#ff3b24";
  context.lineWidth = 10;
  context.shadowColor = "#ff2b18";
  context.shadowBlur = 22;
  context.stroke();
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.globalAlpha = 1;
  context.strokeStyle = "#fffdf4";
  context.lineWidth = 3.2;
  context.shadowBlur = 0;
  context.stroke();
  context.restore();
}

function deterministicNoise(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

type ProjectedCarrier = { start: { x: number; y: number }; control: { x: number; y: number }; aim: { x: number; y: number } };

function drawStrikeFlight(context: CanvasRenderingContext2D, map: MapLibreMap, strike: MassStrike, elapsedMs: number, reducedMotion: boolean, dense: boolean, carriers?: Map<number, ProjectedCarrier>) {
  const group = strike.flightGroup;
  // Before separation only the carrier is visible; after exhaust disperses,
  // there is no flight artwork left to paint.
  if ((!strike.carrierLead && group.splitMs && elapsedMs < group.splitMs) || elapsedMs >= strike.flightMs + (reducedMotion ? 0 : 3000)) return;
  let carrier = carriers?.get(group.id);
  if (!carrier) {
    carrier = {
      start: map.project([group.start.lng, group.start.lat]),
      control: map.project([group.control.lng, group.control.lat]),
      aim: map.project([group.aim.lng, group.aim.lat]),
    };
    carriers?.set(group.id, carrier);
  }
  drawMissileFlight(context, {
    ...carrier,
    target: map.project([strike.target.lng, strike.target.lat]),
    carrierMs: group.carrierMs,
    flightMs: strike.flightMs,
    splitMs: group.splitMs,
  }, elapsedMs, { lead: strike.carrierLead, seed: strike.id * 193, reducedMotion, dense });
}

function drawLaunchTarget(context: CanvasRenderingContext2D, x: number, y: number, pulse: number) {
  const radius = 7.5 + pulse * 1.35;
  const gap = radius + 3.5;
  const arm = gap + 4.5;

  context.save();
  context.globalCompositeOperation = "source-over";
  context.translate(x, y);

  context.fillStyle = "rgba(12, 4, 5, .48)";
  context.beginPath();
  context.arc(0, 0, radius + 3.2, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = `rgba(255, 58, 65, ${0.82 + pulse * 0.16})`;
  context.lineWidth = 1.35;
  context.shadowColor = "rgba(255, 22, 35, .72)";
  context.shadowBlur = 5 + pulse * 3;
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
  context.moveTo(-arm, 0);
  context.lineTo(-gap, 0);
  context.moveTo(gap, 0);
  context.lineTo(arm, 0);
  context.moveTo(0, -arm);
  context.lineTo(0, -gap);
  context.moveTo(0, gap);
  context.lineTo(0, arm);
  context.stroke();

  context.shadowBlur = 7;
  context.fillStyle = "rgba(255, 93, 98, .96)";
  context.beginPath();
  context.arc(0, 0, 1.65, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function smoothStep(edge0: number, edge1: number, value: number) {
  const amount = Math.max(0, Math.min(1, (value - edge0) / Math.max(0.0001, edge1 - edge0)));
  return amount * amount * (3 - 2 * amount);
}

function sampleBlastGradient(distance: number, radii: BlastRadii) {
  const anchors = [
    { distance: 0, color: [255, 255, 247] as const, alpha: 0.995 },
    { distance: radii.fireball * 0.52, color: [255, 248, 204] as const, alpha: 0.97 },
    { distance: radii.fireball, color: [255, 167, 48] as const, alpha: 0.84 },
    { distance: radii.severe, color: [242, 63, 48] as const, alpha: 0.62 },
    { distance: radii.moderate, color: [201, 40, 111] as const, alpha: 0.46 },
    { distance: radii.light, color: [93, 59, 169] as const, alpha: 0.36 },
  ];
  const upperIndex = Math.max(1, anchors.findIndex((anchor) => distance <= anchor.distance));
  const lower = anchors[upperIndex - 1];
  const upper = anchors[upperIndex] ?? anchors[anchors.length - 1];
  const amount = Math.max(0, Math.min(1, (distance - lower.distance) / Math.max(0.0001, upper.distance - lower.distance)));
  return {
    red: Math.round(lower.color[0] + (upper.color[0] - lower.color[0]) * amount),
    green: Math.round(lower.color[1] + (upper.color[1] - lower.color[1]) * amount),
    blue: Math.round(lower.color[2] + (upper.color[2] - lower.color[2]) * amount),
    alpha: lower.alpha + (upper.alpha - lower.alpha) * amount,
  };
}

function drawZoneBands(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  travelledRadius: number,
  finalRadii: BlastRadii,
  additive = false,
) {
  drawDestructionField(context, x, y, travelledRadius, finalRadii, 1, additive);
}

// Warp the existing, unchanged thermal artwork onto the geographic ground
// plane. Small triangles approximate the map's perspective projection while
// keeping the gradient, feathering and fireball identical to the flat view.
const groundMeshCache = new CameraGeometryCache();
function warpGroundImage(context: CanvasRenderingContext2D, map: MapLibreMap, image: HTMLCanvasElement, origin: Point, extentKm: number, subdivisions = 12) {
  const size = image.width;
  const points = groundMeshCache.get(map, JSON.stringify([origin.lng, origin.lat, extentKm, subdivisions]), () => {
    const mesh: Array<Array<{ x: number; y: number }>> = [];
    for (let row = 0; row <= subdivisions; row += 1) {
      const line = [];
      for (let column = 0; column <= subdivisions; column += 1) {
        const east = (column / subdivisions * 2 - 1) * extentKm;
        const south = (row / subdivisions * 2 - 1) * extentKm;
        const distance = Math.hypot(east, south);
        const geo = destinationPoint(origin, distance, Math.atan2(east, -south) * 180 / Math.PI);
        // Choose the longitude copy nearest the impact before projecting, which
        // also works with a rotated or pitched world at the antimeridian.
        geo.lng += Math.round((origin.lng - geo.lng) / 360) * 360;
        const projected = map.project([geo.lng, geo.lat]);
        if (!Number.isFinite(projected.x) || !Number.isFinite(projected.y)) return null;
        line.push(projected);
      }
      mesh.push(line);
    }
    return mesh;
  });
  if (!points) return;
  const step = size / subdivisions;
  const container = map.getContainer();
  const triangle = (a: {x:number;y:number}, b: {x:number;y:number}, c: {x:number;y:number}, sx: number, sy: number, flipped: boolean) => {
    if (Math.max(a.x, b.x, c.x) < -2 || Math.min(a.x, b.x, c.x) > container.clientWidth + 2
      || Math.max(a.y, b.y, c.y) < -2 || Math.min(a.y, b.y, c.y) > container.clientHeight + 2) return;
    const p = a, q = b, r = c;
    const sourceStep = flipped ? -step : step;
    const aa = (q.x - p.x) / sourceStep, bb = (q.y - p.y) / sourceStep;
    const cc = (r.x - p.x) / sourceStep, dd = (r.y - p.y) / sourceStep;
    context.save();
    context.beginPath();
    context.moveTo(a.x, a.y); context.lineTo(b.x, b.y); context.lineTo(c.x, c.y); context.closePath();
    context.clip();
    context.transform(aa, bb, cc, dd, p.x - aa * sx - cc * sy, p.y - bb * sx - dd * sy);
    context.drawImage(image, 0, 0);
    context.restore();
  };
  for (let y = 0; y < subdivisions; y += 1) for (let x = 0; x < subdivisions; x += 1) {
    const topLeft = points[y][x], topRight = points[y][x + 1];
    const bottomLeft = points[y + 1][x], bottomRight = points[y + 1][x + 1];
    triangle(topLeft, topRight, bottomLeft, x * step, y * step, false);
    // Reverse both source axes for the second triangle.
    triangle(bottomRight, bottomLeft, topRight, (x + 1) * step, (y + 1) * step, true);
  }
}

let projectedBlastTexture: HTMLCanvasElement | undefined;
let globalProjectedTexture: HTMLCanvasElement | undefined;
let sampledProjectedTexture: HTMLCanvasElement | undefined;
let sampledGroundCache: { key: string; distances: Float64Array } | undefined;

function drawSampledProjectedBlast(context: CanvasRenderingContext2D, map: MapLibreMap, origin: Point, extentKm: number, source: CanvasRenderingContext2D) {
  const width = map.getContainer().clientWidth, height = map.getContainer().clientHeight;
  const scale = Math.min(0.34, 480 / Math.max(1, width), 320 / Math.max(1, height));
  const w = Math.max(1, Math.ceil(width * scale)), h = Math.max(1, Math.ceil(height * scale));
  const texture = sampledProjectedTexture ?? (sampledProjectedTexture = document.createElement("canvas"));
  if (texture.width !== w || texture.height !== h) { texture.width = w; texture.height = h; }
  const target = texture.getContext("2d");
  if (!target) return;
  const samples = source.getImageData(192, 192, 192, 1).data;
  const image = target.createImageData(w, h);
  const center = map.getCenter();
  const key = JSON.stringify([w, h, width, height, origin.lng, origin.lat, center.lng, center.lat, map.getZoom(), map.getBearing(), map.getPitch(), map.getPadding()]);
  if (sampledGroundCache?.key !== key) {
    const distances = new Float64Array(w * h);
    for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
      const geo = map.unproject([(x + 0.5) / scale, (y + 0.5) / scale]);
      distances[y * w + x] = surfaceDistanceKm(origin, geo);
    }
    sampledGroundCache = { key, distances };
  }
  const distances = sampledGroundCache.distances;
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    const distance = distances[y * w + x];
    if (distance >= extentKm) continue;
    const output = (y * w + x) * 4;
    sampleRadialRow(samples, distance / extentKm, image.data, output);
  }
  target.putImageData(image, 0, 0);
  context.drawImage(texture, 0, 0, width, height);
}
function drawProjectedGlobalBlast(context: CanvasRenderingContext2D, map: MapLibreMap, origin: Point, travelledKm: number, radii: BlastRadii) {
  const width = map.getContainer().clientWidth, height = map.getContainer().clientHeight;
  const scale = Math.min(0.24, 420 / Math.max(1, width), 280 / Math.max(1, height));
  const texture = globalProjectedTexture ?? (globalProjectedTexture = document.createElement("canvas"));
  const w = Math.max(1, Math.ceil(width * scale)), h = Math.max(1, Math.ceil(height * scale));
  if (texture.width !== w || texture.height !== h) { texture.width = w; texture.height = h; }
  const target = texture.getContext("2d");
  if (!target) return;
  const image = target.createImageData(w, h);
  const radius = Math.min(travelledKm, radii.light, MAX_SURFACE_DISTANCE_KM);
  const falloff = Math.min(MAX_SURFACE_DISTANCE_KM, radius * BLAST_FALLOFF_FACTOR);
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    const geo = map.unproject([(x + 0.5) / scale, (y + 0.5) / scale]);
    const distance = surfaceDistanceKm(origin, geo);
    if (distance > falloff) continue;
    const color = sampleBlastGradient(Math.min(distance, radius), radii);
    const fade = distance <= radius ? 1 : 1 - smoothStep(radius, falloff, distance);
    const offset = (y * w + x) * 4;
    image.data[offset] = color.red; image.data[offset + 1] = color.green; image.data[offset + 2] = color.blue;
    image.data[offset + 3] = Math.round(color.alpha * fade * 255);
  }
  target.putImageData(image, 0, 0);
  context.save(); context.imageSmoothingEnabled = true; context.drawImage(texture, 0, 0, width, height); context.restore();
}

function drawProjectedBlast(context: CanvasRenderingContext2D, map: MapLibreMap, origin: Point, travelledKm: number, radii: BlastRadii, additive = false) {
  if (radii.light > 2500) {
    drawProjectedGlobalBlast(context, map, origin, travelledKm, radii);
    return;
  }
  const extentKm = Math.min(MAX_SURFACE_DISTANCE_KM, radii.light) * BLAST_FALLOFF_FACTOR;
  if (extentKm <= 0 || travelledKm <= 0) return;
  const texture = projectedBlastTexture ?? (projectedBlastTexture = document.createElement("canvas"));
  if (texture.width !== 384) texture.width = texture.height = 384;
  const textureContext = texture.getContext("2d");
  if (!textureContext) return;
  textureContext.clearRect(0, 0, texture.width, texture.height);
  const scale = texture.width / (2 * extentKm);
  const scaled = { fireball: radii.fireball * scale, severe: radii.severe * scale, moderate: radii.moderate * scale, light: radii.light * scale };
  drawZoneBands(textureContext, texture.width / 2, texture.height / 2, travelledKm * scale, scaled);
  context.save();
  context.globalCompositeOperation = additive ? "screen" : "source-over";
  if (needsGroundSampling(map, origin, radii.light)) drawSampledProjectedBlast(context, map, origin, extentKm, textureContext);
  else warpGroundImage(context, map, texture, origin, extentKm);
  context.restore();
}

function projectedBlastOutline(map: MapLibreMap, origin: Point, radiusKm: number) {
  return Array.from({ length: 160 }, (_, index) => {
    const point = destinationPoint(origin, radiusKm, index * 360 / 160);
    point.lng += Math.round((origin.lng - point.lng) / 360) * 360;
    return map.project([point.lng, point.lat]);
  });
}

function drawProjectedShockwave(context: CanvasRenderingContext2D, map: MapLibreMap, origin: Point, radiusKm: number) {
  const points = projectedBlastOutline(map, origin, radiusKm);
  context.save();
  context.beginPath();
  points.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
  context.closePath();
  context.strokeStyle = "#ff3b24"; context.lineWidth = 10; context.shadowColor = "#ff2b18"; context.shadowBlur = 22; context.stroke();
  context.strokeStyle = "#fffdf4"; context.lineWidth = 3.2; context.shadowBlur = 0; context.stroke();
  context.restore();
}

function drawDestructionField(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  travelledRadius: number,
  finalRadii: BlastRadii,
  reveal: number,
  additive = false,
) {
  const fieldRadius = Math.min(travelledRadius, finalRadii.light);
  if (fieldRadius < 5 || reveal <= 0) return;

  context.save();
  // Repeated fields accumulate with a bounded screen blend so overlap reads
  // brighter and denser without numerically clipping the terrain to white.
  context.globalCompositeOperation = additive ? "screen" : "source-over";
  const gradient = context.createRadialGradient(x, y, 0, x, y, fieldRadius);
  const stopCount = 12;
  for (let index = 0; index <= stopCount; index += 1) {
    const offset = index / stopCount;
    const color = sampleBlastGradient(fieldRadius * offset, finalRadii);
    gradient.addColorStop(offset, `rgba(${color.red},${color.green},${color.blue},${color.alpha * reveal})`);
  }
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(x, y, fieldRadius, 0, Math.PI * 2);
  context.fill();

  // Feather the thermal field beyond the measured light-damage boundary.
  // This is a visual pressure falloff, not an additional destruction zone.
  const falloffRadius = fieldRadius * BLAST_FALLOFF_FACTOR;
  const falloffInnerRadius = fieldRadius * 0.68;
  const lightBoundaryStop = (fieldRadius - falloffInnerRadius) / Math.max(1, falloffRadius - falloffInnerRadius);
  context.save();
  context.beginPath();
  context.arc(x, y, falloffRadius, 0, Math.PI * 2);
  context.arc(x, y, falloffInnerRadius, 0, Math.PI * 2, true);
  context.clip("evenodd");
  const falloff = context.createRadialGradient(x, y, falloffInnerRadius, x, y, falloffRadius);
  falloff.addColorStop(0, `rgba(142,48,156,${0.08 * reveal})`);
  falloff.addColorStop(Math.max(0, lightBoundaryStop - 0.12), `rgba(118,66,190,${0.19 * reveal})`);
  falloff.addColorStop(lightBoundaryStop, `rgba(112,73,201,${0.3 * reveal})`);
  falloff.addColorStop(Math.min(0.92, lightBoundaryStop + 0.24), `rgba(93,59,169,${0.13 * reveal})`);
  falloff.addColorStop(1, "rgba(63,36,130,0)");
  context.fillStyle = falloff;
  context.fillRect(x - falloffRadius, y - falloffRadius, falloffRadius * 2, falloffRadius * 2);
  context.restore();

  // A compact white-gold corona keeps the fireball luminous without hiding
  // the satellite image. In additive scenes, intersecting fireballs intensify.
  const fireballGlowRadius = Math.min(fieldRadius, Math.max(1, finalRadii.fireball * 1.65));
  if (fireballGlowRadius > 1) {
    context.globalCompositeOperation = additive ? "lighter" : "screen";
    const fireballGlow = context.createRadialGradient(x, y, 0, x, y, fireballGlowRadius);
    fireballGlow.addColorStop(0, `rgba(255,255,250,${0.34 * reveal})`);
    fireballGlow.addColorStop(0.42, `rgba(255,247,194,${0.24 * reveal})`);
    fireballGlow.addColorStop(0.76, `rgba(255,161,48,${0.1 * reveal})`);
    fireballGlow.addColorStop(1, "rgba(255,86,24,0)");
    context.fillStyle = fireballGlow;
    context.beginPath();
    context.arc(x, y, fireballGlowRadius, 0, Math.PI * 2);
    context.fill();
  }

  // A restrained screen-blended heat layer gives the thermal field the same
  // luminous energy as fallout without washing out terrain beyond the fireball.
  context.globalCompositeOperation = "screen";
  const thermal = context.createRadialGradient(x, y, 0, x, y, fieldRadius);
  const heatReach = Math.max(1, finalRadii.severe);
  const thermalStopCount = 12;
  for (let index = 0; index <= thermalStopCount; index += 1) {
    const offset = index / thermalStopCount;
    const distance = fieldRadius * offset;
    const intensity = Math.max(0, 1 - distance / heatReach);
    const [red, green, blue, alpha] = thermalColor(intensity);
    const opacity = (alpha / 255) * 0.24 * reveal * smoothStep(0, 0.22, intensity);
    thermal.addColorStop(offset, `rgba(${red},${green},${blue},${opacity})`);
  }
  context.fillStyle = thermal;
  context.beginPath();
  context.arc(x, y, fieldRadius, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawZoneBoundaries(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  travelledRadius: number,
  finalRadii: BlastRadii,
) {
  EFFECTS.forEach((effect) => {
    const radius = finalRadii[effect.id];
    if (travelledRadius < radius - 0.25 || radius < 0.5) return;
    context.save();
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.globalAlpha = effect.id === "light" ? 0.38 : 0.72;
    context.strokeStyle = effect.color;
    context.lineWidth = effect.id === "fireball" ? 1.8 : 1.1;
    context.shadowColor = effect.color;
    context.shadowBlur = effect.id === "light" ? 10 : 3;
    context.stroke();
    context.restore();
  });
}

function radiiForYield(mt: number) {
  const safeYield = Math.max(mt, 1e-12);
  const tenKtScale = Math.cbrt(Math.min(Number.MAX_VALUE, safeYield / 0.01));
  const surfaceLimit = (radius: number) => Math.min(MAX_SURFACE_DISTANCE_KM, Math.max(0.001, radius));
  const light = surfaceLimit(4.8 * tenKtScale);
  const moderate = Math.min(light, surfaceLimit(1.6 * tenKtScale));
  const severe = Math.min(moderate, surfaceLimit(0.8 * tenKtScale));
  const fireball = Math.min(severe, surfaceLimit(0.14 * Math.pow(Math.min(Number.MAX_VALUE, safeYield / 0.01), 0.4)));
  return { fireball, severe, moderate, light };
}

function weaponProfile(id: string, aggregateYieldMt: number): WeaponProfile {
  if (id === "moab" || id === "foab") {
    return { nuclear: false, fallout: false, warheads: 1, warheadYieldMt: aggregateYieldMt, burstHeightKm: 0.003 };
  }
  if (id === "rs-24-yars") return { nuclear: true, fallout: true, warheads: 3, warheadYieldMt: 0.175, burstHeightKm: 1.05 };
  if (id === "rsm-56-bulava") return { nuclear: true, fallout: true, warheads: 10, warheadYieldMt: 0.12, burstHeightKm: 0.92 };
  if (id === "rs-28-sarmat") return { nuclear: true, fallout: true, warheads: 10, warheadYieldMt: 0.5, burstHeightKm: 1.45 };
  // Documented Davy Crockett selectable airburst was about 40 ft (12.2 m);
  // the system also offered a near-surface fuze. The simulator uses the
  // airburst setting for its direct-flash horizon.
  const knownHeight = id === "w54"
    ? 0.012192
    : id === "little-boy"
      ? 0.58
      : id === "fat-man"
        ? 0.503
        : null;
  const scaledHeight = Math.min(12, 0.48 * Math.cbrt(Math.max(aggregateYieldMt, 1e-12) / 0.015));
  return {
    nuclear: true,
    fallout: true,
    warheads: 1,
    warheadYieldMt: aggregateYieldMt,
    burstHeightKm: knownHeight ?? Math.max(0.05, scaledHeight),
  };
}

function curvatureHorizonKm(heightKm: number) {
  const height = Math.max(0, heightKm);
  return EARTH_RADIUS_KM * Math.acos(EARTH_RADIUS_KM / (EARTH_RADIUS_KM + height));
}

function rangeModel(profile: WeaponProfile) {
  const singleYield = Math.max(profile.warheadYieldMt, 1e-12);
  // Outdoor audibility is intrinsically weather-dependent. This calibrated
  // cube-root field is a median visual estimate; it is deliberately separate
  // from the overpressure model used for structural damage.
  const audibleKm = Math.min(
    MAX_SURFACE_DISTANCE_KM,
    155 * Math.pow(singleYield, 0.32) * (1 + Math.min(0.18, profile.burstHeightKm / 60)),
  );
  const blastRadii = radiiForYield(singleYield);
  // "Visible" means a direct geometric line of sight to the luminous fireball,
  // not visibility of the later mushroom cloud or light scattered through
  // clouds. Mixing those phenomena previously exaggerated tiny weapons.
  const fireballTopKm = profile.burstHeightKm + blastRadii.fireball;
  const luminousHeightKm = Math.min(1_000_000, fireballTopKm);
  const visibleKm = Math.min(
    MAX_SURFACE_DISTANCE_KM,
    curvatureHorizonKm(luminousHeightKm) + curvatureHorizonKm(OBSERVER_EYE_HEIGHT_KM),
  );
  return { audibleKm, visibleKm, luminousHeightKm };
}

function cloudModel(profile: WeaponProfile) {
  const blastRadii = radiiForYield(Math.max(profile.warheadYieldMt, 1e-12));
  const atmosphericTopKm = profile.nuclear
    ? profile.burstHeightKm + 7.5 + 8.4 * Math.log10(1 + Math.max(profile.warheadYieldMt, 1e-12) / 0.01)
    : profile.burstHeightKm + 0.12 * Math.cbrt(Math.max(profile.warheadYieldMt, 1e-12) / 0.000011);
  const targetHeightKm = Math.min(
    1_000_000,
    Math.max(atmosphericTopKm, profile.burstHeightKm + blastRadii.fireball),
  );
  return {
    targetHeightKm,
    atmosphericTopKm,
    orbitalScale: targetHeightKm > 120,
  };
}

function mirvTargets(origin: Point, count: number, lightRadiusKm: number) {
  const spreadKm = Math.min(MAX_SURFACE_DISTANCE_KM * 0.12, Math.max(lightRadiusKm * 1.7, 8));
  const goldenAngle = 137.507764;
  return Array.from({ length: count }, (_, index) => {
    const normalized = Math.sqrt((index + 0.42) / count);
    const distance = spreadKm * (0.28 + normalized * 0.72);
    const bearing = 18 + index * goldenAngle;
    const point = destinationPoint(origin, distance, bearing);
    return { ...point, name: `MIRV impact ${index + 1}` };
  });
}

export default function Home() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const blastCanvasRef = useRef<HTMLCanvasElement>(null);
  const fireballCanvasRef = useRef<HTMLCanvasElement>(null);
  const fireballRendererRef = useRef<FireballRenderer | null>(null);
  const rendererRef = useRef(new ExplosionRenderer());
  const blastMaskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const blastMaskImageRef = useRef<ImageData | null>(null);
  const multiBlastMaskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const multiBlastPeakCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const falloutMaskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rangeMaskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rangeMaskImageRef = useRef<ImageData | null>(null);
  const missileCanvasRef = useRef<HTMLCanvasElement>(null);
  const cloudCanvasRef = useRef<HTMLCanvasElement>(null);
  const cloudHeightReadoutRef = useRef<HTMLSpanElement>(null);
  const cloudPhaseReadoutRef = useRef<HTMLSpanElement>(null);
  const detonationFlashRef = useRef<HTMLDivElement>(null);
  const multiScaleBarRef = useRef<HTMLDivElement>(null);
  const multiScaleTextRef = useRef<HTMLElement>(null);
  const rangeMarkerRefs = useRef<Partial<Record<RangeBandId, HTMLButtonElement | null>>>({});
  const zoneMarkerRefs = useRef<Partial<Record<EffectId, HTMLButtonElement | null>>>({});
  const falloutMarkerRefs = useRef<Partial<Record<FalloutId, HTMLButtonElement | null>>>({});
  const animationFrameRef = useRef<number | null>(null);
  const overlayDirtyRef = useRef(true);
  const animationProgressRef = useRef(0);
  const missileProgressRef = useRef(0);
  const massStrikesRef = useRef<MassStrike[]>([]);
  const massStartTimeRef = useRef(0);
  const massNowRef = useRef(0);
  const massLastFieldPaintRef = useRef(0);
  const lastFireballPaintRef = useRef(0);
  const massFieldCameraRef = useRef("");
  const massFieldFinishedRef = useRef(0);
  const lastCloudPaintProgressRef = useRef(-1);
  const cloudFrameKeyRef = useRef("");
  const massModeRef = useRef(false);
  const armageddonRef = useRef(false);
  const massImpactedRef = useRef(0);
  const launchAngleRef = useRef(0);
  const nextStrikeIdRef = useRef(1);
  const launchAtRef = useRef<(point: Point) => void>(() => undefined);
  const mirvTargetsRef = useRef<Point[]>([]);
  const reducedMotionRef = useRef(false);
  const sequenceTokenRef = useRef(0);
  const radiiRef = useRef(radiiForYield(WEAPONS.find((weapon) => weapon.id === "fat-man")!.yieldMt));
  const yieldRef = useRef<number>(WEAPONS.find((weapon) => weapon.id === "fat-man")!.yieldMt);
  const profileRef = useRef<WeaponProfile>(weaponProfile("fat-man", WEAPONS.find((weapon) => weapon.id === "fat-man")!.yieldMt));
  const phaseRef = useRef<Phase>("armed");
  const effectViewRef = useRef<EffectView>("blast");
  const impactRef = useRef<Point>(LOCATIONS["New York, NY"]);

  const [mapReady, setMapReady] = useState(false);
  const [selectedId, setSelectedId] = useState("fat-man");
  const [selectionTab, setSelectionTab] = useState<"scenario" | "device">("device");
  const [armageddon, setArmageddon] = useState(false);
  const [customYield, setCustomYield] = useState("1");
  const [massMode, setMassMode] = useState(false);
  const [mirvActive, setMirvActive] = useState(false);
  const [massStatus, setMassStatus] = useState({ active: false, impacted: 0, total: 0 });
  const [panelsHidden, setPanelsHidden] = useState(false);
  const [hasNuclearStrike, setHasNuclearStrike] = useState(false);
  const [impact, setImpact] = useState<Point>(LOCATIONS["New York, NY"]);
  const [phase, setPhase] = useState<Phase>("armed");
  const [effectView, setEffectView] = useState<EffectView>("blast");
  const [mapMode, setMapMode] = useState<MapMode>("day");
  const [scenarioId, setScenarioId] = useState("");
  const [activeZoneId, setActiveZoneId] = useState<EffectId | null>(null);
  const [pinnedZoneId, setPinnedZoneId] = useState<EffectId | null>(null);
  const [activeFalloutId, setActiveFalloutId] = useState<FalloutId | null>(null);
  const [pinnedFalloutId, setPinnedFalloutId] = useState<FalloutId | null>(null);
  const [activeRangeBandId, setActiveRangeBandId] = useState<RangeBandId | null>(null);
  const [pinnedRangeBandId, setPinnedRangeBandId] = useState<RangeBandId | null>(null);

  const customMode = selectedId === "custom";
  const selectedWeapon = WEAPONS.find((weapon) => weapon.id === selectedId) ?? WEAPONS.find((weapon) => weapon.id === "fat-man")!;
  const parsedCustomYield = Number(customYield.replace(/[,_\s]/g, ""));
  const yieldMt = customMode
    ? Math.min(Number.MAX_VALUE, Math.max(1e-9, Number.isNaN(parsedCustomYield) ? 1 : (Number.isFinite(parsedCustomYield) ? parsedCustomYield : Number.MAX_VALUE)))
    : selectedWeapon.yieldMt;
  const selectedProfile = useMemo(() => weaponProfile(selectedId, yieldMt), [selectedId, yieldMt]);
  const falloutAvailable = selectedProfile.fallout || hasNuclearStrike;
  const radii = useMemo(() => radiiForYield(selectedProfile.warheadYieldMt), [selectedProfile.warheadYieldMt]);
  const zones = useMemo(() => zoneBands(radii), [radii]);
  const windModel = useMemo(() => prevailingWind(impact), [impact]);
  const falloutSize = useMemo(() => falloutDimensions(selectedProfile.warheadYieldMt, windModel), [selectedProfile.warheadYieldMt, windModel]);
  const falloutBands = useMemo(() => falloutZones(falloutSize), [falloutSize]);
  const activeZone = zones.find((zone) => zone.id === activeZoneId) ?? null;
  const activeFalloutZone = falloutBands.find((zone) => zone.id === activeFalloutId) ?? null;
  const activeRangeBand = RANGE_EXPERIENCE_BANDS.find((band) => band.id === activeRangeBandId) ?? null;
  const ranges = useMemo(() => rangeModel(selectedProfile), [selectedProfile]);
  const modelHorizon = Math.min(MAX_SURFACE_DISTANCE_KM, radii.light * (selectedProfile.warheads > 1 ? 3 : 1.08));
  const multiLegendItems = effectView === "blast"
    ? EFFECTS.map((effect) => ({
        label: effect.label,
        title: `${effect.label} DESTRUCTION`,
        copy: effect.description,
        metricLabel: "MAP READING",
        metric: "Brighter color means overlapping damage",
        color: effect.color,
      }))
    : effectView === "fallout"
      ? FALLOUT_BANDS.map((band) => ({
          label: band.id === "elevated" ? "SICKNESS" : band.id === "high" ? "CRITICAL" : band.id === "extreme" ? "LETHAL" : "CONTAMINATED",
          title: band.label,
          copy: band.description,
          metricLabel: "24-HOUR DOSE",
          metric: `${band.dose} · ${band.mortality}`,
          color: band.color,
        }))
      : [...RANGE_EXPERIENCE_BANDS].reverse().map((band, index) => ({
          label: effectView === "audible"
            ? band.id === "edge" ? "FAINT" : band.id === "middle" ? "LOUD" : band.id === "inner" ? "PAINFUL" : "DEAFENING"
            : band.id === "edge" ? "FAINT" : band.id === "middle" ? "CLEAR" : band.id === "inner" ? "BRILLIANT" : "BLINDING",
          title: effectView === "audible" ? band.audibleTitle : band.visibleTitle,
          copy: effectView === "audible" ? band.audibleCopy : band.visibleCopy,
          metricLabel: effectView === "audible" ? "PEAK SOUND" : "WHAT YOU SEE",
          metric: effectView === "audible" ? band.audibleLevel : band.visibleLevel,
          color: rangeMarkerColor(effectView === "audible" ? "audible" : "visible", (index + 0.5) / 4),
        }));

  useEffect(() => { impactRef.current = impact; }, [impact]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { radiiRef.current = radii; }, [radii]);
  useEffect(() => { yieldRef.current = selectedProfile.warheadYieldMt; }, [selectedProfile.warheadYieldMt]);
  useEffect(() => { profileRef.current = selectedProfile; }, [selectedProfile]);

  const drawBlast = useCallback((progress = animationProgressRef.current) => {
    const map = mapRef.current;
    const canvas = blastCanvasRef.current;
    if (!map || !canvas) return;

    const renderer = rendererRef.current;
    const frame = renderer.beginFrame(map, canvas);
    if (!frame) return;
    const { width, height, context } = frame;
    const presentation = explosionPresentation(massStrikesRef.current.length || mirvTargetsRef.current.length || 1, armageddonRef.current);
    renderer.hideMarkers([zoneMarkerRefs.current, falloutMarkerRefs.current, rangeMarkerRefs.current]);

    const center = map.project([impactRef.current.lng, impactRef.current.lat]);
    const latitudeScale = Math.max(0.04, Math.cos((impactRef.current.lat * Math.PI) / 180));
    // MapLibre's projected world is 512 px at zoom 0. Using the 256 px
    // Web-Mercator constant halves the raster radius while the geodesic
    // contours remain correct, leaving the light-destruction band unfilled.
    const metersPerPixel = (MERCATOR_METERS_PER_PIXEL_AT_ZOOM_0 * latitudeScale) / Math.pow(2, map.getZoom());
    const maxScreenRadius = Math.hypot(width, height) * 3;
    const toPixels = (kilometers: number) => Math.min(maxScreenRadius, (Math.min(MAX_SURFACE_DISTANCE_KM, kilometers) * 1000) / metersPerPixel);
    const circle = (radius: number) => {
      context.beginPath();
      context.arc(center.x, center.y, Math.max(0.5, radius), 0, Math.PI * 2);
    };
    const projectNearest = (point: Point, anchorLng: number) => {
      const longitude = point.lng + Math.round((anchorLng - point.lng) / 360) * 360;
      return map.project([longitude, point.lat]);
    };
    const surfaceBoundary = (origin: Point, radiusKm: number) => {
      const majority = radiusKm > MAX_SURFACE_DISTANCE_KM / 2;
      const boundaryOrigin = majority ? destinationPoint(origin, MAX_SURFACE_DISTANCE_KM, 0) : origin;
      const boundaryRadius = majority ? Math.max(0.001, MAX_SURFACE_DISTANCE_KM - radiusKm) : radiusKm;
      const steps = boundaryRadius > 2500 ? 180 : 120;
      const points = Array.from({ length: steps }, (_, index) => {
        const point = destinationPoint(boundaryOrigin, boundaryRadius, (index / steps) * 360);
        return projectNearest(point, boundaryOrigin.lng);
      });
      return { majority, points };
    };
    const drawStableZoneBands = (origin: Point, travelledKm: number, finalRadiiKm: BlastRadii) => {
      if (!presentation.divisions) return;
      EFFECTS.forEach((effect) => {
        const outer = finalRadiiKm[effect.id];
        const visibleOuter = Math.min(travelledKm, outer);
        if (visibleOuter <= 0.0001) return;
        const outerBoundary = surfaceBoundary(origin, visibleOuter);
        if (travelledKm >= outer - Math.max(0.0001, outer * 0.000001)) {
          renderer.drawDivision(context, outerBoundary.points, {
            color: effect.color,
            alpha: effect.id === "light" ? 0.48 : 0.96,
            width: effect.id === "fireball" ? 2.45 : effect.id === "light" ? 1.3 : 1.65,
            glow: effect.id === "light" ? 10 : 5,
          });
        }
      });
    };
    const drawGlobalBlastBands = (origin: Point, finalRadiiKm: BlastRadii, fieldFrame: ExplosionFieldFrame) => {
      const { map, context, width, height } = fieldFrame;
      const renderScale = Math.min(0.42, 680 / Math.max(1, width), 460 / Math.max(1, height));
      const maskWidth = Math.max(1, Math.ceil(width * renderScale));
      const maskHeight = Math.max(1, Math.ceil(height * renderScale));
      const mask = blastMaskCanvasRef.current ?? document.createElement("canvas");
      blastMaskCanvasRef.current = mask;
      if (mask.width !== maskWidth || mask.height !== maskHeight) {
        mask.width = maskWidth;
        mask.height = maskHeight;
      }
      const maskContext = mask.getContext("2d");
      if (!maskContext) return;
      let image = blastMaskImageRef.current;
      if (!image || image.width !== maskWidth || image.height !== maskHeight) {
        image = maskContext.createImageData(maskWidth, maskHeight);
        blastMaskImageRef.current = image;
      } else {
        image.data.fill(0);
      }
      const longitudes = Array.from({ length: maskWidth }, (_, x) => map.unproject([(x + 0.5) / renderScale, height * 0.5]).lng);
      const latitudes = Array.from({ length: maskHeight }, (_, y) => map.unproject([width * 0.5, (y + 0.5) / renderScale]).lat);
      const distanceGrid = prepareDistanceGrid(origin, longitudes, latitudes);
      const centerGeo = map.unproject([width * 0.5, height * 0.5]);
      const adjacentGeo = map.unproject([width * 0.5 + 1 / renderScale, height * 0.5]);
      const sampleKm = Math.max(0.01, surfaceDistanceKm(centerGeo, adjacentGeo));
      const bands = [
        { effect: EFFECTS[0], outer: finalRadiiKm.light },
        { effect: EFFECTS[1], outer: finalRadiiKm.moderate },
        { effect: EFFECTS[2], outer: finalRadiiKm.severe },
        { effect: EFFECTS[3], outer: finalRadiiKm.fireball },
      ];
      const falloffOuterKm = Math.min(MAX_SURFACE_DISTANCE_KM, finalRadiiKm.light * BLAST_FALLOFF_FACTOR);
      for (let y = 0; y < maskHeight; y += 1) {
        for (let x = 0; x < maskWidth; x += 1) {
          const distance = distanceFromGridTerms(distanceGrid, x, y);
          const contour = bands.reduce<{ distance: number; effect: (typeof EFFECTS)[number] } | null>((nearest, candidate) => {
            const difference = Math.abs(distance - candidate.outer);
            return !nearest || difference < nearest.distance ? { distance: difference, effect: candidate.effect } : nearest;
          }, null);
          const insideDamage = distance <= finalRadiiKm.light;
          const insideFalloff = distance <= falloffOuterKm;
          if (!insideFalloff && (!contour || contour.distance > sampleKm * 2.4)) continue;
          const color = sampleBlastGradient(Math.min(distance, finalRadiiKm.light), finalRadiiKm);
          const falloffStrength = insideDamage
            ? 1
            : (1 - smoothStep(finalRadiiKm.light, falloffOuterKm, distance)) * 0.82;
          const heatIntensity = Math.max(0, 1 - distance / Math.max(0.001, finalRadiiKm.severe));
          const [heatRed, heatGreen, heatBlue, heatAlpha] = thermalColor(heatIntensity);
          const heatMix = (heatAlpha / 255) * 0.24 * smoothStep(0, 0.22, heatIntensity);
          const screenRed = 255 - ((255 - color.red) * (255 - heatRed)) / 255;
          const screenGreen = 255 - ((255 - color.green) * (255 - heatGreen)) / 255;
          const screenBlue = 255 - ((255 - color.blue) * (255 - heatBlue)) / 255;
          const thermalRed = color.red + (screenRed - color.red) * heatMix;
          const thermalGreen = color.green + (screenGreen - color.green) * heatMix;
          const thermalBlue = color.blue + (screenBlue - color.blue) * heatMix;
          const edgeStrength = presentation.divisions && contour ? 1 - smoothStep(sampleKm * 0.85, sampleKm * 2.15, contour.distance) : 0;
          const offset = (y * maskWidth + x) * 4;
          image.data[offset] = Math.round(thermalRed + (255 - thermalRed) * edgeStrength * 0.34);
          image.data[offset + 1] = Math.round(thermalGreen + (236 - thermalGreen) * edgeStrength * 0.34);
          image.data[offset + 2] = Math.round(thermalBlue + (232 - thermalBlue) * edgeStrength * 0.34);
          image.data[offset + 3] = Math.round(Math.max(color.alpha * falloffStrength * 255, edgeStrength * 224));
        }
      }
      maskContext.putImageData(image, 0, 0);
      context.save();
      context.imageSmoothingEnabled = true;
      context.drawImage(mask, 0, 0, width, height);
      context.restore();
    };
    const currentRadii = radiiRef.current;

    if (mirvTargetsRef.current.length > 1) {
      const eased = 1 - Math.pow(1 - Math.min(1, Math.max(0, progress)), 2.15);
      const travelledKm = Math.min(MAX_SURFACE_DISTANCE_KM, currentRadii.light * eased);
      mirvTargetsRef.current.forEach((origin) => {
        const strikeCenter = map.project([origin.lng, origin.lat]);
        const strikeLatitudeScale = Math.max(0.04, Math.cos((origin.lat * Math.PI) / 180));
        const strikeMetersPerPixel = (MERCATOR_METERS_PER_PIXEL_AT_ZOOM_0 * strikeLatitudeScale) / Math.pow(2, map.getZoom());
        const strikeToPixels = (kilometers: number) => Math.min(maxScreenRadius, (Math.min(MAX_SURFACE_DISTANCE_KM, kilometers) * 1000) / strikeMetersPerPixel);
        const travelledPixels = strikeToPixels(travelledKm);

        if (progress > 0 && progress < 0.24) {
          const flashAge = progress / 0.24;
          const flashOpacity = Math.min(1, flashAge / 0.055) * Math.pow(1 - flashAge, 1.45);
          const flashRadius = 20 + Math.sqrt(flashAge) * Math.min(170, Math.min(width, height) * 0.28);
          context.save();
          context.globalCompositeOperation = "screen";
          const flash = context.createRadialGradient(strikeCenter.x, strikeCenter.y, 0, strikeCenter.x, strikeCenter.y, flashRadius);
          flash.addColorStop(0, `rgba(255,255,255,${flashOpacity})`);
          flash.addColorStop(0.18, `rgba(255,250,210,${0.9 * flashOpacity})`);
          flash.addColorStop(0.52, `rgba(255,130,36,${0.42 * flashOpacity})`);
          flash.addColorStop(1, "rgba(175,20,0,0)");
          context.fillStyle = flash;
          context.beginPath();
          context.arc(strikeCenter.x, strikeCenter.y, flashRadius, 0, Math.PI * 2);
          context.fill();
          context.restore();
        }

        const strikePixelRadii: BlastRadii = {
          fireball: strikeToPixels(currentRadii.fireball),
          severe: strikeToPixels(currentRadii.severe),
          moderate: strikeToPixels(currentRadii.moderate),
          light: strikeToPixels(currentRadii.light),
        };
        drawZoneBands(context, strikeCenter.x, strikeCenter.y, travelledPixels, strikePixelRadii);
        if (presentation.divisions) drawZoneBoundaries(context, strikeCenter.x, strikeCenter.y, travelledPixels, strikePixelRadii);

        if (progress > 0 && progress < 1) {
          context.save();
          context.beginPath();
          context.arc(strikeCenter.x, strikeCenter.y, travelledPixels, 0, Math.PI * 2);
          context.globalAlpha = 0.92;
          context.strokeStyle = "#ff3b24";
          context.lineWidth = 8;
          context.shadowColor = "#ff2b18";
          context.shadowBlur = 18;
          context.stroke();
          context.beginPath();
          context.arc(strikeCenter.x, strikeCenter.y, travelledPixels, 0, Math.PI * 2);
          context.globalAlpha = 1;
          context.strokeStyle = "#fffdf4";
          context.lineWidth = 2.8;
          context.shadowBlur = 0;
          context.stroke();
          context.restore();
        }
      });
      context.globalAlpha = 1;
      context.globalCompositeOperation = "source-over";
      return;
    }

    if (progress > 0) {
      const eased = 1 - Math.pow(1 - Math.min(1, progress), 2.15);
      const travelledKm = Math.min(MAX_SURFACE_DISTANCE_KM, currentRadii.light * eased);
      const travelledPixels = toPixels(travelledKm);

      const pixelRadii: BlastRadii = {
        fireball: toPixels(currentRadii.fireball),
        severe: toPixels(currentRadii.severe),
        moderate: toPixels(currentRadii.moderate),
        light: toPixels(currentRadii.light),
      };
      const stableGeographicZones = progress >= 0.999;
      if (currentRadii.light <= 2500) {
        // Use the exact same geodesic geometry throughout the animation and in
        // the completed state so the last frame cannot visibly change size.
        if (map.getPitch() > 0.01) {
          drawProjectedBlast(context, map, impactRef.current, travelledKm, currentRadii);
        } else if (stableGeographicZones) {
          renderer.paintField(map, context, "blast:" + JSON.stringify([impactRef.current, currentRadii]), (fieldFrame) => {
            const origin = fieldFrame.map.project([impactRef.current.lng, impactRef.current.lat]);
            drawZoneBands(fieldFrame.context, origin.x, origin.y, travelledPixels, pixelRadii);
          });
        } else {
          drawZoneBands(context, center.x, center.y, travelledPixels, pixelRadii);
        }
        drawStableZoneBands(impactRef.current, travelledKm, currentRadii);
      } else if (map.getPitch() > 0.01) {
        drawProjectedBlast(context, map, impactRef.current, travelledKm, currentRadii);
        drawStableZoneBands(impactRef.current, travelledKm, currentRadii);
      } else if (stableGeographicZones) {
        renderer.paintField(map, context, "blast-global:" + JSON.stringify([impactRef.current, currentRadii]), (fieldFrame) => drawGlobalBlastBands(impactRef.current, currentRadii, fieldFrame));
      } else {
        drawZoneBands(context, center.x, center.y, travelledPixels, pixelRadii);
        if (presentation.divisions) drawZoneBoundaries(context, center.x, center.y, travelledPixels, pixelRadii);
      }
      if (travelledPixels > 30 && presentation.ruler) {
        const rulerBearing = width <= 900 ? 126 : 54;
        const rulerGeo = Array.from({ length: 37 }, (_, index) => (
          destinationPoint(impactRef.current, travelledKm * (index / 36), rulerBearing)
        ));
        const rulerPoints = rulerGeo.map((point) => projectNearest(point, impactRef.current.lng));
        const endpointPoint = rulerPoints[rulerPoints.length - 1];
        const beforeEndpoint = rulerPoints[rulerPoints.length - 2];
        const endpointX = endpointPoint.x;
        const endpointY = endpointPoint.y;
        const angle = Math.atan2(endpointY - beforeEndpoint.y, endpointX - beforeEndpoint.x);
        const tickX = Math.sin(angle) * 5;
        const tickY = -Math.cos(angle) * 5;
        context.save();
        context.globalAlpha = 0.92;
        context.strokeStyle = "#f5f7f1";
        context.fillStyle = "#ff6b6b";
        context.lineWidth = 1.2;
        context.setLineDash([4, 4]);
        context.beginPath();
        renderer.drawRuler(context, rulerPoints, { color: "#f5f7f1" });
        context.setLineDash([]);

        let lastVisibleMarker = { x: Number.NEGATIVE_INFINITY, y: Number.NEGATIVE_INFINITY };
        let overlapRun = 0;
        zoneBands(currentRadii).forEach((zone) => {
          if (travelledKm + Math.max(0.001, currentRadii.light * 0.000001) < zone.outerKm) return;
          const markerKm = zone.innerKm + (zone.outerKm - zone.innerKm) * 0.5;
          const markerPoint = projectNearest(destinationPoint(impactRef.current, markerKm, rulerBearing), impactRef.current.lng);
          const markerX = markerPoint.x;
          const markerY = markerPoint.y;
          const collapsed = zone.outerKm - zone.innerKm < Math.max(0.001, currentRadii.light * 0.0000001);
          if (collapsed) return;

          const overlaps = Math.hypot(markerX - lastVisibleMarker.x, markerY - lastVisibleMarker.y) < 9;
          overlapRun = overlaps ? overlapRun + 1 : 0;
          const markerOffset = overlapRun === 0 ? 0 : (overlapRun % 2 === 1 ? 1 : -1) * Math.ceil(overlapRun / 2) * 19;
          const displayMarkerX = markerX + Math.sin(angle) * markerOffset;
          const displayMarkerY = markerY - Math.cos(angle) * markerOffset;
          const onScreen = displayMarkerX > 8 && displayMarkerX < width - 8 && displayMarkerY > 8 && displayMarkerY < height - 8;

          lastVisibleMarker = { x: markerX, y: markerY };
          const zoneTickX = Math.sin(angle) * 7;
          const zoneTickY = -Math.cos(angle) * 7;
          context.save();
          context.globalAlpha = 1;
          context.strokeStyle = zone.color;
          context.fillStyle = zone.color;
          context.lineWidth = 2.4;
          context.shadowColor = zone.color;
          context.shadowBlur = 7;
          context.beginPath();
          context.moveTo(markerX - zoneTickX, markerY - zoneTickY);
          context.lineTo(markerX + zoneTickX, markerY + zoneTickY);
          context.stroke();
          if (markerOffset !== 0) {
            context.globalAlpha = 0.74;
            context.lineWidth = 1;
            context.beginPath();
            context.moveTo(markerX, markerY);
            context.lineTo(displayMarkerX, displayMarkerY);
            context.stroke();
          }
          context.beginPath();
          context.arc(markerX, markerY, 3.4, 0, Math.PI * 2);
          context.fill();
          context.restore();

          const marker = zoneMarkerRefs.current[zone.id];
          if (onScreen) renderer.placeMarker(marker, { x: displayMarkerX, y: displayMarkerY }, width, height);
        });

        context.beginPath();
        context.moveTo(endpointX - tickX, endpointY - tickY);
        context.lineTo(endpointX + tickX, endpointY + tickY);
        context.stroke();
        const label = `RADIUS  ${formatDistance(travelledKm)}`;
        context.font = "700 10px ui-monospace, SFMono-Regular, Menlo, monospace";
        const labelWidth = context.measureText(label).width + 16;
        const labelX = endpointX + labelWidth + 18 < width ? endpointX + 9 : endpointX - labelWidth - 9;
        const labelY = Math.max(18, Math.min(height - 12, endpointY - 10));
        context.fillStyle = "rgba(7,9,9,.9)";
        context.fillRect(labelX, labelY - 13, labelWidth, 22);
        context.fillStyle = "#ff6b6b";
        context.fillText(label, labelX + 8, labelY + 2);
        context.restore();
      }

      if (progress < 1) {
        const travellingBoundary = currentRadii.light <= 2500 ? surfaceBoundary(impactRef.current, travelledKm) : null;
        if (travellingBoundary) {
          context.beginPath();
          travellingBoundary.points.forEach((point, index) => index === 0 ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y));
          context.closePath();
        } else {
          circle(travelledPixels);
        }
        context.save();
        context.globalAlpha = 0.96;
        context.strokeStyle = "#ff3b24";
        context.lineWidth = 10;
        context.shadowColor = "#ff2b18";
        context.shadowBlur = 22;
        context.stroke();
        context.restore();
        if (travellingBoundary) {
          context.beginPath();
          travellingBoundary.points.forEach((point, index) => index === 0 ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y));
          context.closePath();
        } else {
          circle(travelledPixels);
        }
        context.globalAlpha = 1;
        context.strokeStyle = "#fffdf4";
        context.lineWidth = 3.2;
        context.stroke();
      }
    }
    context.globalAlpha = 1;
  }, []);

  const drawFallout = useCallback(() => {
    const map = mapRef.current;
    const canvas = blastCanvasRef.current;
    if (!map || !canvas) return;

    const renderer = rendererRef.current;
    const frame = renderer.beginFrame(map, canvas);
    if (!frame) return;
    const { width, height, context } = frame;
    renderer.hideMarkers([zoneMarkerRefs.current, falloutMarkerRefs.current, rangeMarkerRefs.current]);


    const origins = massModeRef.current && massStrikesRef.current.length
      ? massStrikesRef.current
          .filter((strike) => strike.nuclear)
          .map((strike) => ({ point: strike.target, seed: strike.id + 1, yieldMt: strike.yieldMt }))
      : mirvTargetsRef.current.length > 1
        ? mirvTargetsRef.current.map((point, index) => ({ point, seed: index + 1, yieldMt: yieldRef.current }))
        : [{ point: impactRef.current, seed: 1, yieldMt: yieldRef.current }];
    if (!origins.length) return;
    const worldPixels = 512 * Math.pow(2, map.getZoom());
    const presentation = explosionPresentation(massStrikesRef.current.length || origins.length, armageddonRef.current);
    renderer.paintField(map, context, "fallout:" + JSON.stringify([origins, presentation.divisions]), (fieldFrame) => {
      const { map, context, width, height } = fieldFrame;
      const worldPixels = 512 * Math.pow(2, map.getZoom());
      const renderScale = Math.min(origins.length > 40 ? 0.3 : 0.48, 720 / Math.max(1, width), 500 / Math.max(1, height));
      const maskWidth = Math.max(1, Math.ceil(width * renderScale));
      const maskHeight = Math.max(1, Math.ceil(height * renderScale));
      const mask = falloutMaskCanvasRef.current ?? document.createElement("canvas");
      falloutMaskCanvasRef.current = mask;
      if (mask.width !== maskWidth || mask.height !== maskHeight) {
        mask.width = maskWidth;
        mask.height = maskHeight;
      }
      const maskContext = mask.getContext("2d", { willReadFrequently: true });
      if (!maskContext) return;
      maskContext.setTransform(1, 0, 0, 1, 0, 0);
      maskContext.clearRect(0, 0, maskWidth, maskHeight);
      maskContext.globalCompositeOperation = "lighter";

      const drawPuff = (
        point: { x: number; y: number },
        radiusPixels: number,
        strength: number,
        stretch = 1,
        rotation = 0,
      ) => {
        const radius = Math.max(1.2, radiusPixels * renderScale);
        maskContext.save();
        maskContext.translate(point.x * renderScale, point.y * renderScale);
        maskContext.rotate(rotation);
        maskContext.scale(stretch, 1);
        const gradient = maskContext.createRadialGradient(0, 0, 0, 0, 0, radius);
        gradient.addColorStop(0, `rgba(255,255,255,${Math.min(1, strength)})`);
        gradient.addColorStop(0.24, `rgba(255,255,255,${Math.min(1, strength * 0.78)})`);
        gradient.addColorStop(0.58, `rgba(255,255,255,${Math.min(1, strength * 0.34)})`);
        gradient.addColorStop(0.82, `rgba(255,255,255,${Math.min(1, strength * 0.1)})`);
        gradient.addColorStop(1, "rgba(255,255,255,0)");
        maskContext.fillStyle = gradient;
        maskContext.beginPath();
        maskContext.arc(0, 0, radius, 0, Math.PI * 2);
        maskContext.fill();
        maskContext.restore();
      };

      origins.forEach(({ point: origin, seed, yieldMt: originYieldMt }) => {
        const wind = prevailingWind(origin);
        const dimensions = falloutDimensions(originYieldMt, wind);
        const originPixel = map.project([origin.lng, origin.lat]);
        const projectNearest = (point: Point) => {
          const projected = map.project([point.lng, point.lat]);
          let projectedX = projected.x;
          while (projectedX - originPixel.x > worldPixels / 2) projectedX -= worldPixels;
          while (projectedX - originPixel.x < -worldPixels / 2) projectedX += worldPixels;
          return { x: projectedX, y: projected.y };
        };

        const pixelRadiusFor = (center: Point, radiusKm: number, bearing: number) => {
          const centerPixel = projectNearest(center);
          const edgePixel = projectNearest(destinationPoint(center, radiusKm, bearing));
          return Math.max(1, Math.hypot(edgePixel.x - centerPixel.x, edgePixel.y - centerPixel.y));
        };

        // Coarse particles settle near ground zero before upper winds can advect
        // them far downrange, so the field includes a strong local skirt rather
        // than beginning as a purely downwind cone.
        const localRadiusPixels = pixelRadiusFor(origin, dimensions.localRadiusKm, 90);
        drawPuff(originPixel, localRadiusPixels * 1.34, 0.18, 1.02);
        drawPuff(originPixel, localRadiusPixels * 0.72, 0.42, 1.08, (wind.surfaceBearing * Math.PI) / 180);
        drawPuff(originPixel, localRadiusPixels * 0.32, 0.88, 1.12, (wind.surfaceBearing * Math.PI) / 180);

        const puffCount = origins.length > 60 ? 9 : origins.length > 25 ? 12 : 34;
        for (let index = 0; index <= puffCount; index += 1) {
          const progress = index / puffCount;
          const centerBearing = wind.bearing + wind.curve * progress * 0.52;
          const center = destinationPoint(origin, dimensions.lengthKm * progress, centerBearing);
          const nextProgress = Math.min(1, progress + 0.015);
          const next = destinationPoint(origin, dimensions.lengthKm * nextProgress, wind.bearing + wind.curve * nextProgress * 0.52);
          const centerPixel = projectNearest(center);
          const nextPixel = projectNearest(next);
          const localBearing = wind.bearing + wind.curve * progress;
          const spreadProfile = 0.15 + 0.9 * Math.pow(Math.sin(Math.PI * Math.pow(progress, 0.86)), 0.7);
          const spreadKm = dimensions.widthKm * spreadProfile;
          const radiusPixels = pixelRadiusFor(center, spreadKm, localBearing + 90);
          const irregularity = 0.86 + deterministicNoise(seed * 23.7 + index * 5.91) * 0.28;
          const strength = (0.025 + 0.13 * Math.exp(-progress * 2.3)) * irregularity;
          const angle = Math.atan2(nextPixel.y - centerPixel.y, nextPixel.x - centerPixel.x);
          drawPuff(centerPixel, radiusPixels, strength, 1.12 + progress * 1.35, angle);

          if (index % 3 === 1 && origins.length <= 40) {
            const lateralKm = (deterministicNoise(seed * 61.9 + index * 19.3) - 0.5) * spreadKm * 1.24;
            const hotSpot = destinationPoint(center, Math.abs(lateralKm), localBearing + (lateralKm < 0 ? -90 : 90));
            drawPuff(projectNearest(hotSpot), radiusPixels * (0.2 + deterministicNoise(seed + index) * 0.22), strength * 0.55, 1.35, angle);
          }
        }

        // Lower-level winds typically differ from upper winds. A shorter,
        // weaker lobe makes that shear visible without implying live weather.
        const surfacePuffs = origins.length > 40 ? 4 : 11;
        for (let index = 1; index <= surfacePuffs; index += 1) {
          const progress = index / surfacePuffs;
          const distanceKm = dimensions.lengthKm * 0.34 * progress;
          const center = destinationPoint(origin, distanceKm, wind.surfaceBearing);
          const centerPixel = projectNearest(center);
          const spreadKm = dimensions.widthKm * (0.18 + 0.38 * Math.sin(Math.PI * progress));
          const radiusPixels = pixelRadiusFor(center, spreadKm, wind.surfaceBearing + 90);
          drawPuff(centerPixel, radiusPixels, (0.03 + 0.04 * (1 - progress)) * (0.85 + deterministicNoise(seed * 81 + index) * 0.25), 1.25 + progress * 0.7, (wind.surfaceBearing * Math.PI) / 180);
        }
      });

      const pixels = maskContext.getImageData(0, 0, maskWidth, maskHeight);
      const data = pixels.data;
      const contourSamples = presentation.divisions ? new Float32Array(maskWidth * maskHeight) : null;
      for (let index = 0; index < data.length; index += 4) {
        const raw = data[index + 3] / 255;
        if (raw < 0.012) {
          data[index + 3] = 0;
          continue;
        }
        const intensity = Math.min(1, Math.pow(raw, 1.08) * 1.08);
        if (contourSamples) contourSamples[index / 4] = intensity;
        const [red, green, blue, alpha] = thermalColor(intensity);
        data[index] = red;
        data[index + 1] = green;
        data[index + 2] = blue;
        data[index + 3] = alpha;
      }
      maskContext.globalCompositeOperation = "source-over";
      maskContext.putImageData(pixels, 0, 0);
      context.save();
      context.globalCompositeOperation = "screen";
      context.globalAlpha = 0.94;
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(mask, 0, 0, maskWidth, maskHeight, 0, 0, width, height);
      context.restore();
      if (contourSamples) renderer.drawScalarDivisions(context, contourSamples, maskWidth, maskHeight, renderScale, FALLOUT_BANDS);

    });

    if (presentation.ruler) {
      const origin = origins[0].point;
      const wind = prevailingWind(origin);
      const dimensions = falloutDimensions(origins[0].yieldMt, wind);
      const zones = falloutZones(dimensions);
      const originPixel = map.project([origin.lng, origin.lat]);
      const projectNearest = (point: Point) => {
        const projected = map.project([point.lng, point.lat]);
        let projectedX = projected.x;
        while (projectedX - originPixel.x > worldPixels / 2) projectedX -= worldPixels;
        while (projectedX - originPixel.x < -worldPixels / 2) projectedX += worldPixels;
        return { x: projectedX, y: projected.y };
      };
      const ruler: Array<{ x: number; y: number }> = [];
      for (let index = 0; index <= 42; index += 1) {
        const progress = index / 42;
        ruler.push(projectNearest(destinationPoint(origin, dimensions.lengthKm * progress, wind.bearing + wind.curve * progress * 0.52)));
      }
      context.save();
      context.globalCompositeOperation = "source-over";
      context.globalAlpha = 0.94;
      context.strokeStyle = "#fff8e7";
      context.lineWidth = 1.2;
      context.setLineDash([4, 4]);
      context.beginPath();
      renderer.drawRuler(context, ruler, { color: "#fff8e7", alpha: 0.94 });
      context.setLineDash([]);

      let lastMarker = { x: Number.NEGATIVE_INFINITY, y: Number.NEGATIVE_INFINITY };
      zones.forEach((zone) => {
        const markerKm = zone.innerKm + (zone.outerKm - zone.innerKm) * 0.5;
        const progress = markerKm / Math.max(0.001, dimensions.lengthKm);
        const markerPoint = destinationPoint(origin, markerKm, wind.bearing + wind.curve * progress * 0.52);
        const marker = projectNearest(markerPoint);
        const tangentA = projectNearest(destinationPoint(origin, Math.max(0, markerKm - dimensions.lengthKm * 0.008), wind.bearing + wind.curve * progress * 0.52));
        const tangentB = projectNearest(destinationPoint(origin, Math.min(dimensions.lengthKm, markerKm + dimensions.lengthKm * 0.008), wind.bearing + wind.curve * progress * 0.52));
        const tangentAngle = Math.atan2(tangentB.y - tangentA.y, tangentB.x - tangentA.x);
        const normalX = -Math.sin(tangentAngle);
        const normalY = Math.cos(tangentAngle);
        const overlaps = Math.hypot(marker.x - lastMarker.x, marker.y - lastMarker.y) < 10;
        const markerOffset = overlaps ? 18 : 0;
        const displayX = marker.x + normalX * markerOffset;
        const displayY = marker.y + normalY * markerOffset;
        lastMarker = marker;

        context.save();
        context.strokeStyle = zone.color;
        context.fillStyle = zone.color;
        context.lineWidth = 2.4;
        context.shadowColor = zone.color;
        context.shadowBlur = 8;
        context.beginPath();
        context.moveTo(marker.x - normalX * 7, marker.y - normalY * 7);
        context.lineTo(marker.x + normalX * 7, marker.y + normalY * 7);
        context.stroke();
        context.beginPath();
        context.arc(marker.x, marker.y, 3.2, 0, Math.PI * 2);
        context.fill();
        context.restore();

        const element = falloutMarkerRefs.current[zone.id];
        const onScreen = displayX > 10 && displayX < width - 10 && displayY > 10 && displayY < height - 10;
        if (onScreen) renderer.placeMarker(element, { x: displayX, y: displayY }, width, height);
      });

      const endpoint = ruler[ruler.length - 1];
      const beforeEndpoint = ruler[ruler.length - 2];
      const endAngle = Math.atan2(endpoint.y - beforeEndpoint.y, endpoint.x - beforeEndpoint.x);
      const endNormalX = -Math.sin(endAngle) * 6;
      const endNormalY = Math.cos(endAngle) * 6;
      context.beginPath();
      context.moveTo(endpoint.x - endNormalX, endpoint.y - endNormalY);
      context.lineTo(endpoint.x + endNormalX, endpoint.y + endNormalY);
      context.stroke();
      const label = `H+24  ${formatDistance(dimensions.lengthKm)} · ${wind.direction}`;
      context.font = "700 10px ui-monospace, SFMono-Regular, Menlo, monospace";
      const labelWidth = context.measureText(label).width + 16;
      const preferredLabelX = endpoint.x + labelWidth + 18 < width ? endpoint.x + 9 : endpoint.x - labelWidth - 9;
      const labelX = Math.max(8, Math.min(width - labelWidth - 8, preferredLabelX));
      const labelY = Math.max(18, Math.min(height - 12, endpoint.y - 10));
      context.fillStyle = "rgba(7,9,9,.9)";
      context.fillRect(labelX, labelY - 13, labelWidth, 22);
      context.fillStyle = "#ff6b6b";
      context.fillText(label, labelX + 8, labelY + 2);
      context.restore();
    }

    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
  }, []);

  const drawCloudProfile = useCallback((progress = animationProgressRef.current) => {
    const canvas = cloudCanvasRef.current;
    if (!canvas) return;
    const width = Math.max(260, canvas.clientWidth || 348);
    const height = Math.max(122, canvas.clientHeight || 142);
    const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
    const frameKey = JSON.stringify([width, height, pixelRatio, progress, profileRef.current]);
    if (cloudFrameKeyRef.current === frameKey) return;
    cloudFrameKeyRef.current = frameKey;
    const targetWidth = Math.round(width * pixelRatio);
    const targetHeight = Math.round(height * pixelRatio);
    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);

    const profile = profileRef.current;
    const model = cloudModel(profile);
    const clamped = Math.max(0, Math.min(1, progress));
    const rise = clamped <= 0 ? 0 : (1 - Math.pow(1 - clamped, 2.45));
    const currentHeightKm = model.targetHeightKm * rise;
    const plotLeft = 12;
    const scaleX = width - 42;
    const baseY = height - 17;
    const topY = 13;
    const plotHeight = baseY - topY;
    const cloudTopY = baseY - plotHeight * rise;
    const plumeLabel = profile.nuclear ? (model.orbitalScale ? "LUMINOUS PLUME" : "MUSHROOM CLOUD") : "DETONATION PLUME";
    const phaseLabel = clamped <= 0
      ? "STANDBY"
      : !profile.nuclear
        ? clamped < 0.45 ? "SHOCK / DUST RISE" : clamped < 1 ? "PLUME FORMATION" : "MODELED PEAK"
        : clamped < 0.16
          ? "FIREBALL"
          : clamped < 0.46
            ? "STEM RISE"
            : clamped < 0.79
              ? "CAP FORMATION"
              : clamped < 1
                ? "STABILIZING"
                : "MODELED PEAK";
    if (cloudHeightReadoutRef.current) cloudHeightReadoutRef.current.textContent = clamped > 0 ? formatDistance(currentHeightKm) : "—";
    if (cloudPhaseReadoutRef.current) cloudPhaseReadoutRef.current.textContent = `${plumeLabel} · ${phaseLabel}`;

    const panelGradient = context.createLinearGradient(0, 0, width, height);
    panelGradient.addColorStop(0, "rgba(11,15,15,.86)");
    panelGradient.addColorStop(0.62, "rgba(6,9,10,.94)");
    panelGradient.addColorStop(1, "rgba(3,5,6,.98)");
    context.fillStyle = panelGradient;
    context.fillRect(0, 0, width, height);

    context.save();
    context.strokeStyle = "rgba(166,190,182,.1)";
    context.lineWidth = 1;
    context.setLineDash([2, 5]);
    for (let tick = 0; tick <= 4; tick += 1) {
      const y = baseY - plotHeight * (tick / 4);
      context.beginPath();
      context.moveTo(plotLeft, y);
      context.lineTo(scaleX, y);
      context.stroke();
    }
    context.restore();

    if (model.orbitalScale && clamped > 0) {
      const karmanY = baseY - plotHeight * Math.min(1, 100 / model.targetHeightKm);
      context.save();
      context.strokeStyle = "rgba(91,197,255,.62)";
      context.fillStyle = "rgba(125,214,255,.82)";
      context.lineWidth = 1;
      context.setLineDash([4, 4]);
      context.beginPath();
      context.moveTo(plotLeft, karmanY);
      context.lineTo(scaleX, karmanY);
      context.stroke();
      context.setLineDash([]);
      context.font = "700 7px ui-monospace, SFMono-Regular, Menlo, monospace";
      context.fillText("100 KM · SPACE", plotLeft + 3, Math.max(9, karmanY - 3));
      context.restore();
    }

    context.save();
    context.strokeStyle = "rgba(224,232,226,.52)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(scaleX, topY);
    context.lineTo(scaleX, baseY);
    context.stroke();
    context.font = "650 7px ui-monospace, SFMono-Regular, Menlo, monospace";
    context.textAlign = "left";
    for (let tick = 0; tick <= 4; tick += 1) {
      const y = baseY - plotHeight * (tick / 4);
      context.strokeStyle = "rgba(224,232,226,.58)";
      context.beginPath();
      context.moveTo(scaleX - 4, y);
      context.lineTo(scaleX + 3, y);
      context.stroke();
      if (clamped > 0 || tick === 0) {
        context.fillStyle = tick === 4 ? "rgba(245,248,241,.86)" : "rgba(151,164,156,.68)";
        const tickValue = model.targetHeightKm * (tick / 4);
        context.fillText(tick === 0 ? "0" : formatDistance(tickValue).replace(" km", ""), scaleX + 6, y + 2.5);
      }
    }
    context.restore();

    if (clamped > 0) {
      const centerX = Math.max(105, Math.min(scaleX - 72, width * 0.47));
      const stemProgress = Math.max(0, Math.min(1, (clamped - 0.055) / 0.66));
      const capProgress = Math.max(0, Math.min(1, (clamped - 0.18) / 0.68));
      const torusProgress = Math.max(0, Math.min(1, (clamped - 0.28) / 0.55));
      const heat = Math.max(0, 1 - clamped * 1.14);
      const drawPuff = (x: number, y: number, radius: number, tone: number, opacity: number, hot = false) => {
        const warm = hot ? 122 * heat : 0;
        const red = Math.min(255, 72 + tone * 95 + warm);
        const green = Math.min(255, 69 + tone * 82 + warm * 0.63);
        const blue = Math.min(255, 66 + tone * 70 + warm * 0.24);
        const puff = context.createRadialGradient(x - radius * 0.28, y - radius * 0.34, radius * 0.04, x, y, radius);
        puff.addColorStop(0, `rgba(${red},${green},${blue},${opacity})`);
        puff.addColorStop(0.42, `rgba(${Math.max(35, red - 34)},${Math.max(34, green - 31)},${Math.max(33, blue - 27)},${opacity * 0.82})`);
        puff.addColorStop(0.78, `rgba(38,37,35,${opacity * 0.34})`);
        puff.addColorStop(1, "rgba(25,25,24,0)");
        context.fillStyle = puff;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
      };

      const groundGlow = context.createRadialGradient(centerX, baseY - 2, 0, centerX, baseY - 2, 54);
      groundGlow.addColorStop(0, `rgba(255,249,210,${0.72 * Math.min(1, clamped * 8)})`);
      groundGlow.addColorStop(0.22, `rgba(255,122,30,${0.5 * (0.45 + heat)})`);
      groundGlow.addColorStop(0.62, `rgba(185,35,9,${0.16 * (0.3 + heat)})`);
      groundGlow.addColorStop(1, "rgba(92,16,4,0)");
      context.fillStyle = groundGlow;
      context.fillRect(centerX - 58, baseY - 58, 116, 64);

      if (clamped < 0.42) {
        const shockwave = Math.min(1, clamped / 0.42);
        context.save();
        context.globalCompositeOperation = "screen";
        context.strokeStyle = `rgba(255,232,174,${Math.pow(1 - shockwave, 1.35) * 0.72})`;
        context.lineWidth = 1.2 + (1 - shockwave) * 1.6;
        context.shadowColor = "rgba(255,104,34,.9)";
        context.shadowBlur = 8;
        context.beginPath();
        context.ellipse(centerX, baseY - 2, 10 + shockwave * 78, 2.4 + shockwave * 12, 0, 0, Math.PI * 2);
        context.stroke();
        if (shockwave > 0.18) {
          const wake = (shockwave - 0.18) / 0.82;
          context.globalAlpha = Math.pow(1 - wake, 1.6) * 0.42;
          context.beginPath();
          context.ellipse(centerX, baseY - 2, 8 + wake * 58, 2 + wake * 9, 0, 0, Math.PI * 2);
          context.stroke();
        }
        context.restore();
      }

      if (clamped > 0.045) {
        const dustProgress = Math.min(1, (clamped - 0.045) / 0.46);
        context.save();
        context.translate(centerX, baseY - 1);
        context.scale(1, 0.24);
        const dust = context.createRadialGradient(0, 0, 2, 0, 0, 33 + dustProgress * 31);
        dust.addColorStop(0, `rgba(236,177,102,${0.2 + heat * 0.22})`);
        dust.addColorStop(0.36, `rgba(104,86,67,${0.28 * dustProgress})`);
        dust.addColorStop(0.74, `rgba(63,58,51,${0.18 * dustProgress})`);
        dust.addColorStop(1, "rgba(39,38,35,0)");
        context.fillStyle = dust;
        context.beginPath();
        context.arc(0, 0, 64, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }

      if (stemProgress > 0) {
        const capCenterY = cloudTopY + 12 + (1 - capProgress) * 8;
        const stemTop = Math.min(baseY - 9, capCenterY + 7);
        const stemHalf = 4.5 + stemProgress * 5.2;
        const stemTopHalf = stemHalf * (1.05 + capProgress * 1.45);
        const sway = Math.sin(clamped * Math.PI * 3.1) * 1.7;
        const stemGradient = context.createLinearGradient(centerX - stemHalf * 1.8, 0, centerX + stemHalf * 1.8, 0);
        stemGradient.addColorStop(0, "rgba(37,38,36,.14)");
        stemGradient.addColorStop(0.2, `rgba(78,72,65,${0.46 + stemProgress * 0.14})`);
        stemGradient.addColorStop(0.43, `rgba(185,128,74,${0.3 + heat * 0.48})`);
        stemGradient.addColorStop(0.56, `rgba(241,187,105,${0.24 + heat * 0.58})`);
        stemGradient.addColorStop(0.78, `rgba(80,73,67,${0.48 + stemProgress * 0.16})`);
        stemGradient.addColorStop(1, "rgba(31,32,31,.12)");
        context.fillStyle = stemGradient;
        context.beginPath();
        context.moveTo(centerX - stemHalf * 1.75, baseY);
        context.bezierCurveTo(centerX - stemHalf * 0.45, baseY - plotHeight * 0.2, centerX - stemHalf * 1.45 + sway, stemTop + (baseY - stemTop) * 0.42, centerX - stemTopHalf + sway, stemTop);
        context.quadraticCurveTo(centerX + sway, stemTop - 4 * capProgress, centerX + stemTopHalf + sway, stemTop);
        context.bezierCurveTo(centerX + stemHalf * 1.5 + sway, stemTop + (baseY - stemTop) * 0.38, centerX + stemHalf * 0.3, baseY - plotHeight * 0.2, centerX + stemHalf * 1.72, baseY);
        context.closePath();
        context.fill();

        context.save();
        context.globalCompositeOperation = "screen";
        const columnHeat = context.createLinearGradient(centerX, baseY, centerX, stemTop);
        columnHeat.addColorStop(0, `rgba(255,103,25,${0.28 * heat})`);
        columnHeat.addColorStop(0.5, `rgba(255,187,82,${0.2 * heat})`);
        columnHeat.addColorStop(1, `rgba(255,225,155,${0.08 * heat})`);
        context.strokeStyle = columnHeat;
        context.lineWidth = Math.max(2, stemHalf * 0.48);
        context.shadowColor = "rgba(255,88,25,.72)";
        context.shadowBlur = 8;
        context.beginPath();
        context.moveTo(centerX, baseY - 3);
        context.bezierCurveTo(centerX - 1.5, baseY - plotHeight * 0.3, centerX + sway * 0.7, stemTop + 9, centerX + sway, stemTop - 1);
        context.stroke();
        context.restore();

        context.save();
        context.globalCompositeOperation = heat > 0.2 ? "screen" : "source-over";
        for (let index = 0; index < 15; index += 1) {
          const vertical = (index + 0.5) / 15;
          const y = baseY - (baseY - stemTop) * vertical;
          const localWidth = stemHalf * (0.58 + Math.abs(vertical - 0.48) * 0.9);
          const x = centerX + sway * vertical + (deterministicNoise(index * 9.31) - 0.5) * localWidth * 1.35;
          const radius = 2.5 + deterministicNoise(index * 7.13 + 2) * 4.2 + stemProgress * 1.2;
          drawPuff(x, y, radius, 0.22 + deterministicNoise(index * 4.2) * 0.28, 0.28 + stemProgress * 0.17, vertical < 0.58);
        }
        if (capProgress > 0.08) {
          for (let index = 0; index < 12; index += 1) {
            const across = index / 11 - 0.5;
            const bridgeX = centerX + sway + across * stemTopHalf * 2.15;
            const bridgeY = stemTop - Math.sin(index * 1.73) * 2.2 - Math.abs(across) * 2.8;
            drawPuff(bridgeX, bridgeY, 3.8 + deterministicNoise(index * 8.1) * 4.3, 0.34, 0.24 + capProgress * 0.18, heat > 0.16);
          }
        }
        context.restore();

        const stemSpan = Math.max(1, baseY - stemTop);
        for (let index = 0; index < 13; index += 1) {
          const seed = 1300 + index * 11.9;
          const vertical = deterministicNoise(seed);
          const particleY = baseY - vertical * stemSpan;
          const particleX = centerX + sway * vertical + (deterministicNoise(seed + 4) - 0.5) * (13 + vertical * 28);
          const alpha = (0.08 + deterministicNoise(seed + 7) * 0.2) * stemProgress;
          context.fillStyle = `rgba(205,190,165,${alpha})`;
          context.beginPath();
          context.arc(particleX, particleY, 0.45 + deterministicNoise(seed + 2) * 1.25, 0, Math.PI * 2);
          context.fill();
        }
      }

      if (capProgress > 0) {
        const capWidth = 18 + capProgress * 70;
        const capHeight = 8 + capProgress * 23;
        const capCenterY = cloudTopY + capHeight * 0.68;

        context.save();
        const underside = context.createRadialGradient(centerX, capCenterY + capHeight * 0.36, 2, centerX, capCenterY + capHeight * 0.28, capWidth * 0.84);
        underside.addColorStop(0, `rgba(35,31,29,${0.7 * capProgress})`);
        underside.addColorStop(0.48, `rgba(54,49,44,${0.56 * capProgress})`);
        underside.addColorStop(0.8, `rgba(83,73,64,${0.22 * capProgress})`);
        underside.addColorStop(1, "rgba(35,31,29,0)");
        context.fillStyle = underside;
        context.beginPath();
        context.ellipse(centerX, capCenterY + capHeight * 0.28, capWidth * 0.88, capHeight * 0.56, 0, 0, Math.PI * 2);
        context.fill();
        context.restore();

        context.save();
        context.globalCompositeOperation = heat > 0.33 ? "screen" : "source-over";
        for (let index = 0; index < 58; index += 1) {
          const seed = index * 17.31;
          const xUnit = deterministicNoise(seed + 1.2) * 2 - 1;
          const edgeBias = Math.sign(xUnit) * Math.pow(Math.abs(xUnit), 0.72);
          const dome = Math.sqrt(Math.max(0, 1 - edgeBias * edgeBias));
          const layer = deterministicNoise(seed + 4.7);
          const x = centerX + edgeBias * capWidth * (0.82 + layer * 0.16) + Math.sin(clamped * 4.6 + index) * 0.8;
          const y = capCenterY - dome * capHeight * (0.52 + layer * 0.48) + (deterministicNoise(seed + 8.1) - 0.5) * capHeight * 0.6;
          const puffRadius = 3.8 + deterministicNoise(seed + 11.8) * 6.7 + capProgress * 2.7 + dome * 1.8;
          drawPuff(x, y, puffRadius, 0.34 + deterministicNoise(seed + 5.3) * 0.46, 0.4 + capProgress * 0.28, heat > 0.18 && layer < 0.55);
        }
        context.restore();

        for (let index = 0; index < 18; index += 1) {
          const seed = 900 + index * 13.7;
          const xUnit = deterministicNoise(seed) * 1.34 - 0.67;
          const crown = 1 - Math.abs(xUnit);
          const x = centerX + xUnit * capWidth * 0.72;
          const y = capCenterY - capHeight * (0.6 + crown * 0.48) + (deterministicNoise(seed + 4) - 0.5) * capHeight * 0.24;
          drawPuff(x, y, 4.4 + deterministicNoise(seed + 8) * 7.4 + crown * 2.2, 0.4 + deterministicNoise(seed + 2) * 0.42, 0.34 + capProgress * 0.3, heat > 0.16);
        }

        if (torusProgress > 0) {
          for (let index = 0; index < 24; index += 1) {
            const angle = (index / 24) * Math.PI * 2 + 0.11;
            const front = Math.sin(angle) > 0;
            const irregularity = 0.9 + deterministicNoise(index * 8.2) * 0.2;
            const x = centerX + Math.cos(angle) * capWidth * (0.68 + torusProgress * 0.14) * irregularity;
            const y = capCenterY + Math.sin(angle) * capHeight * (0.2 + torusProgress * 0.1) + (deterministicNoise(index * 7.1) - 0.5) * 2.6;
            drawPuff(x, y, 3.4 + deterministicNoise(index * 5.4) * 5.4, front ? 0.23 : 0.42, (front ? 0.24 : 0.14) + torusProgress * 0.22);
          }
        }

        const collarAlpha = Math.max(0, 0.38 - Math.abs(capProgress - 0.58) * 0.48);
        if (collarAlpha > 0.02) {
          for (let index = 0; index < 14; index += 1) {
            const angle = (index / 14) * Math.PI * 2;
            const x = centerX + Math.cos(angle) * capWidth * 0.42;
            const y = capCenterY + capHeight * 0.42 + Math.sin(angle) * capHeight * 0.13;
            drawPuff(x, y, 2.8 + deterministicNoise(index * 3.9) * 3.2, 0.62, collarAlpha * 0.74);
          }
        }

        const shearProgress = Math.max(0, Math.min(1, (capProgress - 0.5) / 0.5));
        if (shearProgress > 0) {
          context.save();
          context.lineCap = "round";
          for (let sideIndex = 0; sideIndex < 2; sideIndex += 1) {
            const side = sideIndex === 0 ? -1 : 1;
            for (let layer = 0; layer < 3; layer += 1) {
              const originX = centerX + side * capWidth * (0.54 + layer * 0.1);
              const originY = capCenterY - capHeight * (0.2 - layer * 0.14);
              const reach = capWidth * (0.26 + shearProgress * (0.24 + layer * 0.08));
              context.strokeStyle = `rgba(152,147,137,${(0.11 + layer * 0.035) * shearProgress})`;
              context.lineWidth = 2.8 - layer * 0.55;
              context.beginPath();
              context.moveTo(originX, originY);
              context.bezierCurveTo(
                originX + side * reach * 0.35,
                originY - 4 - layer * 2,
                originX + side * reach * 0.72,
                originY + 2 + layer * 2,
                originX + side * reach,
                originY - 1 + layer * 3,
              );
              context.stroke();
            }
          }
          context.restore();
        }
      }

      if (clamped < 0.32) {
        const fireballLife = clamped / 0.32;
        const fireballPulse = 1 + Math.sin(clamped * Math.PI * 34) * 0.045 * (1 - fireballLife);
        const fireballRadius = (5 + Math.sin(Math.min(1, fireballLife) * Math.PI * 0.72) * 20) * fireballPulse;
        const fireballY = baseY - 9 - stemProgress * 17;
        context.save();
        context.globalCompositeOperation = "screen";
        const fireball = context.createRadialGradient(centerX, fireballY, 0, centerX, fireballY, fireballRadius);
        fireball.addColorStop(0, "rgba(255,255,255,1)");
        fireball.addColorStop(0.18, "rgba(255,251,206,.98)");
        fireball.addColorStop(0.48, "rgba(255,153,45,.82)");
        fireball.addColorStop(1, "rgba(229,43,8,0)");
        context.fillStyle = fireball;
        context.beginPath();
        context.arc(centerX, fireballY, fireballRadius, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }

      context.save();
      context.strokeStyle = profile.nuclear ? "rgba(255,173,82,.82)" : "rgba(220,208,180,.72)";
      context.fillStyle = "rgba(255,222,164,.94)";
      context.lineWidth = 1;
      context.setLineDash([3, 3]);
      context.beginPath();
      context.moveTo(centerX + 38, cloudTopY);
      context.lineTo(scaleX - 1, cloudTopY);
      context.stroke();
      context.setLineDash([]);
      const heightLabel = formatDistance(currentHeightKm);
      context.font = "750 8px ui-monospace, SFMono-Regular, Menlo, monospace";
      const labelWidth = context.measureText(heightLabel).width + 9;
      context.fillStyle = "rgba(8,10,10,.9)";
      context.fillRect(scaleX - labelWidth - 3, Math.max(2, cloudTopY - 11), labelWidth, 11);
      context.fillStyle = "#ffd69c";
      context.fillText(heightLabel, scaleX - labelWidth + 1, Math.max(10, cloudTopY - 3));
      context.restore();
    }
  }, []);

  const drawRangeView = useCallback(() => {
    const map = mapRef.current;
    const canvas = blastCanvasRef.current;
    const mode = effectViewRef.current;
    if (!map || !canvas || (mode !== "audible" && mode !== "visible")) return;

    const renderer = rendererRef.current;
    const frame = renderer.beginFrame(map, canvas);
    if (!frame) return;
    const { width, height, context } = frame;
    renderer.hideMarkers([zoneMarkerRefs.current, falloutMarkerRefs.current, rangeMarkerRefs.current]);


    const model = rangeModel(profileRef.current);
    const radiusKm = mode === "audible" ? model.audibleKm : model.visibleKm;
    const fields = massModeRef.current && massStrikesRef.current.length
      ? massStrikesRef.current.map((strike) => {
          const strikeRange = rangeModel(strike.profile);
          return { origin: strike.target, radiusKm: mode === "audible" ? strikeRange.audibleKm : strikeRange.visibleKm };
        })
      : (mirvTargetsRef.current.length > 1 ? mirvTargetsRef.current : [impactRef.current])
        .map((origin) => ({ origin, radiusKm }));
    const origins = fields.map((field) => field.origin);
    const presentation = explosionPresentation(origins.length, armageddonRef.current);
    const multipleOrigins = !presentation.ruler;
    const combinedOrigin = sphericalMeanPoint(origins);
    const displayRadiusKm = Math.min(MAX_SURFACE_DISTANCE_KM, radiusKm);
    const displayOrigins = multipleOrigins ? origins : [combinedOrigin];
    const worldPixels = 512 * Math.pow(2, map.getZoom());
    const palette = mode === "audible"
      ? { core: "#e1ffe9" }
      : { core: "#e2f4ff" };

    const projectContinuous = (points: Point[], anchor: { x: number; y: number }) => {
      let previousX = anchor.x;
      return points.map((point) => {
        const projected = map.project([point.lng, point.lat]);
        let x = projected.x;
        while (x - previousX > worldPixels / 2) x -= worldPixels;
        while (x - previousX < -worldPixels / 2) x += worldPixels;
        previousX = x;
        return { x, y: projected.y };
      });
    };
    // A single geodesic scalar field serves every scale and strike count.
    // Add intensities first, then sample the legend palette exactly once.
    // This is the blast compositor's peak-plus-overlap response, so repeated
    // faint fields advance toward the intense end of the palette.
    const useStableRasterContours = displayRadiusKm > 1200 || origins.length > 10;
    renderer.paintField(map, context, mode + ":" + JSON.stringify(fields), (fieldFrame) => {
      const { map, context, width, height } = fieldFrame;
      const rangeQualityCap = origins.length > 24 ? 0.28 : origins.length > 10 ? 0.38 : 0.58;
      const renderScale = Math.min(rangeQualityCap, 640 / Math.max(1, width), 420 / Math.max(1, height));
      const maskWidth = Math.max(1, Math.ceil(width * renderScale));
      const maskHeight = Math.max(1, Math.ceil(height * renderScale));
      const mask = rangeMaskCanvasRef.current ?? document.createElement("canvas");
      rangeMaskCanvasRef.current = mask;
      if (mask.width !== maskWidth || mask.height !== maskHeight) {
        mask.width = maskWidth;
        mask.height = maskHeight;
      }
      const maskContext = mask.getContext("2d");
      if (maskContext) {
        let image = rangeMaskImageRef.current;
        if (!image || image.width !== maskWidth || image.height !== maskHeight) {
          image = maskContext.createImageData(maskWidth, maskHeight);
          rangeMaskImageRef.current = image;
        } else {
          image.data.fill(0);
        }
        const longitudes = Array.from({ length: maskWidth }, (_, x) => map.unproject([(x + 0.5) / renderScale, height * 0.5]).lng);
        const latitudes = Array.from({ length: maskHeight }, (_, y) => map.unproject([width * 0.5, (y + 0.5) / renderScale]).lat);
        const distanceGrids = fields.map((field) => ({
          grid: prepareDistanceGrid(field.origin, longitudes, latitudes),
          inverseRadius: 1 / Math.max(0.001, field.radiusKm),
          cutoffHaversine: Math.sin(Math.min(Math.PI, field.radiusKm * 1.12 / EARTH_RADIUS_KM) / 2) ** 2,
        }));
        const lookup = RANGE_FIELD_LUTS[mode];
        for (let y = 0; y < maskHeight; y += 1) {
          for (let x = 0; x < maskWidth; x += 1) {
            let peakIntensity = 0;
            let summedIntensity = 0;
            for (let originIndex = 0; originIndex < distanceGrids.length; originIndex += 1) {
              const field = distanceGrids[originIndex];
              // Reject pixels outside a field before the expensive inverse
              // trig operation, especially useful for separated targets.
              const haversine = field.grid.latitudeHaversines[y]
                + field.grid.latitudeCosines[y] * field.grid.longitudeHaversines[x];
              if (haversine >= field.cutoffHaversine) continue;
              const normalized = 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(Math.max(0, haversine)))) * field.inverseRadius;
              if (normalized >= 1.12) continue;
              const contribution = rangeFieldIntensity(normalized);
              peakIntensity = Math.max(peakIntensity, contribution);
              summedIntensity += contribution;
              if (peakIntensity === 1) break;
            }
            if (peakIntensity <= 0) continue;
            const intensity = combineFieldIntensity(peakIntensity, summedIntensity);
            const lookupOffset = Math.min(1023, Math.round(intensity * 1023)) * 4;
            const offset = (y * maskWidth + x) * 4;
            image.data[offset] = lookup[lookupOffset];
            image.data[offset + 1] = lookup[lookupOffset + 1];
            image.data[offset + 2] = lookup[lookupOffset + 2];
            image.data[offset + 3] = lookup[lookupOffset + 3];
          }
        }
        maskContext.putImageData(image, 0, 0);
        context.save();
        context.globalCompositeOperation = "source-over";
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.drawImage(mask, 0, 0, width, height);
        context.restore();
      }
    });

    if (multipleOrigins) return;

    if (presentation.divisions && displayRadiusKm <= 1200) {
      const origin = displayOrigins[0];
      const originPixel = map.project([origin.lng, origin.lat]);
      RANGE_EXPERIENCE_BANDS.forEach((band) => {
        const points = projectContinuous(Array.from({ length: 180 }, (_, index) => destinationPoint(origin, displayRadiusKm * band.outerFactor, index * 2)), originPixel);
        renderer.drawDivision(context, points, {
          color: rangeMarkerColor(mode, rangeFieldIntensity(band.outerFactor)),
          alpha: band.outerFactor === 1 ? 0.36 : 0.62,
          width: band.outerFactor === 1 ? 0.9 : 1.1,
          glow: 3,
        });
      });
    }

    const rulerOrigin = displayOrigins[0];
    const rulerOriginPixel = map.project([rulerOrigin.lng, rulerOrigin.lat]);
    const planetScaleBar = useStableRasterContours;
    const rulerBearing = width <= 900 ? 34 : 42;
    const ruler = planetScaleBar
      ? Array.from({ length: 43 }, (_, index) => {
          const startX = Math.max(width > 900 ? 430 : 24, width - 284);
          const endX = width - 28;
          return { x: startX + (endX - startX) * (index / 42), y: width > 900 ? 102 : height - 116 };
        })
      : projectContinuous(
          Array.from({ length: 43 }, (_, index) => destinationPoint(rulerOrigin, displayRadiusKm * (index / 42), rulerBearing)),
          rulerOriginPixel,
        );
    context.save();
    context.globalAlpha = 0.92;
    context.strokeStyle = palette.core;
    context.fillStyle = "#ff6b6b";
    context.lineWidth = planetScaleBar ? 1.6 : 1.2;
    context.setLineDash(planetScaleBar ? [] : [4, 4]);
    context.beginPath();
    renderer.drawRuler(context, ruler, { color: palette.core, width: planetScaleBar ? 1.6 : 1.2, dashes: planetScaleBar ? [] : [4, 4] });
    context.setLineDash([]);
    if (planetScaleBar) {
      [0, 0.25, 0.5, 0.75, 1].forEach((factor) => {
        const point = ruler[Math.round((ruler.length - 1) * factor)];
        context.beginPath();
        context.moveTo(point.x, point.y - 5);
        context.lineTo(point.x, point.y + 5);
        context.stroke();
      });
      context.globalAlpha = 0.68;
      context.font = "650 8px ui-monospace, SFMono-Regular, Menlo, monospace";
      context.fillText("GEODESIC RANGE", ruler[0].x, ruler[0].y - 9);
      context.globalAlpha = 0.92;
    }
    const endpoint = ruler[ruler.length - 1];
    const beforeEndpoint = ruler[ruler.length - 2];
    const angle = Math.atan2(endpoint.y - beforeEndpoint.y, endpoint.x - beforeEndpoint.x);
    const tickX = -Math.sin(angle) * 6;
    const tickY = Math.cos(angle) * 6;
    context.beginPath();
    context.moveTo(endpoint.x - tickX, endpoint.y - tickY);
    context.lineTo(endpoint.x + tickX, endpoint.y + tickY);
    context.stroke();
    const label = `${origins.length > 1 ? "COMBINED " : ""}${mode.toUpperCase()}  ${formatDistance(displayRadiusKm)}`;
    context.font = "700 10px ui-monospace, SFMono-Regular, Menlo, monospace";
    const labelWidth = context.measureText(label).width + 16;
    const preferredX = endpoint.x + labelWidth + 18 < width ? endpoint.x + 9 : endpoint.x - labelWidth - 9;
    const minimumLabelX = width > 900 ? 430 : 8;
    const labelX = Math.max(minimumLabelX, Math.min(width - labelWidth - 8, preferredX));
    const labelY = Math.max(18, Math.min(height - 12, endpoint.y - 10));
    context.fillStyle = "rgba(7,9,9,.91)";
    context.fillRect(labelX, labelY - 13, labelWidth, 22);
    context.fillStyle = "#ff6b6b";
    context.fillText(label, labelX + 8, labelY + 2);
    context.restore();

    RANGE_EXPERIENCE_BANDS.forEach((band) => {
      const factor = (band.innerFactor + band.outerFactor) * 0.5;
      const markerPoint = ruler[Math.round((ruler.length - 1) * factor)];
      const marker = rangeMarkerRefs.current[band.id];
      renderer.placeMarker(marker, markerPoint, width, height);
    });
  }, []);

  const drawMissile = useCallback((progress = missileProgressRef.current) => {
    const map = mapRef.current;
    const canvas = missileCanvasRef.current;
    if (!map || !canvas) return;
    const frame = rendererRef.current.beginFrame(map, canvas);
    if (!frame || progress <= 0 || progress >= 1) return;
    const strike = massStrikesRef.current[0];
    if (strike) drawStrikeFlight(frame.context, map, strike, progress * strike.flightMs, reducedMotionRef.current, false);
  }, []);

  const drawMassScene = useCallback((now = massNowRef.current) => {
    const map = mapRef.current;
    const blastCanvas = blastCanvasRef.current;
    const missileCanvas = missileCanvasRef.current;
    if (!map || !blastCanvas || !missileCanvas || !massModeRef.current) return { impacted: 0, finished: 0, inbound: 0, latestBlastProgress: 0 };

    const strikes = massStrikesRef.current;
    const qualityCap = strikes.length >= 8 ? 1 : strikes.length >= 4 ? 1.35 : 2;
    const renderer = rendererRef.current;
    const blastFrame = renderer.beginFrame(map, blastCanvas, qualityCap, false);
    const missileFrame = renderer.beginFrame(map, missileCanvas, qualityCap);
    if (!blastFrame || !missileFrame) return { impacted: 0, finished: 0, inbound: 0, latestBlastProgress: 0 };
    const { width, height, context: blast, resized: blastResized } = blastFrame;
    const { context: missile } = missileFrame;
    renderer.hideMarkers([zoneMarkerRefs.current, falloutMarkerRefs.current, rangeMarkerRefs.current]);
    const elapsed = Math.max(0, now - massStartTimeRef.current);
    const fieldFrameInterval = strikes.length >= 16 ? 50 : strikes.length >= 6 ? 33 : 16;
    let settledCount = 0;
    let expanding = false;
    for (const strike of strikes) {
      const blastAge = elapsed - strike.delayMs - strike.flightMs;
      if (blastAge >= strike.blastMs) settledCount += 1;
      else if (blastAge >= 0) expanding = true;
    }
    const allFinished = strikes.length > 0 && settledCount === strikes.length;
    const center = map.getCenter();
    const cameraKey = JSON.stringify([width, height, center.lng, center.lat, map.getZoom(), map.getBearing(), map.getPitch(), map.getPadding(), strikes.length, armageddonRef.current]);
    const paintBlastFrame = shouldPaintBlastField({
      resized: blastResized,
      cameraChanged: cameraKey !== massFieldCameraRef.current,
      settledChanged: settledCount !== massFieldFinishedRef.current,
      expanding,
      sinceLastPaint: now - massLastFieldPaintRef.current,
      interval: fieldFrameInterval,
    });
    if (paintBlastFrame) {
      blast.clearRect(0, 0, width, height);
      massLastFieldPaintRef.current = now;
      massFieldCameraRef.current = cameraKey;
      massFieldFinishedRef.current = settledCount;
    }
    const diagonal = Math.hypot(width, height);
    const compactDimension = Math.min(width, height);
    const maxScreenRadius = diagonal * 3;
    const zoomScale = Math.pow(2, map.getZoom());
    const singleField = strikes.length === 1;
    const showDividingRings = explosionPresentation(strikes.length, armageddonRef.current).divisions;
    let impacted = 0;
    let finished = 0;
    let inbound = 0;
    let latestBlastProgress = 0;
    const latestStrikeId = strikes[strikes.length - 1]?.id ?? 0;
    const stackedFields: StackedBlastField[] = [];
    const activeShockwaves: Array<{ x: number; y: number; radius: number; origin: Point; radiusKm: number }> = [];
    const projectedCarriers = new Map<number, ProjectedCarrier>();
    const perspective = map.getPitch() > 0.01;

    strikes.forEach((strike) => {
      const strikeElapsed = elapsed - strike.delayMs;
      if (strikeElapsed < 0) {
        inbound += 1;
        return;
      }

      // Anchor the incoming carrier to the current viewport on launch.
      const group = strike.flightGroup;
      if (!group.routeReady) {
        const aim = map.project([group.aim.lng, group.aim.lat]);
        const route = viewportFlightRoute(width, height, aim, group.angle);
        const start = map.unproject([route.start.x, route.start.y]);
        const control = map.unproject([route.control.x, route.control.y]);
        group.start = { ...start, name: "Incoming carrier" };
        group.control = { ...control, name: "Flight arc" };
        group.routeReady = true;
      }

      if (strikeElapsed <= strike.flightMs + 4000) {
        drawStrikeFlight(missile, map, strike, strikeElapsed, reducedMotionRef.current, strikes.length >= 10, projectedCarriers);
      }
      if (strikeElapsed < strike.flightMs) {
        inbound += 1;
        const group = strike.flightGroup;
        if (strike.carrierLead || !group.splitMs || strikeElapsed >= group.splitMs) {
          const aim = group.splitMs && strikeElapsed < group.splitMs ? group.aim : strike.target;
          const target = map.project([aim.lng, aim.lat]);
          const targetPulse = 0.5 + Math.sin(now * 0.0085 + strike.id * 0.73) * 0.5;
          drawLaunchTarget(missile, target.x, target.y, targetPulse);
        }
        return;
      }

      impacted += 1;
      const blastElapsed = strikeElapsed - strike.flightMs;
      const blastProgress = Math.max(0, Math.min(1, blastElapsed / strike.blastMs));
      if (blastProgress >= 1) finished += 1;
      const easedBlast = 1 - Math.pow(1 - blastProgress, 2.15);
      if (strike.id === latestStrikeId) latestBlastProgress = blastProgress;

      if (!paintBlastFrame && blastElapsed >= 1100) return;
      const target = map.project([strike.target.lng, strike.target.lat]);

      if (blastElapsed < 1100) {
        const flashAge = Math.max(0, blastElapsed / 1100);
        const attack = Math.min(1, flashAge / 0.035);
        const flashOpacity = attack * Math.pow(1 - flashAge, 1.55);
        const localScale = compactDimension;
        const auraRadius = 34 + Math.pow(flashAge, 0.5) * Math.min(220, localScale * 0.4);
        const coreRadius = 8 + Math.pow(flashAge, 0.38) * Math.min(82, localScale * 0.14);

        missile.save();
        missile.globalCompositeOperation = "screen";
        const aura = missile.createRadialGradient(target.x, target.y, 0, target.x, target.y, auraRadius);
        aura.addColorStop(0, `rgba(255,255,255,${0.98 * flashOpacity})`);
        aura.addColorStop(0.12, `rgba(255,251,221,${0.95 * flashOpacity})`);
        aura.addColorStop(0.38, `rgba(255,178,69,${0.6 * flashOpacity})`);
        aura.addColorStop(0.72, `rgba(255,62,20,${0.24 * flashOpacity})`);
        aura.addColorStop(1, "rgba(158,14,0,0)");
        missile.fillStyle = aura;
        missile.beginPath();
        missile.arc(target.x, target.y, auraRadius, 0, Math.PI * 2);
        missile.fill();

        const core = missile.createRadialGradient(target.x, target.y, 0, target.x, target.y, coreRadius);
        core.addColorStop(0, `rgba(255,255,255,${flashOpacity})`);
        core.addColorStop(0.26, `rgba(255,255,238,${0.96 * flashOpacity})`);
        core.addColorStop(0.66, `rgba(255,205,92,${0.72 * flashOpacity})`);
        core.addColorStop(1, "rgba(255,88,24,0)");
        missile.fillStyle = core;
        missile.beginPath();
        missile.arc(target.x, target.y, coreRadius, 0, Math.PI * 2);
        missile.fill();
        missile.restore();
      }

      if (!paintBlastFrame) return;
      const travelledKm = strike.radii.light * easedBlast;
      const latitudeScale = Math.max(0.04, Math.cos((strike.target.lat * Math.PI) / 180));
      const metersPerPixel = (MERCATOR_METERS_PER_PIXEL_AT_ZOOM_0 * latitudeScale) / zoomScale;
      const toPixels = (kilometers: number) => Math.min(maxScreenRadius, (Math.min(MAX_SURFACE_DISTANCE_KM, kilometers) * 1000) / metersPerPixel);
      const travelledPixels = toPixels(travelledKm);
      const pixelRadii: BlastRadii = {
        fireball: toPixels(strike.radii.fireball),
        severe: toPixels(strike.radii.severe),
        moderate: toPixels(strike.radii.moderate),
        light: toPixels(strike.radii.light),
      };
      if (singleField) {
        if (perspective) {
          drawProjectedBlast(blast, map, strike.target, travelledKm, strike.radii);
          if (showDividingRings) EFFECTS.forEach((effect) => {
            if (travelledKm < strike.radii[effect.id]) return;
            renderer.drawDivision(blast, projectedBlastOutline(map, strike.target, strike.radii[effect.id]), {
              color: effect.color, alpha: effect.id === "light" ? 0.48 : 0.96,
              width: effect.id === "fireball" ? 2.45 : effect.id === "light" ? 1.3 : 1.65,
              glow: effect.id === "light" ? 10 : 5,
            });
          });
        } else {
          drawZoneBands(blast, target.x, target.y, travelledPixels, pixelRadii, true);
          if (showDividingRings) drawZoneBoundaries(blast, target.x, target.y, travelledPixels, pixelRadii);
        }
      } else {
        stackedFields.push({ x: target.x, y: target.y, travelledRadius: travelledPixels, finalRadii: pixelRadii, origin: strike.target, radiiKm: strike.radii, travelledKm });
      }

      if (blastProgress < 1) {
        if (singleField) {
          if (perspective && travelledKm <= MAX_SURFACE_DISTANCE_KM / 2) drawProjectedShockwave(blast, map, strike.target, travelledKm);
          else drawBlastShockwave(blast, target.x, target.y, travelledPixels);
        } else activeShockwaves.push({ x: target.x, y: target.y, radius: travelledPixels, origin: strike.target, radiusKm: travelledKm });
      }
    });

    if (paintBlastFrame && !singleField && stackedFields.length) {
      const mask = multiBlastMaskCanvasRef.current ?? document.createElement("canvas");
      const peakMask = multiBlastPeakCanvasRef.current ?? document.createElement("canvas");
      multiBlastMaskCanvasRef.current = mask;
      multiBlastPeakCanvasRef.current = peakMask;
      if (allFinished && !perspective) {
        renderer.paintField(map, blast, "blast-multi:" + JSON.stringify(strikes.map((strike) => [strike.id, strike.target, strike.radii])), (fieldFrame) => {
          const { context, width: fieldWidth, height: fieldHeight, padding } = fieldFrame;
          renderStackedBlastFields(context, mask, peakMask, fieldWidth, fieldHeight, stackedFields.map((field) => ({ ...field, x: field.x + padding, y: field.y + padding })));
        });
      } else {
        renderStackedBlastFields(blast, mask, peakMask, width, height, stackedFields, perspective ? map : undefined);
      }
      activeShockwaves.forEach((wave) => {
        if (perspective && wave.radiusKm <= 2500) drawProjectedShockwave(blast, map, wave.origin, wave.radiusKm);
        else drawBlastShockwave(blast, wave.x, wave.y, wave.radius);
      });
    }

    blast.globalAlpha = 1;
    missile.globalAlpha = 1;
    return { impacted, finished, inbound, latestBlastProgress };
  }, []);

  const clearSequence = useCallback(() => {
    fireballRendererRef.current?.clear();
    multiGroundDistanceCache.clear();
    rendererRef.current.invalidate();
    sequenceTokenRef.current += 1;
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
    animationProgressRef.current = 0;
    missileProgressRef.current = 0;
    massModeRef.current = false;
    massStrikesRef.current = [];
    massImpactedRef.current = 0;
    massLastFieldPaintRef.current = 0;
    lastFireballPaintRef.current = 0;
    massFieldCameraRef.current = "";
    massFieldFinishedRef.current = 0;
    lastCloudPaintProgressRef.current = 0;
    nextStrikeIdRef.current = 1;
    launchAngleRef.current = Math.random() * Math.PI * 2;
    setHasNuclearStrike(false);
    mirvTargetsRef.current = [];
    drawBlast(0);
    drawMissile(0);
    drawCloudProfile(0);
  }, [drawBlast, drawCloudProfile, drawMissile]);

  const stopAnimation = useCallback(() => {
    clearSequence();
    effectViewRef.current = "blast";
    setEffectView("blast");
    setMassMode(false);
    setMirvActive(false);
    setMassStatus({ active: false, impacted: 0, total: 0 });
    setActiveZoneId(null);
    setPinnedZoneId(null);
    setActiveFalloutId(null);
    setPinnedFalloutId(null);
    setActiveRangeBandId(null);
    setPinnedRangeBandId(null);
  }, [clearSequence]);

  const armVisual = useCallback(() => {
    stopAnimation();
    setPhase("armed");
    phaseRef.current = "armed";
  }, [stopAnimation]);

  const positionOverlays = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const scaleBar = multiScaleBarRef.current;
    const scaleText = multiScaleTextRef.current;
    if (scaleBar && scaleText) {
      const latitudeScale = Math.max(0.04, Math.cos((map.getCenter().lat * Math.PI) / 180));
      const metersPerPixel = (MERCATOR_METERS_PER_PIXEL_AT_ZOOM_0 * latitudeScale) / Math.pow(2, map.getZoom());
      const distanceKm = niceScaleDistance((metersPerPixel * 132) / 1000);
      const displayWidth = Math.max(54, Math.min(158, (distanceKm * 1000) / metersPerPixel));
      scaleBar.style.width = `${displayWidth}px`;
      const label = formatDistance(distanceKm);
      if (scaleText.textContent !== label) scaleText.textContent = label;
    }
    const center = map.project([impactRef.current.lng, impactRef.current.lat]);
    const flash = detonationFlashRef.current;
    if (flash) {
      flash.style.setProperty("--flash-x", `${center.x}px`);
      flash.style.setProperty("--flash-y", `${center.y}px`);
    }
    drawCloudProfile(animationProgressRef.current);
    if ((effectViewRef.current === "audible" || effectViewRef.current === "visible") && phaseRef.current === "complete") {
      drawRangeView();
      drawMissile(0);
      return;
    }
    if (effectViewRef.current === "fallout" && phaseRef.current === "complete") {
      drawFallout();
      drawMissile(0);
      return;
    }
    if (massModeRef.current) {
      if (massStrikesRef.current.length === 1 && phaseRef.current === "complete") {
        drawBlast(1);
        return;
      }
      drawMassScene();
      return;
    }
    drawBlast();
    drawMissile();
  }, [drawBlast, drawCloudProfile, drawFallout, drawMassScene, drawMissile, drawRangeView]);

  const schedulePositionOverlays = useCallback(() => {
    overlayDirtyRef.current = true;
    mapRef.current?.triggerRepaint();
  }, []);

  const updateZones = useCallback(() => {
    radiiRef.current = radiiForYield(selectedProfile.warheadYieldMt);
    profileRef.current = selectedProfile;
    yieldRef.current = selectedProfile.warheadYieldMt;
    positionOverlays();
  }, [positionOverlays, selectedProfile]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    let cancelled = false;

    import("maplibre-gl").then(({ Map, NavigationControl }) => {
      if (cancelled || !mapContainer.current) return;
      const map = new Map({
        container: mapContainer.current,
        center: [impact.lng, impact.lat],
        zoom: 10.6,
        minZoom: 0.75,
        maxZoom: 18,
        attributionControl: { compact: true },
        style: {
          version: 8,
          sources: {
            satellite: {
              type: "raster",
              tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
              tileSize: 256,
              attribution: "Tiles © Esri — Esri, Maxar, Earthstar Geographics",
            },
          },
          layers: [
            { id: "satellite", type: "raster", source: "satellite", paint: { "raster-saturation": -0.22, "raster-contrast": 0.08, "raster-brightness-min": 0.08, "raster-brightness-max": 0.92 } },
          ],
        },
      });

      map.addControl(new NavigationControl({ showCompass: false }), "bottom-right");
      const updateCameraPadding = () => map.setPadding(map.getContainer().clientWidth > 900
        ? { top: 0, right: 0, bottom: 0, left: 380 }
        : { top: 80, right: 0, bottom: 0, left: 0 });
      updateCameraPadding();
      map.on("resize", updateCameraPadding);
      map.on("load", () => {
        mapRef.current = map;
        if (fireballCanvasRef.current) {
          try {
            fireballRendererRef.current = new FireballRenderer(fireballCanvasRef.current);
            map.addLayer({
              id: "fireball-camera",
              type: "custom",
              renderingMode: "2d",
              render(_gl, options) {
                const elapsed = Math.max(0, massNowRef.current - massStartTimeRef.current);
                const balls = effectViewRef.current === "blast" && massModeRef.current
                  ? massStrikesRef.current.flatMap((strike) => {
                    const age = elapsed - strike.delayMs - strike.flightMs;
                    if (age <= 0) return [];
                    return [{ lng: strike.target.lng, lat: strike.target.lat, radiusKm: strike.radii.fireball, lightKm: strike.radii.light, progress: Math.min(1, age / strike.blastMs) }];
                  })
                  : [];
                const textureTime = reducedMotionRef.current ? massNowRef.current : performance.now();
                fireballRendererRef.current?.render(options.defaultProjectionData.mainMatrix, map, balls, textureTime);
              },
            });
          } catch (error) {
            console.error("Unable to initialize the 3D fireball", error);
          }
        }
        setMapReady(true);
        updateZones();
      });

      // Paint during the map's own render event, in the same camera frame.
      map.on("render", () => {
        if (!overlayDirtyRef.current) return;
        overlayDirtyRef.current = false;
        positionOverlays();
      });
      map.on("move", schedulePositionOverlays);
      map.on("moveend", positionOverlays);
      map.on("resize", schedulePositionOverlays);
      map.on("click", (event) => {
        const next = { lng: event.lngLat.lng, lat: event.lngLat.lat, name: "Custom ground zero" };
        launchAtRef.current(next);
      });
    });

    return () => {
      cancelled = true;
      clearSequence();
      rendererRef.current.invalidate();
      mapRef.current?.remove();
      mapRef.current = null;
      fireballRendererRef.current = null;
    };
    // Map construction is intentionally one-time; state is synchronized through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapReady) return;
    updateZones();
  }, [mapReady, impact, yieldMt, updateZones]);

  // Once the main explosion finishes, animate only the small 3D overlay.
  // The map's normal render loop keeps it registered to camera movement.
  useEffect(() => {
    if (!mapReady || effectView !== "blast" || phase !== "complete" || massStatus.impacted === 0 || reducedMotionRef.current) return;
    let frame = 0;
    let lastPaint = 0;
    const tick = (now: number) => {
      if (!document.hidden && now - lastPaint >= 50) {
        mapRef.current?.triggerRepaint();
        lastPaint = now;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [mapReady, effectView, phase, massStatus.impacted]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !map.getLayer("satellite")) return;
    const paint = mapMode === "day"
      ? { saturation: -0.22, contrast: 0.08, min: 0.08, max: 0.92 }
      : { saturation: -1, contrast: 0.34, min: 0.02, max: 0.48 };
    map.setPaintProperty("satellite", "raster-saturation", paint.saturation);
    map.setPaintProperty("satellite", "raster-contrast", paint.contrast);
    map.setPaintProperty("satellite", "raster-brightness-min", paint.min);
    map.setPaintProperty("satellite", "raster-brightness-max", paint.max);
  }, [mapMode, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    map.setPadding(panelsHidden || map.getContainer().clientWidth <= 900
      ? { top: 0, right: 0, bottom: 0, left: 0 }
      : { top: 0, right: 0, bottom: 0, left: 380 });
    schedulePositionOverlays();
  }, [mapReady, panelsHidden, schedulePositionOverlays]);

  useEffect(() => {
    if (massStatus.total > 0 || armageddon) schedulePositionOverlays();
  }, [massStatus.total, armageddon, schedulePositionOverlays]);

  const changeEffectView = (nextView: EffectView) => {
    if (nextView === "fallout" && !profileRef.current.fallout && !massStrikesRef.current.some((strike) => strike.nuclear)) return;
    const map = mapRef.current;
    effectViewRef.current = nextView;
    // The shared canvas is repainted by every view; returning to blast must
    // rebuild its settled fields even when the camera has not moved.
    massFieldCameraRef.current = "";
    setEffectView(nextView);
    setActiveZoneId(null);
    setPinnedZoneId(null);
    setActiveFalloutId(null);
    setPinnedFalloutId(null);
    setActiveRangeBandId(null);
    setPinnedRangeBandId(null);

    if (map && !massModeRef.current) {
      const container = map.getContainer();
      const usableWidth = container.clientWidth > 900 ? container.clientWidth - 380 : container.clientWidth;
      const targetPixels = Math.max(100, Math.min(usableWidth, container.clientHeight) * (nextView === "fallout" ? 0.36 : 0.34));
      const viewCenter = nextView === "fallout"
        ? destinationPoint(impact, falloutSize.lengthKm * 0.5, windModel.bearing + windModel.curve * 0.22)
        : impact;
      const horizonKm = nextView === "fallout"
        ? Math.max(falloutSize.widthKm * 1.35, falloutSize.lengthKm * 0.78)
        : nextView === "audible"
          ? ranges.audibleKm * 1.08
          : nextView === "visible"
            ? ranges.visibleKm * 1.08
            : modelHorizon;
      const latitudeScale = Math.max(0.04, Math.cos((viewCenter.lat * Math.PI) / 180));
      const idealZoom = Math.log2((156543.03392 * latitudeScale * targetPixels) / (Math.max(0.001, horizonKm) * 1000));
      map.stop();
      map.easeTo({ center: [viewCenter.lng, viewCenter.lat], zoom: Math.max(0.75, Math.min(13, idealZoom)), duration: 650 });
    }

    schedulePositionOverlays();
  };

  const launchAt = useCallback((target: Point) => {
    if (!mapReady || !mapRef.current) return;
    if (!armageddonRef.current) stopAnimation();
    const profile = weaponProfile(selectedId, yieldMt);
    const strikeRadii = radiiForYield(profile.warheadYieldMt);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const now = performance.now();
    if (!massModeRef.current || massStrikesRef.current.length === 0) {
      massModeRef.current = true;
      massStartTimeRef.current = now;
      massNowRef.current = now;
      massLastFieldPaintRef.current = 0;
      launchAngleRef.current = Math.random() * Math.PI * 2;
      Object.values(zoneMarkerRefs.current).forEach((marker) => {
        if (!marker) return;
        marker.style.opacity = "0";
        marker.style.visibility = "hidden";
        marker.tabIndex = -1;
      });
      setMassMode(true);
    }

    const baseDelay = Math.max(0, now - massStartTimeRef.current);
    const targets = profile.warheads > 1
      ? mirvTargets(target, profile.warheads, strikeRadii.light)
      : [target];
    const map = mapRef.current;
    const container = map.getContainer();
    const angle = launchAngleRef.current;
    const aimPixel = map.project([target.lng, target.lat]);
    const route = viewportFlightRoute(container.clientWidth, container.clientHeight, aimPixel, angle);
    const controlGeo = map.unproject([route.control.x, route.control.y]);
    const startGeo = map.unproject([route.start.x, route.start.y]);
    const carrierMs = reducedMotion ? 650 : MISSILE_FLIGHT_MS;
    const flightGroup = {
      id: nextStrikeIdRef.current,
      start: { ...startGeo, name: "Incoming carrier" },
      control: { ...controlGeo, name: "Flight arc" },
      aim: target,
      angle,
      routeReady: false,
      carrierMs,
      splitMs: profile.warheads > 1 ? carrierMs * 0.6 : 0,
    };
    const additions = targets.map((warheadTarget, index): MassStrike => {
      const id = nextStrikeIdRef.current++;
      return {
        id,
        target: warheadTarget,
        delayMs: baseDelay,
        flightMs: carrierMs + (reducedMotion ? index * 8 : index * 45),
        blastMs: reducedMotion ? 1100 : ANIMATION_MS,
        yieldMt: profile.warheadYieldMt,
        radii: strikeRadii,
        nuclear: profile.nuclear,
        profile,
        carrierLead: index === 0,
        flightGroup,
      };
    });

    if (massStrikesRef.current.length + additions.length > 1) {
      Object.values(zoneMarkerRefs.current).forEach((marker) => {
        if (!marker) return;
        marker.style.opacity = "0";
        marker.style.visibility = "hidden";
        marker.tabIndex = -1;
      });
    }

    massStrikesRef.current = [...massStrikesRef.current, ...additions];
    profileRef.current = profile;
    yieldRef.current = profile.warheadYieldMt;
    radiiRef.current = strikeRadii;
    impactRef.current = target;
    mirvTargetsRef.current = targets.length > 1 ? targets : [];
    reducedMotionRef.current = reducedMotion;
    animationProgressRef.current = 0;
    effectViewRef.current = "blast";
    setEffectView("blast");
    setImpact(target);
    setScenarioId("");
    setMirvActive(profile.warheads > 1);
    if (profile.nuclear) setHasNuclearStrike(true);
    setActiveZoneId(null);
    setPinnedZoneId(null);
    setActiveFalloutId(null);
    setPinnedFalloutId(null);
    setActiveRangeBandId(null);
    setPinnedRangeBandId(null);
    setMassStatus({ active: true, impacted: massImpactedRef.current, total: massStrikesRef.current.length });
    setPhase("inbound");
    phaseRef.current = "inbound";
    drawCloudProfile(0);
    lastCloudPaintProgressRef.current = 0;

    // Paint the crosshair immediately, including when another launch is live.
    massNowRef.current = now;
    drawMassScene(now);

    if (animationFrameRef.current !== null) return;
    const sequenceToken = sequenceTokenRef.current;
    const tick = (frameNow: number) => {
      if (sequenceToken !== sequenceTokenRef.current || !massModeRef.current) return;
      massNowRef.current = frameNow;
      const status = drawMassScene(frameNow);
      const fireballInterval = massStrikesRef.current.length >= 8 ? 50 : massStrikesRef.current.length >= 4 ? 33 : 16;
      if (status.impacted > 0 && frameNow - lastFireballPaintRef.current >= fireballInterval) {
        mapRef.current?.triggerRepaint();
        lastFireballPaintRef.current = frameNow;
      }
      animationProgressRef.current = status.latestBlastProgress;
      const cloudProgress = status.latestBlastProgress;
      if (cloudProgress === 1 || Math.abs(cloudProgress - lastCloudPaintProgressRef.current) >= 0.004) {
        drawCloudProfile(cloudProgress);
        lastCloudPaintProgressRef.current = cloudProgress;
      }
      const total = massStrikesRef.current.length;
      const nextPhase: Phase = status.impacted > status.finished
        ? "detonating"
        : status.inbound > 0
          ? "inbound"
          : "complete";
      if (phaseRef.current !== nextPhase) {
        phaseRef.current = nextPhase;
        setPhase(nextPhase);
      }
      if (status.impacted !== massImpactedRef.current) {
        massImpactedRef.current = status.impacted;
        setMassStatus({ active: status.finished < total, impacted: status.impacted, total });
      }
      if (status.finished >= total && status.inbound === 0) {
        setMassStatus({ active: false, impacted: total, total });
        if (total === 1) drawBlast(1);
        animationFrameRef.current = null;
        return;
      }
      animationFrameRef.current = requestAnimationFrame(tick);
    };
    animationFrameRef.current = requestAnimationFrame(tick);
  }, [drawBlast, drawCloudProfile, drawMassScene, mapReady, selectedId, yieldMt, stopAnimation]);

  useEffect(() => {
    launchAtRef.current = launchAt;
  }, [launchAt]);

  const toggleArmageddon = () => {
    const enabled = !armageddonRef.current;
    armageddonRef.current = enabled;
    setArmageddon(enabled);
    rendererRef.current.invalidate();
    schedulePositionOverlays();
    if (enabled || massStrikesRef.current.length < 2) return;
    const retained = latestLaunchGroup(massStrikesRef.current);
    massStrikesRef.current = retained;
    multiGroundDistanceCache.clear();
    rendererRef.current.invalidate();
    const latest = retained[0];
    if (!latest) return;
    profileRef.current = latest.profile;
    radiiRef.current = latest.radii;
    yieldRef.current = latest.yieldMt;
    impactRef.current = latest.flightGroup.aim;
    setImpact(latest.flightGroup.aim);
    mirvTargetsRef.current = retained.length > 1 ? retained.map((strike) => strike.target) : [];
    setMirvActive(retained.length > 1);
    setHasNuclearStrike(retained.some((strike) => strike.nuclear));
    const elapsed = performance.now() - massStartTimeRef.current;
    const impacted = retained.filter((strike) => elapsed - strike.delayMs >= strike.flightMs).length;
    const active = retained.some((strike) => elapsed - strike.delayMs < strike.flightMs + strike.blastMs);
    massImpactedRef.current = impacted;
    setMassStatus({ active, impacted, total: retained.length });
    schedulePositionOverlays();
  };

  const selectScenario = (id: string) => {
    setScenarioId(id);
    const scenario = SCENARIOS.find((entry) => entry.id === id);
    if (!scenario) return;
    const map = mapRef.current;
    impactRef.current = scenario.point;
    setSelectedId(scenario.weaponId);
    setImpact(scenario.point);
    if (map) {
      const weapon = WEAPONS.find((entry) => entry.id === scenario.weaponId) ?? WEAPONS[0];
      const profile = weaponProfile(scenario.weaponId, weapon.yieldMt);
      const horizonKm = Math.min(MAX_SURFACE_DISTANCE_KM, radiiForYield(profile.warheadYieldMt).light * (profile.warheads > 1 ? 3 : 1.08));
      const container = map.getContainer();
      const usableWidth = container.clientWidth > 900 ? container.clientWidth - 380 : container.clientWidth;
      const targetPixels = Math.max(100, Math.min(usableWidth, container.clientHeight) * 0.34);
      const latitudeScale = Math.max(0.04, Math.cos((scenario.point.lat * Math.PI) / 180));
      const idealZoom = Math.log2((156543.03392 * latitudeScale * targetPixels) / (Math.max(0.001, horizonKm) * 1000));
      map.stop();
      map.easeTo({ center: [scenario.point.lng, scenario.point.lat], zoom: Math.max(0.75, Math.min(13, idealZoom)), duration: 650 });
    }
  };

  return (
    <main className={`model phase-${phase} mode-${mapMode} view-${effectView} ${massMode ? "mass-active" : ""} ${mirvActive ? "mirv-active" : ""} ${panelsHidden ? "panels-hidden" : ""}`}>
      <div ref={mapContainer} className="map" />
      <div className="map-tone" />
      <canvas ref={blastCanvasRef} className="blast-canvas" aria-hidden="true" />
      <canvas ref={fireballCanvasRef} className="fireball-canvas" aria-hidden="true" />
      <canvas ref={missileCanvasRef} className="missile-canvas" aria-hidden="true" />
      <div ref={detonationFlashRef} className={`detonation-flash ${phase === "detonating" && !massMode && selectedProfile.warheads === 1 ? "active" : ""}`} aria-hidden="true" />

      <div className="left-instrument-stack">
      <header className="minimal-header">
        <div className="brand-row">
          <div className="minimal-brand"><strong>Nuke Simulator</strong><span>Click Map to Launch</span></div>
          <div className="header-actions">
            <div className="map-mode" aria-label="Map lighting">
              <button type="button" className={mapMode === "night" ? "active night-toggle" : "night-toggle"} onClick={() => setMapMode(mapMode === "night" ? "day" : "night")} aria-label="Night mode" aria-pressed={mapMode === "night"}><Moon size={13} /> NIGHT</button>
            </div>
            <button type="button" className="panel-visibility" onClick={() => setPanelsHidden(true)} aria-label="Hide control and cloud panels"><EyeOff size={14} /> HIDE</button>
          </div>
        </div>
        <section className="panel-controls" aria-label="Explosion controls">
          <div className="selection-tabs" role="tablist" aria-label="Choose by scenario or device">
            <button type="button" role="tab" aria-selected={selectionTab === "scenario"} aria-controls="payload-selection-panel" id="scenario-tab" onClick={() => setSelectionTab("scenario")}>SCENARIO</button>
            <button type="button" role="tab" aria-selected={selectionTab === "device"} aria-controls="payload-selection-panel" id="device-tab" onClick={() => setSelectionTab("device")}>DEVICE</button>
          </div>
          <div className="payload-input" id="payload-selection-panel" role="tabpanel" aria-labelledby={selectionTab === "scenario" ? "scenario-tab" : "device-tab"}>
            <div className="select-wrap">
              <select value={selectionTab === "scenario" ? scenarioId : selectedId} onChange={(event) => {
                if (selectionTab === "scenario") selectScenario(event.target.value);
                else { setScenarioId(""); setSelectedId(event.target.value); }
              }} aria-label={selectionTab === "scenario" ? "Scenario" : "Weapon or delivery system"}>
                {selectionTab === "scenario" ? <>
                  <option value="">Choose a location + device</option>
              <optgroup label="Historical locations + real devices">
                {SCENARIOS.filter((scenario) => scenario.kind === "historical").map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.name}</option>)}
              </optgroup>
              <optgroup label="Hypothetical scale studies">
                {SCENARIOS.filter((scenario) => scenario.kind === "hypothetical").map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.name}</option>)}
              </optgroup>
                </> : <>
                <option value="custom">Custom yield…</option>
                <optgroup label="Conventional weapons">
                  {CONVENTIONAL_WEAPONS.map((weapon) => <option key={weapon.id} value={weapon.id}>{weapon.name} · {weapon.display}</option>)}
                </optgroup>
                <optgroup label="Nuclear devices">
                  {REAL_WEAPONS.map((weapon) => <option key={weapon.id} value={weapon.id}>{weapon.name} · {weapon.display}</option>)}
                </optgroup>
                <optgroup label="MIRV delivery systems">
                  {MIRV_WEAPONS.map((weapon) => <option key={weapon.id} value={weapon.id}>{weapon.name} · {weapon.display}</option>)}
                </optgroup>
                <optgroup label="Hypothetical scale studies">
                  {HYPOTHETICAL_WEAPONS.map((weapon) => <option key={weapon.id} value={weapon.id}>{weapon.name} · {weapon.display}</option>)}
                </optgroup>
                </>}
              </select>
              <ChevronDown size={14} />
            </div>
            {selectionTab === "device" && customMode && (
              <div className="custom-input"><input value={customYield} onChange={(event) => { setScenarioId(""); setCustomYield(event.target.value); }} inputMode="decimal" aria-label="Custom yield in megatons" /><span>MT</span></div>
            )}
          </div>
          <div className="launch-actions">
            <button type="button" className="clear-map" onClick={armVisual} disabled={!massStatus.total} aria-label="Reset map"><RotateCcw size={15} aria-hidden="true" /> RESET</button>
            <button type="button" className={armageddon ? "armageddon-toggle active" : "armageddon-toggle"} onClick={toggleArmageddon} aria-pressed={armageddon} aria-label={`Multi-Launch Mode ${armageddon ? "ON" : "OFF"}`}><Radiation size={15} aria-hidden="true" /> Multi-Launch Mode {armageddon ? "ON" : "OFF"} <Radiation size={15} aria-hidden="true" /></button>
          </div>
          <p className="launch-status" aria-live="polite">{armageddon ? "Multi-launch armed · strikes accumulate" : "Single launch · replaces previous strike"}{massStatus.total ? " · " + massStatus.impacted + "/" + massStatus.total + " impacts" : ""}</p>
        </section>
      </header>

      <section className="cloud-monitor" aria-label="Animated modeled mushroom-cloud height">
        <header className="cloud-monitor-header">
          <span><i aria-hidden="true" /> CLOUD PROFILE</span>
          <b ref={cloudHeightReadoutRef}>{phase === "complete" ? formatDistance(cloudModel(selectedProfile).targetHeightKm) : "—"}</b>
        </header>
        <canvas ref={cloudCanvasRef} className="cloud-profile-canvas" aria-hidden="true" />
        <footer className="cloud-monitor-footer">
          <span ref={cloudPhaseReadoutRef}>{selectedProfile.nuclear ? "MUSHROOM CLOUD" : "DETONATION PLUME"} · STANDBY</span>
          <small>{phase === "armed" || phase === "inbound"
            ? "HEIGHT REVEALS AT IGNITION"
            : selectedProfile.warheads > 1
              ? `PER WARHEAD · ${selectedProfile.warheads} RVs`
              : "HEIGHT ABOVE SURFACE"}</small>
        </footer>
      </section>
      </div>

      {panelsHidden && (
        <button type="button" className="panel-restore" onClick={() => setPanelsHidden(false)} aria-label="Show control and cloud panels">
          <Eye size={17} aria-hidden="true" /> SHOW CONTROLS
        </button>
      )}

      <div className="zone-marker-layer" aria-label="Blast-zone inspection markers">
        {zones.map((zone) => (
          <button
            type="button"
            key={zone.id}
            ref={(element) => { zoneMarkerRefs.current[zone.id] = element; }}
            className={`zone-marker ${pinnedZoneId === zone.id ? "pinned" : ""}`}
            style={{ "--zone-color": zone.color } as CSSProperties}
            aria-label={`${zone.label} destruction. ${zone.description} Zone radius ${formatDistance(zone.innerKm)} to ${formatDistance(zone.outerKm)}. Damage area ${formatArea(zone.areaKm2)}.`}
            aria-expanded={activeZone?.id === zone.id}
            aria-describedby={activeZone?.id === zone.id ? `zone-tooltip-${zone.id}` : undefined}
            onPointerEnter={() => setActiveZoneId(zone.id)}
            onPointerLeave={() => setActiveZoneId(pinnedZoneId)}
            onFocus={() => setActiveZoneId(zone.id)}
            onBlur={() => setActiveZoneId(pinnedZoneId)}
            onClick={(event) => {
              event.stopPropagation();
              const next = pinnedZoneId === zone.id ? null : zone.id;
              setPinnedZoneId(next);
              setActiveZoneId(next);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Escape") return;
              event.preventDefault();
              setPinnedZoneId(null);
              setActiveZoneId(null);
              event.currentTarget.blur();
            }}
          >
            <span className="zone-marker-core" aria-hidden="true" />
            {activeZone?.id === zone.id && (
              <span className="zone-tooltip" id={`zone-tooltip-${zone.id}`} role="tooltip">
                <span className="zone-tooltip-title"><i aria-hidden="true" />{zone.label} DESTRUCTION</span>
                <span className="zone-tooltip-copy">{zone.description}</span>
                <span className="zone-tooltip-stats">
                  <span><small>ZONE SPAN</small><b>{formatDistance(zone.innerKm)} – {formatDistance(zone.outerKm)}</b></span>
                  <span><small>DAMAGE AREA</small><b>{formatArea(zone.areaKm2)}</b></span>
                </span>
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="range-marker-layer" aria-label="Range inspection marker">
        {RANGE_EXPERIENCE_BANDS.map((band) => {
          const radius = effectView === "visible" ? ranges.visibleKm : ranges.audibleKm;
          const title = effectView === "visible" ? band.visibleTitle : band.audibleTitle;
          const copy = effectView === "visible" ? band.visibleCopy : band.audibleCopy;
          const experience = effectView === "visible" ? band.visibleLevel : band.audibleLevel;
          const markerColor = rangeMarkerColor(effectView === "audible" ? "audible" : "visible", rangeFieldIntensity((band.innerFactor + band.outerFactor) / 2));
          const active = activeRangeBand?.id === band.id;
          return (
            <button
              ref={(element) => { rangeMarkerRefs.current[band.id] = element; }}
              type="button"
              key={band.id}
              className={`zone-marker range-marker ${pinnedRangeBandId === band.id ? "pinned" : ""}`}
              style={{ "--zone-color": markerColor } as CSSProperties}
              aria-expanded={active}
              aria-label={`${title}. ${copy} Radius band ${formatDistance(radius * band.innerFactor)} to ${formatDistance(radius * band.outerFactor)}. ${experience}.`}
              onPointerEnter={() => setActiveRangeBandId(band.id)}
              onPointerLeave={() => setActiveRangeBandId(pinnedRangeBandId)}
              onFocus={() => setActiveRangeBandId(band.id)}
              onBlur={() => setActiveRangeBandId(pinnedRangeBandId)}
              onClick={(event) => {
                event.stopPropagation();
                const next = pinnedRangeBandId === band.id ? null : band.id;
                setPinnedRangeBandId(next);
                setActiveRangeBandId(next);
              }}
            >
              <span className="zone-marker-core" aria-hidden="true" />
              {active && (effectView === "audible" || effectView === "visible") && (
                <span className="zone-tooltip range-tooltip" role="tooltip">
                  <span className="zone-tooltip-title"><i aria-hidden="true" />{title}</span>
                  <span className="zone-tooltip-copy">{copy}</span>
                  <span className="zone-tooltip-stats">
                    <span><small>RADIUS BAND</small><b>{formatDistance(radius * band.innerFactor)} – {formatDistance(radius * band.outerFactor)}</b></span>
                    <span><small>{effectView === "visible" ? "WHAT YOU SEE" : "PEAK SOUND"}</small><b>{experience}</b></span>
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="fallout-marker-layer" aria-label="Fallout-field inspection markers">
        {falloutBands.map((zone) => (
          <button
            type="button"
            key={zone.id}
            ref={(element) => { falloutMarkerRefs.current[zone.id] = element; }}
            className={`zone-marker fallout-marker ${pinnedFalloutId === zone.id ? "pinned" : ""}`}
            style={{ "--zone-color": zone.color } as CSSProperties}
            aria-label={`${zone.label}. ${zone.range}. ${zone.dose}. ${zone.mortality}. ${zone.description} Downwind ruler span ${formatDistance(zone.innerKm)} to ${formatDistance(zone.outerKm)}. Modeled field area ${formatArea(zone.areaKm2)}.`}
            aria-expanded={activeFalloutZone?.id === zone.id}
            aria-describedby={activeFalloutZone?.id === zone.id ? `fallout-tooltip-${zone.id}` : undefined}
            onPointerEnter={() => setActiveFalloutId(zone.id)}
            onPointerLeave={() => setActiveFalloutId(pinnedFalloutId)}
            onFocus={() => setActiveFalloutId(zone.id)}
            onBlur={() => setActiveFalloutId(pinnedFalloutId)}
            onClick={(event) => {
              event.stopPropagation();
              const next = pinnedFalloutId === zone.id ? null : zone.id;
              setPinnedFalloutId(next);
              setActiveFalloutId(next);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Escape") return;
              event.preventDefault();
              setPinnedFalloutId(null);
              setActiveFalloutId(null);
              event.currentTarget.blur();
            }}
          >
            <span className="zone-marker-core" aria-hidden="true" />
            {activeFalloutZone?.id === zone.id && (
              <span className="zone-tooltip fallout-tooltip" id={`fallout-tooltip-${zone.id}`} role="tooltip">
                <span className="zone-tooltip-title"><i aria-hidden="true" />{zone.label}</span>
                <span className="zone-tooltip-copy">{zone.description}</span>
                <span className="zone-tooltip-stats fallout-risk-stats">
                  <span><small>24-HOUR DOSE BAND</small><b>{zone.dose}</b></span>
                  <span><small>UNTREATED OUTLOOK</small><b>{zone.mortality}</b></span>
                  <span><small>DOWNWIND SPAN</small><b>{formatDistance(zone.innerKm)} – {formatDistance(zone.outerKm)}</b></span>
                </span>
              </span>
            )}
          </button>
        ))}
      </div>

      {explosionPresentation(massStatus.total, armageddon).legends && (
        <aside className="multi-scale-legends" aria-label="Combined strike map and effect scales">
          <div className="distance-scale-legend">
            <span>MAP DISTANCE</span>
            <b ref={multiScaleTextRef}>—</b>
            <div ref={multiScaleBarRef} className="distance-scale-bar"><i /><i /></div>
          </div>
          <div className="effect-gradient-legend">
            <span>{effectView === "blast" ? "COMBINED DAMAGE" : effectView.toUpperCase()}</span>
            <div className="effect-gradient-scale">
              <div className="effect-gradient-track" aria-hidden="true" style={effectView === "audible" || effectView === "visible" ? { background: rangePaletteGradient(effectView) } : undefined}>
                {multiLegendItems.map((item) => <i key={item.label} />)}
              </div>
              {multiLegendItems.map((item, index) => (
                <button
                  type="button"
                  key={item.label}
                  className="multi-legend-marker"
                  style={{
                    left: `${(index + 0.5) * 25}%`,
                    "--legend-color": item.color,
                  } as CSSProperties}
                  data-tooltip-side={index < 2 ? "right" : "left"}
                  data-legend-index={index}
                  aria-label={`${item.title}. ${item.copy} ${item.metricLabel}: ${item.metric}.`}
                >
                  <span aria-hidden="true" />
                  <span className="multi-legend-tooltip" role="tooltip">
                    <span className="zone-tooltip-title"><i aria-hidden="true" />{item.title}</span>
                    <span className="zone-tooltip-copy">{item.copy}</span>
                    <span className="zone-tooltip-stats">
                      <span><small>{item.metricLabel}</small><b>{item.metric}</b></span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <div className="effect-gradient-labels">
              {multiLegendItems.map((item) => <small key={item.label}>{item.label}</small>)}
            </div>
          </div>
        </aside>
      )}

      {phase === "complete" && (
        <section className="effect-view-control" aria-label="Post-detonation view">
          <div className="effect-toggle" role="group" aria-label="Choose modeled effect view">
            <button type="button" className={effectView === "blast" ? "active" : ""} aria-pressed={effectView === "blast"} onClick={() => changeEffectView("blast")}>BLAST</button>
            {falloutAvailable && <button type="button" className={effectView === "fallout" ? "active" : ""} aria-pressed={effectView === "fallout"} onClick={() => changeEffectView("fallout")}><Radiation size={12} strokeWidth={2.3} aria-hidden="true" /> FALLOUT</button>}
            <button type="button" className={effectView === "audible" ? "active" : ""} aria-pressed={effectView === "audible"} onClick={() => changeEffectView("audible")}>AUDIBLE</button>
            <button type="button" className={effectView === "visible" ? "active" : ""} aria-pressed={effectView === "visible"} onClick={() => changeEffectView("visible")}>VISIBLE</button>
          </div>
        </section>
      )}

      <p className="sr-only" aria-live="polite">
        {massMode
          ? massStatus.active
            ? `${massStatus.impacted} of ${massStatus.total} launched warheads have impacted. ${armageddon ? "Additional clicks add strikes." : "The next click replaces this launch."}`
            : `${massStatus.total} warhead impacts remain. ${armageddon ? "Multi-launch is armed." : "Single launch mode."}`
          : phase === "inbound"
          ? "Missile inbound. Impact approaching."
          : phase === "detonating"
            ? "Detonation. Blast expansion begins."
            : phase === "complete"
              ? effectView === "fallout"
                ? `Fallout view selected. Surface-burst 24-hour screening bands follow a climatological ${windModel.band.toLowerCase()} proxy toward ${windModel.direction}.`
                : effectView === "audible"
                  ? `Audible view selected. Standard-atmosphere outdoor estimate ${formatDistance(ranges.audibleKm)}.`
                  : effectView === "visible"
                    ? `Visible view selected. Direct-fireball line-of-sight horizon ${formatDistance(ranges.visibleKm)}.`
                    : "Blast animation complete. Destruction-zone markers are now available along the radius ruler."
              : ""}
      </p>
      <p className="illustrative-note">{effectView === "fallout"
        ? "Surface-burst H+24 screening envelope · climatological wind proxy · not live meteorology"
        : effectView === "visible"
          ? "Direct-fireball horizon · 1.7 m observer · clear air; cloud glow may carry farther"
          : effectView === "audible"
            ? "Outdoor low-frequency estimate · standard atmosphere; weather and terrain can dominate"
            : "Idealized radial scaling · hypothetical extremes are illustrative"}</p>
    </main>
  );
}
