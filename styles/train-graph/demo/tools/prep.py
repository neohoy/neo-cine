#!/usr/bin/env python3
"""列车运行图 · 数据准备：一天的真实时刻表 + 两条真实线路 → data/graph.json（影片画的就是这个文件）。

    .venv/bin/python styles/train-graph/demo/tools/prep.py            （在库的根目录运行；build.sh 在 graph.json 缺失时调用）

输入（都是下载来的，放在 data/*.cache/ 里，不进 git）：
  - data/gtfs.cache/fv_free.zip：gtfs.de 的德国长途列车时刻表（DELFI e.V. 的数据，CC BY 4.0），
    先用 neo/geo/gtfs.py 取出 2026-11-18（星期三）在走廊里停靠过的每一趟车；
  - data/osm.cache/：OpenStreetMap 的铁路网（railway=rail，不含站线、岔线）和几条河的中心线（Overpass API，ODbL 1.0）。

做的事：
  1. 在铁路网上按车站顺序找最短路，得到两条“轴”：莱茵河谷线（科隆—波恩—科布伦茨—宾根—美因茨—法兰克福机场—法兰克福）
     和高速新线（科隆—锡格堡—蒙塔包尔—林堡南—法兰克福机场—法兰克福）。里程按经纬度逐段算大圆距离。
  2. 每个车站投到它那条轴上，得到真实的线路里程；隧道、桥、线路最高速度也按里程记下来（条带地图用）。
  3. 河流投到轴的坐标里（沿线里程 s，离线路的横向距离 n），条带地图把线路拉直后，河还在它真实的那一侧、真实的距离上。
  4. 每趟车：把它的停站按顺序对到轴上，连续落在同一条轴上的一段（至少两站）就是运行图上的一条线；
     进出轴的地方记下它从哪来、往哪去（画成一小段出线）。时刻全部是时刻表上公布的，没有插值。
只用 Python 标准库和库里的 neo/geo/ 工具。
"""
import heapq, json, math, os, subprocess, sys
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))          # demo/
LIB = os.path.abspath(os.path.join(D, '..', '..', '..'))
sys.path.insert(0, os.path.join(LIB, 'neo', 'geo'))
from osm import fetch, Proj

BBOX = [6.85, 49.95, 8.75, 50.98]; ORIGIN = (7.6, 50.45); DATE = '20261118'
FEED = os.path.join(D, 'data', 'gtfs.cache', 'fv_free.zip'); CACHE = os.path.join(D, 'data', 'osm.cache')
P = Proj(*ORIGIN)
R = 6371008.8
def hav(a, b):                                                    # 两点（经度, 纬度）之间的大圆距离，米
    p1, p2 = math.radians(a[1]), math.radians(b[1]); dl = math.radians(b[0] - a[0]); dp = p2 - p1
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))

# ---------- 1. 铁路网 → 图 ----------
ways = fetch('railnet', BBOX, CACHE, query='way["railway"="rail"][!"service"]({b});out geom;')
ways = [w for w in ways if w.get('tags', {}).get('usage', 'main') in ('main', 'branch')]
coord, adj, wtag = {}, {}, {}
for w in ways:
    ns, gs = w['nodes'], w['geometry']
    for n, g in zip(ns, gs): coord[n] = (g['lon'], g['lat'])
    for a, b in zip(ns, ns[1:]):
        d = hav(coord[a], coord[b]); adj.setdefault(a, []).append((b, d)); adj.setdefault(b, []).append((a, d))
        wtag[(a, b)] = wtag[(b, a)] = w['tags']
# OSM 的铁路一条轨道一条 way，渡线多标 service=crossover（上面没取），平行的轨道在图上常常不相连：
# 相距 30 米以内的节点之间补一条虚拟的边（按 1.5 倍距离算），最短路就能在平行轨道之间换过去
cell = {}
for n, (lo, la) in coord.items(): cell.setdefault((int(lo / .0006), int(la / .0004)), []).append(n)
for (cx, cy), ns in cell.items():
    near = [m for dx in (-1, 0, 1) for dy in (-1, 0, 1) for m in cell.get((cx + dx, cy + dy), [])]
    for a in ns:
        if a not in adj: continue
        for b in near:
            if b <= a or b not in adj: continue
            d = hav(coord[a], coord[b])
            if d < 30: adj[a].append((b, d * 1.5)); adj[b].append((a, d * 1.5)); wtag.setdefault((a, b), {}); wtag.setdefault((b, a), {})
nodes = list(adj)
def snap(lon, lat):
    return min(nodes, key=lambda n: (coord[n][0] - lon) ** 2 * .41 + (coord[n][1] - lat) ** 2)
def dijkstra(s, t):
    dist, prev, pq = {s: 0}, {}, [(0, s)]
    while pq:
        d, u = heapq.heappop(pq)
        if u == t: break
        if d > dist[u]: continue
        for v, w in adj[u]:
            if d + w < dist.get(v, 1e18): dist[v] = d + w; prev[v] = u; heapq.heappush(pq, (d + w, v))
    path = [t]
    while path[-1] != s: path.append(prev[path[-1]])
    return path[::-1]

# 车站（GTFS 里的名字）和它在地上的位置；SHAPE 是只用来把最短路拉到正确线路上的途经点
ST = {'Köln Hbf': (6.9589, 50.9430), 'Köln Messe/Deutz': (6.9746, 50.9407), 'Köln Süd': (6.9378, 50.9272),
      'Köln/Bonn Flughafen': (7.1194, 50.8790), 'Siegburg/Bonn': (7.2032, 50.7939), 'Montabaur': (7.8254, 50.4450),
      'Limburg Süd': (8.0960, 50.3825), 'Frankfurt(M) Flughafen Fernbf': (8.5700, 50.0530), 'Frankfurt(Main)Hbf': (8.6630, 50.1070),
      'Bonn Hbf': (7.0970, 50.7320), 'Remagen': (7.2300, 50.5770), 'Andernach': (7.4050, 50.4350), 'Koblenz Hbf': (7.5880, 50.3510),
      'Bingen(Rhein) Hbf': (7.8840, 49.9690), 'Mainz Hbf': (8.2580, 50.0010)}
AXES = {
    'rhine': ['Köln Hbf', 'Köln Süd', 'Bonn Hbf', 'Remagen', 'Andernach', 'Koblenz Hbf', (7.5905, 50.2330), (7.7150, 50.1520), (7.7240, 50.1040),
              'Bingen(Rhein) Hbf', 'Mainz Hbf', 'Frankfurt(M) Flughafen Fernbf', 'Frankfurt(Main)Hbf'],
    'hsl': ['Köln Hbf', 'Köln Messe/Deutz', 'Siegburg/Bonn', 'Montabaur', 'Limburg Süd', 'Frankfurt(M) Flughafen Fernbf', 'Frankfurt(Main)Hbf'],
}
NAMES = {'Köln Hbf': ('科隆总站', 'Köln Hbf'), 'Köln Messe/Deutz': ('科隆道依茨', 'Köln Messe/Deutz'), 'Köln Süd': ('科隆南', 'Köln Süd'),
         'Köln/Bonn Flughafen': ('科隆/波恩机场', 'Köln/Bonn Flughafen'), 'Siegburg/Bonn': ('锡格堡/波恩', 'Siegburg/Bonn'),
         'Montabaur': ('蒙塔包尔', 'Montabaur'), 'Limburg Süd': ('林堡南', 'Limburg Süd'),
         'Frankfurt(M) Flughafen Fernbf': ('法兰克福机场', 'Frankfurt Flughafen'), 'Frankfurt(Main)Hbf': ('法兰克福总站', 'Frankfurt (Main) Hbf'),
         'Bonn Hbf': ('波恩', 'Bonn Hbf'), 'Remagen': ('雷马根', 'Remagen'), 'Andernach': ('安德纳赫', 'Andernach'),
         'Koblenz Hbf': ('科布伦茨', 'Koblenz Hbf'), 'Bingen(Rhein) Hbf': ('宾根', 'Bingen (Rhein) Hbf'), 'Mainz Hbf': ('美因茨', 'Mainz Hbf')}
ALIAS = {'Köln Messe/Deutz Gl.11-12': 'Köln Messe/Deutz', 'Frankfurt(M) Flughafen Regionalbf': 'Frankfurt(M) Flughafen Fernbf'}

out = {'axes': {}}
for ax, wp in AXES.items():
    pts = [ST[w] if isinstance(w, str) else w for w in wp]
    sn = [snap(*p) for p in pts]; path = [sn[0]]
    for a, b in zip(sn, sn[1:]): path += dijkstra(a, b)[1:]
    km = [0.0]
    for a, b in zip(path, path[1:]): km.append(km[-1] + hav(coord[a], coord[b]))
    xy = [P.xy(*coord[n]) for n in path]
    # 车站投到轴上（最近的轴上的点）
    def locate(p):
        q = P.xy(*p); best = (1e18, 0)
        for i in range(len(xy) - 1):
            (ax0, ay0), (ax1, ay1) = xy[i], xy[i + 1]; dx, dy = ax1 - ax0, ay1 - ay0; L2 = dx * dx + dy * dy or 1e-9
            t = max(0, min(1, ((q[0] - ax0) * dx + (q[1] - ay0) * dy) / L2)); d = math.hypot(q[0] - ax0 - t * dx, q[1] - ay0 - t * dy)
            if d < best[0]: best = (d, km[i] + t * (km[i + 1] - km[i]))
        return best
    stations = []
    for w in wp:
        if isinstance(w, str):
            d, s = locate(ST[w]); stations.append({'id': w, 'zh': NAMES[w][0], 'en': NAMES[w][1], 'km': round(s / 1000, 2), 'off': round(d)})
    if ax == 'hsl':                                                # 科隆/波恩机场在新线的一个环线上：投到轴上，图上和它的里程对齐
        d, s = locate(ST['Köln/Bonn Flughafen']); stations.insert(2, {'id': 'Köln/Bonn Flughafen', 'zh': NAMES['Köln/Bonn Flughafen'][0], 'en': NAMES['Köln/Bonn Flughafen'][1], 'km': round(s / 1000, 2), 'off': round(d), 'loop': 1})
    # 隧道、桥、最高速度：沿轴按里程记成区间
    def runs(f):
        r = []
        for i, (a, b) in enumerate(zip(path, path[1:])):
            v = f(wtag[(a, b)])
            if r and r[-1][2] == v and abs(r[-1][1] - km[i]) < 1: r[-1][1] = km[i + 1]
            else: r.append([km[i], km[i + 1], v])
        return [[round(a / 1000, 2), round(b / 1000, 2), v] for a, b, v in r if v]
    tun = [[a, b] for a, b, v in runs(lambda t: 1 if t.get('tunnel') in ('yes', 'building_passage') else 0) if b - a > .15]
    bri = [[a, b] for a, b, v in runs(lambda t: 1 if t.get('bridge') == 'yes' else 0) if b - a > .12]
    def vmax(t):
        try: return int(str(t.get('maxspeed', '0')).split(';')[0].split()[0])
        except ValueError: return 0
    spd = runs(vmax)
    # 轴的路径（投影后的米）简化后也存下来：条带地图把它拉直，河流投到它的坐标里
    out['axes'][ax] = {'len': round(km[-1] / 1000, 2), 'stations': stations, 'tunnels': tun, 'bridges': bri, 'speed': spd}
    out['axes'][ax]['_xy'] = xy; out['axes'][ax]['_km'] = km
    print(f'  {ax}: {km[-1] / 1000:.1f} km, ' + ', '.join(f"{s['en']} {s['km']} (±{s['off']} m)" for s in stations))
    print(f'     隧道 {len(tun)} 段 {sum(b - a for a, b in tun):.1f} km，桥 {len(bri)} 座，限速分段 {len(spd)}')

# ---------- 3. 河流 → 条带坐标 ----------
rivers = fetch('rivers', BBOX, CACHE, query='way["waterway"="river"]["name"~"^(Rhein|Mosel|Lahn|Sieg|Main|Nahe|Wied|Ahr|Agger|Aar|Ems|Wisper)$"]({b});out geom;')
# 中莱茵河谷那一段的河道 way 没有写名字，只挂在“Rhein”这条河的关系里：按关系再取一遍，补进来
rhein = fetch('rhein', BBOX, CACHE, query='rel["waterway"="river"]["name"="Rhein"];way(r)["waterway"="river"]({b});out geom;')
have = {w['id'] for w in rivers}
for w in rhein:
    if w['id'] not in have: w.setdefault('tags', {})['name'] = 'Rhein'; rivers.append(w)
ZH = {'Rhein': '莱茵河', 'Mosel': '摩泽尔河', 'Lahn': '兰河', 'Sieg': '锡格河', 'Main': '美因河', 'Nahe': '纳厄河', 'Ahr': '阿尔河', 'Wied': '维德河', 'Agger': '阿格尔河', 'Aar': '阿尔河', 'Ems': '埃姆斯河', 'Wisper': '维斯珀河'}
LAT = 9000                                                         # 条带只画离线路 9 公里以内的东西
for ax, A in out['axes'].items():
    xy, km = A.pop('_xy'), A.pop('_km')
    # 稀一点的轴（每 ~300 米一个点）用来求 (s, n)
    idx = [0]
    for i in range(1, len(xy)):
        if km[i] - km[idx[-1]] > 300: idx.append(i)
    if idx[-1] != len(xy) - 1: idx.append(len(xy) - 1)
    ax_xy = [xy[i] for i in idx]; ax_km = [km[i] for i in idx]
    # 地理形状（开场画的是真实的地图，然后拉直成条带）：每 ~1 公里一个点，[公里, x, y]（x 东 y 北，公里，原点 7.6°E 50.45°N）
    gi = [0]
    for i in range(1, len(xy)):
        if km[i] - km[gi[-1]] > 1000: gi.append(i)
    if gi[-1] != len(xy) - 1: gi.append(len(xy) - 1)
    A['geo'] = [[round(km[i] / 1000, 2), round(xy[i][0] / 1000, 2), round(xy[i][1] / 1000, 2)] for i in gi]
    def sn(q):
        best = (1e18, 0, 0)
        for i in range(len(ax_xy) - 1):
            (x0, y0), (x1, y1) = ax_xy[i], ax_xy[i + 1]; dx, dy = x1 - x0, y1 - y0; L = math.hypot(dx, dy) or 1e-9
            t = max(0, min(1, ((q[0] - x0) * dx + (q[1] - y0) * dy) / L / L))
            px, py = x0 + t * dx, y0 + t * dy; d = math.hypot(q[0] - px, q[1] - py)
            if d < abs(best[0]):
                side = 1 if (dx * (q[1] - y0) - dy * (q[0] - x0)) > 0 else -1          # 行进方向的左边为正
                best = (side * d, ax_km[i] + t * (ax_km[i + 1] - ax_km[i]), 0)
        return best[1], best[0]
    strips = []
    for w in rivers:
        nm = w['tags'].get('name'); seq = []
        for g in w['geometry'][::2] + [w['geometry'][-1]]:
            q = P.xy(g['lon'], g['lat']); s, n = sn(q)
            if abs(n) < LAT and 0 < s < km[-1]: seq.append([round(s / 1000, 2), round(n / 1000, 2), round(q[0] / 1000, 2), round(q[1] / 1000, 2)])   # 条带坐标 (s, n) 和地理坐标 (x, y)
            else:
                if len(seq) > 1: strips.append({'n': nm, 'p': seq})
                seq = []
        if len(seq) > 1: strips.append({'n': nm, 'p': seq})
    A['rivers'] = strips; A['river_names'] = {k: v for k, v in ZH.items()}
    print(f'  {ax}: 河流 {len(strips)} 段')

# ---------- 4. 时刻表 ----------
# neo/geo/gtfs.py 先取出当天在走廊里停靠的车（日期、日历例外的处理用它的）；它的输出每站只有一个时刻（发车），
# 运行图要画停站的那一小段横线，所以到站和发车两个时刻由这里再从 stop_times.txt 读一遍，按车次对上。
import csv, io, time, zipfile
tmp = os.path.join(D, 'data', 'gtfs.cache', 'day.json')
subprocess.run([sys.executable, os.path.join(LIB, 'neo', 'geo', 'gtfs.py'), '--feed', FEED, '--date', DATE,
                '--bbox', ','.join(map(str, BBOX)), '--origin', f'{ORIGIN[0]},{ORIGIN[1]}', '--out', tmp], check=True)
G = json.load(open(tmp, encoding='utf-8'))
z = zipfile.ZipFile(FEED); rows = lambda n: csv.DictReader(io.TextIOWrapper(z.open(n), 'utf-8-sig'))
wd = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][time.strptime(DATE, '%Y%m%d').tm_wday]
on = {r['service_id'] for r in rows('calendar.txt') if r[wd] == '1' and r['start_date'] <= DATE <= r['end_date']}
for r in rows('calendar_dates.txt'):
    if r['date'] == DATE: (on.add if r['exception_type'] == '1' else on.discard)(r['service_id'])
routes = {r['route_id']: r for r in rows('routes.txt')}
trips = {r['trip_id']: r for r in rows('trips.txt') if r['service_id'] in on}
stops = {r['stop_id']: r for r in rows('stops.txt')}
import re
clean = lambda n: re.sub(r'\s+', ' ', re.sub(r'^\[[^\]]*\]\s*', '', n.split('|')[0])).strip()
secs = lambda s: (lambda h, m, x: int(h) * 3600 + int(m) * 60 + int(x))(*s.strip().split(':')) if s else None
ST_T = {}
for r in rows('stop_times.txt'):
    if r['trip_id'] in trips:
        ST_T.setdefault(r['trip_id'], []).append((int(r['stop_sequence']), clean(stops[r['stop_id']]['stop_name']), secs(r['arrival_time']), secs(r['departure_time']),
                                                 float(stops[r['stop_id']]['stop_lon']), float(stops[r['stop_id']]['stop_lat'])))
inbox = lambda v: any(BBOX[0] <= x[4] <= BBOX[2] and BBOX[1] <= x[5] <= BBOX[3] for x in v)
ST_T = {t: sorted(v) for t, v in ST_T.items() if inbox(v)}
n_gtfs = sum(len(p['dep']) for p in G['patterns'])
assert len(ST_T) == n_gtfs, f'和 gtfs.py 的结果对不上：{len(ST_T)} 趟 ≠ {n_gtfs}'
print(f'  {len(ST_T)} 趟车在走廊里停靠（和 neo/geo/gtfs.py 一致）')
KM = {ax: {s['id']: s['km'] for s in A['stations']} for ax, A in out['axes'].items()}
SHARED = set(KM['rhine']) & set(KM['hsl'])
def axis_of(a, b, dt):
    ca = [ax for ax in KM if a in KM[ax]]; cb = [ax for ax in KM if b in KM[ax]]; c = [ax for ax in ca if ax in cb]
    if not c: return None
    if len(c) == 1: return c[0]
    if {a, b} == {'Köln Hbf', 'Frankfurt(M) Flughafen Fernbf'}: return 'hsl' if dt < 100 * 60 else 'rhine'
    if {a, b} == {'Köln Hbf', 'Frankfurt(Main)Hbf'}: return 'hsl' if dt < 110 * 60 else 'rhine'
    return '?'                                                     # 两条轴共用的一段（机场—法兰克福总站）：跟着这趟车前后的段走
trains = []
for tid, v in ST_T.items():
    r = routes[trips[tid]['route_id']]; names = [ALIAS.get(x[1], x[1]) for x in v]
    A_ = [x[2] if x[2] is not None else x[3] for x in v]; D_ = [x[3] if x[3] is not None else x[2] for x in v]
    seg = [axis_of(names[i], names[i + 1], A_[i + 1] - D_[i]) for i in range(len(names) - 1)]
    for i in range(len(seg)):                                      # 共用段：取前一段的轴，没有就取后一段的
        if seg[i] == '?':
            prv = next((seg[j] for j in range(i - 1, -1, -1) if seg[j] not in (None, '?')), None)
            nxt = next((seg[j] for j in range(i + 1, len(seg)) if seg[j] not in (None, '?')), None)
            seg[i] = prv or nxt
    i = 0
    while i < len(seg):
        if not seg[i]: i += 1; continue
        ax = seg[i]; j = i
        while j + 1 < len(seg) and seg[j + 1] == ax: j += 1
        ids = names[i:j + 2]
        short = set(ids) <= {'Frankfurt(M) Flughafen Fernbf', 'Frankfurt(Main)Hbf'} or set(ids) <= {'Köln Hbf', 'Köln Messe/Deutz'}
        if not short:                                              # 只跑机场—总站、科隆总站—道依茨这一小段的车不画
            pts = [[KM[ax][names[k]], A_[k], D_[k]] for k in range(i, j + 2)]          # 每站：里程、到站、发车（秒，从当天零点算）
            trains.append({'ax': ax, 'cls': r['route_short_name'].split()[0], 'line': r['route_short_name'], 'pts': pts,
                           'from': names[i - 1] if i > 0 else None, 'to': names[j + 2] if j + 2 < len(names) else None,
                           'o': names[0], 'd': names[-1],
                           'fromT': D_[i - 1] if i > 0 else None, 'toT': A_[j + 2] if j + 2 < len(names) else None})
        i = j + 1
trains.sort(key=lambda t: (t['pts'][0][1]))
out['trains'] = trains
out['meta'] = {'date': DATE, 'weekday': wd, 'feed': 'gtfs.de fv_free (DELFI e.V.), CC BY 4.0',
               'map': '© OpenStreetMap contributors, ODbL 1.0', 'made': G['meta']['made'], 'origin': list(ORIGIN)}
from collections import Counter
print(f"  {len(trains)} 条运行线：" + ', '.join(f'{k} {v}' for k, v in Counter(t['ax'] + ':' + t['cls'] for t in trains).most_common()))
json.dump(out, open(os.path.join(D, 'data', 'graph.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(f"✓ data/graph.json {os.path.getsize(os.path.join(D, 'data', 'graph.json')) / 1e3:.0f} kB")
