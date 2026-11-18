/* One small outdoor set, rendered by the existing island loop. Geometry and materials are allocated on entry. */
(function(){
  'use strict';
  const T=THREE,M=PQNightMarketModel,labels={order:'01 点单',brew:'02 制作',pickup:'03 取餐'},ease=n=>{n=Math.max(0,Math.min(1,n));return n*n*(3-2*n);};
  const S={active:false,
    buildRoom(r){
      r.scene.background.set('#21374b');r.scene.fog.color.set('#21374b');r.scene.fog.near=38;r.scene.fog.far=85;
      r.box(0,-.3,0,19,.6,15,'#697779');
      for(let i=0;i<18;i++)r.box(-8.5+i,.015,0,.965,.04,14.8,i%3?'#ab9878':'#b7a17c');
      r.box(0,-.9,-24,150,.08,70,'#355a6b',{metalness:.45,roughness:.35});
      for(let i=0;i<7;i++)r.box(-36+i*11,-1.3,-42-i%3*4,8,3+i%3*2,7,'#314555');
      const moon=new T.Mesh(new T.SphereGeometry(1.15,20,12),r.mat('#fff1c4',{emissive:'#f6d9a9',emissiveIntensity:.55}));moon.position.set(-15,13,-36);r.group.add(moon);
      r.box(0,.65,-7.2,19,.11,.1,'#a99980');
      for(let x=-9;x<=9;x+=3)r.box(x,.45,-7.2,.1,.9,.1,'#8c8b79');
      // Cloth canopy and a single instanced string of lanterns. Only the existing sun casts a shadow.
      for(const x of [-3.9,3.9])r.box(x,2.1,-1.1,.12,4.2,.12,'#375a55');
      for(let i=0;i<10;i++){const cloth=r.box(-3.6+i*.8,4.05,-1.1,.79,.1,3.2,i%2?'#d9bd8b':'#6e998e');cloth.rotation.x=.05;}
      r.text(['夏青的周末夜市','慢慢喝，也可以带走'],0,3.4,-.7,4.5,.9,'#315a58','#f3dfb5');
      const bulbGeo=new T.SphereGeometry(.13,8,6),bulbMat=r.mat('#ffdda0',{emissive:'#ffca7c',emissiveIntensity:1.8}),bulbs=new T.InstancedMesh(bulbGeo,bulbMat,24),matrix=new T.Matrix4(),points=[];
      for(let i=0;i<24;i++){const x=-8.7+i*.76,y=4.9-.8*Math.sin(i/23*Math.PI),z=-3.8;matrix.makeTranslation(x,y,z);bulbs.setMatrixAt(i,matrix);points.push(new T.Vector3(x,y+.12,z));}r.group.add(bulbs);
      const wire=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:'#57696a'}));r.group.add(wire);
      for(const x of [-8.7,8.7])r.box(x,2.5,-3.8,.12,5,.12,'#4b6664');
      r.box(0,.62,0,7.8,1.2,1.55,'#38645b');r.box(0,1.25,0,8.1,.16,1.8,'#ddc79d');
      for(let i=0;i<16;i++)r.box(-3.65+i*.49,.64,.8,.04,1.08,.04,'#94a48a');
      this.stations={};this.signLayout=null;
      for(const name of M.stations){
        const before=r.group.children.length;
        if(name==='order'){r.box(0,1.44,0,.85,.2,.62,'#d8bb88');r.text(['点单'],0,1.8,.16,.8,.34,'#d8bb88','#2b544e');}
        if(name==='brew'){r.box(0,1.68,-.1,1.15,.7,.75,'#325658');r.box(0,1.92,.29,.85,.12,.05,'#dbba7d');r.cylinder(.33,2.18,-.1,.2,.26,'#b59c71');r.cup(-.2,1.46,.32);}
        if(name==='pickup'){r.box(0,1.4,0,1.25,.12,.8,'#738c76');r.text(['取餐'],0,1.83,.25,1,.36,'#315a58','#edd9b0');}
        const objects=r.group.children.slice(before),g=new T.Group();objects.forEach(o=>g.add(o));r.group.add(g);this.stations[name]=g;
      }
      this.sign=r.text(['点单 → 制作 → 取餐'],0,1.04,.91,4.8,.43,'#e9d4aa','#315650');
      this.bench=new T.Group();const before=r.group.children.length;
      r.box(-6.1,.6,2.6,2.7,.18,.85,'#b8a27a');r.box(-6.1,1.05,2.25,2.7,.7,.12,'#b8a27a');for(const x of [-7.1,-5.1])r.box(x,.28,2.6,.12,.55,.65,'#385e59');
      r.group.children.slice(before).forEach(o=>this.bench.add(o));r.group.add(this.bench);
      this.shelf=new T.Group();const start=r.group.children.length;r.box(5.4,.82,1.8,1.7,.12,1,'#b9a37f');r.box(5.4,1.4,1.8,1.7,.12,1,'#b9a37f');for(const x of [4.7,6.1])r.box(x,.7,1.8,.1,1.4,.8,'#466b60');r.group.children.slice(start).forEach(o=>this.shelf.add(o));r.group.add(this.shelf);
      this.envelope=PQChapterRooms.evidence(r,'envelope',-3.35,1.4,.3);
      // Neighbouring stalls provide depth without extra simulated vendors.
      for(const x of [-6.5,6.5]){r.box(x,.75,-4.9,3,1.5,1.3,'#48655f');r.box(x,1.55,-4.9,3.2,.14,1.5,'#c5ad85');r.text([x<0?'旧书交换':'烤栗子'],x,2.4,-5.2,2.4,.6,'#576c61','#ead4a8');for(let i=0;i<4;i++)r.box(x-.9+i*.58,1.75,-4.9,.4,.25+i%2*.1,.55,i%2?'#b5c5a4':'#c79370');}
      r.plant(-8,-1.2,.9);r.plant(8,3.5,1.1);
      this.cup=new T.Group();const parts=r.cup(0,0,0);parts.forEach(m=>this.cup.add(m));r.group.add(this.cup);this.deliveryCup=new T.Group();r.cup(0,0,0).forEach(m=>this.deliveryCup.add(m));r.group.add(this.deliveryCup);
      this.stock=new T.InstancedMesh(new T.BoxGeometry(.25,.35,.25),r.mat('#ceb28b'),30);r.group.add(this.stock);
      for(let i=0;i<30;i++){matrix.makeTranslation(4.3+(i%3)*.28,.2+Math.floor(i/9)*.36,-1.2+Math.floor(i%9/3)*.28);this.stock.setMatrixAt(i,matrix);}
    },
    attach(){
      const r=PQStory3D,w=PQIsland;this.active=true;this.focus=null;this.time=0;this.key='';this.heroSide=null;this.heroRoute=[];this.delivery=null;this.exits=[];this.previousOrders=Object.fromEntries(G.nightMarket.run.orders.map(o=>[o.id,o.status]));this.look=new T.Vector3(0,1.3,.4);this.cam=new T.Vector3(9.5,7.8,14);this.goal=new T.Vector3();this.lookGoal=new T.Vector3();this.point=new T.Vector3();this.target=new T.Vector3();this.pointer=new T.Vector2();this.raycaster=new T.Raycaster();this.canvas=w.renderer.domElement;
      this.rigs={hero:r.player,mei:r.npcs.xiaomei};
      for(const key of ['citizen2','lijie','akai','citizen3','xiaoyu','citizen4','citizen5']){r.ensureNpc(key);this.rigs[key]=r.npcs[key];this.rigs[key].group.position.set(-8,.08,4);}
      r.sun.color.set('#ffe0b2');r.sun.intensity=2.15;r.sun.position.set(-6,10,5);r.scene.children.find(o=>o.isHemisphereLight).intensity=1.35;
      this.pick=e=>{if(!this.active||PQLifeFilm.active||PQNightMarket.dialog)return;const b=this.canvas.getBoundingClientRect();this.pointer.set((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1);this.raycaster.setFromCamera(this.pointer,w.camera);const targets=this.targets();const hit=this.raycaster.intersectObjects(targets.map(o=>o.group),true)[0];if(!hit)return;const item=targets.find(o=>o.group.getObjectById(hit.object.id));if(item)PQNightMarket.action(item.act,item.id);};
      this.canvas.addEventListener('click',this.pick);this.sync();this.update(0,0,true);
    },
    detach(){this.canvas?.removeEventListener('click',this.pick);this.active=false;this.rigs=null;this.focus=null;this.targetsCache=null;},
    targets(){
      const r=G.nightMarket.run,C=PQNightMarket,out=[];
      if(['arrival','setup','break','complete','visit','closing'].includes(C.view)){
        out.push({group:this.rigs.mei.group,act:'talk',id:'xiaomei'},{group:this.rigs.citizen2.group,act:'talk',id:'achen'},{group:this.rigs.lijie.group,act:'talk',id:'li'},{group:this.envelope,act:'evidence',id:'budget'});
      }
      for(const name of M.stations)out.push({group:this.stations[name],act:'station',id:name});
      if(r.phase==='service')for(const o of r.orders.filter(o=>['waiting','accepted'].includes(o.status))){const g=M.guests.find(g=>g.id===o.id);out.push({group:this.rigs[g.rig].group,act:'select',id:o.id});}
      return out;
    },
    onAction(type,id){if(type!=='serve')return;const guest=M.guests.find(g=>g.id===id);this.delivery={id,age:0,start:this.rigs[guest.rig].group.position.clone(),from:this.stations.pickup.position.x};},
    sync(){
      if(!this.active)return;const C=PQNightMarket,r=C.view==='visit'&&G.nightMarket.legacy?G.nightMarket.legacy.run:G.nightMarket.run,p=r.plan;
      p.layout.forEach((s,i)=>this.stations[s].position.x=(i-1)*2.55);this.sign.visible=p.sign;const layoutKey=p.layout.join(',');if(this.signLayout!==layoutKey){this.signLayout=layoutKey;const cv=this.sign.material.map.image,ctx=cv.getContext('2d');ctx.fillStyle='#e9d4aa';ctx.fillRect(0,0,cv.width,cv.height);ctx.fillStyle='#315650';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='34px sans-serif';const side=['左侧','中间','右侧'];ctx.fillText('点单在'+side[p.layout.indexOf('order')]+' · 取餐在'+side[p.layout.indexOf('pickup')],cv.width/2,cv.height/2,cv.width-28);this.sign.material.map.needsUpdate=true;}this.bench.visible=p.space==='bench';this.shelf.visible=p.space==='shelf';this.stock.count=['arrival','setup'].includes(r.phase)?p.stock:r.stock;
      if(C.view==='service')for(const o of r.orders){if(['declined','left'].includes(o.status)&&this.previousOrders[o.id]!==o.status){const guest=M.guests.find(g=>g.id===o.id),rig=this.rigs[guest.rig];this.exits.push({id:o.id,age:0,from:rig.group.position.clone()});C.notice=guest.name+(o.status==='declined'?'看了价签，今晚没有下单。':'没等到饮品，先走了。');}this.previousOrders[o.id]=o.status;}this.exits=this.exits.slice(-3);
    },
    update(dt,t,snap=false){
      if(!this.active)return;PQNightMarket.tick(dt);const w=PQIsland,r=PQStory3D,C=PQNightMarket,state=C.view==='visit'&&G.nightMarket.legacy?G.nightMarket.legacy.run:G.nightMarket.run,small=w.camera.aspect<.8,reduced=PQCafeScene.reduced(),still=document.hidden||C.paused||!!C.dialog,step=still||reduced?0:dt;
      this.time+=step;if(this.delivery)this.delivery.age=reduced?1:this.delivery.age+step;this.exits.forEach(e=>e.age=reduced?3:e.age+step);this.exits=this.exits.filter(e=>e.age<2.5);const time=this.time,service=C.view==='service',talk=C.dialog?.type==='talk',evidence=C.dialog?.type==='evidence';
      if(talk){const who=C.dialog.id,x=who==='xiaomei'?-3.8:who==='achen'?-5.5:4.8;this.goal.set(x+1.5,small?4.8:3.4,small?12:9);this.lookGoal.set(x*.7,1.5,1.4);}
      else if(evidence){this.goal.set(-1,5.3,small?14:9);this.lookGoal.set(-2.6,1.2,0);}
      else{this.goal.set(small?7.4:9.5,small?10.5:7.8,small?22:14);this.lookGoal.set(0,1.2,.4);}
      const alpha=snap||reduced?1:1-Math.exp(-dt*5);this.cam.lerp(this.goal,alpha);this.look.lerp(this.lookGoal,alpha);w.camera.position.copy(this.cam);w.camera.lookAt(this.look);
      const width=this.canvas.clientWidth,height=this.canvas.clientHeight,offset=small?(C.dialog?.3:.18):C.dialog?.13:.1;
      const beside=PQMobilePlay.landscape()||(width>height&&!!C.dialog);
      w.camera.setViewOffset(width,height,beside?width*.21:0,height*(beside?.02:offset),width,height);
      Object.values(this.rigs).forEach(rig=>rig.group.visible=false);
      const place=(key,x,z,yaw=0)=>{const rig=this.rigs[key];rig.group.visible=true;this.target.set(x,.08,z);const distance=rig.group.position.distanceTo(this.target);if(key==='hero'&&this.heroRoute.length&&!snap&&!reduced){const waypoint=this.heroRoute[0];this.target.set(waypoint[0],.08,waypoint[1]);const dist=rig.group.position.distanceTo(this.target);rig.group.position.lerp(this.target,dist?Math.min(1,step*3.6/dist):1);if(dist<.08)this.heroRoute.shift();}else{rig.group.position.lerp(this.target,snap||reduced?1:1-Math.exp(-step*5));if(snap||reduced)rig.group.position.copy(this.target);}rig.group.rotation.y=yaw;w.animateCharacter(rig,distance>.1&&!still&&!reduced,reduced?0:time,0);rig.head.rotation.x=0;rig.rightArm.rotation.z=rig.leftArm.rotation.z=0;return rig;};
      let work=state.brew?'brew':state.cup?'pickup':C.station||'order';if(!service)work='order';
      const behind=['setup','break','service'].includes(C.view);if(this.heroSide!==behind){if(this.heroSide!==null&&!reduced)this.heroRoute=[[-4.3,this.heroSide?-1.6:2.2],[-4.3,behind?-1.6:2.2]];this.heroSide=behind;}
      const hero=place('hero',service?this.stations[work].position.x:-1.4,behind?-1.6:2.5,behind?0:Math.PI),mei=place('mei',-4.6,-.8,.35);
      if(state.brew&&service&&!still&&!reduced){hero.rightArm.rotation.x=-.75+Math.sin(time*6)*.12;mei.head.rotation.x=.08;}
      const queue=state.orders.filter(o=>['waiting','accepted'].includes(o.status));
      if(service){
        queue.slice(0,3).forEach((o,i)=>{const g=M.guests.find(g=>g.id===o.id),x=(i-1)*2.7,z=2.5+(i%2)*.7;place(g.rig,x,z,Math.PI);});
        const last=state.orders.filter(o=>o.status==='served').at(-1);
        if(last){const g=M.guests.find(g=>g.id===last.id);if(!this.rigs[g.rig].group.visible){const sat=state.plan.space==='bench'&&g.stroll;const giving=this.delivery?.id===last.id&&this.delivery.age<.8,rig=place(g.rig,giving?this.delivery.start.x:sat?-6.1:5.3,giving?this.delivery.start.z:sat?2.7:3.3,giving?Math.PI:sat?.25:1.2);if(sat&&!giving){rig.group.position.y=.13;rig.leftLeg.rotation.x=rig.rightLeg.rotation.x=-1;}rig.rightArm.rotation.x=-.7;}}
      }else{
        const a=place('citizen2',state.plan.space==='bench'?-6.1:-5.2,2.5,.4);if(state.plan.space==='bench'){a.group.position.y=.13;a.leftLeg.rotation.x=a.rightLeg.rotation.x=-1;}
        const li=place('lijie',5.3,2.1,-.75);li.rightArm.rotation.x=-.4;
      }
      if(service)for(const item of this.exits){const guest=M.guests.find(g=>g.id===item.id);if(this.rigs[guest.rig].group.visible)continue;const u=ease(item.age/2.5),rig=place(guest.rig,item.from.x+(-8-item.from.x)*u,item.from.z+(4-item.from.z)*u,-1.4);w.animateCharacter(rig,!reduced,time,0);}
      this.deliveryCup.visible=false;const lastServed=state.orders.filter(o=>o.status==='served').at(-1);if(service&&lastServed){const guest=M.guests.find(g=>g.id===lastServed.id),rig=this.rigs[guest.rig];if(rig.group.visible&&!queue.some(o=>M.guests.find(g=>g.id===o.id).rig===guest.rig)){this.deliveryCup.visible=true;this.deliveryCup.position.copy(rig.group.position);this.deliveryCup.position.y+=.9;this.deliveryCup.position.z+=.3;const hand=this.delivery?.id===lastServed.id&&this.delivery.age<.8;if(hand){const u=ease(this.delivery.age/.8);this.deliveryCup.position.x=this.delivery.from+(rig.group.position.x-this.delivery.from)*u;this.deliveryCup.position.z=.35+(rig.group.position.z-.05)*u;this.deliveryCup.position.y=1.48+Math.sin(u*Math.PI)*.25;hero.rightArm.rotation.x=-.9*Math.sin(u*Math.PI);}}}
      this.cup.visible=!!state.cup||!!state.brew;this.cup.position.set(this.stations[state.cup?'pickup':'brew'].position.x,1.48,.35);this.cup.rotation.y=0;
      this.stock.count=['arrival','setup'].includes(state.phase)?state.plan.stock:state.stock;
      r.dust.visible=w.environment.tier>0;r.dust.rotation.y=reduced?0:Math.sin(time*.07)*.08;
      const e=w.environment;e.shafts.uniforms.uStrength.value=0;e.composite.uniforms.uInvProjection.value.copy(w.camera.projectionMatrixInverse);e.composite.uniforms.uFocus.value=w.camera.position.distanceTo(this.look);e.composite.uniforms.uNight.value=.18;e.composite.uniforms.uBloomStrength.value=.25;
      // Project a few stable, accessible DOM targets over the physical objects.
      document.querySelectorAll('#market-pins [data-rig],#market-pins [data-station]').forEach(b=>{
        const rig=b.dataset.rig&&this.rigs[b.dataset.rig],station=b.dataset.station&&this.stations[b.dataset.station];
        if(rig){this.point.copy(rig.group.position);this.point.y+=2.5;}else if(station){this.point.copy(station.position);this.point.setY(2.4);}else return;
        this.point.project(w.camera);b.style.left=Math.max(45,Math.min(width-45,(this.point.x*.5+.5)*width))+'px';b.style.top=Math.max(100,Math.min(height*(small?.57:.63),(-this.point.y*.5+.5)*height))+'px';
      });
      PQMobilePlay.placePins('#market-pins [data-rig],#market-pins [data-station]','#market-top,#market-meter,#market-dock,#market-dialog');
    },
    filmFrame(f,shot,u){
      const r=G.nightMarket.run,arrival=shot.stage==='market-arrive',closing=shot.stage==='market-close';
      const mei=f.place('lead',-4.4,-.6,.5),hero=f.walk('hero',arrival?[[-1,5],[-1,2.5]]:[[-1,-1.6],[0,-1.6]],ease(u));
      const a=f.place('friend',r.plan.space==='bench'?-6.1:4.7,2.6,.3);if(r.plan.space==='bench'){a.group.position.y=.13;a.leftLeg.rotation.x=a.rightLeg.rotation.x=-1;}
      if(arrival){f.hold(f.paper,mei,[0,1.1,.55]);mei.rightArm.rotation.x=-.4;}
      else if(closing){if(M.result(r).achen)f.holdCup(f.cup,a,.75+Math.sin(Math.PI*u)*.5);f.hold(f.paper,mei,[0,1.1,.5]);hero.head.rotation.x=.1*Math.sin(Math.PI*u);}
      else{mei.rightArm.rotation.z=-.5*Math.sin(Math.PI*u);if(M.result(r).achen)f.holdCup(f.cup,a,.8);}
      f.camera(arrival?[13,10,17]:[6.5,5.1,11],arrival?[9.5,7.8,14]:[4.5,4.5,10],[0,1.2,0],[0,1.4,.3],u);
    },
    worldSync(){
      const w=PQIsland,legacy=G.nightMarket?.legacy;if(!w.scene||PQStory3D.active)return;
      if(this.worldLegacy===legacy)return;this.worldLegacy=legacy;this.worldResult=legacy?M.result(legacy.run):null;
      if(this.worldProps){this.worldProps.removeFromParent();PQStory3D.disposeTree(this.worldProps);this.worldProps=null;}if(this.worldTexture){this.worldTexture.dispose();this.worldTexture=null;}
      if(!legacy)return;const p=legacy.run.plan,g=new T.Group(),geo=new T.BoxGeometry(1,1,1),wood=new T.MeshStandardMaterial({color:'#cfb381',roughness:.8}),green=new T.MeshStandardMaterial({color:'#43695c',roughness:.85});
      const b=(x,y,z,sx,sy,sz,mat)=>{const o=new T.Mesh(geo,mat);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=o.receiveShadow=true;g.add(o);};
      // This fixture fits wholly inside the café's existing collision footprint.
      if(p.space==='bench'){b(0,.55,0,.7,.16,1.7,wood);b(-.3,.95,0,.12,.8,1.7,wood);for(const z of [-.65,.65])b(0,.25,z,.55,.5,.1,green);}
      else{for(const y of [.65,1.2])b(0,y,0,.7,.12,1.7,wood);for(const z of [-.65,.65])b(-.3,.65,z,.1,1.3,.1,green);for(let i=0;i<3;i++)b(0,1.37,-.5+i*.5,.2,.25,.2,wood);}
      if(p.sign){b(-.2,1.55,.65,.1,1.8,.1,green);b(-.2,2,.65,.12,.65,.9,wood);}
      if(p.sign){const cv=document.createElement('canvas');cv.width=384;cv.height=256;const ctx=cv.getContext('2d');ctx.fillStyle='#d9c297';ctx.fillRect(0,0,384,256);ctx.fillStyle='#31554c';ctx.textAlign='center';ctx.font='38px sans-serif';ctx.fillText(p.space==='bench'?'慢慢坐':'取餐处 →',192,102);ctx.font='24px sans-serif';ctx.fillText('周末夜市留下的',192,176);this.worldTexture=new T.CanvasTexture(cv);this.worldTexture.colorSpace=T.SRGBColorSpace;const tag=new T.Mesh(new T.PlaneGeometry(.9,.65),new T.MeshStandardMaterial({map:this.worldTexture,roughness:.85}));tag.position.set(-.13,2,.65);tag.rotation.y=Math.PI/2;g.add(tag);}
      g.position.set(-20.1,1.04,6);w.scene.add(g);this.worldProps=g;
    },
    worldUpdate(dt){
      if(!G.nightMarket?.legacy?.run||PQStory3D.active||PQLifeFilm.active)return;this.worldSync();
      const c=PQIsland.citizens.find(c=>c.role==='citizen2');if(!c)return;
      const res=this.worldResult,reduced=PQIsland.environment.reducedMotion;
      this.worldTime=(this.worldTime||0)+(document.hidden||reduced?0:dt);const cycle=this.worldTime%30,rig=c.rig;
      if(res.space==='bench'&&res.achen&&cycle<16){rig.group.position.set(-19.72,1.09,6);rig.group.rotation.y=Math.PI/2;rig.leftLeg.rotation.x=rig.rightLeg.rotation.x=-1;rig.rightArm.rotation.x=-.65;}
      else{const bench=res.space==='bench'&&res.achen,u=bench?Math.sin((cycle-16)/14*Math.PI):cycle<16?cycle/16:1-(cycle-16)/14,x=(bench?-19.72:-18.7)+u*(bench?3.52:2.5),z=5.8+Math.sin(u*Math.PI)*2;rig.group.position.set(x,1.04,z);rig.group.rotation.y=cycle<16?1.5:-1.5;PQIsland.animateCharacter(rig,!reduced,this.worldTime,0);}
    }
  };window.PQNightMarketScene=S;
})();
