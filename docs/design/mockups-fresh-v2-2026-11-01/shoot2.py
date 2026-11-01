from playwright.sync_api import sync_playwright
import os
from PIL import Image
d=os.getcwd()
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/local/bin/chromium',args=['--no-sandbox'])
    for name,w,h in [('desktop',1440,900),('phone',390,844)]:
        pg=b.new_page(viewport={'width':w,'height':h},device_scale_factor=1 if w>400 else 2)
        pg.goto(f'file://{d}/index.html');pg.add_style_tag(content='.hdr{position:relative!important}.mnav{position:absolute!important}body{position:relative}');pg.evaluate("document.body.classList.add('still')");pg.wait_for_timeout(500)
        pg.screenshot(path=f'shots/index-{name}.png',full_page=True)
    b.close()
for name,h in [('desktop',900),('phone',844)]:
    im=Image.open(f'shots/index-{name}.png');s=im.width//(1440 if name=='desktop' else 390);H=h*s
    n=0;y=0
    while y<im.height:
        n+=1;im.crop((0,y,im.width,min(y+H,im.height))).save(f'shots/crops/{name}-'+('hero' if n==1 else f'{n:02d}')+'.png');y+=H
print('done')
