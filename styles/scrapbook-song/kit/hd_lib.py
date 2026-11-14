#!/usr/bin/env python3
# 手账歌谣工具包 · 底层件：色板、线宽 LW、文字 T / 竖排 VT、云团、爆炸云、风卷、叶子、星芒、纸标签、黑缎带、页码 tag。
# 来自《风吹新竹》MV 工程。
"""Hand-drawn SVG primitives (cel style: 7px ink outline, flat fills, hard ink shadows) + palette."""
import base64, math, os, random, sys

from project import ROOT  # noqa: F401  (the MV project this build belongs to)

INK, PAPER, WHITE = "#191919", "#F3EDE0", "#FFFDF6"
PINK, PINKD, TEAL, TEALD = "#E8457A", "#B5245A", "#3FB8A4", "#1F7F73"
YEL, RED, NIGHT, ORANGE = "#F5D03B", "#C8352E", "#1E2A78", "#F08A3C"
BAMBOO, BAMBOOL, BUFF, ROOF = "#3E8E5A", "#7CC08A", "#F2D08B", "#3A3A46"
LW = 7


def b64(rel):
    with open(os.path.join(ROOT, rel), "rb") as f:
        return base64.b64encode(f.read()).decode()


# ---------------------------------------------------------------- primitives
def T(x, y, s, size, fam="WK", fill=INK, anchor="start", stroke=None, sw=0, rot=0, shadow=0, op=1, ls=0, allow=False):
    """SVG text; optional ink outline + hard offset shadow (hand-lettered look)."""
    st = f' stroke="{stroke}" stroke-width="{sw}" paint-order="stroke" stroke-linejoin="round"' if stroke else ""
    tr = f' transform="rotate({rot} {x} {y})"' if rot else ""
    lsp = f' letter-spacing="{ls}"' if ls else ""
    out = ""
    if shadow:
        out += (f'<text data-layout-ignore x="{x + shadow}" y="{y + shadow}" font-family="{fam}" font-size="{size}" text-anchor="{anchor}" '
                f'fill="{INK}" stroke="{INK}" stroke-width="{sw}" stroke-linejoin="round"{tr}{lsp}>{s}</text>')
    al = " data-layout-allow-overlap" if allow else ""
    out += f'<text{al} x="{x}" y="{y}" font-family="{fam}" font-size="{size}" text-anchor="{anchor}" fill="{fill}" opacity="{op}"{st}{tr}{lsp}>{s}</text>'
    return out


def VT(x, y, s, size, fam="WK", colors=None, lh=1.12):
    """Vertical column: one glyph per line, centred on x."""
    out = ""
    for i, ch in enumerate(s):
        c = (colors or {}).get(i, INK)
        out += f'<text x="{x}" y="{y + i * size * lh:.0f}" font-family="{fam}" font-size="{size}" text-anchor="middle" fill="{c}">{ch}</text>'
    return out


def puff(circles, fill=PAPER, lw=LW):
    """Cloud puff: union of circles with a single ink contour."""
    a = "".join(f'<circle cx="{x}" cy="{y}" r="{r + lw / 2:.0f}" fill="{INK}"/>' for x, y, r in circles)
    b = "".join(f'<circle cx="{x}" cy="{y}" r="{r - lw / 2:.0f}" fill="{fill}"/>' for x, y, r in circles)
    return a + b


def burst(cx, cy, rx, ry, irx, iry, n, seed, fill, lw=9):
    r = random.Random(seed)
    pts = []
    for i in range(n * 2):
        a = math.pi * 2 * i / (n * 2) - math.pi / 2
        if i % 2 == 0:
            k = r.uniform(0.86, 1.08); x, y = cx + rx * k * math.cos(a), cy + ry * k * math.sin(a)
        else:
            k = r.uniform(0.9, 1.04); x, y = cx + irx * k * math.cos(a), cy + iry * k * math.sin(a)
        pts.append(f"{x:.0f},{y:.0f}")
    return f'<polygon points="{" ".join(pts)}" fill="{fill}" stroke="{INK}" stroke-width="{lw}" stroke-linejoin="round"/>'


def curl(x, y, s=1.0, lw=LW, color=INK, op=1):
    """Wind curl — tail to the right, curl on the left (wind travels right → left)."""
    d = (f"M{x + 260 * s:.0f},{y:.0f} C{x + 170 * s:.0f},{y - 14 * s:.0f} {x + 90 * s:.0f},{y + 12 * s:.0f} {x + 30 * s:.0f},{y - 8 * s:.0f} "
         f"C{x - 20 * s:.0f},{y - 26 * s:.0f} {x - 18 * s:.0f},{y - 78 * s:.0f} {x + 22 * s:.0f},{y - 80 * s:.0f} "
         f"C{x + 56 * s:.0f},{y - 82 * s:.0f} {x + 60 * s:.0f},{y - 44 * s:.0f} {x + 32 * s:.0f},{y - 40 * s:.0f}")
    return f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{lw}" stroke-linecap="round" stroke-linejoin="round" opacity="{op}"/>'


def leaf(x, y, L, rot, fill=BAMBOO, lw=5):
    d = f"M{-L / 2:.0f},0 Q0,{-L * 0.24:.0f} {L / 2:.0f},0 Q0,{L * 0.24:.0f} {-L / 2:.0f},0Z"
    return (f'<g transform="translate({x:.0f},{y:.0f}) rotate({rot:.0f})"><path d="{d}" fill="{fill}" stroke="{INK}" stroke-width="{lw}" '
            f'stroke-linejoin="round"/><path d="M{-L / 2 + 8:.0f},0 L{L / 2 - 12:.0f},0" stroke="{INK}" stroke-width="{lw * 0.5:.1f}" opacity=".55"/></g>')


def stalk(d, nodes, w=40):
    s = f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{w + LW * 2}" stroke-linecap="round"/>'
    s += f'<path d="{d}" fill="none" stroke="{BAMBOO}" stroke-width="{w}" stroke-linecap="round"/>'
    s += f'<path d="{d}" fill="none" stroke="{BAMBOOL}" stroke-width="{w * 0.22:.0f}" stroke-linecap="round" transform="translate({-w * 0.22:.0f},0)" opacity=".85"/>'
    for x, y, a in nodes:
        s += f'<line x1="{-w / 2 - 6}" y1="0" x2="{w / 2 + 6}" y2="0" stroke="{INK}" stroke-width="6" stroke-linecap="round" transform="translate({x},{y}) rotate({a})"/>'
    return s


def sparkle(x, y, s, fill=YEL, lw=4):
    d = f"M{x},{y - s} Q{x},{y} {x + s},{y} Q{x},{y} {x},{y + s} Q{x},{y} {x - s},{y} Q{x},{y} {x},{y - s}Z"
    return f'<path d="{d}" fill="{fill}" stroke="{INK}" stroke-width="{lw}" stroke-linejoin="round"/>'


def label(x, y, w, h, inner, fill=PAPER, rot=0, rx=10):
    return (f'<g transform="rotate({rot} {x + w / 2} {y + h / 2})"><rect x="{x + 10}" y="{y + 12}" width="{w}" height="{h}" rx="{rx}" fill="{INK}"/>'
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{INK}" stroke-width="{LW}"/>{inner}</g>')


def ribbon(x1, x2, y, h, inner, fill=INK, tail="#3a3a3a"):
    lt = f'<polygon points="{x1 - 80},{y + 26} {x1 + 20},{y + 26} {x1 + 20},{y + h + 26} {x1 - 80},{y + h + 26} {x1 - 48},{y + h / 2 + 26}" fill="{tail}" stroke="{INK}" stroke-width="{LW}" stroke-linejoin="round"/>'
    rt = f'<polygon points="{x2 + 80},{y + 26} {x2 - 20},{y + 26} {x2 - 20},{y + h + 26} {x2 + 80},{y + h + 26} {x2 + 48},{y + h / 2 + 26}" fill="{tail}" stroke="{INK}" stroke-width="{LW}" stroke-linejoin="round"/>'
    band = f'<rect x="{x1}" y="{y}" width="{x2 - x1}" height="{h}" fill="{fill}" stroke="{INK}" stroke-width="{LW}"/>'
    return lt + rt + band + inner


def crest(x, y, s=1.0, fill=TEAL):
    d = "M0,0 C20,-60 90,-100 150,-70 C185,-52 185,-10 155,-6 C130,-3 122,-30 140,-38 C110,-50 80,-30 70,0Z"
    return (f'<g transform="translate({x},{y}) scale({s})"><path d="{d}" fill="{fill}" stroke="{INK}" stroke-width="{LW / s:.1f}" stroke-linejoin="round"/>'
            f'<path d="M34,-28 C54,-60 96,-74 126,-62" fill="none" stroke="{WHITE}" stroke-width="{5 / s:.1f}" stroke-linecap="round"/></g>')


def tag(n, total, color=INK, label_txt=None):
    out = T(1860, 1036, f"{n:02d} / {total:02d}", 24, "JBM", color, "end", op=.7)
    if label_txt:
        out += (f'<g transform="rotate(-2 200 80)"><rect x="56" y="48" width="{len(label_txt) * 27 + 40}" height="58" rx="6" fill="none" stroke="{color}" stroke-width="4"/>'
                + T(76, 88, label_txt, 30, "WK", color) + "</g>")
    return out


def grain(op=1):
    return f'<rect width="1920" height="1080" filter="url(#grain)" opacity="{op}"/>'


def bg(c):
    return f'<rect width="1920" height="1080" fill="{c}"/>'
