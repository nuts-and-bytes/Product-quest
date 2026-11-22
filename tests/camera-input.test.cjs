const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const framing = require('../assets/world-framing');

function controls(savedMode) {
  const handlers = {};
  const window = {addEventListener() {}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../assets/camera-input'), 'utf8'), {
    window, navigator:{platform:'MacIntel'}, localStorage:{getItem:()=>savedMode},
    document:{querySelector:()=>null}, PQWorldFraming:framing,
  });
  const world = {
    mode:'orbit', camera:{aspect:1}, spherical:{radius:50,polar:.8,azimuth:.4},
    rememberWalkView(){}, _panByScreenDelta(x,z){this.pan=[x,z];},
    fpYaw:0,fpPitch:0,
  };
  window.PQCameraInput.bind({addEventListener:(name,fn)=>{handlers[name]=fn;}},world);
  function wheel(x,y,pinch=false){
    handlers.wheel({deltaX:x,deltaY:y,deltaMode:0,ctrlKey:pinch,preventDefault(){}});
  }
  return {world,wheel,handlers};
}

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
test('mouse wheel keeps zooming and a Safari pinch is applied once',()=>{
  const {world,wheel,handlers}=controls('mouse');
  wheel(0,30);assert.ok(world.spherical.radius>50);
  const before=world.spherical.radius;
  handlers.gesturestart({scale:1,preventDefault(){}});
  wheel(0,-20,true);assert.equal(world.spherical.radius,before);
  handlers.gesturechange({scale:1.5,preventDefault(){}});
  assert.ok(Math.abs(world.spherical.radius - before / 1.5) < 1e-8);
});
