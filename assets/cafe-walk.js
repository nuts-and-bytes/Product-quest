/* Owns movement only while the social café is active; no extra render loop. */
(function(){
 'use strict';const N=PQCafeNavigation,T=THREE,$=id=>document.getElementById(id);
 const W={active:false,keys:{},joy:{x:0,z:0},route:[],yaw:0,overview:false,moving:false,
  init(){
   $('social-screen').insertAdjacentHTML('beforeend',`<div id="cafe-walk-tools"><button id="cafe-overview" aria-pressed="false">查看全景</button><button id="cafe-menu" aria-expanded="false" aria-controls="cafe-actions">馆内手记</button></div><div id="cafe-stick" role="group" aria-label="移动摇杆"><span></span></div><div id="cafe-context" role="group" aria-label="附近的交互目标" aria-live="polite" aria-atomic="true" hidden><button id="cafe-nearby"></button><button id="cafe-target-next" aria-label="切换附近的交互目标" hidden></button></div><p id="cafe-walk-status" role="status"></p>`);
   $('cafe-overview').onclick=()=>{this.overview=!this.overview;$('cafe-overview').textContent=this.overview?'回到身边':'查看全景';$('cafe-overview').setAttribute('aria-pressed',String(this.overview));};
   $('cafe-menu').onclick=()=>this.menu(!$('game').classList.contains('cafe-menu-open'));
   $('cafe-target-next').onclick=()=>this.cycleTarget();
   $('cafe-nearby').onclick=()=>{if(this.nearby)this.request(this.nearby.id);};
   const stick=$('cafe-stick');
   const drag=e=>{if(e.pointerId!==this.stickId)return;const b=stick.getBoundingClientRect(),x=(e.clientX-b.left-b.width/2)/32,z=(e.clientY-b.top-b.height/2)/32,n=Math.max(1,Math.hypot(x,z));this.joy={x:x/n,z:z/n};stick.firstElementChild.style.transform=`translate(${this.joy.x*27}px,${this.joy.z*27}px)`;};
   stick.addEventListener('pointerdown',e=>{if(this.blocked())return;e.preventDefault();this.stop();this.stickId=e.pointerId;stick.setPointerCapture(e.pointerId);drag(e);});
   stick.addEventListener('pointermove',drag);for(const name of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(name,()=>this.releaseStick());
   window.addEventListener('keydown',e=>{
    if(!this.active||this.blocked()||e.altKey||e.metaKey||e.ctrlKey||e.target.closest?.('input,textarea,select,[contenteditable=true]'))return;
    const key=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright'].includes(key)){e.preventDefault();e.stopImmediatePropagation();this.route=[];this.pending=null;this.menu(false);this.keys[key]=true;}
    if(key==='e'&&!e.repeat&&this.nearby){e.preventDefault();e.stopImmediatePropagation();this.request(this.nearby.id);}
    if(key==='q'&&!e.repeat){e.preventDefault();e.stopImmediatePropagation();this.cycleTarget();}
    if(key==='escape'){this.stop();this.menu(false);}
   },true);
   window.addEventListener('keyup',e=>{delete this.keys[e.key.toLowerCase()];},true);
   window.addEventListener('blur',()=>this.stop());document.addEventListener('visibilitychange',()=>this.stop());window.addEventListener('resize',()=>this.stop());
  },
  menu(open){$('game').classList.toggle('cafe-menu-open',open);$('cafe-menu').setAttribute('aria-expanded',String(open));},
  releaseStick(){this.stickId=null;this.joy={x:0,z:0};$('cafe-stick').firstElementChild.style.transform='';},
  stop(){this.keys={};this.releaseStick();this.route=[];this.pending=null;this.moving=false;},
  blocked(){return !this.active||PQCafeLife.vista||PQCafeLife.arrival||PQFirstDay.dialogOpen||PQPropInspector.active||PQLifeFilm.active||!$('social-screen').classList.contains('active');},
  attach(){
   this.active=true;this.stop();this.nearby=null;this.targetLock=null;this.promptMeasure=0;this.yaw=0;this.overview=false;this.menu(false);$('game').classList.add('cafe-walk-mode');$('cafe-overview').textContent='查看全景';$('cafe-overview').setAttribute('aria-pressed','false');
   this.makeShell();this.shell.visible=true;const r=PQStory3D,p=r.player.group.position,free=N.nearest(p,this.obstacles());if(free){p.x=free.x;p.z=free.z;}r.player.group.rotation.y=Math.PI;
   this.frame(r.focusTarget,r.cameraGoal);r.lookTarget.copy(r.focusTarget);r.camPosition.copy(r.cameraGoal);
   const canvas=PQIsland.renderer.domElement;this.canvas=canvas;
   this.down=e=>{if(this.blocked())return;this.pointer={id:e.pointerId,x:e.clientX,y:e.clientY,last:e.clientX,moved:false};canvas.setPointerCapture(e.pointerId);};
   this.drag=e=>{const p=this.pointer;if(!p||p.id!==e.pointerId||this.blocked())return;if(Math.hypot(e.clientX-p.x,e.clientY-p.y)>8)p.moved=true;if(p.moved){this.yaw=Math.max(-1.1,Math.min(1.1,this.yaw-(e.clientX-p.last)*.006));}p.last=e.clientX;};
   this.up=e=>{if(this.pointer?.id===e.pointerId){this.ignoreClick=this.pointer.moved;this.pointer=null;}};
   this.cancel=()=>{this.pointer=null;this.ignoreClick=true;};
   canvas.addEventListener('pointerdown',this.down);canvas.addEventListener('pointermove',this.drag);canvas.addEventListener('pointerup',this.up);canvas.addEventListener('pointercancel',this.cancel);
   this.scroll=e=>{if(this.blocked()||!PQCameraInput.trackpad||e.ctrlKey)return;e.preventDefault();this.yaw=Math.max(-1.1,Math.min(1.1,this.yaw+e.deltaX*(e.deltaMode?16:1)*.006));};
   canvas.addEventListener('wheel',this.scroll,{passive:false});
   this.status(!this.touch()&&PQCameraInput.trackpad?PQ.cameraHelp.cafeHint:this.touch()?'点地面或拖摇杆走动 · 拖动画面环顾':'点击地面走动 · WASD / 方向键移动 · 拖动画面环顾');
  },
  makeShell(){
   if(this.room===PQStory3D.scene)return;this.room=PQStory3D.scene;const r=PQStory3D,root=PQCafeLife.props.root;
   this.shell=new T.Group();root.add(this.shell);const box=(...args)=>{const o=r.box(...args);o.castShadow=false;this.shell.add(o);return o;};
   this.ceiling=box(0,6.28,0,16,.16,13,'#d6c6aa');
   this.right=box(7.85,3.1,0,.25,6.2,13,'#bfc2ad');
   this.front=new T.Group();this.shell.add(this.front);
   for(const [x,sx]of [[-3.2,9.6],[6.35,3.3]])this.front.add(box(x,3.1,6.4,sx,6.2,.25,'#bfc2ad'));
   this.front.add(box(3.2,5.2,6.4,3.2,2.1,.25,'#bfc2ad'));
   // Doorway towards the terrace gives the room a physical destination.
   for(const x of [1.55,4.85])this.front.add(box(x,2.05,6.25,.16,4.1,.24,'#365d56'));this.front.add(box(3.2,4.15,6.25,3.5,.15,.24,'#365d56'));
   const label=r.text(['海风露台 →'],6.25,2.7,6.18,2.2,.6,'#294e46','#e9d4ac');label.rotation.y=Math.PI;this.front.add(label);
   this.marker=new T.Mesh(new T.RingGeometry(.2,.27,28),new T.MeshBasicMaterial({color:'#f4d997',transparent:true,opacity:.7,depthWrite:false,side:T.DoubleSide}));this.marker.rotation.x=-Math.PI/2;this.marker.position.y=.065;this.marker.visible=false;root.add(this.marker);
  },
  obstacles(){const out=N.base.slice();for(const [id,n]of Object.entries(PQStory3D.npcs))if(n.group.visible)out.push({x:n.group.position.x,z:n.group.position.z,r:id==='akai'?.4:.45});if(G.cafeLife.seat.choice==='shared')out.push({x:-1,z:2.3,r:.7},{x:-.6,z:3.65,w:.75,d:.75});return out;},
  targets(){const shared=G.cafeLife.seat.choice==='shared';const a=[
   {id:'xiaomei',label:'和夏青聊聊',x:-.1,z:1.55}, {id:'lijie',label:'和李姐聊聊',x:-6.15,z:1.8},
   {id:'postcard',label:'拿起明信片',x:.15,z:-2.15}, {id:'note',label:'拿起留座便笺',x:-2,z:.15},
   {id:'cup',label:'拿起杯子',x:shared?.3:-2,z:shared?2.3:.15},
   {id:'window',label:'去海风露台',x:3.2,z:5.5}, {id:'order',label:'点一杯喝的',x:1.8,z:-2.15}
  ];if(G.cafeLife.seat.choice)a.push({id:'akai',label:'和阿凯聊聊',x:shared?.5:-5.3,z:shared?3.8:-1.3});return a;},
  touch(){return matchMedia('(pointer:coarse)').matches;},
  status(text){if($('cafe-walk-status').textContent!==text)$('cafe-walk-status').textContent=text;},
  request(id,done){
   if(this.blocked())return;this.targetLock=id;const target=this.targets().find(p=>p.id===id);if(!target)return;
   this.walkTo(target,()=>{this.stop();const p=PQStory3D.player.group.position,n=PQStory3D.npcs[id]?.group;if(n) {PQStory3D.player.group.rotation.y=Math.atan2(n.position.x-p.x,n.position.z-p.z);n.rotation.y=Math.atan2(p.x-n.position.x,p.z-n.position.z);}
    if(done)done();else if(id==='order'){PQCafeLife.spot='counter';PQCafeLife.render();this.menu(true);}else PQCafeLife.perform(id);
   },target.label);
  },
  walkTo(point,done,label='走到这里'){
   if(this.blocked())return false;this.stop();this.menu(false);const p=PQStory3D.player.group.position,route=N.path(p,point,this.obstacles());if(!route.length){this.status('这边暂时过不去，试试旁边的空地。');return false;}
   this.route=route;this.pending=done;this.destination=label;this.status(label+(this.touch()?' · 拖摇杆可随时接管':' · 走近后互动，方向键可随时停下'));return true;
  },
  ground(ray){const point=new T.Vector3();if(ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-.06),point)&&N.free(point,[]))this.walkTo(point);},
  tick(dt){
   if(!this.active)return;if(this.blocked()){this.stop();this.marker.visible=false;return;}
   const rig=PQStory3D.player,p=rig.group.position,obstacles=this.obstacles();let x=(!!this.keys.d||!!this.keys.arrowright?1:0)-(!!this.keys.a||!!this.keys.arrowleft?1:0)+this.joy.x,z=(!!this.keys.s||!!this.keys.arrowdown?1:0)-(!!this.keys.w||!!this.keys.arrowup?1:0)+this.joy.z;
   let v={x:x*Math.cos(this.yaw)+z*Math.sin(this.yaw),z:z*Math.cos(this.yaw)-x*Math.sin(this.yaw)};
   if(Math.hypot(x,z)>.05){this.route=[];this.pending=null;}
   else if(this.route.length){const goal=this.route[0],distance=N.dist(p,goal);if(distance<.11){this.route.shift();if(!this.route.length){const done=this.pending;this.pending=null;this.status(this.touch()?'已到达 · 轻触人物、物件或互动按钮':'已到达 · 靠近人物或物件，按 E 互动');done?.();return;}}if(this.route.length){const q=this.route[0],d=N.dist(p,q);v={x:(q.x-p.x)/Math.max(.001,d)*Math.min(1,d/(2.7*Math.min(.05,Math.max(dt,.001)))),z:(q.z-p.z)/Math.max(.001,d)*Math.min(1,d/(2.7*Math.min(.05,Math.max(dt,.001))))};}}
   const next=N.move(p,v,dt,obstacles),dx=next.x-p.x,dz=next.z-p.z;this.moving=Math.hypot(dx,dz)>.0001;
   if(this.moving){this.footDistance=(this.footDistance||0)+Math.hypot(dx,dz);if(this.footDistance>.95){this.footDistance=0;SFX.foley('step');}p.x=next.x;p.z=next.z;const angle=Math.atan2(dx,dz),delta=Math.atan2(Math.sin(angle-rig.group.rotation.y),Math.cos(angle-rig.group.rotation.y));rig.group.rotation.y+=delta*(1-Math.exp(-Math.min(dt,.05)*14));this.stuck=0;}
   else if(this.route.length){this.stuck=(this.stuck||0)+Math.min(dt,.05);if(this.stuck>.6){this.stop();this.status('前面有人，换一处空地试试。');}}
   this.marker.visible=!!this.route.length;if(this.route.length){const end=this.route[this.route.length-1];this.marker.position.set(end.x,.065,end.z);}
  },
  frame(focus,goal){
   const r=PQStory3D,p=r.player.group.position,partner=PQCafeLife.arrival?r.npcs.akai?.group:PQFirstDay.dialogOpen?r.npcs[r.speaker]?.group:null,center=partner?p.clone().lerp(partner.position,.5):p;if(this.overview){focus.set(0,1,0);goal.set(8.3,10.4,15.2);}else{const distance=PQCafeLife.arrival?9:7.5;focus.set(center.x,1.45,center.z-.5);goal.set(Math.max(-7.3,Math.min(7.3,center.x+Math.sin(this.yaw)*distance+1.2)),PQCafeLife.arrival?4.8:3.75,center.z+Math.cos(this.yaw)*distance);}
   const camera=PQStory3D.camPosition;this.ceiling.visible=!this.overview&&camera.y<6;this.front.visible=!this.overview&&camera.z<6.05;this.right.visible=!this.overview&&camera.x<7.55;
  },
  update(t){
   if(!this.active)return;PQIsland.animateCharacter(PQStory3D.player,this.moving,PQIsland.environment.reducedMotion?0:t,0);
   this.updateTargets();
   if(!this.route.length&&!this.blocked())this.marker.visible=false;
  },
  selectTarget(id){
   if(this.blocked())return;const target=this.candidates?.find(t=>t.id===id);if(!target)return;
   this.targetLock=id;this.nearby=target;this.updateTargets();
  },
  cycleTarget(){
   if(this.blocked()||!this.candidates?.length)return;const i=this.candidates.findIndex(t=>t.id===this.nearby?.id);this.selectTarget(this.candidates[(i+1)%this.candidates.length].id);
  },
  updateTargets(){
   const p=PQStory3D.player.group.position;
   this.candidates=this.targets().filter(t=>!(t.id==='order'&&G.firstDay.drink)&&N.dist(p,t)<2.2);
   const current=this.candidates.find(t=>t.id===this.nearby?.id),locked=this.candidates.find(t=>t.id===this.targetLock);
   const closest=this.candidates.reduce((best,t)=>!best||N.dist(p,t)<N.dist(p,best)?t:best,null);
   // A deliberate selection remains selected while in reach; equal-distance cups and notes never flicker.
   this.nearby=locked||(current&&closest&&N.dist(p,current)<N.dist(p,closest)+.4?current:closest);
   if(!locked)this.targetLock=null;
   const near=this.nearby,hidden=this.blocked()||!near||this.moving||this.route.length>0||$('game').classList.contains('cafe-menu-open');
   $('cafe-context').hidden=!!hidden;$('game').classList.toggle('cafe-context-open',!hidden);
   const b=$('cafe-nearby'),label=near?(this.touch()?'':'E · ')+near.label:'';
   if(b.textContent!==label)b.textContent=label;
   const next=$('cafe-target-next');next.hidden=this.candidates.length<2;
   const count=this.candidates.findIndex(t=>t.id===near?.id)+1,text=(this.touch()?'切换':'Q 切换')+' '+count+'/'+this.candidates.length;
   if(next.textContent!==text)next.textContent=text;
  },
  layoutPrompts(rows){
   const w=PQIsland,r=PQStory3D,width=w.renderer.domElement.clientWidth,height=w.renderer.domElement.clientHeight,screen={width,height},F=PQWorldFraming;
   w.camera.updateMatrixWorld();this.projectPoint||=new T.Vector3();const v=this.projectPoint;
   // Project a body volume, not a fixed 60px strip: close-up characters occupy much more screen space.
   const projectBody=(position,radius,low,high)=>{let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
    for(const x of [-radius,radius])for(const y of [low,high])for(const z of [-.65,.65]){v.set(position.x+x,position.y+y,position.z+z).project(w.camera);const px=(v.x*.5+.5)*width,py=(-v.y*.5+.5)*height;x0=Math.min(x0,px);x1=Math.max(x1,px);y0=Math.min(y0,py);y1=Math.max(y1,py);}
    return {x:x0-8,y:y0-8,width:x1-x0+16,height:y1-y0+16};
   };
   const hero=r.player.group.position,body=projectBody(hero,.95,0,2.95);this.heroRect=body;
   const people=Object.values(r.npcs).filter(n=>n.group.visible).map(n=>projectBody(n.group.position,.85,.7,2.85));
   const now=performance.now(),stamp=width+':'+height+':'+$('game').classList.contains('cafe-menu-open')+':'+this.touch();
   if(this.promptStamp!==stamp||now>(this.promptMeasure||0)){
    this.promptStamp=stamp;this.promptMeasure=now+150;this.promptObstacles=[];
    for(const el of document.querySelectorAll('#social-screen .room-header,#cafe-walk-tools,#cafe-actions,#cafe-spots,#cafe-stick')){const style=getComputedStyle(el);if(el.hidden||style.display==='none'||style.visibility==='hidden')continue;const b=el.getBoundingClientRect();if(b.width&&b.height)this.promptObstacles.push({x:b.x,y:b.y,width:b.width,height:b.height});}
    const safe=PQMobilePlay.insets;for(const b of [{x:0,y:0,width:safe.left,height},{x:width-safe.right,y:0,width:safe.right,height},{x:0,y:0,width,height:safe.top},{x:0,y:height-safe.bottom,width,height:safe.bottom}])if(b.width&&b.height)this.promptObstacles.push(b);
   }
   const occupied=[body,...people,...this.promptObstacles],dock=$('cafe-context');
   if(!dock.hidden){
    const size={width:dock.offsetWidth,height:dock.offsetHeight},anchor={x:width*.5,y:height-62};
    const place=F.placeLabel(anchor,size,screen,occupied);dock.style.visibility=place?'':'hidden';
    if(place){dock.style.left=place.x+'px';dock.style.top=place.y+'px';occupied.push(place);}
   }
   // Only tiny world markers remain. If a marker cannot stay near its object without covering the hero, hide it;
   // the object remains selectable through the single context strip and Q / the touch switch button.
   rows.sort((a,b)=>Number(b.id===this.nearby?.id)-Number(a.id===this.nearby?.id));
   for(const row of rows){
    const {id,b,point}=row;v.copy(point).project(w.camera);
    b.hidden=this.blocked()||this.moving||this.route.length>0||Math.abs(v.x)>.96||Math.abs(v.y)>.96||v.z>1||v.z< -1||(!this.overview&&N.dist(hero,point)>3.1&&!this.candidates.some(t=>t.id===id));
    b.classList.add('cafe-dot');b.classList.toggle('is-current',id===this.nearby?.id);b.setAttribute('aria-pressed',String(id===this.nearby?.id));
    if(b.hidden)continue;
    const anchor={x:(v.x*.5+.5)*width,y:(-v.y*.5+.5)*height},place=F.placeLabel(anchor,{width:44,height:44},screen,occupied);
    const nearby=place&&Math.hypot(place.x+22-anchor.x,place.y+22-anchor.y)<76;
    b.style.visibility=nearby?'':'hidden';if(nearby){b.style.transform='none';b.style.left=place.x+'px';b.style.top=place.y+'px';occupied.push(place);}
   }
  },
  detach(){if(!this.active)return;this.canvas.removeEventListener('wheel',this.scroll);this.active=false;this.stop();this.menu(false);this.pointer=null;for(const [name,fn]of [['pointerdown',this.down],['pointermove',this.drag],['pointerup',this.up],['pointercancel',this.cancel]])this.canvas?.removeEventListener(name,fn);this.canvas=null;for(const id of ['cafe-mei','cafe-li']){const b=$(id);b.style.left=b.style.top='0px';b.style.visibility='';b.classList.remove('cafe-dot','is-current');b.removeAttribute('aria-pressed');}$('cafe-context').hidden=true;$('game').classList.remove('cafe-context-open');this.marker.visible=false;this.shell.visible=false;$('game').classList.remove('cafe-walk-mode');}
 };window.PQCafeWalk=W;
})();
