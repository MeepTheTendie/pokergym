"""Poker Gym blackjack slate (Revision 1): three short vertical clips.

Based on docs/reviews/2026-11-05-claude-video-test/render.py (origin/claude/video-test-nines).
Changes per Revision 1: declarative hook at frame 0 (no question / timer / comment prompt),
answer reveal with coach EV line, end card "Practice this decision free" + playpokergym.com/go.
Scene boundaries come from the measured edge-tts durations.

Usage: python3 render_slate.py [clip-name ...]   (default: all three)
Output: <this dir>/<name>.mp4 and <name>-frames.png
"""
import json, math, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.join(HERE, 'work')
os.makedirs(WORK, exist_ok=True)

W, H, FPS = 1080, 1920, 30
VOICE = 'en-US-AndrewNeural'
MAX_LEN, MIN_LEN = 15.0, 12.0

RULES = '6 decks · dealer stands soft 17 · DAS · no surrender · EV per 1 unit'
END_LINE = 'Practice this decision free at playpokergym dot com slash go.'

CLIPS = {
    'nine-vs-three': dict(
        dealer=('3', '♦'), player=[('6', '♣'), ('3', '♥')],
        hook=['Nine against a three?', "Don't just hit it."],
        answer='DOUBLE.', ev=['DOUBLE +0.131 · HIT +0.106'],
        voice=["Nine against a three? Don't just hit it.",
               "You've got nine. Dealer shows a three. Hitting feels natural, but this coach "
               "favors doubling here: plus 0.131 versus plus 0.106 for hitting."]),
    'soft18-vs-nine': dict(
        dealer=('9', '♣'), player=[('A', '♠'), ('7', '♦')],
        hook=['Eighteen is not', 'a stand here.'],
        answer='HIT.', ev=['HIT −0.10 · STAND −0.18', '(both lose; hit loses less)'],
        voice=['Eighteen is not a stand here.',
               'Soft eighteen against a nine. Standing feels safe. Under these rules, hitting loses '
               "less on average than standing: minus 0.10 versus minus 0.18. The ace means one card can't bust you."]),
    'nines-vs-seven': dict(
        dealer=('7', '♣'), player=[('9', '♠'), ('9', '♥')],
        hook=["Don't split", 'these nines.'],
        answer='STAND.', ev=['STAND +0.400 · SPLIT +0.369'],
        voice=["Don't split these nines.",
               "Nines against a seven. 'Always split nines', right? Under these rules, standing is "
               'slightly better than splitting: plus 0.400 versus plus 0.369.']),
}

FELT, SURF, GOLD, WHITE, CREAM = (10, 26, 20), (20, 40, 32), (212, 168, 67), (245, 242, 232), (232, 226, 210)
RED, BLACK, GREEN, MUTED = (196, 48, 43), (22, 22, 22), (88, 196, 120), (170, 186, 176)
INTER = '/usr/share/fonts/opentype/inter/'
_fc = {}
def f(name, size):
    k = (name, size)
    if k not in _fc: _fc[k] = ImageFont.truetype(INTER + name, size)
    return _fc[k]
SUIT = lambda s: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', s)

def ease(t): return 1 - (1 - max(0, min(1, t))) ** 3

def card(rank, suit, w=250, h=350):
    im = Image.new('RGBA', (w + 40, h + 40), (0, 0, 0, 0))
    sh = Image.new('RGBA', im.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((24, 28, w + 20, h + 24), 26, fill=(0, 0, 0, 140))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(10)))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((20, 20, w + 20, h + 20), 24, fill=WHITE)
    col = RED if suit in '♥♦' else BLACK
    d.text((44, 34), rank, font=f('Inter-Black.otf', 86), fill=col)
    d.text((48, 128), suit, font=SUIT(60), fill=col)
    d.text((20 + w / 2, 20 + h / 2 + 40), suit, font=SUIT(170), fill=col, anchor='mm')
    return im

ZMAX = 1.06 * 1.04  # peak punch-in times peak pulse (as in the base renderer)
def fit(name, size, s, frac=0.9):
    # text must fit inside 90% of frame width at peak zoom
    while size > 20 and f(name, size).getlength(s) * ZMAX > W * frac: size -= 2
    return f(name, size)

def ctext(d, y, s, font, fill, stroke=0):
    if isinstance(font, tuple): font = fit(font[0], font[1], s)
    d.text((W / 2, y), s, font=font, fill=fill, anchor='mm', stroke_width=stroke, stroke_fill=FELT)

# ---------------- audio ----------------
def tts(text, rate, path):
    for attempt in range(8):  # the TTS service intermittently returns NoAudioReceived
        r = subprocess.run(['edge-tts', '--proxy', os.environ.get('HTTPS_PROXY', ''), '--voice', VOICE,
                            f'--rate={rate}', '--text', text, '--write-media', path],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if r.returncode == 0 and os.path.getsize(path) > 1000:
            return dur(path)
        if os.path.exists(path): os.remove(path)
    raise SystemExit(f'edge-tts failed 8 times for: {text}')

def dur(path):
    out = subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                                   '-of', 'csv=p=0', path])
    return float(out)

def trimmed(src):
    """Strip only the leading/trailing silence edge-tts pads each file with (~0.13 s / ~0.27 s)."""
    out = src[:-4] + '.trim.wav'
    if not os.path.exists(out):
        sr = 'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.03'
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-af',
                        f'{sr},areverse,{sr},areverse', '-ar', '48000', out], check=True)
    return out

RATE_STEPS = (('+10%', '+15%', '+10%'), ('+15%', '+15%', '+15%'), ('+15%', '+20%', '+15%'), ('+20%', '+20%', '+20%'))

# gaps (s): voice-0 start, hook end->reveal, reveal->voice-1, voice-1 end->end card, end card->voice-2, tail hold
GAP_PROFILES = (('normal', (0.10, 0.15, 0.20, 0.20, 0.20, 0.40)),
                ('tight', (0.05, 0.10, 0.10, 0.10, 0.10, 0.30)))

def plan(name, clip, allow_over=False):
    """Generate voice lines; pick the gentlest gap/rate combination that fits MAX_LEN; return timings.
    With allow_over, return the shortest combination even if it is over MAX_LEN (flagged draft)."""
    lines = clip['voice'] + [END_LINE]
    for gname, (g0, g1, g2, g3, g4, g5) in GAP_PROFILES:
        for rates in RATE_STEPS:
            paths, ds = [], []
            for i, (txt, rt) in enumerate(zip(lines, rates)):
                p = os.path.join(WORK, f'{name}-v{i}-{rt.strip("+%")}.mp3')
                if not os.path.exists(p): tts(txt, rt, p)
                t = trimmed(p); paths.append(t); ds.append(dur(t))
            v0 = g0
            t_rev = v0 + ds[0] + g1          # reveal scene starts after hook line finishes
            v1 = t_rev + g2
            t_end = v1 + ds[1] + g3          # end card after explanation finishes
            v2 = t_end + g4
            end = max(MIN_LEN, v2 + ds[2] + g5)
            print(f'  {name} gaps {gname} rates {rates}: lines {[round(x, 2) for x in ds]} -> {end:.2f}s')
            P = dict(paths=paths, durs=ds, rates=rates, gaps=gname, starts=[v0, v1, v2],
                     t_rev=t_rev, t_end=t_end, end=end)
            if end <= MAX_LEN:
                return P
    if allow_over:
        return P
    raise SystemExit(f'{name}: voice does not fit {MAX_LEN}s even at +20% with tight gaps (needs {end:.2f}s)')

def mix_audio(name, P, out):
    cues = os.path.join(WORK, f'{name}-cues.wav')
    E = P['end']
    # soft cue sounds: band-limited noise hit at 0, 1.5 kHz tick at reveal, 1 kHz tick at end card
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error',
        '-f', 'lavfi', '-i', f'anoisesrc=color=pink:d=0.35:a=0.5,highpass=f=150,lowpass=f=2000,afade=t=out:st=0.02:d=0.33',
        '-f', 'lavfi', '-i', 'sine=f=1500:d=0.12,afade=t=out:st=0.01:d=0.11',
        '-f', 'lavfi', '-i', 'sine=f=1000:d=0.12,afade=t=out:st=0.01:d=0.11',
        '-filter_complex',
        f'[0]volume=0.35,apad=whole_dur={E}[a];'
        f'[1]volume=0.25,adelay={int(P["t_rev"]*1000)}:all=1,apad=whole_dur={E}[b];'
        f'[2]volume=0.2,adelay={int(P["t_end"]*1000)}:all=1,apad=whole_dur={E}[c];'
        f'[a][b][c]amix=inputs=3:normalize=0,atrim=0:{E}[o]',
        '-map', '[o]', '-ar', '48000', '-ac', '2', cues], check=True)
    pre = os.path.join(WORK, f'{name}-premix.wav')
    ins, fc = [], []
    for i, (p, s) in enumerate(zip(P['paths'], P['starts'])):
        ins += ['-i', p]
        fc.append(f'[{i}]aresample=48000,aformat=channel_layouts=stereo,adelay={int(s*1000)}:all=1,apad=whole_dur={E}[v{i}]')
    ins += ['-i', cues]
    fc.append(f'[3]volume=3.0[cu]')  # cues peak ~16 dB under the voice peaks
    fc.append(f'[v0][v1][v2][cu]amix=inputs=4:normalize=0,atrim=0:{E}[o]')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *ins, '-filter_complex', ';'.join(fc),
                    '-map', '[o]', '-ar', '48000', pre], check=True)
    # two-pass loudnorm to -14 LUFS
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', pre, '-af',
                        'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'],
                       capture_output=True, text=True).stderr
    m = json.loads(r[r.rindex('{'):r.rindex('}') + 1])
    af = (f'loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m["input_i"]}:measured_TP={m["input_tp"]}:'
          f'measured_LRA={m["input_lra"]}:measured_thresh={m["input_thresh"]}:offset={m["target_offset"]}:linear=true')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', pre, '-af', af, '-ar', '48000', out], check=True)

# ---------------- video ----------------
def render_video(clip, P, out):
    T_REV, T_END, END = P['t_rev'], P['t_end'], P['end']
    N = int(round(END * FPS))
    up = card(*clip['dealer']); pc = [card(*c) for c in clip['player']]

    def table():
        base = Image.new('RGBA', (W, H), FELT + (255,))
        d = ImageDraw.Draw(base)
        d.ellipse((-300, 300, W + 300, H + 300), fill=(14, 34, 26, 255))
        ctext(d, 120, RULES, ('Inter-Bold.otf', 34), MUTED)
        ctext(d, 250, 'DEALER', f('Inter-SemiBold.otf', 34), MUTED)
        base.alpha_composite(up, (W // 2 - 145, 290))
        ctext(d, 760, 'YOU', f('Inter-SemiBold.otf', 34), MUTED)
        base.alpha_composite(pc[0], (W // 2 - 300, 800))
        base.alpha_composite(pc[1], (W // 2 + 10, 800))
        return base, d

    def scene(t):
        base, d = table()
        if t < T_REV:
            pulse = 1 + 0.035 * math.sin(t * 2 * math.pi * 1.6)
            ys = [1330, 1470]
            for i, s in enumerate(clip['hook']):
                ctext(d, ys[i], s, ('Inter-Black.otf', int(112 * pulse)), GOLD if i == 0 else WHITE, 4)
        else:
            a = ease((t - T_REV) / 0.35)
            ctext(d, 1300, clip['answer'], f('Inter-Black.otf', int(190 * (0.7 + 0.3 * a))), GREEN, 5)
            if t > T_REV + 0.6:
                ctext(d, 1480, clip['ev'][0], ('Inter-Black.otf', 64), WHITE, 3)
            if len(clip['ev']) > 1 and t > T_REV + 1.2:
                ctext(d, 1580, clip['ev'][1], ('Inter-SemiBold.otf', 46), CREAM)
        return base

    def endscreen(t):
        im = Image.new('RGBA', (W, H), FELT + (255,))
        d = ImageDraw.Draw(im)
        a = ease((t - T_END) / 0.4)
        ctext(d, 120, RULES, ('Inter-Bold.otf', 34), MUTED)
        ctext(d, 640, 'Practice this decision free', ('Inter-Bold.otf', 64), CREAM)
        ctext(d, 790, 'playpokergym.com/go', ('Inter-Black.otf', int(104 * (0.85 + 0.15 * a))), GOLD, 3)
        ctext(d, 1120, 'Follow for the next hand', f('Inter-Bold.otf', 50), WHITE)
        ctext(d, 1700, 'Play Poker Gym · free · no signup · no real money', ('Inter-SemiBold.otf', 34), MUTED)
        ctext(d, 1760, 'Learning the best play lowers the house edge; it never beats it.', ('Inter-SemiBold.otf', 28), MUTED)
        return im

    ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
        '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-an', '-c:v', 'libx264', '-preset', 'slow',
        '-b:v', '9M', '-minrate', '9M', '-maxrate', '9M', '-bufsize', '9M', '-x264-params', 'nal-hrd=cbr',
        '-pix_fmt', 'yuv420p', '-r', str(FPS), out], stdin=subprocess.PIPE)
    for i in range(N):
        t = i / FPS
        fr = endscreen(t) if t >= T_END else scene(t)
        if t < T_REV:   # punch-in at frame 0, then slow push-in during the hook
            z = 1.06 - 0.06 * ease(t / 0.3) + 0.03 * (t / T_REV)
        elif t < T_END:
            z = 1.0 + 0.04 * ease((t - T_REV) / 0.25) * (1 - ease((t - T_REV - 0.25) / 0.5))
        else:
            z = 1.0
        if abs(z - 1) > 1e-4:
            cw, ch = W / z, H / z
            fr = fr.crop(((W - cw) / 2, (H - ch) / 2, (W + cw) / 2, (H + ch) / 2)).resize((W, H), Image.LANCZOS)
        ff.stdin.write(fr.convert('RGB').tobytes())
    ff.stdin.close(); ff.wait()

def contact_sheet(mp4, png, times=(0, 0.3, 3, 6, 9, 12)):
    tiles = []
    for t in times:
        p = os.path.join(WORK, f'frame-{t}.png')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', str(t), '-i', mp4, '-frames:v', '1', p], check=True)
        im = Image.open(p).convert('RGB').resize((432, 768), Image.LANCZOS)
        d = ImageDraw.Draw(im); d.rectangle((0, 728, 90, 768), fill=(0, 0, 0)); d.text((8, 734), f'{t}s', font=f('Inter-Bold.otf', 26), fill=(255, 255, 0))
        tiles.append(im)
    sheet = Image.new('RGB', (432 * 3 + 40, 768 * 2 + 30), (60, 60, 60))
    for i, im in enumerate(tiles):
        sheet.paste(im, (10 + (i % 3) * 442, 10 + (i // 3) * 778))
    sheet.save(png)

def main():
    args = sys.argv[1:]
    dry = '--plan' in args
    over = '--allow-over' in args
    names = [a for a in args if not a.startswith('--')] or list(CLIPS)
    for name in names:
        clip = CLIPS[name]
        try:
            P = plan(name, clip, allow_over=over)
        except SystemExit as e:
            print('SKIP', e); continue
        if dry: continue
        tag = '' if P['end'] <= MAX_LEN else '.OVER-15s-draft'
        print(name, json.dumps({k: (v if k != 'paths' else None) for k, v in P.items() if k != 'paths'}))
        vid, aud, out = (os.path.join(WORK, f'{name}.video.mp4'), os.path.join(WORK, f'{name}.audio.wav'),
                         os.path.join(HERE, f'{name}{tag}.mp4'))
        render_video(clip, P, vid)
        mix_audio(name, P, aud)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', vid, '-i', aud, '-map', '0:v', '-map', '1:a',
                        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000',
                        '-movflags', '+faststart', out], check=True)
        contact_sheet(out, os.path.join(HERE, f'{name}{tag}-frames.png'))

if __name__ == '__main__':
    main()
