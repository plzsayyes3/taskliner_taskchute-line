const test = require('node:test');
const assert = require('node:assert/strict');
const { createAutoSaveScheduler } = require('./taskliner-autosave.js');

function harness() {
  let visible = true;
  let currentDate = '2026-09-28';
  const dirty = new Set([currentDate]);
  const timers = new Map();
  const saves = [];
  let nextId = 1;
  const scheduler = createAutoSaveScheduler({
    delay: 60_000,
    isVisible: () => visible,
    isCurrent: date => currentDate === date,
    isDirty: date => dirty.has(date),
    save: date => saves.push(date),
    setTimer: callback => {
      const id = nextId++;
      timers.set(id, callback);
      return id;
    },
    clearTimer: id => timers.delete(id)
  });
  return {
    scheduler, saves, dirty, timers,
    setVisible(value) { visible = value; },
    setCurrentDate(value) { currentDate = value; },
    fireTimers() {
      const pending = [...timers.values()];
      timers.clear();
      for (const callback of pending) callback();
    }
  };
}

test('autosave deferred while hidden runs when the page becomes visible again', () => {
  const h = harness();
  h.scheduler.schedule('2026-09-28');
  h.setVisible(false);
  h.fireTimers();
  assert.deepEqual(h.saves, []);

  h.setVisible(true);
  h.scheduler.visibilityChanged();
  assert.deepEqual(h.saves, ['2026-09-28']);
});

test('visibility return does not save a date that is no longer current or dirty', () => {
  for (const invalidate of [
    h => h.setCurrentDate('2026-09-29'),
    h => h.dirty.delete('2026-09-28')
  ]) {
    const h = harness();
    h.scheduler.schedule('2026-09-28');
    h.setVisible(false);
    h.fireTimers();
    invalidate(h);
    h.setVisible(true);
    h.scheduler.visibilityChanged();
    assert.deepEqual(h.saves, []);
  }
});

test('autosave fires once after its delay while visible and cancellation clears it', () => {
  const h = harness();
  h.scheduler.schedule('2026-09-28');
  h.fireTimers();
  assert.deepEqual(h.saves, ['2026-09-28']);

  h.scheduler.schedule('2026-09-28');
  h.scheduler.cancel();
  h.fireTimers();
  assert.deepEqual(h.saves, ['2026-09-28']);
});
