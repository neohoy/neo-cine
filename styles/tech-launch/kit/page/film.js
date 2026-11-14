// 科技发布的整片页面（工具包 kit/page/，tools/build.mjs 每次复制到工程的 page/ 里）：冻结的真实界面 + 浮起的真实组件 + 双语标题，
// 按本库的页面约定逐帧画（TECHNIQUE.md §2）：
//   window.DUR       片长（秒）
//   window.render(t) 画 t 秒那一帧：组件姿态、换页、Canvas 标注都是 t 的纯函数，文字入场由 tween.js 按 t 算
//   window.EV        画面事件（切点、抬起、角点、计数、每个音效该落的时刻），tools/mix.py 用它配声音、核对卡点
//   window.TEXTS(t)  画面上该读的字（镜头标题、说明、标注卡、数字卡、落版），core/render/readcheck.mjs 用
//   window.READY     字体、冻结页面的图片、克隆的组件都就绪
// 改编自 NEO 产品宣传片技能「科技公司式」主题的 template.html（MIT，© 2026 NEO造物集 (neohoy)）：画面和动作逻辑原样保留，
// 去掉了 GSAP 和 HyperFrames：文字补间换成 tween.js，全片由 render(t) 直接驱动。
import { Timeline } from "./tween.js";

const DATA = JSON.parse(document.getElementById("pp-data").textContent);
const PLAN = DATA.plan, PAGES = DATA.pages, ACCENT = DATA.accent, WINBG = DATA.winbg;
const DUR = PLAN.dur;
const W = 1920, H = 1080;
const space = document.getElementById("pp-space");
const dim = document.getElementById("pp-dim");
const ctx = document.getElementById("pp-fx").getContext("2d");
const STAGES = [...document.querySelectorAll(".pp-stage")];
const PATHS = [...document.querySelectorAll(".pp-path")];
const SHOT_EL = [...document.querySelectorAll(".pp-shot")];
const shotEl = (i) => SHOT_EL.find((el) => el.getAttribute("data-shot") === String(i));
const FURN = [...document.querySelectorAll(".pp-furn")];

// ---------- 纯函数工具 ----------
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const io = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const out = (k) => 1 - Math.pow(1 - k, 3);
const out5 = (k) => 1 - Math.pow(1 - k, 5);
const in4 = (k) => k * k * k * k, out4 = (k) => 1 - Math.pow(1 - k, 4);
const seg = (t, a, b) => clamp((t - a) / (b - a));
const mixPose = (a, b, k) => Object.fromEntries(Object.keys(a).map((n) => [n, lerp(a[n], b[n] ?? a[n], k)]));

function findItem(page, key) {
  const pg = PAGES[page];
  const it = typeof key === "number" ? pg.items[key] : pg.items.find((x) => x.name === key);
  if (!it) throw new Error(`页面 ${page} 里没有组件：${key}`);
  return it;
}
const stageOf = (page) => STAGES.find((el) => el.getAttribute("data-page") === page);
const srcOf = (page, it) => [...stageOf(page).querySelectorAll("[data-promo-item]")].find((el) => el.getAttribute("data-promo-item") === String(it.i));

// ---------- 浮起来的组件：从冻结页面里克隆真实的组件 ----------
function cloneItem(page, it) {
  const el = srcOf(page, it).cloneNode(true);
  el.style.backgroundColor = it.bg || WINBG;   // 冻结时记下的实际底色：组件本身透明也不会和后面的内容叠在一起
  el.removeAttribute("data-promo-item");
  el.removeAttribute("id");
  el.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
  el.classList.add("pp-float");
  el.style.width = it.w + "px";
  el.style.height = it.h + "px";
  space.appendChild(el);
  return { el, w: it.w, h: it.h };
}
function place(card, p) {
  if (p.o <= 0.001) { card.el.style.visibility = "hidden"; return; }
  card.el.style.visibility = "visible";
  card.el.style.transform =
    `translate3d(${p.cx - card.w / 2}px, ${p.cy - card.h / 2}px, ${p.z}px) ` +
    `rotateX(${p.rx}deg) rotateY(${p.ry}deg) rotateZ(${p.rz}deg) scale(${p.s})`;
  card.el.style.opacity = p.o;
  card.el.style.filter = p.blur > 0.05 ? `blur(${p.blur.toFixed(2)}px)` : "none";
  // 汇聚落进窗口的最后一段：露在窗口外面的部分裁掉（姿态这时已接近平放，按平面算）
  if (p.clip > 0 && p.view) {
    const hw = (card.w * p.s) / 2, hh = (card.h * p.s) / 2, v = p.view, k = p.clip / p.s;
    const ins = [v.y1 - (p.cy - hh), p.cx + hw - v.x2, p.cy + hh - v.y2, v.x1 - (p.cx - hw)].map((d) => Math.max(0, d) * k);
    card.el.style.clipPath = `inset(${ins.map((d) => d.toFixed(1) + "px").join(" ")})`;
  } else card.el.style.clipPath = "none";
  // 阴影随抬起高度加深：越高越虚、越远
  const h = p.sh;
  card.el.style.boxShadow =
    `0 1px 2px rgba(26,25,22,${(0.05 + 0.03 * h).toFixed(3)}), ` +
    `0 ${(6 + 10 * h).toFixed(1)}px ${(12 + 20 * h).toFixed(1)}px -8px rgba(26,25,22,${(0.08 + 0.08 * h).toFixed(3)}), ` +
    `0 ${(16 + 30 * h).toFixed(1)}px ${(40 + 60 * h).toFixed(1)}px -20px rgba(26,25,22,${(0.06 + 0.16 * h).toFixed(3)})`;
}

// ---------- 产品镜头：页面坐标 → 屏幕坐标 ----------
const WIN = { x: 96, y: 330 + 46, w: 1728, h: 670 - 46 };
const endShot = PLAN.shots.find((s) => s.type === "end");
const isWin = (s) => s?.type === "feature" && (s.layout || "window") === "window";
const featShots = PLAN.shots.filter(isWin);
const TRAVEL = 200;
const feats = featShots.map((s, k) => {
  const pg = PAGES[s.page];
  const hero = findItem(s.page, s.hero);
  // 窗口只取页面的焦点区域（左右各留 20px），放大到窗口宽度
  const PX = pg.focus.x - 20;
  const WS = WIN.w / (pg.focus.w + 40);
  const viewH = WIN.h / WS;
  // 页面缓慢下移，落点让主角停在窗口中间；stream 从页面顶上一路滚下来
  const scrollEnd = s.scroll?.[1] ?? clamp(hero.y + hero.h / 2 - viewH / 2, 0, Math.max(0, pg.doc.h - viewH));
  const scrollStart = s.scroll?.[0] ?? (s.move === "stream" ? 0 : Math.max(0, scrollEnd - 60));
  // 特写：比窗口里略大；太宽的组件把标注卡放到下方
  let sc = Math.min(WS * 1.12, 600 / hero.h);
  const side = hero.w * sc + 64 + 340 <= WIN.w ? "right" : "below";
  if (side === "below") sc = Math.min(sc, 1500 / hero.w, (WIN.h - 172) / hero.h);
  const bw = hero.w * sc;
  const LIFT = side === "right"
    ? { cx: (W - (bw + 64 + 340)) / 2 + bw / 2, cy: WIN.y + WIN.h / 2, s: sc, rx: 0, ry: 0, rz: 0, z: 120, o: 1, sh: 1.2 }
    : { cx: W / 2, cy: WIN.y + (WIN.h - 172) / 2, s: sc, rx: 0, ry: 0, rz: 0, z: 120, o: 1, sh: 1.2 };
  const hl = s.highlight && hero.hl?.[s.highlight]?.[0];
  const focus = hl ? { x: hero.x + hl.x, y: hero.y + hl.y, w: hl.w, h: hl.h } : { x: hero.x, y: hero.y, w: hero.w, h: hero.h };
  const next = isWin(PLAN.shots[s.i + 1]) ? PLAN.shots[s.i + 1] : null;
  return { s, k, page: s.page, pg, hero, PX, WS, scrollStart, scrollEnd, LIFT, side, focus, next, toEnd: !!endShot && PLAN.shots[s.i + 1] === endShot };
});

// 窗口本身：连续几个窗口镜头是一段。接开场时升起，其余各段在切点那一帧从右边接着速度进来；
// 段尾在切点前 0.3 秒向左加速离开，接落版时按落版做法退场
const winRuns = [];
PLAN.shots.forEach((s) => {
  if (!isWin(s)) return;
  const last = winRuns[winRuns.length - 1];
  if (last && last.b === s.start) { last.b = s.end; last.lastI = s.i; } else winRuns.push({ a: s.start, b: s.end, first: s, lastI: s.i });
});
function winState(t) {
  for (const r of winRuns) {
    const toEnd = !!endShot && PLAN.shots[r.lastI + 1] === endShot;
    const wi = r.first.ev.winIn;
    if (t >= (toEnd ? DUR + 1 : r.b) || t < r.a - (wi != null ? 1 : 0)) continue;
    let o = 1, x = 0, y = 0, s = 1;
    if (wi != null) {
      const k = out(seg(t, wi, wi + 0.95));
      o = k; y = 120 * (1 - k); s = 0.97 + 0.03 * k;
    } else {
      const k = seg(t, r.a, r.a + 0.38);
      x = TRAVEL * (1 - out4(k)); o = t < r.a ? 0 : 0.15 + 0.85 * clamp(k * 3);
    }
    if (!toEnd) {
      const e = in4(seg(t, r.b - 0.3, r.b));
      x -= TRAVEL * e; o *= 1 - 0.85 * e;
    } else if (endShot.close === "square") o *= 1 - seg(t, endShot.ev.winOut + 0.1, endShot.ev.winOut + 0.14);
    else {
      const e = seg(t, endShot.ev.winOut, endShot.ev.winOut + 0.6);
      o *= 1 - e * e; y += 140 * e * e;
    }
    return { o, x, y, s };
  }
  return { o: 0, x: 0, y: 0, s: 1 };
}
const WC = { x: 96 + 1728 / 2, y: 330 + 670 / 2 };
function viewRect(t) {
  const w = winState(t);
  const X = (x) => WC.x + (x - WC.x) * w.s + w.x, Y = (y) => WC.y + (y - WC.y) * w.s + w.y;
  return { x1: X(WIN.x), y1: Y(WIN.y), x2: X(WIN.x + WIN.w), y2: Y(WIN.y + WIN.h) };
}

// 换页（enter）：切点落在两边都在运动的那一帧。旧页在切点前 0.3 秒开始加速离开（四次方加速），
// 新页在切点那一帧以差不多的速度接着进来，0.38 秒减速停稳；同一轴、同一方向，两边不同时出现
function enterState(f, t) {
  const ev = f.s.ev;
  let o = 1, dx = 0, dy = 0, zk = 1, blur = 0;
  if (ev.sw) {
    const a = ev.sw[0];
    if (t < a) return { o: 0, dx, dy, zk, blur };
    const k = seg(t, a, a + 0.38), q = out4(k), en = f.s.enter;
    if (en === "cut") zk = 1 + 0.045 * (1 - out(seg(t, a, a + 0.5)));
    else if (en === "zoom") { zk = lerp(0.8, 1, q); blur = 16 * (1 - q); o = 0.15 + 0.85 * clamp(k * 3); }
    else if (en === "left") { dx = TRAVEL * (1 - q); o = 0.15 + 0.85 * clamp(k * 3); }
    else if (en === "up") { dy = TRAVEL * (1 - q); o = 0.15 + 0.85 * clamp(k * 3); }
  } else if (t < f.s.start - 0.3) o = 0;
  return { o, dx, dy, zk, blur };
}
function exitState(f, t) {
  let o = 1, dx = 0, dy = 0, zk = 1, blur = 0;
  if (f.next) {
    const a = f.next.ev.sw[0], en = f.next.enter;
    if (t >= a) return { o: 0, dx, dy, zk, blur };
    const e = in4(seg(t, a - 0.3, a));
    if (en === "zoom") { zk = 1 + 0.25 * e; blur = 18 * e; o = 1 - 0.85 * e; }
    else if (en === "left") { dx = -TRAVEL * e; o = 1 - 0.85 * e; }
    else if (en === "up") { dy = -TRAVEL * e; o = 1 - 0.85 * e; }
  }
  return { o, dx, dy, zk, blur };
}
function stageState(f, t) {
  const a = enterState(f, t), b = exitState(f, t);
  const gone = !f.next && !f.toEnd && t >= f.s.end;
  return { o: gone ? 0 : a.o * b.o, dx: a.dx + b.dx, dy: a.dy + b.dy, zk: a.zk * b.zk, blur: a.blur + b.blur };
}
const exitAt = (f) => (f.next ? f.next.ev.sw[0] : endShot && f.toEnd ? endShot.ev.winOut : f.s.end);
// 品牌色擦除：色块从右边加速盖过来，切点那一帧盖满、换页，再继续向左减速让开
function wipeSpan(t) {
  for (const f of feats) {
    if (f.s.enter !== "wipe" || !f.s.ev.sw) continue;
    const a = f.s.ev.sw[0];
    if (t >= a - 0.3 && t < a) return [1 - in4(seg(t, a - 0.3, a)), 1];
    if (t >= a && t < a + 0.38) return [0, 1 - out4(seg(t, a, a + 0.38))];
  }
  return null;
}
const scrollAt = (f, t) => lerp(f.scrollStart, f.scrollEnd, (f.s.move === "stream" ? out5 : io)(seg(t, f.s.ev.scroll[0], f.s.ev.scroll[1])));
function zoomK(f, t) {
  if (f.s.move !== "zoom") return 0;
  return io(seg(t, f.s.ev.lift[0], f.s.ev.lift[1]));   // 推近后不拉回：下一镜接着往里推
}
// 页面在窗口里的变换：view 坐标 = (tx, ty) + 页面坐标 × S
function stageXf(f, t) {
  const st = stageState(f, t);
  const base = { tx: -f.PX * f.WS, ty: -scrollAt(f, t) * f.WS, S: f.WS };
  const z = zoomK(f, t);
  if (z > 0) {
    const fc = { x: f.focus.x + f.focus.w / 2, y: f.focus.y + f.focus.h / 2 };
    // 截图页面：截图的一个像素在屏幕上最多放大到 3 个像素，再大就糊了
    const zMax = f.pg.imageScale ? Math.max(1, (3 * f.pg.imageScale) / f.WS) : 4;
    const Z = lerp(1, clamp((f.s.zoomTo || 520) / (f.focus.w * f.WS), 1, zMax), z);
    const S = f.WS * Z * (1 + 0.06 * seg(t, f.s.ev.lift[1], exitAt(f)));
    const h0 = { x: base.tx + fc.x * f.WS, y: base.ty + fc.y * f.WS };
    const T = { x: lerp(h0.x, WIN.w * 0.32, z), y: lerp(h0.y, WIN.h * 0.5, z) };
    Object.assign(base, { tx: T.x - fc.x * S, ty: T.y - fc.y * S, S });
  }
  const cx = WIN.w / 2, cy = WIN.h / 2;
  return { tx: cx + (base.tx + st.dx - cx) * st.zk, ty: cy + (base.ty + st.dy - cy) * st.zk, S: base.S * st.zk, o: st.o, blur: st.blur };
}
function toScreen(f, t, px, py) {
  const x = stageXf(f, t), w = winState(t);
  const sx = WIN.x + x.tx + px * x.S, sy = WIN.y + x.ty + py * x.S;
  return { x: WC.x + (sx - WC.x) * w.s + w.x, y: WC.y + (sy - WC.y) * w.s + w.y, s: x.S * w.s, o: x.o * w.o };
}
function slotPose(f, t, it = f.hero) {
  const p = toScreen(f, t, it.x + it.w / 2, it.y + it.h / 2);
  return { cx: p.x, cy: p.y, s: p.s, rx: 0, ry: 0, rz: 0, z: 0, o: p.o, sh: 0.35 };
}
function heroPose(f, t) {
  const ev = f.s.ev;
  if (t < ev.lift[0]) return slotPose(f, t);
  if (t < ev.lift[1]) return mixPose(slotPose(f, t), f.LIFT, io(seg(t, ev.lift[0], ev.lift[1])));
  const hold = (u) => ({ ...f.LIFT, s: f.LIFT.s * (1 + 0.025 * seg(u, ev.lift[1], ev.back[0])) });
  if (t < ev.back[0]) return hold(t);
  // 落回格子的同时，格子已经随页面开始离开：主角落进一个正在移动的格子，切点前不停下
  return mixPose(hold(ev.back[0]), slotPose(f, t), io(seg(t, ev.back[0], ev.back[1])));
}
// 组件局部坐标 → 屏幕坐标（按姿态和透视换算；透视 2400，原点在 62% 48%）
const OX = W * 0.62, OY = H * 0.48;
function poseToScreen(p, it, u, v) {
  const persp = 2400 / (2400 - p.z);
  const x = p.cx + (u - it.w / 2) * p.s, y = p.cy + (v - it.h / 2) * p.s;
  return { x: OX + (x - OX) * persp, y: OY + (y - OY) * persp, k: persp };
}

// cascade：窗口里看得见的一片组件，从主角向外依次浮起又落下
function waveSet(f) {
  if (f.s.move !== "cascade") return [];
  const t0 = f.s.ev.wave[0];
  const hc = slotPose(f, t0);
  const list = f.pg.items.filter((it) => it.i !== f.hero.i).map((it) => {
    const p = slotPose(f, t0, it);
    return { it, d: Math.hypot(p.cx - hc.cx, p.cy - hc.cy), p };
  }).filter(({ p, it }) => p.cy - (it.h * p.s) / 2 > WIN.y - 40 && p.cy + (it.h * p.s) / 2 < WIN.y + WIN.h + 40 && p.cx > WIN.x && p.cx < WIN.x + WIN.w)
    .sort((a, b) => a.d - b.d).slice(0, 12);
  const dmax = Math.max(1, ...list.map((x) => x.d));
  return list.map((x) => ({ it: x.it, delay: (x.d / dmax) * 0.7 }));
}
function waveBump(f, w, t) {
  const a = f.s.ev.wave[0] + w.delay;
  return Math.sin(Math.PI * seg(t, a, a + 0.7));
}

// ---------- 开场：一叠真实组件（stack），或散落在纵深里（scatter） ----------
const op = PLAN.shots.find((s) => s.type === "opening");
const SCATTER = op?.open === "scatter";
const STACK_BASE = [
  { cx: 1560, cy: 418, rx: 6, ry: -16, rz: 7, z: -160, o: 1, sh: 0.7 },
  { cx: 1488, cy: 520, rx: 6, ry: -16, rz: 2.5, z: -80, o: 1, sh: 0.8 },
  { cx: 1410, cy: 640, rx: 6, ry: -16, rz: -3, z: 0, o: 1, sh: 1 },
];
// 散落的落点：画面右半边，前后错开；第 0 个最靠前，留给下一镜的主角（手写的落点表，不用随机数）
const SCATTER_BASE = [
  [1480, 560, 40, 4, -10, 3], [1360, 300, -380, 8, -18, -9], [1700, 270, -600, -6, 14, 7],
  [1350, 810, -200, 10, 16, 5], [1730, 640, -480, 8, -20, 10], [1580, 930, -650, -10, 10, -4],
  [1610, 400, -260, -4, -12, -6], [1790, 950, -900, 6, 18, -8],
].map(([cx, cy, z, rx, ry, rz]) => ({ cx, cy, z, rx, ry, rz, o: 1, sh: 0.9 }));
const stackItems = op ? (op.stack || []).map((n) => findItem(op.page, n)) : [];
if (SCATTER && stackItems.length > SCATTER_BASE.length) throw new Error(`散落开场最多 ${SCATTER_BASE.length} 个组件`);
const HI = SCATTER ? Math.max(0, op.stack.indexOf(feats[0]?.s.hero)) : stackItems.length - 1;
const slotOf = (i) => (i === HI ? 0 : i < HI ? i + 1 : i);
const STACK = stackItems.map((it, i) =>
  SCATTER ? { ...SCATTER_BASE[slotOf(i)], s: 300 / it.w } : { ...STACK_BASE[STACK_BASE.length - stackItems.length + i], s: 470 / it.w });
function stackPose(i, t) {
  const ev = op.ev, base = STACK[i];
  if (SCATTER) {
    // 从纵深远处依次飞来，停留时各自继续漂一点
    const j = slotOf(i), k = out5(seg(t, ev.stackIn + 0.07 * j, ev.stackIn + 1.0 + 0.07 * j));
    const p = mixPose({ ...base, z: base.z - 1400, rz: base.rz * 2.5, o: 0 }, base, k);
    p.o = clamp(k * 2.5);
    const d = io(seg(t, ev.turn[0], ev.turn[1]));
    p.z += 50 * d; p.rz += (j % 2 ? 2 : -2) * d; p.ry += 4 * d;
    return p;
  }
  const k = out5(seg(t, ev.stackIn + i * 0.12, ev.stackIn + 0.9 + i * 0.12));
  const enter = { ...base, cy: base.cy + 300, rz: base.rz + 10, s: base.s * 0.9, o: 0 };
  const p = mixPose(enter, base, k);
  p.o = clamp(k * 3);
  const d = io(seg(t, ev.turn[0], ev.turn[1]));   // 停留时一叠档案缓慢转向观众
  p.ry += 5 * d;
  p.s *= 1 + 0.035 * d;
  return p;
}
function stackExit(i, t, p) {
  const e = out(seg(t, op.ev.backOut + (HI - 1 - i) * 0.08, op.ev.backOut + 0.6 + (HI - 1 - i) * 0.08));
  return { ...p, cy: p.cy + 90 * e, z: p.z - (SCATTER ? 500 * e : 0), o: p.o * (1 - e) };
}
const flyOf = (i) => {
  const fl = feats[0].s.ev.fly, d = 0.045 * slotOf(i);
  return [fl[0] + d, fl[1] + d];
};

// ---------- 窗口外的版式：split / hero / compare ----------
// 组件直接浮在纸面上。切点那一帧从右边接着速度飞进来（四次方减速，0.5 秒停稳），停留时缓慢转向观众、往左漂；
// 抬起时转正、前移；切点前 0.3 秒向左加速离开
const FLOAT_TRAVEL = 360;
const floats = PLAN.shots.filter((s) => s.type === "feature" && s.layout && s.layout !== "window").map((s) => {
  const items = [s.hero, ...(s.with || [])].map((k) => findItem(s.page, k));
  const it = items[0];
  const hl = s.highlight && it.hl?.[s.highlight]?.[0];
  const base = [];
  let wide = false;
  if (s.layout === "split") {
    items.forEach((x, j) => {
      const sc = Math.min(2.6, Math.max(1.5, Math.min(520 / x.h, 820 / x.w))) * (j ? 0.9 : 1);
      const w = x.w * sc, cx = w <= 840 ? 1410 + 36 * j : 1000 + w / 2 + 40 * j;
      base.push({ cx, cy: 0, s: sc, rx: 5, ry: -12, rz: j % 2 ? 2.2 : -1.6, z: -150 * j, o: 1, sh: j ? 0.7 : 1 });
    });
    let y = 0;
    const ys = items.map((x, j) => { const h = x.h * base[j].s; const c = y + h / 2; y += h * 0.8; return c; });
    const total = y + items[items.length - 1].h * base[items.length - 1].s * 0.2;
    ys.forEach((c, j) => (base[j].cy = 580 - total / 2 + c));
  } else if (s.layout === "hero") {
    let sc = Math.min(1680 / it.w, 420 / it.h);
    if (it.h * sc < 150) sc = Math.min(150 / it.h, 4);
    const hx = (hl ? hl.x + hl.w / 2 : it.w / 2) - it.w / 2;
    const cx = it.w * sc > 1680 ? Math.min(112 + (it.w * sc) / 2, 760 - hx * sc) : W / 2;
    base.push({ cx, cy: 470, s: sc, rx: 3, ry: 0, rz: 0, z: 0, o: 1, sh: 0.9 });
  } else {
    wide = items.every((x) => x.w / x.h > 2.2);
    if (wide) {
      const sc = Math.min(...items.map((x) => Math.min(1.5, 1460 / x.w, 250 / x.h)));
      const h0 = items[0].h * sc, h1 = items[1].h * sc, gap = 84, top = 600 - (h0 + gap + h1) / 2 + 20;
      items.forEach((x, j) => base.push({ cx: 112 + (x.w * sc) / 2, cy: j ? top + h0 + gap + h1 / 2 : top + h0 / 2, s: sc, rx: 0, ry: 0, rz: 0, z: 0, o: 1, sh: 0.8 }));
    } else {
      const sc = Math.min(...items.map((x) => Math.min(2.4, 700 / x.w, 520 / x.h)));
      items.forEach((x, j) => base.push({ cx: j ? 1340 : 580, cy: 600, s: sc, rx: 0, ry: j ? -4 : 4, rz: 0, z: 0, o: 1, sh: 0.8 }));
    }
  }
  let zoomS = null;
  if (s.layout === "hero" && s.move === "zoom" && hl) zoomS = Math.min(base[0].s * 2.2, Math.max(base[0].s, (s.zoomTo || 300) / hl.w));
  return { s, items, base, hl, wide, zoomS, toEnd: !!endShot && PLAN.shots[s.i + 1] === endShot };
});
function floatPose(F, j, t) {
  const s = F.s, ev = s.ev, b = F.base[j], it = F.items[j];
  const d = s.layout === "compare" ? 0.15 * j : 0.08 * j;
  const k = seg(t, ev.in[0] + d, ev.in[1] + d);
  if (t < ev.in[0] + d) return { ...b, o: 0 };
  const p = { ...b, cx: b.cx + FLOAT_TRAVEL * (1 - out4(k)), o: 0.15 + 0.85 * clamp(k * 3) };
  const u = seg(t, ev.in[1], s.end);
  p.ry += 4 * u;
  p.s *= 1 + 0.03 * u;
  p.cx -= 56 * u;
  const L = io(seg(t, ev.lift[0], ev.lift[1]));
  if (F.zoomS && j === 0) {
    const sNow = lerp(b.s, F.zoomS, L) * (1 + 0.03 * u) * (1 + 0.05 * seg(t, ev.lift[1], s.end));
    const hx = F.hl.x + F.hl.w / 2 - it.w / 2, hy = F.hl.y + F.hl.h / 2 - it.h / 2;
    const tx = lerp(p.cx + hx * p.s, 600, L), ty = lerp(p.cy + hy * p.s, 470, L);
    Object.assign(p, { s: sNow, cx: tx - hx * sNow, cy: ty - hy * sNow });
  } else if (j === 0) {
    p.z += (s.layout === "compare" ? 40 : 100) * L;
    p.s *= 1 + (s.layout === "compare" ? 0.01 : 0.04) * L;
    p.rx -= b.rx * 0.7 * L; p.ry -= (b.ry + 4 * u) * 0.6 * L; p.rz -= b.rz * 0.6 * L;
    p.sh += 0.5 * L;
  } else if (s.layout === "compare") {
    p.z += 40 * L; p.s *= 1 + 0.01 * L;
  } else { p.o *= 1 - 0.85 * L; p.z -= 160 * L; p.cy += 40 * L; }
  if (F.toEnd) {
    const w0 = endShot.ev.winOut;
    if (endShot.close === "square") { if (t >= w0 + 0.1) p.o = 0; }
    else { const e = seg(t, w0, w0 + 0.6); p.cy += 140 * e * e; p.o *= 1 - e * e; }
  } else {
    if (t >= s.end) return { ...p, o: 0 };
    const e = in4(seg(t, s.end - 0.3, s.end));
    p.cx -= FLOAT_TRAVEL * e; p.o *= 1 - 0.85 * e;
  }
  return p;
}
function floatRect(F, j, t) {
  const p = floatPose(F, j, t), it = F.items[j];
  const c = [[0, 0], [it.w, 0], [0, it.h], [it.w, it.h]].map(([u, v]) => poseToScreen(p, it, u, v));
  const xs = c.map((q) => q.x), ys = c.map((q) => q.y);
  return { x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys), p };
}

// ---------- Canvas：角点、尺寸线、标注卡、数字卡、括线 ----------
// Canvas 上画的字同时记进 CT，window.TEXTS 把它们交给 readcheck（数字卡、计数报的是数到的最终值：整块字从出现起就算）
let CT = [];
const SANS = '"Film Sans"', SERIF = '"Film Serif", "Film Sans"', MONO = '"Film Mono", "Film Sans"';
function say(id, text, x, y, size, a, align = "left", base = "alphabetic") {
  if (!text) return;
  ctx.fillText(text, x, y);
  const w = ctx.measureText(text).width;
  const x0 = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
  const y0 = base === "middle" ? y - size * 0.6 : y - size * 0.85;
  CT.push({ id, text, x0, y0, x1: x0 + w, y1: y0 + size * 1.15, a });
}
function corners(x1, y1, x2, y2) {
  const g = 14, n = 9;
  [[x1 - g, y1 - g], [x2 + g, y1 - g], [x1 - g, y2 + g], [x2 + g, y2 + g]].forEach(([x, y]) => ctx.fillRect(x - n / 2, y - n / 2, n, n));
}
// 纸色衬底的三行标注卡：来源或编号、一个事实、补充说明
function card3(id, m, bx, by) {
  ctx.font = `700 30px ${SANS}`;
  const w1 = ctx.measureText(m.title).width;
  ctx.font = `500 22px ${SANS}`;
  const w2 = ctx.measureText(m.sub || "").width;
  ctx.fillStyle = "#f4f1ea";
  ctx.fillRect(bx, by, Math.max(300, w1 + 40, w2 + 40), m.sub ? 132 : 100);
  ctx.textBaseline = "middle";
  const a = ctx.globalAlpha;
  ctx.font = `500 20px ${MONO}`;
  ctx.fillStyle = "#4a4740";
  say(id + "-k", m.kicker || "", bx + 14, by + 22, 20, a, "left", "middle");
  ctx.font = `700 30px ${SANS}`;
  ctx.fillStyle = "#1a1916";
  say(id + "-t", m.title, bx + 14, by + 66, 30, a, "left", "middle");
  ctx.font = `500 22px ${SANS}`;
  ctx.fillStyle = "#7b776d";
  say(id + "-s", m.sub || "", bx + 14, by + 108, 22, a, "left", "middle");
}
function drawMarks(f, t) {
  const ev = f.s.ev, m = f.s.mark;
  if (!m || f.s.move === "zoom") return;
  const a = out(seg(t, ev.marks[0], ev.marks[1])) * (1 - seg(t, ev.out, ev.out + 0.3));
  if (a <= 0) return;
  const k = seg(t, ev.marks[0], ev.marks[1]);
  const p = heroPose(f, t);
  const tl = poseToScreen(p, f.hero, 0, 0), br = poseToScreen(p, f.hero, f.hero.w, f.hero.h);
  const x1 = tl.x, y1 = tl.y, x2 = br.x, y2 = br.y;
  ctx.globalAlpha = a;
  ctx.fillStyle = "#1a1916";
  ctx.strokeStyle = "#1a1916";
  ctx.lineWidth = 1.5;
  corners(x1, y1, x2, y2);
  const kl = out(seg(k, 0.15, 0.9));
  let bx, by;
  ctx.beginPath();
  if (f.side === "right") {
    const lx = x2 + 64;
    ctx.moveTo(lx, y1); ctx.lineTo(lx, lerp(y1, y2, kl)); ctx.stroke();
    [y1, y2].forEach((y) => { ctx.beginPath(); ctx.moveTo(lx - 10, y); ctx.lineTo(lx + 10, y); ctx.stroke(); });
    bx = lx + 12; by = y1 - 8;
  } else {
    const ly = y2 + 40;
    ctx.moveTo(x1, ly); ctx.lineTo(lerp(x1, x2, kl), ly); ctx.stroke();
    [x1, x2].forEach((x) => { ctx.beginPath(); ctx.moveTo(x, ly - 10); ctx.lineTo(x, ly + 10); ctx.stroke(); });
    bx = x1 - 14; by = ly + 14;
  }
  ctx.globalAlpha = a * out(seg(k, 0.4, 1));
  card3(`s${f.s.i + 1}-card`, m, bx, by);
  ctx.globalAlpha = 1;
}
function sweep(rects, p, it, k, fade) {
  const total = rects.reduce((n, r) => n + r.w, 0);
  let left = total * k;
  for (const r of rects) {
    const w = Math.min(r.w, left);
    left -= w;
    if (w <= 0) break;
    const q1 = poseToScreen(p, it, r.x, r.y), q2 = poseToScreen(p, it, r.x + w, r.y + r.h);
    ctx.fillStyle = ACCENT;
    ctx.globalAlpha = fade * 0.12;
    ctx.fillRect(q1.x - 4, q1.y - 2, q2.x - q1.x + 8, q2.y - q1.y + 4);
    ctx.globalAlpha = fade;
    ctx.fillRect(q1.x - 4, q2.y + 3, q2.x - q1.x + 8, 5);
  }
}
function drawSweep(f, t) {
  if (f.s.move !== "mark" || !f.s.highlight) return;
  const rects = f.hero.hl?.[f.s.highlight], ev = f.s.ev;
  if (!rects?.length || t < ev.sweep[0]) return;
  const a = 1 - seg(t, ev.out, ev.out + 0.3);
  if (a <= 0) return;
  sweep(rects, heroPose(f, t), f.hero, out(seg(t, ev.sweep[0], ev.sweep[1])), a);
  ctx.globalAlpha = 1;
}
function drawCount(f, t) {
  if (f.s.move !== "zoom") return;
  const ev = f.s.ev, st = f.s.stat || {}, m = f.s.mark || {};
  const a = out(seg(t, ev.count[0] - 0.3, ev.count[0] + 0.2)) * (1 - seg(t, ev.out, ev.out + 0.3));
  if (a <= 0) return;
  const k = out(seg(t, ev.count[0], ev.count[1]));
  const c1 = toScreen(f, t, f.focus.x, f.focus.y), c2 = toScreen(f, t, f.focus.x + f.focus.w, f.focus.y + f.focus.h);
  ctx.globalAlpha = a;
  ctx.fillStyle = "#1a1916";
  corners(c1.x - 6, c1.y - 6, c2.x + 6, c2.y + 6);
  statCard(`s${f.s.i + 1}-stat`, st, m, WIN.x + WIN.w * 0.6, WIN.y + WIN.h * 0.5 - 170, k, a);
}
const fmt = (st, v) => `${st.prefix || ""}${v.toFixed(st.decimals ?? 0)}${st.suffix || ""}`;
// 数字卡：从 0 数到目标值，下面一条比例条和两行说明
function statCard(id, st, m, bx, by, k, a) {
  const bw = 600, bh = 340;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.shadowColor = "rgba(26,25,22,0.18)"; ctx.shadowBlur = 50; ctx.shadowOffsetY = 18;
  ctx.fillStyle = "#faf8f3";
  ctx.fillRect(bx, by, bw, bh);
  ctx.restore();
  ctx.globalAlpha = a;
  ctx.textBaseline = "alphabetic";
  ctx.font = `500 20px ${MONO}`;
  ctx.fillStyle = "#4a4740";
  say(id + "-k", m.kicker || "", bx + 40, by + 56, 20, a);
  ctx.font = `400 150px ${SERIF}`;
  ctx.fillStyle = "#1a1916";
  ctx.fillText(fmt(st, (st.to ?? 0) * k), bx + 34, by + 196);
  // 计数中的数字每帧都在变：按最终值整块报给 readcheck（和逐字打出同一个规矩）
  const fin = fmt(st, st.to ?? 0), fw = ctx.measureText(fin).width;
  CT.push({ id: id + "-n", text: fin, x0: bx + 34, y0: by + 196 - 120, x1: bx + 34 + fw, y1: by + 196 + 30, a });
  if (st.bar != null) {
    ctx.fillStyle = "#ddd7cb";
    ctx.fillRect(bx + 40, by + 228, bw - 80, 6);
    ctx.fillStyle = ACCENT;
    ctx.fillRect(bx + 40, by + 228, (bw - 80) * clamp((st.bar / 100) * k), 6);
  }
  ctx.font = `700 28px ${SANS}`;
  ctx.fillStyle = "#1a1916";
  say(id + "-t", m.title || "", bx + 40, by + 280, 28, a);
  ctx.font = `500 21px ${SANS}`;
  ctx.fillStyle = "#7b776d";
  say(id + "-s", m.sub || "", bx + 40, by + 314, 21, a);
  ctx.globalAlpha = 1;
}
function drawFloat(F, t) {
  const s = F.s, ev = s.ev, m = s.mark || {}, id = `s${s.i + 1}`;
  const fade = F.toEnd ? 1 - seg(t, endShot.ev.winOut, endShot.ev.winOut + 0.1) : 1 - seg(t, ev.out, ev.out + 0.3);
  if (fade <= 0 || t < ev.in[0]) return;
  ctx.fillStyle = "#1a1916";
  ctx.strokeStyle = "#1a1916";
  ctx.lineWidth = 1.5;
  if (s.layout === "compare") return drawCompare(F, t, fade);
  const r = floatRect(F, 0, t), it = F.items[0];
  if (F.zoomS) {
    if (t < ev.count[0] - 0.3) return;
    const a = out(seg(t, ev.count[0] - 0.3, ev.count[0] + 0.2)) * fade;
    const q1 = poseToScreen(r.p, it, F.hl.x, F.hl.y), q2 = poseToScreen(r.p, it, F.hl.x + F.hl.w, F.hl.y + F.hl.h);
    ctx.globalAlpha = a;
    corners(q1.x - 6, q1.y - 6, q2.x + 6, q2.y + 6);
    statCard(id + "-stat", s.stat || {}, m, 1180, 300, out(seg(t, ev.count[0], ev.count[1])), a);
    ctx.globalAlpha = 1;
    return;
  }
  if (s.move === "mark" && F.hl && t >= ev.sweep[0]) {
    sweep(it.hl[s.highlight], r.p, it, out(seg(t, ev.sweep[0], ev.sweep[1])), fade);
    ctx.fillStyle = "#1a1916";
  }
  if (!s.mark || t < ev.marks[0]) { ctx.globalAlpha = 1; return; }
  const k = seg(t, ev.marks[0], ev.marks[1]);
  const x1 = Math.max(r.x1, 40), x2 = Math.min(r.x2, W - 40);
  ctx.globalAlpha = out(k) * fade;
  corners(x1, r.y1, x2, r.y2);
  let by = r.y2 + 34;
  if (by + 132 > 990) by = r.y1 - 34 - 132;
  ctx.globalAlpha = out(seg(k, 0.4, 1)) * fade;
  card3(id + "-card", m, x1 - 14, by);
  ctx.globalAlpha = 1;
}
function drawCompare(F, t, fade) {
  const s = F.s, ev = s.ev, labels = s.labels || [], m = s.mark || {}, id = `s${s.i + 1}`;
  const rs = F.items.map((_, j) => floatRect(F, j, t));
  ctx.textBaseline = "alphabetic";
  ctx.font = `500 20px ${MONO}`;
  rs.forEach((r, j) => {
    if (!labels[j]) return;
    const a = out(seg(t, ev.in[1] + 0.15 * j - 0.1, ev.in[1] + 0.15 * j + 0.3)) * fade;
    ctx.globalAlpha = a;
    ctx.fillStyle = "#4a4740";
    if (F.wide) say(`${id}-lab${j}`, labels[j], r.x1, r.y1 - 16, 20, a);
    else say(`${id}-lab${j}`, labels[j], (r.x1 + r.x2) / 2, r.y2 + 40, 20, a, "center");
  });
  ctx.textAlign = "left";
  if (t < ev.join[0]) { ctx.globalAlpha = 1; return; }
  const k = out(seg(t, ev.join[0], ev.join[1]));
  ctx.globalAlpha = fade;
  ctx.fillStyle = "#1a1916";
  ctx.beginPath();
  const ta = out(seg(t, ev.join[1] - 0.2, ev.join[1] + 0.3)) * fade;
  if (F.wide) {
    const x = Math.max(rs[0].x2, rs[1].x2) + 36, y0 = (rs[0].y1 + rs[0].y2) / 2, y1 = (rs[1].y1 + rs[1].y2) / 2, ym = (y0 + y1) / 2;
    ctx.moveTo(x - 14, y0); ctx.lineTo(x, y0); ctx.lineTo(x, lerp(y0, ym, k));
    ctx.moveTo(x - 14, y1); ctx.lineTo(x, y1); ctx.lineTo(x, lerp(y1, ym, k));
    if (k > 0.98) { ctx.moveTo(x, ym); ctx.lineTo(x + 26, ym); }
    ctx.stroke();
    ctx.globalAlpha = ta;
    ctx.textBaseline = "middle";
    ctx.font = `700 30px ${SANS}`;
    say(`${id}-join-t`, m.title || "", x + 40, ym - (m.sub ? 16 : 0), 30, ta, "left", "middle");
    ctx.font = `500 21px ${SANS}`;
    ctx.fillStyle = "#7b776d";
    if (m.sub) say(`${id}-join-s`, m.sub, x + 40, ym + 22, 21, ta, "left", "middle");
  } else {
    const y = Math.max(rs[0].y2, rs[1].y2) + 70, x0 = (rs[0].x1 + rs[0].x2) / 2, x1 = (rs[1].x1 + rs[1].x2) / 2, xm = (x0 + x1) / 2;
    ctx.moveTo(x0, y - 14); ctx.lineTo(x0, y); ctx.lineTo(lerp(x0, xm, k), y);
    ctx.moveTo(x1, y - 14); ctx.lineTo(x1, y); ctx.lineTo(lerp(x1, xm, k), y);
    if (k > 0.98) { ctx.moveTo(xm, y); ctx.lineTo(xm, y + 22); }
    ctx.stroke();
    ctx.globalAlpha = ta;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 30px ${SANS}`;
    say(`${id}-join-t`, (m.title || "") + (m.sub ? `  ·  ${m.sub}` : ""), xm, y + 50, 30, ta, "center", "middle");
    ctx.textAlign = "left";
  }
  ctx.globalAlpha = 1;
}
const endFrom = (() => {
  const F = endShot && floats.find((x) => x.s === PLAN.shots[endShot.i - 1]);
  if (!F) return { x: 96, y: 330, w: 1728, h: 670 };
  const rs = F.items.map((_, j) => floatRect(F, j, endShot.ev.winOut));
  const x1 = Math.max(0, Math.min(...rs.map((r) => r.x1))), y1 = Math.min(...rs.map((r) => r.y1));
  return { x: x1, y: y1, w: Math.min(W, Math.max(...rs.map((r) => r.x2))) - x1, h: Math.max(...rs.map((r) => r.y2)) - y1 };
})();
// stream：列表滚动时，窗口右上角的计数跟着滚过的条数往上走
function drawTicker(f, t) {
  if (f.s.move !== "stream" || !f.s.stat) return;
  const ev = f.s.ev, st = f.s.stat;
  const a = out(seg(t, ev.scroll[0] + 0.15, ev.scroll[0] + 0.45)) * (1 - seg(t, ev.lift[0], ev.lift[0] + 0.4));
  if (a <= 0) return;
  const n = Math.round((st.to || 0) * out5(seg(t, ev.scroll[0], ev.scroll[1])));
  const w = winState(t), x = WIN.x + WIN.w - 40 + w.x, y = WIN.y + 34 + w.y;
  ctx.globalAlpha = a * w.o;
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.font = `400 84px ${SERIF}`;
  ctx.fillStyle = "#1a1916";
  ctx.fillText(String(n), x, y + 76);
  const fin = String(st.to || 0), fw = ctx.measureText(fin).width;
  CT.push({ id: `s${f.s.i + 1}-tick-n`, text: fin, x0: x - fw, y0: y + 6, x1: x, y1: y + 96, a: a * w.o });
  ctx.font = `500 18px ${MONO}`;
  ctx.fillStyle = "#4a4740";
  say(`s${f.s.i + 1}-tick-l`, st.label || "", x, y + 108, 18, a * w.o, "right");
  ctx.textAlign = "left";
  ctx.globalAlpha = 1;
}

// ---------- 每一帧 ----------
let stackCards = [], stackSrc = [], heroCards = [], heroSrc = [], waves = [], floatCards = [];
const wipeEl = document.getElementById("pp-wipe");
const winEl = document.getElementById("pp-win");
const morphEl = document.getElementById("pp-morph");
const morphIn = morphEl.querySelector("i");
const endEl = endShot && shotEl(endShot.i);
const endSq = endEl?.querySelector(".pp-sq");
const typeEls = endEl ? [...endEl.querySelectorAll(".pp-c")] : [];
const caret = endEl?.querySelector(".pp-caret");
const slotWords = op ? [...shotEl(op.i).querySelectorAll(".pp-slot")].map((s) => [...s.querySelectorAll(".pp-sw")]) : [];
const slotN = op?.slots?.length || 1;
// 主角的克隆只在"离开格子"的时候出现：汇聚飞行中、抬起到落回；其余时间原位的真组件在场
function heroOn(f, t) {
  const ev = f.s.ev;
  if (f.s.fromStack && t < ev.fly[1]) return true;
  return t >= ev.lift[0] && t < exitAt(f);
}
// 不带画框的镜头（bare：比如库示范片最后只署 NEO-Cine 的片尾卡）：画框小字在切点前后 0.3 秒里淡出
function furnAlpha(t) {
  let a = 1;
  for (const s of PLAN.shots) if (s.bare) a = Math.min(a, 1 - seg(t, s.start - 0.3, s.start));
  return a;
}
function frame(t) {
  const w = winState(t);
  winEl.style.opacity = w.o;
  winEl.style.transform = `translate(${w.x.toFixed(2)}px, ${w.y.toFixed(2)}px) scale(${w.s})`;
  feats.forEach((f) => {
    const x = stageXf(f, t);
    const el = stageOf(f.page);
    el.style.visibility = x.o > 0.001 ? "visible" : "hidden";
    el.style.opacity = x.o;
    el.style.transform = `translate(${x.tx}px, ${x.ty}px) scale(${x.S})`;
    el.style.filter = x.blur > 0.05 ? `blur(${(x.blur / x.S).toFixed(2)}px)` : "none";
    PATHS[f.k].style.opacity = x.o;
  });
  const ws = wipeSpan(t);
  wipeEl.style.visibility = ws ? "visible" : "hidden";
  if (ws) wipeEl.style.transform = `translateX(${(ws[0] * WIN.w).toFixed(1)}px) scaleX(${(ws[1] - ws[0]).toFixed(4)})`;
  // 特写时窗口其余内容退后（推近镜头不用）
  dim.style.opacity = feats.reduce((sum, f) => {
    const ev = f.s.ev;
    if (f.s.move === "zoom") return sum;
    return sum + 0.74 * (io(seg(t, ev.lift[0] + 0.05, ev.lift[0] + 0.95)) - io(seg(t, ev.back[0], ev.back[1])));
  }, 0);
  const f0 = feats[0];
  stackCards.forEach((c, i) => {
    const p = stackPose(i, t);
    if (i === HI && f0?.s.fromStack) {
      if (t < f0.s.ev.fly[0]) place(c, p);
      return;
    }
    if (SCATTER && f0?.s.assemble) {
      const [a, b] = flyOf(i);
      stackSrc[i].style.visibility = t < b ? "hidden" : "visible";
      if (t < a) return place(c, p);
      if (t >= b) return place(c, { o: 0 });
      const q = io(seg(t, a, b));
      const m = mixPose(stackPose(i, a), slotPose(f0, t, stackItems[i]), q);
      m.z += 160 * Math.sin(Math.PI * q);
      m.o = 1;
      return place(c, { ...m, clip: seg(q, 0.7, 1), view: viewRect(t) });
    }
    place(c, stackExit(i, t, p));
  });
  waves.forEach(({ f, list }) => list.forEach((wv) => {
    const b = waveBump(f, wv, t);
    wv.src.style.visibility = b > 0 ? "hidden" : "visible";
    if (b <= 0) return place(wv.card, { o: 0 });
    const p = slotPose(f, t, wv.it);
    place(wv.card, { ...p, z: 170 * b, s: p.s * (1 + 0.08 * b), rx: -9 * b, sh: 0.35 + 1.0 * b });
  }));
  feats.forEach((f, k) => {
    const c = heroCards[k], ev = f.s.ev;
    if (!c) return;   // 推近镜头不克隆主角，原位直接放大
    const on = heroOn(f, t);
    heroSrc[k].style.visibility = on ? "hidden" : "visible";
    if (f.s.fromStack && t < ev.fly[0]) return;
    if (!on) return place(c, { o: 0 });
    if (f.s.fromStack && t < ev.fly[1]) {
      const q = io(seg(t, ev.fly[0], ev.fly[1]));
      const p = mixPose(stackPose(HI, ev.fly[0]), slotPose(f, t), q);
      p.z += 160 * Math.sin(Math.PI * q);
      p.o = 1;
      return place(c, p);
    }
    const x = stageXf(f, t), hp = heroPose(f, t);
    place(c, { ...hp, blur: x.blur ? x.blur / Math.max(0.2, hp.s) : 0 });
  });
  floats.forEach((F, q) => floatCards[q].forEach((c, j) => place(c, floatPose(F, j, t))));
  // 槽位轮换：按切换时刻数出现在该显示第几个词
  if (slotWords.length) {
    const idx = (op.ev.slots || []).filter((x) => x <= t).length % slotN;
    slotWords.forEach((ws) => ws.forEach((el, j) => (el.style.display = j % slotN === idx ? "inline" : "none")));
  }
  if (endShot?.close === "square") {
    const ev = endShot.ev, k = io(seg(t, ev.morph[0], ev.morph[1]));
    const on = t >= ev.winOut && t < ev.morph[1];
    morphEl.style.visibility = on ? "visible" : "hidden";
    endSq.style.visibility = t >= ev.morph[1] ? "visible" : "hidden";
    if (on) {
      const x = lerp(endFrom.x, 112, k), y = lerp(endFrom.y, 544, k), sw = lerp(endFrom.w, 46, k), sh = lerp(endFrom.h, 46, k);
      morphEl.style.transform = `translate(${(x - 96).toFixed(2)}px, ${(y - 330).toFixed(2)}px) scale(${(sw / 1728).toFixed(5)}, ${(sh / 670).toFixed(5)})`;
      morphEl.style.borderRadius = `${(18 * (1 - k)).toFixed(1)}px`;
      morphEl.style.opacity = seg(t, ev.winOut, ev.winOut + 0.1);
      morphIn.style.opacity = 1 - seg(t, ev.morph[0] + 0.1, ev.morph[0] + 0.55);
    }
  }
  if (typeEls.length && endShot.ev.type) {
    const [a, b] = endShot.ev.type;
    const n = t < a ? 0 : Math.min(typeEls.length, Math.floor((t - a) / ((b - a) / typeEls.length)) + 1);
    typeEls.forEach((el, j) => (el.style.display = j < n ? "inline" : "none"));
    caret.style.opacity = t < a - 0.15 ? 0 : t < b ? 1 : Math.floor((t - b) / 0.42) % 2 ? 0 : 1;
  }
  const fa = furnAlpha(t);
  FURN.forEach((el) => (el.style.opacity = fa));
  CT = [];
  ctx.clearRect(0, 0, W, H);
  feats.forEach((f) => { drawMarks(f, t); drawSweep(f, t); drawCount(f, t); drawTicker(f, t); });
  floats.forEach((F) => drawFloat(F, t));
}

// ---------- 文字入场、退场：一条按时间算的补间表 ----------
const tl = new Timeline();
const blurIn = (els, at, d = 0.6, st = 0.08) =>
  els.length && tl.fromTo(els, { opacity: 0, x: 120, filter: "blur(10px)" }, { opacity: 1, x: 0, filter: "blur(0px)", duration: d, ease: "power4.out", stagger: st }, at);
function titleIn(el, mode, at) {
  if (mode === "waterfall") {
    // 逐词从下方甩上来，后一个词在前一个落定之前就出发，间隔越来越短
    const ws = el.querySelectorAll(".pp-w");
    tl.fromTo(ws, { yPercent: 115, opacity: 0, rotation: 5 },
      { yPercent: 0, opacity: 1, rotation: 0, duration: 0.7, ease: "power4.out", stagger: { amount: 0.09 * (ws.length - 1), ease: "power1.out" } }, at);
    return 0.25;
  }
  if (mode === "slices") {
    // 横条从左右不同偏移弹回，一道品牌色细线划过
    el.querySelectorAll(".pp-sl-s").forEach((sl, k) =>
      tl.fromTo(sl, { x: (k % 2 ? 1 : -1) * (70 + 24 * k), opacity: 0 }, { x: 0, opacity: 1, duration: 0.62, ease: "expo.out" }, at + 0.035 * k));
    const bar = el.querySelector(".pp-sl-bar");
    tl.fromTo(bar, { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: 0.32, ease: "power2.out" }, at);
    tl.to(bar, { opacity: 0, duration: 0.3, ease: "power1.in" }, at + 0.34);
    return 0.2;
  }
  return null;   // blur：和中文一起逐行模糊入场
}
PLAN.shots.forEach((s) => {
  const el = shotEl(s.i);
  const r = el.querySelectorAll(".pp-r");
  if (s.type === "opening") {
    // 英文大标题从第 0 帧就在；其余文字逐行模糊入场；切点前 0.35 秒一起向左加速离开
    tl.fromTo(r, { opacity: 0, y: 34, filter: "blur(14px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.8, ease: "power3.out", stagger: 0.1 }, s.ev.textIn);
    const cue = el.querySelector(".pp-cue");
    if (cue) tl.fromTo(cue, { opacity: 0, y: 24, filter: "blur(10px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.5, ease: "power3.out" }, s.ev.noteIn - 0.1);
    tl.to(el.querySelectorAll(".pp-r, .pp-hold, .pp-cue"), { opacity: 0, x: -140, filter: "blur(8px)", duration: 0.35, ease: "power3.in", stagger: 0.02 }, s.ev.textOut);
  } else if (s.type === "feature") {
    const en = el.querySelector(".pp-en");
    const lag = titleIn(en, s.title, s.ev.titleIn);
    blurIn(r, s.ev.titleIn + (lag ?? 0));
    tl.to([en, ...el.querySelectorAll(".pp-zh, .pp-note, .pp-eyebrow")], { opacity: 0, x: -140, filter: "blur(8px)", duration: 0.3, ease: "power3.in", stagger: 0.02 }, s.ev.exit[0]);
  } else if (s.type === "statement") {
    // 章节大字：切点那一刻进来，切点前 0.3 秒向左离开（最后一镜不离开）；停留时整句很慢地推近，不完全停住
    const en = el.querySelector(".pp-en");
    const lag = titleIn(en, s.title, s.ev.titleIn);
    blurIn(r, s.ev.titleIn + (lag ?? 0));
    if (s.ev.exit) tl.to([en, ...el.querySelectorAll(".pp-zh, .pp-eyebrow")], { opacity: 0, x: -160, filter: "blur(8px)", duration: 0.3, ease: "power3.in", stagger: 0.03 }, s.ev.exit[0]);
    tl.fromTo(el, { scale: 1 }, { scale: 1.03, transformOrigin: "0% 50%", duration: s.end - s.start, ease: "none" }, s.start);
  } else {
    // 落版：方块收拢时，中文名和地址等方块落定再进
    const at = s.close === "square" ? s.ev.morph[1] - 0.12 : s.ev.in;
    tl.fromTo(r, { opacity: 0, y: 40, filter: "blur(16px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.9, ease: "power3.out", stagger: 0.12 }, at);
    if (s.ev.exit) tl.to([...el.querySelectorAll(".pp-en, .pp-r, .pp-sq")], { opacity: 0, x: -160, filter: "blur(8px)", duration: 0.3, ease: "power3.in", stagger: 0.03 }, s.ev.exit[0]);
  }
});
tl.fromTo("#pp-track b", { scaleX: 0 }, { scaleX: 1, duration: DUR, ease: "none" }, 0);

// ---------- 画面上该读的字（readcheck） ----------
// DOM 里的字：theme.mjs 给每块字写了 data-pp-text（整块的完整文字；槽位按最后停住的那个词，逐字打出按整句），
// 一块字的每个部件（逐词、切片、逐字）都到了半透明以上才算出现；逐字打出从第一个字出现起就算
const effOpacity = (el) => {
  let o = 1;
  for (let e = el; e && e.id !== "pp-root"; e = e.parentElement) {
    const cs = getComputedStyle(e);
    if (cs.display === "none" || cs.visibility === "hidden") return 0;
    o *= +cs.opacity;
  }
  return o;
};
const TEXT_EL = [...document.querySelectorAll("[data-pp-text]")];
function domTexts() {
  const outl = [];
  for (const el of TEXT_EL) {
    const typed = el.classList.contains("pp-ty");
    const parts = [...el.querySelectorAll(typed ? ".pp-c" : ".pp-w, .pp-sl-s, .pp-line")];
    const alpha = parts.length ? (typed ? Math.max(...parts.map(effOpacity)) : Math.min(...parts.map(effOpacity))) : effOpacity(el);
    if (alpha < 0.5) continue;
    const r = el.getBoundingClientRect();
    if (!r.width) continue;
    outl.push({ id: el.getAttribute("data-pp-id"), text: el.getAttribute("data-pp-text"), x0: r.left, y0: r.top, x1: r.right, y1: r.bottom });
  }
  return outl;
}

// ---------- 页面约定 ----------
window.DUR = DUR;
window.EV = DATA.ev;
window.render = (t) => { tl.render(t); frame(t); };
window.TEXTS = (t) => [...domTexts(), ...CT.filter((c) => c.a >= 0.5).map(({ id, text, x0, y0, x1, y1 }) => ({ id, text, x0, y0, x1, y1 }))];

// 字体（影片自己的三种 + 站点的）、冻结页面里的图片都到齐，再克隆组件
await Promise.all([["400 40px", "Film Serif"], ["500 40px", "Film Sans"], ["700 40px", "Film Sans"], ["500 40px", "Film Mono"]]
  .map(([w, f]) => document.fonts.load(`${w} "${f}"`, "A字1")));
await document.fonts.ready;
await Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((r) => (i.onload = i.onerror = r)))));
stackCards = stackItems.map((it) => cloneItem(op.page, it));
stackSrc = stackItems.map((it) => srcOf(op.page, it));
waves = feats.map((f) => ({ f, list: waveSet(f).map((wv) => ({ ...wv, src: srcOf(f.page, wv.it), card: cloneItem(f.page, wv.it) })) }));
heroCards = feats.map((f) => (f.s.move === "zoom" ? null : f.s.fromStack ? stackCards[HI] : cloneItem(f.page, f.hero)));
heroSrc = feats.map((f) => srcOf(f.page, f.hero));
floatCards = floats.map((F) => F.items.map((it) => cloneItem(F.s.page, it)));
// 只给窗口外版式提供组件的页面，不在窗口里出现
STAGES.forEach((el) => { if (!feats.some((f) => f.page === el.getAttribute("data-page"))) el.style.visibility = "hidden"; });
// 克隆出来的组件里可能还有没解码完的图片
await Promise.all([...space.querySelectorAll("img")].map((i) => (i.complete ? 0 : new Promise((r) => (i.onload = i.onerror = r)))));
window.render(0);
window.READY = true;
