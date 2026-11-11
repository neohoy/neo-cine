"""配乐 + 拟音 → out/mix.wav（48 kHz 立体声）。全部合成，不用任何外部录音。
配乐：120 BPM，G 大调，原创。班卓、木吉他、低音提琴拨弦（拨弦建模），口琴（合成），一个踏脚的低鼓。
      每加入一个州拨一个班卓音，音高顺着五声音阶一路往上：十三州是开场的一串琶音，之后疏密跟着历史走。
      篷车段只有吉他和口琴；南山口留空；铁路追上来时把拍子分细（班卓从八分到十六分），31 秒接轨是全片最重的一下；
      之后全体合奏到 48 州，数到 50 之前再留一次空，两记戳，一个和弦收住。
拟音：读 events.json（画面导出的 window.EV）：纸卷滚动、篷车的木轮和蹄声、火车的蒸汽节奏和汽笛、道钉、戳。
运行（在库的根目录）：.venv/bin/python styles/atlas-scroll/demo/mix.py；build.sh 会先导出 events.json 再跑它"""
import os, sys, json, math
import numpy as np, soundfile as sf
from scipy.signal import fftconvolve
D = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get('LIB') or os.path.abspath(os.path.join(D, '..', '..', '..'))      # 库的根目录（core/ 在这里）
sys.path.insert(0, LIB)
from core.audio import sfx as X, pluck as P
SR = X.SR
EVJ = json.load(open(os.path.join(D, 'events.json'), encoding='utf-8'))
EV, DUR = EVJ['ev'], EVJ['dur']
N = int((DUR + .5) * SR); B = .5; BAR = 2.0; T0 = 1.0                                     # 拍、小节、第一个小节头
rng = np.random.default_rng(31)
mus = np.zeros((N, 2), np.float32); rev = np.zeros((N, 2), np.float32); fx = np.zeros((N, 2), np.float32); amb = np.zeros((N, 2), np.float32)
tt = X.t_
NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
midi = lambda p: p if isinstance(p, (int, float)) else 12 * (int(p[-1]) + 1) + NOTE[p[0]] + (1 if '#' in p else 0)
hz = lambda p: 440.0 * 2 ** ((midi(p) - 69) / 12)
def put(buf, x, at, gain=1.0, pan=0.0):
    i = int(round(at * SR))
    if i >= N or i < 0: return
    x = x[:N - i]; l = math.cos((pan + 1) * math.pi / 4); r = math.sin((pan + 1) * math.pi / 4)
    buf[i:i + len(x), 0] += x * gain * l * 1.414; buf[i:i + len(x), 1] += x * gain * r * 1.414
def both(x, at, gain, pan=0.0, wet=.4): put(mus, x, at, gain, pan); put(rev, x, at, gain * wet, pan)

# ———— 乐器 ————
def banjo(p, at, v=.6, pan=.3, g=.75, d=.7): both(P.pluck('banjo', p, d, vel=v), at, g, pan, .3)
def bass(p, at, v=.7, d=.45): both(P.pluck('upright_bass_pizz', p, d, vel=v), at, .95, 0, .15)
def strum(ps, at, v=.6, up=False, g=.7, d=1.2, pan=-.3): both(P.strum('acoustic_guitar', ps, d, vel=v, spread=.014, up=up), at, g, pan, .35)
def pick(p, at, v=.55, d=1.4, pan=-.3): both(P.pluck('acoustic_guitar', p, d, vel=v), at, .7, pan, .4)
def harp(p, at, d, v=.5, pan=.15, bend=0.0):                      # 口琴：簧片的锯齿音过一个窄的共鸣，音头有一点从下面滑上来
    t = tt(d + .25); f = hz(p) * 2 ** ((-.6 * np.exp(-t / .05) + bend * np.clip(t / d, 0, 1)) / 12) * (1 + .007 * np.sin(2 * np.pi * 5.6 * t) * np.clip((t - .25) / .4, 0, 1))
    ph = 2 * np.pi * np.cumsum(f) / SR; y = sum(np.sin(k * ph) / k ** .9 for k in range(1, 9))
    y = X.bp(y, hz(p) * .8, min(hz(p) * 6, 9000)) + .25 * X.bp(y, 1800, 3400)
    env = np.clip(t / .05, 0, 1) * np.clip((d + .25 - t) / .22, 0, 1) * (.8 + .2 * np.sin(2 * np.pi * 3.1 * t))
    both(y * env * .05, at, v, pan, .8)
def stomp(at, v=1.0):
    d = .3; y = X.thump(1.0, 62)[:int(d * SR)]; y = np.pad(y, (0, max(0, int(d * SR) - len(y)))) + X.lp(X.noise(d), 300) * X.env_exp(d, .03) * .4
    both(y, at, .42 * v, 0, .2)
def brushhit(at, v=1.0, pan=.1):                                  # 刷子敲一下：一小撮高频噪声
    d = .09; put(mus, X.bp(X.noise(d), 2500, 8000) * X.env_exp(d, .02), at, .12 * v, pan)

CH = {'G': (['G2', 'D3', 'G3', 'B3', 'D4', 'G4'], 'G2', 'D2'), 'C': (['C3', 'E3', 'G3', 'C4', 'E4'], 'C2', 'G2'), 'D': (['D3', 'A3', 'D4', 'F#4'], 'D2', 'A2'), 'Em': (['E2', 'B2', 'E3', 'G3', 'B3', 'E4'], 'E2', 'B2')}
PROG = ['G', 'G', 'C', 'G', 'G', 'Em', 'C', 'D']                  # 八小节一轮
bar_t = lambda k: T0 + k * BAR
def chord_at(t): return PROG[int((t - T0) // BAR) % 8]
ROLLN = {'G': ['G3', 'B3', 'D4', 'G4'], 'C': ['G3', 'C4', 'E4', 'G4'], 'D': ['A3', 'D4', 'F#4', 'A4'], 'Em': ['G3', 'B3', 'E4', 'G4']}

def boomchick(k, v=1.0, half=False):                              # 一小节：一三拍低音，二四拍扫弦
    c = PROG[k % 8]; ps, root, fifth = CH[c]; t = bar_t(k)
    bass(root, t, .75 * v); strum(ps, t + B, .5 * v, d=.5)
    if not half: bass(fifth, t + 2 * B, .65 * v); strum(ps, t + 3 * B, .45 * v, up=True, d=.5)
def roll(k, div=2, v=1.0):                                        # 班卓的滚奏：div=2 八分，4 十六分
    c = PROG[k % 8]; ns = ROLLN[c]; n = 4 * div
    for i in range(n): banjo(ns[[0, 2, 1, 3, 2, 1, 3, 2][i % 8] if div == 4 else [0, 2, 1, 3][i % 4]], bar_t(k) + i * B / div, (.5 if i % div == 0 else .36) * v, pan=.3 + .05 * (i % 2), d=.4)

# 每加入一个州一个班卓音：五声音阶一路往上，到顶折回
SCALE = [midi(n) for n in ['G3', 'A3', 'B3', 'D4', 'E4', 'G4', 'A4', 'B4', 'D5', 'E5', 'G5']]
states = [e for e in EV if e['type'] == 'state']
for i, e in enumerate(states):
    j = i % 20; j = j if j < 11 else 20 - j
    banjo(SCALE[j], e['t'], .62 if i < 13 else .7, pan=.6 * e.get('pan', 0), g=.8 if i < 13 else .95, d=1.4)
    put(fx, X.click(1.6, .6), e['t'], .16, .6 * e.get('pan', 0))
# 0–3：纸卷滚开，十三州的琶音之下只有一个低音和一记扫弦
bass('G2', .4, .8, 1.5); strum(CH['G'][0], 2.5, .7, d=2.2, g=.85)
# 3–9：篷车上路，吉他一三二四，口琴一句
for k in range(1, 4): boomchick(k, .85)
for at, p, d in [(3, 'D5', .9), (4, 'B4', .45), (4.5, 'D5', .45), (5, 'E5', 1.4), (6.5, 'D5', .45), (7, 'B4', .9), (8, 'A4', .9)]: harp(p, at, d, .5)
# 9：路易斯安那购地，一把大的扫弦，之后放慢成半小节一下
strum(CH['G'][0], 9, .95, d=3.5, g=1.0); bass('G2', 9, .95, 1.6); stomp(9, .9)
for k in range(4, 7): boomchick(k, .6, half=True)
for at, p, d in [(10, 'G4', 1.9), (12, 'E4', .9), (13, 'G4', .9), (14, 'A4', .9)]: harp(p, at, d, .4)
# 15–22：俄勒冈小道，只有吉他分解和口琴；19.6–20.4 南山口留空
for k in range(7, 11):
    c = PROG[k % 8]; ps = CH[c][0]
    for i in range(8):
        at = bar_t(k) + i * B / 2
        if 19.5 <= at < 20.45: continue
        pick(ps[[0, 2, 3, 2, 1, 2, 3, 2][i] % len(ps)], at, .5 if i % 4 == 0 else .38)
for at, p, d in [(15, 'D5', 1.4), (16.5, 'E5', .45), (17, 'D5', .9), (18, 'B4', 1.4), (20.5, 'G4', .45), (21, 'A4', .9)]: harp(p, at, d, .5)
harp('B4', 20.45, .5, .55)                                        # 留空之后第一个音
# 22–31：铁路追上来。低音先进，班卓从八分滚到十六分，刷子越敲越密
for k in range(11, 15):
    boomchick(k, .8 + .05 * (k - 11)); roll(k, 2 if k < 13 else 4, .8 + .06 * (k - 11))
    for i in range(8 if k < 13 else 16): brushhit(bar_t(k) + i * BAR / (8 if k < 13 else 16), .6 + .1 * (k - 11))
for at in (29, 29.5, 30, 30.25, 30.5, 30.625, 30.75, 30.875): stomp(at, .6 + .5 * (at - 29) / 2)
for at, p, d in [(23, 'D5', 1.9), (25, 'E5', .9), (26, 'G5', 1.9), (28, 'E5', .9), (29, 'D5', 1.9)]: harp(p, at, d, .5)
# 31：接轨，全片最重的一下
stomp(31, 1.25); strum(CH['G'][0], 31, 1.0, d=3, g=1.1); bass('G2', 31, 1.0, 1.5)
# 31–42：全体合奏
for k in range(15, 21):
    boomchick(k, 1.0); roll(k, 4, 1.0)
    for i in range(4): stomp(bar_t(k) + i * B, .55 if i % 2 == 0 else .3); brushhit(bar_t(k) + i * B + B / 2, .9)
for at, p, d in [(31.5, 'G5', .9), (32.5, 'E5', .45), (33, 'D5', .9), (34, 'B4', .45), (34.5, 'D5', .45), (35, 'E5', 1.4), (36.5, 'G5', .45), (37, 'A5', .9), (38, 'G5', .9), (39, 'E5', .45), (39.5, 'D5', .45), (40, 'E5', .9), (41, 'D5', .9)]: harp(p, at, d, .55)
# 42–46.5：拉远，放慢；数到 50 之前留空
strum(CH['C'][0], 42, .8, d=2.5, g=1.0); bass('C2', 42, .8, 1.5); harp('G5', 42, 2.6, .5); strum(CH['D'][0], 44, .7, d=2.2, g=.9); bass('D2', 44, .7, 1.5); harp('F#5', 44, 1.6, .4, bend=-1)
# 46.6、47.2：两记戳；49.5：片名，一个和弦收住
st = [e['t'] for e in EV if e['type'] == 'stamp']
for i, at in enumerate(st): stomp(at, 1.3); banjo(['D5', 'G5'][i], at, .8, pan=-.2 + .4 * i, g=1.1, d=2)
tl = next(e['t'] for e in EV if e['type'] == 'title')
strum(CH['G'][0], tl - .1, .85, d=6, g=1.2); bass('G2', tl - .1, .9, 2.5); stomp(tl - .1, .9)
for at, p, d in [(tl + .4, 'D5', .45), (tl + .9, 'E5', .45), (tl + 1.4, 'G5', 2.6)]: harp(p, at, d, .5)

# ———— 拟音：跟着画面事件 ————
def paper_roll(d, v=1.0):
    t = tt(d); e = np.clip(t / .15, 0, 1) * np.clip((d - t) / .5, 0, 1)
    return (X.lp(X.brown(d), 190) * (.6 + .4 * np.sin(2 * np.pi * 9 * t) ** 2) * 1.1 + X.bp(X.noise(d), 1800, 6000) * (.3 + .7 * np.abs(np.sin(2 * np.pi * 3.1 * t + 1))) * .12) * e * v
def wagon(d):                                                     # 木轮的吱呀 + 蹄声，一拍两下
    t = tt(d); y = np.zeros(len(t)); e = np.clip(t / .6, 0, 1) * np.clip((d - t) / .8, 0, 1)
    y += X.bp(X.brown(d), 300, 900) * (.5 + .5 * np.sin(2 * np.pi * 1.7 * t)) * .5
    for i in range(int(d / .25)):
        c = X.bp(X.noise(.07), 500, 1500) * X.env_exp(.07, .014) * (.8 if i % 2 == 0 else .5); a = int(i * .25 * SR); y[a:a + len(c)] += c[:len(y) - a] * .5
    return y * e
def train(d):                                                     # 蒸汽的四下一组，随时间加快
    y = np.zeros(len(tt(d))); t = 0.0; i = 0
    while t < d - .2:
        c = X.bp(X.noise(.11), 300, 2600) * X.env_exp(.11, .03) * (1.0 if i % 4 == 0 else .55); a = int(t * SR); y[a:a + len(c)] += c[:len(y) - a]
        t += .25 * (.9 if t > d * .4 else 1.0); i += 1
    tt_ = tt(d); return (y + X.lp(X.brown(d), 120) * .5) * np.clip(tt_ / .8, 0, 1) * np.clip((d - tt_) / 1.2, 0, 1)
def whistle(d=.9):
    t = tt(d); e = np.clip(t / .06, 0, 1) * np.clip((d - t) / .25, 0, 1); y = sum(np.sin(2 * np.pi * f * t * (1 + .004 * np.sin(2 * np.pi * 6 * t))) for f in (523, 622, 784)) / 3
    return (y + X.bp(X.noise(d), 600, 3000) * .5) * e
for e in EV:
    ty, at = e['type'], e['t']
    if ty == 'roll': put(fx, paper_roll(e['d']), at, .22, -.4)
    elif ty == 'rollEnd': put(fx, X.clack(.7, 1.0), at, .4, -.6)
    elif ty == 'wagon': put(fx, wagon(e['d']), at, .3, -.1)
    elif ty == 'train': put(fx, train(e['d']), at, .2, .1)
    elif ty == 'whistle': w = whistle(); put(fx, w, at, .13, .2); put(rev, w, at, .12, .2)
    elif ty == 'spike': put(fx, X.ding(1.0), at, .5, 0); put(fx, X.clack(.5, 1.0), at, .5, 0)
    elif ty == 'stamp': put(fx, X.thump(1.0, 85), at, .6, -.3); put(fx, X.clack(.6, 1.0), at, .35, -.3)
    elif ty == 'cap': put(fx, X.bp(X.noise(.07), 1500, 5000) * X.env_exp(.07, .018), at, .14, 0)
# 环境：草原上的风，篷车段最明显
def bed(a, b, make, gain, fi=1.5, fo=2.0):
    d = b - a; x = make(d); t = tt(d); x = x * np.clip(t / fi, 0, 1) * np.clip((d - t) / fo, 0, 1); put(amb, x, a, gain, -.2); put(amb, np.roll(x, 7919), a, gain, .2)
bed(14, 24, lambda d: X.bp(X.noise(d), 250, 1100) * (.4 + .6 * np.sin(2 * np.pi * .21 * tt(d)) ** 2) * .5, .22)
bed(.5, 6, lambda d: X.lp(X.noise(d), 2200) * (.2 + .8 * np.sin(2 * np.pi * .18 * tt(d)) ** 4) * .5, .16)      # 开场：大西洋的浪

# ———— 混响、总线 ————
ir = rng.standard_normal(int(1.4 * SR)) * np.exp(-np.arange(int(1.4 * SR)) / (.3 * SR)); ir = X.lp(X.hp(ir, 250), 7000)
wet = np.stack([fftconvolve(rev[:, c], np.roll(ir, c * 331))[:N] for c in (0, 1)], 1) * .012
rms = lambda x: 20 * math.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
print(f'各路电平 dB：配乐 {rms(mus):.1f}  混响 {rms(wet):.1f}  拟音 {rms(fx):.1f}  环境 {rms(amb):.1f}')
mix = mus + wet + fx + amb
g = np.ones(N)                                                    # 两处留空：南山口、数到 50 之前
for a, b, lo in ((19.55, 20.42, .1), (st[0] - .6, st[0] - .02, .04)):
    ia, ib = int(a * SR), int(b * SR); f = int(.2 * SR); g[ia:ib] = lo; g[ia - f:ia] = np.linspace(1, lo, f); g[ib:ib + 480] = np.linspace(lo, 1, 480)
mix *= g[:, None]
peak = np.abs(mix).max(); mix = mix / peak * .9
for c in (0, 1): mix[:, c] = X.limit(X.compress(mix[:, c], thr=.32, ratio=2.2), .92)
lowE = np.sqrt(np.mean(X.lp(mix[:, 0], 120) ** 2)); allE = np.sqrt(np.mean(mix[:, 0] ** 2))
os.makedirs(os.path.join(D, 'out'), exist_ok=True)
sf.write(os.path.join(D, 'out', 'mix.wav'), mix[:int(DUR * SR)].astype(np.float32), SR)
print('每 2 秒的电平 dB：' + ' '.join(f'{rms(mix[int(a * SR):int((a + 2) * SR)]):.0f}' for a in range(0, int(DUR), 2)))
print(f'mix.wav {DUR}s  peak {np.abs(mix).max():.2f}  低频占比 {20 * math.log10(lowE / allE):.1f} dB')
