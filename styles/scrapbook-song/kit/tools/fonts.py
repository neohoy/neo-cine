#!/usr/bin/env python3
"""字体：下载（第一次）并按镜头里实际印出来的字，给四种字体各切一个子集 → 工程 fonts/{KL,WK,JBM,IS}.ttf；缺字就停。

    .venv/bin/python styles/scrapbook-song/kit/tools/fonts.py <工程>          （先跑 tools/build.py：子集取决于镜头里的字）
    .venv/bin/python styles/scrapbook-song/kit/tools/fonts.py <工程> --fetch  只下载完整字体（new_project.py 会跑；素材表用它）
四种都是 SIL Open Font License 1.1，取自 google/fonts 固定的一个提交，完整文件放在工程 out/fonts-src/，许可文本放在 fonts/：
  KL  大字（砸字、缎带、印章）：简体片 站酷快乐体 ZCOOL KuaiLe；繁体片 Chiron GoRound TC 900（站酷快乐体没有繁体字）
  WK  句子、标签：霞鹜文楷 LXGW WenKai TC（简繁都有）
  JBM 页码、编号：JetBrains Mono
  IS  手写签名：Instrument Serif Italic
用字取自 scenes/*.html 里每个 <text font-family="…"> 的内容；另外每种都带上数字和空格（页面要先把四种都加载好）。
CREDITS 里要写上片子用到的字体（tools/new_project.py 写的 CREDITS 已经列好）。
"""
import glob
import html
import json
import os
import re
import subprocess
import sys

P = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else ".")
cfg = json.load(open(os.path.join(P, "mv.json"), encoding="utf-8"))
GF = "https://raw.githubusercontent.com/google/fonts/86aced91de05cd4f96a06838124cca45be337b2b/ofl"
HANT = cfg.get("script") == "zh-Hant"
SRC = {   # 名字 → (google/fonts 里的路径, 存成的文件名, 许可文件夹)
    "KL": ("chirongoroundtc/ChironGoRoundTC%5Bwght%5D.ttf", "ChironGoRoundTC.ttf", "chirongoroundtc") if HANT
    else ("zcoolkuaile/ZCOOLKuaiLe-Regular.ttf", "ZCOOLKuaiLe-Regular.ttf", "zcoolkuaile"),
    "WK": ("lxgwwenkaitc/LXGWWenKaiTC-Regular.ttf", "LXGWWenKaiTC-Regular.ttf", "lxgwwenkaitc"),
    "JBM": ("jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf", "JetBrainsMono.ttf", "jetbrainsmono"),
    "IS": ("instrumentserif/InstrumentSerif-Italic.ttf", "InstrumentSerif-Italic.ttf", "instrumentserif"),
}
src_dir, fdir = os.path.join(P, "out", "fonts-src"), os.path.join(P, "fonts")
os.makedirs(src_dir, exist_ok=True); os.makedirs(fdir, exist_ok=True)


def get(dst, url):
    if os.path.exists(dst) and os.path.getsize(dst) and not os.environ.get("FORCE"):
        return
    r = subprocess.run(["curl", "-fsSL", "-g", "--retry", "2", "-o", dst + ".part", url])
    if r.returncode:
        sys.exit(f"✗ 下载失败：{url}（没联网，或者要走代理？curl 认 https_proxy）")
    os.replace(dst + ".part", dst); print("↓", os.path.relpath(dst, P))


for k, (rel, name, lic) in SRC.items():
    get(os.path.join(src_dir, name), f"{GF}/{rel}")
    get(os.path.join(fdir, f"OFL-{lic}.txt"), f"{GF}/{lic}/OFL.txt")

if "--fetch" in sys.argv:
    sys.exit(0)
files = sorted(glob.glob(os.path.join(P, cfg.get("out_dir", "scenes"), "*.html")))
if not files:
    sys.exit("✗ scenes/ 里没有镜头：先跑 tools/build.py")
need = {k: set(" 0123456789") for k in SRC}
for f in files:
    for fam, txt in re.findall(r'<text\b[^>]*font-family="(\w+)"[^>]*>([^<]*)</text>', open(f, encoding="utf-8").read()):
        if fam not in need:
            sys.exit(f"✗ {os.path.basename(f)} 用了没有准备的字体 {fam}（只有 KL、WK、JBM、IS）")
        need[fam] |= set(html.unescape(txt))

from fontTools.ttLib import TTFont
from fontTools import subset
bad = False
for fam, chars in need.items():
    src = os.path.join(src_dir, SRC[fam][1])
    font = TTFont(src)
    if fam == "KL" and HANT:                       # Chiron GoRound TC 是可变字重：取 900
        from fontTools.varLib import instancer
        font = instancer.instantiateVariableFont(font, {"wght": 900})
        src = os.path.join(src_dir, "ChironGoRoundTC-900.ttf"); font.save(src)
    cmap = font.getBestCmap()
    miss = sorted(c for c in chars if ord(c) not in cmap and not c.isspace())
    if miss:
        print(f"✗ {SRC[fam][1]} 缺字：{''.join(miss)}（换个说法，或者换一种字体）"); bad = True; continue
    out = os.path.join(fdir, fam + ".ttf")
    subset.main([src, "--text=" + "".join(sorted(chars)), "--output-file=" + out, "--layout-features=*", "--no-hinting"])
    print(f"{fam}: {len(chars) - 11} 个字 → fonts/{fam}.ttf（{os.path.getsize(out) // 1024} KB）")
sys.exit(1 if bad else 0)
