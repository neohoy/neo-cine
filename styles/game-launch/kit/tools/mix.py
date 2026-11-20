#!/usr/bin/env python3
"""片子的声音 → <工程>/out/mix.wav（48 kHz 立体声）：游戏原声的一段，加几个代码合成的转场音效（STYLE.md §7）。

    .venv/bin/python styles/game-launch/kit/tools/mix.py <工程>     （先跑 build.py、core/render/events.mjs、beats.py）

- 原声：game.json 的 audio.from（sources 里一段录像的声音）或 audio.file，从 audio.start 截片长那么长；volume，fade [淡入, 淡出]；
- 音效：画面事件（events.json）里写了 sound 的，按名字合成，峰值或起音落在事件上：
    whoosh       0.55 秒的风声，峰值在切点（换场）
    whoosh-long  2 秒的长风声，峰值在切点（进战斗这种大换场）
    swish        短促的风声，峰值在推近的正中（推到 UI 上）
    pop          一声上扬的"啵"，起音在字幕牌擦开（那个真实数字出现）
    impact       低音冲击，起音在 Logo 落地
    thud         闷响，起音在片尾卡落定
    tick         轻点，起音在事件上（立绘、行动号召，想要的话）
  音效全部是 core/audio/sfx.py 现场合成的，没有录音素材；
- 卡点核对（neo/audio/cues.py）：每个切点、横幅落定、Logo 落地，都要落在原声的拍点上（data/beats.json 的 fit_beats：beats.py 拿网格对原声拟合出来的），
  超过半帧就停；
- neo/audio/master.py：一个增益定到 −14 LUFS，再检查 mux.sh 能不能线性处理。
"""
import json
import os
import subprocess
import sys

import numpy as np
import soundfile as sf

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, KIT)
from lib import LIB, load, resolve, tc, die  # noqa: E402
sys.path.insert(0, LIB)
from neo.audio import master as M, cues as C  # noqa: E402
from core.audio import sfx as X  # noqa: E402

SR = M.SR


def music(cfg, P, dur):
    a = cfg.get("audio") or {}
    if a.get("file"):
        f = resolve(a["file"], P)
    else:
        src = (cfg.get("sources") or {}).get(a.get("from", ""))
        if not src:
            die("game.json 的 audio 要写 from（sources 里的一段录像）或 file（原声文件）")
        f = resolve(src["file"], P)
    if not os.path.exists(f):
        die(f"原声不在：{f}")
    start = tc(a.get("start", 0))
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{start:.3f}", "-t", f"{dur:.3f}", "-i", f, "-vn",
                          "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], capture_output=True).stdout
    x = np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)
    N = int(round(dur * SR))
    if len(x) < N - SR // 100:
        die(f"原声从 {start:.2f} 秒起只有 {len(x) / SR:.2f} 秒，比片子（{dur:.2f} 秒）短：换个起点，或者片子短一点")
    x = np.pad(x, ((0, max(0, N - len(x))), (0, 0)))[:N] * float(a.get("volume", 1.0))
    fin, fout = a.get("fade", [0.15, 2.2])
    if fin > 0:
        k = int(fin * SR)
        x[:k] *= np.linspace(0, 1, k)[:, None]
    if fout > 0:
        k = int(fout * SR)
        x[-k:] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, k)))[:, None]
    return x


def impact():
    d = 1.6
    tt = X.t_(d)
    sub = np.sin(2 * np.pi * 46 * tt * (1 - .18 * tt)) * X.env_exp(d, .45)
    knock = X.lp(X.noise(d), 900) * X.env_exp(d, .05)
    body = np.sin(2 * np.pi * 92 * tt) * X.env_exp(d, .12) * .4
    return X.norm(sub + knock * .6 + body)


def long_whoosh(d=2.0):
    w = X.whoosh(d)
    tt = X.t_(d)
    env = np.where(tt < d / 2, 1.0, np.exp(-(tt - d / 2) / .35))          # 冲到切点，之后很快散掉
    return X.norm(w * env)


# 名字 → (合成函数, 增益, 峰值在声音里的位置：0 = 起音就是峰值)
SOUNDS = {
    "whoosh": (lambda: X.whoosh(.55), .4, .275),
    "whoosh-long": (lambda: long_whoosh(2.0), .5, 1.0),
    "swish": (lambda: X.whoosh(.32), .45, .16),
    "pop": (lambda: X.pop(), .55, 0.0),
    "impact": (impact, .3, 0.0),
    "thud": (lambda: X.thump(1.0, 62), .45, 0.0),
    "tick": (lambda: X.step(), .35, 0.0),
}


def main():
    P, cfg = load(sys.argv[1] if len(sys.argv) > 1 else ".")
    EVJ = json.load(open(os.path.join(P, "events.json"), encoding="utf-8"))
    EV, DUR = EVJ["ev"], EVJ["dur"]
    fps = int(cfg.get("fps", 30))
    x = music(cfg, P, DUR)

    K = C.Cues(EV, fps=fps)
    # ---------- 卡点：切点、横幅落定、落地，都在原声的拍上 ----------
    bf = os.path.join(P, "data", "beats.json")
    if (cfg.get("audio") or {}).get("bpm"):
        if not os.path.exists(bf):
            die("没有 data/beats.json：先跑 tools/beats.py（剪辑卡在原声的拍上，这里要核对）")
        B = json.load(open(bf, encoding="utf-8"))
        if abs(B["start"] - tc(cfg["audio"].get("start", 0))) > 1e-3:
            die("data/beats.json 不是这一段原声的（audio.start 改过）：再跑一遍 tools/beats.py")
        # 拍点：beats.py 拟合出来的网格（低频加权定正反拍，整段拟合速度）；老的 beats.json 没有它就用逐拍追踪的拍点
        beats = B.get("fit_beats") or B["beats"]
        for e in EV:
            if e["type"] in ("cut", "band", "land") and e["t"] > 0.05:
                b = min(beats, key=lambda v: abs(v - e["t"]))
                K.on(e["type"], b, id=e["id"])
    # ---------- 音效 ----------
    sfx = np.zeros_like(x)
    n = 0
    for e in K.each(*sorted({e["type"] for e in EV})):
        name = e.get("sound")
        if not name:
            continue
        if name not in SOUNDS:
            die(f"画面事件 {e['type']} {e.get('id')} 的 sound {name!r} 不认识：可选 {', '.join(SOUNDS)}")
        fn, gain, peak = SOUNDS[name]
        at = e["t"] + (e.get("d", 0) / 2 if name == "swish" else 0) - peak
        X.add(sfx, fn(), at, gain)
        n += 1
    ok = K.report()
    if not ok:
        sys.exit("mix.py: 画面上的切点没有落在原声的拍上（见上表）：核对 audio.start、audio.bpm（beats.py 会给建议）")
    mix = M.master(x + sfx)
    os.makedirs(os.path.join(P, "out"), exist_ok=True)
    path_ = os.path.join(P, "out", "mix.wav")
    sf.write(path_, mix.astype(np.float32), SR)
    M.check(path_) or sys.exit("mix.py: 这条混音到了 mux.sh 会被重新分配强弱（见上一行）")
    print(f"mix → out/mix.wav  {DUR:.2f} 秒，原声 + {n} 个音效")


if __name__ == "__main__":
    main()
