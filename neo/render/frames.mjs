// Runs on the render machine (see remote.sh beside this file): render a page's frames to JPEG with the machine's own Edge
// or Chrome and its GPU. Nothing is installed there: remote.sh sends this file with core/ and the two node packages it needs.
//   node frames.mjs --site <dir> --page /styles/<slug>/demo/index.html --out <dir> [--fps 24] [--workers 4] [--times 1.5,20]
//                   [--size 1920x1080] [--q k=v] [--channel msedge]
// /core/… and /node_modules/… are served from this runtime folder, everything else from --site. Frames are f_00000.jpg …,
// or t_<time>.jpg with --times. A frame whose page threw or crashed, or whose WebGL context was lost, is rendered again in a new browser.
import { chromium } from 'playwright-core';
import http from 'http'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
import { WATCH_GL_LOST } from '../../core/render/browser.mjs';
const RUNTIME = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const SITE = path.resolve(opt('--site')), PAGE = opt('--page'), OUT = path.resolve(opt('--out'));
const FPS = +opt('--fps', 24), WK = +opt('--workers', 4), TIMES = opt('--times', null), Q = opt('--q', '');
const [W, H] = opt('--size', '1920x1080').split('x').map(Number);
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.otf': 'font/otf', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.woff': 'font/woff', '.jpg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.bin': 'application/octet-stream', '.glb': 'model/gltf-binary', '.hdr': 'application/octet-stream', '.txt': 'text/plain; charset=utf-8' };
const srv = http.createServer((q, r) => {
  let u; try { u = decodeURIComponent(q.url.split('?')[0]); } catch { r.writeHead(400); return r.end(); }
  const base = /^\/(core|node_modules)\//.test(u) ? RUNTIME : SITE, p = path.resolve(base, '.' + u);
  if (!p.startsWith(base + path.sep)) { r.writeHead(403); return r.end(); }
  fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': T[path.extname(p).toLowerCase()] || 'application/octet-stream' }); r.end(d); });
});
await new Promise(res => srv.listen(0, '127.0.0.1', res));
const URL0 = `http://127.0.0.1:${srv.address().port}${PAGE}${Q ? '?' + Q : ''}`;
const ARGS = ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--font-render-hinting=none', '--force-color-profile=srgb'];
async function open() {
  const browser = await chromium.launch({ channel: opt('--channel', 'msedge'), headless: true, args: ARGS });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.addInitScript(WATCH_GL_LOST);
  const st = { bad: null };
  page.on('pageerror', e => { st.bad = 'pageerror ' + e.message.slice(0, 300); });
  page.on('crash', () => { st.bad = 'the page crashed (a screenshot now would be the browser\'s white error page)'; });
  page.on('response', r => { if (r.status() >= 400 && !/favicon/.test(r.url())) { st.bad = `http ${r.status()} ${r.url()}`; console.error('[http]', r.status(), r.url()); } });
  await page.goto(URL0);
  await page.waitForFunction(() => window.READY === true, null, { timeout: 180000 });
  if (st.bad) { await browser.close(); throw new Error(st.bad); }
  return { browser, page, st };
}
async function openRetry() {
  for (let k = 0; ; k++) {
    try { return await open(); }
    catch (e) { if (k >= 6) { console.error('GIVE UP:', String(e.message).slice(0, 600)); process.exit(1); } console.error('retry open', k + 1, String(e.message).slice(0, 200)); await new Promise(r => setTimeout(r, 3000)); }
  }
}
fs.mkdirSync(OUT, { recursive: true });
const probe = await openRetry();
const info = await probe.page.evaluate(() => {
  const c = document.createElement('canvas'), g = c.getContext('webgl2'), e = g && g.getExtension('WEBGL_debug_renderer_info');
  const gpu = e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : '?'; g && g.getExtension('WEBGL_lose_context')?.loseContext(); return { dur: window.DUR, gpu };
});
await Promise.race([probe.browser.close(), new Promise(r => setTimeout(r, 4000))]);
console.log('GPU:', info.gpu, ' DUR:', info.dur);
let jobs;                                                         // [frame, time]
if (TIMES) jobs = TIMES.split(',').map((s, i) => [i, s]);
else { const n = Math.round(info.dur * FPS); jobs = []; for (let f = 0; f < n; f++) jobs.push([f, f / FPS]); }
const per = Math.ceil(jobs.length / WK), t0 = Date.now(); let done = 0;
await Promise.all([...Array(WK)].map(async (_, w) => {
  const mine = jobs.slice(w * per, (w + 1) * per); if (!mine.length) return;
  let { browser, page, st } = await openRetry();
  for (const [f, t] of mine) {
    for (let k = 0; ; k++) {
      let buf = null;
      try {
        await page.evaluate(tt => window.render(tt), +t);
        const lost = await page.evaluate(() => window.__glLost || null); if (lost) st.bad = 'WebGL context lost: ' + lost;
        if (!st.bad) buf = await page.screenshot({ type: 'jpeg', quality: 95 });
      } catch (e) { st.bad = String(e.message).slice(0, 300); }
      if (buf && !st.bad) { fs.writeFileSync(path.join(OUT, TIMES ? `t_${t}.jpg` : `f_${String(f).padStart(5, '0')}.jpg`), buf); break; }
      if (k >= 6) { console.error('GIVE UP frame', f, st.bad); process.exit(1); }
      console.error('retry frame', f, '-', String(st.bad).slice(0, 200));
      try { await browser.close(); } catch {}
      await new Promise(r => setTimeout(r, 2000)); ({ browser, page, st } = await openRetry());
    }
    if (++done % 96 === 0) console.log(`${done}/${jobs.length}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  await Promise.race([browser.close(), new Promise(r => setTimeout(r, 4000))]);
}));
console.log('DONE', jobs.length, 'frames', ((Date.now() - t0) / 1000).toFixed(0) + 's');
srv.close(); process.exit(0);
