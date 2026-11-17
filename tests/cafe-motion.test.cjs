const test=require('node:test'),assert=require('node:assert/strict');
require('../assets/cafe-motion.js');
const {Motion}=PQCafeMotion;
const advance=(m,seconds)=>{for(let t=0;t<seconds;t+=.01)m.advance(.01);};
function talking(){const m=new Motion();m.begin('explore','guest');m.begin('talk','guest','recent');m.finish();return m;}
test('the guide starts before the follower and dialogue waits until both reach the counter',()=>{
  const m=talking();m.begin('talk','counter','counter');advance(m,.36);
  assert.ok(m.movement('guest')>0);assert.equal(m.movement('player'),0);assert.equal(m.pending,true);
  advance(m,1.2);assert.equal(m.pending,false);assert.ok(m.movement('player')>.99);
  advance(m,1);assert.equal(m.active,false);assert.equal(m.movement('guest'),1);
});
test('a new action replaces choreography without queuing a stale reveal',()=>{
  const m=talking();m.begin('talk','counter','counter');advance(m,.3);
  m.finish();m.begin('evidence','counter','counter','orders');advance(m,.3);
  assert.equal(m.view,'evidence');assert.equal(m.pending,false);
  m.begin('talk','counter','rush');advance(m,2);
  assert.equal(m.view,'talk');assert.equal(m.node,'rush');assert.equal(m.kind,'return');
});
test('UI rerenders never replay a gesture or restart a delayed arrival',()=>{
  const m=talking();m.begin('talk','counter','counter');advance(m,.6);
  const elapsed=m.elapsed;assert.equal(m.begin('talk','counter','counter'),false);
  assert.equal(m.elapsed,elapsed);
  m.finish();m.begin('talk','counter','rush');assert.equal(m.kind,'reply');assert.equal(m.pending,false);
});
test('reopening the same evidence shortens its arrival without advancing the story',()=>{
  const m=talking();m.begin('evidence','guest','recent','orders');const first=m.revealAt;
  m.finish();m.begin('talk','guest','recent');m.finish();m.begin('evidence','guest','recent','orders');
  assert.ok(m.revealAt<first);assert.equal(m.node,'recent');assert.equal(m.stage,'guest');
});
test('reduced motion and skip settle both actor and camera transitions immediately',()=>{
  const m=talking();m.begin('talk','counter','counter','',true);
  assert.equal(m.pending,false);assert.equal(m.active,false);assert.equal(m.movement('player'),1);assert.equal(m.camera(),1);
  m.begin('explore','guest');assert.equal(m.pending,true);m.finish();assert.equal(m.pending,false);assert.equal(m.camera(),1);
  m.begin('talk','guest','hello');m.advance(.01,true);assert.equal(m.active,false);
});
test('resuming from a stalled tab cannot jump through the entire walking sequence',()=>{
  const m=talking();m.begin('talk','counter','counter');m.advance(20);
  assert.equal(m.movement('player'),0);assert.equal(m.pending,true);
  advance(m,3);assert.equal(m.active,false);
});

test('short returns and evidence transitions settle smoothly before their last frame',()=>{
  const m=talking();
  for(const [view,detail] of [['evidence','orders'],['talk',''],['explore','']]){
    m.begin(view,'guest','recent',detail);
    advance(m,m.duration-.02);
    assert.ok(m.camera()>.99);assert.ok(m.movement('player')>.99);
    m.finish();
  }
});
