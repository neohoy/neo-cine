#!/usr/bin/env python3
# 来自《风吹新竹》MV 工程的 scripts/handdrawn/build_f4.py。本库改了：时长从 cut.SCENES 取（剪贴簿那页多停 0.7 秒）。
"""Build compositions/frames/04-f4-brightest-home.html — frame 4 (track 20.735–30.0, local 0–9.265).

g0 0–0.62     frame 3's street: the wind blows the windows out right → left (and the lyrics away), then the camera
              pushes into the last lit window (×31, its yellow pane fills the frame)
g1 0.62–4.784 inside: curtains in the wind, 贡丸米粉汤 steaming, a string of 柿饼; 这里仍是 / 心里最亮的 writes in;
              24.89 snare: 家 drops and lands with a squash, dust and sparkles
g2 4.784–9.265 scrapbook page: polaroid of the two friends at the sea drops in, tape, ticket, signature,
              27.93 the 风吹新竹 seal stamps; fade out with the music from 28.3
"""
import math
import os
import sys

from frame_kit import defs, js_data, write_frame  # noqa: E402
from hd_lib import *  # noqa: E402,F401,F403
from hd_people import *  # noqa: E402,F401,F403
from songlib import *  # noqa: E402,F401,F403  这首歌的道具和示范片的页码（覆盖工具包的 tag）
import city  # noqa: E402
import songlib as cut  # noqa: E402

FID, P = "04-f4-brightest-home", "f4"
# 本库：原片这一镜 9.265 秒（到 189.90）；示范片让剪贴簿这一页多停 0.7 秒再交给片尾卡，
# 「风吹新竹」印章 187.83 盖下以后要停够 2.4 秒才读得完（readcheck）。时长从 cut.SCENES 取。
_g0, _g1 = cut.span(FID)
DUR = round(_g1 - _g0, 3)
OFF = 20.735
G1, G2 = 0.62, 4.784
CW = city.chosen_window()
WC = (CW["x"] + city.WW / 2, CW["y"] + city.WH / 2)


def loc(ts, lead=0.04):
    return [round(t - OFF - lead, 3) for t in ts]


# ---------------------------------------------------------------- g0 · the street, then the push-in
W = city.walker_parts()
walker = (f'<g transform="translate({city.WALK["x1"]},{city.WALK["y"]})">'
          f'<g transform="translate(-10 -190) scale(1.12 1) translate(10 190)">{W["scarf"]}</g>{W["case"]}{W["legsA"]}{W["body"]}</g>')
stars = "".join(f'<g opacity="{1 if i % 2 else .45}">{sparkle(x, y, s)}</g>' for i, (x, y, s) in enumerate(city.STARS))
lit_end = city.lit_at_f3_end
blow = [[w["id"], round(math.floor((1900 - w["xc"]) / 1900 * 0.30 * 12) / 12, 3)] for w in city.WINDOWS if lit_end(w) and not w["chosen"]]

f3_tag = (f'<g id="f4-otag"><g transform="rotate(7 430 -20)"><line x1="430" y1="-20" x2="430" y2="104" stroke="{WHITE}" stroke-width="4"/>'
          + label(150, 104, 590, 100, T(445, 172, "把远方吹成了牵挂啊", 54, "WK", INK, "middle"), PAPER, -3, 6) + "</g></g>")
f3_rib = (f'<g id="f4-orib">{ribbon(150, 1180, 520, 128, "", INK)}'
          + "".join(f'<text x="{206 + 51 + 102 * i}" y="618" font-family="KL" font-size="102" text-anchor="middle" fill="{YEL}">{ch}</text>' for i, ch in enumerate("无论走过多少城市啊"))
          + "</g>")

g0 = (f'<g id="f4-g0">'
      + f'<g filter="url(#f4-wobZ)" data-layout-allow-overflow><g id="f4-cam">'
      + f'<rect x="-200" y="-200" width="2320" height="1480" fill="{NIGHT}"/>' + stars + city.MOON
      + city.buildings_svg("f4", lit_end) + city.street_svg() + walker
      + "</g>"
      + f'<g id="f4-gust0">{curl(1500, 300, 1.0, color=WHITE)}</g><g id="f4-gust1">{curl(1300, 720, .8, color=WHITE)}</g>'
      + "</g>"
      + f'<g filter="url(#f4-wobT)" data-layout-allow-overflow>{f3_tag}{f3_rib}</g>'
      + f'<rect width="1920" height="1080" filter="url(#f4-grain)" opacity=".35"/>'
      + "</g>")

# ---------------------------------------------------------------- g1 · inside the last window
cx, cy, r = 520, 650, 94
person = {
    "torso": (shape(f"M{cx - r * 1.3:.0f},{cy + r * 3.3:.0f} C{cx - r * 1.3:.0f},{cy + r * 1.7:.0f} {cx - r * .78:.0f},{cy + r * 1.1:.0f} {cx:.0f},{cy + r * 1.1:.0f} "
                    f"C{cx + r * .78:.0f},{cy + r * 1.1:.0f} {cx + r * 1.3:.0f},{cy + r * 1.7:.0f} {cx + r * 1.3:.0f},{cy + r * 3.3:.0f}Z", ORANGE)
              + shape(f"M{cx - r * .42:.0f},{cy + r * 1.08:.0f} L{cx:.0f},{cy + r * 1.42:.0f} L{cx + r * .42:.0f},{cy + r * 1.08:.0f} L{cx + r * .2:.0f},{cy + r * 1.0:.0f} L{cx - r * .2:.0f},{cy + r * 1.0:.0f}Z", WHITE)),
    "head": head_front(cx, cy, r, "closed", 0),
    "table": (f'<rect x="{cx - r * 6:.0f}" y="{cy + r * 2.55:.0f}" width="{r * 12:.0f}" height="{r * 3:.0f}" fill="{WOOD}" stroke="{INK}" stroke-width="{LW}"/>'
              f'<line x1="{cx - r * 6:.0f}" y1="{cy + r * 2.85:.0f}" x2="{cx + r * 6:.0f}" y2="{cy + r * 2.85:.0f}" stroke="{INK}" stroke-width="4" opacity=".4"/>'),
    "arms": "".join(thick(f"M{cx + sx * r * 1.0:.0f},{cy + r * 1.6:.0f} C{cx + sx * r * 1.3:.0f},{cy + r * 2.0:.0f} {cx + sx * r * 1.2:.0f},{cy + r * 2.3:.0f} {cx + sx * r * 1.0:.0f},{cy + r * 2.35:.0f}", ORANGE, r * .36) for sx in (-1, 1)),
    "bowl": bowl_g(cx, cy + r * 2.2, r * 1.0, steam=False)
            + "".join(f'<circle cx="{cx + sx * r * 1.0:.0f}" cy="{cy + r * 2.36:.0f}" r="{r * .2:.0f}" fill="{SKIN}" stroke="{INK}" stroke-width="{LW}"/>' for sx in (-1, 1)),
    "sticks": thick(f"M{cx + r * .25:.0f},{cy + r * 2.1:.0f} L{cx + r * 1.2:.0f},{cy + r * 1.3:.0f}", WOOD, 7, 3) + thick(f"M{cx + r * .38:.0f},{cy + r * 2.14:.0f} L{cx + r * 1.32:.0f},{cy + r * 1.4:.0f}", WOOD, 7, 3),
}
BOWL_Y = cy + r * 2.2
steam = "".join(
    f'<path id="f4-steam{i}" d="M{cx + r * dx:.0f},{BOWL_Y - r * .32:.0f} c{-r * .16:.0f},{-r * .18:.0f} {r * .14:.0f},{-r * .34:.0f} 0,{-r * .54:.0f} c{-r * .14:.0f},{-r * .2:.0f} {r * .1:.0f},{-r * .32:.0f} 0,{-r * .46:.0f}" fill="none" stroke="{INK}" stroke-width="5" stroke-linecap="round" opacity=".55"/>'
    for i, dx in enumerate((-.4, 0, .4)))
curtain = (f'<path d="M34,34 L340,34 C312,210 262,380 196,520 C174,560 180,600 206,640 C156,760 112,900 72,1046 L34,1046Z" fill="{PINK}" stroke="{INK}" stroke-width="{LW}" stroke-linejoin="round"/>'
           f'<path d="M120,70 C130,300 110,440 128,560 M220,70 C210,260 190,400 168,520 M110,700 C100,820 84,940 70,1030" fill="none" stroke="{INK}" stroke-width="4" opacity=".45" stroke-linecap="round"/>'
           f'<ellipse cx="196" cy="572" rx="46" ry="20" transform="rotate(-24 196 572)" fill="{TEAL}" stroke="{INK}" stroke-width="{LW}"/>')
garland = f'<path d="M990,110 Q1270,220 1560,110" fill="none" stroke="{BROWN}" stroke-width="5"/>'
for t in (.12, .3, .5, .7, .88):
    px = (1 - t) ** 2 * 990 + 2 * (1 - t) * t * 1270 + t * t * 1560
    py = (1 - t) ** 2 * 110 + 2 * (1 - t) * t * 220 + t * t * 110
    garland += f'<line x1="{px:.0f}" y1="{py:.0f}" x2="{px:.0f}" y2="{py + 34:.0f}" stroke="{BROWN}" stroke-width="4"/>' + persimmon(round(px), round(py + 70), 34)
impact = "".join(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>'
                 for x1, y1, x2, y2 in [(1010, 1000, 960, 1020), (1024, 960, 970, 952), (1570, 1000, 1620, 1020), (1556, 960, 1610, 950), (1290, 440, 1290, 400), (1100, 470, 1070, 440), (1480, 470, 1510, 440)])
LINE_A = [(360 + 92 * i + 46, 230, ch) for i, ch in enumerate("这里仍是")]
LINE_B = [(360 + 92 * i + 46, 360, ch) for i, ch in enumerate("心里最亮的")]
CH = LINE_A + LINE_B
chars = "".join(f'<text id="f4-c{i}" x="{x}" y="{y}" font-family="WK" font-size="92" text-anchor="middle" fill="{INK}" opacity="0" data-layout-allow-overlap>{ch}</text>' for i, (x, y, ch) in enumerate(CH))
jia = (f'<g id="f4-jia" opacity="0" data-layout-allow-overlap><g transform="translate(1290,1010) scale(1.06,0.94) translate(-1290,-1010)">'
       + T(1290, 1000, "家", 540, "KL", RED, "middle", INK, 20, 0, shadow=14) + "</g></g>")

g1 = (f'<g id="f4-g1" opacity="0">'
      + f'<rect width="1920" height="1080" fill="{YEL}"/><ellipse cx="1150" cy="560" rx="760" ry="520" fill="#FFF1A8" opacity=".55"/>'
      + f'<g filter="url(#f4-wob)" data-layout-allow-overflow>'
      + f'<g id="f4-person">{person["torso"]}<g id="f4-head">{person["head"]}</g>{person["table"]}{person["arms"]}{person["bowl"]}<g id="f4-sticks">{person["sticks"]}</g></g>'
      + steam
      + f'<g id="f4-garland">{garland}</g>'
      + f'<g id="f4-curtL">{curtain}</g><g id="f4-curtR"><g transform="translate(1920,0) scale(-1,1)">{curtain}</g></g>'
      + f'<rect x="30" y="30" width="1860" height="1020" fill="none" stroke="{INK}" stroke-width="36" stroke-linejoin="round"/>'
      + f'<line x1="960" y1="30" x2="960" y2="1050" stroke="{INK}" stroke-width="26"/><line x1="30" y1="470" x2="1890" y2="470" stroke="{INK}" stroke-width="26"/>'
      + f'<g id="f4-impact" opacity="0">{impact}</g>'
      + f'<g id="f4-puffs" opacity="0">{puff([(1060, 1020, 34), (1110, 1034, 26), (1500, 1026, 32), (1548, 1036, 24)], WHITE, 5)}</g>'
      + "</g>"
      + f'<g filter="url(#f4-wobT)" data-layout-allow-overflow>{chars}{jia}'
      + f'<g id="f4-spk0" opacity="0">{sparkle(1640, 560, 26, WHITE)}</g><g id="f4-spk1" opacity="0">{sparkle(1010, 590, 18, WHITE)}</g><g id="f4-spk2" opacity="0">{sparkle(1560, 330, 20, WHITE)}</g>'
      + "</g>"
      + f'<rect width="1920" height="1080" filter="url(#f4-grain)" opacity=".4"/>' + tag(5, 6, INK)
      + f'<rect id="f4-flash" width="1920" height="1080" fill="{WHITE}" opacity="0"/>'
      + "</g>")

# ---------------------------------------------------------------- g2 · scrapbook page
pol = (f'<defs><clipPath id="f4-pc"><rect x="1062" y="190" width="440" height="460"/></clipPath>'
       f'<clipPath id="f4-sigclip"><rect id="f4-sigrect" x="550" y="760" width="0" height="110"/></clipPath></defs>'
       f'<g id="f4-pol" opacity="0"><g id="f4-polsq"><g transform="rotate(-3 1270 470)">'
       f'<rect x="1032" y="160" width="500" height="640" fill="{INK}" transform="translate(12,14)"/>'
       f'<rect x="1032" y="160" width="500" height="640" fill="{WHITE}" stroke="{INK}" stroke-width="{LW}"/>'
       f'<g clip-path="url(#f4-pc)"><rect x="1062" y="190" width="440" height="460" fill="{PINK}"/>'
       f'<circle cx="1160" cy="470" r="80" fill="{ORANGE}" stroke="{INK}" stroke-width="{LW}"/>'
       f'<rect x="1062" y="462" width="440" height="200" fill="{TEAL}" stroke="{INK}" stroke-width="{LW}"/>'
       + heart_weir(1420, 520, .26, water=False)
       + f'<g id="f4-pk0">{kite(1130, 280, .4, -12, .6, False)}</g><g id="f4-pk1">{kite(1440, 250, .3, 10, .6, False)}</g>'
       + f'<g id="f4-friends">{friends_back(1310, 600, .8)}</g></g>'
       f'<rect x="1062" y="190" width="440" height="460" fill="none" stroke="{INK}" stroke-width="{LW}"/>'
       + f'<g id="f4-cap" opacity="0">{T(1282, 742, "我们 · 那年的海", 50, "WK", INK, "middle")}</g></g></g></g>')
tape = (f'<g id="f4-tape0" opacity="0"><rect x="1080" y="128" width="150" height="50" fill="#EADFB8" opacity=".85" transform="rotate(-14 1155 153)"/></g>'
        f'<g id="f4-tape1" opacity="0"><rect x="1360" y="118" width="150" height="50" fill="#EADFB8" opacity=".85" transform="rotate(10 1435 143)"/></g>')
SEAL_C = (662, 460)
seal = (f'<g id="f4-seal" opacity="0"><g transform="rotate(-4 660 470)"><rect x="596" y="200" width="132" height="520" rx="8" fill="none" stroke="{RED}" stroke-width="9"/>'
        + VT(662, 300, "风吹新竹", 108, "KL", {i: RED for i in range(4)}, 1.08) + "</g>"
        + "".join(f'<circle class="f4-speck" cx="{x}" cy="{y}" r="{rr}" fill="{RED}" opacity="0"/>' for x, y, rr in [(570, 240, 6), (760, 260, 5), (770, 690, 7), (566, 700, 4), (548, 470, 5)])
        + "</g>")
g2 = (f'<g id="f4-g2" opacity="0">'
      + f'<rect width="1920" height="1080" fill="{PAPER}"/><rect width="1920" height="1080" filter="url(#f4-grain)" opacity=".9"/>'
      + f'<g filter="url(#f4-wob)" data-layout-allow-overflow>'
      + f'<g id="f4-curl0">{curl(240, 260, .7, op=.6)}</g><g id="f4-curl1">{curl(1600, 900, .5, op=.5)}</g>'
      + f'<g id="f4-leaf">{leaf(2000, 560, 90, 200)}</g>'
      + f'<g id="f4-ticket" opacity="0">{ticket(140, 790, -12, PAPER)}</g>' + pol + tape + "</g>"
      + f'<g filter="url(#f4-wobT)" data-layout-allow-overflow>{seal}</g>'
      + f'<g clip-path="url(#f4-sigclip)">{T(560, 840, "hoy neo", 84, "IS", INK)}</g>'
      + f'<g id="f4-sig2" opacity="0">{T(566, 900, "2026 · 新竹", 40, "WK", INK, op=.75)}</g>'
      + f'<g id="f4-tag" opacity="0">{tag(6, 6, INK, "No.189 · END")}</g>'
      + "</g>")

zoom_filter = ('<filter id="f4-wobZ" filterUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080">'
               '<feTurbulence id="f4-turbZ" type="turbulence" baseFrequency="0.022" numOctaves="2" seed="1" result="n"/>'
               '<feDisplacementMap in="SourceGraphic" in2="n" scale="6" xChannelSelector="R" yChannelSelector="G"/></filter>')
if cut.FULL:   # the song goes on: a pink wind band carries the page into the outro (s24 picks it up)
    from scene import band_body  # noqa: E402
    band = f'<g filter="url(#f4-wob)" data-layout-allow-overflow><g id="f4-band">{band_body(PINK, YEL)}</g></g>'
else:
    band = ""
svg = (f'<svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg"><defs>{defs(P)}{zoom_filter}</defs>'
       + g0 + g1 + g2 + band + f'<rect id="f4-fade" width="1920" height="1080" fill="{INK}" opacity="0"/></svg>')

spec = {
    "dur": DUR, "G1": G1, "G2": G2,
    "blow": blow, "wc": WC,
    "ch": [[x, y - 34] for x, y, _ in CH],
    "chT": [round(G1, 3), 0.785] + loc([21.90, 22.30, 22.78, 23.25, 23.70, 24.05, 24.45]),
    "jiaT": round(24.892 - OFF, 3),
    "neck": [cx, round(cy + r * 1.1)],
    "sealT": round(27.934 - OFF, 3),
    "fadeT": round(28.3 - OFF, 3),
    "fade": not cut.FULL,   # full cut: the song goes on — the outro picks up this page instead of fading out
}

js = """
  const S = %s;
  boil("f4", 0, S.dur);
  for (let k = 0; k / 12 < S.G1 + 0.01; k++) tl.set("#f4-turbZ", { attr: { seed: (k %% 3) + 1 } }, k / 12);
  tl.set("#f4-g0", { opacity: 1 }, 0);
  tl.set("#f4-g0", { opacity: 0 }, S.G1);
  tl.set("#f4-g1", { opacity: 1 }, S.G1);
  tl.set("#f4-g1", { opacity: 0 }, S.G2);
  tl.set("#f4-g2", { opacity: 1 }, S.G2);

  // ---------- g0 · the wind blows the street dark, the camera dives into the last lit window ----------
  S.blow.forEach(([id, t]) => tl.set("#f4-w" + id, { opacity: 0 }, t));
  tl.fromTo("#f4-gust0", { x: 300 }, { x: -2200, duration: 0.42, ease: q("power1.in", 0.42) }, 0);
  tl.fromTo("#f4-gust1", { x: 500 }, { x: -2000, duration: 0.42, ease: q("power1.in", 0.42) }, 0.05);
  tl.to("#f4-otag", { x: -1300, y: -140, rotation: -60, svgOrigin: "430 150", duration: 0.33, ease: q("power2.in", 0.33) }, 0);
  tl.to("#f4-orib", { x: -2300, rotation: -8, svgOrigin: "660 584", duration: 0.33, ease: q("power2.in", 0.33) }, 0.04);
  tl.fromTo("#f4-cam", { scale: 1, x: 0, y: 0, svgOrigin: at(S.wc[0], S.wc[1]) },
    { scale: 31, x: 960 - S.wc[0], y: 540 - S.wc[1], duration: S.G1 - 0.3, ease: q("expo.in", S.G1 - 0.3) }, 0.3);

  // ---------- g1 · inside ----------
  jitter("#f4-curtL", S.G1, S.G2, 1 / 6, [{ skewX: 0, svgOrigin: "34 34" }, { skewX: -4, svgOrigin: "34 34" }, { skewX: 2, svgOrigin: "34 34" }, { skewX: -2, svgOrigin: "34 34" }]);
  jitter("#f4-curtR", S.G1, S.G2, 1 / 6, [{ skewX: 3, svgOrigin: "1886 34" }, { skewX: 0, svgOrigin: "1886 34" }, { skewX: -2, svgOrigin: "1886 34" }, { skewX: 1, svgOrigin: "1886 34" }]);
  tl.fromTo("#f4-garland", { rotation: -2.5, svgOrigin: "1275 110" }, { rotation: 2.5, duration: 0.6, ease: q("sine.inOut", 0.6), repeat: 6, yoyo: true }, S.G1);
  [0, 1, 2].forEach((i) => jitter("#f4-steam" + i, S.G1 + i * 0.08, S.G2, 1 / 6,
    [{ y: 0, opacity: 0.6 }, { y: -10, opacity: 0.45 }, { y: -20, opacity: 0.3 }, { y: -6, opacity: 0.55 }]));
  tl.fromTo("#f4-head", { rotation: -2, svgOrigin: at(S.neck[0], S.neck[1]) }, { rotation: 2, duration: 0.6, ease: q("sine.inOut", 0.6), repeat: 5, yoyo: true }, S.G1);
  tl.fromTo("#f4-sticks", { rotation: 0, svgOrigin: "553 851" }, { rotation: -16, duration: 0.3, ease: q("sine.inOut", 0.3), repeat: 3, yoyo: true }, 1.8);
  S.chT.forEach((t, i) => pop("#f4-c" + i, t, at(S.ch[i][0], S.ch[i][1]), 0.25, "back.out(2.2)", -10));

  // 24.89 snare: 家 drops and lands — squash, dust, sparkles, a 2-frame flash
  const J = S.jiaT, base = "1290 1010";
  tl.set("#f4-jia", { opacity: 1 }, J - 0.2);
  tl.fromTo("#f4-jia", { y: -820, scaleX: 0.82, scaleY: 1.4, svgOrigin: base }, { y: 0, scaleX: 0.82, scaleY: 1.4, duration: 0.2, ease: q("power3.in", 0.2) }, J - 0.2);
  tl.to("#f4-jia", { scaleX: 1.2, scaleY: 0.76, svgOrigin: base, duration: 1 / 12 }, J);
  tl.to("#f4-jia", { scaleX: 1, scaleY: 1, svgOrigin: base, duration: 4 / 12, ease: q("back.out(3)", 4 / 12) }, J + 1 / 12);
  tl.set("#f4-flash", { opacity: 0.55 }, J);
  tl.set("#f4-flash", { opacity: 0 }, J + 2 / 30);
  tl.set(["#f4-impact", "#f4-puffs"], { opacity: 1 }, J);
  tl.set("#f4-impact", { opacity: 0 }, J + 4 / 12);
  tl.fromTo("#f4-puffs", { scale: 0.6, svgOrigin: "1300 1030" }, { scale: 1.25, opacity: 0, duration: 0.5, ease: q("power1.out", 0.5) }, J + 1 / 12);
  [["#f4-spk0", "1640 560"], ["#f4-spk1", "1010 590"], ["#f4-spk2", "1560 330"]].forEach(([s, o], i) => pop(s, J + 0.08 + i * 0.08, o, 0.2, "back.out(3)", 30));
  tl.to("#f4-person", { y: -10, duration: 1 / 12 }, J);
  tl.to("#f4-person", { y: 0, duration: 3 / 12, ease: q("back.out(2)", 3 / 12) }, J + 1 / 12);

  // ---------- g2 · the scrapbook page ----------
  tl.fromTo("#f4-pol", { opacity: 1, y: -900, rotation: 18, svgOrigin: "1282 480" }, { y: 0, rotation: 0, duration: 0.3, ease: q("power2.in", 0.3) }, S.G2);
  tl.to("#f4-polsq", { scaleY: 0.94, svgOrigin: "1282 800", duration: 1 / 12 }, S.G2 + 0.3);
  tl.to("#f4-polsq", { scaleY: 1, svgOrigin: "1282 800", duration: 3 / 12, ease: q("back.out(2.5)", 3 / 12) }, S.G2 + 0.3 + 1 / 12);
  pop("#f4-tape0", S.G2 + 0.45, "1155 153", 0.17, "power3.out", -20);
  pop("#f4-tape1", S.G2 + 0.56, "1435 143", 0.17, "power3.out", 20);
  tl.fromTo("#f4-ticket", { opacity: 1, x: -700, rotation: -30, svgOrigin: "335 870" }, { x: 0, rotation: 0, duration: 0.33, ease: q("power2.out", 0.33) }, S.G2 + 0.6);
  pop("#f4-cap", S.G2 + 0.8, "1282 726", 0.25, "back.out(2)", 0);
  pop("#f4-tag", S.G2 + 1.0, "200 80", 0.25, "back.out(2)", -6);
  tl.fromTo("#f4-sigrect", { attr: { width: 0 } }, { attr: { width: 420 }, duration: 0.5, ease: q("power1.inOut", 0.5) }, S.G2 + 1.3);
  pop("#f4-sig2", S.G2 + 1.9, "640 888", 0.25, "back.out(2)", 0);
  tl.fromTo("#f4-curl0", { x: 0 }, { x: -120, duration: S.dur - S.G2, ease: q("none", S.dur - S.G2) }, S.G2);
  tl.fromTo("#f4-curl1", { x: 0 }, { x: -160, duration: S.dur - S.G2, ease: q("none", S.dur - S.G2) }, S.G2);
  tl.fromTo("#f4-leaf", { x: 0, rotation: 0, svgOrigin: "2000 560" }, { x: -2300, y: 120, rotation: -320, duration: 3.6, ease: q("none", 3.6) }, S.G2 + 0.4);
  jitter("#f4-friends", S.G2, S.dur, 1 / 6, [{ x: 0 }, { x: -2 }, { x: 0 }, { x: 1 }]);
  tl.fromTo("#f4-pk0", { y: 0 }, { y: -10, duration: 0.6, ease: q("sine.inOut", 0.6), repeat: 6, yoyo: true }, S.G2);
  tl.fromTo("#f4-pk1", { y: 0 }, { y: -8, duration: 0.7, ease: q("sine.inOut", 0.7), repeat: 5, yoyo: true }, S.G2 + 0.2);
  // 27.93: the seal stamps down
  const sc = at(662, 460);
  tl.fromTo("#f4-seal", { opacity: 0, scale: 1.8, rotation: -12, svgOrigin: sc }, { opacity: 1, scale: 1, rotation: 0, duration: 0.17, ease: q("power3.in", 0.17) }, S.sealT - 0.17);
  tl.to("#f4-seal", { scaleX: 1.1, scaleY: 0.9, svgOrigin: sc, duration: 1 / 12 }, S.sealT);
  tl.to("#f4-seal", { scaleX: 1, scaleY: 1, svgOrigin: sc, duration: 2 / 12, ease: q("back.out(2)", 2 / 12) }, S.sealT + 1 / 12);
  tl.set(".f4-speck", { opacity: 1 }, S.sealT);
  // fade out with the music (a camera effect — smooth, not on twos)
  if (!S.fade) tl.fromTo("#f4-band", { x: 2000 }, { x: -340, duration: 0.25, ease: q("none", 0.25) }, S.dur - 0.25);
  if (S.fade) tl.fromTo("#f4-fade", { opacity: 0 }, { opacity: 1, duration: S.dur - S.fadeT, ease: "power1.in" }, S.fadeT);
""" % js_data(spec)

write_frame(FID, P, DUR, svg, js, YEL, fonts=("KL", "WK", "JBM", "IS"))
