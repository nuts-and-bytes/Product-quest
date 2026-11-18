const test=require('node:test'),assert=require('node:assert/strict'),N=require('../assets/cafe-navigation.js');
const people=[{x:1.5,z:1.5,r:.45},{x:-4.8,z:1.8,r:.45}],obstacles=[...N.base,...people];
test('all café destinations are reachable without crossing furniture',()=>{
 const start={x:-1.65,z:2.05};for(const to of [{x:-.1,z:1.55},{x:-6.15,z:1.8},{x:.15,z:-2.15},{x:-2,z:.15},{x:3.2,z:5.5},{x:1.8,z:-2.15}]){const path=N.path(start,to,obstacles);assert.ok(path.length,JSON.stringify(to));let from=start;for(const next of path){assert.ok(N.clear(from,next,obstacles),'route stays outside table/chair radius');from=next;}assert.ok(N.dist(from,to)<.01);}
});
test('shared table and seated guest still allow travel between both sides of room',()=>{
 const busy=[...obstacles,{x:-1,z:2.3,r:.7},{x:-.6,z:3.65,w:.75,d:.75},{x:-.6,z:3.65,r:.4}];
 const points=[{x:3.2,z:5.5},{x:-6.15,z:1.8},{x:.15,z:-2.15},{x:.3,z:2.3}];for(const a of points)for(const b of points){const path=N.path(a,b,busy);assert.ok(path.length);let from=a;for(const next of path){assert.ok(N.clear(from,next,busy));from=next;}}
});
test('manual movement slides along obstacles and cannot tunnel after a long frame',()=>{
 let p={x:0,z:-2.35};for(let i=0;i<100;i++){p=N.move(p,{x:1,z:-1},5,obstacles);assert.ok(N.free(p,obstacles));}
 const start={x:0,z:4};assert.ok(N.dist(start,N.move(start,{x:1,z:0},100,[]))<=.136);
 assert.equal(N.dist(start,N.move(start,{x:1,z:1},.02,[])).toFixed(5),N.dist(start,N.move(start,{x:1,z:0},.02,[])).toFixed(5));
});
test('clicks inside props resolve to a nearby floor point, outside walls remain bounded',()=>{
 const p=N.nearest({x:-3.8,z:1.5},obstacles);assert.ok(p&&N.free(p,obstacles));assert.deepEqual(N.path({x:0,z:4},{x:100,z:100},obstacles),[]);assert.equal(N.free({x:NaN,z:0}),false);
});
