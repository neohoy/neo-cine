#!/usr/bin/env python3
"""拟人 MV 的混音（STYLE.md §7）：<工程>/events.json + data/lyrics.json + mv.json → <工程>/out/mix.wav（48 kHz 立体声，−14 LUFS）。

    .venv/bin/python styles/persona-pop/kit/tools/mix.py <工程>

两种工程：
  · 用户自己的歌（mv.json 的 "audio": "audio/song.mp3"）：歌原样当底，只叠画面的音效，音效压在人声之下（避开字头）。
  · 没有歌（示范片就是这种）：按 mv.json 的 sections 和 score 合成一首芯片流行伴奏（鼓、贝斯、十六分琶音、铺底），
    主旋律从画面的 syl 事件来：一个字一个音，强拍落在和弦音上，句尾回到根音；小克、扣扣各一种音色，合唱两种叠起来加三度和声。
    歌词没有人唱，旋律替它"唱"，卡拉 OK 的填色就跟着旋律走。
声音和画面是同一组事件（neo/audio/cues.py）：每种画面事件都有它的声音（下表），每个音效的时间都取自事件本身；
副歌第一下镲、尾声第一下重音写在音乐的网格上，用 K.on() 声明它属于哪个画面事件，K.report() 逐个核对（差半帧以上就停）。
freeze 事件（STYLE.md §6）：从它开始的 d 秒，伴奏整个抽掉，只留这段时间里画面上本来就有的音效——没有就是真静默。
"""
import json
import os
import sys

import numpy as np
import soundfile as sf

P = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else sys.exit(__doc__))
LIB = os.environ.get("LIB") or os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
sys.path.insert(0, LIB)
from core.audio import sfx as X  # noqa: E402
from neo.audio import cues as C  # noqa: E402
from neo.audio import master as M  # noqa: E402

SR = X.SR
cfg = json.load(open(os.path.join(P, "mv.json"), encoding="utf-8"))
EVJ = json.load(open(os.path.join(P, "events.json"), encoding="utf-8"))
DUR, EV = EVJ["dur"], EVJ["ev"]
K = C.Cues(EV, fps=cfg.get("fps", 30))
N = int(DUR * SR)
rng = np.random.default_rng(20261123)
BEAT = 60 / cfg.get("bpm", 120)
BAR = BEAT * 4
midi = lambda m: 440 * 2 ** ((m - 69) / 12)
tt = lambda d: np.arange(int(round(d * SR))) / SR
env = lambda d, a, r: np.minimum(1, tt(d) / max(a, 1e-4)) * np.exp(-tt(d) / max(r, 1e-4))


def osc(f, d, kind="saw", duty=0.3, det=0.0):
    ph = (f * (1 + det)) * tt(d)
    if kind == "saw": return 2 * (ph % 1) - 1
    if kind == "pulse": return np.where(ph % 1 < duty, 1.0, -1.0)
    if kind == "tri": return 2 * np.abs(2 * (ph % 1) - 1) - 1
    return np.sin(2 * np.pi * ph)


def stereo():
    return np.zeros((N, 2))


# 冻结窗口：这些时间里伴奏整个抽掉
FREEZE = [(e["t"], e["t"] + e.get("d", 0.5)) for e in K.events("freeze")] if any(e["type"] == "freeze" for e in EV) else []
def frozen(t): return any(a - 1e-6 <= t < b for a, b in FREEZE)


def gate(buf):
    """冻结窗口里把伴奏清零，前后各 10 ms 淡出淡入"""
    for a, b in FREEZE:
        i, j, f = int(a * SR), int(b * SR), int(0.01 * SR)
        buf[i - f:i] *= np.linspace(1, 0, f)[:, None]
        buf[i:j] = 0
        buf[j:j + f] *= np.linspace(0, 1, f)[:, None]
    return buf


music, lead, fx = stereo(), stereo(), stereo()
song = cfg.get("audio")
if song:
    # ---------- 用户的歌：原样当底 ----------
    x, sr = sf.read(os.path.join(P, song), always_2d=True)
    if sr != SR:
        from scipy.signal import resample_poly
        x = resample_poly(x, SR, sr, axis=0)
    t0 = cfg.get("audio_t0", 0)
    x = x[int(t0 * SR):int(t0 * SR) + N]
    music[:len(x)] = x[:, :2] if x.shape[1] > 1 else np.repeat(x, 2, axis=1)
else:
    # ---------- 伴奏 ----------
    sc = cfg["score"]
    def chords_of(sec):
        c = sc["chords"][sec]
        return sc["chords"][c] if isinstance(c, str) else c
    secs = cfg["sections"]
    kick = X.norm(np.sin(2 * np.pi * np.cumsum(50 + 110 * np.exp(-tt(0.3) * 30)) / SR) * env(0.3, 0.001, 0.12))
    snare = X.norm(X.hp(X.noise(0.22), 1200) * env(0.22, 0.001, 0.06) * 0.7 + np.sin(2 * np.pi * 190 * tt(0.22)) * env(0.22, 0.001, 0.04) * 0.5)
    hat = X.norm(X.hp(X.noise(0.05), 7000) * env(0.05, 0.0005, 0.012))
    duck = np.ones(N)
    for si, s in enumerate(secs):
        ch, kind = chords_of(s["id"]), sc["drums"][s["id"]]
        for b in range(s["bars"]):
            t0 = s["t"] + b * BAR
            chord = ch[b % len(ch)]
            last = si == len(secs) - 1 and b == s["bars"] - 1
            if kind in ("half", "full"):
                for q in range(4):
                    tq = t0 + q * BEAT
                    if kind == "full" or q in (0, 2):
                        X.add(music, kick, tq, 0.9)
                        i = int(tq * SR); d = env(0.25, 0.001, 0.08); duck[i:i + len(d)] *= 1 - 0.55 * d[: len(duck[i:i + len(d)])]
                    if q in (1, 3):
                        X.add(music, snare, tq, 0.55 if kind == "full" else 0.4)
                for e in range(8):
                    if kind == "full" or e % 2:
                        X.add(music, hat, t0 + e * BEAT / 2, 0.22 if e % 2 else 0.14, pan=0.3)
            if kind == "hit" and b == 0:
                X.add(music, kick, t0, 1.0)
            # 主歌最后一小节：军鼓滚奏推进副歌（冻结窗口里的会被抽掉）
            if s["id"] == "verse" and b == s["bars"] - 1:
                for k in range(8):
                    X.add(music, snare, t0 + BEAT * 2 + k * BEAT / 4, 0.12 + 0.03 * k)
            # 贝斯：八分音符根音，带二、三次谐波（小喇叭上也听得见，TECHNIQUE.md §5）
            if kind != "none":
                root = chord[0] - 12
                for e in range(1 if last else 8):
                    d = BAR if last else BEAT / 2 * 0.9
                    f = midi(root)
                    x = X.lp(osc(f, d, "saw") + 0.4 * osc(2 * f, d, "sine") + 0.2 * osc(3 * f, d, "sine"), 900) * env(d, 0.004, 0.9 if last else 0.18)
                    X.add(music, x, t0 + e * BEAT / 2, 0.16)
            # 琶音：十六分音符，芯片方波
            if not last:
                pat = [0, 1, 2, 1, 0, 2, 1, 2] * 2
                for k in range(16):
                    note = chord[pat[k]] + 24 + (12 if (kind == "full" and k % 4 == 3) else 0)
                    d = BEAT / 4
                    g = 0.045 if kind != "none" else 0.03 + 0.03 * (b * 16 + k) / (s["bars"] * 16)
                    X.add(music, osc(midi(note), d, "pulse") * env(d, 0.002, 0.06), t0 + k * d, g, pan=-0.25 if k % 2 else 0.25)
            # 铺底：副歌和尾声，最低音不低于 MIDI 48
            if kind in ("full", "hit"):
                d = BAR * (2.0 if last else 1.0)
                p = sum(osc(midi(max(48, m + 12)), d, "saw", det=dt) for m in chord for dt in (-0.004, 0.004))
                X.add(music, X.lp(p, 1800) * np.minimum(1, tt(d) / 0.15) * np.exp(-tt(d) / (1.2 if last else 3)), t0, 0.012)
    # 副歌前上扬噪声、副歌第一下镲（属于画面的冲击帧）、尾声第一下（属于切到尾声的那一刀）
    ch_t = next(s["t"] for s in secs if s["id"] == "chorus")
    X.add(music, X.hp(X.noise(BAR), 3000) * np.linspace(0, 1, int(round(BAR * SR))) ** 2, ch_t - BAR, 0.05)
    X.add(music, X.crash(0.5), K.on("impact", ch_t), 1.0)
    out_t = next(s["t"] for s in secs if s["id"] == "outro")
    X.add(music, kick, K.on("cut", out_t, part="s9-outro"), 1.0)
    music *= (0.6 + 0.4 * duck)[:, None]

    # ---------- 主旋律：一个字一个音 ----------
    L = json.load(open(os.path.join(P, "data", "lyrics.json"), encoding="utf-8"))
    nxt = {}
    for line in L["lines"]:
        for s in line["segs"]:
            ts = [c["t"] for c in s["chars"] if c["t"] is not None and c["c"] not in "，。！？、,.!? "]
            for i, t in enumerate(ts):
                nxt[(s["id"], round(t, 3))] = (ts[i + 1] - t) if i + 1 < len(ts) else 0.7
    SCALE = [0, 2, 4, 5, 7, 9, 11]
    def chord_at(t):
        s = [x for x in secs if x["t"] <= t + 1e-6][-1]
        ch = chords_of(s["id"])
        return ch[int((t - s["t"]) // BAR) % len(ch)]
    def nearest(target, pcs):
        cands = [m for m in range(55, 88) if m % 12 in pcs]
        return min(cands, key=lambda m: (abs(m - target), m))
    def voice(who, f, d, strong):
        if who == "klaude":   # 柔和的三角波加一点方波：小克
            x = 0.7 * osc(f, d, "tri") + 0.3 * osc(f, d, "pulse", 0.5)
            return X.lp(x, 3200) * env(d, 0.012, max(0.18, d * 0.6))
        x = osc(f, d, "pulse", 0.25)   # 扣扣：窄方波，起音快
        return X.lp(x, 4200) * env(d, 0.003, max(0.12, d * 0.45))
    seg_i = {}
    prev = 72
    for e in K.events("syl"):
        t, who = e["t"], e["who"]
        k = seg_i.setdefault(e["seg"], 0); seg_i[e["seg"]] += 1
        chord = chord_at(t)
        strong = abs((t / (BEAT / 2)) - round(t / (BEAT / 2))) < 1e-3 and round(t / (BEAT / 2)) % 2 == 0
        target = 72 + (3 if k == 1 else 5 if k in (2, 3) else 2 if k == 4 else 0) - (0 if k < 5 else 2)
        if e.get("end"):
            m = nearest(prev - 1, {chord[0] % 12})
        elif strong:
            m = nearest((target + prev) / 2, {c % 12 for c in chord})
        else:
            m = nearest((target + prev) / 2, set(SCALE))
        prev = m
        d = min(0.9, max(0.16, nxt.get((e["seg"], round(t, 3)), 0.25) * 0.92))
        if frozen(t):
            continue
        for w, g, pan, shift in (([("klaude", 0.32, -0.15, 0), ("kodex", 0.22, 0.15, -4)]) if who == "duet" else [(who, 0.32, -0.1 if who == "klaude" else 0.1, 0)]):
            mm = m + shift
            if shift and (mm % 12) not in set(SCALE):
                mm -= 1
            X.add(lead, voice(w, midi(mm), d, strong), t, g, pan=pan)
    # 一点房间感：几条短延迟
    for dly, g in ((0.031, 0.22), (0.047, 0.17), (0.073, 0.12)):
        i = int(dly * SR); lead[i:] += lead[:-i] * g

music = gate(music)
lead = gate(lead)

# ---------- 音效：每种画面事件一种声音，时间取自事件本身 ----------
def chime(v=1.0):
    d = 0.6
    return X.norm(osc(1318.5, d, "sine") + 0.4 * osc(2637, d, "sine")) * env(d, 0.002, 0.2) * v
def success(v=1.0):
    out = np.zeros(int(1.2 * SR))
    for k, m in enumerate((72, 76, 79, 84)):
        x = osc(midi(m), 0.7, "tri") * env(0.7, 0.002, 0.3); i = int(k * 0.07 * SR); out[i:i + len(x)] += x
    return X.norm(out) * v
def buzz(v=1.0):
    return X.norm(X.lp(osc(110, 0.22, "pulse", 0.5), 1500) * env(0.22, 0.002, 0.15)) * v
def typing(d, v=1.0):
    out = np.zeros(int((d + 0.1) * SR)); n = max(3, int(d / 0.09))
    for k in range(n):
        c = X.click(1.1 + 0.3 * rng.random(), 0.6 + 0.4 * rng.random()); i = int((k * d / n + rng.random() * 0.02) * SR); out[i:i + len(c)] += c[: len(out) - i]
    return X.norm(out) * v
def whir(d, v=1.0):
    x = X.bp(X.noise(d), 800, 5000) * np.linspace(0.2, 1, int(round(d * SR))) ** 2
    return X.norm(x) * v

SOUND = {   # 事件 → (声音, 增益, 声像, 提前量)。提前量让声音的最响处落在那一帧（嗖声的峰在中间）
    "cut": (lambda e: X.whoosh(0.3), 0.20, 0, 0.15),
    "whoosh": (lambda e: X.whoosh(0.4), 0.22, 0, 0.2),
    "pose": (lambda e: X.pop(), 0.10, 0, 0),
    "land": (lambda e: X.thump(1, 60), 0.55, 0, 0),
    "impact": (lambda e: X.thump(1, 55), 0.45, 0, 0),
    "emo": (lambda e: X.pop(), 0.12, 0.2, 0),
    "type": (lambda e: typing(e.get("d", 0.5)), 0.18, 0.1, 0),
    "tick": (lambda e: X.click(1.4), 0.16, 0.2, 0),
    "ding": (lambda e: X.ding(), 0.20, 0.1, 0),
    "thud": (lambda e: X.thump(1, 70), 0.40, 0, 0),
    "stamp": (lambda e: X.clack(0.7) * 0.6 + np.pad(X.thump(1, 80), (0, 0))[: len(X.clack(0.7))] * 0.6, 0.45, 0, 0),
    "clash": (lambda e: X.crash(), 0.30, 0, 0),
    "chime": (lambda e: chime(), 0.20, 0.15, 0),
    "success": (lambda e: success(), 0.22, 0, 0),
    "buzz": (lambda e: buzz(), 0.22, 0, 0),
    "lock": (lambda e: X.click(0.8), 0.30, 0, 0),
    "pop": (lambda e: X.pop(), 0.14, 0.2, 0),
    "whir": (lambda e: whir(e.get("d", 1.5)), 0.08, 0, 0),
    "slam": (lambda e: X.clack(0.9), 0.14, 0, 0),
}
types = sorted({e["type"] for e in EV} - {"syl", "freeze"})
missing = [t for t in types if t not in SOUND]
if missing:
    sys.exit(f"mix.py：这些画面事件还没有声音：{', '.join(missing)}（在 SOUND 表里加上，或者在画面上去掉）")
for t in types:
    fn, g, pan, pre = SOUND[t]
    for e in K.events(t):
        # 用户的歌：音效压低 6 dB，避开字头（人声优先）
        X.add(fx, fn(e), e["t"] - pre, g * (0.5 if song else 1.0), pan)
if not song:
    K.events("syl")   # 主旋律已经按它出声（上面），这里登记为"有声"

mix = music * (0.9 if song else 0.55) + lead * 0.9 + fx * 0.9
if not K.report():
    sys.exit("mix.py：音乐的重音和画面对不上（见上表）")
mix = M.master(mix)
os.makedirs(os.path.join(P, "out"), exist_ok=True)
path = os.path.join(P, "out", "mix.wav")
sf.write(path, mix.astype(np.float32), SR)
M.check(path) or sys.exit(1)
print("✓", os.path.relpath(path, P))
