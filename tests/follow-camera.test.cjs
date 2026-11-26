const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function sceneWithCameraBlockers() {
  const context = vm.createContext({window:{}, PQWorldFraming:require('../assets/world-framing')});
  for (const src of ['three.min', 'world-visibility']) {
    vm.runInContext(fs.readFileSync(require.resolve('../assets/' + src), 'utf8'), context);
    context.THREE = context.window.THREE;
  }
  const {THREE:T} = context;
  const scene = new T.Scene();
  const wall = new T.Mesh(new T.BoxGeometry(2,4,1),new T.MeshStandardMaterial());
  wall.position.set(0,2,-4);
  wall.userData.pqOccluder = true;
  scene.add(wall);
  const terrain = new T.Box3(new T.Vector3(2,0,-5),new T.Vector3(4,4,-3));
  const world = {scene,followTerrain:[terrain]};
  const visibility = new context.window.PQWorldVisibility(world);
  return {T,visibility};
}

test('follow ray stops before a wall and behind tall terrain without treating water as a blocker',()=>{
  const {T,visibility} = sceneWithCameraBlockers();
  assert.equal(visibility.followBlockerDistance(new T.Vector3(0,2,0),new T.Vector3(0,2,-7)),3.5);
  assert.equal(visibility.followBlockerDistance(new T.Vector3(3,2,0),new T.Vector3(3,2,-7)),3);
  assert.equal(visibility.followBlockerDistance(new T.Vector3(5,2,0),new T.Vector3(5,2,-7)),Infinity);
});

test('camera effects expire while following so a late switch cannot replay stale shake',()=>{
  const context = vm.createContext({window:{}, PQWorldFraming:require('../assets/world-framing')});
  vm.runInContext(fs.readFileSync(require.resolve('../assets/three.min'), 'utf8'), context);
  const T = context.THREE = context.window.THREE;
  vm.runInContext(fs.readFileSync(require.resolve('../assets/island3d'), 'utf8'), context);
  const world = context.window.PQIsland;
  world.camera = new T.PerspectiveCamera(45, 1, .25, 900);
  world.renderer = {domElement:{getBoundingClientRect:()=>({width:932,height:313})}};
  world.playerPos = new T.Vector3(0, 1.04, 0);
  world.environment = {reducedMotion:false};
  world.visibility = {followBlockerDistance:()=>Infinity,frame(){}};
  world.mode = 'follow';
  world.cinematicMode = null;
  world.addTrauma(.3);
  for(let frame=0;frame<20;frame++)world._updateCamera(.025, frame*25, frame*.025);
  assert.equal(world._trauma,0);
});
