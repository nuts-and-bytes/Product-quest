/* Authored evidence stays backed by its existing model, budget and return path. */
(function(){
 'use strict';
 const L={
  cafe(id){
   const C=PQCafeCase,s=G.cafeCase,e=PQCafeModel.evidence(s.scenario,id);if(!e)return;
   const front=[e.text],back=['记录只覆盖这一次早高峰。听到的期待和真正做出的选择，需要分开记。'];
   if(id==='orders'){
    front.push('单号 / 到店 / 出杯 / 取走或离开（分钟）');
    for(const o of PQCafeModel.simulate(s.scenario).orders)front.push(`#${String(o.id).padStart(2,'0')}    ${o.arrival.toFixed(1)}    ${o.ready.toFixed(1)}    ${o.served?'取走':'离开'} ${o.leave.toFixed(1)}`);
    back.push('从开店后第 0 分钟计时。已做好的杯子，也可能没有被取走。');
   }
   const actions=[];
   if(['investigate','plan'].includes(s.phase))actions.push({label:s.pins.includes(id)?'取消关键证据标记':'圈为关键证据',run:()=>C.act('pin',id)});
   if(id==='orders'&&s.phase==='investigate')actions.push({label:'拿着订单，回去问阿晨',run:()=>C.act('compare')});
   PQCafeScene.finishTransition();
   PQPropInspector.open({type:id==='orders'?'book':'card',source:e.type,title:e.title,front,back,actions,onClose:()=>C.active&&C.act('back')});
  },
  chapter(id){
   const C=PQCampaign,e=PQChapterJourney.evidence(C.chapter,id,G.campaign);if(!e)return;
   const raw=PQChapterJourney.def(C.chapter).clues.find(p=>p.id===id);
   PQChapterScene.finish();
   PQPropInspector.open({type:raw?.prop==='notebook'?'book':raw?.prop||'book',source:e.source,title:e.title,front:e.body,back:['这份线索已经记进随身手记。合上后，可以回到刚才的场景继续问，也可以拿到工作台试试。'],onClose:()=>C.active&&C.act('back')});
  },
  card(table,card){
   const slot=PQChapterJourney.def(PQCampaign.chapter).slots.find(s=>s.id===card.slot),option=slot.options.find(o=>o.id===card.value),selected=PQCampaign.record().plan[card.slot]===card.value;
   PQPropInspector.open({type:'card',source:'七天试用桌 / '+slot.name,title:option.name,front:[option.detail,selected?'这张卡片已经在试用区。':'先看清它的作用，再决定是否放入试用区。'],back:['一次只改变少量条件，回到同一群人身边看会发生什么。','选择这张卡片不会直接得出结论。还需要开始试用、看结果并复盘。'],actions:[{label:selected?'撤回这张卡片':'放入试用区',run:()=>table.choose(card)}]});
  },
  market(id){
   const C=PQNightMarket,r=(C.view==='visit'?G.nightMarket.legacy?.run:null)||C.run,q=PQNightMarketModel.result(r),names={order:'点单台',brew:'制作台',pickup:'取餐架'};
   const front=id==='layout'?['从左到右：'+r.plan.layout.map(k=>names[k]).join(' → '),r.plan.space==='bench'?'给人歇脚的长凳。':'让制作顺手的置物架。',r.plan.sign?'取餐指示牌也保留着。':'这一次没有摆取餐指示牌。']:['起始信封：60 元。',`布置和备料：${PQNightMarketModel.cost(r.plan)} 元。每杯：${r.plan.price} 元。`,`已交付 ${q.served} 杯；进账 ${q.revenue} 元。`,`本晚成本 ${q.cost} 元；结余 ${q.profit} 元。`,`剩余材料 ${q.stock} 份。`];
   PQPropInspector.open({type:id==='budget'?'envelope':'book',source:'夏青的周末夜市 / 实际操作记录',title:id==='layout'?'留下来的布置':id==='result'?'这一晚的营业记录':'夏青的周末信封',front,back:['摊位 8 元，材料每份 2 元。','长凳 8 元，置物架 4 元，指示牌 4 元。','这是岛上这一晚的记录。不要把一个晚上的结果，当成所有人的需求。'],onClose:()=>C.active&&C.action('back')});
  }
 };window.PQPropLibrary=L;
})();
