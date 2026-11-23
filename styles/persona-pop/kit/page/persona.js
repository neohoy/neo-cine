// persona.js：拟人 MV 的元件和动作（STYLE.md §5、§8）。场景脚本只用这里的东西，就不会各写各的。
//
// 元件（返回 HTML 字符串，场景的 html 里拼起来）：
//   char(id, who, poses, {cx, bottom, h})  全身立绘：外层管进出场（x/y），body 管踩拍压缩和跳，每张 img 是一个姿势
//   cu(id, who, pose, {...})               半身特写（姿势名前面自动加 cu-）；{mouth: true} 用这张特写的口型表（-m 闭嘴、-a、-o、-b 眨眼）
//   rays / streaks / emo / sparkle / flash / impact   速度线、横向流线、颜文字气泡、闪光星、白闪、冲击帧
// 动作（build(ctx) 里调用，时间都是本段的秒数；会自己登记画面事件 ctx.hit，音效和主旋律从事件来）：
//   cut(shots, times)  硬切（事件 cut）       swap(a, b, t)  换姿势（0.13 s 回弹，事件 pose）
//   bob / hop / drop    踩拍压缩、跳、从天而降落在拍上（事件 land）
//   kick / shake / flashAt / impactAt / spin / twinkle / emoPop / streak / typeText / count / pop / inFrom
//   sing(id, who, t0, t1, {blinks})  对口型：这个角色唱的每个字张一次嘴（"啊""哦"交替，句尾那个字张得久一点），blinks 里的时刻眨眼
// 角色的立绘列表（CAST）由页面传进来：没有的姿势直接报错，不悄悄换成别的图。
// META 是 key.py 写的 assets/chars/meta.json：同一个角色的全身图按头的大小统一了比例（h 相对定妆图的高度），按身体中线对齐（x），
// 跳起来的离地（y）。每张图按它放：换姿势时人不会忽大忽小、左右跳，跳起来的那张不会被按回地面（STYLE.md §5）。

let CAST = null, META = {}, ASSET = "assets/chars/", EXT = ".webp";
export function setCast(list, { dir, ext, meta } = {}) { CAST = new Set(list); if (dir) ASSET = dir; if (ext) EXT = ext; if (meta) META = meta; }
const place = (name) => { const m = META[name]; return m ? `height:${(m.h * 100).toFixed(2)}%;translate:${(m.x * 100).toFixed(2)}% ${(m.y * 100).toFixed(2)}%;` : ""; };
export const MOUTH = ["m", "a", "o", "b"];
export function img(who, pose) {
  const name = `${who}-${pose}`;
  if (CAST && !CAST.has(name)) throw new Error(`persona.js：立绘里没有 ${name}（cast.json 里登记的有：${[...CAST].join(", ")}）`);
  return ASSET + name + EXT;
}

// ---------------- 元件 ----------------
export function char(id, who, poses, { cx, bottom, h, z = 2 }) {
  const w = Math.round(h * 0.8);
  const imgs = poses.map((p, i) => `<img id="${id}-${p}" class="pose" alt="" src="${img(who, p)}" style="${place(`${who}-${p}`)}opacity:${i ? 0 : 1}">`).join("");
  return `<div id="${id}" class="char" style="left:${cx - w / 2}px;bottom:${bottom}px;width:${w}px;height:${h}px;z-index:${z}"><div id="${id}-body" class="body">${imgs}</div></div>`;
}
export const cu = (id, who, pose, { cx = 540, h = 1500, bottom = -40, z = 2, mouth = false } = {}) =>
  char(id, who, mouth ? MOUTH.map((k) => `cu-${pose}-${k}`) : [`cu-${pose}`], { cx, bottom, h, z });

export function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export const rays = (id, c1, c2 = "transparent", n = 14, extra = "") =>
  `<div id="${id}" class="rays" style="background:repeating-conic-gradient(from 0deg, ${c1} 0deg ${180 / n}deg, ${c2} ${180 / n}deg ${360 / n}deg);${extra}"></div>`;
export function streaks(id, color, n, seed) {
  const r = rng(seed);
  return `<div id="${id}" class="streaks">${Array.from({ length: n }, () => `<i style="top:${Math.round(r() * 1880)}px;left:${Math.round(r() * 900)}px;width:${Math.round(220 + r() * 520)}px;height:${Math.round(6 + r() * 14)}px;background:${color};opacity:${(0.35 + r() * 0.5).toFixed(2)}"></i>`).join("")}</div>`;
}
export const emo = (id, text, x, y, { size = 54, bg = "#fff", color = "#2B2622" } = {}) =>
  `<div id="${id}" class="emo" style="left:${x}px;top:${y}px;font-size:${size}px;background:${bg};color:${color}">${text}</div>`;
export const sparkle = (id, x, y, s = 60, c = "#F2C14E") => `<div id="${id}" class="spk" style="left:${x - s / 2}px;top:${y - s / 2}px;width:${s}px;height:${s}px;background:${c}"></div>`;
export const flash = (id, c = "#fff") => `<div id="${id}" class="flash" style="background:${c}"></div>`;
// 冲击帧：整屏反色剪影 + 放射线，只亮 2 帧（cel 动画的老办法，STYLE.md §8）
export const impact = (id, c = "#1F1F1F") => `<div id="${id}" class="impact">${rays(id + "-r", c, "#fff", 10, "opacity:1;")}</div>`;

// ---------------- 动作 ----------------
export function helpers(ctx) {
  const { tl } = ctx;
  const S = (x) => (x.startsWith("#") || x.startsWith(".") || x.includes(" ") ? x : "#" + x);
  const h = {
    inFrom(sel, t, from, d = 0.45, ease = "back.out(1.4)") {
      tl.fromTo(S(sel), from, { x: 0, y: 0, opacity: 1, rotation: 0, scale: 1, duration: d, ease }, t);
    },
    pop(sel, t, d = 0.3) { tl.fromTo(S(sel), { scale: 0.3, opacity: 0 }, { scale: 1, opacity: 1, duration: d, ease: "back.out(2.6)" }, t); },
    // 硬切：times[i] 起只显示 shots[i]；第二个镜头起每个切点登记一个 cut 事件
    cut(shots, times) {
      shots.forEach((s, i) => tl.set(S(s), { opacity: i === 0 ? 1 : 0 }, 0));
      times.forEach((t, i) => {
        if (!i) return;
        shots.forEach((s, j) => tl.set(S(s), { opacity: j === i ? 1 : 0 }, t));
        ctx.hit("cut", t);
      });
    },
    // 换姿势：新图 0.13 s 回弹到位，然后保持（换图就是一次表演，STYLE.md §5）
    swap(a, b, t, { sound = true } = {}) {
      tl.set(S(a), { opacity: 0 }, t); tl.set(S(b), { opacity: 1 }, t);
      tl.fromTo(S(b), { scaleX: 1.12, scaleY: 0.86 }, { scaleX: 1, scaleY: 1, duration: 0.13, ease: "back.out(3)" }, t);
      if (sound) ctx.hit("pose", t);
    },
    // 踩拍压缩：每拍压一下（扁 3.5 %、宽 2 %），0.28 s 回弹
    bob(id, t0, t1, step = 0.5, amt = 0.035) {
      for (let t = t0; t < t1 - 0.01; t += step)
        tl.fromTo(S(id + "-body"), { scaleY: 1 - amt, scaleX: 1 + amt * 0.6 }, { scaleY: 1, scaleX: 1, duration: 0.28, ease: "back.out(3)", immediateRender: false }, t);
    },
    hop(id, t, hgt = 50) {
      tl.fromTo(S(id + "-body"), { y: 0 }, { y: -hgt, duration: 0.14, ease: "power2.out", yoyo: true, repeat: 1, immediateRender: false }, t);
    },
    // 从天而降：正好在 t 落地（落地那一刻压扁再弹回），登记 land
    drop(id, t, from = -1400, d = 0.32) {
      tl.fromTo(S(id), { y: from, opacity: 1 }, { y: 0, opacity: 1, duration: d, ease: "power2.in" }, t - d);
      tl.fromTo(S(id + "-body"), { scaleY: 0.82, scaleX: 1.12 }, { scaleY: 1, scaleX: 1, duration: 0.3, ease: "back.out(3)", immediateRender: false }, t);
      ctx.hit("land", t);
    },
    // 镜头推一下：每 step 秒放大 amt 再回到 1（同时叠加的推镜加起来别超过 0.06，否则露出画框边）
    kick(sel, t0, t1, step = 1, amt = 0.025) {
      if (amt > 0.06) throw new Error("persona.js：kick 幅度超过 0.06 会露出画框边");
      for (let t = t0; t < t1 - 0.01; t += step) tl.fromTo(S(sel), { scale: 1 + amt }, { scale: 1, duration: 0.35, ease: "power2.out", immediateRender: false }, t);
    },
    shake(sel, t, a, d = 0.35) {
      tl.fromTo(S(sel), { x: 0, y: 0 }, { keyframes: { x: [0, -a, a * 0.8, -a * 0.5, a * 0.3, 0], y: [0, a * 0.4, -a * 0.3, a * 0.2, 0, 0] }, duration: d, ease: "none", immediateRender: false }, t);
    },
    spin(sel, t0, d, deg = 30) { tl.fromTo(S(sel), { rotation: 0 }, { rotation: deg, duration: d, ease: "none" }, t0); },
    flashAt(sel, t, peak = 0.9) { tl.fromTo(S(sel), { opacity: peak }, { opacity: 0, duration: 0.18, ease: "power2.out", immediateRender: false }, t); },
    // 冲击帧：t 起亮 2 帧（fps 由页面给），登记 impact
    impactAt(sel, t, fps = 30) { tl.set(S(sel), { opacity: 1 }, t); tl.set(S(sel), { opacity: 0 }, t + 2 / fps); ctx.hit("impact", t); },
    twinkle(sel, t, d = 0.8) {
      tl.fromTo(S(sel), { scale: 0, rotation: -45, opacity: 1 }, { keyframes: { scale: [0, 1.2, 0.8, 1, 0], rotation: [-45, 0, 30, 60, 90] }, duration: d, ease: "none", immediateRender: false }, t);
      tl.set(S(sel), { opacity: 1 }, t);
    },
    emoPop(sel, t, life = 0) {
      tl.fromTo(S(sel), { scale: 0, rotation: -20, opacity: 1 }, { scale: 1, rotation: 0, duration: 0.3, ease: "back.out(3)" }, t);
      tl.fromTo(S(sel), { rotation: 0 }, { rotation: 6, duration: 0.2, yoyo: true, repeat: 3, ease: "sine.inOut", immediateRender: false }, t + 0.3);
      if (life) tl.to(S(sel), { scale: 0, opacity: 0, duration: 0.15 }, t + life);
      ctx.hit("emo", t);
    },
    streak(sel, t, d, dx = -1400) { tl.fromTo(S(sel) + " i", { x: 0 }, { x: dx, duration: d, ease: "none", stagger: 0.01 }, t); },
    typeText(id, text, t, d) { const el = ctx.E(id); tl.num((v) => { el.textContent = text.slice(0, Math.round(v)); }, 0, [...text].length, t, d, "none", id); ctx.hit("type", t, { d }); },
    count(id, a, b, t, d, fmt, ease = "power1.inOut") { const el = ctx.E(id); tl.num((v) => { el.textContent = fmt(v); }, a, b, t, d, ease, id); },
    // 对口型（STYLE.md §5）：id 是 cu(…, {mouth: true}) 的元件。歌词里 who 唱的字（合唱也算），落在本段 [t0, t1) 的，
    // 每个字张一次嘴："啊""哦"交替，张开 min(0.2 s, 到下一个字的 60 %)，一段的最后一个字张 0.3 s；其余时间闭嘴。
    // blinks：要眨眼的时刻（本段秒数），闭眼 0.1 s，正在张嘴时不眨。只是换图，不登记事件（声音是主旋律的事）。
    sing(id, who, t0, t1, { blinks = [] } = {}) {
      const m0 = ctx.E(id)?.querySelector('img[id$="-m"]');
      if (!m0) throw new Error(`persona.js：sing 要 cu(…, {mouth: true}) 的元件，${id} 不是`);
      const el = (k) => "#" + m0.id.slice(0, -1) + k;
      const show = (k, t) => MOUTH.forEach((m) => tl.set(el(m), { opacity: m === k ? 1 : 0 }, t));
      show("m", t0);
      const open = [];
      for (const line of ctx.lyrics?.lines || []) for (const seg of line.segs) {
        if (!seg.who.includes(who)) continue;
        const ts = seg.chars.map((c) => c.t).filter((t) => t != null).map((t) => +(t - ctx.start).toFixed(4));
        ts.forEach((t, i) => {
          if (t < t0 || t >= t1) return;
          const d = i === ts.length - 1 ? 0.3 : Math.min(0.2, (ts[i + 1] - t) * 0.6);
          open.push([t, Math.min(t + d, t1)]);
        });
      }
      open.forEach(([a, b], i) => { show(i % 2 ? "o" : "a", a); show("m", b); });
      for (const t of blinks) {
        if (t < t0 || t + 0.1 > t1 || open.some(([a, b]) => t < b && t + 0.1 > a)) continue;
        show("b", t); show("m", t + 0.1);
      }
    },
    // 冻结：t 起所有角色停住（不再踩拍），只有底色在变；由场景自己别在这段里排动作，这里只登记 freeze（混音在这里抽掉鼓）
    freeze(t, d) { ctx.hit("freeze", t, { d }); },
  };
  return h;
}
