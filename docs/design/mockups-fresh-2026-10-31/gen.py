import re
S={'s':'♠','h':'♥','d':'♦','c':'♣'}
def card(c,w=96,cls=''):
    if c=='back': return f'<div class="card back {cls}" style="--w:{w}px"></div>'
    r,s=c[:-1],c[-1]; red=' r' if s in'hd' else ''
    return f'<div class="card{red} {cls}" style="--w:{w}px"><div class="ix">{r}<small>{S[s]}&#xFE0E;</small></div><div class="pip">{S[s]}&#xFE0E;</div></div>'
def hand(cs,w=96,cls='hand',held=()):
    return f'<div class="{cls}">'+''.join(card(c,w,'held' if i in held else '') for i,c in enumerate(cs))+'</div>'
NAV=[('Home','index.html'),('Trainer','trainer.html'),('Guides','guides.html'),('Daily Drill','drill.html'),('About','#'),('Privacy','#')]
def page(fn,title,on,body):
    nav=''.join(f'<a href="{h}" class="{"on" if n==on else ""}">{n}</a>' for n,h in NAV)
    mn=''.join(f'<a href="{h}" class="{"on" if n==on else ""}"><b>{g}</b>{n}</a>' for (n,h),g in zip(NAV[:4],'⌂♠☰◆'))
    html=f'''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title} — Play Poker Gym</title><link rel="stylesheet" href="site.css"></head><body>
<header class="hdr"><div class="wrap"><a class="brand" href="index.html"><img src="mascot.webp" alt="">Poker Gym</a><nav class="nav">{nav}</nav>
<div class="drill"><span>Daily Drill resets at midnight</span><a class="btn sm" href="drill.html">Today's drill →</a></div></div></header>
<main>{body}</main>
<footer class="ftr"><div class="wrap"><div class="cols"><div><div class="brand" style="color:#fff"><img src="mascot.webp" alt="">Poker Gym</div><p style="margin-top:16px;max-width:26em">Free four-game casino trainer. No signup, no real money, no ads. Works offline.</p></div>
<div><h4>Train</h4><a href="trainer.html">Trainer</a><a href="drill.html">Daily Drill</a><a href="#">Mistake review</a></div>
<div><h4>Guides</h4><a href="blackjack.html">Blackjack</a><a href="#">Video poker</a><a href="#">Baccarat</a><a href="#">Hold’em</a></div>
<div><h4>Site</h4><a href="#">About</a><a href="#">Privacy</a><a href="#">Feedback</a><a href="#">GitHub</a></div></div>
<p class="fine">Free, education only. No real-money gambling. Built with AI assistance.</p></div></footer>
<nav class="mnav">{mn}</nav></body></html>'''
    open(fn,'w').write(html)

GAMES=[('Blackjack','When to hit, stand, double and split against every dealer card.',['As','Kh'],'blackjack.html',14),
('Video poker','Which cards to hold, from royal draws to low pairs. Jacks or Better, 9/6.',['Js','Jh','2c'],'#',5),
('Baccarat','Why banker has the edge and how the third card works.',['9d','Kc'],'#',5),
('Hold’em','Which five cards count when the board plays or a kicker matters.',['Ah','Kh'],'#',7)]
def gtiles():
    return '<div class="grid4">'+''.join(f'<a class="tile" href="{h}"><div style="height:120px;display:flex;align-items:center">{hand(c,64,"hand fan")}</div><div class="meta">{n} guides</div><h3>{t}</h3><p style="color:var(--ink-2);font-size:15px">{d}</p><span class="go">Open {t.lower()} →</span></a>' for t,d,c,h,n in GAMES)+'</div>'

# HOME
page('index.html','Free casino card trainer','Home',f'''
<section style="padding-top:72px"><div class="wrap grid2">
<div><p class="kicker">Free four-game card trainer</p><h1 style="margin:22px 0">Learn the <em>right</em> play. One hand at a time.</h1>
<p class="lede">Five hands of blackjack, video poker, baccarat or Hold’em. The coach explains every decision after you make it. No signup, no real money, no ads.</p>
<div style="display:flex;gap:12px;margin-top:32px;flex-wrap:wrap"><a class="btn" href="drill.html">Try today’s drill →</a><a class="btn ghost" href="guides.html">Read the guides</a></div></div>
<div class="felt hero-felt">
<p class="kicker">Example tip · Jacks or Better</p>
<div style="margin:40px 0 48px;display:flex;justify-content:center">{hand(['Js','Jh','2c','5d','9c'],76,held=(0,1))}</div>
<div class="coach"><img class="mascot" src="mascot.webp" alt=""><div><b>Keep the pair. Build the habit.</b><span style="color:var(--ink-2);font-size:15px">A pair of jacks already pays. Hold both jacks and draw three.</span></div></div>
</div></div></section>
<section class="rule"><div class="wrap"><div style="display:flex;justify-content:space-between;align-items:end;margin-bottom:40px;gap:24px;flex-wrap:wrap"><div><p class="kicker">The games</p><h2 style="margin-top:14px">Four games. One trainer.</h2></div><a class="btn ghost sm" href="guides.html">All 33 guides →</a></div>{gtiles()}</div></section>
<section style="padding-top:0"><div class="wrap"><div class="felt grid2" style="padding:64px">
<div><p class="kicker">The Daily Drill</p><h2 style="margin:16px 0">Same five hands for everyone. <em>Can you get 5/5?</em></h2><p class="muted" style="font-size:18px">New challenge every day. Finish, then share your green-and-red grid — no spoilers, just your score. Resets at midnight.</p><a class="btn brass" style="margin-top:28px" href="drill.html">Try today’s drill →</a></div>
<div style="display:flex;flex-direction:column;align-items:center;gap:24px">{hand(['8s','8d'],110)}<div class="grid-sq"><i></i><i></i><i class="x"></i><i></i><i></i></div><p class="muted" style="font:500 12px var(--mono)">EXAMPLE GRID · NOT REAL RESULTS</p></div></div></div></section>
<section class="rule"><div class="wrap grid3">
<div><p class="kicker">01 · Learn</p><h3 style="margin-top:14px">A short lesson</h3><p style="color:var(--ink-2);margin-top:8px">On the rule and the play that wins most often.</p></div>
<div><p class="kicker">02 · Play 5 hands</p><h3 style="margin-top:14px">Coached as you go</h3><p style="color:var(--ink-2);margin-top:8px">The coach explains every decision right after you make it.</p></div>
<div><p class="kicker">03 · Review</p><h3 style="margin-top:14px">Misses come back</h3><p style="color:var(--ink-2);margin-top:8px">Hands you missed return on a spaced schedule, so the fix sticks.</p></div></div></section>''')

# GUIDES INDEX
HUBS={'Blackjack':['Hit or stand? Three blackjack decisions','16 against a dealer 10: hit or stand?','11 against a dealer 10: double or hit?','8-8 against a dealer 10: split or hit?','12 against a dealer 2: hit or stand?','Soft 18 (A-7) against a 9: hit or stand?'],
'Video poker':['Three Jacks or Better practice hands','What does 9/6 mean in Jacks or Better?','Jacks or Better: pair of jacks or 4-card flush?','Video poker: two pair — hold both or chase trips?'],
'Baccarat':['Baccarat odds: three questions before you play','Baccarat: Banker, Player or Tie — lowest edge?','Baccarat: Player has 5 — does Player draw?'],
'Hold’em':['Which five cards count? Three Hold’em puzzles','Flush draw on the flop: odds you hit by the river?','Gutshot straight draw: odds you hit by the river?','AK against a pocket pair: who is ahead?']}
CNT={'Blackjack':14,'Video poker':5,'Baccarat':5,'Hold’em':7}
hubs=''.join(f'<div><div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid var(--ink);padding-bottom:12px"><h3>{k}</h3><span class="kicker">{CNT[k]} guides</span></div><div class="list">'+''.join(f'<a href="{"blackjack.html" if k=="Blackjack" else "#"}">{t}<span>Read →</span></a>' for t in v)+f'</div><a class="go" style="display:block;margin-top:16px;font-weight:600;color:var(--felt)" href="#">All {k.lower()} guides →</a></div>' for k,v in HUBS.items())
page('guides.html','Guides','Guides',f'''<section style="padding-top:72px"><div class="wrap"><p class="kicker">Guides · 33 pages</p><h1 style="margin:20px 0;max-width:12em">One question. One answer. <em>Then play it.</em></h1><p class="lede">Every guide answers a single decision in a minute, then drops you into the trainer on that exact hand.</p>
<div class="chips" style="margin-top:28px"><span class="chip">Blackjack · 14</span><span class="chip">Video poker · 5</span><span class="chip">Baccarat · 5</span><span class="chip">Hold’em · 7</span><span class="chip">Daily Drill · 2</span></div></div></section>
<section class="rule" style="padding-top:64px"><div class="wrap" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:56px 64px">{hubs}</div></section>''')

# BLACKJACK HUB
rows=[('16',['S','S','S','S','S','H','H','H','H','H']),('13–15',['S','S','S','S','S','H','H','H','H','H']),('12',['H','H','S','S','S','H','H','H','H','H']),('11',['D']*9+['H']),('10',['D']*8+['H','H']),('9',['H','D','D','D','D','H','H','H','H','H']),('8-8',['P']*10),('A-7',['S','D','D','D','D','S','S','H','H','H'])]
chart='<table class="chart"><tr><th>You</th>'+''.join(f'<th>{d}</th>' for d in ['2','3','4','5','6','7','8','9','10','A'])+'</tr>'+''.join(f'<tr><th>{r}</th>'+''.join(f'<td class="{x}">{x}</td>' for x in xs)+'</tr>' for r,xs in rows)+'</table>'
page('blackjack.html','Blackjack','Guides',f'''<section style="padding-top:56px"><div class="wrap"><p class="crumb">Guides / Blackjack</p><div class="grid2">
<div><p class="kicker">Blackjack · 14 guides</p><h1 style="margin:20px 0">Hit, stand, double, <em>split.</em></h1><p class="lede">When to hit, stand, double and split against every dealer card. Learn the rule, then play five coached hands.</p>
<div style="display:flex;gap:12px;margin-top:30px"><a class="btn" href="trainer.html">Train blackjack now →</a><a class="btn ghost" href="#strategy">Basic strategy</a></div></div>
<div class="felt" style="padding:40px;display:flex;flex-direction:column;gap:22px;align-items:center"><p class="kicker" style="align-self:flex-start">Dealer shows</p>{hand(['10c','back'],84)}<div style="width:60%;border-top:1px dashed rgba(255,255,255,.25)"></div>{hand(['Ts','6h'],84)}<p class="kicker" style="align-self:flex-end">You have 16</p></div></div></div></section>
<section class="rule"><div class="wrap grid2" style="align-items:start">
<div><p class="kicker">How to play</p><h2 style="margin:14px 0 22px">Beat the dealer without going over 21.</h2>
<div class="list"><a>Shoe<span>6 decks</span></a><a>Dealer<span>Stands on all 17</span></a><a>Blackjack pays<span>3:2</span></a><a>Double after split<span>Allowed</span></a><a>Resplit aces<span>No</span></a><a>Surrender<span>No</span></a></div>
<p style="color:var(--ink-2);margin-top:18px;font-size:15px">These are the trainer’s exact rules. Different tables can change a decision; each guide notes its assumptions.</p></div>
<div id="strategy"><p class="kicker">Basic strategy · excerpt</p><h2 style="margin:14px 0 22px">The chart, read one row at a time.</h2>{chart}
<p class="ph" style="margin-top:14px;color:var(--ink-2);font-size:14px;padding:6px">Chart cells drafted from standard 6-deck S17 DAS basic strategy; verify every cell against src/coach before shipping.</p></div></div></section>
<section class="rule"><div class="wrap"><p class="kicker">Decision guides</p><h2 style="margin:14px 0 30px">One hand per page.</h2><div class="grid3">
'''+''.join(f'<a class="tile" href="#"><div style="display:flex;gap:18px;align-items:center">{hand(p,52)}<span class="meta">vs</span>{hand([d],52)}</div><h3 style="font-size:21px">{t}</h3><p style="color:var(--ink-2);font-size:15px">{a}</p><span class="go">Read, then train →</span></a>' for p,d,t,a in [
(['Ts','6h'],'Td','16 against a dealer 10','Hit. Sixteen is the worst total in blackjack.'),
(['5c','6d'],'Ks','11 against a dealer 10','Double, if the table allows it. Otherwise hit.'),
(['8s','8h'],'Tc','8-8 against a dealer 10','Split. Eights are the one pair you split against every dealer card.'),
(['7d','5s'],'2h','12 against a dealer 2','Stand. Let the dealer take the risk.'),
(['Th','Kc'],'6s','10-10 against a 6','Stand. Never split tens, whatever the dealer shows.'),
(['Ah','7c'],'9d','Soft 18 (A-7) against a 9','Hit.')])+'</div></div></section>')

# TRAINER
page('trainer.html','Trainer','Trainer',f'''<section style="padding:32px 0 0"><div class="wrap"><p class="crumb">Trainer / Blackjack · Session hand 3 of 5</p>
<div style="display:grid;grid-template-columns:1fr 340px;gap:24px" class="tgrid">
<div class="felt" style="padding:40px 32px;min-height:600px;display:flex;flex-direction:column;align-items:center;justify-content:space-between">
<div style="width:100%;display:flex;justify-content:space-between"><span class="kicker">Dealer stands on all 17</span><span class="chip">6 decks · 3:2</span></div>
<div style="text-align:center">{hand(['9c','back'],108)}<p class="muted" style="margin-top:14px;font:500 13px var(--mono)">DEALER SHOWS 9</p></div>
<div style="text-align:center">{hand(['Ah','7s'],108)}<p style="margin-top:14px;font:500 13px var(--mono);color:#D9B672">YOU · SOFT 18</p></div>
<div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center"><a class="btn brass">Hit</a><a class="btn ghost" style="color:#fff;border-color:rgba(255,255,255,.3)">Stand</a><a class="btn ghost" style="color:#fff;border-color:rgba(255,255,255,.3)">Double</a></div></div>
<aside style="display:flex;flex-direction:column;gap:16px">
<div class="tile"><span class="meta">Session</span><div class="grid-sq"><i></i><i class="x"></i><i class="o" style="border-color:var(--line);background:var(--paper-2)"></i><i class="o" style="border-color:var(--line);background:var(--paper-2)"></i><i class="o" style="border-color:var(--line);background:var(--paper-2)"></i></div><p class="ph" style="font-size:14px;color:var(--ink-2);padding:4px">Streak and XP shown here (values not mocked)</p></div>
<div class="coach" style="flex-direction:column"><div style="display:flex;gap:12px;align-items:center"><img class="mascot" src="mascot.webp" alt=""><b>Coach</b></div><p style="font-size:15px;color:var(--ink-2)">The coach explains this decision right after you make it. Missed hands come back on a spaced schedule.</p></div>
<div class="tile"><span class="meta">Read first</span><a class="go" href="#">Soft 18 (A-7) against a 9: hit or stand? →</a><a class="go" href="blackjack.html">Blackjack basic strategy →</a></div>
</aside></div></div></section>
<style>@media(max-width:760px){{.tgrid{{grid-template-columns:1fr!important}} .tgrid .felt{{min-height:540px!important}} .tgrid .card{{--w:84px!important}}}}</style>''')

# DRILL
page('drill.html','Daily Drill','Daily Drill',f'''<section style="padding-top:64px"><div class="wrap" style="text-align:center"><p class="kicker">Daily Drill · <span style="color:var(--red)">#[number — placeholder]</span></p><h1 style="margin:20px auto;max-width:11em">Five hands. Everyone. <em>Can you get 5/5?</em></h1><p class="lede" style="margin:0 auto">Same five hands for everyone, across all four games. Finish, then share your green-and-red grid — no spoilers, just your score. Resets at local midnight.</p></div></section>
<section style="padding-top:0"><div class="wrap"><div class="felt" style="padding:56px 40px;display:grid;grid-template-columns:repeat(5,1fr);gap:20px" id="dr">
'''+''.join(f'<div style="display:flex;flex-direction:column;align-items:center;gap:16px"><span class="kicker">{i+1} · {g}</span><div style="height:120px;display:flex;align-items:center">{hand(c,64,"hand fan")}</div></div>' for i,(g,c) in enumerate([('Blackjack',['back','back']),('Video poker',['back','back','back']),('Baccarat',['back','back']),('Hold’em',['back','back']),('Blackjack',['back','back'])]))+f'''
<div style="grid-column:1/-1;text-align:center;margin-top:24px"><a class="btn brass">Deal hand 1 →</a><p class="muted" style="margin-top:14px;font-size:14px">Your first finish counts for your streak; any replay is practice only.</p></div></div></div></section>
<section class="rule"><div class="wrap grid3">
<div><p class="kicker">Streak</p><h3 style="margin-top:12px">🔥 Play daily, climb</h3><p style="color:var(--ink-2);margin-top:8px">Play five hands a day and your streak climbs. Miss a day and it resets.</p></div>
<div><p class="kicker">Share</p><h3 style="margin-top:12px">Grid, not spoilers</h3><div class="grid-sq" style="margin-top:12px"><i></i><i></i><i class="x"></i><i></i><i></i></div><p style="color:var(--ink-2);margin-top:8px;font-size:14px">Example grid, not real results.</p></div>
<div><p class="kicker">Practice more</p><h3 style="margin-top:12px">Drill pack 01</h3><p style="color:var(--ink-2);margin-top:8px">Five blackjack decisions. <a class="go" style="color:var(--felt);font-weight:600" href="#">Open →</a></p></div></div></section>
<style>@media(max-width:760px){{#dr{{grid-template-columns:1fr 1fr!important;padding:36px 20px!important}}}}</style>''')

# 404
page('404.html','Not found','',f'''<section style="padding:96px 0"><div class="wrap" style="text-align:center;display:flex;flex-direction:column;align-items:center;gap:28px">
<div class="hand">{card('4s',110)}{card('back',110)}{card('4h',110)}</div><p class="kicker">404 · Misdeal</p><h1 style="max-width:10em">This page folded.</h1><p class="lede">The link may be old. Every guide and game is one tap away.</p>
<div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center"><a class="btn" href="guides.html">Browse guides</a><a class="btn ghost" href="drill.html">Today’s drill</a></div></div></section>''')
