// Model v8: explicit player order + multifunction cycle value + smooth win-condition timing.
//
// Three focused refinements:
// 1) Player 1 / Player 2 is explicit in the setup and draft header.
// 2) A cheap card that lowers rotation can receive a small extra bonus when it also
//    adds useful functionality (for example Fire Spirit = cycle + cheap AoE).
// 3) Win-condition timing is gradual: later reveals leave fewer opposing picks to
//    counter-draft, and become more attractive when the opponent has already locked
//    in a deck with weak answers to that win condition.

SETS.cheapAoe = new Set(['Fire Spirit','Electro Spirit','Bomber']);

function playerLabelV8(){
  return state.pickFirst ? 'Player 1' : 'Player 2';
}

function syncPlayerPositionV8(){
  const selected = document.querySelector('input[name="playerPosition"]:checked');
  if(!selected) return;
  $('pickFirst').checked = selected.value === '1';
}

function updatePlayerIdentityV8(){
  const badge = $('playerIdentity');
  if(!badge) return;
  badge.textContent = `You: ${playerLabelV8()}`;
  badge.title = state.pickFirst
    ? 'Player 1 picks first in the Mega Draft sequence.'
    : 'Player 2 picks second in the Mega Draft sequence.';
}

document.querySelectorAll('input[name="playerPosition"]').forEach(input=>{
  input.addEventListener('change',syncPlayerPositionV8);
});
syncPlayerPositionV8();

function cheapAoeCoverageV8(deck){
  return deck.some(card => SETS.cheapAoe.has(card));
}

function cheapFunctionalCycleValueV8(card,ownDeck,enemyDeck){
  // Minimum-cycle value is already scored in v7. This is only the incremental
  // value of a cheap rotation card doing another useful job at the same time.
  if(cost(card) > 2) return {value:0,roles:[]};
  const cycle = minimumCycleValueV7(card,ownDeck);
  if(cycle.reduction <= 0) return {value:0,roles:[]};

  let value=0;
  const roles=[];
  const stage=clamp((ownDeck.length+1)/8,0,1);

  if(SETS.cheapAoe.has(card)){
    const alreadyCheapAoe=cheapAoeCoverageV8(ownDeck);
    const vulnerable=revealedSwarmPressureV6(enemyDeck);
    const aoe=.35 + (alreadyCheapAoe?0:.28) + Math.min(.30,vulnerable*.15);
    value+=aoe;
    roles.push('cheap AoE');
  }

  if(has(card,'antiAir') && !ownDeck.some(c=>has(c,'antiAir'))){
    value+=.35;
    roles.push('anti-air');
  }

  if(has(card,'reset') && !ownDeck.some(c=>has(c,'reset'))){
    value+=.28;
    roles.push('reset');
  }

  // Keep this secondary to card strength, matchup value, and the actual v7 cycle
  // reduction. It should distinguish Fire Spirit from pure cycle, not force it.
  value*=.55+.45*stage;
  return {value:Math.min(1.25,value),roles};
}

function smoothWinConditionTimingV8(card,ownDeck,enemyDeck,remaining){
  const ownPickNumber=ownDeck.length+1; // 1..8 for this player's deck
  const progress=clamp((ownPickNumber-1)/7,0,1);
  const hasWin=ownDeck.some(c=>has(c,'winCondition'));
  const candidateIsWin=has(card,'winCondition');
  const futureOpponentPicks=Math.max(0,8-enemyDeck.length);
  const opponentLocked=clamp(enemyDeck.length/8,0,1);
  let timing=0;

  if(candidateIsWin && !hasWin){
    // Early reveal is information given to the opponent; this penalty fades and
    // turns into a late-reveal benefit smoothly rather than flipping at pick 8.
    const revealCurve=-4.0 + 6.5*Math.pow(progress,1.25);
    const lateCompletion=2.2*Math.pow(progress,3);

    // Remaining counters only matter to the extent the opponent still has picks
    // available to take them after this reveal.
    const remainingCounters=remainingCounterCount(card,remaining);
    const counterplayWindow=futureOpponentPicks/8;
    const counterplayPenalty=Math.min(3.2,remainingCounters*.28*counterplayWindow);

    // If much of the opposing deck is already locked and it has weak answers,
    // revealing now is especially attractive. Existing risk scoring still handles
    // actual counters separately; this is only the information/timing advantage.
    const revealedRisk=riskAgainst(card,enemyDeck);
    const weakAnswerMargin=clamp(1.3-revealedRisk,0,1.3);
    const lockedWeaknessBonus=weakAnswerMargin*2.0*opponentLocked;

    timing+=revealCurve+lateCompletion-counterplayPenalty+lockedWeaknessBonus;
  } else if(candidateIsWin && hasWin){
    const flexibleSecondary=['Miner','Wall Breakers','Skeleton Barrel','Battle Ram','Ram Rider','Royal Hogs'];
    timing+=flexibleSecondary.includes(card)?-.9:-2.2;
  } else if(!hasWin){
    // Waiting is allowed and often desirable, but by the final own pick the deck
    // still needs an actual win condition. This pressure also rises smoothly.
    timing-=4.0*Math.pow(progress,4);
  }

  // Preserve late deck-completion guardrails from the previous evaluator.
  if(ownDeck.length>=6){
    if(!ownDeck.some(c=>has(c,'antiAir')) && !has(card,'antiAir')) timing-=6;
    if(!ownDeck.some(c=>has(c,'spell')) && !has(card,'spell')) timing-=4.5;
  }

  return {timing,ownPickNumber,futureOpponentPicks,progress};
}

const scoreCardV7BaseV8=scoreCard;
scoreCard=function(card,ownDeck,enemyDeck,remaining,pickIndex){
  const result=scoreCardV7BaseV8(card,ownDeck,enemyDeck,remaining,pickIndex);

  const oldTiming=result.components.timing || 0;
  const timingDetail=smoothWinConditionTimingV8(card,ownDeck,enemyDeck,remaining);
  result.components.timing=timingDetail.timing;
  result.winTimingV8=timingDetail;

  const utility=cheapFunctionalCycleValueV8(card,ownDeck,enemyDeck);
  result.components.cycleUtility=utility.value;
  result.cycleUtilityRolesV8=utility.roles;

  result.score=clamp(result.score-oldTiming+timingDetail.timing+utility.value,1,99);
  return result;
};

const reasonsV7BaseV8=reasons;
reasons=function(result){
  if(has(result.card,'winCondition') && result.winTimingV8 && result.components.timing>=2.2){
    const left=result.winTimingV8.futureOpponentPicks;
    return `Late win-condition reveal leaves ${left} opponent pick${left===1?'':'s'} to respond · ${reasonsV7BaseV8(result)}`;
  }
  if((result.components.cycleUtility||0)>=.55 && result.cycleUtilityRolesV8?.length){
    return `Lowers cycle while adding ${result.cycleUtilityRolesV8.join(' + ')} utility · ${reasonsV7BaseV8(result)}`;
  }
  return reasonsV7BaseV8(result);
};

const componentChipsV7BaseV8=componentChips;
componentChips=function(result){
  const base=componentChipsV7BaseV8(result);
  const utility=result.components.cycleUtility||0;
  if(utility<.55) return base;
  const label=result.cycleUtilityRolesV8?.join(' + ') || 'utility';
  return `${base}<span class="chip good" title="Cheap card also adds ${label}">Cycle utility +${utility.toFixed(1)}</span>`;
};

const renderV7BaseV8=render;
render=function(){
  renderV7BaseV8();
  updatePlayerIdentityV8();
};
