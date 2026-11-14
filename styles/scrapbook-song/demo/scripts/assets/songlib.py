"""《风吹新竹》示范片自己的东西（不属于工具包）：这首歌的几样道具、示范片的页码表、原 MV 脚本里用到的几个常量。

道具 xg（小光）、gate（东门城）、scooter（机车）、turbine（风车）、ticket（旧车票）来自《风吹新竹》MV 工程的 hd_lib.py，
当时和通用件放在一起；在这里它们是这首歌的画，新歌不要用（STYLE.md §1：画面从字里来）。
镜头脚本在 `from hd_lib import *` 之后 `from songlib import *`：这里的 tag 会覆盖工具包的 tag，把原高潮版脚本写的
「n / 6」页码换成它们在示范片里的位置。
"""
import math

from hd_lib import *  # noqa: F401,F403
from hd_lib import tag as _tag
import project

CUT = "full"
FULL = True            # 全曲版写法：f4 不淡出，用一条玫红风带交给下一镜（这里是片尾卡）
span = project.span

# 页码：每组画面一页，按片中顺序
PAGES = ["s18a", "s18b", "s19", "f1", "f2a", "f2b", "f3", "f4a", "f4b"]
_CLIMAX_KEYS = {1: "f1", 2: "f2a", 3: "f2b", 4: "f3", 5: "f4a", 6: "f4b"}


def page(key):
    return PAGES.index(key) + 1, len(PAGES)


def tag(n, total, color=INK, label_txt=None):
    """原 30 秒高潮版的四个镜头写的是 tag(n, 6, …)：换成它们在示范片里的页码，去掉标签里的「 · END」。"""
    if total == 6:
        n, total = page(_CLIMAX_KEYS[n])
        if label_txt:
            label_txt = label_txt.replace(" · END", "")
    return _tag(n, total, color, label_txt)


def xg(cx, cy, r, mood="happy", rot=0, glow=True, lw=LW):
    """小光 — the light mascot."""
    s = []
    if glow:
        s.append(f'<circle cx="{cx}" cy="{cy}" r="{r * 2.1:.0f}" fill="{YEL}" opacity=".18"/>')
        s.append(f'<circle cx="{cx}" cy="{cy}" r="{r * 1.55:.0f}" fill="{YEL}" opacity=".3"/>')
        for k in range(8):
            a = k * math.pi / 4 + 0.3
            x1, y1 = cx + math.cos(a) * r * 1.38, cy + math.sin(a) * r * 1.38
            x2, y2 = cx + math.cos(a) * r * 1.66, cy + math.sin(a) * r * 1.66
            s.append(f'<line x1="{x1:.0f}" y1="{y1:.0f}" x2="{x2:.0f}" y2="{y2:.0f}" stroke="{INK}" stroke-width="{lw * 0.7:.1f}" stroke-linecap="round"/>')
    body = (f"M{cx},{cy - r * 1.22:.1f} C{cx + r * 0.5:.1f},{cy - r * 0.85:.1f} {cx + r:.1f},{cy - r * 0.45:.1f} {cx + r:.1f},{cy + r * 0.12:.1f} "
            f"C{cx + r:.1f},{cy + r * 0.72:.1f} {cx + r * 0.55:.1f},{cy + r:.1f} {cx},{cy + r:.1f} C{cx - r * 0.55:.1f},{cy + r:.1f} {cx - r:.1f},{cy + r * 0.72:.1f} {cx - r:.1f},{cy + r * 0.12:.1f} "
            f"C{cx - r:.1f},{cy - r * 0.45:.1f} {cx - r * 0.5:.1f},{cy - r * 0.85:.1f} {cx},{cy - r * 1.22:.1f}Z")
    s.append(f'<path d="{body}" fill="{YEL}" stroke="{INK}" stroke-width="{lw}" stroke-linejoin="round"/>')
    hx, hy = cx - r * 0.48, cy - r * 0.28
    s.append(f'<ellipse cx="{hx:.1f}" cy="{hy:.1f}" rx="{r * 0.14:.1f}" ry="{r * 0.26:.1f}" fill="#FFF7CF" transform="rotate(-20 {hx:.1f} {hy:.1f})"/>')
    for sx in (-1, 1):
        s.append(f'<ellipse cx="{cx + sx * r * 0.52:.1f}" cy="{cy + r * 0.4:.1f}" rx="{r * 0.15:.1f}" ry="{r * 0.09:.1f}" fill="{PINK}" opacity=".8"/>')
    ex, ey, ew = r * 0.28, cy + r * 0.08, lw * 0.8
    smile = f'<path d="M{cx - r * 0.15:.1f},{cy + r * 0.33:.1f} Q{cx:.1f},{cy + r * 0.5:.1f} {cx + r * 0.15:.1f},{cy + r * 0.33:.1f}" fill="none" stroke="{INK}" stroke-width="{ew:.1f}" stroke-linecap="round"/>'
    if mood == "happy":
        for sx in (-1, 1):
            s.append(f'<ellipse cx="{cx + sx * ex:.1f}" cy="{ey:.1f}" rx="{r * 0.075:.1f}" ry="{r * 0.115:.1f}" fill="{INK}"/>')
        s.append(smile)
    elif mood == "closed":
        for sx in (-1, 1):
            x0 = cx + sx * ex
            s.append(f'<path d="M{x0 - r * 0.11:.1f},{ey + r * 0.04:.1f} Q{x0:.1f},{ey - r * 0.1:.1f} {x0 + r * 0.11:.1f},{ey + r * 0.04:.1f}" fill="none" stroke="{INK}" stroke-width="{ew:.1f}" stroke-linecap="round"/>')
        s.append(smile)
    elif mood == "squint":
        x0 = cx - ex
        s.append(f'<path d="M{x0 - r * 0.1:.1f},{ey - r * 0.09:.1f} L{x0 + r * 0.07:.1f},{ey:.1f} L{x0 - r * 0.1:.1f},{ey + r * 0.09:.1f}" fill="none" stroke="{INK}" stroke-width="{ew:.1f}" stroke-linecap="round" stroke-linejoin="round"/>')
        x0 = cx + ex
        s.append(f'<path d="M{x0 + r * 0.1:.1f},{ey - r * 0.09:.1f} L{x0 - r * 0.07:.1f},{ey:.1f} L{x0 + r * 0.1:.1f},{ey + r * 0.09:.1f}" fill="none" stroke="{INK}" stroke-width="{ew:.1f}" stroke-linecap="round" stroke-linejoin="round"/>')
        s.append(f'<ellipse cx="{cx:.1f}" cy="{cy + r * 0.42:.1f}" rx="{r * 0.1:.1f}" ry="{r * 0.13:.1f}" fill="{INK}"/>')
    elif mood == "sleep":
        for sx in (-1, 1):
            x0 = cx + sx * ex
            s.append(f'<path d="M{x0 - r * 0.11:.1f},{ey:.1f} Q{x0:.1f},{ey + r * 0.09:.1f} {x0 + r * 0.11:.1f},{ey:.1f}" fill="none" stroke="{INK}" stroke-width="{ew:.1f}" stroke-linecap="round"/>')
        s.append(f'<path d="M{cx - r * 0.08:.1f},{cy + r * 0.38:.1f} Q{cx:.1f},{cy + r * 0.45:.1f} {cx + r * 0.08:.1f},{cy + r * 0.38:.1f}" fill="none" stroke="{INK}" stroke-width="{ew:.1f}" stroke-linecap="round"/>')
        for i, (dx, dy, fs) in enumerate([(0.9, -0.9, 0.42), (1.25, -1.35, 0.55), (1.65, -1.9, 0.7)]):
            s.append(T(f"{cx + r * dx:.0f}", f"{cy + r * dy:.0f}", "z", f"{r * fs:.0f}", "KL", INK))
    return f'<g transform="rotate({rot} {cx} {cy})">{"".join(s)}</g>'


def gate(gx, gy, s=1.0):
    """东门城（迎曦门）cartoon, origin = ground centre."""
    g = []
    g.append(f'<rect x="-170" y="-115" width="340" height="115" fill="{RED}" stroke="{INK}" stroke-width="{LW}" stroke-linejoin="round"/>')
    for (x1, y1, x2) in [(-150, -92, -100), (-60, -70, -10), (40, -96, 90), (110, -60, 150), (-140, -40, -95), (70, -30, 120)]:
        g.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y1}" stroke="{INK}" stroke-width="4" opacity=".35" stroke-linecap="round"/>')
    g.append(f'<path d="M-46,0 L-46,-58 A46,46 0 0 1 46,-58 L46,0Z" fill="#2A2238" stroke="{INK}" stroke-width="{LW}"/>')
    g.append(f'<rect x="-112" y="-176" width="224" height="61" fill="{PAPER}" stroke="{INK}" stroke-width="{LW}"/>')
    for px in (-88, -30, 30, 88):
        g.append(f'<rect x="{px - 7}" y="-176" width="14" height="61" fill="{RED}" stroke="{INK}" stroke-width="4"/>')
    g.append(f'<path d="M-182,-176 Q-160,-166 -130,-182 L130,-182 Q160,-166 182,-176 L138,-216 L-138,-216Z" fill="{ROOF}" stroke="{INK}" stroke-width="{LW}" stroke-linejoin="round"/>')
    g.append(f'<path d="M-182,-176 q-14,-4 -12,-22 M182,-176 q14,-4 12,-22" fill="none" stroke="{INK}" stroke-width="{LW}" stroke-linecap="round"/>')
    g.append(f'<rect x="-62" y="-252" width="124" height="38" fill="{PAPER}" stroke="{INK}" stroke-width="{LW}"/>')
    g.append(f'<path d="M-124,-250 Q-104,-241 -82,-255 L82,-255 Q104,-241 124,-250 L90,-288 L-90,-288Z" fill="{ROOF}" stroke="{INK}" stroke-width="{LW}" stroke-linejoin="round"/>')
    g.append(f'<path d="M-96,-290 L96,-290 M-96,-290 q-14,-2 -12,-18 q6,-6 12,0 M96,-290 q14,-2 12,-18 q-6,-6 -12,0" fill="none" stroke="{INK}" stroke-width="{LW}" stroke-linecap="round"/>')
    return f'<g transform="translate({gx},{gy}) scale({s})">{"".join(g)}</g>'


def scooter(x, y, s=1.0):
    """Student on a scooter heading LEFT; scarf + speed lines trail to the right."""
    g = []
    g.append(f'<path d="M150,-150 C210,-170 240,-130 300,-150 C270,-120 230,-140 170,-128Z" fill="{RED}" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>')
    for i, yy in enumerate((-40, -78, -112)):
        g.append(f'<line x1="{215 + i * 18}" y1="{yy}" x2="{300 + i * 18}" y2="{yy}" stroke="{INK}" stroke-width="6" stroke-linecap="round"/>')
    g.append(f'<path d="M-30,-22 Q-34,-74 6,-84 L112,-84 Q170,-80 178,-30 L150,-14 L-12,-14Z" fill="{PINK}" stroke="{INK}" stroke-width="{LW}" stroke-linejoin="round"/>')
    g.append(f'<path d="M14,-80 L-2,-138" stroke="{INK}" stroke-width="{LW}" stroke-linecap="round"/><path d="M-22,-140 L22,-136" stroke="{INK}" stroke-width="{LW}" stroke-linecap="round"/>')
    g.append(f'<circle cx="-16" cy="-104" r="13" fill="{YEL}" stroke="{INK}" stroke-width="5"/>')
    g.append(f'<path d="M96,-86 C100,-130 110,-160 130,-178 L150,-170 C150,-140 140,-110 132,-86Z" fill="{WHITE}" stroke="{INK}" stroke-width="{LW}" stroke-linejoin="round"/>')
    g.append(f'<path d="M126,-160 C90,-150 50,-146 10,-140" fill="none" stroke="{INK}" stroke-width="{LW}" stroke-linecap="round"/>')
    g.append(f'<path d="M112,-84 L70,-40 L40,-36" fill="none" stroke="{INK}" stroke-width="{LW}" stroke-linecap="round" stroke-linejoin="round"/>')
    g.append(f'<circle cx="146" cy="-200" r="28" fill="#F6D2B0" stroke="{INK}" stroke-width="{LW}"/>')
    g.append(f'<path d="M116,-202 A31,31 0 0 1 178,-206 L182,-196 L112,-192Z" fill="{YEL}" stroke="{INK}" stroke-width="{LW}" stroke-linejoin="round"/>')
    for wx in (0, 150):
        g.append(f'<circle cx="{wx}" cy="0" r="30" fill="{INK}"/><circle cx="{wx}" cy="0" r="11" fill="{PAPER}"/>')
    return f'<g transform="translate({x},{y}) scale({s})">{"".join(g)}</g>'


def turbine(x, yb, h, ang, s=1.0):
    g = [f'<polygon points="{x - 9},{yb} {x + 9},{yb} {x + 4},{yb - h} {x - 4},{yb - h}" fill="{WHITE}" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>']
    hx, hy = x, yb - h
    for k in range(3):
        a = ang + k * 120
        g.append(f'<g transform="translate({hx},{hy}) rotate({a})"><path d="M0,-6 Q60,-14 128,0 Q60,10 0,6Z" fill="{WHITE}" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/></g>')
    g.append(f'<circle cx="{hx}" cy="{hy}" r="11" fill="{RED}" stroke="{INK}" stroke-width="5"/>')
    return "".join(g)


def ticket(x, y, rot, hole_bg):
    return (f'<g transform="rotate({rot} {x + 195} {y + 80})">'
            f'<rect x="{x + 9}" y="{y + 11}" width="390" height="160" rx="12" fill="{INK}"/>'
            f'<rect x="{x}" y="{y}" width="390" height="160" rx="12" fill="{BUFF}" stroke="{INK}" stroke-width="{LW}"/>'
            f'<line x1="{x + 300}" y1="{y + 14}" x2="{x + 300}" y2="{y + 146}" stroke="{INK}" stroke-width="4" stroke-dasharray="10 10"/>'
            + T(x + 24, y + 70, "东门城 → 海岸", 38, "WK", INK, allow=True) + T(x + 26, y + 120, "17 公里 · 去海边", 28, "WK", INK, allow=True)
            + T(x + 346, y + 52, "No.", 22, "JBM", "#A82A24", "middle", allow=True) + T(x + 346, y + 82, "0159", 24, "JBM", "#A82A24", "middle", allow=True)
            + f'<circle cx="{x + 346}" cy="{y + 120}" r="15" fill="{hole_bg}" stroke="{INK}" stroke-width="4"/></g>')


