/* One focal activity at a time: explore, converse, examine, try, then reflect. */
(function(){
  'use strict';
  const M=PQChapterJourney,$=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const C={active:false,chapter:'1',mode:'explore',detail:null,
    legacy(){return M.legacyLimit(G.progress,PQ.levels);},
    init(){
      const first=!G.campaign;G.campaign=M.normalize(G.campaign);if(first)G.campaign.current=String(this.legacy());
      if(!M.available(G.campaign,G.campaign.current,this.legacy()))G.campaign.current=M.next(G.campaign,this.legacy());
      $('game').insertAdjacentHTML('beforeend',`<section class="screen" id="chapter-screen" aria-label="岛上章节任务">
        <header id="chapter-top"><button data-act="exit">← 岛上</button><div><span id="chapter-kicker"></span><strong id="chapter-name"></strong></div><nav><button data-act="library">章节</button><button data-act="journal">手记</button><button data-act="help" aria-label="章节帮助">帮助</button></nav></header>
        <div id="chapter-pins" aria-label="场景中可交互的人物与物件"></div><div id="chapter-explore"></div>
        <section id="chapter-talk" aria-label="人物交谈" hidden></section><aside id="chapter-panel" aria-label="线索与工作台" hidden><div id="chapter-content"></div></aside>
        <div id="chapter-motion" hidden><span>走到你身边</span><button data-act="skip">跳过动作 ↵</button></div><p id="chapter-notice" role="status" aria-live="polite"></p>
      </section><aside id="campaign-route" aria-label="当前任务" hidden><div class="campaign-summary"><span>岛上的故事 <b id="campaign-count"></b></span><button id="campaign-details" aria-expanded="false" aria-controls="campaign-detail">详情</button></div><h2 id="campaign-title"></h2><button id="campaign-go"></button><div id="campaign-detail" hidden><p id="campaign-hint"></p><button id="campaign-list">章节地图</button></div></aside>`);
      $('chapter-screen').addEventListener('click',e=>{const b=e.target.closest('button[data-act]');if(b&&!b.disabled)this.act(b.dataset.act,b.dataset.value,b.dataset.slot);});
      $('chapter-screen').addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();this.act(this.mode==='explore'?'exit':'back');}});
      $('campaign-go').onclick=()=>this.travel(G.campaign.current);$('campaign-list').onclick=()=>this.mapLibrary();
      $('campaign-details').onclick=()=>{const d=$('campaign-detail'),open=d.hidden;d.hidden=!open;$('campaign-details').setAttribute('aria-expanded',String(open));$('campaign-details').textContent=open?'收起':'详情';if(open)PQIsland.visibility?.stopWalking();if(PQIsland.visibility)PQIsland.visibility.nextMeasure=0;};
      G.save();this.mapHud();
    },
    record(){return G.campaign.records[this.chapter];},
    open(id){
      id=String(id);if(!M.available(G.campaign,id,this.legacy())){PQIsland.setStatus('先完成前一章的试验与复盘，再继续这段故事。',3500);return false;}
      if(this.active)this.suspend();if(PQCafeCase.active)PQCafeCase.suspend();if(PQStory3D.active)PQStory3D.exit();
      if(PQFirstDay.guided())G.firstDay.paused=true;G.firstDay.started=true;
      this.lastKey=null;this.chapter=id;G.campaign.current=id;this.mode=this.record().view;this.detail=null;this.returnMode='explore';this.help=false;
      PQFirstDay.closeDialog();PQFirstDay.clearRoute();G.closeBuilding(true);
      const c=M.def(id);PQStory3D.enter(c.room,c.npcs[0].key,['ops','roof'].includes(c.room));
      this.active=true;G.show('chapter-screen');$('game').classList.add('campaign-mode');PQChapterScene.attach(c);
      this.render();G.save();if(!this.record().intro)PQLifeFilm.playChapter(id,'arrival');return true;
    },
    suspend(){
      if(!this.active)return;this.active=false;if(PQLifeFilm.active)PQLifeFilm.finish(false);
      PQChapterScene.detach();$('game').classList.remove('campaign-mode');this.clearMotion();
    },
    close(){this.suspend();G.toMap();},
    step(event,value){G.campaign=M.advance(G.campaign,this.chapter,event,value,this.legacy());G.save();},
    button(text,act,value='',cls='',disabled=false,pressed,slot){return `<button data-act="${act}" data-value="${esc(value)}"${slot?` data-slot="${esc(slot)}"`:''} class="${cls}"${disabled?' disabled':''}${pressed===undefined?'':` aria-pressed="${pressed}"`}>${text}</button>`;},
    head(kicker,title,body=''){return `<span class="chapter-eyebrow">${esc(kicker)}</span><h1 tabindex="-1">${esc(title)}</h1>${body?`<p>${esc(body)}</p>`:''}`;},
    act(event,value,slot){
      if(!this.active)return;
      if(event==='skip'){PQChapterScene.finish();return;}
      PQChapterScene.finish();
      if(event==='exit'){this.close();return;}
      if(event==='open'){this.open(value);return;}
      if(event==='film'){PQLifeFilm.playChapter(this.chapter,value);return;}
      if(event==='download'){this.download();return;}
      if(event==='practice'){const i=PQ.levels.findIndex(l=>l.id===M.def(this.chapter).chapterStart);this.suspend();PQStory3D.exit();G.startLevel(i);return;}
      if(event==='next'){const id=String(Math.min(8,Number(this.chapter)+1));this.close();this.travel(id);return;}
      if(event==='back'){if(this.detail){this.detail=null;this.mode=this.readReturn||'explore';}else this.mode=this.returnMode||'explore';this.help=false;if(['talk','workbench','result','complete'].includes(this.mode))this.step('view',this.mode);else this.step('view','explore');this.render();return;}
      if(event==='talk'){this.detail=null;this.mode='talk';this.step('talk',value);this.render();return;}
      if(event==='topic'){this.step('topic',value);this.render();return;}
      if(event==='read'){this.readReturn=this.mode;this.step('read',value);this.detail=value;this.mode='evidence';this.render();PQPropLibrary.chapter(value);return;}
      if(['journal','library','help'].includes(event)){this.returnMode=['journal','library','help'].includes(this.mode)?this.returnMode:this.mode;this.mode=event;this.detail=null;this.render();return;}
      if(event==='explore'){this.mode='explore';this.detail=null;this.step('view','explore');this.render();return;}
      if(event==='workbench'){this.mode='workbench';this.detail=null;this.step('view','workbench');this.render();return;}
      if(event==='choose'){this.step('choose',{slot,value});this.render();return;}
      if(event==='unchoose'){this.step('unchoose',value);this.render();return;}
      if(event==='arrange'){this.step('arrange',value);this.render();return;}
      if(event==='select'){this.step('select',Number(value));this.mode='result';this.render();return;}
      if(event==='reflect'){this.step('reflect',value);this.render();return;}
      if(event==='run'){
        if(!M.ready(M.def(this.chapter),this.record().plan))return;
        this.step('run');this.mode='result';this.render();PQLifeFilm.playChapter(this.chapter,'outcome');return;
      }
      if(event==='complete'){
        const was=!!this.record().committed;this.step('complete');if(!this.record().committed)return;
        this.mode='complete';this.render();if(!was){PQIsland.environment.pendingChapter='m'+this.chapter;SFX.unlock();}
      }
    },
    render(){
      if(!this.active)return;
      const c=M.def(this.chapter),r=this.record(),panel=$('chapter-panel'),oldFocus=document.activeElement,scroll=panel.scrollTop;
      $('chapter-kicker').textContent=`CHAPTER ${this.chapter.padStart(2,'0')} / ${c.theme}`;$('chapter-name').textContent=c.name;
      $('chapter-screen').dataset.view=this.mode;
      $('chapter-explore').hidden=this.mode!=='explore';$('chapter-pins').hidden=this.mode!=='explore';$('chapter-talk').hidden=this.mode!=='talk';panel.hidden=['explore','talk'].includes(this.mode);
      const pinButtons=c.npcs.map(n=>this.button(`<span>${esc(n.name)}</span><small>${esc(n.role)}</small>`,'talk',n.key,'chapter-pin'));
      pinButtons.push(...c.clues.map(e=>this.button(esc(e.title),'read',e.id,'chapter-pin chapter-object')));
      $('chapter-pins').innerHTML=pinButtons.join('');
      $('chapter-explore').innerHTML=`<span class="chapter-eyebrow">${esc(c.place)} · ${r.notes.length} / ${c.clues.length} 份线索</span><h2>${esc(c.objective)}</h2><div class="chapter-row">${this.button('和'+esc(c.npcs[0].name)+'聊聊','talk',c.npcs[0].key,'chapter-primary')}${this.button('看看桌上的物件','journal')}${this.button(r.trials.length?'继续试验':'动手试试','workbench')}${r.committed?this.button('查看已完成的记录','view-complete'):''}</div>`;
      if(r.committed)$('chapter-explore').querySelector('[data-act="view-complete"]').onclick=()=>{this.mode='complete';this.render();};
      if(this.mode==='talk')this.talk();
      let html='';
      if(this.detail)html=this.reading();
      else if(this.mode==='journal')html=this.journal();
      else if(this.mode==='library')html=this.library();
      else if(this.mode==='help')html=this.helpPage();
      else if(this.mode==='workbench')html=this.workbench();
      else if(this.mode==='result')html=this.results();
      else if(this.mode==='complete')html=this.completed();
      $('chapter-content').innerHTML=panel.hidden?'':`<div class="chapter-sheet-top">${this.button('← 回到场景','explore')}<span>${this.mode==='workbench'?'工作台':this.mode==='library'?'章节地图':'项目手记'}</span></div>`+html;
      const modeKey=this.mode+':'+(this.detail||'')+':'+(r.focus?.npc||'')+':'+(this.mode==='talk'?r.focus?.topic:'');
      PQChapterScene.setView(this.mode,r.focus?.npc,modeKey);
      if(this.lastKey!==modeKey){panel.scrollTop=0;this.lastKey=modeKey;}
      else{panel.scrollTop=scroll;if(oldFocus?.dataset.act){const all=$('chapter-screen').querySelectorAll('button');for(const b of all)if(b.dataset.act===oldFocus.dataset.act&&b.dataset.value===oldFocus.dataset.value&&b.dataset.slot===oldFocus.dataset.slot){b.focus({preventScroll:true});break;}}}
      this.present();
    },
    talk(){
      const c=M.def(this.chapter),r=this.record(),n=c.npcs.find(n=>n.key===r.focus?.npc)||c.npcs[0],t=n.topics.find(t=>t.id===r.focus?.topic);
      $('chapter-talk').innerHTML=`<header><div><strong>${esc(n.name)}</strong><span>${esc(n.role)}</span></div>${this.button('先聊到这里 ↗','explore')}</header><p id="chapter-line" tabindex="-1">${esc(t?t.line:n.intro)}</p>${!t?`<p class="chapter-recall">${esc(M.recall(this.chapter,G.campaign,G.firstDay,G.cafeCase))}</p>`:''}<div class="chapter-replies">${n.topics.map(t=>this.button(esc(t.q)+(r.notes.includes(t.evidence)?'<small>已记下 · 可再问</small>':''),'topic',t.id)).join('')}</div><footer>${t?this.button('看看这份线索 →','read',t.evidence):this.button('看桌上的实物 →','journal')}${this.button('去工作台','workbench')}</footer>`;
    },
    reading(){
      const e=M.evidence(this.chapter,this.detail,G.campaign);if(!e)return'';
      return this.head(e.source,e.title)+e.body.map(t=>`<p>${esc(t)}</p>`).join('')+`<div class="chapter-row">${this.button('合上手记，回到刚才 →','back','','chapter-primary')}</div>`;
    },
    journal(){
      const c=M.def(this.chapter),r=this.record();return this.head('场景里的物件','线索有各自的来处。','可以先听人说，也可以直接看看留下的东西。重复查看不花行动。')+
        `<div class="chapter-cards">${c.clues.map(e=>this.button(`<b>${esc(e.title)}</b><small>${esc(e.source)} · ${r.notes.includes(e.id)?'已记下':'未查看'}</small>`,'read',e.id)).join('')}</div><details><summary>前面的故事如何走到这里</summary><p>${esc(M.recall(this.chapter,G.campaign,G.firstDay,G.cafeCase))}</p></details><div class="chapter-row">${this.button('到工作台试试','workbench','','chapter-primary')}${this.button('回到场景','explore')}</div>`;
    },
    workbench(){
      const c=M.def(this.chapter),r=this.record(),p=r.plan;
      let h=this.head('把选择变成一次尝试',c.bench,r.committed?'本章已经完成。接下来的试验属于练习，不改写后续故事中的那次决定。':'你可以改动、试用、观察，再修正。先收集线索会更有依据，也可以把第一次当作探索。');
      if(this.chapter==='1')h=this.head('桌面试用',c.bench,r.committed?'这是一次练习，保留原来的故事决定。':'');
      if(c.sequence){const seq=c.sequence;h+=`<fieldset><legend>${esc(seq.name)}</legend><ol class="chapter-sequence">${Array.from({length:seq.items.length},(_,i)=>`<li>${esc(seq.items.find(o=>o.id===p[seq.id][i])?.name||'选择下一张卡')}</li>`).join('')}</ol><div class="chapter-row">${seq.items.map(o=>this.button(esc(o.name),'arrange',o.id,'',p[seq.id].includes(o.id))).join('')}${this.button('重新排列','arrange','reset')}</div></fieldset>`;}
      if(this.chapter==='1'){
        h+=`<p class="chapter-small">点选一张工具卡和一张开始方式卡。再点已选卡片可撤回。</p><div class="chapter-tray" aria-live="polite">${c.slots.map(s=>{const o=s.options.find(o=>o.id===p[s.id]);return `<div><span>${s.id==='tool'?'试用方案':'开始方式'}</span><b>${esc(o?.name||'等待卡片')}</b>${o?this.button('撤回','unchoose',s.id):''}</div>`;}).join('')}</div><details><summary>卡片列表与说明</summary>`;
      }
      for(const s of c.slots)h+=`<fieldset><legend>${esc(s.name)}</legend><div class="chapter-options">${s.options.map(o=>this.button(`<b>${esc(o.name)}</b><small>${esc(o.detail)}</small>`,'choose',o.id,'',false,p[s.id]===o.id,s.id)).join('')}</div></fieldset>`;
      if(this.chapter==='1')h+='</details>';
      if(this.chapter==='6'){const g=p.group||'returning',n=g==='new'?80:g==='all'?100:20,v=g==='new'?52:g==='all'?60:8;h+=`<figure class="chapter-chart"><figcaption>改动前 · ${g==='returning'?'第二月老用户':g==='new'?'第一次使用的新用户':'混合人群'}</figcaption><div style="--share:${v/n*100}%"><span></span></div><p>完成任务 ${v} / ${n} 人（${Math.round(v/n*100)}%）</p></figure>`;}
      h+=`<p class="chapter-small">${r.notes.length?`你已查看 ${r.notes.length} 份线索。`:'尚未收集线索，这次结果会保留这个前提。'} 这是固定虚构样本的演练，不代表真实市场结果。</p><div class="chapter-row chapter-bench-actions">${this.button((this.chapter==='1'?'开始七天试用':esc(c.test))+' →','run','','chapter-primary',!M.ready(c,p))}${this.button(this.chapter==='1'?'看线索':'再看看线索','journal')}</div>`;
      return h;
    },
    metricHTML(res){return `<dl class="chapter-metrics">${res.metrics.map(m=>`<div><dt>${esc(m.label)}</dt><dd>${esc(m.value)} <small>${esc(m.unit)}</small></dd></div>`).join('')}</dl>`;},
    results(){
      const c=M.def(this.chapter),r=this.record(),trial=r.trials[r.selected]||r.committed,res=M.result(G.campaign,this.chapter);if(!res)return this.workbench();
      return this.head('后果来自刚才的选择',res.title,res.line)+this.metricHTML(res)+`<ol class="chapter-events">${res.events.map(e=>`<li><b>${esc(e.title)}</b><p>${esc(e.detail)}</p></li>`).join('')}</ol><details><summary>这次试验的条件与依据</summary>${M.planLines(this.chapter,trial.plan).map(t=>`<p>${esc(t)}</p>`).join('')}<p>当时读过的线索：${esc(trial.notes.map(id=>c.clues.find(e=>e.id===id).title).join('、')||'还没有，以探索性试验开始')}。</p></details><div class="chapter-row">${r.trials.map((_,i)=>this.button('记录 '+(i+1),'select',i,'',false,r.selected===i)).join('')}</div><p class="chapter-small">保留最近三次练习；提交给故事的那一次会独立保存。</p><div class="chapter-row">${this.button('调整，再试一次','workbench')}${this.button('重看生活片段','film','outcome')}</div>`+
        (r.committed?`<p>后续故事仍保留首次完成时的决定。</p><div class="chapter-row">${this.button('回到岛上','exit','','chapter-primary')}</div>`:`<fieldset><legend>看过结果，你准备怎样继续？</legend>${Object.entries(M.reflections).map(([id,t])=>this.button(esc(t),'reflect',id,'chapter-reflection',false,r.reflection===id)).join('')}</fieldset><div class="chapter-row">${this.button('把这次尝试带回故事 →','complete','','chapter-primary',!r.reflection)}</div>`);
    },
    completed(){
      const c=M.def(this.chapter),r=this.record(),t=r.committed;if(!t)return this.results();const res=M.result(G.campaign,this.chapter,t);
      return this.head('这一段已经留下痕迹',c.reward,res.line)+this.metricHTML(res)+`<blockquote>${esc(M.reflections[t.reflection])}</blockquote><p>${esc(c.method)}</p><p>${esc(c.next)}</p><div class="chapter-row">${this.chapter==='8'?this.button('导出我的项目手记','download','','chapter-primary'):this.button('去下一处赴约 →','next','','chapter-primary')}${this.button('先回岛上走走','exit')}</div><div class="chapter-row">${this.button('回访这里的人','explore')}${this.button('深入原有章节练习','practice')}${this.button('章节地图','library')}</div>`;
    },
    library(){return this.head('八段故事，一座生活着的岛','每次回来，都有来处。','完成试验并留下复盘，就能继续。旧章节存档已经解锁的地区仍可进入。')+`<div class="chapter-cards">${M.chapters.map(c=>this.button(`<b>${c.id==='8'?'终章':'第 '+c.id+' 章'} · ${esc(c.name)}</b><small>${esc(c.theme)} · ${G.campaign.records[c.id].committed?'已完成，可回访':M.available(G.campaign,c.id,this.legacy())?'可以继续':'等待前章的约定'}</small>`,'open',c.id,'',!M.available(G.campaign,c.id,this.legacy()))).join('')}</div><div class="chapter-row">${this.button('导出已有记录','download')}${this.button('回到场景','explore')}</div>`;},
    helpPage(){return this.head('随时可查','先看见人，再动手试。')+'<p>点击人物或桌上的物件探索。交谈、查看证据和重复试验都不扣老板信任度；原有章节的进度与评级保持独立。</p><p>工作台需要你作出具体选择，有些章节还要安排先后顺序。结果来自固定模拟条件，失败也可以复盘并继续。</p><p>首次完成的决定会留在后续故事里。之后的练习不会悄悄改写它。最近三次练习和那次完成记录分别保存。</p><p>演出可暂停、逐幕前进和跳过；Escape 返回。减少动态效果会让镜头直接就位，演出由你逐幕阅读。</p>'+`<div class="chapter-row">${this.button(PQCafeScene.reduced()?'恢复动作衔接':'减少动态效果','motion')}${this.button(SFX.muted?'开启音效':'关闭音效','sound')}</div><div class="chapter-row">${this.button('重看初来这里','film','arrival')}${this.button('回到场景','explore')}</div>`;},
    clearMotion(){for(const id of ['chapter-talk','chapter-panel','chapter-explore','chapter-pins']){const el=$(id);if(el){el.inert=false;el.classList.remove('chapter-pending');}}if($('chapter-motion'))$('chapter-motion').hidden=true;},
    present(){
      this.clearMotion();if(!PQChapterScene.pending)return;
      for(const id of ['chapter-talk','chapter-panel','chapter-explore','chapter-pins']){const el=$(id);if(!el.hidden){el.inert=true;el.classList.add('chapter-pending');}}
      $('chapter-motion').hidden=false;$('chapter-motion').querySelector('button').focus({preventScroll:true});
    },
    reveal(){this.clearMotion();if(!this.active)return;if(this.mode==='talk')$('chapter-line')?.focus({preventScroll:true});else if(!$('chapter-panel').hidden)$('chapter-content').querySelector('h1')?.focus({preventScroll:true});else $('chapter-explore').querySelector('button')?.focus({preventScroll:true});},
    filmFinished(mark,kind){if(mark&&kind==='arrival')this.step('intro');if(this.active){this.render();this.reveal();}},
    download(){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([M.report(G.campaign)],{type:'text/markdown;charset=utf-8'}));a.href=url;a.download='星火岛-我的项目手记.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},
    mapHud(){
      if(!$('campaign-route'))return;const map=$('map-screen').classList.contains('active'),show=map&&!PQFirstDay.guided()&&!PQFirstDay.dialogOpen;
      $('campaign-route').hidden=!show;$('game').classList.toggle('campaign-map',show);if(!show)return;
      if(!M.available(G.campaign,G.campaign.current,this.legacy()))G.campaign.current=M.next(G.campaign,this.legacy());
      const c=M.def(G.campaign.current),done=M.chapters.filter(c=>G.campaign.records[c.id].committed).length;
      $('campaign-count').textContent=`${done} / 8`;$('campaign-title').textContent=c.name;$('campaign-hint').textContent=c.objective;this.updateWorld();
    },
    updateWorld(){
      if(!$('campaign-route')||$('campaign-route').hidden)return;
      const c=M.def(G.campaign.current),goal=PQIsland.buildings[c.building]?.doorPos;if(!goal)return;
      const near=PQIsland.playerPos.distanceTo(goal)<3.4,text=near?'进入 · '+c.place.split(' · ')[0]:'前往 · '+c.place.split(' · ')[0];
      if(near&&this.travelTarget===c.id){PQIsland.walkGoal=null;PQIsland.walkPath=[];PQIsland.goalRing.visible=false;PQFirstDay.clearRoute();this.travelTarget=null;}
      if($('campaign-go').textContent!==text)$('campaign-go').textContent=text;
    },
    travel(id){
      if(!M.available(G.campaign,id,this.legacy()))return;G.campaign.current=String(id);G.save();G.closeBuilding(true);this.mapHud();PQIsland.refreshState();
      const c=M.def(id),goal=PQIsland.buildings[c.building]?.doorPos;if(!goal)return;
      if(PQIsland.playerPos.distanceTo(goal)<3.4)PQFirstDay.transition(c.building,()=>this.open(id));else{this.travelTarget=String(id);PQFirstDay.walkTo(goal);}
    },
    mapLibrary(){
      const p=$('bpanel');p.innerHTML=`<div class="bp-head"><strong>岛上的故事</strong><button class="bp-close" aria-label="关闭章节地图">×</button></div><p class="bp-sub">选一个已经可以赴约的地点，沿路线走过去。</p>`;
      for(const c of M.chapters){const b=document.createElement('button');b.className='bp-reward';b.disabled=!M.available(G.campaign,c.id,this.legacy());b.textContent=`${c.id}. ${c.name} · ${G.campaign.records[c.id].committed?'回访':'赴约'}`;b.onclick=()=>this.travel(c.id);p.appendChild(b);}p.querySelector('.bp-close').onclick=()=>G.closeBuilding();p.classList.add('open');p.querySelector('button').focus();
    },
    buildingHTML(b){const list=M.chapters.filter(c=>c.building===b.id);return list.length?`<div class="bp-ch">岛上的故事</div>`+list.map(c=>`<button class="exp-primary" onclick="PQCampaign.open('${c.id}')"${M.available(G.campaign,c.id,this.legacy())?'':' disabled'}>${c.id}. ${esc(c.name)} · ${G.campaign.records[c.id].committed?'回访':'进入 3D 任务'} ↗</button>`).join(''):'';}
  };
  // Settings use the same preference and sound state as the existing café.
  const act=C.act;C.act=function(event,value,slot){if(event==='motion'){if(!PQIsland.environment.reducedMotion){PQCafeCase.reduceMotion=!PQCafeCase.reduceMotion;try{localStorage.setItem('pq-cafe-reduce-motion',PQCafeCase.reduceMotion?'1':'0');}catch(e){}PQChapterScene.finish();this.render();}return;}if(event==='sound'){G.toggleMute();this.render();return;}return act.call(this,event,value,slot);};
  window.PQCampaign=C;
})();
