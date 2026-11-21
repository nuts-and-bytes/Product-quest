/* First-day direction, persistent social clues and small, authored NPC conversations. */
(function(){
  'use strict';
  const $=id=>document.getElementById(id),T=THREE;
  const J={dialogOpen:false,guide:null,route:null,near:false,
    init(){
      G.firstDay=PQFirstDayState.normalize(G.firstDay,G.progress);
      const game=$('game');
      game.insertAdjacentHTML('beforeend',`
        <div id="journey-hud" hidden><div class="journey-eyebrow">DAY 01 / 入职第一天 <span id="journey-count"></span></div><h2 id="journey-title"></h2><p id="journey-hint"></p><div class="journey-actions"><button id="journey-go" class="journey-primary"></button><button id="journey-pause">先自由走走</button></div></div>
        <div id="player-marker" hidden><i></i><span>你</span></div>
        <button id="guide-marker" hidden>夏青 · 接待你的同事</button>
        <div id="journey-tools" hidden><button id="journey-locate">◎ 找到自己</button><button id="journey-resume" hidden>继续入职引导 →</button><button id="journey-help">操作</button></div>
        <div id="journey-dialog" role="dialog" aria-label="人物对话" hidden><div class="journey-eyebrow" id="journey-dialog-place"></div><h2 id="journey-speaker"></h2><p id="journey-text"></p><div id="journey-options"></div></div>
        <div class="screen" id="social-screen"><div class="room-header"><button id="cafe-exit">← 回到岛上</button><span>蓝山咖啡馆 <small>一杯咖啡的时间</small></span><button id="cafe-memory">相遇手记</button></div><button class="room-person" id="cafe-mei" hidden>夏青 · 聊一聊</button><button class="room-person" id="cafe-li" hidden>李姐 · 打个招呼</button><div id="cafe-actions"><div class="journey-eyebrow">暂时把工作放在一边</div><h2 id="cafe-welcome">第一杯，想喝什么？</h2><p id="cafe-description">夏青替你留了靠窗的位置。这里的故事，慢慢聊。</p><div id="cafe-buttons"></div></div></div>
        <div id="journey-transition" aria-hidden="true"></div>`);
      this.ready=true;
      $('journey-go').onclick=()=>this.act();$('guide-marker').onclick=()=>this.meet();
      $('journey-pause').onclick=()=>{G.firstDay.paused=true;G.save();this.clearRoute();PQIsland.walkGoal=null;PQIsland.walkPath=[];this.render();};
      $('journey-resume').onclick=()=>{G.firstDay.paused=false;G.save();this.onMap();};
      $('journey-locate').onclick=()=>this.locate();
      $('journey-help').onclick=()=>this.say('星火岛 · 随时可以回来','探索提示',[
        '点击地面或使用 WASD / 方向键移动；手机也可拖动左下角摇杆。拖拽空白处转动镜头。',
        '金色背包和脚下的细光环属于你。靠近目标后按 E 或点任务按钮交互；“找到自己”会把镜头带回来。'
      ],()=>this.render());
      $('cafe-mei').onclick=()=>this.chatMei();$('cafe-li').onclick=()=>this.chatLi();
      $('cafe-exit').onclick=()=>this.leaveCafe();$('cafe-memory').onclick=()=>this.memory();
      window.addEventListener('keydown',e=>{
        if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.repeat)return;
        if(this.dialogOpen){if((e.key==='Enter'||e.key===' ')&&e.target.tagName!=='BUTTON'){e.preventDefault();e.stopImmediatePropagation();$('journey-options').querySelector('button')?.click();}return;}
        if(e.key.toLowerCase()==='e'&&this.guided()&&$('map-screen').classList.contains('active')){
          if(PQIsland.environment.courseHere)return;
          e.preventDefault();e.stopImmediatePropagation();this.act();
        }
      },true);
      G.save();
    },
    replay(){
      G.firstDay={...G.firstDay,stage:'arrival',paused:false,started:true,replay:true,lesson:null};G.save();
      PQIsland.playerPos.set(-6.5,1.04,4.8);G.toMap();
    },
    guided(){return G.firstDay&&G.firstDay.stage!=='complete'&&!G.firstDay.paused;},
    step(event){G.firstDay=PQFirstDayState.step(G.firstDay,event);G.save();this.render();},
    onMap(){
      this.closeDialog();
      const w=PQIsland,s=G.firstDay;
      if(this.guide)this.guide.group.visible=this.guided()&&['arrival','hq'].includes(s.stage);
      w.npcRigs.forEach(n=>{if(n.role==='xiaomei')n.rig.group.visible=!(this.guided()&&['arrival','hq'].includes(s.stage));});
      if(this.guided()){
        if(s.stage==='arrival')w.playerPos.set(-6.5,1.04,4.8);
        s.started=true;G.save();w.diveAnim=null;w.setCinematic(null);w.setCloudOpen(1,true);w.setMode('walk');w.recentre(true);
        this.frameIsland(true);
        if(['arrival','hq'].includes(s.stage)){
          if(!this.guide){this.guide=w.createCharacter('xiaomei');w.scene.add(this.guide.group);}
          this.guide.group.visible=true;
          this.guide.group.position.set(-7,1.04,1.4);this.guide.group.rotation.y=.4;
        }
        $('isl-status').classList.remove('show');
      }
      this.render();
    },
    reach(){return G.firstDay.stage==='arrival'?2.4:3.3;},
    target(){
      const s=G.firstDay?.stage,w=PQIsland;
      if(s==='arrival')return this.guide?.group.position;
      return w.buildings[['cafe','coffee'].includes(s)?'cafe':'hq']?.doorPos;
    },
    render(){
      if(!this.ready)return;
      const map=$('map-screen').classList.contains('active'),s=G.firstDay;
      $('game').classList.toggle('guided-mode',map&&this.guided());
      $('journey-hud').hidden=!map||!this.guided()||this.dialogOpen;
      $('journey-tools').hidden=!map||this.dialogOpen;
      $('journey-resume').hidden=!s.paused||s.stage==='complete';
      $('guide-marker').hidden=!map||!this.guided()||s.stage!=='arrival'||this.dialogOpen;
      if(!map)$('player-marker').hidden=true;
      const rows={
        arrival:['01 / 04','先认识带你入职的夏青','金色背包的小人就是你。点击地面走到夏青身边。','走向夏青','与夏青打招呼'],
        hq:['02 / 04','和夏青去星火科技','沿金色路线去总部。到门口后，再进入办公室。','带我去总部','进入 3D 办公室'],
        office:['02 / 04','继续第一天的入职对话','王总还在办公室等你。已完成的对话会自动保存。','回到总部','继续入职对话'],
        cafe:['03 / 04','去蓝山喝一杯','第一次任务完成了。夏青约你去总部旁的咖啡馆。','带我去咖啡馆','推门进入咖啡馆'],
        coffee:['03 / 04','回到咖啡馆坐坐','你的饮品和相遇手记已保存，随时可以接着聊。','回到咖啡馆','进入咖啡馆']
      };
      const r=rows[s.stage];if(!r)return;
      $('journey-count').textContent=r[0];$('journey-title').textContent=r[1];$('journey-hint').textContent=r[2];
      const goal=this.target();this.near=!!goal&&Math.hypot(PQIsland.playerPos.x-goal.x,PQIsland.playerPos.z-goal.z)<this.reach();
      $('journey-go').textContent=r[this.near?4:3]+(this.near?' · E':' →');
    },
    frameIsland(snap=false){
      // Keep the island readable throughout the outdoor introduction.
      PQIsland.frameWalk(snap);
    },
    locate(){
      const w=PQIsland;w.setMode('walk');w.recentre();
      this.frameIsland();
      this.markerUntil=performance.now()+4000;
      if(this.guided())$('isl-status').classList.remove('show');
    },
    clearRoute(){
      if(this.route){PQIsland.scene.remove(this.route);this.route.geometry.dispose();this.route.material.dispose();this.route=null;}
      this.guidePath=[];
    },
    walkTo(goal){
      const w=PQIsland,path=PQWorldMap.findPath(w.playerPos,goal,PQ.buildings);if(!path){w.setStatus('先回到道路上，再点击继续引导。',3000);return;}
      // Starting a route must preserve the player's chosen distance and angle.
      if(w.mode!=='walk'){w.setMode('walk');if(this.guided())this.frameIsland();}
      w.walkPath=path.map(p=>({...p}));w.walkGoal=w.walkPath.shift();
      w.goalRing.position.set(goal.x,1.08,goal.z);w.goalRing.visible=true;
      this.clearRoute();
      const points=[w.playerPos,...path].map(p=>new T.Vector3(p.x,1.09,p.z));
      this.route=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineDashedMaterial({color:'#f4d49b',dashSize:.5,gapSize:.4,transparent:true,opacity:.65,depthWrite:false}));
      this.route.computeLineDistances();w.scene.add(this.route);
      if(this.guide&&G.firstDay.stage==='hq')this.guidePath=PQWorldMap.findPath(this.guide.group.position,goal,PQ.buildings)||[];
      $('isl-status').classList.remove('show');
    },
    act(){
      if(this.dialogOpen||!this.guided())return;
      const target=this.target();if(!target)return;
      if(Math.hypot(PQIsland.playerPos.x-target.x,PQIsland.playerPos.z-target.z)>=this.reach()){this.walkTo(target);return;}
      this.clearRoute();
      if(G.firstDay.stage==='arrival'){this.meet();return;}
      if(['hq','office'].includes(G.firstDay.stage))this.transition('hq',()=>G.startLevel(0));
      else this.enterCafe();
    },
    meet(){
      if(G.firstDay.stage!=='arrival')return;
      const target=this.target();if(Math.hypot(PQIsland.playerPos.x-target.x,PQIsland.playerPos.z-target.z)>=this.reach()){this.walkTo(target);return;}
      this.say('星火岛 · 第一次相遇','夏青',[
        `${G.avatar.name==='你'?'新同事':G.avatar.name}，欢迎！我是夏青。看见你的金色背包了，一下就认出你。以后找不到自己，点“找到自己”就好。`,
        '第一天先做一件事：去总部见王总。我在前面等你，走到门口，按 E 或点按钮就能进去。',
        '忙完一起喝杯咖啡？蓝山的靠窗位置很舒服。放心，今天不用把整座岛逛完。'
      ],()=>{this.step('meet');this.walkTo(this.target());});
    },
    transition(building,done){
      if(this.transitioning)return;this.transitioning=true;this.closeDialog();this.clearRoute();G.closeBuilding(true);
      const veil=$('journey-transition');veil.classList.add('show');
      this.transitionTimer=setTimeout(()=>{
        const w=PQIsland,b=w.buildings[building];if(b){w.playerPos.copy(b.doorPos);w.playerPos.y=1.04;}
        this.transitioning=false;done();requestAnimationFrame(()=>veil.classList.remove('show'));
      },PQIsland.environment.reducedMotion?0:260);
    },
    interceptBuilding(b){
      if(!this.guided())return false;
      const wanted=['cafe','coffee'].includes(G.firstDay.stage)?'cafe':'hq';
      if(G.firstDay.stage==='arrival'){this.walkTo(this.target());return true;}
      if(b.id===wanted)this.act();else PQIsland.setStatus('先完成左上角的当前目标；也可以点“先自由走走”。',3000);
      return true;
    },
    say(place,speaker,lines,onDone){
      this.closeDialog();this.dialogOpen=true;$('game').classList.add('conversation-open');this.dialogLines=lines;this.dialogIndex=0;this.dialogDone=onDone;
      PQIsland.keys={};PQIsland.walkGoal=null;PQIsland.walkPath=[];PQIsland.joyVec={x:0,z:0};
      $('journey-dialog').hidden=false;$('journey-dialog-place').textContent=place;$('journey-speaker').textContent=speaker;
      this.render();this.dialogNext();
    },
    dialogNext(){
      if(this.dialogIndex>=this.dialogLines.length){const done=this.dialogDone;this.closeDialog();done?.();return;}
      $('journey-text').textContent=this.dialogLines[this.dialogIndex++];
      const b=document.createElement('button');b.className='journey-primary';b.textContent=this.dialogIndex===this.dialogLines.length?'好，记住了 →':'继续 →';b.onclick=()=>this.dialogNext();
      $('journey-options').replaceChildren(b);b.focus({preventScroll:true});
    },
    closeDialog(){this.dialogOpen=false;$('game')?.classList.remove('conversation-open');if($('journey-dialog'))$('journey-dialog').hidden=true;},
    enterCafe(){
      this.transition('cafe',()=>{
        this.step('enterCafe');PQStory3D.enter('cafe','xiaomei');G.show('social-screen');this.renderCafe();
      });
    },
    renderCafe(){
      if(window.PQCafeLife){PQCafeLife.render();return;}
      const s=G.firstDay,box=$('cafe-buttons');box.replaceChildren();
      $('cafe-welcome').textContent=s.drink?'把节奏放慢一点。':'第一杯，想喝什么？';
      $('cafe-description').textContent=s.drink?`你点的${s.drink==='coffee'?'手冲咖啡':'热茶'}已经上桌。聊聊天，或只是坐一会儿。`:'夏青替你留了靠窗的位置。这杯算她请你的。';
      const button=(text,fn)=>{const b=document.createElement('button');b.textContent=text;b.onclick=fn;box.appendChild(b);};
      if(!s.drink){button('☕ 来杯手冲',()=>this.order('coffee'));button('♨ 想喝热茶',()=>this.order('tea'));}
      else{
        button(G.cafeCase?.phase==='complete'?'蓝山 · 查看项目手记':G.cafeCase?.phase==='intro'?'蓝山 · 熟客为什么走了？':'蓝山 · 继续我的调查',()=>PQCafeCase.open());
        if(window.PQNightMarket)button('周末夜市 · 和夏青去摆摊',()=>PQNightMarket.open());
        button('夏青 · 聊聊她的纸信封',()=>this.chatMei());button('李姐 · 打个招呼',()=>this.chatLi());button('窗边 · 坐一会儿',()=>this.rest());
        button(s.stage==='coffee'?'结束第一天，去探索 →':'继续探索 →',()=>this.finish());
        if(window.PQCampaign)button('去赴下一个约 · '+PQChapterJourney.def(G.campaign.current).name,()=>{this.finish();this.closeDialog();PQCampaign.travel(G.campaign.current);});
      }
      if(!s.drink)button('先看看柜台前发生了什么',()=>PQCafeCase.open());
    },
    order(drink){
      G.firstDay.drink=drink;G.save();PQStory3D.focus('xiaomei');
      this.say('蓝山咖啡馆 · 一杯慢下来的时间','夏青',[
        drink==='coffee'?'给你点了杯手冲。先闻一下，有一点坚果的味道。第一天还适应吗？':'热茶也很好，握着杯子就暖起来了。第一天还适应吗？',
        '我每周给自己留一杯的预算。喏，这个写着“周末”的纸信封，可比我手机上的记账软件管用。'
      ],()=>{PQStory3D.focus(null);this.renderCafe();});
    },
    clue(id){if(!G.firstDay.clues.includes(id)){G.firstDay.clues.push(id);G.save();}},
    chatMei(){
      PQStory3D.ensureNpc('xiaomei');PQStory3D.focus('xiaomei');
      this.say('蓝山咖啡馆 · 认识一个真实的人','夏青',[
        G.firstDay.clues.includes('envelopes')?'你还记得我的纸信封呀。我现在还是会用它，手写的金额总比手机数字更有感觉。':'你问这个信封？发工资那天，我就把周末能花的钱放进去。剩下的先转给妈妈保管。',
        G.nightMarket?.legacy?('夜市那晚，我们卖出了 '+PQNightMarketModel.result(G.nightMarket.legacy.run).served+' 杯。'+(G.nightMarket.legacy.run.plan.space==='bench'?'长凳搬到蓝山旁边了。下次周末，来那儿坐坐。':'取餐架搬到蓝山旁边了，早上赶车的人也能用。')):'也试过记账。忙两天忘了，再打开就是一堆要补的记录……索性不打开了。纸信封笨一点，但空了我就知道该停。',
        G.campaign?.records['2'].committed?(PQChapterJourney.result(G.campaign,'2',G.campaign.records['2'].committed).good?'你看过我完整的一个月了。上次到账以后就能确认分配，确实赶上了。我把新记录夹回信封了。':'你还记得上次那张生活时间线吗？我们试的办法还有没接住的地方。下个月，再陪我看看它出现在什么时候吧。'):'改天你想听我讲上个月怎么买东西买超了，我给你翻翻订单。今天先好好喝完这杯。'
      ],()=>{this.clue('envelopes');PQStory3D.focus(null);this.renderCafe();});
    },
    chatLi(){
      PQStory3D.ensureNpc('lijie');PQStory3D.focus('lijie');
      this.say('蓝山咖啡馆 · 窗边的老朋友','李姐',[
        G.firstDay.clues.includes('investor')?'又见面了。还是那句话，先把咖啡喝完。':'你是王总的新同事？我是李姐。他没事就爱给我发“绝妙想法”。来，坐。',
        G.campaign?.records['7'].committed?(G.campaign.records['7'].committed.plan.consent==='checked'?'上次默认勾选的报价，我没有算进收入。下次先让人自己确认，好吗？':G.campaign.records['7'].committed.plan.access==='wall'?'上次夏青连原来的记录都看不了了。收费之前，要想想我们先前答应过她什么。':'上次集市那份记录我还留着。愿意买的人和拒绝的人，都值得听听。那只是一次小试验，别急着给它写个大结论。'):'我每周三都坐这里。今天不聊项目。你如果真去听过几个人的故事，下次带来，我更愿意听那个。',
        '这个位置看得见进出的人，很适合发呆。也很适合留意：大家说想要什么，和实际在做什么。'
      ],()=>{this.clue('investor');PQStory3D.focus(null);this.renderCafe();});
    },
    rest(){
      if(window.PQCafeLife?.active){PQCafeLife.startVista();return;}
      PQStory3D.focus(null);
      this.say('蓝山咖啡馆 · 窗边','片刻休息',[
        '杯子还热着。窗外的海风摇着树梢，吧台传来很轻的杯碟声。',
        '你不需要立刻想出下一个功能。先把这口喝完。'
      ],()=>this.renderCafe());
    },
    memory(){
      const s=G.firstDay,lines=[];
      if(s.clues.includes('envelopes'))lines.push('夏青的纸信封：发薪日先分好预算，余钱交给妈妈。她答应以后聊聊自己的真实消费经历。');
      if(s.clues.includes('investor'))lines.push('窗边的李姐：每周三来蓝山。她愿意听真实的人和行为，胜过一个漂亮的点子。');
      if(G.cafeCase?.legacy)lines.push('蓝山项目手记：你试过的办法已经留在店里。回到咖啡馆的调查入口，可以查看结果或体验不同的营业日。');
      if(G.cafeLife?.postcard.ending)lines.push(G.cafeLife.postcard.ending==='wall'?'寄给海风的明信片：你把风景贴在了蓝山的墙上。':'寄给海风的明信片：夏青把它和给妈妈的信一起寄出。');
      if(G.cafeLife?.seat.choice)lines.push(G.cafeLife.seat.choice==='window'?'给一个人留座：阿凯有了一处安静看海的位置。':'给一个人留座：阿凯坐到了大家身边，约好周末再见。');
      if(!lines.length)lines.push('还没有记下新的相遇。和夏青或窗边的李姐聊聊，故事会慢慢留下来。');
      this.say('相遇手记 · 自动保存','今天记住的事',lines,()=>this.renderCafe());
    },
    leaveCafe(){
      if(G.firstDay.stage==='coffee'&&G.firstDay.drink){this.finish();return;}
      this.closeDialog();G.toMap();
    },
    finish(){
      const first=G.firstDay.stage==='coffee';this.step('finishCoffee');this.closeDialog();G.toMap();
      if(first)this.say('DAY 01 / 从今天起，这也是你的岛','第一天，完成了。',[
        '你认识了夏青，接到了第一个项目，也有了一家可以随时回来的咖啡馆。',
        '夏青约你在波波奶茶店见面。这次，她会带来信封和收据。左上角的任务可以带路，走累了也可以回来喝一杯。'
      ],()=>{this.render();PQCampaign.mapHud();});
    },
    saveLesson(phase='story'){
      if(G.lvIdx!==0||G.firstDay.stage!=='office')return;
      G.firstDay.lesson={phase,node:G.nodeIdx,quiz:G.quizIdx,score:G.dScore,correct:G.qOk};G.save();
    },
    restoreLesson(){
      const l=G.firstDay.lesson,lv=PQ.levels[0];if(!l||G.lvIdx!==0)return false;
      G.nodeIdx=Math.min(l.node,lv.script.length);G.quizIdx=Math.min(l.quiz,lv.quiz.length-1);G.dScore=Math.min(l.score,G.dMax);G.qOk=Math.min(l.correct,G.quizIdx);
      if(l.phase==='quiz'){ $('quiz-panel').classList.add('show');G.showQuizQ();return true; }
      return false;
    },
    nodeText(node,text){
      if(!node.memory)return text;
      return G.firstDay.clues.includes(node.memory)?node.remember:text;
    },
    update(dt,t){
      if(!this.ready)return;
      const w=PQIsland,map=$('map-screen').classList.contains('active');
      const blocked=this.dialogOpen||this.transitioning;
      if(blocked){w.keys={};w.walkGoal=null;w.joyVec={x:0,z:0};}
      if(!map||PQStory3D.active){$('player-marker').hidden=true;$('guide-marker').hidden=true;return;}
      const label=$('player-marker');
      const project=(pos,el,y)=>{const v=pos.clone();v.y+=y;v.project(w.camera);el.hidden=v.z>1||v.z< -1||Math.abs(v.x)>1||Math.abs(v.y)>1;
        if(!el.hidden)el.style.transform=`translate(${(v.x*.5+.5)*w.renderer.domElement.clientWidth}px,${(-v.y*.5+.5)*w.renderer.domElement.clientHeight}px) translate(-50%,-100%)`;};
      if(w.mode!=='fp'&&!w.archipelago&&!blocked){project(w.playerPos,label,2.85);label.querySelector('span').textContent=G.avatar.name==='你'?'你 · 金色背包':G.avatar.name+' · 你';}else label.hidden=true;
      if(this.guide&&this.guide.group.visible){
        let moving=false;
        if(this.guidePath?.length&&!blocked){const goal=this.guidePath[0],p=this.guide.group.position,dx=goal.x-p.x,dz=goal.z-p.z,d=Math.hypot(dx,dz);
          if(d<.25)this.guidePath.shift();else if(p.distanceTo(w.playerPos)<5){const step=Math.min(d,dt*5.5);p.x+=dx/d*step;p.z+=dz/d*step;this.guide.group.rotation.y=Math.atan2(dx,dz);moving=true;}}
        w.animateCharacter(this.guide,moving,w.environment.reducedMotion?0:t,1);
        if(this.guided()&&G.firstDay.stage==='arrival'&&!blocked)project(this.guide.group.position,$('guide-marker'),2.8);
      }
      if(this.guided()){
        const target=this.target(),near=target&&Math.hypot(w.playerPos.x-target.x,w.playerPos.z-target.z)<this.reach();
        if(near!==this.near){this.render();if(near){if(this.route){w.walkGoal=null;w.walkPath=[];w.goalRing.visible=false;}this.clearRoute();}}
      }
    }
  };
  window.PQFirstDay=J;
})();
