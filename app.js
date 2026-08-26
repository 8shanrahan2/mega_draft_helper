const SAMPLE_POOL = [
  'Rascals','Electro Giant','Giant Skeleton','Golem',
  'Skeleton Dragons','Phoenix','Inferno Dragon','Musketeer',
  'Skeletons','Guards','Goblins','Goblin Gang',
  'Poison','Lightning','The Log','Arrows',
  'Three Musketeers','Skeleton Barrel','Goblin Barrel','Balloon','Graveyard','Royal Hogs',
  'Tornado','Freeze',
  'Cannon Cart','Dark Prince','Fisherman',
  'Lumberjack','P.E.K.K.A','Bomb Tower',
  'Monk','Archer Queen','Little Prince',
  'Furnace','Mortar','Goblin Hut'
];

// 3-day Mega Draft clean win rates observed on RoyaleAPI on Aug 26, 2026.
// Missing cards intentionally fall back to 50 rather than inventing precision.
const META_CWR = {
  'Cannon Cart':64,'Spirit Empress':62,'Rascals':61,'Three Musketeers':61,'The Log':58,
  'Goblinstein':59,'Poison':58,'Monk':58,'Lightning':57,'Skeleton Dragons':59,
  'Dark Prince':57,'Phoenix':58,'Skeletons':55,'Guards':54,'Furnace':56,'Giant Skeleton':56,
  'Zappies':55,'Golden Knight':53,'Mighty Miner':55,'Goblin Demolisher':55,'Fireball':53,
  'Arrows':53,'Barbarian Barrel':53,'Bowler':54,'Lumberjack':54,'Electro Giant':56,
  'Goblin Hut':53,'Goblin Barrel':51,'Bomb Tower':51,'Minions':51,'Goblins':52,
  'Inferno Dragon':52,'Berserker':51,'Royal Recruits':53,'Minion Horde':55,'Goblin Cage':50,
  'Skeleton Barrel':51,'Suspicious Bush':52,'Sparky':53,'Goblin Curse':53,'Vines':50,
  'Goblin Gang':50,'Musketeer':51,'Firecracker':50,'Electro Wizard':51,'Electro Dragon':52,
  'Baby Dragon':50,'Mother Witch':51,'Spear Goblins':48,'Dart Goblin':48,'Archers':49,
  'Magic Archer':48,'Bats':48,'Witch':45,'Hunter':46,'Flying Machine':45,'Mega Minion':46,
  'Princess':45,'Ice Wizard':45,'Wizard':44,'Executioner':43,'Night Witch':44,'Royal Giant':49,
  'Rune Giant':51,'Golem':49,'Goblin Drill':46,'Ice Golem':46,'Goblin Giant':47,'Mega Knight':45,
  'Knight':44,'Valkyrie':43,'Giant':46,'Miner':43,'Goblin Machine':44,'Lava Hound':47,'Elixir Golem':38
};

// Short-lived priors for changes too new to be fully represented by a 3-day window.
// These are intentionally modest points on the model's strength scale, not claims about future win rate.
const PATCH_PRIOR = {
  'Archer Queen': 1.2,
  'Little Prince': 3.0,
  'Electro Giant': 2.5,
  'Void': 2.2,
  'Goblinstein': -1.4,
  'Electro Spirit': -2.2,
  'Fire Spirit': -1.2,
  'Ice Spirit': -1.2,
  'Heal Spirit': -1.2,
  'Bowler': -0.7,
  'Executioner': -0.7,
  'Goblin Drill': -1.8,
  'Wall Breakers': -2.6,
  'Magic Archer': -0.8,
  'Royal Delivery': -1.3,
  'Zappies': -0.4,
  'Goblin Curse': 1.2,
  'Rune Giant': 1.0,
  'Goblins': 0.5,
  'Barbarians': 0.4,
  'Mortar': 0.7
};

const COST = {
  'Skeletons':1,'Ice Spirit':1,'Fire Spirit':1,'Electro Spirit':1,'Heal Spirit':1,
  'Goblins':2,'Spear Goblins':2,'Bats':2,'Wall Breakers':2,'Bomber':2,'Berserker':2,'The Log':2,'Giant Snowball':2,'Rage':2,
  'Knight':3,'Archers':3,'Minions':3,'Goblin Gang':3,'Guards':3,'Skeleton Barrel':3,'Goblin Barrel':3,'Miner':3,'Princess':3,'Dart Goblin':3,'Bandit':3,'Royal Ghost':3,'Fisherman':3,'Little Prince':3,'Cannon':3,'Tombstone':3,'Earthquake':3,'Arrows':3,'Goblin Curse':3,'Vines':3,'Void':5,
  'Valkyrie':4,'Musketeer':4,'Dark Prince':4,'Baby Dragon':4,'Electro Wizard':4,'Magic Archer':4,'Flying Machine':4,'Hunter':4,'Inferno Dragon':4,'Phoenix':4,'Skeleton Dragons':4,'Mother Witch':4,'Lumberjack':4,'Battle Ram':4,'Hog Rider':4,'Goblin Drill':4,'Suspicious Bush':4,'Goblin Cage':4,'Bomb Tower':4,'Tesla':4,'Mortar':4,'Poison':4,'Fireball':4,'Freeze':4,'Royal Delivery':3,'Goblin Demolisher':4,'Golden Knight':4,'Mighty Miner':4,
  'Bowler':5,'Executioner':5,'Wizard':5,'Witch':5,'Prince':5,'Cannon Cart':5,'Ram Rider':5,'Royal Hogs':5,'Balloon':5,'Graveyard':5,'Goblinstein':5,'Archer Queen':5,'Monk':5,'Skeleton King':4,'Boss Bandit':6,'Inferno Tower':5,'Goblin Hut':5,'Furnace':4,'Barbarian Barrel':2,
  'Giant':5,'Royal Giant':6,'Electro Giant':7,'Giant Skeleton':6,'Royal Recruits':7,'Mega Knight':7,'P.E.K.K.A':7,'Golem':8,'Lava Hound':7,'Goblin Giant':6,'Elixir Golem':3,'Rune Giant':4,'Three Musketeers':9,'Sparky':6,'Elite Barbarians':6,'Barbarians':5,'Minion Horde':5,'Night Witch':4,'Battle Healer':4,'Goblin Machine':5,'Ice Golem':2,'Rascals':5,'X-Bow':6,'Rocket':6,'Lightning':6,'Tornado':3
};

const SETS = Object.fromEntries(Object.entries({
  winCondition: ['Three Musketeers','Skeleton Barrel','Goblin Barrel','Battle Ram','Suspicious Bush','Balloon','Graveyard','Ram Rider','Royal Hogs','Goblin Drill','Royal Giant','Giant','Miner','Hog Rider','Wall Breakers','Goblin Giant','Elixir Golem','Electro Giant','Lava Hound','Golem','Mortar','X-Bow','Rune Giant'],
  tank: ['Rascals','Giant Skeleton','Electro Giant','Royal Recruits','Bowler','Royal Giant','Rune Giant','Golem','Goblin Giant','Mega Knight','Giant','P.E.K.K.A','Lava Hound','Elixir Golem','Goblin Machine'],
  antiAir: ['Skeleton Dragons','Zappies','Phoenix','Inferno Dragon','Minions','Minion Horde','Musketeer','Electro Wizard','Electro Dragon','Firecracker','Baby Dragon','Mother Witch','Spear Goblins','Dart Goblin','Archers','Magic Archer','Bats','Witch','Hunter','Flying Machine','Mega Minion','Princess','Ice Wizard','Wizard','Executioner','Archer Queen','Little Prince','Goblinstein'],
  antiTank: ['Cannon Cart','Lumberjack','P.E.K.K.A','Sparky','Barbarians','Inferno Dragon','Elite Barbarians','Cannon','Hunter','Mini P.E.K.K.A','Inferno Tower','Tesla','Bomb Tower','Goblin Cage','Mighty Miner','Fisherman'],
  building: ['Cannon','Tombstone','Goblin Cage','Bomb Tower','Tesla','Inferno Tower','Goblin Hut','Furnace','Mortar','X-Bow','Barbarian Hut'],
  smallSpell: ['The Log','Arrows','Barbarian Barrel','Giant Snowball','Zap','Rage','Royal Delivery'],
  bigSpell: ['Poison','Fireball','Lightning','Rocket','Void','Earthquake'],
  spell: ['The Log','Arrows','Barbarian Barrel','Giant Snowball','Zap','Rage','Royal Delivery','Poison','Fireball','Lightning','Rocket','Void','Earthquake','Freeze','Tornado','Goblin Curse','Vines'],
  splash: ['Bowler','Executioner','Baby Dragon','Wizard','Valkyrie','Dark Prince','Bomber','Firecracker','Magic Archer','Electro Wizard','Electro Dragon','Mother Witch','Princess','Ice Wizard','Goblin Curse','Poison','Arrows','Fireball','Royal Delivery','Giant Skeleton','Mega Knight'],
  swarm: ['Skeletons','Goblins','Goblin Gang','Guards','Bats','Minions','Minion Horde','Skeleton Army','Barbarians','Royal Recruits','Rascals','Three Musketeers','Skeleton Dragons'],
  cycle: ['Skeletons','Goblins','Spear Goblins','Bats','Ice Spirit','Fire Spirit','Electro Spirit','Heal Spirit','Ice Golem','The Log','Giant Snowball'],
  ranged: ['Musketeer','Firecracker','Magic Archer','Dart Goblin','Princess','Archers','Wizard','Witch','Executioner','Bowler','Hunter','Flying Machine','Zappies','Mother Witch','Archer Queen','Little Prince','Goblinstein'],
  air: ['Bats','Minions','Minion Horde','Skeleton Dragons','Phoenix','Inferno Dragon','Baby Dragon','Flying Machine','Mega Minion','Electro Dragon','Balloon','Lava Hound','Night Witch'],
  airWin: ['Balloon','Lava Hound'],
  reset: ['Electro Wizard','Electro Spirit','Zap','Lightning','Electro Dragon','Zappies'],
  inferno: ['Inferno Dragon','Inferno Tower'],
  bait: ['Goblin Barrel','Skeleton Barrel','Princess','Dart Goblin','Goblin Gang','Guards','Bats','Wall Breakers','Suspicious Bush'],
  bridge: ['Battle Ram','Ram Rider','Bandit','Royal Ghost','Dark Prince','Prince','P.E.K.K.A','Elite Barbarians','Wall Breakers','Suspicious Bush'],
  control: ['Poison','Graveyard','Miner','Bomb Tower','Goblin Cage','Cannon Cart','Bowler','Ice Wizard','Fisherman','Tornado','Guards'],
  beatdown: ['Golem','Goblin Giant','Giant','Electro Giant','Lava Hound','Night Witch','Phoenix','Lightning','Rune Giant','Sparky'],
  siege: ['Mortar','X-Bow','Archers','Knight','Skeletons','Fireball','The Log'],
  graveyardSupport: ['Poison','Baby Dragon','Bowler','Ice Wizard','Valkyrie','Skeleton King','Phoenix','Tornado'],
  pressure: ['Wall Breakers','Battle Ram','Ram Rider','Royal Hogs','Hog Rider','Goblin Barrel','Skeleton Barrel','Miner','Graveyard','Suspicious Bush','Bandit','Royal Ghost','Balloon']
}).map(([k,v]) => [k,new Set(v)]));

const ALL_KNOWN_CARDS = [
  'Cannon Cart','Goblinstein','Rascals','Poison','Three Musketeers','Zappies','Spirit Empress','Monk','Lightning','Goblin Demolisher','The Log','Giant Skeleton','Dark Prince','Phoenix','Royal Recruits','Skeleton Dragons','Goblins','Bowler','Furnace','Mother Witch','Arrows','Guards','Golden Knight','Skeletons','Mortar','Barbarian Barrel','Lumberjack','Goblin Hut','Bomb Tower','Skeleton Barrel','Fireball','Goblin Cage','Mighty Miner','Minions','Goblin Barrel','Royal Ghost','Dart Goblin','Goblin Gang','Electro Giant','P.E.K.K.A','Berserker','Battle Ram','Firecracker','Vines','Bomber','Void','Fisherman','Sparky','Barbarians','Suspicious Bush','Inferno Dragon','Electro Spirit','Minion Horde','Prince','Archer Queen','Baby Dragon','Skeleton King','Flying Machine','Elite Barbarians','Electro Dragon','Royal Delivery','Fire Spirit','Balloon','Ice Wizard','Graveyard','Goblin Curse','Ram Rider','Earthquake','Electro Wizard','Cannon','Hunter','Giant Snowball','Royal Hogs','Musketeer','Archers','Tombstone','Goblin Drill','Mega Knight','Rune Giant','Zap','Witch','Magic Archer','Ice Spirit','Bandit','Golem','Spear Goblins','Royal Giant','Mega Minion','Giant','Heal Spirit','Skeleton Army','Goblin Machine','Bats','Boss Bandit','Mini P.E.K.K.A','Ice Golem','Rage','Inferno Tower','Executioner','Miner','Little Prince','Hog Rider','Princess','Knight','Wall Breakers','Valkyrie','Barbarian Hut','Rocket','Tesla','Lava Hound','Goblin Giant','Tornado','Night Witch','Wizard','Battle Healer','Freeze','Elixir Golem','X-Bow'
];

const CARD_LOOKUP = new Map(ALL_KNOWN_CARDS.map(n => [norm(n), n]));

let state = {
  pool: [],
  remaining: [],
  you: [],
  opp: [],
  history: [],
  turn: 0,
  pickFirst: true,
  sequence: []
};

const $ = (id) => document.getElementById(id);
function norm(s){ return s.toLowerCase().replace(/[^a-z0-9]/g,''); }
function canonicalName(raw){
  const trimmed = raw.trim();
  return CARD_LOOKUP.get(norm(trimmed)) || trimmed.replace(/\s+/g,' ');
}
function has(card, role){ return SETS[role]?.has(card) || false; }
function cost(card){ return COST[card] ?? 4; }
function clamp(n,a,b){ return Math.max(a,Math.min(b,n)); }
function uniq(a){ return [...new Set(a)]; }

function parsePool(text){
  return uniq(text.split(/[\n,;]+/).map(canonicalName).filter(Boolean));
}

function makeSequence(pickFirst){
  const base = ['you','opp','opp','you','you','opp','opp','you','you','opp','opp','you','you','opp','you','opp'];
  if (pickFirst) return base;
  return base.map(x => x === 'you' ? 'opp' : 'you');
}

function cardTags(card){
  const tags=[];
  for(const key of ['winCondition','tank','antiAir','antiTank','building','smallSpell','bigSpell','splash','swarm','cycle','ranged','air','reset','bait','bridge','control','beatdown','siege','pressure']) if(has(card,key)) tags.push(key);
  return tags;
}

function themeScores(deck){
  const themes = ['bridge','control','beatdown','siege','bait','graveyardSupport','cycle','air'];
  return Object.fromEntries(themes.map(t => [t, deck.reduce((n,c)=>n+(has(c,t)?1:0),0)]));
}

function inferredStrategy(deck){
  if (!deck.length) return 'Open draft — preserve flexibility and information.';
  const t = themeScores(deck);
  const winCons = deck.filter(c=>has(c,'winCondition'));
  const sorted = Object.entries(t).sort((a,b)=>b[1]-a[1]);
  let label = sorted[0][1] >= 2 ? sorted[0][0] : 'flexible control';
  if (winCons.includes('Graveyard')) label = 'graveyard control';
  if (winCons.includes('Lava Hound') || winCons.includes('Balloon') && t.air >= 2) label = 'air pressure';
  return `${label.replace(/\b\w/g,m=>m.toUpperCase())}${winCons.length ? ` · ${winCons.join(' / ')}` : ' · win condition still open'}`;
}

function coverage(deck){
  const checks = [
    ['Win con', deck.some(c=>has(c,'winCondition'))],
    ['Anti-air', deck.some(c=>has(c,'antiAir'))],
    ['Anti-tank', deck.some(c=>has(c,'antiTank'))],
    ['Splash', deck.some(c=>has(c,'splash'))],
    ['Spell', deck.some(c=>has(c,'spell'))]
  ];
  return checks;
}

function counterPower(card, enemyCard){
  let v = 0;
  if (has(enemyCard,'tank') && has(card,'antiTank')) v += 1.6;
  if (has(enemyCard,'air') && has(card,'antiAir')) v += 1.25;
  if (has(enemyCard,'airWin') && has(card,'antiAir')) v += 1.15;
  if (has(enemyCard,'swarm') && (has(card,'splash') || has(card,'smallSpell'))) v += 1.15;
  if (has(enemyCard,'bait') && (has(card,'smallSpell') || has(card,'splash'))) v += 0.9;
  if (has(enemyCard,'inferno') && has(card,'reset')) v += 1.1;
  if (has(enemyCard,'winCondition') && has(card,'building')) v += 0.75;
  if (has(enemyCard,'ranged') && has(card,'bigSpell')) v += 0.8;
  if (enemyCard === 'Graveyard' && (card === 'Poison' || has(card,'splash') || has(card,'swarm'))) v += 1.2;
  if (enemyCard === 'Royal Hogs' && (card === 'Bomb Tower' || card === 'Fireball' || card === 'Bowler' || has(card,'splash'))) v += 1.0;
  if (enemyCard === 'Balloon' && (has(card,'antiAir') || has(card,'building'))) v += 1.0;
  return v;
}

function riskAgainst(card, enemyDeck){
  return enemyDeck.reduce((sum,e)=>sum+counterPower(e,card),0);
}

function synergy(card, deck){
  if (!deck.length) return 0;
  let s = 0;
  const t = themeScores(deck);
  for(const theme of ['bridge','control','beatdown','siege','bait','graveyardSupport','cycle','air']){
    if(t[theme] >= 2 && has(card,theme)) s += 1.0 + Math.min(.5,t[theme]*.1);
    else if(t[theme] === 1 && has(card,theme)) s += .45;
  }
  if(deck.includes('Graveyard') && has(card,'graveyardSupport')) s += 1.2;
  if(card === 'Graveyard' && deck.some(c=>has(c,'graveyardSupport'))) s += 1.0;
  if(deck.some(c=>['Golem','Giant','Goblin Giant','Electro Giant','Rune Giant'].includes(c)) && (has(card,'ranged') || has(card,'beatdown'))) s += .7;
  if(deck.some(c=>['Battle Ram','Ram Rider','Wall Breakers'].includes(c)) && has(card,'bridge')) s += .7;
  return s;
}

function remainingCounterCount(card, remaining){
  return remaining.filter(c => c !== card && counterPower(c,card) >= 1).length;
}

function roleScarcity(card, ownDeck, remaining){
  const wanted = [];
  if(!ownDeck.some(c=>has(c,'antiAir'))) wanted.push('antiAir');
  if(!ownDeck.some(c=>has(c,'antiTank'))) wanted.push('antiTank');
  if(!ownDeck.some(c=>has(c,'spell'))) wanted.push('spell');
  if(ownDeck.length >= 4 && !ownDeck.some(c=>has(c,'winCondition'))) wanted.push('winCondition');
  let score = 0;
  for(const role of wanted){
    if(!has(card,role)) continue;
    const left = remaining.filter(c=>has(c,role)).length;
    if(left <= 2) score += 2.1;
    else if(left <= 4) score += 1.2;
    else score += .45;
  }
  return score;
}

function flexibility(card){
  const roles = ['antiAir','antiTank','splash','cycle','ranged','building','spell','tank'].filter(r=>has(card,r)).length;
  let f = Math.min(2.2, roles * .35);
  const e = cost(card);
  if(e <= 4) f += .35;
  if(has(card,'winCondition')) f -= .35;
  if(card === 'Cannon Cart' || card === 'Rascals' || card === 'Dark Prince' || card === 'Phoenix') f += .6;
  return f;
}

function scoreCard(card, ownDeck, enemyDeck, remaining, pickIndex){
  const cwr = META_CWR[card] ?? 50;
  const meta = (cwr - 50) * 1.35 + (PATCH_PRIOR[card] ?? 0);
  const fit = synergy(card, ownDeck) * 4.1;
  const counters = enemyDeck.reduce((n,e)=>n+counterPower(card,e),0) * 3.4;
  const denial = ownDeck.reduce((n,m)=>n+counterPower(card,m),0) * 1.9;
  const risk = riskAgainst(card, enemyDeck) * -2.25;
  const scarce = roleScarcity(card, ownDeck, remaining) * 3.1;
  const flex = flexibility(card) * (pickIndex < 8 ? 2.7 : 1.25);
  const remainingCounters = remainingCounterCount(card, remaining);
  let timing = 0;
  const hasWin = ownDeck.some(c=>has(c,'winCondition'));
  if(has(card,'winCondition')){
    if(pickIndex < 7 && !hasWin) timing -= Math.min(7, 1.0 + remainingCounters * .35);
    if(pickIndex >= 8 && !hasWin) timing += 6;
    if(remainingCounters <= 2) timing += 5;
    if(enemyDeck.length >= 4 && riskAgainst(card,enemyDeck) < 1.2) timing += 3.2;
    if(hasWin && !['Miner','Wall Breakers','Skeleton Barrel','Battle Ram','Ram Rider'].includes(card)) timing -= 2.5;
  }
  if(ownDeck.length >= 6){
    if(!ownDeck.some(c=>has(c,'antiAir')) && !has(card,'antiAir')) timing -= 7;
    if(!ownDeck.some(c=>has(c,'spell')) && !has(card,'spell')) timing -= 5;
  }
  const raw = 50 + meta + fit + counters + denial + risk + scarce + flex + timing;
  const score = clamp(raw, 1, 99);
  const components = {meta,fit,counters,denial,risk,scarce,flex,timing};
  return {card,score,components,cwr,remainingCounters};
}

function reasons(result){
  const c = result.components;
  const positives = [
    ['Strong current Mega Draft baseline', c.meta],
    ['Fits your emerging pressure plan', c.fit],
    ['Directly answers revealed enemy cards', c.counters],
    ['Denies counters to your own threats', c.denial],
    ['Fills a scarce remaining role', c.scarce],
    ['Preserves early-draft flexibility', c.flex],
    ['Timing is favorable now', c.timing]
  ].filter(x=>x[1] > 2).sort((a,b)=>b[1]-a[1]);
  const negatives = [
    ['Opponent already has clean counters', c.risk],
    ['Too committal for this draft stage', c.timing]
  ].filter(x=>x[1] < -2).sort((a,b)=>a[1]-b[1]);
  if(positives.length) return positives.slice(0,2).map(x=>x[0]).join(' · ');
  if(negatives.length) return negatives[0][0];
  return 'Solid neutral pick with no major matchup liability.';
}

function componentChips(r){
  const map = [
    ['Meta',r.components.meta],['Fit',r.components.fit],['Counters',r.components.counters],['Deny',r.components.denial],['Scarcity',r.components.scarce],['Flex',r.components.flex],['Risk',r.components.risk],['Timing',r.components.timing]
  ];
  return map.filter(([,v])=>Math.abs(v)>=1.4).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).slice(0,4)
    .map(([k,v])=>`<span class="chip ${v>0?'good':'bad'}">${k} ${v>0?'+':''}${v.toFixed(1)}</span>`).join('');
}

function rankFor(side){
  const own = side === 'you' ? state.you : state.opp;
  const enemy = side === 'you' ? state.opp : state.you;
  return state.remaining.map(c=>scoreCard(c,own,enemy,state.remaining,state.turn)).sort((a,b)=>b.score-a.score);
}

function pickCard(card){
  if(state.turn >= state.sequence.length || !state.remaining.includes(card)) return;
  const side = state.sequence[state.turn];
  state.history.push(JSON.parse(JSON.stringify({you:state.you,opp:state.opp,remaining:state.remaining,turn:state.turn})));
  state[side].push(card);
  state.remaining = state.remaining.filter(c=>c!==card);
  state.turn++;
  render();
}

function undo(){
  const prev = state.history.pop();
  if(!prev) return;
  state.you = prev.you; state.opp = prev.opp; state.remaining = prev.remaining; state.turn = prev.turn;
  render();
}

function avg(deck){ return deck.length ? deck.reduce((n,c)=>n+cost(c),0)/deck.length : 0; }

function renderDeck(side){
  const deck = state[side];
  $(side+'Count').textContent = deck.length;
  $(side+'Avg').textContent = `${avg(deck).toFixed(1)} elixir`;
  const target = $(side+'Deck');
  target.classList.toggle('empty-state',!deck.length);
  target.innerHTML = deck.length ? deck.map(c=>`<span class="deck-card">${c}</span>`).join('') : 'No cards drafted yet.';
  const cov = coverage(deck);
  $(side+'Strategy').innerHTML = `<strong>${inferredStrategy(deck)}</strong><div class="coverage">${cov.map(([n,ok])=>`<span class="${ok?'covered':'missing'}">${ok?'✓':'!'} ${n}</span>`).join('')}</div>`;
}

function renderRecommendations(side){
  const ranked = rankFor(side).slice(0,8);
  $('recommendationTitle').textContent = side === 'you' ? 'Best available picks' : 'Opponent danger board';
  $('recommendationEyebrow').textContent = side === 'you' ? 'Decision support' : 'Anticipate their turn';
  $('recommendationList').innerHTML = ranked.map((r,i)=>`
    <article class="recommendation-card">
      <div class="rec-rank">#${i+1} · CWR ${r.cwr}%${PATCH_PRIOR[r.card] ? ' · patch adjusted' : ''}</div>
      <div class="rec-name-row"><span class="rec-name">${r.card}</span><span class="score">${Math.round(r.score)}</span></div>
      <div class="reason">${reasons(r)}</div>
      <div class="score-bar"><span style="width:${r.score}%"></span></div>
      <div class="chips">${componentChips(r)}</div>
    </article>`).join('');
}

function renderPool(side){
  const q = norm($('cardSearch').value || '');
  const scoreMap = new Map(rankFor(side).map(r=>[r.card,r]));
  const cards = state.remaining.filter(c=>!q || norm(c).includes(q));
  $('remainingCount').textContent = state.remaining.length;
  $('poolGrid').innerHTML = cards.map(c=>{
    const r = scoreMap.get(c);
    const tags = cardTags(c).slice(0,3).map(t=>t.replace(/([A-Z])/g,' $1').toLowerCase()).join(' · ') || 'neutral metadata';
    return `<button class="pool-card" data-card="${c.replace(/"/g,'&quot;')}"><span class="mini-score">${Math.round(r.score)}</span><strong>${c}</strong><small>${cost(c)} elixir · ${tags}</small></button>`;
  }).join('');
  document.querySelectorAll('.pool-card').forEach(btn=>btn.addEventListener('click',()=>pickCard(btn.dataset.card)));
}

function render(){
  renderDeck('you'); renderDeck('opp');
  const finished = state.turn >= state.sequence.length;
  const side = finished ? 'you' : state.sequence[state.turn];
  $('turnCounter').textContent = finished ? 'Draft complete' : `Pick ${state.turn+1} / 16`;
  $('turnTitle').textContent = finished ? 'Draft complete' : side === 'you' ? 'Your pick' : 'Opponent pick';
  $('turnSubtitle').textContent = finished ? 'Review the matchup and final coverage below.' : side === 'you'
    ? 'Recommendations emphasize your plan, enemy counters, denial value, and remaining scarcity.'
    : 'Use this board to anticipate the cards most valuable from the opponent’s perspective.';
  renderRecommendations(side);
  renderPool(side);
}

$('loadSample').addEventListener('click',()=>{ $('poolInput').value = SAMPLE_POOL.join('\n'); $('setupMessage').textContent = 'Loaded a 36-card sample matching the current Mega Draft group structure.'; });
$('startDraft').addEventListener('click',()=>{
  const pool = parsePool($('poolInput').value);
  if(pool.length !== 36){ $('setupMessage').textContent = `Mega Draft expects 36 unique cards; I found ${pool.length}.`; return; }
  state = {pool:[...pool],remaining:[...pool],you:[],opp:[],history:[],turn:0,pickFirst:$('pickFirst').checked,sequence:makeSequence($('pickFirst').checked)};
  $('setupPanel').classList.add('hidden'); $('draftApp').classList.remove('hidden'); $('cardSearch').value=''; render();
});
$('undoPick').addEventListener('click',undo);
$('resetDraft').addEventListener('click',()=>{ $('draftApp').classList.add('hidden'); $('setupPanel').classList.remove('hidden'); });
$('cardSearch').addEventListener('input',()=>{ if(state.sequence.length) renderPool(state.turn>=state.sequence.length?'you':state.sequence[state.turn]); });

$('poolInput').value = SAMPLE_POOL.join('\n');
