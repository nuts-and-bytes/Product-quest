import assert from 'node:assert/strict';
const base='http://127.0.0.1:8890/';
const key=async(page,key)=>{await page.cdp('Input.dispatchKeyEvent',{type:'keyDown',key,code:'Key'+key.toUpperCase()});await page.cdp('Input.dispatchKeyEvent',{type:'keyUp',key,code:'Key'+key.toUpperCase()});};
const measure=async page=>page.evaluate(()=>{
 const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};},visible=el=>!el.hidden&&!!el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden';
 const dots=[...document.querySelectorAll('#social-screen .cafe-dot')].filter(visible).map(el=>({rect:rect(el),font:parseFloat(getComputedStyle(el).fontSize),name:el.getAttribute('aria-label')||el.textContent}));
 const context=document.getElementById('cafe-context');return {width:innerWidth,height:innerHeight,dots,dock:visible(context)?rect(context):null,hero:PQCafeWalk.heroRect,controls:[...context.querySelectorAll('button')].filter(visible).map(el=>rect(el)),selected:PQCafeWalk.nearby?.id,text:document.getElementById('cafe-nearby').textContent,candidates:PQCafeWalk.candidates.map(c=>c.id)};
});
const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
function checkLayout(m){
 assert.ok(m.dock,'one context strip is visible');assert.ok(!overlap(m.dock,m.hero),'context does not cover the player');
 for(const item of m.dots){assert.equal(item.font,0,'world markers have no expanded text');assert.ok(item.name);assert.ok(!overlap(item.rect,m.hero),'marker keeps clear of full projected body');}
 const boxes=[m.dock,...m.dots.map(d=>d.rect)];for(let i=0;i<boxes.length;i++){const a=boxes[i];assert.ok(a.x>=0&&a.y>=0&&a.x+a.width<=m.width+.5&&a.y+a.height<=m.height+.5,JSON.stringify(a));for(let j=i+1;j<boxes.length;j++)assert.ok(!overlap(a,boxes[j]),'markers and strip never overlap');}
 for(const r of m.controls){assert.ok(r.width>=44&&r.height>=44,'context buttons retain touch targets');assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=m.width+.5&&r.y+r.height<=m.height+.5,'buttons stay inside the viewport');}
}
const stopAtTable=async page=>{await page.evaluate(()=>{PQCafeWalk.menu(false);PQCafeWalk.walkTo({x:-2,z:.15});});await page.waitForFunction(()=>!PQCafeWalk.route.length&&!PQCafeWalk.moving&&PQStory3D.camPosition.distanceTo(PQStory3D.cameraGoal)<.02);};
export async function run(page){
 await page.goto(base+'?player=cafe-prompts-regression-3101&experience=cafe-life');await page.waitForFunction(()=>window.PQCafeWalk?.active);
 await page.evaluate(()=>{G.firstDay.drink='coffee';PQCafeLife.render();window.promptErrors=[];addEventListener('error',e=>promptErrors.push(e.message));});const save=await page.evaluate(()=>JSON.stringify({progress:G.progress,cafeLife:G.cafeLife,case:G.cafeCase,market:G.nightMarket,campaign:G.campaign}));
 await stopAtTable(page);checkLayout(await measure(page));assert.deepEqual((await measure(page)).candidates,['note','cup']);
 await key(page,'q');assert.equal((await measure(page)).selected,'cup');await page.evaluate(()=>{for(let i=0;i<20;i++){PQStory3D.player.group.position.x+=i%2?.002:-.002;PQCafeWalk.updateTargets();}});assert.equal((await measure(page)).selected,'cup','selection is stable while idle');
 await key(page,'e');await page.waitForFunction(()=>PQPropInspector.active);assert.equal(await page.evaluate(()=>PQPropInspector.spec.type),'cup');await page.click('#prop-close');
 await page.click('#cafe-target-next');assert.equal((await measure(page)).selected,'note');await page.click('#cafe-nearby');await page.waitForFunction(()=>PQPropInspector.active);assert.equal(await page.evaluate(()=>PQPropInspector.spec.title),'这儿有人吗？');await page.click('#prop-close');
 const layouts=[];
 for(const [width,height] of [[844,390],[568,320],[390,844]]){
  await page.cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await page.cdp('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});await page.waitForFunction(([w,h])=>innerWidth===w&&innerHeight===h&&PQIsland.renderer.domElement.clientWidth===w,[width,height]);await page.waitForFunction(([w,h])=>PQCafeWalk.promptStamp?.startsWith(w+':'+h+':')&&PQStory3D.camPosition.distanceTo(PQStory3D.cameraGoal)<.02,[width,height]);
  const m=await measure(page);checkLayout(m);layouts.push(m);
  const r=await page.evaluate(()=>{const r=document.getElementById('cafe-target-next').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
  await page.cdp('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...r,id:1}]});await page.cdp('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForFunction(id=>PQCafeWalk.nearby.id!==id,m.selected);checkLayout(await measure(page));
  await page.screenshot({path:`/Users/tone-stone/Documents/Codex/2026-11-16/new-chat/outputs/cafe-prompts-${width}x${height}.png`});
 }
 // An overview round-trip must not restore the old labels; approach and inspect remain available.
 await page.click('#cafe-overview');await page.waitForFunction(()=>PQStory3D.cameraGoal.y>10&&PQStory3D.camPosition.distanceTo(PQStory3D.cameraGoal)<.02);checkLayout(await measure(page));await page.click('#cafe-overview');await page.waitForFunction(()=>PQStory3D.cameraGoal.y<4&&PQStory3D.camPosition.distanceTo(PQStory3D.cameraGoal)<.02);checkLayout(await measure(page));
 await page.evaluate(()=>PQCafeLife.interact('lijie'));await page.waitForFunction(()=>PQCafeWalk.moving);assert.equal((await measure(page)).dock,null,'running does not accumulate prompts');await page.waitForFunction(()=>PQFirstDay.dialogOpen,undefined,{timeout:10000});assert.equal((await measure(page)).dock,null,'dialogue owns the screen');await page.evaluate(()=>PQFirstDay.closeDialog());
 assert.equal(await page.evaluate(()=>JSON.stringify({progress:G.progress,cafeLife:G.cafeLife,case:G.cafeCase,market:G.nightMarket,campaign:G.campaign})),save,'switching and inspection never spend progress');
 assert.deepEqual(await page.evaluate(()=>promptErrors),[]);return {passed:true,checks:['single contextual prompt','all world labels collapsed','no player or prompt overlap','Q selection stability','E inspects selected item','touch cycling','44px controls','three mobile sizes','overview round-trip','moving and dialogue suppression','progress unchanged'],layouts:layouts.map(x=>({width:x.width,height:x.height,dots:x.dots.length,dock:x.dock}))};
}
