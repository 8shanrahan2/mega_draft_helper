// Model v7: modest minimum four-card cycle valuation.
//
// A deck's average elixir and cheap-card count do not fully capture how awkward
// it is to rotate back to a key card. This layer adds a small, archetype-aware
// bonus when a candidate lowers the sum of the deck's four cheapest cards.
// The effect is intentionally modest for Beatdown and stronger for Siege/Cycle.

function minimumCycleCostV7(deck){
  if(deck.length < 4) return null;
  return deck
    .map(cost)
    .sort((a,b)=>a-b)
    .slice(0,4)
    .reduce((sum,value)=>sum+value,0);
}

const MIN_CYCLE_ARCHETYPE_WEIGHT_V7 = {
  'Cycle Pressure': 1.15,
  'Siege': 1.00,
  'Bait': .90,
  'Control': .75,
  'Graveyard Control': .75,
  'Split-Lane Pressure': .65,
  'Bridge Pressure': .60,
  'Counterpush': .55,
  'Beatdown': .45,
  'Air Beatdown': .40
};

function minimumCycleSensitivityV7(deck){
  const dist = archetypeDistributionV2(deck);
  return Object.entries(dist).reduce((sum,[name,p])=>{
    return sum + p*(MIN_CYCLE_ARCHETYPE_WEIGHT_V7[name] ?? .60);
  },0);
}

function minimumCycleValueV7(card,ownDeck){
  // Do not infer a rotation requirement from the first few cards. Once four
  // cards exist, progressively care more as the eight-card deck takes shape.
  const before = minimumCycleCostV7(ownDeck);
  if(before === null) return {value:0,before:null,after:null,reduction:0};

  const afterDeck = [...ownDeck,card];
  const after = minimumCycleCostV7(afterDeck);
  const reduction = Math.max(0,before-after);
  if(reduction <= 0) return {value:0,before,after,reduction:0};

  const stage = afterDeck.length/8;
  const lateConfidence = .35 + .65*clamp((stage-.50)/.50,0,1);
  const sensitivity = minimumCycleSensitivityV7(afterDeck);
  const value = Math.min(3.0,reduction*.70*sensitivity*lateConfidence);
  return {value,before,after,reduction};
}

const scoreCardV6BaseV7 = scoreCard;
scoreCard = function(card,ownDeck,enemyDeck,remaining,pickIndex){
  const result = scoreCardV6BaseV7(card,ownDeck,enemyDeck,remaining,pickIndex);
  const cycle = minimumCycleValueV7(card,ownDeck);
  result.components.minCycle = cycle.value;
  result.minCycleBefore = cycle.before;
  result.minCycleAfter = cycle.after;
  result.minCycleReduction = cycle.reduction;
  result.score = clamp(result.score + cycle.value,1,99);
  return result;
};

const reasonsV6BaseV7 = reasons;
reasons = function(result){
  const cycle = result.components.minCycle || 0;
  if(cycle >= 1.2 && result.minCycleReduction > 0){
    return `Lowers minimum four-card cycle ${result.minCycleBefore} → ${result.minCycleAfter} elixir · ${reasonsV6BaseV7(result)}`;
  }
  return reasonsV6BaseV7(result);
};

const componentChipsV6BaseV7 = componentChips;
componentChips = function(result){
  const base = componentChipsV6BaseV7(result);
  const cycle = result.components.minCycle || 0;
  if(cycle < .8 || !result.minCycleReduction) return base;
  return `${base}<span class="chip good" title="Minimum four-card cycle ${result.minCycleBefore} → ${result.minCycleAfter} elixir">Cycle −${result.minCycleReduction}e +${cycle.toFixed(1)}</span>`;
};
