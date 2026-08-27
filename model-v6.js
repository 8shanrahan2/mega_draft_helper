// Model v6: threat-conditioned spell interaction classes.
//
// v2 treated every "swarm" target and every small/splash spell too similarly.
// This layer separates cheap utility from true removal and only rewards a spell
// package strongly when the revealed opponent actually presents vulnerable bodies.

// Rage is cheap utility/cycle, not a defensive small-spell slot by itself.
SETS.smallSpell.delete('Rage');
SETS.cheapSpell = new Set([
  'The Log','Arrows','Barbarian Barrel','Giant Snowball','Zap','Rage',
  'Royal Delivery','Goblin Curse'
]);
SETS.swarmClear = new Set([
  'The Log','Arrows','Barbarian Barrel','Royal Delivery','Fireball','Poison'
]);
SETS.lightClear = new Set(['Zap','Giant Snowball']);
SETS.utilitySpell = new Set(['Rage']);
SETS.conditionalClear = new Set(['Goblin Curse']);

const FRAGILE_SWARM_V6 = new Set([
  'Skeletons','Goblins','Spear Goblins','Bats','Goblin Gang','Skeleton Army'
]);
const MEDIUM_SWARM_V6 = new Set([
  'Guards','Minions','Minion Horde','Barbarians','Royal Recruits'
]);
const MULTI_UNIT_V6 = new Set([
  'Rascals','Skeleton Dragons','Three Musketeers','Zappies','Archers'
]);
const SPAWNER_PRESSURE_V6 = new Set([
  'Witch','Night Witch','Tombstone','Goblin Hut','Furnace','Barbarian Hut'
]);

function targetBodyClassV6(card){
  if(FRAGILE_SWARM_V6.has(card)) return 'fragile';
  if(MEDIUM_SWARM_V6.has(card)) return 'medium';
  if(MULTI_UNIT_V6.has(card)) return 'multi';
  if(SPAWNER_PRESSURE_V6.has(card)) return 'spawner';
  return null;
}

function targetVulnerabilityV6(card){
  switch(targetBodyClassV6(card)){
    case 'fragile': return 1.0;
    case 'medium': return .70;
    case 'spawner': return .55;
    case 'multi': return .15;
    default: return 0;
  }
}

function clearQualityV6(card){
  if(SETS.swarmClear.has(card)) return 1.0;
  if(SETS.conditionalClear.has(card)) return .65;
  if(SETS.lightClear.has(card)) return .45;
  if(SETS.utilitySpell.has(card)) return .12;
  return 0;
}

function spellTargetPowerV6(card,enemyCard){
  if(!has(card,'spell')) return null;
  const cls = targetBodyClassV6(enemyCard);
  if(!cls) return 0;

  if(card === 'Goblin Curse'){
    return {fragile:1.10,medium:.75,spawner:.85,multi:.15}[cls] || 0;
  }
  if(SETS.utilitySpell.has(card)){
    return {fragile:.22,medium:.05,spawner:.08,multi:0}[cls] || 0;
  }
  if(SETS.lightClear.has(card)){
    return {fragile:.78,medium:.25,spawner:.22,multi:.08}[cls] || 0;
  }
  if(SETS.swarmClear.has(card)){
    return {fragile:1.10,medium:.85,spawner:.55,multi:.35}[cls] || 0;
  }
  return 0;
}

// Replace only the broad spell-vs-swarm/bait portion of the old heuristic.
// Non-spell splash troops (e.g. Bowler) keep their existing role-based value.
const counterPowerV5BaseV6 = counterPower;
counterPower = function(card,enemyCard){
  let value = counterPowerV5BaseV6(card,enemyCard);
  if(!has(card,'spell')) return value;

  // Remove v2's generic "swarm/bait + splash/smallSpell" credit.
  if(has(enemyCard,'swarm') && (has(card,'splash') || has(card,'smallSpell'))) value -= 1.05;
  if(has(enemyCard,'bait') && (has(card,'smallSpell') || has(card,'splash'))) value -= .80;

  value += spellTargetPowerV6(card,enemyCard) || 0;
  return Math.max(0,value);
};

function revealedSwarmPressureV6(deck){
  return deck.reduce((sum,card)=>sum+targetVulnerabilityV6(card),0);
}

// Rebuild structure scoring with two changes:
// 1) early curve correction is damped because one expensive first pick should not
//    force an immediate cheap-spell response;
// 2) removal-package value is conditioned on revealed vulnerable bodies instead
//    of treating a small spell as a universal deck-completeness requirement.
structureValueV2 = function(card,ownDeck,enemyDeck,remaining){
  const before=structureProfileV2(ownDeck);
  const afterDeck=[...ownDeck,card];
  const after=structureProfileV2(afterDeck);
  const targets=blendedStructureTargetsV2(afterDeck);
  const stage=afterDeck.length/8;
  let v=0;

  const over=after.avg-targets.targetAvg;
  if(over>.15) v-=over*(2.2+stage*5.8);
  else if(before.avg>targets.targetAvg+.35 && cost(card)<=3){
    const curveConfidence=.35+.65*stage;
    v+=Math.min(3.8,(before.avg-targets.targetAvg)*2.4)*curveConfidence;
  }

  const expectedCheapNow=targets.minCheap*stage;
  if(cost(card)<=2 && before.cheap<expectedCheapNow+.35) v+=2.0+stage*2.4;
  if(afterDeck.length>=6 && after.cheap<Math.max(1,Math.floor(targets.minCheap)) && cost(card)>2) v-=4.0;

  const enemyPressure=revealedSwarmPressureV6(enemyDeck);
  const beforeClear=ownDeck.reduce((best,c)=>Math.max(best,clearQualityV6(c)),0);
  const candidateClear=clearQualityV6(card);
  if(beforeClear<.60 && candidateClear>0){
    const need=.45+Math.min(1.8,enemyPressure*.75)+(ownDeck.length>=5?.35:0);
    v+=candidateClear*need;
  }
  if(afterDeck.length>=6 && beforeClear<.60 && candidateClear<.60 && enemyPressure>=1.25){
    v-=Math.min(2.2,.5+(enemyPressure-1.25)*.8);
  }

  if(has(card,'ranged') && before.ranged>=2){
    v-=(before.ranged-1)*1.45;
    if(cost(card)>=4) v-=1.0;
  }
  if(has(card,'antiAir') && before.antiAir>=3 && !has(card,'smallSpell') && !has(card,'antiTank')) v-=1.4;
  if(cost(card)>=5 && after.heavy>targets.maxHeavy*stage+1.0) v-=(after.heavy-(targets.maxHeavy*stage+1.0))*2.4;
  if(has(card,'bigSpell') && before.bigSpell>=1 && beforeClear<.60) v-=1.2;

  return v;
};

// Make the diagnostics match the refined model. "Swarm clear" is informational,
// not a mandatory slot: missing it is only penalized when revealed threats justify it.
coverage = function(deck){
  const p = structureProfileV2(deck);
  const t = blendedStructureTargetsV2(deck);
  const cheapTarget = Math.max(1,Math.round(t.minCheap));
  const clear = deck.reduce((best,c)=>Math.max(best,clearQualityV6(c)),0);
  return [
    ['Win con', p.winCon>0],
    ['Anti-air', p.antiAir>0],
    ['Anti-tank', p.antiTank>0],
    ['Splash', p.splash>0],
    ['Swarm clear', clear>=.60],
    [`Cheap cycle ${p.cheap}/${cheapTarget}`, p.cheap>=cheapTarget],
    ['Curve', !deck.length || p.avg<=t.targetAvg+.55]
  ];
};
