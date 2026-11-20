// 游戏发布的整片页面（工具包 kit/page/，tools/build.py 每次复制到工程的 page/ 里）：实机录像和官方主视觉铺满全画面，
// 字幕牌用游戏自己 UI 的材质，最后立绘按拍擦入、铁板横幅滑入、Logo 落地、行动号召。按本库的页面约定逐帧画（TECHNIQUE.md §2）：
//   window.DUR       片长（秒）
//   window.render(t) 画 t 秒那一帧，返回一个 Promise（等这一帧要用的录像帧解码完）：镜头是 t 的纯函数，字幕牌等的入场由 tween.js 按 t 算
//   window.EV        画面事件（切点、推近、字幕牌、立绘、横幅、Logo 落地、行动号召，带 sound 的要配音效），tools/mix.py 用
//   window.TEXTS(t)  画面上该读的字（字幕牌、行动号召、片尾卡），core/render/readcheck.mjs 用
//   window.READY     字体、静图、第一帧都就绪
// 录像不用 <video> 实时播放：tools/clips.py 事先把每个录像层要用的帧按片子的帧格抽成图（frames/<层>/00000.jpg），
// 第 g 帧显示第 g − g0 张，所以任何一帧单独渲、乱序渲、多台机器渲都一样（STYLE.md §2）。
import { Timeline } from "./tween.js";

const DATA = JSON.parse(document.getElementById("gl-data").textContent);
const PLAN = DATA.plan, FPS = PLAN.fps, DUR = PLAN.dur;
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const pad = (k) => String(k).padStart(5, "0");

// ---------- 缓动（和 kit/lib.py 的 ease 一致）----------
function family(f) {
  if (f.startsWith("power")) { const n = +f.slice(5) + 1; return (p) => Math.pow(p, n); }
  if (f === "sine") return (p) => 1 - Math.cos((p * Math.PI) / 2);
  if (f === "expo") return (p) => (p <= 0 ? 0 : Math.pow(2, 10 * (p - 1)) * p + p ** 6 * (1 - p));
  return (p) => 1 - Math.sqrt(Math.max(0, 1 - p * p));
}
function ease(name) {
  if (!name || name === "none" || name === "linear") return (p) => p;
  const [fam, kind] = name.split(".");
  const f = family(fam);
  if (kind === "in") return f;
  if (kind === "out") return (p) => 1 - f(1 - p);
  return (p) => (p < 0.5 ? f(p * 2) / 2 : 1 - f((1 - p) * 2) / 2);
}
// 镜头：层内 t 秒的仿射 (s, tx, ty)，屏幕坐标 = 源图坐标 × s + (tx, ty)
function camAt(L, t) {
  let A = L.start;
  for (const m of L.moves) {
    if (t < m.t0) break;
    if (t >= m.t1 || m.t1 <= m.t0) { A = m.b; continue; }
    const k = ease(m.ease)((t - m.t0) / (m.t1 - m.t0));
    A = [0, 1, 2].map((i) => m.a[i] + (m.b[i] - m.a[i]) * k);
  }
  return A;
}

// ---------- 字幕牌上的字：[词] 强调色（Logo 色），{词} 暖色 ----------
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const markup = (s) => esc(s).replace(/\[([^\]]+)\]/g, "<b>$1</b>").replace(/\{([^}]+)\}/g, "<i>$1</i>");
const plain = (s) => s.replace(/[\[\]{}]/g, "");

// ---------- 搭画面 ----------
const LAYERS = [], PLATES = [];
const pic = $("gl-pic"), plates = $("gl-plates");
for (const sh of PLAN.shots) {
  for (const L of sh.layers) {
    const el = document.createElement("div");
    el.className = "gl-layer";
    const img = document.createElement("img");
    img.alt = "";
    el.appendChild(img);
    pic.appendChild(el);
    if (L.kind === "still") img.src = DATA.stills[L.still].url;
    LAYERS.push({ ...L, el, img, cur: null });
  }
  for (const p of sh.plates) {
    const host = document.createElement("div");
    host.className = "gl-host";
    host.innerHTML = `<div class="gl-plate gl-${p.pos}"><div class="gl-title"${p.size ? ` style="font-size:${p.size}px"` : ""}>${markup(p.text)}</div></div>`;
    plates.appendChild(host);
    PLATES.push({ ...p, host, plate: host.firstChild, line: host.firstChild.firstChild });
  }
}
const tl = new Timeline();
for (const p of PLATES) {
  if (p.still) { p.plate.style.clipPath = "inset(0 0% 0 0)"; continue; }   // 第 0 帧就在：开场的字幕牌，也是封面
  tl.fromTo(p.plate, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.28, ease: "power3.out" }, p.t0);
  tl.fromTo(p.line, { x: -30 }, { x: 0, duration: 0.36, ease: "power3.out" }, p.t0 + 0.06);
}

// 收尾段
const FIN = PLAN.shots.find((s) => s.finale);
const CTA_DONE = {};
if (FIN) {
  const f = FIN.finale;
  if (f.crew) {
    const crew = $("gl-crew"), n = f.crew.stills.length, w = 1920 / n;
    f.crew.stills.forEach((sid, k) => {
      const d = document.createElement("div");
      d.className = "gl-slice";
      d.style.left = `${k * w}px`;
      d.style.width = `${w}px`;
      d.innerHTML = `<img alt="" src="${DATA.stills[sid].url}" />`;
      crew.appendChild(d);
      tl.fromTo(d, { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 0.3, ease: "power3.out" }, f.crew.t[k]);
      tl.fromTo(d.firstChild, { y: -60 }, { y: 0, duration: 0.42, ease: "power3.out" }, f.crew.t[k] + 0.04);
    });
  }
  if (f.band) tl.fromTo("#gl-band", { x: -1920 }, { x: 0, duration: f.band.slide, ease: "power4.in" }, f.band.land - f.band.slide);
  else $("gl-band").style.display = "none";
  if (f.logo) {
    $("gl-logo").src = DATA.stills[f.logo.still].url;
    tl.fromTo("#gl-logo", { scale: 1.18, clipPath: "inset(0 100% 0 0)" }, { scale: 1, clipPath: "inset(0 0% 0 0)", duration: 0.25, ease: "power4.out" }, f.logo.t);
  } else $("gl-logo").style.display = "none";
  f.cta.forEach((c, k) => {
    const el = $(`gl-cta-${k + 1}`);
    if (!el) throw new Error("行动号召最多三行");
    el.innerHTML = markup(c.text);
    if (k === 0) { tl.fromTo(el, { clipPath: "inset(0 100% 0 0)", x: -24 }, { clipPath: "inset(0 0% 0 0)", x: 0, duration: 0.32, ease: "power3.out" }, c.t); CTA_DONE[k] = c.t + 0.32; }
    else if (c.style === "muted") { tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out" }, c.t); CTA_DONE[k] = c.t + 0.3; }
    else { tl.fromTo(el, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.3, ease: "power3.out" }, c.t); CTA_DONE[k] = c.t + 0.3; }
  });
  for (let k = f.cta.length; k < 3; k++) $(`gl-cta-${k + 1}`).style.display = "none";
}
// 片尾卡：整屏铁板从左滑入，落在切点上
const CARD = PLAN.shots.find((s) => s.card);
if (CARD) {
  const c = CARD.card;
  document.querySelector("#gl-card .gl-l1").textContent = c.lines[0] || "";
  document.querySelector("#gl-card .gl-l2").textContent = c.lines[1] || "";
  tl.fromTo("#gl-card", { x: -1920 }, { x: 0, duration: c.slide, ease: "power4.in" }, c.land - c.slide);
}

// ---------- 逐帧 ----------
function frame(t) {
  const waits = [];
  for (const L of LAYERS) {
    const on = t >= L.a - 1e-6 && t < L.b - 1e-6;
    L.el.style.display = on ? "block" : "none";
    if (!on) continue;
    const [s, tx, ty] = camAt(L, t - L.t0);
    if (L.kind === "still") {
      L.img.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
      continue;
    }
    // 录像层：全片第 round(t × fps) 帧 → 这一层的第 k 张（预览的任意时刻取最近的一张）
    const k = clamp(Math.round(t * FPS) - L.g0, 0, L.n - 1);
    const [x, y, w, , pw] = L.frames[k];
    const src = `frames/${L.id}/${pad(k)}.jpg`;
    if (L.cur !== src) {
      L.cur = src;
      L.img.src = src;
      const img = L.img;
      // 换了下一帧的地址，上一帧的 decode 会失败：那不是缺帧（readcheck 不等解码、连续换帧时会这样）
      waits.push(img.decode().catch(() => { if (L.cur === src && !img.complete) throw new Error(`缺帧 ${src}：先跑 kit/tools/clips.py`); }));
    }
    L.img.style.transform = `translate(${x * s + tx}px, ${y * s + ty}px) scale(${(w * s) / pw})`;
  }
  for (const p of PLATES) p.host.style.display = t >= p.t0 - 1e-6 && t < p.t1 - 1e-6 ? "block" : "none";
  if (FIN) {
    const on = t >= FIN.a - 1e-6 && t < FIN.b - 1e-6;
    $("gl-crew").style.display = on ? "block" : "none";
    $("gl-fin").style.display = on && FIN.finale.band && t >= FIN.finale.band.land - FIN.finale.band.slide ? "block" : "none";
  }
  if (CARD) $("gl-card").style.display = t >= CARD.card.land - CARD.card.slide - 1e-6 ? "block" : "none";
  return waits;
}

// 画面上该读的字：字幕牌擦开以后、行动号召出完以后、片尾卡落定以后才算（STYLE.md §4 读字时间）
function box(el) { const r = el.getBoundingClientRect(); return { x0: r.left, y0: r.top, x1: r.right, y1: r.bottom }; }
function texts(t) {
  const out = [];
  for (const p of PLATES) {
    if (t < p.t0 - 1e-6 || t >= p.t1 - 1e-6) continue;
    if (!p.still && t < p.t0 + 0.36) continue;
    out.push({ id: p.id, text: plain(p.text), ...box(p.plate) });
  }
  if (FIN && t >= FIN.a && t < FIN.b) {
    FIN.finale.cta.forEach((c, k) => { if (t >= CTA_DONE[k]) out.push({ id: c.id, text: plain(c.text), ...box($(`gl-cta-${k + 1}`)) }); });
  }
  if (CARD && t >= CARD.card.land) {
    CARD.card.lines.forEach((l, k) => { if (l) out.push({ id: `card-${k + 1}`, text: l, ...box(document.querySelector(`#gl-card .gl-l${k + 1}`)) }); });
  }
  return out;
}

window.DUR = DUR;
window.EV = PLAN.ev;
window.render = (t) => {
  tl.render(t);
  const waits = frame(t);
  return waits.length ? Promise.all(waits) : undefined;
};
window.TEXTS = texts;

// 字体、静图、第一帧都就绪才 READY
await document.fonts.load(`104px "GL Title"`);
await document.fonts.load(`46px "GL Small"`);
await document.fonts.ready;
await Promise.all([...document.images].filter((i) => i.getAttribute("src")).map((i) => i.decode().catch(() => { throw new Error(`图片加载失败：${i.getAttribute("src")}`); })));
await window.render(0);
window.READY = true;
