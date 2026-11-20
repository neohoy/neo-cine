#!/usr/bin/env python3
"""游戏原声的节拍分析：剪辑卡在原声的拍点上（STYLE.md §7）。

    .venv/bin/python styles/game-launch/kit/tools/beats.py <工程> --scan           整条录像的声音每 20 秒估一次速度和拍点清晰度，挑一段配乐
    .venv/bin/python styles/game-launch/kit/tools/beats.py <工程>                  分析 game.json 里 audio 那一段 → data/beats.json，并和 bpm 网格对照
    .venv/bin/python styles/game-launch/kit/tools/beats.py <工程> --start 6:02 --dur 45   临时换一段试（不写文件，只打印）

声音从哪来：game.json 的 audio.from（sources 里的一段录像，用它自己的声音）或 audio.file（单独的原声文件），从 audio.start 截起。
算法改编自手账歌谣 kit/tools/analyze.py（同一个库）：起音包络（对数频谱的正向差分）→ 自相关估速度 → 动态规划找拍点
（Ellis 2007）→ 抛物线插值到亚帧 → 强拍取四种相位里低频起音最多的那个。只用 numpy、scipy 和 ffmpeg，不用 librosa、不用 HyperFrames。
和原版不同：速度先验的中心可调（--bpm，默认 120：游戏战斗、城镇曲常在 110–160），能扫整条录像；
最后把检测到的拍点和 game.json 的网格（第 0 秒起、每拍 60/bpm 秒）逐个比，打印最大偏差：
网格和拍点差超过半帧，说明 bpm 或起点不对——按打印的建议改 audio.start 或 audio.bpm。
"""
import argparse
import json
import os
import subprocess
import sys

import numpy as np
from scipy.ndimage import maximum_filter1d, uniform_filter1d

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from lib import load, resolve, tc, fmt_tc, die, need_ffmpeg  # noqa: E402

SR, HOP, NFFT = 22050, 256, 512
FPS = SR / HOP
LAT = 0.012          # 短窗的通量峰比波形上的起音早约 12 毫秒（手账歌谣对照波形实测）


def audio_path(cfg, P):
    a = cfg.get("audio") or {}
    if a.get("file"):
        return resolve(a["file"], P)
    src = (cfg.get("sources") or {}).get(a.get("from", ""))
    if not src:
        die("game.json 的 audio 要写 from（sources 里的一段录像）或 file（原声文件）")
    return resolve(src["file"], P)


def read(path_, start=0.0, dur=None):
    cmd = ["ffmpeg", "-v", "error", "-ss", f"{start:.3f}"] + (["-t", f"{dur:.3f}"] if dur else []) + \
          ["-i", path_, "-vn", "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"]
    raw = subprocess.run(cmd, capture_output=True).stdout
    if not raw:
        die(f"{path_} 里读不出声音（{start:.1f} 秒起）")
    return np.frombuffer(raw, np.float32).astype(np.float64)


def onset_env(y):
    win = np.hanning(NFFT)
    n = 1 + (len(y) - NFFT) // HOP
    idx = np.arange(NFFT)[None, :] + HOP * np.arange(n)[:, None]
    L = np.log1p(100 * np.abs(np.fft.rfft(y[idx] * win, axis=1)))
    D = np.vstack([np.zeros((1, L.shape[1])), np.maximum(L[1:] - L[:-1], 0)])
    o = D.sum(1)
    o = np.maximum(o - uniform_filter1d(o, int(FPS * 0.5)), 0)
    # 低频（< 150 Hz）单独一路，找强拍用
    NL = 2048
    nl = 1 + (len(y) - NL) // HOP
    SL = np.log1p(100 * np.abs(np.fft.rfft(y[np.arange(NL)[None, :] + HOP * np.arange(nl)[:, None]] * np.hanning(NL), axis=1)))
    DL = np.vstack([np.zeros((1, SL.shape[1])), np.maximum(SL[1:] - SL[:-1], 0)])
    low = DL[:, np.fft.rfftfreq(NL, 1 / SR) < 150].sum(1)
    low = np.concatenate([np.zeros((NL - NFFT) // 2 // HOP), low])[:len(o)]
    low = np.pad(low, (0, len(o) - len(low)))
    return o / (o.max() + 1e-9), low / (low.max() + 1e-9)


def tempo(onset, prior):
    ac = np.correlate(onset, onset, "full")[len(onset) - 1:]
    lags = np.arange(len(ac))
    bpm_of = lambda lag: 60 * FPS / np.maximum(lag, 1e-9)
    ok = (lags > 60 * FPS / 200) & (lags < 60 * FPS / 70)
    w = np.zeros_like(ac)
    w[ok] = np.exp(-0.5 * (np.log2(bpm_of(lags[ok]) / prior) / 0.9) ** 2)
    lag = int(np.argmax(ac * w))
    if 1 <= lag < len(ac) - 1:
        a, b, c = ac[lag - 1], ac[lag], ac[lag + 1]
        lagf = lag + 0.5 * (a - c) / (a - 2 * b + c + 1e-12)
    else:
        lagf = float(lag)
    clarity = float(ac[lag] / (ac[0] + 1e-9))      # 拍点清晰度：自相关峰和零延迟的比（0–1，越大越规整）
    return 60 * FPS / lagf, lagf, clarity


def track(onset, period, tight=100.0):
    N = len(onset)
    score, back = onset.copy(), np.full(N, -1)
    lo, hi = int(round(period / 2)), int(round(period * 2))
    for i in range(lo, N):
        j0, j1 = max(0, i - hi), i - lo
        if j1 <= j0:
            continue
        js = np.arange(j0, j1)
        cand = score[js] - tight * np.log((i - js) / period) ** 2
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
    return beats, [(refine(i) * HOP + NFFT / 2) / SR + LAT for i in beats]


def fit(onset, low, bpm0, dur):
    """网格对起音包络：速度在 bpm0 ±0.6% 里、相位在 ±半拍里，找网格上起音（低频加权）最强的那组。
    返回 (速度, 相位秒, 正拍得分, 错半拍得分)。得分是网格点上包络的平均值。"""
    sig = onset / (onset.max() + 1e-9) + 1.5 * low / (low.max() + 1e-9)
    sig = maximum_filter1d(sig, 3)                                  # 容忍 ±1 个分析帧（约 12 ms）的抖动
    ft = (np.arange(len(sig)) * HOP + NFFT / 2) / SR + LAT
    best = (-1, bpm0, 0.0)
    for bpm in bpm0 * (1 + np.linspace(-0.006, 0.006, 61)):
        B = 60 / bpm
        k = np.arange(0, int(dur / B))
        phis = np.arange(-B / 2, B / 2, 0.001)
        sc = np.interp(phis[:, None] + k[None, :] * B, ft, sig).mean(1)
        j = int(np.argmax(sc))
        if sc[j] > best[0]:
            best = (float(sc[j]), float(bpm), float(phis[j]))
    s_on, bpm, phi = best
    B = 60 / bpm
    k = np.arange(0, int(dur / B))
    s_off = float(np.interp(phi + B / 2 + k * B, ft, sig).mean())
    return bpm, phi, s_on, s_off


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("project")
    ap.add_argument("--scan", action="store_true", help="整条声音每 20 秒估一次速度")
    ap.add_argument("--start", help="临时换起点（时间码），只打印")
    ap.add_argument("--dur", type=float, help="分析多长（默认片长 + 2 秒，没有镜头时 40 秒）")
    ap.add_argument("--bpm", type=float, help="速度先验的中心（默认 game.json 的 audio.bpm，没有就 120）")
    a = ap.parse_args()
    need_ffmpeg()
    P, cfg = load(a.project)
    au = cfg.get("audio") or {}
    path_ = audio_path(cfg, P)
    if not os.path.exists(path_):
        die(f"声音文件不在：{path_}")
    prior = a.bpm or au.get("bpm") or 120

    if a.scan:
        y = read(path_)
        print(f"{os.path.basename(path_)}：{len(y) / SR:.1f} 秒。每 20 秒一段：速度 / 清晰度（0–1，越大拍子越规整）/ 响度")
        print("  起点        BPM   清晰度  响度 dBFS")
        for k in range(0, int(len(y) / SR) - 10, 20):
            seg = y[k * SR:(k + 20) * SR]
            if len(seg) < SR * 8:
                break
            o, _ = onset_env(seg)
            bpm, _, cl = tempo(o, prior)
            db = 20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-9)
            bar = "█" * int(cl * 20)
            print(f"  {fmt_tc(k):>9}  {bpm:6.1f}  {cl:5.2f}  {db:6.1f}  {bar}")
        print("挑清晰度高、速度合适、没有对白和大段界面音的一段，写进 game.json 的 audio.start 和 audio.bpm，再不带 --scan 跑一遍。")
        return

    start = tc(a.start) if a.start else tc(au.get("start", 0))
    dur = a.dur
    if not dur:
        try:
            sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
            from lib import plan
            dur = plan(cfg, P, need_media=False)["dur"] + 2 if cfg.get("shots") else 40
        except SystemExit:
            dur = 40
    y = read(path_, start, dur)
    onset, low = onset_env(y)
    bpm, period, cl = tempo(onset, prior)
    beats_i, beats_t = track(onset, period)
    phase = max(range(4), key=lambda p: sum(low[max(0, b - 1):b + 2].max() for b in beats_i[p::4]) + 0.5 * sum(onset[b] for b in beats_i[p::4]))
    down_t = beats_t[phase::4]
    print(f"{os.path.basename(path_)} {fmt_tc(start)} 起 {len(y) / SR:.1f} 秒：检测到 {bpm:.2f} BPM（清晰度 {cl:.2f}），{len(beats_t)} 拍")
    print("强拍（截段内的秒）:", " ".join(f"{t:.3f}" for t in down_t[:16]))

    grid_bpm = au.get("bpm")
    fps = int(cfg.get("fps", 30))
    half = 0.5 / fps
    report, fit_beats = {}, []
    if grid_bpm:
        # 直接拿网格去对起音包络（不靠上面的逐拍追踪：八分音符很密的曲子，追踪器会在正拍和反拍之间跳）。
        # 低频起音（底鼓）加权，正拍和反拍就分得开；速度在 ±0.6% 里细调，用整段一起拟合，漂移看得出来。
        bpm_f, phi, s_on, s_off = fit(onset, low, grid_bpm, len(y) / SR)
        B = 60 / grid_bpm
        Bf = 60 / bpm_f
        drift = (len(y) / SR) * (1 - grid_bpm / bpm_f) if bpm_f else 0
        print(f"网格拟合：{len(y) / SR:.0f} 秒里最合拍的是 {bpm_f:.2f} BPM，拍点在第 0 秒之后 {phi * 1000:+.1f} ms（半帧 = {half * 1000:.1f} ms）；"
              f"正拍得分 {s_on:.2f}，错半拍 {s_off:.2f}")
        ok = True
        if abs(phi) > half:
            ok = False
            print(f"  ⚠ 网格整体偏了 {phi * 1000:+.1f} ms：把 audio.start 改成 {fmt_tc(start + phi)}（让第 0 秒正好在拍上），再跑一遍")
        if abs(drift) > half and abs(bpm_f - grid_bpm) > 0.005:
            ok = False
            print(f"  ⚠ 按 {grid_bpm} BPM 走 {len(y) / SR:.0f} 秒会漂 {abs(drift) * 1000:.0f} ms：audio.bpm 改成 {bpm_f:.2f}")
        if s_on < s_off * 1.15:
            print("  ⚠ 正拍和错半拍的得分差不多：这段的拍子分不清正反（八分音符密、底鼓弱）。听一下切点，或者换一段拍子清楚的原声")
        if ok:
            print("  网格和原声对得上：切点都会落在拍上")
        errs = np.array([t - round(t / B) * B for t in beats_t])
        far = float(np.mean(np.abs(errs) > half)) if len(errs) else 0
        print(f"  （逐拍追踪的拍点对网格：中位 {np.median(errs) * 1000:+.1f} ms，{far * 100:.0f}% 超过半帧；追踪只作参考，以拟合为准）")
        fit_beats = [round(phi + k * Bf, 4) for k in range(int((len(y) / SR - phi) / Bf) + 1)]
        report = {"grid_bpm": grid_bpm, "fit_bpm": round(bpm_f, 3), "phase_ms": round(phi * 1000, 2), "on": round(s_on, 3), "off": round(s_off, 3)}
        first_down = min(down_t, key=lambda t: abs(t)) if down_t else 0
        if abs(first_down) > 2 * B / 3:
            print(f"  提示：追踪认为最近的强拍在截段内 {first_down:.3f} 秒（强拍判断不一定可靠，以听为准）")
    else:
        print(f"game.json 的 audio 里还没有 bpm：写 \"bpm\": {round(bpm, 2)}，起点挪到第一个强拍 {fmt_tc(start + down_t[0])}，再跑一遍核对")

    if a.start:
        return
    pk = (onset == maximum_filter1d(onset, 7)) & (onset > np.percentile(onset, 85))
    hits = [{"t": round((i * HOP + NFFT / 2) / SR + LAT, 3), "e": round(float(onset[i]), 2)} for i in np.nonzero(pk)[0]]
    out = {"source": os.path.basename(path_), "start": start, "dur": round(len(y) / SR, 3), "bpm": round(bpm, 3), "clarity": round(cl, 3),
           "beats": [round(t, 4) for t in beats_t], "downbeats": [round(t, 4) for t in down_t], "hits": hits, "grid": report,
           "fit_beats": fit_beats,
           "analyzer": "game-launch/kit/tools/beats.py（改编自 scrapbook-song/kit/tools/analyze.py）"}
    os.makedirs(os.path.join(P, "data"), exist_ok=True)
    json.dump(out, open(os.path.join(P, "data", "beats.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print("→ data/beats.json（mix.py 用它核对每个切点都落在原声的拍上）")


if __name__ == "__main__":
    main()
