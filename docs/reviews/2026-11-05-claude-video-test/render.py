"""Test clip: blackjack 9,9 vs dealer 7 -> STAND. Follows Grok's documented v4 format
(hand + question at frame 0, punch-in, draining gold timer bar, reveal, /go end screen).
Silent apart from cue sounds: edge-tts is not reachable from this workspace."""
import math, subprocess, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H, FPS = 1080, 1920, 30
Q_END, R_END, END = 4.5, 10.3, 13.5
N = int(END * FPS)
OUT = sys.argv[1]

FELT, SURF, GOLD, WHITE, CREAM = (10, 26, 20), (20, 40, 32), (212, 168, 67), (245, 242, 232), (232, 226, 210)
RED, BLACK, GREEN, MUTED = (196, 48, 43), (22, 22, 22), (88, 196, 120), (170, 186, 176)
INTER = '/usr/share/fonts/opentype/inter/'
def f(name, size): return ImageFont.truetype(INTER + name, size)
SUIT = lambda s: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', s)

def ease(t): return 1 - (1 - max(0, min(1, t))) ** 3

def card(rank, suit, red, w=250, h=350):
    im = Image.new('RGBA', (w + 40, h + 40), (0, 0, 0, 0))
    sh = Image.new('RGBA', im.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((24, 28, w + 20, h + 24), 26, fill=(0, 0, 0, 140))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(10)))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((20, 20, w + 20, h + 20), 24, fill=WHITE)
    col = RED if red else BLACK
    d.text((44, 34), rank, font=f('Inter-Black.otf', 86), fill=col)
    d.text((48, 128), suit, font=SUIT(60), fill=col)
    d.text((20 + w / 2, 20 + h / 2 + 40), suit, font=SUIT(170), fill=col, anchor='mm')
    return im

C7, C9S, C9H = card('7', '♣', False), card('9', '♠', False), card('9', '♥', True)

ZMAX = 1.06 * 1.04  # peak punch-in times peak pulse
def fit(name, size, s, frac=0.9):
    # Grok's rule: text must fit inside 90% of frame width at peak zoom
    while size > 20 and f(name, size).getlength(s) * ZMAX > W * frac: size -= 2
    return f(name, size)

def ctext(d, y, s, font, fill, stroke=0):
    if isinstance(font, tuple): font = fit(font[0], font[1], s)
    d.text((W / 2, y), s, font=font, fill=fill, anchor='mm', stroke_width=stroke, stroke_fill=FELT)

def scene(t):
    base = Image.new('RGBA', (W, H), FELT + (255,))
    d = ImageDraw.Draw(base)
    # felt vignette
    d.ellipse((-300, 300, W + 300, H + 300), fill=(14, 34, 26, 255))
    ctext(d, 120, 'BLACKJACK  ·  6 DECKS  ·  DEALER STANDS SOFT 17', ('Inter-Bold.otf', 30), MUTED)
    ctext(d, 250, 'DEALER', f('Inter-SemiBold.otf', 34), MUTED)
    base.alpha_composite(C7, (W // 2 - 145, 290))
    ctext(d, 760, 'YOU', f('Inter-SemiBold.otf', 34), MUTED)
    base.alpha_composite(C9S, (W // 2 - 300, 800))
    base.alpha_composite(C9H, (W // 2 + 10, 800))

    if t < Q_END:
        pulse = 1 + 0.035 * math.sin(t * 2 * math.pi * 1.6)
        hook = ('Inter-Black.otf', int(118 * pulse))
        ctext(d, 1300, 'PAIR OF 9s', hook, GOLD, 4)
        ctext(d, 1430, 'VS A 7.', hook, GOLD, 4)
        ctext(d, 1585, 'SPLIT OR STAND?', ('Inter-Black.otf', int(104 * pulse)), WHITE, 4)
        ctext(d, 1720, 'Comment your call before the answer', f('Inter-SemiBold.otf', 40), CREAM)
        # draining gold timer bar
        frac = 1 - t / Q_END
        d.rounded_rectangle((150, 1790, W - 150, 1816), 13, fill=SURF)
        d.rounded_rectangle((150, 1790, 150 + max(26, (W - 300) * frac), 1816), 13, fill=GOLD)
    elif t < R_END:
        a = ease((t - Q_END) / 0.35)
        big = f('Inter-Black.otf', int(190 * (0.7 + 0.3 * a)))
        ctext(d, 1290, 'STAND.', big, GREEN, 5)
        body = f('Inter-Bold.otf', 52)
        if t > Q_END + 0.8:
            ctext(d, 1460, 'Your 18 already beats', body, WHITE)
            ctext(d, 1530, "the dealer's most likely 17.", body, WHITE)
        if t > Q_END + 2.6:
            ctext(d, 1640, 'Coach EV per bet: stand +0.40, split +0.37', f('Inter-SemiBold.otf', 38), MUTED)
        if t > Q_END + 3.6:
            ctext(d, 1760, 'Dealer shows 8 or 9? Then split.', ('Inter-Black.otf', 56), GOLD, 3)
    return base

def endscreen(t):
    im = Image.new('RGBA', (W, H), FELT + (255,))
    d = ImageDraw.Draw(im)
    a = ease((t - R_END) / 0.4)
    ctext(d, 620, 'Free drill at', f('Inter-Bold.otf', 64), CREAM)
    ctext(d, 760, 'playpokergym.com/go', ('Inter-Black.otf', int(96 * (0.85 + 0.15 * a))), GOLD, 3)
    ctext(d, 900, '5 hands. Every decision graded.', f('Inter-SemiBold.otf', 46), WHITE)
    ctext(d, 1180, 'Follow for tomorrow\'s hand', f('Inter-Bold.otf', 50), WHITE)
    ctext(d, 1700, 'Play Poker Gym · free · no signup · no real money', ('Inter-SemiBold.otf', 34), MUTED)
    ctext(d, 1760, 'Learning the best play lowers the house edge; it never beats it.', ('Inter-SemiBold.otf', 28), MUTED)
    return im

ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
    '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-an', '-c:v', 'libx264', '-preset', 'slow',
    '-b:v', '9M', '-minrate', '9M', '-maxrate', '9M', '-bufsize', '9M', '-x264-params', 'nal-hrd=cbr', '-pix_fmt', 'yuv420p', OUT + '.video.mp4'],
    stdin=subprocess.PIPE)
for i in range(N):
    t = i / FPS
    fr = endscreen(t) if t >= R_END else scene(t)
    # punch-in at frame 0, then slow push-in during the question
    if t < Q_END:
        z = 1.06 - 0.06 * ease(t / 0.3) + 0.03 * (t / Q_END)
    elif t < R_END:
        z = 1.0 + 0.04 * ease((t - Q_END) / 0.25) * (1 - ease((t - Q_END - 0.25) / 0.5))
    else:
        z = 1.0
    if abs(z - 1) > 1e-4:
        cw, ch = W / z, H / z
        fr = fr.crop(((W - cw) / 2, (H - ch) / 2, (W + cw) / 2, (H + ch) / 2)).resize((W, H), Image.LANCZOS)
    ff.stdin.write(fr.convert('RGB').tobytes())
ff.stdin.close(); ff.wait()
