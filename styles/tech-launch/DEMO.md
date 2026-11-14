# Tech Launch — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *On the Record* 《记录在案》 (35.4 s) · `tech-launch.mp4` · source in [`demo/`](demo/) · 中文版：[DEMO.zh-CN.md](DEMO.zh-CN.md)

The product is 建造观察局 (BITBUILD, `news.bitbuild.cc`), a site about how AI and digital tools enter architecture, engineering and construction: company files, financing and acquisitions, long-form analysis. It is the library author's own site; every interface in the film is a page of it, frozen from the live site on 2026-11-14 with `kit/tools/freeze.mjs`, and every fact on screen is listed with its page and wording in [`demo/FACTS.md`](demo/FACTS.md). The demo folder is itself a Tech Launch project (`demo/promo.json` is its whole cut list), made with the same kit as a user's film ([`PRODUCTION.md`](PRODUCTION.md)). It retells the 30-second layout version made with the original skill, timed for the library's reading rule.

## Story & structure

Problem, three answers, a close. The opening states the reader's problem (too much noise, too few facts: AI launches everywhere, news scattered across channels); each product shot is one feature answering it, proved by one component and one fact from its page; the end signs the brand.

- **The noise (0–5.4 s).** "Too much noise, too few facts." is on screen from frame 0. Eight real company cards fly in from depth and hang scattered; the note's slot word runs through 公众号 / 官网 / 发布会 / 招股书 / 财报 on sixteenths and stops on 财报.
- **A file per company (5.4–11.4 s).** On the cut every scattered card flies back into its own slot in the company library window, 广联达 first; the title enters in slices (the turn from problem to answer); 广联达 lifts with corner ticks, a dimension line and its card.
- **Numbers over buzz (11.4–16.8 s).** One component across the frame: 群核科技's row of figures; push in on 96.9 %, the stat card counts up to it.
- **From launch to revenue (16.8–22.8 s).** Split: the title left, two article teasers floating right; Procore's lifts and the highlighter runs along 收入增长15.8% in its own sentence.
- **One place (22.8–28.8 s).** Compare: a WeChat post from a Chinese company and an announcement from an international one's site, each labelled with its channel, bracketed into 汇到一处.
- **On the record (28.8–32.4 s).** The two components collapse into the brand's blue square beside 建造观察局; "On the record." types itself; the address.
- **Sign-off (32.4–35.4 s).** The frame fades; NEO-Cine and the style's name on bare paper.

Native moves spent: scatter and assemble, slot word, lift with construction marks, push in and count, underline in the original, bracket two sources, the window collapsing into the brand square, typed brand line.

## Shots

| # | Time | Layout · move | Page (route) | Title · card | Note |
|---|---|---|---|---|---|
| 1 | 0–5.4 | opening, scatter | companies (`#/companies`) | Too much noise, too few facts. · AI 发布越来越多，哪些是真生意？ · 消息散在{slot}里。 | headline at frame 0; slots from 1.2 s on the sixteenth grid |
| 2 | 5.4–11.4 | window · lift (slices) | companies | One file per company. · 27 家公司，各建一份档案。 · card GLODON · 上市 / 广联达 / 观察 54 条 | assembly 5.25–6.6, lift 7.2, ticks 7.8 |
| 3 | 11.4–16.8 | hero · zoom (waterfall) | company (`#/c/manycore`) | Numbers over buzz. · 看收入结构，判断真生意。 · stat 96.9% 订阅占比, 2025 营收 8.20亿 | count 13.2–14.4, keeps pushing to the cut |
| 4 | 16.8–22.8 | split · mark (blur) | deep (`#/deep`) | From launch to revenue. · 把一次发布，追到财报里的收入。 · card PROCORE · 2026Q2 / 收入增长 15.8% | underline 19.2–19.8 |
| 5 | 22.8–28.8 | compare (waterfall) | observe (`#/observe`) | Every update, one place. · 各家发布汇到一处，每条附原文。 · labels 国内 · 公众号「盈建科」 / 国际 · Nemetschek Group 官网 · bracket 汇到一处 | bracket 24.6–25.2 |
| 6 | 28.8–32.4 | end · square, typed | — | On the record. · 建造观察局 · news.bitbuild.cc | square lands 29.4 |
| 7 | 32.4–35.4 | statement, bare | — | NEO-Cine · 科技发布 | the frame fades out 32.1–32.4 |

## Score structure

The kit's synthesized score, D major, 100 BPM (0.6 s a beat; every shot is a whole number of beats). Opening on Dmaj9 with a darker bed; product shots Bm11 → Gmaj7 → Em9 → Asus2 with the light kick and hat from shot 2; the end returns to Dmaj9 and rings under the sign-off. 59 synthesized effects on the picture's events (scatter swish and paper, nine slot ticks, the fly-in swish, the landing thud and three taps, a rise into each cut, lifts, corner ticks, the count tap, the marker, the bracket tick, the square's thud and bell, a tick per typed letter). The cue check: 14 score accents (5 cuts, 4 lift chords, 3 corner bells, the bracket bell, the square bell) against the page's events, largest offset 0 ms. No narration: the titles carry it.

## Palette & props

Paper `#f4f1ea`, ink `#1a1916`, brand blue `#002fa7` (the site's own: brand square, slot underline, highlighter, stat bar, the closing square). The interface keeps the site's colours and fonts (its web fonts Archivo, IBM Plex Mono and its own serif, and the system Chinese sans in its stack). Props are the site's own components: company cards (`.ccard`), a company's figure row (`.dstat`), article teasers (`.drow`), feed entries (`.erow`).

## End card

Two cards. The brand's end card (shot 6: the blue square, 建造观察局, the address, "On the record.") is part of the film's content, the way a song's own title page is in Scrapbook Song: it says what the film is about. Then a separate bare card signs off with **NEO-Cine** and the style's name 科技发布 only; the frame (brand, tagline, track) fades out before it. A user's film carries the first kind and never the second.

## Build notes

```
demo/
  promo.json      the project: site (the live URL, four pages and their components), film (brand, 7 shots), name, poster
  build.sh        sh styles/tech-launch/demo/build.sh v002 (RENDER=remote for the GPU desktop)
  FACTS.md        every fact on screen, its page and its wording there
  CREDITS         the site, fonts, sound, tools
  fonts/          OFL texts (the subset fonts are fetched and cut by kit/tools/fonts.py, not in git)
  site/, index.html, page/, out/    made by the build, not in git
```

`build.sh` freezes the live site when `site/` is missing (about a minute), then runs the kit's `make.sh` with the demo as the project: page → fonts → events → effects and score → mix (cue check, −14 LUFS) → render → mux → readcheck → poster (20.4 s), then the style frame (20.4 s) and the gallery copies when they are missing. The live site changes: after a fresh freeze, check `FACTS.md` and the stills before rendering (the build lists numbers it can't find on the pages). Rendering 850 frames locally (Apple silicon, 3 workers) takes about 15 s.

- **Checks (v001):** `readcheck` 29 texts, 0 BAD (the closest: the window shot's card, 2.52 s on screen for 2.41 s needed); cue check 14 accents, largest offset 0 ms; `mux.sh` −13.8 LUFS, true peak −1.2 dB, LRA 5.4 LU; no black frames; the master's soft clip touched 2 % of windows by more than 3 dB (the assembly's landing thud).
- **Compared with the original skill's 30 s layout version:** the same look shot for shot (window, hero zoom, split mark, compare, square end); the chapter statement "Follow the money." was dropped and shots lengthened by a beat or two so every line passes the library's reading rule; Chinese titles and cards were shortened for the same reason; the site itself has changed since (27 companies, 300 entries), so the heroes are today's.
- **Pitfall of this demo:** `.dstat` on the company page is one element holding four figures, so the hero shot zooms a single wide row; the hero layout lets it bleed off the left edge and the push centres 96.9 %.
