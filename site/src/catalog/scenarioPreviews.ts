import type { ScenarioPreview } from "./previewTypes";

/** Static, researched event prose paired by stable ID with development-generated scenario artwork; all dimensions are pixels. */
export const SCENARIO_PREVIEWS: Readonly<Record<string, ScenarioPreview>> = {
  "hiroshima": {
    "id": "hiroshima",
    "imageSrc": "/media/scenarios/hiroshima.webp",
    "imageWidth": 1200,
    "imageHeight": 800,
    "description": "On the morning of 6 August 1945, Little Boy exploded above Hiroshima. A familiar city of bridges, homes and crowded streets became a landscape of fire and wreckage. The blast destroyed places of shelter and care as well as the people within them; survivors faced burns, injury, radiation illness and the long search for missing families. The flash lasted an instant. Its consequences did not. This illustration evokes the event, while the account remembers an actual city and lives that no diagram can restore.",
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
    "description": "At 11:02 on 9 August 1945, Fat Man detonated over Nagasaki after the bomber diverted from its primary target, Kokura. The Urakami valley, its factories, neighborhoods and cathedral were struck by heat and blast. Hills shaped the destruction without sparing the people caught beneath the cloud. Survivors entered a city of broken buildings and desperate need, with radiation adding an unseen aftermath to visible wounds. Three days after Hiroshima, another city had learned how abruptly ordinary life could be torn away.",
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
    "description": "Before dawn on 16 July 1945, the Trinity Gadget detonated above the Jornada del Muerto in New Mexico. The tower vanished in a flash, and sand near ground zero became green glass. This was the first nuclear explosion: an experiment whose result opened a new and darker chapter in warfare. Beyond the instruments and observation posts lay a real landscape, carrying the radioactive aftermath of a secret test. The desert returned to daylight; the world could not return to the morning before it.",
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
    "description": "On 6 July 1962, the Sedan experiment detonated beneath the Nevada desert as part of Project Plowshare, a program exploring nuclear excavation. The earth rose, broke open and fell back around a crater roughly 390 meters across. A promise of peaceful earthmoving left a vast wound in the landscape and radioactive debris above it. The crater remains a physical record of that bargain: enormous force could move a mountain of soil, but the disturbed ground and its contamination were part of the result.",
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
    "description": "On 1 March 1954, Castle Bravo erupted on Bikini Atoll with a yield far above its planners' expectations. The reef disappeared beneath a towering cloud, while radioactive fallout traveled beyond the immediate test area. Marshallese communities and the crew of the Japanese fishing boat Daigo Fukuryu Maru were exposed. The bright tropical setting concealed no safe boundary between an experiment and the people downwind. Long after the cloud dispersed, displacement, contamination and the consequences of exposure remained. This is an illustration of a real catastrophe, not an archival photograph.",
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
    "description": "On 30 October 1961, the Soviet Union detonated Tsar Bomba over Novaya Zemlya. The roughly 50-megaton test was the largest nuclear explosion ever conducted. A specially modified bomber released a weapon too large for its ordinary bomb bay, and an immense flash and cloud rose over the Arctic test landscape. Its scale was a demonstration of power with little resemblance to a usable human place beneath it. The distant, cold setting made the spectacle appear abstract; the energy released was brutally real.",
    "sources": [
      "https://www.nuclearweaponarchive.org/~nuclearw/Russia/TsarBomba.html"
    ]
  },
  "rds-1-semipalatinsk": {
    "id": "rds-1-semipalatinsk",
    "imageSrc": "/media/scenarios/rds-1-semipalatinsk.webp",
    "imageWidth": 1200,
    "imageHeight": 800,
    "description": "On 29 August 1949, RDS-1 detonated at Semipalatinsk in the Kazakh steppe, marking the Soviet Union's first nuclear test. The blast ended the United States' nuclear monopoly and began a long test history at this site. Settlements and grazing land existed beyond the test structures; fallout did not stop at their boundaries. Later research has examined radiation exposure among surrounding populations. The cloud belongs to one morning, but the broader testing legacy reaches into land, health and memory across generations.",
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
    "description": "On 13 February 1960, France detonated Gerboise Bleue near Reggane in the Algerian Sahara, then under French colonial rule. A tower-mounted device made France a nuclear power, and a harsh desert landscape became a radioactive test site. Parliamentary records describe contamination extending beyond the immediate ground-zero area. Calling the region remote did not make it empty, or make the aftermath disappear. Behind the official milestone were exposed land, personnel and surrounding communities, and a legacy whose consequences outlasted the brief glare over the sand.",
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
    "description": "On 1 November 1952, local time, Ivy Mike detonated on Elugelab in Enewetak Atoll. The experimental apparatus demonstrated a full-scale thermonuclear explosion; the island beneath it was obliterated, leaving a crater where coral and vegetation had stood. Instruments measured success while the geography itself was erased. The lagoon and the surrounding islands became part of the aftermath of Pacific testing, not a blank background for it. In this scene, the enormous cloud rises over a place that would no longer exist in its previous form.",
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
    "description": "On 31 May 1957, Britain tested Orange Herald near Malden Island during Operation Grapple. The powerful fission explosion formed part of the drive toward a British thermonuclear capability. A low coral island and open Pacific horizon became the setting for another immense cloud, watched and measured by test personnel. The official yield describes energy; it does not describe what it means to work beneath the threat of fallout or to turn an ocean landscape into a proving ground. The image is an artistic reconstruction of that event.",
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
    "description": "On 24 August 1968, Canopus detonated above Fangataufa Atoll in French Polynesia. Suspended beneath a balloon, the device produced France's first full-scale thermonuclear test, with a yield of about 2.6 megatons. The bright lagoon and reef were transformed into a stage for overwhelming heat, blast and radioactive fallout. A scientific and military milestone was also an intervention in a living Pacific environment. The cloud vanished from the horizon; the history of testing, exposure and altered landscapes did not vanish with it.",
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
    "description": "In this hypothetical scenario, a Tsar Bomba-scale explosion would rise above Midtown Manhattan. The skyline would cease to be a collection of familiar towers and become a fragile surface beneath a vastly larger event. Heat, blast and shattered infrastructure could turn connected neighborhoods into isolated places of darkness and loss. This imagined scene is deliberately bleak: the bridges, streets and windows make the scale human. It is an illustration of a conditional catastrophe, not an event that happened or a forecast of individual buildings and lives.",
    "sources": [
      "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
    ]
  },
  "tokyo-100": {
    "id": "tokyo-100",
    "imageSrc": "/media/scenarios/tokyo-100.webp",
    "imageWidth": 1200,
    "imageHeight": 800,
    "description": "This hypothetical 100-megaton event imagines a colossal blast over central Tokyo. The dense pattern of streets and buildings would lie beneath a glare large enough to make the city feel suddenly small. Transport, power and communications could fail together, leaving survivors cut off from help across an urban landscape built on constant connection. The red cloud is an artistic warning about scale, not a calculated skyline of destruction. No such event occurred here, and the simulator cannot predict its detailed human, structural or environmental aftermath.",
    "sources": [
      "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
    ]
  },
  "europe-continent": {
    "id": "europe-continent",
    "imageSrc": "/media/scenarios/europe-continent.webp",
    "imageWidth": 1200,
    "imageHeight": 800,
    "description": "This hypothetical small-continent study places an extreme energy release in Central Europe. Towns, fields and transport corridors would become details beneath a cloud drawn at a scale beyond familiar weapons. The image imagines a region losing its ordinary distances: neighboring countries would no longer feel safely beyond the horizon. It is a dark illustration of the limits of human shelter, rather than a measured prediction of continental devastation. At this yield the screening model is far outside its calibrated range; the imagined aftermath must not be mistaken for a forecast.",
    "sources": [
      "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
    ]
  },
  "north-america-continent": {
    "id": "north-america-continent",
    "imageSrc": "/media/scenarios/north-america-continent.webp",
    "imageWidth": 1200,
    "imageHeight": 800,
    "description": "This hypothetical continent-scale event begins over the interior of North America. A vast blast would loom above the plains, dwarfing the roads, settlements and agricultural land that normally define the view. The imagined scene turns openness into exposure: distance alone would offer little comfort beneath such an impossible horizon. The consequences shown are artistic, and no claim is made about particular cities or populations. These yields exceed the model's calibrated range. The illustration asks what overwhelming scale would feel like, while leaving unsupported forecasts and casualty counts unwritten.",
    "sources": [
      "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
    ]
  },
  "africa-continent": {
    "id": "africa-continent",
    "imageSrc": "/media/scenarios/africa-continent.webp",
    "imageWidth": 1200,
    "imageHeight": 800,
    "description": "This hypothetical large-continent study imagines an extreme release over Central Africa. Forest, rivers and distant settlements would be reduced to a thin living surface beneath an enormous red cloud. The darkness of the scene lies in that imbalance: landscapes that sustain generations could become the backdrop to a force no community could meaningfully confront. This is an illustrative thought experiment, not a historical event or a reliable model of continental damage. Its yield lies far outside calibration, and the image does not predict climate, famine, radiation doses or human losses.",
    "sources": [
      "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
    ]
  },
  "asia-continent": {
    "id": "asia-continent",
    "imageSrc": "/media/scenarios/asia-continent.webp",
    "imageWidth": 1200,
    "imageHeight": 800,
    "description": "This hypothetical large-continent event is placed in Central Asia. The wide land, mountain horizons and scattered routes would lie beneath a blast imagined on a scale that overwhelms them all. What looks empty from far above still contains lives, water, movement and memory; the red cloud would make those ordinary connections seem terribly slight. The scene is intentionally ominous, but its consequences remain conditional and artistic. This extreme energy study exceeds the simulator's calibrated physics and cannot establish the fate of a continent or the people beyond the frame.",
    "sources": [
      "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
    ]
  },
  "australia-continent": {
    "id": "australia-continent",
    "imageSrc": "/media/scenarios/australia-continent.webp",
    "imageWidth": 1200,
    "imageHeight": 800,
    "description": "This hypothetical continent-scale study places an extreme blast above the Australian interior. A huge red cloud would rise over desert ranges and long, thin roads, making the distance between isolated places feel like abandonment. The landscape is not empty simply because the view is wide; communities, Country and ecosystems give it meaning beyond a map. The image imagines that living setting under a catastrophic sky. It depicts no real event, and this out-of-range screening model cannot predict continent-wide damage, ecological collapse or the experience of any particular community.",
    "sources": [
      "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
    ]
  },
  "point-nemo-hemisphere": {
    "id": "point-nemo-hemisphere",
    "imageSrc": "/media/scenarios/point-nemo-hemisphere.webp",
    "imageWidth": 1200,
    "imageHeight": 800,
    "description": "This hypothetical hemisphere-scale event is centered near Point Nemo in the South Pacific. Open ocean would stretch below an immense, unreal-looking blast, with no skyline to make its size comforting or comprehensible. A place chosen for its remoteness would become the center of an imagined catastrophe whose scale makes ordinary boundaries meaningless. The red scene is an artistic stress test, not evidence that the ocean could contain such an event or a prediction of global effects. At this yield, blast, atmosphere and climate lie beyond the model's calibrated assumptions.",
    "sources": [
      "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
    ]
  },
  "earth-thought-experiment": {
    "id": "earth-thought-experiment",
    "imageSrc": "/media/scenarios/earth-thought-experiment.webp",
    "imageWidth": 1200,
    "imageHeight": 800,
    "description": "This hypothetical one-petaton stress test uses a global map origin, not a proposed target or a real weapon. From a distant view, Earth would appear as a fragile, inhabited surface beneath an imagined release of almost ungraspable scale. There would be no familiar city edge in the picture, only the unease of seeing a whole world treated as an experimental frame. The illustration is dark by design. The simulator's screening formulas cannot support literal planetary consequences at this yield, and this scene makes no claim to predict them.",
    "sources": [
      "https://github.com/hanegraaff/nuclear-sim/blob/main/site/docs/model.md"
    ]
  }
};
