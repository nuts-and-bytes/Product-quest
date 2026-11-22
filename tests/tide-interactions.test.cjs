const test = require('node:test');
const assert = require('node:assert/strict');
const { createWorkbench, createScreening } = require('../assets/tide-interactions.js');

test('the night market answers from the current tray and reset returns the note', () => {
  const lab = createWorkbench();
  lab.select('market');
  assert.deepEqual(lab.ask(), {answer:'missing', source:null});
  lab.toggle('market');
  assert.deepEqual(lab.ask(), {answer:'grounded', source:'market'});
  assert.equal(lab.completedMarket, true);
  lab.reset();
  assert.deepEqual(lab.ask(), {answer:'missing', source:null});
  assert.equal(lab.completedMarket, true);
});

test('today wins in either order and removing it invalidates the answer', () => {
  const lab = createWorkbench();
  lab.select('dates');
  for (const order of [['yesterday','today'], ['today','yesterday']]) {
    lab.reset();
    order.forEach(lab.toggle);
    assert.deepEqual(lab.ask(), {answer:'today', source:'today'});
    lab.toggle('today');
    assert.equal(lab.result, null);
    assert.deepEqual(lab.ask(), {answer:'yesterdayOnly', source:'yesterday'});
    lab.toggle('yesterday');
    assert.deepEqual(lab.ask(), {answer:'unknownToday', source:null});
  }
});

test('pause freezes the frame and resume starts from the same elapsed time', () => {
  const screening = createScreening(24);
  screening.play(0);
  screening.pause(5);
  assert.equal(screening.update(8), 5);
  screening.play(8);
  assert.equal(screening.update(9), 6);
  assert.equal(screening.finished, null);
});

test('switch and stop do not count a film as watched; only a natural ending does', () => {
  const screening = createScreening(24);
  screening.select(1, 0);
  assert.equal(screening.status, 'idle');
  screening.play(0);
  screening.select(2, 3);
  assert.equal(screening.status, 'playing');
  assert.equal(screening.update(3), 0);
  assert.equal(screening.finished, null);
  screening.stop();
  assert.equal(screening.update(30), 0);
  assert.equal(screening.finished, null);
  screening.play(35);
  assert.equal(screening.update(59), 24);
  assert.equal(screening.status, 'ended');
  assert.equal(screening.finished, 2);
  screening.select(0, 60);
  assert.equal(screening.finished, 2);
  screening.play(60);
  assert.equal(screening.update(61), 1);
});
