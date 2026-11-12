// 一片一片 · 成片
// 一面车站白瓷墙：白砖是地，蓝砖是海，深圳地铁按真实开通的先后一片一片铺上去。镜头是墙前面的一台真摄像机（透视、对焦），
// 能贴着墙横移、推到一个区、退到整面墙。任何一帧都只由 t 决定（没有随机数，没有上一帧的状态）。
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { clamp, lerp, seg, eo, eio, ss, mulberry, hash, track, monotone } from '/core/lib.js';
import { makePost } from '/core/three/post.js';
import { tileGeo, discGeo, glaze, groutTexture, plaque, line, rasterText, RAKE_U } from './mosaic.js';
import * as TL from './timeline.js';

const W = innerWidth, H = innerHeight, Q = new URLSearchParams(location.search);
const FONT_CN = 'SHS', FONT_EN = 'Barlow';
await Promise.all(['700 40px SHS', '900 40px SHS', '600 40px Barlow', '500 40px Barlow'].map(f => document.fonts.load(f, '罗湖深圳地铁一片 Luohu 2004')));
const M = await (await fetch('data/mosaic.json')).json();
const { cols: COLS, rows: ROWS } = M.meta;
const FR = 3, BANDH = 30, TOP = ROWS + FR + BANDH + FR;           // 边框 3 格；地图上面是 30 格高的拼字标题带
const BAND0 = ROWS + FR;

// ---------- 渲染器、场景、灯 ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color('#2b2a28');
// 环境反射：一个车站站厅——暗的四壁，镜头背后的顶上一排灯管、对面墙上一排窗。釉面照出来的就是它们（一片片砖各照一小段）
function stationEnv() {
  const e = new THREE.Scene(), box = new THREE.Mesh(new THREE.BoxGeometry(60, 30, 60), new THREE.MeshBasicMaterial({ color: new THREE.Color(.07, .068, .065), side: THREE.BackSide }));
  e.add(box);
  const glow = (r, g, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), side: THREE.DoubleSide });
  const R = 14;
  for (const [el, hgt, k] of [[10, .3, 16], [24, .5, 5], [-24, 2.2, .4]]) {       // 两排灯管（仰角 10°、24°），一道暗的地面反光
    const m = new THREE.Mesh(new THREE.PlaneGeometry(90, hgt), glow(k, k * .97, k * .92));
    m.position.set(0, R * Math.tan(el * Math.PI / 180), R); e.add(m);
  }
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), glow(.32, .31, .3)); ceil.rotation.x = Math.PI / 2; ceil.position.y = 14.5; e.add(ceil);
  return e;
}
const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(stationEnv(), 0).texture;
scene.environmentIntensity = 1;
const camera = new THREE.PerspectiveCamera(30, W / H, .1, 5000);
const key = new THREE.DirectionalLight(0xfffaf3, 2.1); key.position.set(-.35, .75, 1); scene.add(key, key.target);     // 站台顶灯：左上前方
const rake = new THREE.DirectionalLight(0xfff0d8, 6.0); rake.position.set(-.97, .06, .22); scene.add(rake, rake.target); // 贴墙的掠射光（光带由 RAKE_U 决定）
scene.add(new THREE.HemisphereLight(0xf2efe8, 0x6b645a, .35));

const post = makePost(renderer, scene, camera, W, H, { ssaa: 2, ao: true, aoRadius: .5, aoScale: 1.6, aoAmt: .55 });
post.vig.uniforms.amt.value = .32; post.vig.uniforms.contrast.value = .12; post.vig.uniforms.warm.value = .15; post.bloom.strength = .12; post.bloom.threshold = .92;

// ---------- 颜色 ----------
const rnd = mulberry(20041228);
const col = (hex) => new THREE.Color(hex);
const jitter = (c, l = .05, h = .006, s = .03, seed = 0) => { const k = c.clone(); const hsl = {}; k.getHSL(hsl); k.setHSL(hsl.h + (hash(seed) - .5) * h, clamp(hsl.s + (hash(seed + 7.1) - .5) * s), clamp(hsl.l + (hash(seed + 3.3) - .5) * l)); return k; };
const WHITE = ['#f5f4f0', '#f2f2ee', '#f7f6f2', '#efeee9'].map(col), CREAM = col('#ebe5d6'), GREYW = col('#e3e5e4');
const SEA = ['#1d4f8f', '#235a9c', '#2a63a6', '#1b4682', '#2f6aa3', '#18407a'].map(col);
const RES = ['#6c9ecf', '#79a9d6', '#5f91c4'].map(col);
const NAVY = ['#1a2e57', '#1d335f', '#172a50'].map(col), BORDER = ['#20262c', '#1b2126', '#262c31'].map(col);

// ---------- 实例化的砖 ----------
const dummy = new THREE.Object3D(), mtx = new THREE.Matrix4(), ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
function inst(geo, mat, n) { const m = new THREE.InstancedMesh(geo, mat, n); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; scene.add(m); return m; }
function place(m, i, x, y, z, rz, rx, ry, sx, sy, sz) { dummy.position.set(x, y, z); dummy.rotation.set(rx, ry, rz); dummy.scale.set(sx, sy, sz); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); }

// 底砖：地图 + 边框 + 标题带，每格一片
const sq = [];                      // [u, v, colour, kind]  kind: 0 地图 1 边框 2 标题带底 3 标题字
for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
  const ch = M.grid[j][i], s = i * 7919 + j * 104729;
  let c = ch === '~' ? SEA[Math.floor(hash(s) * SEA.length)] : ch === 'r' ? RES[Math.floor(hash(s) * RES.length)] : WHITE[Math.floor(hash(s) * WHITE.length)];
  if (ch === '.' && hash(s + 1.7) < .035) c = hash(s + 2.9) < .5 ? CREAM : GREYW;
  sq.push([i + .5, j + .5, jitter(c, ch === '.' ? .035 : .07, .01, .06, s), 0]);
}
// 标题带：深蓝底上的白砖拼字（马赛克拼字：大尺度时读得出来）
const BAND = (() => {                                   // 两段字作为一组，在标题带里居中
  const g = document.createElement('canvas').getContext('2d'), wd = (f, t, sp) => { g.font = f; g.letterSpacing = sp + 'px'; return g.measureText(t).width; };
  const f1 = `900 24px ${FONT_CN}`, f2 = `600 19px ${FONT_EN}`, w1 = wd(f1, '深圳地铁', 3), w2 = wd(f2, 'SHENZHEN METRO', 3), gap = 14, x0 = Math.round((COLS - w1 - gap - w2) / 2);
  return rasterText([{ text: '深圳地铁', font: f1, x: x0, y: 26, spacing: 3 }, { text: 'SHENZHEN METRO', font: f2, x: x0 + w1 + gap, y: 24, spacing: 3 }], COLS, BANDH);
})();
for (let j = 0; j < BANDH; j++) for (let i = 0; i < COLS; i++) {
  const on = BAND[j * COLS + i], s = 33 + i * 131 + j * 977;
  sq.push([i + .5, BAND0 + j + .5, on ? jitter(WHITE[s % 4], .02, .005, .03, s) : jitter(NAVY[s % 3], .04, .005, .05, s), on ? 3 : 2]);
}
for (let j = -FR; j < TOP; j++) for (let i = -FR; i < COLS + FR; i++) {
  const inMap = i >= 0 && i < COLS && j >= 0 && j < ROWS, inBand = i >= 0 && i < COLS && j >= BAND0 && j < BAND0 + BANDH;
  if (inMap || inBand) continue;
  const s = 91 + i * 313 + j * 7;
  const c = (j === -2 || j === TOP - 2 || i === -2 || i === COLS + 1 || j === ROWS + 1) ? jitter(col('#c8a24a'), .05, .01, .05, s) : jitter(BORDER[((s % 3) + 3) % 3], .04, .005, .04, s);   // 一道金色细线
  sq.push([i + .5, j + .5, c, 1]);
}
const sqMat = glaze(), SQ_GEO = tileGeo(.45, .45, .24, .065);
const sqMesh = inst(SQ_GEO, sqMat, sq.length);
const sqRest = [];                  // 每片底砖静止时的位置和微小的歪斜（手工贴的不齐）
sq.forEach(([u, v, c, k], n) => {
  const s = n * 1.618 + 3;
  const r = [u + (hash(s) - .5) * .05, v + (hash(s + 1) - .5) * .05, (hash(s + 2) - .5) * .05, (hash(s + 3) - .5) * .085, (hash(s + 4) - .5) * .085, 1 + (hash(s + 5) - .5) * .25];
  r.push(1 + (hash(s + 6) - .5) * .07, 1 + (hash(s + 7) - .5) * .07);          // 手工切的砖，大小也不一样
  sqRest.push(r); place(sqMesh, n, r[0], r[1], 0, r[2], r[3], r[4], r[6], r[7], r[5]); sqMesh.setColorAt(n, c);
});
const cellIndex = (i, j) => j * COLS + i;   // 地图格 → sq 的下标（地图格排在最前面）

// 外墙：白色地铁砖（2:1，错缝），围着整幅马赛克
const SUB = [];
const SW = 7, SH = 3.5;
for (let r = 0; r * SH < TOP + 120; r++) {
  const y = -62 + r * SH + SH / 2, off = (r % 2) * SW / 2;
  for (let x = -96 - off; x < COLS + 96; x += SW) {
    const cx = x + SW / 2;
    if (cx + SW / 2 > -FR - .2 && cx - SW / 2 < COLS + FR + .2 && y + SH / 2 > -FR - .2 && y - SH / 2 < TOP + .2) continue;   // 马赛克所在的地方空出来
    SUB.push([cx, y]);
  }
}
const subMat = glaze({ mat: { roughness: .3, clearcoatRoughness: .05 } });
const subMesh = inst(tileGeo(SW / 2 - .09, SH / 2 - .09, .34, .32), subMat, SUB.length);
SUB.forEach(([x, y], n) => { const s = n * 2.31 + 7; place(subMesh, n, x, y, 0, (hash(s) - .5) * .006, (hash(s + 1) - .5) * .02, (hash(s + 2) - .5) * .02, 1, 1, 1); subMesh.setColorAt(n, jitter(col('#f0ede5'), .025, .006, .03, s)); });

// 勾缝层
const gt = groutTexture(mulberry(7)); gt.repeat.set(40, 40);
const grout = new THREE.Mesh(new THREE.PlaneGeometry(COLS + 400, TOP + 300), new THREE.MeshStandardMaterial({ map: gt, roughness: .95, color: 0xffffff }));
grout.position.set(COLS / 2, TOP / 2, -.01); scene.add(grout);

// ---------- 线路的砖：铺设时刻 ----------
const LINES = M.lines.map(l => ({ ...l, c: col(l.colour) }));
const PH = M.phases.map(p => ({ ...p, t0: 0, t1: 0 }));
const TILES = M.tiles.map(([u, v, a, ph, k]) => ({ u, v, a, ph, k, t: 0 }));
const byPhase = PH.map(() => []); TILES.forEach((t, i) => byPhase[t.ph].push(i));
const ST = new Map(M.stations.map(s => [s.n, s]));
const stUV = (n) => { const s = ST.get(n); return [s.u, s.v]; };
// 第一天：1 号线越铺越快（第 k 片在 t0 + a(√(k+1) − 1)），4 号线等铺砖前沿过了会展中心再铺
{
  const p0 = PH.findIndex(p => p.date === '2004-12-28' && LINES[p.line].ref === '1'), p4 = PH.findIndex(p => p.date === '2004-12-28' && LINES[p.line].ref === '4');
  const n = PH[p0].n, a = (TL.FIRST.t1 - TL.FIRST.t0) / (Math.sqrt(n) - 1);
  byPhase[p0].forEach(i => { TILES[i].t = TL.FIRST.t0 + a * (Math.sqrt(TILES[i].k + 1) - 1); });
  PH[p0].t0 = TL.FIRST.t0; PH[p0].t1 = TL.FIRST.t1;
  const f = PH[p0].stations.find(s => s[0] === TL.FIRST.line4.after)[1], kk = Math.round(f * (n - 1));
  const ts = TL.FIRST.t0 + a * (Math.sqrt(kk + 1) - 1) + .25;
  PH[p4].t0 = ts; PH[p4].t1 = ts + TL.FIRST.line4.d;
  byPhase[p4].forEach(i => { TILES[i].t = ts + TL.FIRST.line4.d * TILES[i].k / Math.max(1, PH[p4].n - 1); });
}
for (const act of TL.ACTS) {
  const ps = PH.map((p, i) => i).filter(i => PH[i].date > act.from && PH[i].date <= act.to && !(PH[i].date === '2004-12-28'));
  const dates = [...new Set(ps.map(i => PH[i].date))].sort();
  const span = act.t1 - act.t0, m = dates.length;
  const start = i => act.t0 + (m > 1 ? .5 * span * dates.indexOf(PH[i].date) / (m - 1) : 0);
  const rate = Math.max(...ps.map(i => PH[i].n / (act.t1 - start(i))));          // 同一个铺砖速度（片/秒），最后一期正好在段尾铺完
  for (const i of ps) { PH[i].t0 = start(i); PH[i].t1 = start(i) + PH[i].n / rate; byPhase[i].forEach(j => { TILES[j].t = PH[i].t0 + TILES[j].k / rate; }); }
  act.rate = rate;
}
// 一期里离 f（0–1，按距离）最近的那片砖的时刻
const timeAt = (pi, f) => { const ids = byPhase[pi]; if (!ids.length) return PH[pi].t0 + f * (PH[pi].t1 - PH[pi].t0); const k = Math.round(f * (ids.length - 1)); return TILES[ids.find(i => TILES[i].k === k) ?? ids[0]].t; };
// 站砖：每条线到站时各记一次；换乘站在第二条线到的时候换成大圆砖
const STA = M.stations.map(s => {
  const per = new Map();
  for (const [li, pi, f] of s.at) { const t = timeAt(pi, f) + .12; if (!per.has(li) || per.get(li) > t) per.set(li, t); }
  let ts = [...per.values()].sort((a, b) => a - b);
  if (s.n === '李松蓢') ts = [TL.LAST];
  if (s.n === '罗湖') ts[0] = TL.FIRST.disc;                                   // 第一片绿砖先落，站砖晚一拍                                          // 最后一片砖，静场之后单独落下
  return { ...s, ts };
});
const lineMat = glaze(), lineMesh = inst(tileGeo(.43, .43, .32, .07), lineMat, TILES.length);
TILES.forEach((tl, n) => lineMesh.setColorAt(n, jitter(LINES[PH[tl.ph].line].c, .08, .01, .08, n * 3.7 + 1)));
const discMat = glaze({ vertexColors: true }), discMesh = inst(discGeo(), discMat, STA.length);
STA.forEach((s, n) => discMesh.setColorAt(n, col('#ffffff')));
// 底砖什么时候被撬掉：线路砖落下之前 0.15 秒，半径 0.72 格以内的底砖
const REMOVE = new Map();
for (const tl of TILES) {
  for (let j = Math.floor(tl.v - 1); j <= Math.floor(tl.v + 1); j++) for (let i = Math.floor(tl.u - 1); i <= Math.floor(tl.u + 1); i++) {
    if (i < 0 || j < 0 || i >= COLS || j >= ROWS) continue;
    if ((i + .5 - tl.u) ** 2 + (j + .5 - tl.v) ** 2 > .72 ** 2) continue;
    const c = cellIndex(i, j), t = tl.t - .15;
    if (!REMOVE.has(c) || REMOVE.get(c) > t) REMOVE.set(c, t);
  }
}
const REM = [...REMOVE.entries()];

// ---------- 搪瓷牌 ----------
const F = (w, px, fam = FONT_CN) => `${w} ${px}px ${fam}`;
const free = (cx, cy, w, h, pad = .6) => {           // 牌子挡住的（最终）线路砖和站砖有几片
  let n = 0; const x0 = cx - w / 2 - pad, x1 = cx + w / 2 + pad, y0 = cy - h / 2 - pad, y1 = cy + h / 2 + pad;
  for (const t of TILES) if (t.u > x0 && t.u < x1 && t.v > y0 && t.v < y1) n++;
  for (const s of STA) if (s.u > x0 - .6 && s.u < x1 + .6 && s.v > y0 - .6 && s.v < y1 + .6) n += 2;
  return n;
};
const PLACED = [];
function spot(u, v, w, h, o = {}) {                   // 在车站旁边找一块空地挂牌子：挡住的砖越少越好，离车站越近越好
  let best = null;
  for (let dy = -(o.r || 9); dy <= (o.r || 9); dy += .5) for (let dx = -(o.r || 9) * 1.6; dx <= (o.r || 9) * 1.6; dx += .5) {
    const cx = u + dx, cy = v + dy;
    if (Math.abs(dx) < w / 2 + .9 && Math.abs(dy) < h / 2 + .9) continue;      // 不压在车站上
    if (PLACED.some(p => Math.abs(p[0] - cx) < (p[2] + w) / 2 + 1 && Math.abs(p[1] - cy) < (p[3] + h) / 2 + 1)) continue;
    const c = free(cx, cy, w, h) * 4 + Math.hypot(dx, dy * 1.3) * .25 + (o.below && dy > 0 ? 6 : 0) + (o.left && dx > 0 ? 3 : 0);
    if (!best || c < best[2]) best = [cx, cy, c];
  }
  PLACED.push([best[0], best[1], w, h]); return best;
}
const PL = [];                                            // { id, group, pieces, t, read, z }
function hang(id, p, u, v, t, read, z = .62) { p.group.position.set(u, v, z); scene.add(p.group); const o = { id, ...p, u, v, t, read, z }; PL.push(o); return o; }
function stationPlaque(n, o = {}) {
  const s = ST.get(n), en = s.en || '';
  const h = o.date ? 5.4 : 3.5, w = Math.max(n.length * 1.15 + 2.2, en.length * .38 + 2.4, o.date ? 9.6 : 0);
  return plaque(w, h, (g, Wc, Hc, px, m) => {
    const b = [];
    b.push(line(g, o.id + '-n', n, F(700, px * 1.25), Wc / 2, m + px * 1.42, 'center', { spacing: px * .08 }));
    b.push(line(g, o.id + '-en', en, F(600, px * .62, FONT_EN), Wc / 2, m + px * 2.28, 'center', { spacing: px * .03 }));
    if (o.date) {
      g.fillRect(Wc * .12, m + px * 2.72, Wc * .76, Math.max(2, px * .05));
      b.push(line(g, o.id + '-d', o.date, F(600, px * .56, FONT_EN), Wc / 2, m + px * 3.42, 'center', { spacing: px * .04 }));
      b.push(line(g, o.id + '-d2', '第一天 First day', F(700, px * .5), Wc / 2, m + px * 4.1, 'center'));
      // 两行日期算一块：readcheck 按一整块计时
      const d1 = b.pop(), d0 = b.pop(); b.push({ id: o.id + '-date', text: d0.text + ' ' + d1.text, x0: Math.min(d0.x0, d1.x0), y0: d0.y0, x1: Math.max(d0.x1, d1.x1), y1: d1.y1 });
    }
    // 中英两行算一块
    const e = b.splice(1, 1)[0], c = b[0]; b[0] = { id: o.id + '-name', text: c.text + ' ' + e.text, x0: Math.min(c.x0, e.x0), y0: c.y0, x1: Math.max(c.x1, e.x1), y1: e.y1 };
    return b;
  }, { rnd: mulberry(n.length * 97) });
}
for (const P of TL.PLAQUES) {
  if (P.kind === 'first' || P.kind === 'station') {
    const p = stationPlaque(P.st, { id: P.id, date: P.kind === 'first' ? '2004.12.28' : '' });
    const [u, v] = stUV(P.st), b = spot(u, v, p.w, p.h, { below: P.kind === 'first', r: 8 });
    hang(P.id, p, b[0], b[1], P.t, P.read);
  } else if (P.kind === 'title') {
    const p = plaque(38, 15, (g, Wc, Hc, px, m) => {
      const a = line(g, 'title-cn', '一片一片', F(900, px * 4.6), Wc / 2, m + px * 5.0, 'center', { spacing: px * .4 });
      const e = line(g, 'title-en', 'Tile by Tile', F(600, px * 2.3, FONT_EN), Wc / 2, m + px * 7.7, 'center', { spacing: px * .1 });
      g.fillRect(Wc * .18, m + px * 8.7, Wc * .64, Math.max(2, px * .09));
      const s1 = line(g, 'sub-cn', '深圳地铁 2004—2026', F(700, px * 1.6), Wc / 2, m + px * 10.9, 'center', { spacing: px * .1 });
      const s2 = line(g, 'sub-en', 'Shenzhen Metro', F(600, px * 1.5, FONT_EN), Wc / 2, m + px * 12.7, 'center', { spacing: px * .14 });
      return [{ id: 'title', text: a.text + ' ' + e.text, x0: Math.min(a.x0, e.x0), y0: a.y0, x1: Math.max(a.x1, e.x1), y1: e.y1 },
              { id: 'subtitle', text: s1.text + ' ' + s2.text, x0: Math.min(s1.x0, s2.x0), y0: s1.y0, x1: Math.max(s1.x1, s2.x1), y1: s2.y1 }];
    }, { rnd: mulberry(5) });
    const b = spot(138, 17, p.w, p.h, { r: 10 });
    hang('title', p, b[0], b[1], P.t, P.read);
  } else if (P.kind === 'credit') {
    const p = plaque(56, 17, (g, Wc, Hc, px, m) => {
      const x = m + px * 2, b = [];
      b.push(line(g, 'credit-fan', '非官方粉丝作品 · Unofficial fan film', F(700, px * 2.6), x, m + px * 4.0));
      g.fillRect(x, m + px * 5.3, Wc - 2 * x, Math.max(2, px * .08));
      b.push(line(g, 'credit-osm', '线路、车站与海岸 Lines, stations, coast: © OpenStreetMap contributors, ODbL 1.0', F(700, px * 1.15), x, m + px * 7.3, 'left', { pass: true, maxW: Wc - 2 * x }));
      b.push(line(g, 'credit-src', '开通日期与里程 Opening dates and lengths: 深圳地铁集团, 深圳市交通运输局, 深圳新闻网 等', F(700, px * 1.15), x, m + px * 9.0, 'left', { pass: true, maxW: Wc - 2 * x }));
      b.push(line(g, 'credit-dis', '线路颜色与站名是公开信息；与运营方无关，不用其标识 Line colours and station names are public facts; no operator marks', F(700, px * .95), x, m + px * 10.6, 'left', { pass: true, maxW: Wc - 2 * x }));
      b.push(line(g, 'credit-neo', 'NEO-Cine · 瓷砖地铁图 Metro Mosaic', F(700, px * 1.8), x, m + px * 13.4, 'left'));
      return b;
    }, { rnd: mulberry(11), bg: '#1c3260' });
    hang('credit', p, P.at[0], P.at[1], P.t ?? -9, P.read);
  }
}
// 年份牌：一块一块挂上去，后挂的盖在前一块上面
const STATS = [
  { year: '2011', cn: '5 条线 · 178 公里', en: '5 lines · 178 km' },
  { year: '2016', cn: '8 条线 · 285 公里', en: '8 lines · 285 km' },
  { year: '2020', cn: '11 条线 · 411 公里', en: '11 lines · 411 km' },
  { year: '2026', head: '城市轨道交通 Urban rail', cn: '653.7 公里 · 452 座车站', en: '653.7 km · 452 stations' },
];
const statT = TL.STATS.t;
STATS.forEach((s, i) => {
  const p = plaque(TL.STATS.w, TL.STATS.h, (g, Wc, Hc, px, m) => {
    const b = [], x = Wc / 2, k = s.head ? .82 : 1;
    b.push(line(g, `y${i}`, s.year, F(600, px * 8.6 * k, FONT_EN), x, m + px * 8.3 * k, 'center', { spacing: px * .3 }));
    g.fillRect(Wc * .1, m + px * 9.6 * k, Wc * .8, Math.max(2, px * .14));
    let y = m + px * (9.6 * k + 4.9);
    if (s.head) { b.push(line(g, `h${i}`, s.head, F(700, px * 3.0), x, y - px * .3, 'center', { spacing: px * .1 })); y += px * 4.2; }
    b.push(line(g, `c${i}`, s.cn, F(700, px * 4.2 * k), x, y + px * .2, 'center', { spacing: px * .12 }));
    b.push(line(g, `e${i}`, s.en, F(600, px * 4.0 * k, FONT_EN), x, y + px * 4.6 * k, 'center', { spacing: px * .1 }));
    return b;
  }, { rnd: mulberry(100 + i) });
  const t = statT[i], nxt = statT[i + 1] ?? TL.DUR + 1;
  hang('stat' + i, p, TL.STATS.at[0], TL.STATS.at[1], t, i === STATS.length - 1 ? [TL.bar(20, 2), TL.DUR] : [t + .35, Math.min(nxt, t + 6)], .62 + i * .22);
});

// ---------- 镜头 ----------
const resolve = (p) => p === 'credit' ? [PL.find(q => q.id === 'credit').u, PL.find(q => q.id === 'credit').v] : typeof p[0] === 'string' ? [stUV(p[0])[0] + p[1], stUV(p[0])[1] + p[2]] : p;
const CAMK = track(TL.CAM.map(([t, p, h, yaw, pitch, k]) => { const [u, v] = resolve(p); return [t, [u, v, Math.log(h), yaw, pitch, k]]; }));
const FOV = 30, TANH = Math.tan(FOV / 2 * Math.PI / 180);
function camAt(t) {
  const [u, v, lh, yaw, pitch, k] = CAMK(t), h = Math.exp(lh), d = h / 2 / TANH;
  const ya = yaw * Math.PI / 180, pa = pitch * Math.PI / 180;
  const tgt = new THREE.Vector3(u, v, .3), dir = new THREE.Vector3(Math.sin(ya) * Math.cos(pa), Math.sin(pa), Math.cos(ya) * Math.cos(pa));
  return { tgt, pos: tgt.clone().addScaledVector(dir, d), d, k, h };
}
function setCam(t) {
  const c = camAt(t);
  camera.position.copy(c.pos); camera.up.set(0, 1, 0); camera.lookAt(c.tgt);
  camera.near = c.d * .05; camera.far = c.d * 30; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  post.dof.focus = c.d; post.dof.aper = c.k * c.d; post.dof.maxCoc = 16;
  return c;
}
const V = new THREE.Vector3();
function toScreen(x, y, z) { V.set(x, y, z).project(camera); return [(V.x + 1) / 2 * W, (1 - V.y) / 2 * H, V.z]; }

// ---------- 一帧 ----------
const RK = track(TL.RAKE.map(([t, x, w, s]) => [t, [x, w, s]])), EXPO = monotone(TL.EXPO);
const DL = .3;                                           // 一片砖从手里落到墙上的时长
function layTile(n, t) {
  const tl = TILES[n], p = (t - tl.t) / DL;
  if (p < 0) { lineMesh.setMatrixAt(n, ZERO); return; }
  const e = eo(Math.min(1, p)), q = 1 - e, s = n * .77;
  const press = p > 1 && p < 1.6 ? -.035 * Math.sin(Math.PI * (p - 1) / .6) : 0;
  const tx = -Math.sin(tl.a), ty = Math.cos(tl.a);       // 线路的法线：砖从这一侧上方递过来
  place(lineMesh, n, tl.u + (hash(s) - .5) * .06 + tx * q * .5, tl.v + (hash(s + 1) - .5) * .06 + ty * q * .5 + q * .35, q * 2.2 + press,
    tl.a + (hash(s + 2) - .5) * .12 + q * .5, (hash(s + 3) - .5) * .09 + q * .7, (hash(s + 4) - .5) * .09, 1 + (hash(s + 6) - .5) * .08, 1 + (hash(s + 7) - .5) * .08, 1 + (hash(s + 5) - .5) * .2);
  if (p < .25) { lineMesh.getMatrixAt(n, mtx); const k = .4 + .6 * p / .25; mtx.scale(V.set(k, k, k)); lineMesh.setMatrixAt(n, mtx); }
}
function layDisc(n, t) {
  const s = STA[n]; let i = -1; while (i + 1 < s.ts.length && s.ts[i + 1] <= t) i++;
  if (i < 0) { discMesh.setMatrixAt(n, ZERO); return; }
  const p = (t - s.ts[i]) / (DL * 1.2), e = eo(Math.min(1, p)), q = 1 - e;
  const press = p > 1 && p < 1.6 ? -.04 * Math.sin(Math.PI * (p - 1) / .6) : 0;
  let r = i >= 1 ? 1.06 : .64, z = press, tilt = 0;
  if (i === 0) { z += q * (s.n === '李松蓢' ? 9 : 2.4); tilt = q * .5; }   // 第一次：圆砖从手里落下（最后一片落得更远，看得见）
  else if (i === 1) { r = lerp(.64, 1.06, e); z += Math.sin(Math.PI * Math.min(1, p)) * .5; }   // 第二条线到站：撬起来换成大圆砖
  else z += Math.sin(Math.PI * Math.min(1, p)) * .25;                    // 再多一条线：重新压一下
  place(discMesh, n, s.u, s.v, z, 0, (hash(n) - .5) * .03 + tilt, (hash(n + 1) - .5) * .03, r, r, 1);
}
function hangPlaque(o, t) {
  const p = (t - o.t) / .5;
  if (p < 0) { o.group.visible = false; return; }
  o.group.visible = true;
  const e = eo(Math.min(1, p)), q = 1 - e, press = p > 1 && p < 1.5 ? -.05 * Math.sin(Math.PI * (p - 1) / .5) : 0;
  o.group.position.set(o.u, o.v + q * 1.2, o.z + q * 5 + press); o.group.rotation.set(q * .35, 0, (hash(o.u) - .5) * .012 + q * .06);
}
let LAST_T = -1;
window.render = (t) => {
  t = clamp(t, 0, TL.DUR); LAST_T = t;
  for (let n = 0; n < TILES.length; n++) layTile(n, t);
  for (let n = 0; n < STA.length; n++) layDisc(n, t);
  for (const [c, tr] of REM) {                            // 线路砖落下之前，下面那片白砖被撬起、拿走
    const r = sqRest[c], p = (t - tr) / .16;
    if (p <= 0) place(sqMesh, c, r[0], r[1], 0, r[2], r[3], r[4], r[6], r[7], r[5]);
    else if (p >= 1) sqMesh.setMatrixAt(c, ZERO);
    else { const k = 1 - p; place(sqMesh, c, r[0], r[1] + p * .3, p * 1.2, r[2] + p * .3, r[3] - p * .6, r[4], k * r[6], k * r[7], r[5] * k); }
  }
  lineMesh.instanceMatrix.needsUpdate = true; discMesh.instanceMatrix.needsUpdate = true; sqMesh.instanceMatrix.needsUpdate = true;
  for (const o of PL) hangPlaque(o, t);
  const [rx, rw, rs] = RK(t); RAKE_U.value.set(rx, rw, Math.max(0, rs), 0);
  setCam(t); renderer.toneMappingExposure = EXPO(t);
  post.composer.render();
};

// ---------- 文字（readcheck）：每块牌子上的字块投到屏幕上 ----------
window.TEXTS = (t) => {
  if (LAST_T !== t) window.render(t);
  const out = [];
  for (const o of PL) {
    if (!o.group.visible) continue;
    o.group.updateMatrixWorld(true);
    const inRead = t >= o.read[0] && t <= o.read[1];
    // 后挂的年份牌盖住了前一块
    if (o.id.startsWith('stat')) { const i = +o.id.slice(4); const nx = PL.find(q => q.id === 'stat' + (i + 1)); if (nx && t >= nx.t + .5) continue; }
    for (const pc of o.pieces) {
      const [x0, y0, x1, y1] = pc.rect; let a = [1e9, 1e9, -1e9, -1e9];
      for (const [x, y] of [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]) {
        V.set(x, y, .25).applyMatrix4(o.group.matrixWorld).project(camera);
        const sx = (V.x + 1) / 2 * W, sy = (1 - V.y) / 2 * H; a = [Math.min(a[0], sx), Math.min(a[1], sy), Math.max(a[2], sx), Math.max(a[3], sy)];
      }
      if (a[2] < 0 || a[0] > W || a[3] < 0 || a[1] > H) continue;
      out.push({ id: pc.id, text: pc.text, x0: a[0], y0: a[1], x1: a[2], y1: a[3], ...((pc.pass || !inRead) ? { pass: true } : {}) });
    }
  }
  return out;
};

// ---------- 声音事件 ----------
window.DUR = TL.DUR;
const EV = []; const ev = (type, t, o = {}) => EV.push({ type, t: +t.toFixed(3), ...o });
{
  const panAt = (t, x, y) => { setCam(t); const [sx, , z] = toScreen(x, y, .3); return +clamp((sx / W) * 2 - 1, -1, 1).toFixed(2); };
  const lastPh = PH.length - 1;
  TILES.forEach((tl, n) => ev('tile', tl.t + DL, { line: LINES[PH[tl.ph].line].ref, pan: panAt(tl.t + DL, tl.u, tl.v), first: tl.ph === 0 && tl.k < 1 ? 1 : 0 }));
  STA.forEach((s, n) => s.ts.forEach((ts, i) => ev(s.n === '李松蓢' ? 'last' : 'disc', ts + DL * 1.2, { big: i >= 1 ? 1 : 0, pan: panAt(ts + DL * 1.2, s.u, s.v) })));
  for (const o of PL) ev(o.id.startsWith('stat') ? 'stat' : 'plaque', o.t + .5, { id: o.id, big: o.pieces.length > 2 ? 1 : 0, pan: panAt(o.t + .5, o.u, o.v) });
  ev('first', TILES.find(x => x.ph === 0 && x.k === 0).t + DL);
  for (const a of TL.ACTS) ev('act', a.t0, { id: a.id, d: +(a.t1 - a.t0).toFixed(3) });
  ev('train', TL.bar(18), { d: TL.bar(20, 3) - TL.bar(18) });
  ev('rake', .5, { d: 2.4 });
}
EV.sort((a, b) => a.t - b.t); window.EV = EV;
if (Q.has('stats')) console.log(JSON.stringify({ tiles: TILES.length, sq: sq.length, sub: SUB.length, acts: TL.ACTS.map(a => [a.id, +a.rate.toFixed(1)]) }));
window.render(0);
window.READY = true;
