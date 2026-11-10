# Selection artwork review

Reviewed on 2026-11-09 for R-16–R-18. The active catalog has 49 fixed device outlines and 16 scenario illustrations. The [outline audit](../site/docs/catalog-research.md#retained-exterior-review--selection-refinement) documents each retained entity, reference, uncertainty, and geometry decision; its [browser contact sheet](plan-19-outlines-contact.png) was inspected. Every silhouette remains an estimated public exterior illustration rather than a construction drawing.

The eleven historical illustrations were regenerated with the built-in `image_gen` tool, one call per scene. Every full-size generated output was inspected before encoding; the [complete active contact sheet](../site/docs/scenario-artwork-contact.webp) was inspected again after integration. The [exact prompt and source set](../site/docs/scenario-artwork-prompts-plan19.json) records the scene briefs, consulted evidence, output mappings, original generated filenames, and encoding. The older prompt set remains provenance for the original generation and surviving hypothetical images.

| Scene | Accepted distinction |
| --- | --- |
| Hiroshima | Elevated view across a branching river delta; broad wreckage, fires, bridges, and a displaced smoke column put the city geography ahead of a generic cloud portrait. |
| Nagasaki | A hillside viewpoint frames industrial ruins in a narrow valley, with surrounding ridges shaping the visible destruction. |
| Trinity | The first luminous fireball above a dark desert plain, before a mature mushroom, differs in both moment and silhouette. |
| Sedan | A dirty excavation plume, crater edge, and ground-hugging ejecta replace a luminous atmospheric mushroom. |
| Castle Bravo | A distant aerial atoll arc and lagoon establish the large surface-test scale. |
| Tsar Bomba | Remote snowy ridges, Arctic water, and a huge elevated cloud with stacked condensation layers distinguish the largest historical test. |
| RDS-1 | A low steppe view, grass foreground, and distant test structures frame a smaller tower-test column. |
| Gerboise Bleue | Stony Sahara terrain, angled dust, and a tall uneven plume differ from Trinity's dark early fireball. |
| Ivy Mike | A sea-level view into a turbulent water/debris base conveys island loss and early thermonuclear cloud growth. |
| Orange Herald | A narrow coral shoreline and detached offshore airburst create a more restrained Pacific view. |
| Canopus | A visible enclosing lagoon rim and elevated cloud establish the French Polynesian atmospheric test setting. |

All scenes use red/black photographic duotone, grain, haze, and pale-red highlights. Viewpoint, horizon placement, cloud shape, event stage, and environmental damage vary deliberately. These are cinematic interpretations informed by period geography, catalog yield, and burst context. Their clouds, timing, structures, and destruction are artistic estimates: images are neither archival reconstructions nor calibrated simulator output. For example, a recognizable river/reef is a setting cue, not a surveyed map, and a bright cloud is not a quantitative damage boundary.

The five surviving hypothetical images—Manhattan, Tokyo, Central Europe, North America, and Australia—were retained byte for byte. [Pre-change SHA-256 evidence](plan-19-preserved-artwork.json) records their hashes. The four removed above-ceiling scenarios and three removed device assets remain recoverable from Git history and original provenance, rather than being sent to the browser.

All scenario files retain 1200 × 800 dimensions and the existing full-image 3:2 display contract. Generated PNGs were resized with Lanczos and encoded as WebP quality 78, method 6. The sixteen scenario assets total 1,319,072 bytes; the largest is 144,078 bytes. This is below the per-image and aggregate artwork budgets. Browser interaction, decode/cache behavior, and animation responsiveness are verified separately from this asset review.
