/* A separate journey checkpoint keeps the introduction compatible with old saves. */
(function(root){
  'use strict';
  const stages=['arrival','hq','office','cafe','coffee','complete'];
  function normalize(raw,progress=0){
    const valid=!!(raw&&raw.version===1&&stages.includes(raw.stage));
    const state={version:1,stage:valid?raw.stage:(progress>0?'complete':'arrival'),
      paused:valid&&!!raw.paused,started:valid&&!!raw.started,replay:valid&&!!raw.replay,clues:[],drink:null,lesson:null};
    if(valid){
      state.clues=[...new Set((Array.isArray(raw.clues)?raw.clues:[]).filter(x=>['envelopes','investor'].includes(x)))];
      state.drink=['coffee','tea'].includes(raw.drink)?raw.drink:null;
      const l=raw.lesson;
      if(l&&['story','quiz'].includes(l.phase)&&Number.isInteger(l.node)&&l.node>=0&&Number.isInteger(l.quiz)&&l.quiz>=0){
        state.lesson={phase:l.phase,node:l.node,quiz:l.quiz,score:Math.max(0,Number(l.score)||0),correct:Math.max(0,Number(l.correct)||0)};
      }
      if(progress>0&&!state.replay&&['arrival','hq','office'].includes(state.stage)){state.stage='cafe';state.lesson=null;}
      if(progress===0&&['cafe','coffee','complete'].includes(state.stage)){state.stage='hq';state.lesson=null;}
    }
    return state;
  }
  function step(s,event){
    const next={...s,clues:[...s.clues]};
    if(event==='meet'&&s.stage==='arrival')next.stage='hq';
    if(event==='enterOffice'&&['hq','office','arrival'].includes(s.stage))next.stage='office';
    if(event==='passOffice'&&['arrival','hq','office'].includes(s.stage)){next.stage='cafe';next.lesson=null;}
    if(event==='enterCafe'&&s.stage==='cafe')next.stage='coffee';
    if(event==='finishCoffee'&&s.stage==='coffee'){next.stage='complete';next.paused=false;next.replay=false;}
    return next;
  }
  root.PQFirstDayState={normalize,step,stages};
})(typeof window!=='undefined'?window:globalThis);
