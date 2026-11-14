# 手账歌谣 — 制作手册

*English: [PRODUCTION.md](PRODUCTION.md)*

这个风格的片子怎么从用户的**歌和带时间的歌词**做出来，只用本库：[`kit/`](kit/) 里的工具包（把镜头画成 SVG 的 Python、播放它们的页面、命令行工具），加上库的 `core/` 和 `neo/` 工具。画风和规则在 [`STYLE.zh-CN.md`](STYLE.zh-CN.md)；这份文件是做的顺序。对这个风格，它代替 AGENTS.md 里的处理方案和分镜两步：意象表和镜头表就是处理方案，要请用户确认（下面三个确认点是这个风格的一部分，不能省）。

所有命令都在库的根目录跑（技能模式下是 `$LIB`）。`<P>` 是片子的工程文件夹（AGENTS.md「Where things go」：克隆模式是 `films/<名字>/`，技能模式是用户文件夹里的 `<名字>/`；不放进 `styles/`）。`K=styles/scrapbook-song/kit`。Python 用库的 `.venv/bin/python`（`PY`）。

## 0. 简报

按 AGENTS.md「Workflow」一次问清请求里没说的：

- **歌**（mp3、wav、m4a）和**带时间的歌词**：最好是 LRC（音乐平台和生成歌曲的工具都会给）；一张开始时间表也行；两样都没有，就用 faster-whisper 转写人声（voice 档，TECHNIQUE.md §4），再按用户给的歌词手工改字。
- **整首还是一段**（哪一段：一遍副歌、最后一分钟）。
- **简体还是繁体**（默认简体；繁体是台湾正体）。
- **一句话主题**：谁在唱、发生了什么。用户没给，就在同一条消息里从歌词提一版。
- **歌怎么署名**：歌名、谁写、谁唱。

画面 1920 × 1080，24 fps。没有旁白，不加配乐：歌就是声音，歌词就是字幕。

## 1. 建工程

```sh
$PY $K/tools/new_project.py <P> song.mp3 lyrics.lrc --title 歌名 --artist 演唱 --year 2026 [--script zh-Hant] [--name 文件名前缀]
```

它会把歌复制到 `audio/`，写 `mv.json`、模板（`scripts/scenes/_template.py`、`scripts/assets/_example.py`、`design/imagery.md`）和一份 `CREDITS` 初稿，下载四种 OFL 字体（`out/fonts-src/`），分析这首歌（`data/audiomap.json`），导入歌词（`data/lyrics.json`）。繁体片要在工程里装 OpenCC：`$PY -m pip install --target <P>/.pylib opencc-python-reimplemented`。

| `mv.json` 字段 | 意思 |
|---|---|
| `title`、`artist`、`year` | 作品信息；可以出现在片子里画出来的片名页上 |
| `script` | `zh-Hans` 或 `zh-Hant`：镜头写出时所有字统一转换 |
| `name` | 成片文件名前缀（`<name>-v001.mp4`） |
| `audio`、`audio_t0` | 歌的文件；它第一个采样在全曲里是第几秒（整首歌为 0，片段文件为它的起点） |
| `audiomap`、`lyrics` | `data/audiomap.json`（拍点、强拍、鼓点、能量）、`data/lyrics.json`（一句一条：开始、结束、文字） |
| `range` | `[从, 到]`，全曲秒数：片子覆盖歌的哪一段（null = 第一个镜头的起点到最后一个镜头的终点） |
| `fade` | 片段两头淡入淡出的秒数 `[入, 出]`（默认 `[0.25, 2.6]`） |
| `scenes` | 镜头表：`{"id", "start", "end", "builder": "scripts/scenes/<id>.py", "args": []}`，全曲秒数，首尾相接铺满 `range` |
| `hits` | 额外的重拍 `{name, t}`（全曲秒数），供重拍核对；镜头里用 `sc.hit()` 登记自己的 |
| `pass_texts` | `{镜头 id: [文字, …]}`：不要求读完的字（一闪而过的道具）；旁边写明为什么 |
| `poster` | 海报取片中第几秒 |

脚本里的时间一律是**全曲秒数**；页面的时间是 `全曲时间 − range[0]`。

## 2. 读歌

- `data/audiomap.json` 由 `$PY $K/tools/analyze.py <P>` 写（numpy 和 scipy：动态规划求节拍网格、强拍、分频段的鼓点、能量段）。它会打印强拍、能量段和强鼓点：拿它们和歌词时间把歌切成前奏、主歌、导歌、副歌、桥段、尾奏。
- `$PY $K/tools/lyrics.py <P> --show` 把每句和最近的强拍并排打出来。LRC 没有结束时间：一句在下一句开始前 0.2 秒结束；长音拖得久的、后面接间奏的，在 `lyrics.json` 里手改 `end`（阅读规则按 `end` 算）。
- `$PY $K/tools/repeats.py <P> <开始> <结束>` 找一段在哪儿重复（得分 ≥ 0.4 是同一段旋律）。一遍副歌每句的时间差都一样，就可以把这一遍的镜头搬到另一遍，换上各自的歌词（一个脚本，两条记录，`args` 不同）。逐句核对时间差：对不上的那句，多半是时间戳错了。
- 要紧的地方拿歌核对一下分析：强拍的相位、落在鼓点上的砸字。鼓点清楚的歌，分析能准到几毫秒；鼓的分类（kick、snare）很粗，挑重拍以 `energy` 为主。

## 3. 从字到画，素材表

填 `design/imagery.md`（STYLE.zh-CN.md §1 和 §4）：

- **全片：** 主题、谁在唱（年龄、衣服、一个标志色）、母题和它的方向、地点、底色顺序。
- **逐句：** 具体的名词、地点、动作、时刻；**画面里至少有一样东西直接来自这句话**；抽象词找一个能画的替身（不画心、地球、光束）；这句写在哪种载体上（STYLE.zh-CN.md §4 的表）。
- 真实的地方、当地的吃的，照它真实的样子画：先查；查不到确切样子就不画。

这首歌自己的角色和道具写成 `<P>/scripts/assets/*.py` 里的函数（照 `_example.py`）：每样东西围着自己的原点画，用 `kit/draw.py` 的铅笔（`person_front`、`person_side`、`person_back`、`bike`、天气、植物、建筑）和工具包的色板，每个模块在 `SHEET` 里列出要展示的样子。然后

```sh
$PY $K/tools/asset_sheet.py <P>          # → <P>/design/asset-sheet.jpg（一页 8 件）
```

逐件看：比例对不对、墨线有没有断、同一个角色换了姿势和年龄还是不是同一个人、每件道具能不能一眼认出是歌词里那样东西。

## 4. 分镜——确认点 1

把歌（或那一段）切成镜头，写进 `mv.json` 的 `scenes`：

- 一个镜头约两句、9–10 秒，一句一组，组之间用风带换；一串很短的句子可以合成一个镜头（四格漫画），很长的一句可以单独一个。
- 切点在下一句开唱前约 0.2 秒，或者落在强拍上。镜头首尾相接铺满 `range`。
- 纯音乐的小节不能空着：这首歌里东西的陈列、撕页日历、只有母题（STYLE.zh-CN.md §8）。
- 相邻的底色拉开；钩子用最饱和的底色。

在工程里写 `STORYBOARD.md`：一个镜头一行，写时间、段落、歌词、画面、字写在哪。**把素材表和分镜一起给用户看，等用户确认。** 用户要改的素材，先改好再写镜头。

## 5. 镜头

一个镜头一个脚本，`scripts/scenes/<id>.py`，从 `_template.py` 复制：

```python
from scene import *; from draw import *; import typo
from cast import *                          # 这首歌自己的画（scripts/assets/cast.py）
sc = Scene("s02-dusk", bg=PAPER)            # 起止从 mv.json 取；元素 id 前缀是 "s02"
...  body = ga + gb + sc.band("mid", NIGHT, YEL); sc.band_through("mid", GB); sc.write(body)
```

| 写法 | 作用 |
|---|---|
| `Scene(id, p=None, bg)` | 读这个镜头的起止；`sc.L(t)` 把全曲时间换成给脚本用的镜头内时间 |
| `typo.label_line(sc, key, li, x, y, size, i=…)` 等载体 | 第 `li` 句歌词，按音节逐字打出（STYLE.zh-CN.md §4） |
| `typo.slam(sc, key, text, x, y, size, times)` | 钩子在拍点上砸下（一个镜头一处） |
| `sc.chars` / `sc.pop_chars` / `sc.line` | 底层逐字排字（优先用载体） |
| `sc.blow_chars(key, n, origins, t)`、`typo.blow_off` | 风把一句吹走，只能在唱完之后 |
| `sc.band(name, colour)` + `band_in` / `band_out` / `band_through` | 风带转场 |
| `sc.group`、`sc.wob`、`sc.wobT`、`sc.grain`、`tag(*sc.page())` | 分组、抖线、纸纹、页码 |
| `sc.show` / `sc.hide(选择器, t)`；`sc.js.append("tl.fromTo(…)")` | 直接写时间轴；时间先过 `sc.L()` |
| `sc.hit(name, t)` | 必须落在音乐上的重拍（第 7 步核对） |
| `music.beats(t0, t1)`、`music.downbeats`、`music.half_beats()`、`music.hits(t0, t1)`、`music.syllables(i)` | 歌的节拍网格 |

时间轴脚本里：`q(ease, d)`（所有画出来的补间，一拍两张）、`pop`、`cycle`（换画）、`jitter`（一步步的飘动）、`bump`、`drawOn`、`blowAway`。跳帧安全的规矩（STYLE.zh-CN.md §9）：一个元素一个变换原点；大位移放外层或者用算好的 `transform` 属性；被补间的元素自己不带 transform；脚本里不放随机数和时钟（在 Python 里用固定种子）；每个数先在 Python 里算好。

```sh
$PY $K/tools/build.py <P> s02-dusk          # → <P>/scenes/s02-dusk.html（以及 manifest 和页面文件）
$PY $K/tools/fonts.py <P>                   # 按印出来的字切字体子集；缺字就停
sh $K/tools/preview.sh <P> 12.4,15.0,18.2    # 全曲时间 → <P>/out/preview.jpg（REMOTE=1：在渲染台式机上截）
```

每个镜头写完先预览再写下一个：开场、每组中间、每句写完的那一刻、结尾。看有没有字被挡住或切掉、构图太空、东西露在画面边上、母题方向反了。

## 6. 样片——确认点 2

先做一两个代表镜头（一个主歌镜头和第一遍副歌），带着音乐渲出来：

```sh
SAMPLE=s02-dusk,c1-gust sh $K/tools/make.sh <P> v001      # → <P>/<name>-sample-v001.mp4（台式机加 RENDER=remote）
```

**把样片给用户看，等画风和节奏确认了**，再画其余的镜头。

## 7. 整片——确认点 3

所有镜头都有了以后：`$PY $K/tools/build.py <P>`（全部重建，免得有镜头是旧的），在镜头交界处再预览一遍。**渲染前告诉用户要等多久：** 帧数 = 片长秒数 × 24；渲染台式机 4 个 worker 约每秒 12 帧（一首 3 分半的歌约 7 分钟，再加一两分钟编码和传回），较新的 Mac 3 个 worker 约每秒 5–8 帧。

```sh
RENDER=remote sh $K/tools/make.sh <P> v001       # → <P>/<name>-v001.mp4 和 <P>/poster-v001.jpg
```

`make.sh` 依次：生成镜头、切字体、导出事件、截歌（`tools/mix.py`：淡入淡出、每个重拍对歌的拍点和鼓点、−14 LUFS）、渲染、合成，再跑 `readcheck`（歌词以外的字）和 `lyriccheck`（歌词：每句在唱完时必须已完整；停得短的句子给出注意项）。然后检查：整片缩略图（每 2 秒一帧）、每个切点、`mux.sh` 打出的响度、lyriccheck 的注意项。每次重做都是新版本（`v002`……）。

## 8. 交付

DIRECTOR.md §11：`<name>-vNNN.mp4`、`poster-vNNN.jpg`、`CREDITS`（歌按用户要的方式署名、字体、工具；把初稿补完整）、`STORYBOARD.md` 和意象表。用户的片子不署 NEO-Cine，也不用我们的片尾卡；片子里画出来的片名页写歌名和演唱者，那是用户自己的。

## 出了问题

- **镜头停在第一帧的样子，或者风带盖满了画面：** 有 Python 表达式被当成文字写进了 JS（页面里报 `ReferenceError`）：先在 Python 里算出结果。
- **不同机器渲出来的帧里画面跳动：** 有跳帧不安全的补间（STYLE.zh-CN.md §9）；被补间的元素自己带 transform 时，`gsap-lite.js` 会在控制台警告。
- **`fonts.py` 报缺字：** 换个说法；繁体片检查所有字是不是都经过了 `script` 转换。
- **重拍核对没过：** 手写的重拍时间不在拍点或鼓点上；改用 `music.beats()` / `music.hits()`，或者对着波形核对分析结果。
- **`lyriccheck` 判某句不合格：** 它在唱完之前还没写完：早一点开始，换一个写得快的载体，或者挪切点。
