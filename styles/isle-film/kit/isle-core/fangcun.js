/* ============================================================================
   方寸之境 · 引擎（core/fangcun.js）

   这里是整个系列固定不变的部分：玻璃容器（立方体 / 钟罩 / 球）、背景（深空 / 桌面 / 纯色）、灯光与昼夜、
   薄雾 / 光柱 / 尘埃、后期（辉光、移轴、暗角、颗粒）、界面和主循环，
   外加一套造境用的工具（地形、水、植被散布、通用小件）。

   每一境只写自己的 world.js，通过 build(F) 里的 F 调用这些工具。
   做某一境时不要改这个文件：想要的东西引擎里没有，就在 world.js 里用 THREE 直接做。
   ============================================================================ */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

/* ---------- 网址参数（给验证和出封面用，见 references/制作与避坑.md） ---------- */
const Q = new URLSearchParams(location.search);
const qf = (k, d) => { const v = parseFloat(Q.get(k)); return Number.isFinite(v) ? v : d; };
const SHOT = Q.get('shot') === '1';
// 影片模式（film=1，或页面在加载引擎前设了 window.FANGCUN_FILM = true）：不跑实时循环，只在调用 FANGCUN.frame(...) 时画一帧，
// 画面完全由绝对时间 t、时辰和镜头参数决定。给 NEO-Cine 的方寸影像风格逐帧出片用，接口见 references/制作与避坑.md 第九节
const FILM = Q.get('film') === '1' || (typeof window !== 'undefined' && window.FANGCUN_FILM === true);

/* ---------- 数学与随机 ---------- */
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const gs = (dx, dz, r) => Math.exp(-(dx * dx + dz * dz) / (r * r));
const C = hex => new THREE.Color(hex);
function mulberry32(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function makeNoise(seed){
  const rnd = mulberry32(seed);
  const p = new Uint8Array(256); for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--){ const j = Math.floor(rnd() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
  const perm = new Uint8Array(512); for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const gr = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
  const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
  return (xin, yin) => {
    const s = (xin + yin) * F2, i = Math.floor(xin + s), j = Math.floor(yin + s);
    const t = (i + j) * G2, x0 = xin - (i - t), y0 = yin - (j - t);
    const i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255; let n = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0; if (t0 > 0){ const g = gr[perm[ii + perm[jj]] & 7]; t0 *= t0; n += t0 * t0 * (g[0] * x0 + g[1] * y0); }
    let t1 = 0.5 - x1 * x1 - y1 * y1; if (t1 > 0){ const g = gr[perm[ii + i1 + perm[jj + j1]] & 7]; t1 *= t1; n += t1 * t1 * (g[0] * x1 + g[1] * y1); }
    let t2 = 0.5 - x2 * x2 - y2 * y2; if (t2 > 0){ const g = gr[perm[ii + 1 + perm[jj + 1]] & 7]; t2 *= t2; n += t2 * t2 * (g[0] * x2 + g[1] * y2); }
    return 70 * n;
  };
}

/* ---------- 世界尺度（全系列统一，不要改） ---------- */
const HALF = 5.0;        // 地块半宽：x、z 都在 [-5, 5]
const GL = 5.06;         // 玻璃半宽
const FLOOR = -5.0;      // 土层底面
const N = 241;           // 高度网格分辨率
const STEP = 2 * HALF / (N - 1);
const CN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十'];

const GLSL_NOISE = `
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x), mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x), f.y); }
float fbm2(vec2 p){ float s=0., a=0.5; for(int i=0;i<4;i++){ s+=a*vn(p); p=p*2.03+vec2(1.7,9.2); a*=0.5;} return s; }
`;
const GLSL_HEIGHT = `
uniform sampler2D uHeight;
float terrainY(vec2 xz){ vec2 uv = ((xz+5.0)/10.0*${N - 1}.0+0.5)/${N}.0; return texture2D(uHeight, clamp(uv,0.0,1.0)).r; }
`;
const $ = s => document.querySelector(s);

function startFangcun(WORLD){
  const meta = Object.assign({
    title: '方寸之境', no: 1, name: '', tagline: '悬浮于深空的一方玻璃微缩世界',
    seed: 20261109, noiseSeeds: null, ground: -2.4, startHour: 7.2, speed: 0.27,
  }, WORLD.meta || {});
  const G = meta.ground;          // 地表基准高度（地形函数返回的高度都叠在它上面）

  /* ---------- 外观预设：容器、背景、光效。在 world.js 的 meta.look 里选；网址参数可以临时覆盖，方便比较 ---------- */
  const LOOKS = { container: ['cube', 'dome', 'sphere'], backdrop: ['space', 'desk', 'plain'], glow: ['normal', 'soft', 'strong'] };
  const look = Object.assign({ container: 'cube', backdrop: 'space', glow: 'normal', backdropColor: '#10131a' }, meta.look || {});
  for (const k of Object.keys(LOOKS)){
    if (Q.get(k)) look[k] = Q.get(k);
    if (!LOOKS[k].includes(look[k])){ console.warn(`方寸之境：look.${k} 没有“${look[k]}”这个预设，可选 ${LOOKS[k].join(' / ')}，已改用 ${LOOKS[k][0]}`); look[k] = LOOKS[k][0]; }
  }
  const ROUND = look.container !== 'cube', SPHERE = look.container === 'sphere';
  const DESK = look.backdrop === 'desk', PLAIN = look.backdrop === 'plain';
  const RIN = 5.44, RS = 5.5;                       // 球：内壁半径、玻璃半径
  let FOOT = 5.0;                                   // 圆形容器的地块半径（球的在 F.terrain 里按外圈高度重算）
  let rimH = meta.rim ?? 0.25;                      // 球：地块外圈收到这个高度，才能和玻璃贴合
  const ceilingY = r => SPHERE ? Math.sqrt(Math.max(RIN * RIN - r * r, 0)) : ROUND ? Math.sqrt(Math.max(GL * GL - r * r, 0)) : GL;   // 某个半径处玻璃顶的高度
  const inFoot = (x, z, m = 0.28) => ROUND ? Math.hypot(x, z) < FOOT - m : Math.max(Math.abs(x), Math.abs(z)) < HALF - m;            // 在地块里面吗
  const rowR = y => SPHERE ? Math.min(FOOT, Math.sqrt(Math.max(RIN * RIN - y * y, 0)) * 0.992) : FOOT;                               // 剖面在高度 y 处的半径
  const insideExpr = v => SPHERE ? `smoothstep(0.0, 0.7, ${(RIN - 0.1).toFixed(3)} - length(${v}))`
    : ROUND ? `(smoothstep(${FOOT.toFixed(3)}, ${(FOOT - 0.65).toFixed(3)}, length(${v}.xz)) * smoothstep(0.0, 0.7, ${(GL - 0.1).toFixed(3)} - length(vec3(${v}.x, max(${v}.y, 0.0), ${v}.z))))`
    : `(smoothstep(5.05, 4.4, abs(${v}.x)) * smoothstep(5.05, 4.4, abs(${v}.z)) * smoothstep(5.05, 4.0, ${v}.y))`;
  const GLOW = { soft: [0.2, 0.55, 0.96, 0.7], normal: [0.34, 0.6, 0.9, 1.0], strong: [0.62, 0.72, 0.8, 1.45] }[look.glow];   // [辉光强度, 半径, 阈值, 玻璃边光倍数]
  const rand = mulberry32(meta.seed);
  const R = (a, b) => a + (b - a) * rand();
  const pick = arr => arr[Math.floor(rand() * arr.length)];
  const ns = meta.noiseSeeds || [meta.seed % 9973 + 7, meta.seed % 7919 + 13];
  const n2 = makeNoise(ns[0]), n2b = makeNoise(ns[1]);
  const fbm = (x, z, o = 4) => { let a = 0.5, f = 1, s = 0, nm = 0; for (let i = 0; i < o; i++){ s += a * n2(x * f, z * f); nm += a; a *= 0.5; f *= 2.03; } return s / nm; };
  const ridged = (x, z, o = 4) => { let a = 0.5, f = 1, s = 0, nm = 0; for (let i = 0; i < o; i++){ let v = 1 - Math.abs(n2b(x * f, z * f)); v *= v; s += a * v; nm += a; a *= 0.5; f *= 2.1; } return s / nm; };

  if (SHOT || FILM) document.body.classList.add('shot');
  // 页面文字
  document.title = meta.name ? `${meta.title} · ${meta.name}` : meta.title;
  $('#title h1').textContent = meta.title;
  $('#sub').textContent = meta.name ? `第${CN[meta.no] || meta.no}境 · ${meta.name}` : '';
  $('#tag').textContent = meta.tagline || '';

  /* =========================================================
     渲染器 / 场景 / 相机
     ========================================================= */
  const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: SHOT || FILM });
  renderer.setPixelRatio(DPR);
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const safeAspect = () => (innerWidth > 0 && innerHeight > 0) ? innerWidth / innerHeight : 1.5;   // 页面在后台加载时窗口可能是 0×0
  const camera = new THREE.PerspectiveCamera(20, safeAspect(), 0.5, 3000);   // 窄视角：接近等距，又保留移轴需要的纵深
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.06; controls.enablePan = false;
  controls.minDistance = 14; controls.maxDistance = 110;
  controls.autoRotate = true; controls.autoRotateSpeed = 0.32;
  controls.minPolarAngle = 0.2; controls.maxPolarAngle = 1.9;
  controls.target.set(qf('tx', 0), qf('ty', -0.35), qf('tz', 0));
  const fitBase = () => { const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)); const [fh, fw] = ROUND ? [16.5, 15] : [19.5, 18]; return Math.max(fh / (2 * t), fw / (2 * t * camera.aspect)); };   // 容器连同四周留白都装进画面
  const fitDistance = () => fitBase() * qf('dist', 1);
  const AZ = qf('az', meta.azimuth ?? 0.66), POL = qf('pol', meta.polar ?? 1.06);
  const skipIntro = SHOT || FILM || Q.get('intro') === '0';
  camera.position.setFromSpherical(new THREE.Spherical(fitDistance() * (skipIntro ? 1 : 1.7), POL, AZ)).add(controls.target);

  const root = new THREE.Group(); scene.add(root);
  const U = { time: { value: 0 } };

  const hemi = new THREE.HemisphereLight(0xcfe6ff, 0x6e7350, 0.9); root.add(hemi);
  const key = new THREE.DirectionalLight(0xfff0dd, 3.0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -7.6, right: 7.6, top: 7.6, bottom: -7.6, near: 1, far: 50 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 3;
  root.add(key); root.add(key.target);
  const rim = new THREE.DirectionalLight(0xbfd2ff, 1.0); scene.add(rim);

  /* =========================================================
     造境工具 F
     ========================================================= */
  const lifeFns = [], lightFns = [];
  const heightU = { value: null }, surfU = { value: null };
  const F = {
    THREE, meta, G, HALF, GL, FLOOR, N, STEP, root, scene, camera, U,
    rand, R, pick, n2, n2b, fbm, ridged, makeNoise, gs, clamp, smooth, lerp, C,
    mergeGeometries, mergeVertices, GLSL_NOISE, GLSL_HEIGHT, heightU, surfU,
    T: null, kit: {},
    look, ROUND, inFoot,
    /** 某处玻璃顶的高度（实际 y）。圆形容器里越靠边越矮，高的东西要先问它 */
    ceiling: (x, z) => ceilingY(Math.hypot(x, z)),
    /** 这个点在容器里面吗（留 m 的余量） */
    fits: (x, y, z, m = 0.2) => inFoot(x, z, m) && y < ceilingY(Math.hypot(x, z)) - m,
    /** 地块的半径（立方体是半边长） */
    footR: () => ROUND ? FOOT : HALF,
    /** 给自己写的着色器用：float insideC(vec3 p)，在容器里是 1，靠近玻璃渐变到 0 */
    glslInside: () => `float insideC(vec3 p){ return ${insideExpr('p')}; }`,
    /** 每帧调用：fn(t 秒, L 当前光照, dt) */
    life: fn => lifeFns.push(fn),
    /** 光照变化时调用：fn(L)。L.night 为 0~1 的夜晚程度，L.key / L.sky 等是当前颜色 */
    onLight: fn => lightFns.push(fn),
  };

  /* ---------- 地形：高度场 + 河流 + 湖泊 + 海面 + 平整地基 ---------- */
  F.terrain = (opt) => {
    const base = opt.base, sea = opt.sea || null;
    if (SPHERE){ if (sea) rimH = Math.min(rimH, sea.level - 0.45); FOOT = Math.sqrt(RIN * RIN - (G + rimH) * (G + rimH)) * 0.985; }
    const LK = (opt.lakes || []).map(l => ({ depth: 0.45, level: null, ...l }));
    const lakeE = (l, x, z) => { const dx = (x - l.x) / l.rx, dz = (z - l.z) / l.rz; return Math.sqrt(dx * dx + dz * dz) * (1 + 0.08 * n2(x * 1.3, z * 1.3)); };
    const CELL = 0.4;
    const RV = (opt.rivers || []).map(r => {
      const PS = r.samples || 900;
      const curve = new THREE.CatmullRomCurve3(r.points.map(p => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal');
      const pts = curve.getSpacedPoints(PS - 1), ds = curve.getLength() / (PS - 1);
      const [w0, w1] = r.width || [0.055, 0.245], [d0, d1] = r.depth || [0.07, 0.17];
      const raw = new Float32Array(PS), level = new Float32Array(PS), wid = new Float32Array(PS), dep = new Float32Array(PS);
      for (let k = 0; k < PS; k++){ const t = k / (PS - 1); raw[k] = base(pts[k].x, pts[k].z); wid[k] = w0 + (w1 - w0) * Math.pow(t, 0.75); dep[k] = d0 + (d1 - d0) * t; }
      // 水位取沿途地面的“只降不升”：遇到陡坎自然成瀑布，遇到小丘自然切成峡谷
      level[0] = raw[0] - 0.05;
      for (let k = 1; k < PS; k++) level[k] = Math.min(level[k - 1], raw[k] - 0.05);
      const tmp = new Float32Array(PS);
      for (let pass = 0; pass < 5; pass++){
        for (let k = 0; k < PS; k++){ const a = level[Math.max(k - 1, 0)], b = level[Math.min(k + 1, PS - 1)]; tmp[k] = (a + 2 * level[k] + b) / 4; }
        for (let k = 0; k < PS; k++) level[k] = Math.min(tmp[k], raw[k] - 0.03);
      }
      for (let k = 1; k < PS; k++) level[k] = Math.min(level[k], level[k - 1]);
      const lake = r.lake != null ? LK[r.lake] : null; let kLake = PS - 1;
      if (lake){
        for (let k = 0; k < PS; k++){ if (lakeE(lake, pts[k].x, pts[k].z) < 1.0){ kLake = k; break; } }
        if (lake.level == null) lake.level = level[kLake];
        for (let k = 0; k < PS; k++) level[k] = k >= kLake ? lake.level : Math.max(level[k], lake.level);
      }
      let kSea = PS;                                     // 河线入海的位置：之后的采样点不再修河床，也不画河带
      if (sea){
        for (let k = 0; k < PS; k++) level[k] = Math.max(level[k], sea.level);
        for (let k = 0; k < PS; k++){ if (raw[k] < sea.level - 0.02){ kSea = k; break; } }
      }
      // 落差最大处记为瀑布；陡处起泡沫并向下游拖一段
      const foam = new Float32Array(PS); let maxS = 0, kMax = 0;
      for (let k = 0; k < PS; k++){
        const s = (level[Math.max(k - 1, 0)] - level[Math.min(k + 1, PS - 1)]) / (2 * ds);
        if (s > maxS){ maxS = s; kMax = k; }
        foam[k] = Math.max(smooth(0.35, 2.4, s), k > 0 ? foam[k - 1] * 0.965 : 0);
      }
      let kb = kMax; while (kb < PS - 1 && (level[kb] - level[kb + 1]) / ds > 0.25) kb++;
      let kt = kMax; while (kt > 0 && (level[kt - 1] - level[kt]) / ds > 0.25) kt--;
      const grid = new Map();
      for (let k = 0; k < Math.min(PS, kSea + 2); k++){ const id = Math.floor(pts[k].x / CELL) + ',' + Math.floor(pts[k].z / CELL); if (!grid.has(id)) grid.set(id, []); grid.get(id).push(k); }
      return { pts, PS, ds, level, wid, dep, foam, lake, kLake, kSea, grid,
        fallBase: new THREE.Vector3(pts[kb].x, G + level[kb], pts[kb].z), fallTop: new THREE.Vector3(pts[kt].x, G + level[kt], pts[kt].z), fallHeight: level[kt] - level[kb] };
    });
    LK.forEach(l => { if (l.level == null) l.level = base(l.x, l.z) - 0.08; });
    const pads = (opt.pads || []).map(p => ({ r: 0.6, ...p, h: base(p.x, p.z) }));
    const nearest = (x, z, maxD = 1.0) => {
      const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL); let best = maxD * maxD, bk = -1, br = null;
      for (const rv of RV) for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++){
        const list = rv.grid.get((cx + a) + ',' + (cz + b)); if (!list) continue;
        for (const k of list){ const dx = rv.pts[k].x - x, dz = rv.pts[k].z - z, d = dx * dx + dz * dz; if (d < best){ best = d; bk = k; br = rv; } }
      }
      return bk < 0 ? null : { d: Math.sqrt(best), k: bk, r: br };
    };
    const Hgt = new Float32Array(N * N), wetL = new Float32Array(N * N).fill(-99);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++){
      const x = -HALF + i * STEP, z = -HALF + j * STEP, idx = j * N + i;
      let h = base(x, z);
      for (const p of pads){ const dc = Math.hypot(x - p.x, z - p.z); if (dc < p.r) h = lerp(p.h, h, smooth(p.r * 0.42, p.r, dc)); }
      let rf = 0; const q = nearest(x, z);
      if (q){
        const w = q.r.wid[q.k], lv = q.r.level[q.k], d = q.d;
        const prof = d < w ? lv - q.r.dep[q.k] * (1 - (d / w) * (d / w)) : lv + (d - w) * 1.0 + (d - w) * (d - w) * 1.5;
        rf = 1 - smooth(w * 1.3, w * 1.3 + 0.3, d);        // 河道附近强制成河床剖面（能抬能挖），外侧只挖不抬
        h = lerp(Math.min(h, prof), prof, rf);
        if (d < w * 1.7) wetL[idx] = lv;
      }
      for (const l of LK){
        const e = lakeE(l, x, z); if (e >= 2.6) continue;
        const prof = e < 1 ? l.level - l.depth * (1 - e * e) : l.level + (e - 1) * 1.1;
        const lf = rf > 0.01 ? 0 : 1 - smooth(1.05, 1.4, e);
        h = lerp(Math.min(h, prof), prof, lf);
        if (e < 1.18) wetL[idx] = Math.max(wetL[idx], l.level);
      }
      if (ROUND){                                          // 圆形容器：山不能顶出玻璃，越靠边压得越低；球的外圈收到同一个高度
        const r = Math.hypot(x, z), cap = ceilingY(Math.min(r, FOOT)) - G - 0.4;
        if (h > cap - 0.5) h = cap - 0.5 + 0.5 * Math.tanh((h - (cap - 0.5)) / 0.5);
        if (SPHERE) h = lerp(h, rimH, smooth(FOOT * 0.78, FOOT * 0.97, r));
      }
      if (sea && h < sea.level) wetL[idx] = Math.max(wetL[idx], sea.level);
      Hgt[idx] = h;
    }
    const getH = (x, z) => {
      const fx = clamp((x + HALF) / STEP, 0, N - 1.001), fz = clamp((z + HALF) / STEP, 0, N - 1.001);
      const i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
      return lerp(lerp(Hgt[j * N + i], Hgt[j * N + i + 1], tx), lerp(Hgt[(j + 1) * N + i], Hgt[(j + 1) * N + i + 1], tx), tz);
    };
    const slopeAt = (x, z) => { const e = 0.05; const dx = (getH(x + e, z) - getH(x - e, z)) / (2 * e), dz = (getH(x, z + e) - getH(x, z - e)) / (2 * e); return 1 - 1 / Math.sqrt(dx * dx + dz * dz + 1); };
    const wetAt = (x, z) => { const i = Math.round((x + HALF) / STEP), j = Math.round((z + HALF) / STEP); return (i < 0 || j < 0 || i >= N || j >= N) ? -99 : wetL[j * N + i]; };
    const lakeDist = (x, z) => { let m = Infinity; for (const l of LK) m = Math.min(m, lakeE(l, x, z)); return m; };
    const isDry = (x, z, m = 0.04) => {
      if (lakeDist(x, z) < 1.12) return false;
      const wl = wetAt(x, z); if (wl > -50 && getH(x, z) < wl + m) return false;
      const q = nearest(x, z, 0.5); if (q && q.d < q.r.wid[q.k] * 1.25) return false;
      return true;
    };
    // 两张高度纹理：height 是地形（水面算深浅用），surf 是地形与水面取高者（雾、光柱做软交接用）
    const makeTex = withWater => {
      const data = new Uint16Array(N * N);
      for (let i = 0; i < N * N; i++) data[i] = THREE.DataUtils.toHalfFloat(G + (withWater ? Math.max(Hgt[i], wetL[i] + 0.02) : Hgt[i]));
      const t = new THREE.DataTexture(data, N, N, THREE.RedFormat, THREE.HalfFloatType);
      t.unpackAlignment = 1;   // 每行 482 字节不是 4 的倍数，不设这一项纹理会逐行错位
      t.magFilter = t.minFilter = THREE.LinearFilter; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true;
      return t;
    };
    heightU.value = makeTex(false); surfU.value = makeTex(true);
    F.T = { H: Hgt, wet: wetL, rivers: RV, lakes: LK, sea, pads, nearest, lakeE, lakeDist, getH, getY: (x, z) => G + getH(x, z), slopeAt, wetAt, isDry };
    return F.T;
  };

  /* ---------- 土层色带 ---------- */
  F.makeStrata = (pal = {}) => {
    const canyon = (pal.canyon || ['#b8764a', '#d49c66', '#a5653f', '#e2b886', '#93593d', '#c8875a']).map(C);
    const rocks = (pal.rocks || ['#8a8079', '#9a8f86', '#6f6862', '#a59a90']).map(C);
    const soil = (pal.soil || [[0, '#3d2a1d'], [-0.3, '#5e3f29'], [-0.62, '#8f5e3b'], [-0.9, '#c18c58'], [-1.06, '#8a5638'], [-1.42, '#d6ad78'], [-1.6, '#9a6c4c'], [-1.98, '#6c635c'], [-2.3, '#4f4844']]).map(s => [s[0], C(s[1])]);
    soil.push([-99, soil[soil.length - 1][1]]);
    const rockLine = pal.rockLine ?? 2.7, band = pal.band ?? 0.16;
    /** yy 是相对地表基准 G 的高度：≥0 是山体断面（色带循环），<0 是地下土层 */
    return (yy, x, z, out) => {
      if (yy >= 0){
        if (yy > rockLine){ const k = Math.floor(yy / 0.22 + n2(x * 0.7, z * 0.7) * 0.8); return out.copy(rocks[((k % rocks.length) + rocks.length) % rocks.length]); }
        const f = yy / band + n2(x * 0.6 + z * 0.4, yy) * 0.6, k = Math.floor(f), t = smooth(0.78, 1.0, f - k), n = canyon.length;
        return out.copy(canyon[((k % n) + n) % n]).lerp(canyon[(((k + 1) % n) + n) % n], t);
      }
      const w = yy + 0.06 * n2(x * 1.1 + z * 0.9, 3.3) + 0.04 * Math.sin((x + z) * 1.7);
      for (let b = 0; b < soil.length - 1; b++){
        if (w <= soil[b][0] && w > soil[b + 1][0]){ const t = smooth(soil[b + 1][0] + 0.04, soil[b + 1][0], w); return out.copy(soil[b][1]).lerp(soil[b + 1][1], t * 0.5); }
      }
      return out.copy(soil[soil.length - 1][1]);
    };
  };
  F.strata = F.makeStrata();

  /* ---------- 地表网格 + 四面土层剖面 + 底板 ---------- */
  F.ground = (opt = {}) => {
    const T = F.T, strata = opt.strata || F.strata;
    const shore = { sand: '#d8c59a', bed: '#8a8a66', deepBed: '#3f5e5c', ...(opt.shore || {}) };
    const sand = C(shore.sand), bed = C(shore.bed), deepBed = C(shore.deepBed);
    const topsoil = (opt.topsoil || ['#3d2a1d', '#5e3f29']).map(C);
    if (ROUND){                                            // 钟罩和球：极坐标网格的圆形地块 + 一圈剖面
      const NR = 112, NS = 360, c = new THREE.Color(), pos = [], col = [], ind = [], edge = [];
      for (let i = 0; i <= NR; i++) for (let j = 0; j < NS; j++){
        const r = FOOT * i / NR, a = j / NS * Math.PI * 2, x = r * Math.cos(a), z = r * Math.sin(a), h = T.getH(x, z);
        pos.push(x, G + h, z);
        c.set('#6f9c48');
        if (opt.color) opt.color(c, x, z, h, T.slopeAt(x, z), -1);
        const wl = T.wetAt(x, z);
        if (wl > -50){ const dd = h - wl; if (dd < 0) c.copy(bed).lerp(deepBed, smooth(0, -0.3, dd)); else if (dd < 0.07) c.lerp(sand, (1 - dd / 0.07) * 0.8); }
        col.push(c.r, c.g, c.b); if (i === NR) edge.push(c.r, c.g, c.b);
      }
      for (let i = 0; i < NR; i++) for (let j = 0; j < NS; j++){ const j2 = (j + 1) % NS, a = i * NS + j, b = (i + 1) * NS + j, cc = i * NS + j2, d = (i + 1) * NS + j2; ind.push(a, cc, b, b, cc, d); }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      geo.setIndex(ind); geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: opt.roughness ?? 0.86, metalness: 0 }));
      mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh);
      const ROWS = 90, yBot = SPHERE ? -RIN * 0.992 : FLOOR, sp = [], sc = [], si = [];      // 剖面：钟罩是一圈直壁，球是顺着玻璃收下去的一只碗
      for (let j = 0; j <= NS; j++){
        const jj = j % NS, a = jj / NS * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), ex = FOOT * ca, ez = FOOT * sa, top = G + T.getH(ex, ez);
        for (let r = 0; r <= ROWS; r++){
          const y = lerp(top, yBot, r / ROWS), rr = rowR(y), depth = top - y;
          sp.push(rr * ca, y, rr * sa);
          if (depth < 0.035) c.setRGB(edge[jj * 3], edge[jj * 3 + 1], edge[jj * 3 + 2]);
          else if (depth < 0.24 && y - G < 1.0) c.copy(topsoil[0]).lerp(topsoil[1], depth / 0.24 * 0.5);
          else strata(y - G, ex, ez, c);
          const sh = 0.92 + 0.08 * n2(ex * 9 + ez * 9, y * 9);
          sc.push(c.r * sh, c.g * sh, c.b * sh);
        }
      }
      for (let j = 0; j < NS; j++) for (let r = 0; r < ROWS; r++){ const a = j * (ROWS + 1) + r, b = a + 1, cc = a + ROWS + 1, d = cc + 1; si.push(a, b, cc, cc, b, d); }
      const sg = new THREE.BufferGeometry();
      sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
      sg.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3));
      sg.setIndex(si); sg.computeVertexNormals();
      const skirt = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, side: THREE.DoubleSide }));
      skirt.receiveShadow = true; skirt.castShadow = true; root.add(skirt);
      if (!SPHERE){ const bottom = new THREE.Mesh(new THREE.CircleGeometry(FOOT, 72), new THREE.MeshStandardMaterial({ color: 0x2f2a27, roughness: 1 })); bottom.rotation.x = Math.PI / 2; bottom.position.y = FLOOR; root.add(bottom); }
      F.groundMesh = mesh;
      return mesh;
    }
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * N * 3);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++){ const idx = j * N + i; pos[idx * 3] = -HALF + i * STEP; pos[idx * 3 + 1] = G + T.H[idx]; pos[idx * 3 + 2] = -HALF + j * STEP; }
    const ind = new Uint32Array((N - 1) * (N - 1) * 6); let p = 0;
    for (let j = 0; j < N - 1; j++) for (let i = 0; i < N - 1; i++){ const a = j * N + i, b = (j + 1) * N + i, c = j * N + i + 1, d = (j + 1) * N + i + 1; ind[p++] = a; ind[p++] = b; ind[p++] = c; ind[p++] = c; ind[p++] = b; ind[p++] = d; }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setIndex(new THREE.BufferAttribute(ind, 1));
    geo.computeVertexNormals();
    const nrm = geo.attributes.normal.array, col = new Float32Array(N * N * 3), c = new THREE.Color();
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++){
      const idx = j * N + i, x = -HALF + i * STEP, z = -HALF + j * STEP, h = T.H[idx], slope = 1 - nrm[idx * 3 + 1];
      c.set('#6f9c48');
      if (opt.color) opt.color(c, x, z, h, slope, idx);
      const wl = T.wet[idx];
      if (wl > -50){ const dd = h - wl; if (dd < 0) c.copy(bed).lerp(deepBed, smooth(0, -0.3, dd)); else if (dd < 0.07) c.lerp(sand, (1 - dd / 0.07) * 0.8); }
      col[idx * 3] = c.r; col[idx * 3 + 1] = c.g; col[idx * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: opt.roughness ?? 0.86, metalness: 0 }));
    mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh);
    // 四面剖面：顶上一圈跟地表同色，往下是表土，再往下是色带
    const ROWS = 90, geos = [];
    for (const side of [i => [i, 0], i => [N - 1, i], i => [N - 1 - i, N - 1], i => [0, N - 1 - i]]){
      const sp = [], sc = [], si = [];
      for (let s = 0; s < N; s++){
        const [i, j] = side(s), idx = j * N + i, x = -HALF + i * STEP, z = -HALF + j * STEP, top = G + T.H[idx];
        for (let r = 0; r <= ROWS; r++){
          const y = lerp(top, FLOOR, r / ROWS), depth = top - y;
          sp.push(x, y, z);
          if (depth < 0.035) c.setRGB(col[idx * 3], col[idx * 3 + 1], col[idx * 3 + 2]);
          else if (depth < 0.24 && y - G < 1.0) c.copy(topsoil[0]).lerp(topsoil[1], depth / 0.24 * 0.5);
          else strata(y - G, x, z, c);
          const sh = 0.92 + 0.08 * n2(x * 9 + z * 9, y * 9);
          sc.push(c.r * sh, c.g * sh, c.b * sh);
        }
      }
      for (let s = 0; s < N - 1; s++) for (let r = 0; r < ROWS; r++){ const a = s * (ROWS + 1) + r, b = a + 1, cc = a + ROWS + 1, d = cc + 1; si.push(a, b, cc, cc, b, d); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3));
      g.setIndex(si); g.computeVertexNormals(); geos.push(g);
    }
    const skirt = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, side: THREE.DoubleSide }));
    skirt.receiveShadow = true; skirt.castShadow = true; root.add(skirt);
    const bottom = new THREE.Mesh(new THREE.PlaneGeometry(2 * HALF, 2 * HALF), new THREE.MeshStandardMaterial({ color: 0x2f2a27, roughness: 1 }));
    bottom.rotation.x = Math.PI / 2; bottom.position.y = FLOOR; root.add(bottom);
    F.groundMesh = mesh;
    return mesh;
  };

  /* ---------- 水：河带（含瀑布）、湖面、海面 ---------- */
  const waterUniforms = {
    uTime: U.time, uHeight: heightU,
    uKeyDir: { value: new THREE.Vector3(0, 1, 0) }, uKeyCol: { value: new THREE.Color() }, uSky: { value: new THREE.Color() },
    uShallow: { value: C('#7fd6c6') }, uDeep: { value: C('#1e5a78') },
  };
  const waterVS = `
  attribute float aFoam; attribute float aFade;
  varying vec3 vLP; varying vec3 vWP; varying vec2 vUv; varying float vFoam; varying float vFade; varying vec3 vN;
  void main(){
    vUv = uv; vFoam = aFoam; vFade = aFade; vLP = position;
    vec4 wp = modelMatrix * vec4(position, 1.0); vWP = wp.xyz;
    vN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
  const waterFS = `
  uniform float uTime; uniform vec3 uKeyDir, uKeyCol, uSky, uShallow, uDeep; uniform float uRiver;
  varying vec3 vLP; varying vec3 vWP; varying vec2 vUv; varying float vFoam; varying float vFade; varying vec3 vN;
  ${GLSL_NOISE}
  ${GLSL_HEIGHT}
  float ripple(vec2 p){ return vn(p + vec2(uTime*0.35, 0.0)) + 0.5*vn(p*2.3 - vec2(0.0, uTime*0.6)); }
  void main(){
    float depth = vLP.y - terrainY(vLP.xz);
    vec3 V = normalize(cameraPosition - vWP);
    vec2 fp = uRiver > 0.5 ? vec2(vUv.x*3.0, vUv.y*7.0 - uTime*2.4) : vLP.xz*9.0;
    float e = 0.06;
    float r0 = ripple(fp), rx = ripple(fp + vec2(e,0.)), rz = ripple(fp + vec2(0.,e));
    vec3 N = normalize(vN); if (dot(N, V) < 0.0) N = -N;
    vec3 nrm = normalize(N + vec3(r0 - rx, 0.0, r0 - rz) / e * 0.05);
    float fres = 0.04 + 0.96 * pow(1.0 - max(dot(nrm, V), 0.0), 5.0);
    float dShade = smoothstep(0.0, 0.34, depth);
    vec3 L = normalize(uKeyDir);
    float diff = max(dot(N, L), 0.0) * 0.6 + 0.4;
    vec3 body = mix(uShallow, uDeep, dShade) * (uSky * 0.55 + uKeyCol * 0.32 * diff);
    vec3 col = mix(body, uSky * 1.05, fres * 0.85);
    float nh = max(dot(nrm, normalize(L + V)), 0.0);
    col += uKeyCol * (pow(nh, 220.0) * 3.0 + pow(nh, 36.0) * 0.12);
    float shore = 1.0 - smoothstep(0.0, 0.045 + 0.035 * vn(vLP.xz*22.0 + uTime*0.4), depth);
    float streak = smoothstep(0.42, 0.85, vn(vec2(vUv.x*14.0, vUv.y*2.6 - uTime*4.5)));
    float foam = clamp(shore * 0.75 + vFoam * (0.55 + 0.6 * streak), 0.0, 1.0);
    col = mix(col, uSky * 0.75 + uKeyCol * 0.45 + 0.02, foam);
    float alpha = mix(0.5, 0.9, dShade) + fres * 0.1;
    alpha = max(alpha, foam * 0.96) * vFade;
    alpha *= mix(smoothstep(-0.01, 0.012, depth), 1.0, clamp(vFoam*2.0, 0.0, 1.0));
    gl_FragColor = vec4(col, alpha);
  }`;
  const waterMaterial = isRiver => new THREE.ShaderMaterial({
    uniforms: { ...waterUniforms, uRiver: { value: isRiver ? 1 : 0 } },
    vertexShader: waterVS, fragmentShader: waterFS, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const flatWater = (g, y) => {
    const n = g.attributes.position.count;
    g.setAttribute('aFoam', new THREE.Float32BufferAttribute(new Float32Array(n), 1));
    g.setAttribute('aFade', new THREE.Float32BufferAttribute(new Float32Array(n).fill(1), 1));
    const m = new THREE.Mesh(g, waterMaterial(false)); m.renderOrder = 2; root.add(m); return m;
  };
  /** 湖面那样的一片平面：贴着某个高度的椭圆，超出地块的部分收回到地块边上。自己做冰面、熔岩面、泥沼时用它，换容器才不会露出角来 */
  F.flatGeo = (l, y, k = 1.35, seg = 72) => {
    const g = new THREE.CircleGeometry(1, seg); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position, lim = (ROUND ? FOOT : HALF) - 0.02;
    for (let i = 0; i < p.count; i++){
      let x = l.x + p.getX(i) * l.rx * k, z = l.z + p.getZ(i) * l.rz * k;
      if (ROUND){ const r = Math.hypot(x, z); if (r > lim){ x *= lim / r; z *= lim / r; } } else { x = clamp(x, -lim, lim); z = clamp(z, -lim, lim); }
      p.setXYZ(i, x, y, z);
    }
    return g;
  };
  F.water = (opt = {}) => {
    const T = F.T;
    if (opt.shallow) waterUniforms.uShallow.value.set(opt.shallow);
    if (opt.deep) waterUniforms.uDeep.value.set(opt.deep);
    for (const rv of T.rivers){
      let kEnd = rv.PS - 1;
      for (let k = 0; k < rv.PS; k++){
        const p = rv.pts[k];
        if ((rv.lake && T.lakeE(rv.lake, p.x, p.z) < 0.9) || k >= rv.kSea || Math.abs(p.x) > HALF - 0.03 || Math.abs(p.z) > HALF - 0.03){ kEnd = k; break; }
      }
      if (kEnd < 3) continue;
      const centers = [], acc = [0];
      for (let k = 0; k <= kEnd; k++) centers.push(new THREE.Vector3(rv.pts[k].x, G + rv.level[k] + 0.012, rv.pts[k].z));
      for (let k = 1; k <= kEnd; k++) acc.push(acc[k - 1] + centers[k].distanceTo(centers[k - 1]));
      const total = acc[kEnd], pos = [], uv = [], fo = [], fa = [], ind = [];
      for (let k = 0; k <= kEnd; k++){
        const p0 = rv.pts[Math.max(k - 1, 0)], p1 = rv.pts[Math.min(k + 1, rv.PS - 1)];
        let tx = p1.x - p0.x, tz = p1.z - p0.z; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
        const hw = rv.wid[k] * 1.3, c = centers[k];
        pos.push(c.x - tz * hw, c.y, c.z + tx * hw, c.x + tz * hw, c.y, c.z - tx * hw);
        uv.push(0, acc[k], 1, acc[k]);
        const fade = smooth(0, 0.25, acc[k]) * (1 - smooth(total - 0.4, total, acc[k]));
        fo.push(rv.foam[k], rv.foam[k]); fa.push(fade, fade);
        if (k < kEnd){ const a = 2 * k; ind.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setAttribute('aFoam', new THREE.Float32BufferAttribute(fo, 1));
      g.setAttribute('aFade', new THREE.Float32BufferAttribute(fa, 1));
      g.setIndex(ind); g.computeVertexNormals();
      const m = new THREE.Mesh(g, waterMaterial(true)); m.renderOrder = 2; root.add(m);
    }
    for (const l of T.lakes){
      flatWater(F.flatGeo(l, G + l.level + 0.004));
    }
    if (T.sea){
      const y = G + T.sea.level + 0.004, wp = [], wi = [];
      if (ROUND){                                          // 圆形容器：圆形海面 + 一圈水体剖面
        const seaR = SPHERE ? Math.sqrt(RIN * RIN - y * y) * 0.992 : FOOT;
        const g = new THREE.CircleGeometry(seaR, 120); g.rotateX(-Math.PI / 2); g.translate(0, y, 0); flatWater(g);
        const NSW = 180, RW = 8;
        for (let j = 0; j <= NSW; j++){
          const a = j / NSW * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), yb = Math.min(G + T.getH(FOOT * ca, FOOT * sa), y);
          for (let r = 0; r <= RW; r++){ const yy = lerp(y, yb, r / RW), rr = SPHERE ? Math.sqrt(Math.max(RIN * RIN - yy * yy, 0)) * 0.992 : FOOT; wp.push(rr * ca, yy, rr * sa); }
        }
        for (let j = 0; j < NSW; j++) for (let r = 0; r < RW; r++){ const a = j * (RW + 1) + r, b = a + 1, cc = a + RW + 1, d = cc + 1; wi.push(a, b, cc, cc, b, d); }
      } else {
        const g = new THREE.PlaneGeometry(2 * HALF, 2 * HALF, 96, 96); g.rotateX(-Math.PI / 2); g.translate(0, y, 0); flatWater(g);
        // 海水的四面剖面：让玻璃里看得见一整块“水体”
        [i => [i, 0], i => [N - 1, i], i => [N - 1 - i, N - 1], i => [0, N - 1 - i]].forEach(side => {
          const b0 = wp.length / 3;
          for (let s = 0; s < N; s++){ const [i, j] = side(s), x = -HALF + i * STEP, z = -HALF + j * STEP; wp.push(x, y, z, x, Math.min(G + T.H[j * N + i], y), z); }
          for (let s = 0; s < N - 1; s++){ const a = b0 + s * 2; wi.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
        });
      }
      const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3)); wg.setIndex(wi); wg.computeVertexNormals();
      const wall = new THREE.Mesh(wg, new THREE.MeshStandardMaterial({ color: opt.deep || '#1e5a78', transparent: true, opacity: 0.6, roughness: 0.15, side: THREE.DoubleSide, depthWrite: false }));
      wall.renderOrder = 2; root.add(wall);
    }
  };

  /* ---------- 小工具 ---------- */
  /** 给材质加随风摆动（顶点越高摆得越大）。几何体按“单位高度 1”来建，再用实例缩放 */
  F.wind = (mat, strength, freq = 1.6) => {
    mat.onBeforeCompile = sh => {
      sh.uniforms.uTime = U.time;
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 ip = instanceMatrix[3].xyz;
        #else
          vec3 ip = vec3(0.0);
        #endif
        float hh = max(position.y, 0.0);
        float w = sin(uTime*${freq.toFixed(2)} + ip.x*1.3 + ip.z*0.9) + 0.5*sin(uTime*${(freq * 1.9).toFixed(2)} + ip.x*2.7 - ip.z*1.1);
        transformed.x += w * ${strength.toFixed(3)} * hh * hh;
        transformed.z += w * ${(strength * 0.6).toFixed(3)} * hh * hh;`);
    };
    return mat;
  };
  /** 黏土团块：parts = [[半径, x, y, z], ...]，几个球揉在一起，表面带一点手捏的起伏 */
  F.blob = parts => mergeGeometries(parts.map(([r, x, y, z]) => {
    const g = new THREE.IcosahedronGeometry(r, 2), p = g.attributes.position;
    for (let i = 0; i < p.count; i++){
      const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i);
      const k = 1 + 0.08 * Math.sin(vx * 13 + vy * 7) * Math.cos(vz * 11 - vy * 5);
      p.setXYZ(i, vx * k + x, vy * k + y, vz * k + z);
    }
    g.deleteAttribute('uv'); return g;
  }));
  const clayCache = {};
  /** 黏土材质（同色同参数共用一份） */
  F.clay = (hex, extra = {}) => { const k = hex + JSON.stringify(extra); return clayCache[k] || (clayCache[k] = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.72, ...extra })); };
  F.shadowAll = o => { o.traverse(c => { if (c.isMesh){ c.castShadow = true; c.receiveShadow = true; } }); return o; };
  F.place = (o, x, z, lift = 0) => { o.position.set(x, F.T.getY(x, z) + lift, z); return o; };
  /** 在 (x0,z0) 附近找一块干燥的平地 */
  F.findSpot = (x0, z0, r, maxSlope = 0.3) => { for (let i = 0; i < 80; i++){ const x = x0 + R(-r, r), z = z0 + R(-r, r); if (inFoot(x, z, 0.3) && F.T.isDry(x, z, 0.05) && F.T.slopeAt(x, z) < maxSlope) return [x, z]; } return [x0, z0]; };
  /** 随机撒点：accept(x, z, h) 返回真就收下。返回 [[x, z, h], ...] */
  F.scatter = ({ max, tries = max * 40, range = 4.72, accept }) => {
    const out = [];
    for (let i = 0; i < tries && out.length < max; i++){ const x = R(-range, range), z = R(-range, range), h = F.T.getH(x, z); if (inFoot(x, z) && accept(x, z, h)) out.push([x, z, h]); }
    return out;
  };
  const _o = new THREE.Object3D();
  /** 实例化网格：set(o, item, i) 里设置 o.position / rotation / scale，返回颜色（可不返回） */
  F.instances = (geo, mat, list, set, opt = {}) => {
    const im = new THREE.InstancedMesh(geo, mat, Math.max(list.length, 1)); im.count = list.length;
    list.forEach((it, i) => { _o.position.set(0, 0, 0); _o.rotation.set(0, 0, 0); _o.scale.set(1, 1, 1); const c = set(_o, it, i); _o.updateMatrix(); im.setMatrixAt(i, _o.matrix); if (c) im.setColorAt(i, c); });
    im.castShadow = opt.cast !== false; im.receiveShadow = opt.receive !== false; root.add(im); return im;
  };

  /* ---------- 雾与萤火：世界文件往里加粒子，收尾时统一生成 ---------- */
  const mistList = [], fireflyList = [];
  /** 加一团雾。type 0 是贴地漂移的薄雾，type 1 是往上升的水雾 / 炊烟（rise 为上升高度，tint 1 变灰） */
  F.mist = (x, y, z, size, alpha, o = {}) => mistList.push([x, y, z, size, alpha, o.type || 0, o.rise || 0, o.tint || 0]);
  F.firefly = (x, y, z, size = R(0.04, 0.07)) => fireflyList.push([x, y, z, size]);

  /* ---------- 云 ---------- */
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0xffffff, emissiveIntensity: 0.1, transparent: true, opacity: 0.94 });
  const clouds = [];
  F.clouds = ({ count = 7, y = [2.5, 3.7], r = [1.2, 3.0], scale = [1.25, 1.75] } = {}) => {
    for (let i = 0; i < count; i++){
      const parts = [], n = 7 + Math.floor(rand() * 5), L = R(0.7, 1.15);
      for (let k = 0; k < n; k++){ const t = k / (n - 1) - 0.5, rr = R(0.16, 0.26) * (1 - Math.abs(t) * 0.9); parts.push([rr, t * L + R(-0.05, 0.05), Math.max(0, R(0, 0.12) + (0.5 - Math.abs(t)) * 0.18), R(-0.16, 0.16)]); }
      const g = F.blob(parts), p = g.attributes.position;
      for (let k = 0; k < p.count; k++) if (p.getY(k) < 0) p.setY(k, p.getY(k) * 0.35);
      const c = new THREE.Mesh(g, cloudMat); c.castShadow = true; root.add(c);
      c.userData = { r: R(r[0], r[1]), a: R(0, 6.28), y: R(y[0], y[1]), w: R(0.012, 0.028) * (rand() < 0.5 ? 1 : -1), ph: R(0, 10) };
      if (ROUND){ const u = c.userData, cr = SPHERE ? RIN : GL; u.y = Math.min(u.y, cr - 1.4); u.r = Math.min(u.r, Math.max(0.3, Math.sqrt(Math.max(cr * cr - (u.y + 0.6) * (u.y + 0.6), 0)) - 1.5)); }   // 圆顶下面，云要往里、往下收
      c.scale.setScalar(R(scale[0], scale[1])); clouds.push(c);
    }
  };

  /* ---------- 通用小件 kit：只做配角。每一境的主角生灵、地标、主体植被要在 world.js 里新做 ---------- */
  const kit = F.kit;
  const geoCache = {};
  kit.treeGeo = kind => geoCache[kind] || (geoCache[kind] = kind === 'conifer' ? (() => {
    const a = new THREE.ConeGeometry(0.33, 0.5, 9).translate(0, 0.42, 0), b = new THREE.ConeGeometry(0.26, 0.42, 9).translate(0, 0.66, 0), c = new THREE.ConeGeometry(0.18, 0.38, 9).translate(0, 0.9, 0);
    [a, b, c].forEach(g => g.deleteAttribute('uv'));
    return { canopy: mergeGeometries([a, b, c]), trunk: new THREE.CylinderGeometry(0.045, 0.065, 0.3, 6).translate(0, 0.15, 0) };
  })() : {
    canopy: F.blob([[0.32, 0, 0.7, 0], [0.24, 0.18, 0.58, 0.08], [0.22, -0.16, 0.6, -0.1], [0.21, 0.03, 0.9, 0.05], [0.18, -0.05, 0.62, 0.2]]),
    trunk: new THREE.CylinderGeometry(0.05, 0.085, 0.6, 7).translate(0, 0.3, 0),
  });
  const canopyMat = F.wind(new THREE.MeshStandardMaterial({ roughness: 0.78 }), 0.035, 1.3);
  /** 种树：list 是 [[x,z,h],...]，geo 用 kit.treeGeo('broadleaf'|'conifer') 或自己做的 {canopy, trunk} */
  kit.trees = (list, geo, colorFn, size = [0.26, 0.42], trunkColor = '#6b4a33') => {
    const sc = list.map(() => [R(size[0], size[1]), R(0.9, 1.2), R(-0.06, 0.06), R(0, Math.PI * 2), R(-0.06, 0.06)]);
    const set = withColor => (o, [x, z, h], i) => { const s = sc[i]; o.position.set(x, G + h - 0.02, z); o.rotation.set(s[2], s[3], s[4]); o.scale.set(s[0], s[0] * s[1], s[0]); return withColor ? colorFn(x, z, h) : null; };
    F.instances(geo.canopy, canopyMat, list, set(true));
    F.instances(geo.trunk, F.clay(trunkColor, { roughness: 0.9 }), list, set(false));
  };
  /** 草丛：accept(x,z,h) 决定哪里长，color(x,z,h) 返回每丛的颜色 */
  kit.grass = ({ max = 9500, accept, color, size = [0.045, 0.085] }) => {
    const pos = [], col = [], nrm = [];
    for (let b = 0; b < 4; b++){
      const a = b / 4 * Math.PI + R(-0.2, 0.2), ca = Math.cos(a), sa = Math.sin(a), w = 0.09;
      pos.push(-ca * w, 0, -sa * w, ca * w, 0, sa * w, R(-0.3, 0.3), R(0.7, 1.0), R(-0.3, 0.3));
      col.push(0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1.18, 1.18, 1.1);
      for (let k = 0; k < 3; k++) nrm.push(0, 1, 0);   // 法线统一朝上，草和地面受光一致
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    const mat = F.wind(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.9 }), 0.25, 2.1);
    const list = F.scatter({ max, tries: max * 5, range: 4.9, accept });
    return F.instances(g, mat, list, (o, [x, z, h]) => {
      const s = R(size[0], size[1]); o.position.set(x, G + h - 0.006, z); o.rotation.y = R(0, 6.28); o.scale.set(s * R(0.8, 1.3), s * R(0.8, 1.4), s * R(0.8, 1.3));
      return color(x, z, h).multiplyScalar(R(0.85, 1.12));
    }, { cast: false });
  };
  /** 野花：小圆点 */
  kit.flowers = ({ max = 1100, accept, colors = ['#fff7ec', '#ffd0dc', '#ffe066', '#c9b8ff', '#ff9f8a', '#ffffff', '#ffb3c8'], size = [0.011, 0.019] }) => {
    const pal = colors.map(C), list = F.scatter({ max, tries: max * 20, range: 4.85, accept });
    return F.instances(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 0.6, emissive: 0x222018 }), list, (o, [x, z, h]) => {
      const s = R(size[0], size[1]); o.position.set(x, G + h + R(0.025, 0.05), z); o.scale.set(s, s * 0.8, s); return pick(pal);
    }, { cast: false, receive: false });
  };
  /** 石头：list 是 [[x, z, 大小], ...] */
  kit.rocks = (list, colors = ['#8d857e', '#a39a90', '#6f6862', '#9b8a7a', '#b8afa4']) => {
    let g = new THREE.DodecahedronGeometry(1, 0); g.deleteAttribute('uv'); g.deleteAttribute('normal'); g = mergeVertices(g);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * R(0.8, 1.15), p.getY(i) * R(0.75, 1.1), p.getZ(i) * R(0.8, 1.15));
    g.computeVertexNormals();
    const pal = colors.map(C);
    return F.instances(g, new THREE.MeshStandardMaterial({ roughness: 0.85 }), list, (o, [x, z, s]) => {
      o.position.set(x, F.T.getY(x, z) - s * 0.25, z); o.rotation.set(R(0, 3), R(0, 6.28), R(0, 3)); o.scale.set(s * R(0.9, 1.4), s * R(0.6, 1.0), s * R(0.9, 1.3)); return pick(pal);
    });
  };
  /** 盘旋的鸟群 */
  kit.birds = (n = 8, { center = [0.4, 0.6], r = [1.4, 2.6], y = [0.9, 1.9], colors = ['#f4f1ea', '#3e3b40', '#e9e2d6'] } = {}) => {
    for (let i = 0; i < n; i++){
      const g = new THREE.Group(), m = F.clay(pick(colors)), wings = [];
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.008, 0.026, 3, 6), m); body.rotation.z = Math.PI / 2; g.add(body);
      for (const sd of [-1, 1]){ const pv = new THREE.Group(); g.add(pv); const w = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.0025, 0.05), m); w.position.set(0, 0, sd * 0.026); pv.add(w); wings.push([pv, sd]); }
      g.traverse(c => { if (c.isMesh) c.castShadow = true; }); root.add(g);
      const rr = R(r[0], r[1]), yy = R(y[0], y[1]), w = R(0.18, 0.3), a0 = R(0, 6.28), ph = R(0, 10), cx = center[0] + R(-0.3, 0.3), cz = center[1] + R(-0.3, 0.3);
      F.life(t => {
        const a = a0 + t * w;
        g.position.set(cx + Math.cos(a) * rr, yy + Math.sin(t * 0.5 + ph) * 0.15, cz + Math.sin(a) * rr * 0.8);
        g.rotation.set(0, -a - Math.PI / 2, 0); g.rotateX(-0.35);
        const flap = Math.sin(t * 9 + ph) * 0.75 * (Math.sin(t * 0.7 + ph) > -0.4 ? 1 : 0.15);   // 偶尔滑翔
        for (const [pv, sd] of wings) pv.rotation.x = sd * flap;
      });
    }
  };
  /** 蝴蝶：只在白天出现。spots 是 [[x,z],...]，每个点上一只 */
  kit.butterflies = (spots, colors = ['#ffb347', '#7ec8ff', '#fff4d6', '#ffd84a', '#ff8fb8']) => {
    for (const [cx, cz] of spots){
      const color = pick(colors), g = new THREE.Group(), wings = [], ph = R(0, 20);
      const m = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.5, emissive: color, emissiveIntensity: 0.25 });
      for (const sd of [-1, 1]){ const pv = new THREE.Group(); g.add(pv); const w = new THREE.Mesh(new THREE.CircleGeometry(0.013, 10), m); w.scale.set(1, 1.3, 1); w.rotation.x = -Math.PI / 2; w.position.z = sd * 0.012; pv.add(w); wings.push([pv, sd]); }
      root.add(g);
      F.life((t, L) => {
        const x = cx + Math.sin(t * 0.37 + ph) * 0.28 + Math.sin(t * 1.3 + ph) * 0.05, z = cz + Math.cos(t * 0.29 + ph * 1.7) * 0.28;
        g.position.set(x, F.T.getY(x, z) + 0.09 + Math.sin(t * 2.1 + ph) * 0.04, z); g.rotation.y = t * 0.6 + ph;
        const flap = Math.sin(t * 22 + ph) * 1.1; for (const [pv, sd] of wings) pv.rotation.x = sd * flap;
        g.visible = L.night < 0.5; g.scale.setScalar(1 - L.night);
      });
    }
  };
  /** 贴地薄雾层。别让雾落在水面上：水面没有地形挡着，雾会堆成一片白 */
  kit.mistLayer = ({ count = 60, accept, lift = [0.12, 0.34], size = [0.9, 1.7], alpha = [0.09, 0.2], range = 4.3 }) => {
    let n = 0;
    for (let i = 0; i < count * 15 && n < count; i++){ const x = R(-range, range), z = R(-range, range), h = F.T.getH(x, z); if (!inFoot(x, z, 0.6) || !accept(x, z, h)) continue; F.mist(x, G + h + R(lift[0], lift[1]), z, R(size[0], size[1]), R(alpha[0], alpha[1])); n++; }
  };
  /** 往上升的一股：瀑布水雾、温泉蒸汽、炊烟（tint 1） */
  kit.plume = (pos, { count = 30, spread = [0.12, 0.1], size = [0.3, 0.55], alpha = [0.25, 0.4], rise = [0.7, 1.2], tint = 0 } = {}) => {
    for (let i = 0; i < count; i++) F.mist(pos.x + R(-spread[0], spread[0]), pos.y + R(0, 0.08), pos.z + R(-spread[1], spread[1]), R(size[0], size[1]), R(alpha[0], alpha[1]), { type: 1, rise: R(rise[0], rise[1]), tint });
  };
  /** 萤火虫：夜里才亮 */
  kit.fireflies = ({ max = 170, accept, lift = [0.05, 0.38] }) => {
    for (const [x, z, h] of F.scatter({ max, tries: max * 25, range: 4.6, accept })) F.firefly(x, G + h + R(lift[0], lift[1]), z);
  };

  /* =========================================================
     造这一境
     ========================================================= */
  WORLD.build(F);
  if (!F.T) throw new Error('world.js 的 build(F) 里必须调用 F.terrain(...)：每一境都要有一块带剖面的地');
  const T = F.T;

  /* =========================================================
     收尾：雾、光柱、尘埃、玻璃、深空、后期
     ========================================================= */
  const mistUniforms = { uTime: U.time, uHeight: surfU, uScale: { value: 1000 }, uColor: { value: new THREE.Color() }, uAmount: { value: 1 }, uCamR: { value: new THREE.Vector3(1, 0, 0) }, uCamU: { value: new THREE.Vector3(0, 1, 0) } };
  if (mistList.length){
    const g = new THREE.BufferGeometry(), col = i => mistList.map(m => m[i]);
    g.setAttribute('position', new THREE.Float32BufferAttribute(mistList.flatMap(m => [m[0], m[1], m[2]]), 3));
    g.setAttribute('aSize', new THREE.Float32BufferAttribute(col(3), 1));
    g.setAttribute('aAlpha', new THREE.Float32BufferAttribute(col(4), 1));
    g.setAttribute('aType', new THREE.Float32BufferAttribute(col(5), 1));
    g.setAttribute('aRise', new THREE.Float32BufferAttribute(col(6), 1));
    g.setAttribute('aTint', new THREE.Float32BufferAttribute(col(7), 1));
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(mistList.map(() => rand()), 1));
    const m = new THREE.ShaderMaterial({
      uniforms: mistUniforms, transparent: true, depthWrite: false,
      vertexShader: `
        attribute float aSize, aSeed, aType, aAlpha, aRise, aTint;
        uniform float uTime, uScale;
        varying float vAlpha, vSize, vSeed, vTint; varying vec3 vCenter;
        ${ROUND ? `vec2 footClamp(vec2 q){ float r = length(q); return r > ${(FOOT - 0.3).toFixed(3)} ? q * ${(FOOT - 0.3).toFixed(3)} / r : q; }` : `vec2 footClamp(vec2 q){ return clamp(q, -4.7, 4.7); }`}
        void main(){
          vec3 p = position; float s = aSize; float t = uTime;
          if (aType < 0.5){
            p.x += sin(t*0.05 + aSeed*6.28)*0.35; p.z += cos(t*0.04 + aSeed*4.1)*0.3; p.y += sin(t*0.1 + aSeed*10.0)*0.05;
            vAlpha = aAlpha;
          } else {
            float ph = fract(t*0.11 + aSeed);
            p.y += ph * aRise; p.x += sin(aSeed*20.0 + t*0.4)*0.12*ph; p.z += cos(aSeed*13.0 + t*0.3)*0.08*ph;
            s *= 0.55 + ph*1.1;
            vAlpha = aAlpha * smoothstep(0.0, 0.12, ph) * (1.0 - smoothstep(0.45, 1.0, ph));
          }
          p.xz = footClamp(p.xz);
          vCenter = p; vSize = s; vSeed = aSeed; vTint = aTint;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = min(s * uScale / -mv.z, 700.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform vec3 uColor, uCamR, uCamU; uniform float uAmount;
        varying float vAlpha, vSize, vSeed, vTint; varying vec3 vCenter;
        ${GLSL_NOISE}
        ${GLSL_HEIGHT}
        void main(){
          vec2 pc = gl_PointCoord - 0.5; float r = length(pc) * 2.0; if (r > 1.0) discard;
          vec3 fp = vCenter + uCamR * pc.x * vSize - uCamU * pc.y * vSize;
          float soft = smoothstep(0.0, 0.3, fp.y - terrainY(fp.xz));      // 贴近地面处淡出，避免粒子和地面交出硬边
          float n = fbm2(pc * 2.5 + vSeed * 17.0);
          float a = pow(1.0 - r, 1.7) * (0.45 + 0.75 * n) * vAlpha * uAmount * soft;
          gl_FragColor = vec4(mix(uColor, uColor * vec3(0.62, 0.6, 0.62), vTint), a);
        }`,
    });
    const mist = new THREE.Points(g, m); mist.renderOrder = 5; mist.frustumCulled = false; root.add(mist);
  }

  // 体积光柱：沿光线方向的一组圆柱公告板
  const shaftUniforms = { uTime: U.time, uHeight: surfU, uDir: { value: new THREE.Vector3(0, 1, 0) }, uCam: { value: new THREE.Vector3() }, uColor: { value: new THREE.Color() }, uI: { value: 1 } };
  {
    const SH = 11, P = [], corner = [], off = [], wd = [], sd = [], ind = [];
    for (let i = 0; i < SH; i++){
      const ox = R(-3.4, 3.4), oy = R(-3.0, 3.0), w = R(0.25, 0.85), s = rand();
      for (const [cx, cy] of [[-0.5, 0], [0.5, 0], [-0.5, 1], [0.5, 1]]){ P.push(0, 0, 0); corner.push(cx, cy); off.push(ox, oy); wd.push(w); sd.push(s); }
      const b = i * 4; ind.push(b, b + 1, b + 2, b + 2, b + 1, b + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('aCorner', new THREE.Float32BufferAttribute(corner, 2));
    g.setAttribute('aOff', new THREE.Float32BufferAttribute(off, 2));
    g.setAttribute('aWidth', new THREE.Float32BufferAttribute(wd, 1));
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(sd, 1));
    g.setIndex(ind);
    const m = new THREE.ShaderMaterial({
      uniforms: shaftUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: `
        attribute vec2 aCorner, aOff; attribute float aWidth, aSeed;
        uniform vec3 uDir, uCam; uniform float uTime;
        varying vec2 vC; varying vec3 vP; varying float vSeed;
        void main(){
          vec3 axis = normalize(uDir);
          vec3 up0 = abs(axis.y) > 0.95 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
          vec3 b1 = normalize(cross(axis, up0)); vec3 b2 = cross(axis, b1);
          vec2 o = aOff + vec2(sin(uTime*0.05 + aSeed*30.0), cos(uTime*0.04 + aSeed*20.0)) * 0.35;
          vec3 c = vec3(0.0, 0.2, 0.0) + b1 * o.x + b2 * o.y;
          vec3 side = normalize(cross(axis, normalize(uCam - c)));
          vec3 p = c + axis * (aCorner.y - 0.5) * 16.0 + side * aCorner.x * aWidth;
          vC = aCorner; vP = p; vSeed = aSeed;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 uColor; uniform float uI, uTime;
        varying vec2 vC; varying vec3 vP; varying float vSeed;
        ${GLSL_HEIGHT}
        void main(){
          float ac = 1.0 - abs(vC.x * 2.0); ac = ac * ac * (3.0 - 2.0 * ac);
          float inside = ${insideExpr('vP')};
          float g = smoothstep(0.0, 1.1, vP.y - terrainY(vP.xz));
          float flick = 0.7 + 0.3 * sin(uTime * 0.5 + vSeed * 40.0);
          float ends = smoothstep(0.0, 0.38, vC.y) * smoothstep(1.0, 0.62, vC.y);      // 两端淡出，不然低角度的光柱像一根根横条
          gl_FragColor = vec4(uColor, ac * inside * ends * g * flick * uI * (0.5 + vSeed * 0.5) * 0.18);
        }`,
    });
    const shafts = new THREE.Mesh(g, m); shafts.frustumCulled = false; shafts.renderOrder = 6; root.add(shafts);
  }

  // 漂浮尘埃（自动）与萤火虫（世界文件登记的）
  const sparkUniforms = { uTime: U.time, uScale: { value: 1000 }, uDust: { value: 1 }, uNight: { value: 0 }, uDustCol: { value: new THREE.Color() } };
  {
    const P = [], kind = [], seed = [], size = [];
    if (!ROUND) for (let i = 0; i < 320; i++){ const x = R(-4.8, 4.8), z = R(-4.8, 4.8), y = R(T.getY(x, z) + 0.1, 4.8); P.push(x, y, z); kind.push(0); seed.push(rand()); size.push(R(0.014, 0.034)); }
    else for (let i = 0, n = 0; n < 320 && i < 8000; i++){ const x = R(-5.4, 5.4), z = R(-5.4, 5.4); if (!inFoot(x, z, 0.2)) continue; const lo = T.getY(x, z) + 0.1, hi = ceilingY(Math.hypot(x, z)) - 0.2; if (hi <= lo) continue; P.push(x, R(lo, hi), z); kind.push(0); seed.push(rand()); size.push(R(0.014, 0.034)); n++; }
    for (const f of fireflyList){ P.push(f[0], f[1], f[2]); kind.push(1); seed.push(rand()); size.push(f[3]); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('aKind', new THREE.Float32BufferAttribute(kind, 1));
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1));
    g.setAttribute('aSize', new THREE.Float32BufferAttribute(size, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: sparkUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute float aKind, aSeed, aSize; uniform float uTime, uScale, uDust, uNight;
        varying float vA; varying float vKind;
        void main(){
          vec3 p = position; float t = uTime; float s = aSize;
          if (aKind < 0.5){
            p += vec3(sin(t*0.13 + aSeed*40.0)*0.25, sin(t*0.09 + aSeed*21.0)*0.18, cos(t*0.11 + aSeed*33.0)*0.25);
            vA = uDust * (0.35 + 0.65 * (0.5 + 0.5 * sin(t*1.3 + aSeed*60.0)));
          } else {
            p += vec3(sin(t*0.7 + aSeed*13.0)*0.13, sin(t*1.1 + aSeed*7.0)*0.06, cos(t*0.6 + aSeed*5.0)*0.13);
            float blink = smoothstep(0.35, 1.0, sin(t*1.6 + aSeed*40.0));
            vA = uNight * blink; s *= 0.6 + 0.6 * blink;
          }
          vKind = aKind;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = max(min(s * uScale / -mv.z, 60.0), 1.5);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform vec3 uDustCol; varying float vA; varying float vKind;
        void main(){
          float r = length(gl_PointCoord - 0.5) * 2.0; if (r > 1.0) discard;
          vec3 col = vKind < 0.5 ? uDustCol : vec3(1.0, 0.86, 0.38) * 4.0;
          gl_FragColor = vec4(col, exp(-r * r * 6.0) * vA);
        }`,
    });
    const sp = new THREE.Points(g, m); sp.frustumCulled = false; sp.renderOrder = 7; root.add(sp);
  }

  // 玻璃立方体
  const glassUniforms = { uTime: U.time, uKeyDir: { value: new THREE.Vector3(0, 1, 0) }, uKeyCol: { value: new THREE.Color() }, uSky: { value: new THREE.Color() }, uGlow: { value: GLOW[3] } };
  const glassVS = `
  varying vec3 vN; varying vec3 vWP; varying vec2 vUv; varying vec3 vLP;
  void main(){ vUv = uv; vLP = position; vec4 wp = modelMatrix * vec4(position, 1.0); vWP = wp.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * wp; }`;
  const glassFS = `
  uniform float uTime; uniform vec3 uKeyDir, uKeyCol, uSky; uniform float uBack, uGlow;
  varying vec3 vN; varying vec3 vWP; varying vec2 vUv; varying vec3 vLP;
  void main(){
    vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vWP);
    if (dot(N, V) < 0.0) N = -N;
    float fres = pow(1.0 - abs(dot(N, V)), 4.0);
    vec2 e2 = min(vUv, 1.0 - vUv);
    float e = min(e2.x, e2.y) / clamp(length(cameraPosition - vWP) / 50.0, 0.22, 1.0);   // 镜头推近时棱边按距离收细，不然近景里会变成一根粗光柱
    float rimHard = smoothstep(0.0032, 0.0, e);
    float rimSoft = smoothstep(0.035, 0.0, e);
    vec3 disp = vec3(smoothstep(0.017, 0.004, e), smoothstep(0.0135, 0.003, e), smoothstep(0.0105, 0.0015, e));   // 三个通道宽度不同：棱边的分色折射
    disp -= vec3(rimHard) * 0.6;
    float along = (e2.x < e2.y) ? vUv.y : vUv.x;
    float glint = pow(0.5 + 0.5 * sin(along * 15.0 - uTime * 0.8 + vLP.y * 0.6 + vLP.x * 0.4), 14.0);                // 沿棱游走的微光
    vec3 R = reflect(-V, N);
    float soft1 = smoothstep(0.5, 0.75, R.y) * smoothstep(0.15, 0.55, dot(normalize(R.xz + 1e-4), normalize(vec2(-0.6, -0.8))));
    float soft2 = smoothstep(0.92, 0.985, dot(R, normalize(vec3(0.8, 0.35, 0.5))));
    // 平面玻璃在窄视角下反射方向几乎一致，整面会一起亮：用斜向条带把高光打散成棚拍反光
    float streak = smoothstep(0.22, 0.0, abs(fract((vLP.x * 0.8 + vLP.y * 0.45 - vLP.z * 0.6) * 0.075 + 0.15) - 0.5));
    float sun = pow(max(dot(R, normalize(uKeyDir)), 0.0), 160.0) * (0.15 + 0.85 * streak);
    float k = uBack > 0.5 ? 0.35 : 1.0;
    vec3 col = uSky * 0.16 * fres;
    col += vec3(0.85, 0.9, 1.0) * (soft1 * 0.06 + soft2 * 0.08) * k * (0.4 + streak);
    col += uKeyCol * sun * 0.45 * k;
    col += disp * vec3(1.0, 0.95, 1.15) * 0.32 * uGlow;
    col += rimHard * vec3(0.9, 0.95, 1.0) * (0.2 + 1.5 * glint) * uGlow;
    col += rimSoft * vec3(0.55, 0.75, 1.0) * 0.03;
    float a = 0.02 + fres * 0.18 + max(max(disp.r, disp.g), disp.b) * 0.18 + rimHard * 0.3 + (soft1 * 0.05 + soft2 * 0.06) * k + sun * 0.12 * k + rimSoft * 0.04;
    gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
  }`;
  // 圆形容器（钟罩、球）没有棱，边光出在轮廓上：法线和视线越垂直越亮，三个通道衰减不同，就是一圈分色的折射光晕
  const roundVS = `
  uniform float uSphere;
  varying vec3 vN; varying vec3 vWP; varying vec3 vLP;
  void main(){
    vLP = position;
    vec3 n = (uSphere > 0.5 || position.y > 0.0) ? normalize(position) : normalize(vec3(position.x, 0.0, position.z) + 1e-5);   // 解析法线：朝外
    vN = normalize(mat3(modelMatrix) * n);
    vec4 wp = modelMatrix * vec4(position, 1.0); vWP = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
  const roundFS = `
  uniform float uTime; uniform vec3 uKeyDir, uKeyCol, uSky; uniform float uBack, uGlow, uBase, uFar;
  varying vec3 vN; varying vec3 vWP; varying vec3 vLP;
  void main(){
    vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vWP);
    float facing = dot(N, V);
    if (uFar > 0.5 ? facing > 0.0 : facing < 0.0) discard;                       // 远侧和近侧分两遍画：远的先画，近的最后画
    if (facing < 0.0) N = -N;
    float fr = 1.0 - abs(facing);
    vec3 disp = vec3(pow(fr, 3.0), pow(fr, 3.7), pow(fr, 4.6));
    float rim = smoothstep(0.88, 1.0, fr);
    float glint = pow(0.5 + 0.5 * sin(atan(vLP.z, vLP.x) * 5.0 - uTime * 0.7 + vLP.y * 1.3), 16.0);   // 沿轮廓游走的微光
    vec3 R = reflect(-V, N);
    vec3 Nv = normalize(mat3(viewMatrix) * N);                                                        // 高光按镜头方向算：不管怎么转，都停在左上和右下，不挡画面中间
    float soft1 = smoothstep(0.974, 0.994, dot(Nv, normalize(vec3(-0.46, 0.56, 0.69))));              // 左上的窗形高光
    float soft2 = smoothstep(0.986, 0.997, dot(Nv, normalize(vec3(0.52, -0.5, 0.69)))) * 0.4;         // 右下的一点回光
    float sun = pow(max(dot(R, normalize(uKeyDir)), 0.0), 220.0);
    float base = uBase > -90.0 ? smoothstep(0.06, 0.0, abs(vLP.y - uBase)) : 0.0;                      // 钟罩底沿的一圈亮线
    float k = uBack > 0.5 ? 0.3 : 1.0;
    vec3 col = uSky * 0.1 * fr;
    col += disp * vec3(1.0, 0.95, 1.15) * 0.42 * uGlow * k;
    col += vec3(0.9, 0.95, 1.0) * rim * (0.22 + 1.3 * glint) * uGlow * k;
    col += vec3(0.9, 0.94, 1.0) * (soft1 * 0.26 + soft2 * 0.18) * (uBack > 0.5 ? 0.0 : 1.0);
    col += uKeyCol * sun * 0.55 * k;
    col += vec3(0.8, 0.9, 1.0) * base * 0.55 * uGlow;
    float a = 0.02 + max(max(disp.r, disp.g), disp.b) * 0.26 * k + rim * 0.22 * k + (soft1 * 0.08 + soft2 * 0.05) * (uBack > 0.5 ? 0.0 : 1.0) + sun * 0.2 * k + base * 0.3;
    gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
  }`;
  const containerGeo = (s = 1) => {
    if (SPHERE) return new THREE.SphereGeometry(RS * s, 72, 48);
    if (ROUND){                                             // 钟罩：下半截直筒，上半截半球，底下敞口
      const pts = [new THREE.Vector2(GL * s, -GL * s), new THREE.Vector2(GL * s, 0)];
      for (let i = 1; i <= 24; i++){ const a = i / 24 * Math.PI / 2; pts.push(new THREE.Vector2(Math.max(GL * s * Math.cos(a), 0.001), GL * s * Math.sin(a))); }
      return new THREE.LatheGeometry(pts, 96);
    }
    return new THREE.BoxGeometry(2 * GL * s, 2 * GL * s, 2 * GL * s);
  };
  const glassMat = (back, side, far = false) => new THREE.ShaderMaterial(ROUND ? {
    uniforms: { ...glassUniforms, uBack: { value: back ? 1 : 0 }, uFar: { value: far ? 1 : 0 }, uSphere: { value: SPHERE ? 1 : 0 }, uBase: { value: SPHERE ? -99 : -GL } },
    vertexShader: roundVS, fragmentShader: roundFS, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  } : {
    uniforms: { ...glassUniforms, uBack: { value: back ? 1 : 0 } }, vertexShader: glassVS, fragmentShader: glassFS,
    transparent: true, depthWrite: false, side, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  const glassGeo = containerGeo(1);
  const glassBack = new THREE.Mesh(glassGeo, glassMat(true, THREE.BackSide, true)); glassBack.renderOrder = -10; root.add(glassBack);       // 远侧玻璃先画
  const glassInner = new THREE.Mesh(containerGeo(ROUND ? 0.985 : 1 - 0.045 / GL), glassMat(true, THREE.FrontSide)); glassInner.renderOrder = 99; root.add(glassInner);   // 内壁：玻璃的厚度
  const glassFront = new THREE.Mesh(glassGeo, glassMat(false, THREE.FrontSide)); glassFront.renderOrder = 100; root.add(glassFront);        // 近侧玻璃最后画

  // 立方体内部的空气感（跟着时辰变色）
  const hazeUniforms = { uHaze: { value: new THREE.Color() }, uAmt: { value: 0.3 } };
  {
    const haze = new THREE.Mesh(ROUND ? containerGeo(0.992) : new THREE.BoxGeometry(10.06, 10.06, 10.06), new THREE.ShaderMaterial({
      uniforms: hazeUniforms, transparent: true, depthWrite: false, side: THREE.BackSide,
      vertexShader: `varying vec3 vLP; void main(){ vLP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 uHaze; uniform float uAmt; varying vec3 vLP;
        void main(){ float y = (vLP.y + 5.0) / 10.0; gl_FragColor = vec4(uHaze, uAmt * (0.35 + 0.65 * smoothstep(0.15, 0.95, y))); }`,
    }));
    haze.renderOrder = -9; root.add(haze);
  }

  // 棱上的星芒闪光
  const glints = [];
  {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    const rg = (r, a) => { const gr = g.createRadialGradient(128, 128, 0, 128, 128, r); gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); return gr; };
    g.fillStyle = rg(34, 0.8); g.fillRect(0, 0, 256, 256);
    for (const [sx, sy] of [[1, 0.035], [0.035, 1]]){ g.save(); g.translate(128, 128); g.scale(sx, sy); g.fillStyle = rg(128, 1); g.beginPath(); g.arc(0, 0, 128, 0, 7); g.fill(); g.restore(); }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    for (let i = 0; i < 3; i++){
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
      s.renderOrder = 101; root.add(s); glints.push({ s, t0: -R(0, 6), dur: R(2.5, 4), wait: 0 });
    }
  }
  const placeGlint = (gl, rnd) => {                 // rnd：实时模式用 rand；影片模式用按周期序号播种的随机数
    const Rr = (a, b) => a + (b - a) * rnd(), ax = Math.floor(rnd() * 3), p = [0, 0, 0];
    if (ROUND){ const a = Rr(0, 6.28), cr = SPHERE ? RS : GL, y = Rr(-0.2, 0.98) * cr, rr = (SPHERE || y > 0) ? Math.sqrt(cr * cr - y * y) : cr; p[0] = rr * Math.cos(a); p[1] = y; p[2] = rr * Math.sin(a); }
    else { p[ax] = Rr(-1, 1) * GL; p[(ax + 1) % 3] = (rnd() < 0.5 ? -1 : 1) * GL; p[(ax + 2) % 3] = (rnd() < 0.5 ? -1 : 1) * GL; }
    gl.s.position.set(p[0], p[1], p[2]);
  };
  const respawnGlint = (gl, t) => { placeGlint(gl, rand); gl.t0 = t; gl.dur = R(2.2, 3.6); gl.wait = R(1.5, 5); };
  // 影片模式的星芒：第 i 只按固定周期轮换，第 k 个周期的位置和长短由 (seed, i, k) 决定，所以任何时刻 t 都能直接算出来
  const glintAt = (gl, i, t, night) => {
    const P = 6.4 + i * 0.85, u0 = t + i * 2.3, k = Math.floor(u0 / P), u = u0 - k * P;
    const rnd = mulberry32((meta.seed ^ Math.imul(i + 1, 0x9E3779B1) ^ Math.imul(k + 7, 0x85EBCA77)) >>> 0);
    placeGlint(gl, rnd); gl.dur = 2.2 + 1.4 * rnd();
    const env = Math.sin(clamp(u / gl.dur, 0, 1) * Math.PI);
    gl.s.material.opacity = env * env * 0.55 * (1 - night * 0.25); gl.s.scale.setScalar(0.15 + env * 0.55); gl.s.material.rotation = t * 0.3;
  };

  // 背景三选一：深空（渐变星云 + 虚化光斑）、桌面（暖色房间 + 木桌 + 底座，容器落在桌上不再悬浮）、纯色
  const plainCol = C(look.backdropColor);
  const bgA = PLAIN ? plainCol.clone().multiplyScalar(0.55) : DESK ? C('#0c0806') : new THREE.Color(0.006, 0.007, 0.016);
  const bgB = PLAIN ? plainCol.clone().multiplyScalar(1.25) : DESK ? C('#2a1e18') : new THREE.Color(0.016, 0.02, 0.045);
  {
    const bg = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 32), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { uA: { value: bgA }, uB: { value: bgB }, uNeb: { value: PLAIN || DESK ? 0 : 1 } },
      vertexShader: `varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec3 vD; uniform vec3 uA, uB; uniform float uNeb;
        float hash(vec3 p){ p = fract(p*0.3183099+0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
        float vn3(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);
          return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x), mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
                     mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x), mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y), f.z); }
        float fb(vec3 p){ float s=0., a=0.5; for(int i=0;i<5;i++){ s+=a*vn3(p); p*=2.03; a*=0.5; } return s; }
        void main(){
          vec3 d = normalize(vD);
          vec3 col = mix(uA, uB, smoothstep(-0.7, 0.7, d.y));
          if (uNeb > 0.5){
            col += vec3(0.11,0.05,0.19) * smoothstep(0.5, 0.85, fb(d*2.0 + 1.3)) * 0.4;
            col += vec3(0.02,0.11,0.15) * smoothstep(0.52, 0.9, fb(d*3.6 + 7.0)) * 0.45;
          }
          gl_FragColor = vec4(col, 1.0);
        }`,
    }));
    bg.renderOrder = -100; scene.add(bg);
  }
  const bokehUniforms = { uTime: U.time, uScale: { value: 1000 } };
  if (!PLAIN){
    const P = [], size = [], col = [], seed = [];
    const PC = (DESK ? ['#ffb36b', '#ffd9a8', '#ff9a5a', '#fff0d0', '#ffc98a', '#8fd0ff'] : ['#6f8cff', '#9a7bff', '#5fd0ff', '#ffb27a', '#ffd9a8', '#c7d4ff']).map(C);
    for (let i = 0; i < (DESK ? 150 : 230); i++){ const v = new THREE.Vector3(R(-1, 1), DESK ? R(0.02, 0.75) : R(-0.8, 0.8), R(-1, 1)).normalize().multiplyScalar(R(80, 220)); P.push(v.x, v.y, v.z); size.push(R(2, 9)); const c = pick(PC); col.push(c.r, c.g, c.b); seed.push(rand()); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('aSize', new THREE.Float32BufferAttribute(size, 1));
    g.setAttribute('aCol', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1));
    const pts3 = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: bokehUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute float aSize, aSeed; attribute vec3 aCol; uniform float uTime, uScale; varying vec3 vCol; varying float vA;
        void main(){ vCol = aCol; vA = (0.05 + 0.13 * aSeed) * (0.75 + 0.25 * sin(uTime * 0.3 + aSeed * 50.0));
          vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = min(aSize * uScale / -mv.z, 260.0); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec3 vCol; varying float vA;
        void main(){ float r = length(gl_PointCoord - 0.5) * 2.0; if (r > 1.0) discard;
          float disc = smoothstep(1.0, 0.86, r); float ring = smoothstep(0.7, 0.93, r) * disc;
          gl_FragColor = vec4(vCol, (disc * 0.5 + ring * 0.22) * vA * 0.8); }`,
    }));
    pts3.renderOrder = -90; pts3.frustumCulled = false; scene.add(pts3);
  }
  if (DESK){
    const bottomY = SPHERE ? -RS : -GL, wood = new THREE.MeshStandardMaterial({ color: '#5a3d2a', roughness: 0.5 });
    const plinth = SPHERE ? new THREE.Mesh(new THREE.CylinderGeometry(2.75, 3.25, 1.15, 72), wood)                 // 球：托着它的木座
      : ROUND ? new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.8, 0.5, 96), wood)                                // 钟罩：圆木底盘
      : new THREE.Mesh(new THREE.BoxGeometry(11.1, 0.5, 11.1), wood);                                              // 立方体：方木底盘
    const plinthTop = SPHERE ? bottomY + 0.62 : bottomY, plinthH = SPHERE ? 1.15 : 0.5, deskY = plinthTop - plinthH;
    plinth.position.y = plinthTop - plinthH / 2; plinth.castShadow = true; plinth.receiveShadow = true; scene.add(plinth);
    const dg = new THREE.CircleGeometry(36, 96); dg.rotateX(-Math.PI / 2);
    const n = dg.attributes.position.count, ca = new Float32Array(n * 4);
    for (let i = 0; i < n; i++){ ca[i * 4] = ca[i * 4 + 1] = ca[i * 4 + 2] = 1; ca[i * 4 + 3] = i === 0 ? 1 : 0; }     // 圆心不透明，边缘全透明：桌面向四周淡进背景
    dg.setAttribute('color', new THREE.BufferAttribute(ca, 4));
    const desk = new THREE.Mesh(dg, new THREE.MeshStandardMaterial({ color: '#4a3324', roughness: 0.6, vertexColors: true, transparent: true, depthWrite: false }));
    desk.position.y = deskY; desk.receiveShadow = true; desk.renderOrder = -60; scene.add(desk);
  }
  const haloBase = PLAIN ? plainCol.clone().multiplyScalar(1.6) : DESK ? C('#3a2414') : C('#16224a');
  const haloUniforms = { uCol: { value: new THREE.Color('#1c2c5a') } };
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
    uniforms: haloUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 uCol; varying vec2 vUv; void main(){ float r = length(vUv - 0.5) * 2.0; gl_FragColor = vec4(uCol, exp(-r * r * 3.2) * 0.55); }`,
  }));
  halo.renderOrder = -80; scene.add(halo);

  // 后期：辉光 → 移轴虚化 → 色调映射 → 暗角、颗粒、边缘色散
  const rt = new THREE.WebGLRenderTarget(innerWidth * DPR, innerHeight * DPR, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(DPR); composer.setSize(innerWidth, innerHeight);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), GLOW[0], GLOW[1], GLOW[2]);
  composer.addPass(bloom);
  const quadVS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
  let tiltMax = 10;                                  // 移轴最大虚化半径（像素），随窗口大小算；影片模式可以按镜头乘一个倍数
  const tilt = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uRes: { value: new THREE.Vector2() }, uFocus: { value: 0.5 }, uBand: { value: 0.2 }, uMax: { value: 10 }, uOn: { value: Q.get('tilt') === '0' ? 0 : 1 } },
    vertexShader: quadVS,
    fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uFocus, uBand, uMax, uOn; varying vec2 vUv;
      void main(){
        float amt = smoothstep(uBand, uBand + 0.36, abs(vUv.y - uFocus)) * uMax * uOn;
        vec4 base = texture2D(tDiffuse, vUv);
        if (amt < 0.4){ gl_FragColor = base; return; }
        vec3 acc = vec3(0.0); float ws = 0.0;
        for (int i = 0; i < 28; i++){
          float fi = float(i), r = sqrt((fi + 0.5) / 28.0), a = fi * 2.3999632;
          vec3 c = texture2D(tDiffuse, vUv + vec2(cos(a), sin(a)) * r * amt / uRes).rgb;
          float w = 1.0 + smoothstep(0.8, 3.0, dot(c, vec3(0.3, 0.59, 0.11))) * 3.0;     // 亮点加权：虚化处出现光斑
          acc += c * w; ws += w;
        }
        gl_FragColor = vec4(acc / ws, 1.0);
      }`,
  });
  composer.addPass(tilt);
  composer.addPass(new OutputPass());
  const finish = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: U.time, uRes: { value: new THREE.Vector2() } },
    vertexShader: quadVS,
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime; uniform vec2 uRes; varying vec2 vUv;
      void main(){
        vec2 p = vUv - 0.5, dir = p * dot(p, p) * 0.012;
        vec3 c = vec3(texture2D(tDiffuse, vUv + dir).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - dir).b);
        c *= mix(0.42, 1.0, smoothstep(0.95, 0.25, length(p * vec2(1.0, 1.1))));
        float g = fract(sin(dot(vUv * uRes + fract(uTime * 7.13) * 91.7, vec2(12.9898, 78.233))) * 43758.5453);
        gl_FragColor = vec4(c + (g - 0.5) * 0.022, 1.0);
      }`,
  });
  composer.addPass(finish);

  /* =========================================================
     昼夜
     ========================================================= */
  const KF = [
    { id: 'midnight',  h: 0,    key: '#8fa8ff', ki: 0.7,  sky: '#1f2d5e', gnd: '#2a2e52', hi: 0.9,  rim: '#6f86ff', ri: 1.3, mist: '#3c4a7a', ma: 0.55, sh: 0.15, haze: '#0e1838', ha: 0.32, exp: 1.15, night: 1 },
    { id: 'predawn',   h: 4.6,  key: '#8fa8ff', ki: 0.6,  sky: '#273064', gnd: '#2a2e52', hi: 0.9,  rim: '#7f8cff', ri: 1.1, mist: '#4a5180', ma: 0.8,  sh: 0.1,  haze: '#1a2048', ha: 0.32, exp: 1.12, night: 1 },
    { id: 'daybreak',  h: 5.6,  key: '#ff8a5c', ki: 0.05, sky: '#5b4f86', gnd: '#2a2030', hi: 0.7,  rim: '#ff9f8a', ri: 1.0, mist: '#9a86a8', ma: 1.0,  sh: 0.0,  haze: '#6a4f86', ha: 0.36, exp: 1.06, night: 0.6 },
    { id: 'sunrise',   h: 6.6,  key: '#ff9d5c', ki: 2.1,  sky: '#ffb58f', gnd: '#5a4048', hi: 0.85, rim: '#ffc59a', ri: 1.5, mist: '#ffd2b5', ma: 0.85, sh: 1.0,  haze: '#ffaa88', ha: 0.22, exp: 1.0,  night: 0 },
    { id: 'morning',   h: 9,    key: '#ffe7c4', ki: 3.0,  sky: '#bcd9ff', gnd: '#6a6a48', hi: 0.95, rim: '#fff1d8', ri: 1.0, mist: '#eef3ff', ma: 0.65, sh: 0.7,  haze: '#9fc8ff', ha: 0.26, exp: 1.0,  night: 0 },
    { id: 'noon',      h: 12.5, key: '#fff6ea', ki: 3.3,  sky: '#cfe6ff', gnd: '#707752', hi: 1.0,  rim: '#ffffff', ri: 0.8, mist: '#f2f7ff', ma: 0.35, sh: 0.45, haze: '#a8d4ff', ha: 0.24, exp: 0.97, night: 0 },
    { id: 'afternoon', h: 16,   key: '#ffd9a0', ki: 3.0,  sky: '#c4d8f5', gnd: '#6f6646', hi: 0.9,  rim: '#ffe0b0', ri: 1.1, mist: '#fff0dc', ma: 0.45, sh: 0.75, haze: '#c0d0f0', ha: 0.25, exp: 1.0,  night: 0 },
    { id: 'sunset',    h: 18,   key: '#ff7440', ki: 1.9,  sky: '#ff9a7a', gnd: '#4a3040', hi: 0.78, rim: '#ff8f6a', ri: 1.6, mist: '#ffb898', ma: 0.75, sh: 1.0,  haze: '#ff8a70', ha: 0.24, exp: 1.04, night: 0 },
    { id: 'dusk',      h: 18.9, key: '#ff6a50', ki: 0.05, sky: '#6a4f86', gnd: '#20182c', hi: 0.62, rim: '#9a7cff', ri: 1.2, mist: '#8a74a8', ma: 0.8,  sh: 0.0,  haze: '#4a3a7a', ha: 0.36, exp: 1.1,  night: 0.5 },
    { id: 'night',     h: 20,   key: '#8fa8ff', ki: 0.65, sky: '#1f2d5e', gnd: '#2a2e52', hi: 0.9,  rim: '#6f86ff', ri: 1.3, mist: '#3c4a7a', ma: 0.6,  sh: 0.15, haze: '#0e1838', ha: 0.32, exp: 1.15, night: 1 },
  ];
  // 世界文件可以微调这一境的天色：sky(kf) 里按 id 找到某个时辰改颜色或强度（时刻 h 不要动）
  if (WORLD.sky) WORLD.sky(Object.fromEntries(KF.map(k => [k.id, k])), KF);
  KF.push({ ...KF[0], h: 24 });
  const COLK = ['key', 'sky', 'gnd', 'rim', 'mist', 'haze'], NUMK = ['ki', 'hi', 'ri', 'ma', 'sh', 'ha', 'exp', 'night'];
  KF.forEach(k => COLK.forEach(c => k[c] = C(k[c])));
  const Lt = { hour: 0, keyDir: new THREE.Vector3() }; COLK.forEach(c => Lt[c] = new THREE.Color());
  const E = new THREE.Vector3(-0.88, 0, -0.47).normalize(), S = new THREE.Vector3(0.3, 0, -0.6), UP = new THREE.Vector3(0, 1, 0), _tmp = new THREE.Color();
  function applyTime(h){
    let i = 0; while (i < KF.length - 2 && h >= KF[i + 1].h) i++;
    const a = KF[i], b = KF[i + 1]; let t = (h - a.h) / (b.h - a.h); t = t * t * (3 - 2 * t);
    COLK.forEach(c => Lt[c].copy(a[c]).lerp(b[c], t)); NUMK.forEach(n => Lt[n] = lerp(a[n], b[n], t)); Lt.hour = h;
    const L = Lt, d = L.keyDir;
    if (h >= 5.6 && h < 18.9){     // 太阳：从左后方升起（逆光、光柱朝镜头），傍晚落到右前方
      const an = (h - 6) / 12 * Math.PI;
      d.copy(E).multiplyScalar(Math.cos(an)).addScaledVector(UP, Math.sin(an)).addScaledVector(S, 0.45); if (d.y < 0.07) d.y = 0.07;
    } else {                       // 月亮：主光强度在交接时刻降到接近 0，换方向看不出跳变
      const m = clamp(((h - 18.9 + 24) % 24) / 10.7, 0, 1) * Math.PI;
      d.copy(E).multiplyScalar(Math.cos(m) * 0.9).addScaledVector(UP, 0.45 + 0.55 * Math.sin(m)).addScaledVector(S, -0.3);
    }
    d.normalize();
    key.position.copy(d).multiplyScalar(22); key.target.position.set(0, 0, 0); key.color.copy(L.key); key.intensity = L.ki;
    hemi.color.copy(L.sky); hemi.groundColor.copy(L.gnd); hemi.intensity = L.hi;
    rim.color.copy(L.rim); rim.intensity = L.ri * 0.7;
    renderer.toneMappingExposure = L.exp;
    waterUniforms.uKeyDir.value.copy(d); waterUniforms.uKeyCol.value.copy(L.key).multiplyScalar(L.ki); waterUniforms.uSky.value.copy(L.sky).multiplyScalar(L.hi * 0.9);
    glassUniforms.uKeyDir.value.copy(d); glassUniforms.uKeyCol.value.copy(L.key).multiplyScalar(0.25 + L.ki * 0.3); glassUniforms.uSky.value.copy(L.sky).multiplyScalar(0.4 + L.hi * 0.6);
    mistUniforms.uColor.value.copy(L.mist).multiplyScalar(0.55 + 0.25 * Math.min(L.ki, 2.0) / 2.0); mistUniforms.uAmount.value = L.ma;
    shaftUniforms.uDir.value.copy(d); shaftUniforms.uColor.value.copy(L.key); shaftUniforms.uI.value = L.sh;
    hazeUniforms.uHaze.value.copy(L.haze); hazeUniforms.uAmt.value = L.ha;
    sparkUniforms.uNight.value = L.night; sparkUniforms.uDust.value = 0.25 + 0.75 * clamp(L.ki / 3, 0, 1);
    sparkUniforms.uDustCol.value.copy(L.key).lerp(_tmp.set(1, 1, 1), 0.4).multiplyScalar(1.2);
    cloudMat.emissive.copy(L.sky).lerp(L.key, 0.25).lerp(_tmp.set('#9fb4ff'), L.night * 0.5); cloudMat.emissiveIntensity = 0.12 + 0.1 * L.hi + L.night * 0.18;
    haloUniforms.uCol.value.copy(haloBase).lerp(L.haze, 0.25).multiplyScalar(0.75);
    for (const fn of lightFns) fn(L);
    return L;
  }

  /* =========================================================
     界面
     ========================================================= */
  const state = { hour: qf('hour', meta.startHour), playing: !(SHOT || FILM || Q.get('pause') === '1'), speed: meta.speed };
  if (SHOT || FILM || Q.get('ui') === '0') document.body.classList.add('hide-ui');
  if (SHOT || FILM || Q.get('rot') === '0') controls.autoRotate = false;
  const timeEl = $('#time'), clockT = $('#clockT'), clockP = $('#clockP'), playEl = $('#play');
  const PHASES = [[4.5, '深夜'], [6, '拂晓'], [8, '晨光'], [11, '上午'], [13.5, '正午'], [16.5, '午后'], [18.5, '黄昏'], [20, '暮色'], [24.01, '夜晚']];
  let lastLabel = '';
  const syncClock = () => {
    const h = Math.floor(state.hour), m = Math.floor((state.hour - h) * 60), s = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    if (s !== lastLabel){ clockT.textContent = s; lastLabel = s; clockP.textContent = PHASES.find(p => state.hour < p[0])[1]; }
    if (document.activeElement !== timeEl) timeEl.value = state.hour.toFixed(2);
  };
  const setPlaying = v => { state.playing = v; playEl.textContent = v ? '❚❚' : '▶'; };
  setPlaying(state.playing);
  playEl.onclick = () => setPlaying(!state.playing);
  timeEl.oninput = () => { state.hour = parseFloat(timeEl.value); };
  document.querySelectorAll('#speeds button').forEach(b => b.onclick = () => {
    document.querySelectorAll('#speeds button').forEach(x => x.classList.remove('on')); b.classList.add('on'); state.speed = parseFloat(b.dataset.s); setPlaying(true);
  });
  $('#rot').classList.toggle('on', controls.autoRotate);
  $('#rot').onclick = e => { controls.autoRotate = !controls.autoRotate; e.currentTarget.classList.toggle('on', controls.autoRotate); };
  $('#tilt').classList.toggle('on', tilt.uniforms.uOn.value > 0.5);
  $('#tilt').onclick = e => { const on = tilt.uniforms.uOn.value < 0.5; tilt.uniforms.uOn.value = on ? 1 : 0; e.currentTarget.classList.toggle('on', on); };
  $('#focus').oninput = e => { tilt.uniforms.uFocus.value = 1 - parseFloat(e.target.value); };
  addEventListener('keydown', e => { if (e.key === 'h' || e.key === 'H') document.body.classList.toggle('hide-ui'); if (e.key === ' '){ e.preventDefault(); playEl.click(); } });

  /* =========================================================
     尺寸与主循环
     ========================================================= */
  let userTouched = false;
  const resize = () => {
    const w = innerWidth, h = innerHeight;
    if (!(w > 0 && h > 0)) return;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    if (introDone && !userTouched) camera.position.sub(controls.target).setLength(fitDistance()).add(controls.target);   // 用户没动过镜头时，窗口变了就重新取景
    renderer.setSize(w, h); composer.setSize(w, h); bloom.setSize(w * DPR, h * DPR);
    const sc = h * DPR / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    mistUniforms.uScale.value = sc; sparkUniforms.uScale.value = sc; bokehUniforms.uScale.value = sc;
    tilt.uniforms.uRes.value.set(w * DPR, h * DPR); tiltMax = 9 * DPR * Math.min(1.2, Math.max(0.7, h / 1000)); tilt.uniforms.uMax.value = tiltMax;
    finish.uniforms.uRes.value.set(w * DPR, h * DPR);
  };
  let introT = 0, introDone = skipIntro, elapsed = 0, frames = 0;
  addEventListener('resize', resize); resize();
  controls.addEventListener('start', () => { introDone = true; userTouched = true; });
  const clock = new THREE.Clock(), camDir = new THREE.Vector3(), tmpV = new THREE.Vector3();
  // 一帧里随时间动的部分：生灵、云、星芒、悬浮。t 是秒；film 为真时星芒也按 t 直接算（影片模式），否则按实时的节奏轮换
  function animate(t, L, dt, film){
    for (const f of lifeFns) f(t, L, dt);
    for (const c of clouds){ const u = c.userData, a = u.a + t * u.w; c.position.set(Math.cos(a) * u.r, u.y + Math.sin(t * 0.3 + u.ph) * 0.08, Math.sin(a) * u.r); c.rotation.y = -a; }
    if (film) glints.forEach((g, i) => glintAt(g, i, t, L.night));
    else for (const g of glints){
      const tg = t - g.t0; if (tg > g.dur + g.wait) respawnGlint(g, t);
      const env = Math.sin(clamp(tg / g.dur, 0, 1) * Math.PI);
      g.s.material.opacity = env * env * 0.55 * (1 - L.night * 0.25); g.s.scale.setScalar(0.15 + env * 0.55); g.s.material.rotation = t * 0.3;
    }
    if (!DESK){ root.position.y = Math.sin(t * 0.35) * 0.07; root.rotation.z = Math.sin(t * 0.21) * 0.004; }   // 悬浮感；落在桌上时不动
  }
  // 镜头摆好之后：跟着镜头走的灯光和公告板，然后出画
  function present(){
    camDir.copy(camera.position).sub(controls.target).normalize();
    rim.position.copy(camDir).multiplyScalar(-20).add(tmpV.set(0, 14, 0));      // 轮廓光始终从镜头对面打过来
    halo.position.copy(camDir).multiplyScalar(-160); halo.lookAt(camera.position); halo.scale.setScalar(150);
    shaftUniforms.uCam.value.copy(camera.position).sub(root.position);
    mistUniforms.uCamR.value.setFromMatrixColumn(camera.matrixWorld, 0);
    mistUniforms.uCamU.value.setFromMatrixColumn(camera.matrixWorld, 1);
    composer.render();
  }
  function frame(){
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt; U.time.value = elapsed;
    if (state.playing) state.hour = (state.hour + dt * state.speed) % 24;
    const L = applyTime(state.hour); syncClock();
    animate(elapsed, L, dt, false);
    if (!introDone){                                              // 开场推镜；用户一上手就让出控制
      introT = Math.min(1, introT + dt / 4.5);
      camera.position.sub(controls.target).setLength(lerp(fitDistance() * 1.7, fitDistance(), 1 - Math.pow(1 - introT, 3))).add(controls.target);
      if (introT >= 1) introDone = true;
    }
    controls.update();
    present();
    frames++; if (frames === 3){ $('#loader').classList.add('done'); document.documentElement.dataset.ready = '1'; readyNow(); }
    requestAnimationFrame(frame);
  }

  /* =========================================================
     影片模式：FANGCUN.frame(o) 画出某一刻的完整画面
     o = { t 秒, hour 时辰, cam: { az, pol, dist, target: [x,y,z], ride }, focus, focusAt: [x,y,z], band, blur, tilt }
     - t 是这一境自己的时间：生灵、云、雪、水、雾、星芒、悬浮都只由它决定；hour 单独给，所以几秒钟可以走过几个小时
     - az / pol / dist / target 和网址参数同义：dist 是“装下整只容器的距离”的倍数，target 是注视点（世界坐标，地块中心是原点）
     - ride 0~1：镜头跟着容器的悬浮一起动的程度（近景给 1，画面里就看不出浮动）
     - focus 是清晰带在画面里的高度（0 顶 ~ 1 底，同界面上的焦平面滑杆），或者给 focusAt 一个世界坐标点，清晰带就落在它上面；
       band 是清晰带的半宽（默认 0.2），blur 是虚化强度的倍数（默认 1），tilt 为 false 时关移轴
     ========================================================= */
  const film0 = { target: [qf('tx', 0), qf('ty', -0.35), qf('tz', 0)], az: AZ, pol: POL };
  const _fp = new THREE.Vector3(), _sph = new THREE.Spherical();
  const camPos = (c = {}, out = new THREE.Vector3()) => {          // 不出画，只算镜头位置（世界坐标，不含 ride）
    const tg = c.target || film0.target;
    _sph.set(fitBase() * (c.dist ?? 1), c.pol ?? film0.pol, c.az ?? film0.az);
    return out.setFromSpherical(_sph).add(_fp.set(tg[0], tg[1], tg[2]));
  };
  const inGlass = p => {                                          // 这一点在玻璃里面吗（镜头穿过玻璃的那一刻就是它变的时候）
    const [x, y, z] = p;
    if (SPHERE) return Math.hypot(x, y, z) < RS;
    if (ROUND) return y > -GL && (y > 0 ? Math.hypot(x, y, z) : Math.hypot(x, z)) < GL;
    return Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) < GL;
  };
  let lastFilm = null;
  function filmFrame(o = {}){
    if (!FILM) throw new Error('方寸之境：FANGCUN.frame 只在影片模式下可用（网址加 film=1）');
    lastFilm = o;
    const t = o.t ?? 0, c = o.cam || {};
    U.time.value = t;
    if (o.hour != null) state.hour = ((o.hour % 24) + 24) % 24;
    const L = applyTime(state.hour);
    animate(t, L, 0, true);
    root.updateMatrixWorld(true);
    camPos(c, camera.position);
    const tg = c.target || film0.target, ride = c.ride ?? 0;
    controls.target.set(tg[0], tg[1], tg[2]).addScaledVector(root.position, ride);
    camera.position.addScaledVector(root.position, ride);
    camera.lookAt(controls.target); camera.updateMatrixWorld(true);
    let fy = o.focus != null ? 1 - o.focus : 0.5;
    if (o.focusAt){ _fp.set(o.focusAt[0], o.focusAt[1], o.focusAt[2]).applyMatrix4(root.matrixWorld).project(camera); fy = clamp(_fp.y * 0.5 + 0.5, 0.05, 0.95); }
    tilt.uniforms.uFocus.value = fy; tilt.uniforms.uBand.value = o.band ?? 0.2;
    tilt.uniforms.uMax.value = tiltMax * (o.blur ?? 1); tilt.uniforms.uOn.value = o.tilt === false ? 0 : 1;
    present();
    return { hour: state.hour, night: L.night, focus: 1 - fy, inGlass: inGlass(camera.position.toArray()) };
  }

  // 对外的接口：实时网页里也在（ready 在前三帧画完时兑现），frame 只在影片模式下能用
  let readyNow;
  const API = window.FANGCUN = {
    version: '1.2.0', film: FILM, isReady: false,
    ready: new Promise(res => { readyNow = () => { if (!API.isReady){ API.isReady = true; res(API); } }; }),
    frame: filmFrame, camPos: (c) => camPos(c).toArray(), inGlass, fit: () => fitBase(),
    defaults: { az: film0.az, pol: film0.pol, dist: 1, target: film0.target.slice(), hour: meta.startHour },
    meta, look: { ...look }, F, THREE,
  };
  // 给验证用的把手：在浏览器控制台或自动化工具里可以直接改时辰、摆相机
  window.__fangcun = { THREE, F, renderer, scene, camera, controls, state, applyTime };
  if (FILM){
    // 影片模式不跑循环：先空画两帧（第一帧里同步编译全部着色器、建好阴影和后期的缓冲），等浏览器把它们交出去，
    // 再按网址参数画一帧（shot.sh 加 film=1 用它），最后报告“可以开拍”。不用 compileAsync：无界面出图的虚拟时间里它可能一直等不到
    controls.enabled = false;
    addEventListener('resize', () => { if (lastFilm) filmFrame(lastFilm); });    // 改尺寸会清掉画布：按上一帧的参数重画（出图工具截图前可能会改一次尺寸）
    const urlFrame = () => ({ t: qf('t', 0), hour: qf('hour', meta.startHour), focus: qf('focus', 0.5), band: qf('band', 0.2), tilt: Q.get('tilt') !== '0',
      cam: { az: AZ, pol: POL, dist: qf('dist', 1), target: film0.target, ride: qf('ride', 0) } });
    (async () => {
      filmFrame(urlFrame()); filmFrame(urlFrame());
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      filmFrame(urlFrame());
      $('#loader').classList.add('done'); document.documentElement.dataset.ready = '1'; readyNow();
    })();
  } else requestAnimationFrame(frame);
}
