// Model v2: Mega-Draft-native archetypes + deck-structure-aware scoring.
// Loaded after app.js so these functions intentionally refine the MVP evaluator.

Object.assign(SETS, {
  counterpush: new Set(['Cannon Cart','Giant Skeleton','Dark Prince','Phoenix','Lumberjack','P.E.K.K.A','Bowler','Prince','Rascals','Goblinstein','Skeleton King']),
  splitLane: new Set(['Royal Hogs','Royal Recruits','Three Musketeers','Wall Breakers','Miner','Bandit','Royal Ghost','Battle Ram','Ram Rider']),
  directTower: new Set(['Miner','Goblin Barrel','Graveyard','Goblin Drill','Skeleton Barrel','Wall Breakers']),
  cheap: new Set(['Skeletons','Goblins','Spear Goblins','Bats','Ice Spirit','Fire Spirit','Electro Spirit','Heal Spirit','Ice Golem','The Log','Giant Snowball','Barbarian Barrel','Zap','Bomber','Berserker'])
});

const ARCHETYPES_V2 = {
  'Beatdown': { roles:{beatdown:2.1,tank:1.1,ranged:.45,bigSpell:.8,counterpush:.35}, targetAvg:4.25, minCheap:1.0, maxHeavy:5.0 },
  'Air Beatdown': { roles:{air:1.7,airWin:2.6,beatdown:1.25,bigSpell:.65,antiAir:.25}, targetAvg:4.15, minCheap:1.0, maxHeavy:5.0 },
  'Control': { roles:{control:1.7,building:.7,spell:.65,counterpush:.75,antiTank:.45}, targetAvg:3.55, minCheap:1.7, maxHeavy:3.2 },
  'Cycle Pressure': { roles:{cycle:1.7,pressure:1.45,directTower:.75,cheap:1.1,smallSpell:.55}, targetAvg:3.0, minCheap:2.8, maxHeavy:1.7 },
  'Bridge Pressure': { roles:{bridge:1.8,pressure:1.2,counterpush:.8,splitLane:.45}, targetAvg:3.65, minCheap:1.5, maxHeavy:3.0 },
  'Bait': { roles:{bait:1.9,cycle:1.05,pressure:.9,smallSpell:.45,directTower:.7}, targetAvg:3.15, minCheap:2.5, maxHeavy:1.8 },
  'Siege': { roles:{siege:2.3,cycle:1.0,building:.65,smallSpell:.55}, targetAvg:3.25, minCheap:2.4, maxHeavy:2.0 },
  'Graveyard Control': { roles:{graveyardSupport:1.55,control:1.35,spell:.75,counterpush:.7}, cards:{'Graveyard':3.5,'Poison':1.1}, targetAvg:3.7, minCheap:1.5, maxHeavy:3.1 },
  'Split-Lane Pressure': { roles:{splitLane:1.9,pressure:1.1,bridge:.55,cycle:.45}, targetAvg:3.55, minCheap:1.8, maxHeavy:2.6 },
  'Counterpush': { roles:{counterpush:1.8,control:.85,antiTank:.55,ranged:.35}, targetAvg:3.8, minCheap:1.4, maxHeavy:3.5 }
};

// Signed card-specific relationships override generic role inference.
// This object is designed to be replaced/expanded with an empirical RoyaleAPI matrix later.
const MATCHUP_OVERRIDES_V2 = {
  'Inferno Dragon|Electro Giant': -1.2,
  'Electro Giant|Inferno Dragon': 1.25,
  'P.E.K.K.A|Electro Giant': 1.75,
  'Mini P.E.K.K.A|Electro Giant': 1.45,
  'Bomb Tower|Electro Giant': 1.0,
  'Mother Witch|Graveyard': 1.55,
  'Poison|Graveyard': 1.35
};

function archetypeRawScoresV2(deck){
  const scores = {};
  for(const [name,spec] of Object.entries(ARCHETYPES_V2)){
    let score = .35;
    for(const [role,w] of Object.entries(spec.roles || {})) score += deck.filter(c=>has(c,role)).length*w;
    for(const [card,w] of Object.entries(spec.cards || {})) if(deck.includes(card)) score += w;
    scores[name] = score;
  }
  return scores;
}

function archetypeDistributionV2(deck){
  if(!deck.length){
    const names = Object.keys(ARCHETYPES_V2);
    return Object.fromEntries(names.map(n=>[n,1/names.length]));
  }
  const raw = archetypeRawScoresV2(deck);
  const max = Math.max(...Object.values(raw));
  const exps = Object.fromEntries(Object.entries(raw).map(([k,v])=>[k,Math.exp((v-max)/1.6)]));
  const total = Object.values(exps).reduce((a,b)=>a+b,0) || 1;
  return Object.fromEntries(Object.entries(exps).map(([k,v])=>[k,v/total]));
}

function topArchetypesV2(deck,n=3){
  return Object.entries(archetypeDistributionV2(deck)).sort((a,b)=>b[1]-a[1]).slice(0,n);
}

function structureProfileV2(deck){
  return {
    avg: avg(deck),
    cheap: deck.filter(c=>cost(c)<=2).length,
    mid: deck.filter(c=>cost(c)>=3 && cost(c)<=4).length,
    heavy: deck.filter(c=>cost(c)>=5).length,
    smallSpell: deck.filter(c=>has(c,'smallSpell')).length,
    bigSpell: deck.filter(c=>has(c,'bigSpell')).length,
    ranged: deck.filter(c=>has(c,'ranged')).length,
    antiAir: deck.filter(c=>has(c,'antiAir')).length,
    antiTank: deck.filter(c=>has(c,'antiTank')).length,
    splash: deck.filter(c=>has(c,'splash')).length,
    winCon: deck.filter(c=>has(c,'winCondition')).length
  };
}

function blendedStructureTargetsV2(deck){
  const dist = archetypeDistributionV2(deck);
  let targetAvg=0,minCheap=0,maxHeavy=0;
  for(const [name,p] of Object.entries(dist)){
    const spec = ARCHETYPES_V2[name];
    targetAvg += p*spec.targetAvg;
    minCheap += p*spec.minCheap;
    maxHeavy += p*spec.maxHeavy;
  }
  return {targetAvg,minCheap,maxHeavy};
}

inferredStrategy = function(deck){
  if(!deck.length) return 'Open draft — preserve flexibility and information.';
  const winCons = deck.filter(c=>has(c,'winCondition'));
  const labels = topArchetypesV2(deck,2).map(([name,p])=>`${name} ${Math.round(p*100)}%`).join(' · ');
  return `${labels}${winCons.length ? ` · ${winCons.join(' / ')}` : ' · win condition still open'}`;
};

coverage = function(deck){
  const p = structureProfileV2(deck);
  const t = blendedStructureTargetsV2(deck);
  const cheapTarget = Math.max(1,Math.round(t.minCheap));
  return [
    ['Win con', p.winCon>0],
    ['Anti-air', p.antiAir>0],
    ['Anti-tank', p.antiTank>0],
    ['Splash', p.splash>0],
    ['Small spell', p.smallSpell>0],
    [`Cheap cycle ${p.cheap}/${cheapTarget}`, p.cheap>=cheapTarget],
    ['Curve', !deck.length || p.avg<=t.targetAvg+.55]
  ];
};

function matchupOverrideV2(card,enemyCard){
  const key = `${card}|${enemyCard}`;
  return Object.prototype.hasOwnProperty.call(MATCHUP_OVERRIDES_V2,key) ? MATCHUP_OVERRIDES_V2[key] : null;
}

counterPower = function(card,enemyCard){
  const override = matchupOverrideV2(card,enemyCard);
  if(override!==null) return override;
  let v=0;
  if(has(enemyCard,'tank') && has(card,'antiTank')) v+=1.1;
  if(has(enemyCard,'air') && has(card,'antiAir')) v+=1.0;
  if(has(enemyCard,'airWin') && has(card,'antiAir')) v+=1.0;
  if(has(enemyCard,'swarm') && (has(card,'splash') || has(card,'smallSpell'))) v+=1.05;
  if(has(enemyCard,'bait') && (has(card,'smallSpell') || has(card,'splash'))) v+=.8;
  if(has(enemyCard,'inferno') && has(card,'reset')) v+=1.0;
  if(has(enemyCard,'winCondition') && has(card,'building')) v+=.65;
  if(has(enemyCard,'ranged') && has(card,'bigSpell')) v+=.7;
  if(enemyCard==='Graveyard' && (card==='Poison' || has(card,'splash') || has(card,'swarm'))) v+=1.1;
  if(enemyCard==='Royal Hogs' && (card==='Bomb Tower' || card==='Fireball' || card==='Bowler' || has(card,'splash'))) v+=.9;
  if(enemyCard==='Balloon' && (has(card,'antiAir') || has(card,'building'))) v+=.9;
  return v;
};

riskAgainst = function(card,enemyDeck){
  return enemyDeck.reduce((sum,e)=>sum+Math.max(0,counterPower(e,card)),0);
};

function archetypeFitV2(card,deck){
  if(!deck.length) return 0;
  const dist = archetypeDistributionV2(deck);
  let fit=0;
  for(const [name,p] of Object.entries(dist)){
    const spec=ARCHETYPES_V2[name];
    let local=0;
    for(const [role,w] of Object.entries(spec.roles || {})) if(has(card,role)) local+=w;
    local += spec.cards?.[card] || 0;
    fit += p*local;
  }
  return fit;
}

synergy = function(card,deck){
  if(!deck.length) return 0;
  let s=archetypeFitV2(card,deck);
  if(deck.includes('Graveyard') && has(card,'graveyardSupport')) s+=1.0;
  if(card==='Graveyard' && deck.some(c=>has(c,'graveyardSupport'))) s+=.9;
  if(deck.some(c=>['Golem','Giant','Goblin Giant','Electro Giant','Rune Giant'].includes(c)) && (has(card,'ranged') || has(card,'beatdown'))) s+=.45;
  if(deck.some(c=>['Battle Ram','Ram Rider','Wall Breakers'].includes(c)) && has(card,'bridge')) s+=.55;
  return s;
};

remainingCounterCount = function(card,remaining){
  return remaining.filter(c=>c!==card && counterPower(c,card)>=.9).length;
};

roleScarcity = function(card,ownDeck,remaining){
  const wanted=[];
  if(!ownDeck.some(c=>has(c,'antiAir'))) wanted.push('antiAir');
  if(!ownDeck.some(c=>has(c,'antiTank'))) wanted.push('antiTank');
  if(!ownDeck.some(c=>has(c,'smallSpell')) && ownDeck.length>=3) wanted.push('smallSpell');
  if(!ownDeck.some(c=>has(c,'spell'))) wanted.push('spell');
  if(ownDeck.length>=4 && !ownDeck.some(c=>has(c,'winCondition'))) wanted.push('winCondition');
  let score=0;
  for(const role of wanted){
    if(!has(card,role)) continue;
    const left=remaining.filter(c=>has(c,role)).length;
    if(left<=2) score+=2.3;
    else if(left<=4) score+=1.35;
    else score+=.5;
  }
  return score;
};

function structureValueV2(card,ownDeck,enemyDeck,remaining){
  const before=structureProfileV2(ownDeck);
  const afterDeck=[...ownDeck,card];
  const after=structureProfileV2(afterDeck);
  const targets=blendedStructureTargetsV2(afterDeck);
  const stage=afterDeck.length/8;
  let v=0;

  const over=after.avg-targets.targetAvg;
  if(over>.15) v-=over*(2.2+stage*5.8);
  else if(before.avg>targets.targetAvg+.35 && cost(card)<=3) v+=Math.min(3.8,(before.avg-targets.targetAvg)*2.4);

  const expectedCheapNow=targets.minCheap*stage;
  if(cost(card)<=2 && before.cheap<expectedCheapNow+.35) v+=2.0+stage*2.4;
  if(afterDeck.length>=6 && after.cheap<Math.max(1,Math.floor(targets.minCheap)) && cost(card)>2) v-=4.0;

  const enemySwarm=enemyDeck.filter(c=>has(c,'swarm') || has(c,'bait')).length;
  const poolSwarm=remaining.filter(c=>has(c,'swarm') || has(c,'bait')).length;
  if(!before.smallSpell && has(card,'smallSpell')) v+=2.2+Math.min(2.4,enemySwarm*.8)+(ownDeck.length>=4?1.4:0);
  if(afterDeck.length>=6 && after.smallSpell===0 && !has(card,'smallSpell')) v-=4.5+Math.min(1.5,poolSwarm*.08);

  if(has(card,'ranged') && before.ranged>=2){
    v-=(before.ranged-1)*1.45;
    if(cost(card)>=4) v-=1.0;
  }
  if(has(card,'antiAir') && before.antiAir>=3 && !has(card,'smallSpell') && !has(card,'antiTank')) v-=1.4;
  if(cost(card)>=5 && after.heavy>targets.maxHeavy*stage+1.0) v-=(after.heavy-(targets.maxHeavy*stage+1.0))*2.4;
  if(has(card,'bigSpell') && before.bigSpell>=1 && before.smallSpell===0) v-=2.2;

  return v;
}

scoreCard = function(card,ownDeck,enemyDeck,remaining,pickIndex){
  const cwr=META_CWR[card] ?? 50;
  const meta=(cwr-50)*1.25+(PATCH_PRIOR[card] ?? 0);
  const fit=synergy(card,ownDeck)*2.65;
  const counters=enemyDeck.reduce((n,e)=>n+Math.max(0,counterPower(card,e)),0)*3.0;
  const committedWinCons=ownDeck.filter(c=>has(c,'winCondition'));
  const denialRaw=committedWinCons.length
    ? committedWinCons.reduce((n,m)=>n+Math.max(0,counterPower(card,m)),0)
    : ownDeck.reduce((n,m)=>n+Math.max(0,counterPower(card,m)),0)*.35;
  const denial=denialRaw*(committedWinCons.length?4.6:1.4);
  const risk=riskAgainst(card,enemyDeck)*-2.2;
  const scarce=roleScarcity(card,ownDeck,remaining)*2.8;
  const flex=flexibility(card)*(pickIndex<8?2.3:1.0);
  const structure=structureValueV2(card,ownDeck,enemyDeck,remaining);
  const remainingCounters=remainingCounterCount(card,remaining);
  let timing=0;
  const hasWin=ownDeck.some(c=>has(c,'winCondition'));
  if(has(card,'winCondition')){
    if(pickIndex<7 && !hasWin) timing-=Math.min(6.5,.8+remainingCounters*.3);
    if(pickIndex>=8 && !hasWin) timing+=5.5;
    if(remainingCounters<=2) timing+=4.5;
    if(enemyDeck.length>=4 && riskAgainst(card,enemyDeck)<1.2) timing+=2.8;
    if(hasWin && !['Miner','Wall Breakers','Skeleton Barrel','Battle Ram','Ram Rider'].includes(card)) timing-=2.2;
  }
  if(ownDeck.length>=6){
    if(!ownDeck.some(c=>has(c,'antiAir')) && !has(card,'antiAir')) timing-=6;
    if(!ownDeck.some(c=>has(c,'spell')) && !has(card,'spell')) timing-=4.5;
  }
  const raw=50+meta+fit+counters+denial+risk+scarce+flex+structure+timing;
  return {card,score:clamp(raw,1,99),components:{meta,fit,counters,denial,risk,scarce,flex,structure,timing},cwr,remainingCounters};
};

reasons = function(result){
  const c=result.components;
  const positives=[
    ['Strong current Mega Draft baseline',c.meta],
    ['Fits the most likely deck archetypes',c.fit],
    ['Improves curve / spell / cycle structure',c.structure],
    ['Directly answers revealed enemy cards',c.counters],
    ['Denies counters to your committed win condition',c.denial],
    ['Fills a scarce remaining role',c.scarce],
    ['Preserves early-draft flexibility',c.flex],
    ['Timing is favorable now',c.timing]
  ].filter(x=>x[1]>2).sort((a,b)=>b[1]-a[1]);
  const negatives=[
    ['Hurts deck curve or duplicates an existing role',c.structure],
    ['Opponent already has clean counters',c.risk],
    ['Too committal for this draft stage',c.timing]
  ].filter(x=>x[1]<-2).sort((a,b)=>a[1]-b[1]);
  if(positives.length) return positives.slice(0,2).map(x=>x[0]).join(' · ');
  if(negatives.length) return negatives[0][0];
  return 'Solid neutral pick with no major structural or matchup liability.';
};

componentChips = function(r){
  const map=[
    ['Meta',r.components.meta],['Fit',r.components.fit],['Structure',r.components.structure],['Counters',r.components.counters],['Deny',r.components.denial],['Scarcity',r.components.scarce],['Flex',r.components.flex],['Risk',r.components.risk],['Timing',r.components.timing]
  ];
  return map.filter(([,v])=>Math.abs(v)>=1.4).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).slice(0,4)
    .map(([k,v])=>`<span class="chip ${v>0?'good':'bad'}">${k} ${v>0?'+':''}${v.toFixed(1)}</span>`).join('');
};

function matchupSummaryV2(deck,enemy){
  const profile=structureProfileV2(deck);
  const targets=blendedStructureTargetsV2(deck);
  const matchupFor=enemy.map(e=>({
    card:e,
    pressure:deck.reduce((n,c)=>n+Math.max(0,counterPower(c,e)),0),
    threat:deck.reduce((n,c)=>n+Math.max(0,counterPower(e,c)),0)
  }));
  const hardest=matchupFor.sort((a,b)=>(b.threat-b.pressure)-(a.threat-a.pressure)).slice(0,2);
  const structuralFlags=[];
  if(profile.smallSpell===0) structuralFlags.push('no small spell');
  if(profile.cheap<Math.max(1,Math.round(targets.minCheap))) structuralFlags.push('light on cheap cycle');
  if(profile.avg>targets.targetAvg+.55) structuralFlags.push('curve is heavy for the inferred strategy');
  if(profile.ranged>=3) structuralFlags.push('multiple ranged units overlap roles');
  return {profile,targets,top:topArchetypesV2(deck,2),hardest,structuralFlags};
}

function renderMatchupSummaryV2(){
  $('recommendationTitle').textContent='Final matchup report';
  $('recommendationEyebrow').textContent='Draft complete';
  const you=matchupSummaryV2(state.you,state.opp);
  const opp=matchupSummaryV2(state.opp,state.you);
  const topText=you.top.map(([n,p])=>`${n} ${Math.round(p*100)}%`).join(' / ');
  const curveDelta=you.profile.avg-you.targets.targetAvg;
  const curveText=`${you.profile.avg.toFixed(1)} avg · ${you.profile.cheap} cheap · ${you.profile.heavy} heavy`;
  const curveReason=curveDelta>.55 ? `Heavier than the inferred ${you.targets.targetAvg.toFixed(1)} target.` : 'Curve is within the soft target for the inferred strategy.';
  const flags=you.structuralFlags.length ? you.structuralFlags.join(' · ') : 'No major structural warnings.';
  const threats=you.hardest.length ? you.hardest.map(x=>x.card).join(' / ') : 'No obvious role-based mismatch.';
  const oppTop=opp.top.map(([n,p])=>`${n} ${Math.round(p*100)}%`).join(' / ');

  $('recommendationList').innerHTML=`
    <article class="recommendation-card">
      <div class="rec-rank">YOUR ARCHETYPE MIX</div>
      <div class="rec-name-row"><span class="rec-name">${topText}</span></div>
      <div class="reason">Mega-Draft-native inference from strategic primitives; it does not depend on ladder evolution/hero lists.</div>
    </article>
    <article class="recommendation-card">
      <div class="rec-rank">DECK STRUCTURE</div>
      <div class="rec-name-row"><span class="rec-name">${curveText}</span></div>
      <div class="reason">${curveReason} ${flags}</div>
    </article>
    <article class="recommendation-card">
      <div class="rec-rank">MATCHUP WATCH</div>
      <div class="rec-name-row"><span class="rec-name">${threats}</span></div>
      <div class="reason">Opponent cards with the largest current role/matchup edge. Card-specific overrides take priority over generic role tags.</div>
    </article>
    <article class="recommendation-card">
      <div class="rec-rank">OPPONENT PLAN</div>
      <div class="rec-name-row"><span class="rec-name">${oppTop}</span></div>
      <div class="reason">Their most likely Mega-Draft-native strategic mix, inferred from the final eight cards.</div>
    </article>`;
}

renderPool = function(side,finished=false){
  const q=norm($('cardSearch').value || '');
  const scoreMap=finished ? new Map() : new Map(rankFor(side).map(r=>[r.card,r]));
  const cards=state.remaining.filter(c=>!q || norm(c).includes(q));
  $('remainingCount').textContent=state.remaining.length;
  $('poolGrid').innerHTML=cards.map(c=>{
    const r=scoreMap.get(c);
    const tags=cardTags(c).slice(0,3).map(t=>t.replace(/([A-Z])/g,' $1').toLowerCase()).join(' · ') || 'neutral metadata';
    const score=r ? `<span class="mini-score">${Math.round(r.score)}</span>` : '';
    return `<button class="pool-card" data-card="${c.replace(/"/g,'&quot;')}" ${finished?'disabled':''}>${score}<strong>${c}</strong><small>${cost(c)} elixir · ${tags}</small></button>`;
  }).join('');
  if(!finished) document.querySelectorAll('.pool-card').forEach(btn=>btn.addEventListener('click',()=>pickCard(btn.dataset.card)));
};

render = function(){
  renderDeck('you'); renderDeck('opp');
  const finished=state.turn>=state.sequence.length;
  const side=finished ? 'you' : state.sequence[state.turn];
  $('turnCounter').textContent=finished ? 'Draft complete' : `Pick ${state.turn+1} / 16`;
  $('turnTitle').textContent=finished ? 'Draft complete' : side==='you' ? 'Your pick' : 'Opponent pick';
  $('turnSubtitle').textContent=finished ? 'Review archetype fit, deck structure, and the final matchup.' : side==='you'
    ? 'Recommendations include archetype-aware curve, cheap-cycle, spell-package, redundancy, counter, denial, and scarcity value.'
    : 'Use this board to anticipate the cards most valuable from the opponent’s perspective.';
  if(finished) renderMatchupSummaryV2(); else renderRecommendations(side);
  renderPool(side,finished);
};
