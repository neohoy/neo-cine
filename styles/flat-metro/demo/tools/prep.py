#!/usr/bin/env python3
"""把 OpenStreetMap 的线路和水面、Wiener Linien 的 GTFS 时刻表做成这部片子画的一张图 → data/net.json。

    .venv/bin/python -I styles/flat-metro/demo/tools/prep.py

输入（build.sh 先准备好）：
  data/metro.json                      neo/geo/routes.py：五条线的 OSM 线路关系（真实轨道走向）和车站
  data/osm.cache/city.json             neo/geo/osm.py：水面、林地、公园（同一个 --origin 16.37,48.21）
  data/gtfs.cache/day-YYYYMMDD.json    neo/geo/gtfs.py：周四、周五、周六三个运营日的地铁班次
输出 data/net.json：
  water / green   柔化过边缘的平涂色块（米，原点 16.37E 48.21N）
  lines           每条线：颜色、车站顺序、八方向路径（带统一半径的圆角）和同一参数下的真实路径（拉线时从真实走向收紧用）
  stations        车站：八方向位置、真实位置、经过的线
  trips           三个夜晚要用到的班次：每趟车按"线、方向、各站时刻（从周四 0 点起的分钟）"

八方向化（octilinear）：
  1. 每段站间连线取最近的 0/45/90/135… 方向（同一条线上前后段的方向有一点"粘性"，少出锯齿）；
  2. 最小二乘：每段想要"方向 × 真实长度"，每个站想待在真实位置附近（权重小），解出新的站位，反复几轮，方向会随之更新；
  3. 约束投影：在上一步结果附近，把每段的垂直分量硬压成 0（KKT 投影）；压不成的段（长度会变成负的、太短）放开，
     这些段画成一个折弯的两段八方向线，折点放在离真实轨道更近的那一侧；
  4. 所有折角统一用一个圆角半径（太短的段才缩小），沿路径重采样，和真实路径按"站序参数"一一对应。
只用 Python 标准库和 numpy。"""
import json, math, os, re, sys
import numpy as np

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(D, 'data')
DAYS = {'thu': '20261119', 'fri': '20261120', 'sat': '20261121'}       # 周四、周五、周六（各自的运营日）
DAY0 = {'thu': 0, 'fri': 1440, 'sat': 2880}                            # 运营日 0 点 = 从周四 0 点起的分钟
WINDOWS = [(22 * 60, 26 * 60 + 30), (1440 + 22 * 60, 1440 + 26 * 60 + 30), (2880, 2880 + 8 * 60)]   # 片子里出现的时段
REFS = ['U1', 'U2', 'U3', 'U4', 'U6']
LMIN = 520.0          # 站间最短（米）：市中心的站挨得太近时撑开一点，留出站孔和字的地方
ANCHOR = 0.06         # 站位贴近真实位置的权重（站间段的权重是 1）
RADIUS = 260.0        # 统一的圆角半径（米）
STEP = 30.0           # 路径重采样的间距（米）
ALIAS = {'Meidling': 'Bahnhof Meidling', 'Mitte-Landstraße': 'Landstraße', 'Südtiroler Pl. - Hbf.': 'Südtiroler Platz-Hauptbahnhof',
         'Währinger Str.-Volksoper': 'Währinger Straße-Volksoper'}
DIRS = [(math.cos(k * math.pi / 4), math.sin(k * math.pi / 4)) for k in range(8)]


def norm(n):
    n = n.replace(' ', ' ').replace('\xa0', ' '); n = re.sub(r'\s+', ' ', n).strip()
    return ALIAS.get(n, n)


def hhmm(m): return f'{int(m // 60) % 24:02d}:{int(m % 60):02d}'


def load(p): return json.load(open(p, encoding='utf-8'))


# ———————————————————— 几何小工具 ————————————————————
def cumlen(P):
    s = [0.0]
    for a, b in zip(P, P[1:]): s.append(s[-1] + math.dist(a, b))
    return s


def at_s(P, S, s):
    """折线 P（累计长度 S）上弧长 s 处的点"""
    if s <= 0: return P[0]
    if s >= S[-1]: return P[-1]
    lo, hi = 0, len(S) - 1
    while hi - lo > 1:
        m = (lo + hi) // 2
        if S[m] <= s: lo = m
        else: hi = m
    f = (s - S[lo]) / ((S[hi] - S[lo]) or 1)
    return (P[lo][0] + f * (P[hi][0] - P[lo][0]), P[lo][1] + f * (P[hi][1] - P[lo][1]))


def locate(P, S, q, s_min=0.0):
    """q 在折线上的最近点的弧长（只看 s_min 以后，保证车站沿线单调）"""
    best, bs = 1e18, s_min
    for i in range(len(P) - 1):
        if S[i + 1] < s_min: continue
        a, b = P[i], P[i + 1]; dx, dy = b[0] - a[0], b[1] - a[1]; L2 = dx * dx + dy * dy or 1e-9
        t = max(0.0, min(1.0, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / L2))
        x, y = a[0] + t * dx, a[1] + t * dy; d = math.hypot(q[0] - x, q[1] - y)
        if d < best and S[i] + t * math.sqrt(L2) >= s_min: best, bs = d, S[i] + t * math.sqrt(L2)
    return bs, best


def seg_dist(q, P):
    best = 1e18
    for a, b in zip(P, P[1:]):
        dx, dy = b[0] - a[0], b[1] - a[1]; L2 = dx * dx + dy * dy or 1e-9
        t = max(0.0, min(1.0, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / L2))
        best = min(best, math.hypot(q[0] - a[0] - t * dx, q[1] - a[1] - t * dy))
    return best


def area(r): return abs(sum(r[i][0] * r[(i + 1) % len(r)][1] - r[(i + 1) % len(r)][0] * r[i][1] for i in range(len(r)))) / 2


def chaikin(r, n=2):
    for _ in range(n):
        out = []
        for i in range(len(r)):
            a, b = r[i], r[(i + 1) % len(r)]
            out += [(.75 * a[0] + .25 * b[0], .75 * a[1] + .25 * b[1]), (.25 * a[0] + .75 * b[0], .25 * a[1] + .75 * b[1])]
        r = out
    return r


def rdp(P, tol):
    if len(P) < 3: return P
    a, b = P[0], P[-1]; dx, dy = b[0] - a[0], b[1] - a[1]; L = math.hypot(dx, dy) or 1e-9
    dmax, k = -1, 0
    for i in range(1, len(P) - 1):
        d = abs((P[i][0] - a[0]) * dy - (P[i][1] - a[1]) * dx) / L
        if d > dmax: dmax, k = d, i
    if dmax <= tol: return [a, b]
    return rdp(P[:k + 1], tol)[:-1] + rdp(P[k:], tol)


def rdp_ring(r, tol):
    """闭合环的抽稀：先在离起点最远的点处断开，两半各自抽稀"""
    if len(r) < 5: return r
    k = max(range(len(r)), key=lambda i: math.dist(r[0], r[i]))
    return rdp(r[:k + 1], tol)[:-1] + rdp(r[k:] + [r[0]], tol)[:-1]


def soft_ring(flat, tol=14, after=3.5):
    r = list(zip(flat[0::2], flat[1::2]))
    r = rdp_ring(r, tol)
    r = chaikin(r, 2)
    r = rdp_ring(r, after)
    return [v for p in r for v in (round(p[0]), round(p[1]))]


# ———————————————————— 八方向化 ————————————————————
def snap_dir(v, prefer=()):
    a = math.atan2(v[1], v[0]); best, bk = 1e9, 0
    for k in range(8):
        d = abs((a - k * math.pi / 4 + math.pi) % (2 * math.pi) - math.pi)
        d -= math.radians(7) * (k in prefer)                    # 同一条线前后段方向的粘性
        if d < best: best, bk = d, k
    return bk


def octilinear(G, E, line_edges):
    """G: (N,2) 真实站位；E: [(i, j)]；line_edges: 每条线的边下标序列。返回八方向站位、每条边的方向、哪些边被放开"""
    N = len(G); P = G.copy(); dk = [None] * len(E)
    Lg = [max(LMIN, float(np.linalg.norm(G[j] - G[i]))) for i, j in E]
    nb = {e: set() for e in range(len(E))}
    for seq in line_edges:
        for a, b in zip(seq, seq[1:]): nb[a].add(b); nb[b].add(a)
    def orient(e, k):                                           # 边 e 在 i→j 方向上的方向号（邻边可能反向）
        return k
    for it in range(60):
        new = []
        for e, (i, j) in enumerate(E):
            v = (P[j] - P[i]) if it else (G[j] - G[i])
            pref = set()
            for f in nb[e]:
                if dk[f] is None: continue
                fi, fj = E[f]; k = dk[f]
                # 邻边方向换算到"从共享站往外"的同一个朝向：沿线连续 = 方向号相同
                if fj == i or fi == j: pref.add(k)
                else: pref.add((k + 4) % 8)
            new.append(snap_dir(v, pref))
        dk = new
        A = np.zeros((N, N)); bx = np.zeros(N); by = np.zeros(N)
        for e, (i, j) in enumerate(E):
            dx, dy = DIRS[dk[e]]; L = Lg[e]
            A[i, i] += 1; A[j, j] += 1; A[i, j] -= 1; A[j, i] -= 1
            bx[j] += L * dx; bx[i] -= L * dx; by[j] += L * dy; by[i] -= L * dy
        A += ANCHOR * np.eye(N); bx += ANCHOR * G[:, 0]; by += ANCHOR * G[:, 1]
        P = np.stack([np.linalg.solve(A, bx), np.linalg.solve(A, by)], 1)
    # 约束投影：每条边的垂直分量 = 0；会把边压短、压反的就放开
    free = set()
    for _ in range(12):
        rows = []
        for e, (i, j) in enumerate(E):
            if e in free: continue
            dx, dy = DIRS[dk[e]]; nx, ny = -dy, dx; r = np.zeros(2 * N)
            r[2 * i] -= nx; r[2 * i + 1] -= ny; r[2 * j] += nx; r[2 * j + 1] += ny; rows.append(r)
        M = np.array(rows); q = P.reshape(-1)
        Q = (q - M.T @ np.linalg.lstsq(M @ M.T, M @ q, rcond=None)[0]).reshape(N, 2)
        bad = [e for e, (i, j) in enumerate(E) if e not in free and np.dot(Q[j] - Q[i], DIRS[dk[e]]) < .45 * LMIN]
        if not bad: break
        free |= set(bad)
    return Q, dk, free


def fillet(P, R):
    """折线 → 每个折角换成同一半径 R 的圆弧（两边太短时缩小），返回密一点的点列"""
    out = [P[0]]
    for k in range(1, len(P) - 1):
        a, b, c = np.array(P[k - 1]), np.array(P[k]), np.array(P[k + 1])
        u, w = a - b, c - b; lu, lw = np.linalg.norm(u), np.linalg.norm(w)
        if lu < 1e-6 or lw < 1e-6: continue
        u, w = u / lu, w / lw; cosang = float(np.clip(np.dot(u, w), -1, 1)); ang = math.acos(cosang)
        if ang > math.pi - 1e-3: out.append(tuple(b)); continue   # 直线
        tlen = R / math.tan(ang / 2); tmax = min(lu, lw) * .5
        r = R if tlen <= tmax else tmax * math.tan(ang / 2); tlen = min(tlen, tmax)
        p0, p1 = b + u * tlen, b + w * tlen
        bis = (u + w); bis /= np.linalg.norm(bis); cen = b + bis * (r / math.sin(ang / 2))
        a0, a1 = math.atan2(*(p0 - cen)[::-1]), math.atan2(*(p1 - cen)[::-1])
        da = (a1 - a0 + math.pi) % (2 * math.pi) - math.pi; n = max(3, int(abs(da) / math.radians(7)))
        for m in range(n + 1):
            t = a0 + da * m / n; out.append((cen[0] + r * math.cos(t), cen[1] + r * math.sin(t)))
    out.append(P[-1])
    return out


def main():
    metro = load(os.path.join(DATA, 'metro.json'))
    city = load(os.path.join(DATA, 'osm.cache', 'city.json'))
    days = {k: load(os.path.join(DATA, 'gtfs.cache', f'day-{v}.json')) for k, v in DAYS.items()}
    fri = days['fri']; FS = fri['stops']
    # —— 车站：GTFS 的站台按站名合并（官方位置），名字用 OSM 的写法 ——
    pos = {}
    for d in days.values():
        for s in d['stops']: pos.setdefault(norm(s['n']), []).append((s['x'], s['y']))
    gpos = {n: (sum(p[0] for p in v) / len(v), sum(p[1] for p in v) / len(v)) for n, v in pos.items()}
    # —— 每条线：取站数最多的那个模式定站序（周五） ——
    lines = []
    for ref in REFS:
        ri = next(i for i, r in enumerate(fri['routes']) if r['short'] == ref)
        pat = max((p for p in fri['patterns'] if p['route'] == ri), key=lambda p: (len(p['stops']), len(p['dep'])))
        seq = [norm(FS[k]['n']) for k in pat['stops']]
        rt = max((r for r in metro['routes'] if r['ref'] == ref), key=lambda r: r['len'])
        path = list(zip(rt['path'][0][0::2], rt['path'][0][1::2]))
        if math.dist(path[0], gpos[seq[0]]) > math.dist(path[-1], gpos[seq[0]]): path = path[::-1]
        lines.append({'ref': ref, 'colour': fri['routes'][ri]['colour'].upper(), 'seq': seq, 'geo': path})
    names = sorted({n for L in lines for n in L['seq']}); idx = {n: i for i, n in enumerate(names)}
    G = np.array([gpos[n] for n in names], float)
    E, eix, line_edges = [], {}, []
    for L in lines:
        seq = []
        for a, b in zip(L['seq'], L['seq'][1:]):
            i, j = idx[a], idx[b]; key = (min(i, j), max(i, j))
            if key not in eix: eix[key] = len(E); E.append((i, j))
            seq.append(eix[key])
        line_edges.append(seq)
    Q, dk, free = octilinear(G, E, line_edges)
    dev = np.linalg.norm(Q - G, axis=1)
    print(f'八方向化：{len(names)} 站，{len(E)} 段，放开 {len(free)} 段（画成一个折弯），站位平均偏 {dev.mean():.0f} 米，最大 {dev.max():.0f} 米（{names[int(dev.argmax())]}）')
    # —— 每条线的八方向路径 + 和真实路径的对应 ——
    out_lines = []
    for L, seq_e in zip(lines, line_edges):
        geo = L['geo']; GS = cumlen(geo)
        st_geo_s, s0 = [], 0.0
        for n in L['seq']:
            s, d = locate(geo, GS, gpos[n], s0); st_geo_s.append(s); s0 = s
            if d > 250: print(f'  ! {L["ref"]} {n}: 离 OSM 轨道 {d:.0f} 米')
        verts, vu = [tuple(Q[idx[L['seq'][0]]])], [0.0]
        for k, (a, b) in enumerate(zip(L['seq'], L['seq'][1:])):
            pa, pb = Q[idx[a]], Q[idx[b]]; e = seq_e[k]
            if e in free:                                    # 一个折弯：两种折法里选离真实轨道近的
                v = pb - pa; ang = math.atan2(v[1], v[0]); k1 = round(ang / (math.pi / 4)) % 8
                k2 = (k1 + (1 if ((ang - k1 * math.pi / 4 + math.pi) % (2 * math.pi) - math.pi) > 0 else -1)) % 8
                d1, d2 = np.array(DIRS[k1]), np.array(DIRS[k2])
                c = np.linalg.solve(np.stack([d1, d2], 1), v)
                m1, m2 = pa + c[0] * d1, pa + c[1] * d2
                sub = [p for p, s in zip(geo, GS) if st_geo_s[k] <= s <= st_geo_s[k + 1]] or [at_s(geo, GS, (st_geo_s[k] + st_geo_s[k + 1]) / 2)]
                gm = np.array(at_s(geo, GS, (st_geo_s[k] + st_geo_s[k + 1]) / 2)) + (Q[idx[a]] - G[idx[a]] + Q[idx[b]] - G[idx[b]]) / 2
                mid = m1 if np.linalg.norm(m1 - gm) < np.linalg.norm(m2 - gm) else m2
                verts.append(tuple(mid)); vu.append(k + .5)
            verts.append(tuple(pb)); vu.append(k + 1.0)
        # 合并共线的顶点（站点不丢：站点的 u 是整数，记下来）
        F = fillet(verts, RADIUS); FS_ = cumlen(F)
        # 站在圆角路径上的弧长：离该顶点最近的点
        st_s, s0 = [], 0.0
        for n in L['seq']:
            s, _ = locate(F, FS_, tuple(Q[idx[n]]), s0); st_s.append(s); s0 = s
        # 按弧长重采样；每个点记下站序参数 u，再取真实路径上同一个 u 的点
        n = max(2, int(FS_[-1] / STEP)); oct_pts, geo_pts, us = [], [], []
        for m in range(n + 1):
            s = FS_[-1] * m / n; p = at_s(F, FS_, s)
            k = max(0, min(len(st_s) - 2, next((i for i in range(len(st_s) - 1) if s <= st_s[i + 1]), len(st_s) - 2)))
            u = k + (s - st_s[k]) / ((st_s[k + 1] - st_s[k]) or 1)
            gs = st_geo_s[k] + (u - k) * (st_geo_s[k + 1] - st_geo_s[k])
            g = at_s(geo, GS, gs)
            oct_pts += [round(p[0], 1), round(p[1], 1)]; geo_pts += [round(g[0], 1), round(g[1], 1)]; us.append(round(u, 4))
        out_lines.append({'ref': L['ref'], 'colour': L['colour'], 'stations': [idx[n] for n in L['seq']],
                          'st_s': [round(s, 1) for s in st_s], 'len': round(FS_[-1], 1),
                          'oct': oct_pts, 'geo': geo_pts, 'u': us, 'geo_len': round(GS[-1])})
        print(f'  {L["ref"]} {L["colour"]}: {len(L["seq"])} 站，八方向 {FS_[-1] / 1000:.1f} km，真实轨道 {GS[-1] / 1000:.1f} km，{len(oct_pts) // 2} 个点')
    stations = [{'n': n, 'x': round(float(Q[i, 0]), 1), 'y': round(float(Q[i, 1]), 1), 'gx': round(gpos[n][0]), 'gy': round(gpos[n][1]),
                 'lines': [L['ref'] for L in lines if n in L['seq']]} for i, n in enumerate(names)]
    # —— 班次：三个运营日，只留片子里出现的时段 ——
    trips, counts = [], {}
    SKIPS = set()
    for day, d in days.items():
        S = d['stops']
        for p in d['patterns']:
            ref = d['routes'][p['route']]['short']; li = REFS.index(ref); seq = lines[li]['seq']
            names_p = [norm(S[k]['n']) for k in p['stops']]
            ks = [seq.index(n) for n in names_p]
            st_s = out_lines[li]['st_s']
            # 不停的站（例如这几天北行不停 Neue Donau）：按八方向路径的弧长插出通过时刻，记进 skip
            full, dts, skip = [ks[0]], [p['dt'][0]], []
            for (a, b), (ta, tb) in zip(zip(ks, ks[1:]), zip(p['dt'], p['dt'][1:])):
                step = 1 if b > a else -1
                for k in range(a + step, b, step):
                    f = (st_s[k] - st_s[a]) / (st_s[b] - st_s[a]); full.append(k); dts.append(ta + f * (tb - ta)); skip.append(k)
                full.append(b); dts.append(tb)
            if skip and (ref, tuple(skip)) not in SKIPS: SKIPS.add((ref, tuple(skip))); print(f'  {ref} {day} 有的班次不停：{[seq[k] for k in skip]}')
            for t0 in p['dep']:
                a = DAY0[day] + t0 / 60; b = a + dts[-1] / 60
                if not any(b >= w0 and a <= w1 for w0, w1 in WINDOWS): continue
                trips.append([li, full[0], full[-1], [round(a + x / 60, 3) for x in dts]] + ([skip] if skip else []))
    trips.sort(key=lambda t: t[3][0])
    # 每条线有车在跑的时段（三个运营日的全部班次，间隔不到 20 分钟的连成一段）：画面用它决定线什么时候"亮着"
    service = []
    for li, ref in enumerate(REFS):
        iv = []
        for day, d in days.items():
            for p in d['patterns']:
                if d['routes'][p['route']]['short'] != ref: continue
                for t0 in p['dep']: iv.append((DAY0[day] + t0 / 60, DAY0[day] + (t0 + p['dt'][-1]) / 60))
        iv.sort(); merged = []
        for a, b in iv:
            if merged and a <= merged[-1][1] + 20: merged[-1][1] = max(merged[-1][1], b)
            else: merged.append([a, b])
        service.append([[round(a, 2), round(b, 2)] for a, b in merged])
        print(f'  {ref} 运营时段：', [f'{int(a // 1440)}d {hhmm(a)}–{hhmm(b)}' for a, b in merged])
    def running(m): return sum(1 for t in trips if t[3][0] <= m <= t[3][-1])
    for lab, m in [('周四 01:30', 25.5 * 60), ('周五 01:30', 1440 + 25.5 * 60), ('周五 00:00', 1440 + 24 * 60), ('周四 00:00', 24 * 60), ('周六 05:30', 2880 + 5.5 * 60)]:
        counts[lab] = running(m); print(f'  {lab}：线上 {counts[lab]} 列车')
    last = {}
    for t in trips:
        if t[3][-1] < 1440 + 4 * 60: last[lines[t[0]]['ref']] = max(last.get(lines[t[0]]['ref'], 0), t[3][-1])
    print('  周四夜里各线末班到站：', {k: f'{int(v // 60) % 24:02d}:{int(v % 60):02d}' for k, v in sorted(last.items())})
    # —— 底图：水面和绿地，边缘柔化 ——
    water = []
    for w in city['water']:
        if not w: continue
        r0 = list(zip(w[0][0::2], w[0][1::2])); A = area(r0); per = sum(math.dist(r0[i], r0[(i + 1) % len(r0)]) for i in range(len(r0)))
        # 细长的溪流和小水沟不画（远看是一根线，会读成界线）；宽于 60 米的水面和大片水面（多瑙运河）都画
        if A < 40000 or (2 * A / per < 60 and A < 500000): continue
        water.append([soft_ring(r) for r in w if len(r) >= 6])
    green = []
    for kind in ('wood', 'park'):
        for w in city[kind]:
            if not w or area(list(zip(w[0][0::2], w[0][1::2]))) < 450000: continue
            rings = [w[0]] + [r for r in w[1:] if len(r) >= 6 and area(list(zip(r[0::2], r[1::2]))) > 120000]   # 林中的小空地不要
            green.append([soft_ring(r, 30, 9) for r in rings])
    out = {'meta': {'origin': metro['meta']['origin'], 'osm': f'OpenStreetMap contributors, ODbL 1.0, fetched {metro["meta"]["date"]}',
                    'gtfs': f'Wiener Linien GTFS (data.gv.at, CC BY 4.0), feed of 2026-11-09, service days {", ".join(DAYS.values())}',
                    'radius': RADIUS, 'counts': counts, 'last': {k: round(v, 2) for k, v in last.items()}},
           'water': water, 'green': green, 'lines': out_lines, 'stations': stations, 'trips': trips, 'service': service}
    p = os.path.join(DATA, 'net.json')
    json.dump(out, open(p, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print(f'{p}: {os.path.getsize(p) / 1024:.0f} kB  水面 {len(water)}  绿地 {len(green)}  班次 {len(trips)}')


if __name__ == '__main__':
    main()
