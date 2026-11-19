/* Small authored interiors, sharing the existing lights, materials and renderer. */
(function(){
  'use strict';
  const T=THREE,names={tea:['BOBO / 波波','打烊前，再坐一会儿'],home:['SUNSHINE / 阳光社区','生活在日历之外'],studio:['DESIGN / 原型桌','让纸上的路，也能走通'],lab:['ENGINEERING / 测试角','先让问题发生在这里'],ops:['NIGHT SHIFT / 值班室','灯亮着，有人在场'],data:['OBSERVATORY / 数据中心','看见回来的人'],market:['WEEKEND / 周末小集市','每一次选择都有来处'],roof:['SPARK / 岛上的夜晚','故事还在继续']};
  Object.assign(names,{'ai-workshop':['STAR TIDE / 潮汐工坊','从真实问题开始'],'ai-lab':['COMPUTE / 算力控制台','成本 · 引用 · 可回退'],'ai-eval':['EVAL / 星潮评测角','真实样本 · 边界情况 · 历史错误'],'ai-ops':['ON CALL / 星潮值班室','监测 · 复核 · 回退'],'ai-tea':['STAR TIDE / 星潮夜市','夏青的柠檬茶铺'],'ai-roof':['STAR TIDE / 环形露台','把选择带回真实生活']});
  const C={
    supports(kind){return !!names[kind];},
    forLevel(lv){
      if(window.PQAI?.isLevel(lv))return PQAI.room(lv);
      if(lv.finale)return 'roof';
      if(lv.scene==='cafe')return 'cafe';if(lv.scene==='tea')return 'tea';if(lv.scene==='home')return 'home';if(lv.scene==='data')return 'data';if(lv.scene==='bank')return 'market';
      if(lv.ch?.includes('第5章'))return 'ops';if(lv.ch?.includes('第4章'))return 'lab';if(lv.ch?.includes('第3章'))return 'studio';return 'office';
    },
    build(r,kind){
      const title=names[kind],ai=kind.startsWith('ai-');if(ai)kind=({'ai-workshop':'lab','ai-lab':'lab','ai-eval':'lab','ai-ops':'ops','ai-tea':'tea','ai-roof':'roof'})[kind];
      const roof=kind==='roof',night=roof||kind==='ops',b=(...args)=>r.box(...args);
      r.scene.background.set(night?'#152e3d':'#315653');r.scene.fog.color.copy(r.scene.background);
      b(0,-.2,0,16,.4,13,'#675641');
      for(let i=0;i<16;i++)b(-7.5+i,.015,0,.975,.05,12.8,roof?(i%2?'#879595':'#7f8c8c'):(i%3?'#bd9f77':'#ad916e'));
      if(roof){
        b(0,.6,-6.2,16,1.2,.2,'#526e71');b(-7.7,.6,0,.2,1.2,12.5,'#526e71');
        for(let i=0;i<9;i++){
          b(-7+i*1.75,1.35,-6.1,.055,.8,.055,'#b8a277');
          const lamp=new T.Mesh(new T.SphereGeometry(.12,8,6),r.mat('#ffe0a2',{emissive:'#ffcc77',emissiveIntensity:1.3}));lamp.position.set(-7+i*1.75,1.8,-6.1);r.group.add(lamp);
          b(-14+i*3.5,-1.5,-12-i%3,2.2,2+i%4,2.2,'#304f5c');
        }
        r.text(title,2.8,2.4,-6.05,4.9,1.1,'#29464b','#eed8ad');
      }else{
        b(0,3.1,-6.45,16,6.2,.25,kind==='home'?'#d5c7b2':'#c5c6b6');b(-7.85,3.1,-.2,.25,6.2,12.5,'#b9c2b2');
        b(0,.9,-6.25,16,1.8,.18,'#325a58');b(-7.68,.9,-.2,.18,1.8,12.5,'#325a58');b(0,1.85,-6.1,16,.1,.15,'#bc9f70');
        b(-4.2,3.8,-6.08,5.5,3.4,.14,'#d5dfcf');b(-4.2,3.8,-5.97,5.2,3.1,.06,night?'#32596a':'#a8cbca',{emissive:night?'#385e71':'#90b6b0',emissiveIntensity:.16});
        for(const x of [-6.9,-4.2,-1.5])b(x,3.8,-5.78,.1,3.5,.15,'#325a58');b(-4.2,3.7,-5.78,5.5,.1,.15,'#325a58');
        r.text(title,3.1,4.6,-6.07,5,1.2,'#234746','#e6d4ad');
        for(const x of [-2.5,3.8]){r.cylinder(x,5.7,-1,.025,1,'#42554e');const shade=new T.Mesh(new T.ConeGeometry(.62,.36,20,1,true),r.mat('#d0b988',{side:T.DoubleSide}));shade.position.set(x,5.1,-1);r.group.add(shade);}
        for(let i=0;i<3;i++){const patch=b(-4+i*1.2,.053,-2.4,1,.008,4.3,'#ead5a6',{transparent:true,opacity:night?0:.15,depthWrite:false});patch.rotation.y=-.3;patch.castShadow=false;}
      }
      r.plant(-6.65,3.65,.9);r.plant(6.35,-4.5,1.35);
      // The evidence table occupies the same readable space in every room.
      b(-4.65,.94,-.6,3.6,.15,3.2,'#c3a77b');for(const x of [-6,-3.3])for(const z of [-1.85,.65])b(x,.48,z,.12,.95,.12,'#55716a');
      if(kind==='home'){
        b(2.8,.65,-4.2,5.1,.7,1.5,'#a9b7a0');b(2.8,1.2,-4.8,5.1,1,.28,'#9caa96');for(const x of [.4,5.2])b(x,1,-4.2,.28,.9,1.5,'#a9b7a0');
        b(2.8,.09,-2.9,6,.025,2.5,'#b7a486');r.text(['25','发薪日'],.1,3,-6.05,1.1,1.45,'#eee0bd','#375b57');
        b(-7.55,3.8,1,.12,.04,4.5,'#baa781');for(let i=0;i<3;i++)b(-7.4,3.3,-.4+i*1.2,.035,.9,.7,i%2?'#d0ae87':'#7e9c92');
      }else if(kind==='tea'||kind==='market'){
        b(2.4,1,-4,6,2,1.6,kind==='tea'?'#9c7c74':'#657267');b(2.4,2.05,-4,6.25,.14,1.8,'#e0cba5');
        for(let i=0;i<10;i++)b(-.3+i*.58,1,-3.17,.055,1.7,.05,'#cfb37d');
        if(kind==='tea'){for(let i=0;i<3;i++)r.cup(.8+i*.8,2.23,-3.9);r.text(['今日售罄','明天，还是这个时间'],4.6,2.6,-3.9,1.5,.8,'#315b55');}
        else{r.text(['额外整理','自愿选择 / 可退出'],2.5,3,-4,2.4,1.3,'#2b514d');for(let i=0;i<5;i++)r.cylinder(.1+i*.22,2.18,-3.6,.1,.04,'#d7b776');}
      }else if(['studio','lab','ops','data'].includes(kind)){
        b(2,1.04,-4,6.4,.15,1.7,'#b69d75');for(const x of [-.5,4.5])b(x,.5,-4,.13,1,.9,'#436762');
        if(kind==='studio'){
          r.text(['先核对 → 再确认 → 有凭据','正常 / 返回 / 失败'],2,2.7,-4.4,4.6,1.9,'#e9dfc0','#325450');
          for(let i=0;i<3;i++)b(.5+i*1.1,1.15,-3.7,.8,.04,.55,i%2?'#e3bf83':'#b1c4ac');
        }else{
          for(let i=0;i<2;i++){
            b(.2+i*3,2.05,-4.35,2.25,1.45,.12,'#2a4547');b(.2+i*3,2.05,-4.27,2.05,1.25,.025,'#497778',{emissive:'#3e6b71',emissiveIntensity:.23});b(.2+i*3,1.38,-4.3,.13,.6,.13,'#314f50');
            for(let j=0;j<4;j++)b(-.6+i*3+j*.5,1.75+j*.1,-4.22,.3,.2+j*.18,.04,j%2?'#b7d0aa':'#d9ba7b');
          }
          r.text(ai?['样本 / 引用 / 评测','潮汐审单 · 工作记录']:kind==='lab'?['网络 / 已连接','请求记录']:kind==='ops'?['试营业 / 值班中','暂停 · 回退 · 核对']:['新用户 / 老用户','完成任务 · 再次回来'],2,3.45,-6.05,4.2,.85,'#d1bd93','#315452');
        }
      }else if(roof){
        r.chair(3.8,-3.5,'#577c75');r.chair(5.1,-3.5,'#577c75');r.cup(-5,1.13,-.8);
      }
    },
    evidence(r,type,x,y,z){
      const before=r.group.children.length,b=(...a)=>r.box(...a);
      if(type==='envelope'){
        b(x,y,z,1,.055,.65,'#d5b882');const flap=b(x,y+.035,z-.05,.72,.015,.42,'#ead5a8');flap.rotation.y=.3;
        const label=r.text(['周末'],x,y+.05,z,.65,.3,'#d5b882','#3a5954');label.rotation.x=-Math.PI/2;
      }else if(type==='coins'){
        for(let i=0;i<8;i++)r.cylinder(x+(i%3)*.18-.18,y+.03+Math.floor(i/3)*.045,z,.12,.04,'#ddbc75');
      }else if(type==='terminal'||type==='chart'||type==='prototype'){
        b(x,y+.44,z,.95,.86,.08,'#31514f');b(x,y+.45,z+.05,.82,.68,.025,'#a8c3b0',{emissive:'#5d9085',emissiveIntensity:.13});b(x,y+.08,z,.12,.2,.35,'#456963');
        for(let i=0;i<3;i++)b(x-.25+i*.25,y+.3+i*.08,z+.075,.14,.18+i*.12,.012,type==='prototype'?'#f0dbb1':'#537d6b');
      }else{
        for(let i=0;i<3;i++)b(x+i*.025,y+i*.025,z,.9,.02,.66,type==='ticket'?'#d3c18e':'#e7ddc2');
        for(let i=0;i<4;i++)b(x,y+.065,z-.2+i*.12,.67,.006,.016,'#789085');
      }
      const parts=r.group.children.slice(before),group=new T.Group();for(const p of parts)group.add(p);r.group.add(group);return group;
    }
  };
  window.PQChapterRooms=C;
})();
