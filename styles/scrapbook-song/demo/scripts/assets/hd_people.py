# 来自《风吹新竹》MV 工程的 scripts/handdrawn/hd_people.py。未改动。
"""Hand-drawn people + Hsinchu props for storyboard v4 (cel style, ink outlines)."""
import math
from hd_lib import *  # noqa: F401,F403  (colours, LW, T, VT, leaf, crest, ...)

SKIN, HAIR, HAIRH, NAVY = "#F6D2B0", "#2B2522", "#6A5A50", "#2F4FA0"
BROWN, WOOD, MEAT, STONE = "#8A5A3B", "#B7804F", "#A0623A", "#9C9585"


def shape(d, fill, lw=LW, op=1):
    return f'<path d="{d}" fill="{fill}" stroke="{INK}" stroke-width="{lw:.1f}" stroke-linejoin="round" stroke-linecap="round" opacity="{op}"/>'


def thick(d, color, w, lw=LW):
    """Outlined thick stroke — limbs, scarves, strands."""
    return (f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{w + 2 * lw:.1f}" stroke-linecap="round" stroke-linejoin="round"/>'
            f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{w:.1f}" stroke-linecap="round" stroke-linejoin="round"/>')


def eyes_closed(x, y, r, lw=LW):
    return f'<path d="M{x - r * .13:.1f},{y + r * .04:.1f} Q{x:.1f},{y - r * .12:.1f} {x + r * .13:.1f},{y + r * .04:.1f}" fill="none" stroke="{INK}" stroke-width="{lw * .85:.1f}" stroke-linecap="round"/>'


# ------------------------------------------------------------------ heads
def head_front(cx, cy, r, eye="closed", blow=0.0):
    """Front-view chibi head, bob hair; `blow` (0..1) streams strands to the LEFT (wind from the right)."""
    g = []
    g.append(shape(f"M{cx - r * 1.06:.0f},{cy + r * .15:.0f} C{cx - r * 1.18:.0f},{cy - r * .95:.0f} {cx - r * .5:.0f},{cy - r * 1.55:.0f} {cx + r * .12:.0f},{cy - r * 1.52:.0f} "
                   f"C{cx + r * .9:.0f},{cy - r * 1.5:.0f} {cx + r * 1.25:.0f},{cy - r * .85:.0f} {cx + r * 1.12:.0f},{cy + r * .2:.0f} "
                   f"C{cx + r * 1.08:.0f},{cy + r * .55:.0f} {cx + r * 1.0:.0f},{cy + r * .78:.0f} {cx + r * .9:.0f},{cy + r * .9:.0f} L{cx - r * .9:.0f},{cy + r * .9:.0f} "
                   f"C{cx - r * 1.02:.0f},{cy + r * .72:.0f} {cx - r * 1.08:.0f},{cy + r * .48:.0f} {cx - r * 1.06:.0f},{cy + r * .15:.0f}Z", HAIR))
    if blow:
        for y0, L, w in ((-.95, 1.1, .2), (-.5, 1.45, .24), (.05, 1.2, .2), (.55, .9, .16)):
            x0, yy = cx - r * .95, cy + r * y0
            tip = x0 - r * L * blow
            g.append(shape(f"M{x0 + r * .1:.0f},{yy - r * w:.0f} C{x0 - r * L * .35 * blow:.0f},{yy - r * w * 1.5:.0f} {tip + r * .3:.0f},{yy - r * w * .9:.0f} {tip:.0f},{yy - r * .12:.0f} "
                           f"C{tip + r * .35:.0f},{yy + r * w * .3:.0f} {x0 - r * L * .3 * blow:.0f},{yy + r * w:.0f} {x0 + r * .1:.0f},{yy + r * w:.0f}Z", HAIR))
    g.append(f'<ellipse cx="{cx}" cy="{cy + r * .08:.0f}" rx="{r * .95:.0f}" ry="{r * .9:.0f}" fill="{SKIN}" stroke="{INK}" stroke-width="{LW}"/>')
    g.append(shape(f"M{cx - r * .96:.0f},{cy - r * .1:.0f} C{cx - r * .9:.0f},{cy - r * .95:.0f} {cx - r * .1:.0f},{cy - r * 1.22:.0f} {cx + r * .45:.0f},{cy - r * 1.12:.0f} "
                   f"C{cx + r * .9:.0f},{cy - r * 1.02:.0f} {cx + r * 1.05:.0f},{cy - r * .62:.0f} {cx + r * .98:.0f},{cy - r * .12:.0f} "
                   f"C{cx + r * .72:.0f},{cy - r * .42:.0f} {cx + r * .42:.0f},{cy - r * .38:.0f} {cx + r * .26:.0f},{cy - r * .6:.0f} "
                   f"C{cx + r * .06:.0f},{cy - r * .36:.0f} {cx - r * .3:.0f},{cy - r * .34:.0f} {cx - r * .5:.0f},{cy - r * .56:.0f} "
                   f"C{cx - r * .62:.0f},{cy - r * .3:.0f} {cx - r * .8:.0f},{cy - r * .22:.0f} {cx - r * .96:.0f},{cy - r * .1:.0f}Z", HAIR))
    g.append(f'<path d="M{cx - r * .2:.0f},{cy - r * 1.0:.0f} q{r * .3:.0f},{-r * .12:.0f} {r * .55:.0f},{-r * .02:.0f}" stroke="{HAIRH}" stroke-width="{LW}" fill="none" stroke-linecap="round"/>')
    ex, ey = r * .36, cy + r * .14
    for sx in (-1, 1):
        if eye == "closed":
            g.append(eyes_closed(cx + sx * ex, ey, r))
        else:
            g.append(f'<ellipse cx="{cx + sx * ex:.0f}" cy="{ey:.0f}" rx="{r * .08:.1f}" ry="{r * .12:.1f}" fill="{INK}"/>')
        g.append(f'<ellipse cx="{cx + sx * r * .56:.0f}" cy="{cy + r * .44:.0f}" rx="{r * .16:.1f}" ry="{r * .09:.1f}" fill="{PINK}" opacity=".7"/>')
    g.append(f'<path d="M{cx - r * .14:.1f},{cy + r * .5:.1f} Q{cx:.1f},{cy + r * .64:.1f} {cx + r * .14:.1f},{cy + r * .5:.1f}" fill="none" stroke="{INK}" stroke-width="{LW * .8:.1f}" stroke-linecap="round"/>')
    return "".join(g)


def closeup_head(x, y, s=1.0):
    """3/4 close-up facing RIGHT into the gust: hair + yellow scarf stream LEFT, squinting, mouth open."""
    g = []
    g.append(shape("M-70,170 C-180,150 -290,210 -420,180 C-330,250 -200,250 -70,215Z", YEL))
    for d in ("M-60,-130 C-160,-190 -300,-170 -430,-210 C-340,-120 -220,-100 -110,-70Z",
              "M-120,-60 C-230,-80 -350,-40 -470,-70 C-370,10 -250,10 -130,0Z",
              "M-130,20 C-230,40 -330,90 -440,80 C-340,140 -230,120 -120,80Z",
              "M-90,90 C-170,130 -240,180 -330,190 C-250,230 -160,200 -80,140Z"):
        g.append(shape(d, HAIR))
    g.append(f'<ellipse cx="-30" cy="-30" rx="165" ry="150" fill="{HAIR}" stroke="{INK}" stroke-width="{LW}"/>')
    g.append(shape("M-230,600 C-220,250 -110,180 0,180 C120,180 230,250 240,600Z", WHITE))
    g.append(f'<path d="M-40,186 L10,240 L60,186" fill="none" stroke="{INK}" stroke-width="{LW}" stroke-linejoin="round"/>')
    g.append(shape("M-30,110 L40,110 L44,190 L-34,190Z", SKIN))
    g.append(shape("M-70,150 C-20,185 70,185 110,150 L118,190 C70,225 -30,225 -78,190Z", YEL))
    g.append(f'<ellipse cx="20" cy="10" rx="140" ry="135" fill="{SKIN}" stroke="{INK}" stroke-width="{LW}"/>')
    g.append(shape("M152,0 q26,12 2,30", SKIN))
    g.append(f'<ellipse cx="-88" cy="26" rx="24" ry="32" fill="{SKIN}" stroke="{INK}" stroke-width="{LW}"/><path d="M-94,14 q12,10 0,24" fill="none" stroke="{INK}" stroke-width="4"/>')
    g.append(shape("M-122,-56 C-94,-140 20,-168 112,-132 C142,-118 160,-92 158,-58 C120,-80 82,-78 52,-96 C32,-70 -20,-60 -62,-82 C-82,-60 -102,-54 -122,-56Z", HAIR))
    g.append(f'<path d="M-40,-120 q40,-22 90,-14" stroke="{HAIRH}" stroke-width="{LW}" fill="none" stroke-linecap="round"/>')
    g.append(f'<path d="M30,-6 L62,10 L30,26 M142,-6 L114,10 L142,26" fill="none" stroke="{INK}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>')
    g.append(f'<ellipse cx="108" cy="78" rx="20" ry="24" fill="{INK}"/><ellipse cx="108" cy="90" rx="11" ry="8" fill="{PINK}"/>')
    g.append(f'<ellipse cx="22" cy="58" rx="26" ry="14" fill="{PINK}" opacity=".7"/><ellipse cx="152" cy="56" rx="14" ry="11" fill="{PINK}" opacity=".7"/>')
    for i in range(3):
        g.append(f'<line x1="{200 + i * 12}" y1="{-60 + i * 50}" x2="{270 + i * 18}" y2="{-66 + i * 50}" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>')
    return f'<g transform="translate({x},{y}) scale({s})">{"".join(g)}</g>'


# ------------------------------------------------------------------ conch
def conch_elems(lw):
    return (f'<path d="M330,560 C450,556 640,566 792,598 L812,806 C650,808 452,712 330,560Z" fill="#F8CFA0" stroke="{INK}" stroke-width="{lw:.1f}" stroke-linejoin="round"/>'
            f'<path d="M462,566 l14,-38 l20,40 M580,572 l16,-42 l22,44 M694,586 l20,-40 l18,46" fill="#F8CFA0" stroke="{INK}" stroke-width="{lw * .85:.1f}" stroke-linejoin="round"/>'
            f'<path d="M420,560 C430,610 448,650 470,680 M520,566 C536,630 560,690 590,736 M624,576 C640,646 664,716 694,772 M716,590 C728,660 744,730 760,800" fill="none" stroke="{INK}" stroke-width="{lw * .7:.1f}" stroke-linecap="round" opacity=".6"/>'
            f'<ellipse cx="808" cy="702" rx="74" ry="112" transform="rotate(-12 808 702)" fill="{PINK}" stroke="{INK}" stroke-width="{lw:.1f}"/>'
            f'<ellipse cx="818" cy="704" rx="40" ry="72" transform="rotate(-12 818 704)" fill="#F7B9C9"/>')


def conch_g(x, y, s, rot=0):
    return f'<g transform="translate({x:.0f},{y:.0f}) rotate({rot}) scale({s:.3f}) translate(-600,-680)">{conch_elems(LW / s)}</g>'


def person_conch(cx, cy, r, blow=.6, tb=3.4):
    g = []
    g.append(shape(f"M{cx - r * .4:.0f},{cy + r * 1.22:.0f} C{cx - r * 1.1:.0f},{cy + r * 1.32:.0f} {cx - r * 1.6:.0f},{cy + r * 1.02:.0f} {cx - r * 2.3:.0f},{cy + r * 1.26:.0f} "
                   f"C{cx - r * 1.9:.0f},{cy + r * 1.56:.0f} {cx - r * 1.2:.0f},{cy + r * 1.7:.0f} {cx - r * .4:.0f},{cy + r * 1.56:.0f}Z", YEL))
    g.append(shape(f"M{cx - r * 1.2:.0f},{cy + r * tb:.0f} C{cx - r * 1.2:.0f},{cy + r * 1.6:.0f} {cx - r * .72:.0f},{cy + r * 1.12:.0f} {cx:.0f},{cy + r * 1.12:.0f} "
                   f"C{cx + r * .72:.0f},{cy + r * 1.12:.0f} {cx + r * 1.2:.0f},{cy + r * 1.6:.0f} {cx + r * 1.2:.0f},{cy + r * tb:.0f}Z", WHITE))
    g.append(f'<path d="M{cx - r * .3:.0f},{cy + r * 1.2:.0f} L{cx:.0f},{cy + r * 1.55:.0f} L{cx + r * .3:.0f},{cy + r * 1.2:.0f}" fill="none" stroke="{INK}" stroke-width="{LW * .8:.1f}" stroke-linejoin="round"/>')
    g.append(shape(f"M{cx - r * .58:.0f},{cy + r * 1.0:.0f} C{cx - r * .2:.0f},{cy + r * 1.2:.0f} {cx + r * .2:.0f},{cy + r * 1.2:.0f} {cx + r * .58:.0f},{cy + r * 1.0:.0f} "
                   f"L{cx + r * .62:.0f},{cy + r * 1.3:.0f} C{cx + r * .2:.0f},{cy + r * 1.5:.0f} {cx - r * .2:.0f},{cy + r * 1.5:.0f} {cx - r * .62:.0f},{cy + r * 1.3:.0f}Z", YEL))
    g.append(head_front(cx, cy, r, "closed", blow))
    g.append(thick(f"M{cx - r * .9:.0f},{cy + r * 1.8:.0f} C{cx - r * 1.6:.0f},{cy + r * 1.45:.0f} {cx - r * 1.62:.0f},{cy + r * .9:.0f} {cx - r * 1.3:.0f},{cy + r * .6:.0f}", WHITE, r * .4))
    g.append(conch_g(cx - r * 1.42, cy + r * .2, r * 1.15 / 560, -12))
    g.append(f'<circle cx="{cx - r * 1.26:.0f}" cy="{cy + r * .52:.0f}" r="{r * .21:.0f}" fill="{SKIN}" stroke="{INK}" stroke-width="{LW}"/>')
    for i in range(3):
        g.append(f'<path d="M{cx - r * 2.05 - i * r * .2:.0f},{cy - r * .05 - i * r * .05:.0f} q{-r * .12:.0f},{r * .28:.0f} 0,{r * .56:.0f}" fill="none" stroke="{INK}" stroke-width="{LW * .7:.1f}" stroke-linecap="round" opacity="{.8 - i * .2:.2f}"/>')
    return "".join(g)


# ------------------------------------------------------------------ riders / walker / table
def scooter2(x, y, s=1.0):
    """Protagonist drives, friend on the back seat; heading LEFT. Local: front wheel (0,0), rear (230,0)."""
    g = []
    for i, yy in enumerate((-40, -86, -132)):
        g.append(f'<line x1="{330 + i * 16}" y1="{yy}" x2="{420 + i * 16}" y2="{yy}" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>')
    g.append(shape("M206,-214 C260,-234 300,-200 360,-224 C330,-186 270,-182 210,-194Z", YEL))
    g.append(shape("M286,-250 C330,-262 362,-238 396,-256 C376,-224 336,-220 296,-232Z", HAIR))
    g.append(f'<circle cx="294" cy="-246" r="9" fill="{PINK}" stroke="{INK}" stroke-width="4"/>')
    g.append(shape("M-30,-20 C-36,-70 -12,-100 14,-100 L40,-100 L64,-42 L160,-42 L172,-84 L284,-88 C300,-70 302,-40 290,-20 L-20,-14Z", PINK))
    g.append(f'<rect x="170" y="-104" width="118" height="22" rx="10" fill="#3A3A46" stroke="{INK}" stroke-width="{LW}"/>')
    g.append(f'<path d="M16,-100 L0,-150 M-24,-152 L26,-148" fill="none" stroke="{INK}" stroke-width="{LW}" stroke-linecap="round"/>')
    g.append(f'<circle cx="-14" cy="-118" r="14" fill="{YEL}" stroke="{INK}" stroke-width="5"/>')
    # friend (behind)
    g.append(thick("M268,-104 L238,-70 L232,-42", NAVY, 26))
    g.append(shape("M236,-210 C226,-160 236,-122 252,-100 L304,-100 C304,-146 296,-186 282,-210Z", PINK))
    g.append(f'<circle cx="262" cy="-248" r="44" fill="{SKIN}" stroke="{INK}" stroke-width="{LW}"/>')
    g.append(shape("M216,-254 A47,47 0 0 1 308,-258 L312,-246 L212,-240Z", WHITE))
    g.append(eyes_closed(236, -246, 44) + f'<ellipse cx="232" cy="-226" rx="9" ry="6" fill="{PINK}" opacity=".7"/>')
    # driver
    g.append(thick("M196,-104 L120,-86 L88,-46", NAVY, 30))
    g.append(f'<ellipse cx="80" cy="-42" rx="20" ry="11" fill="{INK}"/>')
    g.append(shape("M150,-212 C138,-164 148,-124 168,-100 L234,-100 C228,-146 216,-186 198,-212Z", WHITE))
    g.append(thick("M248,-184 L206,-152", PINK, 22))
    g.append(f'<circle cx="202" cy="-150" r="12" fill="{SKIN}" stroke="{INK}" stroke-width="5"/>')
    g.append(shape("M150,-218 C170,-206 192,-206 206,-220 L208,-204 C190,-190 168,-190 148,-202Z", YEL))
    g.append(thick("M160,-186 C110,-170 60,-160 12,-150", WHITE, 24))
    g.append(f'<circle cx="10" cy="-150" r="13" fill="{SKIN}" stroke="{INK}" stroke-width="5"/>')
    g.append(shape("M206,-262 C236,-268 258,-252 278,-262 C262,-236 236,-232 210,-238Z", HAIR))
    g.append(f'<circle cx="176" cy="-254" r="48" fill="{SKIN}" stroke="{INK}" stroke-width="{LW}"/>')
    g.append(shape("M130,-262 A50,50 0 0 1 224,-268 L228,-254 L126,-248Z", ORANGE))
    g.append(shape("M128,-256 q-20,6 -10,24", SKIN))
    g.append(f'<ellipse cx="150" cy="-246" rx="6" ry="9" fill="{INK}"/><ellipse cx="152" cy="-226" rx="10" ry="6" fill="{PINK}" opacity=".7"/>')
    g.append(f'<path d="M132,-222 q10,8 22,2" fill="none" stroke="{INK}" stroke-width="5" stroke-linecap="round"/>')
    for wx in (0, 230):
        g.append(f'<circle cx="{wx}" cy="0" r="32" fill="{INK}"/><circle cx="{wx}" cy="0" r="12" fill="{PAPER}"/>')
    return f'<g transform="translate({x},{y}) scale({s})">{"".join(g)}</g>'


def walker(x, y, s=1.0, coat=ORANGE):
    """Grown-up protagonist walking LEFT with a suitcase; scarf + hair blown LEFT by the tail wind."""
    g = []
    g.append(shape("M-8,-200 C-60,-214 -110,-190 -164,-208 C-134,-172 -84,-170 -12,-180Z", YEL))
    g.append(f'<rect x="78" y="-112" width="76" height="104" rx="10" transform="rotate(10 116 -60)" fill="{RED}" stroke="{INK}" stroke-width="{LW}"/>')
    g.append(f'<path d="M84,-118 L72,-150 L60,-148" fill="none" stroke="{INK}" stroke-width="6" stroke-linecap="round"/>')
    g.append(f'<circle cx="88" cy="-2" r="9" fill="{INK}"/><circle cx="148" cy="8" r="9" fill="{INK}"/>')
    g.append(thick("M12,-64 L40,-8", NAVY, 24) + thick("M-10,-64 L-44,-8", NAVY, 24))
    g.append(f'<ellipse cx="-50" cy="-4" rx="20" ry="10" fill="{INK}"/><ellipse cx="46" cy="-4" rx="20" ry="10" fill="{INK}"/>')
    g.append(shape("M-40,-204 C-50,-150 -52,-100 -48,-58 L46,-58 C48,-110 42,-160 30,-204Z", coat))
    g.append(thick("M22,-184 L58,-148", coat, 22) + f'<circle cx="62" cy="-146" r="11" fill="{SKIN}" stroke="{INK}" stroke-width="5"/>')
    g.append(thick("M-24,-184 L-52,-132", coat, 20) + f'<circle cx="-54" cy="-128" r="11" fill="{SKIN}" stroke="{INK}" stroke-width="5"/>')
    g.append(shape("M-34,-210 C-14,-196 12,-196 30,-210 L32,-194 C12,-180 -14,-180 -36,-194Z", YEL))
    g.append(f'<ellipse cx="8" cy="-250" rx="50" ry="48" fill="{HAIR}" stroke="{INK}" stroke-width="{LW}"/>')
    g.append(f'<circle cx="-4" cy="-246" r="44" fill="{SKIN}" stroke="{INK}" stroke-width="{LW}"/>')
    g.append(shape("M-50,-262 C-40,-300 20,-306 48,-276 C40,-262 20,-258 4,-270 C-6,-256 -30,-252 -50,-262Z", HAIR))
    g.append(shape("M-46,-276 C-80,-290 -110,-276 -136,-290 C-112,-258 -80,-256 -48,-260Z", HAIR))
    g.append(shape("M-48,-246 q-16,8 -4,22", SKIN))
    g.append(f'<ellipse cx="-24" cy="-246" rx="6" ry="9" fill="{INK}"/><ellipse cx="-22" cy="-226" rx="9" ry="6" fill="{PINK}" opacity=".7"/>')
    return f'<g transform="translate({x},{y}) scale({s})">{"".join(g)}</g>'


def bowl_g(cx, cy, w, steam=True):
    g = []
    if steam:
        for dx in (-.4, 0, .4):
            g.append(f'<path d="M{cx + w * dx:.0f},{cy - w * .32:.0f} c{-w * .16:.0f},{-w * .18:.0f} {w * .14:.0f},{-w * .34:.0f} 0,{-w * .54:.0f} c{-w * .14:.0f},{-w * .2:.0f} {w * .1:.0f},{-w * .32:.0f} 0,{-w * .46:.0f}" fill="none" stroke="{INK}" stroke-width="5" stroke-linecap="round" opacity=".55"/>')
    g.append(shape(f"M{cx - w:.0f},{cy:.0f} C{cx - w * .95:.0f},{cy + w * .8:.0f} {cx + w * .95:.0f},{cy + w * .8:.0f} {cx + w:.0f},{cy:.0f}Z", WHITE))
    g.append(f'<path d="M{cx - w * .9:.0f},{cy + w * .22:.0f} C{cx - w * .5:.0f},{cy + w * .4:.0f} {cx + w * .5:.0f},{cy + w * .4:.0f} {cx + w * .9:.0f},{cy + w * .22:.0f}" fill="none" stroke="{TEALD}" stroke-width="{w * .08:.0f}" stroke-dasharray="{w * .12:.0f} {w * .06:.0f}"/>')
    g.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{w:.0f}" ry="{w * .2:.0f}" fill="#E9C98F" stroke="{INK}" stroke-width="{LW}"/>')
    for k in range(3):
        g.append(f'<path d="M{cx - w * .72:.0f},{cy + w * (.02 - .05 * k):.0f} q{w * .12:.0f},{-w * .1:.0f} {w * .24:.0f},0 t{w * .24:.0f},0 t{w * .24:.0f},0 t{w * .24:.0f},0" fill="none" stroke="{WHITE}" stroke-width="{w * .05:.1f}" stroke-linecap="round"/>')
    for bx, by in ((-.42, -.06), (.04, -.1), (.44, -.04)):
        g.append(f'<circle cx="{cx + w * bx:.0f}" cy="{cy + w * by:.0f}" r="{w * .2:.0f}" fill="{MEAT}" stroke="{INK}" stroke-width="5"/>'
                 f'<path d="M{cx + w * (bx - .1):.0f},{cy + w * (by - .08):.0f} q{w * .06:.0f},{-w * .06:.0f} {w * .12:.0f},{-w * .04:.0f}" stroke="#E0A87A" stroke-width="5" fill="none" stroke-linecap="round"/>')
    for bx, by in ((-.2, .06), (.24, .08), (-.62, .04), (.66, .02)):
        g.append(f'<circle cx="{cx + w * bx:.0f}" cy="{cy + w * by:.0f}" r="{w * .045:.1f}" fill="{BAMBOOL}" stroke="{INK}" stroke-width="2"/>')
    return "".join(g)


def person_bowl(cx, cy, r):
    g = []
    g.append(shape(f"M{cx - r * 1.3:.0f},{cy + r * 3.3:.0f} C{cx - r * 1.3:.0f},{cy + r * 1.7:.0f} {cx - r * .78:.0f},{cy + r * 1.1:.0f} {cx:.0f},{cy + r * 1.1:.0f} "
                   f"C{cx + r * .78:.0f},{cy + r * 1.1:.0f} {cx + r * 1.3:.0f},{cy + r * 1.7:.0f} {cx + r * 1.3:.0f},{cy + r * 3.3:.0f}Z", ORANGE))
    g.append(shape(f"M{cx - r * .42:.0f},{cy + r * 1.08:.0f} L{cx:.0f},{cy + r * 1.42:.0f} L{cx + r * .42:.0f},{cy + r * 1.08:.0f} L{cx + r * .2:.0f},{cy + r * 1.0:.0f} L{cx - r * .2:.0f},{cy + r * 1.0:.0f}Z", WHITE))
    g.append(head_front(cx, cy, r, "closed", 0))
    g.append(f'<rect x="{cx - r * 6:.0f}" y="{cy + r * 2.55:.0f}" width="{r * 12:.0f}" height="{r * 3:.0f}" fill="{WOOD}" stroke="{INK}" stroke-width="{LW}"/>')
    g.append(f'<line x1="{cx - r * 6:.0f}" y1="{cy + r * 2.85:.0f}" x2="{cx + r * 6:.0f}" y2="{cy + r * 2.85:.0f}" stroke="{INK}" stroke-width="4" opacity=".4"/>')
    for sx in (-1, 1):
        g.append(thick(f"M{cx + sx * r * 1.0:.0f},{cy + r * 1.6:.0f} C{cx + sx * r * 1.3:.0f},{cy + r * 2.0:.0f} {cx + sx * r * 1.2:.0f},{cy + r * 2.3:.0f} {cx + sx * r * 1.0:.0f},{cy + r * 2.35:.0f}", ORANGE, r * .36))
    g.append(bowl_g(cx, cy + r * 2.2, r * 1.0))
    for sx in (-1, 1):
        g.append(f'<circle cx="{cx + sx * r * 1.0:.0f}" cy="{cy + r * 2.36:.0f}" r="{r * .2:.0f}" fill="{SKIN}" stroke="{INK}" stroke-width="{LW}"/>')
    g.append(thick(f"M{cx + r * .25:.0f},{cy + r * 2.1:.0f} L{cx + r * 1.2:.0f},{cy + r * 1.3:.0f}", WOOD, 7, 3) + thick(f"M{cx + r * .38:.0f},{cy + r * 2.14:.0f} L{cx + r * 1.32:.0f},{cy + r * 1.4:.0f}", WOOD, 7, 3))
    return "".join(g)


def friends_back(x, y, s=1.0):
    """Two friends seen from behind sitting on a sea wall; wind from the right blows hair + scarf LEFT."""
    g = []
    g.append(f'<rect x="-260" y="0" width="520" height="70" fill="{STONE}" stroke="{INK}" stroke-width="{LW}"/>')
    g.append(shape("M-66,-90 C-100,-98 -130,-82 -164,-94 C-142,-70 -110,-66 -70,-74Z", YEL))
    g.append(shape("M-96,0 C-98,-62 -74,-104 -42,-104 C-10,-104 14,-62 12,0Z", WHITE))
    g.append(shape("M-72,-100 C-52,-86 -32,-86 -12,-100 L-10,-86 C-30,-72 -52,-72 -74,-86Z", YEL))
    g.append(f'<circle cx="-42" cy="-146" r="44" fill="{HAIR}" stroke="{INK}" stroke-width="{LW}"/>')
    g.append(shape("M-80,-170 C-110,-180 -130,-166 -150,-176 C-132,-150 -110,-146 -82,-150Z", HAIR))
    g.append(shape("M8,0 C6,-62 30,-104 60,-104 C90,-104 112,-62 110,0Z", PINK))
    g.append(f'<circle cx="62" cy="-146" r="42" fill="{HAIR}" stroke="{INK}" stroke-width="{LW}"/>')
    g.append(shape("M40,-166 C10,-176 -6,-156 -22,-176 C-6,-146 18,-136 42,-144Z", HAIR))
    g.append(f'<circle cx="40" cy="-160" r="8" fill="{PINK}" stroke="{INK}" stroke-width="4"/>')
    return f'<g transform="translate({x},{y}) scale({s})">{"".join(g)}</g>'


# ------------------------------------------------------------------ Hsinchu props
def rice_rack(x, y, s=1.0):
    """九降风晒米粉 — wooden rack with noodle bundles blown LEFT."""
    g = [thick("M-150,140 L-150,-128", BROWN, 18, 6), thick("M150,140 L150,-128", BROWN, 18, 6), thick("M-176,-124 L176,-124", BROWN, 16, 6)]
    for i in range(7):
        bx = -126 + i * 42
        for j in range(3):
            dx = (j - 1) * 7
            g.append(thick(f"M{bx + dx},-116 C{bx + dx - 4},-50 {bx + dx - 22},10 {bx + dx - 54 - j * 6},{70 + j * 8}", WHITE, 5, 2.5))
        g.append(f'<rect x="{bx - 9}" y="-124" width="18" height="16" rx="3" fill="{BUFF}" stroke="{INK}" stroke-width="3"/>')
    return f'<g transform="translate({x},{y}) scale({s})">{"".join(g)}</g>'


def persimmon(x, y, r):
    g = [f'<ellipse cx="{x}" cy="{y}" rx="{r}" ry="{r * .8:.0f}" fill="{ORANGE}" stroke="{INK}" stroke-width="5"/>',
         f'<path d="M{x - r * .55:.0f},{y - r * .2:.0f} q{r * .1:.0f},{-r * .3:.0f} {r * .4:.0f},{-r * .36:.0f}" stroke="#FFD2A0" stroke-width="5" fill="none" stroke-linecap="round"/>']
    for a in (0, 90, 180, 270):
        g.append(f'<ellipse cx="{x}" cy="{y - r * .72:.0f}" rx="{r * .24:.0f}" ry="{r * .1:.0f}" transform="rotate({a + 20} {x} {y - r * .72:.0f}) translate({r * .16:.0f},0)" fill="{BAMBOO}" stroke="{INK}" stroke-width="3"/>')
    g.append(f'<circle cx="{x + r * .2:.0f}" cy="{y + r * .25:.0f}" r="{r * .06:.1f}" fill="{WHITE}" opacity=".7"/><circle cx="{x - r * .3:.0f}" cy="{y + r * .35:.0f}" r="{r * .05:.1f}" fill="{WHITE}" opacity=".7"/>')
    return "".join(g)


def persimmon_tray(x, y, s=1.0):
    g = [f'<ellipse cx="0" cy="0" rx="168" ry="64" fill="{BUFF}" stroke="{INK}" stroke-width="{LW}"/>',
         f'<ellipse cx="0" cy="-4" rx="140" ry="48" fill="none" stroke="{INK}" stroke-width="4" opacity=".5"/>']
    for k in range(-4, 5):
        g.append(f'<line x1="{k * 30 - 14}" y1="-44" x2="{k * 30 + 14}" y2="44" stroke="{INK}" stroke-width="2" opacity=".25"/>')
    for px, py in ((-92, -12), (-30, -26), (36, -22), (98, -6), (2, 16)):
        g.append(persimmon(px, py, 36))
    return f'<g transform="translate({x},{y}) scale({s})">{"".join(g)}</g>'


def kite(x, y, s=1.0, rot=0, tail=1.0, string=True):
    g = []
    if string:
        g.append(f'<path d="M0,0 C120,200 220,420 320,640" fill="none" stroke="{INK}" stroke-width="3" opacity=".55"/>')
    g.append(f'<path d="M0,120 C30,{120 + 50 * tail:.0f} -20,{120 + 100 * tail:.0f} 20,{120 + 150 * tail:.0f} C50,{120 + 190 * tail:.0f} 10,{120 + 230 * tail:.0f} 40,{120 + 270 * tail:.0f}" fill="none" stroke="{INK}" stroke-width="5" stroke-linecap="round"/>')
    for by in (.42, .8):
        cy = 120 + 270 * tail * by
        g.append(f'<path d="M{6},{cy:.0f} l-26,-14 l0,28Z M{6},{cy:.0f} l26,-14 l0,28Z" fill="{RED}" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>')
    for pts, c in ((("0,-110", "78,0", "0,0"), PINK), (("78,0", "0,120", "0,0"), YEL), (("0,120", "-78,0", "0,0"), TEAL), (("-78,0", "0,-110", "0,0"), ORANGE)):
        g.append(f'<polygon points="{" ".join(pts)}" fill="{c}" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>')
    g.append(f'<path d="M0,-110 L0,120 M-78,0 L78,0" stroke="{INK}" stroke-width="5"/>')
    return f'<g transform="translate({x},{y}) rotate({rot}) scale({s})">{"".join(g)}</g>'


def crab(x, y, s=1.0):
    """香山湿地的台湾招潮蟹 — one huge claw raised (waving)."""
    g = []
    for sx in (-1, 1):
        for k in range(3):
            g.append(f'<path d="M{sx * 44},{4 + k * 10} L{sx * (88 + k * 8)},{26 + k * 14} L{sx * (100 + k * 6)},{60 + k * 10}" fill="none" stroke="{INK}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>')
    g.append(f'<ellipse cx="0" cy="0" rx="72" ry="46" fill="{ORANGE}" stroke="{INK}" stroke-width="{LW}"/>')
    g.append(f'<path d="M-30,10 q30,18 60,0" fill="none" stroke="{INK}" stroke-width="5" stroke-linecap="round"/>')
    for sx in (-1, 1):
        g.append(f'<line x1="{sx * 20}" y1="-40" x2="{sx * 28}" y2="-90" stroke="{INK}" stroke-width="6"/><circle cx="{sx * 28}" cy="-96" r="14" fill="{WHITE}" stroke="{INK}" stroke-width="5"/><circle cx="{sx * 30}" cy="-96" r="6" fill="{INK}"/>')
    g.append(thick("M56,-18 L108,-78", RED, 18))
    g.append(shape("M94,-96 C88,-150 150,-172 172,-132 C152,-132 136,-122 130,-106 C150,-100 162,-86 152,-70 C132,-60 106,-70 94,-96Z", RED))
    g.append(thick("M-56,-12 L-86,-38", ORANGE, 12) + f'<circle cx="-92" cy="-44" r="14" fill="{ORANGE}" stroke="{INK}" stroke-width="5"/>')
    return f'<g transform="translate({x},{y}) scale({s})">{"".join(g)}</g>'


HEART = "M0,70 C-130,0 -150,-110 -70,-125 C-35,-131 -8,-105 0,-80 C8,-105 35,-131 70,-125 C150,-110 130,0 0,70Z"


def heart_weir(x, y, s=1.0, water=True):
    """香山湿地的心型石沪 — heart-shaped stone fish weir in the sea."""
    g = []
    if water:
        g.append(f'<ellipse cx="0" cy="-20" rx="200" ry="120" fill="{TEAL}" stroke="{INK}" stroke-width="{LW}"/>')
    g.append(f'<path d="{HEART}" fill="#5FCBB8" stroke="none"/>')
    g.append(f'<path d="{HEART}" fill="none" stroke="{INK}" stroke-width="34" stroke-dasharray="0.1 30" stroke-linecap="round"/>')
    g.append(f'<path d="{HEART}" fill="none" stroke="{STONE}" stroke-width="22" stroke-dasharray="0.1 30" stroke-linecap="round"/>')
    return f'<g transform="translate({x},{y}) scale({s})">{"".join(g)}</g>'


def shoot(x, y, s=1.0):
    """备选 B：竹笋仔."""
    g = [leaf(-34, -184, 76, 200, BAMBOOL), leaf(-8, -206, 64, 214, BAMBOO),
         shape("M0,-170 C30,-130 74,-50 78,30 C80,80 46,100 0,100 C-46,100 -80,80 -78,30 C-74,-50 -30,-130 0,-170Z", "#E2CF78"),
         shape("M-78,30 C-72,-30 -42,-90 -6,-120 C-24,-62 -34,10 -26,98 C-56,92 -80,70 -78,30Z", "#9DB04E"),
         shape("M78,30 C72,-30 42,-90 6,-120 C24,-62 34,10 26,98 C56,92 80,70 78,30Z", "#9DB04E"),
         shape("M-34,98 C-38,62 -16,40 0,30 C16,40 38,62 34,98 C20,102 -20,102 -34,98Z", "#B9C960")]
    for sx in (-1, 1):
        g.append(f'<ellipse cx="{sx * 22}" cy="-14" rx="7" ry="11" fill="{INK}"/><ellipse cx="{sx * 40}" cy="6" rx="12" ry="7" fill="{PINK}" opacity=".7"/>')
    g.append(f'<path d="M-12,8 Q0,20 12,8" fill="none" stroke="{INK}" stroke-width="5" stroke-linecap="round"/>')
    return f'<g transform="translate({x},{y}) scale({s})">{"".join(g)}</g>'


def bamboo_kid(x, y, s=1.0):
    g = [stalk("M0,120 C4,0 2,-160 -10,-300", [(1, 40, 0), (3, -60, 0), (0, -170, -3), (-6, -250, -5)], 70),
         leaf(-70, -300, 110, 200, BAMBOOL), leaf(-40, -330, 90, 215, BAMBOO), leaf(40, -200, 90, -20, BAMBOOL)]
    for sx in (-1, 1):
        g.append(f'<ellipse cx="{sx * 16}" cy="-110" rx="7" ry="11" fill="{INK}"/><ellipse cx="{sx * 28}" cy="-90" rx="10" ry="6" fill="{PINK}" opacity=".7"/>')
    g.append(f'<path d="M-10,-86 Q0,-76 10,-86" fill="none" stroke="{INK}" stroke-width="5" stroke-linecap="round"/>')
    return f'<g transform="translate({x},{y}) scale({s})">{"".join(g)}</g>'


def strand(x, y, L=120):
    """A loose rice-noodle strand flying left."""
    return thick(f"M{x},{y} c{-L * .3:.0f},{-L * .12:.0f} {-L * .6:.0f},{L * .12:.0f} {-L:.0f},0", WHITE, 5, 2.5)
