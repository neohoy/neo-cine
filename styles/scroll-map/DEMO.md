# Scroll Map — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *Shenzhen, Unrolled* (鹏城长卷, 48 s) · `scroll-map.mp4` · source in [`demo/`](demo/)

An unofficial film about a real place. The map is OpenStreetMap data (© OpenStreetMap contributors, ODbL 1.0), drawn as an illustration, not a survey.

## Story & structure

A brush sets out to draw the coast of Shenzhen from end to end; halfway along, the city grows faster than the brush.

- **Set-up (0–17 s).** The scroll unrolls from the east. Ink traces the Dapeng peninsula, mountains stand up, waves fill the bays. Dapeng Fortress, the walled town that gave the city its nickname 鹏城, is the only town on the paper, and the only cinnabar is its slip.
- **Turn (17–37 s).** The camera hurries west past Wutong Mountain. At Luohu, cinnabar appears at the border crossing and spreads through the road net; in central Futian the towers rise as tiered pavilions, Ping An Finance Centre last and tallest.
- **Ending (37–48 s).** One pull-out to the whole scroll while the last of it is unrolled and painted. The title is written on the blank paper at the right end and sealed. The film opened on the first stroke and closes on the seal.

Native moves spent: unrolling (opening and reveal), the brush leading (the peninsula), mountains standing up (throughout), cinnabar spreading (the turn), towers as pavilions (the signature shot), slip and seal (the fortress, the ending).

## Shots

| # | Time | Shot | Camera | Native move / note |
|---|---|---|---|---|
| 1 | 0–5 | the roll leaves the right-hand rod | frame 15 km, drifting west | unrolling; ink starts at 1.0 s |
| 2 | 5–12.6 | Dapeng peninsula | lateral travel, frame 17 km | brush leads the colour by 3.5 km |
| 3 | 12.6–17 | Dapeng Fortress | push to 6 km, hold | red slip at 14.5 s after a silence |
| 4 | 17–24 | Dapeng Bay, Yantian, Wutong Mountain | pull to 26 km and travel west fast | the fronts stretch apart |
| 5 | 24–31 | Luohu to Futian | push from 26 km to 3.5 km | cinnabar spreads from Luohu Port |
| 6 | 31–37 | central Futian | slow drift, frame 3 km | pavilions tier by tier, Ping An 32–35 s |
| 7 | 37–41.5 | the whole scroll | one pull-out to 62 km | the roll reaches the left end at 40.6 s |
| 8 | 41.5–48 | title and seal | locked | title written 42.2–44.2 s, seal 44.8 s |

## Score structure

60 BPM, D yu pentatonic (D F G A C), original; every hit is on a second or a half.

- **0–13 s**: one open low string at 1.0 s, a harmonic at 3; then a sparse guqin line with slides, xiao from 8 s.
- **13.3–14.5 s**: near silence (surf only); the fortress slip lands on one harmonic and one low string.
- **17–24 s**: guqin in running eighths, xiao long line, drum from 20 s, closing up to sixteenths into 24.
- **24 s**: the heaviest hit of the film (drum, low string, strummed fifth). Then pipa in sixteenths over drum and rim, a low guqin note every two bars, xiao above; the pipa goes up an octave at 33.5 s.
- **32–35 s**: a woodblock for each tier of Ping An, rising.
- **37 s**: a downward guqin sweep; the xiao's long D carries across the pull-out.
- **42.2–43.7 s**: one guqin note per written character. **44.25–44.8 s** silence. **44.8 s** the seal (drum, block, thump), then two harmonics ring out.
- Levels printed by `mix.py` for this film: score −22.4 dB, reverb −27 dB, foley −29 dB, ambience −32 dB (RMS). Film loudness −14 LUFS. `mix.py` ends with `neo/audio/master.py`: one gain for the whole mix to −14 LUFS, with only the peaks shortened, so the quiet opening stays quiet and the cinnabar stays the heaviest section. It names the picture event each accent belongs to (`neo/audio/cues.py`): six cues (the slip at 14.5 s, the cinnabar at 24 s, the roll's end…), all 0 ms from the picture; the wood blocks of the tower's tiers, the brush and the seal take their times from the events.

## Palette & props

The palette in STYLE.md §3 is this film's. Slips: pale `#f2e8cc` with a cinnabar frame; the two old towns (Dapeng Fortress, Nantou) on cinnabar slips. Seal: 深圳. Mountains come from 3,040 woodland areas and the named peaks of 60 m and more; the buildings from 4,825 footprints in central Futian: the 1,143 that carry a height of 24 m and more are pavilions (Ping An Finance Centre, 599 m, has 13 tiers), the others halls drawn along their footprints.

Map view: a coastal strip, 113.74–114.66° E, 22.40–22.74° N, north up, no boundary lines; the New Territories at the bottom edge are drawn exactly like the rest.

## End card

The whole scroll on a dark table; at its right end the title 鹏城长卷 and the seal 深圳. Below the scroll, one small line: NEO-Cine · 舆图长卷. The data credits and licences are in [`demo/CREDITS`](demo/CREDITS) and at the top of this file, not on screen: a library demo signs off with NEO-Cine only.

## Build notes

| File | What it draws or does |
|---|---|
| `demo/index.html` | fonts and the canvas |
| `demo/timeline.js` | the one source of time: camera keys, the roll, ink and cinnabar fronts, tower timing, title, labels |
| `demo/ink.js` | the recipes: paper, waves, ink stroke, peak, hall and pavilion, slip, seal |
| `demo/main.js` | data → paths and signs, the layers and their fronts, the scroll and roll, sound events, `window.render` |
| `demo/mix.py` | score, foley, ambience and bus |
| `demo/data/coast.json`, `futian.json` | the map, made by `neo/geo/osm.py` (commands in `build.sh`) |
| `demo/tools/fonts.sh` | fetches the two fonts |
| `demo/build.sh` | every step in order |

- Build: `sh styles/scroll-map/demo/build.sh vNNN`, with the next free number (events → mix with the cue check and the level check → picture at 24 fps with 4 workers → mux at −14 LUFS, BT.709 → reading-time check → poster at 47 s and style frame at 36 s). Each build is a new version; nothing is overwritten.
- Render time: Apple-silicon laptop, 4 workers, 1,152 frames in about 90 seconds; the mix takes about 50 seconds.
- Review: a frame every 2 s, then 0.2 s steps around 0–1.6 s (unrolling), 24–25.6 s (cinnabar) and 44.6–45.6 s (seal).
- Pitfalls of this film:
  - The clip that hides everything west of the roll was `W` wide from an off-screen start, so close shots came out as blank paper.
  - Fish ponds in the south read as grey buildings until water outlines were thinned by zoom.
  - The first mountains were spiky and read as pine trees: the ridge curves were made convex.
  - Small building parts swarmed into dark blots: larger signs now claim their space first.
  - Every footprint drawn as the same small house made the centre of Futian a field of pagodas: only buildings of 24 m and more are pavilions now, the rest are halls of the footprint's size and direction.
  - A square building that faces east or west came out as a slab standing on end, its roof to the right: it is turned to face south before it is drawn.
  - Metro station boxes and underground malls were drawn as huge halls in the middle of squares: `neo/geo/osm.py` leaves out what is tagged underground.

## content.json fields (scene styles only)

Not a scene style.
