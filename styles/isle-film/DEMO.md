# Isle Film — the demo: 雪落寒山 Snowfall Peak

*中文版：[DEMO.zh-CN.md](DEMO.zh-CN.md)*

> One example among many. Don't reuse its story, arc, shots, props or timings.

**The isle:** 雪落寒山 (Snowfall Peak), the second isle of NEO-Isle, by the library's author: a lone peak under low cloud, a frozen lake, an ice fall on a rock step, yaks walking a loop on the snowfield, a stone hut with prayer flags; its wonder is that after dark, glowing fish swim under the frozen lake. `demo/world.js` is NEO-Isle's `examples/02-雪落寒山/world.js`, copied unchanged. Nothing was added to it for the film.

**The film:** 36.5 s, 24 fps, one long afternoon falling into night. Rendered on a recent Mac (the render desktop's WebGL was unavailable that day).

## Story and structure

From far away to one small life, through a day, to the one impossible thing, and back to the whole: arrive → yaks → the hut through dusk → the wait on the ice → the whole container at night.

## Shots

| s | Shot | Move | Hours | What happens |
|---|---|---|---|---|
| 0–12.5 | arrive | `through` (one long take, three keys) | 15.6 → 15.95 | the cube small in deep space drifts closer while the title card stands bottom left; the lens reaches the glass, the cube's edges sweep out, the sound opens (glass at 10.1 s) and the camera settles low over the yaks walking the snow. "牦牛走过雪原 / Yaks cross the snow" |
| 12.5–19 | hut | `timelapse` (dissolve 1.2 s, slow orbit) | 16.0 → 18.05 | two hours in six seconds over the stone hut and its prayer flags: shadows swing, the light turns gold then rose, the window comes on; chimes at 17 and 18. "石屋点灯 / A window lights up" |
| 19–26 | wonder | `wait` (dissolve 1.0 s, a 15 % creep) | 18.05 → 19.1 | low over the frozen lake at dusk, a fox trotting on the ice; a warm light rises under the ice and the fish swim into the middle of the frame. The score drops at 22.5 s; "冰下有光 / Light under the ice" follows 0.4 s later |
| 26–32.5 | whole | `pullback` (continues, three keys) | 19.1 → 19.9 | out from the ice, back through the glass (27.3 s), until the whole cube hangs in the dark with the hut window and the lake's glow inside; fade from 31.3 s |
| 32.5–36.5 | end card | | | NEO-Cine / 方寸影像 / Isle Film on black |

`clock` is 60: at film second 0 the isle has been running for a minute, which puts the yaks on the near side of their loop for the first close-up and the fish school on its way toward the lake's west lobe for the wait.

## Score structure

D major, 80 BPM (a beat of 0.75 s). A faint pad on Dmaj9 from the start and one bell every three to five seconds; the hour chimes at 17, 18 (day, high) and 19 (dusk, lower). 0.6 s of near-silence, then on the wonder's beat (22.5 s = 30 beats) a rising shimmer lands in five high bells, the bass and a Bm chord arrive, then G; a bell line walks the pentatonic on every beat. The end card returns to D and rings out. Beds: wind (muffled outside the glass, open inside), snow, a few crows by day. No water: the isle's water is frozen.

## Palette and props

All the isle's: white and blue-grey snow, dark spruce, brown yaks, the hut's warm window, the five-colour flags, the orange fox, the fishes' amber light. Text is warm white with a faint dark halo.

## End card

On black: "NEO-Cine" (Cormorant Garamond 500), "方寸影像" (Noto Serif SC 300, wide tracking), "Isle Film" (italic). Credits for the isle, the engine, the fonts and the tools are in `demo/CREDITS`.

## Build

```sh
sh styles/isle-film/demo/build.sh v002                   # the next free version
RENDER=remote sh styles/isle-film/demo/build.sh v002     # the picture on the render desktop
```

`demo/film.json` is the whole shot list; `build.sh` runs the kit's `make.sh` (page, fonts, events, sound, render, mux, readcheck, poster) with the output in the style folder, then the style frame at `frame_sec` (26.8 s: night has come, the light under the ice is up, the camera is still on the ice). Code entry points: `kit/page/plan.js` (shot list → state), `kit/page/film.js` (the page), `kit/tools/mix.py` (the sound), and NEO-Isle's film mode in `kit/isle-core/fangcun.js` (`filmFrame`).
