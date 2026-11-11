#!/usr/bin/env python3
"""neo/geo/ohm.py: OpenHistoricalMap → dated layers a film page can draw (what was where, and when).

    .venv/bin/python neo/geo/ohm.py --bbox W,S,E,N --layers admin,rail,named --proj albers:29.5,45.5 --origin LON,LAT \\
        --levels 2,4 --before 1913 --names 'Oregon Trail|National Road' --out <film>/data/history.json

Every feature carries s and e: the first and last year it existed, as decimal years (1803.33 = 30 April 1803; e is 9999
while it still exists). Give this file the same --origin and --proj as the osm.py file it is drawn over.

    { "meta":  { bbox, origin, proj, date, source, license },
      "admin": [{n, lv, s, e, r}]    n name, lv admin_level, r rings (flat [x0,y0,…] in whole metres; outer rings then holes:
                                     fill even-odd). A border shared by two areas is simplified once, so neighbours meet exactly
      "rail":  [{s, e, p}]           railway lines opened before --before
      "named": [{n, s, e, p}] }      ways whose name matches --names (trails, canals, roads)

Borders are the subject of this data. Use them only where the film is about how borders changed, keep disputed present-day
ones out of the frame, and read DIRECTOR.md §13 first.
OpenHistoricalMap data is CC0 (public domain); crediting it is a courtesy, and CREDITS should still name it.
Only the Python standard library is used.
"""
import argparse, json, os, re, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import osm

OHM = ['https://overpass-api.openhistoricalmap.org/api/interpreter']


def year(s, end=False):
    """'1803-04-30' → 1803.33; '1803' → 1803.0 (or 1803.999 for an end date); missing → None."""
    m = re.match(r'^(-?\d{1,4})(?:-(\d\d))?(?:-(\d\d))?', s or '')
    if not m: return None
    y, mo, d = int(m.group(1)), m.group(2), m.group(3)
    if not mo: return y + (.999 if end else 0.)
    return round(y + (int(mo) - 1) / 12 + ((int(d) - 1) if d else (29 if end else 0)) / 365, 3)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--bbox', required=True, help='W,S,E,N in degrees')
    ap.add_argument('--layers', default='admin')
    ap.add_argument('--levels', default='2,4', help='admin_level values for the admin layer (2 countries and claims, 4 states and territories)')
    ap.add_argument('--before', type=float, default=9999, help='only features that began before this year')
    ap.add_argument('--names', default='', help='regular expression for the named layer')
    ap.add_argument('--origin', help='LON,LAT of x=0,y=0 (default: the bbox centre)')
    ap.add_argument('--proj', default='', help='albers:LAT1,LAT2, as in osm.py')
    ap.add_argument('--tol', type=float, default=800., help='simplification tolerance in metres (default 800)')
    ap.add_argument('--min-len', type=float, default=0., help='drop rail and named lines shorter than this, metres')
    ap.add_argument('--out', required=True)
    a = ap.parse_args()
    bbox = [float(v) for v in a.bbox.split(',')]; w, s, e, n = bbox
    lon0, lat0 = [float(v) for v in a.origin.split(',')] if a.origin else ((w + e) / 2, (s + n) / 2)
    P = osm.Proj(lon0, lat0, tuple(float(v) for v in a.proj.split(':')[1].split(',')) if a.proj.startswith('albers') else None)
    cache = a.out + '.cache'; out = {}; before = f'{int(a.before):04d}'
    length = lambda pts: sum(((bx - ax) ** 2 + (by - ay) ** 2) ** .5 for (ax, ay), (bx, by) in zip(pts, pts[1:]))
    for layer in a.layers.split(','):
        if layer == 'admin':
            lv = '|'.join(a.levels.split(','))
            els = osm.fetch('ohm-admin', bbox, cache, endpoints=OHM, query=f'relation["boundary"="administrative"]["admin_level"~"^({lv})$"]["start_date"](if: t["start_date"] < "{before}")({{b}});out body;way(r);out geom qt;')
            ways = {el['id']: osm.simplify(P.line(el['geometry']), a.tol) for el in els if el['type'] == 'way' and el.get('geometry')}
            res = []
            for el in els:
                if el['type'] != 'relation': continue
                t = el.get('tags', {}); rings = []
                for role in ('outer', 'inner'):
                    parts = [ways[m['ref']] for m in el['members'] if m['type'] == 'way' and m['ref'] in ways and (m.get('role') or 'outer') == role]
                    rings += [ch for ch in osm.stitch(parts) if len(ch) > 3 and ch[0] == ch[-1]]
                if rings: res.append(dict(n=t.get('name:en') or t.get('name') or '', lv=int(t['admin_level']), s=year(t.get('start_date')), e=year(t.get('end_date'), True) or 9999, r=[osm.flat(r) for r in rings]))
            out['admin'] = sorted(res, key=lambda d: (d['s'], d['n']))
        elif layer == 'rail':
            els = osm.fetch('ohm-rail', bbox, cache, endpoints=OHM, query=f'way["railway"="rail"]["start_date"](if: t["start_date"] < "{before}")({{b}});out geom qt;')
            res = []
            for el in els:
                pts = P.line(el.get('geometry') or []); t = el['tags']
                if len(pts) > 1 and length(pts) >= a.min_len and not t.get('service'): res.append(dict(s=year(t['start_date']), e=year(t.get('end_date'), True) or 9999, p=osm.flat(osm.simplify(pts, a.tol))))
            out['rail'] = sorted(res, key=lambda d: d['s'])
        elif layer == 'named':
            els = osm.fetch('ohm-named', bbox, cache, endpoints=OHM, query=f'way["name"~"{a.names}",i]({{b}});out geom qt;')
            out['named'] = [dict(n=el['tags'].get('name', ''), s=year(el['tags'].get('start_date')), e=year(el['tags'].get('end_date'), True) or 9999, p=osm.flat(osm.simplify(P.line(el['geometry']), a.tol))) for el in els if el.get('geometry')]
        else: sys.exit(f'✗ unknown layer "{layer}"; choose from admin, rail, named')
    out = dict(meta=dict(bbox=bbox, origin=[lon0, lat0], proj=a.proj or 'equirect', date=time.strftime('%Y-%m-%d'),
                         source='OpenHistoricalMap via Overpass API', license='OpenHistoricalMap, CC0 1.0'), **out)
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    json.dump(out, open(a.out, 'w'), ensure_ascii=False, separators=(',', ':'))
    print(f'{a.out}: {os.path.getsize(a.out) / 1e6:.2f} MB  ' + '  '.join(f'{k} {len(v)}' for k, v in out.items() if k != 'meta'))


if __name__ == '__main__':
    main()
