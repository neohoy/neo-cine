"""游戏发布（Game Launch）工具包的公用部分：读工程、解析时间码和拍子、把镜头表排成时间线、算镜头（摄影机）。

工具都在 kit/tools/ 里，用库的 .venv/bin/python 跑（numpy、scipy、pillow、fonttools，库的核心依赖），外加系统的 ffmpeg。
工程是一个文件夹，里面一个 game.json（镜头表就是它的 shots），格式见 kit/templates/game.json 和 PRODUCTION.md §3、§5。

时间的写法（game.json 里所有时间都可以这样写）：
  12.5        秒
  "4b"        拍（按 audio.bpm 换算；片子的第 0 秒就是原声截段的起点，也是一个拍点，所以 "4b" 一定在拍上）
  "6:08.5"    时间码，录像里的位置（分:秒，或 时:分:秒）：只用在 in、start、t 这类"录像里第几秒"的字段

镜头（摄影机）：每个画面层是一张图（一段录像的帧，或一张静图），先"铺满"画面（cover，居中），再按 view 和 moves 推拉。
  view  [x, y, w]          源图上要铺满画面的那块（像素；高 = w × 9/16）。不写就是居中铺满。
  moves [{at, dur, ease, zoom: z | [z0, z1], focus: [fx, fy]}]   以源图上的一点为不动点推近（和 CSS 的 transform-origin 一样）
        [{at, dur, ease, view: [x, y, w]}]                       推到源图上的另一块
  两种都换算成画面上的仿射 (s, tx, ty)：屏幕坐标 = 源图坐标 × s + (tx, ty)，按缓动线性插值（和 GSAP 补间 scale、x、y 的结果一样）。
"""
import json
import math
import os
import re
import shutil
import subprocess
import sys

KIT = os.path.dirname(os.path.abspath(__file__))
LIB = os.path.abspath(os.environ.get("LIB") or os.path.join(KIT, "..", "..", ".."))
W, H = 1920, 1080


def die(msg):
    print(f"✗ {msg}", file=sys.stderr)
    sys.exit(1)


def need_ffmpeg():
    for t in ("ffmpeg", "ffprobe"):
        if not shutil.which(t):
            die(f"找不到 {t}：先装 ffmpeg 7+（TECHNIQUE.md §1）")


def load(dir_):
    """工程目录 → (P, cfg)。"""
    if not dir_ or dir_.startswith("--"):
        die("缺少工程目录参数")
    P = os.path.abspath(dir_)
    f = os.path.join(P, "game.json")
    if not os.path.exists(f):
        die(f"{P} 里没有 game.json：先用 kit/tools/new_project.py 建工程")
    return P, json.load(open(f, encoding="utf-8"))


def save(P, cfg):
    with open(os.path.join(P, "game.json"), "w", encoding="utf-8") as fh:
        json.dump(cfg, fh, ensure_ascii=False, indent=2)
        fh.write("\n")


def tc(v):
    """时间码 → 秒：12.5、"12.5"、"6:08.5"、"1:02:03.25"。"""
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).strip()
    if re.fullmatch(r"-?\d+(\.\d+)?", s):
        return float(s)
    parts = s.split(":")
    if not all(re.fullmatch(r"\d+(\.\d+)?", p) for p in parts) or len(parts) > 3:
        raise ValueError(f"看不懂的时间码 {v!r}（写成 12.5、\"6:08.5\" 或 \"1:02:03.5\"）")
    sec = 0.0
    for p in parts:
        sec = sec * 60 + float(p)
    return sec


def fmt_tc(sec):
    """秒 → "m:ss.sss"。"""
    m = int(sec // 60)
    return f"{m}:{sec - m * 60:06.3f}"


def resolve(path_, P):
    """game.json 里的文件路径：相对工程目录，或绝对路径。"""
    return path_ if os.path.isabs(path_) else os.path.join(P, path_)


def probe(path_):
    """ffprobe：时长、尺寸、帧率、有没有声音。"""
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                        "format=duration:stream=codec_type,width,height,r_frame_rate,nb_frames",
                        "-of", "json", path_], capture_output=True, text=True)
    if r.returncode:
        die(f"ffprobe 读不了 {path_}：{r.stderr.strip()[:200]}")
    j = json.loads(r.stdout)
    v = next((s for s in j.get("streams", []) if s.get("codec_type") == "video"), None)
    a = any(s.get("codec_type") == "audio" for s in j.get("streams", []))
    fps = None
    if v and v.get("r_frame_rate") and v["r_frame_rate"] != "0/0":
        n, d = v["r_frame_rate"].split("/")
        fps = float(n) / float(d)
    return {"dur": float(j.get("format", {}).get("duration") or 0), "w": v and v.get("width"), "h": v and v.get("height"),
            "fps": fps, "audio": a}


# ---------------------------------------------------------------- 缓动（和 kit/page/tween.js、film.js 的同名缓动一致）
def ease(name):
    if not name or name in ("none", "linear"):
        return lambda p: p
    m = re.fullmatch(r"(power[0-4]|sine|expo|circ)\.(in|out|inOut)", name)
    if not m:
        raise ValueError(f"不认识的缓动 {name!r}（power0–4、sine、expo、circ 加 .in / .out / .inOut）")
    fam, kind = m.groups()
    if fam.startswith("power"):
        n = int(fam[5:]) + 1
        f = lambda p: p ** n
    elif fam == "sine":
        f = lambda p: 1 - math.cos(p * math.pi / 2)
    elif fam == "expo":
        f = lambda p: 0 if p <= 0 else 2 ** (10 * (p - 1)) * p + p ** 6 * (1 - p)
    else:
        f = lambda p: 1 - math.sqrt(max(0, 1 - p * p))
    if kind == "in":
        return f
    if kind == "out":
        return lambda p: 1 - f(1 - p)
    return lambda p: f(p * 2) / 2 if p < 0.5 else 1 - f((1 - p) * 2) / 2


# ---------------------------------------------------------------- 时间线
class Clock:
    """片子的时钟：秒和拍互换。第 0 秒是原声截段的起点（beats.py 帮你把起点挑在一个强拍上）。"""

    def __init__(self, cfg):
        a = cfg.get("audio") or {}
        self.bpm = a.get("bpm")
        self.beat = 60.0 / self.bpm if self.bpm else None
        self.fps = int(cfg.get("fps", 30))

    def sec(self, v, what=""):
        """镜头内的时间：秒，或 "4b"（拍）、"-0.5b"。"""
        if isinstance(v, str) and v.strip().endswith("b"):
            if not self.beat:
                raise ValueError(f"{what} 用了拍子 {v!r}，但 game.json 的 audio 里没写 bpm")
            return float(v.strip()[:-1]) * self.beat
        return tc(v)


def cover_view(sw, sh):
    """源图（sw×sh）居中铺满 1920×1080：源图上的那块 [x, y, w]。"""
    if sw / sh > W / H:
        w = sh * W / H
        return [(sw - w) / 2, 0.0, w]
    return [0.0, (sh - sw * H / W) / 2, float(sw)]


def affine_of_view(v):
    """源图上的一块 [x, y, w] 铺满画面 → (s, tx, ty)。"""
    s = W / v[2]
    return (s, -v[0] * s, -v[1] * s)


def visible(A, sw, sh):
    """仿射 A 下画面看到的源图范围 [x0, y0, x1, y1]（不裁到源图之内）。"""
    s, tx, ty = A
    return [-tx / s, -ty / s, (W - tx) / s, (H - ty) / s]


def camera(layer, sw, sh, clock, what):
    """一个画面层的镜头 → 分段 [{t0, t1, ease, a: (s,tx,ty), b: (s,tx,ty)}]（层内时间，秒）和起始仿射。
    检查每一段的两端都没露出源图外面（仿射线性插值时，可见范围的四条边在两端之间单调变化，查两端就够）。"""
    base = layer.get("view") or cover_view(sw, sh)
    A0 = affine_of_view(base)
    cur = A0
    moves = []
    for k, m in enumerate(layer.get("moves") or []):
        at, dur = clock.sec(m.get("at", 0), what), clock.sec(m.get("dur", 0.5), what)
        ease(m.get("ease", "power3.inOut"))   # 写错了在这里就报
        if "view" in m:
            a, b = cur, affine_of_view(m["view"])
        elif "zoom" in m:
            z = m["zoom"]
            z0, z1 = (z if isinstance(z, list) else [None, z])
            fx, fy = m.get("focus") or [base[0] + base[2] / 2, base[1] + base[2] * 9 / 32]
            s0, tx0, ty0 = A0
            Fx, Fy = fx * s0 + tx0, fy * s0 + ty0                     # 不动点在画面上的位置（按铺满时算）
            za = z0 if z0 is not None else cur[0] / s0
            a = (s0 * za, Fx - fx * s0 * za, Fy - fy * s0 * za) if z0 is not None else cur
            b = (s0 * z1, Fx - fx * s0 * z1, Fy - fy * s0 * z1)
        else:
            raise ValueError(f"{what} 第 {k + 1} 个 move 要写 zoom 或 view")
        if not moves and at > 0 and a != A0:
            moves.append({"t0": 0, "t1": 0, "ease": "none", "a": a, "b": a})   # 开头就停在 a（例如从 1.08 倍起推）
        moves.append({"t0": at, "t1": at + dur, "ease": m.get("ease", "power3.inOut"), "a": a, "b": b})
        cur = b
    start = moves[0]["a"] if moves and moves[0]["t0"] <= 1e-9 else A0
    for A in [start] + [m["a"] for m in moves] + [m["b"] for m in moves]:
        x0, y0, x1, y1 = visible(A, sw, sh)
        if x0 < -0.5 or y0 < -0.5 or x1 > sw + 0.5 or y1 > sh + 0.5:
            raise ValueError(f"{what}：镜头露出了画面外面（源图 {sw}×{sh}，这一刻看到的是 x {x0:.0f}–{x1:.0f}、y {y0:.0f}–{y1:.0f}）："
                             "推得更近一点，或者换个不动点（STYLE.md §2：不留黑底）")
    return start, moves


def affine_at(start, moves, t):
    """层内 t 秒的仿射（和 film.js 的 camAt 一致）。"""
    A = start
    for m in moves:
        if t < m["t0"]:
            break
        if t >= m["t1"] or m["t1"] <= m["t0"]:
            A = m["b"]
            continue
        k = ease(m["ease"])((t - m["t0"]) / (m["t1"] - m["t0"]))
        A = tuple(m["a"][i] + (m["b"][i] - m["a"][i]) * k for i in range(3))
    return A


def source_size(cfg, P, src_id):
    """录像（裁掉黑边后）的尺寸。"""
    s = (cfg.get("sources") or {}).get(src_id)
    if not s:
        die(f"sources 里没有 {src_id!r}")
    if s.get("crop"):
        return int(s["crop"][2]), int(s["crop"][3])
    f = resolve(s["file"], P)
    if not os.path.exists(f):
        return None
    p = probe(f)
    return p["w"], p["h"]


def still_file(cfg, P, sid):
    s = (cfg.get("stills") or {}).get(sid)
    if not s:
        die(f"stills 里没有 {sid!r}")
    return resolve(s["file"], P)


def image_size(path_):
    from PIL import Image
    with Image.open(path_) as im:
        return im.size


def plan(cfg, P, need_media=True):
    """镜头表 → 时间线：每个镜头的起止（秒）、每个画面层的起止、它要的帧（录像层）和镜头分段、画面事件。
    need_media=False 时不读素材尺寸（素材还没到位时也能排时间）。"""
    clock = Clock(cfg)
    fps = clock.fps
    shots, t, ev = [], 0.0, []
    for i, s in enumerate(cfg.get("shots") or []):
        what = f"镜头 {i + 1}（{s.get('id', '?')}）"
        if "beats" in s:
            if not clock.beat:
                die(f"{what} 用 beats 定长，但 audio 里没写 bpm")
            dur = s["beats"] * clock.beat
        elif "dur" in s:
            dur = clock.sec(s["dur"], what)
        else:
            die(f"{what} 要写 beats（拍数）或 dur（秒）")
        sh = {"i": i, "id": s.get("id", f"s{i + 1}"), "start": round(t, 6), "end": round(t + dur, 6), "dur": round(dur, 6),
              "a": round(t * fps) / fps, "b": round((t + dur) * fps) / fps, "layers": [], "plates": []}
        ev.append({"t": round(t, 4), "type": "cut", "id": sh["id"], **({"sound": s["sound"]} if s.get("sound") else {})})
        for j, L in enumerate(s.get("layers") or []):
            lw = f"{what} 第 {j + 1} 层"
            a = clock.sec(L.get("from", 0), lw)
            b = clock.sec(L["to"], lw) if "to" in L else dur
            lay = {"id": f"{sh['id']}-{j + 1}", "t0": round(t + a, 6), "t1": round(t + b, 6)}
            if "src" in L:
                lay.update(kind="clip", src=L["src"], inp=tc(L.get("in", 0)), rate=float(L.get("rate", 1)))
                size = source_size(cfg, P, L["src"]) if need_media else None
            elif "still" in L:
                lay.update(kind="still", still=L["still"])
                f = still_file(cfg, P, L["still"])
                size = image_size(f) if need_media and os.path.exists(f) else None
            else:
                die(f"{lw} 要写 src（录像）或 still（静图）")
            if size:
                try:
                    lay["start"], lay["moves"] = camera(L, size[0], size[1], clock, lw)
                except ValueError as e:
                    die(str(e))
                lay["size"] = list(size)
                for m in lay["moves"]:
                    if m["t1"] > m["t0"]:
                        ev.append({"t": round(lay["t0"] + m["t0"], 4), "type": "push", "id": lay["id"], "d": round(m["t1"] - m["t0"], 4)})
                for k, m in enumerate(L.get("moves") or []):
                    if m.get("sound"):
                        ev.append({"t": round(lay["t0"] + clock.sec(m.get("at", 0), lw), 4), "type": "sfx", "id": f"{lay['id']}-m{k + 1}",
                                   "d": round(clock.sec(m.get("dur", 0.5), lw), 4), "sound": m["sound"]})
            # 切点对齐到最近的一帧（拍点一般不在帧格上：四舍五入，画面最多差半帧）
            g0, g1 = round(lay["t0"] * fps), round(lay["t1"] * fps)
            lay["a"], lay["b"] = g0 / fps, g1 / fps
            if lay["kind"] == "clip":
                # 片子里第 g 帧（全片帧号）显示这一层，层内时间 = g/fps − t0，录像时间 = in + 层内时间 × rate
                lay["g0"], lay["n"] = g0, max(1, g1 - g0)
            sh["layers"].append(lay)
        for j, pl in enumerate(s.get("plates") or []):
            pw = f"{what} 字幕牌 {j + 1}"
            at = clock.sec(pl.get("at", 0.12), pw)
            to = clock.sec(pl["to"], pw) if "to" in pl else dur
            sh["plates"].append({"id": f"{sh['id']}-p{j + 1}", "text": pl["text"], "t0": round(t + at, 6), "t1": round(t + to, 6),
                                 "pos": pl.get("pos", "bottom"), "size": pl.get("size"), "still": at <= 0 and pl.get("still", True)})
            ev.append({"t": round(t + at, 4), "type": "plate", "id": f"{sh['id']}-p{j + 1}", **({"sound": pl["sound"]} if pl.get("sound") else {})})
        fin = s.get("finale")
        if fin:
            sh["finale"] = finale(fin, t, dur, clock, what, ev)
        if s.get("card"):
            c = s["card"]
            sh["card"] = {"lines": c.get("lines") or [], "land": round(t + clock.sec(c.get("land", 0), what), 6),
                          "slide": clock.sec(c.get("slide", "1.25b") if clock.beat else c.get("slide", 0.53), what)}
            ev.append({"t": round(sh["card"]["land"], 4), "type": "land", "id": f"{sh['id']}-card", **({"sound": c["sound"]} if c.get("sound") else {})})
        shots.append(sh)
        t += dur
    ev.sort(key=lambda e: e["t"])
    return {"fps": fps, "beat": clock.beat, "bpm": clock.bpm, "dur": round(t, 6), "shots": shots, "ev": ev}


def finale(fin, t, dur, clock, what, ev):
    """收尾段：立绘按拍擦入、铁板横幅滑入、Logo 落地、行动号召逐行出现。"""
    out = {}
    crew = fin.get("crew")
    if crew:
        every = clock.sec(crew.get("every", "0.5b"), what)
        at = clock.sec(crew.get("at", 0), what)
        out["crew"] = {"stills": crew["stills"], "t": [round(t + at + k * every, 6) for k in range(len(crew["stills"]))],
                       "crop": crew.get("crop") or {}}
        for k, x in enumerate(out["crew"]["t"]):
            ev.append({"t": round(x, 4), "type": "slice", "id": f"crew-{k + 1}", **({"sound": crew["sound"]} if crew.get("sound") else {})})
    if fin.get("band"):
        b = fin["band"]
        land = clock.sec(b["land"], what)
        slide = clock.sec(b.get("slide", "1.25b") if clock.beat else b.get("slide", 0.53), what)
        if land - slide < -1e-6:
            die(f"{what}：横幅 {land:.2f} 秒落定、滑入要 {slide:.2f} 秒，会从收尾镜头开始之前滑起（那时横幅还没出现）："
                f"land 至少写 {slide:.2f} 秒，或者把 slide 改短（band.slide）")
        out["band"] = {"land": round(t + land, 6), "slide": clock.sec(b.get("slide", "1.25b") if clock.beat else b.get("slide", 0.53), what)}
        ev.append({"t": round(t + land, 4), "type": "band", "id": "band", **({"sound": b["sound"]} if b.get("sound") else {})})
    if fin.get("logo"):
        lg = fin["logo"]
        at = clock.sec(lg.get("at", fin.get("band", {}).get("land", 0)), what)
        out["logo"] = {"still": lg["still"], "t": round(t + at, 6)}
        ev.append({"t": round(t + at, 4), "type": "land", "id": "logo", **({"sound": lg["sound"]} if lg.get("sound") else {})})
    out["cta"] = []
    for k, c in enumerate(fin.get("cta") or []):
        at = clock.sec(c["at"], what)
        out["cta"].append({"id": f"cta-{k + 1}", "text": c["text"], "t": round(t + at, 6), "style": c.get("style", "title" if k == 0 else "small")})
        ev.append({"t": round(t + at, 4), "type": "cta", "id": f"cta-{k + 1}", **({"sound": c["sound"]} if c.get("sound") else {})})
    return out


# ---------------------------------------------------------------- 字幕牌上的字
def plain(text):
    """去掉强调记号：[词] 是强调色（Logo 色），{词} 是暖色（只给小字）。"""
    return re.sub(r"[\[\]{}]", "", text)


def accents(text):
    return re.findall(r"\[([^\]]+)\]", text)


def need_read(text):
    """库的读字规则（DIRECTOR.md §7，core/render/readcheck.mjs 同一算法）：汉字 ÷ 4.5 + 其他非空白字符 ÷ 15 + 1.5 秒，至少 1.5。"""
    cjk = sum(1 for c in text if re.match(r"[㐀-䶿一-鿿぀-ヿ가-힯]", c))
    other = sum(1 for c in text if not c.isspace()) - cjk
    return max(1.5, cjk / 4.5 + other / 15 + 1.5)
