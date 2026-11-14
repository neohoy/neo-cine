#!/usr/bin/env python3
# 来自《风吹新竹》MV 工程的 scripts/handdrawn/full_s19.py。本库只改了导入（工具包由 tools/build.py 放上路径）。
"""s19-strange-street (156.18–159.90) — 可一阵风穿过陌生街巷.

A grey-blue foreign street of narrow townhouses; the grown-up protagonist walks right → left. A gust comes
down the street — leaves, a page of newspaper, and one green bamboo leaf from home — and they stop dead,
scarf whipping, as the conch scene (f1, 我还是听见那年的海浪) takes over.
"""
import os
import sys

from scene import *  # noqa: E402,F401,F403
from props2 import *  # noqa: E402,F401,F403
from songlib import *  # noqa: E402,F401,F403  这首歌的道具和示范片的页码（覆盖工具包的 tag）
import songlib as cut  # noqa: E402

sc = Scene("s19-strange-street", "s19", "#9AA7C0")
houses = "".join(townhouse(x, 900, w, h, c, i) for i, (x, w, h, c) in enumerate(
    [(-30, 330, 640, "#8A8FA8"), (300, 300, 720, "#B0A090"), (600, 340, 600, "#7F8C9A"), (940, 300, 700, "#A68F8F"), (1240, 330, 640, "#8A9AA8"), (1570, 380, 690, "#9C9CB4")]))
cobbles = "".join(f'<ellipse cx="{x}" cy="{y}" rx="{30 + (x * 7) % 14}" ry="12" fill="none" stroke="{INK}" stroke-width="3" opacity=".3"/>' for x in range(40, 1920, 110) for y in (950, 1010, 1060))
SP = side_parts(ORANGE, "none")
WX0, WX1, WT0, WT1 = 1700, 900, 156.25, 158.30
walker = (f'<g id="s19-wk"><g transform="translate({WX0},1000) scale(1.35)"><g id="s19-bob"><g id="s19-scarf">{SP["scarf"]}</g>'
          f'<g id="s19-lA">{SP["legsA"]}</g><g id="s19-lB" opacity="0">{SP["legsB"]}</g>{SP["body"]}</g></g></g>')
GUST = [(2000, 380, "leaf"), (2080, 640, "curl"), (2150, 300, "paper"), (2050, 820, "leaf"), (2200, 520, "bamboo"), (2120, 720, "curl")]


def gust_item(kind, x, y):
    if kind == "leaf":
        return leaf(x, y, 80, 200, ORANGE)
    if kind == "curl":
        return curl(x + 30, y, .9, color=WHITE)
    if kind == "paper":
        return f'<rect x="{x - 60}" y="{y - 40}" width="120" height="80" fill="{WHITE}" stroke="{INK}" stroke-width="5" transform="rotate(-12 {x} {y})"/>'
    return leaf(x, y, 140, 195, BAMBOO)


gust = "".join(sc.group(f"g{i}", gust_item(k, x, y)) for i, (x, y, k) in enumerate(GUST))
L38 = music.line(38)
la, oa = sc.chars("a", L38["text"], 960, 180, 80, "WK", INK)
body = (f'<rect width="1920" height="1080" fill="#9AA7C0"/>'
        + sc.wob(puff([(1400, 200, 60), (1470, 180, 74), (1540, 205, 58)], "#C8D0E0") + houses + street_lamp(560, 900, 380, False) + street_lamp(1500, 900, 380, False)
                 + f'<rect y="900" width="1920" height="180" fill="#7C8296"/><line x1="0" y1="900" x2="1920" y2="900" stroke="{INK}" stroke-width="{LW}"/>' + cobbles
                 + walker + gust)
        + sc.wobT(label(500, 100, 920, 104, "", PAPER, -1) + la) + sc.grain(.45) + tag(*cut.page("s19"), INK))
GT = 157.75
sc.js += [
    f'tl.fromTo("#s19-wk", {{ x: 0 }}, {{ x: {WX1 - WX0}, duration: {WT1 - WT0:.2f}, ease: q("none", {WT1 - WT0:.2f}) }}, {sc.L(WT0):.2f});',
    f'cycle(["s19-lA", "s19-lB"], {sc.L(WT0):.2f}, {sc.L(WT1):.2f}, 1 / 6, [0, 1]);',
    f'jitter("#s19-bob", {sc.L(WT0):.2f}, {sc.L(WT1):.2f}, 1 / 6, [{{ y: 0 }}, {{ y: -6 }}]);',
    f'tl.set("#s19-lA", {{ opacity: 0 }}, {sc.L(WT1):.2f});', f'tl.set("#s19-lB", {{ opacity: 1 }}, {sc.L(WT1):.2f});',
    f'jitter("#s19-scarf", 0, {sc.L(GT):.2f}, 1 / 6, [{{ scaleX: 1, svgOrigin: "-10 -190" }}, {{ scaleX: 1.08, svgOrigin: "-10 -190" }}]);',
    f'jitter("#s19-scarf", {sc.L(GT):.2f}, {sc.dur}, 1 / 12, [{{ scaleX: 1.3, svgOrigin: "-10 -190" }}, {{ scaleX: 1.5, svgOrigin: "-10 -190" }}, {{ scaleX: 1.2, svgOrigin: "-10 -190" }}]);',
    *[f'tl.fromTo("#s19-g{i}", {{ x: 0, rotation: 0, svgOrigin: "{x} {y}" }}, {{ x: -2500, rotation: {-200 if k != "bamboo" else -90}, duration: {0.6 if k != "bamboo" else 1.5}, ease: q("power1.in", {0.6 if k != "bamboo" else 1.5}) }}, {sc.L(GT) + 0.08 * i:.2f});'
      for i, (x, y, k) in enumerate(GUST)],
]
sc.pop_chars("a", oa, music.syllables(38))
sc.write(body)
