/* One renderer, one frame loop. An owned inspection scene replaces the room only while held. */
(function(){
 'use strict';
 const T=THREE,$=id=>document.getElementById(id),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const I={active:false,
  init(){
   $('game').insertAdjacentHTML('beforeend',`<section id="prop-inspector" role="dialog" aria-modal="true" aria-labelledby="prop-title" hidden>
    <div id="prop-drag" tabindex="0" role="group" aria-label="手中物件。拖动旋转，方向键微调，F 翻面，加减号缩放，Escape 放回。"></div>
    <header><div><span id="prop-source"></span><h2 id="prop-title"></h2></div><button id="prop-close">放回 · Esc</button></header>
    <div id="prop-reading" hidden><h3 id="prop-reading-title"></h3><div id="prop-copy"></div><button id="prop-read-close">回到手中物件</button></div>
    <p id="prop-status" role="status" aria-live="polite"></p>
    <footer><div class="prop-tools"><button id="prop-flip">翻到背面 · F</button><button id="prop-read">阅读正面</button><button id="prop-minus" aria-label="缩小物件">−</button><button id="prop-plus" aria-label="放大物件">＋</button><button id="prop-reset">摆正</button></div><div id="prop-actions"></div><span id="prop-hint">拖动观察 · 滚轮 / 双指缩放</span></footer>
   </section>`);
   $('prop-close').onclick=()=>this.close();$('prop-flip').onclick=()=>this.flip();$('prop-read').onclick=()=>this.read(true);$('prop-read-close').onclick=()=>this.read(false);
   $('prop-plus').onclick=()=>this.zoom(1.15);$('prop-minus').onclick=()=>this.zoom(1/1.15);$('prop-reset').onclick=()=>{this.angle={x:this.spec.type==='cup'?(this.back?-Math.PI/2:.26):-.06,y:this.spec.type==='cup'?0:this.back?Math.PI:0};this.scale=1;};
   this.pointers=new Map();const drag=$('prop-drag');
   drag.addEventListener('pointerdown',e=>{if(!this.active)return;e.preventDefault();drag.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});this.pinch=this.distance();});
   drag.addEventListener('pointermove',e=>{const p=this.pointers.get(e.pointerId);if(!p||!this.active)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;if(this.pointers.size>1){const d=this.distance();if(this.pinch>0)this.zoom(d/this.pinch);this.pinch=d;}else{this.angle.y+=dx*.009;this.angle.x=clamp(this.angle.x+dy*.007,this.spec.type==='cup'?-Math.PI:-.7,this.spec.type==='cup'?Math.PI:.7);}this.syncSide();});
   for(const type of ['pointerup','pointercancel','lostpointercapture'])drag.addEventListener(type,e=>{this.pointers.delete(e.pointerId);this.pinch=this.distance();});
   drag.addEventListener('wheel',e=>{if(this.active){e.preventDefault();this.zoom(Math.exp(-e.deltaY*.001));}},{passive:false});
   window.addEventListener('keydown',e=>{
    if(!this.active)return;
    // A held item owns input; the underlying room and movement never receive the key.
    e.stopImmediatePropagation();
    if(e.key==='Escape'){e.preventDefault();if(!$('prop-reading').hidden)this.read(false);else this.close();return;}
    if(e.key==='Tab'){const bs=[...$('prop-inspector').querySelectorAll('button,[tabindex="0"]')].filter(b=>b.getClientRects().length&&!b.disabled),i=bs.indexOf(document.activeElement);e.preventDefault();bs[(i+(e.shiftKey?-1:1)+bs.length)%bs.length]?.focus();return;}
    if(e.key.toLowerCase()==='f'){e.preventDefault();this.flip();}
    if(e.key==='+'||e.key==='='){e.preventDefault();this.zoom(1.12);}if(e.key==='-'){e.preventDefault();this.zoom(1/1.12);}
    if(e.key.startsWith('Arrow')){e.preventDefault();if(e.key==='ArrowLeft')this.angle.y-=.12;if(e.key==='ArrowRight')this.angle.y+=.12;if(e.key==='ArrowUp')this.angle.x=clamp(this.angle.x-.1,this.spec.type==='cup'?-Math.PI:-.7,this.spec.type==='cup'?Math.PI:.7);if(e.key==='ArrowDown')this.angle.x=clamp(this.angle.x+.1,this.spec.type==='cup'?-Math.PI:-.7,this.spec.type==='cup'?Math.PI:.7);this.syncSide();}
   },true);
   const cancel=()=>{for(const id of this.pointers.keys())if(drag.hasPointerCapture(id))drag.releasePointerCapture(id);this.pointers.clear();this.pinch=0;};
   window.addEventListener('blur',cancel);window.addEventListener('resize',cancel);
  },
  distance(){const p=[...this.pointers.values()];return p.length>1?Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y):0;},
  zoom(f){this.scale=clamp(this.scale*f,.65,1.65);},
  open(spec){
   if(!spec||!PQStory3D.active)return false;if(this.active)this.close(false);
   const w=PQIsland,c=w.camera;
   this.saved={scene:w.scene,position:c.position.clone(),quaternion:c.quaternion.clone(),fov:c.fov,aspect:c.aspect,view:c.view?{...c.view}:null,focus:document.activeElement,
    ui:[...$('game').children].filter(e=>!['island-viewport','prop-inspector'].includes(e.id)).map(e=>[e,e.inert])};
   this.spec=spec;this.angle={x:spec.type==='cup'?.26:-.055,y:spec.type==='postcard'?.035:0};this.scale=1;this.back=false;this.revealed=false;this.elapsed=0;this.fitKey='';this.pointers.clear();this.textures=[];
   this.scene=new T.Scene();this.scene.background=new T.Color('#172a2b');this.scene.add(new T.HemisphereLight('#ffeed8','#40575c',2));
   const key=new T.DirectionalLight('#ffe8c4',2.4);key.position.set(-3,4,5);this.scene.add(key);
   const rim=new T.DirectionalLight('#91bbbd',1.6);rim.position.set(3,1,-2);this.scene.add(rim);
   this.object=new T.Group();this.scene.add(this.object);this.build(spec);
   this.saved.ui.forEach(([e])=>e.inert=true);this.active=true;w.scene=this.scene;w.keys={};w.joyVec={x:0,z:0};
   $('game').classList.add('inspect-mode');$('prop-inspector').hidden=false;$('prop-title').textContent=spec.title;$('prop-source').textContent=spec.source||'手中的物件';$('prop-status').textContent='';$('prop-reading').hidden=true;
   this.syncSide();this.actions();this.update(0,0);$('prop-close').focus({preventScroll:true});SFX.foley('paper');return true;
  },
  lines(side){const a=this.spec[side]||[];return Array.isArray(a)?a:[a];},
  texture(side){
   const cv=document.createElement('canvas');cv.width=1024;cv.height=Math.round(1024*this.height/this.width);const c=cv.getContext('2d'),w=cv.width,h=cv.height;
   const dark=['card','terminal','chart','prototype'].includes(this.spec.type);c.fillStyle=dark?'#254e49':'#f0e4c7';c.fillRect(0,0,w,h);
   c.fillStyle=dark?'#e2c892':'#435349';c.strokeStyle=dark?'#b8b989':'#b9a77f';c.lineWidth=2;c.strokeRect(28,28,w-56,h-56);
   c.font='500 22px system-ui';c.fillText((side==='back'?'BACK / ':this.spec.type==='postcard'?'BLUE MOUNTAIN / ':'FIELD NOTES / ')+(this.spec.source||'FIELD NOTES'),64,76,w-128);
   if(this.spec.type==='postcard'&&side==='front'){
    // An illustrated memento, not a screenshot or a second render target.
    c.fillStyle='#90bec1';c.fillRect(64,108,w-128,h-228);c.fillStyle='#568d9b';c.fillRect(64,h*.49,w-128,h*.28);
    c.fillStyle='#91a463';c.beginPath();c.ellipse(w*.5,h*.56,w*.30,h*.13,0,0,Math.PI*2);c.fill();
    for(let i=0;i<8;i++){const x=230+i*70,y=h*.5-(i%3)*30;c.fillStyle=['#dda776','#c6d5bb','#426b60'][i%3];c.fillRect(x,y,40,60);c.fillStyle='#395b50';c.fillRect(x-4,y-8,48,12);}
    c.fillStyle='#f6dea0';c.beginPath();c.arc(820,172,40,0,Math.PI*2);c.fill();c.fillStyle='#354e46';c.font='500 36px serif';c.fillText(this.spec.vista?({bay:'星火海湾',garden:'花信步道',cafe:'蓝山的屋檐'}[this.spec.vista]):this.spec.title,68,h-65,w-136);
    if(this.spec.vista==='garden'){c.fillStyle='#d1c7a1';c.fillRect(140,h*.57,730,18);for(let i=0;i<6;i++){c.fillStyle='#d1959c';c.beginPath();c.arc(240+i*90,h*.42,28,0,Math.PI*2);c.fill();}}
    if(this.spec.vista==='cafe'){c.fillStyle='#905d40';c.fillRect(350,190,300,230);c.fillStyle='#eee2bd';c.fillRect(370,280,260,30);c.fillStyle='#548d8a';c.fillRect(400,330,65,90);c.fillRect(540,330,65,65);c.fillStyle='#edce93';c.font='25px serif';c.fillText('BLUE MOUNTAIN',380,255);}
   }else{
    c.font='600 40px "PingFang SC",sans-serif';c.fillText(side==='back'?(this.spec.backTitle||'写在背面'):this.spec.title,64,145,w-128);
    let y=213;const lines=this.lines(side),size=lines.join('').length>420?24:30,lineHeight=size*1.65;
    c.font=`${size}px "PingFang SC",sans-serif`;
    for(const paragraph of lines){let line='';for(const char of String(paragraph)){if(c.measureText(line+char).width>w-132||char==='\n'){c.fillText(line,66,y);y+=lineHeight;line=char==='\n'?'':char;}else line+=char;}if(line){c.fillText(line,66,y);y+=lineHeight;}y+=16;if(y>h-90){c.font='22px system-ui';c.fillText('完整记录 · 选择「阅读」',66,h-60);break;}}
    if(this.spec.type==='envelope'&&side==='back'){c.strokeStyle='#ae9674';c.beginPath();c.moveTo(30,h-250);c.lineTo(w/2,h-90);c.lineTo(w-30,h-250);c.stroke();}
   }
   const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=Math.min(4,PQIsland.renderer.capabilities.getMaxAnisotropy());this.textures.push(tex);return tex;
  },
  build(spec){
   const add=(geometry,material,x=0,y=0,z=0)=>{const o=new T.Mesh(geometry,material);o.position.set(x,y,z);this.object.add(o);return o;};
   const mat=color=>new T.MeshStandardMaterial({color,roughness:.85});
   if(spec.type==='cup'){
    this.width=2.8;this.height=2.8;
    add(new T.CylinderGeometry(.9,.7,1.5,32,1,true),new T.MeshStandardMaterial({color:'#e5d4af',roughness:.45,side:T.DoubleSide}));
    add(new T.CylinderGeometry(.86,.86,.05,32),mat('#4c2f22'),0,.62,0);add(new T.CylinderGeometry(.71,.71,.08,32),mat('#e5d4af'),0,-.75,0);
    const handle=add(new T.TorusGeometry(.53,.13,10,24),mat('#e5d4af'),1.01,0,0);handle.rotation.y=0;
    add(new T.CylinderGeometry(1.3,1.24,.1,32),mat('#bcae8f'),0,-.86,0);
    const cv=document.createElement('canvas');cv.width=cv.height=512;const c=cv.getContext('2d');c.fillStyle='#bcae8f';c.fillRect(0,0,512,512);c.strokeStyle='#4b6654';c.lineWidth=5;c.beginPath();c.arc(256,256,185,0,Math.PI*2);c.stroke();c.fillStyle='#4b6654';c.textAlign='center';c.font='500 34px serif';c.fillText('BLUE MOUNTAIN',256,240);c.font='30px serif';c.fillText('蓝山 · 留一点空闲',256,295);
    const stamp=new T.CanvasTexture(cv);stamp.colorSpace=T.SRGBColorSpace;this.textures.push(stamp);const base=add(new T.PlaneGeometry(1.3,1.3),new T.MeshStandardMaterial({map:stamp,roughness:.85}),0,-.912,0);base.rotation.x=Math.PI/2;
   }else{
    const screen=['terminal','chart','prototype'].includes(spec.type),wide=screen||['postcard','envelope','coins'].includes(spec.type);
    this.width=wide?3.7:spec.type==='receipts'?2.3:2.7;this.height=wide?2.55:spec.type==='receipts'?3.6:3.16;
    const depth=spec.type==='book'?.19:screen?.22:.055;add(new T.BoxGeometry(this.width,this.height,depth),mat(screen?'#355650':spec.type==='card'?'#547768':'#c1aa7d'));
    if(['receipts','ticket','calendar'].includes(spec.type))for(let i=1;i<3;i++){const sheet=add(new T.BoxGeometry(this.width,this.height,.025),mat('#d3c59f'),i*.035,-i*.025,-i*.035);sheet.rotation.z=-i*.018;}
    if(spec.type==='coins')for(let i=0;i<7;i++){const coin=add(new T.CylinderGeometry(.25,.25,.045,24),new T.MeshStandardMaterial({color:'#b99c4d',roughness:.37,metalness:.6}),-.7+(i%4)*.48,-1.17+Math.floor(i/4)*.27,.22);coin.rotation.x=Math.PI/2;}
    if(spec.type==='calendar')for(let i=0;i<4;i++){const ring=add(new T.TorusGeometry(.085,.023,6,16),mat('#827d67'),-.85+i*.55,this.height/2,.04);ring.rotation.y=Math.PI/2;}
    for(const [side,z,rot]of [['front',depth/2+.003,0],['back',-depth/2-.003,Math.PI]]){const face=add(new T.PlaneGeometry(this.width-(screen?.18:.035),this.height-(screen?.18:.035)),new T.MeshStandardMaterial({map:this.texture(side),roughness:.95}),0,0,z);face.rotation.y=rot;}
    if(spec.type==='book'){const spine=add(new T.BoxGeometry(.13,this.height+.025,depth+.045),mat('#477166'),-this.width/2,0,0);spine.rotation.z=.004;}
   }
  },
  syncSide(){
   const cup=this.spec.type==='cup',back=cup?Math.sin(this.angle.x)<-.2:Math.cos(this.angle.y)<0;this.back=back;
   $('prop-flip').textContent=cup?(back?'转回杯口 · F':'查看杯底 · F'):(back?'翻到正面 · F':'翻到背面 · F');$('prop-read').textContent=cup?'物件说明':back?'阅读背面':'阅读正面';
   if(back&&!this.revealed){this.revealed=true;this.spec.onBack?.();this.actions();}
  },
  flip(){if(this.spec.type==='cup'){this.angle.x=this.back?.26:-Math.PI/2;this.angle.y=0;}else this.angle.y=(Math.round(this.angle.y/Math.PI)+(this.back?-1:1))*Math.PI;this.syncSide();this.read(false);SFX.foley('paper');},
  read(open){
   $('prop-reading').hidden=!open;
   if(open){$('prop-reading-title').textContent=this.back?(this.spec.backTitle||'写在背面'):this.spec.title;const copy=$('prop-copy');copy.replaceChildren();for(const line of this.lines(this.back?'back':'front')){const p=document.createElement('p');p.textContent=line;copy.append(p);}$('prop-read-close').focus({preventScroll:true});}
   else if(this.active)$('prop-read').focus({preventScroll:true});
  },
  actions(){const box=$('prop-actions');box.replaceChildren();const rows=typeof this.spec.actions==='function'?this.spec.actions():this.spec.actions||[];for(const row of rows){const b=document.createElement('button');b.textContent=row.label;b.disabled=!!row.disabled;b.onclick=()=>{this.close();row.run();};box.append(b);}},
  update(dt){
   if(!this.active)return;this.elapsed+=dt;const w=PQIsland,c=w.camera,el=w.renderer.domElement,reduced=w.environment.reducedMotion||window.PQCafeCase?.reduceMotion;
   const width=el.clientWidth,height=el.clientHeight,key=width+':'+height+':'+$('prop-actions').textContent+':'+$('prop-status').textContent;
   if(this.fitKey!==key){this.fitKey=key;const top=Math.max($('prop-inspector').querySelector('header').getBoundingClientRect().bottom+18,$('prop-status').textContent?$('prop-status').getBoundingClientRect().bottom+12:0),bottom=$('prop-inspector').querySelector('footer').getBoundingClientRect().top-16;this.fit={usable:Math.max(.24,(bottom-top)/height),offset:height*.5-(top+bottom)/2};}
   const usable=this.fit.usable,v=32*Math.PI/180;
   const distance=Math.max(this.height/(2*Math.tan(v/2)*usable),this.width/(2*Math.tan(v/2)*c.aspect*.77))+.4;
   c.fov=32;c.setViewOffset(width,height,0,this.fit.offset,width,height);c.position.set(0,0,distance);c.lookAt(0,0,0);c.updateProjectionMatrix();
   const k=reduced?1:1-Math.exp(-Math.max(.001,dt)*14);this.object.rotation.x+=(this.angle.x-this.object.rotation.x)*k;this.object.rotation.y+=(this.angle.y-this.object.rotation.y)*k;
   const pickup=reduced?1:Math.min(1,this.elapsed/.28);this.object.scale.setScalar(this.scale*(.92+.08*pickup));this.object.position.y=-.05;
   const e=w.environment;e.shafts.uniforms.uStrength.value=0;e.composite.uniforms.uFocus.value=distance;e.composite.uniforms.uInvProjection.value.copy(c.projectionMatrixInverse);e.composite.uniforms.uNight.value=0;e.composite.uniforms.uBloomStrength.value=.06;
  },
  close(notify=true){
   if(!this.active)return;const s=this.saved,spec=this.spec,w=PQIsland;this.active=false;this.pointers.clear();w.scene=s.scene;w.camera.position.copy(s.position);w.camera.quaternion.copy(s.quaternion);w.camera.fov=s.aspect===w.camera.aspect?s.fov:w.camera.aspect<.68?62:w.camera.aspect<1?52:45;w.camera.clearViewOffset();w.camera.updateProjectionMatrix();
   if(s.view?.enabled&&s.view.fullWidth===w.renderer.domElement.clientWidth&&s.view.fullHeight===w.renderer.domElement.clientHeight)w.camera.setViewOffset(s.view.fullWidth,s.view.fullHeight,s.view.offsetX,s.view.offsetY,s.view.width,s.view.height);
   s.ui.forEach(([el,inert])=>el.inert=inert);$('prop-inspector').hidden=true;$('game').classList.remove('inspect-mode');
   PQStory3D.disposeTree(this.scene);this.textures.forEach(t=>t.dispose());this.scene=null;this.object=null;this.spec=null;this.saved=null;
   PQStory3D.viewKey='';w._lastTime=performance.now();w.environment.lastFrame=0;w.environment.warmup=performance.now()+600;
   if(notify)spec.onClose?.();if(s.focus?.isConnected&&!s.focus.inert)s.focus.focus?.({preventScroll:true});
  }
 };
 window.PQPropInspector=I;
})();
