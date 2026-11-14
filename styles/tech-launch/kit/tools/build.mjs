// 镜头列表 → 整片页面：按 kit/theme.mjs 排出时间线，把冻结的站点、镜头文字、画面事件注入 kit/page/template.html，
// 写出 <工程>/index.html，并把 kit/page/ 的 film.js、tween.js 复制到 <工程>/page/。之后就是库的页面约定（window.render(t) 等），
// core/render/ 的工具和 neo/render/remote.sh 都能直接渲。
//
//   node styles/tech-launch/kit/tools/build.mjs <工程>
// 先跑 tools/freeze.mjs（或 freeze_images.mjs）。有旁白时先跑 tools/voice.py：镜头的 cue 按 voice/cues.json（逐词时间）定时刻。
// 会检查：每个镜头点名的页面和组件都冻结了；划重点的原文在主角里找得到；标注卡、数字卡里的数字能在那一页的文字里找到；
// 每块字按库的读字规则够不够时间（不够的列出来，最后由 core/render/readcheck.mjs 把关）。
//
// 改编自 NEO 产品宣传片技能的 scripts/build.mjs（MIT，© 2026 NEO造物集 (neohoy)）：不再写 HyperFrames 的音轨，声音交给 tools/mix.py。
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { KIT, loadProject, die } from "../lib.mjs";

const { P, cfg } = loadProject(process.argv[2]);
const read = (f) => {
  const p = path.join(P, f);
  if (!fs.existsSync(p)) die(`缺少 ${f}${f.startsWith("site") ? "：先运行 tools/freeze.mjs" : ""}`);
  return fs.readFileSync(p, "utf8");
};
// 主题逻辑：工程里有 theme.mjs 就用工程的（按片子改过的），否则用工具包的
const themeFile = fs.existsSync(path.join(P, "theme.mjs")) ? path.join(P, "theme.mjs") : path.join(KIT, "theme.mjs");
const theme = await import(pathToFileURL(themeFile).href);
const site = JSON.parse(read("site/site.json"));
const pageCfg = Object.fromEntries((cfg.site?.pages || []).map((p) => [p.id, p]));
const wordsFile = path.join(P, "voice/cues.json");
const words = fs.existsSync(wordsFile) ? JSON.parse(fs.readFileSync(wordsFile, "utf8")) : null;

let plan;
try { plan = theme.plan(cfg.film, words); } catch (e) { die(e.message); }
const DUR = plan.dur;
if (plan.offBeat.length) console.warn(`⚠ 镜头 ${plan.offBeat.join("、")} 的时长不是 ${plan.beat} 秒的整数倍，切点会落在拍子之间`);

// ---------- 页面：每个窗口版式的产品镜头一页；开场那叠组件、窗口外版式的组件也取自某一页 ----------
const used = [...new Set(plan.shots.filter((s) => s.page).map((s) => s.page))];
const feats = plan.shots.filter((s) => s.type === "feature");
const winFeats = feats.filter((s) => (s.layout || "window") === "window");
if (new Set(winFeats.map((s) => s.page)).size !== winFeats.length) die("两个窗口版式的产品镜头用了同一页：每页只能用一次，要拍两次就在 site.pages 里再冻结一份（换个 id）");
const PAGES = {}, TEXT = {};
for (const id of used) {
  if (!site.pages.includes(id)) die(`镜头用到了页面「${id}」，但 site/ 里没有冻结它（site.pages 里加上它，再跑 freeze.mjs）`);
  const l = JSON.parse(read(`site/pages/${id}/layout.json`));
  PAGES[id] = { view: l.viewport, doc: l.doc, focus: l.focus, items: l.items.map(({ text, ...it }) => it), ...(l.source === "image" ? { imageScale: l.scale } : {}) };
  TEXT[id] = (l.text || "") + "\n" + l.items.map((it) => it.text || it.name).join("\n");
  if (!l.focus) die(`页面「${id}」没有组件也没有 focus，产品窗口不知道显示哪一块`);
}
const itemOf = (page, k) => (typeof k === "number" ? PAGES[page].items[k] : PAGES[page].items.find((x) => x.name === k));
for (const s of plan.shots) {
  const keys = s.type === "opening" ? s.stack || [] : s.type === "feature" ? [s.hero, ...(s.with || [])] : [];
  for (const k of keys) {
    if (!itemOf(s.page, k)) die(`镜头 ${s.i + 1}：页面「${s.page}」里没有组件「${k}」。有：${PAGES[s.page].items.slice(0, 14).map((x, j) => `${j} ${x.name.slice(0, 18)}`).join("、")}`);
  }
  if (s.type === "feature" && s.highlight && !itemOf(s.page, s.hero).hl?.[s.highlight]?.length) {
    die(`镜头 ${s.i + 1}：主角里找不到要划重点的原文「${s.highlight}」（要一字不差；改了 highlight 要重新冻结）`);
  }
}

// ---------- 事实核对：标注卡、数字卡、标签里的数字，要能在这一页的文字里找到（STYLE.md §1：界面是真的） ----------
const squash = (s) => String(s).replace(/[\s,，]/g, "");
const facts = [];
for (const s of plan.shots.filter((x) => x.page)) {
  const strs = [s.mark?.kicker, s.mark?.title, s.mark?.sub, ...(s.labels || []), s.stat?.label];
  if (s.stat?.to != null) strs.push(`${s.stat.to.toFixed(s.stat.decimals ?? 0)}${s.stat.suffix || ""}`);
  const nums = strs.filter(Boolean).flatMap((x) => String(x).match(/\d[\d.,]*%?/g) || []).filter((n) => n.replace(/\D/g, "").length >= 2);
  for (const n of new Set(nums)) if (!squash(TEXT[s.page]).includes(squash(n))) facts.push(`镜头 ${s.i + 1}（${s.page}）：「${n}」在页面文字里找不到`);
}
if (facts.length) console.warn("⚠ 标注里的数字要能在冻结的页面上找到（STYLE.md §1）。核对一下，是页面上的写法就忽略：\n  " + facts.join("\n  "));

// ---------- 读字时间：按库的规则（汉字 ÷ 4.5 + 其余 ÷ 15 + 1.5 秒）预估 ----------
const short = plan.read.filter((r) => r.got + 1e-6 < r.need);
if (short.length) {
  console.warn("⚠ 这些字停留的时间可能读不完（预估；最后以 core/render/readcheck.mjs 为准）。减字，或加长镜头（0.6 秒一拍）：");
  for (const r of short) console.warn(`  镜头 ${r.shot} ${r.what}「${r.text.slice(0, 20)}」要 ${r.need.toFixed(2)} 秒，约有 ${r.got.toFixed(2)} 秒`);
}

// ---------- 填模板 ----------
const esc = (s) => String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const film = { title: cfg.title, ...cfg.film };
film.window = { bg: site.pageBg || "#ffffff", ...film.window };
const missing = new Set();
let html = fs.readFileSync(path.join(KIT, "page/template.html"), "utf8").replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, key) => {
  const v = key.split(".").reduce((o, k) => (o == null ? o : o[k]), film);
  if (v == null) { missing.add(key); return ""; }
  return esc(v);
});
if (missing.size) die(`promo.json 的 film 里缺这些字段：${[...missing].join("、")}`);

const stages = [...new Set(feats.map((s) => s.page))].map((id) => {
  const pg = PAGES[id];
  return `<div class="pp-stage" data-page="${id}" style="width:${pg.view.width}px;height:${Math.ceil(pg.doc.h)}px">${read(`site/pages/${id}/frozen.html`)}</div>`;
}).join("\n");
const paths = winFeats.map((s) => `<em class="pp-path">${esc(s.path ?? pageCfg[s.page]?.label ?? s.page)}</em>`).join("");
if (used.some((id) => /\s(id|class)="pp-/.test(read(`site/pages/${id}/frozen.html`)))) die("站点里有 pp- 开头的 id 或 class，会和影片撞名（影片自己的 id、class 一律带 pp- 前缀）");

const pick = (o, skip) => Object.entries(o || {}).filter(([k]) => !skip.includes(k));
const htmlAttrs = pick({ ...site.htmlAttrs, ...cfg.site?.htmlAttrs }, ["lang", "style"]);
const bodyAttrs = pick(site.bodyAttrs, ["style"]);
const attrs = (list) => list.map(([k, v]) => `${k}="${esc(v)}"`).join(" ");
const ev = theme.events(plan);
const data = { plan, pages: PAGES, accent: film.brand?.color || "#1a1916", winbg: film.window.bg, ev };
html = html
  .replace("__HTML_ATTRS__", () => attrs(htmlAttrs))
  .replace("__BODY_ATTRS__", () => attrs(bodyAttrs))
  .replace("__PATHS__", () => paths)
  .replace("__SHOTS_HTML__", () => theme.html(plan))
  .replace("__STAGES__", () => stages)
  .replace("__DATA__", () => JSON.stringify(data).replaceAll("<", "\\u003c"));
fs.writeFileSync(path.join(P, "index.html"), html);
fs.mkdirSync(path.join(P, "page"), { recursive: true });
for (const f of ["film.js", "tween.js"]) fs.copyFileSync(path.join(KIT, "page", f), path.join(P, "page", f));

console.log(`index.html：${DUR}s，${plan.shots.length} 个镜头，画面事件 ${ev.length} 个（音效 ${ev.filter((e) => e.type === "sfx").length}）${words ? "，按旁白定时刻" : ""}`);
plan.shots.forEach((s) => console.log(`  镜头 ${s.i + 1} ${s.type.padEnd(9)} ${s.start.toFixed(2)}–${s.end.toFixed(2)}s${s.page ? "  " + s.page : ""}` +
  `${s.layout && s.layout !== "window" ? "  " + s.layout : ""}${s.move ? "  " + s.move : ""}${s.ev.lift ? `  抬起 ${s.ev.lift[0].toFixed(2)}` : ""}${s.fromStack ? "（开场组件飞入）" : ""}`));
