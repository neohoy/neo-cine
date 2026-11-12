// 列车运行图 · 制图配方：聚酯制图薄膜、印好的格子、针管笔的墨线、笔尖、丁字尺、铅笔批注、图签。
// 全部是 Canvas 2D 矢量，按 1920×1080 的逻辑像素画（main.js 统一缩放到实际画幅）。没有图片。
import { mulberry, clamp } from '/core/lib.js';

// 颜色（演示片的取值；规则见 STYLE.md §3）
export const C = {
  film: '#eceee8', film2: '#e2e6df', grid: '#5d8eac', ink: '#1c2024', red: '#bf2b22', pencil: '#4a4e55',
  river: '#5b8fbd', riverFill: '#b9d2e3', steel: '#8b9298', shadow: 'rgba(20,28,34,.18)',
};
export const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };

// 薄膜：极淡的哑光颗粒（固定在屏幕上，不随镜头走，所以不会闪），一张 512 的贴图
export function makeFilm() {
  const c = new OffscreenCanvas(512, 512), g = c.getContext('2d'), R = mulberry(11), im = g.createImageData(512, 512);
  for (let i = 0; i < 512 * 512; i++) { const v = (R() - .5) * 7 + (R() < .004 ? -10 : 0); im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = 128 + v; im.data[i * 4 + 3] = 255; }
  g.putImageData(im, 0, 0); return c;
}

// 墨线：针管笔画在薄膜上。先一道很淡的宽线（墨渗进薄膜的毛边），再一道实线；起笔和收笔各一个小墨点（笔在那里停过）
export function inkLine(g, pts, w, col, ends = [true, true]) {
  if (pts.length < 2) return;
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.strokeStyle = rgba(col, .16); g.lineWidth = w + 1.6; g.stroke();
  g.strokeStyle = col; g.lineWidth = w; g.stroke();
  g.fillStyle = col;
  if (ends[0]) { g.beginPath(); g.arc(pts[0][0], pts[0][1], w * .62, 0, 7); g.fill(); }
  if (ends[1]) { const p = pts[pts.length - 1]; g.beginPath(); g.arc(p[0], p[1], w * .62, 0, 7); g.fill(); }
}
// 湿墨：刚画过的一小段带一点高光，几秒（当天几分钟）后变哑
export function wet(g, pts, w) {
  if (pts.length < 2) return;
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.strokeStyle = 'rgba(255,255,255,.38)'; g.lineWidth = Math.max(.6, w * .3); g.lineCap = 'round'; g.stroke();
}

// 笔尖：从上往下看一支针管笔——钢的笔管、中间一圈墨，影子落在薄膜上
export function nib(g, x, y, col, k = 1) {
  const r = 7.5 * k;
  g.fillStyle = 'rgba(18,24,30,.2)'; g.beginPath(); g.ellipse(x + 6 * k, y + 8 * k, r * 1.05, r * .9, 0, 0, 7); g.fill();
  const gr = g.createRadialGradient(x - r * .35, y - r * .4, r * .1, x, y, r);
  gr.addColorStop(0, '#eef1f3'); gr.addColorStop(.55, '#a3aab0'); gr.addColorStop(1, '#4d545b');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  g.strokeStyle = 'rgba(30,36,42,.55)'; g.lineWidth = .8; g.stroke();
  g.fillStyle = col; g.beginPath(); g.arc(x, y, r * .34, 0, 7); g.fill();
}

// 丁字尺（平行尺）：有机玻璃，左边是工作边；x = 工作边，y0..y1 = 尺长
export function ruler(g, x, y0, y1, a = 1) {
  if (a <= 0) return;
  g.save(); g.globalAlpha = a;
  const wd = 54;
  const sh = g.createLinearGradient(x + wd, 0, x + wd + 22, 0); sh.addColorStop(0, 'rgba(20,30,36,.13)'); sh.addColorStop(1, 'rgba(20,30,36,0)');
  g.fillStyle = sh; g.fillRect(x + wd, y0, 22, y1 - y0);
  const body = g.createLinearGradient(x, 0, x + wd, 0); body.addColorStop(0, 'rgba(198,222,226,.42)'); body.addColorStop(.25, 'rgba(214,232,234,.26)'); body.addColorStop(1, 'rgba(190,214,220,.34)');
  g.fillStyle = body; g.fillRect(x, y0, wd, y1 - y0);
  g.fillStyle = 'rgba(40,62,72,.55)'; g.fillRect(x - .5, y0, 1.2, y1 - y0);                  // 工作边
  g.fillStyle = 'rgba(255,255,255,.65)'; g.fillRect(x + 1.6, y0, 1, y1 - y0);
  g.fillStyle = 'rgba(60,90,104,.35)'; g.fillRect(x + wd - 1, y0, 1, y1 - y0);
  g.strokeStyle = 'rgba(40,62,72,.32)'; g.lineWidth = 1;                                 // 尺上的刻度
  g.beginPath(); for (let y = y0 + 6, i = 0; y < y1; y += 9, i++) { const l = i % 5 === 0 ? 12 : 6; g.moveTo(x + 2, y + .5); g.lineTo(x + 2 + l, y + .5); } g.stroke();
  g.restore();
}

// 铅笔字：中文仿宋 + 英文窄体斜体，两行；纸色的晕边让它压在线上也读得清。reveal 0–1 = 写到哪里。返回字框。
export function pencil(g, zh, en, x, y, o = {}) {
  const fz = o.fz || 27, fe = o.fe || 22, al = o.align || 'left', a = o.alpha ?? 1, rv = o.reveal ?? 1;
  g.save(); g.globalAlpha = a; g.textBaseline = 'alphabetic'; g.textAlign = al;
  g.font = `${fz}px ZQ`; const wz = g.measureText(zh).width; g.font = `${fe}px BCI`; const we = en ? g.measureText(en).width : 0;
  const wmax = Math.max(wz, we), lx = al === 'left' ? x : al === 'right' ? x - wmax : x - wmax / 2;
  const box = { x0: lx - 6, y0: y - fz - 2, x1: lx + wmax + 6, y1: y + (en ? fe * 1.25 + 4 : 6) };
  if (rv < 1) { g.beginPath(); g.rect(lx - 8, box.y0 - 8, (wmax + 16) * rv, box.y1 - box.y0 + 16); g.clip(); }
  const line = (txt, font, yy) => {
    g.font = font; g.lineJoin = 'round';
    g.strokeStyle = rgba(C.film, .92); g.lineWidth = 7; g.strokeText(txt, x, yy);
    g.fillStyle = o.col || C.pencil; g.fillText(txt, x, yy);
  };
  line(zh, `${fz}px ZQ`, y);
  if (en) line(en, `${fe}px BCI`, y + fe * 1.18 + 2);
  g.restore();
  return box;
}
// 铅笔引线：一道细线，末端一个小圈
export function leader(g, x0, y0, x1, y1, a = 1, k = 1) {
  if (a <= 0) return;
  g.save(); g.globalAlpha = a; g.strokeStyle = C.pencil; g.lineWidth = 1.2; g.lineCap = 'round';
  const mx = x0 + (x1 - x0) * k, my = y0 + (y1 - y0) * k;
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(mx, my); g.stroke();
  if (k >= 1) { g.beginPath(); g.arc(x1, y1, 7, 0, 7); g.stroke(); }
  g.restore();
}
// 铅笔圈：手画的椭圆，起笔收笔不完全闭合
export function ring(g, x, y, rx, ry, k = 1, a = 1) {
  if (k <= 0) return;
  g.save(); g.globalAlpha = a; g.strokeStyle = C.pencil; g.lineWidth = 1.5; g.beginPath();
  const n = 40, s = -2.2, e = s + (Math.PI * 2 + .35) * k;
  for (let i = 0; i <= n; i++) { const u = s + (e - s) * i / n, r = 1 + .05 * Math.sin(u * 3 + 1); const px = x + Math.cos(u) * rx * r, py = y + Math.sin(u) * ry * r; i ? g.lineTo(px, py) : g.moveTo(px, py); }
  g.stroke(); g.restore();
}

// 条带地图里的铁路符号：两道细线，中间黑白相间的段（隧道只画两道虚线，桥两边加括号）
export function trackSig(g, x, ya, yb, k = 1, tunnel = false) {
  if (Math.abs(yb - ya) < .5) return;
  const y0 = Math.min(ya, yb), y1 = Math.max(ya, yb), hw = 2.6;
  g.save(); g.lineWidth = .9; g.strokeStyle = C.ink;
  if (tunnel) { g.setLineDash([3, 3]); g.beginPath(); g.moveTo(x - hw, y0); g.lineTo(x - hw, y1); g.moveTo(x + hw, y0); g.lineTo(x + hw, y1); g.stroke(); g.setLineDash([]); }
  else {
    g.fillStyle = '#f6f7f3'; g.fillRect(x - hw, y0, hw * 2, y1 - y0);
    g.beginPath(); g.moveTo(x - hw, y0); g.lineTo(x - hw, y1); g.moveTo(x + hw, y0); g.lineTo(x + hw, y1); g.stroke();
    g.fillStyle = C.ink; const step = 9 * k;                                       // 黑白段固定在里程上（step 随比例），不会滑
    const base = Math.floor(y0 / (2 * step)) * 2 * step;
    for (let y = base; y < y1; y += 2 * step) { const a = Math.max(y, y0), b = Math.min(y + step, y1); if (b > a) g.fillRect(x - hw, a, hw * 2, b - a); }
  }
  g.restore();
}

// 图签的格子（片尾）：蓝色印好的线，字一格一格写进去
export function titleBlock(g, x, y, w, h, cols) {
  g.save(); g.strokeStyle = rgba(C.grid, .85); g.lineWidth = 1.4; g.strokeRect(x, y, w, h);
  g.lineWidth = .9; let cx = x;
  for (const c of cols.slice(0, -1)) { cx += c * w; g.beginPath(); g.moveTo(cx, y); g.lineTo(cx, y + h); g.stroke(); }
  g.restore();
}
