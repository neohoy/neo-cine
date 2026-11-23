# Persona Pop — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *一起跑通 Run It Through* (40 s) · `persona-pop.mp4` · source in [`demo/`](demo/) · 中文版：[DEMO.zh-CN.md](DEMO.zh-CN.md)

**An unofficial fan film.** Its two characters are original drawings named after two real AI coding assistants, Claude (Anthropic) and Codex (OpenAI): 小克 (Klaude) and 扣扣 (Kodex). No logo, mascot or interface of either product is drawn; the names appear on name chips and in the lyrics only. The film is not made, endorsed or reviewed by either company, and the names belong to their owners. The cast was generated with the Codex CLI's image tool (`demo/cast.json` holds every prompt).

## Story & structure

Logline: a user drops "make a sample cut" in a group chat; the thinker wants to think, the runner wants to run; they split the work, the tests go red, the frame freezes in silence, everything turns green on the chorus, and they hand the cut over.

Ten parts of 4 s (two bars at 120 BPM), most cut once inside: intro (title + chat → standoff), four verse lines, four chorus lines, outro. Native moves spent: surface and inside (s1), takeover (s2), flip wall (s3), red, freeze, green (s4–s5), lanes and tape (s6), collision (s7), drop on the beat (s9).

## Shots

| # | Time | Shot | Camera | Native move / note |
|---|---|---|---|---|
| 0a | 0–2 | title, group chat "做一支样片", both peek up | locked, title glyphs hop | frame 0 is the hook: the title is already up |
| 0b | 2–4 | diagonal split, two chest-up close-ups, "×", name plates | slam, shake, kicks | the title stays across the cut (same `data-rid`) |
| 1a | 4–5.45 | Klaude full figure, thinking card, timer 0.8 → 2.0 s | push-in on beats | |
| 1b | 5.45–8 | close-up on a blue ring field, drifting drafts, timer → "done in 6.0 s", bulb | slow push | slam: 等等让我想想; she sings it (mouth sheet), blinks twice |
| 2a | 8–9.45 | mint field, streaks, Kodex bursts in, Klaude knocked out | shake, half-beat kicks | slam: 别想了; she sings it (mouth sheet) |
| 2b | 9.45–12 | navy, code rain, terminal prints a line per keystroke, pose → point | burst rays, kicks | the character acts, the interface changes |
| 3a | 12–13.95 | peach field, storyboard.json types in, papers, pen line | beat kicks | |
| 3b | 13.95–16 | dark grid, 12 cast tiles flip in, counter to 12/12 | slow pull-out | slam: 我出立绘 |
| 4a | 16–17.95 | test rows turn red one per beat, red tint rises, glitch bars | a shake per failure | |
| 4b | 17.95–20 | full red, two manga panels of panic, falling ×, a "FAIL" stamp | impact frame, shake | slam: 谁也别怪谁; **freeze 19.5–20, true silence** |
| 5a | 20–21.95 | rows flip green with rings, status PASS 12/12 | impact frame, kicks | slam: 跑通，跑通 |
| 5b | 21.95–24 | green field, "12/12", tape band, both cheer, confetti | impact frame, hops on beats | |
| 6 | 24–28 | diagonal split: her lane with a lock, tape, then the light flips to the other lane | shakes on locks | one shot, the cut is the light |
| 7a | 28–29.95 | navy, two version cards collide twice and fuse, sparks | shakes, flashes | slam: 合并，合并 |
| 7b | 29.95–32 | resolved card, stamp "已合并", ink dots, pose → peace | shake on stamp | |
| 8a | 32–33.95 | film strips running both ways, render card 0 → 100 % | half-beat kicks | |
| 8b | 33.95–36 | bright blue, Kodex points into the lens and grows, "exported" pill | scale push | slam: 交给你 |
| 9 | 36–40 | title drops, stamp "已交付", credits card, both drop onto beats 37 and 37.5 | shake on stamp | HUD leaves before the last part |

## Score structure

No vocal: the backing and a lead that sings the lyrics, synthesised by `kit/tools/mix.py` from `mv.json` and the picture's events.

- 120 BPM, C major. Intro (2 bars, arpeggio only, muffled), verse (8 bars: C–G–Am–F, half-time kick and snare, sixteenth square arpeggio, saw bass), chorus (8 bars: F–G–Em–Am, four-on-the-floor, a pad, octave jumps in the arpeggio), outro (one hit and a held chord).
- A snare roll in the last verse bar is cut by the freeze; **19.52–19.84 s is true silence** (−180 dB), then the cut's whoosh breathes into the chorus downbeat at 20.0 s.
- Two accents are written on the grid and checked against the picture: the crash at 20.0 s (the impact frame) and the kick at 36.0 s (the cut to the outro), both 0 ms off.
- Lead: 72 notes, one per glyph; Klaude a soft triangle, Kodex a narrow pulse, duets both with a third below.
- Mix: −14.0 LUFS with one gain, true peak −2 dB.

## Palette & props

- Cast scale: every full figure of a character is placed at one scale, measured on the head (`assets/chars/meta.json`); the two cheers are jumps, lifted 0.17 and 0.13 of a body height.
- Klaude `#D97757` (terracotta), Kodex `#148F65` (deep mint) with a black chip and `#7CF5C4` glow text; duet chip split.
- Ground `#F4EFE6`; fields: navy `#1E2547`, mint `#2FBF8F`, red `#E5484D`, green `#2F9E62`, blue `#4C6FFF`, ring blue `#E8ECFF`, peach `#F6DCCD`, terminal `#151A33`.
- Cast: 12 full-figure poses and 6 chest-up close-ups on magenta, plus two 2×2 mouth sheets on a transparent background (`demo/cast.json`), cut to WebP in `demo/assets/chars/`.
- Props: a group chat, a thinking card, a terminal, storyboard.json, a test list, two file lanes with locks, two version cards, a render card, film strips, a "样片进度" progress HUD.

## End card

The last part shows the title 样片 v001 with a green "已交付" stamp and a credit card: 作词 分镜 动效 — Claude; 角色立绘 — Codex · image_gen; 主旋律 — 代码合成; NEO-Cine — 拟人 MV. The fan-film note is here and in `demo/CREDITS`, not on screen.

## Build notes

- `demo/mv.json` (timing, sheet of lyrics, score), `demo/cast.json` (characters, prompts, image list), `demo/scenes.js` (the ten parts), `demo/index.html` (fonts and scene styles), `demo/assets/chars/` (cut-out cast and `meta.json`, in git), `demo/cast/raw/` (originals: 18 on magenta, 2 transparent sheets; not in git).
- `sh styles/persona-pop/demo/build.sh v004` runs `kit/tools/make.sh`: glyph times → cut-outs, scale and sheets → fonts → events → mix → render (1080×1920, 30 fps, 1200 frames; the whole build took about 3 minutes on a laptop with 3 workers) → mux → readcheck → poster.
- Review: `node core/render/still.mjs styles/persona-pop/demo --range 0.6:40:1.6 --size 1080x1920 --out <dir>`, then `core/render/sheet.py`.
- Readcheck: every lyric line passes; interface text, file names, name plates, slams and stamps that repeat a lyric are `data-pass`.
- Pitfalls met here: full-width text boxes (`left:0; right:0`) leave the frame when the camera shakes or kicks, and readcheck then calls them never fully visible: inset them; symbols ✗ ✎ ✳ are in none of the three fonts.
