/* The night market is an input log, not a saved score. Replaying reconstructs orders,
   stock, money and the exact paused shift; imported results are never trusted. */
(function(root){
  'use strict';
  const stations=['order','brew','pickup'],drinks={tea:'桂花茶',coffee:'海盐咖啡'};
  const guests=[
    {id:'achen',name:'阿晨',rig:'citizen2',drink:'tea',at:0,budget:9,patience:650,stroll:true,line:'今天不赶车。我想在海边坐着喝。'},
    {id:'rider',name:'下班的阿凯',rig:'akai',drink:'coffee',at:180,budget:9,patience:350,stroll:false,line:'还要去修那盏路灯，能带走吗？'},
    {id:'neighbor',name:'散步的邻居',rig:'citizen3',drink:'tea',at:350,budget:6,patience:500,stroll:true,line:'我只带了六块零钱。'},
    {id:'reader',name:'小雨',rig:'xiaoyu',drink:'coffee',at:540,budget:9,patience:480,stroll:true,line:'看完这页，就轮到我了吧？'},
    {id:'walker',name:'海边的游客',rig:'citizen4',drink:'tea',at:750,budget:9,patience:400,stroll:true,line:'点单和取餐，是同一个地方吗？'},
    {id:'late',name:'刚下班的邻居',rig:'citizen5',drink:'coffee',at:930,budget:6,patience:260,stroll:false,line:'一杯咖啡，路上喝。'},
    {id:'li',name:'李姐',rig:'lijie',drink:'coffee',at:0,budget:9,patience:550,stroll:true,line:'今天我是来买咖啡的。先不用给我讲项目。'},
    {id:'student',name:'背书包的邻居',rig:'citizen3',drink:'tea',at:150,budget:6,patience:430,stroll:true,line:'和朋友约在这儿，我想慢慢等。'},
    {id:'engineer',name:'阿凯',rig:'akai',drink:'tea',at:330,budget:9,patience:280,stroll:false,line:'灯修好了。给同事带一杯。'},
    {id:'couple',name:'散步的游客',rig:'citizen4',drink:'coffee',at:510,budget:9,patience:480,stroll:true,line:'这里有能歇脚的地方吗？'},
    {id:'xiaoyu',name:'小雨',rig:'xiaoyu',drink:'tea',at:730,budget:6,patience:420,stroll:true,line:'写完了。给我一杯茶就好。'},
    {id:'last',name:'收摊的邻居',rig:'citizen5',drink:'coffee',at:900,budget:9,patience:290,stroll:false,line:'收摊前，还来得及吗？'}
  ];
  const clone=o=>JSON.parse(JSON.stringify(o));
  function fresh(){return {phase:'arrival',intro:false,plan:{layout:['order','brew','pickup'],space:'bench',sign:true,price:6,stock:12},wave:0,time:0,tutorial:false,stock:0,cash:60,cost:0,revenue:0,orders:[],brew:null,cup:null,talks:[],discarded:0,changed:false};}
  function cost(p){return 8+p.stock*2+(p.sign?4:0)+(p.space==='bench'?8:4);}
  function duration(p){return (p.space==='shelf'?35:55)+15*(Math.abs(p.layout.indexOf('order')-p.layout.indexOf('brew'))+Math.abs(p.layout.indexOf('brew')-p.layout.indexOf('pickup')));}
  function arrive(r){guests.slice((r.wave-1)*6,r.wave*6).forEach(g=>{if(g.at<=r.time&&!r.orders.some(o=>o.id===g.id))r.orders.push({id:g.id,status:g.budget<r.plan.price?'declined':'waiting',at:r.time,deadline:r.time+g.patience+(r.plan.sign?100:0)+(g.stroll&&r.plan.space==='bench'?200:0),price:r.plan.price,done:null});});}
  function endWave(r){for(const o of r.orders)if(['waiting','accepted'].includes(o.status))o.status='left';if(r.brew||r.cup)r.discarded++;r.brew=null;r.cup=null;r.phase=r.wave===1?'break':'closing';}
  function tick(r,n){
    for(let i=0;i<n&&r.phase==='service';i++){
      if(r.brew&&--r.brew.remaining<=0){r.cup=r.brew.drink;r.brew=null;}
      if(!r.tutorial)continue;
      r.time++;arrive(r);
      for(const o of r.orders)if(['waiting','accepted'].includes(o.status)&&r.time>=o.deadline){o.status='left';o.done=r.time;}
      if(r.time>=1200)endWave(r);
    }
  }
  function reduce(r,type,value){
    if(type==='intro'&&!r.intro){r.intro=true;return true;}
    if(type==='talk'&&['xiaomei','achen','li'].includes(value)&&!r.talks.includes(value)){r.talks.push(value);return true;}
    if(type==='setup'&&r.phase==='arrival'){r.phase='setup';return true;}
    if(type==='plan'&&['setup','break'].includes(r.phase)&&value&&typeof value==='object'){
      const {key,val}=value,p=clone(r.plan);
      if(key==='layout'&&Array.isArray(val)&&val.length===3&&stations.every(s=>val.includes(s)))p.layout=val.slice();
      else if(key==='space'&&['bench','shelf'].includes(val))p.space=val;
      else if(key==='sign'&&typeof val==='boolean')p.sign=val;
      else if(key==='price'&&[6,9].includes(val))p.price=val;
      else if(key==='stock'&&r.phase==='setup'&&[8,12,16].includes(val))p.stock=val;
      else return false;
      if(JSON.stringify(p)===JSON.stringify(r.plan))return false;
      const extra=r.phase==='break'?(p.sign&&!r.plan.sign?4:0)+(p.space!==r.plan.space?4:0):0;
      if(cost(p)>60&&r.phase==='setup'||extra>r.cash)return false;
      r.plan=p;r.cash-=extra;r.cost+=extra;if(r.phase==='break')r.changed=true;return true;
    }
    if(type==='restock'&&r.phase==='break'&&r.cash>=12&&r.stock<=18){r.stock+=6;r.cash-=12;r.cost+=12;r.changed=true;return true;}
    if(type==='open'&&['setup','break'].includes(r.phase)){
      if(r.phase==='setup'){const c=cost(r.plan);if(c>60)return false;r.cost=c;r.cash=60-c;r.stock=r.plan.stock;r.wave=1;}else r.wave=2;
      r.time=0;r.phase='service';arrive(r);return true;
    }
    if(type==='wait'&&r.phase==='service'&&Number.isInteger(value)&&value>0&&value<=1200){tick(r,value);return true;}
    if(type==='accept'&&r.phase==='service'){
      const o=r.orders.find(o=>o.id===value);if(!o||o.status!=='waiting')return false;o.status='accepted';return true;
    }
    if(type==='brew'&&r.phase==='service'&&Object.hasOwn(drinks,value)&&r.stock>0&&!r.brew&&!r.cup&&r.orders.some(o=>o.status==='accepted')){
      r.stock--;r.brew={drink:value,remaining:duration(r.plan),total:duration(r.plan)};return true;
    }
    if(type==='serve'&&r.phase==='service'){
      const o=r.orders.find(o=>o.id===value),g=guests.find(g=>g.id===value);
      if(!o||o.status!=='accepted'||r.cup!==g.drink)return false;
      o.status='served';o.done=r.time;r.cash+=o.price;r.revenue+=o.price;r.cup=null;if(!r.tutorial)r.tutorial=true;return true;
    }
    if(type==='discard'&&r.phase==='service'&&(r.cup||r.brew)){r.cup=null;r.brew=null;r.discarded++;return true;}
    if(type==='end'&&r.phase==='service'){r.tutorial=true;endWave(r);return true;}
    if(type==='complete'&&r.phase==='closing'){r.phase='complete';return true;}
    return false;
  }
  function replay(log){const run=fresh(),out=[];for(const e of Array.isArray(log)?log.slice(0,4096):[]){if(!Array.isArray(e)||e.length>2||typeof e[0]!=='string')continue;const v=e[1]===undefined?null:clone(e[1]);if(e[0]==='plan'&&out.length>=800)continue;if(reduce(run,e[0],v))out.push([e[0],v]);}return {run,log:out};}
  function normalize(raw){
    const current=replay(raw?.log),legacy=replay(raw?.legacy?.log);
    return {v:1,...current,legacy:legacy.run.phase==='complete'?{...legacy,revision:Math.min(99,Math.max(1,Math.floor(Number(raw.legacy.revision)||1)))}:null};
  }
  function pack(s){return {v:1,log:s?.log||[],legacy:s?.legacy?{log:s.legacy.log,revision:s.legacy.revision}:null};}
  function act(s,type,value=null){
    if(s.log.length>=800&&type==='plan')return false;
    if(!reduce(s.run,type,value))return false;
    const last=s.log.at(-1);
    if(type==='wait'&&last?.[0]==='wait'&&last[1]+value<=1200)last[1]+=value;else s.log.push([type,clone(value)]);
    return true;
  }
  function commit(s){if(s.run.phase!=='complete')return false;if(s.legacy&&JSON.stringify(s.legacy.log)===JSON.stringify(s.log))return false;s.legacy={...replay(clone(s.log)),revision:Math.min(99,(s.legacy?.revision||0)+1)};return true;}
  function restart(s){s.run=fresh();s.log=[];}
  function result(run){
    const served=run.orders.filter(o=>o.status==='served'),left=run.orders.filter(o=>o.status==='left'),declined=run.orders.filter(o=>o.status==='declined');
    return {served:served.length,missed:left.length,declined:declined.length,revenue:run.revenue,cost:run.cost,profit:run.revenue-run.cost,stock:run.stock,discarded:run.discarded,achen:served.some(o=>o.id==='achen'),li:served.some(o=>o.id==='li'),space:run.plan.space,sign:run.plan.sign,price:run.plan.price,
      title:run.plan.space==='bench'?'一处可以坐下的海边角落':'一条能顺路带走的取餐线',
      line:run.plan.space==='bench'?'长凳留在咖啡馆旁。有人愿意多坐一会儿，也有人依然只想带走。':'取餐架留在咖啡馆旁。赶路的人可以顺手带走，想歇脚的人仍在找座位。'};
  }
  function nextWait(r){if(r.phase!=='service'||!r.tutorial||r.brew||r.cup||r.orders.some(o=>['waiting','accepted'].includes(o.status)))return 0;const next=guests.slice((r.wave-1)*6,r.wave*6).find(g=>g.at>r.time);return (next?next.at:1200)-r.time;}
  root.PQNightMarketModel={guests,drinks,stations,fresh,cost,duration,normalize,pack,act,commit,restart,result,nextWait};
})(typeof window==='undefined'?globalThis:window);
