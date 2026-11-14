# 手账歌谣工具包 · 歌词版式：字写在什么载体上（打字、砸字、纸标签、黑缎带、招牌、对联、黑板、路牌、对话框、印章、流星写字、吊牌、飞字、吹走、胶带）。
# 来自《风吹新竹》MV 工程。规则见 ../STYLE.md §4。
"""歌词版式 — the colourful collage typing. This is the fixed look of every film made with this skill.

Pictures change with every song (they are drawn from the lyrics); the way a sung line appears does not:
it is typed in glyph by glyph on the syllables, and it lives ON something drawn — a paper label, a black
ribbon, a shop sign, a couplet, a chalk board, a road sign, a speech bubble, a seal, the night sky — or it is
slammed in big (KL, ink outline, hard shadow, squash). Colours rotate through the flat palette so the page
looks like a collage of stickers and tape.

Every function takes the Scene, an id key, the text (or a lyric index li → text + syllable times), a position,
and registers its own animation on sc.js. Times are GLOBAL song seconds. Returns the SVG to place in the body
(put it inside sc.wobT(...) so it boils lightly).
"""
import math

from hd_lib import *  # noqa: F401,F403
from draw import shadow_box, rect, circle, shape  # noqa: F401
import music

# label fill / ink pairs, used in order (combo(i)) so neighbouring labels never share a colour
COMBOS = [(PAPER, INK), (INK, PAPER), (YEL, INK), (PINK, WHITE), (TEAL, WHITE), (RED, YEL), (WHITE, INK), (ORANGE, INK)]


def combo(i):
    return COMBOS[i % len(COMBOS)]


def _text_times(li, text, times, step=0.2):
    """Lyric index → (text, syllable times); or explicit text with times (list, or a start time spaced by step)."""
    if li is not None:
        L = music.line(li)
        return (text or L["text"]), music.syllables(li)
    if isinstance(times, (int, float)):
        times = [round(times + step * k, 3) for k in range(len(text))]
    return text, times


def _base(o, size):
    return f"{o[0]} {o[1] + round(size * .36)}"


def slam_in(sc, key, origins, times, size, drop=90):
    """KL slam: each glyph drops in stretched, squashes on its beat, settles (back.out)."""
    for i, (o, t) in enumerate(zip(origins, times)):
        sc.js.append(f'tl.fromTo("#{sc.p}-{key}{i}", {{ opacity: 0, scaleX: 0.6, scaleY: 1.5, y: -{drop}, svgOrigin: "{_base(o, size)}" }}, '
                     f'{{ opacity: 1, scaleX: 1, scaleY: 1, y: 0, duration: 0.25, ease: q("back.out(2.4)", 0.25) }}, {sc.L(t)});')


# ================================================================== the components
def typing(sc, key, li=None, x=960, y=180, size=84, text=None, times=None, fam="WK", fill=INK, on_dark=False, **kw):
    """Plain typed line (WK). on_dark → white glyphs with a 12px ink outline."""
    text, times = _text_times(li, text, times)
    if on_dark:
        fill, kw = WHITE, {**kw, "stroke": INK, "sw": 12}
    svg, org = sc.chars(key, text, x, y, size, fam, fill, **kw)
    sc.pop_chars(key, org, times)
    return svg


def slam(sc, key, text, x, y, size, times, fill=RED, stroke=INK, sw=16, shadow=12, tilt=(-6, 5, -4, 6, -3, 4), adv=1.0, step=0.3):
    """Big KL title slammed on the beats (e.g. a chorus hook, a key word). times: list or start time (+step)."""
    _, times = _text_times(None, text, times, step)
    out, org = "", []
    n = len(text)
    start = x - (n - 1) * size * adv / 2
    for i, ch in enumerate(text):
        cx = round(start + i * size * adv)
        rot = tilt[i % len(tilt)]
        out += f'<g id="{sc.p}-{key}{i}" opacity="0" data-layout-allow-overlap>{T(cx, y, ch, size, "KL", fill, "middle", stroke, sw, rot, shadow=shadow, allow=True)}</g>'
        org.append((cx, round(y - size * .36)))
    slam_in(sc, key, org, times, size)
    return out


def label_line(sc, key, li=None, x=960, y=180, size=70, text=None, times=None, i=0, rot=-2, fam="WK", tape=True):
    """A paper label (hard shadow, slight tilt, optional tape) carrying a typed line. x,y = centre / baseline."""
    text, times = _text_times(li, text, times)
    fill, ink = combo(i)
    w, h = len(text) * size + 80, size + 48
    bx, by = x - w / 2, y - size * .82 - 20
    board = (f'<g transform="rotate({rot} {x} {by + h / 2:.0f})">' + shadow_box(bx, by, w, h, fill, 8)
             + (f'<rect x="{bx + w * .08:.0f}" y="{by - 18:.0f}" width="110" height="38" fill="#EADFB8" opacity=".85" transform="rotate(-8 {bx + w * .08 + 55:.0f} {by:.0f})"/>' if tape else "")
             + "</g>")
    glyphs, org = sc.chars(key, text, x, round(y), size, fam, ink, rot=rot)
    sc.js.append(f'pop("#{sc.p}-{key}bd", {sc.L(times[0]) - 0.15:.3f}, "{x} {by + h / 2:.0f}", 0.2, "back.out(2)", {rot * 2});')
    sc.pop_chars(key, org, times)
    return f'<g id="{sc.p}-{key}bd" opacity="0">{board}</g>' + glyphs


def ribbon_line(sc, key, li=None, x1=150, x2=1180, y=520, size=96, text=None, times=None, color=YEL, band=INK):
    """A black ribbon (forked tails) slapped across the frame, a KL line written onto it."""
    text, times = _text_times(li, text, times)
    h = size + 32
    svg = f'<g id="{sc.p}-{key}rb" opacity="0">{ribbon(x1, x2, y, h, "", band)}</g>'
    glyphs, org = sc.chars(key, text, (x1 + x2) / 2, y + h * .72, size, "KL", color)
    sc.js.append(f'tl.fromTo("#{sc.p}-{key}rb", {{ opacity: 0, x: 900 }}, {{ opacity: 1, x: 0, duration: 0.25, ease: q("power3.out", 0.25) }}, {sc.L(times[0]) - 0.3:.3f});')
    sc.pop_chars(key, org, times, 0.22, "back.out(2.6)", -10)
    return svg + glyphs


def sign(sc, key, li=None, x=200, y=160, size=70, text=None, times=None, board=RED, ink=YEL, vertical=True):
    """A shop sign board (vertical by default) — the line reads down the board."""
    text, times = _text_times(li, text, times)
    n = len(text)
    if vertical:
        w, h = size + 48, n * size * 1.08 + 70
        bx, by = x - w / 2, y
        glyphs, org = sc.chars(key, text, x, y + 30 + size * .9, size, "WK", ink, vertical=True, lh=1.08)
    else:
        w, h = n * size + 70, size + 50
        bx, by = x - w / 2, y
        glyphs, org = sc.chars(key, text, x, y + size + 6, size, "WK", ink)
    svg = shadow_box(bx, by, w, h, board, 8)
    sc.pop_chars(key, org, times)
    return svg + glyphs


def couplet(sc, key, li=None, xr=1712, xl=218, y=236, size=78, text=None, times=None, split=None, board=RED, ink=YEL):
    """A pair of red couplet boards; the line starts on the RIGHT board and continues on the left."""
    text, times = _text_times(li, text, times)
    k = split or (len(text) + 1) // 2
    out = ""
    for side, (xx, part, tt) in enumerate(((xr, text[:k], times[:k]), (xl, text[k:], times[k:]))):
        h = len(part) * size * 1.12 + 60
        out += shadow_box(xx - size / 2 - 25, y, size + 50, h, board, 8)
        glyphs, org = sc.chars(f"{key}{'rl'[side]}", part, xx, y + 30 + size * .9, size, "WK", ink, vertical=True, lh=1.12)
        sc.pop_chars(f"{key}{'rl'[side]}", org, tt)
        out += glyphs
    return out


def chalk_board(sc, key, li=None, x=1560, y=150, size=74, text=None, times=None, cols=2, chalk=WHITE, accent=YEL, frame=None):
    """A chalk / menu board; the line runs down in columns, right column first."""
    text, times = _text_times(li, text, times)
    per = math.ceil(len(text) / cols)
    w, h = cols * (size + 40) + 60, per * size * 1.1 + 80
    out = (shadow_box(x, y, w, h, "#2E4A3C", 10)
           + f'<rect x="{x}" y="{y}" width="{w}" height="{h:.0f}" rx="10" fill="none" stroke="{frame or "#B7804F"}" stroke-width="16"/>')
    for c in range(cols):
        part, tt = text[c * per:(c + 1) * per], times[c * per:(c + 1) * per]
        if not part:
            continue
        cx = x + w - 50 - size / 2 - c * (size + 40)
        glyphs, org = sc.chars(f"{key}{c}", part, round(cx), y + 40 + size * .9, size, "WK", chalk if c == 0 else accent, vertical=True, lh=1.1)
        sc.pop_chars(f"{key}{c}", org, tt)
        out += glyphs
    return out


def road_sign(sc, key, li=None, x=960, y=40, w=None, size=78, text=None, times=None, color="#2E7D4F"):
    """A green highway sign hanging over the scene."""
    text, times = _text_times(li, text, times)
    w = w or len(text) * size + 160
    h = size + 62
    out = (f'<rect x="{x - w / 2 + 40:.0f}" y="{y + h:.0f}" width="16" height="600" fill="#C9C2B0" stroke="{INK}" stroke-width="5"/>'
           f'<rect x="{x + w / 2 - 56:.0f}" y="{y + h:.0f}" width="16" height="600" fill="#C9C2B0" stroke="{INK}" stroke-width="5"/>'
           + shadow_box(x - w / 2, y, w, h, color, 14)
           + f'<rect x="{x - w / 2 + 14:.0f}" y="{y + 14}" width="{w - 28:.0f}" height="{h - 28}" rx="8" fill="none" stroke="{WHITE}" stroke-width="5"/>')
    glyphs, org = sc.chars(key, text, x, y + h * .5 + size * .36, size, "WK", WHITE)
    sc.pop_chars(key, org, times)
    return out + glyphs


def bubble(sc, key, text, x, y, size, t, fill=WHITE, ink=INK, tail="left"):
    """A comic speech bubble with a KL word (an exclamation, a shout, a short sung tag like 啊)."""
    w, h = max(len(text), 1) * size + 90, size + 70
    tx = x - w / 2 + 30 if tail == "left" else x + w / 2 - 30
    d = (f"M{x - w / 2:.0f},{y:.0f} C{x - w / 2:.0f},{y - h / 2:.0f} {x - w / 4:.0f},{y - h * .62:.0f} {x:.0f},{y - h * .62:.0f} "
         f"C{x + w / 4:.0f},{y - h * .62:.0f} {x + w / 2:.0f},{y - h / 2:.0f} {x + w / 2:.0f},{y:.0f} "
         f"C{x + w / 2:.0f},{y + h / 2:.0f} {x + w / 4:.0f},{y + h * .62:.0f} {x:.0f},{y + h * .62:.0f} "
         f"L{tx + (-40 if tail == 'left' else 40):.0f},{y + h * .9:.0f} L{tx:.0f},{y + h * .5:.0f} "
         f"C{x - w / 4:.0f},{y + h * .6:.0f} {x - w / 2:.0f},{y + h / 2:.0f} {x - w / 2:.0f},{y:.0f}Z")
    body = shape(d, fill) + T(x, round(y + size * .36), text, size, "KL", ink, "middle", allow=True)
    sc.js.append(f'pop("#{sc.p}-{key}", {sc.L(t)}, "{x} {y}", 0.25, "back.out(2.6)", 10);')
    return f'<g id="{sc.p}-{key}" opacity="0" data-layout-allow-overlap>{body}</g>'


def seal(sc, key, text, x, y, size, t, color=RED, paper=None):
    """A vertical red seal that stamps down on beat t (overshoot, squash, ink specks). x,y = centre."""
    n = len(text)
    w, h = size + 36, n * size * 1.05 + 40
    box = f'<rect x="{x - w / 2:.0f}" y="{y - h / 2:.0f}" width="{w:.0f}" height="{h:.0f}" rx="6" fill="{paper or "none"}" stroke="{color}" stroke-width="{max(6, size // 10)}"/>'
    glyphs = VT(x, round(y - h / 2 + 20 + size * .9), text, size, "KL", {i: color for i in range(n)}, 1.05)
    specks = "".join(f'<circle class="{sc.p}-{key}sp" cx="{x + dx:.0f}" cy="{y + dy:.0f}" r="{rr}" fill="{color}" opacity="0"/>'
                     for dx, dy, rr in [(-w * .8, -h * .45, 5), (w * .75, -h * .5, 4), (w * .8, h * .45, 6), (-w * .7, h * .5, 3)])
    o = f"{x} {y}"
    L = sc.L(t)
    sc.js += [f'tl.fromTo("#{sc.p}-{key}", {{ opacity: 0, scale: 1.9, rotation: -10, svgOrigin: "{o}" }}, {{ opacity: 1, scale: 1, rotation: 0, duration: 0.17, ease: q("power3.in", 0.17) }}, {L - 0.17:.3f});',
              f'tl.to("#{sc.p}-{key}", {{ scaleX: 1.1, scaleY: 0.88, svgOrigin: "{o}", duration: 1 / 12 }}, {L});',
              f'tl.to("#{sc.p}-{key}", {{ scaleX: 1, scaleY: 1, svgOrigin: "{o}", duration: 2 / 12, ease: q("back.out(2)", 2 / 12) }}, {L + 1 / 12:.3f});',
              f'tl.set(".{sc.p}-{key}sp", {{ opacity: 1 }}, {L});']
    return f'<g id="{sc.p}-{key}" opacity="0"><g transform="rotate(-5 {x} {y})">{box}{glyphs}</g></g>{specks}'


def sky_write(sc, key, li=None, x=960, y=560, size=104, text=None, times=None, color=YEL, leader=WHITE):
    """The line written across the sky by a shooting star (KL, glowing yellow, ink outline)."""
    text, times = _text_times(li, text, times)
    glyphs, org = sc.chars(key, text, x, y, size, "KL", color, stroke=INK, sw=10, shadow=6)
    star = (f'<g id="{sc.p}-{key}ss" opacity="0">{sparkle(0, 0, 30, leader)}'
            f'<path d="M30,0 L190,-30" stroke="{leader}" stroke-width="8" stroke-linecap="round" opacity=".7"/></g>')
    sc.js.append(f'tl.set("#{sc.p}-{key}ss", {{ opacity: 1 }}, {sc.L(times[0]) - 0.1:.3f});')
    sc.js += [f'tl.set("#{sc.p}-{key}ss", {{ x: {o[0] + 60}, y: {o[1] - 60} }}, {sc.L(t) - 0.04:.3f});' for o, t in zip(org, times)]
    sc.js.append(f'tl.set("#{sc.p}-{key}ss", {{ opacity: 0 }}, {sc.L(times[-1]) + 0.3:.3f});')
    sc.pop_chars(key, org, times, 0.25, "back.out(2.6)", -14)
    return glyphs + star


def hang_tag(sc, key, text, x, y, size, t, i=0, swings=5, string=INK):
    """A paper tag dropping in on a string and swinging (seek-safe: the swing is a transform attribute)."""
    fill, ink = combo(i)
    w, h = len(text) * size + 70, size + 46
    pivot = f"{x} {y - 120}"
    inner = (line_(x, y - 120, x, y - h / 2, string) + f'<g transform="rotate(-3 {x} {y})">' + shadow_box(x - w / 2, y - h / 2, w, h, fill, 6)
             + T(x, round(y + size * .36), text, size, "WK", ink, "middle", allow=True) + "</g>")
    sc.js += [f'tl.fromTo("#{sc.p}-{key}", {{ opacity: 0, y: -300 }}, {{ opacity: 1, y: 0, duration: 0.3, ease: q("back.out(1.5)", 0.3) }}, {sc.L(t)});',
              f'tl.fromTo("#{sc.p}-{key}sw", {{ attr: {{ transform: "rotate(7 {pivot})" }} }}, {{ attr: {{ transform: "rotate(-5 {pivot})" }}, duration: 0.42, '
              f'ease: q("sine.inOut", 0.42), repeat: {swings}, yoyo: true, immediateRender: false }}, {sc.L(t) + 0.3:.3f});']
    return f'<g id="{sc.p}-{key}" opacity="0"><g id="{sc.p}-{key}sw">{inner}</g></g>'


def line_(x1, y1, x2, y2, color=INK):
    return f'<line x1="{x1:.0f}" y1="{y1:.0f}" x2="{x2:.0f}" y2="{y2:.0f}" stroke="{color}" stroke-width="4"/>'


def spill(sc, key, glyphs, sources, t0, step=0.55, size=90, dx=-1300, colors=(YEL, WHITE, PINK, TEAL)):
    """Little KL glyph stickers popping out of sources and flying off (laughter, shouts, a word on the wind).
    glyphs: a string, used in order; sources: [(x, y)] cycled; dx: travel (negative = to the left)."""
    out = ""
    for i, ch in enumerate(glyphs):
        x0, y0 = sources[i % len(sources)]
        col = colors[i % len(colors)]
        out += f'<g id="{sc.p}-{key}{i}" opacity="0">{T(x0, y0, ch, size, "KL", col, "middle", INK, 10, -10, shadow=6, allow=True)}</g>'
        t = sc.L(t0) + i * step
        sc.js += [f'tl.set("#{sc.p}-{key}{i}", {{ opacity: 1 }}, {t:.3f});',
                  f'tl.fromTo("#{sc.p}-{key}{i}", {{ x: 0, y: 0, scale: 0.7, rotation: 0, svgOrigin: "{x0} {y0 - 30}" }}, '
                  f'{{ x: {dx}, y: {-180 + 60 * (i % 4)}, scale: 1.6, rotation: -30, duration: 1.4, ease: q("power1.in", 1.4) }}, {t:.3f});']
    return out


def tape(x, y, w=140, rot=-10):
    """A strip of masking tape (collage detail for photos, labels, tickets)."""
    return f'<rect x="{x - w / 2:.0f}" y="{y - 22:.0f}" width="{w}" height="44" fill="#EADFB8" opacity=".85" transform="rotate({rot} {x} {y})"/>'


def blow_off(sc, key, n, origins, t, spread=0.03, dx=-1500):
    """When the line is done (never before it is sung through): the wind takes the glyphs off-frame."""
    for i in range(n):
        o = origins[i]
        sc.js.append(f'blowAway("#{sc.p}-{key}{i}", {sc.L(t) + i * spread:.3f}, "{o[0]} {o[1]}", {dx - i * 90}, {-30 - i * 9});')


CATALOG = """
typing      plain typed line                     any line; on_dark=True on night / saturated grounds
slam        big KL title on the beats           the hook, a title word, 家 / 长大 / a name
label_line  paper label with tape               a line said quietly; rotate labels through combo(i)
ribbon_line black ribbon, KL glyphs             a declaration, the last line of a chorus half
sign        vertical / horizontal shop sign     streets, shops, markets
couplet     two red boards, right then left     temples, doors, new-year scenes
chalk_board chalk / menu board, columns         food, classrooms, cafés
road_sign   green highway sign                  roads, travel, distance
bubble      speech bubble, KL word              shouts, 啊 / 哇 tags, dialogue
seal        red vertical stamp                  titles, place names, the end page
sky_write   shooting star writes the line       night, wishes, names, promises
hang_tag    paper tag on a string, swinging     a line hanging over a street / a doorway
spill       flying glyph stickers               laughter, noise, words on the wind
"""
