/* Shared world prompts. Uses the owning scene's frame loop; never changes game state on focus. */
(function(){
  'use strict';
  const T=THREE,F=PQWorldFraming;
  class ScenePrompts{
    constructor(host,blockers,blocked){
      this.host=host;this.blockers=blockers;this.blocked=blocked;this.rows=[];this.selected=null;this.boxes=new WeakMap();this.point=new T.Vector3();this.nextMeasure=0;
      this.dock=document.createElement('div');this.dock.className='scene-context';this.dock.hidden=true;this.dock.setAttribute('role','group');this.dock.setAttribute('aria-label','当前场景交互');
      this.action=document.createElement('button');this.action.type='button';this.action.className='scene-context-action';
      this.next=document.createElement('button');this.next.type='button';this.next.className='scene-context-next';this.next.setAttribute('aria-label','切换交互目标');
      this.status=document.createElement('span');this.status.className='scene-prompt-status';this.status.setAttribute('role','status');this.status.setAttribute('aria-live','polite');this.status.setAttribute('aria-atomic','true');
      this.dock.append(this.action,this.next,this.status);host.append(this.dock);
      this.action.onclick=()=>this.activate();this.next.onclick=()=>this.cycle();
      this.key=e=>{if(e.repeat||e.altKey||e.ctrlKey||e.metaKey||e.isComposing||this.unavailable()||e.target.closest?.('input,textarea,select,[contenteditable="true"]'))return;const key=e.key.toLowerCase();if(key!=='q'&&key!=='e')return;e.preventDefault();e.stopImmediatePropagation();if(key==='q')this.cycle();else this.activate();};
      window.addEventListener('keydown',this.key,true);
      this.focus=e=>{const row=this.rows.find(r=>r.b===e.target);if(row&&e.target.matches(':focus-visible')){this.selected=row.id;this.refresh();}};host.addEventListener('focusin',this.focus);this.click=e=>{const row=this.rows.find(r=>r.b===e.target.closest('button'));if(row)this.selected=row.id;};host.addEventListener('click',this.click,true);
    }
    unavailable(){return !this.host.classList.contains('active')||this.blocked()||window.PQLifeFilm?.active||window.PQPropInspector?.active||document.hidden;}
    hide(){this.nextMeasure=0;this.dock.hidden=true;this.rows.forEach(r=>r.b.style.visibility='hidden');}
    refresh(){
      const i=this.rows.findIndex(r=>r.id===this.selected),row=this.rows[i];if(!row)return;
      const touch=matchMedia('(pointer:coarse)').matches,label=row.label,action=(touch?'':'E · ')+label,next=(touch?'切换':'Q 切换')+' '+(i+1)+'/'+this.rows.length;
      if(this.action.textContent!==action)this.action.textContent=action;
      if(this.next.textContent!==next)this.next.textContent=next;
      if(this.action.getAttribute('aria-label')!==label)this.action.setAttribute('aria-label',label);this.next.disabled=this.rows.length<2;
      const status=label+'，'+(i+1)+' / '+this.rows.length;if(this.status.textContent!==status)this.status.textContent=status;
      for(const r of this.rows)if(r.b.classList.contains('is-current')!==(r.id===this.selected))r.b.classList.toggle('is-current',r.id===this.selected);
    }
    cycle(){if(this.unavailable()||!this.rows.length)return;const i=this.rows.findIndex(r=>r.id===this.selected);this.selected=this.rows[(i+1)%this.rows.length].id;this.refresh();}
    activate(){if(this.unavailable())return;const row=this.rows.find(r=>r.id===this.selected);if(row&&row.b.isConnected&&!row.b.disabled){row.b.click();this.hide();}}
    // Cached local prop bounds avoid walking mesh hierarchies on every frame.
    propBox(group){let box=this.boxes.get(group);if(!box){group.updateWorldMatrix(true,true);box=new T.Box3().setFromObject(group);box.applyMatrix4(new T.Matrix4().copy(group.matrixWorld).invert());this.boxes.set(group,box);}return box;}
    projectBox(group,box,width,height,padding=6){
      if(!group.visible||box.isEmpty())return null;group.updateWorldMatrix(true,false);let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
      for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const p=this.point.set(x,y,z).applyMatrix4(group.matrixWorld).project(PQIsland.camera);if(p.z<-1||p.z>1)return null;const sx=(p.x*.5+.5)*width,sy=(-p.y*.5+.5)*height;left=Math.min(left,sx);right=Math.max(right,sx);top=Math.min(top,sy);bottom=Math.max(bottom,sy);}
      return {x:left-padding,y:top-padding,width:right-left+padding*2,height:bottom-top+padding*2};
    }
    update(rows,actors,props=[]){
      this.rows=rows;if(rows.length&&!rows.some(r=>r.id===this.selected))this.selected=rows[0].id;
      for(const row of rows){if(!row.b.classList.contains('scene-dot'))row.b.classList.add('scene-dot');if(row.b.getAttribute('aria-label')!==row.label)row.b.setAttribute('aria-label',row.label);}
      if(this.unavailable()||!rows.length){this.hide();return;}
      this.refresh();this.dock.hidden=false;
      const canvas=PQIsland.renderer.domElement,width=canvas.clientWidth,height=canvas.clientHeight,screen={width,height},camera=PQIsland.camera;camera.updateMatrixWorld();
      this.protected=[];
      for(let i=0;i<actors.length;i++){const g=actors[i].group||actors[i],box=new T.Box3(new T.Vector3(-.85,i===0?0:.6,-.65),new T.Vector3(.85,2.95,.65)),r=this.projectBox(g,box,width,height);if(r)this.protected.push(r);}
      for(const group of props){const r=this.projectBox(group,this.propBox(group),width,height,4);if(r)this.protected.push(r);}
      const now=performance.now(),stamp=width+':'+height+':'+this.host.dataset.view+':'+matchMedia('(pointer:coarse)').matches;
      if(stamp!==this.stamp){this.dock.classList.remove('is-stacked');this.lastPlace=null;}
      if(stamp!==this.stamp||now>=this.nextMeasure){
        this.stamp=stamp;this.nextMeasure=now+150;this.obstacles=[];
        for(const el of this.host.querySelectorAll(this.blockers)){if(!el.getClientRects().length||getComputedStyle(el).visibility==='hidden')continue;const r=el.getBoundingClientRect();if(r.width&&r.height)this.obstacles.push({x:r.x,y:r.y,width:r.width,height:r.height});}
        const safe=PQMobilePlay.insets;for(const r of [{x:0,y:0,width:safe.left,height},{x:width-safe.right,y:0,width:safe.right,height},{x:0,y:0,width,height:safe.top},{x:0,y:height-safe.bottom,width,height:safe.bottom}])if(r.width&&r.height)this.obstacles.push(r);
        const r=this.dock.getBoundingClientRect();this.size={width:r.width,height:r.height};
      }
      const occupied=[...this.protected,...this.obstacles],anchor={x:width*.5,y:height-14};
      // Keep an existing safe position through NPC motion and queue refreshes.
      let size=this.size;const fits=r=>r&&r.x>=10&&r.y>=10&&r.x+r.width<=width-10&&r.y+r.height<=height-10&&!occupied.some(b=>F.overlaps(r,b,6));
      const findPlace=()=>{
        const previous=this.lastPlace&&{...this.lastPlace,...size};if(fits(previous))return previous;
        let place=F.placeLabel(anchor,size,screen,occupied);if(place)return place;
        let best=Infinity;for(let y=10;y<=height-size.height-10;y+=16)for(let x=10;x<=width-size.width-10;x+=16){const r={x,y,...size};if(!fits(r))continue;const score=Math.hypot(x+size.width/2-anchor.x,y+size.height/2-anchor.y);if(score<best){best=score;place=r;}}return place;
      };
      let place=findPlace();
      if(!place&&!this.dock.classList.contains('is-stacked')){this.dock.classList.add('is-stacked');const r=this.dock.getBoundingClientRect();size=this.size={width:r.width,height:r.height};place=findPlace();}

      this.dock.style.visibility=place?'':'hidden';this.lastPlace=place;this.dockRect=place;
      if(place){this.dock.style.left=place.x+'px';this.dock.style.top=place.y+'px';occupied.push(place);}
      for(const row of [...rows].sort((a,b)=>(b.id===this.selected)-(a.id===this.selected))){const p=this.point.copy(row.point).project(camera),b=row.b,anchor={x:(p.x*.5+.5)*width,y:(-p.y*.5+.5)*height};let rect=null;
        if(p.z>=-1&&p.z<=1&&anchor.x>=0&&anchor.x<=width&&anchor.y>=0&&anchor.y<=height)rect=F.placeLabel(anchor,{width:44,height:44},screen,occupied);
        if(rect&&Math.hypot(rect.x+22-anchor.x,rect.y+22-anchor.y)>76)rect=null;
        b.style.visibility=rect?'':'hidden';if(rect){b.style.left=rect.x+'px';b.style.top=rect.y+'px';occupied.push(rect);}
      }
    }
    detach(){window.removeEventListener('keydown',this.key,true);this.host.removeEventListener('focusin',this.focus);this.host.removeEventListener('click',this.click,true);this.dock.remove();this.rows=[];}
  }
  window.PQScenePrompts=ScenePrompts;
})();
