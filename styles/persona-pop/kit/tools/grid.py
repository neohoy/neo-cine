#!/usr/bin/env python3
"""逐字歌词时间 → <工程>/data/lyrics.json（歌词层和主旋律都读它，STYLE.md §3 "一个时间源"）。

    .venv/bin/python styles/persona-pop/kit/tools/grid.py <工程>                 按 mv.json 的 sheet 把字排到节拍网格上
    .venv/bin/python styles/persona-pop/kit/tools/grid.py <工程> --words w.json  按人声的逐字时间（faster-whisper 的词时间）对齐

mv.json 的 sheet（每句歌词一项，时间都是片子的秒数）：
    {"id": "l1", "t0": 4, "t1": 8, "segs": [
       {"id": "l1a", "who": ["a"], "text": "需求刚到，", "at": 4.0},
       {"id": "l1b", "who": ["a"], "text": "等等让我想想", "at": 5.5, "center": true, "rhythm": [2, 1, 1, 1, 1, 2]}]}
  · who：角色键（cast.json 的 who）；两个人就是合唱
  · at：这一段第一个字的时刻；字按 mv.json 的 grid（默认 0.25 s = 120 BPM 的八分音符）一个接一个排
  · rhythm：可选，每个字占几格（标点不占格）；不写就每字一格
  · center：这一段用居中大字（闪卡）；常驻行照样在
--words：用户自己的歌。先用 core/tts/asr_check.py（或 faster-whisper）在分离出来的人声上取逐字时间，存成
    [{"w": "需", "t": 4.02}, …]（按顺序，一个字一项）；这里按 sheet 的文字顺序逐字对上，对不上的字停下来让人改。
输出：{"grid", "lines": [{id, t0, t1, segs: [{id, who, text, center, chars: [{c, t}]}]}]}，标点的 t 是 null。
"""
import argparse
import json
import os
import re
import sys

ap = argparse.ArgumentParser()
ap.add_argument("project")
ap.add_argument("--words")
a = ap.parse_args()
P = os.path.abspath(a.project)
cfg = json.load(open(os.path.join(P, "mv.json"), encoding="utf-8"))
G = cfg.get("grid", 0.25)
PUNCT = re.compile(r"[，。！？、,.!?\s]")
words = json.load(open(a.words, encoding="utf-8")) if a.words else None
wi = 0
lines = []
for line in cfg["sheet"]:
    segs = []
    for s in line["segs"]:
        chars, t = [], s["at"]
        sung = [c for c in s["text"] if not PUNCT.match(c)]
        rhythm = s.get("rhythm") or [1] * len(sung)
        if len(rhythm) != len(sung):
            sys.exit(f"✗ {s['id']}：rhythm 有 {len(rhythm)} 项，歌词有 {len(sung)} 个字")
        k = 0
        for c in s["text"]:
            if PUNCT.match(c):
                chars.append({"c": c, "t": None})
                continue
            if words is not None:
                if wi >= len(words) or words[wi]["w"] != c:
                    got = words[wi]["w"] if wi < len(words) else "（没有了）"
                    sys.exit(f"✗ {s['id']} 第 {k + 1} 个字：歌词是「{c}」，人声第 {wi + 1} 个字是「{got}」。改 sheet 或词时间，再跑")
                chars.append({"c": c, "t": round(words[wi]["t"], 3)})
                wi += 1
            else:
                chars.append({"c": c, "t": round(t, 3)})
                t += rhythm[k] * G
            k += 1
        last = max(c["t"] for c in chars if c["t"] is not None)
        if last > line["t1"] - 0.3:
            sys.exit(f"✗ {s['id']} 最后一个字在 {last:.2f} s，离这句结束（{line['t1']} s）不到 0.3 s：往前挪或加快")
        segs.append({"id": s["id"], "who": s["who"], "text": s["text"], "center": bool(s.get("center")), "chars": chars})
    lines.append({"id": line["id"], "t0": line["t0"], "t1": line["t1"], "segs": segs})
os.makedirs(os.path.join(P, "data"), exist_ok=True)
json.dump({"grid": G, "lines": lines}, open(os.path.join(P, "data", "lyrics.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
n = sum(1 for l in lines for s in l["segs"] for c in s["chars"] if c["t"] is not None)
print(f"✓ data/lyrics.json：{len(lines)} 句，{n} 个字" + ("（按人声对齐）" if words else f"（按 {G} s 网格）"))
