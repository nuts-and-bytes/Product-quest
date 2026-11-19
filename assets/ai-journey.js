/* Adapts the shared story engine to the current AI scripts without rewriting their choices. */
(function(){
 'use strict';const $=id=>document.getElementById(id),A=PQAI;
 const J={
  init(){
   const counts=document.querySelectorAll('.land-stat b');if(counts[0])counts[0].textContent=String((PQ.milestones?.length||8)+1+new Set(A.levels(PQ.levels).map(A.chapterId)).size).padStart(2,'0');if(counts[1])counts[1].textContent=String(PQ.levels.length);
   $('game').insertAdjacentHTML('beforeend','<dialog id="ai-route" aria-labelledby="ai-route-title"><header><div><span>STAR TIDE / 星潮观测站</span><h2 id="ai-route-title">AI 大陆 · 潮汐工坊</h2></div><button id="ai-route-close" aria-label="关闭章节目录">关闭</button></header><p id="ai-route-summary"></p><button id="ai-resume"></button><div id="ai-route-list"></div><button id="ai-route-world">返回群岛</button></dialog>');
   $('ai-route-close').onclick=()=>this.close();$('ai-route-world').onclick=()=>{this.close();G.toMap();};
   $('ai-route').addEventListener('keydown',e=>e.stopPropagation());
  },
  close(){if($('ai-route')?.open)$('ai-route').close();},
  open(){
   if(PQPropInspector.active)return;const rows=A.routes(PQ.levels,G),next=A.next(PQ.levels,G);if(!next)return;
   if(G.typing)G.advance();PQIsland.keys={};PQIsland.walkGoal=null;PQIsland.walkPath=[];PQIsland.joyVec={x:0,z:0};
   $('ai-route-summary').textContent=`${new Set(rows.map(r=>A.chapterId(r.level))).size} 个章节 · ${rows.filter(r=>r.complete).length} / ${rows.length} 关已完成`;
   $('ai-resume').textContent=(rows.every(r=>r.complete)?'重温最后一关 · ':'继续旅程 · ')+next.name;$('ai-resume').onclick=()=>this.start(next.id);
   const list=$('ai-route-list');list.replaceChildren();let chapter='';
   for(const row of rows){if(A.chapterId(row.level)!==chapter){chapter=A.chapterId(row.level);const h=document.createElement('h3');h.textContent=row.level.ch;list.append(h);}const b=document.createElement('button');b.dataset.level=row.level.id;b.disabled=!row.available;b.textContent=(row.complete?'✓ ':row.available?'→ ':'🔒 ')+row.level.name;const small=document.createElement('small');small.textContent=row.complete?'已完成 · '+(G.stats?.[row.level.id]?.rank||'可重温'):row.available?row.level.loc:'完成上一关后开启';b.append(small);b.onclick=()=>this.start(row.level.id);list.append(b);}
   if(!$('ai-route').open)$('ai-route').showModal();$('ai-resume').focus();
  },
  start(id){const row=A.routes(PQ.levels,G).find(r=>r.level.id===id);if(!row?.available)return false;this.close();G.startLevel(id);return true;},
  prepare(l){
   this.close();if(!A.isLevel(l)){PQStory3D.scriptCast=null;return;}
   const r=PQStory3D,keys=[...new Set([l.npc,...l.script.map(n=>n.sp).filter(k=>k&&k!=='me'&&k!=='n')])];
   keys.forEach(k=>r.ensureNpc(k));r.scriptCast=keys;r.scriptMain=l.npc;r.scriptSpeaker=l.npc;r.focus('n');
  },
  node(l,n){
   if(!A.isLevel(l))return;const dialog=$('dialog');dialog.scrollTop=0;
   const next=$('ai-story-next');if(next){next.hidden=!!n.card;next.textContent=n.choices?'读完这段，作出选择':'继续 →';}
  },
  ready(n){const b=$('ai-story-next');if(b){b.hidden=!!n.choices||!!n.card;b.textContent='继续 →';}},
  cleanCard(html){
   const t=document.createElement('template');t.innerHTML=html;const allowed=new Set(['DIV','P','SPAN','B','STRONG','I','EM','CODE','BR','TABLE','THEAD','TBODY','TR','TH','TD','UL','OL','LI']);
   for(const el of [...t.content.querySelectorAll('*')]){if(['SCRIPT','STYLE','IFRAME','OBJECT'].includes(el.tagName)){el.remove();continue;}if(!allowed.has(el.tagName)){el.replaceWith(...el.childNodes);continue;}const cls=el.classList.contains('kh')?'kh':el.classList.contains('src')?'src':'';for(const a of [...el.attributes])el.removeAttribute(a.name);if(cls)el.className=cls;}return t.content;
  },
  card(l,n){
   if(!A.isLevel(l)||!n.card)return false;
   const fragment=this.cleanCard(n.card),title=fragment.querySelector('.kh')?.textContent.replace(/^◆\s*知识卡\s*[·：]?\s*/,'')||'随身方法卡';
   const text=fragment.cloneNode(true);for(const br of text.querySelectorAll('br'))br.replaceWith('\n');for(const row of text.querySelectorAll('tr')){for(const cell of row.children)cell.append(' ｜ ');row.append('\n');}const lines=text.textContent.split('\n').map(s=>s.trim()).filter(Boolean),level=l.id,index=G.nodeIdx;
   const current=()=>PQ.levels[G.lvIdx]?.id===level&&G.nodeIdx===index;
   const proceed=()=>{if(current()){G.nodeIdx++;G.playNode();}};
   const inspect=()=>{if(!current())return;PQPropInspector.open({type:'book',title,source:l.loc,front:lines,back:['这张方法卡来自：'+l.ch,'放回后继续当前对话，可以继续听听大家的想法，再作出自己的选择。'],renderReading:(copy,side)=>{if(side==='front')copy.append(this.cleanCard(n.card));else for(const line of PQPropInspector.lines(side)){const p=document.createElement('p');p.textContent=line;copy.append(p);}},actions:[{label:'收好，继续对话 →',run:proceed}]});};
   $('speaker').textContent='随身方法卡';$('dtext').replaceChildren();const h=document.createElement('h3');h.textContent=title;$('dtext').append(h);const choices=$('choices');choices.replaceChildren();
   for(const [label,action]of [['拿起方法卡 · 全屏检视',inspect],['收好，继续 →',proceed]]){const b=document.createElement('button');b.className='pxbtn';b.textContent=label;b.onclick=e=>{e.stopPropagation();action();};choices.append(b);}inspect();return true;
  },
  screen(id){
   const on=['play-screen','end-screen'].includes(id)&&A.isLevel(PQ.levels[G.lvIdx]);$('game').classList.toggle('ai-story-mode',on);
   let b=$('ai-story-next');if(!b){b=document.createElement('button');b.id='ai-story-next';b.textContent='继续 →';b.onclick=e=>{e.stopPropagation();G.advance();};$('dialog').append(b);}b.hidden=!on;
   const menu=$('hud').querySelector('button');menu.textContent=on?'≡ 章节':'≡ 地图';menu.onclick=()=>on?this.open():G.toMap();
   $('ai-end-route')?.remove();
  },
  end(l){
   if(!A.isLevel(l))return;const rows=A.routes(PQ.levels,G),i=rows.findIndex(r=>r.level.id===l.id),next=rows[i+1],button=document.querySelector('#end-screen>button');
   button.textContent=next?'继续 · '+next.level.name:'返回 AI 章节';button.onclick=()=>next?this.start(next.level.id):this.open();
   $('end-tease').textContent=next?'下一段故事已经开启，也可以先回岛上走走。':'当前 AI 大陆章节已完成，新的故事会接着到来。';
   const menu=document.createElement('button');menu.id='ai-end-route';menu.textContent='章节目录 / 返回群岛';menu.onclick=()=>this.open();$('end-screen').append(menu);
  }
 };window.PQAIJourney=J;
})();
