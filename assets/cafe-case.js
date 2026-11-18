/* One authored investigation: free order of inquiry, editable plans and visible consequences. */
(function(){
  'use strict';
  const M=PQCafeModel,D=PQCafeDialogue,$=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const C={active:false,detail:null,help:false,mode:'explore',history:false,textSize:18,
    init(){
      G.cafeCase=M.normalize(G.cafeCase);
      try{this.reduceMotion=localStorage.getItem('pq-cafe-reduce-motion')==='1';}catch(e){this.reduceMotion=false;}
      $('game').insertAdjacentHTML('beforeend',`<section class="screen" id="cafe-case-screen" aria-label="蓝山咖啡馆调查">
        <header id="case-topbar"><button data-act="exit">← 咖啡馆</button><div><span class="case-kicker">BLUE MOUNTAIN / FIELD NOTES</span><strong id="case-name"></strong></div><nav aria-label="调查工具"><button data-act="journal">手记 <span id="case-note-count">0</span></button><button data-act="films" aria-label="回看岛上生活">故事</button><button data-act="help" aria-label="玩法与帮助">帮助</button></nav></header>
        <div id="case-scene-note"><span id="case-scene-mode">窗边观察</span><p id="case-scene-status">阿晨正在往柜台走。</p><div><button data-act="pause" id="case-pause">暂停画面</button><button data-act="replay">重看这一段</button></div></div>
        <div id="case-people" aria-hidden="true"></div>
        <div id="case-hotspots" aria-label="店里的人与物"><button data-act="talk" id="case-achen" class="case-hotspot case-hotspot-main"><span>阿晨</span><small>聊聊刚才的事</small></button><button data-act="read" data-value="orders" id="case-orders" class="case-hotspot">柜台订单 <small>查看</small></button><button data-act="read" data-value="staff" id="case-staff" class="case-hotspot">夏青 <small>聊聊工作</small></button></div>
        <div id="case-explore"></div><section id="case-dialogue" aria-label="与阿晨交谈" hidden></section>
        <aside id="case-panel" aria-label="手记与试验"><div id="case-content"></div></aside>
        <div id="case-transition" hidden><span id="case-transition-label"></span><button data-act="skip-motion">跳过动作 ↵</button></div>
        <div id="case-notice" role="status" aria-live="polite"></div>
      </section>`);
      $('cafe-case-screen').addEventListener('click',e=>{const b=e.target.closest('button[data-act]');if(b&&!b.disabled)this.act(b.dataset.act,b.dataset.value);});
      $('cafe-case-screen').addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();this.act(this.detail||this.help||['journal','films'].includes(this.mode)?'back':this.history&&this.mode==='talk'?'history':'explore');}});
      G.save();
    },
    open(film){
      this.active=true;this.detail=null;this.help=false;this.mode='explore';this.returnMode='explore';this.history=false;this.lastView=null;
      PQFirstDay.closeDialog();PQStory3D.enter('cafe','xiaomei');G.show('cafe-case-screen');
      $('game').classList.add('case-mode');PQStory3D.viewKey='';
      PQCafeScene.attach();this.render();this.preview();
      if(typeof film==='string'&&PQLifeFilm.play(film))return;
      if(!PQLifeFilm.seen('morning'))PQLifeFilm.play('morning');
    },
    suspend(){
      if(!this.active)return;
      this.active=false;if(window.PQLifeFilm?.active)PQLifeFilm.finish(false);this.clearPresentation();PQCafeScene.detach();$('game').classList.remove('case-mode');
      if(PQStory3D.active)PQStory3D.viewKey='';
    },
    close(){this.suspend();G.show('social-screen');PQFirstDay.renderCafe();},
    save(event,value){G.cafeCase=M.advance(G.cafeCase,event,value);G.save();},
    preview(){
      const s=G.cafeCase,t=['result','review','complete'].includes(s.phase)?s.trials[s.selected]:null;
      const plan=t?t.plan:[];
      PQCafeScene.play(M.simulate(s.scenario,plan),plan);
      $('case-scene-mode').textContent=t?`试验 ${s.selected+1} · ${plan.map(id=>M.plans[id].short).join(' + ')}`:`${M.scenarios[s.scenario].day} · 改动前`;
      $('case-pause').textContent=PQCafeScene.paused?'播放画面':'暂停画面';
    },
    act(event,value){
      const s=G.cafeCase;
      if(event==='film'){PQLifeFilm.play(value);return;}
      if(event==='films'){this.returnMode=['journal','films'].includes(this.mode)?this.returnMode:this.mode;this.mode='films';this.detail=null;this.help=false;this.render();return;}
      if(event==='skip-motion'){PQCafeScene.finishTransition();return;}
      PQCafeScene.finishTransition();
      if(!SFX.muted)SFX.ac();
      if(event==='sound'){G.toggleMute();this.render();return;}
      if(event==='motion'){this.reduceMotion=!this.reduceMotion;if(this.reduceMotion){PQCafeScene.paused=true;$('case-pause').textContent='播放画面';}try{localStorage.setItem('pq-cafe-reduce-motion',this.reduceMotion?'1':'0');}catch(e){}this.render();return;}
      if(event==='exit'){this.close();return;}
      if(event==='talk'){
        if(s.phase!=='investigate')return;
        this.mode='talk';this.detail=null;this.help=false;this.history=false;this.render();return;
      }
      if(event==='say'){
        G.cafeCase=D.choose(s,value);G.save();this.history=false;this.render();return;
      }
      if(event==='explore'){this.mode='explore';this.detail=null;this.help=false;this.history=false;this.render();return;}
      if(event==='history'){this.history=!this.history;this.render();return;}
      if(event==='text-size'){this.textSize=this.textSize===18?22:18;this.render();return;}
      if(event==='compare'){
        if(s.phase!=='investigate'){this.notice('这次调查已经进入试验阶段。回到现场后可以继续交谈。');return;}
        G.cafeCase=D.choose(s,'compare');G.save();this.mode='talk';this.detail=null;this.help=false;this.history=false;this.render();return;
      }
      if(event==='journal'){this.returnMode=this.mode==='journal'?this.returnMode:this.mode;this.mode='journal';this.detail=null;this.help=false;this.render();return;}
      if(event==='pause'){PQCafeScene.paused=!PQCafeScene.paused;$('case-pause').textContent=PQCafeScene.paused?'播放画面':'暂停画面';return;}
      if(event==='replay'){this.preview();return;}
      if(event==='help'){if(!this.help){this.helpReturn={mode:this.mode,detail:this.detail};this.help=true;this.detail=null;}else this.restoreHelp();this.render();return;}
      if(event==='back'){if(this.help)this.restoreHelp();else if(this.detail){this.detail=null;this.mode=this.readReturn||'explore';}else if(['journal','films'].includes(this.mode))this.mode=this.returnMode||'explore';this.render();return;}
      if(event==='read'){
        if(value==='recent'||value==='opinion'){if(s.phase==='investigate'&&!s.actions.includes(value)){this.act('talk');return;}}
        if(!s.actions.includes(value)&&M.remaining(s)<=2){this.notice('留下的 2 格可以完成一次试验。已读材料仍可免费查看。');return;}
        this.save('observe',value);
        if(!G.cafeCase.actions.includes(value))return;
        this.readReturn=this.mode;this.detail=value;this.help=false;
        if(value==='observe'&&this.mode!=='journal'){this.mode='observe';this.detail=null;this.preview();}
        this.render();if(this.detail)PQPropLibrary.cafe(value);return;
      }
      if(event==='toggle'&&!s.plan.includes(value)&&M.cost([...s.plan,value])>M.BUDGET){this.notice('这次最多投入 6 枚预算。先收起一项改动，再比较取舍。');return;}
      if(event==='pin'&&!s.pins.includes(value)&&s.pins.length>=3){this.notice('最多圈出 3 份关键证据；可以先取消一份。');return;}
      this.save(event,event==='select'?Number(value):value);
      if(event==='start'||event==='investigate'||event==='plan'||event==='review'||event==='next'){this.detail=null;this.help=false;this.mode='explore';this.history=false;}
      this.render();
      if(['trial','select','next','finish'].includes(event))this.preview();
      if(event==='finish')PQCafeScene.applyLegacy();
      if(event==='start'&&s.phase==='intro'&&G.cafeCase.phase==='investigate'&&!PQLifeFilm.seen('incident'))PQLifeFilm.play('incident');
      if(event==='trial'&&G.cafeCase.trials.length>s.trials.length)PQLifeFilm.play('outcome');
    },
    restoreHelp(){this.help=false;if(this.helpReturn){this.mode=this.helpReturn.mode;this.detail=this.helpReturn.detail;}this.helpReturn=null;},
    notice(text){$('case-notice').textContent=text;clearTimeout(this.noticeTimer);this.noticeTimer=setTimeout(()=>$('case-notice').textContent='',4000);},
    button(text,act,value='',style='',disabled=false,pressed){return `<button class="${style}" data-act="${act}" data-value="${esc(value)}"${disabled?' disabled':''}${pressed===undefined?'':` aria-pressed="${pressed}"`}>${text}</button>`;},
    head(kicker,title,text=''){return `<div class="case-kicker">${kicker}</div><h1 tabindex="-1">${title}</h1>${text?`<p class="case-lead">${text}</p>`:''}`;},
    render(){
      if(!this.active)return;
      const s=G.cafeCase,cfg=M.scenarios[s.scenario],left=M.remaining(s),panel=$('case-panel'),scroll=panel.scrollTop,phase=s.phase;
      $('case-name').textContent=cfg.name;
      $('case-note-count').textContent=s.actions.length;
      for(const id of ['orders','staff']){const b=$('case-'+id),seen=s.actions.includes(id);b.querySelector('small').textContent=seen?'已读 · 免费':'新线索 · −1 格';b.disabled=!seen&&left<=2;}
      const view=this.help||this.detail||['journal','films'].includes(this.mode)?'evidence':phase==='intro'?'intro':phase==='investigate'?this.mode:['result','review','complete'].includes(phase)?'replay':'workbench';
      const screen=$('cafe-case-screen');screen.dataset.view=view;
      panel.hidden=['talk','explore','observe'].includes(view);
      $('case-hotspots').hidden=view!=='explore';$('case-explore').hidden=view!=='explore'&&view!=='observe';
      $('case-dialogue').hidden=view!=='talk';$('case-scene-note').hidden=view!=='observe'&&view!=='replay';
      const dialogue=D.current(s);
      PQCafeScene.setView(view,dialogue.stage||'guest',dialogue.id,this.help?'help':['journal','films'].includes(this.mode)?this.mode:this.detail||'');
      if(view==='explore'||view==='observe')$('case-explore').innerHTML=this.exploration(view);
      if(view==='talk')this.renderDialogue();
      let html=`<div class="case-meta"><span>${cfg.day}</span><span>${phase==='intro'?'随时可离开':phase==='complete'?'已存入项目手记':`行动余量 ${left} / ${M.LIMIT}`}</span></div>`;
      if(view==='evidence')html=`<div id="case-sheet-tools">${this.button(this.help?'← 返回刚才':this.detail&&this.readReturn==='talk'?'← 返回对话':'← 返回','back')}<span>${this.mode==='films'&&!this.help?'岛上故事':'随身手记'}</span></div>`+html;
      if(phase!=='intro'&&phase!=='complete')html+=`<div class="case-clock" aria-label="剩余 ${left} 格行动">${Array.from({length:M.LIMIT},(_,i)=>`<i class="${i<left?'on':''}"></i>`).join('')}</div>`;
      if(this.help)html+=this.handbook();
      else if(this.detail)html+=this.reading(this.detail);
      else if(this.mode==='journal')html+=this.journal();
      else if(this.mode==='films')html+=this.films();
      else if(phase==='intro')html+=this.intro();
      else if(phase==='investigate')html='';
      else if(phase==='plan')html+=this.planning();
      else if(phase==='result')html+=this.results();
      else if(phase==='review')html+=this.reflection();
      else html+=this.complete();
      const focus=document.activeElement?.dataset?.act,focusValue=document.activeElement?.dataset?.value;
      $('case-content').innerHTML=html;
      if(PQCafeScene.motion?.pending){panel.scrollTop=0;}
      else if(this.lastPhase!==phase||this.lastDetail!==this.detail||this.lastHelp!==this.help||this.lastView!==view){panel.scrollTop=0;if(!panel.hidden)$('case-content').querySelector('h1')?.focus({preventScroll:true});else if(view==='talk')$('case-line')?.focus({preventScroll:true});else $('case-explore').querySelector('button')?.focus({preventScroll:true});}
      else{panel.scrollTop=scroll;for(const b of $('case-content').querySelectorAll('button'))if(b.dataset.act===focus&&b.dataset.value===focusValue){b.focus({preventScroll:true});break;}}
      this.lastPhase=phase;this.lastDetail=this.detail;this.lastHelp=this.help;this.lastView=view;
      this.present();
    },
    clearPresentation(){
      for(const id of ['case-dialogue','case-panel','case-explore','case-hotspots']){const el=$(id);el.classList.remove('case-pending');el.inert=false;el.removeAttribute('aria-hidden');}
      $('case-transition').hidden=true;
    },
    present(){
      this.clearPresentation();
      $('cafe-case-screen').classList.toggle('case-reduced',PQCafeScene.reduced());
      const motion=PQCafeScene.motion;
      if(!motion?.pending)return;
      for(const id of ['case-dialogue','case-panel','case-explore','case-hotspots']){const el=$(id);if(!el.hidden){el.classList.add('case-pending');el.inert=true;el.setAttribute('aria-hidden','true');}}
      $('case-transition-label').textContent={arrive:'阿晨转过身来',lead:'阿晨示意你跟上',evidence:'翻开手记',return:'回到刚才',farewell:'先聊到这里'}[motion.kind]||'';
      $('case-transition').hidden=false;
      $('case-transition').querySelector('button').focus({preventScroll:true});
    },
    reveal(){
      if(!this.active)return;
      this.clearPresentation();
      const view=this.lastView;
      if(view==='talk')$('case-line')?.focus({preventScroll:true});
      else if(!$('case-panel').hidden)$('case-content').querySelector('h1')?.focus({preventScroll:true});
      else $('case-explore').querySelector('button')?.focus({preventScroll:true});
    },
    exploration(view){
      const s=G.cafeCase;
      if(view==='observe')return `<div class="case-observe-tools">${this.button('回到店里 →','explore','','case-primary')}${this.button('整理方案','plan')}</div>`;
      return `<div class="case-explore-caption"><span class="case-kicker">${M.scenarios[s.scenario].day} · 行动 ${M.remaining(s)} / ${M.LIMIT}</span><h1>先听听，阿晨怎么说。</h1><p>${s.dialogue.node==='hello'?'他还在门边，手里没有咖啡。':'你们刚才聊到的事，都记在手记里。'}也可以去柜台看看。</p><div class="case-row">${this.button(s.dialogue.node==='hello'?'和阿晨聊聊':'继续和阿晨聊','talk','','case-primary')}${this.button(`观察现场${s.actions.includes('observe')?'':' · −1 格'}`,'read','observe','',!s.actions.includes('observe')&&M.remaining(s)<=2)}${this.button('整理方案','plan','', '',M.remaining(s)<2)}${s.trials.length?this.button('已有结果，去复盘','review'):''}</div></div>`;
    },
    renderDialogue(){
      const s=G.cafeCase,n=D.current(s),el=$('case-dialogue'),oldFocus=document.activeElement?.dataset;
      const options=n.choices.map(c=>{const fresh=c.evidence&&!s.actions.includes(c.evidence);return this.button(`<span>${esc(c.text)}</span>${fresh?'<small>新线索 · −1 格</small>':''}`,'say',c.id,'case-reply',fresh&&M.remaining(s)<=2);}).join('');
      el.style.setProperty('--dialogue-size',this.textSize+'px');
      el.innerHTML=`<div class="case-dialogue-head"><div><span class="case-speaker-dot"></span><strong>阿晨</strong><span>赶早班车的熟客</span></div><button data-act="explore" aria-label="结束交谈，回到咖啡馆">先聊到这里 ↗</button></div><p id="case-line" tabindex="-1" aria-live="polite">${esc(n.text)}</p><div class="case-replies">${options}</div><footer><div>${this.button('刚才说了什么','history','','',false,this.history)}${this.button(this.textSize===18?'放大台词':'标准字号','text-size')}</div>${this.button(s.actions.includes('orders')?'翻看柜台订单':'看看柜台订单 · −1 格','read','orders','',!s.actions.includes('orders')&&M.remaining(s)<=2)}</footer>${M.remaining(s)<=2?'<p class="case-budget-note">还留了 2 格试验行动。已获得的线索可以继续聊、反复看。</p>':''}<div id="case-history"${this.history?'':' hidden'} aria-label="刚才的谈话">${this.history?D.history(s).map(l=>`<p><b>${l.speaker}</b>${esc(l.text)}</p>`).join(''):''}</div>`;
      if(this.lastNode!==n.id){el.scrollTop=0;if(!PQCafeScene.motion?.pending)$('case-line').focus({preventScroll:true});}
      else if(oldFocus?.act)for(const b of el.querySelectorAll('button'))if(b.dataset.act===oldFocus.act&&b.dataset.value===oldFocus.value){b.focus({preventScroll:true});break;}
      this.lastNode=n.id;
    },
    films(){
      const s=G.cafeCase;
      return this.head('岛上的片刻 / 可随时回看','故事发生在你身边。','看看岛民怎样度过一天，也看看你的尝试改变了什么。回看不消耗行动。')+`<div class="case-action-list">
        ${this.button('<span>岛上的一个早晨<small>海风、社区门前，以及第一杯咖啡 · 14 秒</small></span><small>播放 ▷</small>','film','morning','case-action')}
        ${this.button('<span>那天早上的阿晨<small>等候、迟疑，然后转身 · 11 秒</small></span><small>播放 ▷</small>','film','incident','case-action')}
        ${this.button(`<span>试过之后，生活继续<small>${s.trials.length?'试验 '+(s.selected+1)+' 的街头片段 · 11 秒':'完成一次试验后，来看看大家的早晨'}</small></span><small>播放 ▷</small>`,'film','outcome','case-action',!s.trials.length)}
      </div><div class="case-row">${this.button('回到刚才 →','back','','case-primary')}</div>`;
    },
    journal(){
      const s=G.cafeCase;
      return this.head('随身手记 / 随时可回看','把线索留在这里。','已读材料不重复消耗行动。')+`<div class="case-action-list">${s.actions.map(id=>this.button(`<span>${M.actions[id].name}</span><small>已记录 ↗</small>`,'read',id,'case-action')).join('')||'<p>手记还是空的。可以先和阿晨聊聊，或去柜台看看订单。</p>'}</div><div class="case-row">${this.button(this.returnMode==='talk'?'回到刚才的对话 →':'回到刚才的地方 →','back','','case-primary')}</div>`;
    },
    intro(){
      const cfg=M.scenarios[G.cafeCase.scenario];
      return this.head('蓝山咖啡馆 / 店长的小困惑',cfg.subtitle,cfg.owner)+`<p class="case-small">先去听听阿晨怎么说。8 格行动，随时离开也会保存。</p><div class="case-row">${this.button('跟进阿晨，开始调查 →','start','','case-primary')}${this.button('今天只想喝咖啡','exit')}</div>`;
    },
    reading(id){
      const s=G.cafeCase,e=M.evidence(s.scenario,id),b=M.simulate(s.scenario);
      let h=this.head(e.type,e.title)+`<blockquote>${e.text}</blockquote>`;
      if(id==='orders')h+=`<div class="case-table-wrap"><table><caption>同一个早高峰的 10 张订单 · 分钟</caption><thead><tr><th>单号</th><th>到店</th><th>出杯</th><th>结果 / 时刻</th></tr></thead><tbody>${b.orders.map(o=>`<tr><td>#${String(o.id).padStart(2,'0')}</td><td>${o.arrival.toFixed(1)}</td><td>${o.ready.toFixed(1)}</td><td>${o.served?'取走':'离开'} ${o.leave.toFixed(1)}</td></tr>`).join('')}</tbody></table></div><p class="case-small">从开店后第 0 分钟计时。已做好的杯子，也可能没有被取走。记录只覆盖这一次早高峰。</p>`;
      if(id==='opinion'&&s.dialogue.history.some(h=>h.choice==='used'))h+='<blockquote>“附近那家发过一个下单链接，我存了，后来就忘了。真要用，得试一次才知道。”</blockquote>';
      h+=`<div class="case-row">${['investigate','plan'].includes(s.phase)?this.button(s.pins.includes(id)?'已圈为关键证据 ✓':'圈为关键证据','pin',id,'',false,s.pins.includes(id)):''}${id==='orders'&&s.phase==='investigate'?this.button('带着这张订单问阿晨','compare','','case-primary'):''}${this.button(this.readReturn==='talk'?'回到刚才的对话 →':'合上手记，回到刚才 →','back','',id==='orders'?'':'case-primary')}</div>`;
      return h;
    },
    planning(){
      const s=G.cafeCase;
      let h=this.head('02 / 判断与小试验','你准备改变哪一步？','先写下判断，再挑一个可撤回的改动。没有调查也可以试，但要记得自己尚不知道什么。');
      h+=`<fieldset><legend>目前的猜测</legend>${Object.entries(M.hypotheses).map(([id,v])=>this.button(v,'hypothesis',id,'case-choice',false,s.hypothesis===id)).join('')}</fieldset>`;
      h+=`<fieldset><legend>支持这个判断的事实 <small>最多 3 份，可留空</small></legend>${s.actions.length?s.actions.map(id=>this.button(`<span>${M.actions[id].name}</span><small>${M.actions[id].type}</small>`,'pin',id,'case-evidence',false,s.pins.includes(id))).join(''):'<p class="case-small">桌上还没有材料。你可以先调查，也可以把这次行动当作探索。</p>'}</fieldset>`;
      h+=`<fieldset><legend>还不知道什么</legend><div class="case-choice-grid">${Object.entries(M.unknowns).map(([id,v])=>this.button(v,'unknown',id,'case-choice',false,s.unknown===id)).join('')}</div></fieldset>`;
      h+=`<fieldset><legend>组合你的方案 <small>预算 ${M.cost(s.plan)} / ${M.BUDGET}</small></legend><div class="case-plans">${Object.entries(M.plans).map(([id,p])=>this.button(`<span><b>${p.name}</b><em>${p.cost} 枚</em></span><small>${p.desc}</small>`,'toggle',id,'case-plan',false,s.plan.includes(id))).join('')}</div></fieldset>`;
      const ready=s.hypothesis&&s.unknown&&s.plan.length&&M.remaining(s)>=2;
      h+=`<p class="case-small">${ready?'同样的 10 位顾客，会遇见你的新方案。':'选一个猜测、一项未知和至少一个改动，就可以开始。'} 本次试营业花 2 格行动。</p><div class="case-row">${this.button('开始试营业 · −2 格 →','trial','','case-primary',!ready)}${this.button('再去看看证据','investigate')}</div>`;
      return h;
    },
    metrics(before,after){
      return `<div class="case-metrics"><div><span>顺利拿到咖啡</span><strong>${before.served}<i>→</i>${after.served}<small>/10 人</small></strong></div><div><span>平均停留时间</span><strong>${before.wait}<i>→</i>${after.wait}<small>分钟</small></strong></div><div><span>店员负担</span><strong>${before.workload}<i>→</i>${after.workload}<small>/100</small></strong></div></div><p class="case-small">停留时间包含空手离开的顾客；时间更短，不一定代表服务更好。</p>`;
    },
    trialTabs(){
      const s=G.cafeCase;return s.trials.length>1?`<div class="case-row">${s.trials.map((_,i)=>this.button('试验 '+(i+1),'select',i,'',false,s.selected===i)).join('')}</div>`:'';
    },
    results(){
      const s=G.cafeCase,r=M.review(s),t=s.trials[s.selected];
      return this.head('03 / 让后果说话','这次，哪里变了？',t.plan.map(id=>M.plans[id].name).join(' + '))+this.trialTabs()+this.metrics(r.before,r.after)+
        `<div class="case-callout"><b>${r.effect}</b><p>${r.trade}</p></div><p class="case-small">上方正在重放这次试营业。比较使用相同的 10 位模拟顾客与到店顺序。负担由制作占用、核单和取餐解释工作估算；是案例推演，不是真实经营数据。</p><div class="case-row">${M.remaining(s)>=2?this.button('修改方案，再试一次','plan','','case-primary'):''}${M.remaining(s)>2?this.button('补一份证据','investigate'):''}${this.button('带着这次结果复盘 →','review','',M.remaining(s)<2?'case-primary':'')}</div><p class="case-small">改变方案会花新一轮行动。查看旧结果、暂停重放都免费。</p>`;
    },
    reflection(){
      const s=G.cafeCase,r=M.review(s),t=s.trials[s.selected];
      return this.head('04 / 一分钟复盘','留下结果，也留下依据。','选好要带回咖啡馆的那次尝试。一次结果，不必成为永远的答案。')+this.trialTabs()+
        `<div class="case-callout"><b>经营结果</b><p>${r.effect} ${r.trade}</p></div><div class="case-callout"><b>当时的判断</b><p>${M.hypotheses[t.hypothesis]}</p><p>${r.process}</p><small>当时还不知道：${M.unknowns[t.unknown]}</small></div>`+
        `<fieldset><legend>经历这次试验，你会怎样继续？</legend>${this.button('保留有效的部分，再观察其他时段','reflect','keep','case-choice',false,s.reflection==='keep')}${this.button('修正原来的判断，针对新瓶颈再试','reflect','change','case-choice',false,s.reflection==='change')}${this.button('证据还不够，先不作长期承诺','reflect','uncertain','case-choice',false,s.reflection==='uncertain')}</fieldset>`+
        `<details class="case-method"><summary>把这次经验带到下一个项目</summary><p>区分事实与猜测 → 写出一个可检验的解释 → 做最小可撤回改动 → 比较同一条件下的后果。</p><p>访谈、记录和原型都能提供证据。选什么，取决于你还不知道什么。这里的固定顾客便于比较；现实里还需考虑样本差异和随机波动。</p></details><div class="case-row">${this.button('记下这次尝试，回到生活里 →','finish','','case-primary',!s.reflection)}</div>`;
    },
    complete(){
      const s=G.cafeCase,r=M.review(s),t=s.trials[s.selected];
      return this.head('项目手记 / 已保存','蓝山记住了你的尝试。',r.after.served>r.before.served?(r.after.orders[0].served?'阿晨终于带走了一杯咖啡。店长把你试过的办法留了下来。':'更多顾客拿到了咖啡，但阿晨仍没赶上。店长把这次尝试写了下来。'):'店长把这次试验写进了笔记：“知道哪里没改善，也比继续猜有用。下次再一起看看。”')+
        this.metrics(r.before,r.after)+`<div class="case-callout"><b>留在店里的改变</b><p>${t.plan.map(id=>M.plans[id].name).join('、')}。之后再来，仍能看见这次尝试留下的物件。</p><p>${s.reflection==='uncertain'?'你保留了不确定性，尚未作长期承诺。':s.reflection==='change'?'你准备重新判断问题，继续尝试。':'你会保留有效部分，并扩大观察范围。'}</p></div>`+
        `<div class="case-row">${this.button('坐一会儿，喝杯咖啡','exit','','case-primary')}${this.button(s.scenario===0?'换个情境：周末手冲日 →':'再访周三早高峰 →','next')}</div><p class="case-small">下一次菜单和约束会改变。上次有效的办法，不一定仍是最合适的。主线章节和老板信任度没有被这个项目改写。</p>`;
    },
    handbook(){return this.head('随时可查 / 不扣行动','你可以怎样玩？')+`<p>调查一次花 1 格，试营业一次花 2 格。总共 8 格，并保留至少一次试验的机会。</p><p>查看旧证据、整理思路、暂停或离开不会花行动。所有选择自动保存，回到咖啡馆可以接着做。</p><p>“事实”是看过、听过或记录过的事；“猜测”是你对原因的解释；“未知”决定接下来值得验证什么。</p><p>每次方案最多投入 6 枚预算。它是单次试验的上限，比较第二个方案时重新分配。</p><p>画面只重放少量代表性顾客，表格与结果覆盖全部 10 人。不同方案的顾客顺序保持一致。</p><p>方法卡：选择能减少当前不确定性的行动。结果与判断依据分开看，允许承认还不知道。</p><p>人物与镜头过渡可随时跳过。减少动态效果会让走位与镜头直接就位，阅读时间始终由你掌握。</p><div class="case-row">${this.button(SFX.muted?'开启音效':'关闭音效','sound','','',false,!SFX.muted)}${this.button(PQIsland.environment.reducedMotion?'减少动态效果 · 跟随系统':this.reduceMotion?'恢复动作衔接':'减少动态效果','motion','','',PQIsland.environment.reducedMotion,PQCafeScene.reduced())}</div><div class="case-row">${this.button('回到刚才的地方 →','back','','case-primary')}</div>`;}
  };
  window.PQCafeCase=C;
})();
