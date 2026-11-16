/* A bounded, deterministic service simulation. No chapter scores or wall-clock deadlines. */
(function(root){
  'use strict';
  const LIMIT=8,BUDGET=6;
  const scenarios=[
    {name:'失踪的第二杯咖啡',day:'周三 · 早高峰',subtitle:'熟客阿晨又空着手走了。',prep:1.05,pickup:3.1,spacing:1.2,pressure:1,
      owner:'店长望着门口：“明明是老顾客，又空着手走了。要不做个预点单 App？你愿意帮我看看吗？”',
      goal:'让赶时间的熟客拿到咖啡，也让店员忙得过来。',root:'pickup'},
    {name:'周末的长队',day:'周六 · 手冲日',subtitle:'菜单换了，队伍又变长了。',prep:2.4,pickup:.55,spacing:1.15,pressure:1.15,
      owner:'店长已经标清了取餐点，又指向新菜单：“这周开始做手冲，队伍却更长了。我们沿用原来的办法，还是重新看看？”',
      goal:'应对手冲日的新瓶颈，保留顾客选择，也控制员工负担。',root:'prep'}
  ];
  const plans={
    signs:{name:'把取餐点说清楚',short:'取餐牌',cost:1,desc:'号码牌 + 独立取餐区。减少出杯后的辨认；不能加快制作。'},
    preorder:{name:'试一张预点单表',short:'预点单',cost:3,desc:'让部分熟客提前下单。省下点单时间，但要核单，也可能提前挤占制作。'},
    helper:{name:'高峰借一位伙伴',short:'双人制作',cost:4,desc:'增加一个制作位置。成本较高，取餐和点单的问题仍需观察。'},
    menu:{name:'快取菜单试一天',short:'快取菜单',cost:2,desc:'集中制作两款饮品。出杯更快，但两位想喝特调的顾客可能离开。'}
  };
  const hypotheses={pickup:'咖啡做好了，却没有顺利交到顾客手上',prep:'制作速度跟不上到店的人数',order:'点单本身占用了太多时间',unknown:'证据还不够，先做一个可撤回的小试验'};
  const unknowns={sample:'还不知道其他时段是否一样',adoption:'还不知道熟客会不会真的用预点单',load:'还不知道忙起来店员能否承受',preference:'还不知道简化菜单会让谁失望'};
  const actions={
    observe:{name:'观察一次早高峰',type:'现场观察',focus:'door',desc:'看见顾客从进门到离开的过程。'},
    orders:{name:'翻看十张订单',type:'记录',focus:'counter',desc:'比较点单、出杯和取走的时间。'},
    recent:{name:'问阿晨上次怎么走的',type:'近期行为',focus:'guest',desc:'从最近一次真实经历问起。'},
    opinion:{name:'问阿晨想不想要 App',type:'态度',focus:'guest',desc:'听听他的期待；期待不等于实际采用。'},
    staff:{name:'请店员带你走一遍',type:'工作过程',focus:'counter',desc:'看看忙碌时被忽略的那一步。'}
  };
  const phases=['intro','investigate','plan','result','review','complete'];
  const uniq=(xs,keys,max=20)=>[...new Set((Array.isArray(xs)?xs:[]).filter(x=>Object.hasOwn(keys,x)))].slice(0,max);
  const round=n=>Math.round(n*10)/10;
  function cost(ids){return uniq(ids,plans).reduce((n,k)=>n+plans[k].cost,0);}
  function simulate(scenario=0,ids=[]){
    const cfg=scenarios[scenario===1?1:0],p=new Set(uniq(ids,plans)),servers=p.has('helper')?[0,0]:[0],orders=[];
    let cashier=0,busy=0;
    for(let i=0;i<10;i++){
      const arrival=round(i*cfg.spacing+(i%3===0?.15:0)),menuMiss=p.has('menu')&&(i===3||i===8),advance=p.has('preorder')&&i%2===0&&!menuMiss;
      const start=Math.max(arrival-(advance?1.1:0),cashier),ordered=start+(advance?.12:.38);
      cashier=ordered;
      const idx=servers.indexOf(Math.min(...servers)),prepStart=Math.max(ordered,servers[idx]);
      const duration=menuMiss?0:cfg.prep*(p.has('menu')?.6:1)*(1+(i%3)*.06);
      const ready=menuMiss?ordered:prepStart+duration,pickupDelay=p.has('signs')?.3:cfg.pickup;
      const pickup=menuMiss?ordered:Math.max(arrival,ready)+pickupDelay+(p.has('preorder')?.15:0);
      const patience=i%3===0?3.2:6.1;
      const served=pickup-arrival<=patience&&!menuMiss;
      const leave=menuMiss?arrival+.5:served?pickup:arrival+patience;
      if(!menuMiss)servers[idx]=ready;busy+=duration;
      orders.push({id:i+1,arrival:round(arrival),ordered:round(ordered),prepStart:round(menuMiss?ordered:prepStart),ready:round(ready),pickup:round(pickup),leave:round(leave),wait:round(leave-arrival),served,menuMiss,advance});
    }
    const horizon=Math.max(...orders.map(o=>o.ready)),util=busy/(horizon*servers.length);
    const workload=Math.min(100,Math.round(util*76*cfg.pressure+(p.has('preorder')?18:0)+(p.has('signs')?0:12)));
    return {orders,served:orders.filter(o=>o.served).length,wait:round(orders.reduce((n,o)=>n+o.wait,0)/10),workload,cost:cost(ids),end:Math.max(...orders.map(o=>o.leave))+1,
      prep:round(orders.reduce((n,o)=>n+o.ready-o.ordered,0)/10),pickup:round(orders.reduce((n,o)=>n+o.pickup-Math.max(o.arrival,o.ready),0)/10)};
  }
  function evidence(scenario,id){
    const cfg=scenarios[scenario===1?1:0],b=simulate(scenario),item=actions[id];if(!item)return null;
    const morning=scenario!==1;
    const texts={
      observe:morning?'你看见三只杯子留在吧台。阿晨又看了一眼门外，没拿咖啡就走了。出杯和拿到手，并不是同一个时刻。':'取餐牌清清楚楚，顾客拿到杯子就走。更多人还在等店员完成手冲。',
      orders:`十张连续订单：点单到出杯平均 ${b.prep} 分钟。成功取走的订单中，出杯后还等了约 ${b.pickup} 分钟。这里只覆盖${cfg.day}，不是一整周。`,
      recent:morning?'阿晨：“上次我等了三分多钟。台上有杯咖啡，但我没听清是谁的。公交快来了，我就先走了。不是每次都这样。”':'阿晨：“今天我看得见取餐牌。店员还在冲上一单，下一班车快到了，我就没等。这次是没做完。”',
      opinion:'阿晨：“App？听起来方便，我应该会用吧。”他还没有真正下过预订单。这是一份意愿，不是采用记录。',
      staff:morning?'店员：“机器来得及。我忙着接下一单，喊名字的声音被磨豆机盖住。顾客问杯子是谁的，我又得停下来找。”':'店员：“两个人都在手冲就能快些。现在只有一个制作位，单杯要两分多钟。改成快取菜单会省事，但有人专程来喝特调。”'
    };
    return {id,title:item.name,type:item.type,text:texts[id],supports:id==='opinion'?'unknown':cfg.root};
  }
  function fresh(scenario=0,legacy=null){return {version:1,scenario:scenario===1?1:0,phase:'intro',actions:[],hypothesis:null,pins:[],unknown:null,plan:[],trials:[],selected:0,reflection:null,legacy};}
  function normalTrial(t,scenario){
    if(!t||!Array.isArray(t.plan))return null;
    const plan=uniq(t.plan,plans);if(!plan.length||cost(plan)>BUDGET)return null;
    const seen=uniq(t.seen,actions),pins=uniq(t.pins,actions,3).filter(id=>seen.includes(id));
    return {plan,seen,pins,hypothesis:Object.hasOwn(hypotheses,t.hypothesis)?t.hypothesis:'unknown',unknown:Object.hasOwn(unknowns,t.unknown)?t.unknown:'sample'};
  }
  function normalize(raw){
    if(!raw||raw.version!==1)return fresh();
    const s=fresh(raw.scenario);
    s.phase=phases.includes(raw.phase)?raw.phase:'intro';s.actions=uniq(raw.actions,actions);
    s.hypothesis=Object.hasOwn(hypotheses,raw.hypothesis)?raw.hypothesis:null;
    s.pins=uniq(raw.pins,actions,3).filter(id=>s.actions.includes(id));s.unknown=Object.hasOwn(unknowns,raw.unknown)?raw.unknown:null;
    s.plan=uniq(raw.plan,plans);if(cost(s.plan)>BUDGET)s.plan=[];
    s.trials=(Array.isArray(raw.trials)?raw.trials:[]).slice(0,LIMIT/2).map(t=>normalTrial(t,s.scenario)).filter(Boolean);
    // Imported snapshots cannot create extra actions or results outside the budget.
    while(s.actions.length+s.trials.length*2>LIMIT)s.trials.pop();
    s.trials=s.trials.map(t=>({...t,seen:t.seen.filter(id=>s.actions.includes(id)),pins:t.pins.filter(id=>s.actions.includes(id))}));
    s.selected=Math.min(s.trials.length-1,Math.max(0,Number.isInteger(raw.selected)?raw.selected:0));
    s.reflection=['keep','change','uncertain'].includes(raw.reflection)?raw.reflection:null;
    const leg=raw.legacy;
    if(leg&&[0,1].includes(leg.scenario)){const t=normalTrial(leg.trial,leg.scenario);if(t)s.legacy={scenario:leg.scenario,trial:t};}
    if(['result','review','complete'].includes(s.phase)&&!s.trials.length)s.phase='investigate';
    if(s.phase==='complete'&&!s.reflection)s.phase='review';
    return s;
  }
  const remaining=s=>LIMIT-s.actions.length-s.trials.length*2;
  function advance(state,event,value){
    const s=normalize(state),n=JSON.parse(JSON.stringify(s));
    if(event==='start'&&s.phase==='intro')n.phase='investigate';
    else if(event==='observe'&&['investigate','plan'].includes(s.phase)&&Object.hasOwn(actions,value)&&!s.actions.includes(value)&&remaining(s)>2){n.actions.push(value);n.phase='investigate';}
    else if(event==='plan'&&['investigate','result'].includes(s.phase)&&remaining(s)>=2)n.phase='plan';
    else if(event==='investigate'&&['plan','result'].includes(s.phase))n.phase='investigate';
    else if(event==='hypothesis'&&s.phase==='plan'&&Object.hasOwn(hypotheses,value))n.hypothesis=value;
    else if(event==='unknown'&&s.phase==='plan'&&Object.hasOwn(unknowns,value))n.unknown=value;
    else if(event==='pin'&&['investigate','plan'].includes(s.phase)&&s.actions.includes(value)){
      if(n.pins.includes(value))n.pins=n.pins.filter(x=>x!==value);else if(n.pins.length<3)n.pins.push(value);
    }else if(event==='toggle'&&s.phase==='plan'&&Object.hasOwn(plans,value)){
      if(n.plan.includes(value))n.plan=n.plan.filter(x=>x!==value);else if(cost([...n.plan,value])<=BUDGET)n.plan.push(value);
    }else if(event==='trial'&&s.phase==='plan'&&remaining(s)>=2&&s.plan.length&&s.hypothesis&&s.unknown){
      n.trials.push({plan:[...s.plan],hypothesis:s.hypothesis,unknown:s.unknown,pins:[...s.pins],seen:[...s.actions]});n.selected=n.trials.length-1;n.phase='result';
    }else if(event==='select'&&['result','review'].includes(s.phase)&&Number.isInteger(value)&&s.trials[value])n.selected=value;
    else if(event==='review'&&['result','investigate','plan'].includes(s.phase)&&s.trials.length)n.phase='review';
    else if(event==='reflect'&&s.phase==='review'&&['keep','change','uncertain'].includes(value))n.reflection=value;
    else if(event==='finish'&&s.phase==='review'&&s.reflection&&s.trials[s.selected]){n.phase='complete';n.legacy={scenario:s.scenario,trial:s.trials[s.selected]};}
    else if(event==='next'&&s.phase==='complete')return fresh(s.scenario===0?1:0,s.legacy);
    return n;
  }
  function review(s,index=s.selected){
    const t=s.trials[index];if(!t)return null;
    const cfg=scenarios[s.scenario],before=simulate(s.scenario),after=simulate(s.scenario,t.plan);
    const support=t.pins.filter(id=>evidence(s.scenario,id).supports===t.hypothesis);
    const process=t.hypothesis==='unknown'?'你明确保留了不确定性。这次试验可以提供信息，但还不能说明其他时段也一样。':support.length?`你的判断引用了 ${support.length} 份相关证据。还要检查样本覆盖和其他解释。`:'当时圈出的材料还不能支持这个判断。可以继续收集，也可以用小试验区分不同解释。';
    const effect=after.served>before.served?`这次多了 ${after.served-before.served} 位顾客顺利拿到咖啡。`:after.served===before.served?'顺利拿到咖啡的人数没有变化。':'这次拿到咖啡的人反而更少，需要看是哪一步出了问题。';
    const trade=t.plan.includes('menu')?'快取菜单缩短了制作，但两位特调爱好者没有留下。':t.plan.includes('preorder')?'预点单省下部分点单时间，也增加核单工作；制作和取餐仍要分别看。':t.plan.includes('helper')?'多一个制作位有成本。是否值得保留，要看新增加的顾客和员工负担。':'取餐牌成本低，但无法解决制作产能不足。换了菜单，需要重新观察。';
    return {before,after,process,effect,trade,root:cfg.root};
  }
  root.PQCafeModel={LIMIT,BUDGET,scenarios,plans,hypotheses,unknowns,actions,fresh,normalize,remaining,advance,cost,simulate,evidence,review};
})(typeof window!=='undefined'?window:globalThis);
