const test = require('node:test');
const assert = require('node:assert/strict');
const { findSyncShell, postToSyncShell } = require('./taskliner-host-bridge.js');

function frame(parent, extra = {}) {
  return { parent, ...extra };
}

test('messages from the srcdoc reach the sync shell, not the outer Today page', () => {
  const outerMessages = [];
  const shellMessages = [];
  const todayPage = frame(null, { postMessage: message => outerMessages.push(message) });
  todayPage.parent = todayPage;
  const syncShell = frame(todayPage, {
    __tasklinerSyncShell: true,
    postMessage: (message, origin) => shellMessages.push({ message, origin }),
  });
  const tasklinerV2 = frame(syncShell);
  const srcdoc = frame(tasklinerV2);
  const message = { source: 'taskliner', type: 'navigation-request', fromDate: '2026-09-26', targetDate: '2026-09-25' };

  assert.equal(findSyncShell(srcdoc), syncShell);
  assert.equal(postToSyncShell(srcdoc, message), true);
  assert.deepEqual(shellMessages, [{ message, origin: '*' }]);
  assert.deepEqual(outerMessages, []);
});

test('does not send host messages to an unrelated top window when no sync shell exists', () => {
  const messages = [];
  const top = frame(null, { postMessage: message => messages.push(message) });
  top.parent = top;
  const srcdoc = frame(frame(top));

  assert.equal(findSyncShell(srcdoc), null);
  assert.equal(postToSyncShell(srcdoc, { source: 'taskliner', type: 'tasks-updated' }), false);
  assert.deepEqual(messages, []);
});
