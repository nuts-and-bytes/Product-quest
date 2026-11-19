import assert from 'node:assert/strict';
export async function run(page){
 const results=[];
 for(const port of [8891,8890])for(const experience of ['chapters','market']){
  await page.goto(`http://127.0.0.1:${port}/?player=prompt-performance-3102&experience=${experience}&chapter=1`);await page.waitForFunction(()=>window.PQStory3D?.active);
  await page.evaluate(experience=>{if(PQLifeFilm.active)PQLifeFilm.finish(false);if(experience==='chapters'){PQCampaign.act('explore');PQChapterScene.finish();}else{PQNightMarket.paused=true;PQNightMarket.render();}window.qaPerf={times:[],frames:[],last:0,skip:45};const p=experience==='chapters'?PQChapterScene.prompts:PQNightMarketScene.prompts;if(p){const orig=p.update;p.update=function(...args){const start=performance.now(),result=orig.apply(this,args);qaPerf.times.push(performance.now()-start);return result;};}const sample=t=>{if(qaPerf.skip>0)qaPerf.skip--;else if(qaPerf.last)qaPerf.frames.push(t-qaPerf.last);qaPerf.last=t;if(qaPerf.frames.length<120)requestAnimationFrame(sample);};requestAnimationFrame(sample);},experience);
  await page.waitForFunction(()=>qaPerf.frames.length===120,undefined,{timeout:15000});const result=await page.evaluate(()=>{const q=(a,n)=>[...a].sort((x,y)=>x-y)[Math.floor((a.length-1)*n)],frames=qaPerf.frames,times=qaPerf.times.slice(-120);return {fps:1000/(frames.reduce((a,b)=>a+b,0)/frames.length),frameP95:q(frames,.95),promptMedian:times.length?q(times,.5):0,promptP95:times.length?q(times,.95):0,geometries:PQIsland.renderer.info.memory.geometries,textures:PQIsland.renderer.info.memory.textures,tier:PQIsland.environment.tier};});results.push({port,experience,...result});
 }
 for(const scene of ['chapters','market']){const before=results.find(r=>r.port===8891&&r.experience===scene),after=results.find(r=>r.port===8890&&r.experience===scene);assert.ok(after.fps>=before.fps*.9,'no material FPS regression');assert.ok(after.promptP95<4,'prompt computation remains small');assert.equal(after.geometries,before.geometries,'no new GPU geometry');assert.equal(after.textures,before.textures,'no new GPU textures');}
 return results;
}
