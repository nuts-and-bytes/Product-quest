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
