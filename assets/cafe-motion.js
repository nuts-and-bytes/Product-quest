/* Transient choreography only. Story choices and action costs never wait for animation. */
(function(root){
  'use strict';
  const clamp=n=>Math.max(0,Math.min(1,n));
  const smooth=n=>{n=clamp(n);return n*n*(3-2*n);};
  class Motion{
    constructor(){this.key='';this.view=null;this.stage='guest';this.seen=new Set();this.elapsed=0;this.duration=0;this.revealAt=0;this.kind='none';}
    begin(view,stage,node='',detail='',reduced=false){
      const key=[view,stage,view==='talk'?node:'',view==='evidence'?detail:''].join(':');
      if(key===this.key)return false;
      const previous=this.view,wasCounter=this.stage==='counter';
      let kind='none';
      if(previous){
        if(view==='talk'&&stage==='counter'&&!wasCounter)kind='lead';
        else if(view==='talk'&&previous==='evidence')kind='return';
        else if(view==='talk'&&previous!=='talk')kind='arrive';
        else if(view==='talk')kind='reply';
        else if(view==='evidence')kind='evidence';
        else if(view==='explore'&&previous==='talk')kind='farewell';
        else if(view==='explore')kind='return';
      }
      const repeated=this.seen.has(kind+':'+detail);this.seen.add(kind+':'+detail);
      const timing={none:[0,0],arrive:[.86,repeated?.24:.55],lead:[1.75,1.55],reply:[.72,0],return:[.46,.12],evidence:[.56,repeated?.08:.22],farewell:[1.35,.65]}[kind];
      Object.assign(this,{key,view,stage,node,detail,kind,elapsed:0,duration:reduced?0:timing[0],revealAt:reduced?0:timing[1],repeated});
      return true;
    }
    get active(){return this.elapsed<this.duration;}
    get pending(){return this.elapsed<this.revealAt;}
    advance(dt,reduced=false){this.elapsed=reduced?this.duration:Math.min(this.duration,this.elapsed+Math.max(0,Math.min(dt,.08)));}
    finish(){this.elapsed=this.duration;}
    movement(role){
      if(!this.duration||!this.active)return 1;
      const lead=this.kind==='lead',bye=this.kind==='farewell';
      const delay=lead?(role==='guest'?.24:.46):bye?.26:this.kind==='arrive'?.12:0;
      const length=Math.min(lead?1.12:bye?.95:.6,this.duration-delay);
      return smooth((this.elapsed-delay)/length);
    }
    camera(){return !this.duration||!this.active?1:smooth((this.elapsed-(this.kind==='lead'?.16:0))/Math.min(this.duration,this.kind==='lead'?1.3:.65));}
  }
  root.PQCafeMotion={Motion,smooth};
})(typeof window!=='undefined'?window:globalThis);
