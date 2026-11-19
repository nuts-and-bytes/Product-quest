import assert from 'node:assert/strict';

// Pass the local offline build or the development URL and a browser page.
export async function run(page, gameURL) {
  const url = new URL(gameURL);
  url.searchParams.set('player', 'qa-continent-entry-' + Date.now());
  await page.goto(url.href);
  await page.click('.land-explore');
  await page.click('#journey-pause');

  const data = await page.evaluate(() => PQ.continentCourses);
  const clickDialog = label => page.click('#field-dialog button:has-text(' + JSON.stringify(label) + ')');
  const expectDialog = title => page.waitForFunction(expected => {
    const dialog = document.getElementById('field-dialog');
    return dialog.open && dialog.querySelector('h2').textContent === expected;
  }, title, {timeout:20000});

  await page.click('#world-view-toggle');
  await page.click('#isl-arch-btn');

  async function openFromOverview(id, useBeach, holdThroughZoom = false) {
    assert.ok(await page.evaluate(() => PQIsland.archipelago), 'return to the island selection map');
    await page.waitForFunction(() => {
      const {camera, camTarget, spherical} = PQIsland;
      const target = new THREE.Vector3(camTarget.x, camTarget.y, camTarget.z);
      return Math.abs(camera.position.distanceTo(target) - spherical.radius) < .05;
    });
    if (useBeach) {
      const point = await page.evaluate(id => {
        const r = PQWorldMap.regions.find(region => region.id === id);
        const beach = new THREE.Vector3(r.x - 13, 1, r.z).project(PQIsland.camera);
        const rect = PQIsland.renderer.domElement.getBoundingClientRect();
        return {x:rect.left + (1 + beach.x) * rect.width / 2, y:rect.top + (1 - beach.y) * rect.height / 2};
      }, id);
      await page.waitForFunction(({x,y}) => document.elementFromPoint(x,y) === PQIsland.renderer.domElement, point);
      await page.cdp('Input.dispatchMouseEvent', {type:'mousePressed', ...point, button:'left', buttons:1, clickCount:1});
      if (holdThroughZoom) {
        // Let the normal camera animation move the beach away from a held pointer.
        await page.evaluate(() => { PQIsland.spherical.radius = 36; });
        await page.waitForFunction(() => PQIsland.curSpherical.radius < 40);
      }
      await page.cdp('Input.dispatchMouseEvent', {type:'mouseReleased', ...point, button:'left', buttons:0, clickCount:1});
    } else {
      const islandName = data[id].title.split(' · ')[0];
      await page.click('.isl-cont-pin:has-text(' + JSON.stringify(islandName) + ')');
    }
    await expectDialog(data[id].title);
  }

  for (const id of ['growth', 'design']) {
    await openFromOverview(id, id === 'design');
    const course = data[id];
    const chapter = course.chapters[0];
    await clickDialog(chapter.title);
    await clickDialog(data.ui.resume);
    for (const evidence of chapter.evidence) {
      await page.click('#field-sites button:has-text(' + JSON.stringify(evidence.title) + ')');
      await expectDialog(evidence.title);
      await clickDialog(data.ui.resume);
    }
    await page.click('#field-sites button:last-child');
    await expectDialog('作出选择');
    await clickDialog(chapter.actions[chapter.best].title);
    await expectDialog(data.ui.outcome);
    await clickDialog(data.ui.next);
    await expectDialog(course.chapters[1].title);
    await clickDialog(data.ui.route);
    await clickDialog(data.ui.returnMap);
  }

  // Cross back without reopening the camera controls. Use the other target on each island.
  for (const id of ['growth', 'design']) {
    await openFromOverview(id, id === 'growth', id === 'growth');
    assert.equal(await page.evaluate(() => document.querySelector('#field-dialog button').textContent.startsWith('✓')), true);
    await clickDialog(data[id].chapters[1].title);
    await expectDialog(data[id].chapters[1].title);
    await clickDialog(data.ui.route);
    await clickDialog(data.ui.returnMap);
  }

  for (const id of ['growth', 'design']) {
    const course = data[id];
    // Start at the route's landing to exercise proximity and the normal input handler.
    await page.evaluate(id => {
      const r = PQWorldMap.regions.find(region => region.id === id);
      PQIsland.setMode('walk');
      PQIsland.playerPos.set(r.x - 8, 1.04, r.z);
      PQIsland.recentre(true);
    }, id);
    await page.waitForFunction(title => {
      const prompt = document.getElementById('exp-interact');
      return !prompt.hidden && prompt.textContent.includes(title);
    }, course.title);
    if (id === 'growth') await page.keyboard.press('e');
    else await page.click('#exp-interact');
    await expectDialog(course.title);
    assert.equal(await page.evaluate(() => document.querySelector('#field-dialog button').textContent.startsWith('✓')), true);
    await clickDialog(data.ui.returnMap);
    assert.equal(await page.evaluate(() => PQIsland.archipelago), false, 'walking arrivals return on foot');
  }
}
