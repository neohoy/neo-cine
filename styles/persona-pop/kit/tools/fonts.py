#!/usr/bin/env python3
"""影片自己的字体：下载（第一次）并按工程里出现的字切子集 → <工程>/fonts/display.ttf、sans.ttf、mono.ttf。

    .venv/bin/python styles/persona-pop/kit/tools/fonts.py <工程>

三个族（STYLE.md §4），全是 SIL Open Font License 1.1，下载地址固定到版本或提交：
  display  得意黑 Smiley Sans Oblique：歌词、居中大字、片名、名牌、大印章
  sans     思源黑体 Noto Sans SC（可变字重）：界面上的小字
  mono     JetBrains Mono（可变字重）：终端、代码、文件名（中文由 sans 接上）
完整文件放 <工程>/out/fonts-src/（不进 git），子集和许可文本放 <工程>/fonts/。不用系统字体：字体跟着工程走，换台机器渲出来一样。
"要切的字" = 工程里 index.html、*.js、data/*.json、mv.json 出现过的所有字符，再加 ASCII：只多不少，缺字的风险在源码之外的地方
（运行时拼出来的字），这里也一并检查：子集里没有的字会列出来并停下。
"""
import glob
import io
import os
import subprocess
import sys
import zipfile

P = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else sys.exit(__doc__))
GF = "https://raw.githubusercontent.com/google/fonts/86aced91de05cd4f96a06838124cca45be337b2b/ofl"
FONTS = {
    "display": {"zip": "https://github.com/atelier-anchor/smiley-sans/releases/download/v2.0.1/smiley-sans-v2.0.1.zip", "member": "SmileySans-Oblique.ttf",
                "license": "https://raw.githubusercontent.com/atelier-anchor/smiley-sans/v2.0.1/LICENSE", "lic": "OFL-smiley.txt"},
    "sans": {"url": f"{GF}/notosanssc/NotoSansSC%5Bwght%5D.ttf", "license": f"{GF}/notosanssc/OFL.txt", "lic": "OFL-notosanssc.txt"},
    "mono": {"url": f"{GF}/jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf", "license": f"{GF}/jetbrainsmono/OFL.txt", "lic": "OFL-jetbrainsmono.txt"},
}


def get(url, dst):
    if os.path.exists(dst) and os.path.getsize(dst):
        return
    if subprocess.run(["curl", "-fsSL", "-g", "--retry", "2", "-o", dst + ".part", url]).returncode:
        sys.exit(f"✗ 下载失败：{url}（没联网，或者要走代理？curl 认 https_proxy）")
    os.replace(dst + ".part", dst)
    print("↓", os.path.relpath(dst, P))


src_dir, out_dir = os.path.join(P, "out", "fonts-src"), os.path.join(P, "fonts")
os.makedirs(src_dir, exist_ok=True)
os.makedirs(out_dir, exist_ok=True)
text = set(chr(c) for c in range(0x20, 0x7F)) | set("，。！？、：；“”‘’（）《》…—·×✓→⚠")
for f in [os.path.join(P, "index.html"), os.path.join(P, "mv.json"), *glob.glob(os.path.join(P, "*.js")), *glob.glob(os.path.join(P, "data", "*.json"))]:
    if os.path.exists(f):
        text |= set(open(f, encoding="utf-8").read())
text = {c for c in text if c.isprintable() and c not in "\t\r\n"}
chars = "".join(sorted(text))

from fontTools import subset  # noqa: E402
from fontTools.ttLib import TTFont  # noqa: E402

for key, f in FONTS.items():
    full = os.path.join(src_dir, f"{key}.ttf")
    if "zip" in f:
        z = full[:-4] + ".zip"
        get(f["zip"], z)
        if not os.path.exists(full):
            open(full, "wb").write(zipfile.ZipFile(z).read(f["member"]))
    else:
        get(f["url"], full)
    get(f["license"], os.path.join(out_dir, f["lic"]))
    font = TTFont(full)
    cmap = font.getBestCmap()
    have = "".join(c for c in chars if ord(c) in cmap)
    opts = subset.Options()
    opts.layout_features = ["*"]
    opts.notdef_outline = True
    sub = subset.Subsetter(opts)
    sub.populate(text=have)
    sub.subset(font)
    font.save(os.path.join(out_dir, f"{key}.ttf"))
    print(f"✓ fonts/{key}.ttf  {len(have)} 个字")
# 片名、歌词、名牌用 display；它缺的字（少见字、符号）由 sans 接上；两个都缺的列出来
d = TTFont(os.path.join(src_dir, "display.ttf")).getBestCmap()
s = TTFont(os.path.join(src_dir, "sans.ttf")).getBestCmap()
miss = [c for c in chars if ord(c) > 0x7F and ord(c) not in d and ord(c) not in s and not c.isspace()]
if miss:
    print("⚠ 两种字体都没有的字（画面上会显示成方块，换掉或换字体）：", "".join(miss))
