// 微缩景观工具包（Miniature kit）：做任何桌上微缩景观都能拿来搭的 ES 模块。用法见 ../../STYLE.md §10。
// 页面里先用 importmap 把 'three' 和 'three/addons/' 指到库的 /node_modules/three/（见 ../index.html）。
export * from './core.js';            // 随机、缓动、路径、关键帧、匀减速 / 匀加速、时间引用
export * from './geom.js';            // 倒角盒、几何缓存、静态件合并、盒减盒
export * from './materials.js';       // 色板和比例、白模 / 漆 / 金属 / 玻璃、带地层的土、会亮的批次
export * from './base.js';            // 底座、铭牌位、土体、楼板、墙、玻璃幕墙、切面
export * from './parts.js';           // 柱、梁、栏杆、楼梯、扶梯、门、闸机、长椅、垃圾桶、指示牌、雨棚、树、灌木、路灯、接触网、大屏、安检仪、安检门
export * from './people.js';          // 小人（实例化）、行程、常用人群
export * from './vehicles.js';        // 列车、公交、出租车、小汽车、循环车流
export * from './light.js';           // 日光 / 蓝调 / 夜景
export * from './post.js';            // AO、移轴、辉光
export * from './camera.js';          // 正交 / 长焦、镜头关键帧和常用动作
export * from './explain.js';         // 引线标注、编号牌、层名、标题卡、动线
export * from './context.js';         // 周边真实楼群（neo/geo/buildings.py）
export { buildMiniature } from './scene.js';   // 场景描述 → 模型
