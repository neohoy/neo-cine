#!/usr/bin/env python3
"""<镜头 id>（<开始>–<结束>）— <歌词 1> / <歌词 2>。

画面（来自 design/imagery.md）：
a <开始>–<GB>  <第一句画什么：这句歌词里的哪些名词、地点、动作被画出来，字写在哪个载体上>
b <GB>–<结束>  <第二句>
用法：复制成 scripts/scenes/<镜头 id>.py，在 mv.json 的 scenes 里加 {"id", "start", "end", "builder": "scripts/scenes/<镜头 id>.py"}，
然后 tools/build.py <工程> <镜头 id>，再 tools/preview.sh 看。时间都用全曲时间。
"""
import os

from scene import *   # noqa: F401,F403   Scene、music、project、风带、hd_lib（色板、T、label、ribbon……）
from draw import *    # noqa: F401,F403   铅笔：person_front / person_side / 天气 / 建筑
import typo           # 歌词版式：typing / slam / label_line / ribbon_line / sign …
# from cast import *  # noqa: F401,F403   ← 这首歌自己的画（scripts/assets/cast.py）

SCENE_ID = os.path.splitext(os.path.basename(__file__))[0]
sc = Scene(SCENE_ID, bg=PAPER)           # 元素 id 前缀取自镜头 id（"s02-…" → "s02"），全片不能重复
LI = 0                                   # 这个镜头唱的第一句在 music.LYRICS 里的序号
GB = (sc.g0 + sc.g1) / 2                 # 换组时间（全曲秒数）：放在下一句开唱前约 0.2 秒

# ---------------------------------------------------------------- a · 第 LI 句的画面
FLOOR = 1000
r = 80
hero = person_front(960, FLOOR - r * 4.4, r, hair="short", top=TEAL, wind=-.4)   # ← 换成你自己的素材
ga = (f'<g id="{sc.id("ga")}"><rect width="1920" height="1080" fill="{PAPER}"/>'
      + sc.wob(sun(1500, 300, 110, YEL) + ground(FLOOR, BAMBOOL) + sc.group("hero", hero))
      + sc.wobT(typo.label_line(sc, "a", LI, 960, 190, 72, i=0))
      + sc.grain(.6) + tag(*sc.page(), INK) + "</g>")

# ---------------------------------------------------------------- b · 第 LI + 1 句的画面
gb = (f'<g id="{sc.id("gb")}" opacity="0"><rect width="1920" height="1080" fill="{NIGHT}"/>'
      + sc.wob(moon(1600, 260, 80) + stars([(300, 160, 14), (900, 120, 10), (1200, 260, 12)]))
      + sc.wobT(typo.ribbon_line(sc, "b", LI + 1, 300, 1620, 520, 92))
      + sc.grain(.35) + tag(*sc.page(), WHITE) + "</g>")

body = ga + gb + sc.band("mid", NIGHT, YEL)
sc.js += [
    f'tl.fromTo("#{sc.id("hero")}", {{ y: 220, scaleY: 0.85, svgOrigin: "960 {FLOOR}" }}, {{ y: 0, scaleY: 1, duration: 0.42, ease: q("back.out(1.6)", 0.42) }}, 0.1);',
    f'tl.set("#{sc.id("ga")}", {{ opacity: 0 }}, {sc.L(GB)});',
    f'tl.set("#{sc.id("gb")}", {{ opacity: 1 }}, {sc.L(GB)});',
]
sc.band_through("mid", GB)
# sc.hit("land", 12.34)                 # 落在鼓点上的重拍（全曲时间）：mix.py 会核对它和歌差多少
sc.write(body)
