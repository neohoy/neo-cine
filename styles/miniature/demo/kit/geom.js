// 微缩景观工具包 · 几何：自己写的倒角盒、几何缓存、静态件按材质合并。
// 倒角是这个风格的命：没有锐利的 CG 棱角，也没有低多边形的面片。所有方块件都走 bevelBox。
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const CACHE = new Map();
const key = (...a) => a.map(x => typeof x === 'number' ? x.toFixed(3) : x).join('|');

// 倒角盒：尺寸 w×h×d，圆角半径 r（自动限制在最短边的 1/6 和 0.06·storey 以内由调用方决定），每个圆角 k 段。
// 做法：每条轴上的坐标取 [-a, 圆角内的 k 段…, a-r…a]，在 6 个面上铺网格，再把每个顶点投到"内盒 + 半径 r 的球面"上：
//   inner = clamp(v, -(a-r), a-r)；v' = inner + normalize(v - inner)·r；法线 = normalize(v - inner)。
// 平的部分顶点不动、法线就是面法线；只有棱和角是圆的，顶点数很少（k=3 时每个盒子 384 个）。
export function bevelBox(w, h, d, r = .04, k = 3) {
  r = Math.max(0, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4));
  const id = key('bb', w, h, d, r, k);
  if (CACHE.has(id)) return CACHE.get(id);
  const half = [w / 2, h / 2, d / 2];
  const axis = a => {
    if (r < 1e-4) return [-a, a];
    const out = [];
    for (let i = 0; i <= k; i++) out.push(-a + r - r * Math.cos(i / k * Math.PI / 2));   // 越靠近棱越密
    for (let i = k; i >= 0; i--) out.push(a - r + r * Math.cos(i / k * Math.PI / 2));
    return out;
  };
  const co = half.map(axis), pos = [], nor = [], uv = [], idx = [];
  // 6 个面：法线轴 na（x/y/z）× 正负 s；面内两轴按循环顺序取，绕向最后由 fixWinding 统一成外向
  const P = [0, 0, 0], inner = [0, 0, 0], n = [0, 0, 0];
  for (const na of [0, 1, 2]) for (const s0 of [1, -1]) {
    const A = (na + 1) % 3, B = (na + 2) % 3;
    const cu = co[A], cv = co[B], base = pos.length / 3;
    for (let j = 0; j < cv.length; j++) for (let i = 0; i < cu.length; i++) {
      P[na] = s0 > 0 ? half[na] : -half[na]; P[A] = cu[i]; P[B] = cv[j];
      for (let q = 0; q < 3; q++) inner[q] = Math.max(-half[q] + r, Math.min(half[q] - r, P[q]));
      let L = 0; for (let q = 0; q < 3; q++) { n[q] = P[q] - inner[q]; L += n[q] * n[q]; }
      L = Math.sqrt(L);
      if (L < 1e-7) { n[0] = n[1] = n[2] = 0; n[na] = s0 > 0 ? 1 : -1; } else for (let q = 0; q < 3; q++) n[q] /= L;
      pos.push(inner[0] + n[0] * r, inner[1] + n[1] * r, inner[2] + n[2] * r); nor.push(n[0], n[1], n[2]);
      uv.push((cu[i] + half[A]) / (2 * half[A]), (cv[j] + half[B]) / (2 * half[B]));
    }
    const nu = cu.length;
    for (let j = 0; j < cv.length - 1; j++) for (let i = 0; i < nu - 1; i++) {
      const a = base + j * nu + i, b = a + 1, c = a + nu, e = c + 1;
      idx.push(a, b, e, a, e, c);
    }
  }
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  fixWinding(g);
  CACHE.set(id, g); return g;
}
// 保险：如果某个三角形的几何法线和顶点法线反了，就翻过来（上面的面表已经按外向写，这里只兜底）
function fixWinding(g) {
  const p = g.attributes.position.array, n = g.attributes.normal.array, ix = g.index.array;
  for (let t = 0; t < ix.length; t += 3) {
    const a = ix[t] * 3, b = ix[t + 1] * 3, c = ix[t + 2] * 3;
    const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2], vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
    if (cx * (n[a] + n[b] + n[c]) + cy * (n[a + 1] + n[b + 1] + n[c + 1]) + cz * (n[a + 2] + n[b + 2] + n[c + 2]) < 0) { const s = ix[t + 1]; ix[t + 1] = ix[t + 2]; ix[t + 2] = s; }
  }
}

export function sphere(r, ws = 14, hs = 10) {
  const id = key('sp', r, ws, hs);
  if (!CACHE.has(id)) CACHE.set(id, new THREE.SphereGeometry(r, ws, hs));
  return CACHE.get(id);
}
export function cylinder(rt, rb, h, n = 16) {
  const id = key('cy', rt, rb, h, n);
  if (!CACHE.has(id)) CACHE.set(id, new THREE.CylinderGeometry(rt, rb, h, n));
  return CACHE.get(id);
}

// 静态件收集器：搭场景时把不会动的件按材质收起来，最后每种材质合并成一个网格（几千个件 → 几十个绘制调用）。
// add(geom, mat, x, y, z, ry, sx, sy, sz)；会动的件不要放进来，直接挂到自己的 Group 上。
export class Batch {
  constructor() { this.byMat = new Map(); this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); }
  add(geom, mat, x = 0, y = 0, z = 0, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) {
    this._e.set(rx, ry, rz); this._q.setFromEuler(this._e);
    this._m.compose(new THREE.Vector3(x, y, z), this._q, new THREE.Vector3(sx, sy, sz));
    return this.addMatrix(geom, mat, this._m);
  }
  addMatrix(geom, mat, m) {
    const g = geom.index ? geom.clone() : geom.clone();
    g.applyMatrix4(m);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!this.byMat.has(mat)) this.byMat.set(mat, []);
    this.byMat.get(mat).push(g.index ? g : g);
    return this;
  }
  // 合并后挂到 parent 上，返回网格列表
  flush(parent, { cast = true, receive = true } = {}) {
    const out = [];
    for (const [mat, list] of this.byMat) {
      const idx = list.filter(g => g.index), non = list.filter(g => !g.index);
      for (const group of [idx, non]) {
        if (!group.length) continue;
        for (let i = 0; i < group.length; i += 4000) {
          const mesh = new THREE.Mesh(mergeGeometries(group.slice(i, i + 4000), false), mat);
          mesh.castShadow = cast && !mat.transparent; mesh.receiveShadow = receive;
          parent.add(mesh); out.push(mesh);
        }
      }
    }
    this.byMat.clear(); return out;
  }
}

// 一个倒角盒挂到 parent 上（会动的单件用）
export function boxMesh(parent, mat, w, h, d, x = 0, y = 0, z = 0, r = .04) {
  const m = new THREE.Mesh(bevelBox(w, h, d, r), mat); m.position.set(x, y, z);
  m.castShadow = !mat.transparent; m.receiveShadow = true; parent.add(m); return m;
}

// 盒减盒：从一组盒子里挖掉若干空腔，结果仍是互不重叠的盒子（每次最多切成 6 块）。
// 盒子写成 {x:[a,b], y:[a,b], z:[a,b]}。土体挖地道、楼板开洞都用它。
export function subtractBoxes(boxes, voids) {
  let cur = boxes.map(b => ({ x: b.x.slice(), y: b.y.slice(), z: b.z.slice() }));
  for (const v of voids) {
    const next = [];
    for (const b of cur) {
      const hit = ['x', 'y', 'z'].every(k => b[k][0] < v[k][1] - 1e-6 && v[k][0] < b[k][1] - 1e-6);
      if (!hit) { next.push(b); continue; }
      let rest = { x: b.x.slice(), y: b.y.slice(), z: b.z.slice() };
      for (const k of ['x', 'y', 'z']) {
        if (rest[k][0] < v[k][0]) { const p = { x: rest.x.slice(), y: rest.y.slice(), z: rest.z.slice() }; p[k] = [rest[k][0], v[k][0]]; next.push(p); rest[k][0] = v[k][0]; }
        if (rest[k][1] > v[k][1]) { const p = { x: rest.x.slice(), y: rest.y.slice(), z: rest.z.slice() }; p[k] = [v[k][1], rest[k][1]]; next.push(p); rest[k][1] = v[k][1]; }
      }
    }
    cur = next;
  }
  return cur.filter(b => b.x[1] - b.x[0] > 1e-4 && b.y[1] - b.y[0] > 1e-4 && b.z[1] - b.z[0] > 1e-4);
}
