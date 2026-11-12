"""配乐 + 拟音 → out/mix.wav（48 kHz 立体声）。全部合成，不用任何外部录音。
配乐：120 BPM，D 多利亚，原创。时刻表本身就是乐谱：每趟车起笔的那一刻响一个音，音高由它的发车分钟决定
      （每小时同一分钟发车 → 每小时同一个音），高速新线是八音盒（钢片），莱茵河谷线是竖琴；一小时 = 一小节的时候，
      钟面时刻表就是一个循环。低音是拨弦低音提琴；时钟的嘀嗒是节拍；赛跑那一段是两条轨道的节奏，ICE 的明显更密。
拟音：读 events.json（画面导出的 window.EV）：笔在聚酯薄膜上走（按正在画的笔数）、丁字尺落下、铅笔写批注、图签写字、
      剪开地图的一下、林堡南的越行、汽笛（合成的双音）。
环境：制图室的空气声。
运行（在库的根目录）：.venv/bin/python styles/train-graph/demo/mix.py；build.sh 会先导出 events.json 再跑它"""
import os, sys, json, math
import numpy as np, soundfile as sf
from scipy.signal import fftconvolve
D = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get('LIB') or os.path.abspath(os.path.join(D, '..', '..', '..'))      # 库的根目录（core/ 在这里）
sys.path.insert(0, LIB)
from core.audio import sfx as X, pluck as P
from neo.audio import master as M, cues as C
SR = X.SR
EVJ = json.load(open(os.path.join(D, 'events.json'), encoding='utf-8'))
EV, DUR = EVJ['ev'], EVJ['dur']
K = C.Cues(EV, fps=24)
N = int((DUR + .5) * SR)
rng = np.random.default_rng(5)
mus = np.zeros((N, 2), np.float32); rev = np.zeros((N, 2), np.float32); fx = np.zeros((N, 2), np.float32); amb = np.zeros((N, 2), np.float32)
tt = X.t_
NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
midi = lambda p: p if isinstance(p, (int, float)) else 12 * (int(p[-1]) + 1) + NOTE[p[0]] + (1 if '#' in p else 0) - (1 if 'b' in p[1:-1] else 0)
hz = lambda p: 440.0 * 2 ** ((midi(p) - 69) / 12)
BEAT = .5; bt = lambda b: b * BEAT                                 # 第 b 拍的时间

def put(buf, x, at, gain=1.0, pan=0.0):
    i = int(round(at * SR))
    if i >= N or i < 0 or gain == 0: return
    x = x[:N - i]; l = math.cos((pan + 1) * math.pi / 4); r = math.sin((pan + 1) * math.pi / 4)
    buf[i:i + len(x), 0] += x * gain * l * 1.414; buf[i:i + len(x), 1] += x * gain * r * 1.414
def both(x, at, gain, pan=0.0, wet=.4):
    put(mus, x, at, gain, pan); put(rev, x, at, gain * wet, pan)

# ———— 乐器 ————
_cache = {}
def pl(preset, p, d=None, v=.7, **kw):
    k = (preset, p, d, round(v, 2), tuple(sorted(kw.items())))
    if k not in _cache: _cache[k] = P.pluck(preset, p, d, vel=v, **kw)
    return _cache[k]
def box(p, at, v=.6, g=.5, pan=.3): both(pl('music_box', p, None, v), at, g, pan, .55)      # 八音盒：高速新线
def harp(p, at, v=.6, g=.6, pan=-.3): both(pl('harp', p, 2.5, v), at, g, pan, .5)       # 竖琴：河谷线
def bass(p, at, d=1.6, v=.75, g=1.0): both(pl('upright_bass_pizz', p, d, v), at, g, 0, .15)
def reed(p, at, d, v=.5, pan=0.0):                                 # 簧风琴一样的持续音（合成）：锯齿波的低通，音头慢
    t = tt(d); f = hz(p) * (1 + .0025 * np.sin(2 * np.pi * 5.1 * t) * np.clip((t - .6) / .6, 0, 1))
    ph = 2 * np.pi * np.cumsum(f) / SR; y = sum(np.sin(k * ph) / k ** 1.15 for k in range(1, 9))
    y = X.lp(y, 1400) * np.clip(t / .5, 0, 1) ** 1.6 * np.clip((d - t) / .8, 0, 1)
    both(y * .07, at, v, pan, .8)
def tick(at, v=1.0, hi=True):                                       # 时钟：木头的一下
    d = .06; t = tt(d); f = 2300 if hi else 1700
    y = (np.sin(2 * np.pi * f * t) * .6 + X.bp(X.noise(d), 2500, 7000) * .5) * X.env_exp(d, .006)
    put(mus, y, at, .1 * v, .05)
def thump(at, v=1.0): both(X.lp(X.thump(1.0, 52)[:int(1.2 * SR)], 900), at, .38 * v, 0, .3)
def horn(at, v=1.0, far=False):                                     # 汽笛：两个音同时（纯四度），簧片一样的锯齿，带一点音高的下沉
    d = 1.15; t = tt(d); y = 0
    for p in ('A4', 'E5'):
        f = hz(p) * (1 - .006 * np.clip((t - .8) / .35, 0, 1)); ph = 2 * np.pi * np.cumsum(f) / SR
        y = y + sum(np.sin(k * ph) / k for k in range(1, 14))
    y = X.bp(y, 380, 3200 if not far else 1400) * np.clip(t / .04, 0, 1) * np.clip((d - t) / .18, 0, 1)
    if far: put(rev, y * .05, at, v, .25); put(fx, y * .02, at, v, .25)
    else: put(fx, y * .06, at, v, .15); put(rev, y * .03, at, v, .15)

# ———— 配乐 ————
# 开场：地图在画，一个低的持续音；剪开（2.6 s）时加一个高音
reed('D3', .3, 4.6, .55, -.1); reed('A3', .9, 4.0, .35, .15)
box('A6', 2.6, .5, .35, .2); box('D6', 2.62, .4, .3, -.2)
# 丁字尺落下，节拍开始
tr = K.at('ruler'); bass('D2', tr + .7, 2, .8)
# 每趟车起笔一个音：音高 = 发车的分钟（一小时一个循环）
BOX = ['D5', 'F5', 'G5', 'A5', 'C6', 'D6', 'F6', 'G6', 'A6', 'C7']
HRP = ['D3', 'F3', 'G3', 'A3', 'C4', 'D4']
deps = K.events('dep'); dts = np.array([e['t'] for e in deps])
for e in deps:
    dens = np.sum(np.abs(dts - e['t']) < .5)                      # 越密越轻，一秒钟十个音也不吵
    duck = .35 if 15.3 < e['t'] < 26.5 and e['t'] not in (K.at('race'), K.at('raceIce')) else 1.0   # 赛跑时别的车在描图纸下面：轻一点
    if e['ax'] == 'hsl': box(BOX[e['min'] * len(BOX) // 60], e['t'], .55, .42 / math.sqrt(dens) * duck, .25 + .1 * ((e['min'] % 3) - 1))
    else: harp(HRP[e['min'] * len(HRP) // 60], e['t'], .6, .75 / math.sqrt(dens) * duck, -.3)

# 低音和时钟：段落和拍子
ROOTS = ['D2', 'D2', 'C2', 'G1', 'D2', 'D2', 'A1', 'C2']            # 每小节一个根音（2 秒）
def bar_root(b): return ROOTS[int(b // 4) % 8]
for b in range(int(5 / BEAT), int(46 / BEAT)):                     # 5.0–46.0 s
    t = bt(b)
    if 22.5 <= t < 26: continue                                     # 判决：钟停了
    if t >= 15.5 and t < 22.5:                                     # 赛跑：八分音符的低音型，越来越紧
        bass('D2' if b % 4 != 3 else 'A1', t, .45, .6 + .1 * ((t - 15.5) / 7), .8); bass('D3' if b % 2 else 'A2', t + .25, .3, .45, .5)
        tick(t, .9, b % 2 == 0); continue
    if t >= 36:                                                    # 傍晚：一小时两拍，拍子加倍
        bass(bar_root(b) if b % 2 == 0 else midi(bar_root(b)) + 12, t, .5, .7, .85)
        tick(t, 1.0, True); tick(t + .25, .6, False); continue
    if b % 4 == 0: bass(bar_root(b), t, 1.8, .75)
    elif b % 4 == 2 and t >= 26: bass(midi(bar_root(b)) + 7, t, .9, .55, .7)
    tick(t, 1.0 if b % 2 == 0 else .7, b % 2 == 0)
# 减速（13.5–15.5）：簧风琴从下往上推到赛跑
reed('A2', 13.5, 2.3, .6); reed('E3', 14.0, 1.8, .4, .2)
# 赛跑开始：汽笛（全片第一个大音）
t = K.on('race', 15.5); horn(t, 1.0); both(P.strum('harp', ['D3', 'A3', 'D4'], 2.5, vel=.7, spread=.04), t, .7, -.3, .5)
# 到站：全片最重的一下，然后钟停住，只剩余音
t = K.on('arrive', 23.0); thump(t, 1.0); bass('D1', t, 3.5, .95, .9)
both(P.strum('harp', ['D2', 'A2', 'D3', 'F3', 'A3', 'E4'], 4, vel=.85, spread=.03), t, .9, -.2, .7)
box('D6', t, .7, .55, .3); box('A6', t + .02, .6, .45, .4); reed('D3', t, 3.4, .5); reed('A3', t + .3, 3.0, .35, .2)
bass('A1', 25.5, .5, .6); bass('C2', 25.75, .4, .55)               # 接回节拍的两个音
K.on('sec', 26, id='day'); bass('D2', 26, 1.8, .85)
# 傍晚的拍子加倍：簧风琴在上面拉一个长音
K.on('sec', 36, id='evening'); reed('A3', 36, 10, .35, .2); reed('D4', 40, 6, .25, -.2)
# 整张图：最后一个和弦，节拍停下
t = K.on('sec', 46, id='sheet'); bass('D2', t, 4, .85, 1.1); thump(t, .7)
both(P.strum('harp', ['D3', 'A3', 'D4', 'E4', 'F4', 'A4'], 6, vel=.75, spread=.06), t, .9, -.2, .8)
box('D6', t + .3, .55, .4, .3); box('A5', t + .5, .5, .35, .1); reed('D3', t, 9.5, .55); reed('A3', t + .5, 9, .4, .2); reed('F3', t + 1, 8.5, .25, -.2)
horn(48.5, .9, far=True)                                           # 远处一声汽笛，回应赛跑开始的那一声

# ———— 拟音 ————
def scratch(d, v=1.0, fine=False):                                  # 铅笔（或针管笔）写字：一阵一阵的沙沙
    t = tt(d); e = np.clip(t / .05, 0, 1) * np.clip((d - t) / .08, 0, 1)
    am = np.abs(np.sin(2 * np.pi * (7.5 if fine else 5.5) * t + rng.uniform(0, 3))) ** .6
    return X.bp(X.noise(d), 3000 if fine else 1800, 9000 if fine else 6500) * am * e * .3 * v
def clack(v=1.0, bright=1.0):                                       # 一个转向架过钢轨接缝：两下
    d = .2; y = np.zeros(int(d * SR))
    for k, off in enumerate((0, .075)):
        c = X.bp(X.noise(.05), 900 * bright, 5000 * bright) * X.env_exp(.05, .006) + np.sin(2 * np.pi * 320 * bright * tt(.05)) * X.env_exp(.05, .01) * .4
        i = int(off * SR); y[i:i + len(c)] += c * (1 if k else .8)
    return y * v
for e in K.each('strip', 'ruler', 'arr', 'write', 'tb', 'overtake', 'clack'):
    ty, at = e['type'], e['t']
    if ty == 'strip':                                               # 两支笔在薄膜上画地图
        for pan in (-.35, .35): put(fx, scratch(e['d'], .55, True), at, .5, pan)
    elif ty == 'ruler':                                             # 有机玻璃尺滑过来，落下
        put(fx, X.lp(X.noise(e['d']), 2500) * np.clip(tt(e['d']) / .2, 0, 1) * .25, at, .5, .2); put(fx, X.click(.8, .9), at + e['d'], .45, .2)
    elif ty == 'arr': put(fx, X.click(1.6, .5), at, .05, .35 if e['ax'] == 'hsl' else -.35)     # 抬笔
    elif ty == 'write': put(fx, scratch(e['d'] + .6, .9), at, .55, .35)
    elif ty == 'tb': put(fx, scratch(.9, .7, True), at, .55, .3)
    elif ty == 'overtake': put(fx, X.whoosh(.5, .7), at - .2, .35, .3)
    elif ty == 'clack':
        ice = e['who'] == 'ice'; put(fx, clack(1.0, 1.25 if ice else .9), at, .3 if ice else .28, .45 if ice else -.45)
put(fx, X.click(1.2, .8), 2.6, .3, .2)                              # 地图从法兰克福剪开的一下

# ———— 环境：制图室的空气 + 笔在薄膜上的沙沙（按这一刻正在画的笔数） ————
t = tt(DUR); air = X.lp(X.brown(DUR), 400) * .5 + X.bp(X.noise(DUR), 200, 1200) * .02
put(amb, air * np.clip(t / 1.0, 0, 1) * np.clip((DUR - t) / 2, 0, 1), 0, .12, 0)
active = np.zeros(N)
starts = sorted(e['t'] for e in deps); ends = sorted(e['t'] for e in K.events('arr'))
grid = np.arange(N) / SR
active = np.searchsorted(np.array(starts), grid) - np.searchsorted(np.array(ends), grid)
active = np.clip(active, 0, None) * (grid > 4.6) * (grid < 46.3)
pen = X.bp(X.noise(DUR + .5), 2500, 8000)[:N] * np.sqrt(active) * .022
put(amb, pen, 0, 1.0, .1)

# 卡点核对（neo/audio/cues.py）
K.report() or sys.exit('mix.py: 配乐的重音没有落在画面事件上（见上表）：改 timeline.js 或这里的时间')

# ———— 混响、总线 ————
ir = rng.standard_normal(int(2.2 * SR)) * np.exp(-np.arange(int(2.2 * SR)) / (.45 * SR)); ir = X.lp(X.hp(ir, 250), 7000)
wet = np.stack([fftconvolve(rev[:, c], np.roll(ir, c * 331))[:N] for c in (0, 1)], 1) * .01
rms = lambda x: 20 * math.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
print(f'各路电平 dB：配乐 {rms(mus):.1f}  混响 {rms(wet):.1f}  拟音 {rms(fx):.1f}  环境 {rms(amb):.1f}')
mix = mus + wet + fx + amb
# 两处留空：赛跑到站之前（22.5–23.0），整张图写完的最后两秒淡出
g = np.ones(N); ia, ib = int(22.45 * SR), int(22.98 * SR); f = int(.15 * SR)
g[ia:ib] = .12; g[ia - f:ia] = np.linspace(1, .12, f); g[ib:ib + 240] = np.linspace(.12, 1, 240)
fo0 = int((DUR - 2.5) * SR); g[fo0:] *= np.linspace(1, 0, N - fo0) ** 1.5
mix *= g[:, None]
mix = M.master(mix[:int(DUR * SR)])
lowE = np.sqrt(np.mean(X.lp(mix[:, 0], 120) ** 2)); allE = np.sqrt(np.mean(mix[:, 0] ** 2))
os.makedirs(os.path.join(D, 'out'), exist_ok=True)
sf.write(os.path.join(D, 'out', 'mix.wav'), mix[:int(DUR * SR)].astype(np.float32), SR)
print('每 2 秒的电平 dB：' + ' '.join(f'{rms(mix[int(a * SR):int((a + 2) * SR)]):.0f}' for a in range(0, int(DUR), 2)))
print(f'mix.wav {DUR}s  peak {np.abs(mix).max():.2f}  低频占比 {20 * math.log10(lowE / allE):.1f} dB')
M.check(os.path.join(D, 'out', 'mix.wav')) or sys.exit('mix.py: 这条混音到了 mux.sh 会被重新分配强弱（见上一行），先把峰值或动态范围收住')
