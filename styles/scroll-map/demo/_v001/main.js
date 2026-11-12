// 鹏城长卷 · 成片
// 一张真实的 OSM 地图（data/coast.json、data/futian.json，由 neo/geo/osm.py 生成）画成一幅绢本设色的沿海长卷。
// 画面是时间的函数：镜头 = 看向的点 + 画面高度（米）；所有东西都经过同一个 世界 → 屏幕 变换。
import { clamp, lerp, mulberry, hash, vnoise, monotone, track, back, eo, eio } from '/core/lib.js';
import { C, rgba, makePaper, makeWaves, WAVE, inkStroke, drawPeak, drawHouse, vtext, drawSlip, drawSeal } from './ink.js';
import { DUR, CAM, ROLL as ROLL_K, INK, ZHU, TOWERS, TITLE, LABELS, SECS, X, Y, FORT, NANTOU, LUOHU, CBD } from './timeline.js';

const W = innerWidth, H = innerHeight, K = H / 1080;
const cv = document.getElementById('c'); cv.width = W; cv.height = H; const G = cv.getContext('2d'); let g = G;
const OFF = [0, 1].map(() => { const c = new OffscreenCanvas(W, H); return c.getContext('2d'); });      // 两张离屏：一张画要遮罩的层，一张画遮罩
await Promise.all(['100px Brush', '40px WenKai', '30px "IM Fell English"'].map(f => document.fonts.load(f, '鹏城长卷深圳大鹏所城罗湖福田南山abc')));
const [city, det] = await Promise.all(['data/coast.json', 'data/futian.json'].map(u => fetch(u).then(r => r.json())));

// ---------- 世界：米，x 向东，y 向北 ----------
const [lon0, lat0] = city.meta.origin, RE = 6371008.8, KX = Math.cos(lat0 * Math.PI / 180) * RE * Math.PI / 180, KY = RE * Math.PI / 180;
export const ll = (lon, lat) => [(lon - lon0) * KX, (lat - lat0) * KY];
const [bx0, by0, bx1, by1] = city.meta.box, INSET = 900;
const MAP = { x0: bx0 + INSET, y0: by0 + INSET, x1: bx1 - INSET, y1: by1 - INSET };          // 画心：数据范围往里收一点，盖住裁边
const END_L = 5200, END_R = 9500, MOUNT = 1700, ROLL = 760;                                   // 左右留纸、上下绫边、轴的半径
const SCROLL = { x0: MAP.x0 - END_L, x1: MAP.x1 + END_R, y0: MAP.y0, y1: MAP.y1 };

const pathOf = (rings, close) => { const p = new Path2D(); for (const r of rings) { p.moveTo(r[0], r[1]); for (let i = 2; i < r.length; i += 2) p.lineTo(r[i], r[i + 1]); if (close) p.closePath(); } return p; };
const onBox = (x, y) => Math.abs(x - bx0) < 3 || Math.abs(x - bx1) < 3 || Math.abs(y - by0) < 3 || Math.abs(y - by1) < 3;
const landPath = pathOf(city.land, true);
const coastPath = new Path2D();                                                                // 只有真正的海岸：去掉沿数据边界补上的那几段
for (const r of city.land) { let pen = false; for (let i = 0; i < r.length; i += 2) { const edge = onBox(r[i], r[i + 1]); if (edge) { pen = false; continue; } if (pen) coastPath.lineTo(r[i], r[i + 1]); else { coastPath.moveTo(r[i], r[i + 1]); pen = true; } } }
const multi = list => { const p = new Path2D(); for (const rings of list) for (const r of rings) { p.moveTo(r[0], r[1]); for (let i = 2; i < r.length; i += 2) p.lineTo(r[i], r[i + 1]); p.closePath(); } return p; };
const waterPath = multi(city.water), woodPath = multi(city.wood), parkPath = multi(city.park || []);
const lines = (list, f) => pathOf(list.filter(f).map(d => d.p), false);
const riverPath = lines(city.rivers, d => d.w === 'river'), canalPath = lines(city.rivers, d => d.w === 'canal');
const ROADS = ['tertiary', 'secondary', 'primary', 'trunk', 'motorway'].map(c => ({ c, path: lines(city.roads, d => d.c === c) }));
const railPath = lines(city.rail || [], d => d.c === 'rail' && d.b !== 2);
const streetPath = lines(det.streets || [], () => true);

// ---------- 山：林地有多厚，山就画多大；有名有高程的峰单独立一座 ----------
const MOUNTAINS = (() => {
  const m = 80, mw = Math.ceil((bx1 - bx0) / m), mh = Math.ceil((by1 - by0) / m);
  const a = new OffscreenCanvas(mw, mh), ag = a.getContext('2d', { willReadFrequently: true });
  ag.setTransform(1 / m, 0, 0, -1 / m, -bx0 / m, by1 / m); ag.fillStyle = '#fff'; ag.fill(woodPath, 'evenodd');
  const b = new OffscreenCanvas(mw, mh), bg = b.getContext('2d', { willReadFrequently: true }); bg.filter = 'blur(9px)'; bg.drawImage(a, 0, 0);
  const dens = bg.getImageData(0, 0, mw, mh).data;
  const l = new OffscreenCanvas(mw, mh), lg = l.getContext('2d', { willReadFrequently: true }); lg.setTransform(1 / m, 0, 0, -1 / m, -bx0 / m, by1 / m); lg.fillStyle = '#fff'; lg.fill(landPath);
  const land = lg.getImageData(0, 0, mw, mh).data;
  const at = (d, x, y) => { const i = Math.floor((x - bx0) / m), j = Math.floor((by1 - y) / m); return i < 0 || j < 0 || i >= mw || j >= mh ? 0 : d[(j * mw + i) * 4 + 3] / 255; };
  const out = [];
  const named = city.peaks.filter(p => p.e >= 60 && at(land, p.x, p.y) > .5).sort((p, q) => q.e - p.e);
  for (const p of named) {                                         // 高的先占位，挨得太近的矮峰让掉
    const w = Math.min(3300, 320 + p.e * 3.1); if (out.some(o => Math.hypot(o.x - p.x, o.y - p.y) < (o.w + w) * .3)) continue;
    out.push({ x: p.x, y: p.y, w, h: w * (.62 + .2 * hash(p.x + p.y)), seed: p.x * 3 + p.y, n: p.n, e: p.e });
  }
  const nNamed = out.length, step = 720, r = mulberry(11);
  for (let j = 0, y = MAP.y1; y > MAP.y0; y -= step * .86, j++) for (let x = MAP.x0 + (j % 2 ? step / 2 : 0); x < MAP.x1; x += step) {
    const px = x + (r() - .5) * step * .7, py = y + (r() - .5) * step * .5, d = at(dens, px, py);
    if (d < .45 || at(land, px, py) < .5) continue;
    const w = 520 + 1250 * ((d - .45) / .55) ** 1.4 * (.8 + .4 * r());
    if (out.slice(0, nNamed).some(o => Math.hypot(o.x - px, o.y - py) < o.w * .42)) continue;
    out.push({ x: px, y: py, w, h: w * (.55 + .25 * r()), seed: j * 1000 + x });
  }
  return out.sort((p, q) => q.y - p.y);                           // 北边的先画，南边的压在上面：一层层山
})();

// ---------- 屋宇：每栋楼按占地定宽度，按高度定层数 ----------
const HOUSES = (det.buildings || []).map((b, i) => {
  let ar = 0, cx = 0, cy = 0; const p = b.p;
  for (let k = 0; k + 3 < p.length; k += 2) { const c = p[k] * p[k + 3] - p[k + 2] * p[k + 1]; ar += c; cx += (p[k] + p[k + 2]) * c; cy += (p[k + 1] + p[k + 3]) * c; }
  ar /= 2; if (Math.abs(ar) < 140) return null; cx /= 6 * ar; cy /= 6 * ar; ar = Math.abs(ar);
  const tiers = b.h > 0 ? clamp(Math.round(b.h / 32), 1, 11) : ar > 5000 ? 2 : 1;
  return { x: cx, y: cy, w: clamp(Math.sqrt(ar) * 1.45, 44, 170), tiers, h: b.h, n: b.n, seed: i + 1 };
}).filter(Boolean).sort((p, q) => q.w * q.tiers - p.w * p.tiers).filter((b, i, all) => {      // 大的先占位：挤在一起的小屋只留一间
  for (let k = 0; k < i; k++) { const o = all[k]; if (o.keep && Math.abs(o.x - b.x) < (o.w + b.w) * .42 && Math.abs(o.y - b.y) < (o.w + b.w) * .3) return false; }
  return b.keep = true;
}).sort((p, q) => q.y - p.y);

// ---------- 纹理 ----------
const PAPER = makePaper(1024, 7), paperPat = g.createPattern(PAPER, 'repeat');
const WAVES = [14, 28, 56, 112].map(w => ({ w, pat: g.createPattern(makeWaves(w), 'repeat') })), WAVE_M = 560;   // 一片鳞 560 米宽
const BROCADE = (() => {                                           // 绫边：深青地，暗金的小菱花
  const n = 96, c = new OffscreenCanvas(n, n), q = c.getContext('2d'); q.fillStyle = C.mount; q.fillRect(0, 0, n, n);
  q.strokeStyle = rgba(C.mountGold, .34); q.lineWidth = 1.2;
  for (const [ox, oy] of [[0, 0], [n / 2, n / 2], [n, n], [0, n], [n, 0]]) { q.beginPath(); q.moveTo(ox - 18, oy); q.lineTo(ox, oy - 18); q.lineTo(ox + 18, oy); q.lineTo(ox, oy + 18); q.closePath(); q.stroke(); q.beginPath(); q.arc(ox, oy, 5, 0, 7); q.stroke(); }
  for (const [ox, oy] of [[n / 2, 0], [0, n / 2], [n, n / 2], [n / 2, n]]) { q.fillStyle = rgba(C.mountGold, .3); q.beginPath(); q.arc(ox, oy, 2.2, 0, 7); q.fill(); }
  return g.createPattern(c, 'repeat');
})();

// ---------- 时间：镜头和各条前沿 ----------
const camTrack = track(CAM.map(([t, lon, lat, h]) => [t, [X(lon), Y(lat), Math.log(h)]]));
const rollX = (f => t => Math.max(SCROLL.x0, X(f(t))))(monotone(ROLL_K)), inkX = (f => t => X(f(t)))(monotone(INK)), zhuR = monotone(ZHU);
const whenInk = x => { if (inkX(INK[0][0]) <= x) return INK[0][0]; let a = INK[0][0], b = INK[INK.length - 1][0]; if (inkX(b) > x) return 1e9; for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (inkX(m) <= x) b = m; else a = m; } return b; };
const edge = y => 1700 * (vnoise(y / 2300) - .5) + 500 * (vnoise(y / 420 + 9) - .5);          // 前沿不是一条直线：沿纵向参差
const SOFT = 2600, LEAD = 3500;                                                               // 设色晕开的宽度；墨线领先设色多少
for (const m of MOUNTAINS) m.t = whenInk(m.x) + .1 + .55 * hash(m.seed);
for (const b of HOUSES) { b.t = TOWERS.t0 + Math.hypot(b.x - X(CBD[0]), b.y - Y(CBD[1])) / 1000 * TOWERS.perKm + .4 * hash(b.seed * 1.7); b.d = .35 + b.tiers * TOWERS.perTier; }
for (const L of LABELS) { L.x = X(L.lon); L.y = Y(L.lat); L.t0 = Math.max(L.t || 0, whenInk(L.x) + .7); }
const HERO = HOUSES.reduce((a, b) => b.tiers * b.w > a.tiers * a.w ? b : a, HOUSES[0]);         // 最高的那座楼阁
HERO.t = 32; HERO.d = 3;

let cam, S, T, texts = [];
const sx = x => W / 2 + (x - cam.x) * S, sy = y => H / 2 - (y - cam.y) * S;                   // 唯一的 世界 → 屏幕
const world = () => g.setTransform(S, 0, 0, -S, W / 2 - cam.x * S, H / 2 + cam.y * S), screen = () => g.setTransform(1, 0, 0, 1, 0, 0);
const lw = (m, minPx, maxPx = 1e9) => clamp(m, minPx * K / S, maxPx * K / S);                 // 世界单位的线宽，但在屏幕上不细于 minPx、不粗于 maxPx
const fade = (a, b) => clamp((S / K - a) / (b - a));                                          // 随镜头推近淡入：S/K 是 1080p 下每米多少像素
const mapRect = () => { g.beginPath(); g.rect(sx(MAP.x0), sy(MAP.y1), (MAP.x1 - MAP.x0) * S, (MAP.y1 - MAP.y0) * S); };

// 把一层画到离屏上，用遮罩裁掉还没画到的部分，再贴回主画面
function layer(draw, mask) {
  const o = OFF[0]; o.setTransform(1, 0, 0, 1, 0, 0); o.globalAlpha = 1; o.globalCompositeOperation = 'source-over'; o.filter = 'none'; o.clearRect(0, 0, W, H);
  g = o; draw(); g = G;
  if (mask) { const m = OFF[1]; m.setTransform(1, 0, 0, 1, 0, 0); m.clearRect(0, 0, W, H); mask(m); o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = 'destination-in'; o.drawImage(m.canvas, 0, 0); o.globalCompositeOperation = 'source-over'; }
  screen(); G.drawImage(o.canvas, 0, 0);
}
// 设色的前沿：一条条横带，各自的起点参差，往东渐渐显出来
function washMask(m, xf) {
  const bh = Math.max(3, 420 * S);
  for (let y = 0; y < H; y += bh) { const wy = cam.y + (H / 2 - y - bh / 2) / S, x0 = sx(xf + edge(wy)), x1 = x0 + SOFT * S; if (x0 > W) continue; const gr = m.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, '#000'); m.fillStyle = gr; m.fillRect(Math.floor(x0), y, W - Math.floor(x0) + 1, bh + 1); }
}
const frontClip = xf => { g.beginPath(); g.moveTo(W + 9, -9); const st = Math.max(3, 200 * S); for (let y = -9; y <= H + 9 + st; y += st) g.lineTo(sx(xf + edge(cam.y + (H / 2 - y) / S)), y); g.lineTo(W + 9, H + 9 + st); g.closePath(); g.clip(); };

function drawBase() {                                              // 海、水线、陆地、晕染、湖河
  screen(); g.save(); mapRect(); g.clip();
  const need = WAVE_M * S, wv = WAVES.find(v => v.w >= need) || WAVES[WAVES.length - 1], k = need / wv.w;
  wv.pat.setTransform(new DOMMatrix().translate(sx(0), sy(0)).scale(k)); g.fillStyle = wv.pat; g.fillRect(0, 0, W, H);
  world(); g.lineJoin = 'round';
  // 岸外的水线：由宽到窄一圈圈描，留下贴着岸的几道线
  for (const [wm, col] of [[900, rgba(C.hua, .16)], [640, rgba(C.sea, .9)], [600, rgba(C.seaLine, .5)], [540, C.sea], [330, rgba(C.seaLine, .55)], [270, C.sea]]) { g.strokeStyle = col; g.lineWidth = lw(wm, wm / 150); g.stroke(coastPath); }
  g.fillStyle = C.land; g.fill(landPath);
  g.save(); g.clip(landPath); g.filter = `blur(${Math.max(1, 260 * S)}px)`; g.strokeStyle = rgba(C.zhe, .2); g.lineWidth = 520; g.stroke(coastPath);
  g.filter = `blur(${Math.max(.6, 120 * S)}px)`; g.fillStyle = rgba(C.lv, .2); g.fill(woodPath, 'evenodd'); g.fillStyle = rgba(C.lv3, .3); g.fill(parkPath, 'evenodd'); g.filter = 'none';
  g.restore();
  g.fillStyle = rgba('#5d8b9c', .4); g.fill(waterPath, 'evenodd'); g.strokeStyle = rgba(C.seaLine, .25 + .45 * fade(.03, .1)); g.lineWidth = lw(8, .4, 1.4); g.stroke(waterPath);
  g.lineCap = 'round'; g.strokeStyle = rgba('#5d8b9c', .7); g.lineWidth = lw(34, .9, 5); g.stroke(riverPath); g.globalAlpha = fade(.03, .07); g.lineWidth = lw(16, .6, 2.5); g.stroke(canalPath); g.globalAlpha = 1;
  g.restore(); screen();
}
function drawRoads() {                                             // 朱砂路和铁路
  screen(); g.save(); mapRect(); g.clip(); world();
  const RW = { motorway: [58, 1.6, 5.5, .95, 0, 0], trunk: [50, 1.3, 4.6, .9, 0, 0], primary: [38, 1, 3.6, .8, 0, 0], secondary: [26, .75, 2.6, .55, .022, .045], tertiary: [18, .55, 1.9, .45, .05, .09] };
  const sa = fade(.12, .22); if (sa > 0) { g.globalAlpha = sa * .5; g.strokeStyle = rgba(C.zhu, .6); g.lineWidth = lw(9, .5, 1.1); g.stroke(streetPath); g.globalAlpha = 1; }
  for (const { c, path } of ROADS) { const [m, px, mx, al, f0, f1] = RW[c], a = f1 ? fade(f0, f1) : 1; if (a <= 0) continue; inkStroke(g, path, lw(m, px, mx), C.zhu, 9, al * a); }
  g.lineCap = 'butt'; g.strokeStyle = rgba(C.ink, .85); g.lineWidth = lw(44, 1.6, 5); g.setLineDash([]); g.stroke(railPath);
  g.strokeStyle = C.land; g.lineWidth = lw(24, .8, 2.6); g.setLineDash([lw(90, 3, 9), lw(90, 3, 9)]); g.stroke(railPath); g.setLineDash([]);
  g.restore(); screen();
}
// 城：一圈带垛口的城墙，四面城门，里面几间屋。屏幕坐标，(x, y) 是城的中心
function drawFort(x, y, size, seed, k) {
  if (k <= 0) return; const s = size * (.6 + .4 * back(k)), hw = s * .5, hh = s * .42, r = mulberry(seed);
  g.save(); g.globalAlpha = clamp(k * 2); g.lineJoin = 'round';
  g.fillStyle = rgba(C.fen, .9); g.strokeStyle = C.ink; g.lineWidth = Math.max(1, s * .022); g.beginPath(); g.rect(x - hw, y - hh, hw * 2, hh * 2); g.fill(); g.stroke();
  g.lineWidth = Math.max(.8, s * .014); g.strokeStyle = rgba(C.ink, .8); g.strokeRect(x - hw + s * .035, y - hh + s * .035, hw * 2 - s * .07, hh * 2 - s * .07);
  g.beginPath(); const n = 18; for (let i = 0; i <= n; i++) for (const yy of [y - hh, y + hh]) { const xx = x - hw + i / n * hw * 2; g.moveTo(xx, yy); g.lineTo(xx, yy - s * .03); } g.stroke();   // 垛口
  for (let i = 0; i < 9; i++) { const hx = x + (i % 3 - 1) * s * .26 + (r() - .5) * s * .08, hy = y + (Math.floor(i / 3) - 1) * s * .22 + s * .12 + (r() - .5) * s * .04; drawHouse(g, hx, hy, s * (.12 + r() * .05), 1, seed + i, 1); }
  drawHouse(g, x, y + hh + s * .02, s * .2, 2, seed + 20, 1); drawHouse(g, x, y - hh + s * .02, s * .17, 2, seed + 21, 1);
  drawHouse(g, x - hw, y + s * .06, s * .15, 2, seed + 22, 1); drawHouse(g, x + hw, y + s * .06, s * .15, 2, seed + 23, 1);
  g.restore();
}
function drawMountains(t) {
  for (const m of MOUNTAINS) {
    const k = (t - m.t) / .5; if (k <= 0) continue;
    const w = m.w * S, h = m.h * S; if (w < 5) continue; const x = sx(m.x), y = sy(m.y) + h * .3;
    if (x < -w || x > W + w || y < -h || y - h > H + h) continue;
    if (k < 1) { g.globalAlpha = clamp(k * 1.6); drawPeak(g, x, y, w * (.75 + .25 * eo(k)), h * back(k, 1.5), m.seed, 0); g.globalAlpha = 1; } else drawPeak(g, x, y, w, h, m.seed, 0);
  }
}
function drawHouses(t) {
  const ha = fade(.1, .2); if (ha <= 0) return;
  g.globalAlpha = ha;
  for (const b of HOUSES) { const k = (t - b.t) / b.d; if (k <= 0) continue; const w = b.w * S, x = sx(b.x), y = sy(b.y); if (x < -w * 2 || x > W + w * 2 || y < -w || y > H + w * 14) continue; drawHouse(g, x, y, w, b.tiers, b.seed, clamp(k)); }
  g.globalAlpha = 1;
}
function drawLabels(t) {
  for (const L of LABELS) {
    const px = S / K, lo = L.min || 0, hi = L.max || 9; if (px < lo || px > hi || t < L.t0) continue;
    const k = clamp((t - L.t0) / .35), a = k * Math.min(lo ? clamp((px - lo) / (lo * .25)) : 1, clamp((hi - px) / (hi * .2)));
    const x = sx(L.x), size = clamp(L.m * S, L.px[0] * K, L.px[1] * K), y = sy(L.y) - (1 - eo(k)) * size * .5;
    if (x < -200 || x > W + 200 || y < -400 || y > H + 200 || a <= 0) continue;
    let box;
    if (L.kind === 'slip' || L.kind === 'red') box = drawSlip(g, L.text, x, y, size, L.kind, a);
    else { g.save(); g.globalAlpha = a * (L.kind === 'water' ? .8 : .9); box = vtext(g, L.text, x, y, size, 'WenKai', L.kind === 'water' ? '#35525e' : C.ink, L.kind === 'water' ? 1.5 : 1.15, L.kind === 'water' ? null : rgba(C.land, .85)); g.restore(); }
    texts.push({ id: L.text, text: L.text, x0: box.x0, y0: box.y0, x1: box.x1, y1: box.y1, ...(L.t ? {} : { pass: true }) });
  }
}
function drawTitle(t) {                                            // 引首：片名一字一字写出来，再盖印
  const { t0, step, write, seal } = TITLE; if (t < t0) return;
  const size = 3500 * S, x = sx(MAP.x1 + END_R * .56), y = (sy(MAP.y1) + sy(MAP.y0)) / 2 - size * 1.9, gap = 1.1;
  g.font = `${size}px Brush`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = C.ink;
  [...'鹏城长卷'].forEach((ch, i) => { const p = clamp((t - t0 - i * step) / write); if (p <= 0) return; const cy = y + i * size * gap; g.save(); g.globalAlpha = .93; g.beginPath(); g.rect(x - size, cy - size * .62, size * 2, size * 1.24 * eo(p)); g.clip(); g.fillText(ch, x, cy); g.restore(); });
  texts.push({ id: 'title', text: '鹏城长卷', x0: x - size * .55, y0: y - size * .55, x1: x + size * .55, y1: y + 3 * size * gap + size * .55 });
  const ks = clamp((t - seal) / .16); if (ks > 0) { const ss = size * .62 * (1 + .4 * (1 - eo(ks))); drawSeal(g, '深圳', x - size * 1.25 - (ss - size * .62) / 2, y + size * 3.15 - (ss - size * .62) / 2, ss, 5, ks); }
}

function drawScroll(xr) {                                          // 纸的质感、绫边、轴、桌面
  screen();
  const x0 = sx(xr), x1 = sx(SCROLL.x1), y0 = sy(SCROLL.y1), y1 = sy(SCROLL.y0), mt = MOUNT * S;
  // 纸纹压在整幅画上：两个倍率交叉淡化，推拉时纹理不糊也不跳
  g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip(); g.globalCompositeOperation = 'multiply';
  const z = Math.log2(S / K / .05), o = Math.floor(z), f = z - o;
  for (const [sc, al] of [[2 ** f, 1 - f], [2 ** (f - 1), f]]) { paperPat.setTransform(new DOMMatrix().translate(sx(0), sy(0)).scale(sc * K * 1.3)); g.globalAlpha = al; g.fillStyle = paperPat; g.fillRect(0, 0, W, H); }
  g.globalAlpha = 1;
  const eg = g.createLinearGradient(0, y0, 0, y1); eg.addColorStop(0, 'rgba(120,84,40,.3)'); eg.addColorStop(.07, 'rgba(120,84,40,0)'); eg.addColorStop(.93, 'rgba(120,84,40,0)'); eg.addColorStop(1, 'rgba(120,84,40,.3)');
  g.fillStyle = eg; g.fillRect(0, 0, W, H); g.restore();
  // 画心的边线
  g.save(); g.beginPath(); g.rect(x0, 0, W + 9 - x0, H); g.clip(); g.strokeStyle = rgba(C.ink, .55); g.lineWidth = Math.max(1, 26 * S); g.strokeRect(sx(MAP.x0), sy(MAP.y1), (MAP.x1 - MAP.x0) * S, (MAP.y1 - MAP.y0) * S); g.restore();
  // 桌面：纸以外的地方
  g.save(); g.beginPath(); g.rect(0, 0, W, H); g.rect(x0, y0 - mt, x1 - x0, y1 - y0 + 2 * mt); g.clip('evenodd');
  const tg = g.createRadialGradient(W / 2, H / 2, H * .2, W / 2, H / 2, W * .75); tg.addColorStop(0, '#221a14'); tg.addColorStop(1, C.table); g.fillStyle = tg; g.fillRect(0, 0, W, H); g.restore();
  // 绫边
  g.save(); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 40 * K; g.shadowOffsetY = 14 * K;
  BROCADE.setTransform(new DOMMatrix().translate(sx(0), sy(0)).scale(Math.max(.25, S * 9)));
  g.fillStyle = BROCADE; g.fillRect(x0, y0 - mt, x1 - x0, mt); g.fillRect(x0, y1, x1 - x0, mt); g.restore();
  g.strokeStyle = rgba(C.mountGold, .7); g.lineWidth = Math.max(1, 60 * S); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y0); g.moveTo(x0, y1); g.lineTo(x1, y1); g.stroke();
  const top = y0 - mt, bot = y1 + mt;
  // 右端：天杆，一根细木杆
  { const rr = ROLL * S * .5, cx = x1 + rr * .4; g.save(); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 24 * K; g.shadowOffsetX = 6 * K;
    const wg = g.createLinearGradient(cx - rr, 0, cx + rr, 0); wg.addColorStop(0, '#1a0f08'); wg.addColorStop(.3, '#6b4426'); wg.addColorStop(.48, '#a8774a'); wg.addColorStop(.7, '#4a2c17'); wg.addColorStop(1, '#140b06');
    g.fillStyle = wg; g.fillRect(cx - rr, top - rr * .6, rr * 2, bot - top + rr * 1.2); g.restore(); }
  // 左端：还没展开的纸卷。剩得越多越粗；卷在外面的是裱背的素绢，两头露出轴头
  { const rem = clamp((xr - SCROLL.x0) / (SCROLL.x1 - SCROLL.x0)), rr = ROLL * S * (1 + 1.5 * rem), cx = x0;
    const sh = g.createLinearGradient(cx + rr, 0, cx + rr * 2.6, 0); sh.addColorStop(0, 'rgba(30,18,6,.5)'); sh.addColorStop(1, 'rgba(30,18,6,0)'); g.fillStyle = sh; g.fillRect(cx + rr * .9, top, rr * 1.8, bot - top);
    const kr = ROLL * S * .62, kg = g.createLinearGradient(cx - kr, 0, cx + kr, 0); kg.addColorStop(0, '#4d5a4a'); kg.addColorStop(.4, '#d9e2cf'); kg.addColorStop(.75, '#8c9a84'); kg.addColorStop(1, '#344033');
    g.fillStyle = kg; g.beginPath(); g.roundRect(cx - kr, top - kr * 2.4, kr * 2, kr * 2.6, kr * .4); g.roundRect(cx - kr, bot - kr * .2, kr * 2, kr * 2.6, kr * .4); g.fill();
    g.save(); g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 34 * K; g.shadowOffsetX = -6 * K;
    const pg = g.createLinearGradient(cx - rr, 0, cx + rr, 0); pg.addColorStop(0, '#3d3424'); pg.addColorStop(.22, '#a59673'); pg.addColorStop(.45, '#e2d6b6'); pg.addColorStop(.7, '#b3a480'); pg.addColorStop(1, '#4a3f2c');
    g.fillStyle = pg; g.fillRect(cx - rr, top, rr * 2, bot - top); g.restore();
    const bg = g.createLinearGradient(cx - rr, 0, cx + rr, 0); bg.addColorStop(0, 'rgba(8,12,20,.85)'); bg.addColorStop(.45, 'rgba(8,12,20,0)'); bg.addColorStop(1, 'rgba(8,12,20,.8)');
    for (const yy of [top, y1]) { g.fillStyle = BROCADE; g.fillRect(cx - rr, yy, rr * 2, mt); g.fillStyle = bg; g.fillRect(cx - rr, yy, rr * 2, mt); } }
  const vg = g.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, W * .72); vg.addColorStop(0, 'rgba(40,24,8,0)'); vg.addColorStop(1, 'rgba(40,24,8,.26)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
}

window.render = (t) => {
  t = clamp(t, 0, DUR); T = t; const c = camTrack(t); cam = { x: c[0], y: c[1], h: Math.exp(c[2]) }; S = H / cam.h; texts = [];
  const xr = rollX(t), xi = inkX(t), R = zhuR(t);
  g = G; screen(); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none'; g.fillStyle = C.paper; g.fillRect(0, 0, W, H);
  g.save(); g.beginPath(); g.rect(sx(xr), 0, W + 9 - sx(xr), H); g.clip();                         // 纸卷以西还没有纸
  const xmax = sx(xi + 1100 + SOFT);                                                           // 设色前沿最靠东的屏幕位置
  if (t >= INK[0][0] && sx(xi - 1100) < W) layer(drawBase, xmax > 0 ? m => washMask(m, xi) : null);
  if (t >= INK[0][0]) { g.save(); mapRect(); g.clip(); frontClip(xi - LEAD); world(); inkStroke(g, coastPath, lw(46, 1.5, 4.5), C.ink, 3); g.restore(); screen(); }
  if (R > 0) layer(drawRoads, R < 85000 ? m => { const cx = sx(X(LUOHU[0])), cy = sy(Y(LUOHU[1])), gr = m.createRadialGradient(cx, cy, Math.max(0, (R - 2600) * S), cx, cy, R * S + 1); gr.addColorStop(0, '#000'); gr.addColorStop(1, 'rgba(0,0,0,0)'); m.fillStyle = gr; m.fillRect(0, 0, W, H); } : null);
  g.save(); mapRect(); g.clip();
  drawMountains(t);
  for (const [p, seed, size] of [[FORT, 31, 1250], [NANTOU, 47, 760]]) { const tf = whenInk(X(p[0])) + .6, s = size * S; if (t > tf && s > 9) drawFort(sx(X(p[0])), sy(Y(p[1])), s, seed, (t - tf) / .6); }
  drawHouses(t); g.restore();
  drawLabels(t); drawTitle(t);
  g.restore();
  drawScroll(xr);
  const kc = clamp((t - 45.4) / .8);                                                           // 片尾小字：数据署名
  if (kc > 0) { const fs = 21 * K, txt = '地图数据 © OpenStreetMap contributors'; g.font = `${fs}px WenKai`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = rgba(C.mountGold, .8 * kc); g.fillText(txt, W / 2, H - 78 * K); const tw = g.measureText(txt).width; texts.push({ id: 'credit', text: txt, x0: W / 2 - tw / 2, y0: H - 78 * K - fs * .6, x1: W / 2 + tw / 2, y1: H - 78 * K + fs * .6, pass: true }); }
};
window.TEXTS = (t) => { window.render(t); return texts; };
window.DUR = DUR;

// ---------- 声音事件：全部从时间线和数据里推出来 ----------
const EV = [], ev = (type, t, o = {}) => EV.push({ type, t: +t.toFixed(3), ...o });
for (const s of SECS) ev('sec', s.t, { id: s.id });
ev('roll', 0, { d: 5 }); ev('roll', 17, { d: 7 }); ev('roll', 37, { d: 3.6 }); ev('rollEnd', ROLL_K[ROLL_K.length - 1][0]);
ev('brush', INK[0][0], { d: 11.5 }); ev('brush', 17, { d: 7 }); ev('brush', 37, { d: 4 });
{ let last = -9; for (const m of [...MOUNTAINS].sort((a, b) => a.t - b.t)) if (m.w > 1500 && m.t - last > .22 && m.t < DUR) { ev('peak', m.t + .25, { v: clamp(m.w / 3300), pan: clamp((m.x - X(114.2)) / 40000, -1, 1) }); last = m.t; } }
for (const L of LABELS) if (L.t0 < DUR && (L.kind === 'slip' || L.kind === 'red')) ev('slip', L.t0, { text: L.text });
ev('fort', whenInk(X(FORT[0])) + .6); ev('zhu', ZHU[0][0]);
for (let i = 0; i < HERO.tiers; i++) ev('tier', HERO.t + HERO.d * (i + .6) / HERO.tiers, { i });
[...'鹏城长卷'].forEach((c, i) => ev('write', TITLE.t0 + i * TITLE.step)); ev('seal', TITLE.seal);
EV.sort((a, b) => a.t - b.t); window.EV = EV;
window.render(0); window.READY = true;
