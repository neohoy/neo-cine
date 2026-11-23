#!/usr/bin/env python3
"""出立绘：按 <工程>/cast.json 的 make 表，缺哪张就用 core/image/gen_image.py（本机已登录的 Codex CLI 的 image_gen）生成哪张，
存到 <工程>/cast/raw/<名字>.png，再由 key.py 抠成透明底。

    .venv/bin/python styles/persona-pop/kit/tools/cast.py <工程> [--only 名字,名字] [--dry]

cast.json 的 make：[{"name": "a-base", "ref": [], "prompt": "…"}, {"name": "a-think", "ref": ["a-base"], "prompt": "…"}, …]
  · 第一张（定妆图）不带参考；之后每张都带定妆图作参考（ref 写名字，指 cast/raw/<名字>.png），一致性靠它和提示词里反复写的轮廓特征
  · 每条提示词由 cast.json 的 style（画风）+ 背景句 + 角色的 look（外形）+ 这一张的 prompt 拼成（PRODUCTION.md §2）
  · 背景句：默认透明底（Codex 的 image_gen 能直接出带 alpha 的 PNG，边缘比抠色干净）；"bg": "magenta" 改成纯洋红底，
    给出不了透明底的生图工具用。写在条目上只管这一张，写在 cast.json 顶层管全部；style 里有 {bg} 就填在那里，没有就接在后面
  · 多格表：条目带 "grid": [行, 列] 和 "cells": [每格的名字, …]（从左到右、从上到下），提示词前面自动加上排版要求；
    key.py 按格切开、以第一格为准对齐，所有格同一个裁切框、同一个缩放，换格时不会跳。口型表就是这样做的（STYLE.md §5）
  · 构图（全身 / 半身特写）写在 prompt 里，比例默认 2:3（多格表默认 1:1）
先跑 `gen_image.py --check`；没有 Codex 或没登录时停下，用户也可以用别的工具按同样的提示词出图，存成同样的名字。
"""
import argparse
import glob
import json
import os
import shutil
import subprocess
import sys

ap = argparse.ArgumentParser()
ap.add_argument("project")
ap.add_argument("--only")
ap.add_argument("--dry", action="store_true")
a = ap.parse_args()
P = os.path.abspath(a.project)
LIB = os.environ.get("LIB") or os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
GEN = os.path.join(LIB, "core", "image", "gen_image.py")
cfg = json.load(open(os.path.join(P, "cast.json"), encoding="utf-8"))
raw = os.path.join(P, "cast", "raw")
os.makedirs(raw, exist_ok=True)
only = set(a.only.split(",")) if a.only else None


BG = {
    "transparent": "透明背景 PNG：背景完全透明（alpha 通道），不要白底、不要棋盘格、不要地面、不要投影、不要任何其他物体或文字。",
    "magenta": "背景必须是纯色洋红 #FF00FF，整张背景单一颜色，无渐变、无阴影、无地面、无任何其他物体或文字。",
}


def bg_of(item):
    return item.get("bg", cfg.get("bg", "transparent"))


def sheet_text(item):
    rows, cols = item["grid"]
    n = rows * cols
    if len(item.get("cells", [])) != n:
        sys.exit(f"✗ {item['name']}：grid {rows}×{cols} 要 {n} 个 cells 名字")
    return (f"多格表：{rows} 行 × {cols} 列，共 {n} 格，从左到右、从上到下排，画的是同一个角色。格与格之间留出明显空隙，不能相碰；"
            "每一格里人物的大小、位置、裁切线完全一样。不要网格线、编号、文字、符号、汗滴、动作线。\n")


def prompt_of(item):
    who = item["name"].split("-")[0]
    look = cfg["who"].get(who, {}).get("look", "")
    bg = BG[bg_of(item)]
    style = cfg["style"].replace("{bg}", bg) if "{bg}" in cfg["style"] else cfg["style"] + bg
    head = sheet_text(item) if item.get("grid") else ""
    return f"{head}{style}\n角色：{look}\n这一张：{item['prompt']}"


todo = [m for m in cfg["make"] if (only is None or m["name"] in only) and not os.path.exists(os.path.join(raw, m["name"] + ".png"))]
if not todo:
    print("✓ 立绘都在（cast/raw/）")
    sys.exit(0)
if a.dry:
    for m in todo:
        print(f"— {m['name']}  ref={m.get('ref', [])}\n{prompt_of(m)}\n")
    sys.exit(0)
if subprocess.run([sys.executable, GEN, "--check"]).returncode:
    sys.exit("✗ 生图工具没准备好（见上面）。也可以用别的工具按 --dry 打出来的提示词出图，存成 cast/raw/<名字>.png")
for m in todo:
    refs = []
    for r in m.get("ref", []):
        f = os.path.join(raw, r + ".png")
        if not os.path.exists(f):
            sys.exit(f"✗ {m['name']} 要参考 {r}，但 cast/raw/{r}.png 还没有：先出它")
        refs += ["--ref", f]
    tmp = os.path.join(P, "out", "gen")
    os.makedirs(tmp, exist_ok=True)
    r = subprocess.run([sys.executable, GEN, prompt_of(m), "--aspect", m.get("aspect", "1:1" if m.get("grid") else "2:3"), *refs, "--out", tmp, "--name", m["name"]], capture_output=True, text=True)
    print(r.stdout.strip() or r.stderr.strip())
    got = sorted(glob.glob(os.path.join(tmp, m["name"] + "_*.png")), key=os.path.getmtime)
    got = [g for g in got if not g.endswith("_wrongaspect.png")]
    if r.returncode or not got:
        sys.exit(f"✗ {m['name']} 没出来（退出码 {r.returncode}）")
    shutil.copyfile(got[-1], os.path.join(raw, m["name"] + ".png"))
    print(f"✓ cast/raw/{m['name']}.png")
print("下一步：.venv/bin/python styles/persona-pop/kit/tools/key.py", P)
