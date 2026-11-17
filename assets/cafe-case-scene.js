/* Room-local props and three representative customers; uses the existing render loop. */
(function(){
  'use strict';
  const T=THREE,M=PQCafeModel;
  const S={room:null,active:false,customers:[],props:{},elapsed:0,paused:false,
    decorate(){
      const r=PQStory3D;if(!r.active||r.kind!=='cafe')return;
      if(this.room===r.scene){this.applyLegacy();return;}
      this.room=r.scene;this.props={};
      const group=id=>{const g=new T.Group();r.scene.add(g);this.props[id]=g;return g;};
      let g=group('orders');
      for(let i=0;i<3;i++)g.add(r.box(3.1+i*.04,2.15+i*.025,-3.05,.65,.025,.7,'#eee1c3'));
      const order=r.text(['01','订单'],3.18,2.23,-3.05,.6,.65,'#eee1c3','#43574b');order.rotation.x=-Math.PI/2;g.add(order);
      g=group('signs');
      g.add(r.box(3.8,.85,-1.9,.1,1.7,.12,'#bfa679'));
      g.add(r.text(['取餐 →','看号码，拿好这一杯'],3.8,2,-1.85,2.4,.95,'#224f4c','#f1dfba'));
      for(let i=0;i<3;i++)g.add(r.box(2.5+i*.6,.075,-.65,.4,.012,.12,'#e5c78a'));
      g=group('preorder');g.add(r.box(-1.6,1.15,-1.6,.15,2.3,.15,'#a08058'));
      g.add(r.text(['预点单','下单后到取餐区'], -1.6,2.3,-1.55,1.6,1,'#365d64','#e6e5cf'));
      g=group('helper');g.add(r.box(1.8,2.5,-3.7,1.2,.75,.85,'#65897d',{metalness:.3}));
      g.add(r.text(['双人制作'],1.8,2.85,-3.22,1.3,.45,'#35534b'));
      g=group('menu');g.add(r.text(['今日快取 · 两款','美式 / 拿铁'],6.2,3.5,-5.98,2.2,1.6,'#d1b783','#2b4542'));
      g=group('memory');g.add(r.text(['一起试过的办法','蓝山项目手记'],0,3.4,-5.98,1.5,1.5,'#d1b783','#2b4542'));
      this.applyLegacy();
    },
    applyLegacy(){
      if(!this.room)return;
      const ids=this.active&&this.plan?this.plan:(G.cafeCase?.legacy?.trial.plan||[]);
      const scenario=this.active?G.cafeCase?.scenario:G.cafeCase?.legacy?.scenario;
      for(const [id,g]of Object.entries(this.props))g.visible=id==='orders'||(id==='memory'?!!G.cafeCase?.legacy:ids.includes(id)||(id==='signs'&&scenario===1));
    },
    attach(){
      if(this.active)return;this.decorate();this.active=true;this.customers=[];
      const r=PQStory3D;
      this.positions={};for(const key of ['xiaomei','lijie']){const n=r.npcs[key];if(n){this.positions[key]={p:n.group.position.clone(),y:n.group.rotation.y,v:n.group.visible};}}
      r.npcs.xiaomei.group.position.set(.6,.7,-4.9);r.npcs.xiaomei.group.rotation.y=0;
      r.npcs.lijie.group.visible=false;
      this.playerPosition=r.player.group.position.clone();this.playerRotation=r.player.group.rotation.y;r.player.group.position.set(-2.8,.08,2.8);
      const labels=document.getElementById('case-people');labels.replaceChildren();
      ['citizen2','akai','xiaoyu'].forEach((key,i)=>{
        const rig=PQIsland.createCharacter(key),label=document.createElement('span');label.className='case-person';labels.appendChild(label);
        const cup=new T.Mesh(new T.CylinderGeometry(.12,.1,.2,12),new T.MeshStandardMaterial({color:'#f0dfbb',roughness:.8}));cup.position.set(.48,1.05,.3);cup.visible=false;rig.group.add(cup);
        r.scene.add(rig.group);this.customers.push({rig,cup,label,index:[0,3,7][i],last:''});
      });
      this.projected=new T.Vector3();this.stageKey=null;this.setView('explore','guest');r.resize();
      this.canvas=PQIsland.renderer.domElement;
      this.raycaster=new T.Raycaster();this.pointer=new T.Vector2();
      this.pickHandler=e=>{
        if(this.view!=='explore')return;
        const rect=this.canvas.getBoundingClientRect();
        this.pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
        this.raycaster.setFromCamera(this.pointer,PQIsland.camera);
        const targets=[[this.customers[0].rig.group,'talk',''],[this.props.orders,'read','orders'],[r.npcs.xiaomei.group,'read','staff']];
        const hit=this.raycaster.intersectObjects(targets.map(t=>t[0]),true)[0];
        if(hit){const target=targets.find(t=>t[0].getObjectById(hit.object.id));if(target)PQCafeCase.act(target[1],target[2]);}
      };
      this.canvas.addEventListener('click',this.pickHandler);
    },
    setView(view,stage='guest'){
      if(!this.active)return;
      const key=view+':'+stage;if(this.stageKey===key)return;
      this.stageKey=key;this.view=view;this.stage=stage;PQStory3D.viewKey='';
      const counter=stage==='counter'&&(view==='talk'||view==='evidence');
      this.playerGoal=new T.Vector3(-1.8,.08,counter?-.8:1.7);
      this.guestGoal=new T.Vector3(1,.08,counter?-1.45:1);
      this.customers.forEach(c=>c.label.hidden=true);
    },
    frame(focus,goal){
      const w=PQIsland,small=w.camera.aspect<.8,talk=this.view==='talk',counter=talk&&this.stage==='counter';
      if(talk){
        focus.set(-.25,1.45,counter?-1:1.2);
        goal.set(small?.15:1.4,small?3.3:3.6,counter?(small?10:7):(small?11.8:9.2));
      }else{focus.set(small?-.65:0,1.25,.5);goal.set(small?6.4:8.4,small?9.5:7.5,small?20.3:13);}
    },
    offset(width,height){
      const mobile=width<=700,side=['evidence','workbench','replay'].includes(this.view);
      return {x:side&&!mobile?width*.18:0,y:height*(this.view==='talk'?(mobile?.14:.13):side?(mobile?.23:.06):mobile?.15:.08)};
    },
    updateStage(dt,t){
      const r=PQStory3D,w=PQIsland,reduced=w.environment.reducedMotion,guest=this.customers[0];
      if(!guest)return;
      const move=(rig,target,other,speaking)=>{
        const p=rig.group.position,dist=p.distanceTo(target),moving=dist>.025;
        if(reduced)p.copy(target);else if(moving)p.lerp(target,Math.min(1,dt*4.5));
        const angle=moving&&!reduced?Math.atan2(target.x-p.x,target.z-p.z):Math.max(-.7,Math.min(.85,Math.atan2(other.x-p.x,other.z-p.z)));
        rig.group.rotation.y+=Math.atan2(Math.sin(angle-rig.group.rotation.y),Math.cos(angle-rig.group.rotation.y))*(reduced?1:Math.min(1,dt*7));
        w.animateCharacter(rig,moving&&!reduced,reduced?0:t,0);
        rig.head.rotation.y=reduced?0:Math.sin(t*.8)*.035;
        if(!reduced&&speaking&&!moving){rig.rightArm.rotation.x=-.18+Math.sin(t*1.8)*.09;rig.head.rotation.x=Math.sin(t*1.3)*.025;}
        else rig.head.rotation.x=0;
      };
      guest.rig.group.visible=true;guest.cup.visible=false;
      move(r.player,this.playerGoal,this.guestGoal,false);move(guest.rig,this.guestGoal,this.playerGoal,this.view==='talk');
      for(let i=1;i<this.customers.length;i++){
        const c=this.customers[i];c.rig.group.visible=this.view!=='talk';c.cup.visible=false;
        c.rig.group.position.set(i===1?-5.7:5.9,.08,i===1?2.5:3.5);c.rig.group.rotation.y=i===1?1:-1;
        w.animateCharacter(c.rig,false,reduced?0:t,i);
      }
      for(const c of this.customers)c.label.hidden=true;
      if(this.view==='explore'){
        const targets=[['case-achen',guest.rig.group.position,2.6],['case-orders',{x:3.4,y:2.1,z:-2.5},.1],['case-staff',r.npcs.xiaomei.group.position,2.6]];
        const width=w.renderer.domElement.clientWidth,height=w.renderer.domElement.clientHeight;
        for(const [id,p,h]of targets){const el=document.getElementById(id),v=this.projected.set(p.x,p.y+h,p.z).project(w.camera);
          const x=(v.x*.5+.5)*width,y=(-v.y*.5+.5)*height;
          el.style.left=Math.max(60,Math.min(width-70,x))+'px';el.style.top=Math.max(108,Math.min(height*.65,y))+'px';
        }
      }
    },
    play(result,plan){
      this.result=result;this.plan=plan;this.elapsed=0;this.paused=PQIsland.environment.reducedMotion;
      this.applyLegacy();
      const li=PQStory3D.npcs?.lijie;
      if(li){li.group.visible=plan.includes('helper');if(li.group.visible){li.group.position.set(3.3,.7,-4.9);li.group.rotation.y=0;}}
      if(this.paused)this.elapsed=Math.min(4,result.end);
    },
    update(dt,t){
      if(!this.active||!this.result)return;
      const r=PQStory3D,w=PQIsland;
      if(this.view!=='observe'&&this.view!=='replay'){this.updateStage(dt,t);return;}
      if(!this.paused&&!document.hidden)this.elapsed+=Math.min(dt,.08)*.8;
      if(this.elapsed>this.result.end+3)this.elapsed=0;
      const clock=this.elapsed,small=w.camera.aspect<.8;let shownLabels=0;
      for(const [i,c]of this.customers.entries()){
        const o=this.result.orders[c.index],p=c.rig.group.position;
        let x=5.8,z=4.8,moving=false,status='到店',visible=clock>=o.arrival&&clock<=o.leave+1.5;
        const lerp=(a,b,n)=>a+(b-a)*Math.max(0,Math.min(1,n));
        if(clock>=o.leave){const n=(clock-o.leave)/1.5;x=lerp(2.2+i*.7,6.8,n);z=lerp(-.9+i*.65,5.5,n);moving=true;status=o.served?'拿到了，出发！':o.menuMiss?'想喝特调，下次吧':'赶车，先走了';}
        else if(clock<o.ordered+.5){const n=(clock-o.arrival)/Math.max(.7,o.ordered+.5-o.arrival);x=lerp(5.8,-.5,n);z=lerp(4.8,-1.3,n);moving=true;status='点单';}
        else if(clock<o.ready){x=.1+i*.85;z=.9+i*.4;status='等出杯';}
        else if(clock<o.leave){x=2.2+i*.7;z=-.9+i*.65;status=this.plan.includes('signs')?'按号码取餐':'辨认自己的杯子';}
        const dx=x-p.x,dz=z-p.z;if(moving&&(dx*dx+dz*dz)>.0001)c.rig.group.rotation.y=Math.atan2(dx,dz);
        p.set(x,.08,z);c.rig.group.visible=visible;w.animateCharacter(c.rig,moving,w.environment.reducedMotion?0:t,i);
        c.cup.visible=o.served&&clock>=o.leave;
        const label=c.label;label.hidden=!visible;
        if(visible){const v=p.clone();v.y+=2.65;v.project(w.camera);const width=w.renderer.domElement.clientWidth,height=w.renderer.domElement.clientHeight;
          const xx=(v.x*.5+.5)*width,yy=(-v.y*.5+.5)*height;
          label.hidden=v.z>1||xx<35||xx>width*(small?.96:.62)||yy<(small?150:95)||yy>height*(small?.47:.8)||(small&&shownLabels>0);
          if(!label.hidden)shownLabels++;
          label.style.transform=`translate(${xx}px,${yy}px) translate(-50%,-100%)`;
          const text=(i===0?'阿晨':`顾客 ${o.id}`)+' · '+status;if(c.last!==text){label.textContent=text;c.last=text;}
        }
      }
      const first=this.result.orders[0],sentence=clock<first.arrival?'开门了，熟客正在赶来。':clock<first.ready?'阿晨下了单，等待这杯咖啡。':clock<first.leave?'咖啡已经做好，阿晨还在柜台前。':first.served?'阿晨拿到了咖啡，朝公交站走去。':'阿晨空着手走了，杯子留在柜台。';
      const status=document.getElementById('case-scene-status');if(status&&status.textContent!==sentence)status.textContent=sentence;
    },
    detach(){
      if(!this.active)return;this.active=false;
      this.canvas?.removeEventListener('click',this.pickHandler);this.pickHandler=null;this.canvas=null;
      const r=PQStory3D;
      for(const c of this.customers){c.rig.group.removeFromParent();r.disposeTree(c.rig.group);c.label.remove();}this.customers=[];
      for(const [key,s]of Object.entries(this.positions||{})){const n=r.npcs[key];if(n){n.group.position.copy(s.p);n.group.rotation.y=s.y;n.group.visible=s.v;}}
      if(r.player&&this.playerPosition){r.player.group.position.copy(this.playerPosition);r.player.group.rotation.y=this.playerRotation;r.player.head.rotation.x=0;}
      this.plan=null;this.stageKey=null;this.view=null;this.applyLegacy();r.resize();
    },
    reset(){this.detach();this.room=null;this.props={};this.result=null;}
  };
  window.PQCafeScene=S;
})();
