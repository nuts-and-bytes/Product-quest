/* Presentation and progress adapters; authored dialogue remains in content/ai. */
(function(root){
 'use strict';
 const cast={
  jianwei:{name:'姜见微',role:'评测负责人',look:{style:'short',outfit:'shirt',hair:'#8776ab',cloth:'#8f83b4',pants:'#48576e',glasses:'none',prop:'laptop',brow:'sharp'}},
  luchen:{name:'陆沉',role:'首席科学家',look:{style:'short',outfit:'hoodie',hair:'#354653',cloth:'#3b6483',pants:'#42546b',glasses:'black',prop:'headset'}},
  hechuan:{name:'贺川',role:'商务合伙人',look:{style:'slick',outfit:'suit',hair:'#714e3b',cloth:'#618c8b',tie:'#dfb66d',pants:'#425d69',glasses:'none',prop:'none'}},
  linyou:{name:'林柚',role:'交互设计师',look:{style:'curly',outfit:'sweater',hair:'#b37954',cloth:'#e3c585',pants:'#718c9e',glasses:'none',prop:'laptop'}}
 };
 const isLevel=l=>!!l&&/^ai\d+_/.test(l.id);
 const chapterId=l=>l.id.match(/^ai(\d+)_/)?.[1];
 const levels=all=>all.filter(isLevel);
 const complete=(all,s,l)=>!!s.stats?.[l.id]||all.indexOf(l)<(Number(s.progress)||0);
 function routes(all,s={}){const rows=levels(all);return rows.map((l,i)=>({level:l,complete:complete(all,s,l),available:i===0||complete(all,s,rows[i-1])||complete(all,s,l)}));}
 function next(all,s){const rows=routes(all,s);return rows.find(r=>r.available&&!r.complete)?.level||rows.at(-1)?.level;}
 function room(l){if(!isLevel(l))return null;if(l.loc?.includes('露台'))return'ai-roof';if(l.scene==='tea')return'ai-tea';if(l.scene==='ops')return'ai-ops';if(l.loc?.includes('评测'))return'ai-eval';if(l.loc?.includes('算力'))return'ai-lab';return'ai-workshop';}
 function speaker(l,n){const key=n.sp;if(n.spName)return n.spName;if(key===l.npc&&l.npcName)return l.npcName;if(cast[key])return cast[key].name+' · '+cast[key].role;if(key==='xiaomei')return'夏青';return key||'旁白';}
 const plain=s=>String(s??'').replace(/<\/?(?:b|strong|i|em)>/gi,'').replace(/\*\*([^*]+)\*\*/g,'$1');
 const api={cast,isLevel,chapterId,levels,routes,next,room,speaker,plain};root.PQAI=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
