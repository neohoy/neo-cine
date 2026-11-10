# NEO-Cine

**NEO 的代码影片风格库。** 告诉你的编程代理片子讲什么、选一种风格，它来导演、作画、配乐、混音，全程用代码做出一支短片。

*本文是 [README.md](README.md) 的中文版，以英文版为准。*

![折叠城市：《折叠深圳》](styles/folding-city/poster.jpg)

NEO-Cine 是给编程代理用的影片风格库（为 Claude Code 做的）。一种风格不是带参数的模板，而是一份文字说明，讲清一种画面、一种运动方式和一种声音，再配一支带完整源码的示范片。代理读懂风格，为你的题目写自己的导演方案，把片子做成一个“给一个时间就能画出那一帧”的网页，逐帧渲染，再做声音的母带处理。

## 风格

NEO 的风格是一个一个做出来的。目前有：

| # | 风格 | 示范片 | 是什么 |
|---|---|---|---|
| 01 | **折叠城市 Folding City**（[风格说明](styles/folding-city/STYLE.zh-CN.md)） | 《折叠深圳》，40 秒（[示范片说明](styles/folding-city/DEMO.zh-CN.md)） | 一座画成平面海报的城市，其实是三维模型：海报拉开变成街道，成排的楼像门扇和屏风一样折叠，整个区立起来成为一面墙 |

你也可以把一种风格改成自己的，或者从空白开始做一种（见 [MY-STYLES.zh-CN.md](MY-STYLES.zh-CN.md)）；你自己的风格存在库外的 `~/neo-my-styles/` 里。

## 安装

在 Claude Code 里运行：

```
claude plugin marketplace add neohoy/neo-cine
claude plugin install neo-cine@neo
```

然后用 `/neo-cine:neo-cine` 启动，或者直接说要一支 NEO-Cine 风格的片子。技能第一次使用时会把库下载到 `~/neo-cine`，并在那里装好需要的东西。

也可以在克隆里工作：克隆本仓库，运行一次 `sh plugin/skills/neo-cine/scripts/setup.sh deps`，然后让代理读 [AGENTS.md](AGENTS.md)。

**需要先装好** Node 20 以上、ffmpeg 7 以上，以及 Python 3.11 以上或 [uv](https://docs.astral.sh/uv/)。其余的由安装脚本装（两个 Node 包、一个无界面的 Chromium、一个小的 Python 环境）。支持 macOS 和 Windows（Git Bash）；Linux 上做三维风格需要能用的显卡驱动。

## 一支片子是怎么做出来的

1. **需求**：一轮提问（做什么用、在哪里放、多长、什么语言）。
2. **导演方案**：代理先为你的题目写好故事、镜头和声音的计划，然后才去看示范片。
3. **画面**：出几张样帧请你确认。
4. **制作**：一条时间线同时驱动画面、配乐和动作音；片子在无界面浏览器里逐帧渲染，响度做到 −14 LUFS。
5. **交付**：成片、封面和导演方案，每样都带版本号（`-v001`、`-v002`……），不覆盖旧版。

指南：[AGENTS](AGENTS.zh-CN.md)（流程）、[DIRECTOR](DIRECTOR.zh-CN.md)（导演）、[TECHNIQUE](TECHNIQUE.zh-CN.md)（制作）、[MY-STYLES](MY-STYLES.zh-CN.md)（做自己的风格）、[MAINTAINING](MAINTAINING.zh-CN.md)（往库里加风格）。代理读的是英文版，中文版（`X.zh-CN.md`）是给人看的。

## 建在 Lemo-Opuscar 之上

NEO-Cine 建在 LemoLab 的 [Lemo-Opuscar](https://github.com/lemomo-ai/lemo-opuscar)（MIT）的框架上：它的页面约定、制作工具，以及用指南来导演片子的做法。`core/` 是它的工具的原样副本；指南改编自它的指南。这里的风格是 NEO 自己的。哪些是原样镜像、哪些是改编、以后怎么跟更新，都写在 [UPSTREAM.zh-CN.md](UPSTREAM.zh-CN.md) 里。

折叠城市的想法来自 Yuma Garments（[@garments__](https://x.com/garments__)）的错视动画：只学手法，没有使用他的任何画面。

## 许可

MIT，© 2026 NEO造物集 (neohoy)：改编后的指南、风格和示范片源码。来自 Lemo-Opuscar 的部分版权归 © 2026 LemoLab，MIT（[LICENSES/lemo-opuscar-MIT.txt](LICENSES/lemo-opuscar-MIT.txt)）。示范片用到的字体等素材写在它的 `CREDITS` 里。
