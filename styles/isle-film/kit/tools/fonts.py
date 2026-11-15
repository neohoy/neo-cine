#!/usr/bin/env python3
"""方寸影像的字体：下载（第一次）并按片子里实际印出来的字切子集 → <工程>/fonts/；缺字就停。

    .venv/bin/python styles/isle-film/kit/tools/fonts.py <工程>
    .venv/bin/python styles/isle-film/kit/tools/fonts.py <工程> --fetch    只下载完整字体

两种都是 SIL Open Font License 1.1，取自 google/fonts 固定的一个提交，完整文件放在 <工程>/out/fonts-src/（不进 git），
子集和许可文本放在 <工程>/fonts/：
  NSerif-300.ttf、NSerif-400.ttf   Noto Serif SC 的 300、400 两个字重（可变字体取的实例）：片名、片尾卡（300），字幕（400）
  CG-500.ttf、CGI-500.ttf          Cormorant Garamond 500 的正体和斜体：英文行（斜体），片尾卡的署名（正体）
用字取自 film.json 的 title、每个镜头的 sub、end。不用系统字体：字体文件跟着工程走，Mac 和 Windows（渲染台式机）渲出来一样。
"""
import io
import json
import os
import subprocess
import sys

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

P = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else ".")
cfg = json.load(open(os.path.join(P, "film.json"), encoding="utf-8"))
GF = "https://raw.githubusercontent.com/google/fonts/86aced91de05cd4f96a06838124cca45be337b2b/ofl"
SRC = {  # 名字 → (google/fonts 里的路径, 存成的文件名, 许可文件夹)
    "NSerif": ("notoserifsc/NotoSerifSC%5Bwght%5D.ttf", "NotoSerifSC-VF.ttf", "notoserifsc"),
    "CG": ("cormorantgaramond/CormorantGaramond%5Bwght%5D.ttf", "CormorantGaramond-VF.ttf", "cormorantgaramond"),
    "CGI": ("cormorantgaramond/CormorantGaramond-Italic%5Bwght%5D.ttf", "CormorantGaramond-Italic-VF.ttf", "cormorantgaramond"),
}
src_dir, fdir = os.path.join(P, "out", "fonts-src"), os.path.join(P, "fonts")
os.makedirs(src_dir, exist_ok=True)
os.makedirs(fdir, exist_ok=True)


def get(dst, url):
    if os.path.exists(dst) and os.path.getsize(dst) and not os.environ.get("FORCE"):
        return
    r = subprocess.run(["curl", "-fsSL", "-g", "--retry", "6", "--retry-delay", "5", "--retry-all-errors", "-o", dst + ".part", url])
    if r.returncode:
        sys.exit(f"✗ 下载失败：{url}（没联网，或者要走代理？curl 认 https_proxy）")
    os.replace(dst + ".part", dst)
    print("↓", os.path.relpath(dst, P))


for k, (rel, name, lic) in SRC.items():
    get(os.path.join(src_dir, name), f"{GF}/{rel}")
    get(os.path.join(fdir, f"OFL-{lic}.txt"), f"{GF}/{lic}/OFL.txt")
if "--fetch" in sys.argv:
    sys.exit(0)

# ---------------------------------------------------------------- 片子里印出来的字
blocks = [cfg.get("title") or {}, cfg.get("end") or {}] + [s.get("sub") or {} for s in cfg.get("shots", [])]
zh = set(" ·0123456789")
en = set(" ")
for b in blocks:
    for k in ("kicker", "zh"):
        zh |= set(b.get(k, ""))
    en |= set(b.get("en", "")) | set(b.get("kicker", ""))     # 片尾卡的 kicker（署名）用英文正体
zh -= set("\n")
en -= set("\n")


def build(src, out, wght, chars, label):
    f = TTFont(os.path.join(src_dir, src))
    if "fvar" in f:
        f = instantiateVariableFont(f, {"wght": wght})
    cmap = f.getBestCmap()
    miss = sorted(c for c in chars if ord(c) not in cmap and not c.isspace())
    if miss:
        sys.exit(f"✗ {label} 里没有这些字：{''.join(miss)}（换个说法，或者这些字别用这种字体）")
    o = Options()
    o.layout_features = ["*"]
    o.name_IDs = ["*"]
    o.notdef_outline = True
    s = Subsetter(o)
    s.populate(text="".join(chars))
    s.subset(f)
    buf = io.BytesIO()
    f.save(buf)
    open(os.path.join(fdir, out), "wb").write(buf.getvalue())
    return len(buf.getvalue())


# 中文字体也要印出英文 kicker 里的拉丁字母（片名卡的“方寸之境 · 第二境”这类）；英文字体里没有中文
sizes = {
    "NSerif-300.ttf": build("NotoSerifSC-VF.ttf", "NSerif-300.ttf", 300, zh, "Noto Serif SC"),
    "NSerif-400.ttf": build("NotoSerifSC-VF.ttf", "NSerif-400.ttf", 400, zh, "Noto Serif SC"),
}
latin = {c for c in en if ord(c) < 0x3000}
sizes["CG-500.ttf"] = build("CormorantGaramond-VF.ttf", "CG-500.ttf", 500, latin, "Cormorant Garamond")
sizes["CGI-500.ttf"] = build("CormorantGaramond-Italic-VF.ttf", "CGI-500.ttf", 500, latin, "Cormorant Garamond Italic")
print("字体子集：" + "，".join(f"{k} {v // 1024} KB" for k, v in sizes.items()) + f"（中文 {len(zh)} 字，英文 {len(latin)} 字）")
