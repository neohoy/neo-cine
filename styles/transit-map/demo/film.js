// 改编自 Lemo-Opuscar Transit Map 的 film.js（MIT, (c) 2026 LemoLab）。上游的英文注释保留；NEO-Cine 加的部分用中文注释：
// 更粗的线（0.22 G，统一圆角）和干净的终点横杠；拖线手感（逐站快慢、笔尖前的牵引线、拐角处的弹簧过冲和"咔"的事件）；
// 一直在跑的列车（逐站缓进、停靠、车站轻轻一跳）；换乘站弹出（弹簧缩放）。
// Transit Map engine: a printed octilinear network drawn by pen tips on a sheet of paper, under a perspective camera.
// Generic: it holds no network and no story. The network is net.js (window.NET); the film's direction is timeline.js
// (export DATA, optional export WARP). Every DATA hook below has a default, so a film defines only what it uses;
// the full list with signatures is in STYLE.md §10 and DEMO.md "Build notes".
// render(t) depends only on t: line growth, stations, trains, camera and counters are closed-form functions of t,
// precomputed at load where needed (station light-up times, label placement).
import { clamp, lerp, seg, ss, eio, eo, ei, back, monotone, track, mulberry, hash } from '/core/lib.js';
import * as TL from './timeline.js';

const DEFAULTS = {
  // required: DUR (story seconds), SHEET [x0, y0, x1, y1] (world units), PHASES, camera(t) -> {x, y, z, tilt, head, ap, focus?, far?, vig?, dim?}
  WARP: null,                                   // [[filmT, storyT], ...]; default: film time = story time
  LABEL_PREF: {}, nameAt: null, labelOnly: null, forceLabel: () => 0, hubLabelScale: z => clamp(Math.pow(.85 / z, .6), 1, 1.75),
  noRoundel: [], roundelPos: {}, roundelAlpha: () => 1, roundelScale: z => clamp(Math.pow(.9 / z, .55), 1, 1.8),
  drops: {}, dropRing: null,                    // ids of interchanges that fall onto the paper; dropRing(c, n, k2, helpers) overrides the landing
  veil: () => 0, stationDim: () => 1, highlight: () => {},
  waterLabels: null, riverLabels: () => {}, furniture: () => {}, annotations: () => {}, trains: () => {}, overlay: () => {},
  tunnelOnly: () => false, cues: [], init: () => {},
};
const DATA = { ...DEFAULTS, ...TL.DATA };
const WARP = TL.WARP || DATA.WARP || [[0, 0], [DATA.DUR, DATA.DUR]];
const { G, ST, LINES, WATER = [], LINKS = [], expand, pt: gpt } = window.NET;
const DUR = DATA.DUR;                     // story time (tau)
const DUR_T = WARP[WARP.length - 1][0]; window.DUR = DUR_T;   // film time
// film time t -> story time tau (piecewise linear: a slow 1995 beat, a longer verdict hold)
function tauOf(t) { for (let i = 1; i < WARP.length; i++) { const [ta, ua] = WARP[i - 1], [tb, ub] = WARP[i]; if (t <= tb) return ua + (ub - ua) * clamp((t - ta) / (tb - ta || 1)); } return WARP[WARP.length - 1][1]; }
function tOf(u) { for (let i = 1; i < WARP.length; i++) { const [ta, ua] = WARP[i - 1], [tb, ub] = WARP[i]; if (ub > ua && u >= ua && u < ub) return ta + (tb - ta) * (u - ua) / (ub - ua); } return u >= WARP[WARP.length - 1][1] ? WARP[WARP.length - 1][0] : u; }
// readable-text registry for window.TEXTS (readcheck): filled while a frame is drawn
let REG = [];
function regBox(id, text, X0, Y0, X1, Y1, a, minH) {
  if (a < .5 || !text) return;
  if (!(X0 >= 0 && Y0 >= 0 && X1 <= innerWidth && Y1 <= innerHeight)) return;   // counted from the moment it is fully in frame
  if (Y1 - Y0 < minH) return;                                                     // too small to be read
  REG.push({ id: String(id), text, x0: X0, y0: Y0, x1: X1, y1: Y1 });
}
function regW(id, text, x0, y0, x1, y1, a = 1, minH = 14) {   // a box on the sheet (world units)
  const b = window.__cam, SX = innerWidth / 1920; if (!b) return;
  const q = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([x, y]) => toScreen(b, x, y)); if (q.some(p => !p)) return;
  const xs = q.map(p => p[0] * SX), ys = q.map(p => p[1] * SX);
  regBox(id, text, Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), a, minH);
}
function regS(id, text, x0, y0, x1, y1, a = 1) { const SX = innerWidth / 1920; regBox(id, text, x0 * SX, y0 * SX, x1 * SX, y1 * SX, a, 8); }
const RG = { regW, regS };
const DEG = Math.PI / 180, FOV = 32 * DEG, FOCAL = 540 / Math.tan(FOV / 2);
const INK = '#1b1c1e', PAPER = '#f2eee5', MUTED = '#77736b', RIVERC = '#bcd6ea', RIVERE = '#8fb5d6';
const F = (w, px) => `${w} ${px}px Inter, NotoSC`;
const LW = 15;

// ---------------------------------------------------------------- geometry
function rounded(pts, r) { // dense polyline with circular fillets at corners (world units)
  const P = pts.filter((q, i) => { if (i === 0 || i === pts.length - 1) return true; const a = pts[i - 1], b = pts[i + 1];
    return Math.abs((q[0] - a[0]) * (b[1] - q[1]) - (q[1] - a[1]) * (b[0] - q[0])) > 1e-6; });
  const out = [P[0]];
  for (let i = 1; i < P.length - 1; i++) {
    const [ax, ay] = P[i - 1], [bx, by] = P[i], [cx, cy] = P[i + 1];
    let ux = ax - bx, uy = ay - by, vx = cx - bx, vy = cy - by;
    const lu = Math.hypot(ux, uy), lv = Math.hypot(vx, vy); ux /= lu; uy /= lu; vx /= lv; vy /= lv;
    const ang = Math.acos(clamp(ux * vx + uy * vy, -1, 1));
    const tlen = Math.min(r / Math.tan(ang / 2), lu * .45, lv * .45), rr = tlen * Math.tan(ang / 2);
    const p1 = [bx + ux * tlen, by + uy * tlen], p2 = [bx + vx * tlen, by + vy * tlen];
    const bis = [ux + vx, uy + vy], bl = Math.hypot(...bis), d = rr / Math.sin(ang / 2);
    const ox = bx + bis[0] / bl * d, oy = by + bis[1] / bl * d;
    let a1 = Math.atan2(p1[1] - oy, p1[0] - ox), a2 = Math.atan2(p2[1] - oy, p2[0] - ox);
    let da = a2 - a1; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    out.push(p1); for (let k = 1; k < 12; k++) { const a = a1 + da * k / 12; out.push([ox + Math.cos(a) * rr, oy + Math.sin(a) * rr]); } out.push(p2);
  }
  out.push(P[P.length - 1]);
  const L = [0]; for (let i = 1; i < out.length; i++) L.push(L[i - 1] + Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]));
  return { p: out, L, total: L[L.length - 1] };
}
function project(path, x, y) {
  let best = 1e18, bl = 0; const { p, L } = path;
  for (let i = 1; i < p.length; i++) {
    const [ax, ay] = p[i - 1], [bx, by] = p[i], dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
    const f = clamp(((x - ax) * dx + (y - ay) * dy) / l2), qx = ax + dx * f, qy = ay + dy * f, d = (x - qx) ** 2 + (y - qy) ** 2;
    if (d < best) { best = d; bl = L[i - 1] + f * (L[i] - L[i - 1]); }
  }
  return bl;
}
function pointAt(path, len) {
  const { p, L } = path; if (len <= 0) return p[0]; if (len >= path.total) return p[p.length - 1];
  let lo = 0, hi = L.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L[m] < len) lo = m; else hi = m; }
  const f = (len - L[lo]) / (L[hi] - L[lo] || 1); return [lerp(p[lo][0], p[hi][0], f), lerp(p[lo][1], p[hi][1], f)];
}
function dirAt(path, len) { const a = pointAt(path, len - 2), b = pointAt(path, len + 2); return Math.atan2(b[1] - a[1], b[0] - a[0]); }
function subPath(c, path, a, b) { // trace the part [a, b] of a path into the current context path
  if (b < a) [a, b] = [b, a]; if (b - a < .01) return false;
  const { p, L } = path; const s = pointAt(path, a); c.moveTo(s[0], s[1]);
  for (let i = 1; i < p.length; i++) { if (L[i] <= a) continue; if (L[i] >= b) break; c.lineTo(p[i][0], p[i][1]); }
  const e = pointAt(path, b); c.lineTo(e[0], e[1]); return true;
}
const W = v => v * G;

// river polyline (world) and distance to it
// water (NET.WATER): bands {line: [[x, y]...], outer, inner} (widths in G) and areas {area: [[x, y]...]} (sea, bay, harbour,
// lake: a closed octilinear outline). With tunnel: true, lines crossing it turn dashed with a casing.
const WAT = WATER.map(w => ({ ...w, pts: (w.line || w.area).map(q => [W(q[0]), W(q[1])]), outerW: W(w.outer ?? .81), innerW: W(w.inner ?? .75) }));
function inPoly(poly, x, y) { let ins = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ins = !ins; } return ins; }
function inWater(x, y) { // inside a tunnel-making body of water, with the same 0.075 G margin past its edge
  for (const w of WAT) { if (!w.tunnel) continue;
    if (w.area) { if (inPoly(w.pts, x, y) || distPoly([...w.pts, w.pts[0]], x, y) < 7.5) return true; }
    else if (distPoly(w.pts, x, y) < w.outerW / 2 + 7.5) return true; }
  return false;
}
function distPoly(poly, x, y) { let best = 1e18; for (let i = 1; i < poly.length; i++) { const [ax, ay] = poly[i - 1], [bx, by] = poly[i], dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1; const f = clamp(((x - ax) * dx + (y - ay) * dy) / l2); best = Math.min(best, Math.hypot(x - ax - dx * f, y - ay - dy * f)); } return best; }

// ---------------------------------------------------------------- modes (line form carries the mode; colour carries identity)
// metro: solid 0.15 G · light (tram, light rail, maglev, people mover; old flag thin: true): solid 0.07 G
// bus: hollow 0.15 G, edges max(0.04 G, 2.5 px), paper core · ferry: 0.07 G thread on a 0.25 G paper lane, never dashed
const MODES = {
  metro: { lw: 22, fillet: 46 }, light: { lw: 9, fillet: 40 },          // NEO：地铁线 0.22 G、统一圆角 0.46 G；不生成假的小站（每个真实车站都在 net.js 里）
  bus: { lw: 15, fillet: 34, hollow: true, square: true, surface: true }, ferry: { lw: 7, fillet: 30, lane: 25, square: true, surface: true, pier: true },
};
const modeOf = L => MODES[L.mode || (L.thin ? 'light' : 'metro')];
const lum = hex => { const v = [1, 3, 5].map(i => { const c = parseInt(hex.slice(i, i + 2), 16) / 255; return c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
const inkOn = L => L.ink ?? lum(L.color) > .4;           // ink text in the bullet on light colours

// ---------------------------------------------------------------- network build
const PATHS = {}; // key: lineId or lineId+'b'
const LINE = {};
for (const L of LINES) {
  LINE[L.id] = L;
  for (const key of ['route', 'branch']) {
    if (!L[key]) continue;
    const ex = expand(L[key]);
    const path = rounded(ex.pts.map(q => [W(q[0]), W(q[1])]), modeOf(L).fillet);
    path.line = L.id; path.color = L.color; path.key = L.id + (key === 'branch' ? 'b' : '');
    path.st = []; // stations on the path: {id, s, x, y}
    L[key].forEach((it, i) => { if (it === '/') return; const id = NET.sid(it); if (!id) return; const q = gpt(it);
      // NEO：环线最后一站（和第一站是同一个站）放在路径的末端，不然环永远画不出来
      const s = L.loop && i === L[key].length - 1 ? path.total : project(path, W(q[0]), W(q[1]));
      path.st.push({ id, x: W(q[0]), y: W(q[1]), s }); });
    // tunnel intervals: where the path is inside the river band
    path.tun = []; let inT = false, s0 = 0;
    for (let s = 0; s <= path.total; s += 4) { const q = pointAt(path, s); const now = !modeOf(L).surface && inWater(q[0], q[1]);
      if (now && !inT) { inT = true; s0 = s; } if (!now && inT) { inT = false; path.tun.push([s0, s]); } }
    if (inT) path.tun.push([s0, path.total]);
    // minor stops between named stations
    path.minor = [];
    const st = [...path.st].sort((a, b) => a.s - b.s);
    for (let i = 1; i < st.length; i++) {
      const gap = st[i].s - st[i - 1].s, n = Math.floor(gap / 78) - 0;
      if (!modeOf(L).minor) break;
      for (let k = 1; k < n; k++) { const s = st[i - 1].s + gap * k / n; if (path.tun.some(([a, b]) => s > a - 20 && s < b + 20)) continue; path.minor.push(s); }
    }
    // NEO：折角（拖线时笔尖在这里"咔"一下、弹一下）：八方向折线每个拐点在圆角路径上的位置和转角
    path.corners = [];
    const E = ex.pts.map(q => [W(q[0]), W(q[1])]);
    for (let i = 1; i < E.length - 1; i++) {
      const a1 = Math.atan2(E[i][1] - E[i - 1][1], E[i][0] - E[i - 1][0]), a2 = Math.atan2(E[i + 1][1] - E[i][1], E[i + 1][0] - E[i][0]);
      let d = a2 - a1; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      if (Math.abs(d) > .3) path.corners.push({ s: project(path, E[i][0], E[i][1]), turn: d });
    }
    PATHS[path.key] = path;
  }
}
// station → the line points that meet there
const SNODE = {};
for (const path of Object.values(PATHS)) for (const q of path.st) {
  const n = SNODE[q.id] || (SNODE[q.id] = { id: q.id, pts: [], lines: new Set() });
  if (!n.pts.some(p => p.line === path.line)) n.pts.push({ line: path.line, x: q.x, y: q.y, path: path.key, s: q.s });
  n.lines.add(path.line);
}
for (const n of Object.values(SNODE)) {
  const s = ST[n.id]; n.zh = s[2]; n.en = s[3]; n.tier = s[4]; n.x = W(s[0]); n.y = W(s[1]);
  const xs = n.pts.map(p => p.x), ys = n.pts.map(p => p.y);
  n.box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  n.cx = (n.box[0] + n.box[2]) / 2; n.cy = (n.box[1] + n.box[3]) / 2;
}

// ---------------------------------------------------------------- growth phases
// a phase draws part of a path from station a toward station b between film times t0 and t1
const PH = DATA.PHASES.map(ph => {
  const path = PATHS[ph.path]; if (!path) throw new Error('no path ' + ph.path);
  const fa = path.st.find(q => q.id === ph.a), fb = ph.bLast ? path.st.filter(q => q.id === ph.b).pop() : path.st.find(q => q.id === ph.b);
  if (!fa || !fb) throw new Error('phase station missing ' + ph.path + ' ' + ph.a + ' ' + ph.b);
  const o = { ...ph, path, s0: fa.s, s1: fb.s };
  // progress function: custom keys (t, station) or eased between t0 and t1
  if (ph.keys) { const ks = ph.keys.map(([t, id]) => [t, Math.abs(path.st.find(q => q.id === id).s - o.s0) / Math.abs(o.s1 - o.s0)]); o.f = monotone(ks); o.t0 = ks[0][0]; o.t1 = ks[ks.length - 1][0]; }
  else if (ph.lin) o.f = t => seg(t, o.t0, o.t1);
  else o.f = hopEase(o);
  return o;
});
// NEO：拖线的手感。默认的生长不是一条匀速曲线，而是一站一站拖过去：站间距离越长用时越长（距离的 0.7 次方），
// 每一跳里中段快、进站慢（速度在站上降到 45 %，从不停死），像手拖着线一格一格往前放。
function hopEase(o) {
  const lo = Math.min(o.s0, o.s1), hi = Math.max(o.s0, o.s1), L = hi - lo || 1, dir = o.s1 >= o.s0 ? 1 : -1;
  const ss_ = [...new Set(o.path.st.map(q => q.s).filter(s => s > lo + 20 && s < hi - 20))].sort((a, b) => (a - b) * dir);
  const B = [0, ...ss_.map(s => Math.abs(s - o.s0) / L), 1];
  const w = B.slice(1).map((b, i) => Math.pow(Math.max(.02, b - B[i]), .7)), W0 = w.reduce((a, b) => a + b, 0);
  const T = [0]; w.forEach(x => T.push(T[T.length - 1] + x / W0));
  return t => {
    const u = seg(t, o.t0, o.t1); let i = 0; while (i < T.length - 2 && u > T[i + 1]) i++;
    const v = clamp((u - T[i]) / (T[i + 1] - T[i] || 1)), h = v - .55 * Math.sin(2 * Math.PI * v) / (2 * Math.PI);
    return B[i] + (B[i + 1] - B[i]) * h;
  };
}
const phaseHead = (o, t) => t <= o.t0 ? o.s0 : t >= o.t1 ? o.s1 : lerp(o.s0, o.s1, clamp(o.f(t)));
function arrival(o, s) { // when the tip of phase o reaches arc length s
  const lo0 = Math.min(o.s0, o.s1) - 1, hi0 = Math.max(o.s0, o.s1) + 1; if (s < lo0 || s > hi0) return Infinity;
  let a = o.t0, b = o.t1; const want = Math.abs(s - o.s0);
  for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (Math.abs(phaseHead(o, m) - o.s0) >= want - .5) b = m; else a = m; }
  return b;
}
// light time of each (station, line) point, and of each station
for (const n of Object.values(SNODE)) {
  for (const p of n.pts) { p.tl = Infinity; for (const o of PH) if (o.path.key === p.path) p.tl = Math.min(p.tl, arrival(o, p.s)); }
  const ts = n.pts.map(p => p.tl).sort((a, b) => a - b);
  n.t1 = ts[0]; n.t2 = ts.length > 1 ? ts[1] : Infinity; // first line arrives, second line arrives (becomes an interchange)
}
for (const path of Object.values(PATHS)) path.minorT = path.minor.map(s => { let tl = Infinity; for (const o of PH) if (o.path === path) tl = Math.min(tl, arrival(o, s)); return tl; });
// NEO：终点（这条线只在一端出现的车站）：线画到这里时立一根干净的横杠
const TERM = [];
for (const L of LINES) {
  if (L.loop) continue;
  const cnt = {}; for (const key of ['route', 'branch']) if (L[key]) for (const it of L[key]) { const id = it === '/' ? null : NET.sid(it); if (id) cnt[id] = (cnt[id] || 0) + 1; }
  for (const key of ['route', 'branch']) {
    const p = PATHS[L.id + (key === 'branch' ? 'b' : '')]; if (!p) continue;
    for (const [s, id] of [[0, p.st[0].id], [p.total, p.st[p.st.length - 1].id]]) if (cnt[id] === 1) {
      let tl = Infinity; for (const o of PH) if (o.path === p) tl = Math.min(tl, arrival(o, s + (s ? -1.5 : 1.5)));
      TERM.push({ path: p, s, id, tl, ang: dirAt(p, s ? s - 3 : 3) });
    }
  }
}
// NEO：每个拐角被笔尖经过的时间（弹簧过冲从这一刻开始；也是声音里"咔"的一下）
const SNAPS = [];
for (const o of PH) for (const k of o.path.corners) { const ta = arrival(o, k.s); if (ta < Infinity && ta > o.t0) SNAPS.push({ o, s: k.s, turn: k.turn, t: ta }); }
const lineStart = {}; for (const o of PH) { const k = o.path.line; if (!(k in lineStart) || o.t0 < lineStart[k].t0) lineStart[k] = o; }

// ---------------------------------------------------------------- paper texture (tileable)
function paperTexture() {
  const N = 1024, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d');
  const img = g.createImageData(N, N), d = img.data, R = mulberry(7);
  const lat = (p, seed) => { const a = new Float32Array(p * p); const r = mulberry(seed); for (let i = 0; i < a.length; i++) a[i] = r(); return a; };
  const L1 = lat(16, 3), L2 = lat(64, 5), L3 = lat(256, 9);
  const vn = (a, p, x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const at = (i, j) => a[((j % p + p) % p) * p + ((i % p + p) % p)];
    return lerp(lerp(at(xi, yi), at(xi + 1, yi), ux), lerp(at(xi, yi + 1), at(xi + 1, yi + 1), ux), uy); };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = (y * N + x) * 4, u = x / N, v = y / N;
    const cloud = .55 * vn(L1, 16, u * 16, v * 16) + .3 * vn(L2, 64, u * 64, v * 64) + .15 * vn(L3, 256, u * 256, v * 256);
    d[i] = cloud * 255; d[i + 1] = (R() * .6 + vn(L3, 256, u * 256, v * 256) * .4) * 255; d[i + 2] = 0; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  // fibres into the blue channel
  const f = document.createElement('canvas'); f.width = f.height = N; const fg = f.getContext('2d'); fg.fillStyle = '#000'; fg.fillRect(0, 0, N, N);
  fg.strokeStyle = '#fff'; fg.lineCap = 'round';
  for (let k = 0; k < 2600; k++) { const x = R() * N, y = R() * N, a = R() * 6.283, l = 8 + R() * 34; fg.globalAlpha = .25 + R() * .6; fg.lineWidth = .6 + R() * 1.1;
    for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) { fg.beginPath(); fg.moveTo(x + ox, y + oy); fg.quadraticCurveTo(x + ox + Math.cos(a + .8) * l * .5, y + oy + Math.sin(a + .8) * l * .5, x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l); fg.stroke(); } }
  const fd = fg.getImageData(0, 0, N, N).data; const id2 = g.getImageData(0, 0, N, N); for (let i = 0; i < fd.length; i += 4) id2.data[i + 2] = fd[i]; g.putImageData(id2, 0, 0);
  return c;
}

// ---------------------------------------------------------------- label placement (static, on the full network)
const meas = document.createElement('canvas').getContext('2d');
const LBL = {}; // id -> {dx, dy, align, zs, es}
function placeLabels() {
  const pts = []; for (const p of Object.values(PATHS)) for (let s = 0; s < p.total; s += 12) pts.push(pointAt(p, s));
  const grid = new Map(); const key = (x, y) => (Math.floor(x / 60)) + ',' + (Math.floor(y / 60));
  for (const q of pts) { const k = key(q[0], q[1]); (grid.get(k) || grid.set(k, []).get(k)).push(q); }
  const boxes = [];
  const nodes = Object.values(SNODE).filter(n => n.tier <= 3).sort((a, b) => a.tier - b.tier || b.lines.size - a.lines.size);
  for (const n of nodes) {
    const zs = n.tier === 1 ? 30 : n.tier === 2 ? 23 : 20, es = n.tier === 1 ? 17 : 14, K = n.tier === 1 ? 1.35 : 1;
    meas.font = F(n.tier === 1 ? 700 : 600, zs * K); const zw = meas.measureText(n.zh).width; meas.font = F(500, es * K); const ew = meas.measureText(n.en).width;
    const w = Math.max(zw, ew), h = (zs + es + 4) * K;
    const hw = (n.box[2] - n.box[0]) / 2 + 16, hh = (n.box[3] - n.box[1]) / 2 + 16;
    const cands = [['e', hw + 6, -h / 2, 0], ['w', -hw - 6 - w, -h / 2, 1], ['ne', hw - 2, -hh - h + 6, 2], ['se', hw - 2, hh - 6, 2], ['nw', -hw + 2 - w, -hh - h + 6, 3], ['sw', -hw + 2 - w, hh - 6, 3], ['n', -w / 2, -hh - h - 2, 2.5], ['s', -w / 2, hh + 2, 2.5]];
    const pref = DATA.LABEL_PREF[n.id];
    let best = null;
    for (const [nm, ox, oy, pen] of cands) {
      const x0 = n.cx + ox, y0 = n.cy + oy, x1 = x0 + w, y1 = y0 + h;
      let sc = pen * 4 + (pref ? (pref === nm ? -1000 : 0) : 0);
      for (let gx = Math.floor(x0 / 60); gx <= Math.floor(x1 / 60); gx++) for (let gy = Math.floor(y0 / 60); gy <= Math.floor(y1 / 60); gy++) {
        for (const q of grid.get(gx + ',' + gy) || []) if (q[0] > x0 - 9 && q[0] < x1 + 9 && q[1] > y0 - 9 && q[1] < y1 + 9) sc += 3; }
      for (const b of boxes) if (x0 < b[2] && x1 > b[0] && y0 < b[3] && y1 > b[1]) sc += 60;
      if (!best || sc < best.sc) best = { sc, nm, x0, y0, w, h };
    }
    boxes.push([best.x0 - 4, best.y0 - 4, best.x0 + best.w + 4, best.y0 + best.h + 4]);
    const right = best.nm === 'w' || best.nm === 'nw' || best.nm === 'sw';
    const centre = best.nm === 'n' || best.nm === 's';
    LBL[n.id] = { nm: best.nm, hw, hh, zs, es, align: right ? 'right' : centre ? 'center' : 'left' };
  }
}

// ---------------------------------------------------------------- camera
function basis(c) {
  const th = c.head * DEG, ti = c.tilt * DEG;
  const F = [Math.sin(th) * Math.sin(ti), -Math.cos(th) * Math.sin(ti), -Math.cos(ti)];
  const R = [Math.cos(th), Math.sin(th), 0];
  const U = [F[1] * R[2] - F[2] * R[1], F[2] * R[0] - F[0] * R[2], F[0] * R[1] - F[1] * R[0]];
  const D = FOCAL / c.z;
  const pos = [c.x - F[0] * D, c.y - F[1] * D, -F[2] * D];
  return { pos, F, R, Up: U, focal: FOCAL, D, c };
}
function toScreen(b, x, y, z = 0) {
  const v = [x - b.pos[0], y - b.pos[1], z - b.pos[2]];
  const zc = v[0] * b.F[0] + v[1] * b.F[1] + v[2] * b.F[2]; if (zc <= 1) return null;
  const xc = v[0] * b.R[0] + v[1] * b.R[1] + v[2] * b.R[2], yc = v[0] * b.Up[0] + v[1] * b.Up[1] + v[2] * b.Up[2];
  return [960 + FOCAL * xc / zc, 540 - FOCAL * yc / zc, zc];
}
function toPlane(b, sx, sy, maxT) {
  const px = sx - 960, py = 540 - sy;
  const d = [b.F[0] * FOCAL + b.R[0] * px + b.Up[0] * py, b.F[1] * FOCAL + b.R[1] * px + b.Up[1] * py, b.F[2] * FOCAL + b.R[2] * px + b.Up[2] * py];
  const l = Math.hypot(...d); d[0] /= l; d[1] /= l; d[2] /= l;
  let t = d[2] < -1e-4 ? -b.pos[2] / d[2] : maxT; t = Math.min(t, maxT);
  return [b.pos[0] + d[0] * t, b.pos[1] + d[1] * t, t];
}
const CAM = DATA.camera; // (t, helpers) -> {x, y, z, tilt, head, ap}

// ---------------------------------------------------------------- drawing helpers (world space)
function stopDot(c, x, y, color, r = 11.5, ring = 5.4) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = '#fff'; c.fill(); c.lineWidth = ring; c.strokeStyle = color; c.stroke(); }
function capsule(c, n, sc = 1, lw = 6) {
  const pad = 16, [x0, y0, x1, y1] = n.box, w = (x1 - x0) / 2 + pad, h = (y1 - y0) / 2 + pad;
  c.save(); c.translate(n.cx, n.cy); c.scale(sc, sc);
  c.beginPath(); c.roundRect(-w, -h, 2 * w, 2 * h, Math.min(w, h)); c.fillStyle = '#fff'; c.fill(); c.lineWidth = lw; c.strokeStyle = INK; c.stroke();
  c.restore();
}
function labelText(c, n, a, scaleK = 1) {
  const L = LBL[n.id]; if (!L || a <= .01) return;
  const k = scaleK, zs = L.zs * k, es = L.es * k, h = zs + es + 4 * k, { hw, hh } = L;
  // anchor from the station edge (fixed) and the label box (scaled)
  const P = { e: [hw + 6, -h / 2], w: [-hw - 6, -h / 2], ne: [hw - 2, -hh - h + 6], se: [hw - 2, hh - 6], nw: [-hw + 2, -hh - h + 6], sw: [-hw + 2, hh - 6], n: [0, -hh - h - 2], s: [0, hh + 2] }[L.nm];
  c.save(); c.globalAlpha *= a; c.textAlign = L.align; c.textBaseline = 'top';
  c.translate(n.cx, n.cy);
  const ox = P[0], oy = P[1];
  c.lineJoin = 'round'; c.strokeStyle = 'rgba(242,238,229,.92)';
  const nm = DATA.nameAt ? DATA.nameAt(n, c.__t) : [n.zh, n.en];
  c.font = F(n.tier === 1 ? 700 : 600, zs); const wz = c.measureText(nm[0]).width; c.lineWidth = 5 * k; c.strokeText(nm[0], ox, oy); c.fillStyle = INK; c.fillText(nm[0], ox, oy);
  c.font = F(500, es); const we = c.measureText(nm[1]).width; c.fillStyle = '#4a4740'; c.strokeText(nm[1], ox, oy + zs + 3 * k); c.fillText(nm[1], ox, oy + zs + 3 * k);
  c.restore();
  const w = Math.max(wz, we), lx = L.align === 'left' ? ox : L.align === 'right' ? ox - w : ox - w / 2;
  regW('st-' + n.id, nm[0] + ' ' + nm[1], n.cx + lx, n.cy + oy, n.cx + lx + w, n.cy + oy + zs + 3 * k + es, a, 26);
}
function roundel(c, x, y, line, sc, r = 25) {   // the line bullet: a disc for rail, a rounded square for bus and ferry
  const L = LINE[line]; c.save(); c.translate(x, y); c.scale(sc, sc);
  c.beginPath(); if (modeOf(L).square) c.roundRect(-24, -24, 48, 48, 12); else c.arc(0, 0, r, 0, 7); c.fillStyle = L.color; c.fill();
  const txt = L.bullet ?? L.id;
  c.fillStyle = inkOn(L) ? INK : '#fff';
  c.font = F(800, L.id.length > 1 || txt.length > 1 ? (txt.length > 2 || /[^\x00-\x7f]/.test(txt) ? 15 : 22) : 27); c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(txt, 0, 1.5); c.restore();
}
function tipGlow(c, x, y, color, a) {
  const rgb = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16)).join(',');
  const g = c.createRadialGradient(x, y, 0, x, y, 80); g.addColorStop(0, `rgba(${rgb},${.45 * a})`); g.addColorStop(.4, `rgba(${rgb},${.14 * a})`); g.addColorStop(1, `rgba(${rgb},0)`);
  c.fillStyle = g; c.beginPath(); c.arc(x, y, 80, 0, 7); c.fill();
  c.save(); c.globalAlpha = a; c.beginPath(); c.arc(x, y, 11, 0, 7); c.fillStyle = '#fff'; c.shadowColor = `rgba(${rgb},1)`; c.shadowBlur = 22; c.fill(); c.shadowBlur = 0; c.lineWidth = 5; c.strokeStyle = color; c.stroke(); c.restore();
}
function train(c, path, s, color, a, scale = 1) {
  const q = pointAt(path, s), ang = dirAt(path, s);
  c.save(); c.globalAlpha *= a; c.translate(q[0], q[1]); c.rotate(ang); c.scale(scale, scale);
  // NEO：列车是一粒墨色的胶囊，三扇纸色的窗（白色的是车站，墨色的是车，远看也分得开）
  c.beginPath(); c.roundRect(-24, -8, 48, 16, 8); c.fillStyle = INK; c.fill(); c.lineWidth = 2.2; c.strokeStyle = 'rgba(246,243,236,.9)'; c.stroke();
  c.fillStyle = 'rgba(246,243,236,.92)'; for (const wx of [-11, 0, 11]) { c.beginPath(); c.roundRect(wx - 3.6, -3, 7.2, 6, 1.6); c.fill(); }
  c.restore();
}

function surfaceLine(c, path, a, b, L, M, z) {
  // Paper inside a bus line or around a ferry is not painted: it is erased out of the ink layer (destination-out), so the
  // procedural paper of the WebGL pass shows through with its own tooth and light. Surface lines are drawn before every
  // solid line, so the erase only removes water and other surface lines under them, never a metro line or a label.
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  const px = 1 / Math.max(z, .01);                                        // one screen pixel at the aim point, in world units
  if (M.hollow) {
    // 0.15 G with 0.04 G edges; in wide shots it widens so each edge stays >= 2.5 px and the paper core >= 2.5 px
    const e = Math.max(4, 2.5 * px), w = Math.max(M.lw, 2 * e + 2.5 * px);
    if (lum(L.color) > .4) { c.strokeStyle = INK; c.lineWidth = w + 2 * Math.max(1.5, px); c.beginPath(); subPath(c, path, a, b); c.stroke(); }  // light colours: an ink rim, 0.015 G or 1 px
    c.strokeStyle = L.color; c.lineWidth = w; c.beginPath(); subPath(c, path, a, b); c.stroke();
    c.globalCompositeOperation = 'destination-out'; c.lineWidth = w - 2 * e; c.lineCap = 'butt'; c.beginPath(); subPath(c, path, a + 1, b - 1); c.stroke();
  } else if (M.lane) {
    c.globalCompositeOperation = 'destination-out'; c.lineWidth = Math.max(M.lane, 10 * px); c.beginPath(); subPath(c, path, a, b); c.stroke();   // the paper lane, >= 10 px
    c.globalCompositeOperation = 'source-over'; c.strokeStyle = L.color; c.lineWidth = M.lw; c.beginPath(); subPath(c, path, a, b); c.stroke();
  }
  c.restore();
}
function pier(c, x, y, color, sc = 1) { c.save(); c.translate(x, y); c.scale(sc, sc); c.beginPath(); c.roundRect(-8.5, -8.5, 17, 17, 4); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 4; c.strokeStyle = color; c.stroke(); c.restore(); }
function drawLinks(c, t, view) {   // NET.LINKS: {a, b, out}: in-station (white bar, ink outline) or out-of-station (ink dots)
  for (const k of LINKS) {
    const A = SNODE[k.a], B = SNODE[k.b]; if (!A || !B) continue;
    const t0 = Math.max(A.t1, B.t1); if (t < t0) continue;
    const u = eo(seg(t, t0, t0 + .35)), x1 = lerp(A.cx, B.cx, u), y1 = lerp(A.cy, B.cy, u);
    c.save(); c.lineCap = 'round';
    if (k.out) { const len = Math.hypot(x1 - A.cx, y1 - A.cy), n = Math.floor(len / 8); c.fillStyle = INK;
      for (let i = 0; i <= n; i++) { const f = n ? i / n : 0; c.beginPath(); c.arc(lerp(A.cx, x1, f), lerp(A.cy, y1, f), 1.5, 0, 7); c.fill(); } }
    else { c.strokeStyle = INK; c.lineWidth = 6 + 2 * 5.5; c.beginPath(); c.moveTo(A.cx, A.cy); c.lineTo(x1, y1); c.stroke();
      c.strokeStyle = '#fff'; c.lineWidth = 6; c.stroke(); }
    c.restore();
  }
}
function dropRing(c, n, k2, { capsule, INK }) {   // default landing of a falling interchange: shock rings in ink and in each line's colour
  if (k2 < 0) return;
  if (k2 < .9) { const v = k2 / .9, cols = [...n.pts].sort((p, q) => p.tl - q.tl).map(p => LINE[p.line].color);
    c.save(); c.globalAlpha *= (1 - v) * .75; c.lineWidth = 7; c.strokeStyle = INK; c.beginPath(); c.arc(n.cx, n.cy, 30 + 230 * eo(v), 0, 7); c.stroke();
    cols.forEach((col, i) => { c.lineWidth = 5; c.strokeStyle = col; c.beginPath(); c.arc(n.cx, n.cy, 26 - 4 * i + (170 - 50 * i) * eo(clamp(v * (1.15 + .15 * i))), 0, 7); c.stroke(); });
    c.restore(); }
  capsule(c, n, 1 + .18 * Math.exp(-k2 * 14) * Math.cos(k2 * 40), 7);
}
function fallingCapsule(c, t) {   // every DATA.drops interchange falls for 0.42 s before it lands at t2; its shadow sharpens
  for (const id of Object.keys(DATA.drops)) {
    const n = SNODE[id]; if (!n) continue; const k = t - n.t2; if (!(k > -.42 && k < 0)) continue;
    const u = 1 + k / .42, h = 1 - ei(u);
    c.save();
    c.globalAlpha = .35 * u; c.fillStyle = '#000'; c.filter = `blur(${(14 * h).toFixed(1)}px)`;
    c.beginPath(); c.ellipse(n.cx + 60 * h, n.cy + 70 * h, 34 + 40 * h, 34 + 40 * h, 0, 0, 7); c.fill(); c.filter = 'none';
    c.globalAlpha = clamp(u * 2.5);
    const sc = 1 + 2.4 * h; c.translate(n.cx - 10 * h, n.cy - 30 * h); c.scale(sc, sc);
    const w = (n.box[2] - n.box[0]) / 2 + 15, hh = (n.box[3] - n.box[1]) / 2 + 15;
    c.beginPath(); c.roundRect(-Math.max(w, 28), -Math.max(hh, 28), 2 * Math.max(w, 28), 2 * Math.max(hh, 28), 28); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 7; c.strokeStyle = INK; c.stroke();
    c.restore();
  }
}

// ---------------------------------------------------------------- the printed sheet: static furniture
const SHEET = DATA.SHEET;
function sheetFurniture(c, t, view) {
  DATA.furniture(c, t, view, { F, INK, MUTED, roundel, stopDot, W, ...RG });
}

// NEO：一段线（含江底隧道的虚线和外壳）
let LWK = 1;   // NEO：远景里线别细到看不清：屏幕上至少 5 px（近景就是 0.22 G 本身）
function drawSpan(c, path, a, b, lw) {
  if (b - a < .5) return;
  lw *= LWK;
  c.save(); c.strokeStyle = path.color; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round';
  let cur = a; const cuts = path.tun.filter(([x, y]) => y > a && x < b).sort((p, q) => p[0] - q[0]);
  for (const [x, y] of cuts) {
    if (x > cur) { c.beginPath(); subPath(c, path, cur, x); c.stroke(); }
    const ta = Math.max(x, a), tb = Math.min(y, b);
    c.save(); c.lineCap = 'butt'; c.setLineDash([lw * 1.05, lw * .72]); c.lineDashOffset = -ta; c.globalAlpha = .92; c.beginPath(); subPath(c, path, ta, tb); c.stroke();
    c.setLineDash([]); c.globalAlpha = .5; c.lineWidth = 2.2; c.strokeStyle = INK; // tunnel casing
    for (const side of [-1, 1]) { c.beginPath(); const n = 24; for (let k = 0; k <= n; k++) { const s = lerp(ta, tb, k / n), q = pointAt(path, s), an = dirAt(path, s); const px = q[0] - Math.sin(an) * side * (lw / 2 + 5), py = q[1] + Math.cos(an) * side * (lw / 2 + 5); k ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke(); }
    c.restore(); cur = tb;
  }
  if (b > cur) { c.beginPath(); subPath(c, path, cur, b); c.stroke(); }
  c.restore();
}
// NEO：示意列车（时刻是编的，不是真实时刻表：片尾要写明"列车为示意"）。
// 每条线在已经画完、开通了的那一段上来回跑：逐站缓进缓出（smoothstep），停站 0.45 s；线段变长时旧车淡出、新车淡入。
// 返回 [{path, s, a, at, k}]：at 是正停着的车站、k 是停了多久（车站据此轻轻一跳）。
const V_TRAIN = 240, DWELL = .45;
function service(t, { from = 0, alpha = () => 1, every = 760, path: only = null } = {}) {
  const out = [];
  for (const path of Object.values(PATHS)) {
    if (only && !only.includes(path.key)) continue;
    const L = LINE[path.line];
    // 已经开通的区间：画完 0.4 s 以后才算；按开通先后逐步合并，每合并一次是一个新"版本"（新车淡入 0.5 s，旧车同时淡出）
    const iv = PH.filter(o => o.path === path).map(o => [Math.min(o.s0, o.s1), Math.max(o.s0, o.s1), o.t1 + .4]).sort((p, q) => p[2] - q[2]);
    const vers = []; let cur = [];
    for (const [lo, hi, d] of iv) {
      if (d > t) break;
      let m = [lo, hi]; cur = cur.filter(x => { if (x[1] >= m[0] - 2 && x[0] <= m[1] + 2) { m = [Math.min(x[0], m[0]), Math.max(x[1], m[1])]; return false; } return true; });
      cur = [...cur, m]; vers.push({ set: cur, born: d });
    }
    if (!vers.length) continue;
    const now = vers[vers.length - 1], prev = vers[vers.length - 2], an = clamp((t - now.born) / .5);
    const ver = [[now.set, an]]; if (prev && an < 1) ver.push([prev.set, 1 - an]);
    for (const [set, va] of ver) for (const [lo, hi] of set) {
      if (va <= 0 || t < from) continue;
      const st = [...new Set(path.st.map(q => q.s))].filter(s => s >= lo - 2 && s <= hi + 2).sort((a, b) => a - b);
      if (st.length < 2) continue;
      const ids = st.map(s => path.st.find(q => q.s === s).id);
      const loop = L.loop && Math.abs(hi - lo) > path.total - 5;
      const seq = loop ? [...st.keys(), 0].map(i => i) : [...st.keys(), ...[...st.keys()].reverse().slice(1)];
      const hops = []; let T0 = 0;
      for (let i = 0; i < seq.length - 1; i++) { const a = st[seq[i]], b0 = st[seq[i + 1]], b = loop && i === seq.length - 2 ? path.total : b0, d = Math.abs(b - a) / V_TRAIN + .3;
        hops.push({ a, b, t0: T0, d, to: ids[seq[i + 1]] }); T0 += d + DWELL; }
      const cyc = T0, n = Math.max(1, Math.round((hi - lo) / every)) * (loop ? 2 : 1);
      for (let j = 0; j < n; j++) {
        const dirRev = loop && j % 2 === 1, ph = ((t - from) + cyc * (j / n + .13 * hash(path.total + j))) % cyc;
        let tt = ((dirRev ? cyc - ph : ph) % cyc + cyc) % cyc;
        let h = hops.find(h => tt < h.t0 + h.d + DWELL) || hops[hops.length - 1];
        const u = clamp((tt - h.t0) / h.d), s = h.a + (h.b - h.a) * (u * u * (3 - 2 * u));
        const at = tt > h.t0 + h.d ? h.to : null;
        out.push({ path, s: s % (path.total + .001), a: va * alpha(path.key, t), at, k: at ? tt - h.t0 - h.d : 9, scale: modeOf(L).lw < 15 ? .7 : 1 });
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------- map
function drawMap(c, t, view) {
  const z = view.z; c.__t = t; LWK = Math.max(1, 5 / (22 * z));
  const lodMinor = ss(seg(z, .55, .85)), lod2 = ss(seg(z, .62, .9)), lod3 = ss(seg(z, 1.0, 1.3));
  const veil = DATA.veil(t); // 0..1: everything but the highlighted first section fades back
  // river and creek
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.save();
  // NEO：先画所有水体的深色边，再画所有的填色，汇合口（白鹅潭）才是一整片水，不会看见一条条边压在一起
  const wpath = w => { c.beginPath(); w.pts.forEach((q, i) => c[i ? 'lineTo' : 'moveTo'](q[0], q[1])); if (w.area) c.closePath(); };
  for (const w of WAT) { wpath(w); c.strokeStyle = RIVERE; c.lineWidth = w.area ? W(.05) : w.outerW; c.stroke(); }
  for (const w of WAT) { wpath(w); if (w.area) { c.fillStyle = RIVERC; c.fill(); } else { c.strokeStyle = RIVERC; c.lineWidth = w.innerW; c.stroke(); } }
  c.restore();
  (DATA.waterLabels || DATA.riverLabels)(c, t, view, { F });
  sheetFurniture(c, t, view);
  // walking links (under everything else on the network)
  drawLinks(c, t, view);
  // lines: surface forms first (bus, ferry), because their paper parts are erased out of the ink layer; then solid lines
  const active = [];
  for (const pass of [0, 1]) for (const o of PH) {
    if (t <= o.t0) continue;
    const head = phaseHead(o, t), path = o.path, L = LINE[path.line], M = modeOf(L);
    if ((pass === 0) !== !!M.surface) continue;
    const a = Math.min(o.s0, head), b = Math.max(o.s0, head);
    if (b - a < .5) continue;
    if (M.surface) { surfaceLine(c, path, a, b, L, M, view.z); if (t < o.t1 + .15) active.push({ o, head, fade: 1 - seg(t, o.t1, o.t1 + .15) }); continue; }
    // NEO：笔尖刚拐过一个角时，新的一段绕拐点多转一点再弹回来（弹簧过冲，约 0.5 s 收住）
    let sp = null;
    if (t < o.t1 + .6) for (const k of SNAPS) {
      if (k.o !== o) continue; const dt = t - k.t; if (dt < 0 || dt > .6) continue;
      const th = .16 * Math.sign(k.turn) * Math.exp(-dt * 7.5) * Math.sin(dt * 21 + 1.2) / Math.sin(1.2);
      if (!sp || k.t > sp.t) sp = { t: k.t, s: k.s + (o.s1 > o.s0 ? 1 : -1) * M.fillet * .6, th };
    }
    if (sp && sp.s > a && sp.s < b && !path.tun.some(([x, y]) => sp.s > x - 30 && sp.s < y + 30)) {
      const pv = pointAt(path, sp.s), front = o.s1 > o.s0;
      drawSpan(c, path, front ? a : sp.s, front ? sp.s : b, M.lw);
      c.save(); c.translate(pv[0], pv[1]); c.rotate(sp.th); c.translate(-pv[0], -pv[1]);
      drawSpan(c, path, front ? sp.s : a, front ? b : sp.s, M.lw);
      c.restore();
      if (t < o.t1 + .15) active.push({ o, head, fade: 1 - seg(t, o.t1, o.t1 + .15), rot: { pv, th: sp.th } });
    } else {
      drawSpan(c, path, a, b, M.lw);
      if (t < o.t1 + .15) active.push({ o, head, fade: 1 - seg(t, o.t1, o.t1 + .15) });
    }
  }
  // NEO：终点横杠（线画到终点时弹出来，垂直于线，线宽相同）
  for (const e of TERM) {
    const k = t - e.tl; if (k < 0) continue;
    const L = LINE[e.path.line], M = modeOf(L), q = pointAt(e.path, e.s), sc = 1 - Math.exp(-k * 9) * Math.cos(k * 16);
    c.save(); c.globalAlpha = clamp(k * 10) * (1 - .6 * veil); c.translate(q[0], q[1]); c.rotate(e.ang + Math.PI / 2); c.scale(sc, 1);
    c.strokeStyle = L.color; c.lineWidth = M.lw * LWK; c.lineCap = 'round'; c.beginPath(); c.moveTo(-M.lw * 1.35 * LWK, 0); c.lineTo(M.lw * 1.35 * LWK, 0); c.stroke(); c.restore();
  }
  // first section highlight (end of film): glow along the 1993 segment
  DATA.highlight(c, t, { PATHS, pointAt, subPath, PH, phaseHead, drawSpan, modeOf, LINE });
  // veil: paper wash over the network except the highlight
  if (veil > 0) { c.save(); c.fillStyle = `rgba(242,238,229,${.62 * veil})`; c.fillRect(SHEET[0], SHEET[1], SHEET[2] - SHEET[0], SHEET[3] - SHEET[1]); c.restore(); DATA.highlight(c, t, { PATHS, pointAt, subPath, PH, phaseHead, drawSpan, modeOf, LINE }, true); }
  // NEO：列车先算位置（车站要知道自己是不是刚有车进站，好跳一下），画在车站上面
  const TR = DATA.trains(c, t, { PATHS, PH, phaseHead, train, pointAt, service }) || [];
  const pulse = {}; for (const r of TR) if (r.at != null && r.k < .6) pulse[r.at] = Math.max(pulse[r.at] || 0, Math.sin(Math.PI * r.k / .6) * r.a);
  // stations
  for (const n of Object.values(SNODE)) {
    if (t < n.t1) continue;
    const k1 = t - n.t1, multi = n.pts.length > 1, inter = t >= n.t2 && multi;
    const dim = DATA.stationDim(n, t, veil), pu = pulse[n.id] || 0;
    c.save(); c.globalAlpha = dim;
    if (!inter) {
      if (n.tier <= 3 || lodMinor > 0) { const p = n.pts.reduce((a, b) => a.tl <= b.tl ? a : b); const col = LINE[p.line].color;
        const sc = (.6 + .4 * back(seg(k1, 0, .28), 3)) * (1 + .28 * pu);
        if (k1 < .6) { c.save(); c.globalAlpha *= (1 - k1 / .6) * .6; c.lineWidth = 3.5; c.strokeStyle = col; c.beginPath(); c.arc(p.x, p.y, 13 + 36 * eo(k1 / .6), 0, 7); c.stroke(); c.restore(); }
        c.globalAlpha *= n.tier <= 3 ? 1 : lodMinor; if (modeOf(LINE[p.line]).pier) pier(c, p.x, p.y, col, sc); else stopDot(c, p.x, p.y, col, 11.5 * sc, 5.4); }
    } else {
      const k2 = t - n.t2, drop = DATA.drops[n.id];
      if (drop) (DATA.dropRing || dropRing)(c, n, k2, { capsule, INK });
      else {
        // NEO：第二条线到的那一刻，换乘站从 0.25 倍弹到 1.3 倍再落定（弹簧），一圈墨环散开
        let tp = -9; for (const p of n.pts) if (p.tl <= t && p.tl > n.t2 + .05) tp = Math.max(tp, p.tl);   // 第三条、第四条线经过时再轻轻弹一下
        const k3 = t - tp, again = k3 < .7 ? .22 * Math.exp(-k3 * 6) * Math.sin(k3 * 15) : 0;
        const sc = (1 - .75 * Math.exp(-k2 * 7) * Math.cos(k2 * 17)) * (1 + .16 * pu + again);
        if (k2 < .6) { c.save(); c.globalAlpha *= (1 - k2 / .6) * .55; c.lineWidth = 4; c.strokeStyle = INK; c.beginPath(); c.arc(n.cx, n.cy, 20 + 52 * eo(k2 / .6), 0, 7); c.stroke(); c.restore(); }
        c.globalAlpha *= clamp(k2 * 14); capsule(c, n, sc); }
    }
    c.restore();
  }
  for (const r of TR) train(c, r.path, r.s, r.path.color, r.a * (1 - .6 * veil), r.scale || 1);
  // glowing tips (NEO：前面带一小段半透明的牵引线，像手正拖着它)
  for (const { o, head, fade, rot } of active) {
    c.save(); if (rot) { c.translate(rot.pv[0], rot.pv[1]); c.rotate(rot.th); c.translate(-rot.pv[0], -rot.pv[1]); }
    const dir = o.s1 > o.s0 ? 1 : -1, lead = Math.min(46, Math.abs(o.s1 - head)), mv = t < o.t1 ? 1 : 0;
    if (lead > 2 && mv) { c.save(); c.globalAlpha = .32 * fade; c.strokeStyle = o.path.color; c.lineWidth = modeOf(LINE[o.path.line]).lw * .5; c.lineCap = 'round'; c.beginPath(); subPath(c, o.path, head, head + dir * lead); c.stroke(); c.restore(); }
    const q = pointAt(o.path, head); tipGlow(c, q[0], q[1], o.path.color, fade * (o.glow ?? 1)); c.restore();
  }
  // roundels at the start of each line, with the opening year
  for (const [id, o] of Object.entries(lineStart)) {
    if (DATA.noRoundel.includes(id)) continue;
    const u = seg(t, o.t0 - .05, o.t0 + .3); if (u <= 0) continue;
    const p = pointAt(o.path, o.s0), an = dirAt(o.path, o.s0 + (o.s1 > o.s0 ? 3 : -3)) + (o.s1 > o.s0 ? Math.PI : 0);
    const rp = typeof DATA.roundelPos === 'function' ? DATA.roundelPos(t, id) : DATA.roundelPos[id]; /* NEO：也可以是随时间变的函数 */ const rx = rp ? W(rp[0]) : p[0] + Math.cos(an) * 44, ry = rp ? W(rp[1]) : p[1] + Math.sin(an) * 44;
    c.save(); c.globalAlpha = (1 - .6 * veil) * DATA.roundelAlpha(t, id, z);
    roundel(c, rx, ry, id, back(u, 2.2) * DATA.roundelScale(z));
    const yr = o.yearLabel; if (yr && !rp) { const ys = DATA.roundelScale(z); c.font = F(700, 17 * ys); c.fillStyle = INK; c.textAlign = 'center'; c.textBaseline = 'top'; c.globalAlpha *= seg(t, o.t0 + .1, o.t0 + .4); c.fillText(yr, rx, ry + 30 * ys); }
    c.restore();
  }
  // labels
  for (const n of Object.values(SNODE)) {
    if (n.tier > 3 || t < n.t1) continue;
    const only = DATA.labelOnly && DATA.labelOnly(t); if (only && !only.includes(n.id)) continue;
    const vis = n.tier === 1 ? 1 : n.tier === 2 ? lod2 : lod3;
    const forced = DATA.forceLabel(n, t);
    const a = Math.max(vis, forced) * seg(t, n.t1 + .02, n.t1 + .3) * DATA.stationDim(n, t, veil);
    if (a <= 0) continue;
    labelText(c, n, a, n.tier === 1 ? DATA.hubLabelScale(z) : 1);
  }
  DATA.annotations(c, t, view, { F, INK, MUTED, pointAt, PATHS, SNODE, W, stopDot, roundel, capsule, LINE, ...RG });
  fallingCapsule(c, t);
}

// ---------------------------------------------------------------- frame
const glC = document.getElementById('gl'), ov = document.getElementById('ov'), oc = ov.getContext('2d');
const mapC = document.createElement('canvas'), mc = mapC.getContext('2d');
let plane = null;
function fit() { for (const k of [glC, ov]) { k.width = innerWidth; k.height = innerHeight; } }
fit();

function regionFor(b, view) {
  const maxT = b.D * (view.far || 5);
  const xs = [], ys = [];
  for (let i = 0; i <= 12; i++) for (const [sx, sy] of [[i * 160, 0], [i * 160, 1080], [0, i * 90], [1920, i * 90]]) { const q = toPlane(b, sx, sy, maxT); xs.push(q[0]); ys.push(q[1]); }
  let x0 = Math.min(...xs) - 30, x1 = Math.max(...xs) + 30, y0 = Math.min(...ys) - 30, y1 = Math.max(...ys) + 30;
  x0 = Math.max(x0, SHEET[0] - 40); y0 = Math.max(y0, SHEET[1] - 40); x1 = Math.min(x1, SHEET[2] + 40); y1 = Math.min(y1, SHEET[3] + 40);
  if (x1 <= x0) x1 = x0 + 10; if (y1 <= y0) y1 = y0 + 10;
  const near = toPlane(b, 960, 1080, maxT), zn = FOCAL / Math.max(1, near[2]);
  const want = 1.35 * Math.max(b.c.z, Math.min(zn, b.c.z * 2.2)) * (innerHeight / 1080);
  const s = Math.min(want, 4096 / (x1 - x0), 4096 / (y1 - y0));
  return { x0, y0, x1, y1, s };
}

function render(tFilm) {
  REG = [];
  const t = tauOf(tFilm);
  if (glC.width !== innerWidth) fit();
  const SX = innerWidth / 1920;
  const view = CAM(t);
  const b = basis(view);
  window.__cam = b;
  oc.setTransform(1, 0, 0, 1, 0, 0); oc.clearRect(0, 0, ov.width, ov.height);
  if (!DATA.tunnelOnly(t)) {
    const R = regionFor(b, view);
    const w = Math.max(2, Math.ceil((R.x1 - R.x0) * R.s)), h = Math.max(2, Math.ceil((R.y1 - R.y0) * R.s));
    // clear in pixel space: the previous frame's transform is still set, and clearing under it leaves old ink behind (ghosting, every other frame)
    if (mapC.width !== w || mapC.height !== h) { mapC.width = w; mapC.height = h; } else { mc.setTransform(1, 0, 0, 1, 0, 0); mc.clearRect(0, 0, w, h); }
    mc.setTransform(R.s, 0, 0, R.s, -R.x0 * R.s, -R.y0 * R.s);
    drawMap(mc, t, { ...view, region: R, b });
    plane.draw(b, [R.x0, R.y0, R.x0 + w / R.s, R.y0 + h / R.s], mapC, { sheet: SHEET, focusD: b.D * (view.focus || 1), aperture: view.ap || 0, vig: view.vig ?? .24, dim: view.dim || 0 });
  }
  oc.setTransform(SX, 0, 0, SX, 0, 0);
  DATA.overlay(oc, t, { b, toScreen, F, INK, view, ...RG });
}
window.render = render;
window.TEXTS = () => REG.slice();

// ---------------------------------------------------------------- events for the score
function events() {
  const ev = [];
  const pan = (t, x, y) => { const b = basis(CAM(t)), q = toScreen(b, x, y); if (!q) return { pan: 0, vis: 0 }; return { pan: +clamp((q[0] - 960) / 960, -1, 1).toFixed(2), vis: q[0] > -40 && q[0] < 1960 && q[1] > -40 && q[1] < 1120 ? 1 : 0 }; };
  for (const n of Object.values(SNODE)) {
    if (n.t1 < DUR) ev.push({ t: +n.t1.toFixed(3), type: 'stop', id: n.id, tier: n.tier, line: [...n.pts].sort((a, b) => a.tl - b.tl)[0].line, ...pan(n.t1, n.x, n.y) });
    if (n.t2 < DUR && n.pts.length > 1) ev.push({ t: +n.t2.toFixed(3), type: DATA.drops[n.id] ? 'drop' : 'x', id: n.id, ...pan(n.t2, n.cx, n.cy) });
  }
  // NEO：笔尖经过的每一个（车站, 线）：旋律用它，一条线一个音色
  for (const n of Object.values(SNODE)) for (const p of n.pts) if (p.tl < DUR) {
    const order = [...n.pts].filter(q => q.tl <= p.tl).length;
    ev.push({ t: +p.tl.toFixed(3), type: 'pass', id: n.id, line: p.line, nth: order, tier: n.tier, ...pan(p.tl, p.x, p.y) });
  }
  for (const o of PH) ev.push({ t: +o.t0.toFixed(3), type: 'depart', line: o.path.line, year: o.year, t1: +o.t1.toFixed(3), ...pan(o.t0, ...pointAt(o.path, o.s0)) });
  for (const path of Object.values(PATHS)) path.minorT.forEach((tl, i) => { if (tl < DUR) ev.push({ t: +tl.toFixed(3), type: 'minor', line: path.line, ...pan(tl, ...pointAt(path, path.minor[i])) }); });
  // NEO：拐角落定（声音里一声轻"咔"）和终点横杠
  for (const k of SNAPS) if (k.t < DUR) ev.push({ t: +k.t.toFixed(3), type: 'snap', line: k.o.path.line, ...pan(k.t, ...pointAt(k.o.path, k.s)) });
  for (const e of TERM) if (e.tl < DUR) ev.push({ t: +e.tl.toFixed(3), type: 'term', id: e.id, line: e.path.line, ...pan(e.tl, ...pointAt(e.path, e.s)) });
  for (const e of DATA.cues) ev.push(e);
  for (const e of ev) { e.tau = e.t; e.t = +tOf(e.t).toFixed(3); if (e.t1 != null) e.t1 = +tOf(e.t1).toFixed(3); }
  return ev.filter(e => e.t <= DUR_T).sort((a, b) => a.t - b.t);
}

// ---------------------------------------------------------------- boot
const fontList = ['400 20px Inter', '500 20px Inter', '600 20px Inter', '700 20px Inter', '800 20px Inter', '500 20px NotoSC', '600 20px NotoSC', '700 20px NotoSC', '800 20px NotoSC'];
Promise.all(fontList.map(f => document.fonts.load(f, f.includes('Noto') ? '地铁' : 'A1'))).then(() => document.fonts.ready).then(() => {
  plane = window.makePlane(glC, paperTexture());
  placeLabels();
  DATA.init({ PATHS, SNODE, PH, LINE, pointAt, project, W, F, meas, basis, toScreen });
  window.EV = events();
  render(0);
  window.READY = true;
});
