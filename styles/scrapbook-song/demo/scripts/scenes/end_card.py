#!/usr/bin/env python3
"""end-card（190.60–195.20）：示范片的片尾卡，本库新画的。

上一镜（04-f4）结尾一条玫红风带盖满画面；这里同一条风带揭开，露出米白纸。
190.82 的拍上起「NEO-Cine」一个字母一个字母砸下来（typo.slam），192.03 的拍上「手账歌谣」印章盖下（typo.seal），
风卷和一片竹叶从右往左吹过。歌在这张卡上淡出（tools/mix.py）。
片尾只署 NEO-Cine 和风格名（MAINTAINING.md）：歌名和演唱者在上一页的剪贴簿上，那是这首歌自己的片名页。
"""
import os
import sys

from scene import *  # noqa: E402,F401,F403
import typo  # noqa: E402

sc = Scene("end-card", "ec", PAPER)
T0 = sc.g0
SLAM_T = [round(190.822 + 0.12 * k, 3) for k in range(len("NEO-Cine"))]   # 重拍起，每 0.12 秒一个字母
SEAL_T = 192.029                                                         # 下一拍盖章

# typo.slam 按等宽排字（为汉字写的）；拉丁字母宽窄不一，这里按站酷快乐体的真实字宽（hmtx 量的，单位 = 字号）排，
# 再交给 typo.slam_in 一个一个砸下来
ADV = {"N": .765, "E": .713, "O": .724, "-": .653, "C": .774, "i": .236, "n": .563, "e": .574}
WORD, SIZE, CX, BY = "NEO-Cine", 190, 840, 600
widths = [ADV[c] * SIZE * .96 for c in WORD]
x = CX - sum(widths) / 2
slam_svg, slam_org = "", []
for k, (ch, w) in enumerate(zip(WORD, widths)):
    cx = round(x + w / 2); x += w
    rot = (-5, 4, -3, 0, 5, -4, 3, -5)[k]
    slam_svg += (f'<g id="ec-nc{k}" opacity="0" data-layout-allow-overlap>'
                 f'{T(cx, BY, ch, SIZE, "KL", RED, "middle", INK, 16, rot, shadow=12, allow=True)}</g>')
    slam_org.append((cx, round(BY - SIZE * .36)))
typo.slam_in(sc, "nc", slam_org, SLAM_T, SIZE)

body = (f'<rect width="1920" height="1080" fill="{PAPER}"/>'
        + sc.wob(sc.group("curl0", curl(1500, 300, .9, op=.55)) + sc.group("curl1", curl(260, 860, .7, op=.45))
                 + sc.group("leaf", leaf(2040, 420, 110, 200)) + sc.group("leaf2", leaf(2120, 760, 80, 190, BAMBOOL)))
        + sc.wobT(slam_svg
                  + typo.seal(sc, "se", "手账歌谣", 1560, 520, 92, SEAL_T))
        + sc.grain(.9)
        + sc.band("in", PINK, YEL))
sc.band_out("in", T0)
sc.js += [
    f'tl.fromTo("#ec-curl0", {{ x: 0 }}, {{ x: -260, duration: {sc.dur}, ease: q("none", {sc.dur}) }}, 0);',
    f'tl.fromTo("#ec-curl1", {{ x: 0 }}, {{ x: -200, duration: {sc.dur}, ease: q("none", {sc.dur}) }}, 0);',
    f'tl.fromTo("#ec-leaf", {{ x: 0, y: 0, rotation: 0, svgOrigin: "2040 420" }}, {{ x: -2400, y: 160, rotation: -300, duration: 3.4, ease: q("none", 3.4) }}, 0.5);',
    f'tl.fromTo("#ec-leaf2", {{ x: 0, y: 0, rotation: 0, svgOrigin: "2120 760" }}, {{ x: -2500, y: -90, rotation: -260, duration: 3.0, ease: q("none", 3.0) }}, 1.3);',
]
sc.write(body)
