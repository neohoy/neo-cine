// 两条线，一天 · 成片
// 一张真实的列车运行图：横向是当天的时间，竖向是线路的真实里程。科隆在中间，往上是莱茵河谷线（221 公里），
// 往下是高速新线（180 公里）——两条线在法兰克福相交，这张图就是把这个环从法兰克福剪开、摊平。
// 每趟车是一道墨线，斜率就是速度。数据：data/graph.json（tools/prep.py 由 GTFS 和 OSM 生成）。
// 画面是时间的函数：钟（当天分钟）和镜头都由 timeline.js 的关键帧插值出来。
import { clamp, lerp, seg, ss, eo, monotone, track } from '/core/lib.js';
import { C, rgba, makeFilm, inkLine, wet, nib, ruler, pencil, leader, ring, trackSig, titleBlock } from './draft.js';
import { DUR, CLOCK, CAM, GYB, STRIP, RULER, OVERLAY, RACE, OVERTAKE, NOTES, TITLEBLOCK, SECS } from './timeline.js';

const W = innerWidth, H = innerHeight, SC = W / 1920;
const cv = document.getElementById('c'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
const ZH_ALL = '科隆总站道依茨南波恩机场锡格堡蒙塔包尔林堡法兰克福雷马根安德纳赫布伦茨宾美因莱茵河谷线高速新一天的长途列车与分钟之差都开往曼海姆：到这时刚离开年通按设计每小时同发停后越过只画区域和货不在图上城际站日期星期三数据时刻表地运行条非官方影片无营标志号名点公里摩泽尔兰锡格阿埃姆斯维德珀纳厄河';
await Promise.all(['21px ZQ', '16px BC', '16px BCS', '16px BCI', '16px PM'].map(f => document.fonts.load(f, ZH_ALL + 'Köln Frankfurt 0123456789:')));
const G = await fetch('data/graph.json').then(r => r.json());
const film = g.createPattern(makeFilm(), 'repeat');

// ---------- 版面（1920×1080 的逻辑像素） ----------
const TB = 84;                                   // 顶上的时间刻度条
const COL = 338, GX0 = 352, GX1 = 1888, GY0 = 104;
const STRIPX = 99, LAT = 46;                     // 条带地图：线路的 x，离线 9 公里以内画到 46 像素
const hm = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`;

// ---------- 钟和镜头 ----------
const clockF = monotone(CLOCK);
const camF = track(CAM.map(([t, w, rho, y0, y1]) => [t, [Math.log(w), rho, y0, y1]])), gyF = monotone(GYB);
export const tauOf = (m) => { let a = 0, b = DUR; if (clockF(b) < m) return null; for (let i = 0; i < 40; i++) { const c = (a + b) / 2; if (clockF(c) >= m) b = c; else a = c; } return b; };
let T = 0, m0 = 0, kx = 1, ytop = 0, ky = 1, GY1 = 1000, texts = [];
const sx = m => GX0 + (m - m0) * kx, sy = Y => GY0 + (Y - ytop) * ky;

// ---------- 车站 ----------
const AX = { rhine: { s: -1, ...G.axes.rhine }, hsl: { s: 1, ...G.axes.hsl } };
const MAJOR = new Set(['Köln Hbf', 'Bonn Hbf', 'Koblenz Hbf', 'Mainz Hbf', 'Frankfurt(M) Flughafen Fernbf', 'Frankfurt(Main)Hbf', 'Siegburg/Bonn', 'Montabaur', 'Limburg Süd']);
const STA = [];
for (const [ax, A] of Object.entries(AX)) for (const s of A.stations) {
  if (s.id === 'Köln Hbf' && ax === 'hsl') continue;                                     // 科隆总站两条线共用，只有一条站线
  STA.push({ ...s, ax, Y: A.s * s.km, major: MAJOR.has(s.id), end: s.id === 'Frankfurt(Main)Hbf' || s.id === 'Köln Hbf' });
}
const ENDKM = { rhine: AX.rhine.len, hsl: AX.hsl.len };

// ---------- 列车 ----------
const TR = G.trains.map((t, i) => {
  const s = AX[t.ax].s, P = [];
  for (const [km, a, d] of t.pts) { P.push([a / 60, s * km]); if (d > a) P.push([d / 60, s * km]); }
  return { ...t, i, s, P, a: P[0][0], b: P[P.length - 1][0], ice: t.cls === 'ICE', col: t.cls === 'ICE' ? C.red : C.ink };
});
const race = { ic: TR.find(t => t.line === RACE.ic.line && Math.abs(t.pts[0][2] / 60 - RACE.ic.dep) < .5),
               ice: TR.find(t => t.line === RACE.ice.line && Math.abs(t.pts[0][2] / 60 - RACE.ice.dep) < .5) };
const ovSlow = TR.find(t => t.line === OVERTAKE.slow.line && t.pts.some(p => Math.abs(p[1] / 60 - OVERTAKE.slow.arr) < .5));
// 每小时同一分钟：从科隆总站上高速新线、在 :18/:19 开出的车（08:19 到 22:18 每小时一趟：ICE 78/79，11:18 是 ICE 47）
const HOURLY = TR.filter(t => t.ax === 'hsl' && t.pts[0][0] < .1 && [18, 19].includes(Math.round(t.pts[0][2] / 60) % 60)).map(t => t.pts[0][2] / 60);

// 画到 T 为止的屏幕折线（端点在 T 上，就是丁字尺的工作边）
function upto(P, Tm) {
  const out = [];
  for (let i = 0; i < P.length; i++) {
    if (P[i][0] <= Tm) { out.push([sx(P[i][0]), sy(P[i][1])]); continue; }
    if (i > 0) { const [a, ya] = P[i - 1], [b, yb] = P[i]; const f = (Tm - a) / (b - a || 1); out.push([sx(Tm), sy(ya + (yb - ya) * f)]); }
    break;
  }
  return out;
}
const lw = t => t.ice ? clamp(1.45 + .2 * kx, 1.6, 3.3) : clamp(1.05 + .15 * kx, 1.2, 2.4);

// 进出这条线的短线：沿最后（或最前）一段运动的方向伸出去 18 像素，带一个小箭头
function stub(t, end) {
  const P = t.P, idx = end ? [...P.keys()].reverse() : [...P.keys()];
  let a = null, b = null;
  for (let k = 0; k < idx.length - 1; k++) { const p = P[idx[k]], q = P[idx[k + 1]]; if (p[1] !== q[1]) { a = q; b = p; break; } }
  if (!a) return null;
  const p0 = end ? P[P.length - 1] : P[0];
  let dx = sx(b[0]) - sx(a[0]), dy = sy(b[1]) - sy(a[1]); const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
  if (!end) { dx = -dx; dy = -dy; }
  const x0 = sx(p0[0]), y0 = sy(p0[1]);
  return end ? [[x0, y0], [x0 + dx * 18, y0 + dy * 18]] : [[x0 + dx * 18, y0 + dy * 18], [x0, y0]];
}

// ---------- 条带地图（左栏，屏幕上固定；竖向跟着镜头的里程比例） ----------
// 开场先画真实的地图（两条线在地上的样子），然后从法兰克福剪开、拉直，滑进左栏变成里程轴：e = 0 地图，e = 1 条带。
const latX = n => Math.sign(n) * (7 + (LAT - 7) * Math.pow(Math.min(Math.abs(n), 9) / 9, .65));
const stripXof = (ax, n) => STRIPX + (AX[ax].s < 0 ? -latX(n) : latX(n));   // 河谷线往上走：行进方向的左边在屏幕左边；新线往下走：在右边
const GEO = (() => {                                                        // 地图放在画面中间偏右
  const all = [...AX.rhine.geo, ...AX.hsl.geo]; const xs = all.map(p => p[1]), ys = all.map(p => p[2]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const k = Math.min((1700 - 520) / (x1 - x0), (1000 - 150) / (y1 - y0));
  return { k, mx: (x0 + x1) / 2, my: (y0 + y1) / 2, cx: 1130, cy: 575 };
})();
const geoXY = (x, y) => [GEO.cx + (x - GEO.mx) * GEO.k, GEO.cy - (y - GEO.my) * GEO.k];
function geoAt(ax, s) {                                                     // 轴上第 s 公里在地上的位置
  const P = AX[ax].geo; let i = 0, j = P.length - 1;
  if (s <= P[0][0]) return geoXY(P[0][1], P[0][2]); if (s >= P[j][0]) return geoXY(P[j][1], P[j][2]);
  while (j - i > 1) { const m = (i + j) >> 1; if (P[m][0] <= s) i = m; else j = m; }
  const u = (s - P[i][0]) / (P[j][0] - P[i][0] || 1); return geoXY(lerp(P[i][1], P[j][1], u), lerp(P[i][2], P[j][2], u));
}
let E = 1;                                                                  // 这一帧的拉直程度
// 拉直像捋直一根弯铁丝：从科隆出发，每 1 公里一段，段的方向从地上的方向转到竖直（河谷线朝上、新线朝下），
// 段长从地图比例变到镜头的里程比例，科隆这一端从地图上的位置挪到左栏。中间每一帧都是一条连着的线，不会缠在一起。
const GS = {};                                                              // 每条轴每公里的地理屏幕坐标、方向、段长
for (const [ax, A] of Object.entries(AX)) {
  const n = Math.ceil(A.len), P = [];
  for (let i = 0; i <= n; i++) P.push(geoAt(ax, Math.min(i, A.len)));
  const th = [], L = [];
  for (let i = 0; i < n; i++) { const dx = P[i + 1][0] - P[i][0], dy = P[i + 1][1] - P[i][1]; th.push(Math.atan2(dy, dx)); L.push(Math.hypot(dx, dy)); }
  for (let i = 1; i < th.length; i++) while (th[i] - th[i - 1] > Math.PI) th[i] -= 2 * Math.PI, 0; for (let i = 1; i < th.length; i++) while (th[i] - th[i - 1] < -Math.PI) th[i] += 2 * Math.PI;
  GS[ax] = { P, th, L, n, km: i => Math.min(i, A.len) - Math.min(i - 1, A.len) };
}
const AXP = {};                                                             // 这一帧每条轴每公里的屏幕坐标和切线方向
function bendAxes() {
  for (const [ax, A] of Object.entries(AX)) {
    const G_ = GS[ax], tgt = A.s < 0 ? -Math.PI / 2 : Math.PI / 2, P = [], TH = [];
    let x = lerp(G_.P[0][0], STRIPX, E), y = lerp(G_.P[0][1], sy(0), E); P.push([x, y]);
    // 目标方向：取离地上方向最近的那个等价角，转的时候不绕远
    for (let i = 0; i < G_.n; i++) {
      let d = tgt - G_.th[i]; d = Math.atan2(Math.sin(d), Math.cos(d));
      const th = G_.th[i] + d * E, l = lerp(G_.L[i], ky * G_.km(i + 1), E);
      x += Math.cos(th) * l; y += Math.sin(th) * l; P.push([x, y]); TH.push(th);
    }
    AXP[ax] = { P, TH };
  }
}
function axisPt(ax, s) { const { P } = AXP[ax], i = Math.min(Math.floor(s), P.length - 2), u = s - i; return [lerp(P[i][0], P[i + 1][0], u), lerp(P[i][1], P[i + 1][1], u)]; }
function axisTh(ax, s) { const { TH } = AXP[ax]; return TH[clamp(Math.floor(s), 0, TH.length - 1)]; }
function axisPath(ax, a, b) { const pts = [axisPt(ax, a)]; for (let i = Math.ceil(a); i < b; i++) pts.push(axisPt(ax, i)); pts.push(axisPt(ax, b)); return pts; }
// 河流：在地上它离线路的切向、法向偏移（像素），拉直后变成条带里的横向偏移
const RIV = {};
for (const [ax, A] of Object.entries(AX)) RIV[ax] = A.rivers.map(r => ({ n: r.n, p: r.p.map(([s, n, x, y]) => {
  const G_ = GS[ax], i = clamp(Math.floor(s), 0, G_.n - 1), u = s - i, base = [lerp(G_.P[i][0], G_.P[i + 1][0], u), lerp(G_.P[i][1], G_.P[i + 1][1], u)];
  const q = geoXY(x, y), th = G_.th[i], tx = Math.cos(th), ty = Math.sin(th), dx = q[0] - base[0], dy = q[1] - base[1];
  return { s, dt: dx * tx + dy * ty, dn: dx * -ty + dy * tx, sn: -latX(n) };
}) }));
function riverPt(ax, p) {
  const b = axisPt(ax, p.s), th = axisTh(ax, p.s), tx = Math.cos(th), ty = Math.sin(th);
  const dt = lerp(p.dt, 0, E), dn = lerp(p.dn, p.sn, E);
  return [b[0] + tx * dt - ty * dn, b[1] + ty * dt + tx * dn];
}
function strokePts(pts) { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); }
function drawStrip(f) {
  g.save(); if (E >= 1) { g.beginPath(); g.rect(0, TB, COL, GY1 - TB + 12); g.clip(); }
  g.lineJoin = 'round'; g.lineCap = 'butt';
  for (const [ax, A] of Object.entries(AX)) {
    const kmax = f * A.len;
    // 河：一条浅蓝的带子，两边细线
    for (const r of RIV[ax]) {
      const pts = r.p.filter(p => p.s <= kmax).map(p => riverPt(ax, p)); if (pts.length < 2) continue;
      const wide = r.n === 'Rhein' || r.n === 'Main' || r.n === 'Mosel';
      strokePts(pts); g.lineCap = 'round';
      g.strokeStyle = C.river; g.lineWidth = wide ? 5.5 : 3; g.stroke();
      g.strokeStyle = C.riverFill; g.lineWidth = wide ? 3.6 : 1.4; g.stroke();
    }
    // 线路：黑边、白芯、黑白相间的段（段长按公里算，比例变了也不会在线上滑）；隧道是一道细虚线
    const pxkm = lerp(GEO.k, ky, E), dash = 2.2 * pxkm;
    let k0 = 0; const runs = [];
    for (const [a, b] of A.tunnels) { if (a >= kmax) break; if (a > k0) runs.push([k0, a, 0]); runs.push([a, Math.min(b, kmax), 1]); k0 = Math.min(b, kmax); }
    if (k0 < kmax) runs.push([k0, kmax, 0]);
    g.lineCap = 'butt';
    for (const [a, b, tun] of runs) {
      if (b - a < .05) continue; const pts = axisPath(ax, a, b); strokePts(pts);
      if (tun) { g.setLineDash([3, 3]); g.strokeStyle = C.ink; g.lineWidth = 1.6; g.stroke(); g.setLineDash([]); continue; }
      g.strokeStyle = C.ink; g.lineWidth = 5.4; g.stroke();
      g.strokeStyle = '#f6f7f3'; g.lineWidth = 3.4; g.stroke();
      g.setLineDash([dash, dash]); g.lineDashOffset = -a * pxkm; g.strokeStyle = C.ink; g.stroke(); g.setLineDash([]); g.lineDashOffset = 0;
    }
    // 公里数：每 50 公里一个（拉直以后）
    if (E > .95) {
      g.globalAlpha = (E - .95) * 20; g.font = '13px PM'; g.fillStyle = rgba(C.grid, .95); g.textAlign = 'left'; g.textBaseline = 'middle';
      for (let k = 50; k < kmax; k += 50) { const y = sy(A.s * k); g.fillText(String(k), STRIPX + 12, y); texts.push({ id: `km_${ax}_${k}`, text: String(k), x0: STRIPX + 17, y0: y - 7, x1: STRIPX + 42, y1: y + 7, pass: true }); }
      g.globalAlpha = 1;
    }
    if (f > 0 && f < 1) { const p = axisPt(ax, kmax); nib(g, p[0], p[1], C.ink, .9); }
  }
  // 车站：白框
  for (const s of STA) {
    if (Math.abs(s.Y) > f * ENDKM[s.ax] + .01) continue;
    const [x, y] = axisPt(s.ax, Math.abs(s.Y)), w = s.major ? 11 : 7;
    g.fillStyle = '#f7f8f4'; g.strokeStyle = C.ink; g.lineWidth = s.end ? 1.8 : 1.1;
    g.fillRect(x - w / 2, y - 3, w, 6); g.strokeRect(x - w / 2, y - 3, w, 6);
  }
  g.restore();
}

// 站名：中文一行、德文一行；挤在一起的往开推，用一道细引线连回站线。地图阶段写在站的旁边，拉直时跟着滑进左栏
const DUP = new Set(['hslFrankfurt(Main)Hbf', 'hslFrankfurt(M) Flughafen Fernbf']);   // 地图上两条线在法兰克福重合：这两个名字拉直以后才分出来
function stationLabels(f) {
  const vis = STA.filter(s => s.major && Math.abs(s.Y) <= f * ENDKM[s.ax] + .01).map(s => ({ s, y: sy(s.Y), ly: sy(s.Y), a: f >= 1 ? 1 : clamp((f * ENDKM[s.ax] - Math.abs(s.Y)) / 12 + .15) }));
  vis.sort((a, b) => a.y - b.y);
  const gap = 40, lo = TB + 22, hi = GY1 + 8;
  for (let it = 0; it < 40; it++) {
    for (let i = 1; i < vis.length; i++) { const d = vis[i].ly - vis[i - 1].ly; if (d < gap) { const m = (gap - d) / 2; vis[i].ly += m; vis[i - 1].ly -= m; } }
    for (const v of vis) v.ly = clamp(v.ly, lo, hi);
  }
  g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  for (const v of vis) {
    const { s } = v, dup = DUP.has(s.ax + s.id);
    const a = v.a * (dup ? clamp((E - .5) * 2) : 1); if (a <= 0) continue;
    g.font = '21px ZQ'; const wz = g.measureText(s.zh).width; g.font = '16px BC'; const we = g.measureText(s.en).width; const wl = Math.max(wz, we);
    const gp = axisPt(s.ax, Math.abs(s.Y)), left = s.ax === 'rhine' || s.id === 'Köln Hbf';
    const gx = left ? gp[0] - 14 - wl : gp[0] + 14, gyy = gp[1] + 2;
    const xl = lerp(gx, COL - 10 - wl, ss(E)), yl = lerp(gyy, v.ly, ss(E));
    g.globalAlpha = a;
    if (E > .6) {
      g.globalAlpha = a * (E - .6) / .4;
      g.strokeStyle = rgba(C.ink, .55); g.lineWidth = .9; g.beginPath(); g.moveTo(STRIPX + 8, v.y); g.lineTo(STRIPX + 46, v.y); g.lineTo(STRIPX + 56, v.ly); g.lineTo(STRIPX + 64, v.ly); g.stroke();
      g.beginPath(); g.moveTo(COL - 4, v.ly); g.lineTo(COL + 4, v.y); g.stroke();
      g.globalAlpha = a;
    }
    const halo = (txt, x, y) => { g.strokeStyle = rgba(C.film, .9); g.lineWidth = 5; g.lineJoin = 'round'; g.strokeText(txt, x, y); g.fillText(txt, x, y); };
    g.fillStyle = C.ink; g.font = '21px ZQ'; const xz = lerp(left ? xl + wl - wz : xl, xl + wl - wz, E); halo(s.zh, xz, yl - 1);
    g.fillStyle = rgba(C.ink, .72); g.font = '16px BC'; const xe = lerp(left ? xl + wl - we : xl, xl + wl - we, E); halo(s.en, xe, yl + 16);
    texts.push({ id: (E < 1 ? 'map_' : 'st_') + s.ax + s.id, text: s.zh + ' ' + s.en, x0: xl, y0: yl - 20, x1: xl + wl, y1: yl + 20, ...(E < 1 ? { pass: true } : {}) });   // 地图阶段一直在动，拉直以后才计时
  }
  g.globalAlpha = 1;
  // 次要车站：只在地方够的时候写一个小的德文名（扫一眼的东西，不要求读完）
  if (E < 1) return;
  g.font = '14px BC'; g.fillStyle = rgba(C.ink, .55); g.textAlign = 'right';
  for (const s of STA) {
    if (s.major || Math.abs(s.Y) > f * ENDKM[s.ax]) continue;
    const y = sy(s.Y); if (vis.some(v => Math.abs(v.ly - y) < 28)) continue;
    g.fillText(s.en, COL - 10, y + 5); texts.push({ id: 'mn_' + s.id, text: s.en, x0: COL - 90, y0: y - 8, x1: COL - 10, y1: y + 8, pass: true });
  }
}

// 两半的线名：竖排在最左边
function lineNames(a) {
  if (a <= 0) return;
  g.save(); g.globalAlpha = a;
  for (const [ax, zh, en] of [['rhine', '莱茵河谷线', 'Rhine valley line · 221 km'], ['hsl', '高速新线', 'High-speed line · 180 km']]) {
    const A = AX[ax], yc = (sy(0) + sy(A.s * A.len)) / 2;
    g.fillStyle = C.ink; g.font = '22px ZQ'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const n = zh.length, step = 25;
    [...zh].forEach((ch, i) => g.fillText(ch, 15, yc + (i - (n - 1) / 2) * step - 2));
    g.save(); g.translate(36, yc); g.rotate(-Math.PI / 2); g.font = '15px BC'; g.fillStyle = rgba(C.ink, .7); g.fillText(en, 0, 0); g.restore();
    texts.push({ id: 'ln_' + ax, text: zh + ' ' + en, x0: 4, y0: yc - n * step / 2 - 4, x1: 44, y1: yc + n * step / 2 + 4 });
  }
  g.restore();
}

// ---------- 格子（印好的，非复制蓝） ----------
function drawGrid(ga = 1, sa = 1) {
  const xa = Math.max(GX0, sx(0)), xb = Math.min(GX1, sx(1440));
  g.save(); g.beginPath(); g.rect(GX0, TB, GX1 - GX0, H / SC); g.clip(); g.globalAlpha = ga;
  // 10 分钟线：比例小的时候淡下去
  const a10 = clamp((kx * 10 - 9) / 22) * .3;
  const mA = Math.max(0, Math.floor(m0 / 10) * 10), mB = Math.min(1440, m0 + (GX1 - GX0) / kx + 10);
  g.lineWidth = 1;
  for (let m = mA; m <= mB; m += 10) {
    const x = Math.round(sx(m)) + .5, hour = m % 60 === 0, half = m % 30 === 0;
    const a = hour ? .62 : half ? Math.max(a10 * 1.5, .16) : a10; if (a <= .01) continue;
    g.strokeStyle = rgba(C.grid, a); g.lineWidth = hour ? 1.2 : 1;
    if (half && !hour) g.setLineDash([5, 4]); else g.setLineDash([]);
    g.beginPath(); g.moveTo(x, GY0 - 6); g.lineTo(x, GY1 + 6); g.stroke();
  }
  g.setLineDash([]);
  // 站线
  g.globalAlpha = sa;
  for (const s of STA) {
    const y = Math.round(sy(s.Y)) + .5;
    g.strokeStyle = rgba(C.grid, s.end ? .9 : s.major ? .55 : .3); g.lineWidth = s.end ? 1.5 : 1;
    g.beginPath(); g.moveTo(xa, y); g.lineTo(xb, y); g.stroke();
    if (s.id === 'Köln Hbf') { g.beginPath(); g.moveTo(xa, y + 3); g.lineTo(xb, y + 3); g.stroke(); }
  }
  // 图框：0 点和 24 点
  g.globalAlpha = ga; g.strokeStyle = rgba(C.grid, .95); g.lineWidth = 1.6;
  for (const m of [0, 1440]) { const x = sx(m); if (x > GX0 - 2 && x < GX1 + 2) { g.beginPath(); g.moveTo(x, GY0 - 12); g.lineTo(x, GY1 + 12); g.stroke(); } }
  g.restore();
}
// 时间刻度（上下两条）
function drawScales() {
  for (const [y0, y1, top] of [[0, TB, true], [GY1 + 6, H / SC, false]]) {
    g.fillStyle = C.film2; g.fillRect(COL, y0, W / SC - COL, y1 - y0);
    g.fillStyle = film; g.globalAlpha = .05; g.fillRect(COL, y0, W / SC - COL, y1 - y0); g.globalAlpha = 1;
  }
  g.strokeStyle = rgba(C.grid, .9); g.lineWidth = 1;
  g.beginPath(); g.moveTo(COL, TB + .5); g.lineTo(W / SC, TB + .5); g.moveTo(COL, GY1 + 6.5); g.lineTo(W / SC, GY1 + 6.5); g.stroke();
  g.save(); g.beginPath(); g.rect(GX0 - 30, 0, GX1 - GX0 + 60, H / SC); g.clip();
  const mA = Math.max(0, Math.floor(m0 / 10) * 10), mB = Math.min(1440, m0 + (GX1 - GX0) / kx + 10);
  const every = kx * 60 < 34 ? 120 : 60;
  for (let m = mA; m <= mB; m += 10) {
    const x = sx(m), hour = m % 60 === 0;
    g.strokeStyle = rgba(C.grid, hour ? .95 : .55); g.lineWidth = 1;
    const l = hour ? 14 : m % 30 === 0 ? 9 : 5; if (!hour && kx * 10 < 6) continue;
    g.beginPath(); g.moveTo(x, TB - l); g.lineTo(x, TB); g.moveTo(x, GY1 + 6); g.lineTo(x, GY1 + 6 + l); g.stroke();
    if (hour && m % every === 0) {
      const s = String(m / 60).padStart(2, '0');
      g.fillStyle = rgba(C.grid, 1); g.font = '22px PM'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      g.fillText(s, x, TB - 22); g.font = '15px PM'; g.fillText(s, x, GY1 + 38);
      texts.push({ id: 'h' + m, text: s, x0: x - 14, y0: TB - 42, x1: x + 14, y1: TB - 18, pass: true });
    }
  }
  g.restore();
}
// 左栏底色和图例
function drawColumn(f, legendA) {
  if (f <= 0) return;
  g.save(); g.globalAlpha = f;
  g.fillStyle = C.film2; g.fillRect(0, 0, COL, H / SC);
  g.fillStyle = film; g.globalAlpha = .05; g.fillRect(0, 0, COL, H / SC); g.globalAlpha = 1;
  const sh = g.createLinearGradient(COL, 0, COL + 12, 0); sh.addColorStop(0, 'rgba(20,30,36,.12)'); sh.addColorStop(1, 'rgba(20,30,36,0)');
  g.fillStyle = sh; g.fillRect(COL, 0, 12, H / SC);
  g.strokeStyle = rgba(C.grid, .9); g.lineWidth = 1; g.beginPath(); g.moveTo(COL + .5, 0); g.lineTo(COL + .5, H / SC); g.moveTo(0, TB + .5); g.lineTo(COL, TB + .5); g.stroke();
  if (legendA > 0) {                                                                            // 图例：两种墨
    g.save(); g.globalAlpha = legendA;
    inkLine(g, [[22, 30], [64, 30]], 3.2, C.red); inkLine(g, [[22, 60], [64, 60]], 2.2, C.ink);
    g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = C.ink;
    g.font = '19px BCS'; g.fillText('ICE', 76, 31); g.fillText('IC', 76, 61);
    g.font = '19px ZQ'; g.fillText('高速列车', 112, 31); g.fillText('城际列车', 112, 61);
    g.font = '15px BC'; g.fillStyle = rgba(C.ink, .7); g.fillText('high-speed', 194, 31); g.fillText('Intercity', 194, 61);
    texts.push({ id: 'legend', text: 'ICE 高速列车 high-speed / IC 城际列车 Intercity', x0: 18, y0: 18, x1: 270, y1: 72 });
    g.restore();
  }
  g.restore();
}

// ---------- 列车 ----------
// 赛跑那一段：一张半透明的描图纸从左边铺过来，盖住别的车；赛跑的两趟车画在描图纸上面
const RACESET = () => new Set([race.ic, race.ice]);
function overlayX(t) {                                                      // 描图纸的右边缘在哪里（屏幕 x）；没有就是 null
  const { t0, t1, t2, t3 } = OVERLAY; if (t < t0 || t > t3) return null;
  if (t < t1) return lerp(GX0, GX1 + 60, eo(seg(t, t0, t1)));
  if (t < t2) return GX1 + 60; return lerp(GX1 + 60, GX0, ss(seg(t, t2, t3)));
}
function drawTrain(t, heads, detail) {
  if (t.a > T) return;
  let pts = upto(t.P, T); if (pts.length < 1) return;
  if (pts.length === 1) pts.push([pts[0][0] + .01, pts[0][1]]);
  if (pts[pts.length - 1][0] < GX0 - 40 || pts[0][0] > GX1 + 40) return;
  const w = lw(t) * (detail ? 1.15 : 1), done = T >= t.b;
  if (t.from) { const s = stub(t, false); if (s) inkLine(g, s, w * .8, t.col, [false, false]); }
  inkLine(g, pts, w, t.col, [!t.from, done && !t.to]);
  if (done && t.to) { const s = stub(t, true); if (s) { inkLine(g, s, w * .8, t.col, [false, false]); arrow(s, t.col, w); if (detail) dest(t, s); } }
  const wetP = upto(t.P.filter(p => p[0] >= T - 6), T).filter(p => p[0] >= sx(T - 6) - .5);   // 湿墨：最近 6 分钟画的那一段
  if (!done && wetP.length > 1) wet(g, wetP, w);
  if (!done) heads.push([pts[pts.length - 1], t]);
  if (detail) { digits(t); label(t); }
}
function drawTrains(t) {
  g.save(); g.beginPath(); g.rect(GX0, TB, GX1 - GX0, GY1 - TB + 6); g.clip();
  const heads = [], top = [], ox = overlayX(t), RS = RACESET(), detail = kx > 5.5;
  for (const tr of TR) if (!(ox != null && RS.has(tr))) drawTrain(tr, heads, false);
  if (ox != null) {                                                         // 描图纸：薄膜色、半透明，右边有一道纸边
    g.fillStyle = rgba(C.film, .74); g.fillRect(GX0, TB, ox - GX0, GY1 - TB + 6);
    g.fillStyle = 'rgba(30,40,46,.08)'; g.fillRect(ox, TB, 6, GY1 - TB + 6);
    g.fillStyle = rgba(C.grid, .35); g.fillRect(ox - 1, TB, 1, GY1 - TB + 6);
    for (const [p, tr] of heads.splice(0)) under.push([p, tr]);
    for (const tr of RS) drawTrain(tr, top, detail);
  }
  g.restore();
  return [...heads, ...top];
}
const under = [];
function arrow(s, col, w) {
  const [[x0, y0], [x1, y1]] = s, a = Math.atan2(y1 - y0, x1 - x0), L = 5 + w;
  g.fillStyle = col; g.beginPath(); g.moveTo(x1 + Math.cos(a) * 2, y1 + Math.sin(a) * 2);
  g.lineTo(x1 - Math.cos(a - .5) * L, y1 - Math.sin(a - .5) * L); g.lineTo(x1 - Math.cos(a + .5) * L, y1 - Math.sin(a + .5) * L); g.fill();
}
function dest(t, s) {
  const [, [x1, y1]] = s, txt = `${t.to.replace(/\(.*?\)|Hbf|Hauptbahnhof/g, '').trim()} ${hm(t.toT / 60)}`;
  g.font = '15px BC'; g.fillStyle = rgba(t.col, .9); g.textAlign = 'left'; g.textBaseline = 'middle';
  const up = y1 < s[0][1]; g.fillText(txt, x1 + 4, y1 + (up ? -8 : 8));
  texts.push({ id: 'd' + t.i, text: txt, x0: x1, y0: y1 - 16, x1: x1 + 120, y1: y1 + 16, pass: true });
}
// 分钟数字：写在车线和站线的锐角里（只写时刻表公布了的时刻）
function digits(t) {
  g.font = '15px BC'; g.fillStyle = rgba(t.col, .95); g.textBaseline = 'alphabetic';
  const P = t.P;
  for (let i = 0; i < P.length; i++) {
    const [m, Y] = P[i]; if (m > T) break;
    const x = sx(m), y = sy(Y); if (x < GX0 - 20 || x > GX1 + 20) continue;
    const prev = P[i - 1], next = P[i + 1];
    const s = String(Math.round(m) % 60).padStart(2, '0');
    if (next && next[1] !== Y && next[0] <= T + 999) {                                        // 出发：线往下走写在右下，往上走写在右上
      const down = next[1] > Y; g.textAlign = 'left'; g.fillText(s, x + (down ? 10 : 6), down ? y + 16 : y - 6);
    }
    if (prev && prev[1] !== Y) { const down = prev[1] < Y; g.textAlign = 'right'; g.fillText(s, x - 5, down ? y - 5 : y + 15); }
  }
}
// 车次名：沿着最长的一段写
function label(t) {
  const P = t.P; let best = null, bl = 0;
  for (let i = 0; i < P.length - 1; i++) { if (P[i + 1][0] > T || P[i][1] === P[i + 1][1]) continue; const x0 = sx(P[i][0]), y0 = sy(P[i][1]), x1 = sx(P[i + 1][0]), y1 = sy(P[i + 1][1]); const L = Math.hypot(x1 - x0, y1 - y0); if (L > bl) { bl = L; best = [x0, y0, x1, y1]; } }
  if (!best || bl < 150) return;
  const [x0, y0, x1, y1] = best; let a = Math.atan2(y1 - y0, x1 - x0); if (a > Math.PI / 2) a -= Math.PI; if (a < -Math.PI / 2) a += Math.PI;
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  g.save(); g.translate(mx, my); g.rotate(a); g.font = '16px BCS'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.strokeStyle = rgba(C.film, .9); g.lineWidth = 4; g.strokeText(t.line, 0, -6); g.fillStyle = t.col; g.fillText(t.line, 0, -6); g.restore();
  texts.push({ id: 'l' + t.i, text: t.line, x0: mx - 30, y0: my - 20, x1: mx + 30, y1: my + 4, pass: true });
}

// ---------- 批注 ----------
const NOTE = Object.fromEntries(NOTES.map(n => [n.id, n]));
function noteA(n, t) { return Math.min(seg(t, n.t0, n.t0 + .25), 1 - seg(t, n.t1 - .3, n.t1)); }
function writeNote(n, t, x, y, o = {}) {
  const a = noteA(n, t); if (a <= 0) return null;
  const rv = eo(seg(t, n.t0, n.t0 + .55));
  const box = pencil(g, n.zh, n.en, x, y, { ...o, alpha: a, reveal: rv });
  if (t < n.t1 - .3) texts.push({ id: 'n_' + n.id, text: n.zh + ' / ' + n.en, ...box });
  return box;
}
function drawNotes(t, rx) {
  // 标题：清晨那一段，写在左上
  { const n = NOTE.title; writeNote(n, t, rx + 66, sy(-196), { fz: 32, fe: 24 }); }
  // 赛跑：写在丁字尺右边（还没画到的空白里），圈出科隆的两个发车，引线指过去
  { const n = NOTE.race; const a = noteA(n, t); if (a > 0) {
      const x = rx + 70, y = sy(-182);
      writeNote(n, t, x, y, { fz: 30, fe: 23 });
      const kc = seg(t, n.t0 + .5, n.t0 + 1.2), fx = sx(RACE.ic.dep + .5), fy = sy(0);
      ring(g, fx, fy, 30, 18, kc, a);
      leader(g, x - 10, y + 30, fx + 24, fy - 18, a * clamp(kc * 2), kc);
  } }
  // 判决：两条批注写在丁字尺右边的空白里，引线指回两支笔
  for (const [id, tip] of [['ice', [RACE.arrive, 168.2]], ['ic', [RACE.arrive, -race.ic.s * -92.47]]]) {
    const n = NOTE[id]; const a = noteA(n, t); if (a <= 0) continue;
    const yN = id === 'ice' ? sy(132) : sy(-62), x = rx + 70;
    const box = writeNote(n, t, x, yN, { fz: 28, fe: 22 });
    const kc = seg(t, n.t0 + .3, n.t0 + .8);
    leader(g, x - 8, yN - 8, sx(tip[0]) + 6, sy(tip[1]) + (id === 'ice' ? -4 : 4), a, kc);
  }
  // 高速新线：写在新线这一半的空白（丁字尺右边）
  { const n = NOTE.hsl2002; writeNote(n, t, rx + 60, sy(70), { fz: 27, fe: 21 }); }
  // 钟面：科隆总站 :18/:19 开出的车，每一趟一个铅笔小圈
  { const n = NOTE.clock; const a = noteA(n, t); if (a > 0) {
      HOURLY.forEach((m, i) => { if (m > T) return; const k = seg(t, n.t0 + .2 + i * .12, n.t0 + .6 + i * .12); ring(g, sx(m) + 4, sy(0) + 9, 13, 10, k, a); });
      writeNote(n, t, rx + 60, sy(-40), { fz: 27, fe: 21 });
  } }
  // 林堡南的越行
  { const n = NOTE.limburg; const a = noteA(n, t); if (a > 0 && ovSlow) {
      const p = ovSlow.P.find(p => Math.abs(p[0] - OVERTAKE.slow.arr) < .5), cx = sx(p[0] + 3), cy = sy(p[1]);
      ring(g, cx, cy, 30, 22, seg(t, n.t0, n.t0 + .5), a); ring(g, cx, cy, 31, 23, seg(t, n.t0 + .1, n.t0 + .6), a * .6);
      const x = cx - 360, y = sy(-140);
      writeNote(n, t, x, y, { fz: 27, fe: 21 });
      leader(g, x + 200, y + 36, cx - 6, cy - 16, a, seg(t, n.t0 + .3, n.t0 + .9));
  } }
}

// ---------- 图签（片尾） ----------
const NTR = { all: TR.length, hsl: TR.filter(t => t.ax === 'hsl').length, rhine: TR.filter(t => t.ax === 'rhine').length };
function drawTitleBlock(t) {
  const t0 = TITLEBLOCK.t0; if (t < t0) return;
  const a = seg(t, t0, t0 + .4), x = 1024, y = GY1 + 46, w = GX1 - x, h = 1034 - y, yd = y + 62;   // 图签底边离画面底 46 像素，最后一行字离底 58 像素
  g.save(); g.globalAlpha = a; g.fillStyle = rgba(C.film, .96); g.fillRect(x, y, w, h); titleBlock(g, x, y, w, h, [.13, .87]);
  g.strokeStyle = rgba(C.grid, .85); g.lineWidth = .9; g.beginPath(); g.moveTo(x, yd); g.lineTo(x + w, yd); g.stroke();
  g.restore();
  const cell = (i, zh, en, cx, cy, fz, fe, pass) => {
    const tt = t0 + .3 + i * TITLEBLOCK.step; if (t < tt) return;
    const rv = eo(seg(t, tt, tt + .5));
    g.save(); g.beginPath(); g.rect(cx - 4, cy - fz - 6, 820 * rv, fz + fe + 22); g.clip();
    g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = C.ink;
    g.font = `${fz}px ZQ`; g.fillText(zh, cx, cy); const wz = g.measureText(zh).width;
    g.font = `${fe}px BC`; g.fillStyle = rgba(C.ink, .75); g.fillText(en, cx, cy + fe + 4); const we = g.measureText(en).width;
    g.restore();
    texts.push({ id: 'tb' + i, text: zh + ' / ' + en, x0: cx - 2, y0: cy - fz, x1: cx + Math.max(wz, we) + 2, y1: cy + fe + 8, ...(pass ? { pass: true } : {}) });
  };
  const lab = (zh, en, cy) => { g.save(); g.globalAlpha = a; g.font = '16px ZQ'; g.fillStyle = rgba(C.grid, 1); g.textAlign = 'left'; g.fillText(zh, x + 12, cy); g.font = '13px BC'; g.fillText(en, x + 12, cy + 16); g.restore(); };
  lab('图名', 'Title', y + 32); lab('数据', 'Data', yd + 24);
  cell(0, '列车运行图 · 科隆—法兰克福 · 2026 年 11 月 18 日 星期三', 'Train graph · Köln – Frankfurt · Wednesday 18 November 2026', x + w * .13 + 14, y + 32, 24, 18);
  cell(1, `这一天 ${NTR.all} 条运行线：新线 ${NTR.hsl}，河谷 ${NTR.rhine}`, `${NTR.all} train paths: ${NTR.hsl} high-speed line, ${NTR.rhine} Rhine valley`, x + w * .13 + 14, yd + 24, 19, 15);
  cell(2, 'NEO-Cine · 列车运行图', 'NEO-Cine · Train Graph', x + w * .13 + 14, yd + 64, 15, 13, true);
}

// ---------- 一帧 ----------
window.render = (t) => {
  t = clamp(t, 0, DUR); texts = []; T = clockF(t);
  const [lwid, rho, y0, y1] = camF(t), w = Math.exp(lwid), gy1 = gyF(t);
  m0 = T - rho * w; kx = (GX1 - GX0) / w; ytop = y0; GY1 = gy1; ky = (GY1 - GY0) / (y1 - y0);
  g.setTransform(SC, 0, 0, SC, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  g.fillStyle = C.film; g.fillRect(0, 0, 1920, 1080);
  g.fillStyle = film; g.globalAlpha = .06; g.fillRect(0, 0, 1920, 1080); g.globalAlpha = 1;
  { const e = ss(seg(t, STRIP.m0, STRIP.m1)); drawGrid(lerp(.45, 1, e), e); }
  under.length = 0; const heads = t >= RULER.t0 ? drawTrains(t) : [];
  const ra = ss(seg(t, RULER.t0, RULER.t1)) * (1 - ss(seg(t, 46.2, 47.2))), rx = sx(T);
  drawNotes(t, rx);
  ruler(g, rx, TB - 4, GY1 + 6, ra);
  for (const [p, tr] of heads) if (p[0] > GX0 - 10 && p[0] < GX1 + 10) nib(g, p[0], p[1], tr.col, ra);
  for (const [p, tr] of under) if (p[0] > GX0 - 10 && p[0] < GX1 + 10) nib(g, p[0], p[1], tr.col, ra * .45);
  drawScales();
  // 钟：挂在丁字尺头上的一块牌子
  if (ra > 0) {
    g.save(); g.globalAlpha = ra; const s = hm(T);
    g.fillStyle = C.ink; g.beginPath(); g.roundRect(rx - 58, 8, 116, 44, 4); g.fill();
    g.beginPath(); g.moveTo(rx - 7, 52); g.lineTo(rx + 7, 52); g.lineTo(rx, 60); g.fill();
    g.fillStyle = C.film; g.font = '30px PM'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, rx, 31);
    texts.push({ id: 'clock', text: s, x0: rx - 58, y0: 8, x1: rx + 58, y1: 52, pass: true });
    g.restore();
  }
  const f = ss(seg(t, STRIP.t0, STRIP.t1)); E = ss(seg(t, STRIP.m0, STRIP.m1)); bendAxes();
  drawColumn(E, seg(t, 4.2, 4.7));
  drawStrip(f); stationLabels(f); lineNames(seg(t, STRIP.m1 - .3, STRIP.m1 + .3));
  drawTitleBlock(t);
  { const n = NOTE.only; writeNote(n, t, GX0 + 6, GY1 + 104, { fz: 23, fe: 19 }); }
  // 暗角：很轻
  const vg = g.createRadialGradient(960, 540, 520, 960, 540, 1180); vg.addColorStop(0, 'rgba(30,40,46,0)'); vg.addColorStop(1, 'rgba(30,40,46,.1)');
  g.fillStyle = vg; g.fillRect(0, 0, 1920, 1080);
  for (const x of texts) { x.x0 *= SC; x.x1 *= SC; x.y0 *= SC; x.y1 *= SC; }
};
window.TEXTS = (t) => { window.render(t); return texts; };
window.DUR = DUR;

// ---------- 声音事件：全部从时间线和时刻表推出来 ----------
const EV = [], ev = (type, t, o = {}) => { if (t != null && t >= 0 && t <= DUR) EV.push({ type, t: +t.toFixed(3), ...o }); };
for (const s of SECS) ev('sec', s.t, { id: s.id });
ev('strip', STRIP.t0, { d: STRIP.t1 - STRIP.t0 }); ev('ruler', RULER.t0, { d: RULER.t1 - RULER.t0 });
for (const t of TR) {                                                      // 每趟车起笔一个音、收笔一下
  const m = t.from ? t.a : t.pts[0][2] / 60;
  if (m >= CLOCK[1][1] && m <= 1440) ev('dep', tauOf(m), { ax: t.ax, cls: t.cls, min: Math.round(m) % 60, line: t.line });
  if (t.b >= CLOCK[1][1] && t.b <= 1440) ev('arr', tauOf(t.b), { ax: t.ax, cls: t.cls });
}
ev('race', tauOf(RACE.ic.dep)); ev('raceIce', tauOf(RACE.ice.dep)); ev('arrive', tauOf(RACE.arrive));
for (const [k, tr] of [['ic', race.ic], ['ice', race.ice]]) {               // 赛跑：每过 10 公里一下（轨道声）
  const P = tr.P; for (let km = 10; km < 170; km += 10) {
    for (let i = 0; i < P.length - 1; i++) { const a = Math.abs(P[i][1]), b = Math.abs(P[i + 1][1]); if (a < km && km <= b) { const m = P[i][0] + (P[i + 1][0] - P[i][0]) * (km - a) / (b - a); if (m <= RACE.arrive) ev('clack', tauOf(m), { who: k, km }); } }
  }
}
if (ovSlow) { const p = ovSlow.P.find(p => Math.abs(p[0] - OVERTAKE.slow.arr) < .5); ev('overtake', tauOf(p[0] + 3)); }
for (const n of NOTES) if (n.kind !== 'line') ev('write', n.t0, { id: n.id, d: .55 });
for (let i = 0; i < 3; i++) ev('tb', TITLEBLOCK.t0 + .3 + i * TITLEBLOCK.step, { i });
EV.sort((a, b) => a.t - b.t); window.EV = EV;
window.render(0); window.READY = true;
