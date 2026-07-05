/* ============================================================
   engine.js — 产品经理大冒险 · 游戏引擎
   引擎不含任何剧情内容；内容由 content/*.js 注册进 window.PQ
============================================================ */
const TERMS = PQ.terms, NOTES = PQ.notes, LEVELS = PQ.levels,
      BUILDINGS = PQ.buildings, CASES = PQ.cases;

/* ================= 像素小人 ================= */
const PAL = {'0':null,'K':'#16233f','S':'#f2c19a','H':'#5c3a21','h':'#2b2b2b','p':'#2b2b2b','R':'#c8534f','B':'#4f9df0','G':'#3fae6b','Y':'#ffcd75','W':'#f4f4f4','P':'#8e5aa8','g':'#9aa8b8'};
/* 玩家模板：h=发色 S=肤色 B=上衣 p=裤子（DIY可换色） */
const PLAYER_TPL = {
  short: [
  "0000KKKKKKKK0000","000KhhhhhhhhK000","00KhhhhhhhhhhK00","00KhhSSSSSShhK00",
  "00KSSSSSSSSSSK00","00KSKKSSSSKKSK00","00KSSSSSSSSSSK00","00KSSSKSSKSSSK00",
  "000KSSSKKSSSK000","0000KKKKKKKK0000","000KBBBBBBBBK000","00KBBBBBBBBBBK00",
  "0KSBBBBBBBBBBSK0","0KSBBBWWWWBBBSK0","0KSBBBBBBBBBBSK0","0KKBBBBBBBBBBKK0",
  "00KBBBBBBBBBBK00","00KBBBBBBBBBBK00","000KKKKKKKKKK000","000Kppp00pppK000",
  "000KpppKKpppK000","000KpppK0KpppK00","00KKKKK00KKKKK00","0000000000000000"],
  long: [
  "0000KKKKKKKK0000","000KhhhhhhhhK000","00KhhhhhhhhhhK00","0KhhSSSSSSSShhK0",
  "0KhSSSSSSSSSShK0","0KhSKKSSSSKKShK0","0KhSSSSSSSSSShK0","0KhSSSKSSKSSShK0",
  "0KhhSSSKKSSShhK0","0KhhKKKKKKKKhhK0","0KhhBBBBBBBBhhK0","0KhBBBBBBBBBBhK0",
  "0KSBBBBBBBBBBSK0","0KSBBBWWWWBBBSK0","0KSBBBBBBBBBBSK0","0KKBBBBBBBBBBKK0",
  "00KBBBBBBBBBBK00","00KBBBBBBBBBBK00","000KKKKKKKKKK000","000Kppp00pppK000",
  "000KpppK0KpppK00","000KpppK0KpppK00","00KKKKK00KKKKK00","0000000000000000"]
};
const SPRITES = PQ.sprites; // NPC精灵由 content/world.js 注册
/* 嘴巴位置(说话动画) 和 眼睛位置(眨眼) */
const FACE = {
  me:{mouth:[6,7,4], eyes:[[4,5,2],[10,5,2]]},
  boss:{mouth:[6,8,4], eyes:[[4,5,2],[10,5,2]]},
  xiaomei:{mouth:[6,7,4], eyes:[[4,5,2],[10,5,2]]},
  lijie:{mouth:[6,7,4], eyes:[[4,6,2],[10,6,2]]},
  akai:{mouth:[6,7,4], eyes:[[4,5,2],[10,5,2]]},
  xiaoyu:{mouth:[6,7,4], eyes:[[4,5,2],[10,5,2]]}
};
function drawSprite(canvas, key, opt){
  opt=opt||{};
  let map, pal=PAL, face=FACE[key], skin='#f2c19a';
  const hasG = (typeof G!=='undefined') && G && G.avatar;
  if(key==='me'){
    const av = hasG ? G.avatar : {style:'short',hair:'#2b2b2b',skin:'#f2c19a',cloth:'#4f9df0'};
    map=PLAYER_TPL[av.style]||PLAYER_TPL.short;
    pal={...PAL, h:av.hair, S:av.skin, B:av.cloth};
    face=FACE.me; skin=av.skin;
  } else { map=SPRITES[key]; }
  const ctx=canvas.getContext('2d');
  canvas.width=16; canvas.height=24;
  map.forEach((row,y)=>{ for(let x=0;x<16;x++){ const c=pal[row[x]]; if(c){ctx.fillStyle=c; ctx.fillRect(x,y,1,1);} } });
  if(key==='me' && hasG && G.avatar.glasses){
    ctx.fillStyle='#22344f';
    // 左镜框（空心方框，露出眼睛）
    ctx.fillRect(3,4,4,1); ctx.fillRect(3,6,4,1); ctx.fillRect(3,5,1,1); ctx.fillRect(6,5,1,1);
    // 右镜框
    ctx.fillRect(9,4,4,1); ctx.fillRect(9,6,4,1); ctx.fillRect(9,5,1,1); ctx.fillRect(12,5,1,1);
    // 镜桥
    ctx.fillRect(7,5,2,1);
  }
  if(opt.mouthOpen && face){ const[mx,my,mw]=face.mouth; ctx.fillStyle='#7a3b30'; ctx.fillRect(mx,my,mw,1); }
  if(opt.blink && face){ ctx.fillStyle=skin; face.eyes.forEach(([ex,ey,ew])=>ctx.fillRect(ex,ey,ew,1)); }
}

/* ================= 音效（WebAudio，可静音） ================= */
const SFX = {
  ctx:null, muted:false,
  ac(){ if(!this.ctx){ try{this.ctx=new (window.AudioContext||window.webkitAudioContext)();}catch(e){} } return this.ctx; },
  beep(freq,dur,type,vol){
    if(this.muted)return; const ac=this.ac(); if(!ac)return;
    const o=ac.createOscillator(), g=ac.createGain();
    o.type=type||'square'; o.frequency.value=freq;
    g.gain.setValueAtTime(vol||.04, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(.001, ac.currentTime+(dur||.06));
    o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(dur||.06));
  },
  type(){ this.beep(880+Math.random()*220,.03,'square',.015); },
  ok(){ this.beep(660,.09); setTimeout(()=>this.beep(990,.12),90); },
  mid(){ this.beep(520,.1); setTimeout(()=>this.beep(620,.1),100); },
  bad(){ this.beep(220,.16,'sawtooth',.05); setTimeout(()=>this.beep(160,.22,'sawtooth',.05),140); },
  unlock(){ [523,659,784,1047].forEach((f,i)=>setTimeout(()=>this.beep(f,.1,'triangle',.05),i*80)); },
  click(){ this.beep(440,.04,'square',.03); }
};

/* ================= 游戏引擎 ================= */
const PAINS = PQ.pains; // 痛点文案由 content/world.js 注册
const AV_COLORS = {
  hair:['#2b2b2b','#5c3a21','#c8534f','#e0a63f','#8e5aa8','#9aa8b8'],
  skin:['#f2c19a','#e3a878','#c98a5e'],
  cloth:['#4f9df0','#3fae6b','#e05a6d','#ffcd75','#8e5aa8','#5b6b8c']
};
const G = {
  trust:100, unlocked:[], notes:[], progress:0,
  avatar:{style:'short', hair:'#2b2b2b', skin:'#f2c19a', cloth:'#4f9df0', glasses:false, name:'你'},
  lvIdx:0, nodeIdx:0, typing:false, typeTimer:null,
  dScore:0, dMax:0, qOk:0, qTotal:0, // 本关得分
  quizIdx:0, talkAnim:null, blinkTimer:null, painIdx:0,

  init(){
    for(let i=0;i<46;i++){
      const s=document.createElement('div'); s.className='star';
      const sz=Math.random()<.8?3:5;
      s.style.cssText=`left:${Math.random()*100}%;top:${Math.random()*100}%;width:${sz}px;height:${sz}px;animation-delay:${Math.random()*2.4}s`;
      document.getElementById('landing').appendChild(s);
    }
    this.load(); this.renderDex();
    PQ.hydratePxi(document); // 像素图标注入
    // 首页角色阵容
    [['cast-me','me'],['cast-boss','boss'],['cast-xiaomei','xiaomei'],['cast-lijie','lijie']].forEach(([id,key])=>{
      const c=document.getElementById(id); if(c&&c.getContext) drawSprite(c,key);
    });
    // 痛点轮播
    const pt=document.getElementById('pain-text');
    pt.innerHTML='<b style="color:var(--red)">◆</b> '+PAINS[0];
    setInterval(()=>{
      pt.classList.add('out');
      setTimeout(()=>{
        this.painIdx=(this.painIdx+1)%PAINS.length;
        pt.innerHTML=(this.painIdx===PAINS.length-1?'<b style="color:var(--accent)">◆</b> ':'<b style="color:var(--red)">◆</b> ')+PAINS[this.painIdx];
        pt.classList.remove('out');
      },450);
    },3400);
    // 全局眨眼循环
    setInterval(()=>this.blink(),3200);
  },
  save(){ try{ localStorage.setItem('pmquest2', JSON.stringify({trust:this.trust,unlocked:this.unlocked,notes:this.notes,progress:this.progress,avatar:this.avatar})); }catch(e){} },
  load(){ try{ const d=JSON.parse(localStorage.getItem('pmquest2')); if(d){Object.assign(this,d); if(!d.avatar)this.avatar={style:'short',hair:'#2b2b2b',skin:'#f2c19a',cloth:'#4f9df0',glasses:false,name:'你'};} }catch(e){} },

  /* ---------- 角色DIY ---------- */
  toAvatar(){
    SFX.click(); this.show('avatar-screen');
    document.getElementById('av-name').value=this.avatar.name==='你'?'':this.avatar.name;
    // 色板
    [['av-hair','hair'],['av-skin','skin'],['av-cloth','cloth']].forEach(([id,key])=>{
      const box=document.getElementById(id); box.innerHTML='';
      box.style.cssText='display:flex;gap:8px;flex-wrap:wrap';
      AV_COLORS[key].forEach(c=>{
        const s=document.createElement('div');
        s.className='swatch'+(this.avatar[key]===c?' on':'');
        s.style.background=c;
        s.onclick=()=>{ SFX.click(); this.avatar[key]=c; this.toAvatarRefresh(); };
        box.appendChild(s);
      });
    });
    document.querySelectorAll('[data-style]').forEach(b=>{
      b.classList.toggle('on', b.dataset.style===this.avatar.style);
      b.onclick=()=>{ SFX.click(); this.avatar.style=b.dataset.style; this.toAvatarRefresh(); };
    });
    document.querySelectorAll('[data-gl]').forEach(b=>{
      b.classList.toggle('on', (b.dataset.gl==='1')===this.avatar.glasses);
      b.onclick=()=>{ SFX.click(); this.avatar.glasses=b.dataset.gl==='1'; this.toAvatarRefresh(); };
    });
    drawSprite(document.getElementById('av-prev'),'me');
  },
  toAvatarRefresh(){
    const v=document.getElementById('av-name').value; // 保留未确认的昵称输入
    this.save(); this.toAvatar();
    document.getElementById('av-name').value=v;
  },
  confirmAvatar(){
    const n=document.getElementById('av-name').value.trim();
    this.avatar.name=n||'你';
    this.save(); this.showBadge();
  },
  showBadge(){
    SFX.click();
    const modal=document.getElementById('badge-modal');
    document.getElementById('badge-name').textContent=this.avatar.name;
    drawSprite(document.getElementById('badge-canvas'),'me');
    // 重置动画（支持重复观看）
    ['idcard','badge-stamp','badge-cap','badge-go'].forEach(id=>{
      const el=document.getElementById(id);
      el.style.animation='none'; void el.offsetWidth; el.style.animation='';
    });
    modal.querySelectorAll('.confetti').forEach(c=>c.remove());
    modal.classList.add('show');
    // 彩带
    const colors=['#ffcd75','#4ad07a','#5cb9ff','#e05a6d','#8e5aa8'];
    for(let i=0;i<26;i++){
      const c=document.createElement('div'); c.className='confetti';
      c.style.cssText=`left:${5+Math.random()*90}%; background:${colors[i%5]};
        animation-duration:${1.6+Math.random()*1.6}s; animation-delay:${.6+Math.random()*1.2}s;
        border-radius:${Math.random()<.5?'50%':'1px'}`;
      modal.appendChild(c);
    }
    SFX.unlock();
    setTimeout(()=>SFX.beep(110,.22,'square',.09),850); // 盖章闷响
  },
  badgeGo(){ SFX.click(); document.getElementById('badge-modal').classList.remove('show'); this.toWorld(); },
  resetAll(){ if(confirm('确定清空全部进度？')){ try{localStorage.removeItem('pmquest2');}catch(e){} location.reload(); } },

  show(id){ document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active')); document.getElementById(id).classList.add('active'); },

  toWorld(){ SFX.click(); this.show('world-screen'); },

  toMap(){
    SFX.click();
    this.show('map-screen');
    document.getElementById('map-prog').textContent=`主线进度 ${this.progress}/${LEVELS.length}`+(this.progress>=LEVELS.length?' · ★ 全部通关':'');
    document.getElementById('map-bar-fill').style.width=(this.progress/LEVELS.length*100)+'%';
    const city=document.getElementById('city');
    city.querySelectorAll('.bld').forEach(b=>b.remove());
    const curLv = Math.min(this.progress, LEVELS.length-1);
    const curBld = this.progress>=LEVELS.length ? 'hq' : (BUILDINGS.find(b=>b.levels&&b.levels.includes(LEVELS[curLv].id))||{}).id;
    BUILDINGS.forEach(b=>{
      const div=document.createElement('div');
      const states=(b.levels||[]).map(id=>{ const i=LEVELS.findIndex(l=>l.id===id); return i<this.progress?'done':i===this.progress?'current':'locked'; });
      const hasCurrent=states.includes('current');
      const allDone=b.levels&&states.every(s=>s==='done');
      div.className='bld'+(b.lock?' locked':'')+(hasCurrent?' here':'');
      div.style.left=b.x+'%'; div.style.top=b.y+'%';
      div.innerHTML=`<span class="bsign">${PQ.pxi(PQ.bicon[b.id]||"building",22,"#f2f4ff")}</span>
        <div class="roof" style="width:${b.w-18}px"></div>
        <div class="body" style="width:${b.w}px; height:${b.h}px; background-color:${b.color}"></div>
        <div class="bname">${b.name}</div>
        <div class="bstate">${b.lock?PQ.pxi('lock',10,'#dfe6f5'): b.archive?'支线': allDone?'✔': hasCurrent?'!任务':(b.levels?states.filter(s=>s==='done').length+'/'+b.levels.length:'')}</div>`;
      div.onclick=()=>G.openBuilding(b);
      city.appendChild(div);
    });
    // 玩家小人站在当前任务建筑旁
    const pb=BUILDINGS.find(b=>b.id===curBld)||BUILDINGS[0];
    const p=document.getElementById('city-player');
    drawSprite(p,'me');
    p.style.left=`calc(${pb.x}% + ${pb.w+10}px)`; p.style.top=`calc(${pb.y}% + ${pb.h-40}px)`;
    // 自动展示当前任务建筑的最新状态（修复：通关后面板显示旧的锁定状态）
    if(this.progress>=LEVELS.length){
      document.getElementById('bpanel').innerHTML='<div class="bp-title">★ 现有章节全部通关！</div><div class="bp-hint">新章节正在快马加鞭制作中。可重玩任意关卡刷新评级，或去产品档案馆读读案例。</div>';
    } else {
      const curB=BUILDINGS.find(b=>b.id===curBld);
      if(curB) this.openBuilding(curB);
    }
  },

  openBuilding(b){
    SFX.click();
    const panel=document.getElementById('bpanel');
    if(b.lock){
      panel.innerHTML=`<div class="bp-title">${PQ.pxi(PQ.bicon[b.id]||"building",16,"var(--accent)")} ${b.name}</div><div class="bp-hint">${PQ.pxi("lock",12,"#8fa7c9")} ${b.lock}<br>这座建筑将随完整版章节更新开放，星火市会越来越热闹。</div>`;
      return;
    }
    if(b.archive){ this.openArchive(); return; }
    let html=`<div class="bp-title">${PQ.pxi(PQ.bicon[b.id]||"building",16,"var(--accent)")} ${b.name}</div>`;
    let lastCh='';
    b.levels.forEach(id=>{
      const i=LEVELS.findIndex(l=>l.id===id), lv=LEVELS[i];
      if(lv.ch!==lastCh){ lastCh=lv.ch; html+=`<div class="bp-ch">▸ ${lv.ch}</div>`; }
      const st=i<this.progress?'done': i===this.progress?'current':'locked';
      const nQ=(lv.quiz||[]).length, nD=lv.script.filter(n=>n.choices).length;
      html+=`<div class="bp-lv"><span class="st">${st==='done'?'<span style="color:var(--green)">✔</span>': st==='current'?'<span style="color:var(--accent)">★</span>': PQ.pxi('lock',12,'#8fa7c9')}</span>
        <span class="nm">${lv.isBoss?'<span style="color:var(--accent)">★</span> ':''}${lv.name}<small>${lv.loc} · ${nD}个决策 · ${nQ}题检验${lv.note?' · 方法卡×1':''}</small></span>
        ${st!=='locked'?`<button class="pxbtn small" onclick="G.startLevel(${i})">${st==='done'?'重玩':'进入 ▶'}</button>`:''}
      </div>`;
    });
    panel.innerHTML=html;
  },

  /* ---------- 档案馆（支线） ---------- */
  openArchive(){
    SFX.click();
    const list=document.getElementById('arch-list'); list.innerHTML='';
    document.getElementById('case-detail').classList.remove('show');
    list.style.display='flex';
    CASES.forEach((c,i)=>{
      const d=document.createElement('div'); d.className='case-card';
      d.innerHTML=`<div class="ct">${c.title}</div><div class="cd">${c.desc}</div>`;
      d.onclick=()=>{ SFX.click();
        list.style.display='none';
        const det=document.getElementById('case-detail');
        det.innerHTML=c.body+`<div class="src">${c.src}</div>`;
        det.classList.add('show');
        document.getElementById('arch-back').textContent='← 返回案例列表';
      };
      list.appendChild(d);
    });
    document.getElementById('arch-back').textContent='关闭';
    document.getElementById('archive').classList.add('show');
  },
  archBack(){
    SFX.click();
    const det=document.getElementById('case-detail');
    if(det.classList.contains('show')){ det.classList.remove('show'); document.getElementById('arch-list').style.display='flex'; document.getElementById('arch-back').textContent='关闭'; }
    else document.getElementById('archive').classList.remove('show');
  },

  startLevel(i){
    SFX.click();
    this.lvIdx=i; this.nodeIdx=0; this.quizIdx=0;
    this.dScore=0; this.qOk=0;
    const lv=LEVELS[i];
    this._npcKey=lv.npc;
    this.dMax=lv.script.filter(n=>n.choices).length*2;
    this.qTotal=(lv.quiz||[]).length;
    document.getElementById('hud-loc').textContent=lv.ch+' — '+lv.name;
    document.getElementById('stage').className = lv.scene?('scene-'+lv.scene):'';
    const npc=document.getElementById('sp-npc'), me=document.getElementById('sp-me');
    // 入场动画：先移出屏幕，再滑入
    me.style.transition='none'; npc.style.transition='none';
    me.style.left='-20%'; npc.style.left='120%';
    drawSprite(me.querySelector('canvas'),'me');
    me.querySelector('.who').textContent=this.avatar.name;
    if(lv.solo){ npc.style.display='none'; }
    else{
      npc.style.display='block';
      drawSprite(npc.querySelector('canvas'), lv.npc);
      npc.querySelector('.who').textContent=lv.npcName;
    }
    this.updateTrust(0);
    this.show('play-screen');
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      me.style.transition=''; npc.style.transition='';
      me.style.left = lv.solo?'40%':'20%';
      if(!lv.solo) npc.style.left='60%';
    }));
    setTimeout(()=>this.playNode(), 500);
  },

  setTalking(who){ // who: 'me'|'npc'|null
    const lv=LEVELS[this.lvIdx];
    const meEl=document.getElementById('sp-me'), npcEl=document.getElementById('sp-npc');
    meEl.classList.remove('talking'); npcEl.classList.remove('talking');
    clearInterval(this.talkAnim);
    if(!who) return;
    const el = who==='me'?meEl:npcEl;
    const key = who==='me'?'me':(this._npcKey||lv.npc);
    el.classList.add('talking');
    let open=false;
    this.talkAnim=setInterval(()=>{
      open=!open;
      drawSprite(el.querySelector('canvas'), key, {mouthOpen:open});
    },170);
  },
  stopMouth(){
    clearInterval(this.talkAnim);
    const lv=LEVELS[this.lvIdx];
    drawSprite(document.getElementById('sp-me').querySelector('canvas'),'me');
    if(!lv.solo && (this._npcKey||lv.npc)) drawSprite(document.getElementById('sp-npc').querySelector('canvas'),this._npcKey||lv.npc);
  },
  blink(){
    if(!document.getElementById('play-screen').classList.contains('active'))return;
    const lv=LEVELS[this.lvIdx]; if(!lv)return;
    const targets=[['sp-me','me']]; const nk=this._npcKey||lv.npc; if(!lv.solo&&nk&&SPRITES[nk])targets.push(['sp-npc',nk]);
    targets.forEach(([id,key])=>{
      const el=document.getElementById(id);
      if(el.classList.contains('talking'))return;
      drawSprite(el.querySelector('canvas'),key,{blink:true});
      setTimeout(()=>{ if(!el.classList.contains('talking')) drawSprite(el.querySelector('canvas'),key); },140);
    });
  },
  emote(who, emo){
    const el=document.getElementById(who==='me'?'sp-me':'sp-npc');
    const e=el.querySelector('.emote');
    if(!emo){ e.classList.remove('show'); return; }
    e.innerHTML=PQ.pxi(PQ.emoteIcon[emo]||'idea',18,'#1a1c2c'); e.classList.add('show');
    setTimeout(()=>e.classList.remove('show'), 2200);
  },

  playNode(){
    const lv=LEVELS[this.lvIdx];
    if(this.nodeIdx>=lv.script.length){ this.startQuiz(); return; }
    const node=lv.script[this.nodeIdx];
    const sp=document.getElementById('speaker');
    const dtext=document.getElementById('dtext');
    document.getElementById('choices').innerHTML='';
    document.getElementById('next-hint').style.display='none';
    this.emote('me',null); this.emote('npc',null);

    if(node.card){ // 知识卡插页
      this.setTalking(null); this.stopMouth();
      sp.textContent='◆ 知识卡'; sp.style.background='linear-gradient(#7cc4ff,#4f9df0)'; sp.style.color='#0c1830';
      dtext.innerHTML=`<div class="kcard">${node.card}</div>`;
      SFX.unlock();
      const card=dtext.querySelector('.kcard');
      card.onclick=(e)=>{ e.stopPropagation(); this.nodeIdx++; this.playNode(); };
      return;
    }

    if(node.sp==='n'){ sp.textContent='◆ 旁白'; sp.style.background='linear-gradient(#7cc4ff,#4f9df0)'; sp.style.color='#0c1830'; this.setTalking(null); this.stopMouth(); }
    else if(node.sp==='me'){ sp.textContent=this.avatar.name; sp.style.background='linear-gradient(#ffd98f,#f0b95a)'; sp.style.color='#1a1c2c'; this.setTalking('me'); if(node.emo)this.emote('me',node.emo); }
    else{
      const lvv=LEVELS[this.lvIdx], key=node.sp;
      if(SPRITES[key] && key!==this._npcKey){ // 关卡内临时换角（如评审会上阿凯/小雨发言）
        this._npcKey=key;
        const npcEl2=document.getElementById('sp-npc');
        npcEl2.style.display='block';
        drawSprite(npcEl2.querySelector('canvas'), key);
      }
      const label=node.spName || (key===lvv.npc ? (lvv.npcName||'?') : key);
      document.getElementById('sp-npc').querySelector('.who').textContent=label;
      sp.textContent=label;
      sp.style.background='linear-gradient(#f08a9b,#e05a6d)'; sp.style.color='#fff'; this.setTalking('npc'); if(node.emo)this.emote('npc',node.emo); }

    if(node.term) this.unlock(node.term);
    this.typeText(node.t, ()=>{
      this.setTalking(null); this.stopMouth();
      if(node.choices) this.showChoices(node.choices);
      else document.getElementById('next-hint').style.display='block';
    });
  },

  typeText(text, done){
    text=String(text).replace(/\{name\}/g, (this.avatar&&this.avatar.name)||'你');
    const el=document.getElementById('dtext');
    el.textContent=''; this.typing=true;
    let i=0, tick=0;
    clearInterval(this.typeTimer);
    this.typeTimer=setInterval(()=>{
      el.textContent=text.slice(0,++i);
      if(++tick%3===0) SFX.type();
      if(i>=text.length){ clearInterval(this.typeTimer); this.typing=false; done&&done(); }
    },20);
    this._fullText=text; this._typeDone=done;
  },

  advance(){
    if(this.typing){
      clearInterval(this.typeTimer); this.typing=false;
      document.getElementById('dtext').textContent=this._fullText;
      this._typeDone&&this._typeDone(); return;
    }
    const node=LEVELS[this.lvIdx].script[this.nodeIdx];
    if(node && (node.choices||node.card)) return;
    SFX.click();
    this.nodeIdx++; this.playNode();
  },

  showChoices(choices){
    const box=document.getElementById('choices'); box.innerHTML='';
    choices=[...choices].sort(()=>Math.random()-.5); // 每次随机排列，防"背位置"
    choices.forEach((c,i)=>{
      const b=document.createElement('button'); b.className='pxbtn';
      b.innerHTML=`<span class="abc">${'ABC'[i]}</span><span>${c.t}</span>`;
      b.onclick=(e)=>{ e.stopPropagation(); this.pick(c); };
      box.appendChild(b);
    });
  },

  pick(c){
    document.getElementById('choices').innerHTML='';
    const card=document.getElementById('fb-card');
    const cls = c.s===2?'good': c.s===1?'mid':'bad';
    card.className=cls;
    document.getElementById('fb-title').textContent = c.s===2?'◎ 最优判断！': c.s===1?'◑ 可行，但不是最优':'✖ 翻车了！';
    document.getElementById('fb-text').textContent=c.fb;
    document.getElementById('fb-lesson').textContent=c.lesson||'';
    const btn=document.getElementById('fb-btn');
    const flash=document.getElementById('flash');
    if(c.s===2){ SFX.ok(); flash.className='good'; }
    else if(c.s===1){ SFX.mid(); this.updateTrust(-5); }
    else{ SFX.bad(); flash.className='bad'; document.getElementById('stage').classList.add('shake');
      document.getElementById('trust-heart').classList.add('hurt'); this.updateTrust(-15); }
    setTimeout(()=>{ flash.className=''; document.getElementById('stage').classList.remove('shake'); document.getElementById('trust-heart').classList.remove('hurt'); },600);

    this.dScore += c.s;
    const dead=this.trust<=0;
    if(c.s===0){
      btn.textContent=dead?'💀 信任崩塌…重新挑战本关':'⏪ 时光倒流，重新选择';
      btn.onclick=()=>{ SFX.click(); this.hideFb();
        if(dead){ this.trust=60; this.updateTrust(0); this.startLevel(this.lvIdx); }
        else{ this.dScore-=0; const node=LEVELS[this.lvIdx].script[this.nodeIdx]; this.showChoices(node.choices); }
      };
    }else{
      btn.textContent='继续 ▶';
      btn.onclick=()=>{ SFX.click(); this.hideFb(); if(c.term)this.unlock(c.term); this.nodeIdx++; this.playNode(); };
    }
    document.getElementById('feedback').classList.add('show');
  },
  hideFb(){ document.getElementById('feedback').classList.remove('show'); },

  /* ---------- 随堂检验 ---------- */
  startQuiz(){
    const lv=LEVELS[this.lvIdx];
    if(!lv.quiz||!lv.quiz.length){ this.endLevel(); return; }
    this.quizIdx=0;
    document.getElementById('quiz-panel').classList.add('show');
    this.showQuizQ();
  },
  showQuizQ(){
    const lv=LEVELS[this.lvIdx], q=lv.quiz[this.quizIdx];
    document.getElementById('quiz-idx').textContent=`第 ${this.quizIdx+1} / ${lv.quiz.length} 题`;
    document.getElementById('quiz-q').textContent=q.q;
    document.getElementById('quiz-exp').style.display='none';
    document.getElementById('quiz-next').style.display='none';
    const ops=document.getElementById('quiz-ops'); ops.innerHTML='';
    this._qmap=q.ops.map((_,i)=>i).sort(()=>Math.random()-.5); // 选项随机排列
    this._qmap.forEach((oi,i)=>{
      const b=document.createElement('button'); b.className='pxbtn';
      b.innerHTML=`<span class="abc" style="margin-right:10px">${'ABC'[i]}</span>${q.ops[oi]}`;
      b.onclick=()=>this.answerQuiz(oi,b);
      ops.appendChild(b);
    });
  },
  answerQuiz(i,btn){
    const lv=LEVELS[this.lvIdx], q=lv.quiz[this.quizIdx];
    const buttons=[...document.getElementById('quiz-ops').children];
    buttons.forEach(b=>b.onclick=null);
    buttons[this._qmap.indexOf(q.a)].classList.add('right');
    if(i===q.a){ this.qOk++; SFX.ok(); }
    else{ btn.classList.add('wrongpick'); SFX.bad(); }
    const exp=document.getElementById('quiz-exp');
    exp.textContent=(i===q.a?'✔ 正确！':'✘ 不对。')+' '+q.exp;
    exp.style.display='block';
    const nx=document.getElementById('quiz-next');
    nx.style.display='inline-block';
    nx.textContent=this.quizIdx+1<lv.quiz.length?'下一题 ▶':'查看通关结算 ▶';
    nx.onclick=()=>{ SFX.click();
      this.quizIdx++;
      if(this.quizIdx<lv.quiz.length) this.showQuizQ();
      else{ document.getElementById('quiz-panel').classList.remove('show'); this.endLevel(); }
    };
  },

  updateTrust(d){
    this.trust=Math.max(0,Math.min(100,this.trust+d));
    document.getElementById('trust-fill').style.width=this.trust+'%';
    document.getElementById('trust-num').textContent=this.trust;
    this.save();
  },

  unlock(key){
    if(this.unlocked.includes(key))return;
    this.unlocked.push(key); this.save(); this.renderDex();
    const t=TERMS[key]; if(!t)return;
    SFX.unlock();
    const toast=document.getElementById('toast');
    toast.innerHTML=`<span style="font-size:12.5px; letter-spacing:2px">◆ 术语解锁 ◆</span><br><b style="font-size:16px; display:inline-block; margin:3px 0 2px">${PQ.pxi("spark",14,"#eafff0")} ${t.name}</b><br><span style="font-size:11px;opacity:.85">已收入术语图鉴，可随时查看</span>`;
    toast.classList.add('show');
    setTimeout(()=>toast.classList.remove('show'),2600);
  },

  endLevel(){
    const lv=LEVELS[this.lvIdx];
    if(this.lvIdx===this.progress){ this.progress++; }
    if(lv.note && !this.notes.includes(lv.note)){ this.notes.push(lv.note); }
    this.save();
    const total=this.dMax + this.qTotal*2;
    const got=this.dScore + this.qOk*2;
    const pct=total?got/total:1;
    const rank = pct>=.95?'S': pct>=.8?'A': pct>=.6?'B':'C';
    const el=document.getElementById('end-rank');
    el.textContent=rank;
    el.style.color = rank==='S'?'#ffcd75': rank==='A'?'#4ad07a': rank==='B'?'#5cb9ff':'#e05a6d';
    document.getElementById('end-stats').innerHTML=
      `本关：<b>${lv.name}</b><br>剧情决策 <b>${this.dScore}/${this.dMax}</b> ｜ 随堂检验 <b>${this.qOk}/${this.qTotal}</b> ｜ 老板信任度 <b>${this.trust}</b>`+
      (lv.note?`<br>◆ 方法卡入手：<b>${NOTES[lv.note].title}</b>`:'');
    const et=document.getElementById('end-terms'); et.innerHTML='';
    this.unlocked.forEach(k=>{ const t=TERMS[k]; if(t){const s=document.createElement('span'); s.textContent='◆ '+t.name; et.appendChild(s);} });
    document.getElementById('end-tease').textContent =
      this.progress>=LEVELS.length ? '★ 现有章节全部通关！新章节持续更新中，敬请期待……'
      : (rank==='S'?'完美通关！':'可重玩本关刷新评级 · ')+'下一关已解锁 →';
    SFX.unlock();
    this.show('end-screen');
  },

  /* ---------- 图鉴 & 笔记 ---------- */
  renderDex(){
    const grid=document.getElementById('dex-grid'); grid.innerHTML='';
    const keys=Object.keys(TERMS);
    document.getElementById('dex-cnt').textContent=`已收集 ${this.unlocked.length} / ${keys.length}（完整版将收录 200+ 产品术语）`;
    keys.forEach(k=>{
      const t=TERMS[k], has=this.unlocked.includes(k);
      const card=document.createElement('div'); card.className='dex-card'+(has?'':' locked');
      card.innerHTML=`<div class="icon">${has?PQ.pxi("spark",22,"var(--accent)"):PQ.pxi("qmark",22,"#5b6b8c")}</div><div class="nm">${has?t.name:'？？？'}</div>`;
      if(has) card.onclick=()=>{ SFX.click();
        const d=document.getElementById('dex-detail');
        d.innerHTML=`<b style="color:var(--accent)">${PQ.pxi("spark",13,"var(--accent)")} ${t.name}</b><br>${t.def}<div class="src">${t.src}</div>`;
        d.classList.add('show');
      };
      grid.appendChild(card);
    });
  },
  openDex(){ SFX.click(); this.renderDex(); document.getElementById('dex').classList.add('show'); },
  openNotes(){ SFX.click();
    const list=document.getElementById('notes-list'); list.innerHTML='';
    const keys=Object.keys(NOTES);
    document.getElementById('notes-cnt').textContent=`已收集 ${this.notes.length} / ${keys.length} 张方法卡（通关关卡解锁）`;
    keys.forEach(k=>{
      const n=NOTES[k], has=this.notes.includes(k);
      const c=document.createElement('div'); c.className='note-card'+(has?'':' locked');
      c.innerHTML=has?`<div class="nh">${n.title}</div>${n.body}`:`<div class="nh">${PQ.pxi("lock",13,"#8fa7c9")} ${n.title}</div>通关对应关卡后解锁`;
      list.appendChild(c);
    });
    document.getElementById('notes').classList.add('show');
  },
  closeModal(id){ SFX.click(); document.getElementById(id).classList.remove('show'); const d=document.getElementById('dex-detail'); if(d)d.classList.remove('show'); },

  /* ---------- 存档导出/导入（无后端的进度迁移方案） ---------- */
  exportSave(){
    SFX.click();
    const raw = localStorage.getItem('pmquest2') ||
      JSON.stringify({trust:this.trust,unlocked:this.unlocked,notes:this.notes,progress:this.progress,avatar:this.avatar});
    const blob = new Blob([raw], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'PM大冒险-存档.json';
    a.click(); URL.revokeObjectURL(a.href);
  },
  importSave(){
    SFX.click();
    const inp = document.getElementById('save-file');
    inp.onchange = () => {
      const f = inp.files[0]; if(!f) return;
      const r = new FileReader();
      r.onload = () => {
        try{
          const d = JSON.parse(r.result);
          if(typeof d.progress !== 'number' || !Array.isArray(d.unlocked)) throw 0;
          localStorage.setItem('pmquest2', JSON.stringify(d));
          location.reload();
        }catch(e){ alert('存档文件无效，请选择由「导出存档」生成的 JSON 文件'); }
      };
      r.readAsText(f); inp.value='';
    };
    inp.click();
  },

  toggleMute(){ SFX.muted=!SFX.muted; document.getElementById('mute-btn').innerHTML=PQ.pxi(SFX.muted?'mute':'sound',15); }
};

document.getElementById('dialog').addEventListener('click',e=>{ if(e.target.closest('#choices')||e.target.closest('.kcard'))return; G.advance(); });
document.addEventListener('keydown',e=>{
  if(e.key===' '||e.key==='Enter'){
    if(document.getElementById('play-screen').classList.contains('active')
      && !document.getElementById('feedback').classList.contains('show')
      && !document.getElementById('quiz-panel').classList.contains('show')){ e.preventDefault(); G.advance(); }
  }
});
/* 桌面端沉浸缩放：整个游戏画布随窗口等比放大/缩小（字体、像素画同步） */
function fitGame(){
  const g=document.getElementById('game');
  if(window.innerWidth<=720){ g.style.zoom=''; return; } // 移动端走响应式布局
  const s=Math.min(window.innerWidth/1004, window.innerHeight/684);
  g.style.zoom=Math.max(.55, Math.min(s, 2.2)).toFixed(3);
}
window.addEventListener('resize', fitGame);
fitGame();
G.init();
