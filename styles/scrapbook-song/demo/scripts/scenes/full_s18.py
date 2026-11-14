#!/usr/bin/env python3
# 来自《风吹新竹》MV 工程的 scripts/handdrawn/full_s18.py。本库只改了导入（工具包由 tools/build.py 放上路径）。
"""s18-apart (146.64–156.18) — bridge: 后来我们去了不同地方 / 把新竹藏进行李和日常.

a 146.64–151.30  split screen: left a snowy night city (the protagonist), right a sunny palm-tree city (the friend);
                 both look at their phones; a paper plane crosses the seam right → left
b 151.30–156.18  top view of an open red suitcase: Hsinchu drops in on the beats — a bundle of 米粉, persimmons,
                 the folded kite, the old ticket, the photo of the two of them, a bamboo leaf
"""
import os
import sys

from scene import *  # noqa: E402,F401,F403
from props2 import *  # noqa: E402,F401,F403
from songlib import *  # noqa: E402,F401,F403  这首歌的道具和示范片的页码（覆盖工具包的 tag）
import songlib as cut  # noqa: E402

sc = Scene("s18-apart", "s18", NIGHT)
GB = 151.30

# ---------------------------------------------------------------- a · 不同地方
sc.extra_defs = '<clipPath id="s18-cl"><rect x="0" y="0" width="960" height="1080"/></clipPath><clipPath id="s18-cr"><rect x="960" y="0" width="960" height="1080"/></clipPath>'
left = (f'<rect width="960" height="1080" fill="{NIGHT}"/>'
        + "".join(f'<rect x="{x}" y="{y}" width="{w}" height="{1080 - y}" fill="#2C3A7A" stroke="{INK}" stroke-width="{LW}"/>' for x, y, w in [(20, 420, 200), (240, 300, 170), (700, 380, 220)])
        + "".join(f'<rect x="{x}" y="{y}" width="40" height="46" rx="4" fill="{YEL}" stroke="{INK}" stroke-width="4"/>' for x, y in [(60, 480), (140, 560), (280, 360), (340, 460), (760, 440), (840, 540)])
        + f'<rect y="900" width="960" height="180" fill="{WHITE}"/><line x1="0" y1="900" x2="960" y2="900" stroke="{INK}" stroke-width="{LW}"/>'
        + "".join(f'<g id="s18-sn{k}">' + "".join(snowflake(x + 37 * k, y + 23 * k, 1.1) for x, y in [(80, 120), (300, 260), (520, 80), (760, 220), (180, 640), (620, 520), (860, 700), (420, 760)]) + "</g>" for k in range(3)))
right = (f'<rect x="960" width="960" height="1080" fill="{ORANGE}"/>'
         + sun(1700, 220, 110, YEL)
         + f'<rect x="960" y="900" width="960" height="180" fill="{BUFF}"/><line x1="960" y1="900" x2="1920" y2="900" stroke="{INK}" stroke-width="{LW}"/>'
         + palm(1800, 900, .9) + palm(1090, 900, .7))
PR, FRr = 78, 74
pcy = round(900 - PR * (2.9 + 1.5 * 1.25))
fcy = round(900 - FRr * (2.9 + 1.5 * 1.25))
pro = f'<g id="s18-pro">{pro_front(480, pcy, PR, "closed", "smile", ORANGE, 1.25, .2)}{phone(480 - 30, pcy + PR * 2.3, .9)}</g>'
fri = f'<g id="s18-fri">{friend_front(1440, fcy, FRr, "closed", "smile", WHITE, 1.25, .2)}{phone(1440 + 30, fcy + FRr * 2.3, .9)}</g>'
seam = f'<path d="M960,-20 L940,200 L980,420 L944,640 L976,860 L956,1100" fill="none" stroke="{INK}" stroke-width="14" stroke-linejoin="round"/>'
dash = f'<path id="s18-dl" d="M1440,{fcy - 200} C1300,{fcy - 520} 640,{pcy - 520} 480,{pcy - 200}" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1" fill="none" stroke="{WHITE}" stroke-width="6"/>'
plane = sc.group("pl", f'<path d="M0,0 L90,-20 L20,10 Z" fill="{WHITE}" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/><path d="M20,10 L60,40 L30,5Z" fill="#DDD" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>', op=0)
L36 = music.line(36)
la, oa = sc.chars("a", L36["text"], 960, 175, 76, "WK", INK)
ga = (f'<g id="s18-ga">'
      + sc.wob(f'<g clip-path="url(#s18-cl)">{left}{pro}</g><g clip-path="url(#s18-cr)">{right}{fri}</g>' + seam + dash + plane)
      + sc.wobT(label(510, 100, 900, 104, "", PAPER, -1) + la) + sc.grain(.4) + tag(*cut.page("s18a"), INK) + "</g>")

# ---------------------------------------------------------------- b · 行李
ITEMS = [
    ("nd", noodle_bundle(760, 470, 1.1, -12), (760, 470)),
    ("ps", persimmon(1120, 430, 58) + persimmon(1210, 480, 50), (1160, 450)),
    ("kt", kite(620, 640, .5, 70, .5, False), (640, 660)),
    ("tk", ticket(980, 540, -8, "#F0D9B5"), (1175, 620)),
    ("ph", photo(1340, 640, .8, 10, friends_back(0, 60, .3)), (1340, 640)),
    ("lf", leaf(860, 760, 140, -30) + leaf(920, 740, 110, -50), (890, 750)),
]
items = "".join(sc.group(f"it{k}", g, op=0) for k, (_, g, _) in enumerate(ITEMS))
L37 = music.line(37)
lb, ob = sc.chars("b", L37["text"], 960, 140, 76, "WK", INK)
gbv = (f'<g id="s18-gb" opacity="0"><rect width="1920" height="1080" fill="{PAPER}"/>'
       + sc.wob(suitcase_open(980, 620, 1000, 620) + items + curl(1700, 950, .6, op=.5) + curl(200, 300, .6, op=.5))
       + sc.wobT(label(530, 66, 860, 100, "", WHITE, 1) + lb) + sc.grain(.8) + tag(*cut.page("s18b"), INK) + "</g>")

body = ga + gbv + sc.band("mid", PAPER, ORANGE)
bts = music.beats(151.5, 156.0)
drops = bts[::max(1, len(bts) // len(ITEMS))][:len(ITEMS)]
js = [
    *[f'tl.set(["#s18-sn0", "#s18-sn1", "#s18-sn2"], {{ y: 0 }}, 0);'],
    f'cycle(["s18-sn0", "s18-sn1", "s18-sn2"], 0, {sc.L(GB):.2f}, 1 / 6, [0, 1, 2]);',
    f'tl.fromTo("#s18-pro", {{ y: 260 }}, {{ y: 0, duration: 0.33, ease: q("back.out(1.6)", 0.33) }}, 0.15);',
    f'tl.fromTo("#s18-fri", {{ y: 260 }}, {{ y: 0, duration: 0.33, ease: q("back.out(1.6)", 0.33) }}, 0.3);',
    f'drawOn("#s18-dl", 1.0, 1.4);',
    f'tl.set("#s18-pl", {{ opacity: 1 }}, 1.0);',
]
# paper plane rides the dashed arc right → left (stepped keyframes)
for k in range(13):
    u = k / 12
    p0, p1, p2, p3 = (1440, fcy - 200), (1300, fcy - 520), (640, pcy - 520), (480, pcy - 200)
    a_, b_, c_, d_ = (1 - u) ** 3, 3 * (1 - u) ** 2 * u, 3 * (1 - u) * u * u, u ** 3
    x = a_ * p0[0] + b_ * p1[0] + c_ * p2[0] + d_ * p3[0]
    y = a_ * p0[1] + b_ * p1[1] + c_ * p2[1] + d_ * p3[1]
    js.append(f'tl.set("#s18-pl", {{ x: {x:.0f}, y: {y:.0f} }}, {1.0 + 1.4 * u:.3f});')
js += [f'tl.set("#s18-ga", {{ opacity: 0 }}, {sc.L(GB)});', f'tl.set("#s18-gb", {{ opacity: 1 }}, {sc.L(GB)});']
for k, ((_, _, o), t) in enumerate(zip(ITEMS, drops)):
    js.append(f'tl.fromTo("#s18-it{k}", {{ opacity: 0, scale: 1.7, rotation: {(-20, 15, -10, 25, -15, 20)[k]}, svgOrigin: "{o[0]} {o[1]}" }}, {{ opacity: 1, scale: 1, rotation: 0, duration: 0.2, ease: q("power3.in", 0.2) }}, {sc.L(t) - 0.2:.2f});')
    js.append(f'bump("#s18-it{k}", {sc.L(t):.2f}, "{o[0]} {o[1]}", 0.9);')
sc.js += js
sc.pop_chars("a", oa, music.syllables(36))
sc.pop_chars("b", ob, music.syllables(37))
sc.band_through("mid", GB)
sc.write(body)
