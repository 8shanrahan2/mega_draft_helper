const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function fakeElement(){
  return {
    value:'', textContent:'', innerHTML:'', checked:true, disabled:false,
    classList:{add(){},remove(){},toggle(){}},
    addEventListener(){},
    title:''
  };
}

const elements = new Map();
const radios = [
  {...fakeElement(),value:'1',checked:true},
  {...fakeElement(),value:'2',checked:false}
];
global.document = {
  getElementById(id){
    if(!elements.has(id)) elements.set(id,fakeElement());
    return elements.get(id);
  },
  querySelectorAll(selector){
    if(selector === 'input[name="playerPosition"]') return radios;
    return [];
  },
  querySelector(selector){
    if(selector === 'input[name="playerPosition"]:checked') return radios.find(r=>r.checked) || null;
    return null;
  }
};
global.window = global;

for(const file of ['app.js','model-v2.js','model-v3.js','model-v4.js','model-v5.js','model-v6.js','model-v7.js','model-v8.js']){
  vm.runInThisContext(fs.readFileSync(file,'utf8'),{filename:file});
}

// Player order is explicit but still maps to the existing proven sequence logic.
state.pickFirst = false;
assert.strictEqual(playerLabelV8(),'Player 2');
const p2Sequence = makeSequence(false);
assert.strictEqual(p2Sequence[0],'opp','Player 1/opponent should make the first selection when user is Player 2');
assert.strictEqual(p2Sequence[1],'you','Player 2/user should then receive the snake-draft double-pick sequence');

// Fire Spirit and Heal Spirit can lower the same rotation, but Fire Spirit should
// receive a small additional value for providing cheap AoE at the same time.
const utilityDeck = ['Cannon Cart','Rascals','Little Prince','Electro Giant'];
const utilityEnemy = ['Goblin Gang','Prince','Inferno Dragon'];
const fireUtility = cheapFunctionalCycleValueV8('Fire Spirit',utilityDeck,utilityEnemy);
const healUtility = cheapFunctionalCycleValueV8('Heal Spirit',utilityDeck,utilityEnemy);
assert(fireUtility.value > healUtility.value+.35,`Fire Spirit should gain meaningful multifunction value; fire=${fireUtility.value}, heal=${healUtility.value}`);
assert(fireUtility.roles.includes('cheap AoE'),'Fire Spirit should be recognized as cheap AoE utility');

// Win-condition timing should improve gradually as the player's own draft gets
// later and the opponent has fewer picks left to counter-draft.
const earlyOwn = ['Cannon Cart','Musketeer'];
const earlyEnemy = ['Inferno Dragon','Prince'];
const lateOwn = ['Cannon Cart','Musketeer','Valkyrie','Skeletons','Zap','Phoenix','Bowler'];
const lateWeakEnemy = ['Inferno Dragon','Musketeer','Little Prince','Prince','P.E.K.K.A','Lightning','Golem'];
const remaining = ['Royal Hogs','Bomb Tower','Fireball','Goblin Cage','Furnace','Mortar'];
const earlyTiming = smoothWinConditionTimingV8('Royal Hogs',earlyOwn,earlyEnemy,remaining).timing;
const lateWeakTiming = smoothWinConditionTimingV8('Royal Hogs',lateOwn,lateWeakEnemy,remaining).timing;
assert(lateWeakTiming > earlyTiming+4,`Late Royal Hogs reveal should be materially more attractive; early=${earlyTiming}, late=${lateWeakTiming}`);

// If the opponent's locked deck already contains strong answers, the late-reveal
// boost should be smaller than when their revealed deck is poorly equipped.
const lateCounterEnemy = ['Bomb Tower','Bowler','Fireball','Valkyrie','Musketeer','Prince','Inferno Dragon'];
const lateCounterTiming = smoothWinConditionTimingV8('Royal Hogs',lateOwn,lateCounterEnemy,remaining).timing;
assert(lateWeakTiming > lateCounterTiming,`Weak revealed answers should improve late timing; weak=${lateWeakTiming}, countered=${lateCounterTiming}`);

// Waiting on a win condition is allowed; the pressure to fill it rises smoothly
// rather than flipping on at one global pick number.
const nonWinEarly = smoothWinConditionTimingV8('Musketeer',earlyOwn,earlyEnemy,remaining).timing;
const nonWinLate = smoothWinConditionTimingV8('Musketeer',lateOwn,lateWeakEnemy,remaining).timing;
assert(nonWinLate < nonWinEarly,`Passing on a win condition should become progressively less attractive late; early=${nonWinEarly}, late=${nonWinLate}`);

console.log('model-v8 regression checks passed');
