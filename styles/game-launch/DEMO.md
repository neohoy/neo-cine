# Game Launch — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *One Trade Run* 《一趟跑商》, a Demo trailer for 《归路：新旅途》 (41.1 s) · `game-launch.mp4` · source in [`demo/`](demo/) · 中文版：[DEMO.zh-CN.md](DEMO.zh-CN.md)

**The game and its material.** 《归路：新旅途》 © 开发者青椒, an indie developer; the gameplay footage, key art, character art, logo and music in this film are the game's own, used for this demo with the developer's permission. Source: the game's TapTap page, https://www.taptap.cn/app/984135: its 9 min 24 s gameplay recording and its images. Every claim on screen is listed with the page's wording or the recording time in [`demo/FACTS.md`](demo/FACTS.md); [`demo/CREDITS`](demo/CREDITS) says what is used where. The demo folder is itself a Game Launch project (`demo/game.json` is its whole cut list), made with the same kit as a user's film ([`PRODUCTION.md`](PRODUCTION.md)). It retells, on the library's page contract, the v002 cut of a HyperFrames trailer made for the game (same story, same shots, same plates), timed for the library's reading rule.

## Story & structure

Option A of three, "one trade run": one real number carries the film. In the recording, one round of selling at a trading post takes the money from 4351 to 14775 (6:07.6–6:18.7); that is the climax. Before it, the journey that gets there; after it, the other two systems and the crew; then where to play it. (Option B, a cast parade, one character per system, was dropped: the recording doesn't show which character does what, so it would invent; option C, the "lost log" book as a thread, would bury the trading the players like most.)

- **Set out (0–3.4 s).** The key art (the two leads on an airship's deck, the airship above), slowly pushed toward the airship; 「从一座城邦出发」 on its plate from frame 0. The key art's printed logo is kept out of frame.
- **Across cities (3.4–6.9 s).** The airship crossing the world map, pushed in 1.35×; 「跨城跑商」. A whoosh into the cut.
- **Read the market (6.9–10.3 s).** The regional market table, punched in 1.55× on the second beat; 「看准行情」 top left.
- **Buy low, sell high (10.3–20.1 s).** The trading post at 1.6× speed, punched in 1.92× onto the money counter on the second beat; 「低买高卖」. The counter climbs sale by sale; at 17.2 s it lands on 14775 and 「货钞 4351 → 14775」 wipes in with a pop. The footage drops to real speed at the landing, so 14775 stays on screen while the plate is read.
- **Explore (20.1–23.6 s).** The node map, then the 「遗失的日志」 event with its three paths; 「探索秘境」. A whoosh into the cut.
- **Turn-based (23.6–28.7 s).** The boss fight's skill and hit, then the auto battle, whose own banner 「自动战斗中」 is the caption; 「深度策略回合制」 across both. A long whoosh into the fight.
- **The crew and the end (28.7–38.6 s).** Six characters wipe in on half beats; 「招揽伙伴」; the iron band slides in and lands with the logo on the downbeat (a low impact); 「Demo 试玩已上线」, 「TapTap 搜索「归路：新旅途」」, 「PC · 安卓 · iOS」 one beat apart.
- **Sign-off (38.6–41.1 s).** A full-frame iron plate slides in over the end and lands on the cut: NEO-Cine and the style's name.

Native moves spent: the real number read in the UI, the plate made of the game, the slow push into the key art, two moments in one shot (twice), the game's banner as the caption, the crew on half beats, the band landing with the logo.

## Shots

140 BPM, 0.4286 s a beat; every shot is a whole number of beats, film second 0 is the recording's 6:02.255 and a beat.

| # | Time | Beats | Picture (recording time) | Camera | Plate |
|---|---|---|---|---|---|
| 1 | 0–3.43 | 8 | key art | view [419.75, 0, 1481.5], 1.0 → 1.1 about (1500, 100) | 从一座城邦[出发], bottom, from frame 0 |
| 2 | 3.43–6.86 | 8 | 7:30.0 world map | 1.0 → 1.35 about (1433, 1147), whole shot | 跨城[跑商], bottom |
| 3 | 6.86–10.29 | 8 | 6:35.8 market table | 1.0 → 1.55 about (2056, 1044), beat 1, 0.52 s | 看准[行情], top |
| 4 | 10.29–20.14 | 23 | 6:07.6 trading post at 1.6×, then 6:18.667 at 1× | view [0, 263, 3116] → [1100, 1453.5, 1000], beat 1, 0.52 s | 低买[高卖] to 6.85 s; 货钞 4351{→}[14775] at 6.87 s |
| 5 | 20.14–23.57 | 8 | 1:30.3 node map (4 beats), 1:16.4 the log's three paths (4 beats) | 1.08 → 1.22, then 1.32 → 1.42 | 探索[秘境], top |
| 6 | 23.57–28.71 | 12 | 2:16.0 boss fight (6 beats), 3:39.0 auto battle (6 beats) | 1.0 → 1.12, then 1.18 → 1.0 in 0.52 s | 深度策略[回合制], top, both halves |
| 7 | 28.71–38.57 | 23 | character art p1–p6 | — | 招揽[伙伴] to the band; band and logo at beat 9; call to action at beats 11, 12, 13 |
| 8 | 38.57–41.14 | 6 | the sign-off card | — | NEO-Cine · 游戏发布 |

Coordinates are pixels of the game's picture (the recording cropped to 3116 × 2016 at 365, 60).

## Sound

The recording's own soundtrack from 6:02.255 (the trading post's theme, 140 BPM; `beats.py` fits 140.03 BPM over 43 s, the beat 1.2 ms from second 0), with the game's interface clicks in it, faded in over 0.15 s and out over 2.2 s. Eight synthesized effects: whooshes into the map, explore and fight cuts (the last a long one) and under the band, a swish on the trading-post punch-in, a pop on the number plate, a low impact on the logo, a thud on the sign-off card. No narration. The cue check: 10 cuts and landings against the fitted beat grid, largest offset 8.9 ms (under half a frame at 30 fps).

## Palette & plate

The game's trading-post and dialogue UI: a gunmetal plate (#30343a → #1c1e22), a 3 px copper frame (#6b3a20), a 2 px orange-copper inner stroke (#c46a34), two silver rivets, a hard 10 px drop shadow; type #f4efe6; the logo's green #63dd8a on one word per plate; the copper inner-stroke colour on the arrow; a lighter copper #e3995f on the search words. `plate.py` on the trading post's total-price panel reads the same family (frame #5c372c, accent #69dd83). Titles in Smiley Sans 得意黑 Oblique, whose slanted strokes answer the logo's; small lines in Noto Sans SC 600 (the HyperFrames cut used the system's Hiragino Sans GB, replaced here by an OFL face).

## End card

Two cards. The game's own end (the iron band with the logo, Demo 试玩已上线, the TapTap search line, the platforms) is the film's content. Then a separate full-frame iron plate signs off with **NEO-Cine** and the style's name 游戏发布 only, in the same material, so the frame never shows small elements on a dark ground. A user's film carries the first kind and never the second.

## Build notes

```
demo/
  game.json        the project: the recording (sources.play), stills (with the grab that cut each), the soundtrack, the plate material, 8 shots
  build.sh         sh styles/game-launch/demo/build.sh v002 (RENDER=remote for the render desktop; FOOTAGE=<path> to bring the recording)
  FACTS.md         every claim on screen, the page's wording or the recording time
  CREDITS          the game's material and whose it is, fonts, sound, tools
  STORY.md         the three options and the choice
  assets/stills/   key art, logo, six character crops (in git, about 2 MB)
  assets/footage/  the recording (not in git: 170 MB; build.sh says where it comes from)
  assets/source/   the page's images the crops were cut from (not in git; only needed to cut them again)
  frames/, data/, fonts/*.ttf, index.html, page/, out/    made by the build, not in git
```

`build.sh` stops with the recording's source when `assets/footage/play-4k.mp4` is missing (it is 9 min 24 s; the time codes in `game.json` point into it), then runs the kit's `make.sh` with the demo as the project: frames and stills → fonts → page → events → beat check → mix (cue check, −14 LUFS) → render at 30 fps → mux (BT.709, no grain) → readcheck → poster (17.6 s), then the style frame (17.6 s) and the gallery copies when they are missing. `clips.py` cuts 758 frames (about 210 MB) in about 20 s on Apple silicon; a local render of the 1234 frames takes about 25 s.

- **Checks (v001, rendered on the Mac: the render desktop refused ssh connections that day):** readcheck 13 texts, 0 BAD (the closest: the number plate, 2.64 s for 2.61 s needed; 招揽伙伴, 2.44 s for 2.39 s); cue check 10 cuts and landings, largest offset 8.9 ms; `mux.sh` −14.0 LUFS, LRA 9.6 LU, peak −1.7 dBFS; no black frames; the master's soft clip at most 5.6 dB (the band and logo landing). The original SPEC's QA moments, at this cut's times: frame 0 the key art with no printed logo; 5.0 s the airship; 8.5 s the market table readable; 12.0 s the money counter about 90 px high; 17.5 s 14775 on the counter and on the plate; 22.5 s the log's three paths readable; 25.3 s the plate clear of the boss; 30.8 s all six characters; 34.3 s the logo whole, centred in its box; 38.0 s all three lines.
- **Compared with the HyperFrames v002 cut** (frame by frame at the same moments up to 17.4 s, and at the matching moments after): the same frames, framing and plates. Four changes, all for the library's reading rule: the first plate is on screen from frame 0 (it wiped in at 0.15 s); 看准行情 enters at 0.12 s instead of after the punch-in; the trading shot is 3 beats longer, at real speed after 14775 lands (the 1.6× footage ran out of 14775 before the plate could be read: the recording buys again at 6:22.3 and the counter drops to 6308); 深度策略回合制 stays over the auto battle too; the band lands one beat later so 招揽伙伴 can be read. The end holds 1 beat less; the sign-off card is added. The content runs 38.6 s against 37.7 s; with the card the film is 41.1 s. The sound effects, which the HyperFrames cut took from sound files, are synthesized here.
- **Pitfall of this demo:** the money counter keeps changing after the payoff (the player buys again 3.6 s later); the second, real-speed layer from the landing frame keeps the plate true.
