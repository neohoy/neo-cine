// 南山：深圳湾——海面、深圳湾大桥、滨海长廊的棕榈、春茧（深圳湾体育中心）、春笋（华润总部）、人才公园、腾讯滨海大厦
// 后海这一排楼做成四扇屏风，可以像折纸一样折成之字
import * as THREE from 'three';
import { mulberry } from '/core/lib.js';
import { M, U, facade, boxGeo, cylGeo, latheGeo, mesh, grp, flat, blk, cyl, beam, bld, tree, palm, car, bus, lamp, zebra, dashes, fill, cloud, CARS, PI, TAU } from './kit.js';

export const NANSHAN = {
  sky: '#ffc21a', amb: [.56, .6, .92], ink: 0,
  ground: '#fff3d6', road: '#5e6fc4', walk: '#ffffff', lawn: '#2fc98a', sea: '#1f5bff', sand: '#ffe3a6', slab: '#ffffff',
};
const C = NANSHAN;
const HEMI = new THREE.SphereGeometry(1, 56, 18, 0, TAU, 0, PI / 2);

export function buildNanshan() {
  const P = grp(); const anim = [];
  const T = {
    white: facade({ wall: '#ffffff', glass: '#1746c8', alt: '#ffd24a', seed: 81, fw: .6, fh: .56, line: '#e3e8ff' }),
    mint: facade({ type: 'band', wall: '#e6fbf3', glass: '#12a89e', alt: '#7fe0d2', seed: 82, fw: .9, fh: .52 }),
    teal: facade({ type: 'rib', wall: '#d5f7f0', glass: '#12a89e', alt: '#3cc7bc', altP: .3, seed: 83, fw: .82, line: '#0e8f86' }),
    blue: facade({ type: 'rib', wall: '#ffffff', glass: '#1746c8', alt: '#2f62e6', altP: .3, seed: 84, fw: .82, line: '#123aa8' }),
    sky: facade({ type: 'rib', wall: '#ffffff', glass: '#5aa2ff', alt: '#8fc0ff', altP: .3, seed: 85, fw: .72 }),
    coral: facade({ type: 'glass', glass: '#ff6a55', alt: '#ff8d7b', altP: .35, seed: 86, line: '#e85542' }),
    tx: facade({ type: 'band', wall: '#dfe8ff', glass: '#2456e8', alt: '#5a86ff', altP: .28, seed: 87, fw: .92, fh: .62 }),
    cream: facade({ wall: '#fff6e0', glass: '#1746c8', alt: '#ff6a55', altP: .12, seed: 88, fw: .56, fh: .58 }),
  };
  const low = [T.white, T.mint, T.cream, T.white], roofs = ['#ffffff', '#e6fbf3', '#fff6e0', '#e3e8ff'];

  blk(P, 600, 6, 700, C.ground, 0, -6, -350, false);
  // ---- 海 ----
  flat(P, 600, 205, C.sea, 0, -102.5, .03);
  { const R = mulberry(3); for (let k = 0; k < 90; k++) { const len = 10 + R() * 26, z = -6 - R() * 192, x0 = (R() - .5) * 640, sp = 2 + R() * 3, m = flat(P, len, .9, k % 3 ? '#4f86ff' : '#ffffff', x0, z, .06, false); anim.push(t => { m.position.x = ((x0 + sp * t + 320) % 640) - 320; }); } }
  const boat = (x0, z, col, sp) => {
    const q = grp(x0, 0, z); P.add(q); blk(q, 8, 1.1, 2.6, '#ffffff', 0, .1, 0); cyl(q, .12, 9.5, '#ffffff', .4, 1.2, 0);
    const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(4.6, 0); s.lineTo(0, 8); s.closePath();
    const m = mesh(new THREE.ExtrudeGeometry(s, { depth: .12, bevelEnabled: false }), M(col, null, { side: THREE.DoubleSide }), .7, 1.9, 0); q.add(m);
    const s2 = new THREE.Shape(); s2.moveTo(0, 0); s2.lineTo(-3, 0); s2.lineTo(0, 6); s2.closePath(); q.add(mesh(new THREE.ExtrudeGeometry(s2, { depth: .12, bevelEnabled: false }), M('#ffffff', null, { side: THREE.DoubleSide }), .1, 1.9, 0));
    anim.push(t => { q.position.x = ((x0 + sp * t + 320) % 640) - 320; q.rotation.z = Math.sin(t * 1.3 + x0) * .04; });
  };
  boat(-60, -150, '#ff6a55', 3.2); boat(120, -118, '#ffffff', 2.4); boat(215, -172, '#ffd24a', 2.9); boat(-240, -176, '#ffffff', 2.1); boat(30, -30, '#ff6a55', 1.8);
  // ---- 深圳湾大桥：一根斜塔，两侧拉索 ----
  const br = grp(-128, 0, -64); P.add(br);
  blk(br, 345, 1.5, 12, '#ffffff', 0, 11, 0); blk(br, 345, .9, .5, '#e3e8ff', 0, 12.5, 6); blk(br, 345, .9, .5, '#e3e8ff', 0, 12.5, -6);
  for (let x = -160; x <= 160; x += 32) blk(br, 3, 11, 8, '#ffffff', x, 0, 0);
  beam(br, [-34, 12.5, 0], [-6, 86, 0], 4.6, '#ffffff');
  for (let k = 1; k <= 7; k++) { const yk = 40 + k * 6, xk = -34 + (yk - 12.5) * .381; beam(br, [xk, yk, 0], [-42 - k * 17, 12.6, 0], .42, '#ffffff'); beam(br, [xk, yk, 0], [xk + 8 + k * 19, 12.6, 0], .42, '#ffffff'); }
  // ---- 岸线 ----
  blk(P, 600, 1.3, 3.2, '#ffffff', 0, 0, -206.6, false); flat(P, 600, 22, C.sand, 0, -219, .04);
  for (let x = -290; x < 300; x += 15.5) palm(P, x, -213 - ((x * 13) % 5 + 5) % 5, 1.05, 7);
  flat(P, 600, 14, C.road, 0, -239); dashes(P, -300, 300, -239, '#ffffff'); blk(P, 600, .22, 4, C.walk, 0, 0, -248, false);
  for (let x = -280; x < 300; x += 34) lamp(P, x, -230.6, -PI / 2, 9);
  // ---- 春茧：白色网壳 ----
  const lat = facade({ type: 'lattice', wall: '#ffffff', glass: '#12a89e', alt: '#5aa2ff', altP: .2, seed: 91, fw: .62 });
  const cocoon = (x, z, rx, ry, rz, ru, rv) => {
    const ge = HEMI.clone(), uv = ge.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ru / 8, uv.getY(i) * rv / 8);
    const m = mesh(ge, M('#ffffff', lat), x, 0, z); m.scale.set(rx, ry, rz); P.add(m);
    const r = mesh(new THREE.CylinderGeometry(1, 1, 1, 56), M('#ffffff'), x, 0, z); r.scale.set(rx + 2.5, 2.2, rz + 2.5); r.position.y = 1.1; P.add(r);
  };
  cocoon(-196, -292, 82, 30, 40, 44, 24); cocoon(-110, -300, 30, 16, 24, 20, 12);
  flat(P, 250, 86, '#ffffff', -175, -294, .035);
  // ---- 人才公园 ----
  flat(P, 318, 74, C.lawn, 128, -290, .04); flat(P, 120, 30, C.sea, 96, -292, .07); flat(P, 60, 22, C.sea, 166, -282, .07); flat(P, 318, 4, '#ffffff', 128, -253, .06);
  blk(P, 4, .6, 34, '#ffffff', 120, .3, -292, false);
  { const R = mulberry(31); for (let k = 0; k < 34; k++) { const x = -26 + R() * 312, z = -256 - R() * 68; if (Math.abs(x - 110) < 78 && Math.abs(z + 290) < 22) continue; (k % 4 === 0 ? palm : tree)(P, x, z, .9 + R() * .5, '#2fc98a', '#1fa878', k % 4 === 0 ? '#c9a27a' : '#5a5fb8', k); } }

  // ---- 后海屏风：四扇，每扇一栋楼 ----
  const PW = 100, PD = 62, panels = [];
  flat(P, 420, 142, '#fff8e6', 0, -400, .02); for (let k = 0; k < 9; k++) flat(P, 420, 2.2, '#ffe9bd', 0, -338 - k * 16, .04);
  let par = P;
  for (let i = 0; i < 4; i++) {
    const q = grp(i ? PW : -200, 0, i ? 0 : -336); par.add(q); panels.push(q); par = q;
    blk(q, PW, .5, PD, C.slab, PW / 2, 0, -PD / 2, false); blk(q, PW - 8, .12, 6, C.lawn, PW / 2, .5, -6, false);
    for (let k = 0; k < 4; k++) palm(q, 14 + k * 24, -6, .95, 20 + i * 4 + k);
  }
  const ptw = (i, w, h, d, tex, top, seed, crown) => bld(panels[i], { x: PW / 2, z: -32, y: .5, w, d, h, tex, top, seed, roof: '#ffffff', crown, base: '#1746c8', baseH: 7, cw: 3, ch: 3.6 });
  ptw(0, 34, 150, 30, T.teal, 'crown', 1, '#12a89e'); ptw(2, 36, 178, 32, T.blue, 'step', 2); ptw(3, 34, 126, 30, T.coral, 'mast', 3);
  { // 春笋
    const Hh = 236, prof = []; for (let k = 0; k <= 30; k++) { const y = Hh * k / 30; prof.push([Math.max(.4, 27 * Math.pow(1 - Math.pow(y / Hh, 2.5), .62)), y]); }
    const q = grp(PW / 2, .5, -32); panels[1].add(q);
    q.add(mesh(latheGeo(prof, 56, 56, 64, 8), M('#ffffff', T.sky))); cyl(q, .5, 9, '#ffffff', 0, Hh - 1, 0); cyl(q, 31, 5, '#e3e8ff', 0, 0, 0);
  }
  // ---- 腾讯滨海大厦：两栋楼，三道连廊 ----
  const tx = grp(255, 0, -440); P.add(tx);
  tx.add(mesh(boxGeo(28, 188, 30, 3.5, 3.6, 8, 11), M('#ffffff', T.tx), -23, 0, 0)); blk(tx, 29, .8, 31, '#ffffff', -23, 188, 0); blk(tx, 14, 6, 14, '#dfe8ff', -23, 188.8, 0);
  tx.add(mesh(boxGeo(28, 150, 30, 3.5, 3.6, 8, 12), M('#ffffff', T.tx), 23, 0, 0)); blk(tx, 29, .8, 31, '#ffffff', 23, 150, 0); blk(tx, 14, 5, 14, '#dfe8ff', 23, 150.8, 0);
  for (const [y, c] of [[36, '#ff6a55'], [86, '#ffffff'], [132, '#12a89e']]) blk(tx, 22, 13, 33, c, 0, y, 0);
  blk(tx, 80, 8, 38, '#dfe8ff', 0, 0, 0); blk(tx, 81, .8, 39, '#ffffff', 0, 8, 0);
  // 科技园一条街
  flat(P, 14, 454, C.road, 205, -473, .035); dashes(P, -700, -250, 205, '#ffffff', false);
  for (let z = -262; z > -690; z -= 17) { palm(P, 214.5, z, 1, 40); if (z < -470 || z > -410) palm(P, 195.5, z - 8, 1, 41); }
  // ---- 后方：科技园 ----
  fill(P, -300, 196, -484, -700, { cell: 48, gap: 12, hmin: 22, hmax: 70, texs: [T.white, T.mint, T.teal, T.blue, T.cream, T.sky], roofs, seed: 31, base: '#1746c8', tall: .16, tallH: 120 });
  fill(P, 214, 300, -520, -700, { cell: 43, gap: 10, hmin: 22, hmax: 60, texs: low, roofs, seed: 32, base: '#1746c8' });
  flat(P, 84, 70, C.lawn, 257, -360, .04); for (const [x, z] of [[228, -340], [250, -372], [276, -344], [290, -378], [236, -386]]) tree(P, x, z, 1.2, '#2fc98a', '#1fa878', '#5a5fb8', x);
  fill(P, -300, -212, -340, -470, { cell: 43, gap: 10, hmin: 18, hmax: 56, texs: low, roofs, seed: 34, base: '#1746c8' });
  cloud(P, -210, 262, -694, 1.5, '#ffffff', 6); cloud(P, 60, 300, -694, 1.1, '#ffffff', 7); cloud(P, 205, 236, -694, .9, '#ffffff', 8);

  // ---- 车 ----
  const R = mulberry(27);
  const lane = (par2, axis, fixed, a, b, dir, n, speed, y = .05) => {
    for (let k = 0; k < n; k++) {
      const isBus = R() < .14, c = isBus ? bus(par2, ['#ff6a55', '#ffd24a', '#ffffff'][k % 3]) : car(par2, CARS[Math.floor(R() * CARS.length)]);
      const ph = (k + R() * .6) / n * (b - a), sp = speed * (.9 + R() * .2);
      c.rotation.y = axis === 'x' ? (dir > 0 ? 0 : PI) : (dir > 0 ? PI / 2 : -PI / 2);
      anim.push(t => { const s = (ph + sp * t) % (b - a), v = dir > 0 ? a + s : b - s; if (axis === 'x') c.position.set(v, y, fixed); else c.position.set(fixed, y, -v); });
    }
  };
  lane(P, 'x', -235.6, -300, 300, 1, 9, 14); lane(P, 'x', -242.4, -300, 300, -1, 9, 13);
  lane(br, 'x', 2.8, -170, 170, 1, 5, 16, 12.5); lane(br, 'x', -2.8, -170, 170, -1, 5, 15, 12.5);
  lane(P, 'z', 201.8, 250, 696, 1, 6, 11); lane(P, 'z', 208.2, 250, 696, -1, 6, 11);

  return {
    group: P,
    update(t, v) {
      for (const f of anim) f(t);
      const a = v.nanFold * 42 * PI / 180;
      panels[0].position.x = -200 * Math.cos(a); panels[0].rotation.y = a; panels[1].rotation.y = -2 * a; panels[2].rotation.y = 2 * a; panels[3].rotation.y = -2 * a;
    },
  };
}
