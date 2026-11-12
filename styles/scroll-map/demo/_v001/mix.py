"""配乐 + 拟音 → out/mix.wav（48 kHz 立体声）。全部合成，不用任何外部录音。
配乐：60 BPM，D 羽调五声（D F G A C），原创。古琴（拨弦建模）起头，箫（合成）接长音；过了梧桐山鼓先进来，
      24 秒朱砂冒出的那一下是全片最重的落点，之后换成琵琶轮指，把一拍分成四份来加速（不改速度）；
      福田的楼阁每长一层敲一下木鱼，一路往上；拉远时箫的长音压过去；写片名时一个字一个古琴音，盖印前留空。
拟音：读 events.json（画面导出的 window.EV）：卷轴滚动、笔在纸上走、山立起来的轻敲、贴签、楼阁的层、写字、盖印。
环境：沿海段垫海浪。
运行（在库的根目录）：.venv/bin/python styles/scroll-map/demo/mix.py；build.sh 会先导出 events.json 再跑它"""
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
N = int((DUR + .5) * SR)
rng = np.random.default_rng(23)
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
def both(x, at, gain, pan=0.0, wet=.5):                           # 干声进配乐，另送一份进混响
    put(mus, x, at, gain, pan); put(rev, x, at, gain * wet, pan)

# ———— 乐器 ————
def qin(p, at, d=4.0, v=.7, pan=-.15, g=1.0, **kw): both(P.pluck('guqin', p, d, vel=v, **kw), at, g, pan, .7)
def pipa(p, at, d=.5, v=.6, pan=.3, g=.95, **kw): both(P.pluck('pipa', p, d, vel=v, **kw), at, g, pan, .35)
def xiao(p, at, d, v=.5, pan=.2, bend=0.0):                       # 箫：基音加两个弱泛音，气声跟着音高走，音头慢，后半段起颤音
    t = tt(d + .5); f = hz(p) * 2 ** ((bend * np.clip(t / d, 0, 1)) / 12)
    vib = 1 + .006 * np.sin(2 * np.pi * 4.8 * t) * np.clip((t - .7) / .8, 0, 1)
    ph = 2 * np.pi * np.cumsum(f * vib) / SR
    y = np.sin(ph) + .22 * np.sin(2 * ph + .4) + .07 * np.sin(3 * ph)
    br = X.bp(X.noise(d + .5), hz(p) * .9, hz(p) * 2.4) * .5
    env = np.clip(t / .28, 0, 1) ** 1.5 * np.clip((d + .5 - t) / .5, 0, 1) * (.85 + .15 * np.sin(2 * np.pi * .31 * t + 1))
    both((y + br) * env * .16, at, v, pan, 1.0)
def drum(at, v=1.0, pan=0.0):                                     # 大鼓：低频一记 + 鼓皮的闷噪
    d = .9; y = X.thump(1.0, 58)[:int(d * SR)]; y = np.pad(y, (0, max(0, int(d * SR) - len(y))))
    y = y + X.lp(X.noise(d), 260) * X.env_exp(d, .07) * .5 + .35 * np.sin(2 * np.pi * 116 * tt(d)) * X.env_exp(d, .12)
    both(y, at, .5 * v, pan, .5)
def rim(at, v=1.0, pan=0.0):                                      # 鼓边
    d = .18; y = (np.sin(2 * np.pi * 190 * tt(d)) + X.bp(X.noise(d), 700, 2600) * .7) * X.env_exp(d, .025)
    both(y, at, .3 * v, pan, .4)
def block(at, f=900, v=1.0, pan=0.0):                             # 木鱼
    d = .22; t = tt(d); y = (np.sin(2 * np.pi * f * t) + .4 * np.sin(2 * np.pi * f * 2.7 * t)) * X.env_exp(d, .035)
    both(y, at, .2 * v, pan, .6)

# ———— 配乐（时间就是拍：60 BPM） ————
# 展卷：一个低的散音，一个泛音
qin('D2', 1.0, 6, .8, g=1.1); qin('A4', 3.0, 4, .5, harmonic=True, pan=.1)
# 沿岸：稀的古琴句子，带滑音；箫 8 秒进
for at, p, d, v, kw in [(5, 'D3', 3, .7, {}), (6, 'F3', 2.5, .6, dict(bend=[(.35, 0), (.8, 2)])), (7.5, 'A3', 3, .65, dict(vib=(5, .2, .6))),
                        (9, 'C4', 2.5, .6, dict(bend=[(.3, 0), (.75, 2)])), (10.5, 'A3', 2.5, .55, {}), (12, 'G3', 3, .55, dict(bend=[(.5, 0), (1.1, -2)]))]:
    qin(p, at, d, v, **kw)
xiao('A4', 8, 3.6, .42); xiao('G4', 11.6, 1.6, .3, bend=-2)
# 大鹏所城：13.2–14.5 几乎无声，贴签落下的那一下只有一个泛音和一个低音
qin('D5', 14.5, 5, .55, harmonic=True, pan=.1, g=1.1); qin('D2', 14.5, 6, .6, g=.9); qin('A4', 16, 4, .45, harmonic=True, pan=-.3)
# 西行：古琴变成连续的八分音符往上走，箫吹长线，鼓 20 秒进、越敲越密
run = ['D3', 'A3', 'D4', 'A3', 'F3', 'C4', 'F4', 'C4', 'G3', 'D4', 'G4', 'D4', 'A3', 'D4', 'A4', 'D4']
for i in range(14):
    at = 17 + i * .5; qin(run[i % 16], at, 1.6, .5 + .02 * i, pan=-.25 + .03 * (i % 4))
for at, p, d, v in [(17, 'D5', 2, .4), (19, 'C5', 1, .4), (20, 'A4', 2, .45), (22, 'G4', .9, .45), (23, 'A4', .9, .5)]: xiao(p, at, d, v)
for at in (20, 21, 22, 22.5, 23, 23.25, 23.5, 23.625, 23.75, 23.875): drum(at, .35 + .5 * (at - 20) / 4)
# 朱砂：最重的落点，然后琵琶把一拍分成四份
drum(24, 1.5); qin('D2', 24, 6, .95, g=1.3); both(P.strum('guqin', ['D3', 'A3', 'D4'], 4, vel=.85, spread=.03), 24, 1.0, -.1, .7)
cells = [['D4', 'F4', 'A4', 'F4'], ['D4', 'G4', 'A4', 'G4'], ['F4', 'A4', 'C5', 'A4'], ['G4', 'A4', 'D5', 'A4']]
for bar in range(13):                                             # 24.5–37.5，每拍一组
    at0 = 24.5 + bar; cell = cells[(bar // 2) % 4]; up = 12 if bar >= 9 else 0
    for k in range(4):
        v = (.5 if k == 0 else .36) * (1 if bar < 12 else .6)
        pipa(midi(cell[k]) + up, at0 + k * .25, .5, v, pan=.3 - .1 * (k % 2))
    if bar < 12: drum(at0 + .5, .55 if bar % 2 == 0 else .4); rim(at0, .7); rim(at0 + .25, .45, .2); rim(at0 + .75, .5, -.2)
    if bar % 2 == 1: qin(['D2', 'F2', 'G2', 'A2'][(bar // 2) % 4], at0 + .5, 2.5, .7, g=.9)
for at, p, d, v in [(25, 'A4', 1.8, .45), (27, 'C5', .9, .45), (28, 'D5', 2.6, .5), (31, 'A4', 1.8, .4), (33, 'C5', 1.8, .42), (35, 'D5', 1.9, .5)]: xiao(p, at, d, v)
# 拉远：古琴一把往下的拂，箫的长音压过去
both(P.strum('guqin', ['D5', 'C5', 'A4', 'G4', 'F4', 'D4', 'A3', 'D3'], 5, vel=.75, spread=.07), 37, 1.0, -.1, .8)
xiao('D5', 37, 4.2, .5, bend=0); xiao('A4', 37.5, 3.6, .3, pan=-.2); drum(37, .9); drum(39, .5); drum(40.6, .7)
# 落款：一个字一个音；盖印前留空；印落下是全片最后一个重音，后面只留泛音
for ev in [e for e in EV if e['type'] == 'write']:
    i = sum(1 for e in EV if e['type'] == 'write' and e['t'] < ev['t']); qin(['D3', 'A3', 'F3', 'D3'][i], ev['t'], 3, .6 + .05 * i, pan=-.2 + .12 * i)
ts = next(e['t'] for e in EV if e['type'] == 'seal')
drum(ts, 1.25); block(ts, 520, 1.5)
qin('D4', ts + .45, 6, .5, harmonic=True, pan=-.2, g=1.1); qin('A4', ts + .55, 6, .45, harmonic=True, pan=.2, g=1.1); qin('D2', ts + .45, 6, .5, g=.8)

# ———— 拟音：跟着画面事件 ————
def roll(d, v=1.0):                                               # 卷轴在桌面上滚：木头的低滚 + 纸的沙沙
    t = tt(d); e = np.clip(t / .4, 0, 1) * np.clip((d - t) / .6, 0, 1)
    wood = X.lp(X.brown(d), 180) * (.6 + .4 * np.sin(2 * np.pi * 7 * t) ** 2)
    paper = X.bp(X.noise(d), 1800, 6000) * (.3 + .7 * np.abs(np.sin(2 * np.pi * 2.3 * t + 1))) * .12
    return (wood * 1.1 + paper) * e * v
def brush(d, v=1.0):                                              # 笔在纸上走：一阵一阵的沙沙，轻
    t = tt(d); e = np.clip(t / .5, 0, 1) * np.clip((d - t) / .8, 0, 1)
    sw = .35 + .65 * np.clip(np.sin(2 * np.pi * .9 * t) + .4 * np.sin(2 * np.pi * 2.1 * t + 2), 0, 1.4)
    return X.bp(X.noise(d), 2400, 7500) * sw * e * .1 * v
for e in EV:
    ty, at = e['type'], e['t']
    if ty == 'roll': put(fx, roll(e['d']), at, .2, -.4)
    elif ty == 'rollEnd': put(fx, X.clack(.7, 1.0), at, .5, -.6); put(fx, X.thump(.6, 90), at, .4, -.6)
    elif ty == 'brush': put(fx, brush(e['d']), at, .9, -.1)
    elif ty == 'peak':                                             # 山立起来：木头的一点，越大的山越低
        f = 1500 - 700 * e['v'] + rng.uniform(-60, 60); d = .12; put(fx, np.sin(2 * np.pi * f * tt(d)) * X.env_exp(d, .018), at, .07 + .08 * e['v'], e['pan'] * .7)
    elif ty == 'slip': put(fx, X.click(1.4, .8), at, .32, .1); put(fx, X.bp(X.noise(.08), 1500, 5000) * X.env_exp(.08, .02), at, .2, .1)
    elif ty == 'fort': put(fx, X.thump(.5, 110), at, .3, 0); block(at, 700, .9)
    elif ty == 'tier': block(at, 620 * 2 ** (e['i'] / 12 * 1.6), .8 + .05 * e['i'], .15)
    elif ty == 'write': put(fx, brush(.55, 2.6), at, .9, .45)
    elif ty == 'seal': put(fx, X.thump(1.0, 80), at, .7, .4); put(fx, X.clack(.55, 1.0), at, .45, .4)

# ———— 环境：沿海段的浪 ————
def bed(a, b, make, gain, fi=1.5, fo=2.0):
    d = b - a; x = make(d); t = tt(d); x = x * np.clip(t / fi, 0, 1) * np.clip((d - t) / fo, 0, 1)
    put(amb, x, a, gain, -.2); put(amb, np.roll(x, 7919), a, gain, .2)
bed(1.5, 25, lambda d: X.lp(X.noise(d), 2400) * (.2 + .8 * np.sin(2 * np.pi * .17 * tt(d)) ** 4) * .5, .26)
bed(36.5, 47.5, lambda d: X.lp(X.noise(d), 1800) * (.2 + .8 * np.sin(2 * np.pi * .15 * tt(d) + 1) ** 4) * .5, .14)

# ———— 混响、总线 ————
ir = rng.standard_normal(int(2.6 * SR)) * np.exp(-np.arange(int(2.6 * SR)) / (.55 * SR)); ir = X.lp(X.hp(ir, 220), 6500)
wet = np.stack([fftconvolve(rev[:, c], np.roll(ir, c * 331))[:N] for c in (0, 1)], 1) * .008
rms = lambda x: 20 * math.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
print(f'各路电平 dB：配乐 {rms(mus):.1f}  混响 {rms(wet):.1f}  拟音 {rms(fx):.1f}  环境 {rms(amb):.1f}')
mix = mus + wet + fx + amb
# 两处留空：大鹏所城贴签之前、盖印之前，把总线压下去
g = np.ones(N)
for a, b, lo in ((13.3, 14.46, .12), (ts - .55, ts - .02, .03)):
    ia, ib = int(a * SR), int(b * SR); f = int(.25 * SR); g[ia:ib] = lo; g[ia - f:ia] = np.linspace(1, lo, f); g[ib:ib + 480] = np.linspace(lo, 1, 480)
mix *= g[:, None]
peak = np.abs(mix).max(); mix = mix / peak * .9
for c in (0, 1): mix[:, c] = X.limit(X.compress(mix[:, c], thr=.32, ratio=2.2), .92)
lowE = np.sqrt(np.mean(X.lp(mix[:, 0], 120) ** 2)); allE = np.sqrt(np.mean(mix[:, 0] ** 2))
os.makedirs(os.path.join(D, 'out'), exist_ok=True)
sf.write(os.path.join(D, 'out', 'mix.wav'), mix[:int(DUR * SR)].astype(np.float32), SR)
print('每 2 秒的电平 dB：' + ' '.join(f'{rms(mix[int(a * SR):int((a + 2) * SR)]):.0f}' for a in range(0, int(DUR), 2)))
print(f'mix.wav {DUR}s  peak {np.abs(mix).max():.2f}  低频占比 {20 * math.log10(lowE / allE):.1f} dB')
