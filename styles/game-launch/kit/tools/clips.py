#!/usr/bin/env python3
"""把镜头表里用到的录像片段抽成帧，并裁出静图（立绘、主视觉）：画面逐帧确定的关键（STYLE.md §2）。

    .venv/bin/python styles/game-launch/kit/tools/clips.py <工程>              抽所有录像层的帧，做缺的静图
    .venv/bin/python styles/game-launch/kit/tools/clips.py <工程> --only trade-1     只做这一层
    .venv/bin/python styles/game-launch/kit/tools/clips.py <工程> --stills     只做静图（stills 里写了 grab 的）
    .venv/bin/python styles/game-launch/kit/tools/clips.py <工程> --force      全部重做

为什么不用 <video>：浏览器里的 <video> 按自己的时钟解码，跳到某一秒时落在哪一帧、什么时候解码完，因机器、因浏览器而异，
Mac 和渲染台式机（Windows）渲出来会差一两帧。这里事先把每个录像层要用的帧按"片子的帧格"取好：
  全片第 g 帧（t = g / fps）显示这一层时，层内时间 τ = t − 层起点，录像时间 = in + τ × rate，取录像里最近的那一帧；
  镜头（推拉）在那一刻看到的是源图上哪一块也是确定的，只把那一块（四周多留 3%）按画面分辨率存成 JPEG，
  并记下它在源图上的位置（frames/<层>/meta.json 的 frames：[x, y, w, h, 图宽, 图高]）。页面按 t 取第 k 张、按镜头摆好，
  所以任何一帧单独渲、乱序渲、在哪台机器上渲都一样。帧是中间产物（frames/ 不进 git），镜头或入点改了会自动重抽。

静图（stills 里写了 grab 的）：从一张图或录像的某一刻裁一块，缩放到 size，存成 file。file 已经在就跳过（--force 重做）：
  {"file": "assets/stills/p4.jpg", "grab": {"from": "play", "t": "5:55", "crop": [x, y, w, h], "size": [640, 2160]}}
  from 是 sources 里的一段录像（坐标是裁掉黑边后的游戏画面）或一张图片的路径；不写 crop 就是整张；bg 是透明处垫的颜色。
"""
import argparse
import hashlib
import json
import os
import subprocess
import sys
from concurrent.futures import ProcessPoolExecutor

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from lib import load, plan, resolve, tc, die, need_ffmpeg, affine_at, probe, W, H  # noqa: E402

MARGIN = 0.03        # 四周多留的比例：预览的任意时刻（不在帧格上）镜头位置略有不同，也不会露边
QUALITY = 90


def src_info(cfg, P, sid):
    s = (cfg.get("sources") or {}).get(sid)
    if not s:
        die(f"sources 里没有 {sid!r}")
    f = resolve(s["file"], P)
    if not os.path.exists(f):
        die(f"录像不在：{f}\n  game.json 的 sources.{sid}.file 指向用户给的实机录像（示范片的素材从哪来见 DEMO.md 开头）")
    p = probe(f)
    crop = s.get("crop") or [0, 0, p["w"], p["h"]]
    return f, [int(v) for v in crop], p


def grab_frame(f, crop, t):
    """录像 t 秒那一帧（裁掉黑边）→ PIL 图。"""
    cx, cy, cw, ch = crop
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", f, "-frames:v", "1",
                          "-vf", f"crop={cw}:{ch}:{cx}:{cy}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
    if len(raw) < cw * ch * 3:
        die(f"{os.path.basename(f)} 在 {t:.3f} 秒取不到帧")
    return Image.frombuffer("RGB", (cw, ch), raw[:cw * ch * 3], "raw", "RGB", 0, 1)


def make_stills(cfg, P, force):
    for sid, s in (cfg.get("stills") or {}).items():
        out = resolve(s["file"], P)
        g = s.get("grab")
        if not g:
            if not os.path.exists(out):
                die(f"静图 {sid} 不在：{out}")
            continue
        if os.path.exists(out) and not force:
            continue
        frm = g["from"]
        if frm in (cfg.get("sources") or {}):
            f, crop, _ = src_info(cfg, P, frm)
            im = grab_frame(f, crop, tc(g.get("t", 0)))
        else:
            fp = resolve(frm, P)
            if not os.path.exists(fp):
                die(f"静图 {sid} 要从 {fp} 裁，但它不在（示范片：DEMO.md 开头写了素材从哪来）")
            im = Image.open(fp)
        if im.mode in ("RGBA", "LA", "P"):
            im = im.convert("RGBA")
            bg = Image.new("RGBA", im.size, g.get("bg", "#15171a"))
            im = Image.alpha_composite(bg, im).convert("RGB") if out.lower().endswith((".jpg", ".jpeg")) else im
        if g.get("crop"):
            x, y, w, h = g["crop"]
            im = im.crop((x, y, x + w, y + h))
        if g.get("size"):
            im = im.resize(tuple(g["size"]), Image.LANCZOS)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        if out.lower().endswith((".jpg", ".jpeg")):
            im.convert("RGB").save(out, quality=92, subsampling=0)
        else:
            im.save(out)
        print(f"静图 {sid} → {os.path.relpath(out, P)}  {im.size[0]}×{im.size[1]}")


def layer_jobs(cfg, P, pl):
    jobs = []
    for sh in pl["shots"]:
        for L in sh["layers"]:
            if L["kind"] != "clip":
                continue
            f, crop, info = src_info(cfg, P, L["src"])
            sw, sh_ = crop[2], crop[3]
            fps = pl["fps"]
            rects, times = [], []
            for k in range(L["n"]):
                tau = (L["g0"] + k) / fps - L["t0"]
                s, tx, ty = affine_at(tuple(L["start"]), [{**m, "a": tuple(m["a"]), "b": tuple(m["b"])} for m in L["moves"]], tau)
                x0, y0, x1, y1 = -tx / s, -ty / s, (W - tx) / s, (H - ty) / s
                mx, my = (x1 - x0) * MARGIN, (y1 - y0) * MARGIN
                x0, y0 = max(0, int(x0 - mx)), max(0, int(y0 - my))
                x1, y1 = min(sw, int(np.ceil(x1 + mx))), min(sh_, int(np.ceil(y1 + my)))
                pw = max(2, int(round((x1 - x0) * s)))      # 存成画面分辨率：源图 1 像素 = 画面 s 像素
                ph = max(2, int(round((y1 - y0) * s)))
                if s > 1:                                    # 推得比源图还近：保留源图像素，不放大
                    pw, ph = x1 - x0, y1 - y0
                rects.append([x0, y0, x1 - x0, y1 - y0, pw, ph])
                times.append(L["inp"] + max(0.0, tau) * L["rate"])
            st = os.stat(f)
            key = hashlib.sha1(json.dumps([os.path.basename(f), st.st_size, int(st.st_mtime), crop, times, rects, QUALITY]).encode()).hexdigest()[:16]
            jobs.append({"id": L["id"], "file": f, "crop": crop, "fps_src": info["fps"] or 30, "times": times, "rects": rects, "key": key,
                         "dir": os.path.join(P, "frames", L["id"]), "fps": fps, "g0": L["g0"]})
    return jobs


def run_job(j):
    d = j["dir"]
    meta_f = os.path.join(d, "meta.json")
    if os.path.exists(meta_f):
        try:
            m = json.load(open(meta_f))
            if m.get("key") == j["key"] and all(os.path.exists(os.path.join(d, f"{k:05d}.jpg")) for k in range(len(j["times"]))):
                return f"{j['id']}: 已是最新（{len(j['times'])} 帧）"
        except Exception:
            pass
    os.makedirs(d, exist_ok=True)
    for n in os.listdir(d):
        if n.endswith(".jpg"):
            os.remove(os.path.join(d, n))
    cx, cy, cw, ch = j["crop"]
    sfps = j["fps_src"]
    # 录像时间 = 帧号 / 帧率（播放器里看到的秒数）。要的每个时刻取最近的那一帧：m = round(时间 × 帧率)
    want_m = [int(round(t * sfps)) for t in j["times"]]
    m_lo, m_hi = min(want_m), max(want_m)
    # 从入点前约 0.5 秒开始解码：-ss 放在 -i 前面是快速定位，ffmpeg 再精确丢掉时间早于 -ss 的帧。
    # -ss 取在两帧正中间（第 n0 帧之后半帧），输出的第一帧就一定是第 n0 + 1 帧，帧号不会差一
    n0 = m_lo - 1 - int(0.5 * sfps)
    if n0 < 0:
        ss, m0 = 0.0, 0
    else:
        ss, m0 = (n0 + 0.5) / sfps, n0 + 1
    cmd = ["ffmpeg", "-v", "error", "-ss", f"{ss:.5f}", "-i", j["file"], "-frames:v", str(m_hi - m0 + 1),
           "-vf", f"crop={cw}:{ch}:{cx}:{cy}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-fps_mode", "passthrough", "-"]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    size = cw * ch * 3
    want = sorted(range(len(want_m)), key=lambda k: want_m[k])
    wi, m = 0, m0
    while wi < len(want):
        buf = proc.stdout.read(size)
        if len(buf) < size:
            break
        while wi < len(want) and want_m[want[wi]] == m:
            k = want[wi]
            frame = np.frombuffer(buf, np.uint8).reshape(ch, cw, 3)
            x, y, w, h, pw, ph = j["rects"][k]
            im = Image.fromarray(frame[y:y + h, x:x + w])
            if (pw, ph) != (w, h):
                im = im.resize((pw, ph), Image.LANCZOS)
            im.save(os.path.join(d, f"{k:05d}.jpg"), quality=QUALITY)
            wi += 1
        m += 1
    proc.stdout.close()
    proc.wait()
    if wi < len(want):
        raise RuntimeError(f"{j['id']}: 录像在第 {m} 帧就完了（只取到 {wi}/{len(want)} 帧）：入点太晚或 rate 太大")
    json.dump({"key": j["key"], "fps": j["fps"], "g0": j["g0"], "frames": j["rects"], "src_frames": want_m},
              open(meta_f, "w"), separators=(",", ":"))
    mb = sum(os.path.getsize(os.path.join(d, n)) for n in os.listdir(d) if n.endswith(".jpg")) / 1e6
    return f"{j['id']}: {len(j['times'])} 帧，录像 {j['times'][0]:.2f}–{j['times'][-1]:.2f} 秒，{mb:.0f} MB"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("project")
    ap.add_argument("--only")
    ap.add_argument("--stills", action="store_true")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--workers", type=int, default=3)
    a = ap.parse_args()
    need_ffmpeg()
    P, cfg = load(a.project)
    make_stills(cfg, P, a.force)
    if a.stills:
        return
    pl = plan(cfg, P)
    jobs = [j for j in layer_jobs(cfg, P, pl) if not a.only or j["id"] == a.only]
    if a.only and not jobs:
        die(f"没有录像层 {a.only}（层的名字是 <镜头 id>-<序号>）")
    if a.force:
        for j in jobs:
            j["key"] = "force-" + j["key"]
    with ProcessPoolExecutor(max_workers=max(1, a.workers)) as ex:
        for msg in ex.map(run_job, jobs):
            print(msg)
    # 用不到的旧层目录（镜头改名、删层）留着会被 remote.sh 一起发走：列出来
    keep = {j["id"] for j in layer_jobs(cfg, P, pl)}
    fd = os.path.join(P, "frames")
    stale = [n for n in os.listdir(fd) if os.path.isdir(os.path.join(fd, n)) and n not in keep] if os.path.isdir(fd) else []
    if stale:
        print(f"⚠ frames/ 里有镜头表已经不用的层：{'、'.join(stale)}（可以删掉：渲染台式机会连它们一起收到）")


if __name__ == "__main__":
    main()
