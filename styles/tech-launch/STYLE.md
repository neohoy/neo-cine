# Tech Launch — Style Prompt

*From the Tech Company theme of the NEO Product Promo skill, by the library's author, and the films made with it. 中文版：[STYLE.zh-CN.md](STYLE.zh-CN.md)*

> A quiet launch film made from a real product's own interface: the pages are frozen as they are (their DOM, CSS, fonts and images) and filmed inside a product window on warm paper, while big bilingual titles carry the argument. Real components are cloned out of the page and lift, fly and settle like objects, each one the evidence for one claim, with a fact from the page on a small paper card.
> References (grammar only): keynote product films and editorial magazine layouts (a serif headline over a single object, generous margins, one accent colour); museum labels (a ruled card that names one fact). Copy none of their layouts, typefaces, footage or music, and never name them in the film.

Needs: the library's core tools (Node, ffmpeg, the headless browser and `.venv` from `setup.sh deps`). The product: a URL, a local copy of the site, or screenshots of the interface. Google Chrome or Microsoft Edge only when a site needs the user to sign in. Fonts are fetched by the kit (OFL). Everything else is in [`kit/`](kit/): a film in this style is made with it, step by step, as [`PRODUCTION.md`](PRODUCTION.md) says.

## 1. Essence, and what it is not

- **The interface is real.** Only frozen pages of the real product, or the user's own screenshots of it: nothing redrawn, nothing mocked up, no data the page doesn't show. Every fact on a card (a number, a date, a name) can be found on the frozen page, word for word.
- **The title is the hero, the interface is the evidence.** One claim per shot, said in a large English serif line and a concrete Chinese line (not a translation: the same point, said with its specifics). The component that proves it is lifted out of the page.
- **Components behave like objects.** A card, a row of figures, an article teaser is cloned from the page with its own styles and text, and moves in 3D: lifted along Z, flown into its slot, pushed in on, underlined in place.
- **Calm, dense, exact.** Warm paper, black ink, one brand colour; slow drifts with a direction; stillness only just before a climax.
- **Every frame is a function of time**, and frame 0 is a complete picture (the opening headline is fully on screen: platforms use it as the thumbnail).

Not a screen recording (no live scrolling site, no cursor wandering), not an explainer with mocked UI, not a neon "tech" reel (no gradients of light, particles, glassmorphism, dark sci-fi blue), not kinetic typography (the words always stand beside real evidence).

## 2. Materials & rendering

- **Frozen pages.** A browser opens each page, clicks it into the state worth filming, waits for it to render, and takes everything: all style sheets with media queries evaluated at the freeze viewport (default 1280×720) and `vh`/`vw` turned into pixels, the DOM with scripts removed, `fixed` and `sticky` elements pinned where they were, canvases turned into images, fonts and images downloaded next to it. The site's own transitions and animations are removed (they run on the browser's clock). The film never runs the site's scripts: the page is a *live screenshot* that can be enlarged and cut apart.
- **The product window.** 1728 px wide with a thin address bar; it shows only the page's focus region, scaled to the window width with 20 px either side (no sidebars, no site header). The page drifts down slowly to rest on the row that matters.
- **Floating components** are clones of real elements, placed in CSS 3D: perspective 2400 px, small angles (rotateY about −16°, rotateX about 6°, a little rotateZ), staggered in Z when several are on screen. A transparent component gets the page's background colour so it never shows what's behind it. Read at about 21 px body text: a component is enlarged until it reads, about 600 px wide in close-up.
- **Three soft shadows** that deepen and spread as a component rises: the height of an object is told by its shadow, never by a glow.
- **Canvas only for construction marks**: four corner ticks, one dimension line, a paper-backed label card, a stat card, a bracket. No grids, no blueprint lines, no particles.
- **The ground** is paper `#f4f1ea` with a soft radial light (a little brighter in the middle, a little deeper at the edges), never pure white or a flat colour. A light grain in the master hides banding.
- **Seek-safe.** Poses are pure functions of t; text entrances are tweens evaluated at t (`kit/page/tween.js`). No random numbers (scatter positions come from a hand-written table), no clocks. The film's own ids and classes carry a `pp-` prefix so they never collide with the site's.

## 3. Colour logic

- Paper, ink (`#1a1916`) and three greys for secondary text, hairlines and kickers. That is the whole film's palette.
- **The brand colour appears only on the brand mark and what grows from it:** the brand square in the frame, the brand-colour wipe between pages, the window collapsing into the square at the end, the slot word's underline, the highlighter on a quoted line, the bar under a counted number.
- The interface keeps its own colours, inside the window and on the floating components; the film never recolours it.
- A dark interface on paper is a strong contrast: freeze it in its light theme when it has one (`colorScheme`, `htmlAttrs`), otherwise look at a still first.

## 4. Type & subtitles

- **English: Instrument Serif** (OFL), condensed serif, tracking −0.035 em, line height 0.92. Opening 168 px, split 128 px, window or compare title row 104 px, hero caption 80 px, chapter statement 216 px, end line 196 px. One claim per line, two lines at most.
- **Chinese: Noto Sans SC** 700 for titles (opening 66 px, row 44 px, split 52 px), 500 for notes and card subs (30 px, grey). Subset to the characters printed; never a system font, so a Mac and a Windows render are the same. Write the Chinese as the concrete version of the claim ("27 家公司，各建一份档案。").
- **Mono: JetBrains Mono** for the frame (brand mark, tagline, address bar), eyebrows, kickers and URLs; Chinese in a kicker falls back to Noto Sans SC. Frame type may be under 28 px: it is furniture, not reading text.
- **The site's own fonts are the site's.** Web fonts it serves are kept as they are; system fonts in its stack are declared by name (on a Mac PingFang, on Windows Microsoft YaHei: the site's own look on each system). Their licence is the user's responsibility, as is the interface itself.
- **Label cards**: three lines, kicker (mono 20 px, source or number), fact (Noto Sans SC 700, 30 px), sub (500, 22 px, grey). The fact is one specific thing found on that page.
- **Reading time** follows the library's rule (CJK ÷ 4.5 + other ÷ 15 + 1.5 s) for titles, notes, card lines, stat cards and labels; `readcheck.mjs` checks the finished page, and the kit warns at build time. A counter reports its final value and a typed line its full text from the first frame they appear. Write few words: a product title of 9–13 characters, a card fact of 3–9.
- **No subtitle bar**: the titles and cards are the film's words. With narration, deliver its `.srt` (`core/render/srt.py`) and burn nothing in unless the user asks; a bar would cover the window.

## 5. Motion quality

- **Entrances:** `power3.out`, about 0.8 s, blur 14 → 0 px, lines staggered 0.1 s. Waterfall: words flicked up from below on `power4.out`, each leaving before the last has landed. Slices: five horizontal strips snapping back on `expo.out` with a brand-colour hairline. Typing: one character per sixteenth of a beat.
- **Exits:** text leaves to the left, 140 px, `power3.in`, 0.3–0.35 s, landing on the cut.
- **Cuts land in motion.** The old page starts accelerating away 0.3 s before the cut (`power4.in`); the new one enters on the cut frame at the same speed and direction and settles in 0.38 s (`power4.out`); 200 px of travel; never a cross-dissolve (two layers make a grey wash) and never a full stop before a cut.
- **Landings** ease out on a fifth power; flights and lifts ease in-out on a cube; the hero sinks back into a slot that is already moving away.
- **One main direction: left.** Text exits left, pages come in from the right, the brand wipe sweeps right to left. `up` and the zoom-through are kept for cuts that mean something.
- **Stillness only before a climax**, 0.3–0.75 s just before a lift. No breathing, wobble or idle floating: a held component drifts slowly in one direction (it turns toward the viewer, drifts left) until it leaves.
- **On the beat.** Key moments (cut, lift, corner ticks, card, count landing, square) sit on the 0.6 s beat (100 BPM); fast sequences (slots, typing, a scroll) on its sixteenths. Shot durations are whole beats.
- **A push-in never pulls back**: after a zoom the frame keeps pushing 6 % until the cut, and the next shot carries on into depth.

## 6. Camera grammar

The frame is a fixed page with a fixed frame (brand top left, tagline top right, a progress line along the bottom); the camera moves are the components' and the pages'. A vocabulary, not a route.

| Shot type | Picture | Can serve |
|---|---|---|
| Opening | the headline left, real components in depth on the right: a stack (`stack`) or scattered (`scatter`) | the user's problem, said in five words |
| Product shot | one claim and its evidence, in one of four layouts with one move | a solution, proved on the interface |
| Chapter statement | one large line, no interface, a slow push | a turn between arguments; a breath |
| End | brand line, brand square with the Chinese name, address | the sign-off |

| Layout | Picture | Moves |
|---|---|---|
| `window` | title row on top, product window below; consecutive window shots keep the window and change the page inside | lift, cascade, zoom, stream, mark |
| `split` | big bilingual title left, one to three components floating at an angle right; wide ones bleed off the right edge | lift, mark |
| `hero` | one component across the whole width, title shrunk to one line bottom left | zoom (with a counted number), mark, lift |
| `compare` | two components side by side (wide ones stacked), a label each, a bracket gathering them into one conclusion | the bracket |

| Move | Proves |
|---|---|
| `lift`: the hero rises along Z, the rest of the window dims, corner ticks, a dimension line, a label card | "this one" |
| `cascade`: the components around the hero rise and fall like a wave, then the hero lifts | "many, all gathered here" |
| `zoom`: push in on a figure in the hero; a stat card counts from 0 with a bar | "one key number" |
| `stream`: the list races past from the top and settles on the hero, a counter climbs in the corner | "constant, large, ongoing" |
| `mark`: after the lift, a brand highlighter sweeps along the quoted line | "it says so in the original" |

Transitions: `left` (default), `up` (a conclusion), `zoom` (deeper: both pages grow toward the viewer, blur peaking at 16–18 px), `wipe` (opening a file: a brand-colour block covers the window exactly on the cut), `cut` (impact: the new page lands a little large and settles). Neighbouring shots never repeat a move, an entrance or a transition; the heavy ones (slices, wipe) once or twice per film.

## 7. Sound palette

- **A synthesized score from the cut list:** D major, 100 BPM, warm and restrained. Detuned saws for the bed, a filtered pluck with a dotted-eighth echo, a sine sub, an FM bell; a very light kick and hat from the first product shot. One chord per product shot (Bm11 → Gmaj7 → Em9 → Asus2), the bass leaning on the cut, a chord on the lift, a high bell on the corner ticks; a chapter statement drops to the dominant's long notes; the end returns to Dmaj9 and rings out.
- **Eight synthesized effects**, one per visible action, placed so their peak (or onset, for clicks and the marker) sits on the action: tick, wooden tap, low thud, paper, swish, rise (a one-beat crescendo into each cut), marker scribble, bell. No recorded samples.
- **Optional acoustic version** of the same score (piano and strings from the library's sampler); the piano library asks for attribution (CC BY).
- **Narration is optional.** Default none: the titles carry the film. The library's local TTS (Kokoro, Chinese voices `zf_*`/`zm_*`) works offline but sounds plain: let the user hear a line first. edge-tts only when the user asks for it: it is Microsoft Edge's read-aloud service through an unofficial interface. A line says the cause and effect, never reads the screen; the music ducks under it.
- Master to −14 LUFS with one gain for the whole film.

## 8. Native moves

- **Scatter, then assemble.** Real components fly in from deep space and hang scattered; on the first product shot they all fly back into their own slots in the window, the hero first. *Fits content like:* information scattered across many places; a product that gathers things.
- **A stack of files.** Three cards fall into a pile and turn toward the viewer; the front one flies into the window. *Fits content like:* one record per customer; dossiers; documents.
- **Rotating slot word.** One word in the note changes on sixteenths, faster and faster, and stops on the last. *Fits content like:* the same trouble in many channels; many formats; many sources.
- **Lift with construction marks.** The hero rises, corner ticks and a dimension line are drawn, a paper card names one fact. *Fits content like:* this feature; this record; this result.
- **Push in and count.** The camera pushes in on a figure, a stat card counts up to it, a bar fills. *Fits content like:* a share, a growth rate, a total.
- **Underline in the original.** The highlighter runs along the exact line on the page. *Fits content like:* a quote, a clause, a figure in a report.
- **The racing feed.** The list scrolls fast and slows onto one item while a counter climbs. *Fits content like:* a changelog, a news feed, many updates.
- **Bracket two sources.** Two components with labels, a bracket closing into one line. *Fits content like:* two channels into one place; before and after; summary and source.
- **Brand wipe** between two pages; **zoom-through** into a deeper page.
- **The window collapses into the brand square.** At the end the whole window (or the last floating group) shrinks into the square beside the brand name, then the brand line types itself. *Fits content like:* a brand whose mark is a simple shape; "everything into one place".

Candidates for a new film (not in the kit yet; build them on the same clock): a page laid flat and flown over; components orbiting a core (only with real members); a cursor click that carries into the next shot; one word per beat for small features; a data-first opening.

## 9. Pitfalls of the medium

- **A fake interface.** A redrawn card, an invented number, a "sample" screen: never. A fact that isn't on the frozen page doesn't go on a card (the build lists numbers it can't find; FACTS.md keeps each claim with the page and its wording).
- **Passwords.** Sites behind a login are signed in by the user in a browser window the kit opens; the agent never types into a password field and never asks for a password. The saved login stays in the project's `out/`, never in git, never sent to the render machine.
- **Doing instead of looking.** Page actions only switch, filter, expand and search: no submitting, ordering, messaging or changing settings, no accepting terms. Cookie banners are removed, not accepted.
- **Name collisions.** The film's ids and classes start with `pp-`; a site that uses `pp-` itself stops the build.
- **A frozen state that isn't the state you meant**: a dropdown still open, a filter not applied. Compare every frozen page with its reference screenshot.
- **Too many words for 30 seconds.** The reading rule makes long titles fail; cut words before you lengthen shots.
- **A highlight that doesn't match.** The quoted text must be found character for character in the hero, at freeze time: change it and freeze again.
- **The same page twice in the window.** Each page appears once in the window; freeze a second copy with another id to film it again (floating layouts may share a page).
- **Live sites change.** Refreeze before a re-render and check FACTS.md again; keep `site/` to pin a version.
- **Screenshots enlarge badly.** A 1× screenshot blurs when pushed in on: use 2× screenshots; the page limits a push to 3 screen pixels per screenshot pixel.
- **Platform fonts in the interface.** A site whose Chinese is set in system fonts looks like PingFang on a Mac and Microsoft YaHei on Windows: render a film on one kind of machine.

## 10. Engine

The kit in [`kit/`](kit/) makes a whole film from a product's URL or screenshots, and [`PRODUCTION.md`](PRODUCTION.md) is the manual, with the three points where the user confirms. See the code; don't restate it.

- Time plan: `kit/theme.mjs`: the cut list → the timeline (`plan`), the shot titles (`html`), the picture's events (`events`: cuts, lifts, corner ticks, counts and every sound's moment), the reading-time estimate.
- Page: `kit/page/template.html` (frame, window, type, CSS), `kit/page/film.js` (window, pages, clones, poses, Canvas marks, the library's page contract, `TEXTS` for readcheck), `kit/page/tween.js` (text entrances as a pure function of time).
- Tools (`kit/tools/`): `new_project.mjs`, `explore.mjs`, `login.mjs`, `freeze.mjs`, `freeze_images.mjs`, `build.mjs`, `fonts.py`, `voice.py`, `sfx_synth.mjs`, `score.mjs`, `score_acoustic.py`, `mix.py`, `preview.sh`, `make.sh`. Shared browser code in `kit/lib.mjs`; templates in `kit/templates/`.
- The demo ([`demo/`](demo/)) is itself a project made with the kit: `demo/promo.json` is its whole cut list.

## 11. Variation space

Decided per film: the product and its pages, the problem and the three or four solutions, the brand colour, the length (15 s: opening and two product shots; 30–40 s: four or five; 45–60 s: six to eight, freezing a page twice when needed), the layouts and moves (at least two or three layouts in four product shots), the opening (stack or scatter, with or without slots), the transitions, the close (sink or square, blur or typed), narration or none, the synthesized or acoustic score, or the user's own music.

Uses beyond a website launch: a feature release (one feature per shot), an app or desktop tool from screenshots, a dashboard's year in numbers, a documentation or API product (code blocks and tables are components too), an internal tool walkthrough for a team.

- **Structures:** problem → three solutions → close; a before/after on two pages with a compare; one number per shot, building to a statement.
- **Openings:** scattered components and a five-word problem; a stack of records; a chapter statement before any interface.
- **Endings:** the window collapsing into the brand square; the window sinking under a typed brand line; a last statement on bare paper.

---

How our demo was made (story, shots, score, end card, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
