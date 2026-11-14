#!/usr/bin/env python3
# 来自《风吹新竹》MV 工程的 scripts/handdrawn/build_f3.py。本库只改了导入（工具包由 tools/build.py 放上路径）。
"""Build compositions/frames/03-f3-thousand-windows.html — frame 3 (track 14.118–20.735, local 0–6.617).

Nightfall in three steps, five hand-drawn buildings thump up on the 14.70 kick, the second 风吹新竹啊 slams across
the sky and blows away, the grown-up protagonist walks right → left with a suitcase and the windows light up behind
them in clusters on the half-beats (city.py owns the window table + schedule, shared with frame 4).
"""
import os
import sys

from frame_kit import defs, js_data, write_frame  # noqa: E402
from hd_lib import *  # noqa: E402,F401,F403
from hd_people import *  # noqa: E402,F401,F403
from songlib import *  # noqa: E402,F401,F403  这首歌的道具和示范片的页码（覆盖工具包的 tag）
import city  # noqa: E402
import songlib as cut  # noqa: E402

CHORUS = cut.CUT in ("c1", "c2")   # chorus 1 / 2: same picture, their own two lines
TAG_TXT = "把漂泊吹成了牵挂啊" if CHORUS else "把远方吹成了牵挂啊"
RIB_TXT = "夜里亮起的千万扇窗啊" if CHORUS else "无论走过多少城市啊"
RS = 92 if len(RIB_TXT) > 9 else 102

FID, P, DUR = "03-f3-thousand-windows", "f3", city.F3_DUR
OFF = 14.118


def loc(ts, lead=0.04):
    return [round(t - OFF - lead, 3) for t in ts]


stars = "".join(f'<g id="f3-star{i}" opacity="0">{sparkle(x, y, s)}</g>' for i, (x, y, s) in enumerate(city.STARS))
W = city.walker_parts({"c1": WHITE, "c2": TEAL}.get(cut.CUT, ORANGE))
walker = (f'<g id="f3-walker"><g transform="translate({city.WALK["x0"]},{city.WALK["y"]})"><g id="f3-wbob">'
          f'<g id="f3-wscarf">{W["scarf"]}</g>{W["case"]}'
          f'<g id="f3-legsA">{W["legsA"]}</g><g id="f3-legsB" opacity="0">{W["legsB"]}</g>{W["body"]}</g></g></g>')

TITLE = []
title = ""
for i, ch in enumerate("风吹新竹啊"):
    x, y = 960 + (i - 2) * 200, 250 + (8 if i % 2 else -6)
    size = 190 if i < 4 else 120
    TITLE.append((x, y - 70))
    title += f'<g id="f3-t{i}" opacity="0" data-layout-allow-overlap>' + T(x, y, ch, size, "KL", YEL, "middle", INK, 15, (-5, 4, -3, 5, -8)[i], shadow=11) + "</g>"

tagline = (f'<g id="f3-tag" opacity="0"><g id="f3-tagsw"><line x1="430" y1="-20" x2="430" y2="104" stroke="{WHITE}" stroke-width="4"/>'
           + label(150, 104, 590, 100, T(445, 172, TAG_TXT, 54, "WK", INK, "middle"), PAPER, -3, 6) + "</g></g>")
RIB_Y = 520
RCH = []
rib_chars = ""
for i, ch in enumerate(RIB_TXT):
    cx = 206 + RS // 2 + RS * i
    RCH.append((cx, RIB_Y + 62))
    rib_chars += f'<text id="f3-r{i}" x="{cx}" y="{RIB_Y + 98}" font-family="KL" font-size="{RS}" text-anchor="middle" fill="{YEL}" opacity="0" data-layout-allow-overlap>{ch}</text>'
ribbon_svg = f'<g id="f3-ribbon" opacity="0">{ribbon(150, 1180, RIB_Y, 128, "", INK)}</g>'

spark = "".join(sparkle(x, y, s, WHITE) for x, y, s in [(1250, 400, 22), (1620, 560, 18), (1450, 760, 16), (1010, 640, 14)])

svg = (f'<svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg"><defs>{defs(P)}</defs>'
       + f'<rect id="f3-sky" width="1920" height="1080" fill="#3C5E93"/>'
       + f'<g filter="url(#f3-wob)" data-layout-allow-overflow>'
       + stars + f'<g id="f3-moon" opacity="0">{city.MOON}</g>'
       + city.buildings_svg("f3", lambda w: False)
       + city.street_svg()
       + walker
       + curl(1500, 960, .5, color=WHITE, op=.5)
       + f'<g id="f3-spark" opacity="0">{spark}</g>'
       + "</g>"
       + f'<g filter="url(#f3-wobT)" data-layout-allow-overflow>' + title + tagline + ribbon_svg + rib_chars + "</g>"
       + f'<rect width="1920" height="1080" filter="url(#f3-grain)" opacity=".35"/>' + tag(4, 6, WHITE)
       + "</svg>")

spec = {
    "dur": DUR,
    "walk": city.WALK,
    "builds": [[i, (b[0] + b[1]) // 2] for i, b in enumerate(city.BUILDINGS)],
    "bottom": city.BOTTOM,
    "win": [[w["id"], w["t"]] for w in city.WINDOWS if w["t"] is not None],
    "title": TITLE, "titleT": loc([14.55, 14.86, 15.17, 15.46, 15.72]),
    "tagT": loc([16.42], 0.12)[0],
    "rch": RCH, "ribT": loc([18.76, 18.93, 19.12, 19.33, 19.55, 19.76, 19.97, 20.14, 20.36, 20.62] if CHORUS else [18.76, 18.95, 19.19, 19.45, 19.70, 19.95, 20.10, 20.35, 20.62]),
    "snare": city.F3_SNARE,
}

js = """
  const S = %s;
  boil("f3", 0, S.dur);
  // nightfall in three drawn steps, then stars + moon
  [[0, "#3C5E93"], [2 / 12, "#2C4486"], [4 / 12, "#1E2A78"]].forEach(([t, c]) => tl.set("#f3-sky", { attr: { fill: c } }, t));
  tl.fromTo("#f3-moon", { opacity: 0, y: -160 }, { opacity: 1, y: 0, duration: 0.33, ease: q("back.out(1.6)", 0.33) }, 0.1);
  [0, 1, 2, 3, 4, 5].forEach((i) => {
    tl.set("#f3-star" + i, { opacity: 1 }, 0.25 + i * 0.07);
  });
  jitter(["#f3-star0", "#f3-star2", "#f3-star4"], 0.8, S.dur, 1 / 4, [{ opacity: 1 }, { opacity: 0.45 }]);
  jitter(["#f3-star1", "#f3-star3", "#f3-star5"], 0.8, S.dur, 1 / 4, [{ opacity: 0.45 }, { opacity: 1 }]);

  // 14.70 kick: the buildings thump up from the street
  S.builds.forEach(([i, cx], k) => {
    const t = 0.54 + [2, 0, 3, 1, 4][k] * 0.083;
    tl.fromTo("#f3-b" + i, { scaleY: 0, svgOrigin: at(cx, S.bottom) }, { scaleY: 1, duration: 0.25, ease: q("back.out(2.2)", 0.25) }, t);
  });

  // the second 风吹新竹啊 slams in, then the wind takes it off to the left
  S.titleT.forEach((t, i) => {
    const c = S.title[i];
    tl.fromTo("#f3-t" + i, { opacity: 0, scaleX: 0.6, scaleY: 1.5, y: -80, svgOrigin: at(c[0], c[1] + 70) },
      { opacity: 1, scaleX: 1, scaleY: 1, y: 0, duration: 0.25, ease: q("back.out(2.4)", 0.25) }, t);
    tl.to("#f3-t" + i, { x: -1500 - i * 120, y: -60 + i * 18, rotation: -40 - i * 12, svgOrigin: at(c[0], c[1] + 70), duration: 0.42, ease: q("power2.in", 0.42) }, 2.02 + i * 0.04);
  });

  // the grown-up protagonist walks right → left; legs swap on twos, body bobs, scarf streams ahead
  tl.fromTo("#f3-walker", { x: 0 }, { x: S.walk.x1 - S.walk.x0, duration: S.walk.t1 - S.walk.t0, ease: q("none", S.walk.t1 - S.walk.t0) }, S.walk.t0);
  cycle(["f3-legsA", "f3-legsB"], S.walk.t0, S.dur, 1 / 6, [0, 1]);
  jitter("#f3-wbob", S.walk.t0, S.dur, 1 / 6, [{ y: 0 }, { y: -6 }]);
  jitter("#f3-wscarf", 0, S.dur, 1 / 12, [{ scaleX: 1, svgOrigin: "-10 -190" }, { scaleX: 1.12, svgOrigin: "-10 -190" }, { scaleX: 0.95, svgOrigin: "-10 -190" }]);

  // windows light up behind them, in clusters on the half-beats
  S.win.forEach(([id, t]) => tl.set("#f3-w" + id, { opacity: 1 }, t));
  // 20.09 snare: the last stragglers flash on with a sparkle
  tl.set("#f3-spark", { opacity: 1 }, S.snare);
  tl.set("#f3-spark", { opacity: 0 }, S.snare + 4 / 12);

  // 把远方吹成了牵挂啊 — a paper tag drops in on its string and swings
  tl.fromTo("#f3-tag", { opacity: 0, y: -300 }, { opacity: 1, y: 0, duration: 0.3, ease: q("back.out(1.5)", 0.3) }, S.tagT);
  // swing written as a transform attribute: a late-starting svgOrigin tween (immediateRender:false) is not
  // seek-safe in GSAP — after seeking back past its start the origin compensation lands ~35px off.
  tl.fromTo("#f3-tagsw", { attr: { transform: "rotate(7 430 -20)" } }, { attr: { transform: "rotate(-5 430 -20)" }, duration: 0.42, ease: q("sine.inOut", 0.42), repeat: 5, yoyo: true, immediateRender: false }, S.tagT + 0.3);

  // 无论走过多少城市啊 — a black ribbon across the street, written word by word
  tl.fromTo("#f3-ribbon", { opacity: 0, x: 900 }, { opacity: 1, x: 0, duration: 0.25, ease: q("power3.out", 0.25) }, S.ribT[0] - 0.3);
  S.ribT.forEach((t, i) => pop("#f3-r" + i, t, at(S.rch[i][0], S.rch[i][1]), 0.22, "back.out(2.6)", -10));
""" % js_data(spec)

write_frame(FID, P, DUR, svg, js, NIGHT)
