import assert from 'node:assert/strict';
const sample=async page=>page.evaluate(()=>new Promise(resolve=>{
 const times=[];let last=0,warm=40;const frame=now=>{if(last&&warm<=0)times.push(now-last);last=now;warm--;if(times.length<160)requestAnimationFrame(frame);else{const sorted=times.slice().sort((a,b)=>a-b);resolve({fps:1000/(times.reduce((a,b)=>a+b)/times.length),p95:sorted[Math.floor(sorted.length*.95)],frames:times.length,tier:PQIsland.environment.tier,memory:{...PQIsland.renderer.info.memory},programs:PQIsland.renderer.info.programs.length});}};requestAnimationFrame(frame);
}));
const prepare=async(page,port)=>{
 await page.goto(`http://127.0.0.1:${port}/?player=cafe-39-performance`);await page.waitForFunction(()=>window.G?.firstDay&&PQIsland.environment);
 await page.evaluate(()=>{const w=PQIsland;G.firstDay.stage='complete';G.firstDay.paused=false;G.toMap();PQFirstDay.closeDialog();w.environment.setQuality('cinema',false);w.timeMode='day';w._initTodState();w._updateTimeOfDay(0,performance.now()/1000);w.playerPos.set(-6,1.04,3.44);w.playerRig.group.position.copy(w.playerPos);w.setMode('walk');w.diveAnim=null;w.recentre(true);Object.assign(w.spherical,{radius:54,polar:.8,azimuth:.56});Object.assign(w.curSpherical,w.spherical);w.cinematicMode=null;});
};
export async function run(page){
 await prepare(page,8891);const baseline=await sample(page);
 await prepare(page,8890);const current=await sample(page);
 await page.evaluate(()=>{PQStory3D.enter('cafe','xiaomei');G.show('social-screen');G.firstDay.drink='coffee';PQFirstDay.renderCafe();});const cafe=await sample(page);
 await page.evaluate(()=>PQCafeLife.inspectPostcard());const inspector=await sample(page);await page.click('#prop-close');
 const cycles=[];
 for(let i=0;i<4;i++){
  for(const kind of ['postcard','note','cup']){await page.evaluate(kind=>PQCafeLife.interact(kind),kind);await page.waitForFunction(()=>PQPropInspector.elapsed>.12);await page.click('#prop-close');}
  await page.evaluate(()=>PQCafeLife.startVista());await page.waitForFunction(()=>PQCafeLife.vistaProgress>.15);await page.click('#vista-back');
  cycles.push(await page.evaluate(()=>({memory:{...PQIsland.renderer.info.memory},programs:PQIsland.renderer.info.programs.length})));
 }
 console.log(JSON.stringify({baseline,current,cafe,inspector,cycles},null,2));
 assert.deepEqual(cycles[3],cycles[1],'GPU resources should stabilize after shader warm-up, not grow with each inspection');
 return {baseline,current,cafe,inspector,cycles};
}
