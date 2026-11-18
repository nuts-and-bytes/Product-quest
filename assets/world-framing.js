/* Screen-space rules shared by the outdoor camera and its labels. No DOM or WebGL. */
(function(root){
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const overlaps=(a,b,gap=0)=>a.x<b.x+b.width+gap&&a.x+a.width>b.x-gap&&a.y<b.y+b.height+gap&&a.y+a.height>b.y-gap;
  function walkView(view={}){
    return {radius:clamp(Number.isFinite(view.radius)?view.radius:54,30,96),polar:clamp(Number.isFinite(view.polar)?view.polar:.8,.55,.9),azimuth:Number.isFinite(view.azimuth)?view.azimuth:.56};
  }
  function placeLabel(anchor,size,screen,obstacles=[],preferred){
    const {width,height}=size,pad=10,candidates=[];
    if(width>screen.width-pad*2||height>screen.height-pad*2)return null;
    const add=(x,y,side)=>{
      const r={x:clamp(x,pad,screen.width-width-pad),y:clamp(y,pad,screen.height-height-pad),width,height,side};
      if(!obstacles.some(b=>overlaps(r,b,6)))candidates.push(r);
    };
    add(anchor.x-width/2,anchor.y-height-12,'above');
    add(anchor.x+18,anchor.y-height/2,'right');
    add(anchor.x-width-18,anchor.y-height/2,'left');
    add(anchor.x-width/2,anchor.y+18,'below');
    // Look just beyond the actor/another label before sending a nearby goal to an edge.
    if(!candidates.length)for(const distance of [34,58,82]){
      add(anchor.x+distance,anchor.y-height/2,'right');
      add(anchor.x-width-distance,anchor.y-height/2,'left');
      add(anchor.x-width/2,anchor.y-height-distance,'above');
      add(anchor.x-width/2,anchor.y+distance,'below');
      if(candidates.length)break;
    }
    // A label can dock along a screen edge, but never cover an action or another label.
    if(!candidates.length){
      for(let x=pad;x<=screen.width-width-pad;x+=Math.max(40,width/2)){
        add(x,pad,'edge');add(x,screen.height-height-pad,'edge');
      }
      for(let y=pad;y<=screen.height-height-pad;y+=height+10){add(pad,y,'edge');add(screen.width-width-pad,y,'edge');}
    }
    const score=r=>Math.hypot(r.x+width/2-anchor.x,r.y+height/2-anchor.y)+(preferred&&r.side!==preferred?20:0);
    candidates.sort((a,b)=>score(a)-score(b));
    return candidates[0]||null;
  }
  function safeAnchor(screen,obstacles=[]){
    const radius=Math.min(48,screen.width*.09),mid={x:screen.width*.5,y:screen.height*.5};
    const points=[];
    for(const y of [.5,.55,.45,.6,.4,.65,.35,.7,.3,.75,.25])for(const x of [.5,.55,.45,.6,.4,.65,.35,.7,.3]){
      const p={x:x*screen.width,y:y*screen.height};
      if(!obstacles.some(b=>overlaps({x:p.x-radius,y:p.y-radius,width:radius*2,height:radius*2},b,12)))points.push(p);
    }
    points.sort((a,b)=>Math.hypot(a.x-mid.x,a.y-mid.y)-Math.hypot(b.x-mid.x,b.y-mid.y));
    return points[0]||mid;
  }
  function obstruction(state,blocked,dt){
    const elapsed=clamp(dt,0,.2);
    state.blocked=blocked?state.blocked+elapsed:0;
    state.clear=blocked?0:state.clear+elapsed;
    if(state.blocked>=.12)state.reveal=true;
    if(state.clear>=.22)state.reveal=false;
    return state;
  }
  const api={walkView,overlaps,placeLabel,safeAnchor,obstruction};
  root.PQWorldFraming=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
