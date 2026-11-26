const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../assets/mobile-play.js');
test('short landscape sizing follows usable viewport rather than device name',()=>{
  for(const [w,h] of [[844,390],[667,375],[568,320],[932,430]])assert.equal(M.landscape(w,h),true);
  for(const [w,h] of [[390,844],[320,740],[1024,768],[390,390]])assert.equal(M.landscape(w,h),false);
});
test('unavailable or denied fullscreen does not request an orientation lock',async()=>{
  let calls=0;const orientation={lock:()=>{calls++;}};
  for(const doc of [{documentElement:{}},{fullscreenEnabled:false,documentElement:{requestFullscreen(){throw Error('denied');}}},{documentElement:{requestFullscreen(){return Promise.reject(Error('denied'));}}}])assert.deepEqual(await M.enter(doc,orientation),{fullscreen:false,locked:false});
  assert.equal(calls,0);
});
test('fullscreen is established before the optional landscape lock',async()=>{
  const events=[],doc={documentElement:{async requestFullscreen(){events.push('fullscreen');doc.fullscreenElement=this;}}};
  const result=await M.enter(doc,{async lock(value){assert.ok(doc.fullscreenElement);events.push(value);}});
  assert.deepEqual(result,{fullscreen:true,locked:true});assert.deepEqual(events,['fullscreen','landscape']);
});
test('orientation rejection leaves successful fullscreen usable',async()=>{
  const doc={fullscreenElement:{},documentElement:{requestFullscreen(){assert.fail('already fullscreen');}}};
  assert.deepEqual(await M.enter(doc,{async lock(){throw Error('unsupported');}}),{fullscreen:true,locked:false});
  assert.deepEqual(await M.enter(doc,{}),{fullscreen:true,locked:false});
});
test('a resolved request without an actual fullscreen element never claims success',async()=>{
  let locked=false;const doc={documentElement:{async requestFullscreen(){}}};
  assert.deepEqual(await M.enter(doc,{lock(){locked=true;}}),{fullscreen:false,locked:false});assert.equal(locked,false);
});
test('touch players can reach immersion help with no fullscreen API',()=>{
  const doc={documentElement:{},fullscreenEnabled:false};
  assert.equal(M.buttonMode(doc,true,false),'help');
  assert.equal(M.buttonMode(doc,true,true),'');
  assert.equal(M.buttonMode(doc,false,false),'');
});
test('the immersion action reflects actual fullscreen and legacy browser support',()=>{
  const doc={documentElement:{webkitRequestFullscreen(){}},webkitFullscreenEnabled:true};
  assert.equal(M.buttonMode(doc,true,false),'enter');
  doc.webkitFullscreenEnabled=false;
  assert.equal(M.buttonMode(doc,true,false),'help');
  doc.webkitFullscreenElement=doc.documentElement;
  assert.equal(M.buttonMode(doc,false,false),'exit');
});
test('iPhone immersion help gives an actionable path out of WeChat',()=>{
  assert.match(M.fullscreenHelp('iPhone MicroMessenger'),/微信右上角.*在浏览器打开.*Safari.*添加到主屏幕/);
  assert.match(M.fullscreenHelp('iPhone Safari'),/Safari.*共享.*添加到主屏幕.*作为网页 App 打开/);
  assert.match(M.fullscreenHelp('Android MicroMessenger'),/微信右上角.*在浏览器打开/);
});
test('the first finger moves from its own starting point anywhere on the scene',()=>{
  for(const [x,y] of [[86,185],[812,190],[480,42]]){
    const stick=new M.FloatingJoystick();
    assert.equal(stick.start(7,x,y),'move');
    assert.deepEqual(stick.update(7,x,y,30),{role:'move',x:0,z:0});
    assert.deepEqual(stick.update(7,x,y-45,30),{role:'move',x:0,z:-1});
    assert.equal(stick.end(7),'move');
    assert.equal(stick.update(7,x,y-45,30),null);
  }
});
test('a second finger rotates independently without moving or becoming a tap',()=>{
  const stick=new M.FloatingJoystick();
  assert.equal(stick.start(3,380,150),'move');
  assert.equal(stick.start(4,120,170),'look');
  assert.equal(stick.start(5,700,200),null);
  assert.deepEqual(stick.update(4,148,153,30),{role:'look',dx:28,dy:-17});
  assert.equal(stick.end(3),'move');
  assert.deepEqual(stick.update(4,150,157,30),{role:'look',dx:2,dy:4});
  assert.equal(stick.start(6,600,200),'move');
  assert.equal(stick.end(6),'move');
  assert.equal(stick.end(4),'look');
});
test('short taps are distinct from returning to center and from cancelled input',()=>{
  const stick=new M.FloatingJoystick();
  stick.start(1,600,200);
  assert.deepEqual(stick.update(1,602,199,30),{role:'move',x:0,z:0});
  assert.equal(stick.end(1),'tap');
  stick.start(2,600,200);
  stick.update(2,632,200,30);
  stick.update(2,600,200,30);
  assert.equal(stick.end(2),'move');
  stick.start(3,600,200);
  assert.equal(stick.end(3,true),'move');
  stick.start(4,600,200);
  stick.start(5,300,180);
  stick.reset();
  assert.equal(stick.end(4),null);
  assert.equal(stick.end(5),null);
});
