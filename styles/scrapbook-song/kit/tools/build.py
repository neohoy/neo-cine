#!/usr/bin/env python3
"""生成工程的镜头 → scenes/<id>.html，写 scenes/manifest.json，再把整片页面（kit/page/）复制进工程。

    .venv/bin/python styles/scrapbook-song/kit/tools/build.py <工程>                 全部镜头
    .venv/bin/python styles/scrapbook-song/kit/tools/build.py <工程> s02 s03         只重建这几个（manifest 照样按全片写）
    .venv/bin/python styles/scrapbook-song/kit/tools/build.py <工程> --sample s02,c1  样片：只生成这几个相邻镜头，manifest 只含它们
每个镜头是 mv.json scenes 里的一条 {"id", "start", "end", "builder", "args"}；builder 是工程里的一个 Python 脚本，
跑的时候 HDMV_PROJECT 指向工程，sys.path 上有工具包 kit/、工程的 .pylib/（按需装的包，比如 OpenCC）、scripts/assets/
和脚本自己所在的文件夹，所以脚本里直接 `from scene import *`、`import typo`。
检查：镜头首尾相接、刚好铺满 range（mv.json，默认第一个镜头起点到最后一个终点）；镜头的 id 前缀不重复。
manifest 里：t0（片子第 0 秒对应的全曲时间）、dur、镜头起止、片中出现的歌词、事件 ev（cut 切点、line 每句开唱、
hit 重拍：Scene.hit 登记的和 mv.json 的 hits）、pass（mv.json 的 pass_texts），时间都是片中时间（ev、歌词）或全曲时间（镜头）。
"""
import glob
import json
import os
import re
import shutil
import subprocess
import sys

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = sys.argv[1:]
if not args:
    sys.exit(__doc__)
P = os.path.abspath(args.pop(0))
sample = None
if "--sample" in args:
    i = args.index("--sample"); sample = args[i + 1].split(","); del args[i:i + 2]
only = set(args) | set(sample or [])
cfg = json.load(open(os.path.join(P, "mv.json"), encoding="utf-8"))
scenes = cfg.get("scenes", [])
if not scenes:
    sys.exit("mv.json 里还没有镜头（scenes）")
out_dir = os.path.join(P, cfg.get("out_dir", "scenes"))
os.makedirs(out_dir, exist_ok=True)

# ---------------------------------------------------------------- 跑镜头脚本
env = {**os.environ, "HDMV_PROJECT": P}
fails = []
for s in scenes:
    if only and s["id"] not in only:
        continue
    b = s.get("builder")
    if not b:
        print("跳过（没有 builder）:", s["id"]); continue
    bp = os.path.join(P, b)
    env["PYTHONPATH"] = os.pathsep.join([KIT, os.path.join(P, ".pylib"), os.path.join(P, "scripts", "assets"), os.path.dirname(bp)])
    if subprocess.run([sys.executable, bp, *map(str, s.get("args", []))], cwd=P, env=env).returncode:
        fails.append(s["id"])
if fails:
    sys.exit("镜头脚本出错：" + " ".join(fails))

# ---------------------------------------------------------------- 检查和 manifest
use = [s for s in scenes if not sample or s["id"] in sample]
r = cfg.get("range")
t0 = float(use[0]["start"]) if sample or not r else float(r[0])
t1 = float(use[-1]["end"]) if sample or not r else float(r[1])
prev = t0
for s in use:
    a, b = float(s["start"]), float(s["end"])
    if abs(a - prev) > 1e-6:
        sys.exit(f"镜头 {s['id']} 前面有空档或重叠：上一个到 {prev}，它从 {a} 开始")
    if not os.path.exists(os.path.join(out_dir, s["id"] + ".html")):
        sys.exit(f"还没生成：{s['id']}.html")
    prev = b
if abs(prev - t1) > 1e-6:
    sys.exit(f"镜头铺到 {prev}，range 到 {t1}：两者要相等")
seen = {}
hits = [dict(h) for h in cfg.get("hits", [])]
for s in use:
    html = open(os.path.join(out_dir, s["id"] + ".html"), encoding="utf-8").read()
    m = re.search(r'id="([^"]+)-root" data-composition-id', html)
    if m and m.group(1) in seen:
        sys.exit(f"镜头 {seen[m.group(1)]} 和 {s['id']} 用了同一个 id 前缀 {m.group(1)!r}：给其中一个 Scene(…, p=…)")
    if m:
        seen[m.group(1)] = s["id"]
    meta = os.path.join(out_dir, s["id"] + ".json")
    if os.path.exists(meta):
        hits += json.load(open(meta, encoding="utf-8")).get("hits", [])
L = json.load(open(os.path.join(P, cfg["lyrics"]), encoding="utf-8"))
lyr = [{"i": l.get("i", k), "t0": round(l["start"] - t0, 3), "t1": round(l["end"] - t0, 3), "text": l["text"]}
       for k, l in enumerate(L) if t0 <= l["start"] < t1]
if cfg.get("script") == "zh-Hant" or cfg.get("opencc"):     # 歌词检查按画面上的字形比对
    os.environ["HDMV_PROJECT"] = P
    sys.path[:0] = [KIT, os.path.join(P, ".pylib")]
    import text
    for l in lyr:
        l["text"] = text.convert(l["text"])
ev = ([{"t": round(float(s["start"]) - t0, 3), "type": "cut", "id": s["id"]} for s in use[1:]]
      + [{"t": l["t0"], "type": "line", "id": f"L{l['i']}"} for l in lyr]
      + [{"t": round(h["t"] - t0, 3), "type": "hit", "id": h["name"]} for h in hits if t0 <= h["t"] < t1])
man = {"t0": t0, "dur": round(t1 - t0, 3), "title": cfg.get("title", ""),
       "scenes": [{"fid": s["id"], "g0": float(s["start"]), "g1": float(s["end"]), "file": s["id"] + ".html"} for s in use],
       "lyrics": lyr, "pass": cfg.get("pass_texts", {}), "ev": sorted(ev, key=lambda e: e["t"])}
json.dump(man, open(os.path.join(out_dir, "manifest.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for f in ("index.html", "film.js", "gsap-lite.js"):
    shutil.copy(os.path.join(KIT, "page", f), os.path.join(P, f))
print(f"manifest：{len(use)} 个镜头，{len(lyr)} 句歌词，{len(man['ev'])} 个事件，片长 {man['dur']} 秒"
      + (f"（样片，全曲 {t0}–{t1}）" if sample else ""))
