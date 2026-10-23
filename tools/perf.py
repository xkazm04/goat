"""Measures load and interaction cost of the app against a running production server.
   python tools/perf.py http://localhost:3300 [label]"""
import json, sys, time
from playwright.sync_api import sync_playwright

BASE = sys.argv[1]; LABEL = sys.argv[2] if len(sys.argv) > 2 else ''
out = {}
def metrics(cdp):
    m = {x['name']: x['value'] for x in cdp.send('Performance.getMetrics')['metrics']}
    return {k: m[k] for k in ('ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration', 'TaskDuration', 'JSHeapUsedSize') if k in m}
def diff(a, b): return {k: round(b[k] - a[k], 3) for k in b if k != 'JSHeapUsedSize'}

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1440, 'height': 900}, device_scale_factor=1)
    page = ctx.new_page(); cdp = ctx.new_cdp_session(page); cdp.send('Performance.enable')
    cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})  # a mid-range laptop or phone, roughly
    page.add_init_script("window.__lt=[];window.__lcp=0;new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__lt.push(Math.round(e.duration)))).observe({entryTypes:['longtask']});new PerformanceObserver(l=>{const e=l.getEntries().pop();window.__lcp=Math.round(e.startTime)}).observe({type:'largest-contentful-paint',buffered:true});")
    page.route('**/*', lambda r: r.continue_())
    sizes = {'bytes': 0}
    page.on('response', lambda r: sizes.__setitem__('bytes', sizes['bytes'] + (int(r.headers.get('content-length', 0)) if r.headers.get('content-length') else 0)))

    for name, path in [('landing', '/'), ('editor', '/l/demo')]:
        sizes['bytes'] = 0
        t0 = time.time(); page.goto(BASE + path, wait_until='load'); page.wait_for_timeout(3500)
        out[name] = {'lcp_ms': page.evaluate('window.__lcp'), 'long_tasks_ms': page.evaluate('window.__lt'), 'transfer_kb': round(sizes['bytes'] / 1024), 'metrics': metrics(cdp)}
    # mode switches
    for k, n in [('2', 'canvas'), ('3', 'spread'), ('4', 'stage'), ('1', 'mosaic')]:
        page.evaluate('window.__lt=[]'); a = metrics(cdp); page.keyboard.press(k); page.wait_for_timeout(1800)
        out['switch_' + n] = {'long_tasks_ms': page.evaluate('window.__lt'), 'cost': diff(a, metrics(cdp))}
    # drag a pool cover onto rank 3, then hover sweep
    page.keyboard.press('1'); page.wait_for_timeout(1200)
    src = page.get_by_label('Skyrim, unranked'); dst = page.locator('[aria-label^="#3 "]').first
    a = metrics(cdp); page.evaluate('window.__lt=[]')
    s = src.bounding_box(); d = dst.bounding_box()
    page.mouse.move(s['x'] + s['width'] / 2, s['y'] + s['height'] / 2); page.mouse.down()
    for i in range(40):
        page.mouse.move(s['x'] + (d['x'] - s['x']) * i / 39 + 10, s['y'] + (d['y'] - s['y']) * i / 39 + 10)
    page.mouse.up(); page.wait_for_timeout(600)
    out['drag_40_steps'] = {'long_tasks_ms': page.evaluate('window.__lt'), 'cost': diff(a, metrics(cdp))}
    b.close()
print(json.dumps({LABEL or 'run': out}, indent=1))
