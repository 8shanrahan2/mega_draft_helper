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
- Once both decks reach 8/8, recommendations stop and the app switches to a final matchup report.

## Scoring model

A candidate card receives an adaptive score from these components:

- **Mega Draft baseline:** current clean win rate (CWR), falling back to neutral 50 when the local snapshot lacks a card.
- **Patch prior:** small temporary adjustments for balance changes that are newer than the 3-day stat window.
- **Mega-Draft-native archetype fit:** probabilistic fit across Beatdown, Air Beatdown, Control, Cycle Pressure, Bridge Pressure, Bait, Siege, Graveyard Control, Split-Lane Pressure, and Counterpush. These are built from strategic primitives instead of exact ladder lists that depend on evolutions or hero cycling.
- **Deck structure:** soft archetype-aware targets for average elixir, cheap-cycle count, heavy-card saturation, small-spell coverage, and repeated-role redundancy.
- **Counter coverage:** how well the candidate answers threats the opponent has already drafted.
- **Counter denial:** once a win condition is committed, the model sharply increases the value of removing its strongest remaining answers from the shared pool.
- **Existing counter risk:** penalty when the opponent has already drafted clean answers to the candidate.
- **Scarcity:** urgency when the deck is missing a role and only a few suitable cards remain.
- **Flexibility:** early picks favor low-commitment multi-role cards.
- **Win-condition timing:** early narrow win conditions are penalized while many counters remain; late or under-countered win conditions receive a bonus.

The structure layer intentionally does **not** use a universal rule like “lower average elixir is always better.” A beatdown shell can tolerate a much heavier curve than cycle pressure or bait. The inferred archetype distribution determines the soft curve and cheap-card targets.

## Matchup model

Generic role tags still provide fallback matchup information, but card-specific relationships can override them. This prevents errors such as classifying Inferno Dragon as an Electro Giant counter merely because Inferno Dragon has an `antiTank` tag.

`model-v2.js` currently includes a small explicit override table and is designed so a future RoyaleAPI-derived empirical card-vs-card matrix can replace or expand that table.

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
- Replace the small explicit matchup override map with a versioned empirical card-to-card matchup matrix.
- Record draft decisions/outcomes to fit structure and archetype weights against actual Mega Draft wins rather than hand-tuning them.
- Add card art and faster pool entry (screen capture / OCR or a structured 36-card selector).
- Add expected opponent response: shallow minimax over the next two draft picks rather than scoring only the current state.
- Explore clustering successful Mega Draft decks to learn native archetypes directly from results instead of maintaining hand-authored templates.
