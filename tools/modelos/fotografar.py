"""Fotografa modelos de js/modelos3d.js nas 4 rotações da vista 2.5D → img/modelos/<id>_r<N>.webp + indice.json.
Uso (na raiz do repo): python3 -m http.server 8766 &  →  python3 tools/modelos/fotografar.py citadino,sedan,palmeira
Cada id acaba com a origem do modelo no ponto de ancoragem (carros: canto 1×2; natureza: centro do quadrado)."""
import base64, io, json, sys, os
from PIL import Image
from playwright.sync_api import sync_playwright
NATUREZA = {'palmeira', 'mangueira', 'acacia', 'arvore_verde', 'imbondeiro'}
ids = sys.argv[1].split(',')
idx_p = 'img/modelos/indice.json'; idx = json.load(open(idx_p)) if os.path.exists(idx_p) else {}
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'])
    pg = b.new_page(viewport={'width': 900, 'height': 900}); pg.on('pageerror', lambda e: print('ERR', e))
    pg.goto('http://localhost:8766/tools/modelos/fotografar.html'); pg.wait_for_function('window.pronto===true', timeout=60000)
    for i in ids:
        ent = {'rot': {}}
        for r in range(4):
            d = pg.evaluate(f"window.foto('{i}',{r},'{'centro' if i in NATUREZA else ''}')")
            im = Image.open(io.BytesIO(base64.b64decode(d.split(',')[1]))).convert('RGBA'); bb = im.getbbox()
            if not bb: print('vazio', i, r); continue
            im = im.crop(bb); im.save(f'img/modelos/{i}_r{r}.webp', 'WEBP', quality=88, method=6)
            ent['rot'][str(r)] = {'w': im.width, 'h': im.height, 'ax': 450 - bb[0], 'ay': 450 - bb[1]}
        idx[i] = {**idx.get(i, {}), **ent}; print('ok', i)
    b.close()
json.dump(idx, open(idx_p, 'w'), separators=(',', ':'))
