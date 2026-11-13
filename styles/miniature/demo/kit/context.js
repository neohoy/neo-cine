// 微缩景观工具包 · 周边楼群：把 neo/geo/buildings.py 的 JSON（OpenStreetMap + Overture 的真实建筑轮廓和高度）挤成白模体块。
// 用法：
//   .venv/bin/python neo/geo/buildings.py --bbox W,S,E,N --origin LON,LAT --out <film>/data/blocks.json
//   const data = await (await fetch('data/blocks.json')).json();
//   context(scene, data, { scale: 1/45, rot: 0, offset: [0, 0, -30], keep: b => …, glow, batches: 6 });
// 坐标：文件里 x 向东、y 向北（米）；模型里 x = 东，z = −北（北朝画面里面）。scale 把米换成模型单位。
// 楼群只当背景：纯白体块，不放人、树、车；和主体之间留一条街，让两种比例不打架（STYLE §9）。
// 楼的高度来源（hs）原样保留：measured / levels / estimated，CREDITS 里要写清楚有多少是估的。
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PALETTE, mat } from './materials.js';
import { rng } from './core.js';

export function context(parent, data, { scale = 1 / 45, rot = 0, offset = [0, 0, 0], keep = () => true, color = PALETTE.ivory, glow = null, batches = 6, seed = 11, minH = 0 } = {}) {
  const r = rng(seed), c = Math.cos(rot), s = Math.sin(rot), geos = [], lit = Array.from({ length: batches }, () => []);
  const tx = (x, y) => { const X = x * c - y * s, Y = x * s + y * c; return [X * scale + offset[0], -Y * scale + offset[2]]; };
  const parts = data.buildings.flatMap(b => b.parts?.length ? b.parts.map(p => ({ ...p, id: b.id, hs: p.hs || b.hs })) : [b]);
  let n = 0;
  for (const b of parts) {
    if (!keep(b) || b.h < minH) continue;
    const ring = []; for (let i = 0; i < b.p.length; i += 2) ring.push(tx(b.p[i], b.p[i + 1]));
    const shape = new THREE.Shape(ring.map(([X, Z]) => new THREE.Vector2(X, -Z)));
    for (const hole of b.q || []) { const h = []; for (let i = 0; i < hole.length; i += 2) h.push(tx(hole[i], hole[i + 1])); shape.holes.push(new THREE.Path(h.map(([X, Z]) => new THREE.Vector2(X, -Z)))); }
    const H = Math.max(.05, (b.h - (b.b || 0)) * scale), bev = Math.min(.06, H / 8);
    const g = new THREE.ExtrudeGeometry(shape, { depth: H, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, steps: 1 });
    // ExtrudeGeometry 沿 +z 挤出：转成沿 +y，形状平面的 y 对应模型的 −z
    g.rotateX(-Math.PI / 2); g.translate(0, offset[1] + (b.b || 0) * scale, 0);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    (glow ? lit[Math.floor(r() * batches)] : geos).push(g); n++;
  }
  const out = [];
  const addMesh = (list, m) => { if (!list.length) return; const mesh = new THREE.Mesh(mergeGeometries(list), m); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); out.push(mesh); };
  addMesh(geos, mat(color));
  // 夜里亮窗：每批一个会亮的材质（glow.make('city0' …)），亮灯时一批批点
  if (glow) lit.forEach((list, i) => addMesh(list, glow.make('city' + i, '#ffd59a', color, { max: .35 })));
  return { meshes: out, count: n };
}
