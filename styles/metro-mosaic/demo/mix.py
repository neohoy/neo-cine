"""配乐 + 拟音 + 站台环境 → out/mix.wav（48 kHz 立体声）。全部用 numpy 合成，不用任何录音或采样。
配乐：96 BPM，D 大调五声（D E F# A B），原创。乐器是"瓷"的一家：玻璃钟（FM，非谐泛音）、像拇指琴的短促瓷片音、
      低音（正弦加二三次谐波）、一层很淡的玻璃琴长音。没有钢琴，没有弦乐铺底。
      2004 年那一段没有节拍：1 号线每落一块站砖，玻璃钟就往上走一个音（画面驱动）；片名牌挂上，低音进来；
      2011 起瓷片音弹八分音符的分解和弦，2020 之后的最后一段分成十六分（不改速度，细分节拍）；
      静场只留站台的底噪；最后一片砖一个钟；列车进站的时候钟的动机完整地走一遍，2026 的牌子挂上落一个和弦。
拟音：读 events.json（画面导出的 window.EV）：每片线路砖一声瓷片落浆、站砖更厚的一声、搪瓷牌的铁皮声和拧螺丝、
      开头的抹刀、结尾一列车从左到右开过去（和墙上的光带同步）。
运行（在库的根目录）：.venv/bin/python styles/metro-mosaic/demo/mix.py；build.sh 会先导出 events.json 再跑它"""
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
rng = np.random.default_rng(1228)
mus = np.zeros((N, 2), np.float32); rev = np.zeros((N, 2), np.float32); fx = np.zeros((N, 2), np.float32); amb = np.zeros((N, 2), np.float32)
tt = X.t_
BPM = 96; BEAT = 60 / BPM; BAR = 4 * BEAT
bar = lambda n, b=0: round(n * BAR + b * BEAT, 4)
NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
midi = lambda p: p if isinstance(p, (int, float)) else 12 * (int(p[-1]) + 1) + NOTE[p[0]] + (1 if '#' in p else 0)
hz = lambda p: 440.0 * 2 ** ((midi(p) - 69) / 12)


def put(buf, x, at, gain=1.0, pan=0.0):
    i = int(round(at * SR))
    if i >= N or i < 0: return
    x = x[:N - i]; l = math.cos((pan + 1) * math.pi / 4); r = math.sin((pan + 1) * math.pi / 4)
    buf[i:i + len(x), 0] += x * gain * l * 1.414; buf[i:i + len(x), 1] += x * gain * r * 1.414
def both(x, at, gain, pan=0.0, wet=.5):
    put(mus, x, at, gain, pan); put(rev, x, at, gain * wet, pan)


# ———— 乐器 ————
def bell(p, at, v=.6, pan=0.0, d=3.5, wet=.8):                    # 玻璃钟：FM，调制比 3.5（非谐），调制深度随时间收
    t = tt(d); f = hz(p); idx = 2.2 * np.exp(-t / .25) + .25
    y = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * 3.5 * t)) * np.exp(-t / 1.3)
    y += .22 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / .5) + .1 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / .18)
    y[:96] *= np.linspace(0, 1, 96)
    both(y * .28, at, v, pan, wet)
def tine(p, at, v=.5, pan=0.0):                                   # 瓷片音：短，带一点敲击的高泛音（像拇指琴）
    d = .9; t = tt(d); f = hz(p)
    y = (np.sin(2 * np.pi * f * t) * np.exp(-t / .32) + .35 * np.sin(2 * np.pi * f * 4.2 * t) * np.exp(-t / .05)
         + .15 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t / .2))
    y[:48] *= np.linspace(0, 1, 48)
    both(y * .22, at, v, pan, .45)
def bass(p, at, d=2.2, v=.6):                                     # 低音：正弦 + 二、三次谐波（小喇叭上也听得见）
    t = tt(d); f = hz(p)
    y = (np.sin(2 * np.pi * f * t) + .45 * np.sin(4 * np.pi * f * t) + .22 * np.sin(6 * np.pi * f * t)) * np.exp(-t / (d * .55))
    y[:240] *= np.linspace(0, 1, 240); y[-2400:] *= np.linspace(1, 0, 2400)
    both(y * .3, at, v, 0, .15)
def glass(ps, at, d, v=.4):                                       # 玻璃琴长音：慢起慢收，轻微颤动
    t = tt(d); env = np.clip(t / .9, 0, 1) * np.clip((d - t) / 1.4, 0, 1)
    y = sum(np.sin(2 * np.pi * hz(p) * t + k) + .25 * np.sin(4 * np.pi * hz(p) * t) for k, p in enumerate(ps))
    y *= env * (1 + .05 * np.sin(2 * np.pi * 4.6 * t)) / len(ps)
    both(y * .2, at, v, 0, 1.0)

SCALE = ['D5', 'E5', 'F#5', 'A5', 'B5', 'D6', 'E6', 'F#6', 'A6', 'B6', 'D7']
CHORDS = [['D3', 'D4', 'F#4', 'A4'], ['B2', 'B3', 'D4', 'F#4'], ['G2', 'G3', 'B3', 'D4'], ['A2', 'A3', 'C#4', 'E4']]

# ———— 配乐 ————
# 第一片砖：一个钟；罗湖的站砖晚一拍，第二个音
t1 = K.on('first', bar(1) + .3); bell('A5', t1, .75, .05)
# 2004：1 号线每落一块站砖，钟往上走一个音（画面驱动，不卡拍）
first_discs = [e for e in K.events('disc') if e['t'] < bar(4, 2)]
for i, e in enumerate(first_discs):
    bell(SCALE[min(i, len(SCALE) - 1)] if i else 'F#5', e['t'], .42 + .02 * min(i, 8), e['pan'] * .6, 2.6)
# 片名牌：低音 D 进来，一个大三和弦的钟
tt0 = K.on('plaque', bar(5, 1) + .5, id='title')
bass('D2', tt0, 4.5, .8); [bell(p, tt0 + k * .06, .45, -.3 + .3 * k) for k, p in enumerate(['D5', 'F#5', 'A5'])]
glass(['D4', 'A4'], tt0, 5.0, .35)
# 2011 → 2020：瓷片音弹八分的分解和弦，每小节换一个和弦，低音在小节线上
ARP = [0, 2, 1, 3, 2, 1, 3, 2]
def groove(b0, b1, div=2, v=.4, oct=12):
    for b in range(b0, b1):
        ch = CHORDS[b % 4]; t0 = bar(b)
        bass(ch[0], t0, BAR * .95, .55)
        for k in range(4 * div):
            n = ch[1 + ARP[k % len(ARP)] % 3]
            tine(midi(n) + oct, t0 + k * BEAT / div, v * (1 if k % div == 0 else .7), .25 * math.sin(k))
K.on('act', bar(6, 2), id='y2011')
groove(7, 11, 2, .38)
# 年份牌：铁皮一声 + 钟和弦（画面里牌子挂上的那一刻）
for i, e in enumerate(K.events('stat')):
    if i == 3: continue
    tk = K.on('stat', [bar(8), bar(9, 2), bar(11)][i] + .5, id=e['id'])
    bell(['D6', 'E6', 'F#6'][i], tk, .5, -.4); bell(['A5', 'B5', 'A5'][i], tk + .04, .4, -.5)
# 最后一段（2021—2025）：分成十六分，越来越密
K.on('act', bar(11, 2), id='y2025')
groove(11, 14, 4, .32)
# 2026 那一段：只剩八分，渐弱，到静场停
for k in range(8):
    tine(['D6', 'A5', 'F#5', 'E5', 'D5', 'A4', 'F#4', 'D4'][k], bar(14) + k * BEAT / 2 * 1.25, .3 - .03 * k, .2 * math.sin(k))
bass('D2', bar(14), 3.0, .4)
# 静场 bar(15)–bar(16)：什么也不奏。最后一片砖：一个钟、一个低音
tl = K.on('last', bar(16) + .36)
bell('D6', tl, .8, 0, 5.0); bass('D2', tl, 4.0, .5); glass(['D4', 'F#4', 'A4'], tl + .2, 4.0, .3)
# 列车进站：钟的动机完整走一遍（上行），低音持续
ttr = K.on('train', bar(18))
for k, (p, b) in enumerate([('D5', 0), ('F#5', 1), ('A5', 2), ('D6', 3), ('E6', 5), ('F#6', 6), ('A6', 8)]):
    bell(p, ttr + b * BEAT, .5 + .03 * k, -.6 + .2 * k, 3.5)
bass('D2', ttr, 5.0, .55); glass(['D4', 'A4', 'D5'], ttr, 6.0, .4)
# 2026 的牌子（后拉途中挂上）：一个和弦，叠在列车的钟声动机里
t26 = K.on('stat', bar(19) + .5, id='stat3')
for k, p in enumerate(['D5', 'F#5', 'A5', 'D6']): bell(p, t26 + k * .05, .5, -.3 + .2 * k, 5.0)
bass('D2', t26, 5.5, .6); glass(['D4', 'F#4', 'A4'], t26, 5.5, .35)
# 镜头落到说明牌上：最后两个钟，一层玻璃琴一直延到片尾（结尾不掉进静场，免得整片的响度范围太大）
for k, p in enumerate(['A5', 'D5']): bell(p, bar(20, 2) + k * BEAT, .45, .2 - .3 * k, 5.0)
glass(['D4', 'A4', 'F#5'], bar(20, 2) - .5, DUR - bar(20, 2) + .6, .5); bass('D2', bar(20, 2), DUR - bar(20, 2), .45)

# ———— 拟音：跟着画面事件 ————
def ceramic(p=1.0, v=1.0, big=False):                            # 一片瓷砖落进灰浆：瓷的高频脆响 + 灰浆里一声闷的
    d = .12; t = tt(d); q = p * (.9 + rng.random() * .2)
    tr = X.hp(X.noise(d), 3000) * X.env_exp(d, .0012)
    modes = [(1700, .6, .02), (2900, .45, .015), (4300, .3, .008)] if big else [(3300, .5, .01), (5100, .35, .007), (2300, .4, .014)]
    res = sum(a * np.sin(2 * np.pi * f * q * t + rng.random() * 6) * X.env_exp(d, tau) for f, a, tau in modes)
    thock = X.bp(X.noise(d), 250, 900) * X.env_exp(d, .014) * (.9 if big else .55) + np.sin(2 * np.pi * (170 if big else 260) * q * t) * X.env_exp(d, .016) * .4
    return (tr * .7 + res + thock) * v
def enamel(v=1.0):                                                # 搪瓷铁牌碰到墙：铁皮的几个泛音 + 一声闷响
    d = .5; t = tt(d); p = .95 + rng.random() * .1
    y = sum(a * np.sin(2 * np.pi * f * p * t) * X.env_exp(d, tau) for f, a, tau in [(640, .5, .12), (1130, .45, .09), (1890, .35, .06), (2950, .2, .04)])
    th = np.pad(X.thump(.8, 110), (0, max(0, len(t) - len(X.thump(.8, 110)))))[:len(t)]
    return (y + th * .6 + X.hp(X.noise(d), 2500) * X.env_exp(d, .003) * .5) * v
def screw(v=1.0):                                                 # 拧螺丝：一小段往上走的摩擦声
    d = .16; t = tt(d); f = 2200 + 1800 * t / d
    return X.bp(X.noise(d), 1800, 5200) * (.4 + .6 * np.abs(np.sin(2 * np.pi * 38 * t))) * np.sin(np.pi * t / d) * .5 * v
def trowel(d, v=1.0):                                             # 抹刀刮灰浆
    t = tt(d); env = np.sin(np.pi * t / d) ** 1.5
    return (X.bp(X.noise(d), 900, 4200) * (.6 + .4 * np.sin(2 * np.pi * 11 * t)) + X.lp(X.noise(d), 500) * .5) * env * .35 * v

ts = np.array([e['t'] for e in EV if e['type'] == 'tile'])
for e in K.each('tile', 'disc', 'last', 'plaque', 'stat', 'rake'):
    ty, at = e['type'], e['t']
    if ty == 'tile':
        n = np.sum(np.abs(ts - at) < .12)                         # 铺得密的时候每片轻一点，整体是一阵瓷片雨
        g = .38 / math.sqrt(max(1.0, n / 1.5))
        if e.get('first'): g = .9
        put(fx, ceramic(1.0 + rng.uniform(-.06, .06), 1.0), at, g, e['pan'] * .8)
        put(rev, ceramic(1.0, .4), at, g * .3, e['pan'] * .8)
    elif ty in ('disc', 'last'):
        g = .5 if at < bar(5) else .32
        if ty == 'last': g = .9
        put(fx, ceramic(.8, 1.0, big=True), at, g * (1.15 if e['big'] else 1), e['pan'] * .7); put(rev, ceramic(.8, .5, big=True), at, g * .4, e['pan'] * .7)
    elif ty in ('plaque', 'stat'):
        if e['id'] == 'credit': continue
        g = .4 if ty == 'stat' else .32
        put(fx, enamel(), at, g, e['pan'] * .6); put(rev, enamel(.5), at, g * .4, e['pan'] * .6)
        put(fx, screw(), at + .18, .3, e['pan'] * .6 - .1); put(fx, screw(), at + .36, .26, e['pan'] * .6 + .1)
    elif ty == 'rake':
        d = e['d']; put(fx, X.bp(X.noise(d), 3000, 9000) * np.sin(np.pi * tt(d) / d) ** 2 * .05, at, 1.0, .4)
put(fx, trowel(.9), .25, .8, -.2); put(fx, trowel(.7), 1.2, .7, .1)

# 列车：从左到右开过去，和墙上的光带同步（低频隆隆 + 风 + 轮轨的"咔哒咔哒"）
e = K.at('train'); te = [x for x in EV if x['type'] == 'train'][0]; d = te['d']
t = tt(d); env = np.exp(-((t - d * .45) / (d * .28)) ** 2)
pan = np.clip((t - d * .45) / (d * .4), -1, 1)
rum = X.lp(X.brown(d), 160) * env * .9; wind = X.bp(X.noise(d), 300, 2600) * env ** 1.5 * .35
L = (rum + wind) * np.cos((pan + 1) * np.pi / 4) * 1.414; R = (rum + wind) * np.sin((pan + 1) * np.pi / 4) * 1.414
i0 = int(e * SR); n = min(len(t), N - i0); amb[i0:i0 + n, 0] += L[:n] * .5; amb[i0:i0 + n, 1] += R[:n] * .5
for k in range(14):
    tk = e + d * .12 + k * .36; w = math.exp(-((tk - e - d * .45) / (d * .28)) ** 2); pk = max(-1, min(1, (tk - e - d * .45) / (d * .4)))
    put(fx, ceramic(.35, .8, big=True), tk, .22 * w, pk); put(fx, ceramic(.33, .7, big=True), tk + .09, .18 * w, pk)

# ———— 站台环境：空调的低频、空气声，一直都在（静场里也只剩它） ————
def bed(a, b, make, gain, fi=1.5, fo=2.0):
    dd = b - a; x = make(dd); t2 = tt(dd); x = x * np.clip(t2 / fi, 0, 1) * np.clip((dd - t2) / fo, 0, 1)
    put(amb, x, a, gain, -.25); put(amb, np.roll(x, 7919), a, gain, .25)
bed(0, DUR + .3, lambda dd: X.lp(X.brown(dd), 140) * .8 + X.hp(X.noise(dd), 5000) * .025, .2, .6, 1.5)
bed(0, DUR + .3, lambda dd: X.bp(X.noise(dd), 180, 700) * (.6 + .4 * np.sin(2 * np.pi * .07 * tt(dd))) * .12, .2, 1.0, 1.5)

K.report() or sys.exit('mix.py: 配乐的重音没有落在画面事件上（见上表）：改 timeline.js 或这里的时间，让两边重新对齐')

# ———— 混响（站台：长而暗）、总线 ————
ir = rng.standard_normal(int(2.8 * SR)) * np.exp(-np.arange(int(2.8 * SR)) / (.7 * SR)); ir = X.lp(X.hp(ir, 200), 5200)
wet = np.stack([fftconvolve(rev[:, c], np.roll(ir, c * 331))[:N] for c in (0, 1)], 1) * .01
rms = lambda x: 20 * math.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
# 瓷片声和钟的起音很尖：各自先限一下峰值（拟音 12 dB、配乐 14 dB 的峰均比），母带就不用替它们削
def tame(x, crest_db):
    c = np.sqrt(np.mean(x ** 2)) * 10 ** (crest_db / 20)
    return np.stack([X.limit(x[:, k], c, .004) for k in (0, 1)], 1).astype(np.float32)
fx = tame(fx, 12); mus = tame(mus, 14)
print(f'各路电平 dB：配乐 {rms(mus):.1f}  混响 {rms(wet):.1f}  拟音 {rms(fx):.1f}  环境 {rms(amb):.1f}')
mix = mus + wet + fx + amb
# 静场：bar(15) 到最后一片砖之前，音乐和拟音都没有，只留环境（上面本来就没写），再把总线轻轻压一点
g = np.ones(N)
for a, b, lo in ((bar(15) + .3, tl - .05, .7),):
    ia, ib = int(a * SR), int(b * SR); f = int(.4 * SR); g[ia:ib] = lo; g[ia - f:ia] = np.linspace(1, lo, f); g[ib:ib + 480] = np.linspace(lo, 1, 480)
mix *= g[:, None]
mix = M.master(mix[:int(DUR * SR)])
lowE = np.sqrt(np.mean(X.lp(mix[:, 0], 120) ** 2)); allE = np.sqrt(np.mean(mix[:, 0] ** 2))
os.makedirs(os.path.join(D, 'out'), exist_ok=True)
sf.write(os.path.join(D, 'out', 'mix.wav'), mix[:int(DUR * SR)].astype(np.float32), SR)
print('每 2 秒的电平 dB：' + ' '.join(f'{rms(mix[int(a * SR):int((a + 2) * SR)]):.0f}' for a in range(0, int(DUR), 2)))
print(f'mix.wav {DUR}s  peak {np.abs(mix).max():.2f}  低频占比 {20 * math.log10(lowE / allE):.1f} dB')
M.check(os.path.join(D, 'out', 'mix.wav')) or sys.exit('mix.py: 这条混音到了 mux.sh 会被重新分配强弱（见上一行），先把峰值或动态范围收住')
