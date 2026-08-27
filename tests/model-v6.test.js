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

for(const file of ['app.js','model-v2.js','model-v3.js','model-v4.js','model-v5.js','model-v6.js']){
  vm.runInThisContext(fs.readFileSync(file,'utf8'),{filename:file});
}

assert.strictEqual(has('Rage','smallSpell'),false,'Rage should no longer satisfy the defensive small-spell role');
assert.strictEqual(has('Rage','cheapSpell'),true,'Rage should remain cheap utility');

const curseVsRascals = counterPower('Goblin Curse','Rascals');
const curseVsSkeletons = counterPower('Goblin Curse','Skeletons');
const curseVsWitch = counterPower('Goblin Curse','Witch');
assert(curseVsRascals <= .20,`Goblin Curse should get very little generic counter credit vs Rascals, got ${curseVsRascals}`);
assert(curseVsSkeletons >= 1.0,`Goblin Curse should be strong into fragile swarms, got ${curseVsSkeletons}`);
assert(curseVsWitch >= .8,`Goblin Curse should gain value into spawner pressure like Witch, got ${curseVsWitch}`);

const rageVsRascals = counterPower('Rage','Rascals');
assert(rageVsRascals <= .10,`Rage should not be treated as a Rascals counter, got ${rageVsRascals}`);

const deliveryVsGang = counterPower('Royal Delivery','Goblin Gang');
assert(deliveryVsGang >= 1.0,`Royal Delivery should retain real swarm-clear value, got ${deliveryVsGang}`);

const earlyOwn = ['Cannon Cart'];
const earlyEnemy = ['Dark Prince','Rascals'];
const earlyRemaining = ['Rage','Bowler','Goblin Curse','Skeletons','Fireball','Royal Delivery','Goblin Cage','Inferno Dragon'];
const rageStructure = structureValueV2('Rage',earlyOwn,earlyEnemy,earlyRemaining);
assert(rageStructure < 5.5,`Early Rage structure bonus should be damped below the previous ~8.8 level, got ${rageStructure}`);

const lateOwn = ['Cannon Cart','Bowler','Skeletons','Monk','Fisherman','Phoenix'];
const noSwarmEnemy = ['Dark Prince','Ram Rider','Inferno Dragon','Cannon Cart','Lightning'];
const noClearCandidate = structureValueV2('Musketeer',lateOwn,noSwarmEnemy,['Musketeer','Arrows']);
const swarmEnemy = ['Goblin Gang','Skeleton Army','Witch','Ram Rider','Dark Prince'];
const vsSwarmCandidate = structureValueV2('Musketeer',lateOwn,swarmEnemy,['Musketeer','Arrows']);
assert(vsSwarmCandidate < noClearCandidate,'Missing swarm clear should matter more when revealed swarm pressure is actually present');

console.log('model-v6 regression checks passed');
