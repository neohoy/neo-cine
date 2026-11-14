#!/usr/bin/env python3
"""素材表：把这首歌新画的角色和道具拼到一页上渲成图，给自己看、也给用户确认（制作手册第 3 步，确认点 1）。

    .venv/bin/python styles/scrapbook-song/kit/tools/asset_sheet.py <工程> [模块名 …] [--cols 4]
每首歌自己的画写在 <工程>/scripts/assets/*.py（"_" 开头的文件跳过），每个模块在末尾列出要展示的样子：
    SHEET = [("主角 · 正面", hero()), ("旧车票", ticket())]     # (名字, svg)；坐标随意，素材表会量出大小、缩放居中
一页 1920×1080，cols × 2 格；画多了自动分页。输出 <工程>/design/asset-sheet.jpg（第二页 asset-sheet-2.jpg …）。
画用抖线滤镜，字用工程的字体（还没切子集时用 out/fonts-src 里的完整字体，再没有就是系统字体）；格子下的名字用系统字体。
渲染走 core/render/still.mjs（页面在 <工程>/out/sheet/，符合页面约定）。
来自《风吹新竹》MV 工程（原来用 HyperFrames 截图，这里走 core/render）。
"""
import glob
import importlib.util
import math
import os
import shutil
import subprocess
import sys

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.environ.get("LIB") or os.path.abspath(os.path.join(KIT, "..", "..", ".."))
args = sys.argv[1:]
P = os.path.abspath(args.pop(0))
cols = 4
if "--cols" in args:
    i = args.index("--cols"); cols = int(args[i + 1]); del args[i:i + 2]
only = set(args)
os.environ["HDMV_PROJECT"] = P
sys.path[:0] = [KIT, os.path.join(P, ".pylib"), os.path.join(P, "scripts", "assets")]
from frame_kit import defs  # noqa: E402
import text  # noqa: E402

entries = []
for f in sorted(glob.glob(os.path.join(P, "scripts", "assets", "*.py"))):
    name = os.path.splitext(os.path.basename(f))[0]
    if name.startswith("_") or (only and name not in only):
        continue
    spec = importlib.util.spec_from_file_location(f"asset_{name}", f)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    for e in getattr(mod, "SHEET", []):
        entries.append((f"{name} · {e[0]}", e[1]))
if not entries:
    sys.exit("scripts/assets/*.py 里没有 SHEET")

W, H = 1920, 1080
CW, CH = W // cols, (H - 40) // 2
per = cols * 2
fonts = {}
kl = "ChironGoRoundTC-900.ttf" if text.SCRIPT == "zh-Hant" else "ZCOOLKuaiLe-Regular.ttf"
for fam, sub, full in (("KL", "KL.ttf", kl), ("WK", "WK.ttf", "LXGWWenKaiTC-Regular.ttf"),
                       ("JBM", "JBM.ttf", "JetBrainsMono.ttf"), ("IS", "IS.ttf", "InstrumentSerif-Italic.ttf")):
    for rel in (f"out/fonts-src/{full}", f"fonts/{sub}"):          # 完整字体优先：素材表里的字不一定进了子集
        if os.path.exists(os.path.join(P, rel)):
            fonts[fam] = os.path.join(P, rel); break
faces = [f'@font-face{{font-family:"{fam}";src:url("fonts/{fam}.ttf")}}' for fam in fonts]
d = os.path.join(P, "out", "sheet"); shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
outs = []
for page in range(math.ceil(len(entries) / per)):
    cells = []
    for k, (label, svg) in enumerate(entries[page * per:(page + 1) * per]):
        cx, cy = (k % cols) * CW, (k // cols) * CH + 40
        cells.append(f'<rect x="{cx + 8}" y="{cy + 8}" width="{CW - 16}" height="{CH - 16}" rx="14" fill="#FBF7EE" stroke="#D8CFBF" stroke-width="3"/>'
                     f'<g data-fit="{cx + 30},{cy + 26},{CW - 60},{CH - 100}"><g>{text.convert_svg(svg)}</g></g>'
                     f'<text x="{cx + CW / 2:.0f}" y="{cy + CH - 26:.0f}" font-family="PingFang SC, Hiragino Sans GB, Noto Sans CJK SC, sans-serif" font-size="22" text-anchor="middle" fill="#333">{label}</text>')
    svg = (f'<svg viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;width:100%;height:100%"><defs>{defs("sh")}</defs>'
           f'<rect width="{W}" height="{H}" fill="#F3EDE0"/><g filter="url(#sh-wob)">{"".join(cells)}</g></svg>')
    pd = os.path.join(d, f"p{page + 1}"); os.makedirs(os.path.join(pd, "fonts"))
    for fam, src in fonts.items():                                  # 页面只能读它自己文件夹里的文件：链接（或复制）进来
        try:
            os.symlink(src, os.path.join(pd, "fonts", fam + ".ttf"))
        except OSError:
            shutil.copy(src, os.path.join(pd, "fonts", fam + ".ttf"))
    open(os.path.join(pd, "index.html"), "w", encoding="utf-8").write(f"""<!doctype html><html><head><meta charset="utf-8">
<style>{"".join(faces)}html,body{{margin:0;width:100vw;height:100vh;overflow:hidden;background:#F3EDE0}}</style></head><body>{svg}
<script type="module">
document.querySelectorAll("[data-fit]").forEach((g) => {{
  const f = g.getAttribute("data-fit").split(",").map(Number), b = g.getBBox(); if (!b.width || !b.height) return;
  const s = Math.min(f[2] / b.width, f[3] / b.height, 1.6);
  g.setAttribute("transform", `translate(${{f[0] + f[2] / 2 - (b.x + b.width / 2) * s}} ${{f[1] + f[3] / 2 - (b.y + b.height / 2) * s}}) scale(${{s}})`);
}});
await document.fonts.ready;
window.DUR = 1; window.render = () => {{}}; window.READY = true;
</script></body></html>""")
    subprocess.run(["node", os.path.join(LIB, "core", "render", "still.mjs"), pd, "0", "--out", pd], check=True, cwd=LIB, capture_output=True)
    out = os.path.join(P, "design", "asset-sheet" + (f"-{page + 1}" if page else "") + ".jpg")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    shutil.copy(os.path.join(pd, "t_0.jpg"), out)
    outs.append(out); print(out)
print(f"{len(entries)} 件，{len(outs)} 页")
