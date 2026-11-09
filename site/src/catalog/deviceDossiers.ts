import type { DeviceDossier } from "./previewTypes";

/** Public exterior/history facts for all fixed catalog IDs; values include units and per-field source URLs. */
export const DEVICE_DOSSIERS: Readonly<Record<string, DeviceDossier>> = {
  "mk-82": {
    "id": "mk-82",
    "entityLabel": "Mk 82 low-drag bomb / Tritonal configuration",
    "length": {
      "value": "2.29 m",
      "confidence": "sourced",
      "sources": [
        "https://www.af.mil/Portals/1/documents/airman_archive/The%20Book%202009.pdf"
      ]
    },
    "totalMass": {
      "value": "241 kg",
      "confidence": "sourced",
      "sources": [
        "https://studylib.net/doc/25992101/weapons-file-2003-2004"
      ]
    },
    "payloadMass": {
      "value": "87.1 kg Tritonal fill",
      "confidence": "sourced",
      "sources": [
        "https://www.govinfo.gov/content/pkg/FR-2018-02-08/pdf/2018-02511.pdf"
      ]
    },
    "created": {
      "value": "1950s — design family",
      "confidence": "estimated",
      "sources": [
        "https://www.rheinmetall.com/en/products/weapons-and-ammunition/aircraft-bombs"
      ]
    },
    "retired": {
      "value": "No retirement recorded; catalog remains in current Army inventory",
      "confidence": "sourced",
      "sources": [
        "https://www.cpeae.army.mil/Project-Offices/PM-CCS/Organizations/PL-Joint-Ammunition-and-Weapon-Systems/Bombs/"
      ]
    },
    "country": {
      "value": "United States",
      "confidence": "sourced",
      "sources": [
        "https://www.af.mil/Portals/1/documents/airman_archive/The%20Book%202009.pdf",
        "https://studylib.net/doc/25992101/weapons-file-2003-2004",
        "https://www.cpeae.army.mil/Project-Offices/PM-CCS/Organizations/PL-Joint-Ammunition-and-Weapon-Systems/Bombs/"
      ]
    },
    "silhouette": {
      "src": "/media/devices/mk-82.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://www.af.mil/Portals/1/documents/airman_archive/The%20Book%202009.pdf",
        "https://studylib.net/doc/25992101/weapons-file-2003-2004",
        "https://www.cpeae.army.mil/Project-Offices/PM-CCS/Organizations/PL-Joint-Ammunition-and-Weapon-Systems/Bombs/"
      ]
    },
    "notes": "Low-drag tail configuration. Published lengths vary with fuze and tail; 7 ft 6.2 in is the USAF overall value. Family introduction is approximate; the modeled 93 kg TNT equivalent is not gross mass."
  },
  "agm-158-jassm": {
    "id": "agm-158-jassm",
    "entityLabel": "AGM-158A JASSM complete missile",
    "length": {
      "value": "4.26 m",
      "confidence": "sourced",
      "sources": [
        "https://www.lockheedmartin.com/content/dam/lockheed-martin/mfc/pc/jassm/22-14207-ADSW_JASSM_Product%20Card%20Updates.pdf"
      ]
    },
    "totalMass": {
      "value": "1,023 kg",
      "confidence": "sourced",
      "sources": [
        "https://missilethreat.csis.org/missile/jassm/"
      ]
    },
    "payloadMass": {
      "value": "450 kg warhead; 108.9 kg Tritonal fill",
      "confidence": "sourced",
      "sources": [
        "https://missilethreat.csis.org/missile/jassm/",
        "https://www.govinfo.gov/content/pkg/FR-2018-02-08/pdf/2018-02511.pdf"
      ]
    },
    "created": {
      "value": "2003 — initial service",
      "confidence": "sourced",
      "sources": [
        "https://missilethreat.csis.org/missile/jassm/"
      ]
    },
    "retired": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://www.lockheedmartin.com/content/dam/lockheed-martin/mfc/pc/jassm/22-14207-ADSW_JASSM_Product%20Card%20Updates.pdf"
      ]
    },
    "country": {
      "value": "United States",
      "confidence": "sourced",
      "sources": [
        "https://www.lockheedmartin.com/content/dam/lockheed-martin/mfc/pc/jassm/22-14207-ADSW_JASSM_Product%20Card%20Updates.pdf",
        "https://missilethreat.csis.org/missile/jassm/"
      ]
    },
    "silhouette": {
      "src": "/media/devices/agm-158-jassm.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://www.lockheedmartin.com/content/dam/lockheed-martin/mfc/pc/jassm/22-14207-ADSW_JASSM_Product%20Card%20Updates.pdf",
        "https://missilethreat.csis.org/missile/jassm/"
      ]
    },
    "notes": "Baseline AGM-158A, not the extended-range variant. Side outline shows the deployed wing silhouette; wing span is not body diameter. Retirement date is not established in the reviewed manufacturer record."
  },
  "gbu-49": {
    "id": "gbu-49",
    "entityLabel": "GBU-49 Enhanced Paveway II complete guided bomb",
    "length": {
      "value": "3.29 m",
      "confidence": "sourced",
      "sources": [
        "https://www.airandspaceforces.com/weapons/gbu-10-12-49-paveway-ii/"
      ]
    },
    "totalMass": {
      "value": "275 kg complete bomb",
      "confidence": "estimated",
      "sources": [
        "https://studylib.net/doc/25992101/weapons-file-2003-2004"
      ]
    },
    "payloadMass": {
      "value": "136.1 kg listed explosive load",
      "confidence": "sourced",
      "sources": [
        "https://www.govinfo.gov/content/pkg/FR-2018-02-08/pdf/2018-02511.pdf"
      ]
    },
    "created": {
      "value": "2000s — Enhanced Paveway II introduction",
      "confidence": "estimated",
      "sources": [
        "https://www.fmn.dk/globalassets/fmn/dokumenter/forlig/-2008-forsvarskommissionens-beretning-inkl-bilag-.pdf"
      ]
    },
    "retired": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://www.airandspaceforces.com/weapons/gbu-10-12-49-paveway-ii/"
      ]
    },
    "country": {
      "value": "United States",
      "confidence": "sourced",
      "sources": [
        "https://www.airandspaceforces.com/weapons/gbu-10-12-49-paveway-ii/",
        "https://www.govinfo.gov/content/pkg/FR-2018-02-08/pdf/2018-02511.pdf"
      ]
    },
    "silhouette": {
      "src": "/media/devices/gbu-49.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://www.airandspaceforces.com/weapons/gbu-10-12-49-paveway-ii/",
        "https://www.govinfo.gov/content/pkg/FR-2018-02-08/pdf/2018-02511.pdf"
      ]
    },
    "notes": "10.8 ft converted to meters. Complete mass is an estimate using the 500 lb body plus a Paveway II guidance/tail-kit allowance; kit, fuze and body vary. It is not the bare-body weight. Explosive load is the Federal Register configuration underlying the existing 146 kg TNT-equivalent estimate."
  },
  "mk-83": {
    "id": "mk-83",
    "entityLabel": "Mk 83 low-drag bomb / Tritonal configuration",
    "length": {
      "value": "3.00 m",
      "confidence": "sourced",
      "sources": [
        "https://studylib.net/doc/25992101/weapons-file-2003-2004"
      ]
    },
    "totalMass": {
      "value": "454 kg class",
      "confidence": "sourced",
      "sources": [
        "https://www.cpeae.army.mil/Project-Offices/PM-CCS/Organizations/PL-Joint-Ammunition-and-Weapon-Systems/Bombs/"
      ]
    },
    "payloadMass": {
      "value": "201.8 kg Tritonal fill",
      "confidence": "sourced",
      "sources": [
        "https://studylib.net/doc/25992101/weapons-file-2003-2004"
      ]
    },
    "created": {
      "value": "1950s — design family",
      "confidence": "estimated",
      "sources": [
        "https://www.rheinmetall.com/en/products/weapons-and-ammunition/aircraft-bombs"
      ]
    },
    "retired": {
      "value": "No retirement recorded; current Army inventory",
      "confidence": "sourced",
      "sources": [
        "https://www.cpeae.army.mil/Project-Offices/PM-CCS/Organizations/PL-Joint-Ammunition-and-Weapon-Systems/Bombs/"
      ]
    },
    "country": {
      "value": "United States",
      "confidence": "sourced",
      "sources": [
        "https://studylib.net/doc/25992101/weapons-file-2003-2004",
        "https://www.cpeae.army.mil/Project-Offices/PM-CCS/Organizations/PL-Joint-Ammunition-and-Weapon-Systems/Bombs/"
      ]
    },
    "silhouette": {
      "src": "/media/devices/mk-83.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://studylib.net/doc/25992101/weapons-file-2003-2004",
        "https://www.cpeae.army.mil/Project-Offices/PM-CCS/Organizations/PL-Joint-Ammunition-and-Weapon-Systems/Bombs/"
      ]
    },
    "notes": "Nominal 1,000 lb weight class; exact total mass and length vary with fuze and tail. 445 lb fill converted using 0.45359237 kg/lb. No exact variant creation date established."
  },
  "mk-84": {
    "id": "mk-84",
    "entityLabel": "Mk 84 low-drag bomb / Tritonal configuration",
    "length": {
      "value": "3.78 m",
      "confidence": "sourced",
      "sources": [
        "https://www.af.mil/Portals/1/documents/airman_archive/The%20Book%202009.pdf"
      ]
    },
    "totalMass": {
      "value": "907 kg class",
      "confidence": "sourced",
      "sources": [
        "https://www.cpeae.army.mil/Project-Offices/PM-CCS/Organizations/PL-Joint-Ammunition-and-Weapon-Systems/Bombs/"
      ]
    },
    "payloadMass": {
      "value": "428.6 kg Tritonal fill",
      "confidence": "sourced",
      "sources": [
        "https://www.govinfo.gov/content/pkg/FR-2018-02-08/pdf/2018-02511.pdf"
      ]
    },
    "created": {
      "value": "1950s — design family",
      "confidence": "estimated",
      "sources": [
        "https://www.rheinmetall.com/en/products/weapons-and-ammunition/aircraft-bombs"
      ]
    },
    "retired": {
      "value": "No retirement recorded; current Army inventory",
      "confidence": "sourced",
      "sources": [
        "https://www.cpeae.army.mil/Project-Offices/PM-CCS/Organizations/PL-Joint-Ammunition-and-Weapon-Systems/Bombs/"
      ]
    },
    "country": {
      "value": "United States",
      "confidence": "sourced",
      "sources": [
        "https://www.af.mil/Portals/1/documents/airman_archive/The%20Book%202009.pdf",
        "https://www.cpeae.army.mil/Project-Offices/PM-CCS/Organizations/PL-Joint-Ammunition-and-Weapon-Systems/Bombs/"
      ]
    },
    "silhouette": {
      "src": "/media/devices/mk-84.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://www.af.mil/Portals/1/documents/airman_archive/The%20Book%202009.pdf",
        "https://www.cpeae.army.mil/Project-Offices/PM-CCS/Organizations/PL-Joint-Ammunition-and-Weapon-Systems/Bombs/"
      ]
    },
    "notes": "12 ft 5 in overall USAF length. Nominal 2,000 lb class is not explosive weight. The modeled 459 kg TNT equivalent is a peak-pressure screening estimate, not the 907 kg gross class."
  },
  "moab": {
    "id": "moab",
    "entityLabel": "GBU-43/B MOAB complete bomb",
    "length": {
      "value": "9.14 m",
      "confidence": "sourced",
      "sources": [
        "https://afarmamentmuseum.com/artifact/gbu43/"
      ]
    },
    "totalMass": {
      "value": "9,798 kg",
      "confidence": "sourced",
      "sources": [
        "https://afarmamentmuseum.com/artifact/gbu43/"
      ]
    },
    "payloadMass": {
      "value": "8,482 kg H6 fill",
      "confidence": "sourced",
      "sources": [
        "https://afarmamentmuseum.com/artifact/gbu43/"
      ]
    },
    "created": {
      "value": "2003-03-11 — first live test",
      "confidence": "sourced",
      "sources": [
        "https://afarmamentmuseum.com/artifact/gbu43/"
      ]
    },
    "retired": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://afarmamentmuseum.com/artifact/gbu43/"
      ]
    },
    "country": {
      "value": "United States",
      "confidence": "sourced",
      "sources": [
        "https://afarmamentmuseum.com/artifact/gbu43/"
      ]
    },
    "silhouette": {
      "src": "/media/devices/moab.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://afarmamentmuseum.com/artifact/gbu43/"
      ]
    },
    "notes": "Museum gives 30 ft, 21,600 lb gross and 18,700 lb fill. Converted and rounded to nearest kilogram; other public records give 21,000–21,700 lb. Existing 11 t TNT yield is preserved."
  },
  "foab": {
    "id": "foab",
    "entityLabel": "FOAB reported test munition",
    "length": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://www.guinnessworldrecords.com/world-records/77533-largest-non-nuclear-conventional-weapon-in-existence"
      ]
    },
    "totalMass": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://www.guinnessworldrecords.com/world-records/77533-largest-non-nuclear-conventional-weapon-in-existence"
      ]
    },
    "payloadMass": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://www.guinnessworldrecords.com/world-records/77533-largest-non-nuclear-conventional-weapon-in-existence"
      ]
    },
    "created": {
      "value": "2007-09-11 — reported test",
      "confidence": "sourced",
      "sources": [
        "https://www.guinnessworldrecords.com/world-records/77533-largest-non-nuclear-conventional-weapon-in-existence"
      ]
    },
    "retired": {
      "value": "Operational / retirement status unconfirmed",
      "confidence": "unknown",
      "sources": [
        "https://www.guinnessworldrecords.com/world-records/77533-largest-non-nuclear-conventional-weapon-in-existence"
      ]
    },
    "country": {
      "value": "Russia",
      "confidence": "reported",
      "sources": [
        "https://www.guinnessworldrecords.com/world-records/77533-largest-non-nuclear-conventional-weapon-in-existence"
      ]
    },
    "silhouette": {
      "src": "/media/devices/foab.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://www.guinnessworldrecords.com/world-records/77533-largest-non-nuclear-conventional-weapon-in-existence"
      ]
    },
    "notes": "The reported 44 t yield is a Russian claim, not independently verified here. No defensible public dimensions or all-up mass were found. Outline is a documentary-style external envelope only; it has no calibrated physical scale."
  },
  "w54": {
    "id": "w54",
    "entityLabel": "W54 / Mk 54 Davy Crockett warhead body",
    "length": {
      "value": "0.447 m",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "totalMass": {
      "value": "23–25 kg",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "payloadMass": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "created": {
      "value": "1961 — production",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "retired": {
      "value": "1971 — last Davy Crockett variants",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "country": {
      "value": "United States",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "silhouette": {
      "src": "/media/devices/w54.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "notes": "Bare warhead dimensions: 17.6 × 10.75 in and 50–55 lb. The M388 projectile, recoilless launcher and SADM package are different objects and are not included in this outline."
  },
  "w48": {
    "id": "w48",
    "entityLabel": "W48 155 mm artillery projectile",
    "length": {
      "value": "0.846 m",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "totalMass": {
      "value": "54–58 kg",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "payloadMass": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "created": {
      "value": "1963 — production",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "retired": {
      "value": "1992 — final variant retirement",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "country": {
      "value": "United States",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "silhouette": {
      "src": "/media/devices/w48.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "notes": "33.3 in projectile length; 118–128 lb range covers Mods 0/1. Fuze configuration changes external details. The catalog retains its original 72 t modeled yield."
  },
  "sadm": {
    "id": "sadm",
    "entityLabel": "Mk 54 SADM complete demolition package",
    "length": {
      "value": "0.610 m",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "totalMass": {
      "value": "68 kg complete",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "payloadMass": {
      "value": "27 kg warhead body",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "created": {
      "value": "1964 — production",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "retired": {
      "value": "1989 — final retirement",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "country": {
      "value": "United States",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "silhouette": {
      "src": "/media/devices/sadm.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "notes": "Complete package envelope is 24 × 16 in and 150 lb; the approximately 59 lb warhead is separately identified. The carrying harness and operator are not part of the mass."
  },
  "little-boy": {
    "id": "little-boy",
    "entityLabel": "Little Boy complete combat bomb",
    "length": {
      "value": "3.05 m",
      "confidence": "sourced",
      "sources": [
        "https://prologue.blogs.archives.gov/2020/08/06/little-boy-the-first-atomic-bomb/"
      ]
    },
    "totalMass": {
      "value": "4,400 kg",
      "confidence": "sourced",
      "sources": [
        "https://prologue.blogs.archives.gov/2020/08/06/little-boy-the-first-atomic-bomb/"
      ]
    },
    "payloadMass": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://prologue.blogs.archives.gov/2020/08/06/little-boy-the-first-atomic-bomb/",
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "created": {
      "value": "1945-08-06 — combat use",
      "confidence": "sourced",
      "sources": [
        "https://prologue.blogs.archives.gov/2020/08/06/little-boy-the-first-atomic-bomb/"
      ]
    },
    "retired": {
      "value": "1950 — Mark I family retirement",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "country": {
      "value": "United States",
      "confidence": "sourced",
      "sources": [
        "https://prologue.blogs.archives.gov/2020/08/06/little-boy-the-first-atomic-bomb/",
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "silhouette": {
      "src": "/media/devices/little-boy.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://prologue.blogs.archives.gov/2020/08/06/little-boy-the-first-atomic-bomb/",
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "notes": "National Archives gives 10 ft, 28 in and 9,700 lb for the Hiroshima assembly. Some generic Mark I tables list 8,900 lb; this preview uses the specifically identified combat assembly. No fissile-material mass is presented as explosive yield."
  },
  "trinity-gadget": {
    "id": "trinity-gadget",
    "entityLabel": "Trinity Gadget experimental assembly",
    "length": {
      "value": "1.5 m across assembly",
      "confidence": "estimated",
      "sources": [
        "https://home.nps.gov/articles/000/the-gadget.htm"
      ]
    },
    "totalMass": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://home.nps.gov/articles/000/the-gadget.htm",
        "https://www.energy.gov/lm/trinity-site-worlds-first-nuclear-explosion"
      ]
    },
    "payloadMass": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://home.nps.gov/articles/000/the-gadget.htm",
        "https://www.energy.gov/lm/trinity-site-worlds-first-nuclear-explosion"
      ]
    },
    "created": {
      "value": "1945-07-16 — test",
      "confidence": "sourced",
      "sources": [
        "https://www.energy.gov/lm/trinity-site-worlds-first-nuclear-explosion"
      ]
    },
    "retired": {
      "value": "Not applicable — one-off test",
      "confidence": "inapplicable",
      "sources": [
        "https://www.energy.gov/lm/trinity-site-worlds-first-nuclear-explosion"
      ]
    },
    "country": {
      "value": "United States",
      "confidence": "sourced",
      "sources": [
        "https://home.nps.gov/articles/000/the-gadget.htm",
        "https://www.energy.gov/lm/trinity-site-worlds-first-nuclear-explosion"
      ]
    },
    "silhouette": {
      "src": "/media/devices/trinity-gadget.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://home.nps.gov/articles/000/the-gadget.htm",
        "https://www.energy.gov/lm/trinity-site-worlds-first-nuclear-explosion"
      ]
    },
    "notes": "Approximate visible assembly diameter inferred from the NPS photograph with Norris Bradbury for scale; cables and support cradle extend outside it. No defensible complete test-assembly mass established. This is not the later Fat Man casing."
  },
  "fat-man": {
    "id": "fat-man",
    "entityLabel": "Fat Man complete combat bomb",
    "length": {
      "value": "3.25 m",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "totalMass": {
      "value": "4,672 kg",
      "confidence": "sourced",
      "sources": [
        "https://wsmrmuseum.com/2024/01/31/special-mission-16-fat-man-and-the-atomic-bombing-of-nagasaki/amp/"
      ]
    },
    "payloadMass": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://afarmamentmuseum.com/artifact/fatman/",
        "https://wsmrmuseum.com/2024/01/31/special-mission-16-fat-man-and-the-atomic-bombing-of-nagasaki/amp/",
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "created": {
      "value": "1945-08-09 — combat use",
      "confidence": "sourced",
      "sources": [
        "https://wsmrmuseum.com/2024/01/31/special-mission-16-fat-man-and-the-atomic-bombing-of-nagasaki/amp/"
      ]
    },
    "retired": {
      "value": "1950 — Mark III family retirement",
      "confidence": "sourced",
      "sources": [
        "https://afarmamentmuseum.com/artifact/fatman/"
      ]
    },
    "country": {
      "value": "United States",
      "confidence": "sourced",
      "sources": [
        "https://afarmamentmuseum.com/artifact/fatman/",
        "https://wsmrmuseum.com/2024/01/31/special-mission-16-fat-man-and-the-atomic-bombing-of-nagasaki/amp/",
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "silhouette": {
      "src": "/media/devices/fat-man.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://afarmamentmuseum.com/artifact/fatman/",
        "https://wsmrmuseum.com/2024/01/31/special-mission-16-fat-man-and-the-atomic-bombing-of-nagasaki/amp/",
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "notes": "Uses the 128 in Model 1561 external envelope, with the distinctive box tail. Some broad histories give 12 ft; the specific external-casing catalog dimension is used. Mass is 10,300 lb."
  },
  "rds-1": {
    "id": "rds-1",
    "entityLabel": "RDS-1 full bomb casing",
    "length": {
      "value": "3.70 m",
      "confidence": "sourced",
      "sources": [
        "https://www.vniief.ru/vniief/nuclear-center/museum/museum-of-nuclear-weapons/"
      ]
    },
    "totalMass": {
      "value": "4,600 kg",
      "confidence": "sourced",
      "sources": [
        "https://www.vniief.ru/vniief/nuclear-center/museum/museum-of-nuclear-weapons/"
      ]
    },
    "payloadMass": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://www.vniief.ru/vniief/nuclear-center/museum/museum-of-nuclear-weapons/",
        "https://elib.biblioatom.ru/text/muzey-yadernogo-oruzhiya-rfyats-vniief_2018/0000/02/",
        "https://www.nuclearweaponarchive.org/~nuclearw/Russia/Sovwpnprog.html"
      ]
    },
    "created": {
      "value": "1949-08-29 — first test",
      "confidence": "sourced",
      "sources": [
        "https://www.gov.kz/org/mfa/documents/details/512773?lang=en"
      ]
    },
    "retired": {
      "value": "1950s — family withdrawal",
      "confidence": "estimated",
      "sources": [
        "https://www.nuclearweaponarchive.org/~nuclearw/Russia/Sovwpnprog.html"
      ]
    },
    "country": {
      "value": "Soviet Union",
      "confidence": "sourced",
      "sources": [
        "https://www.vniief.ru/vniief/nuclear-center/museum/museum-of-nuclear-weapons/",
        "https://elib.biblioatom.ru/text/muzey-yadernogo-oruzhiya-rfyats-vniief_2018/0000/02/",
        "https://www.nuclearweaponarchive.org/~nuclearw/Russia/Sovwpnprog.html"
      ]
    },
    "silhouette": {
      "src": "/media/devices/rds-1.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://www.vniief.ru/vniief/nuclear-center/museum/museum-of-nuclear-weapons/",
        "https://elib.biblioatom.ru/text/muzey-yadernogo-oruzhiya-rfyats-vniief_2018/0000/02/",
        "https://www.nuclearweaponarchive.org/~nuclearw/Russia/Sovwpnprog.html"
      ]
    },
    "notes": "Museum explicitly gives 3.7 m × 1.5 m and 4.6 t. Test was on a tower; the outline depicts the museum bomb casing rather than the tower. Exact final family retirement date was not established."
  },
  "b61": {
    "id": "b61",
    "entityLabel": "B61-12 complete gravity bomb",
    "length": {
      "value": "3.56 m",
      "confidence": "sourced",
      "sources": [
        "https://www.airandspaceforces.com/weapons/b61/"
      ]
    },
    "totalMass": {
      "value": "374 kg",
      "confidence": "sourced",
      "sources": [
        "https://www.airandspaceforces.com/weapons/b61/"
      ]
    },
    "payloadMass": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://www.afnwc.af.mil/Weapon-Systems/B61-Gravity-Bomb/",
        "https://www.airandspaceforces.com/weapons/b61/",
        "https://www.energy.gov/nnsa/articles/nnsa-completes-b61-12-life-extension-program"
      ]
    },
    "created": {
      "value": "2021 — first production unit",
      "confidence": "sourced",
      "sources": [
        "https://www.energy.gov/nnsa/articles/nnsa-completes-b61-12-life-extension-program"
      ]
    },
    "retired": {
      "value": "In service; retirement date not announced",
      "confidence": "sourced",
      "sources": [
        "https://www.energy.gov/documents/doe-fy-2027-volume-1-nnsa-overview"
      ]
    },
    "country": {
      "value": "United States",
      "confidence": "sourced",
      "sources": [
        "https://www.afnwc.af.mil/Weapon-Systems/B61-Gravity-Bomb/",
        "https://www.airandspaceforces.com/weapons/b61/",
        "https://www.energy.gov/nnsa/articles/nnsa-completes-b61-12-life-extension-program"
      ]
    },
    "silhouette": {
      "src": "/media/devices/b61.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://www.afnwc.af.mil/Weapon-Systems/B61-Gravity-Bomb/",
        "https://www.airandspaceforces.com/weapons/b61/",
        "https://www.energy.gov/nnsa/articles/nnsa-completes-b61-12-life-extension-program"
      ]
    },
    "notes": "B61-12-specific 825 lb mass; legacy B61 family masses are lower. New tail guidance shape is shown. Completion of production in December 2024 does not mean retirement."
  },
  "gerboise-bleue": {
    "id": "gerboise-bleue",
    "entityLabel": "Gerboise Bleue tower-test assembly",
    "length": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://www.assemblee-nationale.fr/rap-oecst/essais_nucleaires/i3571.asp",
        "https://www.cea.fr/multimedia/Documents/publications/ouvrages/LIVRE-Les-essais-nucleaires-en-Polynesie-francaise.pdf"
      ]
    },
    "totalMass": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://www.assemblee-nationale.fr/rap-oecst/essais_nucleaires/i3571.asp",
        "https://www.cea.fr/multimedia/Documents/publications/ouvrages/LIVRE-Les-essais-nucleaires-en-Polynesie-francaise.pdf"
      ]
    },
    "payloadMass": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://www.assemblee-nationale.fr/rap-oecst/essais_nucleaires/i3571.asp",
        "https://www.cea.fr/multimedia/Documents/publications/ouvrages/LIVRE-Les-essais-nucleaires-en-Polynesie-francaise.pdf"
      ]
    },
    "created": {
      "value": "1960-02-13 — test",
      "confidence": "sourced",
      "sources": [
        "https://www.assemblee-nationale.fr/rap-oecst/essais_nucleaires/i3571.asp"
      ]
    },
    "retired": {
      "value": "Not applicable — one-off test",
      "confidence": "inapplicable",
      "sources": [
        "https://www.assemblee-nationale.fr/rap-oecst/essais_nucleaires/i3571.asp"
      ]
    },
    "country": {
      "value": "France",
      "confidence": "sourced",
      "sources": [
        "https://www.assemblee-nationale.fr/rap-oecst/essais_nucleaires/i3571.asp",
        "https://www.cea.fr/multimedia/Documents/publications/ouvrages/LIVRE-Les-essais-nucleaires-en-Polynesie-francaise.pdf"
      ]
    },
    "silhouette": {
      "src": "/media/devices/gerboise-bleue.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://www.assemblee-nationale.fr/rap-oecst/essais_nucleaires/i3571.asp",
        "https://www.cea.fr/multimedia/Documents/publications/ouvrages/LIVRE-Les-essais-nucleaires-en-Polynesie-francaise.pdf"
      ]
    },
    "notes": "Public parliamentary/CEA histories establish the event but do not establish a complete external package dimension or mass. The estimated outline depicts a tower-test enclosure, not an invented operational bomb; physical scale is unavailable."
  },
  "w76": {
    "id": "w76",
    "entityLabel": "W76-1 / Mk 4A exterior assembly",
    "length": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/W76.html",
        "https://www.pantex.doe.gov/news/press-releases/nnsa-achieves-50-percent-production-w76-1-units",
        "https://www.energy.gov/documents/doe-fy-2027-volume-1-nnsa-overview"
      ]
    },
    "totalMass": {
      "value": "164 kg — W76 family public estimate",
      "confidence": "estimated",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/W76.html"
      ]
    },
    "payloadMass": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/W76.html",
        "https://www.pantex.doe.gov/news/press-releases/nnsa-achieves-50-percent-production-w76-1-units",
        "https://www.energy.gov/documents/doe-fy-2027-volume-1-nnsa-overview"
      ]
    },
    "created": {
      "value": "2008-09 — first W76-1 unit",
      "confidence": "sourced",
      "sources": [
        "https://www.pantex.doe.gov/news/press-releases/nnsa-achieves-50-percent-production-w76-1-units"
      ]
    },
    "retired": {
      "value": "Stockpile program; no retirement announced",
      "confidence": "sourced",
      "sources": [
        "https://www.energy.gov/documents/doe-fy-2027-volume-1-nnsa-overview"
      ]
    },
    "country": {
      "value": "United States",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/W76.html",
        "https://www.pantex.doe.gov/news/press-releases/nnsa-achieves-50-percent-production-w76-1-units",
        "https://www.energy.gov/documents/doe-fy-2027-volume-1-nnsa-overview"
      ]
    },
    "silhouette": {
      "src": "/media/devices/w76.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/W76.html",
        "https://www.pantex.doe.gov/news/press-releases/nnsa-achieves-50-percent-production-w76-1-units",
        "https://www.energy.gov/documents/doe-fy-2027-volume-1-nnsa-overview"
      ]
    },
    "notes": "Public W76 sources do not establish length or diameter; the drawn Mk 4A reentry envelope is approximate and unscaled. Family mass is not a certified W76-1 complete reentry-vehicle mass. No hidden component dimensions are implied."
  },
  "sedan": {
    "id": "sedan",
    "entityLabel": "Sedan underground test device",
    "length": {
      "value": "0.965 m",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Tests/Storax.html"
      ]
    },
    "totalMass": {
      "value": "212 kg",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Tests/Storax.html"
      ]
    },
    "payloadMass": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Tests/Storax.html",
        "https://nnss.gov/wp-content/uploads/2023/04/NNSS-SEDN-U-0047-Rev01-1.pdf"
      ]
    },
    "created": {
      "value": "1962-07-06 — test",
      "confidence": "sourced",
      "sources": [
        "https://nnss.gov/wp-content/uploads/2023/04/NNSS-SEDN-U-0047-Rev01-1.pdf"
      ]
    },
    "retired": {
      "value": "Not applicable — one-off test",
      "confidence": "inapplicable",
      "sources": [
        "https://nnss.gov/wp-content/uploads/2023/04/NNSS-SEDN-U-0047-Rev01-1.pdf"
      ]
    },
    "country": {
      "value": "United States",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Tests/Storax.html",
        "https://nnss.gov/wp-content/uploads/2023/04/NNSS-SEDN-U-0047-Rev01-1.pdf"
      ]
    },
    "silhouette": {
      "src": "/media/devices/sedan.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Tests/Storax.html",
        "https://nnss.gov/wp-content/uploads/2023/04/NNSS-SEDN-U-0047-Rev01-1.pdf"
      ]
    },
    "notes": "38 in × 17.1 in, 467.9 lb test device. Cylinder is the underground emplacement package, not an air-delivered bomb. The test was buried approximately 194 m; the map remains the existing illustrative surface model."
  },
  "w80": {
    "id": "w80",
    "entityLabel": "W80-1 cruise-missile warhead",
    "length": {
      "value": "0.798 m",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/W80.html",
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html",
        "https://www.energy.gov/documents/doe-fy-2027-volume-1-nnsa-overview"
      ]
    },
    "totalMass": {
      "value": "132 kg",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/W80.html",
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html",
        "https://www.energy.gov/documents/doe-fy-2027-volume-1-nnsa-overview"
      ]
    },
    "payloadMass": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/W80.html",
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html",
        "https://www.energy.gov/documents/doe-fy-2027-volume-1-nnsa-overview"
      ]
    },
    "created": {
      "value": "1981 — first production",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/W80.html",
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html",
        "https://www.energy.gov/documents/doe-fy-2027-volume-1-nnsa-overview"
      ]
    },
    "retired": {
      "value": "Stockpile program; no retirement announced",
      "confidence": "sourced",
      "sources": [
        "https://www.energy.gov/documents/doe-fy-2027-volume-1-nnsa-overview"
      ]
    },
    "country": {
      "value": "United States",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/W80.html",
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html",
        "https://www.energy.gov/documents/doe-fy-2027-volume-1-nnsa-overview"
      ]
    },
    "silhouette": {
      "src": "/media/devices/w80.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/W80.html",
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html",
        "https://www.energy.gov/documents/doe-fy-2027-volume-1-nnsa-overview"
      ]
    },
    "notes": "Public bare-warhead envelope: 31.4 × 11.8 in, 290 lb. It is not the complete AGM-86 or Tomahawk missile. The catalog generic W80 choice is documented here using the W80-1 variant."
  },
  "greenhouse-george": {
    "id": "greenhouse-george",
    "entityLabel": "Greenhouse George experimental assembly",
    "length": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://www.deepspace.ucsb.edu/wp-content/uploads/2025/08/SA2VOLII.pdf"
      ]
    },
    "totalMass": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://www.deepspace.ucsb.edu/wp-content/uploads/2025/08/SA2VOLII.pdf"
      ]
    },
    "payloadMass": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://www.deepspace.ucsb.edu/wp-content/uploads/2025/08/SA2VOLII.pdf"
      ]
    },
    "created": {
      "value": "1951-05-08 — test",
      "confidence": "sourced",
      "sources": [
        "https://www.deepspace.ucsb.edu/wp-content/uploads/2025/08/SA2VOLII.pdf"
      ]
    },
    "retired": {
      "value": "Not applicable — one-off test",
      "confidence": "inapplicable",
      "sources": [
        "https://www.deepspace.ucsb.edu/wp-content/uploads/2025/08/SA2VOLII.pdf"
      ]
    },
    "country": {
      "value": "United States",
      "confidence": "sourced",
      "sources": [
        "https://www.deepspace.ucsb.edu/wp-content/uploads/2025/08/SA2VOLII.pdf"
      ]
    },
    "silhouette": {
      "src": "/media/devices/greenhouse-george.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://www.deepspace.ucsb.edu/wp-content/uploads/2025/08/SA2VOLII.pdf"
      ]
    },
    "notes": "Historical records call the apparatus Cylinder / Silex; a documented toroidal item may be only one component. Outline shows that recognizable exterior component (est), not a complete known assembly or its internal construction. Complete size/mass remain unknown."
  },
  "w87": {
    "id": "w87",
    "entityLabel": "W87 / Mk 21 reentry assembly",
    "length": {
      "value": "1.75 m exterior envelope",
      "confidence": "estimated",
      "sources": [
        "https://www.nuclearweaponarchive.org/Usa/Weapons/W87.html"
      ]
    },
    "totalMass": {
      "value": "Over 363 kg complete assembly",
      "confidence": "estimated",
      "sources": [
        "https://www.nuclearweaponarchive.org/Usa/Weapons/W87.html"
      ]
    },
    "payloadMass": {
      "value": "200–272 kg warhead body",
      "confidence": "estimated",
      "sources": [
        "https://www.nuclearweaponarchive.org/Usa/Weapons/W87.html"
      ]
    },
    "created": {
      "value": "1986 — stockpile entry",
      "confidence": "sourced",
      "sources": [
        "https://www.gao.gov/assets/gao-06-261.pdf"
      ]
    },
    "retired": {
      "value": "Stockpile program; no retirement announced",
      "confidence": "sourced",
      "sources": [
        "https://www.energy.gov/documents/doe-fy-2027-volume-1-nnsa-overview"
      ]
    },
    "country": {
      "value": "United States",
      "confidence": "sourced",
      "sources": [
        "https://www.nuclearweaponarchive.org/Usa/Weapons/W87.html",
        "https://www.gao.gov/assets/gao-06-261.pdf",
        "https://www.energy.gov/documents/doe-fy-2027-volume-1-nnsa-overview"
      ]
    },
    "silhouette": {
      "src": "/media/devices/w87.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://www.nuclearweaponarchive.org/Usa/Weapons/W87.html",
        "https://www.gao.gov/assets/gao-06-261.pdf",
        "https://www.energy.gov/documents/doe-fy-2027-volume-1-nnsa-overview"
      ]
    },
    "notes": "Dimensions describe the public Mk 21 reentry-vehicle envelope, not the bare warhead. The specialist source marks complete assembly mass uncertain; therefore both envelope and mass are qualified estimates."
  },
  "b61-7": {
    "id": "b61-7",
    "entityLabel": "B61-7 complete gravity bomb",
    "length": {
      "value": "3.60 m",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "totalMass": {
      "value": "324 kg",
      "confidence": "estimated",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "payloadMass": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html",
        "https://www.gao.gov/assets/gao-06-261.pdf",
        "https://www.energy.gov/nnsa/articles/nnsa-completes-b61-12-life-extension-program"
      ]
    },
    "created": {
      "value": "1985 — stockpile entry",
      "confidence": "sourced",
      "sources": [
        "https://www.gao.gov/assets/gao-06-261.pdf"
      ]
    },
    "retired": {
      "value": "Replacement / retirement completion unconfirmed",
      "confidence": "unknown",
      "sources": [
        "https://www.energy.gov/nnsa/articles/nnsa-completes-b61-12-life-extension-program"
      ]
    },
    "country": {
      "value": "United States",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html",
        "https://www.gao.gov/assets/gao-06-261.pdf",
        "https://www.energy.gov/nnsa/articles/nnsa-completes-b61-12-life-extension-program"
      ]
    },
    "silhouette": {
      "src": "/media/devices/b61-7.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html",
        "https://www.gao.gov/assets/gao-06-261.pdf",
        "https://www.energy.gov/nnsa/articles/nnsa-completes-b61-12-life-extension-program"
      ]
    },
    "notes": "Mod 7 legacy casing with retarding-tail form, not Mod 12 guidance fins. NNSA records identify replacement by B61-12, but do not establish a final retirement date for every Mod 7. 716 lb public family upper value is used as an estimate."
  },
  "rds-6s": {
    "id": "rds-6s",
    "entityLabel": "RDS-6s museum bomb casing",
    "length": {
      "value": "5.80 m casing",
      "confidence": "sourced",
      "sources": [
        "https://elib.biblioatom.ru/text/muzey-yadernogo-oruzhiya-rfyats-vniief_2018/0000/02/"
      ]
    },
    "totalMass": {
      "value": "7,000 kg complete device",
      "confidence": "sourced",
      "sources": [
        "https://elib.biblioatom.ru/text/muzey-yadernogo-oruzhiya-rfyats-vniief_2018/0000/02/"
      ]
    },
    "payloadMass": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://elib.biblioatom.ru/text/muzey-yadernogo-oruzhiya-rfyats-vniief_2018/0000/02/",
        "https://www.nuclearweaponarchive.org/~nuclearw/Russia/Sovwpnprog.html"
      ]
    },
    "created": {
      "value": "1953-08-12 — test",
      "confidence": "sourced",
      "sources": [
        "https://elib.biblioatom.ru/text/muzey-yadernogo-oruzhiya-rfyats-vniief_2018/0000/02/"
      ]
    },
    "retired": {
      "value": "Not applicable — one-off test",
      "confidence": "inapplicable",
      "sources": [
        "https://elib.biblioatom.ru/text/muzey-yadernogo-oruzhiya-rfyats-vniief_2018/0000/02/"
      ]
    },
    "country": {
      "value": "Soviet Union",
      "confidence": "sourced",
      "sources": [
        "https://elib.biblioatom.ru/text/muzey-yadernogo-oruzhiya-rfyats-vniief_2018/0000/02/",
        "https://www.nuclearweaponarchive.org/~nuclearw/Russia/Sovwpnprog.html"
      ]
    },
    "silhouette": {
      "src": "/media/devices/rds-6s.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://elib.biblioatom.ru/text/muzey-yadernogo-oruzhiya-rfyats-vniief_2018/0000/02/",
        "https://www.nuclearweaponarchive.org/~nuclearw/Russia/Sovwpnprog.html"
      ]
    },
    "notes": "Museum catalog page 97 gives 5,800 mm casing length and 7 t complete mass. Outline is the museum casing; the first shot was on a test tower. It is not a later thermonuclear delivery system."
  },
  "w88": {
    "id": "w88",
    "entityLabel": "W88 / Mk 5 reentry assembly",
    "length": {
      "value": "1.75 m exterior envelope",
      "confidence": "estimated",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/W88.html"
      ]
    },
    "totalMass": {
      "value": "Below 363 kg complete assembly",
      "confidence": "estimated",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/W88.html"
      ]
    },
    "payloadMass": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/W88.html",
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html",
        "https://www.energy.gov/documents/doe-fy-2027-volume-1-nnsa-overview"
      ]
    },
    "created": {
      "value": "1988 — production",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/W88.html",
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html",
        "https://www.energy.gov/documents/doe-fy-2027-volume-1-nnsa-overview"
      ]
    },
    "retired": {
      "value": "Stockpile program; no retirement announced",
      "confidence": "sourced",
      "sources": [
        "https://www.energy.gov/documents/doe-fy-2027-volume-1-nnsa-overview"
      ]
    },
    "country": {
      "value": "United States",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/W88.html",
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html",
        "https://www.energy.gov/documents/doe-fy-2027-volume-1-nnsa-overview"
      ]
    },
    "silhouette": {
      "src": "/media/devices/w88.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/W88.html",
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html",
        "https://www.energy.gov/documents/doe-fy-2027-volume-1-nnsa-overview"
      ]
    },
    "notes": "Public Mk 5 envelope estimates, not a bare-warhead engineering specification. The historical source itself marks the mass uncertain. Exterior is shown without internal components; the map uses the unchanged 475 kt catalog value."
  },
  "ivy-king": {
    "id": "ivy-king",
    "entityLabel": "Ivy King / Mark 18 test bomb",
    "length": {
      "value": "3.25 m",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html",
        "https://www.nuclearweaponarchive.org/Usa/Tests/Ivy.html"
      ]
    },
    "totalMass": {
      "value": "3,901 kg",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html",
        "https://www.nuclearweaponarchive.org/Usa/Tests/Ivy.html"
      ]
    },
    "payloadMass": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html",
        "https://www.nuclearweaponarchive.org/Usa/Tests/Ivy.html"
      ]
    },
    "created": {
      "value": "1952-11-16 — test",
      "confidence": "sourced",
      "sources": [
        "https://www.nuclearweaponarchive.org/Usa/Tests/Ivy.html"
      ]
    },
    "retired": {
      "value": "Not applicable — one-off test",
      "confidence": "inapplicable",
      "sources": [
        "https://www.nuclearweaponarchive.org/Usa/Tests/Ivy.html"
      ]
    },
    "country": {
      "value": "United States",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html",
        "https://www.nuclearweaponarchive.org/Usa/Tests/Ivy.html"
      ]
    },
    "silhouette": {
      "src": "/media/devices/ivy-king.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html",
        "https://www.nuclearweaponarchive.org/Usa/Tests/Ivy.html"
      ]
    },
    "notes": "King was the test of the Mark 18 bomb family. 128 in × 60 in and 8,600 lb are the public Mark 18 casing values. One-off test retirement is distinct from later production-family retirement in 1956."
  },
  "orange-herald": {
    "id": "orange-herald",
    "entityLabel": "Orange Herald Small experimental assembly",
    "length": {
      "value": "0.76 m across assembly",
      "confidence": "estimated",
      "sources": [
        "https://www.nuclearweaponarchive.org/~nuclearw/Uk/UKTesting.html"
      ]
    },
    "totalMass": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://www.nuclearweaponarchive.org/~nuclearw/Uk/UKTesting.html",
        "https://www.nuclearinfo.org/wp-content/uploads/2023/05/The_real_meaning_of_the_words_a_pedantic_glossary_of_British_nuclear_weapons_John_Ainslie_Notes_March_2004..pdf",
        "https://assets.publishing.service.gov.uk/media/5a755567e5274a59fa717577/ntvfactsheet5.pdf"
      ]
    },
    "payloadMass": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://www.nuclearweaponarchive.org/~nuclearw/Uk/UKTesting.html",
        "https://www.nuclearinfo.org/wp-content/uploads/2023/05/The_real_meaning_of_the_words_a_pedantic_glossary_of_British_nuclear_weapons_John_Ainslie_Notes_March_2004..pdf",
        "https://assets.publishing.service.gov.uk/media/5a755567e5274a59fa717577/ntvfactsheet5.pdf"
      ]
    },
    "created": {
      "value": "1957-05-31 — test",
      "confidence": "sourced",
      "sources": [
        "https://assets.publishing.service.gov.uk/media/5a755567e5274a59fa717577/ntvfactsheet5.pdf"
      ]
    },
    "retired": {
      "value": "Not applicable — one-off test",
      "confidence": "inapplicable",
      "sources": [
        "https://assets.publishing.service.gov.uk/media/5a755567e5274a59fa717577/ntvfactsheet5.pdf"
      ]
    },
    "country": {
      "value": "United Kingdom",
      "confidence": "sourced",
      "sources": [
        "https://www.nuclearweaponarchive.org/~nuclearw/Uk/UKTesting.html",
        "https://www.nuclearinfo.org/wp-content/uploads/2023/05/The_real_meaning_of_the_words_a_pedantic_glossary_of_British_nuclear_weapons_John_Ainslie_Notes_March_2004..pdf",
        "https://assets.publishing.service.gov.uk/media/5a755567e5274a59fa717577/ntvfactsheet5.pdf"
      ]
    },
    "silhouette": {
      "src": "/media/devices/orange-herald.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://www.nuclearweaponarchive.org/~nuclearw/Uk/UKTesting.html",
        "https://www.nuclearinfo.org/wp-content/uploads/2023/05/The_real_meaning_of_the_words_a_pedantic_glossary_of_British_nuclear_weapons_John_Ainslie_Notes_March_2004..pdf",
        "https://assets.publishing.service.gov.uk/media/5a755567e5274a59fa717577/ntvfactsheet5.pdf"
      ]
    },
    "notes": "Outline depicts the spherical Orange Herald Small assembly seen in a supporting frame, not a complete Blue Danube casing. The 30 in diameter is a secondary historical estimate; gross complete test-bomb mass remains unknown."
  },
  "w59": {
    "id": "w59",
    "entityLabel": "W59 missile warhead body",
    "length": {
      "value": "1.21 m",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "totalMass": {
      "value": "249–251 kg",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "payloadMass": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "created": {
      "value": "1962 — production",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "retired": {
      "value": "1969 — final retirement",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "country": {
      "value": "United States",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "silhouette": {
      "src": "/media/devices/w59.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "notes": "Bare warhead public dimensions: 47.8 × 16.3 in, 550–553 lb. Does not include the Minuteman I missile or full Mk 5 reentry vehicle; external envelope is simplified."
  },
  "b83": {
    "id": "b83",
    "entityLabel": "B83-1 complete gravity bomb",
    "length": {
      "value": "3.68 m",
      "confidence": "sourced",
      "sources": [
        "https://www.nuclearweaponarchive.org/~nuclearw/Usa/Weapons/B83.html",
        "https://www.energy.gov/sites/default/files/2025-06/doe-fy-2026-vol-1-wa.pdf"
      ]
    },
    "totalMass": {
      "value": "1,089 kg",
      "confidence": "sourced",
      "sources": [
        "https://www.nuclearweaponarchive.org/~nuclearw/Usa/Weapons/B83.html",
        "https://www.energy.gov/sites/default/files/2025-06/doe-fy-2026-vol-1-wa.pdf"
      ]
    },
    "payloadMass": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://www.nuclearweaponarchive.org/~nuclearw/Usa/Weapons/B83.html",
        "https://www.energy.gov/sites/default/files/2025-06/doe-fy-2026-vol-1-wa.pdf"
      ]
    },
    "created": {
      "value": "1983 — first production",
      "confidence": "sourced",
      "sources": [
        "https://www.nuclearweaponarchive.org/~nuclearw/Usa/Weapons/B83.html",
        "https://www.energy.gov/sites/default/files/2025-06/doe-fy-2026-vol-1-wa.pdf"
      ]
    },
    "retired": {
      "value": "Retirement planned; completion not established",
      "confidence": "unknown",
      "sources": [
        "https://www.energy.gov/sites/default/files/2025-06/doe-fy-2026-vol-1-wa.pdf"
      ]
    },
    "country": {
      "value": "United States",
      "confidence": "sourced",
      "sources": [
        "https://www.nuclearweaponarchive.org/~nuclearw/Usa/Weapons/B83.html",
        "https://www.energy.gov/sites/default/files/2025-06/doe-fy-2026-vol-1-wa.pdf"
      ]
    },
    "silhouette": {
      "src": "/media/devices/b83.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://www.nuclearweaponarchive.org/~nuclearw/Usa/Weapons/B83.html",
        "https://www.energy.gov/sites/default/files/2025-06/doe-fy-2026-vol-1-wa.pdf"
      ]
    },
    "notes": "Public dimensions 145 × 18 in and 2,400 lb. Retirement policy is not proof that every bomb has been dismantled. This preview records the uncertainty instead of assigning an unsupported retirement year."
  },
  "starfish-prime": {
    "id": "starfish-prime",
    "entityLabel": "Starfish Prime / W49 warhead body",
    "length": {
      "value": "1.38–1.47 m",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "totalMass": {
      "value": "744–762 kg",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "payloadMass": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "created": {
      "value": "1958 — W49 production",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "retired": {
      "value": "Not applicable — one-off test",
      "confidence": "inapplicable",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "country": {
      "value": "United States",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "silhouette": {
      "src": "/media/devices/starfish-prime.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "notes": "W49 public warhead body range: 54.3–57.9 in and 1,640–1,680 lb. Outline excludes the Thor rocket and reentry shell. Production date identifies the W49 family; Starfish Prime was a later 1962 test, not creation of a new warhead family."
  },
  "rds-37": {
    "id": "rds-37",
    "entityLabel": "RDS-37 air-dropped test assembly",
    "length": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://www.ufn.ru/en/articles/2005/11/g/",
        "https://www.nuclearweaponarchive.org/~nuclearw/Russia/Sovwpnprog.html"
      ]
    },
    "totalMass": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://www.ufn.ru/en/articles/2005/11/g/",
        "https://www.nuclearweaponarchive.org/~nuclearw/Russia/Sovwpnprog.html"
      ]
    },
    "payloadMass": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://www.ufn.ru/en/articles/2005/11/g/",
        "https://www.nuclearweaponarchive.org/~nuclearw/Russia/Sovwpnprog.html"
      ]
    },
    "created": {
      "value": "1955-11-22 — test",
      "confidence": "sourced",
      "sources": [
        "https://www.ufn.ru/en/articles/2005/11/g/"
      ]
    },
    "retired": {
      "value": "Not applicable — one-off test",
      "confidence": "inapplicable",
      "sources": [
        "https://www.ufn.ru/en/articles/2005/11/g/"
      ]
    },
    "country": {
      "value": "Soviet Union",
      "confidence": "sourced",
      "sources": [
        "https://www.ufn.ru/en/articles/2005/11/g/",
        "https://www.nuclearweaponarchive.org/~nuclearw/Russia/Sovwpnprog.html"
      ]
    },
    "silhouette": {
      "src": "/media/devices/rds-37.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://www.ufn.ru/en/articles/2005/11/g/",
        "https://www.nuclearweaponarchive.org/~nuclearw/Russia/Sovwpnprog.html"
      ]
    },
    "notes": "Reviewed primary historical account confirms the test but does not establish complete casing dimensions or mass. Estimated bomb-envelope outline conveys the air-dropped object only; it is deliberately unscaled and does not reuse Tsar Bomba dimensions."
  },
  "grapple-x": {
    "id": "grapple-x",
    "entityLabel": "Grapple X / Round C test bomb",
    "length": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://assets.publishing.service.gov.uk/media/5a755567e5274a59fa717577/ntvfactsheet5.pdf",
        "https://film.iwmcollections.org.uk/record/9911",
        "https://www.nuclearweaponarchive.org/~nuclearw/Uk/UKTesting.html"
      ]
    },
    "totalMass": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://assets.publishing.service.gov.uk/media/5a755567e5274a59fa717577/ntvfactsheet5.pdf",
        "https://film.iwmcollections.org.uk/record/9911",
        "https://www.nuclearweaponarchive.org/~nuclearw/Uk/UKTesting.html"
      ]
    },
    "payloadMass": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://assets.publishing.service.gov.uk/media/5a755567e5274a59fa717577/ntvfactsheet5.pdf",
        "https://film.iwmcollections.org.uk/record/9911",
        "https://www.nuclearweaponarchive.org/~nuclearw/Uk/UKTesting.html"
      ]
    },
    "created": {
      "value": "1957-11-08 — test",
      "confidence": "sourced",
      "sources": [
        "https://assets.publishing.service.gov.uk/media/5a755567e5274a59fa717577/ntvfactsheet5.pdf"
      ]
    },
    "retired": {
      "value": "Not applicable — one-off test",
      "confidence": "inapplicable",
      "sources": [
        "https://assets.publishing.service.gov.uk/media/5a755567e5274a59fa717577/ntvfactsheet5.pdf"
      ]
    },
    "country": {
      "value": "United Kingdom",
      "confidence": "sourced",
      "sources": [
        "https://assets.publishing.service.gov.uk/media/5a755567e5274a59fa717577/ntvfactsheet5.pdf",
        "https://film.iwmcollections.org.uk/record/9911",
        "https://www.nuclearweaponarchive.org/~nuclearw/Uk/UKTesting.html"
      ]
    },
    "silhouette": {
      "src": "/media/devices/grapple-x.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://assets.publishing.service.gov.uk/media/5a755567e5274a59fa717577/ntvfactsheet5.pdf",
        "https://film.iwmcollections.org.uk/record/9911",
        "https://www.nuclearweaponarchive.org/~nuclearw/Uk/UKTesting.html"
      ]
    },
    "notes": "Exterior outline is an approximate air-drop casing envelope informed by IWM test footage. No defensible complete dimensions/mass established. Do not confuse the test assembly, its carrier aircraft, and a later service warhead."
  },
  "canopus": {
    "id": "canopus",
    "entityLabel": "Canopus balloon-suspended test assembly",
    "length": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://archives.ecpad.fr/archives/acceder-a-la-liste-des-series-photographiques?detail=129652",
        "https://www.cea.fr/multimedia/Documents/publications/ouvrages/LIVRE-Les-essais-nucleaires-en-Polynesie-francaise.pdf"
      ]
    },
    "totalMass": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://archives.ecpad.fr/archives/acceder-a-la-liste-des-series-photographiques?detail=129652",
        "https://www.cea.fr/multimedia/Documents/publications/ouvrages/LIVRE-Les-essais-nucleaires-en-Polynesie-francaise.pdf"
      ]
    },
    "payloadMass": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://archives.ecpad.fr/archives/acceder-a-la-liste-des-series-photographiques?detail=129652",
        "https://www.cea.fr/multimedia/Documents/publications/ouvrages/LIVRE-Les-essais-nucleaires-en-Polynesie-francaise.pdf"
      ]
    },
    "created": {
      "value": "1968-08-24 — test",
      "confidence": "sourced",
      "sources": [
        "https://archives.ecpad.fr/archives/acceder-a-la-liste-des-series-photographiques?detail=129652"
      ]
    },
    "retired": {
      "value": "Not applicable — one-off test",
      "confidence": "inapplicable",
      "sources": [
        "https://archives.ecpad.fr/archives/acceder-a-la-liste-des-series-photographiques?detail=129652"
      ]
    },
    "country": {
      "value": "France",
      "confidence": "sourced",
      "sources": [
        "https://archives.ecpad.fr/archives/acceder-a-la-liste-des-series-photographiques?detail=129652",
        "https://www.cea.fr/multimedia/Documents/publications/ouvrages/LIVRE-Les-essais-nucleaires-en-Polynesie-francaise.pdf"
      ]
    },
    "silhouette": {
      "src": "/media/devices/canopus.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://archives.ecpad.fr/archives/acceder-a-la-liste-des-series-photographiques?detail=129652",
        "https://www.cea.fr/multimedia/Documents/publications/ouvrages/LIVRE-Les-essais-nucleaires-en-Polynesie-francaise.pdf"
      ]
    },
    "notes": "CEA describes a test gondola suspended beneath a balloon. The visible outline represents this test assembly envelope (est), not a service bomb. Complete package dimensions/mass are not established; the suspension balloon is excluded."
  },
  "grapple-y": {
    "id": "grapple-y",
    "entityLabel": "Grapple Y test bomb",
    "length": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://assets.publishing.service.gov.uk/media/5a755567e5274a59fa717577/ntvfactsheet5.pdf",
        "https://www.nuclearweaponarchive.org/~nuclearw/Uk/UKTesting.html"
      ]
    },
    "totalMass": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://assets.publishing.service.gov.uk/media/5a755567e5274a59fa717577/ntvfactsheet5.pdf",
        "https://www.nuclearweaponarchive.org/~nuclearw/Uk/UKTesting.html"
      ]
    },
    "payloadMass": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://assets.publishing.service.gov.uk/media/5a755567e5274a59fa717577/ntvfactsheet5.pdf",
        "https://www.nuclearweaponarchive.org/~nuclearw/Uk/UKTesting.html"
      ]
    },
    "created": {
      "value": "1958-04-28 — test",
      "confidence": "sourced",
      "sources": [
        "https://assets.publishing.service.gov.uk/media/5a755567e5274a59fa717577/ntvfactsheet5.pdf"
      ]
    },
    "retired": {
      "value": "Not applicable — one-off test",
      "confidence": "inapplicable",
      "sources": [
        "https://assets.publishing.service.gov.uk/media/5a755567e5274a59fa717577/ntvfactsheet5.pdf"
      ]
    },
    "country": {
      "value": "United Kingdom",
      "confidence": "sourced",
      "sources": [
        "https://assets.publishing.service.gov.uk/media/5a755567e5274a59fa717577/ntvfactsheet5.pdf",
        "https://www.nuclearweaponarchive.org/~nuclearw/Uk/UKTesting.html"
      ]
    },
    "silhouette": {
      "src": "/media/devices/grapple-y.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://assets.publishing.service.gov.uk/media/5a755567e5274a59fa717577/ntvfactsheet5.pdf",
        "https://www.nuclearweaponarchive.org/~nuclearw/Uk/UKTesting.html"
      ]
    },
    "notes": "Approximate air-dropped test casing silhouette; no defensible complete external size or mass established from the reviewed public records. The 3 Mt historical shot yield is retained without inventing an operational service history."
  },
  "w39": {
    "id": "w39",
    "entityLabel": "W39 missile warhead body",
    "length": {
      "value": "2.68 m",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "totalMass": {
      "value": "2,826–2,903 kg",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "payloadMass": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "created": {
      "value": "1958 — production",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "retired": {
      "value": "1965 — final Snark variant retirement",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "country": {
      "value": "United States",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "silhouette": {
      "src": "/media/devices/w39.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "notes": "105.7 in warhead length, 34.5–35 in diameter and 6,230–6,400 lb public range. This is the W39 warhead rather than the longer Mark 39 aircraft bomb casing."
  },
  "b53": {
    "id": "b53",
    "entityLabel": "B53 complete gravity bomb",
    "length": {
      "value": "3.76 m",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "totalMass": {
      "value": "4,037 kg",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "payloadMass": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://www.nationalmuseum.af.mil/Visit/Museum-Exhibits/Fact-Sheets/Display/Article/195680/b53-thermonuclear-bomb/",
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "created": {
      "value": "1962 — production",
      "confidence": "sourced",
      "sources": [
        "https://www.nationalmuseum.af.mil/Visit/Museum-Exhibits/Fact-Sheets/Display/Article/195680/b53-thermonuclear-bomb/",
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "retired": {
      "value": "1997 — active-service retirement",
      "confidence": "sourced",
      "sources": [
        "https://www.nationalmuseum.af.mil/Visit/Museum-Exhibits/Fact-Sheets/Display/Article/195680/b53-thermonuclear-bomb/",
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "country": {
      "value": "United States",
      "confidence": "sourced",
      "sources": [
        "https://www.nationalmuseum.af.mil/Visit/Museum-Exhibits/Fact-Sheets/Display/Article/195680/b53-thermonuclear-bomb/",
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "silhouette": {
      "src": "/media/devices/b53.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://www.nationalmuseum.af.mil/Visit/Museum-Exhibits/Fact-Sheets/Display/Article/195680/b53-thermonuclear-bomb/",
        "https://nuclearweaponarchive.org/Usa/Weapons/Allbombs.html"
      ]
    },
    "notes": "148 in and 8,900 lb representative configuration. Service retirement, stockpile storage, and dismantlement are separate milestones; the final B53 was dismantled in 2011."
  },
  "hard-tack-poplar": {
    "id": "hard-tack-poplar",
    "entityLabel": "Hardtack Poplar experimental device",
    "length": {
      "value": "2.85 m",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/B41.html"
      ]
    },
    "totalMass": {
      "value": "4,226 kg",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/B41.html"
      ]
    },
    "payloadMass": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/B41.html"
      ]
    },
    "created": {
      "value": "1958-07-12 — test",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/B41.html"
      ]
    },
    "retired": {
      "value": "Not applicable — one-off test",
      "confidence": "inapplicable",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/B41.html"
      ]
    },
    "country": {
      "value": "United States",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/B41.html"
      ]
    },
    "silhouette": {
      "src": "/media/devices/hard-tack-poplar.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/B41.html"
      ]
    },
    "notes": "Poplar experimental device: 112.1 × 48.2 in and 9,316 lb. It preceded the longer finned B41 service bomb; the two silhouettes are intentionally different."
  },
  "ivy-mike": {
    "id": "ivy-mike",
    "entityLabel": "Ivy Mike / Sausage experimental apparatus",
    "length": {
      "value": "6.19 m main apparatus",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Nwfaq/Nfaq8.html"
      ]
    },
    "totalMass": {
      "value": "74,400 kg with diagnostic equipment",
      "confidence": "estimated",
      "sources": [
        "https://nuclearweaponarchive.org/Nwfaq/Nfaq8.html"
      ]
    },
    "payloadMass": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://www.nuclearweaponarchive.org/Usa/Tests/Ivy.html",
        "https://nuclearweaponarchive.org/Nwfaq/Nfaq8.html"
      ]
    },
    "created": {
      "value": "1952-11-01 — local test date",
      "confidence": "sourced",
      "sources": [
        "https://www.nuclearweaponarchive.org/Usa/Tests/Ivy.html"
      ]
    },
    "retired": {
      "value": "Not applicable — one-off test",
      "confidence": "inapplicable",
      "sources": [
        "https://www.nuclearweaponarchive.org/Usa/Tests/Ivy.html"
      ]
    },
    "country": {
      "value": "United States",
      "confidence": "sourced",
      "sources": [
        "https://www.nuclearweaponarchive.org/Usa/Tests/Ivy.html",
        "https://nuclearweaponarchive.org/Nwfaq/Nfaq8.html"
      ]
    },
    "silhouette": {
      "src": "/media/devices/ivy-mike.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://www.nuclearweaponarchive.org/Usa/Tests/Ivy.html",
        "https://nuclearweaponarchive.org/Nwfaq/Nfaq8.html"
      ]
    },
    "notes": "The large upright experimental apparatus is not a deliverable bomb. Source gives 243.625 in and 164,000 lb including diagnostics; exclusions differ between published mass figures, so gross mass is explicitly estimated."
  },
  "castle-yankee": {
    "id": "castle-yankee",
    "entityLabel": "Castle Yankee / Runt II experimental device",
    "length": {
      "value": "5.71 m",
      "confidence": "sourced",
      "sources": [
        "https://www.nuclearweaponarchive.org/Usa/Tests/Castle.html"
      ]
    },
    "totalMass": {
      "value": "17,963 kg",
      "confidence": "sourced",
      "sources": [
        "https://www.nuclearweaponarchive.org/Usa/Tests/Castle.html"
      ]
    },
    "payloadMass": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://www.nuclearweaponarchive.org/Usa/Tests/Castle.html"
      ]
    },
    "created": {
      "value": "1954-05-05 — local test date",
      "confidence": "sourced",
      "sources": [
        "https://www.nuclearweaponarchive.org/Usa/Tests/Castle.html"
      ]
    },
    "retired": {
      "value": "Not applicable — one-off test",
      "confidence": "inapplicable",
      "sources": [
        "https://www.nuclearweaponarchive.org/Usa/Tests/Castle.html"
      ]
    },
    "country": {
      "value": "United States",
      "confidence": "sourced",
      "sources": [
        "https://www.nuclearweaponarchive.org/Usa/Tests/Castle.html"
      ]
    },
    "silhouette": {
      "src": "/media/devices/castle-yankee.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://www.nuclearweaponarchive.org/Usa/Tests/Castle.html"
      ]
    },
    "notes": "Runt II used the same exterior casing, dimensions and weight as the Runt I test device: 224.9 × 61.4 in, 39,600 lb. It is not the later longer Mark 24 production bomb."
  },
  "castle-bravo": {
    "id": "castle-bravo",
    "entityLabel": "Castle Bravo / Shrimp experimental device",
    "length": {
      "value": "4.56 m",
      "confidence": "sourced",
      "sources": [
        "https://www.nuclearweaponarchive.org/Usa/Tests/Castle.html"
      ]
    },
    "totalMass": {
      "value": "10,659 kg",
      "confidence": "sourced",
      "sources": [
        "https://www.nuclearweaponarchive.org/Usa/Tests/Castle.html"
      ]
    },
    "payloadMass": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://www.nuclearweaponarchive.org/Usa/Tests/Castle.html",
        "https://www.dtra.mil/Portals/125/Documents/NTPR/newDocs/ANTHReport/1954_DNA_6035F.pdf"
      ]
    },
    "created": {
      "value": "1954-03-01 — local test date",
      "confidence": "sourced",
      "sources": [
        "https://www.dtra.mil/Portals/125/Documents/NTPR/newDocs/ANTHReport/1954_DNA_6035F.pdf"
      ]
    },
    "retired": {
      "value": "Not applicable — one-off test",
      "confidence": "inapplicable",
      "sources": [
        "https://www.dtra.mil/Portals/125/Documents/NTPR/newDocs/ANTHReport/1954_DNA_6035F.pdf"
      ]
    },
    "country": {
      "value": "United States",
      "confidence": "sourced",
      "sources": [
        "https://www.nuclearweaponarchive.org/Usa/Tests/Castle.html",
        "https://www.dtra.mil/Portals/125/Documents/NTPR/newDocs/ANTHReport/1954_DNA_6035F.pdf"
      ]
    },
    "silhouette": {
      "src": "/media/devices/castle-bravo.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://www.nuclearweaponarchive.org/Usa/Tests/Castle.html",
        "https://www.dtra.mil/Portals/125/Documents/NTPR/newDocs/ANTHReport/1954_DNA_6035F.pdf"
      ]
    },
    "notes": "179.5 × 53.9 in and 23,500 lb. Outline follows the exterior test cylinder in the shot-cab photograph, not the later finned Mark 21 service bomb. Yield uncertainty does not change the existing map catalog value."
  },
  "mk41": {
    "id": "mk41",
    "entityLabel": "Mark 41 / B41 complete gravity bomb",
    "length": {
      "value": "3.76 m",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/B41.html"
      ]
    },
    "totalMass": {
      "value": "4,840 kg",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/B41.html"
      ]
    },
    "payloadMass": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/B41.html"
      ]
    },
    "created": {
      "value": "1960 — production",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/B41.html"
      ]
    },
    "retired": {
      "value": "1976 — final retirement",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/B41.html"
      ]
    },
    "country": {
      "value": "United States",
      "confidence": "sourced",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/B41.html"
      ]
    },
    "silhouette": {
      "src": "/media/devices/mk41.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://nuclearweaponarchive.org/Usa/Weapons/B41.html"
      ]
    },
    "notes": "148 in × 52 in body with tail span 74 in, 10,670 lb. The deployed finned weapon differs from the earlier Poplar experimental apparatus; the gauge follows the catalog 25 Mt maximum."
  },
  "tsar-bomba": {
    "id": "tsar-bomba",
    "entityLabel": "Tsar Bomba full test bomb",
    "length": {
      "value": "8.00 m",
      "confidence": "sourced",
      "sources": [
        "https://www.nuclearweaponarchive.org/~nuclearw/Russia/TsarBomba.html"
      ]
    },
    "totalMass": {
      "value": "27,000 kg",
      "confidence": "estimated",
      "sources": [
        "https://www.nuclearweaponarchive.org/~nuclearw/Russia/TsarBomba.html"
      ]
    },
    "payloadMass": {
      "value": "Unknown — not established in public sources",
      "confidence": "unknown",
      "sources": [
        "https://www.nuclearweaponarchive.org/~nuclearw/Russia/TsarBomba.html",
        "https://www.vniief.ru/vniief/nuclear-center/museum/museum-of-nuclear-weapons/"
      ]
    },
    "created": {
      "value": "1961-10-30 — test",
      "confidence": "sourced",
      "sources": [
        "https://www.nuclearweaponarchive.org/~nuclearw/Russia/TsarBomba.html"
      ]
    },
    "retired": {
      "value": "Not applicable — one-off test",
      "confidence": "inapplicable",
      "sources": [
        "https://www.nuclearweaponarchive.org/~nuclearw/Russia/TsarBomba.html"
      ]
    },
    "country": {
      "value": "Soviet Union",
      "confidence": "sourced",
      "sources": [
        "https://www.nuclearweaponarchive.org/~nuclearw/Russia/TsarBomba.html",
        "https://www.vniief.ru/vniief/nuclear-center/museum/museum-of-nuclear-weapons/"
      ]
    },
    "silhouette": {
      "src": "/media/devices/tsar-bomba.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://www.nuclearweaponarchive.org/~nuclearw/Russia/TsarBomba.html",
        "https://www.vniief.ru/vniief/nuclear-center/museum/museum-of-nuclear-weapons/"
      ]
    },
    "notes": "Public reported gross masses range roughly 24.5–27.5 t; 27 t is a rounded estimate. Outline uses the museum exterior profile, including tail, not its parachute. The 50 Mt test value is distinct from an untested 100 Mt configuration."
  },
  "rs-24-yars": {
    "id": "rs-24-yars",
    "entityLabel": "RS-24 Yars complete carrier missile",
    "length": {
      "value": "22.5 m",
      "confidence": "estimated",
      "sources": [
        "https://missilethreat.csis.org/missile/rs-24/"
      ]
    },
    "totalMass": {
      "value": "49,000 kg launch mass",
      "confidence": "estimated",
      "sources": [
        "https://missilethreat.csis.org/missile/rs-24/"
      ]
    },
    "payloadMass": {
      "value": "1,200 kg payload",
      "confidence": "estimated",
      "sources": [
        "https://missilethreat.csis.org/missile/rs-24/"
      ]
    },
    "created": {
      "value": "2007-05 — first flight test",
      "confidence": "sourced",
      "sources": [
        "https://missilethreat.csis.org/missile/rs-24/"
      ]
    },
    "retired": {
      "value": "Operational in reviewed record; retirement unknown",
      "confidence": "reported",
      "sources": [
        "https://missilethreat.csis.org/missile/rs-24/"
      ]
    },
    "country": {
      "value": "Russia",
      "confidence": "sourced",
      "sources": [
        "https://missilethreat.csis.org/missile/rs-24/"
      ]
    },
    "silhouette": {
      "src": "/media/devices/rs-24-yars.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://missilethreat.csis.org/missile/rs-24/"
      ]
    },
    "notes": "Carrier exterior, not one warhead. CSIS table lists 49,600 kg but its narrative assesses 49,000 kg; the rounded narrative estimate is used. The simulator models 3 × 175 kt and does not claim that every deployed loadout is identical."
  },
  "rsm-56-bulava": {
    "id": "rsm-56-bulava",
    "entityLabel": "RSM-56 Bulava complete carrier missile",
    "length": {
      "value": "12.1 m",
      "confidence": "estimated",
      "sources": [
        "https://missilethreat.csis.org/missile/ss-n-32-bulava/"
      ]
    },
    "totalMass": {
      "value": "36,800 kg launch mass",
      "confidence": "estimated",
      "sources": [
        "https://missilethreat.csis.org/missile/ss-n-32-bulava/"
      ]
    },
    "payloadMass": {
      "value": "1,150 kg payload",
      "confidence": "estimated",
      "sources": [
        "https://missilethreat.csis.org/missile/ss-n-32-bulava/"
      ]
    },
    "created": {
      "value": "2005-09 — first powered flight",
      "confidence": "sourced",
      "sources": [
        "https://missilethreat.csis.org/missile/ss-n-32-bulava/"
      ]
    },
    "retired": {
      "value": "Operational in reviewed record; retirement unknown",
      "confidence": "reported",
      "sources": [
        "https://missilethreat.csis.org/missile/ss-n-32-bulava/"
      ]
    },
    "country": {
      "value": "Russia",
      "confidence": "sourced",
      "sources": [
        "https://missilethreat.csis.org/missile/ss-n-32-bulava/"
      ]
    },
    "silhouette": {
      "src": "/media/devices/rsm-56-bulava.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://missilethreat.csis.org/missile/ss-n-32-bulava/"
      ]
    },
    "notes": "Public dimensions vary: CSIS narrative gives 12–13.5 m and 36–39 t; preview uses its table values as estimates. The modeled 10 × 120 kt loadout is a scenario assumption, not a verified deployed configuration."
  },
  "rs-28-sarmat": {
    "id": "rs-28-sarmat",
    "entityLabel": "RS-28 Sarmat complete carrier missile",
    "length": {
      "value": "35.3 m",
      "confidence": "reported",
      "sources": [
        "https://missilethreat.csis.org/missile/rs-28-sarmat/"
      ]
    },
    "totalMass": {
      "value": "208,100 kg launch mass",
      "confidence": "reported",
      "sources": [
        "https://missilethreat.csis.org/missile/rs-28-sarmat/"
      ]
    },
    "payloadMass": {
      "value": "10,000 kg payload capacity",
      "confidence": "reported",
      "sources": [
        "https://missilethreat.csis.org/missile/rs-28-sarmat/"
      ]
    },
    "created": {
      "value": "2022-04 — first full-flight test",
      "confidence": "sourced",
      "sources": [
        "https://apnews.com/article/2dcf48ff661b968f578a559d42d40445"
      ]
    },
    "retired": {
      "value": "Service entry disputed; no retirement date",
      "confidence": "unknown",
      "sources": [
        "https://missilethreat.csis.org/missile/rs-28-sarmat/",
        "https://apnews.com/article/2dcf48ff661b968f578a559d42d40445"
      ]
    },
    "country": {
      "value": "Russia",
      "confidence": "sourced",
      "sources": [
        "https://missilethreat.csis.org/missile/rs-28-sarmat/",
        "https://apnews.com/article/2dcf48ff661b968f578a559d42d40445"
      ]
    },
    "silhouette": {
      "src": "/media/devices/rs-28-sarmat.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://missilethreat.csis.org/missile/rs-28-sarmat/",
        "https://apnews.com/article/2dcf48ff661b968f578a559d42d40445"
      ]
    },
    "notes": "Carrier exterior from the public Makeyev/CSIS diagram. Earlier service announcements conflict with a May 2026 report projecting entry at year-end. Do not present that projection as achieved. Simulator loadout is 10 × 500 kt, independent of real loadout claims."
  },
  "city-breaker": {
    "id": "city-breaker",
    "entityLabel": "100 Mt scale study",
    "length": {
      "value": "Not applicable — no real device",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "totalMass": {
      "value": "Not applicable — no real device",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "payloadMass": {
      "value": "Not applicable — no real device",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "created": {
      "value": "Not applicable — hypothetical study",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "retired": {
      "value": "Not applicable — hypothetical study",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "country": {
      "value": "Not applicable — hypothetical study",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "silhouette": {
      "src": "/media/devices/city-breaker.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "notes": "Simulation only. Conceptual (est) energy-study symbol; no actual weapon shape, physical size, mass, national origin or service dates are implied. Extreme yields exceed the calibrated range of the screening model."
  },
  "gigaton-study": {
    "id": "gigaton-study",
    "entityLabel": "1 Gt scale study",
    "length": {
      "value": "Not applicable — no real device",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "totalMass": {
      "value": "Not applicable — no real device",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "payloadMass": {
      "value": "Not applicable — no real device",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "created": {
      "value": "Not applicable — hypothetical study",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "retired": {
      "value": "Not applicable — hypothetical study",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "country": {
      "value": "Not applicable — hypothetical study",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "silhouette": {
      "src": "/media/devices/gigaton-study.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "notes": "Simulation only. Conceptual (est) energy-study symbol; no actual weapon shape, physical size, mass, national origin or service dates are implied. Extreme yields exceed the calibrated range of the screening model."
  },
  "regional-event": {
    "id": "regional-event",
    "entityLabel": "10 Gt regional extreme",
    "length": {
      "value": "Not applicable — no real device",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "totalMass": {
      "value": "Not applicable — no real device",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "payloadMass": {
      "value": "Not applicable — no real device",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "created": {
      "value": "Not applicable — hypothetical study",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "retired": {
      "value": "Not applicable — hypothetical study",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "country": {
      "value": "Not applicable — hypothetical study",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "silhouette": {
      "src": "/media/devices/regional-event.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "notes": "Simulation only. Conceptual (est) energy-study symbol; no actual weapon shape, physical size, mass, national origin or service dates are implied. Extreme yields exceed the calibrated range of the screening model."
  },
  "hundred-gigaton": {
    "id": "hundred-gigaton",
    "entityLabel": "100 Gt regional extreme",
    "length": {
      "value": "Not applicable — no real device",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "totalMass": {
      "value": "Not applicable — no real device",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "payloadMass": {
      "value": "Not applicable — no real device",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "created": {
      "value": "Not applicable — hypothetical study",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "retired": {
      "value": "Not applicable — hypothetical study",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "country": {
      "value": "Not applicable — hypothetical study",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "silhouette": {
      "src": "/media/devices/hundred-gigaton.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "notes": "Simulation only. Conceptual (est) energy-study symbol; no actual weapon shape, physical size, mass, national origin or service dates are implied. Extreme yields exceed the calibrated range of the screening model."
  },
  "continent-scale": {
    "id": "continent-scale",
    "entityLabel": "1.5 Tt small-continent study",
    "length": {
      "value": "Not applicable — no real device",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "totalMass": {
      "value": "Not applicable — no real device",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "payloadMass": {
      "value": "Not applicable — no real device",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "created": {
      "value": "Not applicable — hypothetical study",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "retired": {
      "value": "Not applicable — hypothetical study",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "country": {
      "value": "Not applicable — hypothetical study",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "silhouette": {
      "src": "/media/devices/continent-scale.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "notes": "Simulation only. Conceptual (est) energy-study symbol; no actual weapon shape, physical size, mass, national origin or service dates are implied. Extreme yields exceed the calibrated range of the screening model."
  },
  "large-continent": {
    "id": "large-continent",
    "entityLabel": "20 Tt large-continent study",
    "length": {
      "value": "Not applicable — no real device",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "totalMass": {
      "value": "Not applicable — no real device",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "payloadMass": {
      "value": "Not applicable — no real device",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "created": {
      "value": "Not applicable — hypothetical study",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "retired": {
      "value": "Not applicable — hypothetical study",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "country": {
      "value": "Not applicable — hypothetical study",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "silhouette": {
      "src": "/media/devices/large-continent.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "notes": "Simulation only. Conceptual (est) energy-study symbol; no actual weapon shape, physical size, mass, national origin or service dates are implied. Extreme yields exceed the calibrated range of the screening model."
  },
  "hemisphere-scale": {
    "id": "hemisphere-scale",
    "entityLabel": "100 Tt hemisphere study",
    "length": {
      "value": "Not applicable — no real device",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "totalMass": {
      "value": "Not applicable — no real device",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "payloadMass": {
      "value": "Not applicable — no real device",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "created": {
      "value": "Not applicable — hypothetical study",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "retired": {
      "value": "Not applicable — hypothetical study",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "country": {
      "value": "Not applicable — hypothetical study",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "silhouette": {
      "src": "/media/devices/hemisphere-scale.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "notes": "Simulation only. Conceptual (est) energy-study symbol; no actual weapon shape, physical size, mass, national origin or service dates are implied. Extreme yields exceed the calibrated range of the screening model."
  },
  "earth-spanning": {
    "id": "earth-spanning",
    "entityLabel": "1 Pt Earth-span stress test",
    "length": {
      "value": "Not applicable — no real device",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "totalMass": {
      "value": "Not applicable — no real device",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "payloadMass": {
      "value": "Not applicable — no real device",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "created": {
      "value": "Not applicable — hypothetical study",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "retired": {
      "value": "Not applicable — hypothetical study",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "country": {
      "value": "Not applicable — hypothetical study",
      "confidence": "inapplicable",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "silhouette": {
      "src": "/media/devices/earth-spanning.svg",
      "width": 960,
      "height": 320,
      "confidence": "estimated",
      "sources": [
        "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
      ]
    },
    "notes": "Simulation only. Conceptual (est) energy-study symbol; no actual weapon shape, physical size, mass, national origin or service dates are implied. Extreme yields exceed the calibrated range of the screening model."
  }
};
