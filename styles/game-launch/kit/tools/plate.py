#!/usr/bin/env python3
"""从游戏自己的 UI 里取字幕牌的材质：颜色、边框（STYLE.md §3、§4；PRODUCTION.md §4）。

    .venv/bin/python styles/game-launch/kit/tools/plate.py <工程> <图片或录像名> [时间码] --rect x,y,w,h [--logo logo] [--write]

- 第一个参数是一张截图（路径），或者 game.json 里 sources 的名字加一个时间码（取录像那一刻的帧，坐标是裁掉黑边后的游戏画面）；
- --rect 框住一块有代表性的 UI 面板，连同它的边框（对话框、商店面板、按钮、标题条；坐标用 look.py --grid 读）；
- 从框的边缘往里逐像素读颜色，分出外框（颜色、宽度）、内描（颜色、宽度），再取面板里上部和下部的底色（竖向渐变的两端）、
  最亮的一群像素（UI 上的字色）；
- --logo（stills 里的名字或图片路径）：从 Logo 不透明的像素里取最饱和、占比最大的颜色，作强调色（每块字幕牌最多一个词用它）；
- 打印一段 look（贴进 game.json，或者加 --write 直接写进去），并存一张色卡 out/plate/swatch.jpg：框住的 UI 放大、各颜色的色块和色值，
  和按这些颜色画的一块示意字幕牌，放在一起对照。铆钉、斜纹这些装饰取不出来：看 UI 上有没有，在 look.plate 里手动开关
  （rivetSize 为 0 就不画铆钉，brushed 为 0 就没有斜纹）。
"""
import argparse
import colorsys
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from lib import load, save, resolve, tc, die, need_ffmpeg  # noqa: E402

hexc = lambda c: "#%02x%02x%02x" % tuple(int(round(v)) for v in c[:3])


def runs(profile, thr=22.0):
    """沿一条线的颜色序列 → [(起点, 长度, 中位色)]：相邻像素差小于 thr（RGB 距离）算同一段。"""
    out, s = [], 0
    for i in range(1, len(profile) + 1):
        if i == len(profile) or np.linalg.norm(profile[i] - profile[i - 1]) > thr:
            out.append((s, i - s, np.median(profile[s:i], axis=0)))
            s = i
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("project")
    ap.add_argument("image")
    ap.add_argument("time", nargs="?")
    ap.add_argument("--rect", required=True)
    ap.add_argument("--logo")
    ap.add_argument("--write", action="store_true")
    a = ap.parse_args()
    P, cfg = load(a.project)
    if a.image in (cfg.get("sources") or {}):
        need_ffmpeg()
        from clips import src_info, grab_frame
        f, crop, _ = src_info(cfg, P, a.image)
        im = grab_frame(f, crop, tc(a.time or 0))
    else:
        im = Image.open(resolve(a.image, P)).convert("RGB")
    x, y, w, h = [int(v) for v in a.rect.split(",")]
    A = np.asarray(im.crop((x, y, x + w, y + h)), np.float64)
    depth = min(40, w // 4, h // 4)
    # 四条边各取中间一段，从外往里读
    prof = []
    for k in range(-6, 7):
        prof.append(A[h // 2 + k * h // 20, :depth])              # 左边
        prof.append(A[h // 2 + k * h // 20, ::-1][:depth])        # 右边
        prof.append(A[:depth, w // 2 + k * w // 20])              # 上边
        prof.append(A[::-1][:depth, w // 2 + k * w // 20])        # 下边
    segs = [runs(p) for p in prof]
    # 外框 = 每条线的第一段，内描 = 第二段（够窄才算描边）
    first = [s[0] for s in segs if s]
    frame_w = int(np.median([s[1] for s in first]))
    frame_c = np.median([s[2] for s in first], axis=0)
    second = [s[1] for s in segs if len(s) > 2 and s[1][1] <= 8]
    inner_w = int(np.median([s[1] for s in second])) if len(second) > len(segs) // 3 else 0
    inner_c = np.median([s[2] for s in second], axis=0) if inner_w else frame_c
    b = frame_w + inner_w + 2
    body = A[b:h - b, b:w - b] if h > 2 * b + 4 and w > 2 * b + 4 else A
    lum = body @ np.array([0.299, 0.587, 0.114])
    rows = body.shape[0]
    # 底色：去掉最亮的 15%（字）再取中位，面板上部和下部各一
    def fill(part):
        l = part @ np.array([0.299, 0.587, 0.114])
        return np.median(part[l <= np.percentile(l, 85)], axis=0)
    top = fill(body[: max(1, rows // 6)].reshape(-1, 3))
    bottom = fill(body[-max(1, rows // 6):].reshape(-1, 3))
    text = np.median(body.reshape(-1, 3)[lum.reshape(-1) >= np.percentile(lum, 99)], axis=0)
    look = cfg.get("look") or {}
    plate = dict(look.get("plate") or {})
    plate.update({"top": hexc(top), "bottom": hexc(bottom), "frame": hexc(frame_c), "frameWidth": max(1, min(6, frame_w)),
                  "inner": hexc(inner_c), "innerWidth": max(0, min(4, inner_w))})
    res = {"plate": plate, "text": hexc(text) if np.mean(text) > 170 else look.get("text", "#f4efe6")}
    if a.logo:
        lp = resolve((cfg.get("stills") or {}).get(a.logo, {}).get("file", a.logo), P)
        L = np.asarray(Image.open(lp).convert("RGBA"), np.float64)
        px = L[L[:, :, 3] > 200][:, :3] / 255
        hsv = np.array([colorsys.rgb_to_hsv(*c) for c in px[:: max(1, len(px) // 40000)]])
        sel = (hsv[:, 1] > 0.35) & (hsv[:, 2] > 0.45)
        if sel.sum() > 50:
            hist, edges = np.histogram(hsv[sel, 0], bins=36, range=(0, 1))
            k = int(np.argmax(hist))
            m = sel & (hsv[:, 0] >= edges[k]) & (hsv[:, 0] < edges[k + 1])
            rgb = np.median(px[:: max(1, len(px) // 40000)][m], axis=0) * 255
            res["accent"] = hexc(rgb)
        else:
            print("Logo 里没有足够饱和的颜色：强调色手动挑（Logo 是单色的，就用 UI 上的高亮色）")
    print(json.dumps(res, ensure_ascii=False, indent=1))
    print(f"读到外框 {frame_w}px、内描 {inner_w}px；写进 look 的是 frameWidth {plate['frameWidth']}、innerWidth {plate['innerWidth']}"
          "（限制在 1–6、0–4 px：字幕牌比 UI 面板小，边框不宜太粗）")
    if frame_w > 6 or not inner_w:
        print("⚠ 边框读得不可靠：框可能把面板外面的东西框进来了，或者这块 UI 的边框是渐变、斜面、花纹。"
              "看色卡里的放大图，用 look.py --rect 放大边缘逐像素对照，手动改 frame、inner 和宽度")

    # 色卡
    out = os.path.join(P, "out", "plate")
    os.makedirs(out, exist_ok=True)
    zoom = min(4, 900 / max(w, 1))
    crop = im.crop((x, y, x + w, y + h)).resize((int(w * zoom), int(h * zoom)), Image.NEAREST)
    S = Image.new("RGB", (max(crop.width, 900) + 40, crop.height + 330), "#202226")
    S.paste(crop, (20, 20))
    d = ImageDraw.Draw(S)
    from look import label_font
    fnt, small = label_font(36), label_font(16)
    chips = [("top", plate["top"]), ("bottom", plate["bottom"]), ("frame", plate["frame"]), ("inner", plate["inner"]), ("text", res["text"])]
    if res.get("accent"):
        chips.append(("accent", res["accent"]))
    for i, (n, c) in enumerate(chips):
        cx = 20 + i * 140
        d.rectangle([cx, crop.height + 40, cx + 120, crop.height + 110], fill=c, outline="#888")
        d.text((cx, crop.height + 116), f"{n} {c}", fill="#ddd", font=small)
    # 示意字幕牌
    px0, py0 = 20, crop.height + 160
    pw, ph = 520, 130
    for r in range(ph):
        k = r / ph
        c = tuple(int(int(plate["top"][j:j + 2], 16) * (1 - k) + int(plate["bottom"][j:j + 2], 16) * k) for j in (1, 3, 5))
        d.line([(px0, py0 + r), (px0 + pw, py0 + r)], fill=c)
    fw, iw = plate["frameWidth"], plate["innerWidth"]
    d.rectangle([px0, py0, px0 + pw, py0 + ph], outline=plate["frame"], width=fw)
    if iw:
        d.rectangle([px0 + fw, py0 + fw, px0 + pw - fw, py0 + ph - fw], outline=plate["inner"], width=iw)
    d.text((px0 + 40, py0 + 46), "SAMPLE", fill=res["text"], font=fnt)
    if res.get("accent"):
        d.text((px0 + 240, py0 + 46), "ACCENT", fill=res["accent"], font=fnt)
    dst = os.path.join(out, "swatch.jpg")
    S.save(dst, quality=90)
    print("色卡 →", dst)
    if a.write:
        look["plate"] = plate
        look["text"] = res["text"]
        if res.get("accent"):
            look["accent"] = res["accent"]
        cfg["look"] = look
        save(P, cfg)
        print("已写进 game.json 的 look")


if __name__ == "__main__":
    main()
