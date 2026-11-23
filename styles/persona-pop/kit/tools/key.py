#!/usr/bin/env python3
"""立绘后期：<工程>/cast/raw/*.png → <工程>/assets/chars/*.webp（透明底、裁掉留白、同一个角色同一个比例）+ meta.json。

    .venv/bin/python styles/persona-pop/kit/tools/key.py <工程> [名字 …] [--height 1400] [--force]

一、去背景
  · 原图带 alpha（透明底，默认就这样出，cast.py）：直接用它的 alpha，几乎透明的薄雾（alpha < 6 %）清掉。
  · 原图没有 alpha（洋红底，"bg": "magenta"）："洋红度" = min(R, B) − G：大于 0.55 算背景，小于 0.25 算前景，中间软过渡；
    去溢色把 min(R, B) 超过 G 的部分往回压；alpha 先收 1 像素再羽化 0.6 像素，去掉洋红描边。

二、同一个角色同一个比例（STYLE.md §5）
  生图模型每张画的人大小不一样：举手跳起来的那张，人往往被画小了。按包围盒把每张都拉到同一个高度，换姿势时人就忽大忽小，
  跳起来的那张脚还会被按回地面。所以全身图不按包围盒定比例，按头：
  · 定妆图（这个角色第一张不带参考的全身图，或 <角色>-base）的包围盒高度 = --height，它的头顶（包围盒顶上 14 %）当模板；
  · 其他全身图在 0.7–1.35 倍之间找和这个头顶最像的大小（R、G、B 三通道的归一化互相关，缩到 1/8 算：五官糊掉，只剩发型、发饰和轮廓，表情变了、手挡了脸也认得出），人就按这个倍数缩放：
    同一个角色所有全身图的头一样大；
  · 水平方向按"身体中线"（上面 65 % 不透明像素的平均 x）对齐，不按包围盒中心（伸出去的手、踢起来的脚会把框拉偏）；
  · 脚底默认落在地面上。跳起来的姿势在 cast.json 的条目上写 "lift"（离地高度，按定妆图身高算，0.1 = 一成身高）；
    头到脚比定妆图短很多的姿势（跳、蹲、坐），这里会提示一个参考值，是不是跳起来要看图决定。
  结果写进 assets/chars/meta.json：{"<名字>": {"h": 相对定妆图的高度, "x": 横向平移（占自身宽度）, "y": 纵向平移（占自身高度）}}，
  persona.js 按它放图。头没找到（相关系数 < 0.45）的那张退回按包围盒，并且报出来：看一眼，必要时重出。
  半身特写（名字里有 -cu-）不参加：每张各自按包围盒，镜头里本来就各用各的大小。

三、多格表（cast.json 条目带 "grid" 和 "cells"，比如口型表）
  · 按格切：每条分界线在等分位置附近（±15 % 格宽）找不透明像素最少的那一行 / 列；
  · 以第一格为准，用相位相关算出每格的位移并对齐（模型画的几格总会差几像素，换口型时脸不能跳）；
  · 所有格用同一个裁切框、同一个缩放，输出 <cells 里的名字>.webp。

已是最新（输出比原图新、尺寸也对）的不重写；meta.json 每次都重算。
"""
import argparse
import json
import os
import sys

import numpy as np
from PIL import Image, ImageFilter
from scipy.signal import fftconvolve

ap = argparse.ArgumentParser()
ap.add_argument("project")
ap.add_argument("names", nargs="*")
ap.add_argument("--height", type=int, default=1400)
ap.add_argument("--force", action="store_true")
a = ap.parse_args()
P = os.path.abspath(a.project)
SRC, DST = os.path.join(P, "cast", "raw"), os.path.join(P, "assets", "chars")
if not os.path.isdir(SRC):
    sys.exit(f"✗ 没有 {SRC}：先出立绘（kit/tools/cast.py）")
os.makedirs(DST, exist_ok=True)
cfg_path = os.path.join(P, "cast.json")
cfg = json.load(open(cfg_path, encoding="utf-8")) if os.path.exists(cfg_path) else {"make": []}
MAKE = {m["name"]: m for m in cfg.get("make", [])}
H = a.height


# ---------------- 去背景 ----------------
def cutout(path):
    """→ (RGBA float32 0–1、背景透明, 用的哪种办法)。"""
    im = Image.open(path)
    if "A" in im.getbands() or (im.mode == "P" and "transparency" in im.info):
        rgba = np.asarray(im.convert("RGBA")).astype(np.float32) / 255
        al = rgba[..., 3]
        if (al < 0.04).mean() > 0.02:  # 真的有透明区，才算透明底
            rgba[..., 3] = np.where(al < 0.06, 0, al)
            return rgba, "透明底"
    rgb = np.asarray(im.convert("RGB")).astype(np.float32) / 255
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    m = np.minimum(r, b)
    alpha = np.clip((0.55 - (m - g)) / 0.30, 0, 1)
    spill = np.clip(m - g, 0, None) * (1 - alpha * 0.6)
    out = Image.fromarray((np.dstack([np.clip(r - spill, 0, 1), g, np.clip(b - spill, 0, 1), alpha]) * 255).astype(np.uint8), "RGBA")
    al = out.getchannel("A").filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
    out.putalpha(al)
    return np.asarray(out).astype(np.float32) / 255, "洋红底"


def bbox(rgba, thr=20 / 255):
    ys, xs = np.where(rgba[..., 3] > thr)
    if not len(ys):
        return None
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def to_img(rgba):
    return Image.fromarray((np.clip(rgba, 0, 1) * 255).astype(np.uint8), "RGBA")


def save(img, name, why=""):
    dst = os.path.join(DST, name + ".webp")
    img.save(dst, "WEBP", quality=90, method=6)
    print(f"✓ {os.path.relpath(dst, P)} {img.width}×{img.height}{why}")


def fresh(name, src, size):
    dst = os.path.join(DST, name + ".webp")
    if a.force or not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src):
        return False
    with Image.open(dst) as im:
        return abs(im.height - size[1]) <= 1 and abs(im.width - size[0]) <= 1


# ---------------- 头部比对 ----------------
def gray(rgba):
    """灰度，透明处填中灰（多格表对齐用）。"""
    lum = rgba[..., 0] * 0.3 + rgba[..., 1] * 0.59 + rgba[..., 2] * 0.11
    return lum * rgba[..., 3] + 0.5 * (1 - rgba[..., 3])


def chans(rgba):
    """R、G、B 三个通道，透明处填中灰：发色、发饰、耳机这些颜色比五官稳（表情会变、手会挡脸）。"""
    return [rgba[..., i] * rgba[..., 3] + 0.5 * (1 - rgba[..., 3]) for i in range(3)]


def resize_f(arr, w, h):
    return np.asarray(Image.fromarray(arr.astype(np.float32), "F").resize((max(4, w), max(4, h)), Image.BILINEAR))


def ncc_map(img, tpl):
    """归一化互相关图（valid）。"""
    t = tpl - tpl.mean()
    tn = np.sqrt((t * t).sum()) or 1.0
    num = fftconvolve(img, t[::-1, ::-1], mode="valid")
    ones = np.ones_like(tpl)
    s1 = fftconvolve(img, ones, mode="valid")
    s2 = fftconvolve(img * img, ones, mode="valid")
    return num / (np.sqrt(np.clip(s2 - s1 * s1 / tpl.size, 1e-6, None)) * tn)


F, HEAD = 8, 0.14  # 比对时缩到 1/8（五官糊掉，剩发型和轮廓）；模板取包围盒顶上 14 %（头顶、发饰、耳机）


def head_of(rgba, box):
    x0, y0, x1, y1 = box
    hh = int((y1 - y0) * HEAD)
    cols = np.where((rgba[y0:y0 + hh, :, 3] > 0.08).any(0))[0]
    return int(cols.min()), y0, int(cols.max()) + 1, y0 + hh


def match_head(base_rgba, base_box, rgba, box):
    """在 rgba 的上部找定妆图的头顶：→ (相关系数, 倍数, 模板中心 y, 模板中心 x)，坐标是原图像素。"""
    hx0, hy0, hx1, hy1 = head_of(base_rgba, base_box)
    T = chans(base_rgba[hy0:hy1, hx0:hx1])
    x0, y0, x1, y1 = box
    pad = int((y1 - y0) * 0.08)
    ry0, ry1 = max(0, y0 - pad), min(rgba.shape[0], y0 + int((y1 - y0) * 0.6))
    rx0, rx1 = max(0, x0 - pad), min(rgba.shape[1], x1 + pad)
    R = [resize_f(c, c.shape[1] // F, c.shape[0] // F) for c in chans(rgba[ry0:ry1, rx0:rx1])]
    th, tw = T[0].shape
    best = (-1.0, 1.0, 0.0, 0.0)
    for s in np.linspace(0.7, 1.35, 27):
        tp = [resize_f(c, round(tw * s / F), round(th * s / F)) for c in T]
        if R[0].shape[0] < tp[0].shape[0] or R[0].shape[1] < tp[0].shape[1]:
            continue
        c = sum(ncc_map(r, t) for r, t in zip(R, tp)) / 3
        i = np.unravel_index(np.argmax(c), c.shape)
        if c[i] > best[0]:
            best = (float(c[i]), float(s), ry0 + (i[0] + tp[0].shape[0] / 2) * F, rx0 + (i[1] + tp[0].shape[1] / 2) * F)
    return best


def body_x(rgba):
    """上面 65 % 不透明像素的平均 x（身体中线）。"""
    al = rgba[..., 3]
    ys = np.where((al > 0.08).any(1))[0]
    top = al[: ys.min() + int((ys.max() - ys.min()) * 0.65)]
    w = top.sum(0)
    return float((w * np.arange(len(w))).sum() / max(float(w.sum()), 1e-6))


# ---------------- 多格表 ----------------
def split_lines(prof, n):
    L = len(prof)
    cuts = [0]
    for k in range(1, n):
        c, half = L * k / n, 0.15 * L / n
        lo, hi = max(cuts[-1] + 1, int(c - half)), min(L - 1, int(c + half))
        cuts.append(lo + int(np.argmin(prof[lo:hi])))
    return cuts + [L]


def phase_shift(a0, a1):
    A, B = np.fft.fft2(a0), np.fft.fft2(a1)
    R = A * np.conj(B)
    r = np.fft.ifft2(R / (np.abs(R) + 1e-9)).real
    dy, dx = np.unravel_index(np.argmax(r), r.shape)
    h, w = a0.shape
    return int(dy - h if dy > h // 2 else dy), int(dx - w if dx > w // 2 else dx)


def do_sheet(m, src):
    rows, cols = m["grid"]
    cells = m.get("cells", [])
    if len(cells) != rows * cols:
        sys.exit(f"✗ {m['name']}：grid {rows}×{cols} 要 {rows * cols} 个 cells 名字")
    rgba, how = cutout(src)
    al = rgba[..., 3]
    ry, rx = split_lines(al.sum(1), rows), split_lines(al.sum(0), cols)
    parts = [rgba[ry[r]:ry[r + 1], rx[c]:rx[c + 1]] for r in range(rows) for c in range(cols)]
    ch, cw, M = max(p.shape[0] for p in parts), max(p.shape[1] for p in parts), 64
    canv = []
    for p in parts:
        c = np.zeros((ch + 2 * M, cw + 2 * M, 4), np.float32)
        c[M:M + p.shape[0], M:M + p.shape[1]] = p
        canv.append(c)
    ref = gray(canv[0])
    shifts = [(0, 0)] + [phase_shift(ref, gray(c)) for c in canv[1:]]
    canv = [np.roll(c, s, axis=(0, 1)) for c, s in zip(canv, shifts)]
    boxes = [bbox(c) for c in canv]
    if any(b is None for b in boxes):
        sys.exit(f"✗ {m['name']}：有一格是空的（排版不是 {rows}×{cols}？）")
    x0, y0 = min(b[0] for b in boxes), min(b[1] for b in boxes)
    x1, y1 = max(b[2] for b in boxes), max(b[3] for b in boxes)
    size = (round((x1 - x0) * H / (y1 - y0)), H)
    print(f"· {m['name']}（{how}）{rows}×{cols} 格，各格相对第一格的位移 {shifts[1:]}")
    for name, c in zip(cells, canv):
        if not fresh(name, src, size):
            save(to_img(c[y0:y1, x0:x1]).resize(size, Image.LANCZOS), name)


# ---------------- 主流程 ----------------
names = [n[:-4] if n.endswith(".png") else n for n in a.names] or sorted(f[:-4] for f in os.listdir(SRC) if f.endswith(".png"))
meta_path = os.path.join(DST, "meta.json")
meta = json.load(open(meta_path, encoding="utf-8")) if os.path.exists(meta_path) else {}

BASE = {}  # 每个角色的定妆图
for m in cfg.get("make", []):
    who = m["name"].split("-")[0]
    if "-cu-" in m["name"] or m.get("grid"):
        continue
    if m["name"] == f"{who}-base" or (who not in BASE and not m.get("ref")):
        BASE[who] = m["name"]
cache = {}


def load(name):
    if name not in cache:
        rgba, how = cutout(os.path.join(SRC, name + ".png"))
        cache[name] = (rgba, how, bbox(rgba))
    return cache[name]


for name in names:
    src = os.path.join(SRC, name + ".png")
    if not os.path.exists(src):
        sys.exit(f"✗ 没有 cast/raw/{name}.png")
    m = MAKE.get(name, {})
    if m.get("grid"):
        do_sheet(m, src)
        continue
    rgba, how, box = load(name)
    if not box:
        sys.exit(f"✗ {name}：去完背景什么都不剩（背景不是透明也不是洋红？）")
    who = name.split("-")[0]
    x0, y0, x1, y1 = box
    bh = y1 - y0
    k, note, entry = H / bh, "", None
    if "-cu-" not in name and who in BASE and os.path.exists(os.path.join(SRC, BASE[who] + ".png")):
        b_rgba, _, b_box = load(BASE[who])
        b_h = b_box[3] - b_box[1]
        if name == BASE[who]:
            note = "  定妆图"
        else:
            c, s, hy, hx = match_head(b_rgba, b_box, rgba, box)
            if c < 0.45:
                note = f"  ⚠ 头没找到（相关 {c:.2f}），按包围盒：看一眼，必要时重出"
            else:
                k = H / b_h / s
                note = f"  头比对 {c:.2f}，人画成定妆图的 {s:.2f} 倍"
                _, _, b_hy, _ = match_head(b_rgba, b_box, b_rgba, b_box)
                d0, d = (b_box[3] - b_hy) / b_h, (y1 - hy) / s / b_h
                if d < d0 * 0.93 and "lift" not in m:
                    note += f"；头到脚比定妆图短 {1 - d / d0:.0%}（跳起来的话，cast.json 写 \"lift\": {d0 - d:.2f}）"
        out_w, out_h = round((x1 - x0) * k), round(bh * k)
        lift = float(m.get("lift", 0))
        entry = {"h": round(out_h / H, 4), "x": round((out_w / 2 - body_x(rgba[y0:y1, x0:x1]) * k) / out_w, 4), "y": round(-lift * H / out_h, 4)}
        if lift:
            note += f"；离地 {lift:.2f} 身高"
    size = (round((x1 - x0) * k), round(bh * k))
    if entry:
        meta[name] = entry
    else:
        meta.pop(name, None)
    if fresh(name, src, size):
        if note.strip():
            print(f"· {name}{note}")
        continue
    img = to_img(rgba[y0:y1, x0:x1]).resize(size, Image.LANCZOS)
    corners = [img.getpixel((0, 0))[3], img.getpixel((img.width - 1, 0))[3]]
    save(img, name, f"（{how}）{note}" + ("  ⚠ 顶角不透明：看一眼背景是否去干净" if max(corners) > 40 else ""))

json.dump(dict(sorted(meta.items())), open(meta_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"✓ {os.path.relpath(meta_path, P)}（{len(meta)} 张全身图的比例和位置）")
