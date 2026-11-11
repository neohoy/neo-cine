# Atlas Scroll — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *From Thirteen to Fifty* (十三到五十, 56 s) · `atlas-scroll.mp4` · source in [`demo/`](demo/)

An unofficial film about real history. Borders and railways by year are OpenHistoricalMap data (CC0); the base map is OpenStreetMap data (© OpenStreetMap contributors, ODbL 1.0). It is an illustration, not a survey; the dates on screen are checked in [`demo/FACTS.md`](demo/FACTS.md).

## Story & structure

A wagon leads the map west; halfway across, the railway that grew behind it overtakes it.

- **Set-up (0–22 s, 1776–1848).** The roll opens from the Atlantic and the thirteen states take their colours within three seconds. The wagon crosses the Appalachians by the National Road to St. Louis; the Louisiana Purchase unrolls the sheet to the Rockies in one jump; the wagon takes the Oregon Trail, stops for a beat at South Pass and reaches the Pacific.
- **Turn (22–34 s, to 1869).** Looking back east, railways come on year by year. A train leaves Omaha, the lines meet at Promontory on a bar line, and the train passes a second wagon. From here the train is the guide.
- **Ending (34–56 s, to 1959).** The network fills in, the last territories become states, forty-eight. One pull-out to the whole roll; after a silence two small plates are stamped on, Alaska and Hawaii, and the counter reaches fifty. The title appears in a cartouche over the Atlantic.

Native moves spent: colour settling (48 times), the jump (1803), the traveller hands over (1869), the network grows by date (to 1912), the counter (throughout, with the last two after a silence), insets (1959).

## Shots

| # | Time | Years | Shot | Camera | Native move / note |
|---|---|---|---|---|---|
| 1 | 0–3 | 1776 | the Atlantic coast | frame 1,500 km, drifting west | the roll covers 850 km in 0.8 s; thirteen states by 2.4 s |
| 2 | 3–9 | to 1803 | Appalachians to the Mississippi | travel with the wagon | Vermont, Kentucky, Tennessee, Ohio join |
| 3 | 9–15 | 1803–1821 | the Louisiana Purchase | pull out to 2,350 km | the jump: the roll runs to the Rockies in 2.4 s |
| 4 | 15–22 | 1840s | the Oregon Trail | push to 720 km, follow the wagon | stop at South Pass 19.6–20.4 s; silence |
| 5 | 22–31 | 1848–1869 | the plains, looking back | pull to 2,100 km, then push | railways arrive by year; whistle at 26.1 s before the train at 26.6 s |
| 6 | 31–34 | 1869 | Promontory | 560 km, follow the train | the lines meet at 31.0 s; the train passes the second wagon |
| 7 | 34–42 | to 1912 | the filling map | slow travel at 2,500–2,750 km | a second train on the northern line; 48 states |
| 8 | 42–49.5 | 1912, 1959 | the whole roll | pull out to 3,950 km | insets stamped at 46.6 and 47.2 s |
| 9 | 49.5–56 | | title | locked | cartouche, then the data credit at 51 s |

## Score structure

120 BPM, G major, original; bars of 2 s starting at 1.0 s, so 3, 9, 15 and 31 s are bar lines.

- **0–3 s**: one banjo note per state as the thirteen light up (a rising pentatonic run), a low bass note and one strum.
- **3–9 s**: guitar boom-chick with bass, a harmonica phrase.
- **9 s**: one large strum for the Purchase; then half bars only.
- **15–22 s**: guitar picking and harmonica alone, wind underneath; **19.55–20.4 s** silence at South Pass; a single harmonica note restarts.
- **22–31 s**: bass and guitar return, banjo rolls in eighths, then sixteenths from 27 s, brushes doubling, foot stomps closing up from 29 s.
- **31 s**: the heaviest hit (stomp, full strum, spike). **31–42 s**: the full band, banjo in sixteenths, harmonica tune; states keep plucking their notes on top.
- **42–46 s**: two held chords; **46.0–46.6 s** silence; **46.6 and 47.2 s** two stamps with a banjo fifth; **49.5 s** a last G chord and a three-note harmonica tag.
- Levels printed by `mix.py` for this film: score −24.0 dB, reverb −33.5 dB, foley −29.0 dB, ambience −40.2 dB (RMS). Film loudness −14.9 LUFS.

## Palette & props

The palette in STYLE.md §3 is this film's. Data: 48 states in 94 border versions, 111 territory versions, 26 outlines of the United States (1776–1912), 9,836 railway segments opened before 1913. The original thirteen are shown from 1776 with their 1783 borders and light up in the order they ratified the Constitution; every other state takes the start date of its first boundary in OpenHistoricalMap, except Texas, whose earlier namesakes are the Mexican province and the republic.

Travellers: a covered wagon with two oxen (the National Road, then the Oregon Trail through Fort Kearny, Chimney Rock, Fort Laramie, Independence Rock, South Pass, Fort Hall, Fort Boise and The Dalles); a second wagon in Utah; a locomotive with three cars (Omaha to Promontory to Sacramento, then St. Paul to Seattle). Their positions are approximate and follow well-known places, not surveyed track.

Map view: North America from 22° to 52° N, Albers equal-area conic (standard parallels 29.5° and 45.5° N, origin 96° W 37.5° N). Only the borders of the United States, its states and its territories are drawn; other land is bare paper.

## End card

The whole roll on a dark table. Lower left, the compass and two small plates, ALASKA 1959 and HAWAII 1959; lower right, over the Atlantic, the cartouche: FROM · THIRTEEN TO FIFTY · 十三到五十 · 1776 — 1959. Below the roll: Map data: OpenHistoricalMap (CC0) and © OpenStreetMap contributors. No signature.

## Build notes

| File | What it draws or does |
|---|---|
| `demo/index.html` | fonts and the canvas |
| `demo/timeline.js` | the one source of time: the year, the roll, camera keys and follow weights, the travellers' routes, captions; and the projection |
| `demo/atlas.js` | the recipes: paper, hachured hill, wagon, locomotive, compass, capitals, star, plate |
| `demo/main.js` | data → versions by year, neighbour colouring, the map, the travellers, the roll, the plates, sound events, `window.render` |
| `demo/mix.py` | score, foley, ambience and bus |
| `demo/tools/prep.py` | `data/history.json` (the full fetch, not in git) → `data/us.json` |
| `demo/data/` | `us.json` (OpenHistoricalMap), `land.json`, `water.json`, `lakes-*.json`, `peaks-*.json` (OpenStreetMap) |
| `demo/FACTS.md` | every date on screen and its source |
| `demo/build.sh` | every step in order, the data commands included |

- Build: `sh styles/atlas-scroll/demo/build.sh v002` (events → mix → picture at 24 fps with 4 workers → mux at −14 LUFS, BT.709 → reading-time check → poster at 53 s and style frame at 31.3 s). Each build is a new version; nothing is overwritten.
- Render time: Apple-silicon laptop, 4 workers, 1,344 frames in about a minute; the mix takes about a minute.
- Review: a frame every 2.8 s, then single frames around 0.3–2.4 s (the roll), 19.4–20 s (South Pass), 30.6–31.4 s (the meeting) and 46.6–50.4 s (the count and the title).
- Pitfalls of this film:
  - Rivers by regular expression over the whole country timed out twice; the Great Lakes had to be fetched two at a time, and eastern peaks only for the southern Appalachians.
  - `--bbox -128,…` was read as an option; the fix is `--bbox=-128,…`.
  - The first title cartouche hung over the edge of the plate; it is now placed in plate coordinates, not by longitude and latitude.
  - The second wagon stood exactly under the train; its route was moved half a degree south.
  - Railways in the Midwest buried the state names until their opacity was tied to the zoom.
  - In v001 the year plate kept running under the captions: "1869" was still up when the plate read 1877. Since v002 the year is keyed so that it moves one year at most while a caption is up (`YEAR` in `timeline.js`).

## content.json fields (scene styles only)

Not a scene style.
