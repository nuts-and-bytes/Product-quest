/* Small, playable-world films. Borrows the current room's actors and the island renderer. */
(function(){
  'use strict';
  const T=THREE,L=PQLifeState,$=id=>document.getElementById(id);
  const clamp=n=>Math.max(0,Math.min(1,n)),ease=n=>{n=clamp(n);return n*n*(3-2*n);};
  const F={active:false,
    init(){
      G.lifeFilms=L.normalize(G.lifeFilms);
      $('game').insertAdjacentHTML('beforeend',`<div id="life-film" role="dialog" aria-modal="true" aria-label="岛上生活演出" hidden>
        <div class="life-letterbox life-top"></div><div class="life-letterbox life-bottom"></div><div id="life-veil" aria-hidden="true"></div>
        <header><div><span>PRODUCT QUEST / 岛上的片刻</span><h2 id="life-title"></h2></div><button id="life-skip">跳过 · 回到游戏</button></header>
        <div id="life-caption"><span id="life-place"></span><p id="life-line" aria-live="polite"></p></div>
        <footer><span id="life-count"></span><div><button id="life-pause">暂停</button><button id="life-next">下一幕 →</button></div></footer>
      </div>`);
      $('life-skip').onclick=()=>this.finish();
      $('life-pause').onclick=()=>{this.clock.paused=!this.clock.paused;this.syncControls();};
      $('life-next').onclick=()=>{this.clock.next();if(this.clock.done)this.finish();else this.enterShot();};
      window.addEventListener('keydown',e=>{
        if(!this.active)return;
        if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();this.finish();}
        else if(e.key==='Tab'){
          const buttons=[...$('life-film').querySelectorAll('button:not([hidden])')],first=buttons[0],last=buttons.at(-1);
          if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
          else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
        }else if(e.target.tagName!=='BUTTON'&&(e.key===' '||e.key==='Enter')){e.preventDefault();$('life-next').click();}
      },true);
      G.save();
    },
    seen(kind){const f=L.film(kind,G.cafeCase);return f&&G.lifeFilms.includes(f.id);},
    play(kind){
      if(this.active||!PQCafeCase.active||!PQStory3D.active)return false;
      const film=L.film(kind,G.cafeCase);if(!film)return false;
      this.owner=null;
      const w=PQIsland,r=PQStory3D;
      PQCafeScene.finishTransition();r.update(0,performance.now()/1000);
      this.film=film;this.clock=new L.Clock(film.shots);this.reduced=PQCafeScene.reduced();
      this.room=r.scene;this.world=r.saved.scene;this.temp=new T.Vector3();
      this.actors={achen:PQCafeScene.customers[0].rig,reader:PQCafeScene.customers[1].rig,neighbor:PQCafeScene.customers[2].rig,barista:r.npcs.xiaomei,hero:r.player};
      this.saved={scene:w.scene,position:w.camera.position.clone(),quaternion:w.camera.quaternion.clone(),view:w.camera.view?{...w.camera.view}:null,cinematic:w.cinematicMode,timeMode:w.timeMode,tod:w.curTod,
        actors:Object.values(this.actors).map(rig=>({rig,parent:rig.group.parent,position:rig.group.position.clone(),visible:rig.group.visible,rotations:['group','head','leftArm','rightArm','leftLeg','rightLeg'].map(k=>[k,rig[k].rotation.clone()])})),
        hidden:[w.playerRig?.group,PQFirstDay.guide?.group,...w.npcRigs.map(n=>n.rig.group),...w.citizens.map(c=>c.rig.group)].filter(Boolean).map(o=>[o,o.visible]),
        cups:[...PQCafeScene.customers.map(c=>c.cup),...r.counterCups].map(o=>[o,o.visible]),
        roomProps:[...Object.values(PQCafeScene.props),r.npcs.lijie.group].map(o=>[o,o.visible]),
        ui:[...$('game').children].filter(el=>!['island-viewport','life-film','crt','vig'].includes(el.id)).map(el=>[el,el.inert]),focus:document.activeElement};
      this.saved.hidden.forEach(([o])=>o.visible=false);this.saved.cups.forEach(([o])=>o.visible=false);
      const plan=kind==='outcome'?G.cafeCase.trials[G.cafeCase.selected].plan:[];
      for(const [id,prop]of Object.entries(PQCafeScene.props))prop.visible=id==='orders'||plan.includes(id)||(id==='signs'&&G.cafeCase.scenario===1);
      r.npcs.lijie.group.visible=plan.includes('helper');
      this.saved.ui.forEach(([el])=>el.inert=true);
      // A remembered morning has its own light; restore the player's world clock afterward.
      w.scene=this.world;w.timeMode='day';w._initTodState();w._updateTimeOfDay(0,performance.now()/1000);
      this.buildProps();this.active=true;w.cinematicMode='life';w.diveAnim=null;w.keys={};w.walkGoal=null;w.walkPath=[];w.joyVec={x:0,z:0};
      $('game').classList.add('life-mode');$('life-film').hidden=false;$('life-film').classList.toggle('life-reduced',this.reduced);
      $('life-title').textContent=film.title;this.enterShot();$('life-skip').focus({preventScroll:true});
      w.environment.lastFrame=0;w.environment.warmup=performance.now()+1000;
      return true;
    },
    playChapter(id,kind='arrival'){
      if(this.active||!window.PQCampaign?.active||!PQStory3D.active||!['arrival','outcome'].includes(kind))return false;
      const c=PQChapterJourney.def(id),result=PQChapterJourney.result(G.campaign,id);
      if(!c||(kind==='outcome'&&!result))return false;
      const w=PQIsland,r=PQStory3D;PQChapterScene.finish();
      this.owner={type:'chapter',kind,id};
      this.film={id:'chapter-'+id+'-'+kind,title:c.name,result,shots:kind==='arrival'?[
        {stage:'chapter-street',world:true,duration:4.2,place:c.place,caption:c.arrival},
        {stage:'chapter-meet',world:false,duration:4.8,place:c.npcs[0].name+'的约定',caption:c.objective}
      ]:[
        {stage:'chapter-result',world:false,duration:5.4,place:'刚才的选择，落在生活里',caption:result.line},
        {stage:'chapter-after',world:true,duration:4.8,place:c.place+' · 稍后',caption:result.good?c.next:'问题还没有消失。把这次经历记下来，岛上的日子仍然继续。'}
      ]};
      this.clock=new L.Clock(this.film.shots);this.reduced=PQCafeScene.reduced();this.room=r.scene;this.world=r.saved.scene;this.temp=new T.Vector3();
      this.actors={hero:r.player,lead:r.npcs[c.npcs[0].key],friend:r.npcs[c.npcs[1].key]};
      this.saved={scene:w.scene,position:w.camera.position.clone(),quaternion:w.camera.quaternion.clone(),view:w.camera.view?{...w.camera.view}:null,cinematic:w.cinematicMode,timeMode:w.timeMode,tod:w.curTod,
        actors:Object.values(this.actors).map(rig=>({rig,parent:rig.group.parent,position:rig.group.position.clone(),visible:rig.group.visible,rotations:['group','head','leftArm','rightArm','leftLeg','rightLeg'].map(k=>[k,rig[k].rotation.clone()])})),
        hidden:[w.playerRig?.group,PQFirstDay.guide?.group,...w.npcRigs.map(n=>n.rig.group),...w.citizens.map(c=>c.rig.group)].filter(Boolean).map(o=>[o,o.visible]),
        cups:[],roomProps:[],ui:[...$('game').children].filter(el=>!['island-viewport','life-film','crt','vig'].includes(el.id)).map(el=>[el,el.inert]),focus:document.activeElement};
      this.saved.hidden.forEach(([o])=>o.visible=false);this.saved.ui.forEach(([el])=>el.inert=true);
      w.scene=this.world;w.timeMode=['5','8'].includes(String(id))?'night':'day';w._initTodState();w._updateTimeOfDay(0,performance.now()/1000);
      this.buildProps();PQChapterScene.buildFilmProps(this);this.saved.roomProps=PQChapterScene.props.map(p=>[p.group,p.group.visible]);
      this.active=true;w.cinematicMode='life';w.diveAnim=null;w.keys={};w.walkGoal=null;w.walkPath=[];w.joyVec={x:0,z:0};
      $('game').classList.add('life-mode');$('life-film').hidden=false;$('life-film').classList.toggle('life-reduced',this.reduced);$('life-title').textContent=c.name;
      this.enterShot();$('life-skip').focus({preventScroll:true});w.environment.lastFrame=0;w.environment.warmup=performance.now()+1000;return true;
    },
    buildProps(){
      this.props=new T.Group();
      const cream=new T.MeshStandardMaterial({color:'#eee0be',roughness:.8}),coffee=new T.MeshStandardMaterial({color:'#594232',roughness:.85});
      const cup=()=>{const g=new T.Group(),body=new T.Mesh(new T.CylinderGeometry(.15,.12,.29,12),cream),top=new T.Mesh(new T.CylinderGeometry(.128,.128,.012,12),coffee);top.position.y=.15;g.add(body,top);g.traverse(o=>{if(o.isMesh)o.castShadow=true;});this.props.add(g);return g;};
      this.cup=cup();this.otherCup=cup();
      this.paper=new T.Group();const page=new T.Mesh(new T.BoxGeometry(.65,.025,.43),cream);this.paper.add(page);
      for(let i=0;i<4;i++){const line=new T.Mesh(new T.BoxGeometry(.48,.005,.012),coffee);line.position.set(0,.016,-.13+i*.075);this.paper.add(line);}
      this.props.add(this.paper);
      this.paths={commute:this.route([-11,19],[-11,16]),cafe:this.route([-17.5,7.6],[-17.5,3.6]),after:this.route([-17.5,3.6],[-17,7.5])};
    },
    route(a,b){const path=PQWorldMap.findPath({x:a[0],z:a[1]},{x:b[0],z:b[1]},PQ.buildings);return [a,...(path||[{x:b[0],z:b[1]}]).map(p=>[p.x,p.z])];},
    enterShot(){
      const shot=this.clock.shot;this.lastStep=0;
      $('life-place').textContent=shot.place;$('life-line').textContent=shot.caption;
      $('life-count').textContent=`${String(this.clock.index+1).padStart(2,'0')} / ${String(this.film.shots.length).padStart(2,'0')}`;
      $('life-next').textContent=this.clock.index===this.film.shots.length-1?'回到游戏 →':'下一幕 →';
      this.syncControls();this.renderFrame();
    },
    syncControls(){
      $('life-pause').hidden=this.reduced;$('life-pause').textContent=this.clock.paused?'继续播放':'暂停';
      $('life-pause').setAttribute('aria-pressed',String(this.clock.paused));
    },
    place(name,x,z,yaw=0){
      const rig=this.actors[name],scene=this.clock.shot.world?this.world:this.room;
      if(rig.group.parent!==scene)scene.add(rig.group);
      rig.group.visible=true;rig.group.position.set(x,this.clock.shot.world?1.04:.08,z);rig.group.rotation.set(0,yaw,0);
      PQIsland.animateCharacter(rig,false,this.reduced?0:this.clock.time,0);
      rig.head.rotation.set(0,0,0);rig.leftLeg.rotation.x=rig.rightLeg.rotation.x=0;rig.rightArm.rotation.z=rig.leftArm.rotation.z=0;
      return rig;
    },
    walk(name,path,u){
      u=clamp(u);let total=0;const lengths=[];
      for(let i=1;i<path.length;i++){const length=Math.hypot(path[i][0]-path[i-1][0],path[i][1]-path[i-1][1]);lengths.push(length);total+=length;}
      let distance=total*u,index=0;while(index<lengths.length-1&&distance>lengths[index])distance-=lengths[index++];
      const a=path[index],b=path[index+1],p=lengths[index]?distance/lengths[index]:1;
      const rig=this.place(name,a[0]+(b[0]-a[0])*p,a[1]+(b[1]-a[1])*p,Math.atan2(b[0]-a[0],b[1]-a[1]));
      PQIsland.animateCharacter(rig,!this.reduced&&u>0&&u<1,this.reduced?0:this.clock.time,0);return rig;
    },
    hold(object,rig,position){if(object.parent!==rig.group)rig.group.add(object);object.visible=true;object.position.set(...position);object.rotation.set(0,0,0);rig.rightArm.rotation.x=-.25;},
    holdCup(object,rig,lift=.65){
      rig.rightArm.rotation.x=-lift;if(object.parent!==rig.rightArm)rig.rightArm.add(object);
      object.visible=true;object.position.set(0,-.36,.16);object.rotation.set(lift,0,0);
    },
    tableCup(){if(this.cup.parent!==this.props)this.props.add(this.cup);this.cup.position.set(1.1,2.26,-3.05);this.cup.rotation.set(0,0,0);this.cup.visible=!!this.film.ready;},
    camera(from,to,lookFrom,lookTo,u){
      const w=PQIsland,p=ease(u),small=w.camera.aspect<.8;
      this.temp.set(...lookFrom).lerp(new T.Vector3(...lookTo),p);
      w.camera.position.set(...from).lerp(new T.Vector3(...to),p);
      if(small)w.camera.position.sub(this.temp).multiplyScalar(1.35).add(this.temp);
      w.camera.clearViewOffset();w.camera.lookAt(this.temp);
      // Keep portrait subjects above the subtitles without shifting the camera between lines.
      if(small){const el=w.renderer.domElement;w.camera.setViewOffset(el.clientWidth,el.clientHeight,0,el.clientHeight*.035,el.clientWidth,el.clientHeight);}
      w.environment.composite.uniforms.uFocus.value=w.camera.position.distanceTo(this.temp);
    },
    renderFrame(){
      if(!this.clock)return;
      const w=PQIsland,shot=this.clock.shot,u=this.reduced?.58:clamp(this.clock.time/shot.duration),t=this.reduced?0:this.clock.time;
      w.scene=shot.world?this.world:this.room;w.scene.add(this.props);
      Object.values(this.actors).forEach(rig=>rig.group.visible=false);
      [this.cup,this.otherCup,this.paper].forEach(o=>o.visible=false);
      switch(shot.stage){
        case 'chapter-street':case 'chapter-meet':case 'chapter-result':case 'chapter-after':
          PQChapterScene.filmFrame(this,shot,u,t);break;
        case 'coast':
          this.camera([-43,19,32],[-33,15,24],[-13,1,8],[-17,2,6],u);
          break;
        case 'community':{
          const a=this.walk('achen',this.paths.commute,ease(u));if(u<.2)a.head.rotation.y=-.3;
          const n=this.place('neighbor',-9.5,19,-1.5);n.rightArm.rotation.z=-.95+Math.sin(t*5)*.13;
          this.camera([-5,6.5,10],[-5.5,6,9],[-10.7,2,18],[-11,2,16.5],u);
          break;
        }
        case 'street':{
          this.walk('achen',this.paths.cafe,ease(u));
          const b=this.place('barista',-17.4,2,1.1);b.rightArm.rotation.x=-.45*Math.sin(Math.PI*u);
          const reader=this.place('reader',-17.6,-.6,1.7),sip=Math.sin(Math.PI*u);
          this.holdCup(this.otherCup,reader,.65+1.6*sip);reader.rightArm.rotation.z=-.5*sip;
          this.camera([-4,6,13],[-7.8,5,10],[-17.7,2.2,3.8],[-18,2.2,3.1],u);
          break;
        }
        case 'counter':{
          const b=this.place('barista',.6,-4.9,0);b.group.position.y=.7;b.rightArm.rotation.x=-2.2*(1-ease(u));
          this.place('achen',1,-1.45,2.6);this.tableCup();
          if(this.cup.visible){this.cup.position.z=-4.35+1.3*ease(u/.5);this.cup.position.y=2.26;}
          this.camera([5.7,3.7,1.6],[4.8,3.2,.9],[1,1.8,-2.5],[1,1.7,-2.3],u);
          break;
        }
        case 'hesitate':{
          const a=this.place('achen',1,-1.45,.25),pulse=Math.sin(Math.PI*u);
          a.leftArm.rotation.x=-1.1*pulse;a.head.rotation.x=.3*pulse;a.head.rotation.y=-.3*pulse;
          const b=this.place('barista',.6,-4.9,0);b.group.position.y=.7;b.rightArm.rotation.x=-.35;
          this.tableCup();this.camera([3.8,2.9,2.5],[3.1,2.7,2.1],[1,1.55,-1.45],[1,1.55,-1.45],u);
          break;
        }
        case 'leave':{
          const a=this.walk('achen',[[1,-1.45],[1,1]],ease(u/.8));if(u>.8){a.group.rotation.y=-.7*ease((u-.8)/.2);a.head.rotation.y=-.12;}
          this.place('hero',-2.35,2.4,.85);const b=this.place('barista',.6,-4.9,0);b.group.position.y=.7;
          this.tableCup();this.camera([2.5,4.5,8],[8.4,7.5,13],[.4,1.4,-.3],[0,1.25,.5],u);
          break;
        }
        case 'pickup':{
          const a=u<.5?this.walk('achen',[[1,1],[1,-1.45]],ease(u/.3)):this.walk('achen',[[1,-1.45],[1,1]],ease((u-.5)/.5));
          const b=this.place('barista',.6,-4.9,0);b.group.position.y=.7;b.rightArm.rotation.x=-.4*Math.sin(Math.PI*u);
          this.tableCup();
          if(this.film.served&&u>.34){
            if(u<.55){a.rightArm.rotation.x=-1;a.group.updateWorldMatrix(true,true);const hand=a.rightArm.localToWorld(new T.Vector3(0,-.36,.16));this.cup.position.lerp(hand,ease((u-.34)/.21));}
            else this.holdCup(this.cup,a);
            this.cup.visible=true;
          }else if(u>.25&&u<.5){a.leftArm.rotation.x=-.8;a.head.rotation.x=.22;}
          this.camera([5.8,4,5.2],[4.5,3.8,5.8],[1,1.5,-1.8],[1,1.5,-.8],u);
          break;
        }
        case 'after':{
          const a=this.walk('achen',this.paths.after,ease(u));if(this.film.served)this.holdCup(this.cup,a);
          const b=this.place('barista',-17.4,2,1.1);b.rightArm.rotation.z=-.5*Math.sin(Math.PI*u);
          const reader=this.place('reader',-17.6,-.6,1.5);this.hold(this.paper,reader,[0,1.2,.5]);this.paper.rotation.x=.3;reader.head.rotation.x=.2;
          this.camera([-7,7.8,13],[-7,7.3,16],[-17.5,2.2,4],[-17,2.2,7.5],u);
          break;
        }
      }
      const fade=this.reduced||this.clock.paused?0:Math.max(1-this.clock.time/.16,(this.clock.time-shot.duration+.16)/.16,0);
      $('life-veil').style.opacity=clamp(fade).toFixed(3);
      if(!this.reduced&&!this.clock.paused&&['community','street','leave','after'].includes(shot.stage)&&this.clock.time-this.lastStep>.42){this.lastStep=this.clock.time;SFX.foley('step');}
    },
    update(dt,t){
      if(!this.active)return;
      if(this.clock.tick(dt,{hidden:document.hidden,reduced:this.reduced})){if(this.clock.done){this.finish();return;}this.enterShot();}
      const w=PQIsland,step=this.clock.paused||this.reduced||document.hidden?0:dt;
      this.renderFrame();
      if(this.clock.shot.world){
        w._updateTimeOfDay(step,t);w._updateCars(step);w._updateCitizens(step,this.reduced?0:this.clock.time);w._updateAmbient(step,this.clock.time);w.environment.update(step,this.clock.time);
        w.environment.composite.uniforms.uFocus.value=w.camera.position.distanceTo(this.temp);
      }else{
        w.environment.shafts.uniforms.uStrength.value=0;w.environment.composite.uniforms.uNight.value=0;w.environment.composite.uniforms.uBloomStrength.value=.18;
        w.environment.composite.uniforms.uInvProjection.value.copy(w.camera.projectionMatrixInverse);
      }
    },
    finish(mark=true){
      if(!this.active)return;
      const w=PQIsland,r=PQStory3D,s=this.saved,owner=this.owner;this.active=false;
      [this.cup,this.otherCup,this.paper].forEach(o=>this.props.add(o));this.props.removeFromParent();r.disposeTree(this.props);
      s.actors.forEach(a=>{a.parent.add(a.rig.group);a.rig.group.position.copy(a.position);a.rig.group.visible=a.visible;a.rotations.forEach(([key,rotation])=>a.rig[key].rotation.copy(rotation));});
      s.hidden.forEach(([o,v])=>o.visible=v);s.cups.forEach(([o,v])=>o.visible=v);s.roomProps.forEach(([o,v])=>o.visible=v);s.ui.forEach(([el,inert])=>el.inert=inert);
      w.scene=this.world;w.timeMode=s.timeMode;w.curTod=s.tod;w._updateTimeOfDay(0,performance.now()/1000);
      w.scene=s.scene;w.cinematicMode=s.cinematic;w.camera.position.copy(s.position);w.camera.quaternion.copy(s.quaternion);
      if(s.view?.enabled)w.camera.setViewOffset(s.view.fullWidth,s.view.fullHeight,s.view.offsetX,s.view.offsetY,s.view.width,s.view.height);else w.camera.clearViewOffset();
      $('game').classList.remove('life-mode');$('life-film').hidden=true;
      if(mark&&!owner){G.lifeFilms=L.remember(G.lifeFilms,this.film.id);G.save();}
      this.owner=null;
      this.clock=null;this.props=null;this.demo=null;this.actors=null;this.saved=null;this.world=null;this.room=null;this.cup=null;this.otherCup=null;this.paper=null;
      r.viewKey='';if(r.active)r.update(0,performance.now()/1000);
      w.environment.lastFrame=0;w.environment.warmup=performance.now()+1000;
      if(owner?.type==='chapter')PQCampaign.filmFinished(mark,owner.kind);
      else if(PQCafeCase.active){PQCafeCase.render();PQCafeCase.reveal();}
      else if(s.focus?.isConnected)s.focus.focus({preventScroll:true});
    }
  };
  window.PQLifeFilm=F;
})();
