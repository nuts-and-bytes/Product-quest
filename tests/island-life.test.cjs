const test=require('node:test'),assert=require('node:assert/strict');
require('../assets/cafe-case-state.js');require('../assets/island-life-state.js');require('../assets/world-map.js');
const M=PQCafeModel,L=PQLifeState;
const caseWithTrial=(scenario,plan)=>{
 let s=M.advance(M.fresh(scenario),'start');s=M.advance(s,'plan');s=M.advance(s,'hypothesis','unknown');s=M.advance(s,'unknown','sample');
 for(const id of plan)s=M.advance(s,'toggle',id);return M.advance(s,'trial');
};
test('watch history migrates safely and only retains authored film identifiers',()=>{
 assert.deepEqual(L.normalize(undefined),[]);
 assert.deepEqual(L.normalize(['morning','morning','incident-1','outcome-0-3','outcome-4-99','<script>',{}]),['morning','incident-1','outcome-0-3']);
 assert.deepEqual(L.remember(['morning'],'morning'),['morning']);
});
test('watching island life never spends actions, unlocks evidence or changes a case',()=>{
 const s=caseWithTrial(0,['signs']),before=JSON.stringify(s);
 for(const kind of ['morning','incident','outcome']){assert.ok(L.film(kind,s));L.remember([],L.film(kind,s).id);}
 assert.equal(JSON.stringify(s),before);assert.equal(L.film('outcome',M.fresh()),null);assert.equal(L.film('<script>',s),null);
});
test('the ending shows Achen carrying a cup only when the actual simulation serves him',()=>{
 for(const scenario of [0,1])for(const plan of [['signs'],['preorder'],['helper'],['menu'],['signs','helper']]){
  const s=caseWithTrial(scenario,plan),film=L.film('outcome',s),first=M.simulate(scenario,plan).orders[0];
  assert.equal(film.served,first.served);assert.equal(film.ready,first.served||first.ready<first.leave);
  assert.equal(film.shots.at(-1).caption.includes('手里多了一杯'),first.served);
 }
});
test('the incident respects the different weekday and weekend bottlenecks',()=>{
 assert.equal(L.film('incident',M.fresh(0)).ready,true);
 assert.equal(L.film('incident',M.fresh(1)).ready,false);
 assert.notEqual(L.film('incident',M.fresh(0)).id,L.film('incident',M.fresh(1)).id);
});
test('pause, hidden tabs and reduced motion preserve the current shot until the player continues',()=>{
 const c=new L.Clock(L.film('morning',M.fresh()).shots);
 c.paused=true;c.tick(10);assert.equal(c.time,0);c.paused=false;
 c.tick(10,{hidden:true});c.tick(10,{reduced:true});assert.equal(c.time,0);
 c.next();assert.equal(c.shot.stage,'community');assert.equal(c.time,0);
 c.next();c.next();assert.equal(c.done,true);assert.equal(c.next(),false);
});
test('large frame stalls cannot silently skip story beats',()=>{
 const c=new L.Clock(L.film('incident',M.fresh()).shots);c.tick(30);assert.equal(c.index,0);
 for(let i=0;i<50;i++)c.tick(.08);assert.equal(c.index,1);
});
test('the commute and coffee route use reachable island streets',()=>{
 const buildings=[{wx:-24,wz:3},{wx:-17,wz:20},{wx:-21,wz:-16},{wx:1,wz:23},{wx:1,wz:-22},{wx:25,wz:3},{wx:18,wz:19},{wx:22,wz:-15}];
 for(const [a,b] of [[[-11,19],[-11,16]],[[-17.5,7.6],[-17.5,3.6]],[[-17.5,3.6],[-17,7.5]]]){
  const path=PQWorldMap.findPath({x:a[0],z:a[1]},{x:b[0],z:b[1]},buildings);assert.ok(path);assert.ok(path.every(p=>PQWorldMap.canWalk(p.x,p.z,buildings)));
 }
});
