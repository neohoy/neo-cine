#!/usr/bin/env python3
"""歌的节拍和能量分析 → 工程的 data/audiomap.json，并打印一份段落概览（强拍、能量段、强鼓点）。

    .venv/bin/python styles/scrapbook-song/kit/tools/analyze.py <工程>          （库的根目录）

只用 numpy、scipy 和 ffmpeg（库的核心依赖），不用 librosa：
- 起音包络：对数幅度谱的正向差分（spectral flux），按频段分三路：低频（< 150 Hz，底鼓）、中频（150–5000 Hz，军鼓、人声）、
  高频（> 6000 Hz，镲）；
- 速度：起音包络的自相关，在 70–180 BPM 里挑，偏向 100 BPM 附近（对数正态权重）；
- 拍点：动态规划（Ellis 2007），每拍尽量落在起音峰上、拍距尽量等于速度；再用抛物线插值精确到亚帧，加 12 毫秒延迟校正。
  对《风吹新竹》实测：拍点和波形上的起音差 1 毫秒以内，强拍和 librosa 的分析全部一致；
- 强拍（每小节第一拍）：4/4，四种相位里低频起音加总最大的那个；
- 鼓点：起音包络的局部峰（时间和拍点一样校正过），按三个频段粗分成 kick / snare / hihat，强度 0–1；
  分类只是参考，挑重拍时以强度为主；
- 能量段：每 2 秒的响度按这首歌自己的分布分成 VOID / LOW / MID / HIGH / PEAK 五档，相邻同档合并（看段落用）。
输出格式和镜头脚本读的 music.py 一致：grid.beats_sec、grid.downbeats_sec、events[{t, drum, energy}]、energy_phases、
audio.duration_sec、tempo.bpm。自动分析总有误差：强拍的相位要对照歌词核一遍（tools/lyrics.py --show 会把每句和最近的强拍并排）。
"""
import json
import os
import subprocess
import sys

import numpy as np
from scipy.ndimage import maximum_filter1d, uniform_filter1d

P = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else ".")
cfg = json.load(open(os.path.join(P, "mv.json"), encoding="utf-8"))
SR, HOP, NFFT = 22050, 256, int(os.environ.get("AN_NFFT", 512))
FPS = SR / HOP

raw = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(P, cfg["audio"]), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                     capture_output=True, check=True).stdout
y = np.frombuffer(raw, np.float32).astype(np.float64)
dur = len(y) / SR
t0 = float(cfg.get("audio_t0", 0.0))          # 音频文件第 0 秒在全曲里是第几秒（片段文件时不为 0）

# ---------------------------------------------------------------- 频谱和起音包络
win = np.hanning(NFFT)
n = 1 + (len(y) - NFFT) // HOP
idx = np.arange(NFFT)[None, :] + HOP * np.arange(n)[:, None]
S = np.abs(np.fft.rfft(y[idx] * win, axis=1))
freqs = np.fft.rfftfreq(NFFT, 1 / SR)
L = np.log1p(100 * S)
D = np.maximum(L[1:] - L[:-1], 0)
D = np.vstack([np.zeros((1, D.shape[1])), D])
# 分频段用长窗（2048）的频谱：短窗里 150 Hz 以下只有两三个频点，分不清底鼓
NL = 2048
nl = 1 + (len(y) - NL) // HOP
SL = np.log1p(100 * np.abs(np.fft.rfft(y[np.arange(NL)[None, :] + HOP * np.arange(nl)[:, None]] * np.hanning(NL), axis=1)))
DL = np.vstack([np.zeros((1, SL.shape[1])), np.maximum(SL[1:] - SL[:-1], 0)])
fl = np.fft.rfftfreq(NL, 1 / SR)
bands = {"low": fl < 150, "mid": (fl >= 150) & (fl < 5000), "high": fl >= 6000}
B = {}
for k, m in bands.items():
    v = DL[:, m].sum(1)
    v = np.concatenate([np.zeros((NL - NFFT) // 2 // HOP), v])[:len(D)]     # 长窗帧中心对齐到短窗帧
    B[k] = np.pad(v, (0, len(D) - len(v))) / (np.percentile(v, 99) + 1e-9)
onset = D.sum(1)
onset = onset - uniform_filter1d(onset, int(FPS * 0.5))     # 去掉慢变化
onset = np.maximum(onset, 0)
onset /= onset.max() + 1e-9
LAT = float(os.environ.get("AN_LAT", 0.012))   # 短窗的通量峰比波形上的起音早约 12 毫秒（对照波形实测过）
ft = lambda i: (i * HOP + NFFT / 2) / SR + LAT                 # 帧号 → 秒（帧中心 + 起音延迟校正）

# ---------------------------------------------------------------- 速度
ac = np.correlate(onset, onset, "full")[len(onset) - 1:]
lags = np.arange(len(ac))
bpm_of = lambda lag: 60 * FPS / lag
ok = (lags > 60 * FPS / 180) & (lags < 60 * FPS / 70)
w = np.zeros_like(ac)
w[ok] = np.exp(-0.5 * (np.log2(bpm_of(lags[ok]) / 100) / 0.9) ** 2)
lag = int(np.argmax(ac * w))
if 1 <= lag < len(ac) - 1:                                     # 抛物线插值，精确到亚帧
    a, b, c = ac[lag - 1], ac[lag], ac[lag + 1]
    lagf = lag + 0.5 * (a - c) / (a - 2 * b + c + 1e-12)
else:
    lagf = float(lag)
BPM = bpm_of(lagf)
period = lagf

# ---------------------------------------------------------------- 拍点（动态规划）
TIGHT = float(os.environ.get("AN_TIGHT", 100))
N = len(onset)
score = onset.copy()
back = np.full(N, -1)
lo, hi = int(round(period / 2)), int(round(period * 2))
for i in range(lo, N):
    j0, j1 = max(0, i - hi), i - lo
    if j1 <= j0:
        continue
    js = np.arange(j0, j1)
    cand = score[js] - TIGHT * np.log((i - js) / period) ** 2
    k = int(np.argmax(cand))
    score[i] = onset[i] + cand[k]
    back[i] = js[k]
tail = np.arange(max(0, N - int(period * 2)), N)
i = int(tail[np.argmax(score[tail])])
beats = []
while i >= 0:
    beats.append(i)
    i = back[i]
beats = beats[::-1]


def refine(i):
    if 0 < i < N - 1:
        a, b, c = onset[i - 1], onset[i], onset[i + 1]
        den = a - 2 * b + c
        if den < 0:
            return i + float(np.clip(0.5 * (a - c) / den, -.5, .5))
    return float(i)


beat_t = [round(ft(refine(i)) + t0, 3) for i in beats]

# ---------------------------------------------------------------- 强拍：四种相位里低频起音最多的
low = B["low"] / (B["low"].max() + 1e-9)
phase = max(range(4), key=lambda p: sum(low[max(0, b - 1):b + 2].max() for b in beats[p::4]) + 0.5 * sum(onset[b] for b in beats[p::4]))
down_t = beat_t[phase::4]

# ---------------------------------------------------------------- 鼓点
pk = (onset == maximum_filter1d(onset, 7)) & (onset > np.percentile(onset, 85))
events = []
ref = np.percentile(onset[pk], 99) if pk.any() else 1
for i in np.nonzero(pk)[0]:
    sl = slice(max(0, i - 1), i + 2)
    sl = slice(max(0, i - 2), i + 4)
    lo_e, mid_e, hi_e = B["low"][sl].max(), B["mid"][sl].max(), B["high"][sl].max()
    drum = ("kick" if lo_e >= max(mid_e, hi_e) * 0.8 and lo_e > 0.25 else
            "hihat" if hi_e > max(lo_e, mid_e) * 1.5 and lo_e < 0.2 else "snare")   # 粗分：要找重拍按 energy 挑，别只信标签
    events.append({"t": round(ft(i) + t0, 3), "drum": drum, "energy": round(float(min(1, onset[i] / ref)), 2)})

# ---------------------------------------------------------------- 能量段
rms_w = int(SR * 2)
rms = np.array([np.sqrt(np.mean(y[k:k + rms_w] ** 2)) for k in range(0, len(y) - rms_w // 2, rms_w)])
db = 20 * np.log10(rms + 1e-9)
top = np.percentile(db, 95)
levels = ["VOID", "LOW", "MID", "HIGH", "PEAK"]
live = db[db > top - 30]
q = np.percentile(live, [15, 40, 75]) if len(live) else [top] * 3       # 按这首歌自己的响度分布分档（母带都很响，绝对值分不开）
phases = []
for k, v in enumerate(db):
    lv = "VOID" if v <= top - 30 else levels[1 + int(np.searchsorted(q, v))]
    a, b = round(k * 2.0 + t0, 2), round(min(dur, (k + 1) * 2.0) + t0, 2)
    if phases and phases[-1]["level"] == lv:
        phases[-1]["end"] = b
    else:
        phases.append({"start": a, "end": b, "level": lv, "energy": round(float(10 ** ((v - top) / 20)), 3)})

out = {
    "summary": f"{BPM:.1f} BPM · {len(beat_t)} 拍 / {len(down_t)} 小节 · {len(events)} 个鼓点 · {len(phases)} 个能量段 · {dur:.1f} 秒",
    "audio": {"path": cfg["audio"], "duration_sec": round(dur + t0, 3), "t0": t0},
    "tempo": {"bpm": round(BPM, 1), "beats_per_bar": 4},
    "grid": {"beats_sec": beat_t, "downbeats_sec": down_t},
    "events": events,
    "energy_phases": phases,
    "analyzer": "scrapbook-song/kit/tools/analyze.py (numpy + scipy)",
}
dst = os.path.join(P, cfg["audiomap"])
os.makedirs(os.path.dirname(dst), exist_ok=True)
json.dump(out, open(dst, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(out["summary"])
print("强拍:", " ".join(f"{t:.2f}" for t in down_t))
print("能量段:")
for ph in phases:
    print(f"  {ph['start']:7.1f}–{ph['end']:7.1f}  {ph['level']}")
hits = [e["t"] for e in events if e["drum"] in ("kick", "snare") and e["energy"] >= 0.4]
print("强鼓点:", " ".join(f"{t:.2f}" for t in hits[:80]))
print("→", os.path.relpath(dst, P))
