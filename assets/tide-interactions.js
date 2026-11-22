(function () {
  'use strict';

  function createWorkbench() {
    const trays = { market: new Set(), dates: new Set() };
    const trayFor = {market:'market', yesterday:'dates', today:'dates'};
    let active = null;
    let result = null;
    let completedMarket = false;

    return {
      select(experiment) {
        active = experiment;
        result = null;
      },
      has(note) { return trays[trayFor[note]]?.has(note) ?? false; },
      toggle(note) {
        if (active !== trayFor[note]) return;
        const tray = trays[active];
        if (tray.has(note)) tray.delete(note);
        else tray.add(note);
        result = null;
      },
      reset() {
        trays[active]?.clear();
        result = null;
      },
      ask() {
        if (active === 'market') {
          if (this.has('market')) {
            completedMarket = true;
            result = {answer: 'grounded', source: 'market'};
          } else result = {answer: 'missing', source: null};
        } else if (active === 'dates') {
          if (this.has('today')) result = {answer: 'today', source: 'today'};
          else if (this.has('yesterday')) result = {answer: 'yesterdayOnly', source: 'yesterday'};
          else result = {answer: 'unknownToday', source: null};
        }
        return result;
      },
      get active() { return active; },
      get result() { return result; },
      get feedback() {
        if (!active) return 'idle';
        if (result?.source) return 'sourced';
        return trays[active].size ? 'loaded' : 'empty';
      },
      get completedMarket() { return completedMarket; }
    };
  }

  function createScreening(duration) {
    let selected = 0;
    let finished = null;
    let status = 'idle';
    let offset = 0;
    let started = 0;

    return {
      select(film, now) {
        const showing = this.showing;
        selected = film;
        this.stop('idle');
        if (showing) this.play(now);
      },
      play(now) {
        if (status === 'playing') return;
        if (status !== 'paused') offset = 0;
        started = now;
        status = 'playing';
      },
      pause(now) {
        if (status !== 'playing') return;
        offset = this.update(now);
        if (status === 'playing') status = 'paused';
      },
      stop(next = 'stopped') {
        offset = 0;
        status = next;
      },
      update(now) {
        if (status !== 'playing') return offset;
        const elapsed = offset + Math.max(0, now - started);
        if (elapsed < duration) return elapsed;
        offset = duration;
        status = 'ended';
        finished = selected;
        return offset;
      },
      get selected() { return selected; },
      get finished() { return finished; },
      get status() { return status; },
      get showing() { return status === 'playing' || status === 'paused'; }
    };
  }

  const interactions = {createWorkbench, createScreening};
  if (typeof module !== 'undefined' && module.exports) module.exports = interactions;
  else window.TideInteractions = interactions;
}());
