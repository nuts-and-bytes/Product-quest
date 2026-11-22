/* Scroll events do not identify the physical device. Remember the player's
   choice instead of switching mappings in the middle of a gesture. */
window.PQCameraInput = (() => {
  const key = 'pq-camera-input';
  let mode = /Mac/.test(navigator.platform) ? 'trackpad' : 'mouse';
  try {
    const saved = localStorage.getItem(key);
    if (saved === 'trackpad' || saved === 'mouse') mode = saved;
  } catch {}
  function hint(world) {
    const copy = PQ.cameraHelp;
    if (world.detachedFollow || world.archipelago || !['walk','fp'].includes(world.mode)) return copy.mapHint;
    return world.mode === 'fp' ? copy.fpHint : copy.walkHint;
  }
  function refresh(world) {
    for (const el of document.querySelectorAll('[data-camera-input]')) el.value = mode;
    for (const el of document.querySelectorAll('[data-camera-hint]')) {
      el.hidden = mode !== 'trackpad';
      el.textContent = hint(world);
    }
  }
  function init(world) {
    for (const el of document.querySelectorAll('[data-camera-input]')) {
      el.setAttribute('aria-label', PQ.cameraHelp.inputLabel);
      for (const value of ['trackpad','mouse']) el.add(new Option(PQ.cameraHelp[value],value));
      el.onchange = () => {
        mode = el.value;
        try { localStorage.setItem(key,mode); } catch {}
        refresh(world);
      };
    }
    refresh(world);
  }
  function bind(canvas, world) {
    let gestureScale = 0;
    const blocked = () => window.PQStory3D?.active || window.PQFirstDay?.dialogOpen ||
      document.querySelector('dialog[open], #dex.show, #term-pop.show');
    function zoom(factor) {
      if (world.mode === 'fp' && !world.cinematicMode) return;
      const min = world.mode === 'walk' ? 30 : 15;
      const max = world.archipelago ? Math.max(220,220/world.camera.aspect) : world.cinematicMode ? 150 : 96;
      world.spherical.radius = Math.max(min,Math.min(max,world.spherical.radius*factor));
      world.rememberWalkView();
    }
    canvas.addEventListener('wheel', e => {
      if (blocked()) return;
      e.preventDefault();
      if (gestureScale) return;
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? canvas.clientHeight : 1;
      const dx = e.deltaX*unit, dy = e.deltaY*unit;
      if (e.ctrlKey || mode === 'mouse' || world.cinematicMode) {
        zoom(Math.exp(Math.max(-1, Math.min(1,dy * (e.ctrlKey ? .009 : .0014)))));
      } else if (world.detachedFollow || world.archipelago || world.mode === 'pan' || world.mode === 'orbit') {
        world._panByScreenDelta(-dx,-dy);
      } else if (world.mode === 'fp') {
        world.fpYaw += dx*.005;
        world.fpPitch = Math.max(-.78,Math.min(.85,world.fpPitch+dy*.004));
      } else {
        world.spherical.azimuth += dx*.006;
        world.spherical.polar += dy*.004;
        world.spherical = PQWorldFraming.walkView(world.spherical);
        world.rememberWalkView();
      }
    }, {passive:false});
    // Safari emits scale gestures instead of Chromium's Ctrl+wheel pinch.
    canvas.addEventListener('gesturestart', e => {
      if (!blocked()) { e.preventDefault(); gestureScale=e.scale || 1; }
    }, {passive:false});
    canvas.addEventListener('gesturechange', e => {
      if (!gestureScale || blocked() || !(e.scale>0)) return;
      e.preventDefault(); zoom(gestureScale/e.scale); gestureScale=e.scale;
    }, {passive:false});
    canvas.addEventListener('gestureend', e => { if (gestureScale) e.preventDefault(); gestureScale=0; });
    window.addEventListener('blur',()=>{gestureScale=0;});
  }
  return {init, bind, refresh, hint, get trackpad(){return mode==='trackpad';}};
})();
