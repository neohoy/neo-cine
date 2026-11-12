#!/usr/bin/env python3
"""取全港可行车道路（带节点编号），给 prep.py 在 OSM 没有路线关系的班次上按真实道路连站。
原始回答存进 data/roads.cache/（gitignore），第二次运行不联网。用 neo/geo/osm.py 的 fetch（只调用，不改它）。
    .venv/bin/python styles/bus-dotmatrix/demo/tools/roads.py"""
import json, os, sys
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(D, '..', '..', '..', 'neo', 'geo'))
from osm import fetch
BBOX = [113.82, 22.15, 114.44, 22.56]
HW = 'motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|service|busway|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link'
Q = ('(way["highway"~"^(' + HW + ')$"]["service"!~"^(parking_aisle|driveway|drive-through)$"]({b}););'
     'out body qt;>;out skel qt;')
els = fetch('roads', BBOX, os.path.join(D, 'data', 'roads.cache'), query=Q)
print(len(els), 'elements')
