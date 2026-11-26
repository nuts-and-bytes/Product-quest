/* Outdoor visibility: local material cutouts, stable framing, and HUD-aware labels. */
(function(){
  'use strict';
  const T=THREE,F=PQWorldFraming,$=id=>document.getElementById(id);
  class WorldVisibility {
    constructor(world){
      this.world=world;this.scene=world.scene;this.entries=[];this.ray=new T.Raycaster();this.point=new T.Vector3();this.direction=new T.Vector3();
      this.cameraBlockers=[];
      this.enabled={value:0};this.viewport={value:new T.Vector2(1,1)};
      this.targets={value:[new T.Vector4(-2,-2,0,0),new T.Vector4(-2,-2,0,0)]};
      this.screen={width:1,height:1};this.obstacles=[];this.sizes=new WeakMap();this.sides=new WeakMap();this.offset=new T.Vector2();this.nextScan=0;this.nextMeasure=0;
      this.scene.updateMatrixWorld(true);
      this.scene.traverse(mesh=>{
        if(!mesh.isMesh)return;
        if(mesh.userData.pqOccluder){
          this.register(mesh);
          if(!mesh.userData.pqMovingOccluder)this.cameraBlockers.push(this.entries.at(-1));
        }else if(mesh.userData.pqFollowBlocker){
          mesh.geometry.computeBoundingBox();
          this.cameraBlockers.push({mesh,box:mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld)});
        }
      });
    }
    get active(){return $('map-screen')?.classList.contains('active')&&!this.world.cinematicMode&&!this.world.archipelago&&!window.PQStory3D?.active&&!window.PQLifeFilm?.active;}
    register(mesh){
      const source=mesh.material,material=source.clone(),compile=source.onBeforeCompile,key=source.customProgramCacheKey();
      const reveal={value:new T.Vector2()},states=[0,1].map(()=>({blocked:0,clear:0,reveal:false}));
      // Each occluder owns its uniforms; the original shared town material stays intact.
      material.onBeforeCompile=shader=>{
        compile.call(source,shader,this.world.renderer);
        Object.assign(shader.uniforms,{uPQVisible:this.enabled,uPQViewport:this.viewport,uPQTargets:this.targets,uPQReveal:reveal});
        shader.vertexShader='varying float vPQDepth;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvPQDepth=-mvPosition.z;');
        shader.fragmentShader='varying float vPQDepth;\nuniform float uPQVisible;\nuniform vec2 uPQViewport,uPQReveal;\nuniform vec4 uPQTargets[2];\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
          if(uPQVisible>.5){
            float cut=0.;
            for(int i=0;i<2;i++){
              vec4 target=uPQTargets[i];
              if(target.z>0. && vPQDepth<target.w-.15){
                float d=length(gl_FragCoord.xy-target.xy*uPQViewport);
                cut=max(cut,(1.-smoothstep(target.z*.68,target.z,d))*uPQReveal[i]);
              }
            }
            // Ordered screen-space coverage keeps opaque depth and avoids alpha sorting.
            vec2 cell=mod(floor(gl_FragCoord.xy),4.);
            float threshold=fract(cell.x*.5+cell.y*.75)*.75+fract(floor(cell.x*.5)*.5+floor(cell.y*.5)*.75)*.1875+.03125;
            if(cut>threshold)discard;
          }`);
      };
      material.customProgramCacheKey=()=>key+'|pq-local-cutout-1';mesh.material=material;
      mesh.geometry.computeBoundingBox();
      this.entries.push({mesh,source,reveal,states,box:mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld),moving:!!mesh.userData.pqMovingOccluder});
    }
    installUI(){
      if(this.uiReady||!$('journey-tools'))return;this.uiReady=true;
      $('journey-tools').insertAdjacentHTML('beforeend','<button id="world-view-toggle" aria-controls="isl-toolbar" aria-expanded="false">视角</button><button id="world-more-toggle" aria-controls="world-drawer" aria-expanded="false">更多</button>');
      const drawer=document.createElement('section');drawer.id='world-drawer';drawer.hidden=true;drawer.setAttribute('aria-label','探索与游戏菜单');
      $('map-screen').append(drawer);drawer.append($('expedition-hud'),$('map-foot'));
      $('isl-toolbar').hidden=true;
      const toggle=(button,panel,other)=>{
        const open=panel.hidden;panel.hidden=!open;button.setAttribute('aria-expanded',String(open));
        if(open){this.stopWalking();other.hidden=true;$(other.id==='isl-toolbar'?'world-view-toggle':'world-more-toggle').setAttribute('aria-expanded','false');}
        this.nextMeasure=0;
      };
      $('world-view-toggle').onclick=()=>toggle($('world-view-toggle'),$('isl-toolbar'),drawer);
      $('world-more-toggle').onclick=()=>toggle($('world-more-toggle'),drawer,$('isl-toolbar'));
      window.addEventListener('keydown',e=>{
        if(e.key!=='Escape'||!this.active)return;
        const open=!drawer.hidden?['world-drawer','world-more-toggle']:!$('isl-toolbar').hidden?['isl-toolbar','world-view-toggle']:null;
        if(open){$(open[0]).hidden=true;$(open[1]).setAttribute('aria-expanded','false');$(open[1]).focus();this.nextMeasure=0;}
      });
      const pin=document.createElement('button');pin.id='world-target';pin.hidden=true;pin.onclick=()=>{if(PQFirstDay.guided())PQFirstDay.act();else PQCampaign.travel(G.campaign.current);};$('game').append(pin);this.pin=pin;
      const leader=document.createElementNS('http://www.w3.org/2000/svg','svg');leader.id='world-label-lines';leader.setAttribute('aria-hidden','true');$('game').append(leader);this.leader=leader;
      this.lines=[0,1,2].map(()=>{const l=document.createElementNS(leader.namespaceURI,'line');leader.append(l);return l;});
    }
    stopWalking(){const w=this.world;w.resetInput();w.walkGoal=null;w.walkPath=[];}
    closeMenus(){
      for(const [panel,button] of [['world-drawer','world-more-toggle'],['isl-toolbar','world-view-toggle']]){
        const el=$(panel);if(el&&!el.hidden){el.hidden=true;$(button)?.setAttribute('aria-expanded','false');this.nextMeasure=0;}
      }
    }
    syncMaterials(){for(const e of this.entries)e.mesh.material.emissiveIntensity=e.source.emissiveIntensity;}
    goal(){
      const w=this.world;
      if(window.PQFirstDay?.guided()){
        const position=PQFirstDay.target();
        return position?{id:G.firstDay.stage==='arrival'?'guide':['cafe','coffee'].includes(G.firstDay.stage)?'cafe':'hq',position,rig:['arrival','hq'].includes(G.firstDay.stage)?PQFirstDay.guide:null}:null;
      }
      const c=window.PQChapterJourney&&G.campaign?PQChapterJourney.def(G.campaign.current):null,b=c&&w.buildings[c.building];
      if(!b)return null;
      const npc=w.npcRigs.find(n=>n.building===c.building);
      return {id:c.building,position:b.doorPos,rig:npc?.rig,name:b.data.name};
    }
    measure(now){
      if(now<this.nextMeasure)return;this.nextMeasure=now+160;
      const el=this.world.renderer.domElement,rect=el.getBoundingClientRect();this.screen={width:rect.width,height:rect.height};this.obstacles=[];
      const ids=['campaign-route','journey-hud','journey-dialog','isl-toolbar','journey-tools','world-drawer','bpanel','exp-journal-panel','isl-prompt','exp-interact','isl-status','mobile-play-hint','mobile-play-status'];
      for(const id of ids){
        const node=$(id);if(!node||node.hidden||(id==='bpanel'&&!node.classList.contains('open')))continue;
        const style=getComputedStyle(node);if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0)continue;
        const b=node.getBoundingClientRect();if(b.width&&b.height)this.obstacles.push({x:b.left-rect.left,y:b.top-rect.top,width:b.width,height:b.height});
      }
      const s=window.PQMobilePlay?.insets||{};
      for(const r of [{x:0,y:0,width:s.left,height:rect.height},{x:rect.width-s.right,y:0,width:s.right,height:rect.height},{x:0,y:0,width:rect.width,height:s.top},{x:0,y:rect.height-s.bottom,width:rect.width,height:s.bottom}])if(r.width&&r.height)this.obstacles.push(r);
      this.anchor=F.safeAnchor(this.screen,this.obstacles);
    }
    follow(){
      const p=this.world.playerPos;
      if(!this.followPoint)this.followPoint={x:p.x,z:p.z};
      const dx=p.x-this.followPoint.x,dz=p.z-this.followPoint.z,d=Math.hypot(dx,dz);
      if(d>.65){this.followPoint.x=p.x-dx/d*.65;this.followPoint.z=p.z-dz/d*.65;}
      return this.followPoint;
    }
    resetFollow(){this.followPoint=null;}
    followBlockerDistance(from,to){
      this.direction.subVectors(to,from);
      const distance=this.direction.length();
      if(!distance)return Infinity;
      this.ray.set(from,this.direction.multiplyScalar(1/distance));
      this.ray.far=distance+.42;
      let nearest=Infinity;
      for(const box of this.world.followTerrain){
        const hit=this.ray.ray.intersectBox(box,this.point);
        if(hit)nearest=Math.min(nearest,hit.distanceTo(from));
      }
      this.ray.far=Math.min(this.ray.far,nearest);
      const candidates=this.cameraBlockers.filter(({mesh,box})=>{
        const hit=mesh.visible&&this.ray.ray.intersectBox(box,this.point);
        return hit&&(box.containsPoint(from)||hit.distanceTo(from)<=this.ray.far);
      });
      const hits=this.ray.intersectObjects(candidates.map(({mesh})=>mesh),false);
      return Math.min(nearest,hits[0]?.distance??Infinity);
    }
    throughCutout(buildingId,x,y){
      if(!this.active||!this.enabled.value)return false;
      const group=this.world.buildings[buildingId]?.group;
      return this.entries.some(e=>e.mesh.parent===group&&[0,1].some(i=>{
        const t=this.targets.value[i],radius=t.z*this.screen.height/this.viewport.value.y;
        return e.reveal.value.getComponent(i)>.8&&Math.hypot(x-t.x*this.screen.width,y-(1-t.y)*this.screen.height)<radius*.65;
      }));
    }
    frame(dt,now){
      this.installUI();
      if(!this.active){this.suspend();if(!this.world.cinematicMode&&!window.PQStory3D?.active&&!window.PQLifeFilm?.active)this.world.camera.clearViewOffset();return;}
      const drawer=$('world-drawer');
      if(window.PQFirstDay?.guided()&&drawer?.hidden===false){
        drawer.hidden=true;$('world-more-toggle').setAttribute('aria-expanded','false');this.nextMeasure=0;
      }
      this.measure(now);const w=this.world;
      const desired=w.mode==='walk'||w.mode==='follow'?this.anchor:{x:this.screen.width/2,y:this.screen.height/2};
      const k=w.environment.reducedMotion?1:1-Math.exp(-dt*5);
      this.offset.x+=(this.screen.width/2-desired.x-this.offset.x)*k;this.offset.y+=(this.screen.height/2-desired.y-this.offset.y)*k;
      if(Math.abs(this.offset.x)+Math.abs(this.offset.y)>.2)w.camera.setViewOffset(this.screen.width,this.screen.height,this.offset.x,this.offset.y,this.screen.width,this.screen.height);
      else w.camera.clearViewOffset();
      w.camera.updateMatrixWorld();
      this.updateCutouts(dt,now);
    }
    ensureHero(){
      const w=this.world;if(this.heroRig===w.playerRig)return;
      if(this.hero){this.scene.remove(this.hero);this.hero.geometry.dispose();this.hero.material.dispose();}
      this.heroRig=w.playerRig;const group=w.playerRig.group,positions=[],indices=[];group.updateWorldMatrix(true,true);const inverse=group.matrixWorld.clone().invert();
      group.traverse(m=>{if(!m.isMesh||m.material.transparent||m.material.visible===false)return;const p=m.geometry.attributes.position,mat=inverse.clone().multiply(m.matrixWorld),base=positions.length/3;
        for(let i=0;i<p.count;i++){this.point.fromBufferAttribute(p,i).applyMatrix4(mat);positions.push(this.point.x,this.point.y,this.point.z);}
        const ix=m.geometry.index;for(let i=0;i<(ix?ix.count:p.count);i++)indices.push(base+(ix?ix.getX(i):i));
      });
      const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeBoundingSphere();
      this.hero=new T.Mesh(geometry,new T.MeshBasicMaterial({color:'#ffe4a5',transparent:true,opacity:.35,depthWrite:false,depthFunc:T.GreaterDepth,toneMapped:false}));
      this.hero.renderOrder=500;this.hero.visible=false;this.scene.add(this.hero);
    }
    updateCutouts(dt,now){
      const w=this.world;this.enabled.value=w.mode==='fp'?0:1;this.ensureHero();
      const goal=this.goal(),second=goal&&(goal.rig?.group.position||goal.position);
      const points=[w.playerPos,second&&second.distanceTo(w.playerPos)<23?second:null];
      const e=w.environment;
      if(e.tier>0&&e.hdr)this.viewport.value.set(e.target.width,e.target.height);else w.renderer.getDrawingBufferSize(this.viewport.value);
      for(let i=0;i<2;i++){
        const p=points[i],target=this.targets.value[i];if(!p){target.set(-2,-2,0,0);continue;}
        this.point.copy(p);this.point.y+=1.4;const depth=-this.point.clone().applyMatrix4(w.camera.matrixWorldInverse).z;this.point.project(w.camera);
        const radius=Math.max(25*this.viewport.value.y/this.screen.height,this.viewport.value.y*2.2/(2*Math.tan(w.camera.fov*Math.PI/360)*Math.max(1,depth)));
        target.set(this.point.x*.5+.5,this.point.y*.5+.5,depth>0?radius:0,depth);
      }
      if(now>=this.nextScan){
        const elapsed=Math.min(.2,(now-(this.lastScan||now-80))/1000);this.lastScan=now;this.nextScan=now+80;
        this.scene.updateMatrixWorld(true);const hitSets=[new Set(),new Set()];
        for(const entry of this.entries)if(entry.moving)entry.box.copy(entry.mesh.geometry.boundingBox).applyMatrix4(entry.mesh.matrixWorld);
        for(let i=0;i<2;i++)if(points[i]&&this.enabled.value){
          for(const height of [.55,1.45,2.3]){
            this.point.copy(points[i]);this.point.y+=height;const distance=w.camera.position.distanceTo(this.point);this.direction.copy(this.point).sub(w.camera.position).normalize();
            this.ray.set(w.camera.position,this.direction);this.ray.far=distance-.15;
            const candidates=this.entries.filter(entry=>entry.mesh.visible&&this.ray.ray.intersectsBox(entry.box)).map(entry=>entry.mesh);
            for(const hit of this.ray.intersectObjects(candidates,false))hitSets[i].add(hit.object);
          }
        }
        for(const entry of this.entries)for(let i=0;i<2;i++)F.obstruction(entry.states[i],hitSets[i].has(entry.mesh),elapsed);
      }
      let blocked=false;const k=w.environment.reducedMotion?1:1-Math.exp(-dt*10);
      for(const entry of this.entries)for(let i=0;i<2;i++){
        const old=entry.reveal.value.getComponent(i),next=points[i]&&entry.states[i].reveal?1:0;
        entry.reveal.value.setComponent(i,old+(next-old)*k);if(i===0&&entry.states[i].reveal)blocked=true;
      }
      // Bridge the reveal transition; once the view is clear, retain the hero's real materials.
      this.hero.visible=blocked&&!!this.enabled.value&&this.entries.some(entry=>entry.states[0].reveal&&entry.reveal.value.x<.94);this.hero.position.copy(w.playerRig.group.position);this.hero.quaternion.copy(w.playerRig.group.quaternion);this.hero.scale.copy(w.playerRig.group.scale);
      this.blocked=blocked;
    }
    suspend(){
      this.enabled.value=0;if(this.hero)this.hero.visible=false;if(this.pin)this.pin.hidden=true;if(this.leader)this.leader.hidden=true;
      this.offset.set(0,0);this.followPoint=null;
      for(const entry of this.entries){entry.reveal.value.set(0,0);for(const s of entry.states){s.reveal=false;s.blocked=s.clear=0;}}
      if(this.wasActive){if(!this.active)this.closeMenus();for(const el of Object.values(this.world._labelEls||{}))el.style.visibility='';this.wasActive=false;}
    }
    project(position,height=0,edge=false){
      const v=this.point.copy(position);v.y+=height;
      if(edge){
        const view=v.clone().applyMatrix4(this.world.camera.matrixWorldInverse);
        if(view.z>=-.1){const x=view.x,y=-view.y||1,d=Math.hypot(x,y),r=Math.max(this.screen.width,this.screen.height)*2;return {x:this.screen.width/2+x/d*r,y:this.screen.height/2+y/d*r,behind:false};}
      }
      v.project(this.world.camera);return {x:(v.x*.5+.5)*this.screen.width,y:(-.5*v.y+.5)*this.screen.height,behind:v.z< -1||v.z>1};
    }
    label(el,anchor,occupied,critical=false,lineIndex=-1){
      if(!el)return;el.style.visibility='';
      if(anchor.behind){el.style.visibility='hidden';return;}
      let size=this.sizes.get(el),text=el.textContent;
      if(!size||size.text!==text||size.screen!==this.screen.width){size={width:el.offsetWidth,height:el.offsetHeight,text,screen:this.screen.width};this.sizes.set(el,size);}
      if(!size.width||!size.height)return;
      const place=F.placeLabel(anchor,size,this.screen,occupied,this.sides.get(el));
      if(!place||(!critical&&Math.hypot(place.x+size.width/2-anchor.x,place.y+size.height/2-anchor.y)>90)){el.style.visibility='hidden';return;}
      this.sides.set(el,place.side);occupied.push(place);el.style.transform=`translate3d(${place.x.toFixed(1)}px,${place.y.toFixed(1)}px,0)`;
      const displaced=anchor.x<0||anchor.x>this.screen.width||anchor.y<0||anchor.y>this.screen.height||place.side==='edge';el.classList.toggle('edge-marker',displaced);
      if(lineIndex>=0){const l=this.lines[lineIndex],x=Math.max(place.x,Math.min(place.x+size.width,anchor.x)),y=Math.max(place.y,Math.min(place.y+size.height,anchor.y));
        if(!displaced&&Math.hypot(x-anchor.x,y-anchor.y)>18){l.style.display='';for(const [key,value] of Object.entries({x1:x,y1:y,x2:anchor.x,y2:anchor.y}))l.setAttribute(key,value);} }
    }
    labels(){
      if(!this.active||!this.uiReady){this.suspend();return;}this.wasActive=true;
      const w=this.world,goal=this.goal(),occupied=this.obstacles.map(r=>({...r}));this.leader.hidden=!!w.environment.photo;this.lines.forEach(l=>l.style.display='none');
      const actorRect=p=>{const head=this.project(p,2.65),feet=this.project(p,.05);if(head.behind)return;const half=Math.max(15,Math.abs(feet.y-head.y)*.45);occupied.push({x:head.x-half,y:head.y-3,width:half*2,height:Math.max(20,feet.y-head.y)+8});};
      if(w.mode!=='fp')actorRect(w.playerPos);if(goal?.rig)actorRect(goal.rig.group.position);
      $('isl-prompt')?.classList.toggle('same-goal',w.nearBuildingId===goal?.id);
      const player=$('player-marker');if(player&&!player.hidden)this.label(player,this.project(w.playerPos,2.85),occupied,true,0);
      const guide=$('guide-marker');if(guide&&!guide.hidden&&PQFirstDay.guide)this.label(guide,this.project(PQFirstDay.guide.group.position,2.8),occupied,true,1);
      this.pin.hidden=!goal||goal.id==='guide'||PQFirstDay.dialogOpen;
      if(!this.pin.hidden){
        const b=w.buildings[goal.id],distance=Math.round(w.playerPos.distanceTo(goal.position));
        const anchor=this.project(goal.position,1.5,true),off=anchor.x<15||anchor.x>this.screen.width-15||anchor.y<15||anchor.y>this.screen.height-15;
        const angle=Math.atan2(anchor.y-this.screen.height/2,anchor.x-this.screen.width/2),arrows=['→','↘','↓','↙','←','↖','↑','↗'],arrow=arrows[(Math.round(angle/(Math.PI/4))+8)%8];
        const text=(off?arrow+' ':'')+(b?.data.name||'当前目标')+(distance<4?' · 进入':' · '+distance+' 米');if(this.pin.textContent!==text)this.pin.textContent=text;
        this.label(this.pin,anchor,occupied,true,2);
      }
      const labels=w._labelEls||{};
      // Nearby places are secondary to the hero, the current objective and every HUD action.
      const nearby=Object.values(w.buildings).filter(b=>b.data.id!==goal?.id&&b.doorPos.distanceTo(w.playerPos)<14).sort((a,b)=>a.doorPos.distanceTo(w.playerPos)-b.doorPos.distanceTo(w.playerPos)).slice(0,2);
      for(const b of Object.values(w.buildings)){
        const el=labels['b_'+b.data.id];if(!el)continue;el.style.display='inline-flex';
        if(!nearby.includes(b)||PQFirstDay.guided()){el.style.visibility='hidden';continue;}
        this.label(el,this.project(b.labelAnchor),occupied);
      }
    }
  }
  window.PQWorldVisibility=WorldVisibility;
})();
