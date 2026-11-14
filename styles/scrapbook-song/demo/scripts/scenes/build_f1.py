#!/usr/bin/env python3
# 来自《风吹新竹》MV 工程的 scripts/handdrawn/build_f1.py。本库改了：字体不内嵌，结尾改用 frame_kit.write_html 写出。
"""Build compositions/frames/01-f1-wind-rises.html — group 01「风起」(clip 0–4.528s).

Hand-drawn cel style: ink outlines + flat fills, line boil (turbulence seed cycles every 1/12 s),
drawn motion quantised to 12fps (on twos). Layout = the confirmed sketch (storyboard.html v4, frame-01).
Usage: python3 scripts/handdrawn/build_f1.py
"""
import base64
import json
import os
import sys

from hd_lib import *  # noqa: F401,F403
from hd_people import *  # noqa: F401,F403
from songlib import *  # noqa: E402,F401,F403  这首歌的道具和示范片的页码（覆盖工具包的 tag）

FID = "01-f1-wind-rises"
DUR = 4.528
CX, CY, R = 640, 520, 112          # protagonist head centre / radius — same as the sketch
NECK = (CX, round(CY + R * 1.1))    # pivot for the listening sway
BEATS = [0.163, 0.882, 1.509, 2.136, 2.717, 3.32, 3.924]
LYRIC_T = [0.12, 0.52, 0.76, 1.08, 1.40, 1.74, 2.02, 2.34, 2.60, 3.04]   # just ahead of each sung syllable
GUST = 4.10


def f(v):
    return f"{v:.0f}"


# ------------------------------------------------------------------ protagonist parts (split for animation)
def hair_back():
    cx, cy, r = CX, CY, R
    return shape(f"M{cx - r * 1.06:.0f},{cy + r * .15:.0f} C{cx - r * 1.18:.0f},{cy - r * .95:.0f} {cx - r * .5:.0f},{cy - r * 1.55:.0f} {cx + r * .12:.0f},{cy - r * 1.52:.0f} "
                 f"C{cx + r * .9:.0f},{cy - r * 1.5:.0f} {cx + r * 1.25:.0f},{cy - r * .85:.0f} {cx + r * 1.12:.0f},{cy + r * .2:.0f} "
                 f"C{cx + r * 1.08:.0f},{cy + r * .55:.0f} {cx + r * 1.0:.0f},{cy + r * .78:.0f} {cx + r * .9:.0f},{cy + r * .9:.0f} L{cx - r * .9:.0f},{cy + r * .9:.0f} "
                 f"C{cx - r * 1.02:.0f},{cy + r * .72:.0f} {cx - r * 1.08:.0f},{cy + r * .48:.0f} {cx - r * 1.06:.0f},{cy + r * .15:.0f}Z", HAIR)


def strands(blow, tip_dy=0.0, lmul=1.0):
    """Hair strands streaming LEFT; variants differ in reach / tip height (12fps flutter drawings)."""
    cx, cy, r = CX, CY, R
    out = []
    for k, (y0, L, w) in enumerate(((-.95, 1.1, .2), (-.5, 1.45, .24), (.05, 1.2, .2), (.55, .9, .16))):
        L *= lmul
        x0, yy = cx - r * .95, cy + r * y0
        tip = x0 - r * L * blow
        ty = yy - r * .12 + r * tip_dy * (1 if k % 2 == 0 else -0.6)
        out.append(shape(f"M{x0 + r * .1:.0f},{yy - r * w:.0f} C{x0 - r * L * .35 * blow:.0f},{yy - r * w * 1.5:.0f} {tip + r * .3:.0f},{ty - r * w * .8:.0f} {tip:.0f},{ty:.0f} "
                         f"C{tip + r * .35:.0f},{ty + r * w * .4:.0f} {x0 - r * L * .3 * blow:.0f},{yy + r * w:.0f} {x0 + r * .1:.0f},{yy + r * w:.0f}Z", HAIR))
    return "".join(out)


def scarf_tail(tx, ty):
    cx, cy, r = CX, CY, R
    return shape(f"M{cx - r * .4:.0f},{cy + r * 1.22:.0f} C{cx - r * 1.1:.0f},{cy + r * 1.32:.0f} {cx - r * (tx - .7):.0f},{cy + r * (ty - .24):.0f} {cx - r * tx:.0f},{cy + r * ty:.0f} "
                 f"C{cx - r * (tx - .4):.0f},{cy + r * (ty + .3):.0f} {cx - r * 1.2:.0f},{cy + r * 1.7:.0f} {cx - r * .4:.0f},{cy + r * 1.56:.0f}Z", YEL)


def torso(tb=6.0):
    cx, cy, r = CX, CY, R
    return (shape(f"M{cx - r * 1.2:.0f},{cy + r * tb:.0f} C{cx - r * 1.2:.0f},{cy + r * 1.6:.0f} {cx - r * .72:.0f},{cy + r * 1.12:.0f} {cx:.0f},{cy + r * 1.12:.0f} "
                  f"C{cx + r * .72:.0f},{cy + r * 1.12:.0f} {cx + r * 1.2:.0f},{cy + r * 1.6:.0f} {cx + r * 1.2:.0f},{cy + r * tb:.0f}Z", WHITE)
            + f'<path d="M{cx - r * .3:.0f},{cy + r * 1.2:.0f} L{cx:.0f},{cy + r * 1.55:.0f} L{cx + r * .3:.0f},{cy + r * 1.2:.0f}" fill="none" stroke="{INK}" stroke-width="{LW * .8:.1f}" stroke-linejoin="round"/>'
            + shape(f"M{cx - r * .58:.0f},{cy + r * 1.0:.0f} C{cx - r * .2:.0f},{cy + r * 1.2:.0f} {cx + r * .2:.0f},{cy + r * 1.2:.0f} {cx + r * .58:.0f},{cy + r * 1.0:.0f} "
                    f"L{cx + r * .62:.0f},{cy + r * 1.3:.0f} C{cx + r * .2:.0f},{cy + r * 1.5:.0f} {cx - r * .2:.0f},{cy + r * 1.5:.0f} {cx - r * .62:.0f},{cy + r * 1.3:.0f}Z", YEL))


def face():
    cx, cy, r = CX, CY, R
    g = [f'<ellipse cx="{cx}" cy="{cy + r * .08:.0f}" rx="{r * .95:.0f}" ry="{r * .9:.0f}" fill="{SKIN}" stroke="{INK}" stroke-width="{LW}"/>',
         shape(f"M{cx - r * .96:.0f},{cy - r * .1:.0f} C{cx - r * .9:.0f},{cy - r * .95:.0f} {cx - r * .1:.0f},{cy - r * 1.22:.0f} {cx + r * .45:.0f},{cy - r * 1.12:.0f} "
               f"C{cx + r * .9:.0f},{cy - r * 1.02:.0f} {cx + r * 1.05:.0f},{cy - r * .62:.0f} {cx + r * .98:.0f},{cy - r * .12:.0f} "
               f"C{cx + r * .72:.0f},{cy - r * .42:.0f} {cx + r * .42:.0f},{cy - r * .38:.0f} {cx + r * .26:.0f},{cy - r * .6:.0f} "
               f"C{cx + r * .06:.0f},{cy - r * .36:.0f} {cx - r * .3:.0f},{cy - r * .34:.0f} {cx - r * .5:.0f},{cy - r * .56:.0f} "
               f"C{cx - r * .62:.0f},{cy - r * .3:.0f} {cx - r * .8:.0f},{cy - r * .22:.0f} {cx - r * .96:.0f},{cy - r * .1:.0f}Z", HAIR),
         f'<path d="M{cx - r * .2:.0f},{cy - r * 1.0:.0f} q{r * .3:.0f},{-r * .12:.0f} {r * .55:.0f},{-r * .02:.0f}" stroke="{HAIRH}" stroke-width="{LW}" fill="none" stroke-linecap="round"/>']
    for sx in (-1, 1):
        g.append(f'<ellipse cx="{cx + sx * r * .56:.0f}" cy="{cy + r * .44:.0f}" rx="{r * .16:.1f}" ry="{r * .09:.1f}" fill="{PINK}" opacity=".7"/>')
    return "".join(g)


def eyes_closed_pair():
    return "".join(eyes_closed(CX + sx * R * .36, CY + R * .14, R) for sx in (-1, 1))


def eyes_open_pair():
    out = ""
    for sx in (-1, 1):
        x = CX + sx * R * .36
        out += (f'<ellipse cx="{x:.0f}" cy="{CY + R * .12:.0f}" rx="{R * .085:.1f}" ry="{R * .13:.1f}" fill="{INK}"/>'
                f'<circle cx="{x + R * .03:.0f}" cy="{CY + R * .07:.0f}" r="{R * .03:.1f}" fill="{WHITE}"/>')
    return out


def smile():
    return f'<path d="M{CX - R * .14:.1f},{CY + R * .5:.1f} Q{CX:.1f},{CY + R * .64:.1f} {CX + R * .14:.1f},{CY + R * .5:.1f}" fill="none" stroke="{INK}" stroke-width="{LW * .8:.1f}" stroke-linecap="round"/>'


def mouth_o():
    return f'<ellipse cx="{CX}" cy="{CY + R * .56:.0f}" rx="{R * .08:.1f}" ry="{R * .1:.1f}" fill="{INK}"/>'


def arm_conch():
    cx, cy, r = CX, CY, R
    return (thick(f"M{cx - r * .9:.0f},{cy + r * 1.8:.0f} C{cx - r * 1.6:.0f},{cy + r * 1.45:.0f} {cx - r * 1.62:.0f},{cy + r * .9:.0f} {cx - r * 1.3:.0f},{cy + r * .6:.0f}", WHITE, r * .4)
            + conch_g(cx - r * 1.42, cy + r * .2, r * 1.15 / 560, -12)
            + f'<circle cx="{cx - r * 1.26:.0f}" cy="{cy + r * .52:.0f}" r="{r * .21:.0f}" fill="{SKIN}" stroke="{INK}" stroke-width="{LW}"/>')


def arc(i):
    return (f'<path id="f1-arc{i}" opacity=".15" d="M{CX - R * 2.05 - i * R * .2:.0f},{CY - R * .05 - i * R * .05:.0f} q{-R * .12:.0f},{R * .28:.0f} 0,{R * .56:.0f}" '
            f'fill="none" stroke="{INK}" stroke-width="{LW * .7:.1f}" stroke-linecap="round"/>')


def variant(id_, body, on=False):
    return f'<g id="{id_}" opacity="{1 if on else 0}">{body}</g>'


# ------------------------------------------------------------------ scene
HAIR_VARIANTS = [("f1-hairA", strands(.6)), ("f1-hairB", strands(.66, .05, 1.04)), ("f1-hairC", strands(.57, -.04, .97))]
HAIR_GUST = [("f1-hairG1", strands(1.25, .04, 1.25)), ("f1-hairG2", strands(1.38, -.05, 1.3))]
SCARF_VARIANTS = [("f1-scarfA", scarf_tail(2.3, 1.26)), ("f1-scarfB", scarf_tail(2.42, 1.12)), ("f1-scarfC", scarf_tail(2.24, 1.36))]
SCARF_GUST = [("f1-scarfG1", scarf_tail(3.2, 1.08)), ("f1-scarfG2", scarf_tail(3.35, 1.2))]

curls = [("f1-curl0", curl(1060, 960, .9)), ("f1-curl1", curl(900, 150, .6)), ("f1-curl2", curl(150, 170, .6, op=.7))]
crests = [("f1-crest0", crest(150, 560, .5), (190, 545)), ("f1-crest1", crest(210, 470, .36), (238, 459))]
flyers = [("f1-fly0", leaf(2010, 610, 110, 200)), ("f1-fly1", leaf(2080, 380, 90, 190)), ("f1-fly2", leaf(2150, 820, 80, 205)),
          ("f1-fly3", strand(2120, 520, 150)), ("f1-fly4", strand(2240, 700, 120))]
SWOOSH = "M1960,905 C1640,860 1260,985 900,930 C720,902 560,960 330,914 C250,898 200,870 218,842 C238,816 278,832 266,858"

col1 = [(1610, 230 + i * 104 * 1.12, ch) for i, ch in enumerate("我还是听见")]
col2 = [(1462, 330 + i * 104 * 1.12, ch) for i, ch in enumerate("那年的海浪")]
CHARS = col1 + col2


def lyric_chars():
    out = ""
    for i, (x, y, ch) in enumerate(CHARS):
        c = TEALD if i >= 8 else INK
        out += f'<text id="f1-c{i}" data-layout-allow-overlap x="{x}" y="{y:.0f}" font-family="WK" font-size="104" text-anchor="middle" fill="{c}" opacity="0">{ch}</text>'
    return out


SEAL_C = (1330, 765)
seal = (f'<g id="f1-seal" opacity="0"><g transform="rotate(-6 1330 760)"><rect x="1286" y="690" width="88" height="150" rx="6" fill="none" stroke="{RED}" stroke-width="6"/>'
        + VT(1330, 752, "风城", 56, "KL", {0: RED, 1: RED}, 1.05) + "</g>"
        + "".join(f'<circle class="f1-speck" cx="{x}" cy="{y}" r="{r}" fill="{RED}" opacity="0"/>' for x, y, r in [(1262, 700, 5), (1398, 690, 4), (1404, 846, 6), (1270, 852, 3), (1250, 776, 4)])
        + "</g>")

svg = f"""<svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
<defs>
<filter id="f1-wob" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence id="f1-turb" type="turbulence" baseFrequency="0.022" numOctaves="2" seed="1" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="6" xChannelSelector="R" yChannelSelector="G"/></filter>
<filter id="f1-wobT" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence id="f1-turbT" type="turbulence" baseFrequency="0.035" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G"/></filter>
<filter id="f1-grain" x="0" y="0" width="100%" height="100%"><feTurbulence id="f1-turbG" type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 0.25  0 0 0 0 0.2  0 0 0 0 0.12  0 0 0 0.16 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
</defs>
<rect width="1920" height="1080" fill="{PAPER}"/>
<rect width="1920" height="1080" filter="url(#f1-grain)" opacity=".9"/>
<g filter="url(#f1-wob)" data-layout-allow-overflow>
  <g id="f1-disc"><circle cx="600" cy="600" r="330" fill="{TEAL}" opacity=".9"/></g>
  {"".join(f'<g id="{i}">{b}</g>' for i, b in curls)}
  {"".join(f'<g id="{i}" opacity="0">{b}</g>' for i, b, _ in crests)}
  <path id="f1-swoosh" d="{SWOOSH}" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1" fill="none" stroke="{INK}" stroke-width="{LW}" stroke-linecap="round" stroke-linejoin="round"/>
  <g id="f1-person">
    {"".join(variant(i, b, k == 0) for k, (i, b) in enumerate(SCARF_VARIANTS + SCARF_GUST))}
    {torso()}
    <g id="f1-upper">
      {hair_back()}
      {"".join(variant(i, b, k == 0) for k, (i, b) in enumerate(HAIR_VARIANTS + HAIR_GUST))}
      {face()}
      <g id="f1-eyesC">{eyes_closed_pair()}{smile()}</g>
      <g id="f1-eyesO" opacity="0">{eyes_open_pair()}{mouth_o()}</g>
      {arm_conch()}
      {"".join(arc(i) for i in range(3))}
    </g>
  </g>
  {"".join(f'<g id="{i}">{b}</g>' for i, b in flyers)}
</g>
<g filter="url(#f1-wobT)">
  <g id="f1-lyric">{lyric_chars()}</g>
  {seal}
  <g id="f1-tag" opacity="0">{tag(1, 6, INK, "No.159 · 风城")}</g>
</g>
</svg>"""

# ------------------------------------------------------------------ timeline (all values computed here → pure data for JS)
spec = {
    "dur": DUR, "gust": GUST, "beats": BEATS, "lyricT": LYRIC_T,
    "chars": [[x, round(y - 104 * .38)] for x, y, _ in CHARS],
    "neck": NECK, "seal": SEAL_C,
    "hair": [i for i, _ in HAIR_VARIANTS], "hairGust": [i for i, _ in HAIR_GUST],
    "scarf": [i for i, _ in SCARF_VARIANTS], "scarfGust": [i for i, _ in SCARF_GUST],
    "crests": [[i, c] for i, _, c in crests],
    "curls": [["f1-curl0", 140, -70, -760], ["f1-curl1", 100, -50, -640], ["f1-curl2", 80, -40, -520]],
    "flyers": [["f1-fly0", 2010, 610], ["f1-fly1", 2080, 380], ["f1-fly2", 2150, 820], ["f1-fly3", 2050, 520], ["f1-fly4", 2180, 700]],
}

script = """
(function () {
  const S = %s;
  const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });
  // drawn motion is quantised to 12fps ("on twos"): floor the tween's progress to 1/12 s steps, then ease.
  const q = (name, dur) => { const b = gsap.parseEase(name); const n = Math.max(1, Math.round(dur * 12)); return (p) => b(Math.floor(p * n + 1e-6) / n); };
  const at = (x, y) => x + " " + y;

  // line boil — every drawn group re-jitters every 1/12 s (3-seed cycle)
  for (let k = 0; k / 12 < S.dur; k++) {
    const t = k / 12, s = (k %% 3) + 1;
    tl.set("#f1-turb", { attr: { seed: s } }, t);
    tl.set("#f1-turbT", { attr: { seed: s + 3 } }, t);
    tl.set("#f1-turbG", { attr: { seed: s + 6 } }, t);
  }
  // swap drawings in a cycle (hair + scarf flutter)
  const cycle = (ids, t0, t1, step, order) => {
    let k = 0;
    for (let t = t0; t < t1 - 1e-6; t += step, k++) {
      const on = order[k %% order.length];
      ids.forEach((id, i) => tl.set("#" + id, { opacity: i === on ? 1 : 0 }, t));
    }
  };
  const allHair = S.hair.concat(S.hairGust), allScarf = S.scarf.concat(S.scarfGust);
  cycle(allHair, 0, S.gust, 2 / 12, [0, 1, 2, 1]);
  cycle(allScarf, 0, S.gust, 2 / 12, [0, 2, 1, 2]);
  cycle(allHair, S.gust, S.dur, 1 / 12, [3, 4]);
  cycle(allScarf, S.gust, S.dur, 1 / 12, [3, 4]);

  // entrance: sea disc pops, the protagonist bobs up from the bottom edge
  tl.fromTo("#f1-disc", { scale: 0, svgOrigin: "600 600" }, { scale: 1, duration: 0.42, ease: q("back.out(1.5)", 0.42) }, 0);
  tl.fromTo("#f1-person", { y: 150, scaleY: 0.84, svgOrigin: "640 1080" }, { y: 0, scaleY: 1, duration: 0.5, ease: q("back.out(1.4)", 0.5) }, 0.04);
  tl.fromTo("#f1-tag", { opacity: 0, y: -24 }, { opacity: 1, y: 0, duration: 0.25, ease: q("back.out(2)", 0.25) }, 0.3);

  // listening sway (head + conch arm pivot at the neck)
  tl.to("#f1-upper", { rotation: 2.4, svgOrigin: at(S.neck[0], S.neck[1]), duration: 0.6, ease: q("sine.inOut", 0.6), repeat: 5, yoyo: true }, 0.5);

  // sound rings pulse out of the conch on every beat
  S.beats.forEach((b) => {
    tl.set("#f1-arc0", { opacity: 1 }, b);
    tl.set("#f1-arc1", { opacity: 1 }, b + 1 / 12);
    tl.set("#f1-arc2", { opacity: 1 }, b + 2 / 12);
    tl.set(["#f1-arc0", "#f1-arc1", "#f1-arc2"], { opacity: 0.15 }, b + 5 / 12);
  });
  // downbeat bumps on the sea disc
  [1.509, 3.924].forEach((b) => {
    tl.to("#f1-disc", { scale: 1.045, svgOrigin: "600 600", duration: 1 / 12 }, b);
    tl.to("#f1-disc", { scale: 1, svgOrigin: "600 600", duration: 2 / 12, ease: q("power1.out", 2 / 12) }, b + 1 / 12);
  });

  // little waves rise behind the ear and bob
  S.crests.forEach(([id, c], i) => {
    const t0 = 0.55 + i * 0.3;
    tl.fromTo("#" + id, { opacity: 0, scale: 0.2, svgOrigin: at(c[0], c[1]) }, { opacity: 1, scale: 1, duration: 0.25, ease: q("back.out(2.4)", 0.25) }, t0);
    tl.to("#" + id, { y: -12, svgOrigin: at(c[0], c[1]), duration: 0.5, ease: q("sine.inOut", 0.5), repeat: 6 - i, yoyo: true }, t0 + 0.3);
  });

  // wind curls drift right → left, then race at the gust
  S.curls.forEach(([id, x0, x1, x2]) => {
    tl.fromTo("#" + id, { x: x0 }, { x: x1, duration: S.gust, ease: q("none", S.gust) }, 0);
    tl.to("#" + id, { x: x2, duration: S.dur - S.gust, ease: q("power2.in", S.dur - S.gust) }, S.gust);
  });

  // the lyric writes itself, one sung syllable at a time
  S.lyricT.forEach((t, i) => {
    const c = S.chars[i];
    tl.fromTo("#f1-c" + i, { opacity: 0, scale: 0.3, rotation: -14, svgOrigin: at(c[0], c[1]) },
      { opacity: 1, scale: 1, rotation: 0, duration: 0.25, ease: q("back.out(2.2)", 0.25) }, t);
  });

  // 3.92 downbeat: the 风城 seal stamps down (squash + ink specks)
  const sc = at(S.seal[0], S.seal[1]);
  tl.fromTo("#f1-seal", { opacity: 0, scale: 1.9, rotation: -10, svgOrigin: sc }, { opacity: 1, scale: 1, rotation: 0, duration: 0.17, ease: q("power3.in", 0.17) }, 3.924 - 0.17);
  tl.to("#f1-seal", { scaleX: 1.08, scaleY: 0.88, svgOrigin: sc, duration: 1 / 12 }, 3.924);
  tl.to("#f1-seal", { scaleX: 1, scaleY: 1, svgOrigin: sc, duration: 2 / 12, ease: q("back.out(2)", 2 / 12) }, 3.924 + 1 / 12);
  tl.set(".f1-speck", { opacity: 1 }, 3.924);

  // 4.10 the gust: eyes open, body leans, a long wind line sweeps right → left, leaves + noodle strands fly
  tl.set("#f1-eyesC", { opacity: 0 }, S.gust + 1 / 12);
  tl.set("#f1-eyesO", { opacity: 1 }, S.gust + 1 / 12);
  tl.to("#f1-person", { rotation: -3.5, svgOrigin: "640 1080", duration: 0.25, ease: q("back.out(2)", 0.25) }, S.gust);
  tl.fromTo("#f1-swoosh", { attr: { "stroke-dashoffset": 1 } }, { attr: { "stroke-dashoffset": 0 }, duration: 0.3, ease: q("power2.out", 0.3) }, S.gust + 0.02);
  tl.to("#f1-lyric", { skewX: -6, x: -18, svgOrigin: "1540 470", duration: 0.2, ease: q("power2.out", 0.2) }, S.gust + 0.1);
  S.flyers.forEach(([id, x, y], i) => {
    tl.fromTo("#" + id, { x: 0, rotation: 0, svgOrigin: at(x, y) },
      { x: -(1500 + i * 180), rotation: -(160 + i * 50), duration: 0.5, ease: q("power1.in", 0.5) }, S.gust + 0.05 + i * 0.04);
  });

  tl.seek(0);
  window.__timelines["%s"] = tl;
})();
""" % (json.dumps(spec, ensure_ascii=False), FID)


import frame_kit  # noqa: E402

# 本库：字体由页面统一加载，镜头文件经 frame_kit.write_html 写到 demo/scenes/
style = ("#f1-root{position:absolute;inset:0;overflow:hidden;background:#F3EDE0}\n"
         + "#f1-root svg{position:absolute;inset:0;width:100%;height:100%;display:block}\n")
frame_kit.write_html(FID, "f1", DUR, svg, script, style, ("KL", "WK", "JBM"))
