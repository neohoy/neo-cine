#!/usr/bin/env python3
"""配乐的原声版（可选）：和 tools/score.mjs 同一张时间线、同一套和声，用库的采样器（core/audio/sampler.py）演奏钢琴和弦乐。

    .venv/bin/python styles/tech-launch/kit/tools/score_acoustic.py <工程>     （先导出 events.json）
要先取两套采样（一次，库的根目录）：sh tools/fetch.sh instruments salamander 和 sh tools/fetch.sh instruments vsco2ce。
写出 <工程>/out/score-acoustic.wav 和 score-acoustic.json（重音表，tools/mix.py 用来核对画面）。用它时把 promo.json 的
audio.music.src 改成 "out/score-acoustic.wav"（make.sh 就不再跑代码合成的 score.mjs，镜头改了要手动重跑这一步）。
授权：钢琴 Salamander Grand Piano V3 是 CC BY 3.0，要署名（写进 CREDITS：Piano: "Salamander Grand Piano V3" by Alexander Holm,
licensed under CC BY 3.0）；弦乐 VSCO 2 CE 是 CC0。core/audio/sampler.py 的 credits() 能写出这两行。
D 大调，100 BPM（一拍 0.6 秒）。钢琴分解和弦贯穿全片，弦乐从第一个产品镜头进来；每个产品镜头一个和弦，切点那一拍低音加重，
抬起时落一个和弦，角点画出的那一拍高音一点；落版回到主和弦，余音到片尾。
来自 NEO 产品宣传片技能「科技公司式」主题的 score.py（MIT，© 2026 NEO造物集 (neohoy)）：乐谱没有改，改成从页面的画面事件读时间线，
直接用本库的采样器（原版要另装一份 lemo-opuscar）。
"""
import json
import os
import sys

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.environ.get("LIB") or os.path.abspath(os.path.join(KIT, "..", "..", ".."))
sys.path.insert(0, LIB)
P = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else ".")
EVJ = json.load(open(os.path.join(P, "events.json"), encoding="utf-8"))
OUT = os.path.join(P, "out", "score-acoustic.wav")

import soundfile as sf  # noqa: E402
from core.audio import sampler as S  # noqa: E402
from core.audio.sfx import SR  # noqa: E402

B = 0.6
BAR = 4 * B
DUR = EVJ["dur"]
SHOTS = sorted((e for e in EVJ["ev"] if e["type"] == "shot"), key=lambda e: e["t"])
CH = {
    "Dmaj9": dict(bass=["D2", "A2"], arp=["F#4", "A4", "E5", "C#5"], pad=["D3", "A3"], top="F#5"),
    "Bm11": dict(bass=["B1", "F#2"], arp=["D5", "F#4", "A4", "E5"], pad=["B2", "F#3"], top="B4"),
    "Gmaj7": dict(bass=["G1", "D2"], arp=["B4", "D5", "F#5", "D5"], pad=["G2", "D4"], top="B4"),
    "Em9": dict(bass=["E2", "B2"], arp=["G4", "B4", "F#5", "D5"], pad=["E3", "B3"], top="G5"),
    "Asus2": dict(bass=["A1", "E2"], arp=["E4", "B4", "C#5", "E5"], pad=["A2", "E3"], top="E5"),
}
CYCLE = ["Bm11", "Gmaj7", "Em9", "Asus2"]
HIT = {"Bm11": "Asus2", "Gmaj7": "Asus2", "Em9": "Asus2", "Asus2": "Dmaj9"}
notes, acc = [], []


def add(t, inst, pitch, dur, vel, pan):
    if t < DUR and dur > 0.05:
        notes.append((round(t, 4), inst, pitch, round(min(dur, DUR + 1.2 - t), 4), vel, pan))


def held(t0, t1, inst, pitch, vel, pan):
    t = t0   # 弦乐录音 6–15 秒，长音按 4.8 秒一段重新起奏
    while t < t1 - 0.3:
        add(t, inst, pitch, min(4.8, t1 - t), vel if t == t0 else vel * 0.8, pan)
        t += 4.8


end_i = next((s["i"] for s in SHOTS if s["kind"] == "end"), None)
feat_n, strings_on = 0, False
for s in SHOTS:
    if end_i is not None and s["i"] > end_i:
        continue   # 落版之后（库示范片的署名卡）接着落版的余音
    a, kind = s["t"], s["kind"]
    b = DUR if kind == "end" else s["t"] + s["d"]
    name = CYCLE[feat_n % 4] if kind == "feature" else "Dmaj9"
    feat_n += kind == "feature"
    ch = CH[name]
    if s["i"] > 0:
        acc.append({"type": "cut", "t": a, "i": s["i"]})
    if kind == "statement":
        st = CH["Asus2"]
        add(a, "piano", st["bass"][0], b - a + 0.3, 0.5, -0.15)
        held(a, b, "cellos", st["pad"][0], 0.3, 0.25)
        held(a + 0.05, b, "violins", st["top"], 0.24, 0.3)
        continue
    if kind == "end":
        for k, p in enumerate(ch["bass"]):
            add(a, "piano", p, b - a + 1.0, 0.44 - 0.08 * k, -0.15)
        for k, p in enumerate(dict.fromkeys(ch["arp"])):
            add(a + 0.02 + 0.04 * k, "piano", p, b - a + 1.0, 0.36, -0.08)
        add(a, "violins", ch["top"], b - a + 0.6, 0.26, 0.3)
        add(a, "cellos", ch["pad"][0], b - a + 0.6, 0.28, 0.25)
        if s.get("morph") is not None:
            add(s["morph"], "piano", "A5", 1.6, 0.24, 0.05)
            acc.append({"type": "square", "t": s["morph"], "i": s["i"]})
        continue
    t = a
    while t < b - 0.3:
        for k, p in enumerate(ch["bass"]):
            add(t, "piano", p, min(BAR, b - t), (0.52 if t == a else 0.42) - 0.1 * k, -0.15)
        t += BAR
    k0 = int(round(a / B))
    k = k0
    while k * B < b - 0.05:
        if k * B >= a - 1e-6:
            add(k * B, "piano", ch["arp"][(k - k0) % 4], 1.2, 0.40 if (k - k0) % 4 == 0 else 0.34, -0.08)
        k += 1
    if kind == "feature":
        if not strings_on:
            add(a + 0.2, "violins", ch["top"], 2.4, 0.3, 0.3)
            strings_on = True
        held(a, b, "cellos", ch["pad"][0], 0.3, 0.25)
        held(a + 0.05, b, "violas", ch["pad"][1], 0.24, 0.3)
        h, L = CH[HIT[name]], s["lift"]
        add(L, "piano", h["bass"][0], 1.2, 0.46, -0.15)
        add(L, "piano", h["arp"][0], 1.2, 0.36, -0.1)
        add(L, "piano", h["arp"][1], 1.2, 0.36, -0.05)
        add(L, "violins", h["top"], 0.9, 0.3, 0.3)
        add(s["marks"], "piano", "A5", 1.2, 0.26, 0.05)
        acc += [{"type": "lift", "t": L, "i": s["i"]}, {"type": "join" if s.get("layout") == "compare" else "mark", "t": s["marks"], "i": s["i"]}]
    else:
        held(a, b, "cellos", ch["pad"][0], 0.26, 0.25)
        held(a + 0.3, b, "violas", ch["pad"][1], 0.2, 0.3)

S.seed(20261114)
mix = S.room(S.render(notes, dur=DUR + 0.6), size=0.5, mix=0.22)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
sf.write(OUT, mix, SR)
json.dump({"dur": round(len(mix) / SR, 3), "notes": len(notes), "engine": "core/audio/sampler.py（Salamander Grand Piano V3 CC BY 3.0，VSCO 2 CE CC0）", "accents": acc},
          open(os.path.splitext(OUT)[0] + ".json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"原声配乐 → out/score-acoustic.wav {len(mix) / SR:.2f}s，{len(notes)} 个音，重音 {len(acc)} 个")
