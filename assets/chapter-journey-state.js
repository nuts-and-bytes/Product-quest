/* Saved decisions are inputs, never trusted scores. No renderer or DOM dependency. */
(function(root){
  'use strict';
  const chapters=root.PQIslandChapters,def=id=>chapters.find(c=>c.id===String(id));
  const copy=o=>JSON.parse(JSON.stringify(o)),unique=(a,valid,max)=>[...new Set((Array.isArray(a)?a:[]).filter(valid))].slice(0,max);
  const reflections={keep:'保留有效的部分，再扩大观察',change:'修正判断，针对没解决的地方再试',uncertain:'证据还不够，先留下不确定性'};
  function cleanPlan(c,raw){
    const p={};for(const s of c.slots)if(s.options.some(o=>o.id===raw?.[s.id]))p[s.id]=raw[s.id];
    if(c.sequence)p[c.sequence.id]=unique(raw?.[c.sequence.id],id=>c.sequence.items.some(o=>o.id===id),c.sequence.items.length);
    return p;
  }
  function ready(c,p){return !!c&&c.slots.every(s=>s.options.some(o=>o.id===p?.[s.id]))&&(!c.sequence||(Array.isArray(p?.[c.sequence.id])&&p[c.sequence.id].length===c.sequence.items.length&&c.sequence.items.every(o=>p[c.sequence.id].includes(o.id))));}
  function cleanTrial(c,t){
    if(!t||typeof t!=='object')return null;const plan=cleanPlan(c,t.plan);if(!ready(c,plan))return null;
    return {plan,notes:unique(t.notes,id=>c.clues.some(e=>e.id===id),c.clues.length)};
  }
  function cleanRecord(c,r={}){
    const trials=(Array.isArray(r.trials)?r.trials:[]).slice(-3).map(t=>cleanTrial(c,t)).filter(Boolean);
    const committed=cleanTrial(c,r.committed);
    if(committed&&Object.hasOwn(reflections,r.committed.reflection))committed.reflection=r.committed.reflection;
    const focus=c.npcs.some(n=>n.key===r.focus?.npc)?{npc:r.focus.npc,topic:c.npcs.find(n=>n.key===r.focus.npc).topics.some(t=>t.id===r.focus.topic)?r.focus.topic:null}:null;
    const view=['explore','talk','workbench','result','complete'].includes(r.view)?r.view:'explore';
    return {notes:unique(r.notes,id=>c.clues.some(e=>e.id===id),c.clues.length),plan:cleanPlan(c,r.plan),trials,
      selected:Math.max(0,Math.min(trials.length-1,Number.isInteger(r.selected)?r.selected:trials.length-1)),
      committed:committed?.reflection?committed:null,reflection:Object.hasOwn(reflections,r.reflection)?r.reflection:null,
      intro:!!r.intro,focus,view:view==='talk'&&!focus?'explore':['result','complete'].includes(view)&&!trials.length&&!committed?'explore':view};
  }
  function normalize(raw){
    const records={};for(const c of chapters)records[c.id]=cleanRecord(c,raw?.records?.[c.id]||{});
    return {version:1,current:def(raw?.current)?String(raw.current):'1',records};
  }
  function legacyLimit(progress,levels){
    const ends=['boss','uboss','eboss','tboss','lboss','gboss','bboss'];let n=1;
    for(const [i,id]of ends.entries()){const end=(levels||[]).findIndex(l=>l.id===id);if(end>=0&&end<progress)n=i+2;}
    return n;
  }
  function available(s,id,legacy=1){
    if(!def(id))return false;
    let n=Math.max(1,Math.min(8,Math.floor(Number(legacy)||1)));
    while(n<8&&s.records[String(n)]?.committed)n++;
    return Number(id)<=n;
  }
  function next(s,legacy=1){return chapters.find(c=>available(s,c.id,legacy)&&!s.records[c.id].committed)?.id||'8';}
  function advance(raw,id,event,value,legacy=1){
    const s=normalize(raw),c=def(id);if(!c||!available(s,id,legacy))return s;
    const r=s.records[c.id];s.current=c.id;
    if(event==='view'&&['explore','workbench','result','complete'].includes(value))r.view=value;
    if(event==='talk'&&c.npcs.some(n=>n.key===value)){r.focus={npc:value,topic:null};r.view='talk';}
    if(event==='topic'&&r.focus){const n=c.npcs.find(n=>n.key===r.focus.npc),t=n.topics.find(t=>t.id===value);if(t){r.focus.topic=t.id;if(!r.notes.includes(t.evidence))r.notes.push(t.evidence);r.view='talk';}}
    if(event==='read'&&c.clues.some(e=>e.id===value)&&!r.notes.includes(value))r.notes.push(value);
    if(event==='choose'){const slot=c.slots.find(slot=>slot.id===value?.slot);if(slot?.options.some(o=>o.id===value.value))r.plan[slot.id]=value.value;}
    if(event==='unchoose'&&c.slots.some(slot=>slot.id===value))delete r.plan[value];
    if(event==='arrange'&&c.sequence){const k=c.sequence.id;if(value==='reset')r.plan[k]=[];else if(c.sequence.items.some(o=>o.id===value)&&!r.plan[k].includes(value))r.plan[k].push(value);}
    if(event==='run'&&ready(c,r.plan)){r.trials.push({plan:copy(r.plan),notes:[...r.notes]});r.trials=r.trials.slice(-3);r.selected=r.trials.length-1;r.reflection=null;r.view='result';}
    if(event==='select'&&Number.isInteger(value)&&r.trials[value]){r.selected=value;r.view='result';r.reflection=null;}
    if(event==='reflect'&&Object.hasOwn(reflections,value))r.reflection=value;
    if(event==='complete'&&!r.committed&&r.trials[r.selected]&&r.reflection){r.committed={...copy(r.trials[r.selected]),reflection:r.reflection};r.view='complete';}
    if(event==='intro')r.intro=true;
    return s;
  }
  const metric=(label,value,unit='人')=>({label,value,unit});
  function simulate(id,p,context={}){
    const c=def(id);if(!c||!ready(c,p))return null;
    let good=false,title='',line='',metrics=[],events=[];
    const add=(title,detail,ok=true)=>events.push({title,detail,ok});
    const ordered=key=>p[key]?.join(',')===c.sequence.items.map(o=>o.id).join(',');
    switch(String(id)){
      case '1':{
        const keep={ledger:2,envelope:4,reminder:3}[p.tool]+(p.setup==='together'?1:0),burden={ledger:35,envelope:7,reminder:4}[p.tool];
        good=keep>=4;title=good?'他们愿意再用一周':'喜欢过，也有人放下了';
        line=p.tool==='envelope'?'小美把新的预算卡夹回旧信封。她仍想知道：下个月还能这么顺手吗？':p.tool==='ledger'?'小美在第三天留下空白。需要补录的地方，仍然让她犹豫。':'提醒让小美停了一下，但她仍看不见还剩多少。';
        metrics=[metric('第七天继续使用',keep,'/ 6 人'),metric('每人七天录入负担',burden,'分钟'),metric('有人陪同设置',p.setup==='together'?6:0,'/ 6 人')];
        add('第一天',p.setup==='together'?'六个人当面试过怎样开始。':'链接发了出去，有人暂时没有开始。');add('第三天',p.tool==='ledger'?'补录开始积压。':'生活照常发生，留意他们会不会主动打开。',p.tool!=='ledger');add('第七天',`${keep} 人继续使用；这个小样本仍不能代表全岛。`,good);break;
      }
      case '2':{
        const order=ordered('journey'),done=Math.max(0,({payday:7,shopping:4,monthend:2}[p.moment]-(p.effort==='form'?2:0)-(order?0:2)));
        good=done>=6;title=good?'帮助赶在需要的时候出现':'同一句提醒，遇到了不同的生活';
        line=good?'小美在出门前完成了分配。阿晨记下无信号那一段，等你们继续试。':'有人看见了提醒，却没有时间或余额完成。小美请你把顺序和负担再看看。';
        metrics=[metric('完成本月任务',done,'/ 8 户'),metric('每次需要的操作',p.effort==='form'?9:2,'步')];
        add('生活顺序',order?'到账、消费、月底回看：因果顺序清楚。':'回看发生在行动之后；时间线还需要核对。',order);add('介入时刻',p.moment==='payday'?'能力和意愿同时在场。':p.moment==='shopping'?'当下有需求，也有人正忙着付款。':'适合回顾，但无法改变已经发生的消费。',p.moment==='payday');break;
      }
      case '3':{
        const order=ordered('flow'),done=(order?3:0)+(p.exit==='edit'?1:0)+(p.failure==='explain'?1:0);good=done===5;title=good?'五条路都有了收尾':'正常之外，还有人留在半路';
        line=good?'小雨把最后一张纸卡贴牢。阿凯收下规格，准备去测试角看真正断网时会怎样。':'小雨没有收起纸卡。被卡住的那个人，正指着需要补上的出口。';
        metrics=[metric('试走后完成或安全退出',done,'/ 5 次'),metric('仍然卡住',5-done,'次')];
        add('正常路径',order?'先核对、再确认、最后有凭据。':'顺序让人不知道确认了什么；三个正常使用者都需要求助。',order);add('临时修改',p.exit==='edit'?'小美返回上一页，内容还在。':'小美想改时找不到出口。',p.exit==='edit');add('提交失败',p.failure==='explain'?'失败原因和原内容被保留。':'转圈没有回答是否已经提交。',p.failure==='explain');break;
      }
      case '4':{
        const same=p.identity==='same',clear=p.state==='receipt';good=same&&clear;title=good?'车过海边，只留下一个请求':'回执丢了，疑问还在';
        line=good?'阿晨把手机放回口袋：“这次我知道要等什么了。”阿凯把这条记录留给上线值班的人。':same?'记录没有重复，但阿晨仍不知道现在是什么状态。':'阿晨的第二次点击留下两条记录。阿凯把这个问题圈进值班前要确认的清单。';
        metrics=[metric('最终处理记录',same?1:2,'条'),metric('用户能核对状态',clear?'能':'不能','')];
        add('断网前','请求 A 已处理；回执丢失。');add('重新连接',same?'沿用 A，读取原来的处理结果。':'新建 B，同一件事被再次处理。',same);add('用户看见的结果',clear?'有状态和凭据，能够停止重复点击。':'只有再试一次，仍然需要猜。',clear);break;
      }
      case '5':{
        const order=ordered('response'),ready=p.guard==='ready',small=p.scope==='pilot',exposed=small?20:200,affected=Math.min(exposed,10+(order?0:15)+(ready?0:25));
        good=order&&ready;title=good?'灯没有熄，人也没有被忘记':'夜市暂时停下来等修复';
        line=good?'老关终于端起那杯茶。受影响的记录仍在核对，给顾客的更新时间已经写好。':'阿凯守着值班桌，老关继续核对记录。恢复服务以后，还得回到受影响的人身边。';
        metrics=[metric('试营业覆盖',exposed,'人'),metric('需要核对的影响范围',affected,'人'),metric('恢复服务用时',ready?(order?8:18):38,'分钟')];
        add('第十位顾客','固定告警触发；影响还可以被限制。');add('处置顺序',order?'先停止放量，再回退核对，随后更新用户说明。':'没有先停止扩大影响，后续进入的人也需要核对。',order);add('回退准备',ready?'稳定版本和负责人都在场。':'先找版本和负责人，恢复被拖长。',ready);break;
      }
      case '6':{
        const group=p.group,old=group==='returning',all=group==='all',size=old?20:all?100:80;
        const before=old?8:all?60:52,after=p.intervention==='payday'?(old?15:all?72:57):p.intervention==='daily'?(old?9:all?62:53):before;
        const opens=p.intervention==='daily'?Math.round(size*.95):Math.round(size*.8),newcomers=p.intervention==='ads'?30:0;
        good=old&&p.intervention==='payday';title=p.intervention==='payday'?(old?'第二张日历也留下了痕迹':all?'总数上升，还要看看是谁':'新来的在用，老朋友呢？'):'打开了，不代表完成了';
        line=good?'小美在第二个发薪日回来，信封里又夹上一张新记录。老关提醒：还要继续观察下个月。':p.intervention==='payday'?(all?'合在一起的完成数提高了。老关请你把新旧用户拆开，再看小美这一组。':'新来的人完成率提高了。小美提醒：这张表还没有回答第二个月的老用户。'):p.intervention==='daily'?'小美看到许多提醒。打开次数多了，真正完成的次数只变了一点。':'街口热闹起来，旧用户的断点却还在。小美等的仍是下一次合适的帮助。';
        metrics=[metric('任务完成：改动前',before,`/ ${size} 人`),metric('任务完成：改动后',after,`/ ${size} 人`),metric('打开过页面',opens,'人'),metric('额外带来的新访客',newcomers,'人')];
        add('选定人群',old?'正在看第二个月的 20 人。':all?'新老用户混在一起；记得再拆分。':'正在看第一次使用的 80 人。',!all);add('观察行为',`完成任务从 ${before} 变为 ${after}；打开与新增另列，不替代完成。`,after>before);break;
      }
      case '7':{
        const price=Number(p.price),opt=p.consent==='optin',free=p.access==='keep',willing=[0,0,2,3,3,4,5,6,8,10].filter(v=>v>=price).length;
        const customers=opt?willing:10,exits=(free?0:4)+(opt?0:3),margin=opt?customers*(price-1)-8:null;
        good=opt&&free&&margin>=0;title=!opt?'记录下了付款意图，还不能当作成交':free?'有人购买，也有人把零钱留给周末':'付费门槛也挡住了原来的关系';
        line=!opt?'小美发现默认勾选，取消了这一笔。李姐把未经确认的数字从收入表里划掉。':free?'小美自己作了选择。李姐把愿意付费、拒绝和成本一起写进记录。':'小美想查看原来的记录，却先看见了收费页。她收起手机，拿回了纸信封。';
        metrics=[metric(opt?'主动购买':'待确认选择',customers,'/ 10 人'),metric('新增退出风险',Math.min(10,exits),'人'),metric('本次净余量',margin===null?'未确认':margin,margin===null?'':'枚')];
        add('报价',`额外服务 ${price} 枚；本次固定成本 8 枚，每位付费者服务成本 1 枚。`);add('购买授权',opt?`${willing} 人主动接受；其余人可以拒绝。`:'默认勾选不能证明真实付费意愿；不计入净余量。',opt);add('原有价值',free?'原来的记录仍能查看。':'4 位依赖基本记录的人产生退出风险。',free);break;
      }
      case '8':{
        const count=chapters.filter(c=>c.id!=='8'&&context.records?.[c.id]?.committed).length,grounded=p.source==='records',honest=p.ending==='next';
        good=grounded&&honest&&count>0;title=good?'这是一段可以追溯的经历':'故事还需要几块真实的拼图';
        line=good?'李姐合上本子：“我听见你怎么作决定了。”小美举起杯子，岛上的日子继续向前。':'李姐把空白留在本子上：“已经做到的可以讲，没验证过的就留给下一次。”';
        metrics=[metric('可追溯的前序章节',count,'章'),metric('已使用实际记录',grounded?'是':'否',''),metric('明确留下边界',honest?'是':'否','')];
        add('问题与行动',grounded?`从 ${count} 章已完成记录提取实际方案和后果。`:'海报没有包含当时的条件、选择或结果。',grounded);add('结尾',honest?'把限制与下一步写清楚。':'所有问题解决的承诺没有被现有记录支持。',honest);break;
      }
    }
    return {good,title,line,metrics,events};
  }
  function result(s,id,trial){const r=s.records[id];return simulate(id,(trial||r?.trials[r.selected]||r?.committed)?.plan,s);}
  function planLines(id,p){const c=def(id);if(!c)return[];const lines=c.slots.map(s=>`${s.name}：${s.options.find(o=>o.id===p[s.id])?.name||'尚未选择'}`);if(c.sequence)lines.unshift(c.sequence.name+'：'+(p[c.sequence.id]||[]).map(id=>c.sequence.items.find(o=>o.id===id)?.name).join(' → '));return lines;}
  function recall(id,s,firstDay={},cafeCase){
    if(id==='1')return firstDay.clues?.includes('envelopes')?'你在蓝山听过纸信封的故事。今天，小美兑现了“下次给你看订单”的约定。':'这是小美第一次向你摊开信封：一个正在被使用的生活办法。';
    if(id==='2')return s.records['1'].committed?'上一次试用已经留下记录。现在把镜头拉远，看看小美完整的一个月。':'即使还没做过新的试用，也可以从小美正在使用的信封开始回访。';
    if(id==='4'){const t=cafeCase?.legacy?.trial||cafeCase?.trials?.[cafeCase.selected],scenario=cafeCase?.legacy?.scenario??cafeCase?.scenario;const served=t&&root.PQCafeModel?.simulate(scenario,t.plan).orders[0].served;return t?(served?'阿晨已经在你的咖啡馆试验中拿到那杯咖啡。赶路的限制仍在，这次要处理海边断网。':'阿晨在咖啡馆试验中仍然空手离开。赶时间的人需要清楚的反馈，断网时也是如此。'):'咖啡馆里赶车的熟客又来了。这次，他带来班车上没等到的回执。';}
    if(id==='7')return firstDay.clues?.includes('investor')?'还记得窗边的李姐吗？她说过更想听真实的人和行为。今天带来的，是一路留下的记录。':'李姐请你带上已经发生的选择和结果，再谈这份服务的未来。';
    if(id==='8')return '旧信封、班车票、值班日志都在这里。每一处回应都来自你的已完成记录；没有记录的地方，仍留白。';
    const previous=String(Number(id)-1),t=s.records[previous]?.committed;
    if(!t)return '你可以接着原有章节的进度继续；没有做过的新试验不会被补写成已经发生。';
    const r=simulate(previous,t.plan,s);return `上一段留下的结果是“${r.title}”。${r.good?'把有效的部分带到这一步，也继续检验新的条件。':'带着这个尚未解决的问题往前走；本次仍是可以撤回的演练。'}`;
  }
  function evidence(id,key,s){
    const e=def(id)?.clues.find(e=>e.id===key);if(!e)return null;
    if(id!=='8'||key!=='history')return e;
    const body=chapters.filter(c=>c.id!=='8'&&s.records[c.id].committed).map(c=>{const t=s.records[c.id].committed,r=simulate(c.id,t.plan,s);return `第 ${c.id} 章 · ${c.name}：${planLines(c.id,t.plan).join('；')}。${r.metrics.map(m=>m.label+' '+m.value+' '+m.unit).join('；')}。`;});
    return {...e,body:body.length?body:['还没有新的章节试验记录。原有练习仍然保留；可以回访章节，补上实际尝试后再导出。']};
  }
  function report(s){
    const lines=['# 星火岛 · 我的项目手记','','以下为游戏内固定模拟情境的个人选择与结果，不是真实经营或金融数据。',''];
    for(const c of chapters){const t=s.records[c.id].committed;if(!t)continue;const r=simulate(c.id,t.plan,s);lines.push(`## 第 ${c.id} 章 · ${c.name}`,'',...planLines(c.id,t.plan).map(t=>'- '+t),'- 当时读过的证据：'+(t.notes.map(id=>c.clues.find(e=>e.id===id).title).join('、')||'未收集，以探索性试验开始'),...r.metrics.map(m=>'- '+m.label+'：'+m.value+' '+m.unit),'- 我的复盘：'+reflections[t.reflection],'',r.line,'');}
    return lines.join('\n');
  }
  root.PQChapterJourney={chapters,def,normalize,ready,available,legacyLimit,next,advance,simulate,result,planLines,recall,evidence,report,reflections};
})(typeof window==='undefined'?globalThis:window);
