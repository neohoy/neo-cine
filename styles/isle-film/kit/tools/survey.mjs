// 勘景：写镜头表之前，先弄清这一境的东西都在哪。
//   node styles/isle-film/kit/tools/survey.mjs <工程>
// 先跑 build.mjs。打开整片页面的勘景模式（index.html?survey=1），打印这一境的地标（最高点、湖、河的落差、平台）
// 和每隔 1 个单位的地面高度，写进 <工程>/out/survey.json；再截一张正午从正上方看的图，叠着坐标网格 → <工程>/out/survey.jpg。
// 写镜头表时，注视点 target 的 x、z 从这张图上读，y 取那里的地面高度再加一点（看动物加 0.05~0.1，看房子加 0.15）。
// 生灵、地标、奇事的准确位置在 world.js 里（F.life 里的轨迹、HUT 这类常量）：这张图只帮你对上方位。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIB = process.env.LIB || path.resolve(KIT, '../../..');
const P = path.resolve(process.argv[2] || (console.error('用法：node survey.mjs <工程>'), process.exit(2)));
if (!fs.existsSync(path.join(P, 'index.html'))) { console.error('✗ 先跑 build.mjs'); process.exit(1); }
const { execFileSync } = await import('node:child_process');            // 页面要字体：先切一次（第一次会下载字体）
const PY = fs.existsSync(path.join(LIB, '.venv/bin/python')) ? path.join(LIB, '.venv/bin/python') : 'python3';
execFileSync(PY, [path.join(KIT, 'tools/fonts.py'), P], { stdio: ['ignore', 'ignore', 'inherit'] });
const { openDemo, closeServer } = await import(pathToFileURL(path.join(LIB, 'core/render/page.mjs')).href);
const { browser, page } = await openDemo(P, { q: 'survey=1' });
await page.evaluate(() => window.render(0));
const S = await page.evaluate(() => window.SURVEY);
fs.mkdirSync(path.join(P, 'out'), { recursive: true });
fs.writeFileSync(path.join(P, 'out', 'survey.json'), JSON.stringify(S, null, 1));
await page.screenshot({ path: path.join(P, 'out', 'survey.jpg'), type: 'jpeg', quality: 88 });
await browser.close(); closeServer();
const m = S.meta;
console.log(`第${m.no}境《${m.name}》：${m.tagline}`);
console.log(`  开场时辰 ${m.startHour}；外观 ${m.look.container} / ${m.look.backdrop} / ${m.look.glow}；地表基准 y = ${S.ground}`);
console.log(`  默认镜头 az ${S.defaults.az}  pol ${S.defaults.pol}  注视点 [${S.defaults.target}]`);
for (const k of S.marks) console.log(`  ${k.label.padEnd(6)} x ${k.x}  z ${k.z}  y ${k.y}${k.rx ? `  半径 ${k.rx}×${k.rz}` : ''}${k.drop ? `  落差 ${k.drop}` : ''}`);
console.log('  地面高度 y（行 z = -4…4，列 x = -4…4）：');
for (const row of S.heights.grid) console.log('   ' + row.map(v => v == null ? '   ·  ' : v.toFixed(2).padStart(6)).join(''));
console.log(`done: ${path.join(P, 'out', 'survey.jpg')}`);
