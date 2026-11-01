# Generates 7 self-contained mockup directions. Run: python3 gen.py
M = "data:image/webp;base64," + open('mascot.b64').read()
RED = set('♥♦')
def card(r, s, cls=''):
    c = 'red' if s in RED else ''
    return f'<span class="card {c} {cls}"><b>{r}</b><i>{s}</i><em>{s}</em></span>'
BACK = '<span class="card back"></span>'
GAMES = [("Blackjack","Hit, stand, double, split — graded on every decision against basic strategy.","14 guides"),
         ("Video poker","Jacks or Better holds, scored against the 9/6 pay table.","5 guides"),
         ("Baccarat","Learn the third-card rules and why Banker has the lowest edge.","5 guides"),
         ("Texas Hold'em","Outs, odds and best-five-card hands, one spot at a time.","7 guides")]
GUIDES = [("Blackjack","16 vs 10: hit"),("Blackjack","11 vs 10: double"),("Blackjack","8,8 vs 10: split"),
          ("Video poker","Pair of jacks or four to a flush?"),("Baccarat","Banker, Player, Tie: the house edge"),
          ("Hold'em","Flush draw: odds by the river")]
COACH = ("Hit.", "With 16 against a dealer 10, standing loses more often than hitting. The dealer's 10 makes 17 or better likely, so take the card.")
def nav(brand_extra=''):
    return f'''<header class="nav"><a class="brand"><img src="{M}" alt="">Poker Gym{brand_extra}</a>
<nav><a>Trainer</a><a>Guides</a><a>Daily Drill</a><a>About</a></nav><a class="btn sm">Start training</a></header>'''
def table(big=True):
    return f'''<div class="felt">
 <div class="row lbl">Dealer <span class="pill">shows 10</span></div>
 <div class="hand">{card('10','♣')}{BACK}</div>
 <div class="row lbl">You <span class="pill">16</span></div>
 <div class="hand">{card('10','♠')}{card('6','♥')}</div>
 <div class="acts"><a class="act on">Hit</a><a class="act">Stand</a><a class="act">Double</a><a class="act dim">Split</a></div>
</div>'''
def coach():
    return f'''<div class="coach"><img src="{M}" alt=""><div><div class="k">Coach</div><strong>{COACH[0]}</strong> {COACH[1]}</div></div>'''
def games_html():
    return ''.join(f'<article class="game"><div class="gi">{i+1:02d}</div><h3>{g}</h3><p>{d}</p><span class="meta">{n} · Free practice →</span></article>' for i,(g,d,n) in enumerate(GAMES))
def guides_html():
    return ''.join(f'<li><span class="tag">{t}</span><span>{n}</span><span class="ar">Read, then train →</span></li>' for t,n in GUIDES)
def trainer_view():
    return f'''<section class="trainer" id="trainer"><div class="tlabel">Trainer view · /web/</div>
<div class="app">
 <aside class="side"><div class="k">Games</div><a class="on">Blackjack</a><a>Video poker</a><a>Baccarat</a><a>Hold'em</a>
  <div class="k">Session</div><div class="grid">{''.join('<i class="g"></i>' if i not in (3,7) else '<i class="b"></i>' for i in range(10))}<i class="e"></i><i class="e"></i></div>
  <div class="ph">Example session grid — placeholder</div>
  <div class="k">Read first</div><a class="lnk">16 vs 10: hit</a><a class="lnk">12 vs 2: stand</a></div></aside>
 <main class="stage">{table()}{coach()}</main>
</div></section>'''
def page(key, title, css, hero, extra='', body_cls=''):
    return f'''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Poker Gym — {title}</title><style>{BASE}{css}</style></head><body class="{body_cls}">
{nav()}{hero}
<section class="games"><div class="sh"><span class="k">Four games</span><h2>Pick a table.</h2></div><div class="gg">{games_html()}</div></section>
{extra}
<section class="guides"><div class="sh"><span class="k">33 guides</span><h2>Read the hand. Then play it.</h2></div><ul>{guides_html()}</ul></section>
{trainer_view()}
<section class="drill"><div><span class="k">Daily Drill</span><h2>Five hands. Once a day.</h2><p>Same five hands for everyone, every day. Play them, then share your grid.</p><a class="btn">Play today's drill</a></div>
<div class="share"><div class="hand sm">{BACK*5}</div><div class="ph">Example grid, not real results</div><div class="emo">🟩🟩🟥🟩🟩</div></div></section>
<footer><span>Poker Gym · Free learn-to-play trainer</span><span>Guides · Privacy · About</span></footer></body></html>'''

BASE = '''*{box-sizing:border-box;margin:0;padding:0}a{color:inherit;text-decoration:none;cursor:pointer}img{display:block}ul{list-style:none}
html,body{overflow-x:clip}body{-webkit-font-smoothing:antialiased}
.nav{display:flex;align-items:center;gap:32px;max-width:1240px;margin:0 auto;padding:22px 32px}.nav nav{display:flex;gap:26px;margin-right:auto;font-size:14.5px;opacity:.8}
.brand{display:flex;align-items:center;gap:10px;font-weight:700;font-size:17px}.brand img{width:30px;height:30px;border-radius:50%}
.btn{display:inline-flex;align-items:center;justify-content:center;padding:14px 22px;border-radius:10px;font-weight:600;font-size:15px}.btn.sm{padding:9px 15px;font-size:14px}
section{max-width:1240px;margin:0 auto;padding:96px 32px;overflow:clip}
.k{font-size:12px;letter-spacing:.14em;text-transform:uppercase;font-weight:600}
.sh{margin-bottom:36px}.sh h2,.drill h2{font-size:44px;line-height:1.05;margin-top:10px;letter-spacing:-.02em}
.card{position:relative;display:inline-block;width:74px;aspect-ratio:5/7;border-radius:8px;background:#fffdf8;color:#16201b;box-shadow:0 6px 18px rgba(0,0,0,.25);font-family:Inter,sans-serif;flex:none}
.card b{position:absolute;left:8px;top:5px;font-size:20px;line-height:1}.card i{position:absolute;left:9px;top:27px;font-style:normal;font-size:14px}
.card em{position:absolute;right:8px;bottom:4px;font-style:normal;font-size:34px}.card.red{color:#b3262e}
.card.back{background:repeating-linear-gradient(45deg,#1b5a43 0 6px,#134433 6px 12px);border:4px solid #fffdf8}
.hand{display:flex;gap:10px}.hand.sm .card{width:40px;border-width:2px}
.felt{background:radial-gradient(120% 90% at 50% 20%,#1d5a43,#0c2a20);border-radius:22px;padding:26px;color:#f3efe4;display:flex;flex-direction:column;gap:12px}
.felt .lbl{display:flex;gap:10px;align-items:center;font-size:13px;opacity:.85}.pill{background:rgba(255,255,255,.12);padding:3px 9px;border-radius:99px;font-size:12px}
.acts{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:8px}.act{text-align:center;padding:11px 0;border-radius:9px;background:rgba(255,255,255,.1);font-weight:600;font-size:14px}.act.on{background:#d9b672;color:#16201b}.act.dim{opacity:.35}
.coach{display:flex;gap:14px;align-items:flex-start;padding:18px;border-radius:16px;font-size:14.5px;line-height:1.5}.coach img{width:46px;height:46px;border-radius:50%;flex:none}.coach .k{margin-bottom:4px;font-size:11px}
.gg{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}.game{padding:24px;border-radius:16px;display:flex;flex-direction:column;gap:10px;min-height:230px}.game h3{font-size:22px}.game p{font-size:14.5px;line-height:1.5;opacity:.8;flex:1}.gi{font-size:12px;opacity:.6;font-family:'JetBrains Mono',monospace}.meta{font-size:13px;font-weight:600}
.guides ul{display:grid;grid-template-columns:1fr 1fr;gap:12px}.guides li{display:flex;gap:14px;align-items:center;padding:18px 20px;border-radius:12px;font-size:16px;font-weight:500}.tag{font-size:11px;letter-spacing:.1em;text-transform:uppercase;opacity:.65;width:96px;flex:none}.ar{margin-left:auto;font-size:13px;opacity:.6;white-space:nowrap}
.tlabel{font-family:'JetBrains Mono',monospace;font-size:12px;opacity:.6;margin-bottom:14px}
.app{display:grid;grid-template-columns:240px 1fr;border-radius:20px;overflow:hidden;min-height:540px}
.side{padding:22px;display:flex;flex-direction:column;gap:6px;font-size:14px}.side .k{margin:14px 0 6px;font-size:11px;opacity:.6}.side a{padding:8px 10px;border-radius:8px}.side a.on{font-weight:600}
.grid{display:grid;grid-template-columns:repeat(6,1fr);gap:5px}.grid i{aspect-ratio:1;border-radius:4px}.g{background:#3fa66b}.b{background:#c0453f}.e{background:rgba(128,128,128,.25)}
.ph{font-size:11px;opacity:.55;margin-top:4px}
.stage{padding:28px;display:grid;grid-template-columns:1.3fr 1fr;gap:20px;align-items:start}
.drill{display:grid;grid-template-columns:1.2fr 1fr;gap:40px;align-items:center}.drill p{margin:16px 0 26px;font-size:17px;line-height:1.55;opacity:.8;max-width:460px}
.share{padding:28px;border-radius:18px;display:flex;flex-direction:column;gap:12px;align-items:flex-start}.emo{font-size:28px;letter-spacing:4px}
footer{max-width:1240px;margin:0 auto;padding:36px 32px 48px;display:flex;justify-content:space-between;font-size:13px;opacity:.6}
@media(max-width:700px){.nav nav{display:none}.nav{padding:16px 20px}section{padding:56px 20px}.sh h2,.drill h2{font-size:32px}
.gg,.guides ul,.drill,.stage,.app{grid-template-columns:1fr}.game{min-height:0}.side{display:none}.app{display:block;min-height:0!important}.stage{padding:14px;display:flex;flex-direction:column}.stage>*{width:100%}.card{width:60px}.card em{font-size:26px}.ar{display:none}footer{flex-direction:column;gap:8px;padding:28px 20px}.tag{width:78px}}
'''
D = {}
# 1 OBSIDIAN — dark premium SaaS
D['01-obsidian'] = ("Obsidian", '''
body{background:#08090a;color:#e8e8ea;font-family:Inter,sans-serif}.nav{border-bottom:1px solid #1c1d20;max-width:none}.btn{background:#f2f2f2;color:#08090a}.btn.ghost{background:transparent;color:#e8e8ea;border:1px solid #2a2b2f}
.k{color:#8a8f98}.hero{text-align:center;padding-top:110px;position:relative}.hero:before{content:"";position:absolute;inset:-80px 0 auto;height:620px;background:radial-gradient(50% 50% at 50% 40%,rgba(217,182,114,.20),transparent 70%);z-index:-1}
.hero .chip{display:inline-flex;gap:8px;border:1px solid #2a2b2f;border-radius:99px;padding:6px 14px;font-size:13px;color:#b4b8bf}
.hero h1{font-size:76px;line-height:1.02;letter-spacing:-.045em;font-weight:600;margin:24px auto 22px;max-width:900px;background:linear-gradient(180deg,#fff 40%,#8a8f98);-webkit-background-clip:text;color:transparent}
.hero p{font-size:19px;color:#8a8f98;max-width:600px;margin:0 auto 32px;line-height:1.5}.ctas{display:flex;gap:12px;justify-content:center}
.shot{margin:72px auto 0;max-width:1080px;border:1px solid #23252a;border-radius:18px;background:#0f1012;padding:10px;box-shadow:0 40px 120px rgba(217,182,114,.10)}.shot .app{min-height:470px}
.game,.guides li,.share{background:#0f1012;border:1px solid #1c1d20}.meta{color:#d9b672}.app{background:#0f1012;border:1px solid #1c1d20}.side{border-right:1px solid #1c1d20}.side a.on{background:#1a1b1e}
.coach{background:#16171a;border:1px solid #23252a}.coach strong{color:#d9b672}.felt{border:1px solid #23402f}
@media(max-width:700px){.hero{padding-top:56px}.hero h1{font-size:44px}.ctas{flex-direction:column}.shot{margin-top:40px}}
''', lambda: f'''<section class="hero"><span class="chip">Daily Drill is live · five hands a day</span>
<h1>Learn every casino decision before it costs you.</h1>
<p>Poker Gym is a free trainer for blackjack, video poker, baccarat and Hold'em. Play a hand, and the coach tells you the right move and why.</p>
<div class="ctas"><a class="btn">Start training — free</a><a class="btn ghost">Browse 33 guides</a></div>
<div class="shot"><div class="app"><aside class="side"><div class="k">Games</div><a class="on">Blackjack</a><a>Video poker</a><a>Baccarat</a><a>Hold'em</a></aside><main class="stage">{table()}{coach()}</main></div></div></section>''',
 "Linear, Raycast, GTO Wizard")
# 2 STREAK — playful gamified
D['02-streak'] = ("Streak", '''
body{background:#fffaf0;color:#1f2a24;font-family:Nunito,sans-serif;font-weight:600}h1,h2,h3,.brand{font-family:Fredoka,sans-serif;font-weight:600}
.btn{background:#2fb565;color:#fff;border-radius:16px;box-shadow:0 5px 0 #1f8a4a;text-transform:lowercase;font-size:17px;padding:16px 26px}.btn.sm{font-size:14px;box-shadow:0 3px 0 #1f8a4a}
.hero{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center;padding-top:60px}.hero h1{font-size:74px;line-height:.98;text-transform:lowercase;color:#1f8a4a}.hero h1 span{color:#ff7a45}
.hero p{font-size:20px;margin:20px 0 30px;line-height:1.45;color:#4a564f}.blob{position:relative;background:#cdf3dc;border-radius:48% 52% 45% 55%;aspect-ratio:1;display:grid;place-items:center}
.blob img{width:72%;border-radius:50%;filter:drop-shadow(0 18px 24px rgba(0,0,0,.18))}.bub{position:absolute;background:#fff;border-radius:18px;padding:12px 16px;box-shadow:0 6px 0 #e8e0cf;font-size:15px}.bub.a{top:8%;right:-4%}.bub.b{bottom:10%;left:-6%}
.xp{display:flex;gap:10px;margin-top:22px;font-size:14px;color:#4a564f}.xp span{background:#fff;border:2px solid #efe6d3;border-radius:12px;padding:8px 12px}
.k{color:#ff7a45}.game{background:#fff;border:2px solid #efe6d3;box-shadow:0 6px 0 #efe6d3;border-radius:22px}.game:nth-child(1){background:#e6f7ec}.game:nth-child(2){background:#fff0e6}.game:nth-child(3){background:#eef0ff}.game:nth-child(4){background:#fff7d6}
.gi{display:none}.meta{color:#1f8a4a}.guides li{background:#fff;border:2px solid #efe6d3;border-radius:18px}
.app{background:#fff;border:2px solid #efe6d3;box-shadow:0 8px 0 #efe6d3;border-radius:28px}.side{background:#f7f1e3}.side a.on{background:#fff;color:#1f8a4a}
.felt{border-radius:24px}.act{border-radius:14px;box-shadow:0 4px 0 rgba(0,0,0,.25)}.act.on{background:#2fb565;color:#fff;box-shadow:0 4px 0 #1f8a4a}
.coach{background:#e6f7ec;border:2px solid #bfe9cf;border-radius:22px}.coach strong{color:#1f8a4a}
.share{background:#fff;border:2px solid #efe6d3;box-shadow:0 6px 0 #efe6d3;border-radius:24px}
@media(max-width:700px){.hero{grid-template-columns:1fr;padding-top:24px}.hero h1{font-size:50px}.blob{width:86%;margin:0 auto}.bub.a{right:-8%}.bub.b{left:-8%}}
''', lambda: f'''<section class="hero"><div><h1>free. fun.<br><span>actually right.</span></h1>
<p>Bite-size casino training. Play a hand, get coached on it, keep your streak going.</p><a class="btn">start training</a>
<div class="xp"><span>🔥 streak — placeholder</span><span>⭐ XP — placeholder</span></div></div>
<div class="blob"><img src="{M}" alt="Poker Gym mascot"><div class="bub a">16 vs 10? <b>hit it.</b></div><div class="bub b">today's drill: 5 hands</div></div></section>''',
 "Duolingo, Family, Balatro")
# 3 EDITORIAL
D['03-quarterly'] = ("The Quarterly", '''
body{background:#f3efe6;color:#141414;font-family:Inter,sans-serif}h1,h2,h3{font-family:'Instrument Serif',serif;font-weight:400}.brand{font-family:'Instrument Serif',serif;font-size:24px;font-weight:400}
.nav{border-bottom:2px solid #141414}.btn{background:#141414;color:#f3efe6;border-radius:0}.k{font-family:'JetBrains Mono',monospace;font-weight:500;color:#c2321f}
.hero{display:grid;grid-template-columns:1.25fr 1fr;gap:0;border-bottom:2px solid #141414;padding-top:40px;padding-bottom:0}
.hero .lead{padding:20px 40px 60px 0;border-right:1px solid #141414}.hero h1{font-size:112px;line-height:.9;letter-spacing:-.02em;margin:18px 0 26px}.hero h1 em{color:#c2321f}
.hero p{font-size:20px;line-height:1.5;max-width:520px;margin-bottom:28px;font-family:Georgia,serif}
.hero .col{padding:20px 0 40px 40px}.hero .col .felt{border-radius:0}.cap{font-family:'JetBrains Mono',monospace;font-size:12px;margin-top:12px;opacity:.7}
.issue{display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:12px;border-bottom:1px solid #141414;padding:8px 0;margin-top:30px}
.gg{gap:0;border-top:2px solid #141414}.game{border-radius:0;border-right:1px solid #141414;padding:24px 22px 28px}.game:last-child{border-right:0}.game h3{font-size:34px}.gi{color:#c2321f;font-size:14px}.meta{font-family:'JetBrains Mono',monospace;font-size:12px}
.sh h2,.drill h2{font-family:'Instrument Serif',serif;font-size:64px;font-weight:400}
.guides ul{gap:0;border-top:2px solid #141414}.guides li{border-radius:0;border-bottom:1px solid #141414;font-family:'Instrument Serif',serif;font-size:26px;padding:20px 4px}.tag{font-family:'JetBrains Mono',monospace;color:#c2321f;opacity:1}
.app{border:2px solid #141414;border-radius:0}.side{border-right:1px solid #141414;background:#ebe5d8}.side a.on{background:#141414;color:#f3efe6;border-radius:0}.felt{border-radius:0}.act{border-radius:0}.act.on{background:#c2321f;color:#fff}
.coach{border-left:4px solid #c2321f;border-radius:0;background:#fff;font-family:Georgia,serif;font-size:16px}.share{border:2px solid #141414;border-radius:0}.card{border-radius:5px}
@media(max-width:700px){.hero{grid-template-columns:1fr}.hero .lead{border-right:0;padding:0 0 30px}.hero h1{font-size:64px}.hero .col{padding:0 0 30px}.game{border-right:0;border-bottom:1px solid #141414}.sh h2,.drill h2{font-size:42px}.guides li{font-size:21px}}
''', lambda: f'''<section class="hero"><div class="lead"><div class="issue"><span>Vol. 1 · The Rulebook</span><span>Free · 4 games · 33 guides</span></div>
<span class="k" style="display:block;margin-top:26px">Blackjack, decision no. 1</span><h1>Sixteen against a ten. <em>Hit.</em></h1>
<p>It feels wrong, and that's exactly why it's worth practicing. Poker Gym is a free trainer that coaches every decision in blackjack, video poker, baccarat and Hold'em.</p><a class="btn">Train this hand →</a></div>
<div class="col">{table()}<div class="cap">Fig. 1 — The hand nobody wants. The trainer grades it on the spot.</div></div></section>''',
 "The Verge, Framer (sans + serif), Rapha, the chosen fresh 'rulebook' mockup")
# 4 STAGESHOW
D['04-stageshow'] = ("Stageshow", '''
body{background:#f6f6f4;color:#111;font-family:Geist,Inter,sans-serif}.btn{background:#111;color:#fff;border-radius:99px}.btn.ghost{background:#fff;color:#111;border:1px solid #ddd}.k{color:#2f8a5a}
.hero{padding-top:70px;display:grid;grid-template-columns:.9fr 1.3fr;gap:30px;align-items:center;max-width:1320px}.hero h1{font-size:64px;line-height:1.02;letter-spacing:-.04em;font-weight:600}.hero p{font-size:18px;color:#555;margin:20px 0 30px;line-height:1.5}.ctas{display:flex;gap:10px}
.win{background:#fff;border-radius:16px;box-shadow:0 1px 0 #e4e4e0,0 30px 80px rgba(0,0,0,.12);margin-right:-90px;overflow:hidden}.bar{display:flex;gap:7px;padding:12px 14px;border-bottom:1px solid #eee;align-items:center}.bar i{width:11px;height:11px;border-radius:50%;background:#e2e2de}.bar span{margin-left:18px;font-size:12px;color:#888;background:#f3f3f1;padding:4px 40px;border-radius:6px}
.win .stage{grid-template-columns:1.25fr 1fr;padding:22px;padding-right:110px}.cursor{position:absolute;width:22px;height:22px;left:40px;top:252px;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M3 2l7 19 2.5-8L20 10z' fill='%23111' stroke='%23fff' stroke-width='1.5'/%3E%3C/svg%3E") no-repeat}
.felt{position:relative}.coach{background:#f3faf6;border:1px solid #d6eadf}.coach strong{color:#2f8a5a}.bubble{position:absolute;right:-14px;top:-18px;background:#111;color:#fff;font-size:12px;padding:6px 10px;border-radius:99px}
.bento{display:grid;grid-template-columns:repeat(6,1fr);grid-auto-rows:220px;gap:14px}.tile{background:#fff;border-radius:20px;padding:26px;border:1px solid #e9e9e5;overflow:hidden;position:relative}.tile h3{font-size:20px;letter-spacing:-.02em}.tile p{color:#666;font-size:14px;margin-top:6px;line-height:1.45}
.t1{grid-column:span 4;grid-row:span 2}.t2{grid-column:span 2}.t3{grid-column:span 2}.t4{grid-column:span 3}.t5{grid-column:span 3}
.t1 .felt{position:absolute;left:26px;right:-40px;bottom:-40px}.vp{display:flex;gap:8px;margin-top:22px}.vp .card{width:52px}.vp .held{transform:translateY(-10px);outline:3px solid #2f8a5a;outline-offset:2px}
.mini{margin-top:18px;display:flex;flex-direction:column;gap:7px}.mini div{height:10px;border-radius:5px;background:#efefec}.mini div.r{background:#111;width:70%;height:12px}
.game,.guides li,.share,.app{background:#fff;border:1px solid #e9e9e5}.side{background:#fafaf8;border-right:1px solid #eee}.side a.on{background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.08)}.meta{color:#2f8a5a}
@media(max-width:700px){.hero{grid-template-columns:1fr}.hero h1{font-size:42px}.win{margin-right:-60px}.win .stage{grid-template-columns:1fr}.cursor{display:none}.bento{grid-template-columns:1fr;grid-auto-rows:auto}.tile{grid-column:auto!important;grid-row:auto!important;min-height:200px}.t1{min-height:420px!important}}
''', lambda: f'''<section class="hero"><div><span class="k">Free casino trainer</span><h1 style="margin-top:12px">Play the hand. The coach shows you why.</h1>
<p>Blackjack, video poker, baccarat and Hold'em, graded decision by decision, with 33 guides that open the exact hand they explain.</p><div class="ctas"><a class="btn">Start training</a><a class="btn ghost">Today's drill</a></div></div>
<div class="win" style="position:relative"><div class="bar"><i></i><i></i><i></i><span>playpokergym.com/web</span></div><div class="stage">
<div class="felt">{'<span class="bubble">Correct ✓</span>'}<div class="row lbl">Dealer <span class="pill">shows 10</span></div><div class="hand">{card('10','♣')}{BACK}</div><div class="row lbl">You <span class="pill">16</span></div><div class="hand">{card('10','♠')}{card('6','♥')}</div><div class="acts"><a class="act on">Hit</a><a class="act">Stand</a><a class="act">Double</a><a class="act dim">Split</a></div></div>
{coach()}</div><span class="cursor"></span></div></section>
<section><div class="sh"><span class="k">Everything in one gym</span><h2>Built like a product, priced like a library card.</h2></div><div class="bento">
<div class="tile t1"><h3>A coach on every decision</h3><p>Pick a move. Right or wrong, you see the correct play and the reason in one line.</p>{table()}</div>
<div class="tile t2"><h3>Video poker holds</h3><p>Pair of jacks or four to a flush? Hold the jacks.</p><div class="vp">{card('J','♥','held')}{card('J','♣','held')}{card('4','♥')}{card('8','♥')}{card('2','♥')}</div></div>
<div class="tile t3"><h3>Daily Drill</h3><p>Same five hands for everyone, every day.</p><div class="emo" style="margin-top:20px">🟩🟩🟥🟩🟩</div><div class="ph">Example grid</div></div>
<div class="tile t4"><h3>33 guides</h3><p>Each one ends on "Read, then train."</p><div class="mini"><div class="r"></div><div></div><div style="width:80%"></div><div style="width:60%"></div></div></div>
<div class="tile t5"><h3>Baccarat, explained</h3><p>Banker carries the lowest house edge (about 1.06%). Tie is the worst bet on the table.</p></div></div></section>''',
 "Stageshow post (benjitaylor) + kit, Raycast, Stripe, Apple")
# 5 HIGH ROLLER
D['05-high-roller'] = ("High Roller", '''
body{background:#07130e;color:#efe6cf;font-family:Inter,sans-serif}h1,h2,h3,.brand{font-family:'Cormorant Garamond',serif;font-weight:600}.brand{font-size:22px;letter-spacing:.04em}
.btn{background:linear-gradient(180deg,#e9cf8f,#b8893a);color:#1a140a;border-radius:2px;letter-spacing:.08em;text-transform:uppercase;font-size:13px}.btn.sm{font-size:11px}.k{color:#d9b672;font-family:'Cormorant SC',serif;font-size:16px;letter-spacing:.2em}
.hero{text-align:center;padding-top:80px;position:relative;max-width:none;background:radial-gradient(60% 70% at 50% 30%,#164a35,transparent 70%)}.hero h1{font-size:96px;line-height:.95;font-weight:500;margin:20px 0}.hero h1 em{color:#d9b672}
.hero p{font-size:18px;opacity:.75;max-width:560px;margin:0 auto 34px;line-height:1.6}.orn{width:120px;height:1px;background:#d9b672;margin:0 auto 18px;position:relative}.orn:after{content:"♠";position:absolute;left:50%;top:-12px;transform:translateX(-50%);background:#07130e;padding:0 10px;color:#d9b672}
.fan{display:flex;justify-content:center;margin-top:64px;height:220px}.fan .card{width:120px;margin:0 -18px;transform-origin:50% 160%}.fan .card em{font-size:52px}.fan .card b{font-size:28px}.fan .card i{top:36px;font-size:18px}
.fan .card:nth-child(1){transform:rotate(-16deg)}.fan .card:nth-child(2){transform:rotate(-8deg)}.fan .card:nth-child(4){transform:rotate(8deg)}.fan .card:nth-child(5){transform:rotate(16deg)}
.game,.guides li,.share{background:linear-gradient(180deg,#0d2219,#0a1a13);border:1px solid #2b3f2f;border-radius:4px}.game h3{font-size:30px}.gi{color:#d9b672}.meta{color:#d9b672}
.sh{text-align:center}.sh h2,.drill h2{font-size:58px;font-weight:500}
.app{border:1px solid #3b4a33;border-radius:6px;background:#0a1a13}.side{border-right:1px solid #2b3f2f}.side a.on{color:#d9b672;border-left:2px solid #d9b672;border-radius:0}
.felt{border:6px solid #3a2a14;box-shadow:inset 0 0 0 2px #b8893a;border-radius:120px 120px 22px 22px;padding:34px 40px}.coach{background:#0d2219;border:1px solid #b8893a55}.coach strong{color:#d9b672}
@media(max-width:700px){.hero h1{font-size:56px}.fan{height:150px;margin-top:40px}.fan .card{width:76px;margin:0 -12px}.fan .card em{font-size:30px}.fan .card b{font-size:18px}.fan .card i{top:24px;font-size:13px}.sh h2,.drill h2{font-size:40px}.felt{border-radius:60px 60px 18px 18px;padding:26px 18px}}
''', lambda: f'''<section class="hero"><span class="k">Poker Gym · Est. 2026</span><h1>Play like the house<br><em>is watching.</em></h1><div class="orn"></div>
<p>A free private training room for blackjack, video poker, baccarat and Hold'em. Every decision coached. No chips at risk.</p><a class="btn">Take a seat</a>
<div class="fan">{card('10','♠')}{card('J','♠')}{card('Q','♠')}{card('K','♠')}{card('A','♠')}</div></section>''',
 "PokerStars, Hearthstone (type-as-world), Poolsuite (total mood commitment)")
# 6 MONO — Linear/Vercel minimal
D['06-mono'] = ("Mono", '''
body{background:#fff;color:#0a0a0a;font-family:Geist,Inter,sans-serif}.nav{border-bottom:1px solid #eaeaea;max-width:none}.btn{background:#0a0a0a;color:#fff;border-radius:6px}.btn.ghost{background:#fff;color:#0a0a0a;border:1px solid #eaeaea}
.k{font-family:'Geist Mono',monospace;font-weight:400;color:#666;letter-spacing:.04em}
.frame{max-width:1180px;margin:0 auto;border-left:1px solid #eaeaea;border-right:1px solid #eaeaea}
.hero{display:grid;grid-template-columns:1fr 1fr;padding:0;border-bottom:1px solid #eaeaea}.hero .l{padding:96px 48px;border-right:1px solid #eaeaea}.hero h1{font-size:60px;letter-spacing:-.05em;line-height:1.02;font-weight:600}.hero p{color:#666;font-size:18px;margin:22px 0 30px;line-height:1.55}.ctas{display:flex;gap:10px}
.hero .r{background:#fafafa;display:grid;place-items:center;padding:48px;background-image:linear-gradient(#eee 1px,transparent 1px),linear-gradient(90deg,#eee 1px,transparent 1px);background-size:24px 24px}
.felt{background:#0a0a0a;color:#fff;border-radius:12px;width:100%;max-width:440px}.act.on{background:#fff;color:#0a0a0a}.card.back{background:repeating-linear-gradient(45deg,#333 0 6px,#222 6px 12px)}
.stats{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid #eaeaea;padding:0}.stats div{padding:28px 32px;border-right:1px solid #eaeaea}.stats div:last-child{border:0}.stats b{font-size:32px;letter-spacing:-.03em;display:block}.stats span{font-family:'Geist Mono',monospace;font-size:12px;color:#666}
.gg{gap:0;border:1px solid #eaeaea;border-radius:10px;overflow:hidden}.game{border-radius:0;border-right:1px solid #eaeaea}.game:last-child{border:0}.meta{font-family:'Geist Mono',monospace;font-weight:400;font-size:12px}
.guides ul{gap:0;border:1px solid #eaeaea;border-radius:10px;overflow:hidden}.guides li{border-radius:0;border-bottom:1px solid #eaeaea;font-size:15px}.tag{font-family:'Geist Mono',monospace;text-transform:none;letter-spacing:0}
.app{border:1px solid #eaeaea;border-radius:12px}.side{border-right:1px solid #eaeaea;background:#fafafa}.side a.on{background:#fff;border:1px solid #eaeaea}.coach{border:1px solid #eaeaea}.share{border:1px solid #eaeaea}.g{background:#0a0a0a}.b{background:#e5484d}
@media(max-width:700px){.hero{grid-template-columns:1fr}.hero .l{padding:48px 20px;border-right:0;border-bottom:1px solid #eaeaea}.hero h1{font-size:40px}.hero .r{padding:24px}.stats{grid-template-columns:1fr 1fr}.stats div{border-bottom:1px solid #eaeaea}.game{border-right:0;border-bottom:1px solid #eaeaea}}
''', lambda: f'''<div class="frame"><section class="hero"><div class="l"><span class="k">playpokergym.com</span><h1 style="margin-top:14px">The casino decision trainer.</h1>
<p>Free practice for four games, with a coach that grades every move against the math.</p><div class="ctas"><a class="btn">Start training</a><a class="btn ghost">Read the guides</a></div></div>
<div class="r">{table()}</div></section>
<section class="stats"><div><b>4</b><span>games</span></div><div><b>33</b><span>guides</span></div><div><b>5</b><span>hands in the Daily Drill</span></div><div><b>$0</b><span>to play</span></div></section></div>''',
 "Vercel, Linear, Geist type")
# 7 DOT MATRIX — Nothing / TE
D['07-dot-matrix'] = ("Dot Matrix", '''
body{background:#efefec;color:#111;font-family:'Space Grotesk',sans-serif}.brand{font-family:DotGothic16,monospace;font-weight:400;letter-spacing:.06em;text-transform:uppercase}
.btn{background:#d7261e;color:#fff;border-radius:99px;font-family:'Space Mono',monospace;text-transform:uppercase;font-size:13px;letter-spacing:.06em}.btn.sm{font-size:11px}.k{font-family:'Space Mono',monospace;font-weight:400;color:#d7261e}
h1,h2{font-family:DotGothic16,monospace;font-weight:400;text-transform:uppercase}
.hero{display:grid;grid-template-columns:1.1fr 1fr;gap:24px;padding-top:50px}.hero h1{font-size:84px;line-height:.95;letter-spacing:-.01em}.hero p{font-size:18px;margin:22px 0 30px;line-height:1.5;max-width:470px;color:#444}
.device{background:#dcdcd8;border-radius:28px;padding:22px;box-shadow:inset 0 2px 0 #fff,0 20px 40px rgba(0,0,0,.12)}.lcd{background:#151515;color:#e9e9e2;border-radius:14px;padding:22px;font-family:DotGothic16,monospace;background-image:radial-gradient(#2a2a2a 1px,transparent 1px);background-size:6px 6px}
.lcd .big{font-size:56px;color:#ff3b30;line-height:1}.lcd .sm{font-size:15px;opacity:.75;margin-top:6px;letter-spacing:.05em}.keys{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:18px}.keys a{aspect-ratio:1.4;border-radius:12px;background:#f4f4f1;display:grid;place-items:center;font-family:'Space Mono',monospace;font-size:12px;box-shadow:0 3px 0 #b9b9b4}.keys a.on{background:#d7261e;color:#fff;box-shadow:0 3px 0 #8f1913}
.lcd .hand{margin-top:16px}.lcd .card{width:58px}
.game,.guides li,.share{background:#f7f7f4;border:1px solid #d5d5d0;border-radius:20px}.gi{font-family:'Space Mono',monospace;color:#d7261e;font-size:13px}.game h3{font-family:DotGothic16;font-weight:400;font-size:24px;text-transform:uppercase}.meta{font-family:'Space Mono',monospace;font-size:11px;font-weight:400}
.app{background:#f7f7f4;border:1px solid #d5d5d0;border-radius:28px}.side{border-right:1px dashed #c9c9c4}.side a.on{background:#111;color:#fff;border-radius:99px}.felt{background:#151515;background-image:radial-gradient(#262626 1px,transparent 1px);background-size:6px 6px}.act.on{background:#d7261e;color:#fff}
.coach{background:#fff;border:1px solid #d5d5d0}.coach strong{color:#d7261e}.g{background:#111}.b{background:#d7261e}
@media(max-width:700px){.hero{grid-template-columns:1fr}.hero h1{font-size:52px}.lcd .card{width:48px}}
''', lambda: f'''<section class="hero"><div><span class="k">[ PG-01 ] casino decision trainer</span><h1 style="margin-top:14px">Hit. Stand. Hold. Know why.</h1>
<p>Poker Gym is a free pocket trainer for blackjack, video poker, baccarat and Hold'em. One hand at a time, with the coach reading out the right move.</p><a class="btn">Power on</a></div>
<div class="device"><div class="lcd"><div class="sm">DEALER 10 · YOU 16</div><div class="big">HIT</div><div class="sm">STANDING LOSES MORE OFTEN</div><div class="hand">{card('10','♠')}{card('6','♥')}</div></div>
<div class="keys"><a class="on">HIT</a><a>STAND</a><a>DOUBLE</a><a>SPLIT</a></div></div></section>''',
 "Nothing, Teenage Engineering")
for key,(name,css,hero,insp) in D.items():
    open(f'{key}.html','w').write(page(key,name,css,hero()))
open('directions.txt','w').write('\n'.join(f'{k}\t{v[0]}\t{v[3]}' for k,v in D.items()))
