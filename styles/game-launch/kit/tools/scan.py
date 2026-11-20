#!/usr/bin/env python3
"""把一条实机录像摊开：带时间码的接触表、场景表，找卖点镜头和那个真实数字（PRODUCTION.md §2）。

    .venv/bin/python styles/game-launch/kit/tools/scan.py <工程> <录像名> [--every 3] [--scene 0.3]

<录像名> 是 game.json 里 sources 的名字（坐标、时间码都对着裁掉黑边后的游戏画面）。一遍解码同时做两件事：
- 接触表 out/scan/<录像>/sheet-01.jpg …：每 every 秒一格（默认按时长取，最多约 200 格），格下写 分:秒；
- 场景表：画面突变（ffmpeg 的 scene 分数 > scene）就算一个新场景 → out/scan/<录像>/scenes.jpg（每个场景的第一帧和起止时间码）
  和 out/scan/<录像>/LOG.md：一张时间码表，"画面里是什么、能证明什么卖点、有没有真实数字"三栏空着，你看图逐行填。
  游戏的菜单、对话、地图切换都会切场景；一个场景很长（> 20 秒）多半是一段连续操作（跑图、交易、战斗），值得细看。
  游戏常用淡入淡出转场，场景分数低，可能漏切：长场景要对照接触表看，必要时把 --scene 调低（0.1）。
接触表和场景表的时间码是粗定位（接触表的格就是录像那一帧，场景起点准到一帧），选镜头、写入点之前用 look.py 放大核对。
找到候选以后，用 look.py 放大读 UI 上的字和数字、用变化条找数字跳变的那一帧。
"""
import argparse
import math
import os
import re
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from lib import load, fmt_tc, die, need_ffmpeg  # noqa: E402
from clips import src_info  # noqa: E402

TW = 320


def font(n):
    try:
        return ImageFont.load_default(size=n)
    except TypeError:
        return ImageFont.load_default()


def sheet(items, dst, cols=6):
    """[(图, 标签)] → 一张接触表。"""
    th = items[0][0].height
    S = Image.new("RGB", (cols * (TW + 8) + 8, math.ceil(len(items) / cols) * (th + 30) + 8), "#141418")
    d = ImageDraw.Draw(S)
    f = font(18)
    for i, (im, lab) in enumerate(items):
        x, y = 8 + (i % cols) * (TW + 8), 8 + (i // cols) * (th + 30)
        S.paste(im, (x, y))
        d.text((x + 2, y + th + 5), lab, fill="#e8e8e8", font=f)
    S.save(dst, quality=85)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("project")
    ap.add_argument("source")
    ap.add_argument("--every", type=float)
    ap.add_argument("--scene", type=float, default=0.2)
    a = ap.parse_args()
    need_ffmpeg()
    P, cfg = load(a.project)
    f, crop, info = src_info(cfg, P, a.source)
    dur = info["dur"]
    every = a.every or max(1.0, round(dur / 200, 1))
    out = os.path.join(P, "out", "scan", a.source)
    os.makedirs(out, exist_ok=True)
    for n in os.listdir(out):
        if n.startswith(("c_", "sheet-", "scenes")):
            os.remove(os.path.join(out, n))
    cx, cy, cw, ch = crop
    th = round(TW * ch / cw / 2) * 2
    print(f"{os.path.basename(f)}：{fmt_tc(dur)}，每 {every:g} 秒一格，场景阈值 {a.scene}（一遍解码，4K 录像要一两分钟）……")
    # 接触表：每 K 帧取一帧（录像的第 0、K、2K… 帧），时间码 = 帧号 / 帧率，标签和画面严格对应。
    # 两路输出都要 -fps_mode vfr：不然 ffmpeg 按恒定帧率补重复帧，张数和时间都对不上
    fr = info["fps"] or 30
    K = max(1, round(every * fr))
    every = K / fr
    fc = (f"[0:v]crop={cw}:{ch}:{cx}:{cy},scale={TW}:{th},split=2[a][b];"
          f"[a]select='not(mod(n\\,{K}))'[ca];"
          f"[b]select='gt(scene\\,{a.scene})',showinfo[sb]")
    r = subprocess.run(["ffmpeg", "-v", "info", "-hide_banner", "-i", f, "-filter_complex", fc,
                        "-map", "[ca]", "-fps_mode", "vfr", "-q:v", "4", os.path.join(out, "c_%05d.jpg"),
                        "-map", "[sb]", "-fps_mode", "vfr", "-q:v", "4", os.path.join(out, "scene_%05d.jpg")], capture_output=True, text=True)
    if r.returncode:
        die("ffmpeg 失败：" + r.stderr.strip().splitlines()[-1][:300])
    cuts = [float(m) for m in re.findall(r"pts_time:([\d.]+)", r.stderr)]
    # 接触表：每页 6×6
    cs = sorted(n for n in os.listdir(out) if n.startswith("c_"))
    items = [(Image.open(os.path.join(out, n)).convert("RGB"), fmt_tc(i * every)) for i, n in enumerate(cs)]
    pages = 0
    for p in range(0, len(items), 36):
        pages += 1
        sheet(items[p:p + 36], os.path.join(out, f"sheet-{pages:02d}.jpg"))
    for n in cs:
        os.remove(os.path.join(out, n))
    # 场景表
    starts = [0.0] + cuts
    ends = cuts + [dur]
    shots = [(s, e) for s, e in zip(starts, ends) if e - s >= 0.5]
    ss = sorted(n for n in os.listdir(out) if n.startswith("scene_"))
    first = subprocess.run(["ffmpeg", "-v", "error", "-i", f, "-frames:v", "1", "-vf", f"crop={cw}:{ch}:{cx}:{cy},scale={TW}:{th}",
                            "-q:v", "4", "-y", os.path.join(out, "scene_00000.jpg")])
    ss = ["scene_00000.jpg"] + ss
    imgs = {}
    for t, n in zip(starts, ss):
        imgs[t] = os.path.join(out, n)
    sc_items = []
    for s, e in shots:
        if s in imgs and os.path.exists(imgs[s]):
            sc_items.append((Image.open(imgs[s]).convert("RGB"), f"{fmt_tc(s)}-{fmt_tc(e)}  {e - s:.1f}s"))
    for p in range(0, len(sc_items), 48):
        sheet(sc_items[p:p + 48], os.path.join(out, f"scenes-{p // 48 + 1:02d}.jpg"))
    for n in os.listdir(out):
        if n.startswith("scene_"):
            os.remove(os.path.join(out, n))
    log = os.path.join(out, "LOG.md")
    lines = [f"# 时间码表：{a.source}（{os.path.basename(f)}，{fmt_tc(dur)}）", "",
             "对照 scenes-*.jpg 和 sheet-*.jpg 逐行填。卖点：这一段能证明游戏的哪个说法（商店页简介、更新日志里的）。"
             "数字：画面上有没有一个真实的、会变的数字（货币、伤害、等级、收益），在哪个时刻变成多少（look.py 核对）。", "",
             "| 起 | 止 | 长 | 画面里是什么 | 卖点 | 真实数字 |", "|---|---|---|---|---|---|"]
    lines += [f"| {fmt_tc(s)} | {fmt_tc(e)} | {e - s:.1f} |  |  |  |" for s, e in shots]
    if not os.path.exists(log):
        open(log, "w", encoding="utf-8").write("\n".join(lines) + "\n")
        print(f"→ {os.path.relpath(log, P)}（{len(shots)} 个场景，填好它就是选镜头的底稿）")
    else:
        open(os.path.join(out, "LOG.new.md"), "w", encoding="utf-8").write("\n".join(lines) + "\n")
        print(f"LOG.md 已经有了（可能填过），新的场景表写在 LOG.new.md")
    print(f"→ 接触表 {pages} 页、场景 {len(shots)} 个：{os.path.relpath(out, P)}/")


if __name__ == "__main__":
    main()
