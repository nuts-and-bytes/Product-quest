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

// Run world, PM, and AI scripts in context
const files = [
  'world.js',
  'pm/terms.js', 'pm/notes.js', 'pm/cases.js',
  'ai/terms.js', 'ai/notes.js', 'ai/cases.js', 'ai/ch1-illusion.js', 'ai/ch2-rag.js', 'ai/ch3-eval.js', 'ai/museum.js'
];

for (const f of files) {
  const code = fs.readFileSync(path.join(__dirname, '../content', f), 'utf8');
  vm.runInNewContext(code, ctx);
}

const { levels, terms, notes, cases } = ctx.PQ;

test('AI continent chapters 1-3 load with 12 valid levels', () => {
  const aiLevels = levels.filter(l => l.id.startsWith('ai'));
  assert.equal(aiLevels.length, 12, 'Chapters 1-3 must have exactly 12 levels');
  
  const expectedIds = [
    'ai1_1', 'ai1_2', 'ai1_3', 'ai1_boss',
    'ai2_1', 'ai2_2', 'ai2_3', 'ai2_boss',
    'ai3_1', 'ai3_2', 'ai3_3', 'ai3_boss'
  ];
  assert.equal(aiLevels.map(l => l.id).join(','), expectedIds.join(','));
});

test('AI chapters 1-3 levels meet all engine contracts and content rules', () => {
  const aiLevels = levels.filter(l => l.id.startsWith('ai'));
  for (const lv of aiLevels) {
    assert.ok(lv.ch && /^第[123]章/.test(lv.ch), `Level ${lv.id} must belong to Chapter 1, 2, or 3`);
    assert.ok(lv.name, `Level ${lv.id} must have a name`);
    assert.ok(lv.loc, `Level ${lv.id} must have a location`);
    assert.ok(lv.note && notes[lv.note], `Level ${lv.id} note "${lv.note}" must exist in notes`);
    
    // Validate script nodes
    assert.ok(Array.isArray(lv.script) && lv.script.length >= 3, `Level ${lv.id} script must have nodes`);
    for (const node of lv.script) {
      if (node.choices) {
        assert.equal(node.choices.length, 3, `Node in ${lv.id} must have exactly 3 choices`);
        const scores = Array.from(node.choices).map(c => c.s).sort((a, b) => a - b);
        assert.equal(scores.join(','), '0,1,2', `Choices in ${lv.id} must have scores 0, 1, and 2`);
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
    
    // Validate quizzes
    assert.equal(lv.quiz.length, 3, `Level ${lv.id} must have 3 quiz questions`);
    for (const q of lv.quiz) {
      assert.ok(q.q, 'Quiz question must have text');
      assert.equal(q.ops.length, 3, 'Quiz question must have 3 options');
      assert.ok([0, 1, 2].includes(q.a), 'Quiz answer must be 0, 1, or 2');
      assert.ok(q.exp, 'Quiz explanation must be present');
    }
  }
});

test('AI continent terms, notes, and cases are rich and well-formed', () => {
  assert.ok(terms.hallucination, 'hallucination term must exist');
  assert.ok(terms.prob_sys, 'prob_sys term must exist');
  assert.ok(terms.ai_native_ux, 'ai_native_ux term must exist');
  assert.ok(terms.rule_vs_llm, 'rule_vs_llm term must exist');
  assert.ok(terms.token_econ, 'token_econ term must exist');
  assert.ok(terms.few_shot, 'few_shot term must exist');
  assert.ok(terms.rag_vs_ft, 'rag_vs_ft term must exist');
  assert.ok(terms.chunking, 'chunking term must exist');
  assert.ok(terms.grounding, 'grounding term must exist');
  assert.ok(terms.precision_recall, 'precision_recall term must exist');
  assert.ok(terms.llm_judge, 'llm_judge term must exist');
  assert.ok(terms.prompt_injection, 'prompt_injection term must exist');
  assert.ok(terms.model_drift, 'model_drift term must exist');
  assert.ok(notes.ai_n1, 'ai_n1 note must exist');
  assert.ok(notes.ai_n2, 'ai_n2 note must exist');
  assert.ok(notes.ai_n5, 'ai_n5 note must exist');
  assert.ok(notes.ai_n6, 'ai_n6 note must exist');
  assert.ok(notes.ai_n7, 'ai_n7 note must exist');
  assert.ok(notes.ai_n8, 'ai_n8 note must exist');
  assert.ok(cases.some(c => c.title.includes('纽约律师')), 'Mata v. Avianca case must exist');
  assert.ok(cases.some(c => c.title.includes('Copilot')), 'Copilot case must exist');
  assert.ok(cases.some(c => c.title.includes('加拿大航空')), 'Air Canada case must exist');
  assert.ok(cases.some(c => c.title.includes('雪佛兰')), 'Chevrolet prompt injection case must exist');
});

test('AI Museum and mentor Stone narrative data is complete and valid', () => {
  const m = ctx.PQ.aiMuseum;
  assert.ok(m && m.mentor && m.mentor.name === '石头', 'AI Museum must feature mentor 石头');
  assert.equal(m.halls.length, 3, 'AI Museum must have 3 exhibit halls');
  const timeline = m.halls.find(h => h.id === 'timeline');
  assert.ok(timeline.exhibits.some(e => e.title.includes('ChatGPT')), 'Timeline must include ChatGPT');
  assert.ok(timeline.exhibits.some(e => e.title.includes('DeepSeek')), 'Timeline must include DeepSeek');
  assert.ok(timeline.exhibits.every(e => e.animCue && e.stoneLines.length >= 2), 'Every timeline exhibit needs animCue and Stone dialogue');
  const concepts = m.halls.find(h => h.id === 'concepts');
  assert.equal(concepts.exhibits.length, 5, 'Concept hall must cover 5 foundational AI concepts');
  for (const ex of concepts.exhibits) {
    assert.ok(terms[ex.termKey], `Concept exhibit ${ex.id} termKey "${ex.termKey}" must exist`);
    assert.ok(ex.miniCheck && ex.miniCheck.ops.length === 3, `Concept exhibit ${ex.id} must have a 3-option miniCheck`);
  }
  assert.equal(m.teaTable.drills.length, 3, 'Tea table must have 3 practical drills');
});
