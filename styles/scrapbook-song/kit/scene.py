"""镜头编排层（来自《风吹新竹》MV 工程）。

一个 Scene 知道自己在整首歌里的起止（mv.json 的 scenes），把全曲时间换成镜头内时间（L），收集 SVG 和动画，最后写出。
传给这里的时间都是全曲秒数，除非名字另有说明。本库加了 hit()：登记画面上落在鼓点上的重拍，mix.py 拿它对歌。

Authoring layer for scene builders.

A Scene knows its global span on the song (mv.json "scenes"), converts global → local seconds, collects SVG + JS,
and writes the sub-composition through frame_kit.write_frame (boil / grain / 12fps kit).
Times passed to helpers are GLOBAL song seconds unless a name says otherwise.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from frame_kit import defs, write_frame  # noqa: E402
from hd_lib import *  # noqa: E402,F401,F403
import project  # noqa: E402
import music  # noqa: E402

KIT2 = r"""
  // wind band wipe (right → left). bandIn covers the frame exactly at tEnd; bandOut uncovers from t0.
  const bandIn = (sel, tEnd, d = 0.25) => tl.fromTo(sel, { x: 2000 }, { x: -340, duration: d, ease: q("none", d) }, tEnd - d);
  const bandOut = (sel, t0, d = 0.25) => tl.fromTo(sel, { x: -340 }, { x: -2700, duration: d, ease: q("none", d) }, t0);
  // a short drawn bump (on twos) at a beat
  const bump = (sel, t, origin, s = 1.06) => {
    tl.to(sel, { scale: s, svgOrigin: origin, duration: 1 / 12 }, t);
    tl.to(sel, { scale: 1, svgOrigin: origin, duration: 2 / 12, ease: q("power1.out", 2 / 12) }, t + 1 / 12);
  };
  // stroke draw-on (path needs pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1")
  const drawOn = (sel, t, d, ease = "power1.inOut") => tl.fromTo(sel, { attr: { "stroke-dashoffset": 1 } }, { attr: { "stroke-dashoffset": 0 }, duration: d, ease: q(ease, d) }, t);
  // blow an element away to the left (wind exit)
  const blowAway = (sel, t, origin, dx = -1600, rot = -40, d = 0.42) =>
    tl.to(sel, { x: dx, y: -60, rotation: rot, svgOrigin: origin, duration: d, ease: q("power2.in", d) }, t);
"""


def f(v):
    return f"{v:.0f}"


def band_body(color=TEAL, line=WHITE):
    """The wind band: wavy leading + trailing edges, wind lines and curls; 2600 wide, drawn at x = 0."""
    wave_l = "M0,-120 C-70,60 70,170 0,300 C-80,430 50,540 -14,660 C-70,780 60,880 0,1000 L0,1200"
    d = (wave_l + " L2600,1200 C2530,1040 2660,920 2590,780 C2520,640 2650,520 2580,380 C2520,240 2640,120 2600,-120Z")
    return (f'<path d="{d}" fill="{color}" stroke="{INK}" stroke-width="10" stroke-linejoin="round"/>'
            + "".join(f'<line x1="{x}" y1="{y}" x2="{x + L}" y2="{y}" stroke="{line}" stroke-width="10" stroke-linecap="round" opacity=".8"/>'
                      for x, y, L in [(90, 180, 380), (140, 420, 520), (80, 610, 300), (160, 840, 460), (110, 1010, 260), (900, 300, 600), (1300, 760, 520)])
            + curl(60, 330, .8, color=line) + curl(40, 780, .7, color=line))


class Scene:
    def __init__(self, fid, p=None, bg=PAPER, fonts=("KL", "WK", "JBM")):
        """p = id prefix for every element of this scene; must be unique in the film. Default: from the scene id
        ("s02-dusk-gate" → "s02", "c1-grow-up" → "c1"); pass one explicitly when two scenes share a first word."""
        if not p:
            import re
            head = re.sub(r"[^a-z0-9]", "", fid.split("-")[0].lower()) or "sc"
            p = head if head[0].isalpha() else "s" + head
        self.fid, self.p, self.bg, self.fonts = fid, p, bg, fonts
        self.g0, self.g1 = project.span(fid)
        self.dur = round(self.g1 - self.g0, 3)
        self.js = []
        self.extra_defs = ""
        self._n = 0
        self.hits = []

    # ------------------------------------------------------------ time
    def L(self, t):
        return round(t - self.g0, 3)

    def beats(self, t0=None, t1=None):
        return [self.L(b) for b in music.beats(self.g0 if t0 is None else t0, self.g1 if t1 is None else t1)]

    def downbeats(self, t0=None, t1=None):
        return [self.L(b) for b in music.downbeats(self.g0 if t0 is None else t0, self.g1 if t1 is None else t1)]

    def page(self):
        """(n, total) for tag(): this scene's place in the film."""
        return project.page(self.fid)

    def hit(self, name, t):
        """登记一个重拍（全曲时间 t）：砸字、盖章、落地这类该落在鼓点上的瞬间。tools/mix.py 核对它和歌差多少。"""
        self.hits.append({"name": f"{self.p}-{name}", "t": round(t, 3)})

    def id(self, name):
        return f"{self.p}-{name}"

    def uid(self, stem="e"):
        self._n += 1
        return f"{self.p}-{stem}{self._n}"

    # ------------------------------------------------------------ svg wrappers
    def wob(self, inner):
        return f'<g filter="url(#{self.p}-wob)" data-layout-allow-overflow>{inner}</g>'

    def wobT(self, inner):
        return f'<g filter="url(#{self.p}-wobT)" data-layout-allow-overflow>{inner}</g>'

    def grain(self, op=.5):
        return f'<rect width="1920" height="1080" filter="url(#{self.p}-grain)" opacity="{op}"/>'

    def group(self, name, inner, op=1, extra=""):
        return f'<g id="{self.id(name)}"{"" if op == 1 else f" opacity={chr(34)}{op}{chr(34)}"}{extra}>{inner}</g>'

    # ------------------------------------------------------------ text
    def chars(self, key, text, x, y, size, fam="WK", fill=INK, adv=1.0, align="middle", colors=None,
              stroke=None, sw=0, shadow=0, rot=0, vertical=False, lh=1.12):
        """Lay out one glyph per <g id=key{i}> (hidden); returns (svg, origins). x,y = line centre/start + baseline."""
        n = len(text)
        out, origins = "", []
        for i, ch in enumerate(text):
            if vertical:
                cx, cy = x, y + i * size * lh
            else:
                start = x - (n - 1) * size * adv / 2 if align == "middle" else x + size * adv / 2
                cx, cy = start + i * size * adv, y
            c = (colors or {}).get(i, fill)
            body = T(round(cx), round(cy), ch, size, fam, c, "middle", stroke, sw, rot, shadow=shadow, allow=True)
            out += f'<g id="{self.p}-{key}{i}" opacity="0" data-layout-allow-overlap>{body}</g>'
            origins.append((round(cx), round(cy - size * .36)))
        return out, origins

    def pop_chars(self, key, origins, times, dur=.25, ease="back.out(2.2)", rot=-12):
        for i, (o, t) in enumerate(zip(origins, times)):
            self.js.append(f'pop("#{self.p}-{key}{i}", {self.L(t)}, "{o[0]} {o[1]}", {dur}, "{ease}", {rot});')

    def line(self, key, li, x, y, size, frac=.72, lead=.04, **kw):
        """A sung lyric line (music.LYRICS[li]) written glyph by glyph over its sung span."""
        L = music.line(li)
        svg, org = self.chars(key, L["text"], x, y, size, **kw)
        self.pop_chars(key, org, music.syllables(li, frac, lead))
        return svg, org

    def hide(self, sels, t):
        self.js.append(f'tl.set({json.dumps(sels)}, {{ opacity: 0 }}, {self.L(t)});')

    def show(self, sels, t):
        self.js.append(f'tl.set({json.dumps(sels)}, {{ opacity: 1 }}, {self.L(t)});')

    def blow_chars(self, key, n, origins, t, spread=.04):
        for i in range(n):
            o = origins[i]
            self.js.append(f'blowAway("#{self.p}-{key}{i}", {self.L(t) + i * spread:.3f}, "{o[0]} {o[1]}", {-1500 - i * 90}, {-30 - i * 9});')

    # ------------------------------------------------------------ transitions
    def band(self, name, color=TEAL, line=WHITE):
        body = band_body(color, line)
        # no resting transform: every band must be driven by band_in / band_out / band_through (they set x first)
        self._bands = getattr(self, "_bands", set()) | {name}
        return f'<g filter="url(#{self.p}-wob)" data-layout-allow-overflow><g id="{self.id(name)}">{body}</g></g>'

    def band_in(self, name, t_end, d=.25):
        self.js.append(f'bandIn("#{self.id(name)}", {self.L(t_end)}, {d});')

    def band_through(self, name, t_mid, d=.5):
        """One pass across the frame; it fully covers the frame for 1/12 s from t_mid (swap groups at t_mid)."""
        self.js.append(f'tl.fromTo("#{self.id(name)}", {{ x: 2000 }}, {{ x: -2700, duration: {d}, ease: q("none", {d}) }}, {self.L(t_mid) - d / 2:.3f});')

    def band_out(self, name, t0=None, d=.25):
        self.js.append(f'bandOut("#{self.id(name)}", {0 if t0 is None else self.L(t0)}, {d});')

    # ------------------------------------------------------------ output
    def write(self, body, spec=None):
        svg = (f'<svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg"><defs>{defs(self.p)}{self.extra_defs}</defs>'
               + body + "</svg>")
        js = (KIT2 + f"\n  const S = {json.dumps(spec or {}, ensure_ascii=False)};\n  boil(\"{self.p}\", 0, {self.dur});\n  "
              + "\n  ".join(self.js) + "\n")
        write_frame(self.fid, self.p, self.dur, svg, js, self.bg, self.fonts, self.hits)
