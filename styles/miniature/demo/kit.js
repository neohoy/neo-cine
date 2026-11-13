// 微缩景观 · 积木库：材质、倒角构件、小人、树、车、楼梯和扶梯、标牌
// 改编自用户自己的《福田站 · 精致微缩 v003》（scene.ts、hub.ts，经作者同意改编）：倒角构件、物理玻璃与车漆、石材木材微表面、
// 圆滑树冠、人物和车辆的造型照它来；改成纯 JS，随机数按种子出，小人、车、灯都写成时间 t 的函数（任何一帧可以单独渲染）。
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mulberry } from '/core/lib.js';

export const PI = Math.PI, TAU = PI * 2;
export let rnd = mulberry(1915);                    // 搭模型时用的随机数：搭建顺序固定，所以每次结果一样
export const reseed = s => { rnd = mulberry(s); };
export const NIGHT = [];                            // 夜里会亮的材质：{ m, day, night }，main.js 按天色插值 emissiveIntensity

// ---------- 材质 ----------
// 白模、石材：微表面凹凸（很淡）；浅色低粗糙 = 车漆，加清漆；深青灰 = 玻璃，低粗糙带反射
const detail = new Map();
function detailMap(kind) {
  if (detail.has(kind)) return detail.get(kind);
  const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
  const r = mulberry(kind === 'wood' ? 77 : 1719), img = x.createImageData(512, 512);
  for (let i = 0; i < img.data.length; i += 4) { const v = 218 + Math.round(r() * 28); img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  x.putImageData(img, 0, 0);
  if (kind === 'wood') for (let i = 0; i < 140; i++) { x.strokeStyle = `rgba(80,70,50,${.04 + r() * .13})`; x.beginPath(); const y = r() * 512; x.moveTo(0, y); x.bezierCurveTo(160, y + r() * 15, 300, y - r() * 20, 512, y + r() * 8); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; detail.set(kind, t); return t;
}
const GLAZE = ['#253b45', '#263f48', '#264858', '#37545b', '#29414a', '#233c42'];
const mats = new Map();
export function mat(color, roughness = .8, metalness = 0) {
  const key = `${color}-${roughness}-${metalness}`;
  if (!mats.has(key)) {
    const c = new THREE.Color(color), h = c.getHSL({ h: 0, s: 0, l: 0 }), glazing = GLAZE.includes(String(color)), paint = h.l > .65 && roughness < .65;
    const m = new THREE.MeshPhysicalMaterial({ color, roughness: glazing ? .12 : metalness > .3 ? .3 : roughness, metalness: glazing ? .4 : metalness,
      clearcoat: glazing ? .85 : paint ? .65 : .08, clearcoatRoughness: glazing ? .08 : .22, envMapIntensity: glazing ? 1.15 : .65 });
    if (h.s < .14 && h.l > .6 && roughness >= .65) { m.bumpMap = detailMap('stone'); m.bumpScale = .018; m.roughness = .74; }
    if (['#a67e53', '#77644b'].includes(String(color))) { m.bumpMap = detailMap('wood'); m.bumpScale = .025; m.roughness = .52; m.clearcoat = .18; }
    mats.set(key, m);
  }
  return mats.get(key);
}
// 夜里会亮的材质（灯带、车窗、站名灯箱）：白天 day，夜里 night
export function glow(color, emissive, day = .15, night = 1.6, opt = {}) {
  const m = new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: day, roughness: .5, ...opt });
  NIGHT.push({ m, day, night }); return m;
}
export const glass = new THREE.MeshPhysicalMaterial({ color: '#d1e6e8', transparent: true, opacity: .62, transmission: .3, thickness: .035, ior: 1.46, roughness: .09,
  clearcoat: .9, envMapIntensity: 1.2, depthWrite: false, side: THREE.DoubleSide });
export const metal = mat('#566b68', .4, .45), steel = mat('#64807e', .45, .4), dark = mat('#29414a'), silver = mat('#c6cdcb', .64, .25),
  stone = mat('#d9d9cc'), ivory = mat('#deddd1');

// ---------- 基本构件：倒角方块、圆柱、杆 ----------
const boxes = new Map();
export function box(parent, w, h, d, x, y, z, material, shadow = true) {
  const key = `${w}-${h}-${d}`;
  if (!boxes.has(key)) { const mn = Math.min(w, h, d); boxes.set(key, mn >= .12 && Math.max(w, h, d) > .3 ? new RoundedBoxGeometry(w, h, d, 1, Math.min(.045, mn * .16)) : new THREE.BoxGeometry(w, h, d)); }
  const m = new THREE.Mesh(boxes.get(key), typeof material === 'object' ? material : mat(material));
  m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m;
}
export function cylinder(parent, r, h, x, y, z, material, r2 = r, sides = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r2, h, sides), typeof material === 'object' ? material : mat(material));
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
}
export function bar(parent, a, b, radius, material) {
  const d = b.clone().sub(a), m = cylinder(parent, radius, d.length(), 0, 0, 0, material, radius, 6);
  m.position.copy(a).add(b).multiplyScalar(.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return m;
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- 标牌：画布贴图上的字（站名、线路号）----------
export function label(parent, text, w, h, x, y, z, fg = '#f8f4e8', bg = '#233c50', font = 60, opt = {}) {
  const c = document.createElement('canvas'); c.width = Math.max(256, Math.round(w * 120)); c.height = Math.max(64, Math.round(h * 170));
  const g = c.getContext('2d'), s = c.height / (h * 150);
  if (bg !== 'transparent') { g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); }
  g.fillStyle = fg; g.font = `${opt.weight || 600} ${font * s}px NotoSC, Inter, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, c.width / 2, c.height / 2 + font * s * .04, c.width * .94);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const mm = opt.glow ? glow('#ffffff', '#ffffff', 0, opt.glow, { map: tex, emissiveMap: tex, transparent: bg === 'transparent', alphaTest: bg === 'transparent' ? .05 : 0 })
    : new THREE.MeshBasicMaterial({ map: tex, transparent: bg === 'transparent', alphaTest: bg === 'transparent' ? .05 : 0 });
  if (opt.glow) mm.color.set('#ffffff');
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mm); m.position.set(x, y, z); m.rotation.y = opt.rot || 0; parent.add(m); return m;
}

// ---------- 绿化、座椅、栏杆、灯杆 ----------
export function plantBox(parent, x, z, w = 2.1, d = .8) {
  box(parent, w, .35, d, x, .17, z, stone); box(parent, w - .12, .025, d - .12, x, .36, z, '#68704a');
  const leaf = ['#71894d', '#8f9d59', '#516e3d'];
  for (let i = 0; i < Math.round(w * d * 12); i++) box(parent, .13 + rnd() * .15, .15 + rnd() * .2, .14, x + (rnd() - .5) * (w - .2), .45, z + (rnd() - .5) * (d - .2), leaf[i % 3], false);
  for (let i = 0; i < Math.round(w * 3); i++) box(parent, .09, .08, .09, x + (rnd() - .5) * (w - .2), .68, z + (rnd() - .5) * (d - .2), ['#d99162', '#d6b96a', '#c96b62'][i % 3], false);
}
// 树：一根干、三根枝、一团实例化的小球当树冠（圆滑，不是像素块）
const crownGeo = new THREE.SphereGeometry(.17, 10, 7);
export function tree(parent, x, z, scale = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(scale); parent.add(g);
  cylinder(g, .085, 1.75, 0, .88, 0, '#77644b', .14);
  for (let i = 0; i < 3; i++) bar(g, V(0, 1.1, 0), V(Math.cos(i * 2.1) * .5, 1.9, Math.sin(i * 2.1) * .5), .045, '#77644b');
  const n = 170, m = new THREE.InstancedMesh(crownGeo, mat('#77904b'), n), o = new THREE.Object3D();
  for (let i = 0; i < n; i++) {
    const a = rnd() * TAU, yy = rnd() * 2 - 1, r = Math.sqrt(1 - yy * yy) * Math.cbrt(rnd());
    o.position.set(Math.cos(a) * r * 1.05, 2.0 + yy * .7, Math.sin(a) * r * .9); o.scale.setScalar(.65 + rnd() * 1.3); o.rotation.set(rnd() * 2, rnd() * 2, rnd() * 2);
    o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, new THREE.Color(['#647e40', '#8a9f50', '#a4ad58', '#4d6b39'][Math.floor(rnd() * 4)]));
  }
  m.castShadow = m.receiveShadow = true; g.add(m); return g;
}
export function bench(parent, x, z, rot = 0, station = false) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; parent.add(g);
  const seat = station ? mat('#72898a', .45, .4) : mat('#a67e53');
  for (const xx of [-.7, .7]) { box(g, .07, .4, .07, xx, .2, 0, metal); box(g, .07, .65, .07, xx, .43, -.2, metal); }
  box(g, 1.9, .09, .52, 0, .43, 0, seat); box(g, 1.9, .38, .08, 0, .68, -.24, seat);
  if (station) for (let i = 0; i < 4; i++) box(g, .025, .045, .55, -.85 + i * .57, .51, 0, '#435d61', false);
}
export function railings(parent, x, z, length, rot = 0, h = .65) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; parent.add(g);
  const n = Math.ceil(length / .5);
  for (let i = 0; i <= n; i++) box(g, .035, h, .035, -length / 2 + i * length / n, h / 2, 0, metal, false);
  box(g, length + .06, .045, .055, 0, h, 0, metal, false); box(g, length, .025, .035, 0, h * .25, 0, metal, false); return g;
}
export function lightPole(parent, x, z) {
  cylinder(parent, .035, 2.2, x, 1.1, z, metal, .055); box(parent, .46, .12, .18, x, 2.23, z, metal);
  box(parent, .35, .025, .13, x, 2.16, z, glow('#fff8d6', '#ffd99a', .1, 3.0), false);
}
export function bin(parent, x, z) { box(parent, .36, .64, .36, x, .32, z, '#708b75'); box(parent, .39, .07, .39, x, .68, z, steel); box(parent, .19, .09, .02, x, .53, z + .19, dark, false); }
export function info(parent, x, z, head, color = '#416779') {
  box(parent, .66, 1.42, .24, x, .71, z, silver); label(parent, head, .56, .23, x, 1.22, z + .13, '#f2f0dc', color, 34);
  label(parent, '出口  →', .52, .32, x, .82, z + .13, '#dce6e2', '#33515d', 32); box(parent, .39, .08, .06, x, .48, z + .16, '#d0b87a');
}

// ---------- 楼梯、扶梯 ----------
export function stairs(parent, x, z, width, rise, run, rot = 0) {
  const s = new THREE.Group(); s.position.set(x, 0, z); s.rotation.y = rot; parent.add(s); const n = 18;
  for (let i = 0; i < n; i++) box(s, width, .13, run / n + .015, 0, rise * i / n, -run * i / n, silver, false);
  for (const xx of [-width / 2, width / 2]) {
    bar(s, V(xx, .68, 0), V(xx, rise + .68, -run), .035, steel);
    for (let i = 0; i <= 4; i++) bar(s, V(xx, rise * i / 4, -run * i / 4), V(xx, rise * i / 4 + .65, -run * i / 4), .025, steel);
  }
  return s;
}
// 扶梯：从本层地面升到上一层；层展开时由 main 拉高（scale.y），所以台阶和扶手都画在 0..rise 之间
export function escalators(parent, x, z, rise = 4) {
  const g = new THREE.Group(); g.position.set(x, .06, z); parent.add(g);
  const run = 4.1, len = Math.hypot(run, rise), ang = Math.atan2(rise, run);
  for (const xx of [-.65, .65]) {
    const core = box(g, 1.06, .24, len, xx, rise / 2, -run / 2, metal); core.rotation.x = ang;
    for (let s = 0; s < 22; s++) { const u = s / 22; box(g, .84, .09, run / 22 + .03, xx, u * rise + .1, -u * run, '#a7b5ad', false); }
    for (const side of [-.51, .51]) {
      const m = box(g, .05, .56, len, xx + side, rise / 2 + .4, -run / 2, glass); m.rotation.x = ang;
      bar(g, V(xx + side, .72, .1), V(xx + side, rise + .72, -run - .1), .045, dark);
    }
  }
  return g;
}

// ---------- 小人：头、身、两臂两腿；走路由 walk(t) 驱动 ----------
const headGeo = new THREE.SphereGeometry(.092, 14, 10);
export function person(parent, x, z, color, opt = {}) {
  const p = new THREE.Group(); p.position.set(x, .04, z); p.scale.setScalar(1.35); parent.add(p);
  const skin = mat(['#d7b28b', '#b78f6e', '#e4c2a0'][Math.floor(rnd() * 3)]), outfit = mat(color), pants = mat(['#354b51', '#3d3f44', '#4b4a3f'][Math.floor(rnd() * 3)]);
  const head = new THREE.Mesh(headGeo, skin); head.scale.y = 1.16; head.position.set(0, .79, 0); head.castShadow = true; p.add(head);
  box(p, .19, .06, .18, 0, .88, -.015, '#303c37'); box(p, .24, .29, .15, 0, .55, 0, outfit);
  const legs = [], arms = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(side * .067, .405, 0); p.add(leg); box(leg, .08, .29, .09, 0, -.14, 0, pants); box(leg, .09, .055, .15, 0, -.29, .02, '#3c4440'); legs.push(leg);
    const arm = new THREE.Group(); arm.position.set(side * .16, .66, 0); p.add(arm); box(arm, .07, .23, .075, 0, -.09, 0, outfit); box(arm, .065, .065, .07, 0, -.22, 0, skin); arms.push(arm);
  }
  if (rnd() > .58) { box(p, .19, .3, .22, .26, .2, -.1, ['#be9d78', '#435b5b', '#b97e5e'][Math.floor(rnd() * 3)]); bar(p, V(.26, .34, -.1), V(.18, .52, 0), .018, metal); }
  const w = { p, legs, arms, x0: x, z0: z, phase: rnd() * TAU, range: opt.range ?? .34 + rnd() * 1.4, speed: .22 + rnd() * .16, moving: opt.moving ?? true, face: rnd() * TAU };
  if (!w.moving) p.rotation.y = w.face;
  return w;
}
// 来回踱步：位置是 sin，朝向随速度方向平滑转过去（转身时先面向镜头），腿摆幅跟着速度
export function walk(w, t) {
  if (!w.moving) { const b = Math.sin(t * 1.3 + w.phase) * .04; w.arms[0].rotation.x = b; w.arms[1].rotation.x = -b; return; }
  const ph = t * w.speed + w.phase, v = Math.cos(ph);
  w.p.position.x = w.x0 + Math.sin(ph) * w.range;
  w.p.rotation.y = PI / 2 * Math.tanh(v * 5);
  const sp = Math.min(1, Math.abs(v) * 2.2), st = Math.sin(t * 5.2 + w.phase * 3);
  w.legs[0].rotation.x = st * .42 * sp; w.legs[1].rotation.x = -st * .42 * sp; w.arms[0].rotation.x = -st * .32 * sp; w.arms[1].rotation.x = st * .32 * sp;
  w.p.position.y = .04 + Math.abs(Math.cos(t * 5.2 + w.phase * 3)) * .02 * sp;
}

// ---------- 车：只沿 x 走，车身在模型两端被切面切掉（clip）----------
export function clipX(g, lim) {
  const planes = [new THREE.Plane(new THREE.Vector3(1, 0, 0), lim), new THREE.Plane(new THREE.Vector3(-1, 0, 0), lim)], done = new Map();
  g.traverse(o => {
    if (!o.isMesh) return;
    if (!done.has(o.material)) {
      const m = o.material.clone(); m.clippingPlanes = planes; m.clipShadows = true; done.set(o.material, m);
      const n = NIGHT.find(e => e.m === o.material); if (n) NIGHT.push({ m, day: n.day, night: n.night });   // 克隆出来的发光材质也要随天色变
    }
    o.material = done.get(o.material);
  });
}
const winMat = (color = '#264858') => glow(color, '#ffdba6', 0, 1.1);
// 地铁：三节，白车身、深色窗带、线路色腰带
export function metroTrain(parent, color, x, z) {
  const t = new THREE.Group(); t.position.set(x, .15, z); parent.add(t); const win = winMat('#253b45');
  for (let i = 0; i < 3; i++) {
    const xx = (i - 1) * 4.8;
    box(t, 4.6, 1.15, 1.3, xx, .82, 0, '#e0e4dd'); box(t, 4.6, .3, 1.32, xx, 1.03, 0, win); box(t, 4.62, .19, 1.33, xx, .52, 0, color); box(t, 4.5, .12, 1.1, xx, 1.45, 0, '#a4b1ab');
    for (let k = 0; k < 6; k++) box(t, .07, .38, 1.34, xx - 2 + k * .8, 1.04, 0, '#e0e4dd', false);
    for (const d of [-1.1, 1.1]) { box(t, .55, .85, 1.35, xx + d, .82, 0, '#d3dbd7'); box(t, .35, .35, 1.37, xx + d, 1.07, 0, '#37545b'); }
    box(t, 1, .25, 1.1, xx, .2, 0, '#3c4949'); if (i < 2) box(t, .18, .7, 1.0, xx + 2.4, .8, 0, '#536260');
  }
  for (const end of [-1, 1]) { box(t, .06, .75, 1.05, end * 7.0, .94, 0, '#25434c'); box(t, .07, .13, 1.05, end * 7.01, .45, 0, color); }
  return t;
}
// 高铁：三节白车身 + 椭圆截面放样出的流线车头（照用户模型的做法）
export function hsrTrain(parent, z) {
  const g = new THREE.Group(); g.position.set(0, .18, z); g.scale.y = 1.15; parent.add(g);
  const paint = mat('#e5e9df', .35, .25), navy = winMat('#264858');
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * 6.6, m = new THREE.Mesh(new RoundedBoxGeometry(6.25, 1.15, 1.56, 3, .2), paint); m.position.set(x, .97, 0); m.castShadow = m.receiveShadow = true; g.add(m);
    box(g, 6.16, .27, 1.58, x, 1.15, 0, navy); box(g, 6.1, .07, 1.59, x, .65, 0, '#669dba');
    for (let k = 0; k < 8; k++) box(g, .08, .3, 1.61, x - 2.65 + k * .74, 1.14, 0, paint, false);
    for (const xx of [-2.25, 2.25]) { box(g, .38, .82, 1.59, x + xx, .96, 0, paint); box(g, .23, .36, 1.61, x + xx, 1.11, 0, '#264858'); }
    for (const xx of [-2.15, 2.15]) box(g, .7, .28, 1.38, x + xx, .3, 0, '#344347');
    if (i < 2) box(g, .25, .7, 1.2, x + 3.3, .93, 0, '#5d6b68');
  }
  const rings = [{ x: 9.8, y: 1.0, ry: .55, rz: .77 }, { x: 10.35, y: .9, ry: .48, rz: .7 }, { x: 11.1, y: .72, ry: .29, rz: .43 }, { x: 11.6, y: .59, ry: .12, rz: .15 }];
  const pos = [], idx = [], S = 16;
  for (const r of rings) for (let j = 0; j < S; j++) { const a = j / S * TAU; pos.push(r.x, r.y + Math.cos(a) * r.ry, Math.sin(a) * r.rz); }
  for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < S; j++) { const a = i * S + j, b = i * S + (j + 1) % S, c = a + S, d = b + S; idx.push(a, b, c, b, d, c); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  const nose = new THREE.Mesh(geo, paint); nose.castShadow = true; g.add(nose);
  const ws = box(g, .82, .035, 1.0, 10.33, 1.29, 0, '#264858'); ws.rotation.z = -.4;
  for (const zz of [-.27, .27]) box(g, .06, .08, .16, 11.37, .64, zz, glow('#fff6c8', '#fff1c0', .4, 2.5), false);
  return g;
}
// 公交：绿车身、深色窗；车头朝 +x
export function cityBus(parent, x, z, color = '#6b9a64') {
  const b = new THREE.Group(); b.position.set(x, .1, z); parent.add(b);
  const body = new THREE.Group(); body.rotation.y = PI / 2; body.scale.setScalar(.87); b.add(body); const win = winMat('#29414a');
  box(body, 1.5, 1.4, 4.5, 0, .9, 0, color); box(body, 1.52, .65, 4.3, 0, 1.12, 0, win); box(body, 1.5, .16, 4.5, 0, 1.6, 0, '#cbd4c6');
  for (let zz = -1.8; zz < 2; zz += .7) box(body, 1.54, .66, .055, 0, 1.12, zz, color, false);
  box(body, 1.32, .68, .055, 0, 1.14, 2.27, '#29414a'); box(body, .75, .18, .06, 0, 1.46, 2.31, '#a9b96f');
  for (const xx of [-.74, .74]) for (const zz of [-1.35, 1.35]) { const w = cylinder(body, .29, .14, xx, .3, zz, '#2e4141', .29, 12); w.rotation.z = PI / 2; }
  for (const xx of [-.48, .48]) box(body, .2, .1, .06, xx, .55, 2.3, glow('#fff3c8', '#fff0c0', .3, 2.4), false);
  return b;
}
// 白色斜顶出入口（下沉楼梯）
export function whiteExit(parent, x, z, text) {
  const q = new THREE.Group(); q.position.set(x, 0, z); parent.add(q);
  box(q, 3.25, .08, 3.8, 0, .04, 0, dark);
  for (const side of [-1, 1]) {
    const s = new THREE.Shape(); s.moveTo(-1.9, 0); s.lineTo(-1.9, 2.65); s.lineTo(2.05, 3.0); s.lineTo(1.5, 0); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: .19, bevelEnabled: false }); geo.rotateY(PI / 2);
    const wall = new THREE.Mesh(geo, mat('#e7e9e3')); wall.position.x = side * 1.63; wall.castShadow = wall.receiveShadow = true; q.add(wall);
  }
  const roof = box(q, 3.7, .2, 4.6, 0, 2.85, .05, '#e5e7e1'); roof.rotation.x = -.09;
  for (const xx of [-1.35, 1.35]) box(q, .04, 1.9, 3.4, xx, 1, 0, glass, false);
  label(q, text, 3.05, .43, 0, 2.25, 1.95, '#f4f5e9', '#274b60', 40, { glow: 1.2 });
  for (let i = 0; i < 12; i++) box(q, 2.55, .07, .25, 0, -i * .085, 1.55 - i * .25, '#80968f', false);
  return q;
}
// 泥土切面：暖沙色，带几道地层线（在模型侧面和层间缝里看得到）
export function earthMat() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d'), r = mulberry(5);
  g.fillStyle = '#c9bea6'; g.fillRect(0, 0, 256, 256);
  const img = g.getImageData(0, 0, 256, 256);
  for (let i = 0; i < img.data.length; i += 4) { const v = (r() - .5) * 16; img.data[i] += v; img.data[i + 1] += v; img.data[i + 2] += v; }
  g.putImageData(img, 0, 0);
  for (const [y, a] of [[60, .1], [128, .14], [190, .08]]) { g.fillStyle = `rgba(110,90,60,${a})`; g.fillRect(0, y, 256, 3); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 1);
  return new THREE.MeshStandardMaterial({ color: '#ffffff', map: t, roughness: 1 });
}
