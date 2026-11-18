/* Cafe life: scene picking, small discoveries, and vistas from the actual island. */
(function(){
 'use strict';const T=THREE,M=PQCafeLifeState,$=id=>document.getElementById(id);
 const C={active:false,vista:false,spot:'counter',room:null,
  init(){
   G.cafeLife=M.normalize(G.cafeLife);
   $('social-screen').insertAdjacentHTML('beforeend',`<nav id="cafe-spots" aria-label="在咖啡馆走走"><button data-spot="counter">柜台</button><button data-spot="window">窗边</button><button data-spot="terrace">海风露台 ↗</button></nav><div id="cafe-life-pins" aria-label="可查看的物件"></div><div id="cafe-arrival" hidden><span>阿凯推开门，走向你留的位置。</span><button id="cafe-arrival-skip">跳过动作</button></div><p id="cafe-life-hint" role="status">点人物聊聊，点桌上的物件拿起来看。</p>`);
   $('cafe-arrival-skip').onclick=()=>this.finishArrival();
   $('cafe-spots').onclick=e=>{const b=e.target.closest('[data-spot]');if(b)this.go(b.dataset.spot);};
   $('game').insertAdjacentHTML('beforeend',`<section id="cafe-vista" aria-label="海风露台" hidden><header><div><span>BLUE MOUNTAIN / OUTSIDE</span><h2 id="vista-title">让海风吹一会儿。</h2></div><button id="vista-back">回到咖啡馆</button></header><nav aria-label="看向岛上的不同地方"><button data-view="bay">星火海湾</button><button data-view="garden">花信步道</button><button data-view="cafe">蓝山的屋檐</button></nav><footer><p id="vista-line"></p><button id="vista-keep" hidden>把这一幕画在明信片上</button></footer></section>`);
   $('vista-back').onclick=()=>this.endVista();$('cafe-vista').querySelector('nav').onclick=e=>{const b=e.target.closest('[data-view]');if(b)this.setVista(b.dataset.view);};$('vista-keep').onclick=()=>{this.step('postcard-view',this.vistaView);$('vista-line').textContent='你在卡片上勾下了这片风景。回到柜台，决定把它留给谁。';$('vista-keep').textContent='这一幕已记下 ✓';};
   window.addEventListener('keydown',e=>{if(this.vista&&!window.PQPropInspector?.active){if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();this.endVista();}if(e.key==='Tab'){const bs=[...$('cafe-vista').querySelectorAll('button')].filter(b=>b.getClientRects().length),i=bs.indexOf(document.activeElement);e.preventDefault();e.stopImmediatePropagation();bs[(i+(e.shiftKey?-1:1)+bs.length)%bs.length]?.focus();}}},true);
   G.save();
  },
  step(event,value){G.cafeLife=M.advance(G.cafeLife,event,value);G.save();},
  attach(){
   if(this.active)return;
   const r=PQStory3D;if(!r.active||r.kind!=='cafe')return;
   this.active=true;this.spot='counter';$('game').classList.add('cafe-life-mode');
   if(this.room!==r.scene){this.room=r.scene;this.build();}
   this.props.root.visible=true;this.sync();this.canvas=PQIsland.renderer.domElement;this.ray=new T.Raycaster();this.pointer=new T.Vector2();
   this.pick=e=>{
    if(!this.active||this.vista||PQFirstDay.dialogOpen||window.PQPropInspector?.active||PQLifeFilm.active)return;
    const rect=this.canvas.getBoundingClientRect();this.pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);this.ray.setFromCamera(this.pointer,PQIsland.camera);
    const targets=[...['xiaomei','lijie','akai'].filter(k=>r.npcs[k]?.group.visible).map(k=>({group:r.npcs[k].group,id:k})),...['postcard','note','cup','window'].map(id=>({group:this.props[id],id}))].filter(t=>t.group.visible);
    const hit=this.ray.intersectObjects(targets.map(t=>t.group),true)[0];if(!hit)return;
    const target=targets.find(t=>t.group.getObjectById(hit.object.id));if(target)this.interact(target.id);
   };
   this.canvas.addEventListener('click',this.pick);
   $('cafe-mei').onclick=()=>this.interact('xiaomei');$('cafe-li').onclick=()=>this.interact('lijie');
  },
  build(){
   const r=PQStory3D,root=new T.Group();r.scene.add(root);this.props={root};
   const pane=r.box(-4.3,3.85,-5.72,5.4,3.5,.025,'#a8c9c4',{transparent:true,opacity:0,depthWrite:false});pane.castShadow=false;root.add(pane);this.props.window=pane;
   const group=(id,p)=>{const g=new T.Group();g.position.set(...p);root.add(g);this.props[id]=g;return g;};
   const paper=(g,title,bg)=>{g.add(r.box(0,0,0,.96,.035,.68,bg));const t=r.text([title],0,.025,0,.93,.65,bg,'#405c50');t.rotation.x=-Math.PI/2;g.add(t);};
   paper(group('postcard',[.15,2.17,-2.98]),'给远方的你','#e4c68c');
   paper(group('note',[-3.95,1.01,.2]),'这儿有人吗？','#e4dfbd');
   const cup=group('cup',[-3.4,1.09,0]);for(const mesh of r.cup(0,0,0))cup.add(mesh);
   this.props.wall=r.text(['来自海风的一张明信片','这里，也留一个你的位置。'],-.45,3.5,-6.02,2.3,1.5,'#dfc28f','#365b51');root.add(this.props.wall);
   this.props.sent=r.text(['待寄出 · 给妈妈'],1.7,2.18,-3.1,1.15,.5,'#cfad7a','#365347');this.props.sent.rotation.x=-Math.PI/2;root.add(this.props.sent);
   r.ensureNpc('akai');r.npcs.akai.group.visible=false;r.ensureNpc('xiaomei');
   this.pinRows=[['postcard','明信片 · 拿起来看看'],['note','留座便笺 · 翻一翻'],['cup','桌上的杯子']].map(([id,text])=>{const b=document.createElement('button');b.textContent=text;b.dataset.prop=id;b.onclick=()=>this.interact(id);$('cafe-life-pins').append(b);return {id,b};});
   this.point=new T.Vector3();
  },
  sync(){
   if(!this.props||!this.active)return;const s=G.cafeLife,r=PQStory3D;
   this.props.wall.visible=s.postcard.ending==='wall';this.props.sent.visible=s.postcard.ending==='sent';
   const n=r.npcs.akai;n.group.visible=!!s.seat.choice;n.group.position.set(s.seat.choice==='window'?-3.8:-.6,.08,s.seat.choice==='window'?-1.15:3.65);n.group.rotation.y=s.seat.choice==='window'?0:Math.PI+.35;
   this.props.cup.position.set(s.seat.choice==='shared'?-1.1:-3.4,s.seat.choice==='shared'?.97:1.09,s.seat.choice==='shared'?2.1:0);
   // A real extra table accompanies the shared seat; create it once per room.
   if(s.seat.choice==='shared'&&!this.props.shared){const g=new T.Group();this.props.root.add(g);g.add(r.cylinder(-1, .8,2.3,.7,.12,'#b59c68'));g.add(r.box(-1,.42,2.3,.15,.75,.15,'#365d51'));g.add(r.box(-.6,.6,3.65,.75,.13,.75,'#b59c68'));for(const x of [-.88,-.32])g.add(r.box(x,.28,3.65,.08,.55,.65,'#365d51'));this.props.shared=g;}
  },
  render(){
   this.attach();this.sync();if(!this.active)return;
   const box=$('cafe-buttons');box.replaceChildren();
   const button=(text,fn)=>{const b=document.createElement('button');b.textContent=text;b.onclick=fn;box.append(b);};
   $('cafe-welcome').textContent=this.spot==='window'?'这儿有人坐吗？':G.firstDay.drink?'咖啡还热着。':'第一杯，想喝什么？';
   $('cafe-description').textContent=this.spot==='window'?(G.cafeLife.seat.choice?'你留的杯子，让这个位置有了一个新故事。':'李姐把便笺压在杯碟下。窗外，长桥一直伸向海面。'):G.cafeLife.postcard.ending==='wall'?'你留下的明信片挂在墙上。下个进门的人，也会看见。':G.cafeLife.postcard.ending==='sent'?'寄给妈妈的明信片已经封好。小美会和自己的信一起带去邮寄。':'柜台上有张没写完的明信片。你可以慢慢看，不用急着接工作。';
   if(!G.firstDay.drink){button('来杯手冲',()=>PQFirstDay.order('coffee'));button('想喝热茶',()=>PQFirstDay.order('tea'));}
   else if(this.spot==='window'){button('拿起留座便笺',()=>this.inspectNote());button('和李姐聊聊',()=>this.talkLi());button('拿起杯子',()=>this.inspectCup());}
   else {button('拿起柜台上的明信片',()=>this.inspectPostcard());button('和小美聊聊',()=>this.talkMei());}
   const more=document.createElement('details'),summary=document.createElement('summary');summary.textContent='还有别的约定';more.append(summary);box.append(more);
   for(const [text,fn]of [[G.cafeCase?.phase==='intro'?'熟客为什么走了？':'继续蓝山的调查',()=>PQCafeCase.open()],['周末夜市 · 去摆摊',()=>PQNightMarket.open()],['小美 · 纸信封与近况',()=>PQFirstDay.chatMei()],['李姐 · 最近的岛上故事',()=>PQFirstDay.chatLi()],['相遇手记',()=>PQFirstDay.memory()],[G.firstDay.stage==='coffee'?'结束第一天，去探索':'回岛上走走',()=>PQFirstDay.finish()]]){const b=document.createElement('button');b.textContent=text;b.onclick=fn;more.append(b);}
   for(const b of $('cafe-spots').querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.spot===this.spot));
   this.hint();
  },
  hint(){const s=G.cafeLife;$('cafe-life-hint').textContent=s.postcard.view&&!s.postcard.ending?'风景已经记下。拿起柜台的明信片，决定把它留给谁。':s.seat.asked&&!s.seat.choice?'李姐说，留一个位置就好。拿起杯子，选一处放下。':s.seen.includes('postcard-back')&&!s.postcard.view?'卡片背面提到了海风。去露台找一幅你想留下的风景。':'点人物聊聊，点物件检视。这里不消耗调查行动。';},
  go(spot){
   if(PQFirstDay.dialogOpen||PQPropInspector.active||this.arrival)return;
   if(spot==='terrace'){this.startVista();return;}
   this.spot=spot;PQStory3D.focus(null);this.render();
  },
  interact(id){
   if(!this.active||this.vista||this.arrival||PQFirstDay.dialogOpen||PQPropInspector.active)return;
   SFX.click();if(id==='xiaomei')this.talkMei();else if(id==='lijie')this.talkLi();else if(id==='akai')this.say('阿凯',G.cafeLife.seat.choice==='window'?['这杯是给我留的？谢谢。忙了一早上，想在这儿安静看会儿海。','下次路过，我也给你留这个位置。']:['原来可以拼桌。我总以为进咖啡馆就得埋头做点什么。','刚才和李姐聊起夜市。下个周末，算我一个。']);else if(id==='window')this.startVista();else if(id==='postcard')this.inspectPostcard();else if(id==='note')this.inspectNote();else if(id==='cup')this.inspectCup();
  },
  say(who,lines,done){const key=who==='李姐'?'lijie':who==='阿凯'?'akai':'xiaomei';PQStory3D.ensureNpc(key);PQStory3D.focus(key);PQFirstDay.say('蓝山 · 日子慢慢发生',who,lines,()=>{done?.();PQStory3D.focus(null);this.render();});},
  talkMei(){const s=G.cafeLife;if(s.postcard.ending)this.say('小美',s.postcard.ending==='wall'?['贴在这里真好。昨天还有人问，这幅海湾是不是从露台看出去的。','夜市结束，大家可以在卡片下面再留一张。把日子留着，过阵子再来看。']:['信封封好了。我给妈妈写信时，把你的那张也一起寄出去。','以前我只会告诉她“在这里挺好的”。现在，她终于能看看我们说的这片海。']);else if(s.seen.includes('postcard-back'))this.say('小美',['那是我没写完的明信片。总想着等生活更精彩一点，再给妈妈写。','后来发现，能坐在这里喝杯咖啡，也已经是想告诉她的事。去露台看看吧。']);else PQFirstDay.chatMei();},
  talkLi(){const s=G.cafeLife;if(s.seat.choice)this.say('李姐',[s.seat.choice==='window'?'阿凯今天没带电脑。你留的那个安静位置，他很喜欢。':'阿凯坐过来以后，才知道我们也是来歇一歇的。','下次他或许想聊，也或许想安静。先问一句就好。']);else if(s.seen.includes('seat-back'))this.say('李姐',['那张纸是我写的。阿凯每天送完东西，都在门口站一会儿。','他不是不想进来，是怕一个人占了位置。留杯水就好。窗边清静，拼桌能聊聊，都行。'],()=>this.step('seat-ask'));else PQFirstDay.chatLi();},
  inspectPostcard(){const s=G.cafeLife;PQPropInspector.open({type:'postcard',vista:s.postcard.view,source:'柜台上 / 一张未寄出的卡片',title:'把海风寄给你',front:['星火岛的屋檐与海湾。小美还没写上收件人。'],backTitle:'亲爱的，见字如面',back:['一直想等某件大事发生，再给你写信。','其实，今天的海风就很好。去露台看看，选一幅你想让远方的人看到的风景。','—— 小美'],onBack:()=>{const fresh=!G.cafeLife.seen.includes('postcard-back');this.step('discover','postcard-back');$('prop-status').textContent=fresh?'发现「把海风寄给你」· 去露台找一幅风景。':'';},actions:()=>s.postcard.ending?[]:G.cafeLife.postcard.view?[{label:'贴在咖啡馆的墙上',run:()=>this.finishCard('wall')},{label:'和小美的信一起寄给妈妈',run:()=>this.finishCard('sent')}]:G.cafeLife.seen.includes('postcard-back')?[{label:'放回，去海风露台',run:()=>this.startVista()}]:[],onClose:()=>{this.sync();this.hint();}});},
  finishCard(choice){this.step('postcard-finish',choice);this.sync();this.say('小美',choice==='wall'?['就贴在这里吧。以后来喝咖啡的人，也许会在旁边留下自己的风景。','这张卡片，就算我们给未来的岛民写的第一封信。']:['谢谢你。信封封上了，等会儿我把它带到邮筒。','原来普通的一天，也可以很认真地寄给一个人。']);},
  inspectNote(){PQPropInspector.open({type:'book',source:'窗边 / 杯碟下的便笺',title:'这儿有人吗？',front:['窗边这张椅子，总是空着。','如果有人在门口犹豫，记得抬头打个招呼。'],backTitle:'李姐留的一句话',back:['阿凯每天送完货会路过。','他问过：不带电脑，也不谈项目，可以在这里坐一会儿吗？','有空的话，和我聊聊。—— 李'],onBack:()=>{const fresh=!G.cafeLife.seen.includes('seat-back');this.step('discover','seat-back');$('prop-status').textContent=fresh?'发现「给一个人留座」· 和李姐聊聊。':'';},actions:()=>G.cafeLife.seen.includes('seat-back')&&!G.cafeLife.seat.choice?[{label:'放回，问问李姐',run:()=>this.talkLi()}]:[],onClose:()=>this.hint()});},
  inspectCup(){const s=G.cafeLife;PQPropInspector.open({type:'cup',source:'窗边 / 温热的杯子',title:s.seat.asked&&!s.seat.choice?'给一个人留座':'一杯慢下来的时间',front:['杯沿还带着温度。外面的树梢在风里摇动。'],back:['杯碟底面印着蓝山的名字。留一点空闲，给偶然遇见的人。'],actions:s.seat.asked&&!s.seat.choice?[{label:'留在窗边 · 让他安静看海',run:()=>this.placeCup('window')},{label:'留在拼桌 · 邀请他聊聊',run:()=>this.placeCup('shared')}]:[{label:'端着杯子，去露台坐一会儿',run:()=>this.startVista()}]});},
  placeCup(choice){
   this.step('seat-place',choice);this.sync();SFX.foley('cup');
   const rig=PQStory3D.npcs.akai,end=rig.group.position.clone(),points=(choice==='window'?[[5.8,4.7],[-2.4,4.7],[-5.4,2],[-5.4,-1.15]]:[[5.8,4.7],[2.4,4.7]]).map(p=>new T.Vector3(p[0],.08,p[1]));points.push(end);
   this.arrival={points,time:0,duration:choice==='window'?4:2.7,end,choice};rig.group.position.copy(points[0]);$('cafe-arrival').hidden=false;$('game').classList.add('cafe-arriving');$('cafe-arrival-skip').focus({preventScroll:true});
   if(PQIsland.environment.reducedMotion||PQCafeCase.reduceMotion)this.finishArrival();
  },
  finishArrival(){
   const a=this.arrival;if(!a)return;this.arrival=null;$('cafe-arrival').hidden=true;$('game').classList.remove('cafe-arriving');this.sync();
   this.say('阿凯',a.choice==='window'?['原来这儿是给我留的。谢谢，我今天刚好想一个人歇歇。','这位置看得到海。我下次还来。']:['我可以坐这儿？太好了。刚才听见你们在说周末夜市。','我送完最后一趟，就来帮忙搬桌子。']);
  },
  frame(focus,goal){
   if(!this.active)return;
   const portrait=PQIsland.camera.aspect<.8;
   if(this.spot==='window'){focus.set(-3,1.2,.1);goal.set(portrait?4:5.1,portrait?8.3:6.8,portrait?17:11.4);}else{focus.set(-.5,1.4,-.2);goal.set(portrait?6:8.3,portrait?10:8.2,portrait?21:14.4);}
  },
  update(dt,t){
   if(!this.active)return;
   const w=PQIsland,width=w.renderer.domElement.clientWidth,height=w.renderer.domElement.clientHeight;
   const guest=PQStory3D.npcs.akai,reduced=w.environment.reducedMotion||PQCafeCase.reduceMotion;
   if(this.arrival){const a=this.arrival;a.time+=dt;const u=Math.min(1,a.time/a.duration)*(a.points.length-1),index=Math.min(a.points.length-2,Math.floor(u)),from=a.points[index],to=a.points[index+1];guest.group.position.copy(from).lerp(to,u-index);guest.group.rotation.y=Math.atan2(to.x-from.x,to.z-from.z);w.animateCharacter(guest,true,reduced?0:t,3);if(u>=a.points.length-1||reduced)this.finishArrival();}
   else if(G.cafeLife.seat.choice&&guest.group.visible){guest.leftLeg.rotation.x=guest.rightLeg.rotation.x=-1.15;guest.leftArm.rotation.x=-.25;guest.rightArm.rotation.x=-.3;}
   for(const row of this.pinRows){const p=this.props[row.id];this.point.copy(p.position);this.point.y+=.35;this.point.project(w.camera);row.b.style.left=(this.point.x*.5+.5)*width+'px';row.b.style.top=(-this.point.y*.5+.5)*height+'px';row.b.hidden=PQFirstDay.dialogOpen||this.vista||PQPropInspector.active||this.point.z>1||(row.id==='postcard')!==(this.spot==='counter');}
   PQMobilePlay.placePins('#cafe-life-pins button:not([hidden])','#social-screen .room-header,#cafe-actions,#cafe-spots',true);
  },
  startVista(){
   if(!this.active||this.vista||PQPropInspector.active)return;PQFirstDay.closeDialog();const w=PQIsland,c=w.camera;
   this.vistaSaved={scene:w.scene,position:c.position.clone(),quaternion:c.quaternion.clone(),fov:c.fov,aspect:c.aspect,view:c.view?{...c.view}:null,focus:document.activeElement,ui:[...$('game').children].filter(e=>!['island-viewport','cafe-vista'].includes(e.id)).map(e=>[e,e.inert])};
   this.vistaSaved.ui.forEach(([e])=>e.inert=true);w.visibility?.suspend();w.scene=PQStory3D.saved.scene;this.vista=true;w.keys={};w.joyVec={x:0,z:0};$('game').classList.add('cafe-vista-mode');$('cafe-vista').hidden=false;this.setVista('bay',true);$('vista-back').focus({preventScroll:true});w.environment.warmup=performance.now()+900;
  },
  setVista(view,snap=false){
   this.vistaView=M.views.includes(view)?view:'bay';
   const configs={bay:{title:'星火海湾',line:'小岛被海面轻轻托着。路上的人，各自有个要去的地方。',camera:[46,39,64],look:[0,2,0]},garden:{title:'花信步道',line:'长桥那头，珊瑚花园已经亮起微光。原来岛外还有一条慢慢走的路。',camera:[12,22,72],look:[24,1,35]},cafe:{title:'蓝山的屋檐',line:'从这里看，熟悉的咖啡馆也像一张还没写完的明信片。',camera:[-42,26,29],look:[-7,1,0]}};
   const p=configs[this.vistaView];this.vistaGoal=new T.Vector3(...p.camera);this.vistaLook=new T.Vector3(...p.look);
   if(snap){this.vistaCamera=this.vistaGoal.clone();this.vistaTarget=this.vistaLook.clone();}this.vistaProgress=0;
   $('vista-title').textContent=p.title;$('vista-line').textContent=p.line;$('vista-keep').hidden=!G.cafeLife.seen.includes('postcard-back')||!!G.cafeLife.postcard.ending;$('vista-keep').textContent='把这一幕画在明信片上';$('vista-keep').disabled=true;
   for(const b of $('cafe-vista').querySelectorAll('[data-view]'))b.setAttribute('aria-pressed',String(b.dataset.view===this.vistaView));
  },
  updateVista(dt,t){
   if(!this.vista)return;const w=PQIsland,reduced=w.environment.reducedMotion||PQCafeCase.reduceMotion,k=reduced?1:1-Math.exp(-dt*4);this.vistaCamera.lerp(this.vistaGoal,k);this.vistaTarget.lerp(this.vistaLook,k);
   w.camera.fov=45;w.camera.clearViewOffset();w.camera.position.copy(this.vistaCamera);if(w.camera.aspect<1)w.camera.position.sub(this.vistaTarget).multiplyScalar(1.45).add(this.vistaTarget);w.camera.lookAt(this.vistaTarget);w.camera.updateProjectionMatrix();
   // Choose LOD and sky from this view, never the previous interior camera.
   w._updateTimeOfDay(dt,t);w._updateCars(reduced?0:dt);w._updateCitizens(reduced?0:dt,reduced?0:t);w._updateAmbient(reduced?0:dt,reduced?0:t);w.environment.update(dt,t);
   w.environment.composite.uniforms.uInvProjection.value.copy(w.camera.projectionMatrixInverse);w.environment.composite.uniforms.uFocus.value=w.camera.position.distanceTo(this.vistaTarget);
   this.vistaProgress+=dt;if(this.vistaProgress>.6||reduced)$('vista-keep').disabled=false;
  },
  endVista(){
   if(!this.vista)return;const s=this.vistaSaved,w=PQIsland;this.vista=false;w.scene=s.scene;w.camera.position.copy(s.position);w.camera.quaternion.copy(s.quaternion);w.camera.fov=s.aspect===w.camera.aspect?s.fov:w.camera.aspect<.68?62:w.camera.aspect<1?52:45;w.camera.clearViewOffset();w.camera.updateProjectionMatrix();s.ui.forEach(([e,inert])=>e.inert=inert);$('cafe-vista').hidden=true;$('game').classList.remove('cafe-vista-mode');PQStory3D.viewKey='';this.vistaSaved=null;w._lastTime=performance.now();w.environment.lastFrame=0;w.environment.warmup=performance.now()+600;this.render();s.focus?.focus?.({preventScroll:true});
  },
  detach(destroy=false){
   if(this.vista)this.endVista();this.active=false;this.canvas?.removeEventListener('click',this.pick);this.canvas=null;this.pick=null;
   this.arrival=null;$('cafe-arrival').hidden=true;$('game')?.classList.remove('cafe-life-mode','cafe-arriving');if(this.props)this.props.root.visible=false;if(PQStory3D.npcs?.akai)PQStory3D.npcs.akai.group.visible=false;
   for(const row of this.pinRows||[])row.b.hidden=true;
   if(destroy){for(const row of this.pinRows||[])row.b.remove();this.pinRows=[];this.props=null;this.room=null;}
  }
 };window.PQCafeLife=C;
})();
