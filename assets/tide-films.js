/* Original, time-addressable drawings for the three museum reels. */
(function () {
  'use strict';
  const width = 960, height = 540;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const ease = (x) => {
    const t = clamp(x);
    return t * t * (3 - 2 * t);
  };
  const palettes = [
    ['#211f19', '#edc587', '#7e8b6d'],
    ['#231a26', '#ffc782', '#a77979'],
    ['#111e32', '#b0d9dd', '#ffba70']
  ];
  const sequences = [
    [48, 55, 60, 55, 53, 57, 60, 57],
    [45, 52, 57, 60, 48, 55, 64, 60],
    [50, 57, 62, 69, 55, 62, 67, 74]
  ];
  const noise = document.createElement('canvas');
  noise.width = noise.height = 128;
  const noiseCtx = noise.getContext('2d');
  const grains = noiseCtx.createImageData(128, 128);
  let random = 8867;
  for (let i = 0; i < grains.data.length; i += 4) {
    random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
    grains.data[i] = grains.data[i + 1] = grains.data[i + 2] = random & 255;
    grains.data[i + 3] = 27;
  }
  noiseCtx.putImageData(grains, 0, 0);

  function rect(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }
  function shape(ctx, color, points) {
    ctx.fillStyle = color;
    ctx.beginPath();
    points.forEach(([x,y], i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
    ctx.closePath();
    ctx.fill();
  }
  function disc(ctx, x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  function light(ctx, x, y, r, color) {
    const glow = ctx.createRadialGradient(x,y,0,x,y,r);
    glow.addColorStop(0,color); glow.addColorStop(1,'transparent');
    rect(ctx,x-r,y-r,r*2,r*2,glow);
  }
  function words(ctx, value, x, y, size, color, family = 'serif') {
    if (!value) return;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.font = '600 '+size+'px '+family;
    ctx.fillText(value,x,y,width-140);
    ctx.textAlign = 'start';
  }

  function leader(ctx, film, index, t, ending) {
    const [dark, ink] = palettes[index];
    rect(ctx,0,0,width,height,dark);
    light(ctx,width/2,height/2,490,ink+'31');
    ctx.strokeStyle=ink+'95';
    ctx.strokeRect(44,40,872,460);
    ctx.strokeRect(53,49,854,442);
    ctx.save();
    ctx.translate(width/2,262);
    ctx.rotate(t*.20);
    ctx.strokeStyle=ink+'24';
    for(let r=96;r<214;r+=27) {
      ctx.beginPath();
      ctx.arc(0,0,r,0,Math.PI*1.7);
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha=ease(t*2+.25);
    const card = ending ? film.ending : film.opening;
    words(ctx, card.title, 480, 270, 55, ink);
    words(ctx, card.subtitle, 480, 338, 24, ink, 'system-ui');
    ctx.globalAlpha=1;
  }

  function researcher(ctx, x, y, jacket, phase, t, facing) {
    const lean=Math.sin(t*1.45+phase)*5;
    ctx.save();
    ctx.translate(x,y);ctx.scale(facing,1);
    shape(ctx,jacket,[[-48,87],[-42,40],[-20,19],[24,21],[52,67],[47,96]]);
    rect(ctx,-16,3,31,31,'#a76f4d');
    disc(ctx,lean,3,30,'#db9c68');
    shape(ctx,'#2b2520',[[-29,1],[-25,-24],[4,-31],[25,-17],[27,-5],[6,-15],[-14,-9]]);
    disc(ctx,lean+12,3,2.7,'#39362b');
    shape(ctx,jacket,[[18,32],[31,36],[67,51+lean],[111,37],[114,49],[74,69],[42,61]]);
    disc(ctx,110,43,8,'#db9c68');
    ctx.restore();
  }

  function summer(ctx, t, film) {
    ctx.save();
    const zoom=ease((t-4.2)/1.5)*(1-ease((t-9.7)/1.6));
    ctx.translate(-151*zoom,82*zoom);ctx.scale(1+.27*zoom,1+.27*zoom);
    const wall=ctx.createLinearGradient(0,0,960,400);
    wall.addColorStop(0,'#716044');wall.addColorStop(1,'#352f26');
    rect(ctx,0,0,width,height,wall);
    rect(ctx,53,73,237,293,'#352d24');
    rect(ctx,62,81,219,277,'#e9ba72');
    for(let i=0;i<7;i++){
      const x=77+i*35;
      shape(ctx,i%2?'#aaa074':'#879277',[[x-32,357],[x+Math.sin(t+i)*5,133+i%3*24],[x+36,357]]);
    }
    rect(ctx,164,82,10,275,'#584838');rect(ctx,63,220,217,10,'#584838');
    shape(ctx,'#efb86625',[[91,113],[250,112],[629,540],[260,540]]);
    rect(ctx,330,65,574,238,'#b88c58');rect(ctx,343,78,548,212,'#2a3d35');
    ctx.save();
    ctx.beginPath();ctx.rect(356,113,515*ease((t-5.0)/3.8),130);ctx.clip();
    words(ctx,film.scenes[1].propText,615,195,41,'#f1dfb1');
    ctx.restore();
    ctx.strokeStyle='#d7d0a78c';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(456,213);ctx.quadraticCurveTo(544,220,753,214);ctx.stroke();
    ctx.save();
    const close = 1+.14*ease((t-10.5)/3.8);
    ctx.translate(480,325);ctx.scale(close,close);ctx.translate(-480,-325);
    researcher(ctx,343,328,'#725d4f',1,t,1);
    researcher(ctx,680,324,'#657665',2,t,-1);
    researcher(ctx,525,303,'#965e47',3,t,-1);
    shape(ctx,'#4d3228',[[196,463],[310,389],[741,389],[873,483],[837,540],[222,540]]);
    shape(ctx,'#ad7752',[[196,450],[310,378],[741,378],[873,468],[837,503],[222,503]]);
    shape(ctx,'#f2dcaa',[[474,424],[547,414],[591,445],[508,456]]);
    researcher(ctx,798,401,'#514957',0,t,-1);
    researcher(ctx,266,417,'#7c754b',4,t,1);
    ctx.restore();
    for(let i=0;i<24;i++)disc(ctx,(i*109+t*5)%960,60+(i*47+t*8)%385,1.2,'#ffd79560');
    ctx.restore();
  }

  function market(ctx, t, film) {
    const sky=ctx.createLinearGradient(0,0,0,540);
    sky.addColorStop(0,'#20233e');sky.addColorStop(1,'#6f444a');
    rect(ctx,0,0,width,height,sky);
    for(let i=0;i<21;i++){
      const x=i*51-5;
      const y=278+43*Math.sin(i*.73);
      rect(ctx,x,y,46,242,'#262536');
      if(i%3===0)rect(ctx,x+12,y+22,12,20,'#c88161');
    }
    rect(ctx,0,457,width,83,'#302739');
    const lit=ease((t-11)/2.4);
    if(lit) light(ctx,476,344,390,'rgba(255,161,69,'+lit*.66+')');
    rect(ctx,203,239,532,250,'#54363a');
    rect(ctx,224,255,489,179,lit>.55?'#a76b45':'#514249');
    rect(ctx,201,407,538,31,'#a06551');
    shape(ctx,'#ab614f',[[168,248],[228,177],[704,177],[767,248]]);
    for(let i=0;i<7;i++){
      const x=228+i*68;
      shape(ctx, i%2?'#da9975':'#85404a',[[x,177],[x+68,177],[x+78,248],[x-15,248]]);
      disc(ctx,201+i*89,246,16,'#92504b');
    }
    disc(ctx,465,114,72,'#302638');disc(ctx,465,114,61,'#aa826e');
    disc(ctx,465,114,54,lit>.15?'#f5d6a2':'#6a5364');
    if(lit>.15) {
      for(let i=0;i<12;i++){
        const a=i*Math.PI/6;
        disc(ctx,465+47*Math.sin(a),114+47*Math.cos(a),2.1,'#85534c');
      }
      words(ctx,film.scenes[2].propText,465,125,29,'#503044','monospace');
    }
    const slide=ease((t-5)/3);
    ctx.save();
    ctx.translate(1020-430*slide,355+50*(1-slide));
    ctx.rotate(.18-.23*slide);
    rect(ctx,-86,-32,172,67,'#4d2b31');
    rect(ctx,-88,-35,172,64,'#f7d18f');
    words(ctx,film.scenes[1].propText, -2, 5, 17, '#643e44','system-ui');
    ctx.restore();
    for(let i=0;i<5;i++){
      const x=268+i*100;
      if(lit) light(ctx,x,270,84,'rgba(255,188,84,'+lit*.52+')');
      disc(ctx,x,270,8,lit>.5?'#ffcf88':'#76525a');
      rect(ctx,x-1,248,2,14,'#70423e');
    }
    for(let i=0;i<9;i++){
      const x=((t*(15+i%3*6)+i*123)%1170)-130;
      const y=455+((i*31)%64);
      disc(ctx,x,y-30,10,'#322739');rect(ctx,x-9,y-25,18,26,'#35293a');
    }
  }

  const pixelColors=['#112031','#203147','#34485a','#466267','#84a4a0','#efba77','#f5dc9e','#554653','#304252'];
  function cityPixel(x,y) {
    const slope=4+Math.floor(3*Math.sin(x*.065)+2*Math.sin(x*.18));
    if(y<13) return (x*31+y*53)%143<3 ? 4 : 0;
    if(y>39) return (x*13+y*3)%29<3 ? 2 : 1;
    if(x>=20 && x<=76 && y>=14+slope*.12) {
      const a=Math.abs(x-48);
      const roof=17+Math.floor(a*.27);
      if(y===roof||y===roof+1&&a>22) return 4;
      if(y<roof) return 0;
      if(y<roof+4) return 3;
      if(y>=37) return y===37?5:8;
      if(x>41&&x<54&&y>=30) return x%4<3?6:3;
      if(y>=29&&y<=33&&x%11<4) return (x+y)%8===0?6:5;
      return 2;
    }
    if(y>=27+slope) return y===27+slope?3:8;
    return 0;
  }
  const mosaic=document.createElement('canvas');
  mosaic.width=96;mosaic.height=54;
  const mosaicCtx=mosaic.getContext('2d');
  for(let y=0;y<54;y++)for(let x=0;x<96;x++)rect(mosaicCtx,x,y,1,1,pixelColors[cityPixel(x,y)]);

  function pixels(ctx,t) {
    rect(ctx,0,0,width,height,'#111e32');
    const pull=ease((t-11)/5.3);
    const scale=1.47-.52*pull;
    const w=860*scale,h=483*scale,x=(width-w)/2,y=(height-h)/2;
    const rows=Math.min(54,Math.floor(clamp((t-5)/6)*54));
    ctx.imageSmoothingEnabled=false;
    if(rows)ctx.drawImage(mosaic,0,0,96,rows,x,y,w,h*rows/54);
    if(t<5.3) {
      const r=3+3*Math.sin(t*2)**2;
      light(ctx,480,269,50,'#b7ffff52');rect(ctx,480-r,269-r,r*2,r*2,'#e3f0c7');
    }
    if(rows>0&&rows<54) {
      const lineY=y+h*rows/54;
      rect(ctx,x,lineY,w,2,'#a4f4df');
      light(ctx,(t*180)%width,lineY,95,'#b1f6df50');
    }
    if(pull) {
      ctx.globalAlpha=pull;
      for(let i=0;i<16;i++) {
        const lineY=385+((i*17)%135);
        const lineX=(i*73+t*(4+i%3))%890;
        rect(ctx,lineX,lineY,28+i%6*9,1,'#7aafa759');
      }
      light(ctx,480,340,240,'#f6b77526');
      ctx.globalAlpha=1;
    }
    ctx.imageSmoothingEnabled=true;
  }

  const patterns = new WeakMap();
  function render(ctx, index, t, film) {
    const {opening,ending,scenes}=film;
    if(t<opening.endSec) leader(ctx,film,index,t,false);
    else if(t>=ending.startSec) leader(ctx,film,index,t-ending.startSec,true);
    else [summer,market,pixels][index](ctx,t-opening.endSec,film);
    const vignette=ctx.createRadialGradient(480,262,161,480,270,565);
    vignette.addColorStop(0,'transparent');vignette.addColorStop(1,'#100d15a0');
    rect(ctx,0,0,width,height,vignette);
    ctx.save();
    ctx.globalCompositeOperation='soft-light';
    ctx.translate(Math.floor(t*31)%37,Math.floor(t*47)%51);
    if(!patterns.has(ctx)) patterns.set(ctx,ctx.createPattern(noise,'repeat'));
    rect(ctx,-40,-55,width+40,height+55,patterns.get(ctx));
    ctx.restore();
    rect(ctx,0,0,width,23,'#101218');rect(ctx,0,height-23,width,23,'#101218');
    const caption=scenes.find(scene=>t>=scene.startSec&&t<scene.endSec)?.caption;
    if(caption) {
      rect(ctx,0,462,960,55,'#141620d6');
      words(ctx,caption,480,497,23,'#fff0ce','system-ui');
    }
    const cut=Math.min(Math.abs(t-opening.endSec),Math.abs(t-ending.startSec));
    if(cut<.18)rect(ctx,0,23,width,height-46,'rgba(20,16,19,'+clamp(1-cut/.18)+')');
  }

  function createSound() {
    let context, master, lastBeat=-1;
    const voices = new Set();
    function silence() {
      for (const voice of voices) voice.stop();
      voices.clear();
      lastBeat=-1;
    }
    return {
      enable() {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return;
        if (!context) {
          context=new Audio();
          master=context.createGain();
          master.gain.value=.17;
          master.connect(context.destination);
        }
        context.resume().catch(()=>{});
      },
      silence,
      render(film, time) {
        if(context?.state!=='running') return;
        const beat=Math.floor(time/.76);
        if(beat===lastBeat)return;
        lastBeat=beat;
        const midi=sequences[film][beat%8];
        for(const [semitones,volume] of [[0,.23],[-12,.12]]) {
          const now=context.currentTime;
          const voice=context.createOscillator(), envelope=context.createGain();
          voice.type=semitones?'sine':'triangle';
          voice.frequency.value=440*2**((midi+semitones-69)/12);
          envelope.gain.setValueAtTime(.001,now);
          envelope.gain.linearRampToValueAtTime(volume,now+.07);
          envelope.gain.exponentialRampToValueAtTime(.001,now+.71);
          voice.connect(envelope);envelope.connect(master);
          voices.add(voice);
          voice.onended=()=>{voices.delete(voice);voice.disconnect();envelope.disconnect();};
          voice.start(now);voice.stop(now+.73);
        }
      }
    };
  }

  window.TideFilms={width,height,duration:24,render,createSound};
}());
