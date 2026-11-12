#!/usr/bin/env python3
"""把 OpenStreetMap 的线路和海岸（data/metro.json、data/coast.json）切成一面墙上的砖 → data/mosaic.json。

    .venv/bin/python styles/metro-mosaic/demo/tools/prep.py

墙的网格：一格 = CELL 米（默认 200 米）。每格一片底砖：陆地白、海蓝、水库浅蓝。
线路的砖不走网格，沿真实线路按一格的间距排（马赛克的"走向"），每片记下它属于哪一期工程和在这一期里的先后。
分期（哪一段哪天开通）写在下面的 PHASES 里，来源见 ../FACTS.md；铺砖的时刻由 timeline.js 决定，这里不管。
只用 Python 标准库。"""
import json, math, os, sys

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CELL = 200.0
X0, Y0, X1, Y1 = -33000.0, -22000.0, 35000.0, 20000.0          # 墙上地图的范围（米，原点 114.075E 22.65N，和 metro.json 一致）
COLS, ROWS = int((X1 - X0) / CELL), int((Y1 - Y0) / CELL)

# 每条线用哪一条 OSM 线路关系（方向）画：metro.json 里 routes 的下标
ROUTE = {'1': 0, '2': 22, '3': 26, '4': 28, '5': 30, '6': 32, '6B': 34, '7': 36, '9': 40, '10': 2,
         '11': 4, '12': 8, '13': 9, '14': 13, '16': 15, '20': 19}
# 分期：[线, 从哪站开始铺, 铺到哪站, 开通日期]。"从"是这一段接在既有线上的那一头（新线取官方起点）。
# 2 号线和 8 号线贯通运营、同色，用 OSM 的 2&8 线路关系画，按段分期。来源：FACTS.md「分期」。
PHASES = [
    ['1', '罗湖', '世界之窗', '2004-12-28'],
    ['4', '少年宫', '福民', '2004-12-28'],
    ['4', '福民', '福田口岸', '2007-06-28'],
    ['1', '世界之窗', '深大', '2009-09-28'],
    ['2', '赤湾', '世界之窗', '2010-12-28'],
    ['3', '草埔', '双龙', '2010-12-28'],
    ['1', '深大', '机场东', '2011-06-15'],
    ['4', '少年宫', '清湖', '2011-06-16'],
    ['5', '前海湾', '黄贝岭', '2011-06-22'],
    ['2', '世界之窗', '新秀', '2011-06-28'],
    ['3', '草埔', '益田', '2011-06-28'],
    ['11', '福田', '碧头', '2016-06-28'],
    ['7', '西丽湖', '太安', '2016-10-28'],
    ['9', '红树湾南', '文锦', '2016-10-28'],
    ['5', '前海湾', '赤湾', '2019-09-28'],
    ['9', '红树湾南', '前湾', '2019-12-08'],
    ['6', '科学馆', '松岗', '2020-08-18'],
    ['10', '福田口岸', '双拥街', '2020-08-18'],
    ['2', '新秀', '盐田路', '2020-10-28'],                # 2 号线三期（新秀—莲塘）与 8 号线一期（莲塘—盐田路）同日开通
    ['3', '益田', '福保', '2020-10-28'],
    ['4', '清湖', '牛湖', '2020-10-28'],
    ['20', '机场北', '会展城', '2021-12-28'],
    ['14', '岗厦北', '沙田', '2022-10-28'],
    ['11', '福田', '岗厦北', '2022-10-28'],
    ['12', '左炮台东', '海上田园东', '2022-11-28'],
    ['6B', '光明', '深理工', '2022-11-28'],
    ['16', '大运', '田心', '2022-12-28'],
    ['2', '盐田路', '小梅沙', '2023-12-27'],
    ['3', '双龙', '坪地六联', '2024-12-28'],
    ['7', '西丽湖', '深大丽湖', '2024-12-28'],
    ['11', '岗厦北', '华强南', '2024-12-28'],
    ['12', '海上田园东', '松岗', '2024-12-28'],
    ['13', '深圳湾口岸', '高新中', '2024-12-28'],
    ['6B', '光明', '光明城', '2025-09-28'],
    ['16', '大运', '园山西坑', '2025-09-28'],
    ['2', '小梅沙', '溪涌', '2025-12-28'],
    ['5', '黄贝岭', '大剧院', '2025-12-28'],
    ['11', '华强南', '红岭南', '2025-12-28'],
    ['13', '高新中', '上屋', '2025-12-28'],
    ['13', '上屋', '李松蓢', '2026-06-28'],
]
NOT_OPEN = {'西丽高铁', '福临'}                                   # OSM 里有、还没开通的站（若出现就跳过）


def inside(px, py, ring):
    c = False; n = len(ring) // 2
    for i in range(n):
        x1, y1 = ring[2 * i], ring[2 * i + 1]; x2, y2 = ring[(2 * i + 2) % (2 * n)], ring[(2 * i + 3) % (2 * n)]
        if (y1 > py) != (y2 > py) and px < (x2 - x1) * (py - y1) / (y2 - y1) + x1: c = not c
    return c


def resample(path, pitch):
    """折线（米）→ 每 pitch 米一个点：[(x, y, s, 切线角)]"""
    pts = list(zip(path[0::2], path[1::2])); out = []; s = 0.0; nxt = 0.0
    for (ax, ay), (bx, by) in zip(pts, pts[1:]):
        L = math.hypot(bx - ax, by - ay)
        while nxt <= s + L and L > 0:
            f = (nxt - s) / L; out.append([ax + f * (bx - ax), ay + f * (by - ay), nxt]); nxt += pitch
        s += L
    for i, p in enumerate(out):                                    # 切线：前后各两个点平均，转角处不抖
        a = out[max(0, i - 2)]; b = out[min(len(out) - 1, i + 2)]
        p.append(math.atan2(b[1] - a[1], b[0] - a[0]))
    return out, s


def main():
    metro = json.load(open(os.path.join(D, 'data', 'metro.json'), encoding='utf-8'))
    coast = json.load(open(os.path.join(D, 'data', 'coast.json'), encoding='utf-8'))
    ST = metro['stations']; R = metro['routes']
    bx0, by0, bx1, by1 = coast['meta']['box']
    # —— 底砖：陆地 / 海 / 水库 ——
    land = coast['land']; water = [w for w in coast['water'] if w]
    wbox = []
    for w in water:
        xs = [v for r in w for v in r[0::2]]; ys = [v for r in w for v in r[1::2]]
        area = abs(sum(w[0][2 * i] * w[0][(2 * i + 3) % len(w[0])] - w[0][(2 * i + 2) % len(w[0])] * w[0][2 * i + 1] for i in range(len(w[0]) // 2))) / 2
        wbox.append((min(xs), min(ys), max(xs), max(ys), area))        # 细长的河（深圳河等）不画：只画湖和水库，免得一条河读成界线
    rows = []
    for j in range(ROWS):
        y = Y0 + (j + .5) * CELL; row = []
        for i in range(COLS):
            x = X0 + (i + .5) * CELL
            if not (bx0 < x < bx1 and by0 < y < by1): row.append('.'); continue      # 数据范围外：都在内陆，按陆地
            c = sum(inside(x, y, r) for r in land) % 2 == 1
            ch = '.' if c else '~'
            if c:
                for w, (a, b, cc, d, area) in zip(water, wbox):
                    if area > 1.2e6 and area / ((cc - a) ** 2 + (d - b) ** 2) > .05 and a < x < cc and b < y < d and sum(inside(x, y, r) for r in w) % 2 == 1: ch = 'r'; break
            row.append(ch)
        rows.append(''.join(row))
    # —— 线路的砖 ——
    lines, tiles, phases, stations = [], [], [], {}
    sid = {}
    refs = []
    for p in PHASES:
        if p[0] not in refs: refs.append(p[0])
    for ref in refs:
        r = R[ROUTE[ref]]
        lines.append({'ref': ref, 'colour': r['colour'].upper(), 'name': r['name']})
    occupied = []                                                  # 已经铺下的砖（格坐标），给后来的线让位
    grid = {}
    def near(u, v, li):
        for di in (-1, 0, 1):
            for dj in (-1, 0, 1):
                for (uu, vv, l2) in grid.get((int(u) + di, int(v) + dj), ()):
                    if l2 != li and (uu - u) ** 2 + (vv - v) ** 2 < .8 ** 2: return True
        return False
    order = sorted(range(len(PHASES)), key=lambda k: PHASES[k][3])
    samp = {}
    for li, ref in enumerate(refs):
        r = R[ROUTE[ref]]
        pts, L = resample(r['path'][0], CELL)
        stops = {ST[k]['n']: s for k, s in r['stops']}
        samp[ref] = (pts, stops, r)
    for k in order:
        ref, a, b, date = PHASES[k]; li = refs.index(ref); pts, stops, r = samp[ref]
        sa, sb = stops[a], stops[b]; lo, hi = min(sa, sb), max(sa, sb)
        mine = [p for p in pts if lo - CELL * .5 <= p[2] <= hi + CELL * .5 and not any(p[2] in q for q in [])]
        # 相邻两期在交界站各算一次：交界那一片归先开通的那期
        mine.sort(key=lambda p: abs(p[2] - sa))
        out = []; side = 0.0
        for p in mine:
            u, v = (p[0] - X0) / CELL, (p[1] - Y0) / CELL
            key = (ref, round(p[2]))
            if key in samp.setdefault('_done', set()): continue
            samp['_done'].add(key)
            # 和别的线挤在同一条走廊里（并行、共站）：往法线方向让一格，尽量和上一片让在同一边，线才连续
            nx, ny = -math.sin(p[3]), math.cos(p[3]); ok = None
            for o in dict.fromkeys([side, 0.0, .95, -.95, 1.9, -1.9]):
                if not near(u + nx * o, v + ny * o, li): ok = o; break
            if ok is None: continue
            side = ok if ok != 0 else side * .0
            u, v = u + nx * ok, v + ny * ok
            out.append([round(u, 3), round(v, 3), round(p[3], 3)])
            grid.setdefault((int(u), int(v)), []).append((u, v, li))
        n = len(out)
        for kk, t in enumerate(out): tiles.append(t + [len(phases), kk])
        # 这一期开通的站
        sts = []
        for name, s in stops.items():
            if name in NOT_OPEN: continue
            if lo - 1 <= s <= hi + 1:
                sts.append((abs(s - sa), name))
        phases.append({'line': li, 'a': a, 'b': b, 'date': date, 'n': n, 'len': round(hi - lo),
                       'stations': [[nm, round(d / max(1, hi - lo), 4)] for d, nm in sorted(sts)]})
    pos = {}
    for pi, ph in enumerate(phases):
        for nm, f in ph['stations']:
            s = next(x for x in ST if x['n'] == nm)
            st = stations.setdefault(nm, {'n': nm, 'en': s['en'], 'at': []})
            st['at'].append([ph['line'], pi, f])
            # 站在线上的位置：这一期里离车站最近的一片砖（并行时让开的砖也跟着），没有砖时用 OSM 的车站点
            su, sv = (s['x'] - X0) / CELL, (s['y'] - Y0) / CELL
            cand = [t for t in tiles if t[3] == pi]
            if cand:
                t = min(cand, key=lambda t: (t[0] - su) ** 2 + (t[1] - sv) ** 2)
                if (t[0] - su) ** 2 + (t[1] - sv) ** 2 < 9: su, sv = t[0], t[1]
            pos.setdefault(nm, {})[ph['line']] = (su, sv)
    for nm, st in stations.items():
        ps = list(pos[nm].values()); st['u'] = round(sum(p[0] for p in ps) / len(ps), 2); st['v'] = round(sum(p[1] for p in ps) / len(ps), 2)
    out = {'meta': {'cell': CELL, 'x0': X0, 'y0': Y0, 'cols': COLS, 'rows': ROWS, 'origin': metro['meta']['origin'],
                    'source': 'OpenStreetMap (Overpass API), fetched ' + metro['meta']['date'], 'license': 'ODbL 1.0, © OpenStreetMap contributors'},
           'grid': rows, 'lines': lines, 'phases': phases, 'tiles': tiles, 'stations': list(stations.values())}
    p = os.path.join(D, 'data', 'mosaic.json')
    json.dump(out, open(p, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    sea = sum(r.count('~') for r in rows); res = sum(r.count('r') for r in rows)
    print(f'{p}: {os.path.getsize(p) / 1024:.0f} kB  {COLS}×{ROWS} 格  海 {sea}  水库 {res}  线路砖 {len(tiles)}  站 {len(stations)}  分期 {len(phases)}')
    for ph in phases: print(f"  {ph['date']}  {refs[ph['line']]:>3}  {ph['a']}→{ph['b']}  {ph['n']} 片  {len(ph['stations'])} 站")


if __name__ == '__main__':
    main()
