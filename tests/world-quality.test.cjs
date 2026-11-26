const test=require('node:test'),assert=require('node:assert/strict');
const {initialTier,renderPixelRatio,usePostProcessing}=require('../assets/world-quality.js');

test('touch quality starts in the same tier in portrait and landscape',()=>{
  assert.equal(initialTier(true,390),1);
  assert.equal(initialTier(true,932),1);
  assert.equal(initialTier(false,390),1);
  assert.equal(initialTier(false,1440),2);
});

test('phone quality renders at CSS resolution or above without exceeding device density',()=>{
  assert.equal(renderPixelRatio(0,3,true,932,390),1.1);
  assert.equal(renderPixelRatio(1,3,true,932,390),1.35);
  assert.equal(renderPixelRatio(2,3,true,932,390),1.8);
  assert.equal(renderPixelRatio(2,1,true,932,390),1);
});

test('larger touch viewports trade resolution for a stable pixel budget',()=>{
  const width=1366,height=900;
  const ratio=renderPixelRatio(2,3,true,width,height);
  assert.ok(ratio>=1 && ratio<1.8);
  assert.ok(width*height*ratio*ratio<=1400001);
});

test('desktop rendering caps stay the same',()=>{
  assert.deepEqual([0,1,2].map(tier=>renderPixelRatio(tier,3,false,1440,900)),[.85,1.15,1.6]);
});

test('touch automatic and balanced modes spend the budget on scene resolution first',()=>{
  assert.equal(usePostProcessing(2,'auto',true),false);
  assert.equal(usePostProcessing(1,'balanced',true),false);
  assert.equal(usePostProcessing(2,'cinema',true),true);
  assert.equal(usePostProcessing(1,'balanced',false),true);
  assert.equal(usePostProcessing(0,'eco',false),false);
});
