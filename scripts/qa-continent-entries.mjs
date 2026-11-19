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

  for (const id of ['growth', 'design']) {
    const course = data[id];
    await page.click('#world-view-toggle');
    await page.click('#isl-arch-btn');
    await page.waitForFunction(() => PQIsland.archipelago &&
      Math.abs(PQIsland.curSpherical.radius - PQIsland.spherical.radius) < .05);

    if (id === 'growth') {
      await page.click('.isl-cont-pin:has-text("增长大陆")');
    } else {
      // Click the outer beach, beyond the old invisible target at the centre.
      const point = await page.evaluate(() => {
        const region = PQWorldMap.regions.find(r => r.id === 'design');
        const p = new THREE.Vector3(region.x - 13, 1, region.z).project(PQIsland.camera);
        const rect = PQIsland.renderer.domElement.getBoundingClientRect();
        return {x:rect.left + (1+p.x)*rect.width/2, y:rect.top + (1-p.y)*rect.height/2};
      });
      await page.waitForFunction(({x,y}) => document.elementFromPoint(x,y) === PQIsland.renderer.domElement, point, {timeout:6000});
      await page.mouse.click(point.x, point.y);
    }

    await expectDialog(course.title);
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
  }
}
