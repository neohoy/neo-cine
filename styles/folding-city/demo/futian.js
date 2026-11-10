// 福田：中轴线——深南大道、市民广场、市民中心（大鹏展翅的屋顶）、莲花山；两侧是 CBD，平安金融中心和深交所
import * as THREE from 'three';
import { mulberry } from '/core/lib.js';
import { M, U, facade, boxGeo, cylGeo, latheGeo, mesh, grp, flat, blk, cyl, beam, bld, tree, palm, car, bus, lamp, zebra, dashes, fill, cloud, CARS, PI, TAU } from './kit.js';

export const FUTIAN = {
  sky: '#1b49f5', amb: [.67, .67, .96],
  ground: '#eef1ff', road: '#7f86d9', walk: '#ffffff', lawn: '#35d07f', water: '#22b8e6',
};
const C = FUTIAN;
const SPH = new THREE.SphereGeometry(1, 40, 14, 0, TAU, 0, PI / 2);
const flatten = g => { const q = g.toNonIndexed(); q.computeVertexNormals(); return q; };

export function buildFutian() {
  const P = grp(); const anim = [];
  const T = {
    white: facade({ wall: '#ffffff', glass: '#2a3fb0', alt: '#ffd24a', seed: 41, fw: .6, fh: .56, line: '#dfe5ff' }),
    ice: facade({ type: 'band', wall: '#f3f6ff', glass: '#7fa8ff', alt: '#c3d8ff', seed: 42, fw: .9, fh: .52 }),
    cyan: facade({ type: 'rib', wall: '#ffffff', glass: '#22b8e6', alt: '#6fd6f5', altP: .3, seed: 43, fw: .8, line: '#1a9fd0' }),
    navy: facade({ type: 'rib', wall: '#cfd8ff', glass: '#1a2a8c', alt: '#2f44c0', altP: .3, seed: 44, fw: .84, line: '#16227a' }),
    pink: facade({ type: 'rib', wall: '#ffffff', glass: '#ff8fb1', alt: '#ffb5cb', altP: .3, seed: 45, fw: .78, line: '#f0749a' }),
    silver: facade({ type: 'rib', wall: '#ffffff', glass: '#aebcff', alt: '#d3daff', altP: .3, seed: 46, fw: .74, line: '#93a3f0' }),
    mint: facade({ type: 'glass', glass: '#27c79a', alt: '#5fe0bc', altP: .35, seed: 47, line: '#1fae86' }),
    sz: facade({ wall: '#e9ecff', glass: '#3a4ab8', alt: '#5d6fe0', altP: .3, seed: 48, fw: .74, fh: .74 }),
    yellow: facade({ wall: '#fff3c9', glass: '#2a3fb0', alt: '#ffd24a', seed: 49, fw: .55, fh: .6 }),
  };
  const low = [T.white, T.ice, T.yellow, T.white, T.ice], roofs = ['#ffffff', '#e6ebff', '#f6f1ff', '#dff7ee'];

  // ---- 地面 ----
  blk(P, 600, 6, 700, C.ground, 0, -6, -350, false);
  // 前场公园
  flat(P, 600, 146, C.lawn, 0, -73); flat(P, 600, 5, '#ffffff', 0, -74, .05); flat(P, 34, 146, '#ffffff', 0, -73, .05);
  for (const x of [-210, -105, 105, 210]) flat(P, 5, 146, '#ffffff', x, -73, .05);
  flat(P, 62, 30, C.water, -157, -38, .06); flat(P, 62, 30, C.water, 157, -38, .06); flat(P, 40, 22, C.water, -52, -112, .06); flat(P, 40, 22, C.water, 52, -112, .06);
  { const R = mulberry(5); for (let k = 0; k < 70; k++) { const x = (R() - .5) * 580, z = -6 - R() * 134; if (Math.abs(x) < 22 || Math.abs(z + 74) < 6 || [-210, -105, 105, 210].some(a => Math.abs(x - a) < 6)) continue; if ((Math.abs(Math.abs(x) - 157) < 36 && Math.abs(z + 38) < 20) || (Math.abs(Math.abs(x) - 52) < 25 && Math.abs(z + 112) < 16)) continue; tree(P, x, z, .9 + R() * .5, '#2fbf71', '#1fa565', '#5a4fa8', k); } }
  // 深南大道
  flat(P, 600, 30, C.road, 0, -165); blk(P, 600, .3, 3, C.lawn, 0, 0, -165, false);
  dashes(P, -300, 300, -157.5, '#ffffff'); dashes(P, -300, 300, -172.5, '#ffffff');
  for (let x = -290; x < 300; x += 20) tree(P, x, -165, .8, '#2fbf71', '#1fa565', '#5a4fa8', 2);
  blk(P, 600, .22, 4, C.walk, 0, 0, -148, false); blk(P, 600, .22, 4, C.walk, 0, 0, -182, false);
  for (let x = -280; x < 300; x += 40) { lamp(P, x, -148.5, -PI / 2, 10); lamp(P, x + 20, -181.5, PI / 2, 10); }
  zebra(P, 0, -165, 30, 30, 14, false);
  // 市民广场
  flat(P, 330, 32, '#ffffff', 0, -200, .04); for (let k = -5; k <= 5; k++) flat(P, 3, 32, '#dfe5ff', k * 30, -200, .06);
  for (const x of [-118, 118]) { flat(P, 46, 14, C.water, x, -197, .08); for (let k = -2; k <= 2; k++) cyl(P, .5, 2.6 + (2 - Math.abs(k)) * 1.2, '#ffffff', x + k * 8, 0, -197, false); }
  for (let k = -2; k <= 2; k++) { cyl(P, .22, 17, '#ffffff', k * 7, 0, -189, false); blk(P, 3.6, 2.2, .08, k === 0 ? '#ff4a5c' : '#ffd24a', k * 7 + 2, 14.4, -189, false); }
  blk(P, 150, 1.1, 8, '#ffffff', 0, 0, -217); blk(P, 140, 2.2, 6, '#ffffff', 0, 0, -220);

  // ---- 市民中心 ----
  const cc = grp(0, 0, -252); P.add(cc);
  blk(cc, 316, 3.2, 62, '#ffffff', 0, 0, 0);
  const roofY = x => 31 + 17 * Math.pow(Math.abs(x) / 158, 1.7);
  for (const s of [-1, 1]) {
    cc.add(mesh(boxGeo(98, 19, 44, 3.5, 4.75, 8, 71 + s), M('#ffffff', T.ice), s * 95, 3.2, 0)); blk(cc, 99, .7, 45, '#e6ebff', s * 95, 22.2, 0);
    for (let x = 50; x <= 152; x += 17) for (const z of [-27, 27]) cyl(cc, .7, roofY(x) - 3.2, '#ffffff', s * x, 3.2, z);
  }
  cc.add(mesh(boxGeo(27, 41, 27, 3.4, 3.4, 8, 73), M('#ffffff', facade({ wall: '#ff4a5c', glass: '#c02a44', alt: '#ffd24a', altP: .12, seed: 51, fw: .56, fh: .56 })), -22, 3.2, 0)); blk(cc, 28, .8, 28, '#ff7a86', -22, 44.2, 0);
  cc.add(mesh(cylGeo(13.5, 13.5, 41, 3, 3.4, 8), [M('#ffffff', facade({ type: 'band', wall: '#ffd24a', glass: '#f09a1a', alt: '#fff3c9', altP: .15, seed: 52, fw: .8, fh: .5 })), M('#ffe07a'), M('#ffe07a')], 22, 3.2, 0));
  { // 屋顶：一条中间低、两翼上扬的薄板
    const s = new THREE.Shape(), N = 48, xs = [...Array(N + 1)].map((_, i) => -160 + 320 * i / N);
    const th = x => 1 + 2.2 * (1 - Math.pow(Math.abs(x) / 160, 1.5));
    xs.forEach((x, i) => i ? s.lineTo(x, roofY(x) + th(x)) : s.moveTo(x, roofY(x) + th(x)));
    [...xs].reverse().forEach(x => s.lineTo(x, roofY(x)));
    s.closePath();
    const ge = new THREE.ExtrudeGeometry(s, { depth: 66, bevelEnabled: false }); ge.translate(0, 0, -33);
    cc.add(mesh(ge, M('#ffffff')));
    const s2 = new THREE.Shape(); xs.forEach((x, i) => i ? s2.lineTo(x, roofY(x) + th(x) + .9) : s2.moveTo(x, roofY(x) + th(x) + .9)); [...xs].reverse().forEach(x => s2.lineTo(x, roofY(x) + th(x)));
    const g2 = new THREE.ExtrudeGeometry(s2, { depth: 58, bevelEnabled: false }); g2.translate(0, 0, -29); cc.add(mesh(g2, M('#8fb0ff')));
  }

  // ---- 中轴绿带 ----
  flat(P, 150, 186, C.lawn, 0, -378); flat(P, 18, 186, '#ffffff', 0, -378, .05); flat(P, 150, 5, '#ffffff', 0, -330, .05); flat(P, 150, 5, '#ffffff', 0, -420, .05);
  for (const s of [-1, 1]) {
    bld(P, { x: s * 44, z: -306, w: 44, d: 26, h: 14, tex: T.ice, roof: '#ffffff', seed: 81 + s, top: 'flat', cw: 3.6, ch: 4.6 });
    cyl(P, 13, 9, s < 0 ? '#ff8fb1' : '#ffd24a', s * 44, 0, -375); cyl(P, 14, .7, '#ffffff', s * 44, 9, -375);
    for (let z = -292; z > -470; z -= 16) { if (Math.abs(z + 306) < 20 || Math.abs(z + 375) < 18) continue; tree(P, s * 14, z, .9, '#2fbf71', '#1fa565', '#5a4fa8', 3); tree(P, s * 66, z - 6, 1.1, '#2fbf71', '#1fa565', '#5a4fa8', 4); }
  }
  // ---- 莲花山 ----
  const hill = (x, z, rx, ry, rz, col) => { const m = mesh(SPH, M(col), x, 0, z, false); m.scale.set(rx, ry, rz); P.add(m); };
  hill(0, -588, 152, 66, 100, '#2fbf71'); hill(-118, -612, 86, 36, 66, '#27ad66'); hill(122, -618, 92, 40, 64, '#27ad66');
  { const R = mulberry(9); for (let k = 0; k < 90; k++) { const a = R() * TAU, r = Math.sqrt(R()) * .9, x = Math.cos(a) * r * 152, z = Math.sin(a) * r * 100, y = 66 * Math.sqrt(Math.max(0, 1 - r * r)); if (r < .2) continue; const m = mesh(new THREE.SphereGeometry(1, 10, 8), M(k % 3 ? '#1fa565' : '#3fd98a'), x, y + 1, z - 588); m.scale.set(4 + R() * 3, 3.4 + R() * 2, 4 + R() * 3); P.add(m); } }
  cyl(P, 17, 1.4, '#ffffff', 0, 65.4, -588); blk(P, 5, 5.5, 5, '#e6ebff', 0, 66.8, -588);
  cyl(P, 1.5, 7, '#2a2f7a', 0, 72.3, -588); { const m = mesh(new THREE.SphereGeometry(1.35, 12, 10), M('#2a2f7a'), 0, 80.4, -588); P.add(m); } blk(P, 3.4, 1, .9, '#2a2f7a', .8, 77, -587.4);
  for (let k = 0; k < 9; k++) flat(P, 9, 3, '#ffffff', 0, -494 - k * 9.6, 66 * Math.sqrt(Math.max(0, 1 - Math.pow((94 - k * 9.6) / 100, 2))) + .6, true).rotation.x = -.5;

  // ---- 路网 ----
  for (const s of [-1, 1]) {
    flat(P, 12, 290, C.road, s * 88, -327); dashes(P, -470, -184, s * 88, '#ffffff', false);
    flat(P, 206, 11, C.road, s * 197, -272); flat(P, 206, 11, C.road, s * 197, -372); dashes(P, s > 0 ? 96 : -300, s > 0 ? 300 : -96, -272, '#ffffff'); dashes(P, s > 0 ? 96 : -300, s > 0 ? 300 : -96, -372, '#ffffff');
    for (let z = -200; z > -470; z -= 22) tree(P, s * 97, z, .85, '#2fbf71', '#1fa565', '#5a4fa8', 6);
    flat(P, 206, 11, C.road, s * 197, -468);
  }

  // ---- CBD ----
  const tw = (x, z, w, d, h, tex, top, seed, crown) => bld(P, { x, z, w, d, h, tex, top, seed, roof: '#ffffff', crown, base: '#2a3fb0', baseH: 7, cw: 3, ch: 3.6 });
  tw(-125, -226, 34, 34, 150, T.cyan, 'step', 1); tw(-187, -230, 38, 30, 104, T.white, 'units', 2); tw(-252, -228, 36, 36, 132, T.pink, 'crown', 3, '#ff8fb1');
  tw(-118, -320, 36, 36, 176, T.navy, 'mast', 4); tw(-274, -322, 30, 40, 118, T.ice, 'units', 5);
  tw(-125, -418, 40, 34, 128, T.silver, 'crown', 6, '#aebcff'); tw(-196, -420, 34, 34, 196, T.cyan, 'mast', 7); tw(-263, -418, 38, 38, 150, T.white, 'step', 8);
  tw(138, -226, 36, 34, 138, T.navy, 'crown', 9, '#1a2a8c'); tw(262, -228, 36, 36, 150, T.cyan, 'step', 10);
  tw(120, -320, 34, 34, 160, T.ice, 'mast', 11);
  tw(125, -418, 38, 36, 186, T.silver, 'step', 12); tw(196, -422, 36, 36, 140, T.pink, 'crown', 13, '#ff8fb1'); tw(264, -418, 36, 36, 170, T.navy, 'mast', 14);
  bld(P, { x: 258, z: -320, w: 50, d: 62, h: 26, tex: T.ice, roof: '#ffffff', seed: 15, top: 'units', green: C.lawn, cw: 3.6, ch: 4.4 });
  // 平安金融中心：收分的方塔，四角石柱，底部人字撑，尖顶
  const pa = grp(196, 0, -320); P.add(pa);
  pa.add(mesh(flatten(latheGeo([[36.8, 0], [35.6, 56], [33.2, 140], [29.6, 238], [17, 259], [7, 271], [2.2, 277]], 4, 48, 70, 8, PI / 4)), M('#ffffff', T.silver)));
  cyl(pa, 1.2, 24, '#ffffff', 0, 276, 0);
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) beam(pa, [sx * 26.2, 0, sz * 26.2], [sx * 21, 238, sz * 21], 3.6, '#ffffff');
  for (const [ax, az] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) for (const s of [-1, 1]) {
    const a = ax ? [ax * 26.6, 0, s * 26] : [s * 26, 0, az * 26.6], b = ax ? [ax * 26.2, 50, 0] : [0, 50, az * 26.2]; beam(pa, a, b, 2.8, '#ffffff');
  }
  // 深交所：方塔腰上悬着一圈大平台
  const sz = grp(-198, 0, -320); P.add(sz);
  sz.add(mesh(boxGeo(42, 140, 42, 3.5, 3.5, 8, 61), M('#ffffff', T.sz))); blk(sz, 43, .8, 43, '#ffffff', 0, 140, 0); blk(sz, 18, 5, 18, '#e9ecff', 0, 140.8, 0);
  sz.add(mesh(boxGeo(84, 17, 70, 3.5, 4.25, 8, 62), M('#ffffff', T.sz), 0, 30, 0)); blk(sz, 85, .8, 71, '#ffffff', 0, 47, 0);
  for (const s of [-1, 1]) blk(sz, 18, .5, 56, C.lawn, s * 31, 47.8, 0, false);

  // ---- 后方住宅 ----
  fill(P, -300, -164, -484, -700, { cell: 44, gap: 11, hmin: 10, hmax: 34, texs: low, roofs, seed: 21 });
  fill(P, 164, 300, -484, -700, { cell: 44, gap: 11, hmin: 10, hmax: 34, texs: low, roofs, seed: 22 });
  cloud(P, -196, 252, -694, 1.5, '#ffffff', 3); cloud(P, 40, 300, -694, 1.1, '#ffffff', 4); cloud(P, 150, 215, -694, .9, '#ffffff', 5);

  // ---- 车 ----
  const R = mulberry(17);
  const lane = (axis, fixed, a, b, dir, n, speed) => {
    for (let k = 0; k < n; k++) {
      const isBus = R() < .14, c = isBus ? bus(P, ['#ff8fb1', '#ffd24a', '#ffffff'][k % 3]) : car(P, CARS[Math.floor(R() * CARS.length)]);
      const ph = (k + R() * .6) / n * (b - a), sp = speed * (.9 + R() * .2);
      c.rotation.y = axis === 'x' ? (dir > 0 ? 0 : PI) : (dir > 0 ? PI / 2 : -PI / 2);
      anim.push(t => { const s = (ph + sp * t) % (b - a), v = dir > 0 ? a + s : b - s; if (axis === 'x') c.position.set(v, .05, fixed); else c.position.set(fixed, .05, -v); });
    }
  };
  lane('x', -153.6, -300, 300, 1, 8, 15); lane('x', -160.6, -300, 300, 1, 7, 18); lane('x', -169.4, -300, 300, -1, 7, 18); lane('x', -176.4, -300, 300, -1, 8, 15);
  for (const s of [-1, 1]) { lane('z', s * 88 - 2.8, 184, 470, 1, 4, 11); lane('z', s * 88 + 2.8, 184, 470, -1, 4, 11); lane('x', -269.4, s > 0 ? 96 : -300, s > 0 ? 300 : -96, 1, 3, 10); lane('x', -374.6, s > 0 ? 96 : -300, s > 0 ? 300 : -96, -1, 3, 10); }

  return { group: P, update(t) { for (const f of anim) f(t); } };
}
