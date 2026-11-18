import assert from 'node:assert/strict';
const sample=async page=>page.evaluate(()=>new Promise(resolve=>{const times=[];let last=0,warm=35;const frame=now=>{if(last&&warm<=0)times.push(now-last);last=now;warm--;if(times.length<150)requestAnimationFrame(frame);else{const sorted=times.slice().sort((a,b)=>a-b);resolve({fps:+(1000/(times.reduce((a,b)=>a+b)/times.length)).toFixed(1),p95:sorted[Math.floor(sorted.length*.95)],frames:times.length,tier:PQIsland.environment.tier,memory:{...PQIsland.renderer.info.memory},programs:PQIsland.renderer.info.programs.length});}};requestAnimationFrame(frame);}));
const prepare=async(page,port)=>{await page.goto(`http://127.0.0.1:${port}/?player=cafe-walk-perf-310&experience=cafe-life`);await page.waitForFunction(()=>window.PQCafeLife?.active);await page.evaluate(()=>{G.firstDay.drink='coffee';PQCafeLife.render();PQIsland.environment.setQuality('cinema',false);});};
export async function run(page){
 await prepare(page,8891);const before=await sample(page);
 await prepare(page,8890);const idle=await sample(page);
 await page.evaluate(()=>PQCafeWalk.walkTo({x:-5.8,z:1.65}));const walking=await sample(page);await page.waitForFunction(()=>!PQCafeWalk.route.length);
 const cycles=[];
 for(let i=0;i<4;i++){
  await page.evaluate(()=>{PQCafeCase.open();if(PQLifeFilm.active)PQLifeFilm.finish(false);PQCafeCase.close();});
  await page.waitForFunction(()=>PQCafeWalk.shell.visible);
  await page.evaluate(()=>PQCafeLife.inspectPostcard());await page.waitForFunction(()=>PQPropInspector.elapsed>.2);await page.click('#prop-close');
  await page.evaluate(()=>PQCafeLife.startVista());await page.waitForFunction(()=>PQCafeLife.vistaProgress>.2);await page.click('#vista-back');
  cycles.push(await page.evaluate(()=>({memory:{...PQIsland.renderer.info.memory},programs:PQIsland.renderer.info.programs.length})));
 }
 assert.deepEqual(cycles[3],cycles[1],'resources stabilize after shader warmup');
 const result={before,idle,walking,cycles};console.log(JSON.stringify(result,null,2));return result;
}
