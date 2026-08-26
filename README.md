# Mega Draft Helper

A lightweight, patch-aware decision-support app for Clash Royale Mega Draft.

The goal is not to produce a static tier list. Mega Draft is a sequential shared-pool game, so the value of a card changes after every pick. The app re-ranks the remaining pool based on two primary objectives:

1. Build a coherent deck that can repeatedly pressure the opponent.
2. Maximize favorable counter relationships: answer what the opponent has already drafted, avoid drafting into their answers, and deny counters to your own plan when that denial also improves your deck.

## MVP behavior

- Paste the randomized 36-card Mega Draft pool.
- Choose whether you pick first.
- The draft sequence follows the Mega Draft snake pattern with the final round alternating normally: `A B B A A B B A A B B A A B A B`.
- Click the card actually chosen on each turn.
- The app re-ranks all remaining cards after every pick.
- On your turns it recommends your strongest picks; on opponent turns it shows a danger board of what is most valuable from their perspective.
- Every recommendation exposes its component scores rather than returning an opaque ranking.

## Scoring model

A candidate card receives an adaptive score from these components:

- **Mega Draft baseline:** current clean win rate (CWR), falling back to neutral 50 when the local snapshot lacks a card.
- **Patch prior:** small temporary adjustments for balance changes that are newer than the 3-day stat window.
- **Pressure-plan fit:** synergy with the strategy already emerging in the deck (control, bridge pressure, beatdown, bait, siege, air pressure, Graveyard support, cycle).
- **Counter coverage:** how well the candidate answers threats the opponent has already drafted.
- **Counter denial:** value from removing a card that would otherwise answer your already-drafted threats.
- **Existing counter risk:** penalty when the opponent has already drafted clean answers to the candidate.
- **Scarcity:** urgency when the deck is missing a role and only a few suitable cards remain.
- **Flexibility:** early picks favor low-commitment multi-role cards.
- **Win-condition timing:** early narrow win conditions are penalized while many counters remain; late or under-countered win conditions receive a bonus.

This implements a principle repeated in the supplied Mega Draft guides: draft universally useful cards early, preserve optionality, and commit to a win condition once the opponent has exposed a weakness instead of giving them the whole draft to counter it.

## Current data assumptions

Snapshot date: **2026-08-26**.

- RoyaleAPI Mega Draft 3-day card data: https://royaleapi.com/cards/popular?time=3d&mode=grid&cat=MegaDraft&sort=cleanwinrate&group_mode=group
- Supercell August balance patch: https://supercell.com/en/games/clashroyale/blog/news/final-august-balance-changes-826/

The Aug 26 changes are newer than the 3-day sample. The app therefore uses modest temporary priors for Archer Queen, Little Prince, Electro Giant, Void, Goblinstein, Electro Spirit and several Aug 4 changes. These are intentionally small and should be replaced/decayed as post-patch Mega Draft data becomes representative.

## Run locally

No build system is required.

```bash
python -m http.server 8080
```

Then open http://localhost:8080.

## Deploy

The repository is a static site and can be imported directly into Vercel. No framework preset or build command is required.

## Next steps

- Automate RoyaleAPI snapshot refresh instead of maintaining the CWR map manually.
- Replace role heuristics with a versioned card knowledge graph containing explicit card-to-card matchup edges.
- Record draft decisions/outcomes to fit weights against actual Mega Draft wins rather than hand-tuning them.
- Add card art and faster pool entry (screen capture / OCR or a structured 36-card selector).
- Add expected opponent response: shallow minimax over the next two draft picks rather than scoring only the current state.
