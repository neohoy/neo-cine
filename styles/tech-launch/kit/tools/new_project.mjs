// 新建科技发布工程：promo.json（镜头列表的起点）、FACTS.md、CREDITS 草稿、.gitignore。工程不在 styles/ 里（AGENTS.md："Where things go"）。
//
//   node styles/tech-launch/kit/tools/new_project.mjs <工程> --title 产品名 --url https://…      线上地址（只给首页也行，页面由 explore.mjs 找）
//   node styles/tech-launch/kit/tools/new_project.mjs <工程> --title 产品名 --dir <站点目录>      本地站点目录（里面有 index.html）
//   node styles/tech-launch/kit/tools/new_project.mjs <工程> --title 产品名 --images <截图目录>   只有界面截图（网页、App、桌面软件、设计稿导出图）
//   可选：--name 文件名前缀（成片叫 <name>-v001.mp4，默认是工程文件夹的名字）
// 之后：explore.mjs 找页面（只有网址时）→ 写 site.pages → freeze.mjs → 写镜头（film.shots）→ preview.sh → make.sh（PRODUCTION.md）。
import fs from "node:fs";
import path from "node:path";
import { KIT, die, opt } from "../lib.mjs";

const args = process.argv.slice(2);
const dir = args[0];
if (!dir || dir.startsWith("--")) die("用法：node new_project.mjs <工程> --title 产品名 (--url 地址 | --dir 站点目录 | --images 截图目录)");
const P = path.resolve(dir);
if (fs.existsSync(path.join(P, "promo.json"))) die(`${P} 已经是一个工程（有 promo.json）`);
if (P.split(path.sep).includes("styles")) console.warn("⚠ 工程不要建在库的 styles/ 里面：用户的片子放在 films/<名字>/（克隆模式）或用户自己的文件夹（技能模式）");
const url = opt(args, "url"), sdir = opt(args, "dir"), images = opt(args, "images");
if ([url, sdir, images].filter(Boolean).length !== 1) die("--url、--dir、--images 三选一");
fs.mkdirSync(P, { recursive: true });

const cfg = JSON.parse(fs.readFileSync(path.join(KIT, "templates/promo.json"), "utf8"));
cfg.name = opt(args, "name") || path.basename(P).replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "") || "promo";
if (opt(args, "title")) { cfg.title = opt(args, "title"); cfg.film.brand.name = cfg.title; cfg.film.shots.at(-1).zh = cfg.title; }
if (url) {
  cfg.site.url = url;
  const host = new URL(url).host;
  cfg.film.window.url = host; cfg.film.tagline = host.toUpperCase(); cfg.film.shots.at(-1).note = host;
}
if (sdir) {
  delete cfg.site.url;
  cfg.site.dir = path.relative(P, path.resolve(sdir)).split(path.sep).join("/");
  if (!fs.existsSync(path.join(path.resolve(sdir), "index.html"))) console.warn(`⚠ ${sdir} 里没有 index.html`);
}
if (images) {
  const src = path.resolve(images);
  const shots = fs.existsSync(src) ? fs.readdirSync(src).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).sort() : [];
  if (!shots.length) die(`${src} 里没有 png / jpg / webp 截图`);
  fs.mkdirSync(path.join(P, "screens"), { recursive: true });
  cfg.site = { scale: 1, pages: shots.map((f, k) => {
    fs.copyFileSync(path.join(src, f), path.join(P, "screens", f));
    return { id: `p${k + 1}`, label: path.parse(f).name, image: `screens/${f}`, items: [] };
  }) };
  console.log(`截图 ${shots.length} 张 → screens/（Retina 截图把 site.scale 改成 2）`);
}
fs.writeFileSync(path.join(P, "promo.json"), JSON.stringify(cfg, null, 2) + "\n");
fs.copyFileSync(path.join(KIT, "templates/FACTS.md"), path.join(P, "FACTS.md"));
fs.writeFileSync(path.join(P, "CREDITS"), `${cfg.title} — 产品宣传片

产品界面：${url || (sdir ? "本地站点目录" : "用户提供的界面截图")}，冻结于 <日期>。界面、文字、图片和站点自己的字体都属于产品方；
  用户确认有权使用（DIRECTOR.md §12）。站点字体：<tools/freeze.mjs 打印的字体名>，许可由用户负责。

影片自己的字体（SIL Open Font License 1.1，tools/fonts.py 从 github.com/google/fonts 固定提交下载并切子集，许可文本在 fonts/）：
- Instrument Serif, (c) 2022 The Instrument Serif Project Authors：英文标题、数字。
- Noto Sans SC, (c) 2014-2021 Adobe (http://www.adobe.com/), with Reserved Font Name 'Source'：中文标题、说明、标注卡。
- JetBrains Mono, (c) 2020 The JetBrains Mono Project Authors：画框小字、编号、地址。

声音：配乐（tools/score.mjs）和音效（tools/sfx_synth.mjs）全部代码合成，没有用录音素材和采样。
旁白：<没有 / Kokoro（本地）/ 用户的录音 / edge-tts（微软 Edge 朗读服务，非官方接口）>。
`);
fs.writeFileSync(path.join(P, ".gitignore"), "out/\nsite/\nexplore/\nindex.html\npage/\nevents.json\n*.mp4\n");
console.log(`工程 ${P}`);
console.log(url ? "下一步：explore.mjs 找页面（要登录的站点停下来，请用户运行 login.mjs 自己登录），挑好页面写进 site.pages，再 freeze.mjs"
  : images ? "下一步：按 PRODUCTION.md 的「截图输入」标组件框（freeze_images.mjs --grid 读坐标），再 freeze.mjs"
  : "下一步：在 promo.json 的 site.pages 里写要拍的页面，再 freeze.mjs");
