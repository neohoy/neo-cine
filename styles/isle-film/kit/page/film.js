// 方寸影像 · 整片页面：按外观各开一个 isle.html（NEO-Isle 引擎的影片模式），每一帧算出那一刻的状态交给它出画，
// 上面叠字（片名卡、字幕、片尾卡）和黑场。实现库的页面约定：window.READY、render(t)、DUR、EV、TEXTS（core/README.md）。
//
// 叠化和外观切换：先让上一个镜头的那一页画出它的画面，复制到 #carry，再画这一个镜头；#carry 按比例淡出（wipe 是一道斜着扫过去的软边）。
// 画面完全由 t 决定：时辰、镜头、引擎时间都从 plan.js 算出来，页面不留上一帧的状态，可以按任意顺序、在任意 worker 上渲任意一帧。
//
// ?survey=1：勘景模式（tools/survey.mjs 用）。正午从正上方看整块地，叠一张每格 1 个单位的坐标网格，window.SURVEY 里是这一境的地标。
import { makePlan, stateAt, textsAt, textItems, events, clamp } from './plan.js';

const cfg = JSON.parse(document.getElementById('film-data').textContent);
const Q = new URLSearchParams(location.search);
const SURVEY = Q.get('survey') === '1';
const W = innerWidth, H = innerHeight;
window.__isleError = m => setTimeout(() => { throw new Error('isle.html：' + m); });   // 一境里的脚本报错要让渲染工具停下来，不能出一片黑

// ---------- 每个外观一页 ----------
const looks = cfg.looks && Object.keys(cfg.looks).length ? cfg.looks : { main: {} };
const pages = {};
for (const [id, lk] of Object.entries(looks)) {
  const f = document.createElement('iframe');
  f.className = 'isle'; f.title = id;
  const q = new URLSearchParams();
  for (const k of ['container', 'backdrop', 'glow']) if (lk[k]) q.set(k, lk[k]);
  f.src = 'isle.html' + (q.toString() ? '?' + q : '');
  document.body.prepend(f);
  pages[id] = { f };
}
const waitFor = (fn, what, ms = 170000) => new Promise((res, rej) => {
  const t0 = performance.now();                                    // 只用来等加载（不决定画面）
  (function poll() { let v; try { v = fn(); } catch (_) {} if (v) return res(v); if (performance.now() - t0 > ms) return rej(new Error('等不到 ' + what)); setTimeout(poll, 50); })();
});
await Promise.all(Object.entries(pages).map(async ([id, p]) => {
  const api = await waitFor(() => p.f.contentWindow.FANGCUN, `外观 ${id} 的引擎`);
  await api.ready;
  p.api = api; p.canvas = p.f.contentDocument.querySelector('canvas');
}));
const first = pages[Object.keys(pages)[0]].api;
const plan = makePlan(cfg, first.defaults);
if (plan.errs.length) throw new Error('镜头表有问题：' + plan.errs.join('；'));

// ---------- 叠字 ----------
const txt = document.getElementById('txt'), black = document.getElementById('black');
const carry = document.getElementById('carry'); carry.width = W; carry.height = H;
const cctx = carry.getContext('2d');
const items = textItems(plan), els = {};
for (const x of items) {
  const d = document.createElement('div'); d.className = 'tx ' + x.kind; d.id = 'tx-' + x.id;
  for (const k of ['kicker', 'zh', 'en']) if (x[k]) { const s = document.createElement('span'); s.className = k; s.textContent = x[k]; d.appendChild(s); }
  txt.appendChild(d); els[x.id] = d;
}

const toFrame = st => ({ t: st.eng, hour: st.hour, cam: st.cam, focus: st.focus, focusAt: st.focusAt, band: st.band, blur: st.blur, tilt: st.tilt });
let shownTexts = [];
function render(t) {
  const st = stateAt(plan, t);
  if (st.prev) {                                                 // 叠化 / 外观切换：上一个镜头先画，复制下来
    const A = pages[st.prev.look]; A.api.frame(toFrame(st.prev));
    cctx.globalAlpha = 1; cctx.drawImage(A.canvas, 0, 0, W, H);
    carry.style.display = 'block';
    if (st.mode === 'wipe') {                                    // 一道斜的软边从右往左扫过去，像玻璃上的一道反光
      const x = (1 - st.mix) * 140 - 20;
      carry.style.opacity = 1;
      carry.style.webkitMaskImage = carry.style.maskImage = `linear-gradient(105deg, #000 ${x - 14}%, transparent ${x + 14}%)`;
    } else { carry.style.opacity = 1 - st.mix; carry.style.webkitMaskImage = carry.style.maskImage = 'none'; }
  } else carry.style.display = 'none';
  const B = pages[st.look];
  B.api.frame(toFrame(st));
  for (const [id, p] of Object.entries(pages)) p.f.classList.toggle('on', id === st.look);
  black.style.opacity = st.black;
  drawTexts(t);
}
function drawTexts(t) {
  shownTexts = textsAt(plan, t);
  const vis = new Set(shownTexts.map(x => x.id));
  for (const x of items) if (!vis.has(x.id)) els[x.id].style.opacity = 0;
  for (const x of shownTexts) {
    const e = els[x.id]; e.style.opacity = x.a.toFixed(4);
    const dy = (x.rise * 14).toFixed(2);
    e.style.translate = `0 ${dy}px`;
    e.style.filter = x.rise > 0.01 ? `blur(${(x.rise * 6).toFixed(2)}px)` : 'none';
  }
}

// 画面上每块字的框（给 core/render/readcheck.mjs）：淡入过半、不再上浮时才算“在画面上”
window.TEXTS = t => {
  drawTexts(t);                                                    // 字的位置和画面无关：不用为读字检查把一境再渲一遍
  const out = [];
  for (const x of shownTexts) {
    if (x.a < 0.6 || x.rise > 0.05) continue;
    for (const s of els[x.id].children) { const r = s.getBoundingClientRect(); out.push({ id: `${x.id}-${s.className}`, text: s.textContent, x0: r.left, y0: r.top, x1: r.right, y1: r.bottom }); }
  }
  return out;
};

if (SURVEY) {
  // 勘景：正午，从正上方（略偏一点，避开万向锁）看整块地；网格画在 #carry 上
  const api = first, d = 0.8;
  const survey = () => {
    pages[Object.keys(pages)[0]].f.classList.add('on');
    api.frame({ t: 0, hour: 12.5, cam: { az: 0, pol: 0.0005, dist: d, target: [0, 0, 0] }, tilt: false });
    cctx.clearRect(0, 0, W, H); carry.style.display = 'block'; carry.style.opacity = 1;
    cctx.font = '15px monospace'; cctx.textAlign = 'center'; cctx.textBaseline = 'middle';
    const G = api.F.G;
    // 世界坐标 → 屏幕：用引擎的镜头（frame 之后 camera 已经摆好）
    const cam = window.__cam, V = new api.THREE.Vector3();
    const toS = (x, y, z) => { V.set(x, y, z).project(cam); return [(V.x + 1) / 2 * W, (1 - V.y) / 2 * H]; };
    cctx.lineWidth = 1;
    for (let v = -5; v <= 5; v++) {
      cctx.strokeStyle = v === 0 ? 'rgba(255,80,60,.85)' : 'rgba(255,255,255,.35)';
      let [a, b] = [toS(v, G, -5), toS(v, G, 5)]; cctx.beginPath(); cctx.moveTo(...a); cctx.lineTo(...b); cctx.stroke();
      [a, b] = [toS(-5, G, v), toS(5, G, v)]; cctx.beginPath(); cctx.moveTo(...a); cctx.lineTo(...b); cctx.stroke();
      cctx.fillStyle = '#fff'; cctx.fillText('x' + v, ...toS(v, G, 5.35)); cctx.fillText('z' + v, ...toS(-5.45, G, v));
    }
    for (const m of window.SURVEY.marks) { const [sx, sy] = toS(m.x, m.y, m.z); cctx.fillStyle = '#ffd36b'; cctx.beginPath(); cctx.arc(sx, sy, 5, 0, 7); cctx.fill(); cctx.fillText(m.label, sx, sy - 16); }
  };
  const T = first.F.T, G = first.F.G, top = { h: -1e9 };
  for (let x = -4.8; x <= 4.8; x += 0.1) for (let z = -4.8; z <= 4.8; z += 0.1) { const h = T.getH(x, z); if (h > top.h && first.F.inFoot(x, z)) Object.assign(top, { h, x, z }); }
  const r2 = v => Math.round(v * 100) / 100, Y = (x, z) => r2(T.getY(x, z));
  const marks = [{ label: '最高点', x: r2(top.x), z: r2(top.z), y: Y(top.x, top.z) }];
  T.lakes.forEach((l, i) => marks.push({ label: `湖${i}`, x: l.x, z: l.z, y: r2(G + l.level), rx: l.rx, rz: l.rz }));
  T.rivers.forEach((rv, i) => { if (rv.fallHeight > 0.15) marks.push({ label: `河${i}落差`, x: r2(rv.fallTop.x), z: r2(rv.fallTop.z), y: r2(rv.fallTop.y), drop: r2(rv.fallHeight) }); });
  (T.pads || []).forEach((p, i) => marks.push({ label: `平台${i}`, x: p.x, z: p.z, y: Y(p.x, p.z) }));
  const grid = []; for (let z = -4; z <= 4; z++) { const row = []; for (let x = -4; x <= 4; x++) row.push(first.F.inFoot(x, z, 0) ? Y(x, z) : null); grid.push(row); }
  window.SURVEY = { meta: { no: first.meta.no, name: first.meta.name, tagline: first.meta.tagline, startHour: first.meta.startHour, look: first.look }, defaults: first.defaults, ground: G, marks, heights: { note: '地面实际高度 y，行是 z = -4…4，列是 x = -4…4', grid } };
  window.__cam = pages[Object.keys(pages)[0]].f.contentWindow.__fangcun.camera;
  window.DUR = 1; window.EV = []; window.render = () => survey(); window.TEXTS = () => [];
  await document.fonts.ready; window.READY = true;
} else {
  const api = { camPos: (look, cam) => pages[look].api.camPos(cam), inGlass: (look, p) => pages[look].api.inGlass(p) };
  window.DUR = plan.dur;
  window.EV = events(plan, api);
  window.PLAN = { dur: plan.dur, shots: plan.shots.map(s => ({ id: s.id, start: s.start, end: s.end, move: s.move, look: s.look })), poster: cfg.poster };
  window.render = render;
  // 字体（tools/fonts.py 切好的子集）：每种字重都先加载完再报告就绪，不然头几帧会用别的字体
  const all = items.map(x => [x.kicker, x.zh, x.en].join('')).join('');
  await Promise.all(["300 40px 'Isle Serif'", "400 40px 'Isle Serif'", "500 40px 'Isle Latin'", "italic 500 40px 'Isle Latin'"].map(f => document.fonts.load(f, all || 'a')));
  await document.fonts.ready;
  render(0);
  window.READY = true;
}
