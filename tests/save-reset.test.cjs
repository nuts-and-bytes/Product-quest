const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const engine = fs.readFileSync(require.resolve('../engine.js'), 'utf8');

function openGame(storage, {key, confirmed} = {}) {
  const element = {
    classList: {contains: () => false},
    style: {},
    addEventListener() {},
    setAttribute() {},
    appendChild() {},
    querySelector: () => ({}),
  };
  const window = {OPC_SAVE_KEY: key, innerWidth: 390, addEventListener() {}};
  let reloads = 0;
  vm.runInNewContext(engine, {
    window,
    PQ: {},
    document: {getElementById: () => element, createElement: () => element, addEventListener() {}},
    localStorage: {getItem: name => storage.get(name) ?? null, removeItem: name => storage.delete(name)},
    confirm: () => confirmed,
    location: {reload: () => reloads++},
  });
  return {game: window.G, reloads: () => reloads};
}

for (const key of [undefined, 'pmquest2-scoped-player']) {
  test(`confirmed reset removes the current save and its recovery copy (${key || 'default slot'})`, () => {
    const slot = key || 'pmquest2';
    const storage = new Map([
      [slot, '{"progress":4}'],
      [slot + ':bak', '{"progress":3}'],
      ['another-slot', '{"progress":9}'],
      ['another-slot:bak', '{"progress":8}'],
    ]);
    const current = openGame(storage, {key, confirmed: true});
    current.game.load();
    assert.equal(current.game.progress, 4);
    current.game.resetAll();
    assert.equal(current.reloads(), 1);
    assert.deepEqual([...storage.keys()], ['another-slot', 'another-slot:bak']);
    const {game} = openGame(storage, {key});
    game.load();
    assert.equal(game.progress, 0);
  });
}

test('dismissing the reset confirmation preserves both saves without reloading', () => {
  const original = [['pmquest2', '{"progress":4}'], ['pmquest2:bak', '{"progress":3}']];
  const storage = new Map(original);
  const current = openGame(storage, {confirmed: false});
  current.game.resetAll();
  assert.equal(current.reloads(), 0);
  assert.deepEqual([...storage], original);
});
