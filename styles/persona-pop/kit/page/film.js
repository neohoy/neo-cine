// film.js：拟人 MV 的整片页面。按本库的页面约定逐帧画（TECHNIQUE.md §2）：
//   window.DUR       片长（秒）
//   window.render(t) 画 t 秒那一帧：每一段（part）在自己的时间窗里显示，并按段内时间算出所有补间（tween.js，纯函数）
//   window.EV        画面事件：场景用 ctx.hit() 登记的（cut、pose、land、impact、type……）和歌词层的 syl（每个字一个）、slam（居中大字）
//                    —— mix.py 的音效和主旋律都从这里来（neo/audio/cues.py），声音不会和画面各走各的
//   window.TEXTS(t)  画面上该读的字：带 data-read 的元素（歌词行、片名、卡片上的字）；data-pass 的不计时（闪卡、刷屏的代码）
//   window.READY     字体和立绘都就绪
//
// 用法（工程的 index.html）：
//   import { play } from "/styles/persona-pop/kit/page/film.js";
//   play({ dur, fps, cast, lyrics, parts, hud: "样片进度" });
//   parts = [{ id, start, dur, z, html, build(ctx) }]（overlay: true 的不算进 HUD 的格数）；hud = 进度条上的字，false 不要进度条；
//   ctx = { tl, E(id), hit(type, t, extra), fps, start（本段在片中的起点）, lyrics, ...persona.js 的动作 }
//   cast.meta = assets/chars/meta.json（key.py 写的，全身图的比例和位置；没有就按图原样放）
import { Timeline } from "./tween.js";
import { helpers, setCast } from "./persona.js";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const PUNCT = /[，。！？、,.!?]/;

export function play({ dur, fps = 30, cast, lyrics, parts, hud = true }) {
  setCast(cast.images, { dir: cast.dir, ext: cast.ext, meta: cast.meta });
  const stage = document.getElementById("stage");
  const EV = [];
  const all = [...parts];
  if (lyrics) all.push(lyricPart(lyrics, cast, dur));
  if (hud) all.push(hudPart(parts, dur, hud === true ? "进度" : hud));

  const P = all.map((p) => {
    const sec = document.createElement("section");
    sec.className = "part"; sec.id = p.id; sec.style.zIndex = p.z ?? 1;
    sec.innerHTML = p.html;
    stage.appendChild(sec);
    const tl = new Timeline(sec);
    const ctx = { tl, fps, start: p.start, lyrics, E: (id) => sec.querySelector("#" + id), hit: (type, t, extra = {}) => EV.push({ t: +(p.start + t).toFixed(4), type, part: p.id, ...extra }) };
    Object.assign(ctx, helpers(ctx));
    p.build(ctx);
    return { ...p, sec, tl };
  });

  const on = (p, t) => t >= p.start && (t < p.start + p.dur || (p.start + p.dur >= dur - 1e-6 && t <= dur + 1e-6));
  window.DUR = dur;
  window.EV = EV.sort((a, b) => a.t - b.t);
  window.render = (t) => {
    for (const p of P) {
      const v = on(p, t);
      p.sec.style.display = v ? "" : "none";
      if (v) p.tl.render(t - p.start);
    }
  };
  window.TEXTS = () => {
    const out = [];
    for (const p of P) {
      if (p.sec.style.display === "none") continue;
      for (const el of p.sec.querySelectorAll("[data-read]")) {
        if (visibleOpacity(el, p.sec) < 0.5) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        // data-rid：两个镜头里的同一行字（比如片名跨过切点）写同一个 rid，readcheck 就当成一直在的同一块字
        out.push({ id: el.dataset.rid || el.id || el.dataset.read, text: el.dataset.read, x0: r.left, y0: r.top, x1: r.right, y1: r.bottom, ...(el.hasAttribute("data-pass") ? { pass: true } : {}) });
      }
    }
    return out;
  };
  window.render(0);
  const imgs = [...document.images].map((im) => (im.complete ? Promise.resolve() : new Promise((ok) => { im.onload = im.onerror = ok; })));
  Promise.all([document.fonts.ready, ...imgs]).then(() => { window.render(0); window.READY = true; });
}

// 元素自己和祖先（到 section 为止）的不透明度连乘；任何一层 display:none 就算看不见
function visibleOpacity(el, stop) {
  let o = 1;
  for (let n = el; n && n !== stop.parentNode; n = n.parentElement) {
    const cs = getComputedStyle(n);
    if (cs.display === "none" || cs.visibility === "hidden") return 0;
    o *= +cs.opacity;
  }
  return o;
}

// ---------------- 歌词层（STYLE.md §4） ----------------
// 两层：常驻的卡拉 OK 行（整句一直在，逐字填色，带演唱者的名牌），和居中大字（逐字砸下的闪卡，data-pass）。
// 轮到居中大字时，常驻行缩到左上角让位（还在画面里、还能读），大字唱完再回来。每个字登记一个 syl 事件，主旋律跟着它。
function lyricPart(L, cast, dur) {
  const who = (w) => (w.length > 1 ? "duet" : w[0]);
  const col = (w) => (cast.who[w] || cast.who.duet).color;
  const chip = (w) => (cast.who[w] || cast.who.duet).chip;
  const name = (w) => (cast.who[w] || cast.who.duet).name;
  let html = "";
  for (const line of L.lines) {
    html += `<div id="ly-${line.id}" class="ly-line">`;
    line.segs.forEach((s, r) => {
      const w = who(s.who);
      html += `<div class="ly-row" style="top:${r * 185}px"><span class="chip ${chip(w)}">${esc(name(w))}</span>`;
      html += `<div id="ly-${s.id}" class="ly-txt" data-read="${esc(s.text)}">` + s.chars.map((c, i) => `<span id="ly-${s.id}-${i}" class="ly-c">${c.c === " " ? "&nbsp;" : esc(c.c)}</span>`).join("") + `</div></div>`;
    });
    html += `</div>`;
    for (const s of line.segs.filter((s) => s.center)) {
      const sung = s.chars.filter((c) => c.t != null && !PUNCT.test(c.c) && c.c !== " ");
      const fs = Math.min(170, Math.floor(960 / (sung.length + 1)));
      html += `<div id="lyc-${s.id}" class="ly-big" data-read="${esc(s.text)}" data-pass><span class="chip ${chip(who(s.who))}">${esc(name(who(s.who)))}</span><div class="ly-bt" style="font-size:${fs}px">`;
      html += sung.map((c, i) => `<span id="lyc-${s.id}-${i}" class="ly-w" style="color:${col(who(s.who))}">${esc(c.c)}</span>`).join("");
      html += `<span id="lyc-${s.id}-bang" class="ly-w" style="color:${col(who(s.who))}">！</span></div></div>`;
    }
  }
  return {
    id: "lyrics", start: 0, dur, z: 5, html,
    build(ctx) {
      const { tl } = ctx;
      for (const line of L.lines) {
        const box = "#ly-" + line.id;
        tl.fromTo(box, { opacity: 0, x: -60 }, { opacity: 1, x: 0, duration: 0.2, ease: "power3.out" }, line.t0);
        tl.to(box, { opacity: 0, y: -40, duration: 0.14, ease: "power2.in" }, line.t1 - 0.16);
        line.segs.forEach((s, si) => {
          const w = who(s.who);
          s.chars.forEach((c, i) => {
            if (c.t == null) return;
            tl.to(`#ly-${s.id}-${i}`, { color: col(w), duration: 0.06 }, c.t);
            if (PUNCT.test(c.c)) return;
            tl.fromTo(`#ly-${s.id}-${i}`, { scale: 1, y: 0 }, { scale: 1.2, y: -12, duration: 0.07, ease: "power2.out", yoyo: true, repeat: 1, immediateRender: false }, c.t);
            ctx.hit("syl", c.t, { who: w, line: line.id, seg: s.id, i, end: i === s.chars.length - 1 || s.chars.slice(i + 1).every((d) => d.t == null || PUNCT.test(d.c)) });
          });
          if (!s.center) return;
          // 居中大字：常驻行缩到左上角让位，大字逐字砸下（第一帧 1.08 倍，砸字比字头早 25 ms），唱完常驻行回来
          const sung = s.chars.filter((c) => c.t != null && !PUNCT.test(c.c) && c.c !== " ");
          const a = sung[0].t - 0.12, next = line.segs[si + 1];
          const b = next ? next.chars.find((c) => c.t != null).t - 0.14 : line.t1 - 0.16;
          tl.fromTo(box, { scale: 1 }, { scale: 0.5, duration: 0.15, ease: "power2.out", transformOrigin: "0 0", immediateRender: false }, a);
          if (next) tl.fromTo(box, { scale: 0.5 }, { scale: 1, duration: 0.15, ease: "power2.out", immediateRender: false }, b);
          tl.fromTo(`#lyc-${s.id}`, { opacity: 0 }, { opacity: 1, duration: 0.01 }, a);
          tl.to(`#lyc-${s.id}`, { opacity: 0, y: -40, duration: 0.12, ease: "power2.in" }, b);
          sung.forEach((c, i) => {
            const rot = ((i % 3) - 1) * 4;
            tl.fromTo(`#lyc-${s.id}-${i}`, { scale: 2.4, opacity: 0, rotation: rot * 3 }, { scale: 1, opacity: 1, rotation: rot, duration: 0.12, ease: "power4.in" }, c.t - 0.145);
            tl.fromTo(`#lyc-${s.id}-${i}`, { scale: 1.08 }, { scale: 1, duration: 0.07, ease: "power2.out", immediateRender: false }, c.t - 0.025);
          });
          const last = sung[sung.length - 1].t;
          tl.fromTo(`#lyc-${s.id}-bang`, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.18, ease: "back.out(3)" }, last + 0.2);
          ctx.hit("slam", sung[0].t - 0.025, { who: who(s.who), seg: s.id });
        });
      }
    },
  };
}

// ---------------- 进度 HUD：每一段开始时进一格，最后一段退场 ----------------
function hudPart(parts, dur, label) {
  const scenes = parts.filter((p) => !p.overlay);
  const n = scenes.length;
  return {
    id: "hud", start: 0, dur, z: 6,
    html: `<div id="hud-box">${esc(label)} <span id="hud-n">0%</span><div class="tr"><div id="hud-fill"></div></div></div>`,
    build(ctx) {
      const { tl } = ctx, el = ctx.E("hud-n");
      tl.set("#hud-fill", { scaleX: 0, transformOrigin: "0 50%" }, 0);
      tl.fromTo("#hud-box", { x: 320 }, { x: 0, duration: 0.4, ease: "back.out(1.6)" }, scenes[1] ? scenes[1].start - 1.8 : 2);
      scenes.forEach((s, i) => {
        tl.fromTo("#hud-fill", { scaleX: i / n }, { scaleX: (i + 1) / n, duration: 0.3, ease: "power2.out", immediateRender: false }, s.start + 0.05);
        tl.num((v) => { el.textContent = Math.round(v) + "%"; }, (i * 100) / n, ((i + 1) * 100) / n, s.start + 0.05, 0.3, "power2.out", "hud");
      });
      const last = scenes[n - 1];
      tl.to("#hud-box", { x: 320, duration: 0.3, ease: "power2.in" }, last.start - 0.15);
    },
  };
}
