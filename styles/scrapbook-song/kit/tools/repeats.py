#!/usr/bin/env python3
"""找一段（比如最后一遍副歌）在歌里还在哪儿重复：音级（chroma）加频带包络的互相关。

    .venv/bin/python styles/scrapbook-song/kit/tools/repeats.py <工程> <参考段开始> <参考段结束> [--top 5]
打印最像的几个起点和时间差（参考段开始 − 匹配起点）。整段副歌的时间差都一样，说明为一遍副歌做的镜头可以搬到另一遍，
只改起止时间和歌词序号（镜头脚本带参数生成两个变体，见 ../../PRODUCTION.md）。得分 0.4 以上基本是同一段旋律，0.3 左右是相近的另一段。
只用 numpy 和 ffmpeg（不用 librosa）。时间是全曲时间。
来自《风吹新竹》MV 工程（原来用 librosa，这里改成 numpy）。
"""
import json
import os
import subprocess
import sys

import numpy as np

P = os.path.abspath(sys.argv[1])
r0, r1 = float(sys.argv[2]), float(sys.argv[3])
top = int(sys.argv[sys.argv.index("--top") + 1]) if "--top" in sys.argv else 5
cfg = json.load(open(os.path.join(P, "mv.json"), encoding="utf-8"))
t0 = float(cfg.get("audio_t0", 0.0))
SR, HOP, NF = 22050, 512, 4096
y = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(P, cfg["audio"]), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                                 capture_output=True, check=True).stdout, np.float32).astype(np.float64)
n = 1 + (len(y) - NF) // HOP
S = np.abs(np.fft.rfft(y[np.arange(NF)[None, :] + HOP * np.arange(n)[:, None]] * np.hanning(NF), axis=1)) ** 2
f = np.fft.rfftfreq(NF, 1 / SR)
fps = SR / HOP
# 音级：55–2000 Hz 的能量按半音折到 12 个音级
sel = (f >= 55) & (f <= 2000)
pc = (np.round(12 * np.log2(f[sel] / 440.0)) % 12).astype(int)
C = np.zeros((12, n))
for k in range(12):
    C[k] = S[:, sel][:, pc == k].sum(1)
C = np.log1p(C / (C.max() + 1e-12) * 1000)
# 频带包络：24 个对数间隔频带的对数能量（代替 MFCC 描述音色）
edges = np.geomspace(60, 8000, 25)
E = np.array([np.log1p(S[:, (f >= a) & (f < b)].sum(1)) for a, b in zip(edges[:-1], edges[1:])])
F = np.vstack([C, E])
F = (F - F.mean(axis=1, keepdims=True)) / (F.std(axis=1, keepdims=True) + 1e-9)
i0, i1 = int((r0 - t0) * fps), int((r1 - t0) * fps)
ref = F[:, i0:i1]
L = ref.shape[1]
scores = []
for i in range(0, F.shape[1] - L):
    t = i / fps + t0
    if abs(t - r0) < (r1 - r0) * 0.5:
        continue
    scores.append((float((F[:, i:i + L] * ref).mean()), t))
scores.sort(reverse=True)
picked = []
for sc, t in scores:
    if all(abs(t - u) > 3 for _, u in picked):
        picked.append((sc, t))
    if len(picked) >= top:
        break
print(f"参考段 {r0:.2f}–{r1:.2f}")
for sc, t in sorted(picked, key=lambda x: x[1]):
    print(f"  匹配起点 {t:8.3f}   时间差 {r0 - t:+8.3f}   得分 {sc:.3f}")
print("得分 0.4 以上基本是同一段旋律；0.3 左右是相近的另一段")
