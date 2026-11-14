// 冻结真实站点：浏览器按 promo.json 的 site 逐个打开 pages 里的页面，把样式、字体、图片和渲染完成的 DOM 原样取下来，
// 写进工程的 site/（每页一个子目录，样式和文件共用）。影片里不运行站点脚本：页面是一张"活的截图"，
// 文字能放大、组件能克隆出来做 3D 动作，每一帧又只由时间决定（STYLE.md §2）。
//
//   node styles/tech-launch/kit/tools/freeze.mjs <工程>                 按 promo.json 的 site.url 或 site.dir
//   node styles/tech-launch/kit/tools/freeze.mjs <工程> --dir <站点目录>  这次改从本地目录冻结（同一个站点的本地副本，不写进 promo.json）
//   node styles/tech-launch/kit/tools/freeze.mjs <工程> --url <地址>     这次改从这个地址冻结
// 每页都写了 image（截图输入）时自动转到 freeze_images.mjs。
// 只做"看"：页面操作（actions）只切换、筛选、展开、搜索；密码框、提交按钮一律拒绝；Cookie 横幅用 remove 删掉，不替用户点同意。
//
// 改编自 NEO 产品宣传片技能的 scripts/freeze.mjs（MIT，© 2026 NEO造物集 (neohoy)）：输出目录改成 site/，浏览器改用库的 playwright-core。
import crypto from "node:crypto";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { loadProject, die, opt, launch, loginState, newPage as openTab, goto, runActions, scrollThrough } from "../lib.mjs";

const { P, cfg } = loadProject(process.argv[2]);
const args = process.argv.slice(3);
const site = cfg.site || die("promo.json 缺少 site");
if (site.pages?.length && site.pages.every((p) => p.image)) {
  await import("./freeze_images.mjs");
  process.exit(0);
}
const OUT = path.join(P, "site");
const FILES = path.join(OUT, "files");
const VIEW = site.viewport || { width: 1280, height: 720 };
const DIR = opt(args, "dir") ? path.resolve(opt(args, "dir")) : site.dir ? path.resolve(P, site.dir) : null;
const URL0 = opt(args, "url") || (opt(args, "dir") ? null : site.url);

// ---------- 本地目录用一个临时服务器打开；找不到的路径回落到 index.html（单页应用） ----------
let server, base;
if (DIR && !URL0) {
  const ROOT = DIR;
  if (!fs.existsSync(path.join(ROOT, "index.html"))) die(`${ROOT} 里没有 index.html`);
  const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
    ".json": "application/json", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".otf": "font/otf",
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif",
    ".avif": "image/avif", ".svg": "image/svg+xml", ".ico": "image/x-icon" };
  server = http.createServer((req, res) => {
    let p = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
    if (!p.startsWith(ROOT)) return res.writeHead(403).end();
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, "index.html");
    if (!fs.existsSync(p)) {
      if (path.extname(p)) return res.writeHead(404).end();
      p = path.join(ROOT, "index.html");
    }
    res.writeHead(200, { "content-type": MIME[path.extname(p).toLowerCase()] || "application/octet-stream" });
    fs.createReadStream(p).pipe(res);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}/`;
} else if (URL0) {
  base = URL0;
} else die("site 里要有 url（线上地址）或 dir（本地目录），或者命令行加 --url / --dir");

const browser = await launch();
const storageState = loginState(P, site);
const page = await openTab(browser, { view: VIEW, scale: 1, site, storageState });

async function open(pg, pp = page) {
  const target = new URL(pg.route || "", base).href;
  await goto(pp, target);
  if (pg.htmlAttrs) await pp.evaluate((a) => Object.entries(a).forEach(([k, v]) => document.documentElement.setAttribute(k, v)), pg.htmlAttrs);
  if (pg.waitFor) await pp.waitForSelector(pg.waitFor);
  await runActions(pp, pg.actions, `页面 ${pg.id} 的 actions `);
  if (pg.scrollThrough) await scrollThrough(pp, pg.maxHeight || 4000);
  // 懒加载图片改成立即加载，等字体和图片都到齐；删掉不该进片子的东西（Cookie 横幅、客服气泡）；回到页面顶部
  await pp.evaluate(async (remove) => {
    document.querySelectorAll("img[loading=lazy]").forEach((i) => (i.loading = "eager"));
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((r) => (i.onload = i.onerror = r)))));
    for (const s of remove) document.querySelectorAll(s).forEach((e) => e.remove());
    scrollTo(0, 0);
  }, pg.remove);
  await pp.waitForTimeout(pg.settleMs ?? 300);
  return target;
}

async function capture(pg) {
  const data = await page.evaluate(({ rootSel, itemSel, nameSel, focusSel, view, maxH, phrases }) => {
    const abs = (u, b) => { try { return new URL(u, b).href; } catch { return u; } };
    const fixUrls = (text, b) =>
      text.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, q, u) => (/^(data:|#)/.test(u) ? m : `url("${abs(u, b)}")`));
    // 影片画面是 1920×1080，vh/vw 会按它重算：按冻结时的视口换成像素
    const vunits = (text) => text.replace(/(-?\d*\.?\d+)[dsl]?(vh|vw|vmin|vmax)\b/g, (m, n, u) => {
      const v = { vh: view.height, vw: view.width, vmin: Math.min(view.width, view.height), vmax: Math.max(view.width, view.height) }[u];
      return `${+((n * v) / 100).toFixed(3)}px`;
    });
    // 媒体查询按冻结时的视口求值：命中的展开，不命中的丢掉（影片画面更宽，不能让站点重新判断断点）
    const ser = (rules, b) => [...rules].map((r) => {
      if (r instanceof CSSMediaRule) return matchMedia(r.media.mediaText).matches ? ser(r.cssRules, b) : [];
      if (r instanceof CSSImportRule) return r.styleSheet ? ser(r.styleSheet.cssRules, r.styleSheet.href || b) : [];
      return vunits(fixUrls(r.cssText, b));
    }).flat();
    const css = [];
    const external = [];
    for (const sh of [...document.styleSheets, ...(document.adoptedStyleSheets || [])]) {
      if (sh.media && sh.media.mediaText && !matchMedia(sh.media.mediaText).matches) continue;
      try { css.push(...ser(sh.cssRules, sh.href || document.baseURI)); } catch { external.push(sh.href); }
    }

    const root = document.querySelector(rootSel || "body");
    const all = itemSel ? [...root.querySelectorAll(itemSel)] : [];
    const top = (el) => el.getBoundingClientRect().y + scrollY;
    const items = all.filter((el) => top(el) < maxH);
    items.forEach((el, i) => el.setAttribute("data-promo-item", i));
    all.filter((el) => top(el) >= maxH).forEach((el) => el.setAttribute("data-promo-cut", ""));
    // 固定和吸顶元素：冻结后页面在窗口里平移，它们要跟着页面走
    const pins = [];
    root.querySelectorAll("*").forEach((el) => {
      const p = getComputedStyle(el).position;
      if (p !== "fixed" && p !== "sticky") return;
      const r = el.getBoundingClientRect();
      pins.push({ el, p, r: { x: r.x, y: r.y + scrollY, w: r.width, h: r.height } });
      el.setAttribute("data-promo-pin", pins.length - 1);
    });
    // 页面里的 canvas 换成图片
    const canvases = [...root.querySelectorAll("canvas")].map((c) => { try { return c.toDataURL(); } catch { return null; } });

    const clone = root.cloneNode(true);
    clone.querySelectorAll("script, noscript, [data-promo-cut]").forEach((s) => s.remove());
    document.querySelectorAll("[data-promo-cut]").forEach((el) => el.removeAttribute("data-promo-cut"));
    clone.querySelectorAll("[data-promo-pin]").forEach((el) => {
      const { p, r } = pins[+el.getAttribute("data-promo-pin")];
      if (p === "sticky") Object.assign(el.style, { position: "relative", top: "auto", bottom: "auto" });
      else Object.assign(el.style, { position: "absolute", left: `${r.x}px`, top: `${r.y}px`, right: "auto", bottom: "auto", width: `${r.w}px`, height: `${r.h}px` });
      el.removeAttribute("data-promo-pin");
    });
    clone.querySelectorAll("canvas").forEach((c, i) => {
      if (!canvases[i]) return;
      const img = document.createElement("img");
      img.src = canvases[i];
      img.className = c.className;
      img.style.cssText = c.style.cssText;
      img.width = c.width; img.height = c.height;
      c.replaceWith(img);
    });
    clone.querySelectorAll("img").forEach((img) => {
      if (img.getAttribute("src")) img.setAttribute("src", abs(img.getAttribute("src"), document.baseURI));
      if (img.getAttribute("srcset")) {
        img.setAttribute("srcset", img.getAttribute("srcset").split(",").map((s) => {
          const [u, d] = s.trim().split(/\s+/);
          return [abs(u, document.baseURI), d].filter(Boolean).join(" ");
        }).join(", "));
      }
      img.removeAttribute("loading");
    });
    clone.querySelectorAll("[style]").forEach((el) => el.setAttribute("style", vunits(fixUrls(el.getAttribute("style"), document.baseURI))));
    document.querySelectorAll("[data-promo-pin]").forEach((el) => el.removeAttribute("data-promo-pin"));

    const rect = (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y + scrollY, w: r.width, h: r.height }; };
    // 组件实际露出的底色：本身透明就往上找，浮起来时补上
    const bgOf = (el) => {
      for (let n = el; n; n = n.parentElement) {
        const c = getComputedStyle(n).backgroundColor;
        if (c && c !== "rgba(0, 0, 0, 0)" && c !== "transparent") return c;
      }
      return "#ffffff";
    };
    // 要划重点的原文：在组件里找到这段文字，记下它相对组件左上角的位置（可能折成几行）
    const hlOf = (el) => {
      const out = {};
      const box = el.getBoundingClientRect();
      for (const ph of phrases) {
        const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let n = walk.nextNode(); n; n = walk.nextNode()) {
          const k = n.textContent.indexOf(ph);
          if (k < 0) continue;
          const r = document.createRange();
          r.setStart(n, k);
          r.setEnd(n, k + ph.length);
          out[ph] = [...r.getClientRects()].map((q) => ({ x: q.x - box.x, y: q.y - box.y, w: q.width, h: q.height }));
          break;
        }
      }
      return out;
    };
    const itemRects = items.map((el, i) => ({ i, name: (nameSel ? el.querySelector(nameSel) : el)?.textContent.trim().replace(/\s+/g, " ") || "",
      text: el.textContent.replace(/\s+/g, " ").trim().slice(0, 400), bg: bgOf(el), hl: hlOf(el), ...rect(el) }));
    let focus = focusSel && document.querySelector(focusSel) ? rect(document.querySelector(focusSel)) : null;
    if (!focus && itemRects.length) {
      const x1 = Math.min(...itemRects.map((r) => r.x)), y1 = Math.min(...itemRects.map((r) => r.y));
      focus = { x: x1, y: y1, w: Math.max(...itemRects.map((r) => r.x + r.w)) - x1, h: Math.max(...itemRects.map((r) => r.y + r.h)) - y1 };
    }
    const attrs = (el) => Object.fromEntries([...el.attributes].map((a) => [a.name, a.value]));
    return {
      css, external, html: clone.outerHTML,
      layout: {
        view: { w: innerWidth, h: innerHeight },
        doc: { h: Math.min(document.documentElement.scrollHeight, maxH) },
        root: rect(root),
        focus, items: itemRects,
        htmlAttrs: attrs(document.documentElement),
        pageBg: [document.body, document.documentElement].map((e) => getComputedStyle(e).backgroundColor).find((c) => c && c !== "rgba(0, 0, 0, 0)" && c !== "transparent") || "#ffffff",
        bodyAttrs: attrs(document.body),
        // 页面上的全部文字（标注卡核对事实用：kit/tools/build.mjs 检查标注卡、数字卡里的数字能不能在页面上找到）
        text: root.innerText.replace(/[ \t]+/g, " ").slice(0, 200000),
      },
    };
  }, { rootSel: pg.root, itemSel: pg.items?.selector, nameSel: pg.items?.name, focusSel: pg.focus, view: VIEW, maxH: pg.maxHeight || 4000,
    phrases: (cfg.film?.shots || []).filter((s) => s.page === pg.id && s.highlight).map((s) => s.highlight) });

  // 跨域样式表读不到规则：取原文补上（这部分的媒体查询不再求值）
  for (const href of data.external) {
    const r = await page.request.get(href).catch(() => null);
    if (r?.ok()) {
      const text = await r.text();
      data.css.push(text.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, q, u) => (/^(data:|#)/.test(u) ? m : `url("${new URL(u, href).href}")`)));
    } else console.warn(`⚠ 样式表取不到：${href}`);
  }
  return data;
}

// ---------- 逐页冻结；样式按规则去重合并成一份 ----------
const pages = site.pages || die("site.pages 是空的：列出要拍的页面");
const ids = new Set();
for (const pg of pages) {
  if (!/^[\w-]+$/.test(pg.id || "")) die(`页面 id 只能用字母、数字、- 和 _：${pg.id}`);
  if (ids.has(pg.id)) die(`页面 id 重复：${pg.id}`);
  ids.add(pg.id);
}
fs.rmSync(OUT, { recursive: true, force: true });
const shots = [];
const cssLines = new Set();
for (const pg0 of pages) {
  const pg = { root: site.root, htmlAttrs: site.htmlAttrs, settleMs: site.settleMs, scrollThrough: site.scrollThrough ?? !!URL0, ...pg0,
    remove: [...(site.remove || []), ...(pg0.remove || [])] };
  const target = await open(pg);
  const data = await capture(pg);
  data.css.forEach((r) => r.trim() && cssLines.add(r));
  fs.mkdirSync(path.join(OUT, "pages", pg.id), { recursive: true });
  // 参考截图放在 out/ 里：只给人对照用，不进页面、不送渲染机
  fs.mkdirSync(path.join(P, "out", "reference"), { recursive: true });
  await page.screenshot({ path: path.join(P, "out", "reference", `${pg.id}.png`), fullPage: true }).catch(() => {});
  shots.push({ pg, target, data });
}
fs.mkdirSync(FILES, { recursive: true });
const saved = new Map();
async function localize(u) {
  if (saved.has(u)) return saved.get(u);
  let name = null;
  const r = await page.request.get(u).catch(() => null);
  if (r?.ok()) {
    const ext = (path.extname(new URL(u).pathname) || ".bin").slice(0, 8);
    const stem = path.basename(new URL(u).pathname, path.extname(new URL(u).pathname)).replace(/[^\w.-]/g, "_").slice(0, 40) || "file";
    name = `${stem}-${crypto.createHash("sha1").update(u).digest("hex").slice(0, 8)}${ext}`;
    fs.writeFileSync(path.join(FILES, name), await r.body());
  } else console.warn(`⚠ 文件取不到，保留原地址：${u}`);
  saved.set(u, name);
  return name;
}
const URL_RE = /url\("(https?:[^"]+)"\)/g;
let css = [...cssLines].join("\n");
const urls = new Set([...css.matchAll(URL_RE)].map((m) => m[1]));
for (const { data } of shots) {
  for (const m of data.html.matchAll(/(?:src|srcset|style)="([^"]+)"/g)) {
    for (const u of m[1].match(/https?:\/\/[^\s",)]+/g) || []) urls.add(u.replace(/&amp;/g, "&"));
  }
}
for (const u of urls) await localize(u);
const rel = (prefix) => (m, u) => (saved.get(u) ? m.replace(u, prefix + saved.get(u)) : m);
css = css.replace(URL_RE, rel("files/"));
for (const sh of shots) {
  let html = sh.data.html;
  for (const [u, name] of saved) if (name) html = html.split(u.replace(/&/g, "&amp;")).join(`site/files/${name}`).split(u).join(`site/files/${name}`);
  sh.html = html;
}
const html = shots.map((x) => x.html).join("\n");
await browser.close();
server?.close();

// ---------- 字体 ----------
// 站点自带的字体文件（@font-face 里的 url）原样下载、原样使用。字体栈里没有文件的名字（系统字体），用 local() 声明：
// 中文无衬线系统字体（苹方、微软雅黑、冬青黑体……）一律按字重换成本机有的那一款（Mac 苹方，Windows 微软雅黑），
// 这就是站点自己在这两种系统上的样子。local() 只认具体字重的名字（PingFangSC-Medium），所以每个字重各声明一次。
// 站点字体的许可由用户负责（PRODUCTION.md §3）；影片自己的字（标题、标注卡）不用这些，用工具包的 OFL 字体。
const GENERIC = new Set(["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "ui-serif", "ui-sans-serif",
  "ui-monospace", "ui-rounded", "emoji", "math", "fangsong", "inherit", "initial", "unset", "revert", "-apple-system", "blinkmacsystemfont"]);
const CJK_SANS = /pingfang|hiragino sans|microsoft yahei|yahei|heiti|noto sans (sc|cjk)|source han sans|harmonyos|思源黑体|苹方|微软雅黑/i;
const CJK_FACES = [
  [300, ["PingFangSC-Light", "PingFang SC Light", "MicrosoftYaHeiLight", "Microsoft YaHei Light"]],
  [400, ["PingFangSC-Regular", "PingFang SC Regular", "MicrosoftYaHei", "Microsoft YaHei"]],
  [500, ["PingFangSC-Medium", "PingFang SC Medium", "MicrosoftYaHei", "Microsoft YaHei"]],
  [600, ["PingFangSC-Semibold", "PingFang SC Semibold", "MicrosoftYaHei-Bold", "Microsoft YaHei Bold"]],
  [700, ["PingFangSC-Semibold", "PingFang SC Semibold", "MicrosoftYaHei-Bold", "Microsoft YaHei Bold"]],
];
const declared = new Set([...css.matchAll(/@font-face\s*{[^}]*font-family:\s*([^;]+);/g)].map((m) => m[1].trim().replace(/^["']|["']$/g, "").toLowerCase()));
const used = new Set();
const FONT_LIST = /\b(serif|sans-serif|monospace|system-ui|cursive)\b/;
for (const m of (css + html.replaceAll("&quot;", '"')).matchAll(/(font-family|font|--[\w-]+)\s*:\s*([^;}]+)/g)) {
  const [, prop, value] = m;
  if (prop.startsWith("--") && !FONT_LIST.test(value)) continue;
  for (const q of value.matchAll(/["']([^"']+)["']/g)) used.add(q[1].trim());
  if (prop !== "font") value.split(",").map((t) => t.trim()).filter((t) => /^[A-Za-z][\w -]*$/.test(t)).forEach((t) => used.add(t));
}
const system = [...used].filter((f) => !declared.has(f.toLowerCase()) && !GENERIC.has(f.toLowerCase()) && !f.startsWith("var("));
const faces = system.flatMap((f) => CJK_SANS.test(f)
  ? CJK_FACES.map(([w, names]) => `@font-face{font-family:"${f}";src:${names.map((n) => `local("${n}")`).join(",")};font-weight:${w}}`)
  : [`@font-face{font-family:"${f}";src:local("${f}")}`]);
// 站点自己的 transition、animation 一律删掉（它们走浏览器时钟，逐帧渲染时每帧不一致），再加一条全局兜底
css = css.replace(/(transition|animation)(-[\w-]+)?\s*:[^;}]*;?/g, "");
const still = "*,*::before,*::after{transition-property:none!important;animation-name:none!important;caret-color:transparent!important}";
fs.writeFileSync(path.join(OUT, "site.css"), `${faces.join("\n")}\n${css}\n${still}\n`);
for (const { pg, target, data, html: h } of shots) {
  const dir = path.join(OUT, "pages", pg.id);
  fs.writeFileSync(path.join(dir, "frozen.html"), h);
  fs.writeFileSync(path.join(dir, "layout.json"), JSON.stringify({ id: pg.id, target, viewport: VIEW, ...data.layout }, null, 2));
}
const webFonts = [...declared];
fs.writeFileSync(path.join(OUT, "site.json"), JSON.stringify({ frozenAt: new Date().toISOString(), base: URL0 || "local", viewport: VIEW,
  pages: shots.map((x) => x.pg.id), htmlAttrs: shots[0].data.layout.htmlAttrs, bodyAttrs: shots[0].data.layout.bodyAttrs, pageBg: shots[0].data.layout.pageBg,
  fonts: { web: webFonts, system } }, null, 2));

console.log(`冻结 ${shots.length} 页（${URL0 || "本地目录"}），CSS ${(css.length / 1024).toFixed(0)}KB，本地化文件 ${[...saved.values()].filter(Boolean).length} 个`);
console.log(`  站点字体文件：${webFonts.join("、") || "无"}；系统字体 local()：${system.join("、") || "无"}（许可由用户负责，写进 CREDITS）`);
for (const { pg, target, data, html: h } of shots) {
  const it = data.layout.items;
  console.log(`  ${pg.id}（${target.replace(base, "/")}）：DOM ${(h.length / 1024).toFixed(0)}KB，高 ${data.layout.doc.h}px，组件 ${it.length} 个${it.length ? "：" + it.slice(0, 6).map((i) => i.name.slice(0, 16)).join("、") + (it.length > 6 ? "…" : "") : ""}`);
}
console.log("  参考截图：out/reference/<页面>.png（和片子里的界面对照：字体、图片、布局、点过之后的状态）");
