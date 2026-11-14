// 科技发布：镜头列表 → 全片时间线、镜头文字 HTML、画面事件（切点、抬起、角点……和每个音效该落的时刻）、读字时间预估。
// tools/build.mjs 调用这里；时间线注入页面（画面），画面再把事件交给 window.EV（声音、卡点核对都从它来）。
// 改编自 NEO 产品宣传片技能「科技公司式」主题的 theme.mjs（MIT，© 2026 NEO造物集 (neohoy)）。和原版的不同：
//   · 音效不再写成 HyperFrames 的音轨，而是画面事件（type "sfx"），tools/mix.py 按它们放声音；
//   · 每块要读的字带 data-pp-text / data-pp-id，页面据此给 readcheck 报字；plan() 按库的读字规则预估每块字够不够时间；
//   · statement 可以是最后一镜（不退场），bare 的镜头把画框小字淡出；落版后面还有镜头时落版也向左退场。
//
// 镜头类型：opening（开场标题 + 一叠/一片真实组件）、feature（产品镜头）、statement（章节大字，不放界面）、end（落版）
// 产品镜头的版式（layout）：window 上标题下窗口（默认）/ split 左右分栏 / hero 单件特写 / compare 两件对照
export const LAYOUTS = ["window", "split", "hero", "compare"];
// 产品镜头的动作（move），按这个镜头要证明的东西选：
//   lift 抬起"就是这一个" · cascade 波浪"很多、都收拢了" · zoom 推近计数"一个关键数字" · stream 快速滚动"持续、大量" · mark 划重点"原文里就写着"
export const MOVES = ["lift", "cascade", "zoom", "stream", "mark"];
//   开场 open：stack 一叠 / scatter 散落在纵深里；标题 title：blur / waterfall / slices / type（落版）
//   换页 enter：left / up / zoom / wipe / cut；落版 close：sink / square
export const OPENS = ["stack", "scatter"];
export const TITLES = ["blur", "waterfall", "slices", "type"];
export const ENTERS = ["up", "left", "zoom", "wipe", "cut"];
export const CLOSES = ["sink", "square"];
export const BEAT = 0.6;   // 配乐 100 BPM：镜头时长取拍子的整数倍，切点落在拍上

const pick = (v, list, def, what, i) => {
  const x = v ?? def;
  if (!list.includes(x)) throw new Error(`镜头 ${i + 1} 的 ${what} 不认识：${x}，可选 ${list.join("、")}`);
  return x;
};
const snap = (t) => +(Math.round(t / BEAT) * BEAT).toFixed(3);
const snapDown = (t) => +(Math.floor(t / BEAT + 1e-6) * BEAT).toFixed(3);

// 旁白里关键词开始念的时刻（可选：tools/voice.py 写的 voice/cues.json）；镜头的 cue 用它定抬起、说明行出现的那一拍
function wordAt(words, i, key) {
  const ln = words?.[`vo-${i + 1}`];
  if (!ln || !key) return null;
  let text = "";
  const marks = ln.words.map((w) => { const at = text.length; text += w.w; return at; });
  const k = text.indexOf(key);
  if (k < 0) return null;
  let j = 0;
  while (j + 1 < marks.length && marks[j + 1] <= k) j++;
  return ln.at + ln.words[j].t;
}

// 槽位轮换：落在十六分音符的网格上，先半拍一换，后面越换越快，最后停在最后一个词上
function slotTimes(t0, words) {
  const gaps = [0.3, 0.3, 0.3, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15];
  const out = [];
  let t = t0;
  for (let k = 0; k < Math.min(gaps.length, 2 * words - 1); k++) out.push(+(t += gaps[k]).toFixed(3));
  return out;
}

// 读字时间（和 core/render/readcheck.mjs 同一条规则）：汉字 ÷ 4.5 + 其余非空白字符 ÷ 15 + 1.5 秒，不少于 1.5 秒
export function need(text) {
  let cjk = 0, other = 0;
  for (const ch of String(text || "")) {
    if (/\s/.test(ch)) continue;
    if (/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(ch)) cjk++; else other++;
  }
  return Math.max(1.5, cjk / 4.5 + other / 15 + 1.5);
}
const slotFull = (text, slots) => String(text || "").replace("{slot}", slots?.length ? slots[slots.length - 1] : "").replace(/\n/g, "");

export function plan(film, words = null) {
  const shots = film.shots || [];
  if (!shots.length) throw new Error("film.shots 是空的");
  const cueAt = (i, s, name, def, lo, hi) => {
    const w = wordAt(words, i, s.cue?.[name]);
    return Math.min(snapDown(hi), Math.max(lo, w == null ? def : snap(w)));
  };
  let t = 0;
  const out = [];
  shots.forEach((s, i) => {
    const start = +t.toFixed(3), end = +(t + s.dur).toFixed(3);
    t = end;
    const o = { ...s, i, start, end };
    const prev = out[out.length - 1];
    const last = i === shots.length - 1;
    if (s.type === "opening") {
      o.open = pick(s.open, OPENS, "stack", "open", i);
      // 说明那一行等旁白念到它再出来（cue.note），没有旁白时在开场的第三拍；槽位接着开始换；文字在切点前 0.35 秒向左退
      const noteIn = cueAt(i, s, "note", start + (s.noteAt ?? 1.8), start + 1.2, end - 2.4);
      o.ev = { stackIn: start + 0.05, textIn: start + 0.3, noteIn, turn: [start + 1.2, end], textOut: end - 0.35, backOut: end - 0.25 };
      if (s.slots?.length) o.ev.slots = slotTimes(noteIn, s.slots.length);
    } else if (s.type === "feature") {
      const first = !out.some((x) => x.type === "feature");
      o.layout = pick(s.layout, LAYOUTS, "window", "layout", i);
      const win = o.layout === "window";
      const prevWin = prev?.type === "feature" && prev.layout === "window";
      // 开场那叠组件的最前一份正好是这一镜的主角：飞回窗口里自己的格子；散落开场：全部飞回各自的格子（汇聚）
      o.fromStack = win && first && prev?.type === "opening" && prev.page === s.page &&
        (prev.open === "scatter" ? (prev.stack || []).includes(s.hero) : prev.stack?.at(-1) === s.hero);
      o.assemble = o.fromStack && prev.open === "scatter";
      o.first = first;
      o.title = pick(s.title, TITLES.filter((x) => x !== "type"), "blur", "title", i);
      o.move = s.move || (o.layout === "hero" && s.stat ? "zoom" : "lift");
      const moves = win ? MOVES : o.layout === "hero" ? ["lift", "mark", "zoom"] : o.layout === "split" ? ["lift", "mark"] : ["lift"];
      if (!moves.includes(o.move)) throw new Error(`镜头 ${i + 1}（${o.layout} 版式）的 move 不认识：${o.move}，可选 ${moves.join("、")}`);
      if (o.layout === "compare" && (s.with || []).length !== 1) throw new Error(`镜头 ${i + 1}：compare 版式要在 with 里再写一个组件（和 hero 对照）`);
      o.enter = pick(s.enter, ENTERS, "left", "enter", i);
      // 抬起：写了 cue.lift 就是旁白念到它的那一拍，否则 lift 字段（镜头内秒数），再否则窗口镜头 2.4 秒、窗口外 1.2 秒；
      // 最早 1.8 秒（汇聚在 1.2 秒落定，停一拍再抬；窗口外的组件 0.5 秒就停稳，最早 1.2 秒），最晚要给标注和退场留 2.55 秒
      // stream 的滚动在抬起前一拍停住：抬起最早 2.4 秒，滚动才有 1.8 秒，不会被窗口升起、组件飞回吃掉
      const lo = o.move === "stream" ? 2.4 : win ? 1.8 : 1.2;
      const def = start + Math.max(lo, s.lift ?? (win ? 2.4 : 1.2));
      const lift = cueAt(i, s, "lift", def, start + lo, end - 2.55);
      o.ev = {
        winIn: win && first && prev?.type === "opening" ? start + 0.1 : null,
        fly: o.fromStack ? [start - 0.15, start + 1.2] : null,
        sw: win && prevWin ? [start, start + 0.5] : null,
        titleIn: o.fromStack ? start + 0.6 : start,
        scroll: [start, lift],
        lift: [lift, lift + 1.2],
        marks: [lift + 0.6, lift + 1.5],   // 角点在抬起后一拍，标注卡在第二拍
        out: end - 0.75,
        back: [end - 0.6, end - 0.05],
        exit: [end - 0.3, end],
      };
      if (o.move === "cascade") o.ev.wave = [start + 0.6, lift - 0.1];
      if (o.move === "stream") o.ev.scroll = [start, lift - 0.6];
      if (o.move === "zoom") o.ev.count = [lift + 0.6, lift + 1.8];
      if (o.move === "mark") o.ev.sweep = [lift + 1.2, lift + 1.8];
      if (!win) o.ev.in = [start, start + 0.5];
      if (o.layout === "compare") o.ev.join = [lift + 0.6, lift + 1.2];
      if (o.ev.out < o.ev.lift[0] + 1.8) throw new Error(`镜头 ${i + 1}（${s.page}）太短：抬起之后至少还要 2.55 秒`);
    } else if (s.type === "statement") {
      if (!s.en) throw new Error(`镜头 ${i + 1}：statement 要写 en`);
      o.title = pick(s.title, ["waterfall", "blur"], "waterfall", "title", i);
      o.ev = { titleIn: start, exit: last ? null : [end - 0.3, end] };
    } else if (s.type === "end") {
      o.close = pick(s.close, CLOSES, "sink", "close", i);
      o.title = pick(s.title, ["blur", "type"], "blur", "title", i);
      // 方块在第一拍落定，英文接着逐字打出（每个字八分之一拍）；后面还有镜头时，落版在切点前 0.3 秒向左退
      o.ev = { winOut: start, in: start + 0.35, morph: [start, start + 0.6], exit: last ? null : [end - 0.3, end] };
      if (o.title === "type") o.ev.type = [start + 0.6, +(start + 0.6 + [...String(s.en || "")].length * 0.075).toFixed(3)];
    } else throw new Error(`不认识的镜头类型：${s.type}`);
    out.push(o);
  });
  const offBeat = out.filter((s) => Math.abs(s.dur / BEAT - Math.round(s.dur / BEAT)) > 1e-6);
  const p = { dur: +t.toFixed(3), beat: BEAT, shots: out, offBeat: offBeat.map((s) => s.i + 1) };
  p.read = readWindows(p);
  return p;
}

// 每块要读的字大约在画面上停多久（按入场、退场的缓动估算，和页面报给 readcheck 的口径一致），不够的列出来
function readWindows(p) {
  const rows = [];
  const add = (shot, what, text, a, b) => { if (text) rows.push({ shot: shot.i + 1, what, text: flat(text), got: +(b - a).toFixed(2), need: +need(text).toFixed(2) }); };
  for (const s of p.shots) {
    const ev = s.ev, endAt = (x) => (x ? x[0] + 0.25 : p.dur);
    if (s.type === "opening") {
      add(s, "英文", (s.en || []).join(" "), 0, ev.textOut + 0.28);
      add(s, "眉题", s.eyebrow, ev.textIn + 0.17, ev.textOut + 0.28);
      add(s, "中文", slotFull(s.zh, s.slots), ev.textIn + 0.27, ev.textOut + 0.28);
      add(s, "说明", slotFull(s.note, s.slots), ev.noteIn + 0.05, ev.textOut + 0.28);
    } else if (s.type === "feature") {
      const lag = s.title === "waterfall" ? 0.25 : s.title === "slices" ? 0.2 : 0;
      add(s, "英文", s.en, ev.titleIn + (s.title === "waterfall" ? 0.45 : 0.15), ev.exit[0] + 0.25);
      add(s, "中文", s.zh, ev.titleIn + lag + 0.2, ev.exit[0] + 0.25);
      if (s.note) add(s, "说明", s.note, ev.titleIn + lag + 0.3, ev.exit[0] + 0.25);
      const m = s.mark || {};
      if (s.move === "zoom") {
        const a = ev.count[0] - 0.2;
        add(s, "数字卡编号", m.kicker, a, ev.out + 0.15); add(s, "数字卡事实", m.title, a, ev.out + 0.15); add(s, "数字卡说明", m.sub, a, ev.out + 0.15);
      } else if (s.layout === "compare") {
        (s.labels || []).forEach((l, j) => add(s, `标签 ${j + 1}`, l, ev.in[1] + 0.15 * j, ev.out + 0.15));
        add(s, "结论", m.title, ev.join[1] - 0.1, ev.out + 0.15);
        if (m.sub) add(s, "结论说明", m.sub, ev.join[1] - 0.1, ev.out + 0.15);
      } else if (s.mark) {
        add(s, "标注卡编号", m.kicker, ev.lift[0] + 1.07, ev.out + 0.15); add(s, "标注卡事实", m.title, ev.lift[0] + 1.07, ev.out + 0.15);
        add(s, "标注卡说明", m.sub, ev.lift[0] + 1.07, ev.out + 0.15);
      }
      if (s.move === "stream" && s.stat) add(s, "计数说明", s.stat.label, ev.scroll[0] + 0.3, ev.lift[0] + 0.2);
    } else if (s.type === "statement") {
      add(s, "英文", s.en, ev.titleIn + (s.title === "waterfall" ? 0.45 : 0.15), endAt(ev.exit));
      add(s, "眉题", s.eyebrow, ev.titleIn + 0.4, endAt(ev.exit));
      add(s, "中文", s.zh, ev.titleIn + 0.45, endAt(ev.exit));
    } else if (s.type === "end") {
      const at = s.close === "square" ? ev.morph[1] - 0.12 : ev.in;
      add(s, "英文", s.en, s.title === "type" ? ev.type[0] : at + 0.17, endAt(ev.exit));
      add(s, "中文", s.zh, at + 0.17, endAt(ev.exit));
      add(s, "地址", s.note, at + 0.3, endAt(ev.exit));
    }
  }
  return rows;
}

// 文字里写 \n 就在那里换行，避免中文在词中间被折断
const esc = (s) => String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\n", "<br />");
// 换行处：两边都是拉丁字母或数字时算一个空格，否则直接接上
const flat = (s) => String(s ?? "").replace(/([A-Za-z0-9.,;:!?])\n(?=[A-Za-z0-9])/g, "$1 ").replace(/\n/g, "");
const att = (s) => flat(s).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
// 要读的字：data-pp-text 是整块的完整文字，data-pp-id 是它在 readcheck 里的名字
const rd = (id, text) => `data-pp-id="${att(id)}" data-pp-text="${att(text)}"`;

const SLICES = 5;
function enTitle(id, text, mode) {
  const R = rd(id, text);
  if (mode === "waterfall") return `<div class="pp-en pp-wf" ${R}>${String(text).split(" ").map((w) => `<span class="pp-w">${esc(w)}</span>`).join(" ")}</div>`;
  if (mode === "slices") {
    const strips = Array.from({ length: SLICES }, (_, k) =>
      `<span class="pp-sl-s" style="clip-path: inset(${(k * 100) / SLICES}% 0 ${100 - ((k + 1) * 100) / SLICES}% 0)">${esc(text)}</span>`).join("");
    return `<div class="pp-en pp-sl" ${R}><span class="pp-sl-base">${esc(text)}</span>${strips}<i class="pp-sl-bar"></i></div>`;
  }
  if (mode === "type") return `<div class="pp-en pp-ty" ${R}>${[...String(text)].map((c) => `<span class="pp-c">${c === " " ? "&nbsp;" : esc(c)}</span>`).join("")}<span class="pp-caret"></span></div>`;
  return `<div class="pp-en pp-r" ${R}>${esc(text)}</div>`;
}
const slotted = (text, words) => esc(text).replace("{slot}", `<span class="pp-slot">${(words || []).map((w) => `<b class="pp-sw">${esc(w)}</b>`).join("")}</span>`);

// 镜头文字：开场、每个产品镜头的标题、章节大字、落版
export function html(p) {
  return p.shots.map((s) => {
    const n = `s${s.i + 1}`;
    if (s.type === "opening") {
      return `<div id="pp-a" class="pp-shot" data-shot="${s.i}">
          ${s.eyebrow ? `<div class="pp-eyebrow pp-r" ${rd(n + "-eyebrow", s.eyebrow)}>${esc(s.eyebrow)}</div>` : ""}
          <div class="pp-en" ${rd(n + "-en", (s.en || []).join(" "))}>${(s.en || []).map((l) => `<span class="pp-line pp-hold">${esc(l)}</span>`).join("")}</div>
          <div class="pp-zh pp-r" ${rd(n + "-zh", slotFull(s.zh, s.slots))}>${slotted(s.zh, s.slots)}</div>
          ${s.note ? `<div class="pp-note pp-cue" ${rd(n + "-note", slotFull(s.note, s.slots))}>${slotted(s.note, s.slots)}</div>` : ""}
        </div>`;
    }
    if (s.type === "feature" && s.layout === "split") {
      return `<div class="pp-split pp-shot" data-shot="${s.i}">
          ${s.eyebrow ? `<div class="pp-eyebrow pp-r" ${rd(n + "-eyebrow", s.eyebrow)}>${esc(s.eyebrow)}</div>` : ""}
          ${enTitle(n + "-en", s.en, s.title)}
          <div class="pp-zh pp-r" ${rd(n + "-zh", s.zh)}>${esc(s.zh)}</div>
          ${s.note ? `<div class="pp-note pp-r" ${rd(n + "-note", s.note)}>${esc(s.note)}</div>` : ""}
        </div>`;
    }
    if (s.type === "feature") {
      const cls = s.layout === "hero" ? "pp-cap" : "pp-b";
      return `<div class="${cls} pp-shot" data-shot="${s.i}">
          ${enTitle(n + "-en", s.en, s.title)}
          <div class="pp-zh pp-r" ${rd(n + "-zh", s.zh)}>${esc(s.zh)}</div>
        </div>`;
    }
    if (s.type === "statement") {
      return `<div class="pp-stmt pp-shot" data-shot="${s.i}">
          ${s.eyebrow ? `<div class="pp-eyebrow pp-r" ${rd(n + "-eyebrow", s.eyebrow)}>${esc(s.eyebrow)}</div>` : ""}
          ${enTitle(n + "-en", s.en, s.title)}
          ${s.zh ? `<div class="pp-zh pp-r" ${rd(n + "-zh", s.zh)}>${esc(s.zh)}</div>` : ""}
        </div>`;
    }
    return `<div id="pp-end" class="pp-shot" data-shot="${s.i}">
          ${enTitle(n + "-en", s.en, s.title)}
          <i class="pp-sq${s.close === "square" ? "" : " pp-r"}"></i>
          <div class="pp-zh pp-r" ${rd(n + "-zh", s.zh)}>${esc(s.zh)}</div>
          ${s.note ? `<div class="pp-url pp-r" ${rd(n + "-url", s.note)}>${esc(s.note)}</div>` : ""}
        </div>`;
  }).join("\n        ");
}

// 画面事件：切点、抬起、角点、计数、方块落定（卡点核对用），和每个音效该落的时刻（type "sfx"：kind 是 tools/sfx_synth.mjs 的
// 八种合成音效之一，gain 是音量，align 是对齐方式：peak 把声音的峰值放在这一刻，onset 把起音放在这一刻）
export function events(p) {
  const ev = [];
  const sfx = (id, kind, at, gain, align = "peak") => ev.push({ t: +at.toFixed(3), type: "sfx", id, kind, gain, align });
  for (const s of p.shots) {
    const n = s.i + 1, e = s.ev;
    // 给配乐用的镜头结构：每个镜头一条，带它的类型和关键时刻
    ev.push({ t: s.start, type: "shot", i: s.i, kind: s.type, layout: s.layout || null, d: +(s.end - s.start).toFixed(3),
      ...(s.type === "feature" ? { lift: e.lift[0], marks: e.marks[0] } : {}), ...(s.type === "end" ? { morph: e.morph[1] } : {}) });
    if (s.i > 0) ev.push({ t: s.start, type: "cut", i: s.i, enter: s.enter || null });
    if (s.type === "opening") {
      if (s.open === "scatter") {
        sfx(`s${n}-scatter`, "swish", e.stackIn + 0.55, 0.32);
        sfx(`s${n}-settle`, "paper", e.stackIn + 1.15, 0.42);
      } else (s.stack || []).forEach((_, k) => sfx(`s${n}-stack${k + 1}`, "paper", e.stackIn + 0.6 + k * 0.15, 0.4));
      (e.slots || []).forEach((t, k) => sfx(`s${n}-slot${k + 1}`, "tick", t, 0.16 + 0.01 * k));
    } else if (s.type === "feature") {
      ev.push({ t: e.lift[0], type: "lift", i: s.i });
      if (s.fromStack) {
        sfx(`s${n}-fly`, "swish", (e.fly[0] + e.fly[1]) / 2 + 0.05, 0.36);
        sfx(`s${n}-land`, "thud", e.fly[1], 0.7);
        if (s.assemble) [1, 2, 3].forEach((k) => sfx(`s${n}-land${k + 1}`, "tap", e.fly[1] + 0.15 * k, 0.32 - 0.07 * k));
      }
      if (e.in) {
        sfx(`s${n}-in`, "tap", e.in[1], 0.34);
        if (s.layout === "compare") sfx(`s${n}-in2`, "tap", e.in[1] + 0.15, 0.26);
      }
      if (e.join) { ev.push({ t: e.join[0], type: "join", i: s.i }); sfx(`s${n}-join`, "tick", e.join[1], 0.26); }
      if (s.title === "slices") sfx(`s${n}-slices`, "tick", e.titleIn, 0.3);
      if (s.move === "cascade") [0, 1, 2, 3].forEach((k) => sfx(`s${n}-wave${k + 1}`, "tap", e.wave[0] + 0.3 + k * 0.15, 0.26 - k * 0.04));
      if (s.move === "stream") {
        const [a, b] = e.scroll;
        for (let k = 0, tt = a + 0.15; tt < b - 0.1; k++, tt += 0.15 * (1 + k * 0.18)) sfx(`s${n}-roll${k + 1}`, "tick", tt, Math.max(0.05, 0.14 - k * 0.012));
        sfx(`s${n}-stop`, "thud", b, 0.45);
      }
      sfx(`s${n}-lift`, "swish", e.lift[0] + 0.6, 0.26);   // 抬起最快的那一刻在第一拍
      if (s.layout !== "compare") {
        ev.push({ t: e.marks[0], type: "mark", i: s.i });
        sfx(`s${n}-tick1`, "tick", e.marks[0], 0.3);
        sfx(`s${n}-tick2`, "tick", e.marks[0] + 0.6, 0.2);
      }
      if (s.move === "zoom") { ev.push({ t: e.count[1], type: "count", i: s.i }); sfx(`s${n}-count`, "tap", e.count[1], 0.42); }
      if (s.move === "mark") sfx(`s${n}-sweep`, "scribble", e.sweep[0], 0.16, "onset");
    }
    if (s.type === "statement") sfx(`s${n}-hit`, "thud", e.titleIn, 0.4);
    // 切点：前一拍一个渐强推上去，切点那一刻按换页做法落一声（开场接汇聚时由飞行的风声接上）
    const next = p.shots[s.i + 1];
    if (next && (next.type === "feature" || next.type === "statement")) {
      sfx(`s${n}-rise`, "rise", next.start, s.type === "opening" ? 0.16 : 0.14);
      if (next.fromStack);
      else if (next.ev.sw && next.enter === "cut") sfx(`s${n}-cut`, "thud", next.start, 0.6);
      else sfx(`s${n}-seam`, "swish", next.start, next.ev.sw && next.enter === "zoom" ? 0.42 : 0.34);
    }
    if (s.type === "end") {
      sfx(`s${n}-out`, "swish", e.morph[0] + 0.35, 0.3);
      if (s.close === "square") {
        ev.push({ t: e.morph[1], type: "square", i: s.i });
        sfx(`s${n}-square`, "thud", e.morph[1], 0.55);
        sfx(`s${n}-ding`, "ding", e.morph[1], 0.22);
      }
      if (e.type) [...String(s.en || "")].forEach((c, k) => c !== " " && sfx(`s${n}-key${k + 1}`, "tick", e.type[0] + k * 0.075, 0.07, "onset"));
    }
  }
  return ev.sort((a, b) => a.t - b.t);
}
