# 技术：影片是怎么做出来的

*本文是 [TECHNIQUE.md](TECHNIQUE.md) 的中文版，以英文版为准。改编自 [Lemo-Opuscar](https://github.com/lemomo-ai/lemo-opuscar)（MIT，© 2026 LemoLab），上游提交 9eb7739，见 UPSTREAM.md。*

这里的每部影片都由代码做成：没有视频生成，没有素材库镜头。本页讲解这条流水线，可以用我们 `core/` 里的工具复现，也可以用你自己的技术栈。配合 [`DIRECTOR.zh-CN.md`](DIRECTOR.zh-CN.md) 和一份 `styles/<slug>/STYLE.md` 一起用。每条命令和参数都在 [`core/README.md`](core/README.md) 里。

```
timeline（唯一的数据来源）
   ├─► 画面：带 render(t) 的网页 ──► 无头 Chrome 逐帧截图 ──► video.mp4
   ├─► 配音：逐句 TTS ──► 语音转文字检查 ──► 逐词时间
   ├─► 音乐：由同一条 timeline 生成配乐（采样 + 合成）──► 分轨
   ├─► 音效：在事件时间点上程序化生成拟音
   └─► 字幕：.srt + 烧进画面的字幕
混音（闪避、压缩、平衡）──► 用 ffmpeg 合成，两遍 loudnorm 到 −14 LUFS ──► film.mp4
```

## 1. 环境要求和安装

系统工具，由用户自己安装：**Node 20+**、**ffmpeg 7+**（6.x 经过 `loudnorm` 后会少报音频长度，`mux.sh` 就会把文件当成被截断而拒绝），以及 **Python 3.11+** 或 [uv](https://docs.astral.sh/uv/)。在 macOS（Apple 芯片）上开发；Linux 应该可用。Windows 上可以用 Git Bash（Git for Windows 自带）：在里面运行同样的 `sh` 命令；WSL 也可以。3D 和着色器较重的风格需要 GPU。

其余的东西分层安装，在库的根目录下执行（技能模式下是 `$LIB`）。影片用得到哪一层，才装哪一层：

| 命令 | 增加的内容 | 大小 |
|---|---|---|
| `sh plugin/skills/neo-cine/scripts/setup.sh deps` | 核心层：npm 包、无头浏览器、Python `.venv`（numpy、scipy、soundfile、soxr、pillow）：渲染、合成声音、mux | 约 350 MB |
| `… setup.sh deps voice` | Kokoro 及模型（英文，离线）、edge-tts（中文，在线）、faster-whisper（配音检查） | 约 0.55 GB，首次检查时再加一个 Whisper 模型（英文约 145 MB，中文约 480 MB） |
| `… setup.sh deps music` | numba，用于拨弦乐器（`pluck.py`）；采样器本身只需要核心层 | 约 140 MB |
| `sh tools/fetch.sh instruments <lib>` | 一个采样库：`freepats`、`karoryfer`、`salamander`、`vcsl`、`vsco2ce` 或 `all` | 每个 70–400 MB |
| `sh tools/fetch.sh hdri` | 3D 风格用的 HDRI | 12 MB |

有些风格需要自己的包（LiDAR 读取器、幻灯片扫描解码器、CAD 导入器）；风格的 `STYLE.md` 会列出来。它们是包，不是系统工具：你自己把它们装进项目文件夹里的私有 venv 或 `node_modules`，绝不装进 `$LIB/.venv`。

合成的配乐不需要大的下载；缺某件乐器时，`sampler.py` 会说出要下载哪个库。一个包解压时需要大约两倍于自身大小的空闲空间。下载来自 npm、PyPI、GitHub Releases 和 Hugging Face（`HF_ENDPOINT` 可以设置镜像）；`tools/fetch.sh` 下载的包来自上游 Lemo-Opuscar 的 releases。

## 2. 画面是时间的函数

每部影片是一个文件夹，里面有一个 `index.html`（命令里写作 `<demo>`），它暴露：

```js
window.DUR = 54.2;                 // 秒
window.render = (t) => { ... };    // 画出时间 t 的那一帧，确定性的
window.READY = true;               // 字体和图片加载完后设置
window.EV = [{t, type, ...}];      // 可选：给混音用的声音／卡点事件
window.TEXTS = (t) => [{id, text, x0, y0, x1, y1}];   // 可选：t 时刻可见的每段文字，给 readcheck 用（pass: true = 不需要观众读完：一闪而过的招牌、小字署名）
```

**路径：** 页面用绝对 URL 访问库里的文件（`/core/lib.js`、`/node_modules/three/build/three.module.js`）；脚本和 `build.sh` 用 `$LIB`。绝不用 `../..`。

一份两种模式都能用的 `build.sh`（技能模式下，在顶部写上 `LIB=<path setup.sh printed>`）：

```sh
#!/bin/sh
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$(cd "$HERE/../.." && pwd)}          # 克隆模式：<repo>/films/<name>/
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
VER=${1:?usage: sh build.sh v001}               # 每次构建都是新版本：取下一个空号
[ ! -e "$HERE/<name>-$VER.mp4" ] || { echo "<name>-$VER.mp4 exists: take the next number"; exit 1; }
cd "$LIB"
node core/render/events.mjs "$HERE"
node core/render/video.mjs "$HERE" --fps 24 --out "$HERE/out/video.mp4"
"$LIB/.venv/bin/python" "$HERE/mix.py"                               # 配乐、拟音、配音 → out/mix.wav
LEMO_COLOR=bt709 sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/<name>-$VER.mp4" 24
```

**版本：** 每个交付物（成片、海报、字幕）都存为新版本，`-v001`、`-v002`……，不覆盖之前的版本。先看项目文件夹里已有的文件，取下一个号（`sh build.sh v002`）；同一版的成片、海报和字幕用同一个版本号。`out/` 里的中间文件可以覆盖。`LEMO_COLOR=bt709` 是标准色彩（§6）。

保证可靠的规则：

- **确定性。** 不用 `Date.now()`，不用没有种子的 `Math.random()`（`core/lib.js` 里有 `mulberry` 和 `hash`），不从上一帧带状态过来。任何一帧都可以单独渲染，顺序随意，由哪个 worker 渲染都行。
- 大多数 2D 风格用 **Canvas 2D**；3D 用 **three.js**（§9）；后期通道（胶片损伤、CRT、墨线重绘）用 **WebGL2** 着色器。
- **风格需要时一拍二**（定格、像素或赛璐璐观感用 12 fps 步进），但摄影机和灯光每一帧都要平滑。步进的摄影机看起来像卡顿。
- **只用一个世界 → 屏幕函数。** 任何跟随主体的效果（圈入圈出、变焦、聚光）都经过它。绝不手写屏幕坐标。
- **按你要渲染的画幅来画。** 默认是 1920×1080；其他尺寸给每个渲染工具传 `--size WxH`（如 `1080x1920`），页面按 `innerWidth` × `innerHeight` 来布局。

截帧（`core/render/`）：

```sh
node core/render/still.mjs <demo> 1.5 12 --range 0:50:2   # 审片用的静帧；页面出错时退出
node core/render/video.mjs <demo> --fps 24 --workers 3     # 全部帧 → <demo>/out/video.mp4
node core/render/events.mjs <demo>                         # 导出 DUR + EV → events.json
node core/render/readcheck.mjs <demo>                      # 每段屏幕文字都停留得够久，读得完
```

要用别的内容渲染第二个版本，把内容传给页面，并给它单独的输出：`--q 'content=content_alt.json' --out …/alt.mp4`（`events.mjs` 同理）。

截帧快，靠的是 **JPEG 截图**、**每个 worker 一个浏览器**，以及**在 ffmpeg 里加颗粒**：在页面里画颗粒会让每一帧都压不动，而且慢。

## 3. 一条时间线驱动一切

把段落、速度、节拍和击点都放在一个文件里（`timeline.js`）。把它导出成 JSON，让配乐、混音、字幕和各项检查读同一组数字：

```js
export const SECS = [{ id: 'chase', t: 12.0, bpm: 144, beats: 12 }, ...];
export const HIT  = { pratfall: ['chase', 6], ... };   // 段落 + 拍
```

把每个画面击点和它应该落在的音乐卡点做比较，目标是 0 ms。`neo/audio/cues.py` 对任何影片都能做这件事，依据是页面导出的事件（`window.EV`）：在 `mix.py` 里，由画面驱动的声音按名字从事件取时间（`K.events('state')`、`K.at('title')`）；写在音乐节拍上的重音，声明它属于哪个事件（`stomp(K.on('spike', bar_t(15)))`）；`K.report()` 打印每个卡点上配乐和画面相差多少，超过半帧就让构建停下。`K.near('car', t)` 可以让画面事件决定一个乐句里哪些音响。用法见文件开头；`styles/atlas-scroll/demo/mix.py` 在用。（上游 Lemo-Opuscar 库的做法是若干示范片各自在 `styles/<slug>/demo/tools/` 里带一份 `cuecheck.py`。）

## 4. 配音

- **TTS 只是默认方案。** 用户带了录音或者指定了声音，就用那个。否则：
  - **英文**：[Kokoro](https://github.com/thewh1teagle/kokoro-onnx)，本地运行，声音很多（`voice` 名字不认识时，`tts.py` 会打印完整列表；`af_`／`am_` 是美音，`bf_`／`bm_` 是英音；为这部影片挑旁白的声音，不要沿用示范片的）。`core/tts/tts.py lines.json out/` 每句写一个 WAV，外加一个时长文件。它的中文声音（`"lang": "cmn"`）可以离线用，但听起来平淡。
  - **中文**：`core/tts/tts_zh.py lines.json out/` 使用 [edge-tts](https://github.com/rany2/edge-tts) 和微软的神经网络语音（`zh-CN-XiaoxiaoNeural`、`zh-CN-YunxiNeural`……），输出和 `tts.py` 相同，可以逐句设语速，并裁掉静音。**需要联网。**
- TTS 文本里把数字写成读法，字幕里写成阿拉伯数字。
- **每一句都要检查**：`core/tts/asr_check.py` 用 faster-whisper 转写每个 WAV，并和稿子比较（`--lang zh`：数字按数值比，所以十九和 19 相符，其余逐字比）；重新生成，直到它以 0 退出。中文短句里听错一个字是正常的：自己听一遍，如果读得对，就把模型听到的内容写进这一句的 `asr` 字段。它还会写出逐词时间戳，用来摆放句子和字幕。
- **混音之前**：TTS 的峰均比很高。先压缩人声，再按 RMS 平衡：人声比音乐高约 10 dB。

## 5. 音乐

根据卡点表写原创配乐，用风格声音调色板里的乐器；不要泛泛的钢琴加弦乐。

- **采样**：`core/audio/sampler.py` 用免费采样库演奏真实乐器（VSCO 2 CE、VCSL、FreePats、Karoryfer、Salamander Grand Piano；清单和许可证见 `core/audio/INSTRUMENTS.md`）。配乐写成事件 `(time, instrument, pitch, duration, velocity, pan)`。长音会被无缝延长，轮换采样（round-robin）避免机关枪效应。
- **拨弦和民族弦乐**（古琴、琵琶、三味线、班卓琴……）：`core/audio/pluck.py`，物理建模（Karplus–Strong），带滑音和揉弦。
- 用 numpy 做**合成**，适合芯片音乐、持续音和效果声；不需要下载。
- **平衡低频。** 合成的配乐很快就会低频过重。混音后测量各频段的能量；让 20–120 Hz 相对其余频段保持在 −3 dB 左右，铺底的 pad 不用低于 MIDI 48 的音，并给贝斯加一些二次和三次谐波，让它在小扬声器上也听得见。

## 6. 音效和混音

- `core/audio/sfx.py` 程序化合成拟音（click、whoosh、thump、ding、paper、噪声底……），带滤波器、包络和 `add(buffer, sound, at, gain, pan)`。用 `window.EV` 驱动它，这样每个声音都准确落在对应的帧上。
- **母带之前**：`mix.py` 的最后一步用 `neo/audio/master.py`（`mix = M.master(mix)`，写出文件后再 `M.check(path)`）。`mux.sh` 的 loudnorm 只有在提升后真峰值不超过 −1.2 dB、响度范围不超过 11 LU 时，才对整部片子只加一个增益；按峰值归一的混音，几下重音压着一个安静的主体，两条都过不了，loudnorm 就会动态调整电平，各段的强弱被重新分配（我们的示范片里，写成最响的那一段出来成了最轻的）。`master()` 给整条混音一个增益到 −14 LUFS，只把峰值收短（先软限，再按真峰值限幅）；它会打印每一步做了多少，软限把很多时间窗削掉 3 dB 以上，说明重音在源头就太响了。loudnorm 仍然要动态调整时，`check()` 让构建失败。
- **母带**：`sh core/render/mux.sh video.mp4 mix.wav out.mp4 24 [grain]` 合成音画，跑两遍 loudnorm 到 −14 LUFS 并限制真峰值，在 ffmpeg 里加颗粒，并打印实测响度；任何失败都以非零退出。浅色背景少加颗粒；像素和矢量风格不加。
- **标准色彩**：成片做母带时给 `mux.sh` 设 `LEMO_COLOR=bt709`（`LEMO_COLOR=bt709 sh core/render/mux.sh …`）：有限范围，BT.709 标记。默认保留全范围的 BT.601 标记，有些平台的转码器会忽略它。输出文件名带版本号（§2）。
- 画面里烤进了颗粒的影片很难压缩；用 `-tune grain` 和更高的 CRF 重新编码。

## 7. 字幕

- 用 `core/render/srt.py cues.json out.srt` 导出 `.srt`（cues = `[{t0, t1, text}]`），带样式的字幕则烧进页面本身：字幕设计是风格的一部分。
- 时间规则见 DIRECTOR.md §7。

## 8. 审片流程

1. 抽帧总览图（contact sheet）：用 `still.mjs --range` 每 1–2 秒取一帧，用 `core/render/sheet.py` 拼起来。至少完整过两遍。
2. 每个关键动作的 0.2 秒连续帧：递交、摔倒、击打。
3. 对最终文件：`ffmpeg -af ebur128`（响度）、`blackdetect`（空白帧），有配音的话对最终混音再跑一次 whisper。
4. 带声音、原速看一遍。

## 9. 3D 说明

- three.js r170，通过 GPU 上的 WebGL2 无头渲染；物理景深和 GTAO 来自 `core/three/post.js`，以 2× 渲染再缩小。
- 灯光：柔和的面光源加一张低强度的 Poly Haven HDRI，比明亮的环境光更“真”。
- `core/three/post.js` 是按透视相机写的。用正交相机时，把它深度通道里的 `perspectiveDepthToViewZ` 换成 `orthographicDepthToViewZ`，否则景深会悄悄失效。

## 10. 用代码画的角色

- 一套 2.5D 骨架（躯干、头、四肢，逐帧解算）足够做哑剧表演。
- 肩部旋转的顺序是先外展、再屈曲；顺序反了，抬起的双臂会交叉成 X。
- 手臂抬起时让肩带跟着上提并前移，手臂和躯干重叠的部分不要描边：正是那条线让关节看起来像木偶的接缝。

## 11. 素材、署名和字体

只用 CC0、CC BY 或 OFL 的素材，每一项都列在影片的 `CREDITS` 里，附来源和许可证；`core/audio/sampler.py credits(names)` 会为你用到的乐器写出这些行。公有领域作品算作 CC0；“no known restrictions”（无已知限制）不算。其他开放许可证（ODbL、CC BY-SA、开源硬件许可证）下的数据或图片，只有在你向用户说明了许可证及其条款（署名、相同方式共享）并且他们同意之后才能用。用户自己的素材可以直接用。

陈述事实的影片在项目文件夹里保留一份 `FACTS.md`：每条论断附来源 URL 和引用的原文，或者得出它的测量。

字体：Google Fonts（OFL），自行托管在项目里。`STYLE.md` 点名的字体不在库里；把它们下载到项目的 `fonts/`（`https://github.com/google/fonts/tree/main/ofl/<family>`）。`core/fonts/` 里有几款拉丁展示字体和一款只有约 200 个字形的中文展示字体，不够排成段的中文。中文要把一款 CJK 字体子集化到你用到的字：Google Fonts CSS API 加上 `&text=` 只返回这些字形（`https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@700&text=<URL-encoded characters>`）。把它指向的字体文件下载到项目的 `fonts/`，用 `@font-face` 加载；渲染时不要链接 Google Fonts。

## 12. 在我们的示范片里看哪里

NEO-Cine 目前有两支示范片。《十三到五十》（From Thirteen to Fifty，56 秒，120 BPM），风格是铜版图卷（Atlas Scroll），展示一张随年份变化的地图：带日期的边界和铁路来自 `neo/geo/ohm.py`，按年份取版本和邻接着色在 `styles/atlas-scroll/demo/main.js`（`at`、`drawMap`），镜头跟随的行旅（`guideAt`、`drawGuides`），屏幕空间的牌子（`drawHud`），班卓、吉他、口琴的配乐在 `demo/mix.py`。下表讲的是另一支，《折叠深圳》（Shenzhen, Folded，40 秒，120 BPM），风格是折叠城市（Folding City）。

| 如果你需要…… | 去看 |
|---|---|
| three.js 里的平涂卡通着色，不描边 | `styles/folding-city/demo/kit.js` (`GRAD`, `M`, `facade`) |
| 在正交和透视之间变形的摄影机装置（滑动变焦） | `demo/main.js` (`camWorld`, `setCamera`); the states are in `demo/timeline.js` (`CAM`) |
| 铰链折叠（成排的楼和地块折起来变成墙） | `demo/main.js` (`setPlates`), `demo/luohu.js` and `demo/nanshan.js` (`update`) |
| 一条时间线同时驱动画面和声音 | `demo/timeline.js`; the sound events are derived at the end of `demo/main.js` (`window.EV`) |
| 根据导出的事件、用 numpy 合成的配乐和音效 | `demo/mix.py` |
| 带 `window.TEXTS` 的 canvas 2D 文字叠加层 | `demo/main.js` (`drawText`) |

上游的 [Lemo-Opuscar](https://github.com/lemomo-ai/lemo-opuscar) 库（MIT）有很多其他技术的示范片（笔刷引擎、角色、配音、采样配乐），可以到那里去学。

每个风格的 `DEMO.md` 说明它的示范片是怎么做的。只在你的导演方案写好之后才打开它和代码，为的是学一项技术，绝不是重做我们的影片（用真实素材剪出来的风格，它 `demo/tools/` 里的素材工具先用：AGENTS.md，“先写导演方案”）。技能模式下，用 `sh <skill folder>/scripts/setup.sh demo <slug>` 取得源码。复制来的示范片代码常常用 `../..` 访问库：把它换成 `$LIB` 或绝对 URL。
