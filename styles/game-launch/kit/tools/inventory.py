#!/usr/bin/env python3
"""素材盘点：用户带来的游戏素材有什么、各是什么用（PRODUCTION.md §1）。

    .venv/bin/python styles/game-launch/kit/tools/inventory.py <工程>            盘点 <工程>/assets/ 下的全部文件
    .venv/bin/python styles/game-launch/kit/tools/inventory.py <工程> <文件夹>    盘点别处的文件夹（new_project.py 复制之前看一眼）

写 <工程>/out/inventory.md 和一张图片总览 out/inventory.jpg，并在终端打印：
- 录像：时长、分辨率、帧率、有没有声音、大小，以及录屏四周的黑边（ffmpeg cropdetect，给出 sources.<名>.crop 的建议值）；
- 图片：尺寸、有没有透明通道，按形状猜用途：横向 16:9 左右的是截图或主视觉，带透明底的是 Logo 或立绘，竖长条是立绘，方形是图标；
- 文字（.md / .txt）：开头几行，商店页的简介、更新日志、开发者的话都是事实来源（FACTS.md）；
- 声音文件：时长（单独给的原声）。
猜的用途只是起点：用眼睛看 out/inventory.jpg 再定。
"""
import json
import os
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from lib import load, probe, die, need_ffmpeg  # noqa: E402

VID = (".mp4", ".mov", ".mkv", ".webm", ".m4v", ".avi")
IMG = (".png", ".jpg", ".jpeg", ".webp")
AUD = (".wav", ".mp3", ".m4a", ".flac", ".ogg", ".aac")
TXT = (".md", ".txt")


def cropdetect(f, dur):
    """录屏四周的黑边：在 10%、50%、90% 处各看两秒，取最常见的裁切。"""
    seen = {}
    for frac in (0.1, 0.5, 0.9):
        r = subprocess.run(["ffmpeg", "-v", "info", "-ss", f"{dur * frac:.1f}", "-i", f, "-t", "2", "-vf", "cropdetect=24:2:0", "-f", "null", "-"],
                           capture_output=True, text=True)
        for line in r.stderr.splitlines():
            if "crop=" in line:
                c = line.rsplit("crop=", 1)[1].strip()
                seen[c] = seen.get(c, 0) + 1
    if not seen:
        return None
    w, h, x, y = (int(v) for v in max(seen, key=seen.get).split(":"))
    return [x, y, w - w % 2, h - h % 2]


def kind_of(w, h, alpha):
    r = w / h
    if r < 0.6:
        return "立绘（竖长条）"
    if alpha and r < 2.6:
        return "Logo 或立绘（透明底）"
    if 0.85 < r < 1.18:
        return "图标或头像（方形）"
    if 1.3 < r < 1.9:
        return "截图或主视觉（横向）"
    return "横幅或其他"


def main():
    if len(sys.argv) < 2:
        die("用法：inventory.py <工程> [文件夹]")
    P, cfg = load(sys.argv[1])
    root = os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 else os.path.join(P, "assets")
    if not os.path.isdir(root):
        die(f"没有这个文件夹：{root}")
    need_ffmpeg()
    files = sorted(os.path.join(d, n) for d, _, ns in os.walk(root) for n in ns if not n.startswith("."))
    rows, thumbs = [], []
    md = [f"# 素材盘点：{os.path.basename(root)}", "", "猜的用途只是起点：对照 out/inventory.jpg 用眼睛定。", ""]
    vids = [f for f in files if f.lower().endswith(VID)]
    if vids:
        md += ["## 录像", "", "| 文件 | 时长 | 分辨率 | 帧率 | 声音 | 大小 | 黑边裁切建议（crop） |", "|---|---|---|---|---|---|---|"]
        for f in vids:
            p = probe(f)
            c = cropdetect(f, p["dur"])
            crop = "" if not c or (c[2] == p["w"] and c[3] == p["h"]) else json.dumps(c)
            md.append(f"| {os.path.relpath(f, root)} | {p['dur']:.1f} 秒 | {p['w']}×{p['h']} | {p['fps'] or 0:.0f} | {'有' if p['audio'] else '无'} | "
                      f"{os.path.getsize(f) / 1e6:.0f} MB | {crop or '不用裁'} |")
            print(f"录像 {os.path.relpath(f, root)}：{p['dur']:.1f} 秒，{p['w']}×{p['h']}，{p['fps'] or 0:.0f} fps，"
                  f"{'有声音' if p['audio'] else '没有声音'}" + (f"，黑边裁切建议 {crop}" if crop else ""))
        md.append("")
    imgs = [f for f in files if f.lower().endswith(IMG)]
    if imgs:
        md += ["## 图片", "", "| 文件 | 尺寸 | 透明 | 猜的用途 |", "|---|---|---|---|"]
        for f in imgs:
            edge = None
            with Image.open(f) as im:
                w, h = im.size
                alpha = False
                if im.mode in ("RGBA", "LA", "P"):
                    A = im.convert("RGBA").getchannel("A")
                    hist = A.histogram()
                    clear = sum(hist[:128]) / (w * h)              # 明显透明的像素占比（几个半透明像素不算透明底）
                    if clear > 0.01:
                        bx = A.point(lambda v: 255 if v >= 128 else 0).getbbox() or (0, 0, w, h)
                        if (bx[2] - bx[0]) * (bx[3] - bx[1]) >= 0.85 * w * h and tuple(bx) != (0, 0, w, h):
                            edge = list(bx)                        # 只有四周一圈透明：是截图，裁掉透明边再用
                        else:
                            alpha = True
                th = im.convert("RGBA")
                th.thumbnail((320, 240))
            k = kind_of(w, h, alpha)
            if edge:
                k = f"截图（四周有透明边：用 grab 的 crop {[edge[0], edge[1], edge[2] - edge[0], edge[3] - edge[1]]} 裁掉，不然铺满时露底）"
            md.append(f"| {os.path.relpath(f, root)} | {w}×{h} | {'有' if alpha else ''} | {k} |")
            thumbs.append((th, f"{os.path.basename(f)[:28]}  {w}x{h}"))
            print(f"图片 {os.path.relpath(f, root)}：{w}×{h}{'，透明底' if alpha else ''} → {k}")
        md.append("")
    auds = [f for f in files if f.lower().endswith(AUD)]
    if auds:
        md += ["## 声音", ""]
        for f in auds:
            md.append(f"- {os.path.relpath(f, root)}：{probe(f)['dur']:.1f} 秒")
        md.append("")
    txts = [f for f in files if f.lower().endswith(TXT)]
    if txts:
        md += ["## 文字（事实来源）", ""]
        for f in txts:
            head = open(f, encoding="utf-8", errors="ignore").read().strip().splitlines()[:6]
            md += [f"### {os.path.relpath(f, root)}", "", *[f"> {l}" for l in head if l.strip()], ""]
            print(f"文字 {os.path.relpath(f, root)}：{len(open(f, encoding='utf-8', errors='ignore').read())} 字")
    others = [f for f in files if not f.lower().endswith(VID + IMG + AUD + TXT)]
    if others:
        md += ["## 其他", "", *[f"- {os.path.relpath(f, root)}" for f in others], ""]
    os.makedirs(os.path.join(P, "out"), exist_ok=True)
    open(os.path.join(P, "out", "inventory.md"), "w", encoding="utf-8").write("\n".join(md) + "\n")
    if thumbs:
        cols = 4
        S = Image.new("RGB", (cols * 330 + 10, ((len(thumbs) + cols - 1) // cols) * 275 + 10), "#202226")
        d = ImageDraw.Draw(S)
        try:
            fnt = ImageFont.load_default(size=16)
        except TypeError:
            fnt = ImageFont.load_default()
        for i, (th, lab) in enumerate(thumbs):
            x, y = 10 + (i % cols) * 330, 10 + (i // cols) * 275
            bg = Image.new("RGBA", th.size, "#808080")              # 透明底垫灰，看得出轮廓
            S.paste(Image.alpha_composite(bg, th).convert("RGB"), (x + (320 - th.width) // 2, y + (240 - th.height) // 2))
            d.text((x, y + 248), lab, fill="#ddd", font=fnt)
        S.save(os.path.join(P, "out", "inventory.jpg"), quality=88)
    print(f"→ out/inventory.md{'、out/inventory.jpg' if thumbs else ''}")
    if vids:
        print("下一步：scan.py 给每条录像出带时间码的接触表和场景表，找卖点镜头和那个真实数字")


if __name__ == "__main__":
    main()
