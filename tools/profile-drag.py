"""CPU-profile a 40-step drag and print the heaviest functions. python tools/profile-drag.py http://localhost:3300"""
import json, sys
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 1440, 'height': 900}); page = ctx.new_page()
    cdp = ctx.new_cdp_session(page); cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
    page.goto(sys.argv[1] + '/l/demo'); page.wait_for_timeout(3500)
    cdp.send('Profiler.enable'); cdp.send('Profiler.setSamplingInterval', {'interval': 200}); cdp.send('Profiler.start')
    s = page.get_by_label('Skyrim, unranked').bounding_box(); d = page.locator('[aria-label^="#3 "]').first.bounding_box()
    page.mouse.move(s['x'] + s['width'] / 2, s['y'] + s['height'] / 2); page.mouse.down()
    for i in range(40):
        page.mouse.move(s['x'] + (d['x'] - s['x']) * i / 39 + 10, s['y'] + (d['y'] - s['y']) * i / 39 + 10)
    page.mouse.up(); page.wait_for_timeout(500)
    prof = cdp.send('Profiler.stop')['profile']
    nodes = {n['id']: n for n in prof['nodes']}; self_t = {}
    dt = prof['timeDeltas']; ids = prof['samples']
    for i, nid in enumerate(ids):
        n = nodes[nid]; cf = n['callFrame']; key = f"{cf['functionName'] or '(anon)'} {cf['url'].split('/')[-1].split('?')[0]}:{cf['lineNumber']}"
        self_t[key] = self_t.get(key, 0) + dt[i]
    tot = sum(self_t.values())
    for k, v in sorted(self_t.items(), key=lambda x: -x[1])[:16]: print(f"{v/1000:8.1f} ms  {k}")
    print('total sampled', round(tot / 1000), 'ms')
    b.close()
