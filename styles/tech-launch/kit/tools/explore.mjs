// 探索线上站点：用户只给一个网址时，从首页顺着站内链接往下找页面，每页截一屏、列出能浮起的组件和能点的东西，
// 拼一张总览图，帮你挑出要拍的几页，再写进 promo.json 的 site.pages。只看不改：不提交表单、不登录、不点同意按钮。
// 改编自 NEO 产品宣传片技能的 scripts/explore.mjs（MIT，© 2026 NEO造物集 (neohoy)）：浏览器改用库的 playwright-core，输出改到 explore/。
//
// 用法：node styles/tech-launch/kit/tools/explore.mjs <工程> [--url 地址] [--max 24] [--depth 2] [--subdomains]
//   --url：不写就用 promo.json 的 site.url
//   --max：最多看多少页（默认 24）；--depth：从首页往下点几层（默认 2）
//   --subdomains：同一个主域名下的子域名也算站内（www.x.com 和 app.x.com、docs.x.com）
// 输出在 <工程>/explore/：overview.png（所有页面的缩略图）、每页一屏截图、pages.json（每页的标题、组件候选、可点元素）
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadProject, die, goto, launch, loginState, newPage, scrollThrough } from "../lib.mjs";

const { P, cfg } = loadProject(process.argv[2]);
const args = process.argv.slice(3);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const site = cfg.site || {};
const start = opt("url", site.url) || die("没有网址：加 --url，或在 promo.json 的 site.url 里写上");
const MAX = +opt("max", 24), DEPTH = +opt("depth", 2), SUB = args.includes("--subdomains");
const VIEW = site.viewport || { width: 1280, height: 720 };
const OUT = path.join(P, "explore");

// 主域名：最后两段；com.cn、co.uk 这类取最后三段
const apex = (h) => { const p = h.split("."); return p.slice(/^(com|net|org|gov|edu|co|ac)$/.test(p.at(-2)) && p.length > 2 ? -3 : -2).join("."); };
const base = new URL(start);
const inSite = (u) => u.origin === base.origin || (SUB && apex(u.hostname) === apex(base.hostname) && /^https?:$/.test(u.protocol));
// 单页应用的 #/路由 算不同页面，其余的 # 锚点去掉
const norm = (u) => {
  const x = new URL(u);
  if (!/^#!?\/./.test(x.hash)) x.hash = "";
  return x.href;
};
const SKIP_EXT = /\.(pdf|zip|rar|7z|dmg|exe|msi|apk|jpe?g|png|gif|webp|svg|mp4|mov|mp3|wav|xml|json|txt|csv|xlsx?|docx?|pptx?)$/i;
// 同一种页面（/company/123、/company/456）只看两张
const kind = (u) => {
  const x = new URL(u);
  const segs = (x.pathname + (x.hash.replace(/^#!?/, "") || "")).split("/").filter(Boolean);
  return x.host + "/" + (segs.length >= 2 ? [...segs.slice(0, -1), "*"] : segs).join("/");
};

const browser = await launch();
const storageState = loginState(P, site);
const page = await newPage(browser, { view: VIEW, site, storageState });
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const queue = [[norm(start), 0]];
const seen = new Set([norm(start)]);
const perKind = new Map();
const pages = [];
while (queue.length && pages.length < MAX) {
  const [url, depth] = queue.shift();
  const k = kind(url);
  if ((perKind.get(k) || 0) >= 2) continue;
  perKind.set(k, (perKind.get(k) || 0) + 1);
  try {
    await goto(page, url);
  } catch (e) {
    console.warn(`⚠ 打不开 ${url}：${String(e.message).split("\n")[0]}`);
    continue;
  }
  await scrollThrough(page);
  const n = String(pages.length + 1).padStart(2, "0");
  const shot = `${n}.png`;
  await page.screenshot({ path: path.join(OUT, shot) });
  const info = await page.evaluate(() => {
    // 收起的 <details>、display:none 的祖先里的东西都算看不见（和 Playwright 点击时的判断一致）
    const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (el.checkVisibility ? el.checkVisibility({ visibilityProperty: true }) : getComputedStyle(el).visibility !== "hidden"); };
    const txt = (el) => (el?.textContent || "").replace(/\s+/g, " ").trim();
    const sel = (el) => {
      const cls = [...el.classList].filter((c) => !/^(is-|has-|active|selected|open|hover|focus)/.test(c) && !/\d{3,}/.test(c)).slice(0, 2);
      return el.tagName.toLowerCase() + cls.map((c) => "." + CSS.escape(c)).join("");
    };
    const path = (el) => { const out = []; for (let n = el; n && n !== document.body && out.length < 3; n = n.parentElement) { out.unshift(sel(n)); if (n.id) { out[0] = "#" + CSS.escape(n.id); break; } } return out.join(" > "); };
    // 组件候选：同一个父元素下 3 个以上长得一样的块（卡片、列表行、指标格），足够大、在前 4000 像素内
    const groups = new Map();
    document.querySelectorAll("body *").forEach((el) => {
      if (!el.parentElement || !vis(el)) return;
      const r = el.getBoundingClientRect();
      if (r.width < 120 || r.height < 40 || r.top + scrollY > 4000) return;
      const key = path(el.parentElement) + " > " + sel(el);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(el);
    });
    const items = [...groups.entries()].filter(([, els]) => els.length >= 3 && els.length <= 60)
      .map(([selector, els]) => {
        const r = els[0].getBoundingClientRect();
        const name = els[0].querySelector("h1,h2,h3,h4,strong,b,[class*=title],[class*=name]");
        return { selector, count: els.length, w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top + scrollY),
          name: name ? sel(name) : null, sample: els.slice(0, 3).map((e) => txt(name ? e.querySelector(sel(name)) || e : e).slice(0, 24)) };
      })
      // 嵌套的重复块只留最外层，按面积排序
      .filter((g, _, all) => !all.some((o) => o !== g && g.selector.startsWith(o.selector + " ")))
      .sort((a, b) => b.w * b.h * b.count - a.w * a.h * a.count).slice(0, 6);
    // 能点的东西：标签页、按钮、下拉、折叠、搜索框，挑页面上能切出不同状态的
    const clickable = [];
    const push = (type, el, how) => { if (vis(el) && clickable.length < 20) clickable.push({ type, text: txt(el).slice(0, 20), how }); };
    document.querySelectorAll("[role=tab], [role=tablist] > *").forEach((el) => push("标签", el, `text=${txt(el).slice(0, 20)}`));
    document.querySelectorAll("button, [role=button]").forEach((el) => txt(el) && !el.closest("[role=tablist]") && push("按钮", el, `role=button[name="${txt(el).slice(0, 20)}"]`));
    document.querySelectorAll("select").forEach((el) => push("下拉", el, path(el)));
    document.querySelectorAll("details > summary").forEach((el) => push("折叠", el, `text=${txt(el).slice(0, 20)}`));
    document.querySelectorAll("input[type=search], input[placeholder]").forEach((el) => el.type !== "password" && push("输入框", el, path(el)));
    return {
      title: document.title,
      heading: txt(document.querySelector("h1")) || txt(document.querySelector("h2")),
      height: document.documentElement.scrollHeight,
      needsLogin: [...document.querySelectorAll("input[type=password]")].some(vis),
      cookieBanner: !![...document.querySelectorAll("body *")].find((e) => /cookie|隐私|同意/i.test(e.className + e.id) && vis(e) && ["fixed", "sticky"].includes(getComputedStyle(e).position)),
      items, clickable,
      links: [...document.querySelectorAll("a[href]")].map((a) => a.href),
    };
  });
  const u = new URL(page.url());
  // 写进 promo.json 的路由：同一个地址下用相对路径，别的子域名写完整地址
  const route = u.origin === base.origin ? u.pathname.replace(base.pathname.replace(/[^/]*$/, ""), "") + u.search + (/^#!?\//.test(u.hash) ? u.hash : "") : page.url();
  pages.push({ n: +n, url: page.url(), route: route || "", shot, depth, ...info, links: undefined });
  console.log(`${n} ${info.heading || info.title || "（无标题）"}  ${page.url()}${info.needsLogin ? "  ⚠ 要登录" : ""}${info.cookieBanner ? "  ⚠ 有 Cookie 横幅" : ""}`);
  if (depth >= DEPTH) continue;
  for (const l of info.links) {
    let x;
    try { x = new URL(l); } catch { continue; }
    if (!inSite(x) || SKIP_EXT.test(x.pathname)) continue;
    const h = norm(x.href);
    if (!seen.has(h)) { seen.add(h); queue.push([h, depth + 1]); }
  }
}

// 总览图：在同一个浏览器里排一张缩略图网格再截下来，不依赖字体文件和 ffmpeg
const cols = 4, W = 400, H = Math.round((W * VIEW.height) / VIEW.width);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const grid = `<!doctype html><meta charset=utf-8><style>
body{margin:0;padding:24px;background:#f2f1ee;font:14px/1.4 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;display:grid;grid-template-columns:repeat(${cols},${W}px);gap:20px 16px}
figure{margin:0}img{width:${W}px;height:${H}px;object-fit:cover;object-position:top;border:1px solid #ddd;background:#fff;display:block}
figcaption{margin-top:6px;color:#222}b{font-size:16px;margin-right:6px}small{display:block;color:#888;word-break:break-all}i{color:#c2410c;font-style:normal}</style>
${pages.map((p) => `<figure><img src="${pathToFileURL(path.join(OUT, p.shot)).href}"><figcaption><b>${p.n}</b>${esc((p.heading || p.title || "").slice(0, 26))}${p.needsLogin ? " <i>要登录</i>" : ""}<small>${esc(p.route || "/")}</small></figcaption></figure>`).join("")}`;
fs.writeFileSync(path.join(OUT, "overview.html"), grid);
const sheet = await newPage(browser, { view: { width: cols * W + 3 * 16 + 48, height: 600 }, site: {} });
await sheet.goto(pathToFileURL(path.join(OUT, "overview.html")).href, { waitUntil: "load" });
await sheet.screenshot({ path: path.join(OUT, "overview.png"), fullPage: true });
await browser.close();
fs.rmSync(path.join(OUT, "overview.html"));

fs.writeFileSync(path.join(OUT, "pages.json"), JSON.stringify({ start, exploredAt: new Date().toISOString(), viewport: VIEW, pages }, null, 2));
console.log(`\n看了 ${pages.length} 页（${queue.length ? `还有 ${queue.length} 个链接没看，加大 --max 或 --depth` : "站内链接都看完了"}）`);
console.log(`总览图：${path.join(OUT, "overview.png")}；每页的组件候选和可点元素在 pages.json`);
if (pages.some((p) => p.needsLogin)) console.log("有页面要登录：停下来告诉用户，请用户运行 login.mjs 在弹出的窗口里自己登录，再重新探索（代理不碰密码）");
