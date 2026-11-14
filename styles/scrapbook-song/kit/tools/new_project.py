#!/usr/bin/env python3
"""建一个手账歌谣的影片工程：一首歌 + 一份带时间的歌词（LRC）→ 一个新的影片文件夹（制作手册第 1 步）。

    .venv/bin/python styles/scrapbook-song/kit/tools/new_project.py <工程文件夹> <歌.mp3> <歌词.lrc> \\
        [--title 歌名] [--artist 演唱] [--year 2026] [--script zh-Hans|zh-Hant] [--name 输出文件名前缀]
工程文件夹按库的规矩放：克隆模式是 films/<名字>/，技能模式是用户文件夹里的 <名字>/（AGENTS.md「Where things go」），不放进 styles/。
它会：复制歌到 audio/，写 mv.json，复制镜头和素材模板、意象表模板，写一份 CREDITS 初稿，下载完整字体，
跑节拍分析（analyze.py）和歌词导入（lyrics.py）。已有 mv.json 的文件夹不会被覆盖。
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.path.abspath(os.path.join(KIT, "..", "..", ".."))
ap = argparse.ArgumentParser()
ap.add_argument("project"); ap.add_argument("song"); ap.add_argument("lyrics")
ap.add_argument("--title", default=""); ap.add_argument("--artist", default=""); ap.add_argument("--year", default="")
ap.add_argument("--script", default="zh-Hans", choices=["zh-Hans", "zh-Hant"], help="简体 zh-Hans / 繁体 zh-Hant（台湾正体）")
ap.add_argument("--name", default="", help="成片文件名前缀，默认用文件夹名")
a = ap.parse_args()
P = os.path.abspath(a.project)
if os.path.commonpath([P, os.path.join(LIB, "styles")]) == os.path.join(LIB, "styles"):
    sys.exit("影片工程不放进 styles/：克隆模式用 films/<名字>/，技能模式用用户文件夹里的 <名字>/")
if os.path.exists(os.path.join(P, "mv.json")):
    sys.exit(f"{P} 里已经有 mv.json：换一个文件夹，或者直接在它上面继续")
name = a.name or re.sub(r"[^a-z0-9-]+", "-", os.path.basename(P).lower()).strip("-") or "mv"
for d in ("audio", "data", "design", "scripts/scenes", "scripts/assets", "scenes", "fonts", "out"):
    os.makedirs(os.path.join(P, d), exist_ok=True)
ext = os.path.splitext(a.song)[1].lower() or ".mp3"
shutil.copy(a.song, os.path.join(P, "audio", "song" + ext))
cfg = {
    "title": a.title, "artist": a.artist, "year": a.year, "script": a.script, "name": name,
    "audio": "audio/song" + ext, "audio_t0": 0.0,
    "audiomap": "data/audiomap.json", "lyrics": "data/lyrics.json",
    "range": None, "fade": [0.25, 2.6],
    "scenes": [], "hits": [], "pass_texts": {}, "poster": None,
}
json.dump(cfg, open(os.path.join(P, "mv.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for src, dst in (("scene_template.py", "scripts/scenes/_template.py"), ("asset_example.py", "scripts/assets/_example.py"),
                 ("imagery.md", "design/imagery.md")):
    shutil.copy(os.path.join(KIT, "templates", src), os.path.join(P, dst))
song_line = f"《{a.title}》" + (f"，{a.artist}" if a.artist else "")
open(os.path.join(P, "CREDITS"), "w", encoding="utf-8").write(f"""{a.title or name} — a Scrapbook Song (手账歌谣) film

SONG: {song_line}. (the user's own song: say who wrote and sang it; for someone else's song, its licence)
PICTURE: drawn entirely in code (SVG generated in Python, rendered in a browser). No photographs, scans or AI images.
FONTS (SIL Open Font License 1.1, from github.com/google/fonts, subset to the characters printed; licences in fonts/):
- {"Chiron GoRound TC 900" if a.script == "zh-Hant" else "ZCOOL KuaiLe (站酷快乐体)"}: slammed words, ribbons, seals.
- LXGW WenKai TC (霞鹜文楷 TC): sung lines, labels.
- JetBrains Mono: page numbers. Instrument Serif Italic: a hand-written signature (if used).
TOOLS: the NEO-Cine library: the Scrapbook Song kit (styles/scrapbook-song/kit/) and core/ render, loudness and check tools.
""")
os.makedirs(os.path.join(P, ".pylib"), exist_ok=True)
py = sys.executable
for cmd in ([py, os.path.join(KIT, "tools", "fonts.py"), P, "--fetch"],
            [py, os.path.join(KIT, "tools", "analyze.py"), P],
            [py, os.path.join(KIT, "tools", "lyrics.py"), P, os.path.abspath(a.lyrics)]):
    subprocess.run(cmd, check=True)
if a.script == "zh-Hant":
    print("繁体片：装 OpenCC 到工程里 →", py, "-m pip install --target", os.path.join(P, ".pylib"), "opencc-python-reimplemented")
print("\n工程好了：", P)
print("下一步（styles/scrapbook-song/PRODUCTION.md）：填 design/imagery.md → 在 scripts/assets/ 画素材 → asset_sheet.py → 分镜（mv.json scenes）→ 给用户确认")
