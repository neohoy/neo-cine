#!/usr/bin/env python3
"""neo/geo/osm.py: OpenStreetMap → one small JSON file a film page can draw.

    .venv/bin/python neo/geo/osm.py --bbox W,S,E,N --layers land,water,wood,park,peaks,roads,rail --out <film>/data/city.json
    .venv/bin/python neo/geo/osm.py --bbox W,S,E,N --layers buildings,streets --origin LON,LAT --tol 1.5 --out <film>/data/detail.json

It asks the Overpass API for each layer (the raw answers are kept in <out>.cache/, so a second run is offline), projects
longitude/latitude to metres around an origin (x east, y north), simplifies every line, and writes

    { "meta":   { bbox, origin:[lon,lat], box:[x0,y0,x1,y1] in metres, date, source, license },
      "land":   [ring, …]            rings are flat [x0,y0,x1,y1,…] in whole metres; land is closed against the bbox
      "water":  [[ring, …], …]       one entry per lake / reservoir / river area: outer rings, then holes (fill even-odd)
      "rivers": [{n, w, p}]          centre lines of rivers and canals (n name, w "river" | "canal" | "stream", p points)
      "wood":   [[ring, …], …]       woods and forests;  "park": the same for parks
      "peaks":  [{x, y, n, e}]       n name, e elevation in metres (0 when unknown)
      "roads":  [{c, n, b, p}]       c class (motorway, trunk, primary, secondary, tertiary), b 1 = bridge, 2 = tunnel
      "streets":[{c, n, p}]          residential and smaller, for close views
      "rail":   [{c, n, b, p}]       c "rail" | "subway"
      "buildings": [{p, h, n}]       p footprint ring, h height in metres (from height or building:levels; 0 when untagged)
      "places": [{x, y, n, c}]       c suburb, town, village, quarter, neighbourhood … }

For a country instead of a city: --proj albers:29.5,45.5 (a conic projection), --coarse-land (the coast from OpenStreetMap's
simplified land polygons) and --filter to name the few rivers, lakes or peaks wanted, e.g.
    --filter rivers='["name"~"^(Mississippi River|Missouri River)$"]' --filter peaks='(if: number(t["ele"]) > 3000)'
Dated history (borders, railways, trails by year) comes from OpenHistoricalMap: see ohm.py beside this file.

No boundary lines are fetched: a film that needs borders takes them from a source that fits DIRECTOR.md §13.
OpenStreetMap data is © OpenStreetMap contributors, ODbL 1.0: credit it on screen and in CREDITS.
Only the Python standard library is used.
"""
import argparse, hashlib, json, math, os, sys, time, urllib.parse, urllib.request

ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
             'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']
R = 6371008.8
ROAD = 'motorway|trunk|primary|secondary|tertiary'
STREET = 'residential|unclassified|living_street|pedestrian|service'
Q = {
    'land': 'way["natural"="coastline"]({b});',
    'water': 'way["natural"="water"]({b});relation["natural"="water"]({b});way["landuse"="reservoir"]({b});'
             'way["waterway"="riverbank"]({b});relation["waterway"="riverbank"]({b});',
    'rivers': 'way["waterway"~"^(river|canal|stream)$"]({b});',
    'wood': 'way["natural"="wood"]({b});relation["natural"="wood"]({b});way["landuse"="forest"]({b});relation["landuse"="forest"]({b});',
    'park': 'way["leisure"~"^(park|nature_reserve|garden)$"]({b});relation["leisure"~"^(park|nature_reserve)$"]({b});',
    'peaks': 'node["natural"="peak"]({b});',
    'roads': f'way["highway"~"^({ROAD})$"]({{b}});',
    'streets': f'way["highway"~"^({STREET})$"]({{b}});',
    'rail': 'way["railway"~"^(rail|subway)$"]({b});',
    'buildings': 'way["building"]({b});relation["building"]({b});',
    'places': 'node["place"~"^(city|town|suburb|quarter|neighbourhood|village|island)$"]({b});',
}


def fetch(layer, bbox, cache, retries=4, flt='', query=None, endpoints=None):
    """One layer's Overpass answer (elements), from the cache when it is there. flt is an extra Overpass filter put on every
    statement of the layer (e.g. '["name"~"^(Ohio River|Hudson River)$"]'); query replaces the layer's own statements
    (it may hold several "out" steps); endpoints replaces the server list (OpenHistoricalMap has its own)."""
    w, s, e, n = bbox; b = f'{s},{w},{n},{e}'
    q = '[out:json][timeout:240];' + (query.format(b=b) if query else '(' + Q[layer].replace('({b})', flt + '({b})').format(b=b) + ');out geom qt;')
    ENDPOINTS = endpoints or globals()['ENDPOINTS']
    key = hashlib.sha1(q.encode()).hexdigest()[:12]
    path = os.path.join(cache, f'{layer}-{key}.json')
    if os.path.exists(path):
        return json.load(open(path))['elements']
    os.makedirs(cache, exist_ok=True)
    body = urllib.parse.urlencode({'data': q}).encode()
    err = None
    order = [ENDPOINTS[i % min(2, len(ENDPOINTS))] for i in range(retries * 2)] + ENDPOINTS[2:] * 2   # the two main servers first, several times
    for i, url in enumerate(order):
        try:
            t0 = time.time()
            req = urllib.request.Request(url, body, {'User-Agent': 'osm-layers/1.0'})
            raw = urllib.request.urlopen(req, timeout=300).read()
            j = json.loads(raw)
            if 'remark' in j and 'error' in j['remark']: raise RuntimeError(j['remark'])
            open(path + '.part', 'wb').write(raw); os.replace(path + '.part', path)
            print(f'  {layer}: {len(j["elements"])} elements, {len(raw) / 1e6:.1f} MB, {time.time() - t0:.0f} s  ({url.split("/")[2]})', flush=True)
            return j['elements']
        except Exception as ex:                                   # busy server, timeout, network: try the next one
            err = ex; print(f'  {layer}: {url.split("/")[2]} failed ({ex}); retrying', flush=True); time.sleep(min(30, 4 + 3 * i))
    sys.exit(f'✗ could not fetch layer "{layer}": {err}')


class Proj:
    """Longitude/latitude → metres (x east, y north) around an origin.
    Default: equirectangular, fine for a city. albers=(lat1, lat2): Albers equal-area conic with those standard parallels,
    for a country or a continent (the origin's meridian is straight and vertical; parallels are arcs)."""
    def __init__(self, lon0, lat0, albers=None):
        self.lon0, self.lat0, self.k, self.albers = lon0, lat0, math.cos(math.radians(lat0)), albers
        if albers:
            p1, p2, p0 = (math.radians(v) for v in (*albers, lat0))
            self.n = (math.sin(p1) + math.sin(p2)) / 2; self.C = math.cos(p1) ** 2 + 2 * self.n * math.sin(p1)
            self.rho0 = R * math.sqrt(self.C - 2 * self.n * math.sin(p0)) / self.n
    def xy(self, lon, lat):
        if self.albers:
            rho = R * math.sqrt(max(0, self.C - 2 * self.n * math.sin(math.radians(lat)))) / self.n; th = self.n * math.radians(lon - self.lon0)
            return (rho * math.sin(th), self.rho0 - rho * math.cos(th))
        return ((lon - self.lon0) * self.k * R * math.pi / 180, (lat - self.lat0) * R * math.pi / 180)
    def line(self, geom): return [self.xy(g['lon'], g['lat']) for g in geom]


def clip_ring(pts, box):
    """A closed ring cut to a box (Sutherland–Hodgman). The cut runs along the box edge; draw it outside the frame."""
    x0, y0, x1, y1 = box
    for ins, cut in ((lambda p: p[0] >= x0, lambda a, b: (x0, a[1] + (b[1] - a[1]) * (x0 - a[0]) / (b[0] - a[0]))),
                     (lambda p: p[0] <= x1, lambda a, b: (x1, a[1] + (b[1] - a[1]) * (x1 - a[0]) / (b[0] - a[0]))),
                     (lambda p: p[1] >= y0, lambda a, b: (a[0] + (b[0] - a[0]) * (y0 - a[1]) / (b[1] - a[1]), y0)),
                     (lambda p: p[1] <= y1, lambda a, b: (a[0] + (b[0] - a[0]) * (y1 - a[1]) / (b[1] - a[1]), y1))):
        out = []
        for a, b in zip(pts, pts[1:] + pts[:1]):
            ia, ib = ins(a), ins(b)
            if ia and ib: out.append(b)
            elif ia and not ib: out.append(cut(a, b))
            elif ib: out += [cut(a, b), b]
        pts = out
        if len(pts) < 3: return []
    return pts + [pts[0]]


COARSE = 'https://osmdata.openstreetmap.de/download/simplified-land-polygons-complete-3857.zip'
def coarse_land(bbox, cache):
    """Land rings (lon/lat) inside a bbox from OpenStreetMap's simplified land polygons: the coast at country scale, where
    asking Overpass for every coastline way would be hundreds of megabytes. The zip (24 MB) is kept in the cache."""
    import struct, zipfile
    os.makedirs(cache, exist_ok=True); z = os.path.join(cache, 'simplified-land-polygons.zip')
    if not os.path.exists(z):
        print('  land: fetching the simplified land polygons (24 MB)', flush=True)
        raw = urllib.request.urlopen(urllib.request.Request(COARSE, headers={'User-Agent': 'osm-layers/1.0'}), timeout=600).read()
        open(z + '.part', 'wb').write(raw); os.replace(z + '.part', z)
    zf = zipfile.ZipFile(z); b = zf.read(next(n for n in zf.namelist() if n.endswith('.shp')))
    M = 6378137.0; inv = lambda x, y: (math.degrees(x / M), math.degrees(2 * math.atan(math.exp(y / M)) - math.pi / 2))
    w, s, e, n = bbox; rings = []; o = 100
    while o < len(b):
        ln = struct.unpack('>i', b[o + 4:o + 8])[0] * 2; rec = b[o + 8:o + 8 + ln]; o += 8 + ln
        if struct.unpack('<i', rec[:4])[0] != 5: continue
        bx0, by0, bx1, by1 = struct.unpack('<4d', rec[4:36]); (lx0, ly0), (lx1, ly1) = inv(bx0, by0), inv(bx1, by1)
        if lx1 < w or lx0 > e or ly1 < s or ly0 > n: continue
        npart, npt = struct.unpack('<2i', rec[36:44]); parts = list(struct.unpack(f'<{npart}i', rec[44:44 + 4 * npart])) + [npt]
        xy = struct.unpack(f'<{2 * npt}d', rec[44 + 4 * npart:44 + 4 * npart + 16 * npt])
        for a, c in zip(parts, parts[1:]):
            r = clip_ring([inv(xy[2 * i], xy[2 * i + 1]) for i in range(a, c - 1)], (w, s, e, n))
            if len(r) > 3: rings.append(r)
    return rings


def simplify(pts, tol):
    """Douglas–Peucker, iterative. Keeps both ends."""
    if len(pts) < 3 or tol <= 0: return pts
    keep = [False] * len(pts); keep[0] = keep[-1] = True; stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        if b - a < 2: continue
        ax, ay = pts[a]; bx, by = pts[b]; dx, dy = bx - ax, by - ay; L = dx * dx + dy * dy
        best, bi = -1., -1
        for i in range(a + 1, b):
            px, py = pts[i]
            if L == 0: d = (px - ax) ** 2 + (py - ay) ** 2
            else:
                u = max(0., min(1., ((px - ax) * dx + (py - ay) * dy) / L)); d = (px - ax - u * dx) ** 2 + (py - ay - u * dy) ** 2
            if d > best: best, bi = d, i
        if best > tol * tol: keep[bi] = True; stack += [(a, bi), (bi, b)]
    return [p for p, k in zip(pts, keep) if k]


def flat(pts): return [int(round(v)) for p in pts for v in p]
def area(pts): return .5 * sum(pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1] for i in range(len(pts) - 1))


def stitch(lines):
    """Join lines that share end points into longer chains (closed ones come back with first == last)."""
    lines = [l for l in lines if len(l) > 1]
    ends = {}
    for i, l in enumerate(lines): ends.setdefault(l[0], []).append(i); ends.setdefault(l[-1], []).append(i)
    used, out = [False] * len(lines), []
    for i in range(len(lines)):
        if used[i]: continue
        used[i] = True; chain = list(lines[i])
        for front in (False, True):
            while chain[0] != chain[-1]:
                tip = chain[0] if front else chain[-1]
                nxt = next((j for j in ends.get(tip, []) if not used[j]), None)
                if nxt is None: break
                used[nxt] = True; l = lines[nxt]
                if front: chain = (l if l[-1] == tip else l[::-1])[:-1] + chain
                else: chain += (l if l[0] == tip else l[::-1])[1:]
        out.append(chain)
    return out


def clip_line(pts, box):
    """The parts of a line inside a box, cut exactly at its edge (Liang–Barsky per segment)."""
    x0, y0, x1, y1 = box; out, cur = [], []
    for (ax, ay), (bx, by) in zip(pts, pts[1:]):
        dx, dy = bx - ax, by - ay; t0, t1 = 0., 1.; ok = True
        for p, q in ((-dx, ax - x0), (dx, x1 - ax), (-dy, ay - y0), (dy, y1 - ay)):
            if p == 0:
                if q < 0: ok = False; break
            else:
                r = q / p
                if p < 0:
                    if r > t1: ok = False; break
                    t0 = max(t0, r)
                else:
                    if r < t0: ok = False; break
                    t1 = min(t1, r)
        if not ok:
            if cur: out.append(cur); cur = []
            continue
        a = (ax + t0 * dx, ay + t0 * dy); b = (ax + t1 * dx, ay + t1 * dy)
        if not cur: cur = [a]
        cur.append(b)
        if t1 < 1: out.append(cur); cur = []
    if cur: out.append(cur)
    return [l for l in out if len(l) > 1]


def land_rings(coast, box):
    """Land polygons inside a box from coastline chains. OSM draws coastlines with the land on the left, so a land ring is
    counter-clockwise: follow a piece of coast to where it leaves the box, walk the box edge counter-clockwise to where the
    next piece enters, and so on until the ring closes. Closed chains inside the box are islands."""
    x0, y0, x1, y1 = box; eps = 1e-6 * max(x1 - x0, y1 - y0)
    def pos(p):                                                    # distance along the box edge, counter-clockwise from (x0, y0)
        x, y = p
        if abs(y - y0) < eps: return x - x0
        if abs(x - x1) < eps: return (x1 - x0) + (y - y0)
        if abs(y - y1) < eps: return (x1 - x0) + (y1 - y0) + (x1 - x)
        if abs(x - x0) < eps: return 2 * (x1 - x0) + (y1 - y0) + (y1 - y)
        return None
    per = 2 * (x1 - x0 + y1 - y0)
    corners = [(x1 - x0, (x1, y0)), (x1 - x0 + y1 - y0, (x1, y1)), (2 * (x1 - x0) + y1 - y0, (x0, y1)), (per, (x0, y0))]
    rings, pieces = [], []
    for ch in coast:
        if ch[0] == ch[-1] and all(x0 <= x <= x1 and y0 <= y <= y1 for x, y in ch): rings.append(ch); continue
        for pc in clip_line(ch, box):
            if pos(pc[0]) is not None and pos(pc[-1]) is not None: pieces.append(pc)
    if not pieces: return rings, False
    starts = sorted((pos(pc[0]), i) for i, pc in enumerate(pieces)); used = [False] * len(pieces)
    for i0 in range(len(pieces)):
        if used[i0]: continue
        ring, i = [], i0
        while not used[i]:
            used[i] = True; ring += pieces[i]; e = pos(pieces[i][-1])
            nxt = min(starts, key=lambda s: ((s[0] - e) % per) or per)                                   # next entry, counter-clockwise
            d = (nxt[0] - e) % per or per
            for cp, c in corners + [(cp + per, c) for cp, c in corners]:                                       # corners passed on the way
                if e < cp < e + d - 1e-9: ring.append(c)
            i = nxt[1]
        ring.append(ring[0]); rings.append(ring)
    return rings, True


def rings_of(el, P):
    """Outer rings then holes of a closed way or a multipolygon relation, projected."""
    if el['type'] == 'way':
        g = el.get('geometry') or []
        return [P.line(g)] if len(g) > 3 and g[0] == g[-1] else []
    out = []
    for role in ('outer', 'inner'):
        parts = [[(g['lon'], g['lat']) for g in m['geometry']] for m in el.get('members', []) if m['type'] == 'way' and m.get('role', 'outer') in (role, '' if role == 'outer' else role) and m.get('geometry')]
        out += [[P.xy(*p) for p in ch] for ch in stitch(parts) if len(ch) > 3 and ch[0] == ch[-1]]
    return out


def height(tags):
    for k, f in (('height', 1.), ('building:levels', 3.2)):
        try: return round(float(str(tags[k]).split()[0].replace('m', '')) * f, 1)
        except (KeyError, ValueError, IndexError): pass
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--bbox', required=True, help='W,S,E,N in degrees')
    ap.add_argument('--layers', default='land,water,rivers,wood,park,peaks,roads,rail,places')
    ap.add_argument('--origin', help='LON,LAT of x=0,y=0 (default: the bbox centre). Give two files the same origin to overlay them')
    ap.add_argument('--tol', type=float, default=6., help='simplification tolerance in metres (default 6)')
    ap.add_argument('--min-area', type=float, default=0., help='drop water, wood, park and building areas smaller than this, m²')
    ap.add_argument('--proj', default='', help='albers:LAT1,LAT2 for an Albers conic with those standard parallels (a country); default equirectangular (a city)')
    ap.add_argument('--filter', action='append', default=[], metavar='LAYER=EXPR', help='an extra Overpass filter for one layer, e.g. rivers=\'["name"~"^(Ohio River)$"]\'')
    ap.add_argument('--query', action='append', default=[], metavar='LAYER=STATEMENTS', help='replace a layer\'s Overpass statements; write the bbox as {b}. Exact names are far quicker than a regular expression over a country: \'rivers=way["waterway"="river"]["name"="Ohio River"]({b});\'')
    ap.add_argument('--coarse-land', action='store_true', help='take the land layer from the simplified land polygons (country scale) instead of coastline ways')
    ap.add_argument('--out', required=True)
    a = ap.parse_args()
    bbox = [float(v) for v in a.bbox.split(',')]; w, s, e, n = bbox
    lon0, lat0 = [float(v) for v in a.origin.split(',')] if a.origin else ((w + e) / 2, (s + n) / 2)
    P = Proj(lon0, lat0, tuple(float(v) for v in a.proj.split(':')[1].split(',')) if a.proj.startswith('albers') else None)
    cs = [P.xy(lo, la) for lo in (w, (w + e) / 2, e) for la in (s, n)]                            # a conic bends the box: take its extent
    bx0, by0, bx1, by1 = box = (min(c[0] for c in cs), min(c[1] for c in cs), max(c[0] for c in cs), max(c[1] for c in cs))
    flt = dict(f.split('=', 1) for f in a.filter)
    for f in a.query: k, v = f.split('=', 1); Q[k] = v
    cache = a.out + '.cache'; layers = a.layers.split(','); out = {}
    bad = [l for l in layers if l not in Q]
    if bad: sys.exit(f'✗ unknown layer {bad}; choose from {", ".join(Q)}')
    name = lambda t: t.get('name:zh') or t.get('name') or ''
    for layer in layers:
        if layer == 'land' and a.coarse_land:
            out['land'] = [flat(simplify([P.xy(*p) for p in r], a.tol)) for r in coarse_land(bbox, cache)]
            out['land'] = [r for r in out['land'] if len(r) > 7 and abs(area(list(zip(r[::2], r[1::2])))) >= a.min_area]; continue
        els = fetch(layer, bbox, cache, flt=flt.get(layer, ''))
        if layer == 'land':
            if a.proj: sys.exit('✗ with --proj, take the land with --coarse-land (the coastline closing assumes a straight box)')
            chains = stitch([[(g['lon'], g['lat']) for g in el['geometry']] for el in els if el['type'] == 'way'])
            rings, has = land_rings([[P.xy(*p) for p in ch] for ch in chains], box)
            if not has and not rings: rings = [[(bx0, by0), (bx1, by0), (bx1, by1), (bx0, by1), (bx0, by0)]]   # no coast in the box: all land
            out['land'] = [flat(simplify(r, a.tol)) for r in rings if abs(area(r)) >= a.min_area]
        elif layer in ('water', 'wood', 'park'):
            res = []
            for el in els:
                rs = [simplify(r, a.tol) for r in rings_of(el, P)]
                rs = [r for r in rs if len(r) > 3]
                if rs and abs(area(rs[0])) >= a.min_area: res.append([flat(r) for r in rs])
            out[layer] = res
        elif layer == 'rivers':
            out['rivers'] = [dict(n=name(el.get('tags', {})), w=el['tags']['waterway'], p=flat(simplify(P.line(el['geometry']), a.tol))) for el in els if el.get('geometry')]
        elif layer == 'peaks':
            res = []
            for el in els:
                t = el.get('tags', {}); x, y = P.xy(el['lon'], el['lat'])
                try: ele = float(str(t.get('ele', '0')).split()[0])
                except ValueError: ele = 0
                res.append(dict(x=round(x), y=round(y), n=name(t), e=round(ele)))
            out['peaks'] = res
        elif layer in ('roads', 'streets', 'rail'):
            res = []
            for el in els:
                t = el.get('tags', {})
                if not el.get('geometry'): continue
                if layer == 'rail' and t.get('service'): continue                       # yards and sidings
                d = dict(c=t.get('highway') or t.get('railway'), n=name(t), p=flat(simplify(P.line(el['geometry']), a.tol)))
                if layer != 'streets': d['b'] = 1 if t.get('bridge') not in (None, 'no') else 2 if t.get('tunnel') not in (None, 'no') else 0
                res.append(d)
            out[layer] = res
        elif layer == 'buildings':
            res = []
            for el in els:
                rs = rings_of(el, P)
                if not rs or abs(area(rs[0])) < max(a.min_area, 12): continue
                t = el.get('tags', {}); res.append(dict(p=flat(simplify(rs[0], a.tol)), h=height(t), n=name(t)))
            out['buildings'] = res
        elif layer == 'places':
            out['places'] = [dict(x=round(P.xy(el['lon'], el['lat'])[0]), y=round(P.xy(el['lon'], el['lat'])[1]), n=name(el.get('tags', {})), c=el['tags']['place']) for el in els if name(el.get('tags', {}))]
    out = dict(meta=dict(bbox=bbox, origin=[lon0, lat0], proj=a.proj or 'equirect', box=[round(v) for v in box], date=time.strftime('%Y-%m-%d'),
                         source='OpenStreetMap via Overpass API', license='© OpenStreetMap contributors, ODbL 1.0'), **out)
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    json.dump(out, open(a.out, 'w'), ensure_ascii=False, separators=(',', ':'))
    print(f'{a.out}: {os.path.getsize(a.out) / 1e6:.2f} MB  ' + '  '.join(f'{k} {len(v)}' for k, v in out.items() if k != 'meta'))


if __name__ == '__main__':
    main()
