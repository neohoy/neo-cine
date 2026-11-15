// 方寸影像 · 时间计划：镜头表（film.json）→ 每一刻的状态。纯函数，不碰页面：浏览器里的 film.js 和 node 里的 tools/build.mjs 共用它。
//
//   makePlan(cfg, defaults)  把镜头表补全：每个镜头的起止、关键帧、时辰、外观、引擎时间、文字
//   stateAt(plan, t)         片中 t 秒的完整状态：用哪一个外观、引擎时间、时辰、镜头、移轴；叠化时还有上一个镜头的状态
//   textsAt(plan, t)         片中 t 秒在画面上的字（片名卡、字幕、片尾卡）和它们的不透明度
//   events(plan, api)        画面事件（穿过玻璃、整点、奇事、字、外观切换、每 0.25 秒的环境采样），给 mix.py
//   reading(plan)            按库的读字规则估算每块字够不够时间
//
// 镜头参数和 NEO-Isle 影片模式（FANGCUN.frame）同义：az 方位、pol 俯仰（弧度），dist 是“装下整只容器的距离”的倍数，
// target 是注视点（这一境的世界坐标，地块中心是原点，y 向上）。dist 按对数插值：推近和拉远的速度看起来是匀的。

export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
export const EASE = {
  linear: u => u,
  in: u => u * u * u,
  out: u => 1 - Math.pow(1 - u, 3),
  inout: u => u * u * u * (u * (u * 6 - 15) + 10),            // 五次平滑：起步和落定都很软，长焦镜头的手感
  soft: u => u * u * (3 - 2 * u),
};
const ease = name => EASE[name] || EASE.inout;

// 单调三次插值（Fritsch–Carlson）：经过每个关键帧，不过冲；两端的速度由整段的缓动（ease）管
function monotone(xs, ys) {
  const n = xs.length;
  if (n === 1) return () => ys[0];
  const d = [], m = new Array(n);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; }
  }
  return x => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0; while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], u = (x - xs[i]) / h, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * ys[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * ys[i + 1] + (u3 - u2) * h * m[i + 1];
  };
}

// 时辰的夜晚程度（和引擎的十个关键时辰一致，只给声音用：画面里的夜晚由引擎自己算）
const NIGHT = [[0, 1], [4.6, 1], [5.6, 0.6], [6.6, 0], [18, 0], [18.9, 0.5], [20, 1], [24, 1]];
export function nightAt(h) {
  h = ((h % 24) + 24) % 24;
  for (let i = 0; i < NIGHT.length - 1; i++) {
    const [a, na] = NIGHT[i], [b, nb] = NIGHT[i + 1];
    if (h >= a && h <= b) { const k = (h - a) / (b - a); return lerp(na, nb, k * k * (3 - 2 * k)); }
  }
  return 1;
}

const CAMK = ['az', 'pol', 'dist', 'tx', 'ty', 'tz'];
const flat = c => ({ az: c.az, pol: c.pol, dist: c.dist, tx: c.target?.[0], ty: c.target?.[1], tz: c.target?.[2] });
const DEF = { az: 0.66, pol: 1.06, dist: 1, target: [0, -0.35, 0] };

export function makePlan(cfg, defaults = {}) {
  const D = { ...DEF, ...defaults };
  const looks = cfg.looks && Object.keys(cfg.looks).length ? cfg.looks : { main: {} };
  const lookIds = Object.keys(looks);
  const shots = []; let t = 0, eng = cfg.clock ?? 0;
  let cam = flat(D), hour = D.hour ?? 12, look = lookIds[0];
  const errs = [];
  (cfg.shots || []).forEach((s, i) => {
    const id = s.id || `s${i + 1}`, dur = +s.dur;
    if (!(dur > 0)) errs.push(`镜头 ${id}：dur 要是正数（秒）`);
    if (s.look && !looks[s.look]) errs.push(`镜头 ${id}：外观 "${s.look}" 不在 looks 里（有：${lookIds.join('、')}）`);
    // 关键帧：from / to 是两头的简写；keys 是 [{ at: 镜头内秒数, az, pol, dist, target }]；没写的通道接着上一帧（第一帧接着上一个镜头的结尾）
    let raw = s.keys ? s.keys.map(k => ({ ...k })) : [{ at: 0, ...(s.from || {}) }, ...(s.to ? [{ at: dur, ...s.to }] : [])];
    raw.sort((a, b) => a.at - b.at);
    if (raw[0].at !== 0) raw.unshift({ at: 0 });
    const keys = []; let prev = cam;
    for (const k of raw) { const f = { ...prev }; const fk = flat(k); for (const c of CAMK) if (fk[c] != null) f[c] = fk[c]; f.at = clamp(k.at, 0, dur); keys.push(f); prev = f; }
    if (keys.some(k => !(k.dist > 0))) errs.push(`镜头 ${id}：dist 要大于 0`);
    const at = keys.map(k => k.at);
    const ch = {}; for (const c of CAMK) ch[c] = monotone(at, keys.map(k => c === 'dist' ? Math.log(k[c]) : k[c]));
    // 时辰：一个数（停住）、[起, 止]（这个镜头里走完）、或 [[镜头内秒数, 时辰], ...]
    let hk;
    if (s.hour == null) hk = [[0, hour]];
    else if (typeof s.hour === 'number') hk = [[0, s.hour]];
    else if (typeof s.hour[0] === 'number') hk = [[0, s.hour[0]], [dur, s.hour[1]]];
    else hk = s.hour.map(([a, h]) => [a, h]);
    const hf = monotone(hk.map(k => k[0]), hk.map(k => k[1]));
    const rate = s.rate ?? 1;
    const shot = {
      i, id, move: s.move || '', dur, start: t, end: t + dur, eng0: eng, rate, look: s.look || look,
      ease: s.ease || 'inout', hourEase: s.hourEase || (hk.length === 2 ? 'inout' : 'linear'), hk, hf, ch, keys,
      in: s.in || 'cut', inDur: s.inDur ?? (s.in === 'dissolve' || s.in === 'wipe' ? 1.0 : 0),
      focus: s.focus ?? 'target', band: s.band ?? 0.2, blur: s.blur ?? 1, tilt: s.tilt ?? true, ride: s.ride,
      wonder: s.wonder, sub: s.sub || null,
    };
    if (shot.inDur > 0 && i === 0) errs.push(`镜头 ${id}：第一个镜头不能叠化进来`);
    shots.push(shot);
    const last = keys[keys.length - 1]; cam = { ...last }; delete cam.at; hour = hk[hk.length - 1][1]; look = shot.look;
    t += dur; eng += rate * dur;
  });
  if (!shots.length) errs.push('镜头表是空的：shots 里至少要有一个镜头');
  const end = cfg.end ? { dur: 3.5, fade: 1.2, ...cfg.end } : null;
  const dur = t + (end ? end.dur : 0);
  return { cfg, looks, lookIds, shots, dur: Math.round(dur * 1000) / 1000, body: t, end, title: cfg.title || null, fadeIn: cfg.fadeIn ?? 0, errs, D };
}

const shotAt = (plan, t) => { const S = plan.shots; let i = 0; while (i < S.length - 1 && t >= S[i + 1].start) i++; return S[i]; };
const autoRide = dist => clamp((0.9 - dist) / 0.55, 0, 1);      // 近景跟着容器一起浮，远景让容器在深空里浮着

// 一个镜头在镜头内 u 秒（可以超出 0..dur：叠化时上一个镜头停在结尾的机位上）的状态
export function shotState(plan, s, u) {
  const k = clamp(u / s.dur, 0, 1), x = ease(s.ease)(k) * s.dur;
  const c = {}; for (const n of CAMK) c[n] = s.ch[n](x);
  const dist = Math.exp(c.dist), target = [c.tx, c.ty, c.tz];
  const hx = s.hk.length === 2 ? ease(s.hourEase)(k) * s.dur : clamp(u, 0, s.dur);
  const hour = s.hf(hx);
  const st = {
    shot: s.i, look: s.look, hour, eng: s.eng0 + s.rate * u,
    cam: { az: c.az, pol: c.pol, dist, target, ride: s.ride ?? autoRide(dist) },
    band: s.band, blur: s.blur, tilt: s.tilt,
  };
  if (s.focus === 'target') st.focusAt = target;
  else if (typeof s.focus === 'number') st.focus = s.focus;
  else if (Array.isArray(s.focus) && typeof s.focus[0] === 'number') st.focusAt = s.focus;
  else if (Array.isArray(s.focus)) {                                // [[镜头内秒数, [x,y,z]], ...]：清晰带跟着一串点走
    const fs = s.focus, ts = fs.map(f => f[0]);
    st.focusAt = [0, 1, 2].map(j => monotone(ts, fs.map(f => f[1][j]))(clamp(u, 0, s.dur)));
  }
  return st;
}

export function stateAt(plan, t) {
  t = clamp(t, 0, plan.dur);
  const s = shotAt(plan, t), u = Math.min(t, plan.body) - s.start;
  const st = shotState(plan, s, u);
  if (t > plan.body) st.eng = s.eng0 + s.rate * (t - s.start);       // 片尾卡下面世界还在走
  st.t = t;
  st.black = 0;
  if (plan.fadeIn > 0) st.black = Math.max(st.black, 1 - smooth(0, plan.fadeIn, t));
  if (plan.end) st.black = Math.max(st.black, smooth(plan.body - plan.end.fade, plan.body, t));
  if (s.inDur > 0 && u < s.inDur && s.i > 0) {
    const p = plan.shots[s.i - 1];
    st.prev = shotState(plan, p, p.dur); st.prev.eng = p.eng0 + p.rate * (t - p.start);
    st.mix = EASE.soft(u / s.inDur); st.mode = s.in;
  }
  return st;
}

// ---------------------------------------------------------------- 字
// 片名卡（title）、字幕（每个镜头的 sub）、片尾卡（end）。都是中英两行；at 是出现的时刻（片名卡和片尾卡相对片头 / 片尾卡开始，字幕相对镜头开始）
export function textItems(plan) {
  const out = [];
  const T = plan.title;
  if (T) out.push({ id: 'title', kind: 'title', t0: T.at ?? 0.8, t1: (T.at ?? 0.8) + (T.dur ?? 4.6), kicker: T.kicker || '', zh: T.zh || '', en: T.en || '' });
  for (const s of plan.shots) if (s.sub) {
    const a = s.start + (s.sub.at ?? 0.6);
    out.push({ id: `sub-${s.id}`, kind: 'sub', t0: a, t1: a + (s.sub.dur ?? Math.min(s.dur - (s.sub.at ?? 0.6) - 0.3, 5)), zh: s.sub.zh || '', en: s.sub.en || '' });
  }
  if (plan.end && (plan.end.zh || plan.end.en)) out.push({ id: 'end', kind: 'end', t0: plan.body + (plan.end.at ?? 0.35), t1: plan.dur + 1, kicker: plan.end.kicker || '', zh: plan.end.zh || '', en: plan.end.en || '' });
  return out;
}
const FADE = { title: [0.9, 0.8], sub: [0.45, 0.45], end: [0.9, 0] };
export function textsAt(plan, t) {
  return textItems(plan).map(x => {
    const [fi, fo] = FADE[x.kind];
    const a = Math.min(smooth(x.t0, x.t0 + fi, t), fo > 0 ? 1 - smooth(x.t1 - fo, x.t1, t) : 1);
    return { ...x, a, rise: (1 - smooth(x.t0, x.t0 + fi, t)) };
  }).filter(x => x.a > 0.001);
}

// 库的读字规则：中日韩字 ÷ 4.5 + 其他非空白字符 ÷ 15 + 1.5 秒，至少 1.5 秒（core/render/readcheck.mjs 最后把关）
export const need = s => { const c = [...(s || '')]; const cjk = c.filter(ch => /[㐀-鿿豈-﫿　-〿＀-￯]/.test(ch)).length; const other = c.filter(ch => !/\s/.test(ch)).length - cjk; return Math.max(1.5, cjk / 4.5 + other / 15 + 1.5); };
export function reading(plan) {
  const out = [];
  for (const x of textItems(plan)) {
    let have = 0;                                                   // 和 film.js 的 TEXTS 同一个口径：不透明度 ≥ 0.6、不再上浮才算在画面上
    for (let t = x.t0; t <= Math.min(x.t1, plan.dur); t += 0.02) { const y = textsAt(plan, t).find(v => v.id === x.id); if (y && y.a >= 0.6 && y.rise <= 0.05) have += 0.02; }
    for (const k of ['kicker', 'zh', 'en']) if (x[k]) { const n = need(x[k]); if (have < n) out.push(`${x.id} 的「${x[k]}」在画面上约 ${have.toFixed(1)} 秒，读完要 ${n.toFixed(1)} 秒`); }
  }
  return out;
}

// ---------------------------------------------------------------- 没有页面时的几何（node 里的 build.mjs 用）：和引擎的取景、玻璃一致
// 引擎：视角 20°，立方体装下整只容器要 max(19.5 高, 18 宽)，钟罩和球是 (16.5, 15)；玻璃半宽 5.06，球半径 5.5
export function geom(look = {}, aspect = 16 / 9) {
  const round = look.container === 'dome' || look.container === 'sphere', sphere = look.container === 'sphere';
  const t = Math.tan(10 * Math.PI / 180), [fh, fw] = round ? [16.5, 15] : [19.5, 18], fit = Math.max(fh / (2 * t), fw / (2 * t * aspect));
  return {
    camPos: c => { const r = fit * c.dist, s = Math.sin(c.pol); return [c.target[0] + r * s * Math.sin(c.az), c.target[1] + r * Math.cos(c.pol), c.target[2] + r * s * Math.cos(c.az)]; },
    inGlass: ([x, y, z]) => sphere ? Math.hypot(x, y, z) < 5.5 : round ? (y > -5.06 && (y > 0 ? Math.hypot(x, y, z) : Math.hypot(x, z)) < 5.06) : Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) < 5.06,
  };
}
export const geomApi = plan => { const g = Object.fromEntries(plan.lookIds.map(id => [id, geom(plan.looks[id])])); return { camPos: (l, c) => g[l].camPos(c), inGlass: (l, p) => g[l].inGlass(p) }; };

// ---------------------------------------------------------------- 画面事件（声音从这里取时刻）
// api = { camPos(look, cam) → [x,y,z], inGlass(look, p) → bool }：由页面里各外观的 FANGCUN 提供；node 里不传就不算穿玻璃
export function events(plan, api) {
  const ev = [], step = 1 / 96;
  for (const s of plan.shots) {
    ev.push({ t: +s.start.toFixed(3), type: 'shot', id: s.id, move: s.move, look: s.look, in: s.in });
    if (s.i > 0 && s.look !== plan.shots[s.i - 1].look) ev.push({ t: +s.start.toFixed(3), type: 'swap', from: plan.shots[s.i - 1].look, to: s.look, d: s.inDur });
    if (s.wonder != null) ev.push({ t: +(s.start + s.wonder).toFixed(3), type: 'wonder', id: s.id });
  }
  // 整点：时辰每跨过一个整点一次（快进时几秒钟好几个）；rate 是那一刻每秒走过几个小时
  let pst = stateAt(plan, 0), pin = null;
  for (let k = 1; k * step <= plan.body + 1e-9; k++) {
    const t = k * step, st = stateAt(plan, t), h = st.hour, ph = pst.hour, same = st.shot === pst.shot;
    if (same && Math.floor(h) !== Math.floor(ph) && Math.abs(h - ph) < 2) {
      const hh = ((Math.floor(Math.max(h, ph)) % 24) + 24) % 24;
      ev.push({ t: +t.toFixed(3), type: 'chime', hour: hh, rate: +(Math.abs(h - ph) / step).toFixed(3), night: +nightAt(hh).toFixed(2) });
    }
    if (api) {
      const g = api.inGlass(st.look, api.camPos(st.look, st.cam));
      if (pin !== null && g !== pin && same) ev.push({ t: +t.toFixed(3), type: 'glass', dir: g ? 'in' : 'out' });
      pin = g;
    }
    pst = st;
  }
  for (const x of textItems(plan)) ev.push({ t: +x.t0.toFixed(3), type: x.kind === 'end' ? 'endcard' : x.kind, id: x.id });
  if (plan.end) ev.push({ t: +(plan.body - plan.end.fade).toFixed(3), type: 'fade', d: plan.end.fade });
  // 环境采样：每 0.25 秒一条，给风、雪、鸟、水这些底子定强弱（near 越大镜头越近；inside 是镜头在不在玻璃里）
  for (let k = 0; k * 0.25 <= plan.dur + 1e-9; k++) {
    const t = k * 0.25, st = stateAt(plan, t), near = clamp(1 - Math.log(st.cam.dist / 0.08) / Math.log(1.6 / 0.08), 0, 1);
    const inside = api ? api.inGlass(st.look, api.camPos(st.look, st.cam)) : st.cam.dist < 0.2;
    ev.push({ t: +t.toFixed(2), type: 'air', hour: +st.hour.toFixed(3), night: +nightAt(st.hour).toFixed(3), near: +near.toFixed(3), inside, black: +st.black.toFixed(3), look: st.look });
  }
  return ev.sort((a, b) => a.t - b.t);
}
