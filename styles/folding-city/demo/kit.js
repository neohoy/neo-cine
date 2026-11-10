// 折叠深圳 · 积木库：平涂材质、立面贴图、几何体、街道小件
// 画风：平涂矢量插画。亮面 = 本色，暗面和投影 = 本色 × 环境光色（偏紫），没有渐变，没有描边。
import * as THREE from 'three';
import { mulberry, hash } from '/core/lib.js';

THREE.ColorManagement.enabled = false;            // 颜色按写的十六进制原样出，不做线性转换
export const PI = Math.PI, TAU = PI * 2, D2R = PI / 180;

// ---------- 平涂：四档明度 ----------
const g = new Uint8Array(256);
for (let i = 0; i < 256; i++) { const d = (i + .5) / 256 * 2 - 1; g[i] = d < .03 ? 0 : d < .5 ? 140 : d < .64 ? 226 : 255; }
export const GRAD = new THREE.DataTexture(g, 256, 1, THREE.RedFormat);
GRAD.minFilter = GRAD.magFilter = THREE.NearestFilter; GRAD.needsUpdate = true;

const mc = new Map();
export function M(color, map = null, opt = {}) {
  const key = color + '|' + (map ? map.uuid : '') + '|' + JSON.stringify(opt);
  if (!mc.has(key)) mc.set(key, new THREE.MeshToonMaterial({ color, map, gradientMap: GRAD, ...opt }));
  return mc.get(key);
}
const uc = new Map();
export function U(color, opt = {}) {               // 不受光：太阳、云、路面标线
  const key = color + '|' + JSON.stringify(opt);
  if (!uc.has(key)) uc.set(key, new THREE.MeshBasicMaterial({ color, ...opt }));
  return uc.get(key);
}

// ---------- 立面贴图：n×n 个窗格，随机亮窗 ----------
const tc = new Map();
export function facade(o) {
  const k = JSON.stringify(o); if (tc.has(k)) return tc.get(k);
  const { type = 'grid', wall = '#ffffff', glass = '#2f5fd0', alt = null, altP = .22, n = 8, fw = .62, fh = .6, seed = 1, line = null, lh = .08, hi = 'rgba(255,255,255,.22)' } = o;
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
  const x2 = c.getContext('2d'), u = S / n, R = mulberry(seed * 977 + 13);
  x2.fillStyle = (type === 'rib' || type === 'glass') ? glass : wall; x2.fillRect(0, 0, S, S);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = i * u, y = j * u, a = alt && R() < altP;
    if (type === 'grid') {
      const w = u * fw, h = u * fh, wx = x + (u - w) / 2, wy = y + (u - h) / 2; x2.fillStyle = a ? alt : glass; x2.fillRect(wx, wy, w, h);
      if (!a && R() < .55) { const o = R() * .7; x2.save(); x2.beginPath(); x2.rect(wx, wy, w, h); x2.clip(); x2.fillStyle = hi; x2.beginPath();
        x2.moveTo(wx + w * (o + .25), wy); x2.lineTo(wx + w * (o + .6), wy); x2.lineTo(wx + w * (o + .1), wy + h); x2.lineTo(wx + w * (o - .25), wy + h); x2.closePath(); x2.fill(); x2.restore(); }
      if (line) { x2.fillStyle = line; x2.fillRect(x + (u - w) / 2 - u * .04, y + (u - h) / 2 + h, w + u * .08, u * lh); }
    } else if (type === 'band') {
      const h = u * fh; x2.fillStyle = a ? alt : glass; x2.fillRect(x, y + (u - h) / 2, u, h);
      if (!a && R() < .4) { const wy = y + (u - h) / 2, o = R() * .5; x2.fillStyle = hi; x2.beginPath(); x2.moveTo(x + u * (o + .35), wy); x2.lineTo(x + u * (o + .6), wy); x2.lineTo(x + u * (o + .25), wy + h); x2.lineTo(x + u * o, wy + h); x2.closePath(); x2.fill(); }
      x2.fillStyle = wall; x2.fillRect(x, y + (u - h) / 2, u * (1 - fw), h);
    } else if (type === 'rib') {
      if (a) { x2.fillStyle = alt; x2.fillRect(x, y, u, u); }
      if (line) { x2.fillStyle = line; x2.fillRect(x, y + u * (1 - lh), u, u * lh); }
      x2.fillStyle = wall; x2.fillRect(x, y, u * (1 - fw), u);
    } else if (type === 'glass') {
      if (a) { x2.fillStyle = alt; x2.fillRect(x, y, u, u); }
      if (line) { x2.fillStyle = line; x2.fillRect(x, y + u * (1 - lh), u, u * lh); x2.fillRect(x, y, u * lh * .7, u); }
    } else if (type === 'lattice') {
      x2.fillStyle = a ? alt : glass; const r = u * fw / 2, cx = x + u / 2, cy = y + u / 2;
      x2.beginPath(); x2.moveTo(cx, cy - r); x2.lineTo(cx + r, cy); x2.lineTo(cx, cy + r); x2.lineTo(cx - r, cy); x2.closePath(); x2.fill();
      x2.beginPath(); x2.moveTo(x, y - r + u * 0); x2.lineTo(x + r, y); x2.lineTo(x, y + r); x2.lineTo(x - r, y); x2.closePath(); x2.fill();
      x2.beginPath(); x2.moveTo(x + u, y - r); x2.lineTo(x + u + r, y); x2.lineTo(x + u, y + r); x2.lineTo(x + u - r, y); x2.closePath(); x2.fill();
      x2.beginPath(); x2.moveTo(x, y + u - r); x2.lineTo(x + r, y + u); x2.lineTo(x, y + u + r); x2.lineTo(x - r, y + u); x2.closePath(); x2.fill();
      x2.beginPath(); x2.moveTo(x + u, y + u - r); x2.lineTo(x + u + r, y + u); x2.lineTo(x + u, y + u + r); x2.lineTo(x + u - r, y + u); x2.closePath(); x2.fill();
    }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 16;
  t.colorSpace = THREE.NoColorSpace; t.userData.n = n; tc.set(k, t); return t;
}

// ---------- 几何体（UV 以“窗格”为单位，每个面都是整数格） ----------
export function boxGeo(w, h, d, cw = 3.6, ch = 3.6, n = 8, seed = 0) {
  const geo = new THREE.BoxGeometry(w, h, d); geo.translate(0, h / 2, 0);
  const uv = geo.attributes.uv, nx = Math.max(1, Math.round(w / cw)), nz = Math.max(1, Math.round(d / cw)), ny = Math.max(1, Math.round(h / ch));
  const ox = Math.floor(hash(seed + 1.3) * n), oy = Math.floor(hash(seed + 2.7) * n);
  for (let f = 0; f < 6; f++) {
    const su = f < 2 ? nz : nx, sv = (f === 2 || f === 3) ? nz : ny;
    for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, (uv.getX(i) * su + ox) / n, (uv.getY(i) * sv + oy) / n); }
  }
  return geo;
}
export function cylGeo(r0, r1, h, cw = 3.6, ch = 3.6, n = 8, segs = 40) {     // r0 顶、r1 底
  const geo = new THREE.CylinderGeometry(r0, r1, h, segs, 1); geo.translate(0, h / 2, 0);
  const uv = geo.attributes.uv, nu = Math.max(1, Math.round(TAU * Math.max(r0, r1) / cw)), nv = Math.max(1, Math.round(h / ch));
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * nu / n, uv.getY(i) * nv / n);
  return geo;
}
export function latheGeo(prof, segs, nu, nv, n = 8, phi0 = 0) {              // prof: [[r,y],...] 自下而上
  const geo = new THREE.LatheGeometry(prof.map(p => new THREE.Vector2(p[0], p[1])), segs, phi0);
  const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * nu / n, uv.getY(i) * nv / n);
  return geo;
}
// 任意形体：按位置和法线贴窗格（拉伸体用）
export function posUV(geo, cw, ch, n = 8) {
  const p = geo.attributes.position, nr = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(nr.getX(i)), az = Math.abs(nr.getZ(i));
    const u = az >= ax ? p.getX(i) : p.getZ(i);
    uv.setXY(i, u / cw / n, p.getY(i) / ch / n);
  }
  return geo;
}

export function mesh(geo, mat, x = 0, y = 0, z = 0, cast = true, recv = true) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = recv; return m;
}
export const grp = (x = 0, y = 0, z = 0) => { const q = new THREE.Group(); q.position.set(x, y, z); return q; };
const PLANE = new THREE.PlaneGeometry(1, 1); PLANE.rotateX(-PI / 2);
// 贴地色块（路、草、水、标线）。lit=false 时不受光也不接影子
export function flat(parent, w, d, color, x, z, y = .03, lit = true) {
  const m = new THREE.Mesh(PLANE, lit ? M(color) : U(color)); m.scale.set(w, 1, d); m.position.set(x, y, z);
  m.receiveShadow = lit; parent.add(m); return m;
}
const UB = new THREE.BoxGeometry(1, 1, 1); UB.translate(0, .5, 0);
export function blk(parent, w, h, d, color, x, y, z, cast = true) {            // 纯色方块
  const m = new THREE.Mesh(UB, typeof color === 'string' ? M(color) : color); m.scale.set(w, h, d); m.position.set(x, y, z);
  m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m;
}
const UC = new THREE.CylinderGeometry(1, 1, 1, 28); UC.translate(0, .5, 0);
export function cyl(parent, r, h, color, x, y, z, cast = true) {
  const m = new THREE.Mesh(UC, typeof color === 'string' ? M(color) : color); m.scale.set(r, h, r); m.position.set(x, y, z);
  m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m;
}
// 两点之间的一根梁
export function beam(parent, a, b, th, color) {
  const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), L = A.distanceTo(Bv);
  const m = new THREE.Mesh(UB, typeof color === 'string' ? M(color) : color);
  m.scale.set(th, L, th); m.position.copy(A);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), Bv.clone().sub(A).normalize());
  m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}

// ---------- 楼 ----------
// o: {x,z,w,d,h, tex, cw,ch, roof, seed, base(底商颜色), top:'units'|'flat'|'mast'|'crown'|'step', ry}
export function bld(parent, o) {
  const { x = 0, z = 0, y = 0, w, d, h, tex, cw = 3.6, ch = 3.6, roof = '#f1eefb', seed = 1, base = null, top = 'units', ry = 0, baseH = 4.6 } = o;
  const q = grp(x, y, z); q.rotation.y = ry; parent.add(q);
  const R = mulberry(seed * 31 + 7), n = tex.userData.n;
  q.add(mesh(boxGeo(w, h, d, cw, ch, n, seed), M('#ffffff', tex)));
  blk(q, w + .9, .7, d + .9, roof, 0, h, 0);
  if (base) blk(q, w + .5, baseH, d + .5, base, 0, 0, 0);
  const yt = h + .7;
  if (top === 'units') {
    const k = 1 + Math.floor(R() * 3);
    for (let i = 0; i < k; i++) { const bw = w * (.15 + R() * .22), bd = d * (.15 + R() * .25); blk(q, bw, 1.6 + R() * 2.6, bd, roof, (R() - .5) * (w - bw) * .8, yt, (R() - .5) * (d - bd) * .8); }
    if (R() < .4) cyl(q, Math.min(w, d) * .09, 3.4, roof, (R() - .5) * w * .5, yt, (R() - .5) * d * .5);
    if (R() < .22 && w > 14) blk(q, w * .42, .35, d * .5, o.green || '#35c07a', (R() - .5) * w * .4, yt, (R() - .5) * d * .3, false);
  } else if (top === 'mast') {
    blk(q, w * .5, h * .04 + 3, d * .5, roof, 0, yt, 0); cyl(q, .7, h * .16 + 8, '#ffffff', 0, yt + h * .04 + 3, 0);
  } else if (top === 'crown') {
    blk(q, w * .78, h * .05 + 3, d * .78, o.crown || roof, 0, yt, 0); blk(q, w * .5, h * .04 + 2, d * .5, roof, 0, yt + h * .05 + 3, 0);
  } else if (top === 'step') {
    const t2 = tex; q.add(mesh(boxGeo(w * .7, h * .16, d * .7, cw, ch, n, seed + 5), M('#ffffff', t2), 0, yt - .7, 0));
    blk(q, w * .7 + .9, .7, d * .7 + .9, roof, 0, yt - .7 + h * .16, 0);
    q.add(mesh(boxGeo(w * .42, h * .1, d * .42, cw, ch, n, seed + 9), M('#ffffff', t2), 0, yt + h * .16, 0));
    blk(q, w * .42 + .9, .7, d * .42 + .9, roof, 0, yt + h * .26, 0);
  }
  return q;
}

// ---------- 树 ----------
const SPH = new THREE.SphereGeometry(1, 14, 10);
export function tree(parent, x, z, s = 1, c1 = '#2fbf71', c2 = '#1f9d63', trunk = '#7a5a8c', seed = 0) {
  const q = grp(x, 0, z); parent.add(q);
  cyl(q, .28 * s, 3.2 * s, trunk, 0, 0, 0);
  const R = mulberry(seed * 13 + Math.round(x * 7 + z * 3) + 99);
  const add = (r, px, py, pz, c) => { const m = mesh(SPH, M(c), px * s, py * s, pz * s); m.scale.set(r * s, r * s * .86, r * s); q.add(m); };
  add(2.5, 0, 5.2, 0, c1); add(1.9, 1.5 + R() * .4, 4.3, .5, c2); add(1.8, -1.4, 4.6 + R() * .5, -.4, c1); add(1.5, .3, 6.6, -.2, c1);
  return q;
}
// 棕榈：细干 + 一圈下垂的叶片
let FROND = null;
function frondGeo() {
  if (FROND) return FROND;
  const N = 6, L = 5.2, pos = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N, r = L * s, y = 1.5 * Math.sin(s * PI * .62) - 3.3 * s * s, hw = .95 * Math.sin(PI * (.08 + .92 * (1 - s) * .9 + .0)) * (s < .12 ? s / .12 : 1);
    pos.push(r, y, -hw, r, y + .22 * hw, 0, r, y, hw);
    if (i < N) { const a = i * 3; idx.push(a, a + 1, a + 3, a + 1, a + 4, a + 3, a + 1, a + 2, a + 4, a + 2, a + 5, a + 4); }
  }
  FROND = new THREE.BufferGeometry(); FROND.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); FROND.setIndex(idx); FROND.computeVertexNormals();
  return FROND;
}
export function palm(parent, x, z, s = 1, seed = 0, c1 = '#2fbf71', c2 = '#17995f', trunk = '#c9a27a') {
  const q = grp(x, 0, z); parent.add(q);
  const R = mulberry(seed * 17 + Math.round(x * 5 + z * 11) + 5), hgt = (8.5 + R() * 3) * s, lean = (R() - .5) * 1.6 * s;
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(lean * .2, hgt * .55, 0), new THREE.Vector3(lean, hgt, 0));
  q.add(mesh(new THREE.TubeGeometry(curve, 6, .26 * s, 8), M(trunk)));
  const head = grp(lean, hgt, 0); q.add(head);
  const k = 11, fm1 = M(c1, null, { side: THREE.DoubleSide }), fm2 = M(c2, null, { side: THREE.DoubleSide });
  for (let i = 0; i < k; i++) {
    const f = mesh(frondGeo(), i % 2 ? fm1 : fm2); f.rotation.y = i / k * TAU + R() * .3; f.rotation.z = (i % 3 === 0 ? .5 : i % 3 === 1 ? .12 : -.2) + R() * .12; f.scale.setScalar(s * (.85 + R() * .3)); head.add(f);
  }
  const m = mesh(SPH, M(c2), 0, -.1, 0); m.scale.setScalar(.6 * s); head.add(m);
  return q;
}

// ---------- 车 ----------
export const CARS = ['#ff5a3c', '#ffc93c', '#ffffff', '#2f6bff', '#19c2a0', '#ff8fb1', '#2b2f6b'];
export function car(parent, color = '#ff5a3c', glass = '#27306e') {     // 车头朝 +x
  const q = grp(); parent.add(q);
  blk(q, 4.3, .95, 1.85, color, 0, .38, 0); blk(q, 2.3, .72, 1.62, glass, -.25, 1.33, 0); blk(q, 2.1, .1, 1.7, color, -.25, 2.05, 0);
  blk(q, 4.1, .38, 1.9, '#26264a', 0, 0, 0, false);
  return q;
}
export function bus(parent, color = '#19c2a0', glass = '#27306e', len = 11) {
  const q = grp(); parent.add(q);
  blk(q, len, 2.75, 2.5, color, 0, .45, 0); blk(q, len - .6, 1.05, 2.56, glass, 0, 1.75, 0); blk(q, len - .2, .42, 2.52, '#26264a', 0, 0, 0, false);
  blk(q, len, .18, 2.5, '#ffffff', 0, 3.2, 0);
  return q;
}
export function lamp(parent, x, z, ry = 0, hgt = 8.5, color = '#ffffff') {
  const q = grp(x, 0, z); q.rotation.y = ry; parent.add(q);
  cyl(q, .13, hgt, color, 0, 0, 0); blk(q, 2.6, .14, .14, color, 1.2, hgt - .1, 0); blk(q, 1.1, .2, .42, color, 2.2, hgt - .22, 0);
  return q;
}
// 斑马线：沿 x 方向排 n 条
export function zebra(parent, x, z, w, d, n, alongX = true, color = '#ffffff') {
  for (let i = 0; i < n; i++) {
    const t = (i + .5) / n - .5;
    if (alongX) flat(parent, w / n * .55, d, color, x + t * w, z, .07, false); else flat(parent, w, d / n * .55, color, x, z + t * d, .07, false);
  }
}
// 车道虚线
export function dashes(parent, x0, x1, z, color = '#ffffff', alongX = true, step = 9, len = 4, wd = .28) {
  for (let s = x0 + step / 2; s < x1; s += step) { if (alongX) flat(parent, len, wd, color, s, z, .07, false); else flat(parent, wd, len, color, z, s, .07, false); }
}
// 一片低矮街区：把矩形切成网格，随机摆楼
export function fill(parent, x0, x1, z0, z1, o) {          // z0 > z1
  const { cell = 46, gap = 12, hmin = 10, hmax = 34, texs, roofs = ['#f1eefb'], seed = 1, skip = null, base = null, tall = 0, tallH = 90 } = o;
  const R = mulberry(seed * 101 + 3);
  for (let x = x0; x + cell <= x1 + .1; x += cell) for (let z = z0; z - cell >= z1 - .1; z -= cell) {
    const cx = x + cell / 2, cz = z - cell / 2; if (skip && skip(cx, cz)) { R(); R(); R(); continue; }
    const two = R() < .45, inner = cell - gap;
    const mk = (w, d, px, pz) => {
      const big = R() < tall, h = big ? tallH * (.6 + R() * .5) : hmin + R() * R() * (hmax - hmin);
      bld(parent, { x: px, z: pz, w, d, h, tex: texs[Math.floor(R() * texs.length)], roof: roofs[Math.floor(R() * roofs.length)], seed: Math.floor(R() * 9999), base: base && R() < .5 ? base : null, top: big ? (R() < .5 ? 'crown' : 'mast') : 'units' });
    };
    if (two) { const a = inner * (.42 + R() * .12); mk(a - 1.5, inner, cx - inner / 2 + a / 2 - .75, cz); mk(inner - a - 1.5, inner * (.7 + R() * .3), cx + inner / 2 - (inner - a) / 2 + .75, cz); }
    else mk(inner, inner * (.75 + R() * .25), cx, cz);
  }
}
// 云：几团压扁的球，不受光
export function cloud(parent, x, y, z, s = 1, color = '#ffffff', seed = 0) {
  const q = grp(x, y, z); parent.add(q); const R = mulberry(seed * 7 + 3);
  const add = (r, px, py) => { const m = new THREE.Mesh(SPH, U(color)); m.scale.set(r * s, r * s * .62, r * s * .3); m.position.set(px * s, py * s, 0); q.add(m); };
  add(11, 0, 0); add(8, 12, -1.5); add(7, -12, -2); add(6, 21, -3); add(5.5, -21, -3.2); add(7.5, 5 + R() * 3, 4.5);
  const b = new THREE.Mesh(UB, U(color)); b.scale.set(52 * s, 5 * s, 3 * s); b.position.set(0, -6.3 * s, 0); q.add(b);
  return q;
}
