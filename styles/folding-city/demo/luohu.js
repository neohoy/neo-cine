// 罗湖：东门老街 → 国贸大厦；地王大厦、京基100 两排楼像门一样折进纵深
// 坐标：x 向右，y 向上，-z 向里。地块 x∈[-300,300]，z∈[0,-700]。
import * as THREE from 'three';
import { mulberry } from '/core/lib.js';
import { M, U, facade, boxGeo, cylGeo, posUV, mesh, grp, flat, blk, cyl, beam, bld, tree, palm, car, bus, lamp, zebra, dashes, fill, cloud, CARS, PI, TAU } from './kit.js';

export const LUOHU = {
  sky: '#f4502a', amb: [.60, .47, .74],
  ground: '#f6d9c6', road: '#5a4a86', walk: '#ffeedd', slab: '#ffe3d2', lawn: '#35c07a', water: '#2f6bff',
};
const C = LUOHU;

export function buildLuohu() {
  const P = grp(); const anim = [];
  // ---- 贴图 ----
  const T = {
    cream: facade({ wall: '#fff5e6', glass: '#3c3f8f', alt: '#ffd36b', seed: 1, fw: .56, fh: .58, line: '#f2cdb8' }),
    pink: facade({ wall: '#ffc7b8', glass: '#3c3f8f', alt: '#fff2c4', seed: 2, fw: .5, fh: .62 }),
    lilac: facade({ type: 'band', wall: '#ece3f5', glass: '#4a4fa8', alt: '#9fb4ff', seed: 3, fw: .9, fh: .5 }),
    white: facade({ wall: '#ffffff', glass: '#4a4fa8', alt: '#ffd36b', seed: 4, fw: .7, fh: .5, line: '#e7d6ee' }),
    teal: facade({ type: 'rib', wall: '#c9f2e3', glass: '#0f7c6c', alt: '#18a08a', altP: .3, seed: 5, fw: .82, line: '#0b6558' }),
    navy: facade({ type: 'rib', wall: '#c4ccff', glass: '#2b3a8c', alt: '#3d52c4', altP: .3, seed: 6, fw: .84, line: '#24307a' }),
    steel: facade({ type: 'rib', wall: '#ffffff', glass: '#7c86d9', alt: '#a9b4ff', altP: .3, seed: 7, fw: .7, line: '#6a73c4' }),
    plum: facade({ type: 'glass', glass: '#6b3f8f', alt: '#8a56b3', altP: .35, seed: 8, line: '#55307a' }),
    gm: facade({ type: 'rib', wall: '#ffffff', glass: '#3c3f8f', alt: '#5a5fc0', altP: .2, seed: 9, fw: .5, line: '#ffffff', lh: .12 }),
    mint: facade({ type: 'band', wall: '#ffffff', glass: '#19a890', alt: '#7fe0c8', seed: 10, fw: .88, fh: .55 }),
  };
  const low = [T.cream, T.pink, T.lilac, T.white, T.cream], roofs = ['#fff1e4', '#f4e4f2', '#ffe0d2', '#ffd0bf', '#e9dcf7', '#fff1e4'];

  // ---- 地面、路 ----
  blk(P, 600, 6, 700, C.ground, 0, -6, -350, false);
  flat(P, 600, 14, C.road, 0, -186);                       // 前街（东西向）
  dashes(P, -300, 300, -186, '#ffffff');
  blk(P, 600, .22, 5, C.walk, 0, 0, -195.5, false); blk(P, 600, .22, 5, C.walk, 0, 0, -176.5, false);
  flat(P, 24, 507, C.road, 0, -446.5);                     // 中央大道（南北向），折叠后变峡谷
  dashes(P, -690, -200, 0, '#ffffff', false);
  zebra(P, 0, -198.5, 22, 5, 9);
  zebra(P, -150, -186, 14, 12, 8, false);
  // 东门步行街
  flat(P, 16, 105, '#ffe9c9', -150, -250);
  for (let z = -204; z > -300; z -= 12) flat(P, 16, 1.2, '#ffcf8a', -150, z, .06, false);
  flat(P, 70, 44, '#ffe9c9', -150, -323);                  // 国贸前小广场

  // ---- 东门：临街骑楼（正面朝 +z）----
  const shop = (par, x, z, w, h, d, seed, ry = 0) => {
    const R = mulberry(seed * 7 + 1), q = bld(par, { x, z, w, d, h, tex: [T.cream, T.pink, T.white, T.cream][seed % 4], roof: roofs[seed % 6], seed, ry, base: '#3c3f8f', baseH: 4.2, ch: 3.4, cw: 3.2, top: R() < .6 ? 'units' : 'flat' });
    const ac = ['#ff5a3c', '#ffc93c', '#19c2a0', '#ffffff', '#ff8fb1', '#2f6bff'][Math.floor(R() * 6)];
    blk(q, w - .6, .32, 2.2, ac, 0, 4.0, d / 2 + .9);                        // 雨棚
    blk(q, w * (.5 + R() * .3), 1.5, .3, ['#ffffff', '#ffc93c', '#19c2a0', '#ff5a3c'][Math.floor(R() * 4)], (R() - .5) * w * .15, 5.0, d / 2 + .3);  // 招牌
    if (R() < .5) blk(q, 1.1, h * .45, .9, ['#ffc93c', '#19c2a0', '#ffffff'][Math.floor(R() * 3)], -w / 2 + 1.2, h * .42, d / 2 + .5);  // 竖招牌
    return q;
  };
  let sx = -262, i = 0; const Rs = mulberry(42);
  while (sx < -36) {
    const w = 9 + Math.floor(Rs() * 6), h = 11 + Math.floor(Rs() * 3) * 3.4;
    if (sx >= -159 && sx < -141) { sx = -141; continue; }                  // 步行街口
    const ww = (sx < -159 && sx + w > -159) ? (-159 - sx) : Math.min(w, -36 - sx);
    if (ww > 4) shop(P, sx + ww / 2, -207, ww - .4, h, 18, 10 + i++);
    sx += ww;
  }
  // 步行街两侧（正面朝街）
  for (let k = 0, z = -224; z > -296; k++) {
    const w = 9 + Math.floor(Rs() * 5), h = 11 + Math.floor(Rs() * 3) * 3.4;
    shop(P, -159 - 7, z - w / 2, w - .4, h, 14, 40 + k, PI / 2); shop(P, -141 + 7, z - w / 2, w - .4, 11 + Math.floor(Rs() * 3) * 3.4, 14, 60 + k, -PI / 2);
    z -= w;
  }
  // 横跨步行街的彩旗
  for (let z = -206, k = 0; z > -298; z -= 11, k++) {
    blk(P, 16, .08, .08, '#ffffff', -150, 10.2, z, false);
    for (let j = 0; j < 7; j++) blk(P, 1.1, 1.3, .08, ['#ffc93c', '#ffffff', '#19c2a0', '#ffffff', '#ff8fb1'][(j + k) % 5], -156.5 + j * 2.17, 8.9, z, false);
  }
  // 前街的树和灯
  for (let x = -280; x < 300; x += 26) { if (Math.abs(x + 150) < 14 || Math.abs(x) < 16) continue; tree(P, x, -195, 1.05, '#2fbf71', '#1f9d63', '#7a4a6c', 3); }
  for (let x = -267; x < 300; x += 26) { if (Math.abs(x + 150) < 12 || Math.abs(x) < 16) continue; lamp(P, x, -193.6, PI / 2, 8.5); }
  for (let z = -212; z > -690; z -= 24) { lamp(P, -13.5, z, 0); lamp(P, 13.5, z - 12, PI); }

  // ---- 国贸大厦：白色竖条方塔 + 顶上的旋转餐厅 ----
  const gm = grp(-150, 0, -372); P.add(gm);
  gm.add(mesh(boxGeo(64, 13, 44, 3.6, 4.3, 8, 77), M('#ffffff', T.white))); blk(gm, 65, .8, 45, '#fff1e4', 0, 13, 0);
  gm.add(mesh(boxGeo(33, 96, 33, 2.75, 3.4, 8, 78), M('#ffffff', T.gm), 0, 13.8, 0));
  blk(gm, 34, 1, 34, '#ffffff', 0, 109.8, 0); cyl(gm, 9, 4, '#ece3f5', 0, 110.8, 0);
  gm.add(mesh(cylGeo(21, 21, 6.2, 2.2, 6.2, 8), [M('#ffffff', facade({ type: 'band', wall: '#ffffff', glass: '#3c3f8f', alt: '#ffd36b', seed: 21, fw: .86, fh: .56 })), M('#fff1e4'), M('#ece3f5')], 0, 114.8, 0));
  cyl(gm, 22, .8, '#ffffff', 0, 121, 0); cyl(gm, 8, 2.4, '#fff1e4', 0, 121.8, 0); cyl(gm, .5, 16, '#ffffff', 0, 124, 0);

  // ---- 中层街区 ----
  const mid = { cell: 44, gap: 11, hmin: 16, hmax: 58, texs: [T.lilac, T.white, T.cream, T.mint, T.pink], roofs, seed: 5, base: '#3c3f8f' };
  fill(P, -300, -168, -232, -394, { ...mid, seed: 5, skip: (x, z) => x > -200 && z < -335 });
  fill(P, -132, -30, -232, -330, { ...mid, seed: 6 });
  fill(P, -112, -30, -336, -394, { ...mid, seed: 16, cell: 41, hmax: 40 });
  fill(P, 30, 300, -200, -244, { ...mid, seed: 7, cell: 44, hmax: 40 });
  fill(P, 172, 300, -244, -394, { ...mid, seed: 8 });
  fill(P, 30, 172, -350, -394, { ...mid, seed: 9, cell: 44, hmax: 46 });
  // 公园和湖
  flat(P, 132, 96, C.lawn, 101, -297); flat(P, 62, 40, C.water, 110, -300, .06); flat(P, 40, 24, C.water, 86, -288, .06);
  for (const [x, z, s] of [[44, -258, 1.3], [60, -332, 1.5], [82, -262, 1.1], [150, -262, 1.4], [158, -322, 1.2], [128, -336, 1.5], [100, -336, 1.1], [50, -296, 1.2], [160, -292, 1.3]]) tree(P, x, z, s, '#2fbf71', '#1f9d63', '#7a4a6c', 9);
  // 后方两角的矮街区（让开两排楼转动扫过的范围）
  const far = (x, z) => Math.hypot(Math.abs(x) - 22, z + 460) < 246;
  fill(P, -300, -30, -474, -700, { cell: 44, gap: 11, hmin: 9, hmax: 30, texs: low, roofs, seed: 11, skip: far });
  fill(P, 30, 300, -474, -700, { cell: 44, gap: 11, hmin: 9, hmax: 30, texs: low, roofs, seed: 12, skip: far });
  // 两排楼转动扫过的广场：两色铺地
  for (const s of [-1, 1]) { flat(P, 205, 222, '#ffe6d6', s * 127, -574, .02); for (let k = 0; k < 5; k++) flat(P, 205, 6, '#ffd3bf', s * 127, -480 - k * 44, .04); }

  // ---- 前场：铁路和站台 ----
  flat(P, 600, 62, '#e9c3b4', 0, -92);
  for (let k = 0; k < 4; k++) { flat(P, 600, 3.2, '#5a4a86', 0, -70 - k * 14, .05); flat(P, 600, .5, '#ffe9c9', 0, -70 - k * 14 - 1.1, .08, false); flat(P, 600, .5, '#ffe9c9', 0, -70 - k * 14 + 1.1, .08, false); }
  for (const z of [-77, -105]) { blk(P, 420, 1.1, 6, '#ffeedd', 40, 0, z, false); for (let x = -160; x <= 240; x += 20) cyl(P, .25, 4.6, '#ffffff', x, 1.1, z, false); blk(P, 420, .35, 8.4, '#ffffff', 40, 5.7, z); }
  const train = (z, col, stripe, speed, phase, dir) => {
    const q = grp(0, 0, z); P.add(q);
    for (let k = 0; k < 8; k++) { blk(q, 24.4, 3.5, 3.1, col, k * 25, .9, 0); blk(q, 22, 1, 3.16, '#27306e', k * 25, 2.5, 0); blk(q, 24.4, .45, 3.16, stripe, k * 25, 1.5, 0); }
    anim.push(t => { const s = ((phase + speed * t) % 1100 + 1100) % 1100 - 550; q.position.x = dir > 0 ? s - 90 : -s - 90; });
  };
  train(-70, '#ffffff', '#2f6bff', 34, 300, 1); train(-98, '#ffffff', '#ff5a3c', 27, 700, -1);
  flat(P, 600, 58, C.lawn, 0, -30); for (let x = -285; x < 300; x += 19) tree(P, x + (x % 3) * 2, -22 - ((x * 7) % 23 + 23) % 23, 1.1, '#2fbf71', '#1f9d63', '#7a4a6c', 5);
  flat(P, 600, 56, '#ffe6d6', 0, -146);                    // 站前广场
  for (let x = -270; x < 300; x += 30) palm(P, x, -121, 1, 4);

  // ---- 两排高楼（门扇）：合上是一字排开的天际线，打开是大道两侧的峡谷 ----
  const rowL = grp(-22, 0, -460), rowR = grp(22, 0, -460); P.add(rowL, rowR);
  blk(rowL, 200, .5, 60, C.slab, -100, 0, 30, false); blk(rowR, 200, .5, 60, C.slab, 100, 0, 30, false);
  // 地王大厦：墨绿玻璃板楼，两端圆筒，顶上双桅杆
  const dw = grp(-40, .5, 30); rowL.add(dw);
  dw.add(mesh(boxGeo(52, 200, 24, 2.6, 3.6, 8, 31), M('#ffffff', T.teal)));
  for (const s of [-1, 1]) {
    dw.add(mesh(cylGeo(9.5, 9.5, 214, 2.4, 3.6, 8), [M('#ffffff', facade({ type: 'band', wall: '#dff7ee', glass: '#0f7c6c', alt: '#18a08a', seed: 33, fw: .8, fh: .5 })), M('#dff7ee'), M('#dff7ee')], s * 26, 0, 4));
    cyl(dw, 5, 7, '#ffffff', s * 26, 214, 4); cyl(dw, 1.1, 46, '#ffffff', s * 26, 221, 4); cyl(dw, 2.2, 3, '#ffc93c', s * 26, 236, 4);
  }
  blk(dw, 53, 1, 25, '#dff7ee', 0, 200, 0); blk(dw, 30, 9, 14, '#0f7c6c', 0, 201, 0);
  blk(dw, 70, 16, 34, '#c9f2e3', 0, 0, 3); blk(dw, 71, 1, 35, '#ffffff', 0, 16, 3);
  // 京基100：细高，顶部是一道圆弧
  const kk = grp(34, .5, 30); rowR.add(kk);
  { const w = 44, h = 262, d = 30, s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h - 34);
    s.bezierCurveTo(w / 2, h - 8, w * .22, h, 0, h); s.bezierCurveTo(-w * .22, h, -w / 2, h - 8, -w / 2, h - 34); s.closePath();
    const ge = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 24 }); ge.translate(0, 0, -d / 2); posUV(ge, 2.75, 3.6, 8);
    kk.add(mesh(ge, M('#ffffff', T.navy))); blk(kk, 58, 18, 40, '#c4ccff', 0, 0, 2); blk(kk, 59, 1, 41, '#ffffff', 0, 18, 2); }
  // 其余
  const tw = (row, x, w, h, d, tex, top, seed, crown) => bld(row, { x, z: 30, y: .5, w, d, h, tex, top, seed, roof: '#fff1e4', crown, base: '#3c3f8f', baseH: 7, cw: 3, ch: 3.6 });
  tw(rowL, -96, 30, 128, 30, T.steel, 'crown', 51, '#7c86d9'); tw(rowL, -140, 42, 168, 34, T.navy, 'mast', 52); tw(rowL, -182, 28, 96, 30, T.plum, 'step', 53);
  tw(rowR, 84, 34, 176, 32, T.steel, 'step', 54); tw(rowR, 128, 36, 122, 34, T.teal, 'crown', 55, '#0f7c6c'); tw(rowR, 174, 34, 150, 30, T.plum, 'mast', 56);
  for (const [row, s] of [[rowL, -1], [rowR, 1]]) for (let k = 0; k < 7; k++) tree(row, s * (14 + k * 29), 62.5, .9, '#2fbf71', '#1f9d63', '#7a4a6c', k);

  // ---- 太阳 ----
  const sun = new THREE.Mesh(new THREE.CircleGeometry(74, 72), U('#ffe7b0')); sun.position.set(0, 132, -697); P.add(sun);
  cloud(P, -205, 236, -694, 1.5, '#ffd9c2', 1); cloud(P, 212, 196, -694, 1.2, '#ffd9c2', 2);

  // ---- 车 ----
  const R = mulberry(7);
  const lane = (axis, fixed, a, b, dir, n, speed, par = P, y = .05) => {
    for (let k = 0; k < n; k++) {
      const isBus = R() < .14, c = isBus ? bus(par, ['#19c2a0', '#ffc93c', '#ffffff'][k % 3]) : car(par, CARS[Math.floor(R() * CARS.length)]);
      const ph = (k + R() * .6) / n * (b - a), sp = speed * (.9 + R() * .2);
      c.rotation.y = axis === 'x' ? (dir > 0 ? 0 : PI) : (dir > 0 ? PI / 2 : -PI / 2);
      anim.push(t => { let s = (ph + sp * t) % (b - a); const v = dir > 0 ? a + s : b - s; if (axis === 'x') c.position.set(v, y, fixed); else c.position.set(fixed, y, -v); });
    }
  };
  lane('x', -182.6, -300, 300, 1, 9, 13); lane('x', -189.4, -300, 300, -1, 9, 12);
  lane('z', -5.5, 200, 690, 1, 9, 12); lane('z', 5.5, 200, 690, -1, 9, 13);     // 沿 z 的车：位置记成 -z

  return {
    group: P, sun, rowL, rowR,
    update(t, v) { for (const f of anim) f(t); rowL.rotation.y = -v.luoFold * PI / 2; rowR.rotation.y = v.luoFold * PI / 2; sun.scale.setScalar(v.luoSun); },
  };
}
