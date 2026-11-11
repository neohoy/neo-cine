#!/usr/bin/env python3
"""history.json (everything ohm.py fetched for North America) → us.json (what this film draws):
the 48 contiguous states with every version of their borders, the territories, the outline of the United States through time,
railways by opening year, and three trails. Run from the library root: .venv/bin/python styles/atlas-scroll/demo/tools/prep.py"""
import json, os, re, sys
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
sys.path.insert(0, os.path.join(D, '..', '..', '..', '..', 'neo', 'geo'))
import osm
H = json.load(open(os.path.join(D, 'history.json')))
STATES = ('Alabama|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|'
          'Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|'
          'Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming').split('|')
TERR = re.compile(r'Territory$|^Unorganized Federal Territory|^Louisiana Purchase$|^District of Louisiana$|^Oregon Country$|^Mexican cession$|^Gadsden Purchase$|^Florida UFT$|^Oregon UFT$')
TOL, MIN = 2000., 3e8                                             # metres; m² (islands smaller than this are dropped)
def rings(a):
    out = []
    for r in a['r']:
        pts = osm.simplify(list(zip(r[::2], r[1::2])), TOL)
        if len(pts) > 3 and abs(osm.area(pts)) >= MIN: out.append(osm.flat(pts))
    return out
def ver(a): return dict(s=a['s'], e=a['e'], r=rings(a))
A = [a for a in H['admin'] if a['e'] > 1776 and a['s'] < 1913]
states = []
for n in STATES:
    vs = sorted((ver(a) for a in A if a['lv'] == 4 and a['n'] == n and not (n == 'Texas' and a['s'] < 1845.9)), key=lambda v: v['s'])
    states.append(dict(n=n, v=[v for v in vs if v['r']]))
out = dict(
    meta=dict(H['meta'], note='made by tools/prep.py from history.json'),
    states=states,
    terr=[dict(n=a['n'], **ver(a)) for a in A if a['lv'] == 4 and TERR.search(a['n']) and a['n'] != 'North-West Territories'],
    us=[ver(a) for a in A if a['lv'] == 2 and a['n'] == 'United States'],
    rail=[dict(s=int(r['s']), p=r['p']) for r in H['rail'] if r['s'] < 1913],
    trails=[dict(n=t['n'], p=t['p']) for t in H['named'] if re.search(r'Oregon Trail|^Santa Fe Trail$|^National Road$|Cumberland National Road', t['n'])],
)
out['terr'] = [t for t in out['terr'] if t['r']]
p = os.path.join(D, 'us.json'); json.dump(out, open(p, 'w'), ensure_ascii=False, separators=(',', ':'))
print(f'us.json {os.path.getsize(p) / 1e6:.2f} MB  states {len(states)} ({sum(len(s["v"]) for s in states)} versions)  terr {len(out["terr"])}  us {len(out["us"])}  rail {len(out["rail"])}  trails {len(out["trails"])}')
print('no geometry:', [s['n'] for s in states if not s['v']])
