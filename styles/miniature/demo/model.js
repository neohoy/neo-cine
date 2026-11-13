// 微缩景观 · 福田站模型：一块被切开的城市地块，放在薄展示底座上
//   上层（地面）：站口、下沉广场、公交停靠、出入口；后面是真实的福田中心区楼群（白模）
//   中层：地铁站台，一列地铁，2 · 3 · 11 号线色标
//   下层：高铁站台，一列高铁
// 三层的划分、站台和轨道的位置都是艺术化的示意，不代表真实车站的楼层和换乘路径（DEMO.md 开头、CREDITS）。
// 截面的布局改编自用户的《福田站 · 精致微缩 v003》（compact.ts）；楼群换成 neo/geo/buildings.py 抓的真实轮廓和高度。
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry } from '/core/lib.js';
import { PI, rnd, reseed, NIGHT, mat, glow, glass, metal, steel, dark, silver, stone, ivory, box, cylinder, label, plantBox, tree, bench, railings, lightPole,
  bin, info, stairs, escalators, person, metroTrain, hsrTrain, cityBus, clipX, whiteExit, earthMat } from './kit.js';

export const HALF = 12.6, FRONT = 6.65, REAR = -6.65, BACK = -18.8;          // 截面左右半宽、前切面、车站后墙、城市地块后沿
export const LEVEL = { platform: -3.4, metro: .8, ground: 4.8 };             // 三层的地面高度（模型单位）
export const LINE = { 2: '#db6d1c', 3: '#00a2e1', 11: '#6a1d44' };          // 线路色：OpenStreetMap 线路关系的 colour 标签（CREDITS）
export const CITY = { S: 45, gap: 45, depth: 560, from: -560, to: 545 };    // 楼群：1 模型单位 = 45 米；只取益田路以西 45–560 米、车站南北两端之间

// ---------- 真实楼群 → 白模体量（每栋楼按种子分到 6 批，夜里一批一批亮灯）----------
function windowTex() {
  const W = 256, H = 512, a = document.createElement('canvas'), e = document.createElement('canvas'); a.width = e.width = W; a.height = e.height = H;
  const ga = a.getContext('2d'), ge = e.getContext('2d'), r = mulberry(88), cols = 8, rows = 16, cw = W / cols, ch = H / rows;
  ga.fillStyle = '#f1f1ec'; ga.fillRect(0, 0, W, H); ge.fillStyle = '#000'; ge.fillRect(0, 0, W, H);
  for (let j = 0; j < rows; j++) {
    ga.fillStyle = 'rgba(120,140,145,.16)'; ga.fillRect(0, j * ch + ch * .28, W, ch * .5);           // 白天：一层一道很淡的窗带
    ga.fillStyle = 'rgba(90,100,100,.10)'; ga.fillRect(0, j * ch, W, 1.5);
    const busy = r() * .8, warm = r() < .75;                                                         // 夜里：每层亮多少随机，一层里暖白或冷白
    for (let i = 0; i < cols; i++) if (r() < busy) {
      ge.fillStyle = warm ? '#ffd29a' : '#dfe8ff'; ge.globalAlpha = .7 + r() * .3; ge.fillRect(i * cw + 3, j * ch + ch * .22, cw - 6, ch * .6);
    }
  }
  const ta = new THREE.CanvasTexture(a), te = new THREE.CanvasTexture(e);
  for (const t of [ta, te]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 2.0, 1 / 2.4); t.anisotropy = 8; }
  ta.colorSpace = te.colorSpace = THREE.SRGBColorSpace; return { ta, te };
}
function split(geo) {                     // ExtrudeGeometry（不带索引）按材质组拆成顶面和侧墙两块
  const out = [];
  for (const gr of geo.groups) {
    const g = new THREE.BufferGeometry();
    for (const k of ['position', 'normal', 'uv']) { const at = geo.attributes[k]; g.setAttribute(k, new THREE.BufferAttribute(at.array.slice(gr.start * at.itemSize, (gr.start + gr.count) * at.itemSize), at.itemSize)); }
    out[gr.materialIndex] = g;
  }
  return out;
}
export function buildCity(parent, data) {
  const { S, gap, depth, from, to } = CITY, r = mulberry(2015), roofs = [], walls = [[], [], [], [], [], []];
  const tr = (x, y) => new THREE.Vector2(y / S, -(REAR - .3) + (-x - gap) / S);   // 形状坐标：sx = 北（模型 x），sy = 西（模型 −z）
  let n = 0;
  for (const b of data.buildings) {
    const p = b.p, xs = p.filter((_, i) => i % 2 === 0), ys = p.filter((_, i) => i % 2 === 1);
    const cx = xs.reduce((a, v) => a + v, 0) / xs.length, cy = ys.reduce((a, v) => a + v, 0) / ys.length;
    if (cx > -gap - 5 || cx < -depth || cy < from || cy > to) continue;
    if (Math.min(...xs) < -gap - depth - 40 || Math.max(...xs) > -gap + 10) continue;
    const batch = Math.floor(r() * 6), ou = r() * 4;
    for (const pt of (b.parts && b.parts.length ? b.parts : [b])) {
      const h = Math.max(4, pt.h - (pt.b || 0)); if (h < 1) continue;
      const pts = []; for (let i = 0; i < pt.p.length - 2; i += 2) pts.push(tr(pt.p[i], pt.p[i + 1]));
      if (pts.length < 3) continue;
      const shape = new THREE.Shape(pts);
      for (const q of pt.q || []) { const hp = []; for (let i = 0; i < q.length - 2; i += 2) hp.push(tr(q[i], q[i + 1])); shape.holes.push(new THREE.Path(hp)); }
      const geo = new THREE.ExtrudeGeometry(shape, { depth: h / S, bevelEnabled: false, steps: 1 }); geo.rotateX(-PI / 2); geo.translate(0, (pt.b || 0) / S, 0);
      const [cap, side] = split(geo); geo.dispose();
      const uv = side.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) + ou);
      roofs.push(cap); walls[batch].push(side); n++;
    }
  }
  const { ta, te } = windowTex(), mats = [];
  const roof = new THREE.Mesh(mergeGeometries(roofs), mat('#eeeee8', .8)); roof.castShadow = roof.receiveShadow = true; parent.add(roof);
  walls.forEach((ws, i) => {
    if (!ws.length) return;
    const m = new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: ta, emissive: '#ffffff', emissiveMap: te, emissiveIntensity: 0, roughness: .62, clearcoat: .15, envMapIntensity: .6 });
    const mesh = new THREE.Mesh(mergeGeometries(ws), m); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); mats.push(m);
  });
  return { mats, count: n };
}

// ---------- 车站截面 ----------
export function createModel(cityData) {
  reseed(1915);
  const root = new THREE.Group(), floors = {}, walkers = [], escal = [], lights = [];
  for (const k of ['platform', 'metro', 'ground']) { const g = new THREE.Group(); g.position.y = LEVEL[k]; root.add(g); floors[k] = g; }
  const earth = earthMat();
  const slab = (g) => box(g, HALF * 2, .24, FRONT * 2, 0, -.13, 0, stone);
  const strip = (g, x, y, z) => box(g, 2.3, .05, .15, x, y, z, glow('#fff2ce', '#ffe0a1', .35, 2.4), false);
  function frame(g, h) {                          // 后墙、左墙、立柱、顶灯
    box(g, HALF * 2, h, .28, 0, h / 2, REAR, silver); box(g, .28, h, FRONT * 2, -HALF, h / 2, 0, silver);
    for (const x of [-8, 8]) { cylinder(g, .14, h, x, h / 2, 6.1, ivory, .17, 12); cylinder(g, .14, h, x, h / 2, -4.8, ivory, .17, 12); }
    for (const x of [-7, 0, 7]) { strip(g, x, h - .15, 4); strip(g, x, h - .15, -3); }
    for (const y of [.7, 1.4, 2.1, 2.8]) box(g, HALF * 2 - .1, .012, .015, 0, y, REAR + .155, '#aebbb6', false);
  }
  const crowd = (g, pos, colors, opt) => pos.forEach(([x, z], i) => walkers.push(person(g, x, z, colors[i % colors.length], { moving: i % 3 !== 0, ...opt })));
  function point(g, x, y, z) { const l = new THREE.PointLight('#ffe2ad', 0, 16, 2); l.position.set(x, y, z); g.add(l); lights.push(l); }

  // ===== 上层：地面 =====
  const g = floors.ground;
  const sh = new THREE.Shape(); sh.moveTo(-HALF, -FRONT); sh.lineTo(HALF, -FRONT); sh.lineTo(HALF, FRONT); sh.lineTo(-HALF, FRONT); sh.closePath();
  const hole = new THREE.Path(); hole.moveTo(-3, -3.5); hole.lineTo(-3, 3.6); hole.lineTo(7, 3.6); hole.lineTo(7, -3.5); hole.closePath(); sh.holes.push(hole);
  const gg = new THREE.ExtrudeGeometry(sh, { depth: .24, bevelEnabled: true, bevelSize: .025, bevelThickness: .015, bevelSegments: 3 }); gg.rotateX(-PI / 2);
  const gs = new THREE.Mesh(gg, stone); gs.position.y = -.24; gs.castShadow = gs.receiveShadow = true; g.add(gs);
  box(g, HALF * 2, .24, REAR - BACK, 0, -.12, (REAR + BACK) / 2, stone);                       // 后面的城市地块
  // 下沉广场与站口：一圈矮的银灰体量，站名红字
  box(g, 10, .2, 7.1, 2, -1.68, .05, stone);
  box(g, 12.2, 2.25, 2.1, 2, -.45, -4.65, silver); box(g, 12.45, .14, 2.25, 2, .75, -4.65, '#dce0d6');
  for (const x of [-4.0, 7.9]) box(g, .43, 2.35, .48, x, -.42, -3.45, silver);
  box(g, 12, 1.0, .09, 2, 1.25, -3.65, '#dce1db');
  label(g, '福田站', 4.2, .78, 2, 1.28, -3.59, '#a52d28', 'transparent', 96, { weight: 700 });
  box(g, 10.9, 1.35, .04, 2, -.83, -3.57, dark); box(g, 11.4, .14, 1.6, 2, -.05, -2.95, steel);
  for (let x = -3.1; x <= 7.2; x += 1.1) { box(g, .055, 1.28, .09, x, -.85, -3.51, steel); box(g, .96, 1.22, .025, x + .5, -.85, -3.49, glass); }
  for (let x = -3.4; x < 7.5; x += 1.1) box(g, .7, .5, .03, x + .5, -.95, -3.6, glow('#c5ae75', '#f9c871', .1, 1.6), false);   // 门厅里的暖光
  label(g, '高铁  ·  地铁', 4.2, .3, 2, -.35, -3.44, '#edf0e2', '#294a5e', 32, { glow: 1.0 });
  const plaza = new THREE.Group(); plaza.position.y = -1.55; g.add(plaza);
  stairs(plaza, 2.1, 3.3, 2.4, 1.55, 3.4);
  crowd(plaza, [[-1, 0], [5, 1], [.5, 1.6], [3.4, -1.6]], ['#6e8791', '#b99169', '#6d7f59']);
  whiteExit(g, 9.6, -.4, '地铁  ·  高铁');
  // 公交：沿前切面一条路，车从左端切面里开出来，停在站台，再往右开走
  box(g, HALF * 2, .02, 1.9, 0, .02, 5.35, '#84918a');
  for (let x = -12; x < 12.4; x += 1.4) box(g, .65, .012, .045, x, .036, 5.35, '#e2d9b6', false);
  box(g, 5.3, .12, 1.5, -7.2, 2.15, 3.35, silver); for (const x of [-9.6, -4.8]) box(g, .055, 2.1, .055, x, 1.05, 3.4, steel);
  box(g, 5.0, 1.55, .025, -7.2, 1.02, 2.7, glass); label(g, '公交  BUS', 2.6, .4, -7.2, 1.75, 2.74, '#f1f1df', '#59765c', 40, { glow: .9 }); bench(g, -7.2, 3.2);
  const bus = cityBus(g, -7.4, 5.35); clipX(bus, HALF - .05);
  for (const x of [-10.8, -3.6, 10.9]) lightPole(g, x, 4.25);
  // 绿化、座椅、导览
  for (const [x, z, s] of [[-10.6, -1.2, .9], [-9.8, -5.0, 1.0], [10.6, -4.8, 1.0], [11.1, 2.3, .8], [-5.6, 1.5, .7]]) tree(g, x, z, s);
  plantBox(g, -5.4, -3.9, 2.8, .7); plantBox(g, -4.5, -1.0, .8, 2.0); plantBox(g, 9.9, 2.6, 1.4, .6);
  bench(g, -8.4, .3); info(g, -4.6, 2.4, '站区导览'); bin(g, -4.0, 3.5); bin(g, 11.6, 3.6);
  crowd(g, [[-7.6, 3.6], [-6.4, 3.75], [-8.6, 3.7], [-10, -2.6], [-1.8, 4.1], [8.4, 3.0], [9.7, -3.0], [-6.9, -.8], [4.4, 4.1]], ['#4f798d', '#ba8558', '#6c8c56', '#b56959']);
  // 车站和楼群之间的一条街（益田路），把截面和背景城市隔开
  box(g, HALF * 2, .025, .9, 0, .02, -7.35, '#8b9992'); for (let x = -12; x < 12.4; x += 2) box(g, .8, .012, .04, x, .04, -7.35, '#ddd7b5', false);
  for (let x = -11.5; x < 12; x += 2.6) tree(g, x, -8.2, .55);
  const city = buildCity(g, cityData);

  // ===== 中层：地铁 =====
  const m = floors.metro; slab(m); frame(m, 3.75);
  box(m, HALF * 2, 4.01, REAR - BACK - .3, 0, 1.755, (REAR - .15 + BACK) / 2, earth);
  box(m, HALF * 2 - .4, .06, 1.8, 0, .025, 1.6, '#78837b'); for (let x = -12.3; x < 12.4; x += .52) box(m, .15, .06, 1.65, x, .11, 1.6, '#525e57', false);
  for (const z of [1.05, 2.15]) box(m, HALF * 2, .06, .06, 0, .18, z, steel, false);
  box(m, 23, .24, 3.8, 0, .15, 4.5, '#d8d9c8'); box(m, 23, .014, .13, 0, .28, 2.75, '#d6b357', false);
  const metro = metroTrain(m, LINE[2], -1.5, 1.6); metro.scale.x = .88; clipX(metro, HALF - .05);
  label(m, '福田站  FUTIAN', 4.0, .5, -5.4, 2.7, 5.6, '#f2f1dd', '#2c4d60', 45, { glow: .8 });
  [['2', LINE[2]], ['3', LINE[3]], ['11', LINE[11]]].forEach(([n, c], i) => label(m, n, .62, .5, -2.6 + i * .72, 2.7, 5.6, '#ffffff', c, 60, { weight: 700 }));
  for (const x of [-5.4, -1.9]) box(m, .025, .9, .025, x, 3.3, 5.6, metal, false);
  const mf = new THREE.Group(); mf.position.y = .28; m.add(mf);
  for (const x of [-8.2, 4.5]) bench(mf, x, 5.1, 0, true);
  info(mf, 9.5, 4.8, '换乘指引'); bin(mf, 6.4, 5.3); plantBox(mf, -10.6, 5.0, 1.1, .65);
  crowd(mf, [[-9.2, 4.1], [-6.4, 4.6], [-1.8, 4.1], [.2, 5.1], [2.3, 4.0], [7.4, 4.0], [9.6, 3.4], [-3.6, 5.2]], ['#4e8198', '#c18e5f', '#5d7e54', '#b56856']);
  escal.push({ g: escalators(m, 13.2, 4.5, 4.0), rise: 4.0, k: 'metro' });
  point(m, -6, 3.0, 3.6); point(m, 6, 3.0, 3.6);

  // ===== 下层：高铁 =====
  const p = floors.platform; slab(p); frame(p, 3.95);
  box(p, HALF * 2, 4.2, REAR - BACK - .3, 0, 1.85, (REAR - .15 + BACK) / 2, earth);
  box(p, HALF * 2 + .2, .5, FRONT - BACK, 0, -.48, (FRONT + BACK) / 2, earth);
  box(p, HALF * 2 - .1, .035, 2.4, 0, .035, 1.6, '#707d75'); for (let x = -12.3; x < 12.5; x += .45) box(p, .14, .07, 2.1, x, .12, 1.6, '#4c5853', false);
  for (const z of [.98, 2.22]) box(p, HALF * 2, .07, .07, 0, .2, z, mat('#87928d', .3, .8), false);
  box(p, 23, .25, 3.8, 0, .18, 4.5, '#d5d7c6'); box(p, 23, .014, .13, 0, .315, 2.75, '#d9b650', false);
  const hsr = hsrTrain(p, 1.6); hsr.scale.x = .65; hsr.position.x = -1.7; clipX(hsr, HALF - .05);
  label(p, '福田站  FUTIAN', 4.0, .5, 5.4, 2.75, 5.6, '#f1f1dd', '#2c4d60', 45, { glow: .8 });
  for (const x of [3.6, 7.2]) box(p, .025, .9, .025, x, 3.4, 5.6, metal, false);
  const pf = new THREE.Group(); pf.position.y = .315; p.add(pf);
  bench(pf, 4.6, 5.1, 0, true); bench(pf, -6.8, 5.1, 0, true);
  info(pf, 9.6, 4.7, '站台服务'); bin(pf, 6.3, 5.25); plantBox(pf, -10.6, 5.0, 1.1, .65);
  crowd(pf, [[-9.4, 4.1], [-5.5, 4.5], [-1.7, 4.0], [.2, 5.1], [2.6, 4.2], [7.5, 4.0], [9.7, 3.3], [-3.2, 5.2]], ['#4e7f98', '#c28f5e', '#5a7e55', '#b76956']);
  escal.push({ g: escalators(p, 13.2, 4.5, 4.2), rise: 4.2, k: 'platform' });
  point(p, -6, 3.2, 3.6); point(p, 6, 3.2, 3.6);

  // ===== 展示底座：深色薄台，上面一层浅色压边 =====
  const base = new THREE.Group(); root.add(base);
  const bx0 = -HALF - .6, bx1 = 14.6, bz0 = BACK - .5, bz1 = FRONT + .8, bw = bx1 - bx0, bd = bz1 - bz0, bxc = (bx0 + bx1) / 2, bzc = (bz0 + bz1) / 2;
  box(base, bw, .35, bd, bxc, -4.34, bzc, mat('#53686b', .34, .6));
  box(base, bw - .2, .045, bd - .2, bxc, -4.14, bzc, mat('#afbab8', .32, .65));
  label(base, 'FUTIAN  ·  SHENZHEN', 4.2, .15, bxc + 6, -4.33, bz1 + .005, '#d9e3de', 'transparent', 30);

  // 静态构件按材质合并（小人、车、扶梯、楼群另算），帧率靠它
  root.updateMatrixWorld(true);
  const keep = new Set([bus, metro, hsr, ...escal.map(e => e.g), ...walkers.map(w => w.p)]);
  for (const fl of [...Object.values(floors), base]) {
    const inv = fl.matrixWorld.clone().invert(), buckets = new Map();
    fl.traverse(o => {
      if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material)) return;
      for (let q = o; q && q !== fl; q = q.parent) if (keep.has(q)) return;
      if (o.material.map && !o.material.bumpMap) return;                       // 标牌各自一张贴图，不合并
      const key = `${o.material.uuid}-${o.castShadow}`; if (!buckets.has(key)) buckets.set(key, { m: o.material, cast: o.castShadow, geos: [], objs: [] });
      const b = buckets.get(key), geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      if (!geo.attributes.uv) return;
      b.geos.push(geo.applyMatrix4(inv.clone().multiply(o.matrixWorld))); b.objs.push(o);
    });
    for (const b of buckets.values()) {
      if (b.objs.length < 2) continue;
      const geo = mergeGeometries(b.geos.map(x => { for (const k of Object.keys(x.attributes)) if (!['position', 'normal', 'uv'].includes(k)) x.deleteAttribute(k); return x; }), false);
      if (!geo) continue;
      const mesh = new THREE.Mesh(geo, b.m); mesh.castShadow = b.cast; mesh.receiveShadow = true; fl.add(mesh); b.objs.forEach(o => o.removeFromParent());
    }
  }
  return { root, floors, walkers, escal, lights, bus, metro, hsr, city, base };
}
