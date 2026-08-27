// Model v3: Champion/Hero slot handling.
//
// Evidence basis: a 2026 PickMode sample found the Champion side won 52.26%
// (1,089 / 2,084) when exactly one player drafted a Champion. We intentionally
// use only a small +0.8 model-point tiebreaker because the result is
// observational and each Champion's own Mega Draft CWR is already represented
// in META_CWR. There is no penalty for finishing a deck without a Champion.

const CHAMPIONS_V3 = new Set([
  'Goblinstein',
  'Monk',
  'Golden Knight',
  'Mighty Miner',
  'Archer Queen',
  'Skeleton King',
  'Boss Bandit',
  'Little Prince'
]);

const CHAMPION_SLOT_BONUS_V3 = 0.8;

SETS.champion = CHAMPIONS_V3;

function championInDeckV3(deck){
  return deck.find(card => has(card,'champion')) || null;
}

function championSlotOpenV3(deck){
  return !championInDeckV3(deck);
}

function championSlotValueV3(card,ownDeck){
  if(!has(card,'champion')) return 0;
  if(!championSlotOpenV3(ownDeck)) return -100;
  return CHAMPION_SLOT_BONUS_V3;
}

const cardTagsV2BaseV3 = cardTags;
cardTags = function(card){
  const tags = cardTagsV2BaseV3(card);
  if(has(card,'champion') && !tags.includes('champion')) tags.unshift('champion');
  return tags;
};

const structureProfileV2BaseV3 = structureProfileV2;
structureProfileV2 = function(deck){
  return {
    ...structureProfileV2BaseV3(deck),
    champion: deck.filter(c=>has(c,'champion')).length
  };
};

const scoreCardV2BaseV3 = scoreCard;
scoreCard = function(card,ownDeck,enemyDeck,remaining,pickIndex){
  const result = scoreCardV2BaseV3(card,ownDeck,enemyDeck,remaining,pickIndex);
  const champion = championSlotValueV3(card,ownDeck);
  result.components.champion = champion;
  result.invalid = champion <= -99;
  result.score = clamp(result.score + champion,1,99);
  return result;
};

const reasonsV2BaseV3 = reasons;
reasons = function(result){
  if(result.invalid) return 'Champion/Hero slot is already filled; Mega Draft allows at most one Champion per deck.';
  const base = reasonsV2BaseV3(result);
  if((result.components.champion || 0) > 0 && base.startsWith('Solid neutral pick')){
    return 'Fits an open Champion/Hero slot · small evidence-based tiebreaker, not a requirement.';
  }
  return base;
};

const componentChipsV2BaseV3 = componentChips;
componentChips = function(result){
  const base = componentChipsV2BaseV3(result);
  const champion = result.components.champion || 0;
  if(champion <= 0) return base;
  return `${base}<span class="chip good">Hero slot +${champion.toFixed(1)}</span>`;
};

rankFor = function(side){
  const own = side === 'you' ? state.you : state.opp;
  const enemy = side === 'you' ? state.opp : state.you;
  return state.remaining
    .filter(card => !has(card,'champion') || championSlotOpenV3(own))
    .map(card => scoreCard(card,own,enemy,state.remaining,state.turn))
    .sort((a,b)=>b.score-a.score);
};

const pickCardV2BaseV3 = pickCard;
pickCard = function(card){
  if(state.turn >= state.sequence.length || !state.remaining.includes(card)) return;
  const side = state.sequence[state.turn];
  if(has(card,'champion') && !championSlotOpenV3(state[side])){
    $('turnSubtitle').textContent = `${side==='you'?'Your':'Opponent'} Champion/Hero slot is already filled. Mega Draft allows at most one Champion per deck.`;
    return;
  }
  pickCardV2BaseV3(card);
};

renderDeck = function(side){
  const deck = state[side];
  $(side+'Count').textContent = deck.length;
  $(side+'Avg').textContent = `${avg(deck).toFixed(1)} elixir`;
  const target = $(side+'Deck');
  target.classList.toggle('empty-state',!deck.length);
  target.innerHTML = deck.length ? deck.map(c=>`<span class="deck-card">${c}</span>`).join('') : 'No cards drafted yet.';

  const champion = championInDeckV3(deck);
  const cov = coverage(deck);
  const slot = champion
    ? `<div class="hero-slot filled"><span>Champion / Hero slot</span><strong>${champion}</strong><small>Filled · max 1</small></div>`
    : `<div class="hero-slot open"><span>Champion / Hero slot</span><strong>Open</strong><small>Optional · only a mild tiebreaker</small></div>`;

  $(side+'Strategy').innerHTML = `${slot}<strong>${inferredStrategy(deck)}</strong><div class="coverage">${cov.map(([n,ok])=>`<span class="${ok?'covered':'missing'}">${ok?'✓':'!'} ${n}</span>`).join('')}</div>`;
};

renderPool = function(side,finished=false){
  const q = norm($('cardSearch').value || '');
  const own = side === 'you' ? state.you : state.opp;
  const slotOpen = championSlotOpenV3(own);
  const scoreMap = finished ? new Map() : new Map(rankFor(side).map(r=>[r.card,r]));
  const cards = state.remaining.filter(c=>!q || norm(c).includes(q));
  $('remainingCount').textContent = state.remaining.length;

  $('poolGrid').innerHTML = cards.map(c=>{
    const unavailable = !finished && has(c,'champion') && !slotOpen;
    const r = scoreMap.get(c);
    const tags = cardTags(c).slice(0,3).map(t=>t.replace(/([A-Z])/g,' $1').toLowerCase()).join(' · ') || 'neutral metadata';
    const score = r ? `<span class="mini-score">${Math.round(r.score)}</span>` : '';
    const suffix = unavailable ? ' · slot filled' : '';
    return `<button class="pool-card ${unavailable?'slot-unavailable':''}" data-card="${c.replace(/"/g,'&quot;')}" ${(finished || unavailable)?'disabled':''}>${score}<strong>${c}</strong><small>${cost(c)} elixir · ${tags}${suffix}</small></button>`;
  }).join('');

  if(!finished){
    document.querySelectorAll('.pool-card:not(:disabled)').forEach(btn=>btn.addEventListener('click',()=>pickCard(btn.dataset.card)));
  }
};
