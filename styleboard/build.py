# NEO-Cine gallery: styles/*/style.json → catalog.json, index.html, and the generated parts of README.md, README.zh-CN.md, styles/README.md, AGENTS.md, AGENTS.zh-CN.md
# Adapted from Lemo-Opuscar's styleboard/build.py (MIT, © 2026 LemoLab; see UPSTREAM.md): the same data flow and card markup,
# without upstream's feature film, stylebook and thank-you pages; the feature above the grid is the newest style.
# Local:          python3 styleboard/build.py                 (also refreshes each style.json "dur" from its mp4)
# GitHub Pages:   python3 styleboard/build.py --site _site
# README frames:  python3 styleboard/build.py --frames <slug>… (docs/frames/<slug>.jpg at the style's frame_sec)
import argparse, json, re, html, os, glob, shutil, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
CATALOG = os.path.join(HERE, 'catalog.json')   # generated; CI reads it

REPO = 'neohoy/neo-cine'
FILMS_URL = f'https://github.com/{REPO}/releases/download/films'   # full films live on the "films" release as <slug>.mp4
BLOB_URL = f'https://github.com/{REPO}/blob/main'

# The categories, in gallery order (upstream's, plus NEO-Cine's own Real Maps: styles drawn over real map data, see neo/geo/). A style.json must name one of them (both languages, exactly).
CATEGORIES = [('剪辑与纪实', 'Edit & Documentary'), ('实证影像', 'Evidence Films'), ('真实地图', 'Real Maps'), ('手绘与绘画', 'Hand-drawn & Painting'), ('东方传统', 'East Asian Traditions'), ('印刷与版画', 'Print & Printmaking'),
              ('图形与排版', 'Graphic & Type'), ('信息与发布', 'Information & Keynote'), ('卡通与动画', 'Cartoon & Anime'),
              ('游戏', 'Games'), ('电影与时代', 'Cinema & Eras'), ('材质与 3D', 'Materials & 3D')]
# A note under a category's heading, in the gallery and in both READMEs: (Chinese, English).
CAT_NOTES = {'真实地图': ('基于 OpenStreetMap（今天的地面）和 OpenHistoricalMap（历年的边界、铁路、路线）的系列：地图是真的，画法每个风格各不相同。',
                      'A series built on OpenStreetMap (the ground as it is today) and OpenHistoricalMap (borders, railways and routes by year): the map is real, the look changes from style to style.')}
# The latest release's styles: the README shows them in a group of their own above the categories (and not again in their category). Empty it to drop the group.
NEWEST = ('2026-11-10', [])
FIELDS = ('slug', 'num', 'en', 'cn', 'category_en', 'category_cn', 'film', 'line', 'line_cn', 'uses', 'frame_sec', 'dur')


def film_seconds(mp4):
    """Length of a film in seconds, or None when ffprobe can't read it (a half-rendered file, no ffprobe installed)."""
    try:
        d = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4], capture_output=True, text=True).stdout)
    except (ValueError, OSError): return None
    return d if d > 0 else None


def load_styles(refresh_dur):
    """Every styles/<slug>/style.json (folders starting with _ are templates). Fails loudly on a missing field or an unknown category.
    With refresh_dur, "dur" is re-read from styles/<slug>/<slug>.mp4 and written back when it changed; without the mp4
    (another machine, CI) or when ffprobe can't read it, the stored value is kept, never zeroed (0 = no video in the gallery)."""
    out, bad = [], []
    for p in sorted(glob.glob(os.path.join(ROOT, 'styles', '*', 'style.json'))):
        slug = os.path.basename(os.path.dirname(p))
        if slug.startswith('_'): continue
        j = json.load(open(p, encoding='utf-8'))
        miss = [f for f in FIELDS if f not in j]
        if miss: bad.append(f'styles/{slug}/style.json: missing {", ".join(miss)}'); continue
        if j['slug'] != slug: bad.append(f'styles/{slug}/style.json: slug is "{j["slug"]}", folder is "{slug}"')
        if (j['category_cn'], j['category_en']) not in CATEGORIES:
            bad.append(f'styles/{slug}/style.json: unknown category "{j["category_en"]} / {j["category_cn"]}" (see CATEGORIES in styleboard/build.py)')
        mp4 = os.path.join(ROOT, 'styles', slug, slug + '.mp4')
        if refresh_dur and os.path.exists(mp4):
            d = film_seconds(mp4)
            if d is None:
                print(f'WARNING: styles/{slug}/{slug}.mp4 exists but ffprobe cannot read its duration (half-rendered? no ffprobe?); keeping dur={j["dur"]}')
            elif round(d, 1) != j['dur']:
                j['dur'] = round(d, 1)
                open(p, 'w', encoding='utf-8').write(json.dumps(j, ensure_ascii=False, indent=1) + '\n')
        out.append(dict(slug=slug, num=j['num'], en=j['en'], cn=j['cn'], cat=j['category_cn'], cat_en=j['category_en'],
                        film=j['film'], line=j['line'], line_cn=j['line_cn'], uses=j['uses'], dur=j['dur'], frame_sec=j['frame_sec'],
                        **({'by': j['by']} if j.get('by') else {})))   # optional {"name", "url"}: a style contributed from outside, credited on its card and README cell
    if bad: raise SystemExit('styleboard/build.py:\n  ' + '\n  '.join(bad))
    order = {c: i for i, c in enumerate(CATEGORIES)}
    out.sort(key=lambda s: (order.get((s['cat'], s['cat_en']), 99), int(re.match(r'\d+', s['num']).group()), s['num']))
    return out


def grab_frames(styles, slugs):
    """docs/frames/<slug>.jpg for the README grid: one frame of the film at the style's frame_sec."""
    by = {s['slug']: s for s in styles}
    os.makedirs(os.path.join(ROOT, 'docs', 'frames'), exist_ok=True)
    for slug in slugs:
        s = by.get(slug) or exit(f'no style "{slug}"')
        mp4 = os.path.join(ROOT, 'styles', slug, slug + '.mp4')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(s['frame_sec']), '-i', mp4, '-frames:v', '1', '-vf', 'scale=800:450', '-q:v', '3',
                        os.path.join(ROOT, 'docs', 'frames', slug + '.jpg')], check=True)
        print(f'docs/frames/{slug}.jpg ← {slug}.mp4 @ {s["frame_sec"]}s')


ap = argparse.ArgumentParser()
ap.add_argument('--site', help='build the GitHub Pages site into this folder (films from Releases)')
ap.add_argument('--frames', nargs='+', metavar='SLUG', help='only re-grab docs/frames/<slug>.jpg from the film at frame_sec, then stop')
args = ap.parse_args()
site = args.site

styles = load_styles(refresh_dur=not site and not args.frames)
if args.frames: grab_frames(styles, args.frames); raise SystemExit
if not site:
    json.dump([{k: v for k, v in s.items() if k != 'frame_sec'} for s in styles], open(CATALOG, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

if site:   # the public gallery only lists finished styles (with a STYLE.md)
    styles = [s for s in styles if os.path.exists(os.path.join(ROOT, 'styles', s['slug'], 'STYLE.md'))]
for s in styles:
    slug = s['slug']
    s['imgs'] = sorted(os.path.basename(p) for p in glob.glob(os.path.join(HERE, 'img', slug + '_*.jpg')))
    has_poster = os.path.exists(os.path.join(ROOT, 'styles', slug, 'poster.jpg'))
    has_md = os.path.exists(os.path.join(ROOT, 'styles', slug, 'STYLE.md'))
    has_zh = os.path.exists(os.path.join(ROOT, 'styles', slug, 'STYLE.zh-CN.md'))   # NEO-Cine: every doc has a Chinese translation next to it
    if site:
        s['video'] = f'films/{slug}.mp4' if s['dur'] else ''          # 720p web cut, served by Pages as video/mp4 (Safari needs it)
        s['full'] = f'{FILMS_URL}/{slug}.mp4' if s['dur'] else ''       # full quality on Releases
        s['poster'] = f'posters/{slug}.jpg' if has_poster else ''
        s['stylemd'] = f'{BLOB_URL}/styles/{slug}/STYLE.md' if has_md else ''
        s['stylemd_zh'] = f'{BLOB_URL}/styles/{slug}/STYLE.zh-CN.md' if has_zh else ''
    else:
        s['video'] = f'../styles/{slug}/{slug}.mp4' if os.path.exists(os.path.join(ROOT, 'styles', slug, slug + '.mp4')) else ''
        s['poster'] = f'../styles/{slug}/poster.jpg' if has_poster else ''
        s['stylemd'] = f'../styles/{slug}/STYLE.md' if has_md else ''
        s['stylemd_zh'] = f'../styles/{slug}/STYLE.zh-CN.md' if has_zh else ''

esc = lambda t: html.escape(t or '')

def mmss(d): r = round(d); return f'{r // 60}:{r % 60:02d}'

def by_line(s):
    b = s.get('by')
    if not b: return ''
    a = f'<a href="{esc(b["url"])}" target="_blank" rel="noopener">@{esc(b["name"])}</a>'
    return f'    <p class="by">Contributed by {a}<span>由 {a} 提供</span></p>\n'

def card(s):
    img = f'img/{s["imgs"][0]}' if s['imgs'] else s.get('poster', '')
    vid = bool(s.get('video'))
    film = s.get('film') or s['en']
    main = f'<img class="still" src="{esc(img)}" alt="{esc(s["en"])} — {esc(film)}" loading="lazy">' if img else '<div class="empty">Coming soon</div>'
    play = (f'<button class="play" type="button" data-src="{esc(s["video"])}" data-poster="{esc(s.get("poster", ""))}" '
            f'aria-label="Play {esc(film)}"><i></i><span>{mmss(s["dur"])}</span></button>') if vid else ''
    uses = ''.join(f'<li>{esc(u)}</li>' for u in s.get('uses', []))
    uses = f'<ul class=uses aria-label="Best for">{uses}</ul>' if uses else ''   # built here, not inside the f-string below: Python before 3.12 has no backslash there
    links = []
    if vid: links.append(f'<a class="watch" href="{esc(s.get("full") or s["video"])}" data-play>Watch the film</a>')
    if s.get('stylemd'): links.append(f'<a href="{esc(s["stylemd"])}" target="_blank" rel="noopener">STYLE.md</a>')
    if s.get('stylemd_zh'): links.append(f'<a href="{esc(s["stylemd_zh"])}" target="_blank" rel="noopener">风格说明</a>')
    return (f'<article class="nominee" data-slug="{esc(s["slug"])}" data-en="{esc(s["en"])}" data-cn="{esc(s["cn"])}" data-film="{esc(film)}">\n'
            f'  <div class="screen">{main}{play}</div>\n'
            f'  <div class="plate">\n'
            f'    <p class="no">{esc(s["num"])}</p>\n'
            f'    <h3>{esc(s["en"])}</h3><p class="cn">{esc(s["cn"])}</p>\n'
            f'    <p class="for">for <em>{esc(film)}</em></p>\n'
            f'    <p class="line">{esc(s.get("line", ""))}</p><p class="line-cn">{esc(s.get("line_cn", ""))}</p>\n'
            f'{by_line(s)}'
            f'    {uses}\n'
            f'    <nav class="links">{"".join(links)}</nav>\n'
            f'  </div>\n</article>')

cats = [c for c in CATEGORIES if any((s['cat'], s['cat_en']) == c for s in styles)]
# The gallery shows every style once, in the order of its number: no feature above the grid, no category sections or tabs.
by_num = sorted(styles, key=lambda s: (int(re.match(r'\d+', s['num']).group()), s['num']))
sections = ['<section class="category" id="styles">\n  <div class="grid">\n' + '\n'.join(map(card, by_num)) + '\n  </div>\n</section>']

n_vid = sum(bool(s.get('video')) for s in styles)
seconds = sum(s.get('dur', 0) for s in styles)
minutes = seconds / 60
n_all = len(styles)

# The newest style that has a film (the highest num): its poster is the site's share card.
FEATURE = max((s for s in styles if s.get('video')), key=lambda s: int(re.match(r'\d+', s['num']).group()), default=None)

def stats():
    """The three numbers under the title: styles, categories, film length (seconds until there are two minutes of it)."""
    film = (f'{minutes:.0f}', 'Minutes of film', '分钟影片') if seconds >= 120 else (f'{seconds:.0f}', 'Seconds of film', '秒影片')
    rows = [(str(n_all), 'Style' if n_all == 1 else 'Styles', '种风格'), (str(len(cats)), 'Category' if len(cats) == 1 else 'Categories', '个分类'), film]
    return ''.join(f'<div class="stat"><b>{n}</b><span>{en}<small>{cn}</small></span></div>' for n, en, cn in rows)

# What search engines and AI answer engines read: canonical URL, share cards, JSON-LD naming the repo and its author.
# Forks copy this file, so the canonical and codeRepository keep pointing here.
SITE_URL = 'https://neohoy.github.io/neo-cine/'
REPO_URL = f'https://github.com/{REPO}'
AUTHOR = {'@type': 'Person', '@id': 'https://github.com/neohoy', 'name': 'NEO', 'url': 'https://github.com/neohoy', 'sameAs': ['https://github.com/neohoy']}
GALLERY_DESC = (f'NEO-Cine: film styles for Claude Code, made one at a time ({n_all} so far). Each style is a reusable prompt plus a short film '
                'made entirely in code, with no video model. Official site of github.com/' + REPO + '.')
REPO_LD = {'@type': 'SoftwareSourceCode', '@id': REPO_URL, 'name': 'NEO-Cine', 'url': REPO_URL, 'codeRepository': REPO_URL,
           'description': 'Film styles, each a style prompt plus a demo film made entirely in code, packaged as a Claude Code skill. Built on the framework of Lemo-Opuscar.',
           'license': 'https://opensource.org/licenses/MIT', 'author': {'@id': AUTHOR['@id']}, 'isBasedOn': 'https://github.com/lemomo-ai/lemo-opuscar',
           'keywords': ['Claude Code skill', 'film styles', 'no video model', 'motion graphics', 'creative coding']}

def head_meta(url, title, desc, image, ld):
    """canonical + Open Graph + Twitter card + one JSON-LD block, for the <head> of a site page."""
    e = html.escape
    tags = [f'<link rel="canonical" href="{url}">',
            '<meta property="og:type" content="website">', '<meta property="og:site_name" content="NEO-Cine">',
            f'<meta property="og:url" content="{url}">', f'<meta property="og:title" content="{e(title)}">',
            f'<meta property="og:description" content="{e(desc)}">', f'<meta property="og:image" content="{image}">',
            '<meta name="twitter:card" content="summary_large_image">',
            f'<meta name="twitter:title" content="{e(title)}">', f'<meta name="twitter:description" content="{e(desc)}">',
            f'<meta name="twitter:image" content="{image}">']
    data = json.dumps({'@context': 'https://schema.org', '@graph': ld}, ensure_ascii=False, indent=1).replace('</', '<\\/')
    return '\n'.join(tags) + f'\n<script type="application/ld+json">\n{data}\n</script>'

poster_abs = SITE_URL + (f'posters/{FEATURE["slug"]}.jpg' if FEATURE else '')
gallery_meta = head_meta(SITE_URL, 'NEO-Cine · film styles for Claude Code, made in code', GALLERY_DESC, poster_abs,
                         [{'@type': 'CollectionPage', '@id': SITE_URL, 'url': SITE_URL, 'name': 'NEO-Cine gallery', 'description': GALLERY_DESC,
                           'about': {'@id': REPO_URL}, 'author': {'@id': AUTHOR['@id']}}, REPO_LD, AUTHOR])

def fill(name, extra):
    page = open(os.path.join(HERE, name), encoding='utf-8').read()
    for k, v in {**extra, '{{N_ALL}}': str(n_all), '{{N_VID}}': str(n_vid), '{{N_CAT}}': str(len(cats)), '{{MIN}}': f'{minutes:.0f}',
                 '{{REPO_URL}}': REPO_URL, '{{REPO}}': REPO}.items():
        page = page.replace(k, v)
    return page

out_dir = site or HERE
os.makedirs(out_dir, exist_ok=True)
open(os.path.join(out_dir, 'index.html'), 'w', encoding='utf-8').write(fill('template.html', {
    '{{SECTIONS}}': '\n'.join(sections), '{{TABS_NAV}}': '', '{{FEATURE}}': '', '{{STATS}}': stats(),
    '{{DESC}}': html.escape(GALLERY_DESC), '{{HEAD_META}}': gallery_meta}))

def llms_txt():
    """llms.txt (llmstxt.org): what the project is, where the repo is, and a link per style."""
    out = ['# NEO-Cine', '',
           f'> Film styles for Claude Code, made one at a time ({n_all} so far). Each style is a reusable style prompt (STYLE.md) plus a short demo film '
           'made entirely in code, with no video model. Install it as a Claude Code skill, pick a style, bring your own topic, and your agent directs the film.', '',
           f'Official repository: {REPO_URL} (by NEO, https://github.com/neohoy). Built on the framework of Lemo-Opuscar (https://github.com/lemomo-ai/lemo-opuscar).', '',
           '## Start here', '',
           f'- [README]({BLOB_URL}/README.md): what it is, how to install the skill, the style grid',
           f'- [README in Chinese]({BLOB_URL}/README.zh-CN.md): the same in Simplified Chinese',
           f'- [Agent instructions]({BLOB_URL}/AGENTS.md): how an agent directs a film in one of the styles',
           f'- [Gallery]({SITE_URL}): every style with its demo film', '']
    for cn, en in cats:
        group = [x for x in styles if x['cat'] == cn and x['stylemd']]
        if not group: continue
        out += [f'## {en}', '']
        out += [f'- [{s["en"]} · {s["cn"]}]({BLOB_URL}/styles/{s["slug"]}/STYLE.md): {s["line"]}' for s in group]
        out.append('')
    return '\n'.join(out)

if site:   # Pages site: page + style frames + posters + llms.txt + sitemap
    shutil.copytree(os.path.join(HERE, 'img'), os.path.join(site, 'img'), dirs_exist_ok=True)
    os.makedirs(os.path.join(site, 'posters'), exist_ok=True)
    for s in styles:
        if s['poster']: shutil.copy(os.path.join(ROOT, 'styles', s['slug'], 'poster.jpg'), os.path.join(site, 'posters', s['slug'] + '.jpg'))
    open(os.path.join(site, 'llms.txt'), 'w', encoding='utf-8').write(llms_txt())
    open(os.path.join(site, 'sitemap.xml'), 'w', encoding='utf-8').write(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + ''.join(f'  <url><loc>{u}</loc></url>\n' for u in (SITE_URL,)) + '</urlset>\n')


def readme_by(s, zh):
    b = s.get('by')
    if not b: return ''
    a = f'<a href="{html.escape(b["url"])}">@{html.escape(b["name"])}</a>'
    return f'<br><sub>由 {a} 提供</sub>' if zh else f'<br><sub>Contributed by {a}</sub>'


def readme_grid(zh):
    """README.md (English) and README.zh-CN.md (Chinese, with the English name under it), between <!-- styles:start --> and <!-- styles:end -->:
    every style in one grid, in the order of its number: one frame (docs/frames/<slug>.jpg), the name, category, demo film and length,
    one line of description, and links to the style prompt, the demo notes and the 1080p film. The Chinese grid links the .zh-CN.md
    files where there are any; a short last row is padded to three cells, so the columns keep their width. Under the grid, one line
    per category that has a note (CAT_NOTES), naming its styles by number."""
    group = sorted((x for x in styles if x['stylemd']), key=lambda s: (int(re.match(r'\d+', s['num']).group()), s['num']))
    out = ['\n<table>']
    for i in range(0, len(group), 3):
        out.append('<tr>')
        for s in group[i:i + 3]:
            d = os.path.join(ROOT, 'styles', s['slug'])
            if zh:
                name = f'<b>{s["num"]} · {html.escape(s["cn"])}</b>' + (f'<br>{html.escape(s["en"])}' if s['cn'] != s['en'] else '')
                alt, line, cat = s['cn'], s['line_cn'], s['cat']
            else:
                name, alt, line, cat = f'<b>{s["num"]} · {html.escape(s["en"])}</b>', s['en'], s['line'], s['cat_en']
            md = 'STYLE.zh-CN.md' if zh and s.get('stylemd_zh') else 'STYLE.md'
            demo = next((f for f in ((['DEMO.zh-CN.md'] if zh else []) + ['DEMO.md']) if os.path.exists(os.path.join(d, f))), None)
            links = [f'<a href="styles/{s["slug"]}/{md}">{"风格说明" if zh else "Style prompt"}</a>']
            if demo: links.append(f'<a href="styles/{s["slug"]}/{demo}">{"示范片说明" if zh else "Demo notes"}</a>')
            if s['dur'] > 0: links.append(f'<a href="https://github.com/{REPO}/releases/download/films/{s["slug"]}.mp4">{"下载 1080p" if zh else "Download 1080p"}</a>')
            film = f'<i>{html.escape(s["film"])}</i>' + (f' · {mmss(s["dur"])}' if s['dur'] > 0 else '')
            out.append(f'<td width="33%" valign="top"><a href="styles/{s["slug"]}/{md}"><img src="docs/frames/{s["slug"]}.jpg" alt="{html.escape(alt)}"></a><br>'
                       f'{name}<br><sub>{html.escape(cat)} · {film}</sub><br>{html.escape(line)}{readme_by(s, zh)}<br><sub>{" · ".join(links)}</sub></td>')
        out += ['<td width="33%" valign="top"></td>'] * (3 - len(group[i:i + 3]))
        out.append('</tr>')
    out.append('</table>')
    for cn, en in cats:
        note = CAT_NOTES.get(cn, ('', ''))[0 if zh else 1]
        nums = [s['num'] for s in group if s['cat'] == cn]
        if note and nums:
            out.append(f'\n<sub><b>{cn}</b>（{"、".join(nums)}）：{note}</sub>' if zh else f'\n<sub><b>{en}</b> ({", ".join(nums)}): {note}</sub>')
    return '\n'.join(out) + '\n'


for fn, zh in (('README.md', False), ('README.zh-CN.md', True)):
    p = os.path.join(ROOT, fn)
    if not os.path.exists(p) or site: continue
    t = open(p, encoding='utf-8').read()
    t2 = re.sub(r'(<!-- styles:start -->\n).*?(<!-- styles:end -->)', lambda m: m.group(1) + readme_grid(zh) + m.group(2), t, flags=re.S)
    t2 = re.sub(r'<!--n-->\d+<!--/n-->', f'<!--n-->{sum(1 for x in styles if x["stylemd"])}<!--/n-->', t2)    # the headline count
    if t2 != t: open(p, 'w', encoding='utf-8').write(t2)


def style_index():
    """styles/README.md: style name (English / Chinese) → folder. Agents look up the STYLE.md for the name a user gives here."""
    out = ['# Style index · 风格索引', '',
           'Users may name a style in English, in Chinese, or by its folder. Find it here, then read `styles/<folder>/STYLE.md`.',
           '用户可能用英文名、中文名或文件夹名来指定风格。在这里查到文件夹，再读 `styles/<文件夹>/STYLE.md`。', '<!-- generated by styleboard/build.py from styles/*/style.json; do not edit by hand -->', '']
    for cn, en in cats:
        group = [x for x in styles if x['cat'] == cn and x['stylemd']]
        if not group: continue
        out += [f'## {en} · {cn}', '', '| Style | 风格 | Folder | Our demo |', '|---|---|---|---|']
        out += [f'| {s["en"]} | {s["cn"]} | [`{s["slug"]}`]({s["slug"]}/STYLE.md) | *{s["film"]}* |' for s in group]
        out.append('')
    return '\n'.join(out)


def style_list():
    """AGENTS.md and AGENTS.zh-CN.md, between <!-- style-list:start --> and <!-- style-list:end -->: the full list an agent shows a user who has not picked a style."""
    out = [f'All styles ({sum(1 for x in styles if x["stylemd"])}) · 全部风格:', '']
    for cn, en in cats:
        group = [x for x in styles if x['cat'] == cn and x['stylemd']]
        if not group: continue
        names = ', '.join(s['en'] if s['cn'] == s['en'] else f'{s["cn"]} {s["en"]}' for s in group)
        out.append(f'- **{cn} {en}** ({len(group)}): {names}')
    return '\n'.join(out) + '\n'


if not site:
    open(os.path.join(ROOT, 'styles', 'README.md'), 'w', encoding='utf-8').write(style_index())
    for fn in ('AGENTS.md', 'AGENTS.zh-CN.md'):
        p = os.path.join(ROOT, fn)
        if not os.path.exists(p): continue
        t = open(p, encoding='utf-8').read()
        t2 = re.sub(r'(<!-- style-list:start -->\n).*?(<!-- style-list:end -->)', lambda m: m.group(1) + style_list() + m.group(2), t, flags=re.S)
        if t2 != t: open(p, 'w', encoding='utf-8').write(t2)

print(f'{len(styles)} styles ({n_vid} with film, {minutes:.1f} min) → {os.path.relpath(os.path.join(out_dir, "index.html"), ROOT)}')
for s in styles:
    if not s['imgs']: print('  no image:', s['slug'])
    if not s.get('line'): print('  no card copy (style.json line):', s['slug'])
