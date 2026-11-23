// tween.js：拟人 MV 用到的那一部分 GSAP 时间轴写法（fromTo / to / set，缓动名、stagger、repeat + yoyo、关键帧），
// 但不跑任何动画引擎：补间先记成数据，render(t) 把任意时刻的状态当作时间的纯函数算出来，写到 HTML / SVG 元素上。
// 任何一帧都能单独渲、乱序渲、多个 worker 一起渲，结果都一样（本库的页面约定，TECHNIQUE.md §2）。
//
// 取自游戏发布的 kit/page/tween.js（同一个库；它又来自科技发布、手账歌谣的 gsap-lite.js），加了这些：
//   set()；repeat + yoyo（展开成多段）；keyframes: { x: [0, -8, 8, 0] }（等分时长）；
//   颜色插值（color、backgroundColor，#rgb / #rrggbb / rgb() / rgba() 都行）；attr: { "stroke-dashoffset": 0 }（SVG 属性）；
//   num()：一条数值轨道，每帧把值交给一个函数去改字（计数器、进度百分比、打字机）。
// 语义按顺序播放时的结果：同一属性的补间按开始时间排，后开始的覆盖先开始的；to() 的起点取它开始那一刻的值；
// fromTo() 默认 immediateRender：在它开始之前（且前面没有别的补间开始过）就停在起点。不认识的缓动、属性直接报错。

const lin = (p) => p;
function family(fam, arg) {
  if (fam.startsWith("power")) { const n = +fam.slice(5) + 1; return (p) => Math.pow(p, n); }
  if (fam === "sine") return (p) => 1 - Math.cos((p * Math.PI) / 2);
  if (fam === "expo") return (p) => (p <= 0 ? 0 : Math.pow(2, 10 * (p - 1)) * p + p ** 6 * (1 - p));
  if (fam === "circ") return (p) => 1 - Math.sqrt(1 - p * p);
  if (fam === "back") { const c = arg ?? 1.70158; return (p) => p * p * ((c + 1) * p - c); }
  return null;
}
// 缓动名 → 函数：power0–4、sine、expo、circ、back(n)，各有 .in / .out / .inOut；none、linear 是线性；steps(n) 是台阶
export function parseEase(name) {
  if (typeof name === "function") return name;
  if (!name || name === "none" || name === "linear") return lin;
  const st = /^steps\((\d+)\)$/.exec(name);
  if (st) { const n = +st[1]; return (p) => (p >= 1 ? 1 : Math.floor(p * n) / n); }
  const m = /^(power[0-4]|sine|expo|circ|back)\.(in|out|inOut)(?:\(([-\d.]+)\))?$/.exec(name);
  const f = m && family(m[1], m[3] !== undefined ? +m[3] : undefined);
  if (!f) throw new Error(`tween.js：不认识的缓动 "${name}"`);
  if (m[2] === "in") return f;
  if (m[2] === "out") return (p) => 1 - f(1 - p);
  return (p) => (p < 0.5 ? f(p * 2) / 2 : 1 - f((1 - p) * 2) / 2);
}

const XF = ["x", "y", "rotation", "scaleX", "scaleY"];
const BASE = { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
const STYLE = ["opacity", "color", "backgroundColor", "clipPath", "filter"];
const CONTROL = new Set(["duration", "ease", "stagger", "immediateRender", "transformOrigin", "repeat", "yoyo", "keyframes", "scale", "attr", ...XF, ...STYLE]);
const r3 = (v) => Math.round(v * 1000) / 1000;

// 颜色统一成 rgba(r, g, b, a)，这样能逐个数字插值
function rgba(c) {
  if (typeof c !== "string") return c;
  let m = /^#([0-9a-f]{3})$/i.exec(c);
  if (m) c = "#" + [...m[1]].map((h) => h + h).join("");
  m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(c);
  if (m) return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}, 1)`;
  m = /^rgba?\(([^)]+)\)$/.exec(c);
  if (m) { const p = m[1].split(",").map((s) => +s.trim()); return `rgba(${p[0]}, ${p[1]}, ${p[2]}, ${p[3] ?? 1})`; }
  if (c === "transparent") return "rgba(0, 0, 0, 0)";
  return c;
}
const COLOR = new Set(["color", "backgroundColor"]);

function props(v) {
  const out = {};
  for (const k of Object.keys(v)) if (!CONTROL.has(k)) throw new Error(`tween.js：不支持的属性 "${k}"`);
  for (const k of [...XF, ...STYLE]) if (v[k] !== undefined) out[k] = COLOR.has(k) ? rgba(v[k]) : v[k];
  if (v.scale !== undefined) { out.scaleX ??= v.scale; out.scaleY ??= v.scale; }
  for (const [k, val] of Object.entries(v.attr || {})) out["@" + k] = val;
  return out;
}
// 字符串里的数字插值："rgba(0, 0, 0, 0)" → "rgba(229, 72, 77, 0.14)"；骨架不同就在开始时直接换
const NUMRE = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;
function lerpStr(a, b, k) {
  if (a === undefined || a === null) return k >= 1 ? b : a;
  const na = String(a).match(NUMRE) || [], nb = String(b).match(NUMRE) || [];
  if (na.length !== nb.length || String(a).replace(NUMRE, "#") !== String(b).replace(NUMRE, "#")) return k > 0 ? b : a;
  let i = 0;
  return String(b).replace(NUMRE, () => { const v = +na[i] + (+nb[i] - +na[i]) * k; i++; return String(r3(v)); });
}
const mix = (a, b, k) => (typeof b === "string" ? lerpStr(a, b, k) : (a ?? b) + (b - (a ?? b)) * k);

class Track {
  constructor(el) {
    this.el = el; this.segs = new Map(); this.sorted = false; this.base = { ...BASE };
    const cs = getComputedStyle(el);
    this.base.opacity = +cs.opacity;
    this.base.color = rgba(cs.color);
    this.base.backgroundColor = rgba(cs.backgroundColor);
    this.base.clipPath = cs.clipPath === "none" ? "inset(0px 0px 0px 0px)" : cs.clipPath;
    this.base.filter = cs.filter === "none" ? "blur(0px)" : cs.filter;
  }
  list(k) { let l = this.segs.get(k); if (!l) this.segs.set(k, (l = [])); return l; }
  baseOf(k) {
    if (k in this.base) return this.base[k];
    if (k.startsWith("@")) { const v = this.el.getAttribute(k.slice(1)); return v !== null && !isNaN(+v) ? +v : v; }
    return undefined;
  }
  sort() {
    if (this.sorted) return;
    for (const l of this.segs.values()) l.sort((a, b) => a.start - b.start || a.order - b.order);
    this.sorted = true;
  }
  value(k, t) { const segs = this.segs.get(k); return segs ? this.over(segs, segs.length, k, t) : this.baseOf(k); }
  over(segs, n, k, t) {
    let v = this.baseOf(k), started = false;
    for (let j = 0; j < n; j++) {
      const s = segs[j];
      if (t < s.start) { if (!started && s.immediate && s.from !== undefined) v = s.from; break; }
      started = true;
      if (s.dur <= 0 || t >= s.start + s.dur) { v = s.to; continue; }
      const from = s.from !== undefined ? s.from : this.over(segs, j, k, s.start);
      v = mix(from, s.to, s.ease((t - s.start) / s.dur));
    }
    return v;
  }
  apply(t) {
    this.sort();
    const el = this.el, has = (k) => this.segs.has(k);
    if (XF.some(has)) {
      const g = (k) => this.value(k, t);
      el.style.transform = `translate(${r3(g("x"))}px, ${r3(g("y"))}px) rotate(${r3(g("rotation"))}deg) scale(${r3(g("scaleX"))}, ${r3(g("scaleY"))})`;
    }
    if (has("opacity")) el.style.opacity = r3(this.value("opacity", t));
    if (has("color")) el.style.color = this.value("color", t);
    if (has("backgroundColor")) el.style.backgroundColor = this.value("backgroundColor", t);
    if (has("clipPath")) el.style.clipPath = this.value("clipPath", t);
    if (has("filter")) { const f = this.value("filter", t); el.style.filter = /^blur\(0(\.0+)?px\)$/.test(f) ? "none" : f; }
    for (const k of this.segs.keys()) if (k.startsWith("@")) { const v = this.value(k, t); el.setAttribute(k.slice(1), typeof v === "number" ? r3(v) : v); }
  }
}

export class Timeline {
  constructor(root = document) { this.root = root; this.tracks = new Map(); this.nums = []; this.order = 0; }
  els(targets) {
    if (typeof targets === "string") {
      const found = [...this.root.querySelectorAll(targets)];
      if (!found.length) throw new Error(`tween.js：找不到 "${targets}"`);
      return found;
    }
    if (targets instanceof Element) return [targets];
    return [...targets].flatMap((x) => this.els(x));
  }
  track(el) { let tr = this.tracks.get(el); if (!tr) this.tracks.set(el, (tr = new Track(el))); return tr; }
  to(targets, vars, at) { return this.tween(targets, null, vars, at); }
  fromTo(targets, from, to, at) { return this.tween(targets, from, to, at); }
  set(targets, vars, at) { return this.tween(targets, null, { ...vars, duration: 0 }, at); }
  tween(targets, fromVars, toVars, at) {
    if (typeof at !== "number" || !Number.isFinite(at)) throw new Error("tween.js：每个补间都要写明开始时间");
    const els = this.els(targets);
    const dur = toVars.duration ?? 0.5, ez = parseEase(toVars.ease ?? "none");
    const immediate = fromVars !== null && (toVars.immediateRender ?? true);
    const rep = toVars.repeat ?? 0, yoyo = !!toVars.yoyo;
    if (rep < 0) throw new Error("tween.js：repeat 不能是 -1（片子有长度，写明次数）");
    const fromP = fromVars ? props(fromVars) : {}, toP = props(toVars);
    const kf = toVars.keyframes || null;
    const st = toVars.stagger, n = els.length;
    const delay = (i) => (!st || n < 2 ? 0 : typeof st === "number" ? st * i : (st.amount ?? 0) * parseEase(st.ease ?? "none")(i / (n - 1)));
    els.forEach((el, i) => {
      const tr = this.track(el), t0 = at + delay(i);
      tr.sorted = false;
      if (toVars.transformOrigin) el.style.transformOrigin = toVars.transformOrigin;
      const push = (k, seg) => tr.list(k).push({ ...seg, order: this.order++ });
      for (const [k, v] of Object.entries(fromP)) if (!(k in toP) && !(kf && (k in kf || (kf.scale && (k === "scaleX" || k === "scaleY"))))) push(k, { start: t0, dur: 0, from: v, to: v, ease: lin, immediate });
      // 关键帧：每个数组等分时长，相邻两值一段
      if (kf) for (const [k0, arr] of Object.entries(kf)) {
        const keys = k0 === "scale" ? ["scaleX", "scaleY"] : [k0];
        if (!keys.every((k) => XF.includes(k) || k === "opacity")) throw new Error(`tween.js：关键帧不支持 "${k0}"`);
        const seg = dur / (arr.length - 1);
        for (const k of keys) for (let j = 1; j < arr.length; j++) push(k, { start: t0 + seg * (j - 1), dur: seg, from: arr[j - 1], to: arr[j], ease: ez, immediate: immediate && j === 1 });
      }
      for (const [k, v] of Object.entries(toP)) {
        if (!rep) { push(k, { start: t0, dur, from: fromP[k], to: v, ease: ez, immediate }); continue; }
        // repeat + yoyo 展开：第一段的起点要有值才能来回，所以 to() 加 repeat 时必须写 fromTo
        if (fromP[k] === undefined) throw new Error(`tween.js：repeat 的补间要用 fromTo 写明起点（${k}）`);
        for (let c = 0; c <= rep; c++) {
          const back = yoyo && c % 2 === 1;
          push(k, { start: t0 + c * dur, dur, from: back ? v : fromP[k], to: back ? fromP[k] : v, ease: ez, immediate: immediate && c === 0 });
        }
      }
    });
    return this;
  }
  // 数值轨道：从 a 到 b，每帧调 fn(值) 去改字（计数器、百分比、打字机）。开始之前停在 a，结束之后停在 b
  // 同一个 key 的几条轨道（同一处字先后换几次）：只有已经开始的最后一条生效，都没开始时第一条停在起点
  num(fn, a, b, at, dur, ease, key) { this.nums.push({ fn, a, b, at, dur, ease: parseEase(ease ?? "none"), key: key ?? this.nums.length, order: this.nums.length }); return this; }
  // 把 t 秒的状态写到每个被补间的元素上
  render(t) {
    for (const tr of this.tracks.values()) tr.apply(t);
    const pick = new Map();
    for (const s of [...this.nums].sort((a, b) => a.at - b.at || a.order - b.order)) {
      const cur = pick.get(s.key);
      if (!cur || s.at <= t) pick.set(s.key, s);
    }
    for (const s of pick.values()) {
      const k = t <= s.at ? 0 : t >= s.at + s.dur || s.dur <= 0 ? 1 : s.ease((t - s.at) / s.dur);
      s.fn(s.a + (s.b - s.a) * k);
    }
  }
}
