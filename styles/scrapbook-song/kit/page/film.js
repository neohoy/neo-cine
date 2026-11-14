// 手账歌谣的整片页面（工具包 kit/page/，tools/build.py 每次复制到工程里）：把 scenes/ 里的镜头挂到舞台上，
// 按本库的页面约定逐帧画（TECHNIQUE.md §2）。scenes/manifest.json 由 tools/build.py 写。
//   window.DUR      片长（秒）
//   window.render(t) 画 t 秒那一帧：只显示当前镜头，用 gsap-lite 把它的时间轴算到镜头内时间
//   window.EV       画面事件（镜头切点、每句歌词开唱、重拍），mix.py 用它核对画面和歌
//   window.TEXTS(t) 画面上除歌词以外的字（招牌、车票、页码、片尾卡），readcheck 用
//   window.LYRICS(t) 画面上的歌词块，tools/lyriccheck.mjs 用（歌词就是这部片子的字幕，规则见 STYLE.md §4）
//   window.READY    字体和镜头都就绪
// 镜头文件由 tools/build_scenes.py 生成：每个是一个 <template>，里面一段样式、一个 SVG 根节点和一段建时间轴的脚本
// （和 HyperFrames 的子合成同一个格式）。脚本里调用的 gsap 是 gsap-lite.js 的替身。
import { gsapFor } from './gsap-lite.js';

const TXT = 'text:not([data-layout-ignore])';
// 不要求读完的字（readcheck 记为 pass，只列出、不计时）：mv.json 的 pass_texts，{镜头 id: [整块文字, …]}，
// 每一条都应该在 mv.json 旁边写明为什么（一闪而过的戳、运送途中的道具……）。页码一律 pass（见 textBlocks）。
let PASSED = {};

const M = await (await fetch('scenes/manifest.json')).json();
PASSED = M.pass || {};
const stage = document.getElementById('stage');
const scenes = [];
for (const s of M.scenes) {
  const html = await (await fetch('scenes/' + s.file)).text();
  const tpl = new DOMParser().parseFromString(html, 'text/html').querySelector('template');
  const wrap = document.createElement('div');
  wrap.className = 'scene';
  wrap.style.display = 'none';           // 不在画面里的镜头整个不画（SVG 滤镜即使 visibility:hidden 也会算）
  for (const n of tpl.content.querySelectorAll('style, [data-composition-id]')) wrap.appendChild(document.importNode(n, true));
  stage.appendChild(wrap);
  const root = wrap.querySelector('[data-composition-id]');
  const reg = {};
  new Function('gsap', 'window', tpl.content.querySelector('script').textContent)(gsapFor(root), { __timelines: reg });
  const tl = reg[s.fid];
  if (!tl) throw new Error('镜头脚本没有登记时间轴：' + s.fid);
  if (tl.missing.size) console.warn(s.fid + ' 里有补间找不到目标：' + [...tl.missing].join(' '));
  scenes.push({ ...s, wrap, root, tl, blocks: textBlocks(root, s.fid) });
}

// 字体：页面里 @font-face 声明了四种（KL 站酷快乐体、WK 霞鹜文楷、JBM JetBrains Mono、IS Instrument Serif），等它们都到位
await Promise.all(['KL', 'WK', 'JBM', 'IS'].map((f) => document.fonts.load(`40px "${f}"`, '风A1')));
await document.fonts.ready;

window.DUR = M.dur;
window.EV = M.ev;
let cur = null;
const sceneAt = (g) => scenes.find((s) => g >= s.g0 && g < s.g1) || scenes[scenes.length - 1];
window.render = (t) => {
  const g = M.t0 + t, s = sceneAt(g);
  if (cur !== s) { if (cur) cur.wrap.style.display = 'none'; s.wrap.style.display = 'block'; cur = s; }
  s.tl.render(g - s.g0);
};

// ---------------------------------------------------------------- 画面上的字
// 一个"字块"：sc.chars 排出来的一句（每个字一个 <g id=前缀+键+序号>，里面只有这一个字，同一个键的兄弟算一块，文字是整句）；
// VT 竖排的一列（同一个父节点下、x 相同的几个 <text>，比如印章）；或者一个单独的 <text>。硬阴影那一层（data-layout-ignore）不算。
function textBlocks(root, fid) {
  const blocks = new Map();
  let n = 0;
  for (const el of root.querySelectorAll(TXT)) {
    let key, g = el;
    while (g && g !== root && !g.id) g = g.parentElement;
    const m = g && g.id && /^(.+?)(\d+)$/.exec(g.id);
    const sibs = el.parentElement.querySelectorAll(':scope > ' + TXT);
    if (m && (g === el || g.querySelectorAll(TXT).length === 1) && g.parentElement.querySelector(`[id="${m[1]}0"]`)) key = fid + ':' + m[1];
    else if ([...sibs].filter((e) => e.getAttribute('x') === el.getAttribute('x')).length > 1) key = fid + ':col' + el.getAttribute('x') + ':' + [...root.querySelectorAll('*')].indexOf(el.parentElement);
    else key = fid + ':t' + n++;
    let b = blocks.get(key);
    if (!b) blocks.set(key, (b = { id: key, els: [], text: '', pass: false }));
    b.els.push(el);
    b.text += el.textContent.trim();
  }
  // 右下角的页码（「05 / 10」）是拼贴本页角的装饰，也不计时
  for (const b of blocks.values()) b.pass = (PASSED[fid] || []).includes(b.text) || /^\d\d \/ \d\d$/.test(b.text);
  return [...blocks.values()];
}
const shown = (el, root) => {          // 元素自己和所有上层的不透明度乘起来
  let o = 1;
  for (let e = el; e && e !== root.parentElement; e = e.parentElement) {
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden') return 0;
    o *= +cs.opacity;
  }
  return o;
};
const norm = (s) => s.replace(/[\s·「」]/g, '');
// 这个字块是不是歌词：整块是某句歌词的一段，而且那句正在唱或刚唱完（比如砸下来的「家」）
function lyricOf(b, t) {
  const tx = norm(b.text);
  if (!tx) return null;
  for (const l of M.lyrics) {
    const lt = norm(l.text);
    if (lt.includes(tx) && t >= l.t0 - 1.5 && t <= l.t1 + 4) return l;   // 只认这一句前后几秒内的（印章上的「风吹新竹」是歌名，不是歌词）
  }
  return null;
}
function visibleBlocks(t) {
  const out = [];
  if (!cur) return out;
  for (const b of cur.blocks) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, on = 0;
    for (const el of b.els) {
      if (shown(el, cur.root) < 0.5) continue;
      const r = el.getBoundingClientRect();
      if (!r.width) continue;
      on++; x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom);
    }
    if (x1 <= 0 || y1 <= 0 || x0 >= innerWidth || y0 >= innerHeight) continue;   // 已经整个吹出画面
    if (on) out.push({ id: b.id, text: b.text, x0, y0, x1, y1, all: on === b.els.length, pass: b.pass, lyric: lyricOf(b, t) });
  }
  return out;
}
window.TEXTS = (t) => visibleBlocks(t).filter((b) => !b.lyric).map(({ id, text, x0, y0, x1, y1, pass }) => ({ id, text, x0, y0, x1, y1, ...(pass ? { pass } : {}) }));
window.LYRICS = (t) => visibleBlocks(t).filter((b) => b.lyric).map(({ id, text, x0, y0, x1, y1, all, lyric }) => ({ id, text, x0, y0, x1, y1, all, line: lyric.i }));
window.LYRIC_LINES = M.lyrics;

window.render(0);
window.READY = true;
