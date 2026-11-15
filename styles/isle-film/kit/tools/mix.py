#!/usr/bin/env python3
"""方寸影像的声音 → <工程>/out/mix.wav（48 kHz 立体声）。全部用 numpy 现场合成，不用任何录音、采样或现成音乐。

    .venv/bin/python styles/isle-film/kit/tools/mix.py <工程>        先导出画面事件：node core/render/events.mjs <工程>

声音的时刻都取自画面事件（events.json，由 page/plan.js 算出）：
  · 环境底子（每 0.25 秒一条 air 事件）：风、雪、鸟、水。镜头在玻璃外面时这些声音被闷住（低通很低、很轻），
    穿过玻璃（glass 事件）那一下声音“打开”，镜头越近越清楚；入夜鸟声停。用哪几种、多大，写在 film.json 的 sound.beds 里。
  · 一天的钟点：时辰每跨过一个整点（chime 事件）一声很轻的钟；快进时一秒好几声，越密越轻。
  · 穿过玻璃：一道玻璃的细响和一阵气流。外观切换（swap）：一声玻璃的轻叩。
  · 奇事（wonder 事件，或 sound.music.drop 指定的事件类型）：前面 0.6 秒几乎安静，一团高处的玻璃钟和一阵上扬，配乐在这一刻落下。
  · 配乐：sound.music.key 定调。奇事之前只有一层很淡的长音和偶尔一颗钟片音；奇事那一刻低音和完整的和弦进来，
    钟片按五声音阶慢慢走；片尾卡回到主和弦，响到底。
neo/audio/cues.py 读事件并核对（每个声音都从事件取时刻，report() 列出来），neo/audio/master.py 定到 −14 LUFS 并检查。

film.json 里的 sound（都可以不写）：
  "sound": { "beds": { "wind": 0.8, "snow": 0.5, "birds": "crow" | "song" | null, "water": 0.0 },
             "music": { "key": "D", "bpm": 80, "level": 1.0, "drop": "wonder" }, "chimes": 1.0 }
"""
import json
import math
import os
import sys

import numpy as np
import soundfile as sf
from scipy.signal import fftconvolve

P = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else ".")
LIB = os.environ.get("LIB") or os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
sys.path.insert(0, LIB)
from core.audio import sfx as X  # noqa: E402
from neo.audio import cues as C, master as M  # noqa: E402

SR = X.SR
cfg = json.load(open(os.path.join(P, "film.json"), encoding="utf-8"))
EVJ = json.load(open(os.path.join(P, "events.json"), encoding="utf-8"))
EV, DUR = EVJ["ev"], EVJ["dur"]
K = C.Cues(EV, fps=cfg.get("fps", 24))
snd = cfg.get("sound") or {}
beds = {"wind": 0.8, "snow": 0.0, "birds": None, "water": 0.0, **(snd.get("beds") or {})}
mus_cfg = {"key": "D", "level": 1.0, "drop": "wonder", **(snd.get("music") or {})}
N = int((DUR + 0.5) * SR)
rng = np.random.default_rng(int(cfg.get("seed", 2611)))
tt = X.t_
NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
ROOT = 48 + NOTE[mus_cfg["key"][0]] + (1 if "#" in mus_cfg["key"] else 0) - (1 if "b" in mus_cfg["key"][1:] else 0)
hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)
amb = np.zeros((N, 2), np.float32); fx = np.zeros((N, 2), np.float32); mus = np.zeros((N, 2), np.float32); rev = np.zeros((N, 2), np.float32)


def put(buf, x, at, gain=1.0, pan=0.0):
    i = int(round(at * SR))
    if i >= N or gain <= 0:
        return
    if i < 0:
        x, i = x[-i:], 0
    x = x[:N - i]
    l, r = math.cos((pan + 1) * math.pi / 4), math.sin((pan + 1) * math.pi / 4)
    buf[i:i + len(x), 0] += x * gain * l * 1.414
    buf[i:i + len(x), 1] += x * gain * r * 1.414


# ———————————————————— 画面给的包络：在不在玻璃里、多近、多黑、多夜 ————————————————————
air = K.events("air")
at = np.array([e["t"] for e in air])
ts = np.arange(N) / SR
def curve(key, f=float, smooth_s=0.35):
    y = np.interp(ts, at, np.array([f(e[key]) for e in air]))
    k = int(smooth_s * SR) | 1
    if k > 1:
        pad = np.pad(y, (k // 2, k // 2), mode="edge")
        y = np.convolve(pad, np.ones(k) / k, mode="valid")[:N]
    return y.astype(np.float32)
inside, near, night, black = curve("inside", lambda v: 1.0 if v else 0.0, 0.5), curve("near"), curve("night"), curve("black", float, 0.1)
openv = np.clip(0.75 * inside + 0.35 * near, 0, 1)              # 声音“打开”的程度
alive = (1 - black * 0.85)


def lp_var(x, lo, hi, env):
    """随包络变的低通：把信号分成几段固定低通的版本，按包络插值（便宜、平滑）"""
    cuts = np.geomspace(lo, hi, 5)
    vers = [X.lp(x, c) for c in cuts]
    pos = env * (len(cuts) - 1)
    out = np.zeros_like(x)
    for i in range(len(cuts)):
        w = np.clip(1 - np.abs(pos - i), 0, 1)
        out += vers[i] * w
    return out


# ———————————————————— 环境底子 ————————————————————
if beds.get("wind"):
    g = float(beds["wind"])
    for c, ph in ((0, 0.0), (1, 1.7)):
        base = X.brown(DUR + 0.6)[:N]
        base = base / (np.abs(base).max() + 1e-9)
        gust = 0.55 + 0.45 * np.sin(2 * np.pi * ts * 0.11 + ph) * np.sin(2 * np.pi * ts * 0.043 + 2 * ph)
        w = lp_var(base, 180, 1600, openv) * gust * (0.25 + 0.75 * openv) * (1 - 0.35 * night) * alive
        amb[:, c] += (w * 0.20 * g).astype(np.float32)
if beds.get("snow"):
    g = float(beds["snow"])
    hiss = X.bp(X.noise(DUR + 0.5)[:N], 3500, 9000)
    hiss = hiss / (np.abs(hiss).max() + 1e-9)
    tick = np.zeros(N, np.float32)
    for _ in range(int(DUR * 22)):                                # 雪粒落下的极细碎响
        i = rng.integers(0, N - 400); tick[i:i + 300] += (rng.standard_normal(300) * np.exp(-np.arange(300) / 40)).astype(np.float32) * rng.uniform(0.2, 1)
    tick = X.hp(tick, 5000)
    s = (hiss * 0.5 + tick * 0.35) * openv ** 1.5 * near * alive
    amb[:, 0] += (s * 0.035 * g).astype(np.float32); amb[:, 1] += (np.roll(s, 211) * 0.035 * g).astype(np.float32)
if beds.get("water"):
    g = float(beds["water"])
    wv = X.bp(X.noise(DUR + 0.5)[:N], 300, 2600)
    for _ in range(int(DUR * 14)):                                # 水泡
        t0 = rng.uniform(0, DUR); f = rng.uniform(500, 1400); d = 0.05; x = tt(d)
        put(amb, (np.sin(2 * np.pi * (f + 1800 * x) * x) * np.exp(-x / 0.015) * 0.3).astype(np.float32), t0, 1, rng.uniform(-.6, .6))
    w = wv / (np.abs(wv).max() + 1e-9) * openv * (0.3 + 0.7 * near) * alive
    amb[:, 0] += (w * 0.08 * g).astype(np.float32); amb[:, 1] += (np.roll(w, 97) * 0.08 * g).astype(np.float32)
bird_n = 0
if beds.get("birds"):
    kind = beds["birds"]; t0 = 1.0
    while t0 < DUR - 1:
        t0 += rng.uniform(2.6, 5.5)
        i = min(int(t0 * SR), N - 1)
        if openv[i] < 0.5 or night[i] > 0.3 or black[i] > 0.2:
            continue
        pan, gain = rng.uniform(-.7, .7), 0.10 * float(openv[i]) * (0.5 + 0.5 * float(near[i]))
        for k in range(int(rng.integers(1, 4))):
            if kind == "crow":                                    # 寒鸦：粗糙的“啊”，蜂鸣源过两个共振峰
                d = rng.uniform(0.22, 0.32); x = tt(d); f0 = rng.uniform(330, 420) * (1 - 0.15 * x / d)
                src = np.sign(np.sin(2 * np.pi * np.cumsum(f0) / SR)) + 0.4 * rng.standard_normal(len(x))
                y = X.bp(src, 900, 1500) + 0.6 * X.bp(src, 2100, 2900)
                y *= np.clip(x / 0.02, 0, 1) * np.exp(-x / (d * 0.55))
            else:                                                 # 小鸟：上下滑的短鸣
                d = rng.uniform(0.08, 0.16); x = tt(d); f = rng.uniform(2800, 4200) * (1 + 0.25 * np.sin(2 * np.pi * x / d))
                y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * x / d)
            y = y / (np.abs(y).max() + 1e-9)
            put(amb, y.astype(np.float32), t0 + k * rng.uniform(0.35, 0.55), gain, pan); bird_n += 1

# ———————————————————— 钟、玻璃、奇事 ————————————————————
def bell(f, d=3.0, bright=1.0):
    x = tt(d); idx = 2.2 * bright * np.exp(-x / 0.25) + 0.3
    y = np.sin(2 * np.pi * f * x + idx * np.sin(2 * np.pi * f * 2.76 * x)) * np.exp(-x / (d * 0.32))
    y += 0.25 * np.sin(2 * np.pi * f * 4.07 * x) * np.exp(-x / 0.3)
    y[:96] *= np.linspace(0, 1, 96)
    return (y / (np.abs(y).max() + 1e-9)).astype(np.float32)

PENTA = [0, 2, 4, 7, 9]
chimes = K.events("chime") if any(e["type"] == "chime" for e in EV) else []
cg = float(snd.get("chimes", 1.0))
for e in chimes:                                                  # 一天的钟点：白天高一点亮一点，夜里低、暗
    deg = PENTA[e["hour"] % 5]; oct_ = 24 if e["night"] < 0.5 else 12
    g = 0.11 * cg / max(1.0, e.get("rate", 0.3) * 1.5) ** 0.5
    y = bell(hz(ROOT + oct_ + deg), 3.2, 1.0 - 0.5 * e["night"])
    put(fx, y, e["t"], g, 0.25 if e["hour"] % 2 else -0.25); put(rev, y, e["t"], g * 0.8)
for e in (K.events("glass") if any(x["type"] == "glass" for x in EV) else []):
    d = 1.6; x = tt(d)                                            # 穿过玻璃：一阵气流 + 一道高处的玻璃细响
    sweep = X.bp(X.noise(d), 1500, 7000) * np.sin(np.pi * x / d) ** 2
    ring = sum(np.sin(2 * np.pi * f * x) * np.exp(-x / 0.5) for f in (hz(ROOT + 43), hz(ROOT + 50), hz(ROOT + 55))) / 3
    y = (0.5 * sweep / (np.abs(sweep).max() + 1e-9) + 0.5 * ring).astype(np.float32)
    put(fx, y, e["t"] - 0.6, 0.09, 0.0); put(rev, y, e["t"] - 0.6, 0.12)
for e in (K.events("swap") if any(x["type"] == "swap" for x in EV) else []):
    y = bell(hz(ROOT + 31), 2.2, 1.4); put(fx, y, e["t"], 0.10, 0.3); put(rev, y, e["t"], 0.12)

drop_type = mus_cfg["drop"]
BEAT = 60.0 / float(mus_cfg.get("bpm", 80))                       # 配乐的拍子：奇事要落在拍子上（镜头表里把奇事的时刻放在整拍上）
t_drop = None
if any(e["type"] == drop_type for e in EV):
    t_drop = K.on(drop_type, round(K.at(drop_type) / BEAT) * BEAT)   # 写在拍子上的重音，report() 核对它和画面差多少
if t_drop is not None:                                            # 奇事：上扬进入，一团高处的玻璃钟
    d = 1.8; x = tt(d)
    rise = X.bp(X.noise(d), 2000, 8000) * (x / d) ** 3
    put(fx, (rise / (np.abs(rise).max() + 1e-9)).astype(np.float32), t_drop - d, 0.07, 0.0)
    for k, deg in enumerate([12, 16, 19, 24, 28]):
        y = bell(hz(ROOT + 36 + deg), 4.5, 0.7)
        put(mus, y, t_drop + k * 0.09, 0.06, -0.5 + 0.25 * k); put(rev, y, t_drop + k * 0.09, 0.09)

# ———————————————————— 配乐 ————————————————————
def pad(notes, t0, t1, gain, att=1.6, rel=2.2):
    d = t1 - t0 + rel; x = tt(d)
    env = np.clip(x / att, 0, 1) * np.clip((t1 - t0 + rel - x) / rel, 0, 1)
    y = np.zeros(len(x))
    for m in notes:
        f = hz(m)
        for det in (-0.12, 0.0, 0.11):                            # 三个略微走音的正弦和一点三角波：软的长音
            ff = f * 2 ** (det / 12)
            y += np.sin(2 * np.pi * ff * x + 0.3 * np.sin(2 * np.pi * 0.17 * x)) + 0.12 * (2 / np.pi) * np.arcsin(np.sin(2 * np.pi * ff * 2 * x))
    y = X.lp(y, 2400) * env / (len(notes) * 3)
    put(mus, y.astype(np.float32), t0, gain, 0.0); put(rev, y.astype(np.float32), t0, gain * 0.5)

lvl = float(mus_cfg["level"])
I = [ROOT + 12, ROOT + 19, ROOT + 26, ROOT + 28]                 # 主和弦（加九）
VI = [ROOT + 9, ROOT + 16, ROOT + 21, ROOT + 26]
IV = [ROOT + 5, ROOT + 12, ROOT + 19, ROOT + 26]
if any(e["type"] == "endcard" for e in EV):
    end_t = K.at("endcard")
elif any(e["type"] == "fade" for e in EV):                       # 片尾卡没有字（用户的片子默认如此）：主和弦落在镜头结束、黑场开始的地方
    f = K.events("fade")[0]; end_t = f["t"] + f.get("d", 0)
else:
    end_t = DUR - 3
pre_end = (t_drop - 0.6) if t_drop is not None else end_t
pad(I, 0.0, max(1.0, pre_end - 1.2), 0.32 * lvl, att=3.0, rel=1.4)
tb = 2.5
while tb < pre_end - 1.5:                                         # 奇事之前：偶尔一颗钟片音
    y = bell(hz(ROOT + 24 + PENTA[int(rng.integers(0, 5))]), 3.0, 0.6)
    put(mus, y, tb, 0.035 * lvl, rng.uniform(-.5, .5)); put(rev, y, tb, 0.05 * lvl)
    tb += rng.uniform(3.2, 4.6)
if t_drop is not None:                                            # 配乐落下：低音、完整和弦、钟片慢慢走
    span = max(2.0, end_t - t_drop)
    a, b = t_drop, t_drop + span * 0.5
    pad(VI + [ROOT - 3], a, b, 0.5 * lvl, att=0.04, rel=1.2)
    pad(IV + [ROOT - 7], b, end_t + 0.3, 0.46 * lvl, att=0.8, rel=1.2)
    bass = np.sin(2 * np.pi * hz(ROOT - 15) * tt(span)) * np.exp(-tt(span) / (span * 0.6))
    put(mus, (X.lp(bass, 300) * 0.9).astype(np.float32), a, 0.30 * lvl, 0)
    steps = [12, 14, 16, 19, 21, 19, 16, 14, 12, 7, 9, 12]
    for k, tb in enumerate(np.arange(t_drop + BEAT, end_t - 0.4, BEAT)):
        y = bell(hz(ROOT + 24 + steps[k % len(steps)]), 2.6, 0.55)
        put(mus, y, tb, 0.05 * lvl, -0.4 + 0.8 * ((k * 0.37) % 1)); put(rev, y, tb, 0.06 * lvl)
pad(I + [ROOT], end_t, DUR - 0.3, 0.42 * lvl, att=0.6, rel=0.3)  # 片尾卡回到主和弦，响到底
put(mus, bell(hz(ROOT + 24), 4.0, 0.5), end_t, 0.06 * lvl, 0)

if not K.report():
    sys.exit("mix.py：声音没有落在画面事件上（见上表）")

# ———————————————————— 混响、总线、母带 ————————————————————
ir = rng.standard_normal(int(3.2 * SR)) * np.exp(-np.arange(int(3.2 * SR)) / (0.9 * SR)); ir = X.lp(X.hp(ir, 300), 6000)
wet = np.stack([fftconvolve(rev[:, c], np.roll(ir, c * 331))[:N] for c in (0, 1)], 1).astype(np.float32) * 0.009
rms = lambda x: 20 * math.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
print(f"各路电平 dB：环境 {rms(amb * 3.2):.1f}  音效 {rms(fx * 1.6):.1f}  配乐 {rms(mus):.1f}  混响 {rms(wet):.1f}；鸟鸣 {bird_n} 声，整点 {len(chimes)} 声")
mix = amb * 3.2 + fx * 1.6 + mus + wet
g = np.ones(N, np.float32)
if t_drop is not None:                                            # 奇事前 0.6 秒几乎安静
    ia, ib, f = int((t_drop - 0.6) * SR), int(t_drop * SR), int(0.3 * SR)
    g[ia:ib] = 0.3; g[max(0, ia - f):ia] = np.linspace(1, 0.3, ia - max(0, ia - f)); g[ib:ib + 120] = np.linspace(0.3, 1, 120)
mix *= g[:, None]
n0 = int(DUR * SR); fo = int(0.8 * SR); mix = mix[:n0]; mix[n0 - fo:] *= np.linspace(1, 0, fo)[:, None]
mix = M.master(mix)
os.makedirs(os.path.join(P, "out"), exist_ok=True)
out = os.path.join(P, "out", "mix.wav")
sf.write(out, mix.astype(np.float32), SR)
print("每 2 秒的电平 dB：" + " ".join(f"{rms(mix[int(a * SR):int((a + 2) * SR)]):.0f}" for a in range(0, int(DUR), 2)))
M.check(out) or sys.exit("mix.py：这条混音到了 mux.sh 会被重新分配强弱（见上一行），先把峰值或动态范围收住")
print("done:", out)
