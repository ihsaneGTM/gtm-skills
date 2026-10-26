#!/usr/bin/env python3
"""Shots from YouTube for the motion videos: search, look, cut, file. Ported from the reference brand's broll.py (2026-10-05),
its subject keywords made presets (car, software, product, place, generic) or arguments.

One library per subject, shared by every video: workspace/motion/broll/<key>/
  subject.json      its label, queries, words required / to avoid, preset
  candidates.json   search results, metadata, score (nothing downloaded)
  picks.json        the seconds kept in each source (written by hand after looking at the sheets)
  clips/<key>-NN.mp4   the shots kept: vertical ones 1080 × 1920, horizontal ones whole (1440 high at most), 30 fps,
                    silent, ready for the edit
  manifest.json     for each shot: the source video, its channel, followers, licence, the seconds taken, what it shows

Previews (240p videos, contact sheets) go to ~/Library/Caches/gtm-motion/broll: out of iCloud, made again at will.
Only the seconds kept are downloaded: yt-dlp gives the stream's address, ffmpeg reads those seconds only.
YouTube blocks an address that asks too much too fast (HTTP 429, "not a bot"): the requests are spaced, three at a
time at most, and the tool stops at the first refusal without marking anything bad. Never pass a browser's cookies.

usage:
  broll.py search <key> "<Label>" --base "hunter io" [--preset software] [-q "free query"] [--must hunter,hunter.io]
                  [--gen …] [--avoid …] [--years 2019-2026] [--good "…,…"] [--bad "…,…"] [--only "<query>"] [--n 25]
  broll.py add <key> "<Label>" <url|id> […] [--preset software]   videos you already know (the user's link, a vendor's
                                              own demo found while researching), added as candidates
  broll.py probe  <key> [--top 40]            full metadata (size, followers, licence), nothing downloaded
  broll.py overview <key> [--top 18]          one row of 10 pictures per candidate, 6 per sheet: the quick sort → LOOK
  broll.py sheets <key> [--top 12] [--ids a,b]  a detailed, timed sheet per candidate (24 pictures) → LOOK
  broll.py fetch  <key>                        cuts and files every entry of picks.json not done yet
  broll.py board  <key>                        4 pictures per shot filed, the 9:16 frame drawn → LOOK, then fix picks.json
  broll.py drop   <key> <NN> […]               a shot that is not right (a presenter, a hand, another product) out of the
                                              library: its file and its manifest entry (its pick too)
  broll.py list                                the library: subjects, shots, sources
picks.json: [{"id": "z0wnMVHeJoc", "t0": 3.2, "t1": 5.4, "x": 0.5, "what": "the dashboard, search results", "tags": ["screen"]}]
  x / y = the centre of the 9:16 crop for a vertical source (0 left, 1 right); z = zoom (> 1 tighter);
  box = [x0, y0, x1, y1] the useful part of the source (black bars, a webcam bubble to leave out), in fractions."""
import concurrent.futures as cf, json, math, os, re, shutil, subprocess, sys, unicodedata, urllib.request
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
LIB = os.environ.get('GTM_MOTION_BROLL') or os.path.join(ROOT, 'workspace', 'motion', 'broll')
CACHE = os.path.expanduser('~/Library/Caches/gtm-motion/broll')
FONT = os.path.join(HERE, 'fonts', 'Archivo.ttf')
# yt-dlp from the motion venv (bootstrap.mjs --python), kept up to date there; YouTube needs a JS runtime (deno, else node)
YTDLP = [sys.executable, '-m', 'yt_dlp', '--no-update', '--no-warnings']
if not shutil.which('deno') and shutil.which('node'): YTDLP += ['--js-runtimes', 'node']
SLOW = ['--sleep-requests', '1']
BLOCKED = ('not a bot', '429', 'Too Many Requests')
BIG = 1_000_000          # big channels: an automatic claim (Content ID) is likely on a brand's account

# what makes a search result worth looking at, by subject: GOOD adds, BAD and the others take away
COMMON_GOOD = ['cinematic', '4k', 'b-roll', 'broll', 'showcase', 'short film', 'drone']
COMMON_BAD = ['podcast', 'reaction', 'reacts', 'interview', 'webinar', 'live stream', 'livestream', 'gameplay', 'compilation',
              'meme', 'prank', 'unboxing', 'asmr']
PRESETS = {
    'car': {   # The reference brand's: the car seen from outside, the right generation, as a young driver would buy it
        'good': ['drive', 'driving', 'walkaround', 'walk around', 'rolling', 'edit', 'spotting', 'sunset', 'night', 'road trip',
                 'roadtrip', 'balade', 'flyby', 'carspotting', 'presentation', 'présentation', 'for sale', 'a vendre', 'à vendre',
                 'te koop', 'zu verkaufen'],
        'inside': ['pov', 'onboard', 'on board', 'interior', 'interieur', 'intérieur', '0-100', '0 100', 'acceleration', 'top speed',
                   'dyno', 'exhaust', 'sound', 'cold start', 'idle', 'revs', 'rev', 'dashcam', 'gopro', 'test drive', 'essai routier'],
        'mods': ['widebody', 'wide body', 'stance', 'stanced', 'drift', 'swap', 'supercharged', 'turbo', 'bodykit', 'body kit',
                 'rocket bunny', 'pandem', 'track car', 'race car', 'stage 2', 'stage 3', 'header', 'intake', 'coilovers', 'airride'],
        'bad': ['install', 'installation', 'how to', 'diy', 'tuto', 'tutorial', 'repair', 'reparation', 'réparation', 'probleme',
                'problème', 'panne', 'fix', 'crash', 'accident', 'fail', 'replacement', 'remplacement', 'vidange', 'oil change',
                'rust', 'rouille', 'scrap', 'junk', 'auction', 'enchère', 'forza', 'gran turismo', 'assetto', 'beamng', 'gta',
                'rc car', 'model car', 'miniature', 'lego', 'hot wheels'],
        'queries': ['{b}', '{b} cinematic', '{b} walkaround', '{b} edit', '{b} car spotting', '{b} rolling shots', '{b} for sale',
                    '{b} à vendre'],
    },
    'software': {   # a product's real screens: walkthroughs and demos; a talking head or a webcam bubble is cropped or left
        'good': ['demo', 'walkthrough', 'tutorial', 'how to use', 'overview', 'review', 'getting started', 'dashboard',
                 'product tour', 'features', 'step by step', 'guide', 'explained'],
        'inside': [],
        'mods': ['vs', 'alternative', 'alternatives', 'competitor', 'comparison', 'top 10', 'top 5', 'best tools'],
        'bad': ['scam', 'hack', 'crack', 'free download', 'mod apk', 'giveaway', 'affiliate', 'earn money', 'make money',
                'side hustle', 'passive income'],
        'queries': ['{b}', '{b} tutorial', '{b} demo', '{b} walkthrough', '{b} review', '{b} how to use', '{b} dashboard'],
    },
    'product': {   # an object: clean product shots, never hands opening a box
        'good': ['commercial', 'product video', 'product shot', 'close up', 'studio', 'review', 'design', 'ad', 'promo'],
        'inside': [], 'mods': [],
        'bad': ['repair', 'teardown', 'fix', 'fake', 'broken', 'drop test'],
        'queries': ['{b}', '{b} cinematic', '{b} b-roll', '{b} commercial', '{b} product video', '{b} close up'],
    },
    'place': {
        'good': ['walking tour', 'walk', 'aerial', 'timelapse', 'hyperlapse', 'travel', 'tour', 'sunset', 'night'],
        'inside': [], 'mods': [], 'bad': ['vlog', 'news', 'protest', 'accident'],
        'queries': ['{b}', '{b} 4k', '{b} cinematic', '{b} drone', '{b} walking tour', '{b} timelapse'],
    },
    'generic': {'good': [], 'inside': [], 'mods': [], 'bad': [], 'queries': ['{b}', '{b} 4k', '{b} cinematic', '{b} b-roll']},
}


def norm(s):
    return unicodedata.normalize('NFD', (s or '').lower()).encode('ascii', 'ignore').decode()


def has(text, word):
    return re.search(r'(?<![a-z0-9])' + re.escape(norm(word)) + r'(?![a-z0-9])', text) is not None


def lib(key, *p):
    return os.path.join(LIB, key, *p)


def load(path, default):
    return json.load(open(path)) if os.path.exists(path) else default


def save(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    json.dump(data, open(path, 'w'), ensure_ascii=False, indent=1)


def arg(a, name, default=None):
    return a[a.index(name) + 1] if name in a else default


def words(m, k):
    p = PRESETS.get(m.get('preset', 'generic'), PRESETS['generic'])
    base = {'good': COMMON_GOOD + p['good'], 'bad': COMMON_BAD + p['bad'], 'inside': p['inside'], 'mods': p['mods']}[k]
    return base + m.get('extra_' + k, [])


def score(c, m):
    t = norm(c['title'] + ' ' + (c.get('description') or '')[:300])
    s = 0.0
    if m.get('must') and not any(has(norm(c['title']), w) for w in m['must']):
        return -99
    if m.get('years'):
        y0, y1 = m['years']
        ys = [int(y) for y in re.findall(r'(?<![0-9])(19[89][0-9]|20[0-3][0-9])(?![0-9])', t)]
        if ys:
            if any(y0 <= y <= y1 for y in ys): s += 2
            else: s -= 5                      # another generation or version, almost surely
    if m.get('gen'):
        hit = any(has(t, g) for g in m['gen'])
        s += 3 if hit else 0
        if not hit and any(has(t, g) for g in m.get('avoid', [])): s -= 4
    elif any(has(t, g) for g in m.get('avoid', [])):
        s -= 4
    s += min(3, sum(1 for w in words(m, 'good') if has(t, w)))
    s -= 2 * sum(1 for w in words(m, 'bad') if has(t, w))
    s -= min(2, sum(1 for w in words(m, 'mods') if has(t, w)))
    s -= min(3, 1.5 * sum(1 for w in words(m, 'inside') if has(t, w)))
    d = c.get('duration') or 0
    s += 2 if 0 < d <= 60 else 1 if d <= 600 else 0 if d <= 1500 else -3
    if c.get('vertical'): s += 3
    h = min(c.get('width') or 0, c.get('height') or 0) if c.get('width') else 0
    if h >= 1080: s += 1
    if c.get('height', 0) >= 2160 and not c.get('vertical'): s += 1
    f = c.get('followers')
    if f and f > BIG: s -= 4
    elif f and f > 300_000: s -= 1
    if c.get('license') and 'creative commons' in norm(c['license']): s += 1
    s += min(1.5, math.log10(max(c.get('views') or 1, 1)) / 4)
    return round(s, 2)


def search(a):
    key, label = a[0], a[1]
    m = load(lib(key, 'subject.json'), {'key': key})
    m['label'] = label
    if arg(a, '--preset'):
        if arg(a, '--preset') not in PRESETS: sys.exit(f"✗ preset: one of {', '.join(PRESETS)}")
        m['preset'] = arg(a, '--preset')
    m.setdefault('preset', 'generic')
    qs = [a[i + 1] for i, x in enumerate(a) if x == '-q']
    for base in [a[i + 1] for i, x in enumerate(a) if x == '--base']:   # a name alone, declined into queries of the preset
        qs += [q.format(b=base) for q in PRESETS[m['preset']]['queries']]
    m['queries'] = sorted(set(m.get('queries', []) + qs))
    for k in ('must', 'gen', 'avoid'):
        v = arg(a, '--' + k)
        if v is not None: m[k] = [w.strip() for w in v.split(',') if w.strip()]
    for k in ('good', 'bad'):
        v = arg(a, '--' + k)
        if v is not None: m['extra_' + k] = [w.strip() for w in v.split(',') if w.strip()]
    if arg(a, '--years'): m['years'] = [int(x) for x in arg(a, '--years').split('-')]
    save(lib(key, 'subject.json'), m)
    n = int(arg(a, '--n', 25))
    cands = {c['id']: c for c in load(lib(key, 'candidates.json'), [])}
    blocked = False
    for q in m['queries']:
        if arg(a, '--only') and q != arg(a, '--only'): continue
        urls = [f'ytsearch{n}:{q}', f'ytsearch{n // 2}:{q} shorts',
                'https://www.youtube.com/results?search_query=' + urllib.request.quote(q) + '&sp=EgIQCQ%253D%253D']
        for u in urls:
            r = subprocess.run(YTDLP + SLOW + ['--flat-playlist', '-j', u], capture_output=True, text=True)
            if any(b in r.stderr for b in BLOCKED): blocked = True; break
            for line in r.stdout.splitlines():
                try: d = json.loads(line)
                except ValueError: continue
                if not d.get('id') or d['id'] in cands or d.get('ie_key') not in (None, 'Youtube'): continue
                cands[d['id']] = {'id': d['id'], 'title': d.get('title') or '', 'channel': d.get('channel') or d.get('uploader') or '',
                                  'duration': d.get('duration'), 'views': d.get('view_count'),
                                  'short': '/shorts/' in (d.get('url') or ''), 'query': q, 'probed': False}
        if blocked: break
    for c in cands.values():
        if c['short']: c['vertical'] = c.get('vertical', True)
        c['score'] = score(c, m)
    out = sorted(cands.values(), key=lambda c: -c['score'])
    save(lib(key, 'candidates.json'), out)
    keep = [c for c in out if c['score'] > -99]
    if blocked: print("⚠ YouTube refuses this address for now: stop, and run the same command again in 30 to 60 min")
    print(f'{key}: {len(out)} found, {len(keep)} relevant')
    for c in keep[:15]:
        print(f"  {c['score']:5.1f}  {c['id']}  {c.get('duration') or 0:5.0f}s  {c['channel'][:22]:22}  {c['title'][:70]}")


def add(a):
    """videos already known, added as candidates (then probe, sheets, picks, fetch as usual)"""
    key, label = a[0], a[1]
    m = load(lib(key, 'subject.json'), {'key': key})
    m['label'] = label
    if arg(a, '--preset'): m['preset'] = arg(a, '--preset')
    m.setdefault('preset', 'generic')
    save(lib(key, 'subject.json'), m)
    cands = {c['id']: c for c in load(lib(key, 'candidates.json'), [])}
    ids = []
    for x in a[2:]:
        if x.startswith('--') or x == arg(a, '--preset'): continue
        mt = re.search(r'(?:v=|youtu\.be/|shorts/)([A-Za-z0-9_-]{11})', x)
        cid = mt.group(1) if mt else (x if re.fullmatch(r'[A-Za-z0-9_-]{11}', x) else None)
        if not cid: print(f'  ✗ not a YouTube video: {x}'); continue
        ids.append(cid)
        cands.setdefault(cid, {'id': cid, 'title': '', 'channel': '', 'query': 'added', 'probed': False, 'short': '/shorts/' in x})
    save(lib(key, 'candidates.json'), sorted(cands.values(), key=lambda c: -(c.get('score') or 0)))
    print(f"{key}: {len(ids)} added ({', '.join(ids)}); then: probe {key}")


def probe_one(cid):
    r = subprocess.run(YTDLP + SLOW + ['-j', '--skip-download', 'https://www.youtube.com/watch?v=' + cid], capture_output=True, text=True)
    if r.returncode:
        err = (r.stderr.strip().splitlines() or ['?'])[-1][:200]
        return cid, {'blocked': True} if any(b in r.stderr for b in BLOCKED) else {'error': err}
    d = json.loads(r.stdout)
    vf = [f for f in d.get('formats', []) if f.get('vcodec') not in (None, 'none') and f.get('height') and not f['format_id'].startswith('sb')]
    best = max(vf, key=lambda f: f['height'] * (f.get('width') or 1), default={})
    sb = [f for f in d.get('formats', []) if f['format_id'].startswith('sb')]
    sb = max(sb, key=lambda f: f.get('width') or 0, default=None)
    return cid, {'width': best.get('width'), 'height': best.get('height'), 'fps': best.get('fps'),
                 'vertical': bool(best.get('height') and best.get('width') and best['height'] > best['width']),
                 'license': d.get('license'), 'followers': d.get('channel_follower_count'),
                 'channel': d.get('channel'), 'channel_url': d.get('channel_url'), 'uploader_id': d.get('uploader_id'),
                 'upload_date': d.get('upload_date'), 'views': d.get('view_count'), 'duration': d.get('duration'),
                 'description': (d.get('description') or '')[:500], 'title': d.get('title'),
                 'storyboard': sb and {'w': sb.get('width'), 'h': sb.get('height'), 'rows': sb.get('rows'), 'cols': sb.get('columns'),
                                       'frags': [(f['url'], f.get('duration')) for f in sb.get('fragments', [])]},
                 'probed': True}


def probe(a):
    key = a[0]
    m = load(lib(key, 'subject.json'), {})
    cands = load(lib(key, 'candidates.json'), [])
    top = int(arg(a, '--top', 40))
    for c in cands:
        if not c.get('probed') and 'error' not in c: c['score'] = 50 if c.get('query') == 'added' else score(c, m)   # added ones first
    cands.sort(key=lambda c: -c['score'])
    only = arg(a, '--query')
    todo = [c for c in cands if c['score'] > -99 and not c.get('probed') and (not only or c.get('query') == only)][:top]
    by = {c['id']: c for c in cands}
    blocked = 0
    with cf.ThreadPoolExecutor(3) as ex:
        for cid, info in ex.map(probe_one, [c['id'] for c in todo]):
            if info.get('blocked'): blocked += 1; continue
            by[cid].update(info)
            if 'error' in info: by[cid]['score'] = -99
    if blocked: print(f"⚠ YouTube refuses this address ({blocked} refusals): stop, and run the same command again in 30 to 60 min")
    for c in cands:      # a video added by hand is not held to the search's words (--must): it was chosen
        if c.get('probed'): c['score'] = score(c, dict(m, must=[])) + 5 if c.get('query') == 'added' else score(c, m)
    cands.sort(key=lambda c: -c['score'])
    save(lib(key, 'candidates.json'), cands)
    print(f'{key}: {len(todo)} probed')
    for c in [c for c in cands if c.get('probed')][:20]:
        fl = c.get('followers') or 0
        print(f"  {c['score']:5.1f}  {c['id']}  {'V' if c.get('vertical') else 'H'} {c.get('width')}x{c.get('height')}  {c.get('duration') or 0:5.0f}s  "
              f"{fl / 1000:7.0f}k  {(c.get('channel') or '')[:20]:20}  {c['title'][:60]}")


def font(size):
    from PIL import ImageFont
    for f in (FONT, '/System/Library/Fonts/Helvetica.ttc'):
        if os.path.exists(f): return ImageFont.truetype(f, size)
    return ImageFont.load_default()


def preview(c):
    """a small silent 240p video if the source is short, else None (the storyboard is used)"""
    os.makedirs(os.path.join(CACHE, 'prev'), exist_ok=True)
    p = os.path.join(CACHE, 'prev', c['id'] + '.mp4')
    if os.path.exists(p): return p
    if (c.get('duration') or 0) <= 240:
        subprocess.run(YTDLP + ['-q', '-f', 'bv*[height<=240][ext=mp4]/bv*[height<=360]/wv*', '-o', p,
                                'https://www.youtube.com/watch?v=' + c['id']], capture_output=True)
        if os.path.exists(p): return p
    return None


def frames_from_preview(p, dur, n):
    from PIL import Image
    import tempfile
    os.makedirs(CACHE, exist_ok=True)
    tmp = tempfile.mkdtemp(dir=CACHE)
    step = max(dur / n, 0.5)
    subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-vf', f'fps=1/{step:.3f},scale=-2:240', os.path.join(tmp, 'f%04d.jpg')], check=True)
    out = []
    for i, f in enumerate(sorted(os.listdir(tmp))):
        out.append((i * step + step / 2 if i else 0.0, Image.open(os.path.join(tmp, f)).copy()))
        os.remove(os.path.join(tmp, f))
    os.rmdir(tmp)
    return out


def frames_from_storyboard(c, n):
    from PIL import Image
    import io
    sb = c.get('storyboard')
    if not sb: return []
    out, t = [], 0.0
    per = sb['rows'] * sb['cols']
    for url, fd in sb['frags']:
        try: im = Image.open(io.BytesIO(urllib.request.urlopen(url, timeout=30).read())).convert('RGB')
        except Exception: continue
        k = max(1, min(per, round(im.width / sb['w']) * round(im.height / sb['h'])))
        dt = (fd or 0) / k if fd else 1
        for j in range(k):
            x, y = (j % sb['cols']) * sb['w'], (j // sb['cols']) * sb['h']
            if y + sb['h'] > im.height: break
            out.append((t + j * dt, im.crop((x, y, x + sb['w'], y + sb['h'])).resize((sb['w'] * 240 // sb['h'], 240))))
        t += fd or 0
    if len(out) > n:
        step = len(out) / n
        out = [out[int(i * step)] for i in range(n)]
    return out


def sheet(c, n=24):
    """a timed sheet of a candidate: one picture per instant, the instant written on it"""
    from PIL import Image, ImageDraw
    p = os.path.join(CACHE, 'prev', c['id'] + '.mp4')
    if not os.path.exists(p) and os.environ.get('BROLL_PREVIEW'): p = preview(c)   # a 240p preview only when asked
    fr = frames_from_preview(p, c.get('duration') or 30, n) if p and os.path.exists(p) else frames_from_storyboard(c, n)
    if not fr: return None
    f = font(18)
    w = max(im.width for _, im in fr)
    cols = 8 if fr[0][1].width < fr[0][1].height else 6
    rows = math.ceil(len(fr) / cols)
    head = 30
    sh = Image.new('RGB', (cols * (w + 4), head + rows * 244), (24, 24, 24))
    d = ImageDraw.Draw(sh)
    d.text((6, 5), f"{c['id']}  {c.get('width')}x{c.get('height')}  {c.get('duration') or 0:.0f}s  {(c.get('channel') or '')[:30]}  {c['title'][:80]}",
           fill=(255, 255, 255), font=f)
    for i, (t, im) in enumerate(fr):
        x, y = (i % cols) * (w + 4), head + (i // cols) * 244
        sh.paste(im, (x + (w - im.width) // 2, y))
        d.rectangle((x, y, x + 64, y + 22), fill=(0, 0, 0))
        d.text((x + 4, y + 2), f'{t:.1f}s', fill=(255, 220, 0), font=f)
    out = os.path.join(CACHE, 'sheets', c['id'] + '.jpg')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    sh.save(out, quality=82)
    return out


def sheets(a):
    key = a[0]
    cands = load(lib(key, 'candidates.json'), [])
    ids = arg(a, '--ids')
    sel = [c for c in cands if c['id'] in ids.split(',')] if ids else [c for c in cands if c.get('probed') and c['score'] > -99][:int(arg(a, '--top', 12))]
    with cf.ThreadPoolExecutor(4) as ex:
        for c, out in zip(sel, ex.map(sheet, sel)):
            print(f"{c['score']:5.1f}  {c['id']}  {'V' if c.get('vertical') else 'H'}  {out}")


def overview(a):
    """one row of 10 pictures per candidate, 6 candidates per sheet: the quick sort before the detailed sheets"""
    from PIL import Image, ImageDraw
    key = a[0]
    only = arg(a, '--query')
    cands = [c for c in load(lib(key, 'candidates.json'), []) if c.get('probed') and c['score'] > -99
             and (not only or c.get('query') == only)][:int(arg(a, '--top', 18))]
    f = font(15)
    rows = []
    for c in cands:
        p = os.path.join(CACHE, 'prev', c['id'] + '.mp4')
        fr = frames_from_preview(p, c.get('duration') or 30, 10) if os.path.exists(p) else frames_from_storyboard(c, 10)
        if fr: rows.append((c, fr[:10]))
    outs = []
    for k in range(0, len(rows), 6):
        chunk = rows[k:k + 6]
        H = 150
        W = max(sum(im.width * H // im.height + 3 for _, im in fr) for _, fr in chunk)
        sh = Image.new('RGB', (W, len(chunk) * (H + 22)), (24, 24, 24))
        d = ImageDraw.Draw(sh)
        for r, (c, fr) in enumerate(chunk):
            y = r * (H + 22)
            d.text((4, y + 3), f"[{k + r}] {c['id']}  {'V' if c.get('vertical') else 'H'} {c.get('width')}x{c.get('height')}  {c.get('duration') or 0:.0f}s  "
                   f"{(c.get('channel') or '')[:24]}  {c['title'][:70]}", fill=(255, 255, 255), font=f)
            x = 0
            for t, im in fr:
                im = im.resize((im.width * H // im.height, H))
                sh.paste(im, (x, y + 22))
                d.text((x + 3, y + 24), f'{t:.0f}', fill=(255, 220, 0), font=f)
                x += im.width + 3
        os.makedirs(CACHE, exist_ok=True)
        out = os.path.join(CACHE, f"overview-{key}{'-q' if only else ''}-{k // 6}.jpg")
        sh.save(out, quality=80)
        outs.append(out)
    print('\n'.join(outs) if outs else 'nothing to show: run probe first')


def stream_url(cid, vertical):
    """one request: the direct address of the chosen video stream (yt-dlp solves the protections) and its headers"""
    hmax = 1920 if vertical else 2160
    fmt = f'bv*[height<={hmax}][protocol=https]/bv*[height<={hmax}]'
    r = subprocess.run(YTDLP + SLOW + ['-j', '-f', fmt, 'https://www.youtube.com/watch?v=' + cid], capture_output=True, text=True)
    if r.returncode:
        return None, r.stderr
    d = json.loads(r.stdout)
    f = (d.get('requested_formats') or [d])[0]
    return {'url': f['url'], 'headers': f.get('http_headers') or d.get('http_headers') or {}, 'w': f.get('width'), 'h': f.get('height'),
            'info': d}, ''


def fetch(a):
    """every entry of picks.json not filed yet: ffmpeg reads only those seconds at YouTube and writes the shot (a
    vertical source 1080 × 1920, a horizontal one whole), 30 fps, silent"""
    key = a[0]
    cands = {c['id']: c for c in load(lib(key, 'candidates.json'), [])}
    picks = load(lib(key, 'picks.json'), [])
    man = load(lib(key, 'manifest.json'), [])
    done = {(x['source']['id'], x['source']['t0'], x['source']['t1']) for x in man}
    os.makedirs(lib(key, 'clips'), exist_ok=True)
    subj = load(lib(key, 'subject.json'), {'key': key})
    n = max([int(re.search(r'-(\d+)\.mp4$', x['file']).group(1)) for x in man] + [subj.get('last', 0)])   # never a number used before
    urls = {}
    for pk in picks:
        if (pk['id'], pk['t0'], pk['t1']) in done: continue
        c = cands.get(pk['id']) or {'id': pk['id']}
        if pk['id'] not in urls:
            su, err = stream_url(pk['id'], c.get('vertical'))
            if not su:
                print('FAILED', pk['id'], err.strip()[-300:])
                if any(b in err for b in BLOCKED):
                    print("⚠ YouTube refuses this address: run fetch again in 30 to 60 min (the shots filed stay)"); break
                continue
            urls[pk['id']] = su
            info = su['info']
            for k in ('title', 'channel', 'channel_url', 'license', 'upload_date'):
                c[k] = c.get(k) or info.get(k)
            c['followers'] = c.get('followers') or info.get('channel_follower_count')
        su = urls[pk['id']]
        n += 1
        name = f'{key}-{n:02d}.mp4'
        x, y, z = pk.get('x', 0.5), pk.get('y', 0.5), pk.get('z', 1.0)
        vf = []
        if pk.get('box'):
            x0, y0, x1, y1 = pk['box']
            vf.append(f'crop=iw*{x1 - x0}:ih*{y1 - y0}:iw*{x0}:ih*{y0}')
        bw, bh = (su['w'] or 1), (su['h'] or 0)
        if pk.get('box'):                                  # the useful part decides the orientation
            bx0, by0, bx1, by1 = pk['box']
            bw, bh = bw * (bx1 - bx0), bh * (by1 - by0)
        vert = bh >= 1.5 * bw                              # cropped to 9:16 only when it nearly is: else the whole picture
        if vert:
            Wd, Hd = round(1080 * z / 2) * 2, round(1920 * z / 2) * 2
            vf += [f'scale={Wd}:{Hd}:force_original_aspect_ratio=increase:flags=lanczos', f'crop=1080:1920:(iw-1080)*{x}:(ih-1920)*{y}']
        else:        # a horizontal source: the whole picture (1440 high at most); the edit frames it, never zooming it cut
            vf += ['scale=-2:min(ih\\,1440):flags=lanczos']
        vf += ['fps=30', 'setsar=1', 'format=yuv420p']
        hdr = ''.join(f'{k}: {v}\r\n' for k, v in su['headers'].items() if k.lower() != 'user-agent')
        ua = su['headers'].get('User-Agent', '')
        cmd = ['ffmpeg', '-v', 'error', '-y', '-user_agent', ua, '-headers', hdr, '-ss', str(pk['t0']), '-t', f"{pk['t1'] - pk['t0']:.3f}",
               '-i', su['url'], '-vf', ','.join(vf), '-an', '-c:v', 'libx264', '-crf', '16', '-preset', 'medium',
               '-movflags', '+faststart', lib(key, 'clips', name)]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode or not os.path.exists(lib(key, 'clips', name)):
            print('FAILED ffmpeg', pk['id'], r.stderr.strip()[-300:]); n -= 1; continue
        dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0',
                                    lib(key, 'clips', name)], capture_output=True, text=True).stdout)
        man.append({'file': 'clips/' + name, 'dur': round(dur, 2), 'what': pk.get('what', ''), 'tags': pk.get('tags', []),
                    'source': {'id': pk['id'], 'url': 'https://www.youtube.com/watch?v=' + pk['id'], 't0': pk['t0'], 't1': pk['t1'],
                               'title': c.get('title'), 'channel': c.get('channel'), 'channel_url': c.get('channel_url'),
                               'license': c.get('license'), 'followers': c.get('followers'), 'size': f"{su['w']}x{su['h']}"},
                    'frame': 'vertical' if vert else 'full', 'x': x,
                    'crop': {'x': x, 'y': y, 'z': z, 'box': pk.get('box')}, 'fetched': date.today().isoformat()})
        save(lib(key, 'manifest.json'), man)
        subj['last'] = n; save(lib(key, 'subject.json'), subj)
        print(f"  {name}  {dur:.2f}s  ← {pk['id']} {pk['t0']}-{pk['t1']}s ({su['w']}x{su['h']})  {pk.get('what', '')}", flush=True)
    print(f'{key}: {len(man)} shots filed')


def board(a):
    """the shots filed: 4 pictures per shot, the whole picture, the 9:16 frame (the manifest's x) in yellow"""
    import io
    from PIL import Image, ImageDraw
    key = a[0]
    man = load(lib(key, 'manifest.json'), [])
    if not man: sys.exit(f'✗ nothing filed for {key}')
    f = font(16)
    rows = []
    for x in man:
        p = lib(key, x['file'])
        ims = []
        for q in (0.08, 0.36, 0.64, 0.92):
            raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f"{x['dur'] * q:.2f}", '-i', p, '-frames:v', '1', '-vf', 'scale=-2:220',
                                  '-f', 'image2pipe', '-vcodec', 'png', '-'], capture_output=True).stdout
            im = Image.open(io.BytesIO(raw)).convert('RGB')
            if im.width > im.height:
                cw = im.height * 9 / 16
                cx = min(max(x.get('x', 0.5) * im.width, cw / 2), im.width - cw / 2)
                ImageDraw.Draw(im).rectangle((cx - cw / 2, 0, cx + cw / 2, im.height - 1), outline=(255, 220, 0), width=2)
            ImageDraw.Draw(im).text((4, 200), f"{x['dur'] * q:.1f}s", fill=(255, 220, 0), font=f)
            ims.append(im)
        rows.append((x, ims))
    W_ = max(sum(i.width + 4 for i in ims) for _, ims in rows) + 230
    sh = Image.new('RGB', (W_, len(rows) * 226), (24, 24, 24))
    d = ImageDraw.Draw(sh)
    for r, (x, ims) in enumerate(rows):
        y = r * 226
        d.text((6, y + 6), os.path.basename(x['file'])[:-4], fill=(255, 220, 0), font=f)
        d.text((6, y + 28), x.get('what', '')[:30], fill=(220, 220, 220), font=f)
        d.text((6, y + 48), x['source']['id'] + f" {x['source']['t0']}s", fill=(150, 150, 150), font=f)
        xx = 230
        for im in ims:
            sh.paste(im, (xx, y + 3)); xx += im.width + 4
    os.makedirs(CACHE, exist_ok=True)
    out = os.path.join(CACHE, f'board-{key}.jpg')
    sh.save(out, quality=82)
    print(out)


def drop(a):
    key = a[0]
    man = load(lib(key, 'manifest.json'), [])
    picks = load(lib(key, 'picks.json'), [])
    for n in a[1:]:
        name = f'{key}-{int(n):02d}'
        e = next((x for x in man if os.path.basename(x['file'])[:-4] == name), None)
        if not e: print(f'  ✗ no {name}'); continue
        man.remove(e)
        src = e['source']
        picks = [p for p in picks if (p['id'], p['t0'], p['t1']) != (src['id'], src['t0'], src['t1'])]
        f = lib(key, e['file'])
        if os.path.exists(f): os.remove(f)
        print(f'  {name} dropped ({e.get("what", "")})')
    save(lib(key, 'manifest.json'), man)
    save(lib(key, 'picks.json'), picks)


def listing(a):
    if not os.path.isdir(LIB): print(f'no library yet ({LIB})'); return
    for key in sorted(os.listdir(LIB)):
        man = load(lib(key, 'manifest.json'), [])
        if not man: continue
        src = {x['source']['id'] for x in man}
        print(f"{key:28} {len(man):3} shots from {len(src)} videos  ({load(lib(key, 'subject.json'), {}).get('label', '')})")


if __name__ == '__main__':
    if len(sys.argv) < 2 or sys.argv[1] not in ('search', 'add', 'probe', 'sheets', 'overview', 'fetch', 'board', 'drop', 'list'):
        sys.exit(__doc__)
    cmd, rest = sys.argv[1], sys.argv[2:]
    {'search': search, 'add': add, 'probe': probe, 'sheets': sheets, 'overview': overview, 'fetch': fetch, 'board': board,
     'drop': drop, 'list': listing}[cmd](rest)
