<div align="center">

# NEO-Cine

**NEO 的代码影片风格库：风格一个一个做，每种都配一支完全用代码做出来的短片。**<br>
选一个风格，带上你的故事，让编程 agent 来当导演。

<a href="https://neohoy.github.io/neo-cine/"><img alt="看画廊" src="https://img.shields.io/badge/-%E2%96%B6%20%E7%9C%8B%E7%94%BB%E5%BB%8A-F4502A?style=for-the-badge"></a> <a href="README.md"><img alt="English" src="https://img.shields.io/badge/README-English-555?style=for-the-badge"></a> <a href="https://github.com/neohoy/neo-cine/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/neohoy/neo-cine?style=for-the-badge&color=FFC21A&label=stars"></a> <a href="#感谢与声明"><img alt="MIT" src="https://img.shields.io/badge/%E8%AE%B8%E5%8F%AF-MIT-1B49F5?style=for-the-badge"></a>

⚠️ **为 Claude Code 做的。** 风格都是用 Claude 做出来、调出来的，<br>
换成其他 agent 不保证能做出同样的效果。

🆕 **2026-11-13 · [04 号风格：地铁线路图](https://neohoy.github.io/neo-cine/)**：广州地铁从 1997 到 2025 年，在一张印出来的八方向线路图上一条条拖出来，线路取自 OpenStreetMap，改编自 Lemo-Opuscar 的 Transit Map。所有示范片的片尾现在只署 NEO-Cine，数据署名留在各自的 CREDITS 里。[往下看 ↓](#风格)

<sub>官方仓库：[github.com/neohoy/neo-cine](https://github.com/neohoy/neo-cine) · NEO造物集（[@neohoy](https://github.com/neohoy)）</sub>

<sub>本文是 <a href="README.md">README.md</a> 的中文版，以英文版为准。</sub>

</div>

## 风格

每个风格一张图、一句话。点图看它的风格说明，到[画廊](https://neohoy.github.io/neo-cine/)里看片。后面的风格会一个一个加进来。

<!-- styles:start -->

<table>
<tr>
<td width="33%" valign="top"><a href="styles/folding-city/STYLE.zh-CN.md"><img src="docs/frames/folding-city.jpg" alt="折叠城市"></a><br><b>01 · 折叠城市</b><br>Folding City<br><sub>图形与排版 · <i>Shenzhen, Folded</i> · 0:40</sub><br>深圳三个区像三张平面海报：拉开变成街道，楼像门扇和屏风一样折起来，整块地立成墙，最后把城市折成一个 U。<br><sub><a href="styles/folding-city/STYLE.zh-CN.md">风格说明</a> · <a href="styles/folding-city/DEMO.zh-CN.md">示范片说明</a> · <a href="https://github.com/neohoy/neo-cine/releases/download/films/folding-city.mp4">下载 1080p</a></sub></td>
<td width="33%" valign="top"><a href="styles/atlas-scroll/STYLE.zh-CN.md"><img src="docs/frames/atlas-scroll.jpg" alt="铜版图卷"></a><br><b>02 · 铜版图卷</b><br>Atlas Scroll<br><sub>真实地图 · <i>From Thirteen to Fifty</i> · 0:56</sub><br>一张手工设色的地图集图版向西展开：各州一年年上色，一辆篷车带路走到太平洋，1869 年铁路追上了它。<br><sub><a href="styles/atlas-scroll/STYLE.zh-CN.md">风格说明</a> · <a href="styles/atlas-scroll/DEMO.zh-CN.md">示范片说明</a> · <a href="https://github.com/neohoy/neo-cine/releases/download/films/atlas-scroll.mp4">下载 1080p</a></sub></td>
<td width="33%" valign="top"><a href="styles/scroll-map/STYLE.zh-CN.md"><img src="docs/frames/scroll-map.jpg" alt="舆图长卷"></a><br><b>03 · 舆图长卷</b><br>Scroll Map<br><sub>真实地图 · <i>Shenzhen, Unrolled</i> · 0:48</sub><br>一幅长卷沿着真实的深圳海岸展开：墨线勾出岸，青绿的山一座座立起来，朱砂的路从罗湖烧开，福田的高楼长成一层层的楼阁。<br><sub><a href="styles/scroll-map/STYLE.zh-CN.md">风格说明</a> · <a href="styles/scroll-map/DEMO.zh-CN.md">示范片说明</a> · <a href="https://github.com/neohoy/neo-cine/releases/download/films/scroll-map.mp4">下载 1080p</a></sub></td>
</tr>
<tr>
<td width="33%" valign="top"><a href="styles/transit-map/STYLE.zh-CN.md"><img src="docs/frames/transit-map.jpg" alt="地铁线路图"></a><br><b>04 · 地铁线路图</b><br>Transit Map<br><sub>交通 · <i>The River and the Ring</i> · 0:54</sub><br>一张印出来的八方向广州地铁图：从 1997 年白鹅潭江底的 5 个站开始，一条条线被拖出来，开通的线上一直有车在跑；11 号线把环合上，计数器落在 19 条线、779.9 公里。<br><sub><a href="styles/transit-map/STYLE.zh-CN.md">风格说明</a> · <a href="styles/transit-map/DEMO.zh-CN.md">示范片说明</a> · <a href="https://github.com/neohoy/neo-cine/releases/download/films/transit-map.mp4">下载 1080p</a></sub></td>
<td width="33%" valign="top"></td>
<td width="33%" valign="top"></td>
</tr>
</table>

<sub><b>真实地图</b>（02、03）：基于 OpenStreetMap（今天的地面）和 OpenHistoricalMap（历年的边界、铁路、路线）的系列：地图是真的，画法每个风格各不相同。</sub>

<sub><b>交通</b>（04）：真实的公共交通线网：线路取自 OpenStreetMap，开通日期和里程查运营方和政府的公开来源。</sub>
<!-- styles:end -->

## 👋 关于

我是 **NEO**（[@neohoy](https://github.com/neohoy)），这里是 NEO造物集的影片风格库。

> **一次只做一种风格。** 这里的每种风格都从空白开始做，配一支完成的短片和它的完整源码。

一种风格不是带参数的模板，而是一份文字说明，讲清一种画面、一种运动方式和一种声音，再配一支示范片。agent 读懂风格，为你的题目写自己的导演方案，然后写代码来导演、作画、配乐、混音：

- 🎨 **画面**：Canvas 和 WebGL 页面逐帧渲染
- 🎵 **配乐和动作音**：和画面用同一条时间线驱动
- 🎙️ **配音**：片子需要旁白时用语音合成

不用视频生成，也不用素材库画面。

## 怎么用

两种用法，推荐装成技能，最省事。

### 方式一：装成技能（推荐）

在终端里：

```sh
claude plugin marketplace add neohoy/neo-cine
claude plugin install neo-cine@neo
```

之后在任何目录都能用。

- 第一次使用时，它会把指南、工具和风格说明下载到 `~/neo-cine`，所有片子共用这一份。
- 每支片子的工程，从源码到成片，都放在你发起时所在的文件夹里。
- 其他 agent 可以把 [`plugin/skills/neo-cine/`](plugin/skills/neo-cine/) 复制到它们的技能目录。

### 方式二：克隆仓库

```sh
git clone https://github.com/neohoy/neo-cine.git
cd neo-cine
sh plugin/skills/neo-cine/scripts/setup.sh deps
```

然后在这个文件夹里启动你的 agent，让它读 [`AGENTS.md`](AGENTS.md)。片子做到仓库里的 `films/<名字>/`。

### 然后直接说

> 用**折叠城市**风格做一支 40 秒的片子，讲成都：春熙路、天府广场、金融城。

> 用**折叠城市**风格做一支 30 秒的竖屏片子，一栋楼一栋楼地带人逛我们的园区。

风格用中文名或英文名都行。

还没想好也没关系：装成技能的，输入 `/neo-cine:neo-cine` 直接启动。它先问你用什么语言，再问这次想做什么。

它开工前只问你一次：

- 主题里它定不了的事；
- 你有没有自己的**配音、音乐或其他素材**；
- 要不要先看**分镜**。要看的话，它会停一次，给你看用真实风格画出来的关键镜头；不看就直接做完成片。

agent 会读三份指南，像一个小工作室一样开工。<br>
指南是英文写给 agent 看的，旁边都有中文版（`X.zh-CN.md`）给人看；你用中文跟它说就行。

| 文件 | 给 agent 的东西 |
|---|---|
| [`DIRECTOR.md`](DIRECTOR.zh-CN.md) | 怎么导：故事、声音、节奏、镜头、表演、自检 |
| [`TECHNIQUE.md`](TECHNIQUE.zh-CN.md) | 怎么做：逐帧渲染、配音、配乐、混音 |
| `styles/<风格>/STYLE.md` | 这个风格长什么样、听起来什么样；故事由你定 |

每次交付都带版本号（`-v001`、`-v002`……）：成片、封面和导演方案。不覆盖旧版。

### 改成你自己的风格

把库里的风格改成只属于你的（你的配色、标志、字体、角色），或者从空白开始做一种：

> 我想把**折叠城市**改成我自己的版本。

> 从空白开始：黑板粉笔的风格，暖一点、慢一点。

它一次问一个问题，和你把要改的地方定下来，先出一张风格图，再做一支 15 到 30 秒的示范片，你说留才留。你自己的风格存在 `~/neo-my-styles/<名字>/`，库更新不会动它。agent 照着做的步骤写在 [`MY-STYLES.md`](MY-STYLES.zh-CN.md) 里。

### 开始之前

- 做一支片子对 agent 来说是实打实的活：要跑不短的时间，也要用不少 token。
- 需要先装好 Node 20 以上、ffmpeg 7 以上和 Python 3.11 以上（或 [uv](https://docs.astral.sh/uv/)），其余的 agent 会装。Ubuntu 24.04 自带的 ffmpeg 是 6.1，太旧，请用[静态构建版](https://johnvansickle.com/ffmpeg/)。
- 支持 macOS 和 Windows（Git Bash）；Linux 上做三维风格需要能用的显卡驱动。
- 默认输出 1920×1080、24 帧，其他尺寸可以提。

### 更新和卸载

更新后重启 Claude Code（`~/neo-cine` 里的库会在下次做片时自己更新）：

```sh
claude plugin marketplace update neo && claude plugin update neo-cine@neo
```

卸载后再删掉 `~/neo-cine`：

```sh
claude plugin uninstall neo-cine@neo
```

`~/neo-my-styles/` 里你自己的风格，更新和卸载都不会动；不想要了自己删掉那个文件夹。

哪一步卡住了，[提一个 issue](https://github.com/neohoy/neo-cine/issues)。

## Star 增长

<a href="https://www.star-history.com/#neohoy/neo-cine&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=neohoy/neo-cine&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=neohoy/neo-cine&type=Date" />
   <img alt="Star 增长曲线" src="https://api.star-history.com/svg?repos=neohoy/neo-cine&type=Date" />
 </picture>
</a>

## 感谢与声明

- **感谢 Lemomo（[@lemomo_ai](https://x.com/lemomo_ai)），一位很有才华的设计师。** NEO-Cine 的框架参考了他的技能 [Lemo-Opuscar](https://github.com/lemomo-ai/lemo-opuscar)，风格是我们自己做的。
- **感谢 Yuma Garments（[@garments__](https://x.com/garments__)）。** 折叠城市的想法来自这位作者的错视动画。只学手法，没有使用原作的任何画面。
- **许可**：[MIT](LICENSE)。你用这个库做出来的片子归你自己。

---

<div align="center">

⭐ **点个星**<br>
👀 **Watch → Custom → Releases**，有新风格会通知你

<sub>NEO造物集 · by neohoy</sub>

</div>
