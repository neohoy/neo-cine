// 镜头表 → 整片页面。把一境的 world.js 和 NEO-Isle 引擎（kit/isle-core/ 里固定版本的副本）合成 <工程>/isle.html（影片模式），
// 把 kit/page/ 的 film.js、plan.js 复制到 <工程>/page/，再写出 <工程>/index.html：它按外观各开一个 isle.html，
// 实现库的页面约定（window.READY、render(t)、DUR、EV、TEXTS），core/render/ 的工具和 neo/render/remote.sh 都能直接渲。
//
//   node styles/isle-film/kit/tools/build.mjs <工程>
//
// 会检查：world.js 的形状、引擎有没有影片模式、镜头表能不能排成时间线（缺什么、哪个外观不存在），
// 并按库的读字规则估算每块字够不够时间（最后由 core/render/readcheck.mjs 把关）。打印镜头表，方便核对时长和时辰。
// three.js：默认用库自带的（/node_modules/three，r170，库的渲染机上也有）；film.json 里 "three": "kit" 改用 kit/three/ 里随附的副本（没有就报错）。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const die = m => { console.error('✗ ' + m); process.exit(1); };
const P = path.resolve(process.argv[2] || die('用法：node build.mjs <工程>'));
const cfgFile = path.join(P, 'film.json');
if (!fs.existsSync(cfgFile)) die(`${cfgFile} 不存在：先用 tools/new_project.py 建工程`);
let cfg; try { cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8')); } catch (e) { die(`film.json 不是合法的 JSON：${e.message}`); }

// ---------- 一境：world.js ----------
const worldFile = path.join(P, cfg.world || 'world.js');
if (!fs.existsSync(worldFile)) die(`找不到这一境的世界文件 ${worldFile}`);
const world = fs.readFileSync(worldFile, 'utf8');
if (!/\bconst\s+WORLD\s*=/.test(world)) die('world.js 里要有 `const WORLD = { meta: {...}, build(F){...} }`（NEO-Isle 的世界文件）');

// ---------- 引擎：工程里有 isle-core/（用户自成一格的引擎，new_project.py 复制来的）就用它，否则用工具包的副本 ----------
const coreDir = ['isle-core'].map(d => path.join(P, d)).find(d => fs.existsSync(path.join(d, 'fangcun.js'))) || path.join(KIT, 'isle-core');
const core = fs.readFileSync(path.join(coreDir, 'fangcun.js'), 'utf8');
const tpl = fs.readFileSync(path.join(coreDir, 'template.html'), 'utf8');
const engine = fs.existsSync(path.join(coreDir, 'VERSION')) ? fs.readFileSync(path.join(coreDir, 'VERSION'), 'utf8').trim() : '未标注';
if (!/FANGCUN_FILM/.test(core)) die(`引擎 ${engine}（${path.relative(P, coreDir) || coreDir}）没有影片模式：要 NEO-Isle 1.2.0 或更新的（kit/tools/sync_isle.sh）`);
for (const [src, label] of [[core, 'fangcun.js'], [world, 'world.js']]) if (src.toLowerCase().includes('</script')) die(`${label} 里出现了 </script，会把页面截断`);

// ---------- three.js ----------
fs.mkdirSync(path.join(P, 'page'), { recursive: true });
let three = { three: '/node_modules/three/build/three.module.js', addons: '/node_modules/three/examples/jsm/' };
if (cfg.three === 'kit') {
  const k3 = path.join(KIT, 'three');
  if (!fs.existsSync(path.join(k3, 'build', 'three.module.js'))) die('film.json 要用随附的 three（"three": "kit"），但 kit/three/ 里没有');
  fs.cpSync(k3, path.join(P, 'page', 'three'), { recursive: true });
  three = { three: 'page/three/build/three.module.js', addons: 'page/three/examples/jsm/' };
}

// ---------- isle.html：NEO-Isle 的页面壳 + 引擎 + 这一境，开影片模式 ----------
const name = (world.match(/\bname\s*:\s*['"]([^'"]+)['"]/) || [])[1] || '';
const head = `<script>
  // 方寸影像：这一页由 NEO-Cine 的 isle-film 工具包生成，引擎在影片模式下只按 FANGCUN.frame(...) 出画
  window.FANGCUN_FILM = true;
  const up = m => { try { parent.__isleError && parent.__isleError(String(m)); } catch (_) {} };
  addEventListener('error', e => up(e.message || e));
  addEventListener('unhandledrejection', e => up(e.reason && e.reason.message || e.reason));
</script>
<script type="importmap">
{ "imports": { "three": "${three.three}", "three/addons/": "${three.addons}" } }
</script>`;
if (!/<script type="importmap">[\s\S]*?<\/script>/.test(tpl)) die('引擎的 template.html 里找不到 importmap');
const isle = tpl.replace(/<script type="importmap">[\s\S]*?<\/script>/, () => head)
  .replace('__TITLE__', `方寸之境 · ${name}`).replace('__ENGINE__', engine).replace('__BUILT__', 'NEO-Cine isle-film')
  .replace('/*__CORE__*/', () => core).replace('/*__WORLD__*/', () => world);
fs.writeFileSync(path.join(P, 'isle.html'), isle);

// ---------- 页面脚本和整片页面 ----------
for (const f of ['film.js', 'plan.js']) fs.copyFileSync(path.join(KIT, 'page', f), path.join(P, 'page', f));
const page = fs.readFileSync(path.join(KIT, 'page', 'index.html'), 'utf8')
  .replace('__TITLE__', (cfg.title?.zh || name || cfg.name || '方寸影像'))
  .replace('/*__FILM__*/', () => JSON.stringify(cfg).replace(/</g, '\\u003c'));
fs.writeFileSync(path.join(P, 'index.html'), page);

// ---------- 时间线：排得出来吗，字够不够读 ----------
const { makePlan, reading, events, geomApi } = await import(pathToFileURL(path.join(KIT, 'page', 'plan.js')).href);
const plan = makePlan(cfg);
if (plan.errs.length) die('镜头表有问题：\n  ' + plan.errs.join('\n  '));
const f1 = x => (Math.round(x * 100) / 100).toString();
console.log(`《${name}》 引擎 ${engine}，three ${cfg.three === 'kit' ? '随附副本' : '库自带'}；外观 ${plan.lookIds.join('、')}；片长 ${f1(plan.dur)} 秒（镜头 ${f1(plan.body)} 秒${plan.end ? ` + 片尾卡 ${plan.end.dur} 秒` : ''}）`);
for (const s of plan.shots) {
  const k0 = s.keys[0], k1 = s.keys[s.keys.length - 1], h0 = s.hk[0][1], h1 = s.hk[s.hk.length - 1][1];
  console.log(`  ${s.id.padEnd(10)} ${f1(s.start).padStart(5)}–${f1(s.end).padEnd(5)} ${(s.move || '').padEnd(9)} 时辰 ${f1(h0)}${h1 !== h0 ? '→' + f1(h1) : ''}  距离 ${f1(k0.dist)}${k1.dist !== k0.dist ? '→' + f1(k1.dist) : ''}  ${s.look}${s.in !== 'cut' ? '  ' + s.in + ' ' + s.inDur + 's' : ''}${s.wonder != null ? '  奇事@' + f1(s.start + s.wonder) : ''}${s.sub ? '  字幕「' + s.sub.zh + '」' : ''}`);
}
const ev = events(plan, geomApi(plan));
const chimes = ev.filter(e => e.type === 'chime');
if (chimes.length) console.log(`  整点 ${chimes.length} 个：${chimes.map(e => e.hour + '点@' + f1(e.t)).join(' ')}`);
const glass = ev.filter(e => e.type === 'glass');
console.log(`  穿过玻璃 ${glass.length} 次：${glass.map(e => (e.dir === 'in' ? '进' : '出') + '@' + f1(e.t)).join(' ') || '无'}`);
const warn = reading(plan);
for (const s of plan.shots) if ((s.move === 'through' || s.move === 'pullback') && !glass.some(e => e.t >= s.start && e.t <= s.end))
  warn.push(`镜头 ${s.id} 是 ${s.move}，但镜头没有穿过玻璃：${s.move === 'through' ? '最后一个关键帧还在容器外面，把 dist 调小或 pol 调大' : '开头不在容器里面'}`);
for (const s of plan.shots) for (const k of s.keys) if (k.dist < 0.3) {   // 近景的关键帧应该在玻璃里，不然是隔着玻璃看
  const g = geomApi(plan), p = g.camPos(s.look, { az: k.az, pol: k.pol, dist: k.dist, target: [k.tx, k.ty, k.tz] });
  if (!g.inGlass(s.look, p)) warn.push(`镜头 ${s.id} 第 ${f1(k.at)} 秒的关键帧（dist ${k.dist}）镜头在玻璃外面（[${p.map(f1)}]）：近景要么把 dist 调小，要么换个方位从地块中间看过去`);
}
if (warn.length) console.warn('⚠ 要看一下（字的时间最后由 core/render/readcheck.mjs 把关）：\n  ' + warn.join('\n  '));
console.log(`done: ${path.join(P, 'index.html')}`);
