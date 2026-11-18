/* Optional cafe discoveries never gate or replace chapter, investigation, or market saves. */
(function(root){
 'use strict';
 const discoveries=['postcard-back','seat-back'],views=['bay','garden','cafe'];
 function normalize(raw){
  raw=raw&&typeof raw==='object'?raw:{};
  const seen=discoveries.filter(k=>Array.isArray(raw.seen)&&raw.seen.includes(k));
  const view=seen.includes('postcard-back')&&views.includes(raw.postcard?.view)?raw.postcard.view:null;
  const asked=seen.includes('seat-back')&&raw.seat?.asked===true;
  return {version:1,seen,postcard:{view,ending:view&&['wall','sent'].includes(raw.postcard?.ending)?raw.postcard.ending:null},seat:{asked,choice:asked&&['window','shared'].includes(raw.seat?.choice)?raw.seat.choice:null}};
 }
 function advance(raw,event,value){
  const s=normalize(raw);
  if(event==='discover'&&discoveries.includes(value)&&!s.seen.includes(value))s.seen.push(value);
  if(event==='postcard-view'&&s.seen.includes('postcard-back')&&!s.postcard.ending&&views.includes(value))s.postcard.view=value;
  if(event==='postcard-finish'&&s.postcard.view&&!s.postcard.ending&&['wall','sent'].includes(value))s.postcard.ending=value;
  if(event==='seat-ask'&&s.seen.includes('seat-back'))s.seat.asked=true;
  if(event==='seat-place'&&s.seat.asked&&!s.seat.choice&&['window','shared'].includes(value))s.seat.choice=value;
  return normalize(s);
 }
 const api={normalize,advance,views};root.PQCafeLifeState=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
