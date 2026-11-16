const test=require('node:test'),assert=require('node:assert/strict');
require('../assets/cafe-case-state.js');const M=PQCafeModel;
const step=(s,event,v)=>M.advance(s,event,v);
function trial(s,plan=['signs'],hypothesis='pickup'){
  s=step(s,'plan');s=step(s,'hypothesis',hypothesis);s=step(s,'unknown','sample');
  for(const p of [...s.plan])s=step(s,'toggle',p);
  for(const p of plan)s=step(s,'toggle',p);
  return step(s,'trial');
}
test('existing saves get a separate optional case without changing chapter progress',()=>{
  const save={progress:37,trust:91,firstDay:{stage:'complete'},stats:{p1:{rank:'S'}}},copy=JSON.stringify(save);
  assert.equal(M.normalize(save.cafeCase).phase,'intro');assert.equal(JSON.stringify(save),copy);
});
test('reading already found material is free and inquiry reserves a trial',()=>{
  let s=step(M.fresh(),'start');
  s=step(s,'observe','orders');assert.equal(M.remaining(s),7);
  for(let i=0;i<10;i++)s=step(s,'observe','orders');assert.equal(M.remaining(s),7);
  s=trial(s,['preorder']);s=step(s,'investigate');
  for(const id of Object.keys(M.actions))s=step(s,'observe',id);
  assert.equal(M.remaining(s),2);assert.equal(s.actions.length,4);
  assert.equal(trial(s).phase,'result');
});
test('an exploratory trial can be run without collecting every clue, once per action',()=>{
  let s=step(M.fresh(),'start');s=trial(s,['signs'],'unknown');
  assert.equal(s.phase,'result');assert.equal(s.actions.length,0);assert.equal(s.trials.length,1);
  assert.equal(M.remaining(step(s,'trial')),6);
  assert.equal(step(M.fresh(),'trial').trials.length,0);
});
test('budget prevents overcommitment but permits several useful combinations',()=>{
  let s=step(step(M.fresh(),'start'),'plan');for(const p of ['helper','signs','preorder'])s=step(s,'toggle',p);
  assert.deepEqual(s.plan,['helper','signs']);assert.ok(M.cost(s.plan)<=M.BUDGET);
  for(const p of [['signs'],['signs','helper'],['signs','menu']])assert.ok(M.simulate(0,p).served>M.simulate(0).served);
});
test('the same plan is deterministic but its value changes when the bottleneck changes',()=>{
  assert.deepEqual(M.simulate(0,['signs']),M.simulate(0,['signs']));
  const weekday=M.simulate(0),weekend=M.simulate(1);
  assert.ok(M.simulate(0,['signs']).served-weekday.served>M.simulate(0,['helper']).served-weekday.served);
  assert.ok(M.simulate(1,['helper']).served-weekend.served>M.simulate(1,['signs']).served-weekend.served);
  assert.ok(M.simulate(0,['preorder']).workload>weekday.workload);
});
test('decisions and evidence survive reload; results are not trusted from imported scores',()=>{
  let s=step(M.fresh(),'start');s=step(s,'observe','orders');s=step(s,'pin','orders');s=trial(s);
  const loaded=M.normalize(JSON.parse(JSON.stringify({...s,score:999,trials:s.trials.map(t=>({...t,served:999}))})));
  assert.deepEqual(loaded,s);assert.equal(M.review(loaded).after.served,10);
  assert.match(M.review(loaded).process,/1 份相关证据/);
  assert.equal(M.review({...loaded,trials:loaded.trials.map(t=>({...t,pins:[]}))}).after.served,10);
  assert.match(M.review({...loaded,trials:loaded.trials.map(t=>({...t,pins:[]}))}).process,/还不能支持/);
});
test('completion needs a trial and reflection; another case keeps the installed legacy',()=>{
  let s=step(M.fresh(),'start');assert.equal(step(s,'finish').phase,'investigate');
  s=step(trial(s),'review');assert.equal(step(s,'finish').phase,'review');
  s=step(step(s,'reflect','uncertain'),'finish');assert.equal(s.phase,'complete');
  const next=step(s,'next');assert.equal(next.scenario,1);assert.equal(next.phase,'intro');
  assert.deepEqual(next.legacy.trial.plan,['signs']);assert.equal(next.trials.length,0);
  assert.equal(step(s,'observe','staff').actions.length,s.actions.length);
});
test('malformed imported case data is bounded and never spends beyond the action limit',()=>{
  const raw={version:1,scenario:99,phase:'complete',selected:999,actions:[...Object.keys(M.actions),'evil','orders'],hypothesis:'<script>',pins:['evil'],plan:['helper','preorder'],trials:Array(100).fill({plan:['signs'],seen:['evil','orders'],pins:['evil','orders'],hypothesis:'pickup'}),reflection:'keep'};
  const s=M.normalize(raw);assert.ok(M.remaining(s)>=0);assert.ok(s.trials.length<=3);assert.deepEqual(s.plan,[]);assert.equal(s.hypothesis,null);assert.deepEqual(s.pins,[]);
  assert.equal(s.selected,s.trials.length-1);assert.ok(s.trials.every(t=>!t.seen.includes('evil')));
  assert.equal(M.normalize({version:1,phase:'complete'}).phase,'investigate');
});
test('all affordable configurations produce causal, finite timelines and bounded outcomes',()=>{
  const ids=Object.keys(M.plans);
  for(let mask=0;mask<16;mask++)for(const scenario of [0,1]){
    const p=ids.filter((_,i)=>mask&(1<<i));if(M.cost(p)>M.BUDGET)continue;
    const r=M.simulate(scenario,p);assert.ok(r.served>=0&&r.served<=10);assert.ok(r.workload>=0&&r.workload<=100);
    for(const o of r.orders){assert.ok(o.ready>=o.ordered);assert.ok(o.pickup>=o.ready);assert.ok(o.leave>=o.arrival);assert.ok(Number.isFinite(o.wait)&&o.wait>=0);}
  }
});
test('spending the entire day on four exploratory trials survives a save round trip',()=>{
  let s=step(M.fresh(),'start');
  for(const p of ['preorder','menu','helper','signs'])s=trial(s,[p],'unknown');
  assert.equal(s.trials.length,4);assert.equal(M.remaining(s),0);
  assert.deepEqual(M.normalize(JSON.parse(JSON.stringify(s))),s);
  assert.equal(step(s,'plan').phase,'result');
});
test('time includes actual departures and declined menu items do not consume production',()=>{
  for(const scenario of [0,1]){
    const r=M.simulate(scenario,['menu']);
    assert.equal(r.wait,Math.round(r.orders.reduce((sum,o)=>sum+o.leave-o.arrival,0)) / 10);
    for(const o of r.orders.filter(o=>o.menuMiss)){
      assert.equal(o.served,false);assert.equal(o.ready,o.ordered);assert.ok(Math.abs(o.wait-.5)<.01);
    }
    const busy=r.orders.filter(o=>!o.menuMiss);
    for(let i=1;i<busy.length;i++)assert.ok(busy[i].prepStart>=busy[i-1].ready);
  }
});
