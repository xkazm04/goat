"""Bakes the winning design's engraved art layers into WebP files under public/art/.

The design (design/winner/index.html, the owner's pick from the contest) draws every layer with a
canvas engraver. That work is deterministic and costs 100-250 ms of main-thread time per view, so the
app ships the result instead: this script drives the design in headless Chromium at 2x, and writes
each canvas layer out. Run `npm run brand:bake` after changing the design; commit public/art/.
"""
import base64, json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SRC = (ROOT / 'design/winner/index.html').as_uri()
OUT = ROOT / 'public/art'
OUT.mkdir(parents=True, exist_ok=True)
QUALITY = 0.82

# view hash -> [(selector, output name)]. Skies and sun rays are plain gradients and SVG in the app, so only
# drawn art is baked: the goat, the ranges, the plate, the drapes. Each is a transparent WebP.
PLAN = {
    'mosaic': [('.mo-ridges', 'mosaic-ridges'), ('#mo-goat-cv', 'goat-front')],
    'canvas': [('.cv-peak', 'canvas-peak'), ('.cv-goat', 'goat-summit')],
    'spread': [('#plate-cv', 'spread-plate')],
    'stage:podium': [('.st-drape', 'stage-drape'), ('.st-goat', 'stage-goat')],
    'stage:rushmore': [('.st-back', 'stage-rushmore')],
    'stage:throne': [('.st-horns canvas', 'stage-horn')],
}
# CSS custom properties the design builds at run time (tiles): saved as PNG
TILES = {'--ledge': 'mosaic-ledge', '--noise': 'grain'}

def export(page, selector, name):
    data = page.evaluate(
        """([sel]) => { const c=[...document.querySelectorAll(sel)].find(x=>x.width>8); if(!c) return null;
             return {w:c.width,h:c.height,url:c.toDataURL('image/webp', %s)}; }""" % QUALITY, [selector])
    if not data:
        print('MISSING', selector); return None
    (OUT / f'{name}.webp').write_bytes(base64.b64decode(data['url'].split(',', 1)[1]))
    return {'name': name, 'w': data['w'], 'h': data['h'], 'bytes': (OUT / f'{name}.webp').stat().st_size}

report = []
with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page(viewport={'width': 1600, 'height': 1000}, device_scale_factor=2)
    page.goto(SRC); page.wait_for_timeout(2500)
    for view, layers in PLAN.items():
        page.evaluate("(h)=>{location.hash=h}", view)
        page.wait_for_timeout(4200)  # the plate paints in over about three seconds
        for sel, name in layers:
            r = export(page, sel, name)
            if r: report.append(r)
    for prop, name in TILES.items():
        val = page.evaluate("(p)=>getComputedStyle(document.documentElement).getPropertyValue(p)||document.querySelector('.view-mosaic, .v1')&&getComputedStyle(document.querySelector('.v1')).getPropertyValue(p)", prop)
        if not val or 'base64' not in val:
            val = page.evaluate("(p)=>{for(const e of [document.documentElement,document.body,...document.querySelectorAll('.v1,.view-mosaic,.mo')]){const v=e.style.getPropertyValue(p)||getComputedStyle(e).getPropertyValue(p);if(v&&v.includes('base64'))return v}return ''}", prop)
        if 'base64,' in val:
            raw = base64.b64decode(val.split('base64,', 1)[1].split(')')[0].strip("'\" "))
            from PIL import Image
            import io
            im = Image.open(io.BytesIO(raw))
            im.save(OUT / f'{name}.webp', quality=70 if name == 'grain' else 82, method=6)
            report.append({'name': name, 'w': im.width, 'h': im.height, 'bytes': (OUT / f'{name}.webp').stat().st_size})
        else:
            print('MISSING tile', prop)
    b.close()
(OUT / 'manifest.json').write_text(json.dumps(report, indent=1))
for r in report: print(f"{r['name']:24} {r['w']}x{r['h']}  {r['bytes']//1024} KB")
print('total', sum(r['bytes'] for r in report)//1024, 'KB')
