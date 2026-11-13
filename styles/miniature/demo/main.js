// 《一座高铁站怎么运转》How a High-Speed Station Works · 成片
// 一座虚构的典型高铁站做成切开的桌上模型：先看全景，屋顶抬起；再跟一位拖箱子的旅客，按七步推近讲清楚
// 从下车进站到上车出发，另一侧下车的人走地道出站；讲完退回全景，屋顶合上，天黑，灯一批批亮。
// 模型和动画全部来自 kit/（工具包）和 station.js（场景描述）；这里只写镜头、讲解、事件和页面约定。
// 页面约定：window.READY、window.render(t)、window.DUR、window.EV、window.TEXTS(t)。?textonly=1 时不画三维（给阅读时长检查用）。
import * as THREE from 'three';
import { buildMiniature, LightRig, Post, CameraRig, shots, S, Overlay, seg, env, clamp, lerp, eio, D2R } from './kit/index.js';
import SPEC, { LAYOUT } from './station.js';

const W = 1920, H = 1080, Q = new URLSearchParams(location.search), TEXTONLY = Q.get('textonly') === '1';
await Promise.all(['700 40px NotoSC', '500 20px Inter', '700 46px Inter'].map(f => document.fonts.load(f, '站台天桥候车ABC123')));

// —— 渲染器（只读文字时不建）——
let renderer = null;
if (!TEXTONLY) {
  renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(2); renderer.setSize(W, H);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.addEventListener('webglcontextlost', () => { window.__glLost = 'context lost'; });
  document.getElementById('stage').appendChild(renderer.domElement);
}
const scene = new THREE.Scene();
const world = buildMiniature(SPEC, { renderer });
scene.add(world.root);
const T = world.T;
const rig = new CameraRig({ kind: 'ortho', aspect: W / H });
const lights = new LightRig(scene, renderer, { board: SPEC.board, sunDir: [-.5, .78, .62] });
let post = null;
if (renderer) post = new Post(renderer, scene, rig.camera, { w: W, h: H, ssaa: 2, ao: true, clipBox: new THREE.Box3(new THREE.Vector3(-36, -9.5, -26), new THREE.Vector3(36, 20, 24.5)) });
const ov = document.getElementById('ov'); ov.width = W; ov.height = H;
const O = new Overlay(ov, { W, H });

// —— 讲解：七步。每步：编号牌 + 一两个引线标注；镜头推近到这一步，讲完接下一步 ——
const { PF, DECK, Y } = LAYOUT;
const STEPS = [
  { n: 1, cn: '站前落客', en: 'Drop-off', t0: T('@open'), t1: T('@hero.idgate') - .3,
    shots: [[0, S([-21.6, 1.4, 11.8], 16, 34, 8.4)]],
    calls: [{ id: 'curb', at: [-24.6, .25, 14.6], cn: '落客平台', en: 'Drop-off curb', dt: [.7, 99], side: 'left' }] },
  { n: 2, cn: '实名验证 · 安检', en: 'ID Check · Security', t1: T('@hero.cleared') + .9,
    shots: [[0, S([-22.6, 1.2, 4.4], 14, 44, 7.4)]],
    calls: [{ id: 'idgate', at: [-25.5, 1.15, 6.2], cn: '实名验证闸机', en: 'ID gates', dt: [.8, 5.2], side: 'left' },
            { id: 'xray', at: [-23.4, 1.9, 2.2], cn: '安检仪', en: 'X-ray scanner', dt: [2.6, 99], side: 'left' }] },
  { n: 3, cn: '候车', en: 'Waiting Hall', t1: T('@hero.ticket') - .1,
    shots: [[0, S([-10.2, 1.4, 1.8], 18, 40, 7.8)]],
    calls: [{ id: 'seats', at: [-14.6, .8, 6.6], cn: '候车区', en: 'Waiting area', dt: [.7, 4.6], side: 'left' },
            { id: 'screen', at: [-6.5, 5.2, -2.75], cn: '信息屏', en: 'Departure board', dt: [3.0, 99], side: 'right' }] },
  { n: 4, cn: '检票', en: 'Ticket Gates', t1: T('@hero.esc') + 1.2,
    shots: [[0, S([-4.4, 1.8, -1.0], 22, 38, 7.2)]],
    calls: [{ id: 'tgates', at: [-8.0, 1.15, -.6], cn: '检票闸机', en: 'Ticket gates', dt: [.8, 99], side: 'left' }] },
  { n: 5, cn: '天桥 · 下站台', en: 'Overpass · Down to the Platform', t1: T('@hero.platform') + .5,
    shots: [[0, S([2.6, 3.6, -2.2], 26, 30, 8.4)], ['@hero.bridge-.6', S([8.4, 4.4, -8.2], 130, 34, 10.4), 2.6], ['@hero.down+.4', S([4.6, 3.0, -10.6], 152, 36, 8.6), 2.0]],
    calls: [{ id: 'esc', at: [2.2, 3.6, -2.0], cn: '扶梯', en: 'Escalator', dt: [.4, '@hero.bridge-.5'], side: 'right' },
            { id: 'bridge', at: [10, DECK + 1.2, -7.6], cn: '天桥', en: 'Overpass', dt: ['@hero.bridge+1.4', '@hero.down'], side: 'right' },
            { id: 'pf', at: [-6, PF + .1, -11.6], cn: '站台', en: 'Platform', dt: ['@hero.down+2.2', 99], side: 'left' }] },
  { n: 6, cn: '上车 · 发车', en: 'Board · Departure', t1: T('@A.depart') + 2.2,
    shots: [[0, S([2.0, 2.4, -8.4], 162, 30, 9.4)], ['@A.depart', S([5, 2.4, -8.0], 148, 30, 13.0), 3.2]],
    calls: [{ id: 'doors', at: [3.4, 2.4, -7.5], cn: '车门', en: 'Train doors', dt: [.8, '@A.close+1.0'], side: 'right' }] },
  { n: 7, cn: '出站 · 地道', en: 'Exit · Underpass', t1: null,
    shots: [[0, S([30.0, -1.0, -2.0], 72, 17, 9.4), 2.8]],
    calls: [{ id: 'under', at: [31.8, -2.8, -7.4], cn: '出站地道', en: 'Exit underpass', dt: [1.1, 99], side: 'left' }] },
];
for (let i = 0; i < STEPS.length; i++) {
  const s = STEPS[i]; if (s.t0 == null) s.t0 = STEPS[i - 1].t1;
  if (s.t1 == null) s.t1 = s.t0 + 5.6;
}
const tm = v => typeof v === 'number' ? v : T(v);
// 片子的大段落
const tWideEnd = STEPS[0].t0;                    // 开场全景到这里
const tBack = STEPS[6].t1;                       // 讲完，退回全景
const tClose = SPEC.marks.close, tLights = SPEC.marks.lights;
const tEnd = tLights + .3;                       // 片尾卡出现
const DUR = +(tEnd + 6.0).toFixed(2);

// —— 镜头 ——
const WIDE0 = S([-1.5, -.5, 0], 22, 31, 24.5), WIDE1 = S([-1, -.5, -.5], 30, 35, 23.5), WIDE_END = S([-1, -.8, 0], 28, 31, 24.5);
const keys = [[0, WIDE0, x => x], [4.6, { ...WIDE0, yaw: WIDE0.yaw + 6 * D2R }], [tWideEnd, WIDE1]];
for (const s of STEPS) {
  for (const [dt, shot, mv = 1.8] of s.shots) {
    const t = typeof dt === 'number' ? s.t0 + dt : T(dt);
    const last = keys[keys.length - 1];
    if (t > last[0] + .01) keys.push([t, keys[keys.length - 1][1]]);
    keys.push([t + mv, shot]);
  }
}
keys.push([tBack, keys[keys.length - 1][1]], [tBack + 2.6, WIDE_END], [DUR, { ...WIDE_END, yaw: WIDE_END.yaw - 5 * D2R }]);
const camAt = shots(keys);
if (Math.abs(tBack - tClose) > 1e-3) console.warn('station.js 的 marks.close 应该等于讲完退回全景的时间：', tBack.toFixed(2));

// —— 声音和画面事件（window.EV，mix.py 用 neo/audio/cues.py 按名字读）——
const EV = [];
EV.push({ t: .5, type: 'title' });
EV.push({ t: SPEC.marks.lift, type: 'lift', up: 1, d: 2.6 }, { t: tClose, type: 'lift', up: 0, d: 2.6 });
for (const s of STEPS) {
  EV.push({ t: s.t0 + .3, type: 'step', n: s.n });
  for (const c of s.calls) EV.push({ t: (typeof c.dt[0] === 'number' ? s.t0 + c.dt[0] : T(c.dt[0])), type: 'callout', id: c.id });
}
for (let i = 1; i < keys.length; i++) if (keys[i][0] - keys[i - 1][0] > .5 && JSON.stringify(keys[i][1]) !== JSON.stringify(keys[i - 1][1])) EV.push({ t: keys[i - 1][0], type: 'cam', d: keys[i][0] - keys[i - 1][0] });
for (const id of ['taxi', 'A', 'B']) {
  const v = SPEC.vehicles.find(x => x.id === id);
  EV.push({ t: v.arrive[0], type: 'arrive', k: id, d: v.arrive[1] - v.arrive[0] }, { t: v.arrive[1], type: 'stop', k: id });
  if (v.doors) EV.push({ t: v.doors[0], type: 'doors', k: id, open: 1 }, { t: v.doors[1], type: 'doors', k: id, open: 0 });
  if (v.depart) EV.push({ t: v.depart[0], type: 'depart', k: id, d: v.depart[1] - v.depart[0] });
}
for (const g of ['idGates', 'ticketGates', 'exitGates']) for (const [lane, a] of world.refs[g].schedule) EV.push({ t: a, type: 'gate', k: g, lane });
const hero = world.crowd.get('hero');
for (const s of hero.segs) if (s.kind === 'bagOff') EV.push({ t: s.t0, type: 'belt', d: s.bag.dur });
EV.push({ t: T('@hero.sit') + .1, type: 'sit' }, { t: T('@hero.esc'), type: 'ride', d: world.refs.esc.length / world.refs.esc.speed });
EV.push({ t: T('@hero.boarded'), type: 'board' });
EV.push({ t: tClose + .8, type: 'dusk', d: 2.0 });
for (const [i, b] of ['hall', 'lamps', 'overpass', 'platform', 'passage', 'trains'].entries()) EV.push({ t: world.glow.batches.get(b).on, type: 'lights', i, k: b });
EV.push({ t: tEnd, type: 'end' });
EV.sort((a, b) => a.t - b.t);
EV.forEach(e => { e.t = +e.t.toFixed(3); if (e.d != null) e.d = +e.d.toFixed(3); });

// —— 2D 讲解层 ——
const proj = p => rig.project(p, W, H);
// 标签放在锚点的左边或右边，远离画面中心；y 跟着锚点但不出安全区
function labelFor(anchor, side) {
  const [x, y] = anchor; const lx = side === 'right' ? Math.min(W - 420, Math.max(x + 230, 1180)) : Math.max(420, Math.min(x - 230, 740));
  return [lx, clamp(y - 90, 230, H - 150)];
}
function drawOverlay(t) {
  O.begin();
  // 标题卡（开场）
  const aT = env(t, .3, 6.6, .5, .5);
  if (aT > 0) O.card('title', '一座高铁站怎么运转', 'How a High-Speed Station Works', { a: aT, x: 120, y: 900 });
  // 步骤
  for (const s of STEPS) {
    const a = env(t, s.t0 + .3, s.t1, .45, .35);
    if (a <= 0) continue;
    O.badge('step' + s.n, s.n, s.cn, s.en, { a });
    for (const c of s.calls) {
      const c0 = typeof c.dt[0] === 'number' ? s.t0 + c.dt[0] : T(c.dt[0]), c1 = Math.min(s.t1, typeof c.dt[1] === 'number' ? s.t0 + c.dt[1] : T(c.dt[1]));
      const ca = env(t, c0, c1, .1, .35) * a, grow = seg(t, c0, c0 + .6);
      if (ca <= 0) continue;
      const p = proj(c.at); O.callout(c.id, p, labelFor(p, c.side), c.cn, c.en, { a: ca, grow });
    }
  }
  // 片尾卡：片名 + NEO-Cine（夜里，字用浅色）
  const aE = seg(t, tEnd, tEnd + .6);
  if (aE > 0) {
    O.card('end', '一座高铁站怎么运转', 'How a High-Speed Station Works', { a: aE, x: 120, y: 880, color: '#f3efe4' });
    O.line('sign', 'NEO-Cine', { a: seg(t, tEnd + .5, tEnd + 1.1), x: W - 120, y: H - 96, size: 30, align: 'right', color: '#f3efe4', weight: 700 });
  }
}

// —— 每一帧 ——
function frame(t) {
  rig.set(camAt(t));
  if (renderer) {
    const st = lights.stateAt(world.lightKeys, t); lights.apply(st);
    document.body.style.background = st.bg;
    world.update(t, st.night);
    // 候车大屏：主角起身去检票时，第一行变成检票的颜色
    world.refs.screen.highlight(0, t > T('@hero.sit') + 1.0);
    const sz = rig.shot.size, close = clamp((24 - sz) / 16);
    post.set({ tilt: { center: .5, half: lerp(.26, .1, close), soft: lerp(.3, .22, close), maxR: lerp(3, 7, close), amount: 1 }, bloom: .75 * st.night, ao: 1 });
    post.render();
  }
  drawOverlay(t);
}
window.DUR = DUR; window.EV = EV;
window.TEXTS = () => O.texts();
window.render = t => frame(t);
// 调试用：在浏览器控制台里查模型、镜头、后期（渲染不依赖它们）
window.WORLD = world; world.__cam = rig.camera; world.__post = post; world.__lights = lights; window.MARKS = world.marks; window.STEPS = STEPS.map(s => ({ n: s.n, t0: +s.t0.toFixed(2), t1: +s.t1.toFixed(2) }));
frame(0);
if (renderer) { renderer.compile(scene, rig.camera); frame(0); }
window.READY = true;
