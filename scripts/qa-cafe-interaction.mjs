import assert from 'node:assert/strict';
// Run in ego-browser's Node context against an isolated ?player=... QA save.
export async function run(page){
 await page.evaluate(()=>{if(PQLifeFilm.active)PQLifeFilm.finish(false);if(PQCafeCase.active)PQCafeCase.suspend();PQFirstDay.closeDialog();PQStory3D.enter('cafe','xiaomei');G.firstDay.drink='coffee';G.show('social-screen');PQFirstDay.renderCafe();});
 await page.waitForFunction(()=>PQStory3D.active&&!PQFirstDay.dialogOpen);
 const p=await page.evaluate(()=>{PQStory3D.update(1,performance.now()/1000);const v=PQStory3D.npcs.xiaomei.group.getWorldPosition(new THREE.Vector3());v.y+=1.5;v.project(PQIsland.camera);const c=PQIsland.renderer.domElement.getBoundingClientRect(),x=c.left+(v.x*.5+.5)*c.width,y=c.top+(-v.y*.5+.5)*c.height;return {x,y,tag:document.elementFromPoint(x,y)?.tagName};});
 assert.equal(p.tag,'CANVAS','the actual character is unobstructed by HUD');
 await page.cdp('Input.dispatchMouseEvent',{type:'mousePressed',x:p.x,y:p.y,button:'left',buttons:1,clickCount:1});
 await page.cdp('Input.dispatchMouseEvent',{type:'mouseReleased',x:p.x,y:p.y,button:'left',buttons:0,clickCount:1});
 await page.waitForFunction(()=>PQFirstDay.dialogOpen,undefined,{timeout:10000});
 assert.equal(await page.evaluate(()=>PQFirstDay.dialogOpen),true,'clicking the cafe character must open a conversation');
 return {passed:true,point:p};
}
