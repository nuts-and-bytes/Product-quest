/* Shared spatial rules. Rendering, collision, click paths and tests use the same map. */
(function (root) {
  'use strict';
  const regions = [
    { id:'growth', name:'琥珀林地', continent:'增长大陆', x:62, z:-36, rx:16, rz:13, color:'#e5ad61',
      title:'让增长从一个真实的人开始', text:'树木的年轮记录长期生长。产品的增长也如此：先找到用户愿意反复回来的理由，再扩大获客。回到数据中心，继续你的北极星指标与留存挑战。', building:'data' },
    { id:'ai', name:'星潮观测站', continent:'AI大陆', x:72, z:13, rx:17, rz:14, color:'#72dce9',
      title:'让智能拥有可验证的边界', text:'模型的能力像星空，广阔却不总能看清边界。把任务、输入、评价标准和失败时的退路一起设计，才是可靠的 AI 产品。工程部里的主线会带你继续探索。', building:'eng' },
    { id:'design', name:'珊瑚花园', continent:'设计大陆', x:29, z:53, rx:18, rz:14, color:'#f5a1ac',
      title:'让每一步都能被理解', text:'路径、灯光和地标让你知道自己在哪里，也知道下一步能做什么。界面设计同样需要清晰的反馈和可预期的行动。回到阳光社区，重新观察一个真实生活场景。', building:'home' }
  ];
  const routes = [
    {id:'amber-way', name:'拾光栈道', points:[[25,-9],[35,-9],[44,-16],[53,-28],[62,-36]]},
    {id:'tide-way', name:'星潮长桥', points:[[29,8],[38,8],[50,8],[61,13],[72,13]]},
    {id:'coral-way', name:'花信步道', points:[[10,21],[11,30],[18,39],[29,53]]}
  ];
  function distanceToSegment(x,z,a,b) {
    const dx=b[0]-a[0], dz=b[1]-a[1];
    const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));
    return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);
  }
  function mainDistance(x,z) {
    const a=Math.atan2(z,x);
    return Math.hypot(x/38.5,z/33.5)+.085*Math.sin(a*3+.6)+.05*Math.cos(a*5-1.1);
  }
  function regionAt(x,z) {
    return regions.find(r=>Math.hypot((x-r.x)/r.rx,(z-r.z)/r.rz)<.94)||null;
  }
  function bridgeAt(x,z) {
    return routes.find(r=>r.points.some((p,i)=>i>0&&distanceToSegment(x,z,r.points[i-1],p)<1.55));
  }
  function canWalk(x,z,buildings) {
    if(!Number.isFinite(x)||!Number.isFinite(z)) return false;
    const region=regionAt(x,z);
    if(region) return Math.hypot(x-region.x-3,z-region.z+2)>1.45;
    if(bridgeAt(x,z)) return true;
    if(mainDistance(x,z)>.94) return false;
    if(z<-24) return false; // Scenic cliffs are deliberately outside the walking surface.
    const communityPorch=x>=-16&&x<=-14&&z>=13.1&&z<=16.5;
    if((Math.hypot((x+13)/4.4,(z-12)/3.4)<.95&&!communityPorch) || Math.hypot(x,z)<2.4) return false;
    return !(buildings||[]).some(b=>Math.abs(x-b.wx)<4.4&&Math.abs(z-b.wz)<4.2);
  }
  // A* on a one-metre grid, with swept diagonal checks to keep routes inside the railings.
  function findPath(start,end,buildings) {
    if(!canWalk(end.x,end.z,buildings)) return null;
    const sx=Math.round(start.x),sz=Math.round(start.z),ex=Math.round(end.x),ez=Math.round(end.z);
    const key=(x,z)=>x+','+z, heuristic=(x,z)=>Math.hypot(ex-x,ez-z);
    const first={x:sx,z:sz,g:0,f:heuristic(sx,sz),parent:null};
    const open=[first],best=new Map([[key(sx,sz),0]]),closed=new Set();
    const push=n=>{open.push(n);let i=open.length-1;while(i){const p=(i-1)>>1;if(open[p].f<=n.f)break;open[i]=open[p];i=p;}open[i]=n;};
    const pop=()=>{const n=open[0],tail=open.pop();if(open.length){let i=0;while(i*2+1<open.length){let c=i*2+1;if(c+1<open.length&&open[c+1].f<open[c].f)c++;if(open[c].f>=tail.f)break;open[i]=open[c];i=c;}open[i]=tail;}return n;};
    const steps=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
    while(open.length&&closed.size<22000){
      const n=pop(),nk=key(n.x,n.z);if(closed.has(nk))continue;closed.add(nk);
      if(Math.hypot(n.x-end.x,n.z-end.z)<1.15){const path=[{x:end.x,z:end.z}];let p=n;while(p.parent){path.push({x:p.x,z:p.z});p=p.parent;}return path.reverse();}
      for(const [dx,dz] of steps){
        const x=n.x+dx,z=n.z+dz,k=key(x,z);
        if(x<-43||x>93||z<-51||z>69||closed.has(k)||!canWalk(x,z,buildings))continue;
        if(!canWalk(n.x+dx*.5,n.z+dz*.5,buildings))continue;
        if(dx&&dz&&(!canWalk(n.x+dx,n.z,buildings)||!canWalk(n.x,n.z+dz,buildings)))continue;
        const g=n.g+Math.hypot(dx,dz);if(g>=(best.get(k)??Infinity))continue;
        best.set(k,g);push({x,z,g,f:g+heuristic(x,z),parent:n});
      }
    }
    return null;
  }
  root.PQWorldMap={regions,routes,distanceToSegment,mainDistance,regionAt,bridgeAt,canWalk,findPath};
})(typeof window==='undefined'?globalThis:window);
