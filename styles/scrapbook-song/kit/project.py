"""找到正在做的影片工程（一个带 mv.json 的文件夹），读它的 mv.json。

工程根目录取环境变量 HDMV_PROJECT（tools/build.py 会设好），否则从当前目录往上找第一个有 mv.json 的文件夹。
mv.json 的字段见 ../PRODUCTION.md「工程文件夹」。时间都是全曲时间（秒）。
来自《风吹新竹》MV 工程，本库加了 range（片子取歌的哪一段）。
"""
import json
import os


def _find_root():
    env = os.environ.get("HDMV_PROJECT")
    if env:
        return os.path.abspath(env)
    d = os.getcwd()
    while True:
        if os.path.isfile(os.path.join(d, "mv.json")):
            return d
        parent = os.path.dirname(d)
        if parent == d:
            raise SystemExit("找不到 mv.json：在影片工程里运行（kit/tools/new_project.py 建一个），或者设 HDMV_PROJECT")
        d = parent


ROOT = _find_root()
CONFIG = json.load(open(os.path.join(ROOT, "mv.json"), encoding="utf-8"))


def path(rel):
    return os.path.join(ROOT, rel)


def scenes():
    """[(id, start, end)]，按片中顺序，全曲时间。"""
    return [(s["id"], float(s["start"]), float(s["end"])) for s in CONFIG.get("scenes", [])]


def span(fid):
    for i, a, b in scenes():
        if i == fid:
            return a, b
    raise SystemExit(f"镜头 {fid!r} 不在 mv.json 的 scenes 里")


def page(fid):
    """页码 (n, total)：这个镜头在片子里排第几。"""
    ids = [s[0] for s in scenes()]
    return ids.index(fid) + 1, len(ids)


def film_range():
    """片子覆盖的全曲时间 [from, to]：mv.json 的 range，没写就是第一个镜头的起点到最后一个镜头的终点。"""
    r = CONFIG.get("range")
    if r:
        return float(r[0]), float(r[1])
    sc = scenes()
    return (sc[0][1], sc[-1][2]) if sc else (0.0, 0.0)
