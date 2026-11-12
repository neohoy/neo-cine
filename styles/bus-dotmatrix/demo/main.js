// 海底下的一天 · 成片
// 一块琥珀色点阵屏，放香港过海巴士 2026-11-18（星期三）一天的班次：data/bus.json（运输署 GTFS + OSM 的路）、data/map.json（OSM 海岸）。
// 画面是时间的函数：片子的秒 → 钟点（timeline.js 的 CLOCK）→ 每班车在路上的位置；屏上每颗点的亮度在 CPU 上算，屏这个物件在 GPU 上画（board.js）。
import { clamp, lerp, monotone, track, seg, eo, eio, hash } from '/core/lib.js';
import { makeBoard, textMask, scaleMask, makeGL, camera, FONT } from './board.js';
import { DUR, BEAT, NX, NY, X, Y, LAYOUT, VIEWS, SCANS, SCAN_DUR, CLOCK, HEROES, CAM, CAPS, TUN_T, TUN_OFF, END, POWER, SECS } from './timeline.js';

const W = innerWidth, H = innerHeight;
const cv = document.getElementById('c'); cv.width = W; cv.height = H;
const Q = new URLSearchParams(location.search);
await Promise.all(['12px FPHK', '12px FPSC'].map(f => document.fonts.load(f, '海底隧道過海巴士香港 ABC 0123')));
const [bus, map] = await Promise.all(['data/bus.json', 'data/map.json'].map(u => fetch(u).then(r => r.json())));
const draw = makeGL(cv, NX, NY);
const B = makeBoard(NX, NY);

// ---------- 数据：路（增量整数 → 米）、班次 ----------
const UNIT = bus.meta.unit;
const AL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_', IX = {}; [...AL].forEach((c, i) => IX[c] = i);
function dec(str, u) {                                                // tools/prep.py 的 enc 反过来：5 位一字 + 续位，zigzag，增量
  const v = []; let a = 0, m = 1;
  for (const ch of str) { const c = IX[ch]; a += (c & 31) * m; if (c & 32) m *= 32; else { v.push(a % 2 ? -(a + 1) / 2 : a / 2); a = 0; m = 1; } }
  const n = v.length / 2, x = new Float32Array(n), y = new Float32Array(n); let p = 0, q = 0;
  for (let i = 0; i < n; i++) { p += v[2 * i]; q += v[2 * i + 1]; x[i] = p * u; y[i] = q * u; }
  return { x, y };
}
const PATHS = bus.paths.map(p => { const { x, y } = dec(p.d, UNIT), c = new Float32Array(x.length); for (let i = 1; i < x.length; i++) c[i] = c[i - 1] + Math.hypot(x[i] - x[i - 1], y[i] - y[i - 1]); return { x, y, c, k: p.k, len: c[c.length - 1] }; });
function dec1(str) { const v = []; let a = 0, m = 1, s = 0; for (const ch of str) { const c = IX[ch]; a += (c & 31) * m; if (c & 32) m *= 32; else { s += a % 2 ? -(a + 1) / 2 : a / 2; v.push(s); a = 0; m = 1; } } return v; }
const PATS = bus.pats.map((p, i) => { const q = { ...p, s: dec1(p.s), dt: dec1(p.dt), dep: dec1(p.dep), P: PATHS[p.p], i }; q.dur = q.dt[q.dt.length - 1]; return q; });
function along(P, s) {                                               // 路上距离 s（米）→ (x, y)
  const c = P.c; if (s <= 0) return [P.x[0], P.y[0]]; const n = c.length - 1; if (s >= c[n]) return [P.x[n], P.y[n]];
  let lo = 0, hi = n; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m] <= s) lo = m; else hi = m; }
  const f = (s - c[lo]) / (c[hi] - c[lo] || 1); return [P.x[lo] + (P.x[hi] - P.x[lo]) * f, P.y[lo] + (P.y[hi] - P.y[lo]) * f];
}
function sAt(p, e) {                                                 // 发车后 e 秒 → 路上距离（站间匀速；站的时刻有的是按距离插出来的）
  const dt = p.dt, s = p.s; if (e <= 0) return s[0]; const n = dt.length - 1; if (e >= dt[n]) return s[n];
  let lo = 0, hi = n; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (dt[m] <= e) lo = m; else hi = m; }
  return s[lo] + (s[hi] - s[lo]) * (e - dt[lo]) / (dt[hi] - dt[lo] || 1);
}
const MAXDUR = Math.max(...PATS.map(p => p.dur));
function active(T, f) {                                              // 钟点 T 时在路上的每一班：f(pattern, 发车时刻)
  for (const p of PATS) {
    const d = p.dep; let hi = d.length; { let lo = 0; while (lo < hi) { const m = (lo + hi) >> 1; if (d[m] <= T) lo = m + 1; else hi = m; } }
    for (let k = hi - 1; k >= 0 && d[k] >= T - p.dur; k--) f(p, d[k]);
  }
}
// 所有发车按时刻排好（屏头用）
const DEPS = []; for (const p of PATS) for (const d of p.dep) DEPS.push([d, p.i]); DEPS.sort((a, b) => a[0] - b[0]);
const lastDep = T => { let lo = 0, hi = DEPS.length; while (lo < hi) { const m = (lo + hi) >> 1; if (DEPS[m][0] <= T) lo = m + 1; else hi = m; } return lo - 1; };

// ---------- 时间 ----------
const clockF = monotone(CLOCK), camF = track(CAM.map(k => [k[0], k.slice(1)])), powerF = monotone(POWER);
const clock = t => clockF(clamp(t, 0, DUR));

// ---------- 视图：米 ↔ 屏上的点 ----------
const [MX, MY, MW, MH] = LAYOUT.map;
const VIEW = Object.fromEntries(Object.entries(VIEWS).map(([k, v]) => [k, v && { k, cx: X(v.lon), cy: Y(v.lat), m: v.mpd }]));
const toDot = (V, x, y) => [MX + MW / 2 + (x - V.cx) / V.m, MY + MH / 2 - (y - V.cy) / V.m];

// 静态层（每个视图算一次）：陆地掩膜、海岸、陆地的底纹、每条路占了哪些点（水上的不画：隧道只让车流照亮）
const LAYERS = {};
function layers(V) {
  if (LAYERS[V.k]) return LAYERS[V.k];
  const cvs = new OffscreenCanvas(MW, MH), g = cvs.getContext('2d', { willReadFrequently: true });
  g.setTransform(1 / V.m, 0, 0, -1 / V.m, MW / 2 - V.cx / V.m, MH / 2 + V.cy / V.m);
  g.fillStyle = '#fff'; g.beginPath();
  const wide = V.m > 80;
  for (const str of (wide ? map.wide : map.near)) { const { x, y } = dec(str, wide ? map.units.wide : map.units.near); g.moveTo(x[0], y[0]); for (let i = 1; i < x.length; i++) g.lineTo(x[i], y[i]); g.closePath(); }
  g.fill('evenodd');
  const a = g.getImageData(0, 0, MW, MH).data, land = new Uint8Array(MW * MH);
  for (let k = 0; k < MW * MH; k++) land[k] = a[k * 4 + 3] > 127 ? 1 : 0;
  const L = (i, j) => i < 0 || j < 0 || i >= MW || j >= MH ? 1 : land[j * MW + i];
  const base = new Float32Array(MW * MH);
  for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) {
    const k = j * MW + i;
    if (land[k]) base[k] = (!L(i - 1, j) || !L(i + 1, j) || !L(i, j - 1) || !L(i, j + 1)) ? LV.coast : ground(i, j);
  }
  // 每条路占了哪些点：dots[path] = 屏上的点（只算陆地上的）
  const dots = PATHS.map(P => {
    const s = new Set(); let p0 = null;
    for (let i = 0; i < P.x.length; i++) {
      const p = toDot(V, P.x[i], P.y[i]);
      if (p0) { const n = Math.ceil(Math.max(Math.abs(p[0] - p0[0]), Math.abs(p[1] - p0[1]))) || 1;
        for (let q = 0; q <= n; q++) { const ii = Math.floor(p0[0] + (p[0] - p0[0]) * q / n) - MX, jj = Math.floor(p0[1] + (p[1] - p0[1]) * q / n) - MY;
          if (ii >= 0 && jj >= 0 && ii < MW && jj < MH && land[jj * MW + ii]) s.add(jj * MW + ii); } }
      p0 = p;
    }
    return Int32Array.from(s);
  });
  return (LAYERS[V.k] = { land, base, dots });
}
// 亮度的几档（乘在屏的总电源上）
const LV = { coast: .32, ground: .06, route: .07, routeHot: .15, bus: 1, trail: .5, text: .95, dim: .25 };
const GMODE = Q.get('ground') || 'grid';
function ground(i, j) {                                               // 陆地：隔行隔点一层暗点；水面全黑，海港才读得出是水
  if (GMODE === 'checker') return (i + j) % 2 ? 0 : LV.ground;
  if (GMODE === 'none') return 0;
  return j % 2 === 0 && i % 2 === 0 ? LV.ground : 0;
}

// ---------- 画地图（一个视图，画到 rows [r0, r1) 里） ----------
// 车：快门 = 一帧。这一帧里车走过的路画成一条线，总亮度守恒（走得越快越长越暗，像相机拍一盏移动的灯）；
// 车头再亮一点，后面拖一小段衰减的余辉（扫描屏的余辉，约 4 颗点）
const HERO_TRAIL = 70;                                                  // 主角车身后留一道慢慢熄掉的光（钟点秒）：一颗点自己把隧道画出来
function drawMap(V, t, r0, r1, heat) {
  const Ly = layers(V), clip = (i, j) => j >= r0 && j < r1 && i >= MX && i < MX + MW;
  for (let j = Math.max(r0, MY); j < Math.min(r1, MY + MH); j++) for (let i = 0; i < MW; i++) B.max(MX + i, j, Ly.base[(j - MY) * MW + i]);
  // 路网：这一刻这条路上跑着几班车，路就有多亮（高峰时整张网涨起来）
  for (let pi = 0; pi < PATHS.length; pi++) {
    const n = heat[pi] || 0; if (!n) continue;
    const v = LV.route + (LV.routeHot - LV.route) * Math.min(1, n / 4);
    for (const k of Ly.dots[pi]) { const i = MX + k % MW, j = MY + (k / MW | 0); if (j >= r0 && j < r1) B.max(i, j, v); }
  }
  const T0 = clock(t), T1 = clock(t - 1 / 24), TP = clock(t - 4 / 24);   // 这一帧的快门、余辉的起点
  active(T0, (p, dep) => {
    const s0 = sAt(p, T0 - dep), s1 = sAt(p, Math.max(0, T1 - dep)), sp = sAt(p, Math.max(0, TP - dep));
    const [x, y] = along(p.P, s0), [u, v] = toDot(V, x, y);
    const L = Math.abs(s0 - s1) / V.m;                                 // 这一帧走了几颗点
    const n = Math.max(1, Math.ceil(L / .6)), e = Math.min(LV.trail, 1.4 / n);
    for (let q = 1; q <= n; q++) { const [xx, yy] = along(p.P, s0 + (s1 - s0) * q / n), [uu, vv] = toDot(V, xx, yy); if (clip(uu, vv)) B.splat(uu, vv, e); }
    const tail = Math.min(4, Math.abs(s1 - sp) / V.m);                 // 余辉：最多 4 颗点，越往后越暗
    for (let q = 1, m = Math.ceil(tail / .6); q <= m; q++) { const [xx, yy] = along(p.P, s1 - Math.sign(s0 - s1 || 1) * q * .6 * V.m), [uu, vv] = toDot(V, xx, yy); if (clip(uu, vv)) B.splat(uu, vv, .3 * (1 - q / (m + 1)) ** 1.5); }
    if (clip(u, v)) B.splat(u, v, LV.bus * clamp(3 / (L + 2), .3, 1));
  });
  const h = heroAt(t);
  if (h && V.k === 'cht') {
    const e = T0 - h.dep, se = sAt(h.p, e), sb = sAt(h.p, Math.max(0, e - HERO_TRAIL)), n = Math.ceil(Math.abs(se - sb) / V.m / .5);
    for (let q = 1; q <= n; q++) { const f = q / n, [xx, yy] = along(h.p.P, se + (sb - se) * f), [uu, vv] = toDot(V, xx, yy); if (clip(uu, vv)) B.splat(uu, vv, .5 * (1 - f) ** 1.2); }
    const [x, y] = along(h.p.P, se), [u, v] = toDot(V, x, y); if (clip(u, v)) B.splat(u, v, .9);
  }
  // 隧道年份落下的那一拍：一道光从隧道的一头扫到另一头
  if (V.k === 'city') TUN.forEach((tn, k) => {
    const p = clamp((t - TUN_T[k]) / .45); if (p <= 0 || p >= 1) return;
    const sg = TSEG[k]; if (!sg) return;
    for (let q = 0; q <= 24; q++) { const f = p - q * .025; if (f < 0) break; const [xx, yy] = along(sg.P, sg.a + (sg.b - sg.a) * f), [uu, vv] = toDot(V, xx, yy); if (clip(uu, vv)) B.splat(uu, vv, (q ? .55 : 1.2) * (1 - q / 25)); }
  });
}

// ---------- 每条隧道水下那一段（取走这条隧道的班次最多的那条路） ----------
const TSEG = bus.meta.tunnels.map((tn, k) => {
  const use = new Map(); for (const p of PATS) if (p.P.k === k) use.set(p.P, (use.get(p.P) || 0) + p.dep.length);
  const P = [...use.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]; if (!P) return null;
  let a = 1e9, b = -1;
  for (let i = 0; i < P.x.length; i++) if (Math.hypot(P.x[i] - tn.x, P.y[i] - tn.yy) < 1300) { a = Math.min(a, P.c[i]); b = Math.max(b, P.c[i]); }
  return b > a ? { P, a, b } : null;
});

// ---------- 主角车 ----------
const HERO = HEROES.map(h => { const p = PATS.find(p => p.r === h.r && p.dep.includes(h.dep)); if (!p) throw new Error('主角车不在数据里：' + h.r); return { ...h, p }; });
const heroAt = t => HERO.find(h => t >= h.t0 && t < h.t1);
const heroXY = (h, t) => along(h.p.P, sAt(h.p, clock(t) - h.dep));

// ---------- 字 ----------
let texts = [], CAMNOW = null;
const tw = (s, fam = FONT.sc) => textMask(s, fam).w;
function put(s, x, y, v = LV.text, fam = FONT.sc, clip) { const m = textMask(s, fam); B.blit(m, x, y, v, clip); return m.w; }
function knock(x0, y0, x1, y1) { for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) B.set(i, j, 0); }   // 字下面的点先关掉
function proj(u, v) {                                                 // 屏上的点坐标 → 画面像素（同一个机位）
  const c = CAMNOW, d = [u - NX / 2 - c.pos[0], NY / 2 - v - c.pos[1], -c.pos[2]];
  const z = d[0] * c.f[0] + d[1] * c.f[1] + d[2] * c.f[2]; if (z <= 0) return null;
  const x = (d[0] * c.r[0] + d[1] * c.r[1] + d[2] * c.r[2]) / (z * c.tan), y = (d[0] * c.u[0] + d[1] * c.u[1] + d[2] * c.u[2]) / (z * c.tan);
  return [W / 2 + x * H / 2, H / 2 - y * H / 2];
}
function report(id, text, i0, j0, i1, j1, pass) {                   // 给 readcheck：四个角都投影，取外框
  const ps = [[i0, j0], [i1, j0], [i0, j1], [i1, j1]].map(([u, v]) => proj(u, v)); if (ps.some(p => !p)) return;
  texts.push({ id, text, x0: Math.min(...ps.map(p => p[0])), y0: Math.min(...ps.map(p => p[1])), x1: Math.max(...ps.map(p => p[0])), y1: Math.max(...ps.map(p => p[1])), ...(pass ? { pass: true } : {}) });
}

// ---------- 屏头：路线号、目的地（中英轮换）、钟 ----------
const hhmm = T => { const m = Math.floor(T / 60), h = Math.floor(m / 60) % 24; return `${String(h).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
function headAt(t) {                                                   // 每拍更新一次：主角车，或者这一拍里最近发出的那一班
  const b = Math.floor(t / BEAT + 1e-6); let tb = b * BEAT;
  if (tb < SCANS[0][0] && t >= SCANS[0][0]) tb = SCANS[0][0];        // 开机后第一拍之前：屏头已经亮了
  if (tb < SCANS[0][0] || tb >= SCANS[SCANS.length - 1][0]) return null;
  const h = heroAt(tb), lang = Math.floor(b / 2) % 2 ? 'en' : 'zh';
  const p = h ? h.p : (k => k < 0 ? null : PATS[DEPS[k][1]])(lastDep(clock(tb)));
  if (!p) return null;
  return { tb, key: p.r + (lang === 'en' ? p.en : p.to), r: p.r, d: lang === 'en' ? (p.en || p.to) : p.to, lang };
}
function drawHead(t, T) {
  const [hx, hy, hw] = LAYOUT.head;
  const ck = t >= END.title - .7 ? '05:00' : hhmm(T), cw = tw(ck); put(ck, hx + hw - 4 - cw, 1);
  if (t >= END.credit + .75) { const sg = 'NEO-Cine · 公交点阵屏 Bus Dot Matrix', m = textMask(sg); B.blit(m, 4, 1, LV.text * .9, [0, 0, 4 + Math.floor((t - END.credit - .75) * 600), 16]); report('sign', sg, 4, 1, 4 + m.w, 13, true); }
  report('clock', ck, hx + hw - 4 - cw, 1, hx + hw - 4, 13, true);
  for (let i = 0; i < NX; i += 2) B.max(i, 16, LV.dim * .5);
  const cur = headAt(t); if (!cur) return;
  const prv = cur.tb <= SCANS[0][0] ? null : headAt(Math.max(cur.tb - BEAT + 1e-6, SCANS[0][0]));
  const box = [hx + 2, 0, hx + hw - 4 - cw - 8, 16];
  const row = (h, dy) => { put(h.r, box[0] + 2, 1 + dy, LV.text, FONT.hk, box); put(h.d, box[0] + 46, 1 + dy, LV.text * .92, h.lang === 'en' ? FONT.sc : FONT.hk, box); };
  const f = clamp((t - cur.tb) / (4 / 24));                             // 新的一班从下往上翻进来（4 帧），旧的翻出去
  if (f < 1 && (!prv || prv.key !== cur.key)) { const dy = Math.round(15 * eo(f)); if (prv) row(prv, -dy); row(cur, 15 - dy); }
  else row(cur, 0);
  report('head', cur.r + ' ' + cur.d, box[0], 1, box[2], 13, true);    // 一拍一换，不要求读完
}

// ---------- 说明（屏底两行，从左往右一列列扫进来） ----------
function drawCaps(t) {
  const [, cy] = LAYOUT.cap;
  for (let i = 0; i < NX; i += 2) B.max(i, cy - 2, LV.dim * .5);
  for (const [t0, t1, cn, en] of CAPS) {
    if (t < t0 || t >= t1) continue;
    const w1 = tw(cn), w2 = tw(en), x1 = Math.round((NX - w1) / 2), x2 = Math.round((NX - w2) / 2);
    const clip = [0, 0, Math.floor(clamp((t - t0) / .3) * NX), NY];
    put(cn, x1, cy - 1, LV.text, FONT.sc, clip); put(en, x2, cy + 12, LV.text * .9, FONT.sc, clip);
    report('cap' + t0, cn, x1, cy - 1, x1 + w1, cy + 11); report('capen' + t0, en, x2, cy + 12, x2 + w2, cy + 26);
  }
}

// ---------- 隧道的年份（维港视图里，标在隧道旁边的水上） ----------
const TUN = bus.meta.tunnels, TSIDE = [-1, 1, -1];
function drawTunnels(t, V, r0, r1) {
  if (V.k !== 'city' || t >= TUN_OFF) return;
  TUN.forEach((tn, k) => {
    const tk = TUN_T[k]; if (t < tk) return;
    const [u, v] = toDot(V, tn.x, tn.yy), s = String(tn.y), w = tw(s);
    const x = Math.round(TSIDE[k] < 0 ? u - 5 - w : u + 5), y = Math.round(v - 7);
    if (y < r0 || y + 12 > r1) return;
    const rows = Math.min(12, Math.floor((t - tk) * 24 * 3));          // 一行行亮起来（3 行一帧）
    knock(x - 1, y - 1, x + w + 1, y + 13);
    put(s, x, y, LV.text, FONT.sc, [0, y, NX, y + rows]);
    for (let q = 0; q < 3; q++) B.max(TSIDE[k] < 0 ? x + w + 1 + q : x - 2 - q, y + 6, LV.text * .7);   // 一小截引线指向隧道
    report('tun' + k, s, x, y, x + w, y + 12);
  });
}

// ---------- 片尾：地图关掉，屏上只剩字 ----------
const ENDL = [
  [26, '海底下的一天', 2, FONT.sc, END.title, false], [56, 'A DAY UNDER THE HARBOUR', 1, FONT.sc, END.title + .25, false],
  [82, '非官方同人片 · 班次按公布的班距推算', 1, FONT.sc, END.credit, true], [96, 'Unofficial fan film · trips from published headways', 1, FONT.sc, END.credit, true],
  [112, '数据：香港特区政府运输署 · DATA.GOV.HK', 1, FONT.sc, END.credit + .25, true], [126, 'Data: Transport Department, HKSAR · DATA.GOV.HK', 1, FONT.sc, END.credit + .25, true],
  [153, '地图 © OpenStreetMap 贡献者（ODbL）', 1, FONT.sc, END.credit + .5, true], [166, 'Map © OpenStreetMap contributors (ODbL)', 1, FONT.sc, END.credit + .5, true],
];
function drawEnd(t) {
  for (const [y, s, sc, fam, t0, pass] of ENDL) {
    if (t < t0) continue;
    let m = textMask(s, fam); if (sc > 1) m = scaleMask(m, sc);
    const x = Math.round((NX - m.w) / 2), rows = Math.min(m.h, Math.floor((t - t0) * 24 * 4 * sc));
    B.blit(m, x, y, LV.text, [0, y, NX, y + rows]);
    report('end' + y, s, x, y, x + m.w, y + m.h, pass);
  }
}

// ---------- 一帧 ----------
let T = 0;
const lamp = t => {                                                   // 开机灯检：一道斜着扫过整块屏的光带
  const p = t / .25; if (p >= 1) return;
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const q = (i + j * 1.6) / (NX + NY * 1.6), d = p * 1.4 - q; if (d > 0 && d < .4) B.max(i, j, .75 * (1 - d / .4)); }
};
window.render = (t) => {
  t = clamp(t, 0, DUR); T = clock(t); texts = []; B.clear();
  // 视图与扫描
  let si = -1; for (let i = 0; i < SCANS.length; i++) if (t >= SCANS[i][0]) si = i;
  const V = si >= 0 ? VIEW[SCANS[si][1]] : null, Vp = si > 0 ? VIEW[SCANS[si - 1][1]] : null, sp = si >= 0 ? clamp((t - SCANS[si][0]) / SCAN_DUR) : 0;
  // 机位（主角车的那几段，机位看向它）
  const c = camF(t), h = heroAt(t); let [u, v] = c;
  if (h && c[5] > 0 && (V || Vp)) { const [x, y] = heroXY(h, t), [hu, hv] = toDot(V || Vp, x, y); u = lerp(u, clamp(hu, MX + 24, MX + MW - 24), c[5]); v = lerp(v, clamp(hv, MY + 12, MY + MH - 12), c[5]); }
  if (c[2] >= 6) { const hw = W / 2 / c[2], hh = H / 2 / c[2]; u = clamp(u, hw, NX - hw); v = clamp(v, hh, NY - hh); }   // 贴近时画面不出屏
  CAMNOW = camera(W, H, NX, NY, { u, v, pitchPx: c[2], yaw: c[3], tilt: c[4] });
  const heat = new Uint16Array(PATHS.length); active(T, p => heat[p.p]++);
  const map = (VV, r0, r1) => { if (VV) { drawMap(VV, t, r0, r1, heat); drawTunnels(t, VV, r0, r1); } };
  if (si >= 0) {
    if (sp < 1) { const row = MY + Math.floor(MH * sp); map(V, MY, row); map(Vp, row, MY + MH); for (let i = 0; i < NX; i++) B.max(i, row, .85); }
    else map(V, MY, MY + MH);
    if (t >= SCANS[SCANS.length - 1][0]) { if (sp < 1) knock(0, MY + Math.floor(MH * sp), NX, NY); drawEnd(t); }
    drawHead(t, T); if (t < END.title) drawCaps(t);
  }
  lamp(t);
  for (let k = 0; k < B.buf.length; k++) if (B.buf[k] > 1.6) B.buf[k] = 1.6;
  draw(B.buf, CAMNOW, { power: powerF(t) });
};
window.TEXTS = (t) => { window.render(t); return texts; };
window.DUR = DUR;

// ---------- 声音事件：全部从时间线和数据里推出来 ----------
const EV = [], ev = (type, t, o = {}) => EV.push({ type, t: +t.toFixed(3), ...o });
for (const s of SECS) ev('sec', s.t, { id: s.id });
ev('power', 0);
SCANS.forEach(([t, k], i) => ev('scan', t, { view: k, i }));
ev('flip', SCANS[0][0], { r: headAt(SCANS[0][0]).r, lang: 'zh' });
for (let b = 1; b * BEAT < DUR; b++) { const a = headAt(b * BEAT), p = headAt(Math.max((b - 1) * BEAT + 1e-6, SCANS[0][0])); if (a && (!p || a.key !== p.key)) ev('flip', b * BEAT, { r: a.r, lang: a.lang }); }
TUN.forEach((tn, k) => ev('label', TUN_T[k], { k, y: tn.y }));
CAPS.forEach(([t0]) => ev('cap', t0));
ENDL.forEach(([y, s, sc, fam, t0], i) => { if (i % 2 === 0) ev(i === 0 ? 'title' : 'credit', t0, { i }); });
// 车流的密度（引擎声、城市底噪跟着它）：每 0.25 秒一个样本；这一段钟走得多快
for (let t = 0; t < DUR; t += .25) { let n = 0; active(clock(t), () => n++); ev('dens', t, { n, rate: +((clock(t + .25) - clock(t)) / .25).toFixed(1) }); }
// 主角车进出隧道（水下那一段）：引擎声的远近
for (const h of HERO) {
  let inW = null;
  for (let t = h.t0; t < h.t1; t += 1 / 24) {
    const [x, y] = heroXY(h, t), V = VIEW.cht, [hu, hv] = toDot(V, x, y), i = Math.floor(hu) - MX, j = Math.floor(hv) - MY;
    const w = i >= 0 && j >= 0 && i < MW && j < MH ? !layers(V).land[j * MW + i] : null;
    if (w !== null && inW !== null && w !== inW) ev(w ? 'tunIn' : 'tunOut', t, { r: h.r });
    if (w !== null) inW = w;
  }
}
ev('roll', 42.5, { d: 1.9 });
EV.sort((a, b) => a.t - b.t); window.EV = EV;
window.render(+(Q.get('t') || 0)); window.READY = true;
