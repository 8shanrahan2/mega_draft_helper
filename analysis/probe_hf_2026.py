#!/usr/bin/env python3
import csv
from collections import Counter
from huggingface_hub import hf_hub_download

DATASET='raymond9326/clash-royale-battles'
FILE='game_modes/clash_royale_battles_PickMode.csv'
path=hf_hub_download(DATASET, FILE, repo_type='dataset')
seen=set(); dup=0; first=None; last=None; months=Counter(); battle_types=Counter()
with open(path, encoding='utf-8', newline='') as fh:
    for r in csv.DictReader(fh):
        bid=r['battle_id']; t=r['battle_time']
        if bid in seen: dup += 1
        seen.add(bid)
        first=t if first is None or t<first else first
        last=t if last is None or t>last else last
        months[t[:6]] += 1
        battle_types[r['battle_type']] += 1
print('UNIQUE_IDS',len(seen),'DUP_ROWS',dup)
print('DATE_RANGE',first,last)
print('MONTHS',sorted(months.items()))
print('BATTLE_TYPES',battle_types.most_common())
