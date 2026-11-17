const test=require('node:test'),assert=require('node:assert/strict');
require('../assets/cafe-dialogue.js');require('../assets/cafe-case-state.js');
const M=PQCafeModel,D=PQCafeDialogue;
const start=()=>M.advance(M.fresh(),'start');
test('older saves keep their case progress and receive a safe conversation checkpoint',()=>{
  const old={...start(),actions:['orders'],hypothesis:'pickup'};delete old.dialogue;
  const loaded=M.normalize(old);
  assert.deepEqual(loaded.actions,['orders']);assert.equal(loaded.hypothesis,'pickup');
  assert.deepEqual(loaded.dialogue,{node:'hello',history:[]});
});
test('contextual questions collect evidence once and preserve the reply across reloads',()=>{
  let s=D.choose(start(),'recent');assert.equal(M.remaining(s),7);assert.equal(s.dialogue.node,'recent');
  s=D.choose(s,'place');assert.equal(D.current(s).stage,'counter');
  s=D.choose(s,'rush');s=D.choose(s,'app');s=D.choose(s,'recent');
  assert.equal(M.remaining(s),6);assert.deepEqual(s.actions,['recent','opinion']);
  assert.deepEqual(M.normalize(JSON.parse(JSON.stringify(s))),s);
  assert.ok(D.history(s).some(l=>l.speaker==='你'&&/站在哪/.test(l.text)));
});
test('evidence follow-up cannot be fabricated and does not charge for an existing order',()=>{
  const s=start();assert.deepEqual(D.choose(s,'compare'),s);
  const withOrder=M.advance(s,'observe','orders'),reply=D.choose(withOrder,'compare');
  assert.equal(reply.dialogue.node,'compare');assert.equal(M.remaining(reply),7);
  assert.match(D.current(reply).text,/走之前已经做好/);
  assert.equal(M.normalize({...reply,actions:[]}).dialogue.node,'hello');
});
test('conversation cannot consume the reserved trial or change a completed project',()=>{
  let s=start();s.trials=Array.from({length:3},()=>({plan:['signs'],seen:[],pins:[],hypothesis:'unknown',unknown:'sample'}));
  s=M.normalize(s);assert.equal(M.remaining(s),2);
  assert.deepEqual(D.choose(s,'recent'),s);assert.deepEqual(D.choose(s,'app'),s);
  const plan=M.advance(start(),'plan');assert.deepEqual(D.choose(plan,'recent'),plan);
});
test('changing scenario clears the conversation and uses the new physical cause',()=>{
  let s=D.choose(start(),'recent');s=M.advance(s,'plan');s=M.advance(s,'hypothesis','pickup');
  s=M.advance(s,'unknown','sample');s=M.advance(s,'toggle','signs');s=M.advance(s,'trial');
  s=M.advance(M.advance(M.advance(s,'review'),'reflect','keep'),'finish');
  s=M.advance(s,'next');assert.deepEqual(s.dialogue,{node:'hello',history:[]});
  s=D.choose(M.advance(s,'start'),'recent');assert.match(D.current(s).text,/还在冲上一单/);
});
test('imported dialogue IDs and history are bounded and cannot inject speech or actions',()=>{
  const s=M.normalize({...start(),dialogue:{node:'<script>',history:Array(80).fill({node:'hello',choice:'recent',text:'injected'})}});
  assert.equal(s.dialogue.node,'hello');assert.deepEqual(s.dialogue.history,[]);
  for(const node of ['__proto__','constructor','toString'])assert.equal(M.normalize({...s,dialogue:{node}}).dialogue.node,'hello');
  const valid=M.normalize({...s,actions:['recent'],dialogue:{node:'recent',history:Array(80).fill({node:'hello',choice:'recent',text:'injected'})}});
  assert.equal(valid.dialogue.history.length,24);assert.ok(D.history(valid).every(l=>!l.text.includes('injected')));
});
test('counter positions remain stable through follow-ups and evidence until exploration resumes',()=>{
  const vm=require('node:vm'),fs=require('node:fs');
  class Vector3{constructor(x,y,z){Object.assign(this,{x,y,z});}}
  const context={window:{},THREE:{Vector3},PQCafeModel:M,PQStory3D:{}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../assets/cafe-case-scene.js'),'utf8'),context);
  const scene=context.window.PQCafeScene;scene.active=true;scene.customers=[];
  scene.setView('talk','counter');const positions=[scene.playerGoal.z,scene.guestGoal.z];
  for(const view of ['talk','evidence','talk']){
    scene.setView(view,'guest');assert.equal(scene.stage,'counter');
    assert.deepEqual([scene.playerGoal.z,scene.guestGoal.z],positions);
  }
  scene.setView('explore','guest');scene.setView('talk','guest');
  assert.equal(scene.stage,'guest');assert.equal(scene.atCounter,false);
});
