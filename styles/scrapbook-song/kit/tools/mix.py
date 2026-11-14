#!/usr/bin/env python3
"""片子的声音 → 工程 out/mix.wav（48 kHz 立体声）：就是这首歌的这一段，不另加配乐和音效（STYLE.md §7）。

    .venv/bin/python styles/scrapbook-song/kit/tools/mix.py <工程>    （先跑 build.py 和 core/render/events.mjs）
- 按 scenes/manifest.json 的 t0、dur 从歌里截这一段（mv.json 的 audio；audio_t0 = 音频文件第 0 秒在全曲里是第几秒，
  音频是整首歌时为 0）；开头、结尾按 mv.json 的 fade [淡入, 淡出]（默认 [0.25, 2.6]，从全曲开头起的片子不淡入）；
- neo/audio/cues.py 核对画面上的每个重拍（events.json 里 type 为 hit 的：Scene.hit 登记的、mv.json 的 hits）都落在
  歌的拍点或鼓点上（audiomap.json 的 grid 和 events），超过半帧就停；
- neo/audio/master.py 一个增益定到 −14 LUFS，再检查 mux.sh 能不能线性处理。
"""
import json, os, subprocess, sys
import numpy as np, soundfile as sf
KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.environ.get('LIB') or os.path.abspath(os.path.join(KIT, '..', '..', '..'))
sys.path.insert(0, LIB)
from neo.audio import master as M, cues as C
SR = M.SR
P = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
cfg = json.load(open(os.path.join(P, 'mv.json'), encoding='utf-8'))
MAN = json.load(open(os.path.join(P, cfg.get('out_dir', 'scenes'), 'manifest.json'), encoding='utf-8'))
EVJ = json.load(open(os.path.join(P, 'events.json'), encoding='utf-8'))
EV, DUR, T0 = EVJ['ev'], EVJ['dur'], MAN['t0']
song = os.path.join(P, cfg['audio'])
off = T0 - float(cfg.get('audio_t0', 0.0))
if off < -1e-6:
    sys.exit(f'mix.py: 片子从全曲 {T0} 秒开始，音频文件从 {cfg.get("audio_t0")} 秒开始：音频不够')

raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{max(0, off):.3f}', '-t', f'{DUR:.3f}', '-i', song, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'],
                     capture_output=True, check=True).stdout
x = np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)
N = int(round(DUR * SR))
if len(x) < N - SR // 100:
    sys.exit(f'mix.py: 音频在全曲 {T0 + len(x) / SR:.2f} 秒就完了，比片子短')
x = np.pad(x, ((0, max(0, N - len(x))), (0, 0)))[:N]
fin, fout = cfg.get('fade', [0.25, 2.6])
if T0 > 0.05 and fin > 0:
    k = int(fin * SR); x[:k] *= np.linspace(0, 1, k)[:, None]
if fout > 0:
    k = int(fout * SR); x[-k:] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, k)))[:, None]

# ---------------------------------------------------------------- 画面重拍对歌
AM = json.load(open(os.path.join(P, cfg['audiomap']), encoding='utf-8'))
accents = sorted({round(e['t'] - T0, 3) for e in AM.get('events', []) if e.get('drum') in ('kick', 'snare') and e.get('energy', 0) >= .1}
                 | {round(b - T0, 3) for b in AM['grid']['beats_sec']})
K = C.Cues(EV, fps=24)
for t in ('line', 'cut'):
    if any(e['type'] == t for e in EV):
        K.events(t)                       # 每句开唱、镜头切点：声音就是歌本身，这里只登记
for h in [e for e in EV if e['type'] == 'hit']:
    K.on('hit', min(accents, key=lambda a: abs(a - h['t'])), id=h['id'])   # 这一下该落在的拍点或鼓点
K.report() or sys.exit('mix.py: 画面上的重拍没有落在歌的拍点或鼓点上（见上表）：改镜头脚本里的时间，或者核对 audiomap.json')

mix = M.master(x)
os.makedirs(os.path.join(P, 'out'), exist_ok=True)
path = os.path.join(P, 'out', 'mix.wav')
sf.write(path, mix.astype(np.float32), SR)
M.check(path) or sys.exit('mix.py: 这条混音到了 mux.sh 会被重新分配强弱（见上一行）')
print('mix →', os.path.relpath(path, P), f'{DUR:.2f} 秒')
