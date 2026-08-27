const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function fakeElement(){
  return {
    value:'', textContent:'', innerHTML:'', checked:true, disabled:false,
    classList:{add(){},remove(){},toggle(){}},
    addEventListener(){}
  };
}

const elements = new Map();
global.document = {
  getElementById(id){
    if(!elements.has(id)) elements.set(id,fakeElement());
    return elements.get(id);
  },
  querySelectorAll(){ return []; }
};
global.window = global;

for(const file of ['app.js','model-v2.js','model-v3.js','model-v4.js','model-v5.js']){
  vm.runInThisContext(fs.readFileSync(file,'utf8'),{filename:file});
}

assert.strictEqual(has('Skeleton Dragons','splash'),true,'Skeleton Dragons should count as splash');

const noGraveyard = [
  'Cannon Cart','Phoenix','Poison','Arrows','Dark Prince','Giant Skeleton','Three Musketeers','Goblins'
];
const noGraveyardDist = archetypeDistributionV2(noGraveyard);
assert.strictEqual(noGraveyardDist['Graveyard Control'],0,'Graveyard Control must require Graveyard');

const siegeDeck = [
  'The Log','Skeleton Dragons','Skeletons','Mortar','Furnace','Bomb Tower','Monk','Goblin Hut'
];
const siegeDist = archetypeDistributionV2(siegeDeck);
assert(siegeDist['Siege'] > 0.85,`Expected strong Siege confidence, got ${siegeDist['Siege']}`);

const hutVsMortar = counterPower('Goblin Hut','Mortar');
assert(hutVsMortar >= 0.19 && hutVsMortar <= 0.21,`Expected weak generic building-vs-Mortar value around .20, got ${hutVsMortar}`);

for(let i=0;i<500;i++){
  const pool = randomMegaDraftPoolV5();
  assert.strictEqual(pool.length,36,'Random pool must contain 36 cards');
  assert.strictEqual(new Set(pool).size,36,'Random pool must contain 36 unique cards');
  assert.strictEqual(pool.filter(card=>has(card,'champion')).length,3,'Random pool must contain exactly 3 Champions');
}

console.log('model-v5 regression checks passed');
