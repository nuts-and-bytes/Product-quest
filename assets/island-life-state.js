/* Authored life scenes use the same saved case and deterministic outcomes as play. */
(function(root){
  'use strict';
  const valid=id=>typeof id==='string'&&/^(morning|incident-[01]|outcome-[01]-[0-3])$/.test(id);
  function normalize(raw){return [...new Set((Array.isArray(raw)?raw:[]).filter(valid))].slice(-11);}
  function remember(raw,id){return normalize([...normalize(raw),id]);}
  function film(kind,state){
    const s=root.PQCafeModel.normalize(state),weekend=s.scenario===1;
    if(kind==='morning')return {id:'morning',title:'岛上的一个早晨',end:'走进蓝山，看看今天的故事',shots:[
      {stage:'coast',duration:3.8,place:'星火岛 · 海风吹进街巷',caption:'',world:true},
      {stage:'community',duration:5.2,place:'阳光社区',caption:'“早啊！”　阿晨点点头，脚步没停。',world:true},
      {stage:'street',duration:5,place:'蓝山咖啡馆 · 开门了',caption:'有人慢慢喝。有人只想带走一杯。',world:true}
    ]};
    if(kind==='incident')return {id:'incident-'+s.scenario,title:weekend?'周末，队伍又长了':'那天早上，空着手的熟客',end:'接下来，轮到你去问问阿晨',shots:[
      {stage:'counter',duration:3.6,place:weekend?'周六 · 手冲日':'周三 · 早高峰',caption:weekend?'夏青仍在忙上一单。阿晨看向取餐牌。':'夏青把做好的咖啡放到柜台。',world:false},
      {stage:'hesitate',duration:3.2,place:'阿晨 · 等候的位置',caption:'“车快到了……”',world:false},
      {stage:'leave',duration:3.8,place:'门边',caption:'阿晨转身要走。你还来得及叫住他。',world:false}
    ],served:false,ready:!weekend};
    if(kind==='outcome'){
      const trial=s.trials[s.selected];if(!trial)return null;
      const result=root.PQCafeModel.simulate(s.scenario,trial.plan),served=result.orders[0].served;
      return {id:`outcome-${s.scenario}-${s.selected}`,title:'试过之后，生活继续',end:'回到结果，看看这次改变了什么',served,ready:served||result.orders[0].ready<result.orders[0].leave,shots:[
        {stage:'pickup',duration:5,place:'蓝山咖啡馆 · 这一次',caption:served?'“这杯是我的？好，谢谢！”':'阿晨又看了一眼时间，仍没等到自己能拿走的那杯。',world:false},
        {stage:'after',duration:5.5,place:'咖啡馆外 · 同一条街',caption:served?'他手里多了一杯咖啡。街上的早晨还在继续。':'他还是空着手走了。这个问题，还需要继续弄清楚。',world:true}
      ]};
    }
    return null;
  }
  class Clock{
    constructor(shots){this.shots=shots;this.index=0;this.time=0;this.paused=false;this.done=false;}
    get shot(){return this.shots[this.index];}
    tick(dt,{hidden=false,reduced=false}={}){if(this.done||this.paused||hidden||reduced)return false;this.time+=Math.min(.08,Math.max(0,dt));if(this.time>=this.shot.duration)return this.next();return false;}
    next(){if(this.done)return false;if(this.index+1>=this.shots.length){this.done=true;return true;}this.index++;this.time=0;return true;}
  }
  root.PQLifeState={normalize,remember,film,Clock};
})(typeof window==='undefined'?globalThis:window);
