#!/usr/bin/env python3
"""片子的声音 → <工程>/out/mix.wav（48 kHz 立体声，约 −14 LUFS）。

    .venv/bin/python styles/tech-launch/kit/tools/mix.py <工程>
先要有：events.json（node core/render/events.mjs <工程>）、out/score.wav 和 out/score.json（tools/score.mjs）、
out/sfx/*.wav（tools/sfx_synth.mjs）；有旁白时还有 voice/（tools/voice.py）。tools/make.sh 按这个顺序跑。

三层，全部从画面导出的事件来（window.EV → events.json），画面改了，声音跟着改：
  · 配乐：out/score.wav（或 promo.json 的 audio.music 指的文件，比如采样版 out/score-acoustic.wav、用户自己的曲子），
    整体先定到 −23 LUFS，乘 audio.music.volume（默认 0.9）；开头 0.06 秒防爆音，最后 0.8 秒淡出；
    有旁白的段落压到 audio.voice.duck 倍（默认 0.45），两句之间空当短于 duckHold 秒（默认 2）时保持压低。
  · 音效：每个 type 为 sfx 的事件放一声 out/sfx/<kind>.wav，音量 gain；align 为 peak 时把声音的峰值放在事件那一刻
    （风声、渐强、落定，会比画面先响起），onset 时把起音放在那一刻（点击、记号笔）。峰值和起音按 10 毫秒的包络量。
  · 旁白（可选）：voice/<id>.wav 放在它的 at 秒。
卡点核对（neo/audio/cues.py）：配乐自己的每个重音（切点低音、抬起和弦、角点高音、落版铃声，和配乐同名的 .json）都要落在
画面的同一个事件上，差半帧以上就停；音效直接取画面事件的时间，不会漂。
最后 neo/audio/master.py 用一个增益做到 −14 LUFS、只削峰，再检查 mux.sh 能不能线性处理。
"""
import json
import os
import sys

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.environ.get("LIB") or os.path.abspath(os.path.join(KIT, "..", "..", ".."))
sys.path.insert(0, LIB)
from neo.audio import cues as C, master as M  # noqa: E402

SR = M.SR
P = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else ".")
cfg = json.load(open(os.path.join(P, "promo.json"), encoding="utf-8"))
audio = cfg.get("audio") or {}
EVJ = json.load(open(os.path.join(P, "events.json"), encoding="utf-8"))
EV, DUR = EVJ["ev"], EVJ["dur"]
N = int(round(DUR * SR))
K = C.Cues(EV, fps=24)


def load(path, mono=False):
    x, sr = sf.read(path, always_2d=True, dtype="float64")
    if sr != SR:
        x = resample_poly(x, SR, sr, axis=0)
    if mono:
        return x.mean(1)
    return x if x.shape[1] == 2 else np.repeat(x[:, :1], 2, 1)


def put(buf, x, at, gain=1.0):
    i = int(round(at * SR))
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    a, b = max(0, i), min(len(buf), i + len(x))
    if b > a:
        buf[a:b] += x[a - i:b - i] * gain


# ---------------------------------------------------------------- 配乐
mus_cfg = audio.get("music") or {}
src = os.path.join(P, mus_cfg.get("src", "out/score.wav"))
if not os.path.exists(src):
    sys.exit(f"mix.py: 没有配乐 {os.path.relpath(src, P)}（先跑 tools/score.mjs，或者在 promo.json 的 audio.music.src 指向你的曲子）")
music = load(src)
start = float(mus_cfg.get("mediaStart", 0))
music = music[int(start * SR):][:N]
music = np.pad(music, ((0, N - len(music)), (0, 0)))
lu = M.lufs(music)
music *= 10 ** ((-23 - lu) / 20) * float(mus_cfg.get("volume", 0.9))
env = np.ones(N)
k = int(0.06 * SR); env[:k] = np.linspace(0, 1, k)
k = int(0.8 * SR); env[-k:] *= np.linspace(1, 0, k)

# ---------------------------------------------------------------- 旁白（可选）
voice = []
vdir = os.path.join(P, "voice")
vcfg = audio.get("voice") or {}
if os.path.exists(os.path.join(vdir, "lines.json")):
    for ln in json.load(open(os.path.join(vdir, "lines.json"), encoding="utf-8")):
        w = os.path.join(vdir, f"{ln['id']}.wav")
        if not os.path.exists(w):
            sys.exit(f"mix.py: 旁白 {ln['id']} 没有生成：先跑 tools/voice.py")
        x = load(w, mono=True)
        voice.append((ln["at"], x, float(ln.get("volume", vcfg.get("volume", 1.0)))))
if voice:
    duck, hold = float(vcfg.get("duck", 0.45)), float(vcfg.get("duckHold", 2.0))
    spans = []
    for at, x, _ in sorted(voice, key=lambda v: v[0]):
        e = at + len(x) / SR
        if spans and at - spans[-1][1] < hold:
            spans[-1][1] = e
        else:
            spans.append([at, e])
    t = np.arange(N) / SR
    d = np.ones(N)
    for a, b in spans:   # 前 0.15 秒压下去，后 0.3 秒回来
        d = np.minimum(d, np.interp(t, [a - 0.15, a, b, b + 0.3], [1, duck, duck, 1], left=1, right=1))
    env *= d
music *= env[:, None]
mix = music.copy()

# ---------------------------------------------------------------- 音效：画面事件驱动
SFX = {}


def landmarks(x):
    """10 毫秒 RMS 包络的峰值时刻和起音时刻（包络第一次超过峰值的 10%），秒。"""
    w = 480
    c = np.cumsum(np.r_[0, x * x])
    i = np.arange(len(x))
    a, b = np.maximum(0, i - w // 2), np.minimum(len(x), i + w // 2)
    e = np.sqrt((c[b] - c[a]) / np.maximum(1, b - a))
    pk = int(np.argmax(e))
    on = int(np.argmax(e > e[pk] * 0.1))
    return pk / SR, on / SR


n_sfx = 0
for e in K.events("sfx"):
    kind = e["kind"]
    if kind not in SFX:
        f = os.path.join(P, "out", "sfx", f"{kind}.wav")
        if not os.path.exists(f):
            sys.exit(f"mix.py: 没有音效 out/sfx/{kind}.wav：先跑 tools/sfx_synth.mjs")
        x = load(f, mono=True)
        SFX[kind] = (x, *landmarks(x))
    x, pk, on = SFX[kind]
    at = e["t"] - (on if e.get("align") == "onset" else pk)
    if at < 0:
        x, at = x[int(-at * SR):], 0.0
    put(mix, x, at, float(e.get("gain", 0.5)))
    n_sfx += 1
for at, x, g in voice:
    put(mix, x, at, g)

# ---------------------------------------------------------------- 卡点：配乐的重音落在画面的同一个事件上
sj = os.path.splitext(src)[0] + ".json"   # score.mjs / score_acoustic.py 写的重音表；用户自己的曲子没有这张表，不核对
if os.path.exists(sj):
    for a in json.load(open(sj, encoding="utf-8")).get("accents", []):
        K.on(a["type"], a["t"], i=a["i"])
K.events("shot")                          # 镜头结构：配乐（score.mjs）按它分段
for t in ("count",):                       # 计数到位：它的声音是同一时刻的那一声 tap（sfx 事件）
    if any(e["type"] == t for e in EV):
        K.events(t)
K.report() or sys.exit("mix.py: 配乐的重音没有落在画面事件上（见上表）：画面改过就重新跑 tools/score.mjs")

mix = M.master(mix)
os.makedirs(os.path.join(P, "out"), exist_ok=True)
path = os.path.join(P, "out", "mix.wav")
sf.write(path, mix.astype(np.float32), SR)
M.check(path) or sys.exit("mix.py: 这条混音到了 mux.sh 会被重新分配强弱（见上一行）")
print(f"mix → out/mix.wav {DUR:.2f} 秒：配乐 {os.path.relpath(src, P)}，音效 {n_sfx} 声，旁白 {len(voice)} 句")
