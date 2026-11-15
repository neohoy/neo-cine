#!/bin/sh
# 一条命令重做方寸影像 Isle Film 的示范片《雪落寒山》Snowfall Peak（拍 NEO-Isle 的第二境，world.js 复制自 NEO-Isle）：
#   sh styles/isle-film/demo/build.sh v002            （在库的根目录或任何目录都行）
#   RENDER=remote sh styles/isle-film/demo/build.sh v002     画面在渲染台式机上渲（neo/render/remote.sh，4 个 worker）
# 示范片本身就是一个方寸影像工程（film.json），用的是和用户的片子同一套工具包：../kit/tools/make.sh 生成页面、切字体、
# 导出画面事件、合成声音（卡点核对、−14 LUFS）、渲染、合成、读字检查、出海报（制作手册 ../PRODUCTION.md）。
# 成片写到 styles/isle-film/isle-film-<ver>.mp4，旁边是 poster-<ver>.jpg，已有的版本绝不覆盖。
# 画廊用的 isle-film.mp4 和 poster.jpg 是你选定那一版的副本：这里只在它们还不存在的时候才复制；风格帧同理。
set -e
VER=${1:?usage: sh build.sh v002   (取下一个没用过的号：ls styles/isle-film/*.mp4)}
D="$(cd "$(dirname "$0")" && pwd)"; S="$(cd "$D/.." && pwd)"; R="$(cd "$S/../.." && pwd)"
[ ! -e "$S/isle-film-$VER.mp4" ] || { echo "✗ isle-film-$VER.mp4 已经存在：换下一个版本号"; exit 1; }
OUTDIR="$S" sh "$S/kit/tools/make.sh" "$D" "$VER"
cd "$R"
FS=$(.venv/bin/python -c "import json;print(json.load(open('$S/style.json'))['frame_sec'])")
echo "== 风格帧（片中 $FS 秒：入夜，冰下的光已经亮起，镜头还停在冰面上）"
if [ "$RENDER" = remote ]; then sh neo/render/remote.sh "$D" --times "$FS" --stills "$D/out/stills" >/dev/null; SF="$D/out/stills/t_$FS.jpg"
else node core/render/still.mjs "$D" "$FS" --prefix sf_ --out "$D/out/stills" >/dev/null; SF="$D/out/stills/sf_$FS.jpg"; fi
[ -e "$D/stills/styleframe.jpg" ] || { mkdir -p "$D/stills"; cp "$SF" "$D/stills/styleframe.jpg"; }
[ -e "$S/isle-film.mp4" ] || cp "$S/isle-film-$VER.mp4" "$S/isle-film.mp4"
[ -e "$S/poster.jpg" ] || cp "$S/poster-$VER.jpg" "$S/poster.jpg"
echo "done: $S/isle-film-$VER.mp4"
