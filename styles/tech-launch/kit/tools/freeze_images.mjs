// 截图冻结：没有网站源码、也打不开线上地址时，用界面截图（网页、App、桌面软件、设计稿导出图）代替冻结的 DOM。
// 每页一张截图当页面；promo.json 里标出的组件框从截图上裁下来，当作可以浮起、抬起、推近的组件。
// 输出和 freeze.mjs 一样的 site/ 结构，页面不用改。只用 Node 和 FFmpeg，不需要浏览器。截图页面里的字是画死的：标注卡的事实对着截图核对，
// 也可以在页面上写 text（截图里能看到的那几句原文），tools/build.mjs 的数字核对会用它。
//
// 改编自 NEO 产品宣传片技能的 scripts/freeze_images.mjs（MIT，© 2026 NEO造物集 (neohoy)）：输出改到 site/，核对图改到 out/。
//
// 用法：node styles/tech-launch/kit/tools/freeze_images.mjs <工程>          冻结（每页都写了 image 时，freeze.mjs 也会转到这里）
//       node styles/tech-launch/kit/tools/freeze_images.mjs <工程> --grid   只画坐标网格 out/grid/<页面>-<n>.png，用来读组件框的坐标
//       node styles/tech-launch/kit/tools/freeze_images.mjs <工程> --grid <页面> x,y,宽,高   放大一块看细节（每 10 像素一条线）；框住一行字时（高不超过 80）
//         还会打印这一行每个字的像素范围，划重点的框按它数字数来定，不要凭眼睛估
//
// 坐标一律是截图上的像素：rect 写 [x, y, 宽, 高]。组件框读个大概就行，冻结时边缘会吸附到截图里最近的卡片边线上；
// highlight 的框会收紧到文字的笔画上。每页输出一张 out/reference/<页面>-boxes.png，把吸附后的框画在截图上，用来核对。
import fs from "node:fs";
import path from "node:path";
import { loadProject, run, die } from "../lib.mjs";

const { P, cfg } = loadProject(process.argv[2]);
const site = cfg.site || die("promo.json 缺少 site");
const OUT = path.join(P, "site");
const REF = path.join(P, "out", "reference"), GRIDD = path.join(P, "out", "grid");
const GRID = process.argv.includes("--grid");
const gi = process.argv.indexOf("--grid");
const ZOOM = GRID && process.argv[gi + 2] ? { page: process.argv[gi + 1], r: process.argv[gi + 2].split(",").map(Number) } : null;
const pages = site.pages || die("site.pages 里列出要用的截图");

// ---------- 读写图片：FFmpeg 解码成 RGB，在 JS 里处理，再编码回 PNG ----------
function probe(file) {
  const r = run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", file], { encoding: "utf8" });
  if (r.status !== 0) die(`读不了图片 ${file}：${r.stderr}`);
  const [w, h] = r.stdout.trim().split(",").map(Number);
  return { w, h };
}
function decode(file, w, h) {
  const r = run("ffmpeg", ["-v", "error", "-i", file, "-vf", `crop=${w}:${h}:0:0`, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { maxBuffer: 1 << 30 });
  if (r.status !== 0 || r.stdout.length < w * h * 3) die(`解码失败 ${file}：${r.stderr}`);
  return { w, h, d: r.stdout };
}
function encode(img, file) {
  const r = run("ffmpeg", ["-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", `${img.w}x${img.h}`, "-i", "-", "-frames:v", "1", file], { input: img.d, maxBuffer: 1 << 30 });
  if (r.status !== 0) die(`写图片失败 ${file}：${r.stderr}`);
}
const px = (img, x, y) => { const k = (y * img.w + x) * 3; return [img.d[k], img.d[k + 1], img.d[k + 2]]; };
const gray = (img, x, y) => { const k = (y * img.w + x) * 3; return 0.299 * img.d[k] + 0.587 * img.d[k + 1] + 0.114 * img.d[k + 2]; };
const clampI = (v, a, b) => Math.max(a, Math.min(b, Math.round(v)));

// 一组像素里最多的颜色（每通道量化到 16 级再数）
function modeColor(img, pts) {
  const bins = new Map();
  for (const [x, y] of pts) {
    if (x < 0 || y < 0 || x >= img.w || y >= img.h) continue;
    const c = px(img, x, y), key = (c[0] >> 4) * 256 + (c[1] >> 4) * 16 + (c[2] >> 4);
    const b = bins.get(key) || { n: 0, s: [0, 0, 0] };
    b.n++; b.s[0] += c[0]; b.s[1] += c[1]; b.s[2] += c[2];
    bins.set(key, b);
  }
  const top = [...bins.values()].sort((a, b) => b.n - a.n)[0];
  return top ? top.s.map((v) => Math.round(v / top.n)) : [255, 255, 255];
}
const ring = (x, y, w, h, gap, step) => {
  const pts = [];
  for (let i = x - gap; i <= x + w + gap; i += step) pts.push([i, y - gap], [i, y + h + gap]);
  for (let j = y - gap; j <= y + h + gap; j += step) pts.push([x - gap, j], [x + w + gap, j]);
  return pts;
};
const css = (c) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;

// 组件框吸附：每条边在 ±R 像素内找对比最强的那条线（卡片边框、底色分界）；
// 几条线差不多强时取最外面那条，这样边框算在组件里。找不到明显的线就保持原样
function snapRect(img, [x, y, w, h], R) {
  const edgeH = (yy, x1, x2) => { let s = 0, n = 0; for (let i = x1; i < x2; i += 2) { s += Math.abs(gray(img, i, yy) - gray(img, i, yy - 1)); n++; } return n ? s / n : 0; };
  const edgeV = (xx, y1, y2) => { let s = 0, n = 0; for (let j = y1; j < y2; j += 2) { s += Math.abs(gray(img, xx, j) - gray(img, xx - 1, j)); n++; } return n ? s / n : 0; };
  const best = (from, to, score, outer) => {
    const c = [];
    for (let v = from; v <= to; v++) c.push([v, score(v)]);
    const max = Math.max(...c.map((q) => q[1]));
    if (max < 6) return null;
    const ok = c.filter((q) => q[1] >= max * 0.7).map((q) => q[0]);
    return outer < 0 ? Math.min(...ok) : Math.max(...ok);
  };
  const xa = clampI(x + w * 0.15, 1, img.w - 1), xb = clampI(x + w * 0.85, 1, img.w - 1);
  const ya = clampI(y + h * 0.15, 1, img.h - 1), yb = clampI(y + h * 0.85, 1, img.h - 1);
  const lim = (v, n) => [clampI(v - R, 1, n - 1), clampI(v + R, 1, n - 1)];
  const top = best(...lim(y, img.h), (v) => edgeH(v, xa, xb), -1) ?? y;
  const bot = best(...lim(y + h, img.h), (v) => edgeH(v, xa, xb), 1) ?? y + h;
  const left = best(...lim(x, img.w), (v) => edgeV(v, ya, yb), -1) ?? x;
  const right = best(...lim(x + w, img.w), (v) => edgeV(v, ya, yb), 1) ?? x + w;
  return right - left > 8 && bot - top > 8 ? [left, top, right - left, bot - top] : [x, y, w, h];
}
// 一行字里每一段连续笔画的 x 范围：中文一个字通常是一段，数字、字母也是一个一段（挨得太近时会连成一段）
function inkRuns(img, [x, y, w, h]) {
  const bg = modeColor(img, ring(x, y, w, h, 0, 1)), g0 = 0.299 * bg[0] + 0.587 * bg[1] + 0.114 * bg[2];
  const runs = [];
  for (let i = Math.max(0, x); i < Math.min(img.w, x + w); i++) {
    let on = false;
    for (let j = Math.max(0, y); j < Math.min(img.h, y + h) && !on; j++) on = Math.abs(gray(img, i, j) - g0) > 48;
    if (on) { if (runs.length && runs.at(-1)[1] === i - 1) runs.at(-1)[1] = i; else runs.push([i, i]); }
  }
  return runs;
}
// 划重点的框收紧到文字笔画上：左右各留 px、上下各留 py 像素（模板画底色时左右还会再放 4 像素）。框读得略宽、切到相邻字的一条边时，
// 贴着框左右边缘、又窄于半个字高的那一小段笔画是别的字，去掉
function inkFit(img, [x, y, w, h], px, py) {
  const bg = modeColor(img, ring(x, y, w, h, 0, 1)), g0 = 0.299 * bg[0] + 0.587 * bg[1] + 0.114 * bg[2];
  const ink = (i, j) => Math.abs(gray(img, i, j) - g0) > 48;
  const xs = [], X0 = Math.max(0, x), X1 = Math.min(img.w, x + w), Y0 = Math.max(0, y), Y1 = Math.min(img.h, y + h);
  for (let i = X0; i < X1; i++) { let on = false; for (let j = Y0; j < Y1 && !on; j++) on = ink(i, j); xs.push(on); }
  let y1 = Infinity, y2 = -1;
  for (let j = Y0; j < Y1; j++) for (let i = X0; i < X1; i++) if (ink(i, j)) { y1 = Math.min(y1, j); y2 = Math.max(y2, j); break; }
  if (y2 < 0) return [x, y, w, h];
  const runs = [];
  xs.forEach((on, k) => { if (on) { if (runs.length && runs.at(-1)[1] === k - 1) runs.at(-1)[1] = k; else runs.push([k, k]); } });
  const thin = (r) => r[1] - r[0] + 1 < (y2 - y1 + 1) * 0.5;
  if (runs.length > 1 && runs[0][0] === 0 && thin(runs[0])) runs.shift();
  if (runs.length > 1 && runs.at(-1)[1] === xs.length - 1 && thin(runs.at(-1))) runs.pop();
  const x1 = X0 + runs[0][0], x2 = X0 + runs.at(-1)[1];
  return [x1 - px, y1 - py, x2 - x1 + 1 + 2 * px, y2 - y1 + 1 + 2 * py];
}

// ---------- 画框、画网格（直接改像素；数字用七段笔画画，不依赖字体） ----------
function fill(img, x, y, w, h, c) {
  for (let j = Math.max(0, y); j < Math.min(img.h, y + h); j++) {
    for (let i = Math.max(0, x); i < Math.min(img.w, x + w); i++) { const k = (j * img.w + i) * 3; img.d[k] = c[0]; img.d[k + 1] = c[1]; img.d[k + 2] = c[2]; }
  }
}
function box(img, [x, y, w, h], c, t = 2) {
  fill(img, x, y, w, t, c); fill(img, x, y + h - t, w, t, c); fill(img, x, y, t, h, c); fill(img, x + w - t, y, t, h, c);
}
const SEG = ["1110111", "0010010", "1011101", "1011011", "0111010", "1101011", "1101111", "1010010", "1111111", "1111011"]; // a b c d e f g → 上 左上 右上 中 左下 右下 下
function label(img, x, y, text, k = 2) {
  const W = 5 * k, H = 9 * k, t = k;
  fill(img, x - 2, y - 2, text.length * (W + 2 * k) + 3, H + 4, [255, 255, 255]);
  [...text].forEach((ch, n) => {
    const s = SEG[+ch], ox = x + n * (W + 2 * k), c = [214, 40, 40];
    if (s[0] === "1") fill(img, ox, y, W, t, c);
    if (s[1] === "1") fill(img, ox, y, t, H / 2, c);
    if (s[2] === "1") fill(img, ox + W - t, y, t, H / 2, c);
    if (s[3] === "1") fill(img, ox, y + H / 2 - t / 2, W, t, c);
    if (s[4] === "1") fill(img, ox, y + H / 2, t, H / 2, c);
    if (s[5] === "1") fill(img, ox + W - t, y + H / 2, t, H / 2, c);
    if (s[6] === "1") fill(img, ox, y + H - t, W, t, c);
  });
}
function grid(img, y0, y1) {
  const out = { w: img.w, h: y1 - y0, d: Buffer.from(img.d.subarray(y0 * img.w * 3, y1 * img.w * 3)) };
  const blend = (i, j, c, a) => { const k = (j * out.w + i) * 3; for (let q = 0; q < 3; q++) out.d[k + q] = Math.round(out.d[k + q] * (1 - a) + c[q] * a); };
  for (let v = 0; v < img.w; v += 50) for (let j = 0; j < out.h; j++) blend(v, j, [214, 40, 40], v % 100 ? 0.12 : 0.35);
  for (let v = Math.ceil(y0 / 50) * 50; v < y1; v += 50) for (let i = 0; i < out.w; i++) blend(i, v - y0, [214, 40, 40], v % 100 ? 0.12 : 0.35);
  const k = img.w > 1600 ? 3 : 2;
  for (let v = Math.ceil(y0 / 100) * 100; v < y1; v += 100) for (let x = 4; x < img.w - 60; x += 400) label(out, x, v - y0 + 4, String(v), k);
  for (let v = 100; v < img.w - 40; v += 100) label(out, v + 4, 4, String(v), k);
  return out;
}

// ---------- 逐页处理 ----------
const ids = new Set();
for (const pg of pages) {
  if (!/^[\w-]+$/.test(pg.id || "")) die(`页面 id 只能用字母、数字、- 和 _：${pg.id}`);
  if (ids.has(pg.id)) die(`页面 id 重复：${pg.id}`);
  if (!pg.image) die(`页面 ${pg.id} 没写 image（截图路径）`);
  ids.add(pg.id);
}
if (GRID) fs.mkdirSync(GRIDD, { recursive: true });
else { fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(REF, { recursive: true }); }
const results = [];
for (const pg of pages) {
  const file = path.resolve(P, pg.image);
  if (!fs.existsSync(file)) die(`找不到截图 ${file}`);
  const scale = pg.scale ?? site.scale ?? 1; // 截图像素 ÷ 界面像素：Retina 截图写 2
  const size = probe(file);
  const H = Math.min(size.h, Math.round((pg.maxHeight || site.maxHeight || 4000) * scale));
  const img = decode(file, size.w, H);
  if (ZOOM) {
    if (ZOOM.page !== pg.id) continue;
    const [x, y, w, h] = ZOOM.r, k = Math.max(2, Math.min(8, Math.floor(1200 / w)));
    const z = { w: w * k, h: h * k, d: Buffer.alloc(w * k * h * k * 3) };
    for (let j = 0; j < z.h; j++) for (let i = 0; i < z.w; i++) {
      const sx = clampI(x + Math.floor(i / k), 0, img.w - 1), sy = clampI(y + Math.floor(j / k), 0, img.h - 1), a = (sy * img.w + sx) * 3, b = (j * z.w + i) * 3;
      const line = (x + Math.floor(i / k)) % 10 === 0 && i % k === 0 || (y + Math.floor(j / k)) % 10 === 0 && j % k === 0;
      for (let q = 0; q < 3; q++) z.d[b + q] = line ? Math.round(img.d[a + q] * 0.6 + [214, 40, 40][q] * 0.4) : img.d[a + q];
    }
    for (let v = Math.ceil(x / 50) * 50; v < x + w; v += 50) label(z, (v - x) * k + 3, 3, String(v), 2);
    for (let v = Math.ceil(y / 50) * 50; v < y + h; v += 50) label(z, 3, (v - y) * k + 3, String(v), 2);
    const out = path.join(GRIDD, `${pg.id}-${x}-${y}.png`);
    encode(z, out);
    console.log(`放大 ${k} 倍：${path.relative(P, out)}`);
    if (h <= 80) console.log(`这一行的字（截图 x 范围，从左到右）：${inkRuns(img, ZOOM.r).map(([a, b]) => `${a}–${b}`).join("  ")}`);
    continue;
  }
  if (GRID) {
    const step = 1000 * (img.w > 1600 ? 2 : 1);
    for (let y0 = 0, n = 1; y0 < img.h; y0 += step, n++) encode(grid(img, y0, Math.min(img.h, y0 + step)), path.join(GRIDD, `${pg.id}-${n}.png`));
    console.log(`${pg.id}：${img.w}×${img.h}，网格 ${Math.ceil(img.h / step)} 张`);
    continue;
  }
  const dir = path.join(OUT, "pages", pg.id), files = path.join(OUT, "files");
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(files, { recursive: true });
  // 页面底色：截图四周最多的颜色
  const pageBg = modeColor(img, ring(2, 2, img.w - 5, img.h - 5, 0, 7));
  const R = Math.round(14 * scale);
  const items = (pg.items || []).map((it, i) => {
    if (!Array.isArray(it.rect) || it.rect.length !== 4) die(`页面 ${pg.id} 的组件 ${it.name ?? i} 要写 rect: [x, y, 宽, 高]（截图像素）`);
    const r = it.snap === false ? it.rect : snapRect(img, it.rect, R);
    const hl = {};
    for (const [text, hr] of Object.entries(it.highlight || {})) {
      const f = inkFit(img, hr, 0, Math.round(4 * scale));
      hl[text] = [{ x: (f[0] - r[0]) / scale, y: (f[1] - r[1]) / scale, w: f[2] / scale, h: f[3] / scale, px: f }];
    }
    // 组件拿走后原位露出的底色：组件外圈最多的颜色
    const hole = modeColor(img, ring(r[0], r[1], r[2], r[3], Math.round(3 * scale), 3));
    return { i, name: it.name ?? String(i), bg: css(hole), hl: Object.keys(hl).length ? hl : undefined, px: r, x: r[0] / scale, y: r[1] / scale, w: r[2] / scale, h: r[3] / scale };
  });
  // 镜头点了 highlight 的主角，要在这里标出那段文字
  for (const s of (cfg.film?.shots || []).filter((s) => s.page === pg.id && s.highlight)) {
    const hero = typeof s.hero === "number" ? items[s.hero] : items.find((x) => x.name === s.hero);
    if (hero && !hero.hl?.[s.highlight]) die(`页面 ${pg.id} 的组件「${hero.name}」要在 highlight 里标出「${s.highlight}」的位置`);
  }
  let focus = pg.focus;
  if (!focus && items.length) {
    const x1 = Math.min(...items.map((r) => r.px[0])), y1 = Math.min(...items.map((r) => r.px[1]));
    focus = [x1, y1, Math.max(...items.map((r) => r.px[0] + r.px[2])) - x1, Math.max(...items.map((r) => r.px[1] + r.px[3])) - y1];
  }
  if (!focus) focus = [0, 0, img.w, img.h];
  const L = (v) => +(v / scale).toFixed(2), Wl = L(img.w), Hl = L(img.h);

  // 页面：截图垫底；每个组件位置先铺一块底色（组件被拿走时露出来），上面是从截图裁下的组件
  const src = `site/files/${pg.id}.png`;
  encode(img, path.join(files, `${pg.id}.png`));
  const abs = (x, y, w, h) => `position:absolute;left:${L(x)}px;top:${L(y)}px;width:${L(w)}px;height:${L(h)}px`;
  const html = [
    `<div class="pp-shotpage" style="position:relative;width:${Wl}px;height:${Hl}px;background:${css(pageBg)};overflow:hidden">`,
    `<img src="${src}" alt="" style="position:absolute;left:0;top:0;width:${Wl}px;height:${Hl}px;max-width:none" />`,
    ...items.map((it) => `<div style="${abs(...it.px)};background:${it.bg}"></div>`),
    ...items.map((it) => `<div data-promo-item="${it.i}" style="${abs(...it.px)};background:url('${src}') ${-L(it.px[0])}px ${-L(it.px[1])}px / ${Wl}px ${Hl}px no-repeat"></div>`),
    `</div>`,
  ].join("\n");
  fs.writeFileSync(path.join(dir, "frozen.html"), html);
  const view = { width: Wl, height: Math.round((Wl * 9) / 16) };
  fs.writeFileSync(path.join(dir, "layout.json"), JSON.stringify({
    id: pg.id, target: path.relative(P, file).split(path.sep).join("/"), source: "image", scale, viewport: view, view: { w: view.width, h: view.height },
    doc: { h: Hl }, root: { x: 0, y: 0, w: Wl, h: Hl },
    focus: { x: L(focus[0]), y: L(focus[1]), w: L(focus[2]), h: L(focus[3]) },
    items: items.map(({ px: _, hl, ...it }) => ({ ...it, hl: hl && Object.fromEntries(Object.entries(hl).map(([k, v]) => [k, v.map(({ px: __, ...q }) => q)])) })),
    htmlAttrs: {}, pageBg: css(pageBg), bodyAttrs: {},
    // 截图页面没有可读的文字：标注卡里的事实由人对着截图核对（tools/build.mjs 的数字核对会把它们都列出来）
    text: (pg.items || []).map((it) => [it.name, it.text || ""].join(" ")).join("\n") + "\n" + (pg.text || ""),
  }, null, 2));
  fs.copyFileSync(path.join(files, `${pg.id}.png`), path.join(REF, `${pg.id}.png`));
  // 核对图：组件框红、划重点绿、窗口范围蓝
  const chk = { w: img.w, h: img.h, d: Buffer.from(img.d) }, t = Math.max(2, Math.round(2 * scale));
  box(chk, focus, [40, 90, 214], t);
  for (const it of items) {
    box(chk, it.px, [214, 40, 40], t);
    for (const v of Object.values(it.hl || {})) box(chk, v[0].px, [30, 160, 70], t);
  }
  encode(chk, path.join(REF, `${pg.id}-boxes.png`));
  // 每个划重点框单独放大一张（前后多留 60 像素），核对框里正好是那几个字
  let n = 0;
  for (const it of items) for (const [text, v] of Object.entries(it.hl || {})) {
    const [hx, hy, hw, hh] = v[0].px, cx = Math.max(0, hx - 60), cy = Math.max(0, hy - 12), cw = Math.min(img.w - cx, hw + 120), chh = Math.min(img.h - cy, hh + 24), k = 4;
    const z = { w: cw * k, h: chh * k, d: Buffer.alloc(cw * k * chh * k * 3) };
    for (let j = 0; j < z.h; j++) for (let i = 0; i < z.w; i++) {
      const a = ((cy + Math.floor(j / k)) * chk.w + cx + Math.floor(i / k)) * 3, b = (j * z.w + i) * 3;
      for (let q = 0; q < 3; q++) z.d[b + q] = chk.d[a + q];
    }
    encode(z, path.join(REF, `${pg.id}-hl-${++n}.png`));
    console.log(`  划重点「${text}」：截图 [${v[0].px.join(", ")}]，放大核对图 out/reference/${pg.id}-hl-${n}.png`);
  }
  results.push({ pg, items, img, scale });
  console.log(`${pg.id}：截图 ${img.w}×${img.h}（×${scale}），组件 ${items.length} 个：${items.map((x) => x.name).join("、")}`);
  for (const [k, it] of items.entries()) {
    const a = pg.items[k].rect, b = it.px;
    if (a.some((v, q) => v !== b[q])) console.log(`  ${it.name}：[${a.join(", ")}] → 吸附到 [${b.join(", ")}]`);
  }
}
if (!GRID) {
  fs.writeFileSync(path.join(OUT, "site.css"), "/* 截图冻结：页面是图片，没有站点样式 */\n");
  const first = results[0];
  fs.writeFileSync(path.join(OUT, "site.json"), JSON.stringify({
    frozenAt: new Date().toISOString(), source: "image", viewport: { width: first.img.w / first.scale, height: Math.round((first.img.w / first.scale) * 9 / 16) },
    pages: results.map((r) => r.pg.id), htmlAttrs: {}, bodyAttrs: {},
    pageBg: JSON.parse(fs.readFileSync(path.join(OUT, "pages", first.pg.id, "layout.json"), "utf8")).pageBg,
  }, null, 2));
  console.log("核对图在 out/reference/<页面>-boxes.png：红框是组件，绿框是划重点，蓝框是窗口范围");
} else console.log("网格在 out/grid/：红线每 50 像素一条，每 100 像素标数字（截图像素）");
