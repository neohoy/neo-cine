# Game Launch — Style Prompt

*From the making of a Demo trailer for an indie RPG, by the library's author, with the developer's permission. 中文版：[STYLE.zh-CN.md](STYLE.zh-CN.md)*

> A short launch film made from a game's own material: its gameplay recording and official art fill the whole frame, the captions sit on plates cut from the game's own interface (its frames, its metal, its rivets, its logo's colour), and the camera pushes into the UI until the one real number that makes the game worth playing can be read, cut on the beats of the game's own soundtrack. The crew wipes in on the beat, the logo lands, and the last frame says where to play it.
> References (grammar only): store-page trailers and Demo announcements of console and mobile games (gameplay first, one hook per beat, a logo and a platform line at the end); the game's own interface as a design system. Copy none of their footage, music, layouts or type, and never name them in the film.

Needs: the library's core tools (Node, ffmpeg 7+, the headless browser and `.venv` from `setup.sh deps`). The game: a gameplay recording (the longer the better: several minutes of real play), the key art, the logo (a transparent PNG is best), character art if there is any, the store page's text, and the user's word that they own the game or have the developer's permission. Fonts are fetched by the kit (OFL). Everything else is in [`kit/`](kit/): a film in this style is made with it, step by step, as [`PRODUCTION.md`](PRODUCTION.md) says.

## 1. Essence, and what it is not

- **Gameplay is the hero.** Real footage of the game and its official art fill the frame edge to edge, every frame: no black background, no letterbox, no footage shrunk into a box on a coloured field. The camera never shows past the edge of the source.
- **The captions are made of the game.** Each caption sits on a plate built from the game's own interface: its panel colour or gradient, its border and inner stroke, its rivets or corner ornaments, the accent colour of its logo. Every game gets its own plate; the plate is never a generic lower third.
- **One real number, or one real payoff, carries the film.** Something the recording actually shows changes in front of the viewer (gold 4351 → 14775 after one trade run, a damage number, a level-up, a rare drop, a base finished): the film builds to it, pushes in until it can be read, holds it, and names it on a plate. That moment is the climax.
- **Push in until the UI reads.** A menu, a price table, a skill name is shown large enough to read in the frame (body text at least about 26 px on screen, numbers larger), never as a texture.
- **Cut on the game's own beat.** The soundtrack is a passage of the game's own music; every cut and every landing sits on its beat grid.
- **The crew wipes in on the beat; the logo lands; the call to action is concrete:** what is out (Demo, early access, launch date), where to find it (the store and the exact search words), on which platforms.
- **Nothing is invented.** Every number, feature and claim on screen is visible in the recording or written on the store page, the changelog or the developer's own post (`FACTS.md`).
- **Every frame is a function of time**, and frame 0 is a complete picture (the key art and the first plate: platforms use it as the thumbnail).

Not a cinematic CG trailer (no rendered scenes the game doesn't have), not a let's-play (no long unedited play, no webcam, no cursor wandering), not a motion-graphics reel about the game (no floating cards on a dark background, no particles), not a slideshow of screenshots over a blurred backdrop.

## 2. Materials & rendering

- **Footage as frames, never `<video>`.** `kit/tools/clips.py` cuts every clip the cut list uses into stills on the film's own frame grid: film frame g shows the recording frame nearest to `in + (g/fps − layer start) × rate`, and only the part of the source the camera sees at that moment (plus 3 %), at screen resolution. The page shows frame k of the layer at frame g0 + k. So any frame renders alone, in any order, on any machine (the Mac and the Windows render desktop give the same picture). The frames are intermediate files (`frames/`, not in git) and are cut again when a clip or a camera move changes.
- **Crop the recording first.** Screen recordings carry black bars, a window frame or a phone bezel: `sources.<name>.crop` cuts them off once, and every coordinate after that (camera, plate material, look-ups) is in the game's own pixels.
- **The camera is one transform per layer**: a view of the source (`view: [x, y, w]`) or a push about a fixed point (`zoom`, `focus`), eased, as a pure function of t. The build stops a move that would show past the edge.
- **Stills** (key art, character art, logo) are files; crops from the key art, a screenshot or a frame of the recording are made by `clips.py` from a `grab` (source, time, crop, size), so the crop is written down and can be made again.
- **Plates** are HTML: a vertical gradient between two panel colours, an outer border, an inner stroke, two rivets, a hard drop shadow (no blur: game UIs are crisp), the title type on top. The end band and the sign-off use the same metal with a faint diagonal brushing.
- **Frame rate:** the footage's, 30 fps by default (60 when the recording is 60 fps and the user wants it). The library's 24 fps would drop and repeat frames of a 30 fps recording. No grain in the master: the footage has its own texture.

## 3. Colour logic

- **The game's palette, not ours.** The footage and art keep their own colours; no grade, no tint, no darkening under titles (a darkened screenshot under a title is the clearest sign of a generic trailer).
- **Plate colours are sampled from the game's UI** (`kit/tools/plate.py`): the panel's top and bottom colours, its border, its inner stroke, its text colour. Rivets, ornaments and brushing only when the UI has them.
- **One accent colour: the logo's** (sampled from its most saturated hue). It goes on one word per plate and on the call to action's key word, nowhere else. A second, warm tone taken from the UI's metal marks a symbol on a plate (an arrow, in the inner stroke's colour) and the search words of the call to action (`look.warm`, a lighter warm highlight from the UI, readable at small size).
- **No glow, no gradients of light, no purple-blue sci-fi gradients, no glass cards**, unless they are literally the game's own UI.

## 4. Type & plates

- **Title type: an OFL face that matches the game's lettering** (`kit/tools/fonts.py --list`): a slanted, hard-edged face (Smiley Sans 得意黑) for action and anime RPGs whose logo leans; a blocky face (ZCOOL QingKe HuangYou) for pixel and retro games; a round one (ZCOOL KuaiLe) for casual and cosy games; a brush face (Ma Shan Zheng) or Noto Serif SC for wuxia, xianxia and story games. 104 px on a plate, tracking 0.02 em, one line.
- **Small type: Noto Sans SC** (600) for the call to action's second and third lines. Never a system font (PingFang, Hiragino, Microsoft YaHei): the film renders the same on a Mac and on Windows.
- **One plate, one claim, two to eight characters**, with at most one accent word (`[word]`). The claim is a verb and a noun the store page uses (跨城跑商, 低买高卖, 探索秘境), not an adjective about the game.
- **The number plate** gives the before and after in the recording's own figures and the accent on the after (货钞 4351 → 14775).
- **Positions:** a plate sits bottom left (150 px from the left and bottom edges) or top left (130 px from the top), whichever does not cover what the shot is about; the game's own on-screen text (a "victory", an "auto battle" banner) is a caption already: don't add one.
- **Reading time** follows the library's rule (CJK ÷ 4.5 + other ÷ 15 + 1.5 s), counted from the moment the plate has finished wiping in; `readcheck.mjs` checks the page and the build warns first. Text never moves while it is being read: the plate wipes in, the type settles, then both hold.
- **No subtitle bar, no narration by default:** the plates and the game's own sound carry the film.

## 5. Motion quality

- **Plate entrance:** a clip-path wipe left to right, 0.28 s `power3.out`; the type slides 30 px right into place, 0.36 s `power3.out`, 0.06 s later. Plates leave on the cut with their shot, never animate out.
- **Camera:** a slow push across a whole shot (`sine.inOut`, 1.0 → 1.1–1.35), or a punch-in onto the UI on the beat (`power3.inOut`, about 0.52 s, to 1.5–3×), then a hold. A push never pulls back mid-shot; the auto-battle shot may settle out (1.18 → 1.0, `power3.out`) to show the whole field.
- **The number moment:** after the punch-in the frame holds still on the UI while the number changes; the plate with the number wipes in just after the figure lands, never before; once it has landed, the footage may drop back to real speed so the figure stays on screen while it is read.
- **Character art:** vertical slices, one per character, wiping top to bottom (`power3.out`, 0.3 s) on half beats while the art inside slides down 60 px; a 3 px copper rule between slices. The whole crew is in within about one second: no half-empty frame.
- **The end band** slides in from the left with `power4.in` and lands on a downbeat; the logo lands with it (scale 1.18 → 1, 0.25 s `power4.out`); the call to action follows one line per beat.
- **Speed:** footage may run faster than life (1.5–2×) to fit a trade, a run or a build into a few seconds; never slower than life, never reversed.
- **No idle motion:** no floating, breathing or wobbling elements; motion comes from the camera and from the game itself.

## 6. Camera grammar

The frame is the game; the camera is the only thing the film adds to it. A vocabulary, not a route.

| Shot type | Picture | Can serve |
|---|---|---|
| Hook | key art, a slow push toward a detail (the airship, the hero's face), a plate at frame 0 | where the journey starts, who you are |
| System shot | a full-frame gameplay clip, a slow push or a punch-in onto the part of the UI that proves the claim | one feature: travel, trade, build, explore, fight |
| Number shot | a punch-in onto a counter, a hold while it changes, the number plate | the payoff, the film's climax |
| Pair | two short clips in one shot (half each), one plate across both | one system in two moments: a choice and its event, a fight and its auto mode |
| Crew | character art in vertical slices, wiping in on the beat | who travels with you |
| End | the iron band with the logo and the call to action over the crew | what is out, where, on which platforms |

Cuts are hard cuts on the beat (a whoosh may lead into a scene change); no dissolves, no wipes made of shapes the game doesn't have. Neighbouring shots never repeat a move; the punch-in is kept for the shots whose proof is in the UI.

## 7. Sound palette

- **The game's own music**: one passage of its soundtrack, taken from the recording or from a music file the user gives, at the game's own tempo (`kit/tools/beats.py --scan` lists tempo and beat clarity across the recording; `beats.py` checks the grid). The picture is cut on that grid; the cue check stops a cut more than half a frame off a detected beat.
- **The recording's interface sounds** come along with the music (clicks, coins); keep them when they help (a sale), choose another passage when they clutter.
- **A few synthesized effects** on the picture's events (`kit/tools/mix.py`): a whoosh into a scene change, a long whoosh into a fight, a short swish on a punch-in, a pop when the number plate appears, a low impact on the logo landing. No sample libraries.
- **No narration by default**: the plates carry the claims. When the user wants a voice, follow TECHNIQUE.md §4 and duck the music under it.
- Master to −14 LUFS with one gain for the whole film (`neo/audio/master.py`, then `mux.sh` with `LEMO_COLOR=bt709`).

## 8. Native moves

- **The real number, read in the UI.** Punch in on the counter on the beat, hold while the figure climbs, wipe in the plate with before → after. *Fits content like:* a trade, a harvest, a level-up, a gacha result, a best lap, a city's population.
- **The plate made of the game.** A caption that looks like a piece of the game's own interface. *Fits content like:* every claim the film makes.
- **The slow push into the key art.** The first frame is the official art with a plate already on it; the camera drifts toward the detail that starts the story. *Fits content like:* the hook.
- **Two moments in one shot.** Half a shot each for a choice and its result, or a manual fight and its auto mode, under one plate. *Fits content like:* a system with two sides.
- **The game's banner as the caption.** When the game prints its own word on screen (自动战斗中, VICTORY, LEVEL UP), the film adds nothing over it.
- **The crew wipes in on half beats.** *Fits content like:* a party, a cast, a roster.
- **The band lands with the logo.** The iron band slides in on a downbeat, the logo lands on the same frame with a low impact, the call to action follows line by line. *Fits content like:* the end of every film in this style.

Candidates for a new film (not in the kit yet; build them on the same clock): a split screen of before and after the same place (a village and the city it became); a counter shown in two places at once; a map route drawn over the world map between two cities.

## 9. Pitfalls of the medium

- **An invented number or feature.** Nothing on a plate that the recording doesn't show or the store page doesn't say. Every number on a plate must be in `FACTS.md` (the build checks), with the recording time or the page's wording.
- **A title over a darkened screenshot.** The plate is the caption's ground; the footage stays as it is.
- **Black frame around the footage**, or a camera move past the source's edge (the build stops it).
- **The logo shrunk into a corner.** The logo lands large, in the band, and stays until the end.
- **Text that moves while it is read**, or a plate that appears before its number lands in the footage.
- **A decorative line across the logo** (a seam, a rule, a gate edge), or a slice rule through a face.
- **A half-empty frame while things assemble**: the crew wipes in on half beats, all in within about a second.
- **The recording's own numbers changing under the plate.** Check the counter after the payoff too: a later purchase may change it while the plate still says the payoff (`look.py` strips); drop to real speed or cut earlier.
- **Generic trailer furniture**: corner tags, HUD frames the game doesn't have, three cards side by side, everything fading up together, glow and particles, purple-blue gradients, glass cards, paper and serif type.
- **System fonts** in the plates (they differ between a Mac and the Windows render desktop).
- **Rights.** Only the user's own game, or one they have the developer's permission for; the store page's text and the recording are facts, the art and music are the developer's (DIRECTOR.md §12). `CREDITS` says whose they are and that they are used with permission.

## 10. Engine

The kit in [`kit/`](kit/) makes a whole film from a game's material, and [`PRODUCTION.md`](PRODUCTION.md) is the manual, with the three points where the user confirms. See the code; don't restate it.

- Time plan and camera: `kit/lib.py` (`plan`: the cut list → shots, layers, frame grid, the picture's events; `camera`: views and pushes as one affine per layer, checked against the source's edges; the reading-time rule).
- Page: `kit/page/template.html` (layers, plates, crew, band, logo, call to action, sign-off card, the plate material as CSS variables), `kit/page/film.js` (the library's page contract; footage frames by frame number; `TEXTS` for readcheck), `kit/page/tween.js` (entrances as a pure function of time, with clip-path).
- Tools (`kit/tools/`): `new_project.py`, `inventory.py`, `scan.py`, `look.py`, `beats.py`, `plate.py`, `clips.py`, `fonts.py`, `build.py`, `mix.py`, `preview.sh`, `make.sh`, `compare.py`. Templates in `kit/templates/` (`game.json`, `STORY.md`, `FACTS.md`).
- The demo ([`demo/`](demo/)) is itself a project made with the kit: `demo/game.json` is its whole cut list.

## 11. Variation space

Decided per film: the game and its material, the one real number or payoff, the three story options and the choice, the passage of music and its tempo, the plate material (sampled from this game's UI: an iron plate with copper and rivets for a steampunk RPG, a pixel-bordered box for a pixel game, a parchment scroll with a brush face for a wuxia game, a rounded candy panel for a cosy mobile game, a neon-edged HUD panel only if the game's UI is one), the title face, the accent colour (the logo's), the length (15 s: hook, the number shot, the end; 30–45 s: five to seven shots), the order of the systems, whether there is a crew, the call to action's words and platforms.

Fits any game with a recording: anime and story RPGs, pixel and retro games, indie games of every genre, mobile and gacha games, strategy and management games, card games, racing and sports (the number is a lap time or a score).

- **Structures:** one journey (set out → systems in the order a player meets them → the payoff → the crew → the end); one system in depth (three shots of the same loop, the number growing each time); before and after (the first hour and the tenth, the same place changed).
- **Openings:** the key art with a plate at frame 0; the number already on screen and a question; the game's own title screen.
- **Endings:** the crew and the band with the logo; the logo on the key art's sky; the last gameplay shot holding under the band.

---

How our demo was made (story, shots, sound, end card, build): [DEMO.md](DEMO.md). Read it after your story exists.
