/* Frame-budget governor. Only foreground, steady-state samples may change quality. */
(function(root){
  'use strict';
  class QualityGovernor {
    constructor(tier=2){this.tier=tier;this.reset();this.cooldown=0;}
    reset(){this.samples=[];this.elapsed=0;this.slow=0;this.fast=0;this.stalls=0;}
    sample(ms,visible=true){
      if(!visible||!Number.isFinite(ms)||ms<=0){this.reset();return null;}
      if(ms>250){
        this.stalls++;this.samples=[];this.elapsed=0;this.fast=0;
        if(this.stalls>=3&&this.tier>0){this.tier--;this.cooldown=30000;this.stalls=0;return this.tier;}
        return null;
      }
      this.stalls=0;
      this.samples.push(ms);this.elapsed+=ms;this.cooldown=Math.max(0,this.cooldown-ms);
      if(this.elapsed<3000||this.samples.length<30)return null;
      const sorted=this.samples.slice().sort((a,b)=>a-b);
      this.fps=1000/(this.elapsed/this.samples.length);this.p90=sorted[Math.floor(sorted.length*.9)];
      this.samples=[];this.elapsed=0;
      this.slow=this.fps<48||this.p90>34?this.slow+1:0;
      this.fast=this.fps>57&&this.p90<20?this.fast+1:0;
      if(this.tier>0&&(this.slow>=2||this.fps<29)){this.tier--;this.cooldown=30000;this.slow=this.fast=0;return this.tier;}
      if(this.tier<2&&this.fast>=6&&this.cooldown===0){this.tier++;this.cooldown=30000;this.fast=0;return this.tier;}
      return null;
    }
  }
  root.PQQualityGovernor=QualityGovernor;
})(typeof window!=='undefined'?window:globalThis);
