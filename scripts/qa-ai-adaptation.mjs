import assert from 'node:assert/strict';
export async function run(page){
 await page.goto('http://127.0.0.1:8890/?player=ai-adaptation-regression-311&experience=ai');await page.waitForFunction(()=>window.PQAIJourney&&document.getElementById('ai-route').open);
 await page.evaluate(()=>{G.progress=2;G.stats={};G.trust=100;G.save();PQAIJourney.open();window.aiErrors=[];addEventListener('error',e=>aiErrors.push(e.message));});
 assert.equal(await page.evaluate(()=>document.querySelectorAll('#ai-route-list h3').length),3);assert.equal(await page.evaluate(()=>document.querySelectorAll('#ai-route-list button:not(:disabled)').length),1);
 const baseline=await page.evaluate(()=>JSON.stringify({progress:G.progress,campaign:G.campaign,market:G.nightMarket,cafe:G.cafeCase}));const levels=await page.evaluate(()=>PQAI.levels(PQ.levels).map(l=>l.id)),results=[];
 for(const id of levels){
  await page.evaluate(id=>PQAIJourney.start(id),id);await page.waitForFunction(id=>PQ.levels[G.lvIdx].id===id&&G.nodeIdx===0&&G.typing,id);
  results.push(await page.evaluate(()=>{
   const l=PQ.levels[G.lvIdx],out={id:l.id,room:PQStory3D.kind,speakers:[],cards:0,choices:0,quiz:0};let steps=0;
   while(!document.getElementById('quiz-panel').classList.contains('show')){
    if(++steps>60)throw Error('Story did not reach its quiz');const n=l.script[G.nodeIdx];if(!n)throw Error('Missing node');
    if(G.typing)G.advance();
    const visible=Object.keys(PQStory3D.npcs).filter(k=>PQStory3D.npcs[k].group.visible);if(visible.length!==1)throw Error('Overlapping cast: '+visible);
    if(n.sp&&!['n','me'].includes(n.sp)){if(visible[0]!==n.sp)throw Error('Wrong speaker in 3D');const label=document.getElementById('speaker').textContent;if(label!==PQAI.speaker(l,n))throw Error('Missing speaker name');out.speakers.push(n.sp);}
    if(n.card){if(!PQPropInspector.active)throw Error('Card did not open');PQPropInspector.read(true);const rendered=document.getElementById('prop-copy').textContent.replace(/\s/g,''),t=document.createElement('template');t.innerHTML=n.card;if(rendered!==t.content.textContent.replace(/\s/g,''))throw Error('Knowledge card content changed');if(t.content.querySelectorAll('td').length!==document.querySelectorAll('#prop-copy td').length)throw Error('Knowledge table lost');PQPropInspector.read(false);document.querySelector('#prop-actions button').click();out.cards++;}
    else if(n.choices){if(document.querySelectorAll('#choices button').length!==n.choices.length)throw Error('Missing choices');G.pick(n.choices.find(c=>c.s===2));document.getElementById('fb-btn').click();out.choices++;}
    else G.advance();
   }
   while(document.getElementById('quiz-panel').classList.contains('show')){const q=l.quiz[G.quizIdx],b=document.querySelectorAll('#quiz-ops button')[G._qmap.indexOf(q.a)];G.answerQuiz(q.a,b);document.getElementById('quiz-next').click();if(++out.quiz>5)throw Error('Quiz did not end');}
   if(!G.stats[l.id]||!G.notes.includes(l.note))throw Error('Completion was not saved');return out;
  }));
  assert.equal(await page.evaluate(()=>JSON.stringify({progress:G.progress,campaign:G.campaign,market:G.nightMarket,cafe:G.cafeCase})),baseline,'AI progress never changes PM, cafe or market saves');
 }
 const stats=await page.evaluate(()=>JSON.stringify(G.stats));await page.reload();await page.waitForFunction(()=>document.getElementById('ai-route')?.open);assert.equal(await page.evaluate(()=>JSON.stringify(G.stats)),stats);assert.equal(await page.evaluate(()=>document.querySelectorAll('#ai-route-list button:not(:disabled)').length),levels.length);await page.evaluate(()=>PQAIJourney.close());
 // Long authored choices remain readable and actionable through rotation.
 await page.evaluate(()=>G.startLevel('ai3_1'));await page.waitForFunction(()=>G.typing&&PQ.levels[G.lvIdx].id==='ai3_1');await page.evaluate(()=>{clearTimeout(G._startTimer);clearInterval(G.typeTimer);G.nodeIdx=PQ.levels[G.lvIdx].script.findIndex(n=>n.choices);G.playNode();G.advance();});
 const layouts=[];for(const [width,height]of [[844,390],[568,320],[390,844]]){
  await page.cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await page.cdp('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});await page.waitForFunction(w=>PQIsland.renderer.domElement.clientWidth===w,width);
  const state=await page.evaluate(()=>{const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};};return{hud:rect(document.getElementById('hud')),dialog:rect(document.getElementById('dialog')),buttons:[...document.querySelectorAll('#choices button')].map(rect),scrollable:document.getElementById('dialog').scrollHeight>document.getElementById('dialog').clientHeight};});assert.ok(state.dialog.x>=0&&state.dialog.y>=0&&state.dialog.x+state.dialog.w<=width+.5&&state.dialog.y+state.dialog.h<=height+.5);assert.ok(state.hud.y+state.hud.h<=state.dialog.y+.5,'HUD clears dialogue');for(const b of state.buttons)assert.ok(b.w>=44&&b.h>=44);layouts.push({width,height,...state});
  await page.screenshot({path:`/Users/tone-stone/Documents/Codex/2026-11-16/new-chat/outputs/ai-choices-${width}.png`});
 }
 await page.click('#choices button:last-child');assert.equal(await page.evaluate(()=>document.getElementById('feedback').classList.contains('show')),true);await page.evaluate(()=>G.hideFb());
 // A knowledge table survives closing, reopening and mobile orientation changes without skipping its node.
 await page.evaluate(()=>{clearInterval(G.typeTimer);G.nodeIdx=PQ.levels[G.lvIdx].script.findIndex(n=>n.card);G.playNode();});const node=await page.evaluate(()=>G.nodeIdx);await page.click('#prop-read');assert.ok((await page.evaluate(()=>document.getElementById('prop-copy').textContent)).includes('黄金'));await page.click('#prop-read-close');await page.click('#prop-close');assert.equal(await page.evaluate(()=>G.nodeIdx),node);await page.click('#choices button:first-child');assert.equal(await page.evaluate(()=>PQPropInspector.active),true);await page.click('#prop-close');
 // Switching back to the existing PM and market scenes cleans up the AI mode and cast.
 await page.evaluate(()=>{PQCampaign.open('1');if(PQLifeFilm.active)PQLifeFilm.finish(false);PQCampaign.act('read','receipt');});await page.waitForFunction(()=>PQPropInspector.active);await page.click('#prop-close');assert.equal(await page.evaluate(()=>document.getElementById('game').classList.contains('ai-story-mode')),false);
 await page.evaluate(()=>{PQNightMarket.open();if(PQLifeFilm.active)PQLifeFilm.finish(false);});await page.waitForFunction(()=>!PQNightMarketScene.prompts.dock.hidden&&PQNightMarketScene.prompts.rows.length===3);await page.click('#market-screen .scene-context-next');await page.click('#market-screen .scene-context-action');assert.equal(await page.evaluate(()=>PQNightMarket.dialog.id),'achen');await page.evaluate(()=>PQNightMarket.action('back'));
 assert.deepEqual(await page.evaluate(()=>window.aiErrors||[]),[]);return {passed:true,levels:results,layouts,checks:['all authored nodes and quizzes','full knowledge text and tables retained','distinct speaking cast','AI progress independent and reloadable','long choice rotation','inspector close and reopen','PM and market regression']};
}
