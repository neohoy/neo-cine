#!/usr/bin/env python3
"""带时间的歌词 → 工程的 data/lyrics.json，并把每句和最近的强拍并排打出来。

    .venv/bin/python styles/scrapbook-song/kit/tools/lyrics.py <工程> <歌词文件>   （.lrc：[mm:ss.xx]一句；.json：[{start,end,text}]；
                                                                               .tsv：开始<TAB>结束<TAB>文字）
    .venv/bin/python styles/scrapbook-song/kit/tools/lyrics.py <工程> --show      只打印现在的 lyrics.json
段落标记（[Verse] 这种）和空行去掉。LRC 没有结束时间：一句的结束 = 下一句开始 − 0.2 秒，最后一句 + 4 秒；
长音拖得很长、或者两句之间有间奏的，在 lyrics.json 里手改 end（"唱的时候必须完整可读"按 end 算）。
简体繁体都可以，镜头写出时统一转成 mv.json 的 script。
来自《风吹新竹》MV 工程。
"""
import json
import os
import re
import sys

P = os.path.abspath(sys.argv[1])
cfg = json.load(open(os.path.join(P, "mv.json"), encoding="utf-8"))
out = os.path.join(P, cfg["lyrics"])


def show():
    L = json.load(open(out, encoding="utf-8"))
    db = []
    am = os.path.join(P, cfg["audiomap"])
    if os.path.exists(am):
        db = json.load(open(am, encoding="utf-8"))["grid"]["downbeats_sec"]
    for i, l in enumerate(L):
        near = min(db, key=lambda t: abs(t - l["start"])) if db else None
        bar = f"  （最近的强拍 {near:.2f}）" if near is not None else ""
        print(f"{i:3d}  {l['start']:7.2f}–{l['end']:7.2f}  {l['text']}{bar}")


if len(sys.argv) < 3:
    sys.exit(__doc__)
if sys.argv[2] == "--show":
    show()
    sys.exit()
src = sys.argv[2]
text = open(src, encoding="utf-8-sig").read()
lines = []
if src.endswith(".json"):
    lines = [{"start": float(x["start"]), "end": float(x["end"]), "text": x["text"].strip()} for x in json.loads(text)]
elif src.endswith(".tsv"):
    for row in text.splitlines():
        if row.strip():
            a, b, t = row.split("\t", 2)
            lines.append({"start": float(a), "end": float(b), "text": t.strip()})
else:
    stamps = []
    for row in text.splitlines():
        for m in [re.match(r"\[(\d+):(\d+(?:\.\d+)?)\](.*)", row.strip())]:
            if m and m.group(3).strip() and not re.match(r"^\[.*\]$", m.group(3).strip()):
                stamps.append((int(m.group(1)) * 60 + float(m.group(2)), m.group(3).strip()))
    stamps.sort()
    for k, (t, s) in enumerate(stamps):
        end = stamps[k + 1][0] - 0.2 if k + 1 < len(stamps) else t + 4.0
        lines.append({"start": round(t, 2), "end": round(end, 2), "text": s})
lines = [dict(l, i=k) for k, l in enumerate(x for x in lines if x["text"] and not re.match(r"^\[.*\]$", x["text"]))]
os.makedirs(os.path.dirname(out), exist_ok=True)
json.dump(lines, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"→ {os.path.relpath(out, P)}：{len(lines)} 句")
show()
