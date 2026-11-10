// 折叠深圳 · 成片
// 三块地（罗湖、福田、南山）首尾用铰链连成一条：下一块先平铺在远处，再立成一面墙，镜头翻上去它就成了地面。
// 每个镜头状态之间，机位、朝向、透视强度（正交 ↔ 广角）一起连续变化；任何一帧都只由 t 决定。
import * as THREE from 'three';
import { clamp, lerp } from '/core/lib.js';
import { grp, D2R, PI } from './kit.js';
import { buildLuohu, LUOHU } from './luohu.js';
import { buildFutian, FUTIAN } from './futian.js';
import { buildNanshan, NANSHAN } from './nanshan.js';
import { CAM, TR, VIS, DUR, SECS, END } from './timeline.js';

const W = innerWidth, H = innerHeight, K = H / 1080;
await Promise.all(['900 100px SHS', '700 30px SHS', '700 30px InterTight', '800 30px InterTight'].map(f => document.fonts.load(f, '罗湖福田南山折叠深圳LUOHU0123')));

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, logarithmicDepthBuffer: true });
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.setPixelRatio(2); renderer.setSize(W, H);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);
const ov = document.getElementById('ov'); ov.width = W; ov.height = H; const g = ov.getContext('2d');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, W / H, 1, 60000);
const L = 700;
const plates = [buildLuohu(), buildFutian(), buildNanshan()], THEME = [LUOHU, FUTIAN, NANSHAN];
const ENDT = { sky: '#171a5c', amb: [.5, .5, .86] };
// 铰链链条只是三个空坐标系；三块地各自抄它的矩阵，这样每块地可以单独隐藏
const fr0 = grp(), h1 = grp(0, 0, -L), h2 = grp(0, 0, -L); fr0.add(h1); h1.add(h2); const FR = [fr0, h1, h2];
for (const p of plates) { p.group.matrixAutoUpdate = false; scene.add(p.group); }
function setPlates(t, v) {
  h1.position.z = -L - v.slide1 * 2600; h2.position.z = -L - v.slide2 * 2600;
  h1.rotation.x = v.fold1 * PI / 2; h2.rotation.x = v.fold2 * PI / 2;
  fr0.updateMatrixWorld(true);
  plates.forEach((p, i) => { p.group.matrix.copy(FR[i].matrixWorld); p.group.matrixWorld.copy(FR[i].matrixWorld); p.group.visible = track(VIS[i], t) > .5; });
}

const amb = new THREE.AmbientLight(0xffffff, PI); scene.add(amb);
const sun = new THREE.DirectionalLight(0xffffff, PI); scene.add(sun, sun.target);
sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -.0004; sun.shadow.normalBias = .12; sun.shadow.radius = 1.2;
const LP = new THREE.Vector3(-.5, .78, .62).normalize();          // 每块地自己坐标里的太阳方向：左前上方

// ---------- 缓动、轨道 ----------
const EASE = {
  lin: u => u,
  io: u => u < .5 ? 16 * u ** 5 : 1 - (-2 * u + 2) ** 5 / 2,
  o: u => 1 - (1 - u) ** 4,
  i: u => u ** 3,
  back: u => { const s = 1.4, v = u - 1; return 1 + v * v * ((s + 1) * v + s); },
};
function track(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
    const a = keys[i - 1], b = keys[i], u = (t - a[0]) / (b[0] - a[0]);
    return lerp(a[1], b[1], EASE[b[2] || 'lin'](u));
  }
  return keys[keys.length - 1][1];
}
const vals = t => { const v = {}; for (const k in TR) v[k] = track(TR[k], t); return v; };

// ---------- 镜头 ----------
const V3 = THREE.Vector3, _m = new THREE.Matrix4(), _pq = new THREE.Quaternion();
function camWorld(k) {
  const pl = plates[k.f].group, yaw = k.yaw * D2R, p = k.pitch * D2R;
  const dir = new V3(Math.sin(yaw) * Math.cos(p), Math.sin(p), Math.cos(yaw) * Math.cos(p));
  const up = new V3(-Math.sin(yaw) * Math.sin(p), Math.cos(p), -Math.cos(yaw) * Math.sin(p));
  const q = new THREE.Quaternion().setFromRotationMatrix(_m.makeBasis(new V3().crossVectors(up, dir), up, dir));
  if (k.roll) q.multiply(new THREE.Quaternion().setFromAxisAngle(new V3(0, 0, 1), k.roll * D2R));
  q.premultiply(pl.getWorldQuaternion(_pq));
  return { tgt: pl.localToWorld(new V3(k.x, k.y, k.z)), q, H: k.H, invd: Math.tan(k.fov * D2R / 2) / (k.H / 2) };
}
const CS = { tgt: new V3(), H: 100, fov: 30, dist: 100 };
function setCamera(t) {
  let i = 1; while (i < CAM.length - 1 && t > CAM[i][0]) i++;
  const a = CAM[i - 1], b = CAM[i], u = EASE[b[2] || 'io'](clamp((t - a[0]) / (b[0] - a[0])));
  const A = camWorld(a[1]), B = camWorld(b[1]);
  const tgt = A.tgt.lerp(B.tgt, u), q = A.q.slerp(B.q, u), Hc = Math.exp(lerp(Math.log(A.H), Math.log(B.H), u)), invd = lerp(A.invd, B.invd, u);
  const dist = 1 / invd;
  camera.quaternion.copy(q); camera.position.copy(tgt).addScaledVector(new V3(0, 0, 1).applyQuaternion(q), dist);
  camera.fov = 2 * Math.atan(invd * Hc / 2) / D2R; camera.near = Math.max(1, dist - 5000); camera.far = dist + 9000; camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  CS.tgt.copy(tgt); CS.H = Hc; CS.fov = camera.fov; CS.dist = dist;
}
// 世界 → 屏幕（所有跟随画面的文字都走这里）
const proj = (p) => { const v = p.clone().project(camera); return [(v.x * .5 + .5) * W, (-v.y * .5 + .5) * H, v.z]; };

// ---------- 光、影、天色 ----------
const _c0 = new THREE.Color(), _c1 = new THREE.Color();
function setLight(v) {
  const f = clamp(v.frame, 0, 2), i0 = Math.floor(f), i1 = Math.min(2, i0 + 1), u = f - i0;
  const d0 = LP.clone().applyQuaternion(plates[i0].group.getWorldQuaternion(new THREE.Quaternion()));
  const d1 = LP.clone().applyQuaternion(plates[i1].group.getWorldQuaternion(new THREE.Quaternion()));
  const d = d0.lerp(d1, u).normalize();
  const sf = clamp(v.skyFrame, 0, 2), j0 = Math.floor(sf), j1 = Math.min(2, j0 + 1), w = sf - j0;
  const a0 = THEME[j0].amb, a1 = THEME[j1].amb, a = [0, 1, 2].map(j => lerp(lerp(a0[j], a1[j], w), ENDT.amb[j], v.endMix));
  amb.color.setRGB(a[0], a[1], a[2]); sun.color.setRGB(1 - a[0], 1 - a[1], 1 - a[2]);
  renderer.setClearColor(_c0.set(THEME[j0].sky).lerp(_c1.set(THEME[j1].sky), w).lerp(_c1.set(ENDT.sky), v.endMix));
  // 影子贴图只罩住镜头看得到的范围，离得近时影子边才利落
  let r = clamp(CS.H * (1.3 + CS.fov / 16), 100, 1400); r = 100 * 1.25 ** Math.ceil(Math.log(r / 100) / Math.log(1.25));
  sun.target.position.copy(CS.tgt); sun.position.copy(CS.tgt).addScaledVector(d, 3500);
  const sc = sun.shadow.camera; sc.left = sc.bottom = -r; sc.right = sc.top = r; sc.near = 200; sc.far = 7500; sc.updateProjectionMatrix();
  return { ink: lerp(THEME[i0].ink ?? 1, THEME[i1].ink ?? 1, u) };
}

// ---------- 文字 ----------
// 左下角一条三折的标签：编号 | 区名 | 地标。出场像折页一样一格一格展开，离场反过来收起。
const INK = '#141a5e', seg = (t, a, b) => clamp((t - a) / (b - a)), eo = u => 1 - (1 - u) ** 4;
const FONT = { no: `800 ${46 * K}px InterTight`, cn: `900 ${62 * K}px SHS`, en: `700 ${23 * K}px InterTight`, mk: `700 ${27 * K}px SHS`, t1: `900 ${164 * K}px SHS`, t2: `700 ${34 * K}px InterTight` };
const meas = (font, text, ls = 0) => { g.font = font; g.letterSpacing = ls + 'px'; const w = g.measureText(text).width; g.letterSpacing = '0px'; return w; };
const LAB = SECS.map(s => {
  const cnW = meas(FONT.cn, s.cn), enW = meas(FONT.en, s.en, 4 * K), mkW = meas(FONT.mk, s.marks), h = 104 * K, x = 72 * K, y = H - 72 * K - h, gap = 5 * K;
  const pa = { x, w: 104 * K }, pb = { x: pa.x + pa.w + gap, w: 28 * K + cnW + 18 * K + enW + 30 * K }, pc = { x: pb.x + pb.w + gap, w: mkW + 60 * K };
  return { s, h, y, pa, pb, pc, cnW, enW, mkW };
});
let texts = [];
function drawText(t) {
  g.clearRect(0, 0, W, H); texts = [];
  for (const L of LAB) {
    const { s, h, y, pa, pb, pc } = L, tin = s.t0 + .12, tout = s.t1 - .12;
    if (t < tin || t > tout) continue;
    const out = seg(t, tout - .36, tout);
    const rev = k => eo(seg(t, tin + k * .11, tin + k * .11 + .42)) * (1 - eo(seg(out, (2 - k) * .2, (2 - k) * .2 + .6)));
    const panel = (pn, k, bg, draw) => {
      const e = rev(k); if (e <= .001) return 0;
      g.save(); g.beginPath(); g.rect(pn.x, y, pn.w * e, h); g.clip(); g.fillStyle = bg; g.fillRect(pn.x, y, pn.w, h); draw(); g.restore(); return e;
    };
    g.textBaseline = 'alphabetic';
    const ea = panel(pa, 0, INK, () => { g.fillStyle = '#ffffff'; g.font = FONT.no; g.textAlign = 'center'; g.fillText(s.no, pa.x + pa.w / 2, y + h / 2 + 16 * K); g.textAlign = 'left'; });
    const eb = panel(pb, 1, '#ffffff', () => {
      g.fillStyle = INK; g.font = FONT.cn; g.fillText(s.cn, pb.x + 28 * K, y + h / 2 + 22 * K);
      g.font = FONT.en; g.letterSpacing = 4 * K + 'px'; g.fillText(s.en, pb.x + 28 * K + L.cnW + 18 * K, y + h / 2 + 21 * K); g.letterSpacing = '0px';
    });
    const ec = panel(pc, 2, '#ffffff', () => { g.fillStyle = INK; g.font = FONT.mk; g.fillText(s.marks, pc.x + 30 * K, y + h / 2 + 10 * K); });
    if (eb > .999) texts.push({ id: 'cn-' + s.id, text: s.cn + ' ' + s.en, x0: pb.x, y0: y, x1: pb.x + pb.w, y1: y + h });
    if (ec > .999) texts.push({ id: 'mk-' + s.id, text: s.marks, x0: pc.x, y0: y, x1: pc.x + pc.w, y1: y + h });
  }
  // 片尾标题
  if (t >= END.t0) {
    const e = eo(seg(t, END.t0, END.t0 + .7)), e2 = eo(seg(t, END.t0 + .35, END.t0 + 1.0));
    const x = 120 * K, yb = H - 190 * K, w1 = meas(FONT.t1, END.cn);
    g.save(); g.beginPath(); g.rect(x, yb - 190 * K, w1 * e + 4, 230 * K); g.clip(); g.fillStyle = '#ffffff'; g.font = FONT.t1; g.textBaseline = 'alphabetic'; g.fillText(END.cn, x, yb); g.restore();
    g.globalAlpha = e2; g.fillStyle = '#ffc21a'; g.fillRect(x + 4 * K, yb + 34 * K, 96 * K * e2, 8 * K);
    g.fillStyle = '#ffffff'; g.font = FONT.t2; g.letterSpacing = 9 * K + 'px'; g.fillText(END.en, x + 4 * K, yb + 92 * K); g.letterSpacing = '0px'; g.globalAlpha = 1;
    if (e > .999) texts.push({ id: 'title', text: END.cn, x0: x, y0: yb - 190 * K, x1: x + w1, y1: yb + 40 * K });
    if (e2 > .999) texts.push({ id: 'title-en', text: END.en, x0: x, y0: yb + 56 * K, x1: x + meas(FONT.t2, END.en, 9 * K), y1: yb + 100 * K });
  }
}
window.TEXTS = (t) => { drawText(clamp(t, 0, DUR)); return texts; };

// ---------- 一帧 ----------
window.DUR = DUR;
// 声音事件：镜头每次运动一声呼啸、到位一声落点；折叠、滑入各有自己的声音。mix.py 按这些时间放。
const EV = []; const ev = (type, t, o = {}) => EV.push({ type, t: +t.toFixed(3), ...o });
for (let i = 1; i < CAM.length; i++) if ((CAM[i][2] || 'io') !== 'lin') { ev('whoosh', CAM[i - 1][0], { d: +(CAM[i][0] - CAM[i - 1][0]).toFixed(3), flat: CAM[i][1].fov < 2 ? 1 : 0 }); ev('land', CAM[i][0], { flat: CAM[i][1].fov < 2 ? 1 : 0 }); }
for (const k of ['fold1', 'fold2', 'luoFold', 'nanFold', 'slide1', 'slide2']) for (let i = 1; i < TR[k].length; i++) if (TR[k][i][1] !== TR[k][i - 1][1]) ev(k.startsWith('slide') ? 'slide' : k.startsWith('fold') ? 'fold' : 'door', TR[k][i - 1][0], { d: +(TR[k][i][0] - TR[k][i - 1][0]).toFixed(3), up: TR[k][i][1] > TR[k][i - 1][1] ? 1 : 0, k });
EV.sort((a, b) => a.t - b.t); window.EV = EV;
window.render = (t) => {
  t = clamp(t, 0, DUR);
  const v = vals(t);
  for (const p of plates) p.update(t, v);
  setPlates(t, v);
  scene.updateMatrixWorld(true);
  setCamera(t); setLight(v);
  renderer.render(scene, camera);
  drawText(t);
};
window.render(0);
window.READY = true;
