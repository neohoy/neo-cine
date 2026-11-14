// 歌词的阅读检查：node styles/scrapbook-song/kit/tools/lyriccheck.mjs <工程> [--step 0.04]（库的根目录；make.sh 在 readcheck 之后跑它）
// 歌词是这部片子的字幕（唱出来的字，写在画面里的物件上），所以不进 window.TEXTS（readcheck 的约定：字幕不报给它）。
// 这里逐句量四个时刻：第一个字出现、整句写完（每个字都在、整块都在画面里）、离开画面、唱完（data/lyrics.json）。
// 判失败（退出码 1）的只有这个风格的硬规则（STYLE.md §4）：
//   · 每一句都要有完整可读的时刻，而且最晚在这句唱完时（+0.1 秒）已经写完。
// 只提示、不判失败的（"注意"）：
//   · 写完以后完整停留不到 0.6 秒；
//   · 这句唱完之前就离开了画面（常见于最后一个长音拖过镜头切点）；
//   · 停留不到字幕规则（DIRECTOR.md §7）的 max(1.8 秒, 演唱时长 + 0.6 秒)，或 readcheck 默认读速（汉字 4.5 字/秒 + 1.5 秒）。
// "注意"不算失败，但要看一遍：示范片沿用原 MV 的编排，有几句会出"注意"，DEMO.md「检查」里逐句写了。
import { openDemo, closeServer } from '../../../../core/render/page.mjs';
import path from 'path'; import { fileURLToPath } from 'url';
const args = process.argv.slice(2), i = args.indexOf('--step'), STEP = i >= 0 ? +args[i + 1] : 0.04;
if (!args[0] || args[0].startsWith('--')) { console.error('usage: node styles/scrapbook-song/kit/tools/lyriccheck.mjs <工程> [--step 0.04]'); process.exit(2); }
const DEMO = path.resolve(args[0]);
const { browser, page } = await openDemo(DEMO, { gl: false });
const res = await page.evaluate((STEP) => {
  const L = window.LYRIC_LINES, W = innerWidth, H = innerHeight, st = {};
  const norm = (s) => s.replace(/[\s·「」]/g, '');
  for (const l of L) st[l.i] = { first: null, full: null, gone: null, lastSeen: null, run: true };
  for (let t = 0; t <= window.DUR; t += STEP) {
    window.render(t);
    const per = {};
    for (const b of window.LYRICS(t)) {
      const inFrame = b.x0 >= 0 && b.y0 >= 0 && b.x1 <= W && b.y1 <= H;
      (per[b.line] ??= []).push({ ...b, ok: b.all && inFrame });
    }
    for (const l of L) {
      const s = st[l.i], bs = per[l.i] || [];
      if (bs.length) {
        if (s.first === null) s.first = t;
        if (s.gone === null) s.lastSeen = t;
        const have = bs.filter((b) => b.ok).map((b) => norm(b.text)).join('');
        if (s.full === null && have.length >= norm(l.text).length) s.full = t;
      } else if (s.first !== null && s.gone === null) s.gone = t;
    }
  }
  for (const l of L) if (st[l.i].first !== null && st[l.i].gone === null) st[l.i].gone = window.DUR;
  return L.map((l) => ({ ...l, ...st[l.i] }));
}, STEP);
await browser.close(); closeServer();
let bad = 0, warn = 0;
const f2 = (v) => v.toFixed(2);
for (const l of res) {
  const sung = l.t1 - l.t0, need = Math.max(1.8, sung + 0.6), cps = [...l.text].length / 4.5 + 1.5;
  if (l.first === null) { bad++; console.log(`BAD  L${l.i} ${l.text}  画面上没有这句`); continue; }
  const hold = l.gone - l.first, ok = l.full !== null && l.full <= l.t1 + 0.1 + 1e-6;
  const notes = [];
  if (ok && l.gone - l.full < 0.6) notes.push(`写完后只停 ${f2(l.gone - l.full)} 秒`);
  if (l.gone < l.t1 - 1e-6) notes.push(`比唱完早 ${f2(l.t1 - l.gone)} 秒离开`);
  if (hold < need - 1e-6) notes.push(`停留 ${f2(hold)} 秒，字幕规则要 ${f2(need)}`);
  if (hold < cps - 1e-6) notes.push(`默认读速要 ${f2(cps)}`);
  if (!ok) bad++; else if (notes.length) warn++;
  console.log(`${!ok ? 'BAD ' : notes.length ? '注意' : 'OK  '} L${String(l.i).padEnd(3)} 唱 ${f2(l.t0)}–${f2(l.t1)}  出现 ${f2(l.first)}  写完 ${l.full === null ? '从未完整' : f2(l.full)}  离开 ${f2(l.gone)}  ${l.text}` +
    (notes.length ? `\n       ${notes.join('；')}` : ''));
}
console.log(`lyriccheck: ${res.length} 句，${bad} 句不合格，${warn} 句有注意项`);
process.exit(bad ? 1 : 0);
