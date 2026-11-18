const test=require('node:test'),assert=require('node:assert/strict');
const F=require('../assets/world-framing.js');
test('outdoor walking starts high and bounds imported or extreme camera input',()=>{
  assert.deepEqual(F.walkView(),{radius:54,polar:.8,azimuth:.56});
  assert.equal(F.walkView({radius:9,polar:1.28}).radius,30);
  assert.equal(F.walkView({radius:9,polar:1.28}).polar,.9);
  assert.deepEqual(F.walkView({radius:NaN,polar:Infinity,azimuth:NaN}),F.walkView());
  assert.deepEqual(F.walkView({radius:61,polar:.7,azimuth:2}),{radius:61,polar:.7,azimuth:2});
});
test('labels avoid the mission panel, hero and previously placed labels across viewports',()=>{
  for(const screen of [{width:1440,height:1000},{width:390,height:844},{width:320,height:740}]){
    const occupied=[{x:12,y:12,width:Math.min(286,screen.width-24),height:142},{x:screen.width/2-20,y:screen.height/2-20,width:40,height:60}];
    for(const anchor of [{x:80,y:70},{x:screen.width/2,y:screen.height/2-25},{x:screen.width-20,y:screen.height-20}]){
      const p=F.placeLabel(anchor,{width:130,height:38},screen,occupied);
      assert.ok(p);assert.ok(occupied.every(r=>!F.overlaps(p,r,6)));
      assert.ok(p.x>=10&&p.y>=10&&p.x+p.width<=screen.width-10&&p.y+p.height<=screen.height-10);occupied.push(p);
    }
  }
});
test('offscreen objectives dock within the viewport without covering controls',()=>{
  const screen={width:390,height:844},controls=[{x:100,y:720,width:278,height:112}];
  for(const a of [{x:-900,y:400},{x:1900,y:500},{x:195,y:-800},{x:195,y:1600}]){
    const p=F.placeLabel(a,{width:160,height:40},screen,controls);assert.ok(p);assert.ok(!F.overlaps(p,controls[0],6));
    assert.ok(p.x>=10&&p.x+p.width<=380&&p.y>=10&&p.y+p.height<=834);
  }
});
test('a goal beside an actor stays nearby when its immediate label positions are crowded',()=>{
  const anchor={x:600,y:392},occupied=[{x:552,y:336,width:96,height:26},{x:580,y:373,width:40,height:49},{x:608,y:378,width:40,height:49}];
  const p=F.placeLabel(anchor,{width:124,height:40},{width:1200,height:794},occupied);
  assert.ok(p);assert.notEqual(p.side,'edge');assert.ok(occupied.every(r=>!F.overlaps(p,r,6)));
  assert.ok(Math.hypot(p.x+p.width/2-anchor.x,p.y+p.height/2-anchor.y)<140);
});
test('labels yield when there is no unobstructed space rather than covering a button',()=>{
  assert.equal(F.placeLabel({x:100,y:100},{width:150,height:40},{width:320,height:740},[{x:0,y:0,width:320,height:740}]),null);
});
test('camera chooses a clear character position when the task details occupy the center',()=>{
  const screen={width:390,height:844},panel={x:12,y:12,width:366,height:440},anchor=F.safeAnchor(screen,[panel]);
  assert.ok(anchor.y>480);assert.ok(!F.overlaps({x:anchor.x-35,y:anchor.y-35,width:70,height:70},panel,12));
  assert.deepEqual(F.safeAnchor(screen,[]),{x:195,y:422});
});
test('brief occlusion does not flicker, sustained obstruction reveals, and recovery is delayed',()=>{
  const s={blocked:0,clear:0,reveal:false};
  F.obstruction(s,true,.08);assert.equal(s.reveal,false);
  F.obstruction(s,false,.08);assert.equal(s.reveal,false);
  F.obstruction(s,true,.08);F.obstruction(s,true,.08);assert.equal(s.reveal,true);
  F.obstruction(s,false,.08);assert.equal(s.reveal,true);
  F.obstruction(s,true,.08);assert.equal(s.reveal,true);
  for(let i=0;i<3;i++)F.obstruction(s,false,.08);assert.equal(s.reveal,false);
});
