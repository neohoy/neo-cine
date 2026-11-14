// 科技发布（Tech Launch）工具包的公用部分：读工程、找库、启动浏览器、打开页面、执行页面操作。
// 改编自 NEO 产品宣传片技能的 scripts/lib.mjs 和 browser.mjs（MIT，© 2026 NEO造物集 (neohoy)，库作者本人的作品）。
// 和原版的不同：浏览器用库里已有的 playwright-core（不在工程里 npm install），无界面时先用库渲染用的那个 headless shell，
// 有界面（登录）时找本机的 Chrome 或 Edge；不再依赖 HyperFrames。
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const KIT = path.dirname(fileURLToPath(import.meta.url));
// 库的根目录：环境变量 LIB（技能模式），否则是这个工具包所在的库（styles/tech-launch/kit → 库根）
export const LIB = process.env.LIB ? path.resolve(process.env.LIB) : path.resolve(KIT, "../../..");

export function die(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

// 工程目录 P：里面有 promo.json
export function loadProject(dir) {
  if (!dir || dir.startsWith("--")) die("缺少工程目录参数");
  const P = path.resolve(dir);
  const file = path.join(P, "promo.json");
  if (!fs.existsSync(file)) die(`${P} 里没有 promo.json：先用 kit/tools/new_project.mjs 建工程`);
  return { P, cfg: JSON.parse(fs.readFileSync(file, "utf8")) };
}
export const saveProject = (P, cfg) => fs.writeFileSync(path.join(P, "promo.json"), JSON.stringify(cfg, null, 2) + "\n");

// 命令行参数：--k v
export const opt = (args, k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };

// Windows 上 npx 之类是 .cmd 包装，要经 shell 调用；参数统一加引号
export function run(cmd, args, opts = {}) {
  const win = process.platform === "win32";
  const r = win
    ? spawnSync([/\s/.test(cmd) ? `"${cmd}"` : cmd, ...args.map((a) => `"${String(a).replaceAll('"', '\\"')}"`)].join(" "), { shell: true, ...opts })
    : spawnSync(cmd, args, opts);
  if (r.error) throw r.error;
  return r;
}

// ---------------------------------------------------------------- 浏览器
// playwright-core 用库自己的（package.json 已经锁了版本，渲染用的也是它）
export function playwright() {
  try {
    return createRequire(path.join(LIB, "package.json"))("playwright-core");
  } catch {
    die(`库里没有 playwright-core：在库的根目录运行 sh plugin/skills/neo-cine/scripts/setup.sh deps（LIB=${LIB}）`);
  }
}

// 无界面（探索、冻结）：先用库渲染用的 headless shell（和出片同一个内核），没有就用本机 Chrome、Edge；
// 有界面（login.mjs，用户自己登录）：只能是本机的 Chrome 或 Edge。PLAYWRIGHT_CHROME 可以指定一个可执行文件
export async function launch({ headed = false } = {}) {
  const { chromium } = playwright();
  const tries = [];
  if (process.env.PLAYWRIGHT_CHROME) tries.push({ executablePath: process.env.PLAYWRIGHT_CHROME });
  if (!headed) tries.push({});
  tries.push({ channel: "chrome" }, { channel: "msedge" });
  let first;
  for (const t of tries) {
    try {
      return await chromium.launch({ headless: !headed, args: ["--font-render-hinting=none", "--force-color-profile=srgb"], ...t });
    } catch (e) {
      first ||= e;
    }
  }
  die(headed
    ? `找不到能弹出窗口的浏览器：装 Google Chrome 或 Microsoft Edge（或用 PLAYWRIGHT_CHROME 指定）\n${String(first?.message).split("\n")[0]}`
    : `找不到浏览器：在库的根目录运行 sh plugin/skills/neo-cine/scripts/setup.sh deps（装 headless shell），或装 Chrome / Edge\n${String(first?.message).split("\n")[0]}`);
}

// 登录状态（login.mjs 存下的 cookie 和本地存储）：放在工程的 out/ 里（不进渲染机、不进 git），没有就是 undefined
export const LOGIN_FILE = "out/login-state.json";
export function loginState(P, site) {
  if (!site.login) return undefined;
  const f = path.resolve(P, site.login);
  if (!fs.existsSync(f)) die(`site.login 指向的登录状态不存在：${f}\n请用户运行 node kit/tools/login.mjs ${P}，在弹出的窗口里自己登录`);
  return f;
}

export async function newPage(browser, { view, scale = 1, site, storageState }) {
  const ctx = await browser.newContext({ viewport: view, deviceScaleFactor: scale, colorScheme: site.colorScheme || "light", storageState });
  const pp = await ctx.newPage();
  for (const pat of site.block || []) await pp.route((u) => u.href.includes(pat), (r) => r.abort());
  return pp;
}

// 打开页面：先等 load，再最多等 8 秒网络安静（线上站点常有统计、长连接，网络永远不会完全安静）
export async function goto(pp, url, timeout = 45000) {
  await pp.goto(url, { waitUntil: "load", timeout });
  await pp.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
}

// 从上到下慢慢滚一遍再回到顶部：让懒加载图片和"滚到才出现"的内容都出来
export async function scrollThrough(pp, maxH = 4000) {
  await pp.evaluate(async (maxH) => {
    const step = Math.max(200, innerHeight * 0.8);
    const end = Math.min(document.documentElement.scrollHeight, maxH);
    for (let y = 0; y < end; y += step) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    scrollTo(0, 0);
  }, maxH);
  await pp.waitForTimeout(300);
}

// 冻结前的页面操作：把页面点到要拍的那个状态（切标签、展开、搜索、打开下拉）。
// 只做"看"的操作：密码框一律拒绝（登录由用户自己在 login.mjs 弹出的窗口里完成），不提交、不下单、不改设置。
// 选择器用 Playwright 的写法：CSS（.tab:nth-child(2)）、带文字的 CSS（button:has-text("国际")）、文字（text=查看更多）、角色（role=button[name="筛选"]）
const KINDS = ["click", "hover", "fill", "press", "select", "scroll", "wait", "waitFor", "remove"];
export async function runActions(pp, actions = [], where = "") {
  // 同一段文字常常在隐藏的菜单、手机版导航里也有一份，只找看得见的那个
  const vis = (sel) => pp.locator(sel).filter({ visible: true }).first();
  for (const [k, a] of actions.entries()) {
    const kind = KINDS.find((x) => x in a);
    const tag = `${where}第 ${k + 1} 步 ${JSON.stringify(a)}`;
    if (!kind) die(`${tag}：不认识的操作，可用 ${KINDS.join("、")}`);
    try {
      if (kind === "click") {
        // 提交按钮不点：页面操作只"看"
        const el = vis(a.click);
        const type = await el.getAttribute("type", { timeout: a.timeout ?? 8000 });
        if ((type || "").toLowerCase() === "submit") die(`${tag}：这是提交按钮，不点。页面操作只做切换、筛选、展开、搜索`);
        await el.click({ timeout: a.timeout ?? 8000 });
      } else if (kind === "hover") await vis(a.hover).hover({ timeout: a.timeout ?? 8000 });
      else if (kind === "fill") {
        const el = vis(a.fill);
        const type = await el.getAttribute("type", { timeout: a.timeout ?? 8000 });
        if ((type || "").toLowerCase() === "password") die(`${tag}：不往密码框里填东西。要登录的站点由用户自己用 login.mjs 登录`);
        await el.fill(String(a.text ?? ""));
      } else if (kind === "press") await pp.keyboard.press(a.press);
      else if (kind === "select") await vis(a.select).selectOption(a.value);
      else if (kind === "scroll") {
        // 数字：页面往下滚多少像素；字符串：滚到这个元素。冻结前会滚回顶部，滚动只用来触发加载
        if (typeof a.scroll === "number") await pp.mouse.wheel(0, a.scroll);
        else await vis(a.scroll).scrollIntoViewIfNeeded({ timeout: a.timeout ?? 8000 });
      } else if (kind === "wait") await pp.waitForTimeout(a.wait);
      else if (kind === "waitFor") await pp.locator(a.waitFor).first().waitFor({ timeout: a.timeout ?? 15000 });
      else if (kind === "remove") await pp.evaluate((s) => document.querySelectorAll(s).forEach((e) => e.remove()), a.remove);
    } catch (e) {
      die(`${tag} 没做成：${String(e.message).split("\n")[0]}\n打开 out/reference/<页面>.png 或用 explore.mjs 看看页面上实际有什么`);
    }
    if (["click", "fill", "press", "select"].includes(kind)) await pp.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    await pp.waitForTimeout(a.settleMs ?? 250);
  }
}
