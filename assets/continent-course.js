/* Field courses use the outdoor player, routes and save file. Each choice is
   committed only when the player leaves the result for the next chapter. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const courses = PQ.continentCourses;
  const ui = courses.ui;
  const offsets = [[-4, -3], [1, 5], [5, 0]];
  let region, course, index, replay, pendingSite, stations, returnPosition, returnToOverview;

  const panel = () => $('field-dialog');
  const chapter = () => course.chapters[index];
  const log = () => G.fieldCourses[region.id];
  const record = () => replay || log()[index];
  const persist = () => { if (!replay) G.save(); };

  function node(tag, value, parent) {
    const el = document.createElement(tag);
    el.textContent = value;
    parent.append(el);
    return el;
  }

  function button(parent, label, action) {
    const el = node('button', label, parent);
    el.type = 'button';
    el.onclick = action;
    return el;
  }

  function stopWalking() {
    pendingSite = null;
    PQIsland.visibility.stopWalking();
    PQIsland.goalRing.visible = false;
  }

  function dialog(title, body) {
    stopWalking();
    const d = panel();
    d.replaceChildren();
    node('small', region.continent + ' / ' + region.name, d);
    const h = node('h2', title, d);
    h.id = 'field-dialog-title';
    h.tabIndex = -1;
    if (body) node('p', body, d);
    if (!d.open) d.showModal();
    h.focus();
    d.scrollTop = 0;
    return d;
  }

  function depart() {
    panel().close();
    const c = chapter();
    const r = record();
    $('field-heading').textContent = (index + 1) + ' / ' + course.chapters.length + '　' + c.title;
    $('field-task').textContent = r.seen === 3 ? ui.choose : ui.inspect;
    const list = $('field-sites');
    list.replaceChildren();
    c.evidence.forEach((e, i) => {
      button(list, ((r.seen & (1 << i)) ? '✓ ' : '◇ ') + e.title, () => travel(i));
    });
    button(list, '◎ 作出选择', () => travel(2)).disabled = r.seen !== 3;
    $('field-menu').focus({preventScroll:true});
  }

  function startChapter(n) {
    index = n;
    stations.stage(n);
    replay = log()[n]?.done ? {seen:0, choice:null} : null;
    if (!log()[n]) {
      log()[n] = {seen:0, choice:null};
      persist();
    }
    const c = chapter();
    if (record().choice !== null) { result(); return; }
    const d = dialog(c.title, c.brief);
    node('small', c.speaker, d);
    button(d, ui.resume, depart);
    button(d, ui.route, directory);
  }

  function directory() {
    index = null;
    replay = null;
    const completed = log().filter(r => r.done).length;
    const d = dialog(course.title, completed === course.chapters.length ? course.ending : course.intro);
    node('p', ui.completed + '　' + completed + ' / ' + course.chapters.length, d);
    course.chapters.forEach((c, i) => {
      const done = i < completed;
      const b = button(d, (done ? '✓ ' : i === completed ? '→ ' : '· ') + c.title, () => startChapter(i));
      b.disabled = i > completed;
      if (done) {
        const chosen = c.actions[log()[i].choice];
        node('small', chosen.title + ' · ' + ui.replay, b);
        const recap = document.createElement('details');
        node('summary', ui.outcome, recap);
        node('p', chosen.result, recap);
        d.append(recap);
      }
    });
    button(d, ui.returnMap, leave);
  }

  function inspect(i) {
    if (index === null) return;
    const c = chapter(), r = record();
    if (i < 2) {
      r.seen |= 1 << i;
      persist();
      const e = c.evidence[i];
      const d = dialog(e.title, e.body);
      button(d, ui.resume, depart);
      return;
    }
    if (r.seen !== 3) return;
    const d = dialog('作出选择', c.brief);
    c.evidence.forEach(e => {
      const item = document.createElement('details');
      node('summary', e.title, item);
      node('p', e.body, item);
      d.append(item);
    });
    c.actions.forEach((a, k) => button(d, a.title, () => {
      r.choice = k;
      persist();
      result();
    }));
  }

  function result() {
    const c = chapter(), r = record(), a = c.actions[r.choice];
    const d = dialog(ui.outcome, a.result);
    node('small', a.title, d);
    const review = document.createElement('details');
    node('summary', ui.evidence, review);
    c.evidence.forEach(e => node('p', e.title + '　' + e.body, review));
    d.append(review);
    button(d, ui.retry, () => { r.choice = null; persist(); inspect(2); });
    if (r.choice !== c.best) return;
    const last = index === course.chapters.length - 1;
    button(d, replay ? ui.route : last ? ui.finish : ui.next, () => {
      if (replay) { directory(); return; }
      r.done = true;
      persist();
      PQIsland.environment.updateCourseFlags();
      if (last) directory();
      else startChapter(index + 1);
    });
  }

  function point(i) {
    return {x:region.x + offsets[i][0], z:region.z + offsets[i][1]};
  }

  function distance(i) {
    const p = point(i);
    return Math.hypot(PQIsland.playerPos.x - p.x, PQIsland.playerPos.z - p.z);
  }

  function travel(i) {
    if (index === null || (i === 2 && record().seen !== 3)) return;
    if (distance(i) < 2.1) { inspect(i); return; }
    const target = point(i);
    const path = PQWorldMap.findPath(PQIsland.playerPos, target, PQ.buildings);
    if (!path) return;
    PQIsland.walkPath = path;
    PQIsland.walkGoal = path.shift();
    PQIsland.goalRing.position.set(target.x, 1.09, target.z);
    PQIsland.goalRing.visible = true;
    pendingSite = i;
    $('field-task').textContent = '→ ' + (i === 2 ? ui.choose : chapter().evidence[i].title);
  }

  function update() {
    if (!region || pendingSite === null || panel().open) return;
    if (distance(pendingSite) < 2.1) inspect(pendingSite);
    else if (!PQIsland.walkGoal) {
      pendingSite = null;
      $('field-task').textContent = record().seen === 3 ? ui.choose : ui.inspect;
    }
  }

  function createStations() {
    const T = THREE;
    const group = new T.Group();
    const geometry = new T.BoxGeometry(1, 1, 1);
    const mats = ['#594536', region.color, '#f6e8ca', '#244859'].map(color => new T.MeshStandardMaterial({color}));
    function box(parent, x, y, z, w, h, depth, material) {
      const m = new T.Mesh(geometry, mats[material]);
      m.position.set(x, y, z);
      m.scale.set(w, h, depth);
      m.castShadow = true;
      parent.add(m);
      return m;
    }
    // The tea pavilion and greenhouse give each investigation a distinct
    // meeting place. All pieces share one geometry and four materials.
    const shelter = new T.Group();
    shelter.position.set(region.x + 4, 1.02, region.z - 6);
    group.add(shelter);
    for (const x of [-2.4, 2.4]) {
      for (const z of [-1.6, 1.6]) box(shelter, x, 1.7, z, .17, 3.4, .17, 0);
    }
    box(shelter, 0, .1, 0, 5.5, .2, 3.8, 0);
    if (region.id === 'growth') {
      for (const side of [-1, 1]) {
        const roof = box(shelter, 0, 3.8, side, 5.9, .23, 2.5, 1);
        roof.rotation.x = side * .35;
      }
      box(shelter, 0, .9, -.4, 3.6, .2, .9, 0);
      for (const x of [-1, 0, 1]) box(shelter, x, 1.13, -.4, .28, .28, .28, 2);
    } else {
      const glass = new T.MeshStandardMaterial({color:'#adede3',transparent:true,opacity:.36,depthWrite:false});
      mats.push(glass);
      box(shelter, 0, 2, -1.65, 4.8, 2.6, .06, 4);
      for (const side of [-1, 1]) {
        const pane = box(shelter, 0, 3.81, side * .84, 5, .12, 1.95, 4);
        pane.rotation.x = side * .45;
        for (const x of [-2.45, 0, 2.45]) {
          const beam = box(shelter, x, 3.81, side * .84, .12, .17, 2, 2);
          beam.rotation.x = side * .45;
        }
      }
      for (const x of [-1.5, 0, 1.5]) {
        box(shelter, x, .4, -.7, .9, .6, .8, 0);
        box(shelter, x, .93, -.7, .43, .46, .45, 1);
      }
    }
    const exhibits = [];
    const targets = offsets.map((_, i) => {
      const site = new T.Group(), p = point(i);
      site.position.set(p.x, 1.02, p.z);
      group.add(site);
      box(site, 0, .6, 0, .35, 1.2, .45, 0);
      box(site, 0, 1.2, 0, 2.2, .15, 1.1, 2);
      if (i === 2) {
        box(site, 0, 1.8, -.15, 1.7, 1, .14, 3);
        box(site, 0, 1.8, -.06, 1.4, .75, .04, 1);
      } else {
        const exhibit = new T.Group();
        site.add(exhibit);
        exhibits.push(exhibit);
      }
      return site;
    });
    let guide;
    function stage(chapterIndex) {
      if (guide) { guide.group.removeFromParent(); PQStory3D.disposeTree(guide.group); }
      const cast = region.id === 'growth' ? ['laoguan','citizen2','citizen6','laoguan'] : ['linyou','xiaoyu','linyou','akai'];
      guide = PQIsland.createCharacter(cast[chapterIndex]);
      guide.group.position.set(region.x + 5, 1.04, region.z - 1.15);
      guide.group.rotation.y = -.55;
      group.add(guide.group);
      exhibits.forEach((site,i) => {
        site.clear();
        const form = (region.id === 'growth' ? [['board','book'],['funnel','book'],['bells','tray'],['book','chips']] : [['board','book'],['cards','board'],['book','cards'],['light','book']])[chapterIndex][i];
        if (form === 'funnel') {
          for (let j=0; j<3; j++) box(site, 0, 1.45+j*.34, 0, .65+j*.46, .3, .4, 1);
        } else if (form === 'bells') {
          box(site, 0, 2.5, 0, 1.9,.12,.14,0);
          for(let j=0;j<4;j++) box(site, -.65+j*.44, 2.05+j*.06, 0, .16,.8-j*.12,.16,1);
        } else if (form === 'tray' || form === 'chips') {
          box(site, 0, 1.32, 0, 1.9,.1,.9,0);
          for(let j=0;j<6;j++) box(site, -.65+(j%3)*.6, 1.49, -.22+Math.floor(j/3)*.45,.37,.22,.27,j<3?1:2);
        } else if (form === 'book') {
          for(const side of [-1,1]) {
            const page=box(site, side*.43, 1.43, 0,.89,.16,.84,2);
            page.rotation.z=side*.12;
            for(let j=0;j<3;j++) box(site,side*.43,1.55,-.25+j*.23,.5,.025,.04,0);
          }
        } else if (form === 'board' && region.id === 'growth') {
          for (let j = 0; j < 4; j++) {
            const h = .35 + j * .21;
            box(site, -.7 + j * .46, 1.28 + h / 2, 0, .32, h, .36, 1);
          }
        } else if (form === 'light') {
          box(site, 0, 1.92, 0, 1.8, 1.3, .24, 3);
          box(site, 0, 1.92, .14, 1.5, 1, .05, 2);
          box(site, 0, 1.92, .18, .86, .28, .03, 1);
        } else {
          for (let j = 0; j < 3; j++) {
            box(site, -.69 + j * .67, 1.72, -.15, .56, .87, .1, 3);
            box(site, -.69 + j * .67, 1.83 - j * .08, -.08, .4, .28, .05, 1);
          }
        }
      });
    }
    PQIsland.scene.add(group);
    return {targets, stage, dispose() {
      if (guide) PQStory3D.disposeTree(guide.group);
      group.removeFromParent();
      geometry.dispose();
      mats.forEach(m => m.dispose());
    }};
  }

  function open(id, {fromOverview = false} = {}) {
    if (region || !['growth','design'].includes(id)) return;
    returnPosition = PQIsland.playerPos.clone();
    returnToOverview = fromOverview || PQIsland.archipelago;
    region = PQWorldMap.regions.find(r => r.id === id);
    $('field-screen').style.setProperty('--shore', region.color);
    course = courses[id];
    G.show('field-screen');
    PQIsland.visibility.closeMenus();
    PQIsland.environment.closeJournal();
    PQIsland.onShow({focusCurrent:false});
    $('field-screen').append($('isl-joy'));
    PQIsland.playerPos.set(region.x - 1, 1.04, region.z + 1);
    PQIsland.setMode('walk');
    PQIsland.spherical.radius = 30;
    PQIsland.recentre(true);
    stations = createStations();
    $('field-view').textContent = '第一人称';
    $('field-menu').textContent = ui.route;
    $('field-exit').textContent = ui.returnMap;
    directory();
  }

  function leave() {
    panel().close();
    stopWalking();
    stations.dispose();
    $('map-screen').append($('isl-joy'));
    PQIsland.playerPos.copy(returnPosition);
    region = null;
    index = null;
    replay = null;
    G.toMap({archipelago:returnToOverview});
  }

  function normalize(raw) {
    const result = {};
    for (const id of ['growth', 'design']) {
      const records = result[id] = [];
      const source = Array.isArray(raw?.[id]) ? raw[id] : [];
      for (const [i, c] of courses[id].chapters.entries()) {
        const r = source[i];
        if (!r || typeof r !== 'object') break;
        const seen = Number.isInteger(r.seen) ? r.seen & 3 : 0;
        const choice = seen === 3 && Number.isInteger(r.choice) && c.actions[r.choice] ? r.choice : null;
        const done = choice === c.best && r.done === true;
        records.push({seen, choice, done});
        if (!done) break;
      }
    }
    return result;
  }

  function init() {
    $('field-view').onclick = () => {
      const firstPerson = PQIsland.mode !== 'fp';
      PQIsland.setMode(firstPerson ? 'fp' : 'walk');
      $('field-view').textContent = firstPerson ? '漫步' : '第一人称';
    };
    $('field-menu').onclick = directory;
    $('field-exit').onclick = leave;
    panel().addEventListener('keydown', e => e.stopPropagation());
    panel().addEventListener('cancel', e => {
      e.preventDefault();
      if (index === null) leave();
      else if (record().choice !== null) directory();
      else depart();
    });
    window.addEventListener('keydown', e => {
      if (!region || panel().open || e.repeat || e.key.toLowerCase() !== 'e') return;
      const near = offsets.findIndex((_, i) => distance(i) < 2.1);
      if (near !== -1) inspect(near);
    });
  }

  function hit(raycaster) {
    if (!region || panel().open) return false;
    const hits = raycaster.intersectObjects(stations.targets, true);
    if (!hits.length) return false;
    const station = stations.targets.findIndex(site => site.getObjectById(hits[0].object.id));
    travel(station);
    return true;
  }

  window.PQFieldCourse = {open, init, update, hit, normalize, get active() { return !!region; }};
})();
