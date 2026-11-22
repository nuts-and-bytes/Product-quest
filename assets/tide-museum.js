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
  let testedEmpty = false, testedDates = false, touchedReel = false;
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
  // Coordinates match the two cut channels in the Blender tray.
  const slotCenters = [.823, 1.141];
  const slotColors = {idle:0xa8865c, empty:0xefbb72, loaded:0xa3d6b4, sourced:0xffdd89};
  let slotCues;
  const notes = {};
  for (const [i,id] of ['market','yesterday','today'].entries()) {
    const group = new THREE.Group();
    lab.group.add(group);
    box(group,0,0,0,.25,.018,.13,[0xeec582,0xe9c89a,0xd3dfb1][i]);
    const {ctx,texture} = canvasTexture(512, 266);
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(.248,.128),new THREE.MeshBasicMaterial({map:texture}));
    paper.position.y = .0095;
    paper.rotation.x = -Math.PI/2;
    group.add(paper);
    function paintNote(quoted) {
      const {width:w,height:h}=ctx.canvas;
      ctx.fillStyle = ['#f7d38c','#eac79a','#d4e2b4'][i];
      ctx.fillRect(0,0,w,h);
      ctx.font = 'bold 52px system-ui';
      const {text,highlightText} = noteCopy[id];
      const start = text.indexOf(highlightText);
      const x = (w - ctx.measureText(text).width)/2;
      if (quoted) {
        ctx.fillStyle = '#fff6cc';
        ctx.fillRect(x+ctx.measureText(text.slice(0,start)).width-6,96,ctx.measureText(highlightText).width+12,67);
      }
      ctx.fillStyle = '#342e24';
      ctx.fillText(text,x,148);
      ctx.fillRect(36,179,w-72,4);
      texture.needsUpdate = true;
    }
    paintNote(false);
    const glow = new THREE.MeshBasicMaterial({color:0xffdf83});
    const border = new THREE.Mesh(new THREE.PlaneGeometry(.262,.144),glow);
    border.position.y = -.007;border.rotation.x = -Math.PI/2;
    group.add(border);
    notes[id] = {group,border,paintNote,seat:point(0,0,0)};
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
    if (mode==='computer' && (status.textContent!==message || readout.textContent!==detail)) {
      card.querySelector('.reading').scrollTop=0;
    }
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
    document.body.classList.toggle('tide-at-computer', mode === 'computer');
    document.body.classList.remove('tide-focus-note');
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
    showComputer();
  }
  function syncDesk() {
    const group = noteKeys[labState.active] || ['market'];
    for (const [id,note] of Object.entries(notes)) {
      const i = group.indexOf(id);
      const wasVisible=note.group.visible;
      note.group.visible = i>=0;
      if (i<0) continue;
      const inTray = labState.has(id);
      note.seat.set(slotCenters[i],inTray ? 1.085 : 1.073,inTray ? .274 : .438);
      if (!wasVisible || note.group.position.y===0 || reduced.matches) note.group.position.copy(note.seat);
      const quoted = labState.result?.source===id;
      if (note.border.visible!==quoted) note.paintNote(quoted);
      note.border.visible = quoted;
      const marker = noteMarkers[id];
      marker.dataset.inserted = String(inTray);
      marker.dataset.quoted = String(quoted);
      marker.setAttribute('aria-label',noteText(id));
    }
    if (workbenchModel && !slotCues) {
      slotCues = slotCenters.map((_,i)=>{
        const cue = workbenchModel.getObjectByName('NoteSlot'+(i+1));
        if (cue) cue.material = new THREE.MeshBasicMaterial();
        return cue;
      });
    }
    for (const [i,cue] of (slotCues || []).entries()) {
      const id = noteKeys[labState.active]?.[i];
      const state = !id ? 'idle' : labState.result?.source===id ? 'sourced' : labState.has(id) ? 'loaded' : 'empty';
      cue?.material.color.setHex(slotColors[state]);
    }
  }
  function experimentText() {
    const experiment = experiments[labState.active];
    if (!experiment) return { rows: [computer.power.menuHeader] };
    const { question, results, trayStatus } = experiment;
    const result = labState.result?.answer;
    if (labState.active === 'market') {
      if (result === 'grounded') {
        return { rows: [question, results.groundedAnswer, results.groundedCitation.split('（', 1)[0]] };
      }
      if (result === 'missing') {
        return { rows: [question, results.emptyAnswer], guide: true };
      }
      return { rows: labState.has('market') ? [question, results.readyWithNote.split('，', 1)[0]] : [question] };
    }
    if (result === 'today') {
      return { rows: [question, results.bothAnswer, results.bothPointer] };
    }
    if (result === 'yesterdayOnly') {
      return { rows: [question, results.yesterdayOnlyAnswer, results.yesterdayOnlyPointer] };
    }
    if (result === 'unknownToday') return { rows: [question, results.emptyAnswer] };
    const yesterday = labState.has('yesterday');
    const today = labState.has('today');
    const tray = yesterday ? (today ? 'both' : 'yesterdayOnly') : today ? 'todayOnly' : 'empty';
    return { rows: [question, trayStatus[tray]] };
  }

  function terminalLines(ctx, text, x, y, width, stride) {
    let line = '';
    for (const char of text) {
      if (line && ctx.measureText(line + char).width > width) {
        ctx.fillText(line, x, y);
        line = '';
        y += stride;
      }
      line += char;
    }
    if (line) ctx.fillText(line, x, y);
    return y + stride;
  }

  function drawTerminal(rows) {
    const ctx = terminalTexture.ctx;
    const state = labState.feedback;
    const color = { idle: '#c5ded1', empty: '#efbb72', loaded: '#b2e4c4', sourced: '#ffdd89' }[state];
    canvas.dataset.trayState = state;
    ctx.fillStyle = power === 'off' ? '#102521' : '#102b28';
    ctx.fillRect(0, 0, 640, 354);
    if (power !== 'off') {
      const lines = power === 'booting' ? computer.power.bootLines.slice(0, bootStep + 1) : rows;
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#b7d4c4';
      ctx.font = '600 27px system-ui';
      ctx.fillText(power === 'booting' ? computer.power.bootHeader : computer.title, 31, 22, 578);
      ctx.fillStyle = '#558c78';
      ctx.fillRect(31, 62, 578, 2);
      ctx.fillStyle = '#f2e7c9';
      ctx.font = '650 47px system-ui';
      let y = terminalLines(ctx, lines[0] || '', 31, 83, 578, 56);
      for (const [index, line] of lines.slice(1).entries()) {
        ctx.fillStyle = color;
        ctx.font = index === 0 && state !== 'loaded' ? '700 45px system-ui' : '600 36px system-ui';
        y = terminalLines(ctx, line, 31, y + 16, 578, 44);
      }
    }
    terminalTexture.texture.needsUpdate = true;
  }
  function openComputer() {
    open('computer');
    if (power==='off') { power='booting';readyAt=now()+.85;bootStep=0; }
    showComputer();
  }
  function showComputer() {
    syncDesk();
    const {rows,guide}=experimentText();
    drawTerminal(rows);
    if (mode !== 'computer') return;
    card.dataset.trayState = labState.feedback;
    const reloadVisible = Boolean(labState.result || labState.feedback === 'loaded');
    document.body.classList.toggle('tide-focus-note', Boolean(guide));
    const actions=[];
    if (power==='on' && !labState.active) {
      for(const [id,experiment] of Object.entries(experiments)) {
        actions.push(action(experiment.tabLabel,()=>{labState.select(id);showComputer();},'primary'));
      }
    } else if (power==='on') {
      const askLabel = labState.feedback === 'loaded' ? ui.runAgain : ui.askComputer;
      actions.push(action(askLabel,()=>{
        const result=labState.ask();
        testedEmpty ||= result.answer==='missing';
        testedDates ||= result.answer==='today'&&labState.has('yesterday');
        showComputer();
      },guide ? 'secondary' : 'primary'));
      for (const id of noteKeys[labState.active]) {
        actions.push(action(noteText(id),()=>toggleNote(id),guide ? 'primary' : 'secondary tide-note-shortcut'));
      }
      if (reloadVisible) actions.push(action(ui.resetExperiment,()=>{labState.reset();showComputer();},'secondary'));
      actions.push(action(ui.switchExperiment,()=>{labState.select(null);showComputer();},'secondary'));
    }
    actions.push(action(ui.leaveDesk,leave,'secondary'));
    const visibleRows = power === 'booting' ? computer.power.bootLines.slice(0, bootStep + 1) : rows;
    setPanel('', actions, visibleRows.join('\n'));
    if (guide) nav.prepend(nav.querySelector('.primary'));
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
    const el=marker(id,'',()=>toggleNote(id));
    el.className='tide-note-target';
    return [id,el];
  }));
  const placement=point(0,0,0);
  function place(el, world, visible, panel) {
    if(!visible) { el.hidden=true;return; }
    placement.copy(world).project(camera);
    const x=(placement.x+1)*innerWidth/2, y=(1-placement.y)*innerHeight/2;
    const covered=panel && x+22>panel.left && x-22<panel.right && y+22>panel.top && y-22<panel.bottom;
    el.hidden=placement.z>1 || placement.z<0 || x<22 || x>innerWidth-22 || y<22 || y>innerHeight-24 || Boolean(covered);
    if(el.hidden) return;
    el.style.left=x+'px';el.style.top=y+'px';
  }
  function placeMarkers() {
    const pointing = mode==='talk' && now()<gestureUntil;
    place(powerMarker,local(lab,.74,1.26,.23),mode==='roaming'&&nearby===lab || pointing&&talking===lab);
    place(shelfMarker,local(cinema,2.03,1.71,.03),mode==='roaming'&&nearby===cinema || pointing&&talking===cinema);
    const panel=mode==='computer' ? card.getBoundingClientRect() : null;
    for(const [id,note] of Object.entries(notes)) {
      const el=noteMarkers[id];
      const visible=mode==='computer'&&power==='on'&&Boolean(noteKeys[labState.active]?.includes(id));
      place(el,local(lab,note.group.position.x,note.group.position.y+.01,note.group.position.z),visible,panel);
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
  const trayPlane=new THREE.Plane(point(0,1,0),-1.086);
  const trayHit=point(0,0,0);
  function tap(e) {
    if(mode!=='computer' && (mode!=='roaming' || !nearby)) return;
    ray.setFromCamera({x:e.clientX/innerWidth*2-1,y:1-e.clientY/innerHeight*2},camera);
    if(mode==='computer') {
      const slots = power==='on' && noteKeys[labState.active];
      if (!slots || !workbenchModel || !ray.ray.intersectPlane(trayPlane,trayHit)) return;
      lab.group.worldToLocal(trayHit);
      const slot=slotCenters.findIndex(x=>Math.abs(trayHit.x-x)<.134);
      if (slots[slot] && trayHit.z>.188 && trayHit.z<.378) toggleNote(slots[slot]);
      return;
    }
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
      position=portrait ? local(lab,.63,1.79,2.60) : local(lab,.54,1.47,1.23);
      target=portrait ? local(lab,.84,1.12,.19) : local(lab,.54,1.31,.04);
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
    const deskFov = 49 + Math.max(0, 1.9 - camera.aspect) * 32;
    const fov=portrait&&target ? portraitFov : mode==='computer' ? deskFov : 65;
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
    if (workbenchModel && !slotCues) syncDesk();
    for (const {group,seat} of Object.values(notes)) {
      if (!group.visible || group.position.equals(seat)) continue;
      if (reduced.matches || group.position.distanceToSquared(seat)<.000001) group.position.copy(seat);
      else group.position.lerp(seat,1-Math.exp(-dt*24));
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
