"""配乐 + 动作音 → out/mix.wav（48 kHz 立体声）。全部用 numpy 合成，不用任何外部素材。
配乐：120 BPM，D 大调，原创。拨弦合成器的十六分琶音 + 低音 + 铺底 + 鼓；三个区各五小节，层次逐段加厚；
      两次地块立起来之前鼓全撤，留一拍近乎无声，立稳的那一下是全片最重的落点；收尾折成 U 形后只留一个和弦慢慢散掉。
动作音：读 events.json（画面导出的 window.EV）——镜头运动的呼啸、到位的落点、门扇和屏风转动的棘轮声、地块滑入对接、立起来的轰响。
环境：罗湖是街市的低噪，福田是开阔的风，南山是海浪。
运行（在库的根目录）：.venv/bin/python styles/folding-city/demo/mix.py；build.sh 会先导出 events.json 再跑它"""
import os, sys, json, math
import numpy as np, soundfile as sf
from scipy.signal import fftconvolve
D = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get('LIB') or os.path.abspath(os.path.join(D, '..', '..', '..'))      # 库的根目录（core/ 在这里）
sys.path.insert(0, LIB)
from core.audio import sfx as X
from neo.audio import master as M, cues as C
SR = X.SR
EVJ = json.load(open(os.path.join(D, 'events.json'), encoding='utf-8'))
EV, DUR = EVJ['ev'], EVJ['dur']
K = C.Cues(EV, fps=24)                                            # 按名字读画面事件；配乐里的重音用 K.on() 声明它属于哪个事件，最后统一核对
N = int((DUR + .5) * SR); B = .5; BAR = 2.0
rng = np.random.default_rng(11)
mus = np.zeros((N, 2), np.float32); rev = np.zeros((N, 2), np.float32); fx = np.zeros((N, 2), np.float32); amb = np.zeros((N, 2), np.float32)

def put(buf, x, at, gain=1.0, pan=0.0):
    i = int(round(at * SR));
    if i >= N or i < 0: return
    x = x[:N - i]; l = math.cos((pan + 1) * math.pi / 4); r = math.sin((pan + 1) * math.pi / 4)
    buf[i:i + len(x), 0] += x * gain * l * 1.414; buf[i:i + len(x), 1] += x * gain * r * 1.414
hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)
tt = X.t_
def saw(f, d, det=0.0):
    t = tt(d); return 2 * ((t * f * (1 + det)) % 1.0) - 1
def adsr(d, a=.005, r=.05):
    n = int(round(d * SR)); e = np.ones(n); na = max(1, int(a * SR)); nr = max(1, int(r * SR))
    e[:na] = np.linspace(0, 1, na); e[-nr:] *= np.linspace(1, 0, nr); return e

# ———— 乐器 ————
def pluck(m, d=.3, bright=1.0):
    f = hz(m); x = saw(f, d) * .6 + saw(f, d, .004) * .6 + np.sign(np.sin(2 * np.pi * f * .5 * tt(d))) * .25
    e = np.exp(-tt(d) / (.09 + .05 * bright)); dark = X.lp(x, min(900, f * 3)); br = X.lp(x, min(9000, 2200 + 3800 * bright))
    eb = np.exp(-tt(d) / .035)
    return (dark * (1 - eb) + br * eb) * e * adsr(d, .002, .03)
def bass(m, d=.24):
    f = hz(m); t = tt(d); x = np.sin(2 * np.pi * f * t) + .45 * np.sin(4 * np.pi * f * t) + .22 * X.lp(saw(f, d), 500)
    return x * np.exp(-t / .22) * adsr(d, .004, .04)
def pad(ms, d):
    x = np.zeros(int(round(d * SR)))
    for m in ms:
        for det in (-.006, 0, .007): x += saw(hz(m), d, det)
    x = X.lp(x, 1500) / (len(ms) * 3); return x * adsr(d, .35, .5)
def bell(m, d=1.2):
    f = hz(m); t = tt(d); x = np.sin(2 * np.pi * f * t + 1.6 * np.sin(2 * np.pi * f * 3.01 * t) * np.exp(-t / .25)) + .3 * np.sin(2 * np.pi * f * 2 * t)
    return x * np.exp(-t / .5) * adsr(d, .002, .1)
def kick(v=1.0):
    d = .32; t = tt(d); ph = 2 * np.pi * (45 * t + (150 - 45) * .035 * (1 - np.exp(-t / .035)))
    return (np.sin(ph) * np.exp(-t / .13) + X.hp(X.noise(d), 3000) * np.exp(-t / .004) * .25) * v
def clap(v=1.0):
    d = .22; x = X.bp(X.noise(d), 900, 3600); e = np.zeros(len(x))
    for o in (0, .011, .022): i = int(o * SR); e[i:] += np.exp(-tt(d)[:len(e) - i] / .012)
    e += np.exp(-tt(d) / .06) * .6; return x * e * .5 * v
def hat(v=1.0, op=False):
    d = .2 if op else .05; return X.hp(X.noise(d), 7500) * np.exp(-tt(d) / (.06 if op else .014)) * .4 * v
def rim(v=1.0):
    d = .05; t = tt(d); return (np.sin(2 * np.pi * 1700 * t) + np.sin(2 * np.pi * 820 * t) * .6) * np.exp(-t / .008) * .5 * v
def riser(d, v=1.0):
    n = X.noise(d); t = tt(d); u = t / d; out = np.zeros(len(n))
    for k in range(6):                                  # 分段升高的带通，听起来是往上扫
        a, b = int(k * len(n) / 6), int((k + 1) * len(n) / 6) + 400
        lo = 300 * 2 ** (k * .75); seg_ = X.bp(n[a:b], lo, lo * 2.2); w = np.hanning(len(seg_)) if k else np.r_[np.ones(len(seg_) // 2), np.hanning(len(seg_))[len(seg_) // 2:]]
        out[a:a + len(seg_)] += (seg_ * w)[:len(out) - a]
    tone = np.sin(2 * np.pi * np.cumsum(180 * 2 ** (u * 2.2)) / SR) * .25
    return (out * .5 + tone) * u ** 1.6 * v
def impact(v=1.0):
    d = 2.2; t = tt(d); ph = 2 * np.pi * (38 * t + (95 - 38) * .09 * (1 - np.exp(-t / .09)))
    return (np.sin(ph) * np.exp(-t / .55) + X.lp(X.noise(d), 1400) * np.exp(-t / .16) * .5 + X.hp(X.noise(d), 4000) * np.exp(-t / .5) * .12) * v
def ratchet(d, v=1.0, step=.07):
    x = np.zeros(int(round(d * SR)));
    for k in range(int(d / step)):
        c = X.click(.7 + .5 * k / max(1, d / step), .5); i = int(k * step * SR); x[i:i + len(c)] += c[:len(x) - i]
    return x * v

# ———— 配乐 ————
CH = {'Bm7': (47, [59, 62, 66, 69]), 'G': (43, [55, 59, 62, 66]), 'D': (38, [62, 66, 69, 74]), 'A': (45, [57, 61, 64, 69]), 'F#m7': (42, [54, 57, 61, 64])}
SEC = [                      # (起点, 和弦序列每小节一个, 层次)
    (0.0, ['Bm7', 'G', 'D', 'A', 'Bm7'], 1),
    (12.0, ['G', 'A', 'F#m7', 'Bm7', 'G'], 2),
    (24.0, ['D', 'A', 'Bm7', 'G', 'A'], 3),
]
K.on('fold', 12.0, k='fold1', up=0); K.on('fold', 24.0, k='fold2', up=0)   # 第二、三段从上一块地放平的那一刻起
for t0, prog, lvl in SEC:
    for bi, name in enumerate(prog):
        tb = t0 + bi * BAR; root, ch = CH[name]
        put(mus, pad(ch, BAR + .5), tb, .16 + .03 * lvl, -.15); put(rev, pad([c + 12 for c in ch[:3]], BAR + .5), tb, .07, .25)
        seq = [ch[0], ch[1], ch[2], ch[3], ch[2] + 12, ch[3], ch[1] + 12, ch[2], ch[0] + 12, ch[3], ch[2] + 12, ch[1] + 12, ch[3] + 12, ch[2] + 12, ch[1] + 12, ch[3]]
        for k in range(16):                                   # 十六分琶音
            if lvl == 1 and k % 2 and k not in (3, 7, 11, 15): continue
            v = (.26 if k % 4 == 0 else .18) * (1 + .12 * lvl); put(mus, pluck(seq[k], .28, .5 + .25 * lvl + .2 * (k % 4 == 0)), tb + k * B / 4, v, .45 * math.sin(k * 1.9)); put(rev, pluck(seq[k], .28, .6), tb + k * B / 4, v * .28, -.4 * math.sin(k * 1.9))
        for k in range(8):                                    # 低音八分
            if lvl == 1 and k in (1, 5, 7): continue
            put(mus, bass(root + (12 if k in (3, 7) else 0)), tb + k * B / 2, .5)
        for k in range(4):                                    # 鼓
            tk = tb + k * B
            if lvl >= 2 or k in (0, 2): put(mus, kick(.9), tk, .62)
            if lvl >= 2 and k in (1, 3): put(mus, clap(), tk, .42, .1); put(rev, clap(), tk, .16, -.2)
            if lvl == 1 and k in (1, 3): put(mus, rim(), tk, .3, .3)
            put(mus, hat(.8), tk + B / 2, .34, -.3)
            if lvl >= 2: put(mus, hat(.5), tk + B / 4, .2, .35); put(mus, hat(.5), tk + 3 * B / 4, .2, -.35)
            if lvl == 3 and k == 3: put(mus, hat(.8, True), tk + B / 2, .3, .2)
    if lvl >= 2:                                              # 铃音主题，第二段起
        mot = [(0, 78), (.75, 81), (1.5, 74), (2.0, 76), (4.0, 78), (4.75, 81), (5.5, 85), (6.0, 83), (8.0, 81), (8.75, 78), (9.25, 74)] if lvl == 2 else [(0, 86), (.5, 85), (1.0, 81), (1.5, 78), (2.0, 81), (4.0, 83), (4.5, 81), (5.0, 78), (5.5, 74), (6.0, 78), (8.0, 81), (8.5, 85), (9.0, 86), (9.5, 90)]
        for dt, m in mot: put(mus, bell(m), t0 + dt, .2, .2); put(rev, bell(m), t0 + dt, .14, -.3)
# 两次过场：铺底悬住，往上扫，立稳时砸下来；折起来前留一拍空
for ta, name in [(10.0, 'A'), (22.0, 'A')]:
    root, ch = CH[name]; K.on('fold', ta + 1.1, up=1, end=True)   # 砸下来的那一下 = 地块立稳的时刻（折叠事件的结束）
    put(mus, pad(ch, 1.6), ta + .25, .12, 0); put(mus, riser(.95, .6), ta + .2, .5, 0); put(mus, impact(1.0), ta + 1.1, .95, 0); put(rev, impact(.6), ta + 1.1, .3, 0)
    for k in range(6): put(mus, pluck(ch[k % 4] + 12 * (k // 4), .3, 1.2), ta + 1.25 + k * B / 4, .2, .5 * math.sin(k)); put(rev, pluck(ch[k % 4] + 12, .3, 1), ta + 1.25 + k * B / 4, .08, 0)
    for k in range(3): put(mus, hat(.7), ta + 1.5 + k * B / 2, .3, .2)
    put(mus, kick(.8), ta + 1.5, .5)
# 收尾：鼓撤掉，G 和弦悬着；折成 U 的两下落点；最后 D 和弦加铃音散掉
root, ch = CH['G']; put(mus, pad(ch, 2.6), 34.0, .2, 0); put(rev, pad([c + 12 for c in ch], 2.6), 34.0, .1, 0)
K.on('fold', 34.9, k='fold1', up=1); K.on('fold', 36.2, k='fold1', up=1, end=True); K.on('fold', 36.4, k='fold2', up=1, end=True)   # 折成 U 形：起折、两块先后立稳
put(mus, riser(1.3, .7), 34.9, .5, 0); put(mus, impact(1.0), 36.2, 1.0, 0); put(rev, impact(.7), 36.2, .35, 0); put(mus, impact(.7), 36.4, .5, .2)
root, ch = CH['D']; put(mus, pad(ch + [78], 3.8), 36.3, .24, 0); put(rev, pad([c + 12 for c in ch], 3.8), 36.3, .12, 0); put(mus, bass(26, 1.6), 36.4, .5)
for k, m in enumerate([74, 78, 81, 86, 90]): put(mus, bell(m, 2.4), 36.6 + k * .22, .22, .5 * math.sin(k * 2)); put(rev, bell(m, 2.4), 36.6 + k * .22, .2, -.5 * math.sin(k * 2))

# ———— 动作音 ————
for e in K.each('whoosh', 'land', 'door', 'slide', 'fold'):
    t, ty, d = e['t'], e['type'], e.get('d', .5)
    if ty == 'whoosh':
        w = X.whoosh(max(.3, d * 1.15), 1.0); n = len(w); sweep = np.linspace(-.6, .6, n) * (1 if int(t * 4) % 2 else -1)
        l = np.cos((sweep + 1) * np.pi / 4); r = np.sin((sweep + 1) * np.pi / 4); i = int(t * SR); m = min(n, N - i)
        fx[i:i + m, 0] += (w * l)[:m] * .42; fx[i:i + m, 1] += (w * r)[:m] * .42
    elif ty == 'land':
        if e.get('flat'): put(fx, X.clack(1.25, .8), t - .01, .34, 0); put(fx, X.ding(.25), t, .12, .3); put(rev, X.clack(1.25, .5), t, .1, 0)
        else: put(fx, X.thump(.9, 62), t - .01, .5, 0)
    elif ty == 'door':
        put(fx, X.rumble(d, .8), t, .34, 0); put(fx, ratchet(d, .6), t, .26, -.3 if e['up'] else .3); put(fx, X.clack(.8, 1), t + d - .02, .5, 0); put(fx, X.thump(1, 55), t + d - .02, .55, 0)
    elif ty == 'slide':
        put(fx, X.whoosh(d * 1.2, 1.0), t, .5, 0); put(fx, X.rumble(d, .7), t, .3, 0); put(fx, X.clack(.7, 1), t + d - .03, .6, 0); put(fx, X.thump(1, 50), t + d - .03, .6, 0)
    elif ty == 'fold':
        put(fx, X.creak(.8), t, .3, -.2); put(fx, X.rumble(d + .2, 1.0), t, .5 if e['up'] else .3, 0); put(fx, ratchet(d * .85, .5, .09), t, .2, .3)
        if not e['up']: put(fx, X.thump(.8, 58), t + d - .03, .4, 0)

# ———— 环境 ————
def bed(t0, t1, make, gain):
    d = t1 - t0 + 1.2; x = make(d); e = adsr(d, .6, .9); put(amb, x * e, t0 - .2, gain, -.2); put(amb, np.roll(x, 3111) * e, t0 - .2, gain, .2)
bed(0.2, 10.4, lambda d: X.lp(X.brown(d), 420) + X.bp(X.noise(d), 900, 2400) * .05 * (1 + np.sin(2 * np.pi * .7 * tt(d))), .22)        # 罗湖：街市
bed(12, 22.4, lambda d: X.bp(X.noise(d), 300, 1300) * (.5 + .5 * np.sin(2 * np.pi * .23 * tt(d)) ** 2) * .5, .11)                      # 福田：风
bed(24, 34.4, lambda d: X.lp(X.noise(d), 2600) * (.25 + .75 * np.sin(2 * np.pi * .19 * tt(d)) ** 4) * .5, .15)                        # 南山：浪
bed(34.6, 40, lambda d: X.lp(X.brown(d), 200), .2)

# 卡点核对（neo/audio/cues.py）：上面声明过的重音和画面事件差多少毫秒；超过半帧就停下，不往下混
K.report() or sys.exit('mix.py: 配乐的重音没有落在画面事件上（见上表）：改 timeline.js 或这里的时间，让两边重新对齐')

# ———— 混响、总线 ————
ir = rng.standard_normal(int(1.5 * SR)) * np.exp(-np.arange(int(1.5 * SR)) / (.38 * SR)); ir = X.hp(ir, 250)
wet = np.stack([fftconvolve(rev[:, c], np.roll(ir, c * 331))[:N] for c in (0, 1)], 1) * .028
rms = lambda x: 20 * math.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
print(f'各路电平 dB：配乐 {rms(mus):.1f}  混响 {rms(wet):.1f}  动作音 {rms(fx * .9):.1f}  环境 {rms(amb):.1f}')
mix = mus + wet + fx * .9 + amb
# 过场前留空：10.0–10.2、22.0–22.2 两处把总线压到几乎没有（立起来前的一口气）
g = np.ones(N)
for ta in (10.0, 22.0, 34.72):
    a, b = int((ta - .06) * SR), int((ta + .2) * SR); g[a:b] = .06; g[a - 2400:a] = np.linspace(1, .06, 2400); g[b:b + 1200] = np.linspace(.06, 1, 1200)
mix *= g[:, None]
# 母带前的电平（neo/audio/master.py）：整条混音只加一个增益到 −14 LUFS，只收冒出来的峰值，三个区一层层加厚的强弱不动。
# 这样 mux.sh 的 loudnorm 只需要线性微调，不会替我们重新分配强弱（按峰值归一再压缩时，第一个区会被抬到和第三个区差不多）
mix = M.master(mix[:int(DUR * SR)])
lowE = np.sqrt(np.mean(X.lp(mix[:, 0], 120) ** 2)); allE = np.sqrt(np.mean(mix[:, 0] ** 2))
os.makedirs(os.path.join(D, 'out'), exist_ok=True)
sf.write(os.path.join(D, 'out', 'mix.wav'), mix[:int(DUR * SR)].astype(np.float32), SR)
print(f'mix.wav {DUR}s  peak {np.abs(mix).max():.2f}  低频占比 {20 * math.log10(lowE / allE):.1f} dB')
M.check(os.path.join(D, 'out', 'mix.wav')) or sys.exit('mix.py: 这条混音到了 mux.sh 会被重新分配强弱（见上一行），先把峰值或动态范围收住')
