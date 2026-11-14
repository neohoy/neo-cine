#!/usr/bin/env python3
"""影片自己的字体：下载（第一次）并按片子里实际印出来的字切子集 → <工程>/fonts/；缺字就停。

    .venv/bin/python styles/tech-launch/kit/tools/fonts.py <工程>
    .venv/bin/python styles/tech-launch/kit/tools/fonts.py <工程> --fetch    只下载完整字体（tools/new_project.mjs 会跑）

三种都是 SIL Open Font License 1.1，取自 google/fonts 固定的一个提交，完整文件放在 <工程>/out/fonts-src/（不进 git），
子集和许可文本放在 <工程>/fonts/：
  IS.ttf        Instrument Serif：英文大标题、数字卡和计数的数字（页面里叫 "Film Serif"）
  NSC-500.ttf   Noto Sans SC 500：说明、副行、标注卡的说明（"Film Sans" 500）
  NSC-700.ttf   Noto Sans SC 700：中文标题、标注卡的事实（"Film Sans" 700）
  JBM.ttf       JetBrains Mono：画框小字、眉题、编号、地址（"Film Mono"；它没有的字由 Film Sans 接上）
中文不用系统的苹方、微软雅黑：字体文件跟着工程走，Mac 和 Windows（渲染台式机）渲出来一样。
用字取自 promo.json 的 title、film（全部文字）和 site.pages 的 label；英文标题和数字必须都在 Instrument Serif 里，
其余的字必须都在 Noto Sans SC 里，缺一个就停（子集字体缺字会悄悄换成别的字体）。
冻结下来的站点自己的字体不在这里处理：它们按站点原样（tools/freeze.mjs），许可由用户负责。
"""
import json
import os
import subprocess
import sys

P = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else ".")
cfg = json.load(open(os.path.join(P, "promo.json"), encoding="utf-8"))
GF = "https://raw.githubusercontent.com/google/fonts/86aced91de05cd4f96a06838124cca45be337b2b/ofl"
SRC = {  # 名字 → (google/fonts 里的路径, 存成的文件名, 许可文件夹)
    "IS": ("instrumentserif/InstrumentSerif-Regular.ttf", "InstrumentSerif-Regular.ttf", "instrumentserif"),
    "NSC": ("notosanssc/NotoSansSC%5Bwght%5D.ttf", "NotoSansSC-VF.ttf", "notosanssc"),
    "JBM": ("jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf", "JetBrainsMono-VF.ttf", "jetbrainsmono"),
}
src_dir, fdir = os.path.join(P, "out", "fonts-src"), os.path.join(P, "fonts")
os.makedirs(src_dir, exist_ok=True)
os.makedirs(fdir, exist_ok=True)


def get(dst, url):
    if os.path.exists(dst) and os.path.getsize(dst) and not os.environ.get("FORCE"):
        return
    r = subprocess.run(["curl", "-fsSL", "-g", "--retry", "2", "-o", dst + ".part", url])
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
def strings(x):
    if isinstance(x, str):
        yield x
    elif isinstance(x, dict):
        for v in x.values():
            yield from strings(v)
    elif isinstance(x, list):
        for v in x:
            yield from strings(v)


film = cfg.get("film", {})
# 英文标题和数字卡用 Instrument Serif
serif = set("0123456789.,%+-")
for s in film.get("shots", []):
    for line in ([s["en"]] if isinstance(s.get("en"), str) else s.get("en") or []):
        serif |= set(line)
    st = s.get("stat") or {}
    serif |= set(str(st.get("prefix", "")) + str(st.get("suffix", "")))
serif -= set(" \n")
# 其余的字（中文标题、说明、标注卡、标签、画框小字、地址栏）用 Noto Sans SC；JetBrains Mono 印它有的那部分
alltext = set(" 0123456789./:·-%")
for x in [cfg.get("title", "")] + list(strings(film)) + [p.get("label", "") for p in cfg.get("site", {}).get("pages", [])]:
    if isinstance(x, str) and not x.startswith("#") and not x.startswith("http"):
        alltext |= set(x)
alltext -= set("\n")
# 计数从 0 数上来：数字都要有
alltext |= set("0123456789")

from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.varLib import instancer


def cover(path):
    return TTFont(path).getBestCmap()


bad = False
miss = sorted(c for c in serif if ord(c) not in cover(os.path.join(src_dir, SRC["IS"][1])))
if miss:
    print(f"✗ 英文标题（Instrument Serif）里有它没有的字：{''.join(miss)}（英文标题只写英文和数字）")
    bad = True
nsc = cover(os.path.join(src_dir, SRC["NSC"][1]))
miss = sorted(c for c in alltext - serif if ord(c) not in nsc and not c.isspace())
if miss:
    print(f"✗ Noto Sans SC 缺字：{''.join(miss)}（换个说法，或者去掉这些符号）")
    bad = True
if bad:
    sys.exit(1)


def cut(font, chars, out):
    opts = subset.Options()
    opts.layout_features = ["*"]
    opts.hinting = False
    sub = subset.Subsetter(opts)
    sub.populate(text="".join(sorted(chars)))
    sub.subset(font)
    font.save(out)
    print(f"{os.path.basename(out)}: {len(chars)} 个字 → {os.path.getsize(out) // 1024} KB")


cut(TTFont(os.path.join(src_dir, SRC["IS"][1])), serif | set(" "), os.path.join(fdir, "IS.ttf"))
for w in (500, 700):
    f = instancer.instantiateVariableFont(TTFont(os.path.join(src_dir, SRC["NSC"][1])), {"wght": w})
    cut(f, alltext, os.path.join(fdir, f"NSC-{w}.ttf"))
jb = TTFont(os.path.join(src_dir, SRC["JBM"][1]))
jbc = jb.getBestCmap()
cut(jb, {c for c in alltext if ord(c) in jbc}, os.path.join(fdir, "JBM.ttf"))
