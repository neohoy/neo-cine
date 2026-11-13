// 十三到五十 · 成片
// 自然底图来自 OpenStreetMap（data/land.json、water.json、peaks-*.json，neo/geo/osm.py 生成），
// 各州和领地的历代边界、铁路来自 OpenHistoricalMap（data/us.json，neo/geo/ohm.py + tools/prep.py 生成）。
// 画面是时间的函数：年份、镜头、纸卷的位置、向导的位置都只由 t 决定；所有东西都经过同一个 世界 → 屏幕 变换。
import { clamp, lerp, mulberry, hash, vnoise, monotone, track, back, eo, eio, ss } from '/core/lib.js';
import { C, rgba, makePaper, drawHill, drawWagon, drawLoco, drawCompass, caps, star, plate } from './atlas.js';
import { DUR, ll, MAP, SECS, YEAR, ROLL as ROLL_K, CAM, FOLLOW, GUIDES, PASS, ORIGINAL, ADMIT, CAPS, FIFTY, TITLE, SEAS } from './timeline.js';

const W = innerWidth, H = innerHeight, K = H / 1080;
const cv = document.getElementById('c'); cv.width = W; cv.height = H; const G = cv.getContext('2d'); let g = G;
const OFF = [0, 1].map(() => new OffscreenCanvas(W, H).getContext('2d'));                   // 一张画要遮罩的层，一张画遮罩
await Promise.all(['40px "IM Fell English"', 'italic 40px "IM Fell English"', '600 40px Song', '400 40px Song'].map(f => document.fonts.load(f, 'From Thirteen to Fifty 十三到五十州路易斯安那购地俄勒冈小道')));
const [LAND, WATER, LA, LB, LC, PW, PE, US] = await Promise.all(['land', 'water', 'lakes-a', 'lakes-b', 'lakes-c', 'peaks-west', 'peaks-east', 'us'].map(n => fetch(`data/${n}.json`).then(r => r.ok ? r.json() : {}).catch(() => ({}))));
WATER.rivers ||= []; PW.peaks ||= []; PE.peaks ||= [];

// ---------- 世界：米 ----------
const END_L = 240e3, END_R = 470e3, EDGE = 56e3, ROLL = 46e3;                                // 左右留纸、上下的丝边、轴的半径
const SCROLL = { x0: MAP.x0 - END_L, x1: MAP.x1 + END_R, y0: MAP.y0, y1: MAP.y1 };
const ringPath = (rings, close = true) => { const p = new Path2D(); for (const r of rings) { p.moveTo(r[0], r[1]); for (let i = 2; i < r.length; i += 2) p.lineTo(r[i], r[i + 1]); if (close) p.closePath(); } return p; };
const landPath = ringPath(LAND.land), lakePath = ringPath([LA, LB, LC].flatMap(l => (l.water || []).flat()));
const BIG = /^(Mississippi|Missouri|Ohio|Columbia|Colorado) River$|^Rio Grande$/;
const riverBig = ringPath(WATER.rivers.filter(r => BIG.test(r.n)).map(r => r.p), false), riverSmall = ringPath(WATER.rivers.filter(r => !BIG.test(r.n)).map(r => r.p), false);

// 山：每 55 公里的格子里只留最高的一座，画成一个晕滃小丘
const HILLS = (() => {
  const cell = 55e3, best = new Map();
  for (const p of [...PW.peaks, ...PE.peaks]) { const k = Math.floor(p.x / cell) + ',' + Math.floor(p.y / cell), o = best.get(k); if (!o || p.e > o.e) best.set(k, p); }
  return [...best.values()].map((p, i) => ({ x: p.x, y: p.y, w: (p.e > 2500 ? 46e3 : 38e3) * (.8 + .5 * hash(i)), h: (p.e > 2500 ? 30e3 : 19e3) * (.8 + .5 * hash(i + 9)), seed: i + 1 })).sort((a, b) => b.y - a.y);
})();

// 州、领地、国土：每个版本一条路径，带起止年份
const area = r => { let a = 0; for (let i = 0; i + 3 < r.length; i += 2) a += r[i] * r[i + 3] - r[i + 2] * r[i + 1]; return a / 2; };
const shape = v => { const big = v.r.reduce((a, b) => Math.abs(area(b)) > Math.abs(area(a)) ? b : a); let x0 = 1e12, x1 = -1e12, y0 = 1e12, y1 = -1e12, cx = 0, cy = 0, A = 0;
  for (let i = 0; i + 3 < big.length; i += 2) { const c = big[i] * big[i + 3] - big[i + 2] * big[i + 1]; A += c; cx += (big[i] + big[i + 2]) * c; cy += (big[i + 1] + big[i + 3]) * c; x0 = Math.min(x0, big[i]); x1 = Math.max(x1, big[i]); y0 = Math.min(y0, big[i + 1]); y1 = Math.max(y1, big[i + 1]); }
  return { s: v.s, e: v.e, path: ringPath(v.r), cx: cx / (3 * A), cy: cy / (3 * A), bw: x1 - x0, bh: y1 - y0, area: Math.abs(A / 2), pts: big }; };
const yearF = monotone(YEAR), whenYear = y => { let a = 0, b = YEAR[YEAR.length - 1][0]; if (yearF(a) >= y) return a; for (let i = 0; i < 32; i++) { const m = (a + b) / 2; if (yearF(m) >= y) b = m; else a = m; } return b; };
const STATES = US.states.map(s => { const v = s.v.map(shape), oi = ORIGINAL.indexOf(s.n), admit = oi >= 0 ? 1776 : (ADMIT[s.n] || v[0].s);
  return { n: s.n, v, admit, t: oi >= 0 ? .4 + oi * .155 : whenYear(admit) }; }).sort((a, b) => a.t - b.t);
const TERR = US.terr.map(t => ({ n: t.n, ...shape(t) })), USV = US.us.map(shape);
const at = (vs, y) => { let best = null; for (const v of vs) if (v.s <= y && y < v.e) best = v; return best || (y < vs[0].s ? vs[0] : vs[vs.length - 1]); };
// 上色：相邻的州不同色。按顶点落在同一个 60 公里格子里判断相邻，按加入的先后贪心取色
{ const cell = 60e3, grid = new Map();
  STATES.forEach((s, i) => { const p = s.v[s.v.length - 1].pts; for (let k = 0; k < p.length; k += 2) { const key = Math.floor(p[k] / cell) + ',' + Math.floor(p[k + 1] / cell); (grid.get(key) || grid.set(key, new Set()).get(key)).add(i); } });
  const adj = STATES.map(() => new Set()); for (const set of grid.values()) for (const a of set) for (const b of set) if (a !== b) adj[a].add(b);
  const used = new Array(C.tints.length).fill(0);
  STATES.forEach((s, i) => { const taken = new Set([...adj[i]].map(j => STATES[j].tint)); let best = -1; for (let c = 0; c < C.tints.length; c++) if (!taken.has(c) && (best < 0 || used[c] < used[best])) best = c; s.tint = best < 0 ? i % C.tints.length : best; used[s.tint]++; }); }
// 铁路：按通车年份分桶
const RAILS = (() => { const m = new Map(); for (const r of US.rail) { (m.get(r.s) || m.set(r.s, []).get(r.s)).push(r.p); } return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([y, ps]) => ({ y, path: ringPath(ps, false) })); })();

// ---------- 纹理 ----------
const paperPat = G.createPattern(makePaper(1024, 17), 'repeat');

// ---------- 时间：镜头、纸卷、向导 ----------
const camTrack = track(CAM.map(([t, lon, lat, h]) => { const [x, y] = ll(lon, lat); return [t, [x, y, Math.log(h * 1e3)]]; })), followF = monotone(FOLLOW);
const rollF = monotone(ROLL_K), rollX = t => Math.max(SCROLL.x0, rollF(Math.min(t, ROLL_K[ROLL_K.length - 1][0])) + (t > ROLL_K[ROLL_K.length - 1][0] ? -1e9 : 0));
const inkX = t => t < .25 ? 1e12 : Math.max(rollX(t - .35) + 130e3, rollX(t) + 60e3), SOFT = 170e3;
const edge = y => 90e3 * (vnoise(y / 160e3) - .5) + 30e3 * (vnoise(y / 31e3 + 9) - .5);
for (const gd of GUIDES) { gd.pts = gd.path.map(([t, lon, lat]) => [t, ...ll(lon, lat)]); let d = 0; gd.dist = [0]; for (let i = 1; i < gd.pts.length; i++) { d += Math.hypot(gd.pts[i][1] - gd.pts[i - 1][1], gd.pts[i][2] - gd.pts[i - 1][2]); gd.dist.push(d); } }
function guideAt(gd, t) {
  const p = gd.pts; if (t <= p[0][0]) return { x: p[0][1], y: p[0][2], d: 0, i: 0, u: 0 };
  for (let i = 1; i < p.length; i++) if (t <= p[i][0]) { const u = (t - p[i - 1][0]) / (p[i][0] - p[i - 1][0]); return { x: lerp(p[i - 1][1], p[i][1], u), y: lerp(p[i - 1][2], p[i][2], u), d: lerp(gd.dist[i - 1], gd.dist[i], u), i, u }; }
  const l = p.length - 1; return { x: p[l][1], y: p[l][2], d: gd.dist[l], i: l, u: 1 };
}
const leader = t => t < 26 ? GUIDES[0] : GUIDES[2];                                          // 镜头跟谁：先是篷车，后是火车

let cam, S, texts = [];
const sx = x => W / 2 + (x - cam.x) * S, sy = y => H / 2 - (y - cam.y) * S;                   // 唯一的 世界 → 屏幕
const world = () => g.setTransform(S, 0, 0, -S, W / 2 - cam.x * S, H / 2 + cam.y * S), screen = () => g.setTransform(1, 0, 0, 1, 0, 0);
const lw = (m, minPx, maxPx = 1e9) => clamp(m, minPx * K / S, maxPx * K / S);                 // 世界单位的线宽，屏幕上不细于 minPx、不粗于 maxPx
const mapRect = () => { g.beginPath(); g.rect(sx(MAP.x0), sy(MAP.y1), (MAP.x1 - MAP.x0) * S, (MAP.y1 - MAP.y0) * S); };

function layer(draw, mask) {                                       // 画到离屏上，用遮罩裁掉还没画到的部分，再贴回主画面
  const o = OFF[0]; o.setTransform(1, 0, 0, 1, 0, 0); o.globalAlpha = 1; o.globalCompositeOperation = 'source-over'; o.filter = 'none'; o.clearRect(0, 0, W, H);
  g = o; draw(); g = G;
  if (mask) { const m = OFF[1]; m.setTransform(1, 0, 0, 1, 0, 0); m.clearRect(0, 0, W, H); mask(m); o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = 'destination-in'; o.drawImage(m.canvas, 0, 0); o.globalCompositeOperation = 'source-over'; }
  screen(); G.drawImage(o.canvas, 0, 0);
}
function washMask(m, xf) {                                         // 前沿：一条条横带，起点参差，往东渐渐显出来
  const bh = Math.max(3, 26e3 * S);
  for (let y = 0; y < H; y += bh) { const wy = cam.y + (H / 2 - y - bh / 2) / S, x0 = sx(xf + edge(wy)), x1 = x0 + SOFT * S; if (x0 > W) continue; const gr = m.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, '#000'); m.fillStyle = gr; m.fillRect(Math.floor(x0), y, W - Math.floor(x0) + 1, bh + 1); }
}

function drawMap(t, Y) {
  screen(); g.save(); mapRect(); g.clip();
  g.fillStyle = C.sea; g.fillRect(0, 0, W, H);
  world(); g.lineJoin = 'round'; g.lineCap = 'round';
  // 海岸外的水线：由宽到窄一圈圈描，留下贴着岸的几道细线
  for (const [wm, col, mn] of [[150e3, rgba(C.seaLine, .1), 9], [96e3, C.sea, 6.4], [90e3, rgba(C.seaLine, .42), 6], [78e3, C.sea, 5.2], [54e3, rgba(C.seaLine, .5), 3.6], [42e3, C.sea, 2.8], [22e3, rgba(C.seaLine, .6), 1.5], [11e3, C.sea, .7]]) { g.strokeStyle = col; g.lineWidth = lw(wm, mn, mn * 3.2); g.stroke(landPath); }
  g.fillStyle = C.land; g.fill(landPath);
  // 国土：一层淡的底色；领地：只有一圈灰绿的边
  const us = at(USV, Y); g.fillStyle = rgba('#e3d39a', .42); g.fill(us.path);
  for (const tr of TERR) if (tr.s <= Y && Y < tr.e) { g.save(); g.clip(tr.path); g.strokeStyle = rgba('#8f9a72', .5); g.lineWidth = lw(52e3, 3.5, 12); g.stroke(tr.path); g.restore(); }
  // 州：淡彩铺底，里面一圈深一号的边（老地图集的“勾边设色”）
  const live = [];
  for (const s of STATES) { const k = clamp((t - s.t) / .7); if (k <= 0) continue; const v = at(s.v, Math.max(Y, s.admit)), col = C.tints[s.tint]; live.push([s, v, k]);
    g.globalAlpha = k; g.fillStyle = rgba(col, .46); g.fill(v.path); g.save(); g.clip(v.path); g.strokeStyle = rgba(col, .95); g.lineWidth = lw(56e3, 4, 13) * (2 - k); g.stroke(v.path); g.restore(); g.globalAlpha = 1; }
  // 湖和河
  g.fillStyle = C.sea; g.fill(lakePath, 'evenodd'); g.strokeStyle = rgba(C.seaLine, .8); g.lineWidth = lw(5e3, .7, 1.4); g.stroke(lakePath);
  g.strokeStyle = rgba(C.river, .8); g.lineWidth = lw(9e3, 1.1, 2.6); g.stroke(riverBig); g.strokeStyle = rgba(C.river, .6); g.lineWidth = lw(5e3, .7, 1.6); g.stroke(riverSmall);
  // 界线：州和领地是细虚线，国土的外沿是点划线
  g.lineCap = 'butt'; g.strokeStyle = rgba(C.ink, .6); g.lineWidth = lw(4e3, .7, 1.3); const d = lw(16e3, 4, 9); g.setLineDash([d, d * .6]);
  for (const tr of TERR) if (tr.s <= Y && Y < tr.e) g.stroke(tr.path);
  for (const [, v, k] of live) { g.globalAlpha = k; g.stroke(v.path); } g.globalAlpha = 1;
  g.strokeStyle = rgba(C.red, .75); g.lineWidth = lw(7e3, 1.2, 2.4); g.setLineDash([d * 1.6, d * .5, d * .25, d * .5]); g.stroke(us.path); g.setLineDash([]);
  // 海岸刻线
  g.lineCap = 'round'; g.strokeStyle = C.ink; g.lineWidth = lw(6e3, 1, 2); g.stroke(landPath);
  // 铁路：通车年份到了才画；当年的那一批淡入
  const rw = lw(5e3, .8, 1.9);
  for (const r of RAILS) { if (r.y > Y) break; g.globalAlpha = clamp(Y - r.y + .15) * (.42 + .53 * clamp((S / K - 3e-4) / 1.2e-3)); g.strokeStyle = C.ink; g.lineWidth = rw; g.setLineDash([]); g.stroke(r.path); if (S * K > 0 && rw * S > 1.3 * K) { g.strokeStyle = C.land; g.lineWidth = rw * .45; g.setLineDash([rw * 2.2, rw * 2.2]); g.stroke(r.path); g.setLineDash([]); } }
  g.globalAlpha = 1; screen();
  // 山
  for (const m of HILLS) { const w = Math.max(m.w * S, 9 * K), h = Math.max(m.h * S, 6 * K), x = sx(m.x), y = sy(m.y) + h * .4; if (x < -w || x > W + w || y < -h || y > H + h * 2) continue; drawHill(g, x, y, w, h, m.seed); }
  // 州名和领地名
  const name = (txt, v, k, italic) => { const n = [...txt].length, size = Math.min(v.bw * .74 / (n * .92), v.bh * .26) * S; if (size < 8.5 * K) return; const fs = Math.min(size, 46 * K), x = sx(v.cx), y = sy(v.cy); if (x < -300 || x > W + 300 || y < -60 || y > H + 60) return;
    g.globalAlpha = k * (italic ? .7 : .92); const b = caps(g, txt.toUpperCase(), x, y, fs, italic ? C.sepia : C.ink, italic ? .12 : .3, italic, .75); g.globalAlpha = 1; texts.push({ id: txt + (italic ? '~' : ''), text: txt.toUpperCase(), ...b, pass: true }); };
  for (const tr of TERR) if (tr.s <= Y && Y < tr.e && tr.area > 9e10) name(tr.n.replace(/^Unorganized Federal Territory.*/, 'Unorganized'), tr, 1, true);
  for (const [s, v, k] of live) name(s.n, v, k, false);
  for (const o of SEAS) { const [x, y] = ll(o.lon, o.lat), fs = clamp(o.m * S, 13 * K, 40 * K); g.save(); g.translate(sx(x), sy(y)); g.rotate(o.rot || 0); g.globalAlpha = .7; caps(g, o.text, 0, 0, fs, C.seaLine, .5, true, 0); g.restore(); }
  g.restore(); screen();
}

function drawGuides(t) {                                           // 向导和它走过的路
  g.save(); mapRect(); g.clip();
  for (const gd of GUIDES) {
    if (t < gd.show[0]) continue; const p = guideAt(gd, t), a = clamp((t - gd.show[0]) / .5) * clamp((gd.show[1] + .6 - t) / .6);
    if (gd.kind === 'wagon') {                                      // 身后一串红点：走过的路
      g.strokeStyle = rgba(C.red, .85 * clamp((gd.show[1] + 3 - t) / 2)); g.lineWidth = clamp(7e3 * S, 1.6 * K, 3.4 * K); g.lineCap = 'round'; const dd = g.lineWidth; g.setLineDash([.01, dd * 2.4]);
      g.beginPath(); g.moveTo(sx(gd.pts[0][1]), sy(gd.pts[0][2])); for (let i = 1; i < p.i; i++) g.lineTo(sx(gd.pts[i][1]), sy(gd.pts[i][2])); g.lineTo(sx(p.x), sy(p.y)); g.stroke(); g.setLineDash([]);
    }
    if (a <= 0) continue; const size = clamp(110e3 * S, 34 * K, 150 * K), roll = p.d * S / size;
    g.globalAlpha = a; if (gd.kind === 'wagon') drawWagon(g, sx(p.x), sy(p.y) + size * .12, size, roll, Math.sin(roll * 3)); else drawLoco(g, sx(p.x), sy(p.y) + size * .1, size * .92, roll, t, 3); g.globalAlpha = 1;
  }
  g.restore();
}

function drawScroll(xr) {                                          // 纸纹、丝边、轴、桌面
  screen(); const x0 = sx(xr), x1 = sx(SCROLL.x1), y0 = sy(SCROLL.y1), y1 = sy(SCROLL.y0), mt = EDGE * S;
  g.save(); g.beginPath(); g.rect(x0, y0, W + 9 - x0, y1 - y0); g.clip(); g.globalCompositeOperation = 'multiply';
  const z = Math.log2(S / K / 9e-4), o = Math.floor(z), f = z - o;
  for (const [sc, al] of [[2 ** f, 1 - f], [2 ** (f - 1), f]]) { paperPat.setTransform(new DOMMatrix().translate(sx(0), sy(0)).scale(sc * K * 1.3)); g.globalAlpha = al; g.fillStyle = paperPat; g.fillRect(0, 0, W, H); }
  g.globalAlpha = 1; const eg = g.createLinearGradient(0, y0, 0, y1); eg.addColorStop(0, 'rgba(110,80,40,.28)'); eg.addColorStop(.06, 'rgba(110,80,40,0)'); eg.addColorStop(.94, 'rgba(110,80,40,0)'); eg.addColorStop(1, 'rgba(110,80,40,.28)'); g.fillStyle = eg; g.fillRect(0, 0, W, H); g.restore();
  // 画心的双线图廓
  g.save(); g.beginPath(); g.rect(x0, 0, W + 9 - x0, H); g.clip(); g.strokeStyle = C.ink; const mx = sx(MAP.x0), my = sy(MAP.y1), mw = (MAP.x1 - MAP.x0) * S, mh = (MAP.y1 - MAP.y0) * S;
  g.lineWidth = Math.max(1.6, 9e3 * S); g.strokeRect(mx, my, mw, mh); g.lineWidth = Math.max(.7, 2.5e3 * S); const q = Math.max(4, 22e3 * S); g.strokeRect(mx - q, my - q, mw + 2 * q, mh + 2 * q); g.restore();
  // 桌面
  g.save(); g.beginPath(); g.rect(0, 0, W, H); g.rect(x0, y0 - mt, x1 - x0, y1 - y0 + 2 * mt); g.clip('evenodd');
  const tg = g.createRadialGradient(W / 2, H / 2, H * .2, W / 2, H / 2, W * .75); tg.addColorStop(0, '#241a12'); tg.addColorStop(1, C.table); g.fillStyle = tg; g.fillRect(0, 0, W, H); g.restore();
  // 上下的丝边
  g.save(); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 40 * K; g.shadowOffsetY = 14 * K; g.fillStyle = C.ribbon; g.fillRect(x0, y0 - mt, x1 - x0, mt); g.fillRect(x0, y1, x1 - x0, mt); g.restore();
  g.strokeStyle = rgba(C.gold, .7); g.lineWidth = Math.max(1, 2.5e3 * S); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y0); g.moveTo(x0, y1); g.lineTo(x1, y1); g.stroke();
  const top = y0 - mt, bot = y1 + mt, wood = (cx, rr) => { const wg = g.createLinearGradient(cx - rr, 0, cx + rr, 0); wg.addColorStop(0, '#170d07'); wg.addColorStop(.3, '#6b4426'); wg.addColorStop(.48, '#a8774a'); wg.addColorStop(.7, '#4a2c17'); wg.addColorStop(1, '#120a05'); return wg; };
  { const rr = ROLL * S * .5, cx = x1 + rr * .4; g.save(); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 24 * K; g.shadowOffsetX = 6 * K; g.fillStyle = wood(cx, rr); g.fillRect(cx - rr, top - rr * .6, rr * 2, bot - top + rr * 1.2); g.restore(); }
  { const rem = clamp((xr - SCROLL.x0) / (SCROLL.x1 - SCROLL.x0)), rr = ROLL * S * (1 + 1.4 * rem), cx = x0;                                            // 还没展开的纸卷
    const sh = g.createLinearGradient(cx + rr, 0, cx + rr * 2.6, 0); sh.addColorStop(0, 'rgba(30,18,6,.5)'); sh.addColorStop(1, 'rgba(30,18,6,0)'); g.fillStyle = sh; g.fillRect(cx + rr * .9, top, rr * 1.8, bot - top);
    const kr = ROLL * S * .7; g.fillStyle = wood(cx, kr); g.beginPath(); g.roundRect(cx - kr, top - kr * 2.6, kr * 2, kr * 2.8, kr * .9); g.roundRect(cx - kr, bot - kr * .2, kr * 2, kr * 2.8, kr * .9); g.fill();
    g.save(); g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 34 * K; g.shadowOffsetX = -6 * K;
    const pg = g.createLinearGradient(cx - rr, 0, cx + rr, 0); pg.addColorStop(0, '#463c2a'); pg.addColorStop(.22, '#b0a37f'); pg.addColorStop(.45, '#e9dfc2'); pg.addColorStop(.7, '#bdb08c'); pg.addColorStop(1, '#52462f'); g.fillStyle = pg; g.fillRect(cx - rr, top, rr * 2, bot - top); g.restore();
    const bg = g.createLinearGradient(cx - rr, 0, cx + rr, 0); bg.addColorStop(0, 'rgba(6,14,10,.85)'); bg.addColorStop(.45, 'rgba(6,14,10,0)'); bg.addColorStop(1, 'rgba(6,14,10,.8)'); for (const yy of [top, y1]) { g.fillStyle = C.ribbon; g.fillRect(cx - rr, yy, rr * 2, mt); g.fillStyle = bg; g.fillRect(cx - rr, yy, rr * 2, mt); } }
  const vg = g.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, W * .72); vg.addColorStop(0, 'rgba(40,24,8,0)'); vg.addColorStop(1, 'rgba(40,24,8,.24)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
}

function drawInsets(t) {                                           // 图上的小件：罗盘、1959 年的两张附图、片名
  const cx = -2330e3, cy = -640e3; drawCompass(g, sx(cx), sy(cy), clamp(135e3 * S, 26 * K, 120 * K), clamp((t - 21.6) / .8));
  [['ALASKA', FIFTY.alaska, -117.5, 26.6], ['HAWAII', FIFTY.hawaii, -110.8, 26.6]].forEach(([n, t0, lon, lat]) => { const k = clamp((t - t0) / .22); if (k <= 0) return; const [x, y] = ll(lon, lat), w = 560e3 * S * (1 + .25 * (1 - eo(k))), h = w * .5, px = sx(x) - w / 2, py = sy(y) - h / 2;
    plate(g, px, py, w, h, k); g.globalAlpha = k; star(g, px + w * .16, py + h * .5, h * .2, C.red); const b = caps(g, n, px + w * .58, py + h * .4, h * .26, C.ink, .22, false, 0); caps(g, '1959', px + w * .58, py + h * .7, h * .2, C.sepia, .2, true, 0); g.globalAlpha = 1; texts.push({ id: n, text: n + ' 1959', x0: px, y0: py, x1: px + w, y1: py + h, pass: true }); });
  const kt = clamp((t - TITLE.t0) / 1.1); if (kt > 0) { const x = 2010e3, y = -930e3, w = 920e3 * S, h = w * .56, px = sx(x) - w / 2, py = sy(y) - h / 2; plate(g, px, py, w, h, eo(kt)); g.globalAlpha = eo(kt);
    caps(g, 'FROM', px + w / 2, py + h * .17, h * .1, C.sepia, .5, true, 0); const b = caps(g, 'THIRTEEN TO FIFTY', px + w / 2, py + h * .37, h * .15, C.ink, .16, false, 0);
    g.font = `600 ${h * .2}px Song`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = C.red; g.letterSpacing = `${h * .06}px`; g.fillText('十三到五十', px + w / 2 + h * .03, py + h * .62); g.letterSpacing = '0px';
    caps(g, '1776 — 1959', px + w / 2, py + h * .84, h * .085, C.sepia, .4, false, 0); g.globalAlpha = 1;
    texts.push({ id: 'title', text: 'FROM THIRTEEN TO FIFTY', x0: px, y0: py, x1: px + w, y1: py + h * .5 }, { id: 'title-zh', text: '十三到五十', x0: px, y0: py + h * .5, x1: px + w, y1: py + h }); }
}

function drawHud(t, Y) {                                           // 屏幕上的三块牌子：年份、星、字幕
  const k = clamp((t - .2) / .5) * clamp((TITLE.t0 + .6 - t) / .6); if (k > 0) {
    const pw = 236 * K, ph = 112 * K, px = 54 * K, py = 46 * K; plate(g, px, py, pw, ph, k); g.globalAlpha = k; const yr = String(Math.floor(Y));
    g.font = `${62 * K}px "IM Fell English"`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = C.ink; g.fillText(yr, px + pw / 2, py + ph * .54); texts.push({ id: 'year', text: yr, x0: px, y0: py, x1: px + pw, y1: py + ph, pass: true });
    const n = STATES.filter(s => t >= s.t).length + (t >= FIFTY.alaska ? 1 : 0) + (t >= FIFTY.hawaii ? 1 : 0), sw = 552 * K, sh = 112 * K, qx = W - 54 * K - sw, qy = 46 * K; plate(g, qx, qy, sw, sh, k); g.globalAlpha = k;
    for (let i = 0; i < 50; i++) { const col = i % 17, row = Math.floor(i / 17), x = qx + 34 * K + col * 22.6 * K + (row === 2 ? 5.65 * K : 0), y = qy + 30 * K + row * 22 * K, on = i < n, last = on && i === n - 1, born = last ? Math.max(...STATES.filter(s => t >= s.t).map(s => s.t), t >= FIFTY.hawaii ? FIFTY.hawaii : 0, t >= FIFTY.alaska ? FIFTY.alaska : 0) : 0;
      star(g, x, y, (on ? 8.6 : 6) * K * (last ? 1 + .9 * (1 - clamp((t - born) / .35)) : 1), on ? C.red : rgba(C.sepia, .22)); }
    g.font = `${30 * K}px "IM Fell English"`; g.textAlign = 'right'; g.fillStyle = C.ink; g.fillText(String(n), qx + sw - 26 * K, qy + sh * .52); g.globalAlpha = 1; texts.push({ id: 'count', text: String(n), x0: qx, y0: qy, x1: qx + sw, y1: qy + sh, pass: true });
  }
  for (const [a, b, zh, en] of CAPS) { const kc = Math.min(clamp((t - a) / .3), clamp((b - t) / .3)); if (kc <= 0) continue; const ph = 104 * K;
    g.font = `600 ${34 * K}px Song`; const wz = g.measureText(zh).width; g.font = `italic ${27 * K}px "IM Fell English"`; const we = g.measureText(en).width, pw = Math.max(wz, we) + 96 * K, px = (W - pw) / 2, py = H - 62 * K - ph + (1 - eo(kc)) * 14 * K;
    plate(g, px, py, pw, ph, kc); g.globalAlpha = kc; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `600 ${34 * K}px Song`; g.fillStyle = C.ink; g.fillText(zh, W / 2, py + ph * .36); g.font = `italic ${27 * K}px "IM Fell English"`; g.fillStyle = C.sepia; g.fillText(en, W / 2, py + ph * .71); g.globalAlpha = 1;
    texts.push({ id: zh, text: zh, x0: W / 2 - wz / 2, y0: py + ph * .18, x1: W / 2 + wz / 2, y1: py + ph * .54 }, { id: en, text: en, x0: W / 2 - we / 2, y0: py + ph * .56, x1: W / 2 + we / 2, y1: py + ph * .86 }); }
  const kc = clamp((t - 51) / .8); if (kc > 0) { const fs = 20 * K, txt = 'NEO-Cine · Atlas Scroll'; g.font = `italic ${fs}px "IM Fell English"`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = rgba(C.gold, .85 * kc); g.fillText(txt, W / 2, H - 70 * K); const tw = g.measureText(txt).width; texts.push({ id: 'credit', text: txt, x0: W / 2 - tw / 2, y0: H - 70 * K - fs * .6, x1: W / 2 + tw / 2, y1: H - 70 * K + fs * .6, pass: true }); }
}

window.render = (t) => {
  t = clamp(t, 0, DUR); texts = []; const Y = yearF(t), c = camTrack(t), fw = followF(t), gp = guideAt(leader(t), t);
  cam = { x: lerp(c[0], gp.x + 60e3, fw), y: lerp(c[1], gp.y + 20e3, fw), h: Math.exp(c[2]) }; S = H / cam.h;
  const xr = rollX(t), xi = inkX(t);
  g = G; screen(); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none'; g.fillStyle = C.paper; g.fillRect(0, 0, W, H);
  g.save(); g.beginPath(); g.rect(sx(xr), 0, W + 9 - sx(xr), H); g.clip();                     // 纸卷以西还没有纸
  if (sx(xi - 60e3) < W) layer(() => drawMap(t, Y), sx(xi + 60e3 + SOFT) > 0 ? m => washMask(m, xi) : null);
  drawGuides(t); g.save(); mapRect(); g.clip(); drawInsets(t); g.restore();
  g.restore();
  drawScroll(xr); drawHud(t, Y);
};
window.TEXTS = (t) => { window.render(t); return texts; };
window.DUR = DUR;

// ---------- 声音事件：全部从时间线和数据里推出来 ----------
const EV = [], ev = (type, t, o = {}) => EV.push({ type, t: +t.toFixed(3), ...o });
for (const s of SECS) ev('sec', s.t, { id: s.id });
ev('roll', 0, { d: 3.2 }); ev('roll', 8.6, { d: 2.6 }); ev('roll', 15, { d: 6 }); ev('rollEnd', ROLL_K[ROLL_K.length - 1][0]);
STATES.forEach((s, i) => ev('state', s.t, { n: s.n, i, pan: clamp(s.v[0].cx / 2400e3, -1, 1) }));
for (const gd of GUIDES) ev(gd.kind, gd.show[0], { d: gd.show[1] - gd.show[0] });
ev('pass', PASS[0], { d: PASS[1] - PASS[0] }); ev('spike', 31); ev('whistle', 26.1); ev('whistle', 31.5); ev('whistle', 36.3);
ev('stamp', FIFTY.alaska); ev('stamp', FIFTY.hawaii); ev('title', TITLE.t0);
for (const [a, , zh] of CAPS) ev('cap', a, { text: zh });
EV.sort((a, b) => a.t - b.t); window.EV = EV;
window.render(0); window.READY = true;
