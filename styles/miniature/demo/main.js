// 福田站，切开看 · 成片
// 一块切开的福田站模型放在薄底座上：正交（长焦）机位，环境反射 + 主光阴影 + GTAO 接触阴影 + 移轴模糊；任何一帧都只由 t 决定。
// 渲染设置（物理材质、RoomEnvironment 环境反射、ACES、GTAO）照用户《福田站 · 精致微缩 v003》的 main.ts，改成按时间渲染。
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { clamp, lerp } from '/core/lib.js';
import { NIGHT as GLOWS, walk } from './kit.js';
import { createModel, LEVEL, HALF } from './model.js';
import { DUR, CAM, LIFT, GAP, BUS, METRO, HSR, NIGHT, LIGHTS, CITY_ON, CARDS, LAYERS, END } from './timeline.js';

const W = innerWidth, H = innerHeight, K = H / 1080, Q = new URLSearchParams(location.search), TEXT_ONLY = Q.get('textonly') === '1';
await Promise.all(['700 40px NotoSC', '500 40px NotoSC', '600 40px NotoSC', '600 30px Inter', '400 30px Inter'].map(f => document.fonts.load(f, '福田站深圳高铁地铁公交2011FUTIAN')));
const cityData = await (await fetch('data/city.json')).json();

// ---------- 渲染器、后期 ----------
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(2); renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.localClippingEnabled = true; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);
const ov = document.getElementById('ov'); ov.width = W; ov.height = H; const g = ov.getContext('2d');

const scene = new THREE.Scene();
const DAY = new THREE.Color('#ecebe5'), DUSK = new THREE.Color('#8f9ab2'), NITE = new THREE.Color('#121c24'); scene.background = DAY.clone();
const pm = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment(); scene.environment = pm.fromScene(room, .04).texture; room.dispose(); pm.dispose();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 260);
const sun = new THREE.DirectionalLight('#fff0d9', 3.3); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 32, bottom: -30, near: 1, far: 160 }); sun.shadow.normalBias = .026; sun.shadow.bias = -.00015; sun.shadow.radius = 3;
scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight('#e9f2f8', '#9eaa99', .8), rim = new THREE.DirectionalLight('#d4e8f3', .85); rim.position.set(25, 15, -23);
const amb = new THREE.AmbientLight('#fff6e6', .14); scene.add(hemi, rim, amb);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({ color: '#405459', opacity: .14 }));
floor.rotation.x = -Math.PI / 2; floor.position.y = -4.52; floor.receiveShadow = true; scene.add(floor);

const M = createModel(cityData); scene.add(M.root);

const target = new THREE.WebGLRenderTarget(W * 2, H * 2, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, target); composer.setPixelRatio(2); composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const ao = new GTAOPass(scene, camera, W * 2, H * 2); ao.updateGtaoMaterial({ radius: .55, distanceExponent: 1, thickness: .8, distanceFallOff: 1, scale: 1, samples: 16 }); ao.blendIntensity = .75;
ao.setSceneClipBox(new THREE.Box3(new THREE.Vector3(-14.5, -4.6, -20), new THREE.Vector3(15.5, 26, 8.5)));   // 只在模型周围算 AO：正交机位下背景处会出脏点
composer.addPass(ao); if (Q.get('noao')) ao.enabled = false; if (Q.get('nofloor')) floor.visible = false;
// 移轴：画面上下两条带按离焦点的距离做高斯模糊（先横后竖），让模型读成"桌上的小东西"
const TILT = {
  uniforms: { tDiffuse: { value: null }, dir: { value: new THREE.Vector2(1, 0) }, amount: { value: 0 }, focus: { value: .5 }, band: { value: .16 }, res: { value: new THREE.Vector2(W * 2, H * 2) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 dir, res; uniform float amount, focus, band; varying vec2 vUv;
    void main(){ float d = abs(vUv.y - focus); float k = smoothstep(band, band + .32, d) * amount; float r = k * 9.0;
      vec4 s = vec4(0.); float ws = 0.;
      for (int i = -6; i <= 6; i++) { float x = float(i) / 6.0; float w = exp(-x * x * 2.2); s += texture2D(tDiffuse, vUv + dir * x * r / res) * w; ws += w; }
      gl_FragColor = s / ws; }`,
};
const tiltH = new ShaderPass(TILT), tiltV = new ShaderPass(TILT); tiltV.uniforms.dir.value.set(0, 1);
// 夜里一层很轻的辉光（窗和灯带）；白天关掉
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0, .45, .9); composer.addPass(bloom);
composer.addPass(tiltH); composer.addPass(tiltV); composer.addPass(new OutputPass());

// ---------- 缓动、轨道 ----------
const EASE = { lin: u => u, io: u => u < .5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2, o: u => 1 - (1 - u) ** 3 };
function track(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const a = keys[i - 1], b = keys[i], u = (t - a[0]) / (b[0] - a[0]); return lerp(a[1], b[1], EASE[b[2] || 'lin'](u)); }
  return keys[keys.length - 1][1];
}
const seg = (t, a, b) => clamp((t - a) / (b - a));
// 进站：匀减速停到 stop；出站：从 stop 匀加速离开
function drive(v, t) {
  if (t < v.in[0]) return v.from;
  if (t < v.in[1]) { const u = seg(t, v.in[0], v.in[1]); return v.stop + (v.from - v.stop) * (1 - u) ** 2; }
  if (t < v.out[0]) return v.stop;
  const u = seg(t, v.out[0], v.out[1]); return v.stop + (v.to - v.stop) * u * u;
}

// ---------- 镜头 ----------
const D2R = Math.PI / 180, CS = { tilt: 0, h: 10 };
function setCamera(t) {
  let i = 1; while (i < CAM.length - 1 && t > CAM[i][0]) i++;
  const a = CAM[i - 1], b = CAM[i], u = EASE[b[2] || 'io'](clamp((t - a[0]) / (b[0] - a[0])));
  const L = k => lerp(a[1][k], b[1][k], u), h = Math.exp(lerp(Math.log(a[1].h), Math.log(b[1].h), u));
  const yaw = L('yaw') * D2R, pitch = L('pitch') * D2R, tg = new THREE.Vector3(L('x'), L('y'), L('z'));
  const dir = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
  camera.position.copy(tg).addScaledVector(dir, 110); camera.up.set(0, 1, 0); camera.lookAt(tg);
  camera.left = -h * W / H; camera.right = h * W / H; camera.top = h; camera.bottom = -h; camera.near = 40; camera.far = 190; camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
  CS.tilt = L('tilt'); CS.h = h;
}
const proj = p => { const v = p.clone().project(camera); return [(v.x * .5 + .5) * W, (-v.y * .5 + .5) * H]; };

// ---------- 场面：层、车、人、灯 ----------
function setScene(t) {
  const lg = track(LIFT.ground, t), lm = track(LIFT.metro, t);
  M.floors.ground.position.y = LEVEL.ground + 2 * GAP * lg; M.floors.metro.position.y = LEVEL.metro + GAP * lm; M.floors.platform.position.y = LEVEL.platform;
  for (const e of M.escal) { const gap = e.k === 'metro' ? 2 * GAP * lg - GAP * lm : GAP * lm; e.g.scale.y = (e.rise + gap) / e.rise; }
  M.bus.position.x = drive(BUS, t); M.metro.position.x = drive(METRO, t); M.hsr.position.x = drive(HSR, t);
  for (const w of M.walkers) walk(w, t);
  // 天色：白天 → 黄昏（太阳压低、变暖）→ 夜里（冷的月光，室内和窗亮起来）
  const n = track(NIGHT, t), dusk = Math.sin(Math.PI * clamp(n * 1.25)) * (n < .8 ? 1 : 0), on = seg(t, LIGHTS, LIGHTS + .12);
  const bg = DAY.clone().lerp(DUSK, clamp(n * 2)).lerp(NITE, clamp(n * 1.6 - .6)); scene.background = bg;      // 白天 → 蓝调时刻 → 夜
  const az = lerp(-.55, -1.05, n), el = lerp(.95, .35, n);
  sun.position.set(Math.sin(az) * 40, 42 * el + 6, Math.cos(az) * 40).add(new THREE.Vector3(0, 0, -4)); sun.target.position.set(0, 0, -4);
  sun.color.set('#fff0d9').lerp(new THREE.Color('#ffb070'), dusk * .8).lerp(new THREE.Color('#9fb6dd'), clamp(n * 1.6 - .6));
  sun.intensity = lerp(3.3, .4, clamp(n * 1.15)); hemi.intensity = lerp(.8, .1, n); rim.intensity = lerp(.85, .25, n); amb.intensity = lerp(.14, .03, n);
  hemi.color.set('#e9f2f8').lerp(new THREE.Color('#4a5f80'), n); scene.environmentIntensity = lerp(.65, .09, n);
  bloom.strength = .38 * n; bloom.enabled = n > .01;
  floor.material.opacity = lerp(.14, .05, n);
  for (const e of GLOWS) e.m.emissiveIntensity = lerp(e.day, e.night, on);
  for (const l of M.lights) l.intensity = lerp(0, 26, on);
  M.city.mats.forEach((m, i) => { m.emissiveIntensity = 1.5 * seg(t, CITY_ON[i], CITY_ON[i] + .25); });
}

// ---------- 字 ----------
const INK = '#22343a', RED = '#a52d28';
const F = { big: `700 ${54 * K}px Inter`, cn: `600 ${34 * K}px NotoSC`, sub: `500 ${24 * K}px NotoSC`, en: `500 ${17 * K}px Inter`, tag: `700 ${22 * K}px Inter`,
  t1: `700 ${76 * K}px NotoSC`, lay: `600 ${26 * K}px NotoSC`, layEn: `500 ${14 * K}px Inter`, end: `700 ${64 * K}px NotoSC`, endEn: `500 ${18 * K}px Inter`, sign: `600 ${22 * K}px Inter` };
const LINEC = { 2: '#db6d1c', 3: '#00a2e1', 11: '#6a1d44' };
const eo = u => 1 - (1 - clamp(u)) ** 3;
let texts = [];
function txt(id, text, font, x, y, color, ls = 0, alpha = 1, pass = false) {      // 画一行字，并登记给 readcheck
  g.font = font; g.letterSpacing = ls + 'px'; g.fillStyle = color; g.globalAlpha = alpha; g.fillText(text, x, y);
  const w = g.measureText(text).width, m = parseFloat(font.split(' ')[1]); g.letterSpacing = '0px'; g.globalAlpha = 1;
  if (alpha > .98) texts.push({ id, text, x0: x, y0: y - m, x1: x + w, y1: y + m * .3, ...(pass ? { pass: true } : {}) });
  return w;
}
function drawCards(t) {
  const x0 = 96 * K, yb = H - 104 * K;
  for (const c of CARDS) {
    if (t < c.t0 || t > c.t1) continue;
    const a = eo(seg(t, c.t0, c.t0 + .5)) * (1 - eo(seg(t, c.t1 - .45, c.t1))), dy = (1 - a) * 14 * K, ink = INK;
    if (c.kind === 'title') {
      g.globalAlpha = a; g.fillStyle = RED; g.fillRect(x0, yb - 118 * K + dy, 10 * K, 10 * K); g.globalAlpha = 1;
      txt(c.id, c.cn, F.t1, x0 + 24 * K, yb - 40 * K + dy, ink, 4 * K, a);
      txt(c.id + '-sub', c.sub, F.sub, x0, yb + 6 * K + dy, ink, 2 * K, a);
      txt(c.id + '-en', c.en, F.en, x0, yb + 38 * K + dy, ink, 4 * K, a);
    } else if (c.kind === 'fact') {
      const y = c.id === 'metro' ? yb - 70 * K : yb;
      txt(c.id + '-big', c.big, F.big, x0, y - 54 * K + dy, ink, 1 * K, a);
      let x = x0;
      if (c.tag) for (const n of c.tag) { g.globalAlpha = a; g.fillStyle = LINEC[n]; g.fillRect(x, y - 30 * K + dy, 34 * K, 34 * K); g.fillStyle = '#fff'; g.font = F.tag; g.textAlign = 'center'; g.fillText(n, x + 17 * K, y - 5 * K + dy); g.textAlign = 'left'; g.globalAlpha = 1; x += 42 * K; }
      txt(c.id, c.cn, F.cn, x + (c.tag ? 8 * K : 0), y + dy, ink, 1 * K, a);
      txt(c.id + '-en', c.en, F.en, x0, y + 32 * K + dy, ink, 3 * K, a);
    } else {
      const y = yb + 34 * K; let x = x0;
      for (const n of c.tag) { g.globalAlpha = a; g.fillStyle = LINEC[n]; g.fillRect(x, y - 26 * K + dy, 34 * K, 34 * K); g.fillStyle = '#fff'; g.font = F.tag; g.textAlign = 'center'; g.fillText(n, x + 17 * K, y - 1 * K + dy); g.textAlign = 'left'; g.globalAlpha = 1; x += 42 * K; }
      const w = txt(c.id, c.cn, F.cn, x + 8 * K, y + dy, ink, 1 * K, a);
      txt(c.id + '-en', c.en, F.en, x + 8 * K + w + 18 * K, y + dy, ink, 3 * K, a);
    }
  }
}
// 层名：从每层右前角拉一根细引线到右边一列字
function drawLayers(t) {
  if (t < LAYERS.t0 || t > LAYERS.t1) return;
  const xr = W - 470 * K;
  LAYERS.items.forEach((it, i) => {
    const a = eo(seg(t, LAYERS.t0 + i * .25, LAYERS.t0 + i * .25 + .5)) * (1 - eo(seg(t, LAYERS.t1 - .45, LAYERS.t1)));
    const fl = M.floors[it.k], [px, py] = proj(new THREE.Vector3(HALF + .2, fl.position.y + it.y, 5.6));
    const ty = py; g.globalAlpha = a; g.strokeStyle = INK; g.lineWidth = 1.2 * K;
    g.beginPath(); g.moveTo(px + 6 * K, py); g.lineTo(lerp(px + 6 * K, xr - 16 * K, a), ty); g.stroke();
    g.fillStyle = INK; g.beginPath(); g.arc(px + 6 * K, py, 3.5 * K, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
    txt('layer-' + it.k, it.cn, F.lay, xr, ty + 2 * K, INK, 1 * K, a);
    txt('layer-en-' + it.k, it.en, F.layEn, xr, ty + 26 * K, INK, 3 * K, a);
  });
}
function drawEnd(t) {
  if (t < END.t0) return;
  const a = eo(seg(t, END.t0, END.t0 + .8)), b = eo(seg(t, END.t0 + .5, END.t0 + 1.3)), x0 = 96 * K, yb = H - 150 * K;
  g.globalAlpha = a; g.fillStyle = '#e8c27a'; g.fillRect(x0, yb - 92 * K, 10 * K, 10 * K); g.globalAlpha = 1;
  txt('end', END.cn, F.end, x0 + 24 * K, yb, '#f2efe6', 4 * K, a);
  txt('end-en', END.en, F.endEn, x0, yb + 42 * K, '#d8dcd8', 5 * K, b);
  txt('sign', END.sign, F.sign, x0, yb + 96 * K, '#f2efe6', 3 * K, b);
}
function drawText(t) { g.clearRect(0, 0, W, H); texts = []; drawCards(t); drawLayers(t); drawEnd(t); }

// ---------- 事件（mix.py 读）----------
const EV = [], ev = (type, t, o = {}) => EV.push({ type, t: +t.toFixed(3), ...o });
for (let i = 1; i < CAM.length; i++) if ((CAM[i][2] || 'io') === 'io') ev('cam', CAM[i - 1][0], { d: +(CAM[i][0] - CAM[i - 1][0]).toFixed(3), h0: CAM[i - 1][1].h, h1: CAM[i][1].h });
for (const [k, keys] of Object.entries(LIFT)) for (let i = 1; i < keys.length; i++) if (keys[i][1] !== keys[i - 1][1]) {
  ev('lift', keys[i - 1][0], { k, d: +(keys[i][0] - keys[i - 1][0]).toFixed(3), up: keys[i][1] > keys[i - 1][1] ? 1 : 0 });
  ev('settle', keys[i][0], { k, up: keys[i][1] > keys[i - 1][1] ? 1 : 0 });
}
for (const [k, v] of [['bus', BUS], ['metro', METRO], ['hsr', HSR]]) {
  ev('arrive', v.in[0], { k, d: +(v.in[1] - v.in[0]).toFixed(3) }); ev('stop', v.in[1], { k }); ev('depart', v.out[0], { k, d: +(v.out[1] - v.out[0]).toFixed(3) });
}
ev('dusk', NIGHT[0][0], { d: NIGHT[1][0] - NIGHT[0][0] }); ev('lights', LIGHTS); CITY_ON.forEach((t, i) => ev('window', t, { i }));
for (const c of CARDS) ev('card', c.t0, { id: c.id }); ev('card', LAYERS.t0, { id: 'layers' }); ev('title', END.t0);
EV.sort((a, b) => a.t - b.t); window.EV = EV;

// ---------- 一帧 ----------
window.DUR = DUR;
window.TEXTS = t => { setScene(t); setCamera(clamp(t, 0, DUR)); drawText(clamp(t, 0, DUR)); return texts; };
window.render = (t) => {
  t = clamp(t, 0, DUR);
  setScene(t); M.root.updateMatrixWorld(true); setCamera(t); drawText(t);
  if (TEXT_ONLY) return;
  const fy = .5; tiltH.uniforms.amount.value = tiltV.uniforms.amount.value = CS.tilt; tiltH.uniforms.focus.value = tiltV.uniforms.focus.value = fy;
  tiltH.uniforms.band.value = tiltV.uniforms.band.value = lerp(.3, .14, CS.tilt);
  composer.render();
};
// 先把着色器都编译好，第一帧不卡
await renderer.compileAsync(scene, camera);
window.render(0);
window.READY = true;
