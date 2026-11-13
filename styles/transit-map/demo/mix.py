"""《江与环》的声音 → out/mix.wav（48 kHz 立体声）。全部现场合成（numpy + core/audio 的 sfx.py、pluck.py），不用任何录音、采样或现成音乐。
上游 Transit Map 的 audio.py 用采样管弦乐叠层；这里换成"一条线一种音色"的旋律：
  · 笔尖每经过一个车站（events.json 的 pass），这条线的音色就弹一个音；音高取 D 大调五声音阶（D E F# A B），沿线逐站往上走、
    到顶再往下（锯齿形琶音），所以一条线是一句旋律，几条线同时长的时候是一阵叮叮当当的音乐盒。
    音色：马林巴、玻璃钟、拇指琴、竖琴、颤音琴、尼龙弦、音乐盒，按线分配，同一条线永远是同一种音色。
  · 拐角落定（snap）一声很轻的"咔"；终点横杠（term）一声木头"嗒"；换乘站弹出（x）一声低一点的"啵"加一个和弦里的音；
    新站点亮（stop）一粒极轻的墨点声；计数器落定（land）两声机械"嗒"；印字擦开（callout）一阵纸声；
  · 底下一层柔和的长音（pad），随章节换和弦（D—Bm—G—A），11 号线合环时一个上行的提升，合上时落 D 大九和弦；
    纪录落定前 0.6 秒几乎安静，一个钟；片尾只剩 pad 和最后一个和弦。
画面事件用 neo/audio/cues.py 读（声音的时间取自画面，不会漂），结尾用 neo/audio/master.py 定响度并检查。
运行（库的根目录）：.venv/bin/python styles/transit-map/demo/mix.py；build.sh 会先导出 events.json 再跑它。"""
import os, sys, json, math
import numpy as np, soundfile as sf
from scipy.signal import fftconvolve
D = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get('LIB') or os.path.abspath(os.path.join(D, '..', '..', '..'))
sys.path.insert(0, LIB)
from core.audio import sfx as X
from core.audio import pluck as PL
from neo.audio import master as M, cues as C
SR = X.SR
EVJ = json.load(open(os.path.join(D, 'events.json'), encoding='utf-8'))
EV, DUR = EVJ['ev'], EVJ['dur']
K = C.Cues(EV, fps=24)
N = int((DUR + .5) * SR)
rng = np.random.default_rng(1997)
mus = np.zeros((N, 2), np.float32); rev = np.zeros((N, 2), np.float32); fx = np.zeros((N, 2), np.float32); pad = np.zeros((N, 2), np.float32)
tt = X.t_
NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
midi = lambda p: p if isinstance(p, (int, float)) else 12 * (int(p[-1]) + 1) + NOTE[p[0]] + (1 if '#' in p else 0)
hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)


def put(buf, x, at, gain=1.0, pan=0.0):
    i = int(round(at * SR))
    if i >= N or i < 0 or gain <= 0: return
    x = x[:N - i]; l = math.cos((pan + 1) * math.pi / 4); r = math.sin((pan + 1) * math.pi / 4)
    buf[i:i + len(x), 0] += x * gain * l * 1.414; buf[i:i + len(x), 1] += x * gain * r * 1.414


# ———————————————————— 音色（每个音先合成一次，按 (音色, 音高) 缓存）————————————————————
_cache = {}
def voice(kind, m):
    key = (kind, m)
    if key in _cache: return _cache[key]
    f = hz(m)
    if kind == 'marimba':      # 木头：基音 + 4 倍、10 倍泛音快速衰减
        d = 1.2; t = tt(d)
        y = np.sin(2 * np.pi * f * t) * np.exp(-t / .38) + .35 * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t / .06) + .12 * np.sin(2 * np.pi * f * 9.8 * t) * np.exp(-t / .02)
    elif kind == 'glass':      # 玻璃钟：FM，调制比 3.5，深度随时间收
        d = 2.2; t = tt(d); idx = 1.6 * np.exp(-t / .2) + .2
        y = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * 3.5 * t)) * np.exp(-t / .9) * .8
    elif kind == 'vibes':      # 颤音琴：正弦 + 4 倍泛音，带 5.5 Hz 颤音
        d = 2.0; t = tt(d)
        y = (np.sin(2 * np.pi * f * t) + .25 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t / .1)) * np.exp(-t / .8) * (1 + .18 * np.sin(2 * np.pi * 5.5 * t))
    else:                      # 拇指琴、音乐盒、竖琴、尼龙弦：core/audio/pluck.py 的物理模型
        y = PL.pluck({'kalimba': 'kalimba', 'musicbox': 'music_box', 'harp': 'harp', 'nylon': 'nylon_guitar'}[kind], m, 1.6, vel=.6)
        y = np.asarray(y, np.float64)[:int(2.0 * SR)]
        y = y / (np.abs(y).max() + 1e-9) * .8
    y = np.asarray(y, np.float32); y[:64] *= np.linspace(0, 1, 64).astype(np.float32)
    _cache[key] = y; return y

SCALE = [0, 2, 4, 7, 9]                                   # D 大调五声：D E F# A B
def degree(n, base):                                      # 第 n 个音级（可以超过一个八度）
    return base + 12 * (n // 5) + SCALE[n % 5]
VOICE = {'1': ('marimba', 74), '2': ('glass', 74), '3': ('kalimba', 74), '4': ('harp', 62), '5': ('vibes', 74), '6': ('nylon', 62),
         '7': ('musicbox', 86), '8': ('marimba', 62), '9': ('kalimba', 86), '10': ('glass', 86), '11': ('harp', 74), '12': ('vibes', 62),
         '13': ('nylon', 74), '14': ('marimba', 74), '18': ('glass', 74), '21': ('kalimba', 62), '22': ('musicbox', 74), 'GF': ('harp', 62),
         'APM': ('musicbox', 86)}
PAN_LINE = {k: (i * .37) % 1.4 - .7 for i, k in enumerate(VOICE)}

# ———————————————————— 旋律：每经过一个车站一个音 ————————————————————
step, last = {}, {}
passes = K.events('pass')
times = np.array([e['t'] for e in passes])
for e in passes:
    ln = e['line']; kind, base = VOICE[ln]
    # 同一条线隔得太近（拐角处两站贴着）就跳过；一阵很密的时候整体轻一点
    if e['t'] - last.get(ln, -9) < .085: continue
    last[ln] = e['t']; k = step.get(ln, 0); step[ln] = k + 1
    top = 11 if ln == '11' else 8                          # 锯齿：往上走到顶再往下
    n = k % (2 * top); n = n if n <= top else 2 * top - n
    m = degree(n, base - 12 if ln == '11' and k < 3 else base)
    dens = np.sum(np.abs(times - e['t']) < .12)
    g = (.34 if e['tier'] <= 2 else .26) / math.sqrt(max(1.0, dens / 2.0))
    if ln == '11': g *= 1.25
    pan = .6 * e['pan'] if e.get('vis') else PAN_LINE[ln]
    x = voice(kind, m); put(mus, x, e['t'], g, pan); put(rev, x, e['t'], g * .5, pan)

# ———————————————————— pad：一层柔和的长音，按章节换和弦 ————————————————————
def padchord(ms, a, b, v=.5, fi=1.2, fo=1.5):
    d = b - a; t = tt(d); env = np.clip(t / fi, 0, 1) * np.clip((d - t) / fo, 0, 1)
    y = np.zeros(len(t))
    for j, m in enumerate(ms):
        f = hz(m)
        for det in (-.07, .07):                            # 两个微微走调的锯齿，低通得很柔
            ph = 2 * np.pi * f * (1 + det / 100) * t + j
            y += (np.sin(ph) + .3 * np.sin(2 * ph) + .12 * np.sin(3 * ph))
    y = X.lp(y * env / len(ms), 1800) * (1 + .04 * np.sin(2 * np.pi * .23 * t))
    put(pad, y.astype(np.float32), a, v * .19, -.2); put(pad, np.roll(y, 911).astype(np.float32), a, v * .19, .2)
CH = {'D': [50, 57, 62, 66], 'Bm': [47, 54, 59, 62], 'G': [43, 50, 55, 59], 'A': [45, 52, 57, 61], 'Dadd9': [50, 57, 62, 64, 66]}
t_first = K.at('first'); t_ring0 = K.at('ringstart'); t_ring1 = K.at('ringclose'); t_rec = K.at('record'); t_end = K.at('end'); t_sweep = K.at('sweep')
SECT = [(0.0, 'D', .5), (6.4, 'Bm', .6), (14.2, 'G', .7), (24.2, 'A', .7), (t_ring0, 'D', .8), (t_ring1, 'Dadd9', 1.0), (33.9, 'Bm', .8),
        (38.4, 'G', .8), (t_sweep, 'A', .85), (t_rec, 'D', .9), (t_end - .6, 'Dadd9', .9)]
for i, (a, ch, v) in enumerate(SECT):
    b = SECT[i + 1][0] + 1.0 if i + 1 < len(SECT) else DUR + .3
    padchord(CH[ch], a, b, v)
def bass(m, at, d=2.6, v=.5):
    t = tt(d); f = hz(m)
    y = (np.sin(2 * np.pi * f * t) + .4 * np.sin(4 * np.pi * f * t) + .15 * np.sin(6 * np.pi * f * t)) * np.exp(-t / (d * .5))
    y[:240] *= np.linspace(0, 1, 240); y[-2400:] *= np.linspace(1, 0, 2400)
    put(mus, y.astype(np.float32) * .3, at, v)
for a, ch, v in SECT[1:]: bass(CH[ch][0] - 12 if CH[ch][0] > 45 else CH[ch][0], a, 3.0, .45 * v)
bass(38, t_first, 3.5, .4)

# 合环：上行的提升（滤波噪声 + 一条慢慢升起的正弦），合上时一个竖琴 D 大九和弦
d = t_ring1 - t_ring0; t = tt(d)
riser = X.bp(X.noise(d), 600, 5000) * (t / d) ** 2 * .05 + np.sin(2 * np.pi * np.cumsum(hz(62) * (1 + t / d)) / SR) * (t / d) ** 2 * .05
put(pad, riser.astype(np.float32), t_ring0, 1.0)
for j, m in enumerate([62, 66, 69, 74, 76, 78, 81]):
    x = voice('harp', m); put(mus, x, t_ring1 + j * .045, .42, -.6 + .2 * j); put(rev, x, t_ring1 + j * .045, .3, -.6 + .2 * j)
x = voice('glass', 86); put(mus, x, t_ring1 + .3, .4, .1); put(rev, x, t_ring1 + .3, .4, .1)

# 纪录：前面 0.6 秒收住，落定时一个玻璃钟八度 + 低音
for m, dl in ((74, 0), (86, .03)): x = voice('glass', m); put(mus, x, t_rec + dl, .5, 0); put(rev, x, t_rec + dl, .5, 0)
bass(38, t_rec, 4.0, .55)
# 片尾：竖琴一个慢分解的 D 大九，最后玻璃钟
for j, m in enumerate([50, 57, 62, 64, 66, 69, 74]):
    x = voice('harp', m); put(mus, x, t_end + .2 + j * .16, .38, -.5 + .16 * j); put(rev, x, t_end + .2 + j * .16, .3, 0)
x = voice('glass', 86); put(mus, x, t_end + 1.6, .32); put(rev, x, t_end + 1.6, .4)
x = voice('glass', 74); put(mus, x, K.at('open') + .3, .35, -.3); put(rev, x, K.at('open') + .3, .45, -.3)     # 开场一个钟

# ———————————————————— 拟音：跟着画面事件 ————————————————————
def tick(f=4200, d=.03, v=1.0):                           # 拐角落定的"咔"：一小下高频敲击 + 一点纸
    t = tt(d); y = np.sin(2 * np.pi * f * t) * np.exp(-t / .004) + X.hp(X.noise(d), 3000) * np.exp(-t / .003) * .5
    return (y * v).astype(np.float32)
def wood(f=900, v=1.0):                                   # 终点横杠：木头的"嗒"
    d = .12; t = tt(d); y = np.sin(2 * np.pi * f * t) * np.exp(-t / .018) + .5 * np.sin(2 * np.pi * f * 2.7 * t) * np.exp(-t / .008) + X.bp(X.noise(d), 800, 3000) * np.exp(-t / .004) * .4
    return (y * v).astype(np.float32)
def pop(v=1.0):                                           # 换乘站弹出：音高往下掉的一声"啵"
    d = .2; t = tt(d); f = 520 * np.exp(-t / .05) + 180
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .05) + X.lp(X.noise(d), 1200) * np.exp(-t / .01) * .3
    return (y * v).astype(np.float32)
def dot(v=1.0):                                           # 新站点亮：一粒很轻的墨点声
    d = .04; t = tt(d); return (X.bp(X.noise(d), 2500, 7000) * np.exp(-t / .006) * v).astype(np.float32)
def ratchet(v=1.0):                                       # 计数器落定："嗒嗒"
    out = np.zeros(int(.12 * SR), np.float32)
    for k, f in enumerate((2600, 2100)):
        x = tick(f, .03, 1.0); i = int(k * .06 * SR); out[i:i + len(x)] += x
    return out * v
def paper(d=.5, v=1.0):                                   # 印字擦开：纸面摩擦
    t = tt(d); return (X.bp(X.noise(d), 1500, 7000) * np.sin(np.pi * t / d) ** 2 * .25 * v).astype(np.float32)

snaps = np.array(K.all('snap'))
for e in K.each('snap', 'term', 'x', 'stop', 'land', 'callout', 'depart'):
    ty, at, pan = e['type'], e['t'], .6 * e.get('pan', 0)
    if ty == 'snap':
        dens = np.sum(np.abs(snaps - at) < .15)
        put(fx, tick(3800 + 900 * rng.random(), .03), at, .16 / math.sqrt(max(1.0, dens / 1.5)), pan)
    elif ty == 'term': put(fx, wood(820 + 160 * rng.random()), at, .2, pan); put(rev, wood(), at, .08, pan)
    elif ty == 'x':
        put(fx, pop(), at, .22, pan); put(rev, pop(), at, .1, pan)
    elif ty == 'stop':
        if e.get('vis'): put(fx, dot(), at, .1, pan)
    elif ty == 'land': put(fx, ratchet(), at, .22, -.6)
    elif ty == 'callout': put(fx, paper(.55), at, .5, -.2)
    elif ty == 'depart': put(fx, tick(1800, .05), at, .06, pan)
# 笔尖在纸上滑：有笔尖在画的时候一层很淡的毡头笔声
deps = K.events('depart')
for e in deps:
    a, b = e['t'], e['t1']; d = max(.05, b - a); t = tt(d)
    y = X.bp(X.noise(d), 2000, 6500) * (.6 + .4 * np.sin(2 * np.pi * 9 * t)) * np.clip(t / .08, 0, 1) * np.clip((d - t) / .1, 0, 1) * .018
    put(fx, y.astype(np.float32), a, 1.0, .6 * e.get('pan', 0))
# 低扫的时候，列车的轮轨声在远处（示意）
d = t_rec - t_sweep + 4.0; t = tt(d)
amb = X.lp(X.brown(d), 220) * .12 * np.clip(t / 1.0, 0, 1) * np.clip((d - t) / 1.2, 0, 1)
put(pad, amb.astype(np.float32), t_sweep, 1.0, -.2)
for k in range(int(d / .45)):
    tk = t_sweep + .2 + k * .45 + .05 * rng.random(); w = .25 * min(1, (tk - t_sweep) / 1.0) * min(1, (t_sweep + d - tk) / 1.0)
    put(fx, wood(300 + 60 * rng.random(), .6), tk, .05 * w * 4, rng.uniform(-.8, .8))
# 开场：一层轻轻的纸声和水声
d = 3.0; t = tt(d); put(pad, (X.lp(X.noise(d), 700) * .05 * np.sin(np.pi * t / d)).astype(np.float32), 0.0, 1.0, .4)

K.report() or sys.exit('mix.py: 声音没有落在画面事件上（见上表）：改 timeline.js 或这里的时间，让两边重新对齐')

# ———————————————————— 混响（纸上的小房间：短而亮）、总线 ————————————————————
ir = rng.standard_normal(int(1.8 * SR)) * np.exp(-np.arange(int(1.8 * SR)) / (.42 * SR)); ir = X.lp(X.hp(ir, 250), 7000)
wet = np.stack([fftconvolve(rev[:, c], np.roll(ir, c * 271))[:N] for c in (0, 1)], 1) * .012
rms = lambda x: 20 * math.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
def tame(x, crest_db):
    c = np.sqrt(np.mean(x ** 2)) * 10 ** (crest_db / 20)
    return np.stack([X.limit(x[:, k], c, .004) for k in (0, 1)], 1).astype(np.float32)
fx = tame(fx, 13); mus = tame(mus, 13)
print(f'各路电平 dB：旋律 {rms(mus):.1f}  混响 {rms(wet):.1f}  pad {rms(pad):.1f}  拟音 {rms(fx):.1f}')
mix = mus + wet + fx + pad
# 纪录落定前 0.6 秒几乎安静
g = np.ones(N); a, b = t_rec - .65, t_rec - .02; ia, ib = int(a * SR), int(b * SR); f = int(.25 * SR)
g[ia:ib] = .35; g[ia - f:ia] = np.linspace(1, .35, f); g[ib:ib + 240] = np.linspace(.35, 1, 240)
mix *= g[:, None]
# 片尾 0.8 秒淡出
fo = int(.5 * SR); n0 = int(DUR * SR); mix[n0 - fo:n0] *= np.linspace(1, 0, fo)[:, None]
mix = M.master(mix[:n0])
lowE = np.sqrt(np.mean(X.lp(mix[:, 0], 120) ** 2)); allE = np.sqrt(np.mean(mix[:, 0] ** 2))
os.makedirs(os.path.join(D, 'out'), exist_ok=True)
sf.write(os.path.join(D, 'out', 'mix.wav'), mix.astype(np.float32), SR)
print('每 2 秒的电平 dB：' + ' '.join(f'{rms(mix[int(a * SR):int((a + 2) * SR)]):.0f}' for a in range(0, int(DUR), 2)))
print(f'mix.wav {DUR}s  peak {np.abs(mix).max():.2f}  低频占比 {20 * math.log10(lowE / allE):.1f} dB')
M.check(os.path.join(D, 'out', 'mix.wav')) or sys.exit('mix.py: 这条混音到了 mux.sh 会被重新分配强弱（见上一行），先把峰值或动态范围收住')
