const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
require('../content/pm/island-chapters.js');require('../assets/chapter-journey-state.js');require('../assets/world-map.js');require('../assets/chapter-progress.js');
const M=PQChapterJourney;
const ctx={PQWorldMap,PQ:{sprites:{},buildings:[],pains:[],levels:[],terms:{},notes:{},cases:[]}};
for(const f of ['world.js',...fs.readdirSync(path.join(__dirname,'../content/pm')).filter(f=>/^ch\d/.test(f)).sort().map(f=>'pm/'+f)])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../content',f),'utf8'),ctx);
const good={1:{tool:'envelope',setup:'together'},2:{journey:['payday','shopping','monthend'],moment:'payday',effort:'short'},3:{flow:['review','confirm','receipt'],exit:'edit',failure:'explain'},4:{identity:'same',state:'receipt'},5:{response:['pause','rollback','explain'],scope:'pilot',guard:'ready'},6:{group:'returning',intervention:'payday'},7:{price:'5',access:'keep',consent:'optin'},8:{source:'records',ending:'next'}};
function plan(s,id,p){const c=M.def(id);if(c.sequence){s=M.advance(s,id,'arrange','reset',8);for(const item of p[c.sequence.id])s=M.advance(s,id,'arrange',item,8);}for(const slot of c.slots)s=M.advance(s,id,'choose',{slot:slot.id,value:p[slot.id]},8);return s;}
function complete(s,id,p=good[id]){s=plan(s,id,p);s=M.advance(s,id,'run',null,8);s=M.advance(s,id,'reflect','uncertain',8);return M.advance(s,id,'complete',null,8);}
test('new journey keeps the original save separate and gates the next chapter on a real trial and reflection',()=>{
 const old={progress:12,trust:67,unlocked:['mvp']},before=JSON.stringify(old),s=M.normalize(old.campaign);
 assert.equal(JSON.stringify(old),before);assert.equal(M.available(s,'2'),false);assert.equal(M.available(s,'1'),true);
 let n=M.advance(s,'1','complete');assert.equal(n.records['1'].committed,null);
 n=plan(n,'1',good[1]);n=M.advance(n,'1','run');n=M.advance(n,'1','complete');assert.equal(n.records['1'].committed,null);
 n=M.advance(n,'1','reflect','change');n=M.advance(n,'1','complete');assert.equal(M.available(n,'2'),true);assert.equal(M.available(n,'3'),false);
});
test('every chapter has reachable story places, real practice entries and valid evidence references',()=>{
 assert.equal(M.chapters.length,8);
 for(const c of M.chapters){assert.ok(ctx.PQ.buildings.some(b=>b.id===c.building),c.id);assert.ok(ctx.PQ.levels.some(l=>l.id===c.chapterStart),c.id);assert.equal(c.clues.length,3);for(const n of c.npcs)for(const t of n.topics)assert.ok(c.clues.some(e=>e.id===t.evidence),t.id);}
});
test('all eight chapters can be completed and the final report contains actual earlier decisions',()=>{
 let s=M.normalize();for(const c of M.chapters){assert.ok(M.available(s,c.id));s=complete(s,c.id);assert.ok(s.records[c.id].committed,'chapter '+c.id);assert.ok(M.result(s,c.id).good,'good route '+c.id);s=M.normalize(JSON.parse(JSON.stringify(s)));}
 assert.equal(M.result(s,'8').metrics[0].value,7);assert.equal(M.evidence('8','history',s).body.length,7);
 const report=M.report(s);assert.equal((report.match(/## 第 /g)||[]).length,8);assert.match(report,/未经|固定模拟/);assert.match(report,/信封/);
});
test('a failed experiment can continue without fabricating success; later practice cannot rewrite the committed past',()=>{
 let s=complete(M.normalize(),'1',{tool:'ledger',setup:'alone'});assert.equal(M.result(s,'1').good,false);assert.ok(M.available(s,'2'));
 const committed=JSON.stringify(s.records['1'].committed),report=M.report(s);
 for(let i=0;i<5;i++){s=plan(s,'1',good[1]);s=M.advance(s,'1','run');s=M.advance(s,'1','reflect','keep');s=M.advance(s,'1','complete');}
 assert.equal(s.records['1'].trials.length,3);assert.equal(JSON.stringify(s.records['1'].committed),committed);assert.equal(M.report(s),report);assert.equal(M.result(s,'1',s.records['1'].committed).good,false);
});
test('saving a conversation, partial sequence and selected result resumes without duplicate evidence',()=>{
 let s=M.normalize(),c=M.def('2');s=M.advance(s,'2','talk',c.npcs[1].key,8);s=M.advance(s,'2','topic',c.npcs[1].topics[0].id,8);s=M.advance(s,'2','topic',c.npcs[1].topics[0].id,8);
 assert.equal(s.records['2'].notes.length,1);s=M.advance(s,'2','arrange','payday',8);s=M.normalize(JSON.parse(JSON.stringify(s)));assert.deepEqual(s.records['2'].plan.journey,['payday']);assert.equal(s.records['2'].view,'talk');
 s=plan(s,'2',good[2]);s=M.advance(s,'2','run',null,8);s=M.advance(s,'2','reflect','keep',8);s=M.normalize(s);assert.equal(s.records['2'].reflection,'keep');assert.equal(s.records['2'].selected,0);
});
test('legacy checkpoints unlock matching chapters without inventing any new choices',()=>{
 for(const [id,n] of [['boss',2],['uboss',3],['eboss',4],['tboss',5],['lboss',6],['gboss',7],['bboss',8]]){const i=ctx.PQ.levels.findIndex(l=>l.id===id);assert.equal(M.legacyLimit(i,ctx.PQ.levels),n-1);assert.equal(M.legacyLimit(i+1,ctx.PQ.levels),n);}
 const s=M.normalize();assert.ok(M.available(s,'8',M.legacyLimit(37,ctx.PQ.levels)));assert.equal(M.evidence('8','history',s).body.length,1);assert.equal(M.result(plan(s,'8',good[8]),'8'),null);
});
test('malformed imports cannot insert script, scores, duplicate sequence cards or unlimited history',()=>{
 const raw={current:'evil',records:{1:{notes:['evil','envelope','envelope'],plan:{tool:'envelope',setup:'together'},trials:Array(10).fill({plan:good[1],notes:[],score:99999}),focus:{npc:'evil',topic:'evil'},committed:{plan:good[1],reflection:'invented'},view:'<script>'},2:{plan:{...good[2],journey:['payday','payday','evil']}}}};
 const s=M.normalize(raw);assert.equal(s.current,'1');assert.equal(s.records['1'].trials.length,3);assert.equal(s.records['1'].focus,null);assert.equal(s.records['1'].committed,null);assert.equal(s.records['1'].view,'explore');assert.equal(M.ready(M.def('2'),s.records['2'].plan),false);assert.equal(s.records['1'].trials[0].score,undefined);
 assert.equal(M.ready(M.def('2'),{...good[2],journey:['payday','payday','payday']}),false);
});
test('technical retries, incident order, cohort selection and payment consent have concrete different consequences',()=>{
 assert.equal(M.simulate('4',good[4]).metrics[0].value,1);assert.equal(M.simulate('4',{identity:'new',state:'retry'}).metrics[0].value,2);
 assert.ok(M.simulate('5',{...good[5],response:[...good[5].response].reverse(),guard:'later'}).metrics[2].value>M.simulate('5',good[5]).metrics[2].value);
 assert.equal(M.simulate('6',good[6]).metrics[0].value,8);assert.equal(M.simulate('6',{...good[6],group:'new'}).metrics[0].value,52);
 assert.equal(M.simulate('6',{...good[6],group:'new'}).good,false);assert.match(M.simulate('6',{...good[6],group:'all'}).line,/拆开/);
 assert.equal(M.simulate('7',{...good[7],consent:'checked'}).metrics[2].value,'未确认');assert.equal(M.simulate('7',good[7]).metrics[2].value,8);
});
test('new completed chapters light building legacies without modifying old level progress',()=>{
 const s=complete(M.normalize(),'1'),chapters=PQChapterProgress.chapters(ctx.PQ.levels,ctx.PQ.milestones,0,s);
 assert.equal(chapters.find(c=>c.id==='m1').complete,true);assert.equal(chapters.find(c=>c.id==='m2').complete,false);assert.equal(chapters[0].complete,false);
});
test('every offered plan and card order has deterministic, finite consequences',()=>{
 const permute=a=>a.length?a.flatMap((v,i)=>permute(a.filter((_,j)=>i!==j)).map(p=>[v,...p])):[[]];let checked=0;
 for(const c of M.chapters){let plans=[{}];for(const slot of c.slots)plans=plans.flatMap(p=>slot.options.map(o=>({...p,[slot.id]:o.id})));if(c.sequence)plans=plans.flatMap(p=>permute(c.sequence.items.map(i=>i.id)).map(order=>({...p,[c.sequence.id]:order})));
  for(const p of plans){const a=M.simulate(c.id,p,M.normalize()),b=M.simulate(c.id,p,M.normalize());assert.deepEqual(a,b);assert.ok(a&&a.events.length&&a.metrics.length,c.id);for(const m of a.metrics)if(typeof m.value==='number')assert.ok(Number.isFinite(m.value),c.id);checked++;}
 }assert.ok(checked>100);
});
test('every original lesson still resolves to an authored 3D room',()=>{
 const sandbox={THREE:{},window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/chapter-rooms.js'),'utf8'),sandbox);const rooms=sandbox.window.PQChapterRooms;
 assert.equal(ctx.PQ.levels.length,37);for(const lv of ctx.PQ.levels){const room=rooms.forLevel(lv);assert.ok(['cafe','office'].includes(room)||rooms.supports(room),lv.id);}
 assert.equal(rooms.forLevel(ctx.PQ.levels.find(l=>l.id==='fend')),'roof');
});
test('a café callback uses the installed story outcome instead of later uncommitted practice',()=>{
 require('../assets/cafe-case-state.js');const s=M.normalize(),cafe={scenario:0,selected:0,trials:[{plan:[]}],legacy:{scenario:0,trial:{plan:['signs']}}};
 const remembered=M.recall('4',s,{},cafe);cafe.trials=[{plan:['preorder']}];assert.equal(M.recall('4',s,{},cafe),remembered);
 const served=PQCafeModel.simulate(0,['signs']).orders[0].served;assert.ok(remembered.includes(served?'拿到':'空手'));
});
test('imported prototype property names are not reflection choices',()=>{
 const s=M.normalize({records:{1:{committed:{plan:good[1],notes:[],reflection:'constructor'},reflection:'__proto__'}}});
 assert.equal(s.records['1'].committed,null);assert.equal(s.records['1'].reflection,null);assert.equal(M.advance(s,'1','reflect','toString').records['1'].reflection,null);
});
