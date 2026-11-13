// 微缩景观工具包 · 后期：场景（多重采样）→ 接触阴影（GTAO）→ 移轴模糊（景深带可动画）→ 夜间辉光 → 色调映射输出。
//   AO：three.js 的 GTAOPass，限定在模型外包盒里（setSceneClipBox）。正交相机下 GTAO 会把背景（远平面）也算进去，
//       在空背景上留下脏斑；外包盒外一律不算，就干净了。
//   移轴：自己写的两遍可分离高斯（横一遍、竖一遍），模糊半径随像素离"清晰带"的距离增大。清晰带可以斜、可以动。
//   辉光：UnrealBloomPass，只在夜里开（白天开会把白模糊成一团），阈值高，只抓灯和窗。
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// 移轴的一遍：dir = (1,0) 横向，(0,1) 竖向。center、half、soft 都按画面高度的比例（0 = 底，1 = 顶），
// angle 让清晰带倾斜，maxR 是最大模糊半径（像素，按输出 1080p 计，内部乘超采样倍数）。
const TiltShader = {
  uniforms: { tDiffuse: { value: null }, res: { value: new THREE.Vector2(1920, 1080) }, dir: { value: new THREE.Vector2(1, 0) },
    center: { value: .5 }, halfW: { value: .12 }, soft: { value: .25 }, maxR: { value: 6 }, angle: { value: 0 }, amount: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: `
    varying vec2 vUv; uniform sampler2D tDiffuse; uniform vec2 res, dir; uniform float center, halfW, soft, maxR, angle, amount;
    void main(){
      float asp = res.x / res.y;
      float y = (vUv.y - .5) * cos(angle) - (vUv.x - .5) * asp * sin(angle) + .5;   // 斜带：转一下坐标
      float k = smoothstep(halfW, halfW + soft, abs(y - center)) * amount;
      float r = maxR * k;
      if (r < .3) { gl_FragColor = texture2D(tDiffuse, vUv); return; }
      vec3 acc = vec3(0.); float ws = 0.;
      for (int i = -8; i <= 8; i++) {
        float x = float(i) / 8.;                     // -1..1
        float w = exp(-x * x * 2.2);
        acc += texture2D(tDiffuse, vUv + dir * x * r / res).rgb * w; ws += w;
      }
      gl_FragColor = vec4(acc / ws, 1.);
    }`,
};

export class Post {
  // ssaa：内部超采样倍数（2 = 3840×2160 渲，浏览器缩回 1080p 时再平均一次）
  constructor(renderer, scene, camera, { w = 1920, h = 1080, ssaa = 2, ao = true, clipBox = null } = {}) {
    this.renderer = renderer; this.s = ssaa;
    const W = w * ssaa, H = h * ssaa;
    const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(renderer, rt); this.composer.setPixelRatio(1); this.composer.setSize(W, H);
    this.composer.addPass(new RenderPass(scene, camera));
    if (ao) {
      this.ao = new GTAOPass(scene, camera, W, H);
      this.ao.output = GTAOPass.OUTPUT.Default; this.ao.blendIntensity = .9;
      this.ao.updateGtaoMaterial({ radius: .8, distanceExponent: 1.4, thickness: 1.2, scale: 1.1, distanceFallOff: 1, samples: 16 });
      this.ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5 * ssaa, rings: 2, samples: 16 });
      if (clipBox) this.ao.setSceneClipBox(clipBox);
      // 玻璃、动线这类半透明的东西不参加 AO：否则 GTAO 的法线 / 深度图里会有它们，玻璃边缘留下一道道黑线
      const aoRender = this.ao.render.bind(this.ao);
      this.ao.render = (...args) => {
        const hid = []; scene.traverse(o => { if (o.visible && o.isMesh && (o.material.transparent || o.userData.noAO)) { o.visible = false; hid.push(o); } });
        aoRender(...args); for (const o of hid) o.visible = true;
      };
      this.composer.addPass(this.ao);
    }
    this.tiltH = new ShaderPass(TiltShader); this.tiltV = new ShaderPass(TiltShader);
    this.tiltH.uniforms.res.value.set(W, H); this.tiltV.uniforms.res.value.set(W, H); this.tiltV.uniforms.dir.value.set(0, 1);
    this.composer.addPass(this.tiltH); this.composer.addPass(this.tiltV);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0, .5, .82);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
  }
  // tilt = { center, half, soft, maxR, angle, amount }；bloom = 强度（0 关）；ao = 0–1
  set({ tilt = {}, bloom = 0, ao = 1 } = {}) {
    for (const p of [this.tiltH, this.tiltV]) { const u = p.uniforms; for (const k of ['center', 'soft', 'angle', 'amount']) if (tilt[k] != null) u[k].value = tilt[k]; if (tilt.half != null) u.halfW.value = tilt.half; if (tilt.maxR != null) u.maxR.value = tilt.maxR * this.s; }
    this.bloom.strength = bloom; this.bloom.enabled = bloom > .001;
    if (this.ao) { this.ao.blendIntensity = ao; this.ao.enabled = ao > .001; }
  }
  render() { this.composer.render(); }
}
