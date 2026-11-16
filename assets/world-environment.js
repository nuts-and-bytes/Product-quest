/* Product Quest atmosphere: linear HDR lighting, water, GPU particles, foliage and expedition UI.
   All assets are generated locally. No network dependency; compatible with the bundled Three r170. */
(function () {
  'use strict';
  const T=THREE, W=PQWorldMap;
  const rand=(n)=>{const v=Math.sin(n*127.1+31.7)*43758.5453;return v-Math.floor(v);};
  const color=h=>new T.Color(h);
  const vertex=`varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
  const noise=`
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
    float fbm(vec2 p){return .55*noise(p)+.27*noise(p*2.03)+.13*noise(p*4.07);}`;

  // Bake static colored geometry into one draw. Used for distant characters and boardwalks.
  function lowGeometry(g,mapped=false){
    const p=g.parameters;if(!p)return g.clone();
    if(g.type==='SphereGeometry')return new T.SphereGeometry(p.radius,mapped?16:8,mapped?10:6,p.phiStart,p.phiLength,p.thetaStart,p.thetaLength);
    if(g.type==='CapsuleGeometry')return new T.CapsuleGeometry(p.radius,p.length,3,6);
    if(g.type==='CylinderGeometry')return new T.CylinderGeometry(p.radiusTop,p.radiusBottom,p.height,6,1,p.openEnded,p.thetaStart,p.thetaLength);
    if(g.type==='TorusGeometry')return new T.TorusGeometry(p.radius,p.tube,4,10,p.arc);
    return g.clone();
  }

  function bake(objects,root,simplify=false) {
    const p=[],n=[],c=[],ix=[];let base=0;
    root.updateWorldMatrix(true,true);
    const inverse=root.matrixWorld.clone().invert(),normal=new T.Matrix3(),v=new T.Vector3();
    objects.forEach(m=>{
      if(!m.geometry||Array.isArray(m.material))return;
      const g=simplify?lowGeometry(m.geometry):m.geometry,a=g.attributes.position,b=g.attributes.normal,vc=g.attributes.color;
      const mat=inverse.clone().multiply(m.matrixWorld);normal.getNormalMatrix(mat);
      for(let j=0;j<a.count;j++){
        v.fromBufferAttribute(a,j).applyMatrix4(mat);p.push(v.x,v.y,v.z);
        if(b)v.fromBufferAttribute(b,j).applyNormalMatrix(normal);else v.set(0,1,0);n.push(v.x,v.y,v.z);
        const co=m.material.color||color('#ffffff');
        c.push(co.r*(vc?vc.getX(j):1),co.g*(vc?vc.getY(j):1),co.b*(vc?vc.getZ(j):1));
      }
      if(g.index)for(let j=0;j<g.index.count;j++)ix.push(base+g.index.getX(j));
      else for(let j=0;j<a.count;j++)ix.push(base+j);
      base+=a.count;if(simplify)g.dispose();
    });
    const g=new T.BufferGeometry();
    g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('normal',new T.Float32BufferAttribute(n,3));
    g.setAttribute('color',new T.Float32BufferAttribute(c,3));g.setIndex(ix);g.computeBoundingSphere();
    return g;
  }

  class WorldEnvironment {
    constructor(world) {
      this.world=world;this.scene=world.scene;this.time={value:0};this.systems=[];this.beacons=[];this.lods=[];
      this.reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.quality='auto';
      try{this.quality=localStorage.getItem('pq-graphics')||'auto';}catch(e){}
      if(!['auto','cinema','balanced','eco'].includes(this.quality))this.quality='auto';
      this.governor=new PQQualityGovernor(innerWidth<700?1:2);this.lastFrame=0;this.warmup=performance.now()+5000;
      this.createSky();this.createWater();this.batchRoads();this.createBridges();this.createBiomes();this.createFoliage();this.createParticles();this.createPost();this.createBuildingRewards();this.createUI();
      this.prepareLods();this.setQuality(this.quality,false);
      world.scene.add(world.sunLight.target);
      world.sunLight.shadow.normalBias=.035;
      world.sunLight.shadow.radius=2;
      world.sunLight.shadow.bias=-.00008;
      // Keep the skyline readable: opening cloud banks stay beyond the town, above street-level views.
      world.cloudGate.forEach(c=>{c.baseX*=2.2;c.baseZ*=2.2;c.baseY=22;c.baseScale*=.65;c.inner=false;});
      world.clouds.forEach(c=>c.mesh.visible=false);
      [world.balloon,world.balloon2].forEach(b=>{b.castShadow=false;b.receiveShadow=false;});
      world.fountainDrops.forEach(d=>d.mesh.visible=false);world.waterfallDrops.forEach(d=>d.mesh.visible=false);
      world.fireflies.visible=false;world.starsMesh.material.depthWrite=false;
      world.starsMesh.material.map=this.dotTexture();world.starsMesh.material.size=.75;
      world.starsMesh.material.blending=T.AdditiveBlending;
      const beam=world.lighthouseBeam;beam.material.dispose();
      beam.material=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,
        uniforms:{uAlpha:{value:0}},
        vertexShader:`varying vec2 vUv;varying vec3 vNormal,vView;void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(position,1.);vNormal=normalize(normalMatrix*normal);vView=-mv.xyz;gl_Position=projectionMatrix*mv;}`,
        fragmentShader:`varying vec2 vUv;uniform float uAlpha;void main(){float y=clamp(vUv.y,0.,1.);float fade=y*y*(1.-smoothstep(.8,1.,y));float a=clamp(fade*uAlpha,0.,.14);if(a<.001)discard;gl_FragColor=vec4(.9,.76,.43,a);}`});
    }

    dotTexture(){
      if(this._dot)return this._dot;
      const cv=document.createElement('canvas');cv.width=cv.height=32;const x=cv.getContext('2d');
      const g=x.createRadialGradient(16,16,0,16,16,16);g.addColorStop(0,'white');g.addColorStop(.18,'rgba(255,255,255,.95)');g.addColorStop(.5,'rgba(255,255,255,.22)');g.addColorStop(1,'rgba(255,255,255,0)');
      x.fillStyle=g;x.fillRect(0,0,32,32);this._dot=new T.CanvasTexture(cv);return this._dot;
    }

    batchRoads(){
      const group=this.world.roadGroup;if(!group)return;
      const mesh=new T.Mesh(bake([...group.children],group),new T.MeshStandardMaterial({vertexColors:true,roughness:.9}));
      mesh.receiveShadow=true;this.scene.remove(group);this.scene.add(mesh);
      const materials=new Set();group.children.forEach(m=>{m.geometry.dispose();materials.add(m.material);});materials.forEach(m=>m.dispose());
    }

    createSky(){
      this.skyUniforms={uTime:this.time,uTop:{value:color('#387dad')},uHorizon:{value:color('#e0c8ae')},uSun:{value:new T.Vector3()},uSunColor:{value:color('#ffdc9a')},uNight:{value:0}};
      const mat=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:this.skyUniforms,
        vertexShader:`varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader:`varying vec3 vDir;uniform vec3 uTop,uHorizon,uSun,uSunColor;uniform float uTime,uNight;${noise}
          void main(){vec3 d=normalize(vDir);float h=max(d.y,0.);vec3 c=mix(uHorizon,uTop,pow(h,.48));
          float sun=max(dot(d,normalize(uSun)),0.);c+=uSunColor*(pow(sun,900.)*5.+pow(sun,24.)*.13)*(1.-uNight);
          vec2 p=d.xz/max(.15,d.y+.2)*2.;float clouds=smoothstep(.52,.78,fbm(p+vec2(uTime*.006,0.)));
          c=mix(c,uHorizon*1.18,clouds*.22*smoothstep(0.,.12,d.y));
          float band=exp(-pow((d.x*.46+d.y*.65+d.z*.55-.30)*6.,2.));
          c+=vec3(.045,.037,.085)*band*fbm(d.xz*15.)*uNight;
          gl_FragColor=vec4(c,1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          }`});
      this.sky=new T.Mesh(new T.SphereGeometry(350,32,16),mat);this.sky.renderOrder=-10;this.sky.frustumCulled=false;this.scene.add(this.sky);
    }

    createWater(){
      const old=this.world.ocean;this.scene.remove(old);old.geometry.dispose();old.material.dispose();this.world.ocean=null;
      this.world.foam.visible=false;
      this.waterUniforms={uTime:this.time,uDeep:{value:color('#164b5e')},uShallow:{value:color('#53b9b1')},uSky:{value:color('#a1cdd1')},uSun:{value:new T.Vector3(1,1,1)},uSunColor:{value:color('#fff0ca')},uNight:{value:0}};
      const geo=new T.PlaneGeometry(700,700,80,80);geo.rotateX(-Math.PI/2);
      const mat=new T.ShaderMaterial({uniforms:this.waterUniforms,
        vertexShader:`uniform float uTime;varying vec3 vWorld;void main(){vec3 p=position;p.y+=sin(p.x*.20+uTime*.72)*.055+sin(p.z*.27-uTime*.6)*.035;vWorld=(modelMatrix*vec4(p,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`,
        fragmentShader:`varying vec3 vWorld;uniform float uTime,uNight;uniform vec3 uDeep,uShallow,uSky,uSun,uSunColor;${noise}
          float shore(vec2 p){float a=atan(p.y,p.x);float d=(length(p/vec2(38.5,33.5))+.085*sin(a*3.+.6)+.05*cos(a*5.-1.1)-1.)*34.;
          d=min(d,(length((p-vec2(62,-36))/vec2(16,13))-1.)*13.);d=min(d,(length((p-vec2(72,13))/vec2(17,14))-1.)*14.);return min(d,(length((p-vec2(29,53))/vec2(18,14))-1.)*14.);}
          void main(){vec2 p=vWorld.xz;float d=shore(p);float w=fbm(p*.32+uTime*.06);
          vec2 flow=p*.38+vec2(uTime*.04,-uTime*.03);float center=noise(flow);
          vec3 n=normalize(vec3((center-noise(flow+vec2(.12,0.)))*.7,1.,(center-noise(flow+vec2(0.,.12)))*.7));
          vec3 v=normalize(cameraPosition-vWorld),l=normalize(uSun);float fres=pow(1.-max(dot(v,n),0.),4.);
          vec3 c=mix(uShallow,uDeep,smoothstep(0.,18.,d));c=mix(c,uSky,fres*.6);
          float spec=pow(max(dot(n,normalize(l+v)),0.),220.);c+=uSunColor*spec*(.8-uNight*.75);
          float wave=.5+.5*sin(d*2.8-uTime*1.6+w*2.);float foam=smoothstep(.80,.98,wave)*exp(-max(d,0.)*.65)*smoothstep(-.2,.7,d);
          c+=vec3(.50,.62,.56)*foam*(1.-uNight*.7);c+=(noise(p*2.+uTime*.08)-.5)*.012;
          float haze=1.-exp(-length(cameraPosition-vWorld)*.002);c=mix(c,uSky,haze*.55);
          gl_FragColor=vec4(c,1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          }`});
      this.water=new T.Mesh(geo,mat);this.water.position.y=.18;this.scene.add(this.water);
    }

    createBridges(){
      const group=new T.Group();this.scene.add(group);
      const box=new T.BoxGeometry(1,1,1),mats={wood:new T.MeshStandardMaterial({color:'#b6936e',roughness:.84}),dark:new T.MeshStandardMaterial({color:'#534b46',roughness:.9}),rope:new T.MeshStandardMaterial({color:'#dfcab2',roughness:.8})};
      const add=(x,y,z,sx,sy,sz,angle,mat)=>{const m=new T.Mesh(box,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.y=angle;group.add(m);return m;};
      this.lanternPositions=[];
      add(-15,.90,14.85,2.1,.24,3.5,0,mats.wood);
      W.routes.forEach(route=>route.points.forEach((b,i)=>{
        if(!i)return;const a=route.points[i-1],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),angle=Math.atan2(dx,dz),rx=dz/len,rz=-dx/len;
        const count=Math.ceil(len/.62);
        for(let j=0;j<count;j++){
          const t=(j+.5)/count,x=a[0]+dx*t,z=a[1]+dz*t;
          if(W.mainDistance(x,z)<.85||W.regionAt(x,z))continue;
          add(x,.87,z,3.65,.24,len/count*.95,angle,mats.wood);
          for(const side of [-1,1])add(x+rx*side*1.72,1.85,z+rz*side*1.72,.08,.08,len/count*1.02,angle,mats.rope);
        }
        for(let side of [-1,1]){
          for(let j=0;j<=Math.ceil(len/4);j++){
            const t=j/Math.ceil(len/4),x=a[0]+dx*t+rx*side*1.72,z=a[1]+dz*t+rz*side*1.72;
            if(W.mainDistance(x,z)<.85||W.regionAt(x,z))continue;
            add(x,.82,z,.18,2.30,.18,angle,mats.dark);
            if(j%2===0&&side===1)this.lanternPositions.push([x,2.1,z]);
          }
        }
      }));
      const merged=new T.Mesh(bake([...group.children],group),new T.MeshStandardMaterial({vertexColors:true,roughness:.85}));merged.castShadow=true;merged.receiveShadow=true;
      this.scene.remove(group);this.scene.add(merged);box.dispose();Object.values(mats).forEach(m=>m.dispose());
      this.lanternMat=new T.MeshBasicMaterial({color:'#ffd894'});
      const lanterns=new T.InstancedMesh(new T.BoxGeometry(.22,.32,.22),this.lanternMat,this.lanternPositions.length),dummy=new T.Object3D();
      this.lanternPositions.forEach((p,i)=>{dummy.position.set(...p);dummy.updateMatrix();lanterns.setMatrixAt(i,dummy.matrix);});this.scene.add(lanterns);
    }

    createBiomes(){
      const pieces=new T.Group();this.scene.add(pieces);
      const stem=new T.CylinderGeometry(.16,.26,2.2,6),crown=new T.IcosahedronGeometry(1.7,1);
      const treeMats=['#bf722c','#e8b45b','#ce9050','#a7b2c6','#e6adb5','#d58198'].map(c=>new T.MeshStandardMaterial({color:c,roughness:.85}));
      const trunkMat=new T.MeshStandardMaterial({color:'#695d50',roughness:1});
      W.regions.forEach((r,ri)=>{
        for(let i=0;i<30;i++){
          const a=rand(i*7+ri*100)*Math.PI*2,rr=.48+rand(i*5+ri*200)*.39,x=r.x+Math.cos(a)*r.rx*rr,z=r.z+Math.sin(a)*r.rz*rr;
          if(W.bridgeAt(x,z))continue;
          if(ri===1){
            const crystal=new T.Mesh(new T.ConeGeometry(.7+rand(i)*.7,3+rand(i*2)*3,5),new T.MeshStandardMaterial({color:i%2?'#729aa7':'#9bbfd0',roughness:.3,metalness:.25}));crystal.position.set(x,2.1,z);crystal.rotation.z=(rand(i)-.5)*.2;pieces.add(crystal);
          }else{
            const st=new T.Mesh(stem,trunkMat);st.position.set(x,2.1,z);pieces.add(st);
            const cr=new T.Mesh(crown,treeMats[ri===0?i%3:4+i%2]);cr.position.set(x,3.7,z);cr.scale.set(1+rand(i)*.5,.9+rand(i*2),1);pieces.add(cr);
          }
        }
        const b=new T.Group();b.position.set(r.x+3,1.02,r.z-2);
        const stone=new T.MeshStandardMaterial({color:ri===1?'#38596b':'#b8b1a0',roughness:.76,metalness:.12});
        const pedestal=new T.Mesh(new T.CylinderGeometry(1.3,1.6,.45,8),stone);pedestal.position.y=.2;b.add(pedestal);
        const pillar=new T.Mesh(new T.CylinderGeometry(.48,.65,2.6,6),stone);pillar.position.y=1.7;b.add(pillar);
        const symbol=ri===2?new T.TorusKnotGeometry(.52,.12,64,8,2,3):ri===0?new T.IcosahedronGeometry(.72,0):new T.OctahedronGeometry(.75);
        const crystal=new T.Mesh(symbol,new T.MeshStandardMaterial({color:r.color,emissive:r.color,emissiveIntensity:1.6,roughness:.22,metalness:.3}));crystal.position.y=3.75;b.add(crystal);
        const ring=new T.Mesh(new T.TorusGeometry(1.05,.035,6,48),new T.MeshBasicMaterial({color:r.color}));ring.position.y=3.75;ring.rotation.x=.35;b.add(ring);
        const light=new T.PointLight(r.color,3,11,2);light.position.y=3.5;b.add(light);
        b.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;}});this.scene.add(b);
        const hit=new T.Mesh(new T.CylinderGeometry(1.6,1.6,6,8),new T.MeshBasicMaterial({visible:false}));hit.position.copy(b.position);hit.position.y=3;hit.userData.expeditionId=r.id;this.scene.add(hit);this.world.hitTargets.push(hit);
        this.beacons.push({group:b,crystal,ring,light,region:r});
      });
      const combined=new T.Mesh(bake([...pieces.children],pieces),new T.MeshStandardMaterial({vertexColors:true,roughness:.8,metalness:.05}));combined.castShadow=true;combined.receiveShadow=true;
      this.scene.remove(pieces);this.scene.add(combined);
      const disposed=new Set();pieces.traverse(m=>{if(m.geometry&&!disposed.has(m.geometry)){disposed.add(m.geometry);m.geometry.dispose();}if(m.material&&!disposed.has(m.material)){disposed.add(m.material);m.material.dispose();}});
    }

    createFoliage(){
      const points=[];
      for(let i=0;i<12000;i++){
        const x=-36+rand(i*3+1)*126,z=-48+rand(i*3+2)*112,r=W.regionAt(x,z),d=W.mainDistance(x,z),radius=Math.hypot(x,z);
        if(W.bridgeAt(x,z)||!W.canWalk(x,z,PQ.buildings))continue;
        if(!r&&(d>.86||radius<16.5||z<-23))continue;
        if(r&&Math.hypot(x-r.x,z-r.z)<5)continue;
        if(PQ.buildings.some(b=>Math.abs(x-b.wx)<6&&Math.abs(z-b.wz)<6))continue;
        points.push({x,z,r});
      }
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute([-.12,0,0,.12,0,0,.04,.45,0,-.04,.7,0],3));geo.setIndex([0,1,2,0,2,3]);geo.computeVertexNormals();
      const mat=new T.MeshStandardMaterial({color:'#ffffff',roughness:.95,side:T.DoubleSide});
      mat.onBeforeCompile=s=>{s.uniforms.uWind=this.time;s.vertexShader='uniform float uWind;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        float phase=instanceMatrix[3].x*.34+instanceMatrix[3].z*.22;transformed.x+=sin(uWind*1.4+phase)*position.y*position.y*.27;`);};
      const mesh=new T.InstancedMesh(geo,mat,points.length),dummy=new T.Object3D();
      points.forEach((p,i)=>{dummy.position.set(p.x,1.02,p.z);dummy.rotation.y=rand(i*4)*Math.PI;dummy.scale.setScalar(.6+rand(i*6)*.7);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
        mesh.setColorAt(i,color(p.r?(p.r.id==='growth'?(i%2?'#b9a450':'#c48e42'):p.r.id==='ai'?'#71a6a4':i%3?'#8aaf80':'#d8acb1'):(i%2?'#829c58':'#62916a')));});
      mesh.receiveShadow=true;mesh.frustumCulled=false;this.scene.add(mesh);this.grass=mesh;this.grassCount=points.length;
    }

    particleSystem(count,kind,origin,tint,size){
      const geo=new T.BufferGeometry(),p=[],seeds=[];
      for(let i=0;i<count;i++){p.push(0,0,0);seeds.push(rand(i*4+kind),rand(i*4+1+kind),rand(i*4+2+kind),rand(i*4+3+kind));}
      geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('seed',new T.Float32BufferAttribute(seeds,4));
      const uniforms={uTime:this.time,uKind:{value:kind},uOrigin:{value:new T.Vector3(...origin)},uColor:{value:color(tint)},uSize:{value:size},uOpacity:{value:1},uScale:{value:500}};
      const mat=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,blending:kind===2?T.NormalBlending:T.AdditiveBlending,
        vertexShader:`attribute vec4 seed;uniform float uTime,uKind,uSize,uScale;uniform vec3 uOrigin;varying float vLife;varying float vPhase;
          void main(){vec3 p=uOrigin;float t=uTime;vLife=1.;vPhase=seed.w*6.283+t;
          if(uKind<.5){p+=vec3((seed.x-.5)*65.+sin(t*.3+seed.w*30.)*1.4,seed.y*3.5+sin(t*.6+seed.x*30.)*.5,(seed.z-.5)*55.);vLife=.35+.65*pow(.5+.5*sin(t*1.8+seed.w*40.),3.);}
          else if(uKind<1.5){float age=fract(seed.x+t*.48);float a=seed.z*6.283;p+=vec3(cos(a)*age*1.65,4.4*age-4.1*age*age,sin(a)*age*1.65);vLife=sin(age*3.14159);}
          else if(uKind<2.5){p+=vec3((seed.x-.5)*22.+sin(t*.4+seed.z*30.)*2.,mod(seed.y*9.-t*.45,9.),(seed.z-.5)*19.+cos(t*.3+seed.x*20.));vLife=.7;}
          else if(uKind<3.5){float age=fract(seed.x+t*.22);p+=vec3((seed.y-.5)*(1.+age*4.),age*2.,(seed.z-.5)*(1.+age*4.));vLife=sin(age*3.14159)*.25;}
          else {p+=vec3((seed.x-.5)*58.+sin(t*.18+seed.z*6.),seed.y*8.+sin(t*.35+seed.w*12.)*.4,(seed.z-.5)*49.+cos(t*.2+seed.x*9.));vLife=.25+.4*pow(.5+.5*sin(t*.8+seed.w*50.),2.);}
          vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(uSize*uScale/max(1.,-mv.z),1.,48.);}`,
        fragmentShader:`uniform vec3 uColor;uniform float uOpacity,uKind;varying float vLife,vPhase;void main(){vec2 p=gl_PointCoord-.5;
          float a;if(uKind>1.5&&uKind<2.5){float c=cos(vPhase),s=sin(vPhase);p=mat2(c,-s,s,c)*p;a=1.-smoothstep(.22,.5,length(p*vec2(1.,1.7)));}else a=exp(-dot(p,p)*20.)*(1.-smoothstep(.38,.5,length(p)));
          if(a<.01)discard;gl_FragColor=vec4(uColor*(uKind<.5?2.8:1.1),a*vLife*uOpacity);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          }`});
      const mesh=new T.Points(geo,mat);mesh.frustumCulled=false;this.scene.add(mesh);this.systems.push({mesh,kind,count});return mesh;
    }

    createParticles(){
      this.particleSystem(480,0,[0,1.7,0],'#d9ff9a',.27);
      this.particleSystem(260,0,[65,2,9],'#95f3f0',.23);
      this.particleSystem(240,1,[0,2.1,0],'#aedfea',.18);
      this.particleSystem(180,2,[-22,1,-6],'#f7c0c6',.2);
      this.particleSystem(280,2,[62,1,-36],'#e6ba71',.24);
      this.particleSystem(280,2,[29,1,53],'#f1b1c1',.24);
      this.particleSystem(100,3,[-9,1,-24],'#b8d4df',1.5);
      this.particleSystem(350,4,[0,2,0],'#ffe0aa',.12);
      this.particleSystem(180,4,[62,2,-36],'#f5cc81',.12);
      this.particleSystem(160,4,[29,2,53],'#f3dbcf',.11);

    }

    createPost(){
      const renderer=this.world.renderer;
      this.hdr=renderer.extensions.has('EXT_color_buffer_float');
      const opts={type:this.hdr?T.HalfFloatType:T.UnsignedByteType,minFilter:T.LinearFilter,magFilter:T.LinearFilter,depthBuffer:false};
      this.target=new T.WebGLRenderTarget(1,1,{...opts,depthBuffer:true});this.target.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType);this.bloomA=new T.WebGLRenderTarget(1,1,opts);this.bloomB=new T.WebGLRenderTarget(1,1,opts);this.rays=new T.WebGLRenderTarget(1,1,opts);
      this.postScene=new T.Scene();this.postCamera=new T.Camera();this.quad=new T.Mesh(new T.PlaneGeometry(2,2));this.quad.frustumCulled=false;this.postScene.add(this.quad);
      const make=(fragmentShader,uniforms)=>new T.ShaderMaterial({vertexShader:vertex,fragmentShader,uniforms,depthTest:false,depthWrite:false,toneMapped:false});
      this.extract=make(`varying vec2 vUv;uniform sampler2D uTex;void main(){vec3 c=texture2D(uTex,vUv).rgb;float l=max(c.r,max(c.g,c.b));gl_FragColor=vec4(c*smoothstep(.85,1.8,l),1.);}`,{uTex:{value:null}});
      this.blur=make(`varying vec2 vUv;uniform sampler2D uTex;uniform vec2 uStep;void main(){vec3 c=texture2D(uTex,vUv).rgb*.227027;c+=texture2D(uTex,vUv+uStep*1.384615).rgb*.316216;c+=texture2D(uTex,vUv-uStep*1.384615).rgb*.316216;c+=texture2D(uTex,vUv+uStep*3.230769).rgb*.070270;c+=texture2D(uTex,vUv-uStep*3.230769).rgb*.070270;gl_FragColor=vec4(c,1.);}`,{uTex:{value:null},uStep:{value:new T.Vector2()}});
      this.shafts=make(`varying vec2 vUv;uniform sampler2D uDepth;uniform vec2 uLight;uniform vec3 uColor;uniform float uStrength;void main(){vec2 delta=(uLight-vUv)/20.;vec2 uv=vUv;float light=0.,decay=1.;for(int i=0;i<20;i++){uv+=delta;float inside=step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.);light+=step(.9999,texture2D(uDepth,clamp(uv,vec2(0.),vec2(1.))).r)*decay*inside;decay*=.94;}float falloff=1.-smoothstep(.05,1.1,distance(vUv,uLight));gl_FragColor=vec4(uColor*light*.012*falloff*uStrength,1.);}`,
        {uDepth:{value:this.target.depthTexture},uLight:{value:new T.Vector2()},uColor:{value:color('#ffe2ac')},uStrength:{value:0}});
      this.sunScreen=new T.Vector3();
      this.composite=make(`varying vec2 vUv;uniform sampler2D uScene,uBloom,uDepth,uRays;uniform float uExposure,uBloomStrength,uCinema,uFocus,uNight;uniform vec2 uPixel;uniform mat4 uInvProjection;
        vec3 viewPosition(vec2 uv){float d=texture2D(uDepth,clamp(uv,vec2(.001),vec2(.999))).x;vec4 p=uInvProjection*vec4(uv*2.-1.,d*2.-1.,1.);return p.xyz/max(.00001,p.w);}
        void main(){vec3 c=texture2D(uScene,vUv).rgb;vec3 p=viewPosition(vUv);float z=-p.z;
          if(uCinema>.5){
            vec3 n=normalize(cross(dFdx(p),dFdy(p)));float ao=0.;
            float radius=clamp(290./max(z,1.),2.,14.);
            for(int i=0;i<8;i++){float angle=float(i)*2.399963;vec2 off=vec2(cos(angle),sin(angle))*uPixel*radius*(.5+float(i)/14.);
              vec3 delta=viewPosition(vUv+off)-p;float len=length(delta);
              ao+=max(0.,dot(n,delta/max(.001,len))-.12)*(1.-smoothstep(.15,2.5,len));}
            c*=1.-clamp(ao*.13,0.,.24);
            float dof=smoothstep(uFocus+26.,uFocus+115.,z)*.28;
            vec2 o=uPixel*1.6;vec3 soft=(texture2D(uScene,vUv+vec2(o.x,o.y)).rgb+texture2D(uScene,vUv+vec2(-o.x,o.y)).rgb+texture2D(uScene,vUv-vec2(o.x,o.y)).rgb+texture2D(uScene,vUv+vec2(o.x,-o.y)).rgb)*.25;
            c=mix(c,soft,dof);
          }
          c+=texture2D(uBloom,vUv).rgb*uBloomStrength;
          if(uCinema>.5)c+=texture2D(uRays,vUv).rgb;
          c=max(c,vec3(0.))*uExposure;
          float l=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(l),c,1.08);
          c=max(c,vec3(0.));c=clamp((c*(2.51*c+.03))/(c*(2.43*c+.59)+.14),0.,1.);
          c*=mix(vec3(.96,1.005,1.025),vec3(1.025,1.,.975),smoothstep(.18,.75,l)*(1.-uNight*.6));
          float vignette=1.-.15*smoothstep(.23,.76,length(vUv-.5));c=clamp(c*vignette,0.,1.);
          c=mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(vec3(.0031308),c));gl_FragColor=vec4(c,1.);}`,
          {uScene:{value:this.target.texture},uBloom:{value:this.bloomB.texture},uDepth:{value:this.target.depthTexture},uRays:{value:this.rays.texture},uExposure:{value:1},uBloomStrength:{value:.27},uCinema:{value:1},uFocus:{value:60},uNight:{value:0},uPixel:{value:new T.Vector2()},uInvProjection:{value:new T.Matrix4()}});
    }

    setQuality(value,notify=true){
      if(!['auto','cinema','balanced','eco'].includes(value))return;
      this.quality=value;this.governor.reset();this.lastFrame=0;this.warmup=performance.now()+3500;
      this.applyTier(value==='auto'?this.governor.tier:value==='cinema'?2:value==='balanced'?1:0);
      if(this.select)this.select.value=value;
      try{localStorage.setItem('pq-graphics',value);}catch(e){}
      if(notify)this.world.setStatus(`画质：${{auto:'自动 · 优先保持流畅',eco:'流畅',cinema:'电影',balanced:'均衡'}[value]}`,2600);
    }

    applyTier(tier){
      this.tier=tier;const r=this.world.renderer,cinema=tier===2,eco=tier===0;
      // Resolution is bounded even on a Retina display; the frame governor can reduce it further.
      r.setPixelRatio(Math.min(devicePixelRatio||1,eco?.85:cinema?1.6:1.15));
      const size=eco?1024:2048;
      if(this.world.sunLight.shadow.mapSize.x!==size){this.world.sunLight.shadow.mapSize.set(size,size);if(this.world.sunLight.shadow.map){this.world.sunLight.shadow.map.dispose();this.world.sunLight.shadow.map=null;}}
      const samples=eco?0:cinema?4:2;
      if(this.target.samples!==samples){this.target.dispose();this.target.samples=samples;}
      this.grass.count=Math.floor(this.grassCount*(eco?.3:cinema?1:.65));
      this.systems.forEach(s=>s.mesh.geometry.setDrawRange(0,Math.floor(s.count*(eco?.25:cinema?1:.6))));
      this.composite.uniforms.uCinema.value=cinema?1:0;
      this.world._resize();
      if(this.select)this.select.title=`${this.quality==='auto'?'自动调节 · ':''}当前${['流畅','均衡','电影'][tier]}画质`;
    }

    recordFrame(now){
      const previous=this.lastFrame;this.lastFrame=now;
      if(!previous||now<this.warmup||this.quality!=='auto')return;
      const next=this.governor.sample(now-previous,!document.hidden);
      if(next!==null)this.applyTier(next);
    }


    resize(w,h){
      const ratio=this.world.renderer.getPixelRatio();this.target.setSize(Math.round(w*ratio),Math.round(h*ratio));
      this.bloomA.setSize(Math.max(1,Math.round(w*ratio/4)),Math.max(1,Math.round(h*ratio/4)));this.bloomB.setSize(this.bloomA.width,this.bloomA.height);this.rays.setSize(this.bloomA.width,this.bloomA.height);
      this.systems.forEach(s=>s.mesh.material.uniforms.uScale.value=h*ratio*.75);
      this.composite.uniforms.uPixel.value.set(1/(w*ratio),1/(h*ratio));
      if(this.celebration)this.celebration.material.uniforms.uScale.value=h*ratio*.75;
    }

    prepareLods(){
      const rigs=[...this.world.citizens.map(c=>c.rig),...(this.world.npcRigs||[]).map(c=>c.rig)];
      rigs.forEach(rig=>{
        const meshes=[],mapped=[];rig.group.traverse(m=>{if(m.isMesh&&!m.material.transparent)(m.material.map?mapped:meshes).push(m);});
        const far=new T.Group(),flat=new T.Mesh(bake(meshes,rig.group,true),new T.MeshStandardMaterial({vertexColors:true,roughness:.6}));far.add(flat);flat.castShadow=true;
        const inv=rig.group.matrixWorld.clone().invert();mapped.forEach(m=>{const f=new T.Mesh(lowGeometry(m.geometry,true).applyMatrix4(inv.clone().multiply(m.matrixWorld)),m.material);far.add(f);});
        const children=[...rig.group.children];rig.group.add(far);far.visible=false;this.lods.push({rig,far,children,active:false});
      });
    }

    createBuildingRewards(){
      this.rewards=[];
      Object.values(this.world.buildings).forEach(entry=>{
        if(!entry.data.levels?.length)return;
        entry.group.updateWorldMatrix(true,true);const bounds=new T.Box3();
        entry.group.traverse(m=>{if(m.isMesh&&m.material.visible!==false&&!m.material.transparent)bounds.union(new T.Box3().setFromObject(m));});
        const group=new T.Group(),roof=Math.max(5,bounds.max.y+1.2);group.position.set(entry.data.wx,0,entry.data.wz);group.visible=false;
        const star=new T.Mesh(new T.OctahedronGeometry(.48),new T.MeshStandardMaterial({color:'#f4d69c',emissive:'#f4bf68',emissiveIntensity:1.6,metalness:.6,roughness:.25}));star.position.y=roof;group.add(star);
        const ring=new T.Mesh(new T.TorusGeometry(.92,.025,6,40),new T.MeshBasicMaterial({color:'#e8c78c'}));ring.position.y=roof;ring.rotation.x=Math.PI*.5;group.add(ring);
        const halo=new T.Mesh(new T.RingGeometry(4.6,5.15,48),new T.MeshBasicMaterial({color:'#f2ce8b',transparent:true,opacity:.22,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending}));halo.rotation.x=-Math.PI/2;halo.position.y=1.06;group.add(halo);
        const lamp=new T.Mesh(new T.SphereGeometry(.2,8,6),new T.MeshBasicMaterial({color:'#ffe1a2'}));lamp.position.copy(entry.doorPos).sub(group.position);lamp.position.y=3.4;group.add(lamp);
        this.scene.add(group);this.rewards.push({id:entry.data.id,entry,group,star,halo,roof});
      });
      const p=[],seeds=[];for(let i=0;i<560;i++){p.push(0,0,0);seeds.push(rand(i*7),rand(i*7+1),rand(i*7+2),rand(i*7+3));}
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('seed',new T.Float32BufferAttribute(seeds,4));
      const mat=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,
        uniforms:{uOrigin:{value:new T.Vector3()},uTime:{value:0},uStart:{value:0},uScale:{value:500}},
        vertexShader:`attribute vec4 seed;uniform float uTime,uStart,uScale;uniform vec3 uOrigin;varying float vAlpha;varying vec3 vColor;void main(){float age=max(0.,uTime-uStart-seed.w*.8);float angle=seed.x*6.283;float r=sin(seed.y*1.57)*(2.+seed.z*3.);vec3 velocity=vec3(cos(angle)*r,2.+seed.y*5.,sin(angle)*r);vec3 p=uOrigin+velocity*age+vec3(0.,-1.6*age*age,0.);vAlpha=(1.-smoothstep(1.,4.,age))*smoothstep(0.,.15,age);vColor=mix(vec3(1.,.42,.11),vec3(.8,.95,1.),seed.z*.55);vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(.26*uScale/max(1.,-mv.z),1.,24.);}`,
        fragmentShader:`varying float vAlpha;varying vec3 vColor;void main(){float d=length(gl_PointCoord-.5);float a=(1.-smoothstep(.05,.5,d))*vAlpha;if(a<.01)discard;gl_FragColor=vec4(vColor*3.,a);}`});
      this.celebration=new T.Points(geo,mat);this.celebration.frustumCulled=false;this.celebration.visible=false;this.scene.add(this.celebration);
    }

    refreshBuildings(){
      if(!this.rewards)return;
      const chapters=PQChapterProgress.chapters(PQ.levels,PQ.milestones,G.progress);
      this.rewards.forEach(r=>{r.group.visible=PQChapterProgress.forBuilding(r.entry.data,chapters).some(c=>c.complete);r.entry.hasLegacy=r.group.visible;});
      if(this.pendingChapter){
        const chapter=chapters.find(c=>c.id===this.pendingChapter&&c.complete);this.pendingChapter=null;
        const b=chapter&&PQ.buildings.find(b=>b.levels?.includes(chapter.bossId));
        if(b){this.celebrate(b.id,false);this.world.setStatus(`✦ ${chapter.ch}完成 · 点亮建筑，回顾你的成长`,5000);}
      }
    }

    celebrate(id,focus=true){
      const reward=this.rewards.find(r=>r.id===id&&r.group.visible);if(!reward)return;
      const w=this.world;
      if(focus){w.setMode('orbit');w.setArchipelago(false,true);w.focusBuilding(id,true);w.spherical.radius=30;w.spherical.polar=1.05;}
      const uniforms=this.celebration.material.uniforms;
      uniforms.uOrigin.value.set(reward.entry.data.wx,reward.roof-1,reward.entry.data.wz);
      uniforms.uStart.value=performance.now()*.001;
      this.celebration.geometry.setDrawRange(0,this.reducedMotion?100:this.tier===0?180:560);
      this.celebration.visible=true;
      if(this.celebrating)this.celebrating.halo.scale.setScalar(1);
      this.celebrating=reward;
      w.setStatus(`✦ ${reward.entry.data.name}已点亮 · 这座岛记得你的每一步`,3800);
    }

    state(){
      if(!G.exploration||typeof G.exploration!=='object'||Array.isArray(G.exploration))G.exploration={};
      return G.exploration;
    }

    createUI(){
      const screen=document.getElementById('map-screen'),hud=document.createElement('div');hud.id='expedition-hud';
      hud.innerHTML=`<div class="exp-eyebrow">THE OPEN ARCHIPELAGO</div><div id="exp-region">星火岛 <span>· 探索者的起点</span></div><div class="exp-controls"><button id="exp-journal">探索手记 <span id="exp-count">0 / 3</span></button><button id="exp-photo" title="H 隐藏或显示界面">取景 H</button><label>画质 <select id="exp-quality" aria-label="画质"><option value="auto">自动</option><option value="balanced">均衡</option><option value="cinema">电影</option><option value="eco">流畅</option></select></label></div>`;
      screen.appendChild(hud);this.regionEl=hud.querySelector('#exp-region');this.countEl=hud.querySelector('#exp-count');
      this.select=hud.querySelector('select');this.select.onchange=()=>this.setQuality(this.select.value);
      hud.querySelector('#exp-journal').onclick=()=>this.openJournal();hud.querySelector('#exp-photo').onclick=()=>this.togglePhoto();
      const photo=document.createElement('button');photo.id='exp-photo-exit';photo.textContent='H / 轻点返回探索';photo.onclick=()=>this.togglePhoto();screen.appendChild(photo);
      const prompt=document.createElement('button');prompt.id='exp-interact';prompt.onclick=()=>this.inspect(this.near);screen.appendChild(prompt);this.prompt=prompt;
      const panel=document.createElement('section');panel.id='exp-journal-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','false');panel.setAttribute('aria-label','探索手记');panel.hidden=true;screen.appendChild(panel);this.panel=panel;
      window.addEventListener('keydown',e=>{
        if(!screen.classList.contains('active')||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.repeat)return;
        const key=e.key.toLowerCase();
        if(key==='h')this.togglePhoto();
        if(key==='j'){if(this.panel.hidden)this.openJournal();else this.closeJournal();}
        if(key==='escape'){this.closeJournal();if(this.photo)this.togglePhoto();}
        if(key==='e'&&this.near){e.preventDefault();this.inspect(this.near);}
      });
      this.refreshJournalCount();
    }
    togglePhoto(){this.photo=!this.photo;document.getElementById('game').classList.toggle('photo-mode',this.photo);}
    refreshJournalCount(){this.countEl.textContent=`${W.regions.filter(r=>this.state()[r.id]).length} / 3`;}
    closeJournal(){this.panel.hidden=true;this.world.keys={};this.world.joyVec={x:0,z:0};if(this.returnFocus&&this.returnFocus.isConnected)this.returnFocus.focus();}
    openJournal(){
      this.returnFocus=document.activeElement;this.world.keys={};this.world.walkGoal=null;
      this.panel.innerHTML=`<button class="exp-close" aria-label="关闭探索手记">×</button><div class="exp-eyebrow">FIELD NOTES / 探索手记</div><h2>沿着光，去更远处。</h2><p>三条栈道，三个地标。靠近信标按 E 收集手记；主线故事继续发生在星火岛。</p><div class="exp-entries"></div><div class="exp-footnote">WASD 移动 · Shift 奔跑 · 拖拽环视<br>J 手记 · H 取景 · Esc 关闭</div>`;
      this.panel.querySelector('.exp-close').onclick=()=>this.closeJournal();
      W.regions.forEach((r,i)=>{const b=document.createElement('button');b.className='exp-entry';b.innerHTML=`<span class="exp-number">0${i+1}</span><span><b>${r.name}</b><small>${this.state()[r.id]?'已记录 · '+r.title:'未发现 · '+r.continent}</small></span><span>↗</span>`;b.onclick=()=>this.state()[r.id]?this.showNote(r):this.focusRegion(r.id);this.panel.querySelector('.exp-entries').appendChild(b);});
      this.panel.hidden=false;this.panel.querySelector('.exp-close').focus();
    }
    showNote(r){
      this.world.keys={};this.panel.innerHTML=`<button class="exp-close" aria-label="关闭探索手记">×</button><div class="exp-eyebrow">${r.continent} / ${r.name}</div><h2>${r.title}</h2><p>${r.text}</p><div class="exp-note-seal">✦ 已加入探索手记</div><button class="exp-primary">查看关联主线</button>`;
      this.panel.querySelector('.exp-close').onclick=()=>this.closeJournal();this.panel.querySelector('.exp-primary').onclick=()=>{this.closeJournal();this.world.setMode('pan');this.world.focusBuilding(r.building);};this.panel.hidden=false;this.panel.querySelector('.exp-close').focus();
    }
    inspect(id){
      const r=W.regions.find(r=>r.id===id);if(!r)return;
      if(Math.hypot(this.world.playerPos.x-r.x-3,this.world.playerPos.z-r.z+2)>5){this.focusRegion(id);return;}
      if(!this.state()[id]){this.state()[id]=true;G.save();this.refreshJournalCount();this.world.setStatus(`发现「${r.name}」· 新的探索手记已收录`,3600);this.flash={region:r,start:this.time.value};}
      this.showNote(r);
    }
    focusRegion(id){
      const r=W.regions.find(r=>r.id===id);if(!r)return;this.closeJournal();this.world.setMode('orbit');
      this.world.camTarget={x:r.x,y:2,z:r.z};this.world.spherical.radius=42;this.world.spherical.polar=.93;
      this.world.setStatus(`「${r.name}」· 切换漫步，沿${W.routes[W.regions.indexOf(r)].name}抵达发光信标，按 E 发现手记`,5200);
    }

    update(dt,t){
      const w=this.world,c=w.curTod,night=c.starOp,day=1-night;
      this.time.value=this.reducedMotion?t*.25:t;this.sky.position.copy(w.camera.position);
      this.skyUniforms.uTop.value.copy(c.sky).multiplyScalar(.65);this.skyUniforms.uHorizon.value.copy(c.fog).multiplyScalar(.9);this.skyUniforms.uNight.value=night;
      this.sunScreen.copy(c.sunPos).normalize().multiplyScalar(300).add(w.camera.position).project(w.camera);
      this.shafts.uniforms.uLight.value.set(this.sunScreen.x*.5+.5,this.sunScreen.y*.5+.5);
      this.shafts.uniforms.uColor.value.copy(c.sunColor);
      this.shafts.uniforms.uStrength.value=(this.sunScreen.z<1&&Math.abs(this.sunScreen.x)<1.6&&Math.abs(this.sunScreen.y)<1.6)?day:0;
      // Sparse high clouds frame the scene; the procedural sky supplies the fine cloud layer.
      w.cloudGate.forEach((cloud,i)=>{cloud.group.visible=cloud.group.visible&&i%4===0;});
      this.skyUniforms.uSun.value.copy(c.sunPos);this.skyUniforms.uSunColor.value.copy(c.sunColor);
      this.waterUniforms.uDeep.value.copy(c.ocean).multiplyScalar(.6);this.waterUniforms.uShallow.value.set('#56afa0').multiplyScalar(.12+day*.55);
      this.waterUniforms.uSky.value.copy(c.sky).lerp(c.fog,.4);this.waterUniforms.uSun.value.copy(c.sunPos);this.waterUniforms.uSunColor.value.copy(c.sunColor);this.waterUniforms.uNight.value=night;
      w.fireflies.visible=false;
      this.composite.uniforms.uInvProjection.value.copy(w.camera.projectionMatrixInverse);
      this.composite.uniforms.uFocus.value=w.curSpherical.radius;
      this.composite.uniforms.uNight.value=night;
      this.composite.uniforms.uBloomStrength.value=this.tier===2?.30:.20;
      if(this.celebration){
        this.celebration.material.uniforms.uTime.value=t;
        if(this.celebration.visible&&t-this.celebration.material.uniforms.uStart.value>5)this.celebration.visible=false;
      }
      this.rewards.forEach(r=>{if(!r.group.visible)return;r.star.rotation.y=t*.4;r.star.position.y=r.roof+Math.sin(t*1.2)*.18;r.halo.material.opacity=.18+night*.14;});
      if(this.celebrating){const age=t-this.celebration.material.uniforms.uStart.value,r=this.celebrating;
        if(age<3&&!this.reducedMotion){r.halo.scale.setScalar(1+age*.6);r.halo.material.opacity=Math.max(0,.55*(1-age/3));}
        else{r.halo.scale.setScalar(1);this.celebrating=null;}
      }

      w.lighthouseBeam.material.uniforms.uAlpha.value=c.beamOp*.30;
      this.lanternMat.color.set('#ffd69a').multiplyScalar(.75+night*1.9);
      this.systems.forEach(s=>{s.mesh.material.uniforms.uOpacity.value=s.kind===0?night*.9+.05:s.kind===2?.5+day*.45:s.kind===4?.18+day*.45:.45+day*.4;});
      this.lods.forEach(l=>{const distant=w.camera.position.distanceTo(l.rig.group.position)>(this.tier===0?15:25);if(l.active!==distant){l.children.forEach(c=>c.visible=!distant);l.far.visible=distant;l.active=distant;}});
      const walking=!w.archipelago&&!w.cinematicMode&&(w.mode==='walk'||w.mode==='fp');
      const target=walking?w.playerPos:new T.Vector3(w.camCurTarget.x,0,w.camCurTarget.z),span=walking?30:w.archipelago?100:60;
      const sc=w.sunLight.shadow.camera;if(sc.right!==span){sc.left=sc.bottom=-span;sc.right=sc.top=span;sc.far=260;sc.near=1;sc.updateProjectionMatrix();}
      w.sunLight.target.position.set(target.x,0,target.z);w.sunLight.position.copy(c.sunPos).add(w.sunLight.target.position);
      this.beacons.forEach((b,i)=>{b.crystal.rotation.y=t*.4;b.crystal.position.y=3.75+Math.sin(t*1.6+i)*.15;b.ring.rotation.y=t*.25;b.ring.rotation.z=Math.sin(t*.3)*.25;b.light.intensity=1.5+night*4;});
      if(this.flash){const b=this.beacons.find(b=>b.region===this.flash.region),age=this.time.value-this.flash.start;b.ring.scale.setScalar(1+age*1.4);b.ring.material.transparent=true;b.ring.material.opacity=Math.max(0,1-age/2);if(age>2){b.ring.scale.setScalar(1);b.ring.material.opacity=1;this.flash=null;}}
      if(!w.cinematicMode){
        const r=W.regionAt(w.playerPos.x,w.playerPos.z),bridge=W.bridgeAt(w.playerPos.x,w.playerPos.z),name=r?r.name:bridge?bridge.name:'星火岛';
        if(name!==this.regionName){this.regionName=name;this.regionEl.innerHTML=`${name} <span>· ${r?r.continent:bridge?'海上漫游':'探索者的起点'}</span>`;if(walking&&r)w.setStatus(`抵达 ${r.name} · 寻找发光信标`,3500);}
        const near=walking?W.regions.find(r=>Math.hypot(w.playerPos.x-r.x-3,w.playerPos.z-r.z+2)<4.8):null;this.near=near?.id;
        this.prompt.hidden=!near||!this.panel.hidden;
        if(near)this.prompt.textContent=`E / 轻点 · ${this.state()[near.id]?'重读手记':'发现'}「${near.name}」`;
      }
      if(this.panel&&!this.panel.hidden){w.keys={};w.walkGoal=null;w.joyVec={x:0,z:0};}
    }

    render(){
      const w=this.world,r=w.renderer;
      r.info.reset();r.info.autoReset=false;
      if(this.tier===0||!this.hdr){r.setRenderTarget(null);r.render(w.scene,w.camera);return;}
      r.setRenderTarget(this.target);r.render(w.scene,w.camera);
      const pass=(mat,target)=>{this.quad.material=mat;r.setRenderTarget(target);r.render(this.postScene,this.postCamera);};
      if(this.tier===2)pass(this.shafts,this.rays);
      this.extract.uniforms.uTex.value=this.target.texture;pass(this.extract,this.bloomA);
      this.blur.uniforms.uTex.value=this.bloomA.texture;this.blur.uniforms.uStep.value.set(1.5/this.bloomA.width,0);pass(this.blur,this.bloomB);
      this.blur.uniforms.uTex.value=this.bloomB.texture;this.blur.uniforms.uStep.value.set(0,1.5/this.bloomA.height);pass(this.blur,this.bloomA);
      this.composite.uniforms.uBloom.value=this.bloomA.texture;this.composite.uniforms.uExposure.value=.98;pass(this.composite,null);
    }
  }
  window.PQWorldEnvironment=WorldEnvironment;
})();
