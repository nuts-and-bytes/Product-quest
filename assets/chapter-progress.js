/* Derive chapter rewards from the existing sequential save; no save migration needed. */
(function(root){
  'use strict';
  root.PQChapterProgress={
    chapters(levels,milestones,progress){
      let start=levels.findIndex(l=>l.id==='c1');
      const chapters=milestones.map(m=>{
        const end=levels.findIndex(l=>l.id===m.bossId),valid=start>=0&&end>=start;
        const part=valid?levels.slice(start,end+1):[];start=end+1;
        return {...m,levels:part,complete:valid&&end<progress,bossIndex:end};
      });
      const intro=levels.findIndex(l=>l.id==='p1');
      if(intro>=0)chapters.unshift({id:'prologue',bossId:'p1',ch:'序章 · 初到星火',title:'星火启程徽章',desc:'迈出产品旅程的第一步，把模糊想法变成可以验证的问题',levels:[levels[intro]],complete:intro<progress,bossIndex:intro});
      return chapters;
    },
    forBuilding(building,chapters){return chapters.filter(c=>c.levels.some(l=>(building.levels||[]).includes(l.id)));}
  };
})(typeof window!=='undefined'?window:globalThis);
