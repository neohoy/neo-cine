#!/usr/bin/env python3
"""两支片子同一时刻并排：新版对旧版、改编版对原片（左 A 右 B，每行一个时刻，格下写时刻）。

    .venv/bin/python styles/game-launch/kit/tools/compare.py A.mp4 B.mp4 0,5,8.5,12 --out out/compare.jpg
    .venv/bin/python styles/game-launch/kit/tools/compare.py A.mp4 B.mp4 0,5,20 --times-b 0,5,18.7 --out …
        --times-b：B 的时刻不同（某个镜头加长以后，后面的镜头整体后移）
"""
import argparse
import os
import subprocess

from PIL import Image, ImageDraw, ImageFont


def frame(path_, t, w):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", path_, "-frames:v", "1", "-vf", f"scale={w}:-2",
                          "-f", "image2pipe", "-vcodec", "png", "-"], capture_output=True).stdout
    from io import BytesIO
    return Image.open(BytesIO(raw)).convert("RGB")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("a")
    ap.add_argument("b")
    ap.add_argument("times")
    ap.add_argument("--times-b")
    ap.add_argument("--out", required=True)
    ap.add_argument("--w", type=int, default=640)
    x = ap.parse_args()
    ta = [float(v) for v in x.times.split(",")]
    tb = [float(v) for v in x.times_b.split(",")] if x.times_b else ta
    if len(ta) != len(tb):
        raise SystemExit("--times-b 的个数要和 times 一样")
    try:
        fnt = ImageFont.load_default(size=20)
    except TypeError:
        fnt = ImageFont.load_default()
    rows = [(frame(x.a, a, x.w), frame(x.b, b, x.w), a, b) for a, b in zip(ta, tb)]
    h = rows[0][0].height
    S = Image.new("RGB", (2 * x.w + 30, len(rows) * (h + 34) + 10), "#141418")
    d = ImageDraw.Draw(S)
    for i, (A, B, a, b) in enumerate(rows):
        y = 10 + i * (h + 34)
        S.paste(A, (10, y))
        S.paste(B, (20 + x.w, y))
        d.text((10, y + h + 6), f"A {a:.2f}s  {os.path.basename(x.a)}", fill="#ddd", font=fnt)
        d.text((20 + x.w, y + h + 6), f"B {b:.2f}s  {os.path.basename(x.b)}", fill="#ddd", font=fnt)
    os.makedirs(os.path.dirname(os.path.abspath(x.out)), exist_ok=True)
    S.save(x.out, quality=88)
    print(x.out)


if __name__ == "__main__":
    main()
