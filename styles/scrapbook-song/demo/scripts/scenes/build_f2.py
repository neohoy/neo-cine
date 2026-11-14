#!/usr/bin/env python3
# 来自《风吹新竹》MV 工程的 scripts/handdrawn/build_f2.py。本库只改了导入（工具包由 tools/build.py 放上路径）。
"""Build compositions/frames/02-f2-gust-chorus.html — frame 2 (track 4.528–14.118, local 0–9.59).

g1 0–4.203  阵风: pink sunburst, close-up in the gust, comic burst on the 5.11 kick, 风吹新竹 pops, two labels
g2 4.203–9.59 地平线: hand-drawn coast — scooter ride from 东门城 to the sea, kites, crabs, heart weir, ticket, ribbon
A hand-drawn wind band wipes g1 → g2 (right → left). Layout = confirmed sketch (storyboard.html v4).
"""
import math
import os
import sys

from frame_kit import defs, js_data, write_frame  # noqa: E402
from hd_lib import *  # noqa: E402,F401,F403
from hd_people import *  # noqa: E402,F401,F403
from songlib import *  # noqa: E402,F401,F403  这首歌的道具和示范片的页码（覆盖工具包的 tag）

FID, P, DUR = "02-f2-gust-chorus", "f2", 9.59
G2 = 4.203
OFF = 4.528  # frame start on the track


def loc(track_times, lead=0.04):
    return [round(t - OFF - lead, 3) for t in track_times]


# ---------------------------------------------------------------- g1 — 阵风
def closeup_parts():
    tail = shape("M-70,170 C-180,150 -290,210 -420,180 C-330,250 -200,250 -70,215Z", YEL)
    tufts = "".join(shape(d, HAIR) for d in (
        "M-60,-130 C-160,-190 -300,-170 -430,-210 C-340,-120 -220,-100 -110,-70Z",
        "M-120,-60 C-230,-80 -350,-40 -470,-70 C-370,10 -250,10 -130,0Z",
        "M-130,20 C-230,40 -330,90 -440,80 C-340,140 -230,120 -120,80Z",
        "M-90,90 C-170,130 -240,180 -330,190 C-250,230 -160,200 -80,140Z"))
    rest = (f'<ellipse cx="-30" cy="-30" rx="165" ry="150" fill="{HAIR}" stroke="{INK}" stroke-width="{LW}"/>'
            + shape("M-230,620 C-220,250 -110,180 0,180 C120,180 230,250 240,620Z", WHITE)
            + f'<path d="M-40,186 L10,240 L60,186" fill="none" stroke="{INK}" stroke-width="{LW}" stroke-linejoin="round"/>'
            + shape("M-30,110 L40,110 L44,190 L-34,190Z", SKIN)
            + shape("M-70,150 C-20,185 70,185 110,150 L118,190 C70,225 -30,225 -78,190Z", YEL)
            + f'<ellipse cx="20" cy="10" rx="140" ry="135" fill="{SKIN}" stroke="{INK}" stroke-width="{LW}"/>'
            + shape("M152,0 q26,12 2,30", SKIN)
            + f'<ellipse cx="-88" cy="26" rx="24" ry="32" fill="{SKIN}" stroke="{INK}" stroke-width="{LW}"/><path d="M-94,14 q12,10 0,24" fill="none" stroke="{INK}" stroke-width="4"/>'
            + shape("M-122,-56 C-94,-140 20,-168 112,-132 C142,-118 160,-92 158,-58 C120,-80 82,-78 52,-96 C32,-70 -20,-60 -62,-82 C-82,-60 -102,-54 -122,-56Z", HAIR)
            + f'<path d="M-40,-120 q40,-22 90,-14" stroke="{HAIRH}" stroke-width="{LW}" fill="none" stroke-linecap="round"/>'
            + f'<path d="M30,-6 L62,10 L30,26 M142,-6 L114,10 L142,26" fill="none" stroke="{INK}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>'
            + f'<ellipse cx="22" cy="58" rx="26" ry="14" fill="{PINK}" opacity=".7"/><ellipse cx="152" cy="56" rx="14" ry="11" fill="{PINK}" opacity=".7"/>'
            + "".join(f'<line x1="{200 + i * 12}" y1="{-60 + i * 50}" x2="{270 + i * 18}" y2="{-66 + i * 50}" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>' for i in range(3)))
    mouth = f'<ellipse cx="108" cy="78" rx="20" ry="24" fill="{INK}"/><ellipse cx="108" cy="90" rx="11" ry="8" fill="{PINK}"/>'
    return (f'<g id="f2-head"><g transform="translate(330,560) scale(.95)">'
            f'<g id="f2-tail">{tail}</g><g id="f2-tufts">{tufts}</g>{rest}<g id="f2-mouth">{mouth}</g></g></g>')


wedges = "".join(
    f'<polygon points="1160,470 {1160 + 1700 * math.cos(math.radians(a)):.0f},{470 + 1700 * math.sin(math.radians(a)):.0f} {1160 + 1700 * math.cos(math.radians(a + 9)):.0f},{470 + 1700 * math.sin(math.radians(a + 9)):.0f}" fill="{PINKD}" opacity=".22"/>'
    for a in range(0, 360, 18))
stalk0 = stalk("M1800,1120 C1810,820 1790,520 1700,260", [(1806, 900, -2), (1800, 680, -6), (1770, 470, -18)]) + leaf(1640, 250, 120, 200) + leaf(1690, 330, 90, 210)
stalk1 = stalk("M1890,1120 C1900,760 1870,420 1770,150", [(1895, 860, -2), (1880, 600, -8), (1840, 380, -20)], 34) + leaf(1720, 140, 110, 190)
FLY = [  # (kind, y, start, travel_rot)
    ("leaf", 120, 0.08, -260), ("strand", 240, 0.32, -40), ("leaf", 980, 0.6, -300), ("strand", 820, 0.9, -30), ("leaf", 330, 1.25, -220),
    ("strand", 1010, 1.65, -50), ("leaf", 700, 2.1, -280), ("strand", 150, 2.5, -35), ("leaf", 900, 2.95, -240), ("strand", 420, 3.4, -45)]


def flyer(i, kind, y):
    body = leaf(1990, y, 90 if i % 3 else 120, 195 + 9 * (i % 4)) if kind == "leaf" else strand(2060, y, 120 + 15 * (i % 3))
    return f'<g id="f2-fly{i}">{body}</g>'


title = ""
TITLE = []
for i, (ch, rot, dy) in enumerate(zip("风吹新竹", (-7, 5, -4, 7), (-12, 14, -8, 10))):
    x, y = 815 + i * 230, 560 + dy
    TITLE.append((x, y - 90))
    title += (f'<g id="f2-t{i}" opacity="0" data-layout-allow-overlap>' + T(x, y, ch, 240, "KL", RED, "middle", INK, 16, rot, shadow=12)
              + f'<path d="M{x - 88},{426 + dy} q10,-22 32,-26" fill="none" stroke="{WHITE}" stroke-width="9" stroke-linecap="round" transform="rotate({rot} {x} {y})"/></g>')
bubble = (f'<g id="f2-bubble" opacity="0"><path d="M1460,150 C1460,96 1514,70 1570,70 C1634,70 1680,104 1680,152 C1680,204 1634,234 1570,234 C1550,234 1530,230 1514,224 L1446,260 L1472,206 C1464,192 1460,172 1460,150Z" '
          f'fill="{WHITE}" stroke="{INK}" stroke-width="{LW}" stroke-linejoin="round"/>' + T(1570, 182, "啊", 86, "KL", INK, "middle") + "</g>")
impact = "".join(
    f'<line x1="{1160 + 500 * math.cos(math.radians(a)):.0f}" y1="{450 + 360 * math.sin(math.radians(a)):.0f}" x2="{1160 + 600 * math.cos(math.radians(a)):.0f}" y2="{450 + 430 * math.sin(math.radians(a)):.0f}" stroke="{INK}" stroke-width="9" stroke-linecap="round"/>'
    for a in range(0, 360, 30))

g1 = (f'<g id="f2-g1">'
      + f'<rect width="1920" height="1080" fill="{PINK}"/>'
      + f'<g filter="url(#f2-wob)" data-layout-allow-overflow>'
      + f'<g id="f2-wedges">{wedges}</g>'
      + f'<g id="f2-puffs">{puff([(1800, 60, 140), (1660, 30, 110)])}</g>'
      + f'<g id="f2-stalk0">{stalk0}</g><g id="f2-stalk1">{stalk1}</g>'
      + f'<g id="f2-burst" opacity="0">{burst(1160, 450, 440, 310, 312, 222, 16, 7, YEL)}</g>'
      + f'<g id="f2-impact" opacity="0">{impact}</g>'
      + closeup_parts()
      + "".join(flyer(i, k, y) for i, (k, y, _, _) in enumerate(FLY))
      + "</g>"
      + f'<g filter="url(#f2-wobT)" data-layout-allow-overflow>' + title + bubble
      + f'<g id="f2-lab1" opacity="0">' + label(740, 850, 540, 112, T(1010, 928, "也吹过我们的", 70, "WK", INK, "middle"), PAPER, -3) + "</g>"
      + f'<g id="f2-lab2" opacity="0">' + label(1340, 878, 300, 112, T(1490, 956, "年少啊", 70, "WK", PAPER, "middle"), INK, 4) + "</g>"
      + "</g>"
      + f'<rect width="1920" height="1080" filter="url(#f2-grain)" opacity=".5"/>' + tag(2, 6, PAPER)
      + "</g>")

# ---------------------------------------------------------------- g2 — 地平线
sea = (f'<polygon points="0,660 960,660 840,1080 0,1080" fill="{TEALD}"/>'
       + f'<g id="f2-waves">' + "".join(f'<path d="M{x},{y} q22,-24 48,-6 q-16,0 -12,16" fill="none" stroke="{WHITE}" stroke-width="5" stroke-linecap="round" opacity=".85"/>'
                                        for x, y in [(80, 720), (560, 700), (640, 790), (120, 860), (700, 940), (220, 1000), (600, 1010), (330, 760)]) + "</g>")
sand = f'<polygon points="960,660 1070,660 950,1080 840,1080" fill="{BUFF}"/><path d="M960,660 L840,1080 M1070,660 L950,1080" stroke="{INK}" stroke-width="{LW}"/>'
land = f'<polygon points="1070,660 1920,660 1920,1080 950,1080" fill="{PAPER}"/>'
ROAD = "M1640,700 C1500,780 1300,770 1180,860 C1090,925 1040,990 1010,1080"
road = (f'<path d="{ROAD}" fill="none" stroke="{INK}" stroke-width="96" stroke-linecap="round"/><path d="{ROAD}" fill="none" stroke="#DCCFB2" stroke-width="80" stroke-linecap="round"/>'
        f'<path d="{ROAD}" fill="none" stroke="{WHITE}" stroke-width="6" stroke-dasharray="26 22"/>')
sun = f'<g id="f2-sun"><circle cx="330" cy="660" r="120" fill="{ORANGE}" stroke="{INK}" stroke-width="{LW}"/></g>'
rays = ('<g id="f2-rays">' + "".join(
    f'<line x1="{330 + 150 * math.cos(math.radians(a)):.0f}" y1="{660 - 150 * math.sin(math.radians(a)):.0f}" x2="{330 + 196 * math.cos(math.radians(a)):.0f}" y2="{660 - 196 * math.sin(math.radians(a)):.0f}" stroke="{INK}" stroke-width="{LW}" stroke-linecap="round"/>'
    for a in (20, 50, 80, 110, 140, 165)) + "</g>")


def bez(p0, p1, p2, p3, u):
    a = (1 - u) ** 3
    b = 3 * (1 - u) ** 2 * u
    c = 3 * (1 - u) * u * u
    d = u ** 3
    return (a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1])


SEG = [((1640, 700), (1500, 780), (1300, 770), (1180, 860)), ((1180, 860), (1090, 925), (1040, 990), (1010, 1080))]


def road_pt(u):
    seg, v = (SEG[0], u * 2) if u < .5 else (SEG[1], (u - .5) * 2)
    x, y = bez(*seg, v)
    x2, y2 = bez(*seg, min(1, v + .02))
    ang = math.degrees(math.atan2(y2 - y, x2 - x))  # heading (≈150–110° here: moving left-down)
    return x, y, ang


SC_KEYS = []
N = 9
for k in range(N):
    u = .1 + .72 * k / (N - 1)
    x, y, ang = road_pt(u)
    s = .62 + .3 * k / (N - 1)
    tilt = max(-24, min(24, ang - 180 + (0 if ang > 90 else 0)))
    SC_KEYS.append({"t": round(G2 + .15 + (DUR - G2 - .25) * k / (N - 1), 3), "x": round(x - 10, 1), "y": round(y - 30 * s, 1), "s": round(s, 3), "r": round(tilt * .45, 2)})

htitle = ""
HTITLE = []
for i, ch in enumerate("从东门城到海岸啊"):
    cx = 120 + 128 * i + 64
    cy = 250 - math.tan(math.radians(2)) * (128 * i + 64)
    HTITLE.append((round(cx), round(cy - 46)))
    htitle += f'<g id="f2-h{i}" opacity="0" data-layout-allow-overlap>' + T(round(cx), round(cy), ch, 128, "KL", WHITE, "middle", INK, 14, -2, shadow=10) + "</g>"

RIB = "「每一步都有回家的光啊」"
rib_chars = ""
RCH = []
for i, ch in enumerate(RIB):
    cx = 202 + 66 * i
    RCH.append((cx, 976))
    op = 1 if i in (0, len(RIB) - 1) else 0
    rib_chars += f'<text id="f2-r{i}" x="{cx}" y="1000" font-family="WK" font-size="66" text-anchor="middle" fill="{WHITE}" opacity="{op}" data-layout-allow-overlap>{ch}</text>'
glow = f'<g id="f2-glow" opacity="0"><path d="M780,940 C760,930 740,965 760,990 C780,1018 830,1012 846,986 C860,960 830,926 800,934" fill="{YEL}" stroke="{INK}" stroke-width="5"/></g>'
ribbon_svg = ribbon(120, 1010, 920, 112, glow + rib_chars, INK)

g2 = (f'<g id="f2-g2" opacity="0">'
      + f'<rect width="1920" height="1080" fill="{TEAL}"/>'
      + f'<g filter="url(#f2-wob)" data-layout-allow-overflow>'
      + f'<g id="f2-cloud">{puff([(1300, 300, 50), (1360, 280, 62), (1420, 305, 48)], WHITE)}</g>'
      + rays + sun + sea + sand + land + f'<line x1="0" y1="660" x2="960" y2="660" stroke="{INK}" stroke-width="{LW}"/>'
      + f'<g id="f2-heart" opacity="0">{heart_weir(430, 800, .5, water=False)}</g>' + road
      + f'<g id="f2-kite0">{kite(800, 400, .62, -14)}</g><g id="f2-kite1">{kite(1120, 300, .45, 10)}</g>'
      + f'<g id="f2-gate">{gate(1650, 706, 1.0)}</g>'
      + f'<g id="f2-crab0">{crab(1000, 770, .32)}</g><g id="f2-crab1">{crab(900, 965, .3)}</g>'
      + f'<g id="f2-scooter"><g id="f2-bob">{scooter2(0, 0, 1)}</g></g>'
      + "</g>"
      + f'<g filter="url(#f2-wobT)" data-layout-allow-overflow>' + htitle
      + f'<g id="f2-ticket">{ticket(1460, 70, 8, TEAL)}</g>'
      + f'<g id="f2-ribbon" opacity="0">{ribbon_svg}</g>'
      + "</g>"
      + f'<rect width="1920" height="1080" filter="url(#f2-grain)" opacity=".5"/>' + tag(3, 6, INK)
      + f'<rect id="f2-dusk" width="1920" height="1080" fill="{NIGHT}" opacity="0"/>'
      + "</g>")

# ---------------------------------------------------------------- wind band wipe (g1 → g2)
band = (f'<path d="M0,-120 C-70,60 70,170 0,300 C-80,430 50,540 -14,660 C-70,780 60,880 0,1000 L0,1200 L2600,1200 L2600,-120Z" fill="{TEAL}" stroke="{INK}" stroke-width="10" stroke-linejoin="round"/>'
        + "".join(f'<line x1="{x}" y1="{y}" x2="{x + L}" y2="{y}" stroke="{WHITE}" stroke-width="10" stroke-linecap="round" opacity=".8"/>' for x, y, L in [(90, 180, 380), (140, 420, 520), (80, 610, 300), (160, 840, 460), (110, 1010, 260)])
        + curl(60, 330, .8, color=WHITE) + curl(40, 780, .7, color=WHITE))
wipe = f'<g filter="url(#f2-wob)" data-layout-allow-overflow><g id="f2-wipe">{band}</g></g>'

svg = (f'<svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg"><defs>{defs(P)}</defs>'
       + g1 + g2 + wipe + "</svg>")

# ---------------------------------------------------------------- timeline
spec = {
    "G2": G2, "dur": DUR,
    "title": TITLE, "titleT": loc([4.77, 5.05, 5.40, 5.70]), "bubbleT": loc([6.02])[0],
    "lab": loc([6.70, 8.08]),
    "fly": [[i, s, r] for i, (_, _, s, r) in enumerate(FLY)],
    "beatsG1": [round(b - OFF, 3) for b in (5.108, 5.712, 6.316, 6.92, 7.523, 8.127)],
    "htitle": HTITLE, "htitleT": loc([9.30, 9.57, 9.76, 9.90, 10.05, 10.18, 10.50, 10.60]),
    "rch": RCH, "ribT": loc([11.66, 11.88, 12.16, 12.40, 12.59, 12.84, 13.15, 13.45, 13.64, 13.95]),
    "keys": SC_KEYS,
    "beatsG2": [round(b - OFF, 3) for b in (9.334, 9.938, 10.519, 11.122, 11.726, 12.33, 12.91, 13.537)],
}

js = """
  const S = %s;
  boil("f2", 0, S.dur);
  tl.set("#f2-g1", { opacity: 1 }, 0);
  tl.set("#f2-g1", { opacity: 0 }, S.G2);
  tl.set("#f2-g2", { opacity: 1 }, S.G2);

  // ---------- g1 · 阵风 ----------
  tl.fromTo("#f2-head", { x: -460 }, { x: 0, duration: 0.33, ease: q("back.out(1.6)", 0.33) }, 0);
  jitter("#f2-tufts", 0, S.G2, 1 / 12, [{ scaleX: 1, svgOrigin: "-110 -40" }, { scaleX: 1.07, svgOrigin: "-110 -40" }, { scaleX: 0.96, svgOrigin: "-110 -40" }, { scaleX: 1.04, svgOrigin: "-110 -40" }]);
  jitter("#f2-tail", 0, S.G2, 1 / 12, [{ scaleX: 1, svgOrigin: "-70 190" }, { scaleX: 1.1, svgOrigin: "-70 190" }, { scaleX: 0.94, svgOrigin: "-70 190" }]);
  jitter("#f2-mouth", 0, S.G2, 1 / 6, [{ scaleY: 1, svgOrigin: "108 80" }, { scaleY: 0.72, svgOrigin: "108 80" }, { scaleY: 1.12, svgOrigin: "108 80" }]);
  tl.fromTo("#f2-wedges", { rotation: 0, svgOrigin: "1160 470" }, { rotation: 16, duration: S.G2, ease: q("none", S.G2) }, 0);
  tl.fromTo("#f2-puffs", { x: 0 }, { x: -70, duration: S.G2, ease: q("none", S.G2) }, 0);
  tl.fromTo("#f2-stalk0", { rotation: 0, svgOrigin: "1800 1120" }, { rotation: -4, duration: 0.3, ease: q("sine.inOut", 0.3), repeat: 13, yoyo: true }, 0);
  tl.fromTo("#f2-stalk1", { rotation: 0, svgOrigin: "1890 1120" }, { rotation: -3, duration: 0.35, ease: q("sine.inOut", 0.35), repeat: 11, yoyo: true }, 0.1);
  S.fly.forEach(([i, t, r]) => {
    tl.fromTo("#f2-fly" + i, { x: 0, rotation: 0, svgOrigin: "2000 540" }, { x: -2400, rotation: r, duration: 1.2, ease: q("power1.in", 1.2) }, t);
  });
  // 5.11 kick: the comic burst explodes behind the title
  tl.fromTo("#f2-burst", { opacity: 0, scale: 0, svgOrigin: "1160 450" }, { opacity: 1, scale: 1, duration: 0.25, ease: q("back.out(2.6)", 0.25) }, 0.5);
  tl.set("#f2-impact", { opacity: 1 }, 0.58);
  tl.set("#f2-impact", { opacity: 0 }, 0.58 + 3 / 12);
  S.beatsG1.slice(1).forEach((b) => {
    tl.to("#f2-burst", { scale: 1.06, svgOrigin: "1160 450", duration: 1 / 12 }, b);
    tl.to("#f2-burst", { scale: 1, svgOrigin: "1160 450", duration: 2 / 12, ease: q("power1.out", 2 / 12) }, b + 1 / 12);
  });
  S.titleT.forEach((t, i) => {
    const c = S.title[i];
    tl.fromTo("#f2-t" + i, { opacity: 0, scaleX: 0.6, scaleY: 1.5, y: -90, svgOrigin: at(c[0], c[1] + 90) },
      { opacity: 1, scaleX: 1, scaleY: 1, y: 0, duration: 0.25, ease: q("back.out(2.4)", 0.25) }, t);
  });
  pop("#f2-bubble", S.bubbleT, "1570 160", 0.25, "back.out(2.6)", 10);
  [["#f2-lab1", "1010 906"], ["#f2-lab2", "1490 934"]].forEach(([sel, o], i) => {
    tl.fromTo(sel, { opacity: 0, scale: 1.45, rotation: i ? 10 : -10, svgOrigin: o }, { opacity: 1, scale: 1, rotation: 0, duration: 0.2, ease: q("power3.out", 0.2) }, S.lab[i]);
  });

  // ---------- wind band wipe: right → left, covers the frame on the swap ----------
  tl.fromTo("#f2-wipe", { x: 2000 }, { x: -2700, duration: 0.5, ease: q("none", 0.5) }, S.G2 - 0.25);

  // ---------- g2 · 地平线 ----------
  tl.fromTo("#f2-sun", { y: 70 }, { y: 0, duration: 0.4, ease: q("power2.out", 0.4) }, S.G2);
  tl.fromTo("#f2-rays", { rotation: 0, svgOrigin: "330 660" }, { rotation: 12, duration: S.dur - S.G2, ease: q("none", S.dur - S.G2) }, S.G2);
  tl.fromTo("#f2-gate", { scaleY: 0, svgOrigin: "1650 706" }, { scaleY: 1, duration: 0.3, ease: q("back.out(2)", 0.3) }, S.G2 + 0.08);
  tl.fromTo("#f2-heart", { opacity: 0, scale: 0.2, svgOrigin: "430 780" }, { opacity: 1, scale: 1, duration: 0.25, ease: q("back.out(2.4)", 0.25) }, S.G2 + 0.3);
  tl.fromTo("#f2-cloud", { x: 0 }, { x: -70, duration: S.dur - S.G2, ease: q("none", S.dur - S.G2) }, S.G2);
  tl.fromTo("#f2-waves", { x: 0 }, { x: -26, duration: 0.6, ease: q("sine.inOut", 0.6), repeat: 8, yoyo: true }, S.G2);
  tl.fromTo("#f2-kite0", { rotation: -6, y: 0, svgOrigin: "800 400" }, { rotation: 6, y: -14, duration: 0.55, ease: q("sine.inOut", 0.55), repeat: 8, yoyo: true }, S.G2);
  tl.fromTo("#f2-kite1", { rotation: 5, y: 0, svgOrigin: "1120 300" }, { rotation: -7, y: -10, duration: 0.65, ease: q("sine.inOut", 0.65), repeat: 7, yoyo: true }, S.G2 + 0.1);
  jitter("#f2-crab0", S.G2 + 0.3, S.dur, 1 / 6, [{ rotation: 0, svgOrigin: "1000 780" }, { rotation: -9, svgOrigin: "1000 780" }, { rotation: 0, svgOrigin: "1000 780" }, { rotation: 7, svgOrigin: "1000 780" }]);
  jitter("#f2-crab1", S.G2 + 0.4, S.dur, 1 / 6, [{ rotation: 6, svgOrigin: "900 975" }, { rotation: 0, svgOrigin: "900 975" }, { rotation: -8, svgOrigin: "900 975" }, { rotation: 0, svgOrigin: "900 975" }]);
  // the scooter rides the road from 东门城 towards the beach (keyframes along the road curve)
  // transform written as an attribute: GSAP's svgOrigin is a global point re-mapped through the current matrix,
  // which with large x/y made the scooter drift off the road (smoothOrigin compensation). This is exact.
  const K = S.keys;
  const tr = (k) => "translate(" + k.x + " " + k.y + ") rotate(" + k.r + ") scale(" + k.s + ")";
  tl.set("#f2-scooter", { attr: { transform: tr(K[0]) } }, S.G2);
  for (let i = 1; i < K.length; i++) {
    const d = K[i].t - K[i - 1].t;
    tl.to("#f2-scooter", { attr: { transform: tr(K[i]) }, duration: d, ease: q("none", d) }, K[i - 1].t);
  }
  jitter("#f2-bob", S.G2, S.dur, 1 / 12, [{ y: 0 }, { y: -4 }, { y: 0 }, { y: -2 }]);
  // ticket blown in from the right
  tl.fromTo("#f2-ticket", { x: 760, y: -160, rotation: 50, svgOrigin: "1655 150" }, { x: 0, y: 0, rotation: 0, duration: 0.45, ease: q("power2.out", 0.45) }, S.G2 + 0.65);
  jitter("#f2-ticket", S.G2 + 1.15, S.dur, 1 / 4, [{ rotation: -2, svgOrigin: "1655 150" }, { rotation: 1.5, svgOrigin: "1655 150" }, { rotation: -1, svgOrigin: "1655 150" }, { rotation: 2, svgOrigin: "1655 150" }]);
  S.htitleT.forEach((t, i) => pop("#f2-h" + i, t, at(S.htitle[i][0], S.htitle[i][1])));
  // 11.10 kick: the ribbon slaps up, then the line writes itself
  tl.fromTo("#f2-ribbon", { opacity: 0, y: 300 }, { opacity: 1, y: 0, duration: 0.25, ease: q("back.out(1.7)", 0.25) }, S.ribT[0] - 0.62);
  S.ribT.forEach((t, k) => pop("#f2-r" + (k + 1), t, at(S.rch[k + 1][0], S.rch[k + 1][1]), 0.2, "back.out(2.6)", -8));
  pop("#f2-glow", S.ribT[8], "803 975", 0.25, "back.out(3)", 0);
  tl.to("#f2-rays", { scale: 1.3, svgOrigin: "330 660", duration: 1 / 12 }, S.ribT[8]);
  tl.to("#f2-rays", { scale: 1, svgOrigin: "330 660", duration: 4 / 12, ease: q("power2.out", 4 / 12) }, S.ribT[8] + 1 / 12);
  // dusk creeps in before frame 3's nightfall
  [[9.27, 0.14], [9.36, 0.28], [9.44, 0.4]].forEach(([t, o]) => tl.set("#f2-dusk", { opacity: o }, t));
  tl.to("#f2-sun", { y: 60, duration: 0.3, ease: q("power1.in", 0.3) }, 9.27);
""" % js_data(spec)

write_frame(FID, P, DUR, svg, js, TEAL)
