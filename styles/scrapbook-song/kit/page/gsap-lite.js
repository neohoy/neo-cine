// gsap-lite：镜头脚本用到的那一小部分 GSAP 时间轴接口（timeline / set / to / fromTo / parseEase），
// 但不跑 GSAP：补间先记成数据，render(t) 把任意时刻的状态当作时间的纯函数算出来，再写到 SVG 上。
// 这样任何一帧都能单独渲、乱序渲、多个 worker 一起渲，结果都一样（本库的页面约定，TECHNIQUE.md §2）。
//
// 来源：来自《风吹新竹》MV 工程（它的 Remotion 对照版里的 timeline.ts）。那一版把同一套
// HyperFrames + GSAP 镜头按帧重算，和 GSAP 渲出来的成片逐帧比过（平均 SSIM 0.991）。本库把它改成不依赖 Remotion 的
// 纯 JS，并补上了它没做的两件事：属性字符串里的数字补间（transform="rotate(7 430 -20)" → "rotate(-5 …)"，GSAP 会插值），
// 以及按元素（不按选择器字符串）记账，"#a" 和 ".b" 选中同一个元素时算在一起。
// 语义按 GSAP 顺序播放时的结果：同一属性的补间按开始时间排，后开始的覆盖先开始的；to() 的起点取它开始那一刻的值；
// fromTo() 默认 immediateRender，在它开始之前（且前面没有别的补间开始过）就停在起点；repeat + yoyo 展开成多段。
// 不支持的写法（未知缓动、未知属性、找不到的目标）直接抛错或报警，不悄悄画错。

const lin = (p) => p;
// GSAP 3.12+ 的 expo 不是教科书上的 2^(10(p−1))：它混了一项，让曲线正好从 0 起（v3 对照时量出来的）
const expoIn = (p) => Math.pow(2, 10 * (p - 1)) * p + p * p * p * p * p * p * (1 - p);

function family(fam, arg) {
  if (fam.startsWith('power')) { const n = +fam.slice(5) + 1; return (p) => Math.pow(p, n); }
  if (fam === 'sine') return (p) => 1 - Math.cos((p * Math.PI) / 2);
  if (fam === 'expo') return expoIn;
  if (fam === 'circ') return (p) => 1 - Math.sqrt(1 - p * p);
  if (fam === 'back') { const c = arg ?? 1.70158; return (p) => p * p * ((c + 1) * p - c); }
  return null;
}

// GSAP 的缓动名 → 函数。out 和 inOut 由 in 推出来，和 GSAP 的 _configEase 一样
export function parseEase(name) {
  if (typeof name === 'function') return name;
  if (!name || name === 'none' || name === 'linear') return lin;
  const m = /^(power[0-4]|sine|expo|circ|back)\.(in|out|inOut)(?:\(([-\d.]+)\))?$/.exec(name);
  const f = m && family(m[1], m[3] !== undefined ? +m[3] : undefined);
  if (!f) throw new Error(`gsap-lite: 不认识的缓动 "${name}"`);
  if (m[2] === 'in') return f;
  if (m[2] === 'out') return (p) => 1 - f(1 - p);
  return (p) => (p < 0.5 ? f(p * 2) / 2 : 1 - f((1 - p) * 2) / 2);
}

const NUM = ['x', 'y', 'rotation', 'scaleX', 'scaleY', 'skewX', 'opacity'];
const TRANSFORM = ['x', 'y', 'rotation', 'scaleX', 'scaleY', 'skewX'];
const BASE = { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, skewX: 0 };
const CONTROL = new Set(['duration', 'ease', 'repeat', 'yoyo', 'immediateRender', 'svgOrigin', 'attr', 'scale', ...NUM]);
const r3 = (v) => Math.round(v * 1000) / 1000;

function props(v) {
  const out = {};
  for (const k of Object.keys(v)) if (!CONTROL.has(k)) throw new Error(`gsap-lite: 不支持的属性 "${k}"`);
  for (const k of NUM) if (v[k] !== undefined) out[k] = v[k];
  if (v.scale !== undefined) { if (v.scaleX === undefined) out.scaleX = v.scale; if (v.scaleY === undefined) out.scaleY = v.scale; }
  for (const [k, val] of Object.entries(v.attr || {})) out['@' + k] = val;
  return out;
}

// 字符串里的数字插值："rotate(7 430 -20)" → "rotate(-5 430 -20)"；骨架不同（比如颜色名）就在开始时直接换
const NUMRE = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;
function lerpStr(a, b, k) {
  if (a === undefined || a === null) return k >= 1 ? b : a;
  const na = String(a).match(NUMRE) || [], nb = String(b).match(NUMRE) || [];
  if (na.length !== nb.length || String(a).replace(NUMRE, '#') !== String(b).replace(NUMRE, '#')) return k > 0 ? b : a;
  let i = 0;
  return String(b).replace(NUMRE, () => { const v = +na[i] + (+nb[i] - +na[i]) * k; i++; return String(r3(v)); });
}

class Track {
  constructor(el) {
    this.el = el; this.num = new Map(); this.org = []; this.sorted = false;
    const o = el.getAttribute('opacity');
    this.baseOpacity = o === null ? 1 : +o;
    this.baseAttr = {};
    this.hasTransform = false;
  }
  list(k) { let l = this.num.get(k); if (!l) this.num.set(k, (l = [])); return l; }
  sort() {
    if (this.sorted) return;
    for (const l of this.num.values()) l.sort((a, b) => a.start - b.start || a.order - b.order);
    this.org.sort((a, b) => a.start - b.start || a.order - b.order);
    this.sorted = true;
  }
  // 一个属性在 t 时刻的值（数字或字符串）
  value(k, t, base) {
    const segs = this.num.get(k); if (!segs) return base;
    let v = base, started = false;
    const groupFrom = new Map();
    for (const s of segs) {
      if (t < s.start) { if (!started && s.immediate && s.from !== undefined) v = s.from; break; }
      started = true;
      let from = s.from;
      if (from === undefined) {
        if (s.group !== undefined) { if (!groupFrom.has(s.group)) groupFrom.set(s.group, v); from = groupFrom.get(s.group); }
        else from = v;
      }
      if (s.dur <= 0 || t >= s.start + s.dur) v = s.reverse ? from : s.to;
      else {
        let p = (t - s.start) / s.dur; p = s.reverse ? s.ease(1 - p) : s.ease(p);
        v = typeof s.to === 'string' ? lerpStr(from, s.to, p) : from + (s.to - from) * p;
      }
    }
    return v;
  }
  origin(t) {
    if (!this.org.length) return [0, 0];
    let o = this.org[0].o;
    for (const s of this.org) { if (t < s.start) break; o = s.o; }
    return o;
  }
  apply(t) {
    this.sort();
    const el = this.el;
    if (this.hasTransform) {
      const [ox, oy] = this.origin(t), g = (k) => this.value(k, t, BASE[k]);
      const x = g('x'), y = g('y'), r = g('rotation'), sx = g('scaleX'), sy = g('scaleY'), k = g('skewX');
      el.setAttribute('transform', `translate(${r3(x + ox)} ${r3(y + oy)}) rotate(${r3(r)}) skewX(${r3(k)}) scale(${r3(sx)} ${r3(sy)}) translate(${r3(-ox)} ${r3(-oy)})`);
    }
    if (this.num.has('opacity')) el.style.opacity = r3(this.value('opacity', t, this.baseOpacity));
    for (const key of this.num.keys()) {
      if (key[0] !== '@') continue;
      const name = key.slice(1), v = this.value(key, t, this.baseAttr[name]);
      if (v === undefined || v === null || (typeof v === 'number' && Number.isNaN(v))) el.removeAttribute(name);
      else el.setAttribute(name, typeof v === 'number' ? r3(v) : v);
    }
  }
}

export class Timeline {
  constructor(root) { this.root = root; this.tracks = new Map(); this.order = 0; this.groups = 0; this.missing = new Set(); }
  els(targets) {
    const out = [];
    for (const t of [].concat(targets)) {
      if (typeof t !== 'string') { out.push(t); continue; }
      const found = this.root.querySelectorAll(t);
      if (!found.length) this.missing.add(t);
      out.push(...found);
    }
    return out;
  }
  track(el) {
    let tr = this.tracks.get(el);
    if (!tr) this.tracks.set(el, (tr = new Track(el)));
    return tr;
  }
  note(tr, k) {
    if (TRANSFORM.includes(k) && !tr.hasTransform) {
      tr.hasTransform = true;
      // GSAP 会把元素原有的 transform 拆成 x/y/旋转/缩放接着补；这里没做这件事，所以要求被补间的元素自己不带 transform
      if (tr.el.getAttribute('transform')) console.warn('gsap-lite: 补间了一个本身带 transform 的元素，原来的 transform 会被覆盖：#' + tr.el.id);
    }
    if (k[0] === '@' && !(k.slice(1) in tr.baseAttr)) tr.baseAttr[k.slice(1)] = tr.el.getAttribute(k.slice(1));
  }
  set(targets, vars, t) { return this.tween(targets, null, { ...vars, duration: 0 }, t, true); }
  to(targets, vars, t) { return this.tween(targets, null, vars, t); }
  fromTo(targets, from, to, t) { return this.tween(targets, from, to, t); }
  seek() { return this; }
  tween(targets, fromVars, toVars, t, isSet = false) {
    if (typeof t !== 'number' || !Number.isFinite(t)) throw new Error('gsap-lite: 每个补间都要写明开始时间');
    const dur = toVars.duration ?? 0.5, ez = parseEase(toVars.ease ?? 'none'), plays = (toVars.repeat ?? 0) + 1;
    const immediate = fromVars !== null && (toVars.immediateRender ?? true);
    const fromP = fromVars ? props(fromVars) : {}, toP = props(toVars);
    const org = toVars.svgOrigin ?? fromVars?.svgOrigin;
    for (const el of this.els(targets)) {
      const tr = this.track(el);
      tr.sorted = false;
      if (org) tr.org.push({ start: t, o: org.trim().split(/\s+/).map(Number), order: this.order++ });
      // 只出现在 from 里的属性：开始时（immediate 时提前）直接设上
      for (const [k, v] of Object.entries(fromP)) {
        if (k in toP) continue;
        this.note(tr, k);
        tr.list(k).push({ start: t, dur: 0, from: v, to: v, ease: lin, reverse: false, immediate, order: this.order++ });
      }
      for (const [k, v] of Object.entries(toP)) {
        this.note(tr, k);
        const f = fromP[k], group = f === undefined && !isSet ? this.groups++ : undefined;
        for (let i = 0; i < plays; i++) {
          tr.list(k).push({ start: t + i * dur, dur, from: f, to: v, ease: ez, reverse: Boolean(toVars.yoyo) && i % 2 === 1,
            immediate: immediate && i === 0, group, order: this.order++ });
        }
      }
    }
    return this;
  }
  // 把 t 时刻（镜头内秒数）的状态写到每个被补间的元素上
  render(t) { for (const tr of this.tracks.values()) tr.apply(t); }
}

// 给镜头脚本用的 gsap 替身：gsap.timeline() 返回一条绑在这个镜头根节点上的时间轴
export function gsapFor(root) {
  return { timeline: () => new Timeline(root), parseEase };
}
