# 上游

*本文是 [UPSTREAM.md](UPSTREAM.md) 的中文版，以英文版为准。*

NEO-Cine 建在 [Lemo-Opuscar](https://github.com/lemomo-ai/lemo-opuscar)（MIT，© 2026 LemoLab）的框架上：它的页面约定、制作工具、风格目录格式，以及“用指南而不是参数来导演一支片子”的做法。风格是 NEO 自己一个个做的。

Upstream commit: `9eb7739a0fca4c6990fe966cb8b87b1930f7193a` (2026-11-10)

## 原样镜像的部分（不要在这里改）

这些文件和上游在上面那个提交时一模一样。`sh tools/sync-upstream.sh` 会检查它们是否仍然一致，加 `--apply` 会用更新的上游版本替换它们。

| 路径 | 是什么 |
|---|---|
| `core/` | 制作工具：页面约定、渲染、合成、文字停留检查、音效、采样器、配音 |
| `package.json`、`package-lock.json` | 工具需要的 Node 包（包名保持上游的） |
| `requirements.txt`、`requirements-voice.txt`、`requirements-music.txt` | 几档 Python 依赖 |
| `tools/fetch.sh`、`tools/assets.json` | 从上游的发布页下载大素材（乐器采样库、配音模型） |
| `styleboard/frames.sh`、`tools/web_cuts.sh`、`.github/workflows/pages.yml` | 画廊的辅助脚本：取风格卡片的图、压 720p 网页版、GitHub Pages 的构建流程 |
| `LICENSES/lemo-opuscar-MIT.txt` | 上游的 `LICENSE` |

因为 `core/` 不改，里面的名字都保持上游的：`LEMO_ANGLE`、`LEMO_COLOR` 等 `LEMO_*` 环境变量，以及标记文件 `.lemo-ok`、`.lemo-<档位>`、`.lemo-deps.lock`。NEO 自己的工具放在 `neo/`。

## 改编的部分（是我们的，但贴着上游写）

结构、标题和编号与上游文件一致，这样以后上游改了什么，可以直接看差异，再手工带过来。

| 我们的文件 | 改编自 | 改了什么 |
|---|---|---|
| `AGENTS.md`、`DIRECTOR.md`、`TECHNIQUE.md`、`MY-STYLES.md`、`MAINTAINING.md` | 上游的同名文件 | 品牌和路径；NEO-Cine 自己的风格列表和画廊地址；发布走 `neo/publish.sh`；加了“交付物升版不覆盖”和“按 BT.709 出片”两条 |
| `plugin/skills/neo-cine/SKILL.md`、`scripts/setup.sh` | `plugin/skills/lemo-opuscar/` | 品牌、仓库地址、默认目录（`~/neo-cine`）、`NEO_CINE_HOME` / `NEO_CINE_REPO`、稀疏检出的规则 |
| `styles/_template/` | `styles/_template/` | 落版那一句 |
| `styleboard/build.py`、`styleboard/template.html` | 上游的同名文件 | 仓库和站点地址；去掉了上游的主打影片、风格大公开和感谢片页面，风格表格上方的主打位改为最新的风格；页面外观是 NEO-Cine 自己的；中文 README 的风格表格链接到 `STYLE.zh-CN.md`；风格列表也写进 `AGENTS.zh-CN.md` |
| `neo/publish.sh` | `tools/publish.sh`、`tools/release.py` | 只上传成片和网页版：上游的脚本还会重新打包它的素材包并改写 `tools/assets.json`，而这个文件在这里是镜像 |

`styleboard/index.html`、`styleboard/catalog.json`、`styles/README.md`、两份 README 里的风格表格，以及 `AGENTS.md` 和 `AGENTS.zh-CN.md` 里的风格列表，都由 `styleboard/build.py` 生成。

每份改编的文档旁边都有中文版（`X.zh-CN.md`）。代理读英文版；两份要在同一次修改里一起改。

## 没有带过来的部分

上游的风格和它们的示范片，它的主打影片、风格大公开、感谢片及其页面，`docs/` 里它的 README 配图，发布检查和素材打包工具（`tools/release.py`、`tools/publish.sh`），以及目录版的工具。NEO-Cine 还没有示范的手法（笔刷引擎、角色、配音、采样配乐），可以去上游的库里学。

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
