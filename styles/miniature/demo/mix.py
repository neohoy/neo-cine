"""《一座高铁站怎么运转》的声音 → out/mix.wav（48 kHz 立体声）。全部现场合成（numpy + core/audio 的 sfx.py、pluck.py），不用任何录音、采样或现成音乐。
配乐：90 BPM，D 大调五声，原创。音色是"桌上的小东西"：音乐盒、拇指琴、马林巴、玻璃钟、竖琴，底下一层很软的长音（pad）。
      开场只有音乐盒和 pad；每讲一步，拇指琴从这一步的和弦往上走三个音，马林巴的八分音型轻轻垫着，和弦一步一换；
      讲完退回全景，音乐收到只剩 pad；亮灯前 0.6 秒近乎无声，亮灯的一下之后玻璃钟一批一个音，片尾落在 D 大九和弦上。
动作音：读 events.json（画面导出的 window.EV），时间全取自画面——出租车进站停车开走、闸机门翼和提示音、安检传送带、
      扶梯、两趟车的轮轨 / 刹车 / 开关门、屋顶抬起和落下（小电机、木头"嗒"）、标注出现（纸声 + 一粒玻璃音）、镜头移动（很轻的风）、
      亮灯（继电器"咔"）。到站提示音是通用的两个音，不是任何运营方的真实提示音。
环境：站外是空气和鸟，候车厅是低低的人声嗡嗡，站台是空旷的风，地道是低沉的嗡声，天黑后是虫鸣。
画面事件用 neo/audio/cues.py 读，结尾用 neo/audio/master.py 定响度（−14 LUFS）并检查。
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
rng = np.random.default_rng(1114)
mus = np.zeros((N, 2), np.float32); rev = np.zeros((N, 2), np.float32); fx = np.zeros((N, 2), np.float32); amb = np.zeros((N, 2), np.float32)
tt = X.t_
hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)
BPM = 90; B = 60 / BPM


def put(buf, x, at, gain=1.0, pan=0.0):
    i = int(round(at * SR))
    if i >= N or gain <= 0: return
    x = np.asarray(x, np.float32)
    if i < 0: x = x[-i:]; i = 0
    x = x[:N - i]; l = math.cos((pan + 1) * math.pi / 4); r = math.sin((pan + 1) * math.pi / 4)
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
        t = tt(1.0); y = np.sin(2 * np.pi * f * t) * np.exp(-t / .3) + .3 * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t / .04)
    elif kind == 'glass':
        t = tt(2.4); idx = 1.3 * np.exp(-t / .18) + .2
        y = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * 3.5 * t)) * np.exp(-t / .9) * .8
    else:
        y = PL.pluck({'kalimba': 'kalimba', 'box': 'music_box', 'harp': 'harp'}[kind], m, 1.8, vel=.6)
        y = np.asarray(y, np.float64)[:int(2.2 * SR)]; y = y / (np.abs(y).max() + 1e-9) * .8
    y = np.asarray(y, np.float32); y[:48] *= np.linspace(0, 1, 48).astype(np.float32)
    _cache[key] = y; return y


def note(kind, m, at, g, pan=0.0, wet=.5):
    x = voice(kind, m); put(mus, x, at, g, pan); put(rev, x, at, g * wet, pan)


def padchord(ms, a, b, v=.5, fi=1.2, fo=1.5, cut=1500):
    d = b - a
    if d <= .2: return
    t = tt(d); env = np.clip(t / fi, 0, 1) * np.clip((d - t) / fo, 0, 1); y = np.zeros(len(t))
    for j, m in enumerate(ms):
        f = hz(m)
        for det in (-.07, .07):
            ph = 2 * np.pi * f * (1 + det / 100) * t + j
            y += np.sin(ph) + .25 * np.sin(2 * ph)
    y = X.lp(y * env / len(ms), cut) * (1 + .04 * np.sin(2 * np.pi * .19 * t))
    put(amb, y, a, v * .16, -.25); put(amb, np.roll(y, 977), a, v * .16, .25)


# ———————————————————— 画面上的关键时刻 ————————————————————
steps = K.events('step')                       # 7 步讲解
t_step = {e['n']: e['t'] for e in steps}
lifts = K.events('lift'); t_up, t_down = lifts[0]['t'], lifts[1]['t']
t_lights = K.events('lights')[0]['t']; t_end = K.at('end'); t_dusk = K.at('dusk'); t_title = K.at('title')
D3, A3 = 50, 57
# 每一步一个和弦（MIDI）：1 D  2 Bm7  3 Gmaj7  4 Asus  5 D/F#→G→A  6 Bm7  7 Gmaj7
CH = {1: [50, 57, 62, 66], 2: [47, 54, 57, 62], 3: [43, 50, 54, 59], 4: [45, 52, 57, 62], 5: [42, 50, 57, 62], 6: [47, 54, 57, 62], 7: [43, 50, 54, 59]}
PENT = [0, 2, 4, 7, 9]                          # D 大调五声：D E F# A B
def deg(n, base=62): return base + 12 * (n // 5) + PENT[n % 5]

# ———————————————————— 配乐 ————————————————————
# 开场：pad D 大九 + 音乐盒，两拍一个音，慢慢往上
padchord([50, 57, 64, 66, 69], 0, t_step[1] + .8, v=.55)
for k, n in enumerate([0, 2, 4, 3, 5, 4, 7, 6]):
    at = t_title + k * 2 * B
    if at > t_step[1] - .3: break
    note('box', deg(n, 74), at, .2, (k % 2) * .3 - .15)
# 屋顶抬起：玻璃钟一个和弦
for j, m in enumerate([62, 69, 74]): note('glass', m, t_up + 2.6 + j * .05, .1, -.2 + j * .2, .7)
# 每一步：pad 换和弦，拇指琴三个音往上走，马林巴八分音型垫着
bounds = [t_step[n] for n in range(1, 8)] + [t_down]
for n in range(1, 8):
    a, b = bounds[n - 1], bounds[n]
    ch = CH[n]
    if n == 5:      # 最长的一步：D/F# → G → A
        thirds = [a, a + (b - a) / 3, a + 2 * (b - a) / 3, b]
        for (x0, x1), c in zip(zip(thirds, thirds[1:]), [[42, 50, 57, 62], [43, 50, 55, 59], [45, 52, 57, 61]]): padchord(c, x0 - .3, x1 + .6, v=.5)
    else:
        padchord(ch, a - .3, b + .6, v=.5)
    s0 = a + .3
    for j, m in enumerate([ch[1] + 12, ch[2] + 12, ch[3] + 12]): note('kalimba', m, s0 + j * B / 2, .22, -.3 + j * .3)
    # 马林巴：每拍一个八分音型（和弦音），很轻；步与步之间留半拍空
    k = 0; at = s0 + 2 * B
    while at < b - .4:
        m = ch[[1, 2, 3, 2][k % 4]] + 12
        note('marimba', m, at, .07 + .02 * (k % 2 == 0), (k % 2) * .4 - .2, .3); at += B / 2; k += 1
# 讲完退回全景：只剩 pad（Gmaj7 → D），亮灯前近乎无声
padchord([43, 50, 54, 59], t_down - .3, t_lights - .5, v=.45)
# 亮灯以后：竖琴往上的 D 大九分解和弦，音乐盒落两个音
for j, m in enumerate([50, 57, 62, 64, 66, 69, 74, 76]): note('harp', m, t_lights + .15 + j * B / 3, .2, -.4 + j * .1, .6)
padchord([50, 57, 64, 66, 69], t_lights, DUR + .3, v=.6, fi=.8, fo=2.0)
note('box', 81, t_end + .2, .2, .2); note('box', 78, t_end + .2 + B, .18, -.1); note('box', 74, t_end + .2 + 2.5 * B, .2, 0)

# ———————————————————— 动作音：按画面事件 ————————————————————
def rumble(d, v0, v1, cut=(500, 120), clicks=True, gap=1.1):
    """轮轨：低噪声的滚动声，随速度（v0 → v1，0–1）变响变亮；过钢轨接缝的"咔哒"随速度变疏"""
    t = tt(d); v = np.linspace(v0, v1, len(t))
    y = X.lp(X.brown(d), 260) * (.3 + v) + X.bp(X.noise(d), 300, 900) * .08 * v
    y = y * np.clip(t / .3, 0, 1) * np.clip((d - t) / .4, 0, 1)
    if clicks:
        pos, tt0 = 0.0, 0.0
        while tt0 < d - .1:
            sp = v0 + (v1 - v0) * tt0 / d
            if sp < .04: break
            for dd in (0, .09):
                i = int((tt0 + dd) * SR); c = X.clack(.7, .5 * sp); y[i:i + len(c)] += c[:len(y) - i] * .5
            tt0 += gap / max(sp, .05) * .25
    return y
def hiss(d=.6): return X.hp(X.noise(d), 2500) * np.exp(-tt(d) / (d / 3)) * .4
def chime(at, g, pan, m1=76, m2=72):         # 通用的两个音（大三度下行），不是真实运营方的提示音
    for j, m in enumerate((m1, m2)):
        t = tt(1.0); y = np.sin(2 * np.pi * hz(m) * t) * np.exp(-t / .35) * .6
        put(fx, y, at + j * .32, g, pan); put(rev, y, at + j * .32, g * .4, pan)
def motor(d, v=1.0):
    t = tt(d); s = np.sin(np.pi * np.clip(t / d, 0, 1)); f = 90 + 70 * s
    y = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * .2; y = X.lp(y, 700) * s
    return y + X.bp(X.noise(d), 2000, 5000) * .02 * s
def beep(f=1650, d=.09): t = tt(d); return np.sin(2 * np.pi * f * t) * np.sin(np.pi * t / d) * .35
def paper(d=.3): return X.bp(X.noise(d), 1500, 6000) * np.exp(-tt(d) / .07) * .4
def air(d): t = tt(d); return X.bp(X.noise(d), 300, 1600) * np.sin(np.pi * t / d) ** 2 * .12

for e in K.each('arrive', 'stop', 'doors', 'depart'):
    k, t, ty = e['k'], e['t'], e['type']
    if k == 'taxi':
        if ty == 'arrive':
            d = e['d']; t_ = tt(d); y = X.lp(X.brown(d), 180) * (1.2 - .7 * t_ / d) + np.sin(2 * np.pi * 38 * t_) * .1
            put(fx, y * np.clip(t_ / .6, 0, 1), t, .4, -.6)
        elif ty == 'stop':
            put(fx, X.thump(.4, 90), t + .7, .35, -.4); put(fx, X.clack(1.3, .5), t + .75, .25, -.4)     # 开车门、关后备箱
        elif ty == 'depart':
            d = e['d']; t_ = tt(d); y = X.lp(X.brown(d), 220) * (.4 + .8 * t_ / d) * np.clip((d - t_) / 1.2, 0, 1)
            put(fx, y, t, .4, .5)
        continue
    pan0 = -.7 if k == 'A' else .7                 # A 从左边开进来，B 从右边
    if ty == 'arrive':
        put(fx, rumble(e['d'] + .3, 1.0, .02), e['t'], .55 if k == 'A' else .4, pan0 * .6)
        put(fx, X.bp(X.noise(1.2), 2600, 3400) * np.sin(np.pi * tt(1.2) / 1.2) * .08, e['t'] + e['d'] - 1.3, .4, pan0 * .3)   # 刹车的一点尖声
    elif ty == 'stop':
        put(fx, hiss(.7), t + .05, .3, pan0 * .2)
    elif ty == 'doors':
        if e['open']: chime(t - .15, .22 if k == 'A' else .14, pan0 * .2)
        put(fx, hiss(.45), t + .15, .2, pan0 * .2); put(fx, X.clack(.8, .4), t + .75, .2, pan0 * .2)
    elif ty == 'depart':
        put(fx, rumble(e['d'] + 1.5, .02, 1.0), t, .55 if k == 'A' else .4, -pan0 * .5)

for e in K.events('gate'):                     # 闸机：一声提示、门翼收回的"嗖"、关上的轻响
    pan = -.5 if e['k'] == 'idGates' else (.0 if e['k'] == 'ticketGates' else .6)
    put(fx, beep(1650 if e['k'] != 'exitGates' else 1400), e['t'] + .05, .12, pan)
    put(fx, X.bp(X.noise(.18), 800, 3000) * np.sin(np.pi * tt(.18) / .18) * .3, e['t'] + .12, .1, pan)
for e in K.events('belt'): put(fx, motor(e['d'] + .3), e['t'], .12, -.5)
for e in K.events('ride'):
    d = e['d']; t_ = tt(d); y = X.lp(X.brown(d), 140) * .6 + np.sin(2 * np.pi * 100 * t_) * .04
    put(fx, y * np.clip(t_ / .4, 0, 1) * np.clip((d - t_) / .4, 0, 1), e['t'], .25, .1)
for e in K.events('sit'): put(fx, X.thump(.3, 120), e['t'] + .35, .18, -.2)
for e in K.events('board'): put(fx, X.step(.5), e['t'], .25, -.2)
for e in K.events('callout'):
    put(fx, paper(.25), e['t'], .25, .3)
    note('glass', 86 if e['id'] in ('curb', 'seats', 'esc', 'pf', 'under') else 81, e['t'] + .55, .05, .3, .6)
for e in K.events('step'): put(fx, X.click(1.4, .4), e['t'] + .25, .12, -.6)
for e in K.events('cam'): put(fx, air(min(e['d'], 3.0)), e['t'], .25 * min(1, e['d'] / 2), 0)
for e in K.events('lift'):                     # 屋顶抬起 / 落下：小电机，落定一声木头"嗒"
    put(fx, motor(e['d']), e['t'], .25, -.1); put(fx, X.clack(.6 if e['up'] else .5, .7), e['t'] + e['d'] - .05, .3, 0)
    if not e['up']: put(fx, X.thump(.5, 70), e['t'] + e['d'], .3, 0)
for e in K.events('lights'):                   # 亮灯：继电器"咔"，一批一粒玻璃音，一批比一批高
    put(fx, X.click(.7, .8), e['t'], .25, -.4 + e['i'] * .16)
    note('glass', [74, 78, 81, 83, 86, 90][e['i']], e['t'] + .05, .1, -.4 + e['i'] * .16, .7)

# ———————————————————— 环境 ————————————————————
def bed(a, b, kind, v):
    d = b - a; t = tt(d); env = np.clip(t / 1.2, 0, 1) * np.clip((d - t) / 1.2, 0, 1)
    if kind == 'out':
        y = X.lp(X.brown(d), 380) * 1.4 + X.bp(X.noise(d), 1200, 4000) * .04
    elif kind == 'hall':        # 大厅：低的人声嗡嗡（带通噪声加慢慢的起伏）
        y = X.bp(X.noise(d), 250, 900) * (1 + .4 * np.sin(2 * np.pi * .7 * t) * np.sin(2 * np.pi * .23 * t)) * .5 + X.lp(X.brown(d), 200)
    elif kind == 'under':
        y = X.lp(X.brown(d), 160) * 2 + np.sin(2 * np.pi * 50 * t) * .08
    else:
        y = X.lp(X.brown(d), 260) * 1.1
    put(amb, y * env, a, v, -.15); put(amb, np.roll(y, 5111) * env, a, v, .15)
bed(0, t_step[2] + 1.0, 'out', .05); bed(t_step[2], t_step[5] + 6, 'hall', .045)
bed(t_step[5] + 4, t_step[7] + .5, 'out', .04); bed(t_step[7], t_down + 1.5, 'under', .05); bed(t_dusk, DUR + .3, 'night', .04)
for k in range(10):                            # 站外的鸟（开场到进站）
    at = .6 + k * 1.4 + rng.uniform(0, .5)
    if at > t_step[2] - .3: break
    for j in range(rng.integers(2, 4)):
        d = .07; t = tt(d); f = 3800 + 1500 * t / d + rng.uniform(-300, 300)
        put(amb, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / d), at + j * .11, .02, rng.uniform(-.8, .8))
t0 = t_dusk + 1.2                              # 天黑：虫鸣
for c, (f, rate, pan) in enumerate([(4300, 2.6, -.6), (4900, 3.3, .5), (3900, 2.1, .1)]):
    at = t0 + c * .6
    while at < DUR - .5:
        if not (t_lights - .7 < at < t_lights + .2):
            for j in range(3):
                d = .035; t = tt(d); put(amb, np.sin(2 * np.pi * f * t) * np.sin(np.pi * t / d) * (1 + np.sin(2 * np.pi * 70 * t)) * .5, at + j * .05, .012 * min(1, (at - t0) / 2), pan)
        at += 1 / rate + rng.uniform(0, .08)

K.report() or sys.exit('mix.py: 声音没有落在画面事件上（见上表）：改 main.js 或这里的时间，让两边重新对齐')

# ———————————————————— 混响（桌面模型的小房间：短而亮）、总线 ————————————————————
ir = rng.standard_normal(int(1.5 * SR)) * np.exp(-np.arange(int(1.5 * SR)) / (.36 * SR)); ir = X.lp(X.hp(ir, 250), 7000)
wet = np.stack([fftconvolve(rev[:, c], np.roll(ir, c * 271))[:N] for c in (0, 1)], 1) * .012
rms = lambda x: 20 * math.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
def tame(x, crest_db):
    c = np.sqrt(np.mean(x ** 2)) * 10 ** (crest_db / 20)
    return np.stack([X.limit(x[:, k], c, .004) for k in (0, 1)], 1).astype(np.float32)
fx = tame(fx, 14); mus = tame(mus, 13)
print(f'各路电平 dB：旋律 {rms(mus):.1f}  混响 {rms(wet):.1f}  pad/环境 {rms(amb):.1f}  动作音 {rms(fx):.1f}')
mix = mus + wet + fx + amb
# 亮灯前近乎无声（只剩一点空气），亮灯那一下是第一个声音
g = np.ones(N); a, b = t_lights - .6, t_lights - .02
ia, ib, f = int(a * SR), int(b * SR), int(.3 * SR)
g[ia:ib] = .1; g[ia - f:ia] = np.minimum(g[ia - f:ia], np.linspace(1, .1, f)); g[ib:ib + 240] = np.linspace(.1, 1, 240)
mix *= g[:, None]
fo = int(1.4 * SR); n0 = int(DUR * SR); mix[n0 - fo:n0] *= np.linspace(1, 0, fo)[:, None] ** 1.5
mix = M.master(mix[:n0])
os.makedirs(os.path.join(D, 'out'), exist_ok=True)
sf.write(os.path.join(D, 'out', 'mix.wav'), mix.astype(np.float32), SR)
print('每 2 秒的电平 dB：' + ' '.join(f'{rms(mix[int(a * SR):int((a + 2) * SR)]):.0f}' for a in range(0, int(DUR), 2)))
print(f'mix.wav {DUR}s  peak {np.abs(mix).max():.2f}')
M.check(os.path.join(D, 'out', 'mix.wav')) or sys.exit('mix.py: 这条混音到了 mux.sh 会被重新分配强弱（见上一行），先把峰值或动态范围收住')
