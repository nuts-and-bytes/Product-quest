/* The first chapter's draft is a physical set of cards, backed by the same saved plan. */
(function(){
  'use strict';const T=THREE;
  class ChapterTable{
    constructor(room,chapter){
      this.root=new T.Group();this.root.position.set(-4.7,1.18,-.6);room.group.add(this.root);this.root.visible=false;
      const box=new T.BoxGeometry(1,1,1),boardMat=new T.MeshStandardMaterial({color:'#355b50',roughness:.9}),paper=new T.MeshStandardMaterial({color:'#e5d3a7',roughness:.9}),gold=new T.MeshStandardMaterial({color:'#edc776',roughness:.8,emissive:'#aa792c',emissiveIntensity:.15});
      this.gold=gold;
      const board=new T.Mesh(box,boardMat);board.scale.set(5.9,.12,4.6);board.position.z=-.2;board.receiveShadow=true;this.root.add(board);
      const caption=room.text(['七天试用区 · 每种放一张'],0,.075,1.15,5.4,.4,'#294c42','#cdd4aa');caption.rotation.x=-Math.PI/2;this.root.add(caption);
      this.pins=document.createElement('div');this.pins.id='chapter-table-pins';this.pins.setAttribute('aria-label','桌面上的方案卡片');this.pins.hidden=true;document.getElementById('chapter-screen').append(this.pins);this.cards=[];
      const names={ledger:'记账本',envelope:'预算信封',reminder:'购物提醒',together:'一起设置',alone:'发链接'};
      chapter.slots.forEach((slot,row)=>slot.options.forEach((option,i)=>{
        const group=new T.Group(),home=new T.Vector3((i-(slot.options.length-1)/2)*1.8,.13,row===0?-1.5:-.12),target=new T.Vector3(row?1.25:-1.25,.28,1.67);group.position.copy(home);this.root.add(group);
        const body=new T.Mesh(box,paper);body.scale.set(1.48,.07,1.03);body.castShadow=true;body.receiveShadow=true;group.add(body);
        const face=room.text([names[option.id],row?'开始方式':'试用方案'],0,.04,0,1.42,.97,'#efe4c9','#345c4f');face.rotation.x=-Math.PI/2;group.add(face);
        const button=document.createElement('button');button.dataset.slot=slot.id;button.dataset.value=option.id;button.type='button';this.pins.append(button);
        const card={group,body,button,home,target,slot:slot.id,value:option.id,name:names[option.id],paper,gold};this.cards.push(card);button.onclick=()=>this.inspect(card);
      }));
    }
    inspect(card){PQPropLibrary.card(this,card);}
    choose(card){const selected=PQCampaign.record().plan[card.slot]===card.value;PQCampaign.act(selected?'unchoose':'choose',selected?card.slot:card.value,card.slot);this.update(0,PQCafeScene.reduced());}
    setView(view){this.root.visible=view==='workbench';this.pins.hidden=!this.root.visible;}
    update(dt,reduced){
      if(!this.root.visible)return;const plan=PQCampaign.record().plan,k=reduced?1:1-Math.exp(-Math.max(dt,.001)*10);
      for(const c of this.cards){const selected=plan[c.slot]===c.value;c.group.position.lerp(selected?c.target:c.home,k);c.body.material=selected?c.gold:c.paper;
        if(c.selected!==selected){c.selected=selected;c.button.setAttribute('aria-pressed',String(selected));c.button.textContent=(selected?'✓ ':'')+c.name;c.button.setAttribute('aria-label',(selected?'检视已选卡片：':'检视卡片：')+c.name);}
      }
    }
    promptRows(){return this.cards.map(c=>({id:'card:'+c.slot+':'+c.value,b:c.button,label:'检视'+(c.selected?'已选卡片：':'卡片：')+c.name,point:c.group.getWorldPosition(new T.Vector3()).add(new T.Vector3(0,.15,0))}));}

    detach(){this.pins.remove();if(this.cards.every(c=>c.body.material!==this.gold))this.gold.dispose();this.gold=null;this.cards=[];}
  }
  window.PQChapterTable=ChapterTable;
})();
