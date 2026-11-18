const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../assets/cafe-life-state.js');
test('old saves open an undiscovered cafe without inventing quest progress',()=>{
 assert.deepEqual(M.normalize(),{version:1,seen:[],postcard:{view:null,ending:null},seat:{asked:false,choice:null}});
 const old={seen:['postcard-back','bad','postcard-back'],postcard:{view:'invented',ending:'sent'},seat:{asked:true,choice:'window'},other:'ignore'};
 const s=M.normalize(old);assert.deepEqual(s.seen,['postcard-back']);assert.equal(s.postcard.ending,null);assert.equal(s.seat.choice,null);
});
test('postcard requires flipping it and visiting a real outlook before a durable ending',()=>{
 let s=M.normalize();s=M.advance(s,'postcard-finish','wall');assert.equal(s.postcard.ending,null);
 s=M.advance(s,'postcard-view','bay');assert.equal(s.postcard.view,null);
 s=M.advance(s,'discover','postcard-back');s=M.advance(s,'postcard-view','bay');
 assert.equal(s.postcard.view,'bay');s=M.advance(s,'postcard-finish','wall');assert.equal(s.postcard.ending,'wall');
 assert.equal(M.advance(s,'postcard-finish','sent').postcard.ending,'wall');assert.deepEqual(M.normalize(JSON.parse(JSON.stringify(s))),s);
});
test('the empty seat needs the found note, a conversation, and a deliberate placement',()=>{
 let s=M.normalize();s=M.advance(s,'seat-place','window');assert.equal(s.seat.choice,null);
 s=M.advance(s,'seat-ask');assert.equal(s.seat.asked,false);s=M.advance(s,'discover','seat-back');
 s=M.advance(s,'seat-ask');s=M.advance(s,'seat-place','shared');assert.equal(s.seat.choice,'shared');
 assert.equal(M.advance(s,'seat-place','window').seat.choice,'shared');
});
test('repeated inspection and unknown input do not duplicate or erase progress',()=>{
 const initial=M.normalize();let s=initial;
 for(let i=0;i<50;i++)s=M.advance(s,'discover','postcard-back');
 assert.equal(initial.seen.length,0);assert.deepEqual(s.seen,['postcard-back']);assert.deepEqual(M.advance(s,'oops','x'),s);
});
