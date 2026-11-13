// 极简地铁 · 画法（可以拿去别的片子用）：平涂底色和它跟着太阳走的色谱、颜色混合、粗线、站孔、换乘标记、方块列车、文字。
// 全部是 Canvas 2D 的矢量绘制，没有纹理、没有发光、没有透视；坐标都是 1080p 的逻辑像素。

// ---------- 颜色 ----------
export const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export const mix = (a, b, f) => a.map((v, i) => v + (b[i] - v) * f);
export const css = (c, a = 1) => a >= 1 ? `rgb(${c.map(v => Math.round(v)).join(',')})` : `rgba(${c.map(v => Math.round(v)).join(',')},${a.toFixed(3)})`;
export const lum = c => (.2126 * c[0] + .7152 * c[1] + .0722 * c[2]) / 255;

// 底色跟着一天的太阳走：[当天分钟, 底色]。夜里是深灰蓝，白天是暖灰白；黎明和黄昏只经过，不停留。
// （维也纳 11 月下旬：民用晨光约 06:40，日出约 07:15，日落约 16:15，民用昏影约 16:50；只用来定底色，片中不写）
export const SKY = [
  [0, '#1b222c'], [6 * 60 + 25, '#1b222c'], [6 * 60 + 50, '#3a3d55'], [7 * 60 + 10, '#c9b9b4'], [7 * 60 + 35, '#efebe3'],
  [16 * 60, '#efebe3'], [16 * 60 + 25, '#d9c0b0'], [16 * 60 + 45, '#3d3a52'], [17 * 60 + 10, '#1b222c'], [24 * 60, '#1b222c'],
].map(([m, c]) => [m, hex(c)]);
export function sky(m) {
  m = ((m % 1440) + 1440) % 1440;
  for (let i = 0; i < SKY.length - 1; i++) if (m <= SKY[i + 1][0]) {
    const f = (m - SKY[i][0]) / (SKY[i + 1][0] - SKY[i][0] || 1); return mix(SKY[i][1], SKY[i + 1][1], f * f * (3 - 2 * f));
  }
  return SKY[0][1];
}
// 由底色推出一整套颜色：墨（字、换乘点）在暗底上是浅的、在亮底上是深的，按亮度平滑过渡
const INK_D = hex('#262a31'), INK_L = hex('#ebe8e1'), WATER = hex('#5b93b8'), GREEN = hex('#8fae7a');
export function theme(ground) {
  const l = lum(ground), f = Math.min(1, Math.max(0, (l - .32) / .3));           // 0 = 夜，1 = 昼
  return {
    ground, day: f,
    ink: mix(INK_L, INK_D, f), mute: mix(mix(INK_L, ground, .42), mix(INK_D, ground, .5), f),
    water: mix(ground, WATER, .26 + .14 * f), green: mix(ground, GREEN, .08 + .1 * f),
  };
}
// 一条线没有车的时候退向底色；列车 = 线的颜色往墨的方向推（夜里更浅、白天更深），和线分得开
export const restColour = (lc, th, dim) => mix(lc, th.ground, .74 * dim);
export const trainColour = (lc, th) => mix(lc, th.ink, .5);

// ---------- 形 ----------
// 一条粗线：圆头、圆角连接
export function stroke(g, pts, w, col) {
  if (pts.length < 2) return;
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = col; g.stroke();
}
// 普通站：在线上打一个孔（露出底色）
export function hole(g, x, y, w, k, fill) {
  if (k <= 0) return;
  g.beginPath(); g.arc(x, y, .25 * w * k, 0, 7); g.fillStyle = fill; g.fill();
}
// 换乘站：一块底色的圆片压在交叉的线上，中间一粒墨点（"孔里有一颗钉"）
export function knot(g, x, y, w, k, fill, ink) {
  if (k <= 0) return;
  g.beginPath(); g.arc(x, y, .86 * w * k, 0, 7); g.fillStyle = fill; g.fill();
  g.beginPath(); g.arc(x, y, .34 * w * Math.min(1, k * 1.15), 0, 7); g.fillStyle = ink; g.fill();
}
// 列车：一块圆角方块，沿线的切线摆正；外面一圈底色的细边，和线分开
export function train(g, x, y, ang, w, col, edge, a = 1) {
  if (a <= 0) return;
  const L = 2.2 * w, B = 1.3 * w, r = .36 * w;
  g.save(); g.translate(x, y); g.rotate(ang); g.globalAlpha *= a;
  g.beginPath(); g.roundRect(-L / 2, -B / 2, L, B, r);
  g.lineWidth = .3 * w; g.strokeStyle = edge; g.stroke(); g.fillStyle = col; g.fill();
  g.restore();
}

// ---------- 字 ----------
export const ZH = 'SHS', EN = 'MR';
export function text(g, s, x, y, font, col, align = 'left', base = 'alphabetic') {
  g.font = font; g.fillStyle = col; g.textAlign = align; g.textBaseline = base; g.fillText(s, x, y);
  return g.measureText(s).width;
}
// 等宽数字（钟）：每个字占一样宽，跳字不晃
export function digits(g, s, x, y, size, col, cell = .62) {
  g.font = `300 ${size}px ${EN}`; g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  let cx = x;
  for (const ch of s) { const wch = ch === ':' ? size * .32 : size * cell; g.fillText(ch, cx + wch / 2, y); cx += wch; }
  return cx - x;
}
