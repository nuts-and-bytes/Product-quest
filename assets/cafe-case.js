/* One authored investigation: free order of inquiry, editable plans and visible consequences. */
(function(){
  'use strict';
  const M=PQCafeModel,$=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const C={active:false,detail:null,help:false,
    init(){
      G.cafeCase=M.normalize(G.cafeCase);
      $('game').insertAdjacentHTML('beforeend',`<section class="screen" id="cafe-case-screen" aria-label="蓝山咖啡馆调查">
        <header id="case-topbar"><button data-act="exit">← 先喝杯咖啡</button><div><span class="case-kicker">BLUE MOUNTAIN / FIELD NOTES</span><strong id="case-name"></strong></div><button data-act="help">随身手册</button></header>
        <div id="case-scene-note"><span id="case-scene-mode">窗边观察</span><p id="case-scene-status">阿晨正在往柜台走。</p><div><button data-act="pause" id="case-pause">暂停画面</button><button data-act="replay">重看这一段</button></div></div>
        <div id="case-people" aria-hidden="true"></div><aside id="case-panel" aria-label="调查与试验"><div id="case-content"></div></aside>
        <div id="case-notice" role="status" aria-live="polite"></div>
      </section>`);
      $('cafe-case-screen').addEventListener('click',e=>{const b=e.target.closest('button[data-act]');if(b&&!b.disabled)this.act(b.dataset.act,b.dataset.value);});
      G.save();
    },
    open(){
      this.active=true;this.detail=null;this.help=false;
      PQFirstDay.closeDialog();PQStory3D.enter('cafe','xiaomei');G.show('cafe-case-screen');
      $('game').classList.add('case-mode');PQStory3D.viewKey='';
      PQCafeScene.attach();this.render();this.preview();
    },
    suspend(){
      if(!this.active)return;
      this.active=false;PQCafeScene.detach();$('game').classList.remove('case-mode');
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
      if(event==='exit'){this.close();return;}
      if(event==='pause'){PQCafeScene.paused=!PQCafeScene.paused;$('case-pause').textContent=PQCafeScene.paused?'播放画面':'暂停画面';return;}
      if(event==='replay'){this.preview();return;}
      if(event==='help'){this.help=!this.help;this.detail=null;this.render();return;}
      if(event==='back'){this.detail=null;this.help=false;this.render();return;}
      if(event==='read'){
        if(!s.actions.includes(value)&&M.remaining(s)<=2){this.notice('留下的 2 格可以完成一次试验。已读材料仍可免费查看。');return;}
        this.save('observe',value);this.detail=value;this.help=false;
        if(value==='observe')this.preview();this.render();return;
      }
      if(event==='toggle'&&!s.plan.includes(value)&&M.cost([...s.plan,value])>M.BUDGET){this.notice('这次最多投入 6 枚预算。先收起一项改动，再比较取舍。');return;}
      if(event==='pin'&&!s.pins.includes(value)&&s.pins.length>=3){this.notice('最多圈出 3 份关键证据；可以先取消一份。');return;}
      this.save(event,event==='select'?Number(value):value);
      if(event==='start'||event==='investigate'||event==='plan'||event==='review'||event==='next'){this.detail=null;this.help=false;}
      this.render();
      if(['trial','select','next','finish'].includes(event))this.preview();
      if(event==='finish')PQCafeScene.applyLegacy();
    },
    notice(text){$('case-notice').textContent=text;clearTimeout(this.noticeTimer);this.noticeTimer=setTimeout(()=>$('case-notice').textContent='',4000);},
    button(text,act,value='',style='',disabled=false,pressed){return `<button class="${style}" data-act="${act}" data-value="${esc(value)}"${disabled?' disabled':''}${pressed===undefined?'':` aria-pressed="${pressed}"`}>${text}</button>`;},
    head(kicker,title,text=''){return `<div class="case-kicker">${kicker}</div><h1 tabindex="-1">${title}</h1>${text?`<p class="case-lead">${text}</p>`:''}`;},
    render(){
      if(!this.active)return;
      const s=G.cafeCase,cfg=M.scenarios[s.scenario],left=M.remaining(s),panel=$('case-panel'),scroll=panel.scrollTop,phase=s.phase;
      $('case-name').textContent=cfg.name;
      let html=`<div class="case-meta"><span>${cfg.day}</span><span>${phase==='intro'?'随时可离开':phase==='complete'?'已存入项目手记':`行动余量 ${left} / ${M.LIMIT}`}</span></div>`;
      if(phase!=='intro'&&phase!=='complete')html+=`<div class="case-clock" aria-label="剩余 ${left} 格行动">${Array.from({length:M.LIMIT},(_,i)=>`<i class="${i<left?'on':''}"></i>`).join('')}</div>`;
      if(this.help)html+=this.handbook();
      else if(this.detail)html+=this.reading(this.detail);
      else if(phase==='intro')html+=this.intro();
      else if(phase==='investigate')html+=this.investigation();
      else if(phase==='plan')html+=this.planning();
      else if(phase==='result')html+=this.results();
      else if(phase==='review')html+=this.reflection();
      else html+=this.complete();
      const focus=document.activeElement?.dataset?.act,focusValue=document.activeElement?.dataset?.value;
      $('case-content').innerHTML=html;
      if(this.lastPhase!==phase||this.lastDetail!==this.detail||this.lastHelp!==this.help){panel.scrollTop=0;$('case-content').querySelector('h1')?.focus({preventScroll:true});}
      else{panel.scrollTop=scroll;for(const b of $('case-content').querySelectorAll('button'))if(b.dataset.act===focus&&b.dataset.value===focusValue){b.focus({preventScroll:true});break;}}
      this.lastPhase=phase;this.lastDetail=this.detail;this.lastHelp=this.help;
    },
    intro(){
      const cfg=M.scenarios[G.cafeCase.scenario];
      return this.head('一个小项目 / 可以慢慢做',cfg.subtitle,cfg.owner)+`<div class="case-callout"><b>这次想做到</b><p>${cfg.goal}</p></div><p class="case-small">8 格行动。调查花 1 格，试营业花 2 格。阅读、暂停和喝咖啡都不花时间，随时离开也会保存。</p><div class="case-row">${this.button('我来看看发生了什么 →','start','','case-primary')}${this.button('今天只想喝咖啡','exit')}</div>`;
    },
    investigation(){
      const s=G.cafeCase;
      return this.head('01 / 看见发生的事','下一步，由你来选。','先选一个你想弄清的问题。也可以直接做一个小试验，再回来调查。')+
        `<div class="case-action-list">${Object.entries(M.actions).map(([id,a])=>this.button(`<span><b>${a.name}</b><small>${a.desc}</small></span><em>${s.actions.includes(id)?'查看 · 免费':'−1 格'}</em>`,'read',id,'case-action',!s.actions.includes(id)&&M.remaining(s)<=2)).join('')}</div>`+
        `<div class="case-callout"><b>桌上的证据 · ${s.actions.length} 份</b><p>已读材料可反复打开，不扣行动。故事里的熟人并不是唯一线索来源。</p></div>`+
        `<div class="case-row">${this.button('整理判断，做一次试验 →','plan','','case-primary',M.remaining(s)<2)}${s.trials.length?this.button('已有结果，去复盘','review'):''}</div>`;
    },
    reading(id){
      const s=G.cafeCase,e=M.evidence(s.scenario,id),b=M.simulate(s.scenario);
      let h=this.head(e.type,e.title)+`<blockquote>${e.text}</blockquote>`;
      if(id==='orders')h+=`<div class="case-table-wrap"><table><caption>同一个早高峰的 10 张订单 · 分钟</caption><thead><tr><th>单号</th><th>到店</th><th>出杯</th><th>结果 / 时刻</th></tr></thead><tbody>${b.orders.map(o=>`<tr><td>#${String(o.id).padStart(2,'0')}</td><td>${o.arrival.toFixed(1)}</td><td>${o.ready.toFixed(1)}</td><td>${o.served?'取走':'离开'} ${o.leave.toFixed(1)}</td></tr>`).join('')}</tbody></table></div><p class="case-small">从开店后第 0 分钟计时。已做好的杯子，也可能没有被取走。记录只覆盖这一次早高峰。</p>`;
      if(id==='opinion')h+='<p class="case-small">这份材料能告诉你期待；要知道实际采用，还需要观察一次真实选择。</p>';
      h+=`<div class="case-row">${this.button(s.pins.includes(id)?'已圈为关键证据 ✓':'圈为关键证据','pin',id,'',false,s.pins.includes(id))}${this.button('回到调查桌 →','back','','case-primary')}</div>`;
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
    handbook(){return this.head('随时可查 / 不扣行动','你可以怎样玩？')+`<p>调查一次花 1 格，试营业一次花 2 格。总共 8 格，并保留至少一次试验的机会。</p><p>查看旧证据、整理思路、暂停或离开不会花行动。所有选择自动保存，回到咖啡馆可以接着做。</p><p>“事实”是看过、听过或记录过的事；“猜测”是你对原因的解释；“未知”决定接下来值得验证什么。</p><p>每次方案最多投入 6 枚预算。它是单次试验的上限，比较第二个方案时重新分配。</p><p>画面只重放少量代表性顾客，表格与结果覆盖全部 10 人。不同方案的顾客顺序保持一致。</p><p>方法卡：选择能减少当前不确定性的行动。结果与判断依据分开看，允许承认还不知道。</p><div class="case-row">${this.button('回到刚才的地方 →','back','','case-primary')}</div>`;}
  };
  window.PQCafeCase=C;
})();
