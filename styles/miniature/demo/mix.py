"""《福田站，切开看》的声音 → out/mix.wav（48 kHz 立体声）。全部现场合成（numpy + core/audio 的 sfx.py、pluck.py），不用任何录音、采样或现成音乐。
配乐：84 BPM，F 大调五声，原创。音色是"桌上的小东西"：拇指琴、音乐盒、马林巴、玻璃钟，底下一层很柔的长音（pad）；
      地面一段只有拇指琴和鸟，拉开以后进马林巴的八分音型，三层展开前收成近乎无声，展开落定时一个钟和弦；
      下到地铁层换成 Dm、更低更暗，高铁层 Gm → C；合拢、天黑时音乐退到只剩 pad，亮灯前 0.8 秒近乎无声，
      亮灯的一下之后音乐盒接上，片尾落 F 大九和弦。
动作音：读 events.json（画面导出的 window.EV）——公交进站（柴油怠速、刹车放气、开门两声提示）、地铁和高铁进出站（轮轨、刹车、到站提示音）、
      层抬起和落下（小电机、木头"嗒"）、镜头移动（很轻的风）、说明卡（纸声）、亮灯（继电器"咔"+ 灯管嗡声）、城市的窗一批批亮（玻璃小音）。
环境：地面是街上的空气和鸟，地下是低沉的站厅嗡声，天黑后是虫鸣和远处的城市。
画面事件用 neo/audio/cues.py 读（声音的时间取自画面，不会漂），结尾用 neo/audio/master.py 定响度并检查。
运行（库的根目录）：.venv/bin/python styles/miniature/demo/mix.py；build.sh 会先导出 events.json 再跑它。"""
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
rng = np.random.default_rng(2015)
mus = np.zeros((N, 2), np.float32); rev = np.zeros((N, 2), np.float32); fx = np.zeros((N, 2), np.float32); amb = np.zeros((N, 2), np.float32)
tt = X.t_
hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)
BPM = 84; B = 60 / BPM


def put(buf, x, at, gain=1.0, pan=0.0):
    i = int(round(at * SR))
    if i >= N or gain <= 0: return
    if i < 0: x = x[-i:]; i = 0
    x = np.asarray(x, np.float32)[:N - i]; l = math.cos((pan + 1) * math.pi / 4); r = math.sin((pan + 1) * math.pi / 4)
    buf[i:i + len(x), 0] += x * gain * l * 1.414; buf[i:i + len(x), 1] += x * gain * r * 1.414


def fade(x, a=.01, b=.05):
    x = np.array(x, np.float64); na, nb = max(1, int(a * SR)), max(1, int(b * SR))
    x[:na] *= np.linspace(0, 1, na); x[-nb:] *= np.linspace(1, 0, nb); return x


# ———————————————————— 音色（按 (音色, 音高) 缓存）————————————————————
_cache = {}
def voice(kind, m):
    key = (kind, m)
    if key in _cache: return _cache[key]
    f = hz(m)
    if kind == 'marimba':
        t = tt(1.2); y = np.sin(2 * np.pi * f * t) * np.exp(-t / .36) + .35 * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t / .05) + .1 * np.sin(2 * np.pi * f * 9.8 * t) * np.exp(-t / .015)
    elif kind == 'glass':
        t = tt(2.6); idx = 1.4 * np.exp(-t / .2) + .2
        y = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * 3.5 * t)) * np.exp(-t / 1.0) * .8
    else:
        y = PL.pluck({'kalimba': 'kalimba', 'box': 'music_box', 'harp': 'harp'}[kind], m, 1.8, vel=.6)
        y = np.asarray(y, np.float64)[:int(2.2 * SR)]; y = y / (np.abs(y).max() + 1e-9) * .8
    y = np.asarray(y, np.float32); y[:48] *= np.linspace(0, 1, 48).astype(np.float32)
    _cache[key] = y; return y


def note(kind, m, at, g, pan=0.0, wet=.5):
    x = voice(kind, m); put(mus, x, at, g, pan); put(rev, x, at, g * wet, pan)


def padchord(ms, a, b, v=.5, fi=1.2, fo=1.5, cut=1600):
    d = b - a
    if d <= .2: return
    t = tt(d); env = np.clip(t / fi, 0, 1) * np.clip((d - t) / fo, 0, 1); y = np.zeros(len(t))
    for j, m in enumerate(ms):
        f = hz(m)
        for det in (-.08, .08):
            ph = 2 * np.pi * f * (1 + det / 100) * t + j
            y += np.sin(ph) + .28 * np.sin(2 * ph) + .1 * np.sin(3 * ph)
    y = X.lp(y * env / len(ms), cut) * (1 + .04 * np.sin(2 * np.pi * .21 * t))
    put(amb, y, a, v * .16, -.25); put(amb, np.roll(y, 977), a, v * .16, .25)


# ———————————————————— 画面上的关键时刻 ————————————————————
t_bus = K.at('stop', k='bus'); t_metro = K.at('stop', k='metro'); t_hsr = K.at('stop', k='hsr')
lifts = K.events('lift'); settles = K.events('settle')
t_up = min(e['t'] for e in lifts if e['up']); t_up1 = max(e['t'] for e in settles if e['up'])
t_dn = min(e['t'] for e in lifts if not e['up']); t_dn1 = max(e['t'] for e in settles if not e['up'])
t_lights = K.at('lights'); t_title = K.at('title'); dusk = K.events('dusk')[0]
cams = K.events('cam')

# ———————————————————— 配乐 ————————————————————
PENT = [0, 2, 4, 7, 9]                                   # F 大调五声：F G A C D
F4 = 65
def deg(n, base=F4): return base + 12 * (n // 5) + PENT[n % 5]
grid = lambda a, b, step: [a + k * step for k in range(int((b - a) / step + 1e-6))]

# 1) 地面（0 → 拉开前）：拇指琴，两拍一个音，慢慢往上走
for k, at in enumerate(grid(.6, cams[0]['t'] + .2, 2 * B)):
    note('kalimba', deg([2, 4, 3, 5, 4, 6][k % 6]), at, .30, -.3 + .12 * (k % 5), .6)
# 2) 拉开 → 展开前：马林巴八分音型 + 拇指琴旋律，pad Fmaj7
t_q0 = t_up - .9                                         # 近乎无声：展开前 0.9 秒
pat = [0, 2, 4, 2, 5, 4, 2, 4]
for k, at in enumerate(grid(cams[0]['t'], t_q0, B / 2)):
    note('marimba', deg(pat[k % 8], 53), at, .17 + .05 * (k % 4 == 0), .25 * math.sin(k * .7), .3)
for k, (n, at) in enumerate(zip([7, 6, 5, 7, 9, 8, 7, 5], grid(cams[0]['t'] + 2 * B, t_q0, 2 * B))):
    note('box', deg(n), at, .26, .2, .7)
padchord([53, 57, 60, 64], cams[0]['t'], t_q0 + .4, .55, 1.6, .5)
# 3) 展开：低音 F 持续，落定时一个玻璃钟和弦
for j, m in enumerate([65, 69, 72, 76, 79]): note('glass', m, t_up1 + j * .05, .22, -.5 + .25 * j, .9)
note('harp', 41, t_up1, .5, 0, .4)
# 4) 层名停留：Bbmaj7 → F，马林巴更舒展，音乐盒点旋律
t_sec4 = cams[2]['t']                                    # 下到地铁层的那一刻
padchord([46, 50, 53, 57], t_up1, (t_up1 + t_sec4) / 2 + .6, .7)
padchord([41, 48, 53, 57, 60], (t_up1 + t_sec4) / 2, t_sec4 + 1.2, .7)
for k, at in enumerate(grid(t_up1 + B, t_sec4, B / 2)):
    note('marimba', deg([0, 2, 4, 5, 4, 2][k % 6], 53), at, .15, .3 * math.sin(k * .5), .3)
for n, at in zip([9, 8, 7, 8, 10, 9], grid(t_up1 + B, t_sec4, 2 * B)): note('box', deg(n), at, .24, -.2, .7)
# 5) 地铁层：Dm7，暗一点，马林巴低八度，拇指琴在拍上
t_sec5 = cams[3]['t']
padchord([50, 53, 57, 60], t_sec4, t_sec5 + 1.0, .75, 1.5, 1.5, 1300)
for k, at in enumerate(grid(t_sec4 + .2, t_sec5, B / 2)):
    if k % 8 in (3, 7): continue
    note('marimba', [50, 53, 57, 60, 57, 53][k % 6], at, .15, .3 * math.sin(k * .9), .3)
for k, at in enumerate(grid(t_sec4 + 4 * B, t_sec5, 4 * B)): note('kalimba', [69, 72, 74, 72][k % 4], at, .24, .35, .6)
# 6) 高铁层：Gm7 → C，更开阔
t_sec6 = cams[4]['t']
padchord([43, 50, 53, 58], t_sec5, (t_sec5 + t_sec6) / 2 + .6, .8, 1.2, 1.5, 1500)
padchord([48, 52, 55, 58, 62], (t_sec5 + t_sec6) / 2, t_sec6 + 1.5, .8, 1.2, 2.0, 1500)
for k, at in enumerate(grid(t_sec5 + .2, t_sec6, B / 2)):
    note('marimba', deg([1, 3, 5, 3, 6, 5, 3, 1][k % 8], 55) if k < 32 else deg([2, 4, 6, 4][k % 4], 53), at, .15, .3 * math.sin(k * .6), .3)
for n, at in zip([7, 8, 9, 10, 9, 8, 7, 8], grid(t_sec5 + 2 * B, t_sec6, 2 * B)): note('box', deg(n), at, .22, .15, .7)
# 7) 合拢、天黑：只剩 pad（Bbmaj7），亮灯前 0.8 秒近乎无声
t_q1 = t_lights - .8
padchord([46, 50, 53, 57, 60], t_dn - .3, t_q1 + .3, .6, 1.0, .9, 1100)
for j, m in enumerate([58, 65]): note('glass', m, t_dn1 + j * .06, .16, .2 - .4 * j, .9)
# 8) 亮灯以后：音乐盒慢慢的旋律，片尾 F 大九
padchord([41, 48, 53, 57, 60, 67], t_lights, DUR + .3, .85, 1.5, 3.0, 1500)
for k, (n, at) in enumerate(zip([5, 7, 9, 8, 7, 10, 9, 7, 8], grid(t_lights + .6, t_title, B)), start=0):
    note('box', deg(n), at, .26, .3 * math.sin(k), .8)
for j, m in enumerate([53, 60, 65, 67, 69, 72, 76]): note('harp', m, t_title + .1 + j * .14, .32, -.5 + .16 * j, .6)
note('glass', 89, t_title + 1.2, .22, .1, 1.0); note('harp', 41, t_title, .5, 0, .4)

# ———————————————————— 动作音：按画面事件 ————————————————————
def engine(d, v=1.0, f0=34.0, drift=0.0):              # 公交柴油机：低频谐波 + 粗糙的噪声
    t = tt(d); f = f0 * (1 + drift * t / d); ph = 2 * np.pi * np.cumsum(f) / SR
    y = sum(np.sin(k * ph) / k ** .8 for k in range(1, 9)) * (1 + .25 * np.sin(ph * .5))
    y = X.lp(y, 380) + X.bp(X.noise(d), 80, 500) * .3
    return y * v
def hiss(d=.7, v=1.0):                                 # 刹车放气"嘶"
    t = tt(d); return X.bp(X.noise(d), 2200, 7500) * np.exp(-t / (d * .35)) * np.clip(t / .015, 0, 1) * v
def chime(m1, m2, at, g, pan=0):                       # 到站提示：两个音（通用的音高，不是真实线路的提示音）
    note('glass', m1, at, g, pan, .8); note('glass', m2, at + .38, g, pan, .8)
def rails(d, v=1.0, v0=1.0, v1=0.0, pitch=1.0, smooth=0.0):   # 轮轨：滚动的低噪声 + 过钢轨接缝的"咔哒"，速度从 v0 变到 v1
    t = tt(d); sp = v0 + (v1 - v0) * (t / d) ** (.6 if v1 < v0 else 1.6)
    roll = X.bp(X.brown(d), 60 * pitch, 900 * pitch) * (.25 + .75 * sp) * 1.4
    y = roll.copy(); pos = np.cumsum(sp) / SR * 9.0; hits = np.nonzero(np.diff(np.floor(pos)) > 0)[0]
    if smooth < 1:
        for i in hits:
            for o in (0, int(.07 * SR / max(.25, sp[i]))):
                x = X.bp(X.noise(.05), 300 * pitch, 2400 * pitch) * np.exp(-tt(.05) / .008) * .9 * sp[i] * (1 - smooth); j = i + o; y[j:j + len(x)] += x[:len(y) - j]
    return fade(y, .05, .2) * v
def squeal(d=.9, v=1.0, f=2900):
    t = tt(d); return np.sin(2 * np.pi * f * t + 3 * np.sin(2 * np.pi * 6 * t)) * np.sin(np.pi * t / d) ** 2 * v
def motor(d, v=1.0, up=1):                             # 层升降的小电机：一条随速度起伏的锯齿，低通得很软 + 齿轮的细碎声
    t = tt(d); s = np.sin(np.pi * t / d); f = 95 + 45 * s * (1 if up else .8)
    ph = 2 * np.pi * np.cumsum(f) / SR; y = X.lp(((ph / (2 * np.pi)) % 1) * 2 - 1, 900) * s
    y += X.bp(X.noise(d), 2500, 6000) * s * (.5 + .5 * np.sin(2 * np.pi * 38 * t)) * .15
    return y * v
def tick(v=1.0, f=3200):
    d = .03; t = tt(d); return (np.sin(2 * np.pi * f * t) * np.exp(-t / .004) + X.hp(X.noise(d), 3000) * np.exp(-t / .003) * .5) * v
def paper(d=.4, v=1.0):
    t = tt(d); return X.bp(X.noise(d), 1800, 7000) * np.sin(np.pi * t / d) ** 2 * .3 * v

for e in K.each('arrive', 'stop', 'depart'):
    ty, at, k = e['type'], e['t'], e['k']
    if k == 'bus':
        if ty == 'arrive':
            d = e['d'] + 1.2; x = engine(d, 1.0, 38, -.25); t = tt(d); x *= np.clip(t / .5, 0, 1) * (1 - .55 * np.clip((t - e['d']) / .6, 0, 1)) * np.clip((d - t) / .3, 0, 1)
            put(fx, x, at, .22, -.6); put(fx, X.bp(X.noise(.5), 1500, 4000) * np.exp(-tt(.5) / .2) * .4, at + e['d'] - .45, .25, -.2)   # 轮胎在地面减速
        elif ty == 'stop':
            put(fx, hiss(.8), at + .15, .32, -.3); chime(84, 79, at + 1.0, .16, -.3)
            x = engine(1.2, 1, 34) * np.clip(1 - tt(1.2) / 1.2, 0, 1); put(fx, x, at, .12, -.3)
        else:
            d = e['d']; x = engine(d, 1.0, 34, .5) * np.clip(tt(d) / .4, 0, 1) * np.clip((d - tt(d)) / 1.2, 0, 1); put(fx, x, at, .2, .4); put(fx, hiss(.5), at - .3, .15, 0)
    elif k == 'metro':
        if ty == 'arrive':
            d = e['d'] + .3; put(fx, rails(d, 1.0, 1.0, .05), at, .26, .5); put(fx, squeal(1.1, .06, 2700), at + e['d'] - 1.3, 1.0, .2)
        elif ty == 'stop':
            chime(81, 76, at + .5, .2, 0); put(fx, hiss(.5, .6), at + .3, .2, 0)
        else:
            put(fx, rails(e['d'], 1.0, .05, 1.0), at, .24, -.4)
    else:
        if ty == 'arrive':
            d = e['d'] + .3; put(fx, rails(d, 1.0, 1.0, .03, .7, .7), at, .3, -.5)
            w = X.lp(X.noise(d), 700) * np.sin(np.pi * tt(d) / d) ** 2; put(fx, w, at, .2, -.3)       # 车头推着的风
        elif ty == 'stop':
            chime(77, 84, at + .5, .2, 0)
        else:
            d = e['d']; put(fx, rails(d, 1.0, .03, 1.0, .7, .7), at, .28, .5)
            w = X.lp(X.noise(d), 900) * (tt(d) / d) ** 1.5 * np.clip((d - tt(d)) / .6, 0, 1); put(fx, w, at, .22, .5)

for e in lifts:
    put(fx, motor(e['d'], 1.0, e['up']), e['t'], .1, .4 if e['k'] == 'ground' else .2)
for e in settles:
    put(fx, X.clack(.8 if e['up'] else .65, 1.0), e['t'], .32, .3); put(fx, X.thump(1.0, 60), e['t'], .25, 0)
for e in cams:                                         # 镜头移动：很轻的风（推近或拉远都是一口气）
    d = e['d']; t = tt(d); w = X.bp(X.noise(d), 300, 2600) * np.sin(np.pi * t / d) ** 3 * .5
    put(fx, w, e['t'], .09, -.2); put(fx, np.roll(w, 3000), e['t'], .09, .2)
for e in K.events('card'): put(fx, paper(.35), e['t'], .5, -.4); put(fx, tick(.5, 2400), e['t'] + .05, .25, -.4)
# 亮灯：继电器"咔"、一声低沉的合闸，灯管的嗡声铺进来
put(fx, X.thump(1.0, 55), t_lights, .5, 0); put(fx, tick(1.0, 1800), t_lights, .5, -.2); put(fx, tick(.8, 2600), t_lights + .03, .4, .2)
d = DUR - t_lights; t = tt(d); hum = (np.sin(2 * np.pi * 100 * t) + .4 * np.sin(2 * np.pi * 200 * t) + .2 * np.sin(2 * np.pi * 300 * t)) * np.clip(t / .3, 0, 1) * np.clip((d - t) / 1.5, 0, 1)
put(amb, X.lp(hum, 500), t_lights, .02, 0)
for e in K.events('window'):                           # 城市的窗一批批亮：一粒玻璃音，一批比一批高
    note('glass', [84, 86, 88, 91, 93, 96][e['i']], e['t'], .1, -.6 + .24 * e['i'], 1.0)

# ———————————————————— 环境 ————————————————————
def bed(a, b, kind, v):
    d = b - a; t = tt(d); env = np.clip(t / 1.0, 0, 1) * np.clip((d - t) / 1.2, 0, 1)
    if kind == 'street':
        y = X.lp(X.brown(d), 420) * 1.6 + X.bp(X.noise(d), 1200, 4000) * .05
    elif kind == 'under':
        y = X.lp(X.brown(d), 180) * 2.2 + (np.sin(2 * np.pi * 60 * t) * .15 + np.sin(2 * np.pi * 120 * t) * .08) * (1 + .2 * np.sin(2 * np.pi * .3 * t))
    else:
        y = X.lp(X.brown(d), 260) * 1.2
    put(amb, y * env, a, v, -.15); put(amb, np.roll(y, 5111) * env, a, v, .15)
bed(0, t_q0 + .3, 'street', .06); bed(t_up1 - .3, t_sec4 + .8, 'street', .035)
bed(t_sec4 - .3, t_dn + 1.0, 'under', .05); bed(dusk['t'], DUR + .3, 'night', .045)
for k in range(9):                                     # 鸟（地面那几秒）：快速上滑的两三声
    at = .4 + k * 1.3 + rng.uniform(0, .5)
    if at > t_q0 - .4: break
    for j in range(rng.integers(2, 4)):
        d = .07; t = tt(d); f = 3800 + 1600 * t / d + rng.uniform(-300, 300)
        put(amb, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / d), at + j * .11, .02, rng.uniform(-.8, .8))
t0 = dusk['t'] + 1.5                                   # 天黑：虫鸣，三只，不同的节奏
for c, (f, rate, pan) in enumerate([(4300, 2.6, -.6), (4900, 3.3, .5), (3900, 2.1, .1)]):
    at = t0 + c * .7
    while at < DUR - .6:
        if not (t_q1 - .1 < at < t_lights + .3):
            for j in range(3):
                d = .035; t = tt(d); put(amb, np.sin(2 * np.pi * f * t) * np.sin(np.pi * t / d) * (1 + np.sin(2 * np.pi * 70 * t)) * .5, at + j * .05, .012 * min(1, (at - t0) / 2), pan)
        at += 1 / rate + rng.uniform(0, .08)

K.report() or sys.exit('mix.py: 声音没有落在画面事件上（见上表）：改 timeline.js 或这里的时间，让两边重新对齐')

# ———————————————————— 混响（桌面模型的小房间：短而亮）、总线 ————————————————————
ir = rng.standard_normal(int(1.6 * SR)) * np.exp(-np.arange(int(1.6 * SR)) / (.38 * SR)); ir = X.lp(X.hp(ir, 250), 7000)
wet = np.stack([fftconvolve(rev[:, c], np.roll(ir, c * 271))[:N] for c in (0, 1)], 1) * .012
rms = lambda x: 20 * math.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
def tame(x, crest_db):
    c = np.sqrt(np.mean(x ** 2)) * 10 ** (crest_db / 20)
    return np.stack([X.limit(x[:, k], c, .004) for k in (0, 1)], 1).astype(np.float32)
fx = tame(fx, 14); mus = tame(mus, 13)
print(f'各路电平 dB：旋律 {rms(mus):.1f}  混响 {rms(wet):.1f}  pad/环境 {rms(amb):.1f}  动作音 {rms(fx):.1f}')
mix = mus + wet + fx + amb
# 两处近乎无声：展开前、亮灯前（音乐和环境都压下去，只剩一点点空气）
g = np.ones(N)
for a, b in ((t_q0, t_up + .1), (t_q1, t_lights - .02)):
    ia, ib, f = int(a * SR), int(b * SR), int(.25 * SR)
    g[ia:ib] = np.minimum(g[ia:ib], .12); g[ia - f:ia] = np.minimum(g[ia - f:ia], np.linspace(1, .12, f)); g[ib:ib + 240] = np.minimum(g[ib:ib + 240], np.linspace(.12, 1, 240))
mix *= g[:, None]
fo = int(1.2 * SR); n0 = int(DUR * SR); mix[n0 - fo:n0] *= np.linspace(1, 0, fo)[:, None] ** 1.5
mix = M.master(mix[:n0])
lowE = np.sqrt(np.mean(X.lp(mix[:, 0], 120) ** 2)); allE = np.sqrt(np.mean(mix[:, 0] ** 2))
os.makedirs(os.path.join(D, 'out'), exist_ok=True)
sf.write(os.path.join(D, 'out', 'mix.wav'), mix.astype(np.float32), SR)
print('每 2 秒的电平 dB：' + ' '.join(f'{rms(mix[int(a * SR):int((a + 2) * SR)]):.0f}' for a in range(0, int(DUR), 2)))
print(f'mix.wav {DUR}s  peak {np.abs(mix).max():.2f}  低频占比 {20 * math.log10(lowE / allE):.1f} dB')
M.check(os.path.join(D, 'out', 'mix.wav')) or sys.exit('mix.py: 这条混音到了 mux.sh 会被重新分配强弱（见上一行），先把峰值或动态范围收住')
