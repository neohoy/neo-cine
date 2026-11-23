#!/bin/sh
# 一条命令重做拟人 MV Persona Pop 的示范片《一起跑通》（非官方同人片，见 DEMO.md 开头）：
#   sh styles/persona-pop/demo/build.sh v002                   （在库的根目录或任何目录都行）
#   RENDER=remote sh styles/persona-pop/demo/build.sh v002     画面在渲染台式机上渲（neo/render/remote.sh）
# 示范片本身就是一个拟人 MV 工程（mv.json、cast.json、scenes.js），用的是和用户的片子同一套工具包：../kit/tools/make.sh
# 排逐字歌词、抠图、切字体、导出事件、混音（合成伴奏和主旋律、事件音效、卡点、−14 LUFS）、渲染（1080×1920，30 fps）、合成、读字检查、出海报。
#
# 立绘：assets/chars/*.webp（抠好的透明底）进 git；洋红底原图 cast/raw/*.png 不进 git（28 MB）。有原图时 key.py 会重新抠，
# 没有时直接用 assets/chars/。原图怎么出的：cast.json 的 make 表（提示词和参考图），用 ../kit/tools/cast.py 调 Codex 的 image_gen。
# 成片写到 styles/persona-pop/persona-pop-<ver>.mp4，旁边是 poster-<ver>.jpg，已有的版本绝不覆盖。
# 画廊用的 persona-pop.mp4 和 poster.jpg 是你选定那一版的副本：这里只在它们还不存在的时候才复制；风格帧同理。
set -e
VER=${1:?usage: sh build.sh v002   (取下一个没用过的号：ls styles/persona-pop/*.mp4)}
D="$(cd "$(dirname "$0")" && pwd)"; S="$(cd "$D/.." && pwd)"; R="$(cd "$S/../.." && pwd)"
OUTDIR="$S" sh "$S/kit/tools/make.sh" "$D" "$VER"
cd "$R"
FS=$(.venv/bin/python -c "import json;print(json.load(open('$S/style.json'))['frame_sec'])")
echo "== 风格帧（片中 $FS 秒）"
node core/render/still.mjs "$D" "$FS" --size 1080x1920 --prefix sf_ --out "$D/out/stills" >/dev/null
[ -e "$D/stills/styleframe.jpg" ] || { mkdir -p "$D/stills"; cp "$D/out/stills/sf_$FS.jpg" "$D/stills/styleframe.jpg"; }
[ -e "$S/persona-pop.mp4" ] || cp "$S/persona-pop-$VER.mp4" "$S/persona-pop.mp4"
[ -e "$S/poster.jpg" ] || cp "$S/poster-$VER.jpg" "$S/poster.jpg"
echo "done: $S/persona-pop-$VER.mp4"
