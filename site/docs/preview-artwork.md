# Preview artwork and event descriptions

The desktop preview pairs one of 16 scenario illustrations with a short, researched event description: 11 historical events and five hypothetical studies. The panel labels its image **AI-generated illustration**. Historical prose describes the actual event; hypothetical prose uses conditional language. The images are cinematic interpretations, not historical photographs, surveyed reconstructions, or calibrated predictions. The [catalog research ledger](catalog-research.md) records the sources and qualifications for event text and the 49 retained device outlines.

## Generation and provenance

The eleven active historical images were generated on 2026-11-09 with the built-in `image_gen` tool, one call per scene. Their [exact prompts, consulted sources, output mappings, and encoding record](scenario-artwork-prompts-plan19.json) preserve the scene briefs. The five retained hypothetical images—Manhattan, Tokyo, Central Europe, North America, and Australia—remain byte-for-byte unchanged; [SHA-256 evidence](../../docs/plan-19-preserved-artwork.json) records their pre-change hashes.

The [original twenty-image prompt set](scenario-artwork-prompts.json) is retained as historical provenance for the original generation and surviving hypothetical artwork. It does not describe the current inventory. Removed above-ceiling artwork remains recoverable through Git history rather than being delivered to the browser. No CLI fallback, external stock hotlinks, or runtime image generation is used.

## Scene direction and review

All active scenes share red/black photographic duotone, grain, atmospheric haze, and pale-red highlights. That style does not impose the same cloud size, viewpoint, or event stage. Historical settings range from Hiroshima’s branching river delta and Nagasaki’s industrial valley to Trinity’s early desert fireball, Sedan’s dirty excavation plume, Pacific water/debris bases, Arctic ridges, steppe, and Sahara. Compositions reflect the event’s location, period, catalog yield, burst context, and plausible relative aftermath while remaining artistic estimates.

Every historical full-size output and the [active sixteen-image contact sheet](scenario-artwork-contact.webp) were inspected. The [scene review](../../docs/plan-19-artwork-review.md) records each accepted distinction. Cloud appearance, exact structures, geography, timing, and destruction are not quantitative model results. Region-scale hypothetical scenes are especially conceptual. The five unchanged hypothetical images retain their original dramatic treatment.

Descriptions target 30–45 words in a dark, ominous, sober voice that separates fact from speculation. They are static reviewed prose, not generated on selection. Each complete image displays at its natural 3:2 ratio without a cover crop. In limited space, a popup-owned outer viewport scrolls the complete image and text by wheel, scrollbar dragging, or Shift+Page keys while dropdown focus remains in place. There is no visible instruction footer; keyboard scrolling and accessible instructions remain available. Text stays readable if an image is pending or fails. Image, prose, viewport, and scrollbar disappear together when the dropdown loses focus or closes.

## Active assets and performance

The application uses `public/media/scenarios/{scenario-id}.webp` for the 16 retained scenarios. All are **1200 × 800 pixels**; generated historical PNGs were resized with Lanczos and encoded as WebP quality 78, method 6. The active image set totals **1,319,072 bytes**, with a largest file of **144,078 bytes**. The 49 SVGs total **31,033 bytes**, with a largest file of **838 bytes**. Combined active preview artwork is **1,350,105 bytes**, below the 300 KiB per-scenario, 20 KiB per-outline, and 8 MiB aggregate budgets.

Only the actively browsed candidate requests artwork. Dossier/text modules load on demand; the closed initial picker and ineligible mobile layouts load no preview content or images. The application-owned decoded-image cache is bounded, and late completion cannot restore a panel dismissed by dropdown blur. Browser and performance evidence documents transfer sizes, request timing, and responsiveness separately from this asset inventory; release checks and provenance belong in the roadmap.
