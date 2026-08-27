#!/usr/bin/env python3
from huggingface_hub import list_repo_files

DATASET='raymond9326/clash-royale-battles'
files=list_repo_files(DATASET, repo_type='dataset')
print('FILES', len(files))
for f in files:
    if f.startswith('game_modes/'):
        print(f)
