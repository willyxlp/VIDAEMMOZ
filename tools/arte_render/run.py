import base64,sys
from playwright.sync_api import sync_playwright
ids=sys.argv[1].split(',') if len(sys.argv)>1 else []
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'])
    pg=b.new_page(); pg.on('console',lambda m:print('console',m.text)); pg.on('pageerror',lambda e:print('ERR',e))
    pg.goto('http://localhost:8765/render.html'); pg.wait_for_function('window.pronto===true',timeout=20000)
    for i in ids:
        kind,name=i.split(':')
        d=pg.evaluate(f"{kind}('{name}')")
        if d: open(f'out/{name}.png','wb').write(base64.b64decode(d.split(',')[1])); print('ok',name)
    b.close()
