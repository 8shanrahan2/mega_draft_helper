#!/usr/bin/env python3
"""Analyze whether drafting a Champion was associated with winning in April 2023 Mega Draft PoL.

Data source:
  https://www.kaggle.com/datasets/s1m0n38/clash-royale-games

Season 46 (2023-04-03 through 2023-04-30) used Mega Draft for all Path of
Legends leagues. The historical Path-of-Legends Mega Draft mode is 72000333
(PickMode_Tournament in RoyaleAPI's game_modes data).

The primary comparison is games where exactly one player drafted a Champion.
That directly asks: when a Champion deck faced a no-Champion deck, how often
was the Champion side the winner?
"""

from __future__ import annotations

import csv
import json
import math
import os
import shutil
from collections import Counter, defaultdict
from datetime import date, timedelta
from pathlib import Path

import kagglehub

DATASET = "s1m0n38/clash-royale-games"
SEASON_DIR = "20230403-20230501"
MEGA_DRAFT_POL_MODE = 72000333

CHAMPIONS = {
    26000065: "Mighty Miner",
    26000069: "Skeleton King",
    26000072: "Archer Queen",
    26000074: "Golden Knight",
    26000077: "Monk",
}

OUT_DIR = Path("analysis/output")
OUT_DIR.mkdir(parents=True, exist_ok=True)


def wilson(k: int, n: int, z: float = 1.959963984540054) -> tuple[float, float]:
    if n == 0:
        return (float("nan"), float("nan"))
    p = k / n
    den = 1 + z * z / n
    center = (p + z * z / (2 * n)) / den
    half = z * math.sqrt((p * (1 - p) + z * z / (4 * n)) / n) / den
    return center - half, center + half


def pct(x: float) -> str:
    return f"{100*x:.2f}%"


def deck_champions(cards: list[int]) -> list[int]:
    return [c for c in cards if c in CHAMPIONS]


def parse_int(s: str) -> int:
    try:
        return int(s)
    except (TypeError, ValueError):
        return -1


stats = {
    "rows_seen": 0,
    "mega_draft_games": 0,
    "decisive_games": 0,
    "draws_or_ties": 0,
    "bad_rows": 0,
    "champion_deck_observations": 0,
    "deck_observations": 0,
    "both_champion_games": 0,
    "neither_champion_games": 0,
    "exactly_one_champion_games": 0,
    "exactly_one_champion_wins": 0,
    "p1_wins": 0,
    "p2_wins": 0,
    "multi_champion_deck_anomalies": 0,
}

mode_counts = Counter()
champion_usage = Counter()
champion_exact_one = defaultdict(lambda: {"games": 0, "wins": 0})
daily = defaultdict(lambda: {"games": 0, "exact_one": 0, "champ_wins": 0})

# Skill-matched subsets. In Path of Legends, the dataset's `trophies` field is
# the player's pre-game medal/rating value according to the dataset card.
thresholds = [25, 50, 100, 200, 500]
skill_matched = {t: {"games": 0, "wins": 0} for t in thresholds}

# Also break exact-one games by whether the Champion player entered with a
# higher/lower/equal medal value. This makes selection-by-skill visible.
champ_skill_position = {
    "higher": {"games": 0, "wins": 0},
    "equal": {"games": 0, "wins": 0},
    "lower": {"games": 0, "wins": 0},
}


def process_file(path: str, day: str) -> None:
    with open(path, "r", encoding="utf-8", newline="") as fh:
        reader = csv.reader(fh)
        for row in reader:
            stats["rows_seen"] += 1
            if len(row) < 24:
                stats["bad_rows"] += 1
                continue

            mode = parse_int(row[1])
            mode_counts[mode] += 1
            if mode != MEGA_DRAFT_POL_MODE:
                continue

            stats["mega_draft_games"] += 1
            daily[day]["games"] += 1

            p1_medals = parse_int(row[3])
            p1_crowns = parse_int(row[4])
            p1_cards = [parse_int(x) for x in row[5:13]]
            p2_medals = parse_int(row[14])
            p2_crowns = parse_int(row[15])
            p2_cards = [parse_int(x) for x in row[16:24]]

            p1_champs = deck_champions(p1_cards)
            p2_champs = deck_champions(p2_cards)
            if len(p1_champs) > 1 or len(p2_champs) > 1:
                stats["multi_champion_deck_anomalies"] += 1

            p1_has = bool(p1_champs)
            p2_has = bool(p2_champs)
            stats["deck_observations"] += 2
            stats["champion_deck_observations"] += int(p1_has) + int(p2_has)
            for cid in p1_champs:
                champion_usage[CHAMPIONS[cid]] += 1
            for cid in p2_champs:
                champion_usage[CHAMPIONS[cid]] += 1

            if p1_crowns == p2_crowns:
                stats["draws_or_ties"] += 1
                continue
            stats["decisive_games"] += 1
            p1_win = p1_crowns > p2_crowns
            stats["p1_wins" if p1_win else "p2_wins"] += 1

            if p1_has and p2_has:
                stats["both_champion_games"] += 1
                continue
            if not p1_has and not p2_has:
                stats["neither_champion_games"] += 1
                continue

            stats["exactly_one_champion_games"] += 1
            daily[day]["exact_one"] += 1
            champ_is_p1 = p1_has
            champ_win = p1_win if champ_is_p1 else not p1_win
            stats["exactly_one_champion_wins"] += int(champ_win)
            daily[day]["champ_wins"] += int(champ_win)

            champ_cards = p1_champs if p1_has else p2_champs
            # In normal Mega Draft this should be exactly one. If an anomalous
            # row contains more, attribute only when unambiguous.
            if len(champ_cards) == 1:
                name = CHAMPIONS[champ_cards[0]]
                champion_exact_one[name]["games"] += 1
                champion_exact_one[name]["wins"] += int(champ_win)

            if p1_medals >= 0 and p2_medals >= 0:
                diff = abs(p1_medals - p2_medals)
                for t in thresholds:
                    if diff <= t:
                        skill_matched[t]["games"] += 1
                        skill_matched[t]["wins"] += int(champ_win)

                champ_medals = p1_medals if p1_has else p2_medals
                non_medals = p2_medals if p1_has else p1_medals
                pos = "higher" if champ_medals > non_medals else "lower" if champ_medals < non_medals else "equal"
                champ_skill_position[pos]["games"] += 1
                champ_skill_position[pos]["wins"] += int(champ_win)


def iter_days():
    d = date(2023, 4, 3)
    end = date(2023, 5, 1)
    while d < end:
        yield d
        d += timedelta(days=1)


for d in iter_days():
    day = d.strftime("%Y%m%d")
    remote_path = f"{SEASON_DIR}/{day}.csv"
    print(f"Downloading {remote_path} ...", flush=True)
    local_path = kagglehub.dataset_download(DATASET, path=remote_path)
    print(f"Processing {local_path} ({os.path.getsize(local_path):,} bytes) ...", flush=True)
    process_file(local_path, day)
    # kagglehub caches files. Remove the individual daily file after processing
    # to keep the GitHub runner comfortably below disk limits.
    try:
        os.remove(local_path)
    except OSError:
        pass

exact_n = stats["exactly_one_champion_games"]
exact_w = stats["exactly_one_champion_wins"]
exact_wr = exact_w / exact_n if exact_n else float("nan")
ci_lo, ci_hi = wilson(exact_w, exact_n)

result = {
    "source": DATASET,
    "season": "46 / 2023-04-03 to 2023-05-01",
    "mode_id": MEGA_DRAFT_POL_MODE,
    "champion_ids": CHAMPIONS,
    "stats": stats,
    "primary": {
        "comparison": "Exactly one player has a Champion",
        "games": exact_n,
        "champion_side_wins": exact_w,
        "champion_side_win_rate": exact_wr,
        "win_rate_minus_50pp": exact_wr - 0.5 if exact_n else float("nan"),
        "wilson_95": [ci_lo, ci_hi],
    },
    "skill_matched": {},
    "champion_exact_one": {},
    "champion_usage": dict(champion_usage),
    "champion_skill_position": champ_skill_position,
    "daily": dict(daily),
    "mode_counts_top20": mode_counts.most_common(20),
}

for t, s in skill_matched.items():
    n, w = s["games"], s["wins"]
    lo, hi = wilson(w, n)
    result["skill_matched"][str(t)] = {
        **s,
        "win_rate": w / n if n else None,
        "wilson_95": [lo, hi] if n else None,
    }

for name, s in champion_exact_one.items():
    n, w = s["games"], s["wins"]
    lo, hi = wilson(w, n)
    result["champion_exact_one"][name] = {
        **s,
        "win_rate": w / n if n else None,
        "wilson_95": [lo, hi] if n else None,
    }

json_path = OUT_DIR / "champion_effect_2023.json"
json_path.write_text(json.dumps(result, indent=2, sort_keys=True), encoding="utf-8")

lines = []
lines.append("# April 2023 Mega Draft: Champion effect")
lines.append("")
lines.append(f"Mode ID: `{MEGA_DRAFT_POL_MODE}` (Path of Legends Mega Draft)")
lines.append(f"Mega Draft games: **{stats['mega_draft_games']:,}**; decisive: **{stats['decisive_games']:,}**")
lines.append("")
lines.append("## Primary comparison")
lines.append("")
lines.append("Games where exactly one player drafted a Champion compare a Champion deck directly against a no-Champion deck.")
lines.append("")
lines.append(f"- Games: **{exact_n:,}**")
lines.append(f"- Champion-side wins: **{exact_w:,}**")
lines.append(f"- Champion-side win rate: **{pct(exact_wr)}**")
lines.append(f"- Difference from 50%: **{100*(exact_wr-.5):+.2f} percentage points**")
lines.append(f"- 95% Wilson CI: **{pct(ci_lo)} to {pct(ci_hi)}**")
lines.append("")
lines.append("## How often did players draft a Champion?")
lines.append("")
usage_rate = stats["champion_deck_observations"] / stats["deck_observations"] if stats["deck_observations"] else float("nan")
lines.append(f"- Champion deck observations: **{stats['champion_deck_observations']:,} / {stats['deck_observations']:,} ({pct(usage_rate)})**")
lines.append(f"- Both players had one: **{stats['both_champion_games']:,}** decisive games")
lines.append(f"- Exactly one player had one: **{stats['exactly_one_champion_games']:,}** decisive games")
lines.append(f"- Neither player had one: **{stats['neither_champion_games']:,}** decisive games")
lines.append("")
lines.append("## Similar-skill subsets")
lines.append("")
lines.append("| Pre-game medal difference | Games | Champion-side win rate | 95% CI |")
lines.append("|---:|---:|---:|---:|")
for t in thresholds:
    s = result["skill_matched"][str(t)]
    if s["games"]:
        lines.append(f"| ≤ {t} | {s['games']:,} | {pct(s['win_rate'])} | {pct(s['wilson_95'][0])}–{pct(s['wilson_95'][1])} |")
lines.append("")
lines.append("## By Champion, when opponent had no Champion")
lines.append("")
lines.append("| Champion | Games | Wins | Win rate | 95% CI |")
lines.append("|---|---:|---:|---:|---:|")
for name, s in sorted(result["champion_exact_one"].items(), key=lambda kv: kv[1]["games"], reverse=True):
    lines.append(f"| {name} | {s['games']:,} | {s['wins']:,} | {pct(s['win_rate'])} | {pct(s['wilson_95'][0])}–{pct(s['wilson_95'][1])} |")
lines.append("")
lines.append("## Interpretation caveat")
lines.append("")
lines.append("This is observational draft data, not randomized treatment assignment. A positive Champion-side edge can reflect the Champion itself, stronger players selecting Champions more effectively, or correlated draft quality. The similar-medal subsets reduce—but do not eliminate—that selection effect.")
lines.append("")
lines.append("## Diagnostics")
lines.append("")
lines.append(f"- Player 1 win rate in decisive Mega Draft rows: {pct(stats['p1_wins']/stats['decisive_games']) if stats['decisive_games'] else 'n/a'}")
lines.append(f"- Multi-Champion deck anomalies: {stats['multi_champion_deck_anomalies']:,}")
lines.append("- Top mode counts are preserved in the JSON output for verification.")

md_path = OUT_DIR / "champion_effect_2023.md"
md_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

print("\n" + "\n".join(lines), flush=True)
print(f"\nWrote {json_path} and {md_path}", flush=True)
