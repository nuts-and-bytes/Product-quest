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
