/* Optional fullscreen and responsive framing; orientation never reloads a game. */
(function(root){
  'use strict';
  const landscape=(width,height)=>width>height&&height<=600;
  const full=doc=>doc.fullscreenElement||doc.webkitFullscreenElement;
  async function enter(doc,orientation){
    const target=doc.documentElement,request=target.requestFullscreen||target.webkitRequestFullscreen;
    if(!full(doc)){
      if(!request||doc.fullscreenEnabled===false)return {fullscreen:false,locked:false};
      try{await request.call(target);}catch(e){return {fullscreen:false,locked:false};}
    }
    if(!full(doc))return {fullscreen:false,locked:false};
    let locked=false;
    if(orientation?.lock)try{await orientation.lock('landscape');locked=true;}catch(e){}
    return {fullscreen:true,locked};
  }
  const api={landscape,enter};
  if(typeof module!=='undefined')module.exports=api;
  if(typeof document==='undefined')return;
  const M=root.PQMobilePlay={insets:{top:0,right:0,bottom:0,left:0},locked:false,pending:false,dismissed:false,
    landscape(){return landscape(innerWidth,innerHeight);},
    init(){
      this.game=document.getElementById('game');
      const probe=document.createElement('div');probe.id='play-safe-probe';probe.setAttribute('aria-hidden','true');document.body.append(probe);this.probe=probe;
      this.buttons=[];
      for(const selector of ['#land-topbar','#isl-toolbar','#chapter-top nav','#case-topbar nav','#market-top nav','.room-header','#hud']){
        const host=document.querySelector(selector);if(!host)continue;
        const button=document.createElement('button');button.type='button';button.className='mobile-play-button';button.onclick=()=>this.toggle();host.append(button);this.buttons.push(button);
      }
      const hint=document.createElement('aside');hint.id='mobile-play-hint';hint.hidden=true;hint.setAttribute('aria-label','横屏游玩提示');hint.innerHTML='<span>横着玩，视野更开阔。</span><button data-play="enter">横屏游玩</button><button data-play="close" aria-label="关闭横屏提示">稍后</button>';
      this.game.append(hint);this.hint=hint;hint.querySelector('[data-play="enter"]').onclick=()=>this.toggle();hint.querySelector('[data-play="close"]').onclick=()=>{this.dismissed=true;this.sync();};
      const status=document.createElement('p');status.id='mobile-play-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');this.game.append(status);this.status=status;
      const schedule=()=>{if(this.queued)return;this.queued=requestAnimationFrame(()=>{this.queued=0;this.sync();const w=root.PQIsland;if(w?.renderer){const size=w.renderer.getSize(this.size||(this.size=new THREE.Vector2())),el=w.renderer.domElement;if(size.x!==el.clientWidth||size.y!==el.clientHeight)w._resize();}});};
      addEventListener('resize',schedule);root.visualViewport?.addEventListener('resize',schedule);screen.orientation?.addEventListener('change',schedule);
      for(const event of ['fullscreenchange','webkitfullscreenchange'])document.addEventListener(event,()=>{if(!full(document)&&this.locked){try{screen.orientation?.unlock();}catch(e){}this.locked=false;}schedule();});
      new MutationObserver(schedule).observe(this.game,{attributes:true,attributeFilter:['data-screen']});
      document.addEventListener('focusin',schedule);document.addEventListener('focusout',schedule);this.sync();
    },
    sync(){
      const touch=navigator.maxTouchPoints>0||matchMedia('(pointer:coarse)').matches,wide=innerWidth>innerHeight,fs=!!full(document),canFull=!!(document.documentElement.requestFullscreen||document.documentElement.webkitRequestFullscreen)&&document.fullscreenEnabled!==false;
      if(this.wide!==undefined&&wide!==this.wide){const w=root.PQIsland;if(w){w.keys={};w.joyVec={x:0,z:0};w.pointers.clear();w.dragStart=null;const knob=document.getElementById('isl-joy-knob');if(knob)knob.style.transform='';}}
      this.wide=wide;
      for(const b of this.buttons){b.hidden=!touch&&!fs||(!canFull&&wide&&!fs);b.disabled=this.pending;b.textContent=fs?'退出全屏':canFull?'全屏':'横屏游玩';b.setAttribute('aria-label',fs?'退出全屏游玩':canFull?'全屏游玩，支持时切换横屏':'查看手机横屏提示');}
      const input=/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||'');
      this.hint.hidden=!touch||wide||this.dismissed||input||this.game.dataset.screen!=='map-screen';
      this.hint.querySelector('[data-play="enter"]').disabled=this.pending;
      const style=getComputedStyle(this.probe);for(const side of ['top','right','bottom','left'])this.insets[side]=parseFloat(style['padding'+side[0].toUpperCase()+side.slice(1)])||0;
      if(root.PQIsland?.visibility)PQIsland.visibility.nextMeasure=0;
    },
    tell(message){this.status.textContent=message;clearTimeout(this.timer);this.timer=setTimeout(()=>this.status.textContent='',5500);},
    placePins(selector,blockers,force=false){
      const pins=[...document.querySelectorAll(selector)];
      if(!force&&!this.landscape()){for(const el of pins){el.style.transform='';el.style.visibility='';}return;}
      const now=performance.now(),key=blockers+innerWidth+':'+innerHeight;
      if(this.pinKey!==key||now>(this.pinMeasure||0)){
        this.pinKey=key;this.pinMeasure=now+160;this.pinObstacles=[];
        for(const el of document.querySelectorAll(blockers)){if(el.hidden||getComputedStyle(el).display==='none')continue;const r=el.getBoundingClientRect();if(r.width&&r.height)this.pinObstacles.push({x:r.x,y:r.y,width:r.width,height:r.height});}
      }
      const occupied=this.pinObstacles.slice(),s=this.insets;
      for(const r of [{x:0,y:0,width:s.left,height:innerHeight},{x:innerWidth-s.right,y:0,width:s.right,height:innerHeight},{x:0,y:0,width:innerWidth,height:s.top},{x:0,y:innerHeight-s.bottom,width:innerWidth,height:s.bottom}])if(r.width&&r.height)occupied.push(r);
      this.pinSizes||=new WeakMap();
      for(const el of pins){if(el.hidden)continue;const stamp=innerWidth+':'+innerHeight+':'+el.textContent;let size=this.pinSizes.get(el);if(!size||size.stamp!==stamp){size={width:el.offsetWidth,height:el.offsetHeight,stamp};this.pinSizes.set(el,size);}if(!size.width)continue;
        const p=PQWorldFraming.placeLabel({x:parseFloat(el.style.left)||0,y:parseFloat(el.style.top)||0},size,{width:innerWidth,height:innerHeight},occupied);
        el.style.visibility=p?'':'hidden';if(p){occupied.push(p);el.style.transform='none';el.style.left=p.x+'px';el.style.top=p.y+'px';}
      }
    },
    async toggle(){
      if(this.pending)return;this.pending=true;this.sync();
      try{
        if(full(document)){
          const leave=document.exitFullscreen||document.webkitExitFullscreen;try{await leave?.call(document);}catch(e){this.tell('可以使用浏览器的返回或退出全屏按钮。');}
        }else{
          const result=await enter(document,screen.orientation);this.locked=result.locked;
          if(!result.locked&&innerWidth<innerHeight)this.tell('请将手机横过来；若画面没有转动，请关闭系统的竖屏锁定。');
          else if(!result.fullscreen)this.tell('当前浏览器未进入全屏，横过手机也可以继续游玩。');
        }
      }finally{this.pending=false;this.sync();}
    }
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>M.init(),{once:true});else M.init();
})(typeof window==='undefined'?globalThis:window);
