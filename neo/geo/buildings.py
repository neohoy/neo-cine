#!/usr/bin/env python3
"""neo/geo/buildings.py: real building footprints and heights → one small JSON file a film page can extrude.

    .venv/bin/python neo/geo/buildings.py --bbox W,S,E,N --origin LON,LAT --out <film>/data/blocks.json
    .venv/bin/python neo/geo/buildings.py --bbox W,S,E,N --origin LON,LAT --sources osm --out …       (no Overture: stdlib only)

Two sources, merged:
- OpenStreetMap, through the Overpass API (the same fetch and servers as osm.py): footprints with names, types and the
  tags a mapper added this week; building:part ways (towers and podiums drawn separately, each with its own height and
  min_height); multipolygon buildings with their courtyards.
- Overture Maps, buildings theme (GeoParquet on Overture's public AWS S3 bucket, or its Azure mirror with --mirror azure).
  Overture is itself a merge: OpenStreetMap first, then machine-detected footprints where OSM has none (Microsoft, Google,
  Esri Community Maps, and in East Asia the footprints of Shi et al. 2023, doi:10.5281/zenodo.8174931), and in some
  countries heights from other datasets. The release is found in Overture's STAC catalogue (stac.overturemaps.org; --release
  latest, or a name like 2026-10-21.0); only the files and row groups whose bbox column touches the box are read.
  Reading Parquet needs the duckdb package (neo/requirements-geo.txt); the rows that come back are kept in the cache as
  JSON, so a second run needs neither the network nor duckdb.

How the two are merged: OSM from Overpass is the base (it is newer than the OSM snapshot inside an Overture release). An
Overture row that came from OSM is matched to the OSM way or relation by its record id: it is dropped, but a height or a
floor count it carries from another source fills the OSM building's gap. An Overture row from another dataset is a
footprint OSM lacks: it is added unless it overlaps an OSM building or part (two of five sample points inside one, or an OSM
centroid inside it). OSM gives names, types and parts; Overture fills the footprints mappers have not drawn.

Heights, and where each came from (field hs):
- "measured": a height tag (OSM height, or Overture's height from any source), in metres to the top of the roof;
- "levels":   building:levels (+ roof:levels) × --level-height (default 3.2 m, the same as osm.py); building:min_level gives
              the base the same way;
- "estimated": no height and no levels. The median height of up to 12 nearby buildings (within 250 m) that do have one
              and whose footprint is within a factor of four of this one, capped at --est-max (default 60 m: a tower worth
              drawing tall usually has its height tagged, and an untagged footprint is safer mid-rise); with fewer than three
              such neighbours, a default by type (house 6 m, retail 12, industrial 14, school 20, apartments 30, office 36…).
A building with parts takes the height of its tallest part when it has none of its own; a part without a height takes its
building's. The base (b) is min_height, else building:min_level × the level height, else 0. A roof (building=roof: a canopy)
without a base gets one 1 m below its top. Underground buildings (location=underground, a negative layer, a tunnel, Overture's
is_underground) are left out.

Output, projected like osm.py and routes.py (metres around --origin, x east, y north; the same --origin and --proj overlay them):

    { "meta": { bbox, origin, proj, box, date, release, level_height, sources:[…], license, counts:{…} },
      "buildings": [{ id,             "w123" / "r456" (OSM way / relation) or "ov:<Overture id>"
                      p: [x0,y0,x1,y1,…]   outer ring, closed, simplified (--tol), counter-clockwise
                      q: [[…], …]          holes (courtyards), only when there are some
                      h, b,                top and base in metres above the ground
                      hs,                  "measured" | "levels" | "estimated"
                      src,                 "osm" | "overture"
                      c,                   type: the building tag (apartments, commercial, yes…) or Overture's class
                      n, en,               name (name:zh, else name; Overture: its Chinese, else primary name) and name:en
                      lv,                  floor count when known
                      parts: [{ p, q, h, b, hs, n }] } ] }   when there are building:part ways: draw these, not the outline

Buildings are kept whole when their centroid is inside the box (no cutting at the edge). The run ends with the counts:
buildings per source, the share of each height source (by count and by volume), and the total volume.

Licences. OpenStreetMap: © OpenStreetMap contributors, ODbL 1.0. Overture buildings: the theme is ODbL 1.0 (STAC collection
"license": "ODbL-1.0"; docs.overturemaps.org/attribution), and its sources ask for their own credit: © OpenStreetMap
contributors; Microsoft Global ML Building Footprints (ODbL); Google Open Buildings (CC BY 4.0); Esri Community Maps
contributors (CC BY 4.0); USGS 3DEP; Qian Shi et al., "A First High-quality Vector Data of Buildings in East Asian Countries
Based on a Comprehensive Large-scale Mapping Framework", Zenodo 2023, doi:10.5281/zenodo.8174931 (CC BY 4.0); BTN 2024 ign.es
(CC BY 4.0). Overture suggests "Overture Maps Foundation, overturemaps.org". The file's meta.sources lists the datasets that
are actually in it: name those in CREDITS (a library demo keeps them off screen: MAINTAINING.md). A file that contains OSM
data is a derived database under the ODbL.
"""
import argparse, hashlib, json, math, os, statistics, struct, sys, time, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from osm import fetch, Proj, simplify, area, stitch

STAC = 'https://stac.overturemaps.org'
UA = {'User-Agent': 'osm-layers/1.0'}
OSM_Q = ('(way["building"]({b});relation["building"]["type"="multipolygon"]({b});'
         'way["building:part"]({b});relation["building:part"]["type"="multipolygon"]({b}););out geom qt;')
DEFAULT_H = {'house': 6, 'detached': 6, 'semidetached_house': 6, 'terrace': 9, 'bungalow': 4, 'hut': 3, 'shed': 3,
             'cabin': 4, 'garage': 3, 'garages': 3, 'kiosk': 3, 'toilets': 4, 'service': 4, 'roof': 6, 'carport': 3,
             'retail': 12, 'supermarket': 10, 'industrial': 14, 'warehouse': 12, 'factory': 14, 'manufacture': 14,
             'train_station': 16, 'transportation': 14, 'parking': 15, 'school': 20, 'university': 24, 'college': 24,
             'kindergarten': 10, 'hospital': 30, 'civic': 24, 'public': 24, 'government': 30, 'church': 15, 'temple': 10,
             'stadium': 30, 'sports_hall': 18, 'apartments': 30, 'residential': 30, 'dormitory': 24, 'hotel': 40,
             'commercial': 36, 'office': 36, 'construction': 20}


def num(v):
    """'120', '120 m', '394 ft', '30;32' → a float (feet converted), or None."""
    if v is None: return None
    s = str(v).split(';')[0].strip().lower().replace(',', '.')
    ft = s.endswith('ft') or s.endswith("'")
    s = s.replace('ft', '').replace("'", '').replace('m', '').strip()
    try: x = float(s)
    except ValueError: return None
    return x * .3048 if ft else x


def underground(t):
    return (t.get('location') == 'underground' or str(t.get('layer', '0')).strip().startswith('-')
            or t.get('tunnel') not in (None, 'no') or t.get('building') == 'underground'
            or (num(t.get('building:min_level')) or 0) < 0 and num(t.get('building:levels')) in (None, 0))


def osm_height(t, lh):
    """(top, base, source, floors) from OSM tags; top None when the tags give no height."""
    h, lv, rl = num(t.get('height')), num(t.get('building:levels')), num(t.get('roof:levels')) or 0
    b = num(t.get('min_height'))
    if b is None and num(t.get('building:min_level')) is not None: b = num(t.get('building:min_level')) * lh
    if h is not None and h > 0: return h, b or 0, 'measured', lv
    if lv is not None and lv > 0: return (lv + rl) * lh, b or 0, 'levels', lv
    return None, b or 0, None, None


def centroid(r):
    a = area(r)
    if abs(a) < 1e-9: return sum(p[0] for p in r) / len(r), sum(p[1] for p in r) / len(r)
    cx = cy = 0
    for (x0, y0), (x1, y1) in zip(r, r[1:]): k = x0 * y1 - x1 * y0; cx += (x0 + x1) * k; cy += (y0 + y1) * k
    return cx / (6 * a), cy / (6 * a)


def inside(pt, r):
    x, y = pt; c = False
    for (x0, y0), (x1, y1) in zip(r, r[1:]):
        if (y0 > y) != (y1 > y) and x < x0 + (y - y0) * (x1 - x0) / (y1 - y0): c = not c
    return c


class Grid:
    """A bucket grid of ring bounding boxes, for 'which footprints might contain this point'."""
    def __init__(self, cell=60): self.cell, self.g = cell, {}
    def add(self, ring, obj):
        xs, ys = [p[0] for p in ring], [p[1] for p in ring]; c = self.cell
        for i in range(int(min(xs) // c), int(max(xs) // c) + 1):
            for j in range(int(min(ys) // c), int(max(ys) // c) + 1): self.g.setdefault((i, j), []).append((ring, obj))
    def at(self, pt):
        return [o for r, o in self.g.get((int(pt[0] // self.cell), int(pt[1] // self.cell)), []) if inside(pt, r)]


# ---------- Overture ----------
def get_json(url):
    for k in range(3):
        try: return json.loads(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read())
        except Exception as ex:
            if k == 2: raise
            print(f'  {url}: {ex}; retrying', flush=True); time.sleep(3 + 4 * k)


def overture_files(release, typ, bbox, mirror):
    """The release name and the Parquet URLs of one buildings type whose extent touches the bbox (from the STAC catalogue)."""
    if release == 'latest': release = get_json(f'{STAC}/catalog.json')['latest']
    col = get_json(f'{STAC}/{release}/buildings/{typ}/collection.json')
    items = [l['href'] for l in col['links'] if l['rel'] == 'item']; ext = col['extent']['spatial']['bbox']
    if len(ext) == len(items) + 1: ext = ext[1:]                      # the first extent is the whole collection's
    w, s, e, n = bbox; urls = []
    for href, (x0, y0, x1, y1) in zip(items, ext) if len(ext) == len(items) else ((h, (-180, -90, 180, 90)) for h in items):
        if x0 > e or x1 < w or y0 > n or y1 < s: continue
        it = get_json(href if href.startswith('http') else f'{STAC}/{release}/buildings/{typ}/{href.lstrip("./")}')
        a = it['assets'].get(mirror) or next(iter(it['assets'].values())); urls.append(a['href'])
    return release, urls


def wkb_polys(b):
    """WKB (Polygon or MultiPolygon, 2D or Z, either byte order) → [[outer, hole, …], …] with rings as [(lon, lat), …]."""
    o = 0
    def rd(fmt):
        nonlocal o; v = struct.unpack_from(fmt, b, o); o += struct.calcsize(fmt); return v
    def geom():
        bo, = rd('B'); e = '<' if bo == 1 else '>'; t, = rd(e + 'I')
        z = t > 1000 and t < 2000 or t & 0x80000000; t = (t & 0xffff) % 1000; d = 3 if z else 2
        if t == 3:
            rings = []
            for _ in range(rd(e + 'I')[0]):
                n, = rd(e + 'I'); xy = rd(e + f'{n * d}d'); rings.append([(xy[i], xy[i + 1]) for i in range(0, n * d, d)])
            return [rings]
        if t == 6:
            out = []
            for _ in range(rd(e + 'I')[0]): out += geom()
            return out
        return []
    return geom()


def overture_rows(bbox, cache, release, typ, mirror):
    """Rows of one Overture buildings type inside the bbox, from the cache when there (any release unless one is named)."""
    key = hashlib.sha1(json.dumps([round(v, 6) for v in bbox]).encode()).hexdigest()[:12]
    os.makedirs(cache, exist_ok=True)
    have = sorted(f for f in os.listdir(cache) if f.startswith(f'overture-{typ}-{key}-'))
    want = [f for f in have if release == 'latest' or f'-{release}.json' in f]
    if want:
        j = json.load(open(os.path.join(cache, want[-1]))); print(f'  overture {typ}: {len(j["rows"])} rows from the cache ({j["release"]})'); return j
    try: import duckdb
    except ImportError:
        sys.exit('✗ Overture needs the duckdb package: .venv/bin/python -m pip install -r neo/requirements-geo.txt '
                 '(or uv pip install --python .venv/bin/python -r neo/requirements-geo.txt). Or run with --sources osm.')
    err = None
    for mir in [mirror] + [m for m in ('aws', 'azure') if m != mirror]:
        try:
            rel, urls = overture_files(release, typ, bbox, mir)
            if not urls: return dict(release=rel, rows=[])
            con = duckdb.connect(); con.execute('SET enable_progress_bar=false')
            con.execute('INSTALL httpfs; LOAD httpfs;')                    # https range reads (the extension is fetched once)
            w, s, e, n = bbox; t0 = time.time()
            cols = ('id, names, height, min_height, num_floors, min_floor, is_underground, {cls} sources, {geo} AS g')
            src = f"read_parquet({json.dumps(urls)})".replace('"', "'")
            where = f'bbox.xmin < {e} AND bbox.xmax > {w} AND bbox.ymin < {n} AND bbox.ymax > {s}'
            cls = "class, subtype, " if typ == 'building' else "building_id, "
            for geo in ('ST_AsWKB(geometry)', 'geometry'):              # duckdb ≥ 1.5 reads a GEOMETRY type; older ones a WKB blob
                try: res = con.execute(f'SELECT {cols.format(cls=cls, geo=geo)} FROM {src} WHERE {where}'); break
                except duckdb.Error as ex: err = ex
            else: raise err
            names = [d[0] for d in res.description]; rows = []
            for r in res.fetchall():
                d = dict(zip(names, r)); nm = d['names'] or {}; com = nm.get('common') or {}
                if isinstance(com, list): com = {k: v for k, v in com}
                sl = d['sources'] or []
                rec = next((x.get('record_id') for x in sl if x.get('dataset') == 'OpenStreetMap' and x.get('record_id')), None)
                rows.append(dict(id=d['id'], ds=[x.get('dataset') for x in sl], rec=rec.split('@')[0] if rec else None,
                                 hsrc=next((x.get('dataset') for x in sl if (x.get('property') or '').endswith('height')), None),
                                 n=nm.get('primary'), zh=com.get('zh') or com.get('zh-Hans') or com.get('zh-CN'), en=com.get('en'),
                                 h=d['height'], mh=d['min_height'], nf=d['num_floors'], mf=d['min_floor'], ug=d['is_underground'],
                                 c=d.get('class') or d.get('subtype'), bid=d.get('building_id'),
                                 g=[[[[round(x, 7), round(y, 7)] for x, y in ring] for ring in poly] for poly in wkb_polys(bytes(d['g']))]))
            j = dict(release=rel, mirror=mir, files=urls, rows=rows)
            path = os.path.join(cache, f'overture-{typ}-{key}-{rel}.json')
            json.dump(j, open(path + '.part', 'w'), ensure_ascii=False); os.replace(path + '.part', path)
            print(f'  overture {typ}: {len(rows)} rows, {len(urls)} file(s), {time.time() - t0:.0f} s  ({rel}, {mir})', flush=True)
            return j
        except SystemExit: raise
        except Exception as ex:
            err = ex; print(f'  overture {typ} via {mir} failed ({ex})', flush=True)
    sys.exit(f'✗ could not read Overture {typ}: {err}')


# ---------- main ----------
def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--bbox', required=True, help='W,S,E,N in degrees')
    ap.add_argument('--origin', help='LON,LAT of x=0,y=0 (default: the bbox centre); give osm.py the same to overlay its layers')
    ap.add_argument('--proj', default='', help='albers:LAT1,LAT2 as in osm.py (default equirectangular, right for a city)')
    ap.add_argument('--sources', default='osm,overture', help='osm, overture or both (default both)')
    ap.add_argument('--release', default='latest', help='Overture release, e.g. 2026-10-21.0 (default: the latest in the STAC catalogue)')
    ap.add_argument('--mirror', default='aws', choices=('aws', 'azure'), help='where to read Overture\'s Parquet (default aws; the other is tried on failure)')
    ap.add_argument('--level-height', type=float, default=3.2, help='metres per floor for building:levels (default 3.2)')
    ap.add_argument('--est-max', type=float, default=60., help='cap on estimated heights, metres (default 60)')
    ap.add_argument('--tol', type=float, default=1., help='outline simplification tolerance in metres (default 1)')
    ap.add_argument('--min-area', type=float, default=20., help='drop footprints smaller than this, m² (default 20)')
    ap.add_argument('--prec', type=int, default=0, help='decimals kept in coordinates (default 0: whole metres)')
    ap.add_argument('--out', required=True)
    a = ap.parse_args()
    bbox = [float(v) for v in a.bbox.split(',')]; w, s, e, n = bbox
    lon0, lat0 = [float(v) for v in a.origin.split(',')] if a.origin else ((w + e) / 2, (s + n) / 2)
    P = Proj(lon0, lat0, tuple(float(v) for v in a.proj.split(':')[1].split(',')) if a.proj.startswith('albers') else None)
    srcs = set(a.sources.split(',')); cache = a.out + '.cache'; lh = a.level_height
    cs = [P.xy(lo, la) for lo in (w, (w + e) / 2, e) for la in (s, n)]
    box = (min(c[0] for c in cs), min(c[1] for c in cs), max(c[0] for c in cs), max(c[1] for c in cs))
    inbox = lambda c: box[0] <= c[0] <= box[2] and box[1] <= c[1] <= box[3]
    ccw = lambda r: r if area(r) > 0 else r[::-1]
    blds, parts, stats = [], [], dict(osm=0, osm_parts=0, overture_rows=0, overture_from_osm=0, overture_added=0, overture_dup=0)

    # ---- OpenStreetMap ----
    if 'osm' in srcs:
        els = fetch('buildings3d', bbox, cache, query=OSM_Q)
        for el in els:
            t = el.get('tags', {}); isp = 'building:part' in t and 'building' not in t
            kind = t.get('building:part') if isp else t.get('building')
            if kind in (None, 'no') or underground(t): continue
            if el['type'] == 'way':
                g = el.get('geometry') or []
                if len(g) < 4 or (g[0]['lat'], g[0]['lon']) != (g[-1]['lat'], g[-1]['lon']): continue
                polys = [[P.line(g)]]
            else:
                outs, holes = [], []
                for role, acc in (('outer', outs), ('inner', holes)):
                    ch = [[(gg['lon'], gg['lat']) for gg in m['geometry']] for m in el.get('members', [])
                          if m['type'] == 'way' and m.get('geometry') and (m.get('role') or 'outer') == role]
                    acc += [[P.xy(*p) for p in c] for c in stitch(ch) if len(c) > 3 and c[0] == c[-1]]
                polys = [[o] + [hh for hh in holes if inside(hh[0], o)] for o in outs]
            h, b, hs, lv = osm_height(t, lh)
            for k, rings in enumerate(polys):
                if abs(area(rings[0])) < a.min_area: continue
                d = dict(id=f'{el["type"][0]}{el["id"]}' + (f'.{k}' if k else ''), rings=rings, h=h, b=b, hs=hs, lv=lv, src='osm',
                         c=kind if kind != 'yes' else (t.get('building:use') or 'yes'), n=t.get('name:zh') or t.get('name') or '',
                         en=t.get('name:en') or '', osm=f'{el["type"][0]}{el["id"]}')
                if kind == 'roof' or t.get('building') == 'roof': d['roof'] = True
                (parts if isp else blds).append(d)
        stats['osm'], stats['osm_parts'] = len(blds), len(parts)

    # ---- Overture ----
    release = None
    if 'overture' in srcs:
        ov = overture_rows(bbox, cache, a.release, 'building', a.mirror); release = ov['release']
        stats['overture_rows'] = len(ov['rows'])
        byosm = {d['osm']: d for d in blds}
        grid = Grid()
        for d in blds + parts: grid.add(d['rings'][0], d)
        ocent = Grid()
        for d in blds: ocent.add([centroid(d['rings'][0])] * 2, d)
        ds_used = {}
        for r in ov['rows']:
            if r['ug']: continue
            if 'OpenStreetMap' in r['ds']: stats['overture_from_osm'] += 1
            if 'osm' in srcs and r['rec']:                              # the same OSM element: only fill a missing height
                d = byosm.get(r['rec'])
                if d and d['hs'] != 'measured' and r['h'] and r['hsrc'] and r['hsrc'] != 'OpenStreetMap':
                    d['h'], d['hs'], d['src'] = r['h'], 'measured', 'osm+overture'; ds_used[r['hsrc']] = 1
                continue
            for k, poly in enumerate(r['g']):
                rings = [[P.xy(x, y) for x, y in ring] for ring in poly]
                if len(rings[0]) < 4 or abs(area(rings[0])) < a.min_area: continue
                if 'osm' in srcs:
                    o = rings[0]; c = centroid(o); m = len(o) - 1
                    pts = [c] + [((c[0] + o[i * m // 4][0]) / 2, (c[1] + o[i * m // 4][1]) / 2) for i in range(4)]
                    hit = sum(1 for p in pts if grid.at(p)) >= 2
                    if not hit:
                        x0, y0 = min(p[0] for p in o), min(p[1] for p in o); x1, y1 = max(p[0] for p in o), max(p[1] for p in o)
                        hit = any(inside(centroid(dd['rings'][0]), o) for cell in {(int(x // 60), int(y // 60)) for x in (x0, x1) for y in (y0, y1)}
                                  for _, dd in ocent.g.get(cell, []))
                    if hit: stats['overture_dup'] += 1; continue
                h = r['h'] if r['h'] and r['h'] > 0 else (r['nf'] * lh if r['nf'] else None)
                hs = 'measured' if r['h'] and r['h'] > 0 else 'levels' if r['nf'] else None
                b = r['mh'] or (r['mf'] * lh if r['mf'] else 0)
                blds.append(dict(id='ov:' + r['id'] + (f'.{k}' if k else ''), rings=rings, h=h, b=b or 0, hs=hs, lv=r['nf'], src='overture',
                                 c=r['c'] or 'yes', n=r['zh'] or r['n'] or '', en=r['en'] or ''))
                stats['overture_added'] += 1
                for ds in r['ds']: ds_used[ds] = 1
        if 'osm' not in srcs:                                          # Overture alone: take its parts too
            pr = overture_rows(bbox, cache, a.release, 'building_part', a.mirror)['rows']
            for r in pr:
                if r['ug']: continue
                for k, poly in enumerate(r['g']):
                    rings = [[P.xy(x, y) for x, y in ring] for ring in poly]
                    if len(rings[0]) < 4: continue
                    h = r['h'] if r['h'] else (r['nf'] * lh if r['nf'] else None)
                    parts.append(dict(id='ov:' + r['id'], rings=rings, h=h, b=r['mh'] or (r['mf'] * lh if r['mf'] else 0),
                                      hs='measured' if r['h'] else 'levels' if r['nf'] else None, n=r['zh'] or r['n'] or '', bid=r['bid']))
        stats['overture_datasets'] = sorted(ds_used)

    # ---- parts → buildings (Overture: by building_id; OSM: the smallest building that holds the part's centroid) ----
    bg = Grid()
    for d in blds: bg.add(d['rings'][0], d)
    byid = {d['id'][3:]: d for d in blds if d['id'].startswith('ov:')}
    for p in parts:
        host = byid.get(p.get('bid')) if p.get('bid') else None
        if not host:
            hs_ = bg.at(centroid(p['rings'][0])); host = min(hs_, key=lambda d: abs(area(d['rings'][0]))) if hs_ else None
        if host: host.setdefault('parts', []).append(p)
        else: p.update(src='osm', c='part', lv=None, en=p.get('en', '')); blds.append(p)    # a part outside any outline stands alone

    # ---- heights ----
    for d in blds:
        ps = d.get('parts', [])
        known = [p['h'] for p in ps if p['h']]
        if d['h'] is None and known: d['h'], d['hs'] = max(known), min((p['hs'] for p in ps if p['h']), key=['measured', 'levels'].index)
    kn = [d for d in blds if d['h']]; kgrid = {}
    for d in kn: d['_c'] = centroid(d['rings'][0]); d['_a'] = abs(area(d['rings'][0])); kgrid.setdefault((int(d['_c'][0] // 250), int(d['_c'][1] // 250)), []).append(d)
    for d in blds:
        if d['h']: continue
        c, A = centroid(d['rings'][0]), abs(area(d['rings'][0])); i0, j0 = int(c[0] // 250), int(c[1] // 250)
        near = [k for i in (i0 - 1, i0, i0 + 1) for j in (j0 - 1, j0, j0 + 1) for k in kgrid.get((i, j), [])
                if math.dist(k['_c'], c) < 250 and .25 < k['_a'] / max(A, 1) < 4]
        near = sorted(near, key=lambda k: math.dist(k['_c'], c))[:12]
        if len(near) >= 3: h = statistics.median(k['h'] - k['b'] for k in near)
        else: h = DEFAULT_H.get(d['c']) or (12 if A < 200 else 21 if A < 1000 else 30)
        d['h'], d['hs'] = round(min(h, a.est_max), 1) + d['b'], 'estimated'
    for d in blds:
        for p in d.get('parts', []):
            if not p['h']: p['h'], p['hs'] = d['h'], 'estimated' if d['hs'] == 'estimated' else d['hs']
        if d.get('roof') and not d['b']: d['b'] = max(0, d['h'] - 1)
        if d['b'] >= d['h']: d['b'] = max(0, d['h'] - 1)

    # ---- write ----
    R = (lambda v: int(round(v))) if a.prec <= 0 else (lambda v: round(v, a.prec))
    flat = lambda r: [R(v) for p in r for v in p]
    def shape(d, top):
        o = ccw(simplify(d['rings'][0], a.tol)); hs_ = [h[::-1] if area(h) > 0 else h for h in (simplify(x, a.tol) for x in d['rings'][1:]) if len(h) > 3]
        if len(o) < 4: return None
        out = dict(id=d['id'], p=flat(o)) if top else dict(p=flat(o))
        if hs_: out['q'] = [flat(h) for h in hs_]
        out.update(h=round(d['h'], 1), b=round(d['b'], 1), hs=d['hs'])
        return out
    res, vol = [], {'measured': 0., 'levels': 0., 'estimated': 0.}
    for d in sorted(blds, key=lambda d: d['id']):
        if not inbox(centroid(d['rings'][0])): continue
        o = shape(d, True)
        if not o: continue
        o.update(src=d['src'], c=d['c'])
        if d.get('n'): o['n'] = d['n']
        if d.get('en'): o['en'] = d['en']
        if d.get('lv'): o['lv'] = d['lv']
        ps = [x for x in (shape(p, False) for p in d.get('parts', [])) if x]
        for x, p in zip(ps, [p for p in d.get('parts', []) if shape(p, False)]):
            if p.get('n'): x['n'] = p['n']
        if ps: o['parts'] = ps
        for x in ps or [o]:
            pr = list(zip(x['p'][::2], x['p'][1::2])); vol[x['hs']] += abs(area(pr)) * (x['h'] - x['b'])
        res.append(o)
    cnt = {k: sum(1 for o in res if o['hs'] == k) for k in vol}
    srcl = (['OpenStreetMap via Overpass API'] if 'osm' in srcs else []) + ([f'Overture Maps buildings {release} ({", ".join(stats.get("overture_datasets", []))})'] if release else [])
    lic = '© OpenStreetMap contributors, ODbL 1.0' + ('; Overture Maps Foundation buildings theme, ODbL 1.0, with its sources\' attribution (see neo/geo/buildings.py)' if release else '')
    meta = dict(bbox=bbox, origin=[lon0, lat0], proj=a.proj or 'equirect', box=[round(v) for v in box], date=time.strftime('%Y-%m-%d'),
                release=release, level_height=lh, est_max=a.est_max, sources=srcl, license=lic,
                counts=dict(buildings=len(res), parts=sum(len(o.get('parts', [])) for o in res), **{f'hs_{k}': v for k, v in cnt.items()},
                            **{k: v for k, v in stats.items() if k != 'overture_datasets'}))
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    json.dump(dict(meta=meta, buildings=res), open(a.out, 'w'), ensure_ascii=False, separators=(',', ':'))
    N = max(1, len(res)); V = max(1., sum(vol.values()))
    print(f'{a.out}: {os.path.getsize(a.out) / 1e3:.0f} kB  {len(res)} buildings, {meta["counts"]["parts"]} parts')
    if 'osm' in srcs: print(f'  OpenStreetMap: {stats["osm"]} buildings, {stats["osm_parts"]} parts in the query')
    if release:
        print(f'  Overture {release}: {stats["overture_rows"]} rows ({stats["overture_from_osm"]} from OSM, matched by id), '
              f'{stats["overture_added"]} footprints added, {stats["overture_dup"]} dropped as overlapping OSM; datasets {", ".join(stats.get("overture_datasets", [])) or "none"}')
    print('  height: ' + ' · '.join(f'{k} {cnt[k]} ({100 * cnt[k] / N:.0f}%, {100 * vol[k] / V:.0f}% of volume)' for k in vol))
    print(f'  volume: {V / 1e6:.2f} million m³ (level height {lh} m, estimates capped at {a.est_max:g} m)')


if __name__ == '__main__':
    main()
