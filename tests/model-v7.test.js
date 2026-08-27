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

for(const file of ['app.js','model-v2.js','model-v3.js','model-v4.js','model-v5.js','model-v6.js','model-v7.js']){
  vm.runInThisContext(fs.readFileSync(file,'utf8'),{filename:file});
}

const heavyBeatdownSeven = [
  'Cannon Cart','Poison','Rascals','Little Prince','Electro Giant','Arrows','Giant Skeleton'
];
assert.strictEqual(minimumCycleCostV7(heavyBeatdownSeven),15,'Expected the heavy E-Giant shell to have a 15-elixir minimum four-card cycle');

const skeletonCycle = minimumCycleValueV7('Skeletons',heavyBeatdownSeven);
assert.strictEqual(skeletonCycle.after,11,'Skeletons should lower the minimum cycle from 15 to 11');
assert.strictEqual(skeletonCycle.reduction,4,'Skeletons should reduce minimum cycle by 4 elixir');
assert(skeletonCycle.value > .8 && skeletonCycle.value < 3.01,`Expected a modest positive Beatdown cycle bonus, got ${skeletonCycle.value}`);

const lightningCycle = minimumCycleValueV7('Lightning',heavyBeatdownSeven);
assert.strictEqual(lightningCycle.reduction,0,'Another heavy card should not improve the minimum cycle');
assert.strictEqual(lightningCycle.value,0,'No cycle reduction should mean no cycle bonus');

const earlyDeck = ['Cannon Cart','Poison','Rascals'];
assert.strictEqual(minimumCycleValueV7('Skeletons',earlyDeck).value,0,'Minimum-cycle scoring should stay off before four cards establish a real rotation');

const skeletonScore = scoreCard('Skeletons',heavyBeatdownSeven,[],['Skeletons','Lightning'],14);
const lightningScore = scoreCard('Lightning',heavyBeatdownSeven,[],['Skeletons','Lightning'],14);
assert(skeletonScore.components.minCycle > lightningScore.components.minCycle,'The recommender should explicitly value Skeletons for lowering minimum cycle');

console.log('model-v7 regression checks passed');
