/* Intimate rooms share the island renderer, avatar and adaptive post-processing.
   Only the current room is allocated; the exterior simulation sleeps indoors. */
(function(){
  'use strict';
  const T=THREE;
  const R={active:false,kind:null,actors:[],ownedTextures:[],hotspots:[],speaker:null,
    enter(kind,npc='boss',night){
      const w=PQIsland;w.init();
      if(this.active&&this.kind===kind){this.ensureNpc(npc);return;}
      if(this.active)this.exit();
      this.saved={scene:w.scene,position:w.camera.position.clone(),target:{...w.camCurTarget},spherical:{...w.curSpherical},cinematic:w.cinematicMode};
      this.viewOffset=null;this.active=true;this.kind=kind;this.night=night??(w.curTod.starOp>.4);this.speaker=null;this.actors=[];this.npcs={};this.ownedTextures=[];this.hotspots=[];
      w.keys={};w.walkGoal=null;w.walkPath=[];w.joyVec={x:0,z:0};w.diveAnim=null;
      this.scene=new T.Scene();this.scene.background=new T.Color('#263c40');this.scene.fog=new T.Fog('#263c40',32,65);
      this.group=new T.Group();this.scene.add(this.group);w.scene=this.scene;
      this.materials={};this.boxGeometry=new T.BoxGeometry(1,1,1);
      this.buildRoom(kind);
      this.player=w.createCharacter('me');this.player.group.position.set(-1.65,.08,2.05);this.player.group.rotation.y=.65;
      this.scene.add(this.player.group);this.actors.push(this.player);
      this.ensureNpc(npc);
      if(kind==='cafe'){this.ensureNpc(npc==='lijie'?'xiaomei':'lijie');this.ensureNpc(npc);}
      const ambient=new T.HemisphereLight('#d5eeed','#9a6952',1.65);this.scene.add(ambient);
      const sun=new T.DirectionalLight('#ffe7c6',this.night?1.9:2.6);sun.position.set(-5,9,2);sun.castShadow=true;
      Object.assign(sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:.2,far:35});
      sun.shadow.mapSize.set(1024,1024);sun.shadow.normalBias=.035;sun.shadow.bias=-.0001;sun.shadow.radius=2;
      this.scene.add(sun);sun.target.position.set(0,0,-1);this.scene.add(sun.target);
      const fill=new T.DirectionalLight('#9ecfd5',1.0);fill.position.set(4,5,7);this.scene.add(fill);
      this.sun=sun;
      this.focusTarget=new T.Vector3(0,1.25,.5);this.lookTarget=this.focusTarget.clone();this.camPosition=new T.Vector3(10,8,14);
      w.camera.clearViewOffset();w._viewKey=null;
      this.resize(true);
      document.getElementById('game').classList.add('story-mode');
      if(kind==='cafe'&&window.PQCafeScene)PQCafeScene.decorate();
      w.environment.lastFrame=0;w.environment.warmup=performance.now()+1200;
      if(!w.running){w.running=true;w._lastTime=performance.now();w._loop(w._lastTime);}
    },
    mat(color,extra){
      const key=color+JSON.stringify(extra||{});
      return this.materials[key]||(this.materials[key]=new T.MeshStandardMaterial({color,roughness:.75,...extra}));
    },
    box(x,y,z,sx,sy,sz,color,extra){
      const m=new T.Mesh(this.boxGeometry,this.mat(color,extra));m.position.set(x,y,z);m.scale.set(sx,sy,sz);
      m.castShadow=true;m.receiveShadow=true;this.group.add(m);return m;
    },
    cylinder(x,y,z,r,h,color){
      const m=new T.Mesh(new T.CylinderGeometry(r,r*.88,h,16),this.mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;this.group.add(m);return m;
    },
    text(lines,x,y,z,width,height,bg='#173b3d',ink='#ecdec0'){
      const cv=document.createElement('canvas');cv.width=768;cv.height=Math.round(768*height/width);
      const c=cv.getContext('2d');c.fillStyle=bg;c.fillRect(0,0,cv.width,cv.height);
      c.strokeStyle=ink+'44';c.strokeRect(16,16,cv.width-32,cv.height-32);
      c.textAlign='center';c.textBaseline='middle';c.fillStyle=ink;
      lines.forEach((line,i)=>{c.font=`${i===0?'500':'400'} ${i===0?52:33}px "PingFang SC",sans-serif`;c.fillText(line,384,cv.height*(i+1)/(lines.length+1),710);});
      const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;this.ownedTextures.push(tex);
      const m=new T.Mesh(new T.PlaneGeometry(width,height),new T.MeshStandardMaterial({map:tex,roughness:.9}));
      m.position.set(x,y,z);this.group.add(m);return m;
    },
    plant(x,z,scale=1){
      this.cylinder(x,.35*scale,z,.35*scale,.7*scale,'#b97856');
      this.cylinder(x,.9*scale,z,.04*scale,1.4*scale,'#526c51');
      for(let i=0;i<7;i++){
        const a=i*2.4,y=(.95+i*.13)*scale;
        const leaf=new T.Mesh(new T.SphereGeometry(1,8,6),this.mat(i%2?'#4c8866':'#7c9f68'));
        leaf.scale.set(.2*scale,.52*scale,.16*scale);leaf.rotation.set(.4*Math.cos(a),a,.65*Math.sin(a));
        leaf.position.set(x+Math.sin(a)*.3*scale,y,z+Math.cos(a)*.3*scale);leaf.castShadow=true;this.group.add(leaf);
      }
    },
    chair(x,z,color='#426c68'){
      this.box(x,.65,z,1.15,.22,1.05,color);
      this.box(x,1.15,z-.45,1.15,.95,.16,color);
      for(const dx of [-.42,.42])for(const dz of [-.36,.36])this.box(x+dx,.32,z+dz,.09,.65,.09,'#574e46');
    },
    cup(x,y,z){
      const body=this.cylinder(x,y,z,.13,.22,'#ede2c8'),coffee=this.cylinder(x,y+.115,z,.105,.012,'#553f31');
      const handle=new T.Mesh(new T.TorusGeometry(.09,.025,6,12),this.mat('#ede2c8'));handle.position.set(x+.14,y+.02,z);this.group.add(handle);
      return [body,coffee,handle];
    },
    buildRoom(kind){
      const cafe=kind==='cafe';
      this.counterCups=[];
      const custom=kind==='nightmarket'||window.PQChapterRooms?.supports(kind);
      if(kind==='nightmarket')PQNightMarketScene.buildRoom(this);else if(custom)PQChapterRooms.build(this,kind);
      if(!custom){
      this.box(0,-.2,0,16,.4,13,'#785d48');
      // Long oak boards and dark seams, simple shared geometry and materials.
      for(let i=0;i<16;i++)this.box(-7.5+i,.015,0,.975,.05,12.8,i%3===0?'#a98b63':i%3===1?'#b59770':'#bfa17a');
      this.box(0,3.1,-6.45,16,6.2,.25,cafe?'#d3c0a1':'#b8c5b6');
      this.box(0,.9,-6.25,16,1.8,.18,'#2c5555');
      this.box(0,1.85,-6.1,16,.1,.16,'#bd9d62');
      this.box(-7.85,3.1,-.2,.25,6.2,12.5,'#c6c5ae');
      this.box(-7.68,.9,-.2,.18,1.8,12.5,'#2c5555');
      // A bay window with an ocean view and distant island silhouettes.
      this.box(-4.3,3.85,-6.05,5.4,3.5,.13,'#d7e4da');
      const night=this.night;
      this.box(-4.3,3.85,-5.95,5.1,3.25,.08,night?'#36576e':'#9bc9c8',{emissive:night?'#547f93':'#8abdbb',emissiveIntensity:.18});
      this.box(-4.3,2.65,-5.88,5.1,.8,.06,'#79a9a5');
      for(let i=0;i<5;i++)this.box(-6.4+i*.92,2.92+Math.sin(i)*.13,-5.83,.85,.28+i%2*.13,.05,'#7b9690');
      for(const x of [-6.95,-4.3,-1.65])this.box(x,3.85,-5.75,.1,3.65,.22,'#335d5b');
      this.box(-4.3,3.65,-5.7,5.45,.1,.2,'#335d5b');this.box(-4.3,2.1,-5.65,5.7,.15,.55,'#c0a17b');
      // Window light remains cheap: soft emissive floor patches plus real directional shadows.
      for(let i=0;i<3;i++){
        const patch=this.box(-3.5+i*1.25,.053,-3,1.05,.008,3.8,'#ead2a1',{transparent:true,opacity:night?0:.19,depthWrite:false});
        patch.rotation.y=-.35;patch.castShadow=false;
      }
      this.plant(-6.3,-3,1.3);this.plant(6.3,-4.6,1.45);this.plant(-6.5,4,.85);
      for(const x of [-2.5,3.8]){
        this.cylinder(x,5.7,-1,.025,1,'#4a5047');
        const shade=new T.Mesh(new T.ConeGeometry(.65,.38,24,1,true),this.mat('#d6b985',{side:T.DoubleSide}));
        shade.position.set(x,5.1,-1);this.group.add(shade);
        this.cylinder(x,4.95,-1,.32,.05,'#fff0bf');
      }
      if(cafe){
        this.text(['BLUE MOUNTAIN','蓝山 · 好好喝一杯'],2.9,4.55,-6.08,4.7,1.7);
        this.box(2,1,-3.7,6.8,2,1.65,'#6b6654');this.box(2,2.05,-3.7,7.1,.15,1.85,'#dfc9a0');
        for(let i=0;i<18;i++)this.box(-1.25+i*.38,.98,-2.84,.065,1.75,.06,'#c3a46e');
        this.box(3.9,2.48,-3.7,1.25,.74,.85,'#3f615c',{metalness:.35});this.box(3.9,2.49,-3.2,.92,.22,.12,'#c6cfbd',{metalness:.6});
        for(let i=0;i<3;i++)this.counterCups.push(...this.cup(.4+i*.7,2.22,-3.5));
        this.text(['今日手冲','山风 / 坚果 / 巧克力'],6.2,3.5,-6.07,2.1,1.5,'#304842');
        this.cylinder(-3.8,.9,0,1.3,.15,'#c8ab7e');this.cylinder(-3.8,.45,0,.13,.9,'#465b52');
        this.chair(-3.8,-1.15);this.chair(-3.8,1.25);this.cup(-3.6,1.09,0);
        this.box(-4.1,1.01,.1,.5,.025,.32,'#d0a36f');
        this.text(['攒钱计划','周三，还是老位置。'],5.2,2.7,-2.78,1.5,.85,'#d6bd8c','#4b5146');
        this.chair(4.3,.2,'#b37857');this.chair(5.8,.2,'#b37857');
        this.box(5,.9,1.45,2.3,.14,1.05,'#bda27d');
        this.cup(4.7,1.1,1.45);
        this.text(['01','只管坐一会儿'],0,3.4,-6.08,1.1,1.35,'#d0b389','#344e49');
      }else{
        this.box(.2,.07,2.65,7.8,.025,4.6,'#486f68');
        for(const x of [-3.6,4])this.box(x,.085,2.65,.035,.01,4.4,'#bfa777');
        for(const z of [.45,4.85])this.box(.2,.085,z,7.6,.01,.035,'#bfa777');
        this.text(['SPARK / 星火科技','先问为什么，再决定做什么。'],2.85,4.85,-6.05,5.5,1.35);
        this.box(1.25,1.02,-.9,5.5,.18,2.3,'#b69569');
        for(const x of [-1,3.5])this.box(x,.5,-.9,.16,1,.95,'#365956');
        this.chair(1.6,-2.7);this.chair(-.6,1.1);this.chair(2.1,1.1);
        this.box(.3,1.58,-1.35,1.25,.75,.09,'#314b4e');
        this.box(.3,1.58,-1.28,1.12,.62,.02,'#8cb6ac',{emissive:'#699e98',emissiveIntensity:.3});
        this.box(.3,1.15,-1.37,.08,.25,.08,'#40595b');this.cup(2.8,1.25,-.9);
        this.box(1.7,1.13,-.65,.85,.025,.55,'#eee3ca');
        this.text(['年轻人不会管钱？','问题 / 证据 / 下一步'],5.6,3.3,-6.06,3.1,1.8,'#eee4c8','#345451');
        for(let i=0;i<4;i++)this.box(4.6+i*.65,2.6,-5.92,.48,.4,.02,i%2?'#e9c788':'#a6c3ad');
        this.box(-5,1.1,2.7,3.2,.65,1.25,'#487a71');this.box(-5,1.65,2.2,3.2,.8,.25,'#487a71');
        this.box(-5,.55,2.7,2.6,.5,.8,'#5e5847');
        this.text(['DAY 01','欢迎来到星火'],0,3.4,-6.05,1.2,1.6,'#d7bc8a','#3a5752');
      }
      }
      // 44 sunlit motes in one draw, paused for reduced-motion preferences.
      const p=[];for(let i=0;i<44;i++)p.push(-6+(i*1.73%12),.8+(i*.43%4),-5+(i*2.17%9));
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));
      this.dust=new T.Points(g,new T.PointsMaterial({color:'#ffe4ad',size:.035,transparent:true,opacity:.48,depthWrite:false}));this.scene.add(this.dust);
    },
    ensureNpc(key){
      if(!key){this.npc=null;return;}
      this.npcKey=key;
      if(this.npcs[key]){this.npc=this.npcs[key];return;}
      const rig=PQIsland.createCharacter(key);
      if(this.kind==='cafe')rig.group.position.set(key==='lijie'?-4.8:1.5,.08,key==='lijie'?1.8:1.5);
      else rig.group.position.set(1.85,.08,2.2);
      rig.group.rotation.y=key==='lijie'?.7:-.65;
      this.scene.add(rig.group);this.actors.push(rig);this.npcs[key]=rig;this.npc=rig;
    },
    focus(who){this.speaker=who;},
    resize(snap=false){
      if(!this.active)return;
      const w=PQIsland,a=w.camera.aspect,small=a<.8,cafe=this.kind==='cafe';
      this.cameraGoal=new T.Vector3(small?(cafe?6.4:6):8.4,small?(cafe?9.5:7.8):6.4,small?(cafe?20.3:15):11.7);
      if(window.PQCafeCase?.active)this.cameraGoal.set(small?6.4:8.4,small?9.5:7.5,small?20.3:13);
      if(snap)this.camPosition.copy(this.cameraGoal);
      this.viewKey='';
    },
    update(dt,t){
      if(window.PQNightMarket?.active&&window.PQNightMarketScene?.active){PQNightMarketScene.update(dt,t);return;}
      if(window.PQCampaign?.active&&window.PQChapterScene?.active){PQChapterScene.update(dt,t);return;}
      const w=PQIsland,e=w.environment,caseMode=!!window.PQCafeScene?.active,reduced=e.reducedMotion||((caseMode||window.PQCafeLife?.active)&&PQCafeScene.reduced());
      if(caseMode)PQCafeScene.tick(dt);
      else if(window.PQCafeLife?.active)PQCafeWalk.tick(dt);
      const active=this.speaker==='me'?this.player:this.speaker&&this.speaker!=='n'?this.npc:null;
      if(window.PQCafeScene?.active)PQCafeScene.frame(this.focusTarget,this.cameraGoal);
      else if(window.PQCafeLife?.active)PQCafeLife.frame(this.focusTarget,this.cameraGoal);
      else this.focusTarget.set((w.camera.aspect<.8&&this.kind==='cafe'?-.65:0)+(active?active.group.position.x*.25:0),1.25,.5);
      this.lookTarget.lerp(this.focusTarget,reduced||caseMode?1:1-Math.exp(-dt*3));
      this.camPosition.lerp(this.cameraGoal,reduced||caseMode?1:1-Math.exp(-dt*3));
      w.camera.position.copy(this.camPosition);w.camera.lookAt(this.lookTarget);
      const el=w.renderer.domElement,key=el.clientWidth+':'+el.clientHeight+':'+caseMode+':'+(caseMode?PQCafeScene.view:'');
      const wide=el.clientWidth>el.clientHeight;
      const offset=caseMode?PQCafeScene.offset(el.clientWidth,el.clientHeight):window.PQCafeLife?.active?{x:PQFirstDay.dialogOpen&&wide?el.clientWidth*.16:0,y:0}:{x:wide?el.clientWidth*.21:0,y:el.clientHeight*(wide?.02:w.camera.aspect<.8&&this.kind==='office'?.10:.14)};
      if(this.viewKey!==key||Math.abs((this.viewOffset?.x||0)*el.clientWidth-offset.x)>.1||Math.abs((this.viewOffset?.y||0)*el.clientHeight-offset.y)>.1){this.viewKey=key;this.viewOffset={x:offset.x/el.clientWidth,y:offset.y/el.clientHeight};w.camera.setViewOffset(el.clientWidth,el.clientHeight,offset.x,offset.y,el.clientWidth,el.clientHeight);}
      this.actors.forEach((rig,i)=>{
        w.animateCharacter(rig,false,reduced||(caseMode&&PQCafeScene.view==='evidence')?0:t,i);
        if(rig===active&&!reduced&&!(caseMode&&PQCafeScene.view==='evidence')){rig.rightArm.rotation.x=-.2+Math.sin(t*2.2)*.12;rig.head.rotation.y=Math.sin(t*1.4)*.07;}
      });
      if(!reduced&&!(caseMode&&PQCafeScene.view==='evidence'))this.dust.rotation.y=Math.sin(t*.08)*.025;
      if(window.PQCafeScene?.active)PQCafeScene.update(dt,t);
      this.dust.visible=e.tier>0;
      if(this.kind==='cafe'&&!window.PQCafeLife?.active){
        for(const [id,key] of [['cafe-mei','xiaomei'],['cafe-li','lijie']]){
          const el=document.getElementById(id),rig=this.npcs[key];
          el.hidden=!document.getElementById('social-screen').classList.contains('active')||PQFirstDay.dialogOpen||(!G.firstDay.drink&&!window.PQCafeLife?.active)||!rig;
          if(!el.hidden){const v=rig.group.position.clone();v.y+=2.7;v.project(w.camera);el.hidden=Math.abs(v.x)>.95||Math.abs(v.y)>.95||v.z>1;
            const width=w.renderer.domElement.clientWidth,x=Math.max(65,Math.min(width-65,(v.x*.5+.5)*width));
            el.style.transform=`translate(${x}px,${(-v.y*.5+.5)*w.renderer.domElement.clientHeight}px) translate(-50%,-100%)`;}
        }
      }
      if(window.PQCafeLife?.active)PQCafeLife.update(dt,t);
      e.shafts.uniforms.uStrength.value=0;
      e.composite.uniforms.uInvProjection.value.copy(w.camera.projectionMatrixInverse);
      e.composite.uniforms.uFocus.value=w.camera.position.distanceTo(this.lookTarget);
      e.composite.uniforms.uNight.value=0;e.composite.uniforms.uBloomStrength.value=.18;
    },
    disposeTree(tree){
      const geometries=new Set(),materials=new Set();
      tree.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));if(o.shadow&&o.shadow.map)o.shadow.map.dispose();});
      geometries.forEach(g=>g.dispose());materials.forEach(m=>{if(!m.userData.pqShared)m.dispose();});
      // Character face maps are shared by the existing bounded face cache.
    },
    exit(){
      if(!this.active)return;
      if(window.PQPropInspector?.active)PQPropInspector.close(false);
      if(window.PQCafeLife)PQCafeLife.detach(true);
      if(window.PQCafeScene)PQCafeScene.reset();
      const w=PQIsland;this.active=false;w.scene=this.saved.scene;
      w.camera.clearViewOffset();w._viewKey=null;w.camera.position.copy(this.saved.position);
      Object.assign(w.camCurTarget,this.saved.target);Object.assign(w.curSpherical,this.saved.spherical);
      this.disposeTree(this.scene);this.ownedTextures.forEach(t=>t.dispose());this.scene=null;this.npc=null;this.npcKey=null;this.actors=[];
      document.getElementById('game').classList.remove('story-mode');
      w.environment.lastFrame=0;w.environment.warmup=performance.now()+1000;
    }
  };
  window.PQStory3D=R;
})();
