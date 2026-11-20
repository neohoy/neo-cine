#!/usr/bin/env python3
"""放大看录像：读清 UI 上的字和数字，找到那个真实数字变化的一刻（STYLE.md §1、PRODUCTION.md §2）。

    .venv/bin/python styles/game-launch/kit/tools/look.py <工程> <录像> 6:08 --grid
        这一刻的整帧（裁掉黑边后的游戏画面）叠一张坐标网格（每 100 像素一条线，每 500 像素标数）→ out/look/<录像>-6m08.000s-grid.jpg：
        读 UI 元素的坐标，写镜头的 focus、view，或者给 plate.py 框一块 UI
    .venv/bin/python styles/game-launch/kit/tools/look.py <工程> <录像> 6:08 --rect 1340,1920,320,70
        把这一块放大成 1200 像素宽 → out/look/…-rect.jpg：数字到底是几
    .venv/bin/python styles/game-launch/kit/tools/look.py <工程> <录像> 6:15-6:20 --rect 1340,1920,320,70 --step 0.1
        这一段时间里这一块的变化条（每 step 秒一格，格下写时间码）→ out/look/…-strip.jpg：找数字跳变的那一帧
    加 --ocr：装了 tesseract（带 chi_sim）就逐格识别文字，打印出来（只作参考，以眼睛看到的为准）；没装就跳过。

<录像> 是 game.json 里 sources 的名字；坐标都是裁掉黑边后（sources.<名>.crop）的游戏画面像素，和镜头表用的一样。
"""
import argparse
import os
import shutil
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from lib import load, tc, fmt_tc, die, need_ffmpeg  # noqa: E402
from clips import src_info, grab_frame  # noqa: E402


def label_font(size):
    """标注只写数字和时间码：用 Pillow 自带的可缩放字体（Pillow 10.1+），太旧就退回点阵字。"""
    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        return ImageFont.load_default()


def ocr(im):
    if not shutil.which("tesseract"):
        return None
    tmp = os.path.join(os.environ.get("TMPDIR", "/tmp"), f"gl-ocr-{os.getpid()}.png")
    im.save(tmp)
    r = subprocess.run(["tesseract", tmp, "-", "-l", "chi_sim+eng", "--psm", "7"], capture_output=True, text=True)
    os.remove(tmp)
    return r.stdout.strip() if r.returncode == 0 else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("project")
    ap.add_argument("source")
    ap.add_argument("time", help="时间码，或者 起-止")
    ap.add_argument("--rect", help="x,y,w,h（游戏画面像素）")
    ap.add_argument("--grid", action="store_true")
    ap.add_argument("--step", type=float, default=0.1)
    ap.add_argument("--ocr", action="store_true")
    a = ap.parse_args()
    need_ffmpeg()
    P, cfg = load(a.project)
    f, crop, info = src_info(cfg, P, a.source)
    out = os.path.join(P, "out", "look")
    os.makedirs(out, exist_ok=True)
    rect = [int(v) for v in a.rect.split(",")] if a.rect else None
    tag = lambda t: f"{int(t // 60)}m{t % 60:06.3f}s"

    if "-" in a.time.strip("-"):
        t0, t1 = (tc(x) for x in a.time.split("-"))
        if not rect:
            die("看一段时间要给 --rect（只看那一块）")
        x, y, w, h = rect
        fps = info["fps"] or 30
        n = int((t1 - t0) / a.step) + 1
        if n > 240:
            die(f"{n} 格太多了：缩短时间段或加大 --step")
        scale = min(1.0, 480 / w)
        cw, chh = int(w * scale), int(h * scale)
        cols = max(1, min(6, 1800 // (cw + 10)))
        rows = (n + cols - 1) // cols
        sheet = Image.new("RGB", (cols * (cw + 10) + 10, rows * (chh + 34) + 10), "#111")
        d = ImageDraw.Draw(sheet)
        fnt = label_font(20)
        # 一次解码这一段，只留要的那几帧（select 按帧号挑），先在 ffmpeg 里缩到最多 960 宽：框整帧、时间段很长也不会把内存吃满
        ms = [int(round((t0 + k * a.step) * fps)) for k in range(n)]
        uniq = sorted(set(ms))
        m0 = uniq[0]
        sw = min(w, 960)
        sh = max(2, int(round(h * sw / w)))
        expr = "+".join(f"eq(n\\,{m - m0})" for m in uniq)
        raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{(m0 - 0.5) / fps:.5f}", "-i", f, "-frames:v", str(uniq[-1] - m0 + 1),
                              "-vf", f"crop={crop[2]}:{crop[3]}:{crop[0]}:{crop[1]},crop={w}:{h}:{x}:{y},select='{expr}',scale={sw}:{sh}",
                              "-fps_mode", "vfr", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
        size = sw * sh * 3
        got = {m: raw[i * size:(i + 1) * size] for i, m in enumerate(uniq) if (i + 1) * size <= len(raw)}
        if not got:
            die("这一段取不到帧")
        prev = None
        for k in range(n):
            t = t0 + k * a.step
            buf = got.get(ms[k]) or got[max(m for m in got if m <= ms[k]) if any(m <= ms[k] for m in got) else min(got)]
            im = Image.frombuffer("RGB", (sw, sh), buf, "raw", "RGB", 0, 1)
            cx, cy = 10 + (k % cols) * (cw + 10), 10 + (k // cols) * (chh + 34)
            sheet.paste(im.resize((cw, chh), Image.LANCZOS), (cx, cy))
            txt = fmt_tc(t)
            if a.ocr:
                o = ocr(im.resize((sw * 3, sh * 3), Image.LANCZOS))
                if o is not None:
                    if o != prev:
                        print(f"{fmt_tc(t)}  {o}")
                    prev = o
            d.text((cx, cy + chh + 4), txt, fill="#ddd", font=fnt)
        dst = os.path.join(out, f"{a.source}-{tag(t0)}-{tag(t1)}-strip.jpg")
        sheet.save(dst, quality=90)
        if a.ocr and not shutil.which("tesseract"):
            print("（没装 tesseract，跳过文字识别：看图）")
        print(dst)
        return

    t = tc(a.time)
    im = grab_frame(f, crop, t)
    if a.grid:
        d = ImageDraw.Draw(im)
        fnt = label_font(max(18, im.width // 90))
        for gx in range(0, im.width, 100):
            d.line([(gx, 0), (gx, im.height)], fill=(255, 60, 60) if gx % 500 == 0 else (255, 200, 0), width=3 if gx % 500 == 0 else 1)
            if gx % 500 == 0:
                d.text((gx + 6, 6), str(gx), fill=(255, 60, 60), font=fnt)
        for gy in range(0, im.height, 100):
            d.line([(0, gy), (im.width, gy)], fill=(255, 60, 60) if gy % 500 == 0 else (255, 200, 0), width=3 if gy % 500 == 0 else 1)
            if gy % 500 == 0:
                d.text((6, gy + 6), str(gy), fill=(255, 60, 60), font=fnt)
        if rect:
            x, y, w, h = rect
            d.rectangle([x, y, x + w, y + h], outline=(0, 255, 120), width=4)
        dst = os.path.join(out, f"{a.source}-{tag(t)}-grid.jpg")
        im.save(dst, quality=88)
    elif rect:
        x, y, w, h = rect
        im = im.crop((x, y, x + w, y + h))
        im = im.resize((1200, int(1200 * h / w)), Image.LANCZOS)
        dst = os.path.join(out, f"{a.source}-{tag(t)}-rect.jpg")
        im.save(dst, quality=92)
        if a.ocr:
            o = ocr(im)
            print("识别：" + (o if o is not None else "（没装 tesseract，跳过）"))
    else:
        dst = os.path.join(out, f"{a.source}-{tag(t)}.jpg")
        im.save(dst, quality=88)
    print(dst)


if __name__ == "__main__":
    main()
