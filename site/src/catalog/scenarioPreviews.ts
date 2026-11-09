import type { ScenarioPreview } from "./previewTypes";

/** Static, researched event prose paired by stable ID with development-generated scenario artwork; all dimensions are pixels. */
export const SCENARIO_PREVIEWS: Readonly<Record<string, ScenarioPreview>> = {
  "hiroshima": {
    "id": "hiroshima",
    "imageSrc": "/media/scenarios/hiroshima.webp",
    "imageWidth": 1200,
    "imageHeight": 800,
    "description": "On 6 August 1945, Little Boy exploded above Hiroshima. Heat and blast tore through streets, homes and places of care. The city burned beneath a rising cloud; survivors faced ruined shelter, missing families and radiation long after the light faded.",
    "sources": [
      "https://www.pref.hiroshima.lg.jp/site/hiroshimaforpeace-en/reconstruction-atomic-bombing.html",
      "https://prologue.blogs.archives.gov/2020/08/06/little-boy-the-first-atomic-bomb/"
    ]
  },
  "nagasaki": {
    "id": "nagasaki",
    "imageSrc": "/media/scenarios/nagasaki.webp",
    "imageWidth": 1200,
    "imageHeight": 800,
    "description": "At 11:02 on 9 August 1945, Fat Man detonated over Nagasaki’s Urakami valley. Factories, homes and the cathedral became wreckage. Hills shaped the destruction without sheltering everyone beneath the cloud; burns, loss and radiation followed survivors into the aftermath.",
    "sources": [
      "https://nagasakipeace.jp/en/search/record/",
      "https://nagasakipeace.jp/content/files/english/abm/leaflet_e.pdf"
    ]
  },
  "trinity": {
    "id": "trinity",
    "imageSrc": "/media/scenarios/trinity.webp",
    "imageWidth": 1200,
    "imageHeight": 800,
    "description": "Before dawn on 16 July 1945, the Trinity Gadget exploded above New Mexico’s Jornada del Muerto. The tower vanished and sand became green glass. Humanity’s first nuclear test left radioactive ground beneath a cloud that announced a darker age.",
    "sources": [
      "https://www.energy.gov/lm/trinity-site-worlds-first-nuclear-explosion",
      "https://home.nps.gov/articles/000/the-gadget.htm"
    ]
  },
  "sedan": {
    "id": "sedan",
    "imageSrc": "/media/scenarios/sedan.webp",
    "imageWidth": 1200,
    "imageHeight": 800,
    "description": "On 6 July 1962, Sedan detonated beneath the Nevada desert in an experiment in nuclear excavation. The ground rose and broke, leaving a crater roughly 390 meters across. A promise of peaceful earthmoving left displaced soil and radioactive debris.",
    "sources": [
      "https://nnss.gov/wp-content/uploads/2023/04/NNSS-SEDN-U-0047-Rev01-1.pdf",
      "https://eros.usgs.gov/earthshots/sedan-crater"
    ]
  },
  "castle-bravo": {
    "id": "castle-bravo",
    "imageSrc": "/media/scenarios/castle-bravo.webp",
    "imageWidth": 1200,
    "imageHeight": 800,
    "description": "On 1 March 1954, Castle Bravo erupted at Bikini Atoll far above its predicted yield. Fallout reached Marshallese communities and a Japanese fishing crew beyond the test area. The cloud dispersed; exposure, contamination and displacement outlasted the tropical glare.",
    "sources": [
      "https://www.dtra.mil/Portals/125/Documents/NTPR/newDocs/ANTHReport/1954_DNA_6035F.pdf",
      "https://www.nuclearweaponarchive.org/Usa/Tests/Castle.html"
    ]
  },
  "tsar-bomba": {
    "id": "tsar-bomba",
    "imageSrc": "/media/scenarios/tsar-bomba.webp",
    "imageWidth": 1200,
    "imageHeight": 800,
    "description": "On 30 October 1961, Tsar Bomba detonated over Novaya Zemlya. The roughly 50-megaton explosion was the largest nuclear test ever conducted. An immense flash and cloud overwhelmed the Arctic horizon: a cold landscape beneath a demonstration of terrifying power.",
    "sources": [
      "https://www.nuclearweaponarchive.org/~nuclearw/Russia/TsarBomba.html"
    ]
  },
  "rds-1-semipalatinsk": {
    "id": "rds-1-semipalatinsk",
    "imageSrc": "/media/scenarios/rds-1-semipalatinsk.webp",
    "imageWidth": 1200,
    "imageHeight": 800,
    "description": "On 29 August 1949, RDS-1 exploded at Semipalatinsk in the Kazakh steppe, the Soviet Union’s first nuclear test. Fallout crossed a landscape of settlements and grazing land. The testing era that followed left exposure, contaminated ground and a lasting burden of memory.",
    "sources": [
      "https://www.vniief.ru/vniief/nuclear-center/museum/museum-of-nuclear-weapons/",
      "https://semi-nuc.iarc.who.int/"
    ]
  },
  "gerboise-reggane": {
    "id": "gerboise-reggane",
    "imageSrc": "/media/scenarios/gerboise-reggane.webp",
    "imageWidth": 1200,
    "imageHeight": 800,
    "description": "On 13 February 1960, Gerboise Bleue detonated near Reggane in the Algerian Sahara, then under French colonial rule. A tower-mounted device made France a nuclear power. The desert was not empty: radioactive contamination reached beyond the brief glare and official milestone.",
    "sources": [
      "https://www.assemblee-nationale.fr/rap-oecst/essais_nucleaires/i3571.asp",
      "https://www.senat.fr/rap/o97-179/o97-1799.html"
    ]
  },
  "ivy-mike-elugelab": {
    "id": "ivy-mike-elugelab",
    "imageSrc": "/media/scenarios/ivy-mike-elugelab.webp",
    "imageWidth": 1200,
    "imageHeight": 800,
    "description": "On 1 November 1952, Ivy Mike detonated on Elugelab in Enewetak Atoll. The full-scale thermonuclear experiment obliterated the island, leaving a crater beneath the lagoon. Instruments recorded success while a living piece of Pacific geography disappeared beneath the cloud.",
    "sources": [
      "https://www.army.mil/article/47341/the_island_is_missing",
      "https://www.govinfo.gov/content/pkg/GOVPUB-D15-PURL-gpo222810/pdf/GOVPUB-D15-PURL-gpo222810.pdf"
    ]
  },
  "orange-herald-malden": {
    "id": "orange-herald-malden",
    "imageSrc": "/media/scenarios/orange-herald-malden.webp",
    "imageWidth": 1200,
    "imageHeight": 800,
    "description": "On 31 May 1957, Britain tested Orange Herald near Malden Island during Operation Grapple. A powerful fission explosion rose above the Pacific horizon. A military milestone also turned coral, ocean and the personnel watching it into a setting for radioactive aftermath.",
    "sources": [
      "https://assets.publishing.service.gov.uk/media/5a755567e5274a59fa717577/ntvfactsheet5.pdf",
      "https://www.nuclearweaponarchive.org/~nuclearw/Uk/UKTesting.html"
    ]
  },
  "canopus-fangataufa": {
    "id": "canopus-fangataufa",
    "imageSrc": "/media/scenarios/canopus-fangataufa.webp",
    "imageWidth": 1200,
    "imageHeight": 800,
    "description": "On 24 August 1968, Canopus detonated above Fangataufa Atoll. The balloon-suspended device produced France’s first full-scale thermonuclear test. Beneath the immense cloud lay lagoon and reef: a living Pacific environment subjected to heat, blast and radioactive fallout.",
    "sources": [
      "https://archives.ecpad.fr/archives/acceder-a-la-liste-des-series-photographiques?detail=129652",
      "https://www.cea.fr/multimedia/Documents/publications/ouvrages/LIVRE-Les-essais-nucleaires-en-Polynesie-francaise.pdf"
    ]
  },
  "tsar-manhattan": {
    "id": "tsar-manhattan",
    "imageSrc": "/media/scenarios/tsar-manhattan.webp",
    "imageWidth": 1200,
    "imageHeight": 800,
    "description": "In this hypothetical event, a Tsar Bomba-scale blast would loom above Midtown Manhattan. Familiar towers would become fragile outlines beneath a vastly larger cloud. Heat, wreckage and failed infrastructure could sever the city’s ordinary connections, leaving darkness where movement and shelter once seemed certain.",
    "sources": [
      "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
    ]
  },
  "tokyo-100": {
    "id": "tokyo-100",
    "imageSrc": "/media/scenarios/tokyo-100.webp",
    "imageWidth": 1200,
    "imageHeight": 800,
    "description": "This hypothetical 100-megaton explosion would rise over central Tokyo, dwarfing its dense streets and skyline. Transport, power and communications could fail together. Beneath the red cloud, a city built on constant connection would become an imagined landscape of isolation and loss.",
    "sources": [
      "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
    ]
  },
  "europe-continent": {
    "id": "europe-continent",
    "imageSrc": "/media/scenarios/europe-continent.webp",
    "imageWidth": 1200,
    "imageHeight": 800,
    "description": "This hypothetical extreme release over Central Europe would dwarf towns, fields and transport corridors beneath an enormous cloud. National borders would offer little comfort in the imagined scene. It is a dark study of scale, beyond the screening model’s calibrated range.",
    "sources": [
      "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
    ]
  },
  "north-america-continent": {
    "id": "north-america-continent",
    "imageSrc": "/media/scenarios/north-america-continent.webp",
    "imageWidth": 1200,
    "imageHeight": 800,
    "description": "This hypothetical continent-scale event would rise over North America’s interior, dwarfing plains, roads and settlements. Openness would become exposure beneath an impossible horizon. The imagined catastrophe exceeds the model’s calibrated range; the ordinary distances between places would cease to feel reassuring.",
    "sources": [
      "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
    ]
  },
  "africa-continent": {
    "id": "africa-continent",
    "imageSrc": "/media/scenarios/africa-continent.webp",
    "imageWidth": 1200,
    "imageHeight": 800,
    "description": "This hypothetical extreme event would tower above Central Africa. Forest, rivers and settlements would seem a thin living surface beneath the red cloud. Landscapes sustaining generations would become terribly slight in the imagined scene, whose continental consequences lie beyond this model’s calibration.",
    "sources": [
      "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
    ]
  },
  "asia-continent": {
    "id": "asia-continent",
    "imageSrc": "/media/scenarios/asia-continent.webp",
    "imageWidth": 1200,
    "imageHeight": 800,
    "description": "This hypothetical extreme event would loom over Central Asia’s wide land and mountain horizons. Routes, water and scattered communities would seem fragile beneath the cloud. The dark scene imagines broken connections across an inhabited landscape; it cannot forecast a continent’s fate.",
    "sources": [
      "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
    ]
  },
  "australia-continent": {
    "id": "australia-continent",
    "imageSrc": "/media/scenarios/australia-continent.webp",
    "imageWidth": 1200,
    "imageHeight": 800,
    "description": "This hypothetical continent-scale blast would rise over Australia’s interior. Desert ranges and long roads would become small beneath an overwhelming red sky. Communities, Country and ecosystems give that landscape meaning; the imagined loss is immense, while literal continental damage exceeds this model’s calibration.",
    "sources": [
      "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
    ]
  },
  "point-nemo-hemisphere": {
    "id": "point-nemo-hemisphere",
    "imageSrc": "/media/scenarios/point-nemo-hemisphere.webp",
    "imageWidth": 1200,
    "imageHeight": 800,
    "description": "This hypothetical hemisphere-scale event would erupt near Point Nemo in the South Pacific. No skyline would make the huge cloud comprehensible, only ocean beneath an impossible glare. Remoteness would offer no reassuring boundary in an artistic catastrophe beyond the model’s calibrated assumptions.",
    "sources": [
      "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
    ]
  },
  "earth-thought-experiment": {
    "id": "earth-thought-experiment",
    "imageSrc": "/media/scenarios/earth-thought-experiment.webp",
    "imageWidth": 1200,
    "imageHeight": 800,
    "description": "This hypothetical one-petaton stress test imagines Earth beneath a release of almost ungraspable scale. No familiar city edge would soften the distant view: only an inhabited world reduced to an experimental frame. Literal planetary consequences lie beyond the screening formulas.",
    "sources": [
      "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
    ]
  }
};
