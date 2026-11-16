const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
require('../assets/world-map.js');require('../assets/chapter-progress.js');require('../assets/world-quality.js');
const ctx={PQWorldMap:global.PQWorldMap,PQ:{sprites:{},buildings:[],pains:[],levels:[],terms:{},notes:{},cases:[]}};
for(const f of ['world.js',...fs.readdirSync(path.join(__dirname,'../content/pm')).filter(f=>/^ch\d/.test(f)).sort().map(f=>'pm/'+f)])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../content',f),'utf8'),ctx);
const {levels,milestones,buildings}=ctx.PQ,C=global.PQChapterProgress;
test('only a completed chapter boss unlocks its building legacy',()=>{
 const boss=levels.findIndex(l=>l.id==='boss'),cafe=buildings.find(b=>b.id==='cafe');
 assert.equal(C.forBuilding(cafe,C.chapters(levels,milestones,boss))[0].complete,false);
 assert.equal(C.forBuilding(cafe,C.chapters(levels,milestones,boss+1))[0].complete,true);
 assert.equal(C.forBuilding(buildings.find(b=>b.id==='home'),C.chapters(levels,milestones,boss+1)).some(c=>c.complete),false);
});
test('existing final saves unlock all nine chapter legacies and all story buildings',()=>{
 const chapters=C.chapters(levels,milestones,levels.length);
 assert.equal(chapters.length,9);assert.ok(chapters.every(c=>c.complete));
 assert.equal(new Set(chapters.flatMap(c=>c.levels.map(l=>l.id))).size,levels.length);
 for(const b of buildings.filter(b=>b.levels))assert.ok(C.forBuilding(b,chapters).some(c=>c.complete),b.id);
});
function frames(g,ms,count){let changes=[];for(let i=0;i<count;i++){const t=g.sample(ms);if(t!==null)changes.push(t);}return changes;}
test('sustained slow frames reduce effects, with hysteresis before recovery',()=>{
 const g=new PQQualityGovernor(2);assert.deepEqual(frames(g,28,220),[1]);
 assert.deepEqual(frames(g,16.67,1000),[]);assert.equal(g.tier,1);
 assert.ok(frames(g,16.67,1000).includes(2));
});
test('background pauses and one-off compilation stalls do not reduce quality',()=>{
 const g=new PQQualityGovernor(2);frames(g,16.67,180);g.sample(1200);g.sample(80,false);
 frames(g,16.67,360);assert.equal(g.tier,2);
});

test('severe sustained foreground stalls also lower quality',()=>{
 const g=new PQQualityGovernor(2);assert.equal(g.sample(400),null);assert.equal(g.sample(400),null);assert.equal(g.sample(400),1);
});
