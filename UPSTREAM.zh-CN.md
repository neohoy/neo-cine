# 上游

*本文是 [UPSTREAM.md](UPSTREAM.md) 的中文版，以英文版为准。*

NEO-Cine 建在 [Lemo-Opuscar](https://github.com/lemomo-ai/lemo-opuscar)（代码 MIT，© 2026 SecondFirst Pty Ltd，即 LemoLab；见下文“许可”）的框架上：它的页面约定、制作工具、风格目录格式，以及“用指南而不是参数来导演一支片子”的做法。风格是 NEO 自己一个个做的；其中地铁线路图（Transit Map）改编自上游的一个风格（见下表）。

Upstream commit: `8ca0dd805e214bcc1d30714cd5b9d21cc02a454b` (2026-11-23)

## 原样镜像的部分（不要在这里改）

这些文件和上游在上面那个提交时一模一样。`sh tools/sync-upstream.sh` 会检查它们是否仍然一致，加 `--apply` 会用更新的上游版本替换它们。

| 路径 | 是什么 |
|---|---|
| `core/` | 制作工具：页面约定、渲染、合成、文字停留检查、音效、采样器、配音，以及通过 Codex CLI 生图（`core/image/gen_image.py`） |
| `package.json`、`package-lock.json` | 工具需要的 Node 包（包名保持上游的） |
| `requirements.txt`、`requirements-voice.txt`、`requirements-music.txt` | 几档 Python 依赖 |
| `tools/fetch.sh`、`tools/assets.json` | 从上游的发布页下载大素材（乐器采样库、配音模型） |
| `styleboard/frames.sh`、`tools/web_cuts.sh` | 画廊的辅助脚本：取风格卡片的图、压 720p 网页版 |
| `LICENSES/lemo-opuscar-MIT.txt` | 上游的 MIT 文本和版权行（不再镜像：上游从 2.0.0 起，`LICENSE` 变成了几种许可的总说明，见“许可”） |

因为 `core/` 不改，里面的名字都保持上游的：`LEMO_ANGLE`、`LEMO_COLOR` 等 `LEMO_*` 环境变量，以及标记文件 `.lemo-ok`、`.lemo-<档位>`、`.lemo-deps.lock`。NEO 自己的工具放在 `neo/`。

## 改编的部分（是我们的，但贴着上游写）

结构、标题和编号与上游文件一致，这样以后上游改了什么，可以直接看差异，再手工带过来。

| 我们的文件 | 改编自 | 改了什么 |
|---|---|---|
| `AGENTS.md`、`DIRECTOR.md`、`TECHNIQUE.md`、`MY-STYLES.md`、`MAINTAINING.md` | 上游的同名文件 | 品牌和路径；NEO-Cine 自己的风格列表和画廊地址；发布走 `neo/publish.sh`；加了“交付物升版不覆盖”和“按 BT.709 出片”两条 |
| `plugin/skills/neo-cine/SKILL.md`、`scripts/setup.sh` | `plugin/skills/lemo-opuscar/` | 品牌、仓库地址、默认目录（`~/neo-cine`）、`NEO_CINE_HOME` / `NEO_CINE_REPO`、稀疏检出的规则 |
| `styles/_template/` | `styles/_template/` | 落版那一句 |
| `styleboard/build.py`、`styleboard/template.html` | 上游的同名文件 | 仓库和站点地址；去掉了上游的主打影片、风格大公开和感谢片页面；表格上方没有主打位，也没有分类标签：画廊和两份 README 的表格都按编号把每个风格展示一次；页面外观是 NEO-Cine 自己的；中文 README 的风格表格链接到 `STYLE.zh-CN.md`；风格列表也写进 `AGENTS.zh-CN.md` |
| `styles/transit-map/` | 上游的 `styles/transit-map/`（每个改编的文件都保留了 MIT 声明） | 新的示范片（广州地铁，取自 OpenStreetMap，`net.js` 由 `tools/prep.py` 生成：在骨架上解八方向布局、核心区手工钉点、每处过江都和真实轨道核对）；线更粗（0.15→0.22 G，圆角更大，终点有一根会弹出的横杠）；拖线逐站缓动，笔尖前有引线，每个拐角有弹簧过冲（`snap` 事件）；换乘站弹簧弹出（0.25→1.3→1），后来的线经过时再弹一下；每段已开通的区间上都有示意列车（`service()`），墨色胶囊逐站缓进缓出、停站，停靠的车站轻轻一跳；纸更安静，暗角更轻；汇流处的水画成一整片；环线最后一站改取路径终点（上游的环线画不出来）；钩子扩展（`roundelPos` 可以是函数，`highlight` 能拿到 drawSpan 和 PH，`trains`）；新事件 pass、snap、term；搪瓷铭牌加滚筒换成轻巧的纸卡（数字滑动，每个值标出日期）；站名更少、按镜头挑；配乐经 `neo/audio` 合成（每条线一种音色，每站一个五声音阶的音），不再用采样管弦乐叠层；24 fps；`build.sh` 按版本号构建 |
| `.github/workflows/pages.yml` | 上游同名文件，9eb7739 那一版 | 停在那一版：上游从 2.0.0 起用它构建新网站（`styleboard/pages.py`、`site-media` 发布、影片仓库、`check_site.py`），我们的画廊没有这些 |
| `neo/publish.sh` | `tools/publish.sh`、`tools/release.py` | 只上传成片和网页版：上游的脚本还会重新打包它的素材包并改写 `tools/assets.json`，而这个文件在这里是镜像 |

`styleboard/index.html`、`styleboard/catalog.json`、`styles/README.md`、两份 README 里的风格表格，以及 `AGENTS.md` 和 `AGENTS.zh-CN.md` 里的风格列表，都由 `styleboard/build.py` 生成。

每份改编的文档旁边都有中文版（`X.zh-CN.md`）。代理读英文版；两份要在同一次修改里一起改。

## 没有带过来的部分

上游的其他风格和它们的示范片，它的主打影片、风格大公开、感谢片及其页面，`docs/` 里它的 README 配图，它 2.0.0 的新网站（`styleboard/pages.py`、`home.py`、`check_site.py`、`site-media` 发布和影片仓库），发布检查和素材打包工具（`tools/release.py`、`tools/publish.sh`），以及目录版的工具。NEO-Cine 还没有示范的手法（笔刷引擎、角色、配音、采样配乐），可以去上游的库里学。

## 许可

上游从 2.0.0（2026-11-12）起分开授权：代码（`core/`、`tools/`、`styleboard/`、`plugin/`、各 demo 的代码）用 MIT；所有 Markdown 文件（各份指南、各风格的 `STYLE.md` 和 `DEMO.md`）以及生图提示词用 CC BY-NC 4.0（不可商用）；示范片和样帧用 CC BY 4.0。Clawd 以及第三方的界面、名字和标志（Claude、GPT 等）不在任何授权之内。2.0.0 之前发布的版本保持原来的许可。

NEO-Cine 是 MIT，所以：

- **代码**照旧镜像或改编，保留 MIT 声明。
- **我们改编的指南**来自上游 9eb7739（2.0.0 之前，MIT）的那一版，仍是 MIT。上游在 2.0.0 之后对指南的改动，整段、片段都不复制：觉得思路值得要，就用我们自己的话、按我们自己的结构写。上游的 `STYLE.md`、`DEMO.md` 和提示词同样如此。
- **角色和商标**：本库示范片里出现真实产品的名字（比如拟人 MV 的 Claude 娘、Codex 娘），按非官方同人片处理，在 `DEMO.md` 和 `CREDITS` 里写明，不画官方标志和官方界面。

## 兼容性

下面这些特意和上游保持一致，工具和风格才能两边通用：

- 页面约定（`window.READY`、`window.render(t)`、`window.DUR`、`window.EV`、`window.TEXTS`）；
- 风格目录（`style.json` 的字段、`STYLE.md` 的章节、`DEMO.md`、带一条命令 `build.sh` 和 `CREDITS` 的 `demo/`）；
- 用户自己的风格的存放格式（`~/neo-my-styles/<slug>/` 里的文件和上游的 `~/lemo-my-styles/<slug>/` 相同）；
- 工程目录的规则和命令（`node core/…`、`sh core/render/mux.sh …`）。

## 跟上游更新

```sh
sh tools/sync-upstream.sh                 # 上游从记录的提交之后改了什么（会把上游克隆到临时目录）
sh tools/sync-upstream.sh <clone>         # 同上，用你已有的上游克隆
sh tools/sync-upstream.sh <clone> --apply # 把镜像文件拷过来，并记下新的提交
```

报告会列出改动过的镜像文件（`--apply` 会拷）和改动过的上游指南（读差异，再手工改我们的英文版和 `.zh-CN.md`）。`--apply` 之后重新装依赖，再重出折叠城市的样帧做回归检查（见 `MAINTAINING.md` 的 “Following upstream”）。
