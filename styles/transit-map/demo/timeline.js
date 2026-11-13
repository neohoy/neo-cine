// 《江与环》The River and the Ring：这部片子的导演部分（事实、生长的先后、镜头、印在纸上的字、计数器、声音提示）。
// 引擎是 film.js（改编自 Lemo-Opuscar Transit Map，MIT, (c) 2026 LemoLab），线网是 net.js（tools/prep.py 生成）。
// 屏幕上的每个数字都来自下面的 FX，出处在 FACTS.md。时间就是片子的时间（秒，24 fps），不用 WARP。
import { clamp, lerp, seg, ss, eio, eo, ei, back, monotone } from '/core/lib.js';

// ———————————————————— 事实（出处见 FACTS.md）————————————————————
export const FX = {
  first: { date: '1997.6.28', stations: 5 },                      // 1 号线首段：西塱（当年写作西朗）—黄沙，5 站
  km: [[2010, 236], [2017, 390.6], [2018, 478], [2020, 531.1], [2024, 705.1], [2025.5, 751.1], [2025.9, 779.9]],   // 线网运营里程（公里）
  lines: [[2017, 13], [2018, 15], [2024, 17], [2025.9, 19]],      // 线路条数（官方口径：含广佛线、APM）
  l18: { date: '2021.9.28', kmh: 160 },                           // 18 号线首通段：时速 160 公里
  record: { date: '2025.12.31', value: 1409.3 },                  // 单日客运量（万人次），全国地铁单日纪录
};
const DUR = 54;
const W = v => v * 100;
// 一行要读的字登记到 window.TEXTS（readcheck 用）：盒子按当前字体和对齐算，基线 alphabetic（沿用上游的写法）
function rt(c, R, id, s, x, y, size, a = 1, screen = false) {
  if (!R || !R.regW) return;
  const w = c.measureText(s).width, al = c.textAlign, x0 = al === 'center' ? x - w / 2 : al === 'right' ? x - w : x, y0 = y - size * .9, y1 = y + size * .25;
  if (screen) R.regS(id, s, x0, y0, x0 + w, y1, a); else R.regW(id, s, x0, y0, x0 + w, y1, a, 12);
}

// ———————————————————— 生长：哪条线、从哪站到哪站、什么时候画（秒）、哪一年开通（出处见 FACTS.md）————————————————————
// 轨道画成"今天"跑在上面的那条线的颜色：2002 年的老 2 号线三元里—晓港，今天是 2 号线三元里—昌岗加 8 号线昌岗—晓港；
// 2019 年 21 号线开到员村，2024 年天河公园—员村一段改归 11 号线环线，这里只把 21 号线画到天河公园。
const P = (path, a, b, t0, t1, year, extra = {}) => ({ path, a, b, t0, t1, year, ...extra });
const PHASES = [
  P('1', '西塱', '黄沙', 2.3, 5.1, 1997, { yearLabel: '1997' }),
  P('1', '黄沙', '广州东站', 6.6, 8.0, 1999),
  P('2', '三元里', '昌岗', 8.0, 8.9, 2002), P('8', '昌岗', '晓港', 8.5, 8.9, 2002),
  P('8', '晓港', '琶洲', 8.9, 9.5, 2003),
  P('8', '琶洲', '万胜围', 9.4, 9.7, 2005), P('3b', '广州东站', '体育西路', 9.4, 9.8, 2005), P('3', '体育西路', '客村', 9.6, 10.1, 2005),
  P('4', '万胜围', '新造', 9.6, 10.3, 2005),
  P('3', '客村', '番禺广场', 10.1, 11.0, 2006), P('3', '体育西路', '天河客运站', 10.1, 10.7, 2006), P('4', '新造', '黄阁', 10.3, 11.0, 2006),
  P('4', '黄阁', '金洲', 11.0, 11.4, 2007),
  P('4', '万胜围', '车陂南', 11.3, 11.6, 2009), P('5', '滘口', '文冲', 11.3, 12.5, 2009),
  P('2', '三元里', '嘉禾望岗', 12.0, 12.8, 2010), P('2', '昌岗', '广州南站', 12.0, 12.9, 2010), P('4', '车陂南', '黄村', 12.2, 12.6, 2010),
  P('3b', '广州东站', '机场南', 12.1, 13.2, 2010), P('8', '昌岗', '凤凰新村', 12.4, 12.8, 2010),
  P('GF', '魁奇路', '西塱', 12.4, 13.3, 2010, { yearLabel: '2010' }), P('APM', '林和西', '广州塔', 12.7, 13.3, 2010, { yearLabel: '2010' }),
  P('6', '浔峰岗', '长湴', 14.4, 15.6, 2013, { yearLabel: '2013' }),
  P('GF', '西塱', '燕岗', 15.4, 15.9, 2015),
  P('6', '长湴', '香雪', 15.8, 16.6, 2016), P('7', '广州南站', '大学城南', 15.9, 16.7, 2016, { yearLabel: '2016' }), P('GF', '魁奇路', '新城东', 16.0, 16.6, 2016),
  P('4', '金洲', '南沙客运港', 16.8, 17.4, 2017), P('9', '飞鹅岭', '高增', 16.8, 17.6, 2017, { yearLabel: '2017' }),
  P('13', '鱼珠', '新沙', 16.9, 17.6, 2017, { yearLabel: '2017' }), P('14b', '新和', '镇龙', 16.9, 17.6, 2017, { yearLabel: '2017' }),
  P('3b', '机场南', '机场北', 18.3, 18.5, 2018), P('14', '嘉禾望岗', '东风', 18.3, 19.5, 2018), P('21', '增城广场', '镇龙西', 18.4, 19.2, 2018, { yearLabel: '2018' }),
  P('GF', '燕岗', '沥滘', 18.4, 18.9, 2018),
  P('21', '镇龙西', '天河公园', 20.4, 21.3, 2019), P('8', '凤凰新村', '文化公园', 20.4, 20.8, 2019),
  P('8', '文化公园', '滘心', 20.8, 21.6, 2020),
  P('18', '冼村', '万顷沙', 21.9, 23.1, 2021, { yearLabel: '2021' }),
  P('22', '番禺广场', '陈头岗', 24.4, 24.9, 2022, { yearLabel: '2022' }), P('7', '广州南站', '美的大道', 24.5, 25.2, 2022),
  P('5', '文冲', '黄埔新港', 25.0, 25.5, 2023), P('7', '大学城南', '燕山', 25.0, 25.8, 2023),
  P('3', '番禺广场', '海傍', 25.7, 26.2, 2024),
  P('11', '赤沙', '赤沙', 27.3, 32.6, 2024, { yearLabel: '2024', bLast: true, lin: true }),
  P('10', '西塱', '杨箕东', 34.0, 35.0, 2025, { yearLabel: '2025' }), P('12', '浔峰岗', '广州体育馆', 34.1, 34.9, 2025, { yearLabel: '2025' }),
  P('12b', '二沙岛', '大学城南', 34.2, 35.1, 2025),
  P('13', '鱼珠', '天河公园', 36.0, 36.7, 2025), P('14', '嘉禾望岗', '乐嘉路', 36.0, 36.6, 2025),
  P('22', '陈头岗', '芳村', 37.0, 37.7, 2025),
];
// 计数器落定的时刻（只落在有出处的值上）
const LAND = { km2010: 13.7, km2017: 17.8, km2020: 21.7, km2024: 33.0, km2025a: 36.0, km2025: 39.1, record: 42.4 };

// ———————————————————— 镜头 ————————————————————
let H = null;
const lz = (a, b, u) => Math.exp(lerp(Math.log(a), Math.log(b), u));
function mixCam(a, b, u) { return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), z: lz(a.z, b.z, u), tilt: lerp(a.tilt, b.tilt, u), head: lerp(a.head, b.head, u), ap: lerp(a.ap || 0, b.ap || 0, u), far: lerp(a.far || 5, b.far || 5, u) }; }
const G2 = (x, y, z, tilt, head, ap, far) => ({ x: W(x), y: W(y), z, tilt, head, ap, far });
function tip(i, t) { const o = H.PH[i]; const s = o.t0 >= t ? o.s0 : o.t1 <= t ? o.s1 : lerp(o.s0, o.s1, clamp(o.f(t))); return H.pointAt(o.path, s); }
function smoothTip(i, t, span = .5) { let x = 0, y = 0; for (let k = -4; k <= 4; k++) { const q = tip(i, t + k * span / 4); x += q[0]; y += q[1]; } return [x / 9, y / 9]; }
const K = {
  open: G2(-16.8, 1.8, 1.0, 36, -8, 12),      // 白鹅潭边，片名
  hold97: G2(-17.2, 3.4, .8, 26, -6, 8),       // 1997 首段和它的印字
  city: G2(-5.0, 3.2, .4, 16, 0, 4),            // 老城，2010
  wide: G2(2.0, -4.6, .23, 28, 0, 3, 6),       // 抬到能看见纸边和桌面
  ring: G2(-10.4, -.6, .47, 22, -5, 6),          // 环：整圈在计数器右边
  ring2: G2(-10.0, -.4, .5, 24, 4, 6),
  fill: G2(-3.6, .6, .72, 26, 4, 8),            // 2025 补网
  end: G2(15.6, -3.2, .178, 6, 0, 0, 5),       // 全网 + 片尾字
};
function sweep(t) {                             // 低角度扫过体育西路—珠江新城—广州塔：整张网在跑
  const u = ss(seg(t, 40.4, 46.6));
  return { x: W(lerp(-4.2, 3.6, u)), y: W(lerp(-1.6, 2.4, u)), z: 1.02, tilt: lerp(56, 61, u), head: lerp(26, -16, u), ap: 22, far: 9 };
}
function camera(t) {
  if (t < 2.3) return mixCam(K.open, { ...K.open, x: K.open.x + 50, z: K.open.z * .98 }, ss(seg(t, 0, 2.3)));
  if (t < 5.6) {                                // 跟着首段往前推：笔尖从西塱北上，到白鹅潭时镜头压低，看它钻过江底
    const tp = smoothTip(0, Math.max(t, 2.4), .8);
    const ride = { x: lerp(K.open.x + 50, tp[0] - 260, .7), y: lerp(K.open.y, tp[1] - 40, .55), z: 1.12, tilt: 32, head: -8, ap: 12, far: 5 };
    const dive = ss(seg(t, 4.0, 4.6)) * (1 - ss(seg(t, 5.0, 5.6)));
    if (dive > 0) Object.assign(ride, mixCam(ride, { ...ride, z: 1.3, tilt: 54, head: -16, ap: 24 }, dive));
    return mixCam(camera(2.299), ride, eio(seg(t, 2.3, 3.6)));
  }
  if (t < 6.8) return mixCam(camera(5.599), K.hold97, eio(seg(t, 5.6, 6.8)));
  if (t < 14.2) { const u = seg(t, 6.8, 14.2); return mixCam(K.hold97, K.city, 1 - Math.pow(1 - eio(u), 1.4)); }
  if (t < 26.0) { const w = mixCam(K.city, K.wide, eio(seg(t, 14.2, 17.4))), u = ss(seg(t, 17.4, 26.0));   // 远景里也不停：慢慢推近、转一点
    return { ...w, z: w.z * (1 + .1 * u), head: w.head + 5 * u, x: w.x - 60 * u }; }
  if (t < 27.6) return mixCam(K.wide, K.ring, eio(seg(t, 26.0, 27.6)));
  if (t < 33.4) return mixCam(K.ring, K.ring2, ss(seg(t, 27.6, 33.4)));
  if (t < 38.8) return mixCam(K.ring2, K.fill, eio(seg(t, 33.4, 38.8)));
  if (t < 40.4) return mixCam(K.fill, sweep(40.4), eio(seg(t, 38.8, 40.4)));
  if (t < 46.6) return sweep(t);
  return mixCam(sweep(46.6), K.end, eio(seg(t, 46.6, 49.6)));
}

// ———————————————————— 合环：别的线被一层纸色轻轻罩住，11 号线在上面一笔绕城 ————————————————————
const veil = t => .5 * ss(seg(t, 26.8, 27.4)) * (1 - ss(seg(t, 33.0, 34.0)));
function stationDim(n, t, v) { return n.pts.some(p => p.line === '11') ? 1 : 1 - .55 * v; }
function highlight(c, t, h, top) {
  if (!top) return;
  // 合上的那一刻：整个环亮一下（一圈更宽的淡色描边，0.9 s 消失）
  const g = Math.sin(Math.PI * seg(t, 32.6, 33.5));
  if (g > 0) { const p = h.PATHS['11']; c.save(); c.globalAlpha = .3 * g; c.strokeStyle = p.color; c.lineWidth = 22 * 2.6; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); h.subPath(c, p, 0, p.total); c.stroke(); c.restore(); }
  for (const o of h.PH) { if (o.path.line !== '11' || t <= o.t0) continue;
    const head = h.phaseHead(o, t); h.drawSpan(c, o.path, Math.min(o.s0, head), Math.max(o.s0, head), h.modeOf(h.LINE['11']).lw); }
}

// ———————————————————— 站名：按镜头决定哪几个名字出现（不随时间闪）————————————————————
const LABEL_PREF = { '黄沙': 'e', '芳村': 'w', '西塱': 'w', '体育西路': 'w', '珠江新城': 'e', '广州塔': 'e', '公园前': 'nw', '广州东站': 'ne', '天河公园': 'ne',
  '广州火车站': 'ne', '嘉禾望岗': 'e', '广州南站': 'w', '番禺广场': 'se', '林和西': 'w', '客村': 'w' };
function labelOnly(t) {
  if (t < 8.6) return ['芳村', '黄沙'];
  if (t < 27.4) return [];
  if (t < 40.0) return ['公园前', '体育西路', '广州东站', '广州火车站', '天河公园', '西塱', '芳村', '珠江新城'];
  if (t < 47.0) return ['体育西路', '珠江新城', '广州塔', '客村', '天河公园'];
  return [];
}
const forceLabel = (n, t) => (labelOnly(t) || []).includes(n.id) ? 1 : 0;

// ———————————————————— 线路圆标：线刚开画时出现在起点、带开通年份，画完 2.5 s 后淡出；片尾在每条线的终点再出现一次 ————————————————————
const ENDPOS = {};
function roundelPos(t, id) { return t > 47 ? ENDPOS[id] : null; }
function roundelAlpha(t, id, z) {
  if (t > 47) return seg(t, 48.2, 48.8);
  const o = H.PH.filter(o => o.path.line === id).sort((a, b) => a.t0 - b.t0)[0];
  return 1 - seg(t, o.t1 + 2.0, o.t1 + 2.6);
}

// ———————————————————— 印在纸上的：水名、片名、片尾 ————————————————————
function waterLabels(c, t, view, { F }) {
  c.save(); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#5f88ad';
  for (const [x, y, rot] of [[-2.95, 1.8, 0], [6.0, 9.05, 0], [-13.2, -9.2, -Math.PI / 2], [23.6, 13.4, -Math.PI / 2]]) {
    c.save(); c.translate(W(x), W(y)); c.rotate(rot); c.font = F(600, 24); c.fillText('珠江', -38, 1); c.font = F(500, 17); c.fillText('Pearl River', 44, 1); c.restore();
  }
  c.restore();
}
const TITLE = { x: -24.6, y: .9 };     // 片名印在白鹅潭西边的空白纸上（G）
const ENDB = { x: 28.6, y: -11.6 };    // 片尾印在全网右边的纸边上
function furniture(c, t, view, K2) {
  const { F, INK, MUTED } = K2;
  // 片名：一根墨条 + 中文 + 英文 + 一行小字，开机时就印在纸上（它也是这张图的图名）
  c.save(); c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  const x = W(TITLE.x), y = W(TITLE.y);
  c.fillStyle = INK; c.fillRect(x, y - 96, 14, 236);
  c.font = F(800, 112); c.fillText('江与环', x + 44, y); rt(c, K2, 'title', '江与环', x + 44, y, 112);
  c.font = F(600, 50); c.fillStyle = '#3d3a34'; c.fillText('The River and the Ring', x + 46, y + 66); rt(c, K2, 'title-en', 'The River and the Ring', x + 46, y + 66, 50);
  c.restore();
  endBlock(c, t, K2);
}
const END_LINES = [
  ['广州地铁 1997—2025 · 非官方致敬短片', 'Guangzhou Metro 1997–2025 · Unofficial fan film'],
  ['列车为示意 · 线网图为自绘示意', 'Trains illustrative · schematic drawn by us'],
  ['地图数据 © OpenStreetMap 贡献者（ODbL）', 'Map data © OpenStreetMap contributors (ODbL)'],
  ['改编自 Lemo-Opuscar 的 Transit Map（MIT）', 'Adapted from Lemo-Opuscar’s Transit Map (MIT)'],
  ['NEO-Cine · 地铁线路图', 'NEO-Cine · Transit Map'],
];
function endBlock(c, t, K2) {
  const { F, INK, MUTED } = K2; const a = seg(t, 48.4, 48.9); if (a <= 0) return;
  const x = W(ENDB.x), y = W(ENDB.y);
  c.save(); c.globalAlpha = a; c.beginPath(); c.rect(x - 60, y - 300, 2900 * eo(seg(t, 48.4, 49.2)) + 60, 2600); c.clip();
  c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  c.fillStyle = INK; c.fillRect(x, y - 230, 24, 420);
  c.font = F(800, 230); c.fillText('江与环', x + 70, y); rt(c, K2, 'end-title', '江与环', x + 70, y, 230, a);
  c.font = F(600, 112); c.fillStyle = '#3d3a34'; c.fillText('The River and the Ring', x + 76, y + 150); rt(c, K2, 'end-title-en', 'The River and the Ring', x + 76, y + 150, 112, a);
  let yy = y + 420;
  END_LINES.forEach(([zh, en], i) => {
    c.font = F(600, 130); c.fillStyle = INK; c.fillText(zh, x + 76, yy); rt(c, K2, 'end-' + i, zh, x + 76, yy, 130, a);
    c.font = F(500, 96); c.fillStyle = MUTED; c.fillText(en, x + 76, yy + 128); rt(c, K2, 'end-en-' + i, en, x + 76, yy + 128, 96, a);
    yy += 340;
  });
  c.restore();
}

// ———————————————————— 印在纸上的标注：一根色条、日期、中文一行、英文一行，从色条处擦开 ————————————————————
const CALLOUTS = [
  { id: 'c97', t0: 4.3, t1: 10.6, x: -24.6, y: 4.0, color: '#F3D03E', date: FX.first.date, zh: `1 号线首段 · ${FX.first.stations} 站`, en: `Line 1’s first section · ${FX.first.stations} stations`, k: 1 },
  { id: 'c18', t0: 22.2, t1: 26.6, x: 12.6, y: 18.6, color: '#0047BA', date: FX.l18.date, zh: `18 号线 · 时速 ${FX.l18.kmh} 公里`, en: `Line 18 · ${FX.l18.kmh} km/h`, k: 3.4 },
];
function callout(c, t, K2, o) {
  const { F, INK } = K2; const u = seg(t, o.t0, o.t0 + .5), out = seg(t, o.t1 - .5, o.t1); if (u <= 0 || out >= 1) return;
  const k = o.k, x = W(o.x), y = W(o.y), w = 640 * k, h = 200 * k;
  c.save(); c.globalAlpha = 1 - out; c.beginPath(); c.rect(x - 4, y - 12, (w + 40) * eo(u) + 4, h + 40); c.clip();
  c.fillStyle = 'rgba(245,242,235,.94)'; c.shadowColor = 'rgba(0,0,0,.10)'; c.shadowBlur = 14 * k; c.shadowOffsetY = 4 * k; c.beginPath(); c.roundRect(x - 2, y - 8, w, h, 8 * k); c.fill(); c.shadowColor = 'transparent';
  c.fillStyle = o.color; c.fillRect(x + 14 * k, y + 14 * k, 10 * k, h - 44 * k);
  c.textAlign = 'left'; c.textBaseline = 'alphabetic'; const a = u > .99 && out <= 0 ? 1 : 0;
  c.fillStyle = INK; c.font = F(800, 56 * k); c.fillText(o.date, x + 46 * k, y + 64 * k); rt(c, K2, o.id + '-d', o.date, x + 46 * k, y + 64 * k, 56 * k, a);
  c.font = F(700, 36 * k); c.fillText(o.zh, x + 48 * k, y + 116 * k); rt(c, K2, o.id + '-zh', o.zh, x + 48 * k, y + 116 * k, 36 * k, a);
  c.font = F(500, 26 * k); c.fillStyle = '#4a4740'; c.fillText(o.en, x + 48 * k, y + 154 * k); rt(c, K2, o.id + '-en', o.en, x + 48 * k, y + 154 * k, 26 * k, a);
  c.restore();
}
function annotations(c, t, view, K2) { for (const o of CALLOUTS) callout(c, t, K2, o); }

// ———————————————————— 列车（示意）————————————————————
function trains(c, t, { service }) {
  const off = seg(t, 0, .1);    // 第一班车在首段画完以后才出现（service 内部按开通时间处理）
  return service(t, { every: 700, alpha: () => off });
}

// ———————————————————— 计数器：屏幕左上角一张很轻的纸卡，用纸上的同一套字；数字滚动，只落在有出处的值上 ————————————————————
const YEARS = PHASES.map(o => [o.t0, o.year]).sort((a, b) => a[0] - b[0]);
function yearAt(t) { let y = null, t0 = 0; for (const [ts, yr] of YEARS) if (t >= ts) { if (yr !== y) { y = yr; t0 = ts; } } return { y, t0 }; }
// 这几年的分段开通日期只在百科里查到、找不到官方或两家主流媒体的原文（见 FACTS.md）：线照样按这个先后画，年份计数器在这几年只转不停
const SPIN_YEARS = new Set([2002, 2003, 2005, 2006, 2007, 2009]);
// 每一行：落定点 [时刻, 值]，两次落定之间数字转动看不清
// 每次落定都标出这个数字是哪一天的（两次落定之间，年份可能已经往前走了）。2018 年的 478 公里、15 条查过但没有用：
// 和 2017、2020 两次落定挨得太近，读不完（见 FACTS.md）
const KM = [[LAND.km2010, 236, '2010.11'], [LAND.km2017, 390.6, '2017.12'], [LAND.km2020, 531.1, '2020.11'], [LAND.km2024, 705.1, '2024.12'],
  [LAND.km2025a, 751.1, '2025.6'], [LAND.km2025, 779.9, '2025']];
const LN = [[LAND.km2017, 13, '2017.12'], [LAND.km2024, 17, '2024.12'], [LAND.km2025, 19, '2025']];
const SPIN = .9;   // 落定前转动的时长
function rolling(c, x, y, str, prevStr, k, F, size, align = 'right') {
  // 一串数字：上一值向上滑走、新值从下面滑进来（k 0→1）；k<1 时带一点模糊
  c.save(); c.font = F(700, size); c.textAlign = align; c.textBaseline = 'alphabetic';
  const h = size * 1.05; c.beginPath(); c.rect(x - 420, y - size * 1.0, 440, size * 1.3); c.clip();
  if (k >= 1 || !prevStr) { c.fillText(str, x, y); c.restore(); return; }
  const e = eio(k); c.globalAlpha = 1 - e; c.fillText(prevStr, x, y - h * e); c.globalAlpha = e; c.fillText(str, x, y + h * (1 - e)); c.restore();
}
function spinStr(t, n) { let s = ''; for (let i = 0; i < n; i++) s += String(Math.floor((t * (11 + 7 * i) + i * 3.7) % 10)); return s; }
function rowValue(keys, t, fmt) {
  // 返回 {str, prev, k, held}：落定的值，或者转动中的假数字（模糊）
  let i = -1; for (let j = 0; j < keys.length; j++) if (t >= keys[j][0]) i = j;
  const next = keys[i + 1];
  if (next && t > next[0] - SPIN) { const n = fmt(next[1]).replace(/\D/g, '').length; return { spin: true, str: spinStr(t, n), fmtLike: fmt(next[1]) }; }
  if (i < 0) return null;
  const k = clamp((t - keys[i][0]) / .25); return { str: fmt(keys[i][1]), k, held: t - keys[i][0] };
}
function overlay(c, t, K2) {
  const { F, INK } = K2;
  const a = seg(t, 2.4, 2.9) * (1 - seg(t, 46.6, 47.4)); if (a <= 0) return;
  const showKm = t > LAND.km2010 - SPIN - .2, showLn = t > LAND.km2017 - SPIN - .2, showRec = t > LAND.record - SPIN - .4 && t < 47.4;
  const rows = 1 + showKm + showLn + showRec;
  const x0 = 56, y0 = 48, w = 560, rh = 82, hh = 30 + rows * rh;
  c.save(); c.globalAlpha = a;
  c.fillStyle = 'rgba(246,243,236,.9)'; c.shadowColor = 'rgba(0,0,0,.16)'; c.shadowBlur = 18; c.shadowOffsetY = 5; c.beginPath(); c.roundRect(x0, y0, w, hh, 12); c.fill();
  c.shadowColor = 'transparent'; c.strokeStyle = 'rgba(27,28,30,.12)'; c.lineWidth = 1; c.stroke();
  const R = { regS: K2.regS, regW: K2.regW };
  const label = (i, zh, en, sub) => {
    const yy = y0 + 22 + i * rh; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillStyle = INK; c.font = F(700, 24); c.fillText(zh, x0 + 28, yy + 30);
    rt(c, R, 'lab-' + zh, zh, x0 + 28, yy + 30, 24, a, true);
    c.fillStyle = '#6b675f'; c.font = F(500, 17); c.fillText(en, x0 + 28, yy + 54); rt(c, R, 'lab-' + en, en, x0 + 28, yy + 54, 17, a, true);
    if (sub) { c.font = F(500, 17); c.fillText(sub, x0 + 28 + c.measureText(en).width + 10, yy + 54); }
    if (i) { c.strokeStyle = 'rgba(27,28,30,.10)'; c.beginPath(); c.moveTo(x0 + 24, yy - 6); c.lineTo(x0 + w - 24, yy - 6); c.stroke(); }
    return yy;
  };
  const value = (i, yy, v, unitZh, unitEn, idv) => {
    const xr = x0 + w - 28 - (unitZh ? 92 : 0);
    if (!v) return;
    if (v.spin) { c.save(); c.filter = 'blur(5.5px)'; c.globalAlpha *= .32; c.fillStyle = INK; c.font = F(700, 46); c.textAlign = 'right'; c.textBaseline = 'alphabetic';
      c.fillText(v.fmtLike.replace(/\d/g, (d, j) => v.str[j % v.str.length] || d), xr, yy + 50); c.restore(); }
    else { c.fillStyle = INK; rolling(c, xr, yy + 50, v.str, null, v.k, F, 46); c.font = F(700, 46); c.textAlign = 'right';
      if (v.held > .25) rt(c, R, idv + v.str, v.str, xr, yy + 50, 46, a, true); }
    if (unitZh) { c.textAlign = 'left'; c.fillStyle = INK; c.font = F(700, 22); c.fillText(unitZh, xr + 12, yy + 28); c.fillStyle = '#6b675f'; c.font = F(500, 16); c.fillText(unitEn, xr + 12, yy + 50); }
  };
  let i = 0;
  // 年份：每一章的开通年份；只在停留够长的年份上登记阅读（快速翻过的年份不要求读）
  { const yy = label(i, '年份', 'Year'); const { y, t0 } = yearAt(t);
    if (y && SPIN_YEARS.has(y)) { c.save(); c.filter = 'blur(5.5px)'; c.globalAlpha *= .32; c.fillStyle = INK; c.font = F(700, 46); c.textAlign = 'right'; c.textBaseline = 'alphabetic';
      c.fillText('20' + spinStr(t, 2), x0 + w - 28, yy + 50); c.restore(); }
    else if (y) { const prev = YEARS.filter(([ts, yr]) => ts < t0 && yr !== y && !SPIN_YEARS.has(yr)).pop(); const k = clamp((t - t0) / .28);
      c.fillStyle = INK; rolling(c, x0 + w - 28, yy + 50, String(y), prev ? String(prev[1]) : null, k, F, 46);
      const nxt = YEARS.find(([ts, yr]) => ts > t0 && yr !== y); const hold = (nxt ? nxt[0] : 99) - t0;
      if (hold > 2.4 && t - t0 > .3) { c.font = F(700, 46); c.textAlign = 'right'; rt(c, R, 'year' + y, String(y), x0 + w - 28, yy + 50, 46, a, true); } }
    i++; }
  const asOf = keys => { let d = keys[0][2]; for (const k of keys) if (t >= k[0] - SPIN) d = k[2]; return d; };
  if (showLn) { const yy = label(i, '线路', `Lines · ${asOf(LN)}`); value(i, yy, rowValue(LN, t, v => String(v)), '条', 'lines', 'ln'); i++; }
  if (showKm) { const yy = label(i, '运营里程', `Route length · ${asOf(KM)}`); value(i, yy, rowValue(KM, t, v => String(v)), '公里', 'km', 'km'); i++; }
  if (showRec) { const yy = label(i, '单日客运量纪录', `Single-day record · ${FX.record.date}`);
    value(i, yy, rowValue([[LAND.record, FX.record.value]], t, v => v.toFixed(1)), '万人次', '14.09 million', 'rec'); i++; }
  c.restore();
}

// ———————————————————— 给声音的提示（events.json 里的 cue）————————————————————
const cues = [
  { t: 0.0, type: 'open' }, { t: 2.3, type: 'first' },
  ...KM.map(([t, v]) => ({ t, type: 'land', id: 'km' + v })), ...LN.map(([t, v]) => ({ t, type: 'land', id: 'ln' + v })),
  { t: LAND.record, type: 'record' },
  ...CALLOUTS.map(o => ({ t: o.t0, type: 'callout', id: o.id })),
  { t: 27.3, type: 'ringstart' }, { t: 32.6, type: 'ringclose' },
  { t: 40.4, type: 'sweep' }, { t: 48.4, type: 'end' },
];

function init(h) {
  H = h;
  // 片尾的线路圆标：放在这条线离市中心最远的那个终点外面 0.62 G（环线放在环的东南角外）
  for (const [id, L] of Object.entries(h.LINE)) {
    const ends = [];
    for (const k of [id, id + 'b']) { const p = h.PATHS[k]; if (!p) continue; ends.push([p, p.total, -30], [p, 0, 30]); }
    if (L.loop) { const q = h.pointAt(h.PATHS[id], 0); ENDPOS[id] = [q[0] / 100 + .9, q[1] / 100 + .9]; continue; }
    let best = null;
    for (const [p, s, ds] of ends) { const q = h.pointAt(p, s), d = Math.hypot(q[0] / 100 + 3, q[1] / 100); if (!best || d > best.d) best = { p, s, ds, q, d }; }
    const { p, s, ds, q } = best, a = h.pointAt(p, s + ds), d = Math.hypot(q[0] - a[0], q[1] - a[1]) || 1;
    ENDPOS[id] = [(q[0] + (q[0] - a[0]) / d * 62) / 100, (q[1] + (q[1] - a[1]) / d * 62) / 100];
  }
  // 两个圆标挤在一起（同一个终点站）：后一个再往外让 0.62 G
  const ids = Object.keys(ENDPOS);
  for (let i = 0; i < ids.length; i++) for (let j = 0; j < i; j++) {
    const A = ENDPOS[ids[i]], B = ENDPOS[ids[j]], d = Math.hypot(A[0] - B[0], A[1] - B[1]);
    if (d < .62) { const ux = (A[0] - B[0]) / (d || 1) || 0, uy = (A[1] - B[1]) / (d || 1) || 1; ENDPOS[ids[i]] = [B[0] + ux * .62, B[1] + uy * .62]; }
  }
}

export const DATA = {
  DUR, SHEET: [-3150, -3500, 5600, 2950], PHASES, camera, LABEL_PREF, labelOnly, forceLabel,
  roundelPos, roundelAlpha, roundelScale: z => clamp(Math.pow(.9 / z, .5), 1, 2.6),
  hubLabelScale: z => clamp(Math.pow(.85 / z, .6), 1, 1.75),
  veil, stationDim, highlight, waterLabels, furniture, annotations, trains, overlay, cues, init,
};
