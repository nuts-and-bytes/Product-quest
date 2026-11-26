const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const framing = require('../assets/world-framing');

function controls(savedMode, coarse = false) {
  const handlers = {};
  const inputHandlers = {};
  const dataset = {};
  const pointer = {matches:coarse, addEventListener:(name, fn)=>{inputHandlers[name]=fn;}};
  const window = {addEventListener:(name, fn)=>{inputHandlers[name]=fn;}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../assets/camera-input'), 'utf8'), {
    window, navigator:{platform:'MacIntel'}, localStorage:{getItem:()=>savedMode},
    document:{querySelector:()=>null, documentElement:{dataset}}, PQWorldFraming:framing,
    matchMedia:()=>pointer,
  });
  const world = {
    mode:'orbit', camera:{aspect:1}, spherical:{radius:50,polar:.8,azimuth:.4},
    rememberWalkView(){}, _panByScreenDelta(x,z){this.pan=[x,z];},
    fpYaw:0,fpPitch:0, followView:{radius:7.2,polar:1.26,azimuth:.4},
  };
  window.PQCameraInput.bind({addEventListener:(name,fn)=>{handlers[name]=fn;}},world);
  function wheel(x,y,pinch=false){
    handlers.wheel({deltaX:x,deltaY:y,deltaMode:0,ctrlKey:pinch,preventDefault(){}});
  }
  return {world,wheel,handlers,inputHandlers,dataset,cameraInput:window.PQCameraInput};
}

test('island hints follow actual input while preserving the trackpad preference',()=>{
  const {inputHandlers, dataset, cameraInput} = controls('trackpad');
  assert.equal(dataset.islandInput, 'desktop');
  inputHandlers.pointerdown({pointerType:'touch'});
  assert.equal(dataset.islandInput, 'touch');
  inputHandlers.keydown({key:'w'});
  assert.equal(dataset.islandInput, 'desktop');
  inputHandlers.pointerdown({pointerType:'touch'});
  inputHandlers.wheel();
  assert.equal(dataset.islandInput, 'desktop');
  assert.equal(cameraInput.trackpad, true);
});

test('island hints start with touch on a coarse primary pointer and respond to a mouse',()=>{
  const {inputHandlers, dataset} = controls('mouse', true);
  assert.equal(dataset.islandInput, 'touch');
  inputHandlers.pointerdown({pointerType:'mouse'});
  assert.equal(dataset.islandInput, 'desktop');
});

test('trackpad scroll moves the map without changing scale, pinch changes only scale',()=>{
  const {world,wheel}=controls(null);
  wheel(31,22);
  assert.deepEqual(world.pan,[-31,-22]);
  assert.equal(world.spherical.radius,50);
  wheel(0,-20,true);
  assert.ok(world.spherical.radius<50);
  assert.deepEqual(world.pan,[-31,-22]);
});
test('walking, detached view, and first person interpret the same scroll in context',()=>{
  const {world,wheel}=controls('trackpad');
  world.mode='walk';wheel(10,12);
  assert.ok(world.spherical.azimuth>.4);
  assert.equal(world.spherical.radius,50);
  const angle=world.spherical.azimuth;
  world.detachedFollow=true;wheel(4,8);
  assert.deepEqual(world.pan,[-4,-8]);assert.equal(world.spherical.azimuth,angle);
  world.detachedFollow=false;world.mode='fp';wheel(12,20);
  assert.ok(world.fpYaw>0 && world.fpPitch>0);
  wheel(0,25,true);assert.equal(world.spherical.radius,50);
});
test('character follow inputs orbit and zoom through their own camera state',()=>{
  const {world,wheel}=controls('trackpad');
  world.mode='follow';
  wheel(14,20);
  assert.ok(world.followView.azimuth>.4);
  assert.ok(world.followView.polar>1.26);
  wheel(0,-20,true);
  assert.ok(world.followView.radius<7.2);
  assert.deepEqual(world.spherical,{radius:50,polar:.8,azimuth:.4});
});
test('mouse wheel keeps zooming and a Safari pinch is applied once',()=>{
  const {world,wheel,handlers}=controls('mouse');
  wheel(0,30);assert.ok(world.spherical.radius>50);
  const before=world.spherical.radius;
  handlers.gesturestart({scale:1,preventDefault(){}});
  wheel(0,-20,true);assert.equal(world.spherical.radius,before);
  handlers.gesturechange({scale:1.5,preventDefault(){}});
  assert.ok(Math.abs(world.spherical.radius - before / 1.5) < 1e-8);
});

test('Safari gestures cannot zoom while fingers are operating the floating controls',()=>{
  const {world,handlers}=controls('trackpad',true);
  world.mode='follow';
  world.floatingJoystick={move:{id:1},look:{id:2}};
  const before=world.followView.radius;
  let prevented=0;
  handlers.gesturestart({scale:1,preventDefault(){prevented++;}});
  handlers.gesturechange({scale:1.4,preventDefault(){prevented++;}});
  assert.equal(world.followView.radius,before);
  assert.equal(prevented,2);
});
