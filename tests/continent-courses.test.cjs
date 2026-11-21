const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const ctx = vm.createContext({ PQ: {}, window: {} });
for (const file of ['content/continent-courses.js', 'assets/continent-course.js']) {
  vm.runInContext(fs.readFileSync(require.resolve('../' + file), 'utf8'), ctx);
}
const { normalize } = ctx.window.PQFieldCourse;
const courses = ctx.PQ.continentCourses;
for (const id of ['growth', 'design']) {
  test(id + ' has a complete route with evidence and distinct outcomes', () => {
    const route = courses[id];
    assert.ok(route.intro && route.ending);
    assert.equal(route.chapters.length, 4);
    for (const c of route.chapters) {
      assert.equal(c.evidence.length, 2);
      assert.ok(c.evidence.every(e => e.title && e.body));
      for (const e of c.evidence) {
        assert.equal(e.dialogue[0].speaker, '你');
        assert.ok(e.dialogue.length >= 2 && e.dialogue[1].speaker !== e.dialogue[0].speaker);
        assert.ok(e.dialogue.every(turn => turn.speaker && turn.line.trim()));
      }
      assert.equal(new Set(c.actions.map(a => a.result)).size, 3);
      assert.ok(c.actions[c.best].title);
    }
  });
  test(id + ' preserves a mid-chapter choice and stops at the first unfinished chapter', () => {
    const [first, second] = courses[id].chapters;
    const done = {seen:3, choice:first.best, done:true};
    const retry = {seen:3, choice:(second.best + 1) % 3, done:true};
    const state = normalize({[id]:[done, retry, done]})[id];
    assert.equal(state.length, 2);
    assert.equal(state[0].done, true);
    assert.equal(state[1].choice, retry.choice);
    assert.equal(state[1].done, false);
    assert.equal(normalize({})[id].length, 0);
    assert.equal(normalize({[id]:[{seen:1, choice:first.best, done:true}]})[id][0].choice, null);
  });
}
