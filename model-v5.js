// Model v5: archetype signature gates + Mega Draft pool randomizer.
//
// Specialized archetypes require their defining pressure package so support cards
// cannot create false positives (for example, Poison/Phoenix without Graveyard).
// Randomizer group membership mirrors RoyaleAPI's current grouped Mega Draft pool.

// Role metadata correction: Skeleton Dragons deal area damage.
SETS.splash.add('Skeleton Dragons');

const ARCHETYPE_GATES_V5 = {
  'Beatdown': deck => deck.some(c => [
    'Golem','Goblin Giant','Giant','Electro Giant','Royal Giant','Rune Giant',
    'Elixir Golem','Lava Hound'
  ].includes(c)),
  'Air Beatdown': deck => deck.includes('Lava Hound') || (
    deck.includes('Balloon') && deck.filter(c => has(c,'air')).length >= 2
  ),
  'Control': () => true,
  'Cycle Pressure': deck => deck.some(c => [
    'Hog Rider','Miner','Wall Breakers','Goblin Barrel','Skeleton Barrel',
    'Royal Hogs','Goblin Drill','Suspicious Bush'
  ].includes(c)) && deck.some(c => has(c,'cycle') || cost(c) <= 2),
  'Bridge Pressure': deck => deck.some(c => has(c,'bridge')),
  'Bait': deck => deck.some(c => [
    'Goblin Barrel','Skeleton Barrel','Wall Breakers','Suspicious Bush'
  ].includes(c)),
  'Siege': deck => deck.includes('Mortar') || deck.includes('X-Bow'),
  'Graveyard Control': deck => deck.includes('Graveyard'),
  'Split-Lane Pressure': deck => deck.some(c => [
    'Royal Hogs','Royal Recruits','Three Musketeers'
  ].includes(c)) || deck.filter(c => has(c,'splitLane')).length >= 2,
  'Counterpush': () => true
};

function archetypeEligibleV5(name,deck){
  return ARCHETYPE_GATES_V5[name]?.(deck) ?? true;
}

const archetypeDistributionV2BaseV5 = archetypeDistributionV2;
archetypeDistributionV2 = function(deck){
  // Before any card is drafted, retain the neutral prior across all strategies.
  if(!deck.length) return archetypeDistributionV2BaseV5(deck);

  const raw = archetypeRawScoresV2(deck);
  const eligible = Object.entries(raw).filter(([name]) => archetypeEligibleV5(name,deck));
  if(!eligible.length) return archetypeDistributionV2BaseV5(deck);

  const max = Math.max(...eligible.map(([,value]) => value));
  const weighted = eligible.map(([name,value]) => [name,Math.exp((value-max)/1.6)]);
  const total = weighted.reduce((sum,[,value]) => sum+value,0) || 1;
  const result = Object.fromEntries(Object.keys(raw).map(name => [name,0]));
  for(const [name,value] of weighted) result[name] = value/total;
  return result;
};

// Generic buildings can absorb a siege shot or create placement friction, but that
// is not equivalent to a clean Mortar/X-Bow counter. Reduce the generic .65
// building-vs-win-condition heuristic to .20 for siege targets unless a future
// explicit card-specific matchup override says otherwise.
const counterPowerV4BaseV5 = counterPower;
counterPower = function(card,enemyCard){
  const base = counterPowerV4BaseV5(card,enemyCard);
  const siegeTarget = enemyCard === 'Mortar' || enemyCard === 'X-Bow';
  const explicit = matchupOverrideV2(card,enemyCard);
  if(siegeTarget && has(card,'building') && explicit === null){
    return Math.max(0,base-.45);
  }
  return base;
};

// Current RoyaleAPI grouped Mega Draft recipe:
// 4 Tank Unit, 4 Anti Air, 4 Distractions, 4 Direct Damage, 6 Win Cons,
// 2 2nd Spell, 3 Mini Tank, 3 Anti Tank, 3 Champions, 3 Draft Buildings.
const MEGA_DRAFT_GROUPS_V5 = [
  {name:'Tank Unit',count:4,cards:[
    'Rascals','Giant Skeleton','Bowler','Royal Recruits','Mega Knight','Goblin Drill',
    'Golem','Electro Giant','Royal Giant','Goblin Giant','Valkyrie','Ice Golem','Knight',
    'Giant','Goblin Machine','Miner','Rune Giant','Lava Hound','Elixir Golem'
  ]},
  {name:'Anti Air',count:4,cards:[
    'Zappies','Mother Witch','Phoenix','Skeleton Dragons','Dart Goblin','Minions',
    'Flying Machine','Firecracker','Archers','Minion Horde','Electro Wizard','Musketeer',
    'Electro Dragon','Mega Minion','Inferno Dragon','Baby Dragon','Hunter','Executioner',
    'Witch','Bats','Princess','Ice Wizard','Spear Goblins','Magic Archer','Night Witch','Wizard'
  ]},
  {name:'Distractions',count:4,cards:[
    'Goblins','Guards','Skeletons','Minions','Bomber','Berserker','Electro Spirit',
    'Goblin Gang','Fire Spirit','Ice Spirit','Heal Spirit','Spear Goblins','Skeleton Army','Ice Golem'
  ]},
  {name:'Direct Damage',count:4,cards:[
    'Poison','Lightning','The Log','Fireball','Arrows','Barbarian Barrel','Void',
    'Giant Snowball','Royal Delivery','Zap','Goblin Curse','Earthquake','Rage','Rocket'
  ]},
  {name:'Win Cons',count:6,cards:[
    'Three Musketeers','Suspicious Bush','Skeleton Barrel','Goblin Barrel','Goblin Drill',
    'Ram Rider','Battle Ram','Royal Giant','Royal Hogs','Balloon','Graveyard','Goblin Giant',
    'Hog Rider','Giant','Wall Breakers','Miner','Rune Giant','Elixir Golem'
  ]},
  {name:'2nd Spell',count:2,cards:[
    'Poison','Lightning','The Log','Fireball','Arrows','Barbarian Barrel','Giant Snowball',
    'Zap','Goblin Curse','Earthquake','Rocket','Tornado','Freeze'
  ]},
  {name:'Mini Tank',count:3,cards:[
    'Cannon Cart','Rascals','Dark Prince','Goblin Cage','Royal Ghost','Berserker','Fisherman',
    'Prince','Mini P.E.K.K.A','Bandit','Valkyrie','Knight','Goblin Machine','Battle Healer','Miner'
  ]},
  {name:'Anti Tank',count:3,cards:[
    'Cannon Cart','Rascals','Goblin Cage','Bomb Tower','Lumberjack','Sparky','P.E.K.K.A',
    'Elite Barbarians','Barbarians','Inferno Dragon','Hunter','Witch','Cannon','Mini P.E.K.K.A',
    'Inferno Tower','Tesla'
  ]},
  {name:'Champions',count:3,cards:[
    'Goblinstein','Monk','Golden Knight','Mighty Miner','Archer Queen','Skeleton King',
    'Boss Bandit','Little Prince'
  ]},
  {name:'Draft Buildings',count:3,cards:[
    'Furnace','Goblin Cage','Bomb Tower','Goblin Hut','Mortar','Tombstone','Cannon',
    'Inferno Tower','Tesla','Barbarian Hut','X-Bow'
  ]}
];

function shuffleV5(items){
  const out=[...items];
  for(let i=out.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [out[i],out[j]]=[out[j],out[i]];
  }
  return out;
}

function takeUniqueForGroupV5(group,used){
  const available=shuffleV5(group.cards.filter(card => !used.has(card)));
  if(available.length < group.count){
    throw new Error(`Not enough unique cards available for ${group.name}.`);
  }
  const chosen=available.slice(0,group.count);
  chosen.forEach(card => used.add(card));
  return chosen;
}

function randomMegaDraftPoolV5(){
  const used=new Set();
  const pool=[];
  for(const group of MEGA_DRAFT_GROUPS_V5){
    pool.push(...takeUniqueForGroupV5(group,used));
  }
  if(pool.length !== 36 || new Set(pool).size !== 36){
    throw new Error('Randomized Mega Draft pool failed the 36-unique-card invariant.');
  }
  return shuffleV5(pool);
}

const randomizePoolButtonV5 = $('randomizePool');
if(randomizePoolButtonV5){
  randomizePoolButtonV5.addEventListener('click',()=>{
    try{
      const pool=randomMegaDraftPoolV5();
      $('poolInput').value=pool.join('\n');
      $('setupMessage').textContent='Generated a valid 36-card Mega Draft pool using the current grouped recipe (4/4/4/4/6/2/3/3/3/3).';
    }catch(error){
      $('setupMessage').textContent=`Could not randomize the pool: ${error.message}`;
    }
  });
}
