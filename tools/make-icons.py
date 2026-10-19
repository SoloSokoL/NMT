#!/usr/bin/env python3
"""Записує оригінальний чорний icon.svg і генерує PNG-іконки для PWA.
Потрібні: Pillow, fontTools і шрифт з кирилицею (DejaVu Sans Bold або будь-який інший .ttf — змініть FONT).
Запуск з кореня сайту:  python3 tools/make-icons.py"""
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from PIL import Image, ImageDraw, ImageFont
import os

FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'   # засічковий, схожий на Georgia з оригінальної іконки
TEXT = 'НМТ'
BG = '#000000'
FG = '#FFFFFF'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def glyph_layout():
    f = TTFont(FONT); gs = f.getGlyphSet(); cmap = f.getBestCmap(); hmtx = f['hmtx']
    x, items = 0, []
    for ch in TEXT:
        n = cmap[ord(ch)]; items.append((n, x)); x += hmtx[n][0]
    # межі всього напису
    bp = BoundsPen(gs); 
    for n, ox in items:
        gs[n].draw(TransformPen(bp, (1, 0, 0, 1, ox, 0)))
    return gs, items, bp.bounds  # xmin, ymin, xmax, ymax

def svg_path(size, text_frac):
    gs, items, (x0, y0, x1, y1) = glyph_layout()
    s = size * text_frac / (x1 - x0)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    d = ''
    for n, ox in items:
        pen = SVGPathPen(gs, ntos=lambda v: ('%.1f' % v).rstrip('0').rstrip('.'))
        # y вгору → y вниз; центруємо за межами напису
        gs[n].draw(TransformPen(pen, (s, 0, 0, -s, size / 2 + (ox - cx) * s, size / 2 + cy * s)))
        d += pen.getCommands()
    return d

def make_svg():
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="108" fill="#000"/>'
           '<text x="256" y="320" font-family="Georgia,serif" font-size="190" font-weight="700" fill="#fff" text-anchor="middle">НМТ</text></svg>\n')
    open(os.path.join(ROOT, 'icon.svg'), 'w', encoding='utf-8').write(svg)

def make_png(size, text_frac, rounded, name, ss=4):
    S = size * ss
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    dr = ImageDraw.Draw(img)
    if rounded: dr.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 108 / 512), fill=BG)
    else: dr.rectangle([0, 0, S, S], fill=BG)
    # підбираємо розмір шрифту так, щоб ширина напису = text_frac * S
    lo, hi = 10, S
    for _ in range(30):
        mid = (lo + hi) // 2
        w = ImageDraw.Draw(img).textbbox((0, 0), TEXT, font=ImageFont.truetype(FONT, mid))
        if (w[2] - w[0]) < S * text_frac: lo = mid
        else: hi = mid
    font = ImageFont.truetype(FONT, lo)
    b = dr.textbbox((0, 0), TEXT, font=font)
    dr.text(((S - (b[2] - b[0])) / 2 - b[0], (S - (b[3] - b[1])) / 2 - b[1]), TEXT, font=font, fill=FG)
    img = img.resize((size, size), Image.LANCZOS)
    if not rounded: img = img.convert('RGB')   # iOS і maskable: суцільний фон без прозорості
    img.save(os.path.join(ROOT, 'icons', name), optimize=True)

if __name__ == '__main__':
    os.makedirs(os.path.join(ROOT, 'icons'), exist_ok=True)
    make_svg()
    make_png(192, 0.74, True,  'icon-192.png')
    make_png(512, 0.74, True,  'icon-512.png')
    make_png(512, 0.52, False, 'icon-maskable-512.png')   # безпечна зона maskable: центральні ~80 %
    make_png(180, 0.70, False, 'apple-touch-icon.png')
    print('ok')
