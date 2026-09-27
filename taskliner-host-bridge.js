(function (root, factory) {
  const bridge = factory();
  if (typeof module === 'object' && module.exports) module.exports = bridge;
  if (root) root.TaskLinerHostBridge = bridge;
})(typeof window === 'undefined' ? null : window, function () {
  function findSyncShell(sourceWindow) {
    let current = sourceWindow;
    const visited = new Set();
    while (current) {
      let parent;
      try {
        parent = current.parent;
      } catch {
        return null;
      }
      if (!parent || parent === current || visited.has(parent)) return null;
      current = parent;
      visited.add(current);
      try {
        if (current.__tasklinerSyncShell === true) return current;
      } catch {
        return null;
      }
    }
    return null;
  }

  function postToSyncShell(sourceWindow, message) {
    const shell = findSyncShell(sourceWindow);
    if (!shell || typeof shell.postMessage !== 'function') return false;
    shell.postMessage(message, '*');
    return true;
  }

  return { findSyncShell, postToSyncShell };
});
