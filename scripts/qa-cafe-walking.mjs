import assert from 'node:assert/strict';
const nativeClick=async(page,x,y)=>{await page.cdp('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',buttons:1,clickCount:1});await page.cdp('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',buttons:0,clickCount:1});};
const idle=async page=>page.waitForFunction(()=>!PQCafeWalk.route.length,undefined,{timeout:12000});
const key=async(page,name,down)=>page.cdp('Input.dispatchKeyEvent',{type:down?'keyDown':'keyUp',key:name,code:name.length===1?'Key'+name.toUpperCase():name});
export async function run(page){
 await page.goto('http://127.0.0.1:8890/?player=cafe-walk-browser-310&experience=cafe-life');await page.waitForFunction(()=>window.PQCafeWalk?.active);
 await page.evaluate(()=>{G.firstDay.drink='coffee';PQCafeLife.render();window.walkErrors=[];addEventListener('error',e=>walkErrors.push(e.message));});
 const baseline=await page.evaluate(()=>JSON.stringify({progress:G.progress,case:G.cafeCase,campaign:G.campaign,night:G.nightMarket}));
 // Use an actual canvas hit, then wait for physical arrival before the conversation.
 const npc=await page.evaluate(()=>{PQStory3D.update(.05,performance.now()/1000);const v=PQStory3D.npcs.xiaomei.group.position.clone();v.y+=1.4;v.project(PQIsland.camera);const b=PQIsland.renderer.domElement.getBoundingClientRect();return {x:b.x+(v.x*.5+.5)*b.width,y:b.y+(-v.y*.5+.5)*b.height};});
 await nativeClick(page,npc.x,npc.y);assert.equal(await page.evaluate(()=>PQFirstDay.dialogOpen),false,'far NPC does not teleport into conversation');
 await page.waitForFunction(()=>PQFirstDay.dialogOpen,undefined,{timeout:10000});assert.ok(await page.evaluate(()=>PQCafeNavigation.dist(PQStory3D.player.group.position,{x:-.1,z:1.55})<.2));
 const paused=await page.evaluate(()=>PQStory3D.player.group.position.toArray());await key(page,'w',true);await page.evaluate(()=>{for(let i=0;i<10;i++)PQCafeWalk.tick(.05);});await key(page,'w',false);assert.deepEqual(await page.evaluate(()=>PQStory3D.player.group.position.toArray()),paused);await page.evaluate(()=>PQFirstDay.closeDialog());await page.waitForFunction(()=>PQStory3D.cameraGoal.x<1.2&&PQStory3D.camPosition.distanceTo(PQStory3D.cameraGoal)<.02);
 // Ground selection, manual cancellation, and held movement all operate on the avatar.
 const ground=await page.evaluate(()=>{PQStory3D.update(.05,performance.now()/1000);const v=new THREE.Vector3(1.8,.06,3).project(PQIsland.camera),b=PQIsland.renderer.domElement.getBoundingClientRect();return {x:b.x+(v.x*.5+.5)*b.width,y:b.y+(-v.y*.5+.5)*b.height};});
 await nativeClick(page,ground.x,ground.y);assert.ok(await page.evaluate(()=>PQCafeWalk.route.length>0));
 await key(page,'s',true);await page.waitForFunction(()=>PQStory3D.player.group.position.z>2.1);await key(page,'s',false);assert.equal(await page.evaluate(()=>PQCafeWalk.route.length),0);assert.equal(await page.evaluate(()=>PQCafeWalk.pending),null);
 await page.click('#cafe-spots [data-spot="window"]');await idle(page);assert.ok(await page.evaluate(()=>PQCafeNavigation.dist(PQStory3D.player.group.position,{x:-2,z:.15})<.2));
 await page.click('#cafe-menu');await key(page,'e',true);await key(page,'e',false);await page.waitForFunction(()=>PQPropInspector.active);const held=await page.evaluate(()=>PQStory3D.player.group.position.toArray());await key(page,'d',true);await page.evaluate(()=>PQCafeWalk.tick(.05));await key(page,'d',false);assert.deepEqual(await page.evaluate(()=>PQStory3D.player.group.position.toArray()),held);await page.click('#prop-close');
 // A real touch joystick and cancellation after rotation.
 await page.cdp('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});await page.cdp('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
 await page.waitForFunction(()=>innerWidth===844&&document.getElementById('cafe-stick').getBoundingClientRect().width>0);
 const stick=await page.evaluate(()=>{const r=document.getElementById('cafe-stick').getBoundingClientRect();window.walkStart=PQStory3D.player.group.position.clone();return {x:r.x+r.width/2,y:r.y+r.height/2};});
 await page.cdp('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:stick.x,y:stick.y,id:1}]});await page.cdp('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:stick.x+30,y:stick.y+22,id:1}]});
 await page.waitForFunction(()=>PQStory3D.player.group.position.distanceTo(walkStart)>.35);await page.cdp('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await page.evaluate(()=>Math.hypot(PQCafeWalk.joy.x,PQCafeWalk.joy.z)),0);
 await page.screenshot({path:'/Users/tone-stone/Documents/Codex/2026-11-16/new-chat/outputs/cafe-walk-landscape.png'});
 await page.cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await page.waitForFunction(()=>innerWidth===390);assert.equal(await page.evaluate(()=>Object.keys(PQCafeWalk.keys).length),0);
 await page.screenshot({path:'/Users/tone-stone/Documents/Codex/2026-11-16/new-chat/outputs/cafe-walk-portrait.png'});
 await page.click('#cafe-overview');assert.equal(await page.evaluate(()=>PQCafeWalk.overview),true);await page.click('#cafe-overview');assert.equal(await page.evaluate(()=>PQCafeWalk.overview),false);
 await page.click('#cafe-spots [data-spot="terrace"]');await page.waitForFunction(()=>PQCafeLife.vista,undefined,{timeout:12000});assert.equal(await page.evaluate(()=>PQCafeWalk.route.length),0);await page.click('#vista-back');
 assert.equal(await page.evaluate(()=>JSON.stringify({progress:G.progress,case:G.cafeCase,campaign:G.campaign,night:G.nightMarket})),baseline);
 // Switching to a case detaches the shell and input; returning reactivates exactly once.
 await page.evaluate(()=>PQCafeCase.open());assert.equal(await page.evaluate(()=>PQCafeWalk.active),false);assert.equal(await page.evaluate(()=>PQCafeWalk.shell.visible),false);
 await page.evaluate(()=>{if(PQLifeFilm.active)PQLifeFilm.finish(false);PQCafeCase.close();});assert.equal(await page.evaluate(()=>PQCafeWalk.active&&PQCafeWalk.shell.visible),true);
 assert.deepEqual(await page.evaluate(()=>walkErrors),[]);return {passed:true,checks:['canvas NPC approach','ground click','keyboard movement and cancellation','furniture routing','modal input isolation','touch joystick','rotation reset','follow and overview','walk to terrace','main saves unchanged','case isolation and reentry']};
}
