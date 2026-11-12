// 公交点阵屏 · 屏的引擎
// 两半：CPU 上的"点"（一块 NX×NY 的亮度缓冲，画线、打点、贴字都按整点来，公交车按亚点位置分到相邻四个点上），
// 和 GPU 上的"物件"（WebGL2：圆透镜、灯芯、每颗点的个体差、光晕、玻璃反光、外壳和墙，都由一条视线和屏面的交点算出来）。
// 地图缩放是屏重新算一遍（点距不变）；镜头推拉才是光学放大。

// ---------- 点：亮度缓冲 ----------
export function makeBoard(NX, NY) {
  const buf = new Float32Array(NX * NY);
  const B = {
    NX, NY, buf,
    clear(v = 0) { buf.fill(v); },
    get(i, j) { return i < 0 || j < 0 || i >= NX || j >= NY ? 0 : buf[j * NX + i]; },
    max(i, j, v) { if (i < 0 || j < 0 || i >= NX || j >= NY) return; const k = j * NX + i; if (v > buf[k]) buf[k] = v; },
    set(i, j, v) { if (i < 0 || j < 0 || i >= NX || j >= NY) return; buf[j * NX + i] = v; },
    add(i, j, v) { if (i < 0 || j < 0 || i >= NX || j >= NY) return; buf[j * NX + i] += v; },
    // 亚点位置的一颗亮点：按距离分到四个相邻点上（运动才连续，不会一格一格跳）
    splat(x, y, v) {
      const i = Math.floor(x - .5), j = Math.floor(y - .5), fx = x - .5 - i, fy = y - .5 - j;
      B.add(i, j, v * (1 - fx) * (1 - fy)); B.add(i + 1, j, v * fx * (1 - fy)); B.add(i, j + 1, v * (1 - fx) * fy); B.add(i + 1, j + 1, v * fx * fy);
    },
    // 整点直线（DDA，8 连通，不抗锯齿：屏上的线就是一串点）
    line(x0, y0, x1, y1, v, op = 'max') {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)), s = Math.max(1, Math.ceil(n));
      for (let k = 0; k <= s; k++) { const t = k / s, i = Math.floor(x0 + (x1 - x0) * t), j = Math.floor(y0 + (y1 - y0) * t); B[op](i, j, v); }
    },
    // 贴一张 0/1 掩膜（字）：clip = [x0, y0, x1, y1] 只在这个框里亮
    blit(m, x, y, v, clip) {
      const [cx0, cy0, cx1, cy1] = clip || [0, 0, NX, NY];
      for (let r = 0; r < m.h; r++) { const j = y + r; if (j < cy0 || j >= cy1) continue;
        for (let c = 0; c < m.w; c++) { if (!m.a[r * m.w + c]) continue; const i = x + c; if (i < cx0 || i >= cx1) continue; B.max(i, j, v); } }
    },
    rect(x0, y0, x1, y1, v) { for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) B.set(i, j, v); },
  };
  return B;
}

// ---------- 字：缝合像素字体 12px，按点阵取出来 ----------
// 不能直接按 12px 画再取像素：不同系统的字形光栅化（微调、亚像素定位）会让点阵差半格（Windows 上的字会糊成一团）。
// 这里每个字按 10 倍（120px）画，字体本身的每一格正好是 10×10 像素，只取每格中心那一个像素：光栅化差几个像素也不影响结果。
// 字体的行高 16 格：上 13（ascent）下 3（descent）；掩膜取第 2–15 行（14 行高），汉字落在掩膜的 0–11 行。
const S10 = 10, GC = new OffscreenCanvas(32 * S10, 16 * S10), GG = GC.getContext('2d', { willReadFrequently: true });
const GLYPH = new Map(), CACHE = new Map();
export const FONT = { hk: 'FPHK', sc: 'FPSC', h: 14 };
function glyph(ch, fam) {
  const key = fam + ch; if (GLYPH.has(key)) return GLYPH.get(key);
  GG.font = `${12 * S10}px ${fam}`; GG.textBaseline = 'alphabetic'; GG.textAlign = 'left';
  const w = Math.round(GG.measureText(ch).width / S10);
  GG.clearRect(0, 0, GC.width, GC.height); GG.fillStyle = '#fff'; GG.fillText(ch, 0, 13 * S10);
  const d = GG.getImageData(0, 0, GC.width, GC.height).data, a = new Uint8Array(w * 16);
  for (let r = 0; r < 16; r++) for (let c = 0; c < w; c++) a[r * w + c] = d[((r * S10 + 5) * GC.width + c * S10 + 5) * 4 + 3] > 127 ? 1 : 0;
  const g = { w, a }; GLYPH.set(key, g); return g;
}
export function textMask(s, fam = FONT.sc) {
  const key = fam + '|' + s; if (CACHE.has(key)) return CACHE.get(key);
  const gs = [...s].map(ch => glyph(ch, fam)), w = Math.max(1, gs.reduce((n, g) => n + g.w, 0)), h = FONT.h, a = new Uint8Array(w * h);
  let x = 0;
  for (const g of gs) { for (let r = 0; r < h; r++) for (let c = 0; c < g.w; c++) a[r * w + x + c] = g.a[(r + 2) * g.w + c]; x += g.w; }
  const m = { w, h, a }; CACHE.set(key, m); return m;
}
// 放大的字：每个字点变成 s×s 个屏点（屏上的大号数字）
export function scaleMask(m, s) {
  const key = m; const w = m.w * s, h = m.h * s, a = new Uint8Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) a[j * w + i] = m.a[Math.floor(j / s) * m.w + Math.floor(i / s)];
  return { w, h, a };
}

// ---------- 光晕：在点的分辨率上模糊（便宜），GPU 里双线性放大 ----------
export function blur(src, dst, w, h, r, tmp) {
  // 三次盒式模糊 ≈ 高斯；r 是半径（点）
  tmp = tmp || new Float32Array(w * h); let a = src, b = tmp;
  const pass = (s, d, horiz) => {
    const n = horiz ? w : h, m = horiz ? h : w, st = horiz ? 1 : w, ln = horiz ? w : 1, k = 1 / (2 * r + 1);
    for (let q = 0; q < m; q++) {
      const o = q * ln; let acc = 0;
      for (let i = -r; i <= r; i++) acc += s[o + Math.min(n - 1, Math.max(0, i)) * st];
      for (let i = 0; i < n; i++) {
        d[o + i * st] = acc * k;
        acc += s[o + Math.min(n - 1, i + r + 1) * st] - s[o + Math.max(0, i - r) * st];
      }
    }
  };
  pass(a, b, true); pass(b, dst, false); pass(dst, b, true); pass(b, dst, false); pass(dst, b, true); pass(b, dst, false);
  return dst;
}

// ---------- 物件：WebGL2 ----------
const VS = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;
const FS = `#version 300 es
precision highp float;
uniform sampler2D uB, uM, uG1, uG2;        // 亮度（整点）、亮度（带 mip，远看时用）、小光晕、大光晕
uniform vec2 uRes, uN;                      // 画面像素、点数
uniform vec3 uPos, uR, uU, uF;              // 机位与朝向（屏面 z=0，单位 = 一个点距）
uniform float uTan, uMean, uPower, uGlass, uWall;
out vec4 o;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
const vec3 AMB = vec3(1.0, .50, .085);      // 琥珀色灯芯
vec3 led(float b, float r, float var) {      // 一颗亮着的灯：中心发白，边上是琥珀
  float core = exp(-r * r / .022), body = exp(-r * r / .075);
  vec3 c = AMB * b * (1.1 * body + 1.9 * core) * var;
  c += vec3(1., .80, .50) * pow(b, 2.) * core * 1.4 * var;
  return c;
}
void main(){
  vec2 q = (gl_FragCoord.xy - uRes * .5) / (uRes.y * .5);
  vec3 d = normalize(uF + uR * q.x * uTan + uU * q.y * uTan);
  float t = -uPos.z / d.z; vec3 hit = uPos + d * t;
  vec2 uv = vec2(hit.x + uN.x * .5, uN.y * .5 - hit.y);          // 点坐标：左上 (0,0)
  vec2 fw2 = fwidth(uv); float fw = max(fw2.x, fw2.y);             // 一个像素跨多少点
  float M = 9.;                                                     // 外壳边宽（点）
  vec2 e = max(-uv, uv - uN);  float out_ = max(e.x, e.y);          // >0：在点阵外
  vec3 col;
  // 墙：屏挂在一面暗墙上，墙上有屏漏出来的琥珀光
  vec2 cen = uv - uN * .5; vec2 dd = max(abs(cen) - uN * .5 - M, 0.); float dist = length(dd);
  vec2 cs = cen - vec2(2.5, 3.5); float sd = length(max(abs(cs) - uN * .5 - M, 0.));   // 影子往右下偏一点：屏离墙有厚度
  float wallN = vn(uv * .35) * .6 + vn(uv * 1.7) * .4;
  vec3 wall = vec3(.0035, .0033, .0032) * (.7 + .6 * wallN) + AMB * uMean * uWall * (.55 * exp(-dist / 26.) + .45 * exp(-dist / 95.));
  wall *= mix(.25, 1., smoothstep(0., 9., sd));                   // 外壳在墙上的影子
  if (out_ > M) col = wall;
  else if (out_ > 0.) {                                             // 外壳：黑色阳极氧化铝，内外两道倒角
    float k = out_;
    vec3 al = vec3(.010, .0098, .0095) * (.8 + .4 * vn(vec2(uv.x * 4., uv.y * .15) + uv.y * 3.));
    al += vec3(.03) * smoothstep(1.2, 0., abs(k - M + .6)) * .6;    // 外沿高光
    al += vec3(.02) * smoothstep(.8, 0., abs(k - .5)) * .5;          // 内沿
    al = mix(al * .4, al, smoothstep(0., 2.5, k));                   // 贴着点阵的一圈压暗
    vec2 sc = abs(cen) - (uN * .5 + M * .5);                          // 四角的螺丝
    float scr = length(sc); al = mix(al, vec3(.035, .034, .033), smoothstep(1.05, .85, scr)); al *= 1. - .6 * smoothstep(.5, .2, abs(scr - .7));
    al += AMB * uMean * .02;
    col = al;
  } else {
    vec2 cell = floor(uv), f = fract(uv) - .5; float r = length(f);
    ivec2 ic = ivec2(clamp(cell, vec2(0), uN - 1.));
    float b = texelFetch(uB, ic, 0).r * uPower;
    float var = .86 + .26 * h21(cell + 17.3);
    float aa = max(fw * .8, .03), R = .39;
    float disc = 1. - smoothstep(R - aa, R + aa, r);
    vec3 mask = vec3(.0016, .0015, .0015) * (.8 + .4 * h21(floor(uv * 3.)));
    vec2 hl = f - vec2(-.12, -.15);
    vec3 lens = vec3(.0065, .0055, .005) + vec3(.03, .028, .026) * exp(-dot(hl, hl) / .004) * uGlass;   // 没亮的透镜：暗的半球和一点反光
    vec3 near = mix(mask, lens + led(b, r, var), disc) + AMB * b * var * exp(-r * r / .16) * .10;
    // 远看：一个像素盖住好几颗点时，换成这几颗点的平均（mip），不让点阵和像素打架
    float bm = textureLod(uM, uv / uN, log2(max(fw, 1.))).r * 1.6 * uPower;
    vec3 far = mask * .5 + lens * .45 + AMB * bm * .62 + vec3(1., .78, .45) * pow(bm, 2.2) * .08;
    col = mix(near, far, smoothstep(.2, .42, fw));
  }
  // 光晕：屏里的漫射 + 玻璃（只在外壳以内）
  if (out_ < M) {
    vec2 st = uv / uN;
    float g1 = texture(uG1, st).r, g2 = texture(uG2, st).r;   // 光晕只来自亮的点（车、字），暗的地图不起雾
    float inside = 1. - smoothstep(0., 2., out_);
    col += AMB * (g1 * .45 + g2 * .22) * uPower * mix(.35, 1., inside);
    // 玻璃：反射一条窗光，机位一动就滑过去；斜看更亮（菲涅耳）
    vec3 rf = reflect(d, vec3(0, 0, 1));
    float fres = .04 + .96 * pow(1. - abs(d.z), 5.);
    float band = smoothstep(.07, .0, abs(rf.x * .8 + rf.y * .55 - .18)) * smoothstep(.6, .2, abs(rf.y + .1));
    col += vec3(.75, .8, .9) * (band * .007 + .0008) * fres * 6. * uGlass * inside;
    col += vec3(.5) * step(.9975, h21(floor(uv * 7.))) * .025 * uGlass * inside * smoothstep(.12, .03, fw);   // 灰尘
  }
  col = 1. - exp(-col * 1.25);                                      // 柔和的高光压缩
  o = vec4(pow(col, vec3(1. / 2.2)), 1.);
}`;

export function makeGL(canvas, NX, NY) {
  const gl = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: true });
  if (!gl) throw new Error('WebGL2 不可用');
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
  gl.useProgram(pr);
  const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(pr, n);
  const tex = (unit, filt, mip) => { const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : filt); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filt);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
  const T = [tex(0, gl.NEAREST), tex(1, gl.LINEAR, true), tex(2, gl.LINEAR), tex(3, gl.LINEAR)];
  ['uB', 'uM', 'uG1', 'uG2'].forEach((n, i) => gl.uniform1i(U(n), i));
  const b8 = new Uint8Array(NX * NY);
  const up = (i, data, mip) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, T[i]); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    if (mip) {                                                        // 远看用的那张带 mip：R8（R16F 在有的驱动上不能生成 mip），0–1.6 压进 0–255
      for (let k = 0; k < data.length; k++) b8[k] = Math.min(255, data[k] / 1.6 * 255 + .5);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, NX, NY, 0, gl.RED, gl.UNSIGNED_BYTE, b8); gl.generateMipmap(gl.TEXTURE_2D);
    } else gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, NX, NY, 0, gl.RED, gl.FLOAT, data); };
  const hot = new Float32Array(NX * NY), g1 = new Float32Array(NX * NY), g2 = new Float32Array(NX * NY), tmp = new Float32Array(NX * NY);
  return function draw(buf, cam, o = {}) {
    gl.viewport(0, 0, canvas.width, canvas.height);
    up(0, buf); up(1, buf, true);
    for (let k = 0; k < buf.length; k++) hot[k] = Math.max(0, buf[k] - .4);          // 只有亮过 0.4 的点才晕开
    blur(hot, g1, NX, NY, 1, tmp); blur(hot, g2, NX, NY, 5, tmp); up(2, g1); up(3, g2);
    let mean = 0; for (let k = 0; k < buf.length; k += 7) mean += Math.min(1, buf[k]); mean /= buf.length / 7;
    gl.uniform2f(U('uRes'), canvas.width, canvas.height); gl.uniform2f(U('uN'), NX, NY);
    gl.uniform3fv(U('uPos'), cam.pos); gl.uniform3fv(U('uR'), cam.r); gl.uniform3fv(U('uU'), cam.u); gl.uniform3fv(U('uF'), cam.f);
    gl.uniform1f(U('uTan'), cam.tan); gl.uniform1f(U('uMean'), mean * (o.power ?? 1)); gl.uniform1f(U('uPower'), o.power ?? 1);
    gl.uniform1f(U('uGlass'), o.glass ?? 1); gl.uniform1f(U('uWall'), (o.wall ?? 1) * .4);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return mean;
  };
}

// ---------- 机位：看向屏上的一点（点坐标），点距（像素），绕竖轴转 yaw、绕横轴转 pitch（度） ----------
// 点距 = 机位正对屏时屏面上一个点在画面中心的像素数；6 px、正对、看中心 = 320×180 的屏正好铺满 1920×1080
export function camera(W, H, NX, NY, { u, v, pitchPx, yaw = 0, tilt = 0, roll = 0 }, fovDeg = 30) {
  const tan = Math.tan(fovDeg * Math.PI / 360);
  const dist = (H / pitchPx) / 2 / tan;                              // 屏面上 H/pitchPx 个点正好占满画面高
  const tx = u - NX / 2, ty = NY / 2 - v;
  const ya = yaw * Math.PI / 180, pa = tilt * Math.PI / 180;
  const off = [Math.sin(ya) * Math.cos(pa), Math.sin(pa), Math.cos(ya) * Math.cos(pa)];
  const pos = [tx + off[0] * dist, ty + off[1] * dist, off[2] * dist];
  const f = [-off[0], -off[1], -off[2]];
  let r = norm(cross(f, [0, 1, 0])); let uu = cross(r, f);
  if (roll) { const c = Math.cos(roll * Math.PI / 180), s = Math.sin(roll * Math.PI / 180); const r2 = r.map((x, i) => x * c + uu[i] * s), u2 = uu.map((x, i) => x * c - r[i] * s); r = r2; uu = u2; }
  return { pos, r, u: uu, f, tan };
}
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = a => { const l = Math.hypot(...a); return a.map(x => x / l); };
