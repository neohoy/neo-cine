"""镜头脚本用的歌曲时间（全曲秒数）。

- 节拍网格、强拍、鼓点、能量段：工程的 audiomap.json（tools/analyze.py 写的）；
- 歌词：工程的 lyrics.json，[{"start": 秒, "end": 秒, "text": "…"}]，一句一条（tools/lyrics.py 从 LRC 读）。
来自《风吹新竹》MV 工程，格式不变。
"""
import json

from project import CONFIG, path

_AM = json.load(open(path(CONFIG["audiomap"]), encoding="utf-8"))
BEATS = _AM["grid"]["beats_sec"]
DOWNBEATS = _AM["grid"]["downbeats_sec"]
SONG = float(_AM["audio"]["duration_sec"])
EVENTS = _AM.get("events", [])
LYRICS = json.load(open(path(CONFIG["lyrics"]), encoding="utf-8"))


def line(i):
    return LYRICS[i]


def beats(t0, t1):
    return [b for b in BEATS if t0 - 1e-6 <= b < t1 - 1e-6]


def downbeats(t0, t1):
    return [b for b in DOWNBEATS if t0 - 1e-6 <= b < t1 - 1e-6]


def half_beats():
    out = []
    for a, b in zip(BEATS, BEATS[1:]):
        out += [a, (a + b) / 2]
    return out


def hits(t0, t1, drums=("kick", "snare"), min_energy=0.3):
    """[t0, t1) 里的强鼓点：换底色、砸字、盖章的候选时刻。"""
    return [e["t"] for e in EVENTS if t0 <= e["t"] < t1 and e.get("drum") in drums and e.get("energy", 0) >= min_energy]


def syllables(i, frac=0.72, lead=0.04):
    """一句里每个字出现的时间：均匀铺在演唱时长的前 frac，每个字比唱早 lead 秒。"""
    L = LYRICS[i]
    n = len(L["text"])
    span = (L["end"] - L["start"]) * frac
    return [round(L["start"] - lead + span * k / max(1, n - 1), 3) for k in range(n)]
