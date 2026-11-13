// 微缩景观工具包 · 镜头：正交和长焦两种相机，镜头状态 = { target:[x,y,z], yaw, pitch, size }。
//   yaw：绕竖轴的角（弧度，0 = 从 +z 方向看过去，正值往 +x 转）；pitch：俯角；size：画面半高（模型单位）。
// 正交下 size 就是半高；长焦（默认 9° 视场）按 size 反算距离，所以两种相机的取景一致，可以随时换。
// 镜头动作都是时间的纯函数：shots(keys) 在关键帧之间按缓动曲线走；orbit、pan、descend、pushIn 只是生成关键帧的写法。
import * as THREE from 'three';
import { keyframes, lerp, lerpAngle, eio, seg, D2R } from './core.js';

export class CameraRig {
  constructor({ kind = 'ortho', aspect = 16 / 9, fov = 9, far = 2000 } = {}) {
    this.kind = kind; this.aspect = aspect; this.fov = fov;
    this.camera = kind === 'ortho' ? new THREE.OrthographicCamera(-10, 10, 10, -10, .1, far) : new THREE.PerspectiveCamera(fov, aspect, .5, far);
    this.shot = { target: [0, 0, 0], yaw: 0, pitch: .5, size: 10 };
  }
  set(s) {
    this.shot = s; const c = this.camera, cp = Math.cos(s.pitch), dir = new THREE.Vector3(Math.sin(s.yaw) * cp, Math.sin(s.pitch), Math.cos(s.yaw) * cp);
    if (this.kind === 'ortho') {
      const D = 400; c.position.set(...s.target).addScaledVector(dir, D);
      c.left = -s.size * this.aspect; c.right = s.size * this.aspect; c.top = s.size; c.bottom = -s.size; c.near = 1; c.far = D * 2;
    } else {
      const D = s.size / Math.tan(this.fov * D2R / 2); c.position.set(...s.target).addScaledVector(dir, D); c.near = Math.max(.5, D - 300); c.far = D + 300;
    }
    c.up.set(0, 1, 0); c.lookAt(...s.target);
    if (s.roll) c.rotateZ(s.roll);
    c.updateProjectionMatrix(); c.updateMatrixWorld(true);
  }
  // 世界坐标 → 画面像素（W×H）；z > 1 表示在相机后面
  project(p, W, H) { const v = new THREE.Vector3(...p).project(this.camera); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H, v.z]; }
}

// 关键帧镜头：keys = [[t, shot, ease?], …]；两帧之间 target、size、pitch 线性插值，yaw 走最短的角度
export function shots(keys, ease = eio) {
  keys = keys.slice().sort((a, b) => a[0] - b[0]);
  return t => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) {
      const [t0, a, e] = keys[i], [t1, b] = keys[i + 1];
      if (t <= t1) {
        const u = (e || ease)(seg(t, t0, t1));
        return { target: a.target.map((x, j) => lerp(x, b.target[j], u)), yaw: lerpAngle(a.yaw, b.yaw, u), pitch: lerp(a.pitch, b.pitch, u), size: sizeLerp(a.size, b.size, u), roll: lerp(a.roll || 0, b.roll || 0, u) };
      }
    }
    return keys[keys.length - 1][1];
  };
}
// 推近、拉远时按对数插值画面大小：每一段时间里放大的倍数相同，看起来匀速
const sizeLerp = (a, b, u) => Math.exp(lerp(Math.log(a), Math.log(b), u));

// —— 常用镜头动作（返回关键帧，拼进 shots）——
export const S = (target, yaw, pitch, size) => ({ target, yaw: yaw * D2R, pitch: pitch * D2R, size });
// 绕转：从 s 出发，在 [t0,t1] 里 yaw 转 deg 度（长焦慢转，看一个摆在桌上的东西）
export const orbit = (s, t0, t1, deg) => [[t0, s, x => x], [t1, { ...s, yaw: s.yaw + deg * D2R }]];
// 平移：目标点挪 d=[dx,dy,dz]（跟着一个人、沿站台走）
export const pan = (s, t0, t1, d) => [[t0, s], [t1, { ...s, target: s.target.map((x, i) => x + d[i]) }]];
// 逐层下降：一组层高，每层停 hold 秒，层间移动 move 秒
export function descend(s, t0, ys, { hold = 2, move = 1.6 } = {}) {
  const out = []; let t = t0;
  ys.forEach((y, i) => { const k = { ...s, target: [s.target[0], y, s.target[2]] }; if (i) out.push([t, k]); else out.push([t, k]); out.push([t + hold, k]); t += hold + move; });
  return out;
}
// 推近到一个点（层缝、闸机、车门）：size 缩到 size1，俯角可以同时压低，看进两层之间的缝
export const pushIn = (s, t0, t1, target, size1, pitch1 = null) => [[t0, s], [t1, { ...s, target, size: size1, pitch: pitch1 == null ? s.pitch : pitch1 * D2R }]];
