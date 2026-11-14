// tween.js：科技发布的文字入场、退场用到的那一小部分补间接口（timeline().fromTo / to，缓动名、stagger），
// 但不跑任何动画引擎：补间先记成数据，render(t) 把任意时刻的状态当作时间的纯函数算出来，写到 HTML 元素的 style 上。
// 任何一帧都能单独渲、乱序渲、多个 worker 一起渲，结果都一样（本库的页面约定，TECHNIQUE.md §2）。
//
// 改编自手账歌谣的 kit/page/gsap-lite.js（同一个库）：那一版写 SVG 的 transform 属性，这一版写 HTML 的 CSS transform、opacity、filter。
// 语义按顺序播放时的结果：同一属性的补间按开始时间排，后开始的覆盖先开始的；to() 的起点取它开始那一刻的值；
// fromTo() 默认 immediateRender：在它开始之前（且前面没有别的补间开始过）就停在起点。不认识的缓动、属性直接报错。

const lin = (p) => p;
function family(fam) {
  if (fam.startsWith("power")) { const n = +fam.slice(5) + 1; return (p) => Math.pow(p, n); }
  if (fam === "sine") return (p) => 1 - Math.cos((p * Math.PI) / 2);
  if (fam === "expo") return (p) => (p <= 0 ? 0 : Math.pow(2, 10 * (p - 1)) * p + p ** 6 * (1 - p));
  if (fam === "circ") return (p) => 1 - Math.sqrt(1 - p * p);
  return null;
}
// 缓动名 → 函数：power0–4、sine、expo、circ，各有 .in / .out / .inOut；none、linear 是线性
export function parseEase(name) {
  if (typeof name === "function") return name;
  if (!name || name === "none" || name === "linear") return lin;
  const m = /^(power[0-4]|sine|expo|circ)\.(in|out|inOut)$/.exec(name);
  const f = m && family(m[1]);
  if (!f) throw new Error(`tween.js：不认识的缓动 "${name}"`);
  if (m[2] === "in") return f;
  if (m[2] === "out") return (p) => 1 - f(1 - p);
  return (p) => (p < 0.5 ? f(p * 2) / 2 : 1 - f((1 - p) * 2) / 2);
}

const XF = ["x", "y", "xPercent", "yPercent", "rotation", "scaleX", "scaleY"];
const BASE = { x: 0, y: 0, xPercent: 0, yPercent: 0, rotation: 0, scaleX: 1, scaleY: 1 };
const CONTROL = new Set(["duration", "ease", "stagger", "immediateRender", "transformOrigin", "scale", "opacity", "filter", ...XF]);
const r3 = (v) => Math.round(v * 1000) / 1000;

function props(v) {
  const out = {};
  for (const k of Object.keys(v)) if (!CONTROL.has(k)) throw new Error(`tween.js：不支持的属性 "${k}"`);
  for (const k of [...XF, "opacity", "filter"]) if (v[k] !== undefined) out[k] = v[k];
  if (v.scale !== undefined) { out.scaleX ??= v.scale; out.scaleY ??= v.scale; }
  return out;
}
// 字符串里的数字插值："blur(14px)" → "blur(0px)"；骨架不同就在开始时直接换
const NUMRE = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;
function lerpStr(a, b, k) {
  if (a === undefined || a === null) return k >= 1 ? b : a;
  const na = String(a).match(NUMRE) || [], nb = String(b).match(NUMRE) || [];
  if (na.length !== nb.length || String(a).replace(NUMRE, "#") !== String(b).replace(NUMRE, "#")) return k > 0 ? b : a;
  let i = 0;
  return String(b).replace(NUMRE, () => { const v = +na[i] + (+nb[i] - +na[i]) * k; i++; return String(r3(v)); });
}
const mix = (a, b, k) => (typeof b === "string" ? lerpStr(a, b, k) : a + (b - a) * k);

class Track {
  constructor(el) {
    this.el = el; this.segs = new Map(); this.sorted = false;
    const cs = getComputedStyle(el);
    this.base = { opacity: +cs.opacity, filter: cs.filter === "none" ? "blur(0px)" : cs.filter, ...BASE };
  }
  list(k) { let l = this.segs.get(k); if (!l) this.segs.set(k, (l = [])); return l; }
  sort() {
    if (this.sorted) return;
    for (const l of this.segs.values()) l.sort((a, b) => a.start - b.start || a.order - b.order);
    this.sorted = true;
  }
  // 属性 k 在 t 时刻的值
  value(k, t) {
    const segs = this.segs.get(k);
    return segs ? this.over(segs, segs.length, k, t) : this.base[k];
  }
  // 只看前 n 段补间时，属性 k 在 t 时刻的值；to() 的起点 = 它前面那些补间在它开始那一刻的值
  over(segs, n, k, t) {
    let v = this.base[k], started = false;
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
      el.style.transform = `translate(${r3(g("x"))}px, ${r3(g("y"))}px) translate(${r3(g("xPercent"))}%, ${r3(g("yPercent"))}%) ` +
        `rotate(${r3(g("rotation"))}deg) scale(${r3(g("scaleX"))}, ${r3(g("scaleY"))})`;
    }
    if (has("opacity")) el.style.opacity = r3(this.value("opacity", t));
    if (has("filter")) { const f = this.value("filter", t); el.style.filter = /^blur\(0(\.0+)?px\)$/.test(f) ? "none" : f; }
  }
}

export class Timeline {
  constructor(root = document) { this.root = root; this.tracks = new Map(); this.order = 0; }
  els(targets) {
    if (typeof targets === "string") return [...this.root.querySelectorAll(targets)];
    if (targets instanceof Element) return [targets];
    return [...targets].filter(Boolean);
  }
  track(el) { let tr = this.tracks.get(el); if (!tr) this.tracks.set(el, (tr = new Track(el))); return tr; }
  to(targets, vars, at) { return this.tween(targets, null, vars, at); }
  fromTo(targets, from, to, at) { return this.tween(targets, from, to, at); }
  tween(targets, fromVars, toVars, at) {
    if (typeof at !== "number" || !Number.isFinite(at)) throw new Error("tween.js：每个补间都要写明开始时间");
    const els = this.els(targets);
    const dur = toVars.duration ?? 0.5, ez = parseEase(toVars.ease ?? "none");
    const immediate = fromVars !== null && (toVars.immediateRender ?? true);
    const fromP = fromVars ? props(fromVars) : {}, toP = props(toVars);
    // stagger：数字是相邻两个的间隔；{amount, ease} 是总共错开多少秒、按什么缓动分配
    const st = toVars.stagger, n = els.length;
    const delay = (i) => {
      if (!st || n < 2) return 0;
      if (typeof st === "number") return st * i;
      return (st.amount ?? 0) * parseEase(st.ease ?? "none")(i / (n - 1));
    };
    els.forEach((el, i) => {
      const tr = this.track(el), t0 = at + delay(i);
      tr.sorted = false;
      if (toVars.transformOrigin) el.style.transformOrigin = toVars.transformOrigin;
      for (const [k, v] of Object.entries(fromP)) {
        if (k in toP) continue;
        tr.list(k).push({ start: t0, dur: 0, from: v, to: v, ease: lin, immediate, order: this.order++ });
      }
      for (const [k, v] of Object.entries(toP)) tr.list(k).push({ start: t0, dur, from: fromP[k], to: v, ease: ez, immediate, order: this.order++ });
    });
    return this;
  }
  // 把 t 秒的状态写到每个被补间的元素上
  render(t) { for (const tr of this.tracks.values()) tr.apply(t); }
}
