/* A single on-demand renderer for the reference book and collectible plates.
   Titles, definitions and citations remain real text beside the object. */
window.PQTermDisplay = (() => {
  const T = THREE;
  const views = new WeakMap();
  let renderer, scene, model, camera, host, observer;
  let drag, yaw=0, pitch=0;
  function clearScene(){
    observer?.disconnect();
    if(scene){
      const geometries=new Set(), materials=new Set();
      scene.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);materials.add(o.material);}});
      geometries.forEach(g=>g.dispose());
      materials.forEach(m=>{m.map?.dispose();m.dispose();});
    }
    renderer?.domElement.remove();
    scene=model=host=drag=null;
  }
  function draw(){
    if(!host?.isConnected || !host.clientWidth || !host.clientHeight)return;
    const w=host.clientWidth,h=host.clientHeight;
    renderer.setSize(w,h,false);
    const radius=views.get(host).book?2.95:2.06;
    const aspect=w/h;
    const half=Math.max(radius/aspect,views.get(host).book?1.65:1.8);
    camera.left=-half*aspect;camera.right=half*aspect;
    camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();
    model.rotation.set(pitch,yaw,0,'YXZ');
    renderer.render(scene,camera);
  }
  function illustration(term,book){
    const c=document.createElement('canvas');c.width=640;c.height=800;
    const g=c.getContext('2d');
    const ink=book?'#344d42':'#e8d5a3',trim=book?'#9f895e':'#c9a365';
    g.fillStyle=book?'#f4e6c4':'#214b49';g.fillRect(0,0,640,800);
    g.strokeStyle=trim;g.lineWidth=4;g.strokeRect(21,22,598,756);g.lineWidth=1;g.strokeRect(32,33,576,734);
    g.globalAlpha=.22;
    for(let y=75;y<730;y+=40){g.beginPath();g.moveTo(52,y);g.lineTo(588,y);g.stroke();}
    g.globalAlpha=1;g.fillStyle=ink;g.textAlign='center';
    for(const r of [132,121]){g.beginPath();g.arc(320,295,r,0,Math.PI*2);g.stroke();}
    g.font='104px system-ui';g.fillText(term?.icon || (term?'✦':'◇'),320,331);
    g.font='bold 43px system-ui';const lines=[];let line='';
    for(const char of Array.from(term?.name || '术语图鉴')){
      if(line && g.measureText(line+char).width>504){lines.push(line.trim());line='';}
      line+=char;
    }
    lines.push(line.trim());
    lines.forEach((text,i)=>g.fillText(text,320,510+i*54,520));
    g.fillStyle=trim;g.fillRect(248,723,144,3);
    const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;
    return new T.MeshStandardMaterial({map:tex,roughness:.84});
  }
  function build(term,book){
    scene=new T.Scene();model=new T.Group();scene.add(model);
    camera=new T.OrthographicCamera(-4,4,2,-2,.1,45);
    camera.position.set(0,0,9);camera.lookAt(0,0,0);
    scene.add(new T.HemisphereLight(0xfff6df,0x749797,2));
    const key=new T.DirectionalLight(0xffecc4,2.9);key.position.set(-4,6,5);scene.add(key);
    const rim=new T.DirectionalLight(0x9dd9d6,1.7);rim.position.set(4,2,-2);scene.add(rim);
    const leather=new T.MeshStandardMaterial({color:0x305f55,roughness:.72});
    const brass=new T.MeshStandardMaterial({color:0xd2aa67,metalness:.58,roughness:.34});
    const paper=new T.MeshStandardMaterial({color:0xe4cfaa,roughness:.94});
    const dark=new T.MeshStandardMaterial({color:0x374b42,roughness:.74});
    const cube=new T.BoxGeometry(1,1,1);
    function solid(parent,geo,mat,x,y,z){
      const mesh=new T.Mesh(geo,mat);mesh.position.set(x,y,z);parent.add(mesh);return mesh;
    }
    function slab(parent,mat,x,y,z,w,h,d){const m=solid(parent,cube,mat,x,y,z);m.scale.set(w,h,d);return m;}
    function face(parent,x,z,w,h){
      const surface=new T.PlaneGeometry(w,h,book?16:1,1);
      if(book){
        const vertices=surface.attributes.position;
        for(let i=0;i<vertices.count;i++){
          const u=vertices.getX(i)/w+.5;
          vertices.setZ(i,.068*Math.sin(Math.PI*u));
        }
        surface.computeVertexNormals();
      }
      solid(parent,surface,illustration(term,book),x,0,z);
    }
    function corners(parent,cx,w,h,z){
      for(const a of [-1,1])for(const b of [-1,1]){
        slab(parent,brass,cx+a*(w/2-.2),b*(h/2-.048),z,.4,.095,.08);
        slab(parent,brass,cx+a*(w/2-.045),b*(h/2-.19),z,.09,.38,.08);
      }
    }
    function compass(parent,cx,z){
      const ring=new T.TorusGeometry(.7,.048,8,48);
      solid(parent,ring,brass,cx,.1,z);
      for(let i=0;i<12;i++){
        const a=i*Math.PI/6;
        slab(parent,brass,cx+Math.sin(a)*.6,.1+Math.cos(a)*.6,z,.032,.11,.045).rotation.z=-a;
      }
      for(const side of [-1,1]){
        const needle=solid(parent,new T.ConeGeometry(.19,.69,4),side>0?leather:brass,cx+side*.12,.1+side*.32,z+.08);
        needle.rotation.z=side>0?-.36:Math.PI-.36;
      }
      solid(parent,new T.SphereGeometry(.09,12,8),brass,cx,.1,z+.17);
    }
    if(book){
      for(const side of [-1,1]){
        const leaf=new T.Group();model.add(leaf);leaf.rotation.y=side*.16;
        const x=side*1.16;
        slab(leaf,leather,x,0,-.23,2.34,3.17,.17);
        slab(leaf,paper,x,0,-.002,2.23,3.02,.30);
        for(let i=0;i<4;i++)slab(leaf,i%2?paper:brass,x+side*1.115,0,-.11+i*.061,.014,2.94,.012);
        corners(leaf,x,2.34,3.17,-.13);
        if(side>0)face(leaf,x,.155,2.21,2.99);
        else{
          compass(leaf,x,.23);
          for(const y of [-.95,-.82,.97])slab(leaf,brass,x,y,.16,1.42,.018,.012);
          slab(leaf,leather,x-.44,-1.38,.18,.15,.57,.04);
        }
      }
      slab(model,dark,0,0,-.12,.17,3.18,.26);
      for(const y of [-1.16,-.6,.6,1.16])slab(model,brass,0,y,-.01,.2,.072,.16);
    }else{
      slab(model,leather,0,0,0,2.12,2.86,.19);
      slab(model,brass,0,0,.105,2.04,2.78,.07);
      face(model,0,.147,1.96,2.69);
      corners(model,0,2.12,2.86,.15);
      const mount=new T.Group();model.add(mount);mount.position.set(0,.36,.16);
      const bezel=new T.TorusGeometry(.415,.035,8,48);
      solid(mount,bezel,brass,0,0,.035);
      if(term?.icon==='🧭'){
        solid(mount,new T.CircleGeometry(.4,40),paper,0,0,.04);
        const dial=new T.Group();mount.add(dial);dial.scale.setScalar(.49);
        compass(dial,0,.13);
      }
      const back=new T.Group();back.rotation.y=Math.PI;model.add(back);compass(back,0,.14);
    }
    yaw=book?-.29:-.48;pitch=book?-.47:-.18;
  }
  function setup(){
    if(renderer)return;
    renderer=new T.WebGLRenderer({alpha:true,antialias:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.outputColorSpace=T.SRGBColorSpace;
    const canvas=renderer.domElement;canvas.setAttribute('aria-hidden','true');
    canvas.onpointerdown=e=>{if(!e.isPrimary||e.button!==0)return;host.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY};};
    canvas.onpointermove=e=>{
      if(drag?.id!==e.pointerId)return;
      yaw+=(e.clientX-drag.x)*.014;pitch=Math.max(-1.15,Math.min(.95,pitch+(e.clientY-drag.y)*.012));drag.x=e.clientX;drag.y=e.clientY;draw();
    };
    canvas.onlostpointercapture=()=>{drag=null;};
    observer=new ResizeObserver(draw);
  }
  function show(el,term,book=false){
    clearScene();
    try{setup();}catch{el.hidden=true;return;}
    views.set(el,{term,book});host=el;el.hidden=false;el.tabIndex=0;
    el.setAttribute('role','group');el.setAttribute('aria-label',(term?.name || '术语图鉴')+'。'+PQ.cameraHelp.cardHint);
    el.title=PQ.cameraHelp.cardHint;
    el.onkeydown=e=>{
      if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
      e.preventDefault();e.stopPropagation();
      if(e.key==='ArrowLeft')yaw-=.16;
      if(e.key==='ArrowRight')yaw+=.16;
      if(e.key==='ArrowUp')pitch=Math.max(-1.15,pitch-.14);
      if(e.key==='ArrowDown')pitch=Math.min(.95,pitch+.14);
      draw();
    };
    el.append(renderer.domElement);build(term,book);observer.observe(el);draw();
  }
  function release(el){
    if(!el || el!==host)return;
    clearScene();
    const next=[...document.querySelectorAll('.term-stage')].find(e=>views.has(e)&&e!==el&&e.getClientRects().length);
    if(next){const v=views.get(next);show(next,v.term,v.book);}
  }
  return {show,release};
})();
