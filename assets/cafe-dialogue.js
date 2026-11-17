/* Authored conversation; persisted checkpoints contain IDs, never rendered markup. */
(function(root){
  'use strict';
  function script(scenario){
    const weekday=scenario!==1;
    return {
      hello:{text:'咦，你也在等咖啡？我得赶下一班车了。',choices:[
        {id:'recent',text:'刚才怎么没拿咖啡就走了？',next:'recent',evidence:'recent'},
        {id:'app',text:'店长说想试试预点单，你觉得呢？',next:'app',evidence:'opinion'}]},
      recent:{requires:'recent',text:weekday?'台上是有杯咖啡，可我没听清是谁的。公交快来了，我就先走了。':'取餐牌我看见了，可店员还在冲上一单。下一班车快到了，我就没等。',choices:[
        {id:'place',text:'带我看看，你刚才站在哪儿。',next:'counter'},
        {id:'ask',text:'走之前，你问过店员吗？',next:'rush'}]},
      counter:{requires:'recent',stage:'counter',text:weekday?'就是这儿。磨豆机响着，我听见喊了一声，但没听清名字。那杯……我也不敢随便拿。':'我就站在这块牌子前面。号码看得清，可我的那杯还在做。',choices:[
        {id:'rush',text:'当时为什么没有再等一会儿？',next:'rush'},
        {id:'again',text:'以前来这里，也会这样吗？',next:'again'}]},
      rush:{requires:'recent',text:'我看了眼车还有两分钟到。再问、再等，万一错过就得迟到了。下次早点出门吧。',choices:[
        {id:'again',text:'以前来这里，也会这样吗？',next:'again'},
        {id:'app',text:'如果能提前点好，你会试吗？',next:'app',evidence:'opinion'}]},
      again:{requires:'recent',text:'也不是每次。我周三赶早班，周末倒不着急。上周还在窗边坐了一会儿。',choices:[
        {id:'place',text:'我们再去你等候的位置看看。',next:'counter'},
        {id:'app',text:'店长想试试预点单，你觉得呢？',next:'app',evidence:'opinion'}]},
      app:{requires:'opinion',text:'提前点？听起来挺方便，我应该会用吧。不过早上出门连钥匙都经常找半天。',choices:[
        {id:'used',text:'以前用过类似的东西吗？',next:'used'},
        {id:'recent',text:'先说说这次没拿到咖啡的经过吧。',next:'recent',evidence:'recent'}]},
      used:{requires:'opinion',text:'还没有。附近那家发过一个下单链接，我存了，后来就忘了。真要用，得试一次才知道。',choices:[
        {id:'recent',text:'那这次，你是在哪一步离开的？',next:'recent',evidence:'recent'},
        {id:'back',text:'好，我们先把今天发生的事理清。',next:'hello'}]},
      compare:{requires:'orders',text:weekday?'哦，这张是我的。原来我走之前已经做好了……当时我只看了时间，没确认那杯是不是我的。':'对，是这张。我离开的时候还没出杯。周末我能等，今天不行。',choices:[
        {id:'recent',text:'当时在柜台前，具体发生了什么？',next:'recent',evidence:'recent'},
        {id:'app',text:'店长还提过预点单，你怎么看？',next:'app',evidence:'opinion'}]}
    };
  }
  function choices(node,actions,scenario){
    const list=[...(script(scenario)[node]?.choices||[])];
    if(actions.includes('orders')&&node!=='compare')list.push({id:'compare',text:'订单在这里，我们一起核对一下。',next:'compare'});
    return list;
  }
  function normalize(raw,actions=[],scenario=0){
    const nodes=script(scenario),valid=id=>typeof id==='string'&&Object.hasOwn(nodes,id)&&(!nodes[id].requires||actions.includes(nodes[id].requires));
    const node=valid(raw?.node)?raw.node:'hello';
    const history=(Array.isArray(raw?.history)?raw.history:[]).slice(-24).filter(h=>h&&valid(h.node)&&choices(h.node,actions,scenario).some(c=>c.id===h.choice&&valid(c.next))).map(h=>({node:h.node,choice:h.choice}));
    return {node,history};
  }
  function current(s){const d=normalize(s.dialogue,s.actions,s.scenario);return {id:d.node,...script(s.scenario)[d.node],choices:choices(d.node,s.actions,s.scenario)};}
  function choose(state,id){
    const M=root.PQCafeModel,s=M.normalize(state),n=current(s),choice=n.choices.find(c=>c.id===id);
    if(s.phase!=='investigate'||!choice)return s;
    if(choice.evidence&&!s.actions.includes(choice.evidence)&&M.remaining(s)<=2)return s;
    const next=choice.evidence?M.advance(s,'observe',choice.evidence):s;
    next.dialogue={node:choice.next,history:[...s.dialogue.history,{node:n.id,choice:id}].slice(-24)};
    return next;
  }
  function history(s){
    const d=normalize(s.dialogue,s.actions,s.scenario),nodes=script(s.scenario),lines=[];
    for(const h of d.history){lines.push({speaker:'阿晨',text:nodes[h.node].text});lines.push({speaker:'你',text:choices(h.node,s.actions,s.scenario).find(c=>c.id===h.choice).text});}
    lines.push({speaker:'阿晨',text:nodes[d.node].text});return lines;
  }
  root.PQCafeDialogue={script,normalize,current,choose,history};
})(typeof window!=='undefined'?window:globalThis);
