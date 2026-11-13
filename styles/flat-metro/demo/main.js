// 凌晨一点半 · 成片
// 维也纳地铁五条线，画成平涂的八方向线网：线是从真实的轨道走向里被"拉"出来、收紧成 0/45/90 度的；列车是按 Wiener Linien
// 时刻表（GTFS）推算出的位置在线上滑行、减速进站。周四夜里末班车开回终点，线一条条退向底色；二十四小时后的周五夜里，
// 一点半，线还亮着，车还在开。数据：data/net.json（tools/prep.py 由 OSM 和 GTFS 生成）。
// 画面是时间的函数：钟（分钟）和镜头都由 timeline.js 的关键帧插值出来；任何一帧都可以单独渲染。
import { clamp, lerp, seg, ss, eio, eo, back, monotone, track } from '/core/lib.js';
import { hex, mix, css, sky, theme, restColour, trainColour, stroke, hole, knot, train, text, digits, ZH, EN } from './flat.js';
import { DUR, BEAT, bar, CLOCK, CAM, DRAW, FOLLOW, LAG, PASS, TRAIN_FAST, CAPS, END, SECS } from './timeline.js';

const W = innerWidth, H = innerHeight, SC = W / 1920;
const cv = document.getElementById('c'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
const N = await fetch('data/net.json').then(r => r.json());
const ZH_ALL = CAPS.map(c => c.zh + (c.sub ? c.sub[0] : '')).join('') + '周四五六线上列车凌晨一点半维也纳地铁两个夜晚时刻表计划位置按推算地图非官方粉丝作品极简月日年星期' + '0123456789';
await Promise.all([`500 30px ${ZH}`, `400 16px ${ZH}`, `500 22px ${EN}`, `300 60px ${EN}`, `600 15px ${EN}`].map(f => document.fonts.load(f, ZH_ALL + 'ÄÖÜäöüß Half Past One')));

// ---------- 线网 ----------
const REF = N.lines.map(L => L.ref);
const LINES = N.lines.map(L => {
  const n = L.oct.length / 2, oct = [], geo = [];
  for (let i = 0; i < n; i++) { oct.push([L.oct[2 * i], L.oct[2 * i + 1]]); geo.push([L.geo[2 * i], L.geo[2 * i + 1]]); }
  return { ...L, n, octP: oct, geoP: geo, col: hex(L.colour), nst: L.stations.length };
});
// 弧长 s 处的八方向点和切线角（点按弧长等距）
function atS(L, s) {
  const f = clamp(s / L.len) * (L.n - 1), i = Math.min(L.n - 2, Math.floor(f)), r = f - i;
  const a = L.octP[i], b = L.octP[i + 1];
  return [a[0] + (b[0] - a[0]) * r, a[1] + (b[1] - a[1]) * r, Math.atan2(b[1] - a[1], b[0] - a[0])];
}
const ST = N.stations.map((s, i) => ({ ...s, i, on: [] }));
LINES.forEach((L, li) => L.stations.forEach((si, k) => { const p = atS(L, L.st_s[k]); ST[si].on.push({ li, k, x: p[0], y: p[1] }); }));
for (const s of ST) { s.px = s.on.reduce((a, o) => a + o.x, 0) / s.on.length; s.py = s.on.reduce((a, o) => a + o.y, 0) / s.on.length; s.inter = s.on.length > 1; }
const byName = Object.fromEntries(ST.map(s => [s.n, s]));

// ---------- 镜头 ----------
let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
for (const L of LINES) for (const [x, y] of L.octP) { bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); by0 = Math.min(by0, y); by1 = Math.max(by1, y); }
const MAPC = [700, 548];                                          // 全景时线网中心在画面上的位置（右边留给字）
const K0 = Math.min(1000 / (bx1 - bx0), 900 / (by1 - by0));       // 全景：每米多少像素
const WC = [(bx0 + bx1) / 2, (by0 + by1) / 2];
const camF = track(CAM.map(([t, dx, dy, z]) => [t, [WC[0] + dx, WC[1] + dy, Math.log(z)]]));
let cx = WC[0], cy = WC[1], k = K0, Z = 1;
const sx = x => MAPC[0] + (x - cx) * k, sy = y => MAPC[1] - (y - cy) * k;

// ---------- 钟 ----------
const clockF = monotone(CLOCK);
const speedAt = t => (clockF(t + .02) - clockF(t - .02)) / .04;   // 分钟/秒
export const tauOf = m => { let a = 0, b = DUR; if (clockF(b) < m || clockF(0) > m) return null; for (let i = 0; i < 40; i++) { const c = (a + b) / 2; if (clockF(c) >= m) b = c; else a = c; } return b; };
const hhmm = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`;
const DAYS = [['周四', 'Thursday'], ['周五', 'Friday'], ['周六', 'Saturday']];
// 运营日的"夜里"按 04:00 换日：周四夜里一点半仍然算周四
const dayOf = m => clamp(Math.floor((m - 240) / 1440), 0, 2);

// ---------- 班次 ----------
const TRIPS = N.trips.map(([li, k0, k1, ts, skip]) => {
  const L = LINES[li], dir = k1 > k0 ? 1 : -1, stops = [];
  ts.forEach((tm, j) => { const kk = k0 + j * dir; if (!skip || !skip.includes(kk)) stops.push([tm, L.st_s[kk]]); });
  return { li, a: ts[0], b: ts[ts.length - 1], stops, dir };
});
const DWELL = 20 / 60;                                            // 每站停 20 秒（时刻表只给一个时刻：到站 = 发车 − 20 秒，估计值）
function trainAt(T, m) {
  const S = T.stops;
  if (m <= S[0][0]) return S[0][1];
  for (let i = 0; i < S.length - 1; i++) {
    const [ta, sa] = S[i], [tb, sb] = S[i + 1];
    if (m < tb) { const arr = tb - Math.min(DWELL, .3 * (tb - ta)); return m >= arr ? sb : sa + (sb - sa) * ss((m - ta) / (arr - ta)); }
  }
  return S[S.length - 1][1];
}
const running = (m, li) => TRIPS.reduce((n, T) => n + ((li == null || T.li === li) && T.a <= m && m <= T.b ? 1 : 0), 0);
// 每条线"有车"的程度：前后几分钟里有车在跑的比例（平滑，车停了线才慢慢退色）
const lit = (li, m) => { let n = 0; for (let d = -4; d <= 4; d++) n += N.service[li].some(([a, b]) => a <= m + d && m + d <= b + 1) ? 1 : 0; return n / 9; };
const COUNT130 = running(2970);

// ---------- 拉线 ----------
// 镜头：关键帧，开场再叠上"跟着笔尖"
function camAt(t) {
  const [ccx, ccy, lz] = camF(t), f = 1 - ss(seg(t, FOLLOW.t0, FOLLOW.t1));
  if (f <= 0) return [ccx, ccy, Math.exp(lz)];
  const L = LINES[REF.indexOf(FOLLOW.line)], u = clamp(Math.min(peff(L, t), L.nst - 1) - FOLLOW.behind, 0, L.nst - 1);
  const i = Math.max(0, Math.min(L.n - 1, L.u.findIndex(v => v >= u))), q = L.octP[i];
  return [lerp(ccx, q[0], f), lerp(ccy, q[1], f), Math.exp(lz)];
}
const DRAWF = Object.fromEntries(DRAW.map(([ref, a, b]) => [ref, [a, b]]));
const peff = (L, t) => { const [a, b] = DRAWF[L.ref], x = seg(t, a, b + .9); return (x < .5 ? 2 * x * x : 1 - 2 * (1 - x) * (1 - x)) * (L.nst - 1 + LAG); };   // 二次的缓入缓出：起步比三次的快
const blendU = (p, u) => back(clamp((p - u) / LAG), 1.25);        // 笔尖之后的站距里，从真实走向收紧到八方向（带一点回弹）
function linePts(L, t) {
  const p = peff(L, t), tip = Math.min(p, L.nst - 1), out = [];
  if (p <= 0) return out;
  if (p >= L.nst - 1 + LAG) { for (const q of L.octP) out.push([sx(q[0]), sy(q[1])]); return out; }
  for (let i = 0; i < L.n; i++) {
    const u = L.u[i];
    if (u > tip) {                                                // 笔尖：正好停在 tip 上的一点
      if (i > 0) { const u0 = L.u[i - 1], f = (tip - u0) / ((u - u0) || 1), b = blendU(p, tip);
        const gx = lerp(L.geoP[i - 1][0], L.geoP[i][0], f), gy = lerp(L.geoP[i - 1][1], L.geoP[i][1], f);
        const ox = lerp(L.octP[i - 1][0], L.octP[i][0], f), oy = lerp(L.octP[i - 1][1], L.octP[i][1], f);
        out.push([sx(lerp(gx, ox, b)), sy(lerp(gy, oy, b))]); }
      break;
    }
    const b = blendU(p, u);
    out.push([sx(lerp(L.geoP[i][0], L.octP[i][0], b)), sy(lerp(L.geoP[i][1], L.octP[i][1], b))]);
  }
  return out;
}
// 站孔：这一站在线上收紧之后才打出来
const punchK = (L, k, t) => back(seg(peff(L, t) - k, LAG * .78, LAG * 1.02), 2.2);

// ---------- 站名 ----------
const WIDE_LAB = ['Oberlaa', 'Leopoldau', 'Seestadt', 'Ottakring', 'Simmering', 'Hütteldorf', 'Heiligenstadt', 'Siebenhirten', 'Floridsdorf'];
const NEAR_LAB = ['Stephansplatz', 'Karlsplatz', 'Schwedenplatz', 'Volkstheater', 'Landstraße',
  'Schottentor', 'Schottenring', 'Rathaus', 'Taubstummengasse', 'Kettenbrückengasse', 'Praterstern', 'Rochusgasse', 'Neubaugasse', 'Westbahnhof',
  'Pilgramgasse', 'Zieglergasse', 'Roßauer Lände', 'Südtiroler Platz-Hauptbahnhof', 'Messe-Prater', 'Taborstraße', 'Kardinal-Nagl-Platz', 'Margaretengürtel'];
// 摆字：八个方向里选一个不压线、不压别的字的位置（在这个比例尺下算一次）
function placeLabels(names, kk, size) {
  const pts = [];
  for (const L of LINES) for (let i = 0; i < L.n; i += 2) pts.push([L.octP[i][0] * kk, -L.octP[i][1] * kk]);
  const boxes = [], out = [];
  g.font = `600 ${size}px ${EN}`;
  for (const n of names) {
    const s = byName[n]; if (!s) continue;
    const X = s.px * kk, Y = -s.py * kk, w = g.measureText(n).width, h = size * .78, gap = size * .75 + 4;
    let best = null;
    const cands = [[1, 0, 'l', 0], [-1, 0, 'r', 0], [.72, -.72, 'l', 1], [-.72, -.72, 'r', 1], [.72, .72, 'l', 1], [-.72, .72, 'r', 1], [0, -1, 'c', 2], [0, 1, 'c', 2]];
    for (const [dx0, dy0, al, pref0] of [...cands, ...cands.map(([a, b, c, p]) => [a * 1.8, b * 1.8, c, p + 3])]) {
      const dx = dx0, dy = dy0, pref = pref0;
      const ax = X + dx * gap, ay = Y + dy * gap + h * .5;
      const x0 = al === 'l' ? ax : al === 'r' ? ax - w : ax - w / 2, y0 = ay - h - (dy > 0 ? -h * .3 : dy < 0 ? h * .3 : 0);
      const b = [x0 - 3, y0 - 3, x0 + w + 3, y0 + h + 3];
      let cost = pref * 2;
      for (const p of pts) if (p[0] > b[0] && p[0] < b[2] && p[1] > b[1] && p[1] < b[3]) cost += 10;
      for (const q of boxes) if (!(b[2] < q[0] || b[0] > q[2] || b[3] < q[1] || b[1] > q[3])) cost += 100;
      if (!best || cost < best.cost) best = { cost, b, al, ax, ay, dx, dy };
    }
    boxes.push(best.b); out.push({ n, s, ...best, w, h });
  }
  return out;
}
const LAB_W = placeLabels(WIDE_LAB, K0, 15), LAB_N = placeLabels(NEAR_LAB, K0 * 2.8, 16);

// ---------- 底：平涂，按太阳走（"一天过去"时沿 45° 方向扫过去） ----------
let TH = theme(sky(1400));
function ground(t, m) {
  const span = 240 * Math.sin(Math.PI * seg(t, PASS.t0, PASS.t1));      // 扫过时，画面左下到右上差几分钟
  TH = theme(sky(m));
  if (span < 1) { g.fillStyle = css(TH.ground); g.fillRect(0, 0, 1920, 1080); return null; }
  const gr = g.createLinearGradient(0, 1080, 1500, -420);              // 45°：左下到右上
  for (let i = 0; i <= 24; i++) gr.addColorStop(i / 24, css(sky(m + (i / 24 - .5) * span)));
  g.fillStyle = gr; g.fillRect(0, 0, 1920, 1080); return gr;
}
function fields(grd) {
  const poly = (rings) => { g.beginPath(); for (const r of rings) { g.moveTo(sx(r[0]), sy(r[1])); for (let j = 2; j < r.length; j += 2) g.lineTo(sx(r[j]), sy(r[j + 1])); g.closePath(); } };
  // 水和绿地是底色上的一层薄色（扫过时跟着底色走）
  g.save(); g.globalAlpha = .1 + .1 * TH.day; g.fillStyle = '#7fa66a';
  for (const w of N.green) { poly(w); g.fill('evenodd'); }
  g.globalAlpha = TH.day > .5 ? .34 : .3; g.fillStyle = TH.day > .5 ? '#5d95bb' : '#4f86b0';
  for (const w of N.water) { poly(w); g.fill('evenodd'); }
  g.restore();
}

// ---------- 字幕 ----------
let texts = [];
const COL_X = 1330, COL_R = 1872;
function caption(c, t) {
  const fi = .4, fo = .35, a = Math.min(seg(t, c.t0, c.t0 + fi), 1 - seg(t, c.t1 - fo, c.t1));
  if (a <= 0) return;
  const zh = c.zh.replace('{n}', COUNT130), en = c.en.replace('{n}', COUNT130);
  const rise = (1 - eo(seg(t, c.t0, c.t0 + .6))) * 14;
  g.save(); g.globalAlpha = a;
  if (c.kind === 'title') {
    const y = 470 + rise;
    text(g, zh, COL_X, y, `500 64px ${ZH}`, css(TH.ink));
    text(g, en, COL_X, y + 50, `300 36px ${EN}`, css(TH.ink));
    g.fillStyle = css(TH.mute); g.fillRect(COL_X, y + 82, 36, 3);
    text(g, c.sub[0], COL_X, y + 128, `400 26px ${ZH}`, css(TH.mute));
    text(g, c.sub[1], COL_X, y + 162, `500 21px ${EN}`, css(TH.mute));
    if (a >= .999) { texts.push({ id: c.id + '-zh', text: zh, ...box(COL_X, y - 58, 360, 72) }, { id: c.id + '-en', text: en, ...box(COL_X, y + 18, 300, 40) },
      { id: c.id + '-s0', text: c.sub[0], ...box(COL_X, y + 104, 330, 32) }, { id: c.id + '-s1', text: c.sub[1], ...box(COL_X, y + 144, 330, 26) }); }
  } else {
    const y = 820 + rise, big = c.kind === 'verdict';
    g.fillStyle = css(big ? TH.ink : TH.mute); g.fillRect(COL_X, y - 52, big ? 36 : 24, 3);
    let fz = big ? 32 : 30, fe = 22;
    g.font = `500 ${fz}px ${ZH}`; while (g.measureText(zh).width > COL_R - COL_X && fz > 26) { fz--; g.font = `500 ${fz}px ${ZH}`; }
    g.font = `500 ${fe}px ${EN}`; while (g.measureText(en).width > COL_R - COL_X && fe > 19) { fe -= .5; g.font = `500 ${fe}px ${EN}`; }
    const wz = text(g, zh, COL_X, y, `500 ${fz}px ${ZH}`, css(TH.ink));
    const we = text(g, en, COL_X, y + 36, `500 ${fe}px ${EN}`, css(mix(TH.ink, TH.ground, .18)));
    if (a >= .999) texts.push({ id: c.id + '-zh', text: zh, ...box(COL_X, y - fz, wz, fz * 1.25) }, { id: c.id + '-en', text: en, ...box(COL_X, y + 36 - fe, we, fe * 1.3) });
  }
  g.restore();
}
const box = (x, y, w, h) => ({ x0: x, y0: y, x1: x + w, y1: y + h });

// ---------- 钟（右上） ----------
function hud(t, m, a) {
  if (a <= 0) return;
  g.save(); g.globalAlpha = a;
  const d = DAYS[dayOf(m)], x = COL_X, y = 120;
  text(g, d[0], x, y, `500 26px ${ZH}`, css(TH.ink)); const w0 = g.measureText(d[0]).width;
  text(g, d[1], x + w0 + 12, y, `500 20px ${EN}`, css(TH.mute));
  digits(g, hhmm(m), x - 4, y + 84, 84, css(TH.ink));
  const n = running(m), fast = speedAt(t) > TRAIN_FAST;
  text(g, '线上列车', x, y + 132, `400 19px ${ZH}`, css(TH.mute)); const w1 = g.measureText('线上列车').width;
  text(g, 'trains running', x + w1 + 10, y + 132, `500 16px ${EN}`, css(TH.mute));
  g.globalAlpha = a * (1 - ss(seg(speedAt(t), TRAIN_FAST * .6, TRAIN_FAST))); digits(g, String(n), x + w1 + 10 + 128, y + 134, 30, css(TH.ink), .6);
  g.restore();
  texts.push({ id: 'clock', text: d[0] + hhmm(m) + n, ...box(x, y - 26, 400, 150), pass: true });
}

// ---------- 片尾卡 ----------
function endCard(t) {
  const a = ss(seg(t, END.t0, END.t0 + .8)); if (a <= 0) return;
  g.save(); g.globalAlpha = a;
  const x = COL_X, y = 470;
  text(g, '凌晨一点半', x, y, `500 64px ${ZH}`, css(TH.ink)); text(g, 'Half Past One', x, y + 50, `300 36px ${EN}`, css(TH.ink));
  g.fillStyle = css(TH.mute); g.fillRect(x, y + 82, 36, 3);
  const fine = [
    ['维也纳地铁 2026 年 11 月 19—21 日的计划时刻；列车位置按时刻表推算', 'Vienna U-Bahn, scheduled times 19–21 Nov 2026; train positions estimated'],
    ['时刻表 Wiener Linien GTFS（data.gv.at）CC BY 4.0', 'Timetable: Wiener Linien GTFS (data.gv.at), CC BY 4.0'],
    ['地图 © OpenStreetMap contributors，ODbL 1.0', 'Map data © OpenStreetMap contributors, ODbL 1.0'],
    ['非官方粉丝作品，与运营方无关', 'Unofficial fan film, not affiliated with the operator'],
    ['NEO-Cine · 极简地铁', 'NEO-Cine · Flat Metro'],
  ];
  let yy = y + 128;
  fine.forEach(([zh, en], i) => {
    const wz = text(g, zh, x, yy, `400 17px ${ZH}`, css(TH.ink)); const we = text(g, en, x, yy + 22, `500 14px ${EN}`, css(TH.mute));
    texts.push({ id: 'fine' + i, text: zh + ' ' + en, ...box(x, yy - 17, Math.max(wz, we), 44), pass: true });
    yy += 58;
  });
  g.restore();
  if (a >= .999) texts.push({ id: 'end-zh', text: '凌晨一点半', ...box(x, y - 58, 330, 72) }, { id: 'end-en', text: 'Half Past One', ...box(x, y + 18, 280, 40) });
}

// ---------- 一帧 ----------
window.render = (t) => {
  t = clamp(t, 0, DUR); texts = [];
  const m = clockF(t), sp = speedAt(t);
  [cx, cy, Z] = camAt(t); k = K0 * Z;
  g.setTransform(SC, 0, 0, SC, 0, 0); g.globalAlpha = 1;
  const grd = ground(t, m); fields(grd);
  const hf = grd || css(TH.ground);                                // 站孔露出的底色（扫过时也对得上）
  const w = 7.6 * Math.pow(Z, .55);                                // 线宽（像素）：放大时略微变粗
  // 真实轨道（OSM）：拉线的时候先露出一条细虚线，笔尖沿着它走，线在身后收紧成八方向
  for (const L of LINES) {
    const [a, b] = DRAWF[L.ref], ga = Math.min(ss(seg(t, a - .5, a + .2)), 1 - ss(seg(t, b + .2, b + 1.0)));
    if (ga <= 0) continue;
    g.save(); g.globalAlpha = ga * .75; g.setLineDash([2.5, 6]); g.lineCap = 'round';
    stroke(g, L.geoP.filter((_, i) => i % 2 === 0).map(q => [sx(q[0]), sy(q[1])]), 2, css(TH.mute)); g.restore();
  }
  // 线：先画没车的（退色），再画有车的
  const state = LINES.map((L, li) => ({ L, li, dim: 1 - lit(li, m) * 1, pts: linePts(L, t) }));
  for (const s of [...state].sort((a, b) => b.dim - a.dim)) stroke(g, s.pts, w, css(restColour(s.L.col, TH, s.dim)));
  // 拉线的笔尖：一粒墨点，像手指捏着线头
  for (const s of state) {
    const [a, b] = DRAWF[s.L.ref], p = peff(s.L, t), k1 = Math.min(ss(seg(t, a - .3, a)), 1 - ss(seg(p, s.L.nst - 1 - .3, s.L.nst - 1 + .4)));
    if (k1 <= 0) continue;
    const q = s.pts.length ? s.pts[s.pts.length - 1] : (() => { const g0 = s.L.geoP[0]; return [sx(g0[0]), sy(g0[1])]; })();
    g.beginPath(); g.arc(q[0], q[1], .5 * w * k1, 0, 7); g.fillStyle = css(TH.ink); g.fill();
  }
  // 站
  for (const s of ST) {
    const ks = s.on.map(o => punchK(LINES[o.li], o.k, t)); const kk = Math.min(...ks);
    if (s.inter) knot(g, sx(s.px), sy(s.py), w, kk, hf, css(TH.ink));
    else hole(g, sx(s.on[0].x), sy(s.on[0].y), w, kk, hf);
  }
  // 列车
  const va = 1 - ss(seg(sp, TRAIN_FAST * .6, TRAIN_FAST));
  const LDONE = LINES.map(L => ss(seg(peff(L, t), L.nst - 1 + LAG * .6, L.nst - 1 + LAG)));   // 线收紧完了才有车
  if (va > 0) {
    const fadeM = Math.max(.6, .35 * sp);                          // 进出场的淡入淡出：按钟速换算成影片里约 0.35 秒
    for (const T of TRIPS) {
      if (m < T.a - fadeM || m > T.b + fadeM) continue;
      const L = LINES[T.li], s = trainAt(T, m), [x, y, ang] = atS(L, s);
      const a = va * LDONE[T.li] * Math.min(ss((m - T.a + fadeM) / fadeM), ss((T.b + fadeM - m) / fadeM));
      const as = -ang + (T.dir < 0 ? Math.PI : 0), off = .38 * w;   // 屏幕上的行进方向；往行进方向的右手边让一点，对开的车不重叠
      train(g, sx(x) - Math.sin(as) * off, sy(y) + Math.cos(as) * off, as, w, css(trainColour(L.col, TH)), hf, a);
    }
  }
  // 站名：全景一组、内城一组，按放大倍数换
  const done = Math.min(...LINES.map(L => seg(peff(L, t), L.nst - 1 + LAG * .7, L.nst - 1 + LAG)));
  const aw = done * (1 - ss(seg(Z, 1.2, 1.55))), an = done * ss(seg(Z, 2.0, 2.5));
  for (const [set, a, kk, size] of [[LAB_W, aw, K0, 15], [LAB_N, an, K0 * 2.8, 16]]) {
    if (a <= 0) continue;
    g.save(); g.globalAlpha = a * .92;
    for (const l of set) {
      const X = sx(l.s.px) + (l.ax - l.s.px * kk), Y = sy(l.s.py) + (l.ay + l.s.py * kk);
      g.font = `600 ${size}px ${EN}`; g.textAlign = l.al === 'l' ? 'left' : l.al === 'r' ? 'right' : 'center'; g.textBaseline = 'alphabetic';
      g.lineJoin = 'round'; g.lineWidth = 4.5; g.strokeStyle = hf; g.strokeText(l.n, X, Y);          // 一圈底色的描边：字压到线时也清楚
      const wv = text(g, l.n, X, Y, `600 ${size}px ${EN}`, css(TH.ink), g.textAlign);
      const x0 = l.al === 'l' ? X : l.al === 'r' ? X - wv : X - wv / 2;
      texts.push({ id: 'st-' + l.n, text: l.n, ...box(x0, Y - size, wv, size * 1.2), pass: true });
    }
    g.restore();
  }
  { const pa = done * ss(seg(Z, 1.3, 2.0)); if (pa > 0) { g.save(); g.globalAlpha = pa; g.fillStyle = hf; g.fillRect(COL_X - 52, 0, 1920, 1080);
    g.globalAlpha = pa * .35; g.fillStyle = css(TH.mute); g.fillRect(COL_X - 52, 0, 1.5, 1080); g.restore(); } }
  hud(t, m, ss(seg(t, bar(2), bar(2, 2))));
  for (const c of CAPS) caption(c, t);
  endCard(t);
  for (const x of texts) { x.x0 *= SC; x.x1 *= SC; x.y0 *= SC; x.y1 *= SC; }
};
window.TEXTS = (t) => { window.render(t); return texts; };
window.DUR = DUR;

// ---------- 声音事件：全部从时间线和时刻表推出来 ----------
const EV = [], ev = (type, t, o = {}) => { if (t != null && t >= 0 && t <= DUR) EV.push({ type, t: +t.toFixed(3), ...o }); };
for (const s of SECS) ev('sec', s.t, { id: s.id });
const solveT = (f, target, a, b) => { if (f(b) < target) return null; for (let i = 0; i < 40; i++) { const c = (a + b) / 2; if (f(c) >= target) b = c; else a = c; } return b; };
for (const [ref, a, b] of DRAW) {
  const L = LINES[REF.indexOf(ref)]; ev('draw', a, { line: ref, d: b + .9 - a, li: REF.indexOf(ref) });
  for (let kk = 0; kk < L.nst; kk++) {                            // 每打一个站孔一下
    const tt = solveT(t => peff(L, t) - kk, LAG * .78, a, b + 1); const s = ST[L.stations[kk]];
    ev(s.inter ? 'knot' : 'punch', tt, { line: ref, k: kk, pan: +clamp((sx0(s.px)) / 960 - 1, -1, 1).toFixed(2) });
  }
  ev('settled', b + .9, { line: ref });
}
function sx0(x) { return MAPC[0] + (x - WC[0]) * K0; }   // 全景下的屏幕 x（只给声像用）
// 末班车到终点、线退色（周四）
LINES.forEach((L, li) => {
  const last = Math.max(...TRIPS.filter(T => T.li === li && T.b < 1600).map(T => T.b));
  ev('lastrun', tauOf(last), { line: L.ref, li, m: +last.toFixed(1) });
});
ev('pass', PASS.t0, { d: PASS.t1 - PASS.t0 });
// 列车进站：钟慢的时候（周五一点半、清晨），每列车每停一站一下；声像按画面上的位置
for (const T of TRIPS) for (const [tm, s] of T.stops) {
  const tt = tauOf(tm - DWELL); if (tt == null) continue;
  if (speedAt(tt) > 4 || tt < bar(9)) continue;
  const L = LINES[T.li], [x, y] = atS(L, s); const [ccx, ccy, zz] = camAt(tt), kk = K0 * zz;
  const X = MAPC[0] + (x - ccx) * kk, Y = MAPC[1] - (y - ccy) * kk;
  if (X < 0 || X > 1920 || Y < 0 || Y > 1080) continue;
  ev('arr', tt, { li: T.li, pan: +clamp(X / 960 - 1, -1, 1).toFixed(2) });
}
// 密度：每拍一次，线上有多少列车（给快放时的织体）
for (let tt = bar(3); tt < DUR; tt += BEAT) ev('beat', tt, { n: running(clockF(tt)), fast: +(speedAt(tt) > 4) });
for (const c of CAPS) ev('cap', c.t0, { id: c.id, kind: c.kind || 'cap' });
ev('end', END.t0);
EV.sort((a, b) => a.t - b.t); window.EV = EV;
window.render(0); window.READY = true;
