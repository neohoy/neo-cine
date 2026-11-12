"""配乐 + 拟音 → out/mix.wav（48 kHz 立体声）。全部用 numpy 合成，不用任何录音或采样。
配乐：96 BPM，A 多利亚（A B C D E F# G），原创。音色都是"电"的：方波和脉冲波过低通（屏的点）、FM 钟（隧道年份、下车铃）、
      加了二、三次谐波的低音（小喇叭上也听得见）。黎明只有一个低音和继电器；钟加快时低音八分音符进来，琶音跟着车流密度开滤波；
      高峰全编制，三条隧道的年份各落一记钟；白天和晚高峰换和声；夜里退成长音；凌晨留空，下车铃是空白之后的第一声；
      钟一路翻到 05:00，片名时一段原创的两音门铃，最后一个和弦收住。
拟音：读 events.json（画面导出的 window.EV）：开机灯检、每一次扫描重绘（继电器一串）、屏头每一次翻牌、说明扫入、隧道年份、
      主角车（一辆车的引擎，进隧道时变闷）、钟的飞转、片名与署名。
环境：城市低鸣一直在；引擎群的音量跟着同一时刻路上的车数（events 里的 dens）；屏自己的 100 Hz 电源嗡声跟着亮度。
运行（在库的根目录）：.venv/bin/python styles/bus-dotmatrix/demo/mix.py；build.sh 会先导出 events.json 再跑它"""
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
rng = np.random.default_rng(1972)
mus = np.zeros((N, 2), np.float32); rev = np.zeros((N, 2), np.float32); fx = np.zeros((N, 2), np.float32); amb = np.zeros((N, 2), np.float32)
tt = X.t_
BEAT = 60 / 96; BAR = 4 * BEAT
NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
midi = lambda p: p if isinstance(p, (int, float)) else 12 * (int(p[-1]) + 1) + NOTE[p[0]] + (1 if '#' in p else 0) - (1 if 'b' in p[1:-1] else 0)
hz = lambda p: 440.0 * 2 ** ((midi(p) - 69) / 12)

def put(buf, x, at, gain=1.0, pan=0.0):
    i = int(round(at * SR))
    if i >= N or i + len(x) <= 0: return
    if i < 0: x = x[-i:]; i = 0
    x = x[:N - i]; l = math.cos((pan + 1) * math.pi / 4); r = math.sin((pan + 1) * math.pi / 4)
    buf[i:i + len(x), 0] += x * gain * l * 1.414; buf[i:i + len(x), 1] += x * gain * r * 1.414
def both(x, at, gain, pan=0.0, wet=.3): put(mus, x, at, gain, pan); put(rev, x, at, gain * wet, pan)

# ———— 乐器（全部合成） ————
def env(d, a=.005, r=.08):
    t = tt(d); return np.clip(t / a, 0, 1) * np.clip((d - t) / r, 0, 1)
def pulse(p, d, duty=.3, cut=2400, v=1.0):                       # 脉冲波过低通：屏上的点那种"电"的音色
    f = hz(p); t = tt(d); ph = (f * t) % 1
    y = np.where(ph < duty, 1., -1.) - (2 * duty - 1)
    return X.lp(y, min(cut, 16000)) * env(d, .004, min(.12, d * .5)) * np.exp(-t * 1.8) * v
def bass(p, d, v=1.0):                                            # 低音：正弦 + 二、三次谐波，音头一点噪声
    f = hz(p); t = tt(d)
    y = np.sin(2 * np.pi * f * t) + .45 * np.sin(4 * np.pi * f * t) + .25 * np.sin(6 * np.pi * f * t)
    return y * env(d, .006, .06) * (.75 + .25 * np.exp(-t * 6)) * v
def bell(p, d=2.5, v=1.0, ratio=3.5, idx=2.2):                   # FM 钟：隧道年份、下车铃、门铃
    f = hz(p); t = tt(d); I = idx * np.exp(-t * 3)
    return np.sin(2 * np.pi * f * t + I * np.sin(2 * np.pi * f * ratio * t)) * np.exp(-t * 2.2) * env(d, .002, .3) * v
def pad(ps, d, v=1.0, cut=1400):                                 # 长音：几个略微走调的锯齿，慢起慢收
    t = tt(d); y = np.zeros_like(t)
    for p in ps:
        for det in (-.12, .11):
            f = hz(p) * 2 ** (det / 12); y += 2 * ((f * t + rng.random()) % 1) - 1
    y = X.lp(y / (2 * len(ps)), cut)
    return y * np.clip(t / .8, 0, 1) * np.clip((d - t) / 1.2, 0, 1) * v
def kick(v=1.0):                                                  # 低的一记，像车门关上那种闷响，不是鼓机
    d = .45; t = tt(d); f = 48 + 60 * np.exp(-t * 28)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7) + X.lp(X.noise(d), 300) * np.exp(-t * 30) * .3) * v
def relay(v=1.0, pitch=1.0):                                      # 继电器：一下硬的金属咔嗒（两个瞬态）
    d = .05; t = tt(d)
    a = X.bp(X.noise(d), 2500 * pitch, 9000) * np.exp(-t * 260)
    b = np.sin(2 * np.pi * 3100 * pitch * t) * np.exp(-t * 180) * .4
    y = a + b; y2 = np.zeros(int(.02 * SR) + len(y)); y2[:len(y)] += y; y2[int(.012 * SR):int(.012 * SR) + len(y)] += y * .55
    return y2 * v

# ———— 配乐：96 BPM，A 多利亚 ————
CH = [['A2', 'E3', 'G3', 'C4'], ['F2', 'C3', 'E3', 'A3'], ['C3', 'G3', 'B3', 'E4'], ['G2', 'D3', 'F#3', 'B3']]   # Am7 Fmaj7 Cmaj7 G
ARP = [[0, 2, 3, 1], [0, 1, 3, 2], [0, 3, 2, 1], [0, 2, 1, 3]]
def chord_at(t): return CH[int(t // (2 * BAR)) % 4]
# 黎明：一个低的长音，开机那一下
both(pad(['A2', 'E3'], 5.5, .5, 900), 0.0, .5, 0, .6)
both(bass('A1', 2.4, .5), K.on('power', 0), .5)
# 钟加快：低音八分音符，5 秒进；琶音 16 分音符，滤波跟着车流的密度打开
dens = {round(e['t'], 2): e['n'] for e in K.events('dens')}
def density(t): return dens.get(round(math.floor(t * 4) / 4, 2), 80)
K.on('sec', 5, id='rise'); K.on('sec', 12.5, id='peak'); K.on('sec', 25, id='eve')
def groove(t0, t1, kick_on, arp_v):
    b = t0
    while b < t1 - 1e-6:
        ch = chord_at(b); root = midi(ch[0]) - 12
        for k in range(2):                                        # 八分音符的低音
            at = b + k * BEAT / 2
            if at < t1: both(bass(root + (12 if k else 0) if (int(at / BEAT) % 4 == 3 and k) else root, BEAT / 2 * .9, .55), at, .4, 0, .05)
        if kick_on and abs((b / BEAT) % 1) < 1e-6: both(X.hp(kick(.9), 40), b, .55, 0, .1)
        for k in range(4):                                        # 16 分音符的琶音
            at = b + k * BEAT / 4
            if at >= t1: break
            n = density(at); cut = 700 + 2600 * min(1, n / 800)
            p = midi(ch[ARP[int(at / BEAT) % 4][k]]) + 12
            both(pulse(p, BEAT / 4 * .95, .25 + .1 * (k % 2), cut), at, arp_v * (.9 if k == 0 else .6), -.35 + .23 * k, .35)
        b += BEAT
groove(5, 12.0, False, .14)                                       # 12.0–12.5 低音停：高峰前留一口空
groove(12.5, 20, True, .19)
for i, (bt, p) in enumerate(zip([15, 15 + BEAT, 15 + 2 * BEAT], ['E5', 'A5', 'C6'])):   # 三条隧道的年份：三记钟往上，写在拍上
    both(bell(p, 3.0, .55), K.on('label', bt, k=i), .55, -.4 + .4 * i, .6)
both(X.whoosh(1.8, 1.0), 20.0, .25, 0, .4)                         # 白天：一口气跑过
groove(20, 25, False, .12)
groove(25, 32.5, True, .16)
for at in np.arange(12.5, 32.5, 2 * BAR): both(pad(chord_at(at), 2 * BAR + .8, .55, 1600), at, .32, 0, .6)
# 夜：退成长音
both(pad(['A2', 'E3', 'B3'], 3.6, .5, 1000), K.on('sec', 32.5, id='night'), .5, 0, .7)
both(bass('A1', 3.0, .4), 32.5, .45)
# 凌晨：几乎什么都没有。41.9–42.5 全空，下车铃是空白之后的第一声
both(pad(['E3', 'A3', 'B3'], 6.6, .3, 900), 35.625, .42, 0, .8)
tb = K.on('sec', 42.5, id='wrap')
both(bell('E6', 3.5, .8, 2.0, 1.4), tb, .45, .25, .7); both(bell('E5', 3.0, .5, 2.0, 1.0), tb, .3, .25, .7)
# 钟飞转：继电器越来越密（在 fx 里），底下一个上行的脉冲
for i in range(14): both(pulse(midi('A3') + [0, 2, 3, 5, 7, 9, 10][i % 7] + 12 * (i // 7), .1, .3, 2400), 42.75 + i * .12, .12, (i % 2) * .4 - .2, .3)
# 片尾：05:00 一个和弦；片名一段原创的两音门铃；最后一个长和弦
te = K.on('sec', 45, id='end')
both(pad(['A2', 'E3', 'G3', 'B3', 'E4'], 7.3, .6, 1800), te, .42, 0, .8); both(bass('A1', 4.0, .6), te, .5)
tt0 = K.at('title')
both(bell('C#6', 2.0, .55, 1.0, .6), tt0, .4, -.2, .7); both(bell('A5', 3.0, .55, 1.0, .6), tt0 + BEAT, .4, .2, .7)

# ———— 拟音 ————
for e in K.each('power', 'scan', 'flip', 'cap', 'credit', 'title', 'tunIn', 'tunOut', 'roll'):
    ty, at = e['type'], e['t']
    if ty == 'power':                                             # 开机：一串继电器 + 灯检的电流声
        for k in range(10): put(fx, relay(.8, .8 + .05 * k), at + k * .022, .22, -.6 + .13 * k)
        put(fx, X.lp(X.noise(.4), 5000) * np.exp(-tt(.4) * 9), at, .08)
    elif ty == 'scan':                                            # 重绘：扫描线一路下去，一串很密的继电器
        for k in range(12): put(fx, relay(.7, 1.1 - .03 * k), at + k * .04, .12, -.5 + k / 11)
        put(fx, X.thump(.5, 90), at, .2)
    elif ty == 'flip':                                            # 屏头翻牌：两下咔嗒
        g = .16 if at < 42.5 else .1
        put(fx, relay(1.0, 1.2), at, g, -.5); put(fx, relay(.7, 1.0), at + .07, g * .7, -.45)
    elif ty == 'cap':                                             # 说明扫入：一下轻的
        for k in range(4): put(fx, relay(.5, 1.5), at + k * .07, .06, -.3 + .2 * k)
    elif ty in ('title', 'credit'):
        for k in range(5): put(fx, relay(.6, 1.3), at + k * .05, .07, -.4 + .2 * k)
    elif ty == 'roll':                                            # 钟一路翻到 05:00：咔嗒越来越密
        q = at; dt = .12
        while q < at + e['d']: put(fx, relay(.6, 1.4), q, .1, .55); q += dt; dt = max(.035, dt * .9)
# 主角车：一辆车的引擎（低沉的柴油声），进隧道后被闷住、带一点隧道的回响
def engine(d, f0=31, load=.6):
    t = tt(d); f = f0 * (1 + .05 * np.sin(2 * np.pi * .3 * t)); ph = 2 * np.pi * np.cumsum(f) / SR
    y = sum(np.sin(k * ph + rng.random() * 6) / k ** .8 for k in range(1, 9)) + X.lp(X.noise(d), 400) * .6 * load
    return X.lp(y, 900) * np.clip(t / .6, 0, 1) * np.clip((d - t) / .8, 0, 1)
put(amb, engine(4.6), 0.3, .05, .3)                               # 开场那一班
ti = K.at('tunIn')
e2 = engine(6.6, 29, .4); e2 = X.lp(e2, 380); put(amb, e2, ti, .07, -.1); put(rev, e2, ti, .03)

# ———— 环境：城市低鸣、引擎群（跟着车数）、屏的电源嗡声 ————
t = tt(DUR + .5)
city = X.hp(X.lp(X.brown(DUR + .5), 600), 60) * .38 + X.bp(X.noise(DUR + .5), 300, 2500) * .07
put(amb, city, 0, .5, -.15); put(amb, np.roll(city, 9973), 0, .5, .15)
dn = np.interp(t, [e['t'] for e in K.events('dens')], [e['n'] for e in K.events('dens')])
crowd = X.hp(engine(DUR + .5, 34, .8) * .5 + engine(DUR + .5, 41, .8) * .4, 70)
cg = .06 + np.clip(dn / 900, 0, 1) ** .8
put(amb, crowd * cg, 0, .24, -.2); put(amb, np.roll(crowd, 13331) * cg, 0, .24, .2)
hum = (np.sin(2 * np.pi * 100 * t) + .3 * np.sin(2 * np.pi * 200 * t) + .1 * np.sin(2 * np.pi * 300 * t)) * .5
put(amb, hum, 0, .018)

K.report() or sys.exit('mix.py: 配乐的重音没有落在画面事件上（见上表）：改 timeline.js 或这里的时间，让两边重新对齐')

# ———— 混响、总线 ————
ir = rng.standard_normal(int(2.2 * SR)) * np.exp(-np.arange(int(2.2 * SR)) / (.45 * SR)); ir = X.lp(X.hp(ir, 250), 7000)
wet = np.stack([fftconvolve(rev[:, c], np.roll(ir, c * 331))[:N] for c in (0, 1)], 1) * .01
rms = lambda x: 20 * math.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
print(f'各路电平 dB：配乐 {rms(mus):.1f}  混响 {rms(wet):.1f}  拟音 {rms(fx):.1f}  环境 {rms(amb):.1f}')
mix = mus + wet + fx * 2.6 + amb
# 两处留空：高峰前（12.0–12.5）把配乐压下去；下车铃之前（41.9–42.5）整条总线压到几乎无声
g = np.ones(N)
for a, b, lo in ((41.9, tb - .01, .04), (44.55, 44.98, .15)):
    ia, ib = int(a * SR), int(b * SR); f = int(.3 * SR); g[ia:ib] = lo; g[ia - f:ia] = np.linspace(1, lo, f); g[ib:ib + 240] = np.linspace(lo, 1, 240)
mix *= g[:, None]
fo = int(1.6 * SR); mix[int(DUR * SR) - fo:int(DUR * SR)] *= np.linspace(1, 0, fo)[:, None] ** 1.5
mix = M.master(mix[:int(DUR * SR)])
lowE = np.sqrt(np.mean(X.lp(mix[:, 0], 120) ** 2)); allE = np.sqrt(np.mean(mix[:, 0] ** 2))
os.makedirs(os.path.join(D, 'out'), exist_ok=True)
sf.write(os.path.join(D, 'out', 'mix.wav'), mix.astype(np.float32), SR)
print('每 2 秒的电平 dB：' + ' '.join(f'{rms(mix[int(a * SR):int((a + 2) * SR)]):.0f}' for a in range(0, int(DUR), 2)))
print(f'mix.wav {DUR}s  peak {np.abs(mix).max():.2f}  低频占比 {20 * math.log10(lowE / allE):.1f} dB')
M.check(os.path.join(D, 'out', 'mix.wav')) or sys.exit('mix.py: 这条混音到了 mux.sh 会被重新分配强弱（见上一行），先把峰值或动态范围收住')
