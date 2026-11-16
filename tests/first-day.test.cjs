const test=require('node:test'),assert=require('node:assert/strict');
require('../assets/first-day-state.js');require('../assets/world-map.js');
const S=PQFirstDayState;
test('new players get an introduction while existing saves keep their progress',()=>{
  assert.equal(S.normalize(null,0).stage,'arrival');
  for(const progress of [1,5,37])assert.equal(S.normalize(undefined,progress).stage,'complete');
});
test('first day completes only after the office and coffee checkpoints',()=>{
  let s=S.normalize(null,0);
  for(const invalid of ['finishCoffee','enterCafe'])assert.equal(S.step(s,invalid).stage,'arrival');
  for(const [e,stage] of [['meet','hq'],['enterOffice','office'],['passOffice','cafe'],['enterCafe','coffee'],['finishCoffee','complete']]){
    s=S.step(s,e);assert.equal(s.stage,stage);assert.equal(S.step(s,e).stage,stage);
  }
  assert.equal(S.step(s,'enterOffice').stage,'complete');
});
test('story, quiz, drink and clues survive a save round trip; pauses stay optional',()=>{
  const raw={version:1,stage:'office',started:true,paused:true,drink:'tea',clues:['envelopes','investor','envelopes','unknown'],lesson:{phase:'quiz',node:8,quiz:1,score:4,correct:1}};
  const s=S.normalize(JSON.parse(JSON.stringify(raw)),0);
  assert.deepEqual(s.clues,['envelopes','investor']);assert.equal(s.drink,'tea');assert.equal(s.started,true);assert.equal(s.paused,true);assert.deepEqual(s.lesson,raw.lesson);
  const after=S.normalize({...s,stage:'coffee'},1);assert.equal(after.stage,'coffee');assert.equal(after.drink,'tea');
  assert.equal(S.step(after,'finishCoffee').paused,false);
});
test('a saved chapter completion recovers even if the journey checkpoint lagged',()=>{
  const s=S.normalize({version:1,stage:'office',lesson:{phase:'story',node:2,quiz:0,score:0,correct:0}},1);
  assert.equal(s.stage,'cafe');assert.equal(s.lesson,null);
  assert.equal(S.normalize({version:1,stage:'coffee'},0).stage,'hq');
  assert.equal(S.normalize({version:1,stage:'office',lesson:{phase:'quiz',node:-1,quiz:3}},0).lesson,null);
});
test('the first-day route reaches the receptionist, office and cafe without crossing obstacles',()=>{
  const fs=require('node:fs'),vm=require('node:vm'),ctx={PQWorldMap,PQ:{sprites:{},buildings:[],pains:[]}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../content/world.js'),'utf8'),ctx);
  const points=[{x:-6.5,z:4.8},{x:-7,z:1.4},{x:-19,z:-9.5},{x:-17.5,z:3}];
  for(let i=1;i<points.length;i++){
    const path=PQWorldMap.findPath(points[i-1],points[i],ctx.PQ.buildings);
    assert.ok(path&&path.length);for(const p of path)assert.ok(PQWorldMap.canWalk(p.x,p.z,ctx.PQ.buildings));
  }
});

test('returning players can replay the introduction without changing chapter progress',()=>{
  const progress=37,s=S.normalize({version:1,stage:'office',started:true,replay:true},progress);
  assert.equal(s.stage,'office');assert.equal(s.replay,true);
  const cafe=S.step(s,'passOffice'),coffee=S.step(cafe,'enterCafe'),done=S.step(coffee,'finishCoffee');
  assert.equal(done.stage,'complete');assert.equal(done.replay,false);assert.equal(progress,37);
});
