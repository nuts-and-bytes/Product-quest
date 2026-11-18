/* Small, deterministic indoor navigation. Obstacles use floor-space coordinates. */
(function(root){
 'use strict';
 const bounds={minX:-7.35,maxX:7.35,minZ:-5.85,maxZ:5.85},radius=.34,step=.38;
 const base=[
  {x:2,z:-3.7,w:7.1,d:1.85}, {x:-3.8,z:0,r:1.3},
  {x:-3.8,z:-1.15,w:1.15,d:1.05},{x:-3.8,z:1.25,w:1.15,d:1.05},
  {x:4.3,z:.2,w:1.15,d:1.05},{x:5.8,z:.2,w:1.15,d:1.05},
  {x:5,z:1.45,w:2.3,d:1.05},
  {x:-6.3,z:-3,r:.5},{x:6.3,z:-4.6,r:.55},{x:-6.5,z:4,r:.35}
 ];
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
 function free(p,obstacles=base){
  if(!Number.isFinite(p.x)||!Number.isFinite(p.z)||p.x<bounds.minX||p.x>bounds.maxX||p.z<bounds.minZ||p.z>bounds.maxZ)return false;
  return !obstacles.some(o=>o.r!==undefined?dist(p,o)<o.r+radius:Math.abs(p.x-o.x)<o.w/2+radius&&Math.abs(p.z-o.z)<o.d/2+radius);
 }
 function clear(a,b,obstacles){const n=Math.max(1,Math.ceil(dist(a,b)/.12));for(let i=0;i<=n;i++)if(!free({x:a.x+(b.x-a.x)*i/n,z:a.z+(b.z-a.z)*i/n},obstacles))return false;return true;}
 function nearest(p,obstacles){if(free(p,obstacles))return {x:p.x,z:p.z};for(let r=.15;r<=1.21;r+=.15)for(let i=0;i<24;i++){const q={x:p.x+Math.cos(i*Math.PI/12)*r,z:p.z+Math.sin(i*Math.PI/12)*r};if(free(q,obstacles))return q;}return null;}
 function path(from,to,obstacles=base){
  const end=nearest(to,obstacles);if(!end||!free(from,obstacles))return [];
  if(clear(from,end,obstacles))return [end];
  const nx=Math.floor((bounds.maxX-bounds.minX)/step)+1,nz=Math.floor((bounds.maxZ-bounds.minZ)/step)+1;
  const nodes=[];for(let j=0;j<nz;j++)for(let i=0;i<nx;i++)nodes.push({x:bounds.minX+i*step,z:bounds.minZ+j*step,id:j*nx+i});
  const valid=new Uint8Array(nodes.length);nodes.forEach((p,i)=>valid[i]=free(p,obstacles)?1:0);
  const near=p=>nodes.filter(n=>valid[n.id]&&dist(n,p)<step*2&&clear(n,p,obstacles)).sort((a,b)=>dist(a,p)-dist(b,p))[0];
  const start=near(from),last=near(end);if(!start||!last)return [];
  const cost=new Float64Array(nodes.length).fill(Infinity),prev=new Int32Array(nodes.length).fill(-1),closed=new Uint8Array(nodes.length),open=[start.id];cost[start.id]=0;
  while(open.length){let best=0;for(let i=1;i<open.length;i++)if(cost[open[i]]+dist(nodes[open[i]],last)<cost[open[best]]+dist(nodes[open[best]],last))best=i;
   const id=open.splice(best,1)[0];if(closed[id])continue;closed[id]=1;
   if(id===last.id){const route=[end];let k=id;while(k!==-1){route.unshift({x:nodes[k].x,z:nodes[k].z});k=prev[k];}
    // Smooth only through collision-free segments; chairs cannot be corner-cut.
    const out=[];let at=from,i=0;while(i<route.length){let j=i;while(j+1<route.length&&clear(at,route[j+1],obstacles))j++;out.push(route[j]);at=route[j];i=j+1;}return out;}
   const x=id%nx,z=Math.floor(id/nx);for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dz)continue;const xx=x+dx,zz=z+dz;if(xx<0||zz<0||xx>=nx||zz>=nz)continue;const k=zz*nx+xx;if(closed[k]||!valid[k]||!clear(nodes[id],nodes[k],obstacles))continue;const value=cost[id]+step*Math.hypot(dx,dz);if(value<cost[k]){cost[k]=value;prev[k]=id;open.push(k);}}
  }return [];
 }
 function move(p,v,dt,obstacles=base){
  const length=Math.hypot(v.x,v.z),scale=2.7*Math.max(0,Math.min(.05,dt))/Math.max(1,length),dx=v.x*scale,dz=v.z*scale;
  let q={x:p.x,z:p.z};const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.08));for(let i=0;i<n;i++){const both={x:q.x+dx/n,z:q.z+dz/n};if(free(both,obstacles))q=both;else{const x={x:q.x+dx/n,z:q.z};if(free(x,obstacles))q=x;const z={x:q.x,z:q.z+dz/n};if(free(z,obstacles))q=z;}}return q;
 }
 const api={bounds,radius,base,dist,free,clear,nearest,path,move};
 if(typeof module!=='undefined')module.exports=api;else root.PQCafeNavigation=api;
})(typeof window==='undefined'?globalThis:window);
