const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
require('../assets/world-map.js');
const W=global.PQWorldMap;
const context={PQWorldMap:W,PQ:{sprites:{},buildings:[],pains:[]}};
vm.runInNewContext(fs.readFileSync(require.resolve('../content/world.js'),'utf8'),context);
const buildings=context.PQ.buildings;
test('all three islands are reachable from the original spawn and back',()=>{
  const spawn={x:-10.5,z:4.5};
  for(const r of W.regions){
    const goal={x:r.x,z:r.z};
    for(const [a,b] of [[spawn,goal],[goal,spawn]]){
      const path=W.findPath(a,b,buildings);
      assert.ok(path&&path.length>10,r.id+' has a continuous path');
      for(const p of path)assert.ok(W.canWalk(p.x,p.z,buildings));
    }
  }
});
test('water, buildings, fountains and beacon pedestals block movement',()=>{
  for(const p of [[48,40],[0,0],[-13,12],[-21,-16],[65,-38],[NaN,0]])assert.equal(W.canWalk(...p,buildings),false);
  assert.equal(W.findPath({x:-10.5,z:4.5},{x:48,z:40},buildings),null);
});
test('every original story entrance remains reachable',()=>{
  for(const b of buildings){
    const goal={x:b.wx+b.doorOffset[0],z:b.wz+b.doorOffset[1]};
    assert.ok(W.findPath({x:-10.5,z:4.5},goal,buildings),b.name);
  }
});
