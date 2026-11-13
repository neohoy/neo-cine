#!/usr/bin/env python3
"""广州地铁的真实线网（OpenStreetMap 线路关系）→ 一张八方向示意图 → net.js（上游 Transit Map 的 net.js 格式）。

    .venv/bin/python -I styles/transit-map/demo/tools/prep.py [--preview out.png]

输入（build.sh 先准备好，已提交）：
  data/metro.json   neo/geo/routes.py：每条线的 OSM 线路关系（站序、颜色、真实轨道），车站按站名合并
  data/water.json   neo/geo/osm.py：河道中心线（珠江西航道、前航道、后航道、黄埔航道、虎门水道、沙湾水道……）
输出：
  net.js            window.NET = {G, ST, LINES, WATER, LINKS, pt, sid, expand}：车站在 0.1 G 格点上，线路是站名列表加折点

做法（只用标准库和 numpy）：
  1. 拓扑：每条线取一条代表线路关系定站序（3 号线、14 号线、12 号线各有一条支线/第二段，11 号线是环）；
     去掉 OSM 里混进站序的站台节点（"1站台"之类）；站名就是车站的 id。
  2. 骨架：换乘站、端点、分叉点是"节点"，节点之间的一段线（中间可能有几个普通站）是一条"边"。两条线在同一对节点之间
     各走各的（比如 11 号线和广佛线都连沙涌、燕岗），就把其中一条从中间的车站断开，让它能拐弯。
  3. 八方向化（沿用 styles/flat-metro/demo/tools/prep.py 的办法）：先把真实位置做一次径向压缩（市中心放大、外围收拢），
     每条边想要的长度 = 站距 × (中间站数 + 1)（示意图的站距大致均匀），方向取最近的 0/45/90°（同一条线前后段有粘性），
     最小二乘解出节点位置，反复几轮；再把每条边的垂直分量投影成 0，压不成的边放开，画成一个折弯。
  4. 落格点：节点取 0.1 G 格点；放开的边由 加一个折点（两种折法里自动挑和别的线重叠最少的，CORNER 可以手工指定）；
     中间的普通站沿这条八方向路径等距排开，也落在格点上，并避开拐角的圆弧。
  5. 手调：MOVE 里写个别节点的位置（G），全部可复现。
  6. 水：真实河道中心线按"附近车站的位移"做插值变形，再化成八方向折线；检查每段站间连线过不过河，和真实情况一致。
示意图是我们自己画的：拓扑、站序、线路颜色和真实一致，几何位置不是。"""
import json, math, os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__)); D = os.path.dirname(HERE); DATA = os.path.join(D, 'data')
CENTER = (500.0, 1300.0)          # 压缩的中心（米，原点 113.32E 23.12N）：体育西路、珠江新城一带
RIN, R0 = 9000.0, 7000.0          # 径向压缩：r < RIN 不变；往外 RIN + R0·ln(1 + (r − RIN)/R0)
KM = 0.62                         # 压缩后 1 G 合多少千米
SPACING = 0.95                    # 示意图上的标准站距（G）
LMIN = 0.9                        # 一条边的最短长度（G）
ANCHOR = 0.12                     # 节点贴近（压缩后）真实位置的权重
LREAL = 0.55                      # 边长至少是（压缩后）真实距离的这么多倍
DIRS = [(math.cos(k * math.pi / 4), math.sin(k * math.pi / 4)) for k in range(8)]

# 中文名 → 英文名：OSM 缺的几个补上
EN_FIX = {'神舟路': 'Shenzhou Road', '金坑': 'Jinkeng', '机场南': 'Airport South'}
# OSM 里漏掉的车站：3 号线机场南（2010 年北延段的终点，2018 年延到机场北后是中间站），位置取高增和机场北之间
MISSING = {('3', 'branch'): ('高增', '机场南', '机场北')}
# 每条线：代表线路关系的选择（ref, 起点, 终点）；支线/第二段另列
PICK = {
    '1': ('西塱', '广州东站'), '2': ('嘉禾望岗', '广州南站'), '4': ('黄村', '南沙客运港'), '5': ('滘口', '黄埔新港'),
    '6': ('浔峰岗', '香雪'), '7': ('美的大道', '燕山'), '8': ('滘心', '万胜围'), '9': ('飞鹅岭', '高增'), '10': ('西塱', '杨箕东'),
    '13': ('天河公园', '新沙'), '18': ('冼村', '万顷沙'), '21': ('天河公园', '增城广场'), '22': ('芳村', '番禺广场'),
    'GF': ('新城东', '沥滘'), 'APM': ('林和西', '广州塔'),
}
SPECIAL = {   # 线 → [(key, 站序取自哪条线路关系：起点, 终点)]
    '3': [('route', '海傍', '天河客运站'), ('branch', '体育西路', '机场北')],
    '14': [('route', '乐嘉路', '东风'), ('branch', '新和', '镇龙')],
    '12': [('route', '浔峰岗', '广州体育馆'), ('branch', '二沙岛', '大学城南')],
}
ORDER = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '18', '21', '22', 'GF', 'APM']

# 手调：节点的位置（G），在自动结果之上覆盖
MOVE = {
    # 天河东部：4 号线竖直穿过车陂南、车陂到黄村；13 号线往东、21 号线往东北，各走各的
    '车陂': (7.3, -1.3), '黄村': (7.3, -3.6),
    # 天河中心：3 号线竖直；1 号线从体育西路往东绕到体育中心再北上广州东站；APM 在两者之间；冼村让开 APM
    '体育西路': (0.1, -2.0), '客村': (0.1, 3.3), '珠江新城': (0.1, 0.5), '广州塔': (0.1, 2.4), '林和西': (0.1, -3.3), '广州东站': (0.1, -4.8), '华师': (2.9, -4.8), '石牌桥': (1.5, -3.4),
    '二沙岛': (-1.8, 1.6), '赤岗塔': (1.0, 2.85), '妇儿中心': (-0.6, -0.8), '花城大道': (-0.6, -0.2), '大剧院': (-0.6, 0.95), '海心沙': (-0.6, 1.55), '冼村': (1.7, -0.5), '赤岗': (2.2, 3.3),
    # 白云：2 号线从嘉禾望岗斜下到白云文化广场再竖直；14 号线先平后斜到新市墟；12 号线横穿
    '白云文化广场': (-7.8, -10.7), '新市墟': (-9.6, -10.7), '乐嘉路': (-8.7, -9.0), '广州体育馆': (-6.6, -9.5),
    '体育中心': (0.9, -2.0), '梓元岗': (-6.3, -6.6),
    # 1 号线一行 y=-2.0；6 号线竖直 x=-4.5（区庄、东山口、东湖）
    '陈家祠': (-10.7, -2.0), '东山口': (-4.5, -2.0), '杨箕': (-2.3, -2.0), '区庄': (-4.5, -3.6),
    '东湖': (-4.5, 1.1), '五羊邨': (-2.3, 0.5),
    # 海珠西南：11 号线一行 y=5.6；广佛线在沙涌—沙园—燕岗拱起；2 号线昌岗—江泰路竖直
    '沙涌': (-11.4, 4.4), '沙园': (-8.0, 4.4), '燕岗': (-6.8, 5.6), '棣园': (-8.4, 5.6),
    '东沙': (-8.6, 7.4), '大干围': (-6.7, 7.4), '工业大道南': (-5.9, 7.4), '沙溪': (3.3, 10.6), '大学城北': (7.3, 10.0),
    '市二宫': (-6.7, 2.1), '江南西': (-6.1, 2.7), '浔峰岗北': (-13.8, -6.6), '西洲': (-12.6, -7.8), '聚龙': (-10.7, -7.8), '滘心': (-10.7, -14.3),
    '杨箕东': (-1.5, -0.3), '燕塘': (0.1, -7.6), '天河客运站': (2.9, -7.6), '江泰路': (-5.5, 5.6), '五凤': (-4.5, 5.6), '大塘': (0.1, 5.6),
    '龙潭': (3.3, 5.6), '赤沙': (4.5, 5.6), '琶洲': (4.5, 3.3), '东晓南': (-4.5, 6.6), '南洲': (-3.5, 8.4), '沥滘': (0.1, 8.4), '石壁': (-3.5, 13.6), '广州南站': (-4.6, 14.7),
    '昌岗': (-5.5, 3.3), '海珠广场': (-7.7, 1.1), '公园前': (-7.7, -2.0), '广州火车站': (-7.7, -5.6), '西塱': (-14.4, 7.4), '花地湾': (-13.7, 4.2),
    # 番禺：18 号线竖直 x=3.3 过南村万博、番禺广场；7 号线横着到汉溪长隆；3 号线从汉溪长隆斜下到番禺广场；22 号线先斜后平
    '汉溪长隆': (0.5, 13.6), '南村万博': (3.3, 14.6), '番禺广场': (3.3, 16.4), '海傍': (13.5, 16.4), '磨碟沙': (3.3, 3.3),
    # 老城西：8 号线竖直 x=-10.7；11 号线北段一行 y=-4.8；5 号线西村—广州火车站一行 y=-5.6；11 号线竖直 x=-12.2 过如意坊到芳村；
    # 1 号线芳村—黄沙斜着过白鹅潭
    '西村': (-10.7, -5.6), '彩虹桥': (-10.7, -4.8), '沙河': (-2.7, -4.8),
    '中山八': (-12.2, -3.3), '坦尾': (-14.0, -3.3), '滘口': (-15.5, -1.8), '浔峰岗': (-14.6, -5.8),
    '如意坊': (-12.2, -0.4), '芳村': (-13.7, 2.6), '黄沙': (-10.7, 1.1), '文化公园': (-9.7, 1.1),
}
CORNER = {tuple(sorted(k)): v for k, v in {('芳村', '西塱'): (-14.4, 3.3), ('二沙岛', '赤岗塔'): (-0.55, 2.85), ('东晓南', '西塱'): (-5.3, 7.4),
                                                ('南洲', '燕岗'): (-4.0, 8.4)}.items()}        # 两站（按名字排序）之间的折点，手工指定（G）
FORCE_NODES = {'体育中心', '梓元岗', '石牌桥', '花地湾', '赤岗塔', '棣园', '东沙', '大干围', '工业大道南', '沙溪', '市二宫', '江南西', '浔峰岗北', '西洲', '花城大道', '大剧院', '海心沙'}   # 这些普通站也当节点，好单独挪


def load(p): return json.load(open(p, encoding='utf-8'))


def compress(x, y):
    """径向压缩：RIN 米以内不变，往外按对数收拢"""
    dx, dy = x - CENTER[0], y - CENTER[1]; r = math.hypot(dx, dy)
    if r < RIN: return (dx, dy)
    k = (RIN + R0 * math.log(1 + (r - RIN) / R0)) / r
    return (dx * k, dy * k)


def topology():
    m = load(os.path.join(DATA, 'metro.json')); S = m['stations']
    def seq_of(r): return [S[i]['n'] for i, s in r['stops'] if '站台' not in S[i]['n'] and not S[i]['n'].isdigit()]
    def find(ref, a, b):
        best = None
        for r in m['routes']:
            if r['ref'] != ref: continue
            q = seq_of(r)
            for qq in (q, q[::-1]):
                if qq and qq[0] == a and qq[-1] == b and (best is None or len(qq) > len(best)): best = qq
        if not best: sys.exit(f'prep: 找不到 {ref} {a}→{b}')
        return best
    colour = {L['ref']: L['colour'].upper() for L in m['lines']}
    lines = []
    for ref in ORDER:
        if ref in SPECIAL:
            parts = {k: find(ref, a, b) for k, a, b in SPECIAL[ref]}
            for (lr, key), (x, new, y) in MISSING.items():
                q = parts.get(key) if lr == ref else None
                if q and new not in q:
                    i = q.index(x); assert q[i + 1] == y; q.insert(i + 1, new)
            lines.append({'id': ref, 'color': colour[ref], **parts})
        elif ref == '11':
            r = max((r for r in m['routes'] if r['ref'] == '11'), key=lambda r: len(r['stops']))
            q = seq_of(r); lines.append({'id': ref, 'color': colour[ref], 'route': q + [q[0]], 'loop': True})
        else:
            lines.append({'id': ref, 'color': colour[ref], 'route': find(ref, *PICK[ref])})
    # 车站：同名合并（水西：7 号线和 21 号线的站台相距 400 米以上，OSM 合成了两个），位置取平均
    pos, en = {}, {}
    for s in S:
        pos.setdefault(s['n'], []).append((s['x'], s['y'])); en.setdefault(s['n'], s['en'] or EN_FIX.get(s['n'], ''))
    P = {n: (sum(p[0] for p in v) / len(v), sum(p[1] for p in v) / len(v)) for n, v in pos.items()}
    for x, new, y in MISSING.values():
        if new not in P: P[new] = ((P[x][0] + P[y][0]) / 2, (P[x][1] + P[y][1]) / 2); en.setdefault(new, EN_FIX[new])
    return lines, P, en, m


def runs(lines):
    """骨架：节点和边。返回 nodes(set), edges [{a, b, mid:[站], line, key}]"""
    seqs = [(L['id'], k, L[k]) for L in lines for k in ('route', 'branch') if k in L]
    cnt = {}
    for _, _, q in seqs:
        for n in set(q): cnt[n] = cnt.get(n, 0) + 1
    nb = {}
    for _, _, q in seqs:
        for a, b in zip(q, q[1:]): nb.setdefault(a, set()).add(b); nb.setdefault(b, set()).add(a)
    nodes = {n for n in cnt if cnt[n] > 1 or len(nb[n]) != 2} | FORCE_NODES
    for _, _, q in seqs: nodes.add(q[0]); nodes.add(q[-1])
    # 环线：至少三个节点（赤沙之外）
    for _ in range(3):
        edges = []
        for lid, key, q in seqs:
            idx = [i for i, n in enumerate(q) if n in nodes]
            for i, j in zip(idx, idx[1:]): edges.append({'a': q[i], 'b': q[j], 'mid': q[i + 1:j], 'line': lid, 'key': key})
        # 同一对节点之间的重边、过长的边：从中间断开
        seen, add = {}, set()
        for e in edges:
            k = tuple(sorted((e['a'], e['b'])))
            if k in seen and e['mid']: add.add(e['mid'][len(e['mid']) // 2])
            elif k in seen and seen[k]['mid']: add.add(seen[k]['mid'][len(seen[k]['mid']) // 2])
            seen.setdefault(k, e)
            if len(e['mid']) >= 7: add.add(e['mid'][len(e['mid']) // 2])
        if not add: break
        nodes |= add
    return nodes, edges


def snap_dir(v, prefer=()):
    a = math.atan2(v[1], v[0]); best, bk = 1e9, 0
    for k in range(8):
        d = abs((a - k * math.pi / 4 + math.pi) % (2 * math.pi) - math.pi)
        d -= math.radians(9) * (k in prefer)
        if d < best: best, bk = d, k
    return bk


def octilinear(names, A, E, Lw, line_edges):
    N = len(names); P = A.copy(); dk = [None] * len(E)
    nb = {e: [] for e in range(len(E))}
    for seq in line_edges:
        for a, b in zip(seq, seq[1:]): nb[a].append(b); nb[b].append(a)
    for it in range(80):
        new = []
        for e, (i, j) in enumerate(E):
            v = P[j] - P[i]; pref = set()
            for f in nb[e]:
                if dk[f] is None: continue
                fi, fj = E[f]
                pref.add(dk[f] if (fj == i or fi == j) else (dk[f] + 4) % 8)
            new.append(snap_dir(v, pref))
        dk = new
        M = np.zeros((N, N)); bx = np.zeros(N); by = np.zeros(N)
        for e, (i, j) in enumerate(E):
            dx, dy = DIRS[dk[e]]; L = Lw[e]
            M[i, i] += 1; M[j, j] += 1; M[i, j] -= 1; M[j, i] -= 1
            bx[j] += L * dx; bx[i] -= L * dx; by[j] += L * dy; by[i] -= L * dy
        M += ANCHOR * np.eye(N); bx += ANCHOR * A[:, 0]; by += ANCHOR * A[:, 1]
        P = np.stack([np.linalg.solve(M, bx), np.linalg.solve(M, by)], 1)
    free = set()
    for _ in range(14):
        rows = []
        for e, (i, j) in enumerate(E):
            if e in free: continue
            dx, dy = DIRS[dk[e]]; nx, ny = -dy, dx; r = np.zeros(2 * N)
            r[2 * i] -= nx; r[2 * i + 1] -= ny; r[2 * j] += nx; r[2 * j + 1] += ny; rows.append(r)
        Mx = np.array(rows); q = P.reshape(-1)
        Q = (q - Mx.T @ np.linalg.lstsq(Mx @ Mx.T, Mx @ q, rcond=None)[0]).reshape(N, 2)
        bad = [e for e, (i, j) in enumerate(E) if e not in free and np.dot(Q[j] - Q[i], DIRS[dk[e]]) < .6 * Lw[e]]
        if not bad: break
        free |= set(bad)
    return Q, dk, free


def bend_path(a, b, diag_first):
    dx, dy = b[0] - a[0], b[1] - a[1]; ax, ay = abs(dx), abs(dy)
    if ax < 1e-6 or ay < 1e-6 or abs(ax - ay) < 1e-6: return [a, b]
    d = min(ax, ay); sx, sy = math.copysign(1, dx), math.copysign(1, dy)
    m = (a[0] + sx * d, a[1] + sy * d) if diag_first else (b[0] - sx * d, b[1] - sy * d)
    return [a, m, b]


def place_mid(path, k):
    """八方向折线 path 上等距放 k 个站（落 0.1 格点，避开拐角 0.35 G 以内）"""
    seglen = [math.dist(p, q) for p, q in zip(path, path[1:])]; T = sum(seglen)
    out = []
    for m in range(1, k + 1):
        s = T * m / (k + 1)
        # 避开拐角
        acc = 0
        for i, L in enumerate(seglen):
            if s <= acc + L + 1e-9:
                lo, hi = acc + (0.35 if i > 0 else 0), acc + L - (0.35 if i < len(seglen) - 1 else 0)
                if hi > lo: s = min(max(s, lo), hi)
                f = (s - acc) / L if L else 0
                p, q = path[i], path[i + 1]
                x, y = p[0] + f * (q[0] - p[0]), p[1] + f * (q[1] - p[1])
                # 沿段方向落到格点
                ux, uy = (q[0] - p[0]) / L, (q[1] - p[1]) / L
                step = 0.1 * (math.sqrt(2) if abs(ux) > 1e-6 and abs(uy) > 1e-6 else 1)
                n = round((math.dist(p, (x, y))) / step)
                x, y = p[0] + ux * n * step, p[1] + uy * n * step
                out.append((round(x, 1), round(y, 1))); break
            acc += L
    return out


def main():
    lines, P, EN, metro = topology()
    nodes, edges = runs(lines)
    names = sorted(nodes); idx = {n: i for i, n in enumerate(names)}
    # 压缩后的真实位置，y 向南为正，单位换成 G（先取 1 G ≈ 压缩后的 600 米）
    A = np.array([compress(*P[n]) for n in names]) / (KM * 1000); A[:, 1] *= -1
    E, Lw, eid = [], [], {}
    for e in edges:
        k = tuple(sorted((e['a'], e['b'])))
        if k in eid: e['eid'] = eid[k]; continue
        eid[k] = e['eid'] = len(E); E.append((idx[e['a']], idx[e['b']]))
        real = math.dist(A[idx[e['a']]], A[idx[e['b']]])
        Lw.append(max(LMIN, SPACING * (len(e['mid']) + 1), LREAL * real))
    line_edges = []
    for L in lines:
        for key in ('route', 'branch'):
            if key in L: line_edges.append([e['eid'] for e in edges if e['line'] == L['id'] and e['key'] == key])
    Q, dk, free = octilinear(names, A, E, Lw, line_edges)
    Q = Q - Q.mean(0)
    G = {n: (round(float(Q[idx[n]][0]), 1), round(float(Q[idx[n]][1]), 1)) for n in names}
    G.update(MOVE)
    print(f'骨架：{len(names)} 个节点，{len(E)} 条边，放开 {len(free)} 条')
    # 每条边的八方向路径：已经是 0/45/90° 的直接连；否则加一个折点，两种折法里挑和别的线重叠最少、离别的站最远的
    ST = dict(G); corner = {}
    segs = []                                   # 已定下的线段 (p, q, 线)
    def straight(e): return len(bend_path(G[e['a']], G[e['b']], False)) == 2
    for e in sorted(edges, key=lambda e: not straight(e)):
        a, b = G[e['a']], G[e['b']]; key = tuple(sorted((e['a'], e['b'])))
        if key in corner: continue
        if straight(e): corner[key] = None; segs.append((a, b, e['line'])); continue
        if key in CORNER: c = CORNER[key]
        else:
            best = None
            for diag in (False, True):
                path = bend_path(a, b, diag); sc = 0
                for p, q in zip(path, path[1:]):
                    for (u, v, ln) in segs: sc += 10 * overlap(p, q, u, v)
                    for n, xy in G.items():
                        if n in (e['a'], e['b']): continue
                        d = seg_dist(xy, p, q)
                        if d < .5: sc += (.5 - d) * 4
                if best is None or sc < best[0]: best = (sc, path[1])
            c = best[1]
        corner[key] = c; segs += [(a, c, e['line']), (c, b, e['line'])]
    for e in edges:
        a, b = G[e['a']], G[e['b']]; c = corner[tuple(sorted((e['a'], e['b'])))]
        path = [a, c, b] if c else [a, b]
        for n, p in zip(e['mid'], place_mid(path, len(e['mid']))): ST[n] = p
        e['corner'] = c
    # 每条线的 route 条目：站名，折点 [x, y] 插在它前后两站之间
    for L in lines:
        for key in ('route', 'branch'):
            if key not in L: continue
            items = []
            for e in [e for e in edges if e['line'] == L['id'] and e['key'] == key]:
                run = [e['a']] + e['mid'] + [e['b']]
                if not items: items.append(run[0])
                if e['corner']:
                    c = e['corner']; pa = G[e['a']]; dc = math.dist(pa, c); done = False
                    for n in run[1:]:
                        if not done and math.dist(pa, ST[n]) > dc + 1e-6: items.append(list(c)); done = True
                        items.append(n)
                else: items += run[1:]
            L[key + '_items'] = items
    json.dump({'ST': ST, 'lines': lines, 'nodes': names, 'en': {n: EN.get(n, '') for n in ST}},
              open(os.path.join(D, 'out', 'layout.json'), 'w'), ensure_ascii=False)
    check(ST, lines)
    check_water(ST, lines)
    if '--preview' in sys.argv: preview(ST, lines, sys.argv[sys.argv.index('--preview') + 1], nodes)


def expand(ST, items):
    out = []
    for it in items:
        p = ST[it] if isinstance(it, str) else tuple(it)
        if out: out += bend_path(out[-1], p, False)[1:]
        else: out.append(p)
    return out


def seg_dist(q, p0, p1):
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]; L2 = dx * dx + dy * dy or 1e-9
    t = max(0, min(1, ((q[0] - p0[0]) * dx + (q[1] - p0[1]) * dy) / L2))
    return math.hypot(q[0] - p0[0] - t * dx, q[1] - p0[1] - t * dy)


def overlap(p, q, u, v):
    """两条线段共线重叠的长度（相距 0.15 G 以内、方向平行）"""
    d1 = (q[0] - p[0], q[1] - p[1]); d2 = (v[0] - u[0], v[1] - u[1]); L1 = math.hypot(*d1); L2 = math.hypot(*d2)
    if L1 < 1e-6 or L2 < 1e-6 or abs(d1[0] * d2[1] - d1[1] * d2[0]) / (L1 * L2) > .05: return 0
    if seg_dist(u, p, q) > .15 and seg_dist(v, p, q) > .15 and seg_dist(p, u, v) > .15 and seg_dist(q, u, v) > .15: return 0
    ux, uy = d1[0] / L1, d1[1] / L1
    s = sorted([((x[0] - p[0]) * ux + (x[1] - p[1]) * uy) for x in (u, v)])
    return max(0, min(L1, s[1]) - max(0, s[0]))


def line_polys(ST, lines):
    return [(L, key, expand(ST, L[key + '_items'])) for L in lines for key in ('route', 'branch') if key in L]


def check(ST, lines):
    pl = line_polys(ST, lines)
    names = list(ST); bad = 0
    for i, a in enumerate(names):
        for b in names[i + 1:]:
            if math.dist(ST[a], ST[b]) < 0.45: print(f'  ! 太近：{a} {b} {math.dist(ST[a], ST[b]):.2f}'); bad += 1
    print(f'检查：{bad} 处车站太近')


def preview(ST, lines, out, nodes):
    from PIL import Image, ImageDraw, ImageFont
    xs = [p[0] for p in ST.values()]; ys = [p[1] for p in ST.values()]
    S = 44; pad = 3; W = int((max(xs) - min(xs) + 2 * pad) * S); H = int((max(ys) - min(ys) + 2 * pad) * S)
    ox, oy = min(xs) - pad, min(ys) - pad
    im = Image.new('RGB', (W, H), (242, 238, 229)); d = ImageDraw.Draw(im)
    f = ImageFont.truetype('/System/Library/Fonts/Hiragino Sans GB.ttc', 15)
    tr = lambda p: ((p[0] - ox) * S, (p[1] - oy) * S)
    # 网格
    for gx in range(int(ox), int(ox + W / S) + 1): d.line([tr((gx, oy)), tr((gx, oy + H / S))], fill=(230, 226, 216))
    for gy in range(int(oy), int(oy + H / S) + 1): d.line([tr((ox, gy)), tr((ox + W / S, gy))], fill=(230, 226, 216))
    for g, rp in RIVERS.items():
        if rp: d.line([tr(p) for p in rp], fill=(188, 214, 234), width=int(S * (.76 if g != 'south' else .3)), joint='curve')
    for L, key, pts in line_polys(ST, lines):
        d.line([tr(p) for p in pts], fill=L['color'], width=7, joint='curve')
    for n, p in ST.items():
        x, y = tr(p); r = 6 if n in nodes else 4
        d.ellipse([x - r, y - r, x + r, y + r], fill='white', outline='black' if n in nodes else (90, 90, 90), width=2)
        d.text((x + 7, y - 9), n, fill=(30, 30, 30) if n in nodes else (130, 125, 115), font=f)
    im.save(out); print(out, im.size)




# ———————————————————— 水：真实河道 → 示意图坐标（按附近车站的位移插值） ————————————————————
CHANNELS = ['珠江西航道', '珠江前航道', '珠江后航道', '珠江黄埔航道', '虎门水道', '沙湾水道', '蕉门水道', '市桥水道', '三枝香水道', '大石水道', '平洲水道', '洪奇沥水道', '东江北干流', '流溪河']


def warp_fn(ST, P):
    """真实坐标（米）→ 示意图坐标（G）：先径向压缩，再加上附近车站位移的反距离加权平均"""
    names = [n for n in ST if n in P]
    A = np.array([compress(*P[n]) for n in names]) / (KM * 1000); A[:, 1] *= -1
    S = np.array([ST[n] for n in names]); Dv = S - A
    def f(x, y):
        a = np.array(compress(x, y)) / (KM * 1000); a[1] *= -1
        d = np.linalg.norm(A - a, axis=1); w = 1 / (d ** 3 + .05)
        return a + (w[:, None] * Dv).sum(0) / w.sum()
    return f


def rivers_schematic():
    lay = json.load(open(os.path.join(D, 'out', 'layout.json'), encoding='utf-8'))
    lines, P, EN, metro = topology()
    f = warp_fn(lay['ST'], P)
    wat = load(os.path.join(DATA, 'water.json')); out = {}
    for r in wat['rivers']:
        if r['n'] in CHANNELS:
            pts = [tuple(float(v) for v in f(x, y)) for x, y in zip(r['p'][0::2], r['p'][1::2])]
            out.setdefault(r['n'], []).append(pts)
    return out


def seg_x(p, q, u, v):
    d = lambda a, b, c: (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
    return d(p, q, u) * d(p, q, v) < 0 and d(u, v, p) * d(u, v, q) < 0


def slim_water():
    """osm.py 取回来的是这个范围里所有的河涌；只留下用得到的几条主航道，文件小一点再提交"""
    p = os.path.join(DATA, 'water.json'); w = load(p)
    if all(r['n'] in CHANNELS for r in w['rivers']) and not w.get('land'): return
    w['rivers'] = [r for r in w['rivers'] if r['n'] in CHANNELS]; w.pop('land', None)
    w['meta']['note'] = 'slimmed by tools/prep.py to the channels in CHANNELS'
    json.dump(w, open(p, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print('water.json：只留主航道', len(w['rivers']), '段')


def real_crossings(names=CHANNELS):
    """真实轨道上，每一对相邻车站之间穿过了哪条河道 → {(站a, 站b): {河道名}}"""
    m = load(os.path.join(DATA, 'metro.json')); S = m['stations']; wat = load(os.path.join(DATA, 'water.json'))
    riv = [(r['n'], list(zip(r['p'][0::2], r['p'][1::2]))) for r in wat['rivers'] if r['n'] in names]
    out = {}
    for r in m['routes']:
        if r['ref'].startswith('TH'): continue
        pts = [(x, y) for pc in r['path'] for x, y in zip(pc[0::2], pc[1::2])]
        L = [0]
        for a, b in zip(pts, pts[1:]): L.append(L[-1] + math.dist(a, b))
        st = [(S[i]['n'], s) for i, s in r['stops'] if '站台' not in S[i]['n'] and not S[i]['n'].isdigit()]
        for (na, sa), (nb, sb) in zip(st, st[1:]):
            lo, hi = min(sa, sb), max(sa, sb)
            seg = [pts[i] for i in range(len(pts)) if lo - 1 <= L[i] <= hi + 1]
            for nm, rp in riv:
                if any(seg_x(p, q, u, v) for p, q in zip(seg, seg[1:]) for u, v in zip(rp, rp[1:])):
                    out.setdefault(tuple(sorted((na, nb))), set()).add(nm)
    return out


# 示意图上的水（G）：照着上面变形过的真实河道手画成八方向折线。band 宽度见 net.js 的 WATER
RIVERS = {
    'west': [(-17.6, -17.9), (-13.2, -13.5), (-13.2, 1.8)],                                                  # 珠江西航道，到白鹅潭
    'main': [(-13.2, 1.8), (10.6, 1.8), (16.6, 7.8), (21.6, 7.8), (23.6, 9.8), (23.6, 20.0)],  # 前航道、黄埔航道、狮子洋
    'back': [(-13.2, 1.8), (-5.95, 9.05), (9.0, 9.05), (13.4, 4.65)],                        # 后航道：白鹅潭往东南，绕海珠南边回到黄埔
    'south': [(-3.0, 18.0), (23.6, 18.0)],                                                   # 沙湾水道（番禺南）
    'north': [],
}
# 真实和示意不一样、但可以接受的：芳村—黄沙、石围塘—芳村在白鹅潭的汇合口过河（示意图上算到了前航道和后航道）；
# 琶洲—赤沙是 11 号线环线首尾相接时 OSM 路径的假象；长洲—裕丰围之间是长洲岛边的支汊（示意图并成了黄埔航道）
WATER_OK = {tuple(sorted(k)) for k in [('芳村', '黄沙'), ('石围塘', '芳村'), ('琶洲', '赤沙'), ('裕丰围', '长洲'), ('深井', '长洲')]}
GROUP = {'珠江西航道': 'west', '珠江前航道': 'main', '珠江黄埔航道': 'main', '虎门水道': 'main', '珠江后航道': 'back',
         '沙湾水道': 'south', '市桥水道': 'south', '蕉门水道': 'south', '流溪河': 'north'}


def check_water(ST, lines):
    real = {}
    for k, v in real_crossings().items():
        g = {GROUP[n] for n in v if n in GROUP}
        if g: real[k] = g
    sch = {}
    for L in lines:
        for key in ('route', 'branch'):
            if key not in L: continue
            items = L[key + '_items']; prev = None; corner = []
            for it in items:
                if not isinstance(it, str): corner.append(tuple(it)); continue
                if prev:
                    path = expand(ST, [prev] + [list(c) for c in corner] + [it])
                    for g, rp in RIVERS.items():
                        if any(seg_x(p, q, u, v) for p, q in zip(path, path[1:]) for u, v in zip(rp, rp[1:])):
                            sch.setdefault(tuple(sorted((prev, it))), set()).add(g)
                prev = it; corner = []
    bad = 0
    pairs = {tuple(sorted((a, b))) for L in lines for key in ('route', 'branch') if key in L for a, b in zip(L[key], L[key][1:])}
    for k in sorted(pairs):
        r, s = real.get(k, set()), sch.get(k, set())
        r = {g for g in r if RIVERS[g]}
        if k in WATER_OK: continue
        if r != s: print(f'  ~ 水：{k[0]}—{k[1]} 真实 {sorted(r)} 示意 {sorted(s)}'); bad += 1
    print(f'过河检查：{bad} 处不一致')


# ———————————————————— net.js ————————————————————
HUBS = ['体育西路', '公园前', '广州东站', '广州火车站', '嘉禾望岗', '广州南站', '珠江新城', '西塱', '番禺广场', '天河公园']
NAMED = ['机场北', '机场南', '新和', '南沙客运港', '万顷沙', '东风', '增城广场', '新沙', '黄埔新港', '香雪', '燕山', '滘口', '浔峰岗', '滘心',
         '新城东', '美的大道', '广州塔', '黄沙', '芳村', '海傍', '飞鹅岭', '高增', '镇龙', '大学城南', '琶洲', '冼村', '二沙岛',
         '万胜围', '客村', '沥滘', '汉溪长隆', '杨箕东', '鱼珠', '天河客运站', '乐嘉路', '广州体育馆', '花都广场', '知识城']
BULLET = {'GF': '广佛', 'APM': 'APM'}
HEADER = """// 广州地铁示意图（非官方）：tools/prep.py 由 OpenStreetMap 线路数据（© OpenStreetMap contributors, ODbL 1.0）生成，不要手改。
// 拓扑、站序、线路颜色和真实一致；几何是我们自己画的八方向示意图，不是运营方的线网图。单位 G = 100 世界单位；x 向东，y 向南。
// 格式与 Lemo-Opuscar Transit Map 的 net.js 相同（MIT, (c) 2026 LemoLab）：
//   ST: id: [x, y, 中文名, 英文名, tier]   tier 1 枢纽（任何缩放都标名）、2 换乘站、3 有名字的站、4 普通站
//   LINES: {id, color, route, branch?, mode?, bullet?, loop?}；route 里是站名，或 [x, y] 折点
//   WATER: 河道 {line, outer, inner, tunnel?} 和水面 {area, tunnel?}
"""


def write_net():
    lay = json.load(open(os.path.join(D, 'out', 'layout.json'), encoding='utf-8'))
    ST, lines, EN = lay['ST'], lay['lines'], lay['en']
    used = {n for L in lines for k in ('route', 'branch') if k in L for n in L[k]}
    cnt = {}
    for L in lines:
        for n in {n for k in ('route', 'branch') if k in L for n in L[k]}: cnt[n] = cnt.get(n, 0) + 1
    def tier(n): return 1 if n in HUBS else 2 if cnt[n] > 1 else 3 if n in NAMED else 4
    o = [HEADER, '(function () {', 'const G = 100;', 'const ST = {']
    for n in sorted(used, key=lambda n: (ST[n][1], ST[n][0])):
        o.append(f"  {json.dumps(n, ensure_ascii=False)}: [{ST[n][0]}, {ST[n][1]}, {json.dumps(n, ensure_ascii=False)}, {json.dumps(EN.get(n, ''))}, {tier(n)}],")
    o.append('};'); o.append('const LINES = [')
    for L in lines:
        d = {'id': L['id'], 'color': L['color']}
        if L['id'] == 'APM': d['mode'] = 'light'
        if L['id'] in BULLET: d['bullet'] = BULLET[L['id']]
        if L.get('loop'): d['loop'] = True
        for k in ('route', 'branch'):
            if k in L: d[k] = [it if isinstance(it, str) else [round(it[0], 2), round(it[1], 2)] for it in L[k + '_items']]
        o.append('  ' + json.dumps(d, ensure_ascii=False) + ',')
    o.append('];')
    o.append('const WATER = ' + json.dumps(WATER_JS, ensure_ascii=False) + ';')
    o.append(NET_TAIL)
    open(os.path.join(D, 'net.js'), 'w', encoding='utf-8').write('\n'.join(o) + '\n')
    print('net.js:', len(used), '站', len(lines), '条线')


# 水：河道带（G）。tunnel：穿过它的线画成虚线加外壳（这几条都是江底隧道）。沙湾水道窄，线照常从上面画过
WATER_JS = [
    {'id': 'west', 'line': RIVERS['west'], 'outer': .66, 'inner': .6, 'tunnel': True},
    {'id': 'main', 'line': RIVERS['main'], 'outer': .82, 'inner': .76, 'tunnel': True},
    {'id': 'back', 'line': RIVERS['back'], 'outer': .62, 'inner': .56, 'tunnel': True},
    {'id': 'south', 'line': RIVERS['south'], 'outer': .2, 'inner': .15},
    {'id': 'sea', 'area': [(22.4, 19.4), (24.8, 19.4), (29.0, 23.6), (29.0, 31.0), (20.6, 31.0), (20.6, 21.2)], 'tunnel': True},
]
NET_TAIL = """// 把 route 条目解析成点（G）：'站名' = 该站；['站名', dx, dy] = 该站加偏移（并行线）；[x, y] = 折点
function pt(it) {
  if (typeof it === 'string') { const s = ST[it]; if (!s) throw new Error('no station ' + it); return [s[0], s[1]]; }
  if (typeof it[0] === 'string') { const s = ST[it[0]]; if (!s) throw new Error('no station ' + it[0]); return [s[0] + it[1], s[1] + it[2]]; }
  return [it[0], it[1]];
}
const sid = it => typeof it === 'string' ? it : (typeof it[0] === 'string' ? it[0] : null);
// 展开成八方向折线：两点之间不在 8 个方向上时加一个折点（先直后斜；条目前面是 '/' 时先斜后直）
function expand(route) {
  const out = [], ids = []; let diagFirst = false;
  for (const it of route) {
    if (it === '/') { diagFirst = true; continue; }
    const p = pt(it);
    if (out.length) {
      const a = out[out.length - 1], dx = p[0] - a[0], dy = p[1] - a[1], ax = Math.abs(dx), ay = Math.abs(dy);
      if (ax > 1e-6 && ay > 1e-6 && Math.abs(ax - ay) > 1e-6) {
        const d = Math.min(ax, ay), sx = Math.sign(dx), sy = Math.sign(dy);
        out.push(diagFirst ? [a[0] + sx * d, a[1] + sy * d] : [p[0] - sx * d, p[1] - sy * d]); ids.push(null);
      }
    }
    out.push(p); ids.push(sid(it)); diagFirst = false;
  }
  return { pts: out, ids };
}
const LINKS = [];
window.NET = { G, ST, LINES, WATER, LINKS, pt, sid, expand };
})();"""

if __name__ == '__main__':
    os.makedirs(os.path.join(D, 'out'), exist_ok=True)
    slim_water()
    main()
    write_net()
