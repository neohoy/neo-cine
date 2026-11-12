#!/usr/bin/env python3
"""把下载的时刻表和地图裁成这部片子要画的两个小文件：data/bus.json（过海巴士一天的班次 + 每条线的路）和 data/map.json（海岸）。
    .venv/bin/python styles/bus-dotmatrix/demo/tools/prep.py            （--refs：只打印过海路线号，给 routes.py 用）
输入（都在 gitignore 的 *.cache/ 里，build.sh 先把它们取好）：
  data/gtfs.cache/day-18.json、day-19.json   neo/geo/gtfs.py 从运输署 GTFS 导出的 2026-11-18（星期三）和 11-19 两个服务日
  data/gtfs.cache/gtfs-en.zip                 英文路线名（屏头目的地中英轮换）
  data/land.cache/land.json                   neo/geo/osm.py 的海岸（land 层）
  data/osm.cache/routes.json                  neo/geo/routes.py 的 OSM 巴士路线关系
  data/roads.cache/                           tools/roads.py 的全港道路（带节点），OSM 没有路线关系的班次按它连站
过海的定义：一个停站模式里，既有停在香港岛（含鸭脷洲）的站，也有停在岛外的站。
路：先用 OSM 里同号的路线关系（把 GTFS 的每个站投影到路线上，九成以上的站离路 ≤ 120 米、顺序不倒退才算对上）；
    对不上或 OSM 没有这条线时，按 OSM 道路在相邻两站之间找最短的可行车路（小路加权，单行线按方向），并在 bus.json 里标出来。
隧道：路线从岛上到岛外的那一段离哪条隧道口最近，就记为走哪条隧道。"""
import csv, heapq, io, json, math, os, sys, zipfile, glob, collections
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); DATA = os.path.join(D, 'data')
sys.path.insert(0, os.path.join(D, '..', '..', '..', 'neo', 'geo'))
from osm import Proj, simplify
LON0, LAT0 = 114.17, 22.30
P = Proj(LON0, LAT0)
J = lambda *p: json.load(open(os.path.join(DATA, *p), encoding='utf-8'))
land = J('land.cache', 'land.json')
days = [J('gtfs.cache', 'day-18.json'), J('gtfs.cache', 'day-19.json')]
for d in [land] + days: assert d['meta']['origin'] == [LON0, LAT0], 'origin 不一致'

# ---------- 哪边：香港岛（含鸭脷洲）还是岛外 ----------
def pip(r, x, y):
    c = False; n = len(r) // 2
    for i in range(n):
        x1, y1, x2, y2 = r[2 * i], r[2 * i + 1], r[2 * ((i + 1) % n)], r[2 * ((i + 1) % n) + 1]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1: c = not c
    return c
def dseg(r, x, y):
    b = 1e18; n = len(r) // 2
    for i in range(n):
        x1, y1, x2, y2 = r[2 * i], r[2 * i + 1], r[2 * ((i + 1) % n)], r[2 * ((i + 1) % n) + 1]
        dx, dy = x2 - x1, y2 - y1; L2 = dx * dx + dy * dy or 1e-9; t = max(0, min(1, ((x - x1) * dx + (y - y1) * dy) / L2))
        b = min(b, (x - x1 - t * dx) ** 2 + (y - y1 - t * dy) ** 2)
    return b ** .5
BIG = [i for i, r in enumerate(land['land']) if len(r) > 40]
ring_at = lambda lon, lat: [i for i in BIG if pip(land['land'][i], *P.xy(lon, lat))]
ISL = set(ring_at(114.158, 22.282) + ring_at(114.155, 22.243))         # 香港岛（中环）、鸭脷洲
assert len(ISL) == 2, ISL
def island(x, y):
    ins = [i for i in BIG if pip(land['land'][i], x, y)]
    if ins: return ins[0] in ISL
    return min(BIG, key=lambda i: dseg(land['land'][i], x, y)) in ISL     # 码头、填海边上的站：看最近的那块陆地

# ---------- 英文路线名 ----------
zen = zipfile.ZipFile(os.path.join(DATA, 'gtfs.cache', 'gtfs-en.zip'))
EN = {r['route_id']: r['route_long_name'] for r in csv.DictReader(io.TextIOWrapper(zen.open('routes.txt'), 'utf-8-sig'))}

def sim(a, b):                                                            # 两个站名有多像（共有字数）
    return len(set(a) & set(b)) / (len(set(b)) or 1)

# ---------- 收集过海的停站模式 ----------
T0, T1 = 3 * 3600, 29 * 3600                                              # 片子的一天：05:00 → 次日 05:00；提前两小时开出的车也要在路上
pats = []
for k, G in enumerate(days):
    side = {}
    for p in G['patterns']:
        for i in p['stops']:
            if i not in side: s = G['stops'][i]; side[i] = island(s['x'], s['y'])
        ss = [side[i] for i in p['stops']]
        if not (any(ss) and not all(ss)): continue
        R = G['routes'][p['route']]
        dep = [d + 86400 * k for d in p['dep']]
        if k == 0: dep_day = list(p['dep'])                               # 统计口径：11-18 这个服务日的全部发车
        else: dep_day = []
        dep = [d for d in dep if T0 <= d < T1 + 3600]
        if not dep and not dep_day: continue
        a, _, b = R['long'].partition(' - '); ea, _, eb = EN.get(R['id'], '').partition(' - ')
        last = G['stops'][p['stops'][-1]]['n']
        toB = sim(last, b) >= sim(last, a)
        pats.append({'day': k, 'ref': R['short'], 'rid': R['id'], 'agency': R['agency'], 'to': (b if toB else a).strip() or R['long'],
                     'en': (eb if toB else ea).strip(), 'xy': [(G['stops'][i]['x'], G['stops'][i]['y']) for i in p['stops']],
                     'names': [G['stops'][i]['n'] for i in p['stops']], 'side': ss,
                     'dt': p['dt'], 'timed': p['timed'], 'dep': dep, 'dep_day': dep_day, 'freq': p['freq']})
if '--refs' in sys.argv:                                                  # build.sh 先要过海路线号的清单，才能去 OSM 取这些路线
    print(','.join(sorted({p['ref'] for p in pats}))); sys.exit(0)
osmr = J('osm.cache', 'routes.json'); assert osmr['meta']['origin'] == [LON0, LAT0], 'origin 不一致'
print(f'过海停站模式 {len(pats)}（11-18：{sum(p["day"] == 0 for p in pats)}，11-19 凌晨：{sum(p["day"] == 1 for p in pats)}）')

# ---------- 路：OSM 路线关系 ----------
def cum(pts):
    c = [0.]
    for a, b in zip(pts, pts[1:]): c.append(c[-1] + math.hypot(b[0] - a[0], b[1] - a[1]))
    return c
def project(pts, c, x, y):
    best, bs = 1e18, 0.
    for i, (a, b) in enumerate(zip(pts, pts[1:])):
        dx, dy = b[0] - a[0], b[1] - a[1]; L2 = dx * dx + dy * dy or 1e-9
        t = max(0., min(1., ((x - a[0]) * dx + (y - a[1]) * dy) / L2)); d = math.hypot(x - a[0] - t * dx, y - a[1] - t * dy)
        if d < best: best, bs = d, c[i] + t * math.sqrt(L2)
    return bs, best
OSM = collections.defaultdict(list)
for r in osmr['routes']:
    pts = [(pc[i], pc[i + 1]) for pc in r['path'] for i in range(0, len(pc), 2)]
    OSM[r['ref']].append(pts)
def match_osm(p):
    best = None
    for pts in OSM.get(p['ref'], []):
        c = cum(pts); pr = [project(pts, c, x, y) for x, y in p['xy']]
        ok = [o < 120 for s, o in pr]; back = sum(1 for (s0, _), (s1, _) in zip(pr, pr[1:]) if s1 < s0 - 60)
        score = sum(ok) / len(ok)
        if score >= .9 and back == 0 and pr[0][1] < 300 and pr[-1][1] < 300 and (best is None or score > best[0]):
            best = (score, pts, c, pr)
    if not best: return None
    _, pts, c, pr = best
    s = [v for v, _ in pr]
    for i in range(1, len(s)): s[i] = max(s[i], s[i - 1])                # 不倒退
    a, b = s[0], s[-1]                                                   # 只留首站到末站这一段
    i0 = max(0, next(i for i in range(len(c)) if c[i] >= a) - 1); i1 = next((i for i in range(len(c)) if c[i] >= b), len(c) - 1)
    return pts[i0:i1 + 1], [v - c[i0] for v in s]

# ---------- 路：按道路连站 ----------
class Roads:
    SLOW = {'residential': 1.7, 'service': 2.0, 'living_street': 2.2, 'unclassified': 1.25, 'busway': .9}
    def __init__(self):
        els = []
        for f in glob.glob(os.path.join(DATA, 'roads.cache', 'roads-*.json')): els += json.load(open(f))['elements']
        self.xy = {e['id']: P.xy(e['lon'], e['lat']) for e in els if e['type'] == 'node'}
        self.adj = collections.defaultdict(list); self.segs = []
        for w in els:
            if w['type'] != 'way': continue
            t = w.get('tags', {}); hw = t.get('highway', ''); ow = t.get('oneway', '')
            if t.get('access') in ('no', 'private') and not ({t.get('bus'), t.get('psv')} & {'yes', 'designated', 'private', 'permissive'} or 'bus:conditional' in t): continue   # 巴士可以走的专用道（含专营巴士的转乘站）留着
            fwd = ow != '-1'; bwd = not (ow in ('yes', '1', 'true') or hw in ('motorway', 'motorway_link') or t.get('junction') == 'roundabout')
            if ow == '-1': bwd = True
            k = self.SLOW.get(hw, 1.)
            ns = [n for n in w['nodes'] if n in self.xy]
            for a, b in zip(ns, ns[1:]):
                L = math.dist(self.xy[a], self.xy[b])
                if fwd: self.adj[a].append((b, L * k))
                if bwd: self.adj[b].append((a, L * k))
                if hw not in ('motorway', 'motorway_link'): self.segs.append((a, b, fwd, bwd, k))
        self.grid = collections.defaultdict(list)
        for i, (a, b, *_) in enumerate(self.segs):
            (x0, y0), (x1, y1) = self.xy[a], self.xy[b]
            for gx in range(int(min(x0, x1) // 100), int(max(x0, x1) // 100) + 1):
                for gy in range(int(min(y0, y1) // 100), int(max(y0, y1) // 100) + 1): self.grid[(gx, gy)].append(i)
        self.vn = 0
        print(f'道路网：{len(self.xy)} 个节点，{len(self.segs)} 段')
    def snap(self, x, y):
        """站 → 附近几条路上的虚拟节点（每条路一个，最多 3 个，60 米内）"""
        cand = {}
        for gx in range(int(x // 100) - 1, int(x // 100) + 2):
            for gy in range(int(y // 100) - 1, int(y // 100) + 2):
                for i in self.grid.get((gx, gy), ()):
                    a, b, f, bw, k = self.segs[i]; (x0, y0), (x1, y1) = self.xy[a], self.xy[b]
                    dx, dy = x1 - x0, y1 - y0; L2 = dx * dx + dy * dy or 1e-9; t = max(0., min(1., ((x - x0) * dx + (y - y0) * dy) / L2))
                    d = math.hypot(x - x0 - t * dx, y - y0 - t * dy)
                    if d < 60 and (i not in cand or d < cand[i][0]): cand[i] = (d, t)
        out = []
        for i, (d, t) in sorted(cand.items(), key=lambda kv: kv[1][0])[:3]:
            a, b, f, bw, k = self.segs[i]; (x0, y0), (x1, y1) = self.xy[a], self.xy[b]; L = math.dist((x0, y0), (x1, y1))
            self.vn += 1; v = -self.vn; self.xy[v] = (x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)
            if f: self.adj[a].append((v, L * t * k)); self.adj[v].append((b, L * (1 - t) * k))
            if bw: self.adj[b].append((v, L * (1 - t) * k)); self.adj[v].append((a, L * t * k))
            out.append((v, d, i, t, f, bw, k, L))
        return out
    def route(self, A, B):
        """A、B 是两站的候选虚拟节点；返回一串坐标"""
        if not A or not B: return None
        tgt = {v: d for v, d, *_ in B}; (bx, by) = self.xy[B[0][0]]
        extra = collections.defaultdict(list)
        for va, da, ia, ta, fa, ba, ka, La in A:                          # 两站在同一段路上：直接连
            for vb, db, ib, tb, fb, bb, kb, Lb in B:
                if ia == ib and ((tb >= ta and fa) or (tb <= ta and ba)): extra[va].append((vb, abs(tb - ta) * La * ka))
        h = lambda n: math.dist(self.xy[n], (bx, by))
        lim = 4 * h(A[0][0]) + 3000
        pq = [(d * 3 + h(v), d * 3, v) for v, d, *_ in A]; heapq.heapify(pq); g = {v: d * 3 for v, d, *_ in A}; prev = {}
        while pq:
            f, gc, n = heapq.heappop(pq)
            if gc > g.get(n, 1e18) or gc > lim: continue
            if n in tgt:
                path = [n]
                while path[-1] in prev: path.append(prev[path[-1]])
                return [self.xy[q] for q in reversed(path)]
            for m, w in self.adj.get(n, []) + extra.get(n, []):
                ng = gc + w
                if ng < g.get(m, 1e18): g[m] = ng; prev[m] = n; heapq.heappush(pq, (ng + h(m), ng, m))
        return None

roads = None; snapc = {}; FAIL = []
def match_roads(p):
    global roads
    if roads is None: roads = Roads()
    pts, s = [p['xy'][0]], [0.]
    for (x0, y0), (x1, y1) in zip(p['xy'], p['xy'][1:]):
        A = snapc.setdefault((x0, y0), roads.snap(x0, y0)); B = snapc.setdefault((x1, y1), roads.snap(x1, y1))
        seg = roads.route(A, B)
        if seg is None:
            FAIL.append((p['ref'], round(math.dist((x0, y0), (x1, y1))), len(A), len(B), p['names'][p['xy'].index((x0, y0))], p['names'][p['xy'].index((x1, y1))]))
            seg = [(x0, y0), (x1, y1)]
        seg = [(x0, y0)] + seg + [(x1, y1)]
        for q in seg[1:]:
            if math.dist(q, pts[-1]) > .5: pts.append(q)
        s.append(cum(pts)[-1])
    return pts, s

# ---------- 隧道 ----------
TUN = [('西區海底隧道', 'Western Harbour Crossing', 1997, 114.1505, 22.2955), ('海底隧道', 'Cross Harbour Tunnel', 1972, 114.1820, 22.2925),
       ('東區海底隧道', 'Eastern Harbour Crossing', 1989, 114.2205, 22.2960)]
TXY = [P.xy(lo, la) for _, _, _, lo, la in TUN]
def tunnel(pts):
    sides = [island(x, y) for x, y in pts[::1]]
    for i in range(len(pts) - 1):
        if sides[i] != sides[i + 1]:
            m = ((pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2)
            k = min(range(3), key=lambda j: math.dist(m, TXY[j]))
            if math.dist(m, TXY[k]) < 2500: return k
    return -1

# ---------- 逐个模式配路 ----------
paths, pkey, out, nos, nrt = [], {}, [], 0, 0
for p in pats:
    m = match_osm(p); how = 0
    if m is None: m = match_roads(p); how = 1
    pts, s = m
    pts = simplify([tuple(q) for q in pts], 6.0)
    key = tuple((round(x), round(y)) for x, y in pts)
    if key not in pkey:
        c = cum(pts); pkey[key] = len(paths); paths.append({'pts': pts, 'k': tunnel(pts), 'how': how, 'len': round(c[-1])})
    pi = pkey[key]
    # 站的距离按简化后的路重新投影一次（简化会让路短一点点）
    c = cum(pts); s2 = [project(pts, c, x, y)[0] for x, y in p['xy']]
    for i in range(1, len(s2)): s2[i] = max(s2[i], s2[i - 1])
    s2[0] = min(s2[0], 0) if s2[0] < 30 else s2[0]
    out.append({'r': p['ref'], 'to': p['to'], 'en': p['en'], 'a': p['agency'], 'p': pi, 's': [round(v) for v in s2], 'dt': p['dt'],
                'dep': p['dep'], 'f': p['freq'], 'day': p['day'], 'how': how, 'n': len(p['dep_day'])})
    nos += how == 0; nrt += how == 1
print('连站失败', len(FAIL), FAIL[:40]); print(f'配路：OSM 路线关系 {nos} 个模式，按道路连站 {nrt} 个；不同的路 {len(paths)} 条')
kc = collections.Counter(paths[o['p']]['k'] for o in out); print('隧道（模式数）', kc)

# ---------- 写 bus.json ----------
AL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
def enc(pts, u=4):                                                        # 增量整数（u 米一格）→ zigzag → 每字 5 位 + 续位，64 个字母；省体积
    o, px, py = [], 0, 0
    for x, y in pts:
        qx, qy = round(x / u), round(y / u)
        for v in (qx - px, qy - py):
            v = (-v << 1) - 1 if v < 0 else v << 1
            while True:
                c = v & 31; v >>= 5
                o.append(AL[c | (32 if v else 0)])
                if not v: break
        px, py = qx, qy
    return ''.join(o)
def enc1(vals):                                                           # 一串单调不减的整数（站距、时刻、发车）：增量，同样的字母表
    o, pv = [], 0
    for v in vals:
        d = int(round(v)) - pv; pv = int(round(v)); d = (-d << 1) - 1 if d < 0 else d << 1
        while True:
            c = d & 31; d >>= 5; o.append(AL[c | (32 if d else 0)])
            if not d: break
    return ''.join(o)
refs18 = sorted({o['r'] for o in out if o['day'] == 0 and o['n']})
n18 = sum(o['n'] for o in out if o['day'] == 0); f18 = sum(o['n'] for o in out if o['day'] == 0 and o['f'])
hours = collections.Counter(d // 3600 for o in out if o['day'] == 0 for d in o['dep'])
bus = {'meta': {'unit': 4, 'origin': [LON0, LAT0], 'date': days[0]['meta']['date'], 'next': days[1]['meta']['date'],
                'source': 'Transport Department, HKSAR Government — static GTFS (pt-headway), DATA.GOV.HK',
                'paths': 'OpenStreetMap bus route relations where they match; else routed along OSM roads between published stops (how 1)',
                'counts': {'routes': len(refs18), 'departures': n18, 'from_headways': f18, 'by_hour': {h: hours[h] for h in sorted(hours)},
                           'patterns_osm': nos, 'patterns_routed': nrt},
                'tunnels': [{'n': n, 'en': e, 'y': y, 'x': round(x), 'yy': round(yy)} for (n, e, y, _, _), (x, yy) in zip(TUN, TXY)]},
       'paths': [{'k': q['k'], 'how': q['how'], 'd': enc(q['pts'])} for q in paths],
       'pats': [{**{k: v for k, v in o.items() if k not in ('day', 's', 'dt', 'dep')}, 's': enc1(o['s']), 'dt': enc1(o['dt']), 'dep': enc1(o['dep'])} for o in out]}
json.dump(bus, open(os.path.join(DATA, 'bus.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print(f'✓ data/bus.json：{len(refs18)} 个路线号，11-18 全天 {n18} 班（其中按班距推算 {f18}），{os.path.getsize(os.path.join(DATA, "bus.json")) / 1e3:.0f} kB')
print('每小时发车（11-18）：', ' '.join(f'{h}:{hours[h]}' for h in sorted(hours)))

# ---------- 写 map.json：海岸两级（全港一份粗的，维港一份细的） ----------
def rings_in(box, tol, min_area, u):
    x0, y0, x1, y1 = box; o = []
    for r in land['land']:
        xs, ys = r[0::2], r[1::2]
        if max(xs) < x0 or min(xs) > x1 or max(ys) < y0 or min(ys) > y1: continue
        pts = list(zip(xs, ys)); a = abs(sum(pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1] for i in range(len(pts) - 1))) / 2
        if a < min_area: continue
        pts = simplify(pts, tol); o.append(enc(pts, u))
    return o
WIDE = (-36000, -17000, 30000, 20000); NEAR = (-11000, -7000, 9000, 5500)
mp = {'meta': {'origin': [LON0, LAT0], 'source': 'OpenStreetMap', 'license': 'ODbL 1.0, © OpenStreetMap contributors', 'wide': WIDE, 'near': NEAR},
      'units': {'wide': 20, 'near': 4}, 'wide': rings_in(WIDE, 60, 300000, 20), 'near': rings_in(NEAR, 8, 3000, 4)}
json.dump(mp, open(os.path.join(DATA, 'map.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print(f'✓ data/map.json：海岸 {len(mp["wide"])} + {len(mp["near"])} 圈，{os.path.getsize(os.path.join(DATA, "map.json")) / 1e3:.0f} kB')
