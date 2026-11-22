/* Tide Museum walking, exhibit controls and continuous in-room projection. */
(function () {
  'use strict';

  const copy = window.TideTrialCopy;
  const {ui, dialogue, proximity, computer, projection} = copy;
  const labState = TideInteractions.createWorkbench();
  const playback = TideInteractions.createScreening(TideFilms.duration);
  const sound = TideFilms.createSound();
  const card = document.querySelector('aside');
  const heading = document.querySelector('#station-title');
  const status = document.querySelector('#status');
  const readout = document.querySelector('#readout');
  const label = document.querySelector('#label');
  const labelToggle = label.querySelector('summary');
  const nav = document.querySelector('nav');
  const reels = document.querySelector('#tide-reels');
  const progress = document.querySelector('#tide-progress');
  const markers = document.querySelector('#tide-markers');
  const pad = document.querySelector('#stick');
  const now = () => performance.now() / 1000;
  const clamp = THREE.MathUtils.clamp;
  const point = (x, y, z) => new THREE.Vector3(x, y, z);
  const local = (s, x, y, z) => s.group.localToWorld(point(x, y, z));
  const coarse = matchMedia('(pointer:coarse)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const stand = camera.position.clone();
  const viewRotation = new THREE.Euler(0,0,0,'YXZ');
  const targetRot = new THREE.Quaternion();
  const targetMatrix = new THREE.Matrix4();
  const keys = new Set();
  const stick = {x: 0, y: 0};
  const visited = new Set();
  let yaw = -.20, pitch = 0, travel = 0, pointer, drag;
  let mode = 'roaming', nearby = null, talking = null;
  let gestureUntil = 0, power = 'off', readyAt = 0, bootStep = 0;
  let testedEmpty = false, testedDates = false, resetDone = false, touchedReel = false;
  let frameKey = '', brightness = 1, lastFocus = null;
  let archived = false;
  try { archived = localStorage.getItem('pq-museum-design-record') === '1'; } catch {}

  function canvasTexture(w,h) {
    const paper = document.createElement('canvas');
    paper.width = w; paper.height = h;
    const texture = new THREE.CanvasTexture(paper);
    texture.colorSpace = THREE.SRGBColorSpace;
    return { ctx: paper.getContext('2d'), texture };
  }
  const terminalTexture = canvasTexture(640, 354);
  const terminal = new THREE.MeshBasicMaterial({map:terminalTexture.texture});
  display.material = terminal;
  const powerMaterial = new THREE.MeshBasicMaterial({color:0xe4ad62});
  const powerSwitch = new THREE.Mesh(new THREE.CircleGeometry(.041,24), powerMaterial);
  powerSwitch.position.set(.73,1.222,.145);
  lab.group.add(powerSwitch);

  const noteKeys = {market:['market'], dates:['yesterday','today']};
  const experiments = {market:computer.experiments[0],dates:computer.experiments[1]};
  const noteCopy = {market:experiments.market.note,...experiments.dates.notes};
  const notes = {};
  for (const [i,id] of ['market','yesterday','today'].entries()) {
    const group = new THREE.Group();
    lab.group.add(group);
    box(group,0,0,0,.34,.024,.18,[0xeec582,0xe9c89a,0xd3dfb1][i]);
    const paper = placard(group,0,.013,0,.33,.17,(ctx,w,h) => {
      ctx.fillStyle = ['#f7d38c','#eac79a','#d4e2b4'][i];
      ctx.fillRect(0,0,w,h);
      ctx.fillStyle = '#342e24';ctx.textAlign = 'center';
      ctx.font = 'bold 71px system-ui';
      ctx.fillText(noteCopy[id].text,w/2,h*.59,w-50);
      ctx.fillRect(w*.12,h*.74,w*.76,5);
    });
    paper.rotation.x = -Math.PI/2;
    const glow = new THREE.MeshBasicMaterial({ color:0xffe29a, transparent:true, opacity:.55, depthWrite:false });
    const border = new THREE.Mesh(new THREE.PlaneGeometry(.375,.212),glow);
    border.position.y = .002;border.rotation.x = -Math.PI/2;
    group.add(border);
    notes[id] = {group,border};
  }

  const screenX = 4.75;
  const screenCenter = local(cinema, screenX, 2.14, -.38);
  const screenWidth = 4.4, screenHeight = screenWidth * 9 / 16;
  box(cinema.group,screenX,2.14,-.45,4.58,2.66,.16,0x35231e);
  const filmTexture = canvasTexture(TideFilms.width, TideFilms.height);
  filmTexture.texture.generateMipmaps=false;
  filmTexture.texture.minFilter=THREE.LinearFilter;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(screenWidth,screenHeight),
    new THREE.MeshBasicMaterial({ map:filmTexture.texture }));
  screen.position.set(screenX,2.14,-.3685);cinema.group.add(screen);
  const spill = new THREE.PointLight(0xffbe87,0,7);
  spill.position.copy(screenCenter).add(point(.80,0,0));scene.add(spill);
  box(cinema.group,2.02,1.50,-.19,.83,.08,.48,0x8c6745);
  const reelColors=['#c69558','#a97066','#81a39d'];
  const reelShape=new THREE.CylinderGeometry(.121,.121,.06,28);
  for(let i=0;i<3;i++) {
    const {ctx,texture}=canvasTexture(128,128);
    ctx.fillStyle=reelColors[i];ctx.fillRect(0,0,128,128);
    ctx.strokeStyle='#f2d89c88';ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(64,64,57,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='#322d2d';
    for(let hole=0;hole<5;hole++) {
      const angle=hole*Math.PI*2/5;
      ctx.beginPath();ctx.arc(64+32*Math.cos(angle),64+32*Math.sin(angle),12,0,Math.PI*2);ctx.fill();
    }
    ctx.beginPath();ctx.arc(64,64,6,0,Math.PI*2);ctx.fill();
    const rim=new THREE.MeshStandardMaterial({color:reelColors[i],roughness:.64});
    const face=new THREE.MeshStandardMaterial({map:texture,roughness:.64});
    const reel = new THREE.Mesh(reelShape,[rim,face,face]);
    reel.rotation.x=Math.PI/2;reel.position.set(1.75+i*.255,1.657,-.06);
    reel.userData.film=i;
    cinema.group.add(reel);
  }

  function action(text, activate, variant = '') { return {text,activate,variant}; }
  function button({text,activate,variant}) {
    const el = document.createElement('button');
    el.type='button';el.textContent=text;el.className=variant;el.onclick=activate;
    return el;
  }
  function setPanel(message, actions, detail = '') {
    const oldText = nav.contains(document.activeElement) && document.activeElement.textContent;
    if (status.textContent !== message) status.textContent = message;
    readout.hidden = !detail;
    if (readout.textContent !== detail) readout.textContent = detail;
    nav.replaceChildren(...actions.map(button));
    if (oldText) {
      const next = [...nav.children].find(b => b.textContent === oldText) || nav.querySelector('.primary, button');
      next?.focus({preventScroll:true});
    }
  }
  function setLabel(station) {
    const exhibit=copy.labels[station === lab ? 'shitou' : station === cinema ? 'cinema' : 'archive'];
    label.hidden = false;
    labelToggle.textContent = label.open ? ui.closeLabel : ui.readLabel;
    label.querySelector('small').textContent = exhibit.subtitle;
    label.querySelector('h3').textContent = exhibit.title;
    label.querySelector('p').textContent = exhibit.body;
    label.querySelector('footer').textContent = exhibit.cue;
  }
  label.ontoggle = () => {
    labelToggle.textContent = label.open ? copy.ui.closeLabel : copy.ui.readLabel;
    if (label.open) labelToggle.scrollIntoView({block:'nearest'});
  };

  function resetStick() {
    pointer = null;stick.x = stick.y = 0;
    pad.firstElementChild.style.transform='';
  }
  function open(next) {
    if (mode === 'roaming') lastFocus = document.activeElement;
    mode = next;
    card.dataset.mode = mode;
    card.classList.toggle('visiting', mode!=='roaming');
    heading.hidden = label.hidden = true;
    label.open = false;
    progress.hidden = mode!=='screen';
    reels.replaceChildren();
    travel = 0; keys.clear();resetStick();
    card.querySelector('.reading').scrollTop=0;
  }
  function leave(stop = true) {
    if (stop && playback.showing) stopFilm();
    open('roaming');
    talking = nearby = null;
    showPrompt(true);
    if (lastFocus?.isConnected && !lastFocus.hidden) lastFocus.focus({preventScroll:true});
    lastFocus = null;
  }

  function stoneState() {
    if (archived) return 'afterArchived';
    if (testedDates && labState.completedMarket) return 'afterExp2Done';
    if (labState.completedMarket) return 'afterExp1Done';
    if (labState.has('market')) return 'afterNoteInserted';
    if (testedEmpty) return 'afterExp1Empty';
    return power==='on' ? 'afterPowerOn' : 'beforeComputer';
  }
  function watchReply() {
    const q=dialogue.projectionist.questions.whatWasThatFilm;
    if (playback.finished !== null) return q.replyByCompletedFilm[playback.finished];
    return touchedReel ? q.replySelectedOrStoppedOnly : q.replyNeverStarted;
  }
  function projectionReply() {
    const q=dialogue.projectionist.questions.whichFirst;
    if (watched.size===3) return q.replyAfterWatchedAll;
    if (watched.has(0)&&watched.has(1)) return q.replyAfterWatched1And2;
    if (watched.has(0)) return q.replyAfterWatched1Only;
    return q.replyBeforeWatched;
  }
  const watched=new Set();
  function showTalk(station, message = '') {
    if (mode !== 'talk' || talking !== station) {
      open('talk'); talking = station;
    }
    heading.hidden = false;heading.textContent = station.title + ' · ' + station.place;
    setLabel(station);
    const end = action(ui.endTalk,leave,'secondary');
    if (station === lab) {
      const {openings,questions:q}=dialogue.stone;
      const why = labState.completedMarket ? q.whyCorrect.replyAfterExp1Note :
        labState.has('market') ? openings.afterNoteInserted :
          testedEmpty ? q.whyCorrect.replyAfterEmptyOnly : q.whyCorrect.replyBeforePowerOrUntried;
      setPanel(message || openings[stoneState()], [
        action(q.howToPlay.label, () => {
          gestureUntil=now()+5;
          showTalk(lab,power==='off' ? q.howToPlay.replyBeforePower : q.howToPlay.replyAfterPower);
        },'primary'),
        action(q.whyCorrect.label, () => showTalk(lab,why)),
        ...(testedDates ? [action(q.whyTrustToday.label, () => showTalk(lab,q.whyTrustToday.reply))] : []),
        ...(labState.completedMarket ? [action(q.whereNext.label, () => showTalk(lab,q.whereNext.reply))] : []),
        action(ui.selfExplore,leave,'secondary')
      ]);
    } else if (station === cinema) {
      const {openings,questions:q}=dialogue.projectionist;
      const opening=playback.finished!==null ? openings.afterWatchedByFilm[playback.finished] :
        playback.status==='stopped' ? openings.afterStoppedNoWatch : openings.beforeWatched;
      setPanel(message || opening, [
        action(q.whichFirst.label, () => { gestureUntil=now()+5;showTalk(cinema,projectionReply()); },'primary'),
        action(q.whatWasThatFilm.label, () => showTalk(cinema,watchReply())),
        action(ui.selfExplore,leave,'secondary')
      ]);
    } else {
      const ready = labState.completedMarket && !archived;
      const actions = [];
      if (ready) actions.push(action(copy.ui.archiveRecord, () => {
        archived=true;
        try { localStorage.setItem('pq-museum-design-record','1'); } catch {}
        showTalk(archive);
      }, 'primary'));
      setPanel(archived ? copy.archive.archived : ready ? copy.archive.readyToArchive : copy.archive.beforeExperiment,[...actions,end]);
    }
  }

  function noteText(id) {
    const note=noteCopy[id];
    return labState.has(id) ? note.takeAction : note.putAction;
  }
  function toggleNote(id) {
    labState.toggle(id);
    resetDone=false;
    showComputer();
  }
  function syncDesk() {
    const group = noteKeys[labState.active] || ['market'];
    for (const [id,note] of Object.entries(notes)) {
      const i = group.indexOf(id);
      note.group.visible = i>=0;
      if (i<0) continue;
      const inTray = labState.has(id);
      const pair=group.length===2;
      const x=pair ? .75+.38*i : inTray ? .91 : 1.28;
      const z=inTray ? .35 : (pair ? .15 : .26);
      note.group.position.set(x,deskReady ? 1.125 : 1.08,z);
      note.group.rotation.y = inTray ? 0 : (i===0 ? -.13 : .12);
      note.border.visible = labState.result?.source===id;
    }
  }
  function experimentText() {
    const experiment=experiments[labState.active];
    if (!experiment) return {prompt:computer.power.menuPrompt, rows:[]};
    const {question,results,prompts,trayStatus}=experiment;
    const result=labState.result?.answer;
    if (labState.active==='market') {
      const hasNote=labState.has('market');
      if(result==='grounded') return {
        prompt:prompts.afterGrounded,
        rows:[question,results.groundedAnswer,results.groundedCitation]
      };
      if(result==='missing') return {prompt:prompts.afterEmpty,rows:[question,results.emptyAnswer]};
      return {
        prompt:resetDone ? prompts.afterReset : hasNote ? prompts.noteInTray : prompts.emptyIdle,
        rows:[question,hasNote ? trayStatus.loaded : trayStatus.empty]
      };
    }
    const y=labState.has('yesterday'), t=labState.has('today');
    if(result==='today') return {
      prompt:y ? prompts.afterBoth : results.todayOnlyDetail,
      rows:[question,results.bothAnswer,results.bothPointer]
    };
    if(result==='yesterdayOnly') return {
      prompt:prompts.afterYesterdayOnly,rows:[question,results.yesterdayOnlyAnswer,results.yesterdayOnlyPointer]
    };
    if(result==='unknownToday') return {prompt:results.emptyDetail,rows:[question,results.emptyAnswer]};
    const tray=y ? (t ? 'both' : 'yesterdayOnly') : t ? 'todayOnly' : 'empty';
    const hints={both:prompts.bothInTray,yesterdayOnly:prompts.oneInTrayYesterday,todayOnly:prompts.oneInTrayToday,empty:prompts.emptyIdle};
    return {prompt:resetDone ? prompts.afterReset : hints[tray],rows:[question,trayStatus[tray]]};
  }
  function drawTerminal(rows) {
    const ctx=terminalTexture.ctx;
    const color = labState.result?.source ? '#fad587' : '#b7e2c5';
    ctx.fillStyle=power==='off'?'#102521':'#133c39';
    ctx.fillRect(0,0,640,354);
    if (power!=='off') {
      ctx.strokeStyle='#7cb49e25';
      for (let x=16;x<640;x+=24) ctx.strokeRect(x,0,1,354);
      for (let y=8;y<354;y+=24) ctx.strokeRect(0,y,640,1);
      ctx.fillStyle=color;ctx.font='700 28px system-ui';
      ctx.fillText(power==='booting' ? computer.power.bootHeader : computer.title,28,49,575);
      ctx.fillRect(29,70,577,2);
      ctx.font='600 30px system-ui';
      const lines=power==='booting' ? computer.power.bootLines.slice(0,bootStep+1) :
        labState.active ? rows : Object.values(experiments).map(experiment=>experiment.tabLabel);
      lines.forEach((row,i)=>ctx.fillText(row,30,138+i*65,580));
    }
    terminalTexture.texture.needsUpdate=true;
  }
  function openComputer() {
    open('computer');
    if (power==='off') { power='booting';readyAt=now()+.85;bootStep=0; }
    showComputer();
  }
  function showComputer() {
    syncDesk();
    const {prompt,rows}=experimentText();
    drawTerminal(rows);
    if (mode !== 'computer') return;
    heading.hidden=false;
    heading.textContent=power==='booting' ? computer.power.bootHeader :
      experiments[labState.active]?.title || computer.power.menuHeader;
    const actions=[];
    if (power==='on' && !labState.active) {
      for(const [id,experiment] of Object.entries(experiments)) {
        actions.push(action(experiment.tabLabel,()=>{labState.select(id);resetDone=false;showComputer();},'primary'));
      }
    } else if (power==='on') {
      actions.push(action(ui.askComputer,()=>{
        const result=labState.ask();
        testedEmpty ||= result.answer==='missing';
        testedDates ||= result.answer==='today'&&labState.has('yesterday');
        resetDone=false;showComputer();
      },'primary'));
      for(const id of noteKeys[labState.active]) actions.push(action(noteText(id),()=>toggleNote(id)));
      actions.push(action(ui.resetExperiment,()=>{labState.reset();resetDone=true;showComputer();},'secondary'));
      actions.push(action(ui.switchExperiment,()=>{labState.select(null);showComputer();},'secondary'));
    }
    actions.push(action(ui.leaveDesk,leave,'secondary'));
    setPanel(power==='booting' ? computer.power.bootLines[bootStep] : prompt,actions,rows.join('\n'));
  }

  function chooseFilm(index) {
    touchedReel=true;
    const wasPlaying = playback.showing;
    sound.silence();
    playback.select(index,now());
    if (wasPlaying) sound.enable();
    showCinema();
  }
  function playFilm() {
    touchedReel=true;
    sound.enable();
    playback.play(now());
    open('screen');showCinema();
  }
  function stopFilm() {
    sound.silence();
    playback.stop();
  }
  function showCinema() {
    const active = playback.showing;
    const exit=action(active ? ui.leaveScreening : ui.returnToWalk,leave,'secondary');
    const pause=action(playback.status==='paused' ? ui.resumeScreening : ui.pauseScreening,()=>{
      if (playback.status==='paused') playFilm();
      else { playback.pause(now());sound.silence();showCinema(); }
    },'primary');
    const stop=action(ui.stopScreening,()=>{stopFilm();open('shelf');showCinema();},'secondary');
    if (mode==='screen') {
      setPanel(projection.reels[playback.selected].title+' · '+projection.status[playback.status],[
        active ? pause : action(ui.replayFilm,playFilm,'primary'),
        action(ui.switchFilm,()=>{open('shelf');showCinema();}),
        ...(active ? [stop] : []),exit
      ]);
      return;
    }
    heading.hidden=false;heading.textContent=projection.title;
    const focused = reels.contains(document.activeElement);
    reels.replaceChildren(...projection.reels.map((film,index)=>{
      const el=button(action(film.title,()=>chooseFilm(index)));
      el.setAttribute('aria-pressed',String(index===playback.selected));
      const duration=document.createElement('span'),summary=document.createElement('small');
      duration.textContent=film.durationLabel;summary.textContent=film.summary;
      el.append(duration,summary);
      return el;
    }));
    if (focused) reels.children[playback.selected].focus({preventScroll:true});
    setPanel(active ? projection.status[playback.status] :
      playback.status==='stopped' ? projection.screenOverlay.stopped : projection.rackSubtitle,[
      active ? action(ui.hideRackPanel,()=>{open('screen');showCinema();},'primary') : action(ui.startScreening,playFilm,'primary'),
      ...(active ? [stop] : []),exit
    ]);
  }
  function openShelf() { open('shelf');showCinema(); }

  function cinemaGreeting() {
    if (playback.finished!==null) return proximity.projectionist.afterWatchedByFilm[playback.finished];
    return playback.status==='stopped' ? proximity.projectionist.afterStopped : proximity.projectionist.beforeWatched;
  }
  function showPrompt(force = false) {
    const next = stations.find(s=>Math.hypot(s.x-stand.x,s.z-stand.z)<3.4) || null;
    if (!force && next === nearby) return;
    nearby = next;
    const actions = [];
    let message = coarse.matches ? ui.browseHintTouch : ui.hintDesktop+' · '+ui.browseHintDesktop;
    const greet = (line, fallback) => {
      if (visited.has(line)) return fallback;
      visited.add(line);
      return line;
    };
    if (next===lab) {
      message = greet(proximity.stone[stoneState()],lab.place);
      actions.push(action(ui.talkStone,()=>showTalk(lab)),action(power==='off' ? ui.openComputer : ui.useComputer,openComputer));
    } else if(next===cinema) {
      message = greet(cinemaGreeting(),cinema.place);
      actions.push(action(ui.talkProjectionist,()=>showTalk(cinema)),action(ui.openFilmRack,openShelf));
    } else if(next===archive) {
      message=archive.place;actions.push(action(copy.ui.visitPrefix+archive.title,()=>showTalk(archive)));
    }
    setPanel(message,actions);
  }

  const marker = (id,text,activate) => {
    const el=button(action(text,activate));
    el.dataset.spot=id;el.hidden=true;
    markers.append(el);
    return el;
  };
  const powerMarker=marker('power','⏻',openComputer);
  powerMarker.setAttribute('aria-label',ui.openComputer);
  powerMarker.title=ui.openComputer;
  const shelfMarker=marker('shelf',ui.openFilmRack,openShelf);
  const noteMarkers=Object.fromEntries(Object.keys(notes).map(id=>{
    const copy=noteCopy[id];
    const el=marker(id,copy.text,()=>toggleNote(id));
    const i=copy.text.indexOf(copy.highlightText);
    const mark=document.createElement('mark');
    mark.textContent=copy.highlightText;
    el.replaceChildren(copy.text.slice(0,i),mark,copy.text.slice(i+copy.highlightText.length));
    return [id,el];
  }));
  const placement=point(0,0,0);
  function place(el, world, visible, bottom = Infinity) {
    if(!visible) { el.hidden=true;return; }
    placement.copy(world).project(camera);
    const x=(placement.x+1)*innerWidth/2, y=Math.min(bottom,(1-placement.y)*innerHeight/2);
    el.hidden=placement.z>1 || placement.z<0 || x<22 || x>innerWidth-22 || y<22 || y>innerHeight-24;
    if(el.hidden) return;
    el.style.left=x+'px';el.style.top=y+'px';
  }
  function placeMarkers() {
    const pointing = mode==='talk' && now()<gestureUntil;
    place(powerMarker,local(lab,.74,1.26,.23),mode==='roaming'&&nearby===lab || pointing&&talking===lab);
    place(shelfMarker,local(cinema,2.03,1.71,.03),mode==='roaming'&&nearby===cinema || pointing&&talking===cinema);
    const abovePanel=mode==='computer' ? card.getBoundingClientRect().top-25 : Infinity;
    for(const [id,note] of Object.entries(notes)) {
      const el=noteMarkers[id];
      const visible=mode==='computer'&&power==='on'&&Boolean(noteKeys[labState.active]?.includes(id));
      el.dataset.inserted=String(labState.has(id));
      el.dataset.quoted=String(labState.result?.source===id);
      el.setAttribute('aria-label',noteText(id));
      place(el,lab.group.localToWorld(note.group.position.clone().add(point(0,.04,.025))),visible,abovePanel);
    }
  }

  function move(side,forward) {
    const x=stand.x+Math.cos(yaw)*side-Math.sin(yaw)*forward;
    const z=stand.z-Math.sin(yaw)*side-Math.cos(yaw)*forward;
    const clear=(x,z)=>stations.every(s=>Math.abs(s.z-z)>1.9||Math.sign(s.x)*x<2.41);
    if(clear(x,stand.z))stand.x=clamp(x,-4.02,4.02);
    if(clear(stand.x,z))stand.z=clamp(z,-10.45,10.45);
  }
  const ray=new THREE.Raycaster();
  function tap(e) {
    if(mode!=='roaming' || !nearby) return;
    ray.setFromCamera({x:e.clientX/innerWidth*2-1,y:1-e.clientY/innerHeight*2},camera);
    const hit=ray.intersectObject(nearby.group,true)[0];
    if(!hit || hit.distance>4) return;
    const p=nearby.group.worldToLocal(hit.point);
    if (nearby===lab && Math.hypot(p.x-.73,p.y-1.22)<.22) openComputer();
    else if (nearby===cinema && p.x>=-.25) {
      open('shelf');
      if (hit.object.userData.film!==undefined) chooseFilm(hit.object.userData.film);
      else showCinema();
    }
    else showTalk(nearby);
  }
  canvas.addEventListener('pointerdown',e=>{
    if(drag)return;
    drag={id:e.pointerId,x:e.clientX,y:e.clientY,amount:0};
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{
    if(drag?.id!==e.pointerId)return;
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    drag.amount+=Math.abs(dx)+Math.abs(dy);drag.x=e.clientX;drag.y=e.clientY;
    if(mode==='roaming'){yaw-=dx*.004;pitch=clamp(pitch-dy*.003,-1.1,1.05);}
  });
  canvas.addEventListener('pointerup',e=>{
    if(drag?.id!==e.pointerId)return;
    const hit=drag.amount<7;drag=null;
    if(hit)tap(e);
  });
  canvas.addEventListener('pointercancel',()=>drag=null);
  canvas.addEventListener('wheel',e=>{
    e.preventDefault();
    if(mode==='roaming'&&!e.ctrlKey){const unit=e.deltaMode?12:1;yaw-=e.deltaX*unit*.004;travel=clamp(travel+e.deltaY*unit*.008,-3,3);}
  },{passive:false});
  addEventListener('keydown',e=>{
    if(e.altKey||e.ctrlKey||e.metaKey)return;
    if(e.code==='Escape'&&mode!=='roaming'){leave();return;}
    if(mode!=='roaming')return;
    if(e.code==='KeyE'&&nearby&&!e.repeat){showTalk(nearby);return;}
    if(['KeyW','KeyS','KeyA','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();keys.add(e.code);}
  });
  addEventListener('keyup',e=>keys.delete(e.code));
  function slide(e) {
    if(pointer!==e.pointerId)return;
    const r=pad.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2;
    const scale=Math.max(24,Math.hypot(x,y));
    stick.x=x/scale;stick.y=-y/scale;
    pad.firstElementChild.style.transform='translate('+stick.x*22+'px,'+(-stick.y*22)+'px)';
  }
  pad.onpointerdown=e=>{pointer=e.pointerId;pad.setPointerCapture(pointer);slide(e);};
  pad.onpointermove=slide;
  pad.onlostpointercapture=resetStick;
  addEventListener('blur',()=>{keys.clear();resetStick();travel=0;drag=null;});
  addEventListener('pagehide',()=>{if(playback.showing)stopFilm();});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden && playback.status==='playing') {
      playback.pause(now());sound.silence();showCinema();
    }
  });

  const up=point(0,1,0), stoneLocal=point(0,0,0);
  const portraitFov=79;
  function updateCamera(dt) {
    const portrait=camera.aspect<.9;
    let position=stand,target;
    if(mode==='computer') {
      position=portrait ? local(lab,.63,1.79,2.60) : local(lab,.56,1.68,1.48);
      target=portrait ? local(lab,.84,1.12,.19) : local(lab,.70,1.12,.13);
    } else if(mode==='screen' || mode==='shelf') {
      const halfWidthPerMeter=Math.tan(THREE.MathUtils.degToRad(portraitFov/2))*camera.aspect;
      const distance = portrait ? clamp(screenWidth/(2*halfWidthPerMeter*.88),3.72,7.6) : 3.72;
      position=screenCenter.clone().add(point(distance,-.29,0));
      target=screenCenter.clone().add(point(0,-.22,0));
    }
    const blend=reduced.matches?1:1-Math.exp(-dt*11);
    camera.position.lerp(position,blend);
    if(target) {
      targetMatrix.lookAt(position,target,up);
      targetRot.setFromRotationMatrix(targetMatrix);
    } else targetRot.setFromEuler(viewRotation.set(pitch,yaw,0,'YXZ'));
    camera.quaternion.slerp(targetRot,blend);
    const fov=portrait&&target?portraitFov:65;
    if(camera.fov!==fov) {camera.fov=fov;camera.updateProjectionMatrix();}
    camera.updateMatrixWorld();
  }
  function updateFilm(dt) {
    const previous=playback.status;
    const time=playback.update(now());
    if (previous!==playback.status) {
      watched.add(playback.finished);
      sound.silence();
      showCinema();
    }
    if (playback.status==='playing') sound.render(playback.selected,time);
    if (mode==='screen') progress.value=time;
    const key=playback.showing?playback.selected+':'+Math.floor(time*30):'off';
    if (key!==frameKey) {
      frameKey=key;
      if (playback.showing) TideFilms.render(filmTexture.ctx,playback.selected,time,projection.reels[playback.selected]);
      else {
        const ctx=filmTexture.ctx;
        const matte=ctx.createLinearGradient(0,0,960,540);
        matte.addColorStop(0,'#524b40');matte.addColorStop(1,'#2d3032');
        ctx.fillStyle=matte;ctx.fillRect(0,0,960,540);
      }
      filmTexture.texture.needsUpdate=true;
    }
    const desired=playback.showing?.29:1;
    brightness=THREE.MathUtils.lerp(brightness,desired,reduced.matches?1:1-Math.exp(-dt*4));
    ambient.intensity=1.5*brightness;
    light.intensity=1.65*brightness;
    spill.intensity=playback.showing?1.9*(1-brightness):0;
  }

  function resize() {
    camera.aspect=innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth,innerHeight,false);
  }
  resize();addEventListener('resize',resize);
  open('roaming');showPrompt(true);showComputer();
  const clock=new THREE.Clock();
  renderer.setAnimationLoop(time=>{
    const dt=Math.min(clock.getDelta(),.065);
    if(mode==='roaming'){
      yaw+=((+keys.has('ArrowLeft'))-(+keys.has('ArrowRight')))*dt*1.7;
      const side=stick.x+(+keys.has('KeyD'))-(+keys.has('KeyA'));
      const forward=stick.y+(+(keys.has('KeyW')||keys.has('ArrowUp')))-(+(keys.has('KeyS')||keys.has('ArrowDown')));
      const stride=dt*3.2/Math.max(1,Math.hypot(side,forward)),wheel=travel*(1-Math.exp(-dt*9));
      travel-=wheel;move(side*stride,forward*stride+wheel);showPrompt();
    }
    if(power==='booting') {
      const remaining=readyAt-now(), step=clamp(Math.floor((.85-remaining)/.27),0,2);
      if(remaining<=0){power='on';showComputer();}
      else if(step!==bootStep){bootStep=step;showComputer();}
    }
    updateCamera(dt);
    updateFilm(dt);
    stoneMixer?.update(dt);
    const labPoint=mode==='talk'&&talking===lab&&now()<gestureUntil;
    lab.group.worldToLocal(stoneLocal.copy(stand));
    const playerAngle=Math.atan2(stoneLocal.x+1.23,stoneLocal.z-.65);
    const direction=labPoint?.75:nearby===lab||talking===lab?clamp(playerAngle,-.74,.74):0;
    stoneLook=THREE.MathUtils.lerp(stoneLook,direction,1-Math.exp(-dt*7));
    stoneHead?.rotateY(stoneLook);
    stations.forEach((s,i)=>{
      if(!s.rig)return;
      const listening=s===nearby||s===talking;
      const pointing=s===talking&&now()<gestureUntil;
      s.rig.head.rotation.y=(listening?-.22:0)+Math.sin(time*.0007+i)*.10;
      s.rig.rightArm.rotation.x=(pointing?-1:mode==='talk'&&s===talking?-.45:-.10)+Math.sin(time*.0015+i)*.045;
      s.rig.rightArm.rotation.z=pointing?-.58:0;
    });
    powerMaterial.color.setHex(labPoint?0xffef9b:power==='on'?0xe4d777:0xe4ad62);
    pixels.forEach((p,i)=>{p.scale.y=.09+.5*Math.abs(Math.sin(i*(playback.selected+1)*.25+time*.001));});
    placeMarkers();
    renderer.render(scene,camera);
  });
}());
