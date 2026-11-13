#!/usr/bin/env python3
"""neo/geo/routes.py: OpenStreetMap public-transport routes → one small JSON file a film page can draw.

    .venv/bin/python neo/geo/routes.py --bbox W,S,E,N --route subway --out <film>/data/metro.json
    .venv/bin/python neo/geo/routes.py --bbox W,S,E,N --route bus --refs 1,2,6X,960 --network '^(九巴|KMB)' --out <film>/data/bus.json
    .venv/bin/python neo/geo/routes.py --bbox W,S,E,N --route train --filter '["service"!="tourism"]' --proj albers:47,54 --out …

OpenStreetMap keeps each line of a network as a route relation per direction (route=subway|light_rail|train|tram|bus|
ferry …): an ordered list of track or road ways, and its stops in order, with the line's ref, name and published colour.
This asks the Overpass API for the relations that touch the box (raw answers kept in <out>.cache/, so a second run is
offline), stitches each one's ways into one path in the direction of travel, projects longitude/latitude to metres around
an origin (x east, y north; the same --origin and --proj as an osm.py file puts both in one frame) and writes

    { "meta":     { bbox, origin, box, route, date, source, license },
      "routes":   [{ id, ref, name, en, colour, network, operator, from, to, start, master,
                     path: [[x0,y0,x1,y1,…], …]      one piece when the ways join; a gap over --gap metres starts a new piece
                     len:  metres along the path,
                     stops:[[station, s], …] }]     index into "stations", and the distance along the path in metres
      "lines":    [{ ref, colour, name, network, routes: [indices] }]   route_master groups (or ref + network when there is none)
      "stations": [{ n, en, x, y, lines: [refs] }] } stops of every route merged by name within --merge metres

Names: n is name:zh, else name; en is name:en. A colour the relation lacks is taken from its route_master; still missing
stays "". OSM is a map of what exists, with the dates its mappers added (start = start_date, often missing): opening dates
for a film come from the operator (DIRECTOR.md §13 and the style's facts rule), never from this file alone.
Data © OpenStreetMap contributors, ODbL 1.0: credit it in CREDITS (a library demo keeps it off screen: MAINTAINING.md). Python standard library only.
"""
import argparse, json, math, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from osm import fetch, Proj, simplify, flat


def stitch(ways, gap):
    """Ordered member ways (each a list of (x, y)) → pieces of one path in the order of travel."""
    pieces, cur = [], []
    d = lambda p, q: math.hypot(p[0] - q[0], p[1] - q[1])
    for i, w in enumerate(ways):
        if len(w) < 2: continue
        if not cur:                                   # orient the first way of a piece towards the next one
            nxt = next((v for v in ways[i + 1:] if len(v) > 1), None)
            if nxt and min(d(w[0], nxt[0]), d(w[0], nxt[-1])) < min(d(w[-1], nxt[0]), d(w[-1], nxt[-1])): w = w[::-1]
            cur = list(w); continue
        e = cur[-1]
        if d(e, w[-1]) < d(e, w[0]): w = w[::-1]
        if d(e, w[0]) > gap: pieces.append(cur); cur = list(w)
        else: cur += w[1:]
    if cur: pieces.append(cur)
    return pieces


def locate(pieces, p):
    """Distance along the joined pieces of the point nearest p (pieces are measured end to end, gaps not counted)."""
    best, s0, bs = 1e18, 0., 0.
    for pc in pieces:
        for a, b in zip(pc, pc[1:]):
            dx, dy = b[0] - a[0], b[1] - a[1]; L2 = dx * dx + dy * dy or 1e-9
            t = max(0., min(1., ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2))
            q = (a[0] + t * dx, a[1] + t * dy); dd = math.hypot(p[0] - q[0], p[1] - q[1])
            if dd < best: best, bs = dd, s0 + t * math.sqrt(L2)
            s0 += math.sqrt(L2)
    return bs, best


def length(pc): return sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(pc, pc[1:]))


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--bbox', required=True, help='W,S,E,N in degrees: relations touching it are kept whole')
    ap.add_argument('--route', default='subway', help='route types, a regular expression on route=, e.g. "subway|light_rail" (default subway)')
    ap.add_argument('--refs', default='', help='keep only these refs (comma-separated, exact)')
    ap.add_argument('--network', default='', help='keep only relations whose network or operator matches this regular expression')
    ap.add_argument('--filter', default='', help='an extra Overpass filter on the relations, e.g. \'["service"!="tourism"]\'')
    ap.add_argument('--origin', help='LON,LAT of x=0,y=0 (default: the bbox centre)')
    ap.add_argument('--proj', default='', help='albers:LAT1,LAT2 for a country-scale file (default equirectangular)')
    ap.add_argument('--tol', type=float, default=4., help='simplification tolerance in metres (default 4)')
    ap.add_argument('--gap', type=float, default=150., help='a jump between ways longer than this starts a new piece (metres, default 150)')
    ap.add_argument('--merge', type=float, default=400., help='stops with the same name closer than this are one station (metres, default 400)')
    ap.add_argument('--out', required=True)
    a = ap.parse_args()
    bbox = [float(v) for v in a.bbox.split(',')]; w, s, e, n = bbox
    lon0, lat0 = [float(v) for v in a.origin.split(',')] if a.origin else ((w + e) / 2, (s + n) / 2)
    P = Proj(lon0, lat0, tuple(float(v) for v in a.proj.split(':')[1].split(',')) if a.proj.startswith('albers') else None)
    cs = [P.xy(lo, la) for lo in (w, (w + e) / 2, e) for la in (s, n)]
    box = [min(c[0] for c in cs), min(c[1] for c in cs), max(c[0] for c in cs), max(c[1] for c in cs)]
    sel = f'rel["route"~"^({a.route})$"]{a.filter}' + '({b})'
    if a.refs: sel = f'rel["route"~"^({a.route})$"]["ref"~"^({"|".join(r.strip() for r in a.refs.split(","))})$"]{a.filter}' + '({b})'
    # relations with their way geometry; their member nodes with tags (stop names); their route_masters
    q = sel + '->.r;.r out geom;node(r.r)->.n;.n out;way(r.r:"platform")->.p;.p out tags center;rel(br.r)["type"="route_master"];out tags;'
    els = fetch('routes', bbox, a.out + '.cache', query=q)
    rels = [x for x in els if x['type'] == 'relation' and x.get('tags', {}).get('type') == 'route']
    masters = [x for x in els if x['type'] == 'relation' and x.get('tags', {}).get('type') == 'route_master']
    nodes = {x['id']: x for x in els if x['type'] == 'node'}
    plats = {x['id']: x for x in els if x['type'] == 'way' and 'center' in x}
    import re
    if a.network: rels = [r for r in rels if re.search(a.network, r['tags'].get('network', '') + '|' + r['tags'].get('operator', ''))]
    if a.refs: keep = {r.strip() for r in a.refs.split(',')}; rels = [r for r in rels if r['tags'].get('ref') in keep]
    m_of = {}
    for m in masters:
        for mem in m.get('members', []):
            if mem['type'] == 'relation': m_of[mem['ref']] = m
    zh = lambda t: t.get('name:zh-Hans') or t.get('name:zh') or t.get('name') or ''
    routes, stations = [], []
    def station(name, en, x, y, ref):
        for i, st in enumerate(stations):
            if st['n'] == name and math.hypot(st['x'] - x, st['y'] - y) < a.merge:
                if ref not in st['lines']: st['lines'].append(ref)
                return i
        stations.append({'n': name, 'en': en, 'x': round(x), 'y': round(y), 'lines': [ref]}); return len(stations) - 1
    for r in sorted(rels, key=lambda r: (r['tags'].get('ref', ''), r['id'])):
        t = r['tags']; m = m_of.get(r['id']); mt = m['tags'] if m else {}
        ref = t.get('ref') or mt.get('ref') or ''
        ways = [P.line(mem['geometry']) for mem in r.get('members', []) if mem['type'] == 'way' and mem.get('geometry')
                and not mem.get('role', '').startswith('platform')]
        pieces = [simplify(pc, a.tol) for pc in stitch(ways, a.gap)]
        pieces = [pc for pc in pieces if len(pc) > 1]
        if not pieces: continue
        stops, seen = [], set()
        for mem in r.get('members', []):
            role = mem.get('role', '')
            if not (role.startswith('stop') or role.startswith('platform')): continue
            if mem['type'] == 'node' and mem['ref'] in nodes: el = nodes[mem['ref']]; lon, lat = el['lon'], el['lat']
            elif mem['type'] == 'way' and mem['ref'] in plats: el = plats[mem['ref']]; lon, lat = el['center']['lon'], el['center']['lat']
            else: continue
            nm = zh(el.get('tags', {}))
            if not nm or nm in seen: continue          # a stop and its platform carry the same name: keep the first
            seen.add(nm); x, y = P.xy(lon, lat); sd, off = locate(pieces, (x, y))
            stops.append([station(nm, el.get('tags', {}).get('name:en', ''), x, y, ref), round(sd), round(off)])
        routes.append({'id': r['id'], 'ref': ref, 'name': t.get('name', ''), 'en': t.get('name:en', ''),
                       'colour': t.get('colour') or mt.get('colour') or '', 'network': t.get('network') or mt.get('network', ''),
                       'operator': t.get('operator') or mt.get('operator', ''), 'from': t.get('from', ''), 'to': t.get('to', ''),
                       'start': t.get('start_date', ''), 'master': m['id'] if m else 0,
                       'path': [flat(pc) for pc in pieces], 'len': round(sum(length(pc) for pc in pieces)),
                       'stops': [[i, sd] for i, sd, off in stops if off < a.merge]})
    lines = {}
    for i, rt in enumerate(routes):
        k = rt['master'] or (rt['network'], rt['ref'])
        L = lines.setdefault(k, {'ref': rt['ref'], 'colour': rt['colour'], 'name': (m_of.get(rt['id']) or {}).get('tags', {}).get('name', rt['name']),
                                 'network': rt['network'], 'routes': []})
        L['routes'].append(i); L['colour'] = L['colour'] or rt['colour']
    out = {'meta': {'bbox': bbox, 'origin': [lon0, lat0], 'box': [round(v) for v in box], 'route': a.route,
                    'date': time.strftime('%Y-%m-%d'), 'source': 'OpenStreetMap (Overpass API)', 'license': 'ODbL 1.0, © OpenStreetMap contributors'},
           'routes': routes, 'lines': list(lines.values()), 'stations': stations}
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    json.dump(out, open(a.out, 'w'), ensure_ascii=False, separators=(',', ':'))
    print(f'✓ {a.out}: {len(routes)} routes in {len(lines)} lines, {len(stations)} stations, {os.path.getsize(a.out) / 1e3:.0f} kB')
    for L in sorted(lines.values(), key=lambda L: L['ref']):
        rs = [routes[i] for i in L['routes']]
        print(f'  {L["ref"]:>6} {L["colour"]:8} {len(rs)} routes, {max(r["len"] for r in rs) / 1000:.1f} km, '
              f'{max(len(r["stops"]) for r in rs)} stops, {max(len(r["path"]) for r in rs)} piece(s)  {L["name"][:40]}')


if __name__ == '__main__':
    main()
