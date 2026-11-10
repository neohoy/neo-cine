# 维护风格库

*本文是 [MAINTAINING.md](MAINTAINING.md) 的中文版，以英文版为准。改编自 [Lemo-Opuscar](https://github.com/lemomo-ai/lemo-opuscar)（MIT，© 2026 LemoLab），上游提交 9eb7739，见 UPSTREAM.md。*

**仅供仓库所有者使用。** 如果你是在给用户做片子，回到 [`AGENTS.zh-CN.md`](AGENTS.zh-CN.md)：这里的内容都不适用。

## 添加一种风格

在 `styles/<slug>/` 里工作（小写字母、数字、连字符；不能重名）。从 `styles/_template/` 里的模板开始。

| 文件 | 内容 |
|---|---|
| `style.json` | 唯一的元数据来源：`slug`、`num`、`en`、`cn`、`category_en`、`category_cn`、`film`、`line`、`line_cn`、`uses`、`frame_sec`、`dur` |
| `STYLE.md` | 只写这种风格不变的部分：画风、材质与渲染、色彩逻辑、字体、运动、镜头语法、声音配置、这种媒介的易错点、招牌动作、可变化的范围。不写故事、起伏、节拍表、时长或片尾卡。结尾链接到 `DEMO.md` |
| `DEMO.md` | 开头写“One example among many. Don't reuse its story, arc, shots, props or timings.”，然后是示范片的故事和结构、镜头表、配乐结构、配色和道具、片尾卡、构建说明和代码入口；场景型风格还要写 `content.json` 的字段 |
| `demo/` | 源码、一条命令就能跑的 `build.sh` 和 `CREDITS` 提交进仓库，供代理阅读。`TREATMENT.md`、`PRODUCTION_LOG.md`、字体、音频、贴图和模型留在本地（已被 git 忽略）；`CREDITS` 写明每一项素材，方便以后找回；`build.sh` 先下载字体（例如 `demo/tools/fonts.sh`：同样的文件，地址固定到某次提交或某个版本），这样新克隆的仓库也能构建 |
| `demo/stills/` | 文档里链接到的样帧（`styleframe.jpg` 是风格图） |
| `<slug>.mp4`、`<slug>.srt`、`poster.jpg` | 1080p 成片、有人声时的字幕、海报 |

素材只用 CC0、CC BY 或 OFL 授权的，每一项都写进 `demo/CREDITS`。任何片子都不加水印。真实的人物、品牌和事件只出现在非官方的爱好者影片里，并且它的 `DEMO.md` 要写明这一点。

只适用于库内示范片的规则（用户的片子按 `DIRECTOR.md` 来，不按这些）：

- **双语字幕，每种语言一行。** 每条字幕一行中文、一行英文，不折行。一行太长时，拆成两条字幕。
- **做比较时，先停住再下结论。** 片子比较几个选项时（四座桥、三个方案），每个选项都要完整入画并停留至少 2.5 秒，再给出评判，让观众看得清。

## 登记

1. **编号。** `style.json` 里的 `num` 取 `styles/*/style.json` 中最大编号之后的下一个空号（两位数字的字符串，例如 `"02"`）；它决定风格在同一分类里的排列顺序。
2. **列入清单。** 目前还没有构建脚本，所以要手工添加：加到 `AGENTS.md` 和 `AGENTS.zh-CN.md` 的风格列表里（在 `style-list` 标记之间：把风格写到它的分类下，更新该分类的数量和总数），再加到 `README.md` 和 `README.zh-CN.md` 里。英文文件和中文文件一起改。

## 关卡

- **人工：** 开始制作前确认风格图，完成后确认成片。
- **机器：** `asr_check.py` 每一句都通过；`mux.sh` 报告响度约 −14 LUFS 且没有警告；`readcheck.mjs` 通过。
- **地图：** 库内示范片和其他片子一样遵守 DIRECTOR.md §13：每个地图镜头都放大检查，地图数据和所用视图写进 `CREDITS`。
- **真实事件和产品：** 画面上和旁白里的每一条事实都来自官方来源，记在 `demo/FACTS.md` 里（说法、网址、原文引用）；最后一次渲染前，拿定稿的旁白稿对照检查。

## 修订一种风格

先备份：把旧的成片、字幕和海报带上版本号移到仓库之外（`<slug>-v001.mp4`、`<slug>-v001.srt`、`poster-v001.jpg`……；先看已有的备份，取下一个号），不放进 git，也绝不删除。然后重新渲染，替换 `<slug>.mp4`、`<slug>.srt` 和 `poster.jpg`。

## 跟随上游

NEO-Cine 建立在 [Lemo-Opuscar](https://github.com/lemomo-ai/lemo-opuscar) 的框架之上，并保持容易和它对比，这样上游以后的改动可以吸收进来。

- **`core/` 是原样镜像**，对应上游的 `core/`。绝不在这里改它：工具名、参数和 `LEMO_*` 环境变量都和上游完全一致。NEO 自己的工具放在 `neo/`。
- **`UPSTREAM.md`** 记录所镜像的上游提交，以及哪些部分是原样镜像、哪些部分是改编的。
- **`sh tools/sync-upstream.sh`** 和更新的上游做对比，报告从那次提交以来上游改了什么：哪些 `core/` 文件需要复制过来，哪些指南的改动需要人工审阅（它的选项见 `UPSTREAM.md`）。各份指南是改编稿，章节、顺序和编号都和上游一致：上游的改动要手工并入，放在相同的位置。
- **同步之后**，重新构建 Folding City（折叠城市）示范片的样帧作为回归检查。
- **两种语言。** 每份文档都有 `X.md`（英文，正本，代理读的就是它）和 `X.zh-CN.md`（中文译本）。两份要在同一次改动里一起更新。
