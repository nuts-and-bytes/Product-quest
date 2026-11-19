const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

require('../assets/world-map.js');

const ctx = {
  PQWorldMap: global.PQWorldMap,
  PQ: { sprites: {}, buildings: [], pains: [], levels: [], terms: {}, notes: {}, cases: [] }
};

// Run world, PM, and all AI scripts in context
const files = [
  'world.js',
  'pm/terms.js', 'pm/notes.js', 'pm/cases.js',
  'ai/terms.js', 'ai/notes.js', 'ai/cases.js',
  'ai/ch1-illusion.js', 'ai/ch2-rag.js', 'ai/ch3-eval.js', 'ai/ch4-agent.js', 'ai/ch5-finale.js',
  'ai/museum.js'
];

for (const f of files) {
  const code = fs.readFileSync(path.join(__dirname, '../content', f), 'utf8');
  vm.runInNewContext(code, ctx);
}

const { levels, terms, notes, cases } = ctx.PQ;

test('AI continent chapters 1-5 load with all 18 valid levels', () => {
  const aiLevels = levels.filter(l => l.id.startsWith('ai'));
  assert.equal(aiLevels.length, 18, 'Chapters 1-5 must have exactly 18 levels');

  const expectedIds = [
    'ai1_1', 'ai1_2', 'ai1_3', 'ai1_boss',
    'ai2_1', 'ai2_2', 'ai2_3', 'ai2_boss',
    'ai3_1', 'ai3_2', 'ai3_3', 'ai3_boss',
    'ai4_1', 'ai4_2', 'ai4_3', 'ai4_boss',
    'ai5_1', 'ai5_end'
  ];
  assert.equal(aiLevels.map(l => l.id).join(','), expectedIds.join(','));
});

test('AI chapters 1-5 levels meet all engine contracts and content rules', () => {
  const aiLevels = levels.filter(l => l.id.startsWith('ai'));
  for (const lv of aiLevels) {
    assert.ok(lv.ch && /^第[12345]章/.test(lv.ch), `Level ${lv.id} must belong to Chapter 1-5`);
    assert.ok(lv.name, `Level ${lv.id} must have a name`);
    assert.ok(lv.loc, `Level ${lv.id} must have a location`);
    assert.ok(lv.note && notes[lv.note], `Level ${lv.id} note "${lv.note}" must exist in notes`);

    assert.ok(Array.isArray(lv.script) && lv.script.length >= 3, `Level ${lv.id} script must have nodes`);
    for (const node of lv.script) {
      if (node.choices) {
        assert.equal(node.choices.length, 3, `Node in ${lv.id} must have exactly 3 choices`);
        const isOpenEnding = Array.from(node.choices).every(c => c.open === true);
        const scores = Array.from(node.choices).map(c => c.s).sort((a, b) => a - b);
        if (isOpenEnding) {
          assert.equal(lv.id, 'ai5_end', 'Only finale level may use open-ended choices');
          assert.equal(scores.join(','), '2,2,2', 'Open endings must all award full score 2');
          assert.equal(new Set(Array.from(node.choices).map(c => c.ending)).size, 3, 'Open endings must have 3 distinct ending keys');
        } else {
          assert.equal(scores.join(','), '0,1,2', `Choices in ${lv.id} must have scores 0, 1, and 2`);
        }
        for (const c of node.choices) {
          assert.ok(c.t && c.t.length >= 10, `Choice in ${lv.id} must be descriptive`);
          assert.ok(c.fb && c.fb.length >= 20, `Feedback in ${lv.id} must be rich`);
          assert.ok(c.lesson, `Lesson in ${lv.id} must be present`);
          if (c.term) {
            assert.ok(terms[c.term], `Term "${c.term}" in ${lv.id} must exist in terms`);
          }
        }
      }
    }

    assert.equal(lv.quiz.length, 3, `Level ${lv.id} must have 3 quiz questions`);
    for (const q of lv.quiz) {
      assert.ok(q.q, 'Quiz question must have text');
      assert.equal(q.ops.length, 3, 'Quiz question must have 3 options');
      assert.ok([0, 1, 2].includes(q.a), 'Quiz answer must be 0, 1, or 2');
      assert.ok(q.exp, 'Quiz explanation must be present');
    }
  }
});

test('AI continent terms, notes, and cases cover all 5 chapters', () => {
  for (const k of [
    'hallucination', 'prob_sys', 'ai_native_ux', 'rule_vs_llm', 'golden_eval', 'token_econ',
    'few_shot', 'rag_vs_ft', 'chunking', 'grounding',
    'precision_recall', 'llm_judge', 'prompt_injection', 'model_drift',
    'ttft_stream', 'sem_cache', 'hitl_agent', 'data_flywheel'
  ]) {
    assert.ok(terms[k], `${k} term must exist`);
  }
  for (const n of ['ai_n1', 'ai_n2', 'ai_n3', 'ai_n4', 'ai_n5', 'ai_n6', 'ai_n7', 'ai_n8', 'ai_n9', 'ai_n10', 'ai_n11']) {
    assert.ok(notes[n], `${n} note must exist`);
  }
  for (const kw of ['纽约律师', 'Copilot', '加拿大航空', '雪佛兰', '模型路由', '越权删库', '小龙虾']) {
    assert.ok(cases.some(c => c.title.includes(kw)), `Case matching "${kw}" must exist`);
  }
});

test('AI Museum and mentor Stone narrative data is complete and enriched', () => {
  const m = ctx.PQ.aiMuseum;
  assert.ok(m && m.mentor && m.mentor.name === '石头', 'AI Museum must feature mentor 石头');
  assert.equal(m.mentor.casualTalks.length, 5, 'Stone must have 5 casual lighthouse talks');
  assert.ok(m.mentor.greetings.afterMainCh4 && m.mentor.greetings.afterMainCh5, 'Stone must react to Chapters 4 and 5');
  assert.equal(m.halls.length, 3, 'AI Museum must have 3 exhibit halls');
  const timeline = m.halls.find(h => h.id === 'timeline');
  assert.equal(timeline.exhibits.length, 9, 'Timeline hall must have 9 historical milestones');
  for (const kw of ['AlphaGo', 'Transformer', 'ChatGPT', 'DeepSeek', '小龙虾', 'Claude', 'Codex', 'Gemini']) {
    assert.ok(timeline.exhibits.some(e => e.title.includes(kw)), `Timeline must include ${kw}`);
  }
  assert.ok(timeline.exhibits.every(e => e.animCue && e.stoneLines.length >= 2), 'Every timeline exhibit needs animCue and Stone dialogue');
  const concepts = m.halls.find(h => h.id === 'concepts');
  assert.equal(concepts.exhibits.length, 7, 'Concept hall must cover 7 foundational AI concepts');
  for (const ex of concepts.exhibits) {
    assert.ok(terms[ex.termKey], `Concept exhibit ${ex.id} termKey "${ex.termKey}" must exist`);
    assert.ok(ex.miniCheck && ex.miniCheck.ops.length === 3, `Concept exhibit ${ex.id} must have a 3-option miniCheck`);
  }
  const products = m.halls.find(h => h.id === 'products');
  assert.equal(products.exhibits.length, 4, 'Products hall must have 4 generational specimens');
  assert.equal(m.teaTable.drills.length, 7, 'Tea table must have 7 practical drills');
});
