"""配乐 + 拟音 → out/mix.wav（48 kHz 立体声）。全部用 numpy 合成，不用任何录音或采样。
配乐：80 BPM，F 利底亚，原创。软槌颤音琴（带马达颤音）、毛毡槌木琴的短音、带二三次谐波的正弦低音、一层气声的长音。
      周四的琶音按"还亮着的线"的条数配声部：末班车每到一条线的终点，琶音就少一个声部（画面驱动）；
      周五的同一时段声部不减。一天过去时一道上行的滑奏；结论落在最重的和弦上。
拟音：读 events.json（画面导出的 window.EV）：拉线的"嘶"（滤波噪声扫频），站孔打出来的毛毡轻点（每条线一组音高），
      换乘点低一点的一下，线收紧时的一声"嗒"，列车靠站的轻点（钟慢的时候才有，越密越轻，声像按画面位置）。
环境：夜里城市的空气声，很轻；天亮时亮一点。
运行（在库的根目录）：.venv/bin/python styles/flat-metro/demo/mix.py；build.sh 会先导出 events.json 再跑它"""
import os, sys, json, math
import numpy as np, soundfile as sf
from scipy.signal import fftconvolve
D = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get('LIB') or os.path.abspath(os.path.join(D, '..', '..', '..'))
sys.path.insert(0, LIB)
from core.audio import sfx as X
from neo.audio import master as M, cues as C
SR = X.SR
EVJ = json.load(open(os.path.join(D, 'events.json'), encoding='utf-8'))
EV, DUR = EVJ['ev'], EVJ['dur']
K = C.Cues(EV, fps=24)
N = int((DUR + .5) * SR)
rng = np.random.default_rng(7)
mus = np.zeros((N, 2), np.float32); rev = np.zeros((N, 2), np.float32); fx = np.zeros((N, 2), np.float32); amb = np.zeros((N, 2), np.float32)
tt = X.t_
NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
midi = lambda p: p if isinstance(p, (int, float)) else 12 * (int(p[-1]) + 1) + NOTE[p[0]] + (1 if '#' in p else 0) - (1 if 'b' in p[1:-1] else 0)
hz = lambda p: 440.0 * 2 ** ((midi(p) - 69) / 12)
BEAT = 60 / 80; BAR = 4 * BEAT
bar = lambda n, b=0: n * BAR + b * BEAT                             # 和 timeline.js 的 bar() 一样


def put(buf, x, at, gain=1.0, pan=0.0):
    i = int(round(at * SR))
    if i >= N or i < 0 or gain == 0: return
    x = x[:N - i]; l = math.cos((pan + 1) * math.pi / 4); r = math.sin((pan + 1) * math.pi / 4)
    buf[i:i + len(x), 0] += x * gain * l * 1.414; buf[i:i + len(x), 1] += x * gain * r * 1.414
def both(x, at, gain, pan=0.0, wet=.4):
    put(mus, x, at, gain, pan); put(rev, x, at, gain * wet, pan)


# ———— 乐器（全部合成） ————
_c = {}
def vib(p, d=2.6, v=.7):
    """软槌颤音琴：基音 + 约 4 倍、10 倍的泛音（很快衰减），马达颤音 5.6 Hz，软槌的一点噪声音头"""
    k = ('v', p, d, round(v, 2))
    if k in _c: return _c[k]
    t = tt(d); f = hz(p)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t / 1.6) + .28 * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t / .35) + .08 * np.sin(2 * np.pi * f * 9.8 * t) * np.exp(-t / .08)
    y *= 1 - .22 * (.5 + .5 * np.sin(2 * np.pi * 5.6 * t))
    y += X.lp(X.noise(d), 2500) * np.exp(-t / .006) * .15
    y *= np.clip((d - t) / .3, 0, 1) * np.clip(t / .004, 0, 1)
    _c[k] = y * .22 * v; return _c[k]
def felt(p, v=.7):
    """毛毡槌木琴：短、闷，木头的一下"""
    k = ('f', p, round(v, 2))
    if k in _c: return _c[k]
    d = .45; t = tt(d); f = hz(p)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t / .12) + .35 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t / .03)
    y = X.lp(y + X.lp(X.noise(d), 1800) * np.exp(-t / .004) * .3, 3500) * np.clip(t / .002, 0, 1)
    _c[k] = y * .3 * v; return _c[k]
def bass(p, d=2.4, v=.8):
    t = tt(d); f = hz(p); ph = 2 * np.pi * f * t
    y = (np.sin(ph) + .32 * np.sin(2 * ph) + .14 * np.sin(3 * ph)) * np.exp(-t / 1.8) * np.clip(t / .015, 0, 1) * np.clip((d - t) / .25, 0, 1)
    return y * .32 * v
def air_pad(p, d, v=.5):
    """气声长音：三个略微失谐的正弦 + 一点带通的气声，音头很慢"""
    t = tt(d); f = hz(p)
    y = sum(np.sin(2 * np.pi * f * (1 + dd) * t + ph) for dd, ph in ((0, 0), (.0035, 1.1), (-.003, 2.3))) / 3
    y += X.bp(X.noise(d), f * .9, f * 2.4) * .25
    return y * np.clip(t / 1.2, 0, 1) ** 1.5 * np.clip((d - t) / 1.5, 0, 1) * .12 * v
def brush(v=1.0):
    d = .18; t = tt(d); return X.bp(X.noise(d), 3500, 11000) * np.exp(-t / .045) * .1 * v
def zip_(d, v=1.0, up=True):
    """拉线：滤波噪声的扫频，起头轻、中段满、尾巴收"""
    t = tt(d); x = X.noise(d); f0, f1 = (500, 3200) if up else (3200, 500)
    y = np.zeros_like(x); n = 12
    for i in range(n):
        a, b = int(i * len(x) / n), int((i + 1) * len(x) / n); fc = f0 * (f1 / f0) ** (i / (n - 1))
        y[a:b] = X.bp(x[a:b + 2000], fc * .7, fc * 1.4)[:b - a]
    return y * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.2 * .05 * v


# ———— 音高 ————
SCALE = ['F', 'G', 'A', 'B', 'C', 'D', 'E']                         # F 利底亚
def deg(i, octv=5):
    return f'{SCALE[i % 7]}{octv + i // 7}'
LINE_NOTE = {'U1': 4, 'U6': 6, 'U4': 8, 'U2': 9, 'U3': 11}           # 每条线一个音级（拉线时的颤音琴、站孔的毛毡音都从这里起）
CHORDS = [['F3', 'A3', 'C4', 'E4', 'G4'], ['G3', 'B3', 'D4', 'F4', 'A4'], ['A3', 'C4', 'E4', 'G4', 'B4'], ['C4', 'E4', 'G4', 'B4', 'D5']]   # 每小节一个
ROOTS = ['F1', 'G1', 'A1', 'C2']
chord_at = lambda t: CHORDS[int(t // BAR) % 4]; root_at = lambda t: ROOTS[int(t // BAR) % 4]

# ———— 拉线（0–8 s） ————
for e in K.events('draw'):
    put(fx, zip_(e['d'] * .8, .9), e['t'], 1.0, -.3 + .15 * e['li'])
    both(vib(deg(LINE_NOTE[e['line']]), 3.0, .75), e['t'], .9, -.3 + .15 * e['li'], .5)
for e in K.events('punch'):
    k = LINE_NOTE[e['line']] + e['k'] % 5; put(fx, felt(deg(k, 6), .5), e['t'], .32, e['pan'] * .6)
for e in K.events('knot'):
    put(fx, felt(deg(LINE_NOTE[e['line']], 5), .8), e['t'], .5, e['pan'] * .6)
for e in K.events('settled'):
    put(fx, felt('F4', .9), e['t'], .4, 0); put(fx, X.click(.7, .5), e['t'], .12, 0)
t = K.on('cap', bar(2, 3), id='title')                            # 片名：低音进来，一个和弦
both(bass('F1', 3.5, .9), t, 1.0, 0, .2)
for i, p in enumerate(['F4', 'A4', 'C5', 'E5']): both(vib(p, 3.2, .6), t + i * .045, .6, -.2 + .13 * i, .6)

# ———— 周四（9–18.5 s）：琶音的声部 = 还亮着的线的条数 ————
last = sorted(K.events('lastrun'), key=lambda e: e['t'])
def voices_thu(t): return 5 - sum(1 for e in last if e['t'] <= t)
T_THU0, T_THU1 = K.on('sec', bar(3), id='thu'), last[-1]['t'] + .2
for b in range(int(T_THU0 / BEAT * 2), int(T_THU1 / BEAT * 2)):         # 八分音符
    t = b * BEAT / 2; nv = voices_thu(t)
    if nv <= 0: continue
    ch = chord_at(t); i = b % 8; idx = [0, 2, 1, 3, 2, 4, 3, 1][i]
    if idx >= nv: continue
    both(vib(ch[idx], 1.6, .55), t, .42, -.35 + .17 * idx, .55)
    if b % 8 == 0: both(bass(root_at(t), 2.6, .75), t, .9, 0, .15)
for e in last:                                                     # 一条线的末班车到终点：两个往下的音
    p = LINE_NOTE[e['line']]
    both(vib(deg(p, 5), 2.2, .6), e['t'], .6, -.3 + .15 * e['li'], .6); both(vib(deg(p - 3, 5), 2.6, .5), e['t'] + BEAT / 2, .5, -.3 + .15 * e['li'], .6)
    put(fx, felt(deg(p - 7, 5), .7), e['t'], .35, -.3 + .15 * e['li'])

# ———— 一天过去（22.5–26.25 s）：上行滑奏 + 风 ————
ps = K.events('pass')[0]; t0, d = ps['t'], ps['d']
for i in range(22):
    both(vib(deg(i, 4), 1.4, .35 + .3 * i / 21), t0 + d * (i / 22) ** 1.3, .35 + .2 * i / 21, -.6 + 1.2 * i / 21, .7)
put(fx, zip_(d + .3, 1.6), t0 - .1, 1.0, 0)
t = K.on('sec', bar(9, 1), id='fri')                              # 到了周五：和弦回来
both(bass('F1', 3.0, .9), t, 1.0, 0, .2)
for i, p in enumerate(['F4', 'C5', 'E5', 'G5']): both(vib(p, 3.0, .6), t + i * .04, .55, -.25 + .15 * i, .6)

# ———— 周五（26.25–36.75 s）：声部不减，加刷子 ————
T_HOLD = K.on('sec', bar(13), id='hold')
for b in range(int(bar(9, 3) / BEAT * 2), int((T_HOLD - BEAT) / BEAT * 2)):
    t = b * BEAT / 2; ch = chord_at(t); idx = [0, 2, 1, 3, 2, 4, 3, 1][b % 8]
    both(vib(ch[idx], 1.6, .55), t, .42, -.35 + .17 * idx, .55)
    if b % 8 == 0: both(bass(root_at(t), 2.6, .75), t, .9, 0, .15)
    put(mus, brush(.8 if b % 2 == 0 else .5), t, .55, .3)
t = K.on('sec', bar(12), id='keep'); both(air_pad('C4', 6, .9), t, .8, -.15, .5); both(air_pad('E4', 5.5, .7), t + .3, .7, .2, .5)
# 周五 01:30：只剩列车靠站的声音（第二处静场），结论落在全片最重的和弦上
t = K.on('cap', bar(14, 2), id='rule')
both(bass('F1', 4.5, 1.0), t, 1.1, 0, .2); put(fx, X.lp(X.thump(.8, 48)[:int(1.2 * SR)], 700), t, .35, 0)
for i, p in enumerate(['F3', 'C4', 'E4', 'A4', 'B4', 'E5']): both(vib(p, 4.5, .7), t + i * .035, .6, -.3 + .12 * i, .7)
both(air_pad('F3', 7, 1.0), t, .9, 0, .6)

# ———— 天亮（45–49.5 s）：拍子细分成十六分，越来越密 ————
T_DAWN, T_END = K.on('sec', bar(15, 2), id='dawn'), K.on('end', bar(17))
for b in range(int(T_DAWN / BEAT * 4), int(T_END / BEAT * 4)):
    t = b * BEAT / 4; ch = chord_at(t); idx = [0, 1, 2, 3, 4, 3, 2, 1][b % 8]
    f = (t - T_DAWN) / (T_END - T_DAWN)
    if b % 2 == 1 and f < .35: continue
    both(vib(ch[idx], 1.2, .45 + .2 * f), t, .3 + .1 * f, -.35 + .17 * idx, .55)
    if b % 4 == 0: both(bass(root_at(t), 1.4, .7), t, .8, 0, .15)
    put(mus, brush(.5 + .4 * f), t, .4, .3)
# 片尾：一个长和弦，长音一直到最后（不落进静场：静场结尾会把响度范围拉过 11 LU）
both(bass('F1', 6, 1.0), T_END, 1.0, 0, .2)
for i, p in enumerate(['F3', 'A3', 'C4', 'E4', 'G4', 'B4', 'E5']): both(vib(p, 5.5, .6), T_END + i * .06, .55, -.35 + .1 * i, .7)
both(air_pad('C4', DUR - T_END + .5, 1.0), T_END, .9, -.2, .6); both(air_pad('F3', DUR - T_END + .5, .9), T_END + .2, .9, .2, .6)

# ———— 列车靠站（钟慢的时候）：毛毡的轻点，同一时刻越多越轻 ————
arr = K.events('arr'); ats = np.array([e['t'] for e in arr])
NOTE_L = [LINE_NOTE[r] for r in ('U1', 'U2', 'U3', 'U4', 'U6')]
for e in arr:
    dens = np.sum(np.abs(ats - e['t']) < .12)
    hold = 1.6 if bar(13) - .2 < e['t'] < bar(14, 2) else 1.0                      # 一点半那一段：近景，靠站声清楚一点
    put(fx, felt(deg(NOTE_L[e['li']] + 2, 6), .6), e['t'] + .012 * (dens > 1) * rng.uniform(0, 1), .2 * hold / math.sqrt(dens), e['pan'] * .7)
K.events('beat'); K.events('cap'); K.events('sec')                # 节拍和字幕事件：琶音和段落都从时间线里取（这里只登记）

# ———— 环境：夜里城市的空气声 ————
t = tt(DUR); air = X.lp(X.brown(DUR), 300) * .6 + X.bp(X.noise(DUR), 150, 900) * .03
put(amb, air * np.clip(t / 1.5, 0, 1) * np.clip((DUR - t) / 2, 0, 1), 0, .1, 0)
day = np.clip((t - 46) / 4, 0, 1)                                   # 天亮：一点高频的空气
put(amb, X.bp(X.noise(DUR), 1500, 6000) * day * .02, 0, 1.0, .1)

K.report() or sys.exit('mix.py: 配乐的重音没有落在画面事件上（见上表）：改 timeline.js 或这里的时间')

# ———— 混响、总线 ————
ir = rng.standard_normal(int(2.6 * SR)) * np.exp(-np.arange(int(2.6 * SR)) / (.6 * SR)); ir = X.lp(X.hp(ir, 300), 6500)
wet = np.stack([fftconvolve(rev[:, c], np.roll(ir, c * 331))[:N] for c in (0, 1)], 1) * .012
rms = lambda x: 20 * math.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
print(f'各路电平 dB：配乐 {rms(mus):.1f}  混响 {rms(wet):.1f}  拟音 {rms(fx):.1f}  环境 {rms(amb):.1f}')
mix = mus + wet + fx + amb
# 两处静场：周四一点半（末班车之后到"一天过去"之前）只留空气；周五一点半前的一拍
g = np.ones(N)
def duck(a, b, lvl, f=.25):
    ia, ib, nf = int(a * SR), int(b * SR), int(f * SR)
    g[ia:ib] = np.minimum(g[ia:ib], lvl); g[ia - nf:ia] = np.minimum(g[ia - nf:ia], np.linspace(1, lvl, nf)); g[ib:ib + nf] = np.minimum(g[ib:ib + nf], np.linspace(lvl, 1, nf))
duck(last[-1]['t'] + 2.2, t0 - .05, .25, .8)
fo0 = int((DUR - 1.8) * SR); g[fo0:] *= np.linspace(1, .35, N - fo0)
mix *= g[:, None]
mix = M.master(mix[:int(DUR * SR)])
os.makedirs(os.path.join(D, 'out'), exist_ok=True)
sf.write(os.path.join(D, 'out', 'mix.wav'), mix.astype(np.float32), SR)
lowE = np.sqrt(np.mean(X.lp(mix[:, 0], 120) ** 2)); allE = np.sqrt(np.mean(mix[:, 0] ** 2))
print('每 2 秒的电平 dB：' + ' '.join(f'{rms(mix[int(a * SR):int((a + 2) * SR)]):.0f}' for a in range(0, int(DUR), 2)))
print(f'mix.wav {DUR}s  peak {np.abs(mix).max():.2f}  低频占比 {20 * math.log10(lowE / allE):.1f} dB')
M.check(os.path.join(D, 'out', 'mix.wav')) or sys.exit('mix.py: 这条混音到了 mux.sh 会被重新分配强弱（见上一行），先把峰值或动态范围收住')
