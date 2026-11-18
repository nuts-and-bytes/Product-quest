/* Scene choreography runs inside PQStory3D's existing frame loop. */
(function(){
  'use strict';
  const T=THREE,M=PQChapterJourney,ease=n=>{n=Math.max(0,Math.min(1,n));return n*n*(3-2*n);};
  const S={active:false,pending:false,
    attach(c){
      this.chapter=c;this.active=true;this.key=null;this.elapsed=0;this.pending=false;this.view='explore';
      const r=PQStory3D;r.ensureNpc(c.npcs[1].key);this.rigs=[r.player,...c.npcs.map(n=>r.npcs[n.key])];
      this.table=c.id==='1'?new PQChapterTable(r,c):null;
      this.rigs.forEach((rig,i)=>rig.group.position.set([-1.5,1.35,3.8][i],.08,[2.2,1.2,-1.2][i]));
      this.props=c.clues.map((e,i)=>{const p=[[-5.5,1.05,-1.5],[-3.85,1.05,-1.5],[-4.7,1.05,.45]][i],position=new T.Vector3(...p),group=PQChapterRooms.evidence(r,e.prop,...p);for(const child of group.children)child.position.sub(position);group.position.copy(position);return {id:e.id,position,goal:position.clone(),group};});
      this.signals=[];for(let i=0;i<3;i++){const m=new T.Mesh(new T.SphereGeometry(.075,8,6),new T.MeshStandardMaterial({color:'#668880',emissive:'#668880',emissiveIntensity:.3}));m.position.set(-3.25+i*.22,1.1,.5);r.group.add(m);this.signals.push(m);}
      const record=PQCampaign.record();if(record.committed)r.text([c.reward,'已经留下的那次尝试'],4.6,3.3,-6.04,3.2,1.05,'#bba577','#2b504c');
      this.camera=new T.Vector3(8.4,7.2,12.8);this.look=new T.Vector3(-.5,1.3,.2);this.from=this.camera.clone();this.lookFrom=this.look.clone();this.goal=this.camera.clone();this.lookGoal=this.look.clone();this.projected=new T.Vector3();this.offset={x:0,y:0};this.offsetFrom={x:0,y:0};
      this.raycaster=new T.Raycaster();this.pointer=new T.Vector2();this.canvas=PQIsland.renderer.domElement;
      this.pick=e=>{
        if(!this.active||!['explore','workbench'].includes(PQCampaign.mode)||this.pending||PQLifeFilm.active)return;
        const bounds=this.canvas.getBoundingClientRect();this.pointer.set((e.clientX-bounds.left)/bounds.width*2-1,-(e.clientY-bounds.top)/bounds.height*2+1);
        this.raycaster.setFromCamera(this.pointer,PQIsland.camera);
        if(PQCampaign.mode==='workbench'){
          const cards=this.table?.cards||[],hit=this.raycaster.intersectObjects(cards.map(c=>c.group),true)[0];if(hit){const card=cards.find(c=>c.group.getObjectById(hit.object.id));if(card)this.table.choose(card);}return;
        }
        const targets=[...c.npcs.map(n=>({group:r.npcs[n.key].group,act:'talk',id:n.key})),...this.props.map(p=>({...p,act:'read'}))];
        const hit=this.raycaster.intersectObjects(targets.map(t=>t.group),true)[0];if(!hit)return;
        const target=targets.find(t=>t.group.getObjectById(hit.object.id));if(target)PQCampaign.act(target.act,target.id);
      };
      this.canvas.addEventListener('click',this.pick);this.applyResult();
    },
    detach(){if(this.canvas&&this.pick)this.canvas.removeEventListener('click',this.pick);this.table?.detach();this.table=null;this.active=false;this.pending=false;this.rigs=[];this.props=[];this.signals=[];this.canvas=null;this.pick=null;this.key=null;},
    applyResult(){
      const r=PQCampaign.record(),res=M.result(G.campaign,PQCampaign.chapter),color=res?(res.good?'#c9df9e':'#e4b579'):'#7faba0';
      this.signals?.forEach((m,i)=>{m.visible=i<(res?3:r.notes.length);m.material.color.set(color);m.material.emissive.set(color);});
    },
    setView(view,npc,key){
      this.applyResult();this.table?.setView(view);this.props.forEach(p=>p.group.visible=!(this.table&&view==='workbench'));if(this.key===key)return;
      const first=this.key===null;this.key=key;this.view=view;this.npc=npc||this.chapter.npcs[0].key;this.elapsed=0;
      this.from.copy(this.camera);this.lookFrom.copy(this.look);this.offsetFrom={...this.offset};
      this.starts=this.rigs.map(r=>r.group.position.clone());this.pending=!first&&!PQCafeScene.reduced();this.duration=this.pending?.72:0;
      this.lastStep=0;this.targets=this.rigs.map((r,i)=>new T.Vector3(i===0?-1.5:i===1?1.35:3.8,.08,i===0?2.2:i===1?1.2:-1.2));
      if(view==='talk'){
        const active=this.chapter.npcs.findIndex(n=>n.key===this.npc)+1;
        this.targets[active].set(1.35,.08,1.2);this.targets[0].set(-1.5,.08,2.2);
      }else if(['evidence','journal','workbench'].includes(view))this.targets[0].set(-2.5,.08,1.5);
      if(!this.pending)this.elapsed=1;this.update(0,performance.now()/1000);
    },
    finish(){if(!this.active)return;this.elapsed=Math.max(1,this.duration);this.pending=false;this.update(0,performance.now()/1000);PQCampaign.reveal();},
    update(dt,t){
      if(!this.active)return;const w=PQIsland,r=PQStory3D,e=w.environment,small=w.camera.aspect<.8,reduced=PQCafeScene.reduced();
      this.elapsed+=document.hidden?0:Math.min(.05,dt);const p=reduced?1:this.duration?ease(this.elapsed/this.duration):1;
      if(this.pending&&p>=1){this.pending=false;PQCampaign.reveal();}
      const talk=this.view==='talk',evidence=['evidence','journal'].includes(this.view),panel=!['explore','talk'].includes(this.view);
      if(talk){this.goal.set(small?.2:.6,small?3.9:3.2,small?11:9.2);this.lookGoal.set(0,1.45,1.4);}
      else if(this.table&&this.view==='workbench'){this.goal.set(small?-3.8:-1.5,small?10.8:8.5,small?11:9.4);this.lookGoal.set(-4.7,1.2,-.2);}
      else if(evidence){this.goal.set(small?1:.2,small?7:4.4,small?13:7.4);const prop=this.props.find(p=>p.id===PQCampaign.detail);if(prop){this.lookGoal.copy(prop.position);this.lookGoal.y+=.55;this.goal.set(prop.position.x+(small?1.5:1.8),prop.position.y+(small?5.5:3.6),prop.position.z+(small?7:4.2));}else this.lookGoal.set(-4.1,1.25,-.3);}
      else{this.goal.set(small?7:8.4,small?9:7.2,small?20:12.8);this.lookGoal.set(panel?-1.4:-.5,1.3,.2);}
      this.camera.lerpVectors(this.from,this.goal,p);this.look.lerpVectors(this.lookFrom,this.lookGoal,p);
      w.camera.position.copy(this.camera);w.camera.lookAt(this.look);
      const beside=PQMobilePlay.landscape()||(w.camera.aspect>1&&talk);
      const x=beside?.21:panel&&!small?.17:0,y=beside?.02:talk?(small?.18:.14):panel?(small?.23:.05):small?.15:.08;
      this.offset.x=this.offsetFrom.x+(x-this.offsetFrom.x)*p;this.offset.y=this.offsetFrom.y+(y-this.offsetFrom.y)*p;
      const width=this.canvas.clientWidth,height=this.canvas.clientHeight;w.camera.setViewOffset(width,height,width*this.offset.x,height*this.offset.y,width,height);
      w.camera.updateMatrixWorld();
      const inspectAlpha=reduced?1:1-Math.exp(-dt*8);
      for(const prop of this.props){const selected=evidence&&PQCampaign.detail===prop.id;prop.goal.copy(prop.position);if(selected)prop.goal.y+=.55;prop.group.position.lerp(prop.goal,inspectAlpha);prop.group.scale.setScalar(prop.group.scale.x+((selected?1.3:1)-prop.group.scale.x)*inspectAlpha);prop.group.rotation.x+=((selected?.35:0)-prop.group.rotation.x)*inspectAlpha;}
      this.table?.update(dt,reduced);
      const active=this.chapter.npcs.findIndex(n=>n.key===this.npc)+1;
      this.rigs.forEach((rig,i)=>{
        rig.group.visible=!talk||i===0||i===active;
        const target=this.targets?.[i]||rig.group.position,start=this.starts?.[i]||target,moving=p<1&&start.distanceTo(target)>.04;
        rig.group.position.lerpVectors(start,target,p);rig.group.rotation.y=moving?Math.atan2(target.x-start.x,target.z-start.z):i===0?.65:-.6;
        w.animateCharacter(rig,moving&&!reduced,reduced||evidence?0:t,i);
        rig.head.rotation.x=0;rig.rightArm.rotation.z=rig.leftArm.rotation.z=0;
        if(talk&&i===active&&!reduced){const beat=Math.sin(Math.PI*Math.min(1,this.elapsed/.85));rig.head.rotation.x=.1*beat;rig.rightArm.rotation.x-=.3*beat;}
        if(reduced){rig.head.rotation.y=0;rig.leftLeg.rotation.x=rig.rightLeg.rotation.x=rig.leftArm.rotation.x=rig.rightArm.rotation.x=0;}
      });
      if(this.pending&&!reduced&&this.elapsed-this.lastStep>.35){this.lastStep=this.elapsed;SFX.foley('step');}
      if(this.view==='explore'){
        const pins=[...document.querySelectorAll('#chapter-pins button')],points=[...this.rigs.slice(1).map(r=>r.group.position),new T.Vector3(-4.65,1.1,-.6)];
        points.forEach((point,i)=>{const b=pins[i];if(!b)return;this.projected.copy(point);this.projected.y+=i<2?2.65:.8;this.projected.project(w.camera);b.style.left=Math.max(85,Math.min(width-90,(this.projected.x*.5+.5)*width))+'px';b.style.top=Math.max(92,Math.min(height*.62,(-this.projected.y*.5+.5)*height))+'px';});
        PQMobilePlay.placePins('#chapter-pins button','#chapter-top,#chapter-explore');
      }
      r.dust.visible=e.tier>0;if(!reduced&&!evidence)r.dust.rotation.y=Math.sin(t*.08)*.025;
      e.shafts.uniforms.uStrength.value=0;e.composite.uniforms.uInvProjection.value.copy(w.camera.projectionMatrixInverse);e.composite.uniforms.uFocus.value=w.camera.position.distanceTo(this.look);e.composite.uniforms.uNight.value=0;e.composite.uniforms.uBloomStrength.value=.18;
    },
    buildFilmProps(f){
      // A handful of reusable tabletop pieces enact the chosen experiment in the room.
      const g=new T.Group(),paper=new T.MeshStandardMaterial({color:'#ead6a6',roughness:.85}),green=new T.MeshStandardMaterial({color:'#8fbba8',roughness:.8}),gold=new T.MeshStandardMaterial({color:'#e1b55f',metalness:.25,roughness:.5}),box=new T.BoxGeometry(1,1,1);
      const mesh=(mat,x,y,z,sx,sy,sz)=>{const m=new T.Mesh(box,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;};
      const cards=[0,1,2].map(i=>mesh(paper,-5.5+i*.8,1.13,-.2,.65,.04,.6));
      const tokens=[0,1].map(i=>mesh(gold,-5.5,1.26,-.2,.22,.17,.22));
      const bars=[0,1].map(i=>mesh(green,-5.1+i*1.05,1.3,-.1,.55,.3,.5));
      const coins=Array.from({length:10},(_,i)=>{const m=new T.Mesh(new T.CylinderGeometry(.12,.12,.035,10),gold);m.castShadow=true;g.add(m);return m;});
      f.props.add(g);f.demo={group:g,cards,tokens,bars,coins};
    },
    filmFrame(f,shot,u,t){
      const c=this.chapter,good=f.film.result?.good,world=shot.world;
      const demo=shot.stage==='chapter-result'&&c.id!=='8';f.demo.group.visible=demo;
      this.props.forEach(p=>p.group.visible=!demo);
      if(world){
        // The community porch is congested; use its clear eastern path, as in the café film.
        let d=PQIsland.buildings[c.building].doorPos.clone(),b=PQ.buildings.find(b=>b.id===c.building),out=new T.Vector3(d.x-b.wx,0,d.z-b.wz).normalize();
        if(c.building==='home'){d.set(-11,1.04,17.5);out.set(1,0,-.3).normalize();}
        const right=new T.Vector3(out.z,0,-out.x),a=d.clone().addScaledVector(out,.5),friend=d.clone().addScaledVector(right,2.3).addScaledVector(out,.3);
        const hero=d.clone().addScaledVector(out,3.4).addScaledVector(right,-1.6),yaw=Math.atan2(out.x,out.z);
        const lead=f.place('lead',a.x,a.z,yaw),other=f.place('friend',friend.x,friend.z,yaw-.4);f.place('hero',hero.x,hero.z,yaw+Math.PI);
        if(shot.stage==='chapter-street'){
          lead.rightArm.rotation.z=-.65*Math.sin(Math.PI*u);f.hold(f.paper,other,[0,1.2,.5]);f.paper.rotation.x=.35;
        }else{
          const end=a.clone().addScaledVector(out,1.5).addScaledVector(right,.4),walk=f.walk('lead',[[a.x,a.z],[end.x,end.z]],ease(u));
          if(good){f.hold(f.paper,walk,[.1,1.1,.5]);f.paper.rotation.x=.35;}else walk.head.rotation.x=.12;
          other.head.rotation.x=.08*Math.sin(Math.PI*u);
        }
        const look=d.clone();look.y=2;const from=d.clone().addScaledVector(out,11).addScaledVector(right,3);from.y=8.8;const to=from.clone().addScaledVector(out,-1);to.y=7.9;
        f.camera(from.toArray(),to.toArray(),look.toArray(),look.toArray(),u);
      }else{
        const lead=f.place('lead',1.35,1.2,-.6),other=f.place('friend',3.8,-1.2,-.9),hero=f.place('hero',-1.5,2.2,.65);
        if(shot.stage==='chapter-meet'){
          const mover=f.walk('hero',[[-2.4,3.5],[-1.5,2.2]],ease(u/.8));if(u>.8)mover.group.rotation.y=.65;
          f.hold(f.paper,lead,[0,1.2,.48]);f.paper.rotation.x=.3;other.head.rotation.y=-.2;
          f.camera([8.4,6.3,12.4],[5.8,4.8,9.7],[0,1.4,.5],[0,1.4,.7],u);
        }else if(c.id==='8'){
          const lift=.7+Math.sin(Math.PI*u)*.7;f.holdCup(f.cup,lead,lift);f.holdCup(f.otherCup,hero,lift);
          other.head.rotation.x=.08*Math.sin(Math.PI*u);
          f.camera([3.6,3.7,8.3],[2.3,3.25,7.6],[.4,1.5,1],[.4,1.5,1.2],u);
        }else{
          const d=f.demo,p=M.result(G.campaign,c.id),trial=PQCampaign.record().trials[PQCampaign.record().selected]||PQCampaign.record().committed,plan=trial.plan,progress=ease(u);
          f.place('hero',-3.3,2.45,-2.6);f.place('lead',-1.8,-.5,-1.4);f.place('friend',1.2,1.6,-1.1);
          d.cards.forEach((m,i)=>{m.visible=true;m.position.set(-5.5+i*.8,1.13,-.2);m.rotation.set(0,0,0);});
          d.tokens.forEach(m=>m.visible=false);d.bars.forEach(m=>m.visible=false);d.coins.forEach(m=>m.visible=false);
          if(c.id==='1'){
            const card=d.cards[2];card.position.x=-2.6-2.1*progress;card.position.y=1.13+Math.sin(Math.PI*progress)*.38;card.rotation.y=.2*(1-progress);lead.rightArm.rotation.x=-.65*Math.sin(Math.PI*u);
          }else if(c.id==='2'||c.id==='3'){
            const order=plan[c.id==='2'?'journey':'flow'],correct=c.sequence.items.map(o=>o.id);
            d.cards.forEach((m,i)=>{m.position.x=-5.5+order.indexOf(correct[i])*.8;m.position.y=1.13+.16*Math.sin(Math.PI*Math.max(0,Math.min(1,u*3-i)));});
            d.tokens[0].visible=true;d.tokens[0].position.set(-5.5+1.6*progress,1.28,-.2);
          }else if(c.id==='4'){
            d.tokens[0].visible=true;d.tokens[0].position.set(-5.5+1.6*Math.min(1,u*2),1.28,-.2);
            if(u>.5){d.tokens[1].visible=plan.identity!=='same';d.tokens[1].position.set(-5.5+1.6*(u-.5)*2,1.28,.15);}
            lead.head.rotation.x=.15*Math.sin(Math.PI*u);
          }else if(c.id==='5'){
            d.cards.forEach((m,i)=>m.position.y=1.13+(u>(i+1)/4?.12:0));
            d.tokens[0].visible=true;d.tokens[0].position.set(-5.5+Math.min(2,Math.floor(u*3))*.8,1.36,-.2);
            lead.rightArm.rotation.x=-.8*Math.sin(Math.PI*u);
          }else if(c.id==='6'){
            d.cards.forEach(m=>m.visible=false);d.bars.forEach((m,i)=>{const count=p.metrics[i].value,max=Math.max(p.metrics[0].value,p.metrics[1].value),h=.3+1.2*(count/max)*(i?progress:1);m.visible=true;m.scale.y=h;m.position.y=1.1+h/2;});
          }else if(c.id==='7'){
            d.cards.forEach((m,i)=>m.visible=i===0);d.coins.forEach((m,i)=>{m.visible=plan.consent==='optin'&&i<p.metrics[0].value;m.position.set(-3.2-1.7*progress+(i%3)*.25,1.13+Math.floor(i/3)*.04,-.3);});
            lead.rightArm.rotation.x=-.55*Math.sin(Math.PI*u);
          }
          lead.head.rotation.x=(good?.12:.22)*Math.sin(Math.PI*u);lead.rightArm.rotation.x=-.4*Math.sin(Math.PI*u);
          hero.head.rotation.x=.1*Math.sin(Math.PI*u);
          f.camera([1.1,5.4,7.4],[.4,4.7,6.8],[-3.6,1.25,-.1],[-3.8,1.25,-.1],u);
        }
      }
    }
  };
  window.PQChapterScene=S;
})();
