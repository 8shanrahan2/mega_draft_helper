#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
import math
from collections import Counter, defaultdict
from pathlib import Path

from huggingface_hub import hf_hub_download

DATASET = 'raymond9326/clash-royale-battles'
FILE = 'game_modes/clash_royale_battles_PickMode.csv'
CHAMPIONS = {
    'Goblinstein','Monk','Golden Knight','Mighty Miner',
    'Archer Queen','Skeleton King','Boss Bandit','Little Prince'
}
OUT = Path('analysis/output_2026')
OUT.mkdir(parents=True, exist_ok=True)


def wilson(k: int, n: int, z: float = 1.959963984540054):
    if not n: return (None, None)
    p = k/n
    den = 1 + z*z/n
    center = (p + z*z/(2*n))/den
    half = z*math.sqrt((p*(1-p)+z*z/(4*n))/n)/den
    return center-half, center+half


def pct(x): return 'n/a' if x is None else f'{100*x:.2f}%'

path = hf_hub_download(DATASET, FILE, repo_type='dataset')
print('Downloaded', path)

stats = Counter()
per_champion = defaultdict(Counter)
month = defaultdict(Counter)
champ_usage = Counter()
examples = []

with open(path, encoding='utf-8', newline='') as fh:
    reader = csv.DictReader(fh)
    print('FIELDS', reader.fieldnames)
    for r in reader:
        stats['rows'] += 1
        p_cards = [r.get(f'player_card_{i}', '') for i in range(1,9)]
        o_cards = [r.get(f'opponent_card_{i}', '') for i in range(1,9)]
        p_ch = [c for c in p_cards if c in CHAMPIONS]
        o_ch = [c for c in o_cards if c in CHAMPIONS]
        if len(p_ch) > 1 or len(o_ch) > 1: stats['multi_champ_anomaly'] += 1
        p_has, o_has = bool(p_ch), bool(o_ch)
        stats['deck_obs'] += 2
        stats['champ_deck_obs'] += int(p_has)+int(o_has)
        for c in p_ch + o_ch: champ_usage[c] += 1

        pc = int(r.get('player_crowns') or 0)
        oc = int(r.get('opponent_crowns') or 0)
        if pc == oc:
            stats['ties'] += 1
            continue
        stats['decisive'] += 1
        p_win = pc > oc
        # Cross-check winner_tag when present.
        wt = r.get('winner_tag') or ''
        if wt:
            inferred = r.get('player_tag') if p_win else r.get('opponent_tag')
            if wt != inferred: stats['winner_tag_mismatch'] += 1

        if p_has and o_has:
            stats['both'] += 1
        elif not p_has and not o_has:
            stats['neither'] += 1
        else:
            stats['exact_one'] += 1
            champ_is_player = p_has
            champ_win = p_win if champ_is_player else not p_win
            stats['exact_one_wins'] += int(champ_win)
            champ_list = p_ch if p_has else o_ch
            if len(champ_list)==1:
                c=champ_list[0]
                per_champion[c]['games'] += 1
                per_champion[c]['wins'] += int(champ_win)
            m=(r.get('battle_time') or '')[:6]
            month[m]['games'] += 1
            month[m]['wins'] += int(champ_win)
            if len(examples)<3:
                examples.append({'battle_time':r.get('battle_time'),'player_cards':p_cards,'opponent_cards':o_cards,'champion_side_won':champ_win})

n=stats['exact_one']; w=stats['exact_one_wins']; wr=w/n if n else None
lo,hi=wilson(w,n)
result={
    'source':DATASET,
    'file':FILE,
    'champions':sorted(CHAMPIONS),
    'stats':dict(stats),
    'primary':{'games':n,'champion_side_wins':w,'win_rate':wr,'wilson_95':[lo,hi]},
    'champion_usage':dict(champ_usage),
    'per_champion':{},
    'monthly':{},
    'examples':examples,
}
for c,s in per_champion.items():
    cn=s['games']; cw=s['wins']; clo,chi=wilson(cw,cn)
    result['per_champion'][c]={'games':cn,'wins':cw,'win_rate':cw/cn if cn else None,'wilson_95':[clo,chi]}
for m,s in sorted(month.items()):
    mn=s['games']; mw=s['wins']; mlo,mhi=wilson(mw,mn)
    result['monthly'][m]={'games':mn,'wins':mw,'win_rate':mw/mn if mn else None,'wilson_95':[mlo,mhi]}

(OUT/'champion_effect_2026_pickmode.json').write_text(json.dumps(result,indent=2,sort_keys=True),encoding='utf-8')

lines=[
'# 2026 PickMode: Champion vs no Champion','',
 f"Rows: **{stats['rows']:,}**; decisive: **{stats['decisive']:,}**",'',
'## Primary direct comparison','',
'Games where exactly one side drafted a Champion:',
 f"- Games: **{n:,}**",
 f"- Champion-side wins: **{w:,}**",
 f"- Champion-side win rate: **{pct(wr)}**",
 f"- Difference from 50%: **{(100*(wr-.5)):+.2f} percentage points**" if wr is not None else '- Difference: n/a',
 f"- 95% Wilson CI: **{pct(lo)}–{pct(hi)}**",'',
'## Champion prevalence','',
 f"- Champion deck observations: **{stats['champ_deck_obs']:,}/{stats['deck_obs']:,} ({pct(stats['champ_deck_obs']/stats['deck_obs'] if stats['deck_obs'] else None)})**",
 f"- Both sides had a Champion: **{stats['both']:,}** decisive games",
 f"- Exactly one: **{stats['exact_one']:,}**",
 f"- Neither: **{stats['neither']:,}**",'',
'## By Champion when facing no Champion','',
'| Champion | Games | Wins | Win rate | 95% CI |','|---|---:|---:|---:|---:|'
]
for c,s in sorted(result['per_champion'].items(), key=lambda x:x[1]['games'], reverse=True):
    lines.append(f"| {c} | {s['games']:,} | {s['wins']:,} | {pct(s['win_rate'])} | {pct(s['wilson_95'][0])}–{pct(s['wilson_95'][1])} |")
lines += ['', '## Diagnostics','',
 f"- Tied crown rows excluded: {stats['ties']:,}",
 f"- Multiple-Champion deck anomalies: {stats['multi_champ_anomaly']:,}",
 f"- winner_tag / crown-result mismatches: {stats['winner_tag_mismatch']:,}",'',
'## Caveat','',
'This is observational. Champion selection is not randomized: better drafters may take Champions more appropriately, and the available three-Champion pool varies by match. The direct exactly-one comparison is informative about association, not a causal treatment effect.'
]
(OUT/'champion_effect_2026_pickmode.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print('\n'.join(lines))
