/* Optional fullscreen and responsive framing; orientation never reloads a game. */
(function(root){
  'use strict';
  const landscape=(width,height)=>width>height&&height<=600;
  const full=doc=>doc.fullscreenElement||doc.webkitFullscreenElement;
  function fullscreenRequest(doc){
    const target=doc.documentElement;
    if(doc.fullscreenEnabled!==false&&target.requestFullscreen)return target.requestFullscreen;
    if(doc.webkitFullscreenEnabled!==false)return target.webkitRequestFullscreen;
  }
  function buttonMode(doc,touch,standalone){
    if(full(doc))return 'exit';
    if(!touch||standalone)return '';
    return fullscreenRequest(doc)?'enter':'help';
  }
  function fullscreenHelp(userAgent){
    const wechat=/MicroMessenger/i.test(userAgent);
    const ios=/iPhone|iPad|iPod|Macintosh.*Mobile/i.test(userAgent);
    if(ios){
      const prefix=wechat?'先点微信右上角「···」→「在浏览器打开」。':'';
      return prefix+'在 Safari 点「共享」→「添加到主屏幕」。如有「作为网页 App 打开」请开启，再从主屏幕打开游戏。';
    }
    if(wechat)return '点微信右上角「···」→「在浏览器打开」，再试全屏。';
    return '当前浏览器未能进入全屏。可在系统浏览器打开，再试全屏。';
  }
  async function enter(doc,orientation){
    if(!full(doc)){
      const request=fullscreenRequest(doc);
      if(!request)return {fullscreen:false,locked:false};
      try{await request.call(doc.documentElement);}catch(e){return {fullscreen:false,locked:false};}
    }
    if(!full(doc))return {fullscreen:false,locked:false};
    let locked=false;
    if(orientation?.lock)try{await orientation.lock('landscape');locked=true;}catch(e){}
    return {fullscreen:true,locked};
  }
  class FloatingJoystick {
    constructor(){this.reset();}
    reset(){this.move=null;this.look=null;}
    start(id,x,y){
      if(this.move?.id===id||this.look?.id===id)return null;
      if(!this.move){
        this.move={id,x,y,moved:false,shared:!!this.look};
        return 'move';
      }
      if(!this.look){
        this.move.shared=true;
        this.look={id,x,y};
        return 'look';
      }
      return null;
    }
    update(id,x,y,radius){
      if(this.move?.id===id){
        const dx=x-this.move.x,dy=y-this.move.y,distance=Math.hypot(dx,dy);
        this.move.moved ||= distance>=7;
        if(!this.move.moved)return {role:'move',x:0,z:0};
        const limit=Math.max(1,radius,distance);
        return {role:'move',x:dx/limit,z:dy/limit};
      }
      if(this.look?.id===id){
        const dx=x-this.look.x,dy=y-this.look.y;
        Object.assign(this.look,{x,y});
        return {role:'look',dx,dy};
      }
      return null;
    }
    end(id,cancelled=false){
      if(this.move?.id===id){
        const tap=!cancelled&&!this.move.moved&&!this.move.shared;
        this.move=null;
        return tap?'tap':'move';
      }
      if(this.look?.id===id){this.look=null;return 'look';}
      return null;
    }
  }
  const api={landscape,enter,buttonMode,fullscreenHelp,FloatingJoystick};
  if(typeof module!=='undefined')module.exports=api;
  if(typeof document==='undefined')return;
  const M=root.PQMobilePlay={FloatingJoystick,insets:{top:0,right:0,bottom:0,left:0},locked:false,pending:false,dismissed:false,
    landscape(){return landscape(innerWidth,innerHeight);},
    init(){
      this.game=document.getElementById('game');
      const probe=document.createElement('div');probe.id='play-safe-probe';probe.setAttribute('aria-hidden','true');document.body.append(probe);this.probe=probe;
      this.buttons=[];
      for(const selector of ['#land-topbar','#journey-tools','#chapter-top nav','#case-topbar nav','#market-top nav','.room-header','#hud']){
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
      const touch=navigator.maxTouchPoints>0||matchMedia('(pointer:coarse)').matches,wide=innerWidth>innerHeight;
      const standalone=navigator.standalone===true||matchMedia('(display-mode: standalone)').matches;
      const mode=buttonMode(document,touch,standalone);
      if(this.wide!==undefined&&wide!==this.wide)root.PQIsland?.resetInput();
      this.wide=wide;
      const label=mode==='exit'?'退出全屏':mode==='enter'?'全屏':'全屏指南';
      for(const b of this.buttons){
        b.hidden=!mode;b.disabled=this.pending;b.textContent=label;
        b.setAttribute('aria-label',mode==='enter'?'全屏游玩，支持时切换横屏':label);
      }
      const input=/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||'');
      this.hint.hidden=!mode||wide||this.dismissed||input||this.game.dataset.screen!=='map-screen';
      this.hint.querySelector('[data-play="enter"]').disabled=this.pending;
      const style=getComputedStyle(this.probe);for(const side of ['top','right','bottom','left'])this.insets[side]=parseFloat(style['padding'+side[0].toUpperCase()+side.slice(1)])||0;
      if(root.PQIsland?.visibility)PQIsland.visibility.nextMeasure=0;
    },
    tell(message,duration=5500){this.status.textContent=message;clearTimeout(this.timer);this.timer=setTimeout(()=>this.status.textContent='',duration);},
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
          if(!result.fullscreen)this.tell(fullscreenHelp(navigator.userAgent),11000);
          else if(!result.locked&&innerWidth<innerHeight)this.tell('请将手机横过来；若画面没有转动，请关闭系统的竖屏锁定。');
        }
      }finally{this.pending=false;this.sync();}
    }
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>M.init(),{once:true});else M.init();
})(typeof window==='undefined'?globalThis:window);
