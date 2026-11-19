/* A complete side story: arrive, arrange, operate two shifts, keep a consequence. */
(function(){
  'use strict';
  const M=PQNightMarketModel,$=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),names={order:'点单台',brew:'制作台',pickup:'取餐架'};
  const C={active:false,view:'arrival',dialog:null,paused:false,station:'order',tab:'layout',selected:null,
    init(){
      G.nightMarket=M.normalize(G.nightMarket);
      $('game').insertAdjacentHTML('beforeend',`<section id="market-screen" class="screen" aria-label="夏青的周末夜市"><header id="market-top"><button data-a="exit">← 岛上</button><div><span>WEEKEND / 海风营业中</span><strong>夏青的周末夜市</strong></div><nav><button data-a="pause" id="market-pause" hidden>暂停</button><button data-a="help" aria-label="夜市操作帮助">帮助</button></nav></header><div id="market-meter" hidden><span id="market-clock"></span><span id="market-stock"></span><span id="market-cash"></span></div><div id="market-pins"></div><section id="market-dock" aria-label="当前任务"></section><section id="market-dialog" role="dialog" aria-label="夜市交谈与记录" aria-modal="true" hidden></section><p id="market-notice" role="status" aria-live="polite"></p></section>`);
      $('market-screen').addEventListener('click',e=>{const b=e.target.closest('button[data-a]');if(b&&!b.disabled)this.action(b.dataset.a,b.dataset.v);});
      $('market-screen').addEventListener('keydown',e=>{
        if(e.key==='Escape'){e.preventDefault();this.action(this.dialog?'back':this.view==='service'?'pause':'exit');}
        if(this.dialog&&e.key==='Tab'){const bs=[...$('market-dialog').querySelectorAll('button:not(:disabled)')],first=bs[0],last=bs.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
      });
      document.addEventListener('visibilitychange',()=>{if(this.active&&document.hidden){this.acc=0;G.save();}});
      window.addEventListener('pagehide',()=>{if(this.active)G.save();});G.save();
    },
    get run(){return G.nightMarket.run;},
    open(visit=false){
      if(this.active)this.suspend();if(PQLifeFilm.active)PQLifeFilm.finish(false);if(PQCampaign.active)PQCampaign.suspend();if(PQCafeCase.active)PQCafeCase.suspend();if(PQStory3D.active)PQStory3D.exit();
      if(PQFirstDay.guided())G.firstDay.paused=true;G.firstDay.started=true;PQFirstDay.closeDialog();PQFirstDay.clearRoute();G.closeBuilding(true);
      this.dialog=null;this.view=visit&&G.nightMarket.legacy?'visit':this.run.phase;this.paused=this.view==='service';this.tab='layout';this.station='order';this.selected=null;this.acc=0;this.saveClock=0;this.notice='';this.lastRenderKey=null;
      PQStory3D.enter('nightmarket','xiaomei',true);this.active=true;G.show('market-screen');$('game').classList.add('market-mode');PQNightMarketScene.attach();this.render();G.save();
      if(!this.run.intro&&this.view==='arrival')PQLifeFilm.playMarket('arrival');
    },
    suspend(){if(!this.active)return;if(PQLifeFilm.active)PQLifeFilm.finish(false);this.active=false;this.paused=true;G.save();PQNightMarketScene.detach();$('game').classList.remove('market-mode');this.dialog=null;},
    close(){this.suspend();G.toMap();const w=PQIsland,d=w.buildings.cafe?.doorPos;if(d){w.playerPos.copy(d);w.playerPos.x+=1.3;w.playerPos.z+=1.8;w.playerRig.group.position.copy(w.playerPos);w.setMode('walk');w.recentre(true);}PQNightMarketScene.worldSync();if(G.nightMarket.legacy)w.setStatus('夜市留下的'+(G.nightMarket.legacy.run.plan.space==='bench'?'长凳':'取餐架')+'，就在蓝山旁边。',5000);},
    button(text,a,v='',cls='',disabled=false,pressed){return `<button data-a="${a}" data-v="${esc(v)}" class="${cls}"${disabled?' disabled':''}${pressed===undefined?'':` aria-pressed="${pressed}"`}>${text}</button>`;},
    step(type,value){const ok=M.act(G.nightMarket,type,value);if(ok)G.save();return ok;},
    selectedOrder(){return this.run.orders.find(o=>o.id===this.selected&&['waiting','accepted'].includes(o.status))||this.run.orders.find(o=>['waiting','accepted'].includes(o.status));},
    action(a,v){
      if(!this.active||PQLifeFilm.active)return;
      if(a==='exit'){this.close();return;}
      if(a==='pause'){this.paused=!this.paused;this.acc=0;this.render();return;}
      if(a==='back'){this.dialog=null;this.render();return;}
      if(a==='help'){this.dialog={type:'help'};this.render();return;}
      if(a==='motion'){PQCafeCase.reduceMotion=!PQCafeCase.reduceMotion;try{localStorage.setItem('pq-cafe-reduce-motion',PQCafeCase.reduceMotion?'1':'0');}catch(e){}this.render();return;}
      if(a==='sound'){G.toggleMute();this.render();return;}
      if(a==='talk'){this.step('talk',v);this.dialog={type:'talk',id:v,line:0};this.render();return;}
      if(a==='line'){const lines=this.lines(this.dialog.id);if(++this.dialog.line>=lines.length)this.dialog=null;this.render();return;}
      if(a==='evidence'){this.dialog={type:'evidence',id:v};this.render();PQPropLibrary.market(v);return;}
      if(a==='film'){PQLifeFilm.playMarket(v);return;}
      if(a==='setup'){this.step('setup');this.view=this.run.phase;this.render();return;}
      if(a==='tab'){this.tab=v;this.render();return;}
      if(a==='station'){
        this.station=v;
        if(['arrival','visit','complete','closing'].includes(this.view)){if(this.view==='arrival'){this.step('setup');this.view='setup';}else{this.action('evidence','layout');return;}}
        else if(this.view==='service'){const o=this.selectedOrder();if(v==='order'&&o?.status==='waiting'&&!this.paused)this.action('accept');else if(v==='pickup'&&this.run.cup&&!this.paused)this.action('serve');}
        this.render();return;
      }
      if(a==='move'){const layout=this.run.plan.layout.slice(),i=layout.indexOf(this.station),j=i+Number(v);if(j<0||j>2)return;[layout[i],layout[j]]=[layout[j],layout[i]];this.step('plan',{key:'layout',val:layout});this.render();return;}
      if(a==='plan'){const [key,raw]=v.split(':');const val=key==='sign'?raw==='true':['stock','price'].includes(key)?Number(raw):raw;if(!this.step('plan',{key,val}))this.notice='零钱不够这次改动了。先保留现有布置，或少备一些材料。';this.render();return;}
      if(a==='restock'){if(!this.step('restock'))this.notice='补六份需要 12 元，最多保留 24 份材料。';this.render();return;}
      if(a==='open'){this.step('open');this.view=this.run.phase;this.dialog=null;this.paused=false;this.acc=0;this.selected=null;this.render();return;}
      if(a==='select'){this.selected=v;this.render();return;}
      if(['accept','brew','serve','discard','wait'].includes(a)){
        if(this.paused||this.dialog||this.view!=='service')return;
        const order=this.selectedOrder(),value=['accept','serve'].includes(a)?order?.id:a==='wait'?M.nextWait(this.run):v;
        if(!this.step(a,value)){this.notice=a==='serve'?'这杯和这位客人的订单不一样。可以给另一位客人，或倒掉重做。':'先完成当前这杯，再进行下一步。';}
        else {PQNightMarketScene.onAction(a,value);SFX.foley(a==='serve'?'cup':'step');this.notice=a==='serve'?'交到客人手里了。':a==='accept'?'记下订单了，去制作台。':'';if(a==='brew')this.station='brew';if(a==='serve')this.station='order';}
        this.checkPhase();this.render();return;
      }
      if(a==='end'){this.dialog={type:'end'};this.render();return;}
      if(a==='end-confirm'){this.dialog=null;this.step('end');this.checkPhase();this.render();return;}
      if(a==='commit'){this.step('complete');M.commit(G.nightMarket);G.save();this.view='complete';this.render();SFX.unlock();return;}
      if(a==='visit'){this.view='visit';this.dialog=null;this.render();return;}
      if(a==='resume'){this.view=this.run.phase;this.paused=this.view==='service';this.render();return;}
      if(a==='replay'){this.dialog={type:'restart'};this.render();return;}
      if(a==='restart'){M.restart(G.nightMarket);G.save();this.view='arrival';this.dialog=null;this.paused=false;this.render();return;}
    },
    tick(dt){
      if(!this.active||this.view!=='service'||this.paused||this.dialog||document.hidden||PQLifeFilm.active)return;
      this.acc+=Math.min(.05,Math.max(0,dt));const ticks=Math.floor(this.acc*10);if(!ticks)return;this.acc-=ticks/10;const before=this.signature();
      M.act(G.nightMarket,'wait',ticks);this.saveClock+=ticks;if(this.saveClock>=20){G.save();this.saveClock=0;}
      if(this.checkPhase())return;if(before!==this.signature())this.render();else this.meter();
    },
    signature(){const r=this.run;return JSON.stringify([r.phase,r.stock,!!r.brew,r.cup,r.orders.map(o=>[o.id,o.status])]);},
    checkPhase(){if(this.run.phase===this.view)return false;this.view=this.run.phase;this.paused=false;this.selected=null;this.notice='';this.tab='layout';G.save();this.render();if(['break','closing'].includes(this.view))PQLifeFilm.playMarket(this.view);return true;},
    filmFinished(mark,kind){if(mark&&kind==='arrival')this.step('intro');if(this.active){this.render();$('market-dock').querySelector('button')?.focus({preventScroll:true});}},
    lines(id){
      const record=(this.view==='visit'?G.nightMarket.legacy?.run:null)||this.run,res=M.result(record),after=['closing','complete','visit'].includes(this.view);
      if(id==='xiaomei'&&this.view==='break')return [`前半场交出去 ${res.served} 杯，还剩 ${res.stock} 份材料。零钱现在有 ${record.cash} 元。`,res.missed?'刚才有人没等到。看看是排队的位置，还是我们这边来不及做。':res.declined?'有人看了价签就走了。后半场，价格要不要改一改？':'刚才等着的人都拿到了。可以保持，也可以试着让操作更顺手。','我去收一下空杯。你把后半场的台面安排好，我们再开。'];
      if(id==='xiaomei')return after?[
        `这次卖出 ${res.served} 杯，进账 ${res.revenue} 元，材料、摊位和布置花了 ${res.cost} 元。${res.profit>=0?'结余 '+res.profit+' 元。':'还差 '+(-res.profit)+' 元回本。'}零钱和本钱得分开放。`,
        res.stock?`还剩 ${res.stock} 份未开封材料，收好下次用。今天没卖掉也得记在账上。`:'材料用完了。下回也不能只靠猜要备多少。',
        res.space==='bench'?'凳子我想留下。上次说周末预算，这次终于有一笔花在了想做的事上。':'架子就留在蓝山外面吧。早上赶车的人，应该会用得上。'
      ]:[
        G.firstDay.clues.includes('envelopes')||G.campaign?.records['2']?.committed?'你还记得那个周末信封吧？这次里面有 60 元。我想拿它试一晚小摊。':'我把周末能花的钱放进信封。这次有 60 元，我们只试一晚，不够就收摊。',
        '你管接单和出杯，我招呼邻居、收拾桌子。先把点单、制作、取餐的位置摆好。',
        '前半场忙完，我们停下来看看哪里堵了。卖不完也没关系，先知道为什么。'
      ];
      if(id==='achen')return after||this.view==='break'?[
        res.achen?'今天那杯茶我喝到了。工作日赶车，周末我反倒想找个地方多待一会儿。':'今晚没喝到那杯。下次我还会来，但别为了等一杯错过海边的晚风。',
        res.space==='bench'?'有这张凳子，以后周末就约在这儿吧。':'取餐架挺方便。下次如果还能有个歇脚的地方就更好了。'
      ]:[
        G.cafeCase?.legacy?'还记得蓝山那次吗？当时真的要赶车。今天不用。':'工作日我常常拿了咖啡就跑。今天不用赶车，想换一杯茶。',
        '所以别只记住我“想快一点”。换一个晚上，我想要的可能也变了。'
      ];
      return after?[
        res.li?'这杯咖啡是我自己掏钱买的，和我支持你试一试，是两件事。':'我今天没有买到。熟人愿意陪你聊，并不表示这笔生意就成立了。',
        `${res.declined?res.declined+' 位客人看到价格就走了。':'价格没有挡住今天这些客人。'}${res.missed?res.missed+' 位没等到交付。':'留下等候的人都喝到了。'}只记总收入，会漏掉这些人。`,
        '先把这晚的事记清楚。下个周末再看，别急着宣布找到答案。'
      ]:[
        '我在旧书摊逛一圈，后半场来买咖啡。先别给熟人免单，账就记不清了。',
        '有人只带了六块零钱，有人赶着回家。多看看他们怎么选。今天不用做演示文稿。'
      ];
    },
    pins(){
      if(this.dialog)return'';let out='<span class="market-hero-label" data-rig="hero">你 · 摊主</span>';
      if(['arrival','closing','complete','visit'].includes(this.view))for(const [key,rig,name]of [['xiaomei','mei','夏青'],['achen','citizen2','阿晨'],['li','lijie','李姐']])out+=`<button data-a="talk" data-v="${key}" data-rig="${rig}">${name}<small> · 聊聊</small></button>`;
      else if(['setup','break'].includes(this.view))for(const key of M.stations)out+=`<button data-a="station" data-v="${key}" data-station="${key}" aria-pressed="${this.station===key}">${names[key]}</button>`;
      else if(this.view==='service')for(const o of this.run.orders.filter(o=>['waiting','accepted'].includes(o.status)).slice(0,3)){const g=M.guests.find(g=>g.id===o.id);out+=`<button data-a="select" data-v="${o.id}" data-rig="${g.rig}" aria-pressed="${this.selectedOrder()?.id===o.id}">${g.name}<small> · ${M.drinks[g.drink]}</small></button>`;}
      return out;
    },
    layout(){const r=this.run,p=r.plan,i=p.layout.indexOf(this.station);return `<div class="market-layout"><span>客人从左侧来到摊位</span><div>${p.layout.map((k,i)=>this.button(`<small>${i+1}</small> ${names[k]}`,'station',k,'',false,k===this.station)).join('')}</div></div><div class="market-row"><b>移动${names[this.station]}</b>${this.button('← 左移','move','-1','',i===0)}${this.button('右移 →','move','1','',i===2)}</div><p>制作要在台面之间走动。当前每杯需要约 ${M.duration(p)/10} 秒。换个位置，看看路线有没有更顺。</p><div class="market-row">${this.button('长凳 · 留人歇脚','plan','space:bench','',false,p.space==='bench')}${this.button('置物架 · 制作更快','plan','space:shelf','',false,p.space==='shelf')}${this.button(p.sign?'取餐指示牌 · 已放':'加取餐指示牌 · 4 元','plan','sign:'+!p.sign,'',false,p.sign)}</div>${r.phase==='break'?'<p class="market-small">已有布置不退款；换家具补 4 元，新加指示牌补 4 元。</p>':''}`;},
    supplies(){const p=this.run.plan,setup=this.run.phase==='setup';return `<div class="market-options"><fieldset><legend>每杯售价</legend>${[6,9].map(n=>this.button(n+' 元','plan','price:'+n,'',false,p.price===n)).join('')}<p>每份材料 2 元。不是所有客人都愿意付同样的钱。</p></fieldset><fieldset><legend>${setup?'今晚备料':'还剩 '+this.run.stock+' 份'}</legend>${setup?[8,12,16].map(n=>this.button(n+' 份','plan','stock:'+n,'',false,p.stock===n)).join(''):this.button('补 6 份 · 12 元','restock','','',this.run.cash<12||this.run.stock>18)}<p>${setup?'摊位 8 元；长凳 8 元 / 置物架 4 元；指示牌 4 元。':'补货从现有零钱里支出。没用完的也计入今晚成本。'}</p></fieldset></div><p class="market-budget">${setup?'信封 60 元 − 开摊成本 '+M.cost(p)+' 元 = 预留 '+(60-M.cost(p))+' 元':'手头零钱 '+this.run.cash+' 元 · 已花 '+this.run.cost+' 元'}</p>`;},
    service(){
      const r=this.run,o=this.selectedOrder(),g=o&&M.guests.find(g=>g.id===o.id),off=this.paused,waiting=r.orders.filter(o=>['waiting','accepted'].includes(o.status));let html=`<div class="market-dock-head"><div><span class="market-eyebrow">${!r.tutorial?'第一单 · 先学会，计时还没开始':r.wave===1?'前半场 · 试着经营':'后半场 · 看看调整的结果'}</span><h2>${off?'已暂停，客人会等你。':o?g.name+' · '+M.drinks[g.drink]:r.brew||r.cup?'台面上还有一杯':'海风吹过，等下一位客人。'}</h2></div>${this.button(off?'继续营业':'暂停','pause','','market-secondary')}</div>`;
      if(waiting.length)html+=`<div class="market-orders">${waiting.map(o=>{const c=M.guests.find(g=>g.id===o.id);return this.button(`${esc(c.name)}<small>${M.drinks[c.drink]} · ${o.status==='accepted'?'已接单':'待接单'}</small>`,'select',o.id,'',false,o.id===this.selectedOrder()?.id);}).join('')}</div>`;
      if(o)html+=`<p class="market-small">“${esc(g.line)}” <span id="market-patience"></span></p>`;
      html+='<div class="market-actions">';
      if(o?.status==='waiting')html+=this.button('① 接下这单','accept','','market-primary',off);
      if(o?.status==='accepted'&&!r.brew&&!r.cup)html+=Object.entries(M.drinks).map(([key,name])=>this.button('② 做'+name,'brew',key,key===g.drink?'market-primary':'',off||r.stock===0)).join('');
      if(r.brew)html+=`<div class="market-making" role="status">正在做${M.drinks[r.brew.drink]}<span id="market-brew-time"></span><div><i id="market-brew-bar"></i></div></div>`;
      if(r.cup)html+=this.button('③ 把'+M.drinks[r.cup]+'交给'+(g?.name||'客人'),'serve','','market-primary',off||o?.status!=='accepted');
      if(r.cup||r.brew)html+=this.button('倒掉这杯','discard','','market-secondary',off);
      if(!waiting.length&&!r.cup&&!r.brew)html+=this.button(M.nextWait(r)>0&&r.time>=930?'结束这半场 →':'下一位客人 →','wait','','market-primary',off||!M.nextWait(r));
      if(!r.stock&&!r.cup&&!r.brew)html+='<p>材料用完了。可以提前休息，看看要不要补货。</p>';
      return html+'</div><div class="market-dock-foot">'+this.button('提前结束这半场','end','','market-link')+'<span>离开或查看帮助会暂停 · 营业自动保存</span></div>';
    },
    summary(record){const q=M.result(record);return `<dl class="market-metrics"><div><dt>交到手里的饮品</dt><dd>${q.served}<small> / 12 杯</small></dd></div><div><dt>收入 − 成本</dt><dd>${q.profit>=0?'+':''}${q.profit}<small> 元</small></dd></div><div><dt>未等到 / 因价格离开</dt><dd>${q.missed}<small> / ${q.declined} 人</small></dd></div></dl><p>收入 ${q.revenue} 元，成本 ${q.cost} 元。未开封材料剩 ${q.stock} 份，倒掉或收摊未交付 ${q.discarded} 杯。</p>`;},
    render(){
      if(!this.active)return;const r=this.run,old=document.activeElement,scroll=$('market-dock').scrollTop,btn=this.button.bind(this);let h='';
      $('market-screen').dataset.view=this.view;$('market-screen').classList.toggle('market-dialog-open',!!this.dialog);
      $('market-pause').hidden=this.view!=='service';$('market-pause').textContent=this.paused?'继续':'暂停';$('market-pause').setAttribute('aria-pressed',String(this.paused));$('market-meter').hidden=!['setup','service','break'].includes(this.view);
      $('market-pins').innerHTML=this.pins();PQNightMarketScene.prompts?.hide();
      if(this.view==='arrival')h=`<span class="market-eyebrow">周六 18:30 · 一只装着 60 元的信封</span><h1>今晚，一起摆个小摊。</h1><p>夏青带来了信封，阿晨今天不赶车。先听听他们的打算，再亲手布置、接单、制作和交付。</p><div class="market-row">${btn('和夏青碰个头','talk','xiaomei','market-primary')}${btn('开始布置摊位 →','setup')}${G.nightMarket.legacy?btn('看看上次留下的变化','visit'):''}</div>`;
      if(['setup','break'].includes(this.view))h=`<span class="market-eyebrow">${this.view==='setup'?'开摊前 · 先安排手边的事':'中场歇一会儿 · 营业计时已停'}</span><div class="market-dock-head"><h2>${this.view==='setup'?'把小摊摆成你想要的样子。':`前半场交付 ${r.orders.filter(o=>o.status==='served').length} 杯，哪里需要调整？`}</h2><div class="market-tabs">${btn('摆台','tab','layout','',false,this.tab==='layout')}${btn('备货 / 开价','tab','supplies','',false,this.tab==='supplies')}</div></div>${this.tab==='layout'?this.layout():this.supplies()}<div class="market-row">${this.tab==='layout'?btn('继续：备货与开价 →','tab','supplies','market-primary'):btn(this.view==='setup'?'招呼第一位客人 →':'开始后半场 →','open','','market-primary')}${btn('打开信封 / 营业记录','evidence','budget')}${this.view==='break'?btn('问问阿晨','talk','achen'):''}</div>`;
      if(this.view==='service')h=this.service();
      if(this.view==='closing')h=`<span class="market-eyebrow">收摊了 · 今天的选择，会留到明天</span><h1>灯还亮着，先一起算算账。</h1>${this.summary(r)}<div class="market-row">${btn('和夏青收好零钱','talk','xiaomei')}${btn('阿晨的感受','talk','achen')}${btn('李姐的看法','talk','li')}${btn('把这一晚留在岛上 →','commit','','market-primary')}</div><p class="market-small">会保留${r.plan.space==='bench'?'长凳':'取餐架'}${r.plan.sign?'与指示牌':''}、客人的记忆和这次经营记录。${G.nightMarket.legacy?'确认后会更新上次留下的布置。':''}</p>`;
      if(['complete','visit'].includes(this.view)){const record=G.nightMarket.legacy?.run||r,q=M.result(record);h=`<span class="market-eyebrow">${this.view==='visit'?'再来坐坐 · 岛上保留的那一晚':'夜市手记 · 已保存'}</span><h1>${q.title}</h1><p>${q.line}</p><div class="market-row">${btn('回岛上看看变化 →','exit','','market-primary')}${btn('和阿晨聊聊','talk','achen')}${btn('看看这晚的账','evidence','result')}${btn('再经营一个周末','replay')}${this.view==='visit'&&this.run.phase!=='complete'?btn('继续尚未收摊的这一晚','resume'):''}</div><p class="market-small">回岛后在蓝山咖啡馆旁能看到布置。练习不会改掉它，直到你再次选择“把这一晚留在岛上”。</p>`;}
      $('market-dock').innerHTML=h;$('market-dock').inert=!!this.dialog;$('market-top').inert=!!this.dialog;$('market-meter').inert=!!this.dialog;const renderKey=this.view+':'+this.tab;$('market-dock').scrollTop=this.lastRenderKey===renderKey?scroll:0;this.lastRenderKey=renderKey;
      $('market-dialog').hidden=!this.dialog;
      if(this.dialog){$('market-dialog').innerHTML=this.dialogHTML();$('market-dialog').querySelector('button')?.focus({preventScroll:true});}
      else if(old?.dataset.a){const next=[...$('market-screen').querySelectorAll('button')].find(b=>b.dataset.a===old.dataset.a&&b.dataset.v===old.dataset.v);next?.focus({preventScroll:true});}
      PQNightMarketScene.sync();$('market-notice').textContent=this.notice||'';this.meter();
    },
    dialogHTML(){
      const d=this.dialog,btn=this.button.bind(this),r=this.view==='visit'?G.nightMarket.legacy.run:this.run,head=(title)=>`<header><h2>${title}</h2>${btn('返回场景 ×','back','','market-link')}</header>`;
      if(d.type==='talk'){const lines=this.lines(d.id);return head({xiaomei:'夏青 · 今晚的搭档',achen:'阿晨 · 不赶车的周末',li:'李姐 · 先来买一杯'}[d.id])+`<p class="market-line">${esc(lines[d.line])}</p><footer><span>${d.line+1} / ${lines.length}</span>${btn(d.line===lines.length-1?'先聊到这儿 →':'接着听 →','line','','market-primary')}</footer>`;}
      if(d.type==='evidence')return head(d.id==='layout'?'留下来的布置':d.id==='result'?'这一晚的营业记录':'夏青的信封与摊位账')+(d.id==='layout'?`<p>从左到右：${r.plan.layout.map(k=>names[k]).join(' → ')}。${r.plan.space==='bench'?'一张让人坐下的长凳。':'一个让制作顺手的置物架。'}${r.plan.sign?'取餐指示牌也保留着。':'这次没有摆取餐指示牌。'}</p>`:['arrival','setup'].includes(r.phase)?`<p>信封里 60 元。摊位 8 元，材料每份 2 元，长凳 8 元或置物架 4 元，指示牌 4 元。</p><p>当前布置与备料共 ${M.cost(r.plan)} 元，还能留下 ${60-M.cost(r.plan)} 元周转。每杯按你写出的 ${r.plan.price} 元售卖。</p>`:this.summary(r))+`<p class="market-small">记录来自这一晚的实际操作；这是固定虚构样本，不代表真实市场需求。</p>${btn('合上记录，回到摊位 →','back','','market-primary')}`;
      if(d.type==='end')return head('现在收摊休息？')+'<p>还在等的客人会离开，正在做和未交出的饮品会记为损耗。已经交付的收入会保留。</p><div class="market-row">'+btn('继续照顾客人','back','','market-primary')+btn('结束这半场','end-confirm')+'</div>';
      if(d.type==='restart')return head('再试一个周末')+'<p>本次尚未保存到岛上的经营会重新开始；上次留在岛上的布置和人物记忆会保留。重新收摊后，可以主动更新它们。</p><div class="market-row">'+btn('开始新的一晚','restart','','market-primary')+btn('先留在这里','back')+'</div>';
      return head('摆摊时，手边有一条清楚的路')+'<ol><li>点人物或订单，先接单。</li><li>在制作台选饮品，等杯子做好。</li><li>选对客人，把饮品交到他手里。</li></ol><p>第一单不计营业时间。之后每半场两分钟，中场可以改布置、价格、补材料。没有客人时可直接等下一位。</p><p>暂停、聊天、查看账本和切换后台都不会扣时间。离开自动保存，回来会停在原处等你继续。减少动态效果会停止装饰动作，制作仍用进度条显示。</p><div class="market-row">'+btn(PQCafeScene.reduced()?'减少动态 · 已开启':'减少动态效果','motion')+btn(SFX.muted?'开启音效':'关闭音效','sound')+btn('重看赴约片段','film','arrival')+'</div>';
    },
    meter(){
      const r=this.run;$('market-clock').textContent=this.view==='service'?(!r.tutorial?'第一单 · 不计时':`${r.wave===1?'前':'后'}半场 · ${Math.ceil((1200-r.time)/10)} 秒`):this.view==='break'?'中场 · 时间已停':'开摊准备';$('market-stock').textContent=`材料 ${r.phase==='setup'?r.plan.stock:r.stock} 份`;$('market-cash').textContent=`零钱 ${r.phase==='setup'?60-M.cost(r.plan):r.cash} 元`;
      if($('market-brew-time')&&r.brew)$('market-brew-time').textContent=' · '+(r.brew.remaining/10).toFixed(1)+' 秒';if($('market-brew-bar')&&r.brew)$('market-brew-bar').style.width=(1-r.brew.remaining/r.brew.total)*100+'%';
      const o=this.selectedOrder();if($('market-patience')&&o)$('market-patience').textContent=r.tutorial?'还能等约 '+Math.max(0,Math.ceil((o.deadline-r.time)/10))+' 秒':'先放心练习这一单';
    },
    buildingHTML(){return `<button class="exp-primary" onclick="PQNightMarket.open()">夏青的周末夜市 · ${this.run.phase==='complete'?'回访与经营':this.run.phase==='arrival'?'一起摆摊':'继续这一晚'} ↗</button>`;}
  };window.PQNightMarket=C;
})();
