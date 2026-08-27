#!/usr/bin/env python3
from collections import Counter
from datasets import load_dataset

DATASET='raymond9326/clash-royale-battles'
mode=Counter(); btype=Counter(); rows=0
for row in load_dataset(DATASET, split='train', streaming=True):
    rows += 1
    mode[row.get('game_mode')] += 1
    btype[row.get('battle_type')] += 1
print('ROWS', rows)
print('GAME_MODES')
for k,v in mode.most_common(): print(repr(k), v)
print('BATTLE_TYPES')
for k,v in btype.most_common(): print(repr(k), v)
print('DRAFT_MODES', [(k,v) for k,v in mode.items() if k and ('draft' in k.lower() or 'pick' in k.lower())])
