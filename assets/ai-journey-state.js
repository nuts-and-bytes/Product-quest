/* Presentation and progress adapters; authored dialogue remains in content/ai. */
(function(root){
 'use strict';
 const cast={
  jianwei:{name:'姜见微',role:'评测负责人',look:{style:'short',outfit:'shirt',hair:'#5d5270',cloth:'#786e96',pants:'#424e61',glasses:'gold',prop:'clipboard',brow:'sharp',faceType:'sharp',heightScale:1.0,idleStyle:'tablet'}},
  luchen:{name:'陆沉',role:'首席科学家',look:{style:'short',outfit:'hoodie',hair:'#2f3d4a',cloth:'#3d607a',pants:'#374659',glasses:'black',prop:'headset',faceType:'cool',heightScale:1.03,idleStyle:'nod'}},
  hechuan:{name:'贺川',role:'商务合伙人',look:{style:'slick',outfit:'suit',hair:'#593e30',cloth:'#486e6e',tie:'#cfa45c',pants:'#344954',glasses:'none',prop:'briefcase',faceType:'mature',pocketSquare:'#f0e5cf',heightScale:1.05,idleStyle:'calm'}},
  linyou:{name:'林柚',role:'交互设计师',look:{style:'beret',outfit:'sweater',hair:'#8f5c3e',cloth:'#d4b370',pants:'#5c7085',glasses:'none',prop:'sketchpad',faceType:'warm',beretColor:'#9e6b58',skirt:true,heightScale:0.98,idleStyle:'sketch'}}
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
