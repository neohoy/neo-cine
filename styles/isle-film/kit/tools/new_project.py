#!/usr/bin/env python3
"""新建一个方寸影像工程：把用户的一境（NEO-Isle 的 world.js）复制进来，写一份能直接出片的镜头表起稿。

    python3 styles/isle-film/kit/tools/new_project.py <工程> --world <一境的文件夹或 world.js> [--name 文件名前缀]

写出 <工程>/world.js（原样复制）、film.json（三个镜头的起稿：远处推进、穿过玻璃到中心近景，在玻璃里快进三个小时，退出玻璃看整只容器）、
CREDITS（起稿）和 .gitignore。一境的文件夹或它的系列目录里有 _core/（用户“自成一格”的引擎）时，把它复制成 <工程>/isle-core/，
build.mjs 就用它；那份引擎要有影片模式（NEO-Isle 1.2.0 起），没有就停。之后：build.mjs → survey.mjs（看地标）→ 改镜头表 → preview.sh。
"""
import json
import os
import re
import shutil
import sys

args = [a for a in sys.argv[1:]]
if not args or args[0].startswith("--"):
    sys.exit(__doc__)
P = os.path.abspath(args[0])
opt = lambda k: args[args.index(k) + 1] if k in args and args.index(k) + 1 < len(args) else None
src = opt("--world") or sys.exit("要 --world <一境的文件夹或 world.js>")
wf = src if src.endswith(".js") else os.path.join(src, "world.js")
if not os.path.isfile(wf):
    sys.exit(f"✗ 找不到 {wf}")
world = open(wf, encoding="utf-8").read()
if not re.search(r"\bconst\s+WORLD\s*=", world):
    sys.exit("✗ 这不是 NEO-Isle 的世界文件（里面要有 const WORLD = {...}）")
if os.path.exists(os.path.join(P, "film.json")):
    sys.exit(f"✗ {P} 里已经有 film.json：换一个工程目录，或者直接改它")
os.makedirs(P, exist_ok=True)
shutil.copyfile(wf, os.path.join(P, "world.js"))

wdir = os.path.dirname(os.path.abspath(wf))
for core in (os.path.join(wdir, "_core"), os.path.join(os.path.dirname(wdir), "_core")):
    if os.path.isfile(os.path.join(core, "fangcun.js")):
        if "FANGCUN_FILM" not in open(os.path.join(core, "fangcun.js"), encoding="utf-8").read():
            sys.exit(f"✗ 这一境用的是自己的引擎（{core}），它还没有影片模式：先把 NEO-Isle 1.2.0 的影片模式合进去（references/制作与避坑.md 第九节）")
        shutil.copytree(core, os.path.join(P, "isle-core"), dirs_exist_ok=True)
        print(f"用这一境自己的引擎：{core} → isle-core/")
        break

m = lambda pat, d=None: (re.search(pat, world) or [None, d])[1]
name, no = m(r"\bname\s*:\s*['\"]([^'\"]+)['\"]", ""), m(r"\bno\s*:\s*(\d+)", "1")
start = float(m(r"\bstartHour\s*:\s*([\d.]+)", "17"))
series = m(r"\btitle\s*:\s*['\"]([^'\"]+)['\"]", "方寸之境")
CN = "零一二三四五六七八九十"
non = CN[int(no)] if int(no) <= 10 else no
slug = opt("--name") or re.sub(r"[^a-z0-9-]+", "-", os.path.basename(P).lower()).strip("-") or "isle"
h0 = max(5.0, min(start, 21.0))
cfg = {
    "name": slug, "world": "world.js", "clock": 60, "poster": 9.0,
    "title": {"kicker": f"{series} · 第{non}境", "zh": name, "en": "", "at": 0.8, "dur": 5.0},
    "shots": [
        {"id": "arrive", "move": "through", "dur": 8.0, "hour": [h0, h0 + 0.3],
         "keys": [{"at": 0, "az": 0.45, "pol": 1.12, "dist": 2.6, "target": [0, -0.4, 0]},
                  {"at": 4.0, "az": 0.6, "pol": 1.08, "dist": 1.05, "target": [0, -0.5, 0]},
                  {"at": 8.0, "az": 0.8, "pol": 1.2, "dist": 0.08, "target": [0, -1.6, 0]}]},
        {"id": "night", "move": "timelapse", "dur": 6.0, "in": "dissolve", "inDur": 1.0, "hour": [h0 + 0.4, min(h0 + 3.0, 23.5)],
         "from": {"az": 1.4, "pol": 1.12, "dist": 0.085, "target": [0, -1.4, 0]}, "to": {"az": 1.7, "pol": 1.1, "dist": 0.075}},
        {"id": "whole", "move": "pullback", "dur": 6.0, "hour": [min(h0 + 3.0, 23.5), min(h0 + 3.4, 23.9)],
         "keys": [{"at": 0}, {"at": 4.6, "az": 2.2, "pol": 1.08, "dist": 1.08, "target": [0, -0.35, 0]}, {"at": 6.0, "dist": 1.14}]},
    ],
    "end": {"dur": 2.5, "fade": 1.2},
    "sound": {"beds": {"wind": 0.7, "snow": 0.0, "birds": None, "water": 0.0}, "music": {"key": "D", "bpm": 80, "level": 1.0, "drop": "wonder"}, "chimes": 1.0},
}
json.dump(cfg, open(os.path.join(P, "film.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
open(os.path.join(P, "CREDITS"), "w", encoding="utf-8").write(
    f"《{name}》的影片（方寸影像 Isle Film 风格）\n\n"
    "世界：world.js，用户自己用 NEO-Isle（方寸之境）造的一境。\n"
    "引擎：NEO-Isle（https://github.com/neohoy/neo-isle，MIT），影片模式；three.js（MIT）。\n"
    "字体（SIL Open Font License 1.1，google/fonts，许可文本在 fonts/）：Noto Serif SC（中文）、Cormorant Garamond（英文）。\n"
    "声音：代码合成（numpy），没有录音、采样或现成音乐。\n")
open(os.path.join(P, ".gitignore"), "w", encoding="utf-8").write("/out/\n")
print(f"《{name}》→ {P}\n  下一步：build.mjs，然后 survey.mjs 看这一境的东西都在哪，再改 film.json 的镜头（制作手册第 2~4 步）")
