// Permanent outdoor sets. The course places its playable evidence at the public
// counters in the same site plan. Batch the fixed pieces once, including patrons.
(function () {
  'use strict';
  const T = THREE;
  const timber = '#72432d', cedar = '#ae6941', brass = '#dfaa55', cream = '#fff0ca';
  const ink = '#203e46', jade = '#45877c', mint = '#a1dbbe', coral = '#dc796f';
  const glass = '#9bded9', slate = '#315b59', leaf = '#508350', clay = '#bd6a45';

  function build(region, bake) {
    const root = new T.Group();
    root.name = region.id + '-settlement';
    root.position.set(region.x, 1.015, region.z);
    const solid = [], panes = [], lights = [], signs = [], materials = new Map();
    const surfaceMat = new T.MeshStandardMaterial({vertexColors:true,roughness:.82});
    let moving;
    const cube = new T.BoxGeometry(1,1,1), drum = new T.CylinderGeometry(.5,.5,1,12);
    const bud = new T.IcosahedronGeometry(.5,0), loop = new T.TorusGeometry(.44,.06,5,18);
    let base = root;

    function piece(geo, x,y,z, w,h,d, tint, batch=tint === glass ? panes : solid) {
      if (!materials.has(tint)) materials.set(tint,new T.MeshBasicMaterial({color:tint}));
      const mesh = new T.Mesh(geo,materials.get(tint));
      mesh.position.set(x,y,z);
      mesh.scale.set(w,h,d);
      base.add(mesh);
      batch.push(mesh);
      return mesh;
    }
    const box = (...args) => piece(cube,...args);
    const cylinder = (...args) => piece(drum,...args);
    const oval = (...args) => piece(bud,...args);
    function sign(x,y,z,width,height,text) {
      signs.push({x:x+base.position.x, y, z:z+base.position.z, width,height,text});
    }
    function movingPart(x,y,z,draw) {
      const lot=base, pivot=new T.Group(), first=solid.length;
      lot.add(pivot);pivot.position.set(x,y,z);base=pivot;
      draw();
      moving=new T.Mesh(bake(solid.splice(first),pivot),surfaceMat);
      moving.position.copy(lot.position).add(pivot.position);
      moving.castShadow=moving.receiveShadow=true;
      base=lot;
    }
    function beam(x,y,z, ex,ey,ez, width,tint) {
      const axis = new T.Vector3(ex-x,ey-y,ez-z);
      const mesh = box((x+ex)/2,(y+ey)/2,(z+ez)/2,width,axis.length(),width,tint);
      mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),axis.normalize());
    }
    function table(x,z,width,depth,tint=cedar,height=1.1) {
      box(x,height,z,width,.13,depth,tint);
      for (const side of [-1,1]) box(x+side*(width/2-.16),height/2,z,.18,height,depth*.8,timber);
    }
    function pot(x,y,z,scale=1) {
      oval(x,y+.32*scale,z,.88*scale,.65*scale,.7*scale,jade);
      cylinder(x,y+.65*scale,z,.46*scale,.08*scale,.46*scale,brass);
      beam(x+.29*scale,y+.33*scale,z,x+.59*scale,y+.56*scale,z,.13*scale,jade);
      piece(loop,x-.36*scale,y+.38*scale,z,.49*scale,.56*scale,.6*scale,brass);
    }
    function planter(x,z,w,d) {
      box(x,.24,z,w,.48,d,clay);
      for (let i=0;i<5;i++) {
        const xx=x+w*(i-2)/5, zz=z+(i%2-.5)*d*.42, h=.9+(i%3)*.2;
        beam(xx,.46,zz,xx+.13,h,zz,.075,leaf);
        oval(xx-.12,h-.17,zz,.48,.24,.35,jade);
        for(let k=0;k<5;k++) {
          const a=k*2*Math.PI/5;
          oval(xx+.13+.15*Math.cos(a),h+.06,zz+.15*Math.sin(a),.30,.23,.30,i%2?coral:'#ecb14c');
        }
        oval(xx+.13,h+.16,zz,.22,.16,.22,cream);
      }
    }
    function person(x,z,shirt,{seated=false, bag=false, hair=timber}={}) {
      const hips=seated?.52:.76;
      for(const side of [-1,1]) {
        box(x+side*.14,.32,z+(seated?.24:0),.21,.64,.24,ink);
        box(x+side*.14,.10,z+(seated?.33:.09),.24,.18,.35,slate);
        if(seated)box(x+side*.14,.56,z+.12,.21,.2,.43,ink);
      }
      box(x,hips+.27,z,.58,.6,.37,shirt);
      for(const side of [-1,1]) beam(x+side*.31,hips+.48,z,x+side*.36,hips+.06,z+.14,.15,shirt);
      box(x,hips+.87,z,.43,.49,.39,'#e7b28c');
      box(x,hips+1.09,z-.025,.47,.18,.44,hair);
      if(bag)box(x+.38,.65,z+.17,.36,.42,.22,brass);
    }
    function lamp(x,z,height) {
      box(x,height/2,z,.12,height,.12,timber);
      box(x+.23,height,z,.58,.12,.14,timber);
      cylinder(x+.42,height-.35,z,.44,.56,.44,'#ffca72');
      for(const yy of [height-.66,height-.06]) cylinder(x+.42,yy,z,.47,.08,.47,slate);
    }
    function lanternLine(from,to) {
      const count=7;
      const point=t=>[from[0]+(to[0]-from[0])*t,
        from[1]+(to[1]-from[1])*t-.53*Math.sin(Math.PI*t),from[2]+(to[2]-from[2])*t];
      for(let i=1;i<=count;i++){
        const end=point(i/count);
        beam(...point((i-1)/count),...end,.046,timber);
        if(i===count)continue;
        const [x,y,z]=end, shade=tea?(i%2?'#ef9745':'#ffcb70'):(i%2?'#ffbfab':'#ffe7ba');
        beam(x,y,z,x,y-.22,z,.033,timber);
        const glow=oval(x,y-.42,z,.42,.49,.42,shade,lights);
        cylinder(x,y-.68,z,.17,.09,.17,brass);
        glow.rotation.y=i;
      }
    }
    function awning(w,d,h,tint) {
      for(const x of [-w/2+.15,w/2-.15])box(x,h/2,0,.16,h,.18,timber);
      for(let i=0;i<7;i++){
        const x=w*((i+.5)/7-.5), color=i%2?cream:tint;
        box(x,h,0,w/7+.015,.12,d,color).rotation.x=.09;
        box(x,h-.19,d/2,w/7,.28,.07,color);
      }
    }
    function roof(w,d,h) {
      const rise=d*.27;
      for(const side of [-1,1]) {
        const panel=box(0,h+rise/2,side*d/4,w,.21,Math.hypot(d/2,rise),slate);
        panel.rotation.x=side*Math.atan2(rise,d/2);
        for(let x=-w/2+.14;x<w/2;x+=.55)
          beam(x,h+rise+.12,0,x,h+.12,side*d/2,.11,'#537174');
        box(0,h,side*d/2,w+.18,.21,.19,timber);
      }
      cylinder(0,h+rise+.17,0,.22,w+.18,.22,brass).rotation.z=Math.PI/2;
    }
    function dryingLoft() {
      // Open louvres above the tea-room roof, with stacked bamboo trays.
      const x=-2.55, z=-.5;
      for(const dx of [-1.05,1.05]) for(const dz of [-.8,.8])
        box(x+dx,5.52,z+dz,.18,3.84,.18,timber);
      for(let shelf=0;shelf<4;shelf++){
        const y=5.05+shelf*.55;
        box(x,y,z,2.36,.13,1.86,cedar);
        for(const dx of [-.53,.53]){
          cylinder(x+dx,y+.12,z,.85,.15,.85,brass);
          oval(x+dx,y+.23,z,.7,.19,.64,'#777e42');
        }
      }
      for(const dx of [-1.09,1.09]) for(let i=0;i<4;i++)
        box(x+dx,5.2+i*.52,z,.12,.27,1.86,'#9d6140').rotation.z=dx*.24;
      for(const side of [-1,1]){
        box(x,7.55,z+side*.61,2.92,.18,1.48,'#4d665a').rotation.x=side*.37;
        box(x,7.25,z+side*1.28,3.05,.16,.16,brass);
      }
      beam(x-1.65,7.84,z,x+1.65,7.84,z,.17,timber);
      // Loading hoist and the bundle under its pulley.
      beam(x-1.02,6.85,z+.61,x-1.02,7.09,z+2.08,.16,timber);
      piece(loop,x-1.02,6.92,z+2,.41,.41,.5,brass);
      beam(x-1.02,6.88,z+2,x-1.02,5.75,z+2,.05,cream);
      cylinder(x-1.02,5.47,z+2,.76,.56,.76,cedar);
      for(const y of [5.26,5.6])cylinder(x-1.02,y,z+2,.79,.07,.79,brass);
    }
    function teaHouse(){
      box(0,.055,0,8,.11,4.2,cedar);
      box(0,1.8,-1.94,7.8,3.4,.18,cream);
      for(const x of [-3.8,-1.35,1.35,3.8]){
        for(const z of [-1.85,1.85])box(x,1.97,z,.23,3.75,.24,timber);
      }
      for(const side of [-1,1]){
        box(side*3.81,1.93,0,.16,.22,3.8,brass);
        for(let k=-2;k<=2;k++)box(side*3.81,2.48,k*.73,.14,1.24,.1,timber);
      }
      box(0,3.58,1.85,8,.44,.24,timber);
      roof(8.8,4.9,3.88);
      table(-1.9,.55,2.6,1.1);pot(-1.9,1.17,.55);
      for(const x of [-2.6,-1.2])cylinder(x,1.3,.81,.23,.24,.23,cream);
      table(2,.72,2.4,.95);person(2,-.02,clay);
      for(let i=0;i<5;i++)cylinder(-3.1+i*.47,1.38,-1.52,.32,.53,.32,i%2?jade:clay);
      box(-2.1,1.06,-1.52,3,.15,.6,timber);
      for(const x of [-3.3,3.3])cylinder(x,3.1,2,.48,.69,.48,'#f1b04f');
      pot(0,5.15,0,1.75);
      dryingLoft();
      sign(0,3.59,2.005,2.97,.59,'林间茶馆');
    }
    function postcardStand(){
      awning(3.3,2.1,2.7,clay);table(0,.2,2.9,1);
      for(let i=0;i<4;i++){
        box(-.98+i*.65,1.44,.3,.5,.66,.07,cream).rotation.x=-.12;
        box(-.98+i*.65,1.45,.37,.34,.31,.04,i%2?jade:brass);
      }
      person(.1,-.62,jade);
      sign(0,.92,.73,2.6,.43,'访客分群木牌');
    }
    function waterClock(){
      box(0,.18,0,3.1,.36,2.45,'#889388');
      for(const x of [-1.25,1.25])box(x,2,0,.2,4,.2,timber);
      for(let i=0;i<4;i++){
        const x=-.95+i*.63,y=3.48-i*.67;
        cylinder(x,y,-.12,.72,.26,.72,brass);
        cylinder(x,y+.15,-.12,.57,.04,.57,'#63b5ae');
        cylinder(x+.20,y-.34,-.06,.07,.64,.07,'#8bd5ce');
      }
      box(0,.56,0,2.85,.27,1.5,jade);
      box(0,.72,0,2.54,.06,1.24,'#81c8c0');
      movingPart(.18,1.37,.7,()=>{
        piece(loop,0,0,0,1.65,1.65,1.55,cedar);
        cylinder(0,0,.03,.25,.27,.25,brass).rotation.x=Math.PI/2;
        for(let j=0;j<8;j++){
          const a=j*Math.PI/4,x=.76*Math.cos(a),y=.76*Math.sin(a);
          beam(0,0,0,x,y,0,.075,timber);
          box(x,y,0,.32,.10,.4,brass).rotation.z=a;
        }
      });
      sign(0,.43,1.24,2.55,.42,'首日漏斗水钟');
    }
    function experiment(){
      for(const x of [-2.15,.1])box(x,1.8,-.55,.19,3.6,.19,timber);
      box(-1,3.56,-.55,2.7,.22,.25,timber);
      for(let i=0;i<6;i++){
        const x=-2+i*.37, len=.75+i*.14;
        beam(x,3.5,-.55,x,3.03,-.55,.045,cream);
        cylinder(x,3.02-len/2,-.55,.17,len,.17,i%2?jade:brass);
      }
      sign(-1,3.78,-.52,2.7,.43,'双周留存风铃架');
      table(1.35,0,1.9,1.4);
      for(const x of [.94,1.78]){
        box(x,1.21,0,.74,.15,1.15,cream);
        for(let j=0;j<4;j++)oval(x+.14*(j%2),1.4,-.35+j*.23,.23,.18,.23,x<1?clay:jade);
      }
    }
    function harbor(){
      for(const x of [-1.6,1.6])box(x,1.5,-.35,.28,3,.3,timber);
      box(0,3.1,-.35,4.9,2.7,.27,ink);
      box(0,3.1,-.17,4.55,2.34,.10,'#277d75');
      oval(-1.1,3.1,-.08,1.48,1.4,.12,brass);
      for(let i=0;i<3;i++)box(1.03,3.62-i*.45,-.07,1.48-i*.29,.16,.07,cream);
      sign(0,4.14,-.17,3.85,.54,'港口大屏广告');
      box(0,.45,.38,4.8,.24,1.3,cedar);
      for(const x of [-2,2])cylinder(x,.78,.7,.35,.67,.35,timber);
    }
    function referral(){
      awning(4.6,2.45,2.9,jade);table(0,.34,4.1,1);
      pot(-1.1,1.17,.35);
      for(let i=0;i<4;i++)box(.13+i*.37,1.25,.45,.26,.16,.43,brass);
      sign(0,2.67,1.3,3.4,.46,'茶客带友赠半壶茶');
      person(.95,-.65,'#db9d4d');person(-1.55,-.6,'#79988b');
    }
    function conservatory(){
      const rx=4.6, spring=2.45, rise=2.75, depth=4.45;
      box(0,.055,0,9.2,.11,4.6,'#e7d3b3');
      for(let k=0;k<8;k++)box(0,.122,-2+k*.54,.66,.03,.19,brass);
      for(const side of [-1,1]){
        box(side*rx,spring/2,0,.08,spring,depth,glass);
        for(const z of [-depth/2,0,depth/2])box(side*rx,spring/2,z,.15,spring,.15,jade);
      }
      // Ribbed barrel vault with clear glazing and open central entrance.
      for(let i=0;i<10;i++){
        const a=i*Math.PI/10,b=(i+1)*Math.PI/10;
        const x=rx*Math.cos(a), y=spring+rise*Math.sin(a);
        const xx=rx*Math.cos(b), yy=spring+rise*Math.sin(b);
        box((x+xx)/2,(y+yy)/2,0,Math.hypot(xx-x,yy-y),.055,depth,glass).rotation.z=Math.atan2(yy-y,xx-x);
        for(const z of [-depth/2,0,depth/2])beam(x,y,z,xx,yy,z,.13,jade);
        box(x,y,0,.1,.13,depth+.12,cream);
      }
      for(const z of [-depth/2, depth/2]){
        for(const x of [-3.6,-2.4,-1.2,1.2,2.4,3.6]){
          const h=spring+rise*Math.sqrt(1-(x/rx)**2);
          box(x,h/2,z,.11,h,.11,jade);
          if(Math.abs(x)>2)box(x,1.37,z,1.17,2.2,.05,glass);
        }
        box(0,2.5,z,8.98,.14,.19,cream);
      }
      planter(-2.62,0,2.55,1.6);planter(2.58,0,2.55,1.6);
      for(let i=0;i<5;i++){
        const a=i*Math.PI*2/5;
        oval(.43*Math.cos(a),3.84+.43*Math.sin(a),2.33,.75,.75,.19,coral);
      }
      oval(0,3.84,2.45,.55,.55,.15,brass);
      // A glazed octagonal lantern and petal-shaped copper ribs break the ridge line.
      const lanternHeight=5.26;
      cylinder(0,lanternHeight,0,3.6,.25,3.6,jade);
      cylinder(0,lanternHeight+.69,0,3.15,1.26,3.15,glass);
      for(let i=0;i<8;i++){
        const a=i*Math.PI/4, x=Math.cos(a), z=Math.sin(a);
        beam(1.6*x,lanternHeight,1.6*z,1.6*x,6.64,1.6*z,.1,cream);
        beam(1.85*x,6.53,1.85*z,.9*x,7.32,.9*z,.16,jade);
        beam(.9*x,7.32,.9*z,0,7.58,0,.11,brass);
        oval(1.08*x,6.87,1.08*z,1.32,.33,.63,i%2?'#80bfb3':'#e3a49b').rotation.y=-a;
      }
      cylinder(0,7.66,0,.26,.76,.26,brass);
      for(const side of [-1,1]){
        for(let i=0;i<5;i++){
          const x=side*(1.55+i*.57),y=2.85+Math.sin(i*.73)*.54;
          beam(x-side*.4,y-.25,2.3,x,y,2.37,.08,leaf);
          oval(x,y+.11,2.38,.44,.24,.27,jade);
          oval(x+.13,y-.14,2.49,.23,.25,.22,coral);
        }
      }
      sign(0,2.63,2.37,2.86,.5,'珊瑚花园');
    }
    function kiosk(){
      box(0,.12,0,3.15,.24,2.05,cream);
      box(.45,1.2,0,1.15,2.3,.66,jade);
      box(.45,1.82,.38,.94,1.03,.085,ink);
      for(let i=0;i<3;i++)box(.45,2.10-i*.26,.445,.68,.14,.03,i===2?coral:mint);
      box(.45,1.01,.39,.52,.10,.1,cream);
      box(0,3.03,0,3.45,.22,2.1,coral).rotation.z=.05;
      box(-1.1,1.5,-.45,.17,3,.18,jade);
      sign(0,2.87,1.095,3.2,.53,'花信自助预约亭');
      person(-.86,.42,'#cc9474',{bag:true,hair:'#c8bbb0'});
    }
    function ticketOffice(){
      box(0,1.15,-.45,3.4,2.3,1.5,'#f3cbba');
      box(0,1.65,.32,2.6,1.14,.09,ink);
      box(0,1.08,.55,3,.17,.66,cream);
      box(0,2.66,-.09,3.85,.28,2.7,jade);
      sign(0,2.36,.38,2.8,.43,'人工窗口');
      for(let i=0;i<4;i++)piece(loop,-1.03+i*.67,1.67,.42,.43,.55,.25,brass);
    }
    function studio(){
      for(const x of [-2.05,2.05])box(x,1.55,-1.23,.15,3.1,.15,jade);
      for(let i=0;i<9;i++){
        const x=(i-4)*.55, color=i%2?'#f4d6af':coral;
        box(x,3.18,-.2,.55,.13,3.6,color).rotation.x=-.09;
        oval(x,3.24,1.61,.57,.46,.12,color);
      }
      box(0,2.15,-1.17,3.9,1.64,.14,timber);
      sign(0,2.99,1.66,3.38,.45,'三步纸面草图板');
      for(let i=0;i<5;i++)box(-1.47+i*.73,2.16+(i%2)*.17,-1.06,.56,.77,.05,i<3?cream:mint);
      table(0,.42,4.15,1.15,'#cd8076');
      for(let i=0;i<3;i++)box(-.9+i*.85,1.2,.44,.56,.045,.77,cream);
    }
    function trial(){
      table(0,-.18,4.36,1.45,cream);
      sign(0,.9,.59,2.81,.43,'五人实测观察表');
      for(const x of [-1.25,1.22]){
        box(x,1.39,-.24,1.08,.68,.14,ink).rotation.x=-.25;
        box(x,1.42,-.12,.88,.47,.06,jade).rotation.x=-.25;
      }
      person(-.35,-.7,'#a39bb6',{bag:true});
      for(const x of [-1.5,1.5])cylinder(x,.41,.81,.58,.8,.58,coral);
    }
    function access(){
      box(0,.23,0,4.6,.46,2.6,'#e6c0ae');
      box(-1.2,1.84,-.61,1.9,2.7,.3,ink);
      box(-1.2,1.88,-.43,1.59,2.25,.12,cream);
      for(let i=0;i<4;i++)box(-1.2,2.53-i*.42,-.32,1.32-i*.19,.21,.05,i%2?slate:coral);
      table(1,.27,2.1,1.05);
      box(1.11,1.69,.12,1.43,.85,.12,slate);
      box(1.11,1.72,.21,1.22,.63,.05,mint);
      box(.95,1.21,.52,1.13,.07,.42,ink);
      piece(loop,1.88,1.4,.36,.55,.64,.45,coral);
      box(0,3.44,-.35,4.78,.16,2.45,jade);
      sign(0,3.34,.91,3.63,.47,'强光对比度灯箱');
      for(const x of [-2.17,2.17])box(x,1.77,-.91,.15,3.46,.15,jade);
    }
    function ferry(){
      for(let i=0;i<8;i++)box(-1.63+i*.47,.16,0,.43,.27,1.83,cedar);
      for(const x of [-1.64,1.64])cylinder(x,.59,-.6,.22,1.14,.22,cream);
      box(1.42,1.58,-.54,.96,1.22,.16,slate);
      box(1.42,.67,-.54,.16,1.35,.16,jade);
      for(let i=0;i<3;i++)box(1.42,1.89-i*.31,-.43,.75-i*.13,.09,.06,cream);
      // A moored passenger launch sits immediately beyond the pier.
      movingPart(0,-.78,5.55,()=>{
        oval(0,0,0,4.65,.91,1.65,jade);
        box(.14,.46,0,2.62,.67,1.09,cream);
        for(let i=0;i<4;i++)box(-.79+i*.58,.53,.58,.38,.34,.06,slate);
        box(.12,.88,0,2.94,.17,1.31,coral);
      });
    }

    const builders={teahouse:teaHouse, postcards:postcardStand, waterClock, experiment, harbor, referral,
      glasshouse:conservatory, kiosk, ticketOffice, studio, trial, access, ferry};
    for(const lot of region.settlement.buildings){
      base=new T.Group();base.position.set(lot.x,0,lot.z);root.add(base);
      builders[lot.id]();
    }
    base=root;
    const tea=region.id==='growth';
    // Separate promenades and aprons connect each public counter to the island square.
    const surface=tea?'#ccae7c':'#eee0c6';
    for(const lot of region.settlement.buildings){
      const z=lot.z+lot.depth/2+1.27;
      box(lot.x,.027,z,lot.width+.55,.052,2.55,surface);
      if(lot.id==='ferry')continue;
      const count=Math.ceil(Math.abs(z-1.05)/.82);
      for(let j=1;j<count;j++){
        const pathZ=1.05+(z-1.05)*j/count;
        if(!PQWorldMap.lotAt(region,region.x+lot.x,region.z+pathZ,.12))
          box(lot.x,.055,pathZ,tea?1.49:1.76,.06,.71,tea?'#ae8961':'#e1c8ab');
      }
    }
    for(let i=-5;i<=5;i++){
      box(i*1.87,.03,1.05,1.85,.06,2.03,surface);
      for(const side of [-1,1]){
        box(i*1.87,.076,1.05+side*.94,1.83,.045,.15,tea?'#a17e52':'#c79e8f');
        for(let j=0;j<3;j++){
          const x=i*1.87+(j-1)*.61;
          box(x,.074,1.05+side*.46,.56,.029,.72,tea?(j===1?'#d5b887':'#c4a377'):(j===1?'#e6d8bd':'#f2e3cb'));
        }
      }
    }
    const pier=region.settlement.pier;
    for(let j=0;j<pier.planks;j++){
      const z=pier.first+j*.52;
      box(pier.x,.095,z,pier.width,.16,.48,cedar);
      if(j%3===0)for(const side of [-1,1])
        cylinder(pier.x+side*pier.width/2,-.06,z,.18,1.38,.18,timber);
    }
    function shoreGarden() {
      // Keep the approaches open. Build the bank out toward the water so
      // the outer profile has coves, ledges and planting at different heights.
      for(let i=0;i<36;i++){
        const a=i*Math.PI/18, x=Math.cos(a)*region.rx, z=Math.sin(a)*region.rz;
        if(PQWorldMap.bridgeAt(region.x+x,region.z+z) ||
           (z>0 && Math.abs(x-pier.x)<3)) continue;
        const size=1.3+.52*Math.cos(3*a+.8);
        oval(x,-.59,z,size*2,.8,size*1.45,tea?'#856952':'#ae9c8e').rotation.y=-a;
        oval(x*.986,-.19,z*.986,size*1.65,.57,size*1.29,tea?'#b39264':'#dfc5ae');
        if(i%3===0){
          const xx=x*1.045, zz=z*1.045;
          oval(xx,-.93,zz,1.65,.67,1.2,tea?'#756859':'#978e86');
          for(let j=0;j<3;j++){
            const offset=(j-1)*.22;
            beam(x+offset,.02,z,x+offset*2,.55+j*.19,z+.18,.065,tea?brass:jade);
          }
        }
      }
    }
    function grove(x,z,height,blossom) {
      const bark=blossom?'#765858':timber;
      const crownColors=blossom?['#d88999','#e6a7ae','#f3c3bc']:['#a65d2e','#c67c35','#e7ad51'];
      cylinder(x,height*.23,z,.48,height*.46,.45,bark);
      for(let i=0;i<5;i++){
        const a=i*2.4+x, spread=height*(.22-i*.028);
        const xx=x+Math.cos(a)*spread, zz=z+Math.sin(a)*spread, y=height*(.53+i*.09);
        beam(x,height*(.31+i*.07),z,xx,y,zz,.17,bark);
        oval(xx,y+.32,zz,spread+1.45,blossom?1.23:1.62,spread+1.22,crownColors[i%3]);
        oval(xx+.29,y+.76,zz+.15,spread+.94,.91,spread+.8,crownColors[(i+1)%3]);
      }
    }
    function teaTerraces() {
      for(let row=0;row<3;row++){
        const x=-6.9+row*1.55, z=7.2+row*.55, y=.19+row*.21;
        box(x,y/2,z,1.48,y,3.65,'#967656');
        for(let j=0;j<6;j++){
          const zz=z-1.46+j*.58;
          box(x+.71,y*.69,zz,.14,y*.69+.11,.52,'#b39773');
          oval(x,y+.36,zz,1.38,.92,.9,'#526e42');
          oval(x+.17,y+.63,zz+.06,1.04,.49,.66,j%2?'#95a65a':'#849952');
        }
      }
      // An open cargo sampan beside the working pier.
      const x=pier.x+2.15,z=10.15;
      oval(x,-.68,z,1.75,1.13,4.66,'#66483b');
      oval(x,-.25,z,1.45,.37,3.87,cedar);
      for(const dz of [-.98,.02,1.02]){
        box(x,-.03,z+dz,1.18,.12,.25,cream);
        cylinder(x,.28,z+dz,.64,.59,.64,'#ad8050');
        cylinder(x,.49,z+dz,.67,.075,.67,timber);
      }
      beam(x,-.08,z-1.88,pier.x+.91,.46,z-2.55,.05,cream);
      grove(-11,-5.1,5.4,false);grove(6.8,-9,6.5,false);grove(12.35,1.4,4.8,false);
      grove(-8.6,7.2,3.4,false);grove(-2.6,-10.8,4.1,false);
      // Courtyard lanterns run from the shop roof to the postcard and tea stalls.
      lanternLine([-3.8,3.8,-5.15],[-10,2.85,1.75]);
      lanternLine([3.8,3.8,-5.15],[.25,3.04,5.18]);
      for(let i=0;i<4;i++){
        const x=4.5+(i%2)*1.04,z=10.05+Math.floor(i/2)*1.14;
        box(x,.41,z,.86,.78,.84,cedar);
        for(const dx of [-.32,.32])box(x+dx,.43,z,.09,.87,.89,brass);
        beam(x-.32,.09,z+.44,x+.32,.78,z+.44,.07,timber);
      }
    }
    function gardenWalk() {
      // Repeated floral arches frame the walk from the landing to the glasshouse.
      for(const z of [8.25,10.15,12.05]){
        for(const side of [-1,1]){
          const x=side*.94;
          cylinder(x,.2,z,.43,.4,.43,cream);
          beam(x,.36,z,x,2.52,z,.105,jade);
          beam(x,2.52,z,side*.64,3.03,z,.105,jade);
          beam(side*.64,3.03,z,0,3.26,z,.105,jade);
          for(let k=0;k<4;k++){
            const xx=x-side*k*.16, y=2.38+k*.22;
            oval(xx,y,z+.08,.45,.28,.28,leaf);
            oval(xx+.12,y+.12,z+.17,.28,.24,.21,k%2?coral:'#f3c3b6');
          }
        }
      }
      for(const side of [-1,1]){
        beam(side*.94,2.51,8.22,side*.94,2.51,12.1,.08,jade);
        for(let i=0;i<6;i++){
          const z=8.4+i*.64;
          box(side*.46,.193,z,.23,.025,.23,i%2?mint:coral).rotation.y=Math.PI/4;
        }
      }
      grove(-12,-5,4.6,true);grove(8.1,-9.3,5.55,true);grove(12.8,2.7,4.1,true);
      grove(-10,6.7,3.5,true);grove(4.6,10,3.85,true);
      // Sweeping low beds follow the two outer banks, leaving the doors and ferry approach clear.
      for(const [start,end] of [[-.53,.56],[2.42,3.46]]){
        for(let i=0;i<13;i++){
          const a=start+(end-start)*i/12;
          const x=region.rx*.83*Math.cos(a), z=region.rz*.83*Math.sin(a);
          if(PQWorldMap.bridgeAt(x+region.x,z+region.z))continue;
          const hedge=oval(x,.26,z,1.48,.65,1.23,'#60946c');
          hedge.rotation.y=-a;
          for(let j=0;j<4;j++){
            const spin=i*1.85+j*2.3;
            const xx=x+Math.cos(spin)*.42,zz=z+Math.sin(spin)*.34;
            const color=['#e48699','#f5c899','#e4aec4'][(i+j)%3];
            oval(xx,.55+(j%2)*.11,zz,.35,.39,.36,color);
            oval(xx+.04,.72+(j%2)*.11,zz,.16,.09,.16,cream);
          }
          oval(x*1.052,.12,z*1.052,.65,.34,.62,'#e8d8bd');
        }
      }
      lanternLine([-10.9,3.18,.41],[-6.1,3.07,-4.15]);
      lanternLine([5.5,2.58,-5.48],[8.1,2.8,-4.13]);
      // Tile rosettes tie the arrival court to the flower emblem above the entrance.
      for(const x of [-7,0,6]){
        cylinder(x,.076,1.05,1.67,.034,1.67,'#dfb8a3');
        for(let i=0;i<6;i++){
          const a=i*Math.PI/3;
          const tile=oval(x+Math.cos(a)*.41,.106,1.05+Math.sin(a)*.41,.62,.065,.27,i%2?jade:cream);
          tile.rotation.y=-a;
        }
        cylinder(x,.124,1.05,.29,.035,.29,brass);
      }
    }
    shoreGarden();
    if(tea){
      teaTerraces();
      lamp(-7.5,2.9,2.8);lamp(4.3,3.65,2.8);
      table(-5,3.5,2.3,.95);pot(-5,1.17,3.5,.8);
      person(-5.7,2.86,'#72878b',{seated:true});
      box(-5.7,.38,2.85,.63,.76,.6,timber);
    }else{
      gardenWalk();
      planter(-11,-3.5,3.5,1.05);planter(9,-.7,3.1,.91);
      for(const x of [-6.6,-4.25]){
        for(const z of [.2,1.65])cylinder(x,.51,z,.13,1.02,.13,jade);
        beam(x,.88,.2,x,.88,1.65,.07,coral);
      }
      person(-5.4,.65,'#7ca6a0',{bag:true});
      person(-5.6,2.27,'#c39071',{hair:'#dcd0b8'});
    }

    const district=new T.Group();district.name=root.name;district.position.copy(root.position);
    const opaque=new T.Mesh(bake(solid,root),surfaceMat);
    opaque.castShadow=opaque.receiveShadow=true;district.add(opaque);
    district.add(new T.Mesh(bake(lights,root),new T.MeshBasicMaterial({vertexColors:true})));
    if(panes.length){
      const glazing=new T.Mesh(bake(panes,root),new T.MeshStandardMaterial({vertexColors:true,transparent:true,opacity:.34,side:T.DoubleSide,depthWrite:false,roughness:.25}));
      district.add(glazing);
    }
    // All plaques use the original story wording and share one offline texture.
    const canvas=document.createElement('canvas');
    canvas.width=512;canvas.height=1024;
    const ctx=canvas.getContext('2d'), positions=[], uvs=[], indices=[];
    signs.forEach(({x,y,z,width,height,text},i)=>{
      const top=i*96;
      ctx.fillStyle=region.id==='growth'?timber:slate;
      ctx.fillRect(0,top,512,88);
      ctx.strokeStyle=region.id==='growth'?brass:mint;
      ctx.lineWidth=4;ctx.strokeRect(6,top+6,500,76);
      ctx.fillStyle=cream;ctx.font='bold 48px system-ui,sans-serif';
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(text,256,top+44,474);
      const l=x-width/2,r=x+width/2,t=y+height/2,b=y-height/2;
      positions.push(l,b,z,r,b,z,r,t,z,l,t,z);
      const maxV=1-(top+1)/1024,minV=1-(top+87)/1024;
      uvs.push(0,minV,1,minV,1,maxV,0,maxV);
      const n=i*4;indices.push(n,n+1,n+2,n,n+2,n+3);
    });
    const atlas=new T.CanvasTexture(canvas);atlas.colorSpace=T.SRGBColorSpace;
    const boards=new T.BufferGeometry();
    boards.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    boards.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));boards.setIndex(indices);
    district.add(new T.Mesh(boards,new T.MeshBasicMaterial({map:atlas})));
    district.add(moving);
    for(const mesh of district.children)mesh.userData.continentId=region.id;
    for(const g of [cube,drum,bud,loop])g.dispose();
    for(const mat of materials.values())mat.dispose();
    return {district, moving};
  }
  window.PQSettlements = {build};
})();
