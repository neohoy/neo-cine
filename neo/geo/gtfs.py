#!/usr/bin/env python3
"""neo/geo/gtfs.py: a GTFS timetable → the trips of one day, in one small JSON file a film page can draw.

    .venv/bin/python neo/geo/gtfs.py --feed hk-gtfs.zip --date 20261118 --agency KMB --routes '^(1A|2|6|960)$' --out <film>/data/day.json
    .venv/bin/python neo/geo/gtfs.py --feed de-fv.zip --date 20261118 --through 'Köln Hbf,Frankfurt(Main)Hbf' --out <film>/data/trains.json

GTFS is the format operators publish timetables in (stops.txt, routes.txt, trips.txt, stop_times.txt, calendar*.txt,
frequencies.txt). This keeps the trips that run on --date (calendar.txt and its exceptions in calendar_dates.txt), optionally
only some agencies, route names, route types, trips with a stop inside --bbox or trips that call at all the --through stops,
projects the stops to metres around an origin (x east, y north; the same --origin and --proj as an osm.py or routes.py file
puts them in one frame) and groups the trips into patterns, so a day of buses stays small:

    { "meta":     { feed, date, agencies, origin, source, license, notes },
      "stops":    [{ n, x, y, id }]
      "routes":   [{ id, short, long, type, colour, agency }]
      "patterns": [{ route, head, stops: [stop indices], dt: [departure, seconds after the first stop's, one per stop],
                     dw: [seconds the trip stands at each stop: departure − arrival, 0 when the feed gives one time],
                     timed: [1 when the feed gives this stop's time, 0 when it was interpolated],
                     dep: [first-stop departures, seconds after midnight of --date, sorted],
                     freq: 1 when dep comes from frequencies.txt (start, end, headway) and not from a published departure }] }

Interpolation: a stop without a time (GTFS allows that between timepoints) gets one by straight-line distance between the
timed stops around it, and is marked timed 0. Headway-based trips (frequencies.txt, exact_times 0) are expanded into one
departure every headway from start to end: a real headway, not a real bus, and the film says so if it shows single buses.
Times past midnight (25:10:00) stay past 86400. Stop names: name, with feed decorations removed (a leading [KMB], <BR>,
everything after the first |). A feed's licence is the publisher's: name the feed, its publisher and its terms in CREDITS.
Python standard library only.
"""
import argparse, csv, io, json, math, os, re, sys, time, zipfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from osm import Proj


class Feed:
    def __init__(self, path):
        self.z = zipfile.ZipFile(path) if path.endswith('.zip') else None; self.dir = path
    def has(self, name):
        return name in self.z.namelist() if self.z else os.path.exists(os.path.join(self.dir, name))
    def rows(self, name):
        if not self.has(name): return iter(())
        f = io.TextIOWrapper(self.z.open(name), 'utf-8-sig') if self.z else open(os.path.join(self.dir, name), encoding='utf-8-sig')
        return csv.DictReader(f)


def secs(s):
    if not s: return None
    h, m, x = s.strip().split(':'); return int(h) * 3600 + int(m) * 60 + int(x)


def clean(n):
    n = n.split('|')[0]; n = re.sub(r'^\[[^\]]*\]\s*', '', n); n = re.sub(r'<br\s*/?>', ' ', n, flags=re.I)
    return re.sub(r'\s+', ' ', n).strip()


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--feed', required=True, help='a GTFS .zip or an unpacked folder')
    ap.add_argument('--date', required=True, help='YYYYMMDD: the service day')
    ap.add_argument('--agency', default='', help='keep only these agency_id values (comma-separated)')
    ap.add_argument('--routes', default='', help='keep only routes whose short name (else long name) matches this regular expression')
    ap.add_argument('--types', default='', help='keep only these route_type values (comma-separated: 0 tram, 1 metro, 2 rail, 3 bus, 4 ferry; 100–117 rail, 700–716 bus …)')
    ap.add_argument('--bbox', default='', help='W,S,E,N: keep only trips with at least one stop inside')
    ap.add_argument('--through', default='', help='keep only trips that call at every one of these stop names (comma-separated, exact, after cleaning)')
    ap.add_argument('--origin', help='LON,LAT of x=0,y=0 (default: the centre of the kept stops)')
    ap.add_argument('--proj', default='', help='albers:LAT1,LAT2 for a country-scale file (default equirectangular)')
    ap.add_argument('--out', required=True)
    a = ap.parse_args()
    F = Feed(a.feed); D = a.date; wd = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][time.strptime(D, '%Y%m%d').tm_wday]
    on = {r['service_id'] for r in F.rows('calendar.txt') if r[wd] == '1' and r['start_date'] <= D <= r['end_date']}
    for r in F.rows('calendar_dates.txt'):
        if r['date'] == D: (on.add if r['exception_type'] == '1' else on.discard)(r['service_id'])
    if not on: sys.exit(f'✗ no service runs on {D}: check the feed\'s calendar range')
    agencies = {r.get('agency_id', ''): r['agency_name'] for r in F.rows('agency.txt')}
    keepA = set(a.agency.split(',')) if a.agency else None; keepT = set(a.types.split(',')) if a.types else None
    routes = {}
    for r in F.rows('routes.txt'):
        if keepA and r.get('agency_id', '') not in keepA: continue
        if keepT and r['route_type'] not in keepT: continue
        nm = r.get('route_short_name') or r.get('route_long_name', '')
        if a.routes and not re.search(a.routes, nm): continue
        routes[r['route_id']] = r
    trips = {r['trip_id']: r for r in F.rows('trips.txt') if r['route_id'] in routes and r['service_id'] in on}
    print(f'  {len(routes)} routes, {len(trips)} trips on {D} ({wd})', flush=True)
    st = {}
    for r in F.rows('stop_times.txt'):
        if r['trip_id'] in trips:
            st.setdefault(r['trip_id'], []).append((int(r['stop_sequence']), r['stop_id'], secs(r['arrival_time']), secs(r['departure_time'])))
    stops = {r['stop_id']: r for r in F.rows('stops.txt')}
    for r in list(stops.values()):                                       # a stop inside a station takes the station's name
        if r.get('parent_station') and r['parent_station'] in stops and not r.get('stop_name'): r['stop_name'] = stops[r['parent_station']]['stop_name']
    if a.bbox:
        w, s, e, n = map(float, a.bbox.split(','))
        inside = lambda sid: w <= float(stops[sid]['stop_lon']) <= e and s <= float(stops[sid]['stop_lat']) <= n
        st = {t: v for t, v in st.items() if any(inside(x[1]) for x in v)}
    if a.through:
        need = set(a.through.split(','))
        st = {t: v for t, v in st.items() if need <= {clean(stops[x[1]]['stop_name']) for x in v}}
    used = sorted({x[1] for v in st.values() for x in v})
    if not used: sys.exit('✗ no trips left after the filters')
    lons = [float(stops[i]['stop_lon']) for i in used]; lats = [float(stops[i]['stop_lat']) for i in used]
    lon0, lat0 = [float(v) for v in a.origin.split(',')] if a.origin else ((min(lons) + max(lons)) / 2, (min(lats) + max(lats)) / 2)
    P = Proj(lon0, lat0, tuple(float(v) for v in a.proj.split(':')[1].split(',')) if a.proj.startswith('albers') else None)
    sidx = {sid: i for i, sid in enumerate(used)}
    XY = [P.xy(float(stops[i]['stop_lon']), float(stops[i]['stop_lat'])) for i in used]
    freqs = {}
    for r in F.rows('frequencies.txt'):
        if r['trip_id'] in st: freqs.setdefault(r['trip_id'], []).append((secs(r['start_time']), secs(r['end_time']), int(r['headway_secs']), r.get('exact_times', '0')))
    pats, interp = {}, 0
    for tid, v in st.items():
        v.sort(); ids = [sidx[x[1]] for x in v]
        T = [x[3] if x[3] is not None else x[2] for x in v]; timed = [int(t is not None) for t in T]
        dw = [x[3] - x[2] if x[2] is not None and x[3] is not None else 0 for x in v]   # dt is the departure; arrival = dt − dw
        if T[0] is None or T[-1] is None: continue                       # GTFS requires the first and last time; skip a broken trip
        i = 0
        while i < len(T) - 1:                                            # fill gaps by distance between the timed stops around them
            if T[i + 1] is not None: i += 1; continue
            j = i + 1
            while T[j] is None: j += 1
            d = [0.]
            for k in range(i, j): d.append(d[-1] + math.dist(XY[ids[k]], XY[ids[k + 1]]))
            for k in range(i + 1, j): T[k] = round(T[i] + (T[j] - T[i]) * d[k - i] / (d[-1] or 1)); interp += 1
            i = j
        tr = trips[tid]; dt = [t - T[0] for t in T]
        key = (tr['route_id'], tuple(ids), tuple(dt), tuple(dw))
        p = pats.setdefault(key, {'route': tr['route_id'], 'head': tr.get('trip_headsign', ''), 'stops': ids, 'dt': dt, 'dw': dw, 'timed': timed, 'dep': [], 'freq': 0})
        if tid in freqs:
            p['freq'] = 1
            for a0, b0, h, _ in freqs[tid]: p['dep'] += list(range(a0, b0, h))
        else: p['dep'].append(T[0])
    rlist = sorted({p['route'] for p in pats.values()}); ridx = {r: i for i, r in enumerate(rlist)}
    P2 = []
    for p in sorted(pats.values(), key=lambda p: (p['route'], p['dep'] and min(p['dep']))):
        p['route'] = ridx[p['route']]; p['dep'] = sorted(set(p['dep'])); P2.append(p)
    out = {'meta': {'feed': os.path.basename(a.feed.rstrip('/')), 'date': D, 'weekday': wd, 'origin': [lon0, lat0],
                    'agencies': sorted({agencies.get(routes[r].get('agency_id', ''), routes[r].get('agency_id', '')) for r in rlist}),
                    'source': 'GTFS feed (name its publisher and terms in CREDITS)', 'made': time.strftime('%Y-%m-%d'),
                    'notes': f'{interp} stop times interpolated by distance; patterns with freq 1 are expanded from headways'},
           'stops': [{'n': clean(stops[i]['stop_name']), 'x': round(x), 'y': round(y), 'id': i} for i, (x, y) in zip(used, XY)],
           'routes': [{'id': r, 'short': routes[r].get('route_short_name', ''), 'long': routes[r].get('route_long_name', ''),
                       'type': int(routes[r]['route_type']), 'colour': ('#' + routes[r]['route_color']) if routes[r].get('route_color') else '',
                       'agency': routes[r].get('agency_id', '')} for r in rlist],
           'patterns': P2}
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    json.dump(out, open(a.out, 'w'), ensure_ascii=False, separators=(',', ':'))
    n = sum(len(p['dep']) for p in P2)
    print(f'✓ {a.out}: {len(rlist)} routes, {len(P2)} patterns, {n} departures, {len(used)} stops, {interp} times interpolated, {os.path.getsize(a.out) / 1e3:.0f} kB')


if __name__ == '__main__':
    main()
