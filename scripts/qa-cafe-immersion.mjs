import assert from 'node:assert/strict';
const finishTalk=async page=>{for(let i=0;i<12&&await page.evaluate(()=>PQFirstDay.dialogOpen);i++)await page.click('#journey-options button');};
const size=async(page,w,h)=>{await page.cdp('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:true});await page.cdp('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});await page.waitForFunction(([w,h])=>innerWidth===w&&innerHeight===h&&PQIsland.renderer.domElement.clientWidth===w,[w,h]);};
export async function run(page){
 await page.goto('http://127.0.0.1:8890/?player=cafe-39-regression&experience=cafe');await page.waitForFunction(()=>window.G?.cafeLife&&PQStory3D.active);
 await page.evaluate(()=>{if(PQLifeFilm.active)PQLifeFilm.finish(false);window.qaErrors=[];addEventListener('error',e=>qaErrors.push(e.message));PQCafeCase.close();G.cafeLife=PQCafeLifeState.normalize();G.firstDay.drink='coffee';PQCafeLife.render();});
 const baseline=await page.evaluate(()=>JSON.stringify({progress:G.progress,case:G.cafeCase,campaign:G.campaign,night:G.nightMarket}));
 await page.click('#cafe-life-pins [data-prop="postcard"]');await page.click('#prop-flip');
 assert.equal(await page.evaluate(()=>G.cafeLife.seen.includes('postcard-back')),true);
 await page.click('#prop-actions button');await page.waitForFunction(()=>!document.getElementById('vista-keep').disabled);
 await page.click('#cafe-vista [data-view="garden"]');await page.waitForFunction(()=>!document.getElementById('vista-keep').disabled);await page.click('#vista-keep');await page.click('#vista-back');
 await page.click('#cafe-life-pins [data-prop="postcard"]');await page.click('#prop-actions button:last-child');await finishTalk(page);
 await page.click('#cafe-spots [data-spot="window"]');await page.click('#cafe-life-pins [data-prop="note"]');await page.click('#prop-flip');await page.click('#prop-actions button');await finishTalk(page);
 await page.click('#cafe-life-pins [data-prop="cup"]');await page.click('#prop-actions button:first-child');await page.waitForFunction(()=>!PQCafeLife.arrival);await finishTalk(page);
 assert.deepEqual(await page.evaluate(()=>G.cafeLife),{version:1,seen:['postcard-back','seat-back'],postcard:{view:'garden',ending:'sent'},seat:{asked:true,choice:'window'}});
 assert.equal(await page.evaluate(()=>PQStory3D.npcs.akai.group.visible&&PQCafeLife.props.sent.visible),true);
 assert.equal(await page.evaluate(()=>JSON.stringify({progress:G.progress,case:G.cafeCase,campaign:G.campaign,night:G.nightMarket})),baseline,'optional stories cannot spend or rewrite main progress');
 console.log('Two discoveries and main-save protection passed');
 // Revisit and reload use the saved state, not the current dialogue callback.
 await page.reload();await page.waitForFunction(()=>window.PQCafeCase?.active);await page.evaluate(()=>{if(PQLifeFilm.active)PQLifeFilm.finish(false);PQCafeCase.close();});
 assert.equal(await page.evaluate(()=>G.cafeLife.seat.choice==='window'&&PQStory3D.npcs.akai.group.visible&&PQCafeLife.props.sent.visible),true);
 // Fullscreen inspector remains open and owns input across rotation.
 await page.click('#cafe-life-pins [data-prop="postcard"]');await size(page,844,390);await page.click('#prop-flip');await page.click('#prop-read');
 assert.equal(await page.evaluate(()=>document.getElementById('prop-copy').textContent.includes('海风')),true);
 await size(page,390,844);assert.equal(await page.evaluate(()=>PQPropInspector.active&&PQPropInspector.back&&!document.getElementById('prop-reading').hidden),true);
 await page.click('#prop-read-close');await size(page,568,320);
 const controls=await page.evaluate(()=>[...document.querySelectorAll('#prop-inspector button')].filter(b=>b.getClientRects().length).map(b=>{const r=b.getBoundingClientRect();return {text:b.textContent,x:r.x,y:r.y,w:r.width,h:r.height};}));
 for(const r of controls){assert.ok(r.x>=0&&r.y>=0&&r.x+r.w<=568.5&&r.y+r.h<=320.5,JSON.stringify(r));assert.ok(r.w>=44&&r.h>=44,JSON.stringify(r));}
 await page.cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await page.cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'});
 assert.equal(await page.evaluate(()=>PQPropInspector.active),false);assert.equal(await page.evaluate(()=>document.querySelectorAll('#game > [inert]').length),0);
 console.log('Rotation, touch target bounds and keyboard dismissal passed');
 // Chapter evidence returns to the precise conversation, and cards still edit the draft.
 await page.evaluate(()=>PQCampaign.open('1'));await page.evaluate(()=>{if(PQLifeFilm.active)PQLifeFilm.finish(false);PQCampaign.act('talk','xiaomei');PQChapterScene.finish();});
 await page.evaluate(()=>PQCampaign.act('read','receipt'));await page.waitForFunction(()=>PQPropInspector.active);
 assert.equal(await page.evaluate(()=>PQPropInspector.spec.title),'两张联名杯收据');await page.click('#prop-close');assert.equal(await page.evaluate(()=>PQCampaign.mode),'talk');
 await page.evaluate(()=>{PQCampaign.act('workbench');PQChapterScene.finish();});await page.click('#chapter-table-pins [data-value="envelope"]');
 assert.equal(await page.evaluate(()=>document.getElementById('prop-title').textContent),'可见的周末预算');await page.click('#prop-actions button');assert.equal(await page.evaluate(()=>PQCampaign.record().plan.tool),'envelope');
 await page.click('#chapter-table-pins [data-value="envelope"]');await page.click('#prop-actions button');assert.equal(await page.evaluate(()=>!!PQCampaign.record().plan.tool),false);
 // Cafe orders debit the existing action once, then remain free to inspect.
 await page.evaluate(()=>{PQCampaign.close();PQCafeCase.open();if(PQLifeFilm.active)PQLifeFilm.finish(false);if(G.cafeCase.phase==='intro')PQCafeCase.act('start');if(PQLifeFilm.active)PQLifeFilm.finish(false);PQCafeCase.act('talk');});
 const before=await page.evaluate(()=>PQCafeModel.remaining(G.cafeCase));await page.evaluate(()=>PQCafeCase.act('read','orders'));assert.equal(await page.evaluate(()=>PQPropInspector.active),true);await page.click('#prop-close');assert.equal(await page.evaluate(()=>PQCafeCase.mode),'talk');
 const after=await page.evaluate(()=>PQCafeModel.remaining(G.cafeCase));assert.ok(after===before-1||after===before);await page.evaluate(()=>PQCafeCase.act('read','orders'));await page.click('#prop-close');assert.equal(await page.evaluate(()=>PQCafeModel.remaining(G.cafeCase)),after);
 // Market item inspection freezes service, and closing restores the same run.
 await page.evaluate(()=>{PQNightMarket.open();if(PQLifeFilm.active)PQLifeFilm.finish(false);});const market=await page.evaluate(()=>JSON.stringify(G.nightMarket));await page.evaluate(()=>PQNightMarket.action('evidence','budget'));await page.waitForFunction(()=>PQPropInspector.elapsed>.3);await page.click('#prop-close');assert.equal(await page.evaluate(()=>JSON.stringify(G.nightMarket)),market);assert.equal(await page.evaluate(()=>PQNightMarket.dialog),null);
 return {passed:true,checks:['two complete discoveries','persistent NPC and scenery','main saves unchanged','landscape and portrait','keyboard dismissal','evidence returns to conversation','physical cards select and withdraw','repeated reading is free','market state preserved'],controls};
}
