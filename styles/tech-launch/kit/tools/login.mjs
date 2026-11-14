// 要登录才能看的站点：弹出一个浏览器窗口，用户像平常一样在里面自己登录（脚本不碰账号密码），
// 登录后的 cookie 和本地存储存到工程里，探索和冻结都带着它打开页面。
// 用户登录好告诉代理，代理运行 --done 结束；用户直接关掉窗口也行。
//
// 用法：node styles/tech-launch/kit/tools/login.mjs <工程> [--url 登录页地址]    （放在后台运行）
//       node styles/tech-launch/kit/tools/login.mjs <工程> --done              （用户说登录好了之后）
// 登录状态存在 <工程>/out/login-state.json：它等于账号的钥匙，只留在本机，不进 git、不送渲染台式机（remote.sh 不传 out/）、
// 不发给别人；片子做完删掉这个文件即可。弹窗要本机的 Chrome 或 Edge（有界面的浏览器）。
// 改编自 NEO 产品宣传片技能的 scripts/login.mjs（MIT，© 2026 NEO造物集 (neohoy)）。
import fs from "node:fs";
import path from "node:path";
import { loadProject, die, launch, LOGIN_FILE } from "../lib.mjs";

const { P, cfg } = loadProject(process.argv[2]);
const args = process.argv.slice(3);
// 结束信号：另一个进程写下这个文件，正在等的那个就存好状态退出
const DONE = path.join(P, "out", ".login-done");
fs.mkdirSync(path.join(P, "out"), { recursive: true });
if (args.includes("--done")) {
  fs.writeFileSync(DONE, "");
  console.log("已通知登录窗口：存下登录状态后关闭");
  process.exit(0);
}
fs.rmSync(DONE, { force: true });
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const site = cfg.site || {};
const url = opt("url", site.url) || die("没有网址：加 --url，或在 promo.json 的 site.url 里写上");
const rel = site.login || LOGIN_FILE;
const out = path.resolve(P, rel);

const browser = await launch({ headed: true });
const ctx = await browser.newContext({ viewport: null, storageState: fs.existsSync(out) ? out : undefined });
const page = await ctx.newPage();
await page.goto(url);
console.log("浏览器窗口已打开：请用户在窗口里自己登录（账号密码、扫码、验证码都由用户自己完成），登录好后告诉代理（代理运行 login.mjs <工程> --done），或者直接关掉窗口。");

// 每两秒存一次，用户直接关窗口也不会丢；最多等 30 分钟
let saved = false;
const save = async () => { try { await ctx.storageState({ path: out }); saved = true; } catch {} };
const timer = setInterval(save, 2000);
await Promise.race([
  new Promise((r) => page.on("close", r)),
  new Promise((r) => browser.on("disconnected", r)),
  new Promise((r) => { const t = setInterval(() => fs.existsSync(DONE) && (clearInterval(t), r()), 500); }),
  new Promise((r) => setTimeout(r, 30 * 60 * 1000)),
]);
fs.rmSync(DONE, { force: true });
clearInterval(timer);
await save();
await browser.close().catch(() => {});
if (!saved) die("没存下登录状态（窗口关得太快？）再运行一次");

// 写进 promo.json（只是一个指向 out/ 的相对路径）；out/ 在工程的 .gitignore 里
cfg.site = { ...site, login: rel.split(path.sep).join("/") };
fs.writeFileSync(path.join(P, "promo.json"), JSON.stringify(cfg, null, 2) + "\n");
const st = JSON.parse(fs.readFileSync(out, "utf8"));
console.log(`登录状态存到 ${out}（${st.cookies.length} 个 cookie，${st.origins.length} 个站点的本地存储），promo.json 的 site.login 已写上`);
if (!st.cookies.length && !st.origins.some((o) => o.localStorage.length)) console.log("⚠ 什么都没存下，看起来还没登录：请用户登录后再运行一次");
